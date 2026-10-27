import {restOnSurface} from '../../game/items.js';
import {addCanopy} from '../canopies.js';
import { addPushable } from '../pushables.js';
import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Рынок: прилавки с помидорами и тыквами (берёшь и кидаешь), ящики ломаются, тележка, склад-сарай
export default {
  id: 'market', name: 'Рынок', ground: 'pave',
  build(b) {
    const stall = (x, z, kind, aw) => {
      const wd = tmat(T.wood());
      b.counter(x,z,4.4,1.2,1,tmat(T.crate()));
      b.counter(x,z-.15,4,.7,.12,tmat(T.produce(kind)),1);
      for (const [a, c] of [[-2.1, -0.7], [2.1, -0.7], [-2.1, 0.7], [2.1, 0.7]]) { b.m(G.box, col(0x2b2533), x + a, 1.65, z + c - 0.5, 0.08, 3.3, 0.08); b.solid(x + a, z + c - 0.5, 0.16, 0.16, 0, 3.3); }
      addCanopy(b,x,z-.4,{w:4.8,d:2.4,edge:3.25,rise:.48,round:false,colors:aw});

      b.crate(x - 0.9, z - 1.6, 0.7); b.crate(x + 0.9, z - 1.6, 0.7);
      if (kind === 'tomato') { b.item('tomato', x - 1.4, z + 0.35, 1); b.item('tomato', x - 0.4, z + 0.4, 1); b.item('tomato', x + 0.7, z + 0.35, 1); }
      if (kind === 'pumpkin') { b.item('pumpkin', x - 1.1, z + 0.25, 1); b.item('pumpkin', x + 1, z + 0.25, 1); }
      if (kind === 'apple') { b.box(x + 1.4, z + 0.2, 0.5, 0.4, 0.18, col(0x6a6d78), { y: 1, solid: false }); b.m(G.cyl8, col(0xd8d8e0), x + 1.4, 1.25, z + 0.2, 0.25, 0.04, 0.25); b.m(G.box, tmat(T.screen()), x + 1.4, 1.1, z + 0.41, 0.24, 0.09, 0.01); }
    };
    // v0.55: четыре прилавка вместо шести, по два в ряд, широкий проход посередине; сарай и ящики по краям убраны
    stall(8, 6, 'tomato', ['#d8243a', '#f1e8ff']); stall(24, 6, 'pumpkin', ['#ff8a1f', '#2a1f3d']);
    stall(8, 19, 'apple', ['#6aa84f', '#f1e8ff']); stall(24, 19, 'carrot', ['#4ab0f0', '#f1e8ff']);
    // сено (можно забраться), пугало, мусор, весы с ящиками
    b.hayBales(12, 26.5, 3, 0); b.pumpkinPile(16, 27.8); b.hw(() => b.scarecrow(18.5, 27.5, 0.4)); b.trashBags(30.8, 9.8, 2); b.puddle(22, 13, 0.9);
    b.planter(3, 27, 2.4, 1.2, 0.45, 'flowers'); b.newsBox(9.5, 30.8, Math.PI);
    b.ride('cart', 16, 13.5);
    // пикап фермера, мешки, ящики с тыквами, весы
    b.pickup(6.5, 24.2, Math.PI / 2 + 0.15);
    for (const [x, z] of [[9.4, 22.9], [10.3, 23.4], [9.6, 24]]) addPushable(b, 'sack', x, z);
    b.bin(10, 11); b.bin(22, 24.5);
    restOnSurface(b.item('bao',8,18.85,1.125));restOnSurface(b.item('taco',24,18.85,1.125));
    b.lamp(1, 30.5, Math.PI / 2); b.lamp(31, 1.5, -Math.PI / 2); b.lamp(16, 30.5, Math.PI);
    b.zone('floor', 1, 8.5, 31, 16.2); b.zone('floor', 11, 25, 22, 31);
    b.spawn(16, 12); b.spawn(2.5, 30);
    b.hw(() => { b.pumpkin(8, 28.5); b.stringLights(2, 2.2, 30, 2.2, 3.2); b.stringLights(2, 15.4, 30, 15.4, 3.2); });
  },
};
