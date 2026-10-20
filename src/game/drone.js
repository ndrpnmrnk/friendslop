import { THREE, V3, G, mesh, col } from '../core/gfx.js';
import { W } from '../world/state.js';
import { keys } from '../core/input.js';
import { groundAt, isFree, raySolids } from '../world/physics.js';
import { actors, dropHeld, shove } from './actors.js';
import { dismount, release } from './ride.js';
import { puff, burst, smokeRing } from '../world/particles.js';
import { sfx } from '../core/sfx.js';
import { cam } from './camera.js';

const darts = [], candies = [], marks = new Map();
export function helicopter(a) {
  const g = new THREE.Group(), dark = col(0x292333), purple = col(0x8a6aba);
  mesh(G.box, purple, 0, 0, 0, 0.85, 0.48, 0.7, g);
  mesh(G.box, dark, 0, -0.05, 0.38, 0.68, 0.4, 0.08, g);
  // Пиксельная мордочка выбранного персонажа на встроенном экране камеры.
  const cv = document.createElement('canvas'); cv.width = cv.height = 24; const c = cv.getContext('2d'), skin = a.ch.skinId;
  c.fillStyle = '#12232a'; c.fillRect(0, 0, 24, 24); c.fillStyle = ({cat:'#d89a5a',tv:'#b18cff',shark:'#6a9aaa',frog:'#79aa55'})[skin] || '#b18cff';
  c.fillRect(5, 7, 14, 12); if (skin === 'cat') { c.fillRect(4, 3, 5, 7); c.fillRect(15, 3, 5, 7); } if (skin === 'shark') c.fillRect(10, 2, 4, 7); if (skin === 'frog') { c.fillRect(4, 4, 6, 6); c.fillRect(14, 4, 6, 6); }
  c.fillStyle = '#ffffff'; c.fillRect(7, 9, 3, 4); c.fillRect(14, 9, 3, 4); c.fillRect(9, 16, 6, 2); c.fillStyle = '#17111f'; c.fillRect(8, 10, 2, 2); c.fillRect(15, 10, 2, 2);
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const screen = new THREE.MeshBasicMaterial({ map: tex }); mesh(G.plane, screen, 0, -0.03, 0.43, 0.6, 0.35, 1, g);
  mesh(G.cyl8, dark, 0.35, -0.24, 0.38, 0.12, 0.16, 0.12, g).rotation.x = Math.PI / 2;
  mesh(G.box, purple, 0, 0.1, -0.85, 0.15, 0.14, 1.1, g);
  mesh(G.box, dark, 0, 0.3, -1.3, 0.08, 0.5, 0.3, g);
  mesh(G.cyl5, dark, 0, 0.4, 0, 0.04, 0.5, 0.04, g);
  const rotor = new THREE.Group(); rotor.position.y = 0.65; g.add(rotor);
  for (const angle of [0, Math.PI / 2]) mesh(G.box, dark, 0, 0, 0, 2.4, 0.035, 0.12, rotor).rotation.y = angle;
  for (const x of [-0.4, 0.4]) mesh(G.box, dark, x, -0.4, 0, 0.07, 0.07, 1.1, g);
  W.group.add(g); W.keep.push(g); return { g, rotor, screen, tex };
}
function removeHeli(d) { W.group.remove(d.g); W.keep = W.keep.filter(q => q !== d.g); d.screen.dispose(); d.tex.dispose(); }
export function eliminate(a, seconds) {
  if (!a || a.drone || a.returning) return;
  W.onEliminate && W.onEliminate(a);
  dropHeld(a); if (a.ride) dismount(a, false); if (a.grab) release(a, 0); if (a.holding && W.letGo) W.letGo(a); if (a.heldBy && W.letGo) W.letGo(a.heldBy);
  if (a.swing) { a.swing.rider = null; a.swing = null; } a.hidden = null; a.zip = null; a.climb = null; a.mantle = null; a.hang = null; a.caged = null; a.goal = null;
  a.drone = { ...helicopter(a), left: seconds, cd: 0, candy: true, home: a.pos.clone() };
  a.pos.y = Math.max(groundAt(a.pos.x, a.pos.z, 0.2, 100) + 4, a.pos.y + 5); a.vel.set(0, 0, 0); a.push && a.push.set(0, 0, 0); a.root.visible = false; a.charging = false; a.hotPotato = false;
}
export function droneAction(a, button, direction) {
  const d = a.drone; if (!d) return;
  if (button === 0 && d.cd <= 0) {
    d.cd = 1.5; const m = mesh(G.box, col(0xf5c542), a.pos.x, a.pos.y, a.pos.z, 0.045, 0.045, 0.3, W.group);
    const v = direction.clone().normalize().multiplyScalar(38); m.lookAt(m.position.clone().add(v)); darts.push({ m, v, a, life: 2 }); sfx('throw');
  }
  if (button === 2 && d.candy) {
    d.candy = false; const m = new THREE.Group(); m.position.copy(a.pos); W.group.add(m);
    mesh(G.sph, col(0xff5a9e), 0, 0, 0, 0.22, 0.16, 0.16, m); for (const x of [-0.3, 0.3]) mesh(G.box, col(0xf5c542), x, 0, 0, 0.16, 0.22, 0.22, m).rotation.x = 0.8;
    candies.push({ m, v: 0, boost: Math.random() < 0.5, life: 15, landed: false }); sfx('drop');
  }
}
function mark(a) {
  let m = marks.get(a); if (!m) { const mat = new THREE.MeshBasicMaterial({ color: 0xf5c542, depthTest: false }); const g = mesh(G.sph, mat, 0, 0, 0, 0.18, 0.25, 0.18, W.group); g.renderOrder = 20; m = { g, left: 3 }; marks.set(a, m); } m.left = 3; a.marked = 3;
}
function returnStart(a) {
  const d = a.drone, candidates = W.spawns.filter(p => isFree(p.x - 0.5, p.z - 0.5, p.x + 0.5, p.z + 0.5, p.y + 0.1, p.y + 10));
  candidates.sort((p, q) => Math.hypot(p.x - d.home.x, p.z - d.home.z) - Math.hypot(q.x - d.home.x, q.z - d.home.z));
  const p = candidates[0] || W.spawns[0] || d.home;
  a.drone = null; a.returning = { ...d, t: 0, p: new V3(p.x, groundAt(p.x, p.z, 0.3, p.y + 0.5), p.z) }; a.stun = 0; a.root.visible = false;
}
export function updateDrones(dt, t) {
  for (const a of [W.player, ...(W.bots || [])].filter(Boolean)) {
    const d = a.drone;
    if (d) {
      d.left -= dt; d.cd -= dt;
      let dx = 0, dz = 0, dy = 0;
      if (a === W.player) { dx = Number(!!keys.KeyD) - Number(!!keys.KeyA); dz = Number(!!keys.KeyS) - Number(!!keys.KeyW); dy = Number(!!keys.Space) - Number(!!(keys.ControlLeft || keys.KeyC)); const x = dx; dx = x * Math.cos(cam.yaw) + dz * Math.sin(cam.yaw); dz = -x * Math.sin(cam.yaw) + dz * Math.cos(cam.yaw); }
      else { dx = Math.cos(t * 0.5 + W.bots.indexOf(a)); dz = Math.sin(t * 0.5 + W.bots.indexOf(a)); }
      const len = Math.max(1, Math.hypot(dx, dz)); a.pos.x = Math.max(-W.bounds + 2, Math.min(W.bounds - 2, a.pos.x + dx / len * dt * 10)); a.pos.z = Math.max(-W.bounds + 2, Math.min(W.bounds - 2, a.pos.z + dz / len * dt * 10));
      const floor = groundAt(a.pos.x, a.pos.z, 0.4, 100); a.pos.y = Math.max(floor + 3, Math.min(48, a.pos.y + dy * dt * 7));
      d.g.position.copy(a.pos); d.g.position.y += Math.sin(t * 5) * 0.08; d.g.rotation.y = a === W.player ? cam.yaw + Math.PI : Math.atan2(dx, dz); d.rotor.rotation.y += dt * 38;
      if (d.left <= 0) returnStart(a);
    }
    const r = a.returning;
    if (r) {
      r.t += dt; r.rotor.rotation.y += dt * 38; r.g.position.set(r.p.x + (r.t - 0.7) * 7, r.p.y + 8, r.p.z); r.g.rotation.y = Math.PI / 2;
      a.pos.copy(r.p); a.pos.y += Math.max(0, 8 - Math.max(0, r.t - 0.7) ** 2 * 9); a.root.visible = r.t >= 0.7; a.ch.animate(dt, { t, speed: 0, air: a.pos.y > r.p.y, vy: -5 });
      if (a === W.player) cam.free = { p: r.p.clone().add(new V3(7, 4, 9)), l: a.pos.clone().add(new V3(0, 1, 0)) };
      if (r.t > 1.7) { a.pos.copy(r.p); a.vel.set(0, 0, 0); a.onGround = true; a.airPeak = a.pos.y; a.noMountT = 2; a.burnCD = (W.time || 0) + 3; a.returning = null; a.root.visible = true; removeHeli(r); smokeRing(a.pos.x, a.pos.y + 0.05, a.pos.z, 12, { speed: 3 }); sfx('land', { at: a.pos }); if (a === W.player) { cam.free = null; cam.blend = 0; } }
    }
  }
  for (let i = darts.length - 1; i >= 0; i--) {
    const d = darts[i], from = d.m.position.clone(), len = d.v.length() * dt, dir = d.v.clone().normalize(); let hit = null, best = raySolids(from, dir, len);
    for (const a of actors()) { if (a === d.a || a.hidden) continue; const center = a.pos.clone().add(new V3(0, 1, 0)), along = center.clone().sub(from).dot(dir); if (along >= 0 && along <= best && center.distanceTo(from.clone().addScaledVector(dir, along)) < 0.65) { best = along; hit = a; } }
    d.m.position.addScaledVector(dir, best); d.life -= dt; if (hit) { mark(hit); sfx('tick'); } if (hit || best < len || d.life <= 0) { W.group.remove(d.m); darts.splice(i, 1); }
  }
  for (let i = candies.length - 1; i >= 0; i--) {
    const c = candies[i]; c.life -= dt; const p = c.m.position, floor = groundAt(p.x, p.z, 0.1, p.y);
    if (!c.landed) { c.v -= dt * 12; p.y = Math.max(floor + 0.2, p.y + c.v * dt); c.landed = p.y <= floor + 0.21; }
    if (c.landed) {
      if (!c.boost) { burst(p.x, p.y, p.z, 16, { color: 0xff5a9e, size: 0.15, speed: 3, up: 3 }); for (const a of actors()) if (a.pos.distanceTo(p) < 2) shove(a, a.pos.x - p.x, a.pos.z - p.z, 4, 3, false); sfx('pop', { at: p }); c.life = 0; }
      else { const a = actors().find(a => a.pos.distanceTo(p) < 1.1); if (a) { a.energy = 5; sfx('drink', { at: p }); c.life = 0; } }
    }
    c.m.rotation.y += dt * 3; if (c.life <= 0) { W.group.remove(c.m); candies.splice(i, 1); }
  }
  for (const [a, m] of marks) { m.left -= dt; a.marked = Math.max(0, m.left); m.g.position.copy(a.pos).add(new V3(0, 2.7, 0)); if (m.left <= 0) { W.group.remove(m.g); m.g.material.dispose(); marks.delete(a); } }
}
export function resetDrones() {
  for (const a of [W.player, ...(W.bots || [])].filter(Boolean)) { const d = a.drone || a.returning; if (d) removeHeli(d); a.drone = a.returning = null; a.marked = 0; }
  for (const d of darts) W.group.remove(d.m); for (const c of candies) W.group.remove(c.m); for (const m of marks.values()) { W.group.remove(m.g); m.g.material.dispose(); }
  darts.length = candies.length = 0; marks.clear(); cam.free = null;
}
