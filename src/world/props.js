import { THREE, G, compose, col, tmat, lam, glow } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { HW } from '../config.js';

/* Детальные модели пропсов. Каждая собирается из примитивов один раз и дальше
   копируется (compose): деталей много, а отрисовок на модель — по одной на материал.
   Ось +z модели — «перед» (у тележки — куда она едет, ручка сзади). */

const WIRE = () => lam({ map: T.wire(), alphaTest: 0.5, side: THREE.DoubleSide }, 'wire');
const TAPER_BIN = new THREE.CylinderGeometry(0.34, 0.28, 1, 10);
const TAPER_POLE = new THREE.CylinderGeometry(0.045, 0.075, 1, 8);
const HALF_SPH = new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2);
const TUB = (() => { const g = G.box.clone(), a = g.attributes.position; for (let i = 0; i < a.count; i++) if (a.getY(i) > 0) { a.setX(i, a.getX(i) * 1.35); a.setZ(i, a.getZ(i) * 1.3 + 0.08); } g.computeVertexNormals(); return g; })();
const TORUS_W = new THREE.TorusGeometry(1, 0.32, 5, 12);

// Магазинная тележка: сетчатая корзина на раме, нижняя полка, ручка с красной накладкой, 4 колёсика
export function cartModel() {
  return compose('cart', add => {
    const m = col(0xb8bcc8), dk = col(0x23202a), red = col(0xd8243a), w = WIRE();
    const yb = 0.45, yt = 1.0, zf = 0.45, zb = -0.5, xw = 0.3;
    // сетка корзины
    add(G.plane, w, 0, yb, (zf + zb) / 2, xw * 2, zf - zb, 1, -Math.PI / 2);
    for (const s of [-1, 1]) add(G.plane, w, s * xw, (yb + yt) / 2, (zf + zb) / 2, zf - zb, yt - yb, 1, 0, Math.PI / 2);
    add(G.plane, w, 0, (yb + yt) / 2, zf, xw * 2, yt - yb, 1);
    add(G.plane, w, 0, (yb + yt) / 2 + 0.02, zb, xw * 2, yt - yb - 0.04, 1, 0.12);
    add(G.plane, w, 0, 0.2, -0.02, 0.48, 0.8, 1, -Math.PI / 2);
    // рама корзины
    for (const y of [yb, yt]) { for (const s of [-1, 1]) add(G.box, m, s * xw, y, (zf + zb) / 2, 0.03, 0.03, zf - zb + 0.03); add(G.box, m, 0, y, zf, xw * 2 + 0.03, 0.03, 0.03); add(G.box, m, 0, y, zb, xw * 2 + 0.03, 0.03, 0.03); }
    for (const sx of [-1, 1]) for (const z of [zf, zb]) add(G.box, m, sx * xw, (yb + yt) / 2, z, 0.03, yt - yb, 0.03);
    // ручка
    for (const s of [-1, 1]) add(G.box, m, s * xw, yt + 0.06, zb - 0.09, 0.03, 0.03, 0.22, -0.55);
    add(G.cyl8, red, 0, yt + 0.12, zb - 0.19, 0.035, xw * 2 + 0.04, 0.035, 0, 0, Math.PI / 2);
    add(G.box, red, 0, yt - 0.12, zf + 0.012, 0.22, 0.1, 0.01);
    // шасси и стойки
    for (const s of [-1, 1]) { add(G.box, m, s * 0.24, 0.17, -0.03, 0.035, 0.035, 0.9); add(G.box, m, s * 0.27, 0.31, zb + 0.04, 0.03, 0.3, 0.03); add(G.box, m, s * 0.26, 0.31, zf - 0.08, 0.03, 0.32, 0.03, 0.35); }
    // колёсики с вилками
    for (const sx of [-1, 1]) for (const z of [0.36, -0.42]) {
      add(G.box, dk, sx * 0.24, 0.12, z, 0.02, 0.09, 0.07);
      add(G.cyl8, dk, sx * 0.24, 0.07, z, 0.07, 0.035, 0.07, 0, 0, Math.PI / 2);
      add(G.cyl6, m, sx * 0.24, 0.07, z, 0.025, 0.045, 0.025, 0, 0, Math.PI / 2);
    }
  });
}

