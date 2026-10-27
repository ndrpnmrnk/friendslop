/* v0.56 — иконки районов для табло хаба. Не пиксельные: маленькие ночные картинки с градиентами,
   по каждой сразу понятно, что за район (кран у стройки, фонтан у площади, контейнеры у порта…).
   Рисуются один раз в холст 200×140 и кешируются. */
const W = 200, H = 140, cache = new Map();
const lin = (g, y0, y1, a, b) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const rr = (g, x, y, w, h, r, c) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
const circ = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
const poly = (g, pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
const line = (g, pts, c, w = 2) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
function glowDot(g, x, y, r, c) { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, c); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); }
function windows(g, x, y, cols, rows, w, h, gx, gy, lit = .55, on = '#ffc36a', off = '#2a2440') {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) rect(g, x + c * (w + gx), y + r * (h + gy), w, h, ((c * 7 + r * 13 + x) % 10) / 10 < lit ? on : off);
}
function sky(g, top = '#1a1433', bot = '#3a2a5a') {
  g.fillStyle = lin(g, 0, H, top, bot); g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 14; i++) g.fillRect((i * 53) % W, (i * 29) % 60, 1.5, 1.5);
}
function ground(g, y, a = '#2c2438', b = '#1a1524') { g.fillStyle = lin(g, y, H, a, b); g.fillRect(0, y, W, H - y); }
function moon(g, x = 168, y = 24, r = 11) { glowDot(g, x, y, r * 2.6, 'rgba(255,240,210,.35)'); circ(g, x, y, r, '#fff1d0'); circ(g, x + 4, y - 3, r * .8, 'rgba(26,20,51,.18)'); }
function tree(g, x, y, s = 1, c = '#3f7a46') { rect(g, x - 2 * s, y - 14 * s, 4 * s, 14 * s, '#4a3326'); circ(g, x, y - 20 * s, 11 * s, c); circ(g, x - 7 * s, y - 15 * s, 8 * s, c); circ(g, x + 7 * s, y - 15 * s, 8 * s, c); circ(g, x - 3 * s, y - 24 * s, 6 * s, 'rgba(255,255,255,.08)'); }
function lamp(g, x, y, h = 34) { rect(g, x - 1, y - h, 2, h, '#1a1622'); rect(g, x - 4, y - h - 3, 8, 4, '#2a2430'); glowDot(g, x, y - h + 2, 16, 'rgba(255,200,120,.55)'); circ(g, x, y - h + 2, 2.5, '#ffe2a8'); }
function pumpkin(g, x, y, r = 6) { circ(g, x - r * .45, y, r * .8, '#d8661c'); circ(g, x + r * .45, y, r * .8, '#d8661c'); circ(g, x, y, r * .85, '#f0852a'); rect(g, x - 1, y - r - 2, 2, 4, '#4a6a2a'); }

