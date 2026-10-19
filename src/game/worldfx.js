import { THREE, G, V3, col, lam, glow, tmat, mesh, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addZone, groundAt, solidsNear, isFree } from '../world/physics.js';
import { burst, puff, smokeRing, splash, chunk } from '../world/particles.js';
import { scareBirds } from '../world/birds.js';
import { addItem, launch } from './items.js';
import { cam } from './camera.js';

/* Взаимодействия с миром и «сочность»:
   - общий список того, с чем можно сделать E (W.interacts): лестницы, укрытия, качели;
   - батуты, гидранты, сигнализация машин, автоматы с банками, колокол, карусель;
   - тряска камеры, стоп-кадр при попадании, шлейф у летящих предметов, следы на стенах. */
export const FX = { shake: 0, freeze: 0 };
export function shake(k) { FX.shake = Math.max(FX.shake, k); }
export function hitFreeze(t = 0.06) { FX.freeze = Math.max(FX.freeze, t); }

// ---------- общее «E» ----------
export function nearInteract(P) {
  let best = null, bd = 1e9;
  for (const q of W.interacts) {
    if (q.enabled && !q.enabled(P)) continue;
    const d = Math.hypot(q.x - P.pos.x, q.z - P.pos.z);
    if (d < q.r && Math.abs(q.y - P.pos.y) < (q.dy ?? 0.9) && d < bd) { best = q; bd = d; }
  }
  return best;
}

// ---------- батуты ----------
export function bounceAt(x, z, y) {
  for (const b of W.bouncers) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && Math.abs(y - b.y) < 0.15) return b;
  return null;
}

// ---------- удары по объектам мира (вызывается из бросков, выпада, гаджетов) ----------
export function worldHit(p, power, vel) {
  // гидрант: сбили крышку — струя
  for (const h of W.hydrants) if (!h.on && power >= 3 && Math.hypot(h.x - p.x, h.z - p.z) < 0.7 && p.y < h.y + 1.3) { h.on = 8; h.t = 0; burst(h.x, h.y + 0.8, h.z, 10, { color: 0x9ccbec, size: 0.3, speed: 3, up: 4 }); if (h.cap) h.cap.visible = false; addZone('puddle', { c: [h.x, h.z, 1.6] }, h.y, { expires: 14 }); }
  // машина: сигнализация
  for (const c of W.cars) if (Math.abs(p.x - c.x) < 2.3 && Math.abs(p.z - c.z) < 2.3 && p.y < c.y + 1.8 && power >= 1) { if (c.alarm <= 0) scareBirds(c.x, c.z, 12); c.alarm = 4; }
  // автомат: выпадает банка
  for (const v of W.vendings) if (v.cd <= 0 && power >= 1.5 && Math.hypot(v.x - p.x, v.z - p.z) < 1.1 && p.y < v.y + 2.2) {
    v.cd = 10; const it = addItem('can', v.x + v.nx * 0.7, v.y + 0.4, v.z + v.nz * 0.7, 0); it.def = { ...it.def, respawn: 0 };
    launch(it, it.pos.clone(), new V3(v.nx * 2.5, 2, v.nz * 2.5)); burst(v.x + v.nx * 0.5, v.y + 0.5, v.z + v.nz * 0.5, 4, { color: 0xd8d8e0, size: 0.15 });
  }
  // колокол
  for (const b of W.bells) if (Math.hypot(b.x - p.x, b.z - p.z) < 0.9 && Math.abs(b.y - p.y) < 0.9) { b.ring = 3; scareBirds(b.x, b.z, 30); for (const c of W.cats) if (Math.hypot(c.root.position.x - b.x, c.root.position.z - b.z) < 16) c.hit && c.hit(false, 0, 0); }
  // красные лестницы: защёлка
  for (const l of W.dropLadders) if (!l.down && Math.hypot(l.lx - p.x, l.lz - p.z) < 0.6 && Math.abs(l.ly - p.y) < 0.6) l.drop = true;
  // ящики-генераторы гаджетов отрабатывают сами (breakables)
}

