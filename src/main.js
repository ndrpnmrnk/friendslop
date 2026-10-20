import { updateOcclusion } from './game/occlusion.js';
import { eliminate, updateDrones, resetDrones, droneAction } from './game/drone.js';
import { SUP, resetSupplies, updateSupplies, spawnSupply } from './game/supplies.js';
import { routeTo } from './missions/location.js';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import './styles.css';
import { THREE, V3, G, present, makeCamera, basic, mesh, sprite, renderer } from './core/gfx.js';
import { T } from './core/textures.js';
import { CONFIG, SEASON, HINTS, DIFF } from './config.js';
import { keys, tapped, endFrame, mouse, on, aim, lock, locked, unlock, takeLook, requestLock } from './core/input.js';
import { W } from './world/state.js';
import { generateMap } from './world/world.js';
import { updatePushables, groundAt, raySolids } from './world/physics.js';
import { updateParticles, burst } from './world/particles.js';
import { updateBirds } from './world/birds.js';
import { updateCrane } from './world/crane.js';
import { updateSwingers } from './world/swingers.js';
import { createSky } from './world/sky.js';
import { buildLife, updateLife } from './world/life.js';
import { resetTools, updateTools, useTool, toolVerb, toolImpact, spawnTool } from './game/tools.js';
import { grabTarget, grabActor, letGo, updateGrabs } from './game/grab.js';
import { mouse as M_ } from './core/input.js';
import { createBots, updateBots, botHitHook, interruptBot } from './game/bots.js';
import { voice } from './game/voice.js';
import { FX, updateWorldFx, nearInteract, registerInteracts, leaveSwing, leaveHide } from './game/worldfx.js';
import { createPlayer, updatePlayer } from './game/player.js';
import { updateCat } from './game/cats.js';
import { updateItems, nearestItem, pickUp, drop, throwVelocity, launch, predict, addItem } from './game/items.js';
import { updateCamera, cam, resetCamera } from './game/camera.js';
import { M, resetMissions, spawnWave, spawnMission, removeMission, updateMissions, nearMission, missionDone, visibleTo, ALL_GAMES, WORLD_GAMES } from './missions/missions.js';
import { resetScore, bonus, statsOf, PTS } from './game/score.js';
import { isFree, solidsNear } from './world/physics.js';
import { pulseOutline } from './game/outline.js';
import { nearestRideable, mount, dismount, grab, release, hopIn } from './game/ride.js';
import { updateBreakables } from './world/breakables.js';
import { $, renderHud, renderStamina, resetHud, markWon, flyScore, sparks, eventBanner, eventChip, toast, renderNav } from './ui/hud.js';
import { TEXT } from './ui/text.js';
import { img } from './ui/icons.js';
import { initAudio, sfx, ambience, setListener, toggleMute } from './core/sfx.js';
import { drawCard } from './ui/cards.js';
import { createMenu } from './ui/menu.js';
import { createPodium, assignAwards, AWARDS, skinName } from './ui/podium.js';
import { buildMinimap, drawMinimap } from './ui/minimap.js';
import { throwPotato, initEvents, resetEvents, updateEvents, stopEvent, EV, bigTarget, PHASE, phaseOf } from './game/events.js';
import { DISTRICTS } from './world/districts/index.js';
import { startWeather, updateWeather, stopWeather, WX } from './world/weather.js';
import { buildReflections, updateReflections } from './world/reflect.js';
import { updateTraps } from './game/traps.js';
import { resetTown, updateTown, TOWN } from './game/town.js';
import { resetFun, updateFun, comboAct, onHitLeader, FUN } from './game/fun.js';
import { LIGHTMAT } from './world/builder.js';
import { MIC, startMic, stopMic, listMics, updateMic, saveMic, calibrateMic } from './core/mic.js';
import { scareBirds } from './world/birds.js';
import { resetSplat, updateSplat } from './world/splat.js';
import { resetPolice, updatePolice, openCageUI, closeCageUI, POL } from './game/police.js';
import { vacuumFire } from './game/tools.js';

/* ---------- сцена игры ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(SEASON.bg);
scene.fog = new THREE.Fog(...SEASON.fog);
const hemi = new THREE.HemisphereLight(SEASON.hemi[0], SEASON.hemi[1], SEASON.hemi[2] * Math.PI); scene.add(hemi);
const sun = new THREE.DirectionalLight(SEASON.sun[0], SEASON.sun[1] * Math.PI); sun.position.set(-30, 50, 25); scene.add(sun, sun.target);
// жёсткие пиксельные тени: карта теней 2048 на квадрат ~64 м вокруг игрока
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.07;
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 150 }); sun.shadow.camera.updateProjectionMatrix();
const SUN_DIR = new V3(-30, 50, 25).normalize(), SUN_R = new V3().crossVectors(new V3(0, 1, 0), SUN_DIR.clone().negate()).normalize(), SUN_U = new V3().crossVectors(SUN_DIR.clone().negate(), SUN_R).normalize();
// фонарик персонажа (горит только в событии «Отключили свет»; свет есть всегда, чтобы не пересобирать шейдеры)
const sky = createSky(scene);
const flash = new THREE.SpotLight(0xfff0d0, 0, 26, 0.55, 0.5, 1.2); scene.add(flash, flash.target);
initEvents({ player: () => P, lights: () => ({ hemi, sun, flash, scene, sky }), award: (a, pts, at) => { const g = award(a, pts, at); if (a && g) statsOf(a).event += g; } });
const eventUi = { start: (key, big) => { eventBanner(key, big); sfx('event'); }, tick: (key, sec, info) => eventChip(key, sec, info), end: () => eventChip(null) };
function followSun(x, y, z) {
  // привязка к текселю карты теней, чтобы края теней не дрожали при движении
  const tx = 64 / 2048, c = new V3(x, y, z), a = Math.round(c.dot(SUN_R) / tx) * tx, b = Math.round(c.dot(SUN_U) / tx) * tx, f = c.dot(SUN_DIR);
  const t = SUN_R.clone().multiplyScalar(a).addScaledVector(SUN_U, b).addScaledVector(SUN_DIR, f);
  sun.target.position.copy(t); sun.position.copy(t).addScaledVector(SUN_DIR, 70);
}
const camera = makeCamera(CONFIG.camera.fov);
const menu = createMenu();
const podium = createPodium();
// мышь захватывается для камеры во время игры (кроме мини-игр)
lock.want = () => S.state === 'play' && !S.mg;
document.addEventListener('pointerlockchange', () => { $('lockhint').classList.toggle('hidden', locked() || S.state !== 'play' || !!S.mg); document.body.classList.toggle('locked', locked()); });

const S = { state: 'menu', intro: null, time: 0, score: 0, done: 0, mg: null, wm: null, crane: false, hudT: 0, cursor: true };
let P = null;

// точки траектории броска
const arc = []; for (let i = 0; i < 22; i++) { const m = sprite(T.dot(), 0.2, { color: 0xffb45a, depthTest: false, opacity: 0.95 }); m.renderOrder = 10; m.visible = false; scene.add(m); arc.push(m); }
const land = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
land.rotation.x = -Math.PI / 2; land.scale.setScalar(0.5); land.material.depthTest = false; land.renderOrder = 10; land.visible = false; scene.add(land);

/* ---------- экраны: меню → режим → рулетка → пролёт → игра → итоги ---------- */
const SCREENS = ['menu', 'mode', 'roulette', 'results', 'settings'];
function screen(id) { for (const k of SCREENS) $(k).classList.toggle('hidden', k !== id); }
function buildLogo() { const l = $('logo'); if (l.childElementCount) return; for (const ch of TEXT.title) { const s = document.createElement('span'); s.textContent = ch; l.appendChild(s); } }
let logoT = 0;
function showMenu() {
  S.state = 'menu'; document.body.classList.remove('playing'); menu.active = true; buildLogo();
  screen('menu'); $('hud').classList.add('hidden'); $('intro').classList.add('hidden'); $('dot').classList.add('hidden'); unlock();
}
function showMode() {
  S.state = 'mode'; menu.active = false; screen('mode'); drawCard($('modeArt'), 'mode'); $('modeCard').classList.remove('pressed'); $('modeCard').focus(); sfx('click');
}
for (const b of document.querySelectorAll('button')) { b.addEventListener('mouseenter', () => sfx('hover')); b.addEventListener('click', () => initAudio()); }
addEventListener('pointerdown', () => { initAudio(); ambience(true); }, { once: true });
$('skinPrev').onclick = () => { menu.next(-1); sfx('click'); };
$('skinNext').onclick = () => { menu.next(1); sfx('click'); };
$('playBtn').onclick = () => showMode();
// мышь захватывается сразу по нажатию (это и есть «клик» для браузера) — в игре не нужно кликать ещё раз
$('modeCard').onclick = () => { requestLock(); $('modeCard').classList.add('pressed'); sfx('pickup'); setTimeout(tutSeen() ? startRoulette : startTutorial, 220); };
$('tutBtn').onclick = () => { requestLock(); sfx('click'); startTutorial(); };
$('modeBack').onclick = () => { sfx('click'); showMenu(); };
/* настройки: микрофон */
$('setBtn').innerHTML = img('gear', 28); $('micIco').innerHTML = img('mic', 20);
function showSettings() { S.state = 'settings'; menu.active = false; screen('settings'); sfx('click'); syncSettings(); fillMics(); }
function syncSettings() { $('micOn').textContent = MIC.on ? 'ВКЛ' : 'ВЫКЛ'; $('micOn').classList.toggle('on', MIC.on); $('micMode').textContent = MIC.mode === 'always' ? 'ВСЕГДА' : 'ЗАЖАТЬ V'; $('micSens').value = MIC.sens; $('micLoudS').value = MIC.loudSens; }
async function fillMics() { const list = await listMics(), sel = $('micDev'); sel.innerHTML = '<option value="">По умолчанию</option>' + list.map((d, i) => `<option value="${d.deviceId}">${d.label || 'Микрофон ' + (i + 1)}</option>`).join(''); sel.value = MIC.device || ''; }
$('setBtn').onclick = showSettings;
$('setBack').onclick = () => { sfx('click'); showMenu(); };
$('micOn').onclick = async () => { MIC.on = !MIC.on; saveMic(); syncSettings(); if (MIC.on) { await startMic(); fillMics(); } else stopMic(); };
$('micMode').onclick = () => { MIC.mode = MIC.mode === 'always' ? 'ptt' : 'always'; saveMic(); syncSettings(); sfx('click'); };
$('micSens').oninput = e => { MIC.sens = +e.target.value; saveMic(); };
$('micLoudS').oninput = e => { MIC.loudSens = +e.target.value; saveMic(); };
$('micCal').onclick = () => { if (MIC.ok) { calibrateMic(); sfx('click'); } };
$('micDev').onchange = async e => { MIC.device = e.target.value; saveMic(); if (MIC.on) await startMic(); };
function drawMicMeter() {
  const m = updateMic(1 / 60, keys.KeyV), i = $('micMeter').firstChild; i.style.width = `calc(${Math.round(m.level * 100)}% - 4px)`; i.className = m.shout > 0.2 ? 'shout' : m.talk > 0.1 ? 'talk' : '';
  $('micThr').style.left = Math.round((m.thr || 0.1) * 100) + '%'; $('micLoud').style.left = Math.min(98, Math.round((m.loud || 0.5) * 100)) + '%';
  const st = !MIC.on ? 'выключен' : MIC.err ? MIC.err : !MIC.ok ? 'включаю…' : MIC.cal > 0 ? 'тишина… калибрую' : m.shout > 0.2 ? 'КРИК!' : m.talk > 0.1 ? 'говоришь' : 'тишина'; if ($('micState').textContent !== st) $('micState').textContent = st;
}
$('againBtn').onclick = () => { requestLock(); startRoulette(); };
$('menuBtn').onclick = () => { sfx('click'); showMenu(); };
$('mgexit').onclick = () => { if (S.wm) closeWorld(null); else closeMission(null); };

