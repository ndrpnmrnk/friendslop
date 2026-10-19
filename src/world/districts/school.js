import { THREE, G, tmat, col, lam, paint, glow } from '../../core/gfx.js';
import { T, rep } from '../../core/textures.js';

// Школьный двор: класс с креслами на колёсиках, крыша школы по лестнице, мячи, кольцо,
// ворота, турники, трибуна, скейт
export default {
  id: 'school', name: 'Школьный двор', ground: 'pave',
  build(b) {
    // трёхэтажная школа: класс, библиотека, кабинет химии; лестница до крыши
    b.tower({ x: 3, z: 1, w: 26, d: 8, floors: 3, fh: 3.4, wall: 0x9a6a5a, lit: 0.6, door: { side: 's', at: 0.5, sign: ['ШКОЛА №13', '#2a1f3d', '#f5c542'] },
      ladder: { side: 'w', at: 0.5 }, floor: T.floorWood(),
      interior(f, k, r) {
        f.m(G.plane, tmat(k === 2 ? T.chalkboard() : T.chalkboard()), 18, 1.75, r.sx1 > 18 ? r.z0 : 1.27, 4.4, 1.6, 1);
        if (k === 0) {
          f.box(18, 2.9, 1.8, 0.8, 0.85, tmat(T.wood()));
          for (const x of [13, 16.5, 20, 23.5]) for (const z of [5.4, 7.6]) f.desk(x, z, Math.PI, false);
          f.ride('chair', 19.2, 2.5, 0); f.ride('chair', 23.5, 6.5, Math.PI);
          f.plantPot(27.6, 8.4); f.cabinet(27.9, 3, 0.6, 1.6, 1.8, 0x6a5a4a, 0, -Math.PI / 2);
        } else if (k === 1) {
          for (const x of [13.5, 18, 22.5]) f.shelf(x, 5.6, 3.2, 0);
          f.table(15.8, 7.9, 0.8); f.table(20.3, 7.9, 0.8); f.chair(15.8, 7.1, 0); f.chair(20.3, 7.1, 0);
          f.rug(26, 6, 2.4, 3, '#2a6a4a', '#f5c542'); f.sofa(26, 8.2, Math.PI, 0x4a5a8a); f.plantPot(11.4, 8.4);
        } else {
          for (const x of [14, 19, 24]) { f.box(x, 6, 2.6, 1.1, 0.9, tmat(T.cabinet(0xd8d8e0))); f.m(G.box, col(0x2b2533), x, 0.93, 6, 2.62, 0.05, 1.12);
            for (const dx of [-0.8, 0, 0.8]) { f.m(G.cyl8, glow([0x9be36b, 0x4ab0f0, 0xff5a6e][((x + dx * 3) | 0) % 3]), x + dx, 1.08, 6, 0.06, 0.24, 0.06); } }
          f.whiteboard(25, 1.8, 1.3, 0, 2.5); f.item('ball', 20, 8); f.cabinet(27.9, 5.5, 0.6, 2, 1.9, 0xd8d8e0, 0, -Math.PI / 2);
        }
      } });
    b.ground(2, 11, 16, 31, T.court(), 3);
    for (const x of [2.3, 15.7]) b.marking(x, 21, 0.18, 19.4);
    for (const z of [11.3, 21, 30.7]) b.marking(9, z, 13.4, 0.18);
    for (const x of [7, 11]) b.marking(x, 28.5, 0.18, 4.4);
    b.marking(9, 26.3, 4.2, 0.18);
    const circle = b.m(new THREE.RingGeometry(1.45, 1.63, 20), paint(0xe5ddcf), 9, 0.035, 21, 1, 1, 1); circle.rotation.x = -Math.PI / 2;
    b.ground(17, 11, 31, 31, T.grass(), 3);
    b.box(9, 30.6, 0.25, 0.25, 3.4, col(0x2b2533));
    b.box(9, 30.3, 1.8, 0.1, 1.1, col(0xf1e8ff), { y: 2.7, solid: false });
    const ring = b.m(G.torus, col(0xff5a2a), 9, 3.05, 29.9, 0.3, 0.3, 0.3); ring.rotation.x = Math.PI / 2;
    for (const x of [8.62, 9.38]) b.m(G.box, col(0xc8422d), x, 3.12, 30.235, 0.04, 0.42, 0.02);
    for (const y of [2.91, 3.33]) b.m(G.box, col(0xc8422d), 9, y, 30.235, 0.8, 0.04, 0.02);
    b.item('ball', 6, 18); b.item('ball', 11, 15); b.item('ball', 12, 23);
    const gw = col(0xf1e8ff);
    for (const x of [22, 26]) b.box(x, 30.6, 0.15, 0.15, 2.2, gw);
    b.m(G.box, gw, 24, 2.2, 30.6, 4.1, 0.15, 0.15);
    b.m(G.plane, lam({ map: rep(T.chainlink(), 2, 1), transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }), 24, 1.1, 30.8, 4, 2.2, 1);
    for (const x of [19, 21]) b.box(x, 13, 0.12, 0.12, 2.2, col(0x6a6d78));
    b.m(G.box, col(0x6a6d78), 20, 2.2, 13, 2.1, 0.06, 0.06);
    for (let i = 0; i < 3; i++) b.box(29.6 + i * 0.5 - 0.5, 20, 1.4 - i * 0.5 + 0.5, 8, 0.4 * (i + 1), tmat(T.wood()));
    b.ride('skate', 13, 13, 1.2);
    b.fence(17, 31.3, 21, 31.3, 1.2, 'wood');
    b.bench(23, 18, -Math.PI / 2);
    // флагшток, велопарковка, деревья
    b.m(G.cyl6, col(0xd8d8e0), 16.5, 3.5, 10.2, 0.05, 7, 0.05); b.solid(16.5, 10.2, 0.2, 0.2, 0, 7); b.m(G.box, col(0xff8a1f), 17.1, 6.4, 10.2, 1.1, 0.7, 0.02);
    for (let i = 0; i < 4; i++) { const t = b.m(G.torus, col(0x6a6d78), 23 + i * 0.8, 0.5, 10.6, 0.4, 0.4, 0.4); }
    b.solid(24.2, 10.6, 3.4, 0.2, 0, 0.9);
    b.tree(30, 30); b.tree(16.5, 30); b.cone(13, 20); b.cone(13, 22);
    b.lamp(16.5, 10.6, 0); b.lamp(1, 30.5, Math.PI / 2); b.lamp(31, 11, -Math.PI / 2);
    b.zone('floor', 2.5, 11.5, 15.5, 27.5); b.zone('floor', 17.5, 14.5, 27.5, 29);
    b.cats(17.5, 11, 28, 30);
    b.spawn(9, 13); b.spawn(24, 22);
    b.hw(() => { b.pumpkin(14.4, 9.6); b.pumpkin(17.6, 9.6); });
  },
};
