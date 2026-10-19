import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';

// Двор многоэтажки: подъезд с интерьером, пожарная лестница на крышу, качели, горка, гаражи
export default {
  id: 'yard', name: 'Двор', ground: 'pave',
  build(b) {
    b.house({ x: 3, z: 1, w: 16, d: 6, h: 3.4, upper: 6.2, wall: 0x7c6a9c, roof: true,
      door: { side: 's', at: 0.5, sign: ['ПОДЪЕЗД 3', '#2a1f3d', '#f5c542'] }, ladder: { side: 'e', at: 0.5 }, inner: T.plaster(), floor: T.floorTile(),
      interior(b, r) {
        b.box(11, r.z0 + 0.15, 2.4, 0.3, 1.2, tmat(T.mailbox()), { y: 1.0 });
        for (let i = 0; i < 6; i++) b.box(r.x0 + 0.9, r.z1 - 0.8 - i * 0.55, 1.6, 0.55, 0.3 * (i + 1), tmat(T.concrete()));
        b.box(r.x1 - 0.4, 3.5, 0.3, 1.6, 0.8, col(0xd8d0c0), { y: 0.3 });
        b.m(G.cyl8, tmat(T.rust()), r.x1 - 1.2, 0.35, r.z0 + 0.6, 0.3, 0.7, 0.3); b.m(G.ico, tmat(T.bush()), r.x1 - 1.2, 1.0, r.z0 + 0.6, 0.5, 0.6, 0.5); b.solid(r.x1 - 1.2, r.z0 + 0.6, 0.6, 0.6, 0, 1.2);
        b.bench(15, r.z0 + 0.5, 0);
      } });
    // качели
    const dk = col(0x3a4a6a);
    for (const x of [5, 9]) { b.m(G.box, dk, x, 1.25, 13.4, 0.1, 2.5, 0.1); b.m(G.box, dk, x, 1.25, 14.6, 0.1, 2.5, 0.1); b.solid(x, 14, 0.25, 1.5, 0, 2.5); }
    b.m(G.box, dk, 7, 2.5, 14, 4.2, 0.1, 0.1);
    for (const x of [6.1, 7.9]) {
      const p = new THREE.Group(); p.position.set(b.X(x), b.Y + 2.45, b.Z(14)); W.group.add(p);
      for (const o of [-0.3, 0.3]) { const r = new THREE.Mesh(G.box, col(0x6a6d78)); r.position.set(o, -0.85, 0); r.scale.set(0.03, 1.7, 0.03); p.add(r); }
      const s = new THREE.Mesh(G.box, tmat(T.wood())); s.position.y = -1.7; s.scale.set(0.75, 0.06, 0.35); p.add(s);
      const ph = Math.random() * 6; W.animated.push((dt, t) => { p.rotation.x = Math.sin(t * 1.6 + ph) * 0.35; });
    }
    // горка: площадка, лесенка, скат
    b.box(14, 13, 1.2, 1.2, 0.12, col(0xd04a4a), { y: 1.25 });
    for (const [x, z] of [[13.45, 12.45], [14.55, 12.45], [13.45, 13.55], [14.55, 13.55]]) b.m(G.box, col(0xf5c542), x, 0.62, z, 0.08, 1.25, 0.08);
    b.solid(14, 13, 1.2, 1.2, 0, 1.25);
    for (let i = 0; i < 4; i++) b.box(14, 11.9 - i * 0.01, 0.8, 0.15, 0.06, col(0xf5c542), { y: 0.3 * (i + 1), solid: false });
    const sl = b.m(G.box, col(0x4ab0f0), 14, 0.7, 15.3, 0.8, 0.06, 3.2); sl.rotation.x = 0.4;
    // песочница
    b.ground(2.5, 17.5, 6.5, 21.5, T.dirt(), 2);
    for (const [x, z, w, d] of [[4.5, 17.4, 4.2, 0.2], [4.5, 21.6, 4.2, 0.2], [2.4, 19.5, 0.2, 4.2], [6.6, 19.5, 0.2, 4.2]]) b.box(x, z, w, d, 0.3, tmat(T.wood()));
    // ведро с шариками
    b.m(G.cyl8, col(0x3a7ac8), 5.2, 0.25, 16.3, 0.25, 0.5, 0.25); b.solid(5.2, 16.3, 0.5, 0.5, 0, 0.5);
    b.item('balloon', 4.5, 16.2); b.item('balloon', 5.9, 16.0); b.item('balloon', 5.3, 15.5);
    // гаражи-ракушки
    for (const x of [18.7, 21.5]) {
      const m = tmat(T.corrugated(x > 20 ? 0x4a6a5a : 0x6a5a4a));
      b.m(G.box, m, x, 0.8, 19.5, 2.6, 1.6, 4); const top = b.m(G.cyl12, m, x, 1.6, 19.5, 1.3, 4, 1.3); top.rotation.x = Math.PI / 2; top.scale.set(1.3, 4, 0.7);
      b.solid(x, 19.5, 2.6, 4, 0, 2.3);
    }
    // бельё
    for (const x of [9.5, 15.5]) { b.m(G.cyl6, col(0x6a6d78), x, 1.1, 21.5, 0.05, 2.2, 0.05); b.solid(x, 21.5, 0.2, 0.2, 0, 2.2); }
    b.m(G.box, col(0xd8d0c0), 12.5, 2.1, 21.5, 6, 0.02, 0.02);
    [[10.6, 0xd8243a], [11.8, 0xf1e8ff], [13.1, 0x4ab0f0], [14.4, 0xf5c542]].forEach(([x, c], i) => {
      const p = new THREE.Group(); p.position.set(b.X(x), b.Y + 2.1, b.Z(21.5)); W.group.add(p);
      const cl = new THREE.Mesh(G.box, col(c)); cl.position.y = -0.4; cl.scale.set(0.8, 0.8, 0.02); p.add(cl);
      W.animated.push((dt, t) => { p.rotation.x = Math.sin(t * 2 + i) * 0.25; });
    });
    b.bench(9, 8.6, 0); b.bench(17.5, 9.5, -Math.PI / 2);
    b.tree(22, 11); b.tree(1.8, 12.5); b.bin(1.5, 8.3);
    b.lamp(1.2, 16, Math.PI / 2); b.lamp(22.8, 15, -Math.PI / 2);
    b.zone('floor', 1, 8.3, 23, 16.5); b.zone('floor', 7, 16.5, 17, 23);
    b.cats(1, 8.5, 17, 23);
    b.spawn(12, 11); b.spawn(3.5, 23);
    b.hw(() => { b.pumpkin(9.6, 7.6, 0.4); b.pumpkin(14.4, 7.6, 0.45); b.pumpkin(3.2, 16.8, 0.35); });
  },
};
