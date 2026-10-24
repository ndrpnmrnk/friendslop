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
  roundTime: 300,
  season: 'halloween',            // 'halloween' | 'none'
  grid: 3,                        // 3x3 районов на карте
  chunk: 32, road: 6, base: 0.15, // размер района, ширина дороги, высота тротуара
  pixelScale: 2,
  smoky: {smokeCount:6,smokeInterval:.38,smokeLife:2.2,smokeRise:.25},
  encounters:{vanTime:120,cosmoTime:120,bongEffect:6},
  // v0.32: настройки взаимодействий без изменения геометрии моделей.
  canopy: {spring:65,damping:8,bounce:6.8,compression:.13},
  fishing: {timeout:100,minReel:12,perRadian:.036,botTurn:4.3},
  detector: {range:9,farPulse:1.6,nearPulse:.38,digTime:1.5,holeRadius:.65},
  melee: {duration:.78,impactLeft:.29,cooldown:.86},
  botStepDown: {maxDrop:2.15,timeout:1.8},
  mothStun:1.5,

  player: {
    walk: 6.5, sprint: 11, radius: 0.45, height: 1.6, step: 0.42,
    accel: 9, decel: 7, sprintDecel: 3.2, sprintRamp: 0.9, sprintFade: 0.7,
    jump: 8, gravity: 22, climb: 3.4,
    stamina: { drain: 0.32, regen: 0.26, delay: 0.7, restart: 0.15 },
    fallStun: 4.5, stunTime: 1.4,
    crouchH: 1.0, crouchSpeed: 3.2, slideTime: 0.75, slideSpeed: 12, diveSpeed: 10, diveUp: 4.5, rollTime: 0.45, diveCooldown: 0.9, diveCost: 0.25,
  },
  camera: { offset: [0, 12.5, 14], fov: 50, lookAhead: 0.3 },
  // волны миссий: в волне «игроки − 1» общих миссий (не меньше 2); у каждой свой таймер 25–50 с (дальше — дольше)
  wave: { min: 2, max: 5, life: [40, 75], gap: 3, gapBurnt: 1.5, spread: 12, personal: 0.35, outsiderFrom: 90, outsiderK: 0.6, outsiderMul: 1.5 },
  interact: 2.2,
  cats: 2,
  // zones: где миссия может появиться; foot: размер объекта; clear: свободное место перед ним
  missions: {
    bus:{name:'Автобус 63',points:350,diff:'hard',life:80,workLimit:210,max:1,game:'bus',world:true},
    outfit:{name:'Собери образ',points:280,diff:'mid',life:75,workLimit:110,max:1,game:'outfit',world:true,zones:['inside'],foot:[5.6,4.2],clear:1.2},
    shakir:{name:'Найти Шакира',points:220,diff:'hard',life:75,workLimit:85,max:1,game:'shakir',zones:['floor'],foot:[3.4,3.0],clear:1.2,home:'market'},
    fat:{name:'300 литров жира',points:600,diff:'hard',life:80,workLimit:180,max:1,game:'fat',world:true},
    demolition:{name:'Хнуре: большой бабах',points:350,diff:'hard',life:75,workLimit:110,max:1,game:'demolition',world:true},
    van:{name:'Пассажиры для ТЦК',icon:'',points:300,diff:'hard',life:75,workLimit:120,max:1,game:'van',world:true},
    cosmo:{name:'Космический перекур',icon:'',points:350,diff:'hard',life:75,workLimit:120,max:1,game:'cosmo',world:true,zones:['floor'],foot:[1.2,.8],clear:3},
    perfume:{name:'Смешай парфюм',icon:'',points:260,diff:'mid',life:65,workLimit:90,max:1,game:'perfume',zones:['inside'],foot:[2.4,.9],clear:2.2},
    mammoth:{name:'Трусики для мамонта',home:'park',icon:'',points:300,diff:'hard',life:80,max:1,game:'mammoth',world:true,zones:['floor'],foot:[3.2,4.6],clear:3},
    cat:    { name: 'Погладить кота', icon: '🐈', points: 100, diff: 'easy', life: 40, max: 2, game: 'cat' },
    puzzle: { name: 'Собрать пазл на стенде', home: 'school', icon: '🧩', points: 200, diff: 'mid', life: 55, max: 1, game: 'puzzle',
              zones: ['floor', 'inside', 'roof', 'tunnel'], foot: [2.6, 0.6], clear: 2.4 },
    ttt:    { name: 'Обыграть призрака в крестики-нолики', home: 'cemetery', icon: '👻', points: 250, diff: 'hard', life: 0, max: 1, game: 'ttt',
              zones: ['floor', 'inside', 'nook', 'roof', 'tunnel'], foot: [1.8, 2.6], clear: 1.4 },
    // spot — миссия ставится в заранее отмеченное место (есть только если такое место есть на карте)
    // world — уличная миссия: бегаешь как обычно, сверху таймер
    shells: { name: 'Наперстки: найди тыковку', home: 'plaza', icon: '🥤', points: 150, diff: 'easy', life: 45, max: 1, game: 'shells',
              zones: ['floor', 'inside', 'nook', 'tunnel'], foot: [1.9, 1.0], clear: 1.6 },
    targets: { name: 'Меткий бросок: сбей 3 мишени', home: 'skatepark', icon: '🎯', points: 150, diff: 'easy', life: 50, max: 1, game: 'targets', world: true,
              zones: ['floor'], foot: [6, 7], clear: 1.2 },
    cleanup: { name: 'Уборка: мусор в урну', home: 'sewer', icon: '🧹', points: 120, diff: 'easy', life: 50, max: 1, game: 'cleanup', world: true,
              zones: ['floor'], foot: [1, 1], clear: 1.5 },
    fish:   { name: 'Рыбалка', icon: '🎣', points: 200, diff: 'mid', life:50,workLimit:110,max:1,game:'fish', spot: 'fish' },
    fuse:   { name: 'Почини щиток', icon: '⚡', points: 200, diff: 'mid', life: 50, max: 1, game: 'fuse', spot: 'fuse' },
    delivery: { name: 'Доставка заказа', icon: '📦', points: 220, diff: 'mid', life: 45, max: 1, game: 'delivery', spot: 'pickup', world: true, needs: 'deliver' },
    safe:   { name: 'Взломай сейф', icon: '🔐', points: 280, diff: 'hard', life: 0, max: 1, game: 'safe', spot: 'safe' },
    salad:  { name: 'Сделай салат', icon: '', points: 260, diff: 'mid', life: 70, max: 1, game: 'salad', spot: 'kitchen', world: true },
    phone:  { name: 'Позови всех гулять', icon: '', points: 180, diff: 'easy', life: 50, max: 1, game: 'phone', spot: 'phone' },
    bulb:   { name: 'Вкрути лампочку', icon: '', points: 230, diff: 'mid', life: 60, max: 1, game: 'bulb', spot: 'bulb', world: true },
    catbox: { name: 'Загони котят в коробку', home: 'yard', icon: '', points: 240, diff: 'mid', life: 55, max: 1, game: 'catbox', world: true, zones: ['floor'], foot: [1.3, 1.3], clear: 2.5 },
    pizza:  { name: 'Горячая пицца', icon: '', points: 240, diff: 'mid', life: 45, max: 1, game: 'pizza', spot: 'pickup', world: true, needs: 'deliver' },
    firebin: { name: 'Потуши урну', icon: '', points: 200, diff: 'easy', life: 60, max: 1, game: 'firebin', spot: 'fire', world: true },
    // v0.16: миссии «руками»
    leaves: { name: 'Золотой билет в листьях', home: 'park', icon: '', points: 200, diff: 'easy', life: 50, max: 1, game: 'leaves', zones: ['floor'], foot: [1.9, 1.9], clear: 1.8 },
    graffiti: { name: 'Граффити по трафарету', home: 'skatepark', icon: '', points: 220, diff: 'mid', life: 50, max: 1, game: 'graffiti', zones: ['floor'], foot: [2.8, 0.5], clear: 2.4 },
    intercom: { name: 'Код домофона', home: 'yard', icon: '', points: 260, diff: 'mid', life: 50, max: 1, game: 'intercom', world: true, zones: ['floor'], foot: [0.5, 0.5], clear: 1.6 },
    lockpick: { name: 'Отмычка', home: 'shops', icon: '', points: 240, diff: 'mid', life: 50, max: 1, game: 'lockpick', zones: ['floor', 'inside', 'nook'], foot: [1.2, 0.8], clear: 1.6 },
    pipes: { name: 'Трубы', home: 'sewer', icon: '', points: 220, diff: 'mid', life: 50, max: 1, game: 'pipes', zones: ['floor', 'tunnel', 'inside'], foot: [1.6, 0.6], clear: 1.6 },
    // v0.23: 14 новых миссий в 3D-мире (games5.js)
    doorbell: { name: 'Позвони и убеги', home: 'yard', icon: '', points: 220, diff: 'mid', life: 60, max: 1, game: 'doorbell', world: true, zones: ['floor'], foot: [2.4, 0.5], clear: 3 },
    steal:  { name: 'Утащи у скелета', home: 'park', icon: '', points: 240, diff: 'mid', life: 60, max: 1, game: 'steal', world: true, zones: ['floor'], foot: [1.9, 0.6], clear: 2.5 },
    grill:  { name: 'Бургеры на гриле', icon: '', points: 230, diff: 'mid', life: 55, max: 1, game: 'grill', spot: 'grill' },
    generator: { name: 'Заправь генератор', home: 'plaza', icon: '', points: 250, diff: 'mid', life: 70, max: 1, game: 'generator', world: true, zones: ['floor'], foot: [3.4, 0.9], clear: 1.6 },
    bells:  { name: 'Колокола склепа', home: 'cemetery', icon: '', points: 240, diff: 'mid', life: 60, max: 1, game: 'bells', zones: ['floor'], foot: [3.2, 0.6], clear: 3.8 },
    moths:  { name: 'Мотыльки в сачок', icon: '', points: 200, diff: 'easy', life: 55, max: 1, game: 'moths', spot: 'bulb', world: true },
    carwash: { name: 'Помой машину', icon: '', points: 210, diff: 'easy', life: 55, max: 1, game: 'carwash', spot: 'car' },
    balloon: { name: 'Шарик на дереве', home: 'park', icon: '', points: 230, diff: 'mid', life: 70, max: 1, game: 'balloon', world: true, zones: ['floor'], foot: [1.2, 1.2], clear: 4.6 },
    mail:   { name: 'Почтальон', icon: '', points: 240, diff: 'mid', life:75,workLimit:150,max:1,game:'mail', world: true, zones: ['floor'], foot: [0.7, 0.4], clear: 1.5 },
    detector: { name: 'Металлоискатель', home: 'park', icon: '', points: 220, diff: 'mid', life: 60, max: 1, game: 'detector', world: true, zones: ['floor'], foot: [0.6, 0.3], clear: 2 },
    cart:   { name: 'Тележка из магазина', home: 'shops', icon: '', points: 250, diff: 'mid', life: 70, max: 1, game: 'cart', world: true, zones: ['floor'], foot: [1.2, 0.3], clear: 2.6 },
    ghost:  { name: 'Фото призрака', home: 'cemetery', icon: '', points: 230, diff: 'mid', life: 60, max: 1, game: 'ghost', world: true, zones: ['floor'], foot: [0.5, 0.5], clear: 1.5 },
    antenna: { name: 'Настрой антенну', home: 'office', icon: '', points: 220, diff: 'mid', life: 55, max: 1, game: 'antenna', zones: ['roof'], foot: [1.6, 0.8], clear: 2.2 },
    pigeon: { name: 'Поймай голубя', home: 'plaza', icon: '', points: 210, diff: 'easy', life: 60, max: 1, game: 'pigeon', world: true, zones: ['floor'], foot: [0.8, 0.6], clear: 1.6 },
  },
  missionCooldown: 6,
  // предметы для броска
  items: {
    bao:{name:'Паровые булочки',tool:true,r:.24,mass:.3,drag:.2,bounce:.15,respawn:0},
    taco:{name:'Тако',tool:true,r:.22,mass:.2,drag:.2,bounce:.15,respawn:0},
    noodles:{name:'Лапша в стакане',tool:true,r:.21,mass:.35,drag:.2,bounce:.15,respawn:0},
    burger:{name:'Бургер',tool:true,r:.22,mass:.3,drag:.2,bounce:.15,respawn:0},
    boombox:{name:'Бумбокс',tool:true,heavy:true,r:.35,halfHeight:.21,mass:1.8,drag:.06,bounce:.12,respawn:0},
    fatcan:{name:'Бидон жира · 50 л',heavy:true,r:.30,halfHeight:.36,mass:2.5,drag:.1,bounce:.08,respawn:0},
    mammothpants:{name:'Трусики мамонта',heavy:false,r:.38,mass:.5,drag:.3,bounce:.2,respawn:0},
    // mass — масса: тяжёлые летят ближе, их почти не сдвинуть; лёгкие летят дальше и разлетаются от пинка
    // drag — сопротивление воздуха, bounce — упругость
    balloon: { name: 'Шарик с водой', icon: '💧', heavy: false, r: 0.22, respawn: 9, mass: 0.5, drag: 0.35, bounce: 0.3 },
    tomato:  { name: 'Помидор', icon: '🍅', heavy: false, r: 0.16, respawn: 8, mass: 0.25, drag: 0.1, bounce: 0.2 },
    pumpkin: { name: 'Тыква', icon: '🎃', heavy: true, r: 0.32, respawn: 12, mass: 3, drag: 0, bounce: 0.15 },
    ball:    { name: 'Мяч', icon: '🏀', heavy: false, r: 0.24, respawn: 0, mass: 0.6, drag: 0.05, bounce: 0.65 },
    brick:   { name: 'Кирпич', icon: '🧱', heavy: true, r: 0.2, respawn: 10, mass: 2.5, drag: 0, bounce: 0.1, sinks: true },
    // мелочь из квартир и офисов (v0.19): можно взять и бросить; хрупкое разбивается от сильного удара (breaks — скорость)
    monitor: { name: 'Монитор', heavy: true, r: 0.24, respawn: 0, mass: 1.4, drag: 0.03, bounce: 0.1, breaks: 6.5 },
    pc:      { name: 'Системник', heavy: true, r: 0.26, respawn: 0, mass: 2.2, drag: 0.02, bounce: 0.1, breaks: 9 },
    keyboard: { name: 'Клавиатура', heavy: false, r: 0.12, respawn: 0, mass: 0.5, drag: 0.1, bounce: 0.2 },
    mug:     { name: 'Кружка', heavy: false, r: 0.08, respawn: 0, mass: 0.25, drag: 0.05, bounce: 0.1, breaks: 5 },
    books:   { name: 'Стопка книг', heavy: false, r: 0.14, respawn: 0, mass: 0.8, drag: 0.08, bounce: 0.1 },
    dlamp:   { name: 'Настольная лампа', heavy: false, r: 0.16, respawn: 0, mass: 0.6, drag: 0.06, bounce: 0.1, breaks: 6 },
    pot:     { name: 'Цветок в горшке', heavy: true, r: 0.17, respawn: 0, mass: 1.0, drag: 0.04, bounce: 0.05, breaks: 5.5 },
    chair:   { name: 'Стул', icon: '🪑', heavy: true, r: 0.3, respawn: 15, mass: 1.6, drag: 0.05, bounce: 0.2, rest: 0.0 },
    trash:   { name: 'Мусорный пакет', icon: '🗑️', heavy: false, r: 0.28, respawn: 25, mass: 1.0, drag: 0.12, bounce: 0.2 },
    litter:  { name: 'Мусор', icon: '🥫', heavy: false, r: 0.12, respawn: 0, mass: 0.2, drag: 0.15, bounce: 0.35 },
    parcel:  { name: 'Заказ', icon: '📦', heavy: false, r: 0.24, respawn: 0, mass: 0.8, drag: 0.1, bounce: 0.2 },
    // v0.23: для миссий
    missioncrate: { name: 'Ящик для лесенки', heavy:true, r:0.45,halfHeight:0.35,respawn:0,mass:2.4,drag:0.05,bounce:0.08 },
    canister: { name: 'Канистра', heavy: true, r: 0.22, respawn: 0, mass: 1.6, drag: 0.03, bounce: 0.1 },
    letter:  { name: 'Письмо', heavy: false, r: 0.1, respawn: 0, mass: 0.15, drag: 0.08, bounce: 0.1 },
    can:     { name: 'Банка газировки', icon: '🥤', heavy: false, r: 0.1, respawn: 0, mass: 0.4, drag: 0.1, bounce: 0.45 },
    cone:    { name: 'Конус', icon: '🔶', heavy: false, r: 0.22, respawn: 0, mass: 0.5, drag: 0.15, bounce: 0.45, rest: 0.0 },
    // предметы миссий
    bigpumpkin: { name: 'Тыква-мяч', heavy: false, r: 0.55, respawn: 0, mass: 1.2, drag: 0.02, bounce: 0.55 },
    cucumber: { name: 'Огурец', heavy: false, r: 0.14, respawn: 0, mass: 0.3, drag: 0.08, bounce: 0.3 },
    bulb:    { name: 'Лампочка', heavy: false, r: 0.12, respawn: 0, mass: 0.2, drag: 0.1, bounce: 0.1 },
    pizza:   { name: 'Горячая пицца', heavy: false, r: 0.26, respawn: 0, mass: 0.6, drag: 0.25, bounce: 0.15 },
    /* Инструменты: выпадают из ящиков, лежат на земле. E — взять, ЛКМ — применить, ПКМ — бросить.
       ammo — сколько раз (или секунд) можно применить; charge — показывать запас шкалой 0–100; cdMax — перезарядка (с) без расхода */
    slipper: { name: 'Тапок', tool: true, heavy: false, knock: true, r: 0.14, respawn: 0, mass: 0.4, drag: 0.04, bounce: 0.3 },
    umbrella: { name: 'Зонтик', tool: true, heavy: false, r: 0.2, respawn: 0, mass: 0.7, drag: 0.15, bounce: 0.2 },
    extinguisher: { name: 'Огнетушитель', tool: true, heavy: true, r: 0.2, respawn: 0, mass: 1.8, drag: 0.02, bounce: 0.2, ammo: 4, hold: true, charge: true },
    banana:  { name: 'Банановая кожура', tool: true, heavy: false, r: 0.12, respawn: 0, mass: 0.15, drag: 0.15, bounce: 0.1 },
    pillow:  { name: 'Подушка', tool: true, heavy: false, r: 0.24, respawn: 0, mass: 0.5, drag: 0.35, bounce: 0.3, ammo: 99 },
    duck:    { name: 'Резиновая уточка', tool: true, heavy: false, r: 0.12, respawn: 0, mass: 0.2, drag: 0.1, bounce: 0.6, ammo: 99 },
    bubbles: { name: 'Мыльные пузыри', tool: true, heavy: false, r: 0.12, respawn: 0, mass: 0.3, drag: 0.1, bounce: 0.3, ammo: 5 },
    whistle: { name: 'Свисток', tool: true, heavy: false, r: 0.08, respawn: 0, mass: 0.1, drag: 0.1, bounce: 0.3, ammo: 3 },
    net:     { name: 'Сетемёт', tool: true, heavy: false, r: 0.16, respawn: 0, mass: 0.8, drag: 0.05, bounce: 0.2, cdMax: 10 },
    perfume:{name:'Парфюм',tool:true,heavy:false,r:.12,mass:.3,respawn:0,drag:.1,bounce:.2,ammo:3},
    bong:{name:'Космический бонг',tool:true,heavy:false,r:.24,mass:.65,respawn:0,drag:.12,bounce:.15},
    bow:{name:'Лук',tool:true,heavy:false,r:.25,mass:.7,respawn:0,drag:.1,bounce:.25,ammo:8,hold:true},
    badge:   { name: 'Полицейский жетон', tool: true, heavy: false, r: 0.1, respawn: 0, mass: 0.25, drag: 0.02, bounce: 0.3 },
    glove:   { name: 'Перчатка-пружина', tool: true, heavy: false, r: 0.16, respawn: 0, mass: 0.6, drag: 0.05, bounce: 0.3, ammo: 6 },
    vacuum:  { name: 'Пылесос', tool: true, heavy: false, r: 0.2, respawn: 0, mass: 1.2, drag: 0.05, bounce: 0.2, ammo: 16, hold: true, charge: true },
    magnet:  { name: 'Магнит', tool: true, heavy: false, r: 0.18, respawn: 0, mass: 1.0, drag: 0.05, bounce: 0.2, hold: true },
    paint:   { name: 'Ведро краски', tool: true, heavy: false, r: 0.2, respawn: 0, mass: 1.2, drag: 0.05, bounce: 0.1 },
    energy:  { name: 'Энергетик', tool: true, heavy: false, r: 0.08, respawn: 0, mass: 0.3, drag: 0.1, bounce: 0.4 },
    water:   { name: 'Водяной пистолет', tool: true, heavy: false, r: 0.14, respawn: 0, mass: 0.4, drag: 0.1, bounce: 0.3, ammo: 12 },
    firework: { name: 'Фейерверк', tool: true, heavy: false, r: 0.12, respawn: 0, mass: 0.4, drag: 0.05, bounce: 0.2 },
    popper:  { name: 'Хлопушка', tool: true, heavy: false, r: 0.1, respawn: 0, mass: 0.2, drag: 0.1, bounce: 0.3 },
    sling:   { name: 'Рогатка', tool: true, heavy: false, r: 0.12, respawn: 0, mass: 0.3, drag: 0.1, bounce: 0.3, ammo: 8 },
    web:     { name: 'Паутина', tool: true, heavy: false, r: 0.14, respawn: 0, mass: 0.3, drag: 0.2, bounce: 0.1 },
    rake:    { name: 'Грабли', tool: true, heavy: true, r: 0.2, respawn: 0, mass: 1.2, drag: 0.05, bounce: 0.1 },
    cushion: { name: 'Подушка-пердушка', tool: true, heavy: false, r: 0.16, respawn: 0, mass: 0.2, drag: 0.3, bounce: 0.5 },
  },
  // инструменты, которые выпадают из ящиков (золотые ящики — только «редкие»)
  toolPool: ['boombox','bao','taco','noodles','burger','bow', 'net', 'badge', 'slipper', 'umbrella', 'extinguisher', 'banana', 'pillow', 'duck', 'bubbles', 'whistle', 'magnet', 'paint', 'energy', 'water', 'firework', 'popper', 'sling', 'web'],
  toolRare: ['bow', 'badge', 'net', 'extinguisher', 'magnet', 'firework', 'bubbles', 'paint'],
  throw: { minRange: 3, maxRange: 17, chargeTime: 0.9 },
};

