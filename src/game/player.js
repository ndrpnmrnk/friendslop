import { V3 } from '../core/gfx.js';
import { CONFIG } from '../config.js';
import { keys, tapped } from '../core/input.js';
import { clamp, damp } from '../core/rng.js';
import { W } from '../world/state.js';
import { moveBody, zoneAt, bumpPushables } from '../world/physics.js';
import { puff, burst } from '../world/particles.js';
import { makeCharacter } from '../characters/rig.js';
import { updateRide, autoMount } from './ride.js';

const PC = CONFIG.player;
export function createPlayer(skin) {
  const ch = makeCharacter(skin);
  return {
    ch, root: ch.root, pos: ch.root.position, vel: new V3(), push: new V3(),
    r: PC.radius, h: PC.height, step: PC.step, onGround: true, landed: false,
    stamina: 1, stDelay: 0, exhausted: false, sprinting: false, speed: 0,
    stun: 0, airPeak: 0, climb: null, held: null, charge: 0, charging: false,
    smokeT: 0, facing: 0, frozen: false, splashT: 0, boost: 0, throwT: 0, accel: 0, lastSpd: 0,
    crouch: false, slideT: 0, slideDir: [0, 1], dive: null, rollT: 0, diveCD: 0,
  };
}

export function updatePlayer(p, dt, t, canMove, yaw = 0) {
  const ctrl = canMove && p.stun <= 0 && !p.frozen;
  let ix = 0, iz = 0;
  if (ctrl) {
    if (keys.KeyA || keys.ArrowLeft) ix--; if (keys.KeyD || keys.ArrowRight) ix++;
    if (keys.KeyW || keys.ArrowUp) iz--; if (keys.KeyS || keys.ArrowDown) iz++;
  }
  // ввод относительно камеры: W — от камеры вперёд
  { const sx = ix, sz = iz, s = Math.sin(yaw), c = Math.cos(yaw); ix = sx * c + sz * s; iz = -sx * s + sz * c; }
  const il = Math.hypot(ix, iz); if (il) { ix /= il; iz /= il; }
  if (p.ride) {
    const pose = p.ride.ride.pose;
    updateRide(p, dt, t, ix, iz, ctrl);
    if (p.ride) {
      p.stamina = Math.min(1, p.stamina + PC.stamina.regen * dt);
      p.ch.animate(dt, { t, speed: 0, ride: pose, rideSpeed: p.speed, hold: false });
      return;
    }
  }
  // присед / подкат / выпад
  const curSp = Math.hypot(p.vel.x, p.vel.z);
  p.diveCD -= dt;
  if (ctrl && tapped('KeyC') && p.onGround && curSp > PC.walk + 1 && !p.climb && !p.dive) {
    p.slideT = PC.slideTime; p.slideDir = [p.vel.x / curSp, p.vel.z / curSp]; p.slideV = Math.max(curSp, PC.slideSpeed);
    burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 6, { size: 0.35, speed: 2, up: 0.4, g: 0, grow: 1.2, life: 0.5 });
  }
  if (ctrl && tapped('KeyQ') && !p.dive && p.diveCD <= 0 && !p.climb && p.slideT <= 0) {
    const f = p.root.rotation.y; p.dive = 'air'; p.diveCD = PC.diveCooldown;
    p.vel.x = Math.sin(f) * PC.diveSpeed + p.vel.x * 0.2; p.vel.z = Math.cos(f) * PC.diveSpeed + p.vel.z * 0.2;
    p.vel.y = p.onGround ? PC.diveUp : Math.max(p.vel.y, 2); p.onGround = false; p.airPeak = p.pos.y;
  }
  const lowCeil = W.solids.some(s => s.on && p.pos.x + 0.3 > s.x0 && p.pos.x - 0.3 < s.x1 && p.pos.z + 0.3 > s.z0 && p.pos.z - 0.3 < s.z1 && s.y0 >= p.pos.y + PC.crouchH - 0.05 && s.y0 < p.pos.y + PC.height);
  p.crouch = !p.climb && (p.slideT > 0 || !!p.dive || (ctrl && keys.KeyC && p.onGround) || (p.crouch && lowCeil));
  p.h = p.crouch ? PC.crouchH : PC.height;
  // спринт и стамина
  const wantSprint = ctrl && il > 0 && (keys.ShiftLeft || keys.ShiftRight) && !p.climb && !p.crouch;
  if (p.exhausted && p.stamina > PC.stamina.restart) p.exhausted = false;
  p.sprinting = wantSprint && !p.exhausted && p.stamina > 0;
  if (p.sprinting) { p.stamina -= PC.stamina.drain * dt; p.stDelay = PC.stamina.delay; if (p.stamina <= 0) { p.stamina = 0; p.exhausted = true; } }
  else { p.stDelay -= dt; if (p.stDelay <= 0) p.stamina = Math.min(1, p.stamina + PC.stamina.regen * dt); }
  // поверхность под ногами
  const water = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'water');
  const slick = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'oil') || zoneAt(p.pos.x, p.pos.z, p.pos.y, 'puddle');
  const wash = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'wash');
  // разгон спринта: сначала разбег, потом набор скорости; после спринта — плавное торможение
  if (p.sprinting) p.boost = Math.min(1, p.boost + dt / PC.sprintRamp); else p.boost = Math.max(0, p.boost - dt / PC.sprintFade);
  const ramp = p.boost * p.boost * (3 - 2 * p.boost);
  let top = (PC.walk + (PC.sprint - PC.walk) * (p.sprinting ? ramp : 0)) * (water ? 0.5 : 1) * (p.held && p.held.def.heavy ? 0.85 : 1);
  if (p.crouch) top = Math.min(top, PC.crouchSpeed);
  const cur = Math.hypot(p.vel.x, p.vel.z);
  let acc;
  if (!p.onGround) acc = 3;
  else if (slick) acc = 1.2;
  else if (il) acc = PC.accel;
  else acc = cur > PC.walk + 0.5 ? PC.sprintDecel : PC.decel;
  if (p.slideT > 0) {
    // подкат: несёт по инерции, чуть рулится
    p.slideT -= dt; p.slideV = Math.max(3, p.slideV - 11 * dt);
    if (il) { const a = Math.atan2(p.slideDir[0], p.slideDir[1]); let d = Math.atan2(ix, iz) - a; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = a + Math.max(-1.2 * dt, Math.min(1.2 * dt, d)); p.slideDir = [Math.sin(na), Math.cos(na)]; }
    p.vel.x = p.slideDir[0] * p.slideV; p.vel.z = p.slideDir[1] * p.slideV;
    if (Math.random() < dt * 20) puff(p.pos.x, p.pos.y + 0.08, p.pos.z, { size: 0.3, life: 0.4, vy: 0.2, opacity: 0.5, grow: 0.8 });
  } else if (p.dive === 'air') { /* в выпаде управление не действует */ }
  else if (p.dive === 'roll') { p.rollT -= dt; p.vel.x *= Math.exp(-dt * 2); p.vel.z *= Math.exp(-dt * 2); if (p.rollT <= 0) p.dive = null; }
  else { p.vel.x += (ix * top - p.vel.x) * damp(acc, dt); p.vel.z += (iz * top - p.vel.z) * damp(acc, dt); }
  // щётки автомойки отбрасывают
  if (wash && p.onGround) { const dx = p.pos.x - wash.cx, dz = p.pos.z - wash.cz, d = Math.hypot(dx, dz) || 1; p.push.set(dx / d * 9, 0, dz / d * 9); p.vel.y = 4.5; burst(p.pos.x, p.pos.y + 0.8, p.pos.z, 8, { color: 0x9fd0f0, size: 0.25 }); }
  p.vel.x += p.push.x; p.vel.z += p.push.z; p.push.multiplyScalar(0);
  // лестницы
  p.climb = null;
  for (const l of W.ladders) {
    if (p.pos.x > l.x0 && p.pos.x < l.x1 && p.pos.z > l.z0 && p.pos.z < l.z1 && p.pos.y >= l.y0 - 0.1 && p.pos.y < l.y1) {
      const into = -(ix * l.nx + iz * l.nz);
      if (into > 0.3) { p.vel.y = PC.climb; p.climb = l; }
      else if (into < -0.3 && !p.onGround) { p.vel.y = -PC.climb; p.climb = l; }
      else if (!p.onGround && p.vel.y <= 0.5) { p.vel.y = 0; p.climb = l; }
      if (p.climb) { p.vel.x *= 0.3; p.vel.z *= 0.3; p.airPeak = p.pos.y; }
      break;
    }
  }
  // прыжок
  if (ctrl && tapped('Space') && (p.onGround || p.climb) && !p.dive) {
    if (p.slideT > 0) { p.slideT = 0; }
    p.vel.y = PC.jump * (water ? 0.75 : 1);
    if (p.climb) { p.vel.x += p.climb.nx * 3; p.vel.z += p.climb.nz * 3; p.climb = null; }
    burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 5, { size: 0.35, speed: 1.5, up: 0.5, g: 0, grow: 1.2, life: 0.5 });
  }
  p.noGrav = !!p.climb && p.vel.y === 0;
  const wasGround = p.onGround;
  moveBody(p, dt, PC.gravity);
  bumpPushables(p);
  autoMount(p);
  // падение с высоты оглушает
  if (!p.onGround) p.airPeak = Math.max(p.airPeak, p.pos.y);
  if (p.onGround && !wasGround) {
    const drop = p.airPeak - p.pos.y;
    if (p.dive === 'air' && drop <= PC.fallStun) { p.dive = 'roll'; p.rollT = PC.rollTime; p.vel.x *= 0.8; p.vel.z *= 0.8; burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 6, { size: 0.4, speed: 2, up: 0.4, g: 0, grow: 1.2, life: 0.5 }); }
    else if (p.dive === 'air') p.dive = null;
    if (drop > PC.fallStun) { p.stun = PC.stunTime; burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 10, { size: 0.5, speed: 3, up: 0.6, g: 0, grow: 1.5, life: 0.7 }); }
    else if (drop > 0.4) burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 6, { size: 0.4, speed: 2, up: 0.4, g: 0, grow: 1.2, life: 0.5 });
    p.landedNow = true;
  } else p.landedNow = false;
  if (p.onGround) p.airPeak = p.pos.y;
  if (p.stun > 0) { p.stun -= dt; p.vel.x *= 0.85; p.vel.z *= 0.85; }
  // поворот и анимация
  const spd = Math.hypot(p.vel.x, p.vel.z); p.speed = spd;
  if (p.charging && Number.isFinite(p.aimYaw)) p.facing = p.aimYaw;
  else if (spd > 0.6 && !p.climb && !p.dive) p.facing = Math.atan2(p.vel.x, p.vel.z);
  else if (p.climb) p.facing = Math.atan2(-p.climb.nx, -p.climb.nz);
  if (!Number.isFinite(p.facing)) p.facing = p.root.rotation.y;
  let dy = p.facing - p.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.root.rotation.y += dy * damp(14, dt);
  // дым при беге, брызги в воде
  // дым из-под ног: небольшой, позади персонажа и у самой земли, чтобы не закрывать его
  p.smokeT -= dt;
  if (p.onGround && spd > 6 && p.smokeT <= 0) {
    p.smokeT = p.sprinting ? 0.09 : 0.16;
    const bx = spd ? -p.vel.x / spd : 0, bz = spd ? -p.vel.z / spd : 0;
    if (water) burst(p.pos.x, p.pos.y + 0.15, p.pos.z, 3, { color: 0x8ac0e8, size: 0.2, speed: 1.4, up: 2, life: 0.45 });
    else puff(p.pos.x + bx * 0.55 + (Math.random() - 0.5) * 0.2, p.pos.y + 0.1, p.pos.z + bz * 0.55, { size: p.sprinting ? 0.32 : 0.24, life: 0.45, vy: 0.15, vx: bx * 0.6, vz: bz * 0.6, grow: 0.9, opacity: 0.55 });
  }
  if (p.throwT > 0) p.throwT -= dt;
  p.accel = (spd - p.lastSpd) / Math.max(dt, 1e-3); p.lastSpd = spd;
  p.ch.animate(dt, { t, speed: spd / PC.sprint * 1.4, air: !p.onGround && !p.climb, vy: p.vel.y, stun: p.stun > 0, climb: !!p.climb,
    hold: !!p.held, charge: p.charging ? p.charge : 0, landed: p.landedNow, throwT: p.throwT, accel: p.accel, sprint: p.boost,
    crouch: p.crouch && !p.dive && p.slideT <= 0, slide: p.slideT > 0, dive: p.dive, roll: p.dive === 'roll' ? 1 - p.rollT / PC.rollTime : null });
}
