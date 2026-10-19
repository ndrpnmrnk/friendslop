import './styles.css';
import { THREE, V3, G, present, makeCamera, basic, mesh, sprite } from './core/gfx.js';
import { T } from './core/textures.js';
import { CONFIG, SEASON, HINTS } from './config.js';
import { keys, tapped, endFrame, mouse, on, aim, lock, locked, unlock, takeLook } from './core/input.js';
import { DIFF } from './config.js';
import { W } from './world/state.js';
import { generateMap } from './world/world.js';
import { updatePushables } from './world/physics.js';
import { updateParticles } from './world/particles.js';
import { updateBirds } from './world/birds.js';
import { updateCrane } from './world/crane.js';
import { createPlayer, updatePlayer } from './game/player.js';
import { updateCat } from './game/cats.js';
import { updateItems, nearestItem, pickUp, drop, throwVelocity, launch, predict } from './game/items.js';
import { updateCamera, cam, resetCamera } from './game/camera.js';
import { createArrow, updateArrow } from './game/arrow.js';
import { M, resetMissions, spawnWave, removeMission, updateMissions, nearMission, GAMES } from './missions/missions.js';
import { pulseOutline } from './game/outline.js';
import { nearestRideable, mount, dismount } from './game/ride.js';
import { updateBreakables } from './world/breakables.js';
import { $, pop, renderHud, renderStamina } from './ui/hud.js';
import { createMenu } from './ui/menu.js';

