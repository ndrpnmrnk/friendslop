import { random } from '../core/random.js';
import { explosion } from '../game/vfx.js';
import {demolitionBurst} from './demolition-fx.js';
import {shake} from '../game/worldfx.js';
import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {addSolid,raySolids} from '../world/physics.js';
import {destroySection} from '../world/sections.js';
import {actors,knockDown} from '../game/actors.js';
import {npcList,npcPosition,hitNPC} from '../game/impacts.js';
import {burst,smokeRing,smoke,chunk} from '../world/particles.js';
import {sfx} from '../core/sfx.js';
const distanceToBuilding=(p,u)=>Math.hypot(Math.max(u.box[0]-p.x,0,p.x-u.box[2]),Math.max(u.box[1]-p.z,0,p.z-u.box[3]));
export function buildDemolition(){const u=W.university,g=new THREE.Group();g.position.copy(u.start);W.group.add(g);g.add(compose('demo36-case',a=>{a(G.box,tmat(T.metal()),0,.25,0,.70,.45,.45);a(G.box,tmat(T.sign('ХНУРЕ','#d6cbb0','#4e4657')),0,.25,.232,.52,.17,.012);a(G.box,col(0x3d3b46),0,.50,0,.28,.09,.035);}));return{g,u,pos:()=>g.position,front:()=>g.position,dispose(){g.removeFromParent();}};}
export function demolitionGame(o,api,ctx){
 api.feedback();const P=ctx.player,u=o.u,charges=u.charges.map(p=>{const g=new THREE.Group();g.position.copy(p);W.group.add(g);g.add(compose('demo36-charge',a=>{a(G.box,tmat(T.cloth(0x9f8662)),0,.45,0,.30,.20,.16);for(const s of [-1,1])a(G.box,col(0x514d48),s*.09,.45,.09,.025,.21,.025);a(G.box,tmat(T.sign('C4','#bbaa85','#433b3f')),0,.45,.092,.16,.08,.01);}));const lamp=mesh(G.box,col(0x77796b),.10,.52,.09,.025,.025,.025,g);g.scale.setScalar(.70);return{g,lamp,placed:false};});
 const safe=u.start.clone();safe.z=Math.min(W.bounds-1,u.box[3]+11);let placed=0,placing=null,armed=false,count=10,t=0,dead=false,exploded=false,after=0,finished=false,cleaned=false,safeAtBlast=false;
 const blueprintMaterial=new THREE.MeshBasicMaterial({color:0xdbc39a,transparent:true,opacity:.46,depthWrite:false,wireframe:true}),floorMaterial=new THREE.MeshBasicMaterial({color:0xe8bd69,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide});
 const diagrams=charges.map((charge,i)=>{const g=new THREE.Group();g.name='charge-blueprint';g.position.copy(u.charges[i]);W.group.add(g);g.add(compose('demo45-bracket',a=>{for(const sx of[-1,1])for(const sz of[-1,1]){a(G.box,floorMaterial,sx*.40,.025,sz*.40,.25,.018,.025);a(G.box,floorMaterial,sx*.51,.025,sz*.29,.025,.018,.25);}}));g.children[0].traverse(m=>{if(m.isMesh)m.material=floorMaterial;});mesh(G.box,blueprintMaterial,0,.44,0,.35,.23,.20,g);return g;});
 const parts=charges.map(c=>{const list=[];for(let i=0;i<3;i++){const q=mesh(G.box,col([0x9f8662,0x707b80,0xc7b897][i]),-.11+i*.11,.44,.02,.075,.12,.16,c.g);q.userData.rest=q.position.clone();list.push(q);}return list;});
 api.msg('E у схемы - начать установку. Затем три щелчка ЛКМ');
 const nearCharge=()=>{const p=u.charges[placed];if(!p||P.drone||P.returning||P.stun>0||P.getT>0||P.heldBy||P.pos.distanceTo(p)>1.85)return false;const eye=P.pos.clone().add(new V3(0,.8,0)),d=p.clone().add(new V3(0,.45,0)).sub(eye),len=d.length();return raySolids(eye,d.normalize(),len)>=len-.1;};
 const cancelPlace=()=>{if(placing){parts[placed].forEach(q=>q.position.copy(q.userData.rest));placing=null;}P.missionTool=false;};

 const cleanup=()=>{if(cleaned)return;cleaned=true;charges.forEach(c=>c.g.removeFromParent());diagrams.forEach(g=>g.removeFromParent());blueprintMaterial.dispose();floorMaterial.dispose();W.animated=W.animated.filter(f=>f!==tick);};
 function explode(){exploded=true;u.destroyed=true;safeAtBlast=distanceToBuilding(P.pos,u)>=7;for(const a of actors()){const distance=distanceToBuilding(a.pos,u);if(distance>9||a.drone||a.returning)continue;const dx=a.pos.x-u.center.x,dz=a.pos.z-u.center.z,d=Math.hypot(dx,dz)||1;knockDown(a,dx/d*9,dz/d*9,1.8);a.vel.y=Math.max(a.vel.y,4);}
  for(const n of npcList()){const p=npcPosition(n);if(p&&distanceToBuilding(p,u)<9)hitNPC(n,true,(p.x-u.center.x)*.7,(p.z-u.center.z)*.7);}
  demolitionBurst(u.center);explosion({x:u.center.x,y:u.center.y+1,z:u.center.z},3.2,{debris:[0x8a4a3a,0x6d6560,0x4a3e3a,0xb59a7a]});for(let i=0;i<4;i++){const a=i*1.57+.4;explosion({x:u.center.x+Math.cos(a)*6,y:u.center.y+2+i,z:u.center.z+Math.sin(a)*5},1.6);}destroySection(u);W.missionZones=W.missionZones.filter(z=>!(z.x0>=u.box[0]&&z.x1<=u.box[2]&&z.z0>=u.box[1]&&z.z1<=u.box[3]));for(const key of Object.keys(W.spots))W.spots[key]=W.spots[key].filter(p=>!(p.x>=u.box[0]&&p.x<=u.box[2]&&p.z>=u.box[1]&&p.z<=u.box[3]));W.onBuildingDestroyed?.(u);sfx('boom',{at:u.center,range:65});W.flash?.(u.center,0xffb458,3.5);const distance=P.pos.distanceTo(u.center);shake(Math.max(.12,1.25*(1-distance/85)));u.g.visible=false;
  for(let i=0;i<4;i++){const p=u.charges[i];burst(p.x,p.y+1,p.z,6,{color:0xffad51,size:.75,speed:5,up:4,life:.7,grow:1.6});smokeRing(p.x,p.y+1,p.z,4,{color:0x85746c,size:.65,speed:3,up:1.5,life:2,grow:1.5});}
  // Два ограниченных масштаба обломков. Не создаём тела физики для каждой стены.
  for(let i=0;i<20;i++){const angle=i*2.4,x=u.center.x+(i%7-3)*3.2,z=u.center.z+(Math.floor(i/7)-1.5)*4,y=u.center.y+2+(i%4)*2.5;chunk(x,y,z,[Math.cos(angle)*(3+i%4),3+i%5,Math.sin(angle)*(3+i%4)],{mat:tmat(i%3?T.concrete():T.brickWall()),size:1,sx:1.5+i%3,sy:.25+(i%3)*.4,sz:1.2+i%2,r:.4,life:3.2});}
  for(let i=0;i<48;i++){const angle=i*2.4;chunk(u.center.x+(random()-.5)*23,u.center.y+1+random()*10,u.center.z+(random()-.5)*17,[Math.cos(angle)*(4+i%7),3+random()*7,Math.sin(angle)*(4+i%7)],{mat:col(i%3?0x9c8f7a:0x514c50),size:.10+random()*.22,sy:.5,life:2.0});}
  for(let i=0;i<16;i++){const a=i*2.4,r=2+i%12;smoke(u.center.x+Math.cos(a)*r,u.center.y+.5+random()*4,u.center.z+Math.sin(a)*r*.7,{color:i%2?0x81796f:0x5b5860,size:.6+i%3*.4,grow:2.5+i%4,life:2.6+random(),vx:Math.cos(a)*3,vy:1.5,vz:Math.sin(a)*3,g:-.2});}

 }
 const tick=dt=>{if(!armed)return;t+=dt;if(!exploded){count-=dt;for(const c of charges)c.lamp.material=col(Math.sin(t*(8+(10-count)*.9))>0?0xc96143:0x665a4c);if(!dead)api.countdown?.(Math.max(1,Math.ceil(count)),'ОТБЕГАЙ ОТ ХНУРЕ');if(count<=0){if(!dead)api.countdown?.(0);explode();}}
  else{after+=dt;if(after<1.5&&random()<dt*8){const angle=after*19;smoke(u.center.x+Math.cos(angle)*8,u.center.y+.2,u.center.z+Math.sin(angle)*6,{color:0x8b8174,size:.7,grow:2.3,life:2,vy:.8});}if(after>1.6&&!finished){finished=true;buildDemolitionRuins(u);cleanup();if(!dead){api.msg(safeAtBlast?'Хнуре в руинах. Успел отбежать!':'Взрыв застал слишком близко',safeAtBlast?'good':'bad');api.finish({success:true,mult:safeAtBlast?1:.5});}}}
 };W.animated.push(tick);
 const commit=()=>{charges[placed].placed=true;charges[placed].g.scale.setScalar(1);diagrams[placed].visible=false;placed++;placing=null;P.missionTool=false;api.progress(placed/4*.7);sfx('pickup',{at:u.charges[placed-1],range:10});if(placed===4){armed=true;api.msg('Заряды установлены! 10 секунд на отход','bad');}else api.msg(`Установлено ${placed}/4`,'good');};
 const game={get equipped(){return !!placing;},get phase(){return armed?'countdown':placing?'assembly':'placing';},get charges(){return charges;},get installation(){return placing;},target:()=>armed?safe:u.charges[placed],botTarget:()=>armed?safe:u.charges[placed],botNear:.8,
  prompt:()=>armed?'':placing&&nearCharge()?'<b>ЛКМ</b>Защёлкнуть блок '+Math.min(3,placing.steps+1)+'/3':nearCharge()?'<b>E</b>Установить игровой заряд':'',
  interact(){if(armed||placing||!nearCharge())return false;placing={steps:0,t:0,partT:0,animating:false};P.missionTool=true;parts[placed].forEach((q,i)=>q.position.copy(q.userData.rest).add(new V3(0,.25+i*.035,.15)));api.msg('ЛКМ - защёлкни три блока в корпусе');return true;},
  down(){if(!placing||!nearCharge()||placing.animating)return false;placing.animating=true;placing.partT=0;sfx('click',{at:u.charges[placed],range:8});return true;},
  botStep(dt,brain){if(armed)return;if(!placing){if(brain.ready(.4))this.interact();}else if(brain.ready(.45))this.down();},
  pose(){if(!placing)return;const part=parts[placed][Math.min(placing.steps,2)].getWorldPosition(new V3()),local=P.root.worldToLocal(part);if(local.length()<2.5)P.ch.handR.position.lerp(local,.4);},
  update(dt){if(dead)return;dt=Math.min(.05,dt);api.timer(ctx.mission.activeLeft??90);if(armed)return;t+=dt;const current=u.charges[placed];for(let i=0;i<charges.length;i++){charges[i].g.visible=charges[i].placed||(i===placed&&!!placing);diagrams[i].scale.setScalar(i===placed?1+Math.sin(t*2)*.018:1);}
   if(placing){if(!nearCharge()||P.daze>0){cancelPlace();return;}placing.t+=dt;if(placing.animating){placing.partT+=dt;const k=THREE.MathUtils.smoothstep(placing.partT,0,.24),q=parts[placed][placing.steps],base=q.userData.rest;q.position.copy(base).add(new V3(0,(.25+placing.steps*.035)*(1-k),.15*(1-k)));charges[placed].g.scale.setScalar(.96+k*.04);if(k>=1){placing.steps++;placing.animating=false;if(placing.steps===3)commit();}}}
  },
  stop(){dead=true;cancelPlace();api.countdown?.(0);if(!armed||finished)cleanup();}
 };return game;
}

