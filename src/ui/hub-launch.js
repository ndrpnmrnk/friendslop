import { THREE, G, V3, mesh, col, tmat, lam, glow, compose, jellify } from '../core/gfx.js';
import { T, pix } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { addPushable } from '../world/pushables.js';
import { DISTRICTS } from '../world/districts/index.js';
import { CONFIG, HW } from '../config.js';
import { sfx } from '../core/sfx.js';
import { sparks, impactBurst } from '../game/vfx.js';
import { shake } from '../game/worldfx.js';

/* v0.55 — запуск матча из хаба. Решение «на все сезоны»: меняется только декор, механика остаётся.
   1) Футбол голосования: большой мяч на маленькой арене, трое ворот с табличками режимов. Забил — режим выбран;
      мяч толкают телом, выпадом и брошенными предметами, все игроки участвуют вместе. Гол в другие ворота меняет режим.
   2) Табло над воротами: правила режима, затем рулетка карты 3×3, затем отсчёт.
   3) Гигантская рогатка: по отсчёту все участники сами запрыгивают в кармашек, резинка оттягивается, залп —
      все летят кучей высоко за дома, переход в загрузку. Встать на площадку у рогатки — «готов», отсчёт короче. */

const hex = c => '#' + c.toString(16).padStart(6, '0');
const PX = '"Press Start 2P", monospace', TX = 'Rubik, Arial, sans-serif';
// текст, который всегда влезает: уменьшаем кегль, пока строка не помещается
function fit(g, text, maxW, size, font, weight = '') { let s = size; do { g.font = `${weight} ${s}px ${font}`; if (g.measureText(text).width <= maxW) break; s -= 1; } while (s > 6); return s; }
const redraws = []; if (document.fonts) document.fonts.ready.then(() => redraws.forEach(f => f()));
// холст, который перерисовывается, когда догрузятся шрифты
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  const run = () => { const g = c.getContext('2d'); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false; draw(g, w, h); t.needsUpdate = true; }; run(); redraws.push(run); return { t, run, c }; }

