import { THREE, G, V3, mesh, col, tmat, glow, basic, own, alphaMat, lam } from '../core/gfx.js';
import { T, facade, rep } from '../core/textures.js';
import { rand, range, pick } from '../core/rng.js';
import { HW, SEASON } from '../config.js';
import { W } from './state.js';
import { addSolid, addZone } from './physics.js';
import { addItem } from '../game/items.js';
import { addBirds } from './birds.js';

/* Конструктор района. Все координаты — локальные (0..24), высота от уровня тротуара.
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
  ground(x0, z0, x1, z1, tex, tile = 3) {
    const w = x1 - x0, d = z1 - z0, m = this.m(G.plane, tmat(rep(tex, w / tile, d / tile)), (x0 + x1) / 2, 0.012, (z0 + z1) / 2, w, d, 1);
    m.rotation.x = -Math.PI / 2; return m;
  }
  zone(type, x0, z0, x1, z1, y = 0) { W.missionZones.push({ type, x0: this.X(x0), z0: this.Z(z0), x1: this.X(x1), z1: this.Z(z1), y: this.Y + y, district: this.d }); }
  spawn(x, z) { W.spawns.push({ x: this.X(x), z: this.Z(z), y: this.Y }); }
  cats(x0, z0, x1, z1) { W.catHomes.push({ x0: this.X(x0), z0: this.Z(z0), x1: this.X(x1), z1: this.Z(z1), y: this.Y, district: this.d }); }
  item(type, x, z, y = 0) { addItem(type, this.X(x), this.Y + y, this.Z(z)); }
  birds(kind, x0, z0, x1, z1, n) { addBirds(kind, { x0: this.X(x0), z0: this.Z(z0), x1: this.X(x1), z1: this.Z(z1), y: this.Y }, n); }
  hw(fn) { if (HW) fn(); }

  /* ---------- свет и эффекты ---------- */
  light(x, z, r = 3, y = 0) {
    const m = this.m(G.plane, LIGHTMAT(), x, y + 0.03, z, r * 2, r * 2, 1); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m;
  }
  water(x, z, r) {
    const m = this.m(G.cyl12, WATERMAT(), x, 0.06, z, r, 0.04, r);
    addZone('water', { c: [this.X(x), this.Z(z), r] }, this.Y);
    return m;
  }
  waterRect(x0, z0, x1, z1) {
    const m = this.m(G.box, WATERMAT(), (x0 + x1) / 2, 0.06, (z0 + z1) / 2, x1 - x0, 0.04, z1 - z0);
    addZone('water', { r: [this.X(x0), this.Z(z0), this.X(x1), this.Z(z1)] }, this.Y);
    return m;
  }
  slip(x, z, r) {
    const m = this.m(G.plane, alphaMat(T.splat('#120c18'), { opacity: 0.85 }), x, 0.025, z, r * 2.2, r * 2.2, 1); m.rotation.x = -Math.PI / 2; m.rotation.z = rand() * 6;
    addZone('oil', { c: [this.X(x), this.Z(z), r] }, this.Y);
  }

  /* ---------- пропсы ---------- */
  tree(x, z, s = 1) {
    const i = (rand() * 3) | 0, lm = tmat(T.leaves(i));
    this.m(G.cyl6, tmat(T.bark()), x, 0.9 * s, z, 0.22 * s, 1.8 * s, 0.22 * s);
    const a = this.m(G.ico, lm, x, 2.4 * s, z, 1.45 * s, 1.15 * s, 1.45 * s); a.rotation.y = rand() * 3;
    const b = this.m(G.ico, lm, x + 0.25 * s, 3.3 * s, z - 0.1, 0.95 * s, 0.85 * s, 0.95 * s); b.rotation.y = rand() * 3;
    this.solid(x, z, 0.5, 0.5, 0, 2);
  }
  deadTree(x, z) {
    const b = tmat(T.bark());
    this.m(G.cyl5, b, x, 1.6, z, 0.3, 3.2, 0.3);
    for (const [a, l, y] of [[0.7, 1.6, 2.4], [-0.9, 1.4, 2.9], [2.3, 1.2, 2.0], [3.6, 1.0, 3.1]]) {
      const br = this.m(G.cyl5, b, x + Math.cos(a) * l * 0.4, y + 0.3, z + Math.sin(a) * l * 0.4, 0.08, l, 0.08);
      br.rotation.z = Math.cos(a) * 0.9; br.rotation.x = Math.sin(a) * 0.9;
    }
    this.solid(x, z, 0.6, 0.6, 0, 3);
  }
  bush(x, z, w = 1.6, d = 1.2, h = 1) {
    const m = this.m(G.ico, tmat(T.bush()), x, h * 0.5, z, w * 0.6, h * 0.6, d * 0.6); m.rotation.y = rand() * 3;
    this.solid(x, z, w * 0.85, d * 0.85, 0, h);
  }
  bench(x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(this.X(x), this.Y, this.Z(z)); g.rotation.y = ry; this.g.add(g);
    const w = tmat(T.wood()), dk = col(0x2b2533);
    mesh(G.box, w, 0, 0.5, 0, 2, 0.1, 0.55, g); mesh(G.box, w, 0, 0.85, -0.25, 2, 0.4, 0.08, g);
    for (const o of [-0.85, 0.85]) mesh(G.box, dk, o, 0.25, 0, 0.1, 0.5, 0.5, g);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.6 : 2, q ? 2 : 0.6, 0, 0.55);
  }
  lamp(x, z, ry = 0) {
    const d = col(0x2b2533);
    this.m(G.cyl6, d, x, 1.7, z, 0.08, 3.4, 0.08);
    const dx = Math.sin(ry) * 0.5, dz = Math.cos(ry) * 0.5;
    const arm = this.m(G.box, d, x + dx / 2, 3.35, z + dz / 2, 0.08, 0.08, 0.6); arm.rotation.y = ry;
    this.m(G.box, glow(SEASON.lamp), x + dx, 3.2, z + dz, 0.3, 0.2, 0.3);
    this.light(x + dx, z + dz, 3.2);
    this.solid(x, z, 0.25, 0.25, 0, 3.4);
  }
  car(x, z, ry, c) {
    const g = new THREE.Group(); g.position.set(this.X(x), this.Y, this.Z(z)); g.rotation.y = ry; this.g.add(g);
    const side = tmat(T.carSide(c)), glass = tmat(T.carGlass(c)), top = col(c), dk = col(0x17111f);
    mesh(G.box, [col(c), col(c), top, dk, side, side], 0, 0.62, 0, 4, 0.66, 1.8, g);
    mesh(G.box, [glass, glass, top, dk, glass, glass], -0.2, 1.17, 0, 2.2, 0.48, 1.6, g);
    mesh(G.box, glow(0xfff1c0), 2.0, 0.7, 0.55, 0.04, 0.16, 0.3, g); mesh(G.box, glow(0xfff1c0), 2.0, 0.7, -0.55, 0.04, 0.16, 0.3, g);
    mesh(G.box, glow(0xd8243a), -2.0, 0.72, 0.6, 0.04, 0.14, 0.25, g); mesh(G.box, glow(0xd8243a), -2.0, 0.72, -0.6, 0.04, 0.14, 0.25, g);
    for (const [a, b] of [[1.3, 0.85], [1.3, -0.85], [-1.3, 0.85], [-1.3, -0.85]]) { const wh = mesh(G.cyl8, dk, a, 0.32, b, 0.32, 0.22, 0.32, g); wh.rotation.x = Math.PI / 2; }
    const q = Math.abs(Math.sin(ry)) > 0.5;
    this.solid(x, z, q ? 1.8 : 4, q ? 4 : 1.8, 0, 0.95);
    const cx = x - Math.cos(ry) * 0.2, cz = z + Math.sin(ry) * 0.2;
    this.solid(cx, cz, q ? 1.6 : 2.2, q ? 2.2 : 1.6, 0.95, 0.46);
    return g;
  }
  crate(x, z, s = 1, y = 0) { this.box(x, z, s, s, s, tmat(T.crate()), { y }); }
  barrel(x, z) { this.m(G.cyl8, tmat(T.rust()), x, 0.5, z, 0.42, 1, 0.42); this.solid(x, z, 0.8, 0.8, 0, 1); }
  bin(x, z) {
    this.m(G.cyl8, col(0x3e5a4a), x, 0.5, z, 0.35, 1, 0.35); this.m(G.cyl8, col(0x2e4a3a), x, 1.03, z, 0.38, 0.06, 0.38);
    this.solid(x, z, 0.7, 0.7, 0, 1.05);
  }
  hydrant(x, z) { this.m(G.cyl6, col(0xc8243a), x, 0.35, z, 0.18, 0.7, 0.18); this.m(G.sph, col(0xc8243a), x, 0.72, z, 0.17, 0.12, 0.17); this.solid(x, z, 0.4, 0.4, 0, 0.8); }
  // Забор от (x0,z0) до (x1,z1) — только по одной оси
  fence(x0, z0, x1, z1, h = 1.6, kind = 'iron') {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const mat = kind === 'iron' ? col(0x1e1a24) : kind === 'mesh' ? col(0x6a6d78) : tmat(T.wood());
    const n = Math.max(1, Math.round(len / (kind === 'iron' ? 0.35 : 2)));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      this.m(G.box, mat, x, h / 2, z, kind === 'iron' ? 0.05 : 0.1, h, kind === 'iron' ? 0.05 : 0.1);
      if (kind === 'iron') this.m(G.cone4, mat, x, h + 0.08, z, 0.06, 0.16, 0.06);
    }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const y of kind === 'iron' ? [0.2, h - 0.15] : [0.4, h - 0.3]) this.m(G.box, mat, cx, y, cz, along ? len : 0.06, 0.06, along ? 0.06 : len);
    if (kind === 'mesh') { const p = this.m(G.box, lam({ color: 0x8a8d98, transparent: true, opacity: 0.35 }), cx, h / 2, cz, along ? len : 0.02, h, along ? 0.02 : len); p.renderOrder = 1; }
    this.solid(cx, cz, along ? len : 0.2, along ? 0.2 : len, 0, h);
  }
  pumpkin(x, z, s = 0.45, y = 0) {
    this.m(G.sph10, tmat(T.pumpkin()), x, y + s * 0.75, z, s, s * 0.78, s);
    this.m(G.cyl6, col(0x3f6b2a), x, y + s * 1.45, z, 0.06, 0.25, 0.06);
    const f = this.m(G.plane, PFACE(), x, y + s * 0.78, z + s * 0.98, s * 1.1, s * 0.95, 1); f.renderOrder = 1;
  }
  grave(x, z, ry = 0) {
    const st = tmat(T.stone()), m = this.m(G.box, [st, st, st, st, tmat(T.grave()), st], x, 0.55, z, 0.8, 1.1, 0.22);
    m.rotation.y = ry; m.rotation.z = (rand() - 0.5) * 0.18;
    const t = this.m(G.cyl8, st, x, 1.1, z, 0.4, 0.22, 0.4); t.rotation.x = Math.PI / 2; t.rotation.y = ry; t.rotation.z = m.rotation.z;
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.3 : 0.8, q ? 0.8 : 0.3, 0, 1.2);
  }
  web(x, y, z, ry, s = 1.2) { const m = this.m(G.plane, alphaMat(T.web(), { side: THREE.DoubleSide, opacity: 0.7 }), x, y, z, s, s, 1); m.rotation.y = ry; }
  stringLights(x0, z0, x1, z1, y, colors = [0xff8a1f, 0xb18cff, 0x9be36b]) {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.7);
    for (let i = 0; i <= n; i++) { const t = i / n; this.m(G.box, glow(colors[i % colors.length]), x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * 0.5, z0 + (z1 - z0) * t, 0.12, 0.16, 0.12); }
  }
  sign(x, y, z, ry, text, bg, fg, w = 3, h = 0.75) { const m = this.m(G.plane, tmat(T.sign(text, bg, fg)), x, y, z, w, h, 1); m.rotation.y = ry; return m; }
  table(x, z, s = 1) {
    const w = tmat(T.wood()); this.m(G.box, w, x, 0.78, z, 1.4 * s, 0.08, 0.9 * s);
    for (const [a, b] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) this.m(G.box, col(0x2b2533), x + a * s, 0.38, z + b * s, 0.07, 0.76, 0.07);
    this.solid(x, z, 1.4 * s, 0.9 * s, 0, 0.82);
  }
  chair(x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(this.X(x), this.Y, this.Z(z)); g.rotation.y = ry; this.g.add(g);
    const w = tmat(T.wood()); mesh(G.box, w, 0, 0.45, 0, 0.5, 0.06, 0.5, g); mesh(G.box, w, 0, 0.75, -0.22, 0.5, 0.55, 0.05, g);
    for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) mesh(G.box, col(0x2b2533), a, 0.22, b, 0.05, 0.45, 0.05, g);
    this.solid(x, z, 0.5, 0.5, 0, 0.5);
  }
  shelf(x, z, w, ry = 0) {
    const goods = tmat(T.goods()), wd = col(0x4a3a2e);
    const g = new THREE.Group(); g.position.set(this.X(x), this.Y, this.Z(z)); g.rotation.y = ry; this.g.add(g);
    mesh(G.box, [wd, wd, wd, wd, goods, wd], 0, 0.95, 0, w, 1.9, 0.5, g);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.5 : w, q ? w : 0.5, 0, 1.9);
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
  door(hx, hz, axis, inward, y = 0, w = 1.4, h = 2.35) {
    const pivot = new THREE.Group(); pivot.position.set(this.X(hx), this.Y + y, this.Z(hz)); this.g.add(pivot);
    const wood = tmat(T.wood()), dk = col(0x3a2418);
    const px = axis === 'x' ? w / 2 : 0, pz = axis === 'x' ? 0 : w / 2;
    mesh(G.box, [dk, dk, dk, dk, wood, wood], px, h / 2, pz, axis === 'x' ? w : 0.08, h, axis === 'x' ? 0.08 : w, pivot);
    mesh(G.box, col(0xf5c542), axis === 'x' ? w - 0.2 : 0.07, 1.05, axis === 'x' ? 0.07 : w - 0.2, 0.08, 0.08, 0.08, pivot);
    mesh(G.box, col(0xf5c542), axis === 'x' ? w - 0.2 : -0.07, 1.05, axis === 'x' ? -0.07 : w - 0.2, 0.08, 0.08, 0.08, pivot);
    const s = axis === 'x' ? this.solid(hx + w / 2, hz, w, 0.16, y, h) : this.solid(hx, hz + w / 2, 0.16, w, y, h);
    const d = { pivot, solid: s, open: false, ang: 0, inward, x: this.X(hx + px), z: this.Z(hz + pz), y: this.Y + y };
    W.doors.push(d); return d;
  }

  /* ---------- здание с интерьером ---------- */
  house(o) {
    const { x, z, w, d } = o, h = o.h ?? 3.4, t = 0.25, upper = o.upper ?? 0, base = o.wall ?? 0x7c6a9c;
    const lit = o.lit ?? 0.45, brick = o.brick !== false;
    const occ = { mats: [], boxes: [], op: 1, inside: null };
    const inner = tmat(o.inner ? o.inner : T.plaster());
    const plain = own({ color: base });
    occ.mats.push(plain);
    const dw = o.doorW ?? 1.4, dh = 2.35;
    const sides = { s: { len: w, at: z + d - t / 2, axis: 'x', out: 4, inn: 5 }, n: { len: w, at: z + t / 2, axis: 'x', out: 5, inn: 4 },
      e: { len: d, at: x + w - t / 2, axis: 'z', out: 0, inn: 1 }, w: { len: d, at: x + t / 2, axis: 'z', out: 1, inn: 0 } };
    const doors = o.doors || (o.door ? [o.door] : []);
    for (const [k, sd] of Object.entries(sides)) {
      const dr = doors.find(q => q.side === k);
      const g0 = dr ? dr.at * sd.len - dw / 2 : 0, g1 = g0 + dw;
      const fac = facade(base, sd.len, h, { door: dr ? [g0, g1] : null, lit, brick, windows: o.windows !== false });
      // u — координата вдоль фасада (как в текстуре); переводим в мировую по стороне
      const U = u => k === 's' ? [x + u, sd.at] : k === 'n' ? [x + w - u, sd.at] : k === 'e' ? [sd.at, z + d - u] : [sd.at, z + u];
      const pieces = dr ? [[0, g0, 0, h], [g1, sd.len, 0, h], [g0, g1, dh, h]] : [[0, sd.len, 0, h]];
      for (const [a, b, y0, y1] of pieces) {
        if (b - a < 0.01) continue;
        const ft = fac.clone(); ft.needsUpdate = true; ft.repeat.set((b - a) / sd.len, (y1 - y0) / h); ft.offset.set(a / sd.len, y0 / h);
        const fm = own({ map: ft }), im = own({ map: inner.map });
        occ.mats.push(fm, im);
        const mats = [plain, plain, plain, plain, plain, plain]; mats[sd.out] = fm; mats[sd.inn] = im;
        const [bx, bz] = U((a + b) / 2), len = b - a, hh = y1 - y0;
        const bw = sd.axis === 'x' ? len : t, bd = sd.axis === 'x' ? t : len;
        this.m(G.box, mats, bx, y0 + hh / 2, bz, bw, hh, bd);
        this.solid(bx, bz, bw, bd, y0, hh);
        occ.boxes.push(this.aabb(bx, bz, bw, bd, y0, hh));
      }
      if (dr) {
        const e0 = U(g0), e1 = U(g1);
        const hinge = sd.axis === 'x' ? [Math.min(e0[0], e1[0]), sd.at] : [sd.at, Math.min(e0[1], e1[1])];
        const inward = { s: 1, n: -1, e: -1, w: 1 }[k];
        this.door(hinge[0], hinge[1], sd.axis, inward, 0, dw, dh);
        if (dr.sign) {
          const [cx, cz] = U((g0 + g1) / 2), off = t / 2 + 0.03, nrm = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[k];
          this.sign(cx + nrm[0] * off, dh + 0.45, cz + nrm[1] * off, { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[k], ...dr.sign, 2.2, 0.55);
        }
      }
    }
    // пол и потолок
    const fl = this.m(G.plane, tmat(rep(o.floor || T.floorWood(), w / 3, d / 3)), x + w / 2, 0.02, z + d / 2, w - 0.1, d - 0.1, 1); fl.rotation.x = -Math.PI / 2;
    let top = h + 0.2;
    const roofM = own({ map: T.roof() }); occ.mats.push(roofM);
    if (upper > 0) {
      const fs = ['e', 'w', 's', 'n'].map(k => { const len = k === 'e' || k === 'w' ? d : w; const m = own({ map: facade(base, len, upper, { lit, brick }) }); occ.mats.push(m); return m; });
      this.m(G.box, [fs[0], fs[1], roofM, plain, fs[2], fs[3]], x + w / 2, h + upper / 2, z + d / 2, w, upper, d);
      this.solid(x + w / 2, z + d / 2, w, d, h, upper);
      occ.boxes.push(this.aabb(x + w / 2, z + d / 2, w, d, h, upper));
      top = h + upper;
    } else {
      this.m(G.box, [plain, plain, roofM, inner, plain, plain], x + w / 2, h + 0.1, z + d / 2, w + 0.1, 0.2, d + 0.1);
      this.solid(x + w / 2, z + d / 2, w + 0.1, d + 0.1, h, 0.2);
      occ.boxes.push(this.aabb(x + w / 2, z + d / 2, w + 0.1, d + 0.1, h, 0.2));
    }
    // парапет
    if (o.parapet !== false) {
      const pm = own({ color: 0x3a3046 }); occ.mats.push(pm);
      const lad = o.ladder, gapAt = lad ? lad.at : -1;
      const edges = { s: [x + w / 2, z + d - 0.1, w, 0.2], n: [x + w / 2, z + 0.1, w, 0.2], e: [x + w - 0.1, z + d / 2, 0.2, d], w: [x + 0.1, z + d / 2, 0.2, d] };
      for (const [k, [cx, cz, ew, ed]] of Object.entries(edges)) {
        if (lad && lad.side === k) {
          const along = k === 's' || k === 'n', len = along ? w : d, gc = gapAt * len, g0 = gc - 0.7, g1 = gc + 0.7;
          for (const [a, b] of [[0, g0], [g1, len]]) {
            if (b - a < 0.05) continue;
            const c = (a + b) / 2;
            const px = along ? x + c : cx, pz = along ? cz : z + c;
            this.m(G.box, pm, px, top + 0.25, pz, along ? b - a : 0.2, 0.5, along ? 0.2 : b - a); this.solid(px, pz, along ? b - a : 0.2, along ? 0.2 : b - a, top, 0.5);
          }
        } else { this.m(G.box, pm, cx, top + 0.25, cz, ew, 0.5, ed); this.solid(cx, cz, ew, ed, top, 0.5); }
      }
    }
    if (o.ladder) {
      const k = o.ladder.side, at = o.ladder.at;
      const lx = k === 'e' ? x + w : k === 'w' ? x : x + at * w, lz = k === 's' ? z + d : k === 'n' ? z : z + at * d;
      this.ladder(lx, lz, k, top);
    }
    if (o.roof) this.zone('roof', x + 0.8, z + 0.8, x + w - 0.8, z + d - 0.8, top);
    if (o.sign) this.sign(x + w / 2, h - 0.5, z + d + 0.02, 0, ...o.sign, Math.min(w * 0.7, 4.5), 0.75);
    if (o.awning) { const a = this.m(G.box, tmat(T.awning(...o.awning)), x + w / 2, 2.75, z + d + 0.6, w - 0.6, 0.12, 1.2); a.rotation.x = 0.25; }
    const ix0 = x + t + 0.05, iz0 = z + t + 0.05, ix1 = x + w - t - 0.05, iz1 = z + d - t - 0.05;
    occ.inside = { x0: this.X(ix0), z0: this.Z(iz0), x1: this.X(ix1), z1: this.Z(iz1), y0: this.Y - 0.2, y1: this.Y + h };
    W.occluders.push(occ);
    if (o.zoneInside !== false) this.zone('inside', ix0 + 0.4, iz0 + 0.4, ix1 - 0.4, iz1 - 0.4);
    const info = { x0: ix0, z0: iz0, x1: ix1, z1: iz1, top, h };
    if (o.interior) o.interior(this, info);
    if (HW && o.web !== false) this.web(ix0 + 0.4, h - 0.4, iz0 + 0.02, 0, 1);
    return info;
  }
  aabb(cx, cz, w, d, y0, h) {
    return new THREE.Box3(new V3(this.X(cx - w / 2), this.Y + y0, this.Z(cz - d / 2)), new V3(this.X(cx + w / 2), this.Y + y0 + h, this.Z(cz + d / 2)));
  }
}

let _lm, _wm, _pf;
const LIGHTMAT = () => _lm || (_lm = alphaMat(T.light(), { blending: THREE.AdditiveBlending, color: 0xffffff }));
export const WATERMAT = () => _wm || (_wm = lam({ map: T.water(), transparent: true, opacity: 0.85 }));
export const PFACE = () => _pf || (_pf = new THREE.MeshBasicMaterial({ map: T.pumpkinFace(), transparent: true, alphaTest: 0.5 }));
