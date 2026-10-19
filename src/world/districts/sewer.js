import { THREE, G, tmat, col, glow } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { addSolid, addZone } from '../physics.js';
import { burst } from '../particles.js';

/* Коллектор: открытый канал глубиной 4 м проходит через весь район и уходит в тоннели под дорогами.
   Вниз — по лестницам или ступеням, по дну течёт вода (замедляет), по бокам бетонные бортики.
   Через канал — мост. Из канала в подземную насосную ведёт узкая труба: там только ползком (C).
   Из насосной — люк наверх. На поверхности — здание насосной станции. */
const FLOOR = -4, LEDGE = -3;
export default {
  id: 'sewer', name: 'Коллектор', ground: 'concrete',
  holes: [[12, 0, 20, 32], [27.4, 23.4, 28.6, 24.6]],
  build(b) {
    const conc = tmat(T.concrete()), brick = tmat(T.brickWall()), dk = col(0x2b2533);
    const S = (x0, z0, x1, z1, y0, y1, mat) => { b.m(G.box, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0); b.solid((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, y0, y1 - y0); };
    // канал продолжается под дорогами до стен тоннелей (−1.3 и 33.3)
    const za = -1.3, zb = 33.3;
    S(11.6, za, 12, zb, FLOOR, 0.15, brick); S(20, za, 20.4, 21.4, FLOOR, 0.15, brick); S(20, 22.6, 20.4, zb, FLOOR, 0.15, brick);
    S(20, 21.4, 20.4, 22.6, -1.8, 0.15, brick);
    S(12, za, 20, zb, FLOOR - 0.3, FLOOR, conc);
    S(12, za, 13.5, zb, FLOOR, LEDGE, conc); S(18.5, za, 20, zb, FLOOR, LEDGE, conc);
    b.waterRect(13.5, za, 18.5, zb, FLOOR + 0.18);
    W.zones[W.zones.length - 1].y = b.Y + FLOOR;
    W.tunnelOpenings.push({ axis: 'x', at: b.Z(0) - 1.5 - 0.2, from: b.X(12), to: b.X(20) });
    W.tunnelOpenings.push({ axis: 'x', at: b.Z(32) + 1.5 + 0.2, from: b.X(12), to: b.X(20) });
    // спуски: лестницы и ступени
    b.ladder(12, 6, 'e', 0.15, LEDGE);
    for (const z of [10, 24]) W.spots.fish.push({ x: b.X(12.9), z: b.Z(z), y: b.Y + LEDGE, f: [1, 0], wx: b.X(15.5), wz: b.Z(z), wy: b.Y + FLOOR + 0.25, district: 'Коллектор', label: 'в канале' });
    b.ladder(20, 27, 'w', 0.15, LEDGE);
    b.stairs(19.25, 13.2, 'n', LEDGE, 0.15, 1.3, LEDGE);
    // мост через канал
    b.box(16, 16, 8, 3, 0.25, conc, { y: -0.1 });
    for (const z of [14.6, 17.4]) { b.m(G.box, dk, 16, 0.75, z, 8, 0.06, 0.06); for (let x = 12.3; x < 20; x += 1) b.m(G.box, dk, x, 0.45, z, 0.05, 0.6, 0.05); b.solid(16, z, 8, 0.1, 0.15, 0.8); }
    // трубы в стенах, из которых течёт вода
    for (const [x, z, s] of [[11.7, 12, 1], [20.3, 4, -1], [11.7, 26, 1]]) {
      const p = b.m(G.pipe, tmat(T.rust()), x + s * 0.2, -1.6, z, 0.55, 0.8, 0.55); p.rotation.z = Math.PI / 2;
      b.m(G.pipeRim, tmat(T.metal()), x + s * 0.61, -1.6, z, 0.55, 0.55, 1).rotation.y = s * Math.PI / 2;
      const wx = b.X(x + s * 0.6), wz = b.Z(z), wy = b.Y - 1.6; let ft = Math.random();
      W.animated.push(dt => { ft -= dt; if (ft <= 0) { ft = 0.1; burst(wx, wy, wz, 2, { color: 0x6a90b0, size: 0.2, speed: 0.6, up: -0.5, g: 9, life: 0.7 }); } });
    }
    for (let z = 2; z < 32; z += 6) { b.m(G.box, glow(0xffc070), 12.15, -1.2, z, 0.12, 0.2, 0.3); b.light(13, z, 1.6, LEDGE - 0.15 + 0.03); }
    // узкая труба в насосную: высота 1.2 м — только ползком
    const pz = 22;
    S(20.4, pz - 1, 26, pz - 0.6, LEDGE, -1.8, conc); S(20.4, pz + 0.6, 26, pz + 1, LEDGE, -1.8, conc);
    S(20.4, pz - 1, 26, pz + 1, -1.8, -1.4, conc);
    S(20.4, pz - 0.6, 26, pz + 0.6, LEDGE - 0.3, LEDGE, conc);
    b.m(G.cyl12, tmat(T.rust()), 20.5, LEDGE + 0.6, pz, 0.75, 0.15, 0.75).rotation.z = Math.PI / 2;
    // подземная насосная
    const r0 = [26, 19.5, 31, 26];
    S(r0[0], r0[1], r0[2], r0[3], LEDGE - 0.3, LEDGE, conc);
    S(r0[0] - 0.4, r0[1] - 0.4, r0[2] + 0.4, r0[1], LEDGE, 0, brick); S(r0[0] - 0.4, r0[3], r0[2] + 0.4, r0[3] + 0.4, LEDGE, 0, brick);
    S(r0[2], r0[1], r0[2] + 0.4, r0[3], LEDGE, 0, brick);
    S(r0[0] - 0.4, r0[1], r0[0], pz - 0.6, LEDGE, 0, brick); S(r0[0] - 0.4, pz + 0.6, r0[0], r0[3], LEDGE, 0, brick); S(r0[0] - 0.4, pz - 0.6, r0[0], pz + 0.6, -1.8, 0, brick);
    for (const [x0, z0, x1, z1] of [[r0[0], r0[1], r0[2], 23.4], [r0[0], 24.6, r0[2], r0[3]], [r0[0], 23.4, 27.4, 24.6], [28.6, 23.4, r0[2], 24.6]]) S(x0, z0, x1, z1, -0.4, 0, conc);
    b.ladder(28, 24.6, 'n', 0.15, LEDGE);
    for (const x of [27, 29.6]) b.pump(x, 20.6, 0.5, 1.6, LEDGE);
    b.m(G.box, glow(0x9be36b), 30.6, LEDGE + 1.4, 25.4, 0.05, 0.3, 0.6); b.m(G.box, glow(0xffc070), 28.5, -0.55, 21.5, 0.3, 0.1, 0.3);
    W.missionZones.push({ type: 'nook', x0: b.X(26.4), z0: b.Z(21.6), x1: b.X(30.6), z1: b.Z(25.6), y: b.Y + LEDGE, district: 'Коллектор' });
    // люк насосной на поверхности
    for (const [dx, dz, w, d] of [[0, -0.65, 1.4, 0.1], [0, 0.65, 1.4, 0.1], [-0.65, 0, 0.1, 1.4], [0.65, 0, 0.1, 1.4]]) b.m(G.box, dk, 28 + dx, 0.17, 24 + dz, w, 0.04, d);
    b.m(G.cyl12, tmat(T.metal()), 29.4, 0.18, 24.4, 0.55, 0.05, 0.55);
    // насосная станция наверху
    b.house({ x: 22, z: 2, w: 9, d: 8, h: 4.4, wall: 0x6a7a8a, lit: 0.6, door: { side: 'w', at: 0.5, sign: ['НАСОСНАЯ', '#3a6a9a', '#f1e8ff'] }, ladder: { side: 'e', at: 0.5 }, roof: true,
      interior(b, r) { for (const x of [24.5, 28]) b.pump(x, 6, 0.8, 2);
        b.box(r.x1 - 0.4, 3, 0.4, 1.6, 1.6, col(0x4a4e66)); b.m(G.box, glow(0x9be36b), r.x1 - 0.62, 1.2, 3, 0.02, 0.5, 1); } });
    // ограждение канала наверху, кроме проходов к спускам
    for (const [x, z0, z1] of [[11.5, 0.5, 4.5], [11.5, 7.5, 14.4], [11.5, 17.6, 31.5], [20.5, 0.5, 7.5], [20.5, 11, 14.4], [20.5, 17.6, 25.5], [20.5, 28.5, 31.5]]) b.fence(x, z0, x, z1, 1.1, 'iron');
    b.crate(5, 5, 1.1); b.crate(6.1, 5.2, 0.9); b.barrel(3, 28); b.barrel(4, 28.6);
    b.bench(6, 16, Math.PI / 2); b.trashBags(1.5, 9, 2); b.puddle(6, 25, 1); b.graffiti(12.02, -2.2, 18, Math.PI / 2, 2.6, 4); b.utilityBox(10.6, 22, -Math.PI / 2); b.planter(5, 22.5, 2.2, 1.2, 0.45, 'shrub'); b.tree(3, 20); b.tree(8, 26); b.lamp(10.5, 16, -Math.PI / 2); b.lamp(22, 16, Math.PI / 2);
    b.ride('barrow', 25, 14, 1);
    b.zone('floor', 1, 1, 11, 31); b.zone('floor', 21, 11, 31, 18);
    W.missionZones.push({ type: 'tunnel', x0: b.X(13.6), z0: b.Z(2), x1: b.X(18.4), z1: b.Z(30), y: b.Y + FLOOR, district: 'Коллектор' });
    b.spawn(6, 10); b.spawn(26, 30);
    b.hw(() => { b.pumpkin(9, 3); b.pumpkin(24, 11.5); });
  },
};
