import { random } from '../core/random.js';
import {addOutline} from '../game/outline.js';
import {CONFIG} from '../config.js';
import {cameraModel,tripodModel} from './camera-model.js';
import { buildEntranceBell,doorbellGame } from './doorbell.js';
import { followHand, handPosition, cargoPosition, toolHand } from '../game/handheld.js';
import { THREE, G, V3, mesh, col, tmat, lam, glow, compose, sprite } from '../core/gfx.js';
import { T, pix } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid, isFree, groundAt, raySolids } from '../world/physics.js';
import { burst, puff } from '../world/particles.js';
import { addItem, launch, setLetterColor } from '../game/items.js';
import { addPushable } from '../world/pushables.js';
import { skelModel } from '../game/town.js';
import { daze,actors } from '../game/actors.js';
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
  for (let i = 0; i < 260 && zs.length; i++) { const z = zs[(random() * zs.length) | 0], x = z.x0 + 0.5 + random() * Math.max(0, z.x1 - z.x0 - 1), zz = z.z0 + 0.5 + random() * Math.max(0, z.z1 - z.z0 - 1), d = Math.hypot(x - p.x, zz - p.z);
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

/* ====================== объекты (ставит генератор миссий) ====================== */
export const buildDoor=buildEntranceBell;
export function buildSkelBench(x, y, z, f) {
  const o = place(x, y, z, f, g => { g.add(compose('m5bench', a => { const w = tmat(T.wood()), dk = col(0x2b2533); a(G.box, w, 0, 0.45, 0, 1.8, 0.06, 0.45); a(G.box, w, 0, 0.75, -0.2, 1.8, 0.35, 0.05); for (const sx of [-0.8, 0.8]) a(G.box, dk, sx, 0.22, 0, 0.06, 0.44, 0.42); }));
    const sk = skelModel('smoke'); sk.g.position.set(-0.35, -0.5, 0.0); sk.legs.forEach(l => (l.rotation.x = -1.4)); g.add(sk.g); g.userData.sk = sk; }, [1.9, 0.6], 0.5);
  o.type = 'skelbench'; o.sk = o.g.userData.sk; return o;
}
export function buildGenerator(x, y, z, f) {
  const o = place(x, y, z, f, g => { g.add(compose('m5gen', a => { const y2 = lam({ map: T.paintMetal(0xd8a030) }, 'm5genY'), dk = col(0x2b2533), mt = tmat(T.metal());
    a(G.box, y2, 0, 0.5, 0, 1.2, 0.7, 0.7); a(G.box, tmat(T.vent()), 0, 0.5, 0.36, 0.8, 0.4, 0.01); for (const sx of [-0.62, 0.62]) a(G.box, dk, sx, 0.55, 0, 0.04, 0.8, 0.75);
    for (const sx of [-0.45, 0.45]) a(G.cyl12, dk, sx, 0.13, 0.38, 0.13, 0.08, 0.13, Math.PI / 2); a(G.cyl8, mt, 0.4, 1.0, -0.2, 0.05, 0.3, 0.05); a(G.cyl8, mt, -0.35, 0.89, 0, 0.09, 0.08, 0.09);a(G.cyl8, col(0x17111f), -0.35, 0.934, 0, 0.062, 0.012, 0.062);a(G.cyl8, col(0xd8243a), -0.08, 0.9, 0.1, 0.075, 0.035, 0.075);
    a(G.cyl12, dk, 0.2, 0.62, 0.375, 0.23, 0.035, 0.23, Math.PI / 2);a(G.box,dk,-0.49,0.53,0.385,0.12,0.55,0.04);a(G.box,col(0xd8d0b8),-0.49,0.53,0.409,0.07,0.47,0.009);
    for (const sx of [-1.6, 1.6]) a(G.box, dk, sx, 1.3, -0.4, 0.07, 2.6, 0.07); }));
    const bulbs = []; for (let i = 0; i < 9; i++) { const t = i / 8, b = mesh(G.sph, lam({ color: 0x3a3440, emissive: 0x000000 }), -1.6 + t * 3.2, 2.5 - Math.sin(t * Math.PI) * 0.35, -0.4, 0.07, 0.09, 0.07, g); bulbs.push(b); }
    const wire = mesh(G.box, col(0x17111f), 0, 2.38, -0.4, 3.2, 0.015, 0.015, g); void wire;
    g.userData.bulbs = bulbs; const needle = new THREE.Group(); needle.position.set(0.2, 0.62, 0.424); g.add(needle); mesh(G.box, new THREE.MeshBasicMaterial({color:0xd8243a}), 0, 0.075, 0, 0.019, 0.15, 0.012, needle);mesh(G.cyl8,col(0x2b2533),0,0,0.009,0.028,0.018,0.028,needle).rotation.x=Math.PI/2;needle.rotation.z=Math.PI/2; g.userData.needle = needle; }, [3.4, 0.9], 1.0);
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
  const o = place(x, y, z, f, g => { g.add(compose('m24tree', a => {
    const bark = tmat(T.bark()), leaf = tmat(T.bush());
    a(G.cyl6, bark, 0, 2.2, 0, 0.26, 4.4, 0.26);
    a(G.cyl6, bark, 0.15, 4.35, 0.68, 0.11, 1.65, 0.11, Math.PI / 2 - 0.25);
    for (const [xx, yy, zz, size] of [[0,5.1,-0.3,1.65],[-1,4.7,0,1.1],[0.9,4.8,-0.15,1.15]]) a(G.ico, leaf, xx, yy, zz, size, size * 0.75, size);
    for (const sx of [-1,1]) a(G.cyl5, bark, sx * 0.35, 0.17, 0.05, 0.08, 0.85, 0.08, 0, 0, sx * 1.15);
  }));
    const bl = new THREE.Group(); bl.position.set(0.18, 5.15, 1.65); g.add(bl);
    bl.add(compose('m24balloon', a => { a(G.sph10, lam({color:0xff5a6e, emissive:0x2a0810}, 'm24balloon'), 0, 0, 0, 0.34, 0.43, 0.34);
      a(G.cone4, col(0xd8243a), 0, -0.44, 0, 0.06, 0.1, 0.06, Math.PI); a(G.box, col(0xffd8e0), -0.12, 0.13, 0.3, 0.07, 0.13, 0.015); }));
    const thread = new THREE.Group(); thread.position.y = -0.48; bl.add(thread);
    for (let i=0;i<5;i++) mesh(G.box,col(0xe8dfc8),Math.sin(i*1.4)*0.035,-i*0.13,0,0.012,0.15,0.012,thread);
    g.userData.bl = bl;
  }, [0.6, 0.6], 4.4);
  o.type = 'tree'; o.bl = o.g.userData.bl;
  const tick = (dt,t) => { if (!o.bl.visible) return; o.bl.rotation.z = Math.sin(t*2.5+x)*0.1; o.bl.position.y=5.15+Math.sin(t*2.8+z)*0.09; };
  W.animated.push(tick); const dispose=o.dispose; o.dispose=()=>{ W.animated=W.animated.filter(fn=>fn!==tick);dispose(); }; return o;
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
export function buildGraveCam(x,y,z,f){const o=place(x,y,z,f,g=>g.add(tripodModel()),[.85,.85],1.45);o.type='tripod';return o;}
export function buildAntenna(x, y, z, f) {
  const o = place(x, y, z, f, g => { g.add(compose('m45ant', a => { const dk = col(0x2b2533); a(G.box, dk, 0, 0.6, 0, 0.08, 1.2, 0.08); a(G.box,tmat(T.cabinet(0x62646a)),.9,.30,.1,.68,.60,.60);a(G.box,tmat(T.metal()),.9,.625,.1,.76,.05,.67);for(const x of[-.18,.18]){a(G.cyl8,tmat(T.metal()),x,.05,0,.025,.10,.025);a(G.box,dk,x,.02,0,.12,.035,.25);}a(G.box,dk,.9,.49,.413,.49,.035,.012);for(const x of[.69,.79,.89])a(G.cyl8,col(0x999b91),x,.18,.414,.026,.018,.026,Math.PI/2);a(G.box,tmat(T.hazard()),0,.3,0,.10,.14,.10);
    a(G.box, col(0x3a3440), 0.9, 0.82, 0.1, 0.52, 0.42, 0.36); }));
    const head = new THREE.Group(); head.position.set(0, 1.25, 0); g.add(head); head.add(compose('m5dish', a => { a(DISH, lam({ map: T.paintMetal(0xd8d8e0), side: THREE.DoubleSide }, 'm5dish'), 0, 0, 0.1, 0.5, 0.5, 0.2); a(G.box, col(0x2b2533), 0, 0, 0.42, 0.03, 0.03, 0.5); a(G.box, col(0x2b2533), 0, 0, 0.68, 0.07, 0.07, 0.07); }));
    const leds = []; for (let i = 0; i < 5; i++) leds.push(mesh(G.box, lam({ color: 0x2a2232, emissive: 0x000000 }), -0.12 + i * 0.06, -0.18, -0.02, 0.04, 0.03 + i * 0.012, 0.02, head));
    const tvc = document.createElement('canvas'); tvc.width = 32; tvc.height = 24; const tvt = new THREE.CanvasTexture(tvc); tvt.magFilter = tvt.minFilter = THREE.NearestFilter; tvt.generateMipmaps = false;
    const tv = mesh(G.plane, new THREE.MeshBasicMaterial({ map: tvt }), 0.9, 0.84, 0.29, 0.42, 0.32, 1, g); void tv;
    g.userData.ant = { head, leds, tvc, tvt }; }, [1.6, 0.8], 0.6);
  o.type = 'antenna'; o.ant = o.g.userData.ant;const dispose=o.dispose;o.dispose=()=>{o.ant.tvt.dispose();o.ant.leds.forEach(l=>l.material.dispose());dispose();};return o;
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
  doorbell:doorbellGame,
  // 2. Утащи у скелета: банка рядом с ним на лавке; бери, когда он не смотрит (красный сектор), и уноси за 12 м
  steal(o, api, ctx) {
    const P = ctx.player, sk = o.sk, c = o.pos(), yaw0 = o.g.rotation.y; let look = yaw0, want = yaw0, nextT = 2, strikes = 0, time = 75, hold = 0, grace=3, suspicion=0, recovery=0, attempted=false;
    const spot = new V3(c.x + Math.cos(yaw0) * 0.45, c.y + 0.6, c.z - Math.sin(yaw0) * 0.45);
    const can = addItem('can', spot.x, spot.y, spot.z); can.def = { ...can.def, respawn: 0 }; const rg = ring(0xf5c542);
    const cone = viewCone(7, 0.6); cone.position.set(c.x, c.y, c.z);
    api.msg('Стащи банку, пока скелет не смотрит');
    return {
      botItems:()=>[can],botTarget:()=>P.held===can?c.clone().addScaledVector(new V3(-Math.sin(yaw0),0,-Math.cos(yaw0)),14):can.pos,
      target: () => P.held === can ? null : can.pos,
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false });
        if (can.state === 'gone') return api.finish({ success: false });
        // скелет крутит головой: смотрит перед собой, иногда резко оборачивается
        nextT -= dt; if (nextT <= 0) { nextT = 1.2 + random() * 2; want = yaw0 + (random() < 0.55 ? 0 : (random() < 0.5 ? -1 : 1) * (1.2 + random() * 1.6)); }
        look += (want - look) * Math.min(1, dt * 3); sk.body.rotation.y = look - yaw0; cone.rotation.y = look; hold += dt; sk.arms[1].rotation.x = -1.6 + Math.sin(hold * 1.3) * 0.5;
        rg.visible = P.held !== can; rg.position.set(can.pos.x, can.pos.y - 0.08, can.pos.z);
        grace-=dt;recovery-=dt;if(P.held===can)attempted=true;
        const near=flat(P.pos,c)<7,has=P.held===can;
        const watching=grace<=0&&recovery<=0&&attempted&&near&&has&&sees(c,look,7,.6,P);
        suspicion=Math.max(0,Math.min(1,suspicion+(watching?dt*1.5:-dt*2)));cone.children[0].material.opacity=watching?.10+suspicion*.4:.12;
        if(watching&&suspicion>=1) { strikes++;suspicion=0;recovery=3;attempted=false; sfx('curse', { at: c }); daze(P, 1); if (P.held === can) P.held = null; can.state = 'rest'; can.pos.copy(spot); can.vel.set(0, 0, 0);
          api.msg(strikes >= 2 ? 'Попался дважды!' : 'Заметил! Банку вернул', 'bad'); if (strikes >= 2) return api.finish({ success: false }); }
        const d = flat(can.pos, c); api.progress(Math.min(1, d / 12));
        if (d > 12 && can.state !== 'fly') { sfx('done'); api.finish({ success: true, mult: 1 }); }
      },
      stop() { W.group.remove(cone); W.group.remove(rg); if (P.held === can) P.held = null; can.state = 'gone'; can.g.visible = false; },
    };
  },
  // 4. Генератор: принеси канистру к генератору → E → залей (панель «fuel»)
  generator(o, api, ctx) {
    api.feedback?.();
    const P = ctx.player, c = o.pos(), sp = farFloor(c, 10, 24), can = addItem('canister', sp.x, sp.y + 0.3, sp.z); can.def = { ...can.def, respawn: 0 }; const rg = ring(0xf5c542); let time = 100;
    api.msg('Ярмарка без света! Найди канистру');
    return {
      botItems:()=>[can],
      target: () => P.held === can ? o.front() : can.pos,
      prompt: () => P.held === can && flat(P.pos, c) < 2.2 ? '<b>E</b>Заправить' : '',
      interact() { if (P.held !== can || flat(P.pos, c) > 2.2) return false; P.held = null; can.state = 'gone'; can.g.visible = false; api.finish({ chain: 'fuel' }); return true; },
      update(dt) { time -= dt; api.timer(time); if (time <= 0 || can.state === 'gone') return api.finish({ success: false }); rg.visible = P.held !== can; rg.position.set(can.pos.x, can.pos.y - 0.2, can.pos.z); api.progress(P.held === can ? 0.4 : 0.1); },
      stop() { W.group.remove(rg); if (can.state !== 'gone') { if (P.held === can) P.held = null; can.state = 'gone'; can.g.visible = false; } },
    };
  },
  // Миссионный инструмент: ЛКМ - взмах; E используется только для банки.
  moths(o, api, ctx) {
    api.feedback?.();
    const P=ctx.player,L=o.spot.lamp,lc=new V3(L.lx,L.y,L.lz),jarP=new V3(o.spot.x,o.spot.y,o.spot.z);
    const NEED=5;let time=95,caught=0,flee=0,elapsed=0,swing=0,cooldown=0,hitSwing=false,deposit=-1;
    const jar=new THREE.Group();jar.name='mission-moth-jar';jar.position.copy(jarP);W.group.add(jar);
    jar.add(compose('mothJar26',a=>{a(G.cyl8,col(0x6a5536),0,0.02,0,0.2,0.04,0.2);a(G.cyl8,lam({color:0xbfe8ff,transparent:true,opacity:0.3,depthWrite:false},'mothGlass26'),0,0.25,0,0.19,0.46,0.19);a(G.cyl8,col(0xd8a030),0,0.51,0,0.2,0.05,0.2);}));
    const wingTex=pix('missionMoth26',32,32,g=>{g.clearRect(0,0,32,32);g.fillStyle='#ac9470';g.beginPath();g.moveTo(2,15);g.lineTo(8,2);g.lineTo(27,1);g.lineTo(30,15);g.lineTo(24,30);g.lineTo(6,25);g.closePath();g.fill();g.fillStyle='#69543e';for(let y=3;y<28;y+=5)for(let x=5;x<29;x+=5)g.fillRect(x+(y%3),y,3,2);g.fillStyle='#e8d8a0';g.fillRect(17,7,8,7);g.fillRect(13,22,7,4);g.fillStyle='#423640';g.fillRect(19,9,4,4);g.fillStyle='#b97c50';g.fillRect(8,15,19,3);});
    const wing=lam({map:wingTex,side:THREE.DoubleSide,alphaTest:0.3},'missionMoth26');
    const edgeTexture=pix('mothEdge49',32,32,g=>{g.fillStyle='#fff';g.beginPath();for(const[x,y]of[[2,15],[8,2],[27,1],[30,15],[24,30],[6,25]])g.lineTo(x,y);g.closePath();g.fill();});
    const edgeMaterial=new THREE.MeshBasicMaterial({map:edgeTexture,color:0xffe6a0,side:THREE.DoubleSide,alphaTest:.3,depthWrite:false,fog:false,polygonOffset:true,polygonOffsetFactor:1});W.mapResources.add(edgeMaterial);
    const moths=Array.from({length:5},(_,i)=>{const g=new THREE.Group();g.name='mission-moth';W.group.add(g);const edges=[];const wings=[-1,1].map(side=>{const pivot=new THREE.Group();pivot.position.x=side*0.025;g.add(pivot);const w=mesh(G.plane,wing,side*0.105,0,0,0.23,0.22,1,pivot);w.rotation.x=-Math.PI/2;const edge=mesh(G.plane,edgeMaterial,side*.105,-.002,0,.27,.26,1,pivot);edge.rotation.x=-Math.PI/2;edge.userData.noOutline=true;edges.push(edge);return pivot;});
      g.add(compose('mothBody26',a=>{a(G.box,col(0x594535),0,0,0,0.045,0.045,0.14);for(const side of [-1,1])a(G.box,col(0xc8b488),side*0.027,0.02,0.095,0.009,0.015,0.075,0,side*0.45);}));
      const outline=addOutline(g,.028,0xffe6a0);outline.set(true);return{g,wings,outline,edges,a:i*1.3,h:1.25+(i%3)*0.19,r:0.85+(i%2)*0.4,sp:3.2+i*0.38,got:false,turn:0,jitter:new V3(),want:new V3()};});
    const net=new THREE.Group();net.name='mission-moth-net';W.group.add(net);net.add(compose('mothNet29',a=>{a(G.cyl6,tmat(T.wood()),0,.14,.24,.025,.56,.025,1.06);a(G.cyl8,col(0x6a4531),0,-.04,-.07,.035,.20,.035,1.06);a(new THREE.TorusGeometry(.35,.018,4,12),col(0xc8c0a8),0,.62,.50);a(new THREE.ConeGeometry(1,1,8,1,true),lam({map:T.chainlink(),alphaTest:.35,side:THREE.DoubleSide},'mothNetting29'),0,.62,.20,.34,.60,.34,-Math.PI/2);}));P.carryNet=true;P.missionTool=true;
    const center=new V3(),previous=new V3(),mothPos=new V3(),segment=new THREE.Line3();
    const head=()=>{net.updateWorldMatrix(true,false);return net.localToWorld(center.set(0,.62,.50));};
    const pose=()=>{const k=swing>0?1-swing/0.36:0;followHand(P,net,-0.35+Math.sin(k*Math.PI)*0.9);net.rotation.y+=swing>0?Math.sin(k*Math.PI*2)*0.4:0;};pose();previous.copy(head());
    const catchOne=()=>{const end=head();segment.set(previous,end);for(const m of moths){if(m.got)continue;segment.closestPointToPoint(m.g.position,true,mothPos);if(mothPos.distanceTo(m.g.position)>0.5||!los(handPosition(P),m.g.position))continue;
        const at=m.g.position.clone();m.got=true;m.outline.set(false);m.edges.forEach(e=>e.visible=false);net.add(m.g);m.g.position.set((caught%2?1:-1)*0.07,.57+caught*.04,.22);m.g.scale.setScalar(0.25);caught++;sfx('pickup',{at});burst(at.x,at.y,at.z,5,{color:0xd8c8b0,size:0.06,speed:1});api.progress(caught/NEED*0.9);api.msg(caught>=NEED?'Пять пойманы! E у банки':`Поймано ${caught} из ${NEED}`,'good');return true;}return false;};
    api.msg('ЛКМ - взмах сачком. Поймай пять мотыльков, затем E у банки');
    return {
      toolName:'Сачок',toolIcon:'moths',toolAction:'Взмах',
      get equipped(){return !P.held&&!P.holding&&!P.grab&&!P.heldBy;},
      botTarget:()=>{if(caught>=NEED)return jarP;const m=moths.filter(m=>!m.got).sort((a,b)=>a.g.position.distanceTo(P.pos)-b.g.position.distanceTo(P.pos))[0];return m?new V3(m.g.position.x,lc.y,m.g.position.z):jarP;},botSpeed:.65,
      botStep(dt,brain){const m=moths.filter(m=>!m.got).sort((a,b)=>a.g.position.distanceTo(P.pos)-b.g.position.distanceTo(P.pos))[0];if(m)P.aimAt=m.g.position;if(caught<NEED&&brain.ready(0.55))this.down();},
      target:()=>caught>=NEED?jarP:lc,
      prompt:()=>caught>=NEED&&flat(P.pos,jarP)<1.6&&deposit<0?'<b>E</b>Пересадить в банку':'',
      down(){if(!this.equipped||caught>=NEED||cooldown>0||deposit>=0||P.heldBy||P.stun>0||P.daze>0)return;cooldown=0.5;swing=0.36;hitSwing=false;previous.copy(head());sfx('swat',{at:P.pos});},
      interact(){if(caught<NEED||flat(P.pos,jarP)>1.6||deposit>=0)return false;deposit=0.7;let i=0;for(const m of moths)if(m.got){jar.add(m.g);m.g.position.set((i%2?1:-1)*0.055,0.18+(i++)*0.065,0);m.g.rotation.set(0,i*1.7,0);}api.progress(1);api.msg('Все пять в банке!','good');sfx('done');return true;},
      update(dt){
        time-=dt;elapsed+=dt;api.timer(time);if(time<=0)return api.finish({success:false});
        cooldown=Math.max(0,cooldown-dt);if(!this.equipped)swing=0;else if(swing>0)swing=Math.max(0,swing-dt);net.visible=this.equipped;P.missionTool=this.equipped;P.carryNet=this.equipped;pose();
        const running=Math.hypot(P.vel.x,P.vel.z)>5.2&&flat(P.pos,lc)<4;if(running&&flee<=0){flee=1.5;api.msg('Спугнул! Подходи шагом','bad');}flee=Math.max(0,flee-dt);
        for(const m of moths){m.wings.forEach((w,i)=>w.rotation.z=(i?-1:1)*(0.25+Math.sin(elapsed*48+m.a)*0.9));if(m.got)continue;
          m.turn-=dt;if(m.turn<=0){m.turn=0.12+random()*0.26;m.want.set((random()-0.5)*1.2,(random()-0.5)*0.7,(random()-0.5)*1.2);}m.jitter.lerp(m.want,Math.min(1,dt*13));m.a+=dt*m.sp*(flee>0?1.6:1);
          const radius=m.r+(flee>0?1.2:0);m.g.position.set(lc.x+Math.cos(m.a)*radius+m.jitter.x,lc.y+m.h+(flee>0?.42:0)+m.jitter.y+Math.sin(elapsed*3.8+m.a)*.12,lc.z+Math.sin(m.a*1.14)*radius+m.jitter.z);m.g.rotation.y=-m.a+Math.sin(elapsed*8+m.a)*0.3;
        }
        if(swing>0&&swing<0.27&&!hitSwing)hitSwing=catchOne();previous.copy(head());
        if(deposit>=0){deposit-=dt;if(deposit<=0)api.finish({success:true,mult:1});}
      },
      stop(){P.carryNet=false;P.missionTool=false;for(const m of moths)m.g.removeFromParent();W.group.remove(jar,net);W.mapResources.delete(edgeMaterial);edgeMaterial.dispose();},
    };
  },
  // Общие ящики: соперник может унести даже поставленную ступень.
  balloon(o, api, ctx) {
    api.feedback?.();
    const P=ctx.player,c=o.pos(),yaw=o.g.rotation.y,F=new V3(Math.sin(yaw),0,Math.cos(yaw)),R=new V3(F.z,0,-F.x);
    let time=110,done=false,placed=[];
    const slots=[3,2.7,2.4].map((d,i)=>({p:c.clone().addScaledVector(F,d).addScaledVector(R,0.18),h:0.7*(i+1)}));
    const crates=slots.map(()=>{const p=nearbyItemPoint(c.clone().addScaledVector(F,3.5)),it=addItem('missioncrate',p.x,p.y,p.z,yaw);it.mission=ctx.mission;return{it,s:null,slot:-1};});
    const unpin=q=>{if(q.s)q.s.on=false;q.s=null;q.slot=-1;};
    for(const q of crates)q.it.onPickup=()=>{
      const i=placed.indexOf(q);if(i<0)return;const above=placed.splice(i);for(const v of above){unpin(v);if(v!==q)launch(v.it,v.it.pos.clone(),new V3(F.x*0.8,0.5,F.z*0.8));}
      api.progress(placed.length/3*0.7);api.msg('Ступень унесли - восстанови лесенку','bad');
    };
    const mat=new THREE.MeshBasicMaterial({color:0x9be36b,transparent:true,opacity:0.4,depthWrite:false,side:THREE.DoubleSide});
    const markers=slots.map(q=>{const m=mesh(G.ring,mat,q.p.x,q.p.y+0.04,q.p.z,0.62,0.62,1,W.group);m.rotation.x=-Math.PI/2;return m;});
    const bw=new V3(),next=()=>slots[Math.min(placed.length,2)].p,held=()=>crates.find(q=>q.it===P.held);
    const loose=()=>crates.filter(q=>q.slot<0&&q.it.state==='rest').sort((a,b)=>a.it.pos.distanceTo(P.pos)-b.it.pos.distanceTo(P.pos))[0];
    api.msg('Три ящика на зелёные метки - затем прыгни за шариком');
    return {
      botItems:()=>crates.map(q=>q.it),botPickable:it=>it.state!=='placed',
      target:()=>placed.length===3?o.bl.getWorldPosition(bw):held()?next():loose()?.it.pos||next(),
      botTarget:()=>placed.length<3?null:P.pos.y<c.y+1.9?new V3(slots[Math.min(2,Math.floor(Math.max(0,P.pos.y-c.y)/0.7))].p.x,c.y+Math.min(2.1,(Math.floor(Math.max(0,P.pos.y-c.y)/0.7)+1)*0.7),slots[Math.min(2,Math.floor(Math.max(0,P.pos.y-c.y)/0.7))].p.z):o.bl.getWorldPosition(bw),
      botStep(dt,brain){if(placed.length===3&&P.onGround&&brain.ready(0.7)){P.vel.y=ctx.jump||8;P.onGround=false;}},
      prompt:()=>done?'':held()?(flat(P.pos,next())<1.7?'<b>E</b>Поставить ступень':''):placed.length===3&&P.pos.y+1.8>o.bl.getWorldPosition(bw).y-0.15&&flat(P.pos,bw)<1.1?'<b>E</b>Снять шарик':loose()&&flat(P.pos,loose().it.pos)<1.5?'<b>E</b>Взять ящик':'',
      interact(){
        if(done)return false;const q=held();
        if(q){if(placed.length===3||flat(P.pos,next())>1.7||!P.onGround)return false;const i=placed.length,slot=slots[i];P.held=null;P.carryCrate=null;q.slot=i;q.it.state='placed';q.it.pos.copy(slot.p);q.it.pos.y=c.y+i*0.7+0.35;q.it.g.rotation.set(0,yaw,0);q.it.vel.set(0,0,0);
          q.s=addSolid(slot.p.x-0.45,slot.p.z-0.45,slot.p.x+0.45,slot.p.z+0.45,c.y+i*0.7,c.y+slot.h);placed.push(q);api.progress(placed.length/3*0.7);sfx('wood',{at:slot.p});
          if(flat(P.pos,slot.p)<1.1)P.pos.addScaledVector(F,1.05);api.msg(placed.length===3?'Лесенка готова! Прыгни и нажми E у шарика':'Следующий ящик - на новую метку');return true;}
        o.bl.getWorldPosition(bw);if(placed.length===3&&P.pos.y+1.8>bw.y-0.15&&flat(P.pos,bw)<1.1){done=true;o.bl.visible=false;sfx('done');burst(bw.x,bw.y,bw.z,12,{color:0xff5a6e,size:0.1,speed:1.5});api.finish({success:true,mult:1});return true;}
        const l=loose();if(!P.held&&!P.holding&&l&&l.it.pos.distanceTo(P.pos)<1.65){ctx.give(l.it);P.carryCrate=l;sfx('pickup');return true;}return false;
      },
      update(dt){time-=dt;api.timer(time);if(time<=0)return api.finish({success:false});P.carryCrate=held()||null;markers.forEach((m,i)=>m.visible=i===placed.length&&placed.length<3);mat.opacity=0.35+Math.sin(performance.now()*0.005)*0.12;},
      stop(){P.carryCrate=null;for(const q of crates){unpin(q);q.it.onPickup=null;if(q.it.owner?.held===q.it)q.it.owner.held=null;q.it.state='gone';q.it.g.visible=false;}for(const m of markers)m.removeFromParent();mat.dispose();o.bl.visible=!done;},
    };
  },
  // 9. Почтальон: 3 письма по цветным ящикам (можно закинуть броском)
  mail(o, api, ctx) {
    api.feedback?.();
    const P = ctx.player, c = o.pos(), COL = [[0xd8243a, 'красный'], [0x2a6ad8, 'синий'], [0x3a9a4a, 'зелёный']]; let time=150,k=0,letter=null;
    const destinations=[];let previous=c;for(let i=0;i<3;i++){let best=null,bestScore=-1;for(let j=0;j<32;j++){const q=farFloor(previous,i?20:30,i?40:55),min=Math.min(flat(q,c),...destinations.map(v=>flat(v,q)));if(min>bestScore){best=q;bestScore=min;}if(min>18)break;}destinations.push(best);previous=best;}
    const boxes = COL.map(([cc], i) => { const p=destinations[i],g = new THREE.Group(); g.position.copy(p); g.rotation.y = random() * 6; W.group.add(g);
      g.add(compose('m5mbox' + cc, a => { const m = lam({ map: T.paintMetal(cc) }, 'm5mb' + cc); a(G.box, col(0x2b2533), 0, 0.5, 0, 0.08, 1.0, 0.08); a(G.box, m, 0, 1.15, 0, 0.42, 0.34, 0.5); a(G.cyl8, m, 0, 1.32, 0, 0.21, 0.5, 0.21, Math.PI / 2); a(G.box, col(0x17111f), 0, 1.22, 0.255, 0.26, 0.04, 0.01); }));
      const sg = sprite(numTex(i + 1, cc), 0.5); sg.position.y = 1.9; g.add(sg); const flag=new THREE.Group();flag.name='mail-flag';flag.position.set(0.23,1.13,0);g.add(flag);flag.rotation.x=Math.PI/2;
      mesh(G.box,col(0xe8dfc8),0,0.17,0,0.025,0.34,0.025,flag);mesh(G.box,col(cc),0,0.29,0.065,0.035,0.12,0.15,flag);
      const s = addSolid(p.x - 0.25, p.z - 0.25, p.x + 0.25, p.z + 0.25, p.y, p.y + 1.0); return { g, p, s,flag,delivered:false }; });
    const give = () => { setLetterColor(COL[k][0]); letter = addItem('letter', P.pos.x, P.pos.y + 1.2, P.pos.z); letter.def = { ...letter.def, respawn: 0 }; ctx.give(letter); api.msg(`Письмо в ${COL[k][1]} ящик №${k + 1}`, 'good'); };
    give();
    const slot = i => new V3(boxes[i].p.x, boxes[i].p.y + 1.2, boxes[i].p.z);
    const deliver = () => { boxes[k].delivered=true;if (letter) { if (P.held === letter) P.held = null; letter.state = 'gone'; letter.g.visible = false; } sfx('pickup'); burst(boxes[k].p.x, boxes[k].p.y + 1.3, boxes[k].p.z, 8, { color: COL[k][0], size: 0.08, speed: 1.4 });
      k++; api.progress(k / 3); if (k >= 3) { sfx('done'); api.finish({ success: true, mult: 1 }); return; } give(); };
    return {
      botItems:()=>letter?[letter]:[],botTarget:()=>letter&&P.held!==letter?letter.pos:boxes[k]?.p,
      target: () => letter&&P.held!==letter?letter.pos:boxes[k] ? boxes[k].p : c,
      prompt: () => letter && P.held === letter && flat(P.pos, boxes[k].p) < 1.5 ? '<b>E</b>Опустить письмо' : '',
      interact() { if (!letter || P.held !== letter || flat(P.pos, boxes[k].p) > 1.5) return false; deliver(); return true; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false }); if (k >= 3) return;
        for(const box of boxes)box.flag.rotation.x+=((box.delivered?0:Math.PI/2)-box.flag.rotation.x)*(1-Math.exp(-dt*9));
        if (letter && (letter.state === 'fly' || letter.state === 'rest') && letter.pos.distanceTo(slot(k)) < 0.7) return deliver();
        // не в тот ящик — письмо отскакивает
        for (let i = 0; i < 3; i++) if (i !== k && letter && letter.state === 'fly' && letter.pos.distanceTo(slot(i)) < 0.6) { letter.vel.multiplyScalar(-0.4); api.msg('Не тот ящик!', 'bad'); }
        // A missing envelope is not evidence of delivery. Do not silently
        // create the next one or advance the mission without the player's
        // interaction with the correct mailbox.
        if(letter && letter.state==='gone'){
          api.msg('Письмо потеряно - доставка не засчитана','bad');
          return api.finish({success:false});
        }
      },
      stop() { for (const b of boxes) { W.group.remove(b.g); b.s.on = false; } if (letter && letter.state !== 'gone') { if (P.held === letter) P.held = null; letter.state = 'gone'; letter.g.visible = false; } },
    };
  },
  // 10. Металлоискатель: писк чаще рядом с кладом; E — копать (лишние ямы отнимают время)
  detector(o,api,ctx){
    api.feedback?.();const tune=CONFIG.detector,P=ctx.player;P.missionTool=true;const c=o.pos(),pts=[farFloor(c,3,12),farFloor(c,3,12),farFloor(c,3,12)],goal=pts[0],decoy=pts.slice(1),dug=new Set(),holes=[];
    let time=80,phase='search',digT=0,found=0,pulse=1,hint='',digAt=null,hole=null;
    const detector=new THREE.Group();detector.name='metal-detector';W.group.add(detector);
    detector.add(compose('detector32',a=>{const metal=tmat(T.metal()),dark=col(0x302a3a),rubber=tmat(T.cloth(0x554a40));a(G.cyl6,metal,0,-.29,.28,.021,.92,.021,-.66);a(G.cyl6,rubber,0,.03,0,.04,.24,.04,.18);a(G.box,dark,0,.08,.06,.22,.15,.19,-.25);a(G.box,tmat(T.sign('SCAN','#342c28','#d1b98b')),0,.16,.08,.14,.012,.085);a(G.cyl6,dark,0,.15,-.1,.065,.05,.065);a(G.torus,dark,0,-.66,.55,.19,.19,.10,Math.PI/2);a(G.box,dark,0,-.66,.55,.33,.025,.035);for(let i=0;i<5;i++)a(G.torus,rubber,0,-.16-i*.055,.15+i*.043,.024,.024,.024,-.66);}));
    // Никакого зелёного луча или подсветки клада: только локальная волна и звук.
    const meter=mesh(G.box,col(0xd9ad56),.055,.17,.08,.025,.012,.015,detector);
    const shovel=compose('digShovel32',a=>{a(G.cyl6,tmat(T.wood()),0,-.1,.08,.025,.64,.025,-.2);a(G.box,tmat(T.metal()),0,-.48,.15,.22,.25,.045,-.2);a(G.box,col(0x29232e),0,.25,0,.13,.04,.045);});shovel.name='detector-shovel';W.group.add(shovel);shovel.visible=false;
    const wave=ring(0xdfb265);wave.name='detector-wave';wave.visible=false;
    const find=()=>{if(flat(digAt,goal)<1.05){const ch=new THREE.Group();ch.position.copy(goal);W.group.add(ch);holes.push(ch);ch.add(compose('m5chest',a=>{a(G.box,tmat(T.wood()),0,.2,0,.6,.35,.4);a(G.box,col(0xd8a030),0,.2,.205,.1,.12,.02);a(G.box,glow(0xf5c542),0,.4,0,.5,.05,.3);}));burst(goal.x,goal.y+.5,goal.z,16,{color:0xf5c542,size:.12,speed:2.5,up:2});sfx('done');api.msg('КЛАД!','good');phase='found';found=1.3;return;}
      const d=decoy.find(q=>!dug.has(q)&&flat(digAt,q)<1.05);if(d){dug.add(d);const it=addItem('slipper',d.x,d.y+.4,d.z);it.def={...it.def,respawn:0};api.msg('Старый ботинок...','bad');}else{time-=4;api.msg('Пусто (-4 с)','bad');}phase='search';hint='';};
    api.msg('Слушай сигнал: чем чаще писк и круг, тем ближе. E - копать');
    return{get phase(){return phase;},botTarget:()=>goal,botStep(dt,brain){if(flat(P.pos,goal)<.8&&phase==='search'&&brain.ready(1))this.interact();},target:()=>null,prompt:()=>phase==='search'&&flat(P.pos,c)<16?'<b>E</b>Копать':'',
      interact(){if(phase!=='search'||flat(P.pos,c)>16)return false;phase='dig';digT=tune.digTime;digAt=P.pos.clone();const f=P.root.rotation.y;hole=mesh(G.disc,new THREE.MeshBasicMaterial({color:0x2a1e18}),digAt.x+Math.sin(f)*.48,digAt.y+.022,digAt.z+Math.cos(f)*.48,.08,.08,1,W.group);hole.rotation.x=-Math.PI/2;holes.push(hole);api.msg('Копаем...');return true;},
      update(dt){time-=dt;api.timer(time);if(time<=0)return api.finish({success:false});followHand(P,detector,Math.sin(time*4)*.07);detector.visible=phase==='search';shovel.visible=phase==='dig';
       if(phase==='dig'){digT-=dt;const k=1-digT/tune.digTime,stroke=Math.sin(k*Math.PI*4);followHand(P,shovel,-.45+stroke*.65);shovel.position.y-=Math.max(0,stroke)*.2;hole.scale.setScalar(.08+k*(tune.holeRadius-.08));if(stroke>.8&&random()<dt*30){puff(hole.position.x,hole.position.y+.08,hole.position.z,{color:0x60432d,size:.10,vx:(random()-.5)*2,vy:2.5,vz:(random()-.5)*2,g:9,life:.5});sfx('imp',{at:hole.position,m:'dirt',v:.3});}if(digT<=0){shovel.visible=false;find();}}
       if(phase==='found'){found-=dt;if(found<=0)return api.finish({success:true,mult:1});}
       const d=Math.min(...[goal,...decoy.filter(q=>!dug.has(q))].map(q=>flat(P.pos,q))),k=Math.max(0,Math.min(1,1-d/tune.range));const interval=tune.farPulse-k*(tune.farPulse-tune.nearPulse);pulse+=dt/interval;
       if(pulse>=1){pulse%=1;if(phase==='search')sfx('beep',{at:P.pos,range:10,p:k,v:.65});}
       wave.visible=phase==='search'&&P===W.player;const coil=detector.localToWorld(new V3(0,-.66,.55));wave.position.set(coil.x,P.pos.y+.035,coil.z);wave.scale.setScalar(.22+pulse*.95);wave.material.opacity=Math.sin(pulse*Math.PI)*(.22+k*.13);meter.scale.x=.3+k*.7;
       const next=d<1.05?'Сигнал прямо под ногами - E, копать':d<3?'Частый сигнал - совсем близко':d<6?'Сигнал усиливается':'Редкий сигнал - ищи ближе';if(phase==='search'&&next!==hint){hint=next;api.msg(next,d<1.05?'good':'');}api.progress(null);
      },stop(){P.missionTool=false;for(const g of [detector,shovel,wave,...holes])g.removeFromParent();wave.material.dispose();}
    };
  },
  // 11. Тележка: довези гору продуктов до машины; резко дёрнешь/врежешься — продукты падают (собери и закинь обратно)
  cart(o, api, ctx) {
    api.feedback?.();
    const P = ctx.player, c = o.pos(), yaw = o.g.rotation.y, st = new V3(c.x + Math.sin(yaw) * 1.4, c.y, c.z + Math.cos(yaw) * 1.4);
    const pc = addPushable({ X: v => v, Z: v => v, Y: c.y, g: W.group }, 'cart', st.x, st.z); pc.mesh.rotation.y = yaw;
    const goods = new THREE.Group(); goods.position.y = 0.95; pc.mesh.add(goods); const GD = ['tomato', 'can', 'banana', 'cucumber', 'parcel'], gm = [];
    const addGood = i => { const m = compose('m24good' + (i % 5), a => {const type=i%5,cc=[0xd8301a,0xd8243a,0xf5d442,0x3f8a2a,0xc8a070][type];
        if(type===0){a(G.sph,col(cc),0,0,0,0.11,0.09,0.1);a(G.box,col(0x3f8a2a),0,0.1,0,0.09,0.015,0.03);}
        else if(type===1){a(G.cyl8,tmat(T.metal()),0,0,0,0.07,0.19,0.07);a(G.cyl8,col(cc),0,0,0,0.072,0.13,0.072);}
        else if(type===2){for(let j=0;j<3;j++)a(G.box,col(cc),-0.07+j*0.06,j===1?-0.025:0.005,0,0.08,0.05,0.12,0,0,(j-1)*0.4);}
        else if(type===3)a(G.sph,col(cc),0,0,0,0.055,0.055,0.17);
        else{a(G.box,tmat(T.crate()),0,0,0,0.22,0.18,0.18);a(G.box,col(0xe8dfbd),0,0.094,0,0.05,0.01,0.18);}}); const slot=gm.length;m.position.set((slot%3-1)*.2,Math.floor(slot/3)*.17,(slot%2)*.15-.07);m.userData.cartType=GD[i%5];goods.add(m); gm.push(m); };
    for (let i = 0; i < 6; i++) addGood(i);
    const candidates=(W.cars||[]).filter(q=>Math.abs(q.y-c.y)<.5).map(q=>new V3(q.x-Math.cos(q.ry)*2.6,c.y,q.z+Math.sin(q.ry)*2.6)).filter(p=>flat(p,st)>=55&&flat(p,st)<=105&&isFree(p.x-.9,p.z-.9,p.x+.9,p.z+.9,p.y+.1,p.y+1.8));
    let dest=candidates.sort((a,b)=>Math.abs(flat(a,st)-75)-Math.abs(flat(b,st)-75))[0];for(let i=0;!dest&&i<24;i++){const p=farFloor(st,55,105);if(flat(p,st)>=50)dest=p;}
    if(!dest)dest=(W.spawns||[]).map(p=>new V3(p.x,p.y,p.z)).filter(p=>Math.abs(p.y-c.y)<.5&&flat(p,st)>=50).sort((a,b)=>flat(a,st)-flat(b,st))[0];if(!dest)dest=st.clone().add(new V3(55,0,0));
    const rg=ring(0x9be36b);rg.scale.setScalar(2.2);rg.position.set(dest.x,dest.y+.06,dest.z);const distance=flat(st,dest);let time=180,lost=[],cd=0,impact=pc.impactSeq||0;
    const putBack=it=>{if(!lost.includes(it)||it.state==='gone')return;const type=it.type;for(const a of [P,...W.bots])if(a.held===it)a.held=null;it.state='gone';it.g.visible=false;it.outline.set(false);if(it.ring){it.ring.removeFromParent();it.ring.material.dispose();it.ring=null;}addGood(Math.max(0,GD.indexOf(type)));sfx('pickup');};api.msg('Довези покупки к дальней машине. Сильный удар на скорости роняет продукты');
    return {
      botItems:()=>lost,botTarget:()=>P.held?new V3(pc.x,pc.y,pc.z):lost.find(it=>it.state==='rest')?.pos||new V3(pc.x,pc.y,pc.z).addScaledVector(new V3(pc.x-dest.x,0,pc.z-dest.z).normalize(),1.1),botStep(dt,brain){if(P.held&&flat(P.pos,pc)<1.5){const it=P.held;P.held=null;it.state='rest';it.pos.set(pc.x,pc.y+1,pc.z);}else if(!lost.length&&flat(P.pos,pc)<1.9){const dx=dest.x-pc.x,dz=dest.z-pc.z,d=Math.hypot(dx,dz)||1;pc.vx+=dx/d*dt*4;pc.vz+=dz/d*dt*4;}},
      prompt:()=>P.held&&lost.includes(P.held)&&flat(P.pos,pc)<1.8?'<b>E</b>Положить в корзину':'',
      interact(){if(P.held&&lost.includes(P.held)&&flat(P.pos,pc)<1.8){putBack(P.held);return true;}return false;},
      target: () => dest,
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false }); cd -= dt;
        if((pc.impactSeq||0)!==impact){impact=pc.impactSeq||0;if(cd<=0&&gm.length&&pc.impactSpeed>=7.5){cd=1;const count=pc.impactSpeed>=10?2:1;for(let i=0;i<count&&gm.length;i++){const m=gm.pop();goods.remove(m);const it=addItem(m.userData.cartType,pc.x,pc.y+1.1,pc.z);it.def={...it.def,respawn:0};it.mission=ctx.mission;it.cartAirT=.8;it.cartSpill=true;it.outline.set(true);it.ring=ring(0xf5c542);it.ring.scale.setScalar(.8);const a=Math.atan2(pc.vx,pc.vz)+(i?1:-1)*1.1;launch(it,it.pos.clone(),new V3(Math.sin(a)*3.5,3.8,Math.cos(a)*3.5));lost.push(it);}sfx('imp',{at:pc.mesh.position});api.msg('Удар! Верни покупки в корзину','bad');}}
        // упавшее — обратно в тележку (положить/закинуть рядом с корзиной)
        const wp = new V3(); pc.mesh.getWorldPosition(wp);
        for(const it of lost){const show=it.state!=='gone'&&it.state!=='held';it.outline.set(show);if(it.ring){it.ring.visible=show;it.ring.position.set(it.pos.x,it.pos.y-it.def.r+.035,it.pos.z);}it.cartAirT=Math.max(0,(it.cartAirT||0)-dt);if(it.state!=='gone'&&it.state!=='held'&&!it.cartAirT&&Math.hypot(it.pos.x-wp.x,it.pos.z-wp.z)<.65&&it.pos.y>wp.y+.5&&it.pos.y<wp.y+1.7)putBack(it);}
        lost = lost.filter(it => it.state !== 'gone');
        api.progress(Math.max(0, 1 - Math.hypot(wp.x - dest.x, wp.z - dest.z) / distance) * 0.8 + gm.length / 30);
        if(Math.hypot(wp.x-dest.x,wp.z-dest.z)<2.4){sfx('done');api.msg(`Довёз: ${gm.length} из 6`,'good');api.finish({success:true,mult:gm.length?gm.length/6:5/(ctx.mission?.pts||250)});}
      },
      stop(){W.group.remove(rg);for(const a of [P,...W.bots]){if(a.grab===pc)W.releaseCart?.(a);if(a.ride===pc)W.dismount?.(a,false);}const i=W.pushables.indexOf(pc);if(i>=0)W.pushables.splice(i,1);W.group.remove(pc.mesh);for(const it of lost){if(it.owner?.held===it)it.owner.held=null;it.outline.set(false);if(it.ring){it.ring.removeFromParent();it.ring.material.dispose();it.ring=null;}it.state='gone';it.g.visible=false;}},
    };
  },
  // 12. Фото призрака: призрак мелькает между могил — поймай его в центр кадра и жми E (вспышка)
  ghost(o,api,ctx){
    api.feedback?.();const P=ctx.player,c=o.pos(),cam=ctx.camera;let time=85,gt=1.2,show=0,base=null,shots=0,endT=0,cooldown=0,t=0,last=null,wasReady=false;const gs=mkGhost();gs.name='mission-ghost';gs.visible=false;
    P.missionTool=true;const heldCam=cameraModel();W.group.add(heldCam);
    const focus=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0xf5c542});focus.name='ghost-focus';focus.visible=false;W.group.add(focus);
    for(const sx of [-1,1])for(const sy of [-1,1]){mesh(G.box,mat,sx*.48,sy*.6,0,.2,.035,.025,focus);mesh(G.box,mat,sx*.56,sy*.52,0,.035,.2,.025,focus);}
    const framed=()=>{if(show<=0)return false;const v=gs.position.clone().sub(cam.position),d=v.length(),dir=cam.getWorldDirection(new V3());return d<20&&dir.dot(v.normalize())>.975&&los(cam.position,gs.position);};
    const disappear=()=>{show=0;gs.visible=false;focus.visible=false;gt=1.7+random()*1.8;};
    api.msg('Поймай призрака в зелёную рамку. ЛКМ - снимок (нужно 3)');
    return{get equipped(){return !P.held&&!P.holding&&!P.grab&&!P.heldBy;},toolName:'Фотокамера',toolIcon:'ghost',get toolAction(){return `Снять · ${shots}/3`;},get photos(){return shots;},get ghost(){return gs;},target:()=>null,prompt:()=>'',
      botStep(dt,brain){if(show>0){cam.position.copy(P.pos).y+=1.4;cam.lookAt(gs.position);cam.updateMatrixWorld(true);if(brain.ready(.8))this.down();}},
      down(){if(!this.equipped||P.stun>0||P.daze>0||cooldown>0||endT>0)return;cooldown=.65;sfx('shutter');W.flash?.(P.pos,0xffffff,.4);if(!framed()){api.msg(show>0?'Призрака в центр кадра!':'Жди появления призрака');return;}shots++;api.progress(shots/3);sfx('pickup');api.msg(`${shots}/3 - ${shots===3?'Все снимки готовы!':'Есть кадр! Ищи следующее появление'}`,'good');last=base?.clone();disappear();if(shots===3)endT=1.1;},
      update(dt){t+=dt;cooldown-=dt;heldCam.visible=this.equipped;P.missionTool=this.equipped;followHand(P,heldCam);if(endT>0){endT-=dt;if(endT<=0)api.finish({success:true,mult:1});return;}time-=dt;api.timer(time);if(time<=0)return api.finish({success:false});
       if(show>0){show-=dt;gs.position.copy(base).add(new V3(Math.sin(t*1.9)*.4,Math.sin(t*2.8)*.18,Math.cos(t*1.4)*.25));gs.material.opacity=Math.max(0,Math.min(.85,show*1.8,(4.2-show)*2));gs.rotation.z=Math.sin(t*2)*.08;if(show<=0)disappear();}
       else if((gt-=dt)<=0){let candidate=null;for(let i=0;i<16;i++){const q=farFloor(P.pos,4,13);q.y+=1.45;if((!last||q.distanceTo(last)>2)&&los(cam.position,q)){candidate=q;break;}}if(candidate){base=candidate;gs.position.copy(base);gs.visible=true;show=4.2;sfx('ghost',{at:base});}else gt=.6;}
       const ready=framed();focus.visible=show>0&&los(cam.position,gs.position);focus.position.copy(gs.position);focus.lookAt(cam.position);mat.color.setHex(ready?0x9be36b:0xf5c542);if(ready&&!wasReady)sfx('beep',{at:P.pos,v:.3});wasReady=ready;api.progress(shots/3);
      },stop(){P.missionTool=false;gs.removeFromParent();heldCam.removeFromParent();focus.removeFromParent();gs.material.dispose();mat.dispose();}
    };
  },
  // 14. Голубь: подкрадись (не беги!), E — схватить, неси в голубятню (E)
  pigeon(o, api, ctx) {
    api.feedback?.();
    const P = ctx.player, c = o.pos(), home = farFloor(c, 5, 10); let time = 80, got = false, fly = null, wt = 0, hop = 0;
    const g = new THREE.Group(); g.position.copy(home); W.group.add(g);
    g.add(compose('m5pigeon', a => { const gr = lam({ map: T.dogCoat(0x8a8aa0,0x4a4a60,0xb8b8c8,0) }, 'm24pg'), dk = col(0x4a4a60); a(G.sph, gr, 0, 0.18, 0, 0.13, 0.12, 0.2); a(G.sph, dk, 0, 0.32, 0.14, 0.08, 0.08, 0.08); a(G.box, col(0x6a8a6a), 0, 0.25, 0.12, 0.1, 0.06, 0.06);
      a(G.cone4, col(0xd8a030), 0, 0.31, 0.24, 0.02, 0.07, 0.02, Math.PI / 2); a(G.box, dk, 0, 0.2, -0.22, 0.12, 0.03, 0.12, 0.3); for (const sx of [-0.04, 0.04]) a(G.box, col(0xd8606a), sx, 0.04, 0, 0.015, 0.08, 0.015); }));
    const wings=[-1,1].map(sx=>{const p=new THREE.Group();p.position.set(sx*0.1,0.22,0);g.add(p);mesh(G.box,tmat(T.dogCoat(0x7a7a90,0x3a3a50,0xb8b8c8,0)),sx*0.07,0,-0.03,0.15,0.035,0.28,p);return p;});
    for(const sx of [-1,1])mesh(G.sph,col(0x17111f),sx*0.068,0.34,0.17,0.015,0.015,0.015,g);
    const wp = home.clone(); api.msg('Подкрадись к голубю - шагом и без шума');
    return {
      botSpeed:0.35,
      target: () => got ? o.front() : g.position,
      prompt: () => got ? (flat(P.pos, c) < 1.9 ? '<b>E</b>В голубятню' : '') : flat(P.pos, g.position) < 1.3 && !fly ? '<b>E</b>Схватить' : '',
      interact() {
        if (got) { if (flat(P.pos, c) > 1.9) return false; sfx('done'); api.finish({ success: true, mult: 1 }); return true; }
        if (flat(P.pos, g.position) > 1.3 || fly) return false; got = true; P.carryKitten=true; sfx('pickup'); api.msg('Попался! В голубятню его', 'good'); api.progress(0.6); return true; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false });
        wings.forEach((w,i)=>w.rotation.z=(i?-1:1)*(fly||got?Math.sin(time*32)*0.85:0.12));
        // Птица слышит настоящий микрофон, а также замечает пролетающие рядом вещи.
        const noisy=actors().some(a=>!a.hidden&&!a.drone&&los(a.pos.clone().add(new V3(0,1.2,0)),g.position.clone().add(new V3(0,.3,0)))&&((a.ch?.shout>.22&&flat(a.pos,g.position)<9)||(a.ch?.talk>.3&&flat(a.pos,g.position)<3.7)));
        const thrown=W.items.some(it=>{if(it.state!=='fly'||it.vel.length()<3)return false;const start=it.pos,end=start.clone().addScaledVector(it.vel,.18),v=end.clone().sub(start),k=Math.max(0,Math.min(1,g.position.clone().sub(start).dot(v)/(v.lengthSq()||1))),q=start.clone().addScaledVector(v,k);return q.distanceTo(g.position.clone().add(new V3(0,.3,0)))<1.8&&los(start,g.position.clone().add(new V3(0,.3,0)));});
        if (got) { cargoPosition(P,g.position,0.3);g.position.y-=0.16; g.rotation.y = P.root.rotation.y; if (P.stun > 0 || P.daze > 0 || P.heldBy || noisy || thrown) { got = false; P.carryKitten=false; api.msg(noisy?'Голос спугнул голубя - вырвался!':thrown?'Голубь испугался летящего предмета!':'Вырвался!', 'bad'); fly = { from: g.position.clone(), to: farFloor(P.pos, 4, 8), t: 0 }; } return; }
        const sp = Math.hypot(P.vel.x, P.vel.z), d = flat(P.pos, g.position);
        if (!fly && (noisy || thrown || (d < 4 && sp > 4.6) || d < 0.6)) { fly = { from: g.position.clone(), to: farFloor(g.position, 4, 8), t: 0 }; sfx('feather',{at:g.position}); api.msg(noisy?'Голубь услышал голос. Тише!':thrown?'Предмет спугнул голубя!':'Спугнул! Подкрадывайся тише', 'bad'); }
        if (fly) { fly.t += dt / 0.8; const k = Math.min(1, fly.t); g.position.lerpVectors(fly.from, fly.to, k); g.position.y += Math.sin(k * Math.PI) * 1.6; g.rotation.y = Math.atan2(fly.to.x - fly.from.x, fly.to.z - fly.from.z); if (k >= 1) { fly = null; wp.copy(g.position); } return; }
        // клюёт и семенит
        wt -= dt; if (wt <= 0) { wt = 1 + random() * 2; const a = random() * 6.28; wp.set(g.position.x + Math.cos(a) * 0.8, g.position.y, g.position.z + Math.sin(a) * 0.8); if (!isFree(wp.x - 0.15, wp.z - 0.15, wp.x + 0.15, wp.z + 0.15, wp.y + 0.05, wp.y + 0.4)) wp.copy(g.position); }
        const dx = wp.x - g.position.x, dz2 = wp.z - g.position.z, l = Math.hypot(dx, dz2); hop += dt * 10;
        if (l > 0.05) { g.position.x += dx / l * Math.min(l, dt * 0.7); g.position.z += dz2 / l * Math.min(l, dt * 0.7); g.rotation.y = Math.atan2(dx, dz2); g.position.y = wp.y + Math.abs(Math.sin(hop)) * 0.03; }
        g.children[0].rotation.x = l < 0.05 ? Math.max(0, Math.sin(hop * 0.5)) * 0.4 : 0;
        api.progress(Math.max(0, 0.5 - d / 20));
      },
      stop() { P.carryKitten=false;W.group.remove(g); },
    };
  },
};

