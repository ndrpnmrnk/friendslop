import { V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { burst, smokeRing } from '../world/particles.js';
import { actors, dropHeld } from './actors.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';

/* Схватить другого персонажа руками (ЛКМ вплотную, руки пустые).
   Схваченный дёргается и тянет держащего в свою сторону, может вырваться
   (игрок — частыми нажатиями пробела/WASD, бот — сам через пару секунд).
   Держащего можно донести и бросить (ПКМ, как предмет). */
export function grabTarget(a, r = 1.35) {
  const f = a.root.rotation.y, fx = Math.sin(f), fz = Math.cos(f); let best = null, bd = r;
  for (const b of actors()) {
    if (b === a || b.hidden || b.heldBy || b.holding || b.ride || b.swing || b.mantle) continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz);
    if (d < bd && Math.abs(b.pos.y - a.pos.y) < 1 && (dx * fx + dz * fz) / (d || 1) > 0.2) { bd = d; best = b; }
  }
  return best;
}
export function grabActor(a, b) {
  if (!b || a.held || a.holding) return false;
  a.holding = b; b.heldBy = a; b.struggle = 0; b.wrig = { x: 0, z: 0, t: 0 }; b.vel.set(0, 0, 0); b.emote = null;
  dropHeld(b); if (b.charging) b.charging = false;
  burst(b.pos.x, b.pos.y + 1, b.pos.z, 6, { color: 0xf1e8ff, size: 0.16, speed: 1.6, up: 1 });
  sfx('grab', { at: b.pos }); voice(b.ch, 'hurt', b.pos); W.onHit && W.onHit(a, b, 'melee');
  return true;
}
// отпустить; vel — бросок
export function letGo(a, vel = null) {
  const b = a.holding; if (!b) return; a.holding = null; b.heldBy = null; b.onGround = false; b.airPeak = b.pos.y;
  if (vel) { b.vel.copy(vel); b.knockT = 0.7; b.thrown = true; } else b.vel.set(0, 2, 0);
}
// вырвался: отпрыгивает, держащего слегка отбрасывает назад
function breakFree(b) {
  const a = b.heldBy; if (!a) return;
  const f = a.root.rotation.y, fx = Math.sin(f), fz = Math.cos(f);
  letGo(a); b.vel.set(fx * 4, 6, fz * 4); a.vel.x -= fx * 3; a.vel.z -= fz * 3; a.knockT = 0.25;
  smokeRing(b.pos.x, b.pos.y + 0.6, b.pos.z, 6, { speed: 2 }); sfx('jump', { at: b.pos });
  if (b.bot) b.revenge = 5; // бот запомнил обидчика
}
// игрок пытается вырваться: каждое нажатие — рывок
export function struggleTap(b) { if (!b.heldBy) return; b.struggle += 0.13; b.wrig.t = 0.15; if (b.struggle >= 1) breakFree(b); }

export function updateGrabs(dt, t) {
  for (const a of actors()) {
    const b = a.holding; if (!b) continue;
    if (a.stun > 0 || a.hidden || a.ride || a.mantle || b.hidden) { letGo(a); continue; }
    // бот вырывается сам, через 1.6–3 c
    if (b.bot) { b.struggle += dt * (0.35 + Math.random() * 0.3); if (b.struggle >= 1) { breakFree(b); continue; } }
    // рывки схваченного: случайное направление, держащего тянет туда (как физика)
    const w = b.wrig; w.t -= dt;
    if (w.t <= 0) { const ang = Math.random() * 6.28; w.x = Math.cos(ang); w.z = Math.sin(ang); w.t = 0.25 + Math.random() * 0.3; }
    const pull = 3.2 + b.struggle * 3;
    a.vel.x += w.x * pull * dt * 6; a.vel.z += w.z * pull * dt * 6;
    // держим перед собой, приподнятым
    const f = a.root.rotation.y, k = Math.sin(t * 14) * 0.05;
    b.pos.set(a.pos.x + Math.sin(f) * 0.75 + w.x * 0.08, a.pos.y + 0.45 + k, a.pos.z + Math.cos(f) * 0.75 + w.z * 0.08);
    b.vel.set(0, 0, 0); b.onGround = false; b.airPeak = b.pos.y; b.root.rotation.y = f + Math.PI + Math.sin(t * 9) * 0.3;
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
