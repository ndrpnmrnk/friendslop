import { THREE, G, mesh, col, tmat, lam, compose, glow } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addSolid, isFree } from './physics.js';
import { CONFIG } from '../config.js';

/* v0.51: крыши больше не пустые плиты. После генерации района каждая большая плоская крыша
   получает бортик-парапет и «крышный хлам»: кондиционеры, вентиляцию, люк, трубы, бак, слуховые окна.
   Всё стоит на крыше (с коллизией, на них можно запрыгнуть) и только там, где свободно. */
const rnd = (a, b) => a + Math.random() * (b - a);
function acUnit() { return compose('roof51-ac', a => {
  const m = tmat(T.paintMetal(0x9a9aa4)), d = col(0x2a2830), f = col(0x55525e);
  a(G.box, m, 0, 0.42, 0, 1.2, 0.68, 0.85); a(G.box, d, 0, 0.04, 0, 1.0, 0.08, 0.7);
  a(G.cyl12, d, 0.2, 0.77, 0, 0.3, 0.03, 0.3); a(G.cyl8, f, 0.2, 0.79, 0, 0.07, 0.03, 0.07);
  for (let i = 0; i < 4; i++) a(G.box, d, -0.38, 0.22 + i * 0.12, 0.43, 0.32, 0.03, 0.02);
  a(G.cyl6, f, -0.5, 0.35, -0.5, 0.04, 0.6, 0.04); }); }
function vent() { return compose('roof51-vent', a => { const m = tmat(T.paintMetal(0x7a7a84));
  a(G.cyl8, m, 0, 0.45, 0, 0.16, 0.9, 0.16); a(G.cone8, m, 0, 1.02, 0, 0.3, 0.22, 0.3); a(G.cyl8, col(0x26242c), 0, 0.9, 0, 0.17, 0.08, 0.17); }); }
function hatch() { return compose('roof51-hatch', a => { const m = tmat(T.paintMetal(0x5a6070));
  a(G.box, m, 0, 0.25, 0, 1.0, 0.5, 1.0); a(G.box, tmat(T.metal()), 0, 0.52, 0, 1.06, 0.06, 1.06); a(G.box, col(0x2a2830), 0.3, 0.56, 0.42, 0.18, 0.04, 0.06); }); }
function skylight() { return compose('roof51-sky', a => { const fr = col(0x3a3a44);
  a(G.box, fr, 0, 0.18, 0, 1.6, 0.36, 1.1); a(G.box, lam({ color: 0x6a7a96, emissive: 0x3a3020, emissiveIntensity: 0.4 }, 'roof51-glass'), 0, 0.38, 0, 1.45, 0.06, 0.95);
  for (const x of [-0.25, 0.25]) a(G.box, fr, x, 0.42, 0, 0.04, 0.04, 1.0); }); }
function tank() { return compose('roof51-tank', a => { const w = tmat(T.wood()), m = col(0x2a2830);
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) a(G.box, m, x, 0.6, z, 0.12, 1.2, 0.12);
  a(G.cyl12, w, 0, 1.9, 0, 1.0, 1.5, 1.0); a(G.cone8, tmat(T.roof()), 0, 2.85, 0, 1.08, 0.5, 1.08);
  for (const y of [1.4, 2.3]) a(G.cyl12, m, 0, y, 0, 1.03, 0.06, 1.03); }); }

