import { random } from '../core/random.js';
import {actionEffect} from '../world/action-fx.js';
import { V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { burst } from '../world/particles.js';

/* Общие действия над «актёрами» (игрок и боты; потом — живые игроки по сети):
   толчок, выронить предмет из рук, сбить с ног. Логика без рендера — её можно перенести на сервер. */
export const actors = () => { const list = [W.player, ...(W.bots || [])].filter(a => a && !a.drone && !a.returning); return W.net ? list.sort((a,b) => (a.netKey||'').localeCompare(b.netKey||'')) : list; };

// выронить то, что в руках: предмет отлетает чуть вперёд и вверх
export function dropHeld(a, vx = 0, vz = 0) {
  const it = a.held; if (!it) return null;
  a.held = null; if (a.charging) a.charging = false;
  if (it.lit !== undefined) it.thrownLit = true;
  it.state = 'fly'; it.owner = a; it.noHitT = 0.25;
  it.pos.set(a.pos.x, a.pos.y + 1.2, a.pos.z); it.vel.set(vx * 0.4 + (random() - 0.5) * 2, 3.5, vz * 0.4 + (random() - 0.5) * 2); it.g.visible = true;
  return it;
}

// толчок без оглушения (выпад, подушка, струя): отбрасывает и выбивает предмет из рук
export function shove(a, dx, dz, power = 6, up = 3.5, drop = true) {
  if (a.puppet) { W.netHit?.(a, 'shove', [dx, dz, power, up, drop ? 1 : 0]); return; }
  if (a.drone || a.returning) return;
  const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  a.vel.x = dx * power; a.vel.z = dz * power; a.vel.y = Math.max(a.vel.y, up); a.onGround = false;
  if (a.grab && a.grab.kind !== undefined && W.releaseCart) W.releaseCart(a);
  if (drop) dropHeld(a, dx * power, dz * power);
  if (a.holding) W.letGo && W.letGo(a);
  actionEffect('hit',{x:a.pos.x,y:a.pos.y+1,z:a.pos.z},Math.min(1.3,power/7));
  a.knockT = 0.35; // короткое время без управления (летит), но без звёздочек
  burst(a.pos.x, a.pos.y + 1, a.pos.z, 5, { color: 0xf1e8ff, size: 0.16, speed: 2, up: 1.5 });
}

/* Два вида оглушения (v0.18):
   - рэгдолл (knockDown): падает «тряпичной куклой», лежит без управления (a.stun), потом плавно встаёт (a.getT);
     предмет из рук вылетает по физике в сторону удара — его можно перехватить;
   - стан стоя (daze): звёздочки над головой, шатается, двигаться можно, но очень медленно. */
export const GETUP = 0.7;
export function knockDown(a, dx = 0, dz = 0, t = 1.1) {
  if (a.puppet) { W.netHit?.(a, 'knock', [dx, dz, t]); return; } // v0.61: удар по игроку/боту другого компьютера — шлём владельцу
  if (a.hidden || a.drone || a.returning) return;
  actionEffect('hit',{x:a.pos.x,y:a.pos.y+1,z:a.pos.z},1.4);
  if (a.ride && W.dismount) W.dismount(a);
  a.roofSeat=null;a.climb = null; a.zip = null; a.mantle = null; a.hang = null;
  if (a.swing && W.leaveSwing) W.leaveSwing(a, false); if (a.bench) W.leaveBench && W.leaveBench(a);
  a.stun = Math.max(a.stun || 0, Math.max(1.6, t + 0.6)); a.daze = 0; a.vel.set(dx, 4, dz); a.onGround = false;
  dropHeld(a, dx * 2.2, dz * 2.2);
  if (a.holding) W.letGo && W.letGo(a);
}
export function daze(a, t = 1.2) { if (a.puppet) { W.netHit?.(a, 'daze', [t]); return; } if (a.hidden || a.drone || a.returning) return; a.daze = Math.max(a.daze || 0, t); }
// 1 — лежит, 0 — стоит (плавный подъём за GETUP секунд после конца оглушения)
export const ragK = a => a.stun > 0 ? 1 : a.getT > 0 ? a.getT / GETUP : 0;
// тик оглушений: вызывать там, где раньше уменьшали a.stun
export function tickStun(a, dt) {
  if (a.stun > 0) { a.stun -= dt; if (a.stun <= 0) { a.stun = 0; a.getT = GETUP; } }
  else if (a.getT > 0) a.getT -= dt;
  if (a.daze > 0) a.daze -= dt;
}
export const isActor = o => o && (o === W.player || (W.bots || []).includes(o));
void V3;
