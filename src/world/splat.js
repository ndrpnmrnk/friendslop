import { THREE, V3 } from '../core/gfx.js';
import { W } from './state.js';
import { groundAt, solidHit } from './physics.js';

/* Пиксельные брызги вместо цельных пятен.
   Шарик, помидор, тыква, грязь, краска при ударе разлетаются на капли с физикой. Каждая капля, коснувшись
   поверхности, оставляет маленький квадратный след ровно на ней (пол, стена, крыша, ящик) — повёрнутый по
   нормали и не вылезающий за край. Попала в персонажа — пятнышко на нём. Следы держатся ~25 с и тают.
   Всё рисуется двумя InstancedMesh — сотни капель и следов за один вызов отрисовки. */
const MAXD = 260, MAXS = 900, LIFE = 25, ACTOR_LIFE = 8;
const worlds = new WeakMap();
function splatState(){let state=worlds.get(W.group||W);if(!state){state={drops:[],dMesh:null,sMesh:null,stains:[],head:0,actorDots:[]};worlds.set(W.group||W,state);}return state;}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new V3(), _p = new V3(), _c = new THREE.Color(), _n = new V3(), _up = new V3(0, 0, 1);

export function resetSplat() {
  for (const d of splatState().actorDots) d.m.parent && d.m.parent.remove(d.m);
  splatState().drops = []; splatState().stains = []; splatState().head = 0; splatState().actorDots = [];
  const dg = new THREE.BoxGeometry(1, 1, 1), sg = new THREE.PlaneGeometry(1, 1);
  splatState().dMesh = new THREE.InstancedMesh(dg, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAXD); splatState().dMesh.count = 0; splatState().dMesh.frustumCulled = false;
  splatState().sMesh = new THREE.InstancedMesh(sg, new THREE.MeshLambertMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide }), MAXS);
  splatState().sMesh.count = 0; splatState().sMesh.frustumCulled = false; splatState().sMesh.receiveShadow = true;
  // цвет каждого экземпляра задаётся отдельно
  splatState().dMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXD * 3), 3);
  splatState().sMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXS * 3), 3);
  for (let i = 0; i < MAXS; i++) splatState().stains.push(null);
  W.group.add(splatState().dMesh, splatState().sMesh); W.keep.push(splatState().dMesh, splatState().sMesh);
}

/* p — точка удара, v — скорость предмета, color — цвет, n — сколько капель, power — разлёт */
export function splatter(p, v, color, n = 20, power = 1, opts = {}) {
  if (!splatState().dMesh) return;
  const vx = v ? v.x * 0.25 : 0, vz = v ? v.z * 0.25 : 0;
  for (let i = 0; i < n; i++) {
    if (splatState().drops.length >= MAXD) splatState().drops.shift();
    const a = Math.random() * 6.28, sp = (1.5 + Math.random() * 4.5) * power, up = (1 + Math.random() * 4) * power * (opts.flat ? 0.3 : 1);
    splatState().drops.push({ p: new V3(p.x, p.y + 0.05, p.z), v: new V3(Math.cos(a) * sp + vx, up, Math.sin(a) * sp + vz), c: jitter(color), s: 0.05 + Math.random() * 0.07, t: 0, owner: opts.owner || null, big: 0.12 + Math.random() * 0.14 });
  }
}
const jitter = c => { _c.set(c); const k = 0.85 + Math.random() * 0.3; return [Math.min(1, _c.r * k), Math.min(1, _c.g * k), Math.min(1, _c.b * k)]; };

// след на поверхности: точка, нормаль, размер, цвет
function stain(x, y, z, n, size, rgb, solid) {
  // не вылезать за край ящика/стены: центр следа держим внутри грани
  if (solid && solid.x0 !== undefined) { const h = size / 2;
    if (Math.abs(n[1]) > 0.5) { x = clampIn(x, solid.x0 + h, solid.x1 - h); z = clampIn(z, solid.z0 + h, solid.z1 - h); }
    else { y = clampIn(y, solid.y0 + h, solid.y1 - h); if (Math.abs(n[0]) > 0.5) z = clampIn(z, solid.z0 + h, solid.z1 - h); else x = clampIn(x, solid.x0 + h, solid.x1 - h); } }
  const i = splatState().head; splatState().head = (splatState().head + 1) % MAXS;
  splatState().stains[i] = { x: x + n[0] * 0.012, y: y + n[1] * 0.012, z: z + n[2] * 0.012, n: n.slice(), size, rot: Math.floor(Math.random() * 4) * Math.PI / 2, t: 0 };
  splatState().sMesh.instanceColor.setXYZ(i, rgb[0], rgb[1], rgb[2]); splatState().sMesh.instanceColor.needsUpdate = true;
  splatState().sMesh.count = Math.max(splatState().sMesh.count, i + 1);
}
const clampIn = (v, a, b) => a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v));