/* ====================== панельные (камера встаёт к объекту) ====================== */
export const PANEL5 = {
  // 3. Бургеры: котлеты жарятся (низ темнеет). Клик — перевернуть; когда и второй бок готов — клик ещё раз, в булку. Нужно 3 хороших
  grill(o, api, ctx) {
    api.feedback?.();
    const s = o.spot, F = new V3(s.f[0], 0, s.f[1]), c0 = new V3(s.bx, s.by, s.bz);
    api.pose(c0.clone().addScaledVector(F, 0.85).add(new V3(0, 0.95, 0)), c0.clone().addScaledVector(F, -0.05));
    const grp = new THREE.Group(); grp.position.copy(c0); grp.rotation.y = Math.atan2(F.x, F.z); W.group.add(grp);
    grp.add(compose('m5grill', a => { a(G.box, col(0x2b2533), -0.15, 0.02, 0, 0.62, 0.04, 0.36); for (let i = 0; i < 7; i++) a(G.box, col(0x6a6d78), -0.15, 0.045, -0.15 + i * 0.05, 0.6, 0.01, 0.012); a(G.box, glow(0xff6a1a), -0.15, 0.03, 0, 0.56, 0.005, 0.3);
      a(G.box, tmat(T.wood()), 0.36, 0.02, 0, 0.3, 0.03, 0.34); }));
    const RAW = new THREE.Color(0xd87a7a), DONE = new THREE.Color(0x8a4a2a), BURN = new THREE.Color(0x1e1410), tmp = new THREE.Color();
    const shade = (k, m) => { if (k < 3.5) tmp.copy(RAW).lerp(DONE, k / 3.5); else if (k < 6.5) tmp.copy(DONE); else tmp.copy(DONE).lerp(BURN, Math.min(1, (k - 6.5) / 1.5)); m.color.copy(tmp); };
    const P3 = [-0.33, -0.15, 0.03].map((x, i) => { const g = new THREE.Group(); g.position.set(x, 0.07, 0); grp.add(g); const top = mesh(G.cyl12, lam({ color: 0xd87a7a }), 0, 0.015, 0, 0.075, 0.03, 0.075, g), bot = mesh(G.cyl12, lam({ color: 0xd87a7a }), 0, -0.012, 0, 0.076, 0.026, 0.076, g);
      top.userData.i = bot.userData.i = i; return { g, top, bot, a: 0, b: 0, flips: 0, flipT: 0, dead: 0 }; });
    const spatula=compose('m24spatula',a=>{a(G.box,col(0x3a2418),0,0,0.13,0.035,0.035,0.18);a(G.box,tmat(T.metal()),0,-0.01,-0.02,0.12,0.014,0.14);for(const x of [-0.035,0,0.035])a(G.box,col(0x2a2232),x,0,-0.02,0.008,0.003,0.09);});grp.add(spatula);toolHand(ctx,spatula,0,0,0.2);spatula.visible=false;
    for(const p of P3)for(const x of [-0.035,0,0.035])mesh(G.box,col(0x5a3020),x,0.032,0,0.008,0.003,0.09,p.g);
    let good = 0, endT = -1, buns = 0;
    const reset = p => { p.a = 0; p.b = 0; p.flips = 0; p.g.visible = true; p.g.position.y = 0.07; p.g.rotation.x = 0; };
    const bun = () => { const b = new THREE.Group(); b.position.set(0.36, 0.04, -0.1 + buns * 0.1); grp.add(b); b.add(compose('m5bun', a => { a(G.cyl12, col(0xe8a050), 0, 0.012, 0, 0.07, 0.024, 0.07); a(G.cyl12, col(0x6a3a1e), 0, 0.034, 0, 0.068, 0.02, 0.068); a(G.cyl12, col(0x6aa84f), 0, 0.048, 0, 0.072, 0.006, 0.072); a(G.sph10, col(0xe8a050), 0, 0.055, 0, 0.07, 0.04, 0.07); })); for(let i=0;i<5;i++)mesh(G.box,col(0xf1dfaa),Math.sin(i*2.4)*0.04,0.088,Math.cos(i*2.4)*0.035,0.009,0.004,0.005,b);buns++; };
    api.progress(0); api.msg('Клик по котлете — перевернуть. Обе стороны готовы — клик, в булку');
    return {
      botStep(dt, brain) { if(!brain.ready(0.35)||endT>0)return;const p=P3.find(p=>p.dead<=0&&p.flipT<=0&&((p.flips===0&&p.b>=3.4)||(p.flips>0&&p.a>=3.3&&p.b>=3.3)));if(p)this.down(brain.hit(p.top)); },
      down(ray) { if (endT > 0) return; const h = ray.intersectObjects(P3.flatMap(p => [p.top, p.bot]), false)[0]; if (!h) return; const p = P3[h.object.userData.i]; if (p.flipT > 0 || p.dead > 0) return;
        if (p.flips === 0) { p.flips = 1; p.flipT = 0.35; [p.a, p.b] = [p.b, p.a]; sfx('hiss'); return; }
        // подать: обе стороны прожарены и не сгорели
        const ok = p.a >= 3.2 && p.b >= 3.2 && p.a < 6.5 && p.b < 6.5; sfx(ok ? 'pickup' : 'bonk');
        if (ok) { good++; bun(); api.progress(good / 3); api.msg(`Бургер ${good}/3!`, 'good'); if (good >= 3) { endT = 1; sfx('done'); } } else api.msg(p.a < 3.2 || p.b < 3.2 ? 'Сырая!' : 'Сгорела!', 'bad');
        reset(p); },
      update(dt) {
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); }
        spatula.visible=false;for (const p of P3) { if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) reset(p); continue; }
          p.b += dt; shade(p.b, p.bot.material); shade(p.a, p.top.material);
          if (p.flipT > 0) { p.flipT -= dt; const k = 1 - p.flipT / 0.35; spatula.visible=true;spatula.position.set(p.g.position.x,0.04+Math.sin(k*Math.PI)*0.08,0.1);spatula.rotation.x=-Math.sin(k*Math.PI)*0.5; p.g.position.y = 0.07 + Math.sin(k * Math.PI) * 0.12; p.g.rotation.x = k * Math.PI; if (p.flipT <= 0) p.g.rotation.x = 0; }
          if (random() < dt * (p.b > 6.5 ? 14 : 3)) { const w = new V3(); p.g.getWorldPosition(w); puff(w.x, w.y + 0.05, w.z, { color: p.b > 6.5 ? 0x2a2230 : 0xd8d0e4, size: 0.06, vy: 0.6, life: 0.6 }); }
          if (p.b > 8.5) { p.dead = 1; p.g.visible = false; api.msg('Сгорела! Новая котлета', 'bad'); sfx('bonk'); } }
      },
      stop() { W.group.remove(grp); },
    };
  },
  // Стрелка и смотровая трубка показывают именно залитое топливо (0-10 л).
  fuel(o, api, ctx) {
    api.feedback?.();
    const c=o.pos(),yaw=o.g.rotation.y,F=new V3(Math.sin(yaw),0,Math.cos(yaw));
    const grp=new THREE.Group();grp.name='mission-fuel';grp.position.copy(c);grp.rotation.y=yaw;W.group.add(grp);
    const local=(x,y,z)=>new V3(x,y,z).applyAxisAngle(new V3(0,1,0),yaw).add(c);
    api.pose(local(-0.05,1.75,2.45),local(-0.18,0.98,0.06));
    const faceTex=pix('fuelDial26',64,64,g=>{
      g.fillStyle='#d8cfb5';g.fillRect(0,0,64,64);g.fillStyle='#292331';g.beginPath();g.arc(32,34,30,0,7);g.fill();
      g.strokeStyle='#e8dfc8';g.lineWidth=2;for(let i=0;i<=10;i++){const a=Math.PI+i*Math.PI/10;g.beginPath();g.moveTo(32+Math.cos(a)*24,34+Math.sin(a)*24);g.lineTo(32+Math.cos(a)*(i%5?20:17),34+Math.sin(a)*(i%5?20:17));g.stroke();}
      g.fillStyle='#eee5cd';g.font='bold 9px monospace';g.textAlign='center';g.fillText('0',10,43);g.fillText('5',32,19);g.fillText('10',53,43);g.font='bold 7px monospace';g.fillText('ТОПЛИВО',32,55);
    });
    mesh(G.plane,new THREE.MeshBasicMaterial({map:faceTex}),0.2,0.62,0.398,0.42,0.42,1,grp);
    const fuel=mesh(G.box,col(0xd8a030),-0.49,0.3,0.42,0.055,0.002,0.012,grp);
    const cv=document.createElement('canvas');cv.width=96;cv.height=24;const g=cv.getContext('2d'),tx=new THREE.CanvasTexture(cv);tx.magFilter=tx.minFilter=THREE.NearestFilter;tx.generateMipmaps=false;
    const readMat=new THREE.MeshBasicMaterial({map:tx});mesh(G.plane,readMat,0.08,0.23,0.401,0.84,0.21,1,grp);
    const pour=new THREE.Group();pour.position.set(-0.65,1.5,0.18);grp.add(pour);
    pour.add(compose('fuelCan26',a=>{const m=lam({map:T.paintMetal(0xb88a32)},'fuelCan26');a(G.box,m,0,0,0,0.34,0.48,0.24);
      for(const x of [-0.095,0.095])a(G.box,m,x,0.29,0,0.045,0.14,0.08);a(G.box,m,0,0.36,0,0.23,0.04,0.08);
      a(G.cyl8,tmat(T.metal()),0.22,0.17,0,0.035,0.27,0.035,0,0,-Math.PI/2);a(G.box,col(0x17111f),0.36,0.17,0,0.012,0.045,0.045);
      a(G.box,col(0x292331),0,-0.03,0.127,0.12,0.35,0.014);a(G.box,col(0xd8cfb5),0,-0.03,0.137,0.075,0.3,0.008);
      a(G.box,tmat(T.sign('10 Л','#a57a2a','#17111f')),0,-0.13,-0.125,0.25,0.1,0.012);
    }));toolHand(ctx,pour,0,0.35,0);
    const remaining=mesh(G.box,col(0xe8ac28),0,-0.03,0.144,0.06,0.3,0.008,pour);
    const stream=mesh(G.cyl6,col(0xd8ae50),0,0,0,0.017,1,0.017,grp);stream.visible=false;
    const mouth=new V3(-0.35,0.94,0),tip=new V3(),delta=new V3(),up=new V3(0,1,0);
    const hint='ЛКМ - наливать · отпусти - остановить. Бак: 10 литров.';
    let fill=0,hold=false,tilt=0,endT=-1,last=-1,sound=0;
    const draw=()=>{const tenth=Math.round(fill*100);if(tenth===last)return;last=tenth;g.fillStyle='#17111f';g.fillRect(0,0,96,24);g.strokeStyle='#8a806a';g.strokeRect(0.5,0.5,95,23);g.fillStyle='#f5c542';g.font='bold 14px monospace';g.textAlign='center';g.fillText((fill*10).toFixed(1)+' / 10 Л',48,17);tx.needsUpdate=true;};draw();api.progress(0);api.msg('Держи ЛКМ - топливо льётся из канистры в бак');
    return {
      hint,
      botStep(dt,brain){hold=endT<0;brain.workPoint=pour.localToWorld(new V3(0,0.35,0));},
      down(){if(endT<0)hold=true;},up(){hold=false;},
      update(dt){
        tilt+=((hold?-1.03:0)-tilt)*Math.min(1,dt*9);pour.rotation.z=tilt;
        const flowing=hold&&tilt<-0.7&&fill<1&&endT<0;stream.visible=flowing;
        if(flowing){fill=Math.min(1,fill+dt*0.125);sound-=dt;if(sound<=0){sound=0.5;sfx('water',{at:c,v:0.3});}}
        // Концы струи вычисляются от реального носика до горловины в одной системе координат.
        pour.updateMatrix();tip.set(0.36,0.17,0).applyMatrix4(pour.matrix);delta.subVectors(mouth,tip);stream.position.copy(tip).addScaledVector(delta,0.5);stream.quaternion.setFromUnitVectors(up,delta.clone().normalize());stream.scale.y=delta.length();
        fuel.scale.y=Math.max(0.002,0.44*fill);fuel.position.y=0.3+0.22*fill;
        remaining.scale.y=Math.max(0.002,0.3*(1-fill));remaining.position.y=-0.18+0.15*(1-fill);
        o.needle.rotation.z=Math.PI/2-fill*Math.PI;draw();api.progress(fill);
        if(fill>=1&&endT<0){hold=false;endT=1.2;api.msg('10 из 10 л - бак полон!','good');sfx('done');for(let i=0;i<o.bulbs.length;i++){o.bulbs[i].material.emissive.setHex([0xff5a6e,0xf5c542,0x9be36b,0x4ab0f0][i%4]);o.bulbs[i].material.emissiveIntensity=1;}W.flash?.(c,0xffd8a0,0.5);}
        if(endT>0){endT-=dt;if(endT<=0)api.finish({success:true,mult:1});}
      },
      stop(){grp.traverse(m=>{if(m.isMesh&&m.material.map===faceTex)m.material.dispose();});grp.removeFromParent();readMat.dispose();tx.dispose();if(fill<1)o.needle.rotation.z=Math.PI/2;},
    };
  },
  // 5. Колокола: призрак звонит по порядку — повтори кликами (камешек летит в колокол). 3 раунда, 3 ошибки — провал
  bells(o, api) {
    api.feedback?.();
    const c = o.pos(), yaw = o.g.rotation.y, F = new V3(Math.sin(yaw), 0, Math.cos(yaw));
    api.pose(c.clone().addScaledVector(F, 3.6).add(new V3(0, 1.6, 0)), c.clone().add(new V3(0, 2.0, 0)));
    const gs = mkGhost(); gs.position.copy(c).add(new V3(0, 3.1, 0.3)); let round = 0, seq = [], shown = 0, showT = 1.2, mode = 'show', inp = 0, errs = 0, endT = -1, pebbles = [];
    const ring2 = i => { const b = o.bells[i]; b.sw = 1; const w = new V3(); b.b.getWorldPosition(w);sfx('bellN',{n:i,at:w,range:17,v:.65}); burst(w.x, w.y - 0.2, w.z, 5, { color: 0xf5c542, size: 0.06, speed: 1 }); };
    const next = () => { round++; seq = []; for (let i = 0; i < round + 2; i++) seq.push((random() * 4) | 0); shown = 0; showT = 1.0; mode = 'show'; inp = 0; api.msg(`Раунд ${round}: смотри и слушай`); };
    next();
    return {
      botStep(dt, brain) { if(mode==='input'&&endT<0&&inp<seq.length&&brain.ready(0.7))this.down(brain.hit(o.bells[seq[inp]].b)); },
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
  // Три этапа с пиксельной маской прямо на кузове: вода, губка с пеной, чистый смыв.
  carwash(o, api, ctx) {
    api.feedback?.();
    const car=o.spot.car,side=new V3(o.spot.x-car.x,0,o.spot.z-car.z).normalize(),along=new V3(side.z,0,-side.x);
    const center=new V3(car.x,car.y+0.69,car.z).addScaledVector(side,0.907),width=(car.L||3.9)-0.35,height=0.5,CW=72,CH=12;
    api.pose(new V3(car.x,car.y+0.8,car.z).addScaledVector(side,4).add(new V3(0,0.9,0)),new V3(car.x,car.y+0.78,car.z));ctx?.cursor(true);
    const cv=document.createElement('canvas');cv.width=CW;cv.height=CH;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    const geo=new THREE.PlaneGeometry(width,height),layer=mesh(geo,mat,center.x,center.y,center.z,1,1,1,W.group);layer.lookAt(center.clone().add(side));
    const mask=Array.from({length:CW*CH},(_,i)=>{const x=i%CW,y=Math.floor(i/CW);return (x>3&&x<CW-4&&y>0&&y<CH-1&&random()<0.87)?1:0}),amount=new Float32Array(mask.length);let count=mask.reduce((a,b)=>a+b,0);
    const sponge=compose('m24sponge',a=>{a(G.box,tmat(T.foam()),0,0,0,0.32,0.17,0.13);a(G.box,col(0xe8bd40),0,0,0.06,0.31,0.15,0.03);for(const [x,y]of[[-0.09,0.04],[0.04,-0.03],[0.1,0.02]])a(G.box,col(0x9a7a2a),x,y,0.079,0.025,0.018,0.006);});W.group.add(sponge);
    const nozzle=compose('m24hose',a=>{a(G.cyl8,col(0x4a6a4a),0,-0.12,0,0.035,0.28,0.035);a(G.cyl8,tmat(T.metal()),0,0,0.06,0.055,0.22,0.055,Math.PI/2);a(G.box,col(0xd8a030),0.06,-0.05,0.02,0.04,0.1,0.1);});W.group.add(nozzle);
    const waterMat=new THREE.MeshBasicMaterial({color:0x9ccbec,transparent:true,opacity:0.65,depthWrite:false}),stream=mesh(G.box,waterMat,0,0,0,0.025,0.025,0.35,W.group);
    toolHand(ctx,sponge,0,0,0.14);toolHand(ctx,nozzle,0,-0.12,-0.03);
    let stage=0,down=false,hit=null,endT=-1,fxT=0,stroke=null;
    const title=['1/3 · Вода: смой рыхлую грязь','2/3 · Губка: напень весь борт','3/3 · Вода: смой всю пену'];api.msg(title[0]);api.progress(0);
    const draw=()=>{g.clearRect(0,0,CW,CH);for(let i=0;i<mask.length;i++){if(!mask[i])continue;const x=i%CW,y=(i/CW)|0,a=amount[i];
      if(stage===0){g.fillStyle=`rgba(${i%3?74:102},${i%3?55:72},35,${0.38+(1-a)*0.62})`;g.fillRect(x,y,1,1);}
      else if(stage===1){g.fillStyle='rgba(78,63,42,.4)';g.fillRect(x,y,1,1);if(a>0){g.fillStyle=i%5?'#f1f0ff':'#a8c8dc';g.globalAlpha=a;g.fillRect(x,y,1,1);g.globalAlpha=1;}}
      else if(a<1){g.fillStyle=i%5?'#f1f0ff':'#a8c8dc';g.globalAlpha=1-a;g.fillRect(x,y,1,1);g.globalAlpha=1;}}
      tex.needsUpdate=true;};draw();
    const track=ray=>{const p=onPlane(ray,side,center);hit=p&&Math.abs(p.clone().sub(center).dot(along))<width/2+0.2&&Math.abs(p.y-center.y)<height/2+0.2?p:null;};
    return{
      botStep(dt, brain) { if(endT>0)return;const i=mask.findIndex((v,i)=>v&&amount[i]<1);if(i<0)return;hit=center.clone().addScaledVector(along,((i%CW+.5)/CW-.5)*width);hit.y+= (.5-((i/CW|0)+.5)/CH)*height;down=true;stroke=hit.clone().addScaledVector(along,0.04);brain.workPoint=hit.clone(); },
      down(ray){down=true;track(ray);},up(){down=false;stroke=null;},move(ray){track(ray);},
      update(dt){
        if(endT>0){endT-=dt;if(endT<=0)api.finish({success:true,mult:1});return;}
        const p=hit||center;const tool=stage===1?sponge:nozzle;sponge.visible=stage===1;nozzle.visible=stage!==1;tool.position.copy(p).addScaledVector(side,stage===1?0.09:0.5);tool.lookAt(p.clone().add(side));stream.visible=down&&!!hit&&stage!==1;
        if(!down||!hit)return;
        const moved=stroke?stroke.distanceTo(hit):0.1;stroke=hit.clone();const rate=stage===1?Math.min(0.55,moved*7):dt*2.4;
        const u=hit.clone().sub(center).dot(along)/width+0.5,v=0.5-(hit.y-center.y)/height,r=stage===1?0.19:0.24;let sum=0;
        for(let i=0;i<mask.length;i++){if(!mask[i])continue;const dx=((i%CW+0.5)/CW-u)*width,dy=(((i/CW)|0)+0.5)/CH-v;if(Math.hypot(dx,dy*height)<r)amount[i]=Math.min(1,amount[i]+rate);sum+=amount[i];}
        draw();const k=sum/count;api.progress((stage+k)/3);
        stream.position.copy(hit).addScaledVector(side,0.24);stream.lookAt(hit);fxT-=dt;
        if(fxT<=0){fxT=0.065;sfx(stage===1?'step':'spray',{v:0.18});burst(hit.x,hit.y,hit.z,2,{color:stage===1?0xf1f0ff:0x9ccbec,size:0.035,speed:0.5,up:0.2,g:4,life:0.35});}
        if(k>0.96){stage++;down=false;stroke=null;if(stage===3){layer.visible=false;stream.visible=false;endT=1;sfx('done');api.progress(1);api.msg('Чисто! Грязь и пена смыты','good');}else{amount.fill(0);draw();api.msg(title[stage],'good');sfx('water');}}
      },
      stop(){W.group.remove(layer,sponge,nozzle,stream);geo.dispose();mat.dispose();tex.dispose();waterMat.dispose();ctx?.cursor(true);},
    };
  },
  // 13. Антенна: тяни мышью — тарелка поворачивается; лампочки и ТВ показывают сигнал; удержи максимум 1.5 с
  antenna(o, api) {
    api.feedback?.();
    const A = o.ant, c = o.pos(), yaw = o.g.rotation.y, F = new V3(Math.sin(yaw), 0, Math.cos(yaw)), R = new V3(F.z, 0, -F.x);
    api.pose(c.clone().addScaledVector(F, 2.3).addScaledVector(R, 0.45).add(new V3(0, 1.75, 0)), c.clone().addScaledVector(R, 0.45).add(new V3(0, 1.0, 0)));
    const ty = (random() - 0.5) * 2.2, tp = 0.15 + random() * 0.5; let hy = (random() < 0.5 ? -1 : 1) * 1.2, hp = 0.9, drag = false, last = null, good = 0, endT = -1, nt = 0;
    const g = A.tvc.getContext('2d'); api.progress(0); api.msg('Тяни мышью — крути тарелку, лови сигнал');
    const signal = () => Math.max(0, 1 - Math.hypot(hy - ty, (hp - tp) * 1.4) / 1.4);
    return {
      botStep(dt, brain) { hy+=(ty-hy)*Math.min(1,dt*0.65);hp+=(tp-hp)*Math.min(1,dt*0.65); },
      down(ray) { drag = true; last = { x: ray.ray.direction.x, y: ray.ray.direction.y, z: ray.ray.direction.z }; }, up() { drag = false; },
      move(ray) { if (!drag || endT > 0) return; const d = ray.ray.direction, dx = (d.x - last.x) * R.x + (d.z - last.z) * R.z, dy = d.y - last.y; last = { x: d.x, y: d.y, z: d.z };
        hy = Math.max(-1.6, Math.min(1.6, hy + dx * 4)); hp = Math.max(-0.2, Math.min(1.1, hp + dy * 4)); if (random() < 0.3) sfx('tick'); },
      update(dt) {
        A.head.rotation.set(-hp, hy, 0); const s = signal(); A.leds.forEach((l, i) => l.material.emissive.setHex(s > (i + 0.5) / 5.5 ? (i < 2 ? 0xd8243a : i < 4 ? 0xf5c542 : 0x9be36b) : 0x000000));
        nt -= dt; if (nt <= 0) { nt = 0.08; const id = g.createImageData(32, 24); for (let i = 0; i < id.data.length; i += 4) { const v = random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0);
          g.globalAlpha = s; g.fillStyle = '#4ab0f0'; g.fillRect(0, 0, 32, 24); g.fillStyle = '#ff8a1f'; g.beginPath(); g.arc(16, 12, 7, 0, 7); g.fill(); g.fillStyle = '#17111f'; g.fillRect(12, 9, 2, 2); g.fillRect(18, 9, 2, 2); g.fillRect(13, 14, 6, 2); g.globalAlpha = 1; A.tvt.needsUpdate = true; }
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); return; }
        if (s > 0.9) { good += dt; if (good > 1.5) { endT = 1; sfx('done'); api.msg('Картинка есть! Бабушка довольна', 'good'); } } else good = Math.max(0, good - dt);
        api.progress(Math.max(s * 0.7, good / 1.5));
      },
      stop() { A.head.rotation.set(0, 0, 0); },
    };
  },
};