// Строительная тачка: корыто с бортиком, колесо с шиной на вилке, ручки с резиной, две ножки
export function barrowModel() {
  return compose('barrow', add => {
    const g = col(0x3a7a4a), dk = col(0x2b2533), rub = col(0x17141c), mt = col(0x8a8d98);
    add(TUB, g, 0, 0.6, 0.08, 0.5, 0.3, 0.62);
    add(G.box, tmat(T.dirt()), 0, 0.7, 0.12, 0.6, 0.04, 0.76);
    for (const s of [-1, 1]) add(G.box, col(0x2e6a3c), s * 0.345, 0.76, 0.12, 0.04, 0.05, 0.86);
    add(G.box, col(0x2e6a3c), 0, 0.76, 0.56, 0.7, 0.05, 0.04); add(G.box, col(0x2e6a3c), 0, 0.76, -0.31, 0.7, 0.05, 0.04);
    // колесо
    add(TORUS_W, rub, 0, 0.2, 0.62, 0.17, 0.17, 0.2, 0, Math.PI / 2);
    add(G.cyl8, mt, 0, 0.2, 0.62, 0.09, 0.1, 0.09, 0, 0, Math.PI / 2);
    for (const s of [-1, 1]) add(G.box, dk, s * 0.08, 0.32, 0.55, 0.025, 0.3, 0.025, -0.4);
    // ручки, ножки
    for (const s of [-1, 1]) {
      add(G.box, dk, s * 0.24, 0.48, 0.0, 0.04, 0.04, 1.35, 0.17);
      add(G.cyl8, rub, s * 0.24, 0.6, -0.72, 0.03, 0.18, 0.03, Math.PI / 2 + 0.17);
      add(G.box, dk, s * 0.22, 0.2, -0.22, 0.035, 0.42, 0.035, 0, 0, s * 0.12);
      add(G.box, dk, s * 0.24, 0.02, -0.24, 0.06, 0.03, 0.12);
    }
  });
}

// Уличная урна: сужающийся рифлёный корпус с наклейкой, обод, куполная крышка с окошком, пакет внутри
export function binModel() {
  return compose('bin', add => {
    const c = 0x2e5a44, body = tmat(T.binBody(c)), dk = col(0x1e3a2c);
    add(TAPER_BIN, body, 0, 0.47, 0, 1, 0.86, 1);
    add(G.cyl8, dk, 0, 0.04, 0, 0.3, 0.08, 0.3);
    add(G.torus, dk, 0, 0.9, 0, 0.35, 0.35, 0.3, Math.PI / 2);
    add(HALF_SPH, col(0x2e5a44), 0, 0.9, 0, 0.35, 0.2, 0.35);
    add(G.box, col(0x0c0a10), 0, 0.98, 0.25, 0.32, 0.12, 0.12, -0.5);
    add(G.torus, tmat(T.trashBag()), 0, 0.92, 0, 0.27, 0.27, 0.25, Math.PI / 2);
  });
}

// Ящик из досок: короб с текстурой досок + рейки по рёбрам и раскос (единичный размер, масштабируется)
export function crateModel() {
  return compose('crate', add => {
    const body = tmat(T.crate()), wd = tmat(T.wood());
    add(G.box, body, 0, 0, 0, 0.92, 0.92, 0.92);
    const e = 0.47, t = 0.05, b = 0.1;
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const along = sx === 0;
      for (const o of [-1, 1]) add(G.box, wd, along ? o * (e - b / 2) : sx * e, 0, along ? sz * e : o * (e - b / 2), along ? b : t, 0.94, along ? t : b);
      for (const y of [-1, 1]) add(G.box, wd, sx * e, y * (e - b / 2), sz * e, along ? 0.94 : t, b, along ? t : 0.94);
    }
    for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const along = sx === 0; add(G.box, wd, sx * (e + 0.01), 0, sz * (e + 0.01), along ? 1.05 : t * 0.8, b * 0.9, along ? t * 0.8 : 1.05, along ? 0 : 0.78, 0, along ? 0.78 : 0); }
    for (const y of [-1, 1]) for (const o of [-1, 1]) add(G.box, wd, o * (e - b / 2), y * e, 0, b, t, 0.94);
  });
}

