import { random } from '../core/random.js';
import { keys, tapped } from '../core/input.js';
import { damp } from '../core/rng.js';
import { W } from '../world/state.js';
import { burst, smoke } from '../world/particles.js';
import { pushOut, zoneAt, recordImpact,syncPushable,constrainWaterRide } from '../world/physics.js';
import {isMotorCar,isCrashImpact,safeMountCandidate} from './vehicle-stability.js';
import { actors, shove } from './actors.js';
import { sfx } from '../core/sfx.js';

/* Катание: скейт, офисное кресло — E рядом или запрыгнуть сверху.
   Тележка и тачка: ЛКМ/ПКМ — схватиться и толкать перед собой, разогнаться,
   E на ходу — запрыгнуть, дальше она катится по инерции, а ты только подруливаешь.
   W/A/S/D — разгон и поворот относительно камеры, Пробел — спрыгнуть с прыжком.
   Врезался на большой скорости — вылетаешь и ненадолго оглушён. */
function recoverRideCollision(b){
  if(W.net&&!W.net.canSimulate(b))return true; // guest waits for host correction
  const corrected=safeMountCandidate({x:b.x,z:b.z},point=>{
    if(b.solid)b.solid.on=false;
    try{pushOut(point,b.r,b.y+.18,b.y+Math.max(b.h,.7));}
    finally{if(b.solid)b.solid.on=true;}
  });
  if(!corrected)return false;
  if(Math.hypot(corrected.x-b.x,corrected.z-b.z)>.015){
    b.x=corrected.x;b.z=corrected.z;syncPushable(b);
  }
  return true;
}
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
  if(!b?.ride||b.dead||p.ride||p.held||b.noRide||b.raceOwner&&b.raceOwner!==p)return false;
  if (b.rider && b.rider !== p || b.grabbed && b.grabbed !== p) return false;
  // Free a post-crash body from overlapping walls before mounting.
  // The authoritative host resolves position, guests await its correction.
  if(!recoverRideCollision(b))return false;
  W.net?.request('mount', b);
  p.ride=b;b.rider=p;b.heading=b.mesh.rotation.y;
  // Never replay an impact recorded on the previous rider.
  b.hitSpeed=0;b.impactSpeed=0;b.impactContact=false;b.mountGrace=.4;
  b.skid=0;b.spin=0;b.stopT=0;b.trick=null;b.flip=0;b.shuv=0;b.grind=null;b.grindPose=0;
  p.cyclePhase=b.pedalPhase||0;
  b.vx += p.vel.x * 0.6; b.vz += p.vel.z * 0.6;
  b.outline && b.outline.set(false);
  return true;
}
/* Толкание руками */
export function grab(p, b) { if (p.held || p.ride || b.rider || b.grabbed && b.grabbed!==p) return false; W.net?.request('cart', b); p.grab = b; b.grabbed = p; b.heading = p.root.rotation.y; b.outline && b.outline.set(false); return true; }
export function release(p, shove = 1) {
  const b = p.grab; if (!b) return; W.net?.request('release', b); p.grab = null; b.grabbed = null;
  b.vx = p.vel.x * shove; b.vz = p.vel.z * shove;
}
// тележка едет перед игроком; если упёрлась — игрок её отпускает
export function updateGrab(p, dt) {
  const b = p.grab; if (!b) return;
  const f = p.root.rotation.y, d = b.r + p.r + 0.12, tx = p.pos.x + Math.sin(f) * d, tz = p.pos.z + Math.cos(f) * d;
  const q = { x: tx, z: tz };if(b.solid)b.solid.on=false;const hit=pushOut(q,b.r,b.y+.2,b.y+b.h);if(b.solid)b.solid.on=true;recordImpact(b,hit,Math.hypot(b.vx,b.vz));
  if (Math.hypot(q.x - tx, q.z - tz) > 0.35 || Math.abs(p.pos.y - b.y) > 0.6) { release(p, 0.3); return; }
  const previous={x:b.x,z:b.z};b.x = q.x; b.z = q.z; b.vx = p.vel.x; b.vz = p.vel.z; b.heading = f;
  if(!constrainWaterRide(b,previous)){release(p,0);syncPushable(b);return;}
  b.mesh.rotation.y=f;syncPushable(b);
  const sp = Math.hypot(p.vel.x, p.vel.z);
  if (sp > 4 && random() < dt * 6) smoke(b.x, b.y + 0.06, b.z, { dust: true });
}
// E на ходу: запрыгнуть в тележку, она получает скорость разбега
export function hopIn(p) {
  const b = p.grab; if (!b||b.noRide||!b.ride||b.dead||!recoverRideCollision(b)) return false;
  p.grab = null; b.grabbed = null;
  b.vx = p.vel.x * 1.12; b.vz = p.vel.z * 1.12;
  p.ride = b; b.rider = p; b.stopT=0;b.hitSpeed=0;b.impactSpeed=0;b.impactContact=false;b.mountGrace=.4;b.skid=0;b.spin=0;
  burst(b.x, b.y + 0.3, b.z, 4, { size: 0.3, speed: 1.5, up: 1, g: 2, life: 0.4 });
  return true;
}
export function dismount(p, jump) {
  const b = p.ride; if (!b) return; W.net?.request('dismount', b, { jump: !!jump });
  p.ride = null; b.rider = null; b.trick = null; b.flip = 0; b.shuv = 0; p.root.rotation.x = 0; p.root.rotation.z = 0; p.rideKick = null; p.trickK = 0;
  b.grind=null;b.grindPose=0;b.grindSnd=0;b.grindCooldown=.6;
  b.lean = 0; b.steer = 0; b.mesh.rotation.z = 0;b.hitSpeed=0;b.impactSpeed=0;b.impactContact=false;b.mountGrace=0; { const u = b.mesh.children.find(q => q.userData.vehicle || q.userData.scoot)?.userData, v2 = u?.vehicle || u?.scoot; if (v2?.steerParts) for (const q of v2.steerParts) q.rotation.y = 0; }
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
// Network cleanup and broken/removed ride objects can otherwise leave p.ride stale.
// Never dereference ride.seat/ride.pose on an object whose ride component is gone.
export function clearInvalidRide(p) {
  const b=p?.ride;
  if(!b)return false;
  if(!b.dead&&b.ride&&b.mesh)return false;
  if(b.rider===p)b.rider=null;
  p.ride=null;p.rideKick=null;p.trickK=0;p.cycleRig=null;
  if(p.root?.rotation){p.root.rotation.x=0;p.root.rotation.z=0;}
  return true;
}
export function updateRide(p, dt, t, ix, iz, ctrl) {
  const b = p.ride, R = b.ride, board = b.kind === 'skate' || b.kind === 'scooter';
  b.mountGrace=Math.max(0,(b.mountGrace||0)-dt);
  const il = Math.hypot(ix, iz);
  const sp0 = Math.hypot(b.vx, b.vz);
  ctrl=ctrl&&!(p.daze>0)&&!(p.stun>0);
  /* v0.58: велосипед, скейт и самокат — понятное управление: W — разгон, S — тормоз (велосипед потом медленно
     сдаёт назад), A/D — руль. Раньше «поворачивался туда, куда жмёшь относительно камеры» — S разворачивал. */
  const classic = b.kind === 'bike' || board || isMotorCar(b.kind);
  const thr = ctrl ? ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0) : 0, st = ctrl ? ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0) : 0;
  if (b.grind) {
    // Fixed heading and momentum along the rail; no kick-step or steering
    // animation can fight the grind pose until the board leaves the rail.
    p.rideKick=null;
  } else if (classic) {
    const fwd0=b.vx*Math.sin(b.heading)+b.vz*Math.cos(b.heading),car=isMotorCar(b.kind);
    const factor=car?(.5+.5*Math.min(1,sp0/7)):(.35+.65*Math.min(1,sp0/4));
    const turn=R.turn*factor*(b.air?.3:1);
    if (st) b.heading -= st * turn * dt * (fwd0 < -0.2 ? -1 : 1);
    let push = 0;
    if (thr > 0 && !b.air) { push = R.acc * dt;
      if (board && sp0 < R.max * 0.92) { b.kickPh = (b.kickPh || 0) + dt / 0.7; const ph = b.kickPh % 1; p.rideKick = ph; push *= ph > 0.2 && ph < 0.55 ? 2.6 : 0.12; if (ph > 0.2 && ph - dt / 0.7 <= 0.2) sfx('step', { v: 0.6 }); } else p.rideKick = null; }
    else p.rideKick = null;
    if (thr < 0 && !b.air) { if (fwd0 > 0.3) { const k = Math.exp(-dt * (isMotorCar(b.kind)?5:3.2)); b.vx *= k; b.vz *= k; if (sp0 > 4 && random() < dt * 14) smoke(b.x, b.y + 0.08, b.z, { size: 0.12, grow: 0.4, life: 0.4, color: 0xc5bacd }); }
      else if (b.kind === 'bike'||isMotorCar(b.kind)) push = -R.acc * (isMotorCar(b.kind)?.45:.3) * dt; }
    b.vx += Math.sin(b.heading) * push; b.vz += Math.cos(b.heading) * push;
    b.steer = (b.steer || 0) + (st - (b.steer || 0)) * Math.min(1, dt * 9);
  } else if (ctrl && il > 0.1) {
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
  const drifting=isMotorCar(b.kind)&&ctrl&&keys.Space&&sp0>3.5;
  // v0.56: дрифт копит заряд — отпустил пробел после 0.8 с заноса, карт получает ускорение (искры: жёлтые → голубые)
  if(isMotorCar(b.kind)){if(drifting)b.driftT=(b.driftT||0)+dt;else{if((b.driftT||0)>.65){b.boostT=Math.max(b.boostT||0,b.driftT>1.5?1.4:.9);sfx('dash',{v:1.3});sfx('spring');}b.driftT=0;}
   if(b.boostT>0){b.boostT-=dt;b.vx+=Math.sin(b.heading)*R.acc*1.05*dt;b.vz+=Math.cos(b.heading)*R.acc*1.05*dt;if(random()<dt*30)burst(b.x-Math.sin(b.heading)*.8,b.y+.25,b.z-Math.cos(b.heading)*.8,1,{color:0xffb04a,size:.12,speed:1.5,up:.5,g:2,life:.3,grow:.4});}
   if(drifting&&b.driftT>.8&&random()<dt*24)burst(b.x-Math.sin(b.heading)*.7,b.y+.1,b.z-Math.cos(b.heading)*.7,1,{color:b.driftT>1.6?0x6ac8ff:0xffd27a,size:.06,speed:2.5,up:1.5,g:10,life:.3,grow:0});}
  // v0.60: разгон не только у карта (сушилка автомойки и т. п.)
  if(!isMotorCar(b.kind)&&b.boostT>0){b.boostT-=dt;b.vx+=Math.sin(b.heading)*Math.max(R.acc,8)*.9*dt;b.vz+=Math.cos(b.heading)*Math.max(R.acc,8)*.9*dt;}
  b.drifting=drifting;if(b.skid>0){b.skid=Math.max(0,b.skid-dt);b.heading+=(b.spin||1.6)*dt;}else b.spin=0;
  const keep = drifting||b.skid>0?Math.exp(-dt*1.05):b.kind === 'chair' ? 0.92 : Math.exp(-dt * (isMotorCar(b.kind)?5:6));
  const mx = (R.water && !zoneAt(b.x, b.z, b.y, 'water') ? 2 : R.max) * (b.boostT > 0 ? 1.4 : 1);
  let nf = Math.max(-mx * 0.4, Math.min(mx, fwd)), ns = side * keep;
  b.vx = fx * nf - fz * ns; b.vz = fz * nf + fx * ns;
  if (b.kind === 'chair') b.heading += side * dt * 0.8;
  const sp = Math.hypot(b.vx, b.vz);
  const vehicle=b.mesh.children.find(q=>q.userData.vehicle)?.userData.vehicle;if(vehicle){if(vehicle.pedals){b.pedalPhase=(b.pedalPhase||0)+fwd*dt/.32;vehicle.pedals.rotation.x=b.pedalPhase;p.cyclePhase=b.pedalPhase;p.cycleRig=vehicle;}for(const w of vehicle.wheels)w.rotation.x+=sp*dt/.32;}
  if(drifting&&random()<dt*18)smoke(b.x-fx*.6,b.y+.1,b.z-fz*.6,{color:0xc5bacd,size:.18,grow:.65,life:.8});
  if (sp > 3 && random() < dt * 10) smoke(b.x - fx * 0.4, b.y + 0.1, b.z - fz * 0.4, { size: 0.1, grow: 0.35, life: 0.45, vy: 0.3, vx: -fx, vz: -fz });
  // тележка остановилась — сам спрыгиваешь
  if (R.coast) { b.stopT = sp < 0.7 ? (b.stopT || 0) + dt : 0; if (b.stopT > 0.4) { dismount(p, false); return 'stop'; } }
  // трюк в воздухе: доска крутится; приземлился, докрутив, — трюк засчитан, не докрутил — падаешь
  if (b.trick && !b.grind) { const tr = b.trick; tr.t += dt; const k = Math.min(1, tr.t / tr.dur), e = k * k * (3 - 2 * k); p.trickK = Math.sin(k * Math.PI);
    b.flip = tr.kind === 'kickflip' || tr.kind === 'tre' ? e * Math.PI * 2 : tr.kind === 'heelflip' ? -e * Math.PI * 2 : 0;
    b.shuv = tr.kind === 'shuvit' ? e * Math.PI : tr.kind === 'tre' || tr.kind === 'tailwhip' || tr.kind === 'barspin' ? e * Math.PI * 2 : 0;
    if (!b.air && tr.t > 0.12) { b.trick = null; b.flip = 0; b.shuv = 0; p.trickK = 0;
      if (k >= 0.8) { W.onTrick && W.onTrick(p, tr.kind); burst(b.x, b.y + 0.2, b.z, 8, { color: 0xf5c542, size: 0.12, speed: 2.5, up: 2 }); sfx('land', { v: 1.2 }); }
      else { dismount(p, false); p.vel.set(b.vx * 0.5, 4, b.vz * 0.5); p.onGround = false; p.stun = 0.7; p.noMountT = 2.5; sfx('hit'); return 'crash'; } } }
  p.pos.set(b.x, b.y + R.seat, b.z); p.vel.set(b.vx, 0, b.vz); p.onGround = !b.air; p.speed = sp;
  // наклон в повороте: сильнее на скорости; руль и переднее колесо поворачиваются
  const leanMax = b.kind === 'bike' ? 0.34 : b.kind === 'skate' ? 0.24 : b.kind === 'scooter' ? 0.2 : 0, leanT = classic && !b.air ? (b.steer || 0) * leanMax * Math.min(1, sp / 5) : 0;
  b.lean = (b.lean || 0) + (leanT - (b.lean || 0)) * Math.min(1, dt * 7);
  if (classic) { const sv = (b.steer || 0) * (b.kind === 'skate' ? 0 : 0.42), veh = b.mesh.children.find(q => q.userData.vehicle || q.userData.scoot)?.userData; const v2 = veh?.vehicle || veh?.scoot;
    if (v2?.steerParts) for (const q of v2.steerParts) { q.rotation.order = 'YXZ'; q.rotation.y = -sv; } }
  b.grindPose=(b.grindPose||0)+((b.grind?1:0)-(b.grindPose||0))*Math.min(1,dt*11);
  p.root.rotation.order = 'YXZ'; p.root.rotation.y = b.heading; p.facing = b.heading;
  p.root.rotation.x = board ? -(b.pitch || 0)-b.grindPose*.07 : 0;
  p.root.rotation.z = (b.lean || 0) + (b.bowlBank || 0)+b.grindPose*.10;
  // наехал на кого-то — тот отлетает
  if (sp > 4) for (const o of actors()) { if (o === p || o.hidden || o.heldBy || o.ride) continue; if (Math.hypot(o.pos.x - b.x, o.pos.z - b.z) < b.r + 0.45 && Math.abs(o.pos.y - b.y) < 1.2 && !(o.diveHitT > 0)) { shove(o, b.vx, b.vz, sp * 0.8, 4, true); o.diveHitT = 0.6; sfx(b.kind === 'kidcar' ? 'honk' : 'hit', { at: o.pos }); } }
  // врезался
  if(isMotorCar(b.kind)&&isCrashImpact(b.hitSpeed,b.mountGrace,8)){b.skid=.85;b.spin=2.2;b.heading+=.5;b.vx-=fx*2;b.vz-=fz*2;p.daze=Math.max(p.daze||0,1);sfx('hit');}
  if (!isMotorCar(b.kind)&&isCrashImpact(b.hitSpeed,b.mountGrace,6)) { const v = b.hitSpeed; dismount(p, false); p.vel.set(-fx * 3, 5, -fz * 3); p.onGround = false; p.stun = 0.9; p.noMountT = 2.5; burst(b.x, b.y + 0.6, b.z, 8, { size: 0.4, speed: 3 }); return 'crash'; }
  // скейт и самокат: пробел — прыжок (олли), слезть — E
  if (ctrl && !isMotorCar(b.kind) && tapped('Space')) { if (board) { if (!b.air) { if(b.grind){b.grind=null;b.grindCooldown=.6;b.grindSnd=0;} b.vy = 6.8; b.y += 0.05; b.air = true; sfx('jump'); const L = TRICKS[b.kind]; b.trick = { kind: L[(random() * L.length) | 0], t: 0, dur: 0.48 }; } return null; } dismount(p, true); return 'jump'; }
  if (b.grind) { b.grindSnd = (b.grindSnd || 0) - dt; if (b.grindSnd <= 0) { b.grindSnd = .30; sfx('grind', { at: { x: b.x, y: b.y, z: b.z }, v: Math.min(1, Math.hypot(b.vx, b.vz) / 8) }); } }
  if (b.grind && random() < dt * 14) burst(b.x, b.y + 0.05, b.z, 1, { color: 0xffd25c, size: 0.06, speed: 2, up: 1.5, g: 12, life: 0.3, grow: 0 });
  return null;
}
