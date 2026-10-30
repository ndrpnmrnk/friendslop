import { random } from '../core/random.js';
import { impactBurst, sparks } from '../game/vfx.js';
import { THREE, G, mesh, tmat, col, lam } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addSolid } from './physics.js';
import { chunk, burst } from './particles.js';
import { sfx } from '../core/sfx.js';
import {crateCoins} from '../game/coins.js';

/* Разрушаемые объекты. Каждая часть — меш + коллизия + «прочность».
   Удар (кран, тяжёлый предмет) передаёт энергию = скорость × масса.
   Если энергия больше прочности — часть разлетается на куски.
   У кирпичных стен и сараев есть опора: без неё верхние части падают. */
export const STRENGTH = { glass: 3.5, wood: 8, brick: 18, crate: 6, pot: 2.5, bottle: 1.2, bulb: 2 };
export const resetBreakables = () => { W.breakables = []; };

export function addPiece(mesh_, solid, kind, extra = {}) {
  const p = { mesh: mesh_, solid, kind, alive: true, fall: -1, above: [], ...extra };
  W.breakables.push(p); return p;
}

// Стена из блоков. axis 'x' — стена вдоль X. Координаты мировые.
export function brickWall(cx, cz, y0, len, h, axis, o = {}) {
  const bw = o.bw || 0.8, bh = o.bh || 0.6, bd = o.bd || 0.45, kind = o.kind || 'brick';
  const mat = o.mat || tmat(T.brickWall());
  const cols = Math.max(1, Math.round(len / bw)), rows = Math.max(1, Math.round(h / bh)), w = len / cols, hh = h / rows;
  const grid = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const off = -len / 2 + (c + 0.5) * w, x = axis === 'x' ? cx + off : cx, z = axis === 'x' ? cz : cz + off, y = y0 + (r + 0.5) * hh;
    const m = mesh(G.box, mat, x, y, z, axis === 'x' ? w - 0.015 : bd, hh - 0.015, axis === 'x' ? bd : w - 0.015, W.group);
    const s = addSolid(x - (axis === 'x' ? w : bd) / 2, z - (axis === 'x' ? bd : w) / 2, x + (axis === 'x' ? w : bd) / 2, z + (axis === 'x' ? bd : w) / 2, y - hh / 2, y + hh / 2);
    const p = addPiece(m, s, kind); grid.push(p); p.r = r; p.c = c;
  }
  for (const p of grid) { const up = grid.find(q => q.c === p.c && q.r === p.r + 1); if (up) p.above.push(up); }
  return grid;
}

// Отдельная разрушаемая коробка (ящик, панель забора, витрина)
export function breakBox(x, y, z, w, h, d, kind, mat) {
  const m = mesh(G.box, mat, x, y + h / 2, z, w, h, d, W.group);
  const s = addSolid(x - w / 2, z - d / 2, x + w / 2, z + d / 2, y, y + h);
  return addPiece(m, s, kind);
}

