import { keys, tapped } from '../core/input.js';
import { damp } from '../core/rng.js';
import { W } from '../world/state.js';
import { burst, smoke } from '../world/particles.js';
import { pushOut, zoneAt, recordImpact,syncPushable } from '../world/physics.js';
import { actors, shove } from './actors.js';
import { sfx } from '../core/sfx.js';

/* Катание: скейт, офисное кресло — E рядом или запрыгнуть сверху.
   Тележка и тачка: ЛКМ/ПКМ — схватиться и толкать перед собой, разогнаться,
   E на ходу — запрыгнуть, дальше она катится по инерции, а ты только подруливаешь.
   W/A/S/D — разгон и поворот относительно камеры, Пробел — спрыгнуть с прыжком.
   Врезался на большой скорости — вылетаешь и ненадолго оглушён. */
export function nearestRideable(p, r = 1.6, coast = false) {
  let best = null, bd = r;
  for (const b of W.pushables) {
    if(b.dead||b.rider||b.grabbed||b.raceOwner&&b.raceOwner!==p)continue;
    if(b.dragOnly){if(!coast)continue;}else if(b.noRide||!b.ride||!!b.ride.coast!==coast)continue;
    const d = Math.hypot(b.x - p.pos.x, b.z - p.pos.z);
    if (d < bd && Math.abs(b.y - p.pos.y) < 1) { bd = d; best = b; }
  }
  return best;
}
export function mount(p, b) {
  if (p.held||b.noRide||b.raceOwner&&b.raceOwner!==p) return false;
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
  const q = { x: tx, z: tz };if(b.solid)b.solid.on=false;const hit=pushOut(q,b.r,b.y+.2,b.y+b.h);if(b.solid)b.solid.on=true;recordImpact(b,hit,Math.hypot(b.vx,b.vz));
  if (Math.hypot(q.x - tx, q.z - tz) > 0.35 || Math.abs(p.pos.y - b.y) > 0.6) { release(p, 0.3); return; }
  b.x = q.x; b.z = q.z; b.vx = p.vel.x; b.vz = p.vel.z; b.heading = f;
  b.mesh.rotation.y=f;syncPushable(b);
  const sp = Math.hypot(p.vel.x, p.vel.z);
  if (sp > 4 && Math.random() < dt * 6) smoke(b.x, b.y + 0.06, b.z, { dust: true });
}
// E на ходу: запрыгнуть в тележку, она получает скорость разбега
export function hopIn(p) {
  const b = p.grab; if (!b||b.noRide) return false;
  p.grab = null; b.grabbed = null;
  b.vx = p.vel.x * 1.12; b.vz = p.vel.z * 1.12;
  p.ride = b; b.rider = p; b.stopT = 0;
  burst(b.x, b.y + 0.3, b.z, 4, { size: 0.3, speed: 1.5, up: 1, g: 2, life: 0.4 });
  return true;
}
export function dismount(p, jump) {
  const b = p.ride; if (!b) return;
  p.ride = null; b.rider = null; b.trick = null; b.flip = 0; b.shuv = 0; p.root.rotation.x = 0; p.root.rotation.z = 0; p.rideKick = null; p.trickK = 0;
  // сходим вбок от доски/кресла, чтобы не встать обратно на неё; какое-то время сам не садишься
  const f = b.heading || 0, sx = Math.cos(f), sz = -Math.sin(f);
  p.pos.set(b.x + (jump ? 0 : sx * (b.r + 0.5)), b.y + (jump ? b.ride.seat + 0.05 : 0.05), b.z + (jump ? 0 : sz * (b.r + 0.5)));
  p.vel.set(b.vx * (jump ? 1 : 0.3), jump ? 7 : 0, b.vz * (jump ? 1 : 0.3));
  p.onGround = !jump; p.noMountT = 1.2; b.vx *= 0.5; b.vz *= 0.5;
}
// Автопосадка: приземлился сверху на то, на чём можно кататься
export function autoMount(p) {
  if (p.ride || p.held || p.onGround || p.vel.y >= 0 || p.noMountT > 0 || p.stun > 0) return;
  for (const b of W.pushables) {
    if (b.raceOwner&&b.raceOwner!==p||!b.ride || b.rider || b.ride.coast) continue;
    const top = b.y + b.ride.seat;
    if (Math.hypot(b.x - p.pos.x, b.z - p.pos.z) < b.r + 0.15 && p.pos.y > top - 0.15 && p.pos.y < top + 0.6) { mount(p, b); return; }
  }
}
const TRICKS = { skate: ['kickflip', 'shuvit', 'heelflip', 'tre'], scooter: ['tailwhip', 'barspin'] };
export function updateRide(p, dt, t, ix, iz, ctrl) {
  const b = p.ride, R = b.ride, board = b.kind === 'skate' || b.kind === 'scooter';
  const il = Math.hypot(ix, iz);
  const sp0 = Math.hypot(b.vx, b.vz);
  ctrl=ctrl&&!(p.daze>0)&&!(p.stun>0);
  if (ctrl && il > 0.1) {
    const want = Math.atan2(ix, iz);
    let d = want - b.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    // по инерции рулится тем слабее, чем медленнее едешь
    const turn = R.coast ? R.turn * Math.min(1, sp0 / 4) : R.turn;
    if (!R.coast || Math.abs(d) < 2.2) b.heading += Math.max(-turn * dt, Math.min(turn * dt, d));
    // разгоняемся, только если смотрим примерно туда, куда жмём
    let push = Math.max(0, Math.cos(d)) * R.acc * dt;
    // скейт и самокат: толчки ногой — разгон рывками, в момент толчка
    if (board && !b.air && push > 0 && sp0 < R.max * 0.92) { b.kickPh = (b.kickPh || 0) + dt / 0.7; const ph = b.kickPh % 1; p.rideKick = ph; push *= ph > 0.2 && ph < 0.55 ? 2.6 : 0.12; if (ph > 0.2 && ph - dt / 0.7 <= 0.2) sfx('step', { v: 0.6 }); }
    else p.rideKick = null;
    b.vx += Math.sin(b.heading) * push; b.vz += Math.cos(b.heading) * push;
  } else p.rideKick = null;
  // скорость по направлению движения, боковое скольжение гасится (кроме кресла — оно крутится)
  const fx = Math.sin(b.heading), fz = Math.cos(b.heading), fwd = b.vx * fx + b.vz * fz, side = -b.vx * fz + b.vz * fx;
  const drifting=b.kind==='kart'&&ctrl&&keys.Space&&sp0>5;
  b.drifting=drifting;if(b.skid>0){b.skid=Math.max(0,b.skid-dt);b.heading+=(b.spin||1.6)*dt;}else b.spin=0;
  const keep = drifting||b.skid>0?Math.exp(-dt*.55):b.kind === 'chair' ? 0.92 : Math.exp(-dt * 6);
  const mx = R.water && !zoneAt(b.x, b.z, b.y, 'water') ? 2 : R.max;
  let nf = Math.max(-mx * 0.4, Math.min(mx, fwd)), ns = side * keep;
  b.vx = fx * nf - fz * ns; b.vz = fz * nf + fx * ns;
  if (b.kind === 'chair') b.heading += side * dt * 0.8;
  const sp = Math.hypot(b.vx, b.vz);
  const vehicle=b.mesh.children.find(q=>q.userData.vehicle)?.userData.vehicle;if(vehicle){b.pedalPhase=(b.pedalPhase||0)+fwd*dt/.32;for(const w of vehicle.wheels)w.rotation.x+=sp*dt/.32;if(vehicle.pedals)vehicle.pedals.rotation.x=b.pedalPhase;p.cyclePhase=b.pedalPhase;p.cycleRig=vehicle;}
  if(drifting&&Math.random()<dt*18)smoke(b.x-fx*.6,b.y+.1,b.z-fz*.6,{color:0xc5bacd,size:.18,grow:.65,life:.8});
  if (sp > 3 && Math.random() < dt * 10) smoke(b.x - fx * 0.4, b.y + 0.1, b.z - fz * 0.4, { size: 0.1, grow: 0.35, life: 0.45, vy: 0.3, vx: -fx, vz: -fz });
  // тележка остановилась — сам спрыгиваешь
  if (R.coast) { b.stopT = sp < 0.7 ? (b.stopT || 0) + dt : 0; if (b.stopT > 0.4) { dismount(p, false); return 'stop'; } }
  // трюк в воздухе: доска крутится; приземлился, докрутив, — трюк засчитан, не докрутил — падаешь
  if (b.trick) { const tr = b.trick; tr.t += dt; const k = Math.min(1, tr.t / tr.dur), e = k * k * (3 - 2 * k); p.trickK = Math.sin(k * Math.PI);
    b.flip = tr.kind === 'kickflip' || tr.kind === 'tre' ? e * Math.PI * 2 : tr.kind === 'heelflip' ? -e * Math.PI * 2 : 0;
    b.shuv = tr.kind === 'shuvit' ? e * Math.PI : tr.kind === 'tre' || tr.kind === 'tailwhip' || tr.kind === 'barspin' ? e * Math.PI * 2 : 0;
    if (!b.air && tr.t > 0.12) { b.trick = null; b.flip = 0; b.shuv = 0; p.trickK = 0;
      if (k >= 0.8) { W.onTrick && W.onTrick(p, tr.kind); burst(b.x, b.y + 0.2, b.z, 8, { color: 0xf5c542, size: 0.12, speed: 2.5, up: 2 }); sfx('land', { v: 1.2 }); }
      else { dismount(p, false); p.vel.set(b.vx * 0.5, 4, b.vz * 0.5); p.onGround = false; p.stun = 0.7; p.noMountT = 2.5; sfx('hit'); return 'crash'; } } }
  p.pos.set(b.x, b.y + R.seat, b.z); p.vel.set(b.vx, 0, b.vz); p.onGround = true; p.speed = sp;
  p.root.rotation.order = 'YXZ'; p.root.rotation.y = b.heading; p.facing = b.heading; p.root.rotation.x = board ? -(b.pitch || 0) * 0.85 : 0;
  // наехал на кого-то — тот отлетает
  if (sp > 4) for (const o of actors()) { if (o === p || o.hidden || o.heldBy || o.ride) continue; if (Math.hypot(o.pos.x - b.x, o.pos.z - b.z) < b.r + 0.45 && Math.abs(o.pos.y - b.y) < 1.2 && !(o.diveHitT > 0)) { shove(o, b.vx, b.vz, sp * 0.8, 4, true); o.diveHitT = 0.6; sfx(b.kind === 'kidcar' ? 'honk' : 'hit', { at: o.pos }); } }
  // врезался
  if(b.kind==='kart'&&b.hitSpeed>8){b.skid=.85;b.spin=2.2;b.heading+=.5;b.vx-=fx*2;b.vz-=fz*2;p.daze=Math.max(p.daze||0,1);sfx('hit');}
  if (b.kind!=='kart'&&b.hitSpeed > 6) { const v = b.hitSpeed; dismount(p, false); p.vel.set(-fx * 3, 5, -fz * 3); p.onGround = false; p.stun = 0.9; p.noMountT = 2.5; burst(b.x, b.y + 0.6, b.z, 8, { size: 0.4, speed: 3 }); return 'crash'; }
  // скейт и самокат: пробел — прыжок (олли), слезть — E
  if (ctrl && b.kind!=='kart' && tapped('Space')) { if (board) { if (!b.air) { b.vy = 6.8; b.y += 0.05; b.air = true; sfx('jump'); const L = TRICKS[b.kind]; b.trick = { kind: L[(Math.random() * L.length) | 0], t: 0, dur: 0.48 }; } return null; } dismount(p, true); return 'jump'; }
  if (b.grind && Math.random() < dt * 30) burst(b.x, b.y + 0.05, b.z, 1, { color: 0xffd25c, size: 0.06, speed: 2, up: 1.5, g: 12, life: 0.3, grow: 0 });
  return null;
}
