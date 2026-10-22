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
    b.plank(24.8, 8, 26.4, 8, 3.45, 1.4);
    // Лестница выходит выше перекрытия; опорная площадка без зазора.
    b.ladder(29.8,9.8,'s',3.55);b.box(28,8,3.6,3.6,.12,wd,{y:3.45});
    for(const z of [6.2,9.8]){b.m(G.box,mt,28,1.7,z,.08,3.8,.08).rotation.z=.8;b.m(G.box,tmat(T.hazard()),28,3.65,z,3.6,.13,.04);}
    b.cementPallet(17.5,27);b.brickStack(23,19);
    b.box(22,8,.18,5.8,.18,mt,{y:3.45});b.box(16,8,.18,5.8,.18,mt,{y:3.45});
    // сарай в зоне досягаемости крана
    b.shed(3, 15, 4, 3.5);
    // бытовка
    b.house({ x: 20, z: 23.5, w: 6.5, d: 3.4, h: 2.6, wall: 0x3a6a9a, brick: false, door: { side: 'n', at: 0.3 }, parapet: false, web: false,
      interior(b, r) { b.ptable(r.x0 + 1.2, (r.z0 + r.z1) / 2 + 0.3, 0.8); b.chair(r.x0 + 3.4, r.z1 - 0.5, Math.PI); b.cabinet(r.x1 - 0.4, (r.z0 + r.z1) / 2, 0.5, 1.6, 1.6, 0x58616b, 0, -Math.PI / 2); } });
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
    W.keep.push(mixer); W.animated.push(dt => { drum.rotation.y += dt * 1.5; }); b.solid(7.5, 24, 1.4, 1.3, 0, 1.8);
    // Закреплённый рабочий фонарь вместо висящего куба.
    b.box(1.5,13.6,.08,.08,2.4,mt);b.m(G.box,col(0x2b2533),1.5,2.44,13.6,.4,.3,.22);b.m(G.box,glow(0xffc070),1.5,2.44,13.73,.30,.19,.02);
    // биотуалет, мешки цемента, шины, конусы
    b.potty(29.6, 29.6, Math.PI); b.puddle(10, 17, 1.3); b.puddle(24, 26, 1); b.potty(28.2, 29.6, Math.PI); b.cementPallet(21.5, 17.4); b.brickStack(10, 14);
    W.spots.demo.push({ x: b.X(9.5), z: b.Z(1.8), y: b.Y, pieces: [] }); b.tires(2.2, 29.6, 3); b.cone(14.5, 21.5); b.cone(15.5, 23);
    b.lamp(31, 20, -Math.PI / 2); b.lamp(12.5, 15, 0);
    b.zipline(6.0, 13.2, 4.0, 13.5, 2.6, 21.5); b.rake(18, 22.5, 1.0); b.rake(27, 15, -0.6);
    // прожекторы на мачтах, светят на площадку
    for (const [x, z, ry] of [[1.6, 21, Math.PI / 2], [30.4, 13, -Math.PI / 2]]) { b.m(G.cyl6, col(0x2b2533), x, 3, z, 0.08, 6, 0.08); b.solid(x, z, 0.3, 0.3, 0, 6);
      const hd = b.m(G.box, col(0x2b2533), x + Math.sin(ry) * 0.3, 5.9, z, 0.5, 0.4, 0.7); hd.rotation.y = ry; b.m(G.box, glow(0xfff4d8), x + Math.sin(ry) * 0.56, 5.9, z, 0.04, 0.3, 0.55).rotation.y = ry;
      b.light(x + Math.sin(ry) * 5, z, 4.5); }
    // кучи песка и щебня, связка арматуры
    { const sand = b.m(G.cone8, col(0xc8a868), 22, 0.55, 28.6, 1.8, 1.1, 1.5); sand.rotation.y = 0.4; b.solid(22, 28.6, 2.2, 1.8, 0, 0.8);
      const gr = b.m(G.cone8, col(0x6a6670), 25.5, 0.45, 28.8, 1.4, 0.9, 1.2); gr.rotation.y = 1.1; b.solid(25.5, 28.8, 1.8, 1.4, 0, 0.7);
      for (let i = 0; i < 7; i++) b.m(G.cyl5, tmat(T.rust()), 4.5, 0.08 + (i % 3) * 0.07, 28.5 + (i - 3) * 0.09, 0.025, 4, 0.025).rotation.z = Math.PI / 2; b.solid(4.5, 28.5, 4, 0.7, 0, 0.25); }
    // баннер застройщика на сетке забора
    b.m(G.box, tmat(T.sign('ЖК «ТЫКВА» · 2027', '#d8243a', '#f1e8ff')), 6.5, 1.1, 31.1, 4.4, 1.1, 0.03); b.m(G.box, tmat(T.sign('ОСТОРОЖНО · КРАН', '#f5c542', '#17111f')), 25.5, 1.1, 31.1, 4, 1.0, 0.03);
    // огороженный котлован под фундамент: свежий бетон и ленты
    { b.ground(18.5, 13.8, 26, 15.4, T.concrete(), 1.5); for (const x of [18.5, 22.25, 26]) for (const z of [13.8, 15.4]) { b.m(G.cyl6, col(0xd8243a), x, 0.45, z, 0.04, 0.9, 0.04); }
      for (const z of [13.8, 15.4]) b.m(G.box, tmat(T.hazard()), 22.25, 0.8, z, 7.5, 0.08, 0.01); }
    b.zone('floor', 2, 13.5, 19, 30.5); b.zone('floor', 19, 13.5, 31, 22.5);
    b.spawn(16, 15); b.spawn(24, 29.5);
    b.hw(() => { b.pumpkin(13, 18.8, 0.35, 0.18); b.pumpkin(9, 28.6); });
  },
};
