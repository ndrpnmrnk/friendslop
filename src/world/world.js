import { addItem } from '../game/items.js';
import { THREE, G, mesh, tmat, flat, paint, setParent, col, lam, glow } from '../core/gfx.js';
import { T, rep } from '../core/textures.js';
import { CONFIG } from '../config.js';
import { seed, shuffle } from '../core/rng.js';
import { W, resetWorld } from './state.js';
import { addSolid, isFree } from './physics.js';
import { Builder, DACCENT } from './builder.js';
import { DISTRICTS } from './districts/index.js';
import { resetParticles } from './particles.js';
import { spawnCat } from '../game/cats.js';
import { resetBreakables } from './breakables.js';
import { buildEdges } from './edges.js';
import { buildRoadsAndTunnels } from './underground.js';
import { bakeStatic } from './bake.js';
import { dressRoofs, bridgeRoofs } from './roofs.js';
import { buildSkyways } from './skyways.js';

const GROUND = { pave: () => T.pave(), grass: () => T.grass(), dirt: () => T.dirt(), concrete: () => T.concrete(), asphalt: () => T.asphalt(), cobble: () => T.cobble(), flag: () => T.flag() };

/* Карта: сетка grid x grid районов, выбранных случайно из всех без повторов.
   Между районами дороги с разметкой. Ни один район не выделяется. */
export function generateMap(scene, s) {
  if (W.group) {W.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});scene.remove(W.group);}
  const group = new THREE.Group(); scene.add(group);
  resetWorld(group); resetParticles(); resetBreakables(); setParent(group);
  seed(s);
  const { grid, chunk, road, base } = CONFIG, total = grid * chunk + (grid + 1) * road, half = total / 2;
  W.bounds = half + 3.4;
  // разметка
  const line = paint(0xd8d0b8), yl = paint(0xe0b02a);
  const mark = (x, z, w, d, mat) => { const m = mesh(G.plane, mat, x, 0.025, z, w, d, 1, group); m.rotation.x = -Math.PI / 2; };
  for (let i = 0; i <= grid; i++) {
    const c = -half + road / 2 + i * (chunk + road);
    for (let k = -half; k < half; k += 3) { mark(c, k + 0.9, 0.28, 1.8, i === 0 || i === grid ? line : yl); mark(k + 0.9, c, 1.8, 0.28, i === 0 || i === grid ? line : yl); }
  }
  // Равновероятная перестановка без подстановки районов ради миссии.
  let picks=shuffle(DISTRICTS.slice());const force=globalThis.__forceDistricts;
  if(force)picks=[...force.map(id=>DISTRICTS.find(d=>d.id===id)).filter(Boolean),...picks.filter(d=>!force.includes(d.id))];
  picks=picks.slice(0,grid*grid);
  // порт — только у реки: ставим его в нижний ряд (южный край карты), а южный край делаем набережной
  W.riverSide = null;
  const pi = picks.findIndex(d => d.id === 'port');
  if (pi >= 0) { const row = [...Array(grid)].map((_, gx) => gx * grid + grid - 1), to = row.includes(pi) ? pi : row[(Math.random() * grid) | 0]; [picks[pi], picks[to]] = [picks[to], picks[pi]]; W.riverSide = 's'; }
  const curb = tmat(T.concrete());
  for (let gx = 0; gx < grid; gx++) for (let gz = 0; gz < grid; gz++) {
    const d = picks[gx * grid + gz];
    const ox = -half + road + gx * (chunk + road), oz = -half + road + gz * (chunk + road);
    const top = flat(rep(GROUND[d.ground](), chunk / 3, chunk / 3));
    // плита района; если в районе есть проёмы (канал, люк), плита собирается из кусков вокруг них
    const holes = (d.holes || []).map(([a, b2, c2, e]) => [ox + a, oz + b2, ox + c2, oz + e]);
    for (const h of holes) W.holes.push({ x0: h[0], z0: h[1], x1: h[2], z1: h[3] });
    const xs = [ox, ox + chunk, ...holes.flatMap(h => [h[0], h[2]])].sort((a, b2) => a - b2), zs = [oz, oz + chunk, ...holes.flatMap(h => [h[1], h[3]])].sort((a, b2) => a - b2);
    for (let a = 0; a < xs.length - 1; a++) for (let e = 0; e < zs.length - 1; e++) {
      const x0 = xs[a], x1 = xs[a + 1], z0 = zs[e], z1 = zs[e + 1];
      if (x1 - x0 < 0.01 || z1 - z0 < 0.01) continue;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (holes.some(h => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3])) continue;
      const tp = holes.length ? flat(rep(GROUND[d.ground](), (x1 - x0) / 3, (z1 - z0) / 3)) : top;
      mesh(G.box, [curb, curb, tp, curb, curb, curb], mx, base / 2, mz, x1 - x0, base, z1 - z0, group);
      addSolid(x0, z0, x1, z1, 0, base);
    }
    // пешеходные переходы посередине каждой стороны района: полосы вдоль дороги, через всю её ширину
    const zebra = (x, z, alongX) => {
      for (let k = -2.5; k <= 2.5; k += 1) mark(alongX ? x : x + k * 0.95, alongX ? z + k * 0.95 : z, alongX ? 2.6 : 0.6, alongX ? 0.6 : 2.6, line);
    };
    zebra(ox + chunk / 2, oz - road / 2, true); zebra(ox - road / 2, oz + chunk / 2, false);
    if (gz === grid - 1) zebra(ox + chunk / 2, oz + chunk + road / 2, true);
    if (gx === grid - 1) zebra(ox + chunk + road / 2, oz + chunk / 2, false);
    W.districts.push({ id: d.id, name: d.name, ox, oz, x1: ox + chunk, z1: oz + chunk, ground: d.ground });
    { const bd = new Builder(ox, oz, base, d.name); bd.did = d.id; d.build(bd); }
    // v0.53: неоновая кромка по краю тротуара — цвет района, районы читаются как отдельные зоны
    { const nm = glow(DACCENT[d.id] ?? 0xb47aff); for (const [x, z, w, dd] of [[ox + chunk / 2, oz + .12, chunk, .08], [ox + chunk / 2, oz + chunk - .12, chunk, .08], [ox + .12, oz + chunk / 2, .08, chunk], [ox + chunk - .12, oz + chunk / 2, .08, chunk]]) mesh(G.box, nm, x, base + .015, z, w, .04, dd, group); }
    // уличный мусор (v0.21): несколько штук по тротуарам у краёв района — можно поднять и бросить
    for (let i = 0, n = 0; i < 40 && n < 5; i++) { const e = Math.random() * 4 | 0, t = 1 + Math.random() * (chunk - 2), w0 = 0.4 + Math.random() * 1.2;
      const x = e === 0 ? ox + t : e === 1 ? ox + t : e === 2 ? ox + w0 : ox + chunk - w0, z = e === 0 ? oz + w0 : e === 1 ? oz + chunk - w0 : oz + t;
      if (!isFree(x - 0.3, z - 0.3, x + 0.3, z + 0.3, base + 0.02, base + 1)) continue; addItem('litter', x, base + 0.1, z, Math.random() * 6); n++; }
  }
  buildRoadsAndTunnels(half);
  streetFurniture(half);
  buildEdges(half);
  { const roofs = dressRoofs(); W.roofs = roofs; W.bridges = bridgeRoofs(roofs); }
  W.skyways = buildSkyways(half);
  // точки появления не должны оказаться внутри объектов: сдвигаем на ближайшее свободное место
  for (const sp of W.spawns) {
    if (isFree(sp.x - 0.4, sp.z - 0.4, sp.x + 0.4, sp.z + 0.4, sp.y + 0.1, sp.y + 1.8)) continue;
    let done = false;
    for (let r = 0.6; r <= 4 && !done; r += 0.6) for (let a = 0; a < 6.28 && !done; a += 0.6) { const x = sp.x + Math.cos(a) * r, z = sp.z + Math.sin(a) * r;
      if (isFree(x - 0.4, z - 0.4, x + 0.4, z + 0.4, sp.y + 0.1, sp.y + 1.8)) { sp.x = x; sp.z = z; done = true; } }
  }
  // коты: по одному в разных районах
  const homes = shuffle(W.catHomes.slice());
  const used = new Set();
  for (const h of homes) { if (W.cats.length >= CONFIG.cats) break; if (used.has(h.district)) continue; used.add(h.district); spawnCat(h); }
  setParent(null);
  W.bakeInfo = bakeStatic(group);
  return picks.map(d => d.name);
}

