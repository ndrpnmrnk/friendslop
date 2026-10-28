import { buildHoop } from '../basketball.js';
import { THREE, G, tmat, col, paint, glow, compose } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { actors, knockDown } from '../../game/actors.js';
import { sfx } from '../../core/sfx.js';
import { smoke } from '../particles.js';

/* Школьный двор (v0.60, 44×44 по схеме): длинная двухэтажная школа на севере — классы, холл со шкафчиками,
   спортзал с матами; стадион с беговой дорожкой (юго-запад), турники (восток). Фишка — ЗВОНОК С УРОКА: звенит звонок,
   через 2 с из главных дверей вылетает толпа школьников и несётся по стрелкам к южным воротам, сбивая всех на пути.
   Маты в спортзале — цель для захвата: швырнул соперника на маты — отпружинит вверх. */
const RX0 = 19.5, RX1 = 25.5;
export default {
  id: 'school', name: 'Школьный двор', ground: 'pave', size: 44,
  build(b) {
    b.tower({ x: 3, z: 2, w: 38, d: 12, floors: 2, fh: 3.8, wall: 0x9a6a5a, lit: .6, door: { side: 's', at: .5, sign: ['ШКОЛА №13', '#2a1f3d', '#f5c542'] },
      ladder: { side: 'e', at: .55 }, floor: T.floorWood(), stairX: 16,
      interior(f, k, r) { const cz = (r.z0 + r.z1) / 2;
        if (k === 0) {
          f.partition(14.6, r.z0, 14.6, r.z1, 3.6, .55, 2); f.partition(29.4, r.z0, 29.4, r.z1, 3.6, .55, 2.4);
          // класс (запад)
          for (const x of [5.5, 8.3, 11.1]) for (const z of [cz - .6, cz + 1.8]) f.desk(x, z, Math.PI, false);
          f.whiteboard(8.5, 1.8, r.z0 + .05, 0, 3); f.ride('chair', 12.6, r.z0 + 1, 0); f.plantPot(4, r.z1 - .5);
          // холл со шкафчиками (центр)
          for (let i = 0; i < 6; i++) f.locker(16 + i * .6, r.z1 - .3, Math.PI, [0x4a6a8a, 0x8a4a4a][i % 2]);
          for (let i = 0; i < 6; i++) f.locker(23 + i * .6, r.z1 - .3, Math.PI, [0x4a8a6a, 0x8a7a4a][i % 2]);
          f.bench(22, cz - 1, 0); f.box(26.6, r.z0 + .6, 1.8, .8, .85, tmat(T.wood()));
          // спортзал с матами (восток)
          for (const [x, z] of [[33, cz - 1.5], [36, cz - 1.5], [39, cz - 1.5]]) { f.box(x, z, 2.6, 1.8, .35, col(0x3a6aa8)); f.m(G.box, col(0x2a4a7a), x, .36, z, 2.62, .02, 1.82); }
          for (const x of [r.x1 - .2]) for (let y = .4; y < 3.4; y += .45) f.m(G.box, tmat(T.wood()), x, y, cz + 2, .06, .05, 2.6);
          f.item('ball', 34, cz + 2); f.item('ball', 37, cz + 2.4); buildHoop(f, 35, r.z0 + .4, 0);
          return; }
        // второй этаж: два класса и кабинет химии, библиотека
        f.partition(14.6, r.z0, 14.6, r.z1, 3.6, .55, 2); f.partition(29.4, r.z0, 29.4, r.z1, 3.6, .55, 2);
        for (const x of [5.5, 8.3, 11.1]) for (const z of [cz - .6, cz + 1.8]) f.desk(x, z, Math.PI, false); f.whiteboard(8.5, 1.8, r.z0 + .05, 0, 3);
        for (const x of [17, 21, 25]) f.shelf(x, cz + 1.4, 3, 0, 'school'); f.ptable(19, cz - 1.4, .8); f.chair(19, cz - .6, 0); f.rug(23, cz - 1.4, 2.4, 2, '#2a6a4a', '#f5c542');
        for (const x of [32, 36.5]) { f.box(x, cz, 2.6, 1.1, .9, tmat(T.cabinet(0xd8d8e0))); f.m(G.box, col(0x2b2533), x, .93, cz, 2.62, .05, 1.12); for (const dx of [-.8, 0, .8]) f.m(G.cyl8, glow([0x9be36b, 0x4ab0f0, 0xff5a6e][((x + dx * 3) | 0) % 3]), x + dx, 1.08, cz, .06, .24, .06); }
        f.whiteboard(35, 1.8, r.z0 + .05, 0, 2.5); f.safe(r.x1 - .5, r.z1 - .6, Math.PI); } });
    b.grabTarget({ x: 36, z: 6.5, r: 1.6, kind: 'bounce', label: 'маты', ring: false });

    /* ---------- фишка: звонок и толпа школьников ---------- */
    b.ground(RX0, 14.2, RX1, 44, T.asphalt(), 3, .013);
    for (let z = 17; z < 43; z += 4.5) { b.marking(22.5, z, .3, 1.6, 0xf5c542); const head = b.m(G.cone4, paint(0xf5c542), 22.5, .03, z + 1.1, .55, .02, .55); head.rotation.y = Math.PI / 4; }
    b.hazardFloor(22.5, 14.9, 6, .6);
    const bellLamp = b.warnLamp(22, 3.4, 14.25, 0xffd060, .3);
    const kidM = [0x4ab0f0, 0xd8243a, 0x9be36b, 0xf5c542, 0xb18cff, 0xff8a1f].map(c => col(c)), skin = col(0xe8c0a0), bag = col(0x2b2533);
    const kids = Array.from({ length: 12 }, (_, i) => { const g = compose('kid60-' + (i % 6), a => { a(G.box, kidM[i % 6], 0, .62, 0, .42, .5, .26); a(G.sph, skin, 0, 1.05, 0, .2, .2, .2); a(G.box, bag, 0, .7, -.18, .32, .36, .12);
      for (const s of [-1, 1]) a(G.box, col(0x3a3a5a), s * .1, .2, 0, .14, .4, .14); a(G.box, kidM[(i + 2) % 6], 0, 1.2, 0, .24, .06, .24); }); g.visible = false; W.group.add(g); W.keep.push(g); return { g, x: 0, z: 0, d: 0, v: 7 + Math.random() * 2 }; });
    const C = { state: 'calm', t: 0, next: 30 + Math.random() * 20 };
    W.animated.push(dt => { C.t += dt;
      if (C.state === 'calm' && C.t > C.next) { C.state = 'bell'; C.t = 0; sfx('bell', { at: { x: b.X(22.5), y: b.Y + 3, z: b.Z(14) }, range: 60 }); sfx('bell', { at: { x: b.X(22.5), y: b.Y + 3, z: b.Z(14) }, range: 60, v: .7 }); }
      else if (C.state === 'bell') { bellLamp.set(Math.sin(C.t * 14) > 0 ? 1 : .2); if (C.t > 2) { C.state = 'run'; C.t = 0; kids.forEach((k, i) => { k.x = b.X(RX0 + .7 + (i % 4) * 1.5 + Math.random() * .3); k.z = b.Z(14.6) - Math.floor(i / 4) * 1.2; k.d = Math.floor(i / 4) * .25; k.g.visible = false; }); sfx('event', { at: { x: b.X(22.5), y: b.Y + 1, z: b.Z(15) }, range: 40 }); } }
      else if (C.state === 'run') { bellLamp.set(0); let any = false;
        for (const k of kids) { if (C.t < k.d) { any = true; continue; } k.g.visible = true; k.z += k.v * dt; if (k.z < b.Z(46.5)) any = true; else k.g.visible = false;
          const bob = Math.abs(Math.sin((C.t + k.d) * 14)) * .12; k.g.position.set(k.x + Math.sin(C.t * 9 + k.v) * .08, b.Y + bob, k.z); k.g.rotation.y = 0; k.g.updateMatrix();
          if (Math.random() < dt * 3) smoke(k.x, b.Y + .1, k.z - .3, { color: 0xb8b0a8, size: .1, vy: .3, life: .4 });
          for (const a of actors()) if (!a.hidden && !a.drone && Math.abs(a.pos.x - k.x) < .6 && a.pos.z > k.z - .2 && a.pos.z < k.z + .8 && a.pos.y < b.Y + 1.2 && !(a.stun > 0)) { const s = a.pos.x < b.X(22.5) ? -1 : 1; knockDown(a, s * 5, 6, 1.1); sfx('hit', { at: a.pos, v: .6 }); } }
        if (!any) { C.state = 'calm'; C.t = 0; C.next = 45 + Math.random() * 20; for (const k of kids) k.g.visible = false; } } });
    b.hazard({ x0: RX0, z0: 14, x1: RX1, z1: 44, active: () => C.state !== 'calm' });

    /* ---------- стадион с беговой дорожкой (ЮЗ) ---------- */
    b.ground(3.5, 19.5, 17.5, 38.5, T.court(), 3); b.ground(5.5, 21.5, 15.5, 36.5, T.grass(), 3, .016);
    const ring = b.m(new THREE.RingGeometry(1.45, 1.63, 20), paint(0xe5ddcf), 10.5, .035, 29, 1, 1, 1); ring.rotation.x = -Math.PI / 2;
    for (const x of [4.3, 16.7]) b.marking(x, 29, .14, 18); b.marking(10.5, 29, 10, .14);
    b.goal(10.5, 22.2, 0, 4, 2.2); b.goal(10.5, 35.8, Math.PI, 4, 2.2);
    b.item('ball', 8, 27); b.item('ball', 13, 31);
    b.bleachers(10.5, 40.8, 10, 3, Math.PI);

    /* ---------- турники и площадка (восток) ---------- */
    b.ground(29.5, 23.5, 40.5, 30.5, T.court(), 2, .014);
    for (const [x0, h] of [[31, 1.4], [33.4, 2.0], [35.8, 2.5]]) { for (const x of [x0, x0 + 1.6]) { b.m(G.cyl6, col(0xd8243a), x, h / 2, 27, .05, h, .05); b.solid(x, 27, .15, .15, 0, h); } b.m(G.cyl6, col(0x9a9da8), x0 + .8, h, 27, .03, 1.7, .03).rotation.z = Math.PI / 2; }
    b.seesaw(38.5, 25, Math.PI / 2); b.ride('skate', 31, 29.5, 1.2); b.ride('scooter', 39, 29.5, .6);

    /* ---------- мелочи ---------- */
    b.m(G.cyl6, col(0xd8d8e0), 27.5, 3.5, 15.4, .05, 7, .05); b.solid(27.5, 15.4, .2, .2, 0, 7); b.m(G.box, col(0xff8a1f), 28.1, 6.4, 15.4, 1.1, .7, .02);
    for (let i = 0; i < 4; i++) b.m(G.torus, col(0x6a6d78), 30 + i * .8, .5, 15.2, .4, .4, .4); b.solid(31.2, 15.2, 3.4, .2, 0, .9);
    b.fence(1, 43.2, 19, 43.2, 1.2, 'wood'); b.fence(26, 43.2, 43, 43.2, 1.2, 'wood');
    b.bench(18.2, 20, Math.PI / 2); b.bench(27, 34, -Math.PI / 2); b.bench(33, 36.5, 0);
    b.tree(41, 38); b.tree(30, 40); b.tree(1.8, 17); b.tree(41.8, 17); b.bush(36, 41, 1.8, 1.2, .9);
    b.cone(18, 26); b.cone(18, 30); b.bin(18.4, 16.5); b.bin(26.6, 40);
    b.lamp(18.6, 23, Math.PI / 2); b.lamp(26.4, 23, -Math.PI / 2); b.lamp(18.6, 38, Math.PI / 2); b.lamp(42.8, 30, -Math.PI / 2);
    b.zone('floor', 3.5, 19.5, 17.5, 38.5); b.zone('floor', 27, 16, 43, 32);
    b.cats(27, 31, 43, 42);
    b.spawn(10.5, 25); b.spawn(34, 33); b.spawn(10, 17);
    b.hw(() => { b.pumpkin(17.4, 15.4); b.pumpkin(27.4, 18); });
  },
};
