import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {destroySection,disableSection} from '../world/sections.js';
import {actors,knockDown} from '../game/actors.js';
import {npcList,npcPosition,hitNPC} from '../game/impacts.js';
import {burst,smokeRing,chunk} from '../world/particles.js';
import {sfx} from '../core/sfx.js';
const distanceToBuilding=(p,u)=>Math.hypot(Math.max(u.box[0]-p.x,0,p.x-u.box[2]),Math.max(u.box[1]-p.z,0,p.z-u.box[3]));
export function buildDemolition(){const u=W.university,g=new THREE.Group();g.position.copy(u.start);W.group.add(g);g.add(compose('demo36-case',a=>{a(G.box,tmat(T.metal()),0,.25,0,.70,.45,.45);a(G.box,tmat(T.sign('ХНУРЕ','#d6cbb0','#4e4657')),0,.25,.232,.52,.17,.012);a(G.box,col(0x3d3b46),0,.50,0,.28,.09,.035);}));return{g,u,pos:()=>g.position,front:()=>g.position,dispose(){g.removeFromParent();}};}
export function demolitionGame(o,api,ctx){
 api.feedback();const P=ctx.player,u=o.u,charges=u.charges.map(p=>{const g=new THREE.Group();g.position.copy(p);W.group.add(g);g.add(compose('demo36-charge',a=>{a(G.box,tmat(T.cloth(0x9f8662)),0,.45,0,.30,.20,.16);for(const s of [-1,1])a(G.box,col(0x514d48),s*.09,.45,.09,.025,.21,.025);a(G.box,tmat(T.sign('C4','#bbaa85','#433b3f')),0,.45,.092,.16,.08,.01);}));const lamp=mesh(G.box,col(0x77796b),.10,.52,.09,.025,.025,.025,g);g.scale.setScalar(.70);return{g,lamp,placed:false};});
 const safe=u.start.clone();safe.z=Math.min(W.bounds-1,u.box[3]+11);let placed=0,placing=0,armed=false,count=10,t=0,dead=false,exploded=false,after=0,finished=false,cleaned=false,safeAtBlast=false;
 api.msg('E у метки - установить заряд. Всего четыре');
 const cleanup=()=>{if(cleaned)return;cleaned=true;charges.forEach(c=>c.g.removeFromParent());W.animated=W.animated.filter(f=>f!==tick);};
 function explode(){exploded=true;u.destroyed=true;safeAtBlast=distanceToBuilding(P.pos,u)>=7;for(const a of actors()){const distance=distanceToBuilding(a.pos,u);if(distance>9||a.drone||a.returning)continue;const dx=a.pos.x-u.center.x,dz=a.pos.z-u.center.z,d=Math.hypot(dx,dz)||1;knockDown(a,dx/d*9,dz/d*9,1.8);a.vel.y=Math.max(a.vel.y,4);}
  for(const n of npcList()){const p=npcPosition(n);if(p&&distanceToBuilding(p,u)<9)hitNPC(n,true,(p.x-u.center.x)*.7,(p.z-u.center.z)*.7);}
  disableSection(u);W.onBuildingDestroyed?.(u);sfx('boom',{at:u.center,range:65});W.flash?.(u.center,0xffb458,2);
  for(let i=0;i<4;i++){const p=u.charges[i];burst(p.x,p.y+1,p.z,8,{color:0xffad51,size:.75,speed:5,up:4,life:.7,grow:1.6});smokeRing(p.x,p.y+1,p.z,7,{color:0x85746c,size:.65,speed:3,up:1.5,life:2,grow:1.5});}
  for(let i=0;i<20;i++)chunk(u.center.x+(Math.random()-.5)*18,u.center.y+2+Math.random()*4,u.center.z+(Math.random()-.5)*12,[(Math.random()-.5)*8,3+Math.random()*4,(Math.random()-.5)*8],{mat:col(i%2?0x968676:0x605e62),size:.3,life:1.8});
 }
 const tick=dt=>{if(!armed)return;t+=dt;if(!exploded){count-=dt;for(const c of charges)c.lamp.material=col(Math.sin(t*(8+(10-count)*.9))>0?0xc96143:0x665a4c);if(!dead)api.countdown?.(Math.max(1,Math.ceil(count)),'ОТБЕГАЙ ОТ ХНУРЕ');if(count<=0){if(!dead)api.countdown?.(0);explode();}}
  else{after+=dt;u.g.scale.y=Math.max(.12,1-after*.55);if(after>1.6&&!finished){finished=true;destroySection(u);const ruins=new THREE.Group();W.group.add(ruins);ruins.add(compose('demo36-ruins',a=>{const brick=tmat(T.brickWall()),concrete=tmat(T.concrete());for(let i=0;i<28;i++){const x=(i*7%25)-12,z=(i*11%17)-8,h=.2+(i%4)*.18;a(G.box,i%2?brick:concrete,x,h*.5,z,1.2+i%3,h,1.3,0,i*.41);}a(G.box,brick,-11,1.1,-7,.4,2.2,4);a(G.box,concrete,10,.7,5,3.5,1.4,.4);}));ruins.position.copy(u.center);W.keep.push(ruins);for(let i=0;i<12;i++){const x=u.center.x+(i*7%25)-12,z=u.center.z+(i*11%17)-8,h=.2+(i%4)*.18;addSolid(x-.6,z-.6,x+.6,z+.6,u.center.y,u.center.y+h);}W.missionZones=W.missionZones.filter(z=>!(z.x0>=u.box[0]&&z.x1<=u.box[2]&&z.z0>=u.box[1]&&z.z1<=u.box[3]));for(const key of Object.keys(W.spots))W.spots[key]=W.spots[key].filter(p=>!(p.x>=u.box[0]&&p.x<=u.box[2]&&p.z>=u.box[1]&&p.z<=u.box[3]));cleanup();if(!dead){api.msg(safeAtBlast?'Хнуре в руинах. Успел отбежать!':'Взрыв застал слишком близко',safeAtBlast?'good':'bad');api.finish({success:true,mult:safeAtBlast?1:.5});}}}
 };W.animated.push(tick);
 const game={equipped:false,get phase(){return armed?'countdown':'placing';},get charges(){return charges;},target:()=>armed?safe:u.charges[placed],botTarget:()=>armed?safe:u.charges[placed],botNear:.8,
  prompt:()=>armed?'<b>БЕГИ</b>Отойди от здания':placing>0?'Устанавливаешь…':'<b>E</b>Установить игровой заряд',
  interact(){if(armed||placing>0)return false;const p=u.charges[placed];if(P.pos.distanceTo(p)>1.8)return false;placing=.01;P.missionTool=true;return true;},
  botStep(dt,brain){if(!armed&&brain.ready(.4))this.interact();},
  update(dt){if(dead)return;api.timer(ctx.mission.activeLeft??90);if(armed)return;const current=u.charges[placed];for(let i=0;i<charges.length;i++)charges[i].g.visible=i<=placed;
   if(placing>0){if(P.heldBy||P.stun>0||P.daze>0||P.pos.distanceTo(current)>1.8){placing=0;P.missionTool=false;return;}placing+=dt;charges[placed].g.scale.setScalar(.7+Math.min(1,placing/.9)*.3);if(placing>=.9){charges[placed].placed=true;placed++;placing=0;P.missionTool=false;api.progress(placed/4*.7);sfx('pickup',{at:current,range:10});if(placed===4){armed=true;api.msg('Заряды установлены! 10 секунд на отход','bad');}else api.msg(`Установлено ${placed}/4`,'good');}}
  },
  stop(){dead=true;P.missionTool=false;api.countdown?.(0);if(!armed||finished)cleanup();}
 };return game;
}
