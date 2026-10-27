/* v0.53 — режимы матча. Выбираются в хабе: мяч в ворота режима (ui/hub-launch.js).
   Каждый режим — настоящий набор правил поверх общей системы раунда (game/events.js), без заглушек. */
export const MODES = [
  { id: 'classic', name: 'Классика', color: 0xff8a1f, css: '#ff8a1f', icon: 'pumpkin', tag: '5 минут · до 8 игроков', short: ['Миссии', 'по городу', 'Финал ×2'],
    lines: ['Миссии по всему городу', 'В середине — общее событие', 'Финальный рывок: очки ×2'] },
  { id: 'chaos', name: 'Хаос-ночь', color: 0xe0465a, css: '#e0465a', icon: 'lava', tag: '5 минут · до 8 игроков', short: ['Миссии', '+ события', 'каждые 35 с'],
    lines: ['Миссии + каждые ~35 секунд', 'тыквопад, темнота или потоп', 'Город не даёт расслабиться'] },
  { id: 'marathon', name: 'Марафон событий', color: 0x4ab0f0, css: '#4ab0f0', icon: 'ball', tag: '5 минут · до 8 игроков', short: ['События', 'одно за', 'другим'],
    lines: ['Общие события одно за другим:', 'футбол, царь горы, гонка…', 'Миссии — в паузах между ними'] },
];
export const modeById = id => MODES.find(m => m.id === id) || MODES[0];
// какой режим идёт сейчас (main.js задаёт перед раундом, events.js читает)
export const MODE = { cur: MODES[0] };
export function setMode(id) { MODE.cur = modeById(id); return MODE.cur; }
