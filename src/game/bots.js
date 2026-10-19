import { V3 } from '../core/gfx.js';
import { CONFIG } from '../config.js';
import { W } from '../world/state.js';
import { moveBody, groundAt, solidsNear } from '../world/physics.js';
import { makeCharacter } from '../characters/rig.js';
import { SKIN_IDS, SKINS } from '../characters/skins.js';
import { nearestItem, pickUp, throwVelocity, launch } from './items.js';
import { smoke, smokeRing } from '../world/particles.js';
import { M } from '../missions/missions.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';

/* Простые боты-соперники (пока нет сети): бегут к миссии, «выполняют» её стоя рядом,
   иногда кидают предмет в игрока. Тот же риг, хитбокс и физика, что у игрока —
   потом их заменят живые игроки. */
const PC = CONFIG.player;
const NAMES = ['Тыквоед', 'Бублик', 'Шпрот', 'Кексик'];
export function createBots(scene, playerSkin, n = 3) {
  for (const b of W.bots || []) scene.remove(b.root);
  W.bots = [];
  const others = SKIN_IDS.filter(s => s !== playerSkin);
  for (let i = 0; i < n; i++) {
    const skin = others[i % others.length] || playerSkin, ch = makeCharacter(skin); ch.onCroak = () => sfx('croak', { at: ch.root.position, v: 0.6 });
    const sp = W.spawns[(i + 1) % W.spawns.length] || { x: 0, y: 0.15, z: 0 };
    ch.root.position.set(sp.x + (Math.random() - 0.5) * 2, sp.y, sp.z + (Math.random() - 0.5) * 2); scene.add(ch.root);
    W.bots.push({ bot: true, name: NAMES[i], skin, ch, root: ch.root, pos: ch.root.position, vel: new V3(), push: new V3(), r: PC.radius, h: PC.height, step: PC.step,
      onGround: true, stun: 0, score: 0, goal: null, doT: 0, think: 0, stuck: 0, last: new V3(), facing: 0, throwCD: 4 + Math.random() * 6, held: null, wander: null, airPeak: 0 });
  }
  return W.bots;
}

function pickGoal(b) {
  const free = M.list.filter(m => !m.busy && m.obj && m.obj.pos);
  if (free.length && Math.random() < 0.8) { const m = free[(Math.random() * free.length) | 0], p = m.obj.pos(); return { x: p.x, y: p.y, z: p.z, m }; }
  const z = W.missionZones[(Math.random() * W.missionZones.length) | 0]; if (!z) return null;
  return { x: z.x0 + Math.random() * (z.x1 - z.x0), y: z.y, z: z.z0 + Math.random() * (z.z1 - z.z0), m: null };
}

