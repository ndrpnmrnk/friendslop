import { random } from '../core/random.js';
import { THREE, G, V3, mesh, col, lam, tmat, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { sfx } from '../core/sfx.js';
import { shake } from '../game/worldfx.js';

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
export const SLED_FLY = 2.6; // столько секунд летим над островом до загрузки
export { BREAK as SLED_BREAK };
/* Новогодние сани: загнутые полозья с завитками, резные красные борта с золотом, 4 скамьи, фонари на носу,
   мешок подарков сзади. parts=true - вернуть куски по отдельности (для разлома над картой). */
export function sleighModel(parts = false) {
  const red = lam({ color: 0xc8202e, emissive: 0x3a0a08, emissiveIntensity: .3 }, 'sleigh71-red'), dred = lam({ color: 0x8a1420 }, 'sleigh71-dred'),
    gold = lam({ color: 0xf5c542, emissive: 0x6a4a10, emissiveIntensity: .45 }, 'sleigh71-gold'), wood = tmat(T.wood()), steel = tmat(T.metal()),
    lampM = lam({ color: 0xffe0a0, emissive: 0xffc070, emissiveIntensity: 1.1 }, 'sleigh71-lamp'), sack = lam({ map: T.cloth(0x8a5a36), color: 0xffffff }, 'sleigh71-sack');
  const P = {
    runners: a => { for (const s of [-1, 1]) { a(G.box, steel, s * .62, -.12, .1, .07, .07, 3.6); a(G.halfTorus, gold, s * .62, .2, -1.78, .32, .32, .5, 0, Math.PI / 2, 0); a(G.box, steel, s * .62, .02, 1.8, .07, .3, .07, .4, 0, 0);
        for (let k = 0; k < 4; k++) a(G.box, steel, s * .62, .02, -1.2 + k * .85, .05, .26, .05); } },
    hull: a => { a(G.box, red, 0, .22, 0, 1.3, .3, 3.2); a(G.box, wood, 0, .38, 0, 1.12, .05, 3.0); a(G.box, gold, 0, .07, 0, 1.34, .05, 3.24); },
    sideL: a => { a(G.box, red, -.66, .55, 0, .1, .45, 3.1); a(G.box, gold, -.72, .78, 0, .05, .06, 3.1); for (let k = 0; k < 5; k++) a(G.sph, gold, -.72, .55, -1.2 + k * .6, .07, .07, .03); },
    sideR: a => { a(G.box, red, .66, .55, 0, .1, .45, 3.1); a(G.box, gold, .72, .78, 0, .05, .06, 3.1); for (let k = 0; k < 5; k++) a(G.sph, gold, .72, .55, -1.2 + k * .6, .07, .07, .03); },
    nose: a => { a(G.box, red, 0, .62, -1.68, 1.3, .7, .22, -.35, 0, 0); a(G.halfTorus, gold, 0, 1.0, -1.82, .55, .3, .3, 0, 0, 0); a(G.box, gold, 0, .72, -1.82, 1.1, .07, .07);
      for (const s of [-1, 1]) { a(G.cyl6, steel, s * .55, 1.0, -1.85, .03, .5, .03); a(G.box, lampM, s * .55, 1.3, -1.85, .14, .2, .14); a(G.cone4, col(0x2b2533), s * .55, 1.45, -1.85, .14, .12, .14); } },
    back: a => { a(G.box, dred, 0, .75, 1.62, 1.3, .9, .2, .25, 0, 0); a(G.box, gold, 0, 1.22, 1.72, 1.2, .07, .07); a(G.sph10, sack, 0, 1.1, 1.35, .45, .42, .4); a(G.cyl6, gold, 0, 1.5, 1.35, .08, .1, .08);
      for (const [dx, c] of [[-.3, 0x4ab0f0], [.32, 0x9be36b]]) a(G.box, lam({ color: c }, 'sleigh71-gift' + c), dx, 1.45, 1.25, .26, .26, .26, 0, dx, 0); },
    benches: a => { for (let r = 0; r < 4; r++) { a(G.box, dred, 0, .5, -1.05 + r * .72 + .22, 1.1, .1, .22); a(G.box, gold, 0, .56, -1.05 + r * .72 + .33, 1.1, .03, .03); } },
  };
  if (parts) return Object.entries(P).map(([k, f]) => compose('sleigh71-' + k, f));
  const g = new THREE.Group(); for (const [k, f] of Object.entries(P)) g.add(compose('sleigh71-' + k, f)); return g;
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
    for (let i = 0; i < 9; i++) { const p = along(.62 + i * .04); for (const s of [-1, 1]) a(G.box, lam({ color: scarf[i % 4] }, 'sled70-flag' + (i % 4)), x + s * 1.25, p.y + .9, p.z, .04, .24, .2); }
  }));
  addSolid(x - DX, D0, x + DX, D1, DY - .24, DY); addSolid(x - DX, D1 - .1, x + DX, D1, DY, DY + .6);
  for (const s of [-1, 1]) for (let k = 0; k < NST; k++) { const tx = x + s * (DX + RUN * (k + .5) / NST), top = DY * (NST - k) / NST; addSolid(tx - RUN / NST / 2, SZ - SW / 2, tx + RUN / NST / 2, SZ + SW / 2, top - .3, top); }
  addSolid(x - 1.15, z - 11.6, x + 1.15, z + .6, 0, 2.6); // по склону не бегают
  const sled = sleighModel(); group.add(sled);
  const seats = [[-.27, -1.05], [.27, -1.05], [-.27, -.33], [.27, -.33], [-.27, .39], [.27, .39], [-.27, 1.11], [.27, 1.11]];
  const st = { phase: 'idle', t: 0, riders: [], pull: 0, out: 0, bob: 0, bv: 0, u: 0, ft: 0, broken: 0 };
  const sledPos = new V3(), sledDir = new V3(), vFly = new V3(0, 7, -15);
  function place() {
    if (st.phase === 'fly') { const t = st.t; sledPos.copy(K0).addScaledVector(vFly, t); sledPos.y -= 2.4 * t * t; sled.position.copy(sledPos); const vy = vFly.y - 4.8 * t; sled.rotation.set(Math.atan2(vy, -vFly.z) * .8, 0, Math.sin(t * 2.2) * .06); }
    else { const u = st.u, p = along(u), q = along(Math.min(1, u + .015)); sledDir.subVectors(q, p).normalize(); sled.position.copy(p); sled.position.y += st.bob + .1; sled.rotation.set(Math.atan2(sledDir.y, -sledDir.z), 0, 0); }
  }
  place();
  const PZ0 = D1 + .5, PZ1 = D1 + 3.6;
  b.ground(x - 4, PZ0, x + 4, PZ1, T.concrete(), 2, .03);
  for (const [mx, mz, sx, sz] of [[x, PZ0 + .05, 8, .12], [x, PZ1 - .05, 8, .12], [x - 3.95, (PZ0 + PZ1) / 2, .12, PZ1 - PZ0], [x + 3.95, (PZ0 + PZ1) / 2, .12, PZ1 - PZ0]]) b.marking(mx, mz, sx, sz, 0xf5c542);
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
    seatPos(i, out = new V3()) { sled.updateMatrixWorld(true); const s = seats[i % seats.length]; return sled.localToWorld(out.set(s[0], .52, s[1])); },
    sledPos: () => sled.position, breakAt: BREAK,
    reset() { Object.assign(st, { phase: 'idle', t: 0, riders: [], pull: 0, out: 0, bob: 0, bv: 0, u: 0, ft: 0, broken: 0, manual: false }); sled.visible = true; zoneMesh.visible = false; place(); },
    update(dt, t) {
      st.t += dt;
      st.bv += -st.bob * 90 * dt; st.bv *= Math.exp(-dt * 5); st.bob += st.bv * dt;
      if (st.phase === 'idle') { st.u = 0; }
      else if (st.phase === 'board') { if (!st.manual && st.t > .9 + st.riders.length * .2) this.pull(); }
      else if (st.phase === 'pull') { // резкий рывок с места, затем плавный разгон 3.5 с до трамплина
        const k = Math.min(1, st.t / 3.5); st.pull = k; st.u = Math.min(1, .03 * Math.min(1, st.t / .25) + .97 * k * k * (1.6 - .6 * k));
        if (random() < dt * 10) sfx('snowPack', { v: .35 + k * .5 }); if (k >= 1) { st.u = 1; st.phase = 'fire'; st.t = 0; sfx('dash', { v: 1.4 }); shake(.35); } }
      else if (st.phase === 'fire') { st.u = 1; if (st.t > .06) { st.phase = 'fly'; st.t = 0; } }
      if (!sled.visible) sled.visible = true;
      place(); void t;
    },
  };
}
const red71 = () => lam({ color: 0xc8202e, emissive: 0x3a0a08, emissiveIntensity: .3 }, 'sleigh71-red');