export const HINTS = {
  bus:'Развези котят по трём остановкам. W/S - газ и тормоз, A/D - руль. ЛКМ открывает и закрывает двери на остановке. E - выйти в конце маршрута.',
  van:'ЛКМ - поймать. Неси к открытым дверям: E посадить, ПКМ бросить. Собери 5 пассажиров за 120 секунд.',
  cosmo:'Держи ЛКМ для вдоха, затем кликай для выдоха. Бластером попади по два раза в каждого пришельца. В захвате - WASD / Пробел.',
  mammoth:'Возьми трусики, подойди к мамонту и нажми E. ЛКМ по подсвеченной ткани - подтяни край вверх. Камера покажет каждую из четырёх сторон.',
  graffiti:'Потряси мышью вверх-вниз, затем рисуй ЛКМ. Факел постепенно сужается. Достаточно 65% рисунка: очки зависят от покрытия и точности.',
  cat: 'Зажми кнопку мыши и гладь кота, водя рукой туда-сюда. От головы к хвосту приятнее всего. Резкие движения его злят.',
  puzzle: 'Кликни по двум плиткам, чтобы поменять их местами, и собери картинку.',
  shells: 'Запомни, под каким стаканом тыковка, следи за перемешиванием и кликни по нужному.',
  fish: 'Наведи мышь на воду и кликни — заброс. Рыба подплывёт и клюнет — кликни, чтобы подсечь. Зажми ЛКМ и крути мышью по часовой стрелке, чтобы подмотать катушку. Когда рыба рвётся - отпусти.',
  fuse: 'Тяни провод слева мышью к клемме того же цвета справа.',
  safe: 'Зажми ЛКМ на диске и крути. На нужной цифре слышен щелчок — тогда нажми на ручку. Нужно три цифры.',
  targets: 'Бери помидоры и мячи из ящика (E) и бросай (ПКМ) в мишени.',
  cleanup: 'Подбирай мусор (E) и бросай в урну или клади рядом с ней.',
  delivery: 'Неси заказ к зелёному лучу. Его можно бросить и снова поднять, но время идёт.',
  outfit:'Запомни образ на фото. Бегай между вешалками: E у вещи - примерить. Найди головной убор, верх, низ и обувь. Собранная одежда остаётся до конца матча.',
  shakir:'Води лупой по настольному рынку. Найди бородатого муравья с боксёрскими перчатками и задержи на нём лупу.',
  fat:'Собери 6 бидонов по 50 л. E у тележки - погрузить. Довези груз к салону, открой его, пригласи мэра и держи давление в зелёной зоне.',
  demolition:'E у каждой из четырёх схем, затем ЛКМ защёлкни три игровых блока. После последнего заряда есть 10 секунд, чтобы отбежать. Взрыв сбивает с ног игроков поблизости.',
  doorbell: 'E у настоящей входной двери - звонок. На экране 3-2-1: спрячься за стеной, крупным предметом или в укрытии. Жилец видит на 24 м, стены и предметы перекрывают обзор.',
  steal: 'Скелет курит на лавке, рядом его банка. Хватай (E), когда красный сектор взгляда смотрит в сторону, и уноси за 12 м. Два раза заметит — провал.',
  grill: 'Котлеты жарятся снизу (нижний край темнеет). Клик — перевернуть. Когда и вторая сторона готова — клик ещё раз: в булку. Сырую или горелую не подавай. Нужно 3 бургера.',
  generator: 'Найди канистру, принеси к генератору и нажми E. Держи ЛКМ, чтобы наливать в бак; отпусти, чтобы остановиться. Стрелка, смотровая трубка и счётчик показывают объём от 0 до 10 литров.',
  bells: 'Призрак звонит в колокола по порядку. Повтори: кликай по колоколам — камешек летит и звенит. 3 раунда, 3 ошибки — провал.',
  moths: 'Мотыльки резко летают у фонаря. Подходи шагом: ЛКМ - взмах большим сачком. Поймай трёх и пересади в банку на E.',
  carwash: 'Три этапа: смой грязь водой, натри кузов губкой до пены, затем смой пену. ЛКМ - вода, веди зажатой ЛКМ - губка.',
  balloon: 'Шарик застрял на дереве. E — взять ящик, E у ствола — поставить. Поставь три ступени на зелёные метки, запрыгни наверх и нажми E у шарика.',
  mail: 'Тебе дали письмо: цвет и номер ящика — в подсказке. E у ящика — опустить. Можно закинуть броском прямо в ящик.',
  detector: 'Ходи вокруг таблички: чем чаще писк и маленькие круги, тем ближе находка. E - копать лопаткой. Пустая яма отнимает 4 секунды.',
  cart: 'Веди тележку на ПКМ или толкай ЛКМ к дальней машине. Только сильный удар на скорости роняет покупки. Подсвеченное верни броском или положи на E. Все 6 - полная награда, пустая доставка - 5 очков.',
  ghost: 'Сделай три снимка разных появлений призрака. Поймай его в зелёную рамку и нажми ЛКМ. Он плавно появляется и перемещается; через стены снять нельзя.',
  antenna: 'Зажми ЛКМ и тяни мышью — тарелка крутится. Лампочки и телевизор показывают сигнал. Удержи полный сигнал 1.5 секунды.',
  pigeon: 'Голубь пугается бега, голоса поблизости, криков и летящих предметов. Подходи шагом или присев, E — схватить. Неси в голубятню и нажми E.',
  salad: 'Найди огурец и помидор (подсвечены), принеси на кухню. Режь: зажми ЛКМ и веди поперёк пунктира. Потом поставь миску и раскрути её кругами мыши.',
  phone: 'Кликни по другу в списке, выбери стикер — отправится. Позови всех.',
  bulb: 'Возьми лампочку и залезь по стремянке. На E начни ремонт: ЛКМ открой плафон, вставь лампочку, зажми ЛКМ и вкрути по часовой стрелке. Закрой крышку, чтобы включить свет.',
  catbox: 'Котята убегают от тебя — заходи сзади и гони к коробке. Резиновая уточка их приманивает.',
  pizza: 'Неси пиццу к зелёному лучу. Полоска — тепло: в руках остывает медленно, брошенная — быстро.',
  firebin: 'Огнетушитель (ЛКМ — струя), водяной пистолет или шарики с водой.',
  ttt: 'Ты ставишь крестики. Победа даёт все очки, ничья половину, поражение проваливает миссию.',
};

export const DIFF = { easy: 0x9be36b, mid: 0xf5c542, hard: 0xff5a6e };
export const HW = CONFIG.season === 'halloween';
export const SEASON = HW
  // v0.19: свет луны — холодный, сильнее, рассеянный ниже: тени от объектов на улице читаются чётче
  ? { bg: 0x2a1f3d, fog: [0x2a1f3d, 45, 135], hemi: [0xa890e0, 0x231a30, 0.88], sun: [0xc8ccff, 1.15], lit: '#ffa94d', lamp: 0xffb35c }
  : { bg: 0x9fd3ff, fog: [0x9fd3ff, 60, 150], hemi: [0xffffff, 0x6a7a5a, 1.0], sun: [0xffffff, 0.8], lit: '#fff1b0', lamp: 0xfff1b0 };
