import { W } from '../world/state.js';

/* Очки и статистика раунда.
   Миссия — главный источник очков (100–300). Всё остальное — «бонусы»: мелкие суммы,
   и у каждого персонажа общий лимит бонусов — не больше BONUS_CAP за последние 60 секунд.
   Статистика (миссии, удары, срывы, кражи, ловушки, трюки…) идёт в награды на экране итогов. */
export const BONUS_CAP = 100;
export const PTS = { hitLight: 5, hitHeavy: 10, leader: 25, catch: 10, trap: 15, grind: 5, trick: 10, sabotage: 0.25 };
export const SC = { award: null };
export function statsOf(a) {
  return a.st || (a.st = { missions: 0, mpts: 0, hits: 0, sabot: 0, steals: 0, traps: 0, tricks: 0, falls: 0, catches: 0, event: 0, leader: 0 });
}
export function resetScore(award) {
  SC.award = award;
  for (const a of [W.player, ...(W.bots || [])]) if (a) { a.st = null; a.bq = null; statsOf(a); }
}
// бонус с лимитом; stat — какой счётчик увеличить (считается даже если лимит исчерпан)
export function bonus(a, stat, pts, at) {
  if (!a) return 0;
  const st = statsOf(a); if (stat) st[stat] = (st[stat] || 0) + 1;
  const now = W.time || 0; a.bq = (a.bq || []).filter(q => now - q[0] < 60);
  const used = a.bq.reduce((s, q) => s + q[1], 0), give = Math.max(0, Math.min(pts, BONUS_CAP - used));
  if (give <= 0) return 0;
  a.bq.push([now, give]); SC.award && SC.award(a, give, at);
  return give;
}
