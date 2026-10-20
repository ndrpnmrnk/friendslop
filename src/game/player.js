import { V3 } from '../core/gfx.js';
import { CONFIG } from '../config.js';
import { keys, tapped } from '../core/input.js';
import { clamp, damp } from '../core/rng.js';
import { W } from '../world/state.js';
import { moveBody, zoneAt, bumpPushables, solidsNear, groundAt } from '../world/physics.js';
import { puff, burst, smoke, smokeRing, splash, ripple, decal } from '../world/particles.js';
import { T } from '../core/textures.js';
import { makeCharacter } from '../characters/rig.js';
import { updateRide, autoMount, updateGrab, release } from './ride.js';
import { hitBreakables } from '../world/breakables.js';
import { bounceAt, worldHit, shake, leaveSwing, driveSwing, leaveHide } from './worldfx.js';
import { isFree } from '../world/physics.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';
import { struggleTap, startEmote, updateEmote, EMOTES } from './grab.js';
import { actors, shove } from './actors.js';
import { updateZip } from './zipline.js';

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

// Пятно-тень лежит на земле под персонажем и не подпрыгивает вместе с ним: чем выше, тем меньше и бледнее
export function groundBlob(p) {
  const g = p.onGround ? p.pos.y : groundAt(p.pos.x, p.pos.z, 0.1, p.pos.y + 0.05), h = Math.max(0, p.pos.y - g), k = Math.max(0, 1 - h / 6);
  const b = p.ch.blob; b.position.y = g - p.pos.y + 0.03; b.scale.setScalar(p.ch.blobS * (0.55 + 0.45 * k)); b.material.opacity = 0.32 * k; b.visible = k > 0.02;
}
export function updatePlayer(p, dt, t, canMove, yaw = 0) {
  if (p.knockT > 0) p.knockT -= dt;
  // схвачен: вырываешься частыми нажатиями, сам не двигаешься
  if (p.heldBy) {
    if (canMove && ['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE'].some(k => tapped(k))) struggleTap(p);
    p.ch.animate(dt, { t, speed: 0, air: false, grabbed: true }); groundBlob(p); return;
  }
  const ctrl = canMove && p.stun <= 0 && !p.frozen && !(p.knockT > 0) && !(p.floatT > 0);
  let ix = 0, iz = 0;
  if (ctrl) {
    if (keys.KeyA || keys.ArrowLeft) ix--; if (keys.KeyD || keys.ArrowRight) ix++;
    if (keys.KeyW || keys.ArrowUp) iz--; if (keys.KeyS || keys.ArrowDown) iz++;
  }
  // ввод относительно камеры: W — от камеры вперёд
  { const sx = ix, sz = iz, s = Math.sin(yaw), c = Math.cos(yaw); ix = sx * c + sz * s; iz = -sx * s + sz * c; }
  if (p.noRun) { ix = 0; iz = 0; }
  const il = Math.hypot(ix, iz); if (il) { ix /= il; iz /= il; }
  // эмоции 1–4
  if (ctrl) for (let i = 0; i < 4; i++) if (tapped('Digit' + (i + 1))) startEmote(p, EMOTES[i]);
  updateEmote(p, dt, il > 0 || tapped('Space'));
  // в укрытии: стоим невидимыми, выскочить — E (в main) или пробел
  if (p.hidden) { p.stamina = Math.min(1, p.stamina + PC.stamina.regen * dt); if (ctrl && tapped('Space')) leaveHide(p); else { groundBlob(p); return; } }
  // на зиплайне: едешь вниз по тросу, пробел — спрыгнуть
  if (p.zip) { updateZip(p, dt, ctrl && tapped('Space')); p.ch.animate(dt, { t, speed: 0, air: false, vy: 0, zip: true }); groundBlob(p); if (p.zip) return; }
  // на качелях: W/S — раскачиваться, пробел — спрыгнуть
  if (p.swing) {
    if (ctrl && tapped('Space')) leaveSwing(p, true);
    else { driveSwing(p, ctrl && (keys.KeyW || keys.KeyS || keys.ArrowUp || keys.ArrowDown), dt); p.ch.animate(dt, { t, speed: 0, ride: 'sit', rideSpeed: 0, hold: true }); groundBlob(p); return; }
  }
  // подтягивание на уступ: короткая анимация, физика выключена
  if (p.mantle) {
    const m = p.mantle; m.t = Math.min(1, m.t + dt / 0.36); const k = m.t, e = k * k * (3 - 2 * k);
    p.pos.set(m.fx + (m.tx - m.fx) * Math.max(0, (k - 0.4) / 0.6), m.fy + (m.ty - m.fy) * Math.min(1, e * 1.4), m.fz + (m.tz - m.fz) * Math.max(0, (k - 0.4) / 0.6));
    p.vel.set(0, 0, 0); p.ch.animate(dt, { t, speed: 0, climb: true, air: false, vy: 2 });
    if (k >= 1) { p.mantle = null; p.onGround = true; p.airPeak = p.pos.y; smokeRing(p.pos.x, p.pos.y + 0.05, p.pos.z, 4, { speed: 1.2, size: 0.12, grow: 0.3, life: 0.4 }); }
    groundBlob(p); return;
  }
  if (p.ride) {
    const pose = p.ride.ride.pose;
    updateRide(p, dt, t, ix, iz, ctrl);
    if (p.ride) {
      p.stamina = Math.min(1, p.stamina + PC.stamina.regen * dt);
      p.ch.animate(dt, { t, speed: 0, ride: pose, rideSpeed: p.speed, hold: false });
      groundBlob(p);
      return;
    }
  }
  // присед / подкат / выпад
  const curSp = Math.hypot(p.vel.x, p.vel.z);
  p.diveCD -= dt;
  if (ctrl && tapped('KeyC') && p.onGround && curSp > PC.walk + 1 && !p.climb && !p.dive) {
    p.slideT = PC.slideTime; p.slideDir = [p.vel.x / curSp, p.vel.z / curSp]; p.slideV = Math.max(curSp, PC.slideSpeed);
    smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 6, { speed: 2.2 });
  }
  // выпад стоит четверть стамины: без неё не прыгнешь, спамить нельзя
  if (ctrl && tapped('KeyQ') && !p.dive && p.diveCD <= 0 && !p.climb && p.slideT <= 0 && p.stamina >= PC.diveCost && !p.exhausted) {
    sfx('dive'); voice(p.ch, 'dive'); const f = p.root.rotation.y; p.dive = 'air'; p.diveCD = PC.diveCooldown; p.stamina -= PC.diveCost; p.stDelay = PC.stamina.delay;
    p.vel.x = Math.sin(f) * PC.diveSpeed + p.vel.x * 0.2; p.vel.z = Math.cos(f) * PC.diveSpeed + p.vel.z * 0.2;
    p.vel.y = p.onGround ? PC.diveUp : Math.max(p.vel.y, 2); p.onGround = false; p.airPeak = p.pos.y;
  }
  const lowCeil = solidsNear(p.pos.x - 0.3, p.pos.z - 0.3, p.pos.x + 0.3, p.pos.z + 0.3).some(s => s.on && p.pos.x + 0.3 > s.x0 && p.pos.x - 0.3 < s.x1 && p.pos.z + 0.3 > s.z0 && p.pos.z - 0.3 < s.z1 && s.y0 >= p.pos.y + PC.crouchH - 0.05 && s.y0 < p.pos.y + PC.height);
  p.crouch = !p.climb && (p.slideT > 0 || !!p.dive || (ctrl && keys.KeyC && p.onGround) || (p.crouch && lowCeil));
  p.h = p.crouch ? PC.crouchH : PC.height;
  // спринт и стамина
  const wantSprint = ctrl && il > 0 && (keys.ShiftLeft || keys.ShiftRight) && !p.climb && !p.crouch;
  if (p.grab && tapped('KeyC')) release(p, 1);
  if (p.exhausted && p.stamina > PC.stamina.restart) p.exhausted = false;
  p.sprinting = wantSprint && !p.exhausted && p.stamina > 0;
  if (p.sprinting && !(p.energy > 0)) { p.stamina -= PC.stamina.drain * dt; p.stDelay = PC.stamina.delay; if (p.stamina <= 0) { p.stamina = 0; p.exhausted = true; } }
  else { p.stDelay -= dt; if (p.stDelay <= 0) p.stamina = Math.min(1, p.stamina + PC.stamina.regen * dt); }
  // поверхность под ногами
  const water = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'water');
  const slick = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'oil') || zoneAt(p.pos.x, p.pos.z, p.pos.y, 'puddle');
  const wash = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'wash');
  // разгон спринта: сначала разбег, потом набор скорости; после спринта — плавное торможение
  if (p.sprinting) p.boost = Math.min(1, p.boost + dt / PC.sprintRamp); else p.boost = Math.max(0, p.boost - dt / PC.sprintFade);
  const ramp = p.boost * p.boost * (3 - 2 * p.boost);
  let top = (PC.walk + (PC.sprint - PC.walk) * (p.sprinting ? ramp : 0)) * (water ? 0.5 : 1) * (p.held && p.held.def.heavy ? 0.85 : 1);
  if (p.energy > 0) top *= 1.2; else if (p.tired > 0) top *= 0.8;
  if (p.webT > 0) { p.webT -= dt; top *= 0.4; }
  if (p.crouch) top = Math.min(top, PC.crouchSpeed);
  if (p.grab) top *= p.grab.kind === 'barrow' ? 0.82 : 0.92;
  if (p.holding) top *= 0.72;
  const cur = Math.hypot(p.vel.x, p.vel.z);
  let acc;
  if (!p.onGround) acc = 3;
  else if (slick || p.slipT > 0) acc = 1.2;
  else if (il) acc = PC.accel;
  else acc = cur > PC.walk + 0.5 ? PC.sprintDecel : PC.decel;
  if (p.slideT > 0) {
    // подкат: несёт по инерции, чуть рулится
    p.slideT -= dt; p.slideV = Math.max(3, p.slideV - 11 * dt);
    if (il) { const a = Math.atan2(p.slideDir[0], p.slideDir[1]); let d = Math.atan2(ix, iz) - a; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = a + Math.max(-1.2 * dt, Math.min(1.2 * dt, d)); p.slideDir = [Math.sin(na), Math.cos(na)]; }
    p.vel.x = p.slideDir[0] * p.slideV; p.vel.z = p.slideDir[1] * p.slideV;
    if (Math.random() < dt * 22) smoke(p.pos.x - p.slideDir[0] * 0.3, p.pos.y + 0.12, p.pos.z - p.slideDir[1] * 0.3, { size: 0.16, grow: 0.55, life: 0.55, vy: 0.5, vx: -p.slideDir[0] * 1.2 + (Math.random() - 0.5), vz: -p.slideDir[1] * 1.2 + (Math.random() - 0.5) });
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
    p.vel.y = PC.jump * (water ? 0.75 : 1); sfx('jump'); if (Math.random() < 0.35) voice(p.ch, 'jump');
    if (p.boots > 0 && !p.climb) { p.boots--; p.vel.y = 14.5; p.airPeak = p.pos.y + 7; sfx('spring'); smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 10, { speed: 3, color: 0xb18cff }); shake(0.12); }
    if (p.climb) { p.vel.x += p.climb.nx * 3; p.vel.z += p.climb.nz * 3; p.climb = null; }
    smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 5, { speed: 1.6, size: 0.14, grow: 0.42, life: 0.5 });
  }
  p.noGrav = !!p.climb && p.vel.y === 0;
  const wasGround = p.onGround;
  // выпадом можно пробить стекло и ящик (вылететь в окно)
  if (p.dive === 'air') hitBreakables({ x: p.pos.x + p.vel.x * 0.05, y: p.pos.y + 0.6, z: p.pos.z + p.vel.z * 0.05 }, 0.6, [p.vel.x, p.vel.y, p.vel.z], 1, ['glass', 'crate']);
  // шарик с водой в руках — как парашют: падаешь медленно и без оглушения
  if (!p.onGround && p.held && p.held.type === 'balloon' && p.vel.y < -2.6) { p.vel.y = -2.6; p.airPeak = p.pos.y + 1; }
  // раскрытый зонтик — парашют
  if (!p.onGround && p.held && p.held.type === 'umbrella' && p.held.open && p.vel.y < -2.2) { p.vel.y = -2.2; p.airPeak = p.pos.y + 1; p.vel.x *= 0.99; p.vel.z *= 0.99; }
  if (p.jetT > 0) { p.jetT -= dt; p.airPeak = p.pos.y; }
  if (p.dive === 'air') {
    worldHit({ x: p.pos.x + p.vel.x * 0.05, y: p.pos.y + 0.6, z: p.pos.z + p.vel.z * 0.05 }, 4, p.vel);
    // выпад: сбивает толчком (без оглушения), выбивает предмет из рук; закрытую дверь — вышибает
    for (const b of actors()) { if (b === p || b.hidden || b.heldBy || (b.diveHitT > 0)) continue; const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z; if (Math.hypot(dx, dz) < p.r + b.r + 0.15 && Math.abs(b.pos.y - p.pos.y) < 1.2) { shove(b, p.vel.x, p.vel.z, 7.5, 4.5, true); b.diveHitT = 0.6; voice(b.ch, 'hurt', b.pos); sfx('hit', { at: b.pos, v: 0.8 }); shake(0.1); } }
    for (const d of W.doors) if (!d.open && Math.hypot(d.x - p.pos.x, d.z - p.pos.z) < 1.0 && Math.abs(d.y - p.pos.y) < 1.2) { d.open = true; d.slam = 1; sfx('door', { at: d }); shake(0.18); smokeRing(d.x, d.y + 1, d.z, 6, { speed: 2 }); }
  }
  if (p.diveHitT > 0) p.diveHitT -= dt;
  moveBody(p, dt, PC.gravity);
  bumpPushables(p);
  // батут: приземлился на маркизу / крышу машины / матрас — подбросило
  if (p.landed) { const bo = bounceAt(p.pos.x, p.pos.z, p.pos.y); if (bo) { p.vel.y = bo.power; p.onGround = false; p.airPeak = p.pos.y; p.bounced = 0.3; p.dive = null;
    sfx('bounce'); voice(p.ch, 'happy'); smokeRing(p.pos.x, p.pos.y + 0.05, p.pos.z, 6, { speed: 2, size: 0.14, grow: 0.4, life: 0.4 }); worldHit({ x: p.pos.x, y: p.pos.y - 0.4, z: p.pos.z }, 1.2, p.vel); shake(0.08); } }
  // уступ на уровне груди в прыжке — подтянуться
  if (!p.onGround && il > 0 && p.vel.y < 3 && !p.climb && !p.dive && !p.held && !p.grab && !p.ride) {
    const qx = p.pos.x + ix * (p.r + 0.28), qz = p.pos.z + iz * (p.r + 0.28);
    for (const so of solidsNear(qx - 0.15, qz - 0.15, qx + 0.15, qz + 0.15)) {
      if (!so.on || qx < so.x0 || qx > so.x1 || qz < so.z0 || qz > so.z1) continue;
      const rel = so.y1 - p.pos.y; if (rel < 0.9 || rel > 1.7 || so.y1 - so.y0 < 0.25) continue;
      const tx = p.pos.x + ix * (p.r + 0.5), tz = p.pos.z + iz * (p.r + 0.5);
      if (!isFree(tx - 0.28, tz - 0.28, tx + 0.28, tz + 0.28, so.y1 + 0.05, so.y1 + PC.crouchH) || groundAt(tx, tz, 0.2, so.y1 + 0.05) < so.y1 - 0.05) continue;
      sfx('mantle'); p.mantleN = (p.mantleN || 0) + 1; p.mantle = { t: 0, fx: p.pos.x, fy: p.pos.y, fz: p.pos.z, tx, ty: so.y1, tz }; p.vel.set(0, 0, 0); break;
    }
  }
  if (p.grab && (p.stun > 0 || p.climb || p.dive || !p.onGround && p.vel.y > 1)) release(p, 0.5);
  updateGrab(p, dt);
  autoMount(p);
  // падение с высоты оглушает
  if (!p.onGround) p.airPeak = Math.max(p.airPeak, p.pos.y);
  if (p.onGround && !wasGround) {
    const drop = p.airPeak - p.pos.y;
    if (p.dive === 'air' && drop <= PC.fallStun) { p.dive = 'roll'; p.rollT = PC.rollTime; p.vel.x *= 0.8; p.vel.z *= 0.8; smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 7, { speed: 2.4 }); }
    else if (p.dive === 'air') p.dive = null;
    if (p.thrown) { p.thrown = false; if (drop > 0.3) { p.stun = Math.max(p.stun, 0.6); smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 8, { speed: 2.4 }); } }
    if (drop > 0.5) sfx('land', { v: Math.min(1.5, drop * 0.3) });
    if (drop > 2.5) { shake(Math.min(0.5, drop * 0.06)); voice(p.ch, drop > PC.fallStun ? 'hurt' : 'land'); }
    if (drop > PC.fallStun) { p.stun = PC.stunTime; smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 12, { speed: 3.2, size: 0.24, grow: 0.8, life: 0.8 }); }
    else if (drop > 0.4) smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 7, { speed: 2, size: 0.16, grow: 0.5, life: 0.55 });
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
  // бег: объёмные клубы дыма позади; шаг: только редкие крошки пыли из-под ног
  p.smokeT -= dt;
  const running = p.boost > 0.35 && spd > PC.walk + 0.5;
  if (p.onGround && !p.crouch && p.smokeT <= 0 && spd > 2.5) {
    const bx = -p.vel.x / spd, bz = -p.vel.z / spd;
    if (water) { p.smokeT = running ? 0.12 : 0.22; splash(p.pos.x, p.pos.y, p.pos.z, running ? 0.45 : 0.2); }
    else if (running) {
      p.smokeT = 0.055;
      const n = Math.random() < 0.35 ? 2 : 1;
      for (let i = 0; i < n; i++) smoke(p.pos.x + bx * 0.45 + (Math.random() - 0.5) * 0.35, p.pos.y + 0.12 + Math.random() * 0.1, p.pos.z + bz * 0.45 + (Math.random() - 0.5) * 0.35,
        { size: 0.12 + Math.random() * 0.06, grow: 0.45 + Math.random() * 0.25, life: 0.55 + Math.random() * 0.25, vx: bx * 1.4 + (Math.random() - 0.5) * 0.6, vz: bz * 1.4 + (Math.random() - 0.5) * 0.6, vy: 0.35 + Math.random() * 0.4 });
    } else { p.smokeT = 0.22 + Math.random() * 0.2; smoke(p.pos.x + bx * 0.3, p.pos.y + 0.04, p.pos.z + bz * 0.3, { dust: true, vx: bx * 0.8 + (Math.random() - 0.5) * 0.6, vz: bz * 0.8 + (Math.random() - 0.5) * 0.6 }); }
  }
  // шаги: звук зависит от поверхности
  if (p.onGround && spd > 2 && !p.crouch) { p.stepSnd = (p.stepSnd || 0) - dt * spd; if (p.stepSnd <= 0) { p.stepSnd = 2.4; sfx('step', { surf: water ? 'water' : zoneAt(p.pos.x, p.pos.z, p.pos.y, 'leaves') ? 'grass' : 'stone', v: 0.6 + spd / 22 }); } }
  if (spd < 0.5 && p.onGround) { p.idleV = (p.idleV ?? 6) - dt; if (p.idleV <= 0) { p.idleV = 6 + Math.random() * 8; voice(p.ch, 'idle'); } } else p.idleV = Math.max(p.idleV ?? 6, 3);
  if (p.throwT > 0) p.throwT -= dt;
  if (p.pushing > 0) p.pushing -= dt;
  if (p.slipT > 0) p.slipT -= dt;
  // куча листьев: пробежал — разлетелись
  if (spd > 3 && p.onGround && Math.random() < dt * 12 && zoneAt(p.pos.x, p.pos.z, p.pos.y, 'leaves')) burst(p.pos.x, p.pos.y + 0.2, p.pos.z, 3, { color: [0xc96a25, 0xa8452a, 0xe0902e][(Math.random() * 3) | 0], size: 0.14, speed: 2.2, up: 2.5, g: 5, life: 1.0, grow: 0.1 });
  // вода: стоишь — расходятся круги; приземлился — всплеск; вышел — мокрые следы
  if (water) { p.wetT = 3; p.ripT = (p.ripT || 0) - dt; if (p.ripT <= 0) { p.ripT = 0.7; ripple(p.pos.x, p.pos.y, p.pos.z, 0.8, 1.2); } if (p.landedNow) splash(p.pos.x, p.pos.y, p.pos.z, 1); }
  else if (p.wetT > 0 && p.onGround) { p.wetT -= dt; p.stepT = (p.stepT || 0) - dt;
    if (p.stepT <= 0 && spd > 1.5) { p.stepT = 0.32; p.stepS = -(p.stepS || 1); const f = p.root.rotation.y, sx = Math.cos(f) * 0.14 * p.stepS, sz = -Math.sin(f) * 0.14 * p.stepS;
      const d = decal(T.foot(), p.pos.x + sx, p.pos.y, p.pos.z + sz, 0.32, 4 + p.wetT, 0xffffff); d.rotation.z = f; d.material.opacity = 0.3 + 0.2 * p.wetT / 3; } }
  groundBlob(p);
  p.accel = (spd - p.lastSpd) / Math.max(dt, 1e-3); p.lastSpd = spd;
  p.ch.animate(dt, { t, speed: spd / PC.sprint * 1.4, air: !p.onGround && !p.climb, vy: p.vel.y, stun: p.stun > 0, climb: !!p.climb,
    hold: (!!p.held || !!p.grab || p.pushing > 0) && !p.holding, charge: p.charging ? p.charge : 0, landed: p.landedNow, throwT: p.throwT, accel: p.accel, sprint: p.boost,
    crouch: p.crouch && !p.dive && p.slideT <= 0, slide: p.slideT > 0, dive: p.dive, roll: p.dive === 'roll' ? 1 - p.rollT / PC.rollTime : null,
    emote: p.emote, emoteT: p.emoteT, held2: !!p.holding, swat: p.swatT > 0 ? p.swatT : 0 });
}
