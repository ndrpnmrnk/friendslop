import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Школьный двор: класс с креслами на колёсиках, крыша школы по лестнице, мячи, кольцо,
// ворота, турники, трибуна, скейт
export default {
  id: 'school', name: 'Школьный двор', ground: 'pave',
  build(b) {
    b.house({ x: 3, z: 1, w: 26, d: 8, h: 3.4, upper: 3.4, wall: 0x9a6a5a, lit: 0.6, door: { side: 's', at: 0.5 }, sign: ['ШКОЛА №13', '#2a1f3d', '#f5c542'],
      ladder: { side: 'w', at: 0.5 }, roof: true,
      interior(b, r) {
        b.m(G.plane, tmat(T.chalkboard()), 16, 1.8, r.z0 + 0.02, 4.4, 1.7, 1);
        b.box(16, r.z0 + 1.3, 1.8, 0.8, 0.85, tmat(T.wood()));
        for (const x of [6, 9.5, 22.5, 26]) for (const z of [r.z0 + 3, r.z0 + 5]) b.table(x, z, 0.75);
        b.ride('chair', 18, r.z0 + 1.5, 0); b.ride('chair', 12, r.z1 - 1, Math.PI);
      } });
    b.ground(2, 11, 16, 31, T.court(), 3);
    const wl = col(0xf1e8ff); b.m(G.box, wl, 9, 0.03, 21, 0.08, 0.02, 19.6); b.m(G.box, wl, 9, 0.03, 26.5, 4, 0.02, 0.08);
    b.ground(17, 11, 31, 31, T.grass(), 3);
    b.box(9, 30.6, 0.25, 0.25, 3.4, col(0x2b2533));
    b.box(9, 30.3, 1.8, 0.1, 1.1, col(0xf1e8ff), { y: 2.7, solid: false });
    const ring = b.m(G.torus, col(0xff5a2a), 9, 3.05, 29.9, 0.3, 0.3, 0.3); ring.rotation.x = Math.PI / 2;
    b.item('ball', 6, 18); b.item('ball', 11, 15); b.item('ball', 12, 23);
    const gw = col(0xf1e8ff);
    for (const x of [22, 26]) b.box(x, 30.6, 0.15, 0.15, 2.2, gw);
    b.m(G.box, gw, 24, 2.2, 30.6, 4.1, 0.15, 0.15);
    for (const x of [19, 21]) b.box(x, 13, 0.12, 0.12, 2.2, col(0x6a6d78));
    b.m(G.box, col(0x6a6d78), 20, 2.2, 13, 2.1, 0.06, 0.06);
    for (let i = 0; i < 3; i++) b.box(29.6 + i * 0.5 - 0.5, 20, 1.4 - i * 0.5 + 0.5, 8, 0.4 * (i + 1), tmat(T.wood()));
    b.ride('skate', 13, 13, 1.2);
    b.fence(17, 31.3, 21, 31.3, 1.2, 'wood');
    b.bench(23, 18, -Math.PI / 2);
    b.lamp(16.5, 10.6, 0); b.lamp(1, 30.5, Math.PI / 2); b.lamp(31, 11, -Math.PI / 2);
    b.zone('floor', 2.5, 11.5, 15.5, 27.5); b.zone('floor', 17.5, 14.5, 27.5, 29);
    b.cats(17.5, 11, 28, 30);
    b.spawn(9, 13); b.spawn(24, 22);
    b.hw(() => { b.pumpkin(14.4, 9.6); b.pumpkin(17.6, 9.6); });
  },
};