/* ---------- сцена игры ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(SEASON.bg);
scene.fog = new THREE.Fog(...SEASON.fog);
const hemi = new THREE.HemisphereLight(SEASON.hemi[0], SEASON.hemi[1], SEASON.hemi[2] * Math.PI); scene.add(hemi);
const sun = new THREE.DirectionalLight(SEASON.sun[0], SEASON.sun[1] * Math.PI); sun.position.set(-30, 50, 25); scene.add(sun);
const camera = makeCamera(CONFIG.camera.fov);
const menu = createMenu();
const arrow = createArrow(scene);
// мышь захватывается для камеры во время игры (кроме мини-игр)
lock.want = () => S.state === 'play' && !S.mg;
document.addEventListener('pointerlockchange', () => { $('lockhint').classList.toggle('hidden', locked() || S.state !== 'play' || !!S.mg); document.body.classList.toggle('locked', locked()); });

const S = { state: 'menu', time: 0, score: 0, done: 0, mg: null, crane: false, hudT: 0, cursor: true };
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
$('mgexit').onclick = () => closeMission(null);

/* ---------- раунд ---------- */
function startRound() {
  generateMap(scene, (Math.random() * 1e9) | 0);
  resetMissions();
  if (P) scene.remove(P.root);
  P = createPlayer(menu.skin()); scene.add(P.root);
  const sp = W.spawns[(Math.random() * W.spawns.length) | 0];
  P.pos.set(sp.x, sp.y, sp.z); P.root.rotation.y = Math.PI; P.facing = Math.PI;
  spawnWave(P);
  Object.assign(S, { state: 'play', time: CONFIG.roundTime, score: 0, done: 0, mg: null, crane: false });
  cam.pose = null; resetCamera(Math.random() * Math.PI * 2);
  $('lockhint').classList.toggle('hidden', locked());
  $('menu').classList.add('hidden'); $('results').classList.add('hidden'); $('hud').classList.remove('hidden'); $('mgpanel').classList.add('hidden');
  document.body.classList.add('playing'); setCursor(true);
  updateCamera(camera, P, 0, true);
}
function endRound() {
  if (S.mg) closeMission(null);
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
function openMission(m) {
  if (P.ride) dismount(P, false);
  if (P.held) { drop(P.held, P.pos.x, P.pos.y, P.pos.z); P.held = null; }
  m.busy = true; P.root.visible = false; P.charging = false;
  $('mgicon').textContent = m.def.icon; $('mgtitle').textContent = m.def.name; $('mgpts').textContent = `+${m.def.points}`;
  $('mghint').textContent = HINTS[m.def.game]; $('mgmsg').textContent = ''; $('mgmsg').className = 'msg';
  $('mgpanel').classList.remove('hidden');
  const api = {
    pose: (p, l) => { cam.pose = { p, l }; },
    progress: v => { const bar = $('mgbar'); if (v === null) bar.classList.add('hidden'); else { bar.classList.remove('hidden'); bar.firstChild.style.width = (v * 100) + '%'; } },
    msg: (text, cls = '') => { $('mgmsg').textContent = text; $('mgmsg').className = 'msg ' + cls; },
    finish: res => { if (S.mg && S.mg.m === m) closeMission(res); },
  };
  S.mg = { m, game: null };
  unlock(); $('lockhint').classList.add('hidden');
  S.mg.game = GAMES[m.def.game](m.obj, api, { cursor: setCursor });
}
function closeMission(res) {
  if (!S.mg) return;
  const { m, game } = S.mg;
  game.stop(); S.mg = null; cam.pose = null; m.busy = false; P.root.visible = true; setCursor(true);
  $('lockhint').classList.toggle('hidden', locked());
  $('mgpanel').classList.add('hidden');
  if (!res) return;
  if (res.success) { const pts = Math.round(m.def.points * res.mult); S.score += pts; S.done++; pop(`+${pts} ${m.def.icon}`, 'good'); }
  else pop('Миссия провалена', 'bad');
  removeMission(m);
}

/* ---------- кран ---------- */
function nearCrane() { const c = W.crane; return c && !S.crane && Math.hypot(c.cab.x - P.pos.x, c.cab.z - P.pos.z) < 1.9 && Math.abs(c.cab.y - P.pos.y) < 0.6; }
const craneStick = { nx: 0, ny: 0 };
function enterCrane() {
  if (P.ride) dismount(P, false);
  craneStick.nx = 0; craneStick.ny = 0;
  const c = W.crane; if (P.held) { drop(P.held, P.pos.x, P.pos.y, P.pos.z); P.held = null; }
  S.crane = true; c.active = true; P.frozen = true; P.root.visible = false;
  const mid = new V3().addVectors(c.look, c.cab).multiplyScalar(0.5); mid.y = c.look.y;
  cam.pose = { p: mid.clone().add(new V3(0, 15, 14)), l: mid };
  pop('Мышь: влево-вправо — стрела, вверх-вниз — тележка', 'info');
}
function exitCrane() { const c = W.crane; S.crane = false; c.active = false; P.frozen = false; P.root.visible = true; P.pos.copy(c.seat); P.vel.set(0, 0, 0); cam.pose = null; }

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
  if (btn === 0) { const d = nearDoor(); if (d) d.open = !d.open; }
  if (btn === 2 && P.held && P.stun <= 0) { P.charging = true; P.charge = 0; P.aimYaw = P.root.rotation.y; $('dot').classList.add('charge'); }
});
on('up', btn => {
  if (S.state !== 'play') return;
  if (S.mg) { if (btn === 0 && S.mg.game.up) S.mg.game.up(); return; }
  if (btn === 2 && P.charging) {
    P.charging = false; $('dot').classList.remove('charge');
    const it = P.held, from = P.ch.holdPoint.clone(), tgt = aimPoint();
    if (it && tgt) { const v = throwVelocity(from, tgt, P.charge, it.def); v.x += P.vel.x * 0.3; v.z += P.vel.z * 0.3; launch(it, from, v); P.held = null; P.throwT = 0.3; }
  }
});
on('key', code => {
  if (S.state !== 'play') return;
  if (code === 'Escape') { if (S.mg) closeMission(null); else if (S.crane) exitCrane(); }
});
const _aimHit = new V3();
function aimPoint() {
  const r = aim(camera); r.far = 80;
  const hits = r.intersectObjects(W.group.children, true);
  for (const h of hits) { if (P.held && h.point.distanceTo(P.ch.holdPoint) < 0.7) continue; if (h.object.isSprite || (h.object.material && h.object.material.transparent && h.object.material.opacity < 0.5)) continue; return _aimHit.copy(h.point); }
  const plane = new THREE.Plane(new V3(0, 1, 0), -P.pos.y);
  return r.ray.intersectPlane(plane, _aimHit);
}

