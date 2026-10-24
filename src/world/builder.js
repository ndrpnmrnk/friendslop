import { THREE, G, V3, mesh, col, tmat, glow, basic, own, alphaMat, lam, flat, paint, compose } from '../core/gfx.js';
import { T, facade, rep } from '../core/textures.js';
import { rand, range, pick } from '../core/rng.js';
import { HW, SEASON } from '../config.js';
import { W } from './state.js';
import { addSolid, addZone } from './physics.js';
import { addItem } from '../game/items.js';
import { addBirds } from './birds.js';
import { addOutline } from '../game/outline.js';
import { addPushable } from './pushables.js';
import { TIRE_GEO } from './props.js';
import { addSwinger } from './swingers.js';
import { brickWall, breakBox, breakModel, addPiece, breakPiece, glassMat } from './breakables.js';
import { PropMethods, crateModel } from './props.js';
import { TowerMethods } from './tower.js';
import { OpenMethods } from './openables.js';
import { MoreMethods } from './more.js';

/* Конструктор района. Все координаты — локальные (0..32), высота от уровня тротуара.
   Районы описываются вызовами этих методов в своих файлах в world/districts. */
export class Builder {
  constructor(ox, oz, Y, district) {
    this.ox = ox; this.oz = oz; this.Y = Y; this.d = district; this.g = W.group;
  }
  X(x) { return this.ox + x; } Z(z) { return this.oz + z; }
  m(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) { return mesh(geo, mat, this.X(x), this.Y + y, this.Z(z), sx, sy, sz, this.g); }
  solid(x, z, w, d, y0, h) { return addSolid(this.X(x - w / 2), this.Z(z - d / 2), this.X(x + w / 2), this.Z(z + d / 2), this.Y + y0, this.Y + y0 + h); }
  // Коробка: ry кратен 90°, тогда коллизия поворачивается вместе с ней
  box(x, z, w, d, h, mat, o = {}) {
    const y = o.y || 0;
    if (o.fade) { mat = own({ color: mat.color ? mat.color.getHex() : 0xffffff, map: mat.map || null }); W.occluders.push({ mats: [mat], boxes: [this.aabb(x, z, w, d, y, h)], op: 1, inside: null }); }
    const m = this.m(G.box, mat, x, y + h / 2, z, w, h, d);
    const q = Math.round((o.ry || 0) / (Math.PI / 2)) % 2 !== 0;
    if (o.ry) m.rotation.y = o.ry;
    if (o.solid !== false) this.solid(x, z, q ? d : w, q ? w : d, y, h);
    return m;
  }
  ground(x0, z0, x1, z1, tex, tile = 3, y = 0.01) {
    const w = x1 - x0, d = z1 - z0, m = this.m(G.plane, flat(rep(tex, w / tile, d / tile)), (x0 + x1) / 2, y, (z0 + z1) / 2, w, d, 1);
    m.rotation.x = -Math.PI / 2; return m;
  }
  marking(x, z, w, d, color = 0xe5ddcf) {
    const m = this.m(G.plane, paint(color), x, 0.03, z, w, d, 1); m.rotation.x = -Math.PI / 2; return m;
  }
  prop(x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(this.X(x), this.Y, this.Z(z)); g.rotation.y = ry; this.g.add(g); return g;
  }
  zone(type, x0, z0, x1, z1, y = 0) { W.missionZones.push({ type, x0: this.X(x0), z0: this.Z(z0), x1: this.X(x1), z1: this.Z(z1), y: this.Y + y, district: this.d }); }
  spawn(x, z) { W.spawns.push({ x: this.X(x), z: this.Z(z), y: this.Y }); }
  cats(x0, z0, x1, z1) { W.catHomes.push({ x0: this.X(x0), z0: this.Z(z0), x1: this.X(x1), z1: this.Z(z1), y: this.Y, district: this.d }); }
  item(type, x, z, y = 0, ry = 0) { return addItem(type, this.X(x), this.Y + y, this.Z(z), ry); }
  birds(kind, x0, z0, x1, z1, n) { addBirds(kind, { x0: this.X(x0), z0: this.Z(z0), x1: this.X(x1), z1: this.Z(z1), y: this.Y }, n); }
  hw(fn) { if (HW) fn(); }

