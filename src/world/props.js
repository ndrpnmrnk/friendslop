import { random } from '../core/random.js';
import {buildClockTower} from './plaza-landmarks.js';
import { THREE, G, mesh, compose, col, tmat, lam, glow } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { HW } from '../config.js';
import { W } from './state.js';
import { breakBox } from './breakables.js';
import { addZone } from './physics.js';
import { addSwinger } from './swingers.js';
import { puff } from './particles.js';
import {addCanopy} from './canopies.js';

/* Детальные модели пропсов. Каждая собирается из примитивов один раз и дальше
   копируется (compose): деталей много, а отрисовок на модель — по одной на материал.
   Ось +z модели — «перед» (у тележки — куда она едет, ручка сзади). */

const WIRE = () => lam({ map: T.wire(), alphaTest: 0.5, side: THREE.DoubleSide }, 'wire');
const TAPER_BIN = new THREE.CylinderGeometry(0.34, 0.28, 1, 10);
const TAPER_POLE = new THREE.CylinderGeometry(0.045, 0.075, 1, 8);
const HALF_SPH = new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2);
const TUB = (() => { const g = G.box.clone(), a = g.attributes.position; for (let i = 0; i < a.count; i++) if (a.getY(i) > 0) { a.setX(i, a.getX(i) * 1.35); a.setZ(i, a.getZ(i) * 1.3 + 0.08); } g.computeVertexNormals(); return g; })();
const TORUS_W = new THREE.TorusGeometry(1, 0.32, 5, 12);
// Шина: профиль «скруглённый прямоугольник», вращённый вокруг оси (ось — Y), протектор в текстуре
export const TIRE_GEO = (() => { const pts = [[0.52, -0.36], [0.82, -0.42], [0.97, -0.33], [1, 0], [0.97, 0.33], [0.82, 0.42], [0.52, 0.36]].map(([r, y]) => new THREE.Vector2(r, y)); const g = new THREE.LatheGeometry(pts, 14); return g; })();
const BIKE_TYRE = new THREE.TorusGeometry(1, 0.07, 4, 18), BIKE_RIM = new THREE.TorusGeometry(1, 0.035, 3, 18);

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
export function binModel(open = false) {
  return compose(open ? 'binOpen27' : 'bin', add => {
    const c = 0x2e5a44, body = tmat(T.binBody(c)), dk = col(0x1e3a2c);
    add(TAPER_BIN, body, 0, 0.47, 0, 1, 0.86, 1);
    add(G.cyl8, dk, 0, 0.04, 0, 0.3, 0.08, 0.3);
    add(G.torus, dk, 0, 0.9, 0, 0.35, 0.35, 0.3, Math.PI / 2);
    if(!open)add(HALF_SPH, col(0x2e5a44), 0, 0.9, 0, 0.35, 0.2, 0.35);
    if(!open)add(G.box, col(0x0c0a10), 0, 0.98, 0.25, 0.32, 0.12, 0.12, -0.5);
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

// Мусорный пакет (предмет): мешок с завязкой
export function trashModel() {
  return compose('trashItem', add => { const m = tmat(T.trashBag()); add(G.ico, m, 0, -0.02, 0, 0.3, 0.26, 0.28, 0.3, 0.5); add(G.cone6, m, 0, 0.26, 0, 0.08, 0.14, 0.08); add(G.box, col(0xd8243a), 0, 0.31, 0, 0.12, 0.03, 0.03); });
}
// Мелкий мусор (v0.21): 5 видов low-poly на фото-фактурах — мятая банка, бумажный стакан, пластиковая бутылка, газетный ком, коробка из-под пиццы
export function litterModel(v = 0) {
  return compose('litter3_' + v, add => {
    if (v === 0) { add(G.cyl6, tmat(T.paintMetal(0xc83a3a)), 0, 0, 0, 0.06, 0.12, 0.06, 0.3, 0, 1.3); add(G.cyl6, col(0xd8d8e0), 0.06, 0.03, 0, 0.055, 0.02, 0.055, 0.3, 0, 1.3); }
    else if (v === 1) { add(CUP_GEO, tmat(T.cupTex()), 0, 0, 0, 0.06, 0.16, 0.06, Math.PI / 2); add(G.cyl6, col(0xf1e8ff), 0, 0.08, 0, 0.065, 0.015, 0.065, Math.PI / 2); }
    else if (v === 2) { add(G.cyl6, lam({ color: 0x8ad8a8, transparent: true, opacity: 0.7 }, 'bottleP'), 0, 0, 0, 0.055, 0.22, 0.055, 0, 0, Math.PI / 2); add(G.cyl6, col(0x3a7ac8), 0.14, 0, 0, 0.025, 0.04, 0.025, 0, 0, Math.PI / 2); add(G.box, col(0xf1e8ff), 0, 0, 0, 0.12, 0.05, 0.115, 0, 0, Math.PI / 2); }
    else if (v === 3) { add(G.ico, tmat(T.newsTex()), 0, 0, 0, 0.1, 0.085, 0.09, 0.4, 0.8); add(G.ico, tmat(T.newsTex()), 0.08, -0.02, 0.03, 0.06, 0.05, 0.06, 1.1); }
    else { add(G.box, tmat(T.cardboard()), 0, -0.04, 0, 0.36, 0.04, 0.36); add(G.box, lam({ map: T.sign('ПИЦЦА', '#d8243a', '#f1e8ff') }, 'pizzaBoxTop'), 0, -0.018, 0, 0.2, 0.004, 0.08); }
  });
}
const CUP_GEO = new THREE.CylinderGeometry(1, 0.7, 1, 6);
// Цветок в горшке (бьётся от брошенного предмета)
export function potModel() {
  return compose('potPlant', add => {
    add(new THREE.CylinderGeometry(0.22, 0.16, 0.5, 8), col(0xb05a3a), 0, -0.25, 0); add(G.cyl8, col(0x8a4428), 0, 0.0, 0, 0.235, 0.05, 0.235);
    add(G.cyl8, tmat(T.soil()), 0, 0.01, 0, 0.2, 0.02, 0.2);
    for (const [x, y, z, s2] of [[0.05, 0.25, 0, 0.24], [-0.08, 0.42, 0.05, 0.2], [0.04, 0.55, -0.06, 0.16], [-0.02, 0.18, -0.1, 0.18]]) add(G.ico, tmat(T.leaves(2)), x, y, z, s2, s2 * 1.1, s2, 0.4, x * 20);
  });
}
// Стоящая шина (катится, если толкнуть)
export function tireModel() {
  return compose('tire2', add => { add(TIRE_GEO, tmat(T.tread()), 0, 0, 0, 0.33, 0.3, 0.33, 0, 0, Math.PI / 2); add(G.cyl12, col(0x2a2630), 0, 0, 0, 0.18, 0.2, 0.18, 0, 0, Math.PI / 2); add(G.cyl8, col(0x8a8d98), 0, 0, 0, 0.08, 0.22, 0.08, 0, 0, Math.PI / 2); });
}

/* ---------- статичный декор (строится Builder'ом, потом склеивается в общие куски) ---------- */
const FLOWERS = HW ? [0xff8a1f, 0xb18cff, 0xf1e8ff, 0xd8243a, 0xf5c542] : [0xff5a6e, 0xf5c542, 0xf1e8ff, 0xb18cff, 0x4ab0f0];

export const PropMethods = {
  // Бетонная клумба: корпус, бортик, земля и растения (flowers | shrub | grass | tree)
  planter(x, z, w, d, h = 0.5, kind = 'flowers') {
    const st = tmat(T.planter()), rim = col(0x9a94a4);
    if (kind === 'flowers') W.flowerbeds.push({ x0: this.X(x - w / 2), z0: this.Z(z - d / 2), x1: this.X(x + w / 2), z1: this.Z(z + d / 2), y: this.Y, top: this.Y + h, district: this.d });
    this.m(G.box, st, x, h / 2, z, w, h, d);
    for (const [cx, cz, ww, dd] of [[x, z - d / 2 + 0.07, w + 0.06, 0.16], [x, z + d / 2 - 0.07, w + 0.06, 0.16], [x - w / 2 + 0.07, z, 0.16, d - 0.2], [x + w / 2 - 0.07, z, 0.16, d - 0.2]]) this.m(G.box, rim, cx, h + 0.03, cz, ww, 0.08, dd);
    this.m(G.box, tmat(T.soil()), x, h - 0.02, z, w - 0.26, 0.05, d - 0.26);
    this.solid(x, z, w, d, 0, h + 0.07);
    const iw = w - 0.4, id = d - 0.4, top = h + 0.02;
    if (kind === 'tree') { this.tree(x, z, 0.75, top); return; }
    if (kind === 'shrub') {
      const n = Math.max(2, Math.round(iw * id * 1.2)), lm = tmat(T.bush());
      for (let i = 0; i < n; i++) { const s = 0.35 + random() * 0.25; const o = this.m(G.ico, lm, x + (random() - 0.5) * iw, top + s * 0.6, z + (random() - 0.5) * id, s, s * 0.85, s); o.rotation.y = random() * 3; }
    }
    if (kind === 'grass') {
      const gm = col(0x6a7a3a), gm2 = col(0x8a8a4a);
      for (let i = 0; i < iw * id * 30; i++) { const b2 = this.m(G.box, i % 2 ? gm : gm2, x + (random() - 0.5) * iw, top + 0.25, z + (random() - 0.5) * id, 0.025, 0.5 + random() * 0.25, 0.025); b2.rotation.set((random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6); }
    }
    if (kind === 'flowers' || kind === 'shrub') {
      const n = Math.round(iw * id * (kind === 'flowers' ? 9 : 3)), leaf = tmat(T.leaves(2)), stem = col(0x3a5a2a);
      for (let i = 0; i < n; i++) {
        const fx = x + (random() - 0.5) * iw, fz = z + (random() - 0.5) * id, hh = 0.18 + random() * 0.18;
        if (kind === 'flowers') { const l = this.m(G.ico, leaf, fx, top + 0.06, fz, 0.13, 0.07, 0.13); l.rotation.y = random() * 3; }
        const c = FLOWERS[(random() * FLOWERS.length) | 0];
        // цветы клумбы — живые (их можно примять, бабушка их выхаживает): рисуются одним инстанс-мешем (game/town.js)
        if (kind === 'flowers') { W.flowers.push({ x: this.X(fx), y: this.Y + top, z: this.Z(fz), hh, c, k: 0, w: 0, ph: random() * 6.28, bed: W.flowerbeds[W.flowerbeds.length - 1] }); continue; }
        this.m(G.box, stem, fx, top + hh / 2, fz, 0.015, hh, 0.015);
        const bl = this.m(G.ico, col(c), fx, top + hh + 0.03, fz, 0.055, 0.04, 0.055); bl.rotation.y = random() * 3;
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
      s(G.box, 0, 0.22, 0.2, 0.06, 0.46, 0.06, -0.15); s(G.box, 0, 0.24, -0.31, 0.06, 0.48, 0.06, 0.18);s(G.box,0,.735,-.30,.06,.55,.06,-.22);
      s(G.box, 0, 0.44, -0.02, 0.06, 0.05, 0.5); s(G.box, 0, 0.66, 0.0, 0.06, 0.05, 0.46); s(G.box, 0, 0.56, 0.22, 0.05, 0.2, 0.05);
      s(G.cyl8, 0, 0.66, 0.24, 0.045, 0.06, 0.045, Math.PI / 2); s(G.box, 0, 0.02, 0.24, 0.12, 0.04, 0.12); s(G.box, 0, 0.02, -0.38, 0.12, 0.04, 0.12);
    }
    // Хэллоуин: изредка на скамейке сидит весёлый скелет (машет, нога на ногу, держит тыкву; бывает в шляпе или шарфе)
    const skel = HW && random() < (globalThis.__skel ?? 0); // v0.19: на лавочках почти не сидят — по городу ходят скелеты-NPC
    if (skel) skeleton(g, ['wave', 'cross', 'pumpkin'][(random() * 3) | 0], random() < 0.5 ? (random() < 0.5 ? 'hat' : 'scarf') : null, random() < 0.5 ? -0.4 : 0.4);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.6 : 2, q ? 2 : 0.6, 0, 0.55);
    W.benches.push({ x: this.X(x), y: this.Y, z: this.Z(z), ry: g.rotation.y, skel, riders: [] });
    if (random() < 0.1 && this.Y > -1) this.cushion(x + (q ? 0 : 0.5), z + (q ? 0.5 : 0), 0.55);
    return g;
  },
  // Фонарь: постамент, сужающаяся опора с кольцом, изогнутый кронштейн и фонарь с колпаком
  lamp(x, z, ry = 0, showVolumetricCone = true) {
    const d = col(0x2b2533), mt = tmat(T.metal());
    this.m(G.cyl8, mt, x, 0.2, z, 0.17, 0.4, 0.17); this.m(G.cyl8, d, x, 0.43, z, 0.13, 0.06, 0.13);
    this.m(TAPER_POLE, d, x, 1.9, z, 1, 3.0, 1); this.m(G.cyl8, d, x, 2.6, z, 0.08, 0.06, 0.08); this.m(G.sph, d, x, 3.42, z, 0.07, 0.07, 0.07);
    const dx = Math.sin(ry), dz = Math.cos(ry);
    const arm = this.m(G.box, d, x + dx * 0.32, 3.36, z + dz * 0.32, 0.05, 0.05, 0.62); arm.rotation.y = ry;
    const br = this.m(G.box, d, x + dx * 0.12, 3.18, z + dz * 0.12, 0.04, 0.04, 0.42); br.rotation.y = ry; br.rotation.x = 0.8;
    const lx = x + dx * 0.6, lz = z + dz * 0.6;
    this.m(G.box, d, lx, 3.3, lz, 0.05, 0.12, 0.05);
    const cap = this.m(G.cone4, d, lx, 3.27, lz, 0.26, 0.14, 0.26); cap.rotation.y = Math.PI / 4 + ry;
    this.m(G.box, d, lx, 2.98, lz, 0.26, 0.04, 0.26);
    // плафон бьётся от брошенного предмета — фонарь гаснет
    // часть фонарей мигает: у них свой материал плафона и пятна света
    const fl = random() < 0.15, bm = fl ? lam({ color: 0xfff0c8, emissive: 0xfff0c8, emissiveIntensity: 0.9 }) : glow(0xfff0c8);
    const bulb = breakBox(this.X(lx), this.Y + 3.0, this.Z(lz), 0.22, 0.2, 0.22, 'bulb', bm), pool = this.light(lx, lz, 3.2);
    if (fl) { pool.material = pool.material.clone(); W.flick.push({ mats: [bm], pool, t: random() * 5, on: true }); }
    W.keep.push(pool); bulb.onBreak = () => { pool.visible = false; pool.userData.broken = true; };
    // объёмный конус света под плафоном (v0.23): аддитивный, мягкий к краям и к земле; гаснет вместе с фонарём
    // Glow pools and lanterns remain, but no volumetric cylinder is created
    // in ANY district. Those were visible as free-floating light pillars.
    const cone=null;
    W.lamps.push({ x: this.X(x), z: this.Z(z), y: this.Y, lx: this.X(lx), lz: this.Z(lz), ry, pool, bm, bulb, cone, district: this.d });
    this.solid(x, z, 0.35, 0.35, 0, 3.4);
  },
  // Столбик-ограничитель со светоотражающей полосой
  bollard(x, z) {
    const d = col(0x2b2533); this.m(G.cyl8, d, x, 0.45, z, 0.1, 0.9, 0.1); this.m(G.cyl8, col(0xf5c542), x, 0.78, z, 0.105, 0.08, 0.105); this.m(G.sph, d, x, 0.9, z, 0.1, 0.05, 0.1);
    this.solid(x, z, 0.22, 0.22, 0, 0.9);
  },
  // Мешки с мусором у стены: это предметы — можно взять и бросить, рвутся при ударе
  trashBags(x, z, n = 3) {
    for (let i = 0; i < n; i++) this.item('trash', x + (i - (n - 1) / 2) * 0.55, z + (random() - 0.5) * 0.2, 0, random() * 3);
  },
  // Велосипед у стойки (декор): колёса-кольца, рама, седло, руль
  bicycle(x,z,ry=0,c=0x3a7ac8){return this.ride('bike',x,z,ry).mesh;},
  // Велопарковка-«волна» на несколько мест, часть с велосипедами
  bikeRack(x, z, n = 4, ry = 0) {
    const mt = col(0x8a8d98), along = Math.abs(Math.sin(ry)) < 0.5;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * 0.8, px = x + (along ? o : 0), pz = z + (along ? 0 : o);
      const t = this.m(new THREE.TorusGeometry(1, 0.08, 4, 10, Math.PI), mt, px, 0, pz, 0.38, 0.75, 0.38); t.rotation.y = along ? Math.PI / 2 : 0;
      if (i % 2 === 0 && random() < 0.8) this.bicycle(px + (along ? 0.18 : 0.1), pz + (along ? 0.1 : 0.18), along ? 0 : Math.PI / 2, [0x3a7ac8, 0xd8243a, 0xf5c542, 0x6aa84f][i % 4]);
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
  // Почтовый ящик (v0.18): синий ящик на стойке, козырёк от дождя, щель с клапаном, табличка «ПОЧТА», рожок-эмблема, дверца с замком
  postBox(x, z, ry = 0) {
    const g = this.prop(x, z, ry), b = col(0x2a5aa8), bd = col(0x1e4688), dk = col(0x17141c), wh = col(0xf1e8ff), yl = col(0xf5c542);
    const add = (geo, m, px, py, pz, sx, sy, sz, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rz); g.add(o); };
    add(G.cyl8, dk, 0, 0.42, -0.02, 0.05, 0.84, 0.05); add(G.box, dk, 0, 0.02, -0.02, 0.26, 0.04, 0.2);
    add(G.box, b, 0, 1.15, 0, 0.56, 0.68, 0.34); add(G.box, bd, 0, 1.53, -0.02, 0.62, 0.05, 0.44, -0.22);
    add(G.box, dk, 0, 1.38, 0.172, 0.34, 0.035, 0.01); add(G.box, bd, 0, 1.415, 0.18, 0.38, 0.05, 0.02, -0.35);
    add(G.box, tmat(T.sign('ПОЧТА', '#f1e8ff', '#1e4688')), 0, 1.24, 0.172, 0.44, 0.12, 0.01);
    add(G.torus, yl, -0.12, 1.06, 0.175, 0.07, 0.07, 0.07); add(G.box, yl, -0.02, 1.06, 0.175, 0.12, 0.025, 0.01);
    add(G.box, bd, 0, 0.93, 0.172, 0.5, 0.012, 0.01); add(G.box, col(0x9a9da8), 0.18, 0.88, 0.176, 0.04, 0.05, 0.01); add(G.box, wh, 0.1, 1.06, 0.174, 0.12, 0.08, 0.005);
    this.solid(x, z, 0.6, 0.45, 0, 1.6);
  },
  // Банкомат (v0.18): отдельная стойка — корпус, светящаяся шапка «БАНКОМАТ», козырёк, экран, клавиатура, щель для карты и выдача денег
  atm(x, z, ry = 0) {
    const g = this.prop(x, z, ry);
    g.add(compose('atm', a => { const body = col(0x3a4a6a), dk = col(0x17141c), mt = col(0x9a9da8), pn = col(0x2a3550);
      a(G.box, body, 0, 0.95, 0, 0.8, 1.9, 0.62); a(G.box, pn, 0, 1.08, 0.3, 0.68, 1.1, 0.04);
      a(G.box, tmat(T.sign('БАНКОМАТ', '#1e2a44', '#9be36b')), 0, 1.78, 0.315, 0.74, 0.18, 0.01); a(G.box, glow(0x9be36b), 0, 1.68, 0.315, 0.7, 0.02, 0.01);
      a(G.box, dk, 0, 1.52, 0.38, 0.64, 0.04, 0.2, -0.3); for (const sx of [-1, 1]) a(G.box, dk, sx * 0.32, 1.38, 0.38, 0.03, 0.3, 0.2);
      a(G.box, tmat(T.screen()), 0, 1.36, 0.33, 0.44, 0.3, 0.02, -0.12);
      a(G.box, mt, -0.06, 1.0, 0.36, 0.34, 0.04, 0.16, 0.5); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) a(G.box, i === 3 && j === 2 ? col(0x6aa84f) : i === 3 && j === 0 ? col(0xd8243a) : col(0xd8d8e0), -0.15 + j * 0.09, 1.0 + 0.03 * (i - 1.5) * 0.9, 0.36 + (1.5 - i) * 0.03, 0.06, 0.012, 0.035, 0.5);
      a(G.box, dk, 0.2, 1.06, 0.33, 0.1, 0.02, 0.02); a(G.box, glow(0xf5c542), 0.2, 1.085, 0.33, 0.1, 0.01, 0.01);
      a(G.box, dk, 0, 0.78, 0.325, 0.36, 0.04, 0.02); a(G.box, col(0x6aa84f), 0, 0.785, 0.33, 0.2, 0.012, 0.012);
      a(G.box, dk, 0, 0.06, 0, 0.84, 0.12, 0.66); }));
    this.solid(x, z, 0.82, 0.66, 0, 1.9);
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
    for (const s of [-1, 1]) { add(0, 0.45, s * 0.62, 1.8, 0.05, 0.26); for (const xx of [-0.7, 0.7]) add(xx, 0.38, s * 0.42, 0.07, 0.86, 0.07, -s * 0.55); }
    for (const xx of [-0.7, 0.7]) add(xx, 0.4, 0, 0.06, 0.06, 1.5);
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
    for (let l = 0; l < 3; l++) for (let i = 0; i < 2; i++) { const bg = this.m(G.box, bm, x + (i - 0.5) * 0.65, 0.26 + l * 0.18, z + (l % 2 ? 0.1 : -0.1), 0.62, 0.17, 0.9); bg.rotation.y = (random() - 0.5) * 0.1; }
    this.solid(x, z, 1.4, 1.1, 0.18, 0.55);
  },
  // Шины: стоят рядом, от толчка раскатываются в стороны
  tires(x, z, n = 4) {
    for (let i = 0; i < n; i++) { const p = this.ride('tire', x + (i % 2) * 0.5 - 0.25, z + Math.floor(i / 2) * 0.8 - 0.4 + (i % 2) * 0.15, random() * 0.4 - 0.2); p.mesh.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.4; }
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
    return g;
  },
  // Пирамида тыкв на ступенчатом прилавке: заденешь — раскатятся
  pumpkinPile(x, z) {
    const wd = tmat(T.wood());
    const tz = [[z, 1.7], [z - 0.4, 0.9], [z - 0.62, 0.46]];
    tz.forEach(([cz, d], k) => this.box(x, cz, 3.2 - k * 0.8, d, 0.35 + k * 0.35, wd));
    const pz = [z + 0.45, z - 0.25, z - 0.62];
    for (let k = 0; k < 3; k++) { const n = 4 - k; for (let i = 0; i < n; i++) this.item('pumpkin', x + (i - (n - 1) / 2) * 0.75, pz[k], 0.35 + k * 0.35); }
    this.sign(x, 1.6, z + 0.85, 0, 'ТЫКВЫ 3 ЗА 100', '#ff8a1f', '#17111f', 2.4, 0.35);
  },
  // Штабель кирпичей на поддонах: обрушить краном или тяжёлым броском
  brickStack(x, z) {
    this.pallet(x, z, 2.2, 1.6);
    this.brickWall(x, z, 2.0, 2.4, 'x', 0.18, { bw: 0.5, bh: 0.3, bd: 1.4 });
  },
  // Загон для тележек у стоянки: в нём несколько тележек для гонок
  cartCorral(x, z, n = 3) {
    const mt = col(0x9a9da8);
    for (const s2 of [-1, 1]) { this.box(x + s2 * 0.75, z, 0.06, 4.2, 0.06, mt, { y: 0.95, solid: false }); for (const zz of [-2, 0, 2]) this.box(x + s2 * 0.75, z + zz, 0.06, 0.06, 1.0, mt); }
    this.box(x, z - 2.05, 1.56, 0.06, 0.06, mt, { y: 0.95, solid: false }); this.sign(x, 1.35, z - 2.08, Math.PI, 'ТЕЛЕЖКИ', '#d8243a', '#f1e8ff', 1.4, 0.3);
    for (let i = 0; i < n; i++) this.ride('cart', x, z - 1.2 + i * 1.1, Math.PI);
  },
  // Фудтрак: кабина с лобовым стеклом, кузов с откинутым ставнем-прилавком, меню, колёса в арках,
  // генератор сбоку. ry=0 — прилавок смотрит на +z. На крышу можно забраться (крыша — зона миссий).
  foodTruck(x, z, color, sign, signC) {
    const g = this.prop(x, z, 0), body = tmat(T.carPaint(color)), dk = col(0x17141c), mt = tmat(T.metal()), gl = tmat(T.carGlass(color)), rust = tmat(T.rust());
    const add = (geo, m, px, py, pz, sx, sy, sz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz); g.add(o); return o; };
    // кузов и кабина (кабина слева, по -x)
    add(G.box, body, 0.6, 1.55, 0, 4.6, 2.3, 2.3); add(G.box, col(0xf1e8ff), 0.6, 0.62, 0, 4.62, 0.18, 2.32);
    add(G.box, body, -2.35, 1.15, 0, 1.6, 1.5, 2.2); add(G.box, gl, -3.16, 1.5, 0, 0.04, 0.6, 1.9); add(G.box, gl, -2.4, 1.5, 1.11, 1.2, 0.55, 0.02); add(G.box, gl, -2.4, 1.5, -1.11, 1.2, 0.55, 0.02);
    add(G.box, dk, -3.2, 0.55, 0, 0.14, 0.3, 2.2); for (const zz of [-0.8, 0.8]) add(G.box, glow(0xfff1c0), -3.17, 0.85, zz, 0.04, 0.16, 0.3);
    // окно выдачи: проём, ставень-козырёк, прилавок, меню, свет
    add(G.box, col(0x2a2232), 0.6, 1.75, 1.162, 3.0, 1.1, 0.02); add(G.box, glow(0xffd28a), 0.6, 1.75, 1.18, 2.8, 0.9, 0.01);
    add(G.box, tmat(T.wood()), 0.6, 1.2, 1.3, 3.0, 0.06, 0.4); for (const xx of [-0.7, 0.6, 1.9]) add(G.box, dk, xx, 1.0, 1.42, 0.04, 0.4, 0.04);
    add(G.box, tmat(T.sign(sign, signC, '#f5c542')), 0.6, 2.95, 1.16, 3.6, 0.5, 0.03); add(G.box, tmat(T.chalkboard()), 2.5, 1.7, 1.17, 0.6, 0.8, 0.02);
    // колёса, арки, крыша: вентилятор и баллон
    for (const xx of [-2.3, 1.9]) for (const zz of [-1.12, 1.12]) { add(G.cyl12, dk, xx, 0.38, zz, 0.38, 0.22, 0.38, Math.PI / 2); add(G.cyl8, mt, xx, 0.38, zz * 1.1, 0.18, 0.02, 0.18, Math.PI / 2); }
    add(G.box, tmat(T.vent()), 1.4, 2.82, -0.3, 0.9, 0.24, 0.9); add(G.cyl8, col(0xd8d8e0), -0.6, 2.85, -0.5, 0.18, 0.3, 0.18);
    // v0.21: детали — ржавые пороги, рейлинг на крыше, зеркала, газовые баллоны, гирлянда над окном, соусы и салфетки на прилавке,
    // ступенька, фото-шины с колпаками, наклейки-полосы, табличка-штендер с меню у прилавка
    add(G.box, rust, 0.6, 0.48, 1.16, 4.6, 0.12, 0.01); add(G.box, rust, 0.6, 0.48, -1.16, 4.6, 0.12, 0.01); add(G.box, tmat(T.awning(signC, '#f1e8ff')), 0.6, 0.86, 1.157, 4.6, 0.1, 0.01);
    for (const zz of [-1.0, 1.0]) add(G.box, mt, 0.6, 2.78, zz, 4.2, 0.04, 0.04); for (const xx of [-1.4, 0.6, 2.6]) for (const zz of [-1.0, 1.0]) add(G.box, mt, xx, 2.74, zz, 0.04, 0.1, 0.04);
    for (const zz of [-1.2, 1.2]) { add(G.box, dk, -3.0, 1.6, zz, 0.06, 0.04, 0.2); add(G.box, mt, -3.0, 1.6, zz * 1.12, 0.05, 0.22, 0.12); }
    for (const xx of [-1.35, -1.05]) { add(G.cyl8, col(0xd8243a), xx, 0.75, -1.4, 0.15, 0.5, 0.15); add(G.cyl8, mt, xx, 1.05, -1.4, 0.05, 0.1, 0.05); }
    // Окно выдачи свободно: свет под козырьком вместо гирлянды перед ним.
    add(G.box,glow(0xffd6a0),.6,2.46,1.22,2.7,.025,.035);
    add(G.box, tmat(T.metal()), 0.6, 0.25, 1.4, 0.8, 0.06, 0.35); for (const xx of [0.25, 0.95]) add(G.box, dk, xx, 0.12, 1.45, 0.04, 0.24, 0.04);
    for (const xx of [-2.3, 1.9]) for (const zz of [-1.12, 1.12]) { add(G.cyl12, tmat(T.tread()), xx, 0.38, zz, 0.39, 0.2, 0.39, Math.PI / 2); add(G.cyl12, tmat(T.hubcap()), xx, 0.38, zz * 1.11, 0.2, 0.02, 0.2, Math.PI / 2); add(G.box, dk, xx, 0.82, zz * 1.005, 0.95, 0.1, 0.02); }
    const af = new THREE.Group(); af.position.set(3.0, 0, 2.2); af.rotation.y = -0.4; g.add(af);
    for (const sz of [-1, 1]) { const pl = new THREE.Mesh(G.box, tmat(T.chalkboard())); pl.position.set(0, 0.5, sz * 0.14); pl.rotation.x = -sz * 0.28; pl.scale.set(0.55, 0.9, 0.03); af.add(pl);
      const fr = new THREE.Mesh(G.box, tmat(T.wood())); fr.position.set(0, 0.95, sz * 0.02); fr.scale.set(0.6, 0.06, 0.06); af.add(fr); }
    // генератор у борта
    add(G.box, col(0xd8a030), 2.2, 0.35, -1.6, 0.8, 0.6, 0.6); add(G.box, tmat(T.vent()), 2.2, 0.4, -1.29, 0.6, 0.35, 0.02); add(G.box, dk, 1.4, 0.05, -1.3, 1.2, 0.03, 0.04);
    this.solid(x + 0.6, z, 4.6, 2.3, 0, 2.7); this.solid(x - 2.35, z, 1.6, 2.2, 0, 1.9); this.solid(x + 2.2, z - 1.6, 0.8, 0.6, 0, 0.65);
    this.zone('roof', x - 1.2, z - 0.8, x + 2.6, z + 0.8, 2.7);
    this.light(x + 0.6, z + 2.2, 2.2);
    W.spots.pickup.push({ x: this.X(x + 0.6), z: this.Z(z + 1.9), y: this.Y, f: [0, 1], district: this.d, label: 'фудтрак «' + sign + '»' });
    (W.spots.grill || (W.spots.grill = [])).push({ x: this.X(x + 0.6), z: this.Z(z + 2.0), y: this.Y, f: [0, 1], bx: this.X(x + 0.6), bz: this.Z(z + 1.3), by: this.Y + 1.23, district: this.d, label: 'гриль «' + sign + '»' });
    return g;
  },
  // Аркадный автомат
  arcade(x, z, ry = 0, c = 0x7b4bc4) {
    const g = this.prop(x, z, ry), b = col(c), dk = col(0x17141c);
    const add = (geo, m, px, py, pz, sx, sy, sz, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.x = rx; g.add(o); };
    add(G.box, b, 0, 0.9, 0, 0.75, 1.8, 0.75); add(G.box, tmat(T.tvScreen('happy')), 0, 1.35, 0.33, 0.55, 0.45, 0.12, -0.25); add(G.box, dk, 0, 0.98, 0.42, 0.7, 0.08, 0.25, 0.3);
    add(G.box, glow(c), 0, 1.86, 0.3, 0.7, 0.18, 0.12); for (const xx of [-0.15, 0.05, 0.2]) add(G.cyl8, glow([0xff5a6e, 0xf5c542, 0x4ab0f0][((xx + 0.2) * 10 | 0) % 3]), xx, 1.04, 0.5, 0.03, 0.03, 0.03);
    this.solid(x, z, 0.8, 0.8, 0, 1.9);
  },
  // Граффити на стене (наклейка, чуть отступя от стены)
  graffiti(x, y, z, ry, w = 3, i = (random() * 6) | 0) { const m = this.m(G.plane, lam({ map: T.graffiti(i), alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, 'graf' + i, true), x, y, z, w, w / 2, 1); m.rotation.y = ry; },
  // Лужа: отражает свет, на ней чуть скользко
  puddle(x, z, r = 1) {
    const m = this.m(G.plane, lam({ map: T.puddle(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, emissive: 0x1a2a40, emissiveIntensity: 1 }, 'puddle'), x, 0.025, z, r * 2, r * 2, 1);
    m.rotation.x = -Math.PI / 2; m.rotation.z = random() * 6;
    addZone('puddle', { c: [this.X(x), this.Z(z), r * 0.7] }, this.Y);
    W.puddles.push({ x: this.X(x), z: this.Z(z), y: this.Y, r: r * 0.85 });
  },
  // Провода между домами (провисают)
  wires(x0, y0, z0, x1, y1, z1, n = 2) {
    for (let k = 0; k < n; k++) { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(this.X(x0 + (x1 - x0) * t), this.Y + y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * (0.6 + k * 0.25) - k * 0.2, this.Z(z0 + (z1 - z0) * t + k * 0.15))); }
      this.g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x17111f }))); }
  },
  // Карусель: платформа крутится, на шестах качаются тыквы-сиденья и летучие мыши, сверху полосатый шатёр
  carousel(x, z, r = 3) {
    const g = new THREE.Group(); g.position.set(this.X(x), this.Y, this.Z(z)); W.group.add(g); W.keep.push(g);
    const add = (geo, m, px, py, pz, sx, sy, sz, ry = 0, p2 = g) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.y = ry; p2.add(o); return o; };
    const base = col(0x3a3046), gold = col(0xd8a030), deck = tmat(T.floorWood());
    this.m(G.cyl12, base, x, 0.12, z, r + 0.2, 0.24, r + 0.2); this.solid(x, z, 0.5, 0.5, 0, 4.2);
    const rot = new THREE.Group(); rot.position.y = 0.24; g.add(rot);
    add(G.cyl12, deck, 0, 0.05, 0, r, 0.1, r, 0, rot); add(G.cyl12, gold, 0, 2.1, 0, 0.18, 4.2, 0.18, 0, rot);
    const roof = add(G.cone8, tmat(T.awning('#ff8a1f', '#2a1f3d')), 0, 4.4, 0, r + 0.5, 1.4, r + 0.5, 0, rot); roof.rotation.y = Math.PI / 8;
    add(G.cyl12, col(0x2a1f3d), 0, 3.7, 0, r + 0.5, 0.18, r + 0.5, 0, rot);
    const riders = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, px = Math.cos(a) * (r - 0.7), pz = Math.sin(a) * (r - 0.7);
      add(G.cyl6, gold, px, 1.9, pz, 0.035, 3.6, 0.035, 0, rot);
      const s2 = new THREE.Group(); s2.position.set(px, 1.0, pz); s2.rotation.y = -a; rot.add(s2);
      if (i % 2) { add(G.sph10, tmat(T.pumpkin()), 0, 0, 0, 0.32, 0.26, 0.32, 0, s2); add(G.box, col(0x3f6b2a), 0, 0.3, 0, 0.06, 0.12, 0.06, 0, s2); }
      else { add(G.sphL, col(0x2a2232), 0, 0, 0, 0.22, 0.2, 0.3, 0, s2); for (const sd of [-1, 1]) { const wg = add(G.box, col(0x3a3046), sd * 0.35, 0.1, 0, 0.5, 0.03, 0.3, 0, s2); wg.rotation.z = sd * 0.3; } }
      riders.push(s2);
    }
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(G.box, glow(i % 2 ? 0xffd28a : 0xff8a1f), Math.cos(a) * (r + 0.45), 3.65, Math.sin(a) * (r + 0.45), 0.14, 0.14, 0.14, 0, rot); }
    this.light(x, z, r + 1.2);
    { const a = r * 0.7; this.solid(x, z, a * 2, a * 2, 0, 0.34); W.carousels.push({ x: this.X(x), z: this.Z(z), r: r * 0.95, top: this.Y + 0.34, w: 0.5 }); }
    W.animated.push((dt, t) => { rot.rotation.y += dt * 0.5; riders.forEach((q, i) => (q.position.y = 1.0 + Math.sin(t * 2 + i) * 0.3)); });
  },
  // Летняя эстрада-ракушка: сцена со ступенями, полукупол сзади, прожекторы
  bandshell(x, z, w = 7, ry = 0) {
    const wd = tmat(T.floorWood()), sh = tmat(T.plaster());
    this.box(x, z, w, 4, 0.8, wd);
    const sm = this.m(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI, 0, Math.PI / 2), sh, x, 0.8, z - 0.2, w / 2, 3.6, 2.6); sm.rotation.y = Math.PI; sm.material = lam({ map: T.plaster(), side: THREE.DoubleSide }, 'shellIn');
    this.solid(x, z - 1.8, w, 0.4, 0.8, 3.6);
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.15 + i * 0.175); this.m(G.box, glow([0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff][i]), x + Math.cos(a) * (w / 2 - 0.3), 0.8 + Math.sin(a) * 3.2, z - 0.4, 0.25, 0.25, 0.25); }
    this.stairs(x - 1.2, z + 3.26, 'n', 0, 0.8, 1.6); this.stairs(x + 1.2, z + 3.26, 'n', 0, 0.8, 1.6);
    for (const s2 of [-1, 1]) { this.box(x + s2 * (w / 2 - 0.5), z + 1.2, 0.8, 0.6, 1.4, col(0x17111f), { y: 0.8 }); this.m(G.cyl12, col(0x3a3a40), x + s2 * (w / 2 - 0.5), 1.8, z + 1.52, 0.25, 0.02, 0.25).rotation.x = Math.PI / 2; }
    this.m(G.cyl6, col(0x2b2533), x, 1.5, z + 0.8, 0.03, 1.4, 0.03); this.m(G.sph, col(0x17111f), x, 2.25, z + 0.8, 0.08, 0.1, 0.08);
    this.light(x, z + 0.5, 3.4, 0.8);
    this.zone('roof', x - w / 2 + 0.8, z - 1.2, x + w / 2 - 0.8, z + 1.5, 0.8);
  },
  // Качели: две А-образные стойки, перекладина, два сиденья на цепях (раскачиваются от игрока и бросков)
  swingSet(x, z, w = 5, ry = 0) {
    const fr = col(0x3a4a6a), ch = col(0x8a8d98), top = 2.5, spread = 0.85, ax = Math.cos(ry), az = -Math.sin(ry);
    const legL = Math.hypot(top, spread), legA = Math.atan2(spread, top);
    for (const s2 of [-1, 1]) {
      const g = this.prop(x + ax * s2 * w / 2, z + az * s2 * w / 2, ry);
      for (const d of [-1, 1]) { const leg = new THREE.Mesh(G.box, fr); leg.position.set(0, top / 2, d * spread / 2); leg.scale.set(0.1, legL, 0.1); leg.rotation.x = -d * legA; g.add(leg); }
      const tie = new THREE.Mesh(G.box, fr); tie.position.set(0, 0.9, 0); tie.scale.set(0.06, 0.06, spread * 1.3); g.add(tie);
      this.solid(x + ax * s2 * w / 2, z + az * s2 * w / 2, Math.abs(ax) > 0.5 ? 0.2 : spread * 2, Math.abs(ax) > 0.5 ? spread * 2 : 0.2, 0, top);
    }
    const bar = this.prop(x, z, ry); const bm = new THREE.Mesh(G.cyl8, fr); bm.position.y = top; bm.rotation.z = Math.PI / 2; bm.scale.set(0.07, w + 0.2, 0.07); bar.add(bm);
    for (const o of [-w / 4, w / 4]) {
      const p = new THREE.Group(); p.position.set(this.X(x + ax * o), this.Y + top - 0.04, this.Z(z + az * o)); p.rotation.y = ry; W.group.add(p);
      for (const c of [-0.27, 0.27]) { const r = new THREE.Mesh(G.box, ch); r.position.set(c, -0.86, 0); r.scale.set(0.025, 1.72, 0.025); p.add(r); }
      const seat = new THREE.Mesh(G.box, tmat(T.wood())); seat.position.y = -1.74; seat.scale.set(0.66, 0.06, 0.3); p.add(seat);
      const sw = addSwinger(p, { len: 1.74, damp: 0.35, max: 1.15, r: 0.45 }); sw.seatY = top - 1.7; (W.swingSeats || (W.swingSeats = [])).push(sw);
    }
  },
  // Уличный зонт кафе: опора, полосатый купол-конус, утяжелитель
  parasol(x, z, c1 = '#ff8a1f', c2 = '#2a1f3d') {
    const dk=col(0x2b2533);this.m(G.cyl8,dk,x,.06,z,.3,.12,.3);this.m(G.cyl6,dk,x,1.88,z,.035,3.76,.035);this.solid(x,z,.13,.13,0,3.76);addCanopy(this,x,z,{colors:[c1,c2]});

  },
  // Грифельная доска-«домик» у входа
  chalkSign(x, z, ry = 0, text = 'СВЕЖИЙ ХЛЕБ') {
    const g = this.prop(x, z, ry), wd = tmat(T.wood()), bd = tmat(T.chalk(text));
    for (const s2 of [-1, 1]) { const p = new THREE.Mesh(G.box, [wd, wd, wd, wd, bd, wd]); p.position.set(0, 0.5, s2 * 0.16); p.rotation.x = -s2 * 0.3; p.rotation.y = s2 < 0 ? Math.PI : 0; p.scale.set(0.6, 0.95, 0.04); g.add(p); }
    this.solid(x, z, 0.6, 0.5, 0, 0.9);
  },
  // Пикап фермера: кабина, открытый кузов с откинутым бортом, внутри тыквы (предметы)
  pickup(x, z, ry = 0, c = 0x6a8a5a) {
    const g = this.prop(x, z, ry), body = col(c), dk = col(0x17111f), glass = tmat(T.carGlass(c));
    g.add(compose('pickup' + c, add => {
      add(G.box, body, 1.2, 0.75, 0, 1.7, 0.7, 1.8); add(G.box, glass, 1.0, 1.35, 0, 1.2, 0.5, 1.6); add(G.box, body, 1.0, 1.62, 0, 1.25, 0.05, 1.62);
      add(G.box, body, -0.9, 0.5, 0, 2.5, 0.2, 1.8); for (const sz of [-1, 1]) add(G.box, body, -0.9, 0.85, sz * 0.86, 2.5, 0.5, 0.08); add(G.box, body, 0.36, 0.85, 0, 0.08, 0.5, 1.8);
      add(G.box, body, -2.35, 0.45, 0, 0.4, 0.06, 1.7, 0, 0, -0.2);
      add(G.box, col(0x2b2833), 2.1, 0.5, 0, 0.12, 0.22, 1.8); add(G.box, glow(0xfff1c0), 2.07, 0.8, 0.6, 0.04, 0.14, 0.3); add(G.box, glow(0xfff1c0), 2.07, 0.8, -0.6, 0.04, 0.14, 0.3);
      for (const [a, b] of [[1.3, 0.8], [1.3, -0.8], [-1.3, 0.8], [-1.3, -0.8]]) { add(TIRE_GEO, tmat(T.tread()), a, 0.36, b, 0.36, 0.26, 0.36, Math.PI / 2); add(G.cyl12, tmat(T.hubcap()), a, 0.36, b + Math.sign(b) * 0.07, 0.22, 0.02, 0.22, Math.PI / 2); }
    }));
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 1.9 : 4.4, q ? 4.4 : 1.9, 0, 0.6);
    const L = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
    { const [cx, cz] = L(1.1, 0); this.solid(cx, cz, q ? 1.8 : 1.8, q ? 1.8 : 1.8, 0.6, 1.05); }
    for (const [lx, lz] of [[-0.5, -0.45], [-0.5, 0.45], [-1.4, 0], [-1.4, -0.5]]) { const [px, pz] = L(lx, lz); this.item('pumpkin', px, pz, 0.6); }
  },
  // Красная откидная лестница: верх закреплён, нижняя секция сложена наверху на защёлке.
  // Попал в защёлку (бросок, вода, рогатка) — секция с лязгом съезжает вниз; с крыши E — поднять обратно.
  dropLadder(x, z, side, top, low = 2.4, y0 = 0) {
    const n = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[side], ax = n[1] !== 0;
    this.ladder(x, z, side, top, y0 + low); const zone = W.ladders[W.ladders.length - 1];
    const red = col(0xd8243a), seg = new THREE.Group(), px = x + n[0] * 0.2, pz = z + n[1] * 0.2;
    seg.position.set(this.X(px), this.Y + y0 + low, this.Z(pz)); this.g.add(seg); W.keep.push(seg);
    for (const o of [-0.3, 0.3]) { const r = new THREE.Mesh(G.box, red); r.position.set(ax ? o : 0, low / 2, ax ? 0 : o); r.scale.set(0.06, low, 0.06); seg.add(r); }
    for (let y = 0.2; y < low; y += 0.38) { const r = new THREE.Mesh(G.box, red); r.position.y = y; r.scale.set(ax ? 0.6 : 0.05, 0.05, ax ? 0.05 : 0.6); seg.add(r); }
    const latch = new THREE.Mesh(G.box, lam({ color: 0xff3a3a, emissive: 0x6a0a0a }, 'latch')); latch.position.set(0, low + 0.12, 0); latch.scale.set(0.22, 0.18, 0.22); seg.add(latch);
    const l = { seg, zone, low, y0: this.Y + y0, k: 0, down: false, drop: false, lx: this.X(px), ly: this.Y + y0 + 2 * low + 0.12, lz: this.Z(pz), bx: this.X(x + n[0] * 0.6), by: this.Y + y0, bz: this.Z(z + n[1] * 0.6) };
    zone.y0 = this.Y + y0 + low; W.dropLadders.push(l);
    W.interacts.push({ x: this.X(x - n[0] * 0.7), z: this.Z(z - n[1] * 0.7), y: this.Y + top, r: 1.4, label: 'Поднять лестницу', enabled: () => l.down && l.k > 0.95, act: () => { l.down = false; } });
    return l;
  },
  // Ярмарочная палатка: каркас, полосатая крыша-шатёр, прилавок с товаром
  tent(x, z, ry = 0, c1 = '#d8243a', c2 = '#f1e8ff', goods = 'pumpkin', sign = '') {
    const g = this.prop(x, z, ry), dk = col(0x2b2533), wd = tmat(T.wood());
    const add = (geo, m, px, py, pz, sx, sy, sz, rx = 0, ryy = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.set(rx, ryy, 0); g.add(o); return o; };
    for (const [a, b2] of [[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]]) add(G.box, dk, a, 1.2, b2, 0.07, 2.4, 0.07);
    addCanopy(this,x,z,{w:2.9,d:2.35,edge:2.4,rise:.65,round:false,yaw:ry,colors:[c1,c2]});
    add(G.box, wd, 0, 0.5, 0.75, 2.5, 1.0, 0.5); add(G.box, tmat(T.produce(goods)), 0, 1.03, 0.75, 2.4, 0.06, 0.45);
    if (sign) add(G.box, tmat(T.sign(sign, c1, '#f1e8ff')), 0, 2.15, 1.05, 1.8, 0.32, 0.02);
    add(G.box, glow(0xffd28a), 0, 2.2, 0, 0.18, 0.12, 0.18);
    const nx = Math.round(Math.sin(ry)), nz = Math.round(Math.cos(ry));
    this.solid(x + nx * 0.75, z + nz * 0.75, Math.abs(nx) ? 0.5 : 2.5, Math.abs(nx) ? 2.5 : 0.5, 0, 1.05);
    for (const [a, b2] of [[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]]) { const wx = x + a * Math.cos(ry) + b2 * Math.sin(ry), wz = z - a * Math.sin(ry) + b2 * Math.cos(ry); this.solid(wx, wz, 0.15, 0.15, 0, 2.4); }
    this.light(x + nx * 1.5, z + nz * 1.5, 1.8);
    return g;
  },
  // Часовая башня: на балкон с часами — по лестнице
  clockTower(x,z){return buildClockTower(this,x,z);},
  // Куча листьев: пробежишь — листья разлетаются
  leafPile(x, z, r = 1) {
    // большой холм листвы (в него можно спрятаться целиком) + разлетевшиеся по земле листья
    r *= 2.25;
    const lm = tmat(T.leaves(0)), g = this.m(G.sph10, lm, x, 0.02, z, r * 0.62, r * 0.42, r * 0.55); g.rotation.y = random() * 3;
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + random(), d = r * 0.38; const k = this.m(G.sph, lm, x + Math.cos(a) * d, 0.02, z + Math.sin(a) * d, r * 0.34, r * 0.24, r * 0.3); k.rotation.y = a; }
    const lit = this.m(G.plane, lam({ map: T.leafLitter(), alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, 'leafLitter', true), x, 0.03, z, r * 2.1, r * 2.1, 1); lit.rotation.x = -Math.PI / 2; lit.rotation.z = random() * 6;
    addZone('leaves', { c: [this.X(x), this.Z(z), r * 0.6] }, this.Y);
    W.hides.push({ x: this.X(x), y: this.Y, z: this.Z(z), r: r * 0.6 + 0.4, kind: 'leaves', out: [0, 0] });
  },
  // Питьевой фонтанчик: каменная тумба, чаша и кран; E — попить (стамина полная)
  drinkFountain(x, z, ry = 0) {
    const g = this.prop(x, z, ry);
    g.add(compose('drinkFountain', a => { const st = tmat(T.stone()), mt = col(0x9a9da8), wt = lam({ map: T.water(), emissive: 0x10283a }, 'dfWater');
      a(G.box, st, 0, 0.45, 0, 0.42, 0.9, 0.42); a(G.box, st, 0, 0.04, 0, 0.56, 0.08, 0.56); a(G.cyl8, st, 0, 0.95, 0.08, 0.32, 0.12, 0.28);
      a(G.cyl8, wt, 0, 1.0, 0.08, 0.25, 0.02, 0.21); a(G.cyl6, mt, 0, 1.1, -0.12, 0.03, 0.2, 0.03); a(G.box, mt, 0, 1.2, -0.06, 0.04, 0.04, 0.14); }));
    this.solid(x, z, 0.5, 0.5, 0, 1.0);
    const fx = Math.sin(ry), fz = Math.cos(ry), wx = this.X(x + fx * 0.05), wz = this.Z(z + fz * 0.05), wy = this.Y + 1.2;
    W.interacts.push({ x: this.X(x + fx * 0.7), z: this.Z(z + fz * 0.7), y: this.Y, r: 1.1, label: 'Попить', enabled: P => !P.held,
      act: P => { P.stamina = 1; P.exhausted = false; P.drinkT = 1.2; for (let i = 0; i < 8; i++) puff(wx, wy, wz, { color: 0x9ccbec, size: 0.1, vx: fx * 0.4 + (random() - 0.5) * 0.3, vy: 1.4, vz: fz * 0.4 + (random() - 0.5) * 0.3, g: 9, life: 0.5, grow: 0.1 }); W.onDrink && W.onDrink(P); } });
  },
  // Деревянный причал над водой
  pier(x0, z0, x1, z1, y = 0.35) {
    const wd = tmat(T.wood()), along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    this.box(cx, cz, along ? len : 1.6, along ? 1.6 : len, 0.1, wd, { y: y - 0.1 });
    for (let t = 0; t <= 1.001; t += 0.5) for (const s2 of [-0.7, 0.7]) { const px = x0 + (x1 - x0) * t + (along ? 0 : s2), pz = z0 + (z1 - z0) * t + (along ? s2 : 0); this.m(G.cyl6, tmat(T.bark()), px, (y + 0.3) / 2 - 0.3, pz, 0.08, y + 0.6, 0.08); this.m(G.cyl6, tmat(T.bark()), px, y + 0.3, pz, 0.07, 0.6, 0.07); }
    for (const s2 of [-0.75, 0.75]) this.m(G.box, wd, cx + (along ? 0 : s2), y + 0.55, cz + (along ? s2 : 0), along ? len : 0.06, 0.06, along ? 0.06 : len);
  },
  // Живая изгородь (стриженые кусты)
  hedge(x0, z0, x1, z1, h = 1.2) {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    this.box(cx, cz, along ? len : 0.9, along ? 0.9 : len, h, tmat(T.bush()));
    for (let t = 0.5; t < len; t += 1.4) { const b = this.m(G.ico, tmat(T.bush()), along ? Math.min(x0, x1) + t : cx, h, along ? cz : Math.min(z0, z1) + t, 0.55, 0.3, 0.55); b.rotation.y = t; }
  },
  // Тыквенная грядка: земля, ботва, тыквы-предметы
  pumpkinPatch(x, z, w, d, n = 4) {
    this.ground(x - w / 2, z - d / 2, x + w / 2, z + d / 2, T.dirt(), 2);
    const vm = tmat(T.leaves(2));
    for (let i = 0; i < w * d * 1.2; i++) { const o = this.m(G.ico, vm, x + (random() - 0.5) * w, 0.12, z + (random() - 0.5) * d, 0.3, 0.12, 0.3); o.rotation.y = random() * 3; }
    for (let i = 0; i < n; i++) this.item('pumpkin', x + ((i % 3) - 1) * w * 0.3, z + (Math.floor(i / 3) - 0.5) * d * 0.45);
    for (const s2 of [-1, 1]) this.box(x, z + s2 * (d / 2 + 0.05), w + 0.2, 0.1, 0.25, tmat(T.wood()), { solid: false });
  },
  // Тёплая «уличная» деталь: электрощиток на стене / у столба
  utilityBox(x,z,ry=0){const nx=Math.round(Math.sin(ry)),nz=Math.round(Math.cos(ry)),g=this.prop(x,z,ry),mt=tmat(T.paintMetal(0x6a6d78)),dark=col(0x302a39);mesh(G.box,dark,0,.79,-.18,.92,1.48,.07,g);for(const sx of [-1,1])mesh(G.box,mt,sx*.46,.79,0,.055,1.48,.42,g);for(const yy of [.05,1.53])mesh(G.box,mt,0,yy,0,.96,.055,.42,g);const door=new THREE.Group();door.position.set(-.46,.79,.23);g.add(door);mesh(G.box,mt,.46,0,0,.91,1.46,.055,door);mesh(G.box,tmat(T.hazard()),.46,.28,.03,.5,.13,.008,door);mesh(G.box,dark,.82,0,.055,.045,.21,.055,door);W.keep.push(door);const cab={g,door,open:false};W.animated.push(dt=>door.rotation.y+=((cab.open?-1.95:0)-door.rotation.y)*(1-Math.exp(-dt*7)));this.solid(x,z,Math.abs(nx)>.5?.44:.96,Math.abs(nx)>.5?.96:.44,.04,1.5);W.spots.fuse.push({x:this.X(x+nx),z:this.Z(z+nz),y:this.Y,f:[nx,nz],bx:this.X(x),bz:this.Z(z),cab,district:this.d,label:'щиток'});},

};

