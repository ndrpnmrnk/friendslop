import { THREE, G, V3, mesh, col, tmat, glow } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { groundAt, impulsePushables } from './physics.js';
import { chunk, burst } from './particles.js';
import { clamp, damp } from '../core/rng.js';
import { addOutline } from '../game/outline.js';

/* Башенный кран с шар-бабой. Залезаешь по лестнице на мачту, садишься в кабину (E),
   мышь влево-вправо крутит стрелу с инерцией, вверх-вниз двигает тележку.
   Шар — маятник; стена из блоков рассыпается на обломки, верхние блоки без опоры падают. */
export function buildCrane(b, mx, mz, wall) {
  const yellow = col(0xe0b02a), dark = col(0x2b2533), H = 10;
  // мачта-решётка
  b.m(G.box, yellow, mx, H / 2, mz, 1, H, 1);
  for (let y = 0.5; y < H; y += 1) for (const [sx, sz] of [[1, 0], [0, 1]]) {
    const brace = b.m(G.box, dark, mx, y, mz, sx ? 1.04 : 0.04, 0.06, sz ? 1.04 : 0.04); brace.rotation[sx ? 'z' : 'x'] = 0.6;
  }
  b.solid(mx, mz, 1, 1, 0, H);
  b.ladder(mx, mz + 0.5, 's', H + 0.2);
  // площадка наверху (не над лестницей, чтобы не упираться головой)
  b.box(mx, mz - 0.4, 2.8, 1.8, 0.2, tmat(T.metal()), { y: H });
  for (const [x, z, w, d] of [[mx - 1.35, mz - 0.4, 0.08, 1.8], [mx + 1.35, mz - 0.4, 0.08, 1.8], [mx, mz - 1.25, 2.8, 0.08]]) { b.m(G.box, yellow, x, H + 0.75, z, w, 0.06, d); b.solid(x, z, w + 0.1, d + 0.1, H + 0.2, 0.9); }
  // кабина
  const cab = b.m(G.box, [yellow, yellow, yellow, dark, tmat(T.carGlass(0xe0b02a)), yellow], mx - 0.75, H + 1.0, mz - 0.6, 1.2, 1.6, 1.2);
  b.solid(mx - 0.75, mz - 0.6, 1.2, 1.2, H + 0.2, 1.6);
  // стрела
  const top = b.Y + H + 2.2, pivot = new THREE.Group(); pivot.position.set(b.X(mx), top, b.Z(mz)); W.group.add(pivot);
  mesh(G.box, yellow, 0, -0.8, 0, 0.8, 1.6, 0.8, pivot);
  mesh(G.box, yellow, 6, 0, 0, 13, 0.5, 0.6, pivot);
  mesh(G.box, yellow, -3, 0, 0, 5, 0.5, 0.6, pivot);
  mesh(G.box, tmat(T.concrete()), -5, -0.6, 0, 1.4, 1.2, 1.2, pivot);
  mesh(G.box, glow(0xff3a2a), 12.4, 0.35, 0, 0.2, 0.2, 0.2, pivot);
  const trolley = mesh(G.box, dark, 8, -0.35, 0, 0.7, 0.3, 0.7, pivot);
  // шар и трос
  const ballR = 0.6, rope = 9.4;
  const ball = mesh(G.sph10, tmat(T.metal()), 0, 0, 0, ballR, ballR, ballR, W.group);
  const ropeM = mesh(G.box, dark, 0, 0, 0, 0.05, 1, 0.05, W.group);
  // стена из блоков
  const bm = tmat(T.brickWall()), bricks = [];
  for (let r = 0; r < wall.rows; r++) for (let c = 0; c < wall.cols; c++) {
    const x = wall.x0 + (c + 0.5) * wall.bw, y = (r + 0.5) * wall.bh;
    const m = b.m(G.box, bm, x, y, wall.z, wall.bw - 0.02, wall.bh - 0.02, wall.bd);
    const s = b.solid(x, wall.z, wall.bw, wall.bd, r * wall.bh, wall.bh);
    bricks.push({ m, s, r, c, alive: true, fall: -1 });
  }
  const cr = {
    pivot, trolley, ball, ropeM, bricks, wall, cols: wall.cols,
    yaw: Math.atan2(-(b.Z(wall.z) - b.Z(mz)), b.X(wall.x0 + wall.cols * wall.bw / 2) - b.X(mx)) + 0.5, yawV: 0, tr: 8, ballR, rope,
    seat: new V3(b.X(mx + 0.2), b.Y + H + 0.2, b.Z(mz - 0.3)), cab: new V3(b.X(mx - 0.75), b.Y + H + 0.2, b.Z(mz - 0.6)),
    outline: addOutline(cab, 0.06),
    look: new V3(b.X(wall.x0 + wall.cols * wall.bw / 2), b.Y + 2, b.Z(wall.z)), active: false,
    p: new V3(), prev: new V3(),
  };
  pivot.rotation.y = cr.yaw;
  const a = anchor(cr); cr.p.set(a.x, a.y - rope, a.z); cr.prev.copy(cr.p);
  W.crane = cr;
  return cr;
}
const _a = new V3();
function anchor(cr) { return cr.trolley.getWorldPosition(_a); }

