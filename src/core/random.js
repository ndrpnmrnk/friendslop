// Игровая случайность отделена от THREE.generateUUID и ленивых кешей моделей.
// Скоупы синхронные; finally восстанавливает внешний поток, включая вложенные вызовы.
let source = null;
export const random = () => source ? source() : Math.random();
export function hashSeed(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function randomSource(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function withRandom(seed, fn) {
  const old = source;
  source = typeof seed === 'function' ? seed : randomSource(seed);
  try { return fn(); } finally { source = old; }
}