// Офисный/уличный стул (предмет для броска): металлический каркас, деревянное сиденье и спинка из реек
export function chairModel() {
  return compose('chairItem', add => {
    const w = tmat(T.wood()), m = col(0x2b2533);
    add(G.box, w, 0, 0.15, 0.02, 0.46, 0.05, 0.44);
    for (const y of [0.36, 0.52, 0.66]) add(G.box, w, 0, y, -0.22, 0.44, 0.09, 0.03, -0.08);
    for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) add(G.box, m, a, -0.09, b, 0.035, 0.46, 0.035);
    for (const a of [-0.21, 0.21]) { add(G.box, m, a, 0.42, -0.23, 0.03, 0.56, 0.03, -0.08); add(G.box, m, a, -0.2, 0, 0.025, 0.025, 0.4); }
    add(G.box, m, 0, -0.2, 0.2, 0.4, 0.025, 0.025);
  });
}

// Дорожный конус: конус со светоотражающими полосами на квадратной резиновой подошве
export function coneModel() {
  return compose('coneItem', add => {
    const o = col(0xff6a1a), wt = col(0xf1e8ff);
    add(G.cone8, o, 0, 0.06, 0, 0.19, 0.56, 0.19);
    add(G.cyl8, wt, 0, 0.08, 0, 0.128, 0.08, 0.128); add(G.cyl8, wt, 0, -0.06, 0, 0.158, 0.06, 0.158);
    add(G.box, col(0x2b2026), 0, -0.22, 0, 0.42, 0.05, 0.42); add(G.box, o, 0, -0.18, 0, 0.3, 0.04, 0.3);
  });
}

/* ---------- статичный декор (строится Builder'ом, потом склеивается в общие куски) ---------- */
const FLOWERS = HW ? [0xff8a1f, 0xb18cff, 0xf1e8ff, 0xd8243a, 0xf5c542] : [0xff5a6e, 0xf5c542, 0xf1e8ff, 0xb18cff, 0x4ab0f0];

