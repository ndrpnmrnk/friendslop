import {V3} from '../core/gfx.js';
import {W} from '../world/state.js';
import {actors} from './actors.js';
import {raySolids} from '../world/physics.js';
import {sfx} from '../core/sfx.js';
const invalid=a=>!a||a.netProtected||a.hidden||a.drone||a.returning||a.stun>0||a.heldBy||a.holding||a.ride||a.missionTool||a.hang;
const from=new V3(),dir=new V3(),hand=new V3();
export function canTug(a,it){const b=it?.owner;if(invalid(a)||invalid(b)||a===b||a.held||it.noPickup||it.taken||it.state!=='held'||b.held!==it||!a.onGround||!b.onGround||a.pos.distanceTo(b.pos)>1.75)return false;from.copy(a.pos).y+=1;dir.copy(b.pos).sub(a.pos);const d=dir.length();return !d||raySolids(from,dir.multiplyScalar(1/d),d)>=d-.15;}
export function startTug(a,it){if(!canTug(a,it)||it.tug&&it.tug.actor!==a)return false;if(W.net?.request('tug',it,{hold:true})){a.pendingTug=it;return true;}it.tug??={actor:a,progress:.1,time:0,defend:false};a.tugItem=it;return true;}
export function tugInput(a,hold){const it=a.tugItem||a.pendingTug||a.held;if(!it?.tug&&!a.pendingTug)return false;if(W.net?.request('tug',it,{hold})){if(!hold)a.pendingTug=null;return true;}if(it.owner===a)it.tug.defend=hold;else if(it.tug.actor===a&&!hold)clearTug(it);return true;}
export function clearTug(it){if(it.tug?.actor?.tugItem===it)it.tug.actor.tugItem=null;it.tug=null;}
export function tugTarget(a){const f=a.root.rotation.y;for(const b of actors()){const it=b.held;if(!canTug(a,it))continue;const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z;if(dx*Math.sin(f)+dz*Math.cos(f)>.15)return it;}return null;}
export function updateTugs(dt){const list=actors();for(const it of W.items){const q=it.tug;if(!q)continue;const a=q.actor,b=it.owner;
 if(!W.net?.replica){if(!list.includes(a)||!list.includes(b)||!canTug(a,it)||q.time>8){clearTug(it);continue;}q.time+=dt;const dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z,d=Math.hypot(dx,dz)||1,retreat=Math.max(0,(a.vel.x*dx+a.vel.z*dz)/d);q.progress+=dt*(.32+Math.min(.4,retreat*.25)-(q.defend||b.bot&&!b.human?.48:.12));q.progress=Math.max(0,q.progress);
  if(q.progress>=1){b.held=null;a.held=it;it.owner=a;it.wasHeld=true;clearTug(it);sfx('pickup',{at:it.pos});continue;}}
 if(a?.ch){a.root.updateWorldMatrix(true,false);hand.copy(it.pos);a.root.worldToLocal(hand);a.ch.handL.position.lerp(hand,.55);a.ch.handR.position.lerp(hand,.55);a.ch.body.rotation.x=-.12;}
 }}

// Ввод обоих участников замедлен, натяжение идёт через обычную физику тела.
export function applyTugMotion(a){const it=a.tugItem||a.held;if(!it?.tug)return;const other=it.owner===a?it.tug.actor:it.owner;if(!other)return;const dx=other.pos.x-a.pos.x,dz=other.pos.z-a.pos.z,d=Math.hypot(dx,dz)||1,pull=Math.max(0,d-1.05)*4;a.vel.x=a.vel.x*.28+dx/d*pull;a.vel.z=a.vel.z*.28+dz/d*pull;const speed=Math.hypot(a.vel.x,a.vel.z);if(speed>1.5){a.vel.x*=1.5/speed;a.vel.z*=1.5/speed;}}
