import * as THREE from 'three';
import { W } from './state.js';
import { solidsNear } from './physics.js';
import { CONFIG } from '../config.js';
import { WL } from '../core/wl-uniforms.js';

/* Свет мира (v0.51): сотни настоящих источников вместо 8 точечных ламп.
   При генерации карты собираются все источники — фонари, лампы в комнатах, вывески, неон, светящиеся экраны.
   Для сетки 1×1 м заранее выбираются до 8 самых сильных источников, которые видят эту клетку
   (луч не упирается в стену — свет не протекает в соседние комнаты; стекло свет пропускает).
   Шейдер (gfx.js, ps1) каждый пиксель освещает своими источниками с учётом нормали.
   Вторая карта (0.25 м) хранит затенение у стен и предметов (AO) и высоту крыши над точкой —
   внутри зданий и под навесами меньше «небесного» света, на улице больше.
   Всё считается один раз; горящие/разбитые/мигающие источники меняют только свою яркость. */
const CELL = 1, MASK = 0.25, PER = 8, MAXL = 2040;
const tmpC = new THREE.Color(), tmpB = new THREE.Box3(), tmpV = new THREE.Vector3();
const texAvg = new Map();

function avgTexColor(tex) {
  const img = tex?.image; if (!img) return null;
  const key = tex.source.uuid; if (texAvg.has(key)) return texAvg.get(key);
  let out = null;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d', { willReadFrequently: true });
    if (img.data && img.width) { // DataTexture
      const d = img.data, n = img.width * img.height, st = Math.max(1, n / 256 | 0); let r = 0, g = 0, b = 0, k = 0;
      for (let i = 0; i < n; i += st) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; k++; }
      out = new THREE.Color(r / k / 255, g / k / 255, b / k / 255);
    } else { x.drawImage(img, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0, hi = 0;
      // берём в основном яркие пиксели: у вывески светится надпись, а не фон
      for (let i = 0; i < 64; i++) { const l = d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]; const w = l > 300 ? 3 : 1; r += d[i * 4] * w; g += d[i * 4 + 1] * w; b += d[i * 4 + 2] * w; hi += w; }
      out = new THREE.Color(r / hi / 255, g / hi / 255, b / hi / 255); }
  } catch { out = null; }
  texAvg.set(key, out); return out;
}

// Светящиеся материалы в мире → источники цветного света (вывески, неон, экраны, гирлянды, окна витрин).
function emitterOf(o) {
  const m = o.material; if (!m || Array.isArray(m) || o.userData.noLight || m.userData?.noLight) return null;
  if (m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.6)) return null;
  let color = null, k = 0;
  if (m.isMeshLambertMaterial && m.emissive && m.emissiveIntensity >= 0.5 && m.emissive.getHex() !== 0) { color = m.emissive.clone(); k = m.emissiveIntensity; }
  else if (m.isMeshBasicMaterial && m.fog !== false) {
    const c = m.map ? avgTexColor(m.map) : null; color = (c ? c.clone() : new THREE.Color(1, 1, 1)).multiply(m.color);
    const hsl = {}; color.getHSL(hsl); if (hsl.l < 0.42 || (hsl.s < 0.18 && hsl.l < 0.62)) return null; k = 0.8;
  } else return null;
  return { color, k, mat: m };
}

