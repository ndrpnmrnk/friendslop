import { W } from './state.js';
import { clamp } from '../core/rng.js';

/* Твёрдые объекты — AABB с высотой: {x0,x1,z0,z1,y0,y1,on}.
   Всё, у чего верх ниже «шага», можно перешагнуть; на всё остальное — запрыгнуть или залезть. */
export function addSolid(x0, z0, x1, z1, y0, y1, tag) {
  const s = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1, on: true, tag, _st: 0 };
  W.solids.push(s); gridInsert(s); return s;
}
/* Сетка 4×4 м: каждая проверка смотрит только на твёрдые объекты рядом, а не на все тысячи сразу */
const CELL = 4, ck = (i, j) => (i + 512) * 1024 + (j + 512);
function gridInsert(s) {
  const g = W.grid || (W.grid = new Map());
  for (let i = Math.floor(s.x0 / CELL); i <= Math.floor(s.x1 / CELL); i++) for (let j = Math.floor(s.z0 / CELL); j <= Math.floor(s.z1 / CELL); j++) {
    const k = ck(i, j); let a = g.get(k); if (!a) g.set(k, a = []); a.push(s);
  }
}
let stamp = 0; const _q = [];
// твёрдые объекты, пересекающие прямоугольник (без повторов). Результат переиспользуется — не хранить.
export function solidsNear(x0, z0, x1, z1, out = _q) {
  out.length = 0; stamp++;
  const g = W.grid; if (!g) return out;
  const i0 = Math.floor(x0 / CELL), i1 = Math.floor(x1 / CELL), j0 = Math.floor(z0 / CELL), j1 = Math.floor(z1 / CELL);
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400) { for (const s of W.solids) out.push(s); return out; }
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const a = g.get(ck(i, j)); if (!a) continue;
    for (const s of a) if (s._st !== stamp) { s._st = stamp; out.push(s); }
  }
  return out;
}
export const overlapXZ = (s, x, z, r) => x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1;

// Проёмы в земле (люки, канал коллектора): там нет «нулевой» земли, можно провалиться вниз
const inHole = (x, z) => { for (const h of W.holes) if (x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1) return true; return false; };
export function groundAt(x, z, r, maxY) {
  let g = maxY >= 0 && !inHole(x, z) ? 0 : -60;
  for (const s of solidsNear(x - r, z - r, x + r, z + r)) if (s.on && s.y1 <= maxY && s.y1 > g && overlapXZ(s, x, z, r)) g = s.y1;
  return g;
}

