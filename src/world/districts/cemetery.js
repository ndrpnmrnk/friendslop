import { THREE, G, tmat, col, glow, alphaMat } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';

// Кладбище: склеп с интерьером, сторожка (ломается), туман, вороны, нычка за склепом
export default {
  id: 'cemetery', name: 'Кладбище', ground: 'grass',
  build(b) {
    b.ground(14.6, 11, 17.4, 32, T.dirt(), 2);
    b.fence(1, 1, 31, 1); b.fence(1, 31, 14.2, 31); b.fence(17.8, 31, 31, 31);
    b.fence(1, 1, 1, 14); b.fence(1, 18, 1, 31); b.fence(31, 1, 31, 14); b.fence(31, 18, 31, 31);
    b.house({ x: 11, z: 2, w: 10, d: 7, h: 3.6, wall: 0x8a8496, brick: false, windows: false, door: { side: 's', at: 0.5 }, parapet: false, inner: T.stone(), floor: T.cobble(),
      interior(b, r) {
        const st = tmat(T.stone()); b.box(16, 5.5, 2.2, 1.1, 0.9, st); b.box(16, 5.5, 2.3, 1.2, 0.08, [st, st, tmat(T.grave()), st, st, st], { y: 0.9, solid: false });
        for (const [x, z] of [[r.x0 + 0.5, r.z0 + 0.5], [r.x1 - 0.5, r.z0 + 0.5], [r.x0 + 0.5, r.z1 - 0.6], [r.x1 - 0.5, r.z1 - 0.6]]) {
          b.box(x, z, 0.3, 0.3, 0.9, tmat(T.stone())); b.m(G.box, col(0xf1e8d0), x, 1.05, z, 0.08, 0.2, 0.08); b.m(G.box, glow(0xffb35c), x, 1.2, z, 0.05, 0.08, 0.05); b.light(x, z, 1.2, 0.95);
        }
      } });
    const pd = b.m(G.cone4, tmat(T.stone()), 16, 4.3, 9.05, 1, 1, 1); pd.rotation.y = Math.PI / 4; pd.scale.set(4, 1.4, 0.3);
    for (let z = 13; z <= 28; z += 3) for (let x = 3.5; x <= 29; x += 3.4) if (Math.abs(x - 16) > 2 && Math.random() < 0.85) b.grave(x + (Math.random() - 0.5) * 0.5, z);
    b.deadTree(28, 6);
    b.shed(3, 3, 4, 3.5);
    b.lamp(14.2, 14, Math.PI / 2); b.lamp(17.8, 24, -Math.PI / 2);
    b.zone('nook', 22, 2, 30.4, 9.4);
    b.zone('floor', 2, 10, 30, 30.4);
    b.birds('crow', 18, 11, 30, 29, 7);
    const fm = alphaMat(T.fog(), { opacity: 0.55 });
    for (let i = 0; i < 9; i++) {
      const m = b.m(G.plane, fm, 3 + Math.random() * 26, 0.35 + Math.random() * 0.2, 11 + Math.random() * 18, 7, 7, 1); m.rotation.x = -Math.PI / 2;
      const x0 = m.position.x, ph = Math.random() * 6; W.animated.push((dt, t) => { m.position.x = x0 + Math.sin(t * 0.25 + ph) * 1.5; });
    }
    b.spawn(16, 30); b.spawn(4.5, 12);
    b.hw(() => { b.pumpkin(13.4, 10); b.pumpkin(18.6, 10); });
  },
};