// ближайший объект, с которым можно взаимодействовать: его контур подсвечивается
function focusTarget() {
  if (S.mg || S.crane || S.state !== 'play') return null;
  if (P.ride) return null;
  if (!P.held) { const it = nearestItem(P.pos, 1.5); if (it) return it.outline; const rb = nearestRideable(P); if (rb) return rb.outline; }
  if (nearCrane()) return W.crane.outline;
  const d = nearDoor(); if (d) return d.outline;
  return null;
}
let lastFocus = null;
function interact() {
  if (S.mg) return;
  if (S.crane) { exitCrane(); return; }
  if (P.ride) { dismount(P, false); return; }
  const m = nearMission(P);
  if (m) { openMission(m); return; }
  if (P.held) { drop(P.held, P.pos.x + Math.sin(P.root.rotation.y) * 0.7, P.pos.y, P.pos.z + Math.cos(P.root.rotation.y) * 0.7); P.held = null; return; }
  const it = nearestItem(P.pos, 1.5);
  if (it) { pickUp(it); P.held = it; return; }
  const rb = nearestRideable(P); if (rb) { mount(P, rb); return; }
  if (nearCrane()) enterCrane();
}
function promptText() {
  if (S.mg) return '';
  if (S.crane) return '<b>E</b>выйти из крана';
  const m = nearMission(P); if (m) return `<b>E</b>${m.def.name}`;
  return '';
}

/* ---------- цикл ---------- */
const clock = new THREE.Timer(); let t = 0;
const waterTex = T.water();
function loop() {
  clock.update(); const dt = Math.min(0.05, clock.getDelta()); t += dt;
  waterTex.offset.x += dt * 0.03; waterTex.offset.y += dt * 0.015;
  if (S.state === 'menu') { menu.update(dt); present(menu.scene, menu.camera); }
  else {
    if (S.state === 'play') {
      S.time -= dt;
      if (tapped('KeyE')) interact();
      if (P.charging) P.charge = Math.min(1, P.charge + dt / CONFIG.throw.chargeTime);
      updatePlayer(P, dt, t, !S.mg && !S.crane, cam.yaw);
      if (P.held) { P.held.pos.copy(P.ch.holdPoint); P.held.g.rotation.y = P.root.rotation.y; }
      if (P.stun > 0 && P.charging) { P.charging = false; $('dot').classList.remove('charge'); }
      updateMissions(dt, t, P, pop);
      if (S.mg) S.mg.game.update(dt);
      S.hudT -= dt; if (S.hudT <= 0) { renderHud(S, P, promptText()); S.hudT = 0.1; }
      renderStamina(P);
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
    if (P) P.root.visible = !S.mg && !S.crane;
    const dotHtml = P && P.charging ? '<b></b><i></i>' : '<i></i>';
    if (dotHtml !== S.dotHtml) { $('dot').innerHTML = dotHtml; S.dotHtml = dotHtml; }
    updateItems(dt, P);
    updatePushables(dt, S.state === 'play' && !S.crane && !S.mg ? P : null);
    for (const c of W.cats) updateCat(c, dt, t, S.state === 'play' ? P : null);
    updateBirds(dt, t, S.state === 'play' ? P : null);
    const lk = takeLook();
    if (S.crane) { craneStick.nx = Math.max(-1, Math.min(1, craneStick.nx + lk.dx * 0.004)); craneStick.ny = Math.max(-1, Math.min(1, craneStick.ny - lk.dy * 0.004)); }
    updateCrane(dt, S.crane ? (locked() ? craneStick : mouse) : null);
    if (S.state === 'play') updateArrow(arrow, P, M.list, dt, t, !S.mg && !S.crane);
    for (const d of W.doors) {
      const want = d.open ? 1.65 * d.inward : 0; d.ang += (want - d.ang) * Math.min(1, dt * 8); d.pivot.rotation.y = d.ang;
      d.solid.on = !d.open && Math.abs(d.ang) < 0.5;
    }
    for (const f of W.animated) f(dt, t);
    updateBreakables(dt);
    updateParticles(dt);
    updateCamera(camera, P, dt, false, S.state === 'play' && !S.crane ? lk : null, !!(P && P.charging));
    present(scene, camera);
  }
  endFrame();
  requestAnimationFrame(loop);
}
// отладочный доступ из консоли браузера
window.__fs = { S, arc, land, get P() { return P; }, W, M, cam, openMission, enterCrane, startRound, camera };
showMenu();
loop();
