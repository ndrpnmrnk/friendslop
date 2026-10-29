import { random } from '../core/random.js';
import { THREE, G, V3, mesh, col, tmat, lam, glow, compose, jellify } from '../core/gfx.js';
import { T, pix } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { addPushable } from '../world/pushables.js';
import { DISTRICTS } from '../world/districts/index.js';
import { districtIcon } from './district-icons.js';
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
  let picked = -1, inside = -1, flashT = 0;
  const api = {
    group, goals, ball, get picked() { return picked >= 0 ? modes[picked] : null; }, onGoal: null,
    follow: false,
    // v0.61: хост сообщил гол в ворота i — показываем то же самое
    force(i) { const g = goals[i]; if (!g) return; inside = i; picked = i; flashT = 1.2; sfx('goal'); shake(.25); const p = { x: g.x, y: 1.2, z: A.z0 - .6 }; impactBurst(p, g.m.color, 1.6); sparks(p, 30, g.m.color); api.onGoal?.(g.m); },
    reset() { picked = -1; inside = -1; ball.x = cx; ball.z = cz + 1; ball.vx = ball.vz = 0; },
    update(dt, t) {
      // мяч катится: поворачиваем шар по ходу
      const sp = Math.hypot(ball.vx, ball.vz);
      if (sp > .01) { const ax = new V3(ball.vz, 0, -ball.vx).normalize(); skin.rotateOnWorldAxis(ax, sp * dt / .95); }
      if (skin.position.y > .95) skin.position.y = Math.max(.95, skin.position.y - dt * 8);
      // гол: мяч целиком пересёк линию в створе ворот. v0.60: мяч остаётся в воротах — видно, что выбрано;
      // выбить его обратно и забить в другие ворота можно в любой момент
      let inG = -1; for (const g of goals) if (ball.z < A.z0 - .3 && Math.abs(ball.x - g.x) < A.gw / 2 - .2) inG = g.i;
      if (api.follow) inG = inside; // v0.61: у гостя сетевого лобби гол засчитывает только хост
      if (inG !== inside) { inside = inG; const g = goals[inG]; if (g) {
        picked = g.i; flashT = 1.2; sfx('goal'); shake(.25); ball.vx *= .2; ball.vz *= .2;
        const p = { x: g.x, y: 1.2, z: A.z0 - .6 }; impactBurst(p, g.m.color, 1.6); sparks(p, 30, g.m.color); sparks(p, 20, 0xffffff);
        api.onGoal?.(g.m); } }
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

// v0.56: тематики карты — сначала рулетка выбирает тему (три обязательных района), остальные районы случайные
export const THEMES = [
  { name: 'Набережная', ids: ['port', 'park', 'market'], c: '#4fc3ff' },
  { name: 'Тёмная сторона', ids: ['cemetery', 'hospital', 'sewer'], c: '#9be36b' },
  { name: 'Центр', ids: ['office', 'plaza', 'foodcourt'], c: '#ff6aa8' },
  { name: 'Учёба и труд', ids: ['school', 'university', 'factory'], c: '#ffd04a' },
  { name: 'Окраина', ids: ['construction', 'gas', 'skatepark'], c: '#ff8a3d' },
  { name: 'Вечерний город', ids: ['cinema', 'shops', 'townhall'], c: '#c08bff' },
  { name: 'Старые дворы', ids: ['yard', 'cemetery', 'market'], c: '#ffb06a' },
];
export const pickTheme = () => THEMES[(random() * THEMES.length) | 0];
// карта: 9 разных районов (районы темы обязательно); порт — только в южном ряду (как в генераторе)
export function randomMap(theme = null, n = CONFIG.grid) {
  const must = theme ? theme.ids.filter(id => DISTRICTS.some(d => d.id === id)) : [];
  const rest = DISTRICTS.map(d => d.id).filter(id => !must.includes(id)).sort(() => random() - .5);
  const ids = must.concat(rest).slice(0, n * n).sort(() => random() - .5), pi = ids.indexOf('port');
  if (pi >= 0) { const row = [...Array(n)].map((_, gx) => gx * n + n - 1); if (!row.includes(pi)) { const to = row[(random() * n) | 0]; [ids[pi], ids[to]] = [ids[to], ids[pi]]; } }
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
  // v0.56: табло в 2× разрешении (640×360), логические координаты остаются 320×180
  const S = canvasTex(640, 360, () => {}), g = S.c.getContext('2d'); S.t.magFilter = THREE.LinearFilter;
  const scr = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: S.t, fog: false })); scr.position.set(x, y, z + .19); scr.scale.set(SW, SH, 1); scr.userData.noBatch = true; scr.userData.noLight = true; group.add(scr);
  (W.lightSources ??= []).push({ x, y: y - 1, z: z + 2.5, color: 0x9ab8ff, strength: 2.4, range: 9 });
  const st = { kind: 'idle', mode: null, ids: null, reel: null, theme: null, treel: null, ready: 0, total: 1, wait: 0, t: 0, dirty: true, n: CONFIG.grid };
  const bg = () => { g.setTransform(2, 0, 0, 2, 0, 0); g.imageSmoothingEnabled = true; g.fillStyle = '#0d0b16'; g.fillRect(0, 0, 320, 180); g.fillStyle = 'rgba(255,255,255,.035)'; for (let yy = 0; yy < 180; yy += 2) g.fillRect(0, yy, 320, .6); };
  const center = (text, y0, size, color, font = PX, maxW = 300, cx = 160) => { g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, text, maxW, size, font, font === TX ? 700 : ''); g.fillText(text, cx, y0); };
  // ячейка района: картинка прокручивается как барабан, снизу — название
  function cell(r, x0, y0, cw, chh) {
    const L = DISTRICTS.length, p = r.pos, i0 = ((Math.floor(p) % L) + L) % L, fr = p - Math.floor(p);
    g.save(); g.beginPath(); g.rect(x0, y0, cw, chh); g.clip();
    for (const [k, off] of [[i0, -fr], [(i0 + 1) % L, 1 - fr]]) { const im = districtIcon(DISTRICTS[k].id); g.drawImage(im, x0, y0 + off * chh, cw, chh); }
    if (!r.stopped) { g.fillStyle = 'rgba(13,11,22,.35)'; g.fillRect(x0, y0, cw, chh); }
    const d = DISTRICTS[r.stopped ? i0 : ((Math.round(p) % L) + L) % L];
    g.fillStyle = 'rgba(10,8,18,.78)'; g.fillRect(x0, y0 + chh - 12, cw, 12); g.fillStyle = r.stopped ? '#ffffff' : '#a59cc0'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, d.name, cw - 4, 8, TX, 700); g.fillText(d.name, x0 + cw / 2, y0 + chh - 5.6);
    if (r.stopped && r.flash > 0) { g.fillStyle = `rgba(255,236,180,${r.flash * .5})`; g.fillRect(x0, y0, cw, chh); }
    g.restore(); g.strokeStyle = r.stopped ? (r.must ? st.theme.c : 'rgba(255,255,255,.35)') : '#3a3458'; g.lineWidth = r.must && r.stopped ? 1.6 : .8; g.strokeRect(x0 + .5, y0 + .5, cw - 1, chh - 1);
  }
  // рулетка тем: прямоугольная полоса сверху, названия едут влево и останавливаются на выбранной
  function themeBar(x0, y0, w, h) {
    g.fillStyle = '#17132a'; g.fillRect(x0, y0, w, h); const L = THEMES.length, p = st.treel.pos, slot = w / 2.2;
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    for (let k = -2; k <= 2; k++) { const idx = ((Math.floor(p) + k) % L + L) % L, th = THEMES[idx], cx = x0 + w / 2 + (k - (p - Math.floor(p))) * slot, on = st.treel.stopped && k === 0;
      g.fillStyle = on ? th.c : 'rgba(255,255,255,.06)'; g.fillRect(cx - slot / 2 + 2, y0 + 2, slot - 4, h - 4);
      g.fillStyle = on ? '#17111f' : '#c8bedc'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, th.name.toUpperCase(), slot - 12, 8, PX); g.fillText(th.name.toUpperCase(), cx, y0 + h / 2 + .5); }
    g.restore(); g.fillStyle = 'rgba(13,11,22,.85)'; g.fillRect(x0, y0, 10, h); g.fillRect(x0 + w - 10, y0, 10, h);
    g.fillStyle = '#ffd27a'; poly3(x0 + w / 2 - 4, y0, x0 + w / 2 + 4, y0, x0 + w / 2, y0 + 4); poly3(x0 + w / 2 - 4, y0 + h, x0 + w / 2 + 4, y0 + h, x0 + w / 2, y0 + h - 4);
  }
  function poly3(a, b2, c, d, e, f) { g.beginPath(); g.moveTo(a, b2); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.fill(); }
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
    } else if (st.kind === 'map' || st.kind === 'gather') {
      const gat = st.kind === 'gather', n = st.n, cw = gat ? 66 : 100, chh = gat ? 46 : 44, ox = 6, oy = gat ? 34 : 34;
      themeBar(ox, 6, gat ? 3 * cw + 8 : 308, 22);
      for (let gz = 0; gz < n; gz++) for (let gx = 0; gx < n; gx++) { const r = st.reel[gx * n + gz]; if (st.t < r.start) { g.fillStyle = '#17132a'; g.fillRect(ox + gx * (cw + 4), oy + gz * (chh + 4), cw, chh); continue; } cell(r, ox + gx * (cw + 4), oy + gz * (chh + 4), cw, chh); }
      if (gat) { const x0 = 218, all = st.ready >= st.total; g.fillStyle = all ? '#173a24' : '#1c1830'; g.fillRect(x0, 6, 96, 168);
        center('К РОГАТКЕ!', 20, 8, '#ffd27a', PX, 88, x0 + 48); center(`${st.ready}/${st.total}`, 66, 30, all ? '#7dffa0' : '#ffffff', PX, 88, x0 + 48);
        center(all ? 'ВСЕ В СБОРЕ' : 'ЗАЙДИ В ЗОНУ', 104, 8, all ? '#7dffa0' : '#c8bedc', PX, 88, x0 + 48); center('У РОГАТКИ', 118, 8, '#c8bedc', PX, 88, x0 + 48);
        if (!all) center(String(Math.max(0, Math.ceil(st.wait))) + ' с', 154, 10, '#8a82a8', PX, 88, x0 + 48); }
    } else if (st.kind === 'go') { center('ПОЕХАЛИ!', 90, 22, '#ffd27a'); }
    g.setTransform(1, 0, 0, 1, 0, 0); S.t.needsUpdate = true; st.dirty = false;
  }
  redraws.push(() => { st.dirty = true; });
  let acc = 0;
  return {
    group, st,
    idle() { st.kind = 'idle'; st.dirty = true; },
    showMode(m) { st.kind = 'mode'; st.mode = m; st.t = 0; st.dirty = true; },
    spinMap(ids, theme) { st.kind = 'map'; st.ids = ids; st.t = 0; st.theme = theme || THEMES[0];
      const ti = THEMES.indexOf(st.theme), tf = random() * THEMES.length; st.treel = { from: tf, to: Math.ceil(tf) + THEMES.length * 2 + ((ti - Math.ceil(tf)) % THEMES.length + THEMES.length) % THEMES.length, pos: tf, dur: 1.5, stopped: false };
      st.reel = ids.map((id, k) => { const idx = DISTRICTS.findIndex(d => d.id === id), from = random() * DISTRICTS.length, to = Math.ceil(from) + DISTRICTS.length * 3 + ((idx - Math.ceil(from)) % DISTRICTS.length + DISTRICTS.length) % DISTRICTS.length;
        return { from, to, pos: from, start: 1.8, dur: 1.5 + k * .2, stopped: false, flash: 0, must: st.theme.ids.includes(id) }; }); st.dirty = true; },
    get mapDone() { return st.reel && st.reel.every(r => r.stopped); },
    gather(ready, total, wait) { if (st.kind !== 'gather' || ready !== st.ready || Math.ceil(wait) !== Math.ceil(st.wait)) st.dirty = true; st.kind = 'gather'; st.ready = ready; st.total = total; st.wait = wait; },
    go() { st.kind = 'go'; st.dirty = true; },
    update(dt) {
      st.t += dt;
      if (st.kind === 'map' && st.reel) { let tick = false; const T0 = st.treel;
        if (!T0.stopped) { const k = Math.min(1, st.t / T0.dur), prev = Math.floor(T0.pos); T0.pos = T0.from + (T0.to - T0.from) * (1 - Math.pow(1 - k, 3)); if (Math.floor(T0.pos) !== prev) tick = true; if (k >= 1) { T0.stopped = true; sfx('pickup'); sfx('confetti'); } }
        for (const r of st.reel) { r.flash = Math.max(0, r.flash - dt * 2.5); if (r.stopped || st.t < r.start) continue; const k = Math.min(1, (st.t - r.start) / r.dur), e = 1 - Math.pow(1 - k, 3), prev = Math.floor(r.pos); r.pos = r.from + (r.to - r.from) * e; if (Math.floor(r.pos) !== prev) tick = true; if (k >= 1) { r.stopped = true; r.pos = r.to; r.flash = 1; sfx('pickup'); } }
        if (tick) sfx('tick'); acc += dt; if (acc > 1 / 20) { acc = 0; st.dirty = true; } }
      if (st.dirty) draw();
    },
  };
}

