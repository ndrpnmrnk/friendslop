import { G, tmat, smat, col, compose } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { sfx } from '../../core/sfx.js';
import { knockDown } from '../../game/actors.js';

/* Парк (v0.60, 44×44 по схеме): извилистая аллея с севера на юг, большой пруд с островком и беседкой.
   Фишка — ЛОДКИ-УТОЧКИ: запрыгни в уточку (E) и катайся по пруду; разогнался и врезался в чужую лодку — её седок
   летит в воду. Утка крякает, когда лодка набрала таран. Край пруда — цель для захвата: дотащил соперника — плюх.
   Лодочная станция, эстрада со скамейками, карусель, тыквенная грядка с пугалом, нычка в живой изгороди,
   кучи листьев, фонтанчик, гирлянды над аллеей. */
const PX = 30, PZ = 25, PR = 7.2;
export default {
  id: 'park', name: 'Парк', ground: 'grass', size: 44,
  build(b) {
    const dirt = T.cobble();
    // аллеи по схеме: север→юг (извилистая), запад→центр, восток→юг
    b.path([[22, 0], [17, 8], [14, 13], [11, 21], [10.5, 30], [16, 38], [22, 44]], 3, dirt);
    b.path([[0, 22], [11, 21]], 2.6, dirt, .03);
    b.path([[44, 18], [41, 26], [38, 33], [33, 37], [24, 41]], 2.6, dirt, .05);
    b.path([[14, 13], [21, 18.5]], 2.4, dirt, .07); // к причалу уточек

    /* ---------- пруд, островок, беседка ---------- */
    b.water(PX, PZ, PR, 0, [.2, 1.3, 2.6, 4.2, 5.4]);
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28, r = PR + .25; if (Math.abs(a - Math.PI) < .3) continue; const s = b.m(G.ico, tmat(T.stone()), PX + Math.cos(a) * r, .1, PZ + Math.sin(a) * r, .38, .22, .32); s.rotation.y = a; }
    for (let i = 0; i < 10; i++) { const a = .4 + i * .12, r = PR - .4, x = PX + Math.cos(a) * r, z = PZ + Math.sin(a) * r; b.m(G.box, col(0x5a7a3a), x, .5, z, .04, 1, .04); b.m(G.cyl5, tmat(T.bark()), x, 1.05, z, .065, .25, .065); }
    // островок с беседкой
    b.m(G.cyl12, tmat(T.grass()), PX, .14, PZ, 2.5, .3, 2.5); b.solid(PX, PZ, 4.2, 4.2, 0, .3);
    b.m(G.cyl12, tmat(T.stone()), PX, .07, PZ, 2.65, .14, 2.65);
    { const wd = tmat(T.wood()), roof = col(0x7a3a4a);
      b.m(G.cyl8, wd, PX, .36, PZ, 1.7, .1, 1.7);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, x = PX + Math.cos(a) * 1.55, z = PZ + Math.sin(a) * 1.55; b.m(G.box, wd, x, 1.45, z, .12, 2.2, .12); b.solid(x, z, .2, .2, .3, 2.3); }
      b.m(G.cone8, roof, PX, 3.05, PZ, 2.2, 1.2, 2.2); b.m(G.cyl8, col(0xf5c542), PX, 3.75, PZ, .08, .3, .08);
      b.m(G.cyl8, wd, PX, .9, PZ, .7, .06, .7); b.m(G.cyl6, wd, PX, .62, PZ, .1, .55, .1); }
    b.light(PX, PZ, 2, .3);
    // причал уточек на западном берегу + табличка
    b.pier(21.4, 22.6, PX - PR + .6, 22.6, .3);
    b.sign(20.95, 1.75, 21.2, -Math.PI / 2, 'УТОЧКИ', '#f5c542', '#2a1f3d', 1.5, .45); b.m(G.box, col(0x2b2533), 21.05, .8, 21.2, .08, 1.6, .08); b.solid(21.05, 21.2, .15, .15, 0, 1.6);
    // лодки-уточки
    const ducks = [[PX - 4.6, 21], [PX - 3.2, 28.6], [PX + 3.6, 20.4], [PX + 4.6, 28.2]].map(([x, z], i) => b.ride('duck', x, z, i * 1.7, .02));
    // таран: разогнанная уточка врезалась в другую — седок той летит в воду
    { let quack = 0; W.animated.push(dt => { quack -= dt;
      for (const a of ducks) { const va = Math.hypot(a.vx || 0, a.vz || 0); if (va > 6.5 && a.rider && quack <= 0 && Math.random() < dt * 2) { quack = 1.2; sfx('squeak', { at: { x: a.x, y: a.y, z: a.z }, v: .6 }); }
        for (const c of ducks) { if (c === a) continue; const dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz); if (d > a.r + c.r + .1 || d < .01) continue;
          const rel = ((a.vx || 0) - (c.vx || 0)) * dx / d + ((a.vz || 0) - (c.vz || 0)) * dz / d; if (rel < 4.5) continue;
          c.vx = (c.vx || 0) + dx / d * rel * .8; c.vz = (c.vz || 0) + dz / d * rel * .8; a.vx *= .4; a.vz *= .4;
          const r = c.rider; if (r) { W.dismount && W.dismount(r); knockDown(r, dx / d * 4, dz / d * 4, 1.6); sfx('splash', { at: r.pos }); }
          sfx('bonk', { at: { x: c.x, y: c.y, z: c.z } }); } } }); }
    // край пруда — цель для захвата
    b.grabTarget({ x: PX - PR - .6, z: 29, r: 1.3, kind: 'dunk', t: 2, dir: [1, 0], label: 'пруд' });

    /* ---------- лодочная станция (СЗ) ---------- */
    b.house({ x: 2, z: 2, w: 9, d: 7, h: 3.8, wall: 0x5a7a8a, brick: false, lit: .5, roof: true, floor: T.floorWood(),
      door: { side: 's', at: .5, sign: ['ЛОДОЧНАЯ', '#2a4a6a', '#f1e8ff'] },
      interior(f, r) { f.rowboat(r.x0 + 1.4, (r.z0 + r.z1) / 2, Math.PI / 2); f.shelf(r.x1 - .3, (r.z0 + r.z1) / 2, 2.6, -Math.PI / 2, 'office'); f.lifebuoy(r.x1 - .5, r.z1 - 1.6, -Math.PI / 2); f.crate(r.x1 - .7, r.z0 + .7, .8); f.item('ball', r.x1 - 1.6, r.z1 - .8); } });
    b.shed(15.5, 3.2, 3.5, 3); b.tires(18.2, 6.6, 2);

    /* ---------- эстрада (север) ---------- */
    b.bandshell(28.5, 4.4, 7, 0);
    for (const z of [9.6, 11.6]) for (const x of [25.6, 31.4]) b.bench(x, z, Math.PI);
    b.lamp(23.2, 8.4, Math.PI / 2); b.lamp(33.8, 8.4, -Math.PI / 2);

    /* ---------- карусель (СВ) ---------- */
    b.carousel(39, 8.5, 3); for (const [x, z] of [[35, 4], [43, 13]]) b.lantern(x, z);

    /* ---------- юг: тыквенная грядка, пугало, сено; нычка в изгороди; фонтанчик ---------- */
    b.pumpkinPatch(30.5, 40.5, 7, 3, 5); b.scarecrow(34.5, 39, Math.PI); b.hayBales(38.5, 41.5, 3, .2);
    b.hedge(2, 37.5, 7, 37.5); b.hedge(7, 37.95, 7, 42.2); b.hedge(2, 37.95, 2, 42.2);
    b.zone('nook', 2.6, 38.1, 6.4, 42.2);
    b.drinkFountain(5, 33, Math.PI / 2); b.bench(5, 30, Math.PI / 2);

    /* ---------- деревья, кусты, листья, гирлянды ---------- */
    for (const [x, z] of [[6, 14], [5, 26], [14, 41], [22, 37.5], [34, 14.5], [41, 34], [19.5, 10.5], [42, 21]]) b.tree(x, z);
    b.bush(16, 29, 1.6, 1.2, .9); b.bush(42, 41.5, 1.6, 1.2, .9); b.bush(8, 10.5, 1.6, 1.2, .9);
    b.leafPile(13, 17, 1.1); b.leafPile(17.5, 33, 1); b.leafPile(3, 18, 1.2); b.leafPile(38, 29, 1);
    b.stringLights(15.5, 8.5, 12.5, 18.5, 3); b.stringLights(12.2, 23, 12.4, 31, 3); b.stringLights(40.5, 27.5, 35, 35.5, 3);
    b.lamp(9.2, 21.5, Math.PI / 2); b.lamp(13.6, 36.2, -Math.PI / 4); b.lamp(39.8, 22.5, -Math.PI / 2);
    b.bin(16.6, 12); b.bin(12.8, 27);
    b.streetSign(19.2, 19.6, 'ПАРКОВАЯ', 'АЛЛЕЯ ТЫКВ'); b.bikeRack(19, 1.2, 3, 0);
    b.item('balloon', 18.6, 24.6); b.item('balloon', 19.1, 25.1); b.item('balloon', 18.5, 25.5);
    b.bouncyPumpkin(17, 21.5, 1.4); b.seesaw(4.5, 11.5, Math.PI / 2); b.rake(35.5, 37.6, 1.2); b.ride('ring', PX + 5, PZ - 2.5, 0, .06);
    b.zone('floor', 13, 12, 22, 20); b.zone('floor', 33, 27, 44, 36); b.zone('floor', 8, 24, 19, 34);
    b.cats(13, 12, 22, 20);
    b.spawn(18, 6); b.spawn(16, 25); b.spawn(38, 18);
    b.hw(() => { b.pumpkin(12.5, 4.2, .4); b.pumpkin(24.6, 9); b.pumpkin(15.2, 22.5); });
  },
};
