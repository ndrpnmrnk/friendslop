import { THREE, G, sprite } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { clamp, damp } from '../core/rng.js';
import { SKINS } from './skins.js';

/* Общая структура персонажа для всех скинов:
   root
    ├─ body (голова + тело, качается и сжимается при прыжке)
    ├─ handL / handR — парят рядом с телом, не прикреплены
    └─ footL / footR — парят под телом
   Скин только наполняет эти группы моделями и задаёт размеры. Хитбокс один на всех. */
export function makeCharacter(skinId) {
  const skin = SKINS[skinId] || SKINS.cat;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const head = new THREE.Group(), torso = new THREE.Group(); body.add(torso, head);
  const handL = new THREE.Group(), handR = new THREE.Group(), footL = new THREE.Group(), footR = new THREE.Group();
  root.add(handL, handR, footL, footR);
  const parts = { root, body, head, torso, handL, handR, footL, footR };
  const d = skin.build(parts);
  const sh = new THREE.Mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.scale.setScalar(d.shadow ?? 0.55); root.add(sh);
  root.traverse(o => { if (o.isMesh && o !== sh && !o.material.transparent) o.castShadow = true; });
  const stars = new THREE.Group(); stars.position.y = d.top + 0.15; root.add(stars); stars.visible = false;
  for (let i = 0; i < 4; i++) { const s = sprite(T.star(), 0.22); s.position.set(Math.cos(i * 1.57) * 0.4, 0, Math.sin(i * 1.57) * 0.4); stars.add(s); }
  const ch = { ...parts, skinId, skin, d, stars, blob: sh, blobS: d.shadow ?? 0.55, ph: 0, squash: 0, blinkT: 2, expr: 'idle', holdPoint: new THREE.Vector3() };
  ch.animate = (dt, st) => animate(ch, dt, st);
  return ch;
}

const _up = new THREE.Vector3(0, 0.18, 0);
// поза при катании: сидя (кресло, тележка, тачка) или стоя боком (скейт)
// выпад (тело вытянуто вперёд), перекат (кувырок через голову), подкат (откинулся назад)
function animateMove(c, dt, s) {
  const d = c.d, f = damp(18, dt), ctr = 0.8;
  let th, drop = 0;
  if (s.dive === 'roll') { th = Math.PI * 2 * (s.roll || 0); drop = 0.35 * Math.sin(Math.PI * (s.roll || 0)); }
  else if (s.dive === 'air') th = 1.25;
  else th = -0.85;
  const cc = s.slide ? 0.55 : ctr;
  c.body.rotation.set(th, 0, 0); c.body.scale.set(1, 1, 1);
  c.body.position.set(0, cc - cc * Math.cos(th) - drop - (s.slide ? 0.25 : 0), -cc * Math.sin(th));
  c.stars.visible = false;
  if (s.slide) {
    setHand(c.footL, -d.footX, d.footY + 0.15, 0.55, f); setHand(c.footR, d.footX, d.footY + 0.15, 0.45, f);
    setHand(c.handL, -d.handX - 0.1, 0.35, -0.2, f); setHand(c.handR, d.handX + 0.1, 0.35, -0.2, f);
  } else if (s.dive === 'air') {
    setHand(c.handL, -d.handX * 0.6, 0.9, 1.3, f); setHand(c.handR, d.handX * 0.6, 0.9, 1.3, f);
    setHand(c.footL, -d.footX, 0.75, -0.7, f); setHand(c.footR, d.footX, 0.85, -0.6, f);
  } else {
    const k = s.roll || 0, a = th;
    const ring = (r, o) => [Math.sin(a + o) * r, ctr - Math.cos(a + o) * r - drop];
    const [hz, hy] = ring(0.55, 0.6), [fz, fy] = ring(0.55, Math.PI + 0.4);
    setHand(c.handL, -d.handX * 0.7, hy, hz, 1); setHand(c.handR, d.handX * 0.7, hy, hz, 1);
    setHand(c.footL, -d.footX, fy, fz, 1); setHand(c.footR, d.footX, fy, fz, 1);
  }
}
function animateRide(c, dt, s) {
  const d = c.d, f = damp(14, dt), sp = Math.min(1, (s.rideSpeed || 0) / 10), t = s.t;
  c.stars.visible = false; c.body.scale.set(1, 1, 1); c.body.rotation.y += (0 - c.body.rotation.y) * f;
  if (s.ride === 'stand') {
    c.body.position.y = -0.12 + Math.sin(t * 6) * 0.015 * sp; c.body.rotation.x += (0.1 + sp * 0.12 - c.body.rotation.x) * f;
    c.body.rotation.z = Math.sin(t * 2.5) * 0.06;
    setHand(c.footL, -0.05, d.footY, 0.22, f); setHand(c.footR, 0.05, d.footY, -0.22, f);
    setHand(c.handL, -d.handX - 0.25, d.handY + 0.2 + Math.sin(t * 3) * 0.05, 0.1, f); setHand(c.handR, d.handX + 0.25, d.handY + 0.2 - Math.sin(t * 3) * 0.05, -0.1, f);
  } else {
    c.body.position.y = -0.38; c.body.rotation.x += (-0.08 - sp * 0.1 - c.body.rotation.x) * f; c.body.rotation.z = 0;
    setHand(c.footL, -d.footX, d.footY + 0.05, 0.42, f); setHand(c.footR, d.footX, d.footY + 0.05, 0.42, f);
    setHand(c.handL, -d.handX, d.handY - 0.2, 0.25, f); setHand(c.handR, d.handX, d.handY - 0.2, 0.25, f);
  }
  c.footL.rotation.x = 0; c.footR.rotation.x = 0; c.handL.rotation.x = 0; c.handR.rotation.x = 0;
}
function setHand(h, x, y, z, k) { h.position.x += (x - h.position.x) * k; h.position.y += (y - h.position.y) * k; h.position.z += (z - h.position.z) * k; }

