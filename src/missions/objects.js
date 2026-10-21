import { THREE, G, V3, mesh, col, tmat, lam } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';

/* Объекты миссий, которые появляются в случайном подходящем месте.
   f — направление «лица» объекта (куда должен встать игрок): [x, z] по одной оси. */
function frame(x, y, z, f) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(f[0], f[1]); W.group.add(g); return g; }
function footprint(x, z, f, w, d, y, h) {
  const along = f[0] === 0; const fw = along ? w : d, fd = along ? d : w;
  return addSolid(x - fw / 2, z - fd / 2, x + fw / 2, z + fd / 2, y, y + h);
}
const wl = (g, s) => { const v = new V3(...s); return g.localToWorld(v); };

export function buildBoard(x, y, z, f) {
  const g = frame(x, y, z, f), wood = tmat(T.wood());
  for (const px of [-1.1, 1.1]) mesh(G.box, col(0x3a3046), px, 1.0, 0, 0.14, 2.0, 0.14, g);
  mesh(G.box, wood, 0, 1.9, -0.06, 2.35, 2.35, 0.1, g);
  { const sm = tmat(T.sign('ПАЗЛ', '#2a1f3d', '#f5c542')), dk = col(0x2a2232); mesh(G.box, [dk, dk, dk, dk, sm, sm], 0, 3.2, -0.06, 1.2, 0.3, 0.08, g); } // табличка стоит на доске, не висит в воздухе
  const slots = [], tiles = [], base = T.puzzlePic((Math.random() * 6) | 0); // каждый раз одна из нарисованных картинок
  for (let i = 0; i < 9; i++) slots.push(new V3(-0.72 + (i % 3) * 0.72, 2.62 - Math.floor(i / 3) * 0.72, 0.04));
  for (let i = 0; i < 9; i++) {
    const t = base.clone(); t.needsUpdate = true; t.repeat.set(1 / 3, 1 / 3); t.offset.set((i % 3) / 3, 1 - (Math.floor(i / 3) + 1) / 3);
    const m = mesh(G.box, [wood, wood, wood, wood, lam({ map: t }), wood], slots[i].x, slots[i].y, slots[i].z, 0.68, 0.68, 0.08, g);
    tiles.push({ mesh: m, idx: i });
  }
  const s = footprint(x, z, f, 2.5, 0.5, y, 2.2);
  g.updateMatrixWorld(true);
  return { type: 'board', g, f, slots, tiles, solid: s, order: [...Array(9).keys()], center: wl(g, [0, 1.9, 0]), pos: () => g.position, front: () => new V3(x + f[0] * 0.75, y, z + f[1] * 0.75),
    dispose() { W.group.remove(g); s.on = false; } };
}

export function buildTable(x, y, z, f) {
  const g = frame(x, y, z, f), st = tmat(T.stone());
  for (const [a, b] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) mesh(G.box, st, a, 0.4, b, 0.15, 0.8, 0.15, g);
  mesh(G.box, [st, st, tmat(T.tttTop()), st, st, st], 0, 0.86, 0, 1.4, 0.12, 1.4, g);
  mesh(G.cyl8, st, 0, 0.25, 1.05, 0.28, 0.5, 0.28, g);
  const cells = [], cm = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(G.plane, cm); c.rotation.x = -Math.PI / 2; c.scale.set(0.44, 0.44, 1);
    c.position.set(-0.467 + (i % 3) * 0.467, 0.93, -0.467 + Math.floor(i / 3) * 0.467); g.add(c); cells.push(c);
  }
  const ghost = buildGhost(); ghost.position.set(0, 1.0, -1.1); g.add(ghost);
  const s = footprint(x, z, f, 1.6, 1.6, y, 0.95);
  g.updateMatrixWorld(true);
  return { type: 'table', g, f, cells, pieces: [], ghost, solid: s, pos: () => g.position, front: () => new V3(x + f[0] * 1.15, y, z + f[1] * 1.15), reach: 2.0, world: (a, b, c) => wl(g, [a, b, c]),
    dispose() { W.group.remove(g); s.on = false; } };
}

export function buildGhost() {
  const g = new THREE.Group(), m = lam({ color: 0xeee8ff, transparent: true, opacity: 0.85 }, 'ghost');
  mesh(G.sph, m, 0, 0.45, 0, 0.45, 0.45, 0.45, g);
  const sk = mesh(G.cone8, m, 0, -0.1, 0, 0.45, 0.8, 0.45, g); sk.rotation.x = Math.PI;
  for (const ex of [-0.15, 0.15]) mesh(G.box, lam({ color: 0x17111f }, 'c1511f'), ex, 0.52, 0.42, 0.1, 0.16, 0.04, g);
  mesh(G.box, lam({ color: 0x17111f }, 'c1511f'), 0, 0.3, 0.43, 0.14, 0.08, 0.04, g);
  return g;
}