// Разрушаемая детальная модель (ящик): obj — группа единичного размера, масштабируется под w×h×d
export function breakModel(x, y, z, w, h, d, kind, obj, o = null) {
  if (o) { obj.position.set(x, y + o.oy, z); obj.scale.setScalar(o.unit); } else { obj.position.set(x, y + h / 2, z); obj.scale.set(w, h, d); }
  W.group.add(obj);
  const s = addSolid(x - w / 2, z - d / 2, x + w / 2, z + d / 2, y, y + h);
  return addPiece(obj, s, kind, { size: [w, h, d] });
}
let _plank;
const PLANK = () => _plank || (_plank = tmat(T.wood()));
export function breakPiece(p, vel = [0, 0, 0]) {
  if (!p.alive) return;
  if (W.net?.request('break', p, { v: vel })) return;
  p.alive = false;if(p.motion){const b=p.motion;b.dead=true;if(b.grabbed){b.grabbed.grab=null;b.grabbed=null;}W.pushables=W.pushables.filter(q=>q!==b);} if (p.solid) p.solid.on = false;
  const m = p.mesh; m.parent && m.parent.remove(m);
  if (p.inst) for (const q of p.inst) { q.im.setMatrixAt(q.i, ZERO); q.im.instanceMatrix.needsUpdate = true; }
  const pos = m.position, sc = m.scale;
  sfx(p.kind === 'glass' || p.kind === 'bottle' || p.kind === 'bulb' ? 'glass' : 'wood', { at: pos });
  { const c = { x: pos.x, y: pos.y + (p.kind === 'glass' ? 0 : 0.3), z: pos.z }, glassy = p.kind === 'glass' || p.kind === 'bottle' || p.kind === 'bulb';
    impactBurst(c, glassy ? 0xd8f2ff : p.kind === 'brick' ? 0xffc9a0 : 0xffd8a0, glassy ? 1.1 : 1.4, glassy ? [0xd8f2ff, 0x9fd0ef, 0xffffff] : p.kind === 'brick' ? [0x8a4a3a, 0xa05a44, 0x6d6560] : [0x8a5a34, 0xb07a48, 0x5e3b22]);
    if (p.kind === 'bulb') sparks(c, 14, 0xfff2c0); }
  if (p.kind === 'crate') {
    crateCoins(p);
    // ящик разлетается на доски и щепки
    const [w, h, d] = p.size, n = 7 + ((random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const long = Math.max(w, d) * (0.55 + random() * 0.4), a = random() * 6.28, sp = 2 + random() * 3;
      chunk(pos.x + (random() - 0.5) * w * 0.7, pos.y + (random() - 0.5) * h * 0.7, pos.z + (random() - 0.5) * d * 0.7,
        [vel[0] * 0.4 + Math.cos(a) * sp, 2 + random() * 3.5, vel[2] * 0.4 + Math.sin(a) * sp], { mat: PLANK(), size: 1, sx: long, sy: 0.035, sz: 0.1 + random() * 0.05, r: 0.05, life: 4 });
    }
    for (let i = 0; i < 8; i++) chunk(pos.x, pos.y, pos.z, [(random() - 0.5) * 6, 1 + random() * 4, (random() - 0.5) * 6], { mat: PLANK(), size: 1, sx: 0.04, sy: 0.04, sz: 0.18, r: 0.03, life: 2.5 });
    burst(pos.x, pos.y, pos.z, 5, { color: 0x9a7a52, size: 0.4, speed: 1.6, up: 1, g: 2, grow: 1.2, life: 0.8 });
    p.respawnT = 0; if (W.crateHook) W.crateHook(pos.clone(), p);
  } else if (p.kind === 'pot') {
    const [w, h] = p.size;
    for (let i = 0; i < 7; i++) chunk(pos.x, pos.y + 0.2, pos.z, [(random() - 0.5) * 4 + vel[0] * 0.3, 1 + random() * 3, (random() - 0.5) * 4 + vel[2] * 0.3], { mat: col(0xb05a3a), size: 0.08 + random() * 0.06, sy: 0.4, life: 3 });
    for (let i = 0; i < 4; i++) chunk(pos.x, pos.y + h * 0.4, pos.z, [(random() - 0.5) * 3, 1 + random() * 2, (random() - 0.5) * 3], { mat: tmat(T.leaves(2)), geo: G.ico, size: 0.14, life: 3 });
    burst(pos.x, pos.y + 0.2, pos.z, 5, { color: 0x4a3424, size: 0.3, speed: 1.4, up: 1, g: 4, life: 0.7 });
    void w;
  } else if (p.kind === 'bottle' || p.kind === 'bulb') {
    for (let i = 0; i < 6; i++) chunk(pos.x, pos.y, pos.z, [(random() - 0.5) * 3, random() * 2.5, (random() - 0.5) * 3], { mat: p.kind === 'bulb' ? GLASS() : m.material, size: 0.05 + random() * 0.04, sy: 0.3, life: 1.5 });
    burst(pos.x, pos.y, pos.z, p.kind === 'bulb' ? 8 : 3, { color: p.kind === 'bulb' ? 0xffe0a0 : 0xd8f0ff, size: 0.12, speed: 2, up: 1, g: 9, life: 0.5 });
  } else if (p.kind === 'glass') {
    for (let i = 0; i < 10; i++) chunk(pos.x + (random() - 0.5) * sc.x, pos.y + (random() - 0.5) * sc.y, pos.z + (random() - 0.5) * sc.z,
      [vel[0] * 0.4 + (random() - 0.5) * 3, random() * 3, vel[2] * 0.4 + (random() - 0.5) * 3], { mat: GLASS(), size: 0.12 + random() * 0.1, sy: 1.4, sz: 0.2, life: 1.6 });
    burst(pos.x, pos.y, pos.z, 6, { color: 0xd8f0ff, size: 0.15, speed: 2.5 });
  } else {
    const n = p.kind === 'brick' ? 3 : 4, mat = m.material;
    for (let i = 0; i < n; i++) chunk(pos.x + (random() - 0.5) * sc.x * 0.6, pos.y + (random() - 0.5) * sc.y * 0.5, pos.z + (random() - 0.5) * sc.z * 0.6,
      [vel[0] * 0.5 + (random() - 0.5) * 3, random() * 3 + Math.abs(vel[1]) * 0.2, vel[2] * 0.5 + (random() - 0.5) * 3],
      { mat, size: Math.max(0.12, Math.min(sc.x, sc.y, sc.z) * (p.kind === 'wood' ? 0.9 : 0.75)), sx: p.kind === 'wood' ? 2.5 : 1.2, sy: 0.8, sz: 0.6, life: 3.5 });
    burst(pos.x, pos.y, pos.z, 4, { color: p.kind === 'brick' ? 0xa08a7a : 0x8a6a4a, size: 0.45, speed: 1.5, up: 1, g: 2, grow: 1.2, life: 0.8 });
  }
  for (const q of p.above) if (q.alive && q.fall < 0) q.fall = 0.12;
  if (p.onBreak) p.onBreak(p);
}

// Удар сферой: кран, летящий предмет
export function hitBreakables(pos, r, vel, mass, kinds = null) {
  const speed = Math.hypot(vel[0], vel[1], vel[2]), energy = speed * mass;
  let hit = false;
  for (const p of W.breakables) {
    if (!p.alive || !p.solid || (kinds && !kinds.includes(p.kind))) continue;
    const s = p.solid;
    const cx = Math.max(s.x0, Math.min(pos.x, s.x1)), cy = Math.max(s.y0, Math.min(pos.y, s.y1)), cz = Math.max(s.z0, Math.min(pos.z, s.z1));
    if ((pos.x - cx) ** 2 + (pos.y - cy) ** 2 + (pos.z - cz) ** 2 > r * r) continue;
    hit = true;
    if (energy >= STRENGTH[p.kind]) breakPiece(p, vel);
  }
  return hit;
}

export function updateBreakables(dt, player) {
  for (const p of W.breakables) {
    if (p.alive && p.fall > 0) { p.fall -= dt; if (p.fall <= 0) breakPiece(p, [(random() - 0.5), 0, (random() - 0.5)]); }
    // ящики появляются снова на своём месте (если там никто не стоит)
    if (!p.alive && p.respawnT > 0) { p.respawnT -= dt; if (p.respawnT <= 0) {
      const s = p.solid; if (player && player.pos.x > s.x0 - 0.5 && player.pos.x < s.x1 + 0.5 && player.pos.z > s.z0 - 0.5 && player.pos.z < s.z1 + 0.5) { p.respawnT = 2; continue; }
      p.alive = true; s.on = true;
      if (p.inst) for (const q of p.inst) { q.im.setMatrixAt(q.i, q.mx); q.im.instanceMatrix.needsUpdate = true; } else W.group.add(p.mesh);
      burst((s.x0 + s.x1) / 2, s.y0 + 0.4, (s.z0 + s.z1) / 2, 6, { color: 0xd8d0e4, size: 0.35, speed: 1, up: 1, g: 1, grow: 1, life: 0.6 }); } }
  }
}
/* Оптимизация: все целые куски одного вида рисуются одной инстанс-отрисовкой.
   Сломанный кусок просто сжимается в ноль и пропадает из батча. */
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
export function bakeBreakables(group) {
  const by = new Map();
  group.updateMatrixWorld(true);
  for (const p of W.breakables) {
    if (!p.alive || !p.mesh.parent || p.dynamic) continue;
    const list = []; p.mesh.traverse(o => { if (o.isMesh) list.push(o); });
    if (!list.length || list.some(o => Array.isArray(o.material))) continue;
    p.inst = [];
    for (const o of list) {
      const k = o.geometry.uuid + o.material.uuid; let b = by.get(k); if (!b) by.set(k, b = { geo: o.geometry, mat: o.material, items: [] });
      b.items.push({ p, mx: o.matrixWorld.clone(),local:o.matrixWorld.clone().premultiply(p.mesh.matrixWorld.clone().invert()) });
    }
    p.mesh.parent.remove(p.mesh);
  }
  for (const b of by.values()) {
    const im = new THREE.InstancedMesh(b.geo, b.mat, b.items.length); im.castShadow = !b.mat.transparent; im.receiveShadow = !b.mat.transparent;
    b.items.forEach((it, i) => { im.setMatrixAt(i, it.mx); it.p.inst.push({ im, i, mx: it.mx,local:it.local }); });
    im.instanceMatrix.needsUpdate = true;im.frustumCulled=!b.items.some(it=>it.p.motion); im.computeBoundingSphere(); group.add(im);
  }
}
let _g;
const GLASS = () => _g || (_g = lam({ color: 0xbfe0f0, transparent: true, opacity: 0.55 }));
export const glassMat = GLASS;
