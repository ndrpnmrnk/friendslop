import { THREE, G, V3, col, lam, mesh, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { CONFIG } from '../config.js';
import { W } from '../world/state.js';
import { groundAt, solidHit, addZone, impulsePushables } from '../world/physics.js';
import { burst, puff, smokeRing, decal } from '../world/particles.js';
import { scareBirds } from '../world/birds.js';
import { hitBreakables } from '../world/breakables.js';
import { worldHit, shake, hitFreeze } from './worldfx.js';
import { addItem, launch } from './items.js';
import { actors, shove, knockDown, dropHeld } from './actors.js';
import { sfx } from '../core/sfx.js';
import { placeRake, placeCushion } from './traps.js';

/* Инструменты из ящиков — обычные физические предметы (items.js), но у них есть действие на ЛКМ.
   Ящик: 30% — выпадает инструмент, золотой ящик — всегда и «редкий».
   Логика не зависит от рендера и ввода (актёр + точка прицела) — потом её можно перенести на сервер. */
export const GS = { shots: [], traps: [], clouds: [], gold: [], bubbles: new Map() };
const PAINT = [0x4ab0f0, 0xff5a9e, 0x9be36b, 0xf5c542, 0xb18cff];

export function resetTools() {
  for (const q of GS.gold) W.group.remove(q.g);
  for (const s of GS.shots) W.group.remove(s.m);
  for (const t of GS.traps) if (t.m) W.group.remove(t.m);
  for (const b of GS.bubbles.values()) W.group.remove(b);
  GS.shots = []; GS.traps = []; GS.clouds = []; GS.gold = []; GS.bubbles = new Map();
  W.crateHook = (pos, piece) => { if (Math.random() < (piece.golden ? 1 : 0.3)) spawnTool(pos.x, pos.y, pos.z, piece.golden); };
  W.fires = W.fires || [];
  // золотые ящики: на крышах и в нычках
  const spots = W.missionZones.filter(z => z.type === 'roof' || z.type === 'nook').sort(() => Math.random() - 0.5);
  let n = 0; for (const z of spots) { if (n >= 3) break; goldenCrate((z.x0 + z.x1) / 2, z.y, (z.z0 + z.z1) / 2); n++; }
}
function goldenCrate(x, y, z) {
  const g = compose('goldCrate', a => { const gm = lam({ color: 0xf5c542, emissive: 0x6a4a00, emissiveIntensity: 0.6 }, 'goldCrate'), dk = col(0x6a4a1a);
    a(G.box, gm, 0, 0.35, 0, 0.7, 0.7, 0.7); for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(G.box, dk, sx * 0.33, 0.35, sz * 0.33, 0.06, 0.72, 0.06); a(G.box, dk, 0, 0.69, 0, 0.72, 0.04, 0.12); });
  g.position.set(x, y, z); W.group.add(g); W.keep.push(g);
  GS.gold.push({ g, x, y, z, respawn: 0 });
}
// инструмент выпрыгивает из ящика и падает рядом
export function spawnTool(x, y, z, rare = false, type = null) {
  const pool = rare ? CONFIG.toolRare : CONFIG.toolPool;
  type = type || pool[(Math.random() * pool.length) | 0];
  const gy = groundAt(x, z, 0.2, y + 0.5), it = addItem(type, x, gy, z, Math.random() * 6);
  it.life = 50; launch(it, new V3(x, gy + 0.6, z), new V3((Math.random() - 0.5) * 3, 5, (Math.random() - 0.5) * 3));
  it.owner = null; burst(x, gy + 0.6, z, 10, { color: rare ? 0xf5c542 : 0xf1e8ff, size: 0.16, speed: 2.5, up: 2.5 });
  return it;
}

/* ---------- применение (ЛКМ). Возвращает звук или null ---------- */
const _d = new V3();
const front = (a, r, dot = 0.4, fn) => { const f = a.root.rotation.y, fx = Math.sin(f), fz = Math.cos(f);
  for (const b of actors()) { if (b === a || b.hidden) continue; const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz); if (d < r && Math.abs(b.pos.y - a.pos.y) < 1.4 && (dx * fx + dz * fz) / (d || 1) > dot) fn(b, dx, dz); }
  for (const c of W.cats) { const q = c.root.position, dx = q.x - a.pos.x, dz = q.z - a.pos.z, d = Math.hypot(dx, dz); if (d < r && (dx * fx + dz * fz) / (d || 1) > dot) c.hit && c.hit(false, dx, dz); }
  return [fx, fz]; };
