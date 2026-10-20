import { THREE, G, V3, col, lam, tmat, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { CONFIG } from '../config.js';
import { W } from '../world/state.js';
import { pushOut, groundAt, impulsePushables } from '../world/physics.js';
import { burst, puff, chunk, smokeRing, decal } from '../world/particles.js';
import { hitBreakables } from '../world/breakables.js';
import { scareBirds } from '../world/birds.js';
import { actors, shove, knockDown, dropHeld } from './actors.js';
import { gust, WX } from '../world/weather.js';
import { shake } from './worldfx.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';

/* Жители города и происшествия.
   Бабка с метлой охраняет клумбу: топчешь цветы или носишься рядом — гонится и лупит метлой.
   Собака хватает брошенные предметы и убегает с ними; лает на прохожих.
   Происшествия раз в 30–40 с: по улице катится огромная тыква, едет мусоровоз, налетает порыв ветра. */
export const TOWN = { folks: [], inc: null, incT: 30, toast: null };
export function resetTown() {
  for (const f of TOWN.folks) W.group.remove(f.g); TOWN.folks = [];
  if (TOWN.inc) TOWN.inc.stop(); TOWN.inc = null;
  if (TOWN.thief) { W.group.remove(TOWN.thief.g); } TOWN.thief = W.thief = null; TOWN.thiefT = 45 + Math.random() * 20; TOWN.incT = 28 + Math.random() * 10;
  // бабка — у клумбы с цветами (в одном-двух районах)
  const beds = W.flowerbeds.filter(b => b.x1 - b.x0 > 1.5).sort(() => Math.random() - 0.5).slice(0, 2);
  for (const bed of beds) TOWN.folks.push(granny(bed));
  buildFlowers();
  // собака — во дворе или парке (там, где живут коты)
  const homes = W.catHomes.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  for (const h of homes) TOWN.folks.push(dog(h));
  W.dogs = TOWN.folks.filter(f => f.kind === 'dog');
}
function setupBody(g, x, y, z) { g.position.set(x, y, z); W.group.add(g); W.keep.push(g); }

/* ---------- цветы клумб (v0.18) ----------
   Все цветы клумб — три инстанс-меша (стебли, бутоны, листья): наступил — цветок примят и вянет (k → 1),
   бабушка поливает/поправляет — выпрямляется (k → 0). На земле остаются следы. */
const FL = { stems: null, blooms: null, dirty: false, stepT: 0 };
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3(), _c = new THREE.Color(), WILT = new THREE.Color(0x7a6a3a);
function buildFlowers() {
  FL.stems = FL.blooms = null; const n = W.flowers.length; if (!n) return;
  FL.stems = new THREE.InstancedMesh(G.box, new THREE.MeshLambertMaterial({ color: 0x3a5a2a }), n);
  FL.blooms = new THREE.InstancedMesh(G.ico, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
  W.group.add(FL.stems, FL.blooms); W.keep.push(FL.stems, FL.blooms);
  for (let i = 0; i < n; i++) placeFlower(i);
  FL.stems.instanceMatrix.needsUpdate = FL.blooms.instanceMatrix.needsUpdate = true; FL.blooms.instanceColor.needsUpdate = true;
}
function placeFlower(i) {
  const f = W.flowers[i], k = f.k, tilt = k * 1.35 + Math.sin(f.ph + (FL.t || 0) * 1.5) * 0.03 * (1 - k), dx = Math.cos(f.ph), dz = Math.sin(f.ph);
  _e.set(dz * tilt, 0, -dx * tilt); _q.setFromEuler(_e);
  const up = new V3(0, 1, 0).applyQuaternion(_q), hh = f.hh * (1 - k * 0.35);
  _p.set(f.x + up.x * hh / 2, f.y + up.y * hh / 2, f.z + up.z * hh / 2); _s.set(0.015, hh, 0.015); _m4.compose(_p, _q, _s); FL.stems.setMatrixAt(i, _m4);
  _p.set(f.x + up.x * (hh + 0.03), f.y + up.y * (hh + 0.03), f.z + up.z * (hh + 0.03)); _s.set(0.055, 0.04 * (1 - k * 0.5), 0.055); _m4.compose(_p, _q, _s); FL.blooms.setMatrixAt(i, _m4);
  _c.setHex(f.c).lerp(WILT, k * 0.75); FL.blooms.setColorAt(i, _c);
}
function updFlowers(dt) {
  if (!FL.stems) return; FL.t = (FL.t || 0) + dt; FL.stepT -= dt;
  const list = W.flowers;
  for (const a of actors()) { if (a.hidden || !a.onGround) continue;
    for (const bed of W.flowerbeds) { if (a.pos.x < bed.x0 || a.pos.x > bed.x1 || a.pos.z < bed.z0 || a.pos.z > bed.z1 || Math.abs(a.pos.y - bed.top) > 0.35) continue;
      let hit = 0; for (const f of list) if (f.bed === bed && f.k < 0.9 && Math.hypot(f.x - a.pos.x, f.z - a.pos.z) < 0.38) { f.k = 1; f.w = 0; hit++; }
      if (hit) { FL.dirty = true; bed.trampled = (bed.trampled || 0) + hit; bed.by = a; if (Math.random() < 0.6) burst(a.pos.x, bed.top + 0.2, a.pos.z, 3, { color: 0x6a8a3a, size: 0.08, speed: 1, up: 1.2 }); }
      if (Math.hypot(a.vel.x, a.vel.z) > 1 && FL.stepT <= 0) { FL.stepT = 0.25; const d = decal(T.footW(), a.pos.x, bed.top - 0.01, a.pos.z, 0.3, 14, 0x3a2a1a); d.rotation.z = a.root.rotation.y; } } }
  // лёгкое покачивание раз в несколько кадров и восстановление политых
  for (let i = 0; i < list.length; i++) { const f = list[i]; if (f.w > 0) { f.w -= dt; f.k = Math.max(0, f.k - dt * 0.6); FL.dirty = true; } }
  if (FL.dirty || (FL.t * 10 | 0) % 4 === 0) { for (let i = 0; i < list.length; i++) placeFlower(i); FL.stems.instanceMatrix.needsUpdate = FL.blooms.instanceMatrix.needsUpdate = true; FL.blooms.instanceColor.needsUpdate = true; FL.dirty = false; }
}

/* ---------- бабушка (v0.18) ----------
   Ухаживает за клумбой: поливает из лейки, поправляет примятые цветы. Оружие (случайно): лейка — окатит водой (мокрый, скользишь),
   или метла — выметет толчком. Наступили на клумбу — злится ~1 с (поднимает лейку/метлу, над головой #@!0), потом гонится и бьёт. */
let CURSE = null;
function curseTex() {
  if (CURSE) return CURSE; const c = document.createElement('canvas'); c.width = 64; c.height = 16; const x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.font = 'bold 15px monospace'; x.textBaseline = 'top'; const ch = ['#', '@', '!', '0'], cl = ['#ff3a3a', '#f5c542', '#ff3a3a', '#f1e8ff'];
  ch.forEach((q, i) => { x.fillStyle = '#17111f'; x.fillText(q, i * 16 + 3, 2); x.fillStyle = cl[i]; x.fillText(q, i * 16 + 2, 1); });
  CURSE = new THREE.CanvasTexture(c); CURSE.magFilter = CURSE.minFilter = THREE.NearestFilter; return CURSE;
}
function granny(bed) {
  const g = new THREE.Group(), weapon = Math.random() < 0.5 ? 'can' : 'broom';
  g.add(compose('granny2', a => { const dress = lam({ map: T.awning('#6a4aa8', '#5a3a98') }, 'grannyDress'), skin = col(0xe8c0a0), hair = col(0xd8d8e0), apron = col(0xf1e8ff), shoe = col(0x2b2533);
    a(G.cone8, dress, 0, 0.52, 0, 0.42, 1.0, 0.42); a(G.sph10, dress, 0, 1.0, 0, 0.3, 0.28, 0.26);
    a(G.box, apron, 0, 0.7, 0.3, 0.34, 0.5, 0.02, -0.18); a(G.box, apron, 0, 0.98, 0.25, 0.26, 0.2, 0.02); a(G.box, col(0xff8aa8), 0, 0.62, 0.36, 0.12, 0.08, 0.02, -0.18);
    a(G.sph10, skin, 0, 1.38, 0.02, 0.22, 0.24, 0.21); a(G.sph, skin, 0, 1.35, 0.23, 0.05, 0.05, 0.05);
    a(G.sph10, hair, 0, 1.52, -0.08, 0.21, 0.15, 0.19); a(G.sph, hair, 0, 1.64, -0.16, 0.11, 0.1, 0.11); a(G.box, col(0x8a6ac8), 0, 1.6, -0.2, 0.12, 0.03, 0.03);
    for (const sx of [-1, 1]) { a(G.torus, col(0x2b2533), sx * 0.08, 1.4, 0.2, 0.06, 0.06, 0.06); a(G.box, col(0x17111f), sx * 0.08, 1.4, 0.21, 0.025, 0.025, 0.01); a(G.sph, col(0xff9a9a), sx * 0.13, 1.31, 0.17, 0.04, 0.025, 0.02); }
    a(G.box, col(0x2b2533), 0.0, 1.47, 0.2, 0.06, 0.012, 0.01); a(G.torus, col(0xd8243a), 0, 1.18, 0, 0.2, 0.2, 0.25, Math.PI / 2); a(G.box, col(0x8a4a4a), 0, 1.28, 0.21, 0.07, 0.015, 0.01);
    for (const sx of [-1, 1]) { a(G.box, shoe, sx * 0.13, 0.05, 0.06, 0.12, 0.08, 0.22); a(G.box, col(0xf1e8ff), sx * 0.13, 0.13, 0.02, 0.1, 0.06, 0.1); } }));
  // руки (рукав + кисть): правая держит орудие
  const arms = [-1, 1].map(sx => { const q = new THREE.Group(); q.position.set(sx * 0.3, 1.1, 0); g.add(q); q.add(compose('grannyArm', a => { a(G.cyl8, lam({ map: T.awning('#6a4aa8', '#5a3a98') }, 'grannyDress'), 0, -0.16, 0, 0.07, 0.32, 0.07); a(G.sph, col(0xe8c0a0), 0, -0.35, 0, 0.06, 0.06, 0.06); })); return q; });
  const tool = new THREE.Group(); tool.position.set(0, -0.36, 0.05); arms[1].add(tool);
  if (weapon === 'broom') tool.add(compose('broom', a => { a(G.cyl6, tmat(T.wood()), 0, 0.1, 0, 0.025, 1.3, 0.025); a(G.cone6, tmat(T.hay()), 0, -0.65, 0, 0.16, 0.4, 0.16, Math.PI); a(G.box, col(0xd8243a), 0, -0.45, 0, 0.12, 0.04, 0.12); }));
  else tool.add(compose('wcan', a => { const gr = col(0x4aa86a); a(G.cyl12, gr, 0, -0.12, 0.1, 0.12, 0.2, 0.12); a(G.cyl8, gr, 0, -0.06, 0.32, 0.025, 0.3, 0.025, 1.0); a(G.cyl8, col(0x2b6a3a), 0, 0.05, 0.47, 0.05, 0.04, 0.05, 1.0);
    a(G.torus, col(0x2b6a3a), 0, 0.02, 0.05, 0.09, 0.09, 0.09, 0, Math.PI / 2); }));
  const curse = new THREE.Sprite(new THREE.SpriteMaterial({ map: curseTex(), transparent: true, depthWrite: false })); curse.scale.set(0.9, 0.22, 1); curse.position.y = 2.0; curse.visible = false; g.add(curse);
  const cx = (bed.x0 + bed.x1) / 2, cz = (bed.z0 + bed.z1) / 2, home = new V3(cx, bed.y, bed.z1 + 1.0);
  setupBody(g, home.x, home.y, home.z);
  return { kind: 'granny', weapon, g, arms, tool, curse, bed, home, pos: g.position, vel: new V3(), target: null, angry: 0, rage: 0, cd: 0, swat: 0, wt: 0, wp: home.clone(), stun: 0, ph: 0, job: null, jobT: 6 + Math.random() * 6 };
}
function updGranny(f, dt, t) {
  const p = f.pos, bed = f.bed, A = f.arms;
  f.curse.visible = f.rage > 0; if (f.rage > 0) f.curse.position.y = 2.0 + Math.abs(Math.sin(t * 12)) * 0.08;
  if (f.stun > 0) { f.stun -= dt; f.g.rotation.z = Math.sin(t * 10) * 0.2; return; } f.g.rotation.z = 0;
  // кто топчет клумбу или носится рядом — тот враг
  if (!f.target) for (const a of actors()) { if (a.hidden) continue; const inBed = a.pos.x > bed.x0 - 0.2 && a.pos.x < bed.x1 + 0.2 && a.pos.z > bed.z0 - 0.2 && a.pos.z < bed.z1 + 0.2 && Math.abs(a.pos.y - bed.top) < 0.4;
    const fast = Math.hypot(a.vel.x, a.vel.z) > 9 && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < 3;
    if (inBed || fast) { f.target = a; f.angry = 7; f.rage = 1; f.job = null; sfx('curse', { at: p }); sfx('granny', { at: p }); break; } }
  // злится: стоит, трясёт орудием над головой
  if (f.rage > 0) { f.rage -= dt; const tg = f.target; if (tg) f.g.rotation.y = Math.atan2(tg.pos.x - p.x, tg.pos.z - p.z);
    A[1].rotation.x = -2.8 + Math.sin(t * 18) * 0.3; A[0].rotation.x = -2.4 + Math.sin(t * 18 + 1) * 0.3; f.g.position.y = p.y + Math.abs(Math.sin(t * 14)) * 0.06; f.vel.set(0, 0, 0); return; }
  let goal = f.wp, sp = 1.4;
  if (f.target) { f.angry -= dt; goal = f.target.pos; sp = 5.6; if (f.angry <= 0 || f.target.hidden || Math.hypot(goal.x - f.home.x, goal.z - f.home.z) > 14) { f.target = null; } }
  else {
    // уход за клумбой: идёт к примятому цветку (или просто к клумбе) и поливает/поправляет
    f.jobT -= dt;
    if (!f.job && (f.jobT <= 0 || W.flowers.some(q => q.bed === bed && q.k > 0.5))) { f.jobT = 10 + Math.random() * 8; const fl = W.flowers.filter(q => q.bed === bed).sort((x, y) => y.k - x.k)[0];
      if (fl) { const ox = fl.x - (bed.x0 + bed.x1) / 2, oz = fl.z - (bed.z0 + bed.z1) / 2, side = Math.abs(ox) / (bed.x1 - bed.x0) > Math.abs(oz) / (bed.z1 - bed.z0) ? [Math.sign(ox), 0] : [0, Math.sign(oz) || 1];
        f.job = { fl, x: side[0] ? (side[0] > 0 ? bed.x1 + 0.45 : bed.x0 - 0.45) : fl.x, z: side[1] ? (side[1] > 0 ? bed.z1 + 0.45 : bed.z0 - 0.45) : fl.z, t: 0 }; } }
    if (f.job) { goal = f.job; sp = 1.6; }
    else { f.wt -= dt; if (f.wt <= 0) { f.wt = 3 + Math.random() * 4; const a = Math.random() * 6.28; f.wp.set(f.home.x + Math.cos(a) * 1.5, f.home.y, f.home.z + Math.sin(a) * 1.0); } }
  }
  const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz);
  if (d > (f.job && !f.target ? 0.25 : 0.9)) { f.vel.x += (dx / d * sp - f.vel.x) * Math.min(1, dt * 5); f.vel.z += (dz / d * sp - f.vel.z) * Math.min(1, dt * 5); } else { f.vel.multiplyScalar(0.8); }
  p.x += f.vel.x * dt; p.z += f.vel.z * dt; pushOut(p, 0.35, p.y + 0.3, p.y + 1.6); p.y = groundAt(p.x, p.z, 0.2, p.y + 0.45);
  const v = Math.hypot(f.vel.x, f.vel.z); if (v > 0.3) f.g.rotation.y = Math.atan2(f.vel.x, f.vel.z);
  f.ph += dt * v * 5; f.g.position.y = p.y + Math.abs(Math.sin(f.ph)) * 0.05;
  A[0].rotation.x = Math.sin(f.ph) * 0.3;
  // работа на месте: лейка — наклон и струйка воды, метла — поправляет (машет над цветами)
  if (f.job && !f.target && d < 0.4) { const fl = f.job.fl; f.job.t += dt; f.g.rotation.y = Math.atan2(fl.x - p.x, fl.z - p.z);
    if (f.weapon === 'can') { A[1].rotation.x = -1.2; f.tool.rotation.x = 0.7; if (Math.random() < dt * 30) puff(fl.x + (Math.random() - 0.5) * 0.3, fl.y + 0.55, fl.z + (Math.random() - 0.5) * 0.3, { color: 0x9ccbec, size: 0.06, grow: 0, vy: -3, life: 0.25 }); }
    else { A[1].rotation.x = -0.9 + Math.sin(t * 6) * 0.3; f.tool.rotation.x = 0; }
    for (const q of W.flowers) if (q.bed === bed && Math.hypot(q.x - fl.x, q.z - fl.z) < 0.7 && q.k > 0) q.w = 1;
    if (f.job.t > 3) f.job = null; return; }
  // удар орудием
  f.cd -= dt; if (f.swat > 0) { f.swat -= dt; A[1].rotation.x = -2.6 + (1 - f.swat / 0.4) * 2.6; f.tool.rotation.x = 0; } else { A[1].rotation.x = f.target ? -0.6 + Math.sin(t * 9) * 0.4 : Math.sin(t * 2) * 0.1; f.tool.rotation.x = 0; }
  if (f.target && d < 1.3 && f.cd <= 0) { f.cd = 1.2; f.swat = 0.4; const a = f.target; voice(a.ch, 'hurt', a === W.player ? undefined : a.pos); sfx('granny', { at: p, v: 0.8 });
    if (f.weapon === 'broom') { shove(a, dx, dz, 7, 3.5, true); sfx('swat', { at: p }); burst(a.pos.x, a.pos.y + 1, a.pos.z, 6, { color: 0xd8b060, size: 0.12, speed: 2 }); }
    else { a.push && a.push.set(dx / (d || 1) * 3, 0, dz / (d || 1) * 3); a.wetT = 5; a.slipT = 3; sfx('splash', { at: a.pos }); for (let i = 0; i < 12; i++) puff(a.pos.x, a.pos.y + 1.6, a.pos.z, { color: 0x9ccbec, size: 0.1, grow: 0, vx: (Math.random() - 0.5) * 2, vy: -1, vz: (Math.random() - 0.5) * 2, g: 9, life: 0.5 }); }
    W.onFunny && W.onFunny(a, 'granny'); }
  // выпад в бабку — она шатается
  for (const a of actors()) if (a.dive === 'air' && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < 0.9) { f.stun = 1.2; f.target = a; f.angry = 7; sfx('granny', { at: p }); }
}

/* ---------- собака (v0.18) ----------
   Твёрдая (толкается), гоняет котов, выпрашивает вкусное (сидит, виляет хвостом), лает; приносит брошенное, бежит на свисток. */
const FOOD = new Set(['pizza', 'tomato', 'cucumber', 'can', 'pumpkin']);
function dog(h) {
  const g = new THREE.Group(), coats = [[0x9a6a3a, 0x5a3a1e, 0xe8d0b0], [0xd8c8a8, 0x8a6a4a, 0xf1e8ff], [0x3a3440, 0x17111f, 0xb08a6a]], [c0, c1, c2] = coats[(Math.random() * 3) | 0];
  const fur = lam({ map: T.fur({ name: 'dog' + c0, base: '#' + c0.toString(16).padStart(6, '0'), light: '#' + c2.toString(16).padStart(6, '0'), dark: '#' + c1.toString(16).padStart(6, '0'), stripes: false }) }, 'dogFur' + c0), dk = col(c1), lt = col(c2);
  const body = new THREE.Group(); g.add(body);
  body.add(compose('dog2' + c0, a => {
    a(G.sph10, fur, 0, 0.44, 0, 0.21, 0.19, 0.42); a(G.sph10, lt, 0, 0.36, 0.12, 0.15, 0.12, 0.25); a(G.sph10, dk, 0.08, 0.52, -0.12, 0.12, 0.08, 0.14);
    a(G.torus, col(0xd8243a), 0, 0.52, 0.28, 0.12, 0.12, 0.12, Math.PI / 2 - 0.4); a(G.cyl8, col(0xf5c542), 0, 0.43, 0.36, 0.04, 0.01, 0.04, Math.PI / 2); }));
  const head = new THREE.Group(); head.position.set(0, 0.62, 0.4); body.add(head);
  head.add(compose('dogHead' + c0, a => {
    a(G.sph10, fur, 0, 0, 0, 0.17, 0.16, 0.17); a(G.box, lt, 0, -0.05, 0.17, 0.13, 0.1, 0.16); a(G.sph, col(0x17111f), 0, -0.01, 0.26, 0.045, 0.035, 0.03);
    a(G.box, col(0xd85a6a), 0, -0.1, 0.2, 0.06, 0.012, 0.08);
    for (const sx of [-1, 1]) { a(G.box, col(0x17111f), sx * 0.07, 0.05, 0.155, 0.035, 0.035, 0.01); a(G.box, col(0xf1e8ff), sx * 0.075, 0.06, 0.158, 0.012, 0.012, 0.005); a(G.box, dk, sx * 0.07, 0.11, 0.13, 0.05, 0.015, 0.02); } }));
  const ears = [-1, 1].map(sx => { const q = new THREE.Group(); q.position.set(sx * 0.14, 0.08, -0.02); head.add(q); q.add(compose('dogEar' + c1, a => a(G.box, dk, 0, -0.08, 0, 0.05, 0.18, 0.1))); q.rotation.z = sx * 0.3; return q; });
  const legs = [[0.11, 0.26], [-0.11, 0.26], [0.11, -0.26], [-0.11, -0.26]].map(([x, z]) => { const q = new THREE.Group(); q.position.set(x, 0.34, z); g.add(q); q.add(compose('dogLeg2' + c0, a => { a(G.box, fur, 0, -0.15, 0, 0.08, 0.3, 0.08); a(G.box, lt, 0, -0.31, 0.02, 0.09, 0.05, 0.12); })); return q; });
  const tail = new THREE.Group(); tail.position.set(0, 0.52, -0.4); body.add(tail); tail.add(compose('dogTail2' + c0, a => { a(G.box, fur, 0, 0.1, -0.05, 0.05, 0.25, 0.05, -0.6); a(G.box, lt, 0, 0.22, -0.12, 0.055, 0.06, 0.055, -0.6); }));
  const x = (h.x0 + h.x1) / 2, z = (h.z0 + h.z1) / 2; setupBody(g, x, h.y, z);
  return { kind: 'dog', g, body, head, ears, legs, tail, home: h, pos: g.position, vel: new V3(), it: null, runT: 0, wt: 0, wp: new V3(x, h.y, z), barkT: 3, ph: 0, chase: null, catT: 8 + Math.random() * 8, cat: null, beg: null, begCD: 0 };
}
function updDog(f, dt, t) {
  const p = f.pos, h = f.home;
  // заметил брошенный предмет — бежит за ним
  if (!f.it && !f.chase) for (const it of W.items) { if (it.state === 'rest' && it.landT > 0 && it.def.mass < 2 && Math.hypot(it.pos.x - p.x, it.pos.z - p.z) < 13 && Math.abs(it.pos.y - p.y) < 1) { f.chase = it; sfx('bark', { at: p }); break; } }
  for (const it of W.items) if (it.landT > 0) it.landT -= dt / Math.max(1, TOWN.folks.length);
  let goal = f.wp, sp = 2;
  // гоняет котов (мешает их поймать): иногда выбирает кота поблизости и несётся за ним
  f.catT -= dt; if (!f.cat && !f.chase && !f.it && f.catT <= 0) { f.catT = 12 + Math.random() * 12; f.cat = W.cats.find(c => c.mode === 'walk' && !c.sleep && Math.hypot(c.root.position.x - p.x, c.root.position.z - p.z) < 12) || null; if (f.cat) { f.catRun = 5; sfx('bark', { at: p }); } }
  if (f.cat) { f.catRun -= dt; const cp = f.cat.root.position; if (f.catRun <= 0 || f.cat.mode !== 'walk' || f.cat.sleep) f.cat = null; else { goal = cp; sp = 6.5; if (Math.random() < dt * 1.5) sfx('bark', { at: p, v: 0.7 }); } }
  // выпрашивает: подходит к тому, у кого в руках еда, садится и виляет хвостом
  if (f.begCD > 0) f.begCD -= dt;
  if (!f.cat && !f.chase && !f.it && !f.beg && f.begCD <= 0) { const a = actors().find(a => a.held && FOOD.has(a.held.type) && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < 8); if (a) { f.beg = a; f.begT = 6; } }
  if (f.beg) { f.begT -= dt; const a = f.beg; if (f.begT <= 0 || !a.held || !FOOD.has(a.held.type)) { f.beg = null; f.begCD = 10; } else { goal = a.pos; sp = 3.5; } }
  // свисток: собака бежит к тому, кто свистнул, и приносит ему то, что держит в зубах
  const wh = W.whistle; if (wh && wh.t > 0 && !f.chase && Math.hypot(wh.x - p.x, wh.z - p.z) < 30) { goal = wh; sp = 8;
    if (Math.hypot(wh.x - p.x, wh.z - p.z) < 1.4) { if (f.it) { const it = f.it; f.it = null; it.state = 'rest'; it.landT = 0; it.pos.set(p.x, p.y + it.def.r, p.z); } wh.t = 0; sfx('bark', { at: p }); } }
  if (f.chase) { if (f.chase.state !== 'rest') f.chase = null; else { goal = f.chase.pos; sp = 7.5; if (Math.hypot(goal.x - p.x, goal.z - p.z) < 0.6) { f.it = f.chase; f.chase = null; f.it.state = 'held'; f.runT = 5; const a = Math.random() * 6.28; f.wp.set(p.x + Math.cos(a) * 9, p.y, p.z + Math.sin(a) * 9); } } }
  else if (f.it) { goal = f.wp; sp = 6.5; f.runT -= dt; if (f.runT <= 0 || Math.hypot(goal.x - p.x, goal.z - p.z) < 0.8) { const it = f.it; f.it = null; it.state = 'rest'; it.landT = 0; it.pos.set(p.x, p.y + it.def.r, p.z); sfx('bark', { at: p, v: 0.6 }); } }
  else { f.wt -= dt; if (f.wt <= 0) { f.wt = 2 + Math.random() * 4; f.wp.set(h.x0 + Math.random() * (h.x1 - h.x0), h.y, h.z0 + Math.random() * (h.z1 - h.z0)); } }
  const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz), stop = f.beg ? 1.2 : 0.4;
  if (d > stop) { f.vel.x += (dx / d * sp - f.vel.x) * Math.min(1, dt * 6); f.vel.z += (dz / d * sp - f.vel.z) * Math.min(1, dt * 6); } else f.vel.multiplyScalar(0.8);
  p.x += f.vel.x * dt; p.z += f.vel.z * dt; pushOut(p, 0.3, p.y + 0.25, p.y + 0.8); p.y = groundAt(p.x, p.z, 0.2, p.y + 0.4);
  // твёрдая: персонажи не проходят сквозь неё — расталкиваемся
  for (const a of actors()) { if (a.hidden) continue; const ax = a.pos.x - p.x, az = a.pos.z - p.z, ad = Math.hypot(ax, az), R = 0.42 + (a.r || 0.35); if (ad < R && ad > 0.01 && Math.abs(a.pos.y - p.y) < 0.8) { const k = (R - ad) / ad; a.pos.x += ax * k * 0.7; a.pos.z += az * k * 0.7; p.x -= ax * k * 0.3; p.z -= az * k * 0.3; } }
  // сидит и просит: задние лапы подогнуты, голова вверх, хвост ходуном
  const sit = f.beg && d <= 1.3; f.body.rotation.x += ((sit ? -0.45 : 0) - f.body.rotation.x) * Math.min(1, dt * 8); f.body.position.y += ((sit ? -0.08 : 0) - f.body.position.y) * Math.min(1, dt * 8);
  f.head.rotation.x += ((sit ? 0.35 : 0) - f.head.rotation.x) * Math.min(1, dt * 8); if (sit) { f.g.rotation.y = Math.atan2(dx, dz); if (Math.random() < dt * 0.6) sfx('bark', { at: p, v: 0.5 }); }
  f.ears.forEach((e, i) => (e.rotation.x = Math.sin(t * 9 + i) * (Math.hypot(f.vel.x, f.vel.z) > 3 ? 0.5 : 0.08)));
  const v = Math.hypot(f.vel.x, f.vel.z); if (v > 0.3) f.g.rotation.y = Math.atan2(f.vel.x, f.vel.z);
  f.ph += dt * v * 6; const sw = Math.sin(f.ph) * 0.7; f.legs[0].rotation.x = sw; f.legs[3].rotation.x = sw; f.legs[1].rotation.x = -sw; f.legs[2].rotation.x = -sw; f.tail.rotation.z = Math.sin(t * (f.beg ? 26 : 14)) * (f.beg ? 0.8 : 0.5);
  if (f.it) { const fy = f.g.rotation.y; f.it.pos.set(p.x + Math.sin(fy) * 0.62, p.y + 0.55, p.z + Math.cos(fy) * 0.62); }
  // лает на тех, кто рядом; выпад — роняет добычу
  f.barkT -= dt; for (const a of actors()) { const dd = Math.hypot(a.pos.x - p.x, a.pos.z - p.z); if (dd < 4 && f.barkT <= 0) { f.barkT = 3 + Math.random() * 4; sfx('bark', { at: p }); }
    if (a.dive === 'air' && dd < 0.9 && f.it) { const it = f.it; f.it = null; it.state = 'rest'; it.pos.set(p.x, p.y + 0.4, p.z); f.runT = 0; } }
}