export function dressRoofs() {
  const base = CONFIG.base, parapetMat = tmat(T.concrete()), capMat = col(0x4a4552);
  const parts = W.solids.filter(s => s.on && !s.tag && s.y1 > base + 3.2 && (s.x1 - s.x0) * (s.z1 - s.z0) >= 2);
  // соседние куски одной крыши (вокруг лестничной будки) объединяем в одну крышу
  const par = parts.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]));
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { const a = parts[i], b = parts[j];
    if (Math.abs(a.y1 - b.y1) < 0.03 && a.x0 <= b.x1 + 0.05 && b.x0 <= a.x1 + 0.05 && a.z0 <= b.z1 + 0.05 && b.z0 <= a.z1 + 0.05) par[find(i)] = find(j); }
  const groups = new Map(); parts.forEach((p, i) => { const k = find(i); let q = groups.get(k); if (!q) groups.set(k, q = { x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1, y1: p.y1, area: 0 }); q.x0 = Math.min(q.x0, p.x0); q.x1 = Math.max(q.x1, p.x1); q.z0 = Math.min(q.z0, p.z0); q.z1 = Math.max(q.z1, p.z1); q.area += (p.x1 - p.x0) * (p.z1 - p.z0); });
  const done = [];
  for (const s of groups.values()) {
    const w = s.x1 - s.x0, d = s.z1 - s.z0, y = s.y1;
    if (w < 4 || d < 4 || s.area < w * d * 0.7) continue;
    // крыша открыта сверху (над серединой нет перекрытия)
    // v0.55: «открыта» значит открыта до неба. Раньше проверялись только 2.2 м, и перекрытие между этажами
    // (над ним 4 м до потолка) считалось крышей — внутри мэрии и других зданий появлялись кондиционеры, люки и бортики.
    if (!isFree(s.x0 + w * 0.3, s.z0 + d * 0.3, s.x1 - w * 0.3, s.z1 - d * 0.3, y + 0.05, y + 60) && !isFree(s.x0 + 0.5, s.z0 + 0.5, s.x0 + 1.5, s.z0 + 1.5, y + 0.05, y + 60)) continue;
    done.push(s);
    const g = new THREE.Group(); g.name = 'roof-dress'; W.group.add(g);
    // парапет только визуальный и низкий — не мешает выходить на крышу и прыгать по крышам
    const t = 0.18, h = 0.32;
    for (const [x, z, sx, sz] of [[(s.x0 + s.x1) / 2, s.z0 + t / 2, w, t], [(s.x0 + s.x1) / 2, s.z1 - t / 2, w, t], [s.x0 + t / 2, (s.z0 + s.z1) / 2, t, d], [s.x1 - t / 2, (s.z0 + s.z1) / 2, t, d]]) {
      mesh(G.box, parapetMat, x, y + h / 2, z, sx, h, sz, g); mesh(G.box, capMat, x, y + h + 0.03, z, sx + 0.04, 0.06, sz + 0.04, g);
    }
    // хлам: число по площади, только на свободных местах
    const area = w * d, n = Math.min(7, Math.floor(area / 28) + 1);
    const kinds = [['ac', 1.3, 0.95, 0.85, acUnit], ['ac', 1.3, 0.95, 0.85, acUnit], ['vent', 0.4, 0.4, 1.1, vent], ['vent', 0.4, 0.4, 1.1, vent], ['hatch', 1.1, 1.1, 0.6, hatch], ['sky', 1.7, 1.2, 0.45, skylight]];
    if (area > 140 && Math.random() < 0.6) kinds.push(['tank', 2.2, 2.2, 3.1, tank]);
    for (let i = 0, tries = 0; i < n && tries < n * 8; tries++) {
      const [kind, fw, fd, fh, model] = kinds[(Math.random() * kinds.length) | 0];
      const rot = Math.random() < 0.5 ? 0 : Math.PI / 2, ex = rot ? fd : fw, ez = rot ? fw : fd;
      const x = rnd(s.x0 + 0.6 + ex / 2, s.x1 - 0.6 - ex / 2), z = rnd(s.z0 + 0.6 + ez / 2, s.z1 - 0.6 - ez / 2);
      if (!isFree(x - ex / 2 - 0.35, z - ez / 2 - 0.35, x + ex / 2 + 0.35, z + ez / 2 + 0.35, y + 0.02, y + 2.4)) continue;
      const o = model(); o.position.set(x, y, z); o.rotation.y = rot; g.add(o);
      if (kind !== 'sky') addSolid(x - ex / 2, z - ez / 2, x + ex / 2, z + ez / 2, y, y + fh); else addSolid(x - ex / 2, z - ez / 2, x + ex / 2, z + ez / 2, y, y + 0.45);
      i++;
    }
    // трубы вдоль края крыши
    if (Math.random() < 0.6) { const along = w > d, len = (along ? w : d) * rnd(0.4, 0.8), pm = tmat(T.paintMetal(0x6a6e78));
      const p = mesh(G.cyl6, pm, along ? (s.x0 + s.x1) / 2 : s.x0 + 0.45, y + 0.16, along ? s.z0 + 0.45 : (s.z0 + s.z1) / 2, 0.06, len, 0.06, g); p.rotation[along ? 'z' : 'x'] = Math.PI / 2; }
  }
  return done;
}

