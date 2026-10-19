import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { HW } from '../../config.js';

// Рынок: прилавки с помидорами и тыквами, их можно брать и кидать
export default {
  id: 'market', name: 'Рынок', ground: 'pave',
  build(b) {
    const stall = (x, z, kind, aw) => {
      const wd = tmat(T.wood());
      b.box(x, z, 4, 1.2, 1, wd);
      b.m(G.box, tmat(T.produce(kind)), x, 1.06, z - 0.15, 3.6, 0.12, 0.7);
      for (const [a, c] of [[-1.9, -0.7], [1.9, -0.7], [-1.9, 0.7], [1.9, 0.7]]) { b.m(G.box, col(0x2b2533), x + a, 1.3, z + c - 0.5, 0.08, 2.6, 0.08); b.solid(x + a, z + c - 0.5, 0.2, 0.2, 0, 2.6); }
      const r = b.m(G.box, tmat(T.awning(...aw)), x, 2.7, z - 0.4, 4.4, 0.08, 2.4); r.rotation.x = -0.2;
      b.box(x, z - 1.5, 1.6, 0.6, 0.7, tmat(T.crate()));
      if (kind === 'tomato') { b.item('tomato', x - 1.2, z + 0.35, 1); b.item('tomato', x - 0.4, z + 0.4, 1); b.item('tomato', x + 0.6, z + 0.35, 1); }
      if (kind === 'pumpkin') { b.item('pumpkin', x - 1, z + 0.25, 1); b.item('pumpkin', x + 0.9, z + 0.25, 1); }
      if (kind === 'apple') { b.box(x + 1.3, z + 0.2, 0.5, 0.4, 0.1, col(0x6a6d78), { y: 1, solid: false }); b.m(G.cyl8, col(0xd8d8e0), x + 1.3, 1.25, z + 0.2, 0.2, 0.04, 0.2); }
    };
    stall(4, 5, 'tomato', ['#d8243a', '#f1e8ff']); stall(12, 5, 'pumpkin', ['#ff8a1f', '#2a1f3d']); stall(20, 5, 'apple', ['#6aa84f', '#f1e8ff']);
    stall(4, 15, 'carrot', ['#4ab0f0', '#f1e8ff']); stall(12, 15, 'tomato', ['#d8243a', '#f5c542']); stall(20, 15, 'pumpkin', ['#7b4bc4', '#ff8a1f']);
    b.crate(1.2, 10, 1); b.crate(1.2, 11.1, 0.9); b.crate(1.2, 10.5, 0.8, 1); b.crate(22.8, 10, 1); b.crate(22.8, 11, 1);
    b.bin(8, 9.5); b.bin(16, 20.5);
    b.lamp(1, 22.5, Math.PI / 2); b.lamp(23, 1.5, -Math.PI / 2);
    b.zone('floor', 1, 7.2, 23, 12.5); b.zone('floor', 1, 17.2, 23, 23);
    b.spawn(12, 10.5); b.spawn(4, 20);
    b.hw(() => { b.pumpkin(9, 21, 0.5); b.pumpkin(10, 21.6, 0.4); b.pumpkin(9.6, 20.2, 0.35); b.stringLights(2, 2, 22, 2, 3.2); b.stringLights(2, 12, 22, 12, 3.2); });
  },
};
