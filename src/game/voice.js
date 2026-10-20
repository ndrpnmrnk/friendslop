import { sfx } from '../core/sfx.js';
import { W } from '../world/state.js';

/* Голос персонажа: у рептилоида — разные «ква» на прыжок, падение, бросок, выпад, удачу и просто так.
   Мешок под подбородком надувается вместе со звуком. Слишком частые реплики глушим.
   Игрок квакает только сам — клавишей F (force); боты квакают как раньше, сами по себе. */
export function voice(ch, kind, at, force = false) {
  if (!ch || ch.skinId !== 'frog') return;
  if (!force && W.player && ch === W.player.ch) return;
  const now = performance.now(); if (now - (ch.voiceT || 0) < (force ? 250 : kind === 'hurt' ? 200 : 600)) return; ch.voiceT = now;
  ch.croakNow && ch.croakNow();
  sfx('frog_' + kind, at ? { at, v: 0.8 } : { v: 1 });
}