function animate(c, dt, s) {
  const d = c.d, t = s.t, k = clamp(s.speed || 0, 0, 1), run = !s.air && !s.climb && k > 0.05;
  if (s.ride) return animateRide(c, dt, s);
  if (s.dive || s.slide) return animateMove(c, dt, s);
  c.body.position.z = 0; c.body.position.x = 0; c.body.rotation.x = Math.atan2(Math.sin(c.body.rotation.x), Math.cos(c.body.rotation.x));
  c.ph += dt * (s.climb ? 7 : 4 + k * 10) * (run || s.climb ? 1 : 0);
  const sn = Math.sin(c.ph), cs = Math.cos(c.ph), f = damp(16, dt);
  // тело
  if (s.landed) c.squash = 1;
  c.squash = Math.max(0, c.squash - dt * 5);
  const stretch = s.air ? clamp(s.vy * 0.025, -0.12, 0.15) : 0;
  const sy = 1 + stretch - c.squash * 0.18, sxz = 1 - stretch * 0.5 + c.squash * 0.12;
  c.body.scale.set(sxz, sy, sxz);
  c.body.position.y = run ? Math.abs(sn) * 0.08 : Math.sin(t * 2.2) * 0.025;
  // наклон: сильнее на разгоне и в спринте, назад при резком торможении
  const lean = run ? 0.1 * k + 0.12 * (s.sprint || 0) + clamp((s.accel || 0) * 0.012, -0.15, 0.12) : 0;
  c.body.rotation.x += (lean - c.body.rotation.x) * damp(8, dt);
  // замах: корпус чуть разворачивается
  const twist = s.charge ? -0.35 * s.charge : (s.throwT > 0 ? 0.3 * (s.throwT / 0.3) : 0);
  c.body.rotation.y += (twist - c.body.rotation.y) * damp(14, dt);
  c.body.rotation.z = s.stun ? Math.sin(t * 9) * 0.2 : c.body.rotation.z * 0.85 + (run ? sn * 0.04 : 0) * 0.15;
  c.stars.visible = !!s.stun; if (s.stun) c.stars.rotation.y += dt * 5;
  // ножки
  const fy = d.footY, fx = d.footX;
  if (s.air) { setHand(c.footL, -fx, fy + 0.12, 0.08, f); setHand(c.footR, fx, fy + 0.06, -0.1, f); }
  else if (s.climb) { setHand(c.footL, -fx, fy + Math.max(0, cs) * 0.2, 0.2, f); setHand(c.footR, fx, fy + Math.max(0, -cs) * 0.2, 0.2, f); }
  else {
    setHand(c.footL, -fx, fy + (run ? Math.max(0, cs) * 0.18 * k : 0), run ? sn * 0.3 * k : 0, f);
    setHand(c.footR, fx, fy + (run ? Math.max(0, -cs) * 0.18 * k : 0), run ? -sn * 0.3 * k : 0, f);
  }
  c.footL.rotation.x = run ? -sn * 0.4 * k : 0; c.footR.rotation.x = run ? sn * 0.4 * k : 0;
  // ручки
  const hx = d.handX, hy = d.handY + c.body.position.y, hz = d.handZ, fl = Math.sin(t * 2.2) * 0.04;
  if (s.throwT > 0) {
    // бросок: правая рука резко уходит вперёд
    const k2 = s.throwT / 0.3;
    setHand(c.handR, d.holdX * 0.6, d.top - 0.35 * (1 - k2), d.holdZ + 0.45, damp(30, dt));
    setHand(c.handL, -hx, hy, hz - 0.15, f);
  } else if (s.hold && s.charge) {
    // замах: предмет в правой руке, рука уходит назад и вверх, левая указывает цель
    const ch = s.charge;
    setHand(c.handR, hx * 0.9, d.top - 0.1 + ch * 0.25, -0.15 - ch * 0.4, damp(12, dt));
    setHand(c.handL, -hx * 0.7, hy + 0.3, hz + 0.45, f);
  } else if (s.hold) {
    setHand(c.handL, -d.holdX, d.holdY, d.holdZ, f);
    setHand(c.handR, d.holdX, d.holdY, d.holdZ, f);
  } else if (s.climb) {
    setHand(c.handL, -hx * 0.8, d.top - 0.2 + sn * 0.22, 0.4, f); setHand(c.handR, hx * 0.8, d.top - 0.2 - sn * 0.22, 0.4, f);
  } else if (s.air) {
    setHand(c.handL, -hx - 0.1, hy + 0.35, hz, f); setHand(c.handR, hx + 0.1, hy + 0.35, hz, f);
  } else if (s.act === 'stretch') {
    const a = Math.sin(Math.min(1, s.actK) * Math.PI);
    setHand(c.handL, -hx - 0.15 * a, hy + (d.top - hy + 0.35) * a, hz, f); setHand(c.handR, hx + 0.15 * a, hy + (d.top - hy + 0.35) * a, hz, f); c.body.scale.y *= 1 + 0.08 * a;
  } else if (s.act === 'scratch') {
    setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx * 0.8, d.top - 0.2 + Math.sin(t * 16) * 0.04, 0.05, f); c.body.rotation.z = 0.08;
  } else if (s.act === 'special') {
    if (c.skinId === 'shark') { setHand(c.handL, -hx * 0.9, d.top - 0.25, 0, f); setHand(c.handR, hx * 0.9, d.top - 0.25, 0, f); c.body.rotation.z = Math.sin(t * 8) * 0.12; }
    else if (c.skinId === 'frog') { const tg = c.head.userData.tongue, k = Math.sin(Math.min(1, s.actK) * Math.PI * 3); if (tg) { tg.visible = k > 0.2; tg.scale.z = 0.3 + Math.max(0, k) * 0.5; tg.position.z = 0.44 + Math.max(0, k) * 0.25; } setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx, hy - fl, hz, f); }
    else if (c.skinId === 'tv') { setHand(c.handL, -hx, hy, hz, f); setHand(c.handR, hx, hy, hz, f); c.body.position.x = (Math.random() - 0.5) * 0.03; c.body.rotation.z = (Math.random() - 0.5) * 0.06; }
    else { setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx * 0.3, d.top - 0.45 + Math.sin(t * 12) * 0.05, 0.35, f); c.body.rotation.x = 0.12; }
  } else if (s.wave) {
    setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx + 0.1, d.top - 0.1 + Math.sin(t * 9) * 0.06, 0.1 + Math.sin(t * 9) * 0.12, f);
  } else {
    setHand(c.handL, -hx, hy + fl + (run ? Math.abs(cs) * 0.05 : 0), hz + (run ? -sn * 0.35 * k : 0), f);
    setHand(c.handR, hx, hy - fl + (run ? Math.abs(cs) * 0.05 : 0), hz + (run ? sn * 0.35 * k : 0), f);
  }
  // ткань (платок): отстаёт при беге, подлетает в прыжке, трепещет на ветру
  const fl2 = c.torso.userData.flaps;
  if (fl2) { const sp = clamp(s.speed || 0, 0, 1.4), air = s.air ? clamp(-(s.vy || 0) * 0.05, -0.5, 0.7) : 0;
    fl2.forEach((pv, i) => { const k = [0.25, 0.95, 0.6][i], want = (sp * 0.8 + air) * k + Math.sin(t * (9 + i * 2) + i) * (0.05 + sp * 0.18);
      pv.rotation.x += (want - pv.rotation.x) * damp(10, dt); if (i === 2) pv.rotation.z = Math.sin(t * 7) * 0.08 * (0.3 + sp); }); }
  if (s.act !== 'special' && c.head.userData.tongue) c.head.userData.tongue.visible = false;
  if (s.look !== undefined) c.head.rotation.y += (s.look - c.head.rotation.y) * damp(6, dt); else c.head.rotation.y *= 0.9;
  c.handL.rotation.x = s.hold ? -0.6 : run ? sn * 0.5 * k : 0; c.handR.rotation.x = s.hold ? (s.charge ? 0.8 : -0.6) : run ? -sn * 0.5 * k : 0;
  // присед: тело ниже и сжато, ручки ближе
  if (s.crouch) { c.body.position.y -= 0.34; c.body.scale.y *= 0.85; c.body.rotation.x = 0.25; c.handL.position.y -= 0.3; c.handR.position.y -= 0.3; c.footL.position.x = -d.footX - 0.08; c.footR.position.x = d.footX + 0.08; }
  // точка, где держим предмет: между ладонями или в правой руке при замахе
  if (s.hold && s.charge) c.holdPoint.copy(c.handR.position).add(_up);
  else c.holdPoint.set(0, (c.handL.position.y + c.handR.position.y) / 2 + 0.12, (c.handL.position.z + c.handR.position.z) / 2 + 0.05);
  c.root.localToWorld(c.holdPoint);
  // выражение лица
  c.blinkT -= dt;
  let e = s.stun ? 'dizzy' : s.air ? 'wow' : 'idle';
  if (e === 'idle' && c.blinkT < 0.12) e = 'blink';
  if (c.blinkT < 0) c.blinkT = 2 + Math.random() * 3;
  if (e !== c.expr) { c.expr = e; c.skin.face && c.skin.face(c, e); }
}
