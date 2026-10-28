import { THREE, G, V3, col, tmat, lam, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid, moveSolid } from '../world/physics.js';
import { rockCone, cap, islandR } from './hub-island.js';
import { sfx } from '../core/sfx.js';
import { burst } from '../world/particles.js';

/* v0.59 — «Остров затей»: за южной аркой двора верёвочный мост ведёт на соседний летающий островок.
   На нём четыре развлечения:
   - паркур-трасса на время: старт с коврика, уступы, лифт-платформа, бревно над пропастью, колокол на финише;
     время и рекорд на табло (рекорд хранится в браузере игрока);
   - тир: стойка с мячами и тапками, пять мишеней качаются на стойках; попал — мишень падает и встаёт снова;
   - арена-толкалка на краю острова: бочки и ты; кто упал вниз — возвращается сверху на батут у входа;
   - смотровая с телескопом: E — смотреть на город внизу (мышь — обзор), E — назад.
   Земля есть только на островах и мосту (W.walk), упавший с края возвращается. */
export const ISLE = { c: new V3(0, 0, 67), r: 14, bridge: { x0: -1.6, x1: 1.6, z0: 44, z1: 54 } };
const r2 = th => ISLE.r + Math.sin(th * 3 + 1) * .7 + Math.sin(th * 7) * .3;
export function hubWalk(x, z) {
  const B = ISLE.bridge; if (x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1) return true;
  const dx = x - ISLE.c.x, dz = z - ISLE.c.z; if (Math.hypot(dx, dz) < r2(Math.atan2(-dz, dx)) - .4) return true;
  return Math.hypot(x, z) < islandR(Math.atan2(-z, x)) - .5;
}
function boardTex() { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return { c, t }; }

