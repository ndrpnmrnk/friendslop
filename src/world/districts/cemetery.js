import { THREE, G, tmat, col, glow, alphaMat } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';

// Кладбище: склеп с интерьером, сторожка (ломается), туман, вороны, нычка за склепом
export default {
  id: 'cemetery', name: 'Кладбище', ground: 'grass',
  holes: [[12.4, 6.6, 13.6, 7.8]],
  build(b) {
    b.ground(14.6, 11, 17.4, 32, T.dirt(), 2);
    b.fence(1, 1, 31, 1); b.fence(1, 31, 14.2, 31); b.fence(17.8, 31, 31, 31);
    b.fence(1, 1, 1, 14); b.fence(1, 18, 1, 31); b.fence(31, 1, 31, 14); b.fence(31, 18, 31, 31);
    b.house({ x: 11, z: 2, w: 10, d: 7, h: 3.6, wall: 0x8a8496, brick: false, windows: false, door: { side: 's', at: 0.5 }, parapet: false, inner: T.stone(), floor: T.cobble(), floorHole: [12.4, 6.6, 13.6, 7.8],
      interior(b, r) {
        const st = tmat(T.stone()); b.box(16, 5.5, 2.2, 1.1, 0.9, st); b.box(16, 5.5, 2.3, 1.2, 0.08, [st, st, tmat(T.grave()), st, st, st], { y: 0.9, solid: false });
        for (const [x, z] of [[r.x0 + 0.5, r.z0 + 0.5], [r.x1 - 0.5, r.z0 + 0.5], [r.x0 + 0.5, r.z1 - 0.6], [r.x1 - 0.5, r.z1 - 0.6]]) {
          b.box(x, z, 0.3, 0.3, 0.9, tmat(T.stone())); b.m(G.box, col(0xf1e8d0), x, 1.05, z, 0.08, 0.2, 0.08); b.m(G.box, glow(0xffb35c), x, 1.2, z, 0.05, 0.08, 0.05); b.light(x, z, 1.2, 0.95);
        }
      } });
    const pd = b.m(G.cone4, tmat(T.stone()), 16, 4.3, 9.05, 1, 1, 1); pd.rotation.y = Math.PI / 4; pd.scale.set(4, 1.4, 0.3);
    for (let z = 13; z <= 28; z += 3) for (let x = 3.5; x <= 29; x += 3.4) if (Math.abs(x - 16) > 2 && Math.random() < 0.85) b.grave(x + (Math.random() - 0.5) * 0.5, z);
    b.deadTree(28, 6); b.deadTree(4, 22);
    b.gateArch(16, 31, 3.6, 'ПОКОЙ');
    // ФИШКА: люк в полу склепа → подвал с гробами → тайный ход в тоннель под дорогой
    {
      const st = tmat(T.stone()), ob = tmat(T.oldBrick()), F = -4.15;
      const S = (x0, z0, x1, z1, y0, y1, m) => { b.m(G.box, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0); b.solid((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, y0, y1 - y0); };
      for (const [dx, dz, w, d] of [[0, -0.65, 1.4, 0.1], [0, 0.65, 1.4, 0.1], [-0.65, 0, 0.1, 1.4], [0.65, 0, 0.1, 1.4]]) b.m(G.box, col(0x2b2533), 13 + dx, 0.03, 7.2 + dz, w, 0.05, d);
      const lid = b.m(G.box, tmat(T.wood()), 14.1, 0.5, 7.2, 0.1, 1.0, 1.2); lid.rotation.z = 0.25;
      b.ladder(13, 6.6, 's', 0.05, F);
      // подвал под склепом
      S(11.3, 3.2, 15.6, 8.8, F - 0.3, F, st);
      S(11.0, 3.2, 11.3, 8.8, F, 0, ob); S(15.6, 3.2, 15.9, 8.8, F, 0, ob); S(11.0, 8.8, 15.9, 9.1, F, 0, ob);
      S(11.0, 2.9, 12.3, 3.2, F, 0, ob); S(13.7, 2.9, 15.9, 3.2, F, 0, ob);
      for (const [x, z] of [[14.6, 4.4], [14.6, 6.4]]) { b.box(x, z, 1.6, 0.7, 0.6, tmat(T.wood()), { y: F }); b.m(G.box, col(0x3a2418), x, F + 0.62, z, 1.65, 0.05, 0.75); }
      b.m(G.box, glow(0xffb35c), 11.5, F + 1.2, 6, 0.06, 0.1, 0.06); b.m(G.box, col(0xf1e8d0), 11.5, F + 1.05, 6, 0.08, 0.2, 0.08); b.light(12.5, 6, 1.8, F, true);
      b.web(15.5, F + 2.4, 8.7, Math.PI, 1);
      W.missionZones.push({ type: 'nook', x0: b.X(11.6), z0: b.Z(3.5), x1: b.X(14), z1: b.Z(6.2), y: b.Y + F, district: 'Кладбище' });
      // тайный ход до стены тоннеля
      S(12.3, -1.1, 13.7, 3.2, F - 0.3, F, st);
      S(12.0, -1.1, 12.3, 3.2, F, -1.15, ob); S(13.7, -1.1, 14.0, 3.2, F, -1.15, ob);
      S(12.0, 0, 14.0, 3.2, -1.15, 0, st);
      b.m(G.box, glow(0xffc070), 13, -1.4, 1.2, 0.2, 0.1, 0.2);
      W.tunnelOpenings.push({ axis: 'x', at: b.Z(0) - 1.5 - 0.2, from: b.X(12.3), to: b.X(13.7) });
    }
    for (const [x, z] of [[14.2, 18], [17.8, 18], [14.2, 27], [17.8, 27]]) b.lantern(x, z);
    b.bench(24, 11.6, 0); b.bench(8, 11.6, 0);
    b.shed(3, 3, 4, 3.5);
    b.lamp(14.2, 14, Math.PI / 2); b.lamp(17.8, 24, -Math.PI / 2);
    b.zone('nook', 22, 2, 30.4, 9.4);
    b.zone('floor', 2, 10, 30, 30.4);
    b.birds('crow', 18, 11, 30, 29, 7);
    const fm = alphaMat(T.fog(), { opacity: 0.55 });
    for (let i = 0; i < 9; i++) {
      const m = b.m(G.plane, fm, 3 + Math.random() * 26, 0.35 + Math.random() * 0.2, 11 + Math.random() * 18, 7, 7, 1); m.rotation.x = -Math.PI / 2;
      const x0 = m.position.x, ph = Math.random() * 6; W.animated.push((dt, t) => { m.position.x = x0 + Math.sin(t * 0.25 + ph) * 1.5; });
    }
    b.spawn(16, 30); b.spawn(4.5, 12);
    b.mist(1, 9, 31, 31);
    b.hw(() => { b.pumpkin(13.4, 10); b.pumpkin(18.6, 10); });
  },
};
