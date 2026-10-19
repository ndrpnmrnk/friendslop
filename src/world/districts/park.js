import { G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

/* Парк — хэллоуин-фестиваль: карусель с тыквами и летучими мышами, эстрада-ракушка со скамейками,
   пруд с причалом и лодкой (рыбачить — с берега), тыквенная грядка с пугалом и сеном,
   нычка в живой изгороди, кучи листьев (пробежишь — разлетаются), гирлянды над аллеями. */
export default {
  id: 'park', name: 'Парк', ground: 'grass',
  build(b) {
    // аллеи крестом
    b.ground(14.5, 0, 17.5, 32, T.dirt(), 2); b.ground(0, 14.5, 32, 17.5, T.dirt(), 2);
    // СЗ: карусель
    b.carousel(7.5, 7.5, 3);
    for (const [x, z] of [[2.2, 2.2], [12.8, 2.2], [2.2, 12.8]]) b.lantern(x, z);
    b.bench(12.8, 7.5, -Math.PI / 2); b.bench(7.5, 12.8, Math.PI);
    // СВ: эстрада, ряды скамеек лицом к сцене
    b.bandshell(24.5, 3.5, 7, 0);
    for (const z of [9.5, 11.6]) for (const x of [21.6, 27.4]) b.bench(x, z, Math.PI);
    b.lamp(19.2, 8.2, Math.PI / 2); b.lamp(30.6, 8.2, -Math.PI / 2);
    // ЮЗ: пруд, камни по берегу, камыш, причал с востока, лодка у причала
    b.water(7.5, 24.5, 4.6, 0, [1.2, 2.3, 3.4, 4.3]);
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28, r = 4.85; if (Math.abs(a) < 0.35 || Math.abs(a - 6.28) < 0.35) continue; const s = b.m(G.ico, tmat(T.stone()), 7.5 + Math.cos(a) * r, 0.1, 24.5 + Math.sin(a) * r, 0.35, 0.22, 0.3); s.rotation.y = a; }
    for (let i = 0; i < 8; i++) { const a = 3.7 + i * 0.13, r = 4.3, x = 7.5 + Math.cos(a) * r, z = 24.5 + Math.sin(a) * r; b.m(G.box, col(0x5a7a3a), x, 0.5, z, 0.04, 1, 0.04); b.m(G.cyl5, tmat(T.bark()), x, 1.05, z, 0.065, 0.25, 0.065); }
    b.pier(13.2, 24.5, 9.0, 24.5);
    b.rowboat(5.6, 27.2, 0.5);
    b.bench(13.8, 28.6, -Math.PI / 2);
    // ЮВ: тыквенная грядка, пугало, сено
    b.pumpkinPatch(24, 21.5, 8, 3.5, 5);
    b.scarecrow(24, 24.4, Math.PI); b.hayBales(19.8, 25.4, 3, 0.2);
    // нычка в живой изгороди
    b.hedge(18, 27, 22, 27); b.hedge(18, 27.45, 18, 31); b.hedge(22, 27.45, 22, 29.6);
    b.zone('nook', 18.6, 27.6, 21.4, 30.6);
    // сарай садовника
    b.shed(26, 26.2, 3.5, 3); b.tires(29.6, 30, 2);
    // кучи листьев, деревья, кусты
    b.leafPile(13, 13, 1.1); b.leafPile(19, 19.2, 1); b.leafPile(3.5, 17.2, 1.2); b.leafPile(29, 13.4, 1);
    for (const [x, z] of [[1.5, 30.5], [12.6, 31], [30.8, 18.6], [1.5, 19.5], [19, 13.2]]) b.tree(x, z);
    b.bush(30.6, 24, 1, 2.2);
    // гирлянды над аллеями
    b.stringLights(14.3, 1.5, 14.3, 13.5, 3.0); b.stringLights(17.7, 18.5, 17.7, 30.5, 3.0);
    b.stringLights(1.5, 14.3, 13.5, 14.3, 3.0); b.stringLights(18.5, 17.7, 30.5, 17.7, 3.0);
    // лампы, урны, указатель, велопарковка, шарики
    b.lamp(13.8, 18.2, Math.PI); b.lamp(18.2, 13.8, 0);
    b.bin(13.6, 10.5); b.bin(18.4, 21.5);
    b.streetSign(18.6, 18.6, 'ПАРКОВАЯ', 'АЛЛЕЯ ТЫКВ'); b.bikeRack(22.5, 13.9, 3, 0);
    b.item('balloon', 13.4, 26.6); b.item('balloon', 13.9, 27.1); b.item('balloon', 13.3, 27.5);
    b.zone('floor', 1, 13, 13.5, 14);
    b.mist(0.5, 17.5, 14, 31.5); b.zone('floor', 18, 13, 31, 19.5); b.zone('floor', 14.6, 1, 17.4, 31);
    b.cats(18, 13, 31, 19);
    b.spawn(16, 6); b.spawn(23, 16);
    b.hw(() => { b.pumpkin(11.8, 4.2, 0.4); b.pumpkin(20.6, 9.0); b.pumpkin(15.2, 20.5); });
  },
};