export function useTool(a, it, aim, dt = 0) {
  if (!it || a.stun > 0) return null;
  const k = it.type, d = it.def, hp = a.ch ? a.ch.holdPoint : new V3(a.pos.x, a.pos.y + 1.2, a.pos.z);
  const from = hp.clone(), dir = _d.copy(aim).sub(from); const dist = dir.length(); dir.normalize();
  if (d.ammo && it.ammo <= 0) return null;
  const spend = (n = 1) => { if (d.ammo) { it.ammo -= n; if (it.ammo <= 0 && !d.hold) consume(a, it); } else consume(a, it); };
  if (it.cd > 0 && !d.hold) return null;
  switch (k) {
    case 'slipper': { it.cd = 0.45; const [fx, fz] = front(a, 1.7, 0.45, (b, dx, dz) => { shove(b, dx, dz, 5, 3, true); hitFreeze(0.05); }); a.swatT = 0.25; puff(a.pos.x + fx, a.pos.y + 1, a.pos.z + fz, { size: 0.3, life: 0.2, color: 0xffd0e0 }); return 'swat'; }
    case 'pillow': { it.cd = 0.6; let hit = false; const [fx, fz] = front(a, 1.9, 0.35, (b, dx, dz) => { shove(b, dx, dz, 10, 4.5, true); hit = true; hitFreeze(0.06); });
      a.swatT = 0.3; burst(a.pos.x + fx * 1.1, a.pos.y + 1.1, a.pos.z + fz * 1.1, hit ? 18 : 6, { color: 0xffffff, size: 0.12, speed: 2.5, up: 1.5, g: 1.2, life: 1.6, grow: 0 }); return 'pillow'; }
    case 'umbrella': { it.cd = 0.25; it.open = !it.open; const c = it.g.userData.canopy; if (c) c.scale.set(it.open ? 0.78 : 0.09, it.open ? 0.8 : 1, it.open ? 0.78 : 0.09); return 'umbrella'; }
    case 'banana': { const f = a.root.rotation.y; dropHeld(a); it.state = 'gone'; placeBanana(it, a.pos.x + Math.sin(f) * 0.9, a.pos.y, a.pos.z + Math.cos(f) * 0.9); return 'drop'; }
    case 'duck': { it.cd = 0.8; W.lure = { x: a.pos.x, z: a.pos.z, t: 4, by: a }; for (const c of W.cats) c.lure = { x: a.pos.x, z: a.pos.z, t: 4 }; puff(hp.x, hp.y + 0.2, hp.z, { size: 0.4, life: 0.25, color: 0xf5c542 }); return 'squeak'; }
    case 'bubbles': { it.cd = 0.5; shoot('bubble', from, dir, 7, 0, a); spend(); return 'bubble'; }
    case 'whistle': { it.cd = 0.8; for (const b of actors()) { if (b === a || b.hidden) continue; if (Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 8) { b.vel.y = Math.max(b.vel.y, 6); b.onGround = false; dropHeld(b); b.startle = 0.8; } }
      for (const c of W.cats) { const q = c.root.position; if (Math.hypot(q.x - a.pos.x, q.z - a.pos.z) < 10) c.hit && c.hit(false, q.x - a.pos.x, q.z - a.pos.z); } scareBirds(a.pos.x, a.pos.z, 14); spend(); return 'whistle'; }
    case 'paint': { const f = a.root.rotation.y; dropHeld(a); it.state = 'gone'; it.g.visible = false; paintPuddle(a.pos.x + Math.sin(f) * 1.2, a.pos.y, a.pos.z + Math.cos(f) * 1.2, 1.2); return 'splash'; }
    case 'energy': { a.energy = 7; a.tired = 0; burst(a.pos.x, a.pos.y + 1, a.pos.z, 10, { color: 0x9be36b, size: 0.2, speed: 2 }); spend(); return 'drink'; }
    case 'water': { it.cd = 0.18; for (let i = 0; i < 4; i++) shoot('water', from, dir, 22 + i, i * 0.03, a); spend(); return 'water'; }
    case 'sling': { it.cd = 0.4; shoot('candy', from, dir, 42, 0, a); spend(); return 'candy'; }
    case 'popper': { const f = a.root.rotation.y, px = a.pos.x + Math.sin(f) * 2.2, pz = a.pos.z + Math.cos(f) * 2.2; GS.clouds.push({ x: px, y: a.pos.y, z: pz, t: 2.4 }); const cs = [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff];
      for (const c of cs) burst(px, a.pos.y + 1, pz, 10, { color: c, size: 0.12, speed: 3, up: 3, g: 2, life: 2, grow: 0 }); scareBirds(px, pz, 6); spend(); return 'pop'; }
    case 'web': { lob('web', from, aim, a); spend(); return 'throw'; }
    case 'firework': { if (it.lit === undefined) { it.lit = 2.4; return 'fuse'; } return null; }
    case 'rake': case 'cushion': { const f = a.root.rotation.y, x = a.pos.x + Math.sin(f) * 1.1, z = a.pos.z + Math.cos(f) * 1.1, gy = groundAt(x, z, 0.2, a.pos.y + 0.6);
      if (k === 'rake') placeRake(x, gy, z, f + Math.PI, a); else placeCushion(x, gy, z, a); consume(a, it); return 'drop'; }
    case 'boots': { a.boots = 3; burst(a.pos.x, a.pos.y + 0.2, a.pos.z, 10, { color: 0xb18cff, size: 0.16, speed: 2, up: 1 }); spend(); return 'spring'; }
    case 'mask': { a.ghost = 8; burst(a.pos.x, a.pos.y + 1, a.pos.z, 12, { color: 0xeee8ff, size: 0.3, speed: 1.5 }); spend(); return 'ghost'; }
    case 'extinguisher': {
      it.ammo -= dt; it.sprayT = 0.1;
      if (Math.random() < 0.9) puff(from.x + dir.x * 0.4, from.y + dir.y * 0.4, from.z + dir.z * 0.4, { color: 0xf1f1ff, size: 0.25, vx: dir.x * 9 + (Math.random() - 0.5), vy: dir.y * 9 + 0.5, vz: dir.z * 9 + (Math.random() - 0.5), g: 0, life: 0.5, grow: 1.6, opacity: 0.7 });
      // струя толкает в конусе
      for (const b of actors()) { if (b === a) continue; const dx = b.pos.x - from.x, dy = b.pos.y + 0.8 - from.y, dz = b.pos.z - from.z, l = Math.hypot(dx, dy, dz); if (l < 5.5 && (dx * dir.x + dy * dir.y + dz * dir.z) / l > 0.85) { b.vel.x += dir.x * 28 * dt; b.vel.z += dir.z * 28 * dt; b.knockT = Math.max(b.knockT || 0, 0.15); b.wetT = 3; } }
      for (const q of W.items) if (q.state === 'rest' && q !== it) { const dx = q.pos.x - from.x, dz = q.pos.z - from.z, l = Math.hypot(dx, dz); if (l < 5 && l > 0.1 && (dx * dir.x + dz * dir.z) / l > 0.85) { q.vel.x += dir.x * 18 * dt / q.def.mass; q.vel.z += dir.z * 18 * dt / q.def.mass; q.vel.y += 4 * dt; } }
      impulsePushables(from.x + dir.x * 2.5, from.z + dir.z * 2.5, 1.5, 8 * dt * 6);
      for (const f of W.fires || []) if (f.hp > 0 && Math.hypot(f.x - (from.x + dir.x * 2.5), f.z - (from.z + dir.z * 2.5)) < 2.6) f.hp -= dt * 1.4;
      // струя вниз — реактивный подскок
      if (dir.y < -0.55) { a.vel.y = Math.min(9, a.vel.y + 34 * dt); a.onGround = false; a.airPeak = a.pos.y; a.jetT = 0.2; }
      if (it.ammo <= 0) { it.ammo = 0; it.empty = true; }
      return null;
    }
    case 'magnet': {
      it.ammo -= dt;
      for (const q of W.items) if (q.state === 'rest' && q !== it) { const dx = from.x - q.pos.x, dz = from.z - q.pos.z, l = Math.hypot(dx, dz); if (l < 11 && l > 1 && -(dx * dir.x + dz * dir.z) / l > 0.55) { q.vel.x += dx / l * 22 * dt; q.vel.z += dz / l * 22 * dt; q.vel.y = Math.max(q.vel.y, 1.2); } }
      for (const p of W.pushables) { if (p.rider || p.grabbed) continue; const dx = from.x - p.x, dz = from.z - p.z, l = Math.hypot(dx, dz); if (l < 11 && l > 1.4 && -(dx * dir.x + dz * dir.z) / l > 0.55) { p.vx += dx / l * 14 * dt / p.mass; p.vz += dz / l * 14 * dt / p.mass; } }
      if (Math.random() < dt * 10) puff(from.x + dir.x * 1.5, from.y, from.z + dir.z * 1.5, { color: 0xff5a6e, size: 0.12, vx: -dir.x * 3, vz: -dir.z * 3, vy: 0, life: 0.4 });
      if (it.ammo <= 0) { it.ammo = 0; it.empty = true; }
      return null;
    }
  }
  return null;
}
function consume(a, it) { if (a.held === it) a.held = null; it.state = 'gone'; it.g.visible = false; it.def = { ...it.def, respawn: 0 }; }

