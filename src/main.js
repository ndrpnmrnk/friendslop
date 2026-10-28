import { updateVfx, explosion, fireworks, sparks as vfxSparks, impactBurst } from './game/vfx.js';
import { MODES, setMode } from './game/modes.js';
import { randomMap } from './ui/hub-launch.js';
import { districtIcon } from './ui/district-icons.js';
import { prof, initDevtools, afterRender } from './core/devtools.js';
import { updateCull, freezeStatic, checkFrozen } from './world/cull.js';
import { createHaze } from './world/haze.js';
import { SKINS } from './characters/skins.js';
import {createLocalLighting} from './world/scene-lighting.js';
import {actionEffect,updateActionEffects,actionStats} from './world/action-fx.js';
import {graphics,setGraphics} from './core/quality.js';
import {roundMusic} from './core/round-music.js';
import {cancelBotOnEliminate} from './missions/bot-work.js';
import {worldTarget,worldAimPoint,pickTarget} from './game/object-actions.js';
import { updateOcclusion } from './game/occlusion.js';
import {updateBongEffects} from './game/bong.js';
import {recordFault,lastFaults,runtimeCheckpoint,lastRuntime} from './core/diagnostics.js';
import {updateSmoking} from './game/smoking.js';
import { eliminate, updateDrones, resetDrones, droneAction, DRONE_NET_COOLDOWN } from './game/drone.js';
import { SUP, resetSupplies, updateSupplies, spawnSupply } from './game/supplies.js';
import { routeTo } from './missions/location.js';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import './styles.css';
import {predictBow,predictNet} from './game/bow.js';
import { THREE, V3, G, present, makeCamera, basic, mesh, sprite, renderer, canvas, setGlow,setActionVisuals,warmup, lam } from './core/gfx.js';
import { T } from './core/textures.js';
import { CONFIG, SEASON, HINTS, DIFF } from './config.js';
import { keys, tapped, endFrame, mouse, on, aim, lock, locked, unlock, takeLook, requestLock,clearInput } from './core/input.js';
import { W } from './world/state.js';
import { generateMap } from './world/world.js';
import { updatePushables, groundAt, raySolids, moveBody } from './world/physics.js';
import { updateParticles, burst, smokeRing, puff } from './world/particles.js';
import { updateBirds } from './world/birds.js';
import { updateCrane } from './world/crane.js';
import { updateSwingers } from './world/swingers.js';
import { createSky } from './world/sky.js';
import { buildLife, updateLife } from './world/life.js';
import { resetTools, updateTools, useTool, toolVerb, toolImpact, sodaBlast, spawnTool,releaseBow,releaseNet } from './game/tools.js';
import { knockDown } from './game/actors.js';
import { resetReplay, recordReplay, replayMoment, replayClip, createReplayPlayer } from './game/replay.js';
import { grabTarget, grabActor, letGo, updateGrabs } from './game/grab.js';
import { mouse as M_ } from './core/input.js';
import { cargoPosition,poseMeleeItem } from './game/handheld.js';
import { createBots, updateBots, botHitHook, interruptBot } from './game/bots.js';
import { voice } from './game/voice.js';
import { FX, hitFreeze, updateWorldFx, nearInteract, registerInteracts, leaveSwing, leaveHide, leaveBench } from './game/worldfx.js';
import { createPlayer, updatePlayer } from './game/player.js';
import { updateCat } from './game/cats.js';
import { updateItems, nearestItem, pickUp, drop, throwVelocity, launch, predict, addItem, prewarmKit } from './game/items.js';
import { updateCamera, cam, resetCamera,resumeCamera } from './game/camera.js';
import { M, resetMissions, spawnWave, spawnMission, removeMission, updateMissions, nearMission, missionDone, startMissionClock, visibleTo, ALL_GAMES, WORLD_GAMES } from './missions/missions.js';
import { resetScore, bonus, statsOf, PTS } from './game/score.js';
import { isFree, solidsNear } from './world/physics.js';
import { pulseOutline } from './game/outline.js';
import { nearestRideable, mount, dismount, grab, release, hopIn } from './game/ride.js';
import { updateBreakables } from './world/breakables.js';
import { $, renderHud, renderStamina, resetHud, markWon, flyScore, sparks, eventBanner, eventChip, toast, renderNav } from './ui/hud.js';
import { TEXT } from './ui/text.js';
import { img } from './ui/icons.js';
import { initAudio, sfx, ambience, setListener, toggleMute,audioLevels,setAudioLevel } from './core/sfx.js';
import { drawCard } from './ui/cards.js';
import { createMenu } from './ui/menu.js';
import {resetCoins,updateCoins,coinState,grabFist,nearFist} from './game/coins.js';
import {collection,addCoins} from './game/collection.js';
import { createPodium, assignAwards, AWARDS, skinName } from './ui/podium.js';
import { buildMinimap, drawMinimap } from './ui/minimap.js';
import { throwPotato, initEvents, resetEvents, updateEvents, stopEvent, EV, bigTarget, PHASE, phaseOf } from './game/events.js';
import { DISTRICTS } from './world/districts/index.js';
import { startWeather, updateWeather, stopWeather, WX } from './world/weather.js';
import { buildReflections, updateReflections } from './world/reflect.js';
import { updateTraps } from './game/traps.js';
import { grabDog, resetTown, updateTown, TOWN } from './game/town.js';
import { resetFun, updateFun, comboAct, onHitLeader, FUN } from './game/fun.js';
import { LIGHTMAT } from './world/builder.js';
import { MIC, startMic, stopMic, listMics, updateMic, saveMic, calibrateMic } from './core/mic.js';
import { scareBirds } from './world/birds.js';
import { resetSplat, updateSplat } from './world/splat.js';
import { resetPolice, updatePolice, openCageUI, closeCageUI, POL } from './game/police.js';
import { vacuumFire } from './game/tools.js';
import { phReady } from './core/textures.js';
import { initDust, updateDust } from './game/dust.js';
// фото-текстуры (v0.19) должны загрузиться до первой генерации карты
await phReady;

/* ---------- сцена игры ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(SEASON.bg);
scene.fog = new THREE.Fog(...SEASON.fog);
// v0.51: «небо» тише — объём дают тёплые источники мира (world-light.js), между фонарями честная ночь
const hemi = new THREE.HemisphereLight(SEASON.hemi[0], SEASON.hemi[1], SEASON.hemi[2] * 0.72 * Math.PI); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xaab8ff, SEASON.sun[1] * 0.8 * Math.PI); sun.position.set(-30, 50, 25); scene.add(sun, sun.target);
// жёсткие пиксельные тени (v0.18 — крупнее «пиксель», как на PS1): карта 1024 на квадрат ~64 м вокруг игрока
// v0.23: «качество света» — высокое: карта теней 2048 на ~70 м, лунные лучи, конусы фонарей, отражённый свет; низкое — как раньше
const LQ={get hi(){return graphics.key!=='low';}};
sun.castShadow = true; sun.shadow.mapSize.set(LQ.hi ? 2048 : 1024, LQ.hi ? 2048 : 1024); sun.shadow.intensity = 0.9; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.07; sun.shadow.radius = 2.2;
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 }); sun.shadow.camera.updateProjectionMatrix();
const SUN_DIR = new V3(-30, 50, 25).normalize(), SUN_R = new V3().crossVectors(new V3(0, 1, 0), SUN_DIR.clone().negate()).normalize(), SUN_U = new V3().crossVectors(SUN_DIR.clone().negate(), SUN_R).normalize();
// свет луны идёт ОТ видимой луны (тени совпадают с небом); отражённый свет — мягкая сиреневая подсветка с другой стороны (объём)
const bounce = new THREE.DirectionalLight(0xa18eac, 0.22 * Math.PI); scene.add(bounce, bounce.target);
function aimMoon(d) { const k = Math.max(0.55, d.y); SUN_DIR.set(d.x, k, d.z).normalize(); SUN_R.crossVectors(new V3(0, 1, 0), SUN_DIR.clone().negate()).normalize(); SUN_U.crossVectors(SUN_DIR.clone().negate(), SUN_R).normalize(); }
// фонарик персонажа (горит только в событии «Отключили свет»; свет есть всегда, чтобы не пересобирать шейдеры)
const sky = createSky(scene);
const haze = createHaze(scene); // v0.57: лёгкая дымка у земли
const flash = new THREE.SpotLight(0xfff0d0, 0, 26, 0.55, 0.5, 1.2); scene.add(flash, flash.target);
// вспышка взрыва: короткий точечный свет
initDust(scene);
W.flash = (p, c, k = 1, range = 12, decay = 3.5) => localLighting.flash({ x: p.x, y: p.y + 1, z: p.z }, c, k, range, decay);
initEvents({ player: () => P, lights: () => ({ hemi, sun, flash, scene, sky }),prepareRace:()=>{if(S.mg)closeMission({success:false});if(S.wm)closeWorld({success:false});for(const b of W.bots||[])if(b.work)removeMission(b.work.m);}, award: (a, pts, at) => { const g = award(a, pts, at); if (a && g) statsOf(a).event += g; } });
const eventUi = { start: (key, big) => { eventBanner(key, big); sfx('event'); }, tick: (key, sec, info) => eventChip(key, sec, info), end: () => eventChip(null) };
function followSun(x, y, z) {
  // привязка к текселю карты теней, чтобы края теней не дрожали при движении
  const tx = 80 / sun.shadow.mapSize.x, c = new V3(x, y, z), a = Math.round(c.dot(SUN_R) / tx) * tx, b = Math.round(c.dot(SUN_U) / tx) * tx, f = c.dot(SUN_DIR);
  const t = SUN_R.clone().multiplyScalar(a).addScaledVector(SUN_U, b).addScaledVector(SUN_DIR, f);
  sun.target.position.copy(t); sun.position.copy(t).addScaledVector(SUN_DIR, 70);
  bounce.target.position.copy(t); bounce.position.set(t.x - SUN_DIR.x * 50, t.y + 30, t.z - SUN_DIR.z * 50); bounce.visible = LQ.hi;
}
const camera = makeCamera(CONFIG.camera.fov),localLighting=createLocalLighting(scene);
const menu = createMenu();
const podium = createPodium();
// мышь захватывается для камеры во время игры (кроме мини-игр)
lock.want = () => !S.settingsOpen&&((['starting','roulette','intro','play'].includes(S.state)&&!S.mg)||(S.state==='hub'&&menu.wantsLock));
document.addEventListener('pointerlockchange', () => { if(locked()&&!lock.want())unlock();if(!locked()&&S.state==='hub'&&menu.wantsLock)menu.togglePause(); setCursor(S.cursor);  $('lockhint').classList.toggle('hidden', locked() || S.state !== 'play' || !!S.mg); document.body.classList.toggle('locked', locked()); });

const S = { state: 'menu', settingsOpen:false,intro: null, time: 0, score: 0, done: 0, mg: null, wm: null, crane: false, hudT: 0, cursor: true };
let P = null;

// точки траектории броска
const arc = []; for (let i = 0; i < 11; i++) { const m = sprite(T.dot(), 0.13, { color: 0xffb45a, depthTest: false, opacity: 0.95 }); m.renderOrder = 10; m.visible = false; scene.add(m); arc.push(m); }
const land = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
land.rotation.x = -Math.PI / 2; land.scale.setScalar(0.5); land.material.depthTest = false; land.renderOrder = 10; land.visible = false; scene.add(land);

/* ---------- экраны: титул → двор → телевизор → рулетка → пролёт → игра → итоги ---------- */
const SCREENS = ['menu', 'mode', 'roulette', 'results', 'settings'];
function screen(id) { for (const k of SCREENS) $(k).classList.toggle('hidden', k !== id);if(!['mode','roulette'].includes(id))$('crtUI')?.classList.add('hidden'); }
function buildLogo() { const l = $('logo'); if (l.childElementCount) return; for (const ch of TEXT.title) { const s = document.createElement('span'); s.textContent = ch; l.appendChild(s); } }
let logoT = 0;
function showMenu() {
  S.settingsOpen=false;$('settings').classList.remove('in-match');
  roundMusic.stop();
  canvas.style.filter='';
  S.state = 'menu'; setCursor(true); document.body.classList.remove('playing'); menu.active = true; menu.splash(); buildLogo();
  screen('menu'); $('hud').classList.add('hidden'); $('intro').classList.add('hidden'); setCursor(true); unlock();
}
function showHub(){S.settingsOpen=false;$('settings').classList.remove('in-match');roundMusic.stop();S.state='hub';menu.active=true;screen('menu');$('hud').classList.add('hidden');$('intro').classList.add('hidden');document.body.classList.remove('playing');menu.enterHub();setCursor(true);}
// v0.53: матч стартует из хаба — доска выбрала режим, рулетка собрала карту, катапульта выстрелила
/* v0.56: экран загрузки после залпа рогатки — тема и 9 районов карты, полоса загрузки и игроки со статусом.
   Матч стартует, только когда готовы все (сейчас участник один; список рассчитан на группу). */