/* Рулетка тематики: лента карточек крутится с замедлением, щёлкает на каждой, всегда останавливается на «ГОРОДЕ» */
function startRoulette() {
  S.state = 'roulette'; menu.active = false; screen('roulette'); $('roulette').classList.remove('done');
  const strip = $('rstrip'); strip.innerHTML = '';
  const N = 15, WIN = 12, CW = 170 + 18;
  for (let i = 0; i < N; i++) { const city = i % 4 === 0 || i === WIN, c = document.createElement('div'); c.className = 'rcard' + (city ? '' : ' q') + (i === WIN ? ' win' : '');
    const cv = document.createElement('canvas'); cv.width = 68; cv.height = 84; drawCard(cv, city ? 'city' : 'unknown', i); c.appendChild(cv);
    const pl = document.createElement('div'); pl.className = 'plate'; pl.textContent = city ? TEXT.city : '?'; c.appendChild(pl); strip.appendChild(c); }
  const cards = [...strip.children], end = -(WIN * CW + 85), dur = 3.2, t0 = performance.now(); let last = -1;
  strip.style.transform = 'translateX(-85px)';
  const step = () => {
    if (S.state !== 'roulette') return;
    const k = Math.min(1, (performance.now() - t0) / 1000 / dur), e = 1 - Math.pow(1 - k, 3.4), x = -85 + (end + 85) * e;
    strip.style.transform = `translateX(${x}px)`;
    const idx = Math.round((-x - 85) / CW); if (idx !== last) { last = idx; sfx('tick'); cards.forEach((c, i) => c.classList.toggle('flash', i === idx)); }
    if (k < 1) requestAnimationFrame(step);
    else { $('roulette').classList.add('done'); sfx('win'); const r = cards[WIN].getBoundingClientRect(); sparks(r.left + r.width / 2, r.top + r.height / 2, ['#ff8a1f', '#f5c542', '#9be36b', '#b18cff'], 22, $('rsparks'));
      setTimeout(() => { $('fade').classList.add('on'); setTimeout(() => { prepareRound(); $('fade').classList.remove('on'); startIntro(); }, 420); }, 1100); }
  };
  requestAnimationFrame(step);
}

