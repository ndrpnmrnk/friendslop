import { W } from '../world/state.js';
import { CONFIG, DIFF } from '../config.js';
import { cam } from '../game/camera.js';
import { iconCanvas } from './icons.js';

/* Мини-карта: при старте раунда рисуем план города (районы, дороги, здания, вода) в картинку,
   каждый кадр поворачиваем её так, чтобы верх был туда, куда смотрит камера. Игрок — в центре,
   миссии — цветные точки (на краю, если далеко), цель уличной миссии — зелёная звезда. */
const PX = 3; // пикселей плана на метр
let plan = null, half = 0;
const GROUND = { pave: '#4a4258', grass: '#2e4a2c', dirt: '#4a3a2c', concrete: '#47434f', asphalt: '#2b2733', cobble: '#4e4660', flag: '#4a4458' };

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

export function drawMinimap(P, missions, target, extra) {
  const c = document.getElementById('mapc'); if (!c || !plan) return;
  const g = c.getContext('2d'), S = c.width, R = S / 2;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#17111f'; g.fillRect(0, 0, S, S);
  // мир → экран (верх — куда смотрит камера)
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), k = 2.2;
  const toS = (x, z) => { const dx = x - P.pos.x, dz = z - P.pos.z; return [R + (dx * rx + dz * rz) * k, R - (dx * fx + dz * fz) * k]; };
  g.save(); g.translate(R, R); g.rotate(cam.yaw); g.scale(k / PX, k / PX); g.translate(-(P.pos.x + half) * PX, -(P.pos.z + half) * PX); g.drawImage(plan, 0, 0); g.restore();
  const lim = R - 7;
  const mark = (x, z, color, kind) => {
    let [sx, sy] = toS(x, z); const dx = sx - R, dy = sy - R, m = Math.max(Math.abs(dx), Math.abs(dy)), out = m > lim;
    if (out) { sx = R + dx / m * lim; sy = R + dy / m * lim; }
    sx = Math.round(sx); sy = Math.round(sy);
    g.fillStyle = '#17111f';
    if (out) { const a = Math.atan2(dy, dx); g.save(); g.translate(sx, sy); g.rotate(a); g.fillRect(-4, -5, 9, 10); g.fillStyle = color; g.beginPath(); g.moveTo(4, 0); g.lineTo(-3, -4); g.lineTo(-3, 4); g.fill(); g.restore(); return; }
    if (kind && kind.icon) { g.fillRect(sx - 9, sy - 9, 18, 18); g.fillStyle = color; g.fillRect(sx - 8, sy - 8, 16, 16); g.fillStyle = '#2a1f3d'; g.fillRect(sx - 7, sy - 7, 14, 14); g.drawImage(iconCanvas(kind.icon, 1), sx - 6, sy - 6); return; }
    if (kind === 'star') { g.fillRect(sx - 5, sy - 5, 11, 11); g.fillStyle = color; g.fillRect(sx - 4, sy - 1, 9, 3); g.fillRect(sx - 1, sy - 4, 3, 9); }
    else if (kind === 'bot') { g.fillRect(sx - 3, sy - 3, 6, 6); g.fillStyle = color; g.fillRect(sx - 2, sy - 2, 4, 4); }
    else { g.fillRect(sx - 4, sy - 4, 9, 9); g.fillStyle = color; g.fillRect(sx - 3, sy - 3, 7, 7); }
  };
  for (const b of W.bots || []) if (!b.hidden) mark(b.pos.x, b.pos.z, '#b18cff', 'bot');
  for (const m of missions) if (!m.busy) { const p = m.obj.pos(); mark(p.x, p.z, '#' + DIFF[m.def.diff].toString(16).padStart(6, '0'), { icon: m.key }); }
  for (const e of extra || []) mark(e.x, e.z, e.color, e.icon ? { icon: e.icon } : 'star');
  if (target) mark(target.x, target.z, '#9be36b', 'star');
  // игрок
  const a = P.root.rotation.y, la = Math.atan2(Math.sin(a) * rx + Math.cos(a) * rz, Math.sin(a) * fx + Math.cos(a) * fz);
  g.save(); g.translate(R, R); g.rotate(la); g.fillStyle = '#ff8a1f'; g.strokeStyle = '#17111f'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2); g.lineTo(-5, 5); g.closePath(); g.stroke(); g.fill(); g.restore();
  // «С» — север на краю рамки
  const n = document.querySelector('#minimap .north'); if (n) { const [nx, ny] = toS(P.pos.x, P.pos.z - 1000), dx = nx - R, dy = ny - R, m = Math.max(Math.abs(dx), Math.abs(dy)) || 1, sc = c.clientWidth / S;
    n.style.left = (2 + (R + dx / m * (R - 6)) * sc) + 'px'; n.style.top = (2 + (R + dy / m * (R - 6)) * sc) + 'px'; }
}