/* ловушки: банановая кожура, лужа краски, паутина */
export function placeBanana(it, x, y, z) {
  const gy = groundAt(x, z, 0.1, y + 0.6);
  const m = compose('peel', a => { const yl = col(0xf5d442); for (let i = 0; i < 4; i++) a(G.box, yl, Math.cos(i * 1.57) * 0.09, 0.02, Math.sin(i * 1.57) * 0.09, 0.07, 0.025, 0.16, 0, i * 1.57); a(G.sph, col(0xe8d0a0), 0, 0.04, 0, 0.05, 0.04, 0.05); });
  m.position.set(x, gy, z); m.rotation.y = Math.random() * 6; W.group.add(m);
  GS.traps.push({ kind: 'banana', x, y: gy, z, r: 0.55, t: 40, m, arm: 0.4 });
}
export function paintPuddle(x, y, z, r) {
  const gy = groundAt(x, z, 0.1, y + 0.6), c = PAINT[(Math.random() * PAINT.length) | 0];
  const m = decal(T.splat('#ffffff'), x, gy, z, r * 2.4, 22, c); m.material.opacity = 0.95;
  burst(x, gy + 0.3, z, 12, { color: c, size: 0.18, speed: 2.5, up: 2 });
  GS.traps.push({ kind: 'paint', x, y: gy, z, r, t: 22, c });
}
function webTrap(x, y, z) { const m = decal(T.web(), x, y, z, 3, 15, 0xffffff); GS.traps.push({ kind: 'web', x, y, z, r: 1.4, t: 15, m }); }