export const PropMethods = {
  // Бетонная клумба: корпус, бортик, земля и растения (flowers | shrub | grass | tree)
  planter(x, z, w, d, h = 0.5, kind = 'flowers') {
    const st = tmat(T.planter()), rim = col(0x9a94a4);
    this.m(G.box, st, x, h / 2, z, w, h, d);
    for (const [cx, cz, ww, dd] of [[x, z - d / 2 + 0.07, w + 0.06, 0.16], [x, z + d / 2 - 0.07, w + 0.06, 0.16], [x - w / 2 + 0.07, z, 0.16, d - 0.2], [x + w / 2 - 0.07, z, 0.16, d - 0.2]]) this.m(G.box, rim, cx, h + 0.03, cz, ww, 0.08, dd);
    this.m(G.box, tmat(T.soil()), x, h - 0.02, z, w - 0.26, 0.05, d - 0.26);
    this.solid(x, z, w, d, 0, h + 0.07);
    const iw = w - 0.4, id = d - 0.4, top = h + 0.02;
    if (kind === 'tree') { this.tree(x, z, 0.75, top); return; }
    if (kind === 'shrub') {
      const n = Math.max(2, Math.round(iw * id * 1.2)), lm = tmat(T.bush());
      for (let i = 0; i < n; i++) { const s = 0.35 + Math.random() * 0.25; const o = this.m(G.ico, lm, x + (Math.random() - 0.5) * iw, top + s * 0.6, z + (Math.random() - 0.5) * id, s, s * 0.85, s); o.rotation.y = Math.random() * 3; }
    }
    if (kind === 'grass') {
      const gm = col(0x6a7a3a), gm2 = col(0x8a8a4a);
      for (let i = 0; i < iw * id * 30; i++) { const b2 = this.m(G.box, i % 2 ? gm : gm2, x + (Math.random() - 0.5) * iw, top + 0.25, z + (Math.random() - 0.5) * id, 0.025, 0.5 + Math.random() * 0.25, 0.025); b2.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 3, (Math.random() - 0.5) * 0.6); }
    }
    if (kind === 'flowers' || kind === 'shrub') {
      const n = Math.round(iw * id * (kind === 'flowers' ? 9 : 3)), leaf = tmat(T.leaves(2)), stem = col(0x3a5a2a);
      for (let i = 0; i < n; i++) {
        const fx = x + (Math.random() - 0.5) * iw, fz = z + (Math.random() - 0.5) * id, hh = 0.18 + Math.random() * 0.18;
        if (kind === 'flowers') { const l = this.m(G.ico, leaf, fx, top + 0.06, fz, 0.13, 0.07, 0.13); l.rotation.y = Math.random() * 3; }
        this.m(G.box, stem, fx, top + hh / 2, fz, 0.015, hh, 0.015);
        const c = FLOWERS[(Math.random() * FLOWERS.length) | 0], bl = this.m(G.ico, col(c), fx, top + hh + 0.03, fz, 0.055, 0.04, 0.055); bl.rotation.y = Math.random() * 3;
      }
    }
  },
  // Парковая скамейка: чугунные боковины с подлокотниками, рейки сиденья и наклонной спинки
  bench(x, z, ry = 0) {
    const g = this.prop(x, z, ry), w = tmat(T.wood()), dk = col(0x2b2533);
    const add = (geo, m, px, py, pz, sx, sy, sz, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.x = rx; g.add(o); };
    for (const zz of [-0.18, -0.06, 0.06, 0.18]) add(G.box, w, 0, 0.47, zz, 1.9, 0.05, 0.1);
    for (const [yy, zz] of [[0.66, -0.27], [0.8, -0.3], [0.94, -0.33]]) add(G.box, w, 0, yy, zz, 1.9, 0.1, 0.04, -0.22);
    for (const o of [-0.85, 0.85]) {
      const s = (geo, px, py, pz, sx, sy, sz, rx) => { const q = new THREE.Mesh(geo, dk); q.position.set(o + px, py, pz); q.scale.set(sx, sy, sz); q.rotation.x = rx || 0; g.add(q); };
      s(G.box, 0, 0.22, 0.2, 0.06, 0.46, 0.06, -0.15); s(G.box, 0, 0.5, -0.26, 0.06, 1.0, 0.06, -0.22);
      s(G.box, 0, 0.44, -0.02, 0.06, 0.05, 0.5); s(G.box, 0, 0.66, 0.0, 0.06, 0.05, 0.46); s(G.box, 0, 0.56, 0.22, 0.05, 0.2, 0.05);
      s(G.cyl8, 0, 0.66, 0.24, 0.045, 0.06, 0.045, Math.PI / 2); s(G.box, 0, 0.02, 0.24, 0.12, 0.04, 0.12); s(G.box, 0, 0.02, -0.38, 0.12, 0.04, 0.12);
    }
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.6 : 2, q ? 2 : 0.6, 0, 0.55);
    return g;
  },
  // Фонарь: постамент, сужающаяся опора с кольцом, изогнутый кронштейн и фонарь с колпаком
  lamp(x, z, ry = 0) {
    const d = col(0x2b2533), mt = tmat(T.metal());
    this.m(G.cyl8, mt, x, 0.2, z, 0.17, 0.4, 0.17); this.m(G.cyl8, d, x, 0.43, z, 0.13, 0.06, 0.13);
    this.m(TAPER_POLE, d, x, 1.9, z, 1, 3.0, 1); this.m(G.cyl8, d, x, 2.6, z, 0.08, 0.06, 0.08); this.m(G.sph, d, x, 3.42, z, 0.07, 0.07, 0.07);
    const dx = Math.sin(ry), dz = Math.cos(ry);
    const arm = this.m(G.box, d, x + dx * 0.32, 3.36, z + dz * 0.32, 0.05, 0.05, 0.62); arm.rotation.y = ry;
    const br = this.m(G.box, d, x + dx * 0.12, 3.18, z + dz * 0.12, 0.04, 0.04, 0.42); br.rotation.y = ry; br.rotation.x = 0.8;
    const lx = x + dx * 0.6, lz = z + dz * 0.6;
    this.m(G.box, d, lx, 3.3, lz, 0.05, 0.12, 0.05);
    const cap = this.m(G.cone4, d, lx, 3.27, lz, 0.26, 0.14, 0.26); cap.rotation.y = Math.PI / 4 + ry;
    this.m(G.box, glow(0xfff0c8), lx, 3.1, lz, 0.22, 0.2, 0.22);
    this.m(G.box, d, lx, 2.98, lz, 0.26, 0.04, 0.26);
    this.light(lx, lz, 3.2);
    this.solid(x, z, 0.35, 0.35, 0, 3.4);
  },
  // Столбик-ограничитель со светоотражающей полосой
  bollard(x, z) {
    const d = col(0x2b2533); this.m(G.cyl8, d, x, 0.45, z, 0.1, 0.9, 0.1); this.m(G.cyl8, col(0xf5c542), x, 0.78, z, 0.105, 0.08, 0.105); this.m(G.sph, d, x, 0.9, z, 0.1, 0.05, 0.1);
    this.solid(x, z, 0.22, 0.22, 0, 0.9);
  },
  // Мешки с мусором у стены (можно перепрыгнуть)
  trashBags(x, z, n = 3) {
    const m = tmat(T.trashBag());
    for (let i = 0; i < n; i++) { const s = 0.28 + Math.random() * 0.12, b = this.m(G.ico, m, x + (i - (n - 1) / 2) * 0.45 + (Math.random() - 0.5) * 0.1, s * 0.75, z + (Math.random() - 0.5) * 0.3, s, s * 0.85, s); b.rotation.set(Math.random(), Math.random() * 3, Math.random() * 0.4);
      this.m(G.cone4, m, b.position.x - this.ox, s * 1.5, b.position.z - this.oz, 0.08, 0.14, 0.08); }
    this.solid(x, z, n * 0.45, 0.6, 0, 0.5);
  },
  // Велосипед у стойки (декор): колёса-кольца, рама, седло, руль
  bicycle(x, z, ry = 0, c = 0x3a7ac8) {
    const g = this.prop(x, z, ry), fr = col(c), dk = col(0x17141c), mt = col(0x8a8d98);
    const add = (geo, m, px, py, pz, sx, sy, sz, rx = 0, ryy = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.set(rx, ryy, rz); g.add(o); };
    for (const zz of [-0.5, 0.5]) { add(TORUS_W, dk, 0, 0.34, zz, 0.32, 0.32, 0.12, 0, Math.PI / 2); add(G.cyl6, mt, 0, 0.34, zz, 0.03, 0.08, 0.03, 0, 0, Math.PI / 2); }
    add(G.box, fr, 0, 0.55, 0.05, 0.04, 0.04, 0.75, -0.25); add(G.box, fr, 0, 0.5, -0.16, 0.04, 0.5, 0.04, 0.35); add(G.box, fr, 0, 0.45, -0.32, 0.03, 0.03, 0.4, 0.5);
    add(G.box, fr, 0, 0.55, 0.42, 0.035, 0.45, 0.035, -0.3); add(G.box, dk, 0, 0.78, -0.2, 0.12, 0.04, 0.24); add(G.box, mt, 0, 0.82, 0.38, 0.5, 0.03, 0.03);
    add(G.cyl8, dk, 0, 0.36, -0.02, 0.07, 0.03, 0.07, 0, 0, Math.PI / 2);
    return g;
  },
  // Велопарковка-«волна» на несколько мест, часть с велосипедами
  bikeRack(x, z, n = 4, ry = 0) {
    const mt = col(0x8a8d98), along = Math.abs(Math.sin(ry)) < 0.5;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * 0.8, px = x + (along ? o : 0), pz = z + (along ? 0 : o);
      const t = this.m(new THREE.TorusGeometry(1, 0.08, 4, 10, Math.PI), mt, px, 0, pz, 0.38, 0.75, 0.38); t.rotation.y = along ? Math.PI / 2 : 0;
      if (i % 2 === 0 && Math.random() < 0.8) this.bicycle(px + (along ? 0.0 : 0.25), pz + (along ? 0.25 : 0), along ? 0 : Math.PI / 2, [0x3a7ac8, 0xd8243a, 0xf5c542, 0x6aa84f][i % 4]);
    }
    this.solid(x, z, along ? n * 0.8 : 0.3, along ? 0.3 : n * 0.8, 0, 0.8);
  },
  // Газетный киоск-автомат
  newsBox(x, z, ry = 0, c = 0x305c88) {
    const g = this.prop(x, z, ry), b = col(c), dk = col(0x17141c);
    const add = (geo, m, px, py, pz, sx, sy, sz, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.x = rx; g.add(o); };
    add(G.box, b, 0, 0.55, 0, 0.5, 0.7, 0.45); add(G.box, b, 0, 0.98, -0.05, 0.52, 0.12, 0.52, 0.25);
    add(G.box, tmat(T.sign('ГАЗЕТА', '#f1e8ff', '#17111f')), 0, 0.72, 0.226, 0.4, 0.24, 0.01); add(G.box, dk, 0, 0.42, 0.226, 0.36, 0.05, 0.01);
    for (const sx of [-0.2, 0.2]) add(G.box, dk, sx, 0.1, 0, 0.04, 0.2, 0.4);
    this.solid(x, z, 0.5, 0.5, 0, 1.05);
  },
  // Почтовый ящик на ножке
  postBox(x, z, ry = 0) {
    const g = this.prop(x, z, ry), b = col(0x2a5aa8), dk = col(0x17141c);
    const add = (geo, m, px, py, pz, sx, sy, sz, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rz); g.add(o); };
    add(G.box, dk, 0, 0.3, 0, 0.12, 0.6, 0.12); add(G.box, b, 0, 0.9, 0, 0.5, 0.6, 0.42); add(G.cyl12, b, 0, 1.2, 0, 0.25, 0.42, 0.25, Math.PI / 2, 0); add(G.box, dk, 0, 1.0, 0.215, 0.3, 0.04, 0.01);
    add(G.box, tmat(T.sign('ПОЧТА', '#2a5aa8', '#f5c542')), 0, 0.8, 0.215, 0.36, 0.1, 0.01);
    this.solid(x, z, 0.5, 0.45, 0, 1.4);
  },
  // Указатель с табличками улиц
  streetSign(x, z, a = 'ЛЕСНАЯ', b2 = 'ТЫКВЕННЫЙ ПР.') {
    const d = col(0x2b2533); this.m(G.cyl6, d, x, 1.4, z, 0.04, 2.8, 0.04); this.solid(x, z, 0.12, 0.12, 0, 2.8);
    this.m(G.box, tmat(T.sign(a, '#2a6a4a', '#f1e8ff')), x + 0.4, 2.65, z, 0.8, 0.18, 0.03);
    this.m(G.box, tmat(T.sign(b2, '#2a6a4a', '#f1e8ff')), x, 2.42, z + 0.4, 0.03, 0.18, 0.8);
  },
  // Пикниковый стол со скамьями (на него можно запрыгнуть)
  picnic(x, z, ry = 0) {
    const g = this.prop(x, z, ry), w = tmat(T.wood());
    const add = (px, py, pz, sx, sy, sz, rx = 0) => { const o = new THREE.Mesh(G.box, w); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.x = rx; g.add(o); };
    for (const zz of [-0.24, -0.08, 0.08, 0.24]) add(0, 0.76, zz, 1.8, 0.05, 0.14);
    for (const s of [-1, 1]) { add(0, 0.45, s * 0.62, 1.8, 0.05, 0.26); for (const xx of [-0.7, 0.7]) { add(xx, 0.38, s * 0.22, 0.07, 0.8, 0.07, s * 0.55); } add(0, 0.42, 0, 0.07, 0.07, 1.5); }
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.7 : 1.8, q ? 1.8 : 0.7, 0, 0.8);
  },
  // Тюки сена (по ним можно забраться): нижний ряд и верхний
  hayBales(x, z, n = 3, ry = 0) {
    const hm = tmat(T.hay()), along = Math.abs(Math.sin(ry)) < 0.5;
    for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 1.25; this.box(x + (along ? o : 0), z + (along ? 0 : o), along ? 1.2 : 0.8, along ? 0.8 : 1.2, 0.7, hm); }
    if (n > 1) this.box(x, z, along ? 1.2 : 0.8, along ? 0.8 : 1.2, 0.7, hm, { y: 0.7 });
  },
  // Пугало (сезонный декор)
  scarecrow(x, z, ry = 0) {
    const g = this.prop(x, z, ry), wd = tmat(T.bark()), cl = tmat(T.tunic());
    const add = (geo, m, px, py, pz, sx, sy, sz, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.z = rz; g.add(o); };
    add(G.box, wd, 0, 1.1, 0, 0.08, 2.2, 0.08); add(G.box, wd, 0, 1.55, 0, 1.6, 0.07, 0.07);
    add(G.box, cl, 0, 1.3, 0, 0.55, 0.65, 0.3); for (const s2 of [-1, 1]) add(G.box, cl, s2 * 0.5, 1.55, 0, 0.5, 0.18, 0.2);
    add(G.sph10, tmat(T.pumpkin()), 0, 1.95, 0, 0.26, 0.22, 0.26); add(G.cone8, col(0x6a4a24), 0, 2.25, 0, 0.32, 0.3, 0.32);
    add(G.cyl12, col(0x6a4a24), 0, 2.12, 0, 0.42, 0.03, 0.42); for (const s2 of [-1, 1]) add(G.cone4, tmat(T.hay()), s2 * 0.78, 1.5, 0, 0.08, 0.18, 0.08, s2 * 1.5);
    this.solid(x, z, 0.3, 0.3, 0, 2.2);
  },
  // Биотуалет на стройке
  potty(x, z, ry = 0) {
    const g = this.prop(x, z, ry), b = col(0x2a7ac8);
    const add = (geo, m, px, py, pz, sx, sy, sz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); };
    add(G.box, [b, b, col(0xd8d8e0), b, tmat(T.potty()), b], 0, 1.15, 0, 1.1, 2.3, 1.1); add(G.box, col(0xd8d8e0), 0, 2.36, 0, 1.2, 0.1, 1.2);
    add(G.box, col(0x1e5a98), 0, 0.04, 0, 1.2, 0.08, 1.2);
    this.solid(x, z, 1.15, 1.15, 0, 2.4);
  },
  // Поддон с мешками цемента
  cementPallet(x, z) {
    this.pallet(x, z, 1.4, 1.1); const bm = tmat(T.cementBag());
    for (let l = 0; l < 3; l++) for (let i = 0; i < 2; i++) { const bg = this.m(G.box, bm, x + (i - 0.5) * 0.65, 0.26 + l * 0.18, z + (l % 2 ? 0.1 : -0.1), 0.62, 0.17, 0.9); bg.rotation.y = (Math.random() - 0.5) * 0.1; }
    this.solid(x, z, 1.4, 1.1, 0.18, 0.55);
  },
  // Стопка шин
  tires(x, z, n = 4) {
    const t = col(0x17141c), hub = col(0x3a3440);
    for (let i = 0; i < n; i++) { this.m(TORUS_W, t, x + (Math.random() - 0.5) * 0.06, 0.13 + i * 0.25, z, 0.36, 0.36, 0.4, Math.PI / 2).rotation.x = Math.PI / 2; this.m(G.cyl12, hub, x, 0.13 + i * 0.25, z, 0.22, 0.2, 0.22); }
    this.solid(x, z, 0.85, 0.85, 0, n * 0.25);
  },
  // Погрузчик (декор, на вилы можно запрыгнуть)
  forklift(x, z, ry = 0) {
    const g = this.prop(x, z, ry), y = col(0xe0b02a), dk = col(0x23202a), mt = col(0x8a8d98);
    const add = (geo, m, px, py, pz, sx, sy, sz, rx = 0, ryy = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.set(rx, ryy, rz); g.add(o); };
    add(G.box, y, 0, 0.65, -0.2, 1.1, 0.7, 1.6); add(G.box, dk, 0, 0.9, -0.85, 1.1, 0.6, 0.35);
    for (const s2 of [-1, 1]) { add(G.box, dk, s2 * 0.5, 1.6, 0.4, 0.05, 1.4, 0.05); add(G.box, dk, s2 * 0.5, 1.6, -0.6, 0.05, 1.4, 0.05); }
    add(G.box, dk, 0, 2.3, -0.1, 1.1, 0.06, 1.1); add(G.box, dk, 0, 1.15, 0.05, 0.4, 0.15, 0.4); add(G.cyl8, dk, 0.05, 1.45, 0.1, 0.18, 0.04, 0.18, 1.0);
    for (const s2 of [-1, 1]) add(G.box, mt, s2 * 0.35, 1.3, 0.72, 0.08, 2.4, 0.08);
    for (const s2 of [-1, 1]) add(G.box, mt, s2 * 0.25, 0.08, 1.2, 0.12, 0.05, 1.0);
    for (const [px, pz, r] of [[-0.55, 0.35, 0.32], [0.55, 0.35, 0.32], [-0.55, -0.75, 0.26], [0.55, -0.75, 0.26]]) add(G.cyl12, dk, px, r, pz, r, 0.24, r, 0, 0, Math.PI / 2);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x - (q ? 0 : 0), z, q ? 2.0 : 1.2, q ? 1.2 : 2.0, 0, 1.0);
  },
  // Детская горка-башенка: площадка, лесенка, горка, крыша
  playTower(x, z) {
    const wd = tmat(T.wood()), rd = col(0xd04a4a), pl = 1.5;
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) this.box(x + dx, z + dz, 0.14, 0.14, 2.9, wd);
    this.box(x, z, 1.8, 1.8, 0.12, wd, { y: pl - 0.12 });
    for (const [dx, dz, w, d] of [[0, -0.85, 1.7, 0.06], [-0.85, 0, 0.06, 1.7]]) this.box(x + dx, z + dz, w, d, 0.7, col(0xf5c542), { y: pl });
    const roof = this.m(G.cone4, rd, x, 3.2, z, 1.45, 0.75, 1.45); roof.rotation.y = Math.PI / 4;
    this.ladder(x + 0.9, z, 'e', pl, 0);
    const sl = this.m(G.box, col(0x4ab0f0), x, 0.85, z + 2.05, 0.7, 0.06, 2.6); sl.rotation.x = 0.55;
    for (const s2 of [-1, 1]) { const rl = this.m(G.box, col(0x2a7ac8), x + s2 * 0.36, 0.98, z + 2.05, 0.05, 0.16, 2.6); rl.rotation.x = 0.55; }
  },
  // Кладбищенский фонарь со свечой
  lantern(x, z) {
    const d = col(0x1e1a24); this.m(G.box, d, x, 0.55, z, 0.08, 1.1, 0.08); this.m(G.box, d, x, 1.15, z, 0.26, 0.04, 0.26); this.m(G.box, glow(0xffb35c), x, 1.28, z, 0.12, 0.2, 0.12);
    const c = this.m(G.cone4, d, x, 1.48, z, 0.2, 0.2, 0.2); c.rotation.y = Math.PI / 4; this.light(x, z, 1.1); this.solid(x, z, 0.2, 0.2, 0, 1.2);
  },
  // Кованая арка ворот с табличкой
  gateArch(x, z, w, text) {
    const d = col(0x1e1a24);
    for (const s2 of [-1, 1]) { this.m(G.box, tmat(T.stone()), x + s2 * w / 2, 1.3, z, 0.5, 2.6, 0.5); this.solid(x + s2 * w / 2, z, 0.5, 0.5, 0, 2.6); this.m(G.cone4, tmat(T.stone()), x + s2 * w / 2, 2.8, z, 0.38, 0.4, 0.38).rotation.y = Math.PI / 4; }
    const a = this.m(new THREE.TorusGeometry(1, 0.06, 4, 16, Math.PI), d, x, 2.6, z, w / 2, 0.8, 1); void a;
    this.sign(x, 2.95, z + 0.03, 0, text, '#1e1a24', '#c5b58b', Math.min(w * 0.7, 3), 0.35);
  },
  // Лодка у пруда (декор)
  rowboat(x, z, ry = 0) {
    const g = this.prop(x, z, ry), wd = tmat(T.wood());
    const add = (px, py, pz, sx, sy, sz, rx = 0, rzz = 0) => { const o = new THREE.Mesh(G.box, wd); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rzz); g.add(o); };
    add(0, 0.12, 0, 0.9, 0.08, 2.2); for (const s2 of [-1, 1]) add(s2 * 0.5, 0.26, 0, 0.08, 0.32, 2.2, 0, s2 * 0.25); add(0, 0.26, 1.15, 0.9, 0.3, 0.1, 0.3); add(0, 0.26, -1.15, 0.9, 0.3, 0.1, -0.3);
    add(0, 0.32, 0.2, 0.9, 0.05, 0.25); add(0.55, 0.4, -0.2, 0.05, 0.05, 1.6, 0, 0.3);
  },
  // Тёплая «уличная» деталь: электрощиток на стене / у столба
  utilityBox(x, z, ry = 0) { this.cabinet(x, z, 0.8, 0.4, 1.2, 0x6a6d78, 0, ry); this.m(G.box, tmat(T.hazard()), x, 1.05, z, Math.abs(Math.sin(ry)) > 0.5 ? 0.42 : 0.5, 0.06, Math.abs(Math.sin(ry)) > 0.5 ? 0.5 : 0.42); },
};