// вывеска: плашка с пиксельным текстом (подгоняется по ширине, не обрезается)
export function signTex(text, bg = '#1b1524', fg = '#f4ecdc', w = 256, h = 64, stripe = null) {
  return canvasTex(w, h, (g, W2, H2) => { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, W2, 3); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, H2 - 4, W2, 4);
    if (stripe) { g.fillStyle = stripe; g.fillRect(0, 0, 8, H2); g.fillRect(W2 - 8, 0, 8, H2); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, text, W2 - 28, Math.floor(H2 * .42), PX); g.fillText(text, W2 / 2, H2 / 2 + 1); }).t;
}
/* ---------- арена и мяч ---------- */
export const ARENA = { x0: -7, x1: 7, z0: -10, z1: 2, goals: [-4.6, 0, 4.6], gw: 3.2, gh: 2.1, gd: 1.4 };
export function buildVoteArena(b, modes) {
  const A = ARENA, group = new THREE.Group(); W.group.add(group); W.keep.push(group);
  const cx = (A.x0 + A.x1) / 2, cz = (A.z0 + A.z1) / 2, w = A.x1 - A.x0, d = A.z1 - A.z0;
  // поле: трава с разметкой, бортики из досок (низкие — игрок перешагивает, мяч отскакивает)
  b.ground(A.x0, A.z0, A.x1, A.z1, T.grass(), 2, .02);
  const line = col(0xe8e4d8);
  for (const [x, z, sx, sz] of [[cx, A.z0 + .05, w, .1], [cx, A.z1 - .05, w, .1], [A.x0 + .05, cz, .1, d], [A.x1 - .05, cz, .1, d], [cx, cz + 1, w, .1]]) b.marking(x, z, sx, sz, 0xe8e4d8);
  { const r = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.02, 40), lam({ color: 0xe8e4d8, polygonOffset: true, polygonOffsetFactor: -3 }, 'arena55-ring')); r.rotation.x = -Math.PI / 2; r.position.set(cx, .04, cz + 1); group.add(r); }
  const board = tmat(T.wood()), H = .34;
  const wall = (x, z, sx, sz) => { b.box(x, z, sx, sz, H, board); b.box(x, z, sx + .04, sz + .04, .05, col(0xe8e4d8), { y: H, solid: false }); };
  wall(A.x0 - .1, cz, .2, d); wall(A.x1 + .1, cz, .2, d);
  for (const [a0, a1] of [[A.x0 - .2, cx - 1.8], [cx + 1.8, A.x1 + .2]]) wall((a0 + a1) / 2, A.z1 + .1, a1 - a0, .2); // юг: проход 3.6 м посередине
  // север: доски между воротами
  const edges = [A.x0 - .2, ...A.goals.flatMap(g => [g - A.gw / 2 - .1, g + A.gw / 2 + .1]), A.x1 + .2];
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1] - edges[i] > .05) wall((edges[i] + edges[i + 1]) / 2, A.z0 - .1, edges[i + 1] - edges[i], .2);
  // ворота: белые штанги, перекладина, сетка; над ними табличка режима
  const post = col(0xf1ede4), netM = lam({ map: T.chainlink(), transparent: true, alphaTest: .4, side: THREE.DoubleSide }, 'arena55-net');
  const goals = A.goals.map((gx, i) => {
    const m = modes[i], z = A.z0;
    group.add(compose('arena55-goal', a => {
      for (const s of [-1, 1]) { a(G.cyl8, post, s * A.gw / 2, A.gh / 2, 0, .08, A.gh, .08); a(G.cyl8, post, s * A.gw / 2, A.gh / 2, -A.gd, .05, A.gh, .05); a(G.cyl8, post, s * A.gw / 2, A.gh, -A.gd / 2, .05, A.gd, .05, Math.PI / 2, 0, 0); }
      a(G.cyl8, post, 0, A.gh, 0, .08, A.gw, .08, 0, 0, Math.PI / 2); a(G.cyl8, post, 0, A.gh, -A.gd, .05, A.gw, .05, 0, 0, Math.PI / 2);
    }).translateX(gx).translateZ(z));
    const net = new THREE.Group(); net.position.set(gx, 0, z); group.add(net);
    for (const [px, pz, sx, ry] of [[0, -A.gd, A.gw, 0], [-A.gw / 2, -A.gd / 2, A.gd, Math.PI / 2], [A.gw / 2, -A.gd / 2, A.gd, Math.PI / 2]]) { const q = mesh(G.plane, netM, px, A.gh / 2, pz, sx, A.gh, 1, net); q.rotation.y = ry; }
    { const q = mesh(G.plane, netM, 0, A.gh, -A.gd / 2, A.gw, A.gd, 1, net); q.rotation.x = Math.PI / 2; }
    addSolid(gx - A.gw / 2 - .1, z - A.gd - .1, gx + A.gw / 2 + .1, z - A.gd + .05, 0, A.gh);
    for (const s of [-1, 1]) addSolid(gx + s * A.gw / 2 - .08, z - A.gd, gx + s * A.gw / 2 + .08, z + .08, 0, A.gh);
    // табличка: тёмная плашка, цветная полоса режима, пиксельный шрифт
    const sign = canvasTex(256, 64, (g, W2, H2) => { g.fillStyle = '#1b1524'; g.fillRect(0, 0, W2, H2); g.fillStyle = hex(m.color); g.fillRect(0, 0, W2, 6); g.fillRect(0, H2 - 6, W2, 6);
      g.fillStyle = '#f4ecdc'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, m.name.toUpperCase(), W2 - 20, 18, PX); g.fillText(m.name.toUpperCase(), W2 / 2, H2 / 2 + 1); });
    const sm = new THREE.Mesh(G.box, [col(0x1b1524), col(0x1b1524), col(0x1b1524), col(0x1b1524), lam({ map: sign.t, emissive: 0xffffff, emissiveMap: sign.t, emissiveIntensity: .55 }, 'arena55-sign' + i), col(0x1b1524)]);
    sm.position.set(gx, A.gh + .55, z - .05); sm.scale.set(A.gw * .92, .74, .1); sm.userData.noBatch = true; group.add(sm);
    for (const s of [-1, 1]) mesh(G.box, post, gx + s * 1.1, A.gh + .1, z - .05, .05, .2, .05, group);
    (W.lightSources ??= []).push({ x: gx, y: 2.4, z: z + 1.2, color: m.color, strength: 1.4, range: 4 });
    return { m, i, x: gx, z, net, sm };
  });
  // мяч: на Хэллоуин — тыква-мяч, иначе обычный футбольный; декор меняется, мяч — нет
  const ball = addPushable(b, 'voteBall', cx, cz + 1, 0);
  const skin = new THREE.Mesh(new THREE.SphereGeometry(.95, 14, 10), lam({ map: HW ? ballPumpkin() : ballSoccer() }, 'arena55-ball'));
  skin.position.y = .95; skin.castShadow = true; ball.mesh.add(jellify(skin, .35)); ball.mesh.userData.noBatch = true;
  if (HW) { const stem = mesh(G.cyl6, col(0x4a6a2a), 0, 1.0, 0, .08, .3, .08, skin); stem.position.set(0, .98 / .95, 0); }
  let picked = -1, resetT = 0, flashT = 0;
  const api = {
    group, goals, ball, get picked() { return picked >= 0 ? modes[picked] : null; }, onGoal: null,
    reset() { picked = -1; resetT = 0; ball.x = cx; ball.z = cz + 1; ball.vx = ball.vz = 0; },
    update(dt, t) {
      // мяч катится: поворачиваем шар по ходу
      const sp = Math.hypot(ball.vx, ball.vz);
      if (sp > .01) { const ax = new V3(ball.vz, 0, -ball.vx).normalize(); skin.rotateOnWorldAxis(ax, sp * dt / .95); }
      if (resetT > 0) { resetT -= dt; if (resetT <= 0) { ball.x = cx; ball.z = cz + 1; ball.vx = ball.vz = 0; skin.position.y = 4; sfx('spring'); } }
      if (skin.position.y > .95) skin.position.y = Math.max(.95, skin.position.y - dt * 8);
      // гол: мяч целиком пересёк линию в створе ворот
      if (resetT <= 0) for (const g of goals) if (ball.z < A.z0 - .3 && Math.abs(ball.x - g.x) < A.gw / 2 - .2) {
        picked = g.i; resetT = 1.6; flashT = 1.2; sfx('goal'); shake(.25);
        const p = { x: g.x, y: 1.2, z: A.z0 - .6 }; impactBurst(p, g.m.color, 1.6); sparks(p, 30, g.m.color); sparks(p, 20, 0xffffff);
        api.onGoal?.(g.m); break;
      }
      flashT = Math.max(0, flashT - dt);
      for (const g of goals) { const on = g.i === picked; g.sm.material[4].emissiveIntensity = on ? .9 + Math.sin(t * 8) * .15 * (flashT > 0 ? 1 : .3) : .45;
        g.net.position.z = g.z - (on && flashT > 0 ? Math.sin(flashT * 30) * .08 * flashT : 0); }
    },
  };
  return api;
}
function ballSoccer() { return pix('ball55-soccer', 64, 32, (g, w, h) => { g.fillStyle = '#efe9dc'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1e1a24'; for (const [x, y] of [[8, 8], [24, 20], [40, 8], [56, 20], [16, 26], [48, 26], [32, 4]]) { g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 - 1.57; g.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 4); } g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h - 6, w, 6); }); }
function ballPumpkin() { return pix('ball55-pumpkin', 64, 32, (g, w, h) => { for (let x = 0; x < w; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, '#b8501a'); gr.addColorStop(.5, '#f08a2a'); gr.addColorStop(1, '#b8501a'); g.fillStyle = gr; g.fillRect(x, 0, 8, h); }
  g.fillStyle = '#2a1206'; g.beginPath(); g.moveTo(10, 12); g.lineTo(16, 8); g.lineTo(18, 14); g.fill(); g.beginPath(); g.moveTo(26, 12); g.lineTo(20, 8); g.lineTo(18, 14); g.fill();
  g.beginPath(); g.moveTo(8, 18); for (let i = 0; i <= 6; i++) g.lineTo(8 + i * 3.4, 18 + (i % 2 ? 4 : 0)); g.lineTo(28, 22); g.lineTo(8, 22); g.fill(); }); }

// случайная карта: 9 разных районов; порт — только в южном ряду (как в генераторе)
export function randomMap(n = CONFIG.grid) {
  const ids = DISTRICTS.map(d => d.id).sort(() => Math.random() - .5).slice(0, n * n), pi = ids.indexOf('port');
  if (pi >= 0) { const row = [...Array(n)].map((_, gx) => gx * n + n - 1); if (!row.includes(pi)) { const to = row[(Math.random() * n) | 0]; [ids[pi], ids[to]] = [ids[to], ids[pi]]; } }
  return ids;
}
/* ---------- табло ---------- */
export function buildScreen(b, x, y, z, modes) {
  const group = new THREE.Group(); W.group.add(group); W.keep.push(group);
  const SW = 9.6, SH = 5.4, steel = tmat(T.metal()), dark = col(0x17141c);
  group.add(compose('screen55-frame', a => {
    for (const s of [-1, 1]) { a(G.box, steel, x + s * (SW / 2 + .5), y / 2 + .2, z, .32, y + .4, .32); a(G.box, dark, x + s * (SW / 2 + .5), .3, z, .7, .6, .7);
      for (let k = 0; k < 6; k++) a(G.box, steel, x + s * (SW / 2 + .5), .9 + k * (y - .6) / 6, z + .17, .5, .05, .04, 0, 0, s * .6); }
    a(G.box, dark, x, y, z - .05, SW + .7, SH + .7, .45); a(G.box, steel, x, y + SH / 2 + .45, z, SW + 1.4, .2, .5); a(G.box, steel, x, y - SH / 2 - .45, z, SW + 1.4, .2, .5);
  }));
  for (const s of [-1, 1]) addSolid(x + s * (SW / 2 + .5) - .2, z - .2, x + s * (SW / 2 + .5) + .2, z + .2, 0, y + .3);
  const S = canvasTex(320, 180, () => {}), g = S.c.getContext('2d');
  const scr = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: S.t, fog: false })); scr.position.set(x, y, z + .19); scr.scale.set(SW, SH, 1); scr.userData.noBatch = true; scr.userData.noLight = true; group.add(scr);
  (W.lightSources ??= []).push({ x, y: y - 1, z: z + 2.5, color: 0x9ab8ff, strength: 2.4, range: 9 });
  const st = { kind: 'idle', mode: null, ids: null, reel: null, count: 0, t: 0, dirty: true, n: CONFIG.grid };
  const bg = () => { g.fillStyle = '#0d0b16'; g.fillRect(0, 0, 320, 180); g.fillStyle = 'rgba(255,255,255,.04)'; for (let yy = 0; yy < 180; yy += 2) g.fillRect(0, yy, 320, 1); };
  const center = (text, y0, size, color, font = PX, maxW = 300) => { g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, text, maxW, size, font, font === TX ? 700 : ''); g.fillText(text, 160, y0); };
  function draw() {
    bg();
    if (st.kind === 'idle') {
      center('ВЫБЕРИ РЕЖИМ', 18, 12, '#f4ecdc');
      modes.forEach((m, i) => { const x0 = 8 + i * 104, w = 96; g.fillStyle = hex(m.color); g.fillRect(x0, 34, w, 4); g.fillStyle = '#1c1830'; g.fillRect(x0, 38, w, 110);
        g.fillStyle = '#f4ecdc'; g.textAlign = 'center'; g.textBaseline = 'top'; fit(g, m.name.toUpperCase(), w - 8, 8, PX); g.fillText(m.name.toUpperCase(), x0 + w / 2, 46);
        g.fillStyle = '#c8bedc'; m.short.forEach((l, k) => { fit(g, l, w - 8, 11, TX, 500); g.fillText(l, x0 + w / 2, 66 + k * 18); }); });
      center('ЗАБЕЙ МЯЧ В ВОРОТА', 164, 9, '#ffd27a');
    } else if (st.kind === 'mode') {
      const m = st.mode; g.fillStyle = hex(m.color); g.fillRect(0, 0, 320, 6); center('РЕЖИМ', 24, 9, '#c8bedc'); center(m.name.toUpperCase(), 50, 18, '#ffffff');
      m.lines.forEach((l, k) => center(l, 86 + k * 20, 13, '#e6deef', TX)); center(m.tag, 162, 10, hex(m.color), TX);
    } else if (st.kind === 'map' || st.kind === 'count') {
      center(st.kind === 'count' ? 'К РОГАТКЕ!' : 'КАРТА ГОРОДА', 12, 9, '#ffd27a');
      const n = st.n, cw = st.kind === 'count' ? 62 : 96, chh = st.kind === 'count' ? 44 : 50, ox = st.kind === 'count' ? 12 : 16, oy = 26;
      for (let gz = 0; gz < n; gz++) for (let gx = 0; gx < n; gx++) { const r = st.reel[gx * n + gz], d = DISTRICTS[((Math.floor(r.pos) % DISTRICTS.length) + DISTRICTS.length) % DISTRICTS.length];
        const x0 = ox + gx * (cw + 4), y0 = oy + gz * (chh + 4), hue = (DISTRICTS.indexOf(d) * 47) % 360;
        g.fillStyle = r.stopped ? `hsl(${hue},55%,34%)` : '#24203a'; g.fillRect(x0, y0, cw, chh); g.fillStyle = r.stopped ? `hsl(${hue},70%,62%)` : '#3a3458'; g.fillRect(x0, y0, cw, 3);
        g.fillStyle = r.stopped ? '#ffffff' : '#a59cc0'; g.textAlign = 'center'; g.textBaseline = 'middle'; const words = d.name.split(' ');
        if (words.length > 1 && fit(g, d.name, cw - 6, 11, TX, 700) < 9) { const h2 = Math.ceil(words.length / 2), a = words.slice(0, h2).join(' '), c = words.slice(h2).join(' '); fit(g, a.length > c.length ? a : c, cw - 6, 11, TX, 700); g.fillText(a, x0 + cw / 2, y0 + chh / 2 - 6); g.fillText(c, x0 + cw / 2, y0 + chh / 2 + 7); }
        else { fit(g, d.name, cw - 6, 11, TX, 700); g.fillText(d.name, x0 + cw / 2, y0 + chh / 2 + 1); } }
      if (st.kind === 'count') { g.fillStyle = '#1c1830'; g.fillRect(222, 26, 90, 140); center2(String(Math.max(0, Math.ceil(st.count))), 267, 80, 40, '#ffffff'); center2('ВСТАНЬ', 267, 128, 8, '#c8bedc'); center2('НА ПЛОЩАДКУ', 267, 142, 7, '#c8bedc'); }
    } else if (st.kind === 'go') { center('ПОЕХАЛИ!', 90, 22, '#ffd27a'); }
    S.t.needsUpdate = true; st.dirty = false;
  }
  function center2(text, cx2, y0, size, color) { g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, text, 84, size, PX); g.fillText(text, cx2, y0); }
  redraws.push(() => { st.dirty = true; });
  let acc = 0;
  return {
    group, st,
    idle() { st.kind = 'idle'; st.dirty = true; },
    showMode(m) { st.kind = 'mode'; st.mode = m; st.t = 0; st.dirty = true; },
    spinMap(ids) { st.kind = 'map'; st.ids = ids; st.t = 0; st.reel = ids.map((id, k) => { const idx = DISTRICTS.findIndex(d => d.id === id), from = Math.random() * DISTRICTS.length, to = Math.ceil(from) + DISTRICTS.length * 3 + ((idx - Math.ceil(from)) % DISTRICTS.length + DISTRICTS.length) % DISTRICTS.length; return { from, to, pos: from, dur: 1.6 + k * .22, stopped: false }; }); st.dirty = true; },
    get mapDone() { return st.reel && st.reel.every(r => r.stopped); },
    countdown(s) { if (st.kind !== 'count' || Math.ceil(s) !== Math.ceil(st.count)) st.dirty = true; st.kind = 'count'; st.count = s; },
    go() { st.kind = 'go'; st.dirty = true; },
    update(dt) {
      st.t += dt;
      if (st.kind === 'map' && st.reel) { let tick = false; for (const r of st.reel) { if (r.stopped) continue; const k = Math.min(1, st.t / r.dur), e = 1 - Math.pow(1 - k, 3), prev = Math.floor(r.pos); r.pos = r.from + (r.to - r.from) * e; if (Math.floor(r.pos) !== prev) tick = true; if (k >= 1) { r.stopped = true; sfx('pickup'); } }
        if (tick) sfx('tick'); acc += dt; if (acc > 1 / 15) { acc = 0; st.dirty = true; } }
      if (st.dirty) draw();
    },
  };
}