export function pushOut(p, r, yLow, yHigh) {
  let hit = false;
  for (const s of solidsNear(p.x - r, p.z - r, p.x + r, p.z + r)) {
    if (!s.on || s.y1 <= yLow || s.y0 >= yHigh) continue;
    const cx = clamp(p.x, s.x0, s.x1), cz = clamp(p.z, s.z0, s.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
    else {
      const l = p.x - s.x0, rr = s.x1 - p.x, bt = p.z - s.z0, tp = s.z1 - p.z, mn = Math.min(l, rr, tp, bt);
      if (mn === l) p.x = s.x0 - r; else if (mn === rr) p.x = s.x1 + r; else if (mn === bt) p.z = s.z0 - r; else p.z = s.z1 + r;
    }
  }
  const B = W.bounds; p.x = clamp(p.x, -B, B); p.z = clamp(p.z, -B, B);
  return hit;
}

// Персонаж/животное: горизонталь, затем вертикаль с землёй и потолком
export function moveBody(b, dt, g = 22) {
  const p = b.pos, v = b.vel;
  p.x += v.x * dt; p.z += v.z * dt;
  pushOut(p, b.r, p.y + b.step, p.y + b.h);
  const oldY = p.y;
  if (!b.noGrav) v.y -= g * dt;
  p.y += v.y * dt;
  const gy = groundAt(p.x, p.z, b.r * 0.6, Math.max(oldY, p.y) + b.step);
  b.landed = false;
  if (p.y <= gy) { if (v.y < -0.5 && !b.onGround) b.landed = true; p.y = gy; v.y = Math.max(0, v.y); b.onGround = true; }
  else b.onGround = false;
  if (v.y > 0) for (const s of solidsNear(p.x - b.r, p.z - b.r, p.x + b.r, p.z + b.r)) {
    if (s.on && overlapXZ(s, p.x, p.z, b.r * 0.6) && s.y0 >= oldY + b.h - 0.02 && s.y0 < p.y + b.h) { p.y = s.y0 - b.h; v.y = 0; }
  }
  b.ground = gy;
}

/* Зоны: вода, масло, лужи, щётки мойки. shape: {c:[x,z,r]} или {r:[x0,z0,x1,z1]} */
export function addZone(type, shape, y, extra = {}) { const z = { type, ...shape, y, ...extra }; W.zones.push(z); return z; }
export function zoneAt(x, z, y, type) {
  for (const q of W.zones) {
    if (type && q.type !== type) continue;
    if (Math.abs(y - q.y) > 0.6) continue;
    if (q.c ? Math.hypot(x - q.c[0], z - q.c[1]) < q.c[2] : (x > q.r[0] && x < q.r[2] && z > q.r[1] && z < q.r[3])) return q;
  }
  return null;
}

// Свободно ли место (для спавна объектов миссий)
export function isFree(x0, z0, x1, z1, y0, y1) {
  for (const s of solidsNear(x0, z0, x1, z1)) if (s.on && s.y1 > y0 && s.y0 < y1 && x1 > s.x0 && x0 < s.x1 && z1 > s.z0 && z0 < s.z1) return false;
  for (const q of W.zones) if (q.type === 'water' && Math.abs(q.y - y0) < 0.6 && (q.c ? (Math.max(x0, Math.min(q.c[0], x1)) - q.c[0]) ** 2 + (Math.max(z0, Math.min(q.c[1], z1)) - q.c[1]) ** 2 < q.c[2] ** 2 : x1 > q.r[0] && x0 < q.r[2] && z1 > q.r[1] && z0 < q.r[3])) return false;
  for (const l of W.ladders) if (x1 > l.x0 - 0.5 && x0 < l.x1 + 0.5 && z1 > l.z0 - 0.5 && z0 < l.z1 + 0.5) return false;
  return true;
}

// Точка внутри твёрдого объекта? (для летящих предметов) — возвращает нормаль удара
export function solidHit(p, r) {
  for (const s of solidsNear(p.x - r, p.z - r, p.x + r, p.z + r)) {
    if (!s.on || p.y + r < s.y0 || p.y - r > s.y1) continue;
    if (p.x + r < s.x0 || p.x - r > s.x1 || p.z + r < s.z0 || p.z - r > s.z1) continue;
    const pen = [[p.x + r - s.x0, -1, 0, 0], [s.x1 - (p.x - r), 1, 0, 0], [p.z + r - s.z0, 0, 0, -1], [s.z1 - (p.z - r), 0, 0, 1], [s.y1 - (p.y - r), 0, 1, 0], [p.y + r - s.y0, 0, -1, 0]];
    pen.sort((a, b) => a[0] - b[0]);
    return { s, depth: pen[0][0], n: [pen[0][1], pen[0][2], pen[0][3]] };
  }
  return null;
}

/* Толкаемые предметы: тележки и бочки */
export function updatePushables(dt, player) {
  for (const b of W.pushables) {
    if (b.grabbed) { b.hitSpeed = 0; continue; } // её ведёт игрок
    const op = { x: b.x, z: b.z };
    b.x += b.vx * dt; b.z += b.vz * dt;
    const p = { x: b.x, z: b.z };
    b.hitSpeed = 0;
    if (pushOut(p, b.r, b.y + 0.2, b.y + 1)) { b.hitSpeed = Math.hypot(b.vx, b.vz); b.vx *= -0.3; b.vz *= -0.3; }
    b.x = p.x; b.z = p.z;
    const f = Math.exp(-dt * (b.rider ? b.ride.fric : { barrel: 2.6, cart: 2.0, bin: 4, skate: 0.6, chair: 1.6, barrow: 2.4 }[b.kind])); b.vx *= f; b.vz *= f;
    const mv = Math.hypot(b.x - op.x, b.z - op.z);
    b.mesh.position.set(b.x, b.y, b.z);
    if (mv > 1e-4) {
      const ang = Math.atan2(b.x - op.x, b.z - op.z);
      if (b.kind === 'barrel') { b.roller.rotation.x += mv / b.r; b.mesh.rotation.y = ang; }
      else if (b.rider) b.mesh.rotation.y = b.heading;
      else if (b.kind !== 'chair') { let d = ang - b.mesh.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); b.mesh.rotation.y += d * Math.min(1, dt * 6); }
      else b.mesh.rotation.y += mv * 2;
    }
  }
  for (let i = 0; i < W.pushables.length; i++) for (let j = i + 1; j < W.pushables.length; j++) {
    const a = W.pushables[i], b = W.pushables[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r;
    if (d < m && d > 1e-4) { const k = (m - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
  }
  if (player) bumpPushables(player);
}
// Игрок толкает предметы, предметы мешают игроку
export function bumpPushables(pl) {
  const p = pl.pos;
  for (const b of W.pushables) {
    if (b.rider || b.grabbed || pl.ride) continue;
    if (p.y > b.y + b.h - 0.1 || p.y + pl.h < b.y) continue;
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz), m = b.r + pl.r;
    if (d >= m || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, over = m - d, share = 1 / (1 + b.mass);
    // тяжёлое почти не сдвигается, а игрок упирается в него
    b.x += nx * over * share; b.z += nz * over * share; p.x -= nx * over * (1 - share); p.z -= nz * over * (1 - share);
    const vn = pl.vel.x * nx + pl.vel.z * nz;
    if (vn > 0) {
      const target = vn * (b.mass > 3 ? 0.45 : 0.85);
      const cur = b.vx * nx + b.vz * nz;
      if (cur < target) { const add = (target - cur) * Math.min(1, 6 / b.mass * 0.25); b.vx += nx * add; b.vz += nz * add; }
      const slow = vn * (b.mass / (b.mass + 1.5)); pl.vel.x -= nx * slow; pl.vel.z -= nz * slow;
    }
  }
}
export function impulsePushables(x, z, r, power) {
  for (const b of W.pushables) {
    const dx = b.x - x, dz = b.z - z, d = Math.hypot(dx, dz);
    if (d < r + b.r && d > 1e-4) { b.vx += dx / d * power / b.mass; b.vz += dz / d * power / b.mass; }
  }
}

// Луч против твёрдых объектов (прицел броска): расстояние до первого попадания или maxT
export function raySolids(o, d, maxT, skip) {
  let best = maxT;
  const ex = o.x + d.x * maxT, ez = o.z + d.z * maxT;
  for (const s of solidsNear(Math.min(o.x, ex), Math.min(o.z, ez), Math.max(o.x, ex), Math.max(o.z, ez))) {
    if (!s.on || s === skip) continue;
    let t0 = 0, t1 = best, ok = true;
    for (let a = 0; a < 3; a++) {
      const oo = a === 0 ? o.x : a === 1 ? o.y : o.z, dd = a === 0 ? d.x : a === 1 ? d.y : d.z, mn = a === 0 ? s.x0 : a === 1 ? s.y0 : s.z0, mx = a === 0 ? s.x1 : a === 1 ? s.y1 : s.z1;
      if (Math.abs(dd) < 1e-9) { if (oo < mn || oo > mx) { ok = false; break; } continue; }
      let ta = (mn - oo) / dd, tb = (mx - oo) / dd; if (ta > tb) { const q = ta; ta = tb; tb = q; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 > 0 && t0 < best) best = t0;
  }
  return best;
}
