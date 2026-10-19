import { THREE, G, mesh, tmat, col, own, glow, lam } from '../core/gfx.js';
import { T, facade, rep } from '../core/textures.js';
import { rand, pick, shuffle } from '../core/rng.js';
import { CONFIG } from '../config.js';
import { W } from './state.js';
import { Builder } from './builder.js';
import { addSolid } from './physics.js';

/* Край карты — не обрыв и не невидимая стена, а логичный конец города.
   Каждая сторона случайно: стена домов, набережная с рекой или забор большой стройки.
   За ними — силуэт города с огнями окон. */
export function buildEdges(half) {
  const b = new Builder(0, 0, 0, 'Окраина'), base = CONFIG.base, L = half * 2;
  const sides = shuffle(['s', 'n', 'e', 'w']);
  const kinds = shuffle(['houses', 'river', 'site', pick(['houses', 'river', 'site'])]);
  // перевод «вдоль стороны u / наружу v» в мировые координаты
  const frame = side => ({
    P: (u, v) => side === 's' ? [u, half + v] : side === 'n' ? [u, -half - v] : side === 'e' ? [half + v, u] : [-half - v, u],
    S: (lu, lv) => side === 's' || side === 'n' ? [lu, lv] : [lv, lu],
    inFace: { s: 5, n: 4, e: 1, w: 0 }[side], rot: { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[side],
  });
  const box = (f, u, v, lu, lv, h, mats, y = 0, solid = true) => {
    const [x, z] = f.P(u, v), [w, d] = f.S(lu, lv);
    mesh(G.box, mats, x, y + h / 2, z, w, h, d, W.group);
    if (solid) addSolid(x - w / 2, z - d / 2, x + w / 2, z + d / 2, y, y + h);
  };
  const pave = tmat(rep(T.pave(), 3, 3)), curb = tmat(T.concrete());
  sides.forEach((side, i) => {
    const f = frame(side), kind = kinds[i];
    // тротуар вдоль края
    const sl = side === 'e' || side === 'w' ? L + 7 : L; // без перекрытия на углах
    box(f, 0, 1.75, sl, 3.5, base, [curb, curb, tmat(rep(T.pave(), sl / 3, 1)), curb, curb, curb]);
    for (let u = -half + 8; u < half - 4; u += 14) { const [x, z] = f.P(u, 2.6); b.lamp(x, z, f.rot + Math.PI); }
    if (kind === 'houses') {
      let u = -half - 3.5;
      while (u < half + 3.5) {
        const w = Math.min(6 + rand() * 7, half + 3.5 - u), h = 7 + Math.floor(rand() * 4) * 2.4, c = pick([0x7c6a9c, 0x9c6a6a, 0x6a8a9c, 0x8a7c6a, 0x6a6a8a]);
        if (rand() < 0.15 && w > 4) {
          // переулок, перекрытый воротами
          box(f, u + w / 2, 4.2, w, 0.2, 2.8, tmat(T.corrugated(0x4a5a6a)), base);
          box(f, u + w / 2, 9, w, 9, 12, col(0x231b30), 0);
        } else {
          const mats = Array(6).fill(own({ color: c })); mats[f.inFace] = own({ map: facade(c, w, h, { lit: 0.5 }) }); mats[2] = tmat(T.roof());
          box(f, u + w / 2, 3.5 + 4, w, 8, h, mats, base);
        }
        u += w;
      }
    } else if (kind === 'river') {
      // гранитный парапет + перила, за ним тёмная вода и огни другого берега
      box(f, 0, 3.75, L + 7, 0.5, 1.0, tmat(T.stone()), base);
      const [rx, rz] = f.P(0, 3.75), along = side === 's' || side === 'n';
      new Builder(0, 0, base + 1.0, 'Набережная').fence(along ? -half - 3.5 : rx, along ? rz : -half - 3.5, along ? half + 3.5 : rx, along ? rz : half + 3.5, 1.1, 'iron');
      W.solids[W.solids.length - 1].y0 = 0; W.solids[W.solids.length - 1].y1 = 2.6;
      const [wx, wz] = f.P(0, 34), [ww, wd] = f.S(L + 120, 60);
      const water = mesh(G.box, lam({ map: rep(T.water(), 20, 10), color: 0x6a7aa8 }), wx, -1.2, wz, ww, 0.2, wd, W.group);
      for (let u = -half - 30; u < half + 30; u += 6 + rand() * 8) { const h = 10 + rand() * 22, w = 5 + rand() * 6, c = pick([0x3a3050, 0x2a2440]);
        const mats = Array(6).fill(own({ color: c })); mats[f.inFace] = own({ map: facade(c, w, h, { lit: 0.35, brick: false }) });
        box(f, u, 66 + rand() * 6, w, 6, h, mats, -1, false); }
    } else {
      // забор большой стройки с плакатами, за ним каркасы и краны
      { const [gx, gz] = f.P(0, 24), [gw, gd] = f.S(L + 60, 40); const gm = mesh(G.box, tmat(rep(T.dirt(), (L + 60) / 4, 10)), gx, -0.05, gz, gw, 0.1, gd, W.group); }
      box(f, 0, 3.8, L + 7, 0.2, 2.8, tmat(rep(T.corrugated(0x6a7a5a), (L + 7) / 4, 1)), base);
      for (let u = -half + 6; u < half - 6; u += 9) { const [x, z] = f.P(u, 3.68), [w, d] = f.S(3, 0.02);
        const p = mesh(G.box, tmat(T.sign(pick(['ЖК «ТЫКВА»', 'СТРОЙКА', 'ВХОД ЗАПРЕЩЁН', 'СДАЧА 2027']), pick(['#d8243a', '#2a1f3d', '#f5c542']), '#f1e8ff')), x, base + 1.6, z, w || 0.02, 0.8, d || 0.02, W.group); }
      box(f, 0, 4.0, L + 7, 0.15, 0.3, tmat(T.hazard()), base + 2.8, false);
      const cc = tmat(T.concrete());
      for (let u = -half + 10; u < half; u += 22) {
        for (const du of [-4, 4]) for (const dv of [10, 18]) box(f, u + du, dv, 0.6, 0.6, 14, cc, 0, false);
        for (const y of [4.5, 9, 13.5]) box(f, u, 14, 9, 9, 0.35, cc, y, false);
      }
      const yel = col(0xe0b02a);
      for (const u of [-half * 0.4, half * 0.5]) { box(f, u, 26, 1, 1, 24, yel, 0, false); box(f, u + 6, 26, 16, 0.7, 0.7, yel, 24, false); }
    }
  });
  // углы: высокие дома, чтобы не было щелей
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * (half + 7.5), z = sz * (half + 7.5), c = 0x5a4a6a;
    mesh(G.box, own({ map: facade(c, 9, 14, { lit: 0.4 }) }), x, 7, z, 9, 14, 9, W.group);
    addSolid(x - 4.5, z - 4.5, x + 4.5, z + 4.5, 0, 14);
  }
}