/* ---------- гигантская рогатка ---------- */
export function buildSlingshot(b, x, z) {
  const group = new THREE.Group(); W.group.add(group); W.keep.push(group);
  const wood = tmat(T.bark()), band = lam({ color: 0x7a2a2a }, 'sling55-band'), leather = lam({ color: 0x5a3a26, side: THREE.DoubleSide }, 'sling55-leather'), steel = tmat(T.metal()), conc = tmat(T.concrete());
  // рогатка-«Y»: толстый ствол на бетонной тумбе, два рога, обмотка верёвкой, железные наконечники
  const ARM = .5, FORK = 3.3, LEN = 3.8, TIPX = Math.sin(ARM) * LEN, TIPY = FORK + Math.cos(ARM) * LEN, rope = lam({ color: 0x3a2a1e }, 'sling55-rope');
  // площадка «готовности» перед рогаткой
  b.ground(x - 4, z + 1.2, x + 4, z + 7.2, T.concrete(), 2, .03);
  for (const [mx, mz, sx, sz] of [[x, z + 1.25, 8, .12], [x, z + 7.15, 8, .12], [x - 3.95, z + 4.2, .12, 6], [x + 3.95, z + 4.2, .12, 6]]) b.marking(mx, mz, sx, sz, 0xf5c542);
  group.add(compose('sling55-frame', a => {
    a(G.box, conc, x, .3, z, 3, .6, 3); a(G.box, conc, x, .66, z, 2.4, .12, 2.4);
    a(G.cyl8, wood, x, 2.0, z, .6, 2.8, .6); a(G.sph10, wood, x, FORK + .1, z, .72, .6, .72);
    for (const yy of [1.2, 2.6]) a(G.cyl8, rope, x, yy, z, .64, .22, .64);
    for (const s of [-1, 1]) {
      a(G.cyl8, wood, x + s * Math.sin(ARM) * LEN / 2, FORK + Math.cos(ARM) * LEN / 2, z, .42, LEN, .42, 0, 0, -s * ARM);
      for (const k of [.35, .7]) a(G.cyl8, rope, x + s * Math.sin(ARM) * LEN * k, FORK + Math.cos(ARM) * LEN * k, z, .46, .2, .46, 0, 0, -s * ARM);
      a(G.cyl8, steel, x + s * TIPX, TIPY, z, .48, .5, .48, 0, 0, -s * ARM); a(G.sph10, steel, x + s * (TIPX + Math.sin(ARM) * .3), TIPY + Math.cos(ARM) * .3, z, .36, .3, .36);
    }
  }));
  addSolid(x - 1.5, z - 1.5, x + 1.5, z + 1.5, 0, .72); addSolid(x - .6, z - .6, x + .6, z + .6, 0, FORK);
  // кармашек и две резинки (обновляются каждый кадр)
  const pocket = new THREE.Group(); group.add(pocket);
  // кармашек — кожаная «ванночка» (половина трубы, открыта вверх), по краям железные кольца для резинок
  pocket.add(compose('sling55-pocket', a => { const sh = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true, Math.PI, Math.PI); a(sh, leather, 0, 0, 0, .95, 3.0, .95, 0, 0, Math.PI / 2); for (const s of [-1, 1]) a(G.cyl8, steel, s * 1.55, 0, 0, .14, .3, .14, 0, 0, Math.PI / 2); }));
  const bands = [-1, 1].map(s => { const m = new THREE.Mesh(G.cyl8, band); m.userData.noBatch = true; group.add(m); return { m, s }; });
  const REST = new V3(x, TIPY - 1.1, z + .4), seats = [[0, 0], [-.8, .3], [.8, .3], [-.8, -.35], [.8, -.35], [0, .55], [0, -.55], [1.2, 0]];
  const st = { phase: 'idle', t: 0, riders: [], pull: 0, out: 0 };
  const tmp = new V3();
  function placeBands() {
    pocket.position.set(REST.x, REST.y - st.pull * .4 + st.out * 1.5, REST.z + st.pull * 5.2 - st.out * 2.2); pocket.rotation.x = -st.pull * .25;
    pocket.updateMatrixWorld(true);
    for (const { m, s } of bands) { const a = new V3(x + s * TIPX, TIPY, z), p2 = pocket.localToWorld(tmp.set(s * 1.55, 0, 0)).clone();
      m.position.copy(a).add(p2).multiplyScalar(.5); const len = a.distanceTo(p2); m.scale.set(.12 + st.pull * -.03, len, .12 + st.pull * -.03); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), p2.clone().sub(a).normalize()); }
  }
  placeBands();
  return {
    st, pocket, seats, pad: { x0: x - 4, x1: x + 4, z0: z + 1.2, z1: z + 7.2 }, rest: REST,
    onPad(p) { return p.x > x - 4 && p.x < x + 4 && p.z > z + 1.2 && p.z < z + 7.2 && Math.abs(p.y) < 1; },
    seatPos(i, out = new V3()) { pocket.updateMatrixWorld(true); const s = seats[i % seats.length]; return pocket.localToWorld(out.set(s[0], -.8, s[1])); },
    // сценка: board (запрыгивают) → pull (натяжение) → fire (выстрел) → fly
    start(riders) { st.riders = riders.slice(); st.phase = 'board'; st.t = 0; },
    reset() { st.phase = 'idle'; st.t = 0; st.riders = []; st.pull = 0; st.out = 0; placeBands(); },
    update(dt, t) {
      st.t += dt;
      if (st.phase === 'idle') { st.pull += (Math.sin(t * 1.5) * .02 - st.pull) * Math.min(1, dt * 4); }
      else if (st.phase === 'board') { if (st.t > .9 + st.riders.length * .2) { st.phase = 'pull'; st.t = 0; sfx('squeak'); } }
      else if (st.phase === 'pull') { st.pull = Math.min(1, st.pull + dt / 1.3); if (Math.random() < dt * 6) sfx('squeak', { v: .3 }); if (st.t > 1.6) { st.phase = 'fire'; st.t = 0; sfx('spring'); sfx('dash', { v: 1.4 }); shake(.5); } }
      else if (st.phase === 'fire') { const k = Math.min(1, st.t / .16); st.pull = 1 - k; st.out = Math.sin(k * Math.PI) * .9; if (k >= 1) { st.phase = 'fly'; st.t = 0; st.pull = 0; st.out = 0; sparks({ x: REST.x, y: REST.y + 1, z: REST.z }, 30, 0xffd27a); } }
      else if (st.phase === 'fly') { st.pull = Math.sin(st.t * 18) * .12 * Math.max(0, 1 - st.t * 1.5); }
      placeBands();
    },
  };
}
