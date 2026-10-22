import {CONFIG} from '../config.js';
import { V3 } from '../core/gfx.js';
// У оборудования своя точка хвата на правой кисти, у груза - между двумя руками.
const offset = new V3();
export function handPosition(a, out = new V3()) {
  a.root.updateMatrixWorld(true);
  return a.ch.handR.getWorldPosition(out);
}
export function followHand(a, object, tilt = 0) {
  handPosition(a, object.position); object.rotation.set(tilt, a.root.rotation.y, 0, 'YXZ');
}
export function cargoPosition(a, out = new V3(), radius = 0.2) {
  if(radius<.2||(a.held&&!['missioncrate','mammothpants','parcel','pizza','chair','monitor','pc'].includes(a.held.type))){handPosition(a,out);offset.set(0,0.04,0.04).applyQuaternion(a.root.quaternion);out.add(offset);if(a.held?.type==='trash')out.y-=.27;return out;}
  const d = a.ch.d, z = Math.max(d.holdZ + 0.12, d.holdZ * 0.5 + radius + 0.16);
  offset.set(0, d.holdY, z); a.root.updateMatrixWorld(true); return out.copy(offset).applyMatrix4(a.root.matrixWorld);
}
// Крупный план мини-игры: видим кисть выбранного скина на рукоятке инструмента.
export function toolHand(ctx, object, x=0, y=0, z=0) {
  if(!ctx?.character || ctx.bot)return;
  const h=ctx.character.handR.clone(true);h.position.set(x,y,z);h.rotation.set(0,0,0);h.scale.setScalar(0.85);object.add(h);
}

export function poseMeleeItem(a,it){if(!['slipper','pillow','rake'].includes(it?.type))return;const u=a.swatT>0?Math.max(0,Math.min(1,1-a.swatT/CONFIG.melee.duration)):1;it.g.rotation.x=a.swatT>0?-.45+Math.sin(u*Math.PI)*1.1:0;it.g.rotation.z=a.swatT>0?-Math.sin(u*Math.PI)*.2:0;}
