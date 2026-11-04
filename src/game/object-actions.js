import {THREE,V3} from '../core/gfx.js';
import {aim} from '../core/input.js';
import {W} from '../world/state.js';
import {raySolids,groundAt} from '../world/physics.js';
import {pickUp,drop} from './items.js';
import {nearestRideable,mount,dismount,hopIn,release} from './ride.js';
import {leaveSwing,leaveBench,leaveHide} from './worldfx.js';
import {letGo} from './grab.js';
import {sfx} from '../core/sfx.js';
import {TEXT} from '../ui/text.js';
import {tugTarget,startTug} from './item-tug.js';
const names={cart:'тележку',skate:'скейт',scooter:'самокат',chair:'кресло',barrow:'тачку',kidcar:'машинку',gurney:'каталку',tire:'шину',ring:'круг'};
const _aimP=new V3();
const _aimO=new V3();
/* v0.74: в тесной комнате камера прижата к плечу, и луч из неё упирается в пол в 1-3 м СБОКУ от персонажа -
   бросок уходил под углом до 95°. Если точка прицела близко или сильно в стороне, целимся тем же направлением
   камеры, но из груди персонажа (как в TPS-играх: направление броска = направление взгляда). */
const _aimC=new V3(),_aimF=new V3();
export function worldAimPoint(player,camera,out=new V3()){
 const res=rawAimPoint(player,camera,out),f=camera.getWorldDirection(_aimF),vx=res.x-player.pos.x,vz=res.z-player.pos.z,h=Math.hypot(vx,vz),fh=Math.hypot(f.x,f.z)||1;
 if(h<4&&(h<1.2||(vx*f.x+vz*f.z)/(h*fh)<.9)){
  const o=_aimC.set(player.pos.x,player.pos.y+1.25,player.pos.z),t=raySolids(o,f,60);
  if(f.y<-.02){let a=0;const q=_aimP;for(let s=.4;s<Math.min(t,60);s+=Math.max(.35,s*.05)){q.copy(o).addScaledVector(f,s);if(groundAt(q.x,q.z,.05,q.y+3)>q.y){let lo=a,hi=s;for(let i=0;i<7;i++){const m=(lo+hi)/2;q.copy(o).addScaledVector(f,m);if(groundAt(q.x,q.z,.05,q.y+3)>q.y)hi=m;else lo=m;}return out.copy(o).addScaledVector(f,Math.max(hi,1.5));}a=s;}}
  return out.copy(o).addScaledVector(f,Math.max(1.5,Math.min(t,60)));}
 return res;
}
function rawAimPoint(player,camera,out){
 // v0.71.1: препятствия между камерой и игроком (стена за спиной, угол здания) не считаются - луч начинается на уровне игрока.
 // Иначе прицел оказывался позади персонажа, и бросок летел «в камеру».
 const r=aim(camera),o0=r.ray.origin,d=r.ray.direction,s0=Math.max(0,(player.pos.x-o0.x)*d.x+(player.pos.y+1-o0.y)*d.y+(player.pos.z-o0.z)*d.z-.3),o=_aimO.copy(o0).addScaledVector(d,s0),t=raySolids(o,d,80);
 // v0.67: земля, скейт-чаша и рампы - поверхность высот, а не объект: идём по лучу и ищем, где он уходит под неё.
 // Раньше луч проходил чашу насквозь и прицел повисал в воздухе на высоте игрока.
 if(d.y<-.02){let a=0;const q=_aimP,end=Math.min(t,80);
  for(let s=.4;s<end;s+=Math.max(.35,s*.05)){q.copy(o).addScaledVector(d,s);
   if(groundAt(q.x,q.z,.05,q.y+3)>q.y){let lo=a,hi=s;for(let i=0;i<7;i++){const m=(lo+hi)/2;q.copy(o).addScaledVector(d,m);if(groundAt(q.x,q.z,.05,q.y+3)>q.y)hi=m;else lo=m;}return out.copy(o).addScaledVector(d,hi);}
   a=s;}}
 if(t<80)return out.copy(o).addScaledVector(d,t);
 return r.ray.intersectPlane(new THREE.Plane(new V3(0,1,0),-player.pos.y),out)||out.copy(r.ray.origin).addScaledVector(r.ray.direction,40);
}
// Одинаковый приоритет E: расстояние, взгляд, высота, состояние предмета.
/* v0.52: управление — ЛКМ схватить/подобрать (предметы, пойманное на лету), ПКМ бросок, E только взаимодействие. */
export function pickTarget(P,{stealItem}={}){
 if(P.ride||P.held||P.hang||P.mantle)return null;const f=P.root.rotation.y,fx=Math.sin(f),fz=Math.cos(f);let best=null,bs=1e9;
 for(const it of W.items){if(it.noPickup||!['rest','placed'].includes(it.state)||it.boxed&&!it.boxed.open)continue;const d=Math.hypot(it.pos.x-P.pos.x,it.pos.z-P.pos.z);if(d>1.6||it.pos.y<P.pos.y-.6||it.pos.y>P.pos.y+1.8)continue;
  const l=d||1,s=Math.max(.05,d)*(1.35-.35*((it.pos.x-P.pos.x)*fx+(it.pos.z-P.pos.z)*fz)/l);if(s<bs){bs=s;best=it;}}
 const contested=tugTarget(P);if(contested)return{item:contested,label:'Держи ЛКМ - перетянуть предмет',act:()=>startTug(P,contested)};
 if(best){const it=best;return{item:it,label:`${TEXT.take} ${it.def.name.toLowerCase()}`,act:()=>{if(it.steal&&it.mine!==P&&stealItem){stealItem(it);return;}pickUp(it);P.held=it;it.owner=P;it.wasHeld=true;sfx('pickup');}};}
 let fl=null,fd=1.7;for(const q of W.items)if(q.state==='fly'&&q.owner!==P&&!q.def.heavy&&!q.noPickup){const d=Math.hypot(q.pos.x-P.pos.x,q.pos.z-P.pos.z);if(d<fd&&q.pos.y>P.pos.y&&q.pos.y<P.pos.y+2.4){fd=d;fl=q;}}
 if(fl)return{item:fl,catch:true,label:'Поймать',act:()=>{pickUp(fl);P.held=fl;fl.owner=P;fl.wasHeld=true;sfx('pickup');}};
 return null;
}
export function worldTarget(P,camera,{stealItem,items=true}={}){
 if(P.ride)return null;
 const f=P.root.rotation.y,fx=Math.sin(f),fz=Math.cos(f),c=[];
 const sc=(x,z,d)=>{const dx=x-P.pos.x,dz=z-P.pos.z,l=Math.hypot(dx,dz)||1;return Math.max(.05,d)*(1.35-.35*(dx*fx+dz*fz)/l);};
 for(const q of W.interacts){if(P.held&&!q.allowHeld||q.enabled&&!q.enabled(P))continue;const d=Math.hypot(q.x-P.pos.x,q.z-P.pos.z);
  if(d<q.r&&Math.abs(q.y-P.pos.y)<(q.dy??.9)&&(!q.aim||q.aim(aim(camera))))c.push({s:sc(q.x,q.z,d),label:q.label,allowHeld:q.allowHeld,act:()=>{if(q.prepare&&!q.prepare(P))return;if(q.self||!W.net?.request('interact',q))q.act(P);}});}
 for(const d of W.doors){const dist=Math.hypot(d.x-P.pos.x,d.z-P.pos.z);if(dist<2.2&&Math.abs(d.y-P.pos.y)<1)c.push({s:sc(d.x,d.z,dist)*1.1,label:d.open?TEXT.door.close:TEXT.door.open,act:()=>{const remote=W.net?.request('door',d);if(remote)d.netPendingAt=performance.now();d.open=!d.open;d.dirS=null;d.av=0;if(d.solid&&remote)d.solid.on=!d.open&&d.solid.on;sfx('door',{at:d,v:.6});}});}
 if(!P.held){if(items)for(const it of W.items){if(it.noPickup||!['rest','placed'].includes(it.state)||it.boxed&&!it.boxed.open)continue;const d=Math.hypot(it.pos.x-P.pos.x,it.pos.z-P.pos.z);if(d>1.5||it.pos.y<P.pos.y-.6||it.pos.y>P.pos.y+1.8)continue;
  c.push({s:sc(it.pos.x,it.pos.z,d)*.85,label:`${TEXT.take} ${it.def.name.toLowerCase()}`,act:()=>{if(it.steal&&it.mine!==P&&stealItem){stealItem(it);return;}pickUp(it);P.held=it;it.owner=P;it.wasHeld=true;sfx('pickup');}});}
  const rb=nearestRideable(P);if(rb)c.push({s:sc(rb.x,rb.z,Math.hypot(rb.x-P.pos.x,rb.z-P.pos.z))*1.1,label:names[rb.kind]?(rb.ride?.pose==='stand'?'Встать на ':'Сесть в ')+names[rb.kind]:TEXT.ride,act:()=>mount(P,rb)});}
 c.sort((a,b)=>a.s-b.s);return c[0]||null;
}
export function leaveObject(P){
 if(P.roofSeat){P.roofSeat=null;return true;}if(P.ride){dismount(P,false);return true;}if(P.swing){leaveSwing(P,false);return true;}if(P.bench){leaveBench(P);return true;}if(P.hidden){leaveHide(P);return true;}if(P.grab){if(P.grab.noRide)release(P,0);else hopIn(P);return true;}if(P.holding){letGo(P);return true;}return false;
}
export function interactObject(P,camera){
 if(P.heldBy||P.stun>0||P.getT>0)return false;if(leaveObject(P))return true;
 const target=worldTarget(P,camera,{items:false});if(target){target.act();return true;}
 if(P.held){drop(P.held,P.pos.x+Math.sin(P.root.rotation.y)*.7,P.pos.y,P.pos.z+Math.cos(P.root.rotation.y)*.7);P.held=null;return true;}
 let fl=null,fd=1.7;for(const q of W.items)if(q.state==='fly'&&q.owner!==P&&!q.def.heavy&&!q.noPickup){const d=Math.hypot(q.pos.x-P.pos.x,q.pos.z-P.pos.z);if(d<fd&&q.pos.y>P.pos.y&&q.pos.y<P.pos.y+2.4){fd=d;fl=q;}}
 if(fl){pickUp(fl);P.held=fl;fl.owner=P;fl.wasHeld=true;sfx('pickup');return true;}return false;
}
