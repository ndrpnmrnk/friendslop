import { V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { smokeRing } from '../world/particles.js';
import { actors, dropHeld } from './actors.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';
import { raySolids } from '../world/physics.js';

/* Захват удерживает соперника за одежду на земле. Оба продолжают ходить,
   схваченный сильно замедлен и может вырваться. Подъёма и броска персонажа нет. */
const gripFrom = new V3(), gripDir = new V3();
function clearGrip(a, b) {
  gripFrom.copy(a.pos).y += 0.8; gripDir.subVectors(b.pos, a.pos); gripDir.y = 0;
  const d = gripDir.length(); return d < 0.01 || raySolids(gripFrom, gripDir.multiplyScalar(1 / d), d) >= d - 0.1;
}
export function grabTarget(a, r = 1.35) {
  if (a.held || a.holding || a.heldBy || a.carryCrate || a.dogHeld) return null;
  const f = a.root.rotation.y, fx = Math.sin(f), fz = Math.cos(f); let best = null, bd = r;
  for (const b of actors()) {
    if (b === a || b.hidden || b.heldBy || b.holding || b.ride || b.swing || b.mantle || b.climb || b.caged) continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz);
    if (d < bd && Math.abs(b.pos.y - a.pos.y) < 0.7 && (dx * fx + dz * fz) / (d || 1) > 0.2 && clearGrip(a, b)) { bd = d; best = b; }
  }
  return best;
}
export function grabActor(a, b) {
  if (!b || a === b || a.held || a.holding || a.heldBy || a.carryCrate || b.heldBy || b.holding || b.drone || b.returning || a.drone || !a.onGround || !b.onGround || Math.abs(a.pos.y - b.pos.y) > 0.7 || a.pos.distanceTo(b.pos) > 1.6 || !clearGrip(a, b)) return false;
  a.holding = b; a.gripT = 0; b.heldBy = a; b.struggle = 0; b.emote = null;
  dropHeld(b); b.charging = false; a.charging = false;
  sfx('grab', { at: b.pos }); voice(b.ch, 'hurt', b.pos); W.onHit && W.onHit(a, b, 'melee'); return true;
}
// Отпускаем без импульса: ни один вызывающий код не может бросить персонажа.
export function letGo(a) {
  const b = a.holding; if (!b) return;
  a.holding = null; a.gripT = 0; b.heldBy = null; b.struggle = 0; b.thrown = false; a.charging = false;
}
function breakFree(b) {
  const a = b.heldBy; if (!a) return;
  letGo(a); a.knockT = Math.max(a.knockT || 0, 0.18);
  smokeRing(b.pos.x, b.pos.y + 0.1, b.pos.z, 5, { speed: 1 }); sfx('grab', { at: b.pos }); if (b.bot) b.revenge = 5;
}
export function struggleTap(b) { if (!b.heldBy || b.stun > 0) return; b.struggle += 0.15; if (b.struggle >= 1) breakFree(b); }
export function updateGrabs(dt) {
  for (const a of actors()) {
    const b = a.holding; if (!b) continue;
    a.gripT = (a.gripT || 0) + dt;
    const d = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
    if (a.stun > 0 || a.hidden || a.ride || a.mantle || a.climb || b.hidden || a.gripT > 4 || d > 1.8 || Math.abs(a.pos.y - b.pos.y) > 0.75 || !clearGrip(a, b)) { letGo(a); continue; }
    if (b.bot && !(b.stun > 0)) b.struggle += dt * 0.42;
    if (b.struggle >= 1) { breakFree(b); continue; }
    // Сопротивление в горизонтальной плоскости. Положение и высоту обоих решает обычная физика.
    const limit = b.stun > 0 ? 0.5 : 1.6;
    for (const actor of [a, b]) { const speed = Math.hypot(actor.vel.x, actor.vel.z); if (speed > limit) { actor.vel.x *= limit / speed; actor.vel.z *= limit / speed; } }
    if (a.onGround && b.onGround && d > 0.65) {
      const speed = Math.hypot(a.vel.x, a.vel.z);
      if (speed > 0.15) {
        const pull = Math.min(1.5, speed * 0.8 + Math.max(0, d - 1) * 2);
        b.vel.x += ((a.pos.x - b.pos.x) / d * pull + a.vel.x * 0.55 - b.vel.x) * Math.min(1, dt * 9);
        b.vel.z += ((a.pos.z - b.pos.z) / d * pull + a.vel.z * 0.55 - b.vel.z) * Math.min(1, dt * 9);
      }
    }
    a.root.rotation.y = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
  }
}

/* ---------- эмоции на 1–4 ---------- */
export const EMOTES = ['wave', 'dance', 'laugh', 'call'];
export function startEmote(a, k) {
  if (!a.onGround || a.held || a.holding || a.heldBy || a.ride || a.stun > 0) return false;
  a.emote = k; a.emoteT = 0; a.emoteDur = k === 'dance' ? 3.2 : 2.2;
  sfx('emote_' + k, { at: a.pos, v: a === W.player ? 1 : 0.7 });
  if (a.ch.skinId === 'frog') voice(a.ch, k === 'laugh' ? 'happy' : k === 'call' ? 'idle' : 'jump', a === W.player ? undefined : a.pos);
  return true;
}
export function updateEmote(a, dt, moving) {
  if (!a.emote) return;
  a.emoteT += dt;
  if (moving || a.emoteT > a.emoteDur || !a.onGround || a.stun > 0 || a.heldBy) a.emote = null;
  else if (a.emote === 'dance' && a.ch.skinId === 'frog' && Math.random() < dt * 0.9) voice(a.ch, 'jump', a === W.player ? undefined : a.pos);
}
void V3;
