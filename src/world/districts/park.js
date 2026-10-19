import { THREE, G, tmat, col } from '../../core/gfx.js';
import { T } from '../../core/textures.js';

// Парк: пруд с деревянным мостиком, беседка, нычка в кустах, сарай садовника и забор
export default {
  id: 'park', name: 'Парк', ground: 'grass',
  build(b) {
    b.ground(15, 0, 17, 32, T.dirt(), 2); b.ground(0, 15, 32, 17, T.dirt(), 2);
    b.water(8, 24, 4.6);
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28, r = 4.8; if (Math.abs(Math.sin(a)) > 0.92) continue; const s = b.m(G.ico, tmat(T.stone()), 8 + Math.cos(a) * r, 0.1, 24 + Math.sin(a) * r, 0.35, 0.22, 0.3); s.rotation.y = a; }
    for (let i = 0; i < 10; i++) { const a = 0.3 + i * 0.16, r = 4.2, x = 8 + Math.cos(a) * r, z = 24 + Math.sin(a) * r; b.m(G.box, col(0x5a7a3a), x, 0.5, z, 0.04, 1, 0.04); b.m(G.cyl5, tmat(T.bark()), x, 1.05, z, 0.065, 0.25, 0.065); }
    // мостик через пруд
    b.plank(8, 18.6, 8, 29.4, 0.45, 1.4);
    for (const z of [18.6, 29.4]) b.box(8, z, 1.4, 0.4, 0.3, tmat(T.wood()));
    for (const x of [7.35, 8.65]) { for (const z of [19.2, 24, 28.8]) b.m(G.box, tmat(T.wood()), x, 0.85, z, 0.09, 0.8, 0.09); b.m(G.box, tmat(T.wood()), x, 1.18, 24, 0.08, 0.08, 9.8); }
    // беседка
    b.box(24, 8, 5, 5, 0.2, tmat(T.wood()));
    for (const [x, z] of [[21.8, 5.8], [26.2, 5.8], [21.8, 10.2], [26.2, 10.2]]) b.box(x, z, 0.25, 0.25, 2.6, tmat(T.wood()), { y: 0.2 });
    const roof = b.m(G.cone4, tmat(T.roof()), 24, 3.4, 8, 3.8, 1.5, 3.8); roof.rotation.y = Math.PI / 4;
    b.solid(24, 8, 5.2, 5.2, 2.8, 0.3);
    b.bench(24, 6.6, 0);
    // нычка в кустах
    b.bush(27, 20.5, 5, 1.1, 1.4); b.bush(24.6, 22.8, 1.1, 3.6, 1.4); b.bush(29.6, 22.8, 1.1, 3.6, 1.4);
    b.zone('nook', 25.6, 21.4, 28.8, 24.8);
    for (const [x, z] of [[3, 4], [10, 3], [29, 29], [21, 29], [3, 12], [29, 14], [12, 10]]) b.tree(x, z);
    b.bush(6, 9, 2.2, 1.2); b.bush(20, 2, 2, 1);
    // сарай садовника и деревянный забор огорода
    b.shed(1.5, 1.5, 4, 3.5);
    b.fence(6.5, 1, 13, 1, 1.2, 'wood');
    b.bench(13.6, 24, -Math.PI / 2); b.bench(8, 30.6, Math.PI);
    // игровая башенка с горкой, пикник, клумбы вдоль дорожки, лодка у пруда
    b.playTower(5.5, 12.5); b.picnic(21, 26, 0.3); b.picnic(27, 27.5, -0.2);
    b.planter(13.2, 13.2, 1.4, 1.4, 0.45, 'flowers'); b.planter(18.8, 18.8, 1.4, 1.4, 0.45, 'flowers');
    b.rowboat(4.2, 21.5, 0.8); b.streetSign(18.6, 13.4, 'ПАРКОВАЯ', 'АЛЛЕЯ ТЫКВ'); b.bikeRack(20.5, 13.6, 3, 0);
    b.lamp(17.6, 13.6, 0); b.lamp(14.4, 18.4, Math.PI); b.lamp(30.6, 17.6, -Math.PI / 2);
    b.item('balloon', 13.6, 27.4); b.item('balloon', 13, 28); b.item('balloon', 14.2, 28.2);
    b.zone('floor', 1, 6, 14.5, 14.5); b.zone('floor', 17.5, 12, 31, 19.5);
    b.cats(17.5, 1, 31, 18);
    b.spawn(16, 8); b.spawn(21, 16);
    b.hw(() => { b.pumpkin(21.6, 11, 0.4); b.pumpkin(16, 20.5); });
  },
};
