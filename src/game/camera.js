import { THREE, V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { clamp, damp } from '../core/rng.js';

/* Камера от третьего лица: стоит сзади-сверху персонажа, мышь вращает её вокруг него
   (по горизонтали — свободно, по вертикали — в пределах). Если между персонажем и камерой
   стена, камера подъезжает ближе. Здание, в котором стоит игрок, и то, что закрывает его,
   становятся прозрачными. Миссии и кран задают свою позу (cam.pose). */
export const cam = { pose: null, yaw: 0, pitch: 0.5, dist: 8.5, curDist: 8.5, sens: 0.0026 };
const pos = new V3(), look = new V3(), tgt = new V3(), want = new V3(), dir = new V3(), hit = new V3();
const ray = new THREE.Ray();

export function resetCamera(yaw) { cam.yaw = yaw; cam.pitch = 0.5; cam.curDist = cam.dist; }
export function camForward() { return [-Math.sin(cam.yaw), -Math.cos(cam.yaw)]; }

// Пересечение луча с твёрдыми объектами (для «отъезда» камеры от стен)
function castSolids(o, d, maxT) {
  let best = maxT;
  for (const s of W.solids) {
    if (!s.on || s.y1 - s.y0 < 1.2) continue;
    let t0 = 0, t1 = best;
    const mins = [s.x0, s.y0, s.z0], maxs = [s.x1, s.y1, s.z1], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
    let ok = true;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(dd[a]) < 1e-6) { if (oo[a] < mins[a] || oo[a] > maxs[a]) { ok = false; break; } continue; }
      let ta = (mins[a] - oo[a]) / dd[a], tb = (maxs[a] - oo[a]) / dd[a]; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 > 0.05 && t0 < best) best = t0;
  }
  return best;
}

export function updateCamera(camera, p, dt, snap, lookDelta) {
  if (lookDelta && !cam.pose) {
    cam.yaw -= lookDelta.dx * cam.sens;
    cam.pitch = clamp(cam.pitch + lookDelta.dy * cam.sens, 0.08, 1.15);
  }
  let P, L;
  if (cam.pose) { P = cam.pose.p; L = cam.pose.l; }
  else {
    tgt.set(p.pos.x, p.pos.y + 1.9, p.pos.z);
    dir.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
    const free = castSolids(tgt, dir, cam.dist);
    const d = Math.max(1.4, free - 0.35);
    cam.curDist = d < cam.curDist ? d : cam.curDist + (d - cam.curDist) * damp(4, dt);
    want.copy(tgt).addScaledVector(dir, cam.curDist);
    P = want; L = tgt;
  }
  if (snap) { pos.copy(P); look.copy(L); }
  else if (cam.pose) { const f = damp(5, dt); pos.lerp(P, f); look.lerp(L, f); }
  else { const f = damp(18, dt); pos.lerp(P, f); look.lerp(L, f); }
  camera.position.copy(pos); camera.lookAt(look);

  // затухание зданий
  const target = cam.pose ? cam.pose.l : hit.set(p.pos.x, p.pos.y + 1.1, p.pos.z).clone();
  const rd = new V3().subVectors(target, camera.position), dist = rd.length(); rd.normalize();
  ray.set(camera.position, rd);
  const hp = new V3();
  for (const o of W.occluders) {
    let block = false;
    const ins = o.inside;
    if (ins && target.x > ins.x0 && target.x < ins.x1 && target.z > ins.z0 && target.z < ins.z1 && target.y > ins.y0 && target.y < ins.y1) block = true;
    else for (const b of o.boxes) { const q = ray.intersectBox(b, hp); if (q && camera.position.distanceTo(q) < dist - 0.3) { block = true; break; } }
    const w2 = block ? 0.18 : 1;
    if (o.op === w2) continue;
    o.op = Math.abs(o.op - w2) < 0.02 ? w2 : o.op + (w2 - o.op) * Math.min(1, (dt || 0.016) * 10);
    const tr = o.op < 0.99;
    for (const m of o.mats) { m.opacity = o.op; if (m.transparent !== tr) { m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; } }
  }
}
