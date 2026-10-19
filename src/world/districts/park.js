import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Парк с прудом: в воде замедляешься, беседка, нычка в кустах
export default {
  id: 'park', name: 'Парк', ground: 'grass',
  build(b) {
    b.ground(11, 0, 13, 24, T.dirt(), 2); b.ground(0, 11, 24, 13, T.dirt(), 2);
    b.water(6, 18, 3.6);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, r = 3.8; const s = b.m(G.ico, tmat(T.stone()), 6 + Math.cos(a) * r, 0.1, 18 + Math.sin(a) * r, 0.35, 0.22, 0.3); s.rotation.y = a; }
    for (let i = 0; i < 9; i++) { const a = 0.4 + i * 0.18, r = 3.2; b.m(G.box, col(0x5a7a3a), 6 + Math.cos(a) * r, 0.5, 18 + Math.sin(a) * r, 0.05, 1, 0.05); }
    // беседка
    b.box(17, 6, 4.4, 4.4, 0.2, tmat(T.wood()));
    for (const [x, z] of [[15.1, 4.1], [18.9, 4.1], [15.1, 7.9], [18.9, 7.9]]) b.box(x, z, 0.25, 0.25, 2.6, tmat(T.wood()), { y: 0.2 });
    const roof = b.m(G.cone4, tmat(T.roof()), 17, 3.4, 6, 3.4, 1.5, 3.4); roof.rotation.y = Math.PI / 4;
    b.solid(17, 6, 4.6, 4.6, 2.8, 0.3);
    b.bench(17, 4.8, 0);
    // нычка в кустах
    b.bush(20, 15.5, 4.4, 1.1, 1.3); b.bush(18, 17.7, 1.1, 3.4, 1.3); b.bush(22.4, 17.7, 1.1, 3.4, 1.3);
    b.zone('nook', 18.7, 16.3, 21.8, 19.6);
    for (const [x, z] of [[3, 4], [8, 3], [21.5, 22], [16, 21], [2.5, 9], [21.5, 10]]) b.tree(x, z);
    b.bush(5, 7.5, 2, 1.2); b.bush(15, 1.6, 2, 1);
    b.bench(10, 18, -Math.PI / 2); b.bench(6, 22.6, Math.PI);
    b.lamp(13.6, 10.2, 0); b.lamp(10.4, 13.8, Math.PI);
    b.item('balloon', 10.4, 21.2); b.item('balloon', 9.8, 21.8); b.item('balloon', 10.9, 21.9);
    b.zone('floor', 1, 1, 10.5, 10.5); b.zone('floor', 13.5, 9, 23, 14.5);
    b.cats(13, 1, 23, 13.5);
    b.spawn(12, 6); b.spawn(16, 12);
    b.hw(() => { b.pumpkin(15, 8.6, 0.4); b.pumpkin(19, 8.6, 0.35); b.pumpkin(12, 15, 0.45); });
  },
};