function showLoading(mode,ids,theme,members){const L=$('loadScreen');L.classList.remove('hidden','done');void L.offsetWidth;L.classList.add('on');
  $('lsTheme').textContent=theme?theme.name:'Случайный город';$('lsTheme').style.color=theme?.c||'#ffd27a';$('lsMode').textContent=mode.name;$('lsStage').textContent='Строим районы…';
  const grid=$('lsMap');grid.innerHTML='';for(const id of ids||[]){const d=DISTRICTS.find(q=>q.id===id);if(!d)continue;const c=document.createElement('div');c.className='ls-cell'+(theme?.ids.includes(id)?' must':'');const im=districtIcon(id);const img=document.createElement('img');img.src=im.toDataURL();const b=document.createElement('b');b.textContent=d.name;c.append(img,b);grid.appendChild(c);}
  const pl=$('lsPlayers');pl.innerHTML='';for(const id of members){const c=document.createElement('div');c.className='ls-player';c.innerHTML=`<i></i><span></span><em>загрузка</em>`;c.querySelector('span').textContent=SKINS[id]?.name||id;pl.appendChild(c);}}
function loadingReady(){$('loadScreen').classList.add('done');$('lsStage').textContent='Все готовы!';for(const c of document.querySelectorAll('.ls-player')){c.classList.add('ready');c.querySelector('em').textContent='готов';}}
function hideLoading(){const L=$('loadScreen');L.classList.remove('on');setTimeout(()=>L.classList.add('hidden'),450);}
function launchRound(mode,ids,theme=null,members=null){const musicReady=roundMusic.preload();S.state='roulette';menu.active=false;screen(null);document.body.classList.remove('cine');S.lastMode=mode;setMode(mode.id);
  ids=ids||randomMap(theme);showLoading(mode,ids,theme,members||[menu.skin()]);
  setTimeout(async()=>{await musicReady;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));S.loadingHold=true;globalThis.__forceDistricts=ids;try{prepareRound();}finally{globalThis.__forceDistricts=null;}
    loadingReady();sfx('pickup');await new Promise(r=>setTimeout(r,900));S.loadingHold=false;hideLoading();startIntro();toast(mode.name);},350);}
menu.onLaunch=choice=>{if(S.state!=='hub')return;launchRound(choice.mode||MODES[0],choice.ids,choice.theme,choice.members);};
menu.onMode=()=>showMode();menu.onHub=()=>{S.state='hub';menu.active=true;screen('menu');};
$('hubExit').onclick=showMenu;
/* v0.57: Студия — один район (карта 1×1) или одно задание (карта с подходящими районами), без ботов, событий и таймера.
   R — заново (задание появится снова, в районе — к точке появления), Esc → «Выйти из студии». */
const STUDIO_NEED = { fat: ['factory', 'townhall'], demolition: ['university'] };
function openStudio() {
  const dl = $('studioDistricts'), ml = $('studioMissions');
  if (!dl.children.length) {
    for (const d of DISTRICTS) { const b = document.createElement('button'), im = document.createElement('img'); im.src = districtIcon(d.id).toDataURL(); b.append(im, d.name); b.onclick = () => startStudio({ kind: 'district', id: d.id, name: d.name }); dl.appendChild(b); }
    for (const k of Object.keys(CONFIG.missions)) { const nm = (TEXT.missions[k] || [CONFIG.missions[k].name])[0]; if (!nm) continue; const b = document.createElement('button'); b.innerHTML = img(k, 28); b.append(' ' + nm); b.onclick = () => startStudio({ kind: 'mission', id: k, name: nm }); ml.appendChild(b); }
  }
  $('studioUI').classList.remove('hidden');
}
$('hubStudio').onclick = () => { sfx('click'); openStudio(); };
$('studioClose').onclick = () => { $('studioUI').classList.add('hidden'); };
function studioPlace() { const m = S.studioCfg?.kind === 'mission' ? M.list.find(q => q.key === S.studioCfg.id) : null;
  if (!m) { const sp = W.spawns[(Math.random() * W.spawns.length) | 0]; P.pos.set(sp.x, sp.y, sp.z); P.vel.set(0, 0, 0); return; }
  const q = m.obj.pos(); for (let k = 0; k < 16; k++) { const a = k * 0.785 + (k > 7 ? .4 : 0), r = k > 7 ? 3.4 : 2.3, x = q.x + Math.cos(a) * r, z = q.z + Math.sin(a) * r, y = groundAt(x, z, .3, q.y + 1.2);
    if (Number.isFinite(y) && Math.abs(y - q.y) < 1.2 && isFree(x - .35, z - .35, x + .35, z + .35, y + .1, y + 1.8)) { P.pos.set(x, y, z); P.vel.set(0, 0, 0); P.facing = P.root.rotation.y = Math.atan2(q.x - x, q.z - z); return; } }
  P.pos.set(q.x + 1.5, q.y, q.z + 1.5); }
function studioMission() { const k = S.studioCfg.id; for (const m of M.list.slice()) removeMission(m); M.cooldown = {}; spawnMission(P, k); return M.list.some(m => m.key === k); }
function startStudio(sel) {
  $('studioUI').classList.add('hidden'); menu.resume?.(); menu.active = false; S.state = 'roulette'; screen(null); unlock();
  showLoading({ name: 'Студия' }, sel.kind === 'district' ? [sel.id] : [], { name: sel.name, c: '#ffd27a', ids: [] }, [menu.skin()]);
  setTimeout(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); S.loadingHold = true; S.studioCfg = sel; const g0 = CONFIG.grid; let ok = true;
    try { if (sel.kind === 'district') { CONFIG.grid = 1; globalThis.__forceDistricts = [sel.id]; prepareRound(); }
      else { const need = [...(STUDIO_NEED[sel.id] || []), CONFIG.missions[sel.id].home].filter(Boolean); ok = false;
        for (let k = 0; k < 4 && !ok; k++) { globalThis.__forceDistricts = need.length ? need : null; prepareRound(); ok = studioMission(); } } }
    finally { CONFIG.grid = g0; globalThis.__forceDistricts = null; }
    loadingReady(); await new Promise(r => setTimeout(r, 400)); S.loadingHold = false; hideLoading();
    P.frozen = false; P.root.visible = true; studioPlace(); goRound(); S.time = 99 * 60; $('intro').classList.add('hidden'); requestLock();
    $('studioBar').innerHTML = `СТУДИЯ · ${sel.name} <span>· R — заново · Esc → выйти</span>`; $('studioBar').classList.remove('hidden'); $('studioLeave').classList.remove('hidden');
    if (!ok) toast('Задание не нашло места на карте — нажми R'); }, 300);
}
function leaveStudio() { S.studioCfg = null; $('studioBar').classList.add('hidden'); $('studioLeave').classList.add('hidden'); if (S.mg) closeMission(null); if (S.wm) closeWorld(null); showHub(); }
$('studioLeave').onclick = leaveStudio;$('hubTutorial').onclick=()=>{menu.suspend();S.state='starting';requestLock();startTutorial();};
function showMode() {
  if(menu.claw.active)return;
  S.state = 'mode'; menu.active = true; screen('mode'); drawCard($('modeArt'), 'mode'); $('modeCard').classList.remove('pressed');menu.tvTransition('mode'); $('modeCard').focus(); sfx('click');
}
for (const b of document.querySelectorAll('button')) { b.addEventListener('mouseenter', () => sfx('hover')); b.addEventListener('click', () => initAudio()); }
addEventListener('pointerdown', () => { initAudio(); ambience(true); }, { once: true });
$('skinPrev').onclick = () => { menu.next(-1); sfx('click'); };
$('skinNext').onclick = () => { menu.next(1); sfx('click'); };
$('playBtn').onclick = showHub;
// мышь захватывается сразу по нажатию (это и есть «клик» для браузера) — в игре не нужно кликать ещё раз
$('modeCard').onclick = () => { requestLock(); $('modeCard').classList.add('pressed'); sfx('pickup'); setTimeout(() => launchRound(MODES[0], randomMap()), 300); };
$('tutBtn').onclick = () => { S.state='starting';requestLock(); sfx('click'); startTutorial(); };
$('modeBack').onclick = () => { sfx('click'); menu.closeTV(); };
/* настройки: микрофон */
$('setBtn').innerHTML = img('gear', 28); $('micIco').innerHTML = img('mic', 20);
function showSettings() {
  if(S.state==='play'){S.settingsFrom='play';S.settingsOpen=true;setCursor(true);P.charging=false;if(P.held?.type==='bow')P.held.draw=0;S.mg?.game.up?.();S.wm?.game.up?.();clearInput();takeLook();unlock();$('settings').classList.add('in-match');$('settings').classList.remove('hidden');syncSettings();fillMics();return;}
  $('settings').classList.remove('in-match');S.settingsFrom=S.state;menu.suspend();S.state = 'settings'; menu.active = false; screen('settings'); sfx('click'); syncSettings(); fillMics(); }