/* Светофоры на внутренних перекрёстках (мигают жёлтым ночью) и провода между столбами над дорогами */
function streetFurniture(half) {
  const { grid, chunk, road, base } = CONFIG, c = i => -half + road / 2 + i * (chunk + road);
  const b = new Builder(0, 0, base, 'Улица'), dk = col(0x2b2533);
  const yel = lam({ color: 0xffb020, emissive: 0xffb020, emissiveIntensity: 0.9 }, 'tlBlink');
  W.flick.push({ mats: [yel], t: 0, on: true, period: 0.6 });
  const poles = [];
  for (let i = 1; i < grid; i++) for (let j = 1; j < grid; j++) {
    const x = c(i), z = c(j);
    for (const [sx, sz] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const px = x + sx * (road / 2 + 0.6), pz = z + sz * (road / 2 + 0.6);
      if (!isFree(px - 0.3, pz - 0.3, px + 0.3, pz + 0.3, base + 0.1, base + 4)) continue;
      b.m(G.cyl8, dk, px, 2.1, pz, 0.08, 4.2, 0.08); b.solid(px, pz, 0.25, 0.25, 0, 4.2);
      const ax = -sx * 1.4, arm = b.m(G.box, dk, px + ax / 2, 4.1, pz, Math.abs(ax), 0.07, 0.07);
      const hx = px + ax, head = b.m(G.box, dk, hx, 3.7, pz, 0.3, 0.8, 0.3);
      b.m(G.box, col(0x3a1010), hx, 3.95, pz - sz * 0.16, 0.16, 0.16, 0.02); b.m(G.box, yel, hx, 3.7, pz - sz * 0.16, 0.16, 0.16, 0.02); b.m(G.box, col(0x103a10), hx, 3.45, pz - sz * 0.16, 0.16, 0.16, 0.02);
      poles.push([px, pz]); break;
    }
  }
  // провода через дороги: столбы у середины сторон районов, по одному пролёту на несколько улиц
  let n = 0;
  for (let i = 1; i < grid && n < 6; i++) for (let j = 0; j < grid && n < 6; j++) {
    if (Math.random() < 0.4) continue;
    const x = c(i), z = (c(j) + c(j + 1)) / 2 + 5;
    const a = [x - road / 2 - 0.5, z], bq = [x + road / 2 + 0.5, z];
    if (![a, bq].every(([px, pz]) => isFree(px - 0.3, pz - 0.3, px + 0.3, pz + 0.3, base + 0.1, base + 6))) continue;
    for (const [px, pz] of [a, bq]) { b.m(G.cyl6, col(0x4a3a2e), px, 2.9, pz, 0.09, 5.8, 0.09); b.solid(px, pz, 0.25, 0.25, 0, 5.8); b.m(G.box, dk, px, 5.5, pz, 0.06, 0.06, 0.9); }
    b.wires(a[0], 5.5, z - 0.35, bq[0], 5.5, z - 0.35, 2); n++;
  }
}
