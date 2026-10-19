import { W } from './state.js';

/* Подвешенное (качели, бельё, вывески на цепях): маятник вокруг оси X своей группы.
   Пробежал рядом / задел / попал броском — раскачивается и плавно затухает. */
export function addSwinger(pivot, o = {}) {
  const s = { pivot, ang: 0, vel: 0, len: o.len ?? 1.5, damp: o.damp ?? 0.6, max: o.max ?? 1.1, r: o.r ?? 0.6, idle: o.idle ?? 0, ph: Math.random() * 6, seat: o.seat || null };
  pivot.rotation.order = 'YXZ'; W.keep.push(pivot); (W.swingers || (W.swingers = [])).push(s); return s;
}
const G = 22;
export function updateSwingers(dt, t, pl) {
  const L = W.swingers; if (!L) return;
  for (const s of L) {
    const p = s.pivot.getWorldPosition ? s.pivot.position : null; if (!p) continue;
    // ось качания — локальная X группы: «вперёд» по качанию — её локальная Z в мире
    const ry = s.pivot.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry);
    const bx = p.x + fx * Math.sin(s.ang) * s.len, by = p.y - Math.cos(s.ang) * s.len, bz = p.z + fz * Math.sin(s.ang) * s.len;
    if (pl && !s.rider) {
      const dx = pl.pos.x - bx, dz = pl.pos.z - bz, dy = pl.pos.y + 0.8 - by;
      if (dx * dx + dz * dz < (s.r + pl.r) ** 2 && Math.abs(dy) < 1.1) {
        const vf = pl.vel.x * fx + pl.vel.z * fz;
        s.vel += vf * 0.9 * dt * 4 / s.len;
        if (Math.abs(vf) < 0.5) s.vel += Math.sign(fx * -dx + fz * -dz || 1) * dt * 2; // стоишь вплотную — слегка толкаешь
      }
    }
    for (const it of W.items) {
      if (it.state !== 'fly') continue;
      const dx = it.pos.x - bx, dy = it.pos.y - by, dz = it.pos.z - bz;
      if (dx * dx + dy * dy + dz * dz < (s.r + it.def.r) ** 2) { s.vel += (it.vel.x * fx + it.vel.z * fz) * 0.35 * (it.def.mass || 1) / s.len; it.vel.multiplyScalar(0.6); }
    }
    if (s.rider) s.vel += s.drive * dt;
    s.vel += -G / s.len * Math.sin(s.ang) * dt; s.vel *= Math.exp(-dt * s.damp);
    s.ang += s.vel * dt; if (Math.abs(s.ang) > s.max) { s.ang = Math.sign(s.ang) * s.max; s.vel *= -0.3; }
    s.pivot.rotation.x = -s.ang + (s.idle ? Math.sin(t * 1.3 + s.ph) * s.idle : 0);
  }
}
