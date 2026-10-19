import { THREE } from './gfx.js';
import { HW, SEASON } from '../config.js';

/* Текстуры «под фото»: рисуем мягко в высоком разрешении, затем ужимаем до 16–64 px.
   Получается та самая размытая пиксельная фактура PS1. Позже любую можно заменить
   реальным фото — достаточно вернуть текстуру с тем же ключом. */
const C = new Map();
function finish(c, alpha) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
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
  asphalt: () => photo('asphalt', 32, 32, (g, W, H) => {
    fill(g, W, H, HW ? '#302b38' : '#55525c');
    blobs(g, W, H, ['#25212c', '#3a3443', '#2b2633'], 60, W * 0.05, W * 0.2, 0.3);
    blobs(g, W, H, ['#4a4452', '#1d1a22'], 400, 1, 3, 0.6);
    g.strokeStyle = 'rgba(10,8,14,.7)'; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) { let x = R() * W, y = R() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 40; y += 18 + R() * 10; g.lineTo(x, y); } g.stroke(); }
    grain(g, W, H, 20);
  }),
  pave: () => photo('pave', 32, 32, (g, W, H) => {
    fill(g, W, H, '#1f1a26'); const n = 4, s = W / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = shade(HW ? 0x7a7389 : 0xb8b2a8, (R() - 0.5) * 22); g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
    }
    blobs(g, W, H, ['#4d4658', '#8b84a0'], 50, 4, 14, 0.18); grain(g, W, H, 22);
  }),
  cobble: () => photo('cobble', 32, 32, (g, W, H) => {
    fill(g, W, H, '#2a2433');
    for (let i = 0; i < 70; i++) { g.fillStyle = shade(0x857c96, (R() - 0.5) * 40); g.beginPath(); g.ellipse(R() * W, R() * H, 9 + R() * 6, 7 + R() * 5, R() * 3, 0, 7); g.fill(); }
    grain(g, W, H, 24);
  }),
  grass: () => photo('grass', 32, 32, (g, W, H) => {
    fill(g, W, H, HW ? '#33502f' : '#4f8a40');
    blobs(g, W, H, HW ? ['#2a4527', '#3f5e38', '#4a6a3c'] : ['#3f7a35', '#5a9a4a'], 40, 8, 30, 0.35);
    strokes(g, W, H, HW ? ['#4f7444', '#24391f', '#5f7f4a'] : ['#6aaa55', '#3a6a30'], 900, 9, -Math.PI / 2, 0.8, 2, 0.55);
    if (HW) blobs(g, W, H, ['#c96a25', '#a8452a', '#e0902e'], 40, 3, 6, 0.85);
    grain(g, W, H, 16);
  }),
  dirt: () => photo('dirt', 32, 32, (g, W, H) => {
    fill(g, W, H, '#5a4636'); blobs(g, W, H, ['#4a382b', '#6b5442', '#3e2f24'], 80, 6, 26, 0.35);
    blobs(g, W, H, ['#8a7a6a', '#2e231b'], 300, 1, 4, 0.7); grain(g, W, H, 22);
  }),
  concrete: () => photo('concrete', 32, 32, (g, W, H) => {
    fill(g, W, H, '#6d6876'); blobs(g, W, H, ['#5d5866', '#7c7785', '#4e4a57'], 70, 8, 34, 0.25);
    g.strokeStyle = 'rgba(30,26,36,.6)'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
    blobs(g, W, H, ['#3a3542'], 12, 6, 16, 0.25); grain(g, W, H, 22);
  }),
  court: () => photo('court', 32, 32, (g, W, H) => {
    fill(g, W, H, '#8a3b33'); blobs(g, W, H, ['#7a3029', '#9a4a40'], 60, 6, 20, 0.3); grain(g, W, H, 26);
  }),
  water: () => photo('water', 32, 32, (g, W, H) => {
    fill(g, W, H, '#28506e'); blobs(g, W, H, ['#1f4560', '#346282', '#2c5878'], 40, 10, 30, 0.4);
    strokes(g, W, H, ['#6aa0c8', '#9cc4e0'], 60, 18, 0, 0.3, 3, 0.45); grain(g, W, H, 12);
  }),
  wood: () => photo('wood', 32, 32, (g, W, H) => {
    const n = 4, s = H / n;
    for (let i = 0; i < n; i++) { g.fillStyle = shade(0x7a5236, (R() - 0.5) * 30); g.fillRect(0, i * s, W, s); }
    strokes(g, W, H, ['#5a3a24', '#94693c', '#4a2e1c'], 140, 40, 0, 0.08, 2, 0.45);
    g.fillStyle = '#2e1c10'; for (let i = 1; i < n; i++) g.fillRect(0, i * s - 2, W, 4);
    grain(g, W, H, 18);
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
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? '#d6ccb8' : '#4e4658'; g.fillRect(x * s, y * s, s, s); }
    blobs(g, W, H, ['#a89c88', '#2a2433'], 30, 6, 16, 0.15); grain(g, W, H, 16);
  }),
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
  brickWall: () => photo('brickWall', 32, 32, (g, W, H) => {
    fill(g, W, H, '#4a3a38'); const bh = H / 8, bw = W / 4;
    for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { g.fillStyle = shade(0x9a4a36, (R() - 0.5) * 40); g.fillRect(c * bw + (r % 2 ? bw / 2 : 0) + 2, r * bh + 2, bw - 4, bh - 4); }
    grain(g, W, H, 20);
  }),

  /* ---------- коты ---------- */
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
  crate: () => photo('crate', 32, 32, (g, W, H) => {
    fill(g, W, H, '#8a6338'); strokes(g, W, H, ['#6a4a2a', '#a07a48'], 120, 30, 0, 0.1, 2, 0.4);
    g.fillStyle = '#4e3620'; const b = W * 0.12; g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b); g.fillRect(0, 0, b, H); g.fillRect(W - b, 0, b, H);
    g.lineWidth = b * 0.8; g.strokeStyle = '#4e3620'; g.beginPath(); g.moveTo(b, b); g.lineTo(W - b, H - b); g.stroke(); grain(g, W, H, 16);
  }),
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
      for (let fy = 0.9; fy < hM - 1.3; fy += 2.4) for (let fx = 0.7; fx < wM - 1; fx += 2.0) {
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
