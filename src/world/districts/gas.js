import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { addZone } from '../physics.js';

// Заправка с автомойкой: щётки отбрасывают, масляные лужи скользкие
export default {
  id: 'gas', name: 'Заправка', ground: 'asphalt',
  build(b) {
    b.ground(3, 4.5, 15, 13.5, T.concrete(), 3);
    for (const [x, z] of [[4.5, 5.5], [13.5, 5.5], [4.5, 12.5], [13.5, 12.5]]) b.box(x, z, 0.45, 0.45, 4, col(0xd8d8e0));
    b.box(9, 9, 10.5, 8.6, 0.45, col(0xd8243a), { y: 4, fade: true });
    
    for (const z of [6.5, 11.5]) b.m(G.box, glow(0xfff1d0), 9, 3.98, z, 6, 0.04, 0.4);
    b.light(9, 9, 5);
    for (const z of [6.6, 11.4]) {
      b.box(9, z, 4, 1, 0.18, tmat(T.concrete()));
      for (const x of [7.6, 10.4]) { b.box(x, z, 0.8, 0.55, 1.5, col(0xd8d8e0), { y: 0.18 }); b.m(G.box, tmat(T.screen()), x, 1.4, z + 0.28, 0.4, 0.3, 0.02); b.m(G.box, col(0xd8243a), x, 1.75, z, 0.82, 0.12, 0.57); }
    }
    b.car(9, 9, 0, 0x4a7ac8);
    b.house({ x: 15, z: 1, w: 8, d: 5, h: 3.2, wall: 0xd8d0c0, brick: false, lit: 0.9, door: { side: 's', at: 0.3 }, sign: ['МАГАЗИН', '#d8243a', '#f1e8ff'], floor: T.floorTile(),
      interior(b, r) { b.shelf(r.x0 + 4, r.z0 + 1.8, 3, 0); b.box(r.x1 - 0.6, r.z1 - 1.6, 0.8, 2.2, 1.0, tmat(T.wood())); b.box(r.x0 + 0.5, r.z0 + 0.4, 0.6, 0.6, 1.5, col(0x3a3a40)); } });
    // автомойка
    const mt = col(0x4a6a8a);
    b.box(19.5, 13.2, 7, 0.3, 3, mt); b.box(19.5, 19.8, 7, 0.3, 3, mt);
    b.box(19.5, 16.5, 7.2, 6.9, 0.3, tmat(T.metal()), { y: 3, fade: true });
    b.sign(19.5, 3.6, 19.97, 0, 'МОЙКА', '#4ab0f0', '#f1e8ff', 2.4, 0.5);
    const brushes = [];
    for (const z of [14.3, 18.7]) { const br = b.m(G.cyl8, col(0x2a7ac8), 19.5, 1.4, z, 0.55, 2.6, 0.55); brushes.push(br); }
    const top = b.m(G.cyl8, col(0xd8243a), 19.5, 2.5, 16.5, 0.5, 4.2, 0.5); top.rotation.x = Math.PI / 2; brushes.push(top);
    W.animated.push(dt => { brushes[0].rotation.y += dt * 9; brushes[1].rotation.y -= dt * 9; brushes[2].rotation.y += dt * 9; });
    addZone('wash', { r: [b.X(18.7), b.Z(14.9), b.X(20.3), b.Z(18.1)] }, b.Y, { cx: b.X(19.5), cz: b.Z(16.5) });
    b.slip(6, 17, 1.3); b.slip(11.5, 19, 1.0);
    for (let i = 0; i < 4; i++) { const t = b.m(G.cyl12, col(0x17111f), 2, 0.17 + i * 0.32, 20.5, 0.45, 0.3, 0.45); }
    b.solid(2, 20.5, 0.9, 0.9, 0, 1.3);
    b.barrel(1.8, 2.5); b.barrel(2.8, 2.2);
    b.m(G.cyl6, col(0x2b2533), 2, 2.5, 7, 0.1, 5, 0.1); b.solid(2, 7, 0.3, 0.3, 0, 5);
    b.box(2, 7, 1.6, 0.2, 1.4, col(0xd8243a), { y: 4.2, solid: false }); b.sign(2, 4.9, 7.12, 0, '95  59.90', '#17111f', '#f5c542', 1.4, 0.4);
    b.lamp(1, 22.5, Math.PI / 2); b.lamp(14, 22.5, Math.PI);
    b.zone('floor', 1, 14, 15.5, 23); b.zone('floor', 15, 7, 23, 12.5);
    b.spawn(8, 21); b.spawn(3, 15);
    b.hw(() => { b.pumpkin(16.5, 6.8, 0.4); b.pumpkin(21.5, 6.8, 0.35); b.web(4.5, 3.6, 5.8, 0, 1); });
  },
};
