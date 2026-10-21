import { THREE, V3, G, mesh, col, lam } from '../core/gfx.js';
import { W } from '../world/state.js';
import { keys } from '../core/input.js';
import { groundAt, isFree, raySolids } from '../world/physics.js';
import { actors, dropHeld, shove } from './actors.js';
import { dismount, release } from './ride.js';
import { puff, burst, smokeRing } from '../world/particles.js';
import { sfx } from '../core/sfx.js';
import { cam } from './camera.js';

const darts = [], candies = [], marks = new Map(), flyOff = [];
/* Вертушка выбывшего (v0.21): маленький пиксельный «телевизор» с мордочкой на экране, антенны-усики,
   сверху мачта с двухлопастным пропеллером (лопасти + полупрозрачный «смаз» вращения), снизу люк и полозья,
   сбоку пушка с дротиком. В полёте наклоняется по инерции (крен/тангаж), покачивается. */
export function helicopter(a) {
  const g = new THREE.Group(), dark = col(0x2b2533), shell = lam({ color: 0xcfc2a8 }, 'droneShell3'), acc = col(0xff8a1f), metal = col(0x9a9da8);
  const body = new THREE.Group(); g.add(body);
  // корпус-телевизор: толстая рамка, выпуклый экран, ручки-уши
  mesh(G.box, shell, 0, 0, 0, 0.62, 0.48, 0.42, body); mesh(G.box, dark, 0, 0, 0.212, 0.54, 0.4, 0.02, body); mesh(G.box, shell, 0, -0.02, -0.26, 0.42, 0.34, 0.12, body);
  for (const sx of [-1, 1]) { mesh(G.box, acc, sx * 0.33, 0, 0, 0.05, 0.24, 0.2, body); mesh(G.cyl6, dark, sx * 0.15, 0.3, -0.05, 0.012, 0.16, 0.012, body).rotation.z = -sx * 0.5; mesh(G.sph, acc, sx * 0.21, 0.37, -0.05, 0.03, 0.03, 0.03, body); }
  for (let i = 0; i < 3; i++) mesh(G.box, dark, 0.22 - i * 0.05, -0.19, 0.215, 0.02, 0.02, 0.01, body); mesh(G.box, col(0x9be36b), -0.22, -0.19, 0.215, 0.025, 0.02, 0.01, body);
  // экранчик с пиксельной мордочкой выбывшего (+ строчки «развёртки»)
  const cv = document.createElement('canvas'); cv.width = cv.height = 24; const c = cv.getContext('2d'), skin = a.ch.skinId;
  c.fillStyle = '#12232a'; c.fillRect(0, 0, 24, 24); c.fillStyle = ({ cat: '#d89a5a', tv: '#b18cff', shark: '#6a9aaa', frog: '#79aa55' })[skin] || '#b18cff';
  c.fillRect(5, 7, 14, 12); if (skin === 'cat') { c.fillRect(4, 3, 5, 7); c.fillRect(15, 3, 5, 7); } if (skin === 'shark') c.fillRect(10, 2, 4, 7); if (skin === 'frog') { c.fillRect(4, 4, 6, 6); c.fillRect(14, 4, 6, 6); }
  c.fillStyle = '#ffffff'; c.fillRect(7, 9, 3, 4); c.fillRect(14, 9, 3, 4); c.fillRect(9, 16, 6, 2); c.fillStyle = '#17111f'; c.fillRect(8, 10, 2, 2); c.fillRect(15, 10, 2, 2);
  c.fillStyle = 'rgba(255,255,255,.12)'; for (let y = 0; y < 24; y += 2) c.fillRect(0, y, 24, 1);
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const screen = new THREE.MeshBasicMaterial({ map: tex }); mesh(G.plane, screen, 0, 0.02, 0.224, 0.46, 0.32, 1, body);
  // мачта и пропеллер: лопасти с закруткой + «смаз» (полупрозрачный диск) при вращении
  mesh(G.cyl8, dark, 0, 0.36, -0.05, 0.03, 0.24, 0.03, body); mesh(G.cyl8, metal, 0, 0.49, -0.05, 0.06, 0.04, 0.06, body);
  const rotor = new THREE.Group(); rotor.position.set(0, 0.52, -0.05); body.add(rotor);
  for (const r of [0, Math.PI]) { const bl = new THREE.Group(); bl.rotation.y = r; rotor.add(bl); const m = mesh(G.box, acc, 0.33, 0, 0, 0.62, 0.015, 0.09, bl); m.rotation.x = 0.22; mesh(G.box, dark, 0.62, 0, 0, 0.05, 0.02, 0.1, bl); }
  mesh(G.sph, acc, 0, 0.02, 0, 0.05, 0.04, 0.05, rotor);
  const blur = mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }), 0, 0.5, -0.05, 0.68, 0.68, 1, body); blur.rotation.x = -Math.PI / 2;
  // пушка с дротиком
  const gun = new THREE.Group(); gun.position.set(0.38, -0.12, 0.02); body.add(gun);
  mesh(G.cyl8, metal, 0, 0, 0.1, 0.045, 0.26, 0.045, gun).rotation.x = Math.PI / 2; const dartM = mesh(G.box, col(0xf5c542), 0, 0, 0.26, 0.02, 0.02, 0.12, gun); mesh(G.box, col(0xd8243a), 0, 0, 0.19, 0.06, 0.06, 0.015, gun);
  // полозья и люк
  for (const x of [-0.2, 0.2]) { mesh(G.box, dark, x, -0.38, 0.0, 0.03, 0.03, 0.5, body); mesh(G.box, dark, x, -0.31, 0.12, 0.02, 0.14, 0.02, body); mesh(G.box, dark, x, -0.31, -0.12, 0.02, 0.14, 0.02, body); }
  const flaps = [-1, 1].map(sx => { const q = new THREE.Group(); q.position.set(sx * 0.13, -0.245, 0); body.add(q); mesh(G.box, acc, -sx * 0.065, 0, 0, 0.13, 0.02, 0.22, q); return q; });
  const rope = mesh(G.box, col(0x17111f), 0, -0.45, 0, 0.025, 1, 0.025, g); rope.visible = false;
  W.group.add(g); W.keep.push(g); return { g, body, rotor, blur, dartM, screen, tex, flaps, rope, hatch: 0, v: new V3(), spin: 0 };
}
const setHatch = (d, k) => { d.hatch = k; d.flaps.forEach((f, i) => (f.rotation.z = (i ? -1 : 1) * k * 1.4)); };
function removeHeli(d) { W.group.remove(d.g); W.keep = W.keep.filter(q => q !== d.g); d.screen.dispose(); d.tex.dispose(); }
export function eliminate(a, seconds) {
  if (!a || a.drone || a.returning) return;
  W.onEliminate && W.onEliminate(a);
  // выбывание сбрасывает все «залипающие» состояния: перекур, собака на руках, скамейка, стан (v0.21)
  a.chill = null; a.charging = false; if (a.dogHeld) { a.dogHeld.heldBy = null; a.dogHeld = null; } if (a.bench && W.leaveBench) W.leaveBench(a); a.stun = 0; a.getT = 0; a.daze = 0; a.netT = 0; a.floatT = 0;
  dropHeld(a); if (a.ride) dismount(a, false); if (a.grab) release(a, 0); if (a.holding && W.letGo) W.letGo(a); if (a.heldBy && W.letGo) W.letGo(a.heldBy);
  if (a.swing) { a.swing.rider = null; a.swing = null; } a.hidden = null; a.zip = null; a.climb = null; a.mantle = null; a.hang = null; a.caged = null; a.goal = null;
  a.drone = { ...helicopter(a), left: seconds, cd: 0, candy: true, home: a.pos.clone(), intro: 1.2, tumble: 0 };
  a.pos.y = Math.max(groundAt(a.pos.x, a.pos.z, 0.2, 100) + 4, a.pos.y + 4);
  // вертушка прилетает сбоку к месту выбывания
  a.drone.from = a.pos.clone().add(new V3(9, 5, 6)); a.vel.set(0, 0, 0); a.push && a.push.set(0, 0, 0); a.root.visible = false; a.charging = false; a.hotPotato = false;
}
export function droneAction(a, button, direction) {
  const d = a.drone; if (!d) return;
  if (button === 0 && d.cd <= 0 && !(d.intro > 0) && !(d.tumble > 0)) {
    d.cd = 1.5; const m = mesh(G.box, col(0xf5c542), a.pos.x, a.pos.y - 0.12, a.pos.z, 0.045, 0.045, 0.3, W.group);
    const v = direction.clone().normalize().multiplyScalar(38); m.lookAt(m.position.clone().add(v)); darts.push({ m, v, a, life: 2 }); sfx('throw');
  }
  if (button === 2 && d.candy && !(d.intro > 0) && !(d.tumble > 0)) {
    d.candy = false; d.hatchT = 0.8; const m = new THREE.Group(); m.position.copy(a.pos).add(new V3(0, -0.5, 0)); W.group.add(m);
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
      d.left -= dt; d.cd -= dt; if (d.hatchT > 0) { d.hatchT -= dt; } setHatch(d, d.hatchT > 0 ? Math.min(1, d.hatch + dt * 6) : Math.max(0, d.hatch - dt * 4));
      // пропеллер: плавно раскручивается, при быстром вращении виден «смаз»
      d.spin = Math.min(1, (d.spin || 0) + dt * 1.5); d.rotor.rotation.y += dt * (6 + 40 * d.spin); d.blur.material.opacity = 0.08 + 0.2 * d.spin; d.dartM.visible = d.cd <= 0;
      // прилёт: подлетает сбоку, управления нет
      if (d.intro > 0) { d.intro -= dt; const k = 1 - Math.max(0, d.intro) / 1.2, e = k * k * (3 - 2 * k); d.g.position.lerpVectors(d.from, a.pos, e); d.body.rotation.z = (1 - e) * 0.5; d.g.rotation.y = Math.atan2(a.pos.x - d.from.x, a.pos.z - d.from.z); continue; }
      // сбили броском: кувыркается, конфета вываливается, потом выравнивается
      for (const it of W.items) if (it.state === 'fly' && it.owner !== a && !(d.tumble > 0) && it.pos.distanceTo(a.pos) < 0.9) { d.tumble = 1.6; it.vel.multiplyScalar(-0.3); sfx('bonk', { at: a.pos }); burst(a.pos.x, a.pos.y, a.pos.z, 10, { color: 0xd8d0e4, size: 0.12, speed: 3 });
        if (d.candy) { droneAction(a, 2, new V3()); } break; }
      if (d.tumble > 0) { d.tumble -= dt; d.body.rotation.z += dt * 12; d.body.rotation.x = Math.sin(d.tumble * 9) * 0.6; a.pos.y = Math.max(groundAt(a.pos.x, a.pos.z, 0.4, 100) + 2, a.pos.y - dt * 2);
        if (d.tumble <= 0) { d.body.rotation.set(0, 0, 0); } d.g.position.copy(a.pos); if (d.left <= 0) returnStart(a); continue; }
      let dx = 0, dz = 0, dy = 0;
      if (a === W.player) { dx = Number(!!keys.KeyD) - Number(!!keys.KeyA); dz = Number(!!keys.KeyS) - Number(!!keys.KeyW); dy = Number(!!keys.Space) - Number(!!(keys.ControlLeft || keys.KeyC)); const x = dx; dx = x * Math.cos(cam.yaw) + dz * Math.sin(cam.yaw); dz = -x * Math.sin(cam.yaw) + dz * Math.cos(cam.yaw); }
      else { dx = Math.cos(t * 0.5 + W.bots.indexOf(a)); dz = Math.sin(t * 0.5 + W.bots.indexOf(a)); }
      // полёт с инерцией: разгон/торможение, крен и тангаж по скорости (в осях вертушки), покачивание
      const len = Math.max(1, Math.hypot(dx, dz)), k = Math.min(1, dt * 3.5); d.v.x += (dx / len * 10 - d.v.x) * k; d.v.z += (dz / len * 10 - d.v.z) * k; d.v.y += (dy * 7 - d.v.y) * Math.min(1, dt * 5);
      a.pos.x = Math.max(-W.bounds + 2, Math.min(W.bounds - 2, a.pos.x + d.v.x * dt)); a.pos.z = Math.max(-W.bounds + 2, Math.min(W.bounds - 2, a.pos.z + d.v.z * dt));
      const floor = groundAt(a.pos.x, a.pos.z, 0.4, 100); a.pos.y = Math.max(floor + 3, Math.min(48, a.pos.y + d.v.y * dt));
      const yaw = a === W.player ? cam.yaw + Math.PI : (Math.hypot(d.v.x, d.v.z) > 0.5 ? Math.atan2(d.v.x, d.v.z) : d.g.rotation.y);
      d.g.position.copy(a.pos); d.g.position.y += Math.sin(t * 2.6) * 0.07; d.g.rotation.y = yaw;
      const fwd = d.v.x * Math.sin(yaw) + d.v.z * Math.cos(yaw), side = d.v.x * Math.cos(yaw) - d.v.z * Math.sin(yaw);
      d.body.rotation.x += (fwd * 0.045 - d.body.rotation.x) * Math.min(1, dt * 6); d.body.rotation.z += (-side * 0.05 + Math.sin(t * 1.7) * 0.04 - d.body.rotation.z) * Math.min(1, dt * 6);
      if (d.left <= 0) returnStart(a);
    }
    const r = a.returning;
    if (r) {
      /* возвращение: вертушка летит к точке, зависает на 4.5 м, открывает люк и опускает персонажа на тросе;
         отцепила — закрывает люк и улетает вверх. Видно всем. */
      r.t += dt; r.rotor.rotation.y += dt * 38; const H = 4.6, top = r.p.y + H, T1 = 1.0, T2 = 1.3, T3 = 2.9;
      if (!r.from) r.from = r.g.position.clone();
      if (r.t < T1) { const k = r.t / T1, e = k * k * (3 - 2 * k); r.g.position.set(r.from.x + (r.p.x - r.from.x) * e, r.from.y + (top - r.from.y) * e, r.from.z + (r.p.z - r.from.z) * e); }
      else if (r.t < T3 + 0.2) r.g.position.set(r.p.x, top + Math.sin(t * 5) * 0.05, r.p.z);
      else { r.g.position.y += dt * 9; r.g.position.x += dt * 4; }
      setHatch(r, r.t > T1 && r.t < T3 + 0.4 ? Math.min(1, (r.t - T1) / 0.3) : Math.max(0, r.hatch - dt * 4));
      const lower = r.t < T2 ? 0 : Math.min(1, (r.t - T2) / (T3 - T2)), ry = top - 0.35 - lower * (H - 0.35);
      a.pos.set(r.p.x, Math.max(r.p.y, ry - 1.05), r.p.z);
      a.root.visible = r.t >= T2 - 0.05;
      r.rope.visible = r.t >= T2 && r.t < T3 + 0.1; const rl = Math.max(0.05, r.g.position.y - 0.45 - (a.pos.y + 1.25)); r.rope.scale.y = rl; r.rope.position.y = -0.45 - rl / 2;
      a.ch.animate(dt, { t, speed: 0, zip: true, air: false, vy: 0 });
      if (a === W.player) cam.free = { p: r.p.clone().add(new V3(6, 3.5, 8)), l: a.pos.clone().add(new V3(0, 1.2, 0)) };
      if (r.t > T3 && !r.landed) { r.landed = true; a.pos.copy(r.p); a.vel.set(0, 0, 0); a.onGround = true; a.airPeak = a.pos.y; a.noMountT = 2; a.burnCD = (W.time || 0) + 3; a.root.visible = true; smokeRing(a.pos.x, a.pos.y + 0.05, a.pos.z, 12, { speed: 3 }); sfx('land', { at: a.pos }); if (a === W.player) { cam.free = null; cam.blend = 0; } a.returning = null; r.rope.visible = false;
        // вертушка улетает сама и исчезает
        const g = r; flyOff.push({ g, t: 0 }); }
    }
  }
  for (let i = flyOff.length - 1; i >= 0; i--) { const f = flyOff[i]; f.t += dt; f.g.rotor.rotation.y += dt * 38; f.g.g.position.y += dt * 8; f.g.g.position.x += dt * 5; setHatch(f.g, Math.max(0, f.g.hatch - dt * 4)); if (f.t > 2.5) { removeHeli(f.g); flyOff.splice(i, 1); } }
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
  for (const f of flyOff) removeHeli(f.g); flyOff.length = 0;
  darts.length = candies.length = 0; marks.clear(); cam.free = null;
}
