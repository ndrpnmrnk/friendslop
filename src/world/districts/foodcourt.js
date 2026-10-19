import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Фудкорт: фудтрак (внутрь — через дверь, на крышу — по ящикам), столики под зонтами,
// автомат с газировкой, ящики ломаются
export default {
  id: 'foodcourt', name: 'Фудкорт', ground: 'pave',
  build(b) {
    b.house({ x: 3, z: 2, w: 9.5, d: 3.4, h: 2.7, wall: 0xe8c040, brick: false, windows: false, lit: 1, door: { side: 'w', at: 0.5 }, parapet: false, web: false, floor: T.metal(),
      interior(b, r) { b.box((r.x0 + r.x1) / 2 + 0.5, r.z1 - 0.35, 5, 0.5, 0.95, col(0x6a6d78)); b.m(G.box, glow(0xff5a2a), (r.x0 + r.x1) / 2 + 0.5, 0.97, r.z1 - 0.35, 4.6, 0.03, 0.4); b.box(r.x1 - 0.4, r.z0 + 0.5, 0.6, 0.7, 1.9, col(0xd8d8e0)); } });
    b.zone('roof', 3.6, 2.6, 11.9, 4.8, 2.9);
    b.sign(7.75, 2.2, 5.44, 0, 'ТАКО · ТАКО', '#d8243a', '#f5c542', 4, 0.6);
    b.m(G.box, glow(0xffd28a), 7.75, 1.4, 5.44, 3, 0.8, 0.02);
    for (const x of [4.5, 11]) for (const z of [1.95, 5.45]) { const w = b.m(G.cyl8, col(0x17111f), x, 0.35, z, 0.35, 0.2, 0.35); w.rotation.x = Math.PI / 2; }
    b.crate(13.3, 3.4, 1.2); b.crate(13.3, 3.4, 1.0, 1.2); b.crate(14.5, 3.4, 1.0);
    const tables = [[7, 13], [16, 13], [25, 13], [11.5, 21], [20.5, 21], [16, 28]];
    const umb = [['#d8243a', '#f1e8ff'], ['#4ab0f0', '#f1e8ff'], ['#f5c542', '#2a1f3d'], ['#6aa84f', '#f1e8ff'], ['#7b4bc4', '#f5c542'], ['#ff8a1f', '#2a1f3d']];
    tables.forEach(([x, z], i) => {
      b.table(x, z, 1);
      b.m(G.cyl6, col(0x2b2533), x, 1.6, z, 0.05, 1.6, 0.05);
      b.m(G.cone8, tmat(T.awning(...umb[i])), x, 2.6, z, 1.6, 0.5, 1.6);
      b.chair(x - 1.1, z, Math.PI / 2); b.chair(x + 1.1, z, -Math.PI / 2);
    });
    b.box(28, 3, 1.2, 0.9, 2, tmat(T.vending())); b.light(28, 3.9, 1.6);
    b.box(30.5, 3, 1.4, 1.2, 1.3, col(0x3e5a4a));
    b.bin(19, 3); b.bin(2, 11);
    b.fence(1, 31.2, 12, 31.2, 1.2, 'wood');
    b.lamp(1, 30.5, Math.PI / 2); b.lamp(31, 30.5, -Math.PI / 2); b.lamp(31, 9, -Math.PI / 2);
    b.zone('floor', 1, 8, 31, 31);
    b.cats(1, 8, 31, 31);
    b.spawn(9, 26); b.spawn(26, 26);
    b.hw(() => { b.stringLights(2, 9, 30, 9, 3.2); b.stringLights(2, 17.5, 30, 17.5, 3.2); b.pumpkin(25, 13, 0.3, 0.82); });
  },
};