export function updateCrane(dt, input) {
  const cr = W.crane; if (!cr) return;
  if (cr.active && input) {
    cr.yawV += (input.nx * 1.3 - cr.yawV) * damp(2.2, dt);
    cr.tr += clamp((5 + (input.ny + 1) * 3.6) - cr.tr, -3 * dt, 3 * dt);
  } else cr.yawV *= Math.exp(-dt * 2);
  cr.pivot.rotation.y -= cr.yawV * dt;
  cr.trolley.position.x = cr.tr;
  cr.pivot.updateMatrixWorld();
  // маятник (Верле)
  const a = anchor(cr), p = cr.p, vx = (p.x - cr.prev.x) * 0.997, vy = (p.y - cr.prev.y) * 0.997, vz = (p.z - cr.prev.z) * 0.997;
  cr.prev.copy(p); p.x += vx; p.y += vy - 22 * dt * dt; p.z += vz;
  const dx = p.x - a.x, dy = p.y - a.y, dz = p.z - a.z, d = Math.hypot(dx, dy, dz) || 1;
  p.x = a.x + dx / d * cr.rope; p.y = a.y + dy / d * cr.rope; p.z = a.z + dz / d * cr.rope;
  const gy = groundAt(p.x, p.z, 0.3, p.y) + cr.ballR; if (p.y < gy) { p.y = gy; cr.prev.y = p.y; }
  const vel = new V3(p.x - cr.prev.x, p.y - cr.prev.y, p.z - cr.prev.z).divideScalar(Math.max(dt, 1e-3)), speed = vel.length();
  // удары по стене
  for (const bk of cr.bricks) {
    if (!bk.alive) continue;
    const s = bk.s, cx = clamp(p.x, s.x0, s.x1), cy = clamp(p.y, s.y0, s.y1), cz = clamp(p.z, s.z0, s.z1);
    const ex = p.x - cx, ey = p.y - cy, ez = p.z - cz, dd = Math.hypot(ex, ey, ez);
    if (dd >= cr.ballR) continue;
    if (speed > 2.2) { breakBrick(cr, bk, vel); cr.prev.lerp(p, 0.18); }
    else if (dd > 1e-4) { const k = (cr.ballR - dd) / dd; p.x += ex * k; p.y += ey * k; p.z += ez * k; }
  }
  if (speed > 3) {
    impulsePushables(p.x, p.z, cr.ballR + 0.3, 6);
    for (const c of W.cats) { const q = c.root.position; if (Math.hypot(q.x - p.x, q.z - p.z) < 1 && Math.abs(q.y - p.y) < 1.2) c.hit(true, vel.x, vel.z); }
  }
  // падение блоков без опоры
  for (const bk of cr.bricks) if (bk.alive && bk.fall > 0) { bk.fall -= dt; if (bk.fall <= 0) breakBrick(cr, bk, new V3((Math.random() - 0.5), 0, (Math.random() - 0.5))); }
  cr.ball.position.copy(p);
  const mid = new V3().addVectors(a, p).multiplyScalar(0.5); cr.ropeM.position.copy(mid);
  cr.ropeM.scale.y = cr.rope; cr.ropeM.lookAt(a); cr.ropeM.rotateX(Math.PI / 2);
}
function breakBrick(cr, bk, vel) {
  bk.alive = false; bk.s.on = false; W.group.remove(bk.m); bk.m.parent?.remove(bk.m);
  const p = bk.m.position, mat = bk.m.material;
  for (let i = 0; i < 3; i++) chunk(p.x + (Math.random() - 0.5) * 0.4, p.y + (Math.random() - 0.5) * 0.3, p.z, [vel.x * 0.5 + (Math.random() - 0.5) * 3, Math.abs(vel.y) * 0.3 + Math.random() * 3, vel.z * 0.5 + (Math.random() - 0.5) * 3], { mat, size: 0.32, sx: 1.2, sy: 0.8, sz: 1, life: 4 });
  burst(p.x, p.y, p.z, 4, { color: 0xa08a7a, size: 0.5, speed: 1.5, up: 1, g: 2, grow: 1.2, life: 0.9 });
  for (const o of cr.bricks) if (o.alive && o.c === bk.c && o.r === bk.r + 1 && o.fall < 0) o.fall = 0.12;
}
