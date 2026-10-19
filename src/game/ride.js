import { keys, tapped } from '../core/input.js';
import { damp } from '../core/rng.js';
import { W } from '../world/state.js';
import { burst, smoke } from '../world/particles.js';
import { pushOut } from '../world/physics.js';

/* Катание: скейт, офисное кресло — E рядом или запрыгнуть сверху.
   Тележка и тачка: ЛКМ/ПКМ — схватиться и толкать перед собой, разогнаться,
   E на ходу — запрыгнуть, дальше она катится по инерции, а ты только подруливаешь.
   W/A/S/D — разгон и поворот относительно камеры, Пробел — спрыгнуть с прыжком.
   Врезался на большой скорости — вылетаешь и ненадолго оглушён. */
export function nearestRideable(p, r = 1.6, coast = false) {
  let best = null, bd = r;
  for (const b of W.pushables) {
    if (!b.ride || b.rider || b.grabbed || !!b.ride.coast !== coast) continue;
    const d = Math.hypot(b.x - p.pos.x, b.z - p.pos.z);
    if (d < bd && Math.abs(b.y - p.pos.y) < 1) { bd = d; best = b; }
  }
  return best;
}
export function mount(p, b) {
  if (p.held) return false;
  p.ride = b; b.rider = p; b.heading = b.mesh.rotation.y;
  b.vx += p.vel.x * 0.6; b.vz += p.vel.z * 0.6;
  b.outline && b.outline.set(false);
  return true;
}
/* Толкание руками */
export function grab(p, b) { if (p.held || p.ride) return false; p.grab = b; b.grabbed = p; b.heading = p.root.rotation.y; b.outline && b.outline.set(false); return true; }
export function release(p, shove = 1) {
  const b = p.grab; if (!b) return; p.grab = null; b.grabbed = null;
  b.vx = p.vel.x * shove; b.vz = p.vel.z * shove;
}
// тележка едет перед игроком; если упёрлась — игрок её отпускает
export function updateGrab(p, dt) {
  const b = p.grab; if (!b) return;
  const f = p.root.rotation.y, d = b.r + p.r + 0.12, tx = p.pos.x + Math.sin(f) * d, tz = p.pos.z + Math.cos(f) * d;
  const q = { x: tx, z: tz }; pushOut(q, b.r, b.y + 0.2, b.y + 1);
  if (Math.hypot(q.x - tx, q.z - tz) > 0.35 || Math.abs(p.pos.y - b.y) > 0.6) { release(p, 0.3); return; }
  b.x = q.x; b.z = q.z; b.vx = p.vel.x; b.vz = p.vel.z; b.heading = f;
  b.mesh.position.set(b.x, b.y, b.z); b.mesh.rotation.y = f;
  const sp = Math.hypot(p.vel.x, p.vel.z);
  if (sp > 4 && Math.random() < dt * 6) smoke(b.x, b.y + 0.06, b.z, { dust: true });
}
// E на ходу: запрыгнуть в тележку, она получает скорость разбега
export function hopIn(p) {
  const b = p.grab; if (!b) return false;
  p.grab = null; b.grabbed = null;
  b.vx = p.vel.x * 1.12; b.vz = p.vel.z * 1.12;
  p.ride = b; b.rider = p; b.stopT = 0;
  burst(b.x, b.y + 0.3, b.z, 4, { size: 0.3, speed: 1.5, up: 1, g: 2, life: 0.4 });
  return true;
}
export function dismount(p, jump) {
  const b = p.ride; if (!b) return;
  p.ride = null; b.rider = null;
  p.pos.set(b.x, b.y + b.ride.seat + 0.05, b.z);
  p.vel.set(b.vx, jump ? 7 : 2, b.vz);
  p.onGround = false;
}
// Автопосадка: приземлился сверху на то, на чём можно кататься
export function autoMount(p) {
  if (p.ride || p.held || p.onGround || p.vel.y >= 0) return;
  for (const b of W.pushables) {
    if (!b.ride || b.rider || b.ride.coast) continue;
    const top = b.y + b.ride.seat;
    if (Math.hypot(b.x - p.pos.x, b.z - p.pos.z) < b.r + 0.15 && p.pos.y > top - 0.15 && p.pos.y < top + 0.6) { mount(p, b); return; }
  }
}
export function updateRide(p, dt, t, ix, iz, ctrl) {
  const b = p.ride, R = b.ride;
  const il = Math.hypot(ix, iz);
  const sp0 = Math.hypot(b.vx, b.vz);
  if (ctrl && il > 0.1) {
    const want = Math.atan2(ix, iz);
    let d = want - b.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    // по инерции рулится тем слабее, чем медленнее едешь
    const turn = R.coast ? R.turn * Math.min(1, sp0 / 4) : R.turn;
    if (!R.coast || Math.abs(d) < 2.2) b.heading += Math.max(-turn * dt, Math.min(turn * dt, d));
    // разгоняемся, только если смотрим примерно туда, куда жмём
    const push = Math.max(0, Math.cos(d)) * R.acc * dt;
    b.vx += Math.sin(b.heading) * push; b.vz += Math.cos(b.heading) * push;
  }
  // скорость по направлению движения, боковое скольжение гасится (кроме кресла — оно крутится)
  const fx = Math.sin(b.heading), fz = Math.cos(b.heading), fwd = b.vx * fx + b.vz * fz, side = -b.vx * fz + b.vz * fx;
  const keep = b.kind === 'chair' ? 0.92 : Math.exp(-dt * 6);
  let nf = Math.max(-R.max * 0.4, Math.min(R.max, fwd)), ns = side * keep;
  b.vx = fx * nf - fz * ns; b.vz = fz * nf + fx * ns;
  if (b.kind === 'chair') b.heading += side * dt * 0.8;
  const sp = Math.hypot(b.vx, b.vz);
  if (sp > 3 && Math.random() < dt * 10) smoke(b.x - fx * 0.4, b.y + 0.1, b.z - fz * 0.4, { size: 0.1, grow: 0.35, life: 0.45, vy: 0.3, vx: -fx, vz: -fz });
  // тележка остановилась — сам спрыгиваешь
  if (R.coast) { b.stopT = sp < 0.7 ? (b.stopT || 0) + dt : 0; if (b.stopT > 0.4) { dismount(p, false); return 'stop'; } }
  p.pos.set(b.x, b.y + R.seat, b.z); p.vel.set(b.vx, 0, b.vz); p.onGround = true; p.speed = sp;
  p.root.rotation.y = b.heading; p.facing = b.heading;
  // врезался
  if (b.hitSpeed > 6) { const v = b.hitSpeed; dismount(p, false); p.vel.set(-fx * 3, 5, -fz * 3); p.stun = 0.9; burst(b.x, b.y + 0.6, b.z, 8, { size: 0.4, speed: 3 }); return 'crash'; }
  if (ctrl && tapped('Space')) { dismount(p, true); return 'jump'; }
  return null;
}
