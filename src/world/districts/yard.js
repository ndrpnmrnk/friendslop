import { THREE, G, tmat, col, lam } from '../../core/gfx.js';
import { addSwinger } from '../swingers.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';

// Двор: подъезд с интерьером, пожарная лестница, бег по крышам через мостик на пристройку,
// плоские гаражи, сарай и забор (ломаются), качели, горка, скейт
export default {
  id: 'yard', name: 'Двор', ground: 'pave',
  build(b) {
    // жилой дом на 4 этажа: подъезд, квартиры, лестница до крыши
    b.tower({ x: 4, z: 1, w: 20, d: 9, floors: 4, fh: 3.8, wall: 0x7c6a9c,
      door: { side: 's', at: 0.5, sign: ['ПОДЪЕЗД 3', '#2a1f3d', '#f5c542'] }, gaps: [{ side: 'e', at: 0.5 }, { side: 'w', at: 0.5 }], floor: T.floorTile(),
      interior(f, k, r) {
        const back = r.z1 - 0.8, front = r.z0 + 1.0;
        if (k === 0) {
          f.box(18, 1.42, 2.6, 0.3, 1.1, tmat(T.mailbox()), { y: 1 });
          f.bench(19.5, back, Math.PI); f.plantPot(22.9, back); f.rug(14, front, 2, 2);
          f.box(r.x1 - 0.2, 4.6, 0.3, 1.6, 0.8, tmat(T.vent(0xd8d0c0)), { y: 0.3 }); f.trashBags(22.5, 2, 2); return;
        }
        f.partition(15.5, 1.25, 15.5, r.z1, 3.6, 0.65, 2);
        if (k === 1) {
          f.sofa(9, back, Math.PI); f.tvStand(9, front, 0); f.cupboard(5.2, back, Math.PI); f.rug(9, (front + back) / 2, 2.6, 1.6, '#4a6a9a', '#f1e8ff');
          f.table(13.5, back - 0.7, 0.7); f.chair(13.5, back + 0.1, Math.PI);
          f.kitchen(19.5, 1.6, 3); f.table(20, 6, 0.9); f.chair(19, 6, Math.PI / 2); f.chair(21, 6, -Math.PI / 2); f.plantPot(23.3, back);
        } else if (k === 2) {
          f.bed(12.8, back - 0.6, Math.PI / 2, 0x7b4bc4); f.wardrobe(5, back, 0); f.rug(9, front + 1, 3, 2);
          f.bed(22.4, back - 0.7, Math.PI, 0x6aa84f); f.wardrobe(16.4, 2, Math.PI / 2); f.desk(19.5, back, Math.PI, true); f.item('ball', 18.5, 4.5);
        } else {
          for (const [x, z, size] of [[5.2, back, 1], [6.4, back, 0.9]]) f.crate(x, z, size);
          f.shelf(13, r.z1 - 0.3, 2.6, Math.PI); f.item('chair', 9, front);
          f.sofa(20, back, Math.PI, 0x3a5a4a); f.tvStand(20, 4.2, 0); f.plantPot(23.3, 4.3);
        }
      } });
    b.dropLadder(4, 4.5, 'w', 15.2);
    b.tower({ x: 25, z: 1, w: 6, d: 9, floors: 4, fh: 3.8, wall: 0x9c6a6a, door: { side: 's', at: 0.5 }, gaps: [{ side: 'w', at: 0.5 }],
      run: 0.3, entry: 1.5, lane: 1.65, floor: T.floorWood(),
      interior(f, k, r) { if (k % 2 === 0) f.shelf(k === 0 ? r.x1 - 0.85 : (r.x0 + r.x1) / 2, r.z1 - 0.3, k === 0 ? 1.4 : 3.4, Math.PI); else { f.table((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, 0.8); f.chair((r.x0 + r.x1) / 2 + 0.9, (r.z0 + r.z1) / 2, -Math.PI / 2); } } });
    b.plank(24, 4.5, 25, 4.5, 15.2, 1.1);
    // на крыше: водонапорный бак, антенны, кондиционеры
    b.box(17, 5, 2.4, 2.4, 0.6, tmat(T.metal()), { y: 15.2 }); b.m(G.cyl12, tmat(T.rust()), 17, 17.1, 5, 1.1, 2.2, 1.1); b.m(G.cone8, tmat(T.rust()), 17, 18.6, 5, 1.2, 0.8, 1.2); b.solid(17, 5, 2.2, 2.2, 15.8, 2.2);
    for (const [x, z] of [[16.1, 4.1], [17.9, 4.1], [16.1, 5.9], [17.9, 5.9]]) b.m(G.box, col(0x3a3440), x, 15.5, z, 0.08, 0.6, 0.08);
    for (const x of [14, 19]) b.aircon(x, 2.6, 15.2);
    for (const x of [11, 21]) { b.m(G.cyl5, col(0x2b2533), x, 16.4, 6.5, 0.04, 2.4, 0.04); b.m(G.box, col(0x2b2533), x, 17.3, 6.5, 0.9, 0.04, 0.04); }
    // детская площадка: резиновое покрытие, качели, турник
    b.ground(4.5, 13.6, 12.5, 18.4, T.court(), 2);
    b.swingSet(8.5, 16, 5.2, 0);
    { const fr = col(0xd8243a); for (const x of [13.6, 15.2]) { b.m(G.cyl6, fr, x, 1.0, 17.6, 0.05, 2.0, 0.05); b.solid(x, 17.6, 0.15, 0.15, 0, 2); } b.m(G.cyl6, col(0x9a9da8), 14.4, 1.95, 17.6, 0.03, 1.7, 0.03).rotation.z = Math.PI / 2; }
    // горка
    b.box(17, 13, 1.2, 1.2, 0.12, col(0xd04a4a), { y: 1.25 });
    for (const [x, z] of [[16.45, 12.45], [17.55, 12.45], [16.45, 13.55], [17.55, 13.55]]) b.m(G.box, col(0xf5c542), x, 0.62, z, 0.08, 1.25, 0.08);
    b.solid(17, 13, 1.2, 1.2, 0, 1.25);
    b.ladder(17, 12.4, 'n', 1.37);
    // скат: верхний край у площадки, нижний — у земли, с бортиками; по нему съезжаешь
    { const ang = Math.atan2(1.3, 3.0), L = Math.hypot(1.3, 3.0), zc = 13.6 + 1.5;
      const sl = b.m(G.box, col(0x4ab0f0), 17, 0.72, zc, 0.8, 0.06, L); sl.rotation.x = ang;
      for (const sx of [-0.43, 0.43]) { const r = b.m(G.box, col(0xf5c542), 17 + sx, 0.84, zc, 0.06, 0.16, L); r.rotation.x = ang; }
      b.m(G.box, col(0xf5c542), 17, 0.04, 16.75, 0.9, 0.08, 0.3);
      for (let i = 0; i < 6; i++) { const z0 = 13.6 + i * 0.5; b.solid(17, z0 + 0.25, 0.8, 0.5, 0, 1.3 * (1 - (i + 1) / 6) + 0.06); }
      W.slides.push({ x0: b.X(16.6), x1: b.X(17.4), z0: b.Z(13.6), z1: b.Z(16.6), y: b.Y, dx: 0, dz: 1 }); }
    // песочница и ведро с шариками
    b.ground(2.5, 20, 7.5, 25, T.dirt(), 2);
    for (const [x, z, w, d] of [[5, 19.9, 5.2, 0.2], [5, 25.1, 5.2, 0.2], [2.4, 22.5, 0.2, 5.2], [7.6, 22.5, 0.2, 5.2]]) b.box(x, z, w, d, 0.3, tmat(T.wood()));
    b.m(G.cyl8, col(0x3a7ac8), 9, 0.25, 21, 0.25, 0.5, 0.25); b.solid(9, 21, 0.5, 0.5, 0, 0.5);
    b.item('balloon', 9.7, 21.4); b.item('balloon', 8.4, 21.6); b.item('balloon', 9.2, 20.2);
    // плоские гаражи: на крышу — с мусорного бака
    const gc = [0x6a5a4a, 0x4a6a5a, 0x5a5a7a];
    for (let i = 0; i < 3; i++) { const x = 23.5 + i * 2.8; b.box(x, 25, 2.7, 5, 2.3, tmat(T.corrugated(gc[i]))); b.m(G.box, tmat(T.roof()), x, 2.32, 25, 2.75, 0.04, 5.05); }
    b.dumpster(20.6, 25.5); b.mattress(22, 21.6, 0.1);
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
    [[13, 0xd8243a], [14.3, 0xf1e8ff], [15.6, 0x4ab0f0], [16.9, 0xf5c542]].forEach(([x, c]) => {
      const p = new THREE.Group(); p.position.set(b.X(x), b.Y + 2.1, b.Z(28)); W.group.add(p);
      const cl = new THREE.Mesh(G.plane, lam({ map: T.laundry(c), alphaTest: 0.4, side: THREE.DoubleSide }, 'laundry' + c)); cl.position.y = -0.42; cl.scale.set(0.8, 0.8, 1); p.add(cl);
      addSwinger(p, { len: 0.5, damp: 1.4, max: 1.2, r: 0.45, idle: 0.06 });
    });
    b.bench(11, 10.9, 0); b.bench(21, 12, -Math.PI / 2);
    b.bikeRack(6, 10.9, 3, 0); b.graffiti(26.5, 1.2, 22.44, Math.PI, 2.2, 0); b.puddle(14, 18, 1.1); b.puddle(24, 15, 0.8);
    b.wires(9, 12, 8.05, 1.2, 3.4, 19, 2); b.trashBags(18.6, 26.2, 3); b.postBox(23.2, 10.8, 0); b.planter(18, 10.9, 3, 0.9, 0.4, 'flowers');
    b.tree(30, 13); b.tree(1.8, 14); b.tree(29.5, 30); b.bin(2, 9.5);
    b.lamp(1.2, 19, Math.PI / 2); b.lamp(30.8, 20, -Math.PI / 2);
    // зиплайн с крыши дома на крышу гаражей, качели-катапульта, грабли у сарая, детская машинка
    b.zipline(8, 16.1, 7.1, 24.5, 4.65, 24.2);
    b.seesaw(15.6, 20.6, Math.PI / 2); b.rake(6.8, 28.6, 0.4); b.ride('kidcar', 12.5, 11.5, 1.2);
    b.zone('floor', 1, 10.5, 31, 19); b.zone('floor', 9, 19, 21, 30.5);
    b.cats(1, 9.5, 21, 30.5);
    b.spawn(16, 11); b.spawn(11, 29);
    b.hw(() => { b.pumpkin(12.6, 8.8); b.pumpkin(3, 19.4); b.web(4.3, 3, 1.3, 0, 1); });
  },
};
