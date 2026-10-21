import { THREE, G, V3, mesh, col, tmat, lam, glow, compose, sprite } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid, isFree, groundAt, raySolids } from '../world/physics.js';
import { burst, puff } from '../world/particles.js';
import { addItem, launch, setLetterColor } from '../game/items.js';
import { addPushable } from '../world/pushables.js';
import { skelModel } from '../game/town.js';
import { daze } from '../game/actors.js';
import { sfx } from '../core/sfx.js';
import { nearbyItemPoint } from './location.js';

/* v0.23 — 14 новых миссий, все в 3D-мире, с настоящими объектами:
   doorbell  Позвони и убеги (Goose Game)   steal    Утащи у скелета (Goose Game)    grill   Бургеры на гриле (Overcooked)
   generator Заправь генератор (Among Us)  bells    Колокола склепа (Zelda)         moths   Мотыльки в сачок (Animal Crossing)
   carwash   Помой машину (Car Wash)       balloon  Шарик на дереве (физика)        mail    Почтальон (Paperboy)
   detector  Металлоискатель (Stardew)     cart     Тележка из магазина (GTA)       ghost   Фото призрака (Fatal Frame)
   antenna   Настрой антенну (Among Us)    pigeon   Поймай голубя (WarioWare) */

// ---------- общие помощники ----------
function place(x, y, z, f, build, foot, h, reach = 1.9) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(f[0], f[1]); W.group.add(g); build(g);
  const along = f[0] === 0, fw = along ? foot[0] : foot[1], fd = along ? foot[1] : foot[0];
  const s = h > 0 ? addSolid(x - fw / 2, z - fd / 2, x + fw / 2, z + fd / 2, y, y + h) : null;
  return { g, f, solid: s, reach, pos: () => g.position, front: (k = 0.7) => new V3(x + f[0] * (foot[1] / 2 + k), y, z + f[1] * (foot[1] / 2 + k)), dispose() { W.group.remove(g); if (s) s.on = false; } };
}
const PL = new THREE.Plane(), HIT = new V3();
const onPlane = (ray, n, p) => { PL.setFromNormalAndCoplanarPoint(n, p); return ray.ray.intersectPlane(PL, HIT) ? HIT.clone() : null; };
const ring = (color = 0x9be36b) => { const r = mesh(G.ring, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, 0.45, 0.45, 1, W.group); r.rotation.x = -Math.PI / 2; return r; };
// свободная точка «пола» на расстоянии [a..b] (той же высоты), иначе — ближайшая достижимая
function farFloor(p, a, b) {
  const zs = (W.missionZones || []).filter(z => z.type === 'floor' && Math.abs(z.y - p.y) < 0.4);
  for (let i = 0; i < 260 && zs.length; i++) { const z = zs[(Math.random() * zs.length) | 0], x = z.x0 + 0.5 + Math.random() * Math.max(0, z.x1 - z.x0 - 1), zz = z.z0 + 0.5 + Math.random() * Math.max(0, z.z1 - z.z0 - 1), d = Math.hypot(x - p.x, zz - p.z);
    if (d < a || d > b || !isFree(x - 0.4, zz - 0.4, x + 0.4, zz + 0.4, z.y + 0.05, z.y + 2)) continue; if (Math.abs(groundAt(x, zz, 0.2, z.y + 0.3) - z.y) > 0.15) continue; return new V3(x, z.y, zz); }
  return nearbyItemPoint(p);
}
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const los = (a, b) => { const d = new V3().subVectors(b, a), l = d.length(); if (l < 0.01) return true; d.multiplyScalar(1 / l); return raySolids(a, d, l) >= l - 0.35; };
// конус взгляда: красный сектор на земле перед NPC
function viewCone(range, half) { const m = new THREE.Mesh(new THREE.CircleGeometry(range, 14, -Math.PI / 2 - half, half * 2), new THREE.MeshBasicMaterial({ color: 0xff3a4a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.05; const g = new THREE.Group(); g.add(m); W.group.add(g); return g; }
function sees(eye, yaw, range, half, P) {
  if (P.hidden) return false; const dx = P.pos.x - eye.x, dz = P.pos.z - eye.z, d = Math.hypot(dx, dz); if (d > range) return false;
  let da = Math.atan2(dx, dz) - yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > half) return false;
  return los(new V3(eye.x, eye.y + 1.5, eye.z), new V3(P.pos.x, P.pos.y + (P.crouch ? 0.6 : 1.2), P.pos.z));
}
let _gh; const ghostTex = () => _gh || (_gh = (() => { const c = document.createElement('canvas'); c.width = 24; c.height = 28; const g = c.getContext('2d');
  g.fillStyle = '#e8f0ff'; g.beginPath(); g.arc(12, 11, 10, Math.PI, 0); g.lineTo(22, 26); for (let i = 0; i < 4; i++) g.lineTo(22 - (i + 0.5) * 5, i % 2 ? 26 : 22); g.lineTo(2, 26); g.closePath(); g.fill();
  g.fillStyle = '#17111f'; g.fillRect(7, 9, 3, 4); g.fillRect(14, 9, 3, 4); g.fillRect(10, 16, 4, 3);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })());
const mkGhost = () => { const s = sprite(ghostTex(), 1); s.material = new THREE.SpriteMaterial({ map: ghostTex(), transparent: true, opacity: 0.8, depthWrite: false }); s.scale.set(1.0, 1.15, 1); W.group.add(s); return s; };
const numTex = (n, c) => { const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16; const g = cv.getContext('2d'); g.fillStyle = '#' + c.toString(16).padStart(6, '0'); g.fillRect(0, 0, 16, 16); g.fillStyle = '#f1e8ff'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText(String(n), 8, 12);
  const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
const crateMesh = () => compose('m5crate', a => { const c = tmat(T.crate()); a(G.box, c, 0, 0.31, 0, 0.62, 0.62, 0.62); });

/* ====================== объекты (ставит генератор миссий) ====================== */
export function buildDoor(x, y, z, f) {
  const o = place(x, y, z, f, g => { g.add(compose('m5porch', a => { const br = tmat(T.oldBrick()), dk = col(0x2b2533), st = tmat(T.stone());
    a(G.box, br, 0, 1.45, -0.15, 2.4, 2.9, 0.3); a(G.box, dk, 0, 1.2, 0.02, 1.2, 2.3, 0.06); a(G.box, st, 0, 0.08, 0.35, 1.6, 0.16, 0.6); a(G.box, lam({ map: T.cloth(0x8a2a2a, 'carpet_g') }, 'm5mat'), 0, 0.17, 0.4, 0.9, 0.02, 0.45);
    a(G.box, dk, 0.75, 1.3, 0.03, 0.12, 0.18, 0.04); a(G.box, glow(0xf5c542), 0.75, 1.3, 0.055, 0.05, 0.05, 0.02); a(G.box, glow(0xffd8a0), 0, 2.55, 0.06, 0.25, 0.12, 0.08);
    a(G.box, tmat(T.sign('№13', '#2a1f3d', '#f5c542')), 0, 2.72, 0.01, 0.4, 0.16, 0.02); }));
    const door = new THREE.Group(); door.position.set(-0.55, 0, 0.05); g.add(door); door.add(compose('m5door', a => { a(G.box, tmat(T.wood()), 0.55, 1.15, 0, 1.1, 2.25, 0.06); a(G.box, col(0xf5c542), 0.95, 1.1, 0.05, 0.06, 0.06, 0.06); })); g.userData.door = door; }, [2.4, 0.5], 2.9);
  o.type = 'porch'; o.door = o.g.userData.door; return o;
}
export function buildSkelBench(x, y, z, f) {
  const o = place(x, y, z, f, g => { g.add(compose('m5bench', a => { const w = tmat(T.wood()), dk = col(0x2b2533); a(G.box, w, 0, 0.45, 0, 1.8, 0.06, 0.45); a(G.box, w, 0, 0.75, -0.2, 1.8, 0.35, 0.05); for (const sx of [-0.8, 0.8]) a(G.box, dk, sx, 0.22, 0, 0.06, 0.44, 0.42); }));
    const sk = skelModel('smoke'); sk.g.position.set(-0.35, -0.5, 0.0); sk.legs.forEach(l => (l.rotation.x = -1.4)); g.add(sk.g); g.userData.sk = sk; }, [1.9, 0.6], 0.5);
  o.type = 'skelbench'; o.sk = o.g.userData.sk; return o;
}
export function buildGenerator(x, y, z, f) {
  const o = place(x, y, z, f, g => { g.add(compose('m5gen', a => { const y2 = lam({ map: T.paintMetal(0xd8a030) }, 'm5genY'), dk = col(0x2b2533), mt = tmat(T.metal());
    a(G.box, y2, 0, 0.5, 0, 1.2, 0.7, 0.7); a(G.box, tmat(T.vent()), 0, 0.5, 0.36, 0.8, 0.4, 0.01); for (const sx of [-0.62, 0.62]) a(G.box, dk, sx, 0.55, 0, 0.04, 0.8, 0.75);
    for (const sx of [-0.45, 0.45]) a(G.cyl12, dk, sx, 0.13, 0.38, 0.13, 0.08, 0.13, Math.PI / 2); a(G.cyl8, mt, 0.4, 1.0, -0.2, 0.05, 0.3, 0.05); a(G.cyl8, col(0xd8243a), -0.35, 0.9, 0, 0.08, 0.06, 0.08);
    a(G.cyl12, col(0xf1e8ff), 0.2, 0.62, 0.37, 0.15, 0.02, 0.15, Math.PI / 2);
    for (const sx of [-1.6, 1.6]) a(G.box, dk, sx, 1.3, -0.4, 0.07, 2.6, 0.07); }));
    const bulbs = []; for (let i = 0; i < 9; i++) { const t = i / 8, b = mesh(G.sph, lam({ color: 0x3a3440, emissive: 0x000000 }), -1.6 + t * 3.2, 2.5 - Math.sin(t * Math.PI) * 0.35, -0.4, 0.07, 0.09, 0.07, g); bulbs.push(b); }
    const wire = mesh(G.box, col(0x17111f), 0, 2.38, -0.4, 3.2, 0.015, 0.015, g); void wire;
    g.userData.bulbs = bulbs; const needle = new THREE.Group(); needle.position.set(0.2, 0.62, 0.39); g.add(needle); mesh(G.box, col(0xd8243a), 0, 0.06, 0, 0.015, 0.12, 0.01, needle); g.userData.needle = needle; }, [3.4, 0.9], 1.0);
  o.type = 'generator'; o.bulbs = o.g.userData.bulbs; o.needle = o.g.userData.needle; return o;
}
export function buildBells(x, y, z, f) {
  const o = place(x, y, z, f, g => { g.add(compose('m5frame', a => { const w = tmat(T.oldWood ? T.oldWood() : T.wood()); for (const sx of [-1.4, 1.4]) a(G.box, w, sx, 1.3, 0, 0.16, 2.6, 0.16); a(G.box, w, 0, 2.55, 0, 3.0, 0.16, 0.2);
    a(G.box, tmat(T.stone()), 0, 0.06, 0, 3.2, 0.12, 0.6); }));
    const bells = [0xc8964a, 0xb8843a, 0xd8a65a, 0xa8743a].map((c, i) => { const p = new THREE.Group(); p.position.set(-1.05 + i * 0.7, 2.45, 0); g.add(p);
      const m = lam({ map: T.paintMetal(c) }, 'm5bell' + i); mesh(G.box, col(0x2b2533), 0, -0.08, 0, 0.03, 0.16, 0.03, p); const b = mesh(BELL, m, 0, -0.42, 0, 0.26, 0.4, 0.26, p); mesh(G.sph, col(0x3a3440), 0, -0.66, 0, 0.05, 0.05, 0.05, p); b.userData.i = i; return { p, b, sw: 0 }; });
    g.userData.bells = bells; }, [3.2, 0.6], 0.12, 2.4);
  o.type = 'bells'; o.bells = o.g.userData.bells; return o;
}
const BELL = new THREE.CylinderGeometry(0.45, 1, 1, 10, 1, true); BELL.translate(0, 0, 0);
export function buildTree(x, y, z, f) {
  const o = place(x, y, z, f, g => { g.add(compose('m5tree', a => { a(G.cyl6, tmat(T.bark()), 0, 1.6, 0, 0.22, 3.2, 0.22); a(G.ico, tmat(T.bush()), 0, 3.6, 0, 1.4, 1.1, 1.4); a(G.ico, tmat(T.bush()), 0.6, 3.1, 0.3, 0.8, 0.7, 0.8); }));
    const bl = new THREE.Group(); bl.position.set(0, 3.9, 0.9); g.add(bl); mesh(G.sph10, lam({ color: 0xff5a6e, emissive: 0x3a0a10 }, 'm5bal'), 0, 0, 0, 0.26, 0.3, 0.26, bl); mesh(G.box, col(0xf1e8ff), 0, -0.55, 0, 0.01, 0.8, 0.01, bl); g.userData.bl = bl; }, [0.5, 0.5], 3.2);
  o.type = 'tree'; o.bl = o.g.userData.bl; return o;
}
export function buildDetectorSign(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('m5dig', a => { a(G.box, tmat(T.sign('КЛАД?', '#c9662a', '#17111f')), 0, 1.05, 0, 0.6, 0.3, 0.03); a(G.box, tmat(T.wood()), 0, 0.5, -0.02, 0.06, 1.0, 0.04);
    a(G.box, tmat(T.wood()), 0.5, 0.45, 0.2, 0.04, 0.9, 0.04, 0, 0, 0.25); a(G.box, tmat(T.metal()), 0.38, 0.05, 0.2, 0.18, 0.22, 0.02, 0, 0, 0.25); })), [0.6, 0.3], 1.2);
  o.type = 'digsign'; return o;
}
export function buildCartStart(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('m5cartsign', a => { a(G.box, tmat(T.sign('ПРОДУКТЫ', '#3a7a4a', '#f1e8ff')), 0, 1.6, 0, 1.2, 0.3, 0.04); for (const sx of [-0.55, 0.55]) a(G.box, col(0x2b2533), sx, 0.8, -0.03, 0.05, 1.6, 0.05); })), [1.2, 0.3], 1.75);
  o.type = 'cartstart'; return o;
}
export function buildGraveCam(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('m5tripod', a => { const dk = col(0x2b2533); for (let i = 0; i < 3; i++) { const an = i * 2.09; a(G.box, dk, Math.sin(an) * 0.18, 0.55, Math.cos(an) * 0.18, 0.03, 1.15, 0.03, Math.cos(an) * 0.18, 0, -Math.sin(an) * 0.18); }
    a(G.box, col(0x3a3440), 0, 1.18, 0, 0.26, 0.18, 0.14); a(G.cyl8, col(0x17111f), 0, 1.18, 0.11, 0.06, 0.1, 0.06, Math.PI / 2); a(G.box, glow(0xff5a6e), 0.09, 1.26, 0.07, 0.02, 0.02, 0.01); })), [0.5, 0.5], 1.2);
  o.type = 'tripod'; return o;
}
export function buildAntenna(x, y, z, f) {
  const o = place(x, y, z, f, g => { g.add(compose('m5ant', a => { const dk = col(0x2b2533); a(G.box, dk, 0, 0.6, 0, 0.08, 1.2, 0.08); a(G.box, tmat(T.crate()), 0.9, 0.3, 0.1, 0.6, 0.6, 0.6);
    a(G.box, col(0x3a3440), 0.9, 0.82, 0.1, 0.52, 0.42, 0.36); }));
    const head = new THREE.Group(); head.position.set(0, 1.25, 0); g.add(head); head.add(compose('m5dish', a => { a(DISH, lam({ map: T.paintMetal(0xd8d8e0), side: THREE.DoubleSide }, 'm5dish'), 0, 0, 0.1, 0.5, 0.5, 0.2); a(G.box, col(0x2b2533), 0, 0, 0.42, 0.03, 0.03, 0.5); a(G.box, col(0x2b2533), 0, 0, 0.68, 0.07, 0.07, 0.07); }));
    const leds = []; for (let i = 0; i < 5; i++) leds.push(mesh(G.box, lam({ color: 0x2a2232, emissive: 0x000000 }), -0.12 + i * 0.06, -0.18, -0.02, 0.04, 0.03 + i * 0.012, 0.02, head));
    const tvc = document.createElement('canvas'); tvc.width = 32; tvc.height = 24; const tvt = new THREE.CanvasTexture(tvc); tvt.magFilter = tvt.minFilter = THREE.NearestFilter; tvt.generateMipmaps = false;
    const tv = mesh(G.plane, new THREE.MeshBasicMaterial({ map: tvt }), 0.9, 0.84, 0.29, 0.42, 0.32, 1, g); void tv;
    g.userData.ant = { head, leds, tvc, tvt }; }, [1.6, 0.8], 0.6);
  o.type = 'antenna'; o.ant = o.g.userData.ant; return o;
}
const DISH = new THREE.SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 3.2); DISH.rotateX(Math.PI / 2);
export function buildDovecote(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('m5dove', a => { const w = tmat(T.wood()); a(G.box, col(0x2b2533), 0, 0.9, 0, 0.1, 1.8, 0.1); a(G.box, w, 0, 2.0, 0, 0.8, 0.5, 0.6); a(G.cone4, tmat(T.roof()), 0, 2.45, 0, 0.7, 0.4, 0.55, 0, Math.PI / 4);
    a(G.box, col(0x17111f), -0.18, 1.98, 0.301, 0.18, 0.2, 0.01); a(G.box, col(0x17111f), 0.18, 1.98, 0.301, 0.18, 0.2, 0.01); a(G.box, w, 0, 1.82, 0.36, 0.7, 0.03, 0.15); })), [0.8, 0.6], 1.8);
  o.type = 'dovecote'; return o;
}
export function buildMailBag(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('m5mail', a => { a(G.box, lam({ map: T.cloth(0x6a4a2a, 'leather_g') }, 'm5bag'), 0, 0.25, 0, 0.6, 0.5, 0.3); a(G.box, col(0x3a2418), 0, 0.52, 0, 0.62, 0.06, 0.32);
    for (let i = 0; i < 4; i++) a(G.box, col(0xf1e8ff), -0.15 + i * 0.1, 0.56, 0, 0.08, 0.1, 0.02, 0.2); a(G.box, tmat(T.sign('ПОЧТА', '#1e4688', '#f1e8ff')), 0, 0.3, 0.155, 0.4, 0.14, 0.01); })), [0.7, 0.4], 0.6);
  o.type = 'mailbag'; return o;
}
// спот-миссии: гриль у фудтрака, мойка у машины, мотыльки у фонаря
export const buildGrillSpot = sp => ({ type: 'spot', spot: sp, f: sp.f, pos: () => new V3(sp.x, sp.y, sp.z), dispose() {} });