export function updateBots(dt, t, P) {
  for (const b of W.bots || []) {
    if (b.stun > 0) b.stun -= dt;
    if (b.webT > 0) b.webT -= dt;
    if (b.blind > 0) b.blind -= dt;
    b.think -= dt; b.throwCD -= dt;
    // цель: миссия или случайное место; дошёл — «выполняет» 6–10 с
    if (!b.goal || b.think <= 0 && !b.doT) { b.goal = pickGoal(b); b.think = 12 + Math.random() * 8; }
    let ix = 0, iz = 0;
    if (b.doT > 0) { b.doT -= dt; if (b.doT <= 0) { if (b.goal && b.goal.m) b.score += Math.round(b.goal.m.def.points * 0.6); b.goal = null; } }
    else if (b.goal && b.stun <= 0) {
      const dx = b.goal.x - b.pos.x, dz = b.goal.z - b.pos.z, d = Math.hypot(dx, dz);
      if (d < 1.4 && Math.abs(b.goal.y - b.pos.y) < 1.5) { b.doT = b.goal.m ? 6 + Math.random() * 4 : 1.5; }
      else { ix = dx / d; iz = dz / d; }
      if (b.wander) { b.wander.t -= dt; ix = b.wander.x; iz = b.wander.z; if (b.wander.t <= 0) b.wander = null; }
      if (b.blind > 0) { ix = Math.sin(t * 3 + b.pos.x); iz = Math.cos(t * 2.4); }
    }
    // застрял — шаг в сторону, у низкой преграды — прыжок
    b.stuck = Math.hypot(b.pos.x - b.last.x, b.pos.z - b.last.z) < dt * 0.8 && (ix || iz) ? b.stuck + dt : 0; b.last.copy(b.pos);
    if (b.stuck > 0.6 && b.onGround) { b.vel.y = PC.jump; b.onGround = false; if (b.stuck > 1.2) { const a = Math.random() * 6.28; b.wander = { x: Math.cos(a), z: Math.sin(a), t: 1.2 }; b.stuck = 0; } }
    // иногда швыряет предмет в игрока
    if (P && b.throwCD <= 0 && b.stun <= 0 && Math.hypot(P.pos.x - b.pos.x, P.pos.z - b.pos.z) < 11) {
      const it = nearestItem(b.pos, 2.2);
      if (it && it.state === 'rest') { b.throwCD = 9 + Math.random() * 8; const from = new V3(b.pos.x, b.pos.y + 1.4, b.pos.z); it.state = 'held'; it.pos.copy(from); const v = throwVelocity(from, P.pos.clone().setY(P.pos.y + 1), 0.6 + Math.random() * 0.3, it.def); it.owner = b; launch(it, from, v); voice(b.ch, 'throw', b.pos); b.throwT = 0.3; }
      else b.throwCD = 2;
    }
    const sp = (b.webT > 0 ? 0.4 : 1) * PC.sprint * 0.78, k = b.onGround ? 8 : 2;
    b.vel.x += (ix * sp - b.vel.x) * Math.min(1, dt * k) + b.push.x; b.vel.z += (iz * sp - b.vel.z) * Math.min(1, dt * k) + b.push.z; b.push.set(0, 0, 0);
    if (b.stun > 0) { b.vel.x *= 0.9; b.vel.z *= 0.9; }
    // толкотня с игроком, выпад игрока сбивает бота
    if (P) { const dx = b.pos.x - P.pos.x, dz = b.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d < b.r + P.r && d > 1e-3 && Math.abs(b.pos.y - P.pos.y) < 1.2) { const o = (b.r + P.r - d) / 2; b.pos.x += dx / d * o; b.pos.z += dz / d * o; P.pos.x -= dx / d * o; P.pos.z -= dz / d * o;
        if (P.dive === 'air' && b.stun <= 0) { voice(b.ch, 'hurt', b.pos); b.stun = 1.3; b.vel.set(P.vel.x * 0.7, 5, P.vel.z * 0.7); b.onGround = false; } } }
    const was = b.onGround;
    moveBody(b, dt, PC.gravity);
    if (b.onGround && !was && b.airPeak - b.pos.y > 0.6) smokeRing(b.pos.x, b.pos.y + 0.1, b.pos.z, 5, { speed: 1.6, size: 0.14 });
    if (!b.onGround) b.airPeak = Math.max(b.airPeak, b.pos.y); else b.airPeak = b.pos.y;
    if (b.pos.y < -30) { const s = W.spawns[0]; b.pos.set(s.x, s.y + 1, s.z); b.vel.set(0, 0, 0); }
    const spd = Math.hypot(b.vel.x, b.vel.z);
    if (spd > 0.6) b.facing = Math.atan2(b.vel.x, b.vel.z);
    let dy = b.facing - b.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.root.rotation.y += dy * Math.min(1, dt * 12);
    if (b.onGround && spd > 7 && Math.random() < dt * 10) smoke(b.pos.x - b.vel.x / spd * 0.4, b.pos.y + 0.12, b.pos.z - b.vel.z / spd * 0.4, { size: 0.12, grow: 0.5, life: 0.5, vy: 0.4 });
    if (b.throwT > 0) b.throwT -= dt;
    b.ch.animate(dt, { t, speed: spd / PC.sprint * 1.4, air: !b.onGround, vy: b.vel.y, stun: b.stun > 0, climb: false, hold: b.doT > 0, charge: 0, landed: false, throwT: b.throwT || 0, accel: 0, sprint: 1, crouch: false });
    // пятно-тень
    const gb = b.ch.blob; if (gb) { const g = groundAt(b.pos.x, b.pos.z, 0.1, b.pos.y + 0.05), h = Math.max(0, b.pos.y - g), kk = Math.max(0, 1 - h / 6); gb.position.y = g - b.pos.y + 0.03; gb.scale.setScalar(b.ch.blobS * (0.55 + 0.45 * kk)); gb.material.opacity = 0.32 * kk; }
  }
}

/* Попадание брошенным предметом по боту: тяжёлое сбивает с ног, лёгкое толкает и мочит */
export function botHitHook(it, p, heavy, r) {
  const P = W.player;
  if (P && it.owner && it.owner.bot && Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < r && p.y > P.pos.y - 0.3 && p.y < P.pos.y + P.h + 0.4) {
    if (heavy) { voice(P.ch, 'hurt'); P.stun = Math.max(P.stun, 1.2); P.vel.set(it.vel.x * 0.4, 4, it.vel.z * 0.4); P.onGround = false; } else { P.push.set(it.vel.x * 0.15, 0, it.vel.z * 0.15); if (it.type === 'balloon') { P.wetT = 4; P.slipT = 2; } }
  }
  for (const b of W.bots || []) {
    if (it.owner === b) continue;
    if (Math.hypot(b.pos.x - p.x, b.pos.z - p.z) < r && p.y > b.pos.y - 0.3 && p.y < b.pos.y + b.h + 0.4) {
      b.vel.x += it.vel.x * (heavy ? 0.5 : 0.2); b.vel.z += it.vel.z * (heavy ? 0.5 : 0.2);
      if (heavy) { b.stun = 1.4; b.vel.y = 4; b.onGround = false; } else if (it.type === 'balloon') { b.wetT = 4; b.slipT = 2; }
    }
  }
}
export const botLabel = b => `${b.name} (${SKINS[b.skin].name})`;
