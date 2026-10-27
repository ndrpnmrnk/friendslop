import { THREE, G, col, tmat, glow, own, lam, flat, chrome } from '../core/gfx.js';
import { DSTYLE } from './builder.js';
import { T, facade, rep } from '../core/textures.js';
import { HW } from '../config.js';
import { W } from './state.js';
import { addItem } from '../game/items.js';
import { breakModel, breakBox } from './breakables.js';
import { potModel } from './props.js';
import { buildElevator } from './elevator.js';
let _ao; const aoMat = () => _ao || (_ao = lam({ map: T.aoStrip(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }, 'aoStrip', true));
const BM = {}; const bottleMat = c => BM[c] || (BM[c] = lam({ color: c, transparent: true, opacity: 0.8 }, 'bottle' + c));

/* Многоэтажное здание, по которому можно ходить: наружные стены с окнами (окна совпадают
   снаружи и изнутри), перекрытия с проёмом под лестницу, лестница «змейкой» в лестничной
   клетке вдоль северной стены, перила вокруг проёмов, выход на крышу с парапетом.
   interior(fb, k, r) вызывается для каждого этажа: fb — конструктор, поднятый на высоту этажа
   (всё ставится как на земле), r — свободная часть этажа без лестницы. */
export const TowerMethods = {
  at(y) { const B = this.constructor, b = new B(this.ox, this.oz, this.Y + y, this.d); b._pk = 99; return b; },

  tower(o) {
    const { x, z, w, d } = o, n = o.floors, fh = Math.max(3.8, o.fh ?? 3.8), H = n * fh, t = 0.25, base = o.wall ?? 0x7c6a9c;
    const lit = o.lit ?? 0.5, brick = o.brick !== false, hasStairs = o.stairs !== false && n > 1;
    // v0.53: стиль стен по району; стеклянную стену у дома с настоящими проёмами заменяем панелями
    const twStyle = o.style || (DSTYLE[this.d?.id] ? DSTYLE[this.d.id].map(x => x === 'glass' ? 'panel' : x)[(Math.random() * DSTYLE[this.d.id].length) | 0] : (brick ? 'brick' : 'panel'));
    // лестница «с разворотом»: широкий марш до площадки на полэтажа, разворот, второй марш до этажа
    const run = o.run ?? 0.42, lane = o.lane ?? 2.25, EL = o.entry ?? 1.8, ML = o.mid ?? lane;
    const hsteps = Math.max(2, Math.round(fh / 2 / 0.28)), rise = fh / 2 / hsteps, Lh = hsteps * run;
    const ix0 = x + t, iz0 = z + t, ix1 = x + w - t, iz1 = z + d - t;
    const sx0 = o.stairX ?? ix0, sz0 = iz0, f0 = sx0 + EL, f1 = f0 + Lh, sx1 = hasStairs ? f1 + ML : sx0, sz1 = hasStairs ? sz0 + lane * 2 : sz0;
    const dw = o.doorW ?? 2.0, dh = 2.35, plain = col(base), inner = o.inner || T.wallIn([0xc8b8d8, 0xd8c8a8, 0xa8c0d0, 0xd0b0b0, 0xb8d0b0][(Math.random() * 5) | 0], Math.random() < 0.5 ? 'wallpaper_g' : 'wallpaper2_g');
    const doors = o.doors || (o.door ? [o.door] : []);
    // пожарная лестница (только на боковых стенах e/w): площадки на каждом этаже «ёлочкой», марши между ними,
    // снизу — красная откидная секция, сверху — лестница на крышу
    const FE = o.fireEscape && n > 1 ? o.fireEscape : null;
    const feZ = k => z + d * FE.at + (k % 2 ? 1.65 : -1.65);
    if (FE) o.gaps = (o.gaps || []).concat([{ side: FE.side, at: (feZ(n - 1) - z) / d }]);
    // настоящие окна: проём в стене + стекло, которое бьётся (выпад/бросок), снаружи подоконник
    // окна большие: персонаж пролезает (прыжок на подоконник и шаг наружу)
    const SILL = o.sill ?? 0.55, WH = Math.min(1.95, fh - SILL - 0.42), WW = 1.3, STEP = o.winStep ?? 2.3;
    const sides = { s: { len: w, at: z + d - t / 2, axis: 'x', out: 4, inn: 5 }, n: { len: w, at: z + t / 2, axis: 'x', out: 5, inn: 4 },
      e: { len: d - 2 * t, at: x + w - t / 2, axis: 'z', out: 0, inn: 1 }, w: { len: d - 2 * t, at: x + t / 2, axis: 'z', out: 1, inn: 0 } };
    const frame = chrome(0xc8d0ff), sill = chrome(0xe0e4ff), curtain = lam({ color: 0xffb070, emissive: 0xff9a4a, emissiveIntensity: 0.55 }, 'curtain');
    let doorOut=null,intercom=null,entryDoor=null;
    for (const [k, sd] of Object.entries(sides)) {
      const dr = doors.find(q => q.side === k);
      const g0 = dr ? dr.at * sd.len - dw / 2 : -1, g1 = g0 + dw;
      const U = u => k === 's' ? [x + u, sd.at] : k === 'n' ? [x + w - u, sd.at] : k === 'e' ? [sd.at, z + d - t - u] : [sd.at, z + t + u];
      const nrm = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[k], ax = sd.axis === 'x';
      // проёмы окон
      const holes = [];
      if (o.windows !== false && WH > 0.8) {
        const cnt = Math.floor((sd.len - 0.9) / STEP), off = (sd.len - (cnt - 1) * STEP) / 2;
        for (let f = 0; f < n; f++) for (let c = 0; c < cnt; c++) {
          const uc = off + c * STEP, u0 = uc - WW / 2, u1 = uc + WW / 2, y0 = f * fh + SILL, y1 = y0 + WH;
          if (dr && f === 0 && u1 > g0 - 0.35 && u0 < g1 + 0.35) continue;
          if (hasStairs && k === 'n') { const [wx] = U(uc); if (wx > sx0 - 0.7 && wx < sx1 + 0.7) continue; }
          if ((o.noWin || []).some(q => q.side === k && Math.abs(q.u - uc) < 1.2)) continue;
          holes.push({ u0, u1, y0, y1, f });
        }
      }
      if (dr) holes.push({ u0: g0, u1: g1, y0: 0, y1: dh, door: true });
      // стена из прямоугольников вокруг проёмов
      const fac = facade(base, sd.len, H, { lit, brick, windows: false, style: twStyle });
      const us = [...new Set([0, sd.len, ...holes.flatMap(h => [h.u0, h.u1])])].sort((a, b2) => a - b2);
      const ys = [...new Set([0, H, ...holes.flatMap(h => [h.y0, h.y1])])].sort((a, b2) => a - b2);
      const solidCell = (ua, ub, ya, yb) => !holes.some(h => ua >= h.u0 - 1e-6 && ub <= h.u1 + 1e-6 && ya >= h.y0 - 1e-6 && yb <= h.y1 + 1e-6);
      let rows = [];
      for (let yi = 0; yi < ys.length - 1; yi++) {
        const ya = ys[yi], yb = ys[yi + 1], strips = []; let st = null;
        for (let ui = 0; ui < us.length - 1; ui++) { const ua = us[ui], ub = us[ui + 1];
          if (solidCell(ua, ub, ya, yb)) { if (st) st[1] = ub; else st = [ua, ub]; } else if (st) { strips.push(st); st = null; } }
        if (st) strips.push(st);
        rows.push({ ya, yb, strips });
      }
      const rects = [];
      for (const r of rows) for (const sp of r.strips) {
        const prev = rects.find(q => q.yb === r.ya && Math.abs(q.ua - sp[0]) < 1e-6 && Math.abs(q.ub - sp[1]) < 1e-6);
        if (prev) prev.yb = r.yb; else rects.push({ ua: sp[0], ub: sp[1], ya: r.ya, yb: r.yb });
      }
      for (const q of rects) {
        const len = q.ub - q.ua, hh = q.yb - q.ya; if (len < 0.01 || hh < 0.01) continue;
        const ft = fac.clone(); ft.needsUpdate = true; ft.repeat.set(len / sd.len, hh / H); ft.offset.set(q.ua / sd.len, q.ya / H);
        const it = inner.clone(); it.needsUpdate = true; it.wrapS = it.wrapT = THREE.RepeatWrapping; it.repeat.set(len / 3, hh / fh); it.offset.set(0, (q.ya % fh) / fh);
        const mats = [plain, plain, plain, plain, plain, plain]; mats[sd.out] = own({ map: ft }); mats[sd.inn] = own({ map: it });
        const [bx, bz] = U((q.ua + q.ub) / 2);
        const bw = ax ? len : t, bd = ax ? t : len;
        this.m(G.box, mats, bx, q.ya + hh / 2, bz, bw, hh, bd); this.solid(bx, bz, bw, bd, q.ya, hh);
      }
      // карнизы по линиям окон: архитектурная деталь и закрывают стыки кусков стены
      if (holes.some(h => !h.door)) {
        const ledge = col(shadeHex(base, 22));
        for (let f = 0; f < n; f++) for (const [ly, lh] of [[f * fh + SILL - 0.05, 0.1], [f * fh + SILL + WH + 0.04, 0.08]]) {
          if (ly + lh > H - 0.05) continue;
          const segs = dr && ly < dh ? [[0, g0 - 0.05], [g1 + 0.05, sd.len]] : [[0, sd.len]];
          for (const [a, b2] of segs) { if (b2 - a < 0.1) continue; const [lx, lz] = U((a + b2) / 2);
            this.m(G.box, ledge, lx + nrm[0] * 0.04, ly + lh / 2, lz + nrm[1] * 0.04, ax ? b2 - a : t + 0.08, lh, ax ? t + 0.08 : b2 - a); }
        }
      }
      // окна: стекло, подоконник снаружи, рама, у некоторых тёплые шторы
      for (const h of holes) {
        if (h.door) continue;
        const [cx, cz] = U((h.u0 + h.u1) / 2), cy = (h.y0 + h.y1) / 2;
        this.vitrine(cx, cz, WW, WH, ax ? 'x' : 'z', h.y0);
        this.m(G.box, sill, cx + nrm[0] * 0.12, h.y0 - 0.04, cz + nrm[1] * 0.12, ax ? WW + 0.2 : 0.22, 0.08, ax ? 0.22 : WW + 0.2);
        this.m(G.box, frame, cx, h.y1 - 0.03, cz, ax ? WW : 0.08, 0.06, ax ? 0.08 : WW);
        const litW = Math.random() < lit * 0.6;
        if (litW) for (const s2 of [-1, 1]) {
          const ox = ax ? s2 * (WW / 2 - 0.16) : 0, oz = ax ? 0 : s2 * (WW / 2 - 0.16);
          this.m(G.box, curtain, cx + ox - nrm[0] * 0.2, cy, cz + oz - nrm[1] * 0.2, ax ? 0.3 : 0.03, WH, ax ? 0.03 : 0.3);
        }
        // тёплое пятно света на земле под окном первого этажа
        if (litW && h.f === 0 && o.windowPools !== false) this.light(cx + nrm[0] * 1.1, cz + nrm[1] * 1.1, 1.1, 0, true);
        // снаружи: редкий балкон; оборудование перенесено на крышу (на него можно выпрыгнуть)
        if (h.f >= 1 && o.facadeProps !== false) {
          const r = Math.random();
          if (k === 's' && r < 0.14 && !(o.ladder && o.ladder.side === 's')) {
            const by = h.f * fh, bm = col(0x3a3046);
            this.box(cx + nrm[0] * 0.55, cz + nrm[1] * 0.55, ax ? WW + 0.5 : 0.9, ax ? 0.9 : WW + 0.5, 0.1, tmat(T.concrete()), { y: by - 0.1 });
            for (const [ux, uz, uw, ud] of ax ? [[0, 0.95, WW + 0.5, 0.05], [-(WW + 0.5) / 2, 0.55, 0.05, 0.85], [(WW + 0.5) / 2, 0.55, 0.05, 0.85]] : [[0.95, 0, 0.05, WW + 0.5], [0.55, -(WW + 0.5) / 2, 0.85, 0.05], [0.55, (WW + 0.5) / 2, 0.85, 0.05]]) {
              const px = cx + (ax ? ux : ux * nrm[0]), pz = cz + (ax ? uz * nrm[1] : uz);
              this.m(G.box, bm, px, by + 0.95, pz, uw, 0.05, ud); this.m(G.box, bm, px, by + 0.5, pz, uw > 0.2 ? uw : 0.04, 0.9, ud > 0.2 ? ud : 0.04); this.solid(px, pz, Math.max(uw, 0.1), Math.max(ud, 0.1), by, 1.0); }
          }
        }
      }
      if (dr) {
        const e0 = U(g0), e1 = U(g1);
        const hinge = ax ? [Math.min(e0[0], e1[0]), sd.at] : [sd.at, Math.min(e0[1], e1[1])];
        const builtDoor=this.door(hinge[0], hinge[1], sd.axis, { s: 1, n: -1, e: -1, w: 1 }[k], 0, dw, dh, dr.style || o.doorStyle || 'wood');
        if(!entryDoor)entryDoor=builtDoor;
        const [cx, cz] = U((g0 + g1) / 2);
        if (!intercom) { const side = dr.at > 0.65 ? -1 : 1, q = U((g0 + g1) / 2 + side * (dw / 2 + 0.27)); intercom = { x: this.X(q[0] + nrm[0] * (t / 2 + 0.08)), z: this.Z(q[1] + nrm[1] * (t / 2 + 0.08)), y: this.Y, f: nrm }; }
        if (!doorOut) doorOut = [this.X(cx + nrm[0] * 1.3), this.Z(cz + nrm[1] * 1.3), this.X(cx - nrm[0] * 1.0), this.Z(cz - nrm[1] * 1.0)];
        if (!o.awning && o.canopy !== false) {
          this.m(G.box, col(0x2b2533), cx + nrm[0] * 0.78, dh + 0.36, cz + nrm[1] * 0.78, ax ? dw + 1 : 1.3, 0.12, ax ? 1.3 : dw + 1);
          this.m(G.box, glow(0xffd8a0), cx + nrm[0] * 0.78, dh + 0.27, cz + nrm[1] * 0.78, 0.3, 0.05, 0.3); this.light(cx + nrm[0] * 1.2, cz + nrm[1] * 1.2, 1.6);
        }
        if (HW && o.canopy !== false) { for (const s3 of [-1, 1]) if (Math.random() < 0.7) { const px = cx + nrm[0] * 0.7 + (ax ? s3 * (dw / 2 + 0.45) : 0), pz = cz + nrm[1] * 0.7 + (ax ? 0 : s3 * (dw / 2 + 0.45)); this.pumpkin(px, pz, 0.32); } }
        if (dr.sign) this.sign(cx + nrm[0] * (t / 2 + 0.03), dh + 0.78, cz + nrm[1] * (t / 2 + 0.03), { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[k], ...dr.sign, Math.max(2.4, Math.min(dw + 1.2, dr.sign[0].length * 0.24)), 0.55);
      }
    }
    if (FE) {
      /* Марши идут «змейкой» в ДВУХ полосах: чётные — у стены, нечётные — снаружи. Так верхний марш никогда
         не висит над нижним, и поднимаясь, ты не упираешься головой в следующий пролёт. Площадки — во всю ширину. */
      const sg = FE.side === 'w' ? -1 : 1, wx = FE.side === 'w' ? x : x + w, grate = tmat(T.grate()), mt = col(0x2b2533);
      const two = n > 2, laneX = j => wx + sg * (j ? 1.84 : 0.66), outer = wx + sg * (two ? 2.46 : 1.24), LW = two ? 2.44 : 1.22;
      for (let k = 1; k < n; k++) {
        const ly = k * fh, lz = feZ(k);
        this.box(wx + sg * (LW / 2 + 0.04), lz, LW, 1.3, 0.08, grate, { y: ly - 0.08 });
        this.m(G.box, mt, outer, ly + 0.95, lz, 0.05, 0.05, 1.3);
        if (k === 1) { for (const dz of [-0.53, 0.53]) this.solid(outer, lz + dz, 0.08, 0.24, ly, 1.0); } else this.solid(outer, lz, 0.08, 1.3, ly, 1.0);
        for (const dz of [-0.62, 0.62]) this.m(G.box, mt, outer, ly + 0.48, lz + dz, 0.04, 0.95, 0.04);
        if (k < n - 1) { // марш до следующей площадки — в своей полосе
          const lx = laneX(k % 2), up = feZ(k + 1) > lz;
          const z0 = lz + (up ? 0.65 : -0.65), z1 = feZ(k + 1) + (up ? -0.65 : 0.65), steps = Math.ceil(fh / 0.3), dzs = (z1 - z0) / steps;
          for (let i = 0; i < steps; i++) { const sz = z0 + dzs * (i + 0.5), top = ly + fh * (i + 1) / steps; this.m(G.box, grate, lx, top - 0.04, sz, 1.0, 0.08, Math.abs(dzs) + 0.02); this.solid(lx, sz, 1.0, Math.abs(dzs), top - 0.12, 0.12); }
          // перила марша — с внешней стороны полосы
          const rx = lx + sg * 0.52, hl = Math.hypot(z1 - z0, fh), hr = this.m(G.box, mt, rx, ly + fh / 2 + 0.9, (z0 + z1) / 2, 0.05, 0.05, hl); hr.rotation.x = -Math.atan2(fh, z1 - z0);
          if (k % 2) for (const zz of [z0, z1]) this.m(G.box, mt, rx, ly + (zz === z0 ? 0.48 : fh + 0.48), zz, 0.04, 0.95, 0.04);
        }
      }
      this.dropLadder(outer, feZ(1), FE.side, fh, Math.min(2.4, fh * 0.65));
      this.ladder(wx, feZ(n - 1), FE.side, H, (n - 1) * fh);
    }
    // мягкое затенение земли у основания стен
    if (o.ao !== false) for (const [k, sd] of Object.entries(sides)) {
      const nrm = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[k], len = sd.axis === 'x' ? w + 0.5 : d + 0.5;
      const cx = sd.axis === 'x' ? x + w / 2 : sd.at + nrm[0] * (t / 2 + 0.45), cz = sd.axis === 'x' ? sd.at + nrm[1] * (t / 2 + 0.45) : z + d / 2;
      const m = this.m(G.plane, aoMat(), cx, 0.02, cz, len, 0.9, 1); m.rotation.x = -Math.PI / 2; m.rotation.z = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[k]; m.renderOrder = 1;
    }
    // водостоки по двум углам фасада
    if (o.facadeProps !== false && n >= 1) for (const px of [x + 0.12, x + w - 0.12]) { this.m(G.cyl6, col(0x5a5d68), px, H / 2, z + d + 0.1, 0.06, H, 0.06); this.m(G.box, col(0x5a5d68), px, 0.08, z + d + 0.25, 0.14, 0.06, 0.3); }
    // крыша: вентиляционная будка и антенна (подальше от лестничной будки и мостков)
    if (o.roof !== false && o.facadeProps !== false && n >= 1) {
      this.aircon(x + w - 1.5, z + d - 1.4, H);
      this.m(G.cyl5, col(0x2b2533), x + 1.0, H + 1.2, z + d - 1.0, 0.03, 2.4, 0.03); for (const yy of [1.6, 2.1]) this.m(G.box, col(0x2b2533), x + 1.0, H + yy, z + d - 1.0, 0.7, 0.03, 0.03);
      if (Math.random() < 0.5) { const dsh = this.m(G.sph, col(0xd8d8e0), x + 1.0, H + 0.5, z + d - 1.6, 0.35, 0.35, 0.12); dsh.rotation.x = 0.5; }
    }
    // перекрытия с проёмом над пролётом, который пришёл снизу
    const floorTex = o.floor || T.floorWood(), ceil = tmat(T.plaster());
    const cut=(rs,h)=>!h?rs:rs.flatMap(([x0,z0,x1,z1])=>{const[a,b,c,d]=h;if(c<=x0||a>=x1||d<=z0||b>=z1)return [[x0,z0,x1,z1]];const l=Math.max(x0,a),r=Math.min(x1,c),n=Math.max(z0,b),s=Math.min(z1,d);return [[x0,z0,x1,n],[x0,s,x1,z1],[x0,n,l,s],[r,n,x1,s]].filter(q=>q[2]-q[0]>.01&&q[3]-q[1]>.01);});
    const liftHole=o.elevator&&[o.elevator.x0,o.elevator.z0,o.elevator.x1,o.elevator.z1];
    const slab=(y,hole,tex,roof)=>{const rects=cut(cut([[ix0,iz0,ix1,iz1]],hole),roof?null:liftHole);
      for (const [a, b2, c, e] of rects) {
        if (c - a < 0.01 || e - b2 < 0.01) continue;
        const ft = tex.clone(); ft.needsUpdate = true; ft.repeat.set((c - a) / 3, (e - b2) / 3);
        this.m(G.box, [ceil, ceil, roof ? tmat(ft) : flat(ft), ceil, ceil, ceil], (a + c) / 2, y - 0.1, (b2 + e) / 2, c - a, 0.2, e - b2); this.solid((a + c) / 2, (b2 + e) / 2, c - a, e - b2, y - 0.2, 0.2);
      }
    };
    { const rs=cut(cut([[ix0,iz0,ix1,iz1]],o.floorHole),liftHole);
      for (const [a, b2, c, e] of rs) { if (c - a < 0.01 || e - b2 < 0.01) continue; const gfl = this.m(G.plane, flat(rep(floorTex, (c - a) / 3, (e - b2) / 3)), (a + c) / 2, 0.015, (b2 + e) / 2, c - a, e - b2, 1); gfl.rotation.x = -Math.PI / 2; } }
    const rail = col(0x3a3046), railM = (cx, cz, ww, dd, y) => { this.m(G.box, rail, cx, y + 0.95, cz, ww, 0.06, dd); this.solid(cx, cz, ww, dd, y, 1.0);
      const nPost = Math.max(2, Math.round(Math.max(ww, dd) / 0.6)); for (let i = 0; i <= nPost; i++) { const tt = i / nPost - 0.5; this.m(G.box, rail, cx + (ww > dd ? tt * ww : 0), y + 0.48, cz + (ww > dd ? 0 : tt * dd), 0.04, 0.95, 0.04); } };
    // проём в перекрытии над всей лестницей (кроме входной площадки); вокруг перила, вход со стороны площадки открыт
    const HOLE = [f0, sz0, sx1, sz1];
    for (let k = 1; k <= n; k++) {
      const y = k * fh;
      slab(y, o.stairHole||(hasStairs ? HOLE : null), k < n ? floorTex : T.roof(), k === n);
      if (!hasStairs) continue;
      railM((f0 + sx1) / 2, sz1 + 0.03, sx1 - f0, 0.06, y);
      railM(sx1 - 0.03, (sz0 + sz1) / 2, 0.06, sz1 - sz0, y);
    }
    if (hasStairs) {
      const sm = tmat(T.concrete()), nose = col(0x4a4458), zA = sz0 + lane / 2, zB = sz0 + lane * 1.5, mz = sz0 + lane;
      const step = (cx, top, cz) => { const th = 0.3; this.m(G.box, sm, cx, top - th / 2, cz, run, th, lane - 0.08); this.solid(cx, cz, run, lane - 0.08, top - th, th);
        this.m(G.box, nose, cx + 0, top - 0.01, cz, run + 0.01, 0.03, lane - 0.06); };
      const soffit = (xa, ya, xb, yb, cz) => { const hl = Math.hypot(xb - xa, yb - ya), sl = this.m(G.box, sm, (xa + xb) / 2, (ya + yb) / 2 - 0.32, cz, hl, 0.12, lane - 0.1); sl.rotation.z = Math.atan2(yb - ya, xb - xa); };
      const hand = (xa, ya, xb, yb, cz) => { const hl = Math.hypot(xb - xa, yb - ya), h2 = this.m(G.box, rail, (xa + xb) / 2, (ya + yb) / 2 + 0.92, cz, hl, 0.05, 0.05); h2.rotation.z = Math.atan2(yb - ya, xb - xa);
        for (let i = 0; i <= 3; i++) { const tt = i / 3; this.m(G.box, rail, xa + (xb - xa) * tt, ya + (yb - ya) * tt + 0.46, cz, 0.04, 0.92, 0.04); } };
      for (let k = 0; k < n; k++) {
        const y0 = k * fh, ym = y0 + fh / 2;
        for (let i = 0; i < hsteps; i++) step(f0 + (i + 0.5) * run, y0 + rise * (i + 1), zA);
        soffit(f0, y0, f1, ym, zA);
        this.m(G.box, sm, (f1 + sx1) / 2, ym - 0.13, (sz0 + sz1) / 2, sx1 - f1, 0.26, sz1 - sz0); this.solid((f1 + sx1) / 2, (sz0 + sz1) / 2, sx1 - f1, sz1 - sz0, ym - 0.26, 0.26);
        for (let i = 0; i < hsteps; i++) step(f1 - (i + 0.5) * run, ym + rise * (i + 1), zB);
        soffit(f1, ym, f0, y0 + fh, zB);
        // поручни: вдоль середины (между маршами) и по краю второго марша со стороны зала
        hand(f0, y0, f1, ym, mz - 0.04); hand(f1, ym, f0, y0 + fh, mz + 0.04); hand(f1, ym, f0, y0 + fh, sz1 - 0.04);
        this.m(G.box, rail, sx1 - 0.03, ym + 0.95, (sz0 + sz1) / 2, 0.05, 0.05, sz1 - sz0); this.solid(sx1 - 0.03, (sz0 + sz1) / 2, 0.08, sz1 - sz0, ym, 1.0);
        this.light((f0 + sx1) / 2, mz, 1.4, ym, true);
      }
      // выход на крышу — будка над лестницей, проём над входной площадкой
      const top = H, bh = 2.6, bm = col(shadeHex(base, -20)), ex1 = f0;
      this.box((sx0 + sx1) / 2 + 0.1, sz0 + 0.1, sx1 - sx0 + 0.2, 0.2, bh, bm, { y: top });
      this.box(sx0 + 0.1, (sz0 + sz1) / 2 + 0.1, 0.2, sz1 - sz0 - 0.2, bh, bm, { y: top });
      this.box(sx1 + 0.1, (sz0 + sz1) / 2, 0.2, sz1 - sz0, bh, bm, { y: top });
      this.box((ex1 + sx1) / 2 + 0.1, sz1 + 0.1, sx1 - ex1 + 0.2, 0.2, bh, bm, { y: top });
      this.box((sx0 + sx1) / 2, (sz0 + sz1) / 2, sx1 - sx0 + 0.6, sz1 - sz0 + 0.6, 0.15, tmat(T.roof()), { y: top + bh });
      this.m(G.box, glow(0xffd8a0), (sx0 + ex1) / 2, top + bh - 0.15, sz1 + 0.25, 0.3, 0.06, 0.2);
    }
    // парапет стоит прямо на стенах, по их толщине
    if (o.parapet !== false) {
      const pm = col(0x3a3046), gaps = (o.gaps || []).concat(o.ladder ? [o.ladder] : []);
      const edges = { s: [x + w / 2, z + d - t / 2, w, t], n: [x + w / 2, z + t / 2, w, t], e: [x + w - t / 2, z + d / 2, t, d - 2 * t], w: [x + t / 2, z + d / 2, t, d - 2 * t] };
      for (const [k, [cx, cz, ew, ed]] of Object.entries(edges)) {
        const along = k === 's' || k === 'n', len = along ? ew : ed, start = along ? x + (w - ew) / 2 : z + (d - ed) / 2;
        const cuts = gaps.filter(g => g.side === k).map(g => (along ? x + g.at * w : z + g.at * d) - start).sort((a, b2) => a - b2);
        let a0 = 0; const segs = [];
        for (const c of cuts) { segs.push([a0, c - 0.7]); a0 = c + 0.7; } segs.push([a0, len]);
        for (const [a, b2] of segs) { if (b2 - a < 0.05) continue; const c = start + (a + b2) / 2, px = along ? c : cx, pz = along ? cz : c;
          this.m(G.box, pm, px, H + 0.4, pz, along ? b2 - a : t, 0.8, along ? t : b2 - a); this.solid(px, pz, along ? b2 - a : t, along ? t : b2 - a, H, 0.8);
          this.m(G.box, col(0x4a4058), px, H + 0.82, pz, along ? b2 - a : t + 0.08, 0.05, along ? t + 0.08 : b2 - a); }
      }
    }
    if (o.ladder) {
      const k = o.ladder.side, at = o.ladder.at;
      this.ladder(k === 'e' ? x + w : k === 'w' ? x : x + at * w, k === 's' ? z + d : k === 'n' ? z : z + at * d, k, H);
    }
    if (o.roof !== false) this.zone('roof', x + 0.8, sz1 + 0.6, x + w - 0.8, z + d - 0.8, H);
    if (hasStairs) this._stairs = { f0, zA: sz0 + lane / 2, fh, n };
    // вывеска магазина (v0.21): световой короб — тёмная рамка на кронштейнах + светящаяся надпись, иногда мигает
    if (o.sign) { const sw = Math.min(w * 0.7, 4.5), sy = Math.min(fh - 0.5, o.awning ? 3.3 : 2.95), dk = col(0x17141c);
      this.m(G.box, dk, x + w / 2, sy, z + d + 0.08, sw + 0.16, 0.86, 0.14); for (const s2 of [-1, 1]) this.m(G.box, dk, x + w / 2 + s2 * sw * 0.4, sy + 0.5, z + d + 0.05, 0.05, 0.16, 0.1);
      const sm = this.sign(x + w / 2, sy, z + d + 0.162, 0, ...o.sign, sw, 0.7); sm.material = new THREE.MeshBasicMaterial({ map: sm.material.map, color: 0xb8b0c8 });
      this.m(G.box, glow(0xffe0b0), x + w / 2, sy - 0.47, z + d + 0.12, sw, 0.03, 0.03); this.light(x + w / 2, z + d + 0.9, 1.4, 0, true);
      if (Math.random() < 0.4) W.flick.push({ mats: [sm.material], sign: true, t: Math.random() * 4, on: true }); }
    // Настоящие полки и предметы перед фасадом вместо наложенных 2D картинок.
    if(o.sign){const door=(o.doors||(o.door?[o.door]:[])).find(q=>q.side==='s'),dx=door?x+door.at*w:x+w/2,side=dx-x>w/2?1:-1,vx=side>0?x+w*.23:x+w*.77;
      this.shelf(vx,z+d+.42,Math.min(2.4,w*.32),0,true);
    }

    if (o.awning) { const a = this.m(G.box, tmat(T.awning(...o.awning)), x + w / 2, 2.72, z + d + 0.62, w - 0.6, 0.1, 1.2); a.rotation.x = 0.25;
      // маркиза-батут: упругая ткань подбрасывает
      this.solid(x + w / 2, z + d + 0.62, w - 0.6, 1.1, 2.6, 0.12); this.bouncer(x + 0.3, z + d + 0.1, x + w - 0.3, z + d + 1.15, 2.72, 11); }
    const guide = { name: o.name || (o.sign && o.sign[0]) || this.d, box: [this.X(ix0), this.Z(iz0), this.X(ix1), this.Z(iz1)], y0: this.Y, fh, floors: n, door: doorOut, entryDoor, intercom,
      stairPath: hasStairs ? { entryX: this.X(sx0 + EL / 2), midX: this.X(f1 + ML / 2), za: this.Z(sz0 + lane / 2), zb: this.Z(sz0 + lane * 1.5) } : null,
      stair: hasStairs ? [this.X(sx0 + EL / 2), this.Z(sz0 + lane * 1.5), this.X(f0 + 0.4), this.Z(sz0 + lane / 2)] : null };
    if(o.elevator)guide.elevator=buildElevator(this,o.elevator,n,fh);
    W.buildings.push(guide);
    // этажи: свет на потолке + наполнение
    for (let k = 0; k < n; k++) {
      const fb = this.at(k * fh), r = { x0: ix0, z0: sz1 + (hasStairs ? 0.15 : 0), x1: ix1, z1: iz1, sx0, sx1, h: fh, k, top: H };
      if (o.lights !== false) for (let lx = ix0 + 2.2; lx < ix1 - 1; lx += 4.5) { fb.m(G.box, glow(0xfff0d0), lx, fh - 0.23, (r.z0 + r.z1) / 2, 1.2, 0.04, 0.3); fb.light(lx, (r.z0 + r.z1) / 2, 2.0, 0, true); }
      if (k > 0 && r.z1 - r.z0 > 2) W.spots.deliver.push({ x: fb.X((r.x0 + r.x1) / 2), z: fb.Z((r.z0 + r.z1) / 2), y: fb.Y, name: `${this.d}, ${k + 1} этаж`, floor: k,
        guide: { box: [this.X(ix0), this.Z(iz0), this.X(ix1), this.Z(iz1)], y0: this.Y, fh, door: doorOut, stair: [this.X(sx0 + 0.5), this.Z(sz0 + lane * 1.5), this.X(f0 + 0.4), this.Z(sz0 + lane / 2)] } });
      if (o.interior) o.interior(fb, k, r);
      if (o.zoneInside !== false && r.z1 - r.z0 > 2) fb.zone('inside', ix0 + 0.5, r.z0 + 0.4, ix1 - 0.5, r.z1 - 0.5);
      if (HW && o.web !== false && k % 2 === 1) fb.web(ix1 - 0.3, fh - 0.6, iz1 - 0.02, Math.PI, 0.9);
    }
    return { x0: ix0, z0: iz0, x1: ix1, z1: iz1, top: H, h: fh, fh, stair: [sx0, sz0, sx1, sz1] };
  },

  /* ---------- мебель ---------- */
  // перегородка с дверным проёмом (gapAt — доля длины), штукатурка с двух сторон
  partition(x0, z0, x1, z1, h, gapAt = 0.5, gw = 2.0) {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? x1 - x0 : z1 - z0, pm = tmat(T.plaster()), th = 0.12;
    const g0 = len * gapAt - gw / 2, g1 = g0 + gw;
    for (const [a, b2, y0, y1] of [[0, g0, 0, h], [g1, len, 0, h], [g0, g1, 2.2, h]]) {
      if (b2 - a < 0.02 || y1 - y0 < 0.02) continue;
      const c = (a + b2) / 2, px = along ? x0 + c : x0, pz = along ? z0 : z0 + c;
      this.box(px, pz, along ? b2 - a : th, along ? th : b2 - a, y1 - y0, pm, { y: y0 });
    }
  },
  sofa(x, z, ry = 0, c = 0x6a3a5a) {
    const cl = T.cloth(c, Math.random() < 0.5 ? 'velvet_g' : 'leather_g'), g = this.prop(x, z, ry), m = cl ? tmat(cl) : col(c), m2 = cl ? tmat(T.cloth(c - 0x101010 > 0 ? c - 0x101010 : c, 'fabric_g')) : col(c - 0x101010 > 0 ? c - 0x101010 : c);
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
    a(0, 0.2, 0, 1.4, 0.3, 2.0, wd); a(0, 0.42, 0.05, 1.32, 0.16, 1.88, col(0xe8e2d4)); a(0, 0.52, 0.25, 1.36, 0.06, 1.4, T.cloth(c, 'fabric_g') ? tmat(T.cloth(c, 'fabric_g')) : col(c));
    a(0, 0.56, -0.72, 1.0, 0.12, 0.35, col(0xf1e8ff)); a(0, 0.65, -0.98, 1.4, 0.9, 0.08, wd);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 2 : 1.4, q ? 1.4 : 2, 0, 0.58);
  },
  wardrobe(x, z, ry = 0) { const wd = tmat(T.wood()); W.hides.push({ x: this.X(x), y: this.Y, z: this.Z(z), r: 1.3, kind: 'wardrobe', out: [Math.round(Math.sin(ry)), Math.round(Math.cos(ry))] }); this.box(x, z, Math.abs(Math.sin(ry)) > 0.5 ? 0.6 : 1.2, Math.abs(Math.sin(ry)) > 0.5 ? 1.2 : 0.6, 2.0, [wd, wd, wd, wd, tmat(T.cabinet(0x6a4a30)), tmat(T.cabinet(0x6a4a30))]); },
  kitchen(x, z, len, ry = 0) {
    const g = this.prop(x, z, ry), wd = tmat(T.cabinet(0xd8d0c0)), top = col(0x3a3440), mt = tmat(T.metal());
    const a = (px, py, pz, sx, sy, sz, mm) => { const o = new THREE.Mesh(G.box, mm); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); };
    a(0, 0.45, 0, len, 0.9, 0.6, wd); a(0, 0.92, 0, len + 0.04, 0.05, 0.64, top); a(len / 2 - 0.4, 0.96, 0, 0.6, 0.02, 0.5, col(0x17141c));
    a(0, 1.75, -0.12, len, 0.6, 0.35, wd);
    const q=Math.abs(Math.sin(ry))>.5;this.solid(x,z,q?.65:len,q?len:.65,0,.95);g.surface=this.surface(x,z,len+.04,.64,.945,ry,'kitchen');
    // холодильник с открывающейся дверцей рядом со столешницей
    const fx = -len / 2 - 0.4; this.fridge(x + fx * Math.cos(ry), z - fx * Math.sin(ry), ry);
    this.kitchenSpot(x, z, [Math.round(Math.sin(ry)), Math.round(Math.cos(ry))]);
  },
  desk(x, z, ry = 0, pc = true) {
    const g = this.prop(x, z, ry), wd = tmat(T.wood()), dk = col(0x2b2533);
    const a = (px, py, pz, sx, sy, sz, mm) => { const o = new THREE.Mesh(G.box, mm); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); };
    a(0, 0.74, 0, 1.4, 0.05, 0.7, wd); for (const xx of [-0.66, 0.66]) a(xx, 0.37, 0, 0.05, 0.74, 0.66, dk); a(0.45, 0.45, 0, 0.42, 0.5, 0.6, tmat(T.cabinet(0x6a6d78)));
    if (pc && Math.random() < 0.35) this.phoneSpot(x, z, [Math.round(Math.sin(ry)), Math.round(Math.cos(ry))]);
    const deskSurface=this.surface(x,z,1.4,.7,.765,ry,'desk');g.surface=deskSurface;
    // компьютер, клавиатура и мелочь на столе — настоящие предметы: взять, бросить, разбить (v0.19)
    if(pc){deskSurface.put('monitor',-.1,-.15);if(Math.random()<.5)deskSurface.put('keyboard',-.1,.18);if(Math.random()<.5){const v=g.localToWorld(new THREE.Vector3(-.90,0,.05));addItem('pc',v.x,v.y,v.z,ry);}if(Math.random()<.45)deskSurface.put(['mug','dlamp','books','pot'][Math.random()*4|0],.5,-.12);}

    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.7 : 1.4, q ? 1.4 : 0.7, 0, 0.765);return g;
  },
  rug(x, z, w, d, c1 = '#7b4bc4', c2 = '#f5c542') { const m = this.m(G.plane, flat(T.awning(c1, c2)), x, 0.02, z, w, d, 1); m.rotation.x = -Math.PI / 2; },
  // цветок в горшке — бьётся от брошенного предмета или выпада
  plantPot(x, z, s = 1) { return breakModel(this.X(x), this.Y, this.Z(z), 0.5 * s, 1.1 * s, 0.5 * s, 'pot', potModel(), { unit: s, oy: 0.5 * s }); },
  // бутылки на столе/стойке — бьются
  bottles(x, y, z, n = 3) {
    const cols = [0x2a7a3a, 0x6a3a1a, 0x3a6a9a];
    for (let i = 0; i < n; i++) { const p = breakBox(this.X(x + (i - (n - 1) / 2) * 0.14), this.Y + y, this.Z(z + (Math.random() - 0.5) * 0.1), 0.07, 0.28, 0.07, 'bottle', bottleMat(cols[i % 3])); p.mesh.geometry = G.cyl8; p.mesh.scale.x = p.mesh.scale.z = 0.035; }
  },
  // сейф (для миссии «Взломай сейф»): тяжёлый ящик с диском, ry — куда смотрит дверца
  safe(x, z, ry = 0) {
    const nx = Math.round(Math.sin(ry)), nz = Math.round(Math.cos(ry)), mt = col(0x3a3e48);
    this.box(x, z, 0.7, 0.7, 0.9, [mt, mt, col(0x4a4e58), mt, tmat(T.cabinet(0x3a3e48)), mt], { ry });
    W.spots.safe.push({ x: this.X(x + nx * 1.0), z: this.Z(z + nz * 1.0), y: this.Y, f: [nx, nz], bx: this.X(x), bz: this.Z(z), district: this.d, label: 'сейф' });
  },
  waterCooler(x, z) {
    this.box(x, z, 0.4, 0.4, 1.0, col(0xd8d8e0)); this.m(G.cyl8, lam({ color: 0x6ab0e0, transparent: true, opacity: 0.7 }, 'cooler'), x, 1.25, z, 0.17, 0.5, 0.17);
  },
  whiteboard(x, y, z, ry, w = 2) { const m = this.m(G.box, col(0xf1ece0), x, y, z, w, 1.1, 0.04); m.rotation.y = ry; const f = this.m(G.box, col(0x6a6d78), x, y - 0.6, z, w, 0.05, 0.12); f.rotation.y = ry; },
};

function shadeHex(c, a) { const r = Math.max(0, Math.min(255, ((c >> 16) & 255) + a)), g = Math.max(0, Math.min(255, ((c >> 8) & 255) + a)), b = Math.max(0, Math.min(255, (c & 255) + a)); return (r << 16) | (g << 8) | b; }
void W;

let _vg; const VIT_GLASS = () => _vg || (_vg = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.12, depthWrite: false }));