/* ====================== уличные миссии ====================== */
export const WORLD5 = {
  // 1. Позвони и убеги: E у двери — звонок; 4 с спрятаться (за углом, в кустах, урне); жилец выходит и смотрит 3.5 с
  doorbell(o, api, ctx) {
    const P = ctx.player, c = o.pos(), fr = o.front(0.6), yaw = o.g.rotation.y; let st = 'ring', t = 0, time = 60, sk = null, cone = null, look = 0, failT = -1;
    api.msg('Подойди к двери и позвони (E)');
    return {
      target: () => st === 'ring' ? fr : null,
      prompt: () => st === 'ring' && flat(P.pos, fr) < 1.6 ? '<b>E</b>Позвонить и бежать' : '',
      interact() { if (st !== 'ring' || flat(P.pos, fr) > 1.6) return false; st = 'hide'; t = 4; sfx('bell', { at: c }); api.msg('ПРЯЧЬСЯ!', 'bad'); return true; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0 && st !== 'look') return api.finish({ success: false });
        if (failT > 0) { failT -= dt; if (failT <= 0) api.finish({ success: false }); return; }
        if (st === 'hide') { t -= dt; api.progress(0.3 + (1 - t / 4) * 0.3); if (t <= 0) { st = 'look'; t = 3.5; sk = skelModel('beer'); sk.g.position.set(c.x + Math.sin(yaw) * 0.2, c.y, c.z + Math.cos(yaw) * 0.2); sk.g.rotation.y = yaw; W.group.add(sk.g); cone = viewCone(10, 0.55); cone.position.copy(sk.g.position); sfx('curse', { at: c }); sfx('door', { at: c }); } }
        if (st === 'look') { t -= dt; o.door.rotation.y = Math.min(1.6, o.door.rotation.y + dt * 4); look += dt; const ly = yaw + Math.sin(look * 1.6) * 0.9; sk.g.rotation.y = ly; cone.rotation.y = ly; sk.arms[0].rotation.x = -1.2 + Math.sin(look * 9) * 0.3;
          api.progress(0.6 + (1 - t / 3.5) * 0.4);
          if (sees(sk.g.position, ly, 10, 0.55, P)) { st = 'caught'; failT = 1.2; api.msg('ЗАМЕТИЛ! Позор...', 'bad'); sfx('curse', { at: c }); return; }
          if (t <= 0) { st = 'done'; api.msg('Не заметил! Красава', 'good'); sfx('done'); setTimeout(() => api.finish({ success: true, mult: 1 }), 700); } }
      },
      stop() { if (sk) W.group.remove(sk.g); if (cone) W.group.remove(cone); o.door.rotation.y = 0; },
    };
  },
  // 2. Утащи у скелета: банка рядом с ним на лавке; бери, когда он не смотрит (красный сектор), и уноси за 12 м
  steal(o, api, ctx) {
    const P = ctx.player, sk = o.sk, c = o.pos(), yaw0 = o.g.rotation.y; let look = yaw0, want = yaw0, nextT = 2, strikes = 0, time = 75, hold = 0;
    const spot = new V3(c.x + Math.cos(yaw0) * 0.45, c.y + 0.6, c.z - Math.sin(yaw0) * 0.45);
    const can = addItem('can', spot.x, spot.y, spot.z); can.def = { ...can.def, respawn: 0 }; const rg = ring(0xf5c542);
    const cone = viewCone(7, 0.6); cone.position.set(c.x, c.y, c.z);
    api.msg('Стащи банку, пока скелет не смотрит');
    return {
      target: () => P.held === can ? null : can.pos,
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false });
        if (can.state === 'gone') return api.finish({ success: false });
        // скелет крутит головой: смотрит перед собой, иногда резко оборачивается
        nextT -= dt; if (nextT <= 0) { nextT = 1.2 + Math.random() * 2; want = yaw0 + (Math.random() < 0.55 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.6)); }
        look += (want - look) * Math.min(1, dt * 3); sk.body.rotation.y = look - yaw0; cone.rotation.y = look; hold += dt; sk.arms[1].rotation.x = -1.6 + Math.sin(hold * 1.3) * 0.5;
        rg.visible = P.held !== can; rg.position.set(can.pos.x, can.pos.y - 0.08, can.pos.z);
        const near = flat(P.pos, c) < 7, has = P.held === can || flat(P.pos, can.pos) < 1.2;
        if (near && has && sees(c, look, 7, 0.6, P)) { strikes++; sfx('curse', { at: c }); daze(P, 1); if (P.held === can) P.held = null; can.state = 'rest'; can.pos.copy(spot); can.vel.set(0, 0, 0);
          api.msg(strikes >= 2 ? 'Попался дважды!' : 'Заметил! Банку вернул', 'bad'); if (strikes >= 2) return api.finish({ success: false }); }
        const d = flat(can.pos, c); api.progress(Math.min(1, d / 12));
        if (d > 12 && can.state !== 'fly') { sfx('done'); api.finish({ success: true, mult: 1 }); }
      },
      stop() { W.group.remove(cone); W.group.remove(rg); if (P.held === can) P.held = null; can.state = 'gone'; can.g.visible = false; },
    };
  },
  // 4. Генератор: принеси канистру к генератору → E → залей (панель «fuel»)
  generator(o, api, ctx) {
    const P = ctx.player, c = o.pos(), sp = farFloor(c, 10, 24), can = addItem('canister', sp.x, sp.y + 0.3, sp.z); can.def = { ...can.def, respawn: 0 }; const rg = ring(0xf5c542); let time = 100;
    api.msg('Ярмарка без света! Найди канистру');
    return {
      target: () => P.held === can ? o.front() : can.pos,
      prompt: () => P.held === can && flat(P.pos, c) < 2.2 ? '<b>E</b>Заправить' : '',
      interact() { if (P.held !== can || flat(P.pos, c) > 2.2) return false; P.held = null; can.state = 'gone'; can.g.visible = false; api.finish({ chain: 'fuel' }); return true; },
      update(dt) { time -= dt; api.timer(time); if (time <= 0 || can.state === 'gone') return api.finish({ success: false }); rg.visible = P.held !== can; rg.position.set(can.pos.x, can.pos.y - 0.2, can.pos.z); api.progress(P.held === can ? 0.4 : 0.1); },
      stop() { W.group.remove(rg); if (can.state !== 'gone') { if (P.held === can) P.held = null; can.state = 'gone'; can.g.visible = false; } },
    };
  },
  // 6. Мотыльки: у фонаря кружат мотыльки — подкрадись и E (взмах сачком) рядом с мотыльком; 3 штуки — в банку
  moths(o, api, ctx) {
    const P = ctx.player, L = o.spot.lamp, lc = new V3(L.lx, L.y, L.lz); let time = 70, caught = 0, flee = 0;
    const jarP = new V3(o.spot.x, o.spot.y, o.spot.z), jar = new THREE.Group(); jar.position.copy(jarP); W.group.add(jar);
    jar.add(compose('m5jar', a => { a(G.cyl8, lam({ color: 0xbfe8ff, transparent: true, opacity: 0.4, depthWrite: false }, 'm5glass'), 0, 0.2, 0, 0.15, 0.4, 0.15); a(G.cyl8, col(0xd8a030), 0, 0.42, 0, 0.16, 0.05, 0.16); }));
    const wing = lam({ map: T.mothWing ? T.mothWing() : null, color: 0xd8c8b0, side: THREE.DoubleSide, alphaTest: 0.3 }, 'm5wing');
    const moths = [0, 1, 2, 3, 4].map(i => { const g = new THREE.Group(); W.group.add(g); const wl = mesh(G.plane, wing, -0.07, 0, 0, 0.14, 0.1, 1, g), wr = mesh(G.plane, wing, 0.07, 0, 0, 0.14, 0.1, 1, g); mesh(G.box, col(0x6a5a4a), 0, 0, 0, 0.03, 0.03, 0.09, g);
      wl.rotation.x = wr.rotation.x = -Math.PI / 2; return { g, wl, wr, a: i * 1.3, h: 1.7 + (i % 3) * 0.45, r: 0.6 + (i % 2) * 0.5, sp: 1.4 + i * 0.2, got: false }; });
    const hand = () => new V3(P.pos.x + Math.sin(P.root.rotation.y) * 0.5, P.pos.y + 1.5, P.pos.z + Math.cos(P.root.rotation.y) * 0.5);
    const near = () => moths.find(m => !m.got && m.g.position.distanceTo(hand()) < 1.25);
    api.msg('Лови мотыльков у фонаря: E — сачок. Не бегай — спугнёшь');
    return {
      target: () => caught >= 3 ? jarP : lc,
      prompt: () => caught >= 3 ? (flat(P.pos, jarP) < 1.6 ? '<b>E</b>В банку' : '') : near() ? '<b>E</b>Взмах сачком' : '',
      interact() {
        if (caught >= 3 && flat(P.pos, jarP) < 1.6) { sfx('done'); api.finish({ success: true, mult: 1 }); return true; }
        P.swatT = 0.25; sfx('swat'); const m = near(); if (!m) return true; m.got = true; m.g.visible = false; caught++; sfx('pickup'); burst(m.g.position.x, m.g.position.y, m.g.position.z, 6, { color: 0xd8c8b0, size: 0.06, speed: 1 });
        api.progress(caught / 3 * 0.9); if (caught >= 3) api.msg('Есть! Неси в банку', 'good'); return true; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false });
        const run = Math.hypot(P.vel.x, P.vel.z) > 5.2 && flat(P.pos, lc) < 4; if (run && flee <= 0) { flee = 1.8; api.msg('Спугнул!', 'bad'); }
        flee -= dt; const t = performance.now() / 1000;
        for (const m of moths) { if (m.got) continue; m.a += dt * m.sp * (flee > 0 ? 2.2 : 1); const r = m.r + (flee > 0 ? 1.4 : 0), h = m.h + (flee > 0 ? 1.0 : 0);
          m.g.position.set(lc.x + Math.cos(m.a) * r, lc.y + h + Math.sin(t * 5 + m.a) * 0.15, lc.z + Math.sin(m.a * 1.2) * r); m.g.rotation.y = -m.a; const fl = Math.sin(t * 30 + m.a) * 0.8; m.wl.rotation.y = fl; m.wr.rotation.y = -fl; }
      },
      stop() { for (const m of moths) W.group.remove(m.g); W.group.remove(jar); },
    };
  },
  // 8. Шарик на дереве: таскай ящики (E) и ставь лесенкой у ствола (E), залезь — и шарик твой
  balloon(o, api, ctx) {
    const P = ctx.player, c = o.pos(), yaw = o.g.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), base = new V3(c.x + fx * 0.9, c.y, c.z + fz * 0.9); let time = 90, carry = null, stack = 0;
    const crates = [0, 1, 2].map(i => { const p = farFloor(c, 4, 9), g = crateMesh(); g.position.copy(p); W.group.add(g); return { g, p: p.clone(), placed: false, s: null }; });
    const bl = o.bl, bw = new V3(); api.msg('Шарик застрял! Поставь ящики лесенкой у ствола');
    return {
      target: () => carry ? base : (crates.find(q => !q.placed) || { p: base }).p,
      prompt: () => carry ? (flat(P.pos, base) < 1.6 ? '<b>E</b>Поставить ящик' : '') : crates.some(q => !q.placed && flat(P.pos, q.p) < 1.3) ? '<b>E</b>Взять ящик' : '',
      interact() {
        if (carry) { if (flat(P.pos, base) > 1.6) return false; const q = carry; carry = null; q.placed = true; const y = c.y + stack * 0.62, ox = (stack % 2 ? 0.15 : -0.1);
          q.g.position.set(base.x + ox, y, base.z); q.g.rotation.y = stack * 0.4; q.s = addSolid(base.x + ox - 0.31, base.z - 0.31, base.x + ox + 0.31, base.z + 0.31, y, y + 0.62); stack++; sfx('imp', { at: base }); api.progress(stack / 3 * 0.7);
          // отодвинуть игрока, чтобы не застрял в ящике
          if (flat(P.pos, base) < 0.6) { P.pos.x += fx * 0.7; P.pos.z += fz * 0.7; } return true; }
        const q = crates.find(k => !k.placed && flat(P.pos, k.p) < 1.3); if (!q) return false; carry = q; sfx('pickup'); return true; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false });
        if (carry) { carry.g.position.set(P.pos.x, P.pos.y + 1.95, P.pos.z); carry.g.rotation.y = P.root.rotation.y; carry.p.copy(P.pos); }
        bl.position.y = 3.9 + Math.sin(performance.now() * 0.003) * 0.06; bl.getWorldPosition(bw);
        if (Math.hypot(P.pos.x - bw.x, P.pos.z - bw.z) < 1.2 && P.pos.y + 1.9 > bw.y - 0.35) { bl.visible = false; sfx('done'); burst(bw.x, bw.y, bw.z, 12, { color: 0xff5a6e, size: 0.1, speed: 2 }); api.finish({ success: true, mult: 1 }); }
      },
      stop() { for (const q of crates) { W.group.remove(q.g); if (q.s) q.s.on = false; } bl.visible = true; },
    };
  },
  // 9. Почтальон: 3 письма по цветным ящикам (можно закинуть броском)
  mail(o, api, ctx) {
    const P = ctx.player, c = o.pos(), COL = [[0xd8243a, 'красный'], [0x2a6ad8, 'синий'], [0x3a9a4a, 'зелёный']]; let time = 110, k = 0, letter = null;
    const boxes = COL.map(([cc], i) => { const p = farFloor(c, 7 + i * 4, 18 + i * 5), g = new THREE.Group(); g.position.copy(p); g.rotation.y = Math.random() * 6; W.group.add(g);
      g.add(compose('m5mbox' + cc, a => { const m = lam({ map: T.paintMetal(cc) }, 'm5mb' + cc); a(G.box, col(0x2b2533), 0, 0.5, 0, 0.08, 1.0, 0.08); a(G.box, m, 0, 1.15, 0, 0.42, 0.34, 0.5); a(G.cyl8, m, 0, 1.32, 0, 0.21, 0.5, 0.21, Math.PI / 2); a(G.box, col(0x17111f), 0, 1.22, 0.255, 0.26, 0.04, 0.01); }));
      const sg = sprite(numTex(i + 1, cc), 0.5); sg.position.y = 1.9; g.add(sg); const s = addSolid(p.x - 0.25, p.z - 0.25, p.x + 0.25, p.z + 0.25, p.y, p.y + 1.0); return { g, p, s }; });
    const give = () => { setLetterColor(COL[k][0]); letter = addItem('letter', P.pos.x, P.pos.y + 1.2, P.pos.z); letter.def = { ...letter.def, respawn: 0 }; ctx.give(letter); api.msg(`Письмо в ${COL[k][1]} ящик №${k + 1}`, 'good'); };
    give();
    const slot = i => new V3(boxes[i].p.x, boxes[i].p.y + 1.2, boxes[i].p.z);
    const deliver = () => { if (letter) { if (P.held === letter) P.held = null; letter.state = 'gone'; letter.g.visible = false; } sfx('pickup'); burst(boxes[k].p.x, boxes[k].p.y + 1.3, boxes[k].p.z, 8, { color: COL[k][0], size: 0.08, speed: 1.4 });
      k++; api.progress(k / 3); if (k >= 3) { sfx('done'); api.finish({ success: true, mult: 1 }); return; } give(); };
    return {
      target: () => boxes[k] ? boxes[k].p : c,
      prompt: () => letter && P.held === letter && flat(P.pos, boxes[k].p) < 1.5 ? '<b>E</b>Опустить письмо' : '',
      interact() { if (!letter || P.held !== letter || flat(P.pos, boxes[k].p) > 1.5) return false; deliver(); return true; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false }); if (k >= 3) return;
        if (letter && (letter.state === 'fly' || letter.state === 'rest') && letter.pos.distanceTo(slot(k)) < 0.7) return deliver();
        // не в тот ящик — письмо отскакивает
        for (let i = 0; i < 3; i++) if (i !== k && letter && letter.state === 'fly' && letter.pos.distanceTo(slot(i)) < 0.6) { letter.vel.multiplyScalar(-0.4); api.msg('Не тот ящик!', 'bad'); }
        if (letter && letter.state === 'gone') give();
      },
      stop() { for (const b of boxes) { W.group.remove(b.g); b.s.on = false; } if (letter && letter.state !== 'gone') { if (P.held === letter) P.held = null; letter.state = 'gone'; letter.g.visible = false; } },
    };
  },
  // 10. Металлоискатель: писк чаще рядом с кладом; E — копать (лишние ямы отнимают время)
  detector(o, api, ctx) {
    const P = ctx.player, c = o.pos(), pts = [farFloor(c, 3, 12), farFloor(c, 3, 12), farFloor(c, 3, 12)]; let time = 80, beepT = 0, digT = 0, holes = [], said = '';
    const goal = pts[0], decoy = pts.slice(1); const dz = new Set();
    api.msg('Ходи кругами: писк чаще — ближе к кладу. E — копать');
    return {
      target: () => c,
      prompt: () => flat(P.pos, c) < 16 && digT <= 0 ? '<b>E</b>Копать' : '',
      interact() { if (flat(P.pos, c) > 16 || digT > 0) return false; digT = 0.9; P.swatT = 0.3; sfx('drop'); for (let i = 0; i < 10; i++) puff(P.pos.x, P.pos.y + 0.1, P.pos.z, { color: 0x5a4030, size: 0.15, vx: (Math.random() - 0.5) * 3, vy: 3, vz: (Math.random() - 0.5) * 3, g: 10, life: 0.6 });
        const hole = mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0x2a1e18 }), P.pos.x, P.pos.y + 0.02, P.pos.z, 0.4, 0.4, 1, W.group); hole.rotation.x = -Math.PI / 2; holes.push(hole);
        if (flat(P.pos, goal) < 1.0) { const ch = new THREE.Group(); ch.position.set(goal.x, goal.y, goal.z); W.group.add(ch); holes.push(ch);
          ch.add(compose('m5chest', a => { a(G.box, tmat(T.wood()), 0, 0.2, 0, 0.6, 0.35, 0.4); a(G.box, col(0xd8a030), 0, 0.2, 0.205, 0.1, 0.12, 0.02); a(G.box, glow(0xf5c542), 0, 0.4, 0, 0.5, 0.05, 0.3); }));
          burst(goal.x, goal.y + 0.5, goal.z, 16, { color: 0xf5c542, size: 0.12, speed: 2.5, up: 2 }); sfx('done'); api.msg('КЛАД!', 'good'); setTimeout(() => api.finish({ success: true, mult: 1 }), 900); return true; }
        const dd = decoy.find(q => flat(P.pos, q) < 1.0 && !dz.has(q)); if (dd) { dz.add(dd); const it = addItem('slipper', dd.x, dd.y + 0.4, dd.z); it.def = { ...it.def, respawn: 0 }; api.msg('Старый ботинок...', 'bad'); }
        else { time -= 4; api.msg('Пусто (−4 с)', 'bad'); } return true; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false }); digT -= dt;
        const live = [goal, ...decoy.filter(q => !dz.has(q))], d = Math.min(...live.map(q => flat(P.pos, q))), k = Math.max(0, 1 - d / 10);
        beepT -= dt; if (beepT <= 0 && flat(P.pos, c) < 18) { beepT = 0.08 + (1 - k) * 1.0; sfx('beep', { p: k }); }
        api.progress(k); const h = d < 1.2 ? 'ОЧЕНЬ ГОРЯЧО' : d < 3 ? 'Горячо' : d < 6 ? 'Теплее' : 'Холодно'; if (h !== said) { said = h; api.msg(h, d < 3 ? 'good' : ''); }
      },
      stop() { for (const h of holes) W.group.remove(h); },
    };
  },
  // 11. Тележка: довези гору продуктов до машины; резко дёрнешь/врежешься — продукты падают (собери и закинь обратно)
  cart(o, api, ctx) {
    const P = ctx.player, c = o.pos(), yaw = o.g.rotation.y, st = new V3(c.x + Math.sin(yaw) * 1.4, c.y, c.z + Math.cos(yaw) * 1.4);
    const pc = addPushable({ X: v => v, Z: v => v, Y: c.y, g: W.group }, 'cart', st.x, st.z); pc.mesh.rotation.y = yaw;
    const goods = new THREE.Group(); goods.position.y = 0.95; pc.mesh.add(goods); const GD = ['tomato', 'can', 'banana', 'cucumber', 'parcel'], gm = [];
    const addGood = i => { const m = compose('m5good' + (i % 5), a => { const cc = [0xd8301a, 0xd8243a, 0xf5d442, 0x3f8a2a, 0xc8a070][i % 5]; a(G.box, col(cc), 0, 0, 0, 0.22, 0.16, 0.18); }); m.position.set((i % 3 - 1) * 0.2, Math.floor(i / 3) * 0.17, (i % 2) * 0.15 - 0.07); goods.add(m); gm.push(m); };
    for (let i = 0; i < 6; i++) addGood(i);
    const car = (W.cars || []).filter(q => Math.abs(q.y - c.y) < 0.5).map(q => ({ q, d: Math.hypot(q.x - c.x, q.z - c.z) })).filter(q => q.d > 10 && q.d < 45).sort((a, b) => a.d - b.d)[0];
    const dest = car ? new V3(car.q.x - Math.cos(car.q.ry) * 2.6, c.y, car.q.z + Math.sin(car.q.ry) * 2.6) : farFloor(c, 14, 26); const rg = ring(0x9be36b); rg.scale.setScalar(2.2); rg.position.set(dest.x, dest.y + 0.06, dest.z);
    let time = 100, lv = new V3(pc.vx, 0, pc.vz), lost = [], cd = 0; api.msg('Вези тележку к машине (E — взяться). Плавно!');
    return {
      target: () => dest,
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false }); cd -= dt;
        const v = new V3(pc.vx, 0, pc.vz), jerk = v.distanceTo(lv) / Math.max(dt, 0.001); lv.copy(v);
        if (jerk > 26 && v.length() + lv.length() > 1 && cd <= 0 && gm.length) { cd = 0.5; const m = gm.pop(); goods.remove(m); const wp = new V3(); pc.mesh.getWorldPosition(wp);
          const it = addItem(GD[gm.length % 5], wp.x, wp.y + 1.2, wp.z); it.def = { ...it.def, respawn: 0 }; launch(it, it.pos.clone(), new V3((Math.random() - 0.5) * 4, 3, (Math.random() - 0.5) * 4)); lost.push(it); sfx('imp', { at: wp }); api.msg('Уронил! Собери', 'bad'); }
        // упавшее — обратно в тележку (положить/закинуть рядом с корзиной)
        const wp = new V3(); pc.mesh.getWorldPosition(wp);
        for (const it of lost) if (it.state !== 'gone' && P.held !== it && Math.hypot(it.pos.x - wp.x, it.pos.z - wp.z) < 0.7 && it.pos.y > wp.y + 0.5) { it.state = 'gone'; it.g.visible = false; addGood(gm.length); sfx('pickup'); }
        lost = lost.filter(it => it.state !== 'gone');
        api.progress(Math.max(0, 1 - Math.hypot(wp.x - dest.x, wp.z - dest.z) / 25) * 0.8 + gm.length / 30);
        if (Math.hypot(wp.x - dest.x, wp.z - dest.z) < 2.4) { if (gm.length >= 4) { sfx('done'); api.msg(`Довёз! (${gm.length}/6)`, 'good'); api.finish({ success: true, mult: gm.length / 6 }); } else api.msg('Мало продуктов — собери упавшее', 'bad'); }
      },
      stop() { W.group.remove(rg); if (P.grab === pc && W.releaseCart) W.releaseCart(P); const i = W.pushables.indexOf(pc); if (i >= 0) W.pushables.splice(i, 1); W.group.remove(pc.mesh); for (const it of lost) { it.state = 'gone'; it.g.visible = false; } },
    };
  },
  // 12. Фото призрака: призрак мелькает между могил — поймай его в центр кадра и жми E (вспышка)
  ghost(o, api, ctx) {
    const P = ctx.player, c = o.pos(), cam = ctx.camera; let time = 75, gt = 2, show = 0, gp = null, shots = 0; const gs = mkGhost(); gs.visible = false;
    api.msg('Призрак мелькает рядом. Наведи камеру и жми E');
    return {
      target: () => c,
      prompt: () => '<b>E</b>Снять (вспышка)',
      interact() {
        shots++; sfx('shutter'); W.flash && W.flash(P.pos, 0xffffff, 0.6);
        if (show > 0 && gp) { const dir = new V3(); cam.getWorldDirection(dir); const to = gp.clone().sub(cam.position), d = to.length(); to.normalize();
          if (dir.dot(to) > 0.975 && d < 20 && los(cam.position, gp)) { api.msg('ЕСТЬ КАДР! Призрак в кадре', 'good'); sfx('done'); show = 0; gs.visible = false; setTimeout(() => api.finish({ success: true, mult: 1 }), 700); return true; } }
        api.msg(show > 0 ? 'Мимо — в центр кадра!' : 'Пусто...', 'bad'); return true; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false });
        if (show > 0) { show -= dt; gs.material.opacity = Math.min(0.85, show * 2, (1.8 - show) * 3); gs.position.y = gp.y + Math.sin(show * 6) * 0.15; if (show <= 0) { gs.visible = false; gt = 2.5 + Math.random() * 2.5; } }
        else { gt -= dt; if (gt <= 0) { gp = farFloor(c, 5, 14); gp.y += 1.4; gs.position.copy(gp); gs.visible = true; show = 1.8; sfx('ghost', { at: gp }); } }
        api.progress(Math.min(0.9, shots * 0.1));
      },
      stop() { W.group.remove(gs); },
    };
  },
  // 14. Голубь: подкрадись (не беги!), E — схватить, неси в голубятню (E)
  pigeon(o, api, ctx) {
    const P = ctx.player, c = o.pos(), home = farFloor(c, 5, 10); let time = 80, got = false, fly = null, wt = 0, hop = 0;
    const g = new THREE.Group(); g.position.copy(home); W.group.add(g);
    g.add(compose('m5pigeon', a => { const gr = lam({ color: 0x8a8aa0 }, 'm5pg'), dk = col(0x4a4a60); a(G.sph, gr, 0, 0.18, 0, 0.13, 0.12, 0.2); a(G.sph, dk, 0, 0.32, 0.14, 0.08, 0.08, 0.08); a(G.box, col(0x6a8a6a), 0, 0.25, 0.12, 0.1, 0.06, 0.06);
      a(G.cone4, col(0xd8a030), 0, 0.31, 0.24, 0.02, 0.07, 0.02, Math.PI / 2); a(G.box, dk, 0, 0.2, -0.22, 0.12, 0.03, 0.12, 0.3); for (const sx of [-0.04, 0.04]) a(G.box, col(0xd8606a), sx, 0.04, 0, 0.015, 0.08, 0.015); }));
    const wp = home.clone(); api.msg('Подкрадись к голубю — шагом, не бегом');
    return {
      target: () => got ? o.front() : g.position,
      prompt: () => got ? (flat(P.pos, c) < 1.9 ? '<b>E</b>В голубятню' : '') : flat(P.pos, g.position) < 1.3 && !fly ? '<b>E</b>Схватить' : '',
      interact() {
        if (got) { if (flat(P.pos, c) > 1.9) return false; sfx('done'); api.finish({ success: true, mult: 1 }); return true; }
        if (flat(P.pos, g.position) > 1.3 || fly) return false; got = true; sfx('pickup'); api.msg('Попался! В голубятню его', 'good'); api.progress(0.6); return true; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false });
        if (got) { g.position.set(P.pos.x, P.pos.y + 1.15, P.pos.z); g.rotation.y = P.root.rotation.y; if (P.stun > 0 || P.daze > 0) { got = false; api.msg('Вырвался!', 'bad'); fly = { from: g.position.clone(), to: farFloor(P.pos, 4, 8), t: 0 }; } return; }
        const sp = Math.hypot(P.vel.x, P.vel.z), d = flat(P.pos, g.position);
        if (!fly && ((d < 4 && sp > 4.6) || d < 0.6)) { fly = { from: g.position.clone(), to: farFloor(g.position, 4, 8), t: 0 }; sfx('feather'); api.msg('Спугнул! Тише', 'bad'); }
        if (fly) { fly.t += dt / 0.8; const k = Math.min(1, fly.t); g.position.lerpVectors(fly.from, fly.to, k); g.position.y += Math.sin(k * Math.PI) * 1.6; g.rotation.y = Math.atan2(fly.to.x - fly.from.x, fly.to.z - fly.from.z); if (k >= 1) { fly = null; wp.copy(g.position); } return; }
        // клюёт и семенит
        wt -= dt; if (wt <= 0) { wt = 1 + Math.random() * 2; const a = Math.random() * 6.28; wp.set(g.position.x + Math.cos(a) * 0.8, g.position.y, g.position.z + Math.sin(a) * 0.8); if (!isFree(wp.x - 0.15, wp.z - 0.15, wp.x + 0.15, wp.z + 0.15, wp.y + 0.05, wp.y + 0.4)) wp.copy(g.position); }
        const dx = wp.x - g.position.x, dz2 = wp.z - g.position.z, l = Math.hypot(dx, dz2); hop += dt * 10;
        if (l > 0.05) { g.position.x += dx / l * Math.min(l, dt * 0.7); g.position.z += dz2 / l * Math.min(l, dt * 0.7); g.rotation.y = Math.atan2(dx, dz2); g.position.y = wp.y + Math.abs(Math.sin(hop)) * 0.03; }
        g.children[0].rotation.x = l < 0.05 ? Math.max(0, Math.sin(hop * 0.5)) * 0.4 : 0;
        api.progress(Math.max(0, 0.5 - d / 20));
      },
      stop() { W.group.remove(g); },
    };
  },
};

