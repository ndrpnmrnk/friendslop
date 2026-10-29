import { random } from '../../core/random.js';
import { THREE, G, tmat, smat, col, glow, lam, compose } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { actors, daze } from '../../game/actors.js';
import { sfx } from '../../core/sfx.js';
import { smoke, splash } from '../particles.js';

/* Заправка (v0.60, 44×44 по схеме): магазинчик (северо-запад), навес с колонками (центр-запад), автостоянка (юго-запад)
   и длинная АВТОМОЙКА-ТОННЕЛЬ на востоке (с севера на юг, въезд и выезд). Фишка: три поста щёток и сушилка.
   Пешком щётки толкают и сбивают с толку; на машинке/велике/самокате проезжаешь насквозь — на выезде сушилка
   даёт разгон. Лампы над въездами: зелёная — пусто, красная — моют. Въезд — цель для захвата: затолкал соперника —
   щётки гоняют его до выезда. */
const TX0 = 30, TX1 = 41, TZ0 = 5, TZ1 = 37, LANE = (TX0 + TX1) / 2;
export default {
  id: 'gas', name: 'Заправка', ground: 'asphalt', size: 44,
  build(b) {
    const white = lam({ color: 0xf1e8ff }, 'gas60-white', true), red = lam({ color: 0xd8243a }, 'gas60-red', true), dk = col(0x2b2533);

    /* ---------- магазин (СЗ) ---------- */
    b.house({ x: 3, z: 3, w: 12, d: 9, h: 3.4, wall: 0xd8d0c0, brick: false, lit: .9, door: { side: 's', at: .5 }, sign: ['МАГАЗИН', '#d8243a', '#f1e8ff'], floor: T.floorTile(), ladder: { side: 'e', at: .5 }, roof: true,
      interior(f, r) { const cx = (r.x0 + r.x1) / 2; f.shelf(cx - 2, r.z0 + 2.4, 4, Math.PI / 2, true); f.shelf(cx + .5, r.z0 + 2.4, 4, Math.PI / 2, true); f.box(r.x1 - .7, r.z1 - 2, .8, 2.6, 1.0, tmat(T.wood())); f.cabinet(r.x0 + .5, r.z0 + .4, .6, .6, 1.5, 0x3a3a40); f.safe(r.x1 - .5, r.z0 + .5, -Math.PI / 2); f.cabinet(r.x0 + .4, r.z1 - 1.4, .6, 1.8, 2, 0xd8d8e0, 0, Math.PI / 2); f.item('energy', r.x1 - .7, r.z1 - 2.6, 1.0); } });
    b.vending(15.5, 9, -Math.PI / 2); { const ice = col(0xe8f0ff); b.box(9, 13, 1.6, .8, 1.1, [ice, ice, ice, ice, tmat(T.sign('ЛЁД', '#4ab0f0', '#f1e8ff')), ice]); }
    { const cage = lam({ map: T.chainlink(), alphaTest: .5, side: THREE.DoubleSide }, 'cageLink'); b.m(G.box, cage, 4.5, .75, 13.2, 2.4, 1.5, 1.0); b.solid(4.5, 13.2, 2.4, 1.0, 0, 1.5);
      for (const x of [3.7, 4.3, 4.9, 5.5]) { b.m(G.cyl8, col(0xd8243a), x, .45, 13.2, .18, .7, .18); b.m(G.sph, col(0xd8243a), x, .82, 13.2, .17, .12, .17); } }

    /* ---------- навес с колонками ---------- */
    const CX = 17, CZ = 24, CW = 15, CD = 9;
    b.ground(CX - 8, CZ - 5, CX + 8, CZ + 5, T.concrete(), 3);
    for (const [x, z] of [[CX - 6.6, CZ - 3.6], [CX + 6.6, CZ - 3.6], [CX - 6.6, CZ + 3.6], [CX + 6.6, CZ + 3.6]]) b.box(x, z, .45, .45, 4, col(0xd8d8e0));
    { const roof = b.prop(CX, CZ); roof.add(compose('gas60-canopy', a => { a(G.box, red, 0, 4.225, 0, CW, .45, CD);
        for (const [x, z, w, d] of [[0, -CD / 2 - .05, CW + .2, .14], [0, CD / 2 + .05, CW + .2, .14], [-CW / 2 - .05, 0, .14, CD], [CW / 2 + .05, 0, .14, CD]]) { a(G.box, white, x, 3.99, z, w, .28, d); a(G.box, red, x, 4.21, z, w, .16, d); a(G.box, white, x, 4.445, z, w, .31, d); } })); }
    b.solid(CX, CZ, CW, CD, 4, .45); b.box(CX, CZ - CD / 2 - .1, 4.2, .3, 1.1, tmat(T.sign('АЗС 24', '#d8243a', '#f1e8ff')), { y: 4.45 });
    for (const z of [CZ - 2.2, CZ + 2.2]) b.m(G.box, glow(0xfff1d0), CX, 3.94, z, 9, .035, .4); b.light(CX, CZ, 6);
    b.box(CX + 7.3, CZ + 3.6, .1, .7, 4, col(0x6a6d78)); b.ladder(CX + 7.35, CZ + 3.6, 'e', 4.45); b.zone('roof', CX - 7, CZ - 4, CX + 7, CZ + 4, 4.45); b.climbTrim(CX, CZ, CW, CD, 4.45);
    for (const z of [CZ - 1.6, CZ + 1.6]) { b.box(CX, z, 6, 1, .18, tmat(T.concrete()));
      for (const x of [CX - 1.7, CX + 1.7]) { const mt = col(0xd8d8e0); b.box(x, z, .8, .55, 1.5, [mt, mt, mt, mt, tmat(T.fuelPump()), mt], { y: .18 }); b.m(G.box, col(0xd8243a), x, 1.75, z, .82, .12, .57);
        const curve = new THREE.CatmullRomCurve3([[0, 1.4, 0], [.35, .9, 0], [.32, .35, .03], [.05, .38, .1], [.05, 1.05, .2]].map(a => new THREE.Vector3(...a)));
        const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, .035, 4, false), col(0x1b1721)); hose.position.set(b.X(x + .43), b.Y, b.Z(z)); b.g.add(hose); W.mapResources.add(hose.geometry); } }
    b.car(CX - 5, CZ, Math.PI / 2, 0x4a7ac8, 'hatch');
    b.slip(CX + 3.5, CZ + 3.4, 1.0); b.slip(CX - 4, CZ - 3.2, .8);
    b.m(G.cyl6, dk, 26.5, 2.5, 16, .1, 5, .1); b.solid(26.5, 16, .3, .3, 0, 5); b.box(26.5, 16, 1.6, .2, 1.4, col(0xd8243a), { y: 4.2, solid: false }); b.sign(26.5, 4.9, 16.12, 0, '95  59.90', '#17111f', '#f5c542', 1.4, .4);
    { const mt = col(0x2a7ac8); b.box(25.5, 30, .7, .5, 1.4, [mt, mt, mt, mt, tmat(T.sign('ВОЗДУХ', '#2a7ac8', '#f1e8ff')), mt]); }

    /* ---------- фишка: автомойка-тоннель ---------- */
    const wall = smat(T.corrugated(0x526d7b)), metal = tmat(T.paintMetal(0x415567)), light = col(0xbebfb8);
    b.ground(TX0 + .3, 0, TX1 - .3, 44, T.concrete(), 2, .025);
    for (const z of [TZ0 + 4, TZ0 + 12, TZ0 + 20, TZ1 - 4]) b.marking(LANE, z, .3, 2.4, 0xf5c542);
    for (const x of [TX0, TX1]) { b.box(x, (TZ0 + TZ1) / 2, .3, TZ1 - TZ0, 3.4, wall); b.box(x, (TZ0 + TZ1) / 2, .4, TZ1 - TZ0, .16, metal, { y: 3.4 }); }
    b.box(LANE, (TZ0 + TZ1) / 2, TX1 - TX0 + .4, TZ1 - TZ0, .18, smat(T.metal()), { y: 3.56 });
    for (const z of [TZ0, TZ1]) { for (const x of [TX0 + .2, TX1 - .2]) b.box(x, z, .4, .4, 3.4, light); b.box(LANE, z, TX1 - TX0, .35, .5, light, { y: 3.1 }); }
    for (let z = TZ0 + 3; z < TZ1; z += 4) b.m(G.box, glow(0xb9d5dd), LANE, 3.5, z, .2, .035, 2.4);
    b.zone('roof', TX0, TZ0, TX1, TZ1, 3.74);
    const lamps = [TZ0 - .2, TZ1 + .2].map(z => b.warnLamp(LANE, 3.0, z + (z < 20 ? -.05 : .05), 0xff3a2a, .3));
    const posts = [TZ0 + 7, TZ0 + 15, TZ0 + 23].map(z => {
      const side = [-1, 1].map(s => { const q = b.prop(LANE + s * 3.1, z); q.add(compose('wash60-brush', a => { const blue = tmat(T.cloth(0x456b9b)), cyan = tmat(T.cloth(0x6a9faf)); for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; a(G.box, i % 2 ? blue : cyan, Math.cos(an) * .5, 1.45, Math.sin(an) * .5, .2, 2.6, .14, 0, -an, 0); } a(G.cyl8, metal, 0, 1.45, 0, .12, 2.9, .12); })); W.keep.push(q); return q; });
      const top = b.prop(LANE, z); top.position.y += 2.75; top.add(compose('wash60-top', a => { const cloth = tmat(T.cloth(0x8a516b)); a(G.cyl12, cloth, 0, 0, 0, .4, 7, .4, 0, 0, Math.PI / 2); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; a(G.box, cloth, 0, Math.cos(an) * .38, Math.sin(an) * .38, 6.9, .1, .1); } })); W.keep.push(top);
      return { z: b.Z(z), side, top }; });
    const dryer = b.m(G.box, metal, LANE, 3.0, TZ1 - 3, TX1 - TX0 - .8, .5, .6); void dryer;
    for (let i = 0; i < 6; i++) b.m(G.box, dk, LANE - 3.6 + i * 1.45, 2.72, TZ1 - 3, .6, .06, .3);
    let tick = 0, busy = 0;
    const inTunnel = a => a.pos.x > b.X(TX0 + .3) && a.pos.x < b.X(TX1 - .3) && a.pos.z > b.Z(TZ0) && a.pos.z < b.Z(TZ1) && a.pos.y < b.Y + 2;
    W.animated.push(dt => { tick -= dt; busy = Math.max(0, busy - dt);
      for (const a of actors()) { if (a.hidden || a.drone || !inTunnel(a)) continue; busy = 1;
        if (a.washRunT > 0) { a.washRunT -= dt; a.vel.z = 7.5; a.vel.x += (b.X(LANE) - a.pos.x) * 2 * dt; daze(a, .5); }
        for (const p of posts) { if (Math.abs(a.pos.z - p.z) > 1.1) continue;
          if (a.ride) { a.wetT = 3; continue; }
          if (!(a.washSafe > 0)) { daze(a, 1.0); a.washSafe = 1.4; const s = a.pos.x < b.X(LANE) ? 1 : -1; a.vel.x += s * 4; a.vel.z += (random() < .5 ? -1 : 1) * 3; splash(a.pos.x, a.pos.y, a.pos.z, .5); sfx('water', { at: a.pos, v: .5 }); } }
        a.washSafe = Math.max(0, (a.washSafe || 0) - dt);
        // сушилка на выезде: транспорт выходит чистым и быстрым
        if (a.ride && Math.abs(a.pos.z - b.Z(TZ1 - 3)) < 1.2 && !(a.dryCD > 0)) { a.dryCD = 3; const v = a.ride; v.vx = (v.vx || 0) * 1.6; v.vz = (v.vz || 0) * 1.6; v.boostT = Math.max(v.boostT || 0, 1.2); a.wetT = 0; sfx('dash', { at: a.pos }); sfx('wind', { at: a.pos, v: .6 }); }
        if (a.dryCD > 0) a.dryCD -= dt; }
      const spin = busy > 0 ? 7 : 1.2; for (const p of posts) { p.side[0].rotation.y += dt * spin; p.side[1].rotation.y -= dt * spin; p.top.rotation.x += dt * spin * .8; }
      for (const l of lamps) l.set(busy > 0 ? 1 : .35); for (const l of lamps) l.m.material.emissive.setHex(busy > 0 ? 0xff3a2a : 0x3aff6a);
      if (busy > 0 && tick <= 0) { tick = .2; for (const p of posts) for (let i = 0; i < 3; i++) smoke(b.X(LANE - 2 + i * 2), b.Y + 2.9, p.z, { color: 0xc8e6f2, size: .1, grow: .18, vy: -3, g: 6, life: .6, opacity: .6 }); } });
    b.hazard({ x0: TX0 + .3, z0: TZ0 + 5.8, x1: TX1 - .3, z1: TZ0 + 24.2, active: () => busy > 0 });
    b.grabTarget({ x: LANE, z: TZ0 - 1.2, r: 1.2, kind: 'fling', t: .8, dir: [0, 1], label: 'въезд', onUse: v => { v.washRunT = 4; } });
    b.ride('scooter', LANE - 2, 2, 0); b.ride('bike', LANE + 2, 41.5, Math.PI);

    /* ---------- автостоянка (ЮЗ) ---------- */
    for (let x = 2.5; x <= 20.5; x += 3) b.marking(x, 37.6, .12, 4.4);
    [[4, 0xf5c542, 'taxi'], [7, 0x3a7ac8, 'sedan'], [13, 0x6a8a5a, 'pickup'], [19, 0xc83a3a, 'hatch']].forEach(([x, c, ty], i) => b.car(x, 37.6, Math.PI / 2 + (i % 2 ? Math.PI : 0), c, ty));
    b.house({ x: 22.5, z: 39.6, w: 3.6, d: 3.4, h: 2.7, wall: 0xd8d0c0, brick: false, lit: 1, door: { side: 'n', at: .5 }, parapet: false,
      interior(f, r) { f.box((r.x0 + r.x1) / 2, r.z1 - .4, 2.4, .6, .85, tmat(T.wood())); f.m(G.box, tmat(T.screen()), (r.x0 + r.x1) / 2, 1.15, r.z1 - .3, .6, .45, .3); f.ride('chair', (r.x0 + r.x1) / 2, r.z1 - 1.4, 0); } });
    b.box(22, 33.6, .4, .4, 1.1, col(0x6a6d78)); b.m(G.box, glow(0xd8243a), 22, 1.25, 33.6, .15, .15, .15);
    b.m(G.box, tmat(T.stripe()), 19, 1.0, 33.6, 5.6, .12, .12); b.solid(19, 33.6, 5.6, .2, .92, .16);
    b.brickWall(11, 43.2, 18, 1.0, 'x', 0, { bw: 1, bh: .5 });

    /* ---------- мелочи ---------- */
    for (let i = 0; i < 4; i++) b.m(G.cyl12, col(0x17111f), 27.5, .17 + i * .32, 31, .45, .3, .45); b.solid(27.5, 31, .9, .9, 0, 1.3);
    b.barrel(1.8, 15.5); b.barrel(2.8, 15.2); b.crate(2.3, 17.2, 1); b.tires(27.5, 9, 4); b.tires(27.5, 10, 3);
    b.ground(2, 18.5, 8, 30, T.grass(), 2); b.tree(4, 21); b.tree(5, 28); b.picnic(5.5, 24.5, .1); b.bin(7.6, 19.6);
    b.planter(10, 13.2, 2.2, .9, .4, 'flowers'); b.bollard(CX - 6.6, CZ + 5.2); b.bollard(CX + 6.6, CZ + 5.2);
    b.lamp(28.6, 3, Math.PI); b.lamp(28.6, 41, Math.PI); b.lamp(1.2, 33, Math.PI / 2); b.hydrant(28.5, 20);
    b.bin(25, 41.6); b.cone(29, 6.5); b.cone(29, 35.5); b.trashBags(42.6, 3, 2); b.puddle(23, 19, 1);
    b.zone('floor', 9, 29, 29, 34); b.zone('floor', 2, 14, 9, 31); b.zone('floor', 16, 10, 29, 18);
    b.spawn(22, 31.5); b.spawn(10, 16.5); b.spawn(26, 12);
    b.hw(() => { b.pumpkin(15.5, 13); b.web(CX - 6.6, 3.6, CZ - 3.3, 0, 1); });
  },
};
