import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';

// Двор: подъезд с интерьером, пожарная лестница, бег по крышам через мостик на пристройку,
// плоские гаражи, сарай и забор (ломаются), качели, горка, скейт
export default {
  id: 'yard', name: 'Двор', ground: 'pave',
  build(b) {
    b.house({ x: 4, z: 1, w: 20, d: 7, h: 3.4, upper: 9.8, wall: 0x7c6a9c, roof: true,
      door: { side: 's', at: 0.5, sign: ['ПОДЪЕЗД 3', '#2a1f3d', '#f5c542'] }, ladder: { side: 'w', at: 0.5 }, gaps: [{ side: 'e', at: 0.5 }],
      inner: T.plaster(), floor: T.floorTile(),
      interior(b, r) {
        b.box(14, r.z0 + 0.15, 2.4, 0.3, 1.2, tmat(T.mailbox()), { y: 1.0 });
        for (let i = 0; i < 6; i++) b.box(r.x1 - 0.9, r.z1 - 0.8 - i * 0.55, 1.6, 0.55, 0.3 * (i + 1), tmat(T.concrete()));
        b.box(r.x0 + 0.4, 4.5, 0.3, 1.6, 0.8, col(0xd8d0c0), { y: 0.3 });
        b.bench(9, r.z0 + 0.5, 0);
      } });
    b.house({ x: 25, z: 1, w: 6, d: 7, h: 3.4, upper: 9.8, wall: 0x9c6a6a, roof: true, door: { side: 's', at: 0.5 }, gaps: [{ side: 'w', at: 0.5 }],
      interior(b, r) { b.shelf((r.x0 + r.x1) / 2, r.z0 + 0.3, 3.4, 0); } });
    b.plank(24, 4.5, 25, 4.5, 13.2, 1.1);
    // на крыше: водонапорный бак, антенны, кондиционеры
    b.box(8, 3, 2.4, 2.4, 0.6, tmat(T.metal()), { y: 13.2 }); b.m(G.cyl12, tmat(T.rust()), 8, 15.1, 3, 1.1, 2.2, 1.1); b.m(G.cone8, tmat(T.rust()), 8, 16.6, 3, 1.2, 0.8, 1.2);
    for (const x of [14, 19]) { b.box(x, 2.6, 1.2, 0.8, 0.8, col(0xa8a8b0), { y: 13.2 }); }
    for (const x of [11, 21]) { b.m(G.cyl5, col(0x2b2533), x, 14.4, 6.5, 0.04, 2.4, 0.04); b.m(G.box, col(0x2b2533), x, 15.3, 6.5, 0.9, 0.04, 0.04); }
    // качели
    const dk = col(0x3a4a6a), sx0 = 6, sx1 = 11, sz = 16, top = 2.5;
    for (const x of [sx0, sx1]) {
      for (const dz of [-0.75, 0.75]) { const leg = b.m(G.box, dk, x, top / 2, sz + dz / 2, 0.1, top + 0.15, 0.1); leg.rotation.x = -Math.sign(dz) * 0.3; }
      b.solid(x, sz, 0.3, 1.8, 0, top);
    }
    b.m(G.box, dk, (sx0 + sx1) / 2, top, sz, sx1 - sx0 + 0.2, 0.12, 0.12);
    for (const x of [7.6, 9.4]) {
      const p = new THREE.Group(); p.position.set(b.X(x), b.Y + top - 0.05, b.Z(sz)); W.group.add(p);
      for (const o of [-0.28, 0.28]) { const r = new THREE.Mesh(G.box, col(0x8a8d98)); r.position.set(o, -0.95, 0); r.scale.set(0.03, 1.9, 0.03); p.add(r); }
      const seat = new THREE.Mesh(G.box, tmat(T.wood())); seat.position.y = -1.92; seat.scale.set(0.7, 0.07, 0.32); p.add(seat);
      const ph = Math.random() * 6; W.animated.push((dt, t) => { p.rotation.x = Math.sin(t * 1.6 + ph) * 0.3; });
    }
    // горка
    b.box(17, 13, 1.2, 1.2, 0.12, col(0xd04a4a), { y: 1.25 });
    for (const [x, z] of [[16.45, 12.45], [17.55, 12.45], [16.45, 13.55], [17.55, 13.55]]) b.m(G.box, col(0xf5c542), x, 0.62, z, 0.08, 1.25, 0.08);
    b.solid(17, 13, 1.2, 1.2, 0, 1.25);
    for (let i = 0; i < 4; i++) b.box(17, 11.9, 0.8, 0.15, 0.06, col(0xf5c542), { y: 0.3 * (i + 1), solid: false });
    const sl = b.m(G.box, col(0x4ab0f0), 17, 0.7, 15.3, 0.8, 0.06, 3.2); sl.rotation.x = 0.4;
    // песочница и ведро с шариками
    b.ground(2.5, 20, 7.5, 25, T.dirt(), 2);
    for (const [x, z, w, d] of [[5, 19.9, 5.2, 0.2], [5, 25.1, 5.2, 0.2], [2.4, 22.5, 0.2, 5.2], [7.6, 22.5, 0.2, 5.2]]) b.box(x, z, w, d, 0.3, tmat(T.wood()));
    b.m(G.cyl8, col(0x3a7ac8), 9, 0.25, 21, 0.25, 0.5, 0.25); b.solid(9, 21, 0.5, 0.5, 0, 0.5);
    b.item('balloon', 9.7, 21.4); b.item('balloon', 8.4, 21.6); b.item('balloon', 9.2, 20.2);
    // плоские гаражи: на крышу — с мусорного бака
    const gc = [0x6a5a4a, 0x4a6a5a, 0x5a5a7a];
    for (let i = 0; i < 3; i++) { const x = 23.5 + i * 2.8; b.box(x, 25, 2.7, 5, 2.3, tmat(T.corrugated(gc[i]))); b.m(G.box, tmat(T.roof()), x, 2.32, 25, 2.75, 0.04, 5.05); }
    b.box(20.6, 25.5, 1.4, 1.1, 1.2, col(0x3e5a4a));
    b.zone('roof', 22.6, 23, 30.6, 27, 2.3);
    // сарай и деревянный забор
    b.shed(2, 27, 4, 3.5);
    b.fence(8, 31.2, 19, 31.2, 1.4, 'wood');
    // кирпичная оградка клумбы
    b.brickWall(26, 17, 6, 1.2, 'x');
    b.ground(23, 17.3, 29, 19.5, T.grass(), 2);
    b.ride('skate', 14, 22, 1);
    for (const x of [12, 18]) { b.m(G.cyl6, col(0x6a6d78), x, 1.1, 28, 0.05, 2.2, 0.05); b.solid(x, 28, 0.2, 0.2, 0, 2.2); }
    b.m(G.box, col(0xd8d0c0), 15, 2.1, 28, 6, 0.02, 0.02);
    [[13, 0xd8243a], [14.3, 0xf1e8ff], [15.6, 0x4ab0f0], [16.9, 0xf5c542]].forEach(([x, c], i) => {
      const p = new THREE.Group(); p.position.set(b.X(x), b.Y + 2.1, b.Z(28)); W.group.add(p);
      const cl = new THREE.Mesh(G.box, col(c)); cl.position.y = -0.4; cl.scale.set(0.8, 0.8, 0.02); p.add(cl);
      W.animated.push((dt, t) => { p.rotation.x = Math.sin(t * 2 + i) * 0.25; });
    });
    b.bench(12, 9.6, 0); b.bench(21, 12, -Math.PI / 2);
    b.tree(30, 13); b.tree(1.8, 14); b.tree(29.5, 30); b.bin(2, 9.5);
    b.lamp(1.2, 19, Math.PI / 2); b.lamp(30.8, 20, -Math.PI / 2);
    b.zone('floor', 1, 9.5, 31, 19); b.zone('floor', 9, 19, 21, 30.5);
    b.cats(1, 9.5, 21, 30.5);
    b.spawn(16, 11); b.spawn(11, 29);
    b.hw(() => { b.pumpkin(12.6, 8.8); b.pumpkin(3, 19.4); b.web(4.3, 3, 1.3, 0, 1); });
  },
};