function syncSettings() { $('graphicsQ').value=graphics.key;const levels=audioLevels();for(const[k,id]of Object.entries({effects:'volEffects',ambient:'volAmbient',music:'volMusic',radio:'volRadio'})){const el=$(id);el.value=Math.round(levels[k]*100);el.nextElementSibling.textContent=el.value+'%';} $('micOn').textContent = MIC.on ? 'ВКЛ' : 'ВЫКЛ'; $('micOn').classList.toggle('on', MIC.on); $('micMode').textContent = MIC.mode === 'always' ? 'ВСЕГДА' : 'ЗАЖАТЬ V'; $('micSens').value = MIC.sens; $('micLoudS').value = MIC.loudSens; }
async function fillMics() { const list = await listMics(), sel = $('micDev'); sel.innerHTML = '<option value="">По умолчанию</option>' + list.map((d, i) => `<option value="${d.deviceId}">${d.label || 'Микрофон ' + (i + 1)}</option>`).join(''); sel.value = MIC.device || ''; }
$('setBtn').onclick = showSettings;
// качество света (v0.23): переключатель в настройках; карта теней меняется сразу, остальное — каждый кадр
$('graphicsQ').onchange=e=>{setGraphics(e.target.value);sfx('click');};
for(const[k,id]of Object.entries({effects:'volEffects',ambient:'volAmbient',music:'volMusic',radio:'volRadio'}))$(id).oninput=e=>{setAudioLevel(k,e.target.value/100);e.target.nextElementSibling.textContent=e.target.value+'%';};
function backSettings(){sfx('click');if(S.settingsOpen){S.settingsOpen=false;setCursor(true);$('settings').classList.add('hidden');$('settings').classList.remove('in-match');clearInput();takeLook();if(S.state==='play')requestLock();return;}menu.resumeSettings();if(S.settingsFrom==='hub'){S.state='hub';menu.active=true;screen('menu');}else showMenu();}
$('setBack').onclick = backSettings;
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
$('againBtn').onclick = () => { requestLock(); launchRound(S.lastMode||MODES[0], randomMap()); };
$('menuBtn').onclick = () => { sfx('click'); showHub(); };
$('mgexit').onclick = cancelMission;

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
  { t: 'Взять', d: 'Подойди к помидору и нажми ЛКМ', k: ['ЛКМ'], ok: () => !!P.held, enter: () => tutItem('tomato', 2.5) },
  { t: 'Бросок', d: 'Зажми ПКМ — прицел, отпусти — бросок. Чем дольше держишь, тем дальше', k: ['ПКМ'], ok: s => s.throws > 0 },
  { t: 'Инструмент', d: 'Возьми тапок (ЛКМ) и шлёпни им (ЛКМ ещё раз)', k: ['ЛКМ'], ok: s => s.tools > 0, enter: () => tutItem('slipper', 2.5) },
  { t: 'Взаимодействие', d: 'E — двери, шкафы, сесть, кататься, кран, миссии', k: ['E'], ok: s => s.t > 4 },
  { t: 'Миссия', d: 'Метка на экране и мини-карта ведут к миссии. Подойди и нажми E', k: ['E'], ok: s => s.missions > 0, enter: () => { const m = spawnMission(P, 'shells'); if (m) { m.life = m.maxLife = 999; } } },
  { t: 'Уличная миссия', d: 'Собери мусор в урну — бери (ЛКМ) и бросай (ПКМ)', k: ['ЛКМ', 'ПКМ'], ok: s => s.missions > 1, enter: () => { const m = spawnMission(P, 'cleanup'); if (m) { m.life = m.maxLife = 999; } } },
  { t: 'Готово!', d: 'В раунде миссии приходят волнами, соперники мешают — бей, кради, ставь ловушки. Удачи!', k: [], ok: s => s.t > 4 },
];
function tutItem(type, r) { const a = Math.random() * 6.28, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r, gy = groundAt(x, z, 0.2, P.pos.y + 1); if (CONFIG.items[type].tool) spawnTool(x, gy, z, false, type); else { const it = addItem(type, x, gy, z); it.def = { ...it.def, respawn: 0 }; } }
function startTutorial() {
  menu.active=false;
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
/* ---------- раунд ---------- */
function prepareRound(tut = false) {
  roundMusic.stop();
  resetRadios();
  if(S.mg)closeMission(null);if(S.wm)closeWorld(null);
  for(const m of M.list.slice())if(m.onRemove){m.onRemove();m.onRemove=null;}
  if (tut) globalThis.__forceDistricts = ['yard', 'plaza', 'park'];
  generateMap(scene, (Math.random() * 1e9) | 0);
  { const wl = localLighting.rebuild(); console.info('[friendslop] свет мира:', wl.count, 'источников,', wl.ms, 'мс'); }
  if (tut) globalThis.__forceDistricts = null;
  buildLife(scene); resetSplat(); resetPolice();
  registerInteracts();
  resetTools(); resetTown(); startWeather(scene); buildReflections(); resetFun(() => S.score); hookFun(); W.toolImpact = toolImpact; W.sodaBlast = sodaBlast; W.knockDown = knockDown; W.isMissionCat = c => M.list.some(m => m.obj === c); W.letGo = letGo; W.dismount = a => dismount(a, false); W.leaveSwing = leaveSwing; W.leaveBench = leaveBench; W.leaveHide = a => { if (a.bot) a.hideT = 0; else leaveHide(a); }; W.releaseCart = a => release(a, 0.3); W.onDrink = () => sfx('drink');
  buildMinimap(DISTRICTS); CURTAIN = findMat('curtain');
  resetEvents(); resetSupplies(); resetDrones();
  resetMissions();
  W.onBuildingDestroyed=u=>{for(const m of M.list.slice()){const p=m.obj.pos();if(m.key!=='demolition'&&p.x>=u.box[0]&&p.x<=u.box[2]&&p.z>=u.box[1]&&p.z<=u.box[3]){m.onExpire?.();if(M.list.includes(m))removeMission(m);}}};
  if (P) scene.remove(P.root);
  P = createPlayer(menu.skin()); scene.add(P.root); P.ch.onCroak = () => sfx('croak');
  P.ch.onCroak = null; // в игре «ква» звучит через голос (voice), мешок сам по себе не квакает
  const sp = W.spawns[(Math.random() * W.spawns.length) | 0];
  P.pos.set(sp.x, sp.y, sp.z); P.root.rotation.y = Math.PI; P.facing = Math.PI;
  W.player = P; W.hitActors = [botHitHook]; createBots(scene, menu.skin(), tut || S.studioCfg ? 0 : (S.botCount ?? 4)); M.manual = tut || !!S.studioCfg; S.tut = null;
  resetCoins(!tut);
  resetScore((a, pts, at) => award(a, pts, at));
  M.onWave = null;
  M.onPersonal = (m, outsider) => { toast(outsider ? TEXT.outsider : TEXT.personal, 'gold'); sfx('crown'); };
  Object.assign(S, { time: CONFIG.roundTime, score: 0, done: 0, mg: null, wm: null, crane: false, phase: 'calm' }); W.scoreMul = 1;
  cam.pose = null; resetCamera(Math.random() * Math.PI * 2);
  screen(null); $('mgpanel').classList.add('hidden'); resetHud();
  // прогрев шейдеров — в самом конце, когда на карте уже есть боты, коты, жители и все предметы (+ набор всех предметов)
  { const t0 = performance.now(), kit = prewarmKit(); scene.add(kit); try { warmup(scene, camera); } finally { scene.remove(kit); } console.info('[friendslop] шейдеры:', Math.round(performance.now() - t0), 'мс'); }
  console.info('[friendslop] неподвижных объектов:', freezeStatic());
  resetReplay([P, ...(W.bots || [])]);
}
/* Непрерывный пролёт по кварталам к игроку, затем отсчёт 5-4-3-2-1. */
/* v0.53: прилёт на карту. Каждого игрока выстреливает дугой из-за края города (продолжение залпа катапульты):
   полёт «супергероем» с кувырком, камера летит следом, жёсткое приземление со шлепком и пылью, потом отсчёт 3-2-1. */
/* v0.58: дуга — честная баллистика (по горизонтали равномерно, по высоте парабола). Перед полётом проверяем её
   лучами на уровне ног и головы: если по пути стена или дом — пробуем другой заход и высоту. Если чистой дуги нет,
   летим как есть, но по-настоящему: врезался — отскок, кувырок и падение по физике (crashArrival). */
function arrivalArc(to) {
  const d = Math.hypot(to.x, to.z), base = d > 4 ? Math.atan2(to.z, to.x) + (Math.random() - .5) * .5 : Math.random() * Math.PI * 2, R = W.bounds + 34;
  const dur = 2.7 + Math.random() * .4, spin = (Math.random() < .5 ? -1 : 1) * (5 + Math.random() * 4); let f = null;
  for (const h of [16 + Math.random() * 6, 26, 36]) for (const dA of [0, .6, -.6, 1.2, -1.2, 2, -2, Math.PI]) {
    const ang = base + dA; f = { from: new V3(Math.cos(ang) * R, 36 + Math.random() * 8, Math.sin(ang) * R), to: to.clone(), dur, h, spin }; if (arcClear(f)) return f; }
  f.risky = true; return f;
}
const arcAt = (f, k, out) => { out.lerpVectors(f.from, f.to, k); out.y += f.h * 4 * k * (1 - k); return out; };
function arcClear(f) { const a = new V3(), b = new V3(), d = new V3(); arcAt(f, 0, a);
  for (let i = 1; i <= 40; i++) { arcAt(f, i / 40, b); d.subVectors(b, a); const len = d.length(); if (len > 1e-4 && i < 39) { d.divideScalar(len);
    for (const off of [.35, 1.25]) { a.y += off; const hit = raySolids(a, d, len); a.y -= off; if (hit < len - 1e-3) return false; } } a.copy(b); }
  return true; }
const _cp = new V3(), _cd = new V3();
// по пути в стену/дом: отскок назад, кувырок, дальше — обычная физика падения
function arrivalHit(a, prev) { _cd.subVectors(a.pos, prev); const len = _cd.length(); if (len < 1e-4) return null; _cd.divideScalar(len);
  for (const off of [.5, 1.2]) { _cp.copy(prev); _cp.y += off; const hit = raySolids(_cp, _cd, len); if (hit < len - 1e-3) return { t: hit, len }; } return null; }
function crashArrival(a, prev, hit, dt) {
  const sp = hit.len / Math.max(dt, 1e-3); a.pos.copy(prev).addScaledVector(_cd, Math.max(0, hit.t - .45)); a.root.position.copy(a.pos);
  const vx = -_cd.x * Math.min(6, sp * .25), vz = -_cd.z * Math.min(6, sp * .25); a.frozen = false; a.ch.flySpin = 0; knockDown(a, vx, vz, 1.2); a.vel.y = Math.min(a.vel.y, 1.5);
  impactBurst({ x: a.pos.x, y: a.pos.y + 1, z: a.pos.z }, 0xffd8a0, .7); sfx('hit', { at: a.pos, v: 1.2 }); sfx('land', { at: a.pos, v: .8 });
}
function startIntro() {
  void roundMusic.intro();
  S.state = 'intro'; $('hud').classList.add('hidden'); $('intro').classList.remove('hidden'); $('count').textContent = ''; $('dname').textContent = '';
  S.intro = { t: 0, drop: true, landed: false, cd: 4, me: arrivalArc(P.pos), delay: .35, bots: (W.bots || []).map((b, i) => ({ b, f: arrivalArc(b.pos), delay: .1 + i * .3, landed: false })) };
  takeLook(); P.frozen = true; P.root.visible = true; P.pos.copy(S.intro.me.from); P.root.position.copy(P.pos);
  for (const q of S.intro.bots) { q.b.root.visible = false; q.b.frozenIntro = true; }
  document.body.classList.add('playing');
}
const _ia = new V3(), _ib = new V3();
function flyStep(a, f, k, dt, t) {
  arcAt(f, k, _ia); arcAt(f, Math.min(1, k + .01), _ib); const vx = _ib.x - _ia.x, vy = _ib.y - _ia.y, vz = _ib.z - _ia.z;
  a.pos.copy(_ia); a.root.position.copy(_ia); a.root.rotation.y = Math.atan2(vx, vz); a.facing = a.root.rotation.y;
  a.ch.animate(dt, { t, fly: true, vy: vy / .01 / f.dur, flySpin: f.spin * (1 - k) * (1 - k) });
  // v0.55: инверсионный след — маленькие облачка позади, гуще на скорости
  a.trailT = (a.trailT || 0) - dt; if (a.trailT <= 0) { a.trailT = a === P ? .05 : .09;
    const L = Math.hypot(vx, vy, vz) || 1; puff(_ia.x - vx / L * .7, _ia.y + .8 - vy / L * .7, _ia.z - vz / L * .7, { size: .32, grow: 1.1, life: .55, vx: 0, vy: .2, vz: 0, color: 0xe8e2f2, opacity: .55 }); }
}
function landArc(a, f, me) {
  a.pos.copy(f.to); a.root.position.copy(f.to); a.vel.set(0, 0, 0); a.onGround = true; a.ch.squash = 1.3; a.ch.flySpin = 0;
  smokeRing(f.to.x, f.to.y + .05, f.to.z, me ? 9 : 6, { speed: 3.4, size: .1, grow: .5, life: .5, color: 0x9a90a6 });
  impactBurst({ x: f.to.x, y: f.to.y + .4, z: f.to.z }, 0xffd8a0, me ? .8 : .6); sfx('land', { v: me ? 1.6 : .9, at: f.to });
}
function updateIntro(dt) {
  const I = S.intro; I.t += dt; const t = I.t, f = I.me;
  for (const q of I.bots) { if (q.landed) continue; const k = (t - q.delay) / q.f.dur; if (k < 0) continue; q.b.root.visible = true;
    if (q.crash) { moveBody(q.crash, dt); q.b.root.position.copy(q.b.pos); q.b.ch.animate(dt, { t, fly: true, vy: q.b.vel.y, flySpin: 7 }); if (q.crash.onGround) { q.landed = true; q.b.frozenIntro = false; q.b.ch.flySpin = 0; smokeRing(q.b.pos.x, q.b.pos.y + .05, q.b.pos.z, 5, { speed: 2.4, size: .1, grow: .5, life: .5, color: 0x9a90a6 }); sfx('land', { at: q.b.pos, v: .7 }); } continue; }
    if (k >= 1) { q.landed = true; q.b.frozenIntro = false; landArc(q.b, q.f, false); continue; }
    const prev = q.b.pos.clone(); flyStep(q.b, q.f, k, dt, t); const hit = k > .04 && arrivalHit(q.b, prev);
    if (hit) { crashArrival(q.b, prev, hit, dt); q.crash = { pos: q.b.pos, vel: q.b.vel, r: .35, h: 1.5, step: .3, onGround: false }; } }
  if (!I.landed) {
    const k = Math.max(0, (t - I.delay) / f.dur);
    if (k < 1) { const prev = P.pos.clone(); flyStep(P, f, k, dt, t); const hit = k > .04 && arrivalHit(P, prev);
      if (hit) { crashArrival(P, prev, hit, dt); I.landed = true; I.landT = t; cam.free = null; P.noRun = true; shakeCam(0.6); resumeCamera(camera); updateCamera(camera, P, 1 / 60, false); return; }
      // камера летит следом: сзади и чуть выше, смотрит по ходу полёта и на точку приземления
      // v0.55: камера дальше (персонаж не закрывает город), а под конец плавно уходит за спину точки приземления,
      // чтобы падение было видно целиком и переход в обычную камеру не дёргался
      const dir = _ib.clone().sub(_ia).normalize(), back = P.pos.clone().addScaledVector(dir, -10); back.y += 4.2 - k * 1.5;
      const look = P.pos.clone().addScaledVector(dir, 5).lerp(f.to, k * k), fl = new V3(dir.x, 0, dir.z).normalize(), w = Math.min(1, Math.max(0, (k - .7) / .3)), ws = w * w * (3 - 2 * w);
      back.lerp(f.to.clone().addScaledVector(fl, -6.5).setY(f.to.y + 3.6), ws); look.lerp(f.to.clone().setY(f.to.y + 1), ws); cam.free = { p: back, l: look }; return; }
    I.landed = true; I.landT = t; cam.free = null; P.frozen = false; P.noRun = true; landArc(P, f, true); P.landedNow = true;
    sparks(innerWidth / 2, innerHeight * 0.6, ['#ff8a1f', '#f5c542', '#4fe6ff'], 18); shakeCam(0.5); resumeCamera(camera); updateCamera(camera, P, 1 / 60, false);
  }
  if (t > I.landT + .6) {
    const left = Math.max(0, Math.ceil(I.landT + 3.6 - t)), c = $('count');
    if (left !== I.cd) { I.cd = left; c.classList.remove('tick', 'go'); void c.offsetWidth;
      if (left > 0) { c.textContent = left; sfx('count'); } else { c.textContent = TEXT.go; c.classList.add('go'); sfx('go'); for (const q of I.bots) if (!q.landed) { q.landed = true; landArc(q.b, q.f, false); q.b.root.visible = true; } goRound(); }
      c.classList.add('tick'); }
  }
}
function goRound() {
  if(!M.manual)roundMusic.gameplay();
  S.state = 'play'; P.noRun = false; S.time = CONFIG.roundTime;
  if (!M.manual) spawnWave(P, 'calm');
  const h = $('hud'); h.classList.remove('hidden'); h.classList.remove('enter'); void h.offsetWidth; h.classList.add('enter');
  $('lockhint').classList.toggle('hidden', locked()); setCursor(true);
  setTimeout(() => { if (S.state === 'play') $('intro').classList.add('hidden'); }, 900);
}
/* v0.58: финал матча. Свисток — стоп-кадр: мир замирает, камера облетает игрока, мультяшный штамп «ВРЕМЯ!».
   Потом, если за матч был зрелищный момент, — его повтор в том же городе (замедление в пике, камера облетает
   героя момента; ЛКМ / пробел — пропустить). Дальше — пьедестал с итогами. */
function startFinale() {
  roundMusic.stop(); if (S.mg) closeMission(null); if (S.wm) closeWorld(null); if (S.crane) exitCrane(); P.charging = false;
  S.state = 'finale'; S.fin = { t: 0, stage: 'whistle', a0: P.root.rotation.y + Math.PI * .75, clip: replayClip() };
  document.body.classList.add('cine'); $('hud').classList.add('hidden'); unlock(); setCursor(true);
  const st = $('finStamp'); st.classList.remove('hidden', 'pop'); void st.offsetWidth; st.classList.add('pop'); sfx('whistle'); sfx('boom', { v: .5 }); shakeCam(.3);
}
const _fp = new V3();
function updateFinale(dt) {
  const F = S.fin; F.t += dt;
  if (F.stage === 'whistle') {
    const k = Math.min(1, F.t / 1.9), a = F.a0 + k * 1.1, r = 6 - k * 1.8; _fp.copy(P.root.position);
    cam.free = { p: new V3(_fp.x + Math.sin(a) * r, _fp.y + 2.4 - k * .6, _fp.z + Math.cos(a) * r), l: new V3(_fp.x, _fp.y + 1.1, _fp.z) };
    if (F.t > 1.9) { $('finStamp').classList.add('hidden');
      if (F.clip) { F.stage = 'replay'; F.t = 0; F.player = createReplayPlayer(F.clip); F.a0 = Math.random() * 6.28; const tag = $('replayTag'); tag.querySelector('span').textContent = F.clip.focus === P ? TEXT.you : (F.clip.focus.name || ''); tag.classList.remove('hidden'); sfx('shutter'); }
      else finishFinale(); }
  } else if (F.stage === 'replay') {
    F.player.step(dt); F.player.focusPos(_fp); const a = F.a0 + F.t * .32;
    const want = { p: new V3(_fp.x + Math.sin(a) * 6, _fp.y + 2.6, _fp.z + Math.cos(a) * 6), l: new V3(_fp.x, _fp.y + 1, _fp.z) };
    if (!F.cam) F.cam = want; else { F.cam.p.lerp(want.p, 1 - Math.exp(-dt * 4)); F.cam.l.lerp(want.l, 1 - Math.exp(-dt * 6)); }
    cam.free = { p: F.cam.p.clone(), l: F.cam.l.clone() };
    if (F.player.done || F.skip) { F.player.restore(); finishFinale(); }
  }
}
function finishFinale() { $('replayTag').classList.add('hidden'); $('finStamp').classList.add('hidden'); document.body.classList.remove('cine'); cam.free = null; S.fin = null; endRound(); }
addEventListener('keydown', e => { if (S.state === 'finale' && S.fin?.stage === 'replay' && ['Space', 'Enter', 'Escape'].includes(e.code)) S.fin.skip = true; });
addEventListener('pointerdown', () => { if (S.state === 'finale' && S.fin?.stage === 'replay') S.fin.skip = true; });
function endRound() {
  S.settingsOpen=false;$('settings').classList.add('hidden');$('settings').classList.remove('in-match');
  roundMusic.stop();
  resetRadios();
  S.state='results';
  resetDrones();
  stopEvent(); eventChip(null); stopWeather(scene); closeCageUI();
  if (S.mg) closeMission(null);
  if (S.wm) closeWorld(null);
  if (S.crane) exitCrane();
  for(const m of M.list.slice())if(m.onRemove){m.onRemove();m.onRemove=null;}
  S.state = 'results'; document.body.classList.remove('playing'); setCursor(true); unlock(); $('lockhint').classList.add('hidden');
  $('hud').classList.add('hidden');
  screen('results'); sfx('win');
  // места и награды: у каждого — заголовок по его стилю игры, подпись и очки
  const mk = (a, name, skin, score, me) => { const st = statsOf(a); return { name, skin, score, me, st: { ...st, score } }; };
  const rows = assignAwards([mk(P, TEXT.you, P.ch.skinId, S.score, true), ...(W.bots || []).map(b => mk(b, b.name, b.skin, b.score, false))]);
  $('results').classList.toggle('five',rows.length>4);$('podcards').innerHTML = ''; $('resBtns').classList.add('hidden'); $('resMe').classList.add('hidden');
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
function setCursor(v) { S.cursor=v; const ui=S.state!=='play'||S.settingsOpen;$('dot').classList.toggle('hidden',!v&&!ui);$('dot').classList.toggle('ui-cursor',ui);if(ui){$('dot').classList.remove('charge','focus');$('dot').style.transform=`translate(${mouse.x}px,${mouse.y}px)`;}document.body.classList.toggle('ui-cursor-on',ui); }
on('move', e => { const d = $('dot'); d.style.transform = `translate(${mouse.x}px,${mouse.y}px)`;if(S.settingsOpen)return; if (S.mg && S.mg.game.move) S.mg.game.move(aim(camera),e);if(S.wm?.game.move)S.wm.game.move(aim(camera),e); });

/* ---------- миссии ---------- */
/* Уличная миссия: игрок бегает как обычно, справа внизу панель с таймером и прогрессом */
function cancelMission() {
  if(S.wm){closeWorld(null);return;}
  if(S.mg){const m=S.mg.m;closeMission(null);if(m.claimedBy===P)removeMission(m);}
}
function missionCountdown(n,text=''){const e=$('mgcount');e.classList.toggle('hidden',!n);e.querySelector('b').textContent=n?String(n):'';e.querySelector('small').textContent=text;}
function openWorld(m) {
  if(m.claimedBy&&m.claimedBy!==P)return;
  if (P.ride) dismount(P, false);
  if (P.held) { drop(P.held, P.pos.x, P.pos.y, P.pos.z); P.held = null; }
  startMissionClock(m);m.onExpire=()=>closeWorld({success:false});
  m.claimedBy=P; m.busy = true; S.wm = { m, game: null };
  $('mgicon').innerHTML = img(m.key, 28); $('mgtitle').textContent = (TEXT.missions[m.key] || [m.def.name])[0]; $('mgpts').textContent = `+${m.def.points}`;
  $('mghint').textContent = m.key==='fat'?'':(TEXT.missions[m.key] || ['', ''])[1]; callout('');
  $('mgpanel').classList.remove('hidden'); $('mgbar').classList.remove('hidden'); $('mgbar').firstChild.style.width = '0%';
  let worldFeedback=false;
  const api = {
    feedback: () => {worldFeedback=true;$('mgbar').classList.add('hidden');},
    msg: (text, cls = '') => callout(text, cls),
    progress: v => { m.progress=v; $('mgbar').classList.toggle('hidden',worldFeedback||v===null);$('mgbar').firstChild.style.width = Math.max(0, Math.min(1, v)) * 100 + '%'; },
    where: t => { m.where = t; },
    countdown:missionCountdown,
    pose:(p,l)=>{cam.pose=p?{p:p.clone(),l:l.clone(),ignore:m.obj.solid}:null;},
    timer: tm => { $('mgpts').textContent = `+${m.def.points} · ${Math.max(0, Math.ceil(Math.min(tm,m.activeLeft??tm)))}`; },
    finish: res => { if (S.wm && S.wm.m === m) closeWorld(res); },
  };
  const ctx = { player: P, camera, mission: m, give: it => { pickUp(it); P.held = it; it.owner = P; it.wasHeld = true; it.mission=m; }, free: (x, z, y) => isFree(x - 0.3, z - 0.3, x + 0.3, z + 0.3, y + 0.05, y + 1),
    enterCrane: () => { if (!S.crane) enterCrane(); }, exitCrane: () => { if (S.crane) exitCrane(); } };
  const before=new Set(W.items);
  S.wm.game = WORLD_GAMES[m.def.game](m.obj, api, ctx);
  for(const it of W.items)if(!before.has(it))it.mission=m;
  { const g = S.wm.game; m.track = g.target ? () => g.target() : null; }
}
/* Подсказки мини-игр (v0.19): короткая фраза по факту — ниже центра экрана, крупно, сама гаснет.
   good/bad — действие («ТЯНИ!», «ОТПУСТИ!»), без класса — спокойная инструкция (дольше висит, мельче). */
let callT = 0, lastCall = '', lastCallAt = 0;
function callout(text, cls = '') {
  const e = $('mgcall'),now=performance.now();
  if(text&&text===lastCall&&now-lastCallAt<3500)return;
  lastCall=text;lastCallAt=now;clearTimeout(callT); if (!text) { e.className = 'hidden'; return; }
  e.textContent = text; e.className = 'c-' + (cls || 'info'); void e.offsetWidth; e.classList.add('pop');
  callT = setTimeout(() => e.classList.add('fade'), cls ? 1300 : 2600);
}
function closeWorld(res) {
  if (!S.wm) return;
  const { m, game } = S.wm; m.onExpire=null; S.wm = null; game.stop();missionCountdown(0); m.busy = false; m.track = null;
  $('mgpanel').classList.add('hidden'); setTimeout(() => { if (!S.mg && !S.wm) callout(''); }, 1200);
  // вторая часть миссии — мини-игра у объекта (салат: нарезка, лампочка: вкрутить)
  if (res && res.chain) { m.def = { ...m.def, world: false, game: res.chain }; openMission(m); return; }
  if (res && res.success) { const pts = Math.round(m.pts * res.mult * (W.scoreMul || 1)); S.score += pts; S.done++; scored(m, pts); }
  if (res && res.stolen) { toast(TEXT.stolenFrom(res.stolen.name || ''), 'bad'); missionDone(m); }
  removeMission(m);
}
function openMission(m) {
  if(m.claimedBy&&m.claimedBy!==P)return;
  if (m.def.world) return openWorld(m);
  if (P.ride) dismount(P, false);
  if (P.grab) release(P, 0);
  if (P.held) { drop(P.held, P.pos.x, P.pos.y, P.pos.z); P.held = null; }
  startMissionClock(m);m.onExpire=()=>{closeMission({success:false});};
  m.doer=P; m.busy = true;P.stationaryWork=true;P.vel.x=P.vel.z=0;P.push.x=P.push.z=0; P.root.visible = false; P.charging = false;
  $('mgicon').innerHTML = img(m.key, 28); $('mgtitle').textContent = (TEXT.missions[m.key] || [m.def.name])[0]; $('mgpts').textContent = `+${m.def.points}`;
  $('mghint').textContent = m.key==='fat'?'':(TEXT.missions[m.key] || ['', ''])[1]; callout('');
  $('mgpanel').classList.remove('hidden');
  let worldFeedback=false;
  const api = {
    feedback: () => {worldFeedback=true;$('mgbar').classList.add('hidden');},
    pose: (p, l) => { cam.pose = { p, l, ignore: m.obj.solid }; resumeCamera(camera);updateCamera(camera,P,1/60,false); },
    progress: v => { m.progress=v; const bar = $('mgbar'); if (v === null || worldFeedback) bar.classList.add('hidden'); else { bar.classList.remove('hidden'); bar.firstChild.style.width = (v * 100) + '%'; } },
    msg: (text, cls = '') => callout(text, cls),
    finish: res => { if (S.mg && S.mg.m === m) closeMission(res); },
  };
  S.mg = { m, game: null, start:P.pos.clone() };
  unlock(); $('lockhint').classList.add('hidden');
  S.mg.game = ALL_GAMES[m.def.game](m.obj, api, { cursor:setCursor, character:P.ch,player:P,camera,mission:m });
  if(S.mg?.game.hint)$('mghint').textContent=S.mg.game.hint;
}
function closeMission(res) {
  if (!S.mg) return;
  const { m, game } = S.mg;m.onExpire=null;
  game.stop();P.stationaryWork=false; S.mg = null; cam.pose = null; updateOcclusion(camera, null); m.busy = false; m.doer=null; P.root.visible = true; setCursor(true); requestLock();
  $('lockhint').classList.toggle('hidden', locked());
  $('mgpanel').classList.add('hidden'); setTimeout(() => { if (!S.mg && !S.wm) callout(''); }, 1200);
  if (!res) {m.progress=0;return;}
  if (res.success) { const pts = Math.round(m.pts * res.mult * (W.scoreMul || 1)); S.score += pts; S.done++; scored(m, pts); }
  removeMission(m);
}

// очки за миссию: «+N» вылетает из места миссии на экране и летит в счёт
function scored(m, pts) {
  actionEffect('success',P.pos.clone().add(new V3(0,1,0)),1.25);
  // v0.52: сочный финиш миссии — вспышка, кольцо, разноцветные искры фонтаном, короткий стоп-кадр
  { const q = { x: P.pos.x, y: P.pos.y + 1.1, z: P.pos.z }; impactBurst(q, 0xc7ef94, 2.2); for (const c of [0xff6aa8, 0x7ad8ff, 0xffd04a, 0x9be36b]) vfxSparks(q, 9, c, { x: 0, y: 1.6, z: 0 }); W.flash?.(P.pos, 0xc7ef94, .9, 7, 3); hitFreeze(.06); }
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
  W.onCandy=(a,def)=>{if(a===P)toast(def.label+' · '+def.effect, ['stun','slow','pop'].includes(def.id)?'bad':'good');};
  W.onEliminate = a => { if (a === P) { if (S.mg) closeMission(null); if (S.wm) closeWorld(null); if (S.crane) exitCrane(); } else cancelBotOnEliminate(a); };

  // удар/попадание: мелкий бонус (по лидеру — чуть больше); ударил того, кто делает миссию, — СОРВАЛ
  W.onHit = (att, vic, kind) => {
    if (!att || att === vic || !vic) return;
    replayMoment((kind === 'heavy' ? 3 : kind === 'melee' ? 2 : 1) + (att === P || vic === P ? 2 : 0) + (vic === FUN.leader ? 1 : 0), vic);
    if (EV.big && EV.big.def.onHit) EV.big.def.onHit(EV.big.s, att, vic, kind);
    if (vic === P) shakeCam(kind === 'heavy' ? 0.35 : 0.18); else if (att === P) shakeCam(0.1);
    if (!onHitLeader(att, vic)) comboAct(att, 'hits', kind === 'heavy' ? PTS.hitHeavy : PTS.hitLight, vic.pos); else comboAct(att, 'hits', 0);
    if (vic.bot) { const m = interruptBot(vic); if (m) sabotage(att, vic, m); }
    else if (vic === P && S.mg && kind !== 'light') { const m = S.mg.m; closeMission(null); sabotage(att, P, m); }
  };
  W.onFunny = (vic, kind, owner) => { replayMoment(2 + (owner === P || vic === P ? 1 : 0), vic); if (owner && vic !== owner) comboAct(owner, 'traps', PTS.trap, vic.pos); };
  // перила: 5 очков, за одни и те же — не чаще раза в 10 с
  W.onGrind = b => { const a = b.rider; if (!a) return; a.grinds = a.grinds || new Map(); const now = W.time || 0, last = a.grinds.get(b.grind) ?? -99;
    if (now - last >= 10) { a.grinds.set(b.grind, now); comboAct(a, 'tricks', PTS.grind, a.pos); } else if (a === P) comboAct(a, null, 0); };
  W.onTrick = a => { replayMoment(2 + (a === P ? 1 : 0), a); const now = W.time || 0; if (now - (a.trickT ?? -99) >= 3) { a.trickT = now; comboAct(a, 'tricks', PTS.trick, a.pos); } };
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
  if(S.settingsOpen)return;
  if (S.state !== 'play') return;
  if (P.drone) { droneAction(P, btn, aim(camera).ray.direction); return; }
  if (P.returning) return;
  if(btn===0&&!S.mg&&!S.crane&&grabFist(P))return;
  // v0.57: нажатие, которым предмет подобрали, им же не стреляет (сетемёт, лук, пылесос) — выстрел только следующим нажатием
  if (btn === 0) P.pickClick = !P.held;
  if(P.hotPotato){if(btn===0)throwPotato(P,aim(camera).ray.direction,true);return;}
  if (S.mg) { if (btn === 0 && S.mg.game.down) S.mg.game.down(aim(camera)); return; }
  if (S.crane) return;
  if(P.heldBy){if(btn===0)S.wm?.game.struggle?.();return;}
  if(btn===0&&S.wm?.game.down&&S.wm.game.equipped!==false&&!P.charging){if(S.wm.game.down(aim(camera))!==false)return;}
  // тележку/тачку хватаешь любой кнопкой мыши, ей же отпускаешь (с толчком)
  if (P.grab?.holdOnly)return;
  if (P.grab && (btn === 0 || btn === 2)) { release(P, 1.1); return; }
  // замах (ПКМ зажата): ЛКМ — передумал, опустить руку (бросок отменён)
  if (btn === 0 && P.charging) { P.charging = false; P.chargeManual = false; $('dot').classList.remove('charge'); sfx('click'); throwTip(true); return; }
  // в руках инструмент: ЛКМ — применить
  if (btn === 0 && P.held) { if (!P.held.def.hold) { const snd = useTool(P, P.held, aimPoint()); if (snd) sfx(snd); else if (!P.held.def.tool && !P.held.def.use) { drop(P.held, P.pos.x + Math.sin(P.root.rotation.y) * 0.7, P.pos.y, P.pos.z + Math.cos(P.root.rotation.y) * 0.7); P.held = null; } } return; }
  if(btn===0&&!P.held){const r=nearRadio(P,aim(camera));if(r){toggleRadio(r);return;}}
  if (P.holding) { if (btn === 0 || btn === 2) letGo(P); return; }
  // v0.52: ЛКМ с пустыми руками — подобрать предмет или поймать летящий
  if (btn === 0 && !P.held && !P.ride) { const q = lmbTarget(); if (q) { const wasCatch = q.catch; q.act(); if (wasCatch) comboAct(P, 'catches', PTS.catch, P.pos); return; } }
  if (!P.held && !P.ride && !P.holding && (btn === 0 || btn === 2)) {
    const c = nearestRideable(P, 1.7, true), d = btn === 0 ? nearDoor() : null;
    if (c?.holdOnly)return;
    if (c && (!d || Math.hypot(c.x - P.pos.x, c.z - P.pos.z) < Math.hypot(d.x - P.pos.x, d.z - P.pos.z))) { grab(P, c); return; }
  }
  // пустые руки: ЛКМ вплотную к персонажу — схватить; к собаке — взять на руки
  if (btn === 0 && !P.held && !P.ride) { const v = grabTarget(P); if (v) { grabActor(P, v); return; } if (!P.dogHeld && grabDog(P)) return; }
  if (btn === 2 && (P.held || carryK()) && P.stun <= 0) { P.charging = true; P.charge = 0; P.chargeManual = false; P.aimYaw = P.root.rotation.y; $('dot').classList.add('charge'); throwTip(); }
});
// колёсико во время замаха — точнее сила броска (вверх — сильнее, вниз — слабее)
on('wheel', d => { if(S.settingsOpen||S.state!=='play'||!P||S.mg||S.crane)return;if(!P.charging){const r=P.held?.type==='boombox'?P.held:!P.held?nearRadio(P,aim(camera)):null;if(r)tuneRadio(r,d);return;}P.chargeManual=true;P.charge=Math.max(.05,Math.min(1,P.charge-d*.1));sfx('tick');});
// короткая подсказка у прицела — первые несколько замахов (потом не надоедает)
let tipN = 0; try { tipN = +localStorage.getItem('friendslop.throwTip') || 0; } catch (_) {}
function throwTip(done) { const e = $('throwTip'); if (!e) return; if (done || tipN >= 4) { e.classList.add('hidden'); return; } e.classList.remove('hidden'); }
on('up', btn => {
  if(S.settingsOpen)return;
  if (S.state !== 'play') return;
  if (S.mg) { if (btn === 0 && S.mg.game.up) S.mg.game.up(aim(camera)); return; }
  if(btn===0)S.wm?.game.up?.(aim(camera));
  // пылесос: отпустил ЛКМ — содержимое вылетает очередью
  const fresh = btn === 0 && P.pickClick; if (btn === 0) P.pickClick = false;
  if(btn===0&&!fresh&&P.held?.type==='bow')releaseBow(P,P.held,aimPoint());if(btn===0&&!fresh&&P.held?.type==='net')releaseNet(P,P.held,aimPoint());
  if (btn === 0 && !fresh && P.held && P.held.type === 'vacuum') { const n = vacuumFire(P, P.held, aimPoint()); if (n) P.throwT = 0.3; }
  if (btn === 2 && P.charging) {
    P.charging = false; $('dot').classList.remove('charge'); throwTip(true); if (tipN < 4) { tipN++; try { localStorage.setItem('friendslop.throwTip', tipN); } catch (_) {} }
    const it = P.held, from = P.held?P.held.pos.clone():P.ch.holdPoint.clone(), tgt = aimPoint();
    if (it && tgt) { const v = throwVelocity(from, tgt, P.charge, it.def); it.owner = P; launch(it, from, v); P.held = null; P.throwT = 0.3; sfx('throw'); voice(P.ch, 'throw'); }

    else if (carryK() && tgt) { const v = throwVelocity(from, tgt, P.charge, KITTEN); S.wm.game.throwCarry(v); P.throwT = 0.3; sfx('throw'); }
  }
});
on('key', code => {
  if (code === 'KeyM') { toggleMute(); return; }
  if(code==='Escape'&&(S.state==='settings'||S.settingsOpen)){backSettings();return;}
  if(code==='Escape'&&S.state==='mode'){menu.closeTV();return;}
  if(S.settingsOpen)return;
  if(S.state==='play'&&code==='Escape'){showSettings();return;}
  if(S.state==='hub'){menu.key(code);return;}
  if(S.state==='menu'){if(code==='Enter')showHub();return;}
  if (S.state === 'mode' && code === 'Enter') { $('modeCard').click(); return; }
  if (S.state !== 'play') return;
  if (code === 'KeyZ' && (S.mg||S.wm)) { cancelMission();return; }
  if (code === 'KeyR' && S.studioCfg && !S.mg && !S.wm) { if (S.studioCfg.kind === 'mission' && !studioMission()) toast('Не нашлось места — ещё раз R'); studioPlace(); sfx('click'); return; }
  if (code === 'Escape') { if (S.mg) closeMission(null); else if (S.crane) exitCrane(); else if (S.wm) closeWorld(null); else if (S.tut) tutEnd(false); }
});
const _aimHit = new V3();
const KITTEN = { mass: 0.9, drag: 0, r: 0.25 }; // бросок котёнка в коробку
const carryK = () => !!(S.wm && S.wm.game.carrying && S.wm.game.carrying());
function aimPoint() { return worldAimPoint(P,camera,_aimHit); }

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
/* Контур вблизи (≈ дистанция E): лежащие предметы — цвет по редкости, мусорки/шкафы — светлый, пока не обысканы */
let glowOn = new Set();
let glowTick=0,glowWorld=null;
function updateGlow() {
  const now=performance.now();if(now<glowTick&&glowWorld===W.group&&S.state==='play')return;glowTick=now+100;glowWorld=W.group;
  const want = new Set();
  if (P && S.state === 'play' && !P.drone && !S.mg && !S.crane) {
    for (const it of W.items) if ((it.state==='rest'||it.cartSpill&&it.state==='fly') && it.g.visible && !(it.boxed && !it.boxed.open) && Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z) < (it.cartSpill?18:2.2) && Math.abs(it.pos.y-P.pos.y-.4)<(it.cartSpill?6:1.6)) want.add(it.outline);
    for (const q of W.interacts) if (q.outline && (!q.glow || q.glow()) && Math.hypot(q.x - P.pos.x, q.z - P.pos.z) < q.r + 0.7 && Math.abs(q.y - P.pos.y) < (q.dy ?? 0.9) + 0.3) want.add(q.outline);
  }
  for (const o of glowOn) if (!want.has(o) && o !== lastFocus) o.set(false);
  for (const o of want) o.set(true);
  glowOn = want;
}
function interact() {
  if(P?.roofSeat){P.roofSeat=null;return;}
  if(P?.hotPotato)return;
  if(P.heldBy||P.stun>0||P.getT>0)return;
  if (P.drone || P.returning) return;
  if (S.mg) return;
  if (S.wm && S.wm.game.interact && S.wm.game.interact()) return;
  if(P.carryCrate){const e=eTarget();if(e?.allowHeld)e.act();return;}
  if (S.crane) { exitCrane(); return; }
  if (P.ride) { dismount(P, false); return; }
  if (P.swing) { leaveSwing(P, false); return; }
  if (P.bench) { leaveBench(P); return; }
  if (P.hidden) { leaveHide(P); return; }
  if (P.grab) {if(P.grab.noRide)release(P,0);else hopIn(P);return; }
  if (P.holding) { letGo(P); return; }
  if (P.heldBy) return;
  if (P.caged) { openCageUI(); return; }
  const m = S.wm ? null : nearMission(P);
  if (m) { openMission(m); return; }
  { const e = eTarget(); if (e) { e.act(); return; } }
  if (P.held) { drop(P.held, P.pos.x + Math.sin(P.root.rotation.y) * 0.7, P.pos.y, P.pos.z + Math.cos(P.root.rotation.y) * 0.7); P.held = null; return; }
  if (nearCrane()) enterCrane();
}
/* E (v0.21): из всего, что рядом (предметы, шкафы/багажники/скамейки…, двери, транспорт), выбирается БЛИЖАЙШЕЕ,
   с поправкой на направление взгляда (то, что перед тобой, — важнее). Подсказка показывает ровно это. */
