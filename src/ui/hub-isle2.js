import { THREE, G, V3, col, tmat, lam, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid, moveSolid } from '../world/physics.js';
import { rockCone, cap, islandR } from './hub-island.js';
import { sfx } from '../core/sfx.js';
import { burst } from '../world/particles.js';
import { respawnItem } from '../game/items.js';
import { resetCoins, spawnCoin } from '../game/coins.js';

/* «Остров затей» (v0.59, переделан в v0.60): за южной аркой двора верёвочный мост ведёт на соседний летающий островок.
   - паркур на время (запад): старт с коврика у моста, ступени, лифт, бревно, узкие столбики, платформа на рельсе
     и самый трудный конец — маленькие столбики вверх к башне. На башне колокол и ФИСТ: взял — следующий
     появится через 20 минут (время хранится в браузере, перезагрузка не обманет). Время и рекорд — на табло;
   - тир (восток): стойка с мячами и тапками, напротив — тир-стенка: нижний ряд мишеней на петлях, сверху по рельсу
     ездят утки на подвесах. Попал — мишень откидывается назад и встаёт через 2 с. Брошенное возвращается на стойку;
   - арена-толкалка (юг): круг с бочками у края; кто упал вниз — возвращается сверху на батут у входа.
   Земля есть только на островах и мосту (W.walk), упавший с края возвращается. Угол контура: th = atan2(z, x),
   как у камня и верха острова (rockCone/cap). */
export const ISLE = { c: new V3(0, 0, 70), r: 17, bridge: { x0: -1.6, x1: 1.6, z0: 44, z1: 55 } };
const r2 = th => ISLE.r + Math.sin(th * 3 + 1) * .7 + Math.sin(th * 7) * .3;
export function hubWalk(x, z) {
  const B = ISLE.bridge; if (x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1) return true;
  const dx = x - ISLE.c.x, dz = z - ISLE.c.z; if (Math.hypot(dx, dz) < r2(Math.atan2(dz, dx)) - .4) return true;
  return Math.hypot(x, z) < islandR(Math.atan2(z, x)) - .5;
}
const FIST_CD = 20 * 60 * 1000, FIST_KEY = 'friendslop.parkourFist';
function boardTex() { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return { c, t }; }

