import { THREE, G, mesh, alphaMat } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { WX } from './weather.js';

/* Отражения в лужах и воде: для каждого фонаря (и «окон» рядом) ищем точку, где луч из камеры
   в зеркальное отражение огня пересекает землю. Если точка внутри лужи/воды — там рисуем вытянутый
   пиксельный мазок, повёрнутый к камере. В дождь мокрый асфальт отражает фонари везде. */
let R = [], MATS = {};
const mat = c => MATS[c] || (MATS[c] = alphaMat(T.refl(), { blending: THREE.AdditiveBlending, color: c, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
export function buildReflections() {
  R = []; MATS = {};
  const add = (lx, ly, lz, gy, area, color, wet = false, k = 1) => { const m = mesh(G.plane, mat(color), 0, 0, 0, 1, 1, 1, W.group); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; W.keep.push(m); R.push({ lx, ly, lz, gy, area, m, wet, k }); };
  // лужи: фонари в 9 м и пара «окон»
  for (const p of W.puddles) {
    for (const L of W.lamps) if (Math.abs(L.y - p.y) < 0.5 && Math.hypot(L.lx - p.x, L.lz - p.z) < 9) add(L.lx, L.y + 2.95, L.lz, p.y + 0.03, { c: [p.x, p.z, p.r] }, 0xffd28a, false, 1, L);
    for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, d = 5 + Math.random() * 4; add(p.x + Math.cos(a) * d, p.y + 3 + Math.random() * 5, p.z + Math.sin(a) * d, p.y + 0.03, { c: [p.x, p.z, p.r] }, Math.random() < 0.7 ? 0xffa94d : 0x9be0ff, false, 0.55); }
  }
  // вода (фонтаны, пруды, канал, гавань): фонари рядом с берегом
  for (const z of W.zones) if (z.type === 'water') for (const L of W.lamps) {
    const cx = z.c ? z.c[0] : (z.r[0] + z.r[2]) / 2, cz = z.c ? z.c[1] : (z.r[1] + z.r[3]) / 2, ext = z.c ? z.c[2] : Math.max(z.r[2] - z.r[0], z.r[3] - z.r[1]) / 2;
    if (Math.hypot(L.lx - cx, L.lz - cz) < ext + 8 && L.y - z.y < 3) add(L.lx, L.y + 2.95, L.lz, z.y + 0.12, z.c ? { c: z.c } : { r: z.r }, 0xffd28a, false, 1);
  }
  // мокрый асфальт вокруг фонарей (только в дождь)
  for (const L of W.lamps) add(L.lx, L.y + 2.95, L.lz, L.y + 0.03, { c: [L.lx, L.lz, 4.5] }, 0xffc890, true, 0.6);
  // привязать отражение к фонарю: разбитый или погасший — не отражается
  for (const r of R) r.L = W.lamps.find(L => Math.abs(L.lx - r.lx) < 0.01 && Math.abs(L.lz - r.lz) < 0.01) || null;
}
const inside = (a, x, z) => a.c ? Math.hypot(x - a.c[0], z - a.c[1]) < a.c[2] : (x > a.r[0] && x < a.r[2] && z > a.r[1] && z < a.r[3]);
export function updateReflections(camera, t) {
  const C = camera.position;
  for (const r of R) {
    if ((r.wet && WX.wet <= 0) || (r.L && (r.L.dead || (r.L.pool && (r.L.pool.userData.broken || !r.L.pool.visible))))) { r.m.visible = false; continue; }
    if (Math.abs(r.lx - C.x) > 45 || Math.abs(r.lz - C.z) > 45) { r.m.visible = false; continue; }
    // зеркальный огонь под землёй: (lx, 2*gy - ly, lz); точка пересечения луча камера→отражение с плоскостью земли
    const my = 2 * r.gy - r.ly, k = (C.y - r.gy) / Math.max(0.01, C.y - my), x = C.x + (r.lx - C.x) * k, z = C.z + (r.lz - C.z) * k;
    if (C.y <= r.gy || !inside(r.area, x, z)) { r.m.visible = false; continue; }
    r.m.visible = true; r.m.position.set(x, r.gy, z);
    r.m.rotation.z = Math.atan2(x - C.x, z - C.z) + Math.PI;
    const fl = 0.85 + Math.sin(t * 9 + r.lx) * 0.08 + (WX.wet ? Math.sin(t * 23 + r.lz) * 0.1 : 0);
    r.m.scale.set(0.32 * r.k, (r.wet ? 1.6 : 1.1) * fl, 1);
  }
}
