import { THREE } from '../core/gfx.js';
import { W } from '../world/state.js';
import { T } from '../core/textures.js';
import { CONFIG } from '../config.js';
import { buildingAt } from '../missions/location.js';

/* Пыль в лучах фонарей (v0.19): у ближайших к игроку горящих фонарей в конусе света медленно кружат пылинки */
const N = 220, PER = 22;
let pts = null, pos = null, seed = null;
/* + мотыльки у фонарей (тёмные «галочки» кружат у плафона) и лёгкая дымка над землёй вокруг игрока (v0.20) */
let moths = null, mist = [];
export function initDust(scene) {
  { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 3), 3));
    moths = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x2a2030, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false })); moths.frustumCulled = false; scene.add(moths); }
  const mm = new THREE.MeshBasicMaterial({ map: T.fog(), transparent: true, opacity: 0.16, depthWrite: false, color: 0xc8b8e8 });
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), mm); m.rotation.x = -Math.PI / 2; m.renderOrder = 3; scene.add(m); mist.push({ m, ox: (Math.random() - 0.5) * 30, oz: (Math.random() - 0.5) * 30, ph: Math.random() * 6 }); }
  const g = new THREE.BufferGeometry(); pos = new Float32Array(N * 3); seed = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { seed[i * 3] = Math.random(); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random() * 6.28; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd8a0, size: 0.05, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
  pts.frustumCulled = false; scene.add(pts);
}
export function updateDust(t, P) {
  if (!pts || !P) return;
  const lamps = (W.lamps || []).filter(L => !L.dead && !(L.pool && (L.pool.userData.broken || !L.pool.visible)) && Math.abs(L.y - P.pos.y) < 6)
    .map(L => [L, Math.hypot(L.lx - P.pos.x, L.lz - P.pos.z)]).filter(q => q[1] < 28).sort((a, b) => a[1] - b[1]).slice(0, N / PER);
  for (let i = 0; i < N; i++) {
    const L = lamps[(i / PER) | 0]; if (!L) { pos[i * 3 + 1] = -999; continue; }
    const l = L[0], a = seed[i * 3 + 2] + t * 0.15 * (0.5 + seed[i * 3]), h = ((seed[i * 3 + 1] + t * 0.02 * (seed[i * 3] - 0.5)) % 1 + 1) % 1, r = (0.15 + h * 1.1) * Math.sqrt(seed[i * 3]);
    pos[i * 3] = l.lx + Math.cos(a) * r; pos[i * 3 + 1] = l.y + 2.9 - h * 2.7 + Math.sin(t * 0.7 + i) * 0.04; pos[i * 3 + 2] = l.lz + Math.sin(a) * r;
  }
  pts.geometry.attributes.position.needsUpdate = true;
  // мотыльки: по 6 у четырёх ближайших фонарей, мечутся вокруг плафона
  const mp = moths.geometry.attributes.position.array;
  for (let i = 0; i < 48; i++) { const L = lamps[(i / 6) | 0]; if (!L) { mp[i * 3 + 1] = -999; continue; } const l = L[0], a = t * (2.5 + (i % 5) * 0.6) + i * 1.7, r = 0.25 + 0.15 * Math.sin(t * 3.1 + i);
    mp[i * 3] = l.lx + Math.cos(a) * r; mp[i * 3 + 1] = l.y + 2.85 + Math.sin(t * 4.3 + i * 2) * 0.18; mp[i * 3 + 2] = l.lz + Math.sin(a * 1.3) * r; }
  moths.geometry.attributes.position.needsUpdate = true;
  // дымка над землёй: пятна дрейфуют вокруг игрока (на улице, не в подземке)
  const base = CONFIG.base, inside = !!buildingAt(P.pos);
  for (const q of mist) { const show = P.pos.y > base - 1 && P.pos.y < base + 6 && !inside; q.m.visible = show; if (!show) continue;
    q.m.position.set(Math.round(P.pos.x / 30) * 30 + q.ox + Math.sin(t * 0.07 + q.ph) * 3, base + 0.25 + Math.sin(t * 0.3 + q.ph) * 0.05, Math.round(P.pos.z / 30) * 30 + q.oz + Math.cos(t * 0.05 + q.ph) * 3); }
}
