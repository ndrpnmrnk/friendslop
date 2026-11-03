import { random } from '../core/random.js';
import { THREE, G, mesh, col, lam, tmat } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addSolid } from './physics.js';
import { puff } from './particles.js';
import { sfx } from '../core/sfx.js';
/* v0.71 J4: снеговик из отдельных частей. От броска распадается: комья, ведро, морковка и ветки разлетаются
   с физикой, лежат, тают (сплющиваются и уменьшаются) и исчезают. Коллизия пропадает сразу, через 25 с
   снеговик лепится заново и коллизия возвращается. */
const SNOW = () => lam({ color: 0xe8edf6, emissive: 0x2a3450, emissiveIntensity: .18 }, 'snowman71');
export function buildSnowman(parent, x, y, z, ry = 0, sc = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); W.keep.push(g);
  const w = SNOW(), dk = col(0x17111f), bark = tmat(T.bark()), red = col(0xd8243a), parts = [];
  const part = (r, build) => { const p = new THREE.Group(); g.add(p); build(p); parts.push({ g: p, r, home: p.position.clone(), q0: p.quaternion.clone(), v: new THREE.Vector3(), w: new THREE.Vector3() }); return p; };
  part(.5 * sc, p => { p.position.set(0, .45 * sc, 0); mesh(G.sph10, w, 0, 0, 0, .55 * sc, .5 * sc, .55 * sc, p); });
  part(.38 * sc, p => { p.position.set(0, 1.15 * sc, 0); mesh(G.sph10, w, 0, 0, 0, .4 * sc, .37 * sc, .4 * sc, p); mesh(G.torus, red, 0, .27 * sc, 0, .3 * sc, .3 * sc, .4, p).rotation.x = Math.PI / 2;
    mesh(G.box, red, .18 * sc, .1 * sc, .3 * sc, .1 * sc, .35 * sc, .05 * sc, p); for (let i = 0; i < 3; i++) mesh(G.sph, dk, 0, (-.1 + i * .12) * sc, .39 * sc, .035, .035, .03, p); });
  part(.27 * sc, p => { p.position.set(0, 1.68 * sc, 0); mesh(G.sph10, w, 0, 0, 0, .28 * sc, .27 * sc, .28 * sc, p); for (const s of [-1, 1]) mesh(G.sph, dk, s * .1 * sc, .08 * sc, .25 * sc, .04, .04, .03, p); });
  part(.12 * sc, p => { p.position.set(0, 2.02 * sc, 0); mesh(G.cyl8, col(0x5a6a7a), 0, 0, 0, .2 * sc, .22 * sc, .2 * sc, p).rotation.z = .15; });
  part(.06 * sc, p => { p.position.set(0, 1.66 * sc, .34 * sc); mesh(G.cone4, col(0xff8a1f), 0, 0, 0, .05 * sc, .25 * sc, .05 * sc, p).rotation.x = Math.PI / 2; });
  for (const s of [-1, 1]) part(.05, p => { p.position.set(s * .62 * sc, 1.25 * sc, 0); mesh(G.box, bark, 0, 0, 0, .5 * sc, .05, .05, p).rotation.z = s * .45; });
  const solid = addSolid(x - .45 * sc, z - .45 * sc, x + .45 * sc, z + .45 * sc, y, y + 1.9 * sc);
  const m = { x, y, z, sc, g, parts, solid, st: { down: 0, t: 0 } }; (W.snowmen ??= []).push(m); return m;
}
export function hitSnowmen(p, power, vel) {
  for (const m of W.snowmen || []) if (!m.st.down && power > 1 && Math.hypot(m.x - p.x, m.z - p.z) < .9 * m.sc && p.y < m.y + 2.3 * m.sc && p.y > m.y - .5) breakSnowman(m, vel);
}
function breakSnowman(m, vel) {
  m.st.down = 1; m.st.t = 0; if (m.solid) m.solid.on = false; sfx('snowHit');
  const vx = vel?.x || 0, vz = vel?.z || 0, inv = new THREE.Quaternion().copy(m.g.quaternion).invert(), push = new THREE.Vector3(vx, 0, vz).applyQuaternion(inv).multiplyScalar(.35);
  for (const q of m.parts) { const a = random() * 6.28, up = 1.6 + random() * 2.4 + q.home.y * .8, out = 1 + random() * 1.6;
    q.v.set(Math.cos(a) * out + push.x, up, Math.sin(a) * out + push.z); q.w.set((random() - .5) * 9, (random() - .5) * 9, (random() - .5) * 9); q.rest = false; q.g.visible = true; }
  for (let i = 0; i < 10; i++) puff(m.x + (random() - .5) * .8, m.y + .4 + random() * 1.4, m.z + (random() - .5) * .8, { color: 0xf2f6ff, size: .35, vy: 1 + random(), life: .9 });
}
const e = new THREE.Euler(), dq = new THREE.Quaternion();
export function updateSnowmen(dt) {
  for (const m of W.snowmen || []) { const s = m.st; if (!s.down) continue; s.t += dt;
    if (s.t < 25) {
      for (const q of m.parts) { if (!q.g.visible) continue;
        if (!q.rest) { q.v.y -= 14 * dt; q.g.position.addScaledVector(q.v, dt); e.set(q.w.x * dt, q.w.y * dt, q.w.z * dt); q.g.quaternion.multiply(dq.setFromEuler(e));
          if (q.g.position.y < q.r * .7) { q.g.position.y = q.r * .7; if (q.v.y < -1.6) { q.v.y *= -.32; q.v.x *= .6; q.v.z *= .6; q.w.multiplyScalar(.5); } else { q.rest = true; } } }
        // таяние: после 2.5 с часть сплющивается, проседает и исчезает за 3 с, иногда пар/капли снега
        const k = Math.min(1, Math.max(0, (s.t - 2.5) / 3)); if (k > 0) { q.g.scale.set(1 - k * .6, Math.max(.02, 1 - k), 1 - k * .6); q.g.position.y = Math.max(q.r * .7 * (1 - k), .02); if (random() < dt * 3) puff(m.x + q.g.position.x, m.y + q.g.position.y, m.z + q.g.position.z, { color: 0xdfe8f6, size: .18, vy: .4, life: .6 }); }
        if (k >= 1) q.g.visible = false; }
    } else {
      // лепится заново: части возвращаются на место и растут снизу вверх
      const k = Math.min(1, (s.t - 25) / 1.2);
      for (const q of m.parts) { q.g.visible = true; q.g.position.copy(q.home); q.g.quaternion.copy(q.q0); q.g.scale.setScalar(Math.max(.01, Math.min(1, k * 1.4 - q.home.y / (2.2 * m.sc) * .4))); }
      if (k >= 1) { s.down = 0; for (const q of m.parts) q.g.scale.setScalar(1); if (m.solid) m.solid.on = true; }
    }
  }
}
