import {THREE,G,V3,mesh,col,tmat} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {CONFIG} from '../config.js';
import {W} from '../world/state.js';
import {addObb,groundAt,isFree,moveBody} from '../world/physics.js';
import {addOutline} from '../game/outline.js';
import {actors} from '../game/actors.js';
import {scareBirds} from '../world/birds.js';
import {TOWN} from '../game/town.js';
import {sfx} from '../core/sfx.js';
import {burst,smokeRing,smoke,chunk} from '../world/particles.js';
import {vanModel,littleNPC} from './encounter-models.js';
import {flat,visible,freeSpot,npcBody,walkNPC} from './encounter-motion.js';

export function vanPlaces(){
 const{grid,chunk,road}=CONFIG,half=(grid*chunk+(grid+1)*road)/2,out=[];
 for(let i=0;i<=grid;i++)for(let j=0;j<grid;j++)for(const axis of ['x','z']){
  const lane=-half+road/2+i*(chunk+road),along=-half+road+j*(chunk+road)+chunk*.5;
  const x=axis==='z'?lane:along,z=axis==='z'?along:lane;
  const rx=axis==='z'?1.5:3.1,rz=axis==='z'?3.1:1.5;
  if(isFree(x-rx,z-rz,x+rx,z+rz,.1,2.8)&&Math.abs(groundAt(x,z,.6,.4))<.1&&!W.pushables.some(q=>Math.hypot(q.x-x,q.z-z)<5))out.push({x,y:0,z,axis});
 }return out;
}
export function buildVan(place){
 const {g,doors,wheels}=vanModel();g.position.set(place.x,place.y,place.z);g.rotation.y=place.axis==='x'?Math.PI/2:0;W.group.add(g);
 const solids=[],box=(x0,z0,x1,z1,y0,y1)=>{const q=addObb({cx:place.x,cz:place.z,yaw:g.rotation.y,lx0:x0,lz0:z0,lx1:x1,lz1:z1,y0,y1});solids.push(q);return q;};
 box(-1.14,-2.4,1.14,2.45,.35,.7);box(-1.14,.55,1.14,2.45,.7,2.4);box(-1.17,-2.4,-1.03,.55,.7,2.45);box(1.03,-2.4,1.17,.55,.7,2.45);box(-1.17,-2.4,1.17,.55,2.28,2.45);const back=box(-1.14,-2.44,1.14,-2.33,.7,2.35);
 let open=0,doorTarget=0,dead=false,leaving=false,exitT=0,v=0,trail=0,route=[];
 const sync=()=>{for(const q of solids){q.cx=g.position.x;q.cz=g.position.z;q.yaw=g.rotation.y;}back.on=open<.75;};
 function explode(){if(dead)return;g.userData.exploded=true;const p=g.position;W.flash?.(p,0xffb45a,1.5);sfx('boom',{at:p,range:42});burst(p.x,p.y+1,p.z,22,{color:0xffa13d,size:.7,speed:6,up:5,life:.8,grow:1});smokeRing(p.x,p.y+.7,p.z,14,{color:0x665464,size:.55,speed:4,up:1.2,life:2,grow:1.5});for(let i=0;i<9;i++)chunk(p.x,p.y+1,p.z,[(Math.random()-.5)*10,3+Math.random()*5,(Math.random()-.5)*10],{mat:col(i%3?0x43533e:0x8f999b),size:.22,life:1.2});cleanup();}
 const tick=dt=>{if(dead)return;open+=(doorTarget-open)*(1-Math.exp(-dt*5));for(const d of doors)d.p.rotation.y=-d.s*open*1.65;for(const w of wheels)w.rotation.x+=v*dt/.41;
  if(leaving){exitT+=dt;v=Math.min(8,v+dt*3);if(route.length&&flat(g.position,route[0])<.7)route.shift();const target=route[0];if(!target){explode();return;}const dx=target.x-g.position.x,dz=target.z-g.position.z,d=Math.hypot(dx,dz)||1,want=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(want-g.rotation.y),Math.cos(want-g.rotation.y));g.rotation.y+=Math.max(-dt*1.9,Math.min(dt*1.9,turn));const speed=v*Math.max(.3,1-Math.abs(turn)*.35),nx=g.position.x+dx/d*speed*dt,nz=g.position.z+dz/d*speed*dt,c=Math.abs(Math.cos(g.rotation.y)),s=Math.abs(Math.sin(g.rotation.y)),rx=c*1.16+s*2.5,rz=s*1.16+c*2.5;
   if(exitT>18||Math.abs(nx)+rx>W.bounds-.2||Math.abs(nz)+rz>W.bounds-.2||!isFree(nx-rx,nz-rz,nx+rx,nz+rz,.75,2.4)){explode();return;}g.position.set(nx,g.position.y,nz);g.rotation.z=Math.sin(exitT*6)*.012*Math.min(1,v/5);sync();trail-=dt;if(trail<=0){trail=.18;const p=g.localToWorld(new V3(.8,.35,-2.55));smoke(p.x,p.y,p.z,{color:0x827b83,size:.12,life:.65,vx:-dx/d*.6,vz:-dz/d*.6,vy:.2});}
  }else sync();};
 W.animated.push(tick);
 function cleanup(){if(dead)return;dead=true;g.removeFromParent();for(const q of solids)q.on=false;W.obbs=W.obbs.filter(q=>!solids.includes(q));W.animated=W.animated.filter(q=>q!==tick);}
 const o={g,place,solids,children:[],reach:2.5,get leaving(){return leaving;},get loading(){return open>.7;},pos:()=>g.position,front:()=>g.localToWorld(new V3(0,0,-3.25)),local:p=>g.worldToLocal(p.clone()),setOpen(k){doorTarget=k;},speed(k){v=k;},sync,depart(){leaving=true;doorTarget=0;v=0;const{grid,chunk,road}=CONFIG,half=(grid*chunk+(grid+1)*road)/2,roads=Array.from({length:grid+1},(_,i)=>-half+road/2+i*(chunk+road)),axis=place.axis,cross=axis==='x'?'z':'x',first=g.position.clone();first[axis]=roads.find(q=>q>first[axis]+3)??W.bounds+5;const second=first.clone(),sign=Math.abs(first[cross])>35?-Math.sign(first[cross]):Math.random()<.5?-1:1;second[cross]+=sign*(chunk+road);const end=second.clone();end[cross]=sign*(W.bounds+6);route=[first,second,end];sfx('vanDrive',{at:g.position,range:25});},dispose(){if(!leaving)cleanup();}};return o;
}
export function vanGame(o,api,ctx){
 api.feedback();const P=ctx.player,kids=[],outlines=[],origin=o.g.position.clone();let held=null,got=0,time=CONFIG.encounters.vanTime,t=0,end=-1,safe=false;
 o.setOpen(1);api.msg('ЛКМ - поймать · E у дверей или ПКМ - в бусик');
 for(let i=0;i<5;i++){
  const spot=freeSpot(o.front(),4,11);if(!spot){safe=true;break;}
  const m=littleNPC(i),b=npcBody(m);b.pos.copy(spot);b.probe.copy(spot);b.state='run';b.id=i;b.wander=spot.clone();b.change=0;b.cry=0;kids.push(b);W.group.add(b.root);
  const ol=addOutline(b.root,.018);outlines.push(ol);b.outline=ol;
 }
 o.children=kids;
 function cry(k){if(k.cry>0)return;k.cry=1.3+Math.random()*.5;sfx('kidYelp',{at:k.pos,range:15,p:.88+k.id*.07});scareBirds(k.pos.x,k.pos.z,8);for(const c of W.cats)if(flat(c.root.position,k.pos)<7)c.hit?.(false,c.root.position.x-k.pos.x,c.root.position.z-k.pos.z);for(const f of TOWN.folks)if(f.kind==='dog'&&flat(f.pos,k.pos)<9)f.barkT=1.3;for(const a of actors())if(a!==P&&flat(a.pos,k.pos)<5)a.startle=Math.max(a.startle||0,.35);}
 function board(k){if(k.state==='board')return;k.state='board';k.outline.set(false);if(held===k)held=null;got++;api.progress(got/5);api.msg(`В бусике ${got}/5`,'good');sfx('pickup',{at:o.g.position});if(got===5){end=1.8;o.setOpen(0);}}
 const inside=p=>Math.abs(p.x)<1.04&&p.z> -2.56&&p.z<.52&&p.y>.22&&p.y<2.16;
 function release(k,v){k.state='fly';k.vel.copy(v);k.onGround=false;k.root.rotation.x=.3;if(held===k)held=null;cry(k);}
 const closest=()=>kids.filter(k=>k.state==='run').sort((a,b)=>flat(a.pos,P.pos)-flat(b.pos,P.pos))[0];
 function capture(){if(held||P.held||P.stun>0||P.daze>0||P.heldBy)return;const k=closest();if(!k||flat(P.pos,k.pos)>1.4||Math.abs(P.pos.y-k.pos.y)>.7||!visible(P.pos.clone().add(new V3(0,.7,0)),k.pos.clone().add(new V3(0,.6,0))))return;held=k;k.state='held';k.escape=3.2+Math.random()*.8;k.cry=0;P.carryKitten=true;cry(k);}
 return{
  equipped:true,down(){capture();},carrying:()=>!!held,throwCarry(v){if(held)release(held,v);},
  target:()=>held?o.front():closest()?.pos||o.front(),botTarget:()=>held?o.front():closest()?.pos||o.front(),botNear:.75,
  prompt(){return held?flat(P.pos,o.front())<2?'<b>E</b>Посадить в бусик':'<b>ПКМ</b>Бросить в открытые двери':closest()&&flat(P.pos,closest().pos)<1.4?'<b>ЛКМ</b>Поймать':'';},
  interact(){if(held&&flat(P.pos,o.front())<2&&Math.abs(P.pos.y-o.g.position.y)<1){board(held);return true;}return false;},
  botStep(){if(!held)capture();else this.interact();},
  update(dt){
   t+=dt;time-=dt;api.timer(time);if(safe||time<=0||P.drone||P.returning){api.finish({success:false});return;}
   if(end>=0){P.carryKitten=false;end-=dt;if(end<=0){o.depart();api.finish({success:true,mult:1});}return;}
   const axis=o.place.axis,near=held&&flat(P.pos,o.front())<5,aim=Math.max(origin[axis]-8,Math.min(origin[axis]+8,P.pos[axis])),delta=aim-o.g.position[axis],speed=near||Math.abs(delta)<2?0:Math.sign(delta)*1.8;
   const next=o.g.position[axis]+speed*dt;if(Math.abs(groundAt(axis==='x'?next:o.g.position.x,axis==='z'?next:o.g.position.z,.8,.4))<.1)o.g.position[axis]=next;o.speed(speed);o.sync();
   P.carryKitten=!!held;
   for(const k of kids){k.cry-=dt;k.outline.set(k.state==='run'&&flat(P.pos,k.pos)<3);if(k.state!=='board'&&o.loading&&inside(o.local(k.pos))){board(k);continue;}
    if(k.state==='board'){const p=o.g.localToWorld(new V3((k.id%2?1:-1)*.64,.77,-1.65+Math.floor(k.id/2)*.75));k.pos.copy(p);k.root.rotation.set(0,o.g.rotation.y,0);k.model.animate(t,0);continue;}
    if(k.state==='held'){
     k.escape-=dt;cry(k);k.pos.copy(P.root.localToWorld(new V3(0,P.ch.d.holdY-.25,P.ch.d.holdZ+.22)));k.root.rotation.set(0,P.root.rotation.y+Math.PI/2,Math.sin(t*17)*.12);k.model.animate(t,1,true);if(o.loading&&inside(o.local(k.pos))){board(k);continue;}
     if(k.escape<=0||P.stun>0||P.daze>0||P.heldBy){release(k,new V3(Math.sin(t)*2,3,Math.cos(t)*2));api.msg('Вырвался!','bad');}continue;
    }
    if(k.state==='fly'){
     const before=o.local(k.pos),raw=o.local(k.pos.clone().addScaledVector(k.vel,dt)),den=raw.z-before.z,u=den>.001?(-2.52-before.z)/den:-1,entry=before.clone().lerp(raw,u),crossing=u>=0&&u<=1&&Math.abs(entry.x)<1.03&&entry.y>.22&&entry.y<2.16;moveBody(k,dt);const q=o.local(k.pos);
     if(o.loading&&(crossing||inside(q))){board(k);continue;}
     k.root.rotation.x+=dt*3;if(k.onGround){k.state='run';k.root.rotation.x=0;k.change=0;}continue;
    }
    k.change-=dt;let target=k.wander;const d=flat(k.pos,P.pos);
    if(d<6){const dx=k.pos.x-P.pos.x,dz=k.pos.z-P.pos.z,r=Math.hypot(dx,dz)||1;target=new V3(k.pos.x+dx/r*3,k.pos.y,k.pos.z+dz/r*3);}
    else if(k.change<=0||flat(k.pos,k.wander)<.6){k.wander=freeSpot(origin,4,12)||k.wander;k.change=2+Math.random()*2;target=k.wander;k.nav=null;}
    if(flat(k.pos,origin)>17)target=origin;
    const burst=t%2.1<.65,zig=Math.sin(t*5+k.id*2)*.7;if(d<6){const dx=target.x-k.pos.x,dz=target.z-k.pos.z,r=Math.hypot(dx,dz)||1;target.x+=dz/r*zig;target.z-=dx/r*zig;}walkNPC(k,target,d<6?(burst?4.5:3.8):2.0,dt);k.model.animate(t,d<6?1:.6);
   }
  },
  stop(){P.carryKitten=false;P.charging=false;for(const q of outlines)q.set(false);for(const k of kids){if(o.leaving&&k.state==='board')o.g.attach(k.root);else k.root.removeFromParent();}o.children=[];}
 };
}
