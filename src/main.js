import './styles.css';
import { THREE, V3, G, present, makeCamera, basic, mesh, sprite, renderer } from './core/gfx.js';
import { T } from './core/textures.js';
import { CONFIG, SEASON, HINTS } from './config.js';
import { keys, tapped, endFrame, mouse, on, aim, lock, locked, unlock, takeLook } from './core/input.js';
import { DIFF } from './config.js';
import { W } from './world/state.js';
import { generateMap } from './world/world.js';
import { updatePushables, groundAt, raySolids } from './world/physics.js';
import { updateParticles } from './world/particles.js';
import { updateBirds } from './world/birds.js';
import { updateCrane } from './world/crane.js';
import { updateSwingers } from './world/swingers.js';
import { createSky } from './world/sky.js';
import { buildLife, updateLife } from './world/life.js';
import { resetGadgets, updateGadgets, useGadget } from './game/gadgets.js';
import { createBots, updateBots, botHitHook } from './game/bots.js';
import { FX, updateWorldFx, nearInteract, registerInteracts, leaveSwing, leaveHide } from './game/worldfx.js';
import { createPlayer, updatePlayer } from './game/player.js';
import { updateCat } from './game/cats.js';
import { updateItems, nearestItem, pickUp, drop, throwVelocity, launch, predict } from './game/items.js';
import { updateCamera, cam, resetCamera } from './game/camera.js';
import { createArrow, updateArrow } from './game/arrow.js';
import { M, resetMissions, spawnWave, spawnMission, removeMission, updateMissions, nearMission, ALL_GAMES, WORLD_GAMES } from './missions/missions.js';
import { isFree, solidsNear } from './world/physics.js';
import { pulseOutline } from './game/outline.js';
import { nearestRideable, mount, dismount, grab, release, hopIn } from './game/ride.js';
import { updateBreakables } from './world/breakables.js';
import { $, pop, renderHud, renderStamina } from './ui/hud.js';
import { createMenu } from './ui/menu.js';
import { buildMinimap, drawMinimap } from './ui/minimap.js';
import { initEvents, resetEvents, updateEvents, stopEvent, EV } from './game/events.js';
import { DISTRICTS } from './world/districts/index.js';

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
initEvents({ player: () => P, lights: () => ({ hemi, sun, flash, scene, sky }) });
function eventUi(title, sub, big) {
  const bar = $('eventbar');
  if (title === null) { bar.classList.add('hidden'); return; }
  bar.textContent = title; bar.classList.remove('hidden');
  if (big) { const e = $('eventbig'); e.innerHTML = `${title}<small>${sub}</small>`; e.classList.remove('hidden'); e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; setTimeout(() => e.classList.add('hidden'), 3000); }
}
function followSun(x, y, z) {
  // привязка к текселю карты теней, чтобы края теней не дрожали при движении
  const tx = 64 / 2048, c = new V3(x, y, z), a = Math.round(c.dot(SUN_R) / tx) * tx, b = Math.round(c.dot(SUN_U) / tx) * tx, f = c.dot(SUN_DIR);
  const t = SUN_R.clone().multiplyScalar(a).addScaledVector(SUN_U, b).addScaledVector(SUN_DIR, f);
  sun.target.position.copy(t); sun.position.copy(t).addScaledVector(SUN_DIR, 70);
}
const camera = makeCamera(CONFIG.camera.fov);
const menu = createMenu();
const arrow = createArrow(scene);
// мышь захватывается для камеры во время игры (кроме мини-игр)
lock.want = () => S.state === 'play' && !S.mg;
document.addEventListener('pointerlockchange', () => { $('lockhint').classList.toggle('hidden', locked() || S.state !== 'play' || !!S.mg); document.body.classList.toggle('locked', locked()); });

const S = { state: 'menu', time: 0, score: 0, done: 0, mg: null, wm: null, crane: false, hudT: 0, cursor: true };
let P = null;

// точки траектории броска
const arc = []; for (let i = 0; i < 22; i++) { const m = sprite(T.dot(), 0.2, { color: 0xffb45a, depthTest: false, opacity: 0.95 }); m.renderOrder = 10; m.visible = false; scene.add(m); arc.push(m); }
const land = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
land.rotation.x = -Math.PI / 2; land.scale.setScalar(0.5); land.material.depthTest = false; land.renderOrder = 10; land.visible = false; scene.add(land);