/* Скелет на скамейке: череп с челюстью, рёбра, кости рук и ног. Позы: машет (рука качается), нога на ногу, держит тыкву.
   off — сдвиг по скамейке. Машущая рука и челюсть анимируются. */
function skeleton(g, pose, acc, off) {
  const bone = col(0xe8e0d0), dk = col(0x17111f), sk = new THREE.Group(); sk.position.x = off; g.add(sk);
  sk.add(compose('skel_' + pose, a => {
    // череп, глазницы, нос, зубы; шея и позвоночник; таз
    a(G.sph10, bone, 0, 1.2, -0.06, 0.17, 0.17, 0.16); a(G.box, bone, 0, 1.1, -0.0, 0.2, 0.08, 0.16);
    for (const sx of [-0.065, 0.065]) a(G.box, dk, sx, 1.22, 0.1, 0.06, 0.06, 0.02); a(G.box, dk, 0, 1.15, 0.11, 0.03, 0.04, 0.02);
    for (let i = -2; i <= 2; i++) a(G.box, dk, i * 0.03, 1.085, 0.08, 0.012, 0.03, 0.01);
    a(G.cyl5, bone, 0, 0.98, -0.1, 0.03, 0.14, 0.03); a(G.cyl5, bone, 0, 0.74, -0.14, 0.028, 0.42, 0.028);
    for (let i = 0; i < 5; i++) { const w = 0.3 - i * 0.025; a(G.halfTorus, bone, 0, 0.94 - i * 0.065, -0.13, w * 0.5, 0.16, 0.3, Math.PI / 2, 0, 0); }
    a(G.box, bone, 0, 0.92, -0.14, 0.34, 0.035, 0.05); a(G.box, bone, 0, 0.5, -0.1, 0.3, 0.1, 0.16);
    // ноги: бедро вперёд по сиденью, голень вниз; «нога на ногу» — правая лежит на левой
    for (const sx of [-1, 1]) { const cross = pose === 'cross' && sx > 0;
      a(G.cyl5, bone, sx * 0.09, cross ? 0.58 : 0.5, 0.06, 0.028, 0.36, 0.028, Math.PI / 2 - (cross ? 0.25 : 0), 0, cross ? 0.5 : 0);
      if (cross) { a(G.cyl5, bone, -0.04, 0.5, 0.38, 0.025, 0.4, 0.025, 1.0, 0, 1.1); a(G.box, bone, -0.2, 0.36, 0.5, 0.07, 0.04, 0.14); }
      else { a(G.cyl5, bone, sx * 0.09, 0.27, 0.25, 0.025, 0.44, 0.025); a(G.box, bone, sx * 0.09, 0.04, 0.3, 0.08, 0.04, 0.16); } }
    // левая рука лежит на спинке/коленях; правая — по позе
    a(G.cyl5, bone, -0.2, 0.8, -0.1, 0.022, 0.3, 0.022, 0, 0, 0.25); a(G.cyl5, bone, -0.24, 0.6, 0.02, 0.02, 0.28, 0.02, 1.2, 0, 0);
    if (pose === 'pumpkin') { a(G.cyl5, bone, 0.2, 0.8, -0.1, 0.022, 0.3, 0.022, 0, 0, -0.25); a(G.cyl5, bone, 0.18, 0.66, 0.06, 0.02, 0.28, 0.02, 1.3, 0, 0.3);
      a(G.sph10, tmat(T.pumpkin()), 0, 0.68, 0.2, 0.17, 0.14, 0.17); a(G.cyl6, col(0x3f6b2a), 0, 0.83, 0.2, 0.025, 0.06, 0.025); }
    if (pose === 'cross') { a(G.cyl5, bone, 0.2, 0.8, -0.1, 0.022, 0.3, 0.022, 0, 0, -0.25); a(G.cyl5, bone, 0.14, 0.62, 0.08, 0.02, 0.28, 0.02, 1.3, 0, -0.4); }
    if (acc === 'hat') { a(G.cyl12, col(0x2a1f3d), 0, 1.36, -0.06, 0.26, 0.025, 0.26); a(G.cone8, col(0x2a1f3d), 0, 1.58, -0.06, 0.17, 0.44, 0.17); a(G.cyl12, col(0xff8a1f), 0, 1.4, -0.06, 0.15, 0.04, 0.15); }
    if (acc === 'scarf') { a(G.torus, col(0xd8243a), 0, 1.0, -0.08, 0.15, 0.15, 0.2, Math.PI / 2); a(G.box, col(0xd8243a), 0.08, 0.86, 0.06, 0.07, 0.24, 0.03, 0.2); a(G.box, col(0xf1e8ff), 0.08, 0.8, 0.075, 0.07, 0.03, 0.03, 0.2); }
  }));
  if (pose === 'wave') {
    // машущая рука: плечо — точка вращения
    const arm = new THREE.Group(); arm.position.set(0.18, 0.92, -0.1); sk.add(arm);
    arm.add(compose('skelArm', a => { const bone2 = col(0xe8e0d0); a(G.cyl5, bone2, 0.04, 0.12, 0, 0.022, 0.28, 0.022, 0, 0, -0.3); a(G.cyl5, bone2, 0.1, 0.38, 0, 0.02, 0.26, 0.02); for (let i = 0; i < 4; i++) a(G.box, bone2, 0.06 + i * 0.025, 0.55, 0, 0.012, 0.08, 0.012); }));
    W.keep.push(arm); const ph = random() * 6; W.animated.push((dt, t) => { arm.rotation.z = Math.sin(t * 5 + ph) * 0.35 - 0.1; });
  }
}

const LAMP_CONE = new THREE.CylinderGeometry(0.13, 1.35, 2.95, 12, 1, true);
let _lc; export const LAMP_CONE_M = () => _lc || (_lc = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { c: { value: new THREE.Color(0xffe2a8) }, k: { value: 1 } },
  vertexShader: 'varying vec2 vu; varying float vf; void main(){ vu = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); vf = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform vec3 c; uniform float k; varying vec2 vu; varying float vf; void main(){ float a = pow(vu.y, 1.6) * pow(vf, 1.5) * 0.18 * k; gl_FragColor = vec4(c * a, a); }' }));
