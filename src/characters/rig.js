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
  const stars = new THREE.Group(); stars.position.y = d.top + 0.15; root.add(stars); stars.visible = false;
  for (let i = 0; i < 4; i++) { const s = sprite(T.star(), 0.22); s.position.set(Math.cos(i * 1.57) * 0.4, 0, Math.sin(i * 1.57) * 0.4); stars.add(s); }
  const ch = { ...parts, skin, d, stars, ph: 0, squash: 0, blinkT: 2, expr: 'idle', holdPoint: new THREE.Vector3() };
  ch.animate = (dt, st) => animate(ch, dt, st);
  return ch;
}

const _up = new THREE.Vector3(0, 0.18, 0);
function setHand(h, x, y, z, k) { h.position.x += (x - h.position.x) * k; h.position.y += (y - h.position.y) * k; h.position.z += (z - h.position.z) * k; }

function animate(c, dt, s) {
  const d = c.d, t = s.t, k = clamp(s.speed || 0, 0, 1), run = !s.air && !s.climb && k > 0.05;
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
  } else if (s.wave) {
    setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx + 0.1, d.top - 0.1 + Math.sin(t * 9) * 0.06, 0.1 + Math.sin(t * 9) * 0.12, f);
  } else {
    setHand(c.handL, -hx, hy + fl + (run ? Math.abs(cs) * 0.05 : 0), hz + (run ? -sn * 0.35 * k : 0), f);
    setHand(c.handR, hx, hy - fl + (run ? Math.abs(cs) * 0.05 : 0), hz + (run ? sn * 0.35 * k : 0), f);
  }
  c.handL.rotation.x = s.hold ? -0.6 : run ? sn * 0.5 * k : 0; c.handR.rotation.x = s.hold ? (s.charge ? 0.8 : -0.6) : run ? -sn * 0.5 * k : 0;
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
