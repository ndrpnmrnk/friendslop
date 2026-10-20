import { THREE, G, V3, col, lam, tmat, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { CONFIG } from '../config.js';
import { W } from '../world/state.js';
import { pushOut, groundAt, impulsePushables } from '../world/physics.js';
import { burst, puff, chunk, smokeRing } from '../world/particles.js';
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
  if (TOWN.inc) TOWN.inc.stop(); TOWN.inc = null; TOWN.incT = 28 + Math.random() * 10;
  // бабка — у клумбы с цветами (в одном-двух районах)
  const beds = W.flowerbeds.filter(b => b.x1 - b.x0 > 1.5).sort(() => Math.random() - 0.5).slice(0, 2);
  for (const bed of beds) TOWN.folks.push(granny(bed));
  // собака — во дворе или парке (там, где живут коты)
  const homes = W.catHomes.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  for (const h of homes) TOWN.folks.push(dog(h));
}
function setupBody(g, x, y, z) { g.position.set(x, y, z); W.group.add(g); W.keep.push(g); }

/* ---------- бабка ---------- */
function granny(bed) {
  const g = new THREE.Group();
  g.add(compose('granny', a => { const dress = lam({ map: T.awning('#6a4aa8', '#5a3a98') }, 'grannyDress'), skin = col(0xe8c0a0), hair = col(0xd8d8e0);
    a(G.cone8, dress, 0, 0.5, 0, 0.42, 1.0, 0.42); a(G.sph10, dress, 0, 1.0, 0, 0.3, 0.28, 0.26); a(G.box, col(0xf1e8ff), 0, 0.95, 0.24, 0.3, 0.3, 0.02);
    a(G.sph10, skin, 0, 1.38, 0.02, 0.22, 0.24, 0.21); a(G.sph10, hair, 0, 1.52, -0.08, 0.2, 0.14, 0.18); a(G.sph, hair, 0, 1.62, -0.14, 0.1, 0.1, 0.1);
    for (const sx of [-1, 1]) { a(G.torus, col(0x2b2533), sx * 0.08, 1.4, 0.2, 0.06, 0.06, 0.06); a(G.box, col(0x17111f), sx * 0.08, 1.4, 0.21, 0.025, 0.025, 0.01); }
    a(G.torus, col(0xd8243a), 0, 1.18, 0, 0.2, 0.2, 0.25, Math.PI / 2); a(G.box, col(0x17111f), 0, 1.3, 0.21, 0.08, 0.02, 0.01);
    for (const sx of [-1, 1]) a(G.box, col(0x2b2533), sx * 0.13, 0.05, 0.05, 0.12, 0.08, 0.2); }));
  const broom = new THREE.Group(); broom.position.set(0.3, 1.0, 0.15); g.add(broom);
  broom.add(compose('broom', a => { a(G.cyl6, tmat(T.wood()), 0, 0.1, 0, 0.025, 1.3, 0.025); a(G.cone6, tmat(T.hay()), 0, -0.65, 0, 0.16, 0.4, 0.16, Math.PI); a(G.box, col(0xd8243a), 0, -0.45, 0, 0.12, 0.04, 0.12); }));
  const cx = (bed.x0 + bed.x1) / 2, cz = (bed.z0 + bed.z1) / 2, home = new V3(cx, bed.y, bed.z1 + 1.0);
  setupBody(g, home.x, home.y, home.z);
  return { kind: 'granny', g, broom, bed, home, pos: g.position, vel: new V3(), target: null, angry: 0, cd: 0, swat: 0, wt: 0, wp: home.clone(), stun: 0, ph: 0 };
}
function updGranny(f, dt, t) {
  const p = f.pos, bed = f.bed;
  if (f.stun > 0) { f.stun -= dt; f.g.rotation.z = Math.sin(t * 10) * 0.2; return; } f.g.rotation.z = 0;
  // кто топчет клумбу или носится рядом — тот враг
  if (!f.target) for (const a of actors()) { if (a.hidden) continue; const inBed = a.pos.x > bed.x0 - 0.2 && a.pos.x < bed.x1 + 0.2 && a.pos.z > bed.z0 - 0.2 && a.pos.z < bed.z1 + 0.2 && Math.abs(a.pos.y - bed.top) < 0.4;
    const fast = Math.hypot(a.vel.x, a.vel.z) > 9 && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < 3;
    if (inBed || fast) { f.target = a; f.angry = 6; sfx('granny', { at: p }); break; } }
  let goal = f.wp, sp = 1.4;
  if (f.target) { f.angry -= dt; goal = f.target.pos; sp = 5.6; if (f.angry <= 0 || f.target.hidden || Math.hypot(goal.x - f.home.x, goal.z - f.home.z) > 14) { f.target = null; } }
  else { f.wt -= dt; if (f.wt <= 0) { f.wt = 3 + Math.random() * 4; const a = Math.random() * 6.28; f.wp.set(f.home.x + Math.cos(a) * 1.5, f.home.y, f.home.z + Math.sin(a) * 1.0); } }
  const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz);
  if (d > 0.9) { f.vel.x += (dx / d * sp - f.vel.x) * Math.min(1, dt * 5); f.vel.z += (dz / d * sp - f.vel.z) * Math.min(1, dt * 5); } else { f.vel.multiplyScalar(0.8); }
  p.x += f.vel.x * dt; p.z += f.vel.z * dt; pushOut(p, 0.35, p.y + 0.3, p.y + 1.6); p.y = groundAt(p.x, p.z, 0.2, p.y + 0.45);
  const v = Math.hypot(f.vel.x, f.vel.z); if (v > 0.3) f.g.rotation.y = Math.atan2(f.vel.x, f.vel.z);
  f.ph += dt * v * 5; f.g.position.y = p.y + Math.abs(Math.sin(f.ph)) * 0.05;
  // удар метлой
  f.cd -= dt; if (f.swat > 0) { f.swat -= dt; f.broom.rotation.x = -Math.sin((0.4 - f.swat) / 0.4 * Math.PI) * 1.6; } else f.broom.rotation.x = Math.sin(t * 2) * 0.1;
  if (f.target && d < 1.3 && f.cd <= 0) { f.cd = 1.2; f.swat = 0.4; const a = f.target; shove(a, dx, dz, 6, 3.5, true); voice(a.ch, 'hurt', a === W.player ? undefined : a.pos); sfx('swat', { at: p }); sfx('granny', { at: p, v: 0.8 }); burst(a.pos.x, a.pos.y + 1, a.pos.z, 6, { color: 0xd8b060, size: 0.12, speed: 2 }); W.onFunny && W.onFunny(a, 'granny'); }
  // выпад в бабку — она шатается
  for (const a of actors()) if (a.dive === 'air' && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < 0.9) { f.stun = 1.2; f.target = a; f.angry = 7; sfx('granny', { at: p }); }
}

