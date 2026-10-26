import { THREE, G, mesh, col, tmat, lam, compose } from '../core/gfx.js';
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
    if (!isFree(s.x0 + w * 0.3, s.z0 + d * 0.3, s.x1 - w * 0.3, s.z1 - d * 0.3, y + 0.05, y + 2.2) && !isFree(s.x0 + 0.5, s.z0 + 0.5, s.x0 + 1.5, s.z0 + 1.5, y + 0.05, y + 2.2)) continue;
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
  return done.length;
}