/* выстрелы: вода, конфета из рогатки, пузырь, паутина/фейерверк навесом */
const SHOT_GEO = new THREE.SphereGeometry(1, 5, 4);
function shotMesh(kind) { const c = { water: 0x7ac8f0, candy: 0xff5a9e, web: 0xe8e0f0, bubble: 0xc8f0ff }[kind];
  return mesh(SHOT_GEO, lam({ color: c, emissive: c, emissiveIntensity: 0.4, transparent: kind === 'bubble', opacity: kind === 'bubble' ? 0.55 : 1 }, 'shot' + kind), 0, 0, 0, 1, 1, 1, W.group); }
export function shoot(kind, from, dir, speed, delay, owner) {
  const m = shotMesh(kind); m.scale.setScalar(kind === 'water' ? 0.09 : kind === 'bubble' ? 0.28 : 0.08); m.visible = false;
  GS.shots.push({ kind, m, p: from.clone().addScaledVector(dir, 0.6), v: dir.clone().multiplyScalar(speed).add(new V3(0, kind === 'water' ? 1.5 : kind === 'bubble' ? 0.6 : 0.6, 0)), g: kind === 'water' ? 14 : kind === 'bubble' ? -0.4 : 4, life: kind === 'bubble' ? 2.6 : 1.6, delay, owner });
}
function lob(kind, from, aim, owner) {
  const d = new V3(aim.x - from.x, 0, aim.z - from.z), dist = Math.min(16, d.length()); d.normalize();
  const t = 0.35 + dist / 18, vx = d.x * dist / t, vz = d.z * dist / t, vy = (aim.y - from.y + 0.5 * 22 * t * t) / t;
  const m = shotMesh(kind); m.scale.setScalar(0.14);
  GS.shots.push({ kind, m, p: from.clone(), v: new V3(vx, vy, vz), g: 22, life: 4, delay: 0, owner });
}
function hitActorsAt(p, r, owner) { for (const a of actors()) { if (a === owner || a.hidden) continue; const q = a.pos; if (Math.hypot(q.x - p.x, q.z - p.z) < r && p.y > q.y - 0.3 && p.y < q.y + a.h + 0.3) return a; } return null; }
export function explode(p, owner) {
  const cols = [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff];
  for (const c of cols) burst(p.x, p.y + 0.5, p.z, 7, { color: c, size: 0.2, speed: 6, up: 5, g: 6, life: 1.1, grow: 0.2 });
  smokeRing(p.x, p.y + 0.1, p.z, 12, { speed: 4, size: 0.3, grow: 1, life: 0.9 });
  for (const a of actors()) { const dx = a.pos.x - p.x, dz = a.pos.z - p.z, d = Math.hypot(dx, dz); if (d < 3.2 && Math.abs(a.pos.y - p.y) < 2.5) { shove(a, dx || 0.1, dz, 8, 7, true); hitFreeze(0.07); } }
  hitBreakables({ x: p.x, y: p.y + 0.8, z: p.z }, 2.5, [0, 8, 0], 1, ['glass', 'bottle', 'bulb', 'pot']);
  for (const c of W.cats) { const q = c.root.position; if (Math.hypot(q.x - p.x, q.z - p.z) < 6) c.hit && c.hit(false, q.x - p.x, q.z - p.z); }
  sfx('boom', { at: p }); scareBirds(p.x, p.z, 20); impulsePushables(p.x, p.z, 3, 6); worldHit(p, 5, new V3()); shake(0.45);
}
// удар брошенного инструмента (из items.impact): банан и краска становятся ловушками, фейерверк ждёт фитиль
export function toolImpact(it, p, gy) {
  const k = it.type;
  if (k === 'banana') { it.state = 'gone'; it.g.visible = false; placeBanana(it, p.x, gy + 0.05, p.z); return true; }
  if (k === 'paint') { it.state = 'gone'; it.g.visible = false; paintPuddle(p.x, gy + 0.05, p.z, 1.6); sfx('splash', { at: p }); return true; }
  if (k === 'web') { it.state = 'gone'; it.g.visible = false; webTrap(p.x, gy, p.z); return true; }
  if (k === 'duck') sfx('squeak', { at: p });
  if (k === 'pillow') burst(p.x, p.y, p.z, 10, { color: 0xffffff, size: 0.12, speed: 2, up: 1.5, g: 1.2, life: 1.4, grow: 0 });
  return false;
}

