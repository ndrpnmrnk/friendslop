import { THREE, G, lam, col, glow, compose } from '../core/gfx.js';
import { T, rep, pix } from '../core/textures.js';
import { burst } from '../world/particles.js';

/* v0.58 — хаб на летающем острове. Двор с домами — кусок города, вырванный и поднятый в небо:
   - сверху тот же двор, по краю — травяная кромка и обрыв (с севера край ближе: оттуда стреляет рогатка);
   - снизу каменная «морковка» из слоёв земли и камня, свисают корни, из сломанной трубы льётся вода;
   - вокруг и ниже — пухлые облака (медленно плывут) и пара летающих камешков;
   - далеко внизу ночной город: улицы с фонарями, окна, неон. Без тумана, края растворяются в небе.
   Всё дёшево: ~12 вызовов отрисовки, ничего не считается на процессоре, кроме сдвига облаков. */

// контур острова: радиус по углу, с севера (−z) срезан — край в паре шагов за ограждением у рогатки
export const islandR = th => 47 - 18 * Math.pow(Math.max(0, Math.cos(th - Math.PI * 1.5)), 3) + Math.sin(th * 5) * 1.1 + Math.sin(th * 11 + 1) * .6;
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function rockCone(rf = islandR, DEPTH = 46, key = 'island-rock') {
  const SEG = 28, RINGS = 7, pos = [], colr = [], uv = [], idx = [], jit = Array.from({ length: (RINGS + 1) * SEG }, () => [rnd(), rnd(), rnd()]);
  const top = new THREE.Color(0x9a6238), mid = new THREE.Color(0x7a6488), low = new THREE.Color(0x4a3450), c = new THREE.Color();
  for (let r = 0; r <= RINGS; r++) {
    const v = r / RINGS, y = -v * v * DEPTH * .92 - v * DEPTH * .08 - .3;
    for (let s = 0; s <= SEG; s++) {
      const th = s / SEG * Math.PI * 2, J = jit[r * SEG + s % SEG], R = rf(th) * Math.pow(1 - v, 1.35) * (r ? .93 + J[0] * .12 : 1);
      pos.push(Math.cos(th) * R, y + (r && r < RINGS ? (J[1] - .5) * 2.4 : 0), Math.sin(th) * R);
      c.copy(v < .18 ? top : mid).lerp(v < .18 ? mid : low, v < .18 ? v / .18 : (v - .18) / .82); c.multiplyScalar((r % 2 ? .62 : 1.12) * (.85 + J[2] * .3)); /* полосы-слои породы */ colr.push(c.r, c.g, c.b);
      uv.push(s / SEG * 10, v * 4);
    }
  }
  for (let r = 0; r < RINGS; r++) for (let s = 0; s < SEG; s++) { const a = r * (SEG + 1) + s, b = a + SEG + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return new THREE.Mesh(g.toNonIndexed(), lam({ vertexColors: true, flatShading: true, map: rep(T.stone(), 1, 1), emissive: 0x150f20 }, key));
}
// верх острова: асфальт двора + травяная кромка по контуру
export function cap(rf = islandR) {
  const SEG = 56, shape = new THREE.Shape(), inner = new THREE.Shape();
  for (let s = 0; s <= SEG; s++) { const th = s / SEG * Math.PI * 2, R = rf(th); (s ? shape.lineTo : shape.moveTo).call(shape, Math.cos(th) * R, -Math.sin(th) * R); }
  const geo = new THREE.ShapeGeometry(shape, 2); geo.rotateX(-Math.PI / 2); // форма в XY (y = −z мира) → на землю лицом вверх
  const uvs = geo.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) / 4, uvs.getY(i) / 4);
  const asphalt = new THREE.Mesh(geo, lam({ map: rep(T.asphalt(), 1, 1) }, 'island-asphalt')); asphalt.position.y = -.04;
  // кромка: кольцо травы и земляной бортик (толщина 0.6 м) по краю
  const pos = [], idx = [], uv = [];
  for (let s = 0; s <= SEG; s++) { const th = s / SEG * Math.PI * 2, R = rf(th), x = Math.cos(th), z = Math.sin(th);
    pos.push(x * (R - 3.2), -.02, z * (R - 3.2), x * (R + .4), .02, z * (R + .4), x * (R + .2), -.7, z * (R + .2)); uv.push(0, s, 1.2, s, 1.6, s); }
  for (let s = 0; s < SEG; s++) { const a = s * 3, b = a + 3; idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2); }
  const rg = new THREE.BufferGeometry(); rg.setIndex(idx); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); rg.computeVertexNormals();
  const rim = new THREE.Mesh(rg, lam({ map: rep(T.grass(), 1, 1), side: THREE.DoubleSide }, 'island-rim'));
  return [asphalt, rim];
}
// пухлое облако из нескольких низкополигональных шаров
const CLOUD = new THREE.IcosahedronGeometry(1, 1);
function cloud(key, n, w) {
  return compose('cloud58-' + key, a => { for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1) - .5, r = (1 - Math.abs(t) * 1.1) * (.8 + rnd() * .5);
    a(CLOUD, lam({ color: 0x8b84b8, emissive: 0x1c1830 }, 'cloud58'), t * w, r * .35, (rnd() - .5) * w * .25, r * w * .32, r * w * .24, r * w * .3); } });
}
// ночной город внизу: текстура улиц с фонарями и окнами, края уходят в прозрачность
function cityTex() {
  return pix('city58', 512, 512, (g, W, H) => {
    g.fillStyle = '#120e1c'; g.fillRect(0, 0, W, H);
    const xs = [], zs = []; for (let p = 0; p < W;) { xs.push(p); p += 18 + (rnd() * 26 | 0); } for (let p = 0; p < H;) { zs.push(p); p += 18 + (rnd() * 26 | 0); }
    // кварталы: крыши разного тона, окна
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const x0 = xs[i] + 3, z0 = zs[j] + 3, w = xs[i + 1] - xs[i] - 6, d = zs[j + 1] - zs[j] - 6; if (w < 4 || d < 4) continue;
      const park = rnd() < .08; g.fillStyle = park ? '#14281c' : ['#1d1830', '#241d36', '#1a1628', '#2a2034'][rnd() * 4 | 0]; g.fillRect(x0, z0, w, d);
      if (!park) for (let k = 0; k < w * d / 8; k++) { g.fillStyle = rnd() < .85 ? (rnd() < .6 ? '#ffcf7a' : '#ff9a5a') : ['#7ae8ff', '#ff6ab0', '#b18cff'][rnd() * 3 | 0]; g.globalAlpha = .7 + rnd() * .3; g.fillRect(x0 + (rnd() * w | 0), z0 + (rnd() * d | 0), rnd() < .3 ? 2 : 1, 1); }
      g.globalAlpha = 1;
    }
    // улицы и фонари
    g.fillStyle = '#4a3550'; for (const x of xs) g.fillRect(x - 1, 0, 3, H); for (const z of zs) g.fillRect(0, z - 1, W, 3);
    // тёплое свечение вдоль улиц (фонари сливаются в линии, как на ночном снимке с высоты)
    g.globalAlpha = .35; g.fillStyle = '#ff9a4a'; for (const x of xs) g.fillRect(x - 2, 0, 5, H); for (const z of zs) g.fillRect(0, z - 2, W, 5); g.globalAlpha = 1;
    for (const x of xs) for (let z = 0; z < H; z += 5) { g.fillStyle = rnd() < .5 ? '#ffb45a' : '#ffe2a0'; g.fillRect(x - 1, z, 2, 2); }
    for (const z of zs) for (let x = 0; x < W; x += 5) { g.fillStyle = rnd() < .5 ? '#ffb45a' : '#ffe2a0'; g.fillRect(x, z - 1, 2, 2); }
    // фары на главных улицах
    for (let k = 0; k < 120; k++) { const vert = rnd() < .5, a = vert ? xs[rnd() * xs.length | 0] : zs[rnd() * zs.length | 0], b = rnd() * W | 0; g.fillStyle = rnd() < .5 ? '#fff0d0' : '#ff4a4a'; g.fillRect(vert ? a + 1 : b, vert ? b : a + 1, 1, 1); }
    // края — в прозрачность
    const gr = g.createRadialGradient(W / 2, H / 2, W * .26, W / 2, H / 2, W * .5); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  });
}
export function buildIsland(group) {
  seed = 7; const g = new THREE.Group(); g.name = 'island'; group.add(g);
  const [asphalt, rim] = cap(); g.add(asphalt, rim);
  const rock = rockCone(); g.add(rock);
  // корни и обрывки кабелей по краю снизу
  g.add(compose('island-roots', a => { for (let i = 0; i < 26; i++) { const th = rnd() * Math.PI * 2, R = islandR(th) * (.78 + rnd() * .2), L = 1.5 + rnd() * 4;
    a(G.cyl6, i % 4 ? col(0x3a2a20) : col(0x1c1a22), Math.cos(th) * R, -2.5 - L / 2 - rnd() * 3, Math.sin(th) * R, .05 + rnd() * .06, L, .05 + rnd() * .06, (rnd() - .5) * .3, 0, (rnd() - .5) * .3); } }));
  // фонарики на цепочках под кромкой: тёплые точки на тёмном камне, видно издалека
  g.add(compose('island-lanterns', a => { for (let i = 0; i < 9; i++) { const th = i / 9 * Math.PI * 2 + .3, R = islandR(th) - 1.6, x = Math.cos(th) * R, z = Math.sin(th) * R, L = 1.2 + (i % 3) * .7;
    a(G.cyl6, col(0x2a2430), x, -.8 - L / 2, z, .02, L, .02); a(G.box, col(0x2a2430), x, -.85 - L - .2, z, .22, .06, .22); a(G.box, glow(0xffc070), x, -.85 - L - .38, z, .16, .26, .16); } }));
  // сломанная труба с водопадом (с запада) и вторая сухая
  const pipes = [];
  for (const [th, wet] of [[Math.PI * .92, true], [Math.PI * .28, false]]) { const R = islandR(th) - .6, x = Math.cos(th) * R, z = Math.sin(th) * R;
    const p = new THREE.Mesh(G.cyl8, lam({ map: T.rust() }, 'island-pipe')); p.position.set(x, -2.2, z); p.scale.set(.45, 2.6, .45); p.rotation.set(0, -th, Math.PI / 2 - .25); g.add(p);
    if (wet) pipes.push({ x: Math.cos(th) * (R + 1.3), y: -2.0, z: Math.sin(th) * (R + 1.3), t: 0 }); }
  // облака: кольцо вокруг и ниже острова + несколько выше
  const clouds = [];
  for (let i = 0; i < 16; i++) { const th = i / 16 * Math.PI * 2 + rnd() * .3, far = 58 + rnd() * 50, below = i % 3 !== 0;
    const c = cloud(i % 5, 4 + (rnd() * 3 | 0), 9 + rnd() * 10); c.position.set(Math.cos(th) * far, below ? -10 - rnd() * 30 : 14 + rnd() * 18, Math.sin(th) * far); c.rotation.y = rnd() * 6;
    g.add(c); clouds.push({ m: c, th, far, sp: .006 + rnd() * .01 }); }
  // летающие камешки рядом с островом
  const rocks = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), lam({ color: 0x5a4a5e, flatShading: true }, 'island-pebble'));
    const th = rnd() * Math.PI * 2, R = islandR(th) + 6 + rnd() * 10; m.position.set(Math.cos(th) * R, -4 - rnd() * 12, Math.sin(th) * R); m.scale.setScalar(.8 + rnd() * 1.8); g.add(m); rocks.push({ m, y: m.position.y, ph: rnd() * 6 }); }
  // город внизу
  const city = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: cityTex(), transparent: true, depthWrite: false, fog: false }));
  city.rotation.x = -Math.PI / 2; city.position.y = -78; city.scale.set(330, 330, 1); city.renderOrder = -5; g.add(city);
  // несколько высоких домов-силуэтов под островом: дают глубину, когда смотришь вниз
  { const bm = new THREE.MeshBasicMaterial({ color: 0x17121f, fog: false }), win = new THREE.MeshBasicMaterial({ color: 0xff4a4a, fog: false });
    const tall = new THREE.InstancedMesh(G.box, bm, 40), lit = new THREE.InstancedMesh(G.box, win, 40), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < 40; i++) { const th = rnd() * Math.PI * 2, R = 30 + rnd() * 120, h = 8 + rnd() * 26, w = 6 + rnd() * 8;
      p.set(Math.cos(th) * R, -78 + h / 2, Math.sin(th) * R); s.set(w, h, w); M4.compose(p, q, s); tall.setMatrixAt(i, M4);
      p.y = -78 + h + .3; s.set(.5, .5, .5); M4.compose(p, q, s); lit.setMatrixAt(i, M4); }
    tall.frustumCulled = lit.frustumCulled = false; g.add(tall, lit); }
  let wt = 0;
  return {
    group: g,
    update(dt, t) {
      for (const c of clouds) { c.th += c.sp * dt; c.m.position.x = Math.cos(c.th) * c.far; c.m.position.z = Math.sin(c.th) * c.far; }
      for (const r of rocks) { r.m.position.y = r.y + Math.sin(t * .5 + r.ph) * .6; r.m.rotation.y += dt * .1; }
      wt -= dt; if (wt <= 0) { wt = .07; for (const p of pipes) burst(p.x, p.y, p.z, 2, { color: 0x6a90c8, size: .3, speed: .8, up: -.5, g: 9, life: 1.6 }); }
    },
  };
}
