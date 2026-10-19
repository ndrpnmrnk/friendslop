import { THREE, V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { clamp, damp } from '../core/rng.js';

/* Камера от третьего лица: стоит сзади-сверху персонажа, мышь вращает её вокруг него
   (по горизонтали — свободно, по вертикали — в пределах). Если между персонажем и камерой
   стена, камера подъезжает ближе. Здание, в котором стоит игрок, и то, что закрывает его,
   становятся прозрачными. Миссии и кран задают свою позу (cam.pose). */
/* Камера «из-за плеча»: персонаж слева от центра, прицел в центре свободен.
   Пока зажата ПКМ (бросок), камера подъезжает к плечу и чуть выше — видно предмет и траекторию.
   Камера мягко догоняет персонажа и сама плавно встаёт за спину при беге, если мышь не трогали. */
export const cam = { pose: null, yaw: 0, pitch: 0.45, curDist: 6, sens: 0.0024, aimK: 0, idle: 0,
  normal: { dist: 6.2, shoulder: 0.85, height: 1.75 }, aim: { dist: 3.4, shoulder: 0.95, height: 1.85 } };
const pos = new V3(), look = new V3(), tgt = new V3(), want = new V3(), dir = new V3(), hit = new V3(), piv = new V3(), sh = new V3();
const ray = new THREE.Ray();

export function resetCamera(yaw) { cam.yaw = yaw; cam.pitch = 0.45; cam.curDist = cam.normal.dist; cam.aimK = 0; piv.set(0, 0, 0); }
export function camForward() { return [-Math.sin(cam.yaw), -Math.cos(cam.yaw)]; }

// Пересечение луча с твёрдыми объектами (камера не уходит в стены)
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

export function updateCamera(camera, p, dt, snap, lookDelta, aiming) {
  const moved = lookDelta && (lookDelta.dx || lookDelta.dy);
  if (lookDelta && !cam.pose) {
    cam.yaw -= lookDelta.dx * cam.sens * (aiming ? 0.7 : 1);
    cam.pitch = clamp(cam.pitch + lookDelta.dy * cam.sens * (aiming ? 0.7 : 1), -0.15, 1.1);
  }
  let P, L;
  if (cam.pose) { P = cam.pose.p; L = cam.pose.l; }
  else {
    // автодоводка за спину на бегу, если мышь не трогали
    cam.idle = moved ? 0 : cam.idle + dt;
    if (!aiming && cam.idle > 1.2 && p.speed > 2) {
      const behind = Math.atan2(-p.vel.x, -p.vel.z);
      let d = behind - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 1.9) cam.yaw += d * damp(1.2, dt);
    }
    cam.aimK += ((aiming ? 1 : 0) - cam.aimK) * damp(9, dt);
    const k = cam.aimK, N = cam.normal, A = cam.aim;
    const dist = N.dist + (A.dist - N.dist) * k, shoulder = N.shoulder + (A.shoulder - N.shoulder) * k, height = N.height + (A.height - N.height) * k;
    // мягкое следование за персонажем
    tgt.set(p.pos.x, p.pos.y + height, p.pos.z);
    if (snap || piv.lengthSq() === 0) piv.copy(tgt); else piv.lerp(tgt, damp(14, dt));
    dir.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
    sh.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)).multiplyScalar(shoulder); // вправо от взгляда
    const head = hit.copy(piv);
    const free = Math.min(castSolids(head, sh.clone().normalize(), shoulder) - 0.2, shoulder);
    const pv = head.clone().addScaledVector(sh.clone().normalize(), Math.max(0, free));
    const room = castSolids(pv, dir, dist);
    const d = Math.max(1.2, room - 0.3);
    cam.curDist = d < cam.curDist ? d : cam.curDist + (d - cam.curDist) * damp(4, dt);
    want.copy(pv).addScaledVector(dir, cam.curDist);
    // точка взгляда — далеко вперёд по направлению камеры, чтобы прицел смотрел туда, куда смотришь
    P = want; L = look.clone().copy(pv).addScaledVector(dir, -20);
  }
  // после миссии/крана камера плавно возвращается, дальше следует напрямую (сглаживание уже в piv)
  if (cam.pose) cam.blend = 0; else cam.blend = Math.min(1, (cam.blend ?? 1) + dt * 1.5);
  if (snap || (!cam.pose && cam.blend >= 1)) { pos.copy(P); look.copy(L); }
  else { const f = damp(cam.pose ? 5 : 6, dt); pos.lerp(P, f); look.lerp(L, f); }
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
