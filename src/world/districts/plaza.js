import { THREE, G, tmat, col, glow, lam } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { burst, puff, ripple } from '../particles.js';
import { rep } from '../../core/textures.js';

/* Площадь — осенняя ярмарка: плиты, розетка брусчатки и дорожки; многоярусный фонтан в центре (в воде замедляешься)
   и два питьевых фонтанчика, вокруг —
   фонари-тыквы и скамейки, четыре ярмарочные палатки (у одной — шарики с водой, у другой
   раздача для доставки), гирлянды через всю площадь, часовая башня — на балкон по лестнице,
   остановка со стеклом, голуби. */
export default {
  id: 'plaza', name: 'Площадь', ground: 'flag',
  build(b) {
    const st = tmat(T.stone()), cx = 16, cz = 17, R = 3.8;
    // мощение: розетка из колец брусчатки вокруг фонтана и четыре дорожки к краям площади (без наложения слоёв)
    const ros = b.m(new THREE.CircleGeometry(1, 40), lam({ map: T.rosette(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }, 'rosette', true), cx, 0.012, cz, 7.4, 7.4, 1); ros.rotation.x = -Math.PI / 2;
    const pm = len => lam({ map: rep(T.pathStone(), 1, len / 4.8), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, 'path' + len, true);
    for (const [x0, z0, x1, z1] of [[cx, 6.6, cx, cz - 7.3], [cx, cz + 7.3, cx, 29.8], [0.4, cz, cx - 7.3, cz], [cx + 7.3, cz, 31.6, cz]]) {
      const alongZ = x0 === x1, len = alongZ ? Math.abs(z1 - z0) : Math.abs(x1 - x0), p2 = b.m(G.plane, pm(len), (x0 + x1) / 2, 0.014, (z0 + z1) / 2, 2.4, len, 1);
      p2.rotation.x = -Math.PI / 2; if (!alongZ) p2.rotation.z = Math.PI / 2;
      for (const sd of [-1.25, 1.25]) b.m(G.box, st, (x0 + x1) / 2 + (alongZ ? sd : 0), 0.03, (z0 + z1) / 2 + (alongZ ? 0 : sd), alongZ ? 0.12 : len, 0.06, alongZ ? len : 0.12);
    }
    // главный фонтан: восьмигранная чаша с бортиком, в центре колонна с двумя чашами и тыквой, четыре струи-дуги
    b.water(cx, cz, R - 0.2, 0, false);
    const rim = new THREE.LatheGeometry([new THREE.Vector2(R - 0.22, 0), new THREE.Vector2(R + 0.3, 0), new THREE.Vector2(R + 0.3, 0.42), new THREE.Vector2(R + 0.15, 0.58), new THREE.Vector2(R - 0.22, 0.58), new THREE.Vector2(R - 0.22, 0)], 8);
    b.m(rim, st, cx, 0, cz).rotation.y = Math.PI / 8;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; b.solid(cx + Math.cos(a) * R, cz + Math.sin(a) * R, 0.6, 0.6, 0, 0.58); }
    b.m(G.cyl8, st, cx, 0.25, cz, 0.75, 0.5, 0.75); b.m(G.cyl8, st, cx, 1.0, cz, 0.32, 1.4, 0.32); b.solid(cx, cz, 1.3, 1.3, 0, 1.7);
    b.m(G.cone8, st, cx, 1.55, cz, 1.25, 0.3, 1.25).rotation.x = Math.PI; b.m(G.cyl12, st, cx, 1.74, cz, 1.25, 0.12, 1.25); b.m(G.cyl12, tmat(T.water()), cx, 1.81, cz, 1.08, 0.03, 1.08);
    b.m(G.cyl8, st, cx, 2.2, cz, 0.16, 0.8, 0.16); b.m(G.cone8, st, cx, 2.55, cz, 0.62, 0.2, 0.62).rotation.x = Math.PI; b.m(G.cyl12, st, cx, 2.68, cz, 0.62, 0.1, 0.62); b.m(G.cyl12, tmat(T.water()), cx, 2.74, cz, 0.5, 0.03, 0.5);
    b.m(G.sph10, tmat(T.pumpkin()), cx, 2.98, cz, 0.3, 0.24, 0.3); b.m(G.cyl6, col(0x3f6b2a), cx, 3.26, cz, 0.05, 0.12, 0.05);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.m(G.cyl6, col(0x8a7a5a), cx + Math.cos(a) * 1.18, 1.86, cz + Math.sin(a) * 1.18, 0.06, 0.14, 0.06).rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); }
    { const wx = b.X(cx), wz = b.Z(cz), y0 = b.Y; let ft = 0;
      W.animated.push(dt => { ft -= dt; if (ft > 0) return; ft = 0.07;
        puff(wx, y0 + 3.3, wz, { color: 0x9ccbec, size: 0.16, vx: (Math.random() - 0.5) * 1.2, vy: 3.2, vz: (Math.random() - 0.5) * 1.2, g: 9, life: 0.9, grow: 0.2 });
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; puff(wx + Math.cos(a) * 1.25, y0 + 1.9, wz + Math.sin(a) * 1.25, { color: 0x8ac0e8, size: 0.14, vx: Math.cos(a) * 1.6, vy: 1.6, vz: Math.sin(a) * 1.6, g: 9, life: 0.55, grow: 0.25, opacity: 0.8 }); }
        if (Math.random() < 0.3) ripple(wx + (Math.random() - 0.5) * 4, y0 + 0.1, wz + (Math.random() - 0.5) * 4, 0.6, 1); });
    }
    // два питьевых фонтанчика у дорожек: E — попить (восстанавливает силы)
    for (const [x, z, ry] of [[cx - 9.8, cz - 2.2, 0], [cx + 9.8, cz + 2.2, Math.PI]]) b.drinkFountain(x, z, ry);
    // фонари-тыквы вокруг фонтана
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.26; b.lantern(cx + Math.cos(a) * (R + 1.6), cz + Math.sin(a) * (R + 1.6)); }
    b.bench(cx - R - 2.9, cz, Math.PI / 2); b.bench(cx + R + 2.9, cz, -Math.PI / 2); b.bench(cx, cz + R + 2.9, Math.PI); b.bench(cx, cz - R - 2.9, 0);
    // ФИШКА: часовая башня, на балкон — по лестнице
    b.clockTower(16, 4);
    for (const x of [13.6, 18.4]) b.bollard(x, 6.2);
    // ярмарочные палатки лицом к фонтану
    b.tent(5.2, 10.5, Math.PI / 2, '#d8243a', '#f1e8ff', 'apple', 'ЯБЛОКИ');
    b.tent(26.8, 10.5, -Math.PI / 2, '#7b4bc4', '#f5c542', 'tomato', 'СЛАДОСТИ');
    b.tent(5.2, 23.5, Math.PI / 2, '#4ab0f0', '#f1e8ff', 'carrot', 'ШАРИКИ');
    b.tent(26.8, 23.5, -Math.PI / 2, '#ff8a1f', '#2a1f3d', 'pumpkin', 'ТЫКВЫ');
    for (const z of [22.9, 23.5, 24.1]) b.item('balloon', 5.95, z, 1.1);
    for (const z of [10.0, 11.0]) b.item('tomato', 26.05, z, 1.1);
    W.spots.pickup.push({ x: b.X(25.0), z: b.Z(10.5), y: b.Y, f: [1, 0], district: 'Площадь', label: 'ярмарка' });
    // гирлянды через всю площадь
    b.hw(() => { b.stringLights(2, 7.8, 30, 7.8, 3.3); b.stringLights(2, 27.2, 30, 27.2, 3.3); });
    if (!b.d.includes('_')) { b.stringLights(1.5, 14, 1.5, 21, 3.0); b.stringLights(30.5, 14, 30.5, 21, 3.0); }
    // остановка со стеклом (бьётся), скамейка смотрит на дорогу
    const mt = col(0x3a4a6a);
    for (const x of [10.2, 15.8]) b.box(x, 30.4, 0.15, 0.15, 2.6, mt);
    b.box(13, 30.9, 6, 1.6, 0.12, mt, { y: 2.6 });
    b.vitrine(13, 30.25, 5.4, 1.9, 'x', 0.45);
    b.bench(13, 31.1, 0);
    b.sign(13, 2.9, 31.72, 0, 'АВТОБУС 13', '#f5c542', '#17111f', 2.2, 0.4);
    // клумбы, деревья, уличные мелочи
    b.planter(2.5, 3, 3, 2.2, 0.5, 'tree'); b.planter(29.5, 3, 3, 2.2, 0.5, 'tree');
    b.planter(9.5, 3, 2.6, 1.2, 0.45, 'flowers'); b.planter(22.5, 3, 2.6, 1.2, 0.45, 'flowers');
    b.planter(22, 30.6, 3, 1, 0.45, 'shrub');
    b.newsBox(19.5, 30.8, Math.PI); b.postBox(25.5, 30.8, Math.PI); b.streetSign(30.7, 30.7, 'ПЛОЩАДЬ', 'ТЫКВЕННЫЙ ПР.');
    b.utilityBox(31, 16, -Math.PI / 2); b.bikeRack(1.2, 26, 3, Math.PI / 2);
    b.bin(9, 7.5); b.bin(23, 7.5); b.bin(9, 26.5);
    b.lamp(1.2, 1.2, Math.PI / 4); b.lamp(30.8, 1.2, -Math.PI / 4); b.lamp(1.2, 30.8, Math.PI * 0.75); b.lamp(30.8, 30.8, -Math.PI * 0.75);
    b.leafPile(3.6, 27.9, 0.7); b.leafPile(28.4, 27.6, 0.8);
    b.puddle(20, 27, 0.9); b.puddle(10.5, 14, 0.8);
    b.ride('kidcar', 27.3, 17.5, -Math.PI / 2); b.ride('ring', 16, 19.6, 0, 0.06); b.ride('scooter', 4, 17.5, 0.3);
    b.birds('pigeon', 6, 19, 26, 29, 8);
    b.zone('floor', 1, 8.5, 31, 29);
    b.cats(8, 8, 24, 28);
    b.spawn(3.5, 15); b.spawn(28.5, 19);
    b.hw(() => { b.pumpkin(cx + R + 1.2, cz + 2.4); b.pumpkin(12.6, 6.6); b.web(17.2, 6.2, 2.79, Math.PI, 1); });
  },
};
