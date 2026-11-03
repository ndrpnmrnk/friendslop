import { random } from '../core/random.js';
import { THREE, G, V3, mesh, col, lam, tmat, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { sfx } from '../core/sfx.js';
import { chunk } from '../world/particles.js';
import { shake } from '../game/worldfx.js';
import { sparks } from '../game/vfx.js';

/* v0.70 — запуск в матч на санях с трамплина (вместо рогатки). Тот же интерфейс, что у рогатки (menu.js):
   - помост на высоте с двумя лестницами по бокам, на нём бобслейные сани на 8 мест (4 ряда по 2);
   - игроки забегают по лестницам и запрыгивают на свои места;
   - снеговик-толкач разгоняет сани (фаза pull: путь по склону 0→1), сани съезжают и уходят с трамплина (fire),
     летят над городом (fly); через 0.55 с полёта сани разламываются на доски, игроки выпадают и летят на карту.
   Состояние st - только числа/строки: ведущий пересылает его гостям, у всех один и тот же ролик. */
const BREAK = .55;
export { BREAK as SLED_BREAK };
export function buildSled(b, x, z) {
  const group = new THREE.Group(); W.group.add(group); W.keep.push(group);
  const plank = tmat(T.wood()), steel = tmat(T.metal()), snow = lam({ map: T.grass(), color: 0xffffff }, 'sledSnow70'), red = lam({ color: 0xc8302a, emissive: 0x3a0a08, emissiveIntensity: .3 }, 'sled70-red'),
    gold = lam({ color: 0xf5c542, emissive: 0x6a4a10, emissiveIntensity: .4 }, 'sled70-gold'), dark = col(0x2b2533), scarf = [0xd8243a, 0x9be36b, 0x4ab0f0, 0xf5c542];
  const DY = 2.3, D0 = z + 1.5, D1 = z + 3.9, DX = 2.4, SW = 1.2, SZ = z + 2.7, NST = 8, RUN = 3.0;
  // путь саней: старт на краю помоста → низ склона → трамплин на краю острова
  const S0 = new V3(x, DY + .02, z + .9), B0 = new V3(x, .35, z - 3.6), K0 = new V3(x, 1.25, z - 5.4);
  const along = u => u < .72 ? S0.clone().lerp(B0, u / .72) : B0.clone().lerp(K0, (u - .72) / .28);
  group.add(compose('sled70-hill', a => {
    // помост и лестницы (как у рогатки - сценарий забега прежний)
    a(G.box, plank, x, DY - .06, (D0 + D1) / 2, DX * 2, .12, D1 - D0); a(G.box, steel, x, DY - .18, (D0 + D1) / 2, DX * 2 + .1, .12, D1 - D0 + .1);
    for (const sx of [-1, 1]) for (const zz of [D0 + .2, D1 - .2]) a(G.box, steel, x + sx * (DX - .2), (DY - .2) / 2, zz, .14, DY - .2, .14);
    a(G.box, steel, x, DY + .55, D1 - .05, DX * 2, .06, .06); for (let k = 0; k <= 6; k++) a(G.box, steel, x - DX + .05 + k * (DX * 2 - .1) / 6, DY + .28, D1 - .05, .05, .55, .05);
    for (const s of [-1, 1]) for (let k = 0; k < NST; k++) { const tx = x + s * (DX + RUN * (k + .5) / NST), top = DY * (NST - k) / NST;
      a(G.box, plank, tx, top - .05, SZ, RUN / NST + .02, .1, SW); a(G.box, steel, tx, top / 2 - .05, SZ - SW / 2 + .05, .06, top - .05, .06); a(G.box, steel, tx, top / 2 - .05, SZ + SW / 2 - .05, .06, top - .05, .06); }
    // снежный склон с деревянными бортами и трамплин: верх склона - помост, низ - край острова
    const L1 = S0.distanceTo(B0), ang1 = Math.atan2(S0.y - B0.y, S0.z - B0.z), mid1 = S0.clone().add(B0).multiplyScalar(.5);
    a(G.box, snow, x, mid1.y - .12, mid1.z, 1.9, .24, L1, ang1, 0, 0);
    const L2 = B0.distanceTo(K0), ang2 = Math.atan2(K0.y - B0.y, B0.z - K0.z), mid2 = B0.clone().add(K0).multiplyScalar(.5);
    a(G.box, snow, x, mid2.y - .12, mid2.z, 1.9, .24, L2, -ang2, 0, 0);
    for (const s of [-1, 1]) { a(G.box, plank, x + s * 1.02, mid1.y + .05, mid1.z, .12, .4, L1, ang1, 0, 0); a(G.box, plank, x + s * 1.02, mid2.y + .05, mid2.z, .12, .4, L2, -ang2, 0, 0); }
    // опоры склона
    for (let i = 1; i < 6; i++) { const p = along(i / 6); for (const s of [-1, 1]) a(G.box, steel, x + s * .9, p.y / 2, p.z, .1, Math.max(.1, p.y), .1); }
    // флажки-гирлянда вдоль трамплина
    for (let i = 0; i < 7; i++) { const p = along(.78 + i * .032); a(G.box, lam({ color: scarf[i % 4] }, 'sled70-flag' + (i % 4)), x - 1.2, p.y + .9, p.z, .04, .22, .18); }
  }));
  addSolid(x - DX, D0, x + DX, D1, DY - .24, DY); addSolid(x - DX, D1 - .1, x + DX, D1, DY, DY + .6);
  for (const s of [-1, 1]) for (let k = 0; k < NST; k++) { const tx = x + s * (DX + RUN * (k + .5) / NST), top = DY * (NST - k) / NST; addSolid(tx - RUN / NST / 2, SZ - SW / 2, tx + RUN / NST / 2, SZ + SW / 2, top - .3, top); }
  // склон закрыт перилами: до запуска по нему не бегают (иначе застревают на трамплине)
  addSolid(x - 1.1, z - 5.6, x + 1.1, z + .6, 0, 2.4);
  // сани: длинная лодка с полозьями, загнутым носом, бортами, ручками и лампой; 8 мест - 4 ряда по 2
  const sled = new THREE.Group(); group.add(sled);
  sled.add(compose('sled70-body', a => {
    for (const s of [-1, 1]) { a(G.box, steel, s * .55, -.08, 0, .07, .07, 3.4); a(G.box, steel, s * .55, .12, -1.78, .07, .4, .07, .5, 0, 0); }
    a(G.box, red, 0, .18, 0, 1.25, .26, 3.3); a(G.box, plank, 0, .33, 0, 1.05, .05, 3.1);
    for (const s of [-1, 1]) a(G.box, red, s * .62, .45, 0, .08, .3, 3.2);
    a(G.box, red, 0, .42, -1.72, 1.25, .5, .3, -.5, 0, 0); a(G.box, gold, 0, .55, -1.86, 1.0, .08, .08);
    for (let r = 0; r < 4; r++) for (const s of [-1, 1]) a(G.box, gold, s * .68, .62, -1.05 + r * .72, .06, .06, .3);
    a(G.box, dark, 0, .5, 1.62, 1.1, .3, .12); a(G.sph, lam({ color: 0xffe0a0, emissive: 0xffc070, emissiveIntensity: 1 }, 'sled70-lamp'), 0, .55, -1.95, .1, .1, .1);
  }));
  // снеговик-толкач позади саней
  const pusher = new THREE.Group(); group.add(pusher);
  pusher.add(compose('sled70-pusher', a => { const w = lam({ color: 0xf2f6ff, emissive: 0x3a4660, emissiveIntensity: .22 }, 'snowman70');
    a(G.sph10, w, 0, .45, 0, .5, .45, .5); a(G.sph10, w, 0, 1.08, 0, .36, .33, .36); a(G.sph10, w, 0, 1.55, 0, .26, .25, .26);
    a(G.cyl8, dark, 0, 1.86, 0, .2, .26, .2); a(G.cone4, col(0xff8a1f), 0, 1.55, -.3, .05, .22, .05, -Math.PI / 2, 0, 0); a(G.torus, col(0xd8243a), 0, 1.3, 0, .28, .28, .4, Math.PI / 2, 0, 0);
    for (const s of [-1, 1]) a(G.box, tmat(T.bark()), s * .35, 1.1, -.35, .05, .05, .6); }));
  const seats = [[-.27, -1.05], [.27, -1.05], [-.27, -.33], [.27, -.33], [-.27, .39], [.27, .39], [-.27, 1.11], [.27, 1.11]];
  const st = { phase: 'idle', t: 0, riders: [], pull: 0, out: 0, bob: 0, bv: 0, u: 0, ft: 0, broken: 0 };
  const pieces = [];
  const sledPos = new V3(), sledDir = new V3(), vFly = new V3();
  function place() {
    if (st.phase === 'fly') { const t = st.t; sledPos.copy(K0).addScaledVector(vFly, t); sledPos.y -= 9 * t * t; sled.position.copy(sledPos); sled.rotation.set(Math.min(.6, .25 + t * .5), 0, Math.sin(t * 6) * .08); }
    else { const u = st.u, p = along(u), q = along(Math.min(1, u + .02)); sledDir.subVectors(q, p).normalize(); sled.position.copy(p); sled.position.y += st.bob; sled.rotation.set(Math.atan2(sledDir.y, -sledDir.z), 0, 0); }
    // толкач: стоит за санями, во время разгона бежит следом и остаётся на помосте
    const pu = Math.min(st.u, .14), pp = along(pu); pusher.position.set(x, pp.y, pp.z + 2.0); pusher.rotation.x = st.phase === 'pull' && st.u < .14 ? -.35 : 0;
  }
  place();
  // площадка сбора позади помоста
  const PZ0 = D1 + .5, PZ1 = D1 + 3.6;
  b.ground(x - 4, PZ0, x + 4, PZ1, T.concrete(), 2, .03);
  for (const [mx, mz, sx, sz] of [[x, PZ0 + .05, 8, .12], [x, PZ1 - .05, 8, .12], [x - 3.95, (PZ0 + PZ1) / 2, .12, PZ1 - PZ0], [x + 3.95, (PZ0 + PZ1) / 2, .12, PZ1 - PZ0]]) b.marking(mx, mz, sx, sz, 0xf5c542);
  const zc = document.createElement('canvas'); zc.width = 256; zc.height = 192; { const g = zc.getContext('2d'); g.strokeStyle = '#ffd27a'; g.lineWidth = 8; g.setLineDash([22, 14]); g.strokeRect(8, 8, 240, 176); g.setLineDash([]); g.fillStyle = '#ffd27a';
    for (const yy of [52, 96, 140]) { g.beginPath(); g.moveTo(128 - 34, yy + 16); g.lineTo(128, yy - 10); g.lineTo(128 + 34, yy + 16); g.lineTo(128 + 20, yy + 16); g.lineTo(128, yy + 2); g.lineTo(128 - 20, yy + 16); g.fill(); } }
  const zoneMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(zc), transparent: true, opacity: 0, depthWrite: false, color: 0xffd27a, fog: false });
  const zoneMesh = new THREE.Mesh(G.plane, zoneMat); zoneMesh.rotation.x = -Math.PI / 2; zoneMesh.position.set(x, .06, (PZ0 + PZ1) / 2); zoneMesh.scale.set(7.8, PZ1 - PZ0 - .2, 1); zoneMesh.renderOrder = 3; zoneMesh.userData.noBatch = true; zoneMesh.visible = false; group.add(zoneMesh);
  function breakSled() { // доски, полозья и фонарь разлетаются; сами сани скрываются
    sled.visible = false; const mats = [red, plank, steel, gold];
    for (let i = 0; i < 16; i++) chunk(sledPos.x + (random() - .5) * 1.2, sledPos.y + .3, sledPos.z + (random() - .5) * 3, [(random() - .5) * 9 + vFly.x * .4, 3 + random() * 6, (random() - .5) * 9 + vFly.z * .4], { mat: mats[i % 4], size: .14 + random() * .14, sy: .5, life: 2.4 });
    sparks({ x: sledPos.x, y: sledPos.y + .6, z: sledPos.z }, 24, 0xffd27a); sfx('wood'); sfx('wood', { v: .7 });
  }
  return {
    st, pocket: sled, seats, rest: S0.clone().add(new V3(0, 1.2, 0)),
    zone(on, t = 0, all = false) { zoneMesh.visible = on; if (!on) return; zoneMat.opacity = .55 + Math.sin(t * 5) * .25; zoneMat.color.setHex(all ? 0x7dffa0 : 0xffd27a); },
    arm(riders) { st.riders = riders.slice(); st.phase = 'board'; st.t = 0; st.manual = true; },
    pull() { if (st.phase === 'board') { st.phase = 'pull'; st.t = 0; sfx('snowPack'); } },
    pad: { x0: x - 4, x1: x + 4, z0: PZ0, z1: PZ1 },
    deck: { y: DY, z0: D0, z1: D1, x: DX, stairZ: SZ, run: RUN }, huddle: new V3(x, 0, (PZ0 + PZ1) / 2),
    bounce(k = 1) { st.bv -= .8 * k; },
    onPad(p) { return p.x > x - 4 && p.x < x + 4 && p.z > PZ0 && p.z < PZ1 && Math.abs(p.y) < 1; },
    seatPos(i, out = new V3()) { sled.updateMatrixWorld(true); const s = seats[i % seats.length]; return sled.localToWorld(out.set(s[0], .38, s[1])); },
    sledPos: () => sled.position, breakAt: BREAK,
    reset() { Object.assign(st, { phase: 'idle', t: 0, riders: [], pull: 0, out: 0, bob: 0, bv: 0, u: 0, ft: 0, broken: 0, manual: false }); sled.visible = true; zoneMesh.visible = false; place(); },
    update(dt, t) {
      st.t += dt;
      st.bv += -st.bob * 90 * dt; st.bv *= Math.exp(-dt * 5); st.bob += st.bv * dt;
      if (st.phase === 'idle') { st.u = 0; }
      else if (st.phase === 'board') { if (!st.manual && st.t > .9 + st.riders.length * .2) { st.phase = 'pull'; st.t = 0; } }
      else if (st.phase === 'pull') { // разгон: снеговик толкает, потом сани сами набирают скорость под горку
        st.pull = Math.min(1, st.t / 2.6); st.u = Math.min(1, st.t < .9 ? st.t * st.t * .12 : .097 + (st.t - .9) * (.25 + (st.t - .9) * .32));
        if (random() < dt * 8) sfx('snowPack', { v: .5 }); if (st.u >= 1) { st.phase = 'fire'; st.t = 0; sfx('dash', { v: 1.4 }); shake(.4); } }
      else if (st.phase === 'fire') { st.u = 1; if (st.t > .08) { st.phase = 'fly'; st.t = 0; vFly.set(0, 9.5, -17); } }
      else if (st.phase === 'fly') { if (!st.broken && st.t > BREAK) { st.broken = 1; breakSled(); } }
      if (st.phase !== 'fly' && !sled.visible) sled.visible = true;
      place(); void t;
    },
  };
}
