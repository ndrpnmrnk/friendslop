import { V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { burst } from '../world/particles.js';

/* Общие действия над «актёрами» (игрок и боты; потом — живые игроки по сети):
   толчок, выронить предмет из рук, сбить с ног. Логика без рендера — её можно перенести на сервер. */
export const actors = () => [W.player, ...(W.bots || [])].filter(a => a && !a.drone && !a.returning);

// выронить то, что в руках: предмет отлетает чуть вперёд и вверх
export function dropHeld(a, vx = 0, vz = 0) {
  const it = a.held; if (!it) return null;
  a.held = null; if (a.charging) a.charging = false;
  if (it.lit !== undefined) it.thrownLit = true;
  it.state = 'fly'; it.owner = a; it.noHitT = 0.25;
  it.pos.set(a.pos.x, a.pos.y + 1.2, a.pos.z); it.vel.set(vx * 0.4 + (Math.random() - 0.5) * 2, 3.5, vz * 0.4 + (Math.random() - 0.5) * 2); it.g.visible = true;
  return it;
}

// толчок без оглушения (выпад, подушка, струя): отбрасывает и выбивает предмет из рук
export function shove(a, dx, dz, power = 6, up = 3.5, drop = true) {
  if (a.drone || a.returning) return;
  const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  a.vel.x = dx * power; a.vel.z = dz * power; a.vel.y = Math.max(a.vel.y, up); a.onGround = false;
  if (a.grab && a.grab.kind !== undefined && W.releaseCart) W.releaseCart(a);
  if (drop) dropHeld(a, dx * power, dz * power);
  if (a.holding) W.letGo && W.letGo(a);
  a.knockT = 0.35; // короткое время без управления (летит), но без звёздочек
  burst(a.pos.x, a.pos.y + 1, a.pos.z, 5, { color: 0xf1e8ff, size: 0.16, speed: 2, up: 1.5 });
}

// сбить с ног: короткое оглушение (тяжёлый бросок, тапок, банановая кожура)
export function knockDown(a, dx = 0, dz = 0, t = 1.1) {
  if (a.hidden) return;
  a.stun = Math.max(a.stun || 0, t); a.vel.set(dx, 4, dz); a.onGround = false;
  dropHeld(a, dx, dz);
  if (a.holding) W.letGo && W.letGo(a);
}
export const isActor = o => o && (o === W.player || (W.bots || []).includes(o));
void V3;
