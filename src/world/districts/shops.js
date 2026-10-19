import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { HW } from '../../config.js';
import { addPushable } from '../pushables.js';

// Торговая улица: магазины с дверями и интерьерами, тележки можно толкать
export default {
  id: 'shops', name: 'Торговая улица', ground: 'pave',
  build(b) {
    const shops = [
      { x: 1, wall: 0x9c7a5a, sign: ['ХЛЕБ', '#f1e8ff', '#3a2458'], aw: ['#f1e8ff', '#d8243a'], kind: 'bakery' },
      { x: 8.5, wall: 0x6a7c9c, sign: ['КАФЕ', '#2a1f3d', '#ff8a1f'], aw: ['#ff8a1f', '#2a1f3d'], kind: 'cafe' },
      { x: 16, wall: 0x8a6a8c, sign: [HW ? 'ТЫКВЫ' : '24/7', '#ff8a1f', '#17111f'], aw: ['#7b4bc4', '#f5c542'], kind: 'mart' },
    ];
    for (const s of shops) {
      b.house({ x: s.x, z: 1, w: 7, d: 6, h: 3.4, upper: 1.8, wall: s.wall, lit: 0.7, door: { side: 's', at: 0.5 }, sign: s.sign, awning: s.aw, floor: T.floorTile(),
        interior(b, r) {
          if (s.kind === 'bakery') { b.box(r.x0 + 2.2, r.z0 + 2.4, 3.2, 0.9, 1.0, tmat(T.wood())); b.shelf(r.x0 + 3.2, r.z0 + 0.3, 5.5, 0); }
          if (s.kind === 'cafe') { b.table(r.x0 + 1.6, r.z1 - 1.6, 0.8); b.chair(r.x0 + 1.6, r.z1 - 0.8, Math.PI); b.table(r.x1 - 1.6, r.z1 - 1.6, 0.8); b.chair(r.x1 - 1.6, r.z1 - 0.8, Math.PI);
            b.box(r.x0 + 3.2, r.z0 + 0.6, 4.5, 1, 1.05, tmat(T.wood())); b.box(r.x0 + 4.5, r.z0 + 0.6, 0.5, 0.5, 0.6, col(0x3a3a40), { y: 1.05 }); }
          if (s.kind === 'mart') { b.shelf(r.x0 + 1.6, r.z0 + 2.6, 2.4, Math.PI / 2); b.shelf(r.x1 - 1.6, r.z0 + 2.6, 2.4, Math.PI / 2);
            b.box(r.x0 + 3.2, r.z0 + 0.35, 2.4, 0.6, 2, col(0xd8d8e0)); b.m(G.box, glow(0x9fd8ff), r.x0 + 3.2, 1.2, r.z0 + 0.67, 2.2, 1.4, 0.02); }
        } });
    }
    addPushable(b, 'cart', 6, 12); addPushable(b, 'cart', 15, 13.5);
    b.box(8.25, 9.3, 0.8, 0.6, 1.8, col(0x3a4a6a)); b.m(G.box, tmat(T.screen()), 8.25, 1.3, 9.61, 0.5, 0.35, 0.02); b.sign(8.25, 1.65, 9.61, 0, 'ATM', '#3a4a6a', '#9be36b', 0.6, 0.16);
    b.bin(4, 9.2); b.bin(20, 9.2); b.hydrant(12, 9.8);
    b.bench(6, 20, Math.PI); b.bench(18, 20, Math.PI);
    b.lamp(1, 16, Math.PI / 2); b.lamp(23, 16, -Math.PI / 2);
    b.tree(3, 22.5); b.tree(21, 22.5);
    b.zone('floor', 1, 9.5, 23, 23);
    b.spawn(12, 15); b.spawn(4, 14);
    b.hw(() => { b.pumpkin(3.6, 8.0, 0.4); b.pumpkin(11.3, 8.0, 0.4); b.pumpkin(18.8, 8.0, 0.45); b.stringLights(1.5, 7.9, 22.5, 7.9, 3.4); });
  },
};