/* ====================== панельные (камера встаёт к объекту) ====================== */
export const PANEL5 = {
  // 3. Бургеры: котлеты жарятся (низ темнеет). Клик — перевернуть; когда и второй бок готов — клик ещё раз, в булку. Нужно 3 хороших
  grill(o, api) {
    const s = o.spot, F = new V3(s.f[0], 0, s.f[1]), c0 = new V3(s.bx, s.by, s.bz);
    api.pose(c0.clone().addScaledVector(F, 0.85).add(new V3(0, 0.95, 0)), c0.clone().addScaledVector(F, -0.05));
    const grp = new THREE.Group(); grp.position.copy(c0); grp.rotation.y = Math.atan2(F.x, F.z); W.group.add(grp);
    grp.add(compose('m5grill', a => { a(G.box, col(0x2b2533), -0.15, 0.02, 0, 0.62, 0.04, 0.36); for (let i = 0; i < 7; i++) a(G.box, col(0x6a6d78), -0.15, 0.045, -0.15 + i * 0.05, 0.6, 0.01, 0.012); a(G.box, glow(0xff6a1a), -0.15, 0.03, 0, 0.56, 0.005, 0.3);
      a(G.box, tmat(T.wood()), 0.36, 0.02, 0, 0.3, 0.03, 0.34); }));
    const RAW = new THREE.Color(0xd87a7a), DONE = new THREE.Color(0x8a4a2a), BURN = new THREE.Color(0x1e1410), tmp = new THREE.Color();
    const shade = (k, m) => { if (k < 3.5) tmp.copy(RAW).lerp(DONE, k / 3.5); else if (k < 6.5) tmp.copy(DONE); else tmp.copy(DONE).lerp(BURN, Math.min(1, (k - 6.5) / 1.5)); m.color.copy(tmp); };
    const P3 = [-0.33, -0.15, 0.03].map((x, i) => { const g = new THREE.Group(); g.position.set(x, 0.07, 0); grp.add(g); const top = mesh(G.cyl12, lam({ color: 0xd87a7a }), 0, 0.015, 0, 0.075, 0.03, 0.075, g), bot = mesh(G.cyl12, lam({ color: 0xd87a7a }), 0, -0.012, 0, 0.076, 0.026, 0.076, g);
      top.userData.i = bot.userData.i = i; return { g, top, bot, a: 0, b: 0, flips: 0, flipT: 0, dead: 0 }; });
    let good = 0, endT = -1, buns = 0;
    const reset = p => { p.a = 0; p.b = 0; p.flips = 0; p.g.visible = true; p.g.position.y = 0.07; p.g.rotation.x = 0; };
    const bun = () => { const b = new THREE.Group(); b.position.set(0.36, 0.04, -0.1 + buns * 0.1); grp.add(b); b.add(compose('m5bun', a => { a(G.cyl12, col(0xe8a050), 0, 0.012, 0, 0.07, 0.024, 0.07); a(G.cyl12, col(0x6a3a1e), 0, 0.034, 0, 0.068, 0.02, 0.068); a(G.cyl12, col(0x6aa84f), 0, 0.048, 0, 0.072, 0.006, 0.072); a(G.sph10, col(0xe8a050), 0, 0.055, 0, 0.07, 0.04, 0.07); })); buns++; };
    api.progress(0); api.msg('Клик по котлете — перевернуть. Обе стороны готовы — клик, в булку');
    return {
      down(ray) { if (endT > 0) return; const h = ray.intersectObjects(P3.flatMap(p => [p.top, p.bot]), false)[0]; if (!h) return; const p = P3[h.object.userData.i]; if (p.flipT > 0 || p.dead > 0) return;
        if (p.flips === 0) { p.flips = 1; p.flipT = 0.35; [p.a, p.b] = [p.b, p.a]; sfx('hiss'); return; }
        // подать: обе стороны прожарены и не сгорели
        const ok = p.a >= 3.2 && p.b >= 3.2 && p.a < 6.5 && p.b < 6.5; sfx(ok ? 'pickup' : 'bonk');
        if (ok) { good++; bun(); api.progress(good / 3); api.msg(`Бургер ${good}/3!`, 'good'); if (good >= 3) { endT = 1; sfx('done'); } } else api.msg(p.a < 3.2 || p.b < 3.2 ? 'Сырая!' : 'Сгорела!', 'bad');
        reset(p); },
      update(dt) {
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); }
        for (const p of P3) { if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) reset(p); continue; }
          p.b += dt; shade(p.b, p.bot.material); shade(p.a, p.top.material);
          if (p.flipT > 0) { p.flipT -= dt; const k = 1 - p.flipT / 0.35; p.g.position.y = 0.07 + Math.sin(k * Math.PI) * 0.12; p.g.rotation.x = k * Math.PI; if (p.flipT <= 0) p.g.rotation.x = 0; }
          if (Math.random() < dt * (p.b > 6.5 ? 14 : 3)) { const w = new V3(); p.g.getWorldPosition(w); puff(w.x, w.y + 0.05, w.z, { color: p.b > 6.5 ? 0x2a2230 : 0xd8d0e4, size: 0.06, vy: 0.6, life: 0.6 }); }
          if (p.b > 8.5) { p.dead = 1; p.g.visible = false; api.msg('Сгорела! Новая котлета', 'bad'); sfx('bonk'); } }
      },
      stop() { W.group.remove(grp); },
    };
  },
  // 4b. Заправка генератора: держи ЛКМ — стрелка давления растёт; лей только в зелёной зоне, в красной — переливается
  fuel(o, api) {
    const c = o.pos(), yaw = o.g.rotation.y, F = new V3(Math.sin(yaw), 0, Math.cos(yaw)), R = new V3(F.z, 0, -F.x);
    const dial = c.clone().addScaledVector(F, 0.39).addScaledVector(R, 0.2).add(new V3(0, 0.62, 0));
    api.pose(dial.clone().addScaledVector(F, 0.9).add(new V3(0, 0.25, 0)), dial.clone().add(new V3(0, -0.05, 0)));
    // шкала на циферблате
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const g = cv.getContext('2d'); g.fillStyle = '#f1e8ff'; g.beginPath(); g.arc(16, 16, 15, 0, 7); g.fill();
    const arc = (a0, a1, cc) => { g.strokeStyle = cc; g.lineWidth = 5; g.beginPath(); g.arc(16, 16, 11, Math.PI + a0 * Math.PI, Math.PI + a1 * Math.PI); g.stroke(); }; arc(0, 0.55, '#8a8d98'); arc(0.55, 0.78, '#3a9a4a'); arc(0.78, 1, '#d8243a');
    const tx = new THREE.CanvasTexture(cv); tx.magFilter = tx.minFilter = THREE.NearestFilter; const face = mesh(G.plane, new THREE.MeshBasicMaterial({ map: tx }), dial.x, dial.y, dial.z, 0.3, 0.3, 1, W.group); face.rotation.y = yaw; face.position.addScaledVector(F, 0.012);
    let p = 0, fill = 0, hold = false, endT = -1; api.progress(0); api.msg('Держи ЛКМ — стрелка в ЗЕЛЁНОЙ зоне');
    return {
      down() { hold = true; }, up() { hold = false },
      update(dt) {
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); return; }
        p += (hold ? 0.55 : -0.7) * dt + (Math.random() - 0.5) * dt * 0.6; p = Math.max(0, Math.min(1, p)); o.needle.rotation.z = Math.PI / 2 - p * Math.PI;
        if (p >= 0.55 && p < 0.78) { fill += dt * 0.22; if (Math.random() < dt * 6) sfx('tick'); }
        else if (p >= 0.78) { fill = Math.max(0, fill - dt * 0.15); if (Math.random() < dt * 10) puff(dial.x, dial.y + 0.4, dial.z, { color: 0xd8c040, size: 0.08, vy: 1, life: 0.4 }); if (Math.random() < dt * 2) api.msg('Переливаешь!', 'bad'); }
        api.progress(fill);
        if (fill >= 1) { endT = 1.2; api.msg('Свет есть!', 'good'); sfx('done'); for (const b of o.bulbs) { b.material.emissive.setHex([0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0][(Math.random() * 4) | 0]); b.material.emissiveIntensity = 1; }
          W.flash && W.flash(c, 0xffd8a0, 0.5); }
      },
      stop() { W.group.remove(face); },
    };
  },
  // 5. Колокола: призрак звонит по порядку — повтори кликами (камешек летит в колокол). 3 раунда, 3 ошибки — провал
  bells(o, api) {
    const c = o.pos(), yaw = o.g.rotation.y, F = new V3(Math.sin(yaw), 0, Math.cos(yaw));
    api.pose(c.clone().addScaledVector(F, 3.6).add(new V3(0, 1.6, 0)), c.clone().add(new V3(0, 2.0, 0)));
    const gs = mkGhost(); gs.position.copy(c).add(new V3(0, 3.1, 0.3)); let round = 0, seq = [], shown = 0, showT = 1.2, mode = 'show', inp = 0, errs = 0, endT = -1, pebbles = [];
    const ring2 = i => { const b = o.bells[i]; b.sw = 1; sfx('bellN', { n: i }); const w = new V3(); b.b.getWorldPosition(w); burst(w.x, w.y - 0.2, w.z, 5, { color: 0xf5c542, size: 0.06, speed: 1 }); };
    const next = () => { round++; seq = []; for (let i = 0; i < round + 2; i++) seq.push((Math.random() * 4) | 0); shown = 0; showT = 1.0; mode = 'show'; inp = 0; api.msg(`Раунд ${round}: смотри и слушай`); };
    next();
    return {
      down(ray) { if (mode !== 'input' || endT > 0) return; const h = ray.intersectObjects(o.bells.map(b => b.b), false)[0]; if (!h) return; const i = h.object.userData.i, w = new V3(); h.object.getWorldPosition(w);
        const from = ray.ray.origin.clone().add(new V3(0, -0.5, 0)); const m = mesh(G.sph, col(0x8a8d98), from.x, from.y, from.z, 0.05, 0.05, 0.05, W.group); pebbles.push({ m, from, to: w, t: 0, i }); },
      update(dt) {
        for (const b of o.bells) { b.sw *= Math.exp(-dt * 2.5); b.p.rotation.z = Math.sin(performance.now() * 0.012) * b.sw * 0.5; }
        for (const p of pebbles.slice()) { p.t += dt / 0.25; p.m.position.lerpVectors(p.from, p.to, Math.min(1, p.t)); if (p.t >= 1) { W.group.remove(p.m); pebbles.splice(pebbles.indexOf(p), 1); ring2(p.i);
          if (p.i === seq[inp]) { inp++; if (inp >= seq.length) { api.progress(round / 3); if (round >= 3) { endT = 1.2; api.msg('Призрак доволен!', 'good'); sfx('done'); } else { mode = 'wait'; showT = 1.2; api.msg('Верно!', 'good'); } } }
          else { errs++; api.msg(errs >= 3 ? 'Призрак обиделся...' : `Не тот! (${errs}/3)`, 'bad'); if (errs >= 3) { endT = 1; mode = 'fail'; } else { shown = 0; showT = 1.0; mode = 'show'; inp = 0; } } } }
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: mode !== 'fail', mult: 1 }); return; }
        if (mode === 'wait') { showT -= dt; if (showT <= 0) next(); }
        if (mode === 'show') { showT -= dt; const b = o.bells[seq[Math.min(shown, seq.length - 1)]]; const w = new V3(); b.b.getWorldPosition(w); gs.position.lerp(new V3(w.x, w.y + 0.45, w.z + 0.2), Math.min(1, dt * 8));
          if (showT <= 0) { if (shown < seq.length) { ring2(seq[shown]); shown++; showT = 0.75; } else { mode = 'input'; api.msg('Повтори! Клик по колоколу'); } } }
        gs.material.opacity = 0.6 + Math.sin(performance.now() * 0.006) * 0.2;
      },
      stop() { W.group.remove(gs); for (const p of pebbles) W.group.remove(p.m); },
    };
  },
  // 7. Мойка: ЛКМ и три грязь щёткой (пена), потом смой пену струёй — машина блестит
  carwash(o, api) {
    const sp = o.spot, car = sp.car, cg = car.g, side = new V3(sp.x - car.x, 0, sp.z - car.z).normalize(), along = new V3(side.z, 0, -side.x);
    const center = new V3(car.x, car.y + 0.8, car.z); api.pose(center.clone().addScaledVector(side, 3.4).add(new V3(0, 0.25, 0)), center.clone().add(new V3(0, -0.1, 0)));
    const L = (car.L || 3.9) * 0.8, n = 6, spots = [];
    const mudM = new THREE.MeshBasicMaterial({ color: 0x4a3a28, transparent: true, depthWrite: false }), foamM = new THREE.MeshBasicMaterial({ color: 0xf1f0ff, transparent: true, depthWrite: false });
    for (let i = 0; i < n; i++) { const p = center.clone().addScaledVector(along, -L / 2 + (i + 0.5) * L / n + (Math.random() - 0.5) * 0.2).addScaledVector(side, 0.92).add(new V3(0, (Math.random() - 0.5) * 0.35 - 0.1, 0));
      const m = mesh(G.disc, mudM.clone(), p.x, p.y, p.z, 0.22 + Math.random() * 0.08, 0.16 + Math.random() * 0.06, 1, W.group); m.lookAt(p.clone().add(side)); m.material.opacity = 0.9; spots.push({ m, p, dirt: 1, foam: 0, f: null }); }
    let mode = 'scrub', drag = false, endT = -1; void cg; void foamM;
    api.progress(0); api.msg('Зажми ЛКМ и три грязь');
    const plane = center.clone().addScaledVector(side, 0.92);
    return {
      down() { drag = true; }, up() { drag = false; },
      move(ray) { if (!drag || endT > 0) return; const h = onPlane(ray, side, plane); if (!h) return;
        for (const s of spots) { if (h.distanceTo(s.p) > 0.3) continue;
          if (mode === 'scrub' && s.dirt > 0) { s.dirt = Math.max(0, s.dirt - 0.06); s.m.material.opacity = s.dirt * 0.9; if (Math.random() < 0.5) puff(h.x, h.y, h.z, { color: 0xf1f0ff, size: 0.07, vy: 0.2, life: 0.8, grow: 0.5 });
            if (s.dirt <= 0 && !s.f) { s.f = mesh(G.disc, foamM.clone(), s.p.x, s.p.y, s.p.z, 0.26, 0.2, 1, W.group); s.f.lookAt(s.p.clone().add(side)); s.f.position.addScaledVector(side, 0.003); s.foam = 1; } }
          if (mode === 'rinse' && s.foam > 0) { s.foam = Math.max(0, s.foam - 0.07); s.f.material.opacity = s.foam; if (Math.random() < 0.6) burst(h.x, h.y, h.z, 2, { color: 0x9ccbec, size: 0.05, speed: 1.2, life: 0.4 }); } }
        if (mode === 'scrub') { const k = spots.reduce((a, s) => a + (1 - s.dirt), 0) / n; api.progress(k * 0.6); if (k >= 1) { mode = 'rinse'; api.msg('Смой пену — веди струёй', 'good'); sfx('water'); } }
        else { const k = spots.reduce((a, s) => a + (1 - s.foam), 0) / n; api.progress(0.6 + k * 0.4); if (k >= 1 && endT < 0) { endT = 1.2; sfx('done'); api.msg('Блестит!', 'good'); burst(center.x, center.y + 0.6, center.z, 18, { color: 0xffffff, size: 0.08, speed: 2.5 }); } } },
      update(dt) { if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } },
      stop() { for (const s of spots) { W.group.remove(s.m); if (s.f) W.group.remove(s.f); } },
    };
  },
  // 13. Антенна: тяни мышью — тарелка поворачивается; лампочки и ТВ показывают сигнал; удержи максимум 1.5 с
  antenna(o, api) {
    const A = o.ant, c = o.pos(), yaw = o.g.rotation.y, F = new V3(Math.sin(yaw), 0, Math.cos(yaw)), R = new V3(F.z, 0, -F.x);
    api.pose(c.clone().addScaledVector(F, 2.3).addScaledVector(R, 0.45).add(new V3(0, 1.75, 0)), c.clone().addScaledVector(R, 0.45).add(new V3(0, 1.0, 0)));
    const ty = (Math.random() - 0.5) * 2.2, tp = 0.15 + Math.random() * 0.5; let hy = (Math.random() < 0.5 ? -1 : 1) * 1.2, hp = 0.9, drag = false, last = null, good = 0, endT = -1, nt = 0;
    const g = A.tvc.getContext('2d'); api.progress(0); api.msg('Тяни мышью — крути тарелку, лови сигнал');
    const signal = () => Math.max(0, 1 - Math.hypot(hy - ty, (hp - tp) * 1.4) / 1.4);
    return {
      down(ray) { drag = true; last = { x: ray.ray.direction.x, y: ray.ray.direction.y, z: ray.ray.direction.z }; }, up() { drag = false; },
      move(ray) { if (!drag || endT > 0) return; const d = ray.ray.direction, dx = (d.x - last.x) * R.x + (d.z - last.z) * R.z, dy = d.y - last.y; last = { x: d.x, y: d.y, z: d.z };
        hy = Math.max(-1.6, Math.min(1.6, hy - dx * 4)); hp = Math.max(-0.2, Math.min(1.1, hp + dy * 4)); if (Math.random() < 0.3) sfx('tick'); },
      update(dt) {
        A.head.rotation.set(-hp, hy, 0); const s = signal(); A.leds.forEach((l, i) => l.material.emissive.setHex(s > (i + 0.5) / 5.5 ? (i < 2 ? 0xd8243a : i < 4 ? 0xf5c542 : 0x9be36b) : 0x000000));
        nt -= dt; if (nt <= 0) { nt = 0.08; const id = g.createImageData(32, 24); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0);
          g.globalAlpha = s; g.fillStyle = '#4ab0f0'; g.fillRect(0, 0, 32, 24); g.fillStyle = '#ff8a1f'; g.beginPath(); g.arc(16, 12, 7, 0, 7); g.fill(); g.fillStyle = '#17111f'; g.fillRect(12, 9, 2, 2); g.fillRect(18, 9, 2, 2); g.fillRect(13, 14, 6, 2); g.globalAlpha = 1; A.tvt.needsUpdate = true; }
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); return; }
        if (s > 0.9) { good += dt; if (good > 1.5) { endT = 1; sfx('done'); api.msg('Картинка есть! Бабушка довольна', 'good'); } } else good = Math.max(0, good - dt);
        api.progress(Math.max(s * 0.7, good / 1.5));
      },
      stop() { A.head.rotation.set(0, 0, 0); },
    };
  },
};
