import { THREE, G, mesh, tmat, col, glow, flat, alphaMat } from '../core/gfx.js';
import { T, rep } from '../core/textures.js';
import { rand, shuffle } from '../core/rng.js';
import { CONFIG } from '../config.js';
import { W } from './state.js';
import { addSolid, addZone } from './physics.js';
import { Builder } from './builder.js';

/* Дороги и тоннели под ними.
   Дорога — набор плит толщиной 1 м (сверху асфальт, снизу потолок тоннеля).
   Под каждой дорогой идёт тоннель шириной 3 м (пол на −4 м), на перекрёстках тоннели соединяются.
   В части дорог открыты люки с лестницей вниз. Районы могут прорезать вход в стену тоннеля (коллектор). */
export const UG = { floor: -4, ceil: -1, inner: 3, wall: 0.4 };

export function buildRoadsAndTunnels(half) {
  const { grid, chunk, road } = CONFIG, c = i => -half + road / 2 + i * (chunk + road);
  const asphalt = T.asphalt(), dk = col(0x1d1824), brick = tmat(T.brickWall()), conc = tmat(T.concrete());
  const roadBox = (x0, z0, x1, z1) => {
    if (x1 - x0 < 0.01 || z1 - z0 < 0.01) return;
    const w = x1 - x0, d = z1 - z0, top = flat(rep(asphalt, w / 3, d / 3));
    mesh(G.box, [dk, dk, top, conc, dk, dk], (x0 + x1) / 2, -0.5, (z0 + z1) / 2, w, 1, d, W.group);
    addSolid(x0, z0, x1, z1, -1, 0);
  };
  // сегменты дорог между перекрёстками; часть с люком
  const segs = [];
  for (let i = 0; i <= grid; i++) for (let j = 0; j < grid; j++) {
    segs.push({ axis: 'x', c: c(i), a: c(j) + road / 2, b: c(j + 1) - road / 2 });   // вдоль X на z = c(i)
    segs.push({ axis: 'z', c: c(i), a: c(j) + road / 2, b: c(j + 1) - road / 2 });   // вдоль Z на x = c(i)
  }
  const manholes = new Set(shuffle(segs.slice()).slice(0, 10));
  const H = 0.6;
  for (const s of segs) {
    const P = (u, v) => s.axis === 'x' ? [u, v] : [v, u]; // u — вдоль, v — поперёк
    const R = (u0, v0, u1, v1) => { const [x0, z0] = P(u0, v0), [x1, z1] = P(u1, v1); roadBox(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)); };
    const v0 = s.c - road / 2, v1 = s.c + road / 2;
    if (manholes.has(s)) {
      const m = (s.a + s.b) / 2 + 6, hv = s.c + 0.85; // люк над тоннелем, сбоку от разметки
      R(s.a, v0, m - H, v1); R(m + H, v0, s.b, v1); R(m - H, v0, m + H, hv - H); R(m - H, hv + H, m + H, v1);
      const [hx, hz] = P(m, hv);
      W.holes.push({ x0: hx - H, z0: hz - H, x1: hx + H, z1: hz + H });
      manhole(hx, hz, s.axis);
    } else R(s.a, v0, s.b, v1);
    tunnelSegment(s, P, brick, conc);
  }
  // перекрёстки
  for (let i = 0; i <= grid; i++) for (let j = 0; j <= grid; j++) {
    const x = c(i), z = c(j);
    roadBox(x - road / 2, z - road / 2, x + road / 2, z + road / 2);
    tunnelNode(x, z, i === 0, i === grid, j === 0, j === grid, brick, conc);
  }
}

