import { addCoins } from './collection.js';
import { send, inRoom } from '../net/net.js';

/* v0.70 уровень игрока. Опыт - только в конце матча за место: 1 - 25, 2 - 15, 3 - 10, остальные - 5, последнее - 0,
   плюс 1 за каждое выполненное задание. Уровень 1 - 50 опыта, каждый следующий +50 к порогу (100, 150, …), пока 10 уровней.
   Уровень ничего не даёт, кроме 10 фистов за каждый новый. Discord - сохраняется на сервере (account.js SYNC_KEYS), гость - в браузере. */
export const KEY = 'friendslop.progress.v1', MAX_LEVEL = 20, FISTS_PER_LEVEL = 10; // v0.72: до 20 уровня
export const xpForLevel = n => 25 * n * (n + 1); // суммарный опыт для уровня n (1 → 50, 2 → 150, 3 → 300 …)
export function levelOf(xp) { let n = 0; while (n < MAX_LEVEL && xp >= xpForLevel(n + 1)) n++; return n; }
// прогресс внутри текущего уровня: [набрано, нужно]
export function levelSpan(xp) { const n = levelOf(xp); if (n >= MAX_LEVEL) return [1, 1, n]; const a = xpForLevel(n), b = xpForLevel(n + 1); return [xp - a, b - a, n]; }
export function placeXp(place, count) { if (count > 1 && place === count - 1) return 0; return [25, 15, 10][place] ?? 5; }
const clean = d => ({ xp: Math.max(0, d?.xp | 0), wins: Math.max(0, d?.wins | 0), missions: Math.max(0, d?.missions | 0), matches: Math.max(0, d?.matches | 0) });
export function progress() { try { return clean(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return clean({}); } }
function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { } dispatchEvent(new Event('collectionchange')); dispatchEvent(new Event('progresschange')); announce(); }
// уровень, опыт и победы видны другим в лобби и на итогах
export function announce() { if (!inRoom()) return; const p = progress(); send({ t: 'prog', lvl: levelOf(p.xp), xp: p.xp, wins: p.wins }); }
// итог матча для меня: место (0 - первое), число участников, выполненные задания
export function awardMatch(place, count, missions) {
  const before = progress(), gain = placeXp(place, count) + Math.max(0, missions | 0);
  const after = { ...before, xp: before.xp + gain, missions: before.missions + Math.max(0, missions | 0), matches: before.matches + 1, wins: before.wins + (place === 0 && count > 1 ? 1 : 0) };
  const l0 = levelOf(before.xp), l1 = levelOf(after.xp), fists = (l1 - l0) * FISTS_PER_LEVEL;
  save(after); if (fists > 0) addCoins(fists);
  return { gain, before: before.xp, after: after.xp, l0, l1, fists };
}
// то же для другого игрока - только показ (его опыт уже начислен у него самого)
export function previewMatch(xp, place, count, missions) { const gain = placeXp(place, count) + Math.max(0, missions | 0); return { gain, before: xp, after: xp + gain, l0: levelOf(xp), l1: levelOf(xp + gain) }; }
