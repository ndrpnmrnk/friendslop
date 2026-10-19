import { THREE, G, tmat, col, glow, alphaMat } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';

// Старое кладбище: склеп с интерьером, низкий туман, вороны
export default {
  id: 'cemetery', name: 'Кладбище', ground: 'grass',
  build(b) {
    b.ground(10.8, 9, 13.2, 24, T.dirt(), 2);
    b.fence(1, 1, 23, 1); b.fence(1, 23, 10.2, 23); b.fence(13.8, 23, 23, 23);
    b.fence(1, 1, 1, 10); b.fence(1, 14, 1, 23); b.fence(23, 1, 23, 10); b.fence(23, 14, 23, 23);
    b.house({ x: 7, z: 2, w: 8, d: 6, h: 3.6, wall: 0x8a8496, brick: false, windows: false, door: { side: 's', at: 0.5 }, parapet: false, inner: T.stone(), floor: T.cobble(),
      interior(b, r) {
        b.box(11, 4.6, 2.2, 1.1, 0.9, tmat(T.stone())); b.box(11, 4.6, 2.3, 1.2, 0.08, tmat(T.stone()), { y: 0.9, solid: false });
        for (const [x, z] of [[r.x0 + 0.5, r.z0 + 0.5], [r.x1 - 0.5, r.z0 + 0.5], [r.x0 + 0.5, r.z1 - 0.6], [r.x1 - 0.5, r.z1 - 0.6]]) {
          b.box(x, z, 0.3, 0.3, 0.9, tmat(T.stone())); b.m(G.box, col(0xf1e8d0), x, 1.05, z, 0.08, 0.2, 0.08); b.m(G.box, glow(0xffb35c), x, 1.2, z, 0.05, 0.08, 0.05); b.light(x, z, 1.2, 0.95);
        }
      } });
    const pd = b.m(G.cone4, tmat(T.stone()), 11, 4.3, 8.05, 4.4, 1.4, 0.4); pd.rotation.y = Math.PI / 4; pd.scale.set(3.2, 1.4, 0.3);
    for (const z of [11, 14, 17, 20]) for (const x of [3, 6, 9, 15, 18, 21]) if (Math.random() < 0.85) b.grave(x + (Math.random() - 0.5) * 0.5, z);
    b.deadTree(20, 5.5);
    b.lamp(10.2, 12, Math.PI / 2); b.lamp(13.8, 19, -Math.PI / 2);
    b.zone('nook', 15.6, 2, 22.6, 8.4);
    b.zone('floor', 2, 9.5, 22, 22.5);
    b.birds('crow', 14, 8, 22, 21, 6);
    // туман
    const fm = alphaMat(T.fog(), { opacity: 0.55 });
    for (let i = 0; i < 7; i++) {
      const m = b.m(G.plane, fm, 3 + Math.random() * 18, 0.35 + Math.random() * 0.2, 9 + Math.random() * 13, 6, 6, 1); m.rotation.x = -Math.PI / 2;
      const x0 = m.position.x, ph = Math.random() * 6; W.animated.push((dt, t) => { m.position.x = x0 + Math.sin(t * 0.25 + ph) * 1.5; });
    }
    b.spawn(12, 21.5); b.spawn(4, 9.5);
    b.hw(() => { b.pumpkin(9.2, 9, 0.4); b.pumpkin(12.8, 9, 0.4); b.pumpkin(6, 12, 0.3); b.pumpkin(18, 15, 0.35); });
  },
};
