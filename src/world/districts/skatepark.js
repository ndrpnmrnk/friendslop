import { THREE, G, tmat, col, paint, lam } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';

/* Скейт-парк и стадион. Север: халфпайп из двух рамп, фанбокс с трамплинами, перила для скольжения,
   кикер, скейты и самокат (пробел — прыжок, E — слезть). Юг: футбольное поле с воротами (тут идёт
   тыквенный футбол), трибуны со ступенями, прожекторы по углам, табло. */
export default {
  id: 'skatepark', name: 'Скейт-парк', ground: 'asphalt',
  build(b) {
    // площадка скейт-парка — гладкий бетон
    b.ground(0.5, 0.5, 31.5, 14, T.concrete(), 4);
    // халфпайп
    b.quarterPipe(4, 7.2, 5, 2.2, -Math.PI / 2, 1.0);
    b.quarterPipe(11, 7.2, 5, 2.2, Math.PI / 2, 1.0);
    // фанбокс с двумя трамплинами и перилами наверху
    b.wedge(15.4, 7, 2.4, 2.0, 0.5, Math.PI / 2); b.box(18.9, 7, 3, 2.4, 0.5, tmat(T.concrete()));
    b.wedge(22.4, 7, 2.4, 2.0, 0.5, -Math.PI / 2);
    b.grindRail(17.6, 6.3, 20.2, 6.3, 0.95);
    // длинные перила и кикер
    b.grindRail(15, 11.6, 23, 11.6, 0.45); b.grindRail(25.5, 2.2, 25.5, 9, 0.45);
    b.wedge(28.5, 11.8, 2, 2.4, 0.8, Math.PI);
    b.wedge(17, 1.6, 3, 2.2, 0.6, 0);
    // скейты и самокат
    b.ride('skate', 8, 6, 0.5); b.ride('skate', 20, 3.4, 1.2); b.ride('scooter', 27.5, 6, -0.4); b.ride('skate', 13.5, 12.5, 2);
    // стена с граффити по северной кромке, скамейки, урны
    b.box(16, 0.25, 30, 0.3, 1.6, tmat(T.brickWall()));
    b.graffiti(7, 1.0, 0.41, 0, 3, 2); b.graffiti(16, 1.0, 0.41, 0, 3, 3); b.graffiti(25, 1.0, 0.41, 0, 3, 4);
    b.bench(30.4, 4, -Math.PI / 2); b.bin(30.6, 8);
    b.lamp(1.2, 13.4, Math.PI / 2); b.lamp(30.8, 13.4, -Math.PI / 2);
    // стадион: поле, разметка, ворота
    const x0 = 2.5, x1 = 29.5, z0 = 18, z1 = 31, cz = (z0 + z1) / 2, cx = (x0 + x1) / 2;
    b.ground(x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5, T.grass(), 2);
    const ln = 0xe8e8e0;
    b.marking(cx, z0, x1 - x0, 0.12, ln); b.marking(cx, z1, x1 - x0, 0.12, ln); b.marking(x0, cz, 0.12, z1 - z0, ln); b.marking(x1, cz, 0.12, z1 - z0, ln); b.marking(cx, cz, 0.12, z1 - z0, ln);
    const circ = b.m(new THREE.RingGeometry(2.3, 2.42, 32), paint(ln), cx, 0.035, cz); circ.rotation.x = -Math.PI / 2;
    for (const [gx, s] of [[x0, 1], [x1, -1]]) { b.marking(gx + s * 2, cz, 0.12, 6, ln); b.marking(gx + s * 1, cz - 3, 2, 0.12, ln); b.marking(gx + s * 1, cz + 3, 2, 0.12, ln); }
    b.goal(x0 + 0.3, cz, Math.PI / 2); b.goal(x1 - 0.3, cz, -Math.PI / 2);
    W.pitch = { x0: b.X(x0), z0: b.Z(z0), x1: b.X(x1), z1: b.Z(z1), y: b.Y, cx: b.X(cx), cz: b.Z(cz) };
    // трибуны с северной стороны поля, прожекторы, табло
    b.bleachers(cx, 17.0, 16, 3, 0);
    for (const [x, z, r] of [[1.2, 16.6, 0.8], [30.8, 16.6, -0.8], [1.2, 31.2, 2.4], [30.8, 31.2, -2.4]]) b.floodlight(x, z, r, 8);
    b.scoreboard(cx, 31.6, Math.PI);
    b.item('ball', cx, cz); for (const z of [21, 28]) b.cone(cx + 4, z);
    b.cushion(cx - 3, 17.0, 0.45);
    b.zone('floor', x0 + 1, z0 + 1, x1 - 1, z1 - 1); b.zone('floor', 14, 9, 31, 13.6);
    b.cats(0.5, 14.5, 31.5, 17);
    b.spawn(cx, cz - 3); b.spawn(8, 12);
    b.hw(() => { b.pumpkin(2.5, 15); b.pumpkin(29.5, 14.6); });
    void col; void lam;
  },
};
