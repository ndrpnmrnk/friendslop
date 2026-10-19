import { THREE, renderer } from './gfx.js';
const ANISO = Math.min(16, renderer.capabilities.getMaxAnisotropy());
import { HW, SEASON } from '../config.js';

/* Текстуры «под фото»: рисуем мягко в высоком разрешении, затем ужимаем до 16–64 px.
   Получается та самая размытая пиксельная фактура PS1. Позже любую можно заменить
   реальным фото — достаточно вернуть текстуру с тем же ключом. */
const C = new Map();
function finish(c, alpha) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = ANISO;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (alpha) t.premultiplyAlpha = false;
  return t;
}
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function pix(key, w, h, draw) {
  if (C.has(key)) return C.get(key);
  const c = cv(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g, w, h);
  const t = finish(c); C.set(key, t); return t;
}
export function photo(key, w, h, draw, s = 6) {
  if (key && C.has(key)) return C.get(key);
  const hi = cv(w * s, h * s), g = hi.getContext('2d'); draw(g, w * s, h * s);
  const lo = cv(w, h), l = lo.getContext('2d'); l.imageSmoothingEnabled = true; l.imageSmoothingQuality = 'high';
  l.drawImage(hi, 0, 0, w, h);
  const t = finish(lo); if (key) C.set(key, t); return t;
}
export function rep(t, rx, ry) {
  const k = t.uuid + rx + 'x' + ry; if (C.has(k)) return C.get(k);
  const r = t.clone(); r.repeat.set(rx, ry); r.needsUpdate = true; C.set(k, r); return r;
}

/* ---------- рисовалки ---------- */
const R = Math.random;
function fill(g, W, H, c) { g.fillStyle = c; g.fillRect(0, 0, W, H); }
function blobs(g, W, H, cols, n, r0, r1, a = 0.35) {
  g.globalAlpha = a;
  for (let i = 0; i < n; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; g.beginPath(); g.arc(R() * W, R() * H, r0 + R() * (r1 - r0), 0, 7); g.fill(); }
  g.globalAlpha = 1;
}
function strokes(g, W, H, cols, n, len, ang, jit, width, a = 0.5) {
  g.globalAlpha = a; g.lineWidth = width; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * H, an = ang + (R() - 0.5) * jit, l = len * (0.5 + R());
    g.strokeStyle = cols[(R() * cols.length) | 0];
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke();
  }
  g.globalAlpha = 1;
}
// пятна лягушки: тёмные неровные кляксы с более светлой каймой (exclude — зоны без пятен)
function frogSpots(g, W, H, n, exclude = []) {
  for (let i = 0; i < n; i++) { const x = R() * W, y = R() * H; if (exclude.some(([a, b, c, d]) => x > a && x < c && y > b && y < d)) continue; const r = W * (0.05 + R() * 0.06);
    g.fillStyle = '#6ab85a'; g.beginPath(); g.ellipse(x, y, r * 1.35, r * 1.15, R() * 3, 0, 7); g.fill();
    g.fillStyle = '#1f4a1c'; g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28, rr = r * (0.75 + R() * 0.4); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85); } g.fill(); }
}
function grain(g, W, H, amt) {
  const d = g.getImageData(0, 0, W, H), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const n = (R() - 0.5) * amt; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  g.putImageData(d, 0, 0);
}
function radial(g, x, y, r, c0, c1) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
const hex = n => '#' + n.toString(16).padStart(6, '0');
export function shade(c, a) {
  const r = Math.max(0, Math.min(255, ((c >> 16) & 255) + a)), gg = Math.max(0, Math.min(255, ((c >> 8) & 255) + a)), b = Math.max(0, Math.min(255, (c & 255) + a));
  return `rgb(${r},${gg},${b})`;
}

