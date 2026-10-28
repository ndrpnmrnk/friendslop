import { W } from '../world/state.js';
import { sfx } from '../core/sfx.js';
import { burst, smokeRing } from '../world/particles.js';
import { knockDown } from './actors.js';

/* v0.60 — цели для захвата и опасные зоны района.
   Цель для захвата: схватил соперника (ПКМ) и дотащил до неё — срабатывает эффект:
   - 'stash'  — закинул в бак/морозилку/кузов: сидит внутри t секунд (не видно), потом выпрыгивает;
   - 'dunk'   — в воду/яму/канал: шлёпается, оглушён, брызги;
   - 'bounce' — на маты/батут: подбрасывает вверх;
   - 'slow'   — в бетономешалку/цемент: выходит медленным на t секунд;
   - 'fling'  — во вращающуюся дверь/каталку: вылетает в сторону dir.
   Цель — {x, z, r, y?, kind, t?, label, dir?: [dx, dz], at?: {x,y,z} куда сажать, onUse?(victim)}.
   Опасная зона (W.hazards) — {x0,z0,x1,z1} или {x,z,r}, y0/y1 по высоте, active() — сейчас опасно (с предупреждением);
   боты из неё выходят и не заходят. */
export function addGrabTarget(t) { (W.grabTargets ??= []).push({ r: 1.2, kind: 'dunk', t: 3, ...t }); return t; }
export function addHazard(h) { (W.hazards ??= []).push(h); return h; }
const trapped = [];
export function resetGrabTargets() { trapped.length = 0; }

export function tryGrabTarget(a, b) {
  for (const t of W.grabTargets || []) {
    if (Math.hypot(b.pos.x - t.x, b.pos.z - t.z) > t.r || (t.y !== undefined && Math.abs(b.pos.y - t.y) > 1.4)) continue;
    const p = b.pos;
    if (t.kind === 'stash') { const at = t.at || { x: t.x, y: p.y, z: t.z }; trapped.push({ b, t: t.t || 3, at, root: b.root.visible }); b.pos.set(at.x, at.y, at.z); b.vel.set(0, 0, 0); b.stun = Math.max(b.stun || 0, (t.t || 3) + .2); b.root.visible = false; sfx('bonk', { at: p }); smokeRing(at.x, at.y + .4, at.z, 8, { speed: 1.6 }); }
    else if (t.kind === 'dunk') { knockDown(b, (t.dir?.[0] || 0) * 3, (t.dir?.[1] || 0) * 3, t.t || 1.6); sfx('splash', { at: p }); burst(p.x, p.y + .3, p.z, 18, { color: t.color || 0x8ec8f0, size: .14, speed: 3, up: 3 }); }
    else if (t.kind === 'bounce') { b.vel.set((t.dir?.[0] || 0) * 3, 11, (t.dir?.[1] || 0) * 3); b.onGround = false; b.stun = Math.max(b.stun || 0, .6); sfx('spring', { at: p }); }
    else if (t.kind === 'slow') { b.webT = Math.max(b.webT || 0, t.t || 5); b.stun = Math.max(b.stun || 0, .8); sfx('drop', { at: p }); burst(p.x, p.y + .6, p.z, 14, { color: t.color || 0x9a9488, size: .16, speed: 2, up: 2 }); }
    else if (t.kind === 'fling') { const d = t.dir || [0, 1]; knockDown(b, d[0] * 9, d[1] * 9, t.t || 1.2); sfx('dash', { at: p }); }
    t.onUse?.(b, a);
    W.onHit && W.onHit(a, b, 'grab');
    return true;
  }
  return false;
}
export function updateGrabTargets(dt) {
  for (let i = trapped.length - 1; i >= 0; i--) { const q = trapped[i], b = q.b; q.t -= dt;
    b.pos.set(q.at.x, q.at.y, q.at.z); b.vel.set(0, 0, 0);
    if (q.t <= 0 || b.drone || b.returning) { trapped.splice(i, 1); b.root.visible = true; b.stun = 0; b.vel.set(0, 7, 0); b.pos.y += .6; b.onGround = false; sfx('spring', { at: b.pos }); smokeRing(b.pos.x, b.pos.y, b.pos.z, 8, { speed: 2 }); } }
}
export const isTrapped = b => trapped.some(q => q.b === b);

/* для ботов: куда уйти из опасной зоны / как обойти её. Возвращает [dx, dz] или null */
const inside = (h, x, z, m) => h.r !== undefined ? Math.hypot(x - h.x, z - h.z) < h.r + m : x > h.x0 - m && x < h.x1 + m && z > h.z0 - m && z < h.z1 + m;
export function hazardSteer(b, dx, dz) {
  for (const h of W.hazards || []) {
    if (!h.active || !h.active()) continue; const y = b.pos.y; if ((h.y0 !== undefined && y < h.y0 - .5) || (h.y1 !== undefined && y > h.y1)) continue;
    const x = b.pos.x, z = b.pos.z;
    if (inside(h, x, z, .6)) { // уже внутри — к выходу (если задан) или к ближайшему краю
      if (h.exit) { const ex = h.exit[0] - x, ez = h.exit[1] - z, l = Math.hypot(ex, ez) || 1; return [ex / l, ez / l]; }
      if (h.r !== undefined) { const ex = x - h.x, ez = z - h.z, l = Math.hypot(ex, ez) || 1; return [ex / l, ez / l]; }
      const c = [[x - h.x0, -1, 0], [h.x1 - x, 1, 0], [z - h.z0, 0, -1], [h.z1 - z, 0, 1]].sort((p, q) => p[0] - q[0])[0]; return [c[1], c[2]];
    }
    if (inside(h, x + dx * 1.8, z + dz * 1.8, .4)) { // впереди опасно — в сторону
      const cx = h.r !== undefined ? h.x : (h.x0 + h.x1) / 2, cz = h.r !== undefined ? h.z : (h.z0 + h.z1) / 2, s = (dx * (cz - z) - dz * (cx - x)) > 0 ? 1 : -1;
      return [-dz * s, dx * s];
    }
  }
  return null;
}
