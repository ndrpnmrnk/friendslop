import { THREE, G, V3, mesh, col, tmat, lam } from '../core/gfx.js';
import { addOutline } from './outline.js';
import { PFACE } from '../world/builder.js';
import { T } from '../core/textures.js';
import { CONFIG } from '../config.js';
import { W } from '../world/state.js';
import { groundAt, solidHit, addZone, impulsePushables } from '../world/physics.js';
import { puff, burst, chunk, decal } from '../world/particles.js';
import { scareBirds } from '../world/birds.js';
import { hitBreakables } from '../world/breakables.js';

/* Предметы для броска. Лежат в своих районах, их можно подобрать (E) и кинуть (зажать ПКМ). */
const GRAV = 22;
function build(type) {
  const g = new THREE.Group();
  if (type === 'balloon') {
    mesh(G.sph, lam({ map: T.balloon(), transparent: true, opacity: 0.92 }, 'balloon'), 0, 0, 0, 0.22, 0.26, 0.22, g);
    mesh(G.cone4, col(0x1a5ab0), 0, -0.27, 0, 0.05, 0.07, 0.05, g);
  } else if (type === 'tomato') {
    mesh(G.sph, tmat(T.tomato()), 0, 0, 0, 0.16, 0.14, 0.16, g);
    mesh(G.cone4, col(0x3f6b2a), 0, 0.14, 0, 0.08, 0.05, 0.08, g);
  } else if (type === 'pumpkin') {
    mesh(G.sph10, tmat(T.pumpkin()), 0, 0, 0, 0.32, 0.26, 0.32, g);
    mesh(G.cyl6, col(0x3f6b2a), 0, 0.28, 0, 0.05, 0.14, 0.05, g);
    const f = mesh(G.plane, PFACE(), 0, 0.01, 0.315, 0.36, 0.3, 1, g); f.userData.noOutline = true;
  } else if (type === 'ball') {
    mesh(G.sph10, tmat(T.ball()), 0, 0, 0, 0.24, 0.24, 0.24, g);
  } else if (type === 'brick') {
    mesh(G.box, tmat(T.brickItem()), 0, 0, 0, 0.42, 0.18, 0.22, g);
  } else if (type === 'chair') {
    const w = tmat(T.wood()), dk = col(0x2b2533);
    mesh(G.box, w, 0, 0.15, 0, 0.5, 0.06, 0.5, g); mesh(G.box, w, 0, 0.45, -0.22, 0.5, 0.55, 0.05, g);
    for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) mesh(G.box, dk, a, -0.08, b, 0.05, 0.45, 0.05, g);
  } else if (type === 'cone') {
    mesh(G.cone8, col(0xff6a1a), 0, 0.05, 0, 0.2, 0.55, 0.2, g); mesh(G.cyl8, col(0xf1e8ff), 0, 0.08, 0, 0.13, 0.08, 0.13, g);
    mesh(G.box, col(0xff6a1a), 0, -0.22, 0, 0.42, 0.05, 0.42, g);
  }
  return g;
}
export function addItem(type, x, y, z, ry = 0) {
  const def = CONFIG.items[type], g = build(type); W.group.add(g);
  const it = { type, def, g, pos: g.position, vel: new V3(), state: 'rest', home: { x, y, z, ry }, respawnT: 0, spin: new V3(), noHit: 0, outline: addOutline(g) };
  g.rotation.y = ry;
  it.pos.set(x, y + def.r, z);
  W.items.push(it); return it;
}
function vanish(it) {
  it.g.visible = false; it.state = 'gone'; it.respawnT = it.def.respawn || 0;
}
function respawn(it) {
  const h = it.home; it.pos.set(h.x, h.y + it.def.r, h.z); it.vel.set(0, 0, 0); it.g.rotation.set(0, h.ry || 0, 0);
  it.g.visible = true; it.state = 'rest';
  puff(h.x, h.y + 0.3, h.z, { size: 0.5, life: 0.5, vy: 0.4 });
}