/* ---------- гигантская рогатка ---------- */
/* v0.59 — рогатка заново, понятная с первого взгляда:
   - каменная тумба, толстая деревянная рогулька «Y» (ствол и два рога, обмотки), на концах рогов завязаны резинки;
   - между резинками — кожаный кармашек-гамак (прогибается вниз, края загнуты), в него садятся все игроки;
   - сзади помост на ножках с двумя лестницами по бокам: по ним забегают наверх и прыгают с края в кармашек;
   - на помосте лебёдка: трос к кармашку, барабан крутится — кармашек оттягивается назад над помостом.
   Площадка сбора — на земле позади помоста. Стреляет на север, через край острова. */
export function buildSlingshot(b, x, z) {
  const group = new THREE.Group(); W.group.add(group); W.keep.push(group);
  const wood = tmat(T.bark()), band = lam({ color: 0xc8402a }, 'sling58-band'), leather = lam({ color: 0x7a4a2a, side: THREE.DoubleSide }, 'sling59-leather'), steel = tmat(T.metal()), conc = tmat(T.concrete()), plank = tmat(T.wood()), rope = lam({ color: 0x3a2a1e }, 'sling55-rope');
  const ARM = .62, FORK = 1.7, LEN = 3.0, TIPX = Math.sin(ARM) * LEN, TIPY = FORK + Math.cos(ARM) * LEN;
  const DY = 2.3, D0 = z + 1.5, D1 = z + 3.9, DX = 2.4, SW = 1.2, SZ = z + 2.7, NST = 8, RUN = 3.0; // помост и лестницы
  const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, r, 8, false);
  group.add(compose('sling59-frame', a => {
    a(G.box, conc, x, .3, z, 3, .6, 3); a(G.box, tmat(T.stone()), x, .68, z, 2.4, .16, 2.4);
    for (const [dx, dz] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]]) a(G.cyl8, steel, x + dx, .78, z + dz, .09, .06, .09);
    a(G.cyl8, steel, x, .9, z, .7, .14, .7);
    for (const s of [-1, 1]) a(tube([new V3(0, .8, 0), new V3(0, FORK - .2, 0), new V3(s * .5, FORK + .6, 0), new V3(s * TIPX, TIPY, 0)], .32), wood, x, 0, z, 1, 1, 1);
    a(G.sph10, wood, x, FORK, z, .62, .55, .62);
    for (const yy of [1.2, 1.55]) a(G.cyl8, rope, x, yy, z, .68, .14, .68);
    for (const s of [-1, 1]) { const tx = x + s * TIPX; a(G.cyl8, leather, tx - s * .06, TIPY - .35, z, .4, .5, .4, 0, 0, -s * ARM); a(G.sph10, wood, tx, TIPY + .04, z, .32, .22, .32); }
    // помост: настил из досок, рама, ножки, перила сзади и по краям у лестниц
    a(G.box, plank, x, DY - .06, (D0 + D1) / 2, DX * 2, .12, D1 - D0); a(G.box, steel, x, DY - .18, (D0 + D1) / 2, DX * 2 + .1, .12, D1 - D0 + .1);
    for (const sx of [-1, 1]) for (const zz of [D0 + .2, D1 - .2]) a(G.box, steel, x + sx * (DX - .2), (DY - .2) / 2, zz, .14, DY - .2, .14);
    a(G.box, steel, x, DY + .55, D1 - .05, DX * 2, .06, .06); for (let k = 0; k <= 6; k++) a(G.box, steel, x - DX + .05 + k * (DX * 2 - .1) / 6, DY + .28, D1 - .05, .05, .55, .05);
    // две лестницы по бокам помоста
    for (const s of [-1, 1]) for (let k = 0; k < NST; k++) { const tx = x + s * (DX + RUN * (k + .5) / NST), top = DY * (NST - k) / NST;
      a(G.box, plank, tx, top - .05, SZ, RUN / NST + .02, .1, SW); a(G.box, steel, tx, top / 2 - .05, SZ - SW / 2 + .05, .06, top - .05, .06); a(G.box, steel, tx, top / 2 - .05, SZ + SW / 2 - .05, .06, top - .05, .06); }
    // лебёдка на помосте: станина и стойки
    a(G.box, steel, x, DY + .1, D1 - .55, 1.4, .2, .6); for (const s of [-1, 1]) a(G.box, steel, x + s * .55, DY + .5, D1 - .55, .1, .7, .4);
  }));
  addSolid(x - 1.5, z - 1.5, x + 1.5, z + 1.5, 0, .72); addSolid(x - .6, z - .6, x + .6, z + .6, 0, FORK);
  addSolid(x - DX, D0, x + DX, D1, DY - .24, DY); addSolid(x - DX, D1 - .1, x + DX, D1, DY, DY + .6); addSolid(x - .7, D1 - .85, x + .7, D1 - .25, DY, DY + .9);
  for (const s of [-1, 1]) for (let k = 0; k < NST; k++) { const tx = x + s * (DX + RUN * (k + .5) / NST), top = DY * (NST - k) / NST; addSolid(tx - RUN / NST / 2, SZ - SW / 2, tx + RUN / NST / 2, SZ + SW / 2, top - .3, top); }
  const winch = new THREE.Group(); winch.position.set(x, DY + .7, D1 - .55); group.add(winch);
  winch.add(compose('sling59-drum', a => { a(G.cyl12, wood, 0, 0, 0, .28, .9, .28, 0, 0, Math.PI / 2); for (const s of [-1, 1]) a(G.cyl12, steel, s * .45, 0, 0, .36, .04, .36, 0, 0, Math.PI / 2); for (let i = 0; i < 6; i++) a(G.box, steel, -.5, Math.cos(i) * .32, Math.sin(i) * .32, .04, .07, .07, i, 0, 0); }));
  const crank = new THREE.Group(); crank.position.set(x + .62, DY + .7, D1 - .55); group.add(crank); crank.add(compose('sling58-crank', a => { a(G.box, steel, .05, -.22, 0, .05, .5, .06); a(G.cyl8, col(0xd8243a), .14, -.45, 0, .05, .2, .05, 0, 0, Math.PI / 2); }));
  const tow = new THREE.Mesh(G.cyl6, rope); tow.userData.noBatch = true; group.add(tow);
  // кармашек-гамак: сетка с прогибом посередине и загнутыми краями; на концах — кольца для резинок
  const pocket = new THREE.Group(); group.add(pocket);
  { const NU = 12, NV = 6, pos = [], idx = [];
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const u = i / NU * 2 - 1, v = j / NV * 2 - 1; pos.push(u * 1.55, -.45 * (1 - u * u) * (1 - .3 * v * v) + .16 * v * v, v * .62 * (1 - .5 * u * u)); }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, c = a + NV + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const pm = new THREE.Mesh(geo, leather); pm.userData.noBatch = true; pocket.add(pm);
    pocket.add(compose('sling59-pocketbits', a => { for (const s of [-1, 1]) a(new THREE.TorusGeometry(.16, .045, 5, 10), steel, s * 1.6, 0, 0, 1, 1, 1, 0, Math.PI / 2, 0);
      for (const v of [-1, 1]) for (let i = 1; i < 12; i++) { const u = i / 12 * 2 - 1; a(G.box, lam({ color: 0xd8b080 }, 'sling59-stitch'), u * 1.5, -.45 * (1 - u * u) * .7 + .16 + .01, v * .6 * (1 - .5 * u * u), .08, .015, .02); }
      a(G.box, steel, 0, -.3, .62, .3, .1, .1); })); }
  const bands = [-1, 1].flatMap(s => [-.08, .08].map(o => { const m = new THREE.Mesh(G.cyl8, band); m.userData.noBatch = true; group.add(m); return { m, s, o }; }));
  const REST = new V3(x, TIPY - .55, z + .3), seats = [[-.85, 0], [.85, 0], [-.3, -.15], [.3, -.15], [-.3, .2], [.3, .2], [-1.15, .05], [1.15, .05]];
  const st = { phase: 'idle', t: 0, riders: [], pull: 0, out: 0, bob: 0, bv: 0 };
  const tmp = new V3();
  function placeBands() {
    pocket.position.set(REST.x, REST.y - st.pull * .1 + st.out * 1.2 - st.bob, REST.z + st.pull * 2.4 - st.out * 2.2); pocket.rotation.x = -st.pull * .18;
    pocket.updateMatrixWorld(true);
    for (const { m, s, o } of bands) { const a = new V3(x + s * TIPX, TIPY - .12 + o, z), p2 = pocket.localToWorld(tmp.set(s * 1.6, o, 0)).clone();
      m.position.copy(a).add(p2).multiplyScalar(.5); const len = a.distanceTo(p2), th = .08 - st.pull * .025; m.scale.set(th, len, th); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), p2.clone().sub(a).normalize()); }
    { const a = new V3(x, DY + .7 + .28, D1 - .75), p2 = pocket.localToWorld(tmp.set(0, -.3, .65)).clone(), mid = a.clone().add(p2).multiplyScalar(.5); mid.y -= (1 - Math.min(1, st.pull * 3)) * .3;
      tow.position.copy(mid); tow.scale.set(.035, a.distanceTo(p2), .035); tow.quaternion.setFromUnitVectors(new V3(0, 1, 0), p2.clone().sub(a).normalize()); }
    winch.rotation.x = -st.pull * 9; crank.rotation.x = -st.pull * 9;
  }
  placeBands();
  const PZ0 = D1 + .5, PZ1 = D1 + 3.6;
  b.ground(x - 4, PZ0, x + 4, PZ1, T.concrete(), 2, .03);
  for (const [mx, mz, sx, sz] of [[x, PZ0 + .05, 8, .12], [x, PZ1 - .05, 8, .12], [x - 3.95, (PZ0 + PZ1) / 2, .12, PZ1 - PZ0], [x + 3.95, (PZ0 + PZ1) / 2, .12, PZ1 - PZ0]]) b.marking(mx, mz, sx, sz, 0xf5c542);
  const zoneTex = canvasTex(256, 192, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#ffd27a'; g.lineWidth = 8; g.setLineDash([22, 14]); g.strokeRect(8, 8, w - 16, h - 16); g.setLineDash([]);
    g.fillStyle = '#ffd27a'; for (const yy of [52, 96, 140]) { g.beginPath(); g.moveTo(w / 2 - 34, yy + 16); g.lineTo(w / 2, yy - 10); g.lineTo(w / 2 + 34, yy + 16); g.lineTo(w / 2 + 20, yy + 16); g.lineTo(w / 2, yy + 2); g.lineTo(w / 2 - 20, yy + 16); g.fill(); } });
  const zoneMat = new THREE.MeshBasicMaterial({ map: zoneTex.t, transparent: true, opacity: 0, depthWrite: false, color: 0xffd27a, fog: false });
  const zoneMesh = new THREE.Mesh(G.plane, zoneMat); zoneMesh.rotation.x = -Math.PI / 2; zoneMesh.position.set(x, .06, (PZ0 + PZ1) / 2); zoneMesh.scale.set(7.8, PZ1 - PZ0 - .2, 1); zoneMesh.renderOrder = 3; zoneMesh.userData.noBatch = true; zoneMesh.visible = false; group.add(zoneMesh);
  const zoneBeams = [-1, 1].flatMap(sx => [-1, 1].map(sz => { const m = new THREE.Mesh(G.cyl8, new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false, fog: false })); m.position.set(x + sx * 3.9, 1.6, (PZ0 + PZ1) / 2 + sz * (PZ1 - PZ0) / 2); m.scale.set(.12, 3.2, .12); m.userData.noBatch = true; m.visible = false; group.add(m); return m; }));
  return {
    st, pocket, seats,
    zone(on, t = 0, all = false) { zoneMesh.visible = on; for (const m of zoneBeams) m.visible = on; if (!on) return; const pulse = .55 + Math.sin(t * 5) * .25, c = all ? 0x7dffa0 : 0xffd27a;
      zoneMat.opacity = pulse; zoneMat.color.setHex(c); for (const m of zoneBeams) { m.material.opacity = pulse * .5; m.material.color.setHex(c); } },
    arm(riders) { st.riders = riders.slice(); st.phase = 'board'; st.t = 0; st.manual = true; },
    pull() { if (st.phase === 'board') { st.phase = 'pull'; st.t = 0; sfx('squeak'); } }, pad: { x0: x - 4, x1: x + 4, z0: PZ0, z1: PZ1 }, rest: REST,
    // точки сценария: помост, лестницы, центр сбора
    deck: { y: DY, z0: D0, z1: D1, x: DX, stairZ: SZ, run: RUN }, huddle: new V3(x, 0, (PZ0 + PZ1) / 2),
    bounce(k = 1) { st.bv -= 2.4 * k; },
    onPad(p) { return p.x > x - 4 && p.x < x + 4 && p.z > PZ0 && p.z < PZ1 && Math.abs(p.y) < 1; },
    seatPos(i, out = new V3()) { pocket.updateMatrixWorld(true); const s = seats[i % seats.length]; return pocket.localToWorld(out.set(s[0], -.42 * (1 - (s[0] / 1.55) ** 2) + .02, s[1])); },
    start(riders) { st.riders = riders.slice(); st.phase = 'board'; st.t = 0; },
    reset() { st.phase = 'idle'; st.t = 0; st.riders = []; st.pull = 0; st.out = 0; st.bob = 0; st.bv = 0; st.manual = false; zoneMesh.visible = false; for (const m of zoneBeams) m.visible = false; placeBands(); },
    update(dt, t) {
      st.t += dt;
      // кармашек пружинит, когда в него запрыгивают
      st.bv += -st.bob * 90 * dt; st.bv *= Math.exp(-dt * 5); st.bob += st.bv * dt;
      if (st.phase === 'idle') { st.pull += (Math.sin(t * 1.5) * .02 - st.pull) * Math.min(1, dt * 4); }
      else if (st.phase === 'board') { if (!st.manual && st.t > .9 + st.riders.length * .2) { st.phase = 'pull'; st.t = 0; sfx('squeak'); } }
      else if (st.phase === 'pull') { st.pull = Math.min(1, st.pull + dt / 2.2); if (random() < dt * 5) sfx('squeak', { v: .3 }); if (random() < dt * 9) sfx('tick', { v: .5 }); if (st.t > 2.9) { st.phase = 'fire'; st.t = 0; sfx('spring'); sfx('dash', { v: 1.4 }); sfx('birdcry'); shake(.5); } }
      else if (st.phase === 'fire') { const k = Math.min(1, st.t / .16); st.pull = 1 - k; st.out = Math.sin(k * Math.PI) * .9; if (k >= 1) { st.phase = 'fly'; st.t = 0; st.pull = 0; st.out = 0; sparks({ x: REST.x, y: REST.y + 1, z: REST.z }, 30, 0xffd27a); } }
      else if (st.phase === 'fly') { st.pull = Math.sin(st.t * 18) * .12 * Math.max(0, 1 - st.t * 1.5); }
      placeBands();
    },
  };
}
