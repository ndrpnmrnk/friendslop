import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Автостоянка: по машинам можно прыгать, шлагбаум, будка охраны с креслом на колёсиках,
// кирпичная ограда вдоль края (ломается)
export default {
  id: 'parking', name: 'Автостоянка', ground: 'asphalt',
  build(b) {
    for (let i = 0; i < 10; i++) { b.marking(1.6 + i * 3.2, 5.2, 0.22, 4.4); b.marking(1.6 + i * 3.2, 20, 0.22, 4.4); }
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
    const pm = col(0x305c88); b.box(14, 12.4, 0.48, 0.4, 1.55, [pm, pm, pm, pm, tmat(T.parkingMeter()), pm]);
    for (const x of [6, 22]) b.planter(x, 12.4, 4, 1.2, 0.4, 'tree');
    for (let x = 2; x <= 30; x += 4) if (x !== 14) b.bollard(x, 1.6);
    b.trashBags(5.8, 30.6, 3); b.utilityBox(9, 30.8, Math.PI); b.ride('cart', 27, 13.5, 1.2); b.tires(29.5, 30.3, 4);
    // Конусы отмечают стоянку автобуса, а не стоят поперёк свободного проезда.
    b.cone(28.5, 26.5); b.cone(28.5, 29.5);
    b.bus(23, 28); b.zone('roof', 19, 27, 27, 29, 2.9);
    b.crate(17.5, 28.5, 1.2); b.crate(17.5, 28.5, 1.0, 1.2);
    b.zone('floor', 1, 8.6, 31, 16.6); b.zone('floor', 13, 23.6, 31, 31);
    b.cats(1, 9, 31, 16);
    b.spawn(16, 14.5); b.spawn(22, 24.5);
    b.hw(() => { b.pumpkin(6.5, 25.8); b.web(1.2, 2.2, 30.3, 0, 0.8); });
  },
};