function eTarget() { return worldTarget(P,camera,{stealItem,items:false}); }
function lmbTarget() { return pickTarget(P,{stealItem}); }
// подобрал чужой предмет миссии (заказ, пиццу, лампочку) — миссия засчитывается тебе
function stealItem(it) {
  const pts = Math.round(it.steal.pts * (W.scoreMul || 1)); it.state = 'gone'; it.g.visible = false; it.steal = null;
  S.score += pts; S.done++; const st = statsOf(P); st.steals++; st.missions++; st.mpts += pts; sfx('done'); voice(P.ch, 'happy'); toast(TEXT.stole, 'gold');
  const v = new V3(P.pos.x, P.pos.y + 1.2, P.pos.z).project(camera), sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight; flyScore(sx, sy, pts); confetti(sx, sy, P.pos);
}
const RIDE_NAME = { cart: 'тележку', skate: 'скейт', scooter: 'самокат', chair: 'кресло', barrow: 'тачку', kidcar: 'машинку', gurney: 'каталку', tire: 'шину', ring: 'круг' };
function promptText() {
  if(P.ride)return '';
  if(P.roofSeat)return '<b>E</b>Встать с крыши';
  if (P.drone) return '';
  if(nearFist(P))return '<b>ЛКМ</b>Схватить фист';
  if (P.returning) return 'Возвращение в игру';
  if (S.mg) return '';
  if (S.crane) return '<b>E</b>выйти из крана';
  if (S.wm) { const pr = S.wm.game.prompt ? S.wm.game.prompt() : ''; if (pr) return pr; }
  if (P.caged) return `<b>E</b>${TEXT.cage}`;
  const m = nearMission(P); if (m) return `<b>E</b>${m.def.name}`;
  if (P.swing || P.bench) return '<b>E</b>Встать';
  if (P.hidden) return '<b>E</b>Выскочить';
  { const e = eTarget(); if (e) return `<b>E</b>${e.label}`; }
  { const q = !P.held && lmbTarget(); if (q) return `<b>ЛКМ</b>${q.label}`; }
  return '';
}

