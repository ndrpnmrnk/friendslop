import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { addZone } from '../physics.js';

// Заправка: на навес — по лестнице на колонне, на магазин — по лестнице сбоку,
// витрина бьётся, автомойка отбрасывает, масляные лужи скользкие
export default {
  id: 'gas', name: 'Заправка', ground: 'asphalt',
  build(b) {
    b.ground(3, 5, 19, 17, T.concrete(), 3);
    for (const [x, z] of [[4.5, 6], [17.5, 6], [4.5, 16], [17.5, 16]]) b.box(x, z, 0.45, 0.45, 4, col(0xd8d8e0));
    b.box(11, 11, 14.5, 11.5, 0.45, col(0xd8243a), { y: 4, fade: true });
    b.box(18.3, 16, 0.1, 0.7, 4, col(0x6a6d78)); b.ladder(18.35, 16, 'e', 4.45);
    b.zone('roof', 4.6, 6, 17.4, 16, 4.45);
    for (const z of [7.5, 14.5]) b.m(G.box, glow(0xfff1d0), 11, 3.98, z, 8, 0.04, 0.4);
    b.light(11, 11, 6);
    for (const z of [8.5, 13.5]) {
      b.box(11, z, 5, 1, 0.18, tmat(T.concrete()));
      for (const x of [9.4, 12.6]) { b.box(x, z, 0.8, 0.55, 1.5, col(0xd8d8e0), { y: 0.18 }); b.m(G.box, tmat(T.screen()), x, 1.4, z + 0.28, 0.4, 0.3, 0.02); b.m(G.box, col(0xd8243a), x, 1.75, z, 0.82, 0.12, 0.57); }
    }
    b.car(11, 11, 0, 0x4a7ac8);
    b.house({ x: 20, z: 1, w: 10, d: 6, h: 3.2, wall: 0xd8d0c0, brick: false, lit: 0.9, door: { side: 's', at: 0.25 }, sign: ['МАГАЗИН', '#d8243a', '#f1e8ff'], floor: T.floorTile(),
      ladder: { side: 'e', at: 0.5 }, roof: true,
      interior(b, r) { b.shelf(r.x0 + 5, r.z0 + 2, 4, 0); b.box(r.x1 - 0.6, r.z1 - 1.8, 0.8, 2.4, 1.0, tmat(T.wood())); b.box(r.x0 + 0.5, r.z0 + 0.4, 0.6, 0.6, 1.5, col(0x3a3a40)); } });
    b.vitrine(26.5, 7.16, 4.2, 1.8, 'x', 0.5);
    // автомойка
    const mt = col(0x4a6a8a);
    b.box(25.5, 19.2, 9, 0.3, 3, mt); b.box(25.5, 26.8, 9, 0.3, 3, mt);
    b.box(25.5, 23, 9.2, 7.9, 0.3, tmat(T.metal()), { y: 3, fade: true });
    b.sign(25.5, 3.6, 26.97, 0, 'МОЙКА', '#4ab0f0', '#f1e8ff', 2.4, 0.5);
    const brushes = [];
    for (const z of [20.4, 25.6]) brushes.push(b.m(G.cyl8, col(0x2a7ac8), 25.5, 1.4, z, 0.55, 2.6, 0.55));
    const tb = b.m(G.cyl8, col(0xd8243a), 25.5, 2.5, 23, 0.5, 4.8, 0.5); tb.rotation.x = Math.PI / 2; brushes.push(tb);
    W.animated.push(dt => { brushes[0].rotation.y += dt * 9; brushes[1].rotation.y -= dt * 9; brushes[2].rotation.y += dt * 9; });
    addZone('wash', { r: [b.X(24.7), b.Z(21), b.X(26.3), b.Z(25)] }, b.Y, { cx: b.X(25.5), cz: b.Z(23) });
    b.slip(7, 22, 1.4); b.slip(14, 27, 1.1);
    for (let i = 0; i < 4; i++) b.m(G.cyl12, col(0x17111f), 2, 0.17 + i * 0.32, 26, 0.45, 0.3, 0.45);
    b.solid(2, 26, 0.9, 0.9, 0, 1.3);
    b.barrel(1.8, 2.5); b.barrel(2.8, 2.2); b.crate(2.3, 4.2, 1);
    b.m(G.cyl6, col(0x2b2533), 2, 2.5, 9, 0.1, 5, 0.1); b.solid(2, 9, 0.3, 0.3, 0, 5);
    b.box(2, 9, 1.6, 0.2, 1.4, col(0xd8243a), { y: 4.2, solid: false }); b.sign(2, 4.9, 9.12, 0, '95  59.90', '#17111f', '#f5c542', 1.4, 0.4);
    b.lamp(1, 30.5, Math.PI / 2); b.lamp(19, 30.5, Math.PI);
    b.zone('floor', 1, 18, 20, 31); b.zone('floor', 20, 8.5, 31, 17.5);
    b.spawn(10, 28); b.spawn(3, 19);
    b.hw(() => { b.pumpkin(21, 8); b.web(4.5, 3.6, 6.3, 0, 1); });
  },
};
