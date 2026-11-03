import { W } from './state.js';
import { THREE } from '../core/gfx.js';
import { addPushable } from './pushables.js';
import { hitBreakables } from './breakables.js';
import { actors, knockDown } from '../game/actors.js';
import { puff } from './particles.js';
import { sfx } from '../core/sfx.js';
import { random } from '../core/random.js';
import { snowAt } from './snow-trails.js';

/* v0.70 снежный ком: один-два на карту, на снегу. Катится от толчков и растёт с пройденным путём (до ~2.6× размера).
   Большой и быстрый ком сбивает игроков на пути и ломает ящики. Рост считается у всех из одинаковой
   сетевой позиции, сбивание и поломку решает ведущий. Упал с края / ушёл с карты - лепится заново на месте. */
const _ax = new THREE.Vector3();
export function placeSnowrolls() {
  const rects = (W.snowRects || []).filter(r => r[2] - r[0] > 12 && r[3] - r[1] > 12); if (!rects.length) return;
  for (let i = 0; i < Math.min(2, rects.length); i++) { const r = rects[(random() * rects.length) | 0], x = r[0] + 6 + random() * (r[2] - r[0] - 12), z = r[1] + 6 + random() * (r[3] - r[1] - 12);
    const b = addPushable({ X: v => v, Z: v => v, Y: r[4] }, 'snowroll', x, z, 0); b.home = { x, z, y: b.y }; b.grow = 0; b.last = { x, z }; }
}
export function updateSnowrolls(dt) {
  const host = !W.net?.replica;
  for (const b of W.pushables || []) { if (b.kind !== 'snowroll' || !b.roller) continue;
    const dx = b.x - (b.last?.x ?? b.x), dz = b.z - (b.last?.z ?? b.z), d = Math.hypot(dx, dz); b.last = { x: b.x, z: b.z };
    if (d > 3 || b.y < (b.home?.y ?? 0) - 6) { if (host && b.home) { b.x = b.home.x; b.z = b.home.z; b.y = b.home.y; b.vx = b.vz = 0; b.grow = 0; } continue; }
    if (d > .001) { const onSnow = snowAt(b.x, b.z, b.y) !== null; if (onSnow) b.grow = Math.min(1, (b.grow || 0) + d * .025);
      _ax.set(dz, 0, -dx).normalize(); b.roller.rotateOnWorldAxis(_ax, d / Math.max(.3, b.r)); if (onSnow && random() < d * 3) puff(b.x, b.y + .1, b.z, { color: 0xeef3fb, size: .25, life: .5, vy: .3 }); }
    const k = 1 + (b.grow || 0) * 1.6; b.roller.scale.setScalar(k); b.roller.position.y = .5 * k; b.r = .5 * k; b.h = k;
    const sp = Math.hypot(b.vx || 0, b.vz || 0);
    if (host && k > 1.6 && sp > 3) { b.hitCD = (b.hitCD || 0) - dt;
      for (const a of actors()) if (!a.hidden && a.ride !== b && Math.hypot(a.pos.x - b.x, a.pos.z - b.z) < b.r + .35 && Math.abs(a.pos.y - b.y) < 1.4 && !(a.stun > 0)) { knockDown(a, a.pos.x - b.x, a.pos.z - b.z, 1.2); sfx('snowHit', { at: a.pos }); }
      if (b.hitCD <= 0) { b.hitCD = .25; hitBreakables({ x: b.x, y: b.y + b.r, z: b.z }, b.r + .2, [b.vx, 0, b.vz], 3 * k); } }
  }
}
