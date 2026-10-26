import { THREE, G, col, lam, compose } from '../core/gfx.js';
import { W } from './state.js';
import { HW } from '../config.js';
import { UG } from './underground.js';
import { puff, smoke } from './particles.js';
import { WX } from './weather.js';

/* Жизнь города: стаи летучих мышей над крышами, крысы в тоннелях, пар из люков, дым из труб,
   падающие листья вокруг игрока. Всё лёгкое: несколько групп, частицы — из общих пулов. */
let bats = [], rats = [], leaves = [], leafG = null, leafM = null, batMesh = null, st = { steam: 0, chim: 0 };
const _o = new THREE.Object3D(), _c = new THREE.Color();

function batModel() {
  return compose('bat', a => { const m = col(0x17111f); a(G.sphL, m, 0, 0, 0, 0.12, 0.1, 0.18); a(G.cone4, m, 0.05, 0.1, 0.1, 0.03, 0.08, 0.03); a(G.cone4, m, -0.05, 0.1, 0.1, 0.03, 0.08, 0.03); });
}
function wingModel(s) { return compose('batWing' + s, a => { a(G.box, col(0x241a30), s * 0.22, 0, 0, 0.42, 0.02, 0.2); a(G.box, col(0x241a30), s * 0.4, 0, -0.06, 0.2, 0.02, 0.14, 0, s * 0.4); }); }

export function buildLife(scene) {
  bats = []; rats = []; st = { steam: 0, chim: 0 };
  // летучие мыши: 3 стаи кружат над случайными районами (все мыши — 3 инстанс-меша: тело и два крыла)
  const nFlocks = HW ? 3 : 1, per = 6, total = nFlocks * per;
  batMesh = [new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), col(0x17111f), total), new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(-0.5, 0, 0), col(0x241a30), total), new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0, 0), col(0x241a30), total)];
  for (const m of batMesh) { m.frustumCulled = false; W.group.add(m); W.keep.push(m); W.mapResources.add(m.geometry); }
  for (let f = 0; f < nFlocks; f++) {
    const d = W.districts[(Math.random() * W.districts.length) | 0]; if (!d) break;
    const c = { x: d.ox + 16, z: d.oz + 16, y: 14 + Math.random() * 8, r: 7 + Math.random() * 6, sp: 0.5 + Math.random() * 0.4, ph: Math.random() * 6, members: [] };
    for (let i = 0; i < per; i++) c.members.push({ p: new THREE.Vector3(c.x, c.y, c.z), ry: 0, off: [Math.random() * 3 - 1.5, Math.random() * 2 - 1, Math.random() * 3 - 1.5], ph: Math.random() * 6 });
    bats.push(c);
  }
  // крысы в тоннелях
  for (const r of W.floodRects.slice().sort(() => Math.random() - 0.5).slice(0, 6)) {
    const [x0, z0, x1, z1] = r, alongX = x1 - x0 > z1 - z0;
    const g = compose('rat', a => { const m = col(0x4a4048); a(G.sphL, m, 0, 0.07, 0, 0.08, 0.06, 0.14); a(G.sphL, m, 0, 0.08, 0.13, 0.05, 0.045, 0.07); a(G.cyl5, col(0xc89a9a), 0, 0.05, -0.2, 0.01, 0.2, 0.01, Math.PI / 2 - 0.2); a(G.sph, col(0xc89a9a), 0.035, 0.12, 0.12, 0.02, 0.02, 0.01); a(G.sph, col(0xc89a9a), -0.035, 0.12, 0.12, 0.02, 0.02, 0.01); });
    W.group.add(g); W.keep.push(g);
    const side = Math.random() < 0.5 ? -1 : 1;
    const rat = { g, alongX, a0: alongX ? x0 + 1 : z0 + 1, a1: alongX ? x1 - 1 : z1 - 1, c: alongX ? (z0 + z1) / 2 + side * 1.2 : (x0 + x1) / 2 + side * 1.2, p: 0, dir: 1, sp: 0, wait: Math.random() * 3 };
    rat.p = rat.a0 + Math.random() * (rat.a1 - rat.a0); rats.push(rat);
  }
  // листья вокруг игрока: один инстанс-меш
  if (!leafM) {
    const cols = HW ? [0xc9662a, 0xa8452a, 0xe89a3a, 0xd8b040] : [0x5aaa50, 0x7aba5a];
    leafM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.08), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), 36); leafM.frustumCulled = false; scene.add(leafM);
    for (let i = 0; i < 36; i++) { leafM.setColorAt(i, _c.setHex(cols[i % cols.length])); leaves.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), spin: Math.random() * 4, life: 0 }); }
  }
  leaves.forEach(l => (l.life = 0));
}

