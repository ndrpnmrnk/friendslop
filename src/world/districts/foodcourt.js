import { random } from '../../core/random.js';
import {addCanopy} from '../canopies.js';
import { THREE, G, tmat, col, glow, lam } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';

/* Фудкорт: двухэтажный ТЦ «Полночь» с витринами (стекло бьётся), внутри — фудкорт с прилавками
   и столиками, на втором этаже — зал игровых автоматов, лестница до крыши.
   Снаружи: два настоящих фудтрака (на крышу — по ящикам), сцена со светом, терраса на возвышении,
   столики под зонтами со стульями, которые можно бросать. */
export default {
  id: 'foodcourt', name: 'Фудкорт', ground: 'pave',
  build(b) {
    // ТЦ
    b.tower({ x: 20.5, z: 8.5, w: 11, d: 22, floors: 2, fh: 3.8, wall: 0x5a4a7a, brick: false, lit: 0.8, floor: T.floorTile(), winStep: 2.0, doorStyle: 'glass',
      doors: [{ side: 'w', at: 0.55, sign: ['ТЦ «ПОЛНОЧЬ»', '#2a1f3d', '#b18cff'] }, { side: 's', at: 0.5 }],
      interior(f, k, r) {
        if (k === 0) {
          // фудкорт: три прилавка вдоль восточной стены, столики посередине
          [['ПИЦЦА', '#d8243a'], ['СУШИ', '#2a1f3d'], ['ШАУРМА', '#6aa84f']].forEach(([nm, c], i) => {
            const z = 13 + i * 5.5;
            f.counter(r.x1 - 0.5, z, .95, 3.45, 1.11, tmat(T.cabinet(0xd8d0c0))); f.m(G.box, col(0x3a3440), r.x1 - 0.5, 1.08, z, 0.95, 0.06, 3.45);
            f.sign(r.x1 - 0.02, 2.6, z, -Math.PI / 2, nm, c, '#f5c542', 2.4, 0.5); f.m(G.box, glow(0xffb070), r.x1 - 0.3, 2.95, z, 0.04, 0.12, 2.8);
            f.bottles(r.x1 - 0.5, 1.11, z - 1, 3);
            // прилавок как в ТЦ: цветная полоса, стеклянная витрина, касса, табло-меню на стене
            f.m(G.box, col(parseInt(c.slice(1), 16)), r.x1 - 0.96, 0.75, z, 0.02, 0.22, 3.36); f.m(G.box, col(0xf5c542), r.x1 - 0.96, 0.6, z, 0.02, 0.04, 3.36);
            f.m(G.box, lam({ color: 0xbfe8ff, emissive: 0x1a3040, transparent: true, opacity: 0.35, depthWrite: false }, 'mallGlass'), r.x1 - 0.75, 1.32, z + 0.6, 0.04, 0.42, 1.6);
            f.m(G.box, col(0x2b2533), r.x1 - 0.5, 1.2, z + 1.2, 0.3, 0.18, 0.26); f.m(G.box, tmat(T.screen()), r.x1 - 0.66, 1.34, z + 1.2, 0.02, 0.12, 0.18);
            f.sign(r.x1 - 0.02, 1.9, z, -Math.PI / 2, 'МЕНЮ · КОМБО · НАПИТКИ', '#17111f', '#f1e8ff', 2.8, 0.4);
            W.spots.pickup.push({ x: f.X(r.x1 - 1.6), z: f.Z(z), y: f.Y, f: [1, 0], district: 'Фудкорт', label: nm.toLowerCase() });
          });
          for (const [x, z] of [[23.5, 14], [23.5, 18.5], [23.5, 23], [26.2, 27.5]]) { f.ptable(x, z, 0.8); f.chair(x - 0.8, z, Math.PI / 2); f.chair(x + 0.8, z, -Math.PI / 2); f.item(random() < 0.5 ? 'mug' : 'books', x + 0.25, z, 0.85); }
          f.plantPot(21.3, 29.5, 1.2); f.vending(21.4, 13.3);
          // центр зала: островок с растением и указателем, навесные баннеры; проход от дверей свободен
          f.box(27.4, 16.2, 1.6, 1.6, 0.5, tmat(T.planter())); f.m(G.ico, tmat(T.bush()), 27.4, 1.0, 16.2, 0.7, 0.6, 0.7);
          f.m(G.cyl6, col(0x2b2533), 27.4, 1.6, 26, 0.04, 3.2, 0.04); f.sign(27.4, 2.6, 26.03, 0, 'ФУДКОРТ  ·  2 ЭТАЖ — ИГРЫ', '#2a1f3d', '#f5c542', 2.2, 0.3); f.sign(27.4, 2.6, 25.97, Math.PI, 'ФУДКОРТ  ·  2 ЭТАЖ — ИГРЫ', '#2a1f3d', '#f5c542', 2.2, 0.3);
          for (const [z, t, c2, ry] of [[11, 'СКИДКИ', '#ff5a6e', 0], [30, 'ХЭЛЛОУИН', '#ff8a1f', Math.PI]]) f.sign(26, 3.1, z, ry, t, '#17111f', c2, 3, 0.5);
          return;
        }
        // второй этаж: игровые автоматы, диваны
        [0x7b4bc4, 0xd8243a, 0x4ab0f0, 0x6aa84f, 0xf5c542].forEach((c, i) => f.arcade(r.x1 - 0.5, 13 + i * 1.3, -Math.PI / 2, c));
        f.sofa(23, 29.5, Math.PI, 0x3a4a6a); f.rug(24.5, 24, 3, 3, '#2a1f3d', '#ff8a1f'); f.ptable(24.5, 24, 0.8); f.item('ball', 24, 21);
        f.ride('chair', 26, 20, 0); f.plantPot(21.3, 13.5); f.plantPot(30.6, 29.6);
      } });
    // неоновая вывеска на крыше ТЦ
    b.box(20.8, 19, 0.15, 6, 1.4, col(0x17141c), { y: 7.6 + 0.8 }); b.sign(20.7, 9.1, 19, -Math.PI / 2, 'ТЦ «ПОЛНОЧЬ»', '#17111f', '#b18cff', 5.6, 1.2);
    // фудтраки: прилавок на юг, к площади
    b.foodTruck(6, 2.6, 0xe8c040, 'ТАКО · ТАКО', '#d8243a');
    b.foodTruck(15.5, 2.6, 0x4a8ac8, 'БУРГЕРЫ', '#2a1f3d');
    b.item('taco',6,4.9,1.1);b.item('burger',15.5,4.9,1.1);b.item('bao',4.5,24,1.77);b.item('noodles',9,24,1.77);b.item('boombox',27,3.8,.99);
    b.crate(10.2, 2.0, 1.1); b.crate(10.2, 2.0, 0.9, 1.1); b.crate(10.2, 3.2, 0.9);
    // сцена с колонками и прожекторами
    b.box(27, 3.8, 8, 5, 0.8, tmat(T.wood()));
    b.stairs(24.2, 7.6, 'n', 0, 0.8, 1.6);
    for (const x of [23.6, 30.4]) { b.box(x, 2.4, 1, 0.8, 1.8, col(0x17141c), { y: 0.8 }); for (const [y, r] of [[2.1, 0.3], [1.4, 0.2]]) b.m(G.cyl12, col(0x3a3a40), x, y, 2.82, r, 0.02, r).rotation.x = Math.PI / 2; }
    for (const x of [23.2, 30.8]) b.box(x, 1.6, 0.15, 0.15, 4.2, col(0x2b2533));
    b.m(G.box, col(0x2b2533), 27, 4.2, 1.6, 7.8, 0.12, 0.12);
    [0xff5a6e, 0x9be36b, 0x4ab0f0, 0xf5c542].forEach((c, i) => b.m(G.box, glow(c), 24.6 + i * 1.6, 4.0, 1.7, 0.3, 0.3, 0.3));
    b.m(G.cyl6, col(0x2b2533), 27, 1.5, 4, 0.03, 1.4, 0.03); b.m(G.sph, col(0x17111f), 27, 2.25, 4, 0.08, 0.1, 0.08);
    b.sign(27, 3.4, 1.5, 0, 'ХЭЛЛОУИН ФЕСТ', '#2a1f3d', '#ff8a1f', 5, 0.6); b.m(G.box, col(0x17141c), 27, 3.4, 1.47, 5.1, 0.68, 0.04); for (const x of [25, 29]) b.m(G.box, col(0x2b2533), x, 3.93, 1.55, 0.03, 0.42, 0.03); // растяжка на тросах под балкой
    // терраса на возвышении с перилами и ступенями
    b.box(7, 25, 10, 6, 0.9, tmat(T.floorWood()));
    b.stairs(13.3, 23.2, 'w', 0, 0.9, 1.6);
    for (const [x0, z0, x1, z1] of [[2, 22, 12, 22], [2, 28, 12, 28], [2, 22, 2, 28]]) b.fence(x0, z0, x1, z1, 1.9, 'iron');
    for (const [x, z] of [[4.5, 24], [9, 24], [6.5, 26.6]]) { b.table(x, z, 0.8, 0.9); b.chair(x - 0.9, z, Math.PI / 2, 0.9); b.chair(x + 0.9, z, -Math.PI / 2, 0.9); b.bottles(x, 1.72, z, 2); }
    // площадка со столиками под зонтами
    const tables = [[6, 12], [11.5, 12], [6, 17.5], [11.5, 17.5], [16.5, 15]];
    const umb = [['#d8243a', '#f1e8ff'], ['#4ab0f0', '#f1e8ff'], ['#f5c542', '#2a1f3d'], ['#6aa84f', '#f1e8ff'], ['#7b4bc4', '#f5c542']];
    tables.forEach(([x, z], i) => {
      b.table(x, z, 1);
      b.m(G.cyl6,col(0x2b2533),x,1.9,z,.04,3.8,.04);b.solid(x,z,.13,.13,0,3.8);addCanopy(b,x,z,{w:3.2,edge:3.3,rise:.55,colors:umb[i]});
      b.chair(x - 1.1, z, Math.PI / 2); b.chair(x + 1.1, z, -Math.PI / 2);
    });
    b.vending(18.8, 10); b.vending(18.8, 11.3);
    b.planter(2.2, 9, 2, 2, 0.5, 'flowers'); b.planter(16.5, 21.5, 3, 1.2, 0.5, 'shrub'); b.planter(16.5, 30.5, 4, 1, 0.5, 'flowers');
    b.bin(3.5, 14.5); b.bin(14, 9); b.bin(18.5, 27);
    b.bikeRack(2, 18.5, 3, Math.PI / 2); b.trashBags(19.5, 2.2, 2); b.picnic(8.5, 30.6, 0); b.newsBox(13.5, 30.8, Math.PI);
    b.lamp(1, 30.5, Math.PI / 2); b.lamp(17.3, 6, 0); b.lamp(19.5, 31, Math.PI);
    b.zone('floor', 3, 9, 19.5, 21); b.zone('floor', 13, 22, 19.5, 30);
    b.cats(1, 8, 19.5, 31);
    b.spawn(9, 15); b.spawn(15, 26);
    b.hw(() => { b.stringLights(3, 8.4, 19.5, 8.4, 3.2); b.stringLights(3, 18.8, 18.4, 18.8, 3.2); b.pumpkin(23.5, 2.9, 0.3, 0.8); b.pumpkin(30.4, 4.5, 0.3, 0.8); });
  },
};
