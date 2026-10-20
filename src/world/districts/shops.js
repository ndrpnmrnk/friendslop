import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { HW } from '../../config.js';
import { W } from '../state.js';

// Торговая улица: магазины с интерьерами и витринами (бьются), по крышам — через мостики,
// тележки (можно толкать или запрыгнуть и кататься), стеклянная остановка
export default {
  id: 'shops', name: 'Торговая улица', ground: 'pave',
  build(b) {
    const shops = [
      { x: 1, wall: 0x9c7a5a, sign: ['ХЛЕБ', '#f1e8ff', '#3a2458'], aw: ['#f1e8ff', '#d8243a'], kind: 'bakery', up: 4.2, gaps: [{ side: 'e', at: 0.6 }] },
      { x: 11.5, wall: 0x6a7c9c, sign: ['КАФЕ', '#2a1f3d', '#ff8a1f'], aw: ['#ff8a1f', '#2a1f3d'], kind: 'cafe', up: 4.2, gaps: [{ side: 'w', at: 0.6 }, { side: 'e', at: 0.6 }] },
      { x: 22, wall: 0x8a6a8c, sign: [HW ? 'ТЫКВЫ' : '24/7', '#ff8a1f', '#17111f'], aw: ['#7b4bc4', '#f5c542'], kind: 'mart', up: 4.2, gaps: [{ side: 'w', at: 0.6 }] },
    ];
    for (const s of shops) {
      // двухэтажный магазин: торговый зал внизу, наверху — склад/квартира/офис, лестница до крыши
      b.tower({ x: s.x, z: 0.3, w: 9, d: 9.4, floors: 2, fh: 3.8, wall: s.wall, lit: 0.7, door: { side: 's', at: 0.5 }, sign: s.sign, awning: s.aw, floor: T.floorTile(),
        gaps: s.kind === 'bakery' ? s.gaps.concat([{ side: 'w', at: 0.75 }]) : s.gaps,
        interior(f, k, r) {
          const cx = (r.x0 + r.x1) / 2;
          if (k === 0) {
            if (s.kind === 'bakery') { W.spots.pickup.push({ x: f.X(r.x0 + 2.2), z: f.Z(r.z0 + 1.9), y: f.Y, f: [0, -1], district: 'Торговая улица', label: 'пекарня' }); f.box(r.x0 + 2.2, r.z0 + 0.8, 3, 0.8, 1.0, tmat(T.wood())); f.m(G.box, tmat(T.produce('pumpkin')), r.x0 + 2.2, 1.03, r.z0 + 0.8, 2.8, 0.06, 0.6); f.shelf(r.x1 - 0.3, r.z0 + 2, 2.6, -Math.PI / 2); }
            if (s.kind === 'cafe') { f.table(r.x0 + 1.6, r.z1 - 1.3, 0.8); f.chair(r.x0 + 1.6, r.z1 - 0.5, Math.PI); f.table(r.x1 - 1.6, r.z1 - 1.3, 0.8);
              f.box(cx, r.z0 + 0.45, 4, 0.8, 1.05, tmat(T.wood())); f.box(cx + 1.2, r.z0 + 0.45, 0.5, 0.5, 0.6, col(0x3a3a40), { y: 1.05 }); f.ride('chair', r.x1 - 1.6, r.z1 - 0.5, Math.PI); }
            if (s.kind === 'mart') { f.shelf(r.x0 + 2, r.z0 + 1.5, 2.6, Math.PI / 2); f.shelf(r.x0 + 4.2, r.z0 + 1.5, 2.6, Math.PI / 2); f.cabinet(r.x1 - 0.5, r.z0 + 1.2, 0.6, 1.8, 2, 0xd8d8e0, 0, -Math.PI / 2); }
          } else {
            if (s.kind === 'bakery') { f.bed(r.x1 - 1.0, r.z1 - 1.3, Math.PI, 0xd8a040); f.wardrobe(r.x0 + 0.5, r.z1 - 0.5, 0); f.rug(cx, r.z0 + 1.5, 2.4, 1.4); }
            if (s.kind === 'cafe') { for (const [x, z, s2] of [[r.x0 + 0.7, r.z1 - 0.6, 1], [r.x0 + 1.8, r.z1 - 0.6, 0.9], [r.x0 + 0.7, r.z1 - 0.6, 0.8, 1]]) f.crate(x, z, s2); f.shelf(r.x1 - 0.3, r.z0 + 1.6, 2.4, -Math.PI / 2); }
            if (s.kind === 'mart') { f.desk(cx, r.z1 - 0.7, Math.PI); f.ride('chair', cx, r.z1 - 1.6, 0); f.cabinet(r.x0 + 0.4, r.z0 + 1.2, 0.6, 1.4, 1.5, 0x6a6d78, 0, Math.PI / 2); }
          }
        } });
    }
    b.dropLadder(1, 6.25, 'w', 7.6);
    b.plank(10, 5.2, 11.5, 5.2, 7.6, 1.1); b.plank(20.5, 5.2, 22, 5.2, 7.6, 1.1);
    // рекламный щит на крыше и кондиционеры
    for (const x of [24, 30]) b.box(x, 2, 0.15, 0.15, 2.5, col(0x2b2533), { y: 7.6 });
    b.m(G.box, tmat(T.sign('ТЫКВЕННЫЙ ЛАТТЕ', '#ff8a1f', '#2a1f3d')), 27, 10.6, 2, 6.4, 1.6, 0.12);
    for (const x of [4, 15]) b.aircon(x, 6.2, 7.6);
    b.ride('cart', 8, 14); b.ride('cart', 24, 15, 0.6);
    b.atm(10.75, 10.25, 0);
    // остановка
    const mt = col(0x3a4a6a);
    for (const x of [13.2, 18.8]) b.box(x, 27, 0.15, 0.15, 2.6, mt);
    b.box(16, 27.6, 6, 1.6, 0.12, mt, { y: 2.6 });
    b.vitrine(16, 26.9, 5.4, 1.9, 'x', 0.45); b.bench(16, 27.8, 0);
    // у входов в магазины свободно: урны и гидрант — между зданиями и по краям
    b.bin(2.2, 10.5); b.bin(31.2, 10.5); b.hydrant(21.25, 10.5);
    b.crate(30.6, 12, 1); b.crate(30.6, 13.1, 1); b.crate(30.6, 12.5, 0.9, 1);
    // Проход между магазинами и остановкой свободен; ящики остаются у разгрузки.
    [3, 9, 23, 29].forEach((x, i) => b.planter(x, 18.5, 2.2, 1.2, 0.5, i % 2 ? 'shrub' : 'flowers'));
    b.bikeRack(30.2, 14.5, 4, Math.PI / 2); b.newsBox(13.2, 10.2); b.postBox(19, 10.2); b.graffiti(31.06, 1.4, 5, Math.PI / 2, 2.6, 1); b.puddle(8, 13, 1); b.puddle(24, 24, 0.9); b.trashBags(30.6, 9.8, 2); b.streetSign(1, 10.5, 'ТОРГОВАЯ', 'ЛЕСНАЯ');
    for (const x of [6, 11, 21, 26]) b.bollard(x, 11.2);
    b.bench(6, 22, Math.PI); b.bench(26, 22, Math.PI); b.parasol(6, 23.6, '#d8243a', '#f1e8ff');
    b.lamp(1, 18, Math.PI / 2); b.lamp(31, 18, -Math.PI / 2);
    // веранда кафе: кадки по периметру, столики под зонтами
    for (const x of [12.2, 19.8]) b.planter(x, 13.6, 0.8, 3.6, 0.6, 'shrub');
    b.planter(16, 15.6, 6.8, 0.8, 0.6, 'flowers');
    for (const [x, c1] of [[13.9, '#ff8a1f'], [18.1, '#9be36b']]) { b.parasol(x, 13.4, c1, '#2a1f3d'); b.table(x + 0.75, 12.6, 0.75); b.staticChair(x + 0.75, 11.9, 0); b.staticChair(x + 0.75, 13.3, Math.PI); }
    // у пекарни — доска с меню, у «тыквенного» — ящики с овощами
    b.chalkSign(7.6, 10.6, 0.25);
    for (const [x, g] of [[23.4, 'pumpkin'], [29.6, 'apple']]) { b.box(x, 10.6, 1.2, 0.7, 0.55, tmat(T.wood())); b.m(G.box, tmat(T.produce(g)), x, 0.58, 10.6, 1.12, 0.05, 0.62); }
    b.item('pumpkin', 28.5, 11.2); b.item('tomato', 23.2, 10.6, 0.6); b.item('tomato', 29.4, 10.7, 0.6);
    // клумба-островок с деревом в центре площадки
    b.planter(16, 21.5, 3, 3, 0.5, 'tree'); b.bench(16, 19.4, Math.PI); b.bench(16, 23.6, 0);
    b.tree(3, 29.5); b.tree(29, 29.5);
    b.zone('floor', 1, 10.5, 31, 31);
    b.spawn(16, 17.6); b.spawn(5, 18);
    b.hw(() => { b.pumpkin(4.2, 9.2); b.pumpkin(27.8, 9.2); b.stringLights(1.5, 8.9, 30.5, 8.9, 3.4); });
  },
};
