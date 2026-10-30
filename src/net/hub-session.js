import {takeSounds,retrySounds,receiveSounds} from './audio-sync.js';
import { poseGrip } from '../game/grab.js';
import { W, withWorld } from '../world/state.js';
import { createWorldSync } from './world-sync.js';
import { NET, onNet, inRoom, send, hubHostId } from './net.js';
import { knockDown, shove, daze, dropHeld, separateActors, releaseDisconnected } from '../game/actors.js';
import { botHitHook } from '../game/bots.js';
import { cargoPosition, poseMeleeItem } from '../game/handheld.js';
import { pushOut, pushActorsOut, bumpPushables } from '../world/physics.js';
import { vector, sweepPosition } from './state-codec.js';
import { worldIntervalFor } from './cadence.js';

const poseKeys='speed air vy hang climb dive roll slide crouch hold held2 restrained payload stun getup rag daze ride rideSpeed emote emoteT dangle sit board cyclePhase look act actK fly flySpin missionTool'.split(' ');
const pose=a=>Object.fromEntries(poseKeys.filter(k=>['number','string','boolean'].includes(typeof a?.[k])).map(k=>[k,a[k]]));
const fields=['stun','getT','daze','wetT','slipT','netT','webT','knockT','gripSafe','struggle'];
// Хаб использует тот же реестр предметов, команды и физические тела, что и матч.
export function createHubSession(world,remotes,options){
 let net=null,room='',identity=0,authority=null,host=false,full=0,worldT=0,seq=0,lastSeq=0,station=null,pending=null;
 const pendingPositions=new Map(),queue=[],slots={wardrobe:null,claw:null};
 const key=()=> 'p'+NET.id, actor=k=>k===key()?world.state.player:[...remotes.values()].find(a=>a.netKey===k);
 const scope=fn=>withWorld(world.state,fn), trusted=m=>m.id===hubHostId();
 const event=m=>send({t:'ev',e:'hub',room:NET.code,...m});
 const command=q=>{if(queue.length<32)queue.push(q);};
 const cache=scope(()=>createWorldSync({host:true,id:0,actor,command,myKey:'p0',visuals:false}));world.state.net=null;
 function ensure(){
   if(!inRoom()){net=null;room='';world.state.net=null;world.state.netHit=world.state.netTake=world.state.netThrow=null;world.state.bots=[];return;}
   const elected=hubHostId();
   if(net&&room===NET.code&&identity===NET.id){if(elected&&authority!==elected){authority=elected;host=elected===NET.id;net.setHost(host);pendingPositions.clear();lastSeq=0;full=0;}return;}
   authority=elected;
   room=NET.code;identity=NET.id;host=authority===NET.id;queue.length=0;pendingPositions.clear();seq=lastSeq=0;full=0;station=pending=null;slots.wardrobe=slots.claw=null;
   net=cache;net.setIdentity(key());net.setHost(host);net.discover();if(!host)net.restoreBaseline();
   world.state.netHit=hit;world.state.netTake=it=>net.request('take',it);world.state.netThrow=(it,p,v)=>net.request('throw',it,{v:v.toArray()});
   world.state.hitActors=[botHitHook];
 }
 function hit(a,k,args){if(a.netProtected)return;if(host){if(k!=='daze')dropHeld(a,args[0],args[1]);event({kind:'hit',to:a.netKey,k,args});}else command({kind:'hit',to:a.netKey,k,args});}
 function applyHit(a,k,args){if(!a||a.netProtected)return;if(k==='knock')knockDown(a,...args);else if(k==='shove')shove(a,...args);else if(k==='daze')daze(a,...args);}
 function stationAct(a,m){
   if(!a)return;const name=m.station;if(!['wardrobe','claw'].includes(name))return;
   if(m.kind==='station-leave'){if(slots[name]===a.netKey){slots[name]=null;a.netProtected=false;if(name==='wardrobe')world.curtain(0);}return;}
   const point=world.stations.find(q=>q.id===name);
   const granted=!!point&&a.pos.distanceTo(point.p)<=point.r+1&&!a.stun&&!a.heldBy&&!a.held&&(!slots[name]||slots[name]===a.netKey);
   if(granted){slots[name]=a.netKey;a.netProtected=true;}
   if(a===world.state.player)finishStation(name,granted);else event({kind:'station-result',to:a.netKey,station:name,granted});full=0;
 }
 function finishStation(name,granted){if(pending?.name!==name)return;const cb=pending.cb;pending=null;if(granted){station=name;world.state.player.netProtected=true;cb();}else options.busy(name);}
 function act(a,m){
   if(!a||!m)return;
   if(m.kind?.startsWith('station-')){stationAct(a,m);return;}
   if(a.netProtected)return;
   if(m.kind==='hit'){const b=actor(m.to);if(b&&!b.netProtected&&a.pos.distanceTo(b.pos)<3&&Array.isArray(m.args)&&m.args.every(n=>Number.isFinite(n)&&Math.abs(n)<35)){if(b.puppet)hit(b,m.k,m.args);else applyHit(b,m.k,m.args);}return;}
   net.act(a,m);full=0;
 }
 function before(P){
   ensure();if(!net)return;
   P.netKey=key();P.netProtected=!!station||options.cutscene();
   world.state.bots=[...remotes.values()].filter(a=>a.mode!=='match'&&a.buf.length);
   for(const a of world.state.bots){a.netKey='p'+a.id;a.puppet=true;a.human=true;a.bot=true;a.netProtected=Object.values(slots).includes(a.netKey)||options.cutscene();}
   world.state.net=net;world.state.netHit=hit;
 }
 function packet(a){return {id:a===world.state.player?NET.id:a.id,x:a.pos.x,y:a.pos.y,z:a.pos.z,r:a.root.rotation.y,s:pose(a.ch._netS||a.s),
   f:fields.map(k=>a[k]||0),holding:net.keyOf(a.holding),heldBy:net.keyOf(a.heldBy),protected:!!a.netProtected};}
 function correct(m){if(m.to===key()&&vector(m.delta)){const p=world.state.player,sent=pendingPositions.get(m.n);if(!sent||Math.hypot(p.pos.x-sent[0],p.pos.z-sent[2])>8||Math.abs(p.pos.y-sent[1])>8)return;pendingPositions.delete(m.n);p.pos.x+=m.delta[0];p.pos.z+=m.delta[2];pushOut(p.pos,p.r,p.pos.y+p.step,p.pos.y+p.h);}
 }
 function receiveActor(q){const a=actor('p'+q.id);if(!a)return;if(a!==world.state.player)fields.forEach((k,i)=>a[k]=q.f?.[i]||0);a.holding=actor(q.holding)||null;a.heldBy=actor(q.heldBy)||null;a.netProtected=!!q.protected;}
 onNet('st',m=>{if(m.m!=='hub'||m.protocol!==2)return;scope(()=>{
   ensure();if(!net)return;
   if(host){const a=actor('p'+m.id);if(!a||!vector([m.x,m.y,m.z]))return;
     if(!a.netProtected){const end=[m.x,m.y,m.z],from=a.pos.toArray();const p=Math.abs(m.y-a.pos.y)>8?end:sweepPosition(from,end,a.r,q=>{pushOut(q,a.r,q.y+a.step,q.y+a.h);pushActorsOut(q,a);});a.pos.fromArray(p);pushOut(a.pos,a.r,a.pos.y+a.step,a.pos.y+a.h);}
     else if(slots.wardrobe===a.netKey&&m.x>-17.5&&m.x<-8.5&&m.z>-9&&m.z<-.5)a.pos.set(m.x,m.y,m.z);
     if(a.heldBy){const dx=a.pos.x-a.heldBy.pos.x,dz=a.pos.z-a.heldBy.pos.z,d=Math.hypot(dx,dz);if(d>1.2){a.pos.x=a.heldBy.pos.x+dx/d*1.2;a.pos.z=a.heldBy.pos.z+dz/d*1.2;}}
     if(a.buf.length){a.buf.at(-1).x=a.pos.x;a.buf.at(-1).z=a.pos.z;}
     a.netInput={n:m.n,p:[m.x,m.y,m.z]};a.s=m.s||{};a.onGround=!m.s?.air;
     if(slots.wardrobe===a.netKey&&Number.isFinite(m.door))world.curtain(m.door);
     for(const cmd of m.cmds||[])act(a,cmd);net.accept(m.c,a);receiveSounds(m.fx,a);
   }else if(trusted(m)&&m.n>lastSeq){
     lastSeq=m.n;receiveSounds(m.fx);for(const fix of m.fix||[])correct(fix);if(m.hw)net.receive(m.hw);if(m.pm)net.receiveMotion(m.pm);for(const q of m.hs||[])receiveActor(q);
     if(m.slots)Object.assign(slots,m.slots);
     if(slots.wardrobe!==key()&&Number.isFinite(m.door))world.curtain(m.door);
   }
 });});
 onNet('ev',m=>{if(m.e!=='hub'||!trusted(m))return;scope(()=>{
   if(m.kind==='hit'&&m.to===key())applyHit(world.state.player,m.k,m.args||[]);
   if(m.kind==='station-result'&&m.to===key())finishStation(m.station,m.granted);
   if(m.kind==='correct')correct(m);
 });});
 onNet('join',()=>{full=0;});
 onNet('leave',id=>scope(()=>{const a=world.state.bots?.find(a=>a.id===id);net?.locally(()=>releaseDisconnected(a));for(const name of Object.keys(slots))if(slots[name]==='p'+id){slots[name]=null;if(name==='wardrobe')world.curtain(0);}full=0;}));
 return {before,sent(m){pendingPositions.set(m.n,[m.x,m.y,m.z]);if(pendingPositions.size>40)pendingPositions.delete(pendingPositions.keys().next().value);},pose(dt){for(const a of [world.state.player,...(world.state.bots||[])])if(a.holding)poseGrip(a,a.holding,dt);},unsent(m){retrySounds(m.fx);if(m.cmds)queue.unshift(...m.cmds);net?.retryProposals();net?.retryMotion();full=0;},contact(){if(net&&!options.cutscene())separateActors();},
   enter(name,cb){if(!inRoom()){cb();return;}scope(()=>{ensure();if(pending||station)return;pending={name,cb};const m={kind:'station-enter',station:name};if(host)stationAct(world.state.player,m);else command(m);});},
   leave(){if(!station)return;const name=station;station=null;world.state.player.netProtected=false;if(host){slots[name]=null;if(name==='wardrobe')world.curtain(0);}else command({kind:'station-leave',station:name});},
   busy:name=>!!slots[name]&&slots[name]!==key(),
   tick(dt,P,m){before(P);if(!net)return;m.protocol=2;m.n=++seq;m.fx=takeSounds();
     for(const a of world.state.bots){if(a.held){cargoPosition(a,a.held.pos,a.held.def.r);poseMeleeItem(a,a.held);}if(host&&!a.netProtected)bumpPushables(a,dt);}
     if(!options.cutscene())separateActors();
     worldT-=dt;full-=dt;
     if(host){m.fix=[];m.hs=[P,...world.state.bots].map(packet);const pm=net.motionEntries();if(pm.length)m.pm=pm;m.slots={...slots};m.door=world.curtainOpen;
       for(const a of world.state.bots)if(a.netInput){const p=a.netInput.p,dx=a.pos.x-p[0],dz=a.pos.z-p[2];if(Math.hypot(dx,dz)>.015){m.fix.push({to:a.netKey,n:a.netInput.n,delta:[dx,0,dz]});a.netInput=null;}}
       if(worldT<=0){worldT=worldIntervalFor(NET.players.size);m.hw=net.capture(full<=0);if(full<=0)full=3;}
     }else{m.door=world.curtainOpen;if(worldT<=0){worldT=worldIntervalFor(NET.players.size);m.c=net.proposals();}if(queue.length)m.cmds=queue.splice(0);}
   },get host(){return host;},get slots(){return slots;},get net(){return net;}
 };
}
