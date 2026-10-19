import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { buildCrane } from '../crane.js';

// Стройка: кран с шар-бабой (ломает стены недостроя и сарай), двухэтажный каркас со ступенями,
// леса с мостком на перекрытие, бытовка, тачка (можно кататься), кирпичи
export default {
  id: 'construction', name: 'Стройка', ground: 'dirt',
  build(b) {
    b.fence(1, 31.2, 12, 31.2, 1.8, 'mesh'); b.fence(20, 31.2, 31, 31.2, 1.8, 'mesh'); b.fence(0.8, 14, 0.8, 31, 1.8, 'mesh');
    buildCrane(b, 5, 5, [17, 6]);
    // недострой: колонны, перекрытие на 3.2 м, кирпичные стены ломаются
    const cc = tmat(T.concrete());
    for (const x of [13, 19, 25]) for (const z of [4, 12]) b.box(x, z, 0.5, 0.5, 3.2, cc);
    b.box(19, 8, 12.5, 8.5, 0.25, cc, { y: 3.2 });
    b.zone('roof', 13.6, 4.6, 24.4, 11.4, 3.45);
    b.brickWall(16, 4, 5.5, 3.2, 'x'); b.brickWall(22, 4, 5.5, 3.2, 'x');
    b.brickWall(16, 4, 5.5, 1.8, 'x', 3.45); 
    b.brickWall(13, 8, 7.4, 3.2, 'z');
    b.stairs(8.2, 10.6, 'e', 0, 3.2, 1.4);
    b.m(G.box, tmat(T.hazard()), 19, 0.6, 12.4, 11, 0.25, 0.04);
    // леса и мосток на перекрытие
    const wd = tmat(T.wood()), mt = col(0x6a6d78);
    for (const [x, z] of [[26.2, 6.2], [29.8, 6.2], [26.2, 9.8], [29.8, 9.8]]) b.box(x, z, 0.1, 0.1, 3.4, mt);
    for (const y of [1.6, 3.2]) b.box(28, 8, 3.8, 3.8, 0.1, wd, { y });
    b.ladder(30, 8, 'e', 3.3);
    b.plank(25.25, 8, 26, 8, 3.3, 1.2);
    // сарай в зоне досягаемости крана
    b.shed(3, 15, 4, 3.5);
    // бытовка
    b.house({ x: 20, z: 23.5, w: 6.5, d: 3.4, h: 2.6, wall: 0x3a6a9a, brick: false, door: { side: 'n', at: 0.3 }, parapet: false, web: false,
      interior(b, r) { b.table((r.x0 + r.x1) / 2 + 0.6, (r.z0 + r.z1) / 2, 0.8); b.chair(r.x0 + 3.4, r.z1 - 0.5, Math.PI); b.cabinet(r.x1 - 0.4, (r.z0 + r.z1) / 2, 0.5, 1.6, 1.6, 0x58616b, 0, -Math.PI / 2); } });
    // поддон с кирпичами, тачка
    b.pallet(12, 18);
    b.item('brick', 11.6, 17.8, 0.18); b.item('brick', 12.4, 17.8, 0.18); b.item('brick', 12, 18.3, 0.18); b.item('brick', 12, 17.6, 0.36);
    b.ride('barrow', 10, 21, 0.4);
    b.crate(16, 19, 1.1); b.crate(17.2, 19, 1.1); b.crate(16.6, 19, 1, 1.1);
    b.m(G.cone8, tmat(T.dirt()), 27, 0.7, 18, 2.2, 1.4, 2.2); b.solid(27, 18, 2.8, 2.8, 0, 1.2);
    for (const z of [27.6, 28.2, 28.8]) { const p = b.m(G.cyl8, tmat(T.rust()), 16, 0.3, z, 0.28, 3.6, 0.28); p.rotation.z = Math.PI / 2; }
    b.solid(16, 28.2, 3.6, 1.9, 0, 0.6);
    // Бетономешалка: рама, колёса, наклонённый барабан и открытая горловина.
    const mixer = b.prop(7.5, 24), frame = col(0x2b2533);
    for (const xx of [-0.48, 0.48]) { const leg = new THREE.Mesh(G.box, frame); leg.position.set(xx, 0.42, 0); leg.scale.set(0.09, 0.8, 0.1); leg.rotation.z = -xx * 0.55; mixer.add(leg); }
    for (const xx of [-0.6, 0.6]) { const wh = new THREE.Mesh(G.cyl8, frame); wh.position.set(xx, 0.2, -0.2); wh.scale.set(0.2, 0.12, 0.2); wh.rotation.z = Math.PI / 2; mixer.add(wh); }
    const tilt = new THREE.Group(); tilt.position.y = 1.15; tilt.rotation.x = 0.8; mixer.add(tilt);
    const drum = new THREE.Group(); tilt.add(drum);
    const geo = new THREE.CylinderGeometry(0.34, 0.58, 0.9, 8), shell = new THREE.Mesh(geo, tmat(T.corrugated(0xd04a2a))); drum.add(shell);
    const mouth = new THREE.Mesh(G.disc, frame); mouth.position.y = 0.458; mouth.rotation.x = -Math.PI / 2; mouth.scale.setScalar(0.3); drum.add(mouth);
    const wheel = new THREE.Mesh(G.torus, frame); wheel.position.set(0.66, 0.8, 0); wheel.rotation.y = Math.PI / 2; wheel.scale.setScalar(0.24); mixer.add(wheel);
    W.animated.push(dt => { drum.rotation.y += dt * 1.5; }); b.solid(7.5, 24, 1.4, 1.3, 0, 1.8);
    b.m(G.box, glow(0xff8a1f), 1.5, 2.6, 13.6, 0.25, 0.25, 0.25);
    b.lamp(31, 20, -Math.PI / 2); b.lamp(12.5, 15, 0);
    b.zone('floor', 2, 13.5, 19, 30.5); b.zone('floor', 19, 13.5, 31, 22.5);
    b.spawn(16, 15); b.spawn(24, 29.5);
    b.hw(() => { b.pumpkin(13, 18.8, 0.35, 0.18); b.pumpkin(9, 28.6); });
  },
};
