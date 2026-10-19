import { THREE, G, mesh, tmat, col, setParent } from '../core/gfx.js';
import { T, rep } from '../core/textures.js';
import { CONFIG, HW } from '../config.js';
import { seed, shuffle, rand } from '../core/rng.js';
import { W, resetWorld } from './state.js';
import { addSolid } from './physics.js';
import { Builder } from './builder.js';
import { DISTRICTS } from './districts/index.js';
import { resetParticles } from './particles.js';
import { spawnCat } from '../game/cats.js';
import { buildGhost } from '../missions/objects.js';
import { resetBreakables } from './breakables.js';
import { buildEdges } from './edges.js';
import { buildRoadsAndTunnels } from './underground.js';

const GROUND = { pave: () => T.pave(), grass: () => T.grass(), dirt: () => T.dirt(), concrete: () => T.concrete(), asphalt: () => T.asphalt(), cobble: () => T.cobble() };

/* Карта: сетка grid x grid районов, выбранных случайно из всех без повторов.
   Между районами дороги с разметкой. Ни один район не выделяется. */
export function generateMap(scene, s) {
  if (W.group) scene.remove(W.group);
  const group = new THREE.Group(); scene.add(group);
  resetWorld(group); resetParticles(); resetBreakables(); setParent(group);
  seed(s);
  const { grid, chunk, road, base } = CONFIG, total = grid * chunk + (grid + 1) * road, half = total / 2;
  W.bounds = half + 3.4;
  // разметка
  const line = col(0xd8d0b8), yl = col(0xe0b02a);
  for (let i = 0; i <= grid; i++) {
    const c = -half + road / 2 + i * (chunk + road);
    for (let k = -half; k < half; k += 3) { mesh(G.box, i === 0 || i === grid ? line : yl, c, 0.01, k + 0.75, 0.15, 0.02, 1.5, group); mesh(G.box, i === 0 || i === grid ? line : yl, k + 0.75, 0.01, c, 1.5, 0.02, 0.15, group); }
  }
  const picks = shuffle(DISTRICTS.slice()).slice(0, grid * grid);
  const curb = tmat(T.concrete());
  for (let gx = 0; gx < grid; gx++) for (let gz = 0; gz < grid; gz++) {
    const d = picks[gx * grid + gz];
    const ox = -half + road + gx * (chunk + road), oz = -half + road + gz * (chunk + road);
    const top = tmat(rep(GROUND[d.ground](), chunk / 3, chunk / 3));
    // плита района; если в районе есть проёмы (канал, люк), плита собирается из кусков вокруг них
    const holes = (d.holes || []).map(([a, b2, c2, e]) => [ox + a, oz + b2, ox + c2, oz + e]);
    for (const h of holes) W.holes.push({ x0: h[0], z0: h[1], x1: h[2], z1: h[3] });
    const xs = [ox, ox + chunk, ...holes.flatMap(h => [h[0], h[2]])].sort((a, b2) => a - b2), zs = [oz, oz + chunk, ...holes.flatMap(h => [h[1], h[3]])].sort((a, b2) => a - b2);
    for (let a = 0; a < xs.length - 1; a++) for (let e = 0; e < zs.length - 1; e++) {
      const x0 = xs[a], x1 = xs[a + 1], z0 = zs[e], z1 = zs[e + 1];
      if (x1 - x0 < 0.01 || z1 - z0 < 0.01) continue;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (holes.some(h => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3])) continue;
      const tp = holes.length ? tmat(rep(GROUND[d.ground](), (x1 - x0) / 3, (z1 - z0) / 3)) : top;
      mesh(G.box, [curb, curb, tp, curb, curb, curb], mx, base / 2, mz, x1 - x0, base, z1 - z0, group);
      addSolid(x0, z0, x1, z1, 0, base);
    }
    // пешеходные переходы посередине каждой стороны района: полосы вдоль дороги, через всю её ширину
    const zebra = (x, z, alongX) => {
      for (let k = -2.5; k <= 2.5; k += 1) mesh(G.box, line, alongX ? x : x + k * 0.95, 0.024, alongX ? z + k * 0.95 : z, alongX ? 2.6 : 0.5, 0.02, alongX ? 0.5 : 2.6, group);
    };
    zebra(ox + chunk / 2, oz - road / 2, true); zebra(ox - road / 2, oz + chunk / 2, false);
    if (gz === grid - 1) zebra(ox + chunk / 2, oz + chunk + road / 2, true);
    if (gx === grid - 1) zebra(ox + chunk + road / 2, oz + chunk / 2, false);
    W.districts.push({ id: d.id, name: d.name, ox, oz });
    d.build(new Builder(ox, oz, base, d.name));
  }
  buildRoadsAndTunnels(half);
  buildEdges(half);
  // коты: по одному в разных районах
  const homes = shuffle(W.catHomes.slice());
  const used = new Set();
  for (const h of homes) { if (W.cats.length >= CONFIG.cats) break; if (used.has(h.district)) continue; used.add(h.district); spawnCat(h); }
  // призраки над городом
  if (HW) for (let i = 0; i < 5; i++) {
    const g = buildGhost(); group.add(g); const cx = (rand() - 0.5) * total * 0.8, cz = (rand() - 0.5) * total * 0.8, r = 4 + rand() * 6, ph = rand() * 6, sp = 0.25 + rand() * 0.3;
    W.animated.push((dt, t) => { const a = t * sp + ph; g.position.set(cx + Math.cos(a) * r, 5 + Math.sin(t * 2 + ph) * 0.4, cz + Math.sin(a) * r); g.rotation.y = -a + Math.PI / 2; });
  }
  setParent(null);
  return picks.map(d => d.name);
}