/* ---------- меню ---------- */
function showMenu() {
  S.state = 'menu'; document.body.classList.remove('playing');
  $('menu').classList.remove('hidden'); $('hud').classList.add('hidden'); $('results').classList.add('hidden'); $('dot').classList.add('hidden');
}
$('skinPrev').onclick = () => menu.next(-1);
$('skinNext').onclick = () => menu.next(1);
$('playBtn').onclick = () => startRound();
$('againBtn').onclick = () => startRound();
$('menuBtn').onclick = () => showMenu();
$('mgexit').onclick = () => { if (S.wm) closeWorld(null); else closeMission(null); };

/* ---------- раунд ---------- */
function startRound() {
  generateMap(scene, (Math.random() * 1e9) | 0);
  buildLife(scene);
  registerInteracts();
  resetGadgets();
  buildMinimap(DISTRICTS);
  resetEvents(); $('eventbar').classList.add('hidden');
  resetMissions();
  if (P) scene.remove(P.root);
  P = createPlayer(menu.skin()); scene.add(P.root);
  const sp = W.spawns[(Math.random() * W.spawns.length) | 0];
  P.pos.set(sp.x, sp.y, sp.z); P.root.rotation.y = Math.PI; P.facing = Math.PI;
  W.player = P; W.hitActors = [botHitHook]; createBots(scene, menu.skin(), 3);
  spawnWave(P);
  Object.assign(S, { state: 'play', time: CONFIG.roundTime, score: 0, done: 0, mg: null, wm: null, crane: false });
  cam.pose = null; resetCamera(Math.random() * Math.PI * 2);
  $('lockhint').classList.toggle('hidden', locked());
  $('menu').classList.add('hidden'); $('results').classList.add('hidden'); $('hud').classList.remove('hidden'); $('mgpanel').classList.add('hidden');
  document.body.classList.add('playing'); setCursor(true);
  updateCamera(camera, P, 0, true);
}
function endRound() {
  stopEvent(); $('eventbar').classList.add('hidden');
  if (S.mg) closeMission(null);
  if (S.wm) closeWorld(null);
  if (S.crane) exitCrane();
  S.state = 'results'; document.body.classList.remove('playing'); $('dot').classList.add('hidden'); unlock(); $('lockhint').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('resScore').textContent = S.score;
  $('resInfo').textContent = `Миссий выполнено: ${S.done}.`;
  $('results').classList.remove('hidden'); $('againBtn').focus();
}

/* ---------- курсор-точка ---------- */
function setCursor(v) { S.cursor = v; $('dot').classList.toggle('hidden', !v || S.state !== 'play'); }
on('move', () => { const d = $('dot'); d.style.transform = `translate(${mouse.x}px,${mouse.y}px)`; if (S.mg && S.mg.game.move) S.mg.game.move(aim(camera)); });

