import { random } from '../core/random.js';
import {V3} from '../core/gfx.js';
import {W} from '../world/state.js';
import {actors} from './actors.js';
import {tickNPCHit} from './impacts.js';
import {walkNPC,flat,visible} from '../missions/encounter-motion.js';
import {sfx} from '../core/sfx.js';
// Тот же мэр используется и в обычной жизни района, и в цепочке салона.
export function mayorLife(m,route){let wait=2,index=0,react=0,probe=0;return dt=>{m.t+=dt;if(tickNPCHit(m,dt,m.t)){react=1.8;return;}if(m.busy||m.missionControlled)return;
 for(const a of actors()){const dx=a.pos.x-m.pos.x,dz=a.pos.z-m.pos.z,d=Math.hypot(dx,dz),r=m.r+(a.r||.45);if(d<r&&Math.abs(a.pos.y-m.pos.y)<1.5&&d>.01&&a.push){const power=Math.min(1.8,(r-d)*5);a.push.x+=dx/d*power;a.push.z+=dz/d*power;}}
 react=Math.max(0,react-dt);probe-=dt;if(probe<=0){probe=.25;const eye=m.pos.clone().add(new V3(0,1.6,0));for(const a of actors()){const d=flat(a.pos,m.pos);if(d<8&&visible(eye,a.pos.clone().add(new V3(0,1,0)))&&((a.ch?.shout||0)>.2||d<1.25)){m.lookAt=a.pos.clone();react=1.5;break;}}for(const it of W.items)if(it.state==='fly'&&flat(it.pos,m.pos)<2.5){react=2;m.lookAt=it.pos.clone();break;}}
 if(react>0){m.vel.x=m.vel.z=0;if(m.lookAt){const yaw=Math.atan2(m.lookAt.x-m.pos.x,m.lookAt.z-m.pos.z),d=Math.atan2(Math.sin(yaw-m.root.rotation.y),Math.cos(yaw-m.root.rotation.y));m.root.rotation.y+=d*(1-Math.exp(-dt*4));}m.model.animate(m.t,0,'look');return;}
 if(m.returnHome){walkNPC(m,m.home,1.1,dt);m.model.animate(m.t,.6);if(flat(m.pos,m.home)<.4)m.returnHome=false;return;}
 if(wait>0){wait-=dt;m.model.animate(m.t,0,index%2?'read':'idle');return;}
 const goal=m.lard?m.home:route[index%route.length];for(const d of W.doors)if(!d.open&&Math.hypot(d.x-m.pos.x,d.z-m.pos.z)<2.2&&Math.abs(d.y-m.pos.y)<1.2){d.open=true;sfx('door',{at:d,range:9,v:.4});}
 walkNPC(m,goal,m.lard?.55:1.0,dt);m.model.animate(m.t,Math.min(.8,Math.hypot(m.vel.x,m.vel.z)*.7));if(flat(m.pos,goal)<.45){index++;wait=3+random()*4;m.nav=null;}
 };}
