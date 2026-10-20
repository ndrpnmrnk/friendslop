import { THREE, G, V3, col, mesh } from '../core/gfx.js';
import { W } from '../world/state.js';
import { burst, smokeRing } from '../world/particles.js';
import { actors, shove } from './actors.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';

/* Зиплайн: трос между крышами. E у верхнего конца — зацепиться и съехать (быстрее на крутом тросе),
   пробел — спрыгнуть раньше. Кто попался на пути — улетает. */
let pulley = null;
export function startZip(a, z) {
  a.zip = { z, s: 0.3, v: 2.5 }; a.vel.set(0, 0, 0); a.onGround = false; sfx('zip', { at: a.pos });
  if (!pulley || !pulley.parent) { pulley = mesh(G.box, col(0x2b2533), 0, 0, 0, 0.18, 0.22, 0.3, W.group); }
}
export function updateZip(a, dt, jump) {
  const q = a.zip, z = q.z;
  q.v = Math.min(17, q.v + 9.8 * z.slope * dt * 1.6 - q.v * 0.05 * dt);
  q.s += q.v * dt;
  const k = Math.min(1, q.s / z.len), x = z.a.x + (z.b.x - z.a.x) * k, y = z.a.y + (z.b.y - z.a.y) * k, zz = z.a.z + (z.b.z - z.a.z) * k;
  a.pos.set(x, y - 2.05, zz); a.vel.set(z.dx * q.v, 0, z.dz * q.v); a.airPeak = a.pos.y; a.root.rotation.y = a.facing = Math.atan2(z.dx, z.dz);
  if (pulley) { pulley.visible = true; pulley.position.set(x, y - 0.05, zz); pulley.rotation.y = a.facing; }
  if (Math.random() < dt * 8) sfx('zip', { at: a.pos, v: 0.4 });
  // сбить того, кто на пути
  for (const b of actors()) { if (b === a || b.hidden || b.heldBy) continue; if (Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 0.95 && Math.abs(b.pos.y - a.pos.y) < 1.4) { shove(b, z.dx, z.dz, Math.max(6, q.v * 0.8), 5, true); voice(b.ch, 'hurt', b.pos); sfx('hit', { at: b.pos }); } }
  if (k >= 1 || q.s > z.len - 0.4 || jump) {
    a.zip = null; a.vel.set(z.dx * q.v * 0.7, jump ? 6 : 3, z.dz * q.v * 0.7); if (pulley) pulley.visible = false;
    smokeRing(a.pos.x, a.pos.y + 1.6, a.pos.z, 5, { speed: 1.5 });
  }
}
// трос и столбы (вызывается из Builder.zipline)
export function addZipline(b, ax, ay, az, bx, by, bz) {
  const A = new V3(b.X(ax), b.Y + ay, b.Z(az)), B = new V3(b.X(bx), b.Y + by, b.Z(bz));
  const len = A.distanceTo(B), hz = Math.hypot(B.x - A.x, B.z - A.z), dk = col(0x2b2533);
  // столбы-стойки на обоих концах
  for (const [p, h] of [[A, 2.4], [B, 2.4]]) { b.m(G.cyl6, dk, p.x - b.ox, p.y - b.Y - h / 2, p.z - b.oz, 0.07, h, 0.07); b.m(G.box, dk, p.x - b.ox, p.y - b.Y, p.z - b.oz, 0.4, 0.08, 0.08); }
  const mid = A.clone().add(B).multiplyScalar(0.5), cable = mesh(G.box, col(0x17111f), mid.x, mid.y, mid.z, 0.035, 0.035, len, b.g);
  cable.lookAt(B); b.m(G.box, col(0xf5c542), ax, ay - 0.6, az, 0.5, 0.3, 0.04).rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
  const z = { a: A, b: B, len, slope: (A.y - B.y) / len, dx: (B.x - A.x) / hz, dz: (B.z - A.z) / hz };
  (W.ziplines || (W.ziplines = [])).push(z);
  W.interacts.push({ x: A.x - z.dx * 0.6, z: A.z - z.dz * 0.6, y: A.y - 2.4, r: 1.3, dy: 0.9, label: 'Зиплайн', enabled: P => !P.held && !P.holding, act: P => startZip(P, z) });
  return z;
}
void THREE; void burst;
