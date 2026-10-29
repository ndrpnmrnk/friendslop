import { random } from '../../core/random.js';
import { buildPlazaFountain } from '../plaza-landmarks.js';
import { THREE, G, tmat, smat, col, lam } from '../../core/gfx.js';
import { T, rep } from '../../core/textures.js';
import { W } from '../state.js';
import { puff, burst } from '../particles.js';
import { actors } from '../../game/actors.js';
import { sfx } from '../../core/sfx.js';

/* Площадь (v0.60, 44×44 по схеме): кафе с балконом (север-запад), почта (север-восток), часовая башня (юго-запад),
   голубиный рынок (юго-восток), в центре фонтан. Фишка — ФОНТАН-ПОДКИДЫШ: пять форсунок по кругу срабатывают по
   очереди и подбрасывают на 5 м. За секунду до струи — бульканье, пузыри и подсвеченная форсунка. Форсунка у кафе —
   лифт на балкон. Чаша фонтана — цель для захвата: кинул соперника в воду. */
const CX = 22, CZ = 24, R = 4.2;
export default {
  id: 'plaza', name: 'Площадь', ground: 'flag', size: 44,
  build(b) {
    const st = tmat(T.stone());
    // мощение: розетка вокруг фонтана и четыре дорожки к краям
    const ros = b.m(new THREE.CircleGeometry(1, 40), lam({ map: T.rosette(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }, 'rosette', true), CX, .012, CZ, 9.4, 9.4, 1); ros.rotation.x = -Math.PI / 2;
    const pm = len => lam({ map: rep(T.pathStone(), 1, len / 4.8), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, 'path60-' + len, true);
    for (const [x0, z0, x1, z1] of [[CX, 12.6, CX, CZ - 9.3], [CX, CZ + 9.3, CX, 43.6], [.4, CZ, CX - 9.3, CZ], [CX + 9.3, CZ, 43.6, CZ]]) {
      const alongZ = x0 === x1, len = alongZ ? Math.abs(z1 - z0) : Math.abs(x1 - x0), p2 = b.m(G.plane, pm(len), (x0 + x1) / 2, .014, (z0 + z1) / 2, 2.6, len, 1);
      p2.rotation.x = -Math.PI / 2; if (!alongZ) p2.rotation.z = Math.PI / 2;
      for (const sd of [-1.35, 1.35]) b.m(G.box, st, (x0 + x1) / 2 + (alongZ ? sd : 0), .03, (z0 + z1) / 2 + (alongZ ? 0 : sd), alongZ ? .12 : len, .06, alongZ ? len : .12);
    }
    buildPlazaFountain(b, CX, CZ, R);
    b.grabTarget({ x: CX, z: CZ + R + .9, r: 1.3, kind: 'dunk', t: 2, dir: [0, -1], label: 'чаша' });

    /* ---------- фишка: форсунки-подкидыши ---------- */
    const nozM = () => lam({ color: 0x3a4a5a, emissive: 0x4ab0f0, emissiveIntensity: 0 }, null);
    const colM = lam({ color: 0xbfe4ff, emissive: 0x4a8ac0, emissiveIntensity: .5, transparent: true, opacity: .62, depthWrite: false }, 'jet60');
    const jets = [[CX, CZ - R - 2.6], [CX + R + 2.6, CZ], [CX, CZ + R + 2.6], [CX - R - 2.6, CZ], [11, 14.2]].map(([x, z], i) => {
      const m = nozM(); b.m(G.cyl12, st, x, .03, z, .55, .06, .55); const noz = b.m(G.cyl8, m, x, .08, z, .3, .1, .3); noz.userData.noBatch = true;
      const c = b.m(G.cyl8, colM, x, 0, z, .42, 1, .42); c.visible = false; W.keep.push(c);
      const h = b.hazard({ x, z, r: 1.1, active: () => j.state !== 'idle' });
      const j = { x: b.X(x), z: b.Z(z), m, c, state: 'idle', t: 0, i, h }; return j; });
    { let cur = 0, wait = 1.5; const WARN = 1, FIRE = .7;
      W.animated.push(dt => { wait -= dt; if (wait <= 0 && jets[cur].state === 'idle') { jets[cur].state = 'warn'; jets[cur].t = 0; sfx('water', { at: { x: jets[cur].x, y: b.Y, z: jets[cur].z }, v: .6 }); cur = (cur + 1) % jets.length; wait = 2.1; }
        for (const j of jets) { if (j.state === 'idle') continue; j.t += dt;
          if (j.state === 'warn') { j.m.emissiveIntensity = .6 + Math.abs(Math.sin(j.t * 18)) * 1.4; if (random() < dt * 25) puff(j.x + (random() - .5) * .5, b.Y + .1, j.z + (random() - .5) * .5, { color: 0xbfe4ff, size: .1, vy: 1.4, g: 4, life: .4 });
            if (j.t > WARN) { j.state = 'fire'; j.t = 0; j.c.visible = true; sfx('hydrant', { at: { x: j.x, y: b.Y, z: j.z } });
              for (const a of actors()) if (Math.hypot(a.pos.x - j.x, a.pos.z - j.z) < .95 && a.pos.y < b.Y + 1.2 && !a.hidden && !a.drone) { if (a.ride && W.dismount) W.dismount(a); a.vel.y = 15.5; a.vel.x *= .3; a.vel.z *= .3; a.onGround = false; a.airPeak = a.pos.y; a.climb = null; }
              for (const it of W.items) if (it.state === 'rest' && Math.hypot(it.pos.x - j.x, it.pos.z - j.z) < .9) { it.state = 'fly'; it.vel.set((random() - .5) * 2, 12, (random() - .5) * 2); } } }
          else { const k = j.t / FIRE, hgt = 5.2 * Math.sin(Math.min(1, k) * Math.PI); j.c.scale.set(.42, Math.max(.01, hgt), .42); j.c.position.y = b.Y + hgt / 2; j.c.updateMatrix(); j.m.emissiveIntensity = 2;
            if (random() < dt * 30) burst(j.x, b.Y + hgt, j.z, 2, { color: 0xbfe4ff, size: .12, speed: 2, up: 1, life: .5 });
            if (j.t > FIRE) { j.state = 'idle'; j.c.visible = false; j.m.emissiveIntensity = 0; } } } }); }

    /* ---------- кафе с балконом (СЗ) ---------- */
    b.tower({ x: 2, z: 2, w: 16, d: 9, floors: 2, fh: 3.8, wall: 0xb07a5a, brick: true, lit: .65, floor: T.floorWood(),
      door: { side: 's', at: .5, sign: ['КАФЕ «ТЫКВА»', '#7a2a1a', '#ffd27a'] },
      interior(f, k, r) { const cz = (r.z0 + r.z1) / 2;
        if (k === 0) { f.kitchen(r.x1 - 3.2, r.z0 + .4, 3); for (const x of [r.x0 + 1.6, r.x0 + 4.4, r.x0 + 7.2]) { f.ptable(x, cz + 1.4, .8); f.chair(x - .8, cz + 1.4, Math.PI / 2); f.chair(x + .8, cz + 1.4, -Math.PI / 2); } f.plantPot(r.x1 - .5, r.z1 - .5); f.item('mug', r.x1 - 2.4, r.z0 + .7, 1.0); return; }
        for (const x of [r.x0 + 2, r.x0 + 6, r.x0 + 10]) { f.ptable(x, cz, .8); f.chair(x, cz + .9, Math.PI); f.chair(x, cz - .9, 0); } f.sofa(r.x1 - .6, cz, -Math.PI / 2, 0x9a4a5a); f.rug(r.x0 + 6, cz, 6, 2.4, '#7a2a1a', '#ffd27a'); } });
    // балкон на втором этаже над входом + лестница сбоку
    { const Y = 3.8, mt = tmat(T.paintMetal(0x3a3046));
      b.box(10, 12.25, 13, 2.5, .2, smat(T.concrete()), { y: Y - .2 });
      for (const [x, z, w, d] of [[10, 13.45, 13, .06], [3.55, 12.25, .06, 2.5], [16.45, 12.25, .06, 2.5]]) { b.m(G.box, mt, x, Y + .95, z, w, .06, d); b.solid(x, z, Math.max(w, .1), Math.max(d, .1), Y, 1); }
      for (let x = 3.8; x < 16.4; x += .55) b.m(G.box, mt, x, Y + .48, 13.45, .04, .95, .04);
      b.climbTrim(10, 12.25, 13, 2.5, Y, 's');
      for (const x of [5, 15]) b.m(G.box, mt, x, (Y - .2) / 2, 13.35, .14, Y - .2, .14), b.solid(x, 13.35, .18, .18, 0, Y - .2);
      b.ladder(3.2, 12.4, 'w', Y);
      b.ptable(8, 12.1, 0); b.ptable(12.5, 12.1, 0); b.parasol(8, 11.8, '#ff8a1f', '#2a1f3d'); }
    b.zone('roof', 3.6, 11, 16.4, 13.4, 3.8);

    /* ---------- почта (СВ) ---------- */
    b.house({ x: 30, z: 2, w: 12, d: 11, h: 4.2, wall: 0x4a6a9a, brick: false, lit: .6, roof: true, floor: T.floorTile(),
      door: { side: 's', at: .4, sign: ['ПОЧТА', '#2a4a8a', '#f5c542'] },
      interior(f, r) { f.box((r.x0 + r.x1) / 2, r.z0 + 3.2, r.x1 - r.x0 - 2, .6, 1.05, tmat(T.wood())); f.shelf(r.x0 + .3, r.z0 + 1.4, 3, Math.PI / 2, true); f.shelf(r.x1 - .3, r.z0 + 1.4, 3, -Math.PI / 2, true);
        for (const [x, s] of [[r.x0 + 1.5, .8], [r.x0 + 2.4, .6], [r.x1 - 1.6, .7]]) f.crate(x, r.z0 + .7, s); f.bench(r.x0 + 1.2, r.z1 - .6, Math.PI); f.plantPot(r.x1 - .5, r.z1 - .5); f.item('parcel', r.x0 + 4, r.z0 + 3.2, 1.06); } });
    b.postBox(41.6, 14.4, Math.PI); b.newsBox(29.2, 14.4, Math.PI);

    /* ---------- часовая башня (ЮЗ) ---------- */
    b.clockTower(6, 38); for (const z of [35.2, 40.8]) b.bollard(9.4, z);

    /* ---------- голубиный рынок (ЮВ) ---------- */
    { const wd = tmat(T.wood());
      b.box(37, 33.5, 6, 1.4, .9, wd); b.m(G.box, col(0xd8243a), 37, .93, 33.5, 6.1, .05, 1.5);
      for (const x of [34.6, 36.2, 37.8, 39.4]) { const c = b.m(G.box, lam({ map: T.chainlink(), transparent: true, alphaTest: .4 }, 'cage60'), x, 1.32, 33.5, .9, .75, .8); c.userData.noBatch = false; b.m(G.box, col(0x6a4a2a), x, .96, 33.5, .95, .04, .85); }
      b.parasol(36.5, 36.2, '#4ab0f0', '#f1e8ff'); b.crate(41, 35.8, .8); b.crate(41.2, 36.9, .6); }
    b.birds('pigeon', 30, 28, 42, 40, 10);

    /* ---------- ярмарочные палатки, остановка, мелочи ---------- */
    b.tent(4.5, 18, Math.PI / 2, '#d8243a', '#f1e8ff', 'apple', ''); b.tent(4.5, 29.5, Math.PI / 2, '#4ab0f0', '#f1e8ff', 'carrot', '');
    b.tent(39.5, 18.5, -Math.PI / 2, '#ff8a1f', '#2a1f3d', 'pumpkin', '');
    for (const z of [29, 29.6, 30.2]) b.item('balloon', 5.3, z, 1.1);
    W.spots.pickup.push({ x: b.X(38.2), z: b.Z(18.5), y: b.Y, f: [-1, 0], district: 'Площадь', label: 'ярмарка' });
    for (const [x, z, ry] of [[CX - 9.6, CZ - 2.4, 0], [CX + 9.6, CZ + 2.4, Math.PI]]) b.drinkFountain(x, z, ry);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .39; b.lantern(CX + Math.cos(a) * (R + 4.8), CZ + Math.sin(a) * (R + 4.8)); }
    b.bench(CX - 7.4, CZ + 4.6, Math.PI / 2); b.bench(CX + 7.4, CZ - 4.6, -Math.PI / 2); b.bench(CX + 4.6, CZ + 7.4, Math.PI); b.bench(CX - 4.6, CZ - 7.4, 0);
    { const mt = tmat(T.paintMetal(0x3a4a6a)); for (const x of [27.2, 32.8]) b.box(x, 42.6, .15, .15, 2.6, mt);
      b.box(30, 43.1, 6, 1.4, .12, mt, { y: 2.6 }); b.m(G.box, tmat(T.corrugated(0x5a6a8a)), 30, 2.76, 43.1, 5.9, .04, 1.3); b.vitrine(30, 42.45, 5.4, 1.9, 'x', .45); b.bench(30, 43.3, 0); }
    b.planter(18.5, 14.6, 2.6, 1.1, .45, 'flowers'); b.planter(25.5, 14.6, 2.6, 1.1, .45, 'flowers');
    b.planter(42.2, 29, 1.6, 3, .45, 'shrub'); b.utilityBox(43.2, 10, -Math.PI / 2); b.bikeRack(25.5, 42.8, 3, 0);
    b.bin(13, 33); b.bin(31, 15.5); b.bin(16, 41);
    for (const [x, z] of [[14, 38], [30, 39], [41, 23.5], [13.6, 7.5]]) b.tree(x, z);
    b.lamp(1.2, 15, Math.PI / 2); b.lamp(42.8, 15, -Math.PI / 2); b.lamp(13, 43, Math.PI); b.lamp(42.8, 41, -Math.PI / 2);
    b.leafPile(16.5, 37.5, .7); b.leafPile(28.5, 10.4, .8); b.puddle(27, 31, .9); b.puddle(15, 21, .8);
    b.ride('kidcar', 35, 26, -Math.PI / 2); b.ride('scooter', 9, 26.5, .3);
    b.zone('floor', 8, 14, 36, 34); b.cats(10, 15, 34, 34);
    b.spawn(14, 30); b.spawn(31, 18); b.spawn(22, 38);
    b.hw(() => { b.pumpkin(CX + R + 1.2, CZ + 2.8); b.pumpkin(19.4, 13.2); });
  },
};
