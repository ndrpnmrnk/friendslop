import {animalGoal,animalMove} from './animal-roam.js';
import { tickNPCHit } from './impacts.js';
import { THREE, G, V3, col, lam, tmat, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { CONFIG } from '../config.js';
import { W } from '../world/state.js';
import { pushOut, groundAt, impulsePushables } from '../world/physics.js';
import { burst, puff, chunk, smokeRing, decal } from '../world/particles.js';
import { hitBreakables } from '../world/breakables.js';
import { scareBirds, featherTex } from '../world/birds.js';
import { actors, shove, knockDown, dropHeld, daze } from './actors.js';
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
  for (const f of TOWN.folks) { W.group.remove(f.g); f.coat?.dispose(); } TOWN.folks = []; W.npcs=TOWN.folks;
  if (TOWN.inc) TOWN.inc.stop(); TOWN.inc = null;
  if (TOWN.thief) { W.group.remove(TOWN.thief.g); } TOWN.thief = W.thief = null; TOWN.thiefT = 45 + Math.random() * 20; TOWN.incT = 28 + Math.random() * 10;
  // бабка — у клумбы с цветами (в одном-двух районах)
  const beds = W.flowerbeds.filter(b => b.x1 - b.x0 > 1.5).sort(() => Math.random() - 0.5).slice(0, 2);
  for (const bed of beds.slice(0,1)) TOWN.folks.push(granny(bed));
  buildFlowers();
  // собака — во дворе или парке (там, где живут коты)
  const homes = W.catHomes.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  for (const h of homes) TOWN.folks.push(createDog(h));
  W.dogs = TOWN.folks.filter(f => f.kind === 'dog');
  // скелеты-NPC: 1–2 на карту, в разных местах улицы
  { const sps = W.spawns.slice().sort(() => Math.random() - 0.5), n = 1 + (Math.random() < 0.6 ? 1 : 0);
    for (let i = 0; i < n && i < sps.length; i++) TOWN.folks.push(skelNpc(sps[i], i === 0 ? 'smoke' : 'beer')); }
  W.npcs=W.mayor?[...TOWN.folks,W.mayor]:TOWN.folks;
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
// PS1-силуэт (v0.21): сгорбленная бабка из гранёных кусков — цветастое платье, вязаная кофта, платок, очки, сумка-авоська
const FRUST = new THREE.CylinderGeometry(0.62, 1, 1, 6), FRUST2 = new THREE.CylinderGeometry(1, 0.8, 1, 6);
function granny(bed) {
  const g = new THREE.Group(), weapon = Math.random() < 0.5 ? 'can' : 'broom', pal = [[0x6a4aa8, 0x8a5a3a, 0xc83a5a], [0x2a6a8a, 0x6a6a4a, 0xd85a2a], [0x8a3a5a, 0x4a5a6a, 0x3a7a4a]][(Math.random() * 3) | 0];
  const dress = lam({ map: T.grannyDress(pal[0]) }, 'gDress' + pal[0]), knit = lam({ map: T.grannyKnit(pal[1]) }, 'gKnit' + pal[1]), scarf = lam({ map: T.grannyScarf(pal[2]) }, 'gScarf' + pal[2]);
  g.add(compose('granny3' + pal.join('_'), a => { const skin = col(0xe8c0a0), shoe = col(0x2b2533), stock = col(0x9a8070);
    a(FRUST, dress, 0, 0.42, 0, 0.4, 0.62, 0.36); a(FRUST2, knit, 0, 0.92, -0.04, 0.3, 0.42, 0.27, 0.22); a(G.box, knit, 0, 1.08, -0.14, 0.4, 0.16, 0.22, 0.4);
    for (const sx of [-1, 1]) { a(G.box, col(0xf1e8ff), sx * 0.05, 0.98, 0.2, 0.025, 0.025, 0.01, 0.22); a(G.cyl6, stock, sx * 0.12, 0.08, 0.02, 0.06, 0.16, 0.06); a(G.box, shoe, sx * 0.12, 0.03, 0.06, 0.1, 0.06, 0.2); }
    a(G.sphL, lam({ map: T.grannyFace() }, 'grannyFace'), 0, 1.3, 0.1, 0.19, 0.21, 0.18); a(G.box, skin, 0, 1.27, 0.28, 0.05, 0.07, 0.05);
    // платок: «капюшон» + узел под подбородком + хвостики
    a(G.sphL, scarf, 0, 1.39, -0.04, 0.215, 0.2, 0.2); a(G.box, scarf, 0, 1.14, 0.2, 0.08, 0.06, 0.06); a(G.box, scarf, 0.04, 1.06, 0.22, 0.05, 0.12, 0.02, 0.2);
    for (const sx of [-1, 1]) { a(G.box, col(0x2b2533), sx * 0.075, 1.33, 0.27, 0.08, 0.06, 0.012); a(G.box, col(0xbfe8ff), sx * 0.075, 1.33, 0.278, 0.06, 0.04, 0.005); a(G.box, col(0x17111f), sx * 0.075, 1.33, 0.282, 0.02, 0.02, 0.003); a(G.box, col(0xff9a9a), sx * 0.13, 1.24, 0.24, 0.04, 0.03, 0.02); }
    a(G.box, col(0x2b2533), 0, 1.335, 0.275, 0.04, 0.012, 0.01); a(G.box, col(0x8a4a4a), 0, 1.19, 0.26, 0.06, 0.015, 0.01);
    // авоська с батоном на боку
    a(G.box, col(0x3a7a4a), -0.34, 0.62, 0.02, 0.04, 0.3, 0.2); a(G.cyl6, col(0xd8a058), -0.36, 0.72, 0.02, 0.05, 0.3, 0.05, 0.4); }));
  // руки (рукав кофты + кисть): правая держит орудие
  const arms = [-1, 1].map(sx => { const q = new THREE.Group(); q.position.set(sx * 0.3, 1.05, 0); g.add(q); q.add(compose('grannyArm3' + pal[1], a => { a(G.cyl6, knit, 0, -0.16, 0, 0.075, 0.32, 0.075); a(G.box, col(0xe8c0a0), 0, -0.35, 0, 0.08, 0.08, 0.08); })); return q; });
  const tool = new THREE.Group(); tool.position.set(0, -0.36, 0.05); arms[1].add(tool);
  if (weapon === 'broom') tool.add(compose('broom2', a => { a(G.cyl5, tmat(T.wood()), 0, 0.1, 0, 0.025, 1.3, 0.025); a(G.cone6, tmat(T.hay()), 0, -0.65, 0, 0.16, 0.4, 0.16, Math.PI); a(G.box, col(0xd8243a), 0, -0.45, 0, 0.12, 0.04, 0.12); }));
  else tool.add(compose('wcan2', a => { const gr = lam({ map: T.metal(), color: 0x6ad88a }, 'wcanM'); a(G.cyl6, gr, 0, -0.12, 0.1, 0.12, 0.2, 0.12); a(G.cyl5, gr, 0, -0.06, 0.32, 0.025, 0.3, 0.025, 1.0); a(G.cyl6, col(0x2b6a3a), 0, 0.05, 0.47, 0.05, 0.04, 0.05, 1.0);
    a(G.torus, col(0x2b6a3a), 0, 0.02, 0.05, 0.09, 0.09, 0.09, 0, Math.PI / 2); }));
  const curse = new THREE.Sprite(new THREE.SpriteMaterial({ map: curseTex(), transparent: true, depthWrite: false })); curse.material.depthTest = false; curse.renderOrder = 12; curse.scale.set(1.3, 0.33, 1); curse.position.y = 2.25; curse.visible = false; g.add(curse);
  const cx = (bed.x0 + bed.x1) / 2, cz = (bed.z0 + bed.z1) / 2, home = new V3(cx, bed.y, bed.z1 + 1.0);
  setupBody(g, home.x, home.y, home.z);
  return { kind: 'granny', weapon, g, arms, tool, curse, bed, home, pos: g.position, vel: new V3(), target: null, angry: 0, rage: 0, cd: 0, swat: 0, wt: 0, wp: home.clone(), stun: 0, ph: 0, job: null, jobT: 6 + Math.random() * 6 };
}
function updGranny(f, dt, t) {
  const p = f.pos, bed = f.bed, A = f.arms;
  f.curse.visible = f.rage > 0; if (f.rage > 0) { f.curse.position.y = 2.25 + Math.abs(Math.sin(t * 10)) * 0.08; f.curse.material.rotation = Math.sin(t * 20) * 0.08; }
  if (f.gy === undefined) f.gy = p.y;
  if (f.stun > 0) { f.stun -= dt; f.g.rotation.z = Math.sin(t * 10) * 0.2; return; } f.g.rotation.z = 0;
  // кто топчет клумбу или носится рядом — тот враг
  if (!f.target) for (const a of actors()) { if (a.hidden) continue; const inBed = a.pos.x > bed.x0 - 0.2 && a.pos.x < bed.x1 + 0.2 && a.pos.z > bed.z0 - 0.2 && a.pos.z < bed.z1 + 0.2 && Math.abs(a.pos.y - bed.top) < 0.4;
    if (inBed) { f.target = a; f.angry = 6; f.rage = 1; f.job = null; sfx('curse', { at: p }); sfx('granny', { at: p }); break; } }
  // злится: стоит, трясёт орудием над головой
  if (f.rage > 0) { f.rage -= dt; const tg = f.target; if (tg) f.g.rotation.y = Math.atan2(tg.pos.x - p.x, tg.pos.z - p.z);
    // стоит на месте ~1 с: орудие поднято, другой рукой грозит (качает «пальцем»)
    A[1].rotation.x = -2.6 + Math.sin(t * 10) * 0.15; A[0].rotation.x = -1.7; A[0].rotation.z = Math.sin(t * 16) * 0.35; p.y = f.gy; f.vel.set(0, 0, 0); return; }
  A[0].rotation.z = 0;
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
  // прыжок через препятствие (v0.22): впереди что-то по колено-пояс — бабка подпрыгивает и перелезает, а не упирается
  const v0 = Math.hypot(f.vel.x, f.vel.z);
  if (!f.air && v0 > 0.8) { const ax = p.x + f.vel.x / v0 * 0.55, az = p.z + f.vel.z / v0 * 0.55, h = groundAt(ax, az, 0.2, f.gy + 1.1); if (h > f.gy + 0.4 && h < f.gy + 1.05) { f.air = true; f.jv = 6.6; f.ay = f.gy; } }
  p.x += f.vel.x * dt; p.z += f.vel.z * dt;
  if (f.air) { f.jv -= 20 * dt; f.ay += f.jv * dt; pushOut(p, 0.35, f.ay + 0.3, f.ay + 1.6); const gnd = groundAt(p.x, p.z, 0.2, f.ay + 0.3); if (f.jv < 0 && f.ay <= gnd) { f.air = false; f.gy = gnd; } }
  if (!f.air) { pushOut(p, 0.35, f.gy + 0.3, f.gy + 1.6); f.gy = groundAt(p.x, p.z, 0.2, f.gy + 0.45); }
  const v = Math.hypot(f.vel.x, f.vel.z); if (v > 0.3) f.g.rotation.y = Math.atan2(f.vel.x, f.vel.z);
  f.ph += dt * v * 5; p.y = f.air ? f.ay : f.gy + Math.abs(Math.sin(f.ph)) * 0.05;
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
    // удар бабки (v0.22): обычный стан на 2 с (звёздочки, замедление) + лёгкий толчок, без рэгдолла и подлёта
    daze(a, 2); a.push && a.push.set(dx / (d || 1) * 2.5, 0, dz / (d || 1) * 2.5);
    if (f.weapon === 'broom') { sfx('swat', { at: p }); burst(a.pos.x, a.pos.y + 1, a.pos.z, 6, { color: 0xd8b060, size: 0.12, speed: 2 }); }
    else { a.wetT = 5; sfx('splash', { at: a.pos }); for (let i = 0; i < 12; i++) puff(a.pos.x, a.pos.y + 1.6, a.pos.z, { color: 0x9ccbec, size: 0.1, grow: 0, vx: (Math.random() - 0.5) * 2, vy: -1, vz: (Math.random() - 0.5) * 2, g: 9, life: 0.5 }); }
    W.onFunny && W.onFunny(a, 'granny'); }
  // выпад в бабку — она шатается
  for (const a of actors()) if (a.dive === 'air' && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < 0.9) { f.stun = 1.2; f.target = a; f.angry = 7; sfx('granny', { at: p }); }
}