/* ---------- ворона-воришка (v0.18, умеренно) ----------
   Раз в ~минуту прилетает за маленьким блестящим предметом (банка, лампочка, жетон, свисток) и утаскивает на крышу.
   Сбить ворону с добычей (бросок/рогатка) — предмет падает. */
const SHINY = new Set(['can', 'bulb', 'badge', 'whistle', 'firework', 'energy']);
function crowModel() { const g = new THREE.Group(), b = col(0x17141c);
  const add = (geo, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; };
  add(G.sph10, b, 0, 0, 0, 0.16, 0.14, 0.28); add(G.sph10, b, 0, 0.1, 0.24, 0.11, 0.11, 0.11); add(G.cone4, col(0x3a3440), 0, 0.08, 0.38, 0.04, 0.12, 0.04).rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) add(G.box, col(0xf5c542), sx * 0.06, 0.13, 0.31, 0.025, 0.025, 0.01);
  add(G.box, b, 0, 0, -0.3, 0.12, 0.03, 0.18);
  const wings = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.12, 0.05, 0); g.add(p); const w = new THREE.Mesh(G.box, b); w.position.x = sx * 0.28; w.scale.set(0.56, 0.03, 0.26); p.add(w); return p; });
  g.userData.wings = wings; g.scale.setScalar(1.3); return g; }
