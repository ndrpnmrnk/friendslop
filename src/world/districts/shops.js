import { random } from '../../core/random.js';
import { G, tmat, smat, col, lam } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { HW } from '../../config.js';
import { W } from '../state.js';
import { sfx } from '../../core/sfx.js';
import { actors } from '../../game/actors.js';

/* Торговая улица (v0.60, 44×44 по схеме): два ряда по четыре магазина, между ними пешеходная улица.
   У каждого магазина свой интерьер. Фишка — РОЛЛСТАВНИ: по звонку ставни всех магазинов опускаются на 5 с —
   можно запереть соперника внутри или спрятаться самому. За 1.5 с над каждой дверью мигает жёлтая лампа.
   Дверь магазина — цель для захвата: дотащил соперника — влетает внутрь (а ставни скоро закроются). */
const ROWS = [
  { x: 2, side: 'e', shops: [['ХЛЕБ', '#f1e8ff', '#3a2458', 'bakery', 0x9c7a5a], ['ОДЕЖДА', '#d8608a', '#f1e8ff', 'clothes', 0x8a6a8c], ['ТЕХНИКА', '#2a4a8a', '#9be36b', 'tech', 0x5a6a7c], ['ИГРУШКИ', '#f5c542', '#7b2a8a', 'toys', 0x9c6a5a]] },
  { x: 29, side: 'w', shops: [[HW ? 'ТЫКВЫ' : 'ПРОДУКТЫ', '#ff8a1f', '#17111f', 'mart', 0x7a8a5a], ['КАФЕ', '#2a1f3d', '#ff8a1f', 'cafe', 0x6a7c9c], ['АПТЕКА', '#f1e8ff', '#2a8a5a', 'pharmacy', 0x7c9c8a], ['ЦВЕТЫ', '#9be36b', '#2a1f3d', 'flowers', 0x8a7c6a]] },
];
const W0 = 13, D0 = 9.4, Z0 = 3;
export default {
  id: 'shops', name: 'Торговая улица', ground: 'pave', size: 44,
  build(b) {
    const shutters = [], wood = tmat(T.wood());
    for (const row of ROWS) row.shops.forEach(([name, bg, fg, kind, wall], i) => {
      const z = Z0 + i * D0, east = row.side === 'e';
      b.house({ x: row.x, z, w: W0, d: D0 - .2, h: 4.2, wall, brick: i % 2 === 0, lit: .7, roof: true, floor: kind === 'cafe' || kind === 'bakery' ? T.floorWood() : T.floorTile(),
        door: { side: row.side, at: .5, sign: [name, bg, fg] }, awning: [bg, fg],
        interior(f, r) { const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, back = east ? r.x0 + .4 : r.x1 - .4, ry = east ? Math.PI / 2 : -Math.PI / 2, front = east ? r.x1 - 2.2 : r.x0 + 2.2;
          if (kind === 'bakery') { W.spots.pickup.push({ x: f.X(cx), z: f.Z(cz), y: f.Y, f: [east ? 1 : -1, 0], district: 'Торговая улица', label: 'пекарня' }); f.counter(cx - 1, cz, .8, 4, 1.0, wood); f.m(G.box, tmat(T.produce('pumpkin')), cx - 1, 1.03, cz, .7, .05, 3.8); f.shelf(back, cz, 4, ry, true); f.item('pizza', cx - 1, cz - 1.2, 1.03); }
          if (kind === 'clothes') { for (const zz of [r.z0 + 1.2, r.z1 - 1.2]) f.wardrobe(back + (east ? .3 : -.3), zz, ry); f.rug(cx, cz, 3, 3, '#d8608a', '#f1e8ff'); f.shelf(cx + 1.6, r.z0 + .3, 3, 0, true); f.plantPot(front, r.z1 - .5); }
          if (kind === 'tech') { f.desk(cx, r.z0 + .7, 0, true); f.desk(cx + 2.4, r.z0 + .7, 0, true); f.shelf(back, cz, 4, ry, true); f.cabinet(cx, r.z1 - .5, 2, .6, 1.5, 0x3a3a4a, 0, Math.PI); f.item('monitor', cx - 2, cz, .0); f.item('keyboard', cx - 1.4, cz + .6); }
          if (kind === 'toys') { f.shelf(back, cz, 4, ry, true); f.shelf(cx, r.z1 - .3, 3, Math.PI, true); f.rug(cx, cz, 3, 2.6, '#f5c542', '#7b2a8a'); for (const [x, z] of [[cx - 1, cz - .6], [cx + .8, cz + .4]]) f.item('ball', x, z); f.item('duck', cx + .2, cz - 1.2); f.item('balloon', cx - 2, cz + 1.2); }
          if (kind === 'mart') { for (const dx of [-1.6, 1.2]) f.shelf(cx + dx, cz, 4, Math.PI / 2, true); f.cabinet(back - (east ? 0 : .2), r.z0 + 1.2, .6, 1.8, 2, 0xd8d8e0, 0, ry); f.counter(front, r.z0 + .8, .8, 1.6, 1.0, wood); f.item('pumpkin', front, r.z1 - .8); }
          if (kind === 'cafe') { f.counter(back + (east ? .6 : -.6), cz, .8, 4, 1.05, wood); for (const zz of [r.z0 + 1.4, r.z1 - 1.4]) { f.ptable(cx + 1, zz, .8); f.chair(cx + 1, zz + (zz < cz ? .8 : -.8), zz < cz ? Math.PI : 0); } f.item('mug', back + (east ? .6 : -.6), cz - 1, 1.05); f.ride('chair', cx - 1, cz, 0); }
          if (kind === 'pharmacy') { f.counter(cx, r.z0 + .9, 4, .8, 1.05, wood); f.shelf(back, cz, 4, ry, true); f.cabinet(cx + 2, r.z1 - .5, 1.6, .6, 1.8, 0xe8f0e8, 0, Math.PI); f.plantPot(front, r.z1 - .5); f.item('water', cx - 1, r.z0 + .9, 1.05); }
          if (kind === 'flowers') { for (const [x, z] of [[cx - 2, r.z0 + .7], [cx, r.z0 + .7], [cx + 2, r.z0 + .7], [cx - 1, r.z1 - .7], [cx + 1, r.z1 - .7]]) f.plantPot(x, z, 1.1); f.counter(cx, cz, 2, .8, 1.0, wood); f.item('pot', cx, cz, 1.0); }
        } });
      // роллставня над дверью + лампа-предупреждение
      const dx = east ? row.x + W0 + .14 : row.x - .14, dz = z + (D0 - .2) / 2, SW = 2.3, SH = 2.4;
      b.m(G.box, col(0x3a3440), dx, 2.62, dz, .28, .28, SW + .3); // короб
      const sh = b.m(G.box, smat(T.corrugated(0xb8b4ac)), dx, 2.45, dz, .06, .1, SW); sh.userData.noBatch = true; W.keep.push(sh);
      const lamp = b.warnLamp(dx + (east ? .1 : -.1), 3.0, dz + SW / 2 + .1, 0xffc030, .18);
      const sol = b.solid(dx, dz, .25, SW, 0, SH); sol.on = false;
      const exitX = east ? row.x + W0 + 1.2 : row.x - 1.2;
      b.hazard({ x0: row.x + .3, z0: z + .3, x1: row.x + W0 - .3, z1: z + D0 - .5, exit: [exitX, dz], active: () => S.state === 'warn' || S.state === 'close' });
      b.grabTarget({ x: east ? dx + 1.1 : dx - 1.1, z: dz, r: .9, kind: 'fling', t: 1, dir: [east ? -1 : 1, 0], label: 'дверь', ring: i % 2 === 0 });
      shutters.push({ sh, lamp, sol, y0: b.Y + 2.45, x: b.X(dx), z: b.Z(dz) });
    });
    // звонок → 1.5 с мигают лампы → ставни вниз (0.5 с) → 5 с закрыто → вверх
    const S = { state: 'open', t: 0, next: 35 + random() * 15 };
    W.animated.push(dt => { S.t += dt; const k = S.state === 'down' ? Math.min(1, S.t / .5) : S.state === 'closed' ? 1 : S.state === 'up' ? 1 - Math.min(1, S.t / .8) : 0;
      if (S.state === 'open' && S.t > S.next) { S.state = 'warn'; S.t = 0; sfx('bell', { at: { x: b.X(22), y: b.Y + 3, z: b.Z(22) }, range: 60 }); }
      else if (S.state === 'warn' && S.t > 1.5) { S.state = 'down'; S.t = 0; sfx('shutter', { at: { x: b.X(22), y: b.Y + 2, z: b.Z(22) }, range: 40 }); }
      else if (S.state === 'down' && S.t > .5) { S.state = 'closed'; S.t = 0; }
      else if (S.state === 'closed' && S.t > 5) { S.state = 'up'; S.t = 0; sfx('shutter', { at: { x: b.X(22), y: b.Y + 2, z: b.Z(22) }, range: 40 }); }
      else if (S.state === 'up' && S.t > .8) { S.state = 'open'; S.t = 0; S.next = 40 + random() * 20; }
      for (const q of shutters) { const h = Math.max(.1, 2.4 * k); q.sh.scale.y = h; q.sh.position.y = q.y0 - h / 2 + .05; q.sh.updateMatrix();
        q.lamp.set(S.state === 'warn' ? (Math.sin(S.t * 14) > 0 ? 1 : .1) : S.state === 'down' || S.state === 'closed' ? .4 : 0);
        const was = q.sol.on; q.sol.on = k > .6; if (q.sol.on && !was) for (const a of actors()) if (Math.abs(a.pos.x - q.x) < .5 && Math.abs(a.pos.z - q.z) < 1.2) a.pos.x += a.pos.x < q.x ? -.5 : .5; } });
    // S объявлена после замыканий выше — к моменту вызова уже есть
    W.shopShutters = S;

    /* ---------- пешеходная улица ---------- */
    b.ground(15.6, 0, 28.4, 44, T.cobble(), 2.2, .012);
    for (const [x, z, k] of [[20, 14, 'flowers'], [24, 30, 'flowers'], [22, 22, 'tree']]) b.planter(x, z, k === 'tree' ? 3 : 4, k === 'tree' ? 3 : 2, .5, k);
    b.bench(22, 19.6, Math.PI); b.bench(22, 24.4, 0); b.bench(18, 36, Math.PI / 2); b.bench(26, 8, -Math.PI / 2);
    for (const [x, c1] of [[19, '#ff8a1f'], [25, '#9be36b']]) { b.parasol(x, 33.8, c1, '#2a1f3d'); b.table(x + .75, 33.2, .75); b.staticChair(x + .75, 32.5, 0); b.staticChair(x + .75, 33.9, Math.PI); }
    b.tree(22, 6.5); b.tree(22, 38.5); b.tree(17, 42.5, .8); b.tree(27, 42.5, .8);
    b.ride('cart', 18, 12); b.ride('cart', 26.5, 27, .6); b.cartCorral(25.6, 3.4, 3);
    b.atm(15.9, 26, Math.PI / 2); b.newsBox(28.1, 17.5, -Math.PI / 2); b.postBox(15.9, 36, Math.PI / 2); b.hydrant(28.2, 40);
    b.chalkSign(17, 6.2, .25); b.bikeRack(27.5, 21.5, 3, Math.PI / 2);
    b.bin(16.2, 10); b.bin(27.8, 31); b.trashBags(1.2, 41.5, 2); b.crate(42.6, 41.6, .9); b.crate(42.6, 42.6, .7);
    for (const z of [10, 22, 34]) { b.lamp(16, z + 2.5, Math.PI / 2); b.lamp(28, z - 2.5, -Math.PI / 2); }
    for (const x of [18.4, 25.6]) b.bollard(x, .8);
    b.puddle(20, 28, 1); b.puddle(25, 16, .8);
    b.streetSign(16.2, 1, 'ТОРГОВАЯ', 'ЛЕСНАЯ');
    b.hw(() => { b.stringLights(16, 4, 28, 4, 3.6); b.stringLights(16, 40, 28, 40, 3.6); b.pumpkin(17, 27.5); b.pumpkin(27, 9); });
    b.zone('floor', 16, 2, 28, 42); b.cats(16, 26, 28, 42);
    b.spawn(22, 16); b.spawn(20, 28); b.spawn(24, 40);
  },
};
