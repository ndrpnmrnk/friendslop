import { THREE, G, mesh, alphaMat, ps1 } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { groundAt } from './physics.js';

/* Пиксельные частицы: дым, пыль, брызги. Спрайты переиспользуются. */
let pool = [], smokes = [], ripples = [];
export const resetParticles = () => { pool = []; smokes = []; ripples = []; };
// круги на воде
export function ripple(x, y, z, size = 1, life = 0.9) {
  let p = ripples.find(q => !q.alive);
  if (!p) { const m = new THREE.Mesh(G.plane, alphaMat(T.ripple(), { opacity: 0.8 })); m.rotation.x = -Math.PI / 2; W.group.add(m); p = { m }; ripples.push(p); }
  p.alive = true; p.t = 0; p.life = life; p.size = size; p.m.position.set(x, y + 0.11, z); p.m.visible = true; p.m.scale.setScalar(0.1);
}
// всплеск: капли + круг
export function splash(x, y, z, power = 1) {
  burst(x, y + 0.1, z, Math.round(6 + 8 * power), { color: 0x9ccbec, size: 0.16 + 0.08 * power, speed: 1.2 + 1.6 * power, up: 2 + 2 * power, g: 12, life: 0.6 });
  ripple(x, y, z, 1 + power * 1.2, 0.8 + power * 0.4);
  if (power > 0.6) ripple(x, y, z, 0.6 + power, 0.6);
}

/* Объёмный стилизованный дым: угловатые клубы (низкополигональные), растут, крутятся и тают.
   Мелкая пыль — крошечные кубики, которые подпрыгивают и падают. */
const SMOKE_GEO = new THREE.IcosahedronGeometry(1, 0), DUST_GEO = new THREE.BoxGeometry(1, 1, 1);
export function smoke(x, y, z, o = {}) {
  const dust = !!o.dust, geo = dust ? DUST_GEO : SMOKE_GEO;
  let p = smokes.find(q => !q.alive && q.dust === dust);
  if (!p) {
    const mat = ps1(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, depthWrite: false, flatShading: true }));
    const m = new THREE.Mesh(geo, mat); W.group.add(m); p = { m, dust }; smokes.push(p);
  }
  p.alive = true; p.t = 0; p.life = o.life ?? (dust ? 0.35 : 0.7); p.s0 = o.size ?? (dust ? 0.05 : 0.22); p.s1 = o.grow ?? (dust ? 0.05 : 0.6);
  p.v = [o.vx ?? (Math.random() - 0.5) * 0.5, o.vy ?? (dust ? 1.6 + Math.random() : 0.5), o.vz ?? (Math.random() - 0.5) * 0.5]; p.g = o.g ?? (dust ? 9 : -0.4);
  p.spin = [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3]; p.a0 = o.opacity ?? (dust ? 0.9 : 0.8);
  p.m.material.color.setHex(o.color ?? (dust ? 0x8a7a8e : 0xd6cfe2)); p.m.material.opacity = p.a0;
  p.m.position.set(x, y, z); p.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); p.m.scale.setScalar(p.s0); p.m.visible = true;
}
// кольцо клубов вокруг точки (прыжок, приземление, подкат)
export function smokeRing(x, y, z, n, o = {}) {
  for (let i = 0; i < n; i++) { const a = i / n * 6.28 + Math.random() * 0.5, sp = (o.speed ?? 2) * (0.6 + Math.random() * 0.5);
    smoke(x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2, { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: o.up ?? 0.4, size: o.size ?? 0.18, grow: o.grow ?? 0.5, life: o.life ?? 0.6, g: -0.2, color: o.color }); }
}
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
  W.debris.push({ m, v: vel.slice(), spin: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10], life: o.life ?? 3, r: o.r ?? s * 0.5, s0: m.scale.clone() });
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
  for (const p of ripples) {
    if (!p.alive) continue;
    p.t += dt; const k = p.t / p.life;
    if (k >= 1) { p.alive = false; p.m.visible = false; continue; }
    p.m.scale.setScalar(0.2 + p.size * 2 * (1 - (1 - k) * (1 - k))); p.m.material.opacity = 0.8 * (1 - k);
  }
  for (const p of smokes) {
    if (!p.alive) continue;
    p.t += dt; const k = p.t / p.life;
    if (k >= 1) { p.alive = false; p.m.visible = false; continue; }
    p.v[1] -= p.g * dt; const drag = Math.exp(-dt * (p.dust ? 0.5 : 2.5)); p.v[0] *= drag; p.v[2] *= drag;
    p.m.position.x += p.v[0] * dt; p.m.position.y += p.v[1] * dt; p.m.position.z += p.v[2] * dt;
    if (p.dust) { const gy = groundAt(p.m.position.x, p.m.position.z, 0, p.m.position.y + 0.3); if (p.m.position.y < gy + 0.02) { p.m.position.y = gy + 0.02; p.v[1] = 0; p.v[0] *= 0.5; p.v[2] *= 0.5; } }
    p.m.rotation.x += p.spin[0] * dt; p.m.rotation.y += p.spin[1] * dt; p.m.rotation.z += p.spin[2] * dt;
    const e = 1 - (1 - k) * (1 - k); p.m.scale.setScalar(p.s0 + (p.s1 - p.s0) * e);
    p.m.material.opacity = p.a0 * (k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6);
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
