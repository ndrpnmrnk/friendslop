import { THREE, G, mesh, tmat, col, glow, flat } from '../core/gfx.js';
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
  mesh(G.box, glow(0xffc070), x, y, z, 0.3, 0.12, 0.3, W.group);
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
function tunnelSegment(s, P, brick, conc) {
  const half = UG.inner / 2, t = UG.wall, a = s.a - 1.5 + half + t, b = s.b + 1.5 - half - t; // от края узла до края узла
  const A = s.a - (3 - UG.inner) / 2, B = s.b + (3 - UG.inner) / 2;
  const box = (u0, v0, u1, v1, fn) => { const [x0, z0] = P(u0, v0), [x1, z1] = P(u1, v1); fn(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)); };
  const u0 = s.a - 1.5 + 1.5, u1 = s.b + 1.5 - 1.5; // сегмент от узла до узла
  const ua = s.a - (6 - UG.inner) / 2 + 0.0, ub = s.b + (6 - UG.inner) / 2;
  box(ua, s.c - half, ub, s.c + half, (x0, z0, x1, z1) => floorPiece(x0, z0, x1, z1, conc));
  // стены с обеих сторон, с проёмами для входов из районов
  for (const side of [-1, 1]) {
    const v = s.c + side * (half + t / 2);
    const ops = W.tunnelOpenings.filter(o => o.axis === s.axis && Math.abs(o.at - v) < 1).map(o => [o.from, o.to]).sort((p, q) => p[0] - q[0]);
    let cur = ua;
    for (const [f, tt] of ops) { box(cur, v - t / 2, f, v + t / 2, (x0, z0, x1, z1) => wallPiece(x0, z0, x1, z1, brick)); cur = tt; }
    box(cur, v - t / 2, ub, v + t / 2, (x0, z0, x1, z1) => wallPiece(x0, z0, x1, z1, brick));
  }
  // вода по центру, лампы
  box(ua, s.c - 0.4, ub, s.c + 0.4, (x0, z0, x1, z1) => { const m = mesh(G.box, tmat(T.water()), (x0 + x1) / 2, UG.floor + 0.01, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, W.group); });
  for (let u = ua + 4; u < ub - 2; u += 8) { const [x, z] = P(u, s.c + half - 0.1); lampAt(x, UG.ceil - 0.25, z); }
  const [zx0, zz0] = P(ua + 2, s.c - half + 0.3), [zx1, zz1] = P(ub - 2, s.c + half - 0.3);
  W.missionZones.push({ type: 'tunnel', x0: Math.min(zx0, zx1), z0: Math.min(zz0, zz1), x1: Math.max(zx0, zx1), z1: Math.max(zz0, zz1), y: UG.floor, district: 'Тоннели под дорогой' });
}
function tunnelNode(x, z, w0, w1, n0, n1, brick, conc) {
  const half = UG.inner / 2, t = UG.wall, e = 1.5; // узел 3×3 + стены
  floorPiece(x - e, z - e, x + e, z + e, conc);
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
  // люк: рамка, сдвинутая крышка, лестница вниз
  const iron = col(0x2b2533);
  for (const [dx, dz, w, d] of [[0, -0.65, 1.4, 0.1], [0, 0.65, 1.4, 0.1], [-0.65, 0, 0.1, 1.4], [0.65, 0, 0.1, 1.4]]) mesh(G.box, iron, x + dx, 0.02, z + dz, w, 0.04, d, W.group);
  const lid = mesh(G.cyl12, tmat(T.metal()), x + 1.2, 0.03, z + 0.4, 0.55, 0.05, 0.55, W.group);
  const b = new Builder(0, 0, 0, 'Тоннели');
  b.ladder(x, z - 0.6, 's', 0.05, UG.floor);
  mesh(G.box, glow(0xffc070), x, -0.95, z, 0.2, 0.06, 0.2, W.group);
}
