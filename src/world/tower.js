import { THREE, G, col, tmat, glow, own, lam, flat } from '../core/gfx.js';
import { T, facade, rep } from '../core/textures.js';
import { HW } from '../config.js';
import { W } from './state.js';

/* Многоэтажное здание, по которому можно ходить: наружные стены с окнами (окна совпадают
   снаружи и изнутри), перекрытия с проёмом под лестницу, лестница «змейкой» в лестничной
   клетке вдоль северной стены, перила вокруг проёмов, выход на крышу с парапетом.
   interior(fb, k, r) вызывается для каждого этажа: fb — конструктор, поднятый на высоту этажа
   (всё ставится как на земле), r — свободная часть этажа без лестницы. */
export const TowerMethods = {
  at(y) { const B = this.constructor, b = new B(this.ox, this.oz, this.Y + y, this.d); b._pk = 99; return b; },

  tower(o) {
    const { x, z, w, d } = o, n = o.floors, fh = o.fh ?? 3.4, H = n * fh, t = 0.25, base = o.wall ?? 0x7c6a9c;
    const lit = o.lit ?? 0.5, brick = o.brick !== false;
    const run = o.run ?? 0.42, land = o.landing ?? 1.2, lane = o.lane ?? 1.2;
    const steps = Math.max(1, Math.round(fh / 0.3)), L = steps * run;
    const ix0 = x + t, iz0 = z + t, ix1 = x + w - t, iz1 = z + d - t;
    const sx0 = o.stairX ?? ix0, sz0 = iz0, sx1 = sx0 + land * 2 + L, sz1 = sz0 + lane * 2;
    const dw = 1.4, dh = 2.35, plain = col(base), inner = tmat(rep(T.plaster(), 1, n));
    const doors = o.doors || (o.door ? [o.door] : []);
    const rowStart = 1.0;
    // наружные стены во всю высоту, проём двери на первом этаже
    const sides = { s: { len: w, at: z + d - t / 2, axis: 'x', out: 4, inn: 5 }, n: { len: w, at: z + t / 2, axis: 'x', out: 5, inn: 4 },
      e: { len: d - 2 * t, at: x + w - t / 2, axis: 'z', out: 0, inn: 1 }, w: { len: d - 2 * t, at: x + t / 2, axis: 'z', out: 1, inn: 0 } };
    const glass = lam({ color: 0x2a3550, emissive: 0x141a2c, emissiveIntensity: 1 }, 'winGlass'), frame = col(0x2a2232);
    for (const [k, sd] of Object.entries(sides)) {
      const dr = doors.find(q => q.side === k);
      const g0 = dr ? dr.at * sd.len - dw / 2 : 0, g1 = g0 + dw;
      const fac = facade(base, sd.len, H, { door: dr ? [g0, g1] : null, lit, brick, windows: o.windows !== false, rowStep: fh, rowStart });
      const U = u => k === 's' ? [x + u, sd.at] : k === 'n' ? [x + w - u, sd.at] : k === 'e' ? [sd.at, z + d - t - u] : [sd.at, z + t + u];
      const pieces = dr ? [[0, g0, 0, H], [g1, sd.len, 0, H], [g0, g1, dh, H]] : [[0, sd.len, 0, H]];
      for (const [a, b2, y0, y1] of pieces) {
        if (b2 - a < 0.01) continue;
        const ft = fac.clone(); ft.needsUpdate = true; ft.repeat.set((b2 - a) / sd.len, (y1 - y0) / H); ft.offset.set(a / sd.len, y0 / H);
        const it = inner.map.clone(); it.needsUpdate = true; it.repeat.set((b2 - a) / 3, (y1 - y0) / fh); it.offset.set(0, y0 / fh);
        const mats = [plain, plain, plain, plain, plain, plain]; mats[sd.out] = own({ map: ft }); mats[sd.inn] = own({ map: it });
        const [bx, bz] = U((a + b2) / 2), len = b2 - a, hh = y1 - y0;
        const bw = sd.axis === 'x' ? len : t, bd = sd.axis === 'x' ? t : len;
        this.m(G.box, mats, bx, y0 + hh / 2, bz, bw, hh, bd); this.solid(bx, bz, bw, bd, y0, hh);
      }
      // окна изнутри — там же, где на фасаде
      if (o.windows !== false) {
        const nrm = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[k], off = t / 2 + 0.012;
        for (let f = 0; f < n; f++) for (let fx = 0.7; fx < sd.len - 1; fx += 2.0) {
          const fy = rowStart + f * fh; if (fy >= H - 1.3) continue;
          if (dr && fy < 2.2 && fx + 1.1 > g0 && fx - 0.2 < g1) continue;
          if (k === 'n' && f < n && (() => { const [wx] = U(fx + 0.5); return wx > sx0 - 0.6 && wx < sx1 + 0.6; })()) continue; // за лестницей окна закрыты
          const [cx, cz] = U(fx + 0.5), px = cx - nrm[0] * off, pz = cz - nrm[1] * off;
          const pl = this.m(G.plane, glass, px, fy + 0.78, pz, 1, 1.25, 1); pl.rotation.y = { s: Math.PI, n: 0, e: -Math.PI / 2, w: Math.PI / 2 }[k];
          const ax = sd.axis === 'x';
          this.m(G.box, frame, px, fy + 0.78, pz, ax ? 0.05 : 0.03, 1.25, ax ? 0.03 : 0.05);
          this.m(G.box, frame, px, fy + 0.85, pz, ax ? 1.0 : 0.03, 0.05, ax ? 0.03 : 1.0);
          this.m(G.box, col(0xd8d0c0), px - nrm[0] * 0.06, fy + 0.13, pz - nrm[1] * 0.06, ax ? 1.15 : 0.14, 0.05, ax ? 0.14 : 1.15);
        }
      }
      if (dr) {
        const e0 = U(g0), e1 = U(g1);
        const hinge = sd.axis === 'x' ? [Math.min(e0[0], e1[0]), sd.at] : [sd.at, Math.min(e0[1], e1[1])];
        this.door(hinge[0], hinge[1], sd.axis, { s: 1, n: -1, e: -1, w: 1 }[k], 0, dw, dh);
        const nrm = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[k], [cx, cz] = U((g0 + g1) / 2);
        // козырёк над входом
        if (!o.awning) this.m(G.box, col(0x2b2533), cx + nrm[0] * 0.75, dh + 0.35, cz + nrm[1] * 0.75, sd.axis === 'x' ? dw + 1 : 1.5, 0.12, sd.axis === 'x' ? 1.5 : dw + 1);
        if (!o.awning) this.m(G.box, glow(0xffd8a0), cx + nrm[0] * 0.75, dh + 0.27, cz + nrm[1] * 0.75, 0.3, 0.04, 0.3); this.light(cx + nrm[0] * 1.2, cz + nrm[1] * 1.2, 1.6);
        if (dr.sign) this.sign(cx + nrm[0] * (t / 2 + 0.03), dh + 0.75, cz + nrm[1] * (t / 2 + 0.03), { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[k], ...dr.sign, 2.4, 0.55);
      }
    }
    // перекрытия с проёмом над пролётом, который пришёл снизу
    const floorTex = o.floor || T.floorWood(), ceil = tmat(T.plaster());
    const laneZ = k => k % 2 === 0 ? [sz0, sz0 + lane] : [sz0 + lane, sz1];
    const fx0 = sx0 + land, fx1 = sx0 + land + L;
    const slab = (y, hole) => {
      const top = flat(rep(floorTex, 1, 1)), mats = [ceil, ceil, top, ceil, ceil, ceil];
      const rects = hole ? [[ix0, iz0, ix1, hole[1]], [ix0, hole[3], ix1, iz1], [ix0, hole[1], hole[0], hole[3]], [hole[2], hole[1], ix1, hole[3]]] : [[ix0, iz0, ix1, iz1]];
      for (const [a, b2, c, e] of rects) {
        if (c - a < 0.01 || e - b2 < 0.01) continue;
        const ft = floorTex.clone(); ft.needsUpdate = true; ft.repeat.set((c - a) / 3, (e - b2) / 3);
        const m = [ceil, ceil, flat(ft), ceil, ceil, ceil];
        this.m(G.box, m, (a + c) / 2, y - 0.1, (b2 + e) / 2, c - a, 0.2, e - b2); this.solid((a + c) / 2, (b2 + e) / 2, c - a, e - b2, y - 0.2, 0.2);
      }
    };
    const gfl = this.m(G.plane, flat(rep(floorTex, (ix1 - ix0) / 3, (iz1 - iz0) / 3)), (ix0 + ix1) / 2, 0.012, (iz0 + iz1) / 2, ix1 - ix0, iz1 - iz0, 1); gfl.rotation.x = -Math.PI / 2;
    const rail = col(0x3a3046), railM = (cx, cz, ww, dd, y) => { this.m(G.box, rail, cx, y + 0.95, cz, ww, 0.06, dd); this.solid(cx, cz, ww, dd, y, 1.0);
      const nPost = Math.max(2, Math.round(Math.max(ww, dd) / 0.6)); for (let i = 0; i <= nPost; i++) { const tt = i / nPost - 0.5; this.m(G.box, rail, cx + (ww > dd ? tt * ww : 0), y + 0.48, cz + (ww > dd ? 0 : tt * dd), 0.04, 0.95, 0.04); } };
    for (let k = 1; k <= n; k++) {
      const y = k * fh, [z0, z1] = laneZ(k - 1), hole = [fx0, z0, fx1, z1];
      if (k < n) slab(y, hole);
      else {
        // крыша: гравий/рубероид, проём к лестнице
        const rf = T.roof(), rects = [[ix0 - t, iz0 - t, ix1 + t, z0], [ix0 - t, z1, ix1 + t, iz1 + t], [ix0 - t, z0, fx0, z1], [fx1, z0, ix1 + t, z1]];
        for (const [a, b2, c, e] of rects) { if (c - a < 0.01 || e - b2 < 0.01) continue; const tt = rf.clone(); tt.needsUpdate = true; tt.repeat.set((c - a) / 3, (e - b2) / 3);
          this.m(G.box, [ceil, ceil, tmat(tt), ceil, ceil, ceil], (a + c) / 2, y - 0.1, (b2 + e) / 2, c - a, 0.2, e - b2); this.solid((a + c) / 2, (b2 + e) / 2, c - a, e - b2, y - 0.2, 0.2); }
      }
      // перила вокруг проёма: длинная сторона к залу/соседнему пролёту и торец у начала пролёта
      const even = (k - 1) % 2 === 0, inner2 = even ? z1 : z0;
      railM((fx0 + fx1) / 2, inner2, L, 0.06, y);
      if (!even) railM((fx0 + fx1) / 2, z1, L, 0.06, y);
      railM(even ? fx0 : fx1, (z0 + z1) / 2, 0.06, z1 - z0, y);
    }
    // пролёты: чётные идут на восток по ближней к стене полосе, нечётные — обратно
    for (let k = 0; k < n; k++) {
      const [z0, z1] = laneZ(k), cz = (z0 + z1) / 2, y0 = k * fh;
      if (k % 2 === 0) this.stairs(fx0, cz, 'e', y0, y0 + fh, lane - 0.1, y0, run);
      else this.stairs(fx1, cz, 'w', y0, y0 + fh, lane - 0.1, y0, run);
      // наклонный поручень со стойками со стороны зала
      const ang = Math.atan2(fh, L) * (k % 2 === 0 ? 1 : -1), hl = Math.hypot(L, fh), rz = z1 - 0.05;
      const hr = this.m(G.box, rail, (fx0 + fx1) / 2, y0 + fh / 2 + 0.95, rz, hl, 0.05, 0.05); hr.rotation.z = ang;
      for (let i = 1; i < 5; i++) { const tt = i / 5, px = k % 2 === 0 ? fx0 + L * tt : fx1 - L * tt; this.m(G.box, rail, px, y0 + fh * tt + 0.48, rz, 0.04, 0.95, 0.04); }
    }
    // выход на крышу — будка над лестницей с проёмом
    {
      const [z0, z1] = laneZ(n - 1), top = H, bh = 2.6, bm = col(shadeHex(base, -20));
      const even = (n - 1) % 2 === 0, exitX = even ? fx1 : fx0;
      const bx0 = fx0 - (even ? 0 : land), bx1 = fx1 + (even ? land : 0);
      this.box((bx0 + bx1) / 2, z0 - 0.1, bx1 - bx0, 0.2, bh, bm, { y: top });
      this.box(even ? bx0 - 0.1 : bx1 + 0.1, (z0 + z1) / 2, 0.2, z1 - z0 + 0.4, bh, bm, { y: top });
      this.box((bx0 + bx1) / 2, (z0 + z1) / 2, bx1 - bx0 + 0.4, z1 - z0 + 0.4, 0.15, tmat(T.roof()), { y: top + bh });
      // стенка со стороны зала с проёмом у выхода
      const gapA = even ? bx1 - land : bx0, gapB = gapA + land;
      if (gapA - bx0 > 0.05) this.box((bx0 + gapA) / 2, z1 + 0.1, gapA - bx0, 0.2, bh, bm, { y: top });
      if (bx1 - gapB > 0.05) this.box((gapB + bx1) / 2, z1 + 0.1, bx1 - gapB, 0.2, bh, bm, { y: top });
      this.m(G.box, glow(0xffd8a0), (gapA + gapB) / 2, top + bh - 0.15, z1 + 0.25, 0.3, 0.06, 0.2);
      void exitX;
    }
    // парапет
    if (o.parapet !== false) {
      const pm = col(0x3a3046), gaps = o.gaps || [];
      const edges = { s: [x + w / 2, z + d - 0.1, w, 0.2], n: [x + w / 2, z + 0.1, w, 0.2], e: [x + w - 0.1, z + d / 2, 0.2, d - 0.4], w: [x + 0.1, z + d / 2, 0.2, d - 0.4] };
      for (const [k, [cx, cz, ew, ed]] of Object.entries(edges)) {
        const along = k === 's' || k === 'n', len = along ? ew : ed, start = along ? x + (w - ew) / 2 : z + (d - ed) / 2;
        const cuts = gaps.filter(g => g.side === k).map(g => (along ? x + g.at * w : z + g.at * d) - start).sort((a, b2) => a - b2);
        let a0 = 0; const segs = [];
        for (const c of cuts) { segs.push([a0, c - 0.7]); a0 = c + 0.7; } segs.push([a0, len]);
        for (const [a, b2] of segs) { if (b2 - a < 0.05) continue; const c = start + (a + b2) / 2, px = along ? c : cx, pz = along ? cz : c;
          this.m(G.box, pm, px, H + 0.45, pz, along ? b2 - a : 0.2, 0.7, along ? 0.2 : b2 - a); this.solid(px, pz, along ? b2 - a : 0.2, along ? 0.2 : b2 - a, H, 0.8); }
      }
    }
    if (o.ladder) {
      const k = o.ladder.side, at = o.ladder.at;
      this.ladder(k === 'e' ? x + w : k === 'w' ? x : x + at * w, k === 's' ? z + d : k === 'n' ? z : z + at * d, k, H);
    }
    if (o.roof !== false) this.zone('roof', x + 0.8, sz1 + 0.6, x + w - 0.8, z + d - 0.8, H);
    if (o.sign) this.sign(x + w / 2, Math.min(fh, 3.4) - 0.5, z + d + 0.02, 0, ...o.sign, Math.min(w * 0.7, 4.5), 0.75);
    if (o.awning) { const a = this.m(G.box, tmat(T.awning(...o.awning)), x + w / 2, 2.75, z + d + 0.6, w - 0.6, 0.12, 1.2); a.rotation.x = 0.25; }
    // этажи: свет на потолке + наполнение
    for (let k = 0; k < n; k++) {
      const fb = this.at(k * fh), r = { x0: ix0, z0: sz1 + 0.15, x1: ix1, z1: iz1, sx0, sx1, h: fh, k };
      for (let lx = ix0 + 2.5; lx < ix1 - 1; lx += 4.5) { fb.m(G.box, glow(0xfff0d0), lx, fh - 0.22, (r.z0 + r.z1) / 2, 1.2, 0.04, 0.3); fb.light(lx, (r.z0 + r.z1) / 2, 2.0, 0, true); }
      if (o.interior) o.interior(fb, k, r);
      if (o.zoneInside !== false && r.z1 - r.z0 > 2) fb.zone('inside', ix0 + 0.5, r.z0 + 0.4, ix1 - 0.5, r.z1 - 0.5);
      if (HW && o.web !== false && k % 2 === 1) fb.web(ix1 - 0.3, fh - 0.6, iz1 - 0.02, Math.PI, 0.9);
    }
    return { x0: ix0, z0: iz0, x1: ix1, z1: iz1, top: H, fh, stair: [sx0, sz0, sx1, sz1] };
  },

  /* ---------- мебель ---------- */
  // перегородка с дверным проёмом (gapAt — доля длины), штукатурка с двух сторон
  partition(x0, z0, x1, z1, h, gapAt = 0.5, gw = 1.1) {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? x1 - x0 : z1 - z0, pm = tmat(T.plaster()), th = 0.12;
    const g0 = len * gapAt - gw / 2, g1 = g0 + gw;
    for (const [a, b2, y0, y1] of [[0, g0, 0, h], [g1, len, 0, h], [g0, g1, 2.2, h]]) {
      if (b2 - a < 0.02 || y1 - y0 < 0.02) continue;
      const c = (a + b2) / 2, px = along ? x0 + c : x0, pz = along ? z0 : z0 + c;
      this.box(px, pz, along ? b2 - a : th, along ? th : b2 - a, y1 - y0, pm, { y: y0 });
    }
  },
  sofa(x, z, ry = 0, c = 0x6a3a5a) {
    const g = this.prop(x, z, ry), m = col(c), m2 = col(c - 0x101010 > 0 ? c - 0x101010 : c);
    const a = (px, py, pz, sx, sy, sz, mm = m) => { const o = new THREE.Mesh(G.box, mm); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); };
    a(0, 0.22, 0.05, 1.9, 0.3, 0.8, m2); for (const xx of [-0.45, 0.45]) a(xx, 0.42, 0.08, 0.88, 0.14, 0.7); a(0, 0.65, -0.3, 1.9, 0.6, 0.22);
    for (const s of [-1, 1]) a(s * 0.92, 0.5, 0.05, 0.16, 0.42, 0.8, m2);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.85 : 2, q ? 2 : 0.85, 0, 0.55);
  },
  tvStand(x, z, ry = 0) {
    const g = this.prop(x, z, ry), wd = tmat(T.wood()), dk = col(0x17141c);
    const a = (px, py, pz, sx, sy, sz, mm) => { const o = new THREE.Mesh(G.box, mm); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); };
    a(0, 0.25, 0, 1.4, 0.5, 0.45, wd); a(0, 0.85, 0, 1.1, 0.65, 0.06, dk); a(0, 0.85, 0.035, 1.0, 0.56, 0.01, tmat(T.screen())); a(0, 0.53, 0, 0.3, 0.06, 0.2, dk);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.45 : 1.4, q ? 1.4 : 0.45, 0, 0.5);
  },
  bed(x, z, ry = 0, c = 0x4a6a9a) {
    const g = this.prop(x, z, ry), wd = tmat(T.wood());
    const a = (px, py, pz, sx, sy, sz, mm) => { const o = new THREE.Mesh(G.box, mm); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); };
    a(0, 0.2, 0, 1.4, 0.3, 2.0, wd); a(0, 0.42, 0.05, 1.32, 0.16, 1.88, col(0xe8e2d4)); a(0, 0.52, 0.25, 1.36, 0.06, 1.4, col(c));
    a(0, 0.56, -0.72, 1.0, 0.12, 0.35, col(0xf1e8ff)); a(0, 0.65, -0.98, 1.4, 0.9, 0.08, wd);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 2 : 1.4, q ? 1.4 : 2, 0, 0.58);
  },
  wardrobe(x, z, ry = 0) { const wd = tmat(T.wood()); this.box(x, z, Math.abs(Math.sin(ry)) > 0.5 ? 0.6 : 1.2, Math.abs(Math.sin(ry)) > 0.5 ? 1.2 : 0.6, 2.0, [wd, wd, wd, wd, tmat(T.cabinet(0x6a4a30)), tmat(T.cabinet(0x6a4a30))]); },
  kitchen(x, z, len, ry = 0) {
    const g = this.prop(x, z, ry), wd = tmat(T.cabinet(0xd8d0c0)), top = col(0x3a3440), mt = tmat(T.metal());
    const a = (px, py, pz, sx, sy, sz, mm) => { const o = new THREE.Mesh(G.box, mm); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); };
    a(0, 0.45, 0, len, 0.9, 0.6, wd); a(0, 0.92, 0, len + 0.04, 0.05, 0.64, top); a(len / 2 - 0.4, 0.96, 0, 0.6, 0.02, 0.5, col(0x17141c));
    a(-len / 2 - 0.35, 0.95, 0, 0.7, 1.9, 0.65, mt); a(-len / 2 - 0.35, 1.25, 0.33, 0.04, 0.4, 0.02, col(0x2b2533));
    a(0, 1.75, -0.12, len, 0.6, 0.35, wd);
    const q = Math.abs(Math.sin(ry)) > 0.5, L = len + 1.4;
    this.solid(x + (q ? 0 : -0.35), z + (q ? -0.35 : 0), q ? 0.65 : L, q ? L : 0.65, 0, 0.95);
  },
  desk(x, z, ry = 0, pc = true) {
    const g = this.prop(x, z, ry), wd = tmat(T.wood()), dk = col(0x2b2533);
    const a = (px, py, pz, sx, sy, sz, mm) => { const o = new THREE.Mesh(G.box, mm); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); };
    a(0, 0.74, 0, 1.4, 0.05, 0.7, wd); for (const xx of [-0.66, 0.66]) a(xx, 0.37, 0, 0.05, 0.74, 0.66, dk); a(0.45, 0.45, 0, 0.42, 0.5, 0.6, tmat(T.cabinet(0x6a6d78)));
    if (pc) { a(0, 1.05, -0.18, 0.6, 0.4, 0.04, dk); a(0, 1.05, -0.155, 0.54, 0.34, 0.01, tmat(T.screen())); a(0, 0.82, -0.18, 0.08, 0.12, 0.06, dk); a(0, 0.775, 0.1, 0.45, 0.02, 0.15, col(0x3a3440)); }
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.7 : 1.4, q ? 1.4 : 0.7, 0, 0.78);
  },
  rug(x, z, w, d, c1 = '#7b4bc4', c2 = '#f5c542') { const m = this.m(G.plane, flat(T.awning(c1, c2)), x, 0.02, z, w, d, 1); m.rotation.x = -Math.PI / 2; },
  plantPot(x, z, s = 1) {
    this.m(G.cyl8, col(0xb05a3a), x, 0.25 * s, z, 0.22 * s, 0.5 * s, 0.22 * s); this.m(G.cyl8, tmat(T.soil()), x, 0.5 * s, z, 0.2 * s, 0.02, 0.2 * s);
    for (let i = 0; i < 4; i++) { const l = this.m(G.ico, tmat(T.leaves(2)), x + (Math.random() - 0.5) * 0.2 * s, (0.7 + Math.random() * 0.4) * s, z + (Math.random() - 0.5) * 0.2 * s, 0.25 * s, 0.3 * s, 0.25 * s); l.rotation.y = Math.random() * 3; }
    this.solid(x, z, 0.45 * s, 0.45 * s, 0, 0.5 * s);
  },
  waterCooler(x, z) {
    this.box(x, z, 0.4, 0.4, 1.0, col(0xd8d8e0)); this.m(G.cyl8, lam({ color: 0x6ab0e0, transparent: true, opacity: 0.7 }, 'cooler'), x, 1.25, z, 0.17, 0.5, 0.17);
  },
  whiteboard(x, y, z, ry, w = 2) { const m = this.m(G.box, col(0xf1ece0), x, y, z, w, 1.1, 0.04); m.rotation.y = ry; const f = this.m(G.box, col(0x6a6d78), x, y - 0.6, z, w, 0.05, 0.12); f.rotation.y = ry; },
};

function shadeHex(c, a) { const r = Math.max(0, Math.min(255, ((c >> 16) & 255) + a)), g = Math.max(0, Math.min(255, ((c >> 8) & 255) + a)), b = Math.max(0, Math.min(255, (c & 255) + a)); return (r << 16) | (g << 8) | b; }
void W;