// ---------- обновление ----------
const _alarmPool = []; let _ring = null;
export function updateWorldFx(dt, t, P) {
  // гидранты
  for (const h of W.hydrants) {
    if (!h.on) continue; h.on = Math.max(0, h.on - dt); h.t -= dt;
    if (h.t <= 0) { h.t = 0.05; burst(h.x, h.y + 0.9, h.z, 3, { color: 0x9ccbec, size: 0.26, speed: 0.6, up: 9, g: 12, life: 1.1 }); }
    if (P) { const dx = P.pos.x - h.x, dz = P.pos.z - h.z, d = Math.hypot(dx, dz); if (d < 1.4 && P.pos.y < h.y + 3) { P.vel.y = Math.max(P.vel.y, 7); P.push.set(dx / (d || 1) * 3, 0, dz / (d || 1) * 3); P.wetT = 4; } }
    for (const it of W.items) if (it.state === 'rest' && Math.hypot(it.pos.x - h.x, it.pos.z - h.z) < 1.2) { launch(it, it.pos.clone(), new V3((Math.random() - 0.5) * 3, 8, (Math.random() - 0.5) * 3)); }
    if (!h.on && h.cap) h.cap.visible = true;
  }
  // сигнализация: мигают фары (временные светящиеся кубики из пула)
  let ai = 0;
  for (const c of W.cars) {
    if (c.alarm <= 0) continue; c.alarm -= dt; const on = Math.sin(t * 14) > 0;
    const fx = Math.cos(c.ry), fz = -Math.sin(c.ry);
    for (const [lx, lz, colr] of [[1.98, 0.58, 0xfff1c0], [1.98, -0.58, 0xfff1c0], [-1.98, 0.62, 0xff8a1f], [-1.98, -0.62, 0xff8a1f]]) {
      let m = _alarmPool[ai]; if (!m || !m.parent) { m = new THREE.Mesh(G.box, lam({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 })); m.scale.set(0.12, 0.2, 0.38); W.group.add(m); _alarmPool[ai] = m; }
      m.material.color.setHex(colr); m.material.emissive.setHex(colr); m.position.set(c.x + fx * lx + Math.sin(c.ry) * lz, c.y + 0.73, c.z + fz * lx + Math.cos(c.ry) * lz); m.rotation.y = c.ry; m.visible = on; ai++;
    }
  }
  for (let i = ai; i < _alarmPool.length; i++) if (_alarmPool[i]) _alarmPool[i].visible = false;
  for (const v of W.vendings) v.cd -= dt;
  // колокол: раскачивается, расходится кольцо
  for (const b of W.bells) {
    if (b.ring > 0) { b.ring -= dt; if (b.mesh) b.mesh.rotation.z = Math.sin(t * 10) * 0.4 * Math.min(1, b.ring);
      if (!_ring || !_ring.parent) { _ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })); W.group.add(_ring); }
      const k = (3 - b.ring) % 0.75 / 0.75; _ring.visible = true; _ring.position.set(b.x, b.y, b.z); _ring.scale.setScalar(0.5 + k * 6); _ring.material.opacity = 0.8 * (1 - k); _ring.lookAt(P ? P.pos.x : b.x, b.y, P ? P.pos.z : b.z + 1);
    } else if (_ring && _ring.position.distanceTo(new V3(b.x, b.y, b.z)) < 0.1) _ring.visible = false;
  }
  // красные лестницы
  for (const l of W.dropLadders) {
    const want = l.down ? 1 : 0;
    if (l.drop && !l.down) { l.down = true; l.drop = false; burst(l.lx, l.ly, l.lz, 6, { color: 0xd8243a, size: 0.12, speed: 2 }); }
    const prev = l.k; l.k += (want - l.k) * Math.min(1, dt * (l.down ? 7 : 3)); if (Math.abs(l.k - want) < 0.01) l.k = want;
    l.seg.position.y = l.y0 + (1 - l.k) * l.low;
    if (l.down && prev < 0.98 && l.k >= 0.98) { smokeRing(l.bx, l.by + 0.1, l.bz, 8, { speed: 2 }); shake(0.25); }
    if (l.down && l.k < 0.9 && P && Math.hypot(P.pos.x - l.bx, P.pos.z - l.bz) < 0.8 && P.pos.y < l.by + 2) { P.stun = Math.max(P.stun, 1.4); P.vel.set((P.pos.x - l.bx) * 4, 3, (P.pos.z - l.bz) * 4); }
    l.zone.y0 = l.k > 0.95 ? l.by : l.y0 + l.low;
  }
  // карусель: стоящих на платформе крутит вместе с ней
  if (P) for (const c of W.carousels) {
    const dx = P.pos.x - c.x, dz = P.pos.z - c.z, d = Math.hypot(dx, dz);
    if (d < c.r && d > 0.7 && P.onGround && Math.abs(P.pos.y - c.top) < 0.15) { const a = c.w * dt, ca = Math.cos(a), sa = Math.sin(a); P.pos.x = c.x + dx * ca + dz * sa; P.pos.z = c.z - dx * sa + dz * ca; P.root.rotation.y += a; P.facing += a; }
  }
  // качели с сидящим
  for (const s of W.swingSeats) if (s.rider) {
    const p = s.pivot.position, ry = s.pivot.rotation.y, a = s.ang, L = s.len;
    s.rider.pos.set(p.x + Math.sin(ry) * Math.sin(a) * (L - 0.1), p.y - Math.cos(a) * (L - 0.1) - 0.05, p.z + Math.cos(ry) * Math.sin(a) * (L - 0.1));
    s.rider.vel.set(0, 0, 0); s.rider.root.rotation.y = ry;
  }
  // тряска камеры
  FX.shake = Math.max(0, FX.shake - dt * 2.2);
}