export function buildWorldLight(group) {
  const t0 = performance.now(), base = CONFIG.base, half = W.bounds + 6;
  const lights = [];
  const add = (x, y, z, color, strength, range, extra = {}) => { if (lights.length < MAXL) lights.push({ x, y, z, color: new THREE.Color(color), strength, range, band: null, k: 1, kOld: -1, ...extra }); };
  // фонари: тёплый натриевый свет, пятно на земле и стенах вокруг
  const lampPools = new Set();
  for (const l of W.lamps || []) { lampPools.add(l.pool); add(l.lx, l.y + 2.9, l.lz, 0xffa85a, 13, 9.5, { pool: l.pool, kind: 'lamp' }); }
  // лампы в комнатах и подсветки (builder.light): внутренние — только на своём этаже
  for (const s of W.lightSources || []) {
    if (lampPools.has(s.pool)) continue;
    const dim = s.range <= 6.5, floor = s.y - (dim ? 1.85 : 2.55);
    add(s.x, s.y, s.z, s.color ?? 0xffc888, (s.strength ?? 4) * (dim ? 1.6 : 1.15), (s.range ?? 6) * 1.15, { pool: s.pool, band: dim ? [floor - 0.4, floor + 3.3] : null, kind: dim ? 'room' : 'spot' });
  }
  // светящиеся материалы
  group.updateMatrixWorld(true);
  const raw = [];
  group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
    const e = emitterOf(o); if (!e) return;
    tmpB.setFromObject(o); const sz = tmpB.getSize(tmpV).clone(); const area = Math.max(sz.x * sz.y, sz.x * sz.z, sz.y * sz.z);
    if (area < 0.012 || area > 60) return;
    const c = tmpB.getCenter(new THREE.Vector3());
    // свет выходит с «лица» плоского объекта, а не из стены
    const ax = sz.x <= sz.y && sz.x <= sz.z ? 'x' : sz.z <= sz.y ? 'z' : 'y', off = 0.45;
    let p = c;
    if (ax !== 'y') { const a = c.clone(), b = c.clone(); a[ax] += off + sz[ax] / 2; b[ax] -= off + sz[ax] / 2; p = insideSolid(a) && !insideSolid(b) ? b : a; }
    else p = c.clone().setY(c.y - off);
    raw.push({ p, color: e.color, s: Math.sqrt(area) * e.k, mat: e.mat });
  });
  // склеиваем соседние источники одного цвета (гирлянды, ряды экранов, буквы вывески)
  const used = new Array(raw.length).fill(false);
  for (let i = 0; i < raw.length; i++) {
    if (used[i]) continue; used[i] = true;
    const a = raw[i], P = a.p.clone().multiplyScalar(a.s), C = a.color.clone().multiplyScalar(a.s), mats = new Set([a.mat]); let S = a.s;
    for (let j = i + 1; j < raw.length; j++) { if (used[j]) continue; const b = raw[j]; if (b.p.distanceToSquared(a.p) > 2.4 * 2.4) continue;
      used[j] = true; P.addScaledVector(b.p, b.s); C.r += b.color.r * b.s; C.g += b.color.g * b.s; C.b += b.color.b * b.s; S += b.s; mats.add(b.mat); }
    P.multiplyScalar(1 / S); C.multiplyScalar(1 / S);
    // не дублируем фонари и лампы, которые уже есть
    if (lights.some(l => (l.x - P.x) ** 2 + (l.z - P.z) ** 2 + (l.y - P.y) ** 2 < 1.2)) continue;
    const st = Math.min(3.5, 1.2 + S * 1.8), range = Math.min(7.5, 3 + S * 2.6);
    add(P.x, P.y, P.z, C.getHex(), st, range, { mats: [...mats], kind: 'emit', band: P.y > base + 3.2 ? [P.y - 3.4, P.y + 2.5] : null });
  }

  // стекло пропускает свет
  const glass = new Set((W.breakables || []).filter(b => b.kind === 'glass' && b.solid).map(b => b.solid));
  for (const s of W.solids) if (s.tag === 'fence' || s.tag === 'hub-boundary') glass.add(s);
  const blocked = (ax, ay, az, bx, by, bz) => {
    const list = solidsNear(Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz));
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    for (const s of list) {
      if (!s.on || glass.has(s) || s.y1 - s.y0 < 0.6) continue;
      if (ax > s.x0 && ax < s.x1 && az > s.z0 && az < s.z1 && ay > s.y0 && ay < s.y1) continue; // источник внутри своего корпуса
      let t0 = 0.02, t1 = 0.98;
      for (const [o, d, lo, hi] of [[ax, dx, s.x0, s.x1], [ay, dy, s.y0, s.y1], [az, dz, s.z0, s.z1]]) {
        if (Math.abs(d) < 1e-6) { if (o <= lo || o >= hi) { t1 = -1; break; } continue; }
        let u = (lo - o) / d, v = (hi - o) / d; if (u > v) [u, v] = [v, u];
        if (u > t0) t0 = u; if (v < t1) t1 = v; if (t0 > t1) break;
      }
      if (t0 < t1) return true;
    }
    return false;
  };
  // сетка источников
  const gw = Math.ceil(half * 2 / CELL), gh = gw, ox = -half, oz = -half;
  const best = new Array(gw * gh);
  lights.forEach((l, id) => {
    const r = l.range, i0 = Math.max(0, Math.floor((l.x - r - ox) / CELL)), i1 = Math.min(gw - 1, Math.floor((l.x + r - ox) / CELL)), j0 = Math.max(0, Math.floor((l.z - r - oz) / CELL)), j1 = Math.min(gh - 1, Math.floor((l.z + r - oz) / CELL));
    const floor = l.band ? l.band[0] + 0.4 : base;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const cx = ox + (i + 0.5) * CELL, cz = oz + (j + 0.5) * CELL, d = Math.hypot(cx - l.x, cz - l.z);
      if (d > r + CELL * 0.71) continue;
      const w = l.strength * (1 - Math.min(1, d / r)) ** 2 + 0.001;
      let a = best[i + j * gw]; if (a && a.length >= PER && a[PER - 1].w >= w) continue;
      // видит ли источник клетку: проверяем низко и на высоте человека (и центр, и ближнюю к свету точку клетки)
      if (d > 0.9) {
        const nx = cx + Math.sign(l.x - cx) * Math.min(0.45, Math.abs(l.x - cx)), nz = cz + Math.sign(l.z - cz) * Math.min(0.45, Math.abs(l.z - cz));
        const lo = floor + 0.35, hi = Math.min(l.y - 0.1, floor + 2.0);
        if (blocked(l.x, l.y, l.z, cx, lo, cz) && blocked(l.x, l.y, l.z, cx, hi, cz) && blocked(l.x, l.y, l.z, nx, hi, nz)) continue;
      }
      if (!a) best[i + j * gw] = a = [];
      let k = a.length; while (k > 0 && a[k - 1].w < w) k--; a.splice(k, 0, { id, w }); if (a.length > PER) a.pop();
    }
  });
  const grid = new Float32Array(gw * 2 * gh * 4).fill(-1);
  for (let c = 0; c < best.length; c++) { const a = best[c]; if (!a) continue; const i = c % gw, j = (c / gw) | 0;
    for (let k = 0; k < a.length; k++) grid[((j * gw * 2) + i * 2 + (k >> 2)) * 4 + (k & 3)] = a[k].id; }
  const gridTex = new THREE.DataTexture(grid, gw * 2, gh, THREE.RGBAFormat, THREE.FloatType); gridTex.needsUpdate = true;

  const N = Math.max(1, lights.length), ldata = new Float32Array(N * 3 * 4);
  lights.forEach((l, i) => {
    ldata.set([l.x, l.y, l.z, l.range], i * 4);
    ldata.set([l.band ? l.band[0] : -999, l.band ? l.band[1] : 999, 0, 0], (2 * N + i) * 4);
  });
  const lightTex = new THREE.DataTexture(ldata, N, 3, THREE.RGBAFormat, THREE.FloatType);
  const setColors = () => { let ch = false; lights.forEach((l, i) => { if (l.k === l.kOld) return; l.kOld = l.k; ch = true; tmpC.copy(l.color).multiplyScalar(l.strength * l.k); ldata.set([tmpC.r, tmpC.g, tmpC.b, 0], (N + i) * 4); }); if (ch) lightTex.needsUpdate = true; };
  setColors();

  // маска: AO у стен/предметов и высота крыши над точкой
  const mw = Math.ceil(half * 2 / MASK), mh = mw;
  const occ = new Float32Array(mw * mh), roof = new Float32Array(mw * mh);
  const cellRange = (s) => [Math.max(0, Math.floor((s.x0 - ox) / MASK)), Math.min(mw - 1, Math.ceil((s.x1 - ox) / MASK) - 1), Math.max(0, Math.floor((s.z0 - oz) / MASK)), Math.min(mh - 1, Math.ceil((s.z1 - oz) / MASK) - 1)];
  for (const s of W.solids) {
    if (!s.on) continue;
    const [i0, i1, j0, j1] = cellRange(s);
    if (s.y0 < base + 0.45 && s.y1 > base + 0.25 && !glass.has(s)) { const v = Math.min(1, (s.y1 - base) / 0.9); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) occ[i + j * mw] = Math.max(occ[i + j * mw], v); }
    if (s.y0 > base + 1.9 && (s.x1 - s.x0) * (s.z1 - s.z0) > 0.4) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) roof[i + j * mw] = Math.max(roof[i + j * mw], s.y1);
  }
  const blur = (a, r) => { const t = new Float32Array(a.length), n = 2 * r + 1;
    for (let j = 0; j < mh; j++) { let s = 0; for (let i = 0; i < r && i < mw; i++) s += a[i + j * mw];
      for (let i = 0; i < mw; i++) { if (i + r < mw) s += a[i + r + j * mw]; if (i - r - 1 >= 0) s -= a[i - r - 1 + j * mw]; t[i + j * mw] = s / n; } }
    for (let i = 0; i < mw; i++) { let s = 0; for (let j = 0; j < r && j < mh; j++) s += t[i + j * mw];
      for (let j = 0; j < mh; j++) { if (j + r < mh) s += t[i + (j + r) * mw]; if (j - r - 1 >= 0) s -= t[i + (j - r - 1) * mw]; a[i + j * mw] = s / n; } } };
  const sharp = occ.slice(); blur(occ, 2); blur(occ, 2);
  const mask = new Uint8Array(mw * mh * 4);
  for (let i = 0; i < mw * mh; i++) {
    const ao = 1 - Math.min(1, Math.max(occ[i], sharp[i] * 0.85) * 1.15) * 0.62;
    mask[i * 4] = Math.round(ao * 255); mask[i * 4 + 1] = Math.round(Math.min(1, roof[i] / 48) * 255); mask[i * 4 + 3] = 255;
  }
  const maskTex = new THREE.DataTexture(mask, mw, mh, THREE.RGBAFormat); maskTex.magFilter = maskTex.minFilter = THREE.LinearFilter; maskTex.needsUpdate = true;

  const res = [gridTex, lightTex, maskTex];
  for (const r of res) W.mapResources.add(r);
  const wl = {
    lights, count: lights.length, ms: Math.round(performance.now() - t0),
    apply() {
      WL.on.value = 1; WL.grid.value = gridTex; WL.lights.value = lightTex; WL.mask.value = maskTex;
      WL.origin.value.set(ox, oz); WL.gridSize.value.set(gw, gh); WL.cell.value = CELL; WL.maskInv.value.set(1 / (mw * MASK), 1 / (mh * MASK)); WL.count.value = N; WL.base.value = base;
    },
    // яркость источников: разбитые и выключенные гаснут, мигающие мигают вместе с плафоном
    update(dim = 0) {
      for (const l of lights) {
        let k = 1;
        if (l.pool) k = l.pool.visible && !l.pool.userData.broken ? 1 : 0;
        else if (l.mats) { const m = l.mats[0]; k = m.emissive ? Math.min(1, m.emissiveIntensity / 0.9) : Math.min(1, (m.color.r + m.color.g + m.color.b) / 2.2); if (dim > 0.3) k *= 0.25; }
        l.k = Math.round(k * 20) / 20;
      }
      setColors();
    },
  };
  return wl;
}
function insideSolid(p) {
  for (const s of solidsNear(p.x - 0.01, p.z - 0.01, p.x + 0.01, p.z + 0.01)) if (s.on && p.x > s.x0 && p.x < s.x1 && p.z > s.z0 && p.z < s.z1 && p.y > s.y0 && p.y < s.y1) return true;
  return false;
}
