import { THREE, G, mesh, alphaMat } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { groundAt } from './physics.js';

/* Пиксельные частицы: дым, пыль, брызги. Спрайты переиспользуются. */
let pool = [];
export const resetParticles = () => { pool = []; };
export function puff(x, y, z, o = {}) {
  let p = pool.find(q => !q.alive);
  if (!p) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.puff(), transparent: true, depthWrite: false }));
    W.group.add(s); p = { s }; pool.push(p);
  }
  p.alive = true; p.t = 0; p.life = o.life ?? 0.7; p.size = o.size ?? 0.6; p.grow = o.grow ?? 1.6;
  p.v = [o.vx ?? (Math.random() - 0.5) * 0.4, o.vy ?? 0.7, o.vz ?? (Math.random() - 0.5) * 0.4]; p.g = o.g ?? 0;
  p.s.material.color.setHex(o.color ?? 0xd8d0e4); p.s.material.opacity = o.opacity ?? 0.85; p.a0 = p.s.material.opacity;
  p.s.position.set(x, y, z); p.s.visible = true; p.s.scale.setScalar(p.size);
}
export function burst(x, y, z, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, sp = (o.speed ?? 3) * (0.4 + Math.random() * 0.6);
    puff(x, y, z, { ...o, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: (o.up ?? 2) * (0.5 + Math.random()), g: o.g ?? 9, grow: o.grow ?? 0.3, life: o.life ?? 0.6 });
  }
}

/* Обломки: тыквы, кирпичи, стены */
export function chunk(x, y, z, vel, o = {}) {
  const s = o.size ?? 0.18;
  const m = mesh(o.geo || G.box, o.mat, x, y, z, s * (o.sx ?? 1), s * (o.sy ?? 1), s * (o.sz ?? 1), W.group);
  m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  W.debris.push({ m, v: vel.slice(), spin: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10], life: o.life ?? 3, r: s * 0.5, s0: m.scale.clone() });
  return m;
}

/* Наклейки на земле: брызги помидора, лужи */
export function decal(tex, x, y, z, size, life, color) {
  const m = mesh(G.plane, alphaMat(tex, { color: color ?? 0xffffff, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }), x, y + 0.02, z, size, size, 1, W.group);
  m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6.28;
  W.decals.push({ m, life, t: 0 }); return m;
}

export function updateParticles(dt) {
  for (const p of pool) {
    if (!p.alive) continue;
    p.t += dt; const k = p.t / p.life;
    if (k >= 1) { p.alive = false; p.s.visible = false; continue; }
    p.v[1] -= p.g * dt;
    p.s.position.x += p.v[0] * dt; p.s.position.y += p.v[1] * dt; p.s.position.z += p.v[2] * dt;
    p.s.scale.setScalar(p.size * (1 + p.grow * k)); p.s.material.opacity = p.a0 * (1 - k * k);
  }
  for (let i = W.debris.length - 1; i >= 0; i--) {
    const d = W.debris[i], m = d.m;
    d.life -= dt; d.v[1] -= 22 * dt;
    m.position.x += d.v[0] * dt; m.position.y += d.v[1] * dt; m.position.z += d.v[2] * dt;
    m.rotation.x += d.spin[0] * dt; m.rotation.y += d.spin[1] * dt; m.rotation.z += d.spin[2] * dt;
    const gy = groundAt(m.position.x, m.position.z, 0.05, m.position.y + 0.3);
    if (m.position.y - d.r < gy) {
      m.position.y = gy + d.r; d.v[1] = Math.abs(d.v[1]) > 2 ? -d.v[1] * 0.3 : 0;
      d.v[0] *= 0.6; d.v[2] *= 0.6; d.spin = d.spin.map(s => s * 0.5);
    }
    if (d.life < 0.6) m.scale.copy(d.s0).multiplyScalar(Math.max(0.01, d.life / 0.6));
    if (d.life <= 0) { W.group.remove(m); W.debris.splice(i, 1); }
  }
  for (let i = W.decals.length - 1; i >= 0; i--) {
    const d = W.decals[i]; d.t += dt;
    if (d.t > d.life - 1) d.m.material.opacity = Math.max(0, d.life - d.t) * 0.9;
    if (d.t >= d.life) { W.group.remove(d.m); d.m.material.dispose(); W.decals.splice(i, 1); }
  }
}
