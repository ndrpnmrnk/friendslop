import { tipBin, animateTip } from './pushables.js';
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
  out.length = 0; stamp++;if(![x0,z0,x1,z1].every(Number.isFinite))return out;
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
/* Повёрнутые коробки (стрела крана, палуба катера): {cx, cz, yaw, lx0, lx1, lz0, lz1, y0, y1, on}.
   Точку переводим в локальные оси коробки и проверяем как обычный AABB. */
const _l = { x: 0, z: 0 };
export function obbLocal(o, x, z) { const c = Math.cos(o.yaw), s = Math.sin(o.yaw), dx = x - o.cx, dz = z - o.cz; _l.x = dx * c - dz * s; _l.z = dx * s + dz * c; return _l; }
export function addObb(o) { const b = { on: true, yaw: 0, ...o }; (W.obbs || (W.obbs = [])).push(b); return b; }
export let groundObb = null;
let _selfP = null;
export function groundAt(x, z, r, maxY) {
  let g = maxY >= 0 && !inHole(x, z) ? 0 : -60; groundObb = null;
  for (const s of solidsNear(x - r, z - r, x + r, z + r)) if (s.on && s.y1 <= maxY && s.y1 > g && overlapXZ(s, x, z, r)) g = s.y1;
  if (W.obbs) for (const o of W.obbs) { if (!o.on || o.y1 > maxY || o.y1 <= g) continue; const l = obbLocal(o, x, z); if (l.x + r > o.lx0 && l.x - r < o.lx1 && l.z + r > o.lz0 && l.z - r < o.lz1) { g = o.y1; groundObb = o; } }
  // на толкаемых предметах (бак, бочка, тележка) можно стоять, как на земле
  for (const b of W.pushables) { if (b.rider || b.grabbed || b === _selfP) continue; const top = b.y + b.h; if (top <= maxY && top > g && Math.hypot(x - b.x, z - b.z) < b.r * 0.92 + r * 0.5) g = top; }
  return g;
}

