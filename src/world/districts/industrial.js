import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { addPushable } from '../pushables.js';

// Промзона: лабиринт контейнеров с нычками, бочки катятся от толчка
export default {
  id: 'industrial', name: 'Промзона', ground: 'concrete',
  build(b) {
    const C = (x, z, w, d, c) => { const m = tmat(T.corrugated(c)); b.box(x, z, w, d, 2.6, m); b.m(G.box, col(0x2b2533), x, 2.62, z, w + 0.04, 0.04, d + 0.04); };
    // открытый контейнер: торец открыт, внутри нычка
    const open = (x0, z0, w, d, openSide, c) => {
      const m = tmat(T.corrugated(c)), t = 0.15;
      b.box(x0 + w / 2, z0 + t / 2, w, t, 2.6, m); b.box(x0 + w / 2, z0 + d - t / 2, w, t, 2.6, m);
      if (openSide === 'e') b.box(x0 + t / 2, z0 + d / 2, t, d, 2.6, m); else b.box(x0 + w - t / 2, z0 + d / 2, t, d, 2.6, m);
      b.box(x0 + w / 2, z0 + d / 2, w, d, 0.12, m, { y: 2.5 });
      b.zone('nook', x0 + 0.4, z0 + 0.4, x0 + w - 0.4, z0 + d - 0.4);
    };
    C(4, 3.2, 6, 2.5, 0x3a6a9a); C(4, 7.3, 6, 2.5, 0xc84a2a); C(11.3, 4, 2.5, 6, 0x4a7a4a);
    C(18, 3.2, 6, 2.5, 0xd8a030); C(18, 10.3, 6, 2.5, 0x6a4a8a); C(14.3, 18, 2.5, 6, 0x3a6a9a);
    open(2.5, 14, 6.5, 2.6, 'e', 0x8a4a2a); open(16.5, 18, 6.5, 2.6, 'w', 0x4a6a8a);
    // ящики-ступеньки, чтобы залезть на контейнеры
    b.crate(7.6, 9.6, 1.3); b.crate(14.6, 10.4, 1.3); b.crate(15.6, 15.2, 1.2);
    b.crate(10.5, 13.5, 1); b.crate(21.5, 15, 1); b.crate(21.5, 15, 0.9, 1);
    for (const [x, z] of [[11.5, 12], [8, 19.6], [19, 15], [4, 21]]) addPushable(b, 'barrel', x, z);
    b.fence(1, 23, 11, 23, 2, 'mesh');
    b.box(20.5, 22, 3, 1.4, 0.5, tmat(T.rust()));
    b.lamp(9, 1.2, 0); b.lamp(23, 7.5, -Math.PI / 2); b.lamp(1, 11, Math.PI / 2);
    b.zone('floor', 5, 10.5, 13, 13); b.zone('floor', 1, 17.3, 13, 22.5);
    b.spawn(12, 9.5); b.spawn(12.3, 15.8);
    b.hw(() => { b.pumpkin(4, 7.3, 0.4, 2.6); b.pumpkin(8.5, 15.4, 0.35); b.web(2.7, 2.2, 14.18, 0, 1); });
  },
};
