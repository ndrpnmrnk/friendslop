import { THREE, G, tmat, smat, col, lam, glow } from '../../core/gfx.js';
import { addSwinger } from '../swingers.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { sfx } from '../../core/sfx.js';

/* Двор (v0.60, 44×44 по схеме): П-образный жилой дом — северное крыло на три подъезда (3 этажа) и западное крыло,
   ряд гаражей с плоскими крышами на востоке. В центре фишка — КАЧЕЛИ-КАТАПУЛЬТА: раскачайся (W/S в такт),
   на высшей точке загорается фонарь на перекладине и скрип становится громче — жми пробел: улетаешь на крыши гаражей.
   Мусорный бак у гаражей — цель для захвата: затащил соперника — сидит в баке 3 с, крышка подпрыгивает.
   Детская площадка, песочница, бельё на верёвках, сарай, зиплайн с крыши дома на гаражи. */
export default {
  id: 'yard', name: 'Двор', ground: 'pave', size: 44,
  build(b) {
    /* ---------- северное крыло: три подъезда ---------- */
    const walls = [0x7c6a9c, 0x8a6a6a, 0x6a7a8c];
    for (let i = 0; i < 3; i++) {
      const x = 2 + i * 13.34;
      b.tower({ x, z: 2, w: 13.34, d: 8.2, floors: 3, fh: 3.8, wall: walls[i], brick: i !== 1, lit: .55,
        door: { side: 's', at: .5, sign: ['ПОДЪЕЗД ' + (i + 1), '#2a1f3d', '#f5c542'] }, floor: i === 1 ? T.floorWood() : T.floorTile(),
        fireEscape: i === 2 ? { side: 'e', at: .55 } : null,
        interior(f, k, r) {
          const back = r.z1 - .7, front = r.z0 + .9, cx = (r.x0 + r.x1) / 2;
          if (k === 0) { f.box(r.x0 + 1.4, r.z0 + .2, 2.4, .3, 1.1, tmat(T.mailbox()), { y: 1 }); f.bench(cx + 2, back, Math.PI); f.plantPot(r.x1 - .5, back); f.rug(cx, (front + back) / 2, 2, 2.6); return; }
          if ((k + i) % 2) { f.sofa(cx - 1.6, back, Math.PI, [0x4a6a9a, 0x9a4a5a, 0x5a8a5a][i]); f.tvStand(cx - 1.6, front + .3, 0); f.rug(cx - 1.6, (front + back) / 2, 2.6, 1.6, '#4a6a9a', '#f1e8ff'); f.kitchen(r.x1 - 1.2, r.z0 + .4, 2.4); f.ptable(r.x1 - 1.6, back - .8, .8); f.chair(r.x1 - 1.6, back, Math.PI); }
          else { f.bed(r.x0 + 1.2, back - .6, Math.PI / 2, [0x7b4bc4, 0x6aa84f, 0xc46a4b][i]); f.wardrobe(r.x1 - .5, back, Math.PI); f.desk(cx + 1, front + .2, 0, true); f.rug(cx, (front + back) / 2, 2.4, 1.8); f.plantPot(r.x1 - .5, front); }
        } });
    }
    // на крыше: водонапорный бак, антенны, кондиционеры
    b.box(22, 5.5, 2.4, 2.4, .6, tmat(T.metal()), { y: 11.4 }); b.m(G.cyl12, tmat(T.rust()), 22, 13.3, 5.5, 1.1, 2.2, 1.1); b.m(G.cone8, tmat(T.rust()), 22, 14.8, 5.5, 1.2, .8, 1.2); b.solid(22, 5.5, 2.2, 2.2, 12, 2.2);
    for (const x of [8, 34]) b.aircon(x, 3.4, 11.4);
    for (const x of [12, 30]) { b.m(G.cyl5, col(0x2b2533), x, 12.6, 7, .04, 2.4, .04); b.m(G.box, col(0x2b2533), x, 13.5, 7, .9, .04, .04); }

    /* ---------- западное крыло ---------- */
    b.tower({ x: 2, z: 11, w: 8.2, d: 20, floors: 2, fh: 3.8, wall: 0x8c7a5a, brick: true, lit: .5,
      door: { side: 'e', at: .5, sign: ['ПОДЪЕЗД 4', '#2a1f3d', '#9be36b'] }, floor: T.floorWood(),
      interior(f, k, r) { const cz = (r.z0 + r.z1) / 2;
        if (k === 0) { for (const z of [r.z0 + 1, r.z0 + 2.2]) f.crate(r.x0 + .7, z, .9); f.shelf(r.x0 + .3, cz + 3, 2.6, Math.PI / 2, 'office'); f.bench(r.x1 - .6, cz - 4, -Math.PI / 2); f.plantPot(r.x1 - .5, r.z1 - .5); f.rug((r.x0 + r.x1) / 2, cz, 2, 3); return; }
        f.bed(r.x0 + 1.1, r.z1 - 1.4, 0, 0x4a7ab4); f.wardrobe(r.x0 + .4, cz, Math.PI / 2); f.sofa(r.x1 - .6, cz - 3, -Math.PI / 2); f.tvStand(r.x0 + .5, cz - 3, Math.PI / 2); f.kitchen(r.x0 + .4, r.z0 + 2.4, 2.4); f.rug((r.x0 + r.x1) / 2, cz - 3, 2.4, 2); } });

    /* ---------- гаражи: четыре бокса, плоские крыши, ворота во двор ---------- */
    const gc = [0x6a5a4a, 0x4a6a5a, 0x5a5a7a, 0x7a4a4a];
    for (let i = 0; i < 4; i++) { const z = 14.5 + i * 5;
      b.box(38, z, 8, 4.9, 2.6, smat(T.corrugated(gc[i])));
      b.m(G.box, tmat(T.roof()), 38, 2.63, z, 8.1, .06, 5);
      b.m(G.box, tmat(T.corrugated(0x9a9488)), 33.97, 1.1, z, .04, 2.0, 3.6); // ворота
      b.m(G.box, col(0x2b2533), 33.95, 2.15, z, .06, .12, 3.8); b.m(G.box, col(0xd8d0c0), 33.94, .5, z + 1.2, .03, .14, .14);
      b.climbTrim(38, z, 8, 4.9, 2.6);
    }
    b.zone('roof', 34, 12, 42, 32, 2.66);
    b.ladder(33.9, 24.5, 'w', 2.6);

    /* ---------- фишка: качели-катапульта ---------- */
    const SX = 25, SZ = 21, seats0 = (W.swingSeats || []).length;
    b.ground(21.5, 17, 29.5, 25, T.court(), 2, .016);
    b.swingSet(SX, SZ, 4.6, Math.PI / 2);
    const seats = (W.swingSeats || []).slice(seats0); for (const s of seats) { s.catapult = true; s.max = 1.25; }
    const lamp = b.warnLamp(SX, 2.75, SZ, 0xffd060, .26);
    { let creak = 0; W.animated.push((dt) => { let amp = 0; for (const s of seats) amp = Math.max(amp, Math.abs(s.ang)); const hot = amp > seats[0].max * .62;
        lamp.set(hot ? 1 : amp / seats[0].max * .3); creak -= dt;
        for (const s of seats) { const turn = Math.sign(s.vel) !== Math.sign(s.prevV || 0); s.prevV = s.vel; if (turn && Math.abs(s.ang) > .45 && creak <= 0) { creak = .3; sfx('squeak', { at: { x: b.X(SX), y: b.Y + 2, z: b.Z(SZ) }, v: .3 + Math.abs(s.ang) * .5 }); } } }); }

    /* ---------- детская площадка, песочница, горка ---------- */
    b.ground(11, 13.5, 19, 19.5, T.court(), 2, .016);
    b.box(13, 16, 1.2, 1.2, .12, col(0xd04a4a), { y: 1.25 });
    for (const [x, z] of [[12.45, 15.45], [13.55, 15.45], [12.45, 16.55], [13.55, 16.55]]) b.m(G.box, col(0xf5c542), x, .62, z, .08, 1.25, .08);
    b.solid(13, 16, 1.2, 1.2, 0, 1.25); b.ladder(12.4, 16, 'w', 1.37);
    { const ang = Math.atan2(1.3, 3.0), L = Math.hypot(1.3, 3.0), xc = 13.6 + 1.5;
      const sl = b.m(G.box, col(0x4ab0f0), xc, .72, 16, L, .06, .8); sl.rotation.z = -ang;
      for (const sz of [-.43, .43]) { const r = b.m(G.box, col(0xf5c542), xc, .84, 16 + sz, L, .16, .06); r.rotation.z = -ang; }
      for (let i = 0; i < 6; i++) b.solid(13.6 + i * .5 + .25, 16, .5, .8, 0, 1.3 * (1 - (i + 1) / 6) + .06);
      W.slides.push({ x0: b.X(13.6), x1: b.X(16.6), z0: b.Z(15.6), z1: b.Z(16.4), y: b.Y, dx: 1, dz: 0 }); }
    b.seesaw(17.5, 18.4, 0);
    b.ground(25, 27, 29, 31, T.dirt(), 2, .016);
    for (const [x, z, w, d] of [[27, 26.9, 4.2, .2], [27, 31.1, 4.2, .2], [24.9, 29, .2, 4.2], [29.1, 29, .2, 4.2]]) b.box(x, z, w, d, .3, tmat(T.wood()));
    b.item('balloon', 26.2, 28.4); b.item('balloon', 27.8, 29.6); b.ride('kidcar', 18, 27, 1.2);

    /* ---------- мусорный бак — цель для захвата ---------- */
    const lid = b.dumpster(33, 36.5); W.keep.push(lid); const lidY = lid.position.y; let bounce = 0;
    b.grabTarget({ x: 33, z: 37.7, r: 1.3, kind: 'stash', t: 3, at: { x: 33, y: .5, z: 36.5 }, label: 'бак', onUse: () => { bounce = 3; } });
    W.animated.push(dt => { if (bounce <= 0) { if (lid.position.y !== lidY) lid.position.y = lidY; return; } bounce -= dt; const k = Math.abs(Math.sin(bounce * 11)) * .18 * Math.min(1, bounce); lid.position.y = lidY + k; lid.rotation.x = -k * .8; lid.updateMatrix(); if (Math.random() < dt * 4) sfx('bonk', { at: lid.position, v: .4 }); });
    b.trashBags(35.5, 37, 3); b.bin(31, 38.6);

    /* ---------- юг и запад: сарай, бельё, лавки, клумбы ---------- */
    b.shed(3.2, 36, 4, 3.5);
    for (const x of [12, 19]) { b.m(G.cyl6, col(0x6a6d78), x, 1.1, 38.5, .05, 2.2, .05); b.solid(x, 38.5, .2, .2, 0, 2.2); }
    b.m(G.box, col(0xd8d0c0), 15.5, 2.1, 38.5, 7, .02, .02);
    [[13, 0xd8243a], [14.4, 0xf1e8ff], [15.8, 0x4ab0f0], [17.2, 0xf5c542]].forEach(([x, c]) => {
      const p = new THREE.Group(); p.position.set(b.X(x), b.Y + 2.1, b.Z(38.5)); W.group.add(p);
      const cl = new THREE.Mesh(G.plane, lam({ map: T.laundry(c), alphaTest: .4, side: THREE.DoubleSide }, 'laundry' + c)); cl.position.y = -.42; cl.scale.set(.8, .8, 1); p.add(cl);
      addSwinger(p, { len: .5, damp: 1.4, max: 1.2, r: .45, idle: .06 }); });
    b.bench(12.5, 31.5, 0); b.bench(30.5, 33.5, 0); b.bench(20, 11.4, 0);
    b.planter(16, 11.2, 3, .9, .4, 'flowers'); b.planter(28, 11.2, 3, .9, .4, 'flowers');
    b.bikeRack(7, 11.4, 3, 0); b.postBox(36.5, 11.2, 0); b.graffiti(37, 1.2, 31.98, 0, 2.2, 0);
    b.wires(15.4, 9.6, 10.2, 34, 2.6, 15, 2);
    b.tree(12, 14 - 1.5); b.tree(30, 14.3); b.tree(6, 40); b.tree(39, 40); b.tree(20, 41.5, .8);
    b.bush(41, 34, 1.6, 1.2, .9); b.bush(12, 34.5, 1.6, 1.1, .8);
    b.lamp(11.2, 24, Math.PI / 2); b.lamp(32.8, 28, -Math.PI / 2); b.lamp(22, 35, 0);
    b.puddle(19, 24, 1.1); b.puddle(30, 18, .8);
    b.ride('skate', 20, 30, 1); b.rake(6.5, 34.2, .4); b.mattress(31, 20.6, .1);
    // зиплайн: с крыши среднего подъезда на крыши гаражей
    b.zipline(28.2, 11.6, 9.8, 37, 3.2, 20.5);
    b.zone('floor', 10.5, 11, 33.5, 43); b.zone('floor', 2, 31.5, 10.5, 43);
    b.cats(11, 13, 33, 43);
    b.spawn(22, 14.5); b.spawn(16, 33); b.spawn(28, 36);
    b.hw(() => { b.pumpkin(15.5, 10.9); b.pumpkin(3, 32.4); b.web(5.3, 2, 1.3, 0, 1); });
  },
};