function actors() { return [W.player, ...(W.bots || [])].filter(Boolean); }
function hitActor(d) {
  for (const a of actors()) { if (a === d.owner || a.hidden) continue; const dx = d.p.x - a.pos.x, dz = d.p.z - a.pos.z;
    if (dx * dx + dz * dz < 0.2 && d.p.y > a.pos.y && d.p.y < a.pos.y + (a.h || 1.6)) return a; }
  return null;
}
// пятнышко на персонаже: маленький квадрат на поверхности тела, тает через несколько секунд
function actorDot(a, d) {
  if (splatState().actorDots.length > 60) { const o = splatState().actorDots.shift(); o.m.parent && o.m.parent.remove(o.m); }
  const m = new THREE.Mesh(splatState().dMesh.geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(d.c[0], d.c[1], d.c[2]) }));
  const dx = d.p.x - a.pos.x, dz = d.p.z - a.pos.z, L = Math.hypot(dx, dz) || 1, r = 0.36;
  const ry = a.root.rotation.y, lx = (dx / L) * r, lz = (dz / L) * r, c = Math.cos(-ry), s = Math.sin(-ry);
  m.position.set(lx * c + lz * s, Math.min(1.5, d.p.y - a.pos.y), -lx * s + lz * c); m.scale.setScalar(0.08 + Math.random() * 0.05);
  a.root.add(m); splatState().actorDots.push({ m, t: 0 });
}

export function updateSplat(dt) {
  if (!splatState().dMesh) return;
  // капли
  let k = 0;
  for (let i = splatState().drops.length - 1; i >= 0; i--) {
    const d = splatState().drops[i]; d.t += dt; d.v.y -= 22 * dt; d.p.addScaledVector(d.v, dt);
    let gone = d.t > 2.5;
    const gy = groundAt(d.p.x, d.p.z, 0.02, d.p.y + 0.1);
    if (!gone && d.p.y <= gy) { stain(d.p.x, gy, d.p.z, [0, 1, 0], d.big, d.c, null); gone = true; }
    if (!gone) { const h = solidHit(d.p, 0.03); if (h) { stain(d.p.x, d.p.y, d.p.z, h.n, d.big * 0.85, d.c, h.s); gone = true; } }
    if (!gone && d.t > 0.04) { const a = hitActor(d); if (a) { actorDot(a, d); gone = true; } }
    if (gone) { splatState().drops.splice(i, 1); continue; }
  }
  for (const d of splatState().drops) {
    _m.compose(d.p, _q.identity(), _s.setScalar(d.s)); splatState().dMesh.setMatrixAt(k, _m); splatState().dMesh.instanceColor.setXYZ(k, d.c[0], d.c[1], d.c[2]); k++;
  }
  splatState().dMesh.count = k; splatState().dMesh.instanceMatrix.needsUpdate = true; if (k) splatState().dMesh.instanceColor.needsUpdate = true;
  // следы: живут LIFE секунд, последние 5 — сжимаются
  for (let i = 0; i < splatState().sMesh.count; i++) {
    const st = splatState().stains[i]; if (!st) { _m.makeScale(0, 0, 0); splatState().sMesh.setMatrixAt(i, _m); continue; }
    st.t += dt; const fade = Math.max(0, Math.min(1, (LIFE - st.t) / 5));
    if (fade <= 0) { splatState().stains[i] = null; _m.makeScale(0, 0, 0); splatState().sMesh.setMatrixAt(i, _m); continue; }
    _n.set(st.n[0], st.n[1], st.n[2]); _q.setFromUnitVectors(_up, _n);
    _m.compose(_p.set(st.x, st.y, st.z), _q, _s.set(st.size * fade, st.size * fade, 1));
    splatState().sMesh.setMatrixAt(i, _m);
  }
  splatState().sMesh.instanceMatrix.needsUpdate = true;
  for (let i = splatState().actorDots.length - 1; i >= 0; i--) { const o = splatState().actorDots[i]; o.t += dt; if (o.t > ACTOR_LIFE) { o.m.parent && o.m.parent.remove(o.m); o.m.material.dispose(); splatState().actorDots.splice(i, 1); } else if (o.t > ACTOR_LIFE - 1.5) o.m.scale.multiplyScalar(0.97); }
}