/* ---------- миссии ---------- */
/* Уличная миссия: игрок бегает как обычно, справа внизу панель с таймером и прогрессом */
function openWorld(m) {
  if (P.ride) dismount(P, false);
  if (P.held) { drop(P.held, P.pos.x, P.pos.y, P.pos.z); P.held = null; }
  m.busy = true; S.wm = { m, game: null };
  $('mgicon').textContent = m.def.icon; $('mgtitle').textContent = m.def.name; $('mgpts').textContent = `+${m.def.points}`;
  $('mghint').textContent = HINTS[m.def.game]; $('mgmsg').textContent = ''; $('mgmsg').className = 'msg'; $('mgexit').textContent = 'Бросить (Esc)';
  $('mgpanel').classList.remove('hidden'); $('mgbar').classList.remove('hidden'); $('mgbar').firstChild.style.width = '0%';
  const api = {
    msg: (text, cls = '') => { $('mgmsg').textContent = text; $('mgmsg').className = 'msg ' + cls; },
    progress: v => { $('mgbar').firstChild.style.width = Math.max(0, Math.min(1, v)) * 100 + '%'; },
    where: t => { m.where = t; },
    timer: tm => { $('mgpts').textContent = `+${m.def.points} · ${Math.max(0, Math.ceil(tm))} с`; },
    finish: res => { if (S.wm && S.wm.m === m) closeWorld(res); },
  };
  const ctx = { player: P, give: it => { pickUp(it); P.held = it; }, free: (x, z, y) => isFree(x - 0.3, z - 0.3, x + 0.3, z + 0.3, y + 0.05, y + 1),
    enterCrane: () => { if (!S.crane) enterCrane(); }, exitCrane: () => { if (S.crane) exitCrane(); } };
  S.wm.game = WORLD_GAMES[m.def.game](m.obj, api, ctx);
  m.track = S.wm.game.target ? () => S.wm.game.target() : null;
}
function closeWorld(res) {
  if (!S.wm) return;
  const { m, game } = S.wm; S.wm = null; game.stop(); m.busy = false;
  $('mgpanel').classList.add('hidden'); $('mgexit').textContent = 'Выйти (Esc)';
  if (res && res.success) { const pts = Math.round(m.def.points * res.mult); S.score += pts; S.done++; pop(`+${pts} ${m.def.icon}`, 'good'); }
  removeMission(m);
}
function openMission(m) {
  if (m.def.world) return openWorld(m);
  if (P.ride) dismount(P, false);
  if (P.grab) release(P, 0);
  if (P.held) { drop(P.held, P.pos.x, P.pos.y, P.pos.z); P.held = null; }
  m.busy = true; P.root.visible = false; P.charging = false;
  $('mgicon').textContent = m.def.icon; $('mgtitle').textContent = m.def.name; $('mgpts').textContent = `+${m.def.points}`;
  $('mghint').textContent = HINTS[m.def.game]; $('mgmsg').textContent = ''; $('mgmsg').className = 'msg';
  $('mgpanel').classList.remove('hidden');
  const api = {
    pose: (p, l) => { cam.pose = { p, l, ignore: m.obj.solid }; updateCamera(camera, P, 0, true); },
    progress: v => { const bar = $('mgbar'); if (v === null) bar.classList.add('hidden'); else { bar.classList.remove('hidden'); bar.firstChild.style.width = (v * 100) + '%'; } },
    msg: (text, cls = '') => { $('mgmsg').textContent = text; $('mgmsg').className = 'msg ' + cls; },
    finish: res => { if (S.mg && S.mg.m === m) closeMission(res); },
  };
  S.mg = { m, game: null };
  unlock(); $('lockhint').classList.add('hidden');
  S.mg.game = ALL_GAMES[m.def.game](m.obj, api, { cursor: setCursor, character: P.ch });
}
function closeMission(res) {
  if (!S.mg) return;
  const { m, game } = S.mg;
  game.stop(); S.mg = null; cam.pose = null; m.busy = false; P.root.visible = true; setCursor(true);
  $('lockhint').classList.toggle('hidden', locked());
  $('mgpanel').classList.add('hidden');
  if (!res) return;
  if (res.success) { const pts = Math.round(m.def.points * res.mult); S.score += pts; S.done++; pop(`+${pts} ${m.def.icon}`, 'good'); }
  removeMission(m);
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
  pop('WASD — двигать шар · мышь — камера · E — выйти', 'info');
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
  if (S.mg) { if (btn === 0 && S.mg.game.down) S.mg.game.down(aim(camera)); return; }
  if (S.crane) return;
  // тележку/тачку хватаешь любой кнопкой мыши, ей же отпускаешь (с толчком)
  if (P.grab && (btn === 0 || btn === 2)) { release(P, 1.1); return; }
  if (!P.held && !P.ride && (btn === 0 || btn === 2)) {
    const c = nearestRideable(P, 1.7, true), d = btn === 0 ? nearDoor() : null;
    if (c && (!d || Math.hypot(c.x - P.pos.x, c.z - P.pos.z) < Math.hypot(d.x - P.pos.x, d.z - P.pos.z))) { grab(P, c); return; }
  }
  if (btn === 0) { const d = nearDoor(); if (d) d.open = !d.open; }
  if (btn === 2 && P.held && P.stun <= 0) { P.charging = true; P.charge = 0; P.aimYaw = P.root.rotation.y; $('dot').classList.add('charge'); }
});
on('up', btn => {
  if (S.state !== 'play') return;
  if (S.mg) { if (btn === 0 && S.mg.game.up) S.mg.game.up(aim(camera)); return; }
  if (btn === 2 && P.charging) {
    P.charging = false; $('dot').classList.remove('charge');
    const it = P.held, from = P.ch.holdPoint.clone(), tgt = aimPoint();
    if (it && tgt) { const v = throwVelocity(from, tgt, P.charge, it.def); v.x += P.vel.x * 0.3; v.z += P.vel.z * 0.3; launch(it, from, v); P.held = null; P.throwT = 0.3; }
  }
});
on('key', code => {
  if (S.state !== 'play') return;
  if (code === 'Escape') { if (S.mg) closeMission(null); else if (S.crane) exitCrane(); else if (S.wm) closeWorld(null); }
});
const _aimHit = new V3();
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
  if (S.mg || S.crane || S.state !== 'play') return null;
  if (P.ride) return null;
  if (P.grab) return null;
  if (!P.held) { const it = nearestItem(P.pos, 1.5); if (it) return it.outline; const rb = nearestRideable(P) || nearestRideable(P, 1.7, true); if (rb) return rb.outline; }
  if (nearCrane()) return W.crane.outline;
  const d = nearDoor(); if (d) return d.outline;
  return null;
}
let lastFocus = null;
function interact() {
  if (S.mg) return;
  if (S.crane) { exitCrane(); return; }
  if (P.ride) { dismount(P, false); return; }
  if (P.swing) { leaveSwing(P, false); return; }
  if (P.hidden) { leaveHide(P); return; }
  if (P.grab) { hopIn(P); return; }
  const m = S.wm ? null : nearMission(P);
  if (m) { openMission(m); return; }
  { const q = nearInteract(P); if (q && !P.held) { q.act(P); return; } }
  if (P.held) { drop(P.held, P.pos.x + Math.sin(P.root.rotation.y) * 0.7, P.pos.y, P.pos.z + Math.cos(P.root.rotation.y) * 0.7); P.held = null; return; }
  const it = nearestItem(P.pos, 1.5);
  if (it) { pickUp(it); P.held = it; return; }
  const rb = nearestRideable(P); if (rb) { mount(P, rb); return; }
  if (nearCrane()) enterCrane();
}
function promptText() {
  if (S.mg) return '';
  if (S.crane) return '<b>E</b>выйти из крана';
  if (S.wm) return '';
  const m = nearMission(P); if (m) return `<b>E</b>${m.def.name}`;
  if (P.swing) return '<b>E</b>Встать';
  if (P.hidden) return '<b>E</b>Выскочить';
  { const q = nearInteract(P); if (q && !P.held) return `<b>E</b>${q.label}`; }
  return '';
}

