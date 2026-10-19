import { THREE, G, mesh, ps1 } from '../core/gfx.js';
import { DIFF } from '../config.js';
import { damp } from '../core/rng.js';

/* 3D-стрелка над персонажем: показывает на ближайшую миссию.
   Цвет — сложность миссии. Прячется, когда миссия рядом. */
export function createArrow(scene) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); scene.add(g);
  const mat = ps1(new THREE.MeshLambertMaterial({ color: 0x9be36b, emissive: 0x9be36b, emissiveIntensity: 0.55 }));
  const edge = ps1(new THREE.MeshBasicMaterial({ color: 0x17111f }));
  // плоская угловатая стрелка, остриём по +z
  const head = mesh(G.cone4, mat, 0, 0, 0.28, 0.32, 0.5, 0.12, inner); head.rotation.x = Math.PI / 2; head.rotation.y = Math.PI / 4;
  head.scale.set(0.32, 0.5, 0.32);
  mesh(G.box, mat, 0, 0, -0.12, 0.16, 0.08, 0.42, inner);
  const sh = mesh(G.cone4, edge, 0, -0.04, 0.27, 0.36, 0.54, 0.12, inner); sh.rotation.copy(head.rotation); sh.scale.set(0.36, 0.56, 0.36); sh.position.y = -0.05;
  g.visible = false;
  return { g, inner, mat, yaw: 0 };
}

export function updateArrow(a, p, missions, dt, t, show) {
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
  a.g.position.set(p.pos.x, p.pos.y + p.ch.d.top + 0.55 + Math.sin(t * 4) * 0.06, p.pos.z);
  a.g.rotation.y = a.yaw;
  // наклон вниз, если миссия ниже (например, спрыгнуть с крыши), вверх — если выше
  a.inner.rotation.x = -Math.max(-0.6, Math.min(0.6, (q.y - p.pos.y) / Math.max(bd, 1)));
  const c = DIFF[best.def.diff]; if (a.mat.color.getHex() !== c) { a.mat.color.setHex(c); a.mat.emissive.setHex(c); }
}
