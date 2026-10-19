import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Фудкорт: фудтрак с интерьером, столики (можно запрыгнуть), автомат с газировкой
export default {
  id: 'foodcourt', name: 'Фудкорт', ground: 'pave',
  build(b) {
    b.house({ x: 3, z: 2, w: 7.5, d: 3.2, h: 2.7, wall: 0xe8c040, brick: false, windows: false, lit: 1, door: { side: 'w', at: 0.5 }, parapet: false, web: false, floor: T.metal(),
      interior(b, r) { b.box((r.x0 + r.x1) / 2 + 0.5, r.z1 - 0.35, 4, 0.5, 0.95, col(0x6a6d78)); b.m(G.box, glow(0xff5a2a), (r.x0 + r.x1) / 2 + 0.5, 0.97, r.z1 - 0.35, 3.6, 0.03, 0.4); b.box(r.x1 - 0.4, r.z0 + 0.5, 0.6, 0.7, 1.9, col(0xd8d8e0)); } });
    b.sign(6.75, 2.2, 5.24, 0, 'ТАКО · ТАКО', '#d8243a', '#f5c542', 3.6, 0.6);
    b.m(G.box, glow(0xffd28a), 6.75, 1.4, 5.24, 2.4, 0.8, 0.02);
    for (const x of [4.2, 9.2]) for (const z of [1.95, 5.25]) { const w = b.m(G.cyl8, col(0x17111f), x, 0.35, z, 0.35, 0.2, 0.35); w.rotation.x = Math.PI / 2; }
    const tables = [[6, 12], [12, 12], [18, 12], [12, 18.5]], umb = [['#d8243a', '#f1e8ff'], ['#4ab0f0', '#f1e8ff'], ['#f5c542', '#2a1f3d'], ['#6aa84f', '#f1e8ff']];
    tables.forEach(([x, z], i) => {
      b.table(x, z, 1);
      b.m(G.cyl6, col(0x2b2533), x, 1.6, z, 0.05, 1.6, 0.05);
      b.m(G.cone8, tmat(T.awning(...umb[i])), x, 2.6, z, 1.6, 0.5, 1.6);
      b.chair(x - 1.1, z, Math.PI / 2); b.chair(x + 1.1, z, -Math.PI / 2);
    });
    b.box(21, 3, 1.2, 0.9, 2, tmat(T.vending())); b.light(21, 3.9, 1.6);
    b.bin(14, 3); b.bin(2, 9);
    b.lamp(1, 22.5, Math.PI / 2); b.lamp(23, 22.5, -Math.PI / 2); b.lamp(23, 7, -Math.PI / 2);
    b.zone('floor', 1, 7.5, 23, 23);
    b.cats(1, 7.5, 23, 23);
    b.spawn(9, 21); b.spawn(20, 20);
    b.hw(() => { b.stringLights(2, 8.5, 22, 8.5, 3.2); b.stringLights(2, 15.5, 22, 15.5, 3.2); b.pumpkin(18, 12, 0.3, 0.82); b.pumpkin(12.4, 18.5, 0.3, 0.82); });
  },
};