/* ---------- земля ---------- */
export const T = {
  asphalt: () => photo('asphalt', 64, 64, (g, W, H) => {
    fill(g, W, H, HW ? '#2f2a37' : '#55525c');
    blobs(g, W, H, ['#27222e', '#36303f', '#2b2633'], 50, W * 0.05, W * 0.18, 0.28);
    blobs(g, W, H, ['#4a4452', '#1d1a22', '#5a5462'], 1400, 1.5, 4, 0.35);
    g.strokeStyle = 'rgba(14,11,18,.65)'; g.lineWidth = 4;
    for (let i = 0; i < 2; i++) { let x = R() * W, y = R() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (R() - 0.5) * 60; y += 30 + R() * 20; g.lineTo(x, y); } g.stroke(); }
    blobs(g, W, H, ['#1a1620'], 6, 12, 30, 0.18);
    grain(g, W, H, 10);
  }),
  pave: () => photo('pave', 64, 64, (g, W, H) => {
    // тротуарная плитка «кирпичиком»: небольшие брусчатые плитки, тонкие швы, разный оттенок
    fill(g, W, H, HW ? '#3d3747' : '#7a7468'); const rows = 8, rh = H / rows, cw = W / 4;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 5; c++) {
      const x = c * cw + (r % 2 ? cw / 2 : 0), y = r * rh;
      g.fillStyle = shade(HW ? 0x77708a : 0xb8b2a8, (R() - 0.5) * 26); g.fillRect(x + 2, y + 2, cw - 4, rh - 4);
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 2, y + 2, cw - 4, 3);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 2, y + rh - 5, cw - 4, 3);
    }
    blobs(g, W, H, ['#4d4658', '#8b84a0', '#3a3444'], 70, 5, 22, 0.12); blobs(g, W, H, ['#2a2532'], 400, 1, 2.5, 0.35); grain(g, W, H, 14);
  }),
  cobble: () => photo('cobble', 64, 64, (g, W, H) => {
    fill(g, W, H, '#2a2433'); const n = 8, s2 = W / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const cx = (x + 0.5 + (y % 2 ? 0.5 : 0)) * s2, cy = (y + 0.5) * s2, rx = s2 * (0.38 + R() * 0.08), ry = s2 * (0.36 + R() * 0.08);
      for (const ox of [0, -W, W]) { g.fillStyle = radial(g, cx + ox - rx * 0.3, cy - ry * 0.3, rx * 1.6, shade(0x9a91aa, (R() - 0.5) * 30), shade(0x5e566c, (R() - 0.5) * 20)); g.beginPath(); g.ellipse(cx + ox, cy, rx, ry, R(), 0, 7); g.fill(); }
    }
    grain(g, W, H, 16);
  }),
  grass: () => photo('grass', 64, 64, (g, W, H) => {
    fill(g, W, H, HW ? '#33502f' : '#4f8a40');
    blobs(g, W, H, HW ? ['#2a4527', '#3f5e38', '#4a6a3c'] : ['#3f7a35', '#5a9a4a'], 60, 12, 50, 0.3);
    strokes(g, W, H, HW ? ['#4f7444', '#24391f', '#5f7f4a', '#6a8a50'] : ['#6aaa55', '#3a6a30'], 3200, 12, -Math.PI / 2, 0.7, 2.5, 0.5);
    if (HW) blobs(g, W, H, ['#c96a25', '#a8452a', '#e0902e', '#8a3a1e'], 90, 4, 8, 0.85);
    grain(g, W, H, 12);
  }),
  dirt: () => photo('dirt', 64, 64, (g, W, H) => {
    fill(g, W, H, '#5a4636'); blobs(g, W, H, ['#4a382b', '#6b5442', '#3e2f24'], 90, 10, 40, 0.3);
    blobs(g, W, H, ['#8a7a6a', '#2e231b', '#a08a72'], 1200, 1.5, 5, 0.65); strokes(g, W, H, ['#2e231b'], 30, 30, 0.3, 1, 3, 0.3); grain(g, W, H, 18);
  }),
  concrete: () => photo('concrete', 64, 64, (g, W, H) => {
    fill(g, W, H, '#6d6876'); blobs(g, W, H, ['#5d5866', '#7c7785', '#4e4a57'], 90, 10, 50, 0.22);
    blobs(g, W, H, ['#3a3542', '#8a8592'], 700, 1, 3, 0.4);
    g.strokeStyle = 'rgba(30,26,36,.5)'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
    g.strokeStyle = 'rgba(20,16,26,.4)'; g.lineWidth = 2; g.beginPath(); let x = R() * W, y = 0; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 40; y += H / 6; g.lineTo(x, y); } g.stroke();
    grain(g, W, H, 14);
  }),
  court: () => photo('court', 32, 32, (g, W, H) => {
    fill(g, W, H, '#8a3b33'); blobs(g, W, H, ['#7a3029', '#9a4a40'], 60, 6, 20, 0.3); grain(g, W, H, 26);
  }),
  water: () => photo('water', 64, 64, (g, W, H) => {
    fill(g, W, H, '#244a68'); blobs(g, W, H, ['#1c405c', '#2e5a7c', '#285474', '#1a3a54'], 120, 10, 40, 0.35);
    // мелкая рябь: изогнутые блики
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) { const x = R() * W, y = R() * H, l = 10 + R() * 26; g.strokeStyle = R() < 0.5 ? 'rgba(120,170,210,.45)' : 'rgba(70,120,160,.5)'; g.lineWidth = 2 + R() * 2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 4 - R() * 4, x + l, y); g.stroke(); }
    grain(g, W, H, 8);
  }),
  waterHi: () => pix('waterHi', 32, 32, (g, W, H) => { for (let i = 0; i < 26; i++) { const x = (R() * W) | 0, y = (R() * H) | 0, l = 2 + ((R() * 5) | 0); g.fillStyle = R() < 0.3 ? 'rgba(230,240,255,.9)' : 'rgba(150,200,240,.6)'; g.fillRect(x, y, l, 1); } }),
  foam: () => pix('foam', 32, 8, (g, W, H) => { for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(220,235,250,${0.3 + R() * 0.5})`; g.fillRect((R() * W) | 0, (R() * H * R()) | 0, 1 + ((R() * 3) | 0), 1); } g.fillStyle = 'rgba(220,235,250,.55)'; g.fillRect(0, 0, W, 2); }),
  ripple: () => pix('ripple', 32, 32, (g, W, H) => { g.strokeStyle = 'rgba(210,230,250,.9)'; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, 7); g.stroke(); g.strokeStyle = 'rgba(210,230,250,.4)'; g.lineWidth = 1; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 6, 0, 7); g.stroke(); }),
  foot: () => pix('foot', 8, 12, (g) => { g.fillStyle = 'rgba(20,26,40,.8)'; g.beginPath(); g.ellipse(4, 7, 3, 4.5, 0, 0, 7); g.fill(); }),
  wood: () => photo('wood', 64, 64, (g, W, H) => {
    const n = 4, s2 = H / n;
    for (let i = 0; i < n; i++) { g.fillStyle = shade(0x7a5236, (R() - 0.5) * 34); g.fillRect(0, i * s2, W, s2); }
    strokes(g, W, H, ['#5a3a24', '#94693c', '#4a2e1c', '#a8784a'], 380, 70, 0, 0.06, 2.5, 0.4);
    for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(46,28,16,.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(R() * W, (((R() * n) | 0) + 0.5) * s2, 10, 4, 0, 0, 7); g.stroke(); }
    g.fillStyle = '#2a190e'; for (let i = 0; i <= n; i++) g.fillRect(0, i * s2 - 3, W, 6);
    g.fillStyle = '#1a120a'; for (let i = 0; i < n; i++) for (const x of [W * 0.06, W * 0.94]) { g.fillRect(x - 2, i * s2 + s2 * 0.3, 4, 4); g.fillRect(x - 2, i * s2 + s2 * 0.62, 4, 4); }
    grain(g, W, H, 14);
  }),
  floorWood: () => photo('floorWood', 32, 32, (g, W, H) => {
    const n = 6, s = W / n;
    for (let i = 0; i < n; i++) { g.fillStyle = shade(0x8a5a36, (R() - 0.5) * 34); g.fillRect(i * s, 0, s, H); }
    strokes(g, W, H, ['#5a3a24', '#a06a40'], 160, 40, Math.PI / 2, 0.08, 2, 0.4);
    g.fillStyle = '#2e1c10'; for (let i = 1; i < n; i++) g.fillRect(i * s - 1, 0, 2, H);
    grain(g, W, H, 16);
  }),
  floorTile: () => photo('floorTile', 32, 32, (g, W, H) => {
    const n = 4, s = W / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = shade((x + y) % 2 ? 0xb8ae9c : 0x6e6678, (R() - 0.5) * 14); g.fillRect(x * s, y * s, s, s); }
    g.fillStyle = 'rgba(30,26,36,.45)'; for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1, 0, 2, H); g.fillRect(0, i * s - 1, W, 2); }
    blobs(g, W, H, ['#a89c88', '#2a2433'], 30, 6, 16, 0.12); grain(g, W, H, 12);
  }),
  graffiti: i => photo('graffiti' + i, 48, 24, (g, W, H) => {
    const pals = [['#ff5a6e', '#f5c542', '#17111f'], ['#4ab0f0', '#9be36b', '#17111f'], ['#b18cff', '#ff8a1f', '#f1e8ff'], ['#9be36b', '#ff5a6e', '#2a1f3d']][i % 4];
    const words = ['ТЫКВА', 'BOO', 'FRIENDS', 'СЛОП', 'КОТ', 'RIP'][i % 6];
    g.font = `900 ${H * 0.55}px Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = H * 0.14; g.strokeStyle = pals[2]; g.strokeText(words, W / 2, H * 0.55); g.fillStyle = pals[0]; g.fillText(words, W / 2, H * 0.55);
    g.globalAlpha = 0.6; g.fillStyle = pals[1]; g.fillRect(W * 0.1, H * 0.5, W * 0.8, H * 0.1); g.globalAlpha = 1;
    for (let k = 0; k < 6; k++) { g.fillStyle = pals[0]; g.fillRect(W * (0.2 + R() * 0.6), H * 0.75, W * 0.012, H * (0.1 + R() * 0.15)); }
  }),
  puddle: () => photo('puddle', 32, 32, (g, W, H) => { g.fillStyle = radial(g, W / 2, H / 2, W / 2, 'rgba(40,60,90,.75)', 'rgba(40,60,90,0)'); g.beginPath(); g.ellipse(W / 2, H / 2, W * 0.48, H * 0.36, 0.3, 0, 7); g.fill();
    g.strokeStyle = 'rgba(160,190,230,.35)'; g.lineWidth = 3; g.beginPath(); g.ellipse(W * 0.45, H * 0.45, W * 0.2, H * 0.1, 0.3, 0, 3); g.stroke(); }),
  tunnelTile: () => photo('tunnelTile', 64, 64, (g, W, H) => {
    fill(g, W, H, '#5a5662'); const n = 8, s2 = W / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = shade(y < 3 ? 0x2e5a4a : 0xb8b4a8, (R() - 0.5) * 22); g.fillRect(x * s2 + 2, y * s2 + 2, s2 - 4, s2 - 4); }
    g.fillStyle = '#c8a030'; g.fillRect(0, 3 * s2 - 3, W, 5);
    blobs(g, W, H, ['#3a3226', '#4a4030', '#6a5a3a'], 50, 3, 14, 0.35); strokes(g, W, H, ['rgba(60,48,30,.6)'], 20, 30, Math.PI / 2, 0.2, 3, 0.5); grain(g, W, H, 14);
  }),
  oldBrick: () => photo('oldBrick', 64, 64, (g, W, H) => {
    fill(g, W, H, '#3a302c'); const rows = 10, bh = H / rows, bw = W / 4;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 5; c++) { g.fillStyle = shade(0x6a3a2c, (R() - 0.5) * 40); g.fillRect(c * bw + (r % 2 ? bw / 2 : 0) + 3, r * bh + 3, bw - 6, bh - 6); }
    blobs(g, W, H, ['#2a3a2a', '#3a4a30', '#1a1614'], 60, 4, 18, 0.4); strokes(g, W, H, ['rgba(30,40,24,.6)'], 25, 40, Math.PI / 2, 0.15, 4, 0.5); grain(g, W, H, 16);
  }),
  truss: (c = '#e0b02a') => pix('truss' + c, 32, 32, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = c; g.fillRect(0, 0, 3, H); g.fillRect(W - 3, 0, 3, H); g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2);
    g.fillStyle = '#b88a1a'; for (let i = 0; i < W; i++) { g.fillRect(i, (i * H / W) | 0, 2, 2); g.fillRect(i, H - 2 - ((i * H / W) | 0), 2, 2); } }),
  mist: () => photo('mist', 64, 64, (g, W, H) => { g.clearRect(0, 0, W, H); for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H, r = W * (0.08 + R() * 0.16);
    for (const [ox, oy] of [[0, 0], [W, 0], [-W, 0], [0, H], [0, -H]]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); } } }, 2),
  aoStrip: () => pix('aoStrip', 4, 16, (g, W, H) => { for (let y = 0; y < H; y++) { g.fillStyle = `rgba(10,6,16,${(0.55 * (1 - y / H) ** 1.6).toFixed(3)})`; g.fillRect(0, y, W, 1); } }),
  grate: () => pix('grate', 16, 16, (g, W, H) => { g.fillStyle = '#2b2533'; g.fillRect(0, 0, W, H); g.fillStyle = '#0a080c'; for (let x = 1; x < W; x += 3) g.fillRect(x, 1, 2, H - 2); }),
  carpet: (c = 0x3a4458) => photo('carpet' + c, 32, 32, (g, W, H) => { fill(g, W, H, shade(c, 0)); blobs(g, W, H, [shade(c, -14), shade(c, 12)], 900, 1, 2.5, 0.5);
    g.strokeStyle = shade(c, -22); g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3); grain(g, W, H, 10); }),
  plaster: () => photo('plaster', 32, 32, (g, W, H) => {
    fill(g, W, H, '#b8a68e'); blobs(g, W, H, ['#a8967e', '#c8b69e', '#9a8a74'], 60, 8, 30, 0.3);
    g.fillStyle = '#6a5a4a'; g.fillRect(0, H - 14, W, 14); grain(g, W, H, 14);
  }),
  roof: () => photo('roof', 32, 32, (g, W, H) => {
    fill(g, W, H, '#3a3046'); blobs(g, W, H, ['#2c2436', '#4a3e58', '#332a3e'], 600, 1, 4, 0.7); grain(g, W, H, 22);
  }),
  metal: () => photo('metal', 32, 32, (g, W, H) => {
    fill(g, W, H, '#6a6d78'); strokes(g, W, H, ['#8a8d98', '#4a4d58'], 200, 30, 0, 0.05, 2, 0.3); grain(g, W, H, 14);
  }),
  rust: () => photo('rust', 32, 32, (g, W, H) => {
    fill(g, W, H, '#6a4a3a'); blobs(g, W, H, ['#8a4a24', '#a0602e', '#4a3a34', '#5a5a60'], 90, 4, 22, 0.45); grain(g, W, H, 24);
  }),
  corrugated: c => photo('corr' + c, 32, 32, (g, W, H) => {
    for (let x = 0; x < W; x += 12) { const gr = g.createLinearGradient(x, 0, x + 12, 0); gr.addColorStop(0, shade(c, -40)); gr.addColorStop(0.5, shade(c, 20)); gr.addColorStop(1, shade(c, -40)); g.fillStyle = gr; g.fillRect(x, 0, 12, H); }
    blobs(g, W, H, ['#5a3a24', '#8a4a24'], 30, 3, 12, 0.4); grain(g, W, H, 18);
  }),
  bark: () => photo('bark', 16, 32, (g, W, H) => {
    fill(g, W, H, '#4e3426'); strokes(g, W, H, ['#2e1e16', '#6a4a36', '#3a2618'], 120, 40, Math.PI / 2, 0.2, 4, 0.6); grain(g, W, H, 20);
  }),
  leaves: i => photo('leaves' + i, 32, 32, (g, W, H) => {
    const pal = HW ? [['#c9662a', '#a8452a', '#e89a3a', '#6a2e1a'], ['#a8452a', '#7a2e1e', '#c0603a', '#4a1e14'], ['#5a6b32', '#3e5228', '#7a7a3a', '#2a3a1c']][i]
      : [['#3f8a45', '#2f6a3a', '#5aaa50', '#1f4a2a'], ['#4f9a3a', '#2f7a2e', '#6aaa4a', '#1f4a1c'], ['#2f7a40', '#1f5a30', '#3f8a50', '#14402a']][i];
    fill(g, W, H, pal[3]); blobs(g, W, H, pal, 260, 4, 12, 0.85); grain(g, W, H, 18);
  }),
  tread: () => photo('tread', 32, 16, (g, W, H) => { fill(g, W, H, '#1a171f'); g.fillStyle = '#0a080c'; for (let x = 0; x < W; x += W / 8) { g.fillRect(x, 0, W / 20, H); g.fillRect(x + W / 16, H * 0.3, W / 24, H * 0.4); } grain(g, W, H, 14); }),
  hubcap: () => photo('hubcap', 16, 16, (g, W, H) => { fill(g, W, H, '#2a2630'); g.fillStyle = radial(g, W * 0.4, H * 0.4, W * 0.5, '#d8d8e0', '#6a6d78'); g.beginPath(); g.arc(W / 2, H / 2, W * 0.42, 0, 7); g.fill(); g.fillStyle = '#3a3440'; for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(W / 2 + Math.cos(a * 1.257) * W * 0.24, H / 2 + Math.sin(a * 1.257) * H * 0.24, W * 0.07, 0, 7); g.fill(); } }),
  plate: () => pix('plate', 16, 4, (g, W, H) => { fill(g, W, H, '#e8e4d8'); g.fillStyle = '#17111f'; for (let x = 2; x < W - 2; x += 2) g.fillRect(x, 1, 1, 2); }),
  leafLitter: () => pix('leafLitter', 32, 32, (g, W, H) => { g.clearRect(0, 0, W, H); const pal = HW ? ['#c9662a', '#a8452a', '#e89a3a', '#d8b040'] : ['#5aaa50', '#3f8a45', '#7aba5a', '#9aaa4a'];
    for (let i = 0; i < 70; i++) { const x = R() * W, y = R() * H, d = Math.hypot(x - W / 2, y - H / 2); if (d > W * 0.48 * (0.6 + R() * 0.4)) continue; g.fillStyle = pal[(R() * 4) | 0]; g.fillRect(x | 0, y | 0, 2, 1 + ((R() * 2) | 0)); } }),
  bush: () => photo('bush', 32, 32, (g, W, H) => {
    fill(g, W, H, '#1e3220'); blobs(g, W, H, ['#2e4a2a', '#3e5e34', '#24381f', HW ? '#7a4a24' : '#4a7a3a'], 300, 3, 9, 0.85); grain(g, W, H, 16);
  }),
  stone: () => photo('stone', 32, 32, (g, W, H) => {
    fill(g, W, H, '#8a8496'); blobs(g, W, H, ['#6e6880', '#9e98aa', '#7a7488', '#5a6a5a'], 90, 4, 18, 0.35); grain(g, W, H, 26);
  }),
  grave: () => photo('grave', 16, 24, (g, W, H) => {
    fill(g, W, H, '#8a8496'); blobs(g, W, H, ['#6e6880', '#9e98aa', '#5a6a5a'], 60, 3, 14, 0.35);
    g.fillStyle = '#3e3a4a'; g.fillRect(W * 0.44, H * 0.12, W * 0.12, H * 0.42); g.fillRect(W * 0.28, H * 0.22, W * 0.44, H * 0.08);
    g.font = `bold ${W * 0.22}px serif`; g.textAlign = 'center'; g.fillText('R.I.P', W / 2, H * 0.78); grain(g, W, H, 26);
  }),
  brickWall: () => photo('brickWall', 64, 64, (g, W, H) => {
    fill(g, W, H, '#5a4c48'); const rows = 10, bh = H / rows, bw = W / 4;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 5; c++) { const x = c * bw + (r % 2 ? bw / 2 : 0); g.fillStyle = shade(0x9a4a36, (R() - 0.5) * 44); g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 3, r * bh + bh - 7, bw - 6, 4); }
    blobs(g, W, H, ['#3a2a28', '#c08a70'], 300, 1, 3, 0.35); grain(g, W, H, 16);
  }),
  fur: coat => photo('fur' + coat.name, 32, 32, (g, W, H) => {
    fill(g, W, H, coat.base);
    blobs(g, W, H, [coat.light, coat.dark], 40, 10, 30, 0.25);
    if (coat.stripes) { g.globalAlpha = 0.55; g.fillStyle = coat.dark; for (let x = 0; x < W; x += W / 5) { g.beginPath(); for (let y = 0; y <= H; y += 8) g.lineTo(x + Math.sin(y * 0.06) * 12, y); for (let y = H; y >= 0; y -= 8) g.lineTo(x + 14 + Math.sin(y * 0.06) * 12, y); g.fill(); } g.globalAlpha = 1; }
    strokes(g, W, H, [coat.light, coat.dark, coat.base], 900, 10, Math.PI / 2, 0.6, 2, 0.5);
    grain(g, W, H, 14);
  }),
  catFace: (coat, expr = 'open') => photo('cf' + coat.name + expr, 48, 40, (g, W, H) => {
    fill(g, W, H, coat.base);
    g.fillStyle = radial(g, W / 2, H * 0.45, W * 0.55, coat.light, coat.base); g.fillRect(0, 0, W, H);
    if (coat.stripes) { g.globalAlpha = 0.5; g.strokeStyle = coat.dark; g.lineWidth = W * 0.025; for (const dx of [-0.08, 0, 0.08]) { g.beginPath(); g.moveTo(W * (0.5 + dx), H * 0.05); g.lineTo(W * (0.5 + dx * 0.6), H * 0.28); g.stroke(); } g.globalAlpha = 1; }
    strokes(g, W, H, [coat.light, coat.dark], 500, 12, Math.PI / 2, 1.2, 2, 0.35);
    // светлая мордочка
    g.fillStyle = radial(g, W / 2, H * 0.72, W * 0.2, coat.muzzle, 'rgba(0,0,0,0)'); g.fillRect(0, 0, W, H);
    const ex = [W * 0.33, W * 0.67], ey = H * 0.48, er = W * 0.095;
    for (const x of ex) {
      if (expr === 'closed') { g.strokeStyle = '#1a1210'; g.lineWidth = W * 0.02; g.beginPath(); g.arc(x, ey + er * 0.3, er * 0.8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); continue; }
      g.fillStyle = '#2a2018'; g.beginPath(); g.ellipse(x, ey, er * 1.15, er * 1.1, 0, 0, 7); g.fill();
      g.fillStyle = radial(g, x, ey, er, expr === 'angry' ? '#c84a2a' : coat.eye, '#2a3020'); g.beginPath(); g.ellipse(x, ey, er, er * 0.98, 0, 0, 7); g.fill();
      g.fillStyle = '#05040a'; g.beginPath(); g.ellipse(x, ey, expr === 'angry' ? er * 0.3 : er * 0.82, er * 0.9, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(x - er * 0.3, ey - er * 0.35, er * 0.22, 0, 7); g.fill();
      if (expr === 'angry') { g.strokeStyle = coat.dark; g.lineWidth = W * 0.03; g.beginPath(); g.moveTo(x - er, ey - er * 1.5 + (x < W / 2 ? -er * 0.3 : er * 0.3)); g.lineTo(x + er, ey - er * 1.5 + (x < W / 2 ? er * 0.3 : -er * 0.3)); g.stroke(); }
    }
    g.fillStyle = '#d88a8a'; g.beginPath(); g.moveTo(W * 0.46, H * 0.68); g.lineTo(W * 0.54, H * 0.68); g.lineTo(W * 0.5, H * 0.74); g.fill();
    g.strokeStyle = '#4a2a20'; g.lineWidth = W * 0.012; g.beginPath(); g.moveTo(W * 0.5, H * 0.74); g.lineTo(W * 0.5, H * 0.79); g.moveTo(W * 0.45, H * 0.82); g.quadraticCurveTo(W * 0.5, H * 0.78, W * 0.55, H * 0.82); g.stroke();
    g.strokeStyle = 'rgba(240,235,230,.6)'; g.lineWidth = W * 0.006;
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(W * (0.5 + s * 0.1), H * (0.76 + k * 0.025)); g.lineTo(W * (0.5 + s * 0.42), H * (0.7 + k * 0.06)); g.stroke(); }
    grain(g, W, H, 10);
  }),

  /* ---------- скины ---------- */
  catChest: () => photo('catChest', 16, 20, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.fillStyle = radial(g, W / 2, H * 0.35, W * 0.55, 'rgba(255,244,228,.95)', 'rgba(242,207,160,0)'); g.fillRect(0, 0, W, H);
    strokes(g, W, H, ['rgba(255,250,240,.6)', 'rgba(216,154,90,.4)'], 120, 8, Math.PI / 2, 0.8, 2, 0.5);
  }, 6),
  tvScreen: expr => pix('tv' + expr, 24, 18, (g, W, H) => {
    for (let y = 0; y < H; y++) { g.fillStyle = y < H * 0.45 ? (y % 2 ? '#1e6a3e' : '#22744a') : (y % 2 ? '#5aa83a' : '#64b444'); g.fillRect(0, y, W, 1); }
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(1, 1, W - 2, 2);
    g.fillStyle = '#0e1a10';
    const eye = (x) => {
      if (expr === 'blink') { g.fillRect(x - 2, 7, 5, 1); return; }
      if (expr === 'wow') { g.fillRect(x - 1, 5, 3, 4); return; }
      if (expr === 'dizzy') { g.fillRect(x - 2, 5, 1, 1); g.fillRect(x + 2, 5, 1, 1); g.fillRect(x - 1, 6, 3, 1); g.fillRect(x, 7, 1, 1); g.fillRect(x - 2, 8, 1, 1); g.fillRect(x + 2, 8, 1, 1); return; }
      g.fillRect(x - 2, 7, 1, 1); g.fillRect(x - 1, 6, 1, 1); g.fillRect(x, 5, 1, 1); g.fillRect(x + 1, 6, 1, 1); g.fillRect(x + 2, 7, 1, 1);
    };
    eye(7); eye(16);
    g.fillStyle = '#3e8a2e'; g.fillRect(3, 9, 3, 2); g.fillRect(18, 9, 3, 2);
    g.fillStyle = '#0e1a10';
    if (expr === 'wow') { g.fillRect(10, 11, 4, 3); }
    else { g.fillRect(8, 12, 1, 1); g.fillRect(9, 13, 2, 1); g.fillRect(11, 12, 1, 1); g.fillRect(12, 13, 2, 1); g.fillRect(14, 12, 1, 1); }
  }),
  tvBody: () => photo('tvBody', 32, 32, (g, W, H) => {
    fill(g, W, H, '#363a52'); g.fillStyle = radial(g, W * 0.3, H * 0.3, W, '#4a4e6a', '#2a2c40'); g.fillRect(0, 0, W, H);
    blobs(g, W, H, ['#22243a', '#4a4e68'], 40, 4, 14, 0.2); grain(g, W, H, 10);
  }),
  tvBezel: () => photo('tvBezel', 32, 28, (g, W, H) => {
    fill(g, W, H, '#30344a'); g.fillStyle = '#1a1c2a'; g.fillRect(W * 0.1, H * 0.1, W * 0.8, H * 0.68);
    g.fillStyle = '#6a7088'; g.fillRect(W * 0.38, H * 0.84, W * 0.24, H * 0.06); g.fillStyle = '#4a4e66'; g.fillRect(W * 0.66, H * 0.84, W * 0.06, H * 0.06);
    grain(g, W, H, 10);
  }),
  sneaker: () => photo('sneaker', 16, 16, (g, W, H) => {
    fill(g, W, H, '#d8243a'); g.fillStyle = '#7a1420'; g.fillRect(0, H * 0.7, W, H * 0.3);
    g.strokeStyle = '#f0f0f0'; g.lineWidth = W * 0.06; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(W * 0.25, H * (0.2 + i * 0.15)); g.lineTo(W * 0.75, H * (0.3 + i * 0.15)); g.moveTo(W * 0.75, H * (0.2 + i * 0.15)); g.lineTo(W * 0.25, H * (0.3 + i * 0.15)); g.stroke(); }
    grain(g, W, H, 12);
  }),
  glove: () => photo('glove', 16, 16, (g, W, H) => { fill(g, W, H, '#1e8ad0'); g.fillStyle = radial(g, W * 0.35, H * 0.3, W, '#4ab0f0', '#0a5a90'); g.fillRect(0, 0, W, H); grain(g, W, H, 12); }),
  sharkFace: () => photo('sharkFace', 48, 48, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6a82b0'); gr.addColorStop(0.32, '#8aa0c8'); gr.addColorStop(0.42, '#e8ecf4'); gr.addColorStop(1, '#c8d0e0');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0a0a14'; g.beginPath(); g.ellipse(W / 2, H * 0.6, W * 0.38, H * 0.2, 0, 0, 7); g.fill();
    g.fillStyle = '#2a1a2a'; g.beginPath(); g.ellipse(W / 2, H * 0.66, W * 0.25, H * 0.09, 0, 0, 7); g.fill();
    g.fillStyle = '#f4f4f8';
    for (let i = 0; i < 5; i++) { const x = W * (0.2 + i * 0.15); g.beginPath(); g.moveTo(x - W * 0.06, H * 0.43); g.lineTo(x + W * 0.06, H * 0.43); g.lineTo(x, H * 0.55); g.fill(); }
    for (let i = 0; i < 4; i++) { const x = W * (0.28 + i * 0.15); g.beginPath(); g.moveTo(x - W * 0.05, H * 0.79); g.lineTo(x + W * 0.05, H * 0.79); g.lineTo(x, H * 0.69); g.fill(); }
    g.fillStyle = '#10101a'; for (const x of [0.12, 0.88]) { g.beginPath(); g.arc(W * x, H * 0.33, W * 0.045, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.7)'; for (const x of [0.11, 0.87]) { g.beginPath(); g.arc(W * x, H * 0.32, W * 0.012, 0, 7); g.fill(); }
    grain(g, W, H, 10);
  }),
  // лягушка-рептилоид: пятнистая зелёная кожа, широкая морда, камуфляжная кепка, рубашка с кожаной портупеей
  // лягушка-рептилоид: ровная зелёная кожа с тёмными пятнами-пигментацией (со светлой каймой)
  frogSkin: () => photo('frogSkin', 32, 32, (g, W, H) => { fill(g, W, H, '#4a9a3e'); frogSpots(g, W, H, 12); grain(g, W, H, 8); }),
  frogFace: (expr = 'open') => photo('frogFace' + expr, 48, 40, (g, W, H) => {
    fill(g, W, H, '#4a9a3e');
    frogSpots(g, W, H, 7, [[0, 0, W, H * 0.2], [0, 0, W * 0.12, H], [W * 0.88, 0, W, H]]);
    for (const [x, px] of [[0.2, 0.32], [0.64, 0.64]]) {
      if (expr === 'closed') { g.fillStyle = '#1a2a14'; g.fillRect(W * x, H * 0.36, W * 0.16, H * 0.05); continue; }
      g.fillStyle = '#17111f'; g.fillRect(W * x - 1, H * 0.22 - 1, W * 0.16 + 2, H * 0.24 + 2);
      g.fillStyle = '#f1f1ea'; g.fillRect(W * x, H * 0.22, W * 0.16, H * 0.24);
      g.fillStyle = '#17111f'; g.fillRect(W * px, H * 0.28, W * 0.06, H * (expr === 'wow' ? 0.16 : 0.12));
    }
    g.fillStyle = '#1a2a14'; g.fillRect(W * 0.14, H * 0.6, W * 0.72, H * 0.05); g.fillRect(W * 0.12, H * 0.55, W * 0.05, H * 0.08); g.fillRect(W * 0.83, H * 0.55, W * 0.05, H * 0.08);
    if (expr === 'wow') { g.fillStyle = '#5a1a2a'; g.fillRect(W * 0.4, H * 0.62, W * 0.2, H * 0.12); }
    grain(g, W, H, 8);
  }),
  // панамка песочного цвета с жёлтыми уточками
  duckHat: () => photo('duckHat', 48, 24, (g, W, H) => { fill(g, W, H, '#a8986a'); blobs(g, W, H, ['#98885a', '#b8a87a'], 60, 1, 3, 0.5);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) { const x = W * (0.14 + i * 0.33 + r * 0.16), y = H * (0.34 + r * 0.4), u = W * 0.055;
      g.fillStyle = '#f5c542'; g.beginPath(); g.ellipse(x, y, u * 1.3, u * 0.9, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + u * 1.1, y - u * 0.9, u * 0.65, 0, 7); g.fill();
      g.fillStyle = '#ff8a1f'; g.fillRect(x + u * 1.6, y - u, u * 0.7, u * 0.35); g.fillStyle = '#17111f'; g.fillRect(x + u * 1.2, y - u * 1.1, u * 0.25, u * 0.25); }
    g.fillStyle = 'rgba(90,70,40,.5)'; g.fillRect(0, H * 0.94, W, H * 0.06); grain(g, W, H, 10); }),
  // полоса панамки: одна уточка на плитку (плитка повторяется по кругу — уточки не растягиваются)
  duckTile: () => photo('duckTile', 32, 14, (g, W, H) => { fill(g, W, H, '#a8986a'); blobs(g, W, H, ['#98885a', '#b8a87a'], 30, 1, 3, 0.5);
    const x = W * 0.45, y = H * 0.58, u = H * 0.2;
    g.fillStyle = '#f5c542'; g.beginPath(); g.ellipse(x, y, u * 1.4, u * 0.95, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + u * 1.15, y - u * 0.95, u * 0.7, 0, 7); g.fill();
    g.fillStyle = '#ff8a1f'; g.fillRect(x + u * 1.7, y - u * 1.1, u * 0.8, u * 0.4); g.fillStyle = '#17111f'; g.fillRect(x + u * 1.25, y - u * 1.2, u * 0.3, u * 0.3); grain(g, W, H, 8); }),
  // кусок коричневой ткани с рваным краем и строчкой (альфа — рваный низ)
  boot: () => photo('boot', 24, 24, (g, W, H) => { fill(g, W, H, '#5a3a24'); blobs(g, W, H, ['#4a2e1a', '#6a4a2e', '#3a2414'], 60, 1, 3, 0.7); g.fillStyle = '#2a1a10'; g.fillRect(0, H * 0.82, W, H * 0.18); grain(g, W, H, 14); }),
  rag: () => photo('rag', 32, 32, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#6a4428'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0);
    for (let x = W; x >= 0; x -= W / 8) g.lineTo(x, H * (0.78 + Math.random() * 0.2)); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-atop'; blobs(g, W, H, ['#5a3820', '#7a5232', '#4a2e18'], 80, 1, 4, 0.7); strokes(g, W, H, ['#4a2e18', '#8a6238'], 50, 10, 1.57, 0.2, 1, 0.5);
    g.fillStyle = '#c8a070'; for (let x = 2; x < W; x += 4) g.fillRect(x, H * 0.08, 2, 1); g.globalCompositeOperation = 'source-over'; }),
  frogShirt: () => photo('frogShirt', 32, 32, (g, W, H) => { fill(g, W, H, '#9a8f5e'); blobs(g, W, H, ['#8a7f50', '#aaa06c', '#7a7046'], 120, 1, 4, 0.55);
    g.fillStyle = '#7a7046'; g.fillRect(W * 0.49, 0, W * 0.03, H); g.fillStyle = '#3a3428'; for (const y of [0.2, 0.42, 0.64]) g.fillRect(W * 0.53, H * y, W * 0.04, W * 0.04);
    g.fillStyle = '#8a7f50'; g.fillRect(W * 0.12, H * 0.18, W * 0.24, H * 0.22); g.fillStyle = '#6a6040'; g.fillRect(W * 0.12, H * 0.18, W * 0.24, H * 0.05);
    g.fillStyle = '#5a3a24'; g.save(); g.translate(W / 2, H / 2); g.rotate(-0.75); g.fillRect(-W, -H * 0.07, W * 2, H * 0.14); g.restore();
    g.fillStyle = '#c8a040'; g.fillRect(W * 0.62, H * 0.3, W * 0.06, W * 0.06); grain(g, W, H, 12); }),
  pants: () => photo('pants', 32, 16, (g, W, H) => { fill(g, W, H, '#5a5a62'); blobs(g, W, H, ['#4a4a52', '#6a6a72'], 60, 1, 3, 0.6); g.fillStyle = '#44444c'; g.fillRect(W * 0.08, H * 0.35, W * 0.2, H * 0.4); g.fillRect(W * 0.72, H * 0.35, W * 0.2, H * 0.4); grain(g, W, H, 12); }),
  sharkSkin: () => photo('sharkSkin', 32, 32, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5a72a0'); gr.addColorStop(0.6, '#7a92c0'); gr.addColorStop(0.75, '#d8e0ee'); gr.addColorStop(1, '#c8d0e0');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); blobs(g, W, H, ['#4a6290', '#8aa2d0'], 40, 4, 14, 0.2); grain(g, W, H, 12);
  }),
  headphone: () => photo('headphone', 16, 16, (g, W, H) => { fill(g, W, H, '#3a3a40'); g.fillStyle = radial(g, W * 0.35, H * 0.3, W, '#6a6a72', '#1a1a20'); g.fillRect(0, 0, W, H); grain(g, W, H, 16); }),
  tunic: () => photo('tunic', 32, 32, (g, W, H) => {
    fill(g, W, H, '#2c3e9a'); blobs(g, W, H, ['#22328a', '#3a4eb0'], 40, 6, 18, 0.3);
    g.fillStyle = '#7a8ae0'; g.fillRect(0, H * 0.35, W, H * 0.06); g.fillRect(0, H * 0.52, W, H * 0.06); grain(g, W, H, 12);
  }),

  /* ---------- предметы ---------- */
  pumpkin: () => photo('pumpkin', 32, 32, (g, W, H) => {
    fill(g, W, H, '#e0701a'); for (let x = 0; x < W; x += W / 6) { const gr = g.createLinearGradient(x, 0, x + W / 6, 0); gr.addColorStop(0, '#a8480c'); gr.addColorStop(0.5, '#f08a2a'); gr.addColorStop(1, '#a8480c'); g.fillStyle = gr; g.fillRect(x, 0, W / 6, H); }
    grain(g, W, H, 12);
  }),
  pumpkinFace: () => pix('pumpkinFace', 16, 16, (g) => {
    g.fillStyle = '#ffd25c';
    g.beginPath(); g.moveTo(2, 7); g.lineTo(4.5, 3); g.lineTo(7, 7); g.fill(); g.beginPath(); g.moveTo(9, 7); g.lineTo(11.5, 3); g.lineTo(14, 7); g.fill();
    g.fillRect(3, 10, 10, 3); g.clearRect(5, 10, 2, 1); g.clearRect(9, 12, 2, 1);
  }),
  tomato: () => photo('tomato', 16, 16, (g, W, H) => { g.fillStyle = radial(g, W * 0.35, H * 0.35, W * 0.8, '#ff6a4a', '#8a120a'); g.fillRect(0, 0, W, H); grain(g, W, H, 10); }),
  ball: () => photo('ball', 32, 32, (g, W, H) => {
    fill(g, W, H, '#d86a1a'); blobs(g, W, H, ['#c05a12', '#e87a2a'], 200, 1, 3, 0.6);
    g.strokeStyle = '#1a0e08'; g.lineWidth = W * 0.03; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    g.beginPath(); g.arc(0, H / 2, W * 0.35, -1.2, 1.2); g.stroke(); g.beginPath(); g.arc(W, H / 2, W * 0.35, 1.94, 4.34); g.stroke();
  }),
  balloon: () => photo('balloon', 16, 16, (g, W, H) => { g.fillStyle = radial(g, W * 0.32, H * 0.3, W * 0.85, '#bfe8ff', '#1a5ab0'); g.fillRect(0, 0, W, H); }),
  brickItem: () => photo('brickItem', 16, 16, (g, W, H) => { fill(g, W, H, '#a04a32'); blobs(g, W, H, ['#7a3422', '#c06a4a', '#5a2a1e'], 50, 1, 5, 0.6); grain(g, W, H, 26); }),
  crate: () => photo('crate', 64, 64, (g, W, H) => {
    // ящик из досок: горизонтальные доски с зазорами, по краям рамка
    fill(g, W, H, '#2a1a0e'); const n = 5, s2 = H / n;
    for (let i = 0; i < n; i++) { g.fillStyle = shade(0x9a7040, (R() - 0.5) * 36); g.fillRect(0, i * s2 + 3, W, s2 - 6); }
    strokes(g, W, H, ['#6a4a2a', '#b08a58', '#5a3a1e'], 260, 60, 0, 0.06, 2, 0.4);
    g.fillStyle = '#6a4826'; const b = W * 0.13; g.fillRect(0, 0, b, H); g.fillRect(W - b, 0, b, H);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(b, 0, 3, H); g.fillRect(W - b - 3, 0, 3, H);
    g.fillStyle = '#1a120a'; for (let i = 0; i < n; i++) for (const x of [b / 2, W - b / 2]) g.fillRect(x - 2, i * s2 + s2 / 2 - 2, 4, 4);
    g.fillStyle = 'rgba(30,20,10,.55)'; g.font = `bold ${W * 0.13}px monospace`; g.textAlign = 'center'; g.fillText('FRAGILE', W / 2, H * 0.56);
    grain(g, W, H, 14);
  }),
  // сетка тележки (прозрачная, только прутья)
  wire: () => pix('wire', 32, 32, (g, W, H) => { g.fillStyle = '#c8ccd6'; for (let i = 0; i < W; i += 4) { g.fillRect(i, 0, 1, H); g.fillRect(0, i, W, 1); } }),
  binBody: (c = 0x2e5a44) => photo('bin' + c, 32, 48, (g, W, H) => {
    for (let x = 0; x < W; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, shade(c, -30)); gr.addColorStop(0.5, shade(c, 25)); gr.addColorStop(1, shade(c, -30)); g.fillStyle = gr; g.fillRect(x, 0, 8, H); }
    g.fillStyle = shade(c, -45); g.fillRect(0, 0, W, H * 0.08); g.fillRect(0, H * 0.92, W, H * 0.08);
    g.fillStyle = '#e8e2d4'; g.fillRect(W * 0.2, H * 0.3, W * 0.6, H * 0.22); g.fillStyle = shade(c, 0); g.font = `bold ${W * 0.22}px sans-serif`; g.textAlign = 'center'; g.fillText('♻', W / 2, H * 0.47);
    blobs(g, W, H, ['#1a1a1a', '#6a5a4a'], 30, 2, 8, 0.25); grain(g, W, H, 14);
  }),
  soil: () => photo('soil', 32, 32, (g, W, H) => { fill(g, W, H, '#2e2018'); blobs(g, W, H, ['#4a3424', '#1e140e', '#5a4030', '#6a4a2a'], 500, 1, 5, 0.75); strokes(g, W, H, ['#7a5a34'], 40, 10, 0, 3, 2, 0.5); grain(g, W, H, 16); }),
  planter: () => photo('planter', 32, 32, (g, W, H) => {
    fill(g, W, H, '#8a8494'); blobs(g, W, H, ['#7a7486', '#9a94a4', '#6a6476'], 80, 4, 16, 0.3);
    g.fillStyle = 'rgba(40,34,48,.35)'; for (let i = 0; i < 6; i++) g.fillRect(R() * W, H * 0.2, 2, H * 0.8);
    g.fillStyle = 'rgba(30,26,36,.5)'; g.fillRect(0, H - 4, W, 4); grain(g, W, H, 20);
  }),
  trashBag: () => photo('trashBag', 16, 16, (g, W, H) => { fill(g, W, H, '#16141a'); strokes(g, W, H, ['#3a3844', '#0a080c', '#4a4854'], 40, 20, 1, 2, 3, 0.6); grain(g, W, H, 10); }),
  produce: kind => photo('prod' + kind, 32, 16, (g, W, H) => {
    fill(g, W, H, '#3a2618');
    const c = kind === 'tomato' ? ['#d8301a', '#ff5a3a', '#a01a0a'] : kind === 'apple' ? ['#9ab83a', '#c8d84a', '#6a8a2a'] : kind === 'carrot' ? ['#ff8a1f', '#e86a10'] : ['#e8731a', '#f08a2a', '#b8520c'];
    for (let i = 0; i < 40; i++) { g.fillStyle = c[(R() * c.length) | 0]; g.beginPath(); g.arc(R() * W, R() * H, W * 0.07, 0, 7); g.fill(); }
    grain(g, W, H, 12);
  }),
  goods: () => photo('goods', 32, 32, (g, W, H) => {
    fill(g, W, H, '#3a3046'); const cols = ['#e84a3a', '#f5c542', '#4ab0f0', '#9be36b', '#ff8a1f', '#f1e8ff', '#b18cff'];
    for (let r = 0; r < 3; r++) { g.fillStyle = '#6a5a4a'; g.fillRect(0, (r + 1) * H / 3 - 3, W, 3); for (let x = 2; x < W - 4; x += 6 + R() * 6) { const h = 8 + R() * 14; g.fillStyle = cols[(R() * cols.length) | 0]; g.fillRect(x, (r + 1) * H / 3 - 3 - h, 5 + R() * 4, h); } }
    grain(g, W, H, 12);
  }),
  carSide: c => photo('car' + c, 32, 16, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, shade(c, 40)); gr.addColorStop(0.5, shade(c, 0)); gr.addColorStop(1, shade(c, -50));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = shade(c, -70); g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.48, 0); g.lineTo(W * 0.48, H); g.stroke();
    g.fillStyle = '#d8d8e0'; g.fillRect(W * 0.38, H * 0.3, W * 0.06, H * 0.08); g.fillRect(W * 0.62, H * 0.3, W * 0.06, H * 0.08);
    g.fillStyle = '#16121c'; for (const x of [0.2, 0.8]) { g.beginPath(); g.arc(W * x, H, H * 0.55, Math.PI, 0); g.fill(); }
    grain(g, W, H, 10);
  }),
  carGlass: c => photo('cg' + c, 32, 16, (g, W, H) => {
    fill(g, W, H, shade(c, -10)); const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#5a7aa0'); gr.addColorStop(0.5, '#1a2236'); gr.addColorStop(1, '#3a4a68');
    g.fillStyle = gr; g.fillRect(W * 0.08, H * 0.12, W * 0.84, H * 0.76); g.fillStyle = shade(c, -10); g.fillRect(W * 0.48, 0, W * 0.04, H);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(W * 0.2, H * 0.12); g.lineTo(W * 0.3, H * 0.12); g.lineTo(W * 0.15, H * 0.88); g.lineTo(W * 0.08, H * 0.88); g.fill();
  }),
  // Детали утилитарных объектов нарисованы в текстуре, а не россыпью мелких кубов.
  vent: (c = 0xa8a8b0) => photo('vent' + c, 32, 24, (g, W, H) => {
    fill(g, W, H, shade(c, -10));
    g.fillStyle = '#34313f'; g.beginPath(); g.arc(W * 0.34, H * 0.5, H * 0.37, 0, 7); g.fill();
    g.strokeStyle = '#777683'; g.lineWidth = W * 0.025;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(W * 0.34, H * 0.5); g.lineTo(W * 0.34 + Math.cos(a) * H * 0.33, H * 0.5 + Math.sin(a) * H * 0.33); g.stroke(); }
    g.fillStyle = '#a6a3ad'; g.beginPath(); g.arc(W * 0.34, H * 0.5, H * 0.075, 0, 7); g.fill();
    for (let y = 0.2; y < 0.9; y += 0.13) { g.fillStyle = '#4b4656'; g.fillRect(W * 0.71, H * y, W * 0.22, H * 0.055); }
    grain(g, W, H, 8);
  }),
  cabinet: (c = 0x6a6d78) => photo('cabinet' + c, 32, 48, (g, W, H) => {
    fill(g, W, H, shade(c, 0)); g.strokeStyle = shade(c, -45); g.lineWidth = W * 0.025;
    g.strokeRect(W * 0.06, H * 0.04, W * 0.88, H * 0.91); g.beginPath(); g.moveTo(W / 2, H * 0.05); g.lineTo(W / 2, H * 0.94); g.stroke();
    g.fillStyle = '#d1c7bd'; g.fillRect(W * 0.42, H * 0.45, W * 0.05, H * 0.12); g.fillRect(W * 0.55, H * 0.45, W * 0.05, H * 0.12);
    for (const x of [0.12, 0.62]) for (let y = 0.12; y < 0.27; y += 0.04) { g.fillStyle = shade(c, -40); g.fillRect(W * x, H * y, W * 0.25, H * 0.015); }
    grain(g, W, H, 9);
  }),
  containerEnd: c => photo('containerEnd' + c, 32, 32, (g, W, H) => {
    fill(g, W, H, shade(c, 0)); g.strokeStyle = shade(c, -50); g.lineWidth = W * 0.035;
    g.strokeRect(W * 0.05, H * 0.04, W * 0.9, H * 0.92); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
    g.fillStyle = '#8a8790';
    for (const x of [0.24, 0.76]) { g.fillRect(W * x, H * 0.08, W * 0.025, H * 0.84); g.fillRect(W * (x - 0.07), H * 0.58, W * 0.13, H * 0.035); }
    for (const x of [0.05, 0.86]) for (const y of [0.22, 0.75]) { g.fillStyle = shade(c, -35); g.fillRect(W * x, H * y, W * 0.09, H * 0.06); }
    blobs(g, W, H, ['#70452d'], 20, 2, 9, 0.25); grain(g, W, H, 8);
  }),
  busSide: c => photo('busSide' + c, 64, 24, (g, W, H) => {
    fill(g, W, H, shade(c, 0)); g.fillStyle = '#e4d9c2'; g.fillRect(0, H * 0.62, W, H * 0.07);
    for (let i = 0; i < 7; i++) { const x = W * (0.035 + i * 0.13); g.fillStyle = '#222233'; g.fillRect(x, H * 0.12, W * 0.112, H * 0.42); g.fillStyle = '#63758a'; g.fillRect(x + W * 0.007, H * 0.15, W * 0.035, H * 0.32); }
    g.strokeStyle = '#3b303a'; g.lineWidth = W * 0.012; g.strokeRect(W * 0.73, H * 0.1, W * 0.18, H * 0.86);
    for (const x of [0.2, 0.8]) { g.fillStyle = '#16121c'; g.beginPath(); g.arc(W * x, H, H * 0.27, Math.PI, 0); g.fill(); }
    grain(g, W, H, 8);
  }),
  busFront: c => photo('busFront' + c, 32, 32, (g, W, H) => {
    fill(g, W, H, shade(c, 0)); g.fillStyle = '#1d2436'; g.fillRect(W * 0.08, H * 0.15, W * 0.84, H * 0.42);
    g.fillStyle = '#d3bb73'; g.fillRect(W * 0.17, H * 0.04, W * 0.66, H * 0.07);
    g.fillStyle = '#37323f'; g.fillRect(W * 0.28, H * 0.72, W * 0.44, H * 0.15);
    for (const x of [0.08, 0.78]) { g.fillStyle = '#fff1bf'; g.fillRect(W * x, H * 0.74, W * 0.14, H * 0.09); }
    g.strokeStyle = '#11121c'; g.lineWidth = W * 0.025; g.beginPath(); g.moveTo(W * 0.2, H * 0.54); g.lineTo(W * 0.5, H * 0.39); g.moveTo(W * 0.6, H * 0.54); g.lineTo(W * 0.87, H * 0.39); g.stroke();
    grain(g, W, H, 8);
  }),
  busRear: c => photo('busRear' + c, 32, 32, (g, W, H) => {
    fill(g, W, H, shade(c, -10)); g.fillStyle = '#1d2436'; g.fillRect(W * 0.12, H * 0.12, W * 0.76, H * 0.3);
    g.fillStyle = '#37323f'; g.fillRect(W * 0.3, H * 0.55, W * 0.4, H * 0.12); g.fillStyle = '#e8e2d4'; g.fillRect(W * 0.38, H * 0.57, W * 0.24, H * 0.08);
    for (const x of [0.06, 0.8]) { g.fillStyle = '#d8243a'; g.fillRect(W * x, H * 0.62, W * 0.14, H * 0.14); g.fillStyle = '#f5a030'; g.fillRect(W * x, H * 0.78, W * 0.14, H * 0.06); }
    g.fillStyle = shade(c, -45); g.fillRect(0, H * 0.88, W, H * 0.12); grain(g, W, H, 8);
  }),
  hay: () => photo('hay', 32, 32, (g, W, H) => { fill(g, W, H, '#b8913a'); strokes(g, W, H, ['#d8b050', '#8a6a24', '#e8c868', '#6a5018'], 700, 14, 0, 0.5, 2, 0.6);
    g.fillStyle = 'rgba(60,40,10,.6)'; g.fillRect(W * 0.28, 0, W * 0.05, H); g.fillRect(W * 0.68, 0, W * 0.05, H); grain(g, W, H, 14); }),
  potty: () => photo('potty', 24, 48, (g, W, H) => { fill(g, W, H, '#2a7ac8'); g.fillStyle = '#1e5a98'; g.fillRect(W * 0.1, H * 0.06, W * 0.8, H * 0.9);
    g.fillStyle = '#9be36b'; g.fillRect(W * 0.62, H * 0.5, W * 0.18, H * 0.05); g.fillStyle = '#f1e8ff'; g.font = `bold ${W * 0.22}px sans-serif`; g.textAlign = 'center'; g.fillText('WC', W / 2, H * 0.2);
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W * 0.3, H * (0.26 + i * 0.03), W * 0.4, H * 0.012); } grain(g, W, H, 10); }),
  cementBag: () => photo('cementBag', 24, 16, (g, W, H) => { fill(g, W, H, '#c8bca0'); g.fillStyle = '#d8243a'; g.fillRect(W * 0.1, H * 0.3, W * 0.8, H * 0.35); g.fillStyle = '#f1e8ff'; g.font = `bold ${H * 0.28}px sans-serif`; g.textAlign = 'center'; g.fillText('M500', W / 2, H * 0.57); grain(g, W, H, 16); }),
  fuelPump: () => photo('fuelPump', 32, 48, (g, W, H) => {
    fill(g, W, H, '#d1cec9'); g.fillStyle = '#c82d35'; g.fillRect(0, H * 0.76, W, H * 0.24);
    g.fillStyle = '#262837'; g.fillRect(W * 0.12, H * 0.1, W * 0.76, H * 0.34);
    g.fillStyle = '#b8d0aa'; g.font = `bold ${W * 0.2}px monospace`; g.textAlign = 'center'; g.fillText('59.90', W / 2, H * 0.26); g.fillText('95', W / 2, H * 0.41);
    g.fillStyle = '#4a4c58'; g.fillRect(W * 0.17, H * 0.53, W * 0.34, H * 0.1);
    for (let i = 0; i < 3; i++) { g.fillStyle = ['#9ab878', '#e7ba62', '#bf5959'][i]; g.fillRect(W * (0.58 + i * 0.1), H * 0.53, W * 0.07, H * 0.1); }
    grain(g, W, H, 8);
  }),
  parkingMeter: () => photo('parkingMeter', 24, 48, (g, W, H) => {
    fill(g, W, H, '#305c88'); g.fillStyle = '#e1e1d6'; g.font = `bold ${W * 0.75}px sans-serif`; g.textAlign = 'center'; g.fillText('P', W / 2, H * 0.34);
    g.fillStyle = '#152934'; g.fillRect(W * 0.16, H * 0.44, W * 0.68, H * 0.18); g.fillStyle = '#a2c99a'; g.fillRect(W * 0.22, H * 0.48, W * 0.5, H * 0.07);
    g.fillStyle = '#151823'; g.fillRect(W * 0.22, H * 0.73, W * 0.4, H * 0.035); g.fillStyle = '#e8bd65'; g.fillRect(W * 0.7, H * 0.7, W * 0.1, H * 0.1); grain(g, W, H, 8);
  }),
  chainlink: () => pix('chainlink', 32, 32, (g, W, H) => {
    g.strokeStyle = 'rgba(175,175,185,.8)'; g.lineWidth = 1;
    for (let x = -W; x < W * 2; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + W, H); g.moveTo(x, 0); g.lineTo(x - W, H); g.stroke(); }
  }),
  grill: () => photo('grill', 32, 24, (g, W, H) => {
    fill(g, W, H, '#37333b'); for (let y = 0.1; y < 0.95; y += 0.12) { g.fillStyle = '#8b7a70'; g.fillRect(W * 0.05, H * y, W * 0.9, H * 0.035); }
    blobs(g, W, H, ['#ba6b35', '#51382f'], 14, 4, 12, 0.35); grain(g, W, H, 8);
  }),
  laundry: c => photo('laundry' + c, 24, 24, (g, W, H) => {
    g.fillStyle = shade(c, 0); g.beginPath(); [[0.25, 0.08], [0.4, 0.02], [0.6, 0.02], [0.75, 0.08], [1, 0.35], [0.8, 0.5], [0.73, 0.38], [0.73, 0.96], [0.27, 0.96], [0.27, 0.38], [0.2, 0.5], [0, 0.35]].forEach(([x, y]) => g.lineTo(W * x, H * y)); g.closePath(); g.fill();
    g.strokeStyle = shade(c, -40); g.lineWidth = W * 0.04; g.beginPath(); g.arc(W / 2, 0, W * 0.11, 0, Math.PI); g.stroke();
  }),
  vending: () => photo('vending', 32, 48, (g, W, H) => {
    fill(g, W, H, '#c82a3a'); g.fillStyle = '#1a1424'; g.fillRect(W * 0.08, H * 0.08, W * 0.6, H * 0.62);
    const cols = ['#4ab0f0', '#f5c542', '#9be36b', '#ff8a1f'];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = cols[(r + c) % 4]; g.fillRect(W * (0.12 + c * 0.14), H * (0.12 + r * 0.14), W * 0.09, H * 0.1); }
    g.fillStyle = '#e8e0f0'; g.fillRect(W * 0.74, H * 0.12, W * 0.18, H * 0.3); g.fillStyle = '#1a1424'; g.fillRect(W * 0.12, H * 0.76, W * 0.52, H * 0.12);
    g.fillStyle = '#fff'; g.font = `bold ${W * 0.16}px sans-serif`; g.fillText('COLA', W * 0.12, H * 0.98);
    grain(g, W, H, 10);
  }),
  chalkboard: () => photo('chalk', 48, 24, (g, W, H) => {
    fill(g, W, H, '#5a3a24'); g.fillStyle = '#1e3a2a'; g.fillRect(W * 0.04, H * 0.08, W * 0.92, H * 0.84);
    g.strokeStyle = 'rgba(240,240,230,.75)'; g.lineWidth = W * 0.008; g.font = `${H * 0.22}px serif`; g.fillStyle = 'rgba(240,240,230,.8)';
    g.fillText('2 + 2 = 🐈', W * 0.1, H * 0.4); g.fillText('ДЗ: стр. 31', W * 0.1, H * 0.75); grain(g, W, H, 10);
  }),
  mailbox: () => photo('mailbox', 32, 24, (g, W, H) => {
    fill(g, W, H, '#4a6a5a'); for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { g.fillStyle = '#2a3a32'; g.fillRect(c * W / 5 + 2, r * H / 3 + 2, W / 5 - 4, H / 3 - 4); g.fillStyle = '#c8c8b8'; g.fillRect(c * W / 5 + 5, r * H / 3 + 5, W / 5 - 10, 3); }
    grain(g, W, H, 12);
  }),
  sign: (text, bg, fg) => pix('sign' + text + bg, 64, 16, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, H - 2, W, 2);
    g.fillStyle = fg; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 1);
  }),
  awning: (a, b) => pix('aw' + a + b, 16, 8, (g, W, H) => { for (let x = 0; x < W; x += 4) { g.fillStyle = x % 8 ? b : a; g.fillRect(x, 0, 4, H); } g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, H - 2, W, 2); }),
  stripe: () => pix('stripe', 16, 4, (g, W, H) => { for (let x = 0; x < W; x += 4) { g.fillStyle = x % 8 ? '#f1e8ff' : '#d8243a'; g.fillRect(x, 0, 4, H); } }),
  hazard: () => pix('hazard', 16, 4, (g, W, H) => { for (let x = -4; x < W; x += 4) { g.fillStyle = (x / 4) % 2 ? '#17111f' : '#f5c542'; g.beginPath(); g.moveTo(x, H); g.lineTo(x + 2, 0); g.lineTo(x + 4, 0); g.lineTo(x + 2, H); g.fill(); } }),
  screen: () => photo('monitor', 16, 12, (g, W, H) => { fill(g, W, H, '#1a2a3a'); g.fillStyle = radial(g, W / 2, H / 2, W, '#4a8ab0', '#0a1a2a'); g.fillRect(W * 0.1, H * 0.1, W * 0.8, H * 0.8); }),

  /* ---------- эффекты (с прозрачностью) ---------- */
  light: () => photo('lightpool', 32, 32, (g, W, H) => { g.fillStyle = radial(g, W / 2, H / 2, W / 2, 'rgba(255,170,90,.55)', 'rgba(255,140,60,0)'); g.fillRect(0, 0, W, H); }, 4),
  puff: () => pix('puff', 16, 16, (g, W, H) => {
    const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5; if (d < 1 && (1 - d) * 16 > B[y % 4][x % 4]) { g.fillStyle = d < 0.5 ? '#ffffff' : '#cfc8dc'; g.fillRect(x, y, 1, 1); } }
  }),
  splat: c => photo('splat' + c, 32, 32, (g, W, H) => {
    g.fillStyle = c; for (let i = 0; i < 14; i++) { const a = R() * 7, d = R() * W * 0.32; g.beginPath(); g.arc(W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d, W * (0.06 + R() * 0.12), 0, 7); g.fill(); }
    g.beginPath(); g.arc(W / 2, H / 2, W * 0.22, 0, 7); g.fill();
  }, 4),
  web: () => pix('web', 32, 32, (g, W, H) => {
    g.strokeStyle = 'rgba(230,230,240,.8)'; g.lineWidth = 1;
    for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * W, Math.sin(a) * H); g.stroke(); }
    for (let r = 6; r < W; r += 6) { g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2, rr = r * (0.9 + (i % 2) * 0.1); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); }
  }),
  fog: () => photo('fog', 32, 32, (g, W, H) => { g.fillStyle = radial(g, W / 2, H / 2, W / 2, 'rgba(210,200,230,.5)', 'rgba(210,200,230,0)'); g.fillRect(0, 0, W, H); }, 4),
  dot: () => pix('dot', 6, 6, (g) => { g.fillStyle = '#ffffff'; g.fillRect(1, 0, 4, 6); g.fillRect(0, 1, 6, 4); }),
  star: () => pix('star', 9, 9, (g) => { g.fillStyle = '#f5c542'; g.fillRect(4, 0, 1, 9); g.fillRect(0, 4, 9, 1); g.fillRect(3, 3, 3, 3); g.fillStyle = '#fff'; g.fillRect(4, 4, 1, 1); }),
  puzzle: () => photo('puzzleImg', 48, 48, (g, W, H) => {
    const s = W / 96; g.scale(s, s);
    g.fillStyle = '#3a2458'; g.fillRect(0, 0, 96, 96); g.fillStyle = '#2a1f3d'; g.fillRect(0, 70, 96, 26);
    g.fillStyle = '#f1e8ff'; g.beginPath(); g.arc(76, 18, 11, 0, 7); g.fill(); g.fillStyle = '#3a2458'; g.beginPath(); g.arc(71, 15, 10, 0, 7); g.fill();
    g.fillStyle = '#f5c542'; [[12, 10], [30, 22], [52, 8], [20, 40]].forEach(([x, y]) => g.fillRect(x, y, 3, 3));
    g.fillStyle = '#e8731a'; g.beginPath(); g.ellipse(46, 62, 30, 24, 0, 0, 7); g.fill(); g.fillStyle = '#c75a10'; g.fillRect(44, 40, 4, 44);
    g.fillStyle = '#3f6b2a'; g.fillRect(44, 32, 5, 9); g.fillStyle = '#ffd25c';
    g.beginPath(); g.moveTo(30, 58); g.lineTo(38, 48); g.lineTo(42, 58); g.fill(); g.beginPath(); g.moveTo(52, 58); g.lineTo(58, 48); g.lineTo(64, 58); g.fill();
    g.fillRect(30, 68, 34, 6); g.fillStyle = '#9be36b'; g.fillRect(6, 82, 10, 6); g.fillRect(80, 80, 8, 8);
  }, 2),
  tttTop: () => photo('ttt', 32, 32, (g, W, H) => {
    fill(g, W, H, '#8d879a'); blobs(g, W, H, ['#6e6880', '#9e98aa'], 60, 3, 14, 0.35);
    g.fillStyle = '#2a2236'; const t = W * 0.035; g.fillRect(W / 3 - t, 2, t * 2, H - 4); g.fillRect(2 * W / 3 - t, 2, t * 2, H - 4); g.fillRect(2, H / 3 - t, W - 4, t * 2); g.fillRect(2, 2 * H / 3 - t, W - 4, t * 2);
    grain(g, W, H, 20);
  }),
};