export function buildIsle2(b, group) {
  const g = new THREE.Group(); g.name = 'isle2'; group.add(g); const C = ISLE.c, wood = tmat(T.wood()), metal = tmat(T.metal()), dark = col(0x2a2430), rope = col(0x6a4a2a), gold = col(0xffd27a);
  const X = x => C.x + x, Z = z => C.z + z;
  // остров: камень снизу и верх
  const rock = rockCone(r2, 26, 'isle2-rock'); rock.position.copy(C); g.add(rock);
  for (const m of cap(r2)) { m.position.x += C.x; m.position.z += C.z; g.add(m); }
  b.ground(X(-3), Z(-17), X(3), Z(-6), T.cobble(), 2, .014); // дорожка от моста
  // мост: доски с щелями, канаты-перила на столбиках
  g.add(compose('isle2-bridge', a => { const B = ISLE.bridge; for (let z = B.z0; z < B.z1; z += .55) a(G.box, wood, 0, .03, z + .25, 3.0, .08, .45, 0, (Math.sin(z * 7) * .03), 0);
    for (const s of [-1, 1]) { for (let z = B.z0; z <= B.z1; z += 2.5) a(G.box, wood, s * 1.55, .6, z, .12, 1.2, .12); a(G.cyl6, rope, s * 1.55, 1.1, (B.z0 + B.z1) / 2, .03, B.z1 - B.z0, .03, Math.PI / 2); a(G.cyl6, rope, s * 1.55, .6, (B.z0 + B.z1) / 2, .025, B.z1 - B.z0, .025, Math.PI / 2); } }));
  for (const s of [-1, 1]) addSolid(s * 1.55 - .08, ISLE.bridge.z0, s * 1.55 + .08, ISLE.bridge.z1, 0, 1.15);
  // арка-вход на острове: флажки
  g.add(compose('isle2-gate', a => { for (const s of [-1, 1]) { a(G.box, wood, X(s * 2.2), 1.6, Z(-14.6), .25, 3.2, .25); a(G.box, gold, X(s * 2.2), 3.25, Z(-14.6), .34, .1, .34); }
    a(G.box, wood, X(0), 3.1, Z(-14.6), 4.8, .3, .3); for (let i = 0; i < 9; i++) a(G.cone8, col([0xff8a1f, 0xb18cff, 0x9be36b][i % 3]), X(-2 + i * .5), 2.8, Z(-14.6), .14, .3, .04, Math.PI, 0, 0); }));
  for (const s of [-1, 1]) addSolid(X(s * 2.2) - .13, Z(-14.6) - .13, X(s * 2.2) + .13, Z(-14.6) + .13, 0, 3.2);

  /* ---------- паркур на время (запад) ---------- */
  const yel = col(0xffd27a), plat = (x, z, w, d, h, m = wood) => { b.box(X(x), Z(z), w, d, h, m); b.box(X(x), Z(z), w + .08, d + .08, .06, yel, { y: h - .03, solid: false }); };
  const P0 = new V3(X(-4.2), 0, Z(-11.2));
  g.add(compose('isle2-startpad', a => { a(G.cyl12, col(0x9be36b), P0.x, .03, P0.z, 1.1, .04, 1.1); a(G.cyl12, dark, P0.x, .02, P0.z, 1.25, .03, 1.25); }));
  // 1–3: ступени вверх
  plat(-6.7, -11.4, 1.6, 1.6, .9); plat(-9.1, -10.2, 1.4, 1.4, 1.8); plat(-11.4, -8.4, 1.4, 1.4, 2.7);
  // 4: лифт вверх-вниз
  const LX = X(-12.6), LZ = Z(-5.6), lift = new THREE.Mesh(G.box, metal); lift.scale.set(1.6, .25, 1.6); lift.position.set(LX, 2.5, LZ); g.add(lift); W.keep.push(lift);
  const liftS = addSolid(LX - .8, LZ - .8, LX + .8, LZ + .8, 2.25, 2.5);
  g.add(compose('isle2-liftrails', a => { for (const s of [-1, 1]) a(G.box, dark, LX + s * .95, 2.6, LZ, .1, 5.2, .1); a(G.box, dark, LX, 5.2, LZ, 2, .1, .1); }));
  // 5–6: площадка и ржавое бревно
  plat(-13.2, -2.6, 1.4, 1.4, 4.4); b.box(X(-13.2), Z(.1), .35, 4.0, .25, tmat(T.rust()), { y: 4.15 }); plat(-13.0, 2.8, 1.2, 1.2, 4.4);
  // 7: узкие столбики
  plat(-11.8, 4.6, .8, .8, 4.8, metal); plat(-10.3, 5.9, .8, .8, 5.0, metal); plat(-8.8, 7.0, .9, .9, 5.1, metal);
  // 8: платформа ездит по рельсу туда-сюда (надо поймать момент)
  const MZ = Z(8.2), MX0 = X(-7.2), MX1 = X(-4.0), mov = new THREE.Mesh(G.box, metal); mov.scale.set(1.3, .25, 1.3); mov.position.set(MX0, 5.0, MZ); g.add(mov); W.keep.push(mov);
  const movS = addSolid(MX0 - .65, MZ - .65, MX0 + .65, MZ + .65, 4.75, 5.0); let movX = MX0;
  g.add(compose('isle2-rail', a => { a(G.box, dark, (MX0 + MX1) / 2, 6.3, MZ, MX1 - MX0 + 1.6, .08, .08); for (const x of [MX0 - .8, MX1 + .8]) a(G.box, dark, x, 3.15, MZ, .12, 6.3, .12); }));
  for (const x of [MX0 - .8, MX1 + .8]) addSolid(x - .06, MZ - .06, x + .06, MZ + .06, 0, 6.3);
  const hanger = new THREE.Mesh(G.box, dark); hanger.scale.set(.05, 1.2, .05); g.add(hanger); W.keep.push(hanger);
  // 9: самый трудный конец — маленькие столбики всё выше, потом башня
  plat(-2.8, 9.6, .6, .6, 5.6, metal); plat(-3.6, 11.3, .6, .6, 6.2, metal); plat(-5.2, 12.2, .55, .55, 6.7, metal);
  const TW = new V3(X(-7.0), 7.2, Z(12.0));
  plat(-7.0, 12.0, 1.6, 1.6, 7.2, tmat(T.brickWall()));
  // колокол на башне
  const bell = compose('isle2-bell', a => { a(G.box, wood, -.6, .9, 0, .1, 1.8, .1); a(G.box, wood, -.3, 1.8, 0, .7, .1, .1); a(G.cone8, lam({ color: 0xf5c542, emissive: 0x5a3a00 }, 'isle2-bellgold'), 0, 1.5, 0, .26, .38, .26); });
  bell.position.copy(TW); g.add(bell);
  // фист на башне: кулдаун 20 мин, запоминается в браузере
  resetCoins(true, false);
  const FP = new V3(TW.x + .3, TW.y + .02, TW.z + .3); let fist = null;
  const fistReadyIn = () => { let t = 0; try { t = +localStorage.getItem(FIST_KEY) || 0; } catch { } return Math.max(0, t + FIST_CD - Date.now()); };
  const placeFist = () => { if (!fist || fist.gone) { if (fistReadyIn() > 0) return; fist = spawnCoin(FP.x, FP.y, FP.z, false) || null; } };
  placeFist();
  // табло у старта
  const board = boardTex(), boardM = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: board.t })); boardM.position.set(P0.x - 2.2, 2.2, P0.z + .2); boardM.scale.set(2.4, 1.5, 1); boardM.rotation.y = Math.PI * .12; g.add(boardM);
  g.add(compose('isle2-boardframe', a => { a(G.box, dark, P0.x - 2.2, 2.2, P0.z + .15, 2.6, 1.7, .08, 0, Math.PI * .12, 0); for (const s of [-1, 1]) a(G.box, dark, P0.x - 2.2 + s * 1.15, .7, P0.z + .15 - s * .43, .1, 1.4, .1); }));
  let best = 0; try { best = +localStorage.getItem('friendslop.parkourBest') || 0; } catch { }
  const run = { state: 'idle', t: 0, last: 0, prev: 0 }; let boardFist = -1;
  function drawBoard() { const q = board.c.getContext('2d'); q.fillStyle = '#17111f'; q.fillRect(0, 0, 256, 160); q.textAlign = 'center';
    q.fillStyle = '#9be36b'; q.font = 'bold 22px monospace'; q.fillText('ПАРКУР', 128, 28);
    q.fillStyle = '#ffd27a'; q.font = 'bold 34px monospace'; q.fillText(run.state === 'run' ? run.t.toFixed(1) + ' с' : run.last ? run.last.toFixed(1) + ' с' : 'на старт!', 128, 70);
    q.fillStyle = '#c8b0ff'; q.font = 'bold 17px monospace'; q.fillText(best ? 'рекорд ' + best.toFixed(1) + ' с' : 'рекорда нет', 128, 100);
    const left = fistReadyIn(); q.fillStyle = fist && !fist.gone ? '#ffd84f' : '#8a8098'; q.font = 'bold 16px monospace';
    q.fillText(fist && !fist.gone ? 'на башне ждёт ФИСТ!' : left > 0 ? 'фист через ' + Math.ceil(left / 60000) + ' мин' : 'фист скоро', 128, 136); board.t.needsUpdate = true; }
  drawBoard();

  /* ---------- тир (восток) ---------- */
  // стойка у дорожки, игрок бросает на юг, в тир-стенку
  const RZ = Z(-7.6), RX = X(6.5);
  g.add(compose('isle2-counter', a => { a(G.box, wood, RX, .5, RZ, 6.4, 1, .7); a(G.box, col(0xd8243a), RX, 1.02, RZ, 6.5, .05, .8);
    for (const s of [-1, 1]) a(G.box, dark, RX + s * 3.2, 1.6, RZ + .3, .1, 3.2, .1); a(G.box, dark, RX, 3.2, RZ + .3, 6.5, .1, .1);
    for (let i = 0; i < 7; i++) a(G.box, col(i % 2 ? 0xf1e8ff : 0xd8243a), RX - 3 + i, 3.0, RZ + .3, 1, .36, .05);
    for (let i = 0; i < 6; i++) a(G.box, col(0x6a4a2a), RX - 2.5 + i, 1.06, RZ, .7, .03, .5); }));
  addSolid(RX - 3.2, RZ - .35, RX + 3.2, RZ + .35, 0, 1);
  const ammo = []; for (const [t, dx] of [['ball', -2.5], ['ball', -1.5], ['slipper', -.5], ['ball', .5], ['slipper', 1.5], ['ball', 2.5]]) { const it = b.item(t, RX + dx, RZ, 1.05); if (it) ammo.push({ it, away: 0 }); }
  // тир-стенка в 8.6 м: щит, нижний ряд мишеней на петлях, рельс с утками сверху
  const GZ = RZ + 8.6;
  g.add(compose('isle2-gallery', a => { a(G.box, col(0x3a2a5a), RX, 1.5, GZ + .25, 7.6, 3, .2); a(G.box, gold, RX, 3.05, GZ + .25, 7.8, .12, .26); a(G.box, gold, RX, .05, GZ + .25, 7.8, .1, .26);
    a(G.box, wood, RX, .55, GZ - .1, 7.4, .1, .5); a(G.box, metal, RX, 2.45, GZ - .05, 7.4, .07, .07);
    for (const s of [-1, 1]) a(G.box, dark, RX + s * 3.75, 1.5, GZ + .25, .14, 3.1, .3);
    for (let i = 0; i < 12; i++) a(G.box, col(i % 2 ? 0xd8243a : 0xf1e8ff), RX - 3.5 + i * .64, 3.25, GZ + .2, .64, .3, .05); }));
  addSolid(RX - 3.85, GZ + .1, RX + 3.85, GZ + .4, 0, 3.1);
  const targetModel = () => compose('isle2-target', a => { a(G.cyl12, col(0xf1e8ff), 0, .36, 0, .34, .04, .34, Math.PI / 2); a(G.cyl12, col(0xd8243a), 0, .36, -.025, .25, .03, .25, Math.PI / 2); a(G.cyl12, col(0xf1e8ff), 0, .36, -.04, .15, .03, .15, Math.PI / 2); a(G.cyl12, col(0xd8243a), 0, .36, -.055, .06, .03, .06, Math.PI / 2); a(G.box, dark, 0, .02, 0, .3, .04, .06); });
  const duckModel = () => compose('isle2-duck', a => { a(G.sph10, col(0xf5c542), 0, 0, 0, .34, .26, .14); a(G.sph10, col(0xf5c542), .22, .2, 0, .15, .15, .12); a(G.box, col(0xff8a1f), .38, .19, 0, .12, .05, .06); a(G.box, col(0x17111f), .26, .25, -.07, .04, .04, .02); a(G.box, dark, 0, .45, 0, .03, .5, .03); });
  const targets = [];
  for (let i = 0; i < 5; i++) { const tg = new THREE.Group(); tg.position.set(RX - 2.8 + i * 1.4, .6, GZ - .1); tg.add(targetModel()); g.add(tg); W.keep.push(tg); targets.push({ g: tg, kind: 'pin', y: .96, down: 0 }); }
  for (let i = 0; i < 3; i++) { const tg = new THREE.Group(); tg.position.set(RX, 1.75, GZ - .05); tg.add(duckModel()); g.add(tg); W.keep.push(tg); targets.push({ g: tg, kind: 'duck', y: 1.75, down: 0, ph: i / 3 }); }
  let score = 0;

  /* ---------- арена-толкалка (юг, у края) ---------- */
  const A = new V3(X(2.5), 0, Z(10.5)), AR = 3.4;
  g.add(compose('isle2-arena', a => { a(G.cyl12, col(0x4a3a6a), A.x, .2, A.z, AR, .4, AR); a(G.cyl12, gold, A.x, .41, A.z, AR - .1, .02, AR - .1); a(G.cyl12, col(0x4a3a6a), A.x, .42, A.z, AR - .4, .02, AR - .4); }));
  for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; addSolid(A.x + Math.cos(an) * (AR - .4) - .5, A.z + Math.sin(an) * (AR - .4) - .5, A.x + Math.cos(an) * (AR - .4) + .5, A.z + Math.sin(an) * (AR - .4) + .5, 0, .4); }
  addSolid(A.x - 1.6, A.z - 1.6, A.x + 1.6, A.z + 1.6, 0, .4);
  const barrels = [0, 1, 2].map(i => b.ride('barrel', A.x + (i - 1) * 1.2, A.z + (i % 2 ? .6 : -.4), 0, .4));
  // батут у входа на арену: сюда падают вернувшиеся снизу
  const TR = new V3(X(-2.2), 0, Z(5.2));
  g.add(compose('isle2-tramp', a => { a(new THREE.TorusGeometry(.93, .07, 5, 16), metal, 0, .5, 0, 1.2, 1, 1.2, Math.PI / 2); a(G.cyl12, col(0x1e2a4a), 0, .48, 0, 1.08, .02, 1.08); for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2; a(G.cyl6, metal, Math.cos(an) * 1.08, .25, Math.sin(an) * 1.08, .05, .5, .05); } }).translateX(TR.x).translateZ(TR.z));
  b.solid(TR.x, TR.z, 1.9, 1.9, 0, .5); b.bouncer(TR.x - .9, TR.z - .9, TR.x + .9, TR.z + .9, .5, 11);

  /* ---------- уют: фонарики, гирлянды, тыквы, скамейки, деревья ---------- */
  g.add(compose('isle2-lamps', a => { for (let i = 0; i < 9; i++) { const an = i / 9 * Math.PI * 2 + .2, R = ISLE.r - 1.2; const x = C.x + Math.cos(an) * R, z = C.z + Math.sin(an) * R; if (Math.abs(x) < 3 && z < C.z) continue; a(G.box, dark, x, 1.1, z, .08, 2.2, .08); a(G.box, glow(0xffc070), x, 2.25, z, .2, .26, .2); } }));
  b.stringLights?.(X(-2.2), Z(-14.6), X(-3.6), Z(-6), 3.0); b.stringLights?.(X(2.2), Z(-14.6), X(3.4), Z(-8.2), 3.0);
  for (const [x, z, ry] of [[1.4, -2.5, -Math.PI / 2], [-1.6, 1.5, Math.PI / 2]]) b.bench?.(X(x), Z(z), ry);
  b.tree?.(X(-6), Z(1.5), .9); b.tree?.(X(12.5), Z(2.5), .8);
  b.pumpkinPatch?.(X(9.5), Z(5.5), 3, 2, 4); b.hayBales?.(X(-2.6), Z(-3.6), 2, .4);
  (W.lightSources ??= []).push({ x: X(-8), y: 3, z: Z(-6), color: 0xffd8a0, strength: 2.6, range: 9 }, { x: RX, y: 3, z: Z(-4), color: 0xffd8a0, strength: 2.6, range: 9 }, { x: A.x, y: 3, z: A.z, color: 0xffd8a0, strength: 2.4, range: 8 }, { x: TW.x, y: 9, z: TW.z, color: 0xffe2a0, strength: 2, range: 6 });

  const timerEl = document.createElement('div'); timerEl.id = 'hubTimer'; timerEl.className = 'hidden'; document.body.appendChild(timerEl);
  const toast = (txt, ms = 1800) => { timerEl.textContent = txt; timerEl.classList.remove('hidden'); clearTimeout(timerEl._h); timerEl._h = setTimeout(() => timerEl.classList.add('hidden'), ms); };
  let slow = 0;
  return {
    stations: [], best: () => best,
    update(dt, t, P) {
      // лифт
      const ly = 2.5 + (Math.sin(t * .9) * .5 + .5) * 1.9; lift.position.y = ly; moveSolid(liftS, LX - .8, LZ - .8, LX + .8, LZ + .8, ly - .25, ly);
      // платформа на рельсе: едет, на концах замирает; стоящего на ней везёт с собой
      const k = THREE.MathUtils.smoothstep(Math.sin(t * .7) * .6 + .5, 0, 1), nx = MX0 + (MX1 - MX0) * k, dx = nx - movX;
      if (P && P.onGround && Math.abs(P.pos.x - movX) < .75 && Math.abs(P.pos.z - MZ) < .75 && Math.abs(P.pos.y - 5.0) < .2) P.pos.x += dx;
      movX = nx; mov.position.x = nx; moveSolid(movS, nx - .65, MZ - .65, nx + .65, MZ + .65, 4.75, 5.0); hanger.position.set(nx, 5.7, MZ);
      // мишени: нижний ряд стоит на петлях, утки едут по рельсу; попадание — мишень откидывается назад, встаёт через 2 с
      for (const q of targets) {
        if (q.kind === 'duck') { const u = (t * .12 + q.ph) % 1, x = RX - 3.3 + u * 6.6; q.g.position.x = x; q.g.visible = u > .02 && u < .98; }
        if (q.down > 0) { q.down -= dt; const fall = Math.min(1, (2 - q.down) * 7), up = q.down < .3 ? q.down / .3 : 1; q.g.rotation.x = Math.PI / 2 * fall * up; continue; } q.g.rotation.x = 0;
        if (!q.g.visible) continue; const tx = q.g.position.x;
        for (const it of W.items) if (it.state === 'fly' && Math.abs(it.pos.x - tx) < .45 && Math.abs(it.pos.z - (GZ - .1)) < .55 && Math.abs(it.pos.y - q.y) < .45) {
          q.down = 2; score += q.kind === 'duck' ? 2 : 1; it.vel.z = -Math.abs(it.vel.z) * .3; it.vel.x *= .3;
          sfx('bonk', { at: it.pos }); sfx('points', { at: it.pos }); burst(tx, q.y, GZ - .2, 10, { color: 0xffd27a, size: .1, speed: 2, up: 1.5 }); toast('Тир: ' + score + (q.kind === 'duck' ? '  (утка +2)' : '')); break; }
      }
      // брошенное возвращается на стойку: улетело вниз, разбилось или лежит в стороне дольше 5 с
      for (const a of ammo) { const it = a.it, h = it.home;
        const lost = it.state === 'gone' || it.pos.y < -10, idle = it.state === 'rest' && Math.hypot(it.pos.x - h.x, it.pos.z - h.z) > 1;
        a.away = lost ? a.away + dt * 10 : idle ? a.away + dt : 0; if (a.away > 5) { a.away = 0; respawnItem(it); sfx('spring', { at: it.pos, v: .5 }); } }
      // бочки упали с арены — возвращаются
      for (const br of barrels) if (br && br.y < -14) { br.x = A.x + (Math.random() - .5); br.z = A.z; br.y = 3; br.vx = br.vz = 0; br.vy = 0; }
      // фист и табло — раз в секунду
      slow -= dt; if (slow <= 0) { slow = 1; if (fist && fist.gone) { try { localStorage.setItem(FIST_KEY, String(Date.now())); } catch { } fist = null; } placeFist();
        const f = fist && !fist.gone ? -1 : Math.ceil(fistReadyIn() / 60000); if (f !== boardFist) { boardFist = f; drawBoard(); } }
      bell.rotation.z *= Math.exp(-dt * 3); bell.rotation.z = Math.sin(t * 9) * bell.rotation.z;
      if (!P) return;
      // паркур: ушёл с коврика — время пошло; башня — финиш; упал на землю — заново
      const dPad = Math.hypot(P.pos.x - P0.x, P.pos.z - P0.z), onPad = dPad < 1.1 && P.pos.y < .3;
      if (run.state === 'idle' && onPad) run.state = 'ready';
      else if (run.state === 'ready' && !onPad) { run.state = dPad < 2.2 ? 'run' : 'idle'; run.t = 0; if (run.state === 'run') sfx('go'); }
      else if (run.state === 'run') { run.t += dt; timerEl.textContent = 'Паркур: ' + run.t.toFixed(1) + ' с'; timerEl.classList.remove('hidden'); clearTimeout(timerEl._h);
        if (P.pos.y > TW.y - .2 && Math.hypot(P.pos.x - TW.x, P.pos.z - TW.z) < 1.1) { run.state = 'idle'; run.last = run.t; const rec = !best || run.t < best; if (rec) { best = run.t; try { localStorage.setItem('friendslop.parkourBest', String(best)); } catch { } }
          sfx('bell', { at: P.pos }); sfx(rec ? 'fanfare' : 'points'); burst(P.pos.x, P.pos.y + 2, P.pos.z, 24, { color: rec ? 0xffd27a : 0x9be36b, size: .14, speed: 3, up: 3 }); bell.rotation.z = .4;
          toast((rec ? 'Рекорд! ' : 'Финиш: ') + run.t.toFixed(1) + ' с' + (fist && !fist.gone ? ' — бери фист!' : ''), 2800); drawBoard(); }
        else if (run.t > .5 && P.onGround && P.pos.y < .3 && dPad > 2.5) { run.state = 'idle'; toast('Упал — давай ещё раз', 1500); drawBoard(); }
        if ((run.t * 10 | 0) !== run.prev) { run.prev = run.t * 10 | 0; drawBoard(); } }
    },
    // куда вернуть упавшего: у острова затей — сверху на батут, иначе — на точку появления
    respawn(p) { return Math.hypot(p.x - C.x, p.z - C.z) < 32 ? new V3(TR.x, 7, TR.z) : null; },
    stop() { timerEl.classList.add('hidden'); run.state = 'idle'; },
  };
}
