import { keys, tapped } from '../core/input.js';
import { damp } from '../core/rng.js';
import { W } from '../world/state.js';
import { burst, puff } from '../world/particles.js';

/* Катание: скейт, офисное кресло, тележка, тачка.
   E рядом — сесть/встать, можно и просто запрыгнуть сверху.
   W/A/S/D — разгон и поворот относительно камеры, Пробел — спрыгнуть с прыжком.
   Врезался на большой скорости — вылетаешь и ненадолго оглушён. */
export function nearestRideable(p, r = 1.6) {
  let best = null, bd = r;
  for (const b of W.pushables) {
    if (!b.ride || b.rider) continue;
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
    if (!b.ride || b.rider) continue;
    const top = b.y + b.ride.seat;
    if (Math.hypot(b.x - p.pos.x, b.z - p.pos.z) < b.r + 0.15 && p.pos.y > top - 0.15 && p.pos.y < top + 0.6) { mount(p, b); return; }
  }
}
export function updateRide(p, dt, t, ix, iz, ctrl) {
  const b = p.ride, R = b.ride;
  const il = Math.hypot(ix, iz);
  if (ctrl && il > 0.1) {
    const want = Math.atan2(ix, iz);
    let d = want - b.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    b.heading += Math.max(-R.turn * dt, Math.min(R.turn * dt, d));
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
  if (sp > 3 && Math.random() < dt * 8) puff(b.x - fx * 0.4, b.y + 0.08, b.z - fz * 0.4, { size: 0.22, life: 0.35, vy: 0.1, opacity: 0.45, grow: 0.6 });
  p.pos.set(b.x, b.y + R.seat, b.z); p.vel.set(b.vx, 0, b.vz); p.onGround = true; p.speed = sp;
  p.root.rotation.y = b.heading; p.facing = b.heading;
  // врезался
  if (b.hitSpeed > 6) { const v = b.hitSpeed; dismount(p, false); p.vel.set(-fx * 3, 5, -fz * 3); p.stun = 0.9; burst(b.x, b.y + 0.6, b.z, 8, { size: 0.4, speed: 3 }); return 'crash'; }
  if (ctrl && tapped('Space')) { dismount(p, true); return 'jump'; }
  return null;
}
