import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { burst } from '../particles.js';

// Площадь: фонтан (в воде замедляешься), на постамент памятника можно залезть, голуби
export default {
  id: 'plaza', name: 'Площадь', ground: 'cobble',
  build(b) {
    const st = tmat(T.stone()), cx = 12, cz = 13, R = 3.2;
    b.water(cx, cz, R - 0.15);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
      const m = b.m(G.box, st, x, 0.27, z, 0.4, 0.55, 1.72); m.rotation.y = -a;
      b.solid(x, z, 0.75, 0.75, 0, 0.55);
    }
    b.m(G.cyl8, st, cx, 0.8, cz, 0.35, 1.6, 0.35); b.solid(cx, cz, 0.7, 0.7, 0, 1.6);
    b.m(G.cyl12, st, cx, 1.45, cz, 1.0, 0.18, 1.0);
    b.m(G.cone8, tmat(T.water()), cx, 1.9, cz, 0.25, 0.7, 0.25);
    const wx = b.X(cx), wz = b.Z(cz), wy = b.Y + 2.1; let ft = 0;
    W.animated.push(dt => { ft -= dt; if (ft <= 0) { ft = 0.12; burst(wx, wy, wz, 2, { color: 0x8ac0e8, size: 0.18, speed: 1.6, up: 2, g: 9, life: 0.8 }); } });
    // памятник
    b.box(12, 3.4, 2.6, 2.6, 1.2, st);
    const bz = tmat(T.metal());
    b.m(G.box, bz, 11.85, 1.65, 3.4, 0.16, 0.9, 0.2); b.m(G.box, bz, 12.15, 1.65, 3.4, 0.16, 0.9, 0.2);
    b.m(G.box, bz, 12, 2.45, 3.4, 0.5, 0.75, 0.3); b.m(G.sph, bz, 12, 3.0, 3.4, 0.2, 0.22, 0.2);
    const arm = b.m(G.box, bz, 12.38, 2.95, 3.4, 0.12, 0.7, 0.12); arm.rotation.z = -0.5;
    b.solid(12, 3.4, 0.7, 0.5, 1.2, 2.0);
    // киоск
    b.house({ x: 18, z: 17, w: 4.5, d: 3.6, h: 2.8, wall: 0x4a6a8a, brick: false, door: { side: 'w', at: 0.5 }, sign: ['ПРЕССА', '#f5c542', '#17111f'], parapet: false,
      interior(b, r) { b.box(r.x1 - 0.5, (r.z0 + r.z1) / 2, 0.6, 2.4, 1, tmat(T.wood())); b.shelf(19.8, r.z0 + 0.35, 2.2, 0); } });
    // часы
    b.m(G.cyl6, col(0x2b2533), 4, 1.6, 7, 0.1, 3.2, 0.1); b.solid(4, 7, 0.3, 0.3, 0, 3.2);
    b.m(G.box, col(0x2b2533), 4, 3.3, 7, 0.9, 0.9, 0.3); b.sign(4, 3.3, 7.16, 0, '12:00', '#f1e8ff', '#17111f', 0.7, 0.7);
    b.bench(3.4, 13, Math.PI / 2); b.bench(20.6, 11, -Math.PI / 2); b.bench(9, 21.5, Math.PI);
    b.lamp(1.5, 1.5, Math.PI / 4); b.lamp(22.5, 1.5, -Math.PI / 4); b.lamp(1.5, 22.5, Math.PI * 0.75);
    b.bin(7, 7); b.bin(17, 7);
    b.birds('pigeon', 5, 16, 16, 22, 7);
    b.zone('floor', 1, 6, 23, 23);
    b.spawn(5, 20); b.spawn(19, 8);
    b.hw(() => { for (const a of [0.8, 2.4, 3.9, 5.5]) b.pumpkin(cx + Math.cos(a) * R, cz + Math.sin(a) * R, 0.33, 0.55); b.web(18.1, 2.4, 20.65, 0, 1); });
  },
};