/* Снимок города для пазла: случайный район с высоты, каждый раз новый ракурс → картинка 96×96 */
const snapRT = new THREE.WebGLRenderTarget(96, 96), snapCam = new THREE.PerspectiveCamera(48, 1, 0.5, 160);
W.snapshot = () => {
  try {
    const d = W.districts[(Math.random() * W.districts.length) | 0], a = Math.random() * 6.28, cx = d.ox + 16, cz = d.oz + 16;
    snapCam.position.set(cx + Math.cos(a) * 22, 12 + Math.random() * 10, cz + Math.sin(a) * 22); snapCam.lookAt(cx, 1.5, cz);
    renderer.setRenderTarget(snapRT); renderer.render(scene, snapCam); const px = new Uint8Array(96 * 96 * 4); renderer.readRenderTargetPixels(snapRT, 0, 0, 96, 96, px); renderer.setRenderTarget(null);
    const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'), im = g.createImageData(96, 96);
    for (let y = 0; y < 96; y++) im.data.set(px.subarray((95 - y) * 96 * 4, (96 - y) * 96 * 4), y * 96 * 4);
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
  } catch (_) { renderer.setRenderTarget(null); return null; }
};
/* ---------- обучение: маленький полигон во дворе, шаги по очереди ---------- */
const TUT = [
  { t: 'Ходьба', d: 'Иди куда-нибудь', k: ['W', 'A', 'S', 'D'], ok: s => s.moved > 4 },
  { t: 'Бег', d: 'Зажми Shift на ходу — бег (тратит выносливость)', k: ['SHIFT'], ok: s => s.sprint > 1 },
  { t: 'Прыжок', d: 'Прыгни', k: ['ПРОБЕЛ'], ok: s => s.jumps > 0 },
  { t: 'Присед', d: 'Пригнись (C). На бегу C — подкат, Q — выпад', k: ['C'], ok: s => s.crouch > 0.6 },
  { t: 'Взять', d: 'Подойди к помидору и нажми E', k: ['E'], ok: () => !!P.held, enter: () => tutItem('tomato', 2.5) },
  { t: 'Бросок', d: 'Зажми ПКМ — прицел, отпусти — бросок. Чем дольше держишь, тем дальше', k: ['ПКМ'], ok: s => s.throws > 0 },
  { t: 'Инструмент', d: 'Возьми тапок (E) и шлёпни им (ЛКМ)', k: ['E', 'ЛКМ'], ok: s => s.tools > 0, enter: () => tutItem('slipper', 2.5) },
  { t: 'Взаимодействие', d: 'Всё остальное — тоже E: двери, шкафы, кататься, кран', k: ['E'], ok: s => s.t > 4 },
  { t: 'Миссия', d: 'Метка на экране и мини-карта ведут к миссии. Подойди и нажми E', k: ['E'], ok: s => s.missions > 0, enter: () => { const m = spawnMission(P, 'shells'); if (m) { m.life = m.maxLife = 999; } } },
  { t: 'Уличная миссия', d: 'Собери мусор в урну — неси (E) или бросай (ПКМ)', k: ['E', 'ПКМ'], ok: s => s.missions > 1, enter: () => { const m = spawnMission(P, 'cleanup'); if (m) { m.life = m.maxLife = 999; } } },
  { t: 'Готово!', d: 'В раунде миссии приходят волнами, соперники мешают — бей, кради, ставь ловушки. Удачи!', k: [], ok: s => s.t > 4 },
];
function tutItem(type, r) { const a = Math.random() * 6.28, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r, gy = groundAt(x, z, 0.2, P.pos.y + 1); if (CONFIG.items[type].tool) spawnTool(x, gy, z, false, type); else { const it = addItem(type, x, gy, z); it.def = { ...it.def, respawn: 0 }; } }
function startTutorial() {
  S.state = 'roulette'; screen(null); $('fade').classList.add('on');
  setTimeout(() => { prepareRound(true); $('fade').classList.remove('on'); P.frozen = false; P.root.visible = true; goRound(); $('intro').classList.add('hidden'); S.tut = { i: -1, s: null }; tutNext(); }, 420);
}
function tutNext() {
  const T2 = S.tut; T2.i++; if (T2.i >= TUT.length) return tutEnd(true);
  const st = TUT[T2.i]; T2.s = { t: 0, moved: 0, sprint: 0, jumps: 0, crouch: 0, throws: 0, tools: 0, missions: S.done, last: P.pos.clone() }; T2.s.missions = 0; T2.done0 = S.done;
  st.enter && st.enter();
  const el = $('tut'); el.innerHTML = `<div class="tn">${T2.i + 1} / ${TUT.length}</div><b>${st.t}</b><div class="td">${st.d}</div><div class="tk">${st.k.map(k => `<span class="key">${k}</span>`).join('')}</div><button id="tutSkip">Пропустить обучение <span class="key">Esc</span></button>`;
  el.classList.remove('hidden', 'go'); void el.offsetWidth; el.classList.add('go'); $('tutSkip').onclick = () => tutEnd(false); if (T2.i) sfx('done');
}
function updateTutorial(dt) {
  const T2 = S.tut; if (!T2 || !T2.s) return; const s = T2.s; s.t += dt; S.time = CONFIG.roundTime;
  s.moved += Math.hypot(P.pos.x - s.last.x, P.pos.z - s.last.z); s.last.copy(P.pos);
  if (keys.ShiftLeft || keys.ShiftRight) { if (Math.hypot(P.vel.x, P.vel.z) > 8) s.sprint += dt; }
  if (!P.onGround && P.vel.y > 3) s.jumps++;
  if (keys.KeyC) s.crouch += dt;
  if (P.throwT > 0 && !s.tw) { s.throws++; s.tw = true; } else if (!(P.throwT > 0)) s.tw = false;
  if (P.swatT > 0 && !s.sw) { s.tools++; s.sw = true; } else if (!(P.swatT > 0)) s.sw = false;
  s.missions = S.done - T2.done0;
  if (TUT[T2.i].ok(s)) tutNext();
}
function tutEnd(done) {
  try { localStorage.setItem('friendslop.tut', '1'); } catch (_) {}
  $('tut').classList.add('hidden'); S.tut = null; M.manual = false; S.state = 'menu'; showMenu();
}
const tutSeen = () => { try { return localStorage.getItem('friendslop.tut') === '1'; } catch (_) { return true; } };
/* ---------- раунд ---------- */
function prepareRound(tut = false) {
  if (tut) globalThis.__forceDistricts = ['yard', 'plaza', 'park'];
  generateMap(scene, (Math.random() * 1e9) | 0);
  if (tut) globalThis.__forceDistricts = null;
  buildLife(scene); resetSplat(); resetPolice();
  registerInteracts();
  resetTools(); resetTown(); startWeather(scene); buildReflections(); resetFun(() => S.score); hookFun(); W.toolImpact = toolImpact; W.letGo = letGo; W.releaseCart = a => release(a, 0.3); W.onDrink = () => sfx('drink');
  buildMinimap(DISTRICTS); CURTAIN = findMat('curtain');
  resetEvents(); resetSupplies(); resetDrones();
  resetMissions();
  if (P) scene.remove(P.root);
  P = createPlayer(menu.skin()); scene.add(P.root); P.ch.onCroak = () => sfx('croak');
  P.ch.onCroak = null; // в игре «ква» звучит через голос (voice), мешок сам по себе не квакает
  const sp = W.spawns[(Math.random() * W.spawns.length) | 0];
  P.pos.set(sp.x, sp.y, sp.z); P.root.rotation.y = Math.PI; P.facing = Math.PI;
  W.player = P; W.hitActors = [botHitHook]; createBots(scene, menu.skin(), tut ? 0 : 3); M.manual = tut; S.tut = null;
  resetScore((a, pts, at) => award(a, pts, at));
  M.onWave = (n, k) => { if (k > 1) { toast(n > 1 ? TEXT.wave(n) : TEXT.waveOne, 'wave'); sfx('wave'); flashScreen(); } };
  M.onPersonal = (m, outsider) => { toast(outsider ? TEXT.outsider : TEXT.personal, 'gold'); sfx('crown'); };
  Object.assign(S, { time: CONFIG.roundTime, score: 0, done: 0, mg: null, wm: null, crane: false, phase: 'calm' }); W.scoreMul = 1;
  cam.pose = null; resetCamera(Math.random() * Math.PI * 2);
  screen(null); $('mgpanel').classList.add('hidden'); resetHud();
}
/* 10 секунд до старта: пролёт над картой с названиями районов, персонаж падает с неба, отсчёт 3-2-1 */
function startIntro() {
  S.state = 'intro'; $('hud').classList.add('hidden'); $('intro').classList.remove('hidden'); $('count').textContent = ''; $('dname').textContent = '';
  const names = W.districts.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  S.intro = { t: 0, names, ni: -1, drop: false, landed: false, cd: 4 };
  P.root.visible = false; P.frozen = true;
  document.body.classList.add('playing');
}
function updateIntro(dt) {
  const I = S.intro; I.t += dt; const t = I.t;
  if (t < 4) {
    // пролёт по дуге над городом
    const a = t / 4 * 1.6 + 0.4, r = 46, cx = 0, cz = 0;
    cam.free = { p: new V3(cx + Math.cos(a) * r, 34 - t * 3, cz + Math.sin(a) * r), l: new V3(cx + Math.cos(a + 1.2) * 12, 0, cz + Math.sin(a + 1.2) * 12) };
    const ni = Math.floor(t / 1.33); if (ni !== I.ni && ni < I.names.length) { I.ni = ni; const d = $('dname'); d.textContent = I.names[ni].name.toUpperCase(); d.classList.remove('show'); void d.offsetWidth; d.classList.add('show'); }
    return;
  }
  if (!I.drop) { I.drop = true; cam.free = null; P.root.visible = true; P.frozen = false; P.noRun = true; P.pos.y += 9; P.vel.set(0, -2, 0); P.airPeak = P.pos.y - 9; updateCamera(camera, P, 0, true); }
  if (!I.landed && P.onGround && t > 4.2) { I.landed = true; sparks(innerWidth / 2, innerHeight * 0.6, ['#ff8a1f', '#f5c542'], 14); sfx('land', { v: 1.4 }); shakeCam(0.35); }
  if (t > 5.2) {
    const left = Math.ceil(8.2 - t), c = $('count');
    if (left !== I.cd) { I.cd = left; c.classList.remove('tick', 'go'); void c.offsetWidth;
      if (left > 0) { c.textContent = left; sfx('count'); } else { c.textContent = TEXT.go; c.classList.add('go'); sfx('go'); goRound(); }
      c.classList.add('tick'); }
  }
}
function goRound() {
  S.state = 'play'; P.noRun = false; S.time = CONFIG.roundTime;
  if (!M.manual) spawnWave(P, 'calm');
  const h = $('hud'); h.classList.remove('hidden'); h.classList.remove('enter'); void h.offsetWidth; h.classList.add('enter');
  $('lockhint').classList.toggle('hidden', locked()); setCursor(true);
  setTimeout(() => { if (S.state === 'play') $('intro').classList.add('hidden'); }, 900);
}
function endRound() {
  resetDrones();
  stopEvent(); eventChip(null); stopWeather(scene); closeCageUI();
  if (S.mg) closeMission(null);
  if (S.wm) closeWorld(null);
  if (S.crane) exitCrane();
  S.state = 'results'; document.body.classList.remove('playing'); $('dot').classList.add('hidden'); unlock(); $('lockhint').classList.add('hidden');
  $('hud').classList.add('hidden');
  screen('results'); sfx('win');
  // места и награды: у каждого — заголовок по его стилю игры, подпись и очки
  const mk = (a, name, skin, score, me) => { const st = statsOf(a); return { name, skin, score, me, st: { ...st, score } }; };
  const rows = assignAwards([mk(P, TEXT.you, P.ch.skinId, S.score, true), ...(W.bots || []).map(b => mk(b, b.name, b.skin, b.score, false))]);
  $('podcards').innerHTML = ''; $('resBtns').classList.add('hidden'); $('resMe').classList.add('hidden');
  podium.start(rows, (c, pos) => {
    const r = c.r, A = AWARDS[r.award], role = r.champ && r.award === 'tourist' ? AWARDS.champ : A;
    const el = document.createElement('div'); el.className = 'aw' + (r.champ ? ' champ' : '') + (r.me ? ' me' : '');
    el.innerHTML = `<div class="pl">${c.place + 1}</div><div class="at">${r.champ ? AWARDS.champ.title + (r.award !== 'tourist' ? '<br>' + A.title : '') : A.title}</div><div class="nm">${r.name} · ${skinName(r.skin)}</div><div class="sb">${role.sub(r.st)}</div><div class="sc">${r.score}</div>`;
    el.style.transform = `translate(${Math.round(pos.x)}px,${Math.round(pos.y)}px) translate(-50%,-100%)`; $('podcards').appendChild(el); c.card = el;
    if (r.champ) { const b = el.getBoundingClientRect(); sparks(b.left + b.width / 2, b.top + b.height / 2, ['#ff8a1f', '#f5c542', '#9be36b', '#b18cff'], 30, $('podcards')); }
  }, () => {
    const me = rows.find(r => r.me), place = rows.indexOf(me) + 1;
    $('resMe').innerHTML = `${TEXT.you}: <b>${place} место</b> · ${me.score} ${TEXT.pts}`; $('resMe').classList.remove('hidden');
    $('resBtns').classList.remove('hidden'); $('againBtn').focus();
  });
}

