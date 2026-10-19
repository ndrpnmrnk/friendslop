import { W } from '../world/state.js';
import { CONFIG, DIFF } from '../config.js';
import { cam } from '../game/camera.js';

/* Мини-карта: при старте раунда рисуем план города (районы, дороги, здания, вода) в картинку,
   каждый кадр поворачиваем её так, чтобы верх был туда, куда смотрит камера. Игрок — в центре,
   миссии — цветные точки (на краю, если далеко), цель уличной миссии — зелёная звезда. */
const PX = 3; // пикселей плана на метр
let plan = null, half = 0;
const GROUND = { pave: '#4a4258', grass: '#2e4a2c', dirt: '#4a3a2c', concrete: '#47434f', asphalt: '#2b2733', cobble: '#4e4660' };

export function buildMinimap(districts) {
  half = W.bounds; const size = Math.ceil(half * 2 * PX);
  plan = document.createElement('canvas'); plan.width = plan.height = size;
  const g = plan.getContext('2d'), X = x => (x + half) * PX;
  g.fillStyle = '#1d1826'; g.fillRect(0, 0, size, size);
  const ch = CONFIG.chunk;
  for (const d of W.districts) { const def = districts.find(q => q.id === d.id); g.fillStyle = GROUND[def ? def.ground : 'pave'] || '#3a3446'; g.fillRect(X(d.ox), X(d.oz), ch * PX, ch * PX); }
  // вода
  g.fillStyle = '#2a5a80';
  for (const z of W.zones) if (z.type === 'water' && z.y > -2) { if (z.c) { g.beginPath(); g.arc(X(z.c[0]), X(z.c[1]), z.c[2] * PX, 0, 7); g.fill(); } else g.fillRect(X(z.r[0]), X(z.r[1]), (z.r[2] - z.r[0]) * PX, (z.r[3] - z.r[1]) * PX); }
  // здания и высокое: всё твёрдое выше 2 м над землёй
  g.fillStyle = '#6a5a86';
  for (const s of W.solids) if (s.y1 > 2.2 && s.y0 < 1 && s.y1 - s.y0 > 2 && (s.x1 - s.x0) * (s.z1 - s.z0) > 0.3) g.fillRect(X(s.x0), X(s.z0), Math.max(1, (s.x1 - s.x0) * PX), Math.max(1, (s.z1 - s.z0) * PX));
  g.strokeStyle = 'rgba(241,232,255,.12)'; g.lineWidth = 1; for (const d of W.districts) g.strokeRect(X(d.ox) + 0.5, X(d.oz) + 0.5, ch * PX - 1, ch * PX - 1);
}

export function drawMinimap(P, missions, target) {
  const c = document.getElementById('mapc'); if (!c || !plan) return;
  const g = c.getContext('2d'), S = c.width, R = S / 2;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#17111f'; g.fillRect(0, 0, S, S);
  // простое преобразование мир → экран
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), k = 2.4; // пикселей на метр → видно ~±37 м
  const toS = (x, z) => { const dx = x - P.pos.x, dz = z - P.pos.z; return [R + (dx * rx + dz * rz) * k, R - (dx * fx + dz * fz) * k]; };
  g.save(); g.translate(R, R); g.rotate(cam.yaw); g.scale(k / PX, k / PX); g.translate(-(P.pos.x + half) * PX, -(P.pos.z + half) * PX); g.drawImage(plan, 0, 0); g.restore();
  // миссии
  const dot = (x, z, color, star) => {
    let [sx, sy] = toS(x, z); const dx = sx - R, dy = sy - R, d = Math.hypot(dx, dy), lim = R - 9;
    if (d > lim) { sx = R + dx / d * lim; sy = R + dy / d * lim; }
    g.fillStyle = color; g.strokeStyle = '#17111f'; g.lineWidth = 2;
    if (star) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 3.5 : 8; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } g.closePath(); g.stroke(); g.fill(); }
    else { g.beginPath(); g.arc(sx, sy, 5, 0, 7); g.stroke(); g.fill(); }
  };
  for (const m of missions) if (!m.busy) { const p = m.obj.pos(); dot(p.x, p.z, '#' + DIFF[m.def.diff].toString(16).padStart(6, '0')); }
  if (target) dot(target.x, target.z, '#9be36b', true);
  // игрок: стрелка по направлению взгляда персонажа
  const a = P.root.rotation.y, la = Math.atan2(Math.sin(a) * rx + Math.cos(a) * rz, Math.sin(a) * fx + Math.cos(a) * fz);
  g.save(); g.translate(R, R); g.rotate(la); g.fillStyle = '#ff8a1f'; g.strokeStyle = '#17111f'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.stroke(); g.fill(); g.restore();
}
