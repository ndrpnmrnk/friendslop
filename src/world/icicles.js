import { THREE, G, mesh, lam } from '../core/gfx.js';
import { W } from './state.js';
import { isFree, groundAt } from './physics.js';
import { districtClock } from './district-motion.js';
import { burst, chunk } from './particles.js';
import { sfx } from '../core/sfx.js';
import { random } from '../core/random.js';
import { WINTER } from '../config.js';
import { actors, knockDown } from '../game/actors.js';

/* v0.70 сосульки над входами в дома.
   Висят → попал предметом → 0.45 с дрожат и трещат → падают по физике → разбиваются и оглушают стоящего под ними
   → через 25 с медленно отрастают. Решает ведущий; у всех одно общее состояние (W.districtStates, часы districtClock),
   поэтому падение, место удара и осколки совпадают у всех игроков. Попадание и оглушение проверяет только ведущий. */
const SHAKE = .45, REGROW = 25, G0 = 18;
let list = [], state = null, mat = null;
const icM = () => mat || (mat = lam({ color: 0xcfe6fa, emissive: 0x30506e, emissiveIntensity: .45, transparent: true, opacity: .85 }, 'icicle70'));

export function buildIcicles() {
  list = []; state = null; if (!WINTER) return;
  const picked = [];
  for (const d of W.doors) {
    if (picked.length >= 12) break;
    if (picked.some(q => Math.hypot(q.x - d.x, q.z - d.z) < 7)) continue;
    // наружная сторона двери: перед ней свободно, над ней небо (не внутренняя дверь)
    for (const s of [1, -1]) {
      const nx = d.axis === 'x' ? 0 : s, nz = d.axis === 'x' ? s : 0, x = d.x + nx * .45, z = d.z + nz * .45, y = d.y + 2.75;
      if (!isFree(x - .15, z - .15, x + .15, z + .15, d.y + .2, d.y + 2.4)) continue;
      if (!isFree(x - .2, z - .2, x + .2, z + .2, y + .6, y + 8)) continue;
      const wall = d.x - nx * .05, wallZ = d.z - nz * .05; void wall; void wallZ;
      picked.push({ x, z, y, ry: Math.atan2(nx, nz), floor: groundAt(x, z, .3, d.y + .5) ?? d.y }); break;
    }
  }
  if (!picked.length) return;
  state = { values: picked.map(() => 0) }; W.districtStates.push(state);
  for (const q of picked) {
    const g = new THREE.Group(); g.position.set(q.x, q.y, q.z); g.rotation.y = q.ry; W.group.add(g); W.keep.push(g);
    // гребень снега на козырьке и 5 сосулек разной длины
    mesh(G.box, lam({ color: 0xe6ecf5, emissive: 0x3a4660, emissiveIntensity: .2 }, 'icicleSnow70'), 0, .06, 0, 1.4, .12, .3, g);
    const parts = []; for (let i = 0; i < 5; i++) { const len = .25 + random() * .45, m = mesh(G.cone4, icM(), -.5 + i * .25, -len / 2, (random() - .5) * .1, .05 + random() * .03, len, .05, g); m.rotation.x = Math.PI; parts.push({ m, len }); }
    list.push({ ...q, g, parts, broke: false, y0: q.y });
  }
}
// попадание предметом (worldfx.worldHit): только у ведущего
export function hitIcicles(p, power) {
  if (!state || W.net?.replica || power < .8) return;
  const now = districtClock();
  list.forEach((c, i) => { if (state.values[i] === 0 && Math.hypot(c.x - p.x, c.z - p.z) < .9 && Math.abs(p.y - c.y) < 1) { state.values[i] = now + SHAKE; sfx('glass', { at: { x: c.x, y: c.y, z: c.z }, v: .5 }); } });
}
export function updateIcicles(dt) {
  if (!state) return; const now = districtClock(), host = !W.net?.replica;
  list.forEach((c, i) => {
    const v = state.values[i] || 0;
    if (v === 0) { if (c.broke || !c.g.visible) { c.g.visible = true; c.g.position.y = c.y0; c.g.scale.setScalar(1); c.broke = false; } c.g.rotation.z = 0; return; }
    if (v < 0) { // отрастает
      const left = -v - now; c.g.position.y = c.y0; c.g.rotation.z = 0;
      if (left > 2) { c.g.visible = false; return; } c.g.visible = true; c.g.scale.set(1, Math.max(.05, 1 - left / 2), 1);
      if (left <= 0 && host) state.values[i] = 0; return;
    }
    if (now < v) { c.g.visible = true; c.g.rotation.z = Math.sin(now * 60) * .03; return; } // дрожит перед падением
    const t = now - v, y = c.y0 - .5 * G0 * t * t;
    if (y > c.floor + .25) { c.g.visible = true; c.g.position.y = y; c.g.rotation.z = 0; return; }
    if (!c.broke) { // удар о землю: осколки у всех, оглушение - у ведущего
      c.broke = true; c.g.visible = false;
      for (let k = 0; k < 8; k++) chunk(c.x, c.floor + .3, c.z, [(random() - .5) * 4, 1.5 + random() * 2, (random() - .5) * 4], { mat: icM(), size: .06 + random() * .05, life: 1.4 });
      burst(c.x, c.floor + .3, c.z, 10, { color: 0xdff0ff, size: .12, speed: 2.4 }); sfx('glass', { at: { x: c.x, y: c.floor, z: c.z } });
      if (host) { for (const a of actors()) if (!a.hidden && Math.hypot(a.pos.x - c.x, a.pos.z - c.z) < .95 && Math.abs(a.pos.y - c.floor) < 1.2) knockDown(a, a.pos.x - c.x, a.pos.z - c.z, 1.2);
        state.values[i] = -(now + REGROW); }
    }
  });
}