function findMat(key) { let m = null; W.group.traverse(o => { if (!m && o.isMesh && o.material && o.material.emissive && o.material.color && o.material.emissive.getHex() === 0xff9a4a) m = o.material; }); return m; }
/* ---------- курсор-точка ---------- */
function setCursor(v) { S.cursor = v; $('dot').classList.toggle('hidden', !v || S.state !== 'play'); }
on('move', () => { const d = $('dot'); d.style.transform = `translate(${mouse.x}px,${mouse.y}px)`; if (S.mg && S.mg.game.move) S.mg.game.move(aim(camera)); });

/* ---------- миссии ---------- */
/* Уличная миссия: игрок бегает как обычно, справа внизу панель с таймером и прогрессом */
function openWorld(m) {
  if (P.ride) dismount(P, false);
  if (P.held) { drop(P.held, P.pos.x, P.pos.y, P.pos.z); P.held = null; }
  m.busy = true; S.wm = { m, game: null };
  $('mgicon').innerHTML = img(m.key, 28); $('mgtitle').textContent = (TEXT.missions[m.key] || [m.def.name])[0]; $('mgpts').textContent = `+${m.def.points}`;
  $('mghint').textContent = (TEXT.missions[m.key] || ['', ''])[1]; $('mgmsg').textContent = ''; $('mgmsg').className = 'msg';
  $('mgpanel').classList.remove('hidden'); $('mgbar').classList.remove('hidden'); $('mgbar').firstChild.style.width = '0%';
  const api = {
    msg: (text, cls = '') => { const e = $('mgmsg'); e.textContent = text; e.className = 'msg ' + cls; void e.offsetWidth; e.classList.add('pop'); },
    progress: v => { $('mgbar').firstChild.style.width = Math.max(0, Math.min(1, v)) * 100 + '%'; },
    where: t => { m.where = t; },
    timer: tm => { $('mgpts').textContent = `+${m.def.points} · ${Math.max(0, Math.ceil(tm))}`; },
    finish: res => { if (S.wm && S.wm.m === m) closeWorld(res); },
  };
  const ctx = { player: P, mission: m, give: it => { pickUp(it); P.held = it; it.owner = P; it.wasHeld = true; }, free: (x, z, y) => isFree(x - 0.3, z - 0.3, x + 0.3, z + 0.3, y + 0.05, y + 1),
    enterCrane: () => { if (!S.crane) enterCrane(); }, exitCrane: () => { if (S.crane) exitCrane(); } };
  S.wm.game = WORLD_GAMES[m.def.game](m.obj, api, ctx);
  { const g = S.wm.game; m.track = g.target ? () => g.target() : null; }
}
function closeWorld(res) {
  if (!S.wm) return;
  const { m, game } = S.wm; S.wm = null; game.stop(); m.busy = false; m.track = null;
  $('mgpanel').classList.add('hidden');
  // вторая часть миссии — мини-игра у объекта (салат: нарезка, лампочка: вкрутить)
  if (res && res.chain) { m.def = { ...m.def, world: false, game: res.chain }; openMission(m); return; }
  if (res && res.success) { const pts = Math.round(m.pts * res.mult * (W.scoreMul || 1)); S.score += pts; S.done++; scored(m, pts); }
  if (res && res.stolen) { toast(TEXT.stolenFrom(res.stolen.name || ''), 'bad'); missionDone(m); }
  removeMission(m);
}
function openMission(m) {
  if (m.def.world) return openWorld(m);
  if (P.ride) dismount(P, false);
  if (P.grab) release(P, 0);
  if (P.held) { drop(P.held, P.pos.x, P.pos.y, P.pos.z); P.held = null; }
  m.busy = true; P.root.visible = false; P.charging = false;
  $('mgicon').innerHTML = img(m.key, 28); $('mgtitle').textContent = (TEXT.missions[m.key] || [m.def.name])[0]; $('mgpts').textContent = `+${m.def.points}`;
  $('mghint').textContent = (TEXT.missions[m.key] || ['', ''])[1]; $('mgmsg').textContent = ''; $('mgmsg').className = 'msg';
  $('mgpanel').classList.remove('hidden');
  const api = {
    pose: (p, l) => { cam.pose = { p, l, ignore: m.obj.solid }; updateCamera(camera, P, 0, true); },
    progress: v => { const bar = $('mgbar'); if (v === null) bar.classList.add('hidden'); else { bar.classList.remove('hidden'); bar.firstChild.style.width = (v * 100) + '%'; } },
    msg: (text, cls = '') => { const e = $('mgmsg'); e.textContent = text; e.className = 'msg ' + cls; void e.offsetWidth; e.classList.add('pop'); },
    finish: res => { if (S.mg && S.mg.m === m) closeMission(res); },
  };
  S.mg = { m, game: null };
  unlock(); $('lockhint').classList.add('hidden');
  S.mg.game = ALL_GAMES[m.def.game](m.obj, api, { cursor: setCursor, character: P.ch });
}
function closeMission(res) {
  if (!S.mg) return;
  const { m, game } = S.mg;
  game.stop(); S.mg = null; cam.pose = null; updateOcclusion(camera, null); m.busy = false; P.root.visible = true; setCursor(true); requestLock();
  $('lockhint').classList.toggle('hidden', locked());
  $('mgpanel').classList.add('hidden');
  if (!res) return;
  if (res.success) { const pts = Math.round(m.pts * res.mult * (W.scoreMul || 1)); S.score += pts; S.done++; scored(m, pts); }
  removeMission(m);
}