  /* ---------- свет и эффекты ---------- */
  light(x, z, r = 3, y = 0, dim = false) {
    const m = this.m(G.plane, dim ? LIGHTDIM() : LIGHTMAT(), x, y + 0.03, z, r * 2, r * 2, 1); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m;
  }
  // вода: тёмная толща + бегущие блики + пена у берега
  water(x, z, r, y = 0, fish = true) {
    const m = this.m(G.cyl12, WATERMAT(), x, y + 0.06, z, r, 0.04, r);
    const hi = this.m(new THREE.CircleGeometry(1, 24), WATERHI(), x, y + 0.09, z, r, r, 1); hi.rotation.x = -Math.PI / 2;
    const fm = this.m(new THREE.RingGeometry(0.88, 1, 28, 1), FOAM(), x, y + 0.1, z, r, r, 1); fm.rotation.x = -Math.PI / 2;
    addZone('water', { c: [this.X(x), this.Z(z), r] }, this.Y + y);
    if (fish && r >= 2.5) for (const a of (Array.isArray(fish) ? fish : [0.15, 0.8, 2.45, 5.75])) { const dx = Math.cos(a), dz = Math.sin(a);
      W.spots.fish.push({ x: this.X(x + dx * (r + 0.8)), z: this.Z(z + dz * (r + 0.8)), y: this.Y + y, f: [-dx, -dz], wx: this.X(x + dx * (r - 1.4)), wz: this.Z(z + dz * (r - 1.4)), wy: this.Y + y + 0.08, cx: this.X(x), cz: this.Z(z), R: r, district: this.d, label: 'у воды' }); }
    return m;
  }
  waterRect(x0, z0, x1, z1, y = 0, foam = true) {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const m = this.m(G.box, WATERMAT(), cx, y + 0.06, cz, w, 0.04, d);
    const hm = WATERHI(), hi = this.m(G.plane, hm, cx, y + 0.09, cz, w, d, 1); hi.rotation.x = -Math.PI / 2;
    hi.geometry = G.plane.clone(); const uv = hi.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4, uv.getY(i) * d / 4);
    if (foam) for (const [fx, fz, fw, fd, rz] of [[cx, z0 + 0.15, w, 0.3, 0], [cx, z1 - 0.15, w, 0.3, Math.PI], [x0 + 0.15, cz, d, 0.3, Math.PI / 2], [x1 - 0.15, cz, d, 0.3, -Math.PI / 2]]) {
      const f = this.m(G.plane, FOAM(), fx, y + 0.1, fz, fw, fd, 1); f.rotation.x = -Math.PI / 2; f.rotation.z = rz; }
    addZone('water', { r: [this.X(x0), this.Z(z0), this.X(x1), this.Z(z1)] }, this.Y + y);
    return m;
  }
  // Батут: прямоугольник, на который приземлишься — подбросит вверх
  bouncer(x0, z0, x1, z1, y, power = 10) { W.bouncers.push({ x0: this.X(Math.min(x0, x1)), z0: this.Z(Math.min(z0, z1)), x1: this.X(Math.max(x0, x1)), z1: this.Z(Math.max(z0, z1)), y: this.Y + y, power }); }
  // Старый матрас у стены — пружинит
  mattress(x, z, ry = 0) {
    const g = this.prop(x, z, ry), m = new THREE.Mesh(G.box, [col(0xb8a8c8), col(0xb8a8c8), tmat(T.carpet(0xd8d0e0)), col(0x8a7a9a), col(0xb8a8c8), col(0xb8a8c8)]); m.position.y = 0.17; m.scale.set(1.0, 0.34, 1.9); g.add(m);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 1.9 : 1.0, q ? 1.0 : 1.9, 0, 0.34); this.bouncer(x - (q ? 0.95 : 0.5), z - (q ? 0.5 : 0.95), x + (q ? 0.95 : 0.5), z + (q ? 0.5 : 0.95), 0.34, 10);
  }
  // Надувная тыква-батут
  bouncyPumpkin(x, z, r = 1.6) {
    const pm = this.m(G.sph10, lam({ map: T.pumpkin(), emissive: 0x3a1a00 }, 'bouncyP'), x, 0.55, z, r, 0.6, r); pm.rotation.y = rand() * 3;
    this.m(G.cyl6, col(0x3f6b2a), x, 1.2, z, 0.12, 0.2, 0.12);
    this.solid(x, z, r * 1.3, r * 1.3, 0, 1.0); this.bouncer(x - r * 0.65, z - r * 0.65, x + r * 0.65, z + r * 0.65, 1.0, 12);
  }
  // Стелющийся туман: два прозрачных слоя с бегущим шумом
  mist(x0, z0, x1, z1, y = 0) {
    for (const [hy, op, k] of [[0.25, 0.45, 1], [0.7, 0.3, 1.6]]) { const w = x1 - x0, d = z1 - z0;
      const m = this.m(G.plane, mistMat(op), (x0 + x1) / 2, y + hy, (z0 + z1) / 2, w, d, 1); m.rotation.x = -Math.PI / 2;
      m.geometry = G.plane.clone(); const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / (8 * k), uv.getY(i) * d / (8 * k)); m.renderOrder = 3; W.keep.push(m); }
  }
  slip(x, z, r) {
    const m = this.m(G.plane, alphaMat(T.splat('#120c18'), { opacity: 0.85 }), x, 0.025, z, r * 2.2, r * 2.2, 1); m.rotation.x = -Math.PI / 2; m.rotation.z = rand() * 6;
    addZone('oil', { c: [this.X(x), this.Z(z), r] }, this.Y);
  }

  /* ---------- пропсы ---------- */
  // Дерево: ствол с корневым расширением, пара ветвей и несколько угловатых шапок листвы
  tree(x, z, s = 1, y = 0, kind) {
    // три породы: клён (рыхлая крона из шапок), дуб (плотная крона), ель (ярусы конусов)
    kind = kind || (rand() < 0.2 ? 'spruce' : rand() < 0.55 ? 'maple' : 'oak');
    const bk = tmat(T.bark());
    if (kind === 'spruce') {
      const lm = tmat(T.leaves(2));
      this.m(G.cyl6, bk, x, y + 0.6 * s, z, 0.16 * s, 1.2 * s, 0.16 * s);
      for (const [h, r, yy] of [[1.5, 1.35, 1.0], [1.3, 1.05, 1.9], [1.1, 0.75, 2.7], [0.8, 0.42, 3.4]]) { const c = this.m(G.cone8, lm, x, y + (yy + h / 2) * s, z, r * s, h * s, r * s); c.rotation.y = rand() * 3; }
      this.solid(x, z, 0.4, 0.4, y, 2); return;
    }
    const lm = tmat(T.leaves(kind === 'maple' ? 0 : 1));
    this.m(G.cyl6, bk, x, y + 1.0 * s, z, 0.19 * s, 2.0 * s, 0.19 * s);
    this.m(G.cone6, bk, x, y + 0.18 * s, z, 0.36 * s, 0.36 * s, 0.36 * s);
    for (const a of [rand() * 6, rand() * 6, rand() * 6]) { const br = this.m(G.cyl5, bk, x + Math.cos(a) * 0.32 * s, y + 2.1 * s, z + Math.sin(a) * 0.32 * s, 0.06 * s, 0.85 * s, 0.06 * s); br.rotation.z = -Math.cos(a) * 0.75; br.rotation.x = Math.sin(a) * 0.75; } // ветви растут из ствола наружу (v0.19)
    const n = kind === 'maple' ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.28 + rand() * 0.6, d = i === 0 ? 0 : (kind === 'maple' ? 0.75 : 0.55) * (0.7 + rand() * 0.4), r = (kind === 'maple' ? 0.72 : 0.95) * (0.8 + rand() * 0.35);
      const c = this.m(LEAF_GEO, lm, x + Math.cos(a) * d * s, y + (2.7 + (i === 0 ? 0.55 : rand() * 0.6)) * s, z + Math.sin(a) * d * s, r * s, r * 0.82 * s, r * s); c.rotation.set(rand(), rand() * 3, rand());
    }
    // Хэллоуин: на ветке висит «привидение» из простыни и покачивается
    if (HW && rand() < 0.12) { const a = rand() * 6.28, p = new THREE.Group(); p.position.set(this.X(x + Math.cos(a) * 1.0 * s), this.Y + y + 2.2 * s, this.Z(z + Math.sin(a) * 1.0 * s)); p.rotation.y = a; this.g.add(p);
      p.add(compose('ghostSheet', q => { const wm = lam({ color: 0xeee8ff, emissive: 0x6a6080, emissiveIntensity: 0.6 }, 'ghostSheet'); q(G.sph10, wm, 0, -0.35, 0, 0.26, 0.26, 0.26); q(G.cone8, wm, 0, -0.75, 0, 0.36, 0.6, 0.36); q(G.box, col(0x17111f), -0.09, -0.33, 0.24, 0.06, 0.09, 0.02); q(G.box, col(0x17111f), 0.09, -0.33, 0.24, 0.06, 0.09, 0.02); q(G.cyl5, col(0xd8d0c0), 0, -0.05, 0, 0.01, 0.15, 0.01); }));
      addSwinger(p, { len: 0.7, damp: 1.2, max: 0.8, r: 0.4, idle: 0.12 }); }
    this.solid(x, z, 0.45, 0.45, y, 2);
  }
  deadTree(x, z) {
    const b = tmat(T.bark());
    this.m(G.cyl5, b, x, 1.6, z, 0.3, 3.2, 0.3);
    for (const [a, l, y] of [[0.7, 1.6, 2.4], [-0.9, 1.4, 2.9], [2.3, 1.2, 2.0], [3.6, 1.0, 3.1]]) {
      const br = this.m(G.cyl5, b, x + Math.cos(a) * l * 0.4, y + 0.3, z + Math.sin(a) * l * 0.4, 0.08, l, 0.08);
      br.rotation.z = -Math.cos(a) * 0.9; br.rotation.x = Math.sin(a) * 0.9;
    }
    this.solid(x, z, 0.6, 0.6, 0, 3);
  }
  bush(x, z, w = 1.6, d = 1.2, h = 1) {
    const m = this.m(G.ico, tmat(T.bush()), x, h * 0.5, z, w * 0.6, h * 0.6, d * 0.6); m.rotation.y = rand() * 3;
    this.solid(x, z, w * 0.85, d * 0.85, 0, h);
  }
  car(x, z, ry, c, type = 'sedan') {
    // v0.21: разные типы — седан, хэтчбек, такси, фургон, пикап. Low-poly, краска по фото металла, шины/колпаки/номера.
    const TY = { sedan: { L: 3.9, cab: [-0.2, 2.2, 0.5], H: 0.95 }, taxi: { L: 3.9, cab: [-0.2, 2.2, 0.5], H: 0.95 }, hatch: { L: 3.4, cab: [-0.4, 2.1, 0.55], H: 0.95 },
      pickup: { L: 4.3, cab: [0.5, 1.5, 0.55], H: 0.95 }, van: { L: 4.4, cab: [-0.3, 3.6, 0.95], H: 0.95 } }, ty = TY[type] || TY.sedan, L = ty.L, hl = L / 2;
    const g = new THREE.Group(); g.position.set(this.X(x), this.Y, this.Z(z)); g.rotation.y = ry; this.g.add(g);
    g.add(compose('car3' + type + c, add => {
      const paint = tmat(T.carPaint(c)), side = tmat(T.carSide(c)), glass = tmat(T.carGlass(c)), dk = col(0x17111f), bump = col(0x2b2833), chrome = col(0x9a9da8), [cx, cl, ch] = ty.cab;
      add(G.box, paint, 0, 0.66, 0, L, 0.58, 1.76); add(G.box, side, 0, 0.66, 0.885, L - 0.3, 0.5, 0.01); add(G.box, side, 0, 0.66, -0.885, L - 0.3, 0.5, 0.01, 0, Math.PI);
      if (type === 'van') { add(G.box, paint, cx, 0.95 + ch / 2, 0, cl, ch, 1.74); add(G.box, glass, cx + cl / 2 - 0.35, 0.95 + ch * 0.62, 0, 0.72, ch * 0.5, 1.76); add(G.box, glass, cx + cl / 2 + 0.005, 0.95 + ch * 0.62, 0, 0.01, ch * 0.5, 1.5);
        add(G.box, dk, cx - 0.4, 0.95 + ch * 0.5, 0.875, 0.02, ch * 0.9, 0.01); add(G.box, col(0xf1e8ff), cx - 0.6, 0.95 + ch * 0.55, 0.88, 1.6, 0.18, 0.01); add(G.box, col(0xf1e8ff), cx - 0.6, 0.95 + ch * 0.55, -0.88, 1.6, 0.18, 0.01); }
      else { add(CAR_CABIN, glass, cx, 0.95 + ch / 2, 0, cl, ch, 1.58); add(G.box, paint, cx, 0.95 + ch - 0.02, 0, cl * 0.7, 0.05, 1.32); }
      if (type === 'pickup') { add(G.box, dk, -0.95, 0.96, 0, 1.9, 0.04, 1.6); for (const sz of [-1, 1]) add(G.box, paint, -0.95, 1.08, sz * 0.84, 1.9, 0.26, 0.08); add(G.box, tmat(T.crate()), -1.2, 1.2, 0.2, 0.5, 0.45, 0.5); }
      if (type === 'taxi') { add(G.box, tmat(T.checker()), 0, 0.82, 0.888, L - 0.4, 0.1, 0.01); add(G.box, tmat(T.checker()), 0, 0.82, -0.888, L - 0.4, 0.1, 0.01, 0, Math.PI);
        add(G.box, glow(0xf5c542), cx, 0.95 + ch + 0.1, 0, 0.5, 0.16, 0.3); add(G.box, tmat(T.sign('ТАКСИ', '#f5c542', '#17111f')), cx, 0.95 + ch + 0.1, 0.152, 0.48, 0.14, 0.005); add(G.box, tmat(T.sign('ТАКСИ', '#f5c542', '#17111f')), cx, 0.95 + ch + 0.1, -0.152, 0.48, 0.14, 0.005, 0, Math.PI); }
      for (const sx of [-1, 1]) { add(G.box, bump, sx * (hl + 0.05), 0.48, 0, 0.14, 0.22, 1.8); add(G.box, tmat(T.plate()), sx * (hl + 0.125), 0.5, 0, 0.01, 0.12, 0.42); }
      const wx = hl - 0.65;
      for (const sz of [-1, 1]) { add(G.box, chrome, cx + cl / 2 - (type === 'van' ? 0.6 : 0.3), 1.0, sz * 0.92, 0.12, 0.08, 0.1); for (const sx of [-wx, wx]) add(G.box, dk, sx, 0.52, sz * 0.86, 0.86, 0.36, 0.08); }
      add(G.box, glow(0xfff1c0), hl + 0.01, 0.72, 0.58, 0.04, 0.14, 0.32); add(G.box, glow(0xfff1c0), hl + 0.01, 0.72, -0.58, 0.04, 0.14, 0.32);
      add(G.box, glow(0xd8243a), -hl - 0.01, 0.74, 0.62, 0.04, 0.12, 0.26); add(G.box, glow(0xd8243a), -hl - 0.01, 0.74, -0.62, 0.04, 0.12, 0.26);
      add(G.box, dk, hl + 0.025, 0.66, 0, 0.02, 0.16, 0.6);
      for (const [a, b] of [[wx, 0.8], [wx, -0.8], [-wx, 0.8], [-wx, -0.8]]) { add(TIRE_GEO, tmat(T.tread()), a, 0.33, b, 0.33, 0.24, 0.33, Math.PI / 2); add(G.cyl12, tmat(T.hubcap()), a, 0.33, b + Math.sign(b) * 0.06, 0.2, 0.02, 0.2, Math.PI / 2); }
    }));
    // крышка багажника на петле (E — открыть, один шанс найти предмет); у фургона — задняя дверь
    const lid = new THREE.Group(); lid.position.set(-hl + 0.66, 0.95, 0); g.add(lid); W.keep.push(lid);
    lid.add(compose('carLid3' + c, add => { add(G.box, tmat(T.carPaint(c)), -0.33, 0.015, 0, 0.66, 0.05, 1.7); add(G.box, col(0x9a9da8), -0.6, 0.0, 0, 0.04, 0.03, 0.3); }));
    if (type === 'van') lid.position.y = 0.95 + ty.cab[2] + 0.02;
    W.cars.push({ x: this.X(x), z: this.Z(z), y: this.Y, ry, alarm: 0, lid, g, L });
    // мойка (v0.23): точка у левого борта машины, лицом к борту
    { const nx = Math.sin(ry), nz = Math.cos(ry); (W.spots.car || (W.spots.car = [])).push({ x: this.X(x) + nx * 1.9, z: this.Z(z) + nz * 1.9, y: this.Y, f: [-Math.round(nx), -Math.round(nz)], car: W.cars[W.cars.length - 1], district: this.d, label: 'машина' }); }
    const q = Math.abs(Math.sin(ry)) > 0.5, top = type === 'van' ? 1.92 : 1.45;
    this.solid(x, z, q ? 1.8 : L + 0.1, q ? L + 0.1 : 1.8, 0, 0.95);
    const rx = x - Math.cos(ry) * ty.cab[0] * -1, rz = z - Math.sin(ry) * ty.cab[0], rw = q ? 1.5 : ty.cab[1], rd = q ? ty.cab[1] : 1.5;
    this.solid(rx, rz, rw, rd, 0.95, top - 0.95); this.bouncer(rx - rw / 2, rz - rd / 2, rx + rw / 2, rz + rd / 2, top, 8.5);
    return g;
  }
  bus(x, z, c = 0xd8a030) {
    const g = this.prop(x, z), side = tmat(T.busSide(c)), body = tmat(T.corrugated(c)), dk = col(0x17111f);
    mesh(G.box, [tmat(T.busFront(c)), tmat(T.busRear(c)), col(c), dk, side, side], 0, 1.675, 0, 9, 2.45, 2.6, g);
    mesh(G.box, col(0x3a3440), 0, 2.95, 0, 7.6, 0.12, 2.2, g); mesh(G.box, tmat(T.vent()), -2.5, 3.05, 0, 1.4, 0.18, 1.2, g);
    for (const zz of [-1.31, 1.31]) mesh(G.box, col(0xf5c542), 0, 1.0, zz, 8.2, 0.08, 0.02, g);
    for (const xx of [-2.7, 2.7]) for (const zz of [-1.28, 1.28]) { mesh(G.cyl8, dk, xx, 0.45, zz, 0.45, 0.18, 0.45, g).rotation.x = Math.PI / 2; mesh(G.disc, tmat(T.metal()), xx, 0.45, Math.sign(zz) * 1.38, 0.24, 0.24, 1, g).rotation.y = zz < 0 ? Math.PI : 0; }
    for (const zz of [-1.4, 1.4]) mesh(G.box, dk, 3.8, 2.15, zz, 0.18, 0.3, 0.12, g);
    mesh(G.box, col(0x85818b), 4.53, 0.64, 0, 0.08, 0.15, 2.5, g);
    this.solid(x, z, 9, 2.6, 0, 2.9); return g;
  }
  // Сохраняем прежние размеры/коллизии, добавляя назначение каждому «блоку».
  aircon(x, z, y) {
    const mt = tmat(T.metal()), front = tmat(T.vent());
    this.box(x, z, 1.2, 0.8, 0.8, [mt, mt, mt, mt, front, mt], { y });
    for (const xx of [-0.42, 0.42]) this.m(G.box, col(0x35303e), x + xx, y + 0.04, z, 0.1, 0.08, 0.95);
  }
  cabinet(x, z, w, d, h, c = 0x6a6d78, y = 0, ry = 0) {
    const mt = col(c); return this.box(x, z, w, d, h, [mt, mt, mt, mt, tmat(T.cabinet(c)), mt], { y, ry });
  }
  vending(x, z, ry = 0) {
    const body = col(0x9b293d), q = Math.abs(Math.sin(ry)) > 0.5;
    this.box(x, z, 1.2, 0.9, 2, [body, body, body, body, tmat(T.vending()), body], { ry });
    this.m(G.box, col(0x27212f), x, 0.06, z, q ? 0.86 : 1.08, 0.12, q ? 1.08 : 0.86);
    const nx = Math.round(Math.sin(ry)), nz = Math.round(Math.cos(ry));
    W.vendings.push({ x: this.X(x), z: this.Z(z), y: this.Y, nx, nz, cd: 0 });
  }
  pallet(x, z, w = 1.6, d = 1.2, y = 0) {
    const wd = tmat(T.wood());
    for (const xx of [-0.4, 0.4]) this.m(G.box, wd, x + xx * w, y + 0.065, z, w * 0.12, 0.13, d);
    for (let i = 0; i < 5; i++) this.m(G.box, wd, x, y + 0.155, z + (i - 2) * d / 5, w, 0.05, d * 0.17);
    this.solid(x, z, w, d, y, 0.18);
  }
  dumpster(x, z) {
    const mt = tmat(T.corrugated(0x3e5a4a));
    this.box(x, z, 1.4, 1.1, 1.05, mt, { y: 0.12 });
    this.m(G.box, tmat(T.paintMetal(0x243d32)), x, 1.2, z, 1.48, 0.1, 1.18); this.m(G.box, tmat(T.rust()), x, 0.2, z + 0.56, 1.42, 0.16, 0.02);
    this.solid(x, z, 1.48, 1.18, 1.15, 0.1);
    this.m(G.box, col(0x22222c), x, 1.28, z + 0.18, 0.4, 0.06, 0.07);
    W.hides.push({ x: this.X(x), y: this.Y, z: this.Z(z), r: 1.4, kind: 'bin', out: [0, 1] });
    for (const xx of [-0.55, 0.55]) this.m(G.cyl6, col(0x17111f), x + xx, 0.1, z - 0.35, 0.1, 0.08, 0.1).rotation.z = Math.PI / 2;
  }
  pump(x, z, r = 0.5, h = 1.6, y = 0) {
    const mt = tmat(T.corrugated(0x3a6a9a)), dk = tmat(T.metal());
    this.m(G.cyl8, dk, x, y + 0.09, z, r * 1.14, 0.18, r * 1.14);
    this.m(G.cyl8, mt, x, y + h * 0.5, z, r, h, r);
    this.m(G.cyl8, dk, x, y + h - 0.06, z, r * 1.05, 0.12, r * 1.05);
    this.m(G.cyl6, dk, x, y + 0.4, z + r * 1.35, r * 0.32, r, r * 0.32).rotation.x = Math.PI / 2;
    this.m(G.torus, col(0xb65a37), x, y + 0.65, z + r * 1.85, r * 0.35, r * 0.35, r * 0.35);
    this.solid(x, z, r * 2, r * 2, y, h);
  }
  // ящик — разрушаемый (кидаешь тяжёлое — разлетается на доски)
  crate(x, z, s = 1, y = 0) { return breakModel(this.X(x), this.Y + y, this.Z(z), s, s, s, 'crate', crateModel()); }
  ride(kind, x, z, ry = 0, y = 0) { const p = addPushable(this, kind, x, z, y); p.mesh.rotation.y = ry; return p; }
  // кирпичная стена из блоков, axis 'x' — вдоль X
  brickWall(x, z, len, h, axis, y = 0, o = {}) { return brickWall(this.X(x), this.Z(z), this.Y + y, len, h, axis, o); }
  // витрина: стекло бьётся на осколки
  vitrine(x, z, w, h, axis = 'x', y = 0.4) { return breakBox(this.X(x), this.Y + y, this.Z(z), axis === 'x' ? w : 0.06, h, axis === 'x' ? 0.06 : w, 'glass', glassMat()); }
  // деревянный сарай: стены из досок, крыша падает, если выбить половину стен
  shed(x, z, w, d, h = 2.2) {
    const wood = tmat(T.wood()), pieces = [];
    const wall = (cx, cz, len, axis) => { const n = Math.max(2, Math.round(len / 0.7)); for (let i = 0; i < n; i++) { const o = -len / 2 + (i + 0.5) * len / n;
      pieces.push(breakBox(this.X(axis === 'x' ? cx + o : cx), this.Y, this.Z(axis === 'x' ? cz : cz + o), axis === 'x' ? len / n - 0.02 : 0.12, h, axis === 'x' ? 0.12 : len / n - 0.02, 'wood', wood)); } };
    wall(x + w / 2, z, w, 'x'); wall(x + w / 2, z + d, w, 'x'); wall(x, z + d / 2, d - 0.12, 'z'); wall(x + w, z + d / 2, d - 0.12, 'z');
    const roof = breakBox(this.X(x + w / 2), this.Y + h, this.Z(z + d / 2), w + 0.4, 0.14, d + 0.4, 'wood', tmat(T.roof()));
    let broken = 0; for (const p of pieces) p.onBreak = () => { broken++; if (broken > pieces.length * 0.4) breakPiece(roof, [0, -2, 0]); };
    this.zone('inside', x + 0.5, z + 0.5, x + w - 0.5, z + d - 0.5);
  }
  // мостик-доска между крышами на высоте y (верх доски)
  plank(x0, z0, x1, z1, y, w = 0.8) {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    this.box(cx, cz, along ? len : w, along ? w : len, 0.1, tmat(T.wood()), { y: y - 0.1 });
    for (const s of [-1, 1]) this.m(G.box, col(0x6a6d78), cx + (along ? 0 : s * w / 2), y + 0.02, cz + (along ? s * w / 2 : 0), along ? len : 0.04, 0.04, along ? 0.04 : len);
  }
  // ступеньки: от (x,z) в направлении dir ('n','s','e','w'), с высоты y0 до y1, шириной w
  stairs(x, z, dir, y0, y1, w = 1.2, base = 0, run = 0.42) {
    const n = Math.max(1, Math.round((y1 - y0) / 0.3)), rise = (y1 - y0) / n, v = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[dir];
    for (let i = 0; i < n; i++) { const cx = x + v[0] * (i + 0.5) * run, cz = z + v[1] * (i + 0.5) * run;
      this.box(cx, cz, v[0] ? run : w, v[0] ? w : run, y0 + rise * (i + 1) - base, tmat(T.concrete()), { y: base }); }
  }
  barrel(x, z) {
    const mt = tmat(T.metal()); this.m(G.cyl8, tmat(T.rust()), x, 0.5, z, 0.42, 1, 0.42);
    for (const yy of [0.13, 0.86]) this.m(G.cyl8, mt, x, yy, z, 0.433, 0.06, 0.433);
    this.m(G.cyl6, col(0x27212f), x + 0.17, 1.008, z, 0.06, 0.016, 0.06); this.solid(x, z, 0.86, 0.86, 0, 1.02);
  }
  // урна — толкаемая
  bin(x, z) { addPushable(this, 'bin', x, z); if (this.Y > -1) this.fireSpot(x, z); }
  hydrant(x, z) {
    const red = tmat(T.paintMetal(0xc8243a)), mt = tmat(T.metal());
    this.m(G.cyl6, red, x, 0.35, z, 0.18, 0.7, 0.18); const cap = this.m(G.cone6, red, x, 0.76, z, 0.23, 0.18, 0.23); W.keep.push(cap);
    W.hydrants.push({ x: this.X(x), y: this.Y, z: this.Z(z), cap, on: 0, t: 0 });
    this.m(G.cyl6, mt, x, 0.05, z, 0.25, 0.1, 0.25);
    for (const sx of [-1, 1]) this.m(G.cyl6, red, x + sx * 0.2, 0.48, z, 0.105, 0.23, 0.105).rotation.z = Math.PI / 2;
    this.solid(x, z, 0.6, 0.4, 0, 0.85);
  }
  // Забор от (x0,z0) до (x1,z1) — только по одной оси
  fence(x0, z0, x1, z1, h = 1.6, kind = 'iron') {
    if (kind === 'wood') {
      const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0), n = Math.max(1, Math.round(len / 1.2));
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        breakBox(this.X(x), this.Y, this.Z(z), along ? len / n - 0.05 : 0.08, h, along ? 0.08 : len / n - 0.05, 'wood', tmat(T.wood())); }
      return;
    }
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const mat = kind === 'iron' ? tmat(T.paintMetal(0x2a2434)) : kind === 'mesh' ? tmat(T.metal()) : tmat(T.wood());
    const n = Math.max(1, Math.round(len / (kind === 'iron' ? 0.35 : 2)));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      this.m(G.box, mat, x, h / 2, z, kind === 'iron' ? 0.075 : 0.1, h, kind === 'iron' ? 0.075 : 0.1);
      if (kind === 'iron') this.m(G.cone4, mat, x, h + 0.08, z, 0.06, 0.16, 0.06);
    }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const y of kind === 'iron' ? [0.2, h - 0.15] : [0.4, h - 0.3]) this.m(G.box, mat, cx, y, cz, along ? len : 0.1, 0.09, along ? 0.1 : len);
    if (kind === 'mesh') { const p = this.m(G.plane, lam({ map: rep(T.chainlink(), len / 1.5, h / 1.5), transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }), cx, h / 2, cz, len, h, 1); p.rotation.y = along ? 0 : Math.PI / 2; }
    this.solid(cx, cz, along ? len : 0.2, along ? 0.2 : len, 0, h);
  }
  // Тыквы — не декор, а настоящие предметы: их можно пнуть, взять и бросить. Не больше двух на район.
  pumpkin(x, z, s = 0.45, y = 0) {
    this._pk = (this._pk || 0) + 1; if (this._pk > 2) return;
    this.item('pumpkin', x, z, y);
  }
  grave(x, z, ry = 0) {
    // плита и полукруглый верх — одна группа (один наклон), верх тоньше плиты: без совпадающих граней
    const st = tmat(T.stone()), tilt = (rand() - 0.5) * 0.18, g = this.prop(x, z, ry);
    const slab = new THREE.Mesh(G.box, [st, st, st, st, tmat(T.grave()), st]); slab.position.y = 0.5; slab.scale.set(0.8, 1.0, 0.22);
    const cap = new THREE.Mesh(G.cyl8, st); cap.position.y = 1.0; cap.scale.set(0.39, 0.2, 0.39); cap.rotation.x = Math.PI / 2;
    const base = new THREE.Mesh(G.box, st); base.position.y = 0.06; base.scale.set(0.95, 0.12, 0.36);
    const tg = new THREE.Group(); tg.rotation.z = tilt; tg.add(slab, cap); g.add(tg, base);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.36 : 0.95, q ? 0.95 : 0.36, 0, 1.25);
  }
  web(x, y, z, ry, s = 1.2) { const m = this.m(G.plane, alphaMat(T.web(), { side: THREE.DoubleSide, opacity: 0.7 }), x, y, z, s, s, 1); m.rotation.y = ry; }
  // гирлянда на столбах: столбы каждые ~8 м, провод провисает между ними, лампочки висят на проводе
  stringLights(x0, z0, x1, z1, y, colors = [0xff8a1f, 0xb18cff, 0x9be36b]) {
    const len = Math.hypot(x1 - x0, z1 - z0), spans = Math.max(1, Math.ceil(len / 8)), pole = col(0x2b2533);
    for (let k = 0; k <= spans; k++) { const t = k / spans, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
      // столб не ставим перед дверью (вход всегда свободен)
      if (W.doors.some(d => Math.hypot(d.x - this.X(px), d.z - this.Z(pz)) < 1.8 && Math.abs(d.y - this.Y) < 1)) continue;
      this.m(G.cyl6, pole, px, (y + 0.15) / 2, pz, 0.06, y + 0.15, 0.06); this.solid(px, pz, 0.16, 0.16, 0, y); }
    const pts = [];
    for (let k = 0; k < spans; k++) {
      const n = Math.max(4, Math.round(len / spans / 0.7));
      for (let i = 0; i <= n; i++) { const t = (k + i / n) / spans, sag = Math.sin(i / n * Math.PI) * 0.35;
        const px = x0 + (x1 - x0) * t, py = y - sag, pz = z0 + (z1 - z0) * t; pts.push(new THREE.Vector3(this.X(px), this.Y + py, this.Z(pz)));
        if (i > 0 && i < n) { this.m(G.box, col(0x17111f), px, py - 0.06, pz, 0.03, 0.08, 0.03); this.m(G.box, glow(colors[(k * n + i) % colors.length]), px, py - 0.16, pz, 0.11, 0.14, 0.11); } }
    }
    this.g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x17111f })));
  }
  sign(x, y, z, ry, text, bg, fg, w = 3, h = 0.75) { const m = this.m(G.plane, tmat(T.sign(text, bg, fg)), x, y, z, w, h, 1); m.rotation.y = ry; return m; }
  table(x, z, s = 1, y = 0) {
    const w = tmat(T.wood()); this.m(G.box, w, x, y + 0.78, z, 1.4 * s, 0.08, 0.9 * s);
    for (const [a, b] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) this.m(G.box, col(0x2b2533), x + a * s, y + 0.38, z + b * s, 0.07, 0.76, 0.07);
    this.solid(x, z, 1.4 * s, 0.9 * s, y, 0.82);
  }
  // стол в помещении — толкаемый (v0.19); s — масштаб (визуально как обычный стол)
  ptable(x, z, s = 1) { const p = addPushable(this, 'table', x, z, 0); p.mesh.scale.set(s + 0.2, 1, s + 0.2); return p; }
  chair(x, z, ry = 0, y = 0) { return this.item('chair', x, z, y, ry); }
  cone(x, z) { return this.item('cone', x, z); }
  staticChair(x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(this.X(x), this.Y, this.Z(z)); g.rotation.y = ry; this.g.add(g);
    const w = tmat(T.wood()); mesh(G.box, w, 0, 0.45, 0, 0.5, 0.06, 0.5, g); mesh(G.box, w, 0, 0.75, -0.22, 0.5, 0.55, 0.05, g);
    for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) mesh(G.box, col(0x2b2533), a, 0.22, b, 0.05, 0.45, 0.05, g);
    this.solid(x, z, 0.5, 0.5, 0, 0.5);
  }
  shelf(x,z,w,ry=0,stock=false){
    const g=this.prop(x,z,ry),wood=tmat(T.wood());
    for(const xx of[-w/2,w/2])mesh(G.box,wood,xx,.95,0,.065,1.9,.5,g);
    mesh(G.box,col(0x4a3a2e),0,.95,-.235,w,1.9,.035,g);
    for(const y of[.08,.65,1.25,1.91])mesh(G.box,wood,0,y,0,w+.08,.06,.56,g);
    g.updateMatrixWorld(true);if(stock)for(const y of[.12,.69,1.29])for(let i=0;i<Math.max(2,Math.floor(w/.65));i++){const q=g.localToWorld(new THREE.Vector3(-w/2+.35+i*.61,y,.06)),type=['can','mug','books','duck'][(i+Math.round(y*10))%4];addItem(type,q.x,q.y,q.z,ry);}
    const q=Math.abs(Math.sin(ry))>.5;this.solid(x,z,q?.5:w,q?w:.5,0,1.9);
  }

  /* ---------- лестница ---------- */
  // side: на какой стороне стены (наружная нормаль) — 's','n','e','w'. (x,z) — точка у стены.
  ladder(x, z, side, top, y0 = 0) {
    const n = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[side], mat = col(0x5a5d68);
    const ax = n[1] !== 0, h = top - y0 + 0.9;
    const px = x + n[0] * 0.12, pz = z + n[1] * 0.12;
    for (const o of [-0.32, 0.32]) this.m(G.box, mat, px + (ax ? o : 0), y0 + h / 2, pz + (ax ? 0 : o), 0.07, h, 0.07);
    for (let y = y0 + 0.3; y < top + 0.8; y += 0.38) this.m(G.box, mat, px, y, pz, ax ? 0.64 : 0.05, 0.05, ax ? 0.05 : 0.64);
    const wx = this.X(x), wz = this.Z(z);
    W.ladders.push({ x0: wx + Math.min(0, n[0] * 0.9) - (ax ? 0.4 : 0), x1: wx + Math.max(0, n[0] * 0.9) + (ax ? 0.4 : 0),
      z0: wz + Math.min(0, n[1] * 0.9) - (ax ? 0 : 0.4), z1: wz + Math.max(0, n[1] * 0.9) + (ax ? 0 : 0.4),
      y0: this.Y + y0, y1: this.Y + top + 0.12, nx: n[0], nz: n[1] });
  }

  /* ---------- дверь ---------- */
  // Дверь в проёме: hinge — точка петли (локально), axis 'x' — проём вдоль X, inward — знак вращения при открытии
  door(hx, hz, axis, inward, y = 0, w = 2.0, h = 2.35, style = 'wood') {
    const pivot = new THREE.Group(); pivot.position.set(this.X(hx), this.Y + y, this.Z(hz)); this.g.add(pivot);
    const wood = tmat(T.wood()), dk = col(0x3a2418);
    const px = axis === 'x' ? w / 2 : 0, pz = axis === 'x' ? 0 : w / 2;
    if (style === 'glass') {
      // стеклянная дверь торгового центра: металлическая рама, стекло, поручень, наклейка «ВХОД»
      const fr = col(0x3a3440), gl = lam({ color: 0xbfe8ff, emissive: 0x1a3040, transparent: true, opacity: 0.35, depthWrite: false }, 'mallGlass'), ch = col(0xd8d8e0);
      const B = (x0, y0, z0, sx, sy, sz, m) => mesh(G.box, m, axis === 'x' ? x0 : 0, y0, axis === 'x' ? 0 : z0, axis === 'x' ? sx : sz, sy, axis === 'x' ? sz : sx, pivot);
      B(px, h / 2, pz, w - 0.1, h - 0.1, 0.03, gl); B(px, h - 0.04, pz, w, 0.08, 0.1, fr); B(px, 0.04, pz, w, 0.08, 0.1, fr);
      for (const e of [0.04, w - 0.04, w / 2]) B(e, h / 2, e, 0.08, h, 0.1, fr);
      for (const sd of [-1, 1]) B(px, 1.05, pz + 0, w * 0.7, 0.05, 0.05, ch).position[axis === 'x' ? 'z' : 'x'] = sd * 0.08;
      B(px, 1.5, pz, 0.6, 0.18, 0.035, tmat(T.sign('ВХОД', '#2a1f3d', '#b18cff')));
    } else if(style==='metal'){
      const iron=tmat(T.corrugated(0x6d8179)),frame=col(0x455553);mesh(G.box,iron,px,h/2,pz,axis==='x'?w:.10,h,axis==='x'?.10:w,pivot);
      for(const y of[.12,h-.12])mesh(G.box,frame,px,y,pz,axis==='x'?w+.04:.14,.12,axis==='x'?.14:w+.04,pivot);
    } else
    mesh(G.box, [dk, dk, dk, dk, wood, wood], px, h / 2, pz, axis === 'x' ? w : 0.08, h, axis === 'x' ? 0.08 : w, pivot);
    if (style !== 'glass') { mesh(G.box, col(0xf5c542), axis === 'x' ? w - 0.2 : 0.07, 1.05, axis === 'x' ? 0.07 : w - 0.2, 0.08, 0.08, 0.08, pivot);
      mesh(G.box, col(0xf5c542), axis === 'x' ? w - 0.2 : -0.07, 1.05, axis === 'x' ? -0.07 : w - 0.2, 0.08, 0.08, 0.08, pivot); }
    const s = axis === 'x' ? this.solid(hx + w / 2, hz, w, 0.16, y, h) : this.solid(hx, hz + w / 2, 0.16, w, y, h);
    const d = { pivot, solid: s, open: false, ang: 0, inward, axis, x: this.X(hx + px), z: this.Z(hz + pz), y: this.Y + y, outline: addOutline(pivot, 0.04) };
    W.doors.push(d); return d;
  }

  /* ---------- одноэтажное здание с интерьером ---------- */
  // Обёртка над tower(): настоящие окна-проёмы со стеклом, дверь, крыша, интерьер interior(b, r)
  house(o) {
    const cb = o.interior;
    return this.tower({ canopy: false, ...o, roof: !!o.roof, floors: 1, fh: Math.max(3.8, o.h ?? 3.8), stairs: false, interior: cb ? (f, k, r) => cb(f, r) : null });
  }
  aabb(cx, cz, w, d, y0, h) {
    return new THREE.Box3(new V3(this.X(cx - w / 2), this.Y + y0, this.Z(cz - d / 2)), new V3(this.X(cx + w / 2), this.Y + y0 + h, this.Z(cz + d / 2)));
  }
}

