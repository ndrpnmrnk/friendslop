/* v0.53 — режимы матча. Выбираются на огромной спиритической доске в хабе.
   Каждый режим — настоящий набор правил поверх общей системы раунда (game/events.js), без заглушек. */
export const MODES = [
  { id: 'classic', name: 'Классика', color: 0xffb43a, css: '#ffb43a', icon: 'pumpkin', tag: '5 минут · до 8 игроков',
    lines: ['Миссии по всему городу', 'В середине — общее событие', 'Финальный рывок: очки ×2'] },
  { id: 'chaos', name: 'Хаос-ночь', color: 0xff4fa8, css: '#ff4fa8', icon: 'lava', tag: '5 минут · до 8 игроков',
    lines: ['Миссии + каждые ~35 секунд', 'тыквопад, темнота или потоп', 'Город не даёт расслабиться'] },
  { id: 'marathon', name: 'Марафон событий', color: 0x4fe6ff, css: '#4fe6ff', icon: 'ball', tag: '5 минут · до 8 игроков',
    lines: ['Общие события одно за другим:', 'футбол, царь горы, гонка…', 'Миссии — в паузах между ними'] },
];
export const modeById = id => MODES.find(m => m.id === id) || MODES[0];
// какой режим идёт сейчас (main.js задаёт перед раундом, events.js читает)
export const MODE = { cur: MODES[0] };
export function setMode(id) { MODE.cur = modeById(id); return MODE.cur; }
