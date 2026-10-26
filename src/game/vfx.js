import * as THREE from 'three';
import { ps1 } from '../core/gfx.js';
import { graphics } from '../core/quality.js';
import { W } from '../world/state.js';
import { groundAt } from '../world/physics.js';
import { shake, hitFreeze } from './worldfx.js';

/* Общая библиотека «больших» эффектов (v0.51): огонь, дым, искры, обломки, ударная волна, вспышка.
   Каждый вид — один InstancedMesh на всю карту (одна отрисовка), записи переиспользуются.
   Дым и обломки — обычный свет мира (их освещают фонари и вспышки), огонь и искры светятся сами.
   Готовые составные эффекты: explosion, fireworks, sparks, impactBurst, fireBurst. */
const Z = new THREE.Vector3(0, 0, 1), V = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), M = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
const GEO = {
  ball: new THREE.IcosahedronGeometry(1, 0),
  streak: new THREE.BoxGeometry(0.13, 0.13, 1),
  chip: new THREE.BoxGeometry(1, 0.55, 0.8),
  ring: new THREE.RingGeometry(0.86, 1, 28, 1).rotateX(-Math.PI / 2),
};
const KINDS = {
  fire: { geo: 'ball', cap: 260, mat: () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }) },
  spark: { geo: 'streak', cap: 900, mat: () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }) },
  // дым непрозрачный, но «тает» пиксельным дизерингом (как на PS1): без сортировки и без чёрных шаров
  smoke: { geo: 'ball', cap: 220, alpha: true, mat: () => dither(ps1(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }))) },
  debris: { geo: 'chip', cap: 220, mat: () => ps1(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })) },
  ring: { geo: 'ring', cap: 24, mat: () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }) },
};
function dither(m) {
  const before = m.onBeforeCompile, key = m.customProgramCacheKey();
  m.onBeforeCompile = sh => { before(sh);
    sh.vertexShader = 'attribute float aAlpha; varying float vAlpha;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vAlpha = aAlpha;');
    sh.fragmentShader = 'varying float vAlpha;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      { vec2 qa = floor(gl_FragCoord.xy), qb = floor(qa * 0.5); float bay = fract(dot(qb, vec2(0.5, qb.y * 0.75))) * 0.25 + fract(dot(qa, vec2(0.5, qa.y * 0.75)));
        if (bay > vAlpha) discard; }`); };
  m.customProgramCacheKey = () => key + '-dither';
  return m;
}
const pools = new WeakMap();
function pool(kind) {
  let st = pools.get(W.group); if (!st) { st = {}; pools.set(W.group, st); }
  let p = st[kind]; if (p) return p;
  const def = KINDS[kind], mat = def.mat(), geo = def.alpha ? GEO[def.geo].clone() : GEO[def.geo];
  let alpha = null; if (def.alpha) { alpha = new THREE.InstancedBufferAttribute(new Float32Array(def.cap), 1); alpha.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aAlpha', alpha); W.mapResources?.add(geo); }
  const im = new THREE.InstancedMesh(geo, mat, def.cap);
  im.frustumCulled = false; im.count = 0; im.userData.noBatch = true; im.userData.noOcc = true; im.castShadow = false; im.receiveShadow = false;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(def.cap * 3), 3); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  if (kind === 'ring' || kind === 'fire' || kind === 'spark') im.renderOrder = 5;
  W.group.add(im); W.keep?.push(im); W.mapResources?.add(mat);
  p = st[kind] = { im, list: [], cap: def.cap, alpha };
  return p;
}
const density = () => graphics.current.particles ?? 1;
function add(kind, o) {
  const p = pool(kind); if (p.list.length >= p.cap) p.list.shift();
  o.age = 0; o.vx ??= 0; o.vy ??= 0; o.vz ??= 0; o.g ??= 0; o.drag ??= 0; o.spin ??= 0; o.rot ??= Math.random() * 6.28;
  o.c0 = new THREE.Color(o.color ?? 0xffffff); o.c1 = o.color2 != null ? new THREE.Color(o.color2) : null;
  p.list.push(o); return o;
}

export function updateVfx(dt) {
  if (!W.group) return;
  const st = pools.get(W.group); if (!st) return;
  for (const [kind, p] of Object.entries(st)) {
    const im = p.im; let n = 0;
    for (let i = 0; i < p.list.length; i++) {
      const o = p.list[i]; o.age += dt;
      if (o.age >= o.life) { p.list.splice(i, 1); i--; continue; }
      const k = o.age / o.life;
      if (o.drag) { const d = Math.exp(-o.drag * dt); o.vx *= d; o.vy *= d; o.vz *= d; }
      o.vy -= o.g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
      if (o.floor != null && o.y < o.floor + (o.size ?? 0.1) * 0.3) { // отскок обломков
        o.y = o.floor + (o.size ?? 0.1) * 0.3; if (o.vy < 0) { o.vy *= -0.35; o.vx *= 0.6; o.vz *= 0.6; o.spin *= 0.5; if (Math.abs(o.vy) < 0.6) o.vy = 0; }
      }
      o.rot += o.spin * dt;
      let sc = o.size ?? 0.2;
      if (kind === 'fire') sc *= (o.grow ?? 1.4) * Math.sin(Math.min(1, k * 1.6 + 0.15) * Math.PI * 0.85) + 0.05;
      else if (kind === 'smoke') sc *= 1 + (o.grow ?? 1.5) * Math.sqrt(k);
      else if (kind === 'ring') sc *= 1 + (o.grow ?? 10) * (1 - (1 - k) * (1 - k));
      else if (kind === 'debris' && k > 0.82) sc *= 1 - (k - 0.82) / 0.18;
      // цвет: огонь желтеет → краснеет → гаснет; искры мерцают; дым светлеет и тает
      C.copy(o.c0); if (o.c1) C.lerp(o.c1, Math.min(1, k * 1.3));
      let a = 1;
      if (kind === 'fire') a = 1 - k * k;
      else if (kind === 'spark') a = (1 - k) * (o.twinkle ? 0.55 + 0.45 * Math.sin(o.age * 40 + o.rot * 10) : 1);
      else if (kind === 'smoke') a = Math.min(1, k * 8) * (1 - k * k) * (o.alpha ?? 1);
      else if (kind === 'ring') a = (1 - k) * (o.alpha ?? 1);
      if (p.alpha) p.alpha.array[n] = Math.max(0, a); else if (kind !== 'debris') C.multiplyScalar(Math.max(0, a));
      if (kind === 'spark') { // вытянутая искра вдоль скорости
        V.set(o.vx, o.vy, o.vz); const sp = V.length(); if (sp > 1e-3) V.multiplyScalar(1 / sp); else V.set(0, 1, 0);
        Q.setFromUnitVectors(Z, V); S.set(sc, sc, Math.max(sc, Math.min(1.6, sp * (o.len ?? 0.045))));
      } else if (kind === 'ring') { Q.identity(); S.set(sc, 1, sc); }
      else { Q.setFromAxisAngle(UP, o.rot); if (kind === 'debris') Q.multiply(new THREE.Quaternion().setFromAxisAngle(V.set(1, 0, 0), o.rot * 0.7)); S.set(sc * (o.sx ?? 1), sc * (o.sy ?? 1), sc * (o.sz ?? 1)); }
      M.compose(V.set(o.x, o.y, o.z), Q, S); im.setMatrixAt(n, M); im.setColorAt(n, C); n++;
    }
    im.count = n; im.visible = n > 0;
    if (n) { im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; if (p.alpha) p.alpha.needsUpdate = true; }
  }
}
export function resetVfx() { const st = W.group && pools.get(W.group); if (st) for (const p of Object.values(st)) p.list.length = 0; }

const rnd = (a, b) => a + Math.random() * (b - a);
const dirRand = (up = 0) => { const a = Math.random() * 6.283, z = rnd(-1 + up, 1), r = Math.sqrt(1 - z * z); return [Math.cos(a) * r, z, Math.sin(a) * r]; };
function floorAt(x, y, z) { try { return groundAt(x, z, 0.05, y + 0.5); } catch { return y - 0.5; } }
// тряска и стоп-кадр с учётом расстояния до игрока
function feel(p, strength) {
  const pl = W.player; const d = pl ? Math.hypot(pl.pos.x - p.x, pl.pos.y - p.y, pl.pos.z - p.z) : 0;
  const k = Math.max(0, 1 - d / (18 + strength * 14));
  if (k > 0) { shake(Math.min(0.9, strength * 0.55 * k)); if (k > 0.55 && strength > 0.6) hitFreeze(0.05 + 0.04 * strength); }
}
const light = (p, color, k, range, decay) => W.flash?.(p, color, k, range, decay);

/* Взрыв: вспышка → огненный шар → искры и обломки → ударная волна по земле → столб дыма.
   size 1 — граната/тыква, 2–3 — машина/здание. */
export function explosion(p, size = 1, o = {}) {
  const d = density(), gy = floorAt(p.x, p.y, p.z), s = size;
  light({ x: p.x, y: p.y + 1.2 * s, z: p.z }, o.light ?? 0xffa040, 1.6 * s, 10 + 8 * s, 2.2 / Math.sqrt(s));
  // ядро
  add('fire', { x: p.x, y: p.y + 0.6 * s, z: p.z, size: 1.1 * s, grow: 1.9, life: 0.28, color: 0xfff6d0, color2: 0xffc060 });
  for (let i = 0, n = Math.round(14 * s * d) + 4; i < n; i++) { const [dx, dy, dz] = dirRand(0.15), sp = rnd(2, 5.5) * Math.sqrt(s);
    add('fire', { x: p.x + dx * 0.4 * s, y: p.y + 0.5 * s + dy * 0.3, z: p.z + dz * 0.4 * s, vx: dx * sp, vy: Math.abs(dy) * sp * 0.8 + 1.2, vz: dz * sp, drag: 3.2, g: -1.5,
      size: rnd(0.35, 0.7) * s, grow: 1.6, life: rnd(0.45, 0.85), color: i % 3 ? 0xffd15a : 0xfff0b0, color2: 0xff4a1a }); }
  // искры
  for (let i = 0, n = Math.round(34 * s * d); i < n; i++) { const [dx, dy, dz] = dirRand(-0.2), sp = rnd(7, 15) * Math.sqrt(s);
    add('spark', { x: p.x, y: p.y + 0.5 * s, z: p.z, vx: dx * sp, vy: Math.abs(dy) * sp + 2, vz: dz * sp, g: 14, drag: 1.2, size: rnd(0.7, 1.2), len: 0.05, life: rnd(0.4, 0.9), color: 0xffe08a, color2: 0xff6a20 }); }
  // обломки
  const deb = o.debris ?? [0x3b3540, 0x5e5560, 0x2a2328, 0x7a5a3a];
  for (let i = 0, n = Math.round(12 * s * d); i < n; i++) { const [dx, dy, dz] = dirRand(0.3), sp = rnd(4, 10);
    add('debris', { x: p.x, y: p.y + 0.4, z: p.z, vx: dx * sp, vy: Math.abs(dy) * sp * 0.9 + 3, vz: dz * sp, g: 20, spin: rnd(-14, 14), size: rnd(0.08, 0.2) * Math.sqrt(s), sx: rnd(0.7, 1.3), floor: gy, life: rnd(1.6, 2.6), color: deb[i % deb.length] }); }
  // ударная волна и пыль по земле
  add('ring', { x: p.x, y: gy + 0.06, z: p.z, size: 0.5 * s, grow: 9, life: 0.45, color: 0xffd8a0, alpha: 0.85 });
  for (let i = 0, n = Math.round(12 * d) + 4; i < n; i++) { const a = i / n * 6.283, sp = rnd(5, 8) * Math.sqrt(s);
    add('smoke', { x: p.x + Math.cos(a) * 0.5, y: gy + 0.25, z: p.z + Math.sin(a) * 0.5, vx: Math.cos(a) * sp, vy: 0.4, vz: Math.sin(a) * sp, drag: 3.5, size: 0.22 * s, grow: 1.8, life: rnd(0.9, 1.4), color: 0x8a7e86, alpha: 0.75 }); }
  // гриб дыма
  for (let i = 0, n = Math.round(10 * s * d) + 3; i < n; i++) { const [dx, , dz] = dirRand();
    add('smoke', { x: p.x + dx * 0.6 * s, y: p.y + rnd(0.6, 1.4) * s, z: p.z + dz * 0.6 * s, vx: dx * 1.2, vy: rnd(2, 3.5) * Math.sqrt(s), vz: dz * 1.2, drag: 1.6, size: rnd(0.3, 0.55) * s, grow: 1.7, life: rnd(1.8, 2.8), color: i % 2 ? 0x3a3238 : 0x55494f, alpha: 0.9 }); }
  feel(p, s);
}

/* Фейерверк: несколько ракет со шлейфом взлетают и рвутся разноцветными шарами искр,
   каждый разрыв подсвечивает улицу своим цветом. */
const FW = [0xff4d6d, 0xffd34d, 0x6dff8a, 0x4dc3ff, 0xc77dff, 0xff9a3d];
export function fireworks(p, n = 5) {
  const d = density();
  for (let r = 0; r < n; r++) {
    const delay = r * 0.16 + Math.random() * 0.1, h = rnd(7, 12), ang = Math.random() * 6.28, lean = rnd(0.5, 2.2), color = FW[(r + (Math.random() * FW.length | 0)) % FW.length], color2 = FW[(r * 3 + 1) % FW.length];
    const rocket = { x: p.x, y: p.y + 0.3, z: p.z, t: -delay, h, vx: Math.cos(ang) * lean, vz: Math.sin(ang) * lean, vy: h * 1.25, color, color2, burst: false };
    W.animated.push(function tick(dt) {
      rocket.t += dt; if (rocket.t < 0) return;
      rocket.vy -= 9 * dt; rocket.x += rocket.vx * dt; rocket.y += rocket.vy * dt; rocket.z += rocket.vz * dt;
      add('spark', { x: rocket.x, y: rocket.y, z: rocket.z, vx: rnd(-0.4, 0.4), vy: rnd(-1.5, -0.5), vz: rnd(-0.4, 0.4), g: 2, size: 0.9, len: 0.12, life: 0.35, color: 0xffe0a0, color2: 0xff7a30 });
      if (rocket.vy > 1.2 && rocket.t < 1.6) return;
      W.animated = W.animated.filter(f => f !== tick);
      const big = Math.random() < 0.35, cnt = Math.round((big ? 90 : 60) * d), sp = big ? 9 : 7;
      for (let i = 0; i < cnt; i++) { const [dx, dy, dz] = dirRand(); const v = sp * rnd(0.85, 1.05);
        add('spark', { x: rocket.x, y: rocket.y, z: rocket.z, vx: dx * v, vy: dy * v + 1, vz: dz * v, g: 3.2, drag: 1.9, size: rnd(0.9, 1.3), len: 0.06, life: rnd(1.2, 1.9), twinkle: i % 3 === 0, color: i % 4 ? rocket.color : rocket.color2, color2: 0x301010 }); }
      add('fire', { x: rocket.x, y: rocket.y, z: rocket.z, size: big ? 1.3 : 0.9, grow: 1.5, life: 0.22, color: 0xffffff, color2: rocket.color });
      light({ x: rocket.x, y: rocket.y - 2, z: rocket.z }, rocket.color, big ? 1.4 : 1, 22, 2.4);
    });
  }
  explosion({ x: p.x, y: p.y, z: p.z }, 0.55, { light: 0xffc070 });
}

// Искры при ударе по металлу/камню, брызги щепок по дереву
export function sparks(p, n = 10, color = 0xffd27a, dir = null) {
  const d = density();
  for (let i = 0, m = Math.max(2, Math.round(n * d)); i < m; i++) { let [dx, dy, dz] = dirRand(-0.1); if (dir) { dx = dx * 0.6 + dir.x; dy = Math.abs(dy) * 0.6 + Math.max(0.2, dir.y); dz = dz * 0.6 + dir.z; } const sp = rnd(3, 7);
    add('spark', { x: p.x, y: p.y, z: p.z, vx: dx * sp, vy: dy * sp + 1, vz: dz * sp, g: 14, drag: 0.8, size: rnd(0.6, 1), len: 0.05, life: rnd(0.2, 0.45), color, color2: 0xff5a20 }); }
}
// Короткий хлёсткий удар: вспышка, кольцо, немного обломков нужного цвета
export function impactBurst(p, color = 0xfff0d0, k = 1, chips = null) {
  const d = density();
  add('fire', { x: p.x, y: p.y, z: p.z, size: 0.35 * k, grow: 1.3, life: 0.14, color: 0xffffff, color2: color });
  add('ring', { x: p.x, y: p.y, z: p.z, size: 0.25 * k, grow: 4, life: 0.22, color, alpha: 0.7 });
  if (chips) { const gy = floorAt(p.x, p.y, p.z); for (let i = 0, n = Math.round(6 * k * d) + 1; i < n; i++) { const [dx, dy, dz] = dirRand(0.2), sp = rnd(2, 5);
    add('debris', { x: p.x, y: p.y, z: p.z, vx: dx * sp, vy: Math.abs(dy) * sp + 2, vz: dz * sp, g: 18, spin: rnd(-12, 12), size: rnd(0.04, 0.09) * k, floor: gy, life: rnd(0.8, 1.4), color: chips[i % chips.length] }); } }
}
// Огонь на месте (горящая урна, факел): вызывать каждый кадр с dt
export function fireTick(p, dt, k = 1) {
  if (Math.random() < dt * 22 * k * density()) add('fire', { x: p.x + rnd(-0.2, 0.2) * k, y: p.y, z: p.z + rnd(-0.2, 0.2) * k, vy: rnd(1.5, 2.6), vx: rnd(-0.2, 0.2), vz: rnd(-0.2, 0.2), size: rnd(0.16, 0.28) * k, grow: 1.2, life: rnd(0.4, 0.7), color: 0xffd36a, color2: 0xff3a10 });
  if (Math.random() < dt * 5 * k * density()) add('smoke', { x: p.x, y: p.y + 0.6 * k, z: p.z, vy: rnd(1, 1.8), vx: rnd(-0.2, 0.2), vz: rnd(-0.2, 0.2), size: 0.2 * k, grow: 2.5, life: rnd(1.4, 2), color: 0x2e282c, alpha: 0.7 });
}