/* ---------- цикл ---------- */
const clock = new THREE.Timer(); let t = 0;
const waterTex = T.water(), waterHi = T.waterHi(), foamTex = T.foam();
function loop() {
  clock.update(); let dt = Math.min(0.05, clock.getDelta());
  if (FX.freeze > 0) { FX.freeze -= dt; dt *= 0.05; }
  t += dt;
  waterTex.offset.x += dt * 0.03; waterTex.offset.y += dt * 0.015; waterHi.offset.x -= dt * 0.05; waterHi.offset.y += dt * 0.035; foamTex.offset.x += dt * 0.04; foamTex.offset.y = Math.sin(t * 1.3) * 0.08;
  if (S.state === 'menu') { menu.update(dt); present(menu.scene, menu.camera); }
  else {
    if (S.state === 'play') {
      S.time -= dt;
      if (tapped('KeyE')) interact();
      if (tapped('KeyF') && !S.mg && !S.crane && P.gadget) useGadget(P, aimPoint());
      if (P.charging) P.charge = Math.min(1, P.charge + dt / CONFIG.throw.chargeTime);
      updatePlayer(P, dt, t, !S.mg && !S.crane, cam.yaw);
      if (P.held) { P.held.pos.copy(P.ch.holdPoint); P.held.g.rotation.y = P.root.rotation.y; }
      if (P.stun > 0 && P.charging) { P.charging = false; $('dot').classList.remove('charge'); }
      updateMissions(dt, t, P, pop);
      if (S.mg) S.mg.game.update(dt);
      if (S.wm) S.wm.game.update(dt);
      S.hudT -= dt; if (S.hudT <= 0) { renderHud(S, P, promptText()); S.hudT = 0.1; }
      renderStamina(P);
      updateEvents(dt, eventUi);
      if (flash.intensity > 0) { const f = P.root.rotation.y; flash.position.set(P.pos.x, P.pos.y + 1.6, P.pos.z); flash.target.position.set(P.pos.x + Math.sin(f) * 6, P.pos.y, P.pos.z + Math.cos(f) * 6); }
      drawMinimap(P, M.list, S.wm && S.wm.game.target ? S.wm.game.target() : null);
      if (S.time <= 0) { S.time = 0; renderHud(S, P, ''); endRound(); }
    }
    // траектория броска
    let shown = 0;
    if (S.state === 'play' && P.charging && P.held) {
      const tgt = aimPoint();
      if (tgt) {
        P.aimYaw = Math.atan2(tgt.x - P.pos.x, tgt.z - P.pos.z);
        const from = P.ch.holdPoint.clone(), v = throwVelocity(from, tgt, P.charge, P.held.def); v.x += P.vel.x * 0.3; v.z += P.vel.z * 0.3;
        shown = predict(from, v, arc, arc.length, P.held.def, land);
      }
      $('dot').style.setProperty('--c', (P.charge * 100) + '%');
    }
    arc.forEach((m, i) => (m.visible = i < shown)); if (!shown) land.visible = false;
    const fo = focusTarget(); if (fo !== lastFocus) { lastFocus && lastFocus.set(false); fo && fo.set(true); lastFocus = fo; $('dot').classList.toggle('focus', !!fo); } pulseOutline(dt);
    if (P) P.root.visible = !S.mg && !S.crane && !P.hidden;
    const dotHtml = P && P.charging ? '<b></b><i></i>' : '<i></i>';
    if (dotHtml !== S.dotHtml) { $('dot').innerHTML = dotHtml; S.dotHtml = dotHtml; }
    updateItems(dt, P);
    updatePushables(dt, S.state === 'play' && !S.crane && !S.mg ? P : null);
    for (const c of W.cats) updateCat(c, dt, t, S.state === 'play' ? P : null);
    updateBirds(dt, t, S.state === 'play' ? P : null);
    const lk = takeLook();
    if (S.crane) {
      // WASD относительно камеры
      let ix = 0, iz = 0; if (keys.KeyA || keys.ArrowLeft) ix--; if (keys.KeyD || keys.ArrowRight) ix++; if (keys.KeyW || keys.ArrowUp) iz--; if (keys.KeyS || keys.ArrowDown) iz++;
      const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw); craneStick.ix = ix * cy + iz * sy; craneStick.iz = -ix * sy + iz * cy;
      cam.orbit.c.lerp(new V3().addVectors(W.crane.ball.position, W.crane.cab).multiplyScalar(0.5).setY(W.crane.ball.position.y + 3), 0.08);
    }
    updateCrane(dt, S.crane ? craneStick : null, S.state === 'play' ? P : null);
    if (S.state === 'play') updateArrow(arrow, P, M.list, dt, t, !S.mg && !S.crane, S.wm && S.wm.game.target ? S.wm.game.target() : null);
    for (const d of W.doors) {
      const want = d.open ? 1.65 * d.inward : 0; d.ang += (want - d.ang) * Math.min(1, dt * 8); d.pivot.rotation.y = d.ang;
      d.solid.on = !d.open && Math.abs(d.ang) < 0.5;
    }
    for (const f of W.animated) f(dt, t);
    updateSwingers(dt, t, S.state === 'play' ? P : null);
    sky.update(camera, t, dt, P, hemi, scene.fog);
    updateLife(dt, t, S.state === 'play' ? P : null, camera);
    updateWorldFx(dt, t, S.state === 'play' ? P : null);
    updateGadgets(dt, t, S.state === 'play' ? P : null);
    if (S.state === 'play') updateBots(dt, t, P);
    cam.shake = FX.shake; cam.fovAdd = P && S.state === 'play' ? P.boost * 6 : 0;
    updateBreakables(dt, S.state === 'play' ? P : null);
    updateParticles(dt);
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
window.__fs = { renderer, S, EV, spawn: k => { spawnMission(P, k); return M.list[M.list.length - 1]; }, openWorld, closeWorld, grab, hopIn, release, arc, land, phys: { groundAt, isFree, solidsNear }, get P() { return P; }, W, M, cam, openMission, enterCrane, startRound, camera };
showMenu();
loop();
