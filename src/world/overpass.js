import { THREE, G, col, tmat, lam } from '../core/gfx.js';
import { T, rep } from '../core/textures.js';
import { CONFIG, HW } from '../config.js';
import { W } from './state.js';
import { addSolid, isFree } from './physics.js';
import { Builder } from './builder.js';

/* v0.55 — надземные пешеходные переходы (вместо стеклянных скайвеев).
   Обычный городской переход из крашеного железа: площадки на колоннах по краям районов, лестницы вдоль тротуара,
   над дорогой — настил с решётчатыми фермами-перилами. Над головой ничего нет — персонаж нигде не цепляется.
   Немного Хэллоуина: паутина в углах ферм, тыква у лестницы (в праздничный сезон). Место ищется автоматически:
   под лестницей пусто, у площадки свободны колонны, не у дверей и точек появления. */
const H = 5.0, PW = 2.8, BW = 2.4, RH = 1.15;
const PAINT = [0x3e6a5a, 0x4a5a7a, 0x6a4a3a, 0x5a5a64];

export function buildOverpasses(half) {
  const { grid, chunk, road, base } = CONFIG, b = new Builder(0, 0, base, 'Переход'), made = [];
  const dox = i => -half + road + i * (chunk + road);
  const clearDoors = (x0, z0, x1, z1) => !W.doors.some(d => d.x > x0 - 2.2 && d.x < x1 + 2.2 && d.z > z0 - 2.2 && d.z < z1 + 2.2 && Math.abs(d.y - base) < 1.5);
  const noSpawn = (x0, z0, x1, z1) => !W.spawns.some(p => p.x > x0 - 1 && p.x < x1 + 1 && p.z > z0 - 1 && p.z < z1 + 1);
  const high = (x0, z0, x1, z1) => isFree(x0 - .6, z0 - .6, x1 + .6, z1 + .6, H - 1, H + 2.4);
  const free = (x0, z0, x1, z1) => isFree(x0, z0, x1, z1, base + .05, H + 2.4) && high(x0, z0, x1, z1) && clearDoors(x0, z0, x1, z1) && noSpawn(x0, z0, x1, z1);
  const platFree = (x0, z0, x1, z1) => high(x0, z0, x1, z1) && noSpawn(x0, z0, x1, z1) && [[x0, z0], [x1 - .4, z0], [x0, z1 - .4], [x1 - .4, z1 - .4]].every(([px, pz]) => isFree(px - .05, pz - .05, px + .45, pz + .45, base + .05, H));
  const L = Math.round((H - base) / .3) * .42 + .1;
  const inMap = r => r.every(v => Math.abs(v) < half - 1);
  function stairRect(x0, z0, x1, z1, dir) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    return dir === 's' ? [cx - .7, z1, cx + .7, z1 + L] : dir === 'n' ? [cx - .7, z0 - L, cx + .7, z0] : dir === 'w' ? [x0 - L, cz - .7, x0, cz + .7] : [x1, cz - .7, x1 + L, cz + .7]; }
  function findLanding(axis, edge, c, side) {
    for (const inset of [.2, 1.4, 2.8, 4.2, 5.6, 7, 8.5]) {
      const lo = side > 0 ? edge - inset - PW : edge + inset, hi = lo + PW;
      const plat = axis === 'x' ? [lo, c - PW / 2, hi, c + PW / 2] : [c - PW / 2, lo, c + PW / 2, hi];
      if (!platFree(...plat)) continue;
      const toward = axis === 'x' ? (side > 0 ? 'e' : 'w') : (side > 0 ? 's' : 'n'), away = { e: 'w', w: 'e', s: 'n', n: 's' }[toward];
      for (const dir of axis === 'x' ? ['s', 'n', away] : ['e', 'w', away]) { const st = stairRect(...plat, dir); if (inMap(st) && free(...st)) return { plat, stair: st, dir, open: toward }; }
    }
    return null;
  }
  // решётчатая ферма-перила: две продольные трубы + решётка (текстура с прозрачностью)
  function truss(px, pz, len, ax, paint) {
    const t = rep(T.truss('#' + paint.toString(16).padStart(6, '0')), Math.max(1, Math.round(len / 1.2)), 1), m = lam({ map: t, alphaTest: .5, side: THREE.DoubleSide }, 'op55-truss' + paint + '_' + Math.round(len * 10));
    const p = new THREE.Mesh(G.plane, m); p.position.set(px, H + RH / 2, pz); p.scale.set(len, RH, 1); if (ax === 'z') p.rotation.y = Math.PI / 2; W.group.add(p);
    const pm = tmat(T.paintMetal(paint));
    for (const y of [H + RH, H + .06]) b.box(px, pz, ax === 'x' ? len : .1, ax === 'x' ? .1 : len, .08, pm, { y: y - base - .04, solid: false });
    addSolid(px - (ax === 'x' ? len / 2 : .07), pz - (ax === 'x' ? .07 : len / 2), px + (ax === 'x' ? len / 2 : .07), pz + (ax === 'x' ? .07 : len / 2), H, H + RH + .05, 'fence');
  }
  function platform(q, paint) {
    const [x0, z0, x1, z1] = q.plat, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, pm = tmat(T.paintMetal(paint));
    b.box(cx, cz, w, d, .25, tmat(T.concrete()), { y: H - .25 - base, solid: false }); addSolid(x0, z0, x1, z1, H - .25, H);
    b.box(cx, cz, w + .1, d + .1, .1, pm, { y: H - .35 - base, solid: false });
    for (const [px, pz] of [[x0 + .2, z0 + .2], [x1 - .2, z0 + .2], [x0 + .2, z1 - .2], [x1 - .2, z1 - .2]]) { b.box(px, pz, .26, .26, H - .3 - base, pm); }
    const sides = { n: [cx, z0, w, 'x'], s: [cx, z1, w, 'x'], w: [x0, cz, d, 'z'], e: [x1, cz, d, 'z'] };
    for (const [k, [px, pz, len, ax]] of Object.entries(sides)) if (k !== q.open && k !== q.dir) truss(px, pz, len, ax, paint);
    if (HW && Math.random() < .5) b.web(cx + (Math.random() < .5 ? -1 : 1) * (w / 2 - .1), H + .7, cz, Math.PI / 2, .8);
    (W.lightSources ??= []).push({ x: cx, y: H - .8, z: cz, color: 0xffd8a0, strength: 1.6, range: 5 });
  }
  function stairsUp(q, paint) {
    const [x0, z0, x1, z1] = q.stair, along = q.dir === 'n' || q.dir === 's', w = along ? x1 - x0 : z1 - z0, len = along ? z1 - z0 : x1 - x0;
    const back = { n: 's', s: 'n', e: 'w', w: 'e' }[q.dir], n = Math.round((H - base) / .3);
    const sx = q.dir === 'e' ? x1 : q.dir === 'w' ? x0 : (x0 + x1) / 2, sz = q.dir === 's' ? z1 : q.dir === 'n' ? z0 : (z0 + z1) / 2;
    // открытая стальная лестница: ступени-решётки на двух косоурах, под ней видно насквозь.
    // Коллизия — сплошная «лесенка» под ступенями, чтобы под марш нельзя было залезть.
    const run = (len - .1) / n, rise = (H - base) / n, v = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[back], tread = tmat(T.paintMetal(0x4a4a52));
    for (let i = 0; i < n; i++) { const tx = sx + v[0] * (i + .5) * run, tz = sz + v[1] * (i + .5) * run, top = rise * (i + 1);
      b.box(tx, tz, v[0] ? run + .02 : w - .16, v[0] ? w - .16 : run + .02, .07, tread, { y: top - .07, solid: false });
      b.solid(tx, tz, v[0] ? run : w, v[0] ? w : run, 0, top); }
    { const pmS = tmat(T.paintMetal(paint));
      for (const s of [-1, 1]) { const ox = along ? s * (w / 2 - .06) : 0, oz = along ? 0 : s * (w / 2 - .06);
        const lo = new THREE.Vector3(sx + ox, base + .02, sz + oz), hi = new THREE.Vector3(sx + ox + v[0] * n * run, H - .12, sz + oz + v[1] * n * run);
        const m = new THREE.Mesh(G.box, pmS); m.position.copy(lo).add(hi).multiplyScalar(.5); m.scale.set(.1, .26, lo.distanceTo(hi)); m.lookAt(hi); W.group.add(m); }
      // опора посередине марша
      const mx = sx + v[0] * n * run * .55, mz = sz + v[1] * n * run * .55, mh = (H - base) * .55 - .2;
      for (const s of [-1, 1]) b.box(mx + (along ? s * (w / 2 - .06) : 0), mz + (along ? 0 : s * (w / 2 - .06)), .14, .14, mh, pmS, { solid: false }); }
    // перила лестницы: наклонные трубы на стойках
    const far = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[q.dir], cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, pm = tmat(T.paintMetal(paint));
    for (const s of [-1, 1]) { const ox = along ? s * w / 2 : 0, oz = along ? 0 : s * w / 2;
      const lo = new THREE.Vector3(cx + ox + far[0] * len / 2, base + 1.0, cz + oz + far[1] * len / 2), hi = new THREE.Vector3(cx + ox - far[0] * len / 2, H + 1.0, cz + oz - far[1] * len / 2);
      const m = new THREE.Mesh(G.box, pm); m.position.copy(lo).add(hi).multiplyScalar(.5); m.scale.set(.07, .07, lo.distanceTo(hi)); m.lookAt(hi); W.group.add(m);
      for (let k = 0; k <= 3; k++) { const p = lo.clone().lerp(hi, k / 3); b.box(p.x, p.z, .06, .06, 1.0, pm, { y: p.y - 1.0 - base, solid: false }); } }
    if (HW && Math.random() < .6) b.pumpkin(cx + far[0] * (len / 2 + .5) + (along ? w / 2 + .3 : 0), cz + far[1] * (len / 2 + .5) + (along ? 0 : w / 2 + .3), .35);
  }
  function deck(ax, a, bq, c, paint) {
    const len = Math.abs(bq - a), m = (a + bq) / 2, cx = ax === 'x' ? m : c, cz = ax === 'x' ? c : m, w = ax === 'x' ? len : BW, d = ax === 'x' ? BW : len;
    b.box(cx, cz, w, d, .25, tmat(T.concrete()), { y: H - .25 - base, solid: false }); addSolid(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, H - .25, H);
    // балка под настилом и ферма с обеих сторон
    b.box(cx, cz, w + .02, d + .02, .3, tmat(T.paintMetal(paint)), { y: H - .55 - base, solid: false });
    for (const s of [-1, 1]) truss(ax === 'x' ? cx : cx + s * (BW / 2 - .05), ax === 'x' ? cz + s * (BW / 2 - .05) : cz, len, ax, paint);
    // табличка «ПЕРЕХОД» снизу по центру — читается с дороги
    const sg = new THREE.Mesh(G.box, tmat(T.sign('ПЕРЕХОД', '#2a4a8a', '#f1e8ff'))); sg.position.set(cx, H - .85, cz); sg.scale.set(ax === 'x' ? .05 : 1.6, .35, ax === 'x' ? 1.6 : .05); W.group.add(sg);
  }
  let k = 0;
  const tryRoad = (ax, gx, gz) => {
    for (const t of [.5, .35, .65, .22, .78]) {
      const ea = ax === 'x' ? dox(gx) + chunk : dox(gz) + chunk, eb = ea + road, c = (ax === 'x' ? dox(gz) : dox(gx)) + t * chunk;
      const A = findLanding(ax, ea, c, 1); if (!A) continue; const B = findLanding(ax, eb, c, -1); if (!B) continue;
      const a0 = ax === 'x' ? A.plat[2] : A.plat[3], b0 = ax === 'x' ? B.plat[0] : B.plat[1];
      const deckR = ax === 'x' ? [a0, c - BW / 2, b0, c + BW / 2] : [c - BW / 2, a0, c + BW / 2, b0];
      if (!isFree(...deckR, H - .9, H + 2.4)) continue;
      const paint = PAINT[k++ % PAINT.length];
      platform(A, paint); platform(B, paint); stairsUp(A, paint); stairsUp(B, paint); deck(ax, a0 - .02, b0 + .02, c, paint);
      made.push({ ax, a: a0, b: b0, c }); return true;
    }
    return false;
  };
  // не на каждой улице: 4–6 переходов на карту, остальное — зебры и тоннели
  const roads = [];
  for (let gx = 0; gx < grid - 1; gx++) for (let gz = 0; gz < grid; gz++) roads.push(['x', gx, gz]);
  for (let gz = 0; gz < grid - 1; gz++) for (let gx = 0; gx < grid; gx++) roads.push(['z', gx, gz]);
  roads.sort(() => Math.random() - .5);
  for (const r of roads) { if (made.length >= 5) break; tryRoad(...r); }
  return made;
}
