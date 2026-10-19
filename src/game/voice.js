import { sfx } from '../core/sfx.js';

/* Голос персонажа: у рептилоида — разные «ква» на прыжок, падение, бросок, выпад, удачу и просто так.
   Мешок под подбородком надувается вместе со звуком. Слишком частые реплики глушим. */
export function voice(ch, kind, at) {
  if (!ch || ch.skinId !== 'frog') return;
  const now = performance.now(); if (now - (ch.voiceT || 0) < (kind === 'hurt' ? 200 : 600)) return; ch.voiceT = now;
  ch.croakNow && ch.croakNow();
  sfx('frog_' + kind, at ? { at, v: 0.8 } : { v: 1 });
}