/* ---------- фасад с окнами (уникальный под каждую стену) ---------- */
let facN = 0;
export function facade(base, wM, hM, opt = {}) {
  const pw = Math.max(8, Math.round(wM * 6)), ph = Math.max(8, Math.round(hM * 6));
  const brick = opt.brick !== false;
  return photo(null, pw, ph, (g, W, H) => {
    const s = W / pw; // пикселей hi-res на 1 px текстуры
    g.fillStyle = shade(base, -10); g.fillRect(0, 0, W, H);
    if (brick) {
      const bh = 3 * s, bw = 6 * s;
      for (let y = 0, r = 0; y < H; y += bh, r++) for (let x = -bw; x < W; x += bw) {
        g.fillStyle = shade(base, (R() - 0.5) * 26); g.fillRect(x + (r % 2 ? bw / 2 : 0) + s * 0.4, y + s * 0.4, bw - s * 0.8, bh - s * 0.8);
      }
    } else blobs(g, W, H, [shade(base, -20), shade(base, 15)], 60, s * 2, s * 8, 0.3);
    blobs(g, W, H, ['rgba(20,14,26,.6)'], 18, s * 2, s * 10, 0.15);
    // окна
    if (opt.windows !== false) {
      const per = 6; // м на этаж-ряд ~2.4
      const rs = opt.rowStep || 2.4, r0 = opt.rowStart ?? 0.9;
      for (let fy = r0; fy < hM - 1.3; fy += rs) for (let fx = 0.7; fx < wM - 1; fx += 2.0) {
        if (opt.door && fy < 2.2 && fx + 1.1 > opt.door[0] && fx - 0.2 < opt.door[1]) continue;
        const x = fx * per * s, y = (hM - fy - 1.4) * per * s, w = 6 * s, h = 7.5 * s;
        g.fillStyle = '#1a1420'; g.fillRect(x - s, y - s, w + 2 * s, h + 2 * s);
        const lit = R() < (opt.lit ?? 0.45);
        const gr = g.createLinearGradient(x, y, x + w, y + h);
        if (lit) { gr.addColorStop(0, '#ffd28a'); gr.addColorStop(1, SEASON.lit); }
        else { gr.addColorStop(0, '#4a5a7a'); gr.addColorStop(0.6, '#1e2232'); gr.addColorStop(1, '#2a3048'); }
        g.fillStyle = gr; g.fillRect(x, y, w, h);
        if (lit && R() < 0.5) { g.fillStyle = 'rgba(120,40,20,.45)'; g.fillRect(x, y, w * 0.3, h); }
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + w / 2 - s * 0.4, y, s * 0.8, h); g.fillRect(x, y + h * 0.45, w, s * 0.8);
        g.fillStyle = shade(base, 30); g.fillRect(x - s, y + h, w + 2 * s, s * 1.2);
      }
    }
    grain(g, W, H, 14);
  }, 4);
}
export { hex };