/* ---------- обновление ---------- */
const _f = new V3();
export function updateTools(dt, t) {
  const P = W.player;
  // эффекты на актёрах
  for (const a of actors()) {
    if (a.energy > 0) { a.energy -= dt; a.stamina = 1; if (a.energy <= 0) a.tired = 3; } else if (a.tired > 0) a.tired -= dt;
    if (a.ghost > 0) a.ghost -= dt;
    if (a.blind > 0) a.blind -= dt;
    if (a.startle > 0) a.startle -= dt;
    if (a.swatT > 0) a.swatT -= dt;
    // пузырь: висит в воздухе и медленно поднимается
    let bub = GS.bubbles.get(a);
    if (a.floatT > 0) { a.floatT -= dt; a.vel.set(a.vel.x * 0.95, 1.1, a.vel.z * 0.95); a.onGround = false; a.airPeak = a.pos.y;
      if (!bub) { bub = mesh(G.sph10, lam({ color: 0xc8f0ff, emissive: 0x204050, transparent: true, opacity: 0.38, depthWrite: false }, 'bubbleBig'), 0, 0, 0, 1.05, 1.15, 1.05, W.group); GS.bubbles.set(a, bub); }
      bub.visible = true; bub.position.set(a.pos.x, a.pos.y + 0.85, a.pos.z);
      if (a.floatT <= 0) { burst(a.pos.x, a.pos.y + 0.9, a.pos.z, 12, { color: 0xc8f0ff, size: 0.12, speed: 2.5 }); sfx('pop', { at: a.pos, v: 0.5 }); } }
    else if (bub) bub.visible = false;
    // краска на подошвах: цветные следы
    if (a.paintT > 0) { a.paintT -= dt; a.paintStep = (a.paintStep || 0) - dt;
      if (a.onGround && Math.hypot(a.vel.x, a.vel.z) > 1.5 && a.paintStep <= 0) { a.paintStep = 0.28; a.paintS = -(a.paintS || 1); const f = a.root.rotation.y, sx = Math.cos(f) * 0.14 * a.paintS, sz = -Math.sin(f) * 0.14 * a.paintS;
        const d = decal(T.footW(), a.pos.x + sx, a.pos.y, a.pos.z + sz, 0.34, 10, a.paintC); d.rotation.z = f; } }
    // фейерверк в руках догорел — бах прямо в руках
    const h = a.held; if (h && h.lit !== undefined) { h.lit -= dt; if (Math.random() < dt * 30) puff(h.pos.x, h.pos.y + 0.2, h.pos.z, { size: 0.1, life: 0.3, vy: 1, color: 0xffd25c }); if (h.lit <= 0) { a.held = null; h.state = 'gone'; h.g.visible = false; explode(h.pos.clone(), null); } }
    if (h && h.cd > 0) h.cd -= dt;
  }
  // брошенный горящий фейерверк: лежит, искрит, взрывается
  for (const it of W.items) if (it.lit !== undefined && it.state !== 'held' && it.state !== 'gone') { it.lit -= dt; if (Math.random() < dt * 30) puff(it.pos.x, it.pos.y + 0.15, it.pos.z, { size: 0.12, life: 0.3, vy: 1.2, color: 0xffd25c }); if (it.lit <= 0) { it.state = 'gone'; it.g.visible = false; explode(it.pos.clone(), it.owner); } }
  // лежащие инструменты из ящиков исчезают через 50 с (мигают в конце)
  for (const it of W.items) if (it.life !== undefined && it.state === 'rest') { it.life -= dt; if (it.life < 4) it.g.visible = Math.sin(t * 20) > 0; if (it.life <= 0) { it.state = 'gone'; it.g.visible = false; } }
  // золотые ящики
  for (const q of GS.gold) {
    if (q.respawn > 0) { q.respawn -= dt; if (q.respawn <= 0) q.g.visible = true; continue; }
    for (const a of actors()) if (Math.hypot(a.pos.x - q.x, a.pos.z - q.z) < 0.9 && Math.abs(a.pos.y - q.y) < 1.2) { q.g.visible = false; q.respawn = 45; burst(q.x, q.y + 0.5, q.z, 14, { color: 0xf5c542, size: 0.2, speed: 3, up: 3 }); spawnTool(q.x, q.y + 0.3, q.z, true); if (a === P) sfx('pickup'); break; }
  }
  // выстрелы
  for (let i = GS.shots.length - 1; i >= 0; i--) {
    const s = GS.shots[i];
    if (s.delay > 0) { s.delay -= dt; continue; }
    s.m.visible = true; s.life -= dt;
    s.v.y -= s.g * dt; s.p.addScaledVector(s.v, dt); s.m.position.copy(s.p);
    if (s.kind === 'bubble') { s.v.multiplyScalar(Math.exp(-dt * 0.6)); s.m.scale.setScalar(0.28 + Math.sin(t * 8 + i) * 0.02); }
    const gy = groundAt(s.p.x, s.p.z, 0.05, s.p.y + 0.1), wall = solidHit(s.p, 0.06), hitA = hitActorsAt(s.p, s.kind === 'bubble' ? 0.8 : 0.6, s.owner);
    let gone = s.life <= 0;
    if (s.p.y <= gy || wall || hitA) {
      const pt = s.p.clone(); if (s.p.y <= gy) pt.y = gy; gone = true;
      const fakeIt = (type, mass) => ({ type, vel: s.v, def: { mass, r: 0.1, heavy: false }, pos: pt });
      if (s.kind === 'water') { burst(pt.x, pt.y, pt.z, 3, { color: 0x9ccbec, size: 0.12, speed: 1.5 }); if (hitA) { hitA.push.set(s.v.x * 0.06, 0, s.v.z * 0.06); hitA.wetT = 4; hitA.slipT = 2; } hitBreakables(pt, 0.2, [s.v.x, s.v.y, s.v.z], 0.15, ['bulb']); worldHit(pt, 0.5, s.v); for (const h of W.hitHooks.slice()) h(fakeIt('water', 0.6), pt); for (const f of W.fires || []) if (Math.hypot(f.x - pt.x, f.z - pt.z) < 1.3) f.hp -= 0.12; if (!hitA && Math.random() < 0.3) decal(T.splat('#4a90d0'), pt.x, gy, pt.z, 0.5, 5, 0xffffff); }
      else if (s.kind === 'candy') { burst(pt.x, pt.y, pt.z, 4, { color: 0xff5a9e, size: 0.1, speed: 2 }); if (hitA) { hitA.push.set(s.v.x * 0.08, 0, s.v.z * 0.08); hitFreeze(0.04); } hitBreakables(pt, 0.2, [s.v.x, s.v.y, s.v.z], 0.3, ['glass', 'bulb', 'bottle']); worldHit(pt, 1.2, s.v); for (const h of W.hitHooks.slice()) h(fakeIt('candy', 0.6), pt); for (const h of W.moth ? [W.moth] : []) h.hitAt && h.hitAt(pt, 1); }
      else if (s.kind === 'bubble') { if (hitA) { hitA.floatT = 3; dropHeld(hitA); sfx('bubble', { at: pt }); } else burst(pt.x, pt.y, pt.z, 6, { color: 0xc8f0ff, size: 0.1, speed: 1.5 }); }
      else if (s.kind === 'web') webTrap(pt.x, gy, pt.z);
    }
    if (gone) { W.group.remove(s.m); GS.shots.splice(i, 1); }
  }
  // ловушки
  for (let i = GS.traps.length - 1; i >= 0; i--) {
    const q = GS.traps[i]; q.t -= dt; if (q.arm > 0) q.arm -= dt;
    if (q.t <= 0) { if (q.m && q.kind === 'banana') W.group.remove(q.m); GS.traps.splice(i, 1); continue; }
    for (const a of actors()) {
      if (a.hidden || Math.hypot(a.pos.x - q.x, a.pos.z - q.z) > q.r || Math.abs(a.pos.y - q.y) > 0.5) continue;
      if (q.kind === 'web') a.webT = 0.2;
      else if (q.kind === 'paint') { a.paintT = 10; a.paintC = q.c; }
      else if (q.kind === 'banana' && !(q.arm > 0) && a.onGround && Math.hypot(a.vel.x, a.vel.z) > 1.5) {
        // поскользнулся: ноги вперёд, падение
        knockDown(a, a.vel.x * 0.8, a.vel.z * 0.8, 1.3); a.vel.y = 6; a.slipFall = 0.8; sfx('slip', { at: a.pos });
        W.group.remove(q.m); GS.traps.splice(i, 1); W.onFunny && W.onFunny(a, 'slip'); break;
      }
    }
  }
  for (let i = GS.clouds.length - 1; i >= 0; i--) { const c = GS.clouds[i]; c.t -= dt; if (c.t <= 0) { GS.clouds.splice(i, 1); continue; }
    if (Math.random() < dt * 20) puff(c.x + (Math.random() - 0.5) * 3, c.y + Math.random() * 2, c.z + (Math.random() - 0.5) * 3, { size: 0.15, grow: 0, life: 0.8, vy: -0.4, color: [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff][(Math.random() * 5) | 0] });
    for (const a of actors()) if (Math.hypot(a.pos.x - c.x, a.pos.z - c.z) < 2.6 && Math.abs(a.pos.y - c.y) < 2.5) a.blind = Math.max(a.blind || 0, 0.4); }
  if (W.lure) { W.lure.t -= dt; if (W.lure.t <= 0) W.lure = null; }
  void _f; void addZone;
}
// иконка-подсказка для HUD: есть ли у инструмента действие на ЛКМ
export const toolVerb = it => ({ slipper: 'шлёп', pillow: 'бац', umbrella: it && it.open ? 'сложить' : 'раскрыть', banana: 'бросить под ноги', duck: 'пискнуть', bubbles: 'пузырь', whistle: 'свисток', paint: 'вылить', energy: 'выпить',
  water: 'пли', sling: 'выстрел', popper: 'хлоп', web: 'метнуть', firework: it && it.lit !== undefined ? 'бросай!' : 'поджечь', boots: 'надеть', mask: 'надеть', rake: 'поставить', cushion: 'подложить', extinguisher: 'струя', magnet: 'тянуть' })[it ? it.type : ''] || '';
