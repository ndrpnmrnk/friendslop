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
import {burst} from '../world/particles.js';
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
 let open=0,doorTarget=0,dead=false,leaving=false,exitT=0,v=0;
 const sync=()=>{for(const q of solids){q.cx=g.position.x;q.cz=g.position.z;}back.on=open<.75;};
 const tick=dt=>{if(dead)return;open+=(doorTarget-open)*(1-Math.exp(-dt*5));for(const d of doors)d.p.rotation.y=-d.s*open*1.65;for(const w of wheels)w.rotation.x+=v*dt/.41;
  if(leaving){exitT+=dt;v=Math.min(8,v+dt*3);g.translateZ(v*dt);if(exitT>1.2)for(const q of solids)q.on=false;if(exitT>9||Math.abs(g.position.x)>W.bounds+7||Math.abs(g.position.z)>W.bounds+7)cleanup();}else sync();};
 W.animated.push(tick);
 function cleanup(){if(dead)return;dead=true;g.removeFromParent();for(const q of solids)q.on=false;W.obbs=W.obbs.filter(q=>!solids.includes(q));W.animated=W.animated.filter(q=>q!==tick);}
 const o={g,place,solids,children:[],reach:2.5,pos:()=>g.position,front:()=>g.localToWorld(new V3(0,0,-3.25)),local:p=>g.worldToLocal(p.clone()),setOpen(k){doorTarget=k;},speed(k){v=k;},sync,depart(){leaving=true;doorTarget=0;},dispose(){if(!leaving)cleanup();}};return o;
}
export function vanGame(o,api,ctx){
 api.feedback();const P=ctx.player,kids=[],outlines=[],origin=o.g.position.clone();let held=null,got=0,time=CONFIG.encounters.vanTime,t=0,end=-1,safe=false;
 o.setOpen(1);api.msg('ЛКМ - поймать · E у дверей или ПКМ - в бусик');
 for(let i=0;i<5;i++){
  const spot=freeSpot(o.front(),4,11);if(!spot){safe=true;break;}
  const m=littleNPC(i),b=npcBody(m);b.pos.copy(spot);b.probe.copy(spot);b.state='run';b.id=i;b.wander=spot.clone();b.change=0;b.cry=0;kids.push(b);W.group.add(b.root);
  const marker=mesh(G.plane,tmat(T.sign('!','#e8c16d','#362d43')),0,1.42,0,.25,.3,1,b.root);marker.material.side=THREE.DoubleSide;b.marker=marker;const ol=addOutline(b.root,.025);outlines.push(ol);b.outline=ol;
 }
 o.children=kids;
 function cry(k){if(k.cry>0)return;k.cry=1.6;sfx('kidYelp',{at:k.pos,range:15});scareBirds(k.pos.x,k.pos.z,8);for(const c of W.cats)if(flat(c.root.position,k.pos)<7)c.hit?.(false,c.root.position.x-k.pos.x,c.root.position.z-k.pos.z);for(const f of TOWN.folks)if(f.kind==='dog'&&flat(f.pos,k.pos)<9)f.barkT=1.3;for(const a of actors())if(a!==P&&flat(a.pos,k.pos)<5)a.startle=Math.max(a.startle||0,.35);}
 function board(k){k.state='board';k.marker.visible=false;k.outline.set(false);if(held===k)held=null;got++;api.progress(got/5);api.msg(`В бусике ${got}/5`,'good');sfx('pickup',{at:o.g.position});if(got===5){end=1.8;o.setOpen(0);}}
 function release(k,v){k.state='fly';k.vel.copy(v);k.onGround=false;k.root.rotation.x=.3;if(held===k)held=null;cry(k);}
 const closest=()=>kids.filter(k=>k.state==='run').sort((a,b)=>flat(a.pos,P.pos)-flat(b.pos,P.pos))[0];
 function capture(){if(held||P.held||P.stun>0||P.daze>0||P.heldBy)return;const k=closest();if(!k||flat(P.pos,k.pos)>1.4||Math.abs(P.pos.y-k.pos.y)>.7||!visible(P.pos.clone().add(new V3(0,.7,0)),k.pos.clone().add(new V3(0,.6,0))))return;held=k;k.state='held';k.escape=5.5;P.carryKitten=true;cry(k);}
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
   for(const k of kids){k.cry-=dt;k.outline.set(k.state==='run'&&flat(P.pos,k.pos)<8);k.marker.rotation.y=-k.root.rotation.y+(ctx.camera?.rotation.y||0);
    if(k.state==='board'){const p=o.g.localToWorld(new V3((k.id%2?1:-1)*.64,.77,-1.65+Math.floor(k.id/2)*.75));k.pos.copy(p);k.root.rotation.set(0,o.g.rotation.y,0);k.model.animate(t,0);continue;}
    if(k.state==='held'){
     k.escape-=dt;k.pos.copy(P.root.localToWorld(new V3(0,P.ch.d.holdY-.25,P.ch.d.holdZ+.22)));k.root.rotation.set(0,P.root.rotation.y+Math.PI/2,Math.sin(t*17)*.12);k.model.animate(t,1,true);
     if(k.escape<=0||P.stun>0||P.daze>0||P.heldBy){release(k,new V3(Math.sin(t)*2,3,Math.cos(t)*2));api.msg('Вырвался!','bad');}continue;
    }
    if(k.state==='fly'){
     const before=o.local(k.pos);moveBody(k,dt);const q=o.local(k.pos);
     // Пересечение открытого дверного проёма, включая быстрый бросок за один кадр.
     const crossing=before.z< -2.32&&q.z>=-2.44,inside=q.z> -2.44&&q.z<.4;
     if((crossing||inside)&&Math.abs(q.x)<.91&&q.y>.6&&q.y<1.75){board(k);continue;}
     k.root.rotation.x+=dt*3;if(k.onGround){k.state='run';k.root.rotation.x=0;k.change=0;}continue;
    }
    k.change-=dt;let target=k.wander;const d=flat(k.pos,P.pos);
    if(d<6){const dx=k.pos.x-P.pos.x,dz=k.pos.z-P.pos.z,r=Math.hypot(dx,dz)||1;target=new V3(k.pos.x+dx/r*3,k.pos.y,k.pos.z+dz/r*3);}
    else if(k.change<=0||flat(k.pos,k.wander)<.6){k.wander=freeSpot(origin,4,12)||k.wander;k.change=2+Math.random()*2;target=k.wander;k.nav=null;}
    if(flat(k.pos,origin)>17)target=origin;
    walkNPC(k,target,d<6?3.2:1.4,dt);k.model.animate(t,d<6?1:.4);
   }
  },
  stop(){P.carryKitten=false;P.charging=false;for(const q of outlines)q.set(false);for(const k of kids)k.root.removeFromParent();o.children=[];}
 };
}
