import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Автостоянка: по машинам можно прыгать, шлагбаум, будка охраны с креслом на колёсиках,
// кирпичная ограда вдоль края (ломается)
export default {
  id: 'parking', name: 'Автостоянка', ground: 'asphalt',
  build(b) {
    const wl = col(0xd8d0e0);
    for (let i = 0; i < 10; i++) { b.m(G.box, wl, 1.6 + i * 3.2, 0.02, 5.2, 0.08, 0.02, 4.4); b.m(G.box, wl, 1.6 + i * 3.2, 0.02, 20, 0.08, 0.02, 4.4); }
    const cols = [0xc83a3a, 0x3a7ac8, 0xd8d8e0, 0x2a2a30, 0x6aa84f, 0xf5c542];
    [[3.2, 5.2], [9.6, 5.2], [12.8, 5.2], [19.2, 5.2], [25.6, 5.2], [6.4, 20], [12.8, 20], [16, 20], [22.4, 20], [28.8, 20]]
      .forEach(([x, z], i) => b.car(x, z, Math.PI / 2 + (i % 2 ? Math.PI : 0), cols[i % cols.length]));
    b.brickWall(16, 0.6, 30, 1.0, 'x', 0, { bw: 1, bh: 0.5 });
    b.house({ x: 1, z: 26.5, w: 4, d: 4, h: 2.7, wall: 0xd8d0c0, brick: false, lit: 1, door: { side: 'e', at: 0.5 }, parapet: false,
      interior(b, r) { b.box((r.x0 + r.x1) / 2, r.z0 + 0.4, 2.8, 0.6, 0.85, tmat(T.wood())); b.m(G.box, tmat(T.screen()), (r.x0 + r.x1) / 2, 1.15, r.z0 + 0.3, 0.6, 0.45, 0.3);
        b.ride('chair', (r.x0 + r.x1) / 2, r.z0 + 1.6, Math.PI); } });
    b.vitrine(3, 30.62, 2.4, 1.2, 'x', 1.0);
    b.box(7, 29, 0.4, 0.4, 1.1, col(0x6a6d78));
    b.m(G.box, tmat(T.stripe()), 10.2, 1.0, 29, 6, 0.12, 0.12); b.solid(10.2, 29, 6, 0.2, 0.92, 0.16);
    b.m(G.box, glow(0xd8243a), 7, 1.25, 29, 0.15, 0.15, 0.15);
    b.lamp(16, 12.6, 0); b.lamp(30.8, 30.8, -Math.PI * 0.75); b.lamp(1.2, 12.6, Math.PI / 2);
    b.bin(30.5, 12); b.hydrant(1.2, 15);
    // паркомат, разделительные клумбы, конусы, автобус
    b.box(14, 12.4, 0.4, 0.3, 1.4, col(0x3a7ac8)); b.m(G.box, tmat(T.screen()), 14, 1.1, 12.56, 0.25, 0.2, 0.02);
    for (const x of [6, 22]) { b.box(x, 12.4, 4, 1, 0.3, tmat(T.concrete())); b.m(G.ico, tmat(T.bush()), x, 0.55, 12.4, 1.8, 0.4, 0.45); b.tree(x, 12.4, 0.8); }
    for (const x of [10, 11, 12]) b.cone(x, 25);
    b.box(23, 28, 9, 2.6, 2.9, tmat(T.carSide(0xd8a030))); b.m(G.box, tmat(T.carGlass(0xd8a030)), 23, 2.2, 26.68, 8, 0.8, 0.02); b.zone('roof', 19, 27, 27, 29, 2.9);
    b.crate(17.5, 28.5, 1.2); b.crate(17.5, 28.5, 1.0, 1.2);
    b.zone('floor', 1, 8.6, 31, 16.6); b.zone('floor', 13, 23.6, 31, 31);
    b.cats(1, 9, 31, 16);
    b.spawn(16, 14.5); b.spawn(22, 28);
    b.hw(() => { b.pumpkin(6.5, 25.8); b.web(1.2, 2.2, 30.3, 0, 0.8); });
  },
};
