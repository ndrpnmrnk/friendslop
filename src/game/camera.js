import { THREE, V3 } from '../core/gfx.js';
import { CONFIG } from '../config.js';
import { W } from '../world/state.js';
import { damp } from '../core/rng.js';

/* Камера сверху-сбоку с упреждением по движению. Миссии и кран задают свою позу (pose).
   Здания между камерой и целью, а также здание, в котором стоит игрок, становятся прозрачными. */
const off = new V3(...CONFIG.camera.offset), pos = new V3(), look = new V3(), tp = new V3(), tl = new V3();
const ray = new THREE.Ray(), hit = new V3(), dir = new V3();
export const cam = { pose: null };

export function updateCamera(camera, p, dt, snap) {
  let P, L;
  if (cam.pose) { P = cam.pose.p; L = cam.pose.l; }
  else {
    const la = CONFIG.camera.lookAhead, k = Math.min(1, p.speed / CONFIG.player.sprint);
    L = tl.set(p.pos.x + p.vel.x * la, p.pos.y + 0.9, p.pos.z + p.vel.z * la);
    P = tp.copy(off).multiplyScalar(1 + k * 0.08).add(L);
  }
  const f = snap ? 1 : damp(cam.pose ? 5 : 6, dt);
  pos.lerp(P, f); look.lerp(L, f);
  camera.position.copy(pos); camera.lookAt(look);

  // затухание зданий
  const target = cam.pose ? cam.pose.l : hit.set(p.pos.x, p.pos.y + 1.1, p.pos.z);
  dir.subVectors(target, camera.position); const dist = dir.length(); dir.normalize();
  ray.set(camera.position, dir);
  const tgt = target.clone();
  for (const o of W.occluders) {
    let block = false;
    const ins = o.inside;
    if (ins && tgt.x > ins.x0 && tgt.x < ins.x1 && tgt.z > ins.z0 && tgt.z < ins.z1 && tgt.y > ins.y0 && tgt.y < ins.y1) block = true;
    else for (const b of o.boxes) { const q = ray.intersectBox(b, hit); if (q && camera.position.distanceTo(q) < dist - 0.3) { block = true; break; } }
    const want = block ? 0.18 : 1;
    if (o.op === want) continue;
    o.op = Math.abs(o.op - want) < 0.02 ? want : o.op + (want - o.op) * Math.min(1, (dt || 0.016) * 10);
    const tr = o.op < 0.99;
    for (const m of o.mats) { m.opacity = o.op; if (m.transparent !== tr) { m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; } }
  }
}
