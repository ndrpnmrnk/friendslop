import { THREE, G, col, tmat, lam, glow, mesh, compose, alphaMat } from '../core/gfx.js';
import { addSolid, addObb } from './physics.js';
import { addSwinger } from './swingers.js';
import { rep,pix } from '../core/textures.js';
import { burst, puff } from './particles.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addZone } from './physics.js';
import { addZipline } from '../game/zipline.js';
import { placeRake, placeCushion, addSeesaw } from '../game/traps.js';

/* Дополнительные методы конструктора района (v0.14): зиплайны, ловушки, места для новых миссий. */
export const MoreMethods = {
  zipline(ax, ay, az, bx, by, bz) { return addZipline(this, ax, ay, az, bx, by, bz); },
  rake(x, z, ry = 0, y = 0) { return placeRake(this.X(x), this.Y + y, this.Z(z), ry); },
  cushion(x, z, y = 0) { return placeCushion(this.X(x), this.Y + y, this.Z(z)); },
  seesaw(x, z, ry = 0) { return addSeesaw(this, x, z, ry); },
  // скользкий люк: крышка в масляном пятне
  slickManhole(x, z) {
    this.m(G.cyl12, tmat(T.metal()), x, 0.02, z, 0.55, 0.04, 0.55);
    this.slip(x, z, 1.0);
  },
  // место для миссии «Салат»: кухонный стол с разделочной доской (интерьеры, фудкорт)
  kitchenSpot(x, z, f, y = 0) { W.spots.kitchen = W.spots.kitchen || []; W.spots.kitchen.push({ x: this.X(x + f[0] * 0.95), z: this.Z(z + f[1] * 0.95), y: this.Y + y, f, bx: this.X(x), bz: this.Z(z), district: this.d, label: 'кухня' }); },
  // стол для «звонящего телефона»
  phoneSpot(x, z, f, y = 0) { W.spots.phone = W.spots.phone || []; W.spots.phone.push({ x: this.X(x + f[0] * 0.9), z: this.Z(z + f[1] * 0.9), y: this.Y + y, f, bx: this.X(x), bz: this.Z(z), by: this.Y + y + 0.8, district: this.d, label: 'телефон' }); },
  // урна, которая может загореться (миссия «Потуши урну»)
  // морской контейнер (как в промзоне): гофра, двери с торцов, стойки, номер
  container(x, z, w, d, c, y = 0) {
    const m = tmat(T.corrugated(c)), door = tmat(T.containerEnd(c)), dk = col(0x2b2533), long = w > d;
    this.box(x, z, w, d, 2.6, long ? [door, door, m, m, m, m] : [m, m, m, m, door, door], { y });
    this.m(G.box, dk, x, y + 2.63, z, w + 0.04, 0.05, d + 0.04);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.m(G.box, dk, x + sx * (w / 2 - 0.02), y + 1.3, z + sz * (d / 2 - 0.02), 0.14, 2.6, 0.14);
    const ex = long ? w / 2 + 0.03 : 0, ez = long ? 0 : d / 2 + 0.03;
    for (const s2 of [-1, 1]) for (const k of [-0.25, 0.25]) this.m(G.box, col(0x8a8d98), x + s2 * ex + (long ? 0 : k * d), y + 1.3, z + s2 * ez + (long ? k * d : 0), long ? 0.04 : 0.05, 2.3, long ? 0.05 : 0.04);
  },
  /* ---------- скейт-парк ---------- */
  // четвертная рампа: изгиб растёт к +z (ry поворачивает), ширина w, радиус R; на верху — площадка с копингом
  quarterPipe(x, z, w, R, ry = 0, deck = 1.2) {
    const g = this.prop(x, z, ry), N = 10, U = R * 0.78, h = u => R - Math.sqrt(R * R - u * u), wd = tmat(T.wood());
    // гладкая поверхность изгиба
    const geo = new THREE.PlaneGeometry(w, 1, 1, N), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const v = pos.getY(i) + 0.5, u = v * U; pos.setXYZ(i, pos.getX(i), h(u) + 0.01, u); }
    geo.computeVertexNormals(); const surf = new THREE.Mesh(geo, lam({ map: rep(T.concrete(), w / 3, 1), side: THREE.DoubleSide }, 'qpSurf' + w)); g.add(surf);
    // боковины и площадка
    const top = h(U); for (const sx of [-1, 1]) { const sg = new THREE.Shape(); sg.moveTo(0, 0); for (let i = 0; i <= N; i++) { const u = i / N * U; sg.lineTo(u, h(u)); } sg.lineTo(U + deck, top); sg.lineTo(U + deck, 0); sg.lineTo(0, 0);
      const side = new THREE.Mesh(new THREE.ShapeGeometry(sg), lam({ map: T.wood(), side: THREE.DoubleSide }, 'qpSide')); side.rotation.y = -Math.PI / 2; side.position.x = sx * w / 2; g.add(side); }
    const dk = new THREE.Mesh(G.box, wd); dk.position.set(0, top - 0.04, U + deck / 2); dk.scale.set(w, 0.08, deck); g.add(dk);
    const cp = new THREE.Mesh(G.cyl8, col(0x9a9da8)); cp.rotation.z = Math.PI / 2; cp.scale.set(0.05, w, 0.05); cp.position.set(0, top + 0.02, U); g.add(cp);
    // коллизия: ступеньки по 15 см вдоль изгиба (колёсное заезжает, персонаж поднимается шагом)
    const fx = Math.sin(ry), fz = Math.cos(ry), q = Math.abs(fx) > 0.5;
    const steps = Math.ceil(U / 0.15);
    for (let i = 0; i < steps; i++) { const u0 = i * U / steps, u1 = (i + 1) * U / steps, hc = h(u1), uc = (u0 + u1) / 2;
      this.solid(x + fx * uc, z + fz * uc, q ? (u1 - u0) : w, q ? w : (u1 - u0), 0, hc); }
    this.solid(x + fx * (U + deck / 2), z + fz * (U + deck / 2), q ? deck : w, q ? w : deck, 0, top);
    return top;
  },
  // прямой трамплин-клин: поднимается на hgt за длину len в направлении ry
  wedge(x, z, w, len, hgt, ry = 0) {
    const g = this.prop(x, z, ry), sg = new THREE.Shape(); sg.moveTo(0, 0); sg.lineTo(len, hgt); sg.lineTo(len, 0); sg.lineTo(0, 0);
    const ex = new THREE.Mesh(new THREE.ExtrudeGeometry(sg, { depth: w, bevelEnabled: false }), lam({ map: rep(T.concrete(), 1, 1) }, 'wedge')); ex.rotation.y = -Math.PI / 2; ex.position.x = w / 2; g.add(ex);
    const fx = Math.sin(ry), fz = Math.cos(ry), q = Math.abs(fx) > 0.5, n = Math.ceil(len / 0.2);
    for (let i = 0; i < n; i++) { const u0 = i * len / n, u1 = (i + 1) * len / n; this.solid(x + fx * (u0 + u1) / 2, z + fz * (u0 + u1) / 2, q ? u1 - u0 : w, q ? w : u1 - u0, 0, hgt * u1 / len); }
  },
  // перила для скольжения (grind): труба на стойках; скейт/самокат «садится» на неё после прыжка
  grindRail(x0, z0, x1, z1, y = 0.45) {
    const len = Math.hypot(x1 - x0, z1 - z0), mt = col(0xc8c8d8), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, a = Math.atan2(x1 - x0, z1 - z0);
    const r = this.m(G.cyl8, mt, cx, y, cz, 0.04, len, 0.04); r.rotation.set(Math.PI / 2, a, 0, 'YXZ');
    for (let t = 0; t <= 1.001; t += 1 / Math.max(1, Math.round(len / 2))) this.m(G.box, col(0x2b2533), x0 + (x1 - x0) * t, y / 2, z0 + (z1 - z0) * t, 0.06, y, 0.06);
    W.rails.push({ x0: this.X(x0), z0: this.Z(z0), x1: this.X(x1), z1: this.Z(z1), y: this.Y + y + 0.02 });
  },
  /* ---------- стадион ---------- */
  bleachers(x, z, w, rows = 4, ry = 0) {
    const g = this.prop(x, z, ry), cs = [0xd8243a, 0xf1e8ff, 0x4ab0f0];
    g.add(compose('bleach' + w + rows, a => { for (let i = 0; i < rows; i++) { a(G.box, tmat(T.concrete()), 0, (i+1)*0.45/2, -i*0.82, w, (i+1)*0.45, 0.82); for (let k = 0; k < Math.floor(w / 0.6); k++) a(G.box, col(cs[(k + i) % 3]), -w / 2 + 0.3 + k * 0.6, (i + 1) * 0.45 + 0.08, -i * 0.82 + 0.1, 0.42, 0.14, 0.4); } for(const x of [-w/2+.1,w/2-.1])for(let r=0;r<rows;r++){a(G.box,col(0x55515d),x,(r+1)*.45/2,-r*.82,.10,(r+1)*.45,.7);a(G.box,col(0x8a8d98),x,(r+1)*.45+.22,-r*.82,.04,.4,.04);}
    a(G.box, col(0x3a3440), 0, rows * 0.45 + 0.5, -(rows - 1) * 0.8 - 0.35, w, 1.0, 0.1); }));
    const fx = Math.sin(ry), fz = Math.cos(ry), q = Math.abs(fx) > 0.5;
    for (let i = 0; i < rows; i++) this.solid(x - fx * i * 0.82, z - fz * i * 0.82, q ? 0.8 : w, q ? w : 0.8, 0, (i + 1) * 0.45);
  },
  // Футбольные ворота (v0.18): сетка как у настоящих — сверху от перекладины назад, задняя стенка наклонно к земле, боковины-трапеции
  goal(x, z, ry = 0, w = 4, h = 2) {
    const g = this.prop(x, z, ry), wt = col(0xf1e8ff), D0 = 0.8, D1 = 1.6;
    const netTex=pix('footballNet32',32,32,c=>{c.clearRect(0,0,32,32);c.strokeStyle='#d6cbbb';c.lineWidth=1;for(let i=0;i<=32;i+=8){c.beginPath();c.moveTo(i,0);c.lineTo(i,32);c.moveTo(0,i);c.lineTo(32,i);c.stroke();}});
    const net=lam({map:rep(netTex,w/.8,h/.8),transparent:true,alphaTest:.15,side:THREE.DoubleSide},'goalNet32'+w+':'+h),netM=lam({map:rep(netTex,1/.8,1/.8),transparent:true,alphaTest:.15,side:THREE.DoubleSide},'goalSide32');
    const bar = (px, py, pz, sx, sy, sz, rx = 0) => { const m = new THREE.Mesh(G.box, wt); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.rotation.x = rx; g.add(m); };
    for (const sx of [-1, 1]) { bar(sx * w / 2, h / 2, 0, 0.1, h, 0.1); bar(sx * w / 2, 0.03, -D1 / 2, 0.05, 0.05, D1); bar(sx * w / 2, h, -D0 / 2, 0.05, 0.05, D0);
      const L = Math.hypot(h, D1 - D0); bar(sx * w / 2, h / 2, -(D0 + D1) / 2, 0.05, L, 0.05, Math.atan2(D1 - D0, h)); }
    bar(0, h, 0, w + 0.1, 0.1, 0.1); bar(0, 0.03, -D1, w, 0.05, 0.05); bar(0, h, -D0, w, 0.05, 0.05);
    const top = new THREE.Mesh(G.plane, net); top.position.set(0, h - 0.01, -D0 / 2); top.rotation.x = -Math.PI / 2; top.scale.set(w, D0, 1); g.add(top);
    const Lb = Math.hypot(h, D1 - D0), back = new THREE.Mesh(G.plane, net); back.position.set(0, h / 2, -(D0 + D1) / 2); back.rotation.x = Math.atan2(D1 - D0, h); back.scale.set(w, Lb, 1); g.add(back);
    const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(D1, 0), new THREE.Vector2(D0, h), new THREE.Vector2(0, h)]), sg = new THREE.ShapeGeometry(sh);
    for (const sx of [-1, 1]) { const sd = new THREE.Mesh(sg, netM); sd.position.set(sx * w / 2, 0, 0); sd.rotation.y = Math.PI / 2; g.add(sd); }
    const fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
    for (const sx of [-1, 1]) this.solid(x + rx * sx * w / 2, z + rz * sx * w / 2, 0.15, 0.15, 0, h);
    // Три полосы следуют наклону задней сетки; верх больше не проходим насквозь.
    for(let i=0;i<3;i++){const depth=D1-(D1-D0)*(i+.5)/3;this.solid(x-fx*depth,z-fz*depth,Math.abs(fx)>.5?.32:w,Math.abs(fx)>.5?w:.32,i*h/3,h/3+.035);}
    this.solid(x-fx*D0/2,z-fz*D0/2,Math.abs(fx)>.5?D0:w,Math.abs(fx)>.5?w:D0,h-.05,.08);

    for(const side of [-1,1])this.solid(x+rx*side*w/2-fx*.8,z+rz*side*w/2-fz*.8,Math.abs(fx)>.5?1.6:.14,Math.abs(fx)>.5?.14:1.6,0,h);
    this.solid(x,z,Math.abs(fx)>.5?.14:w+.12,Math.abs(fx)>.5?w+.12:.14,h-.06,.14);
    W.goals.push({ x: this.X(x), z: this.Z(z), y: this.Y, fx, fz, rx, rz, w, h, score: 0 });
  },
  floodlight(x, z, ry = 0, h = 9, pool = true) {
    const dk = col(0x3a3440); this.m(G.cyl8, dk, x, h / 2, z, 0.14, h, 0.14); this.solid(x, z, 0.35, 0.35, 0, h);
    const g = this.prop(x, z, ry); g.add(compose('flood', a => { a(G.box, dk, 0, h + 0.4, 0.2, 1.8, 1.0, 0.15); for (let i = 0; i < 6; i++) a(G.box, glow(0xfff6e0), -0.6 + (i % 3) * 0.6, h + 0.65 - Math.floor(i / 3) * 0.5, 0.29, 0.45, 0.35, 0.03); }));
    // v0.60: pool=false — только сам прожектор светится, ни пятна, ни света на земле (в хабе пятно висело посреди поля)
    if (pool) { const fx = Math.sin(ry), fz = Math.cos(ry); this.light(x + fx * 5, z + fz * 5, 4.5); }
  },
  scoreboard(x, z, ry = 0) {
    const g = this.prop(x, z, ry), c = document.createElement('canvas'); c.width = 128; c.height = 48;
    const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter;
    const draw = (a, b2) => { const q = c.getContext('2d'); q.fillStyle = '#17111f'; q.fillRect(0, 0, 128, 48); q.fillStyle = '#ff8a1f'; q.font = 'bold 12px monospace'; q.textAlign = 'center'; q.fillText('ТЫКВЫ  ПРИЗРАКИ', 64, 14); q.font = 'bold 26px monospace'; q.fillStyle = '#f5c542'; q.fillText(a + ' : ' + b2, 64, 42); tex.needsUpdate = true; };
    draw(0, 0); W.scoreboard = draw;
    g.add(compose('sbFrame', a => { const dk = col(0x2b2533); a(G.box, dk, 0, 4.2, -0.06, 3.4, 1.5, 0.12); for (const sx of [-1.4, 1.4]) a(G.box, dk, sx, 1.75, -0.06, 0.15, 3.5, 0.15); }));
    const scr = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: tex })); scr.position.set(0, 4.2, 0.01); scr.scale.set(3.1, 1.2, 1); g.add(scr); W.keep.push(scr);
    const fx = Math.cos(ry), fz = -Math.sin(ry); for (const sx of [-1.4, 1.4]) this.solid(x + fx * sx, z + fz * sx, 0.2, 0.2, 0, 3.5);
  },
  /* ---------- порт ---------- */
  // маяк: башня с балконом, лестница снаружи, крутящийся луч
  lighthouse(x, z) {
    const H = 9, st = tmat(T.awning('#f1e8ff', '#d8243a'));
    this.m(new THREE.CylinderGeometry(1.25, 1.6, H, 10), st, x, H / 2, z); this.solid(x, z, 2.6, 2.6, 0, H);
    this.m(G.cyl12, col(0x2b2533), x, H + 0.06, z, 2.1, 0.12, 2.1); this.solid(x, z, 4, 4, H - 0.1, 0.22);
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; this.m(G.box, col(0x2b2533), x + Math.cos(a) * 2.0, H + 0.6, z + Math.sin(a) * 2.0, 0.05, 1.0, 0.05); }
    this.m(G.torus, col(0x2b2533), x, H + 1.1, z, 2.0, 2.0, 0.15).rotation.x = Math.PI / 2;
    for (const [dx, dz, w, d] of [[0, -1.95, 4, 0.12], [-1.95, 0, 0.12, 4], [1.95, 0, 0.12, 4]]) this.solid(x + dx, z + dz, w, d, H + 0.1, 1.0);
    this.m(G.cyl8, lam({ color: 0xfff1c0, emissive: 0xffd28a, emissiveIntensity: 0.9 }, 'lhGlass'), x, H + 1.0, z, 0.8, 1.6, 0.8);
    this.m(G.cone8, col(0xd8243a), x, H + 2.25, z, 1.0, 0.9, 1.0); this.solid(x, z, 1.6, 1.6, H + 0.1, 2);
    this.ladder(x, z + 1.6, 's', H + 0.12);
    const beam = new THREE.Group(); beam.position.set(this.X(x), this.Y + H + 1.0, this.Z(z)); W.group.add(beam); W.keep.push(beam);
    const bm = alphaMat(T.light(), { blending: THREE.AdditiveBlending, opacity: 0.4, side: THREE.DoubleSide, color: 0xfff1c0 });
    for (const s2 of [-1, 1]) { const c = mesh(G.cone8, bm, s2 * 9, 0, 0, 1.6, 18, 1.6, beam); c.rotation.z = s2 * Math.PI / 2; }
    W.animated.push((dt, t) => { beam.rotation.y = t * 0.8; });
    return H;
  },
  // катер у причала: качается на воде, на палубу и рубку можно запрыгнуть
  boat(x, z, ry, wy) {
    const g = new THREE.Group(); g.position.set(this.X(x), this.Y + wy, this.Z(z)); g.rotation.y = ry; W.group.add(g); W.keep.push(g);
    g.add(compose('motorboat', a => { const hull = col(0xf1e8ff), red = col(0xd8243a), wd = tmat(T.wood()), dk = col(0x2b2533);
      a(G.box, hull, 0, 0.0, 0, 5.0, 0.7, 2.0); a(G.cone4, hull, 2.9, 0.0, 0, 0.98, 0.9, 1.0, 0, Math.PI / 4, -Math.PI / 2); a(G.box, red, 0, -0.25, 0, 5.02, 0.14, 2.02);
      a(G.box, wd, -0.2, 0.37, 0, 4.4, 0.05, 1.8); a(G.box, col(0x4a6a9a), -1.0, 0.95, 0, 1.6, 1.1, 1.5); a(G.box, lam({ color: 0x9ccbec, transparent: true, opacity: 0.7 }, 'boatGlass'), -0.15, 1.05, 0, 0.05, 0.6, 1.3);
      a(G.box, dk, -1.0, 1.52, 0, 1.75, 0.06, 1.65); for (const sz of [-0.95, 0.95]) a(G.box, dk, 0.6, 0.65, sz, 3.0, 0.05, 0.05); a(G.box, dk, -2.6, 0.2, 0, 0.4, 0.6, 0.5); a(G.torus, red, 0.8, 0.75, 0.97, 0.22, 0.22, 0.22); }));
    const deck = addObb({ cx: g.position.x, cz: g.position.z, yaw: ry, lx0: -2.5, lx1: 2.5, lz0: -1.0, lz1: 1.0, y0: g.position.y - 0.4, y1: g.position.y + 0.4 });
    const cab = addObb({ cx: g.position.x, cz: g.position.z, yaw: ry, lx0: -1.8, lx1: -0.2, lz0: -0.78, lz1: 0.78, y0: g.position.y + 0.4, y1: g.position.y + 1.55 });
    const y0 = g.position.y, ph = Math.random() * 6;
    W.animated.push((dt, t) => { const b2 = Math.sin(t * 1.3 + ph) * 0.08; g.position.y = y0 + b2; g.rotation.z = Math.sin(t * 0.9 + ph) * 0.03; deck.y1 = y0 + 0.4 + b2; deck.y0 = y0 - 0.4 + b2; cab.y0 = y0 + 0.4 + b2; cab.y1 = y0 + 1.55 + b2; });
    return g;
  },
  // лодочка на воде (качается)
  floatBoat(x, z, ry, wy) { const g = this.rowboat(x, z, ry); if (!g) return; g.position.y += wy; W.keep.push(g); const y0 = g.position.y, ph = Math.random() * 6; W.animated.push((dt, t) => { g.position.y = y0 + Math.sin(t * 1.6 + ph) * 0.06; g.rotation.z = Math.sin(t * 1.1 + ph) * 0.06; }); },
  // портальный кран-погрузчик: две опоры на рельсах, балка сверху, тележка с качающимся контейнером
  gantry(x, z, span, ry = 0) {
    const yl = col(0xe0b02a), dk = col(0x2b2533), H = 8, fx = Math.cos(ry), fz = -Math.sin(ry);
    for (const s2 of [-1, 1]) { const px = x + fx * s2 * span / 2, pz = z + fz * s2 * span / 2;
      for (const k of [-1.2, 1.2]) { const lx = px + Math.sin(ry) * k, lz = pz + Math.cos(ry) * k; this.m(G.box, yl, lx, H / 2, lz, 0.4, H, 0.4); this.solid(lx, lz, 0.45, 0.45, 0, H); }
      this.m(G.box, yl, px, H - 0.3, pz, Math.abs(fx) > 0.5 ? 0.5 : 2.8, 0.6, Math.abs(fx) > 0.5 ? 2.8 : 0.5); this.m(G.box, dk, px, 0.1, pz, Math.abs(fx) > 0.5 ? 0.6 : 3.2, 0.2, Math.abs(fx) > 0.5 ? 3.2 : 0.6); }
    const tr = T.truss(); const tt = tr.clone(); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(span + 1, 1); tt.needsUpdate = true;
    const beam = this.m(G.box, lam({ map: tt, alphaTest: 0.5, side: THREE.DoubleSide }, 'gantryBeam'), x, H + 0.4, z, Math.abs(fx) > 0.5 ? span + 1 : 1.2, 1.0, Math.abs(fx) > 0.5 ? 1.2 : span + 1);
    this.box(x, z, Math.abs(fx) > 0.5 ? span + 1 : 1.0, Math.abs(fx) > 0.5 ? 1.0 : span + 1, 0.06, tmat(T.metal()), { y: H + 0.92 });
    this.ladder(x + fx * span / 2 + Math.sin(ry) * 1.42, z + fz * span / 2 + Math.cos(ry) * 1.42, Math.abs(fx) > 0.5 ? 's' : 'e', H + 0.98);
    this.zone('roof', x - (Math.abs(fx) > 0.5 ? span / 2 : 0.3), z - (Math.abs(fx) > 0.5 ? 0.3 : span / 2), x + (Math.abs(fx) > 0.5 ? span / 2 : 0.3), z + (Math.abs(fx) > 0.5 ? 0.3 : span / 2), H + 0.98);
    // тележка и контейнер на тросах: ездит туда-сюда, контейнер раскачивается
    const trol = new THREE.Group(); trol.position.set(this.X(x), this.Y + H, this.Z(z)); W.group.add(trol); W.keep.push(trol);
    mesh(G.box, dk, 0, -0.1, 0, 1.4, 0.4, 1.4, trol);
    const pend = new THREE.Group(); pend.position.y = -0.3; trol.add(pend); pend.rotation.y = ry;
    for (const sx of [-0.6, 0.6]) mesh(G.box, dk, sx, -1.6, 0, 0.03, 3.2, 0.03, pend);
    const cn = compose('gantryBox', a => { a(G.box, tmat(T.corrugated(0x3a6a9a)), 0, 0, 0, 3.0, 1.3, 1.3); a(G.box, dk, 0, 0.67, 0, 3.04, 0.05, 1.34); }); cn.position.y = -3.9; pend.add(cn);
    W.animated.push((dt, t) => { const k = Math.sin(t * 0.25) * (span / 2 - 1.5); trol.position.x = this.X(x) + fx * k; trol.position.z = this.Z(z) + fz * k; pend.rotation.x = Math.sin(t * 0.9) * 0.08; });
    return H;
  },
  // спасательный круг на столбике, сети для просушки
  lifebuoy(x, z, ry = 0) { const g = this.prop(x, z, ry); g.add(compose('buoyPost', a => { a(G.box, tmat(T.wood()), 0, 0.8, 0, 0.12, 1.6, 0.12); a(G.torus, lam({ map: T.awning('#ff5a6e', '#f1e8ff') }, 'ringMat'), 0, 1.2, 0.12, 0.28, 0.28, 0.28); })); this.solid(x, z, 0.2, 0.2, 0, 1.6); },
  nets(x0, z0, x1, z1, h = 1.8) {
    const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, a = Math.atan2(z1 - z0, x1 - x0);
    for (const [px, pz] of [[x0, z0], [x1, z1]]) { this.m(G.cyl6, tmat(T.bark()), px, h / 2, pz, 0.06, h, 0.06); this.solid(px, pz, 0.15, 0.15, 0, h); }
    const n = this.m(G.plane, lam({ map: rep(T.chainlink(), len / 0.8, 1.6), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, color: 0x6a8a6a }, 'fishNet'), cx, h * 0.55, cz, len, h * 0.8, 1); n.rotation.y = -a;
    for (let i = 0; i < 4; i++) this.m(G.sph, col(0xf5c542), x0 + (x1 - x0) * (i + 0.5) / 4, h * 0.25, z0 + (z1 - z0) * (i + 0.5) / 4, 0.08, 0.08, 0.08);
  },
  bollardRope(x, z) { this.m(G.cyl8, col(0x2b2533), x, 0.25, z, 0.16, 0.5, 0.16); this.m(G.cyl8, col(0x2b2533), x, 0.52, z, 0.22, 0.06, 0.22); this.m(G.torus, col(0xc8a070), x, 0.3, z, 0.18, 0.18, 0.18).rotation.x = Math.PI / 2; this.solid(x, z, 0.4, 0.4, 0, 0.55); },
  /* ---------- больница ---------- */
  // мигающая лампа на потолке (больница): то гаснет, то вспыхивает
  flickerLamp(x, z, y) {
    const m = lam({ color: 0xd8f0ff, emissive: 0xd8f0ff, emissiveIntensity: 0.9 }); this.m(G.box, m, x, y - 0.06, z, 1.0, 0.05, 0.25);
    const pool = this.light(x, z, 1.8, y - (y % 3.4), true); pool.material = pool.material.clone(); W.keep.push(pool);
    W.flick.push({ mats: [m], pool, t: Math.random() * 3, on: true, hospital: true });
  },
  // рентген-кабинет: аппарат и светящийся негатив со скелетом
  xray(x, z, ry = 0) {
    const g = this.prop(x, z, ry);
    g.add(compose('xray', a => { const wt = col(0xd8d8e0), dk = col(0x2b2533); a(G.box, wt, 0, 0.6, 0, 0.8, 1.2, 0.6); a(G.box, wt, 0, 1.6, -0.2, 0.2, 2.0, 0.2); a(G.box, wt, 0, 2.3, 0.4, 0.5, 0.35, 0.9); a(G.box, dk, 0, 2.12, 0.65, 0.35, 0.05, 0.35);
      a(G.box, lam({ map: T.xray(), emissive: 0x7aa0c0, emissiveIntensity: 0.6, emissiveMap: T.xray() }, 'xrayPanel'), 1.3, 1.5, -0.25, 1.0, 1.3, 0.05); a(G.box, dk, 1.3, 1.5, -0.29, 1.1, 1.4, 0.04); }));
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? 0.6 : 0.8, q ? 0.8 : 0.6, 0, 1.2);
  },
  // лифт, который не работает: E — дзинь, двери дёргаются
  elevator(x, z, ry, y = 0) {
    const g = this.prop(x, z, ry); g.position.y += y; const dk = col(0x3a3440), st = col(0x9a9da8);
    const L = new THREE.Mesh(G.box, st), R = new THREE.Mesh(G.box, st); L.position.set(-0.36, 1.1, 0.03); R.position.set(0.36, 1.1, 0.03); L.scale.set(0.7, 2.2, 0.05); R.scale.set(0.7, 2.2, 0.05); g.add(L, R); W.keep.push(L, R);
    const fr = new THREE.Mesh(G.box, dk); fr.position.set(0, 1.15, 0); fr.scale.set(1.7, 2.4, 0.02); g.add(fr);
    const sg = this.sign(x, y + 2.55, z, ry, 'НЕ РАБОТАЕТ', '#d8243a', '#f1e8ff', 1.4, 0.25); sg.position.x += Math.sin(ry) * 0.05; sg.position.z += Math.cos(ry) * 0.05;
    let shake2 = 0; W.animated.push(dt => { if (shake2 > 0) { shake2 -= dt; const o = Math.sin(shake2 * 60) * 0.03 * shake2; L.position.x = -0.36 - Math.abs(o); R.position.x = 0.36 + Math.abs(o); } });
    const fx = Math.sin(ry), fz = Math.cos(ry);
    W.interacts.push({ x: this.X(x + fx * 0.9), z: this.Z(z + fz * 0.9), y: this.Y + y, r: 1.0, label: 'Вызвать лифт', act: () => { shake2 = 1; W.onElevator && W.onElevator({ x: this.X(x), y: this.Y + y + 1, z: this.Z(z) }); } });
  },
  // простыня-призрак: висит под потолком и колышется
  sheetGhost(x, z, y) {
    const p = new THREE.Group(); p.position.set(this.X(x), this.Y + y, this.Z(z)); this.g.add(p);
    p.add(compose('ghostSheet', q => { const wm = lam({ color: 0xeee8ff, emissive: 0x6a6080, emissiveIntensity: 0.6 }, 'ghostSheet'); q(G.sph10, wm, 0, -0.35, 0, 0.26, 0.26, 0.26); q(G.cone8, wm, 0, -0.75, 0, 0.36, 0.6, 0.36); q(G.box, col(0x17111f), -0.09, -0.33, 0.24, 0.06, 0.09, 0.02); q(G.box, col(0x17111f), 0.09, -0.33, 0.24, 0.06, 0.09, 0.02); q(G.cyl5, col(0xd8d0c0), 0, -0.05, 0, 0.01, 0.15, 0.01); }));
    addSwinger(p, { len: 0.7, damp: 1.0, max: 0.9, r: 0.5, idle: 0.18 });
  },
  fireSpot(x, z) { W.spots.fire = W.spots.fire || []; W.spots.fire.push({ x: this.X(x), z: this.Z(z), y: this.Y, f: [0, 1], district: this.d, label: 'урна' }); },
};
void THREE; void col; void lam; void glow; void addZone;
