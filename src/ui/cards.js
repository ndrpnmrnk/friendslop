/* Пиксель-арт для карточек режима и рулетки: рисуется кодом в маленький canvas,
   растягивается без сглаживания — в стиле игры. */
const R = (a, b) => a + Math.random() * (b - a);
export function drawCard(cv, kind, seed = 0) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.imageSmoothingEnabled = false;
  if (kind === 'unknown') {
    g.fillStyle = '#120d1c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1d1630'; for (let i = 0; i < 6; i++) { const w = R(6, 14), h = R(16, 46); g.fillRect(R(0, W - w) | 0, H - h | 0, w | 0, h | 0); }
    g.fillStyle = '#4b3a68'; g.font = `bold ${H * 0.45}px monospace`; g.textAlign = 'center'; g.fillText('?', W / 2, H * 0.55);
    return;
  }
  // небо с градиентом и звёздами, луна
  const sky = g.createLinearGradient(0, 0, 0, H * 0.7); sky.addColorStop(0, '#150f26'); sky.addColorStop(1, '#4a2a4a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f1e8ff'; for (let i = 0; i < 18; i++) g.fillRect(R(0, W) | 0, R(0, H * 0.45) | 0, 1, 1);
  g.fillStyle = '#f4eedc'; g.beginPath(); g.arc(W * 0.78, H * 0.16, W * 0.07, 0, 7); g.fill();
  // дома с окнами
  let x = -2;
  while (x < W) { const w = R(8, 16) | 0, h = R(H * 0.25, H * 0.55) | 0; g.fillStyle = ['#3a2e52', '#2e2440', '#46365e'][(Math.random() * 3) | 0]; g.fillRect(x, H * 0.72 - h, w, h);
    for (let yy = H * 0.72 - h + 3; yy < H * 0.7 - 2; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (Math.random() < 0.4) { g.fillStyle = Math.random() < 0.85 ? '#ffb35c' : '#9be0ff'; g.fillRect(xx, yy | 0, 1, 2); }
    x += w; }
  // улица, фонарь, тыквы
  g.fillStyle = '#2b2733'; g.fillRect(0, H * 0.72, W, H); g.fillStyle = '#4a4258'; g.fillRect(0, H * 0.72, W, 3);
  g.fillStyle = '#e0b02a'; for (let xx = 2; xx < W; xx += 8) g.fillRect(xx, H * 0.86 | 0, 4, 1);
  const lx = (W * 0.2) | 0; g.fillStyle = '#17111f'; g.fillRect(lx, H * 0.4, 1, H * 0.33); g.fillStyle = '#fff0c8'; g.fillRect(lx - 1, H * 0.4 - 2, 3, 2);
  g.fillStyle = 'rgba(255,200,140,.18)'; g.beginPath(); g.moveTo(lx - 1, H * 0.4); g.lineTo(lx - 9, H * 0.74); g.lineTo(lx + 9, H * 0.74); g.fill();
  for (const px of [0.12, 0.62, 0.9]) { const cx = (W * px) | 0, cy = (H * 0.78) | 0; g.fillStyle = '#ff8a1f'; g.fillRect(cx - 2, cy - 2, 5, 4); g.fillStyle = '#3f6b2a'; g.fillRect(cx, cy - 3, 1, 1); g.fillStyle = '#ffd25c'; g.fillRect(cx - 1, cy - 1, 1, 1); g.fillRect(cx + 1, cy - 1, 1, 1); }
  if (kind === 'mode') {
    // три бегущих персонажа (силуэты разных скинов)
    for (const [px, c, ear] of [[0.36, '#ff9a4a', 1], [0.5, '#6a6d78', 0], [0.64, '#5a8ab8', 2]]) { const cx = (W * px) | 0, by = (H * 0.8) | 0;
      g.fillStyle = '#17111f'; g.fillRect(cx - 4, by - 13, 9, 9); g.fillStyle = c; g.fillRect(cx - 3, by - 12, 7, 7);
      if (ear === 1) { g.fillRect(cx - 3, by - 14, 2, 2); g.fillRect(cx + 2, by - 14, 2, 2); } if (ear === 2) { g.fillRect(cx, by - 15, 2, 3); }
      g.fillStyle = '#17111f'; g.fillRect(cx - 1, by - 10, 1, 2); g.fillRect(cx + 2, by - 10, 1, 2); g.fillStyle = c; g.fillRect(cx - 2, by - 4, 5, 3);
      g.fillRect(cx - 4, by - 1, 2, 1); g.fillRect(cx + 3, by - 2, 2, 1); g.fillStyle = 'rgba(214,207,226,.6)'; g.fillRect(cx - 9, by - 2, 3, 2); g.fillRect(cx - 12, by - 3, 2, 2); }
  }
}
