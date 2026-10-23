import {V3} from '../core/gfx.js';
import {W} from '../world/state.js';
import {raySolids} from '../world/physics.js';
import {actors} from './actors.js';
import {useTool,releaseBow} from './tools.js';
const ranges={bow:24,net:15,water:11,sling:20,bubbles:6,extinguisher:5,perfume:5};
export function cancelBotAim(b){if(b.weapon?.it)b.weapon.it.draw=0;b.weapon=null;b.toolAiming=false;}
export function tryBotTool(b,preferred,dt){const it=b.held,range=ranges[it?.type];if(!range){cancelBotAim(b);return false;}if(it.def.ammo&&it.ammo<=0){cancelBotAim(b);return false;}
 if(b.heldBy||b.stun>0||b.daze>0||b.getT>0||b.netT>0||b.climbing||b.ride){cancelBotAim(b);return true;}
 const ally=a=>W.football?.team?.has(b)&&W.football.team.get(a)===W.football.team.get(b),valid=a=>a&&a!==b&&!a.drone&&!a.returning&&!a.hidden&&!a.caged&&!(a.ghost>0)&&!ally(a)&&a.pos&&a.pos.distanceTo(b.pos)<range&&Math.abs(a.pos.y-b.pos.y)<range*.8;
 const from=it.pos.clone(),visible=a=>{const p=a.pos.clone().add(new V3(0,.85,0)),dir=p.sub(from),d=dir.length();return raySolids(from,dir.normalize(),d)>=d-.12;};
 const candidates=actors().filter(valid).sort((a,c)=>a.pos.distanceToSquared(b.pos)-c.pos.distanceToSquared(b.pos)),target=valid(preferred)&&visible(preferred)?preferred:candidates.find(visible);
 if(!target){cancelBotAim(b);return true;}
 let q=b.weapon;if(!q||q.it!==it||q.target!==target){cancelBotAim(b);q=b.weapon={it,target,aimT:0,wait:0,aim:new V3()};}q.aimT+=dt;q.wait=Math.max(0,q.wait-dt);b.toolAiming=true;b.aimAt=target.pos;b.facing=Math.atan2(target.pos.x-b.pos.x,target.pos.z-b.pos.z);
 const distance=from.distanceTo(target.pos),draw=Math.min(1,.42+distance*.026),speed=it.type==='bow'?7+37*draw**.85:it.type==='net'?19:22,flight=Math.min(.65,distance/speed),gravity=it.type==='bow'?16:it.type==='net'?6:it.type==='water'?14:0,initial=it.type==='net'?2:it.type==='water'?1.5:0;
 q.aim.copy(target.pos).y+=.9;q.aim.addScaledVector(target.vel||new V3(),flight*.65);q.aim.y+=.5*gravity*flight*flight-initial*flight;
 if(it.type==='bow'){if(q.aimT<.30||(it.cd||0)>0||!(it.equipT>.65))return true;useTool(b,it,q.aim,dt);if(it.draw>=draw){releaseBow(b,it,q.aim);q.aimT=0;}return true;}
 if(q.aimT<.35||q.wait>0||(it.cd||0)>0&&!it.def.hold)return true;
 useTool(b,it,q.aim,it.def.hold?dt:0);if(!it.def.hold)q.wait=it.type==='net'?1:.55;return true;
}
