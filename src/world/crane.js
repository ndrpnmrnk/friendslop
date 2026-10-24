import { THREE, G, V3, mesh, col, tmat, glow, lam,compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { groundAt, impulsePushables, solidsNear, addObb } from './physics.js';
import { hitBreakables } from './breakables.js';
import { clamp, damp } from '../core/rng.js';
import { addOutline } from '../game/outline.js';

/* Башенный кран с шар-бабой. Залезаешь по лестнице на мачту, садишься в кабину (E):
   W/S — тележка по стреле, A/D — поворот стрелы с инерцией. По стреле можно пройти пешком.
   Шар — маятник; стена из блоков рассыпается на обломки, верхние блоки без опоры падают. */
const TRUSS_MATERIALS=new Map();
export function buildCrane(b, mx, mz, aimAt) {
  const yellow = col(0xe0b02a), dark = col(0x2b2533), H = 10;
  // мачта-решётка: одна коробка с ажурной текстурой (сквозь видно раскосы), без пересекающихся граней
  { const tr = T.truss(); tr.wrapS = tr.wrapT = THREE.RepeatWrapping; const tt = tr.clone(); tt.needsUpdate = true; tt.repeat.set(1, H);
    b.m(G.box, lam({ map: tt, alphaTest: 0.5, side: THREE.DoubleSide }, 'craneTruss'), mx, H / 2, mz, 1, H, 1); }
  b.solid(mx, mz, 1, 1, 0, H);
  b.ladder(mx, mz + 0.5, 's', H + 0.2);
  // площадка наверху (не над лестницей, чтобы не упираться головой)
  b.box(mx, mz - 0.4, 2.8, 1.8, 0.2, tmat(T.metal()), { y: H });
  for (const [x, z, w, d] of [[mx - 1.35, mz - 0.4, 0.08, 1.8], [mx + 1.35, mz - 0.4, 0.08, 1.8], [mx, mz - 1.25, 2.8, 0.08]]) { b.m(G.box, yellow, x, H + 0.75, z, w, 0.06, d); b.solid(x, z, w + 0.1, d + 0.1, H + 0.2, 0.9); }
  // кабина
  const cab = b.m(G.box, [yellow, yellow, yellow, dark, tmat(T.carGlass(0xe0b02a)), yellow], mx - 0.75, H + 1.0, mz - 0.6, 1.2, 1.6, 1.2);
  b.solid(mx - 0.75, mz - 0.6, 1.2, 1.2, H + 0.2, 1.6);
  // стрела: решётчатая ферма, как у мачты; по верху — мостки, по стреле можно ходить (коллизия поворачивается вместе с ней)
  const top = b.Y + H + 2.2, pivot = new THREE.Group(); pivot.position.set(b.X(mx), top, b.Z(mz)); W.group.add(pivot);
  const truss = len => {if(TRUSS_MATERIALS.has(len))return TRUSS_MATERIALS.get(len);const t=T.truss().clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(len,1);t.needsUpdate=true;const material=lam({map:t,alphaTest:.5,side:THREE.DoubleSide});TRUSS_MATERIALS.set(len,material);return material;};
  mesh(G.box, yellow, 0, -0.8, 0, 0.6, 1.6, 0.6, pivot);
  mesh(G.box, truss(13), 6, -0.05, 0, 13, 0.6, 1.0, pivot);
  mesh(G.box, truss(5), -3, -0.05, 0, 5, 0.6, 1.0, pivot);
  mesh(G.box, tmat(T.metal()), 3.25, 0.255, 0, 18.5, 0.04, 0.5, pivot);
  for (const sz of [-0.48, 0.48]) mesh(G.box, yellow, 3.25, 0.62, sz, 18.5, 0.05, 0.05, pivot);
  for (let x = -5.5; x <= 12.5; x += 1.5) for (const sz of [-0.48, 0.48]) mesh(G.box, yellow, x, 0.44, sz, 0.05, 0.38, 0.05, pivot);
  // кабина оператора на поворотной части + противовес
  mesh(G.box, tmat(T.concrete()), -5, -0.75, 0, 1.4, 1.2, 1.2, pivot);
  mesh(G.box, glow(0xff3a2a), 12.4, 0.35, 0, 0.2, 0.2, 0.2, pivot);
  // неподвижная «шайба» поворота над площадкой: на неё ведёт лесенка, с неё шагаешь на стрелу
  b.m(G.cyl12, dark, mx, H + 1.25, mz, 0.5, 2.1, 0.5); b.solid(mx, mz, 0.9, 0.9, 0.2 + H, 2.05);
  b.ladder(mx + 0.45, mz, 'e', H + 2.27, H + 0.2);
  const boom = addObb({ cx: b.X(mx), cz: b.Z(mz), yaw: 0, lx0: -5.5, lx1: 12.5, lz0: -0.5, lz1: 0.5, y0: top - 0.35, y1: top + 0.27 });
  const cw = addObb({ cx: b.X(mx), cz: b.Z(mz), yaw: 0, lx0: -5.7, lx1: -4.3, lz0: -0.6, lz1: 0.6, y0: top - 1.35, y1: top - 0.15 });
  const trolley=mesh(G.box,dark,8,-.5,0,.7,.3,.7,pivot);
  // Решётка поворачивается целиком: объединяем её рейки, оставляя тележку самостоятельной.
  const fixed=pivot.children.filter(m=>m.isMesh&&m!==trolley),boomModel=compose('crane45-boom',a=>{for(const m of fixed)a(m.geometry,m.material,m.position.x,m.position.y,m.position.z,m.scale.x,m.scale.y,m.scale.z,m.rotation.x,m.rotation.y,m.rotation.z);});fixed.forEach(m=>m.removeFromParent());pivot.add(boomModel);
  // шар и трос
  const ballR = 0.6, rope = 9.4;
  const ball = mesh(G.sph10, tmat(T.metal()), 0, 0, 0, ballR, ballR, ballR, W.group);
  const ropeM = mesh(G.box, dark, 0, 0, 0, 0.05, 1, 0.05, W.group);
  W.keep.push(pivot, ball, ropeM);
  const cr = {
    pivot, trolley, ball, ropeM, boom, cw,
    yaw: Math.atan2(-(b.Z(aimAt[1]) - b.Z(mz)), b.X(aimAt[0]) - b.X(mx)) + 0.5, yawV: 0, tr: 8, ballR, rope,
    seat: new V3(b.X(mx + 0.2), b.Y + H + 0.2, b.Z(mz - 0.3)), cab: new V3(b.X(mx - 0.75), b.Y + H + 0.2, b.Z(mz - 0.6)),
    outline: addOutline(cab, 0.06),
    look: new V3(b.X(aimAt[0]), b.Y + 2, b.Z(aimAt[1])), active: false,
    p: new V3(), prev: new V3(),quiet:0,sleeping:false,
  };
  pivot.rotation.y = cr.yaw; boom.yaw = cw.yaw = cr.yaw;
  const a = anchor(cr); cr.p.set(a.x, a.y - rope, a.z); cr.prev.copy(cr.p);
  W.crane = cr;
  W.spots.crane.push({ x: b.X(mx + 1.6), z: b.Z(mz + 2.8), y: b.Y, f: [0, 1], district: b.d, label: 'кран' });
  return cr;
}
const _a = new V3();
function anchor(cr) { return cr.trolley.getWorldPosition(_a); }

export function updateCrane(dt, input, pl) {
  const cr=W.crane;if(!cr)return;const near=pl&&pl.pos.distanceToSquared(cr.p)<16;if(cr.sleeping&&!cr.active&&!near)return;if(cr.active||near){cr.sleeping=false;cr.quiet=0;}
  /* Управление напрямую: W/S — тележка по стреле вперёд-назад, A/D — поворот стрелы (с инерцией). */
  if (cr.active && input) {
    cr.yawV += (-input.ix * 0.85 - cr.yawV) * damp(2.5, dt);
    cr.tr = clamp(cr.tr - input.iz * 4.5 * dt, 2.5, 12.2);
  } else cr.yawV *= Math.exp(-dt * 2);
  const dyaw = cr.yawV * dt;
  cr.pivot.rotation.y += dyaw;
  cr.boom.yaw = cr.cw.yaw = cr.pivot.rotation.y;
  // кто стоит на стреле — поворачивается вместе с ней
  if (dyaw) for (const a of [pl, ...(W.bots || [])]) { if (!a || !a.onGround || (a.groundObb !== cr.boom && a.groundObb !== cr.cw)) continue;
    const dx = a.pos.x - cr.boom.cx, dz = a.pos.z - cr.boom.cz, c = Math.cos(dyaw), s2 = Math.sin(dyaw); a.pos.x = cr.boom.cx + dx * c + dz * s2; a.pos.z = cr.boom.cz - dx * s2 + dz * c; if (a.root) a.root.rotation.y += dyaw; if (a.facing !== undefined) a.facing += dyaw; }
  cr.trolley.position.x = cr.tr;
  cr.pivot.updateMatrixWorld();
  // маятник (Верле)
  const a = anchor(cr), p = cr.p, vx = (p.x - cr.prev.x) * 0.997, vy = (p.y - cr.prev.y) * 0.997, vz = (p.z - cr.prev.z) * 0.997;
  cr.prev.copy(p); p.x += vx; p.y += vy - 22 * dt * dt; p.z += vz;
  const dx = p.x - a.x, dy = p.y - a.y, dz = p.z - a.z, d = Math.hypot(dx, dy, dz) || 1;
  p.x = a.x + dx / d * cr.rope; p.y = a.y + dy / d * cr.rope; p.z = a.z + dz / d * cr.rope;
  const gy = groundAt(p.x, p.z, 0.3, p.y) + cr.ballR; if (p.y < gy) { p.y = gy; cr.prev.y = p.y; }
  const vel = new V3(p.x - cr.prev.x, p.y - cr.prev.y, p.z - cr.prev.z).divideScalar(Math.max(dt, 1e-3)), speed = vel.length();
  // удары: разрушаемое ломается, остальное отталкивает шар
  if (speed > 2.2 && hitBreakables(p, cr.ballR, [vel.x, vel.y, vel.z], 25)) cr.prev.lerp(p, 0.18);
  for (const s of solidsNear(p.x - 1, p.z - 1, p.x + 1, p.z + 1)) {
    if (!s.on) continue;
    const cx = clamp(p.x, s.x0, s.x1), cy = clamp(p.y, s.y0, s.y1), cz = clamp(p.z, s.z0, s.z1);
    const ex = p.x - cx, ey = p.y - cy, ez = p.z - cz, dd = Math.hypot(ex, ey, ez);
    if (dd >= cr.ballR || dd < 1e-4) continue;
    const k = (cr.ballR - dd) / dd; p.x += ex * k; p.y += ey * k; p.z += ez * k;
    cr.prev.x = p.x - (p.x - cr.prev.x) * -0.3; cr.prev.z = p.z - (p.z - cr.prev.z) * -0.3;
  }
  if (speed > 3) {
    impulsePushables(p.x, p.z, cr.ballR + 0.3, 6);
    for (const c of W.cats) { const q = c.root.position; if (Math.hypot(q.x - p.x, q.z - p.z) < 1 && Math.abs(q.y - p.y) < 1.2) c.hit(true, vel.x, vel.z); }
  }
  // шар твёрдый для игрока: выталкивает, на скорости сбивает с ног
  if (pl && !pl.ride) { const q = pl.pos, cy = clamp(p.y, q.y, q.y + pl.h), ex = q.x - p.x, ez = q.z - p.z, ey = cy - p.y, dd = Math.hypot(ex, ey, ez), m = cr.ballR + pl.r;
    if (dd < m && Math.hypot(ex, ez) > 1e-3) { const hl = Math.hypot(ex, ez); q.x += ex / hl * (m - dd); q.z += ez / hl * (m - dd);
      if (speed > 3.5 && pl.stun <= 0) { pl.vel.set(ex / hl * speed * 0.8, 5, ez / hl * speed * 0.8); pl.stun = 1.2; } } }
  if(!cr.active&&!near&&speed<.045&&Math.abs(cr.yawV)<.0001){cr.quiet+=dt;if(cr.quiet>.7){cr.sleeping=true;cr.prev.copy(p);cr.yawV=0;}}else cr.quiet=0;
  cr.ball.position.copy(p);
  const mid = new V3().addVectors(a, p).multiplyScalar(0.5); cr.ropeM.position.copy(mid);
  cr.ropeM.scale.y = cr.rope; cr.ropeM.lookAt(a); cr.ropeM.rotateX(Math.PI / 2);
}
