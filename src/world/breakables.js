import { G, mesh, tmat, col, lam } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addSolid } from './physics.js';
import { chunk, burst } from './particles.js';

/* Разрушаемые объекты. Каждая часть — меш + коллизия + «прочность».
   Удар (кран, тяжёлый предмет) передаёт энергию = скорость × масса.
   Если энергия больше прочности — часть разлетается на куски.
   У кирпичных стен и сараев есть опора: без неё верхние части падают. */
export const STRENGTH = { glass: 3.5, wood: 8, brick: 18 };
let breakables = [];
export const resetBreakables = () => { breakables = []; W.breakables = breakables; };

export function addPiece(mesh_, solid, kind, extra = {}) {
  const p = { mesh: mesh_, solid, kind, alive: true, fall: -1, above: [], ...extra };
  breakables.push(p); return p;
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

export function breakPiece(p, vel = [0, 0, 0]) {
  if (!p.alive) return;
  p.alive = false; if (p.solid) p.solid.on = false;
  const m = p.mesh; m.parent && m.parent.remove(m);
  const pos = m.position, sc = m.scale;
  if (p.kind === 'glass') {
    for (let i = 0; i < 10; i++) chunk(pos.x + (Math.random() - 0.5) * sc.x, pos.y + (Math.random() - 0.5) * sc.y, pos.z + (Math.random() - 0.5) * sc.z,
      [vel[0] * 0.4 + (Math.random() - 0.5) * 3, Math.random() * 3, vel[2] * 0.4 + (Math.random() - 0.5) * 3], { mat: GLASS(), size: 0.12 + Math.random() * 0.1, sy: 1.4, sz: 0.2, life: 1.6 });
    burst(pos.x, pos.y, pos.z, 6, { color: 0xd8f0ff, size: 0.15, speed: 2.5 });
  } else {
    const n = p.kind === 'brick' ? 3 : 4, mat = m.material;
    for (let i = 0; i < n; i++) chunk(pos.x + (Math.random() - 0.5) * sc.x * 0.6, pos.y + (Math.random() - 0.5) * sc.y * 0.5, pos.z + (Math.random() - 0.5) * sc.z * 0.6,
      [vel[0] * 0.5 + (Math.random() - 0.5) * 3, Math.random() * 3 + Math.abs(vel[1]) * 0.2, vel[2] * 0.5 + (Math.random() - 0.5) * 3],
      { mat, size: Math.max(0.12, Math.min(sc.x, sc.y, sc.z) * (p.kind === 'wood' ? 0.9 : 0.75)), sx: p.kind === 'wood' ? 2.5 : 1.2, sy: 0.8, sz: 0.6, life: 3.5 });
    burst(pos.x, pos.y, pos.z, 4, { color: p.kind === 'brick' ? 0xa08a7a : 0x8a6a4a, size: 0.45, speed: 1.5, up: 1, g: 2, grow: 1.2, life: 0.8 });
  }
  for (const q of p.above) if (q.alive && q.fall < 0) q.fall = 0.12;
  if (p.onBreak) p.onBreak(p);
}

// Удар сферой: кран, летящий предмет
export function hitBreakables(pos, r, vel, mass) {
  const speed = Math.hypot(vel[0], vel[1], vel[2]), energy = speed * mass;
  let hit = false;
  for (const p of breakables) {
    if (!p.alive || !p.solid) continue;
    const s = p.solid;
    const cx = Math.max(s.x0, Math.min(pos.x, s.x1)), cy = Math.max(s.y0, Math.min(pos.y, s.y1)), cz = Math.max(s.z0, Math.min(pos.z, s.z1));
    if ((pos.x - cx) ** 2 + (pos.y - cy) ** 2 + (pos.z - cz) ** 2 > r * r) continue;
    hit = true;
    if (energy >= STRENGTH[p.kind]) breakPiece(p, vel);
  }
  return hit;
}

export function updateBreakables(dt) {
  for (const p of breakables) if (p.alive && p.fall > 0) { p.fall -= dt; if (p.fall <= 0) breakPiece(p, [(Math.random() - 0.5), 0, (Math.random() - 0.5)]); }
}
let _g;
const GLASS = () => _g || (_g = lam({ color: 0xbfe0f0, transparent: true, opacity: 0.55 }));
export const glassMat = GLASS;
