import { THREE, V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { clamp, damp } from '../core/rng.js';
import { CONFIG } from '../config.js';

/* Камера из-за плеча. В тесных местах проверяем весь объём камеры, включая ближнюю
   плоскость: стены, полы и потолки одинаково мешают движению. Поза мини-игры фиксирована,
   а обычная камера плавно следует за игроком без автоматического поворота. */
export const cam = { pose: null, yaw: 0, pitch: 0.45, curDist: 6, sens: 0.0024, aimK: 0, idle: 0,
  normal: { dist: 6.4, shoulder: 1.15, height: 2.05 }, aim: { dist: 3.5, shoulder: 1.15, height: 2.1 } };
const pos = new V3(), look = new V3(), tgt = new V3(), want = new V3(), dir = new V3(), hit = new V3(), piv = new V3(), sh = new V3(), eye = new V3(), pv = new V3(), delta = new V3();
const ray = new THREE.Ray();
let following = false, orbitPitch = 0.45, orbitYaw = 0;

export function resetCamera(yaw) { cam.yaw = orbitYaw = yaw; cam.pitch = orbitPitch = 0.45; cam.curDist = cam.normal.dist; cam.aimK = 0; cam.blend = 1; following = false; }
export function camForward() { return [-Math.sin(cam.yaw), -Math.cos(cam.yaw)]; }

// Луч по расширенным AABB = движение камеры с запасом по всем трём осям.
// Нет минимального отступа 1.2 м: он проталкивал камеру за ближайшую стену.
export function castCamera(o, d, maxT, radius, ignore = null) {
  let best = maxT;
  for (const s of W.solids) {
    if (!s.on || s === ignore) continue;
    let t0 = 0, t1 = best;
    const mins = [s.x0 - radius, s.y0 - radius, s.z0 - radius], maxs = [s.x1 + radius, s.y1 + radius, s.z1 + radius], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
    let ok = true;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(dd[a]) < 1e-6) { if (oo[a] < mins[a] || oo[a] > maxs[a]) { ok = false; break; } continue; }
      let ta = (mins[a] - oo[a]) / dd[a], tb = (maxs[a] - oo[a]) / dd[a]; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; }
    }
    if (ok && t1 >= 0 && t0 < best) best = Math.max(0, t0 - 0.01);
  }
  return best;
}
function constrain(from, to, radius, ignore) {
  delta.subVectors(to, from); const len = delta.length();
  if (len > 1e-6) to.copy(from).addScaledVector(delta.multiplyScalar(1 / len), castCamera(from, delta, len, radius, ignore));
  return to;
}

export function updateCamera(camera, p, dt, snap, lookDelta, aiming) {
  // Для фиксированной позы оставляем запас под расширенный обзор в маленькой комнате.
  const clearanceFov = cam.pose ? 105 : camera.fov;
  const radius = Math.max(0.2, camera.near * Math.hypot(1, Math.tan(clearanceFov * Math.PI / 360) * Math.hypot(camera.aspect, 1)) + 0.02);
  if (lookDelta && !cam.pose) {
    cam.yaw -= lookDelta.dx * cam.sens * (aiming ? 0.7 : 1);
    cam.pitch = clamp(cam.pitch + lookDelta.dy * cam.sens * (aiming ? 0.7 : 1), -0.15, 1.48);
  }
  let P, L;
  if (cam.pose) {
    P = constrain(cam.pose.l, want.copy(cam.pose.p), radius, cam.pose.ignore); L = cam.pose.l;
  }
  else {
    cam.aimK += ((aiming ? 1 : 0) - cam.aimK) * damp(9, dt);
    const k = cam.aimK, N = cam.normal, A = cam.aim;
    if (snap) { orbitPitch = cam.pitch; orbitYaw = cam.yaw; }
    else { orbitPitch += (cam.pitch - orbitPitch) * damp(22, dt); orbitYaw += (cam.yaw - orbitYaw) * damp(22, dt); }
    const dist = N.dist + (A.dist - N.dist) * k, shoulder = (N.shoulder + (A.shoulder - N.shoulder) * k) * Math.cos(Math.max(0, orbitPitch));
    const height = Math.min(N.height + (A.height - N.height) * k, p.h + 0.25);
    // Сначала безопасная точка над игроком; присед и низкие потолки опускают её.
    eye.set(p.pos.x, p.pos.y + Math.min(1.35, p.h * 0.72), p.pos.z);
    tgt.set(p.pos.x, p.pos.y + height, p.pos.z); constrain(eye, tgt, radius);
    if (snap || !following) { piv.copy(tgt); following = true; } else piv.lerp(tgt, damp(14, dt));
    constrain(eye, piv, radius); // сглаживание тоже не может пересечь стену/перекрытие
    dir.set(Math.sin(orbitYaw) * Math.cos(orbitPitch), Math.sin(orbitPitch), Math.cos(orbitYaw) * Math.cos(orbitPitch));
    sh.set(Math.cos(orbitYaw), 0, -Math.sin(orbitYaw));
    pv.copy(piv).addScaledVector(sh, castCamera(piv, sh, shoulder, radius));
    const d = castCamera(pv, dir, dist, radius);
    cam.curDist = d < cam.curDist ? d : cam.curDist + (d - cam.curDist) * damp(4, dt);
    want.copy(pv).addScaledVector(dir, cam.curDist); constrain(eye, want, radius);
    // точка взгляда — далеко вперёд по направлению камеры, чтобы прицел смотрел туда, куда смотришь
    P = want; L = tgt.copy(want).addScaledVector(dir, -20);
  }
  // Если стена придвинула камеру, сохраняем размер игровой области в кадре.
  const baseFov = CONFIG.camera.fov;
  const fov = cam.pose
    ? Math.min(105, Math.atan(Math.tan(baseFov * Math.PI / 360) * cam.pose.p.distanceTo(L) / Math.max(0.1, P.distanceTo(L))) * 360 / Math.PI)
    : snap ? baseFov : camera.fov + (baseFov - camera.fov) * damp(10, dt);
  if (Math.abs(camera.fov - fov) > 0.001) { camera.fov = fov; camera.updateProjectionMatrix(); }
  // после миссии/крана камера плавно возвращается, дальше следует напрямую (сглаживание уже в piv)
  if (cam.pose) cam.blend = 0; else cam.blend = Math.min(1, (cam.blend ?? 1) + dt * 1.5);
  if (snap || cam.pose || cam.blend >= 1) { pos.copy(P); look.copy(L); }
  else { const f = damp(6, dt); pos.lerp(P, f); look.lerp(L, f); constrain(eye, pos, radius); }
  camera.position.copy(pos); camera.lookAt(look);

  // затухание зданий
  const target = cam.pose ? cam.pose.l : hit.set(p.pos.x, p.pos.y + 1.1, p.pos.z).clone();
  const rd = new V3().subVectors(target, camera.position), dist = rd.length(); rd.normalize();
  ray.set(camera.position, rd);
  const hp = new V3();
  for (const o of W.occluders) {
    if (o.inside) continue; // здания не просвечиваем: камера сама заходит внутрь
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
