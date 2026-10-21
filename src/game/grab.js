import { V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { smokeRing } from '../world/particles.js';
import { actors, dropHeld } from './actors.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';
import { raySolids } from '../world/physics.js';

/* Захват удерживает соперника за одежду на земле. Оба продолжают ходить,
   схваченный сильно замедлен и может вырваться. Подъёма и броска персонажа нет. */
const gripFrom = new V3(), gripDir = new V3(), contact = new V3();
const unavailable = a => a.hidden || a.drone || a.returning || a.caged || a.ride || a.swing || a.bench || a.mantle || a.hang || a.climb || a.climbing || a.zip || a.dive || a.diveT > 0 || a.netT > 0;
const handBusy = a => a.held || a.carryCrate || a.carryKitten || a.carryNet || a.missionTool || a.dogHeld || a.grab;

function clearGrip(a, b) {
  gripFrom.copy(a.pos).y += 0.8; gripDir.subVectors(b.pos, a.pos); gripDir.y = 0;
  const d = gripDir.length(); return d < 0.01 || raySolids(gripFrom, gripDir.multiplyScalar(1 / d), d) >= d - 0.1;
}
export function grabTarget(a, r = 1.35) {
  if (handBusy(a) || unavailable(a) || a.stun > 0 || a.daze > 0 || a.holding || a.heldBy) return null;
  const f = a.root.rotation.y, fx = Math.sin(f), fz = Math.cos(f); let best = null, bd = r;
  for (const b of actors()) {
    if (b === a || unavailable(b) || b.heldBy || b.holding || b.gripSafe > 0) continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz);
    if (d < bd && Math.abs(b.pos.y - a.pos.y) < 0.7 && (dx * fx + dz * fz) / (d || 1) > 0.2 && clearGrip(a, b)) { bd = d; best = b; }
  }
  return best;
}
export function grabActor(a, b) {
  if (!b || a === b || handBusy(a) || unavailable(a) || unavailable(b) || a.stun > 0 || a.daze > 0 || a.getT > 0 || a.holding || a.heldBy || b.heldBy || b.holding || b.gripSafe > 0 || !a.onGround || !b.onGround || Math.abs(a.pos.y - b.pos.y) > 0.7 || a.pos.distanceTo(b.pos) > 1.6 || !clearGrip(a, b)) return false;
  a.holding = b; a.gripT = 0; b.heldBy = a; b.struggle = 0; b.emote = null;
  dropHeld(b); b.charging = false; a.charging = false;
  sfx('grab', { at: b.pos }); voice(b.ch, 'hurt', b.pos); W.onHit && W.onHit(a, b, 'melee'); return true;
}
// Отпускаем без импульса: ни один вызывающий код не может бросить персонажа.
export function letGo(a) {
  const b = a.holding; if (!b) return;
  a.holding = null; a.gripT = 0; if (b.heldBy === a) b.heldBy = null; b.struggle = 0; b.thrown = false; b.gripSafe = 0.8; a.charging = false;
}
function breakFree(b) {
  const a = b.heldBy; if (!a) return;
  letGo(a); a.knockT = Math.max(a.knockT || 0, 0.18);
  smokeRing(b.pos.x, b.pos.y + 0.1, b.pos.z, 5, { speed: 1 }); sfx('grab', { at: b.pos }); if (b.bot) b.revenge = 5;
}
export function struggleTap(b) { if (!b.heldBy || b.stun > 0) return; b.struggle += 0.15; if (b.struggle >= 1) breakFree(b); }
// После ввода, ДО moveBody: тяга не стирается управлением следующего кадра.
// Меняем только горизонтальную скорость; стены, ступени и высоту решает физика.
export function applyGripMotion(a, dt) {
  if (!a.holding && !a.heldBy) return;
  const b = a.heldBy;
  if (b && b.holding === a && a.onGround && b.onGround && clearGrip(a, b)) {
    const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,d=Math.hypot(dx,dz);
    if (d > 0.72 && d < 1.95) {
      const speed=Math.hypot(b.vel.x,b.vel.z),pull=Math.min(1.7,Math.max(0,d-0.82)*3.5+speed*0.6),k=1-Math.exp(-dt*10);
      a.vel.x+=(dx/d*pull+b.vel.x*0.35-a.vel.x)*k;
      a.vel.z+=(dz/d*pull+b.vel.z*0.35-a.vel.z)*k;
    }
  }
  const speed=Math.hypot(a.vel.x,a.vel.z),limit=a.stun>0?0.5:1.7;
  if(speed>limit){a.vel.x*=limit/speed;a.vel.z*=limit/speed;}
}
function poseGrip(a,b,dt) {
  a.root.rotation.y=Math.atan2(b.pos.x-a.pos.x,b.pos.z-a.pos.z);
  a.root.updateMatrixWorld(true);b.root.updateMatrixWorld(true);
  // Кисти цепляются за обращённую к нам сторону корпуса, с учётом размеров обоих скинов.
  const dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z,d=Math.hypot(dx,dz)||1,k=1-Math.exp(-dt*22);
  const y=Math.min(b.ch.d.holdY||0.95,(b.ch.d.top||1.8)*0.6);
  for(const [hand,side] of [[a.ch.handL,-1],[a.ch.handR,1]]){
    contact.set(b.pos.x+dx/d*b.r+dz/d*side*0.17,b.pos.y+y,b.pos.z+dz/d*b.r-dx/d*side*0.17);
    a.root.worldToLocal(contact);hand.position.lerp(contact,k);
  }
  a.ch.body.rotation.x=-0.08-Math.min(0.12,Math.max(0,d-0.85)*0.2);
  if(!(b.stun>0)&&!(b.getT>0)){
    const yaw=Math.atan2(a.pos.x-b.pos.x,a.pos.z-b.pos.z)-b.root.rotation.y;
    b.ch.head.rotation.y+= (Math.max(-0.65,Math.min(0.65,Math.atan2(Math.sin(yaw),Math.cos(yaw))))-b.ch.head.rotation.y)*k;
  }
}
export function updateGrabs(dt) {
  const list=actors();
  for(const a of list)if(a.gripSafe>0)a.gripSafe=Math.max(0,a.gripSafe-dt);
  for (const a of list) {
    const b = a.holding; if (!b) continue;
    a.gripT = (a.gripT || 0) + dt;
    const d = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
    if (b.heldBy!==a || !list.includes(b) || a.stun>0 || a.daze>0 || a.getT>0 || unavailable(a) || unavailable(b) || a.gripT>4 || d>1.95 || Math.abs(a.pos.y-b.pos.y)>0.75 || !clearGrip(a,b)) { letGo(a); continue; }
    if (b.bot && !(b.stun > 0)) b.struggle += dt * 0.42;
    if (b.struggle >= 1) { breakFree(b); continue; }
    poseGrip(a,b,dt);
  }
}

/* ---------- эмоции на 1–4 ---------- */
export const EMOTES = ['wave', 'dance', 'laugh', 'call'];
export function startEmote(a, k) {
  if (!a.onGround || a.held || a.holding || a.heldBy || a.ride || a.stun > 0) return false;
  a.emote = k; a.emoteT = 0; a.emoteDur = k === 'dance' ? 3.2 : 2.2;
  sfx('emote_' + k, { at: a.pos, v: a === W.player ? 1 : 0.7 });
  if (a.ch.skinId === 'frog') voice(a.ch, k === 'laugh' ? 'happy' : k === 'call' ? 'idle' : 'jump', a === W.player ? undefined : a.pos);
  return true;
}
export function updateEmote(a, dt, moving) {
  if (!a.emote) return;
  a.emoteT += dt;
  if (moving || a.emoteT > a.emoteDur || !a.onGround || a.stun > 0 || a.heldBy) a.emote = null;
  else if (a.emote === 'dance' && a.ch.skinId === 'frog' && Math.random() < dt * 0.9) voice(a.ch, 'jump', a === W.player ? undefined : a.pos);
}
void V3;