export function updateLife(dt, t, player, camera) {
  let bi = 0;
  for (const c of bats) {
    c.ph += dt * c.sp;
    const cx = c.x + Math.cos(c.ph) * c.r, cz = c.z + Math.sin(c.ph * 1.3) * c.r, cy = c.y + Math.sin(c.ph * 2) * 1.5;
    for (const b of c.members) {
      const tx = cx + b.off[0] + Math.sin(t * 2 + b.ph) * 0.6, ty = cy + b.off[1] + Math.sin(t * 3 + b.ph) * 0.4, tz = cz + b.off[2] + Math.cos(t * 2.3 + b.ph) * 0.6;
      const p = b.p, dx = tx - p.x, dz = tz - p.z; p.x += dx * Math.min(1, dt * 3); p.y += (ty - p.y) * Math.min(1, dt * 3); p.z += dz * Math.min(1, dt * 3);
      if (dx * dx + dz * dz > 1e-4) b.ry = Math.atan2(dx, dz);
      const f = Math.sin(t * 22 + b.ph) * 0.9;
      _o.position.copy(p); _o.rotation.set(0, b.ry, 0); _o.scale.set(0.12, 0.1, 0.18); _o.updateMatrix(); batMesh[0].setMatrixAt(bi, _o.matrix);
      _o.rotation.set(0, b.ry, f); _o.scale.set(0.42, 0.02, 0.2); _o.position.x -= Math.cos(b.ry) * 0.08; _o.position.z += Math.sin(b.ry) * 0.08; _o.updateMatrix(); batMesh[1].setMatrixAt(bi, _o.matrix);
      _o.position.copy(p); _o.rotation.set(0, b.ry, -f); _o.position.x += Math.cos(b.ry) * 0.08; _o.position.z -= Math.sin(b.ry) * 0.08; _o.updateMatrix(); batMesh[2].setMatrixAt(bi, _o.matrix);
      bi++;
    }
  }
  if (batMesh) { for (const m of batMesh) { m.count = bi; m.instanceMatrix.needsUpdate = true; } }
  for (const r of rats) {
    const px = r.alongX ? r.p : r.c, pz = r.alongX ? r.c : r.p;
    if (player && Math.abs(player.pos.y - UG.floor) < 1.5 && Math.hypot(player.pos.x - px, player.pos.z - pz) < 4) { r.wait = 0; r.dir = Math.sign((r.alongX ? px - player.pos.x : pz - player.pos.z)) || 1; r.sp = 5; }
    if (r.wait > 0) { r.wait -= dt; r.sp = 0; } else { if (r.sp < 1) r.sp = 2.2; r.p += r.dir * r.sp * dt; if (r.p < r.a0 || r.p > r.a1) { r.dir *= -1; r.p = Math.max(r.a0, Math.min(r.a1, r.p)); r.wait = 1 + Math.random() * 4; r.sp = 0; } r.sp = Math.max(2.2, r.sp - dt * 2); if (Math.random() < dt * 0.3) r.wait = 0.5 + Math.random() * 2; }
    r.g.position.set(r.alongX ? r.p : r.c, UG.floor + 0.01, r.alongX ? r.c : r.p);
    r.g.rotation.y = r.alongX ? (r.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (r.dir > 0 ? 0 : Math.PI);
  }
  if (!player) return;
  // пар из люков и дым из труб — только рядом с игроком
  st.steam -= dt;
  if (st.steam <= 0) { st.steam = 0.18; for (const m of W.manholes) if (Math.abs(m.x - player.pos.x) < 30 && Math.abs(m.z - player.pos.z) < 30) puff(m.x + (Math.random() - 0.5) * 0.6, 0.15, m.z + (Math.random() - 0.5) * 0.6, { size: 0.5, grow: 2.2, life: 1.8, vy: 0.9, color: 0xc8c0d8, opacity: 0.35 }); }
  st.chim -= dt;
  if (st.chim <= 0) { st.chim = 0.35; for (const c of W.chimneys) if (Math.abs(c.x - player.pos.x) < 45 && Math.abs(c.z - player.pos.z) < 45) smoke(c.x, c.y, c.z, { size: 0.4, grow: 1.4, life: 2.6, vy: 1.1, vx: 0.4, vz: 0.1, g: 0, color: 0x6a6078, opacity: 0.55 }); }
  // листья
  let li = 0;
  for (const l of leaves) {
    const wk = WX.windNow || 0;
    if (l.life <= 0) { if (Math.random() < dt * 3 * (1 + wk * 5)) { const a = Math.random() * 6.28, d = 2 + Math.random() * 10; l.p.set(player.pos.x + Math.cos(a) * d - WX.wind.x * wk * 8, player.pos.y + 1 + Math.random() * 6, player.pos.z + Math.sin(a) * d - WX.wind.z * wk * 8); l.v.set(0.6 + Math.random() * 0.5 + WX.wind.x * wk * 7, -0.9 - Math.random() * 0.4 + wk * 0.5, 0.2 + WX.wind.z * wk * 7); l.life = 7; } }
    else { l.life -= dt; const p = l.p; p.x += (l.v.x + Math.sin(t * 2 + l.spin) * 0.6) * dt; p.y += l.v.y * dt; p.z += (l.v.z + Math.cos(t * 1.7 + l.spin) * 0.5) * dt; if (p.y < player.pos.y - 1) l.life = 0; }
    _o.position.copy(l.p); _o.rotation.set(t * l.spin, t * 1.3, t * 0.7 + l.spin); _o.scale.setScalar(l.life > 0 ? 1 : 0); _o.updateMatrix(); leafM.setMatrixAt(li++, _o.matrix);
  }
  leafM.instanceMatrix.needsUpdate = true;
}
