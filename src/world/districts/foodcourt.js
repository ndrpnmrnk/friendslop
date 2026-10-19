import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';

// Фудкорт: два фудтрака (внутрь — через дверь, на крышу — по ящикам), сцена с колонками и светом,
// терраса с перилами на возвышении, столики под зонтами, стулья можно взять и бросить,
// автоматы, клумбы, торговый центр-фон с балконом, на который ведёт лестница
export default {
  id: 'foodcourt', name: 'Фудкорт', ground: 'pave',
  build(b) {
    const truck = (x, z, w, color, sign, signC) => {
      b.house({ x, z, w, d: 3.4, h: 2.7, wall: color, brick: false, windows: false, lit: 1, door: { side: 'w', at: 0.5 }, parapet: false, web: false, floor: T.metal(),
        interior(b, r) { b.cabinet((r.x0 + r.x1) / 2 + 0.5, r.z1 - 0.35, w - 4.5, 0.5, 0.95); b.m(G.box, tmat(T.grill()), (r.x0 + r.x1) / 2 + 0.5, 0.97, r.z1 - 0.35, w - 5, 0.03, 0.4); b.cabinet(r.x1 - 0.4, r.z0 + 0.5, 0.6, 0.7, 1.9, 0xd8d8e0); } });
      b.zone('roof', x + 0.6, z + 0.6, x + w - 0.6, z + 2.8, 2.9);
      b.sign(x + w / 2, 2.25, z + 3.44, 0, sign, signC, '#f5c542', Math.min(4, w - 1), 0.6);
      b.m(G.box, glow(0xffd28a), x + w / 2, 1.4, z + 3.44, w - 3.5, 0.8, 0.02);
      const aw = b.m(G.box, tmat(T.awning('#f1e8ff', signC)), x + w / 2, 2.0, z + 3.9, w - 3, 0.06, 1); aw.rotation.x = 0.3;
      for (const xx of [x + 1.4, x + w - 1.4]) for (const zz of [z - 0.05, z + 3.45]) { const wh = b.m(G.cyl8, col(0x17111f), xx, 0.35, zz, 0.35, 0.2, 0.35); wh.rotation.x = Math.PI / 2; }
    };
    truck(2, 1.5, 9.5, 0xe8c040, 'ТАКО · ТАКО', '#d8243a');
    truck(14, 1.5, 8, 0x4a8ac8, 'БУРГЕРЫ', '#2a1f3d');
    b.crate(11.9, 2.6, 1.2); b.crate(11.9, 2.6, 1.0, 1.2); b.crate(12.9, 3.6, 1.0);
    // сцена с колонками и прожекторами
    b.box(27, 5, 8, 6, 0.8, tmat(T.wood()));
    b.stairs(24.2, 8.7, 'n', 0, 0.8, 1.6);
    for (const x of [23.6, 30.4]) { b.box(x, 3, 1, 0.8, 1.8, col(0x17111f), { y: 0.8 }); b.m(G.cyl12, col(0x3a3a40), x, 2.1, 3.42, 0.3, 0.02, 0.3).rotation.x = Math.PI / 2; b.m(G.cyl12, col(0x3a3a40), x, 1.4, 3.42, 0.2, 0.02, 0.2).rotation.x = Math.PI / 2; }
    for (const x of [23.2, 30.8]) b.box(x, 2.2, 0.15, 0.15, 4.2, col(0x2b2533));
    b.m(G.box, col(0x2b2533), 27, 5, 2.2, 7.8, 0.12, 0.12);
    [0xff5a6e, 0x9be36b, 0x4ab0f0, 0xf5c542].forEach((c, i) => b.m(G.box, glow(c), 24.6 + i * 1.6, 4.8, 2.3, 0.3, 0.3, 0.3));
    b.m(G.cyl6, col(0x2b2533), 27, 1.5, 5, 0.03, 1.4, 0.03); b.m(G.sph, col(0x17111f), 27, 2.25, 5, 0.08, 0.1, 0.08);
    b.sign(27, 4.2, 2.1, 0, 'ХЭЛЛОУИН ФЕСТ', '#2a1f3d', '#ff8a1f', 5, 0.6);
    // терраса на возвышении с перилами и ступенями
    b.box(7, 24, 10, 7, 0.9, tmat(T.floorWood()));
    b.stairs(12.2, 22, 'w', 0, 0.9, 1.6);
    for (const [x0, z0, x1, z1] of [[2, 20.5, 11.5, 20.5], [2, 27.5, 12, 27.5], [2, 20.5, 2, 27.5]]) b.fence(x0, z0, x1, z1, 1.9, 'iron');
    for (const [x, z] of [[4.5, 22.5], [9, 22.5], [6.5, 26]]) { b.table(x, z, 0.8, 0.9); b.chair(x - 0.9, z, Math.PI / 2, 0.9); b.chair(x + 0.9, z, -Math.PI / 2, 0.9); }
    // площадка со столиками под зонтами
    const tables = [[18, 14], [25, 14], [18, 21], [25, 21], [21.5, 27.5]];
    const umb = [['#d8243a', '#f1e8ff'], ['#4ab0f0', '#f1e8ff'], ['#f5c542', '#2a1f3d'], ['#6aa84f', '#f1e8ff'], ['#7b4bc4', '#f5c542']];
    tables.forEach(([x, z], i) => {
      b.table(x, z, 1);
      b.m(G.cyl6, col(0x2b2533), x, 1.6, z, 0.05, 1.6, 0.05);
      b.m(G.cone8, tmat(T.awning(...umb[i])), x, 2.6, z, 1.6, 0.5, 1.6);
      b.chair(x - 1.1, z, Math.PI / 2); b.chair(x + 1.1, z, -Math.PI / 2);
    });
    // торговый центр-фон: высокая стена с витринами и балконом, на балкон — лестница
    b.box(31.3, 16, 1.4, 20, 9, tmat(T.concrete()));
    for (let z = 8; z < 26; z += 4) { b.m(G.box, glow(0xffd28a), 30.58, 1.5, z, 0.02, 2, 2.6); b.m(G.box, glow(0xb18cff), 30.58, 5.5, z, 0.02, 1.6, 2.6); }
    b.box(29.6, 16, 2, 8, 0.2, tmat(T.metal()), { y: 3.6 });
    b.ladder(29.6, 20, 's', 3.8);
    b.zone('roof', 28.8, 12.4, 30.4, 19.6, 3.8);
    b.sign(30.55, 7.6, 16, -Math.PI / 2, 'ТЦ «ПОЛНОЧЬ»', '#2a1f3d', '#b18cff', 6, 1.2);
    // автоматы, клумбы, урны
    b.vending(14, 9.2); b.light(14, 10.1, 1.6);
    b.vending(15.5, 9.2);
    for (const [x, z] of [[2.5, 12], [2.5, 16], [13, 30]]) { b.box(x, z, 2, 2, 0.5, tmat(T.stone())); b.m(G.ico, tmat(T.bush()), x, 0.8, z, 0.9, 0.5, 0.9); }
    b.tree(6, 14); b.tree(28, 29);
    b.bin(21.5, 9.5); b.bin(9, 17.5);
    b.lamp(1, 30.5, Math.PI / 2); b.lamp(16, 17.5, 0);
    b.zone('floor', 14, 10.5, 28, 31); b.zone('floor', 1, 8, 12, 19.5);
    b.cats(1, 8, 28, 31);
    b.spawn(9, 12); b.spawn(20, 30.5);
    b.hw(() => { b.stringLights(16, 11, 28, 11, 3.2); b.stringLights(16, 24, 28, 24, 3.2); b.pumpkin(23.5, 4, 0.3, 0.8); b.pumpkin(30.4, 4, 0.3, 0.8); });
  },
};
