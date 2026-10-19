import { THREE } from '../core/gfx.js';
import { DIFF } from '../config.js';
import { damp } from '../core/rng.js';

/* Указатель на ближайшую миссию: маленький светлый шеврон, который ходит по кругу
   у ног персонажа, как стрелка компаса. Цвет — сложность миссии. Не закрывает обзор. */
export function createArrow(scene) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.32); shape.lineTo(0.26, -0.06); shape.lineTo(0.13, -0.06); shape.lineTo(0, 0.13); shape.lineTo(-0.13, -0.06); shape.lineTo(-0.26, -0.06); shape.closePath();
  const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI); // остриём по +z, лежит на земле
  const mat = new THREE.MeshBasicMaterial({ color: 0x9be36b, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 });
  const g = new THREE.Group(), chev = new THREE.Mesh(geo, mat); chev.position.z = 0.95; chev.scale.setScalar(0.65); g.add(chev); scene.add(g);
  g.visible = false;
  return { g, chev, mat, yaw: 0 };
}

export function updateArrow(a, p, missions, dt, t, show, force = null) {
  if (force) {
    // идёт уличная миссия: стрелка показывает её цель
    const d = Math.hypot(force.x - p.pos.x, force.z - p.pos.z); a.g.visible = show && d > 2.5; if (!a.g.visible) return;
    const want = Math.atan2(force.x - p.pos.x, force.z - p.pos.z); let dd = want - a.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); a.yaw += dd * damp(10, dt);
    a.g.position.set(p.pos.x, p.pos.y + 0.06, p.pos.z); a.g.rotation.y = a.yaw; a.chev.position.z = 0.95 + Math.sin(t * 6) * 0.07; a.mat.opacity = 0.5; a.mat.color.setHex(0x9be36b); return;
  }
  let best = null, bd = Infinity;
  for (const m of missions) {
    if (m.busy) continue;
    const q = m.obj.pos(), d = Math.hypot(q.x - p.pos.x, q.z - p.pos.z);
    if (d < bd) { bd = d; best = m; }
  }
  const vis = show && best && bd > 3.5;
  a.g.visible = !!vis;
  if (!vis) return;
  const q = best.obj.pos(), want = Math.atan2(q.x - p.pos.x, q.z - p.pos.z);
  let d = want - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += d * damp(10, dt);
  a.g.position.set(p.pos.x, p.pos.y + 0.06, p.pos.z);
  a.g.rotation.y = a.yaw;
  a.chev.position.z = 0.95 + Math.sin(t * 4) * 0.05;
  a.mat.opacity = 0.32 + Math.sin(t * 4) * 0.08;
  const c = DIFF[best.def.diff]; if (a.mat.color.getHex() !== c) a.mat.color.setHex(c);
}
