import { random } from '../core/random.js';
import { THREE, G, V3, mesh, col, lam, tmat, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { sfx } from '../core/sfx.js';
import { shake } from '../game/worldfx.js';
import { puff } from '../world/particles.js';

/* v0.71 J2 — запуск в матч: новогодние сани наверху высокой мультяшной горки (без снеговика-толкача).
   Игроки запрыгивают; как только сел последний - сани резко трогаются, 3.5 с разгоняются вниз по горке, уходят вверх
   по трамплину на краю острова и улетают. В хабе сани не ломаются: полёт → загрузка → над картой сани разламываются
   на крупные куски (main.js, sleighBreak), игроки разлетаются. Ниже - прежнее описание v0.70 для истории:
   - помост на высоте с двумя лестницами по бокам, на нём бобслейные сани на 8 мест (4 ряда по 2);
   - игроки забегают по лестницам и запрыгивают на свои места;
   - снеговик-толкач разгоняет сани (фаза pull: путь по склону 0→1), сани съезжают и уходят с трамплина (fire),
     летят над городом (fly); через 0.55 с полёта сани разламываются на доски, игроки выпадают и летят на карту.
   Состояние st - только числа/строки: ведущий пересылает его гостям, у всех один и тот же ролик. */
const BREAK = 99; // в хабе сани целы весь полёт - разлом над картой (main.js)
export const SLED_FLY = 2.0; // столько секунд летим над островом до загрузки
export { BREAK as SLED_BREAK };
/* Новогодние сани: загнутые полозья с завитками, резные красные борта с золотом, 4 скамьи, фонари на носу,
   мешок подарков сзади. parts=true - вернуть куски по отдельности (для разлома над картой). */
export function sleighModel(parts = false) {
  // v0.71.1: корпус и борта - сплошные, без торчащих деталей; сзади турбина (шуточный «ракетный ускоритель»)
  const red = lam({ color: 0xc8202e, emissive: 0x3a0a08, emissiveIntensity: .3 }, 'sleigh71-red'), dred = lam({ color: 0x8a1420 }, 'sleigh71-dred'),
    gold = lam({ color: 0xf5c542, emissive: 0x6a4a10, emissiveIntensity: .45 }, 'sleigh71-gold'), wood = tmat(T.wood()), steel = tmat(T.metal()),
    lampM = lam({ color: 0xffe0a0, emissive: 0xffc070, emissiveIntensity: 1.1 }, 'sleigh71-lamp'), dark = col(0x2b2533), white = lam({ color: 0xf1ede4 }, 'sleigh71-fur');
  const P = {
    runners: a => { for (const s of [-1, 1]) { a(G.box, gold, s * .66, -.14, .15, .08, .08, 3.5);
        for (let k = 0; k < 6; k++) { const an = k / 5 * Math.PI; a(G.box, gold, s * .66, .14 - Math.cos(an) * .28, -1.62 - Math.sin(an) * .28, .08, .08, .14, an, 0, 0); }
        for (let k = 0; k < 4; k++) a(G.box, steel, s * .66, .02, -1.0 + k * .75, .05, .3, .05); } },
    hull: a => { a(G.box, red, 0, .26, .05, 1.36, .36, 3.1); a(G.box, wood, 0, .45, .05, 1.14, .04, 2.9); a(G.box, gold, 0, .09, .05, 1.4, .05, 3.14); a(G.box, white, 0, .44, .05, 1.42, .05, 3.14); },
    sideL: a => { for (let k = 0; k < 6; k++) { const z = -1.3 + k * .54, hh = .5 + Math.sin(k / 5 * Math.PI) * .12; a(G.box, red, -.7, .4 + hh / 2, z, .1, hh, .56); } a(G.box, gold, -.76, .95, .05, .04, .05, 3.0); for (let k = 0; k < 5; k++) a(G.box, gold, -.76, .7, -1.05 + k * .54, .02, .14, .14, 0, 0, Math.PI / 4); },
    sideR: a => { for (let k = 0; k < 6; k++) { const z = -1.3 + k * .54, hh = .5 + Math.sin(k / 5 * Math.PI) * .12; a(G.box, red, .7, .4 + hh / 2, z, .1, hh, .56); } a(G.box, gold, .76, .95, .05, .04, .05, 3.0); for (let k = 0; k < 5; k++) a(G.box, gold, .76, .7, -1.05 + k * .54, .02, .14, .14, 0, 0, Math.PI / 4); },
    nose: a => { for (let k = 0; k < 5; k++) { const an = k / 4 * 1.1; a(G.box, red, 0, .55 + Math.sin(an) * .45, -1.55 - Math.cos(an) * .05 - Math.sin(an) * .2, 1.36, .14, .18, -an, 0, 0); }
      a(G.box, gold, 0, 1.06, -1.82, 1.2, .07, .07); for (const s of [-1, 1]) { a(G.box, lampM, s * .55, 1.18, -1.82, .14, .18, .14); a(G.box, dark, s * .55, 1.3, -1.82, .18, .05, .18); } },
    back: a => { a(G.box, dred, 0, .82, 1.6, 1.36, .82, .14); a(G.box, gold, 0, 1.25, 1.6, 1.38, .06, .16); a(G.box, white, 0, 1.3, 1.6, 1.4, .06, .2); },
    turbine: a => { // v0.73: турбина без совпадающих граней (не рябит): корпус, воздухозаборник с решёткой, кольца, стабилизаторы, сопло
      a(G.cyl12, steel, 0, .62, 2.15, .37, .8, .37, Math.PI / 2, 0, 0); a(G.cyl12, red, 0, .62, 1.8, .42, .16, .42, Math.PI / 2, 0, 0);
      for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI; a(G.box, dark, 0, .62, 1.71, .7, .03, .02, 0, 0, an); }
      a(G.cyl12, gold, 0, .62, 2.25, .385, .06, .385, Math.PI / 2, 0, 0); a(G.cyl12, gold, 0, .62, 2.61, .33, .14, .33, Math.PI / 2, 0, 0); a(G.cyl12, col(0x6a6a74), 0, .62, 2.69, .22, .03, .22, Math.PI / 2, 0, 0);
      for (const an of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) a(G.box, red, Math.cos(an) * .45, .62 + Math.sin(an) * .45, 2.35, .04 + Math.abs(Math.sin(an)) * .12, .04 + Math.abs(Math.cos(an)) * .12, .5, 0, 0, 0);
      for (const s of [-1, 1]) a(G.box, steel, s * .3, .35, 1.95, .06, .3, .4); a(G.box, white, 0, 1.03, 2.15, .2, .04, .7);
      for (let k = 0; k < 8; k++) { const an = k / 8 * 6.283; a(G.sph, gold, Math.cos(an) * .375, .62 + Math.sin(an) * .375, 2.0, .025, .025, .025); } },
    benches: a => { for (let r = 0; r < 4; r++) { a(G.box, dred, 0, .58, -1.0 + r * .72 + .22, 1.18, .14, .26); a(G.box, gold, 0, .66, -1.0 + r * .72 + .34, 1.18, .03, .03); } },
  };
  if (parts) return Object.entries(P).map(([k, f]) => compose('sleigh711-' + k, f));
  const g = new THREE.Group(); for (const [k, f] of Object.entries(P)) g.add(compose('sleigh711-' + k, f));
  // пламя турбины: два аддитивных конуса, растут при запуске
  const fl = new THREE.Group(); fl.position.set(0, .62, 2.72); g.add(fl); g.userData.flame = fl; fl.visible = false;
  for (const [c, r, l] of [[0x7ad8ff, .3, 1.6], [0xffb040, .2, 1.0]]) { const m = new THREE.Mesh(G.cone8, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.rotation.x = -Math.PI / 2; m.scale.set(r, l, r); m.position.z = l / 2; m.userData.noLight = true; fl.add(m); }
  return g;
}
export function buildSled(b, x, z) {
  const group = new THREE.Group(); W.group.add(group); W.keep.push(group);
  const plank = tmat(T.wood()), steel = tmat(T.metal()), snow = lam({ map: T.grass(), color: 0xffffff }, 'sledSnow70'), scarf = [0xd8243a, 0x9be36b, 0x4ab0f0, 0xf5c542];
  // высокая горка: помост на 4.4 м, лестницы по бокам; склон вниз и трамплин вверх на краю острова
  const DY = 4.4, D0 = z + 1.5, D1 = z + 3.9, DX = 2.4, SW = 1.2, SZ = z + 2.7, NST = 12, RUN = 5.2;
  const S0 = new V3(x, DY + .02, z + .9), M0 = new V3(x, DY * .55, z - 3.2), B0 = new V3(x, .45, z - 7.6), K0 = new V3(x, 2.1, z - 11.2);
  const curve = new THREE.CatmullRomCurve3([S0, M0, B0, new V3(x, .7, z - 9.4), K0], false, 'centripetal', .5);
  const along = u => curve.getPointAt(Math.min(1, Math.max(0, u)));
  group.add(compose('sled71-hill', a => {
    a(G.box, plank, x, DY - .06, (D0 + D1) / 2, DX * 2, .12, D1 - D0); a(G.box, steel, x, DY - .18, (D0 + D1) / 2, DX * 2 + .1, .12, D1 - D0 + .1);
    a(G.box, snow, x, DY + .01, (D0 + D1) / 2, DX * 2 - .2, .02, D1 - D0 - .2);
    for (const sx of [-1, 1]) for (const zz of [D0 + .2, D1 - .2]) a(G.box, steel, x + sx * (DX - .2), (DY - .2) / 2, zz, .16, DY - .2, .16);
    for (const sx of [-1, 1]) a(G.box, steel, x + sx * (DX - .2), DY / 2, (D0 + D1) / 2, .06, .06, D1 - D0, Math.PI / 4, 0, 0); // раскосы
    a(G.box, steel, x, DY + .55, D1 - .05, DX * 2, .06, .06); for (let k = 0; k <= 6; k++) a(G.box, steel, x - DX + .05 + k * (DX * 2 - .1) / 6, DY + .28, D1 - .05, .05, .55, .05);
    // арка-ворота старта с гирляндой и колокольчиком
    for (const s of [-1, 1]) { a(G.box, plank, x + s * 1.25, DY + 1.3, z + 1.2, .16, 2.6, .16); a(G.cone4, snow, x + s * 1.25, DY + 2.7, z + 1.2, .2, .3, .2); }
    a(G.box, plank, x, DY + 2.55, z + 1.2, 2.7, .2, .2); a(G.box, snow, x, DY + 2.7, z + 1.2, 2.8, .1, .3); a(G.cone8, lam({ color: 0xf5c542, emissive: 0x6a4a10, emissiveIntensity: .5 }, 'sled71-bell'), x, DY + 2.25, z + 1.2, .18, .3, .18);
    for (let i = 0; i < 9; i++) a(G.sph, lam({ color: scarf[i % 4], emissive: scarf[i % 4], emissiveIntensity: .8 }, 'sled71-bulb' + (i % 4)), x - 1.2 + i * .3, DY + 2.42 - Math.sin(i / 8 * Math.PI) * .18, z + 1.32, .06, .06, .06);
    for (const s of [-1, 1]) for (let k = 0; k < NST; k++) { const tx = x + s * (DX + RUN * (k + .5) / NST), top = DY * (NST - k) / NST;
      a(G.box, plank, tx, top - .05, SZ, RUN / NST + .02, .1, SW); a(G.box, snow, tx, top + .005, SZ, RUN / NST - .02, .02, SW - .1);
      if (k % 2 === 0) { a(G.box, steel, tx, top / 2 - .05, SZ - SW / 2 + .05, .06, top - .05, .06); a(G.box, steel, tx, top / 2 - .05, SZ + SW / 2 - .05, .06, top - .05, .06); } }
    // склон: сегменты по кривой - плавный спуск, низ, подъём трамплина
    const N = 22; for (let i = 0; i < N; i++) { const p = along(i / N), q = along((i + 1) / N), m = p.clone().add(q).multiplyScalar(.5), L = p.distanceTo(q) + .04, ang = Math.atan2(p.y - q.y, p.z - q.z);
      a(G.box, snow, x, m.y - .12, m.z, 2.0, .24, L, -ang, 0, 0);
      for (const s of [-1, 1]) a(G.box, red71(), x + s * 1.06, m.y + .08, m.z, .12, .42, L, -ang, 0, 0);
      if (i % 3 === 0 && m.y > .5) for (const s of [-1, 1]) a(G.box, steel, x + s * .9, m.y / 2 - .1, m.z, .12, Math.max(.1, m.y - .2), .12); }
    // флажки вдоль трамплина
    for (let i = 0; i < 9; i++) { const p = along(.62 + i * .04); for (const s of [-1, 1]) { a(G.box, steel, x + s * 1.08, p.y + .55, p.z, .04, .7, .04); a(G.box, lam({ color: scarf[i % 4] }, 'sled70-flag' + (i % 4)), x + s * 1.08, p.y + .82, p.z + .11, .03, .2, .2); } } // флажки на стойках бортов, не в воздухе
  }));
  addSolid(x - DX, D0, x + DX, D1, DY - .24, DY); addSolid(x - DX, D1 - .1, x + DX, D1, DY, DY + .6);
  for (const s of [-1, 1]) for (let k = 0; k < NST; k++) { const tx = x + s * (DX + RUN * (k + .5) / NST), top = DY * (NST - k) / NST; addSolid(tx - RUN / NST / 2, SZ - SW / 2, tx + RUN / NST / 2, SZ + SW / 2, top - .3, top); }
  addSolid(x - 1.15, z - 11.6, x + 1.15, z + .6, 0, 2.6); // по склону не бегают
  const sled = sleighModel(); group.add(sled);
  const seats = [[-.3, -.85], [.3, -.85], [-.3, -.13], [.3, -.13], [-.3, .59], [.3, .59], [-.3, 1.31], [.3, 1.31]];
  const st = { phase: 'idle', t: 0, riders: [], pull: 0, out: 0, bob: 0, bv: 0, u: 0, ft: 0, broken: 0, ign: 0 };
  const sledPos = new V3(), sledDir = new V3(), vFly = new V3(0, 8, -26);
  function place() {
    if (st.phase === 'fly') { const t = st.t; sledPos.copy(K0).addScaledVector(vFly, t); sledPos.z -= 6 * t * t; sledPos.y -= 1.2 * t * t; sled.position.copy(sledPos); const vy = vFly.y - 2.4 * t; sled.rotation.set(Math.atan2(vy, -vFly.z) * .8, 0, Math.sin(t * 2.2) * .06); }
    else { const u = st.u, p = along(u), q = along(Math.min(1, u + .015)); sledDir.subVectors(q, p).normalize(); sled.position.copy(p); sled.position.y += st.bob + .1; sled.rotation.set(Math.atan2(sledDir.y, -sledDir.z), 0, 0); }
  }
  place();
  const PZ0 = D1 + .5, PZ1 = D1 + 3.6;
  b.ground(x - 4, PZ0, x + 4, PZ1, T.concrete(), 2, .03);
  for (const [mx, mz, sx, sz] of [[x, PZ0 + .05, 8, .12], [x, PZ1 - .05, 8, .12], [x - 3.95, (PZ0 + PZ1) / 2, .12, PZ1 - PZ0], [x + 3.95, (PZ0 + PZ1) / 2, .12, PZ1 - PZ0]]) b.marking(mx, mz, sx, sz, 0xf5c542);
  // v0.71.1 зона сбора понятнее: ворота из леденцовых столбов с баннером «ВСЕ В САНИ!», огоньки по периметру площадки
  { const bc = document.createElement('canvas'); bc.width = 256; bc.height = 64; const g = bc.getContext('2d'); g.fillStyle = '#7a1420'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#f5c542'; g.fillRect(0, 0, 256, 5); g.fillRect(0, 59, 256, 5);
    g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff4e0'; g.fillText('ВСЕ В САНИ!', 128, 34); const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
    const ban = new THREE.Mesh(G.plane, lam({ map: bt, emissive: 0xffffff, emissiveMap: bt, emissiveIntensity: .45, side: THREE.DoubleSide }, 'sled711-banner')); ban.position.set(x, 3.05, PZ1 + .3); ban.scale.set(5.2, 1.2, 1); ban.userData.noBatch = true; group.add(ban);
    const rr = lam({ color: 0xd8243a }, 'cane71r'), ww = lam({ color: 0xf6f0ea }, 'cane71w');
    group.add(compose('sled711-gate', a => { for (const sx of [-1, 1]) { for (let k = 0; k < 9; k++) a(G.cyl8, k % 2 ? ww : rr, x + sx * 2.9, .2 + k * .4, PZ1 + .3, .12, .4, .12); a(G.sph, lam({ color: 0xf5c542, emissive: 0xf5c542, emissiveIntensity: .8 }, 'sled711-top'), x + sx * 2.9, 3.8, PZ1 + .3, .2, .2, .2); }
      for (let k = 0; k < 16; k++) { const c = scarf[k % 4]; for (const zz of [PZ0, PZ1]) a(G.sph, lam({ color: c, emissive: c, emissiveIntensity: .9 }, 'sled711-pb' + c), x - 3.8 + k * 7.6 / 15, .08, zz, .07, .07, .07); } }));
    for (const sx of [-1, 1]) addSolid(x + sx * 2.9 - .13, PZ1 + .17, x + sx * 2.9 + .13, PZ1 + .43, 0, 3.6); }
  const zc = document.createElement('canvas'); zc.width = 256; zc.height = 192; { const g = zc.getContext('2d'); g.strokeStyle = '#ffd27a'; g.lineWidth = 8; g.setLineDash([22, 14]); g.strokeRect(8, 8, 240, 176); g.setLineDash([]); g.fillStyle = '#ffd27a';
    for (const yy of [52, 96, 140]) { g.beginPath(); g.moveTo(128 - 34, yy + 16); g.lineTo(128, yy - 10); g.lineTo(128 + 34, yy + 16); g.lineTo(128 + 20, yy + 16); g.lineTo(128, yy + 2); g.lineTo(128 - 20, yy + 16); g.fill(); } }
  const zoneMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(zc), transparent: true, opacity: 0, depthWrite: false, color: 0xffd27a, fog: false });
  const zoneMesh = new THREE.Mesh(G.plane, zoneMat); zoneMesh.rotation.x = -Math.PI / 2; zoneMesh.position.set(x, .06, (PZ0 + PZ1) / 2); zoneMesh.scale.set(7.8, PZ1 - PZ0 - .2, 1); zoneMesh.renderOrder = 3; zoneMesh.userData.noBatch = true; zoneMesh.visible = false; group.add(zoneMesh);
  return {
    st, pocket: sled, seats, rest: S0.clone().add(new V3(0, 1.2, 0)), kicker: K0.clone(), fly: SLED_FLY,
    zone(on, t = 0, all = false) { zoneMesh.visible = on; if (!on) return; zoneMat.opacity = .55 + Math.sin(t * 5) * .25; zoneMat.color.setHex(all ? 0x7dffa0 : 0xffd27a); },
    arm(riders) { st.riders = riders.slice(); st.phase = 'board'; st.t = 0; st.manual = true; },
    pull() { if (st.phase === 'board') { st.phase = 'pull'; st.t = 0; sfx('bell'); sfx('snowPack'); shake(.15); st.bv -= 1.2; } },
    pad: { x0: x - 4, x1: x + 4, z0: PZ0, z1: PZ1 },
    deck: { y: DY, z0: D0, z1: D1, x: DX, stairZ: SZ, run: RUN }, huddle: new V3(x, 0, (PZ0 + PZ1) / 2),
    bounce(k = 1) { st.bv -= .8 * k; },
    onPad(p) { return p.x > x - 4 && p.x < x + 4 && p.z > PZ0 && p.z < PZ1 && Math.abs(p.y) < 1; },
    seatPos(i, out = new V3()) { sled.updateMatrixWorld(true); const s = seats[i % seats.length]; return sled.localToWorld(out.set(s[0], .7, s[1])); },
    sledPos: () => sled.position, breakAt: BREAK,
    reset() { Object.assign(st, { phase: 'idle', t: 0, riders: [], pull: 0, out: 0, bob: 0, bv: 0, u: 0, ft: 0, broken: 0, manual: false, ign: 0 }); sled.visible = true; zoneMesh.visible = false; place(); },
    update(dt, t) {
      st.t += dt;
      st.bv += -st.bob * 90 * dt; st.bv *= Math.exp(-dt * 5); st.bob += st.bv * dt;
      if (st.phase === 'idle') { st.u = 0; }
      else if (st.phase === 'board') { if (!st.manual && st.t > .9 + st.riders.length * .2) this.pull(); }
      else if (st.phase === 'pull') { // резкий рывок с места, затем плавный разгон 3.5 с до трамплина
        // v0.71.1 инерция: тяжёлые сани трогаются медленно (до 45%), потом зажигается турбина и они резко уходят к трамплину
        const k = Math.min(1, st.t / 3.2); st.pull = k; st.u = k < .45 ? .14 * (k / .45) * (k / .45) : .14 + .86 * Math.pow((k - .45) / .55, 1.6);
        if (k > .45 && !st.ign) { st.ign = 1; sfx('boom', { v: .8 }); sfx('dash', { v: 1.6 }); shake(.4); }
        if (random() < dt * 10) sfx('snowPack', { v: .35 + k * .5 }); if (k >= 1) { st.u = 1; st.phase = 'fire'; st.t = 0; sfx('dash', { v: 1.4 }); shake(.35); } }
      else if (st.phase === 'fire') { st.u = 1; if (st.t > .06) { st.phase = 'fly'; st.t = 0; } }
      if (!sled.visible) sled.visible = true;
      { const fl = sled.userData.flame, on = st.ign && (st.phase === 'pull' || st.phase === 'fire' || st.phase === 'fly'); fl.visible = !!on;
        if (on) { const p = st.phase === 'fly' ? 1.6 : 1; fl.scale.set(1 + Math.sin(t * 40) * .12, 1 + Math.sin(t * 31) * .12, p * (1.2 + Math.sin(t * 53) * .25));
          if (random() < dt * 30) { const q = fl.getWorldPosition(new V3()); puff(q.x, q.y, q.z, { color: random() < .5 ? 0xffa040 : 0x7ad8ff, size: .35, vy: .4, life: .5, grow: 2 }); } } }
      place(); void t;
    },
  };
}
const red71 = () => lam({ color: 0xc8202e, emissive: 0x3a0a08, emissiveIntensity: .3 }, 'sleigh71-red');