export function pushOut(p, r, yLow, yHigh) {
  let hit = false;
  for (const s of solidsNear(p.x - r, p.z - r, p.x + r, p.z + r)) {
    if (!s.on || s.oneWay || s.roof || s.y1 <= yLow || s.y0 >= yHigh) continue;
    const cx = clamp(p.x, s.x0, s.x1), cz = clamp(p.z, s.z0, s.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
    else {
      const l = p.x - s.x0, rr = s.x1 - p.x, bt = p.z - s.z0, tp = s.z1 - p.z, mn = Math.min(l, rr, tp, bt);
      if (mn === l) p.x = s.x0 - r; else if (mn === rr) p.x = s.x1 + r; else if (mn === bt) p.z = s.z0 - r; else p.z = s.z1 + r;
    }
  }
  if (W.obbs) for (const o of W.obbs) {
    if (!o.on || o.y1 <= yLow || o.y0 >= yHigh) continue;
    const l = obbLocal(o, p.x, p.z), lx = l.x, lz = l.z, cx = clamp(lx, o.lx0, o.lx1), cz = clamp(lz, o.lz0, o.lz1), dx = lx - cx, dz = lz - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true; let nx = lx, nz = lz;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = cx + dx / d * r; nz = cz + dz / d * r; }
    else { const a = lx - o.lx0, b2 = o.lx1 - lx, c2 = lz - o.lz0, e = o.lz1 - lz, mn = Math.min(a, b2, c2, e); if (mn === a) nx = o.lx0 - r; else if (mn === b2) nx = o.lx1 + r; else if (mn === c2) nz = o.lz0 - r; else nz = o.lz1 + r; }
    const c = Math.cos(o.yaw), s = Math.sin(o.yaw); p.x = o.cx + nx * c + nz * s; p.z = o.cz - nx * s + nz * c;
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
  // Потолок навеса останавливает прыжок, но не выталкивает в соседние ступени купола.
  for(const s of solidsNear(p.x-b.r*.5,p.z-b.r*.5,p.x+b.r*.5,p.z+b.r*.5))if(s.on&&s.roof&&overlapXZ(s,p.x,p.z,b.r*.5)&&oldY<s.y0-.1&&p.y+b.h>s.y0&&p.y<s.y0){p.y=s.y0-b.h-.015;v.y=Math.min(0,v.y);s.roofTouch=true;}
  const gy = groundAt(p.x, p.z, b.r * 0.6, Math.max(oldY, p.y) + b.step); b.groundObb = groundObb;
  b.landed = false;
  if (p.y <= gy) { if (v.y < -0.5 && !b.onGround) b.landed = true; p.y = gy; v.y = Math.max(0, v.y); b.onGround = true; }
  else b.onGround = false;
  if (v.y > 0) for (const s of solidsNear(p.x - b.r, p.z - b.r, p.x + b.r, p.z + b.r)) {
    if (s.on && !s.oneWay && overlapXZ(s, p.x, p.z, b.r * 0.6) && s.y0 >= oldY + b.h - 0.02 && s.y0 < p.y + b.h) { p.y = s.y0 - b.h; v.y = 0; }
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
  if (W.obbs) for (const o of W.obbs) {
    if (!o.on || p.y + r < o.y0 || p.y - r > o.y1) continue;
    const l = obbLocal(o, p.x, p.z); if (l.x + r < o.lx0 || l.x - r > o.lx1 || l.z + r < o.lz0 || l.z - r > o.lz1) continue;
    const pen = [[l.x + r - o.lx0, -1, 0, 0], [o.lx1 - (l.x - r), 1, 0, 0], [l.z + r - o.lz0, 0, 0, -1], [o.lz1 - (l.z - r), 0, 0, 1], [o.y1 - (p.y - r), 0, 1, 0], [p.y + r - o.y0, 0, -1, 0]];
    pen.sort((a, b) => a[0] - b[0]); const [d, nx, ny, nz] = pen[0], c = Math.cos(o.yaw), s = Math.sin(o.yaw);
    return { s: o, depth: d, n: [nx * c + nz * s, ny, -nx * s + nz * c] };
  }
  return null;
}

/* Толкаемые предметы: тележки и бочки */
export function recordImpact(b,hit,speed){if(hit&&!b.impactContact&&speed>1.8){b.impactSeq=(b.impactSeq||0)+1;b.impactSpeed=speed;}b.impactContact=hit;}
export function updatePushables(dt, player) {
  for (const b of W.pushables) {
    if (b.grabbed) { b.hitSpeed = 0; continue; } // её ведёт игрок
    const op = { x: b.x, z: b.z };
    b.x += b.vx * dt; b.z += b.vz * dt;
    const p = { x: b.x, z: b.z };
    b.hitSpeed = 0;
    const hit=pushOut(p,b.r,b.y+(b.ride&&b.kind!=='ring'?.5:.2),b.y+1);recordImpact(b,hit,Math.hypot(b.vx,b.vz));
    if (hit) { b.hitSpeed = Math.hypot(b.vx, b.vz); b.vx *= -0.3; b.vz *= -0.3; }
    b.x = p.x; b.z = p.z;
    const f = Math.exp(-dt * (b.rider ? b.ride.fric : { table: 6, sack: 7, barrel: 2.6, cart: 2.0, bin: b.tipped ? 6 : 4, skate: 0.6, chair: 1.6, barrow: 2.4, tire: 0.9, scooter: 0.8, kidcar: 2, ring: 1.2, gurney: 2.0 }[b.kind] ?? 4)); b.vx *= f; b.vz *= f;
    if (b.tipped) animateTip(b, dt);
    // колёсное едет по рельефу: заезжает на рампы, с разгона взлетает, падает со ступенек; скейт скользит по перилам
    if (b.ride && b.kind !== 'ring') {
      _selfP = b; let gy = groundAt(b.x, b.z, b.r * 0.4, b.y + 0.35); _selfP = null; b.vy = b.vy || 0;
      if (W.rails && (b.kind === 'skate' || b.kind === 'scooter')) for (const r of W.rails) {
        const ex = r.x1 - r.x0, ez = r.z1 - r.z0, L2 = ex * ex + ez * ez, u = ((b.x - r.x0) * ex + (b.z - r.z0) * ez) / L2; if (u < 0 || u > 1) continue;
        const qx = r.x0 + ex * u, qz = r.z0 + ez * u; if (Math.hypot(b.x - qx, b.z - qz) > 0.35 || b.y < r.y - 0.25 || b.y > r.y + 0.7 || b.vy > 0.5) continue;
        gy = Math.max(gy, r.y); if (!b.grind) { b.grind = r; W.onGrind && W.onGrind(b); } const L = Math.sqrt(L2), tx = ex / L, tz = ez / L, v = b.vx * tx + b.vz * tz; b.vx = tx * v; b.vz = tz * v; b.x = qx; b.z = qz;
      }
      if (b.grind && Math.abs(b.y - b.grind.y) > 0.05) b.grind = null;
      const board = b.kind === 'skate' || b.kind === 'scooter';
      if (b.y > gy + 0.02) { b.vy -= 22 * dt; b.y = Math.max(gy, b.y + b.vy * dt); if (b.y <= gy) { if (b.vy < -7 && b.rider) b.hardLand = -b.vy; b.vy = 0; } b.air = b.y > gy; if (board) b.pitch = (b.pitch || 0) * Math.exp(-dt * 3); }
      else {
        const rise = gy - b.y; b.vy = rise > 0.005 ? Math.min(8, rise / dt * 0.85) : 0;
        if (board) {
          /* доска «прилипает» к рампе: наклон по рельефу вдоль хода, на подъёме её тянет назад вниз —
             по инерции заезжает вверх и скатывается обратно (как в халфпайпе) */
          const h = b.rider ? b.heading : b.mesh.rotation.y, fx = Math.sin(h), fz = Math.cos(h);
          _selfP = b; const gF = groundAt(b.x + fx * 0.35, b.z + fz * 0.35, 0.05, b.y + 0.7), gB = groundAt(b.x - fx * 0.35, b.z - fz * 0.35, 0.05, b.y + 0.7); _selfP = null;
          const sl = Number.isFinite(gF) && Number.isFinite(gB) && Math.abs(gF - gB) < 1.5 ? Math.max(-2.5, Math.min(2.5, (gF - gB) / 0.7)) : 0, a = -21 * sl / Math.sqrt(1 + sl * sl);
          b.vx += fx * a * dt; b.vz += fz * a * dt; b.pitch = (b.pitch || 0) + (Math.atan(sl) - (b.pitch || 0)) * Math.min(1, dt * 14);
          if (b.vy > 0) b.vy *= 0.8;
        } else if (rise > 0.01) { const k = Math.max(0.7, 1 - rise * 0.6); b.vx *= k; b.vz *= k; }
        b.y = gy; b.air = false;
      }
    }
    b.mesh.position.set(b.x, b.y + (b.kind === 'ring' ? Math.sin(performance.now() * 0.003 + b.x) * 0.04 : 0), b.z);
    // движение по форме: стоячий бак скользит не поворачиваясь; бочка, шина и колёсное едут вдоль «колёс»,
    // боковое скольжение гасится, направление плавно доворачивается к толчку
    const sp = Math.hypot(b.vx, b.vz);
    if (b.rider) { b.mesh.rotation.order = 'YXZ'; b.mesh.rotation.set(-(b.pitch || 0), b.heading + (b.shuv || 0), b.flip || 0); }
    else if ((b.kind === 'skate' || b.kind === 'scooter') && (b.pitch || b.flip)) { b.mesh.rotation.order = 'YXZ'; b.mesh.rotation.x = -(b.pitch || 0); b.mesh.rotation.z = 0; b.flip = 0; b.shuv = 0; }
    else if (b.kind === 'chair') b.mesh.rotation.y += Math.hypot(b.x - op.x, b.z - op.z) * 2;
    else if (b.kind !== 'bin' && sp > 0.02) {
      let h = b.mesh.rotation.y; const fx = Math.sin(h), fz = Math.cos(h);
      let vf = b.vx * fx + b.vz * fz, vs = b.vx * fz - b.vz * fx;
      vs *= Math.exp(-dt * (b.roller ? 5 : 7));
      let want = Math.atan2(b.vx, b.vz), d = want - h; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > Math.PI / 2) d = Math.atan2(Math.sin(d + Math.PI), Math.cos(d + Math.PI));
      h += Math.max(-1, Math.min(1, d)) * Math.min(1, dt * (b.roller ? 1.6 : 2.6) * Math.min(1, sp));
      const nfx = Math.sin(h), nfz = Math.cos(h);
      b.vx = nfx * vf + nfz * vs; b.vz = nfz * vf - nfx * vs; b.mesh.rotation.y = h;
      if (b.roller) b.roller.rotation.x += vf * dt / b.r;
    }
  }
  for (let i = 0; i < W.pushables.length; i++) for (let j = i + 1; j < W.pushables.length; j++) {
    const a = W.pushables[i], b = W.pushables[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r;
    if (d < m && d > 1e-4 && a.y<b.y+b.h && b.y<a.y+a.h) { const closing=((a.vx-b.vx)*dx+(a.vz-b.vz)*dz)/d;if(closing>1.8){recordImpact(a,true,closing);recordImpact(b,true,closing);if(a.kind==='kart'&&b.kind==='kart'&&closing>8){for(const c of [a,b]){if(c.rider)c.rider.daze=Math.max(c.rider.daze||0,1.0);c.heading+=(c===a?1:-1)*.6;c.skid=1;c.spin=(c===a?1:-1)*2;}}const impulse=closing*.6;a.vx-=dx/d*impulse;a.vz-=dz/d*impulse;b.vx+=dx/d*impulse;b.vz+=dz/d*impulse;} const k = (m - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
  }
  if (player) bumpPushables(player);
}
// Игрок толкает предметы, предметы мешают игроку
export function bumpPushables(pl) {
  const p = pl.pos;
  for (const b of W.pushables) {
    if (b.rider || b.grabbed || pl.ride) continue;
    const top = b.y + b.h;
    if (p.y > top - 0.06 || p.y + pl.h < b.y) {
      // стоит сверху — предмет стоит как вкопанный
      if (p.y >= top - 0.06 && p.y < top + 0.08 && Math.hypot(p.x - b.x, p.z - b.z) < b.r + pl.r * 0.5) { b.vx = 0; b.vz = 0; }
      continue;
    }
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz), m = b.r + pl.r;
    if (d >= m || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, over = m - d;
    // запрыгивает/цепляется выше середины — предмет не двигается, персонажа мягко сдвигает
    if (!pl.onGround && p.y > b.y + b.h * 0.45) { p.x -= nx * over; p.z -= nz * over; continue; }
    const share = 1 / (1 + b.mass);
    // тяжёлое почти не сдвигается, а игрок упирается в него
    b.x += nx * over * share; b.z += nz * over * share; p.x -= nx * over * (1 - share); p.z -= nz * over * (1 - share);
    const vn = pl.vel.x * nx + pl.vel.z * nz;
    if (b.kind === 'bin' && vn > 8.5) tipBin(b, nx, nz);
    if (vn > 0) {
      pl.pushing = 0.15;
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
    if (d < r + b.r && d > 1e-4) { b.vx += dx / d * power / b.mass; b.vz += dz / d * power / b.mass; if (power >= 3.5) tipBin(b, dx / d, dz / d); }
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

/* Материал в точке удара — для звука (v0.18): вода, листва/трава, металл машин, дерево полов в зданиях, земля, бетон */
export function materialAt(x, y, z) {
  if (zoneAt(x, z, y, 'water') || zoneAt(x, z, y, 'puddle')) return 'water';
  if (zoneAt(x, z, y, 'leaves')) return 'grass';
  for (const c of W.cars) if (Math.hypot(c.x - x, c.z - z) < 2.2 && y < c.y + 1.8) return 'metal';
  if (y > 0.6 && (zoneAt(x, z, y, 'floor') || zoneAt(x, z, y, 'inside'))) return 'wood';
  const gy = groundAt(x, z, 0.3, y + 0.3);
  if (y - gy > 0.4) return 'concrete';
  for (const d of W.districts) if (x > d.ox && x < d.x1 && z > d.oz && z < d.z1) return d.ground === 'grass' ? 'grass' : d.ground === 'dirt' ? 'dirt' : 'concrete';
  return 'concrete';
}