// очки за миссию: «+N» вылетает из места миссии на экране и летит в счёт
function scored(m, pts) {
  markWon(m.id); sfx('done'); voice(P.ch, 'happy'); comboAct(P, null, 0); missionDone(m);
  const st = statsOf(P); st.missions++; st.mpts += pts;
  const p = (m.obj.pos && m.obj.pos()) || P.pos, v = new V3(p.x, p.y + 1.2, p.z).project(camera);
  const sx = Math.max(40, Math.min(innerWidth - 80, (v.x + 1) / 2 * innerWidth)), sy = Math.max(60, Math.min(innerHeight - 60, (1 - v.y) / 2 * innerHeight));
  flyScore(sx, sy, pts); setTimeout(() => sfx('points'), 700);
  confetti(sx, sy, p);
}
// пиксельное конфетти: на экране и в мире
const CONF = ['#ff5a6e', '#f5c542', '#9be36b', '#4ab0f0', '#b18cff', '#ff8a1f'];
function confetti(sx, sy, p) {
  sparks(sx, sy, CONF, 28); shakeCam(0.12);
  if (p) for (const c of [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff]) burst(p.x, p.y + 1.4, p.z, 6, { color: c, size: 0.12, speed: 4, up: 5, g: 6, life: 1.6, grow: 0 });
}
// маска-призрак: персонаж полупрозрачный (материалы скина запоминаем и возвращаем)
let ghostOn = false;
function setGhost(p, on) {
  if (on === ghostOn) return; ghostOn = on;
  // свои копии материалов: общие (кэшированные) материалы мира не трогаем
  p.root.traverse(o => { if (!o.isMesh || o === p.ch.blob || !o.material) return;
    if (on) { if (o.userData.ghostOrig) return; o.userData.ghostOrig = o.material; const mk = m => { const c = m.clone(); c.transparent = true; c.opacity = 0.32; c.depthWrite = false; return c; };
      o.material = Array.isArray(o.material) ? o.material.map(mk) : mk(o.material); }
    else if (o.userData.ghostOrig) { o.material = o.userData.ghostOrig; delete o.userData.ghostOrig; } });
}
// очки за действия вне миссий (общие события, комбо, корона): игроку — «+N» летит в счёт, боту — в его копилку
function award(a, pts, at) {
  if (!a || !pts) return 0;
  pts = Math.round(pts * (W.scoreMul || 1));
  if (a !== P) { if (a.score !== undefined) a.score = Math.max(0, a.score + pts); return pts; }
  S.score = Math.max(0, S.score + pts); const p = at || P.pos, v = new V3(p.x, p.y + 1.2, p.z).project(camera);
  flyScore(Math.max(40, Math.min(innerWidth - 80, (v.x + 1) / 2 * innerWidth)), Math.max(60, Math.min(innerHeight - 60, (1 - v.y) / 2 * innerHeight)), pts);
  return pts;
}
// события «весёлых» действий: попадания, ловушки, перила — для комбо и короны
function hookFun() {
  W.onEliminate = a => { if (a === P) { if (S.mg) closeMission(null); if (S.wm) closeWorld(null); if (S.crane) exitCrane(); } else interruptBot(a); };

  // удар/попадание: мелкий бонус (по лидеру — чуть больше); ударил того, кто делает миссию, — СОРВАЛ
  W.onHit = (att, vic, kind) => {
    if (!att || att === vic || !vic) return;
    if (EV.big && EV.big.def.onHit) EV.big.def.onHit(EV.big.s, att, vic, kind);
    if (vic === P) shakeCam(kind === 'heavy' ? 0.35 : 0.18); else if (att === P) shakeCam(0.1);
    if (!onHitLeader(att, vic)) comboAct(att, 'hits', kind === 'heavy' ? PTS.hitHeavy : PTS.hitLight, vic.pos); else comboAct(att, 'hits', 0);
    if (vic.bot) { const m = interruptBot(vic); if (m) sabotage(att, vic, m); }
    else if (vic === P && S.mg && kind !== 'light') { const m = S.mg.m; closeMission(null); sabotage(att, P, m); }
  };
  W.onFunny = (vic, kind, owner) => { if (owner && vic !== owner) comboAct(owner, 'traps', PTS.trap, vic.pos); };
  // перила: 5 очков, за одни и те же — не чаще раза в 10 с
  W.onGrind = b => { const a = b.rider; if (!a) return; a.grinds = a.grinds || new Map(); const now = W.time || 0, last = a.grinds.get(b.grind) ?? -99;
    if (now - last >= 10) { a.grinds.set(b.grind, now); comboAct(a, 'tricks', PTS.grind, a.pos); } else if (a === P) comboAct(a, null, 0); };
  W.onTrick = a => { const now = W.time || 0; if (now - (a.trickT ?? -99) >= 3) { a.trickT = now; comboAct(a, 'tricks', PTS.trick, a.pos); } };
  W.onVacuumSteal = (a, it) => { if (a === P) stealItem(it); };
  W.onArrest = (who, by) => { if (who === P) toast(TEXT.arrested, 'bad'); else if (by === P) { toast(TEXT.arrestOk(who.name), 'gold'); bonus(P, 'hits', 20, who.pos); } };
  W.onSteal = (thief, from, it) => { if (from === P) toast(TEXT.stolenFrom(thief.name), 'bad'); };
  W.onBotMission = () => {};
  W.onElevator = at => sfx('bell', { at });
}
function shakeCam(k) { FX.shake = Math.max(FX.shake, k); }
/* голос с микрофона: голова «говорит»/дрожит; крик пугает котов, птиц и ботов-трусов рядом */
function voiceInput(dt) {
  if (!MIC.on) { P.ch.talk = P.ch.shout = 0; return; }
  if (!MIC.ok && !MIC.err && !MIC.starting) { MIC.starting = true; startMic().finally(() => (MIC.starting = false)); }
  const m = updateMic(dt, keys.KeyV); P.ch.talk = m.talk; P.ch.shout = m.shout;
  P.shoutCD = (P.shoutCD || 0) - dt;
  if (m.shout > 0.5 && P.shoutCD <= 0) { P.shoutCD = 1.2; const R = 6 + m.shout * 6;
    for (const c of W.cats) { const q = c.root.position, dx = q.x - P.pos.x, dz = q.z - P.pos.z; if (Math.hypot(dx, dz) < R) c.hit && c.hit(false, dx, dz); }
    scareBirds(P.pos.x, P.pos.z, R * 1.6);
    for (const f of TOWN.folks) if (f.kind === 'dog' && Math.hypot(f.pos.x - P.pos.x, f.pos.z - P.pos.z) < 16) { f.barkT = 2; setTimeout(() => sfx('bark', { at: f.pos }), 250); }
    for (const b of W.bots || []) { const dx = b.pos.x - P.pos.x, dz = b.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d < R && b.mood === 'coward' && !b.doT) { b.goal = { x: b.pos.x + dx / (d || 1) * 8, y: b.pos.y, z: b.pos.z + dz / (d || 1) * 8, kind: 'flee' }; b.think = 1.5; } }
  }
}
// смена фазы: короткое глитч-искажение экрана; новая волна — вспышка
function glitch() { const g = $('game'); g.classList.remove('glitch'); void g.offsetWidth; g.classList.add('glitch'); setTimeout(() => g.classList.remove('glitch'), 650); }
function flashScreen() { const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
// срыв чужой миссии: вору-хулигану — четверть очков миссии (обычный бонус с лимитом)
function sabotage(att, vic, m) {
  bonus(att, 'sabot', Math.round(m.pts * PTS.sabotage), vic.pos);
  if (vic === P) toast(TEXT.sabotaged(att.name || ''), 'bad'); else if (att === P) toast(TEXT.sabotage, 'gold');
  burst(vic.pos.x, vic.pos.y + 1.6, vic.pos.z, 12, { color: 0xff5a6e, size: 0.16, speed: 3, up: 2 }); sfx('hit', { at: vic.pos });
}
/* ---------- кран ---------- */
function nearCrane() { const c = W.crane; return c && !S.crane && Math.hypot(c.cab.x - P.pos.x, c.cab.z - P.pos.z) < 1.9 && Math.abs(c.cab.y - P.pos.y) < 0.6; }
const craneStick = { ix: 0, iz: 0 };
function enterCrane() {
  if (P.ride) dismount(P, false);
  if (P.grab) release(P, 0);
  craneStick.ix = 0; craneStick.iz = 0;
  const c = W.crane; if (P.held) { drop(P.held, P.pos.x, P.pos.y, P.pos.z); P.held = null; }
  S.crane = true; c.active = true; P.frozen = true; P.root.visible = false;
  cam.orbit = { c: c.ball.position.clone(), dist: 17 }; cam.pitch = 0.6;
}
function exitCrane() { const c = W.crane; S.crane = false; c.active = false; P.frozen = false; P.root.visible = true; P.pos.copy(c.seat); P.vel.set(0, 0, 0); cam.pose = null; cam.orbit = null; cam.pitch = 0.45; }

/* ---------- двери ---------- */
function nearDoor() {
  let best = null, bd = 2.2;
  for (const d of W.doors) { const dist = Math.hypot(d.x - P.pos.x, d.z - P.pos.z); if (dist < bd && Math.abs(d.y - P.pos.y) < 1) { bd = dist; best = d; } }
  return best;
}

/* ---------- ввод ---------- */
on('down', btn => {
  if (S.state !== 'play') return;
  if (P.drone) { droneAction(P, btn, aim(camera).ray.direction); return; }
  if (P.returning) return;
  if (btn === 2 && P.hotPotato) { throwPotato(P, aim(camera).ray.direction); return; }
  if (S.mg) { if (btn === 0 && S.mg.game.down) S.mg.game.down(aim(camera)); return; }
  if (S.crane || P.heldBy) return;
  // тележку/тачку хватаешь любой кнопкой мыши, ей же отпускаешь (с толчком)
  if (P.grab && (btn === 0 || btn === 2)) { release(P, 1.1); return; }
  // в руках инструмент: ЛКМ — применить
  if (btn === 0 && P.held) { if (!P.held.def.hold) { const snd = useTool(P, P.held, aimPoint()); if (snd) sfx(snd); } return; }
  if (btn === 0 && P.holding) return;
  if (!P.held && !P.ride && !P.holding && (btn === 0 || btn === 2)) {
    const c = nearestRideable(P, 1.7, true), d = btn === 0 ? nearDoor() : null;
    if (c && (!d || Math.hypot(c.x - P.pos.x, c.z - P.pos.z) < Math.hypot(d.x - P.pos.x, d.z - P.pos.z))) { grab(P, c); return; }
  }
  // пустые руки: ЛКМ вплотную к персонажу — схватить
  if (btn === 0 && !P.held && !P.ride) { const v = grabTarget(P); if (v) { grabActor(P, v); return; } }
  if (btn === 2 && (P.held || P.holding || carryK()) && P.stun <= 0) { P.charging = true; P.charge = 0; P.aimYaw = P.root.rotation.y; $('dot').classList.add('charge'); }
});
on('up', btn => {
  if (S.state !== 'play') return;
  if (S.mg) { if (btn === 0 && S.mg.game.up) S.mg.game.up(aim(camera)); return; }
  // пылесос: отпустил ЛКМ — содержимое вылетает очередью
  if (btn === 0 && P.held && P.held.type === 'vacuum') { const n = vacuumFire(P, P.held, aimPoint()); if (n) P.throwT = 0.3; }
  if (btn === 2 && P.charging) {
    P.charging = false; $('dot').classList.remove('charge');
    const it = P.held, from = P.ch.holdPoint.clone(), tgt = aimPoint();
    if (it && tgt) { const v = throwVelocity(from, tgt, P.charge, it.def); v.x += P.vel.x * 0.3; v.z += P.vel.z * 0.3; it.owner = P; launch(it, from, v); P.held = null; P.throwT = 0.3; sfx('throw'); voice(P.ch, 'throw'); }
    else if (P.holding && tgt) { const v = throwVelocity(from, tgt, P.charge, BODY); v.x += P.vel.x * 0.3; v.z += P.vel.z * 0.3; letGo(P, v); P.throwT = 0.3; sfx('throw'); voice(P.ch, 'throw'); }
    else if (carryK() && tgt) { const v = throwVelocity(from, tgt, P.charge, KITTEN); v.x += P.vel.x * 0.3; v.z += P.vel.z * 0.3; S.wm.game.throwCarry(v); P.throwT = 0.3; sfx('throw'); }
  }
});
on('key', code => {
  if (code === 'KeyM') { toggleMute(); return; }
  if (code === 'Escape' && (S.state === 'mode' || S.state === 'settings')) { showMenu(); return; }
  if (S.state === 'menu') { if (code === 'KeyA' || code === 'ArrowLeft') menu.next(-1); if (code === 'KeyD' || code === 'ArrowRight') menu.next(1); if (code === 'Enter') showMode(); return; }
  if (S.state === 'mode' && code === 'Enter') { $('modeCard').click(); return; }
  if (S.state !== 'play') return;
  if (code === 'Escape') { if (S.mg) closeMission(null); else if (S.crane) exitCrane(); else if (S.wm) closeWorld(null); else if (S.tut) tutEnd(false); }
});
const _aimHit = new V3();
const BODY = { mass: 2.2, drag: 0, r: 0.4 }; // бросок персонажа
const KITTEN = { mass: 0.9, drag: 0, r: 0.25 }; // бросок котёнка в коробку
const carryK = () => !!(S.wm && S.wm.game.carrying && S.wm.game.carrying());
function aimPoint() {
  const r = aim(camera);
  // луч по твёрдым объектам (быстро и совпадает с тем, обо что предмет ударится)
  const t = raySolids(r.ray.origin, r.ray.direction, 80);
  if (t < 80) return _aimHit.copy(r.ray.origin).addScaledVector(r.ray.direction, t);
  const plane = new THREE.Plane(new V3(0, 1, 0), -P.pos.y);
  // смотришь в небо — целимся в точку далеко по лучу (бросок «навесом» на максимум)
  return r.ray.intersectPlane(plane, _aimHit) || _aimHit.copy(r.ray.origin).addScaledVector(r.ray.direction, 40);
}

// ближайший объект, с которым можно взаимодействовать: его контур подсвечивается
function focusTarget() {
  if (P.drone || P.returning || S.mg || S.crane || S.state !== 'play') return null;
  if (P.ride) return null;
  if (P.grab) return null;
  if (!P.held) { const it = nearestItem(P.pos, 1.5); if (it) return it.outline; const rb = nearestRideable(P) || nearestRideable(P, 1.7, true); if (rb) return rb.outline; }
  if (nearCrane()) return W.crane.outline;
  const d = nearDoor(); if (d) return d.outline;
  return null;
}
let lastFocus = null;
function interact() {
  if (P.drone || P.returning) return;
  if (S.mg) return;
  if (S.wm && S.wm.game.interact && S.wm.game.interact()) return;
  if (S.crane) { exitCrane(); return; }
  if (P.ride) { dismount(P, false); return; }
  if (P.swing) { leaveSwing(P, false); return; }
  if (P.hidden) { leaveHide(P); return; }
  if (P.grab) { hopIn(P); return; }
  if (P.holding) { letGo(P); return; }
  if (P.heldBy) return;
  if (P.caged) { openCageUI(); return; }
  const m = S.wm ? null : nearMission(P);
  if (m) { openMission(m); return; }
  { const q = nearInteract(P); if (q && !P.held) { q.act(P); return; } }
  // двери — тоже на E (единая клавиша взаимодействия)
  { const d = nearDoor(); if (d && !nearestItem(P.pos, 1.0)) { d.open = !d.open; sfx('door', { at: d, v: 0.6 }); return; } }
  if (P.held) { drop(P.held, P.pos.x + Math.sin(P.root.rotation.y) * 0.7, P.pos.y, P.pos.z + Math.cos(P.root.rotation.y) * 0.7); P.held = null; return; }
  // поймать предмет на лету
  { let fl = null, fd = 1.7; for (const q of W.items) if (q.state === 'fly' && q.owner !== P && !q.def.heavy) { const d = Math.hypot(q.pos.x - P.pos.x, q.pos.z - P.pos.z); if (d < fd && q.pos.y > P.pos.y && q.pos.y < P.pos.y + 2.4) { fd = d; fl = q; } }
    if (fl) { pickUp(fl); P.held = fl; fl.owner = P; fl.wasHeld = true; sfx('pickup'); comboAct(P, 'catches', PTS.catch, P.pos); return; } }
  const it = nearestItem(P.pos, 1.5);
  if (it && it.steal && it.mine !== P) { stealItem(it); return; }
  if (it) { pickUp(it); P.held = it; it.owner = P; it.wasHeld = true; sfx('pickup'); return; }
  const rb = nearestRideable(P); if (rb) { mount(P, rb); return; }
  if (nearCrane()) enterCrane();
}
// подобрал чужой предмет миссии (заказ, пиццу, лампочку) — миссия засчитывается тебе
function stealItem(it) {
  const pts = Math.round(it.steal.pts * (W.scoreMul || 1)); it.state = 'gone'; it.g.visible = false; it.steal = null;
  S.score += pts; S.done++; const st = statsOf(P); st.steals++; st.missions++; st.mpts += pts; sfx('done'); voice(P.ch, 'happy'); toast(TEXT.stole, 'gold');
  const v = new V3(P.pos.x, P.pos.y + 1.2, P.pos.z).project(camera), sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight; flyScore(sx, sy, pts); confetti(sx, sy, P.pos);
}
function promptText() {
  if (P.drone) return `ДРОН · ${Math.ceil(P.drone.left)}с · WASD · Пробел/C высота · ЛКМ дротик${P.drone.candy ? ' · ПКМ конфета' : ''}`;
  if (P.returning) return 'Возвращение в игру';
  if (S.mg) return '';
  if (S.crane) return '<b>E</b>выйти из крана';
  if (S.wm) { const pr = S.wm.game.prompt ? S.wm.game.prompt() : ''; if (pr) return pr; }
  if (P.caged) return `<b>E</b>${TEXT.cage}`;
  const m = nearMission(P); if (m) return `<b>E</b>${m.def.name}`;
  if (P.swing) return '<b>E</b>Встать';
  if (P.hidden) return '<b>E</b>Выскочить';
  { const q = nearInteract(P); if (q && !P.held) return `<b>E</b>${q.label}`; }
  { const d = nearDoor(); if (d && !nearestItem(P.pos, 1.0)) return `<b>E</b>${d.open ? TEXT.door.close : TEXT.door.open}`; }
  if (!P.held) { const it = nearestItem(P.pos, 1.5); if (it) return `<b>E</b>${TEXT.take} ${it.def.name.toLowerCase()}`; const rb = nearestRideable(P); if (rb) return `<b>E</b>${TEXT.ride}`; }
  return '';
}

/* ---------- цикл ---------- */
const clock = new THREE.Timer(); let t = 0;
let CURTAIN = null; // материал занавесок в окнах (ярче к ночи)
const waterTex = T.water(), waterHi = T.waterHi(), foamTex = T.foam();
function loop() {
  clock.update(); let dt = Math.min(0.05, clock.getDelta());
  if (FX.freeze > 0) { FX.freeze -= dt; dt *= 0.05; }
  t += dt;
  waterTex.offset.x += dt * 0.03; waterTex.offset.y += dt * 0.015; waterHi.offset.x -= dt * 0.05; waterHi.offset.y += dt * 0.035; foamTex.offset.x += dt * 0.04; foamTex.offset.y = Math.sin(t * 1.3) * 0.08;
  if (S.state === 'results') { podium.update(dt); present(podium.scene, podium.camera); }
  else if (S.state === 'menu' || S.state === 'mode' || S.state === 'roulette' || S.state === 'settings') {
    menu.update(dt); present(menu.scene, menu.camera);
    if (S.state === 'settings') drawMicMeter();
    // логотип: буквы по очереди подпрыгивают раз в несколько секунд
    logoT -= dt; if (logoT <= 0 && S.state === 'menu') { logoT = 4; [...$('logo').children].forEach((sp, i) => setTimeout(() => { sp.classList.remove('hop'); void sp.offsetWidth; sp.classList.add('hop'); }, i * 70)); }
  }
  else {
    if (S.state === 'intro') { updateIntro(dt); updatePlayer(P, dt, t, true, cam.yaw); }
    if (S.state === 'play') {
      updateDrones(dt, t);
      S.time -= dt;
      if (S.time > 0 && S.time <= 10) { S.beep = (S.beep || 0) - dt; if (S.beep <= 0) { S.beep = 0.18 + 0.082 * S.time; sfx('deadline', { urgency: 1 - S.time / 10 }); } } else S.beep = 0;
      if (S.tut) updateTutorial(dt);
      if (tapped('KeyE')) interact();
      // инструмент, который действует пока зажата ЛКМ (огнетушитель, магнит)
      if (M_.left && P.held && P.held.def.hold && !S.mg && !S.crane && P.stun <= 0 && locked()) { useTool(P, P.held, aimPoint(), dt); P.sprayT = 0.1; if ((P.sndT = (P.sndT || 0) - dt) <= 0) { P.sndT = 0.25; sfx(P.held.type === 'magnet' ? 'magnet' : 'spray'); } }
      if (P.charging) P.charge = Math.min(1, P.charge + dt / CONFIG.throw.chargeTime);
      updatePlayer(P, dt, t, !S.mg && !S.crane, cam.yaw);
      voiceInput(dt);
      if (P.held) { P.held.pos.copy(P.ch.holdPoint); P.held.g.rotation.y = P.root.rotation.y; }
      if (P.charging && !P.held && !P.holding && !carryK()) { P.charging = false; $('dot').classList.remove('charge'); }
      if (P.stun > 0 && P.charging) { P.charging = false; $('dot').classList.remove('charge'); }
      W.time = EV.t;
      updateMissions(dt, t, P, { phase: phaseOf(EV.t), t: EV.t, playerScore: () => S.score });
      // главная цель — одна: ближайшая видимая миссия (своя личная — в приоритете), остальные приглушены
      { let best = null, bd = 1e9; if (!EV.big && !S.wm) for (const m of M.list) { if (m.busy || m.doer || !visibleTo(m, P)) continue; const q = m.obj.pos(), d = Math.hypot(q.x - P.pos.x, q.z - P.pos.z) + Math.abs(q.y - P.pos.y) * 3 - (m.owner === P ? 20 : 0); if (d < bd) { bd = d; best = m; } }
        S.main = best; for (const m of M.list) { const on = m === best, mk = m.marker, pop = mk.pop || 1; if (m.life > m.maxLife * 0.25) mk.bm.opacity = on ? 0.4 : 0.1; mk.sp.scale.set((on ? 1.9 : 1.15) * pop, (on ? 2.4 : 1.45) * pop, 1); mk.ring.visible = on; } }
      // ничейные предметы миссий (выронили и никто не подобрал) исчезают через 10 с
      for (const q of W.items) if (q.steal && q.state === 'rest' && q.mine !== P) { q.restT = (q.restT || 0) + dt; if (q.restT > 10) { q.state = 'gone'; q.g.visible = false; q.steal = null; } } else if (q.steal) q.restT = 0;
      if (S.mg) S.mg.game.update(dt);
      if (S.wm) S.wm.game.update(dt);
      S.hudT -= dt; if (S.hudT <= 0) { renderHud(S, P, promptText(), 0.1); S.hudT = 0.1; }
      renderStamina(P, dt);
      if (!S.tut) { updateEvents(dt, eventUi); updateSupplies(dt); }
      // ритм раунда: подпись под таймером, предупреждение о событии, финальный рывок ×2
      { const ph = phaseOf(EV.t); W.scoreMul = ph === 'final' ? 2 : 1;
        if (ph === 'final' && S.phase !== 'final') { eventBanner('final', true); sfx('crown'); glitch(); }
        if (ph === 'event' && S.phase === 'calm') glitch();
        S.phase = ph;
        const left = Math.ceil(PHASE.event - EV.t), txt = ph === 'calm' ? (left > 0 && left <= PHASE.warn ? TEXT.phase.soon(left) : TEXT.phase.calm) : ph === 'event' ? (EV.big ? TEXT.events[EV.big.key].replace('!', '') : TEXT.phase.calm) : TEXT.phase.final;
        const pe = $('phase'); if (pe.textContent !== txt) { pe.textContent = txt; pe.className = 'ph-' + ph + (ph === 'calm' && left > 0 && left <= PHASE.warn ? ' warn' : ''); } }
      if (flash.intensity > 0) { const f = P.root.rotation.y; flash.position.set(P.pos.x, P.pos.y + 1.6, P.pos.z); flash.target.position.set(P.pos.x + Math.sin(f) * 6, P.pos.y, P.pos.z + Math.cos(f) * 6); }
      { const bt = bigTarget(); drawMinimap(P, M.list.filter(m => visibleTo(m, P)), S.wm && S.wm.game.target ? S.wm.game.target() : null, bt ? [{ x: bt.x, z: bt.z, color: '#ff8a1f', icon: TEXT.eventIcon[EV.big.key] }] : null, S.nav); }
      if (S.time <= 0) { S.time = 0; renderHud(S, P, '', 0); endRound(); }
    }
    if (P) { setGhost(P, P.ghost > 0); setListener(P.pos.x, P.pos.y, P.pos.z); }
    // траектория броска
    let shown = 0;
    if (S.state === 'play' && P.charging && (P.held || P.holding || carryK())) {
      const tgt = aimPoint();
      if (tgt) {
        P.aimYaw = Math.atan2(tgt.x - P.pos.x, tgt.z - P.pos.z);
        const def = P.held ? P.held.def : P.holding ? BODY : KITTEN, from = P.ch.holdPoint.clone(), v = throwVelocity(from, tgt, P.charge, def); v.x += P.vel.x * 0.3; v.z += P.vel.z * 0.3;
        shown = predict(from, v, arc, arc.length, def, land);
      }
      $('dot').style.setProperty('--c', (P.charge * 100) + '%');
    }
    arc.forEach((m, i) => (m.visible = i < shown)); if (!shown) land.visible = false;
    const fo = focusTarget(); if (fo !== lastFocus) { lastFocus && lastFocus.set(false); fo && fo.set(true); lastFocus = fo; $('dot').classList.toggle('focus', !!fo); } pulseOutline(dt);
    if (P) P.root.visible = !P.drone && (!P.returning || P.returning.t >= 0.7) && !S.mg && !S.crane && !P.hidden && !(S.state === 'intro' && !S.intro.drop);
    const dotHtml = P && P.charging ? '<b></b><i></i>' : '<i></i>';
    if (dotHtml !== S.dotHtml) { $('dot').innerHTML = dotHtml; S.dotHtml = dotHtml; }
    updateItems(dt, P);
    updatePushables(dt, S.state === 'play' && !S.crane && !S.mg ? P : null);
    for (const c of W.cats) updateCat(c, dt, t, S.state === 'play' ? P : null);
    updateBirds(dt, t, S.state === 'play' ? P : null);
    const lk = takeLook();
    if (S.crane) {
      // напрямую: A/D — поворот стрелы, W/S — тележка
      let ix = 0, iz = 0; if (keys.KeyA || keys.ArrowLeft) ix--; if (keys.KeyD || keys.ArrowRight) ix++; if (keys.KeyW || keys.ArrowUp) iz--; if (keys.KeyS || keys.ArrowDown) iz++;
      craneStick.ix = ix; craneStick.iz = iz;
      cam.orbit.c.lerp(new V3().addVectors(W.crane.ball.position, W.crane.cab).multiplyScalar(0.5).setY(W.crane.ball.position.y + 3), 0.08);
    }
    updateCrane(dt, S.crane ? craneStick : null, S.state === 'play' ? P : null);
    if (S.state === 'play') {
      // навигатор: одна главная цель — цель уличной миссии, общее событие или ближайшая миссия
      const wt = S.wm && S.wm.game.target ? S.wm.game.target() : null, bt = bigTarget();
      let nt = null;
      if (S.mg) nt = null;
      else if (wt) nt = { ...wt, x: wt.x, y: wt.y ?? P.pos.y, z: wt.z, icon: S.wm.m.key, color: '#9be36b', label: wt.label || TEXT.navHere };
      else if (bt) nt = { x: bt.x, y: bt.y ?? P.pos.y, z: bt.z, icon: TEXT.eventIcon[EV.big.key], color: '#ff8a1f', label: TEXT.events[EV.big.key].replace('!', '') };
      else if (S.main) { const q = S.main.obj.pos(); nt = { x: q.x, y: q.y, z: q.z, icon: S.main.key, color: S.main.owner ? '#f5c542' : '#' + DIFF[S.main.def.diff].toString(16).padStart(6, '0'), label: (TEXT.missions[S.main.key] || [S.main.def.name])[0] }; }
      if (nt && !bt && nt.floorDelta === undefined) nt = routeTo(P.pos, nt); if (P.drone || P.returning) nt = null;
      S.nav = nt; renderNav(camera, P, nt);
    }
    for (const d of W.doors) {
      const want = d.open ? 1.65 * d.inward : 0; d.ang += (want - d.ang) * Math.min(1, dt * (d.slam > 0 ? 22 : 8)); d.pivot.rotation.y = d.ang; if (d.slam > 0) d.slam -= dt;
      d.solid.on = !d.open && Math.abs(d.ang) < 0.5;
    }
    for (const f of W.animated) f(dt, t);
    updateSwingers(dt, t, S.state === 'play' ? P : null);
    sky.update(camera, t, dt, P, hemi, scene.fog);
    updateLife(dt, t, S.state === 'play' ? P : null, camera);
    updateWorldFx(dt, t, S.state === 'play' ? P : null);
    if (S.state === 'play') { updateTools(dt, t); updateBots(dt, t, P); updateGrabs(dt, t); updateTraps(dt, t); updateTown(dt, t, P, !!EV.big); updateFun(dt, t); updatePolice(dt, t); }
    // погода и ночь: за раунд сумерки уходят в глубокую ночь
    { const nk = S.state === 'play' || S.state === 'results' ? 1 - Math.max(0, S.time) / CONFIG.roundTime : 0; updateWeather(dt, t, camera, P, scene, nk); sky.setNight(nk);
      if (!(EV.cur && EV.cur.key === 'dark')) { hemi.intensity = SEASON.hemi[2] * Math.PI * (1 - nk * 0.3) * (WX.kind === 'fog' ? 0.92 : 1); sun.intensity = SEASON.sun[1] * Math.PI * (1 - nk * 0.35); }
      LIGHTMAT().color.setScalar(1 + nk * 0.45 + (WX.wet ? 0.15 : 0)); if (CURTAIN) CURTAIN.emissiveIntensity = 0.55 + nk * 0.45; }
    updateReflections(camera, t);
    cam.shake = FX.shake; cam.fovAdd = P && S.state === 'play' ? P.boost * 6 : 0;
    // линии скорости: спринт, катание, полёт после броска
    { const sp = P && S.state === 'play' ? Math.hypot(P.vel.x, P.vel.z) : 0, k = Math.max(0, Math.min(1, (sp - 8.5) / 6)), el = $('speedl'); const o = (Math.round(k * 5) / 5).toFixed(1); if (el.style.opacity !== o) el.style.opacity = o; }
    updateBreakables(dt, S.state === 'play' ? P : null);
    updateParticles(dt); updateSplat(dt);
    updateCamera(camera, P, dt, false, S.state === 'play' ? lk : null, !!(P && P.charging));
    { const fx = camera.position.x + (P ? (P.pos.x - camera.position.x) * 0.6 : 0), fz = camera.position.z + (P ? (P.pos.z - camera.position.z) * 0.6 : 0); followSun(fx, P ? P.pos.y : 0, fz); }
    // камера вплотную к персонажу (у стены) — прячем его, чтобы голова не закрывала полэкрана
    if (P && P.root.visible && !S.mg && !S.crane) { const hx = P.pos.x - camera.position.x, hy = P.pos.y + 1.0 - camera.position.y, hz = P.pos.z - camera.position.z; if (hx * hx + hy * hy + hz * hz < 0.95 * 0.95) P.root.visible = false; }
    if (!window.__noRender) present(scene, camera);
  }
  endFrame();
  requestAnimationFrame(loop);
}
// отладочный доступ из консоли браузера
window.__fs = { eliminate, updateDrones, droneAction, throwPotato, SUP, spawnSupply, POL, renderer, S, EV, TOWN, WX, FUN, spawnTool, useTool, grabActor, letGo, aimPoint: () => aimPoint(), interact: () => interact(), spawn: k => { spawnMission(P, k); return M.list[M.list.length - 1]; }, openWorld, closeWorld, grab, hopIn, release, arc, land, phys: { groundAt, isFree, solidsNear }, get P() { return P; }, W, M, cam, openMission, enterCrane, camera, startRound: () => { prepareRound(); P.frozen = false; P.root.visible = true; goRound(); $('intro').classList.add('hidden'); }, startFlow: startRoulette };
showMenu();
loop();
