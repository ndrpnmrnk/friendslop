import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { buildCrane } from '../crane.js';

// Стройка: кран с шар-бабой ломает стену, леса с лестницей, бытовка, кирпичи
export default {
  id: 'construction', name: 'Стройка', ground: 'dirt',
  build(b) {
    b.fence(1, 23, 9, 23, 1.8, 'mesh'); b.fence(15, 23, 23, 23, 1.8, 'mesh'); b.fence(1, 10, 1, 23, 1.8, 'mesh');
    buildCrane(b, 4, 5, { x0: 11, z: 9, cols: 8, rows: 5, bw: 0.85, bh: 0.7, bd: 0.5 });
    // каркас недостроя
    const cc = tmat(T.concrete());
    for (const x of [10.5, 18.3]) b.box(x, 5, 0.5, 0.5, 4.2, cc);
    b.box(14.4, 5, 8.3, 0.3, 0.25, cc, { y: 4.2 });
    b.m(G.box, tmat(T.hazard()), 14.4, 0.6, 10.2, 7, 0.25, 0.04);
    // леса
    const wd = tmat(T.wood()), mt = col(0x6a6d78);
    for (const [x, z] of [[19.2, 12.2], [22.8, 12.2], [19.2, 13.8], [22.8, 13.8]]) b.box(x, z, 0.1, 0.1, 3.4, mt);
    for (const y of [1.6, 3.2]) b.box(21, 13, 3.8, 1.6, 0.1, wd, { y });
    b.ladder(21, 13.8, 's', 3.3);
    // бытовка
    b.house({ x: 15, z: 17.5, w: 6, d: 3.2, h: 2.6, wall: 0x3a6a9a, brick: false, door: { side: 'n', at: 0.3 }, parapet: false, web: false,
      interior(b, r) { b.table((r.x0 + r.x1) / 2 + 0.6, (r.z0 + r.z1) / 2, 0.8); b.chair(r.x0 + 3.2, r.z1 - 0.5, Math.PI); b.box(r.x1 - 0.4, (r.z0 + r.z1) / 2, 0.5, 1.6, 1.6, col(0x4a3a2e));
        b.m(G.sph, col(0xf5c542), r.x1 - 0.4, 1.75, (r.z0 + r.z1) / 2, 0.2, 0.14, 0.2); } });
    // поддон с кирпичами
    b.box(10, 16, 1.6, 1.2, 0.18, wd);
    b.item('brick', 9.6, 15.8, 0.18); b.item('brick', 10.4, 15.8, 0.18); b.item('brick', 10, 16.3, 0.18); b.item('brick', 10, 15.6, 0.36);
    // куча песка, трубы, бетономешалка
    b.m(G.cone8, tmat(T.dirt()), 5.5, 0.7, 19, 2, 1.4, 2); b.solid(5.5, 19, 2.6, 2.6, 0, 1.2);
    for (const z of [20.6, 21.2, 21.8]) { const p = b.m(G.cyl8, tmat(T.rust()), 12.5, 0.3, z, 0.28, 3.4, 0.28); p.rotation.z = Math.PI / 2; }
    b.solid(12.5, 21.2, 3.4, 1.9, 0, 0.6);
    b.box(7.5, 13, 1.4, 1, 0.6, col(0x2b2533));
    const drum = b.m(G.cyl8, col(0xd04a2a), 7.5, 1.2, 13, 0.6, 1.3, 0.6); drum.rotation.z = 1.1;
    W.animated.push(dt => { drum.rotation.y += dt * 1.5; });
    b.solid(7.5, 13, 1.4, 1.2, 0.6, 1.1);
    b.m(G.box, glow(0xff8a1f), 1.5, 2.6, 9.6, 0.25, 0.25, 0.25);
    b.lamp(23, 16.5, -Math.PI / 2);
    b.zone('floor', 2, 10.5, 15, 23); b.zone('floor', 13, 11, 23, 16.8);
    b.spawn(10, 20); b.spawn(14, 12.5);
    b.hw(() => { b.pumpkin(11, 15.4, 0.35, 0.18); b.pumpkin(6.4, 20.6, 0.4); });
  },
};