/* Попадания */
function hitActors(it, p, heavy) {
  const r = heavy ? 1.1 : 0.9;
  for (const c of W.cats) { const cp = c.root.position; if (Math.hypot(cp.x - p.x, cp.z - p.z) < r && Math.abs(cp.y - p.y) < 1.2) c.hit(heavy, it.vel.x, it.vel.z); }
  scareBirds(p.x, p.z, heavy ? 5 : 3.5);
  impulsePushables(p.x, p.z, 0.6, heavy ? 4 : 1.5);
}
function impact(it, n, speed) {
  const p = it.pos, t = it.type, gy = groundAt(p.x, p.z, 0.1, p.y + 0.3);
  hitBreakables(p, it.def.r + 0.12, [it.vel.x, it.vel.y, it.vel.z], it.def.mass);
  hitActors(it, p, it.def.heavy);
  if (t === 'balloon') {
    burst(p.x, p.y, p.z, 14, { color: 0x6ab8f0, size: 0.28, speed: 3, up: 2.5 });
    decal(T.splat('#4a90d0'), p.x, gy, p.z, 2.4, 7, 0xffffff);
    addZone('puddle', { c: [p.x, p.z, 1.15] }, gy, { expires: 7 });
    vanish(it);
  } else if (t === 'tomato') {
    burst(p.x, p.y, p.z, 10, { color: 0xd8301a, size: 0.22, speed: 2.5 });
    decal(T.splat('#b8200e'), p.x, gy, p.z, 1.1, 6);
    vanish(it);
  } else if (t === 'pumpkin') {
    const m = tmat(T.pumpkin());
    for (let i = 0; i < 9; i++) chunk(p.x, p.y, p.z, [(Math.random() - 0.5) * 5 + it.vel.x * 0.15, 2 + Math.random() * 3, (Math.random() - 0.5) * 5 + it.vel.z * 0.15], { mat: m, size: 0.18 + Math.random() * 0.1, life: 2.5 });
    burst(p.x, p.y, p.z, 6, { color: 0xffd25c, size: 0.2, speed: 2 });
    vanish(it);
  } else if (t === 'chair' && speed > 9) {
    const m = tmat(T.wood());
    for (let i = 0; i < 6; i++) chunk(p.x, p.y, p.z, [(Math.random() - 0.5) * 5, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 5], { mat: m, size: 0.14, sx: 3, sy: 0.4, sz: 0.8, life: 2.5 });
    burst(p.pos ? p.x : p.x, p.y, p.z, 5, { color: 0x8a6a4a, size: 0.35, speed: 1.5 });
    vanish(it);
  } else if (t === 'brick' && speed > 12) {
    const m = tmat(T.brickItem());
    for (let i = 0; i < 6; i++) chunk(p.x, p.y, p.z, [(Math.random() - 0.5) * 4, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 4], { mat: m, size: 0.1 + Math.random() * 0.06, life: 2 });
    burst(p.x, p.y, p.z, 6, { color: 0xa06a5a, size: 0.25, speed: 1.5 });
    vanish(it);
  } else {
    // мяч и не разбившийся кирпич отскакивают
    const e = it.def.bounce, vn = it.vel.x * n[0] + it.vel.y * n[1] + it.vel.z * n[2];
    it.vel.x -= (1 + e) * vn * n[0]; it.vel.y -= (1 + e) * vn * n[1]; it.vel.z -= (1 + e) * vn * n[2];
    const fr = 1 - Math.min(0.7, it.def.mass * 0.25); it.vel.x *= fr; it.vel.z *= fr;
    puff(p.x, p.y - it.def.r * 0.5, p.z, { size: 0.35, life: 0.4, vy: 0.3 });
    it.state = 'rest';
  }
}

function simulate(it, dt, flying) {
  const r = it.def.r, p = it.pos, v = it.vel;
  const steps = Math.min(6, Math.ceil(v.length() * dt / (r * 0.8)) || 1), h = dt / steps;
  const drag = Math.exp(-it.def.drag * h);
  for (let s = 0; s < steps; s++) {
    v.y -= GRAV * h; v.multiplyScalar(drag); p.addScaledVector(v, h);
    const gy = groundAt(p.x, p.z, r * 0.5, p.y + r * 0.5);
    if (p.y - r < gy) {
      p.y = gy + r;
      if (flying) { const sp = v.length(); impact(it, [0, 1, 0], sp); return; }
      if (v.y < -1.5) v.y = -v.y * it.def.bounce; else v.y = 0;
    }
    const hit = solidHit(p, r);
    if (hit) {
      p.x += hit.n[0] * hit.depth; p.y += hit.n[1] * hit.depth; p.z += hit.n[2] * hit.depth;
      if (flying) { impact(it, hit.n, v.length()); return; }
      const vn = v.x * hit.n[0] + v.z * hit.n[2]; if (vn < 0) { v.x -= 1.6 * vn * hit.n[0]; v.z -= 1.6 * vn * hit.n[2]; }
    }
  }
  if (!flying) {
    const onG = p.y - r <= groundAt(p.x, p.z, r * 0.5, p.y) + 0.02;
    // трение: круглые катятся, кирпич быстро останавливается
    if (onG) { const f = Math.exp(-dt * ({ ball: 0.9, pumpkin: 1.6, balloon: 2, tomato: 2.5, brick: 7, chair: 6, cone: 3 }[it.type])); v.x *= f; v.z *= f; }
    if (!['brick', 'chair', 'cone'].includes(it.type)) { it.g.rotation.x += v.z * dt / r; it.g.rotation.z -= v.x * dt / r; }
  } else { it.g.rotation.x += dt * 8; it.g.rotation.y += dt * 5; }
}

