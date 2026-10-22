import { THREE, G, tmat, col, glow, lam } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { addZone } from '../physics.js';
import { burst } from '../particles.js';

/* Бизнес-центр: 6-этажная высотка, самое высокое здание города. Можно пройти по лестнице
   с этажа на этаж до самой крыши: лобби с ресепшеном и лифтами, офисы open-space с креслами
   на колёсиках, переговорки за стеклом (бьётся), столовая наверху. На крыше — вертолётная
   площадка и мачта. Снаружи — площадь со скамейками, клумбами, флагами и курилкой. */
export default {
  id: 'office', name: 'Бизнес-центр', ground: 'pave', holes:[[15,1.4,18.4,4.8]],
  build(b) {
    const N = 6, FH = 3.8;
    b.tower({ x: 7, z: 1, w: 18, d: 13, floors: N, fh: FH, fireEscape: { side: 'w', at: 0.55 }, wall: 0x4e5c7a, brick: false, lit: 0.75, floor: T.carpet(), elevator:{x0:15,z0:1.4,x1:18.4,z1:4.8},
      door: { side: 's', at: 0.5, sign: ['БЦ «ПОЛНОЛУНИЕ»', '#17111f', '#b18cff'] },
      interior(f, k, r) {
        if (k % 3 === 1) for (let i = 0; i < 4; i++) f.locker(r.x1 - 0.4 - i * 0.6, r.z1 - 0.3, Math.PI, 0x4a5a7a);
        if (k === 0) {
          // лобби: ресепшен, лифты, турникеты, диваны
          f.box(16, 7.2, 4, 0.8, 1.1, tmat(T.wood())); f.m(G.box, col(0x2b2533), 16, 1.12, 7.2, 4.1, 0.05, 0.9); f.desk(16, 6.4, 0, true);
          for (const x of [12.5, 13.6, 18.4, 19.5]) f.bollard(x, 9.8);
          f.sofa(10, 12.9, Math.PI, 0x3a4a6a); f.sofa(22, 12.9, Math.PI, 0x3a4a6a); f.rug(16, 11.5, 3, 2, '#2a1f3d', '#b18cff');
          f.plantPot(8, 13.2, 1.2); f.plantPot(24, 13.2, 1.2); f.plantPot(24.2, 4.5, 1.1); f.waterCooler(24.3, 6.5);
          return;
        }
        if (k === N - 1) {
          // столовая наверху
          f.kitchen(22, 1.6, 3); f.vending(24.1, 5);
          for (const [x, z] of [[10, 7], [13.5, 7], [10, 10.5], [13.5, 10.5], [18, 10.5], [21.5, 10.5]]) { f.ptable(x, z, 0.8); f.chair(x - 0.8, z, Math.PI / 2); f.chair(x + 0.8, z, -Math.PI / 2); }
          f.sofa(21, 13.1, Math.PI, 0x7b4bc4); f.plantPot(8, 13.2); f.plantPot(24.2, 13.2);
          return;
        }
        // офис open-space: ряды столов с мониторами, переговорка за стеклом в углу
        const rot = k % 2;
        for (const x of [9.5, 12.5]) for (const z of [6.4, 9, 11.4]) f.desk(x, z, rot ? Math.PI : 0, true);
        for (const z of [6.4, 9]) f.desk(16.5, z, rot ? Math.PI : 0, true);
        f.ride('chair', 12.5, rot ? 5.65 : 9.8, rot ? 0 : Math.PI);
        if (k % 3 === 1) f.item('chair', 9.5, 11.4);
        // переговорка: стеклянные стены (бьются), стол, доска
        f.vitrine(21.5, 9.2, 6.2, 2.2, 'x', 0.2); f.vitrine(18.4, 11.9, 3.2, 2.2, 'z', 0.2);
        f.ptable(21.5, 11.6, 1.1); f.chair(20.4, 11.6, Math.PI / 2); f.chair(22.6, 11.6, -Math.PI / 2); f.whiteboard(24.6, 1.6, 11.6, -Math.PI / 2, 2.4);
        f.waterCooler(24.3, 4); f.cabinet(24.3, 6, 0.6, 1.2, 1.1, 0xd8d8e0, 0, -Math.PI / 2); f.plantPot(8, 13.2); f.plantPot(17, 13.2, 0.9);
        f.cabinet(16.5, 13.4, 2, 0.5, 1.6, 0x6a6d78, 0, Math.PI);
        if (k % 2 === 1) f.safe(7.75, 11.4, Math.PI / 2);
      } });
    const H = N * FH;
    // крыша: вертолётная площадка, мачта с огнём, кондиционеры, бак
    const pad = b.m(new THREE.RingGeometry(2.6, 2.9, 24), lam({ color: 0xf5c542, polygonOffset: true, polygonOffsetFactor: -3 }, 'padRing'), 18, H + 0.03, 9, 1, 1, 1); pad.rotation.x = -Math.PI / 2;
    for (const [x, z, w, d] of [[17.3, 9, 0.3, 2.2], [18.7, 9, 0.3, 2.2], [18, 9, 1.4, 0.3]]) b.m(G.box, col(0xf1e8ff), x, H + 0.035, z, w, 0.01, d);
    b.m(G.cyl6, col(0x2b2533), 23.5, H + 3, 3, 0.07, 6, 0.07); b.solid(23.5, 3, 0.3, 0.3, H, 6);
    for (let y = 1; y < 6; y += 1.2) b.m(G.box, col(0x2b2533), 23.5, H + y, 3, 0.6, 0.04, 0.04);
    const red = b.m(G.sph, glow(0xff2a2a), 23.5, H + 6.1, 3, 0.12, 0.12, 0.12); W.keep.push(red); W.animated.push((dt, t) => { red.visible = Math.sin(t * 3) > 0; });
    for (const x of [9, 11.5]) b.aircon(x, 12.6, H);
    b.box(10, 8, 2, 2, 0.5, tmat(T.metal()), { y: H }); b.m(G.cyl12, tmat(T.metal()), 10, H + 1.6, 8, 0.9, 2.2, 0.9); b.solid(10, 8, 1.8, 1.8, H + 0.5, 2.2);
    // площадь перед входом
    b.ground(9, 14.5, 23, 31.5, T.cobble(), 3);
    b.planter(5, 18, 3, 1.4, 0.55, 'flowers'); b.planter(27, 18, 3, 1.4, 0.55, 'flowers');
    b.planter(9.5, 24.5, 2.2, 2.2, 0.6, 'tree'); b.planter(22.5, 24.5, 2.2, 2.2, 0.6, 'tree');
    b.planter(16, 29.5, 6, 1.2, 0.5, 'shrub');
    for (const x of [12, 20]) b.bench(x, 21.5, Math.PI);
    for (let x = 10; x <= 22; x += 2) if (Math.abs(x - 16) > 1.5) b.bollard(x, 16.2);
    // флагштоки
    for (const [x, c] of [[3, 0xff8a1f], [4.5, 0x7b4bc4], [6, 0x9be36b]]) { b.m(G.cyl6, col(0xd8d8e0), x, 3.5, 25, 0.05, 7, 0.05); b.solid(x, 25, 0.2, 0.2, 0, 7); b.m(G.box, col(c), x + 0.55, 6.3, 25, 1.0, 0.65, 0.02); }
    // курилка: стеклянная стенка, навес, скамья, урна
    b.vitrine(28.5, 27.5, 4, 1.9, 'x', 0.3); for (const x of [26.5, 30.5]) b.box(x, 27.6, 0.12, 0.12, 2.4, col(0x3a4a6a));
    b.box(28.5, 28.3, 4.3, 1.6, 0.1, col(0x3a4a6a), { y: 2.4 }); b.bench(28.5, 28.5, 0); b.bin(30.8, 29.6);
    // боковые проходы: велопарковка, мусорка, кондиционеры
    b.bikeRack(3, 9, 4, Math.PI / 2); b.dumpster(28.5, 4); b.trashBags(28.5, 6.2, 3); b.aircon(28.7, 10, 0); b.aircon(28.7, 11.4, 0);
    b.newsBox(13, 30.6); b.postBox(19, 30.6); b.streetSign(1.3, 30.6, 'ДЕЛОВАЯ', 'ЛУННЫЙ БУЛ.'); b.utilityBox(1.2, 14, Math.PI / 2);
    // стеклянный козырёк над входом на двух опорах
    { const gl = lam({ color: 0x9ac8e8, transparent: true, opacity: 0.45, depthWrite: false }, 'canopyGlass'), dk = col(0x2b2533);
      b.m(G.box, gl, 16, 3.05, 15.6, 5, 0.06, 3); b.m(G.box, dk, 16, 3.0, 17.1, 5.1, 0.12, 0.1); for (const x of [13.6, 18.4]) { b.m(G.box, dk, x, 1.5, 17.0, 0.12, 3.0, 0.12); b.solid(x, 17.0, 0.2, 0.2, 0, 3); }
      b.m(G.box, glow(0xffe0b0), 16, 2.98, 15.6, 3.2, 0.03, 0.2); b.light(16, 15.6, 2.2); }
    // «сухой» фонтан: гранитная площадка с бортиком, 8 форсунок под решётками; струи — настоящие столбики воды,
    // бьют волной по очереди, сверху рассыпаются брызгами; вокруг пары лужиц (скользко)
    { const fg = b.ground(12.5, 22.5, 19.5, 27, T.stone(), 1.5, 0.018); fg.material = fg.material.clone(); Object.assign(fg.material, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const rim = col(0x6a6478); for (const [x, z, w, d] of [[16, 22.4, 7.2, 0.2], [16, 27.1, 7.2, 0.2], [12.4, 24.75, 0.2, 4.9], [19.6, 24.75, 0.2, 4.9]]) b.m(G.box, rim, x, 0.05, z, w, 0.1, d);
      const jets = [], wm = lam({ color: 0x9ccbec, emissive: 0x204a70, emissiveIntensity: 0.6, transparent: true, opacity: 0.65, depthWrite: false }, 'jetWater'), cap = lam({ color: 0xd8f0ff, emissive: 0x4a7aa0, emissiveIntensity: 0.6, transparent: true, opacity: 0.8, depthWrite: false }, 'jetCap');
      for (const x of [13.5, 15, 16.5, 18]) for (const z of [23.5, 26]) {
        b.m(G.box, col(0x2b2533), x, 0.02, z, 0.36, 0.03, 0.36); for (const o of [-0.09, 0, 0.09]) b.m(G.box, col(0x8a8498), x + o, 0.04, z, 0.03, 0.02, 0.32);
        const c = b.m(G.cyl6, wm, x, 0.5, z, 0.06, 1, 0.06), top = b.m(G.sph, cap, x, 1, z, 0.13, 0.1, 0.13); W.keep.push(c, top); jets.push({ c, top, x: b.X(x), z: b.Z(z), i: jets.length });
      }
      addZone('wading', { r: [b.X(13), b.Z(23), b.X(18.5), b.Z(26.5)] }, b.Y);
      let jt = 0; W.animated.push((dt, t) => { jt -= dt; const spray = jt <= 0; if (spray) jt = 0.12;
        for (const j of jets) { const col4 = j.i >> 1, k = Math.max(0, Math.sin(t * 2.2 - col4 * 0.9)), h = 0.05 + k * k * 1.7;
          j.c.scale.y = h; j.c.position.y = b.Y + h / 2; j.top.position.y = b.Y + h; j.c.visible = j.top.visible = h > 0.12;
          if (spray && h > 1.2) burst(j.x, b.Y + h, j.z, 1, { color: 0x9ccbec, size: 0.1, speed: 1.2, up: 1.2, g: 12, life: 0.5, grow: 0 }); } }); }
    // скульптура-абстракция: наклонённые кубы на постаменте
    { const st = tmat(T.stone()); b.box(16, 20, 1.4, 1.4, 0.5, st); const c1 = b.m(G.box, col(0xb18cff), 16, 1.15, 20, 0.9, 0.9, 0.9); c1.rotation.set(0.6, 0.5, 0.3); const c2 = b.m(G.box, col(0xff8a1f), 16.1, 1.95, 20, 0.6, 0.6, 0.6); c2.rotation.set(0.2, 1.1, 0.7); b.solid(16, 20, 1.2, 1.2, 0.5, 1.8); }
    b.car(3, 19.5, 0, 0x2a2a30); b.bin(8.5, 18.2); b.bin(23.5, 18.2);
    b.lamp(1.2, 15.5, Math.PI / 2); b.lamp(30.8, 15.5, -Math.PI / 2); b.lamp(8, 31, 0); b.lamp(24, 31, 0);
    b.crate(30.6, 1.2, 1); b.crate(30.6, 2.3, 0.9);
    // зиплайн с крыши высотки на площадь
    b.zipline(23.4, N * FH + 2.9, 13.1, 29, 2.6, 24.2);
    b.zone('floor', 9, 17, 23, 28); b.zone('floor', 25, 14.5, 31, 24);
    b.cats(1, 14.5, 31, 31);
    b.spawn(12, 19); b.spawn(4, 28);
    b.hw(() => { b.pumpkin(13.2, 15.6); b.pumpkin(18.8, 15.6); b.stringLights(9, 15, 23, 15, 3.2); b.web(7.4, 2.6, 14.2, 0, 1); });
  },
};
