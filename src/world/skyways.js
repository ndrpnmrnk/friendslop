import { THREE, G, glow, chrome, glassMC, lacq } from '../core/gfx.js';
import { CONFIG } from '../config.js';
import { W } from './state.js';
import { addSolid, isFree } from './physics.js';
import { Builder } from './builder.js';

/* v0.53 — второй уровень города: «скайвеи».
   Над каждой внутренней дорогой (если хватает места) — стеклянный мост на высоте 5.2 м с хромовыми арками,
   по краям районов — площадки на колоннах и лестницы вдоль тротуара. Вместе с мостами между крышами
   (roofs.js) и тоннелями под дорогами (underground.js) город становится трёхслойным: низ — улицы — верх.
   Ставится только туда, где под площадкой и лестницей пусто (проверка по коллизиям), двери не загораживаются. */
const H = 5.2, PW = 3.2, BW = 2.6;
const NEONS = [0x4fe6ff, 0xff4fa8, 0xffb43a, 0xb47aff];

export function buildSkyways(half) {
  const { grid, chunk, road, base } = CONFIG, b = new Builder(0, 0, base, 'Эстакада'), made = [];
  const deck = lacq(0x1a1e44), steel = chrome(0xdfe4ff), glass = glassMC(0x9ac0ff, .3);
  const dox = i => -half + road + i * (chunk + road);
  const clearDoors = (x0, z0, x1, z1) => !W.doors.some(d => d.x > x0 - 2.2 && d.x < x1 + 2.2 && d.z > z0 - 2.2 && d.z < z1 + 2.2 && Math.abs(d.y - base) < 1.5);
  // лестница — сплошная, под ней ничего; у площадки свободными должны быть только места колонн и объём на уровне настила
  const high = (x0, z0, x1, z1) => isFree(x0 - .8, z0 - .8, x1 + .8, z1 + .8, H - 1.2, H + 2.5);
  const noSpawn = (x0, z0, x1, z1) => !W.spawns.some(p => p.x > x0 - 1 && p.x < x1 + 1 && p.z > z0 - 1 && p.z < z1 + 1);
  const free = (x0, z0, x1, z1) => isFree(x0, z0, x1, z1, base + .05, H + 2.5) && high(x0, z0, x1, z1) && clearDoors(x0, z0, x1, z1) && noSpawn(x0, z0, x1, z1);
  const platFree = (x0, z0, x1, z1) => high(x0, z0, x1, z1) && [[x0, z0], [x1 - .4, z0], [x0, z1 - .4], [x1 - .4, z1 - .4]].every(([px, pz]) => isFree(px - .05, pz - .05, px + .45, pz + .45, base + .05, H));
  // площадка (PW×PW) с лестницей; ищем свободное место у края района, при необходимости глубже внутри
  const L = Math.round((H - base) / .3) * .42 + .1;
  function stairRect(x0, z0, x1, z1, dir) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    return dir === 's' ? [cx - .75, z1, cx + .75, z1 + L] : dir === 'n' ? [cx - .75, z0 - L, cx + .75, z0] : dir === 'w' ? [x0 - L, cz - .75, x0, cz + .75] : [x1, cz - .75, x1 + L, cz + .75]; }
  const inMap = r => r.every(v => Math.abs(v) < half - 1);
  // axis: 'x' — мост вдоль x (дорога вдоль z); edge — координата края района; side: +1 район слева от края (площадка в -), -1 справа
  function findLanding(axis, edge, c, side) {
    for (const inset of [.2, 1.4, 2.8, 4.2, 5.6, 7, 8.5, 10]) {
      const lo = side > 0 ? edge - inset - PW : edge + inset, hi = lo + PW;
      const plat = axis === 'x' ? [lo, c - PW / 2, hi, c + PW / 2] : [c - PW / 2, lo, c + PW / 2, hi];
      if (!platFree(...plat)) continue;
      const toward = axis === 'x' ? (side > 0 ? 'e' : 'w') : (side > 0 ? 's' : 'n'), away = { e: 'w', w: 'e', s: 'n', n: 's' }[toward];
      const opts = axis === 'x' ? ['s', 'n', away] : ['e', 'w', away];
      for (const dir of opts) { const st = stairRect(...plat, dir); if (inMap(st) && free(...st)) return { plat, stair: st, dir, open: toward, exit: dir }; }
    }
    return null;
  }
  function platform(q, open, ci) {
    const [x0, z0, x1, z1] = q.plat, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    b.box(cx, cz, w, d, .3, deck, { y: H - .3 - base, solid: false }); addSolid(x0, z0, x1, z1, H - .3, H);
    for (const [px, pz] of [[x0 + .25, z0 + .25], [x1 - .25, z0 + .25], [x0 + .25, z1 - .25], [x1 - .25, z1 - .25]]) { b.m(G.cyl12, steel, px, (H - .3) / 2, pz, .16, H - .3, .16); b.solid(px, pz, .32, .32, 0, H - .3); }
    // стеклянные перила по сторонам, кроме выхода на мост (open) и на лестницу
    const sides = { n: [cx, z0, w, 'x'], s: [cx, z1, w, 'x'], w: [x0, cz, d, 'z'], e: [x1, cz, d, 'z'] };
    for (const [k, [px, pz, len, ax]] of Object.entries(sides)) { if (k === open || k === q.exit) continue; rail(px, pz, len, ax); }
    neonEdges(cx, cz, w, d, NEONS[ci % NEONS.length]);
    (W.lightSources ??= []).push({ x: cx, y: H - .8, z: cz, color: NEONS[ci % NEONS.length], strength: 2.2, range: 6 });
  }
  // неоновая кромка по нижнему краю настила (у моста — только вдоль, у площадки — по периметру)
  function neonEdges(cx, cz, w, d, c, only) {
    const m = glow(c);
    if (only !== 'z') for (const s of [-1, 1]) { const e = new THREE.Mesh(G.box, m); e.position.set(cx, H - .33, cz + s * d / 2); e.scale.set(w, .06, .06); W.group.add(e); }
    if (only !== 'x') for (const s of [-1, 1]) { const e = new THREE.Mesh(G.box, m); e.position.set(cx + s * w / 2, H - .33, cz); e.scale.set(.06, .06, d); W.group.add(e); }
  }
  function rail(px, pz, len, ax) {
    b.box(px, pz, ax === 'x' ? len : .06, ax === 'x' ? .06 : len, 1.0, glass, { y: H - base, solid: false });
    b.box(px, pz, ax === 'x' ? len : .1, ax === 'x' ? .1 : len, .06, steel, { y: H + 1.0 - base, solid: false });
    addSolid(px - (ax === 'x' ? len / 2 : .08), pz - (ax === 'x' ? .08 : len / 2), px + (ax === 'x' ? len / 2 : .08), pz + (ax === 'x' ? .08 : len / 2), H, H + 1.1, 'fence');
  }
  function stairsUp(q) {
    const [x0, z0, x1, z1] = q.stair, along = q.dir === 'n' || q.dir === 's', w = along ? x1 - x0 : z1 - z0, len = along ? z1 - z0 : x1 - x0;
    // строим от земли (дальний конец) к площадке
    const back = { n: 's', s: 'n', e: 'w', w: 'e' }[q.dir], n = Math.round((H - base) / .3);
    const sx = q.dir === 'e' ? x1 : q.dir === 'w' ? x0 : (x0 + x1) / 2, sz = q.dir === 's' ? z1 : q.dir === 'n' ? z0 : (z0 + z1) / 2;
    b.stairs(sx, sz, back, 0, H - base, w, 0, (len - .1) / n);
    // поручни: тонкая хромовая труба от низа лестницы к площадке (ориентация через lookAt — без ошибок знака)
    const far = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[q.dir], cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const s of [-1, 1]) { const ox = along ? s * w / 2 : 0, oz = along ? 0 : s * w / 2;
      const lo = new THREE.Vector3(cx + ox + far[0] * len / 2, base + .95, cz + oz + far[1] * len / 2), hi = new THREE.Vector3(cx + ox - far[0] * len / 2, H + .95, cz + oz - far[1] * len / 2);
      const m = new THREE.Mesh(G.box, steel); m.position.copy(lo).add(hi).multiplyScalar(.5); m.scale.set(.06, .06, lo.distanceTo(hi)); m.lookAt(hi); W.group.add(m); }
  }
  function bridge(ax, a, bq, c, ci) {
    // ax: 'x' — мост вдоль x между a и bq (координаты x), c — z центра
    const len = Math.abs(bq - a), m = (a + bq) / 2;
    const cx = ax === 'x' ? m : c, cz = ax === 'x' ? c : m, w = ax === 'x' ? len : BW, d = ax === 'x' ? BW : len;
    b.box(cx, cz, w, d, .3, deck, { y: H - .3 - base, solid: false }); addSolid(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, H - .3, H);
    for (const s of [-1, 1]) rail(ax === 'x' ? cx : cx + s * (BW / 2 - .05), ax === 'x' ? cz + s * (BW / 2 - .05) : cz, len, ax === 'x' ? 'x' : 'z');
    // арки-рёбра из хрома — «труба» читается издалека
    const n = Math.max(2, Math.round(len / 2.4));
    for (let i = 0; i <= n; i++) { const t = -len / 2 + i * len / n, r = b.m(G.halfTorus, steel, ax === 'x' ? cx + t : cx, H, ax === 'x' ? cz : cz + t, BW / 2 + .05, BW / 2 + .05, 1.4); r.rotation.y = ax === 'x' ? Math.PI / 2 : 0; }
    neonEdges(cx, cz, w, d, NEONS[ci % NEONS.length], ax);
    (W.lightSources ??= []).push({ x: cx, y: H - 1, z: cz, color: NEONS[ci % NEONS.length], strength: 2.6, range: 7 });
  }
  let ci = 0;
  const tryRoad = (ax, gx, gz) => {
    for (const t of [.5, .35, .65, .22, .78, .12, .88]) {
      const ea = ax === 'x' ? dox(gx) + chunk : dox(gz) + chunk, eb = ea + road, c = (ax === 'x' ? dox(gz) : dox(gx)) + t * chunk;
      const A = findLanding(ax, ea, c, 1); if (!A) continue; const B = findLanding(ax, eb, c, -1); if (!B) continue;
      const a0 = ax === 'x' ? A.plat[2] : A.plat[3], b0 = ax === 'x' ? B.plat[0] : B.plat[1];
      const deckR = ax === 'x' ? [a0, c - BW / 2, b0, c + BW / 2] : [c - BW / 2, a0, c + BW / 2, b0];
      if (!isFree(...deckR, H - .9, H + 2.5)) continue;
      platform(A, A.open, ci); platform(B, B.open, ci); stairsUp(A); stairsUp(B); bridge(ax, a0 - .05, b0 + .05, c, ci);
      made.push({ ax, a: a0, b: b0, c }); ci++; return true;
    }
    return false;
  };
  for (let gx = 0; gx < grid - 1; gx++) for (let gz = 0; gz < grid; gz++) tryRoad('x', gx, gz);
  for (let gz = 0; gz < grid - 1; gz++) for (let gx = 0; gx < grid; gx++) tryRoad('z', gx, gz);
  return made;
}