export function updateItems(dt, pl) {
  for (const it of W.items) {
    if (it.state === 'gone') { if (it.def.respawn) { it.respawnT -= dt; if (it.respawnT <= 0) respawn(it); } continue; }
    if (it.state === 'held') continue;
    if (it.state === 'fly') { simulate(it, dt, true); continue; }
    // лежит: мяч и упавшие предметы живут по физике
    const moving = it.vel.lengthSq() > 0.01 || it.pos.y - it.def.r > groundAt(it.pos.x, it.pos.z, it.def.r * 0.5, it.pos.y) + 0.05;
    if (moving) simulate(it, dt, false);
    if (pl && pl.held !== it) {
      const dx = it.pos.x - pl.pos.x, dz = it.pos.z - pl.pos.z, d = Math.hypot(dx, dz), m = it.def.r + pl.r;
      if (d < m && d > 1e-3 && it.pos.y - it.def.r < pl.pos.y + 0.6 && it.pos.y > pl.pos.y - 0.2) {
        const nx = dx / d, nz = dz / d, k = 1 / Math.sqrt(it.def.mass);
        it.pos.x += nx * (m - d); it.pos.z += nz * (m - d);
        const vn = pl.vel.x * nx + pl.vel.z * nz;
        if (vn > 0.5) { it.vel.x = nx * vn * 0.8 * k; it.vel.z = nz * vn * 0.8 * k; it.vel.y = Math.min(3.5, vn * 0.35 * k); }
      }
    }
  }
  for (let i = W.zones.length - 1; i >= 0; i--) { const z = W.zones[i]; if (z.expires !== undefined) { z.expires -= dt; if (z.expires <= 0) W.zones.splice(i, 1); } }
}

export function nearestItem(p, r) {
  let best = null, bd = r;
  for (const it of W.items) {
    if (it.state !== 'rest') continue;
    const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
    if (d < bd && it.pos.y > p.y - 0.6 && it.pos.y < p.y + 1.8) { bd = d; best = it; }
  }
  return best;
}
export function pickUp(it) { it.state = 'held'; it.vel.set(0, 0, 0); it.g.rotation.set(0, 0, 0); }
export function drop(it, x, y, z) { it.state = 'rest'; it.pos.set(x, y + it.def.r + 0.05, z); it.vel.set(0, 0, 0); }

/* Расчёт броска по дуге к точке прицела */
export function throwVelocity(from, target, charge, def) {
  const dx = target.x - from.x, dz = target.z - from.z, dist = Math.hypot(dx, dz) || 0.001;
  const { minRange, maxRange } = CONFIG.throw, mk = Math.max(0.45, Math.min(1.25, 0.8 / Math.sqrt(def.mass)));
  const range = (minRange + (maxRange - minRange) * charge) * mk, d = Math.min(dist, range);
  // тяжёлое летит медленнее и ниже по дуге
  const T = (0.32 + d * 0.035) * (def.mass > 1.5 ? 1.15 : 1), vh = d / T, dy = (dist <= range ? target.y : from.y - 0.5) - from.y;
  // поправка на сопротивление воздуха, чтобы лёгкое прилетало в прицел
  const dragK = 1 + def.drag * T * 0.5;
  return new V3(dx / dist * vh * dragK, (dy + 0.5 * GRAV * T * T) / T, dz / dist * vh * dragK);
}
export function launch(it, from, vel) { it.state = 'fly'; it.pos.copy(from); it.vel.copy(vel); it.g.visible = true; }
export function predict(from, vel, out, n, def, end) {
  const p = from.clone(), v = vel.clone(), h = 0.04, drag = Math.exp(-def.drag * h); let k = 0;
  for (let i = 0; i < 120 && k < n; i++) {
    v.y -= GRAV * h; v.multiplyScalar(drag); p.addScaledVector(v, h);
    const gy = groundAt(p.x, p.z, 0.05, p.y + 0.2);
    if (p.y < gy || solidHit(p, 0.05)) { if (end) { end.position.set(p.x, Math.max(gy, p.y) + 0.04, p.z); end.visible = true; } break; }
    if (i % 2 === 0) out[k++].position.copy(p);
  }
  return k;
}
