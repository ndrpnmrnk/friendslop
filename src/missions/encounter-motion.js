import {V3} from '../core/gfx.js';
import {moveBody,groundAt,isFree,raySolids} from '../world/physics.js';
import {detour} from '../game/navigation.js';
export const flat=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function visible(a,b){const d=new V3().subVectors(b,a),l=d.length();return l<.05||raySolids(a,d.multiplyScalar(1/l),l)>=l-.1;}
export function freeSpot(c,min=3,max=9,height=1.4){for(let i=0;i<60;i++){const a=Math.random()*Math.PI*2,r=min+Math.random()*(max-min),x=c.x+Math.sin(a)*r,z=c.z+Math.cos(a)*r,y=groundAt(x,z,.3,c.y+.5);if(Math.abs(y-c.y)<.4&&isFree(x-.35,z-.35,x+.35,z+.35,y+.05,y+height))return new V3(x,y,z);}return null;}
export function npcBody(model){return{model,root:model.root,pos:model.root.position,vel:new V3(),push:new V3(),r:.25,h:1.15,step:.35,onGround:true,navCD:0,probe:model.root.position.clone(),stuck:0};}
// Небольшие NPC пользуются общей физикой и ограниченным обходом, а не идут сквозь стены.
export function walkNPC(b,target,speed,dt){
 b.navCD-=dt;const dist=flat(b.pos,target);if(dist<.18){b.vel.x=b.vel.z=0;moveBody(b,dt);return;}
 if(b.probe.distanceToSquared(b.pos)<.001)b.stuck+=dt;else b.stuck=0;b.probe.copy(b.pos);
 if(b.stuck>.45&&b.navCD<=0){b.nav=detour(b,target.x,target.z);b.navCD=1.4;b.stuck=0;}
 while(b.nav?.length&&flat(b.pos,b.nav[0])<.5)b.nav.shift();
 const q=b.nav?.length?b.nav[0]:target,dx=q.x-b.pos.x,dz=q.z-b.pos.z,d=Math.hypot(dx,dz)||1;
 b.vel.x=dx/d*speed;b.vel.z=dz/d*speed;moveBody(b,dt);const yaw=Math.atan2(dx,dz);if(b.kind==='mayor'){const d=Math.atan2(Math.sin(yaw-b.root.rotation.y),Math.cos(yaw-b.root.rotation.y));b.root.rotation.y+=d*(1-Math.exp(-dt*5.5));}else b.root.rotation.y=yaw;
}
