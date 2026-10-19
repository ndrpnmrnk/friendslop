import { THREE, G, V3, col, lam, glow, mesh, alphaMat, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { groundAt, solidHit, addZone, zoneAt, impulsePushables } from '../world/physics.js';
import { burst, puff, smokeRing, decal, splash } from '../world/particles.js';
import { scareBirds } from '../world/birds.js';
import { hitBreakables } from '../world/breakables.js';
import { worldHit, shake, hitFreeze } from './worldfx.js';
import { sfx } from '../core/sfx.js';

/* Гаджеты из ящиков: один карман (F), отдельно от предмета в руках.
   Логика не зависит от рендера и ввода — потом её можно перенести на сервер. */
export const GADGETS = {
  energy:  { name: 'Энергетик', n: 1, color: 0x9be36b },
  water:   { name: 'Водяной пистолет', n: 10, color: 0x4ab0f0 },
  firework:{ name: 'Фейерверк', n: 1, color: 0xff5a6e },
  popper:  { name: 'Хлопушка', n: 1, color: 0xf5c542 },
  sling:   { name: 'Рогатка', n: 8, color: 0xff8a1f },
  web:     { name: 'Паутина', n: 1, color: 0xd8d0e4 },
  boots:   { name: 'Пружинные ботинки', n: 3, color: 0xb18cff },
  mask:    { name: 'Маска-призрак', n: 1, color: 0xeee8ff },
};
export const GS = { active: [], pickups: [], shots: [], traps: [], clouds: [] };
const actors = P => [P, ...(W.bots || [])].filter(Boolean);

// модель «коробочки» гаджета над землёй (крутится, светится цветом гаджета)
function pickupModel(kind) {
  const g = new THREE.Group(), c = GADGETS[kind].color;
  mesh(G.box, lam({ color: c, emissive: c, emissiveIntensity: 0.5 }, 'gp' + c), 0, 0, 0, 0.36, 0.36, 0.36, g);
  mesh(G.box, col(0x2a1f3d), 0, 0, 0, 0.38, 0.08, 0.38, g); mesh(G.box, col(0x2a1f3d), 0, 0, 0, 0.08, 0.38, 0.38, g);
  return g;
}
export function resetGadgets() {
  for (const p of GS.pickups) W.group.remove(p.g);
  GS.pickups = []; GS.shots = []; GS.traps = []; GS.clouds = [];
  // в раунде 5–6 случайных гаджетов из 8 — каждый раунд немного другой
  const all = Object.keys(GADGETS).sort(() => Math.random() - 0.5); GS.active = all.slice(0, 5 + (Math.random() < 0.5 ? 1 : 0));
  W.crateHook = (pos, piece) => { if (Math.random() < (piece.golden ? 1 : 0.3)) spawnPickup(pos.x, pos.y, pos.z); };
  // золотые ящики: на крышах и в нычках
  const spots = W.missionZones.filter(z => z.type === 'roof' || z.type === 'nook').sort(() => Math.random() - 0.5);
  let n = 0; for (const z of spots) { if (n >= 2) break; goldenCrate((z.x0 + z.x1) / 2, z.y, (z.z0 + z.z1) / 2); n++; }
}
function goldenCrate(x, y, z) {
  const g = compose('goldCrate', a => { const gm = lam({ color: 0xf5c542, emissive: 0x6a4a00, emissiveIntensity: 0.6 }, 'goldCrate'), dk = col(0x6a4a1a);
    a(G.box, gm, 0, 0.35, 0, 0.7, 0.7, 0.7); for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(G.box, dk, sx * 0.33, 0.35, sz * 0.33, 0.06, 0.72, 0.06); a(G.box, dk, 0, 0.69, 0, 0.72, 0.04, 0.12); });
  g.position.set(x, y, z); W.group.add(g); W.keep.push(g);
  GS.pickups.push({ golden: true, g, x, y, z, t: 0, respawn: 0 });
}
export function spawnPickup(x, y, z) {
  if (!GS.active.length) return;
  const kind = GS.active[(Math.random() * GS.active.length) | 0], g = pickupModel(kind);
  const gy = groundAt(x, z, 0.2, y + 0.5); g.position.set(x, gy + 0.55, z); W.group.add(g); W.keep.push(g);
  burst(x, gy + 0.6, z, 8, { color: GADGETS[kind].color, size: 0.18, speed: 2, up: 2 });
  GS.pickups.push({ kind, g, x, y: gy, z, t: 0, life: 25 });
}

// ---------- применение ----------
export function useGadget(P, aim) {
  const gd = P.gadget; if (!gd || P.stun > 0) return false;
  const k = gd.kind, from = new V3(P.pos.x, P.pos.y + 1.2, P.pos.z), dir = aim.clone().sub(from).normalize();
  if (k === 'energy') { P.energy = 6; burst(P.pos.x, P.pos.y + 1, P.pos.z, 10, { color: 0x9be36b, size: 0.2, speed: 2 }); }
  else if (k === 'water') { for (let i = 0; i < 5; i++) shoot('water', from, dir, 22 + i, i * 0.03, P); }
  else if (k === 'sling') shoot('candy', from, dir, 42, 0, P);
  else if (k === 'firework') lob('firework', from, aim, P);
  else if (k === 'popper') lob('popper', from, aim, P);
  else if (k === 'web') lob('web', from, aim, P);
  else if (k === 'boots') { if (!P.onGround) return false; P.vel.y = 14.5; P.onGround = false; P.airPeak = P.pos.y + 6; smokeRing(P.pos.x, P.pos.y + 0.1, P.pos.z, 10, { speed: 3, color: 0xb18cff }); shake(0.15); }
  else if (k === 'mask') { P.ghost = 6; burst(P.pos.x, P.pos.y + 1, P.pos.z, 12, { color: 0xeee8ff, size: 0.3, speed: 1.5 }); }
  gd.n--; if (gd.n <= 0) P.gadget = null;
  return true;
}
const SHOT_GEO = new THREE.SphereGeometry(1, 5, 4);
function shotMesh(kind) { const c = { water: 0x7ac8f0, candy: 0xff5a9e, firework: 0xd8243a, popper: 0xf5c542, web: 0xe8e0f0 }[kind]; return mesh(SHOT_GEO, lam({ color: c, emissive: c, emissiveIntensity: 0.4 }, 'shot' + c), 0, 0, 0, 1, 1, 1, W.group); }
function shoot(kind, from, dir, speed, delay, owner) {
  const m = shotMesh(kind); m.scale.setScalar(kind === 'water' ? 0.09 : 0.08); m.visible = false;
  GS.shots.push({ kind, m, p: from.clone().addScaledVector(dir, 0.6), v: dir.clone().multiplyScalar(speed).add(new V3(0, kind === 'water' ? 1.5 : 0.6, 0)), g: kind === 'water' ? 14 : 4, life: 1.6, delay, owner });
}
function lob(kind, from, aim, owner) {
  const d = new V3(aim.x - from.x, 0, aim.z - from.z), dist = Math.min(16, d.length()); d.normalize();
  const t = 0.35 + dist / 18, vx = d.x * dist / t, vz = d.z * dist / t, vy = (aim.y - from.y + 0.5 * 22 * t * t) / t;
  const m = shotMesh(kind); m.scale.setScalar(kind === 'firework' ? 0.16 : 0.14);
  GS.shots.push({ kind, m, p: from.clone(), v: new V3(vx, vy, vz), g: 22, life: 4, delay: 0, owner, fuse: kind === 'firework' ? 1.5 : 0, rest: false });
}

function hitActorsAt(p, r, fn, owner) { for (const a of actors(W.player)) { if (a === owner) continue; const q = a.pos; if (Math.hypot(q.x - p.x, q.z - p.z) < r && p.y > q.y - 0.3 && p.y < q.y + a.h + 0.3) fn(a); } }
function explode(p, owner) {
  const cols = [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff];
  for (const c of cols) burst(p.x, p.y + 0.5, p.z, 7, { color: c, size: 0.2, speed: 6, up: 5, g: 6, life: 1.1, grow: 0.2 });
  smokeRing(p.x, p.y + 0.1, p.z, 12, { speed: 4, size: 0.3, grow: 1, life: 0.9 });
  for (const a of actors(W.player)) { const dx = a.pos.x - p.x, dz = a.pos.z - p.z, d = Math.hypot(dx, dz); if (d < 3 && Math.abs(a.pos.y - p.y) < 2.5) { a.vel.set(dx / (d || 1) * 7, 7, dz / (d || 1) * 7); a.onGround = false; a.stun = Math.max(a.stun, 1.3); hitFreeze(0.07); } }
  hitBreakables({ x: p.x, y: p.y + 0.8, z: p.z }, 2.5, [0, 8, 0], 1, ['glass', 'bottle', 'bulb', 'pot']);
  for (const c of W.cats) { const q = c.root.position; if (Math.hypot(q.x - p.x, q.z - p.z) < 6) c.hit && c.hit(false, q.x - p.x, q.z - p.z); }
  sfx('boom', { at: p }); scareBirds(p.x, p.z, 20); impulsePushables(p.x, p.z, 3, 6); worldHit(p, 5, new V3()); shake(0.45);
}

export function updateGadgets(dt, t, P) {
  W.player = P;
  // эффекты на игроке
  if (P) {
    if (P.energy > 0) { P.energy -= dt; P.stamina = 1; if (P.energy <= 0) P.tired = 3; }
    else if (P.tired > 0) P.tired -= dt;
    if (P.ghost > 0) P.ghost -= dt;
    if (P.blind > 0) P.blind -= dt;
  }
  // коробочки: крутятся, подбираются касанием
  for (let i = GS.pickups.length - 1; i >= 0; i--) {
    const q = GS.pickups[i];
    if (q.golden) {
      if (q.respawn > 0) { q.respawn -= dt; if (q.respawn <= 0) { q.g.visible = true; } continue; }
      if (P && Math.hypot(P.pos.x - q.x, P.pos.z - q.z) < 0.9 && Math.abs(P.pos.y - q.y) < 1.2) { q.g.visible = false; q.respawn = 40; burst(q.x, q.y + 0.5, q.z, 14, { color: 0xf5c542, size: 0.2, speed: 3, up: 3 }); spawnPickup(q.x, q.y + 0.2, q.z); }
      continue;
    }
    q.t += dt; q.life -= dt; q.g.rotation.y += dt * 2; q.g.position.y = q.y + 0.55 + Math.sin(q.t * 3) * 0.08;
    if (q.life < 3) q.g.visible = Math.sin(q.t * 20) > 0;
    let taker = null;
    for (const a of actors(P)) if (Math.hypot(a.pos.x - q.x, a.pos.z - q.z) < 0.8 && Math.abs(a.pos.y - q.y) < 1.2) { taker = a; break; }
    if (taker || q.life <= 0) {
      if (taker) { taker.gadget = { kind: q.kind, n: GADGETS[q.kind].n }; burst(q.x, q.y + 0.6, q.z, 10, { color: GADGETS[q.kind].color, size: 0.16, speed: 2.5, up: 2 }); if (taker === P) sfx('pickup'); }
      W.group.remove(q.g); GS.pickups.splice(i, 1);
    }
  }
  // выстрелы и брошенное
  for (let i = GS.shots.length - 1; i >= 0; i--) {
    const s = GS.shots[i];
    if (s.delay > 0) { s.delay -= dt; continue; }
    s.m.visible = true; s.life -= dt;
    if (!s.rest) {
      s.v.y -= s.g * dt; s.p.addScaledVector(s.v, dt); s.m.position.copy(s.p);
      if (s.kind === 'firework' && Math.random() < dt * 30) puff(s.p.x, s.p.y, s.p.z, { size: 0.12, grow: -0.5, life: 0.25, vy: 0, color: 0xffd25c });
      const gy = groundAt(s.p.x, s.p.z, 0.05, s.p.y + 0.1), wall = solidHit(s.p, 0.06);
      let hitA = null; hitActorsAt(s.p, 0.6, a => (hitA = a), s.owner);
      if (s.p.y <= gy || wall || hitA) {
        const pt = s.p.clone(); if (s.p.y <= gy) pt.y = gy;
        if (s.kind === 'water') { burst(pt.x, pt.y, pt.z, 3, { color: 0x9ccbec, size: 0.12, speed: 1.5 }); if (hitA) { hitA.push && hitA.push.set(s.v.x * 0.06, 0, s.v.z * 0.06); hitA.wetT = 4; hitA.slipT = 2; } hitBreakables(pt, 0.2, [s.v.x, s.v.y, s.v.z], 0.15, ['bulb']); worldHit(pt, 0.5, s.v); for (const h of W.hitHooks.slice()) h({ type: 'water', vel: s.v, def: { mass: 0.6, r: 0.1, heavy: false }, pos: pt }, pt); if (!hitA && Math.random() < 0.3) decal(T.splat('#4a90d0'), pt.x, gy, pt.z, 0.5, 5, 0xffffff); }
        else if (s.kind === 'candy') { burst(pt.x, pt.y, pt.z, 4, { color: 0xff5a9e, size: 0.1, speed: 2 }); if (hitA) { hitA.push && hitA.push.set(s.v.x * 0.08, 0, s.v.z * 0.08); hitFreeze(0.04); } hitBreakables(pt, 0.2, [s.v.x, s.v.y, s.v.z], 0.3, ['glass', 'bulb', 'bottle']); worldHit(pt, 1.2, s.v); for (const h of W.hitHooks.slice()) h({ type: 'candy', vel: s.v, def: { mass: 0.6, r: 0.1, heavy: false }, pos: pt }, pt); }
        else if (s.kind === 'firework') { s.rest = true; s.v.set(0, 0, 0); s.p.y = gy + 0.12; if (wall) s.p.addScaledVector(new V3(wall.n[0], 0, wall.n[2]), 0.2); }
        else if (s.kind === 'popper') { GS.clouds.push({ x: pt.x, y: pt.y, z: pt.z, t: 2.2 }); sfx('pop', { at: pt }); const cs = [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff]; for (const c of cs) burst(pt.x, pt.y + 1, pt.z, 10, { color: c, size: 0.12, speed: 3, up: 3, g: 2, life: 2, grow: 0 }); scareBirds(pt.x, pt.z, 6); }
        else if (s.kind === 'web') { const m = decal(T.web(), pt.x, gy, pt.z, 3, 15, 0xffffff); GS.traps.push({ x: pt.x, y: gy, z: pt.z, r: 1.4, t: 15, m }); }
        if (s.kind !== 'firework') { W.group.remove(s.m); GS.shots.splice(i, 1); continue; }
      }
    }
    if (s.kind === 'firework') { s.fuse -= dt; s.m.material.emissiveIntensity = Math.sin(t * 30) > 0 ? 1.4 : 0.3; if (s.fuse <= 0) { explode(s.p, s.owner); W.group.remove(s.m); GS.shots.splice(i, 1); continue; } }
    if (s.life <= 0) { W.group.remove(s.m); GS.shots.splice(i, 1); }
  }
  // ловушки-паутины и облака конфетти
  for (let i = GS.traps.length - 1; i >= 0; i--) { const q = GS.traps[i]; q.t -= dt; if (q.t <= 0) { GS.traps.splice(i, 1); continue; }
    for (const a of actors(P)) if (Math.hypot(a.pos.x - q.x, a.pos.z - q.z) < q.r && Math.abs(a.pos.y - q.y) < 0.5) a.webT = 0.2; }
  for (let i = GS.clouds.length - 1; i >= 0; i--) { const c = GS.clouds[i]; c.t -= dt; if (c.t <= 0) { GS.clouds.splice(i, 1); continue; }
    if (Math.random() < dt * 20) puff(c.x + (Math.random() - 0.5) * 3, c.y + Math.random() * 2, c.z + (Math.random() - 0.5) * 3, { size: 0.15, grow: 0, life: 0.8, vy: -0.4, color: [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff][(Math.random() * 5) | 0] });
    for (const a of actors(P)) if (Math.hypot(a.pos.x - c.x, a.pos.z - c.z) < 2.6 && Math.abs(a.pos.y - c.y) < 2.5) a.blind = Math.max(a.blind || 0, 0.4); }
}
