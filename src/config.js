/* =====================================================================
   ART PROMPT — правила для создания и улучшения ВСЕХ моделей игры
   ---------------------------------------------------------------------
   Стиль: PlayStation 1 (1996–1999), город в сумерках, сезонный слой Хэллоуина.
   1. Геометрия: 30–300 треугольников на объект. Угловатые формы, силуэт
      читается с камеры. Детали (окна, мех, морды, доски) — в текстуре.
   2. Текстуры «под фото»: реальная фактура (мех, кирпич, асфальт, дерево,
      металл), ужатая до 16–64 px с мягким размытием и показанная без
      сглаживания (Nearest). Фото накладывается на простую модель проекцией
      спереди, как морда кота на угловатую голову.
   3. Экран: рендер ~1/3 разрешения, дрожание вершин, дизеринг Bayer 4x4,
      урезанная палитра. Свет простой, тени — пятно под персонажем.
   4. Персонажи: большая голова, маленькое тело, ручки и ножки парят отдельно.
      Рост 1.45–1.8 м, хитбокс у всех одинаковый.
   5. Объекты: меньше, но крупнее и детальнее. Интерактивное — контрастнее декора.
   6. Сезон: украшения — отдельный слой, базовые модели от сезона не зависят.
   7. Палитра: сливовая ночь #2a1f3d, тыква #ff8a1f, свет окон #ffa94d,
      призраки #eee8ff, конфетный зелёный #9be36b.
   ===================================================================== */

export const CONFIG = {
  roundTime: 120,
  season: 'halloween',            // 'halloween' | 'none'
  grid: 3,                        // 3x3 районов на карте
  chunk: 32, road: 6, base: 0.15, // размер района, ширина дороги, высота тротуара
  pixelScale: 2,
  player: {
    walk: 6.5, sprint: 11, radius: 0.45, height: 1.6, step: 0.42,
    accel: 9, decel: 7, sprintDecel: 3.2, sprintRamp: 0.9, sprintFade: 0.7,
    jump: 8, gravity: 22, climb: 3.4,
    stamina: { drain: 0.32, regen: 0.26, delay: 0.7, restart: 0.15 },
    fallStun: 4.5, stunTime: 1.4,
    crouchH: 1.0, crouchSpeed: 3.2, slideTime: 0.75, slideSpeed: 12, diveSpeed: 10, diveUp: 4.5, rollTime: 0.45, diveCooldown: 0.9,
  },
  camera: { offset: [0, 12.5, 14], fov: 50, lookAhead: 0.3 },
  missionWave: [1, 2],            // миссии приходят волнами по 1–2, следующая — когда закончатся текущие
  waveDelay: [1.5, 3],
  interact: 2.2,
  cats: 2,
  // zones: где миссия может появиться; foot: размер объекта; clear: свободное место перед ним
  missions: {
    cat:    { name: 'Погладить кота', icon: '🐈', points: 100, diff: 'easy', life: 40, max: 2, game: 'cat' },
    puzzle: { name: 'Собрать пазл на стенде', icon: '🧩', points: 200, diff: 'mid', life: 55, max: 1, game: 'puzzle',
              zones: ['floor', 'inside', 'roof', 'tunnel'], foot: [2.6, 0.6], clear: 2.4 },
    ttt:    { name: 'Обыграть призрака в крестики-нолики', icon: '👻', points: 250, diff: 'hard', life: 0, max: 1, game: 'ttt',
              zones: ['floor', 'inside', 'nook', 'roof', 'tunnel'], foot: [1.8, 2.6], clear: 1.4 },
  },
  missionCooldown: 6,
  // предметы для броска
  items: {
    // mass — масса: тяжёлые летят ближе, их почти не сдвинуть; лёгкие летят дальше и разлетаются от пинка
    // drag — сопротивление воздуха, bounce — упругость
    balloon: { name: 'Шарик с водой', icon: '💧', heavy: false, r: 0.22, respawn: 9, mass: 0.5, drag: 0.35, bounce: 0.3 },
    tomato:  { name: 'Помидор', icon: '🍅', heavy: false, r: 0.16, respawn: 8, mass: 0.25, drag: 0.1, bounce: 0.2 },
    pumpkin: { name: 'Тыква', icon: '🎃', heavy: true, r: 0.32, respawn: 12, mass: 3, drag: 0, bounce: 0.15 },
    ball:    { name: 'Мяч', icon: '🏀', heavy: false, r: 0.24, respawn: 0, mass: 0.6, drag: 0.05, bounce: 0.65 },
    brick:   { name: 'Кирпич', icon: '🧱', heavy: true, r: 0.2, respawn: 10, mass: 2.5, drag: 0, bounce: 0.1 },
    chair:   { name: 'Стул', icon: '🪑', heavy: true, r: 0.3, respawn: 15, mass: 1.6, drag: 0.05, bounce: 0.2, rest: 0.0 },
    cone:    { name: 'Конус', icon: '🔶', heavy: false, r: 0.22, respawn: 0, mass: 0.5, drag: 0.15, bounce: 0.45, rest: 0.0 },
  },
  throw: { minRange: 3, maxRange: 17, chargeTime: 0.9 },
};

export const HINTS = {
  cat: 'Зажми кнопку мыши и гладь кота, водя рукой туда-сюда. От головы к хвосту приятнее всего. Резкие движения его злят.',
  puzzle: 'Кликни по двум плиткам, чтобы поменять их местами, и собери картинку.',
  ttt: 'Ты ставишь крестики. Победа даёт все очки, ничья половину, поражение проваливает миссию.',
};

export const DIFF = { easy: 0x9be36b, mid: 0xf5c542, hard: 0xff5a6e };
export const HW = CONFIG.season === 'halloween';
export const SEASON = HW
  ? { bg: 0x2a1f3d, fog: [0x2a1f3d, 45, 135], hemi: [0xa890e0, 0x2a2035, 1.15], sun: [0xffc89a, 0.75], lit: '#ffa94d', lamp: 0xffb35c }
  : { bg: 0x9fd3ff, fog: [0x9fd3ff, 60, 150], hemi: [0xffffff, 0x6a7a5a, 1.0], sun: [0xffffff, 0.8], lit: '#fff1b0', lamp: 0xfff1b0 };
