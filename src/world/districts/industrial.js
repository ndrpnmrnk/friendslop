import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { addPushable } from '../pushables.js';

// Промзона: лабиринт контейнеров, по их крышам — бег через мостики, нычки в открытых
// контейнерах, кирпичная стена склада и сарай ломаются, бочки катятся
export default {
  id: 'industrial', name: 'Промзона', ground: 'concrete',
  build(b) {
    const C = (x, z, w, d, c) => { const m = tmat(T.corrugated(c)); b.box(x, z, w, d, 2.6, m); b.m(G.box, col(0x2b2533), x, 2.62, z, w + 0.04, 0.04, d + 0.04); };
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
    C(5, 10, 7, 2.6, 0xc84a2a); C(16, 11, 2.6, 7, 0x6a4a8a); C(27, 12, 7, 2.6, 0x3a6a9a);
    b.plank(5, 5.3, 5, 8.7, 2.62, 1);
    b.crate(18, 9.5, 1.3); b.crate(23, 13.8, 1.2);
    open(2, 18, 7, 2.6, 'e', 0x8a4a2a); open(23, 24, 7, 2.6, 'w', 0x4a6a8a);
    C(12.5, 26, 2.6, 7, 0x6a4a8a);
    // склад: кирпичная стена (ломается) и сарай
    b.brickWall(26, 19, 9, 2.4, 'x');
    b.shed(9, 21, 4, 3.5);
    for (const [x, z] of [[11, 15.5], [20.5, 21], [5, 26], [29, 29]]) addPushable(b, 'barrel', x, z);
    b.fence(1, 31.2, 10, 31.2, 2, 'mesh');
    b.box(19, 30, 3, 1.4, 0.5, tmat(T.rust()));
    b.crate(17, 29.4, 1); b.crate(17.8, 30.4, 0.9);
    b.lamp(12, 1.2, 0); b.lamp(31, 8, -Math.PI / 2); b.lamp(1, 14, Math.PI / 2);
    b.zone('floor', 7, 13, 14.5, 17.5); b.zone('floor', 1, 22.5, 11, 31); b.zone('floor', 18.5, 13.5, 31, 18);
    b.spawn(10, 7.5); b.spawn(20, 16);
    b.hw(() => { b.pumpkin(5, 10, 0.4, 2.6); b.pumpkin(8.6, 13.5); });
  },
};
