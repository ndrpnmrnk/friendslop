import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { HW } from '../../config.js';

// Торговая улица: магазины с интерьерами и витринами (бьются), по крышам — через мостики,
// тележки (можно толкать или запрыгнуть и кататься), стеклянная остановка
export default {
  id: 'shops', name: 'Торговая улица', ground: 'pave',
  build(b) {
    const shops = [
      { x: 1, wall: 0x9c7a5a, sign: ['ХЛЕБ', '#f1e8ff', '#3a2458'], aw: ['#f1e8ff', '#d8243a'], kind: 'bakery', up: 4.2, gaps: [{ side: 'e', at: 0.5 }] },
      { x: 11.5, wall: 0x6a7c9c, sign: ['КАФЕ', '#2a1f3d', '#ff8a1f'], aw: ['#ff8a1f', '#2a1f3d'], kind: 'cafe', up: 4.2, gaps: [{ side: 'w', at: 0.5 }, { side: 'e', at: 0.5 }] },
      { x: 22, wall: 0x8a6a8c, sign: [HW ? 'ТЫКВЫ' : '24/7', '#ff8a1f', '#17111f'], aw: ['#7b4bc4', '#f5c542'], kind: 'mart', up: 4.2, gaps: [{ side: 'w', at: 0.5 }] },
    ];
    for (const s of shops) {
      b.house({ x: s.x, z: 1, w: 9, d: 7, h: 3.4, upper: s.up, wall: s.wall, lit: 0.7, door: { side: 's', at: 0.5 }, sign: s.sign, awning: s.aw, floor: T.floorTile(),
        roof: true, gaps: s.gaps, ladder: s.kind === 'bakery' ? { side: 'w', at: 0.3 } : null,
        interior(b, r) {
          if (s.kind === 'bakery') { b.box(r.x0 + 2.6, r.z0 + 3, 3.4, 0.9, 1.0, tmat(T.wood())); b.shelf(r.x0 + 4.2, r.z0 + 0.3, 7, 0); }
          if (s.kind === 'cafe') { b.table(r.x0 + 1.8, r.z1 - 1.8, 0.8); b.chair(r.x0 + 1.8, r.z1 - 0.9, Math.PI); b.table(r.x1 - 1.8, r.z1 - 1.8, 0.8);
            b.box(r.x0 + 4.2, r.z0 + 0.6, 5, 1, 1.05, tmat(T.wood())); b.box(r.x0 + 5.5, r.z0 + 0.6, 0.5, 0.5, 0.6, col(0x3a3a40), { y: 1.05 });
            b.ride('chair', r.x1 - 1.8, r.z1 - 0.8, Math.PI); }
          if (s.kind === 'mart') { b.shelf(r.x0 + 2, r.z0 + 3, 3, Math.PI / 2); b.shelf(r.x1 - 2, r.z0 + 3, 3, Math.PI / 2);
            b.cabinet(r.x0 + 4.2, r.z0 + 0.35, 2.6, 0.6, 2, 0xd8d8e0); }
        } });
      for (const dx of [1.9, 7.1]) b.vitrine(s.x + dx, 8.16, 2.6, 1.7, 'x', 0.5);
    }
    b.plank(10, 4.5, 11.5, 4.5, 7.6, 1.1); b.plank(20.5, 4.5, 22, 4.5, 7.6, 1.1);
    // рекламный щит на крыше и кондиционеры
    for (const x of [24, 30]) b.box(x, 2, 0.15, 0.15, 2.5, col(0x2b2533), { y: 7.6 });
    b.m(G.box, tmat(T.sign('ТЫКВЕННЫЙ ЛАТТЕ', '#ff8a1f', '#2a1f3d')), 27, 9.6, 2, 6.4, 1.6, 0.12);
    for (const x of [4, 15]) b.aircon(x, 2.5, 7.6);
    b.ride('cart', 8, 14); b.ride('cart', 24, 15, 0.6);
    b.box(10.75, 9.3, 0.8, 0.6, 1.8, col(0x3a4a6a)); b.m(G.box, tmat(T.screen()), 10.75, 1.3, 9.61, 0.5, 0.35, 0.02); b.sign(10.75, 1.65, 9.61, 0, 'ATM', '#3a4a6a', '#9be36b', 0.6, 0.16);
    // остановка
    const mt = col(0x3a4a6a);
    for (const x of [13.2, 18.8]) b.box(x, 27, 0.15, 0.15, 2.6, mt);
    b.box(16, 27.6, 6, 1.6, 0.12, mt, { y: 2.6 });
    b.vitrine(16, 26.9, 5.4, 1.9, 'x', 0.45); b.bench(16, 27.8, Math.PI);
    b.bin(5, 10); b.bin(27, 10); b.hydrant(16, 10);
    b.crate(30.6, 12, 1); b.crate(30.6, 13.1, 1); b.crate(30.6, 12.5, 0.9, 1);
    // Проход между магазинами и остановкой свободен; ящики остаются у разгрузки.
    for (const x of [3, 9, 23, 29]) { b.box(x, 18.5, 2.2, 1.2, 0.45, tmat(T.stone())); b.m(G.ico, tmat(T.bush()), x, 0.75, 18.5, 0.9, 0.4, 0.5); }
    b.bench(6, 22, Math.PI); b.bench(26, 22, Math.PI);
    b.lamp(1, 18, Math.PI / 2); b.lamp(31, 18, -Math.PI / 2);
    b.tree(3, 29.5); b.tree(29, 29.5);
    b.zone('floor', 1, 10.5, 31, 31);
    b.spawn(16, 16); b.spawn(5, 18);
    b.hw(() => { b.pumpkin(4.2, 9.2); b.pumpkin(27.8, 9.2); b.stringLights(1.5, 8.9, 30.5, 8.9, 3.4); });
  },
};
