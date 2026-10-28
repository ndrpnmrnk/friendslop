import { THREE, G, tmat, col, glow, lam } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { actors } from '../../game/actors.js';
import { sfx } from '../../core/sfx.js';
import { burst, puff } from '../particles.js';

/* Кладбище (v0.60, 44×44 по схеме): склеп с подвалом и тайным ходом в тоннель под северной дорогой (северо-запад),
   часовня с колокольней (северо-восток), сторожка (юго-восток), посередине ряды могил, ровная дымка на весь район.
   Фишка — РУКИ ИЗ МОГИЛ: стоишь у могилы дольше 2 с — земля шевелится, слышен шёпот, и руки хватают за ноги
   на 2 с. Открытая могила — цель для захвата: столкнул соперника — выбирается 2 с. */
const TRI = new THREE.CylinderGeometry(1, 1, 1, 3);
const HX0 = 4.4, HZ0 = 9.2, HX1 = 5.6, HZ1 = 10.4; // люк в полу склепа
export default {
  id: 'cemetery', name: 'Кладбище', ground: 'grass', size: 44,
  holes: [[HX0, HZ0, HX1, HZ1]],
  build(b) {
    const st = tmat(T.stone()), dk = col(0x2b2533);
    b.path([[22, 44], [22, 13.5]], 3, T.dirt()); b.path([[0, 30], [44, 30]], 2.6, T.dirt(), .03); b.path([[22, 14], [8, 12.6]], 2.4, T.dirt(), .05);
    // ограда с проходами (юг, запад, восток)
    b.fence(1, 1, 43, 1); b.fence(1, 43, 20.2, 43); b.fence(23.8, 43, 43, 43);
    b.fence(1, 1, 1, 28.4); b.fence(1, 31.6, 1, 43); b.fence(43, 1, 43, 28.4); b.fence(43, 31.6, 43, 43);
    b.gateArch(22, 43, 3.6, 'ПОКОЙ');

    /* ---------- склеп с подвалом ---------- */
    b.house({ x: 3, z: 3, w: 10, d: 7.6, h: 3.6, wall: 0x8a8496, brick: false, windows: false, door: { side: 's', at: .62 }, parapet: false, inner: T.stone(), floor: T.cobble(), floorHole: [HX0, HZ0, HX1, HZ1],
      interior(f, r) { const cx = (r.x0 + r.x1) / 2 + 1;
        f.box(cx, r.z0 + 2.4, 2.2, 1.1, .9, st); f.box(cx, r.z0 + 2.4, 2.3, 1.2, .08, [st, st, tmat(T.grave()), st, st, st], { y: .9, solid: false });
        for (const [x, z] of [[r.x0 + .5, r.z0 + .5], [r.x1 - .5, r.z0 + .5], [r.x1 - .5, r.z1 - .6]]) { f.box(x, z, .3, .3, .9, st); f.m(G.box, col(0xf1e8d0), x, 1.05, z, .08, .2, .08); f.m(G.box, glow(0xffb35c), x, 1.2, z, .05, .08, .05); f.light(x, z, 1.2, .95); }
        const bone = col(0xe8e0d0), wd = tmat(T.wood());
        for (const x of [cx - 2, cx, cx + 2]) { f.m(G.box, dk, x, 1.5, r.z0 + .05, .9, .9, .06); f.m(G.box, st, x, 1.02, r.z0 + .15, 1.0, .08, .25); f.m(G.sph, bone, x - .15, 1.2, r.z0 + .14, .13, .12, .12); f.m(G.box, col(0xf1e8d0), x + .22, 1.16, r.z0 + .15, .06, .16, .06); f.m(G.box, glow(0xffb35c), x + .22, 1.27, r.z0 + .15, .04, .06, .04); }
        f.m(G.plane, glow(0x9a6ad8), cx, 2.75, r.z0 + .03, 1.4, .7, 1); f.m(G.box, dk, cx, 2.75, r.z0 + .04, .06, .72, .02); f.m(G.box, dk, cx, 2.75, r.z0 + .04, 1.42, .06, .02);
        for (const z of [r.z0 + 1.2, r.z0 + 2.6]) { f.m(G.box, wd, r.x1 - .35, 1.0, z, .3, 1.9, .62); f.m(G.box, col(0xd8c080), r.x1 - .52, 1.25, z, .02, .5, .06); f.m(G.box, col(0xd8c080), r.x1 - .52, 1.35, z, .02, .06, .28); f.solid(r.x1 - .35, z, .3, .62, 0, 1.9); }
        f.rug(cx, r.z1 - 1.4, 1.2, 2.6, '#5a1a2a', '#c8a040'); f.web(r.x0 + .3, 3.0, r.z0 + .3, Math.PI / 4, 1); f.web(r.x1 - .3, 3.0, r.z0 + .3, -Math.PI / 4, 1);
      } });
    // портик склепа
    { for (const x of [5.8, 7.4, 11.0, 12.6]) { b.m(G.box, st, x, .12, 11.1, .6, .24, .6); b.m(G.cyl8, st, x, 1.7, 11.1, .2, 2.9, .2); b.m(G.box, st, x, 3.25, 11.1, .55, .2, .55); b.solid(x, 11.1, .45, .45, 0, 3.3); }
      b.m(G.box, st, 9.2, 3.45, 11.1, 8.0, .25, .9); b.m(G.box, st, 9.2, 3.66, 10.65, 10.3, .12, .25);
      b.sign(9.2, 2.85, 10.64, 0, 'СЕМЕЙСТВО ТЫКВИНЫХ', '#5a5466', '#17111f', 2.6, .3);
      const pr = b.m(TRI, st, 9.2, 4.12, 10.9, 5.95, .9, .8); pr.rotation.x = -Math.PI / 2;
      b.m(G.cyl12, glow(0x9a6ad8), 9.2, 4.15, 11.42, .28, .02, .28).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) b.m(G.box, col(0x3a5a2a), 3.4 + Math.random() * 9.2, .2 + Math.random() * 3, 10.62, .3 + Math.random() * .4, .1, .02); }
    // подвал и тайный ход в тоннель (под северной дорогой)
    { const ob = tmat(T.oldBrick()), F = -4.15, e = () => .004 + Math.random() * .012;
      const S = (x0, z0, x1, z1, y0, y1, m) => { b.m(G.box, m, (x0 + x1) / 2, (y0 + y1) / 2 - .004, (z0 + z1) / 2, x1 - x0 - e(), y1 - y0 - e(), z1 - z0 - e()); b.solid((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, y0, y1 - y0); };
      for (const [dx, dz, w, d] of [[0, -.65, 1.4, .1], [0, .65, 1.4, .1], [-.65, 0, .1, 1.4], [.65, 0, .1, 1.4]]) b.m(G.box, dk, 5 + dx, .03, 9.8 + dz, w, .05, d);
      const lid = b.m(G.box, tmat(T.wood()), 6.1, .5, 9.8, .1, 1.0, 1.2); lid.rotation.z = .25;
      b.ladder(5, 9.2, 's', .05, F);
      S(3.3, 5.8, 7.6, 11.4, F - .3, F, st);
      S(3.0, 5.8, 3.3, 11.4, F, 0, ob); S(7.6, 5.8, 7.9, 11.4, F, 0, ob); S(3.0, 11.4, 7.9, 11.7, F, 0, ob);
      S(3.0, 5.5, 4.3, 5.8, F, 0, ob); S(5.7, 5.5, 7.9, 5.8, F, 0, ob);
      for (const z of [7, 9]) { b.box(6.6, z, 1.6, .7, .6, tmat(T.wood()), { y: F }); b.m(G.box, col(0x3a2418), 6.6, F + .62, z, 1.65, .05, .75); }
      b.m(G.box, glow(0xffb35c), 3.5, F + 1.2, 8.6, .06, .1, .06); b.light(4.5, 8.6, 1.8, F, true); b.web(7.5, F + 2.4, 11.3, Math.PI, 1);
      W.missionZones.push({ type: 'nook', x0: b.X(3.6), z0: b.Z(6.1), x1: b.X(6), z1: b.Z(8.8), y: b.Y + F, district: 'Кладбище' });
      S(4.3, -1.1, 5.7, 5.8, F - .3, F, st); S(4.0, -1.1, 4.3, 5.8, F, -1.15, ob); S(5.7, -1.1, 6.0, 5.8, F, -1.15, ob); S(4.0, -1.1, 6.0, 5.8, -1.15, 0, st);
      for (const z of [1.2, 4.2]) b.m(G.box, glow(0xffc070), 5, -1.4, z, .2, .1, .2);
      W.tunnelOpenings.push({ axis: 'x', at: b.Z(0) - 1.5 - .2, from: b.X(4.3), to: b.X(5.7) }); }

    /* ---------- часовня с колокольней ---------- */
    b.house({ x: 30, z: 2, w: 12, d: 10, h: 4.6, wall: 0x9a8a9a, brick: false, lit: .5, floor: T.floorWood(), inner: T.stone(), door: { side: 's', at: .5 }, parapet: false,
      interior(f, r) { const cx = (r.x0 + r.x1) / 2; for (const z of [r.z0 + 3.5, r.z0 + 5.2, r.z0 + 6.9]) for (const x of [cx - 2.2, cx + 2.2]) f.bench(x, z, Math.PI);
        f.box(cx, r.z0 + 1.2, 2.4, .9, 1.0, st); f.m(G.box, col(0xd8c080), cx, 1.06, r.z0 + 1.2, 2.5, .04, 1.0); for (const dx of [-.8, .8]) { f.m(G.box, col(0xf1e8d0), cx + dx, 1.2, r.z0 + 1.2, .08, .25, .08); f.m(G.box, glow(0xffb35c), cx + dx, 1.36, r.z0 + 1.2, .05, .08, .05); }
        f.m(G.plane, glow(0x9a6ad8), cx, 3.1, r.z0 + .03, 1.6, 1.4, 1); f.light(cx, r.z0 + 1.5, 2.2, 1); f.rug(cx, r.z0 + 5, 1.4, 6, '#5a1a2a', '#c8a040'); } });
    { const by = 4.6, bx = 36, bz = 7; b.box(bx, bz, 3, 3, 3.4, st, { y: by }); for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) b.m(G.box, st, bx + dx, by + 4.2, bz + dz, .35, 1.6, .35);
      b.m(G.cone4, col(0x4a3a5a), bx, by + 5.9, bz, 2.4, 1.8, 2.4); b.m(G.cyl6, col(0xd8c080), bx, by + 7.1, bz, .06, .6, .06);
      const bell = b.m(G.cone8, lam({ color: 0xc8964a, emissive: 0x3a2a00 }, 'cem60-bell'), bx, by + 4.1, bz, .55, .7, .55); W.keep.push(bell);
      W.bells.push({ x: b.X(bx), y: b.Y + by + 4.1, z: b.Z(bz), mesh: bell, ring: 0 }); }

    /* ---------- сторожка ---------- */
    b.house({ x: 34, z: 34, w: 7, d: 7, h: 3.2, wall: 0x6a5a4a, brick: true, lit: .6, floor: T.floorWood(), door: { side: 'w', at: .5, sign: ['СТОРОЖ', '#3a2a1a', '#f5c542'] }, roof: true,
      interior(f, r) { f.bed(r.x1 - 1, r.z1 - 1.3, Math.PI, 0x5a4a3a); f.ptable(r.x0 + 1.4, r.z0 + 1.4, .8); f.chair(r.x0 + 1.4, r.z0 + 2.2, Math.PI); f.kitchen(r.x1 - .4, r.z0 + 1.6, 2, -Math.PI / 2); f.item('rake', r.x0 + .6, r.z1 - .8); } });
    b.shed(37, 26, 3.5, 3); b.rake(35.5, 30.2, .7);

    /* ---------- могилы и фишка «руки из могил» ---------- */
    const graves = [];
    for (let z = 16.8; z <= 27; z += 3.2) for (let x = 8.5; x <= 36; x += 3.4) if (Math.abs(x - 22) > 2.6 && Math.random() < .86) { const gx = x + (Math.random() - .5) * .6, gz = z + (Math.random() - .5) * .4; b.graveVaried(gx, gz, (Math.random() - .5) * .25); graves.push({ x: b.X(gx), z: b.Z(gz + .9) }); }
    for (const z of [16, 22.5, 28]) { b.graveLantern(20.3, z); b.graveLantern(23.7, z + 1.5); }
    const handM = col(0x7a9a6a), hands = [0, 1].map(() => { const g = new THREE.Group(); g.add(new THREE.Mesh(G.box, handM)); g.children[0].scale.set(.12, .5, .12); for (let i = 0; i < 3; i++) { const fi = new THREE.Mesh(G.box, handM); fi.scale.set(.03, .16, .03); fi.position.set(-.04 + i * .04, .3, 0); g.add(fi); } g.visible = false; W.group.add(g); W.keep.push(g); return g; });
    const watch = new Map(); let hold = null;
    W.animated.push(dt => { for (const a of actors()) { if (a.hidden || a.drone || !a.onGround || a.pos.y > b.Y + .6) { watch.delete(a); continue; }
        let near = null; for (const q of graves) if (Math.hypot(a.pos.x - q.x, a.pos.z - q.z) < 1.15) { near = q; break; }
        if (!near) { watch.delete(a); continue; } const t = (watch.get(a) || 0) + dt; watch.set(a, t);
        if (t > 1.2 && t - dt <= 1.2) sfx('ghost', { at: a.pos, v: .5 });
        if (t > 1.2 && Math.random() < dt * 14) puff(a.pos.x + (Math.random() - .5) * .8, b.Y + .05, a.pos.z + (Math.random() - .5) * .8, { color: 0x4a3a2a, size: .12, vy: .8, g: 4, life: .5 });
        if (t > 2 && !hold) { hold = { a, t: 2, x: a.pos.x, z: a.pos.z }; watch.set(a, -3); a.knockT = Math.max(a.knockT || 0, 2); sfx('grab', { at: a.pos }); burst(a.pos.x, b.Y + .1, a.pos.z, 12, { color: 0x4a3a2a, size: .14, speed: 2, up: 2 }); } }
      if (hold) { hold.t -= dt; const a = hold.a; a.pos.x = hold.x; a.pos.z = hold.z; a.vel.x = a.vel.z = 0;
        hands.forEach((h, i) => { h.visible = true; const up = Math.min(1, (2 - hold.t) * 5) * Math.min(1, hold.t * 4); h.position.set(hold.x + (i ? .25 : -.25), b.Y - .5 + up * .62, hold.z + .15); h.rotation.z = Math.sin(performance.now() * .02 + i) * .2; });
        if (hold.t <= 0) { hold = null; hands.forEach(h => { h.visible = false; }); } } });

    /* ---------- открытая могила — цель для захвата ---------- */
    b.box(22, 34.6, 2.4, 1.4, .02, col(0x120c10), { solid: false });
    for (const [x, z, w, d] of [[22, 33.75, 2.6, .3], [22, 35.45, 2.6, .3]]) b.m(G.box, tmat(T.dirt()), x, .12, z, w, .24, d);
    b.m(G.cone8, tmat(T.dirt()), 24.4, .35, 34.6, .9, .7, .7); b.m(G.box, col(0x5a4a3a), 19.7, .7, 34.6, .1, 1.4, .1);
    b.grabTarget({ x: 22, z: 34.6, r: 1.2, kind: 'dunk', t: 2, color: 0x4a3a2a, label: 'яма' });

    /* ---------- деревья, дымка, вороны, мелочи ---------- */
    b.deadTree(4, 38); b.deadTree(14, 40); b.deadTree(28, 40.5); b.deadTree(41.5, 20); b.tree(15.5, 6.5, 1.1, 0, 'oak');
    for (const [x, z] of [[9, 33], [30, 33], [16, 14]]) b.leafPile(x, z, .55);
    for (const [x, z] of [[20.2, 18], [23.8, 18], [20.2, 26], [23.8, 26]]) b.lantern(x, z);
    b.bench(28, 14, 0); b.bench(14, 31.6, 0); b.lamp(20.3, 38, Math.PI / 2); b.lamp(23.7, 12, -Math.PI / 2); b.lamp(40, 31.5, Math.PI);
    b.softMist(0, 0, 44, 44, .5);
    b.birds('crow', 8, 15, 36, 30, 8);
    b.zone('nook', 25, 2, 29.5, 11); b.zone('floor', 6, 14, 38, 29);
    b.spawn(22, 40); b.spawn(10, 31); b.spawn(34, 13.5);
    b.hw(() => { b.pumpkin(7, 12.2); b.pumpkin(12, 12.2); b.pumpkin(33, 13); });
  },
};