/* ---------- собака ---------- */
function dog(h) {
  const g = new THREE.Group();
  g.add(compose('dog', a => { const fur = lam({ color: 0x9a6a3a }, 'dogFur'), dk = col(0x5a3a1e);
    a(G.sph10, fur, 0, 0.42, 0, 0.2, 0.18, 0.4); a(G.sph10, fur, 0, 0.6, 0.38, 0.17, 0.16, 0.18); a(G.box, fur, 0, 0.55, 0.56, 0.12, 0.09, 0.14); a(G.sph, col(0x17111f), 0, 0.58, 0.64, 0.04, 0.035, 0.03);
    for (const sx of [-1, 1]) { a(G.box, dk, sx * 0.13, 0.66, 0.34, 0.05, 0.16, 0.08, 0.2, 0, sx * 0.4); a(G.box, col(0x17111f), sx * 0.07, 0.66, 0.53, 0.03, 0.03, 0.01); }
    a(G.torus, col(0xd8243a), 0, 0.5, 0.26, 0.12, 0.12, 0.12, Math.PI / 2 - 0.4); }));
  const legs = [[0.1, 0.25], [-0.1, 0.25], [0.1, -0.25], [-0.1, -0.25]].map(([x, z]) => { const q = new THREE.Group(); q.position.set(x, 0.34, z); g.add(q); q.add(compose('dogLeg', a => a(G.box, lam({ color: 0x9a6a3a }, 'dogFur'), 0, -0.16, 0, 0.07, 0.32, 0.07))); return q; });
  const tail = new THREE.Group(); tail.position.set(0, 0.5, -0.38); g.add(tail); tail.add(compose('dogTail', a => a(G.box, lam({ color: 0x9a6a3a }, 'dogFur'), 0, 0.1, -0.05, 0.05, 0.25, 0.05, -0.6)));
  const x = (h.x0 + h.x1) / 2, z = (h.z0 + h.z1) / 2; setupBody(g, x, h.y, z);
  return { kind: 'dog', g, legs, tail, home: h, pos: g.position, vel: new V3(), it: null, runT: 0, wt: 0, wp: new V3(x, h.y, z), barkT: 3, ph: 0, chase: null };
}
function updDog(f, dt, t) {
  const p = f.pos, h = f.home;
  // заметил брошенный предмет — бежит за ним
  if (!f.it && !f.chase) for (const it of W.items) { if (it.state === 'rest' && it.landT > 0 && it.def.mass < 2 && Math.hypot(it.pos.x - p.x, it.pos.z - p.z) < 13 && Math.abs(it.pos.y - p.y) < 1) { f.chase = it; sfx('bark', { at: p }); break; } }
  for (const it of W.items) if (it.landT > 0) it.landT -= dt / Math.max(1, TOWN.folks.length);
  let goal = f.wp, sp = 2;
  if (f.chase) { if (f.chase.state !== 'rest') f.chase = null; else { goal = f.chase.pos; sp = 7.5; if (Math.hypot(goal.x - p.x, goal.z - p.z) < 0.6) { f.it = f.chase; f.chase = null; f.it.state = 'held'; f.runT = 5; const a = Math.random() * 6.28; f.wp.set(p.x + Math.cos(a) * 9, p.y, p.z + Math.sin(a) * 9); } } }
  else if (f.it) { goal = f.wp; sp = 6.5; f.runT -= dt; if (f.runT <= 0 || Math.hypot(goal.x - p.x, goal.z - p.z) < 0.8) { const it = f.it; f.it = null; it.state = 'rest'; it.landT = 0; it.pos.set(p.x, p.y + it.def.r, p.z); sfx('bark', { at: p, v: 0.6 }); } }
  else { f.wt -= dt; if (f.wt <= 0) { f.wt = 2 + Math.random() * 4; f.wp.set(h.x0 + Math.random() * (h.x1 - h.x0), h.y, h.z0 + Math.random() * (h.z1 - h.z0)); } }
  const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz);
  if (d > 0.4) { f.vel.x += (dx / d * sp - f.vel.x) * Math.min(1, dt * 6); f.vel.z += (dz / d * sp - f.vel.z) * Math.min(1, dt * 6); } else f.vel.multiplyScalar(0.8);
  p.x += f.vel.x * dt; p.z += f.vel.z * dt; pushOut(p, 0.3, p.y + 0.25, p.y + 0.8); p.y = groundAt(p.x, p.z, 0.2, p.y + 0.4);
  const v = Math.hypot(f.vel.x, f.vel.z); if (v > 0.3) f.g.rotation.y = Math.atan2(f.vel.x, f.vel.z);
  f.ph += dt * v * 6; const sw = Math.sin(f.ph) * 0.7; f.legs[0].rotation.x = sw; f.legs[3].rotation.x = sw; f.legs[1].rotation.x = -sw; f.legs[2].rotation.x = -sw; f.tail.rotation.z = Math.sin(t * 14) * 0.5;
  if (f.it) { const fy = f.g.rotation.y; f.it.pos.set(p.x + Math.sin(fy) * 0.62, p.y + 0.55, p.z + Math.cos(fy) * 0.62); }
  // лает на тех, кто рядом; выпад — роняет добычу
  f.barkT -= dt; for (const a of actors()) { const dd = Math.hypot(a.pos.x - p.x, a.pos.z - p.z); if (dd < 4 && f.barkT <= 0) { f.barkT = 3 + Math.random() * 4; sfx('bark', { at: p }); }
    if (a.dive === 'air' && dd < 0.9 && f.it) { const it = f.it; f.it = null; it.state = 'rest'; it.pos.set(p.x, p.y + 0.4, p.z); f.runT = 0; } }
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
  for (const f of TOWN.folks) { if (f.kind === 'granny') updGranny(f, dt, t); else updDog(f, dt, t); }
  if (!P) return;
  if (TOWN.inc) { if (TOWN.inc.update(dt) === 'end') { TOWN.inc.stop(); TOWN.inc = null; } return; }
  TOWN.incT -= dt;
  if (TOWN.incT <= 0 && !bigActive && globalThis.__forceInc) { TOWN.incT = 30 + Math.random() * 10; const keys = Object.keys(INC).filter(k => k !== TOWN.last), k = globalThis.__forceInc || keys[(Math.random() * keys.length) | 0]; TOWN.last = k; TOWN.inc = INC[k](P); }
}
void dropHeld; void puff; void smokeRing;