/* ---------- цикл ---------- */
const clock = new THREE.Timer(); let t = 0,graphicsLost=false;
let CURTAIN = null; // материал занавесок в окнах (ярче к ночи)
const waterTex = T.water(), waterHi = T.waterHi(), foamTex = T.foam();
function frame() {
  clock.update(); let dt = Math.min(0.05, clock.getDelta()); prof.frameStart();
  if(graphicsLost||document.hidden){endFrame();return;}
  if (S.studio) { S.studio.t += dt; S.studio.spin && S.studio.list.forEach((g, i) => g.rotation.y = S.studio.t * .6 + i); present(S.studio.sc, S.studio.cam); endFrame(); return; }
  if(S.settingsOpen)clearInput();
  if (FX.freeze > 0) { FX.freeze -= dt; dt *= 0.05; }
  t += dt;runtimeCheckpoint(dt,{state:S.state,drone:!!P?.drone,returning:!!P?.returning,botsFlying:(W.bots||[]).filter(a=>a.drone||a.returning).length,mission:S.wm?.m.key||S.mg?.m.key||null,items:W.items.length,geometry:renderer.info?.memory?.geometries,textures:renderer.info?.memory?.textures});
  if(!['starting','hub','menu','mode','roulette','settings'].includes(S.state))updateRadios(dt,P?.pos,S.state==='play');
  if(S.settingsOpen)drawMicMeter();
  waterTex.offset.x += dt * 0.03; waterTex.offset.y += dt * 0.015; waterHi.offset.x -= dt * 0.05; waterHi.offset.y += dt * 0.035; foamTex.offset.x += dt * 0.04; foamTex.offset.y = Math.sin(t * 1.3) * 0.08;
  if (S.state === 'results') { podium.update(dt); present(podium.scene, podium.camera); }
  else if (S.state === 'starting' || S.state === 'hub' || S.state === 'menu' || S.state === 'mode' || S.state === 'roulette' || S.state === 'settings') {
    // v0.56: пока висит экран загрузки и город уже построен, хаб не рисуем (общие материалы уже настроены под город)
    if (S.loadingHold) {} else { menu.update(dt);const presentation=menu.claw.presentation;present(presentation?.scene||menu.scene,presentation?.camera||menu.camera,presentation?null:menu.active&&menu.hover&&!menu.choosing&&!menu.drag?menu.ch.root:null); prof.mark('хаб'); afterRender(canvas); }
    if (S.state === 'settings') drawMicMeter();
    // логотип: буквы по очереди подпрыгивают раз в несколько секунд
    logoT -= dt; if (logoT <= 0 && S.state === 'menu') { logoT = 4; [...$('logo').children].forEach((sp, i) => setTimeout(() => { sp.classList.remove('hop'); void sp.offsetWidth; sp.classList.add('hop'); }, i * 70)); }
  }
  else {
    if (S.state === 'intro') { updateIntro(dt); if (S.intro?.landed) updatePlayer(P, dt, t, true, cam.yaw); }
    if (S.state === 'finale') updateFinale(dt);
    if (S.state === 'play') {
      updateDrones(dt, t);
      if (!S.studioCfg) S.time -= dt;
      if (S.time > 0 && S.time <= 10) { S.beep = (S.beep || 0) - dt; if (S.beep <= 0) { S.beep = 0.18 + 0.082 * S.time; sfx('deadline', { urgency: 1 - S.time / 10 }); } } else S.beep = 0;
      if (S.tut) updateTutorial(dt);
      if (!S.settingsOpen&&tapped('KeyE')) interact();
      // инструмент, который действует пока зажата ЛКМ (огнетушитель, магнит)
      if (M_.left && !P.pickClick && P.held && P.held.def.hold && !S.mg && !S.crane && P.stun <= 0 && locked()) { useTool(P, P.held, aimPoint(), dt); P.sprayT=['bow','net'].includes(P.held.type)?0:.1; if ((P.sndT = (P.sndT || 0) - dt) <= 0) { P.sndT = 0.25; if(!['bow','net'].includes(P.held.type))sfx(P.held.type === 'magnet' ? 'magnet' : 'spray'); } }
      if (P.charging && !P.chargeManual) P.charge = Math.min(1, P.charge + dt / CONFIG.throw.chargeTime);
      if(S.mg&&(P.heldBy||P.stun>0||P.daze>0||P.pos.distanceTo(S.mg.start)>0.65))closeMission(null);
      updatePlayer(P, dt, t, !S.settingsOpen && !S.mg && !S.crane && !P.stationaryWork, cam.yaw);
      voiceInput(dt);
      if (P.held) { cargoPosition(P,P.held.pos,P.held.def.r); P.held.g.rotation.y = P.root.rotation.y;poseMeleeItem(P,P.held); }
      if (P.charging && !P.held && !carryK()) { P.charging = false; $('dot').classList.remove('charge'); }
      if (P.stun > 0 && P.charging) { P.charging = false; $('dot').classList.remove('charge'); }
      W.time = EV.t; recordReplay(dt);
      {const m=S.mg?.m||S.wm?.m;if(m?.activeLeft!=null)$('mgpts').textContent=`+${m.pts} · ${Math.ceil(Math.max(0,m.activeLeft))} с`;}
      updateMissions(dt, t, P, { phase: phaseOf(EV.t), t: EV.t, playerScore: () => S.score });
      // главная цель — одна: ближайшая видимая миссия (своя личная — в приоритете), остальные приглушены
      { let best = null, bd = 1e9; if (!EV.big && !S.wm) for (const m of M.list) { if (m.busy || m.doer || !visibleTo(m, P)) continue; const q = m.obj.pos(), d = Math.hypot(q.x - P.pos.x, q.z - P.pos.z) + Math.abs(q.y - P.pos.y) * 3 - (m.owner === P ? 20 : 0); if (d < bd) { bd = d; best = m; } }
        S.main = best; for (const m of M.list) { const on = m === best, mk = m.marker, pop = mk.pop || 1; if (m.life > m.maxLife * 0.25) mk.bm.opacity = on ? 0.4 : 0.1; mk.sp.scale.set((on ? 1.9 : 1.15) * pop, (on ? 2.4 : 1.45) * pop, 1); mk.ring.visible = on; } }
      // ничейные предметы миссий (выронили и никто не подобрал) исчезают через 10 с
      for (const q of W.items) if (q.steal && q.state === 'rest' && q.mine !== P) { q.restT = (q.restT || 0) + dt; if (q.restT > 10) { q.state = 'gone'; q.g.visible = false; q.steal = null; } } else if (q.steal) q.restT = 0;
      if (S.mg) S.mg.game.update(dt);
      if (S.wm) S.wm.game.update(dt);
      S.hudT -= dt; if (S.hudT <= 0) { renderHud(S, P, promptText(), 0.1); S.hudT = 0.1; }
      renderStamina(P, dt, S.wm?.game);
      if (!S.tut && !S.studioCfg) { updateEvents(dt, eventUi); updateSupplies(dt); }
      // ритм раунда: подпись под таймером, предупреждение о событии, финальный рывок ×2
      { const ph = phaseOf(EV.t); W.scoreMul = ph === 'final' ? 2 : 1;
        if (ph === 'final' && S.phase !== 'final') { eventBanner('final', true); sfx('crown'); glitch(); }
        if (ph === 'event' && S.phase === 'calm') glitch();
        S.phase = ph;
        const left = Math.ceil(PHASE.event - EV.t), txt = ph === 'calm' ? (left > 0 && left <= PHASE.warn ? TEXT.phase.soon(left) : TEXT.phase.calm) : ph === 'event' ? (EV.big ? TEXT.events[EV.big.key].replace('!', '') : TEXT.phase.calm) : TEXT.phase.final;
        const pe = $('phase'); if (pe.textContent !== txt) { pe.textContent = txt; pe.className = 'ph-' + ph + (ph === 'calm' && left > 0 && left <= PHASE.warn ? ' warn' : ''); } }
      if (flash.intensity > 0) { const f = P.root.rotation.y; flash.position.set(P.pos.x, P.pos.y + 1.6, P.pos.z); flash.target.position.set(P.pos.x + Math.sin(f) * 6, P.pos.y, P.pos.z + Math.cos(f) * 6); }
      // v0.57: мини-карта 30 раз в секунду, а не каждый кадр (на 144 Гц это лишние 2D-отрисовки)
      if ((S.mmT = (S.mmT || 0) - dt) <= 0) { S.mmT = 1 / 30; const bt = bigTarget(); drawMinimap(P, M.list.filter(m => visibleTo(m, P)), S.wm && S.wm.game.target ? S.wm.game.target() : null, bt ? [{ x: bt.x, z: bt.z, color: '#ff8a1f', icon: TEXT.eventIcon[EV.big.key] }] : null, S.nav); }
      if (S.time <= 0) { S.time = 0; renderHud(S, P, '', 0); startFinale(); }
    }
    if (P) { setGhost(P, P.ghost > 0); setListener(P.pos.x, P.pos.y, P.pos.z); }
    // траектория броска
    let shown = 0;
    if (S.state === 'play' && P.charging && (P.held || carryK())) {
      const tgt = aimPoint();
      if (tgt) {
        P.aimYaw = Math.atan2(tgt.x - P.pos.x, tgt.z - P.pos.z);
        const def = P.held ? P.held.def : KITTEN, from = P.held?P.held.pos.clone():P.ch.holdPoint.clone(), v = throwVelocity(from, tgt, P.charge, def);
        shown = predict(from, v, arc, arc.length, def, land);
        // траектория проходит через цель (персонаж, кот, моль, ворона) — точки и кольцо становятся красными
        let onT = false; const tg = [...(W.bots || []).map(b => ({ x: b.pos.x, y: b.pos.y + 0.9, z: b.pos.z, r: 0.7 })), ...W.cats.map(c => ({ x: c.root.position.x, y: c.root.position.y + 0.4, z: c.root.position.z, r: 0.6 }))];
        if (W.moth && W.moth.g) tg.push({ x: W.moth.g.position.x, y: W.moth.g.position.y, z: W.moth.g.position.z, r: 1.4 }); if (W.thief) tg.push({ x: W.thief.p.x, y: W.thief.p.y, z: W.thief.p.z, r: 0.9 });
        for (let i = 0; i < shown && !onT; i++) { const q = arc[i].position; for (const o of tg) if (Math.hypot(q.x - o.x, q.y - o.y, q.z - o.z) < o.r) { onT = true; break; } }
        const ac = onT ? 0xff3a3a : 0xffb45a; for (const m of arc) m.material.color.setHex(ac); land.material.color.setHex(onT ? 0xff3a3a : 0xff8a1f);
      }
      $('dot').style.setProperty('--c', (P.charge * 100) + '%');
    }
    if(S.state==='play'&&P.held?.type==='net'&&(P.held.aimT||0)>0&&!S.mg&&M_.left){shown=predictNet(P,aimPoint(),arc,land);for(const q of arc){q.scale.setScalar(.11);q.material.depthTest=true;q.material.color.setHex(0x9be36b);}}
    else if(S.state==='play'&&P.held?.type==='bow'&&(P.held.draw||0)>.05&&!S.mg){shown=predictBow(P,aimPoint(),arc,land);for(const q of arc){q.scale.setScalar(.085);q.material.depthTest=true;q.material.color.setHex(0xe8dfb9);}}else for(const q of arc){q.scale.setScalar(.13);q.material.depthTest=true;}
    arc.forEach((m, i) => (m.visible = i < shown)); if (!shown) land.visible = false;
    const fo = focusTarget(); if (fo !== lastFocus) { lastFocus && lastFocus.set(false); fo && fo.set(true); lastFocus = fo; $('dot').classList.toggle('focus', !!fo); } pulseOutline(dt); updateGlow(); setGlow(S.mg ? 0.15 : 1); updateDust(t, P); { const dt2 = $('droneT'), on = !!(P && (P.drone || P.returning)); dt2.classList.toggle('hidden', !on); if (on) { const v = P.drone ? Math.max(0, Math.ceil(P.drone.left)) : 0, h = P.drone ? String(v) : 'СЕЙЧАС'; if (dt2.lastChild.textContent !== h) dt2.lastChild.textContent = h; } } { const h = $('droneHud'), on = !!(P && P.drone && !(P.drone.intro > 0)); h.classList.toggle('hidden', !on);
      if (on) { if (!h.dataset.ok) { h.dataset.ok = 1; for (const [id, n] of [['dhNet', 'net'], ['dhCandy', 'candy'], ['dhUp', 'updown']]) { $(id).firstChild.innerHTML = img(n, 28); $(id).insertAdjacentHTML('beforeend', '<b></b>'); } }
        const cd = Math.max(0, P.drone.cd) / DRONE_NET_COOLDOWN; $('dhNet').dataset.cd=P.drone.cd>0?Math.ceil(P.drone.cd)+'с':''; $('dhNet').lastChild.style.top = (100 - cd * 100) + '%'; $('dhCandy').classList.toggle('off', !P.drone.candy); } }
    W.wmActive = !!S.wm;
    if (P) P.root.visible = !P.drone && (!P.returning || P.returning.t >= 1.25) && !S.mg && !S.crane && !P.hidden && !(S.state === 'intro' && !S.intro.drop);
    const dotHtml = P && P.charging ? '<b></b><i></i>' : '<i></i>';
    if (dotHtml !== S.dotHtml) { $('dot').innerHTML = dotHtml; S.dotHtml = dotHtml; }
    prof.mark('игрок/миссии');
    updateItems(dt, P);S.wm?.game.afterPhysics?.();
    updateCoins(dt,S.state==='play'?P:null);
    updatePushables(dt, S.state === 'play' && !S.crane && !S.mg ? P : null);
    for (const c of W.cats) updateCat(c, dt, t, S.state === 'play' ? P : null);
    updateBirds(dt, t, S.state === 'play' ? P : null); prof.mark('предметы/физика');
    const lk = takeLook();
    if (S.crane) {
      // напрямую: A/D — поворот стрелы, W/S — тележка
      let ix = 0, iz = 0; if (!S.settingsOpen&&(keys.KeyA || keys.ArrowLeft)) ix--; if (!S.settingsOpen&&(keys.KeyD || keys.ArrowRight)) ix++; if (!S.settingsOpen&&(keys.KeyW || keys.ArrowUp)) iz--; if (!S.settingsOpen&&(keys.KeyS || keys.ArrowDown)) iz++;
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
      // выбитая выпадом дверь (v0.22) летит в сторону выпада по инерции, бьётся об упор и чуть отскакивает
      const want = d.open ? 1.65 * (d.dirS || d.inward) : 0;
      if (d.av) { d.ang += d.av * dt; d.av *= Math.exp(-dt * 2.2); if (Math.abs(d.ang) > 1.8) { d.ang = Math.sign(d.ang) * 1.8; d.av = -d.av * 0.3; } if (Math.abs(d.av) < 0.4) d.av = 0; }
      else d.ang += (want - d.ang) * Math.min(1, dt * 8);
      d.pivot.rotation.y = d.ang; if (d.slam > 0) d.slam -= dt;
      d.solid.on = !d.open && Math.abs(d.ang) < 0.5;
    }
    prof.mark('кран/двери');
    for (const f of W.animated) f(dt, t);
    updateSwingers(dt, t, S.state === 'play' ? P : null);
    sky.update(camera, t, dt, P, hemi, scene.fog);
    updateLife(dt, t, S.state === 'play' ? P : null, camera);
    updateWorldFx(dt, t, S.state === 'play' ? P : null); prof.mark('мир/анимации');
    // v0.56: листва — кто головой в кроне дерева, того боты не видят; камера в кроне — по краям экрана листья
    if (S.state === 'play') { const cr = W.crowns || [], inC = (x, y, z) => cr.some(c => (x - c.x) ** 2 + (y - c.y) ** 2 * 1.6 + (z - c.z) ** 2 < c.r * c.r);
      for (const a of [P, ...(W.bots || [])]) a.inLeaves = inC(a.pos.x, a.pos.y + 1.3, a.pos.z);
      const cp = camera.position, want = inC(cp.x, cp.y, cp.z) || P.inLeaves ? 1 : 0; S.leafVeil = (S.leafVeil || 0) + (want - (S.leafVeil || 0)) * Math.min(1, dt * 6);
      const lv = $('leafVeil'); if (lv) { lv.style.opacity = S.leafVeil.toFixed(3); lv.classList.toggle('hidden', S.leafVeil < .01); } }
    if (S.state === 'play') { updateTools(dt, t); updateBots(dt, t, P); updateGrabs(dt, t); updateTraps(dt, t); updateTown(dt, t, P, !!EV.big); updateFun(dt, t); updatePolice(dt, t); updateBongEffects(dt,t);updateSmoking(P,t);updateSnacks(P,dt);S.wm?.game.pose?.();for(const b of W.bots||[]){updateSnacks(b,dt);b.work?.game.pose?.();} }
    prof.mark('боты/события');
    // погода и ночь: за раунд сумерки уходят в глубокую ночь
    { const nk = S.studioCfg ? .3 : S.state === 'play' || S.state === 'results' || S.state === 'finale' ? Math.min(1, Math.max(0, 1 - Math.max(0, S.time) / CONFIG.roundTime)) : 0; updateWeather(dt, t, camera, P, scene, nk); sky.setNight(nk);
      if (!(EV.cur && EV.cur.key === 'dark')) { hemi.intensity = SEASON.hemi[2] * Math.PI * (1 - nk * 0.3) * (WX.kind === 'fog' ? 0.92 : 1); sun.intensity = SEASON.sun[1] * Math.PI * (1 - nk * 0.35); }
      LIGHTMAT().color.setScalar(1 + nk * 0.45 + (WX.wet ? 0.15 : 0)); if (CURTAIN) CURTAIN.emissiveIntensity = 0.55 + nk * 0.45; }
    updateReflections(camera, t);localLighting.update(camera,dt,sky.dim||0); haze.update(t, camera); prof.mark('погода/свет');
    cam.shake = FX.shake; cam.fovAdd = P && S.state === 'play'&&!S.mg ? P.boost*3+Math.min(6,Math.max(0,Math.hypot(P.vel.x,P.vel.z)-6.5)*.8) : 0;
    // линии скорости: спринт, катание, полёт после броска
    { const sp = P && S.state === 'play' ? Math.hypot(P.vel.x, P.vel.z) : 0, k = Math.max(0, Math.min(1, (sp - 8.5) / 6)), el = $('speedl'); const o = (Math.round(k * 5) / 5).toFixed(1); if (el.style.opacity !== o) el.style.opacity = o; }
    updateBreakables(dt, S.state === 'play' ? P : null);
    updateActionEffects(dt,S.state==='play'&&!S.mg?P:null,camera);updateParticles(dt);updateVfx(dt);updateSplat(dt);setActionVisuals(P&&!S.mg?Math.max(0,(Math.hypot(P.vel.x,P.vel.z)-7)/8):0,FX.shake*.5);
    prof.mark('частицы');
    updateCamera(camera, P, dt, false, S.state === 'play' && !S.settingsOpen ? lk : null, !!(P && P.charging)); prof.mark('камера'); if (S.state === 'play' || S.state === 'intro' || S.state === 'finale') { updateCull(dt, camera, P); checkFrozen(); }
    {const k=S.state==='play'&&!P?.drone&&!P?.returning?Math.min(1,(P?.hazeT||0)/2):0;camera.rotation.z+=Math.sin(t*1.8)*.035*k;canvas.style.filter=k>0?`blur(${(.45*k).toFixed(2)}px) saturate(1.12)`:'';}
    S.mg?.game?.afterCamera?.();S.wm?.game?.afterCamera?.();
    { aimMoon(sky.moonDir()); const fx = camera.position.x + (P ? (P.pos.x - camera.position.x) * 0.6 : 0), fz = camera.position.z + (P ? (P.pos.z - camera.position.z) * 0.6 : 0); followSun(fx, P ? P.pos.y : 0, fz);
      // лунные лучи: где луна на экране (за кадром — гаснут); конусы света фонарей — вместе с фонарём

      // Ближайшие объёмные источники выбираются localLighting с общим бюджетом.
    }
    // камера вплотную к персонажу (у стены) — прячем его, чтобы голова не закрывала полэкрана
    if (P && P.root.visible && !S.mg && !S.crane) { const hx = P.pos.x - camera.position.x, hy = P.pos.y + 1.0 - camera.position.y, hz = P.pos.z - camera.position.z; if (hx * hx + hy * hy + hz * hz < 0.95 * 0.95) P.root.visible = false; }
    if (!window.__noRender) { present(scene, camera); prof.mark('рендер'); afterRender(canvas); }
  }
  prof.frameEnd(dt, renderer); endFrame();
}
/* v0.21: ошибка в одном кадре больше не «роняет» игру молча — кадр пропускается, цикл продолжается */
let errN = 0,lastError='',lastErrorAt=0;
function loop() {
  requestAnimationFrame(loop);
  try { frame(); } catch (e) { errN++;const message=String(e?.message||e),now=performance.now();if(message!==lastError||now-lastErrorAt>1000){console.error('[friendslop] кадр',e);lastError=message;lastErrorAt=now;recordFault(e,{state:S.state,mission:S.mg?.m.key||S.wm?.m.key||null,timeLeft:Math.ceil(S.time||0)});}try { endFrame(); } catch (_) {} if (errN === 1) toast('Сбой кадра — игра продолжается', 'bad'); }
}
// потеря графики (WebGL) — не падаем: ждём восстановления
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsLost=true;roundMusic.pause();updateRadios(0,P?.pos,false);recordFault('WebGL context lost',{state:S.state,timeLeft:Math.ceil(S.time||0)});toast('Графика перезапускается. Игра на паузе…','bad');});
canvas.addEventListener('webglcontextrestored',()=>{graphicsLost=false;if(!document.hidden)roundMusic.resume();clock.reset();toast('Графика восстановлена');});
document.addEventListener('visibilitychange',()=>{if(document.hidden)roundMusic.pause();else if(!graphicsLost)roundMusic.resume();});
// отладочный доступ из консоли браузера
window.__fs = { lastRuntime,lastFaults, eliminate, updateDrones, droneAction, throwPotato, SUP, spawnSupply, POL, renderer, S, EV, TOWN, WX, FUN, spawnTool, useTool, grabActor, letGo, aimPoint: () => aimPoint(), interact: () => interact(), spawn: k => { spawnMission(P, k); return M.list[M.list.length - 1]; }, openWorld, closeWorld, grab, hopIn, release, arc, land, phys: { groundAt, isFree, solidsNear }, get P() { return P; }, W, M, cam, openMission, enterCrane, camera, startRound: () => { prepareRound(); P.frozen = false; P.root.visible = true; goRound(); $('intro').classList.add('hidden'); }, startFlow: () => launchRound(MODES[0], randomMap()), launchRound, randomMap, setMode };
window.__fs.lastFaults=lastFaults;
Object.assign(window.__fs,{scene,makeCharacter:(id)=>__mkChar(id),skinIds:()=>__skinIds,vfx:{explosion,fireworks,sparks:vfxSparks,impactBurst},menu,collection,coinState,showHub,showMenu,roundMusic,graphics,actionStats,addFists:(n=500)=>addCoins(n)});
if(new URLSearchParams(globalThis.location?.search||'').get('dev')==='1'){const b=document.createElement('button');b.id='devFists';b.textContent='+500';b.title='Тест автомата: добавить 500 фистов';b.onclick=()=>addCoins(500);$('wallet').appendChild(b);}
// v0.57: F3 — счётчик производительности, F8 — отчёт о баге (что сейчас происходит и где)
initDevtools({ unlock: () => unlock(), info: () => { const hub = S.state === 'hub' || S.state === 'menu', a = hub ? menu.player : P, p = a?.pos, f = n => n.toFixed(1);
  const d = p && !hub ? W.districts.find(q => p.x >= q.ox && p.x <= q.x1 && p.z >= q.oz && p.z <= q.z1) : null, gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  return { state: S.state, mode: S.lastMode?.name, mission: S.wm?.m.key || S.mg?.m.key || null, district: hub ? 'Хаб' : d?.name || (p ? 'дорога/тоннель' : null), pos: p ? `${f(p.x)}, ${f(p.y)}, ${f(p.z)}` : null,
    cam: `${f(camera.position.x)}, ${f(camera.position.y)}, ${f(camera.position.z)}`, held: a?.held?.type || null, ride: a?.ride?.kind || null, quality: graphics.key,
    gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), error: lastFaults?.at?.(-1)?.message || lastError || '' }; } });
