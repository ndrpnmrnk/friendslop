import { actionEffect } from '../world/action-fx.js';
import { burst } from '../world/particles.js';

/* v0.66: мгновенная отдача удара по игроку с другого компьютера.
   Решение (оглушение, отлёт, выпавший предмет) по-прежнему принимает владелец цели;
   у атакующего сразу видны вспышка, звук и поза, пока не придёт настоящее состояние цели. */
const LIFE = 0.5;
export function predictHit(a, k, args = []) {
  if (!a?.puppet || !a.pos) return;
  const power = k === 'knock' ? 1.4 : k === 'shove' ? Math.min(1.3, (args[2] || 6) / 7) : .7;
  actionEffect('hit', { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z }, power);
  if (k === 'shove') burst(a.pos.x, a.pos.y + 1, a.pos.z, 5, { color: 0xf1e8ff, size: .16, speed: 2, up: 1.5 });
  const dx = args[0] || 0, dz = args[1] || 0, d = Math.hypot(dx, dz) || 1;
  const speed = k === 'shove' ? (args[2] || 6) : k === 'knock' ? Math.min(6, d) : 0;
  a.netPredict = { k, at: performance.now(), x: dx / d * speed, z: dz / d * speed };
}
// Вызывается при показе марионетки: поза и небольшой сдвиг, пока поток цели не догнал удар.
export function applyHitPrediction(a, s, root) {
  const p = a.netPredict; if (!p) return s;
  const age = (performance.now() - p.at) / 1000;
  const caught = p.k === 'knock' ? s.stun || s.rag : p.k === 'daze' ? s.daze : age > .3;
  if (age > LIFE || caught && age > .12) { a.netPredict = null; return s; }
  const fade = 1 - age / LIFE, push = Math.min(age, .2) * .6 * fade;
  if (root) { root.position.x += p.x * push; root.position.z += p.z * push; }
  if (p.k === 'knock') return { ...s, stun: true, rag: 1 };
  if (p.k === 'daze') return { ...s, daze: true };
  return s;
}
