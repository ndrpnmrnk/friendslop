import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { burst } from '../particles.js';

// Площадь: фонтан (в воде замедляешься), памятник на постаменте, киоск, остановка со стеклом, голуби
export default {
  id: 'plaza', name: 'Площадь', ground: 'cobble',
  build(b) {
    const st = tmat(T.stone()), cx = 16, cz = 18, R = 3.8;
    b.water(cx, cz, R - 0.15);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
      const m = b.m(G.box, st, x, 0.27, z, 0.4, 0.55, 1.75); m.rotation.y = -a;
      b.solid(x, z, 0.75, 0.75, 0, 0.55);
    }
    b.m(G.cyl8, st, cx, 0.8, cz, 0.35, 1.6, 0.35); b.solid(cx, cz, 0.7, 0.7, 0, 1.6);
    b.m(G.cyl12, st, cx, 1.45, cz, 1.0, 0.18, 1.0);
    b.m(G.cone8, tmat(T.water()), cx, 1.9, cz, 0.25, 0.7, 0.25);
    const wx = b.X(cx), wz = b.Z(cz), wy = b.Y + 2.1; let ft = 0;
    W.animated.push(dt => { ft -= dt; if (ft <= 0) { ft = 0.12; burst(wx, wy, wz, 2, { color: 0x8ac0e8, size: 0.18, speed: 1.6, up: 2, g: 9, life: 0.8 }); } });
    // памятник: на постамент можно запрыгнуть
    b.box(16, 5, 3, 3, 1.2, st);
    const bz = tmat(T.metal());
    b.m(G.box, bz, 15.85, 1.65, 5, 0.16, 0.9, 0.2); b.m(G.box, bz, 16.15, 1.65, 5, 0.16, 0.9, 0.2);
    b.m(G.cyl6, bz, 16, 2.38, 5, 0.34, 0.9, 0.22); b.m(G.sphL, bz, 16, 3.0, 5, 0.24, 0.26, 0.22);
    b.m(G.box, bz, 16, 3.19, 5, 0.54, 0.07, 0.42);
    b.sign(16, 0.72, 6.51, 0, 'ОСНОВАТЕЛЬ', '#4b4054', '#c5b58b', 1.7, 0.3);
    const arm = b.m(G.box, bz, 16.38, 2.95, 5, 0.12, 0.7, 0.12); arm.rotation.z = -0.5;
    b.solid(16, 5, 0.7, 0.5, 1.2, 2.0);
    // киоск
    b.house({ x: 24, z: 24, w: 4.5, d: 3.6, h: 2.8, wall: 0x4a6a8a, brick: false, door: { side: 'w', at: 0.5 }, sign: ['ПРЕССА', '#f5c542', '#17111f'], parapet: false,
      interior(b, r) { b.box(r.x1 - 0.5, (r.z0 + r.z1) / 2, 0.6, 2.4, 1, tmat(T.wood())); b.shelf(25.8, r.z0 + 0.35, 2.2, 0); } });
    // остановка: стекло бьётся
    const mt = col(0x3a4a6a);
    for (const x of [3.2, 8.8]) b.box(x, 27, 0.15, 0.15, 2.6, mt);
    b.box(6, 27.6, 6, 1.6, 0.12, mt, { y: 2.6 });
    b.vitrine(6, 26.9, 5.4, 1.9, 'x', 0.45);
    b.bench(6, 27.8, Math.PI);
    b.sign(6, 2.9, 28.42, 0, 'АВТОБУС 13', '#f5c542', '#17111f', 2.2, 0.4);
    // клумбы
    for (const [x, z] of [[6, 12], [26, 12]]) { b.box(x, z, 3, 3, 0.45, tmat(T.stone())); b.m(G.ico, tmat(T.bush()), x, 0.7, z, 1.1, 0.5, 1.1); }
    b.m(G.cyl6, col(0x2b2533), 5, 1.6, 7, 0.1, 3.2, 0.1); b.solid(5, 7, 0.3, 0.3, 0, 3.2);
    b.m(G.box, col(0x2b2533), 5, 3.3, 7, 0.9, 0.9, 0.3); b.sign(5, 3.3, 7.16, 0, '12:00', '#f1e8ff', '#17111f', 0.7, 0.7);
    b.bench(10, 18, Math.PI / 2); b.bench(22, 18, -Math.PI / 2); b.bench(16, 24.2, Math.PI);
    b.lamp(1.5, 1.5, Math.PI / 4); b.lamp(30.5, 1.5, -Math.PI / 4); b.lamp(1.5, 30.5, Math.PI * 0.75); b.lamp(30.5, 20, -Math.PI / 2);
    b.bin(9, 8); b.bin(23, 8);
    b.birds('pigeon', 6, 20, 22, 30, 8);
    b.zone('floor', 1, 8, 31, 31);
    b.spawn(4, 22); b.spawn(27, 9);
    b.hw(() => { b.pumpkin(cx + R, cz, 0.33, 0.55); b.pumpkin(13, 6.8); b.web(24.1, 2.4, 27.45, 0, 1); });
  },
};