/* v0.52: многослойность — мостики между крышами соседних районов через дорогу.
   Ищем пары крыш разных районов, которые смотрят друг на друга через улицу (6–10 м), с близкой высотой.
   Мост — дощатый настил с перилами и гирляндой; физика ступеньками по 1 м (подъём ≤ 0.4 м на ступень). */
export function bridgeRoofs(roofs) {
  const dist = (x, z) => W.districts.find(d => x >= d.ox && x < d.x1 && z >= d.oz && z < d.z1)?.id;
  // только верхние крыши (перекрытия этажей под ними не считаем)
  roofs = roofs.filter(r => !roofs.some(q => q !== r && q.y1 > r.y1 + .5 && q.x0 < r.x1 - .5 && q.x1 > r.x0 + .5 && q.z0 < r.z1 - .5 && q.z1 > r.z0 + .5 && (q.x1 - q.x0) * (q.z1 - q.z0) > (r.x1 - r.x0) * (r.z1 - r.z0) * .5));
  const cand = [];
  for (const a of roofs) for (const b of roofs) {
    if (a === b) continue;
    const da = dist((a.x0 + a.x1) / 2, (a.z0 + a.z1) / 2), db = dist((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
    if ((!da && !db) || da === db || Math.abs(a.y1 - b.y1) > 3.2) continue;
    // по x: a слева, b справа
    const gx = b.x0 - a.x1, oz0 = Math.max(a.z0, b.z0), oz1 = Math.min(a.z1, b.z1);
    if (gx > 4 && gx < 13 && oz1 - oz0 > 1.8) cand.push({ ax: 'x', a, b, from: a.x1, to: b.x0, c: (oz0 + oz1) / 2, gap: gx });
    const gz = b.z0 - a.z1, ox0 = Math.max(a.x0, b.x0), ox1 = Math.min(a.x1, b.x1);
    if (gz > 4 && gz < 13 && ox1 - ox0 > 1.8) cand.push({ ax: 'z', a, b, from: a.z1, to: b.z0, c: (ox0 + ox1) / 2, gap: gz });
  }
  // сначала мосты между районами, к домам на краю карты — в последнюю очередь
  for (const k of cand) k.score = k.gap + (dist((k.a.x0 + k.a.x1) / 2, (k.a.z0 + k.a.z1) / 2) && dist((k.b.x0 + k.b.x1) / 2, (k.b.z0 + k.b.z1) / 2) ? 0 : 6);
  cand.sort((p, q) => p.score - q.score);
  const used = new Set(), made = [];
  const wood = tmat(T.wood()), iron = col(0x2b2533), dark = col(0x3a2418);
  for (const k of cand) {
    if (made.length >= 5 || used.has(k.a) || used.has(k.b)) continue;
    used.add(k.a); used.add(k.b);
    const len = k.to - k.from + .6, n = Math.ceil(len), y0 = k.a.y1, y1 = k.b.y1, g = new THREE.Group(); g.name = 'roof-bridge'; W.group.add(g);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, s0 = k.from - .3 + len * t0, s1 = k.from - .3 + len * t1, y = y0 + (y1 - y0) * (t0 + t1) / 2, mid = (s0 + s1) / 2;
      const X = k.ax === 'x' ? mid : k.c, Z = k.ax === 'x' ? k.c : mid, sx = k.ax === 'x' ? s1 - s0 + .02 : 1.5, sz = k.ax === 'x' ? 1.5 : s1 - s0 + .02;
      mesh(G.box, wood, X, y - .06, Z, sx, .12, sz, g); mesh(G.box, dark, X, y - .16, Z, k.ax === 'x' ? sx : .2, .1, k.ax === 'x' ? .2 : sz, g);
      addSolid(X - sx / 2, Z - sz / 2, X + sx / 2, Z + sz / 2, y - .14, y);
      // перила с двух сторон (твёрдые — не падаешь случайно, но перепрыгнуть можно)
      for (const sd of [-1, 1]) { const rx = k.ax === 'x' ? X : X + sd * .72, rz = k.ax === 'x' ? Z + sd * .72 : Z;
        mesh(G.box, iron, rx, y + .9, rz, k.ax === 'x' ? sx : .05, .05, k.ax === 'x' ? .05 : sz, g); if (i % 2 === 0) mesh(G.box, iron, rx, y + .45, rz, .05, .9, .05, g);
        addSolid(rx - (k.ax === 'x' ? sx / 2 : .04), rz - (k.ax === 'x' ? .04 : sz / 2), rx + (k.ax === 'x' ? sx / 2 : .04), rz + (k.ax === 'x' ? .04 : sz / 2), y, y + .95, 'fence'); }
    }
    // огоньки по перилам — видно издалека, что туда можно пройти (светят как источники мира)
    const cols = [0xff8a1f, 0xff5aa0, 0x7ad8ff];
    for (let i = 0, m = Math.floor(len / 1.4); i <= m; i++) { const t = i / m, sAt = k.from - .3 + len * t, y = y0 + (y1 - y0) * t + .98;
      for (const sd of [-1, 1]) { const X = k.ax === 'x' ? sAt : k.c + sd * .72, Z = k.ax === 'x' ? k.c + sd * .72 : sAt; mesh(G.box, glow(cols[(i + (sd > 0 ? 1 : 0)) % 3]), X, y, Z, .1, .1, .1, g); } }
    made.push({ ax: k.ax, from: k.from, to: k.to, c: k.c, y0, y1, x: k.ax === 'x' ? (k.from + k.to) / 2 : k.c, z: k.ax === 'x' ? k.c : (k.from + k.to) / 2, y: (y0 + y1) / 2 });
  }
  return made;
}

/* v0.53: на каждую плоскую крышу можно забраться — если рядом нет лестницы, ставим хромовую лестницу
   на свободной стене (у подножия пусто, не у двери). Крыши, мосты между ними и скайвеи — второй уровень города. */
export function roofAccess(roofs, Builder) {
  const base = CONFIG.base, b = new Builder(0, 0, base, 'Крыши'); let n = 0;
  const top = roofs.filter(r => !roofs.some(q => q !== r && q.y1 > r.y1 + .5 && q.x0 < r.x1 - .5 && q.x1 > r.x0 + .5 && q.z0 < r.z1 - .5 && q.z1 > r.z0 + .5));
  for (const s of top) {
    const y = s.y1; if (y - base < 2.8 || y - base > 15) continue;
    if (W.ladders.some(l => l.x1 > s.x0 - 1.5 && l.x0 < s.x1 + 1.5 && l.z1 > s.z0 - 1.5 && l.z0 < s.z1 + 1.5 && l.y1 > y - .5)) continue;
    const walls = [['e', s.x1, null], ['w', s.x0, null], ['s', null, s.z1], ['n', null, s.z0]].sort(() => Math.random() - .5);
    let ok = false;
    for (const [side, wx, wz] of walls) { if (ok) break;
      for (const t of [.5, .3, .7, .15, .85]) {
        const x = wx ?? s.x0 + (s.x1 - s.x0) * t, z = wz ?? s.z0 + (s.z1 - s.z0) * t, nx = side === 'e' ? 1 : side === 'w' ? -1 : 0, nz = side === 's' ? 1 : side === 'n' ? -1 : 0;
        const fx = x + nx * .8, fz = z + nz * .8, ax = nz !== 0;
        if (!isFree(fx - (ax ? .5 : .45), fz - (ax ? .45 : .5), fx + (ax ? .5 : .45), fz + (ax ? .45 : .5), base + .05, base + 2.2)) continue;
        if (!isFree(x + nx * .05 - (ax ? .4 : .05), z + nz * .05 - (ax ? .05 : .4), x + nx * .3 + (ax ? .4 : .05), z + nz * .3 + (ax ? .05 : .4), base + .05, y - .1)) continue;
        if (W.doors.some(d => Math.hypot(d.x - x, d.z - z) < 2.2)) continue;
        if (Math.abs(x) > W.bounds - 4 || Math.abs(z) > W.bounds - 4) continue;
        b.ladder(x, z, side, y - base, 0); n++; ok = true; break;
      }
    }
  }
  return n;
}
