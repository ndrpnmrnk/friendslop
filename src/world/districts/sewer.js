import { routeLight } from '../wayfinding.js';
import { storageBay, pipeCradle } from '../storage.js';
import { THREE, G, tmat, smat, col, glow, lam } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { burst } from '../particles.js';
import { actors, knockDown } from '../../game/actors.js';
import { sfx } from '../../core/sfx.js';

/* Коллектор (v0.60, 44×44 по схеме): открытый канал глубиной 4 м проходит через весь район с севера на юг и уходит
   в тоннели под дорогами. Вниз — по лестницам, ступеням и прыжковой «лесенке»; по дну течёт вода (замедляет).
   Через канал — мост и рыбацкий мостик. Из канала в подземную насосную ведёт узкая труба (только ползком), оттуда люк
   наверх. Насосная станция — на северо-востоке. Фишка — ВОЛНА: примерно раз в 70 с за 3 с гудит и мигают лампы над
   каналом, потом с севера проходит волна и смывает всех и всё в южный тоннель. Край канала — цель для захвата. */
const FLOOR = -4, LEDGE = -3, CX0 = 18, CX1 = 26;
export default {
  id: 'sewer', name: 'Коллектор', ground: 'concrete', size: 44,
  holes: [[CX0, 0, CX1, 44], [33, 31, 35, 33]],
  build(b) {
    const surfaceY = b.Y; b = b.at(-b.Y);
    const conc = smat(T.concrete()), brick = smat(T.brickWall()), dk = col(0x2b2533);
    const S = (x0, z0, x1, z1, y0, y1, mat) => { b.m(G.box, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0); b.solid((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, y0, y1 - y0); };
    const za = -1.49, zb = 45.49, pz = 30;
    S(CX0 - .4, za, CX0, zb, FLOOR, .15, brick); S(CX1, za, CX1 + .4, pz - .6, FLOOR, .15, brick); S(CX1, pz + .6, CX1 + .4, zb, FLOOR, .15, brick); S(CX1, pz - .6, CX1 + .4, pz + .6, -1.8, .15, brick);
    S(CX0, za, CX1, zb, FLOOR - .3, FLOOR, conc);
    S(CX0, za, CX0 + 1.5, zb, FLOOR, LEDGE, conc); S(CX1 - 1.5, za, CX1, zb, FLOOR, LEDGE, conc);
    b.waterRect(CX0 + 1.5, za, CX1 - 1.5, zb, FLOOR + .22); W.zones[W.zones.length - 1].y = b.Y + FLOOR;
    W.tunnelOpenings.push({ axis: 'x', at: b.Z(0) - 1.5 - .2, from: b.X(CX0), to: b.X(CX1) });
    W.tunnelOpenings.push({ axis: 'x', at: b.Z(44) + 1.5 + .2, from: b.X(CX0), to: b.X(CX1) });
    // спуски: лестницы, ступени, прыжковая «лесенка»
    b.ladder(CX0, 10, 'e', .15, LEDGE); routeLight(b, CX0 + .012, 10, LEDGE + .38, Math.PI / 2, false, 0xb6c9a1); routeLight(b, CX0 - 1.1, 10, surfaceY, 0, true);
    b.ladder(CX1, 34, 'w', .15, LEDGE); routeLight(b, CX1 - .012, 34, LEDGE + .38, -Math.PI / 2, false, 0xb6c9a1); routeLight(b, CX1 + 1.1, 34, surfaceY, 0, true);
    b.stairs(CX1 - .75, 16, 'n', LEDGE, .15, 1.3, LEDGE);
    for (let i = 0; i < 4; i++) b.box(CX0 + .9, 36 + i * .85, 1.3, .9, .22, conc, { y: LEDGE + (i + 1) * .75 - .22 });
    // мост через канал и рыбацкий мостик
    b.box(22, 21.5, 12, 3, .25, conc, { y: -.1 });
    for (const z of [20.1, 22.9]) { b.m(G.box, dk, 22, .75, z, 8.2, .06, .06); for (let x = CX0 + .3; x < CX1; x += 1) b.m(G.box, dk, x, .45, z, .05, .6, .05); b.solid(22, z, 8.2, .1, .15, .8); }
    for (let i = 0; i < 14; i++) { const x = CX0 + .6 + Math.random() * 6.8, z = i % 2 ? 20.05 : 22.95; b.m(G.box, col([0xd8243a, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff][i % 5]), x, .66, z, .08, .1, .05); }
    b.box(22, 6, 3.8, 2.6, .18, tmat(T.wood()), { y: -.03 }); for (const x of [20.3, 23.7]) b.box(x, 6, .12, .12, 4, dk, { y: -4 }); b.plank(CX0, 6, 20.2, 6, .15, 1.2);
    W.spots.fish.push({ x: b.X(22), z: b.Z(6.9), y: b.Y + .15, f: [0, 1], wx: b.X(22), wz: b.Z(9), wy: b.Y + FLOOR + .25, cx: b.X(22), cz: b.Z(8.7), R: 2.0, camP: [b.X(22), b.Y + 3.8, b.Z(3.7)], camL: [b.X(22), b.Y - 1.2, b.Z(8.5)], district: 'Коллектор', label: 'рыбацкий мостик' });
    // трубы в стенах, из них течёт вода
    for (const [x, z, s] of [[CX0 - .3, 14, 1], [CX1 + .3, 8, -1], [CX0 - .3, 40, 1]]) { const p = b.m(G.pipe, tmat(T.rust()), x + s * .2, -1.6, z, .55, .8, .55); p.rotation.z = Math.PI / 2;
      b.m(G.pipeRim, tmat(T.metal()), x + s * .61, -1.6, z, .55, .55, 1).rotation.y = s * Math.PI / 2; const wx = b.X(x + s * .6), wz = b.Z(z), wy = b.Y - 1.6; let ft = Math.random();
      W.animated.push(dt => { ft -= dt; if (ft <= 0) { ft = .1; burst(wx, wy, wz, 2, { color: 0x6a90b0, size: .2, speed: .6, up: -.5, g: 9, life: .7 }); } }); }
    for (let z = 3; z < 44; z += 6) { b.m(G.box, glow(0xffc070), CX0 + .15, -1.2, z, .12, .2, .3); b.light(CX0 + 1, z, 1.6, LEDGE - .15 + .03); }

    /* ---------- фишка: волна ---------- */
    const lamps = []; for (let z = 4; z < 44; z += 8) for (const x of [CX0 - .45, CX1 + .45]) lamps.push(b.warnLamp(x, .45, z, 0xff3a2a, .22));
    const foam = lam({ color: 0xe8f4ff, emissive: 0x6a9ac0, emissiveIntensity: .4, transparent: true, opacity: .8, depthWrite: false }, 'sewer60-wave');
    const wave = new THREE.Group(); W.group.add(wave); W.keep.push(wave);
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(G.box, foam); m.scale.set(CX1 - CX0 - .2, 1.9 - i * .5, .7 + i * .6); m.position.set(0, (1.9 - i * .5) / 2, -i * .5); wave.add(m); } wave.visible = false;
    const WV = { state: 'calm', t: 0, z: -2, next: 55 + Math.random() * 25 };
    const inCanal = a => a.pos.x > b.X(CX0) && a.pos.x < b.X(CX1) && a.pos.y < b.Y - .8;
    W.animated.push(dt => { WV.t += dt;
      if (WV.state === 'calm' && WV.t > WV.next) { WV.state = 'warn'; WV.t = 0; sfx('thunder', { at: { x: b.X(22), y: b.Y - 2, z: b.Z(22) }, range: 70, v: .8 }); }
      else if (WV.state === 'warn') { for (const l of lamps) l.set(Math.sin(WV.t * 12) > 0 ? 1 : .15); if (WV.t > 3) { WV.state = 'wave'; WV.t = 0; WV.z = -2; wave.visible = true; sfx('water', { at: { x: b.X(22), y: b.Y - 2, z: b.Z(0) }, range: 60 }); } }
      else if (WV.state === 'wave') { WV.z += 11 * dt; wave.position.set(b.X(22), b.Y + FLOOR + .2, b.Z(WV.z)); wave.updateMatrixWorld(true);
        for (const l of lamps) l.set(Math.sin(WV.t * 12) > 0 ? 1 : .15);
        const wz = b.Z(WV.z); if (Math.random() < dt * 30) burst(b.X(CX0 + 1 + Math.random() * 6), b.Y + FLOOR + 1.8, wz, 2, { color: 0xe8f4ff, size: .16, speed: 2, up: 2, life: .5 });
        for (const a of actors()) if (!a.hidden && !a.drone && inCanal(a) && a.pos.z < wz + .6 && a.pos.z > wz - 3) { if (a.ride && W.dismount) W.dismount(a); if (!(a.stun > 0)) knockDown(a, 0, 11, 1.4); a.vel.z = 11.5; a.pos.z = Math.max(a.pos.z, wz + .3); a.wetT = 3; }
        for (const it of W.items) if (it.state !== 'held' && it.state !== 'gone' && it.pos.x > b.X(CX0) && it.pos.x < b.X(CX1) && it.pos.y < b.Y - .8 && it.pos.z < wz + .6 && it.pos.z > wz - 3) { it.state = 'fly'; it.vel.set(0, 2, 11); }
        if (WV.z > 50) { WV.state = 'calm'; WV.t = 0; WV.next = 60 + Math.random() * 20; wave.visible = false; for (const l of lamps) l.set(0); } } });
    b.hazard({ x0: CX0, z0: 0, x1: CX1, z1: 44, y1: -.8, active: () => WV.state !== 'calm' });
    b.grabTarget({ x: CX0 - .9, z: 28, r: 1.0, y: 0, kind: 'dunk', t: 1.4, dir: [1, 0], label: 'край' });
    b.grabTarget({ x: CX1 + .9, z: 12, r: 1.0, y: 0, kind: 'dunk', t: 1.4, dir: [-1, 0], label: 'край', ring: false });

    /* ---------- узкая труба и подземная насосная ---------- */
    S(CX1 + .4, pz - 1, 32, pz - .6, LEDGE, -1.8, conc); S(CX1 + .4, pz + .6, 32, pz + 1, LEDGE, -1.8, conc);
    S(CX1 + .4, pz - 1, 32, pz + 1, -1.8, -1.4, conc); S(CX1 + .4, pz - .6, 32, pz + .6, LEDGE - .3, LEDGE, conc);
    b.m(G.cyl12, tmat(T.rust()), CX1 + .5, LEDGE + .6, pz, .75, .15, .75).rotation.z = Math.PI / 2;
    const r0 = [32, 27, 37, 34], RIM = .22, ROOF = -.08;
    S(r0[0], r0[1], r0[2], r0[3], LEDGE - .3, LEDGE, conc);
    S(r0[0] - .4, r0[1] - .4, r0[2] + .4, r0[1], LEDGE, RIM, brick); S(r0[0] - .4, r0[3], r0[2] + .4, r0[3] + .4, LEDGE, RIM, brick); S(r0[2], r0[1], r0[2] + .4, r0[3], LEDGE, RIM, brick);
    S(r0[0] - .4, r0[1], r0[0], pz - .6, LEDGE, RIM, brick); S(r0[0] - .4, pz + .6, r0[0], r0[3], LEDGE, RIM, brick); S(r0[0] - .4, pz - .6, r0[0], pz + .6, -1.8, RIM, brick);
    for (const [x0, z0, x1, z1] of [[r0[0], r0[1], r0[2], 31], [r0[0], 33, r0[2], r0[3]], [r0[0], 31, 33, 33], [35, 31, r0[2], 33]]) S(x0, z0, x1, z1, -.4, ROOF, conc);
    b.ladder(34, 33, 'n', .15, LEDGE); routeLight(b, 34, 33.7, surfaceY, 0, true); routeLight(b, 33.1, 33.985, LEDGE + .4, Math.PI, false, 0xb6c9a1);
    for (const x of [33, 35.6]) b.pump(x, 27.6, .5, 1.6, LEDGE);
    b.m(G.box, glow(0x9be36b), 36.6, LEDGE + 1.4, 33.4, .05, .3, .6); b.m(G.box, glow(0xffc070), 34.5, -.55, 28.5, .3, .1, .3);
    W.missionZones.push({ type: 'nook', x0: b.X(32.4), z0: b.Z(27.6), x1: b.X(36.6), z1: b.Z(30.6), y: b.Y + LEDGE, district: 'Коллектор' });
    for (const [dx, dz, w, d] of [[0, -1.06, 2.24, .12], [0, 1.06, 2.24, .12], [-1.06, 0, .12, 2.0], [1.06, 0, .12, 2.0]]) b.m(G.box, dk, 34 + dx, .17, 32 + dz, w, .05, d);
    b.m(G.cyl12, tmat(T.metal()), 35.9, .18, 32.4, .6, .05, .6);

    /* ---------- насосная станция наверху (СВ) ---------- */
    b.house({ x: 30, z: 3, w: 11, d: 9, h: 4.4, wall: 0x6a7a8a, lit: .6, door: { side: 'w', at: .5, sign: ['НАСОСНАЯ', '#3a6a9a', '#f1e8ff'] }, ladder: { side: 'e', at: .5 }, roof: true,
      interior(f, r) { for (const x of [r.x0 + 2.2, r.x0 + 5.6]) f.pump(x, (r.z0 + r.z1) / 2 + .6, .8, 2);
        f.box(r.x1 - .4, r.z0 + 1.6, .4, 1.6, 1.6, col(0x4a4e66)); f.m(G.box, glow(0x9be36b), r.x1 - .62, 1.2, r.z0 + 1.6, .02, .5, 1); f.cabinet(r.x1 - .4, r.z1 - 1.4, .5, 1.6, 1.8, 0x58616b, 0, -Math.PI / 2); } });

    /* ---------- ограждение канала, кроме проходов к спускам ---------- */
    for (const [x, z0, z1] of [[CX0 - .55, .5, 8.5], [CX0 - .55, 11.5, 20], [CX0 - .55, 23, 35.4], [CX0 - .55, 40.5, 43.5], [CX1 + .55, .5, 14.4], [CX1 + .55, 23, 32.5], [CX1 + .55, 35.5, 43.5]]) b.fence(x, z0, x, z1, 1.1, 'iron');

    /* ---------- запад и восток: стенка для граффити, лавки, мелочи ---------- */
    b.box(7, 16, 7, .3, 2.2, conc); b.m(G.box, col(0x3a3440), 7, 2.24, 16, 7.1, .08, .38); b.graffiti(5.7, 1.1, 15.84, Math.PI, 3, 1); b.graffiti(8.3, 1.1, 16.16, 0, 3, 5);
    b.crate(4, 5, 1.1); b.crate(5.1, 5.2, .9); b.barrel(3, 40); b.barrel(4, 40.6); b.bench(10, 24, Math.PI / 2); b.trashBags(1.5, 30, 2); b.puddle(9, 34, 1);
    b.utilityBox(16.6, 30, -Math.PI / 2); b.planter(6, 28, 2.2, 1.2, .45, 'shrub'); b.tree(4, 22); b.tree(10, 40); b.tree(40, 40); b.tree(40, 18);
    b.lamp(16.5, 18, -Math.PI / 2); b.lamp(27.5, 26, Math.PI / 2); b.lamp(3, 12, Math.PI / 2);
    b.ride('barrow', 31, 18, 1); b.slickManhole(8, 10); b.picnic(36, 22, .1); b.vending(42.6, 24, -Math.PI / 2); b.dumpster(38, 40); b.trashBags(40, 40.2, 2);
    // трубы на ложементах, склад запчастей, бытовка ремонтников
    pipeCradle(b, 8, 8); storageBay(b, 3.2, 33, 3.6, 1.8, 'construction'); b.cementPallet(12, 38);
    b.house({ x: 2, z: 19, w: 6, d: 5, h: 2.8, wall: 0x4a6a7a, brick: false, door: { side: 'e', at: .5, sign: ['РЕМОНТ', '#3a6a9a', '#f5c542'] }, parapet: false, web: false, floor: T.floorTile(),
      interior(f, r) { f.desk((r.x0 + r.x1) / 2, r.z0 + .7, 0, true); f.shelf(r.x0 + .3, (r.z0 + r.z1) / 2, 2.4, Math.PI / 2, true); f.item('magnet', r.x1 - .8, r.z1 - .8); } });
    b.mist(CX0, 0, CX1, 44, FLOOR + .1);
    b.zone('floor', 1, 1, 17, 44); b.zone('floor', 27, 13, 43, 26);
    b.spawn(10, 20); b.spawn(35, 18); b.spawn(8, 36);
  },
};
