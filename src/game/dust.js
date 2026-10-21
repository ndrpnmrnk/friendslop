import { THREE } from '../core/gfx.js';
import { W } from '../world/state.js';

/* Пыль в лучах фонарей (v0.19): у ближайших к игроку горящих фонарей в конусе света медленно кружат пылинки */
const N = 220, PER = 22;
let pts = null, pos = null, seed = null;
export function initDust(scene) {
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
}
