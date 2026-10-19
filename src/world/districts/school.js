import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Школьный двор: мячи с физикой, кольцо, ворота, турники, трибуна, класс
export default {
  id: 'school', name: 'Школьный двор', ground: 'pave',
  build(b) {
    b.house({ x: 2, z: 1, w: 20, d: 6, h: 3.4, upper: 3.4, wall: 0x9a6a5a, lit: 0.6, door: { side: 's', at: 0.5 }, sign: ['ШКОЛА №13', '#2a1f3d', '#f5c542'],
      interior(b, r) {
        b.m(G.plane, tmat(T.chalkboard()), 12, 1.8, r.z0 + 0.02, 4, 1.6, 1);
        b.box(12, r.z0 + 1.2, 1.6, 0.8, 0.85, tmat(T.wood()));
        for (const x of [5, 8, 16, 19]) for (const z of [r.z0 + 2.6, r.z0 + 4]) { b.table(x, z, 0.75); }
      } });
    b.ground(2, 9, 12.5, 23, T.court(), 3);
    const wl = col(0xf1e8ff); b.m(G.box, wl, 7.25, 0.03, 16, 0.08, 0.02, 13.6); b.m(G.box, wl, 7.25, 0.03, 18.5, 3.5, 0.02, 0.08);
    b.ground(13.5, 9, 23, 23, T.grass(), 3);
    // кольцо
    b.box(7.25, 22.3, 0.25, 0.25, 3.4, col(0x2b2533));
    b.box(7.25, 22.0, 1.8, 0.1, 1.1, col(0xf1e8ff), { y: 2.7, solid: false });
    const ring = b.m(G.torus, col(0xff5a2a), 7.25, 3.05, 21.6, 0.3, 0.3, 0.3); ring.rotation.x = Math.PI / 2;
    b.item('ball', 5, 15); b.item('ball', 8.5, 13); b.item('ball', 10, 18);
    // ворота
    const gw = col(0xf1e8ff);
    for (const x of [16.5, 20.5]) b.box(x, 22.3, 0.15, 0.15, 2.2, gw);
    b.m(G.box, gw, 18.5, 2.2, 22.3, 4.1, 0.15, 0.15);
    // турники
    for (const x of [14.5, 16.5]) b.box(x, 10.5, 0.12, 0.12, 2.2, col(0x6a6d78));
    b.m(G.box, col(0x6a6d78), 15.5, 2.2, 10.5, 2.1, 0.06, 0.06);
    // трибуна
    for (let i = 0; i < 3; i++) b.box(21.6 + i * 0.5 - 0.5, 15, 1.4 - i * 0.5 + 0.5, 6, 0.4 * (i + 1), tmat(T.wood()));
    b.bench(18, 14, -Math.PI / 2);
    b.lamp(13, 8.5, 0); b.lamp(1, 22.5, Math.PI / 2);
    b.zone('floor', 2.5, 9.5, 12, 20.5); b.zone('floor', 13.8, 11.5, 20, 21);
    b.cats(13.8, 9, 20, 22);
    b.spawn(7, 11); b.spawn(16, 16);
    b.hw(() => { b.pumpkin(10.6, 7.6, 0.4); b.pumpkin(13.4, 7.6, 0.4); });
  },
};