export function buildIsle2(b, group) {
  const g = new THREE.Group(); g.name = 'isle2'; group.add(g); const C = ISLE.c, wood = tmat(T.wood()), metal = tmat(T.metal()), dark = col(0x2a2430), rope = col(0x6a4a2a);
  // остров: камень снизу и верх
  const rock = rockCone(r2, 24, 'isle2-rock'); rock.position.copy(C); g.add(rock);
  for (const m of cap(r2)) { m.position.x += C.x; m.position.z += C.z; g.add(m); }
  // мост: доски с щелями, канаты-перила на столбиках
  g.add(compose('isle2-bridge', a => { const B = ISLE.bridge; for (let z = B.z0; z < B.z1; z += .55) a(G.box, wood, 0, .03, z + .25, 3.0, .08, .45, 0, (Math.random() - .5) * .06, 0);
    for (const s of [-1, 1]) { for (let z = B.z0; z <= B.z1; z += 2.5) a(G.box, wood, s * 1.55, .6, z, .12, 1.2, .12); a(G.cyl6, rope, s * 1.55, 1.1, (B.z0 + B.z1) / 2, .03, B.z1 - B.z0, .03, Math.PI / 2); a(G.cyl6, rope, s * 1.55, .6, (B.z0 + B.z1) / 2, .025, B.z1 - B.z0, .025, Math.PI / 2); } }));
  for (const s of [-1, 1]) addSolid(s * 1.55 - .08, ISLE.bridge.z0, s * 1.55 + .08, ISLE.bridge.z1, 0, 1.15);

  /* ---------- паркур на время (запад) ---------- */
  const P0 = new V3(C.x - 9, 0, C.z + 7);
  g.add(compose('isle2-startpad', a => { a(G.cyl12, col(0x9be36b), P0.x, .03, P0.z, 1.1, .04, 1.1); a(G.cyl12, dark, P0.x, .02, P0.z, 1.25, .03, 1.25); }));
  const steps = [[-10, 3.5, .9, 1.5], [-11.5, 1, 1.7, 1.4], [-10, -1.5, 2.5, 1.4], [-3.6, -5, 3.6, 1.6], [-3.6, -11.3, 4.2, 2.2]];
  for (const [x, z, h, w] of steps) { const X = C.x + x, Z = C.z + z; b.box(X, Z, w, w, h, wood); b.box(X, Z, w + .08, w + .08, .1, col(0xffd27a), { y: h - .05, solid: false }); }
  // лифт-платформа: ездит вверх-вниз между уступом 3 и уступом 4
  const lift = new THREE.Mesh(G.box, metal); lift.scale.set(1.6, .25, 1.6); const LX = C.x - 7, LZ = C.z - 3.5; lift.position.set(LX, 2.4, LZ); g.add(lift); W.keep.push(lift);
  const liftS = addSolid(LX - .8, LZ - .8, LX + .8, LZ + .8, 2.15, 2.4);
  // бревно-труба до финиша
  b.box(C.x - 3.6, C.z - 8.1, .35, 4.6, .25, tmat(T.rust()), { y: 3.35 });
  // колокол на финише
  const bell = compose('isle2-bell', a => { a(G.box, wood, 0, 1.0, 0, .12, 2, .12); a(G.box, wood, 0, 2.0, 0, .9, .12, .12); a(G.cone8, lam({ color: 0xf5c542, emissive: 0x5a3a00 }, 'isle2-bellgold'), .3, 1.7, 0, .28, .4, .28); });
  bell.position.set(C.x - 3.6, 4.2, C.z - 11.3); g.add(bell);
  const board = boardTex(), boardM = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: board.t })); boardM.position.set(P0.x - 1.8, 2.2, P0.z + .3); boardM.scale.set(2.4, 1.2, 1); boardM.rotation.y = Math.PI * .1; g.add(boardM);
  g.add(compose('isle2-boardframe', a => { a(G.box, dark, P0.x - 1.8, 2.2, P0.z + .25, 2.6, 1.4, .08, 0, Math.PI * .1, 0); for (const s of [-1, 1]) a(G.box, dark, P0.x - 1.8 + s * 1.15, .8, P0.z + .25 - s * .37, .1, 1.6, .1); }));
  let best = 0; try { best = +localStorage.getItem('friendslop.parkourBest') || 0; } catch { }
  const run = { state: 'idle', t: 0, last: 0 };
  function drawBoard() { const q = board.c.getContext('2d'); q.fillStyle = '#17111f'; q.fillRect(0, 0, 256, 128); q.fillStyle = '#9be36b'; q.font = 'bold 22px monospace'; q.textAlign = 'center';
    q.fillText('ПАРКУР', 128, 30); q.fillStyle = '#ffd27a'; q.font = 'bold 34px monospace'; q.fillText(run.state === 'run' ? run.t.toFixed(1) + ' с' : run.last ? run.last.toFixed(1) + ' с' : 'на старт!', 128, 74);
    q.fillStyle = '#c8b0ff'; q.font = 'bold 18px monospace'; q.fillText(best ? 'рекорд ' + best.toFixed(1) + ' с' : 'рекорда нет', 128, 108); board.t.needsUpdate = true; }
  drawBoard();

  /* ---------- тир (восток) ---------- */
  const RZ = C.z + 6.5, targets = [];
  g.add(compose('isle2-counter', a => { a(G.box, wood, C.x + 7, .5, RZ, 7, 1, .7); a(G.box, col(0xd8243a), C.x + 7, 1.02, RZ, 7.1, .05, .8); for (let i = 0; i < 7; i++) a(G.box, col(i % 2 ? 0xf1e8ff : 0xd8243a), C.x + 3.75 + i, 2.6, RZ - .1, 1, .3, .05); for (const s of [-1, 1]) a(G.box, dark, C.x + 7 + s * 3.5, 1.5, RZ, .1, 3, .1); }));
  addSolid(C.x + 3.5, RZ - .35, C.x + 10.5, RZ + .35, 0, 1);
  for (const [t, dx] of [['ball', 4.2], ['ball', 5.2], ['slipper', 6.2], ['ball', 7.2], ['slipper', 8.2], ['ball', 9.4]]) b.item(t, C.x + dx, RZ + .1, 1.05);
  for (let i = 0; i < 5; i++) { const x0 = C.x + 3.6 + i * 1.7, z0 = C.z - 3.5 - (i % 2) * 1.2, h = 1.1 + (i % 3) * .5;
    const post = compose('isle2-post', a => { a(G.box, dark, 0, h / 2, 0, .08, h, .08); a(G.box, dark, 0, .04, 0, .5, .08, .5); }); post.position.set(x0, 0, z0); g.add(post);
    const tg = new THREE.Group(); tg.position.set(x0, h, z0); g.add(tg); W.keep.push(tg);
    tg.add(compose('isle2-target', a => { a(G.cyl12, col(0xf1e8ff), 0, .32, 0, .36, .04, .36, Math.PI / 2); a(G.cyl12, col(0xd8243a), 0, .32, .025, .26, .03, .26, Math.PI / 2); a(G.cyl12, col(0xf1e8ff), 0, .32, .04, .15, .03, .15, Math.PI / 2); a(G.cyl12, col(0xd8243a), 0, .32, .055, .06, .03, .06, Math.PI / 2); }));
    targets.push({ g: tg, x0, z0, h, ph: i * 1.3, down: 0 }); }
  let score = 0;

  /* ---------- арена-толкалка (юг, у края) ---------- */
  const A = new V3(C.x, 0, C.z + 10.5), AR = 3.4;
  g.add(compose('isle2-arena', a => { a(G.cyl12, col(0x4a3a6a), A.x, .2, A.z, AR, .4, AR); a(G.cyl12, col(0xffd27a), A.x, .41, A.z, AR - .1, .02, AR - .1); a(G.cyl12, col(0x4a3a6a), A.x, .42, A.z, AR - .4, .02, AR - .4); }));
  for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; addSolid(A.x + Math.cos(an) * (AR - .4) - .5, A.z + Math.sin(an) * (AR - .4) - .5, A.x + Math.cos(an) * (AR - .4) + .5, A.z + Math.sin(an) * (AR - .4) + .5, 0, .4); }
  addSolid(A.x - 1.6, A.z - 1.6, A.x + 1.6, A.z + 1.6, 0, .4);
  const barrels = [0, 1, 2].map(i => b.ride('barrel', A.x + (i - 1) * 1.2, A.z + (i % 2 ? .6 : -.4), 0, .4));
  // батут у входа на арену: сюда падают вернувшиеся снизу
  const TR = new V3(A.x - 4.6, 0, A.z - 4.2);
  g.add(compose('isle2-tramp', a => { a(new THREE.TorusGeometry(.93, .07, 5, 16), metal, 0, .5, 0, 1.2, 1, 1.2, Math.PI / 2); a(G.cyl12, col(0x1e2a4a), 0, .48, 0, 1.08, .02, 1.08); for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2; a(G.cyl6, metal, Math.cos(an) * 1.08, .25, Math.sin(an) * 1.08, .05, .5, .05); } }).translateX(TR.x).translateZ(TR.z));
  b.solid(TR.x, TR.z, 1.9, 1.9, 0, .5); b.bouncer(TR.x - .9, TR.z - .9, TR.x + .9, TR.z + .9, .5, 11);

  /* ---------- смотровая с телескопом (северо-восток, у моста) ---------- */
  const S0 = new V3(C.x + 8.5, 0, C.z - 9.5);
  g.add(compose('isle2-deck', a => { a(G.box, wood, S0.x, .1, S0.z, 3.2, .2, 2.4); for (const [x, z, w, d] of [[0, -1.2, 3.2, .08], [1.6, 0, .08, 2.4], [-1.6, 0, .08, 2.4]]) { a(G.box, metal, S0.x + x, 1.05, S0.z + z, w, .06, d); a(G.box, metal, S0.x + x, .55, S0.z + z, w, .04, d); } }));
  addSolid(S0.x - 1.6, S0.z - 1.25, S0.x + 1.6, S0.z - 1.15, 0, 1.1);
  const scope = compose('isle2-scope', a => { for (const s of [-1, 0, 1]) a(G.cyl6, dark, s * .25, .6, s ? .15 : -.25, .03, 1.2, .03, s ? .25 : -.25, 0, s * .25); a(G.cyl8, lam({ color: 0xb08a40, emissive: 0x2a1a00 }, 'isle2-brass'), 0, 1.25, -.1, .1, .9, .1, Math.PI / 2 - .5); a(G.cyl8, dark, 0, 1.47, -.48, .13, .08, .13, Math.PI / 2 - .5); });
  scope.position.set(S0.x, .2, S0.z - .4); g.add(scope);

  // фонарики по кругу острова
  g.add(compose('isle2-lamps', a => { for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2 + .2, R = ISLE.r - 1; const x = C.x + Math.cos(an) * R, z = C.z - Math.sin(an) * R; a(G.box, dark, x, 1.1, z, .08, 2.2, .08); a(G.box, glow(0xffc070), x, 2.25, z, .2, .26, .2); } }));
  (W.lightSources ??= []).push({ x: C.x - 6, y: 3, z: C.z, color: 0xffd8a0, strength: 3, range: 9 }, { x: C.x + 6, y: 3, z: C.z, color: 0xffd8a0, strength: 3, range: 9 }, { x: C.x, y: 3, z: C.z + 9, color: 0xffd8a0, strength: 3, range: 8 });

  const stations = [{ id: 'scope', name: 'Телескоп', hint: 'Посмотреть на город', p: new V3(S0.x, 0, S0.z + .5), r: 1.3, eye: new V3(S0.x, 1.75, S0.z - .2) }];
  const timerEl = document.createElement('div'); timerEl.id = 'hubTimer'; timerEl.className = 'hidden'; document.body.appendChild(timerEl);
  return {
    stations, best: () => best,
    update(dt, t, P) {
      // лифт
      const ly = 2.4 + (Math.sin(t * .9) * .5 + .5) * 1.2; lift.position.y = ly; moveSolid(liftS, LX - .8, LZ - .8, LX + .8, LZ + .8, ly - .25, ly);
      // мишени качаются; попадание брошенным предметом — падает, встаёт через 2 с
      for (const q of targets) { const x = q.x0 + Math.sin(t * 1.1 + q.ph) * .8; q.g.position.x = x;
        if (q.down > 0) { q.down -= dt; q.g.rotation.x = -Math.PI / 2 * Math.min(1, (2 - q.down) * 6) * (q.down > .3 ? 1 : q.down / .3); continue; } q.g.rotation.x = 0;
        for (const it of W.items) if (it.state === 'fly' && Math.hypot(it.pos.x - x, it.pos.z - q.z0) < .5 && Math.abs(it.pos.y - (q.h + .32)) < .5) { q.down = 2; score++; sfx('bonk', { at: it.pos }); sfx('points'); burst(x, q.h + .4, q.z0, 10, { color: 0xffd27a, size: .1, speed: 2, up: 1.5 }); timerEl.textContent = 'Тир: ' + score; timerEl.classList.remove('hidden'); clearTimeout(timerEl._h); timerEl._h = setTimeout(() => timerEl.classList.add('hidden'), 1800); break; } }
      // бочки упали с арены — возвращаются
      for (const br of barrels) if (br && br.y < -14) { br.x = A.x + (Math.random() - .5); br.z = A.z; br.y = 3; br.vx = br.vz = 0; br.vy = 0; }
      if (!P) return;
      // паркур: ушёл с коврика — время пошло; колокол — финиш; упал на землю — заново
      const onPad = Math.hypot(P.pos.x - P0.x, P.pos.z - P0.z) < 1.1 && P.pos.y < .3;
      if (run.state === 'idle' && onPad) { run.state = 'ready'; }
      else if (run.state === 'ready' && !onPad) { run.state = Math.hypot(P.pos.x - P0.x, P.pos.z - P0.z) < 2.2 ? 'run' : 'idle'; run.t = 0; if (run.state === 'run') sfx('go'); }
      else if (run.state === 'run') { run.t += dt; timerEl.textContent = 'Паркур: ' + run.t.toFixed(1) + ' с'; timerEl.classList.remove('hidden');
        if (P.pos.y > 3.9 && Math.hypot(P.pos.x - (C.x - 3.6), P.pos.z - (C.z - 11.3)) < 1.3) { run.state = 'idle'; run.last = run.t; const rec = !best || run.t < best; if (rec) { best = run.t; try { localStorage.setItem('friendslop.parkourBest', String(best)); } catch { } }
          sfx('bell', { at: P.pos }); sfx(rec ? 'fanfare' : 'points'); burst(P.pos.x, P.pos.y + 2, P.pos.z, 24, { color: rec ? 0xffd27a : 0x9be36b, size: .14, speed: 3, up: 3 }); bell.rotation.z = .4;
          timerEl.textContent = (rec ? 'Рекорд! ' : 'Финиш: ') + run.t.toFixed(1) + ' с'; clearTimeout(timerEl._h); timerEl._h = setTimeout(() => timerEl.classList.add('hidden'), 2500); }
        else if (run.t > .5 && P.onGround && P.pos.y < .3 && !onPad && Math.hypot(P.pos.x - P0.x, P.pos.z - P0.z) > 2.5) { run.state = 'idle'; timerEl.textContent = 'Упал — давай ещё раз'; clearTimeout(timerEl._h); timerEl._h = setTimeout(() => timerEl.classList.add('hidden'), 1500); }
        if ((run.t * 10 | 0) !== (run.prev | 0)) { run.prev = run.t * 10; drawBoard(); } }
      bell.rotation.z *= Math.exp(-dt * 3); bell.rotation.z = Math.sin(t * 9) * bell.rotation.z;
    },
    // куда вернуть упавшего: на остров затей — сверху на батут, иначе — на точку появления
    respawn(p) { return Math.hypot(p.x - C.x, p.z - C.z) < 30 ? new V3(TR.x, 7, TR.z) : null; },
    stop() { timerEl.classList.add('hidden'); run.state = 'idle'; },
  };
}
