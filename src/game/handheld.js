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
  if(radius<0.2){handPosition(a,out);offset.set(0,0.04,0.04).applyQuaternion(a.root.quaternion);return out.add(offset);}
  const d = a.ch.d, z = Math.max(d.holdZ + 0.12, d.holdZ * 0.5 + radius + 0.16);
  offset.set(0, d.holdY, z); a.root.updateMatrixWorld(true); return out.copy(offset).applyMatrix4(a.root.matrixWorld);
}
// Крупный план мини-игры: видим кисть выбранного скина на рукоятке инструмента.
export function toolHand(ctx, object, x=0, y=0, z=0) {
  if(!ctx?.character || ctx.bot)return;
  const h=ctx.character.handR.clone(true);h.position.set(x,y,z);h.rotation.set(0,0,0);h.scale.setScalar(0.85);object.add(h);
}