export function buildDemolitionRuins(u){
 if(u.netRuins)return u.netRuins;
 const build=()=>{const ruins=new THREE.Group();W.group.add(ruins);ruins.name='university-ruins';ruins.add(compose('demo43-ruins',a=>{const brick=tmat(T.brickWall()),concrete=tmat(T.concrete());for(let i=0;i<48;i++){const x=(i*7%25)-12,z=(i*11%17)-8,h=.2+(i%5)*.25;a(G.box,i%2?brick:concrete,x,h*.5,z,1.2+i%3,h,1.3,0,i*.41);}a(G.box,brick,-11,1.1,-7,.4,2.2,4);a(G.box,concrete,10,.7,5,3.5,1.4,.4);for(let i=0;i<8;i++)a(G.box,concrete,-9+i*2.5,.5+i%3*.2,-4,1.8,.18,2.5,0,i*.6,.1);a(G.box,tmat(T.sign('ХНУРЕ','#6c665b','#b4ab96')),2,.38,3,4,.65,.12,-.45,.25,0);}));ruins.position.copy(u.center);W.keep.push(ruins);for(let i=0;i<48;i++){const x=u.center.x+(i*7%25)-12,z=u.center.z+(i*11%17)-8,h=.2+(i%5)*.25,w=1.2+i%3;addSolid(x-w/2,z-.65,x+w/2,z+.65,u.center.y,u.center.y+h);}addSolid(u.center.x-11.2,u.center.z-9,u.center.x-10.8,u.center.z-5,u.center.y,u.center.y+2.2);addSolid(u.center.x+8.25,u.center.z+4.8,u.center.x+11.75,u.center.z+5.2,u.center.y,u.center.y+1.4);u.netRuins=ruins;return ruins;};
 return W.net?W.net.scope('university-ruins',build):build();
}