/* ---------- собака (v0.18) ----------
   Твёрдая (толкается), гоняет котов, выпрашивает вкусное (сидит, виляет хвостом), лает; приносит брошенное, бежит на свисток. */
const FOOD = new Set(['pizza', 'tomato', 'cucumber', 'can', 'pumpkin']);
// Собаки (v0.23): PS1-модели «одной сеткой» — гранёные призмы и усечённые пирамиды на фото-шерсти с прядями,
// без кубиков-примитивов; у скотч-терьера — бахрома на боках и борода (рваные края, альфа). Породы:
// скотч-терьер (белый/чёрный), такса, корги, дворняга-овчарка. Части тела те же (body/head/ears/legs/tail) — анимации общие.
// «лофт»: цельная гранёная сетка через кольца-сечения (как PS1-модели) — z — вдоль, [y, rx, ry] — центр и радиусы сечения
function loft(rings, n = 6) {
  const pos = [], uv = [], idx = [], R = rings.length;
  rings.forEach(([z, y, rx, ry, x = 0], i) => { for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2 + Math.PI / n; pos.push(x + Math.cos(a) * rx, y + Math.sin(a) * ry, z); uv.push(k / n, i / (R - 1)); } });
  for (let i = 0; i < R - 1; i++) for (let k = 0; k < n; k++) { const a = i * (n + 1) + k, b = a + n + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  for (const [i, flip] of [[0, true], [R - 1, false]]) { const [z, y, , , x = 0] = rings[i], c = pos.length / 3; pos.push(x, y, z); uv.push(0.5, i / (R - 1)); for (let k = 0; k < n; k++) { const a = i * (n + 1) + k; flip ? idx.push(c, a + 1, a) : idx.push(c, a, a + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const PYR = new THREE.ConeGeometry(1, 1, 4), DOGGEO = new Map();
const BREEDS = {
  // body: кольца корпуса от хвоста к груди [z, y, rx, ry]; head: от затылка к носу; leg: длина лапы
  scottie: { leg: 0.2, legR: 0.05, body: [[-0.3, 0.44, 0.08, 0.08], [-0.24, 0.43, 0.15, 0.15], [-0.05, 0.42, 0.17, 0.17], [0.15, 0.43, 0.18, 0.18], [0.27, 0.47, 0.15, 0.16], [0.33, 0.55, 0.1, 0.11]],
    head: [[-0.1, 0.0, 0.1, 0.11], [0.0, 0.0, 0.12, 0.12], [0.08, -0.02, 0.1, 0.1], [0.14, -0.04, 0.075, 0.075], [0.24, -0.05, 0.06, 0.055]], hy: 0.66, hz: 0.36,
    ear: 'point', earS: 0.13, tail: 'up', fringe: true, coats: [[0xe8e4dc, 0x9a9488, 0xffffff], [0x2a2630, 0x0e0c12, 0x6a6470]] },
  dachshund: { leg: 0.13, legR: 0.045, body: [[-0.4, 0.29, 0.06, 0.06], [-0.34, 0.28, 0.12, 0.12], [-0.1, 0.27, 0.13, 0.13], [0.2, 0.28, 0.14, 0.15], [0.33, 0.31, 0.12, 0.13], [0.4, 0.38, 0.08, 0.09]],
    head: [[-0.08, 0.0, 0.09, 0.1], [0.0, 0.0, 0.1, 0.1], [0.08, -0.02, 0.08, 0.075], [0.16, -0.035, 0.06, 0.055], [0.26, -0.045, 0.045, 0.04]], hy: 0.47, hz: 0.45,
    ear: 'flop', earS: 0.14, tail: 'down', coats: [[0x8a4a22, 0x4a2410, 0xc87a40], [0x2a2220, 0x120e0e, 0xa86a3a]] },
  corgi: { leg: 0.14, legR: 0.055, body: [[-0.3, 0.33, 0.1, 0.1], [-0.25, 0.32, 0.17, 0.16], [-0.02, 0.31, 0.18, 0.17], [0.18, 0.32, 0.19, 0.18], [0.28, 0.36, 0.15, 0.15], [0.33, 0.44, 0.1, 0.1]],
    head: [[-0.1, 0.0, 0.11, 0.11], [0.0, 0.0, 0.13, 0.12], [0.08, -0.03, 0.09, 0.08], [0.15, -0.045, 0.06, 0.055], [0.2, -0.05, 0.045, 0.04]], hy: 0.56, hz: 0.36,
    ear: 'big', earS: 0.17, tail: 'stub', bib: true, coats: [[0xd8822e, 0x8a4a18, 0xf1e8dc], [0xb86a2a, 0x6a3a14, 0xf1e8dc]] },
  shepherd: { leg: 0.34, legR: 0.055, body: [[-0.36, 0.6, 0.08, 0.08], [-0.3, 0.58, 0.14, 0.15], [-0.05, 0.57, 0.15, 0.17], [0.18, 0.6, 0.16, 0.2], [0.3, 0.66, 0.13, 0.16], [0.36, 0.76, 0.09, 0.1]],
    head: [[-0.1, 0.0, 0.1, 0.11], [0.0, 0.01, 0.12, 0.12], [0.08, -0.02, 0.09, 0.08], [0.17, -0.04, 0.06, 0.05], [0.26, -0.05, 0.045, 0.04]], hy: 0.88, hz: 0.4,
    ear: 'point', earS: 0.15, tail: 'bush', saddle: true, coats: [[0xb88848, 0x2a2018, 0xe0c090], [0x9a7a4a, 0x2a2018, 0xd8b888]] },
};
function dogGeo(bk) {
  if (DOGGEO.has(bk)) return DOGGEO.get(bk); const B = BREEDS[bk];
  const leg = loft([[0, 0, B.legR, B.legR * 1.1], [B.leg * 0.5, 0, B.legR * 0.85, B.legR * 0.95], [B.leg, 0.01, B.legR * 0.95, B.legR * 1.2]], 5); leg.rotateX(Math.PI / 2);
  const tl = B.tail === 'bush' ? loft([[0, 0, 0.04, 0.045], [0.14, -0.02, 0.06, 0.065], [0.3, -0.05, 0.02, 0.02]], 5) : B.tail === 'stub' ? loft([[0, 0, 0.04, 0.04], [0.05, 0, 0.03, 0.03]], 5) : loft([[0, 0, 0.035, 0.035], [0.24, 0, 0.012, 0.012]], 5);
  const r = { body: loft(B.body, 6), head: loft(B.head, 6), leg, tail: tl }; DOGGEO.set(bk, r); return r;
}
export function createDog(h, breed = null) {
  const bk = breed && BREEDS[breed] ? breed : Object.keys(BREEDS)[(Math.random() * 4) | 0], B = BREEDS[bk], [c0, c1, c2] = B.coats[(Math.random() * B.coats.length) | 0], key = bk + c0, GG = dogGeo(bk);
  const g = new THREE.Group(), M = (c, d, l, v) => lam({ map: T.dogCoat(c, d, l, v), flatShading: true }, 'dogC' + c + '_' + d + '_' + v);
  const fur = M(c0, c1, c2, 0), furV = M(c0, c1, c2, 1), dk = M(c1, c1, c0, 0), lt = M(c2, c0, c2, 0);
  const fr = B.fringe ? lam({ map: T.dogFringe(c0, c1, c2), alphaTest: 0.5, side: THREE.DoubleSide }, 'dogFr' + key) : null, nose = col(0x17111f);
  const top = B.body[3][1] + B.body[3][3];
  const body = new THREE.Group(); g.add(body);
  const coat = GG.body.toNonIndexed(), positions = coat.attributes.position;
  for (let i=0;i<positions.count;i+=3) { const y=(positions.getY(i)+positions.getY(i+1)+positions.getY(i+2))/3,z=(positions.getZ(i)+positions.getZ(i+1)+positions.getZ(i+2))/3;
    coat.addGroup(i,3,B.saddle && y>B.body[2][1] && z<0.2?1:B.bib && (y<B.body[2][1]||z>0.2)?2:0); }
  const torso=new THREE.Mesh(coat,[fur,dk,lt]);torso.castShadow=torso.receiveShadow=true;body.add(torso);
  body.add(compose('dogB6' + key, a => {
    if (fr) for (const sx of [-1, 1]) a(G.plane, fr, sx * 0.165, B.body[2][1] - 0.13, 0, 0.56, 0.22, 1, 0, sx * Math.PI / 2);
    { const [z4, y4, rx4, ry4] = B.body[4], [z5, y5, rx5, ry5] = B.body[5], zc = (z4 + z5) / 2, yc = (y4 + y5) / 2, rx = (rx4 + rx5) / 2 * 1.06, ry = (ry4 + ry5) / 2 * 1.06; // ошейник — кольцо на шее
      a(loft([[zc - 0.02, yc, rx, ry], [zc + 0.02, yc, rx, ry]], 6), col(0xd8243a), 0, 0, 0); a(G.cyl6, glow(0xf5c542), 0, yc - ry - 0.02, zc + 0.01, 0.03, 0.01, 0.03, Math.PI / 2); } }));
  const head = new THREE.Group(); head.position.set(0, B.hy, B.hz); body.add(head);
  head.add(compose('dogH5' + key, a => { const hz = B.head[B.head.length - 1][0], hy = B.head[B.head.length - 1][1];
    a(GG.head, fur, 0, 0, 0);
    a(G.box, nose, 0, hy + 0.01, hz + 0.005, 0.06, 0.045, 0.03);
    for (const sx of [-1, 1]) { a(G.box, nose, sx * 0.065, 0.045, 0.085, 0.035, 0.028, 0.02, 0, sx * 0.4); a(G.box, col(0xf1e8ff), sx * 0.068, 0.052, 0.094, 0.01, 0.01, 0.005); a(G.box, B.fringe ? lt : dk, sx * 0.06, 0.085, 0.08, 0.06, 0.018, 0.03, 0, 0, -sx * 0.3); }
    if (fr) a(G.plane, fr, 0, -0.1, hz - 0.06, 0.13, 0.14, 1); }));
  const ears = [-1, 1].map(sx => { const q = new THREE.Group(); q.position.set(sx * 0.07, 0.09, -0.03); head.add(q);
    q.add(compose('dogE5' + B.ear + key, a => { const e = B.earS;
      if (B.ear === 'flop') a(G.box, dk, sx * 0.03, -e * 0.45, 0, 0.025, e, e * 0.7); else { a(PYR, fur, 0, e * 0.5, 0, e * (B.ear === 'big' ? 0.5 : 0.36), e, e * 0.2); a(PYR, col(0xc87a7a), 0, e * 0.42, e * 0.05, e * 0.24, e * 0.65, e * 0.04); } }));
    q.rotation.z = sx * (B.ear === 'flop' ? 0.15 : -0.18); return q; });
  const legs = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => { const q = new THREE.Group(); q.position.set(sx * B.body[2][2] * 0.72, B.leg + 0.06, sz > 0 ? B.body[3][0] + 0.04 : B.body[1][0] + 0.04); body.add(q);
    q.add(compose('dogL5' + key, a => { a(GG.leg, furV, 0, 0, 0, 1, (B.leg + 0.025) / B.leg, 1); a(G.box, B.bib ? lt : furV, 0, -B.leg - 0.01, 0.035, B.legR * 1.9, 0.03, B.legR * 2.6); })); return q; });
  const tail = new THREE.Group(); tail.position.set(0, B.body[0][1] + 0.03, B.body[0][0] + 0.02); body.add(tail);
  tail.add(compose('dogT5' + key, a => { const t2 = a(GG.tail, furV, 0, 0, 0, 1, 1, 1, B.tail === 'up' ? -2.2 : B.tail === 'down' ? 2.5 : B.tail === 'bush' ? 2.3 : 3.14); void t2; }));
  void top;
  const x = (h.x0 + h.x1) / 2, z = (h.z0 + h.z1) / 2; setupBody(g, x, h.y, z);
  return { kind: 'dog', g, coat, body, head, ears, legs, tail, home: h, pos: g.position, vel: new V3(), it: null, runT: 0, wt: 0, wp: new V3(x, h.y, z), barkT: 3, ph: 0, chase: null, catT: 8 + Math.random() * 8, cat: null, beg: null, begCD: 0 };
}
// взять собаку на руки (ЛКМ вплотную, руки пустые): гавкает и вырывается ~2 с, из пасти всё выпадает
export function grabDog(P) {
  const f = (W.dogs || []).find(d => !d.heldBy && Math.hypot(d.pos.x - P.pos.x, d.pos.z - P.pos.z) < 1.3 && Math.abs(d.pos.y - P.pos.y) < 1); if (!f) return false;
  f.heldBy = P; f.holdT = 2; P.dogHeld = f; f.chase = null; f.cat = null; f.beg = null; sfx('bark', { at: f.pos });
  if (f.it) { const it = f.it; f.it = null; it.state = 'rest'; it.landT = 0; it.pos.set(f.pos.x, f.pos.y + it.def.r, f.pos.z); } return true;
}
function dogDrop(f) { const it = f.it; if (!it) return; f.it = null; it.state = 'rest'; it.landT = 0; it.pos.set(f.pos.x, f.pos.y + it.def.r, f.pos.z); }
function updDog(f, dt, t) {
  const p = f.pos, h = f.home;
  // на руках: держим перед собой, вырывается
  if (f.heldBy) { const P = f.heldBy, fy = P.root.rotation.y; f.holdT -= dt; p.set(P.pos.x + Math.sin(fy) * 0.6, P.pos.y + 0.55, P.pos.z + Math.cos(fy) * 0.6); f.g.rotation.y = fy + Math.sin(t * 14) * 0.5;
    f.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 22 + i) * 0.9)); f.tail.rotation.z = Math.sin(t * 30) * 0.8; if (Math.random() < dt * 2.5) sfx('bark', { at: p, v: 0.8 });
    if (f.holdT <= 0 || P.stun > 0 || P.drone) { f.heldBy = null; P.dogHeld = null; f.vel.set(Math.sin(fy) * 4, 0, Math.cos(fy) * 4); p.y = groundAt(p.x, p.z, 0.2, p.y + 0.5); f.runT = 2; f.wp.set(p.x + Math.sin(fy) * 6, p.y, p.z + Math.cos(fy) * 6); f.wt = 2; burst(p.x, p.y + 0.5, p.z, 6, { color: 0x9a6a3a, size: 0.12, speed: 2 }); }
    return; }
  // оглушена броском: лежит со звёздочками, добыча выпала
  if (f.stunT > 0) { f.stunT -= dt; f.body.rotation.z = Math.min(1.4, f.body.rotation.z + dt * 6); f.legs.forEach(l => (l.rotation.x = 0.6)); if (Math.random() < dt * 3) puff(p.x, p.y + 0.8, p.z, { color: 0xf5c542, size: 0.08, grow: 0, vy: 0.3, life: 0.5 }); return; }
  f.body.rotation.z *= 0.85;

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
  else { f.wt -= dt; if (f.wt <= 0) { f.wt = 2 + Math.random() * 4; const q=animalGoal(f,30);f.wp.set(q.x,q.y,q.z);f.wt=15+Math.random()*8;f.idleAct=['sniff','sit','look'][Math.random()*3|0]; } }
  const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz), stop = f.cat?1.1:f.beg?1.2:.4;
  const step=animalMove(f,goal,sp,dt,stop);if(step.blocked){f.wt=0;f.cat=null;f.chase=null;}

  // твёрдая: персонажи не проходят сквозь неё — расталкиваемся
  for (const a of actors()) { if (a.hidden) continue; const ax = a.pos.x - p.x, az = a.pos.z - p.z, ad = Math.hypot(ax, az), R = 0.42 + (a.r || 0.35); if (ad < R && ad > 0.01 && Math.abs(a.pos.y - p.y) < 0.8) { const k = (R - ad) / ad; a.pos.x += ax * k * 0.7; a.pos.z += az * k * 0.7; p.x -= ax * k * 0.3; p.z -= az * k * 0.3; } }
  // сидит и просит: задние лапы подогнуты, голова вверх, хвост ходуном
  const relaxed=!f.beg&&!f.cat&&!f.chase&&!f.it&&d<=.55,sit=f.beg&&d<=1.3||relaxed&&f.idleAct==='sit'; f.body.rotation.x += ((sit ? -0.45 : 0) - f.body.rotation.x) * Math.min(1, dt * 8); f.body.position.y += ((sit ? -0.08 : 0) - f.body.position.y) * Math.min(1, dt * 8);
  f.head.rotation.x += ((sit?.35:relaxed&&f.idleAct==='sniff'?-.42:0)-f.head.rotation.x) * Math.min(1, dt * 8); if (sit) { f.g.rotation.y = Math.atan2(dx, dz); if (Math.random() < dt * 0.6) sfx('bark', { at: p, v: 0.5 }); }
  f.ears.forEach((e, i) => (e.rotation.x = Math.sin(t * 9 + i) * (Math.hypot(f.vel.x, f.vel.z) > 3 ? 0.5 : 0.08)));
  const v = Math.hypot(f.vel.x, f.vel.z); if(v>.3){const wanted=Math.atan2(f.vel.x,f.vel.z),delta=Math.atan2(Math.sin(wanted-f.g.rotation.y),Math.cos(wanted-f.g.rotation.y));f.g.rotation.y+=delta*(1-Math.exp(-dt*10));}f.head.rotation.y+=(Math.sin(t*.85+f.ph)*(!f.it&&v<.3?.28:.05)-f.head.rotation.y)*(1-Math.exp(-dt*6));
  f.ph += dt * v * 6; const sw=Math.sin(f.ph)*.7*Math.min(1,v/.8); f.legs[0].rotation.x = sw; f.legs[3].rotation.x = sw; f.legs[1].rotation.x = -sw; f.legs[2].rotation.x = -sw; f.tail.rotation.z=Math.sin(t*(f.beg?16:7))*(f.beg?.7:v>3?.45:.22);f.body.position.y+=((sit?-.08:Math.sin(f.ph*2)*.018*Math.min(1,v/3))-f.body.position.y)*(1-Math.exp(-dt*12));
  if (f.it) { const fy = f.g.rotation.y; f.it.pos.set(p.x + Math.sin(fy) * 0.62, p.y + 0.55, p.z + Math.cos(fy) * 0.62); }
  // лает на тех, кто рядом; выпад — роняет добычу
  f.barkT -= dt; for (const a of actors()) { const dd = Math.hypot(a.pos.x - p.x, a.pos.z - p.z); if (dd < 4 && f.barkT <= 0) { f.barkT = 3 + Math.random() * 4; sfx('bark', { at: p }); }
    if (a.dive === 'air' && dd < 0.9 && f.it) { const it = f.it; f.it = null; it.state = 'rest'; it.pos.set(p.x, p.y + 0.4, p.z); f.runT = 0; } }
}

