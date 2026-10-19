export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// Генератор карты (детерминированный по seed) — отдельно от игровой случайности
export const rng = { r: Math.random };
export const seed = s => { rng.r = mulberry32(s); };
export const rand = () => rng.r();
export const range = (a, b) => a + (b - a) * rng.r();
export const pick = arr => arr[Math.floor(rng.r() * arr.length)];
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng.r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (k, dt) => 1 - Math.exp(-k * dt);
export const rpick = arr => arr[Math.floor(Math.random() * arr.length)];
