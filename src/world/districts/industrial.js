import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { addPushable } from '../pushables.js';

// Промзона: лабиринт контейнеров, по их крышам — бег через мостики, нычки в открытых
// контейнерах, кирпичная стена склада и сарай ломаются, бочки катятся
export default {
  id: 'industrial', name: 'Промзона', ground: 'concrete',
  build(b) {
    const C = (x, z, w, d, c, y = 0) => {
      const m = tmat(T.corrugated(c)), door = tmat(T.containerEnd(c));
      b.box(x, z, w, d, 2.6, w > d ? [door, door, m, m, m, m] : [m, m, m, m, door, door], { y });
      b.m(G.box, col(0x2b2533), x, y + 2.63, z, w + 0.04, 0.05, d + 0.04);
      // рёбра-стойки по углам, запорные штанги на дверях, номер
      const dk = col(0x2b2533); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.m(G.box, dk, x + sx * (w / 2 - 0.02), y + 1.3, z + sz * (d / 2 - 0.02), 0.14, 2.6, 0.14);
      const long = w > d, ex = long ? w / 2 + 0.03 : 0, ez = long ? 0 : d / 2 + 0.03;
      for (const s2 of [-1, 1]) for (const k of [-0.25, 0.25]) b.m(G.box, col(0x8a8d98), x + s2 * ex + (long ? 0 : k * d), y + 1.3, z + s2 * ez + (long ? k * d : 0), long ? 0.04 : 0.05, 2.3, long ? 0.05 : 0.04);
      const num = b.m(G.box, tmat(T.sign('FSL ' + (100 + ((x * 7 + z * 13) | 0) % 900), '#2b2533', '#f1e8ff')), x + (long ? 0 : d / 2 + 0.02), y + 2.2, z + (long ? d / 2 + 0.02 : 0), long ? 1.4 : 0.01, 0.3, long ? 0.01 : 1.4);
    };
    const open = (x0, z0, w, d, openSide, c) => {
      const m = tmat(T.corrugated(c)), t = 0.15;
      b.box(x0 + w / 2, z0 + t / 2, w, t, 2.6, m); b.box(x0 + w / 2, z0 + d - t / 2, w, t, 2.6, m);
      if (openSide === 'e') b.box(x0 + t / 2, z0 + d / 2, t, d, 2.6, m); else b.box(x0 + w - t / 2, z0 + d / 2, t, d, 2.6, m);
      b.box(x0 + w / 2, z0 + d / 2, w, d, 0.12, m, { y: 2.5 });
      b.zone('nook', x0 + 0.4, z0 + 0.4, x0 + w - 0.4, z0 + d - 0.4);
    };
    // ряд контейнеров с мостиками по крышам
    C(5, 4, 7, 2.6, 0x3a6a9a); C(14, 4, 7, 2.6, 0xd8a030); C(23, 4, 7, 2.6, 0x4a7a4a);
    b.plank(8.5, 4, 10.5, 4, 2.62, 1); b.plank(17.5, 4, 19.5, 4, 2.62, 1);
    b.crate(2, 6.4, 1.3); b.crate(1.5, 7.8, 1.1);
    C(5, 10, 7, 2.6, 0xc84a2a);
    // ФИШКА: башня из контейнеров — лестница наверх, оттуда видно всю промзону
    C(5.6, 10, 5.8, 2.6, 0x3a6a9a, 2.65); b.ladder(8.5, 10, 'e', 2.65); b.ladder(8.5, 10.85, 'e', 5.25, 2.65);
    b.zone('roof', 3.2, 9.2, 8, 10.8, 5.25); b.item('brick', 4, 10, 5.25); C(16, 11, 2.6, 7, 0x6a4a8a); C(27, 12, 7, 2.6, 0x3a6a9a);
    b.plank(5, 5.3, 5, 8.7, 2.62, 1);
    b.crate(18, 9.5, 1.3); b.crate(23, 13.8, 1.2);
    open(2, 18, 7, 2.6, 'e', 0x8a4a2a); open(23, 24, 7, 2.6, 'w', 0x4a6a8a);
    C(12.5, 26, 2.6, 7, 0x6a4a8a);
    // склад: кирпичная стена (ломается) и сарай
    b.brickWall(26, 19, 9, 2.4, 'x');
    b.shed(9, 21, 4, 3.5);
    for (const [x, z] of [[11, 15.5], [20.5, 21], [9.5, 26], [29, 29]]) addPushable(b, 'barrel', x, z);
    b.fence(1, 31.2, 10, 31.2, 2, 'mesh');
    // Вместо бесформенного ржавого блока — склад труб на поддоне.
    b.pallet(19, 30, 3, 1.4);
    for (const z of [29.6, 30, 30.4]) b.m(G.cyl8, tmat(T.rust()), 19, 0.43, z, 0.2, 2.8, 0.2).rotation.z = Math.PI / 2;
    b.solid(19, 30, 3, 1.4, 0.18, 0.45);
    b.crate(17, 29.4, 1); b.crate(17.8, 30.4, 0.9);
    // погрузчик, поддоны, бочки у стены, мусор
    b.forklift(23, 29, Math.PI / 2); b.graffiti(26, 1.4, 19.24, 0, 3, 2); b.graffiti(14, 1.3, 2.68, Math.PI, 2.4, 3); b.puddle(10, 15, 1.2); b.puddle(20, 22, 0.9); b.pallet(27.5, 15.5); b.pallet(27.5, 15.5, 1.6, 1.2, 0.18); b.barrel(30.6, 21.5); b.barrel(30.6, 22.5); b.trashBags(2.2, 13.2, 3);
    // эстакада труб вдоль северного края, цистерна на опорах с лестницей
    for (let x = 14; x <= 30; x += 4) { b.m(G.box, col(0x3a3440), x, 1.6, 0.6, 0.14, 3.2, 0.14); b.solid(x, 0.6, 0.25, 0.25, 0, 3.2); b.m(G.box, col(0x3a3440), x, 3.2, 0.6, 0.12, 0.12, 0.9); }
    for (const [z, c] of [[0.4, 0x6a8a5a], [0.8, 0x8a4a2a]]) b.m(G.cyl8, col(c), 22, 3.36, z, 0.16, 16.4, 0.16).rotation.z = Math.PI / 2;
    { const tk = tmat(T.rust()); b.m(G.cyl12, tk, 6, 1.45, 28.6, 1.05, 4.6, 1.05).rotation.z = Math.PI / 2; for (const x of [4.2, 7.8]) { b.m(G.box, col(0x2b2533), x, 0.4, 28.6, 0.3, 0.8, 1.8); b.m(G.cyl12, col(0x2b2533), x, 1.45, 28.6, 1.08, 0.12, 1.08).rotation.z = Math.PI / 2; }
      b.solid(6, 28.6, 4.6, 2.0, 0, 2.5); b.m(G.cyl8, col(0x2b2533), 6, 2.55, 28.6, 0.25, 0.15, 0.25); b.ladder(6, 27.5, 'n', 2.5); b.zone('roof', 5, 28.2, 7.4, 29, 2.5); b.sign(6, 1.5, 27.53, Math.PI, 'НЕ КУРИТЬ', '#d8243a', '#f1e8ff', 1.4, 0.32); }
    b.lamp(12, 1.2, 0); b.lamp(31, 8, -Math.PI / 2); b.lamp(1, 14, Math.PI / 2);
    b.zone('floor', 7, 13, 14.5, 17.5); b.zone('floor', 1, 22.5, 11, 31); b.zone('floor', 18.5, 13.5, 31, 18);
    b.spawn(10, 7.5); b.spawn(20, 16);
    b.hw(() => { b.pumpkin(5, 10, 0.4, 2.6); b.pumpkin(8.6, 13.5); });
  },
};