/* ---------- скелеты-NPC (v0.19) ----------
   1–2 скелета гуляют по городу: один курит, другой с пивом («ЛУННОЕ»), ворчат на тех, кто носится рядом.
   E рядом — «Попросить сигаретку» / «Выпить пивка»: стоите вдвоём ~10 с (убежать нельзя), потом бодрость 25 с. */
export function skelModel(kind) {
  const g = new THREE.Group(), bone = lam({ map: T.bone() }, 'npcBone2t'), dk = col(0x17111f);
  const body = new THREE.Group(); g.add(body);
  body.add(compose('npcSkel', a => {
    a(G.sph10, bone, 0, 1.62, 0, 0.17, 0.19, 0.18); a(G.box, bone, 0, 1.46, 0.05, 0.2, 0.08, 0.16);
    for (const sx of [-1, 1]) a(G.box, dk, sx * 0.065, 1.64, 0.15, 0.06, 0.07, 0.04); a(G.box, dk, 0, 1.56, 0.17, 0.03, 0.04, 0.02);
    for (let i = 0; i < 5; i++) a(G.box, dk, -0.06 + i * 0.03, 1.47, 0.135, 0.012, 0.04, 0.01);
    a(G.cyl6, bone, 0, 1.22, 0, 0.035, 0.42, 0.035);
    for (let i = 0; i < 4; i++) a(G.torus, bone, 0, 1.36 - i * 0.07, 0, 0.16 - i * 0.012, 0.16 - i * 0.012, 0.14, Math.PI / 2);
    a(G.box, bone, 0, 0.98, 0, 0.3, 0.1, 0.16); }));
  const limb = (x, y, len) => { const q = new THREE.Group(); q.position.set(x, y, 0); body.add(q); q.add(compose('npcLimb' + len, a => { a(G.box, lam({ map: T.bone() }, 'npcBone2t'), 0, -len / 2, 0, 0.05, len, 0.05); a(G.sph, lam({ map: T.bone() }, 'npcBone2t'), 0, -len, 0, 0.05, 0.05, 0.05); })); return q; };
  const arms = [limb(-0.2, 1.4, 0.55), limb(0.2, 1.4, 0.55)], legs = [limb(-0.09, 0.95, 0.9), limb(0.09, 0.95, 0.9)];
  const prop = new THREE.Group(); prop.position.set(0, -0.55, 0.05); arms[1].add(prop);
  if (kind === 'smoke') prop.add(compose('cig', a => { a(G.box, col(0xf1e8ff), 0, 0, 0.06, 0.02, 0.02, 0.14); a(G.box, col(0xd8a060), 0, 0, -0.02, 0.022, 0.022, 0.03); a(G.box, glow(0xff6a1a), 0, 0, 0.135, 0.022, 0.022, 0.012); }));
  else prop.add(compose('beerCan', a => { a(G.cyl8, lam({ map: T.sign('ЛУННОЕ', '#d8e0f0', '#2a4a8a') }, 'beerLbl'), 0, 0, 0.04, 0.045, 0.14, 0.045); a(G.cyl8, col(0x9a9da8), 0, 0.075, 0.04, 0.04, 0.012, 0.04); }));
  // пачка сигарет / вторая банка — протягивает игроку
  const offer = new THREE.Group(); offer.position.set(0, -0.58, 0.08); arms[1].add(offer); offer.visible = false;
  if (kind === 'smoke') offer.add(compose('cigPack', a => { a(G.box, lam({ map: T.sign('ТЫКВЕННЫЕ', '#f1e8ff', '#d8243a') }, 'packLbl'), 0, 0, 0, 0.07, 0.1, 0.035); a(G.box, col(0xd8243a), 0, 0.04, 0, 0.072, 0.025, 0.037); a(G.box, col(0xf1e8ff), 0.015, 0.065, 0, 0.012, 0.03, 0.012); }));
  else offer.add(compose('beerCan', a => { a(G.cyl8, lam({ map: T.sign('ЛУННОЕ', '#d8e0f0', '#2a4a8a') }, 'beerLbl'), 0, 0, 0.04, 0.045, 0.14, 0.045); a(G.cyl8, col(0x9a9da8), 0, 0.075, 0.04, 0.04, 0.012, 0.04); }));
  return { g, body, arms, legs, prop, offer };
}
// предмет в руке игрока на перекуре: сигарета или банка (создаётся один раз и висит на правой руке)
function handProp(P) {
  const h = P.ch.handR; if (h.userData.chill) return h.userData.chill;
  const cig = compose('cigP', a => { a(G.box, col(0xf1e8ff), 0, 0.02, 0.1, 0.022, 0.022, 0.15); a(G.box, col(0xd8a060), 0, 0.02, 0.02, 0.024, 0.024, 0.035); a(G.box, glow(0xff6a1a), 0, 0.02, 0.18, 0.024, 0.024, 0.014); });
  const can = compose('canP', a => { a(G.cyl8, lam({ map: T.sign('ЛУННОЕ', '#d8e0f0', '#2a4a8a') }, 'beerLbl'), 0, 0.03, 0.05, 0.05, 0.15, 0.05); a(G.cyl8, col(0x9a9da8), 0, 0.11, 0.05, 0.045, 0.012, 0.045); });
  cig.visible = can.visible = false; h.add(cig, can); return (h.userData.chill = { cig, can });
}
function skelNpc(sp, kind) {
  const m = skelModel(kind); setupBody(m.g, sp.x, sp.y, sp.z);
  const f = { kind: 'skel', act: kind, ...m, pos: m.g.position, vel: new V3(), home: new V3(sp.x, sp.y, sp.z), wp: new V3(sp.x, sp.y, sp.z), wt: 0, ph: 0, grumT: 0, busy: 0, gy: sp.y };
  W.interacts.push({ get x() { return f.pos.x; }, get z() { return f.pos.z; }, get y() { return f.gy; }, r: 1.4, label: kind === 'smoke' ? 'Попросить сигаретку' : 'Выпить пивка', enabled: P => !P.held && !P.holding && f.busy <= 0 && !f.npcImpact && !P.chill,
    act: P => { f.busy = 10; P.chill = { t: 10, npc: f }; P.vel.set(0, P.vel.y, 0); const dx = P.pos.x - f.pos.x, dz = P.pos.z - f.pos.z, d = Math.hypot(dx, dz) || 1;
      P.pos.x = f.pos.x + dx / d * 1.25; P.pos.z = f.pos.z + dz / d * 1.25; P.root.rotation.y = P.facing = Math.atan2(-dx, -dz); f.g.rotation.y = Math.atan2(dx, dz); sfx(kind === 'smoke' ? 'hiss' : 'can', { at: f.pos }); toast(kind === 'smoke' ? 'ПЕРЕКУР…' : 'ПО ПИВКУ…'); } });
  return f;
}
function updSkel(f, dt, t) {
  const p = f.pos, P = W.player;
  if (f.busy > 0) {
    /* перекур/пивко: 0–1.2 с скелет протягивает пачку (банку), игрок берёт; потом оба курят/пьют у лица, дым от обоих;
       в конце игрок щелчком выкидывает окурок (сминает и бросает банку) */
    f.busy -= dt; const el = 10 - f.busy, mine = P && P.chill && P.chill.npc === f, hp = mine ? handProp(P) : null, smoke = f.act === 'smoke';
    f.legs.forEach(l => (l.rotation.x = 0)); f.body.rotation.z = Math.sin(t * 0.8) * 0.03;
    if (el < 1.2) { f.arms[1].rotation.x = -1.35; f.offer.visible = true; if (smoke) f.prop.visible = false; if (hp && el > 0.8) (smoke ? hp.cig : hp.can).visible = true; }
    else { f.offer.visible = false; f.prop.visible = true; const up = Math.max(0, Math.sin(t * 1.1 + 1)); f.arms[1].rotation.x = -2.25 * up; }
    if(smoke&&el>=1.2){poseSkeletonSmoke(f,t);if(hp&&hp.cig.visible)poseSmoking(P,hp.cig,t);}
    // дым: у скелета — от сигареты, у игрока — от кончика сигареты и выдох изо рта
    const fy = f.g.rotation.y;if(smoke&&Math.random()<dt*3){const tip=f.prop.localToWorld(new V3(0,0,.14));puff(tip.x,tip.y,tip.z,{color:0xd8d0e4,size:.06,grow:.8,vy:.4,life:1.2,opacity:.45});}
    if (hp && smoke && hp.cig.visible) { const w = hp.cig.localToWorld(new V3(0,.02,.18)); if (Math.random() < dt * 6) puff(w.x, w.y, w.z, { color: 0xd8d0e4, size: 0.05, grow: 0.7, vy: 0.45, life: 1.2, opacity: 0.45 });
      if (Math.random() < dt * 0.9) { const r=P.root.rotation.y,m=P.ch.speechMouth.getWorldPosition(new V3());puff(m.x,m.y,m.z,{color:0xe8e0f0,size:.12,grow:1.4,vx:Math.sin(r)*.6,vy:.3,vz:Math.cos(r)*.6,life:1.6,opacity:.5}); } }
    // финал: окурок/банка летит в сторону и тлеет/гремит
    if (hp && f.busy < 0.45 && !f.flicked) { f.flicked = true; const it = smoke ? hp.cig : hp.can, w = it.getWorldPosition(new V3()), r = P.root.rotation.y + 0.8; it.visible = false;
      chunk(w.x, w.y, w.z, [Math.sin(r) * 3, 2.5, Math.cos(r) * 3], { mat: col(smoke ? 0xf1e8ff : 0x9a9da8), size: smoke ? 0.04 : 0.08, sy: smoke ? 0.4 : 0.6, life: 6 }); if (smoke) burst(w.x, w.y, w.z, 4, { color: 0xff8a1f, size: 0.04, speed: 2, up: 2 }); else sfx('can', { at: w }); }
    if (f.busy <= 0) { f.flicked = false; f.offer.visible = false; f.prop.visible = true; if (hp) hp.cig.visible = hp.can.visible = false; if (P && !P.chill) toast('БОДРОСТЬ +25 С'); }
    return; }
  // ворчит на тех, кто носится рядом или кинул в него
  if (f.grumT > 0) f.grumT -= dt;
  for (const a of actors()) { const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z); if (d < 3 && Math.hypot(a.vel.x, a.vel.z) > 7 && f.grumT <= 0) { f.grumT = 4; f.g.rotation.y = Math.atan2(a.pos.x - p.x, a.pos.z - p.z); sfx('curse', { at: p, v: 0.6 }); f.shake = 0.8; } }
  for (const it of W.items) if (it.state === 'fly' && it.pos.distanceTo(new V3(p.x, p.y + 1, p.z)) < 0.8 && f.grumT <= 1) { f.grumT = 4; f.shake = 1; sfx('bonk', { at: p }); sfx('curse', { at: p }); burst(p.x, p.y + 1.5, p.z, 6, { color: 0xe8e0d0, size: 0.1, speed: 2 }); }
  if (f.shake > 0) { f.shake -= dt; f.body.rotation.z = Math.sin(t * 30) * 0.08; f.arms[0].rotation.x = -1.6 + Math.sin(t * 20) * 0.3; f.vel.multiplyScalar(0.8); f.pos.y = f.gy; return; }
  f.body.rotation.z = 0;
  f.wt -= dt; if (f.wt <= 0) { f.wt = 3 + Math.random() * 5; const a = Math.random() * 6.28, r = Math.random() * 5; const x = f.home.x + Math.cos(a) * r, z = f.home.z + Math.sin(a) * r; f.wp.set(x, f.home.y, z); }
  const dx = f.wp.x - p.x, dz = f.wp.z - p.z, d = Math.hypot(dx, dz), sp = 1.1;
  if (d > 0.4) { f.vel.x += (dx / d * sp - f.vel.x) * Math.min(1, dt * 4); f.vel.z += (dz / d * sp - f.vel.z) * Math.min(1, dt * 4); } else f.vel.multiplyScalar(0.8);
  const beforeX=p.x,beforeZ=p.z;p.x += f.vel.x * dt; p.z += f.vel.z * dt; pushOut(p, 0.3, f.gy + 0.3, f.gy + 1.7); f.gy = groundAt(p.x, p.z, 0.2, f.gy + 0.45);
  const v = Math.hypot(f.vel.x, f.vel.z); if (v > 0.2) f.g.rotation.y = Math.atan2(f.vel.x, f.vel.z);
  f.ph += dt * v * 5; const sw = Math.sin(f.ph) * 0.5 * Math.min(1, v); f.legs[0].rotation.x = sw; f.legs[1].rotation.x = -sw; f.arms[0].rotation.x = -sw * 0.6;
  // курит/пьёт на ходу
  const up = Math.max(0, Math.sin(t * 0.9)); f.arms[1].rotation.x = -2.0 * up * up; p.y = f.gy + Math.abs(Math.sin(f.ph)) * 0.03;
  if(f.act==='smoke'){poseSkeletonSmoke(f,t);if(Math.random()<dt*2){const tip=f.prop.localToWorld(new V3(0,0,.14));puff(tip.x,tip.y,tip.z,{color:0xd8d0e4,size:.06,grow:.7,vy:.4,life:1.2,opacity:.45});}}
}
/* ---------- ворона-воришка (v0.18, умеренно) ----------
   Раз в ~минуту прилетает за маленьким блестящим предметом (банка, лампочка, жетон, свисток) и утаскивает на крышу.
   Сбить ворону с добычей (бросок/рогатка) — предмет падает. */
const SHINY = new Set(['can', 'bulb', 'badge', 'whistle', 'firework', 'energy']);
function crowModel() { const g = new THREE.Group(), b = new THREE.MeshLambertMaterial({ map: featherTex('crow') });
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
  for (const f of TOWN.folks) { if(tickNPCHit(f,dt,t))continue; if (f.kind === 'granny') updGranny(f, dt, t); else if (f.kind === 'skel') updSkel(f, dt, t); else updDog(f, dt, t); }
  if (!P) return;
  if (TOWN.inc) { if (TOWN.inc.update(dt) === 'end') { TOWN.inc.stop(); TOWN.inc = null; } return; }
  TOWN.incT -= dt;
  if (TOWN.incT <= 0 && !bigActive && globalThis.__forceInc) { TOWN.incT = 30 + Math.random() * 10; const keys = Object.keys(INC).filter(k => k !== TOWN.last), k = globalThis.__forceInc || keys[(Math.random() * keys.length) | 0]; TOWN.last = k; TOWN.inc = INC[k](P); }
}
void dropHeld; void puff; void smokeRing;
import {poseSmoking,poseSkeletonSmoke} from './smoking.js';
