import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Автостоянка: по машинам можно прыгать, шлагбаум, будка охраны
export default {
  id: 'parking', name: 'Автостоянка', ground: 'asphalt',
  build(b) {
    const wl = col(0xd8d0e0);
    for (let i = 0; i < 8; i++) { b.m(G.box, wl, 1.6 + i * 3, 0.02, 4, 0.08, 0.02, 4.4); b.m(G.box, wl, 1.6 + i * 3, 0.02, 15, 0.08, 0.02, 4.4); }
    const cols = [0xc83a3a, 0x3a7ac8, 0xd8d8e0, 0x2a2a30, 0x6aa84f, 0xf5c542];
    [[3.1, 4], [9.1, 4], [12.1, 4], [18.1, 4], [6.1, 15], [12.1, 15], [15.1, 15], [21.1, 15]].forEach(([x, z], i) => b.car(x, z, Math.PI / 2 + (i % 2 ? Math.PI : 0), cols[i % cols.length]));
    b.house({ x: 1, z: 19.2, w: 3, d: 3.2, h: 2.6, wall: 0xd8d0c0, brick: false, lit: 1, door: { side: 'e', at: 0.5 }, parapet: false,
      interior(b, r) { b.box((r.x0 + r.x1) / 2, r.z0 + 0.4, 2.2, 0.6, 0.85, tmat(T.wood())); b.m(G.box, tmat(T.screen()), (r.x0 + r.x1) / 2, 1.15, r.z0 + 0.3, 0.6, 0.45, 0.3); b.chair((r.x0 + r.x1) / 2, r.z0 + 1.3, Math.PI); } });
    // шлагбаум: можно перепрыгнуть
    b.box(5, 21, 0.4, 0.4, 1.1, col(0x6a6d78));
    b.m(G.box, tmat(T.stripe()), 8.2, 1.0, 21, 6, 0.12, 0.12); b.solid(8.2, 21, 6, 0.2, 0.92, 0.16);
    b.m(G.box, glow(0xd8243a), 5, 1.25, 21, 0.15, 0.15, 0.15);
    b.lamp(12, 9.8, 0); b.lamp(1, 1, Math.PI / 4); b.lamp(23, 23, -Math.PI * 0.75);
    b.bin(22.5, 9); b.hydrant(1, 9.6);
    b.zone('floor', 1, 6.6, 23, 12.4); b.zone('floor', 10, 17.6, 23, 23);
    b.cats(1, 7, 23, 12);
    b.spawn(12, 11.4); b.spawn(16, 21);
    b.hw(() => { b.pumpkin(4.5, 18.6, 0.4); b.web(1.2, 2.2, 22.3, 0, 0.8); });
  },
};