showMenu();
loop();
import {updateRadios,resetRadios,nearRadio,toggleRadio,tuneRadio} from './game/radio.js';
import {updateSnacks} from './game/snacks.js';

// отладка: модели персонажей для проверки внешнего вида
import { makeCharacter as __mkChar } from './characters/rig.js';
import { SKIN_IDS as __skinIds } from './characters/skins.js';
import { busKitten as __busKitten } from './missions/bus-model.js';
Object.assign(window.__fs, { busKitten: __busKitten });
import { addItem as __addItem } from './game/items.js';
Object.assign(window.__fs, { addItem: __addItem, itemTypes: () => Object.keys(CONFIG.items) });


// отладка: «студия» для осмотра моделей предметов (скриншоты для проверки стиля)
window.__fs.studio = (types, cols = 8, sp = 1.15, spin = false) => {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x141a44); sc.fog = new THREE.Fog(0x141a44, 30, 60);
  sc.add(new THREE.HemisphereLight(0xb8c8ff, 0x3a2050, 2.4)); const d = new THREE.DirectionalLight(0xffe8d0, 2.6); d.position.set(3, 6, 5); sc.add(d);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), lam({ color: 0x2a2a5a }, 'studioFloor')); fl.rotation.x = -Math.PI / 2; fl.position.y = -.2; sc.add(fl);
  const cam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, .1, 100), list = [];
  types.forEach((t, i) => { let g; if (t.startsWith('ch:')) { g = __mkChar(t.slice(3)).root; } else { const it = __addItem(t, 0, 0, 0); it.state = 'placed'; it.noPickup = true; g = it.g; } g.removeFromParent(); g.position.set((i % cols - (cols - 1) / 2) * sp, 0, -Math.floor(i / cols) * sp); sc.add(g); list.push(g); });
  const rows = Math.ceil(types.length / cols); cam.position.set(0, .8 + rows * sp * .42, 1.2 + cols * sp * .5); cam.lookAt(0, .05, -(rows - 1) * sp / 2 - .1);
  S.studio = { sc, cam, list, t: 0, spin }; $('hud').classList.add('hidden');
};
Object.assign(window.__fs, { closeMission, closeMG: closeMission });