function lampAt(x, y, z) {
  mesh(G.box, glow(0xffc070), x, y, z, 0.26, 0.12, 0.26, W.group);
  const d = col(0x2b2533); for (const [dx, dz, w, dd] of [[0, 0.15, 0.32, 0.03], [0, -0.15, 0.32, 0.03], [0.15, 0, 0.03, 0.32], [-0.15, 0, 0.03, 0.32]]) mesh(G.box, d, x + dx, y, z + dz, w, 0.16, dd, W.group);
}
function floorPiece(x0, z0, x1, z1, conc) {
  mesh(G.box, conc, (x0 + x1) / 2, UG.floor - 0.15, (z0 + z1) / 2, x1 - x0, 0.3, z1 - z0, W.group);
  addSolid(x0, z0, x1, z1, UG.floor - 0.3, UG.floor);
}
function wallPiece(x0, z0, x1, z1, mat) {
  if (x1 - x0 < 0.01 || z1 - z0 < 0.01) return;
  mesh(G.box, mat, (x0 + x1) / 2, (UG.floor + UG.ceil) / 2, (z0 + z1) / 2, x1 - x0, UG.ceil - UG.floor, z1 - z0, W.group);
  addSolid(x0, z0, x1, z1, UG.floor, UG.ceil);
}
// типы участков: старый кирпич, технический (плитка, кабели, мостки), затопленный
const KINDS = ['brick', 'tech', 'tech', 'flooded', 'brick'];
function tunnelSegment(s, P, brick, conc) {
  const kind = KINDS[(rand() * KINDS.length) | 0];
  const wallMat = kind === 'tech' ? tmat(T.tunnelTile()) : tmat(T.oldBrick());
  const half = UG.inner / 2, t = UG.wall, a = s.a - 1.5 + half + t, b = s.b + 1.5 - half - t; // от края узла до края узла
  const A = s.a - (3 - UG.inner) / 2, B = s.b + (3 - UG.inner) / 2;
  const box = (u0, v0, u1, v1, fn) => { const [x0, z0] = P(u0, v0), [x1, z1] = P(u1, v1); fn(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)); };
  const u0 = s.a - 1.5 + 1.5, u1 = s.b + 1.5 - 1.5; // сегмент от узла до узла
  const ua = s.a - (6 - UG.inner) / 2 + 0.0, ub = s.b + (6 - UG.inner) / 2;
  box(ua, s.c - half, ub, s.c + half, (x0, z0, x1, z1) => { floorPiece(x0, z0, x1, z1, conc); W.floodRects.push([x0, z0, x1, z1]); });
  // стены с обеих сторон, с проёмами для входов из районов
  for (const side of [-1, 1]) {
    const v = s.c + side * (half + t / 2);
    const ops = W.tunnelOpenings.filter(o => o.axis === s.axis && Math.abs(o.at - v) < 1).map(o => [o.from, o.to]).sort((p, q) => p[0] - q[0]);
    let cur = ua;
    // ниша-кладовка в одной из стен (случайно): там ящики и нычка для миссий
    const alcove = side === 1 && !ops.length && rand() < 0.35 ? (s.a + s.b) / 2 + (rand() - 0.5) * 8 : null;
    if (alcove !== null) ops.push([alcove - 1.3, alcove + 1.3]);
    for (const [f, tt] of ops) { box(cur, v - t / 2, f, v + t / 2, (x0, z0, x1, z1) => wallPiece(x0, z0, x1, z1, wallMat)); cur = tt; }
    box(cur, v - t / 2, ub, v + t / 2, (x0, z0, x1, z1) => wallPiece(x0, z0, x1, z1, wallMat));
    if (alcove !== null) {
      const vb = v + t / 2, vf = vb + 2.6;
      box(alcove - 1.3, vb, alcove + 1.3, vf, (x0, z0, x1, z1) => floorPiece(x0, z0, x1, z1, conc));
      box(alcove - 1.3 - t, vb, alcove - 1.3, vf + t, (x0, z0, x1, z1) => wallPiece(x0, z0, x1, z1, wallMat));
      box(alcove + 1.3, vb, alcove + 1.3 + t, vf + t, (x0, z0, x1, z1) => wallPiece(x0, z0, x1, z1, wallMat));
      box(alcove - 1.3, vf, alcove + 1.3, vf + t, (x0, z0, x1, z1) => wallPiece(x0, z0, x1, z1, wallMat));
      box(alcove - 1.3 - t, vb, alcove + 1.3 + t, vf + t, (x0, z0, x1, z1) => { mesh(G.box, conc, (x0 + x1) / 2, UG.ceil + 0.1, (z0 + z1) / 2, x1 - x0, 0.2, z1 - z0, W.group); addSolid(x0, z0, x1, z1, UG.ceil, UG.ceil + 0.2); });
      const [ax, az] = P(alcove, vb + 1.3), b = new Builder(0, 0, UG.floor, 'Тоннели');
      b.crate(ax + (s.axis === 'x' ? -0.7 : 0.6), az + (s.axis === 'x' ? 0.6 : -0.7), 0.9); b.barrel(ax + (s.axis === 'x' ? 0.8 : 0.5), az + (s.axis === 'x' ? 0.5 : 0.8));
      b.item(rand() < 0.5 ? 'brick' : 'trash', ax, az); lampAt(ax, UG.ceil - 0.2, az); b.light(ax, az, 1.4, 0, true);
      const [n0x, n0z] = P(alcove - 1, vb + 0.4), [n1x, n1z] = P(alcove + 1, vf - 0.4);
      W.missionZones.push({ type: 'nook', x0: Math.min(n0x, n1x), z0: Math.min(n0z, n1z), x1: Math.max(n0x, n1x), z1: Math.max(n0z, n1z), y: UG.floor, district: 'Тоннели под дорогой' });
    }
  }
  const tb = new Builder(0, 0, UG.floor, 'Тоннели');
  // пол: вода по центру (в затопленном — по всей ширине, там идёшь медленнее)
  if (kind === 'flooded') box(ua, s.c - half, ub, s.c + half, (x0, z0, x1, z1) => tb.waterRect(x0, z0, x1, z1, 0.08, false));
  else box(ua, s.c - 0.4, ub, s.c + 0.4, (x0, z0, x1, z1) => { mesh(G.box, tmat(T.water()), (x0 + x1) / 2, UG.floor + 0.01, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, W.group); });
  // технический: мостки по бокам, кабели под потолком, щитки
  if (kind === 'tech') for (const sd of [-1, 1]) {
    box(ua, s.c + sd * (half - 0.55), ub, s.c + sd * half, (x0, z0, x1, z1) => { mesh(G.box, tmat(T.metal()), (x0 + x1) / 2, UG.floor + 0.12, (z0 + z1) / 2, x1 - x0, 0.24, z1 - z0, W.group); addSolid(x0, z0, x1, z1, UG.floor, UG.floor + 0.24); });
    box(ua, s.c + sd * (half - 0.12), ub, s.c + sd * (half - 0.02), (x0, z0, x1, z1) => { for (const [y, cc] of [[-1.35, 0x1a1a1a], [-1.5, 0x8a2a2a], [-1.65, 0x2a2a6a]]) mesh(G.box, col(cc), (x0 + x1) / 2, y, (z0 + z1) / 2, x1 - x0, 0.06, z1 - z0, W.group); });
  }
  // трубы вдоль стены с хомутами
  const ps = rand() < 0.5 ? -1 : 1;
  box(ua, s.c + ps * (half - 0.25), ub, s.c + ps * (half - 0.25), (x0, z0, x1, z1) => {
    const len = Math.max(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, alongX = x1 - x0 > z1 - z0;
    for (const [y, r, m] of [[-2.0, 0.16, tmat(T.rust())], [-2.45, 0.1, tmat(T.metal())]]) { const pp = mesh(G.cyl8, m, cx, y, cz, r, len, r, W.group); pp.rotation[alongX ? 'z' : 'x'] = Math.PI / 2; }
    for (let k = -len / 2 + 1; k < len / 2; k += 2.5) mesh(G.box, col(0x2b2533), cx + (alongX ? k : 0), -2.2, cz + (alongX ? 0 : k), alongX ? 0.08 : 0.4, 0.6, alongX ? 0.4 : 0.08, W.group);
  });
  // лампы в решётчатых плафонах + пятна света, решётки в полу, предметы
  for (let u = ua + 4; u < ub - 2; u += 8) { const [x, z] = P(u, s.c + half - 0.1); lampAt(x, UG.ceil - 0.25, z); const [lx, lz] = P(u, s.c); tb.light(lx, lz, 1.8, 0.02, true); }
  for (let u = ua + 6; u < ub - 4; u += 11) { const [x, z] = P(u, s.c); const gr = mesh(G.plane, tmat(T.grate()), x, UG.floor + 0.035, z, 0.8, 0.8, 1, W.group); gr.rotation.x = -Math.PI / 2; }
  if (rand() < 0.45) { const [x, z] = P(ua + 3 + rand() * (ub - ua - 6), s.c + (rand() - 0.5) * 1.6); if (rand() < 0.5) tb.ride('barrel', x, z); else tb.crate(x, z, 0.9); }
  if (rand() < 0.2) { const [x, z] = P(ua + 4 + rand() * (ub - ua - 8), s.c); tb.item(rand() < 0.5 ? 'trash' : 'cone', x, z); }
  const [zx0, zz0] = P(ua + 2, s.c - half + 0.3), [zx1, zz1] = P(ub - 2, s.c + half - 0.3);
  W.missionZones.push({ type: 'tunnel', x0: Math.min(zx0, zx1), z0: Math.min(zz0, zz1), x1: Math.max(zx0, zx1), z1: Math.max(zz0, zz1), y: UG.floor, district: 'Тоннели под дорогой' });
}
function tunnelNode(x, z, w0, w1, n0, n1, brick, conc) {
  const half = UG.inner / 2, t = UG.wall, e = 1.5; // узел 3×3 + стены
  floorPiece(x - e, z - e, x + e, z + e, conc); W.floodRects.push([x - e, z - e, x + e, z + e]);
  // глухие стены на краях сетки
  if (w0) wallPiece(x - e - t, z - e - t, x - e, z + e + t, brick);
  if (w1) wallPiece(x + e, z - e - t, x + e + t, z + e + t, brick);
  if (n0) wallPiece(x - e - t, z - e - t, x + e + t, z - e, brick);
  if (n1) wallPiece(x - e - t, z + e, x + e + t, z + e + t, brick);
  // столбы по углам
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) wallPiece(x + sx * e + (sx < 0 ? -t : 0), z + sz * e + (sz < 0 ? -t : 0), x + sx * e + (sx < 0 ? 0 : t), z + sz * e + (sz < 0 ? 0 : t), brick);
  lampAt(x, UG.ceil - 0.25, z);
}
function manhole(x, z, axis) {
  W.manholes.push({ x, z });
  // люк: рамка, сдвинутая крышка, лестница вниз
  const iron = col(0x2b2533);
  for (const [dx, dz, w, d] of [[0, -0.65, 1.4, 0.1], [0, 0.65, 1.4, 0.1], [-0.65, 0, 0.1, 1.4], [0.65, 0, 0.1, 1.4]]) mesh(G.box, iron, x + dx, 0.02, z + dz, w, 0.04, d, W.group);
  const lid = mesh(G.cyl12, tmat(T.metal()), x + 1.2, 0.03, z + 0.4, 0.55, 0.05, 0.55, W.group);
  const b = new Builder(0, 0, 0, 'Тоннели');
  b.ladder(x, z - 0.6, 's', 0.05, UG.floor);
  // столб света из люка вниз
  const shaft = mesh(G.cone8, alphaMat(T.light(), { blending: THREE.AdditiveBlending, opacity: 0.35, side: THREE.DoubleSide }), x, -2.4, z, 1.0, 3.0, 1.0, W.group); shaft.rotation.x = 0;
  b.light(x, z, 1.4, 0.03, false);
}
