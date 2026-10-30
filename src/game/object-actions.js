import {THREE,V3} from '../core/gfx.js';
import {aim} from '../core/input.js';
import {W} from '../world/state.js';
import {raySolids} from '../world/physics.js';
import {pickUp,drop} from './items.js';
import {nearestRideable,mount,dismount,hopIn,release} from './ride.js';
import {leaveSwing,leaveBench,leaveHide} from './worldfx.js';
import {letGo} from './grab.js';
import {sfx} from '../core/sfx.js';
import {TEXT} from '../ui/text.js';
import {tugTarget,startTug} from './item-tug.js';
const names={cart:'тележку',skate:'скейт',scooter:'самокат',chair:'кресло',barrow:'тачку',kidcar:'машинку',gurney:'каталку',tire:'шину',ring:'круг'};
export function worldAimPoint(player,camera,out=new V3()){
 const r=aim(camera),t=raySolids(r.ray.origin,r.ray.direction,80);
 if(t<80)return out.copy(r.ray.origin).addScaledVector(r.ray.direction,t);
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
  if(d<q.r&&Math.abs(q.y-P.pos.y)<(q.dy??.9)&&(!q.aim||q.aim(aim(camera))))c.push({s:sc(q.x,q.z,d),label:q.label,allowHeld:q.allowHeld,act:()=>{if(!W.net?.request('interact',q))q.act(P);}});}
 for(const d of W.doors){const dist=Math.hypot(d.x-P.pos.x,d.z-P.pos.z);if(dist<2.2&&Math.abs(d.y-P.pos.y)<1)c.push({s:sc(d.x,d.z,dist)*1.1,label:d.open?TEXT.door.close:TEXT.door.open,act:()=>{if(W.net?.request('door',d))return;d.open=!d.open;d.dirS=null;d.av=0;sfx('door',{at:d,v:.6});}});}
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