Object.assign(Builder.prototype, PropMethods, TowerMethods, OpenMethods, MoreMethods);

// У кабины машины наклонены стойки, при той же малой геометрии и старом хитбоксе.
const LEAF_GEO = new THREE.IcosahedronGeometry(1, 1);
const CAR_CABIN = G.box.clone();
for (let i = 0; i < CAR_CABIN.attributes.position.count; i++) {
  const a = CAR_CABIN.attributes.position;
  if (a.getY(i) > 0) { a.setX(i, a.getX(i) * 0.72); a.setZ(i, a.getZ(i) * 0.85); }
}
CAR_CABIN.computeVertexNormals();
let _lm, _wm, _pf;
const _mist = {}; const mistMat = op => _mist[op] || (_mist[op] = alphaMat(T.mist(), { color: SEASON.bg === 0x2a1f3d ? 0xb8a8e0 : 0xffffff, opacity: op, depthWrite: false }));
export const LIGHTDIM = () => _ld || (_ld = alphaMat(T.light(), { blending: THREE.AdditiveBlending, color: 0x8a7a70 }));
let _ld;
export const LIGHTMAT = () => _lm || (_lm = alphaMat(T.light(), { blending: THREE.AdditiveBlending, color: 0xffffff }));
export const WATERMAT = () => _wm || (_wm = lam({ map: T.water(), transparent: true, opacity: 0.88 }));
let _wh, _fo;
export const WATERHI = () => _wh || (_wh = alphaMat(T.waterHi(), { blending: THREE.AdditiveBlending, opacity: 0.55 }));
export const FOAM = () => _fo || (_fo = alphaMat(T.foam(), { opacity: 0.75 }));
export const PFACE = () => _pf || (_pf = new THREE.MeshBasicMaterial({ map: T.pumpkinFace(), transparent: true, alphaTest: 0.5 }));
