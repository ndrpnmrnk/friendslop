import { THREE, G, V3, col, lam, glow, compose } from '../core/gfx.js';
import { W } from '../world/state.js';
import { burst } from '../world/particles.js';
import { sfx } from '../core/sfx.js';

/* Корона лидера и комбо.
   Корона висит над тем, у кого больше всех очков; попал по лидеру — бонус.
   Комбо: несколько «действий» подряд (миссия, попадание, ловушка сработала на сопернике, поймал предмет на лету,
   скольжение по перилам) с паузой не больше 4 с — множитель ×2, ×3… и надпись «КОМБО!». */
let crown = null;
export const FUN = { leader: null, combo: 0, comboT: 0, award: null, score: () => 0 };
export function resetFun(award, score) {
  FUN.leader = null; FUN.combo = 0; FUN.comboT = 0; FUN.award = award; FUN.score = score;
  crown = compose('crown', a => { const gm = lam({ color: 0xf5c542, emissive: 0x8a5a00, emissiveIntensity: 0.8 }, 'crownGold');
    a(G.cyl8, gm, 0, 0, 0, 0.26, 0.14, 0.26); for (let i = 0; i < 5; i++) { const an = i / 5 * 6.28; a(G.cone4, gm, Math.cos(an) * 0.22, 0.14, Math.sin(an) * 0.22, 0.07, 0.16, 0.07); a(G.sph, glow([0xff5a6e, 0x4ab0f0, 0x9be36b][i % 3]), Math.cos(an) * 0.255, 0.02, Math.sin(an) * 0.255, 0.04, 0.04, 0.04); } });
  crown.visible = false; W.group.add(crown);
}
// кто лидер (игрок или бот)
function leaderOf() {
  let best = null, bs = 0;
  const P = W.player; if (P && FUN.score() > bs) { best = P; bs = FUN.score(); }
  for (const b of W.bots || []) if (b.score > bs) { best = b; bs = b.score; }
  return best;
}
export function updateFun(dt, t) {
  const L = leaderOf();
  if (L !== FUN.leader) { FUN.leader = L; if (L) { sfx('crown', { v: L === W.player ? 1 : 0.5 }); burst(L.pos.x, L.pos.y + 2.2, L.pos.z, 10, { color: 0xf5c542, size: 0.14, speed: 2, up: 2 }); } }
  if (crown) { crown.visible = !!L && !L.hidden && L.root.visible !== false; if (L) { crown.position.set(L.pos.x, L.pos.y + (L.ch.d.top || 1.8) + 0.55 + Math.sin(t * 3) * 0.06, L.pos.z); crown.rotation.y = t * 1.5; } }
  if (FUN.comboT > 0) { FUN.comboT -= dt; if (FUN.comboT <= 0) FUN.combo = 0; }
}
// действие игрока: даёт очки с множителем комбо
export function comboAct(kind, base, at) {
  const P = W.player; if (!P) return;
  FUN.combo = FUN.comboT > 0 ? FUN.combo + 1 : 1; FUN.comboT = 4;
  const k = Math.min(5, FUN.combo);
  if (base) FUN.award && FUN.award(P, base * k, at);
  if (k >= 2) { comboPop(k); sfx('combo', { k }); }
}
// попадание по лидеру — бонус
export function onHitLeader(attacker, victim) {
  if (!attacker || victim !== FUN.leader || attacker === victim) return;
  FUN.award && FUN.award(attacker, 40, victim.pos); if (attacker === W.player) sfx('crown');
  burst(victim.pos.x, victim.pos.y + 2.2, victim.pos.z, 12, { color: 0xf5c542, size: 0.16, speed: 3, up: 2 });
}
function comboPop(k) {
  const el = document.getElementById('combo'); if (!el) return;
  el.innerHTML = `КОМБО <b>×${k}</b>`; el.classList.remove('hidden', 'go'); void el.offsetWidth; el.classList.add('go'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 1300);
}
void THREE; void V3; void col;