/* Сесть на качели / встать. Сидя: W/S раскачивают в такт, пробел — спрыгнуть с инерцией */
export function sitSwing(P, s) { s.rider = P; s.drive = 0; P.swing = s; P.vel.set(0, 0, 0); }
export function leaveSwing(P, jump) {
  const s = P.swing; if (!s) return; s.rider = null; P.swing = null;
  const ry = s.pivot.rotation.y, v = s.vel * s.len;
  P.vel.set(Math.sin(ry) * Math.cos(s.ang) * v, jump ? 5 + Math.abs(v) * 0.6 : 0, Math.cos(ry) * Math.cos(s.ang) * v); P.onGround = false; P.airPeak = P.pos.y;
}
export function driveSwing(P, iz, dt) {
  const s = P.swing; if (!s) return;
  // качать в такт: толкаем в сторону текущего движения
  s.drive = iz ? Math.sign(s.vel || 1) * 2.2 : 0;
}

/* Укрытия: куча листьев, шкаф, мусорный бак. E — залезть (невидим), E/пробел — выскочить с рывком */
export function hideIn(P, h) { P.hidden = h; P.vel.set(0, 0, 0); burst(h.x, h.y + 0.6, h.z, 8, { color: h.kind === 'leaves' ? 0xc96a25 : 0x8a7e90, size: 0.2, speed: 2, up: 2 });
  if (h.kind === 'wardrobe') P.pos.set(h.x + h.out[0] * 0.95, h.y, h.z + h.out[1] * 0.95); else P.pos.set(h.x, h.y + (h.kind === 'bin' ? 1.25 : 0), h.z); }
export function leaveHide(P) {
  const h = P.hidden; if (!h) return; P.hidden = null;
  const f = P.root.rotation.y, fx = h.kind === 'wardrobe' ? h.out[0] : Math.sin(f), fz = h.kind === 'wardrobe' ? h.out[1] : Math.cos(f);
  P.vel.set(fx * 7, 6, fz * 7); P.onGround = false; P.airPeak = P.pos.y;
  burst(P.pos.x, P.pos.y + 0.6, P.pos.z, 14, { color: h.kind === 'leaves' ? 0xe0902e : 0xd8d0e4, size: 0.22, speed: 3.5, up: 3 }); shake(0.2);
  for (const c of W.cats) { const q = c.root.position; if (Math.hypot(q.x - P.pos.x, q.z - P.pos.z) < 2.5) c.hit && c.hit(false, fx * 5, fz * 5); }
  scareBirds(P.pos.x, P.pos.z, 6);
}
export function registerInteracts() {
  for (const h of W.hides) W.interacts.push({ x: h.kind === 'wardrobe' ? h.x + h.out[0] * 0.8 : h.x, z: h.kind === 'wardrobe' ? h.z + h.out[1] * 0.8 : h.z, y: h.y, r: h.kind === 'wardrobe' ? 0.9 : h.r, dy: h.kind === 'bin' ? 1.5 : 0.9, label: 'Спрятаться', enabled: P => !P.held, act: P => hideIn(P, h) });
  for (const s of W.swingSeats) W.interacts.push({ get x() { return s.pivot.position.x; }, get z() { return s.pivot.position.z; }, y: s.pivot.position.y - 2.46, r: 0.9, label: 'Сесть', enabled: P => !s.rider && !P.held, act: P => sitSwing(P, s) });
}