function updThief(dt, t, P) {
  let c = TOWN.thief;
  if (!c) { TOWN.thiefT -= dt; if (TOWN.thiefT > 0 || !P) return; TOWN.thiefT = 50 + Math.random() * 30;
    const it = W.items.find(q => q.state === 'rest' && SHINY.has(q.type) && !q.steal && Math.hypot(q.pos.x - P.pos.x, q.pos.z - P.pos.z) < 22 && !actors().some(a => Math.hypot(a.pos.x - q.pos.x, a.pos.z - q.pos.z) < 3));
    if (!it) return; const a = Math.random() * 6.28, g = crowModel(); W.group.add(g);
    const roofs = W.missionZones.filter(z => z.type === 'roof'), r = roofs[(Math.random() * roofs.length) | 0];
    c = TOWN.thief = { g, it, st: 'in', p: new V3(it.pos.x + Math.cos(a) * 30, it.pos.y + 16, it.pos.z + Math.sin(a) * 30), to: r ? new V3((r.x0 + r.x1) / 2, r.y, (r.z0 + r.z1) / 2) : new V3(it.pos.x - Math.cos(a) * 30, it.pos.y + 16, it.pos.z - Math.sin(a) * 30), t: 0 };
    W.thief = c; sfx('crow', { at: it.pos }); }
  const g = c.g, w = g.userData.wings, flap = c.st === 'peck' ? 0 : Math.sin(t * 18) * 0.8; w[0].rotation.z = flap; w[1].rotation.z = -flap;
  const goTo = (q, sp) => { const d = new V3().subVectors(q, c.p), l = d.length(); if (l < sp * dt + 0.05) { c.p.copy(q); return true; } c.p.addScaledVector(d, sp * dt / l); g.rotation.y = Math.atan2(d.x, d.z); return false; };
  if (c.st === 'in') { if (c.it.state !== 'rest') { c.st = 'away'; c.it = null; } else if (goTo(new V3(c.it.pos.x, c.it.pos.y + 0.1, c.it.pos.z), 9)) { c.st = 'peck'; c.t = 0.6; } }
  else if (c.st === 'peck') { c.t -= dt; if (c.it.state !== 'rest') { c.st = 'away'; c.it = null; } else if (c.t <= 0) { c.it.state = 'held'; c.it.crow = true; c.st = 'carry'; sfx('crow', { at: c.p }); } }
  else if (c.st === 'carry') { const it = c.it; it.pos.set(c.p.x, c.p.y - 0.35, c.p.z); if (goTo(c.to, 6)) { it.state = 'rest'; it.crow = false; it.pos.set(c.p.x, c.to.y + it.def.r, c.p.z); c.it = null; c.st = 'away'; c.to = new V3(c.p.x + 30, c.p.y + 15, c.p.z + 20); } }
  else if (c.st === 'away') { if (goTo(c.to, 10) || c.p.y > 60) { W.group.remove(g); TOWN.thief = W.thief = null; return; } }
  g.position.copy(c.p);
  // сбили: брошенный предмет пролетел рядом — добыча падает
  if (c.st === 'carry') for (const q of W.items) if (q.state === 'fly' && q !== c.it && q.pos.distanceTo(c.p) < 0.9) { c.hit = true; break; }
  if (c.hit && c.it) { const it = c.it; it.crow = false; it.state = 'fly'; it.vel.set(0, -1, 0); it.owner = null; c.it = null; c.st = 'away'; c.to = new V3(c.p.x - 20, c.p.y + 20, c.p.z + 20); burst(c.p.x, c.p.y, c.p.z, 8, { color: 0x17141c, size: 0.12, speed: 2.5 }); sfx('crow', { at: c.p }); }
  c.hit = false;
}
/* ---------- происшествия ---------- */
const road = i => { const { grid, chunk, road: rw } = CONFIG, total = grid * chunk + (grid + 1) * rw, half = total / 2; return -half + rw / 2 + i * (chunk + rw); };
function nearestRoad(P) { const { grid } = CONFIG; let best = null, bd = 1e9; for (let i = 0; i <= grid; i++) { const c = road(i); for (const axis of ['x', 'z']) { const d = Math.abs((axis === 'x' ? P.pos.z : P.pos.x) - c); if (d < bd) { bd = d; best = { axis, c }; } } } return best; }
function toast(text) { const el = document.getElementById('toast'); if (!el) return; el.textContent = text; el.classList.remove('hidden', 'go'); void el.offsetWidth; el.classList.add('go'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 1800); }
const INC = {
  // огромная тыква катится по улице
  pumpkin(P) {
    const r = nearestRoad(P), s = Math.random() < 0.5 ? -1 : 1, R0 = 1.0;
    const pos = r.axis === 'x' ? new V3(P.pos.x - s * 26, R0 + 0.05, r.c) : new V3(r.c, R0 + 0.05, P.pos.z - s * 26), dir = r.axis === 'x' ? new V3(s, 0, 0) : new V3(0, 0, s);
    const g = new THREE.Group(); g.add(compose('giantPumpkin', a => { a(G.sph10, lam({ map: T.pumpkin(), emissive: 0x3a1a00 }, 'bouncyP'), 0, 0, 0, R0, R0 * 0.85, R0); a(G.cyl6, col(0x3f6b2a), 0, R0 * 0.9, 0, 0.12, 0.3, 0.12); }));
    g.position.copy(pos); W.group.add(g); toast('ТЫКВА КАТИТСЯ!'); sfx('roll', { at: pos });
    let life = 12, sndT = 0;
    return { update(dt) {
      life -= dt; const v = 7; pos.addScaledVector(dir, v * dt);
      const q = { x: pos.x, z: pos.z }; if (pushOut(q, R0 * 0.8, 0.4, 1.8)) { dir.multiplyScalar(-1); shake(0.15); sfx('hit', { at: pos }); } pos.x = q.x; pos.z = q.z;
      g.position.copy(pos); g.rotation[r.axis === 'x' ? 'z' : 'x'] += (r.axis === 'x' ? -1 : 1) * dir[r.axis] * v * dt / R0;
      sndT -= dt; if (sndT <= 0) { sndT = 0.35; sfx('roll', { at: pos }); }
      for (const a of actors()) if (Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z) < R0 + 0.45 && a.pos.y < pos.y + R0 && !(a.diveHitT > 0)) { knockDown(a, dir.x * 8, dir.z * 8, 1.0); a.diveHitT = 1; voice(a.ch, 'hurt', a === W.player ? undefined : a.pos); }
      hitBreakables({ x: pos.x, y: pos.y, z: pos.z }, R0, [dir.x * 8, 0, dir.z * 8], 3); impulsePushables(pos.x, pos.z, R0 + 0.3, 5); scareBirds(pos.x, pos.z, 5);
      if (life <= 0) { const m = lam({ map: T.pumpkin() }, 'pumpChunk'); for (let i = 0; i < 14; i++) chunk(pos.x, pos.y, pos.z, [(Math.random() - 0.5) * 7, 3 + Math.random() * 4, (Math.random() - 0.5) * 7], { mat: m, size: 0.3, life: 3 }); sfx('boom', { at: pos }); return 'end'; }
      return null; }, stop() { W.group.remove(g); } };
  },
  // мусоровоз едет по улице от края до края и сбивает всех на пути
  truck(P) {
    const r = nearestRoad(P), s = Math.random() < 0.5 ? -1 : 1, B = W.bounds - 2, lane = s * 1.4;
    const pos = r.axis === 'x' ? new V3(-s * B, 0, r.c + lane) : new V3(r.c - lane, 0, -s * B), dir = r.axis === 'x' ? new V3(s, 0, 0) : new V3(0, 0, s);
    const g = new THREE.Group(); g.rotation.y = Math.atan2(dir.x, dir.z);
    g.add(compose('garbageTruck', a => { const gr = col(0x3a7a4a), dk = col(0x17111f), wt = col(0xe8e4ec);
      a(G.box, wt, 0, 1.3, 2.3, 2.3, 1.7, 1.6); a(G.box, tmat(T.carGlass(0xe8e4ec)), 0, 1.75, 3.11, 2.0, 0.7, 0.02); a(G.box, tmat(T.corrugated(0x3a7a4a)), 0, 1.6, -0.8, 2.4, 2.4, 4.6); a(G.box, gr, 0, 0.55, 0, 2.3, 0.4, 7.2);
      a(G.box, tmat(T.sign('МУСОР', '#3a7a4a', '#f1e8ff')), 1.21, 1.7, -0.8, 0.01, 0.5, 2.2); a(G.box, tmat(T.sign('МУСОР', '#3a7a4a', '#f1e8ff')), -1.21, 1.7, -0.8, 0.01, 0.5, 2.2);
      a(G.box, tmat(T.hazard()), 0, 0.5, -3.65, 2.3, 0.3, 0.05); for (const sx of [-0.8, 0.8]) { a(G.box, glow(0xfff1c0), sx, 0.95, 3.12, 0.3, 0.18, 0.02); a(G.box, glow(0xff8a1f), sx, 2.25, 3.1, 0.2, 0.1, 0.05); }
      for (const z of [2.3, -1.2, -2.6]) for (const sx of [-1.15, 1.15]) a(G.cyl12, dk, sx, 0.45, z, 0.45, 0.3, 0.45, 0, 0, Math.PI / 2); }));
    g.position.copy(pos); W.group.add(g); toast('МУСОРОВОЗ!'); sfx('horn', { at: P.pos, v: 0.4 });
    let hornT = 0;
    return { update(dt) {
      const v = 8; pos.addScaledVector(dir, v * dt); g.position.copy(pos);
      hornT -= dt;
      for (const a of actors()) { const dx = a.pos.x - pos.x, dz = a.pos.z - pos.z, along = dx * dir.x + dz * dir.z, side = dx * dir.z - dz * dir.x;
        if (along > -3.8 && along < 6 && Math.abs(side) < 3 && hornT <= 0) { hornT = 1.5; sfx('horn', { at: pos }); }
        if (along > -3.7 && along < 3.3 && Math.abs(side) < 1.45 && a.pos.y < 2.6 && !(a.diveHitT > 0)) { const sd = side >= 0 ? 1 : -1; shove(a, dir.x * 6 + dir.z * sd * 6, dir.z * 6 - dir.x * sd * 6, 9, 5, true); a.diveHitT = 1; voice(a.ch, 'hurt', a === W.player ? undefined : a.pos); shake(a === W.player ? 0.3 : 0.05); } }
      impulsePushables(pos.x + dir.x * 2, pos.z + dir.z * 2, 2.2, 8); scareBirds(pos.x, pos.z, 7);
      if (Math.abs(pos[r.axis === 'x' ? 'x' : 'z']) > B + 1) return 'end';
      return null; }, stop() { W.group.remove(g); } };
  },
  // порыв ветра
  gust(P) { toast('ПОРЫВ ВЕТРА!'); sfx('wind'); const a = Math.random() * 6.28; const old = { ...WX.wind }; WX.wind.x = Math.cos(a); WX.wind.z = Math.sin(a); let life = 4;
    return { update(dt) { life -= dt; gust(dt, P, 1.8); return life <= 0 ? 'end' : null; }, stop() { WX.wind.x = old.x; WX.wind.z = old.z; } }; },
};
export function updateTown(dt, t, P, bigActive) {
  updFlowers(dt); updThief(dt, t, P);
  for (const f of TOWN.folks) { if (f.kind === 'granny') updGranny(f, dt, t); else updDog(f, dt, t); }
  if (!P) return;
  if (TOWN.inc) { if (TOWN.inc.update(dt) === 'end') { TOWN.inc.stop(); TOWN.inc = null; } return; }
  TOWN.incT -= dt;
  if (TOWN.incT <= 0 && !bigActive && globalThis.__forceInc) { TOWN.incT = 30 + Math.random() * 10; const keys = Object.keys(INC).filter(k => k !== TOWN.last), k = globalThis.__forceInc || keys[(Math.random() * keys.length) | 0]; TOWN.last = k; TOWN.inc = INC[k](P); }
}
void dropHeld; void puff; void smokeRing;
