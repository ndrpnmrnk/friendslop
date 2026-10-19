import { V3 } from '../core/gfx.js';
import { CONFIG } from '../config.js';
import { keys, tapped } from '../core/input.js';
import { clamp, damp } from '../core/rng.js';
import { W } from '../world/state.js';
import { moveBody, zoneAt, bumpPushables } from '../world/physics.js';
import { puff, burst } from '../world/particles.js';
import { makeCharacter } from '../characters/rig.js';

const PC = CONFIG.player;
export function createPlayer(skin) {
  const ch = makeCharacter(skin);
  return {
    ch, root: ch.root, pos: ch.root.position, vel: new V3(), push: new V3(),
    r: PC.radius, h: PC.height, step: PC.step, onGround: true, landed: false,
    stamina: 1, stDelay: 0, exhausted: false, sprinting: false, speed: 0,
    stun: 0, airPeak: 0, climb: null, held: null, charge: 0, charging: false,
    smokeT: 0, facing: 0, frozen: false, splashT: 0,
  };
}

export function updatePlayer(p, dt, t, canMove) {
  const ctrl = canMove && p.stun <= 0 && !p.frozen;
  let ix = 0, iz = 0;
  if (ctrl) {
    if (keys.KeyA || keys.ArrowLeft) ix--; if (keys.KeyD || keys.ArrowRight) ix++;
    if (keys.KeyW || keys.ArrowUp) iz--; if (keys.KeyS || keys.ArrowDown) iz++;
  }
  const il = Math.hypot(ix, iz); if (il) { ix /= il; iz /= il; }
  // спринт и стамина
  const wantSprint = ctrl && il > 0 && (keys.ShiftLeft || keys.ShiftRight) && !p.climb;
  if (p.exhausted && p.stamina > PC.stamina.restart) p.exhausted = false;
  p.sprinting = wantSprint && !p.exhausted && p.stamina > 0;
  if (p.sprinting) { p.stamina -= PC.stamina.drain * dt; p.stDelay = PC.stamina.delay; if (p.stamina <= 0) { p.stamina = 0; p.exhausted = true; } }
  else { p.stDelay -= dt; if (p.stDelay <= 0) p.stamina = Math.min(1, p.stamina + PC.stamina.regen * dt); }
  // поверхность под ногами
  const water = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'water');
  const slick = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'oil') || zoneAt(p.pos.x, p.pos.z, p.pos.y, 'puddle');
  const wash = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'wash');
  let top = (p.sprinting ? PC.sprint : PC.walk) * (water ? 0.5 : 1) * (p.held && p.held.def.heavy ? 0.85 : 1);
  const acc = !p.onGround ? 5 : slick ? 1.6 : 14;
  p.vel.x += (ix * top - p.vel.x) * damp(acc, dt); p.vel.z += (iz * top - p.vel.z) * damp(acc, dt);
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
  if (ctrl && tapped('Space') && (p.onGround || p.climb)) {
    p.vel.y = PC.jump * (water ? 0.75 : 1);
    if (p.climb) { p.vel.x += p.climb.nx * 3; p.vel.z += p.climb.nz * 3; p.climb = null; }
    burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 5, { size: 0.35, speed: 1.5, up: 0.5, g: 0, grow: 1.2, life: 0.5 });
  }
  p.noGrav = !!p.climb && p.vel.y === 0;
  const wasGround = p.onGround;
  moveBody(p, dt, PC.gravity);
  bumpPushables(p);
  // падение с высоты оглушает
  if (!p.onGround) p.airPeak = Math.max(p.airPeak, p.pos.y);
  if (p.onGround && !wasGround) {
    const drop = p.airPeak - p.pos.y;
    if (drop > PC.fallStun) { p.stun = PC.stunTime; burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 10, { size: 0.5, speed: 3, up: 0.6, g: 0, grow: 1.5, life: 0.7 }); }
    else if (drop > 0.4) burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 6, { size: 0.4, speed: 2, up: 0.4, g: 0, grow: 1.2, life: 0.5 });
    p.landedNow = true;
  } else p.landedNow = false;
  if (p.onGround) p.airPeak = p.pos.y;
  if (p.stun > 0) { p.stun -= dt; p.vel.x *= 0.85; p.vel.z *= 0.85; }
  // поворот и анимация
  const spd = Math.hypot(p.vel.x, p.vel.z); p.speed = spd;
  if (p.charging) p.facing = p.aimYaw;
  else if (spd > 0.6 && !p.climb) p.facing = Math.atan2(p.vel.x, p.vel.z);
  else if (p.climb) p.facing = Math.atan2(-p.climb.nx, -p.climb.nz);
  let dy = p.facing - p.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.root.rotation.y += dy * damp(14, dt);
  // дым при беге, брызги в воде
  p.smokeT -= dt;
  if (p.onGround && spd > 5.5 && p.smokeT <= 0) {
    p.smokeT = p.sprinting ? 0.05 : 0.11;
    if (water) burst(p.pos.x, p.pos.y + 0.15, p.pos.z, 3, { color: 0x8ac0e8, size: 0.22, speed: 1.4, up: 2, life: 0.5 });
    else puff(p.pos.x - p.vel.x * 0.04 + (Math.random() - 0.5) * 0.3, p.pos.y + 0.15, p.pos.z - p.vel.z * 0.04, { size: p.sprinting ? 0.55 : 0.4, life: 0.6, vy: 0.5, grow: 1.4 });
  }
  p.ch.animate(dt, { t, speed: spd / PC.sprint * 1.4, air: !p.onGround && !p.climb, vy: p.vel.y, stun: p.stun > 0, climb: !!p.climb,
    hold: !!p.held, charge: p.charging ? p.charge : 0, landed: p.landedNow });
}