const DRAW = {
  yard(g) { sky(g); moon(g); rect(g, 10, 30, 64, 82, '#4a3d5e'); windows(g, 16, 36, 5, 7, 8, 7, 4, 4); rect(g, 120, 44, 72, 68, '#5a4054'); windows(g, 126, 50, 5, 6, 9, 7, 4, 4, .45);
    ground(g, 108); line(g, [[84, 112], [84, 82], [112, 82], [112, 112]], '#c8c0d8', 2); line(g, [[92, 82], [92, 100]], '#8a84a0', 1); line(g, [[104, 82], [104, 100]], '#8a84a0', 1); rect(g, 89, 100, 18, 3, '#d8a040'); tree(g, 178, 122, .8); },
  park(g) { sky(g, '#16233a', '#2a3a55'); moon(g, 30, 22); ground(g, 96, '#2f5a36', '#1d3a24'); g.fillStyle = 'rgba(120,180,230,.5)'; g.beginPath(); g.ellipse(140, 116, 40, 10, 0, 0, 7); g.fill();
    poly(g, [[60, 140], [86, 96], [100, 96], [92, 140]], '#8a7a62'); tree(g, 30, 104, 1.2, '#3c7a40'); tree(g, 172, 98, 1.1, '#4a8a3c'); tree(g, 112, 92, .8, '#2f6a3a');
    rect(g, 40, 112, 26, 3, '#7a5032'); rect(g, 42, 115, 2, 6, '#3a2a20'); rect(g, 62, 115, 2, 6, '#3a2a20'); rect(g, 40, 106, 26, 3, '#8a5c38'); lamp(g, 76, 110); },
  plaza(g) { sky(g); rect(g, 92, 18, 18, 70, '#5e5064'); circ(g, 101, 32, 7, '#f1e4c0'); line(g, [[101, 32], [101, 27]], '#3a3040', 1.5); line(g, [[101, 32], [105, 33]], '#3a3040', 1.5); poly(g, [[90, 18], [101, 6], [112, 18]], '#3e3346');
    ground(g, 88, '#4a4058', '#2a2436'); g.fillStyle = '#6a5c78'; g.beginPath(); g.ellipse(100, 118, 62, 16, 0, 0, 7); g.fill(); g.fillStyle = '#4fa8e8'; g.beginPath(); g.ellipse(100, 116, 40, 9, 0, 0, 7); g.fill();
    rect(g, 97, 92, 6, 22, '#b8b0c8'); for (const s of [-1, 1]) { g.strokeStyle = 'rgba(160,220,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(100, 92); g.quadraticCurveTo(100 + s * 20, 78, 100 + s * 30, 112); g.stroke(); } lamp(g, 30, 116); lamp(g, 172, 116); },
  shops(g) { sky(g); ground(g, 112); const cs = [['#8a6a4a', '#d8243a', '#f1e8ff'], ['#4a6a8a', '#ff8a1f', '#2a1f3d'], ['#7a4a7a', '#7b4bc4', '#f5c542']];
    cs.forEach(([w2, a, b], i) => { const x = 6 + i * 64; rect(g, x, 34, 60, 78, w2); windows(g, x + 8, 40, 3, 1, 12, 10, 6, 0, .7); rect(g, x + 8, 76, 44, 36, '#1d1a28'); rect(g, x + 10, 78, 40, 20, 'rgba(255,200,120,.55)');
      for (let k = 0; k < 6; k++) poly(g, [[x + 2 + k * 9.3, 62], [x + 11.3 + k * 9.3, 62], [x + 11.3 + k * 9.3, 72], [x + 2 + k * 9.3, 72]], k % 2 ? a : b); rect(g, x + 10, 54, 40, 7, '#17111f'); });
    g.fillStyle = '#ffd27a'; g.font = 'bold 7px Rubik, Arial'; g.textAlign = 'center'; ['ХЛЕБ', 'КАФЕ', '24/7'].forEach((t, i) => g.fillText(t, 36 + i * 64, 60)); },
  construction(g) { sky(g, '#1d1730', '#4a3048'); ground(g, 112, '#5a4632', '#3a2c22');
    for (let x = 20; x <= 90; x += 24) rect(g, x, 50, 4, 62, '#8a8a92'); for (let y = 50; y <= 98; y += 16) rect(g, 18, y, 78, 4, '#8a8a92');
    rect(g, 138, 20, 6, 92, '#e8b020'); for (let y = 24; y < 110; y += 8) line(g, [[138, y], [144, y + 8]], '#a87a10', 1); rect(g, 70, 18, 120, 5, '#e8b020'); rect(g, 170, 23, 10, 10, '#4a4a52'); line(g, [[96, 23], [96, 58]], '#c8c8d0', 1); rect(g, 90, 58, 12, 8, '#7a7a82');
    poly(g, [[160, 112], [166, 96], [172, 112]], '#ff7a1a'); rect(g, 162, 104, 8, 2, '#f1e8ff'); for (let k = 0; k < 6; k++) rect(g, 4 + k * 12, 124, 6, 6, k % 2 ? '#17111f' : '#f5c542'); },
  cemetery(g) { sky(g, '#101524', '#2a3348'); moon(g, 150, 30, 14); ground(g, 104, '#2a3a2c', '#141c16');
    line(g, [[20, 104], [26, 70], [22, 56]], '#2a2220', 4); line(g, [[25, 74], [36, 64]], '#2a2220', 3); line(g, [[24, 66], [14, 58]], '#2a2220', 2);
    for (const [x, h] of [[54, 26], [86, 32], [118, 24], [150, 28]]) { rr(g, x, 120 - h, 20, h + 4, 8, '#8a8a98'); rect(g, x + 4, 126 - h, 12, 2, '#5a5a66'); }
    rect(g, 178, 88, 4, 30, '#9a9aa8'); rect(g, 171, 96, 18, 4, '#9a9aa8'); for (let x = 0; x < W; x += 10) rect(g, x, 112, 2, 18, '#17141c'); rect(g, 0, 114, W, 2, '#17141c'); glowDot(g, 96, 96, 22, 'rgba(160,255,170,.25)'); },
  gas(g) { sky(g); ground(g, 110, '#3a3444', '#221e2a'); rect(g, 14, 30, 150, 10, '#e83a3a'); rect(g, 14, 40, 150, 4, '#f1e8ff'); for (const x of [30, 140]) rect(g, x, 44, 6, 66, '#c8c4d0');
    for (const x of [60, 108]) { rr(g, x, 76, 20, 34, 3, '#e8e2ea'); rect(g, x + 4, 82, 12, 8, '#2a3a5a'); rect(g, x + 4, 94, 12, 3, '#e83a3a'); }
    glowDot(g, 89, 60, 60, 'rgba(255,250,220,.18)'); rect(g, 174, 40, 20, 50, '#2a2430'); rect(g, 176, 44, 16, 40, '#17111f'); g.fillStyle = '#7dffa0'; g.font = 'bold 9px Rubik'; g.textAlign = 'center'; g.fillText('92', 184, 58); g.fillText('95', 184, 76);
    rr(g, 128, 108, 36, 14, 5, '#4a8ac8'); rr(g, 134, 100, 22, 10, 4, '#3a6a9a'); circ(g, 136, 122, 4, '#17111f'); circ(g, 156, 122, 4, '#17111f'); },
  market(g) { sky(g); ground(g, 108, '#4a3e48', '#2a2230'); const st = [['#d8243a', '#f1e8ff'], ['#ff8a1f', '#2a1f3d'], ['#6aa84f', '#f1e8ff']];
    st.forEach(([a, b], i) => { const x = 8 + i * 64; rect(g, x + 4, 60, 2, 50, '#2b2533'); rect(g, x + 54, 60, 2, 50, '#2b2533'); for (let k = 0; k < 6; k++) poly(g, [[x + k * 10, 54], [x + 10 + k * 10, 54], [x + 10 + k * 10, 66], [x + k * 10, 66]], k % 2 ? a : b);
      rect(g, x + 4, 92, 52, 18, '#8a5c38'); for (let k = 0; k < 4; k++) circ(g, x + 12 + k * 12, 90, 5, i === 1 ? '#f0852a' : i === 0 ? '#e0302a' : '#d8e04a'); });
    pumpkin(g, 30, 128, 7); pumpkin(g, 46, 130, 5); g.strokeStyle = '#ffd27a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 46); g.quadraticCurveTo(100, 60, 200, 46); g.stroke(); for (let k = 0; k < 9; k++) circ(g, 10 + k * 22, 49 + Math.sin(k / 8 * Math.PI) * 5, 2, ['#ffd27a', '#ff6aa8', '#7dffa0'][k % 3]); },
  school(g) { sky(g); ground(g, 110, '#3a5a3a', '#223a26'); rect(g, 20, 40, 120, 70, '#b8885a'); poly(g, [[14, 42], [80, 22], [146, 42]], '#6a3a2a'); circ(g, 80, 34, 8, '#f1e4c0'); line(g, [[80, 34], [80, 29]], '#3a3040', 1.5); line(g, [[80, 34], [84, 35]], '#3a3040', 1.5);
    windows(g, 28, 50, 6, 2, 12, 12, 6, 8, .6, '#ffd890', '#4a3a3a'); rect(g, 70, 86, 20, 24, '#4a2a20'); rect(g, 160, 30, 2, 80, '#c8c4d0'); poly(g, [[162, 30], [186, 36], [162, 42]], '#4ab0f0');
    rect(g, 176, 70, 2, 40, '#c8c4d0'); rect(g, 168, 60, 18, 12, '#f1e8ff'); g.strokeStyle = '#ff6a2a'; g.lineWidth = 2; g.beginPath(); g.ellipse(177, 74, 6, 2, 0, 0, 7); g.stroke(); circ(g, 150, 124, 6, '#e8742a'); },
  foodcourt(g) { sky(g, '#1d1433', '#4a2a4a'); ground(g, 112); rr(g, 14, 58, 104, 50, 8, '#e8c040'); rect(g, 30, 68, 64, 24, '#17111f'); rect(g, 32, 70, 60, 20, 'rgba(255,200,120,.75)'); rect(g, 26, 92, 72, 4, '#b8901a');
    circ(g, 34, 110, 9, '#17111f'); circ(g, 100, 110, 9, '#17111f'); circ(g, 34, 110, 4, '#8a8a92'); circ(g, 100, 110, 4, '#8a8a92'); rr(g, 30, 44, 64, 14, 4, '#d8243a'); g.fillStyle = '#fff'; g.font = 'bold 9px Rubik'; g.textAlign = 'center'; g.fillText('ТАКО · ТАКО', 62, 54);
    for (const [x, c] of [[146, '#4ab0f0'], [182, '#d8243a']]) { poly(g, [[x - 18, 82], [x, 70], [x + 18, 82]], c); rect(g, x - 1, 82, 2, 30, '#2b2533'); rect(g, x - 10, 100, 20, 3, '#f1e8ff'); }
    circ(g, 160, 30, 9, '#e8a040'); rect(g, 151, 30, 18, 3, '#6a3a1a'); rect(g, 151, 33, 18, 2, '#6aa84f'); rr(g, 151, 35, 18, 5, 2, '#e8a040'); },
  sewer(g) { g.fillStyle = lin(g, 0, H, '#141a1c', '#24302c'); g.fillRect(0, 0, W, H); for (let y = 0; y < 100; y += 12) for (let x = (y / 12 % 2) * 12; x < W; x += 24) rect(g, x, y, 22, 10, 'rgba(255,255,255,.04)');
    circ(g, 100, 64, 48, '#3a4a46'); circ(g, 100, 64, 40, '#0e1412'); circ(g, 100, 64, 40, 'rgba(0,0,0,.4)'); for (let a = 0; a < 12; a++) { const q = a / 12 * Math.PI * 2; rect(g, 100 + Math.cos(q) * 44 - 2, 64 + Math.sin(q) * 44 - 2, 4, 4, '#5a6a64'); }
    g.fillStyle = lin(g, 96, H, '#6ac850', '#2a5a2a'); g.fillRect(0, 100, W, 40); glowDot(g, 100, 108, 50, 'rgba(140,255,120,.25)'); poly(g, [[80, 100], [100, 84], [120, 100]], '#5ab040');
    for (let y = 10; y < 100; y += 10) rect(g, 166, y, 18, 2, '#9a9aa0'); rect(g, 166, 6, 2, 96, '#9a9aa0'); rect(g, 182, 6, 2, 96, '#9a9aa0'); },
  office(g) { sky(g, '#121a33', '#2a3a5a'); ground(g, 118); g.fillStyle = lin(g, 10, 118, '#4a6a9a', '#22304a'); g.fillRect(56, 10, 70, 108); for (let y = 16; y < 112; y += 8) for (let x = 60; x < 122; x += 10) rect(g, x, y, 8, 6, (x * y) % 7 < 3 ? '#ffd890' : 'rgba(160,200,255,.35)');
    rect(g, 132, 46, 50, 72, '#3a4258'); windows(g, 136, 52, 4, 7, 9, 6, 3, 3, .4, '#bfe8ff'); rect(g, 14, 64, 36, 54, '#4a4058'); windows(g, 18, 70, 3, 5, 8, 6, 3, 3, .5); rect(g, 80, 104, 22, 14, '#17111f'); line(g, [[91, 104], [91, 118]], '#8ab0e0', 2); },
  port(g) { sky(g, '#162036', '#3a4060'); moon(g, 30, 22, 9); g.fillStyle = lin(g, 100, H, '#244a6a', '#10203a'); g.fillRect(0, 100, W, 40);
    for (const [x, y, c] of [[10, 78, '#c84a3a'], [44, 78, '#3a7ac8'], [10, 62, '#e8b020'], [44, 62, '#4a9a5a'], [27, 46, '#c84a3a']]) { rect(g, x, y, 32, 15, c); for (let k = 3; k < 32; k += 4) rect(g, x + k, y + 1, 1, 13, 'rgba(0,0,0,.25)'); }
    rect(g, 0, 93, 90, 7, '#5a5a62'); rect(g, 100, 20, 6, 74, '#e8742a'); rect(g, 100, 20, 80, 5, '#e8742a'); line(g, [[106, 24], [130, 4], [106, 4]], '#e8742a', 2); line(g, [[160, 25], [160, 60]], '#c8c8d0', 1); rect(g, 152, 60, 16, 10, '#3a7ac8');
    poly(g, [[110, 108], [196, 108], [188, 124], [118, 124]], '#2a2a36'); rect(g, 150, 96, 30, 12, '#f1e8ff'); rect(g, 164, 88, 6, 8, '#c84a3a'); for (let k = 0; k < 5; k++) rect(g, 154 + k * 5, 99, 3, 3, '#ffd890'); },
  skatepark(g) { sky(g, '#1d1433', '#3a2a5a'); ground(g, 104, '#5a5866', '#33303e'); g.fillStyle = '#8a8a9a'; g.beginPath(); g.moveTo(20, 60); g.quadraticCurveTo(28, 118, 100, 118); g.quadraticCurveTo(172, 118, 180, 60); g.lineTo(190, 60); g.lineTo(190, 124); g.lineTo(10, 124); g.lineTo(10, 60); g.fill();
    rect(g, 10, 56, 14, 4, '#c8c8d0'); rect(g, 176, 56, 14, 4, '#c8c8d0'); g.fillStyle = '#ff6aa8'; g.font = 'bold 16px Rubik'; g.textAlign = 'center'; g.fillText('SK8', 100, 100); g.fillStyle = '#7dffa0'; g.fillText('SK8', 98, 98);
    poly(g, [[120, 40], [168, 30], [170, 36], [122, 46]], '#d8243a'); circ(g, 128, 48, 4, '#f5c542'); circ(g, 160, 41, 4, '#f5c542'); },
  hospital(g) { sky(g); ground(g, 114); rect(g, 30, 30, 140, 84, '#d8d4e0'); windows(g, 38, 40, 8, 4, 10, 8, 6, 8, .6, '#bfe8ff', '#8a8a9a'); rect(g, 84, 14, 32, 32, '#f1e8ff');
    rect(g, 96, 18, 8, 24, '#e83a3a'); rect(g, 88, 26, 24, 8, '#e83a3a'); rect(g, 86, 94, 28, 20, '#4a6a8a');
    rr(g, 132, 98, 52, 22, 5, '#f1e8ff'); rect(g, 170, 102, 12, 8, '#2a3a5a'); rect(g, 140, 104, 16, 3, '#e83a3a'); rect(g, 146, 99, 4, 14, '#e83a3a'); circ(g, 142, 120, 5, '#17111f'); circ(g, 174, 120, 5, '#17111f'); glowDot(g, 158, 96, 12, 'rgba(80,160,255,.8)'); },
  factory(g) { sky(g, '#1d1730', '#4a3a3a'); for (const [x, h] of [[30, 70], [56, 86]]) { rect(g, x, 110 - h, 14, h, '#6a4a3a'); rect(g, x - 2, 110 - h, 18, 5, '#3a2a22');
      for (let k = 0; k < 4; k++) circ(g, x + 7 + k * 6, 100 - h - k * 12, 7 + k * 3, `rgba(170,160,170,${.5 - k * .1})`); }
    for (let k = 0; k < 4; k++) poly(g, [[80 + k * 28, 110], [80 + k * 28, 64], [108 + k * 28, 80], [108 + k * 28, 110]], k % 2 ? '#7a5a4a' : '#8a6a52'); windows(g, 84, 90, 8, 1, 10, 8, 4, 0, .8);
    ground(g, 110, '#3a3232', '#221c1c'); rr(g, 10, 114, 40, 14, 4, '#e8c040'); g.fillStyle = '#17111f'; g.font = 'bold 8px Rubik'; g.textAlign = 'center'; g.fillText('ЖИР', 30, 124); },
  townhall(g) { sky(g); ground(g, 116, '#4a4458', '#2a2436'); poly(g, [[30, 52], [100, 24], [170, 52]], '#8a7a62'); rect(g, 32, 52, 136, 8, '#c4b397'); for (let k = 0; k < 6; k++) rect(g, 44 + k * 22, 60, 8, 46, '#e8dcc0');
    rect(g, 36, 60, 128, 46, 'rgba(60,50,40,.35)'); rect(g, 30, 106, 140, 6, '#c4b397'); rect(g, 26, 112, 148, 5, '#a89a80'); circ(g, 100, 40, 8, '#f1e4c0'); rect(g, 99, 4, 2, 20, '#c8c4d0'); poly(g, [[101, 4], [118, 8], [101, 12]], '#4ab0f0'); rect(g, 92, 78, 16, 28, '#4a3020'); },
  university(g) { sky(g); ground(g, 116); rect(g, 16, 46, 168, 66, '#8a6a7a'); windows(g, 24, 54, 10, 2, 10, 12, 6, 10, .55); rect(g, 70, 34, 60, 78, '#a88a96'); poly(g, [[64, 36], [100, 16], [136, 36]], '#6a4a5a');
    for (let k = 0; k < 4; k++) rect(g, 76 + k * 14, 56, 6, 50, '#e8dce8'); for (let k = 0; k < 3; k++) rect(g, 66 - k * 4, 106 + k * 4, 68 + k * 8, 4, '#c8bcc8');
    poly(g, [[150, 24], [176, 14], [202, 24], [176, 34]], '#17111f'); rect(g, 168, 26, 16, 8, '#17111f'); line(g, [[198, 24], [198, 38]], '#f5c542', 2); },
  cinema(g) { sky(g, '#1d1433', '#3a2244'); ground(g, 114); rect(g, 10, 30, 180, 84, '#5c4250'); rect(g, 20, 58, 160, 26, '#2a1f2a');
    for (let k = 0; k < 26; k++) { glowDot(g, 22 + k * 6.1, 57, 5, 'rgba(255,210,140,.6)'); glowDot(g, 22 + k * 6.1, 85, 5, 'rgba(255,210,140,.6)'); }
    g.fillStyle = '#f3cf8b'; g.font = 'bold 13px Rubik'; g.textAlign = 'center'; g.fillText('КИНО', 100, 76); rect(g, 84, 92, 32, 22, '#bfe8ff'); rect(g, 99, 92, 2, 22, '#3a3440');
    for (const x of [30, 150]) { rect(g, x, 90, 20, 24, '#8a7054'); rect(g, x + 2, 92, 16, 20, '#4a293d'); circ(g, x + 10, 98, 4, '#eab77b'); }
    circ(g, 168, 22, 14, '#2a2430'); for (let a = 0; a < 5; a++) circ(g, 168 + Math.cos(a * 1.256) * 8, 22 + Math.sin(a * 1.256) * 8, 3.5, '#5c4250'); circ(g, 168, 22, 3, '#8a7a62'); },
};
export function districtIcon(id) {
  if (cache.has(id)) return cache.get(id);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  (DRAW[id] || ((q) => sky(q)))(g);
  g.fillStyle = lin(g, H * .55, H, 'rgba(0,0,0,0)', 'rgba(0,0,0,.45)'); g.fillRect(0, 0, W, H);
  cache.set(id, c); return c;
}
