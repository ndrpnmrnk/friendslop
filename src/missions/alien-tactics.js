import {V3} from '../core/gfx.js';
import {walkNPC,flat,visible} from './encounter-motion.js';
import {isFree,raySolids} from '../world/physics.js';
import {sfx} from '../core/sfx.js';
export function alienTactics(a,P,shots,t,dt){
 a.model.body.rotation.x=0;
 a.evadeCD=Math.max(0,(a.evadeCD??1+a.id*.3)-dt);a.dashCD=Math.max(0,(a.dashCD??2+a.id*.6)-dt);
 if(a.recoil>0){a.recoil-=dt;a.model.body.rotation.x=-Math.sin(a.recoil/.25*Math.PI)*.22;return true;}
 if(a.rush){const r=a.rush;r.t-=dt;
  if(r.wind>0){r.wind-=dt;a.root.rotation.y=Math.atan2(r.dir.x,r.dir.z);a.model.body.rotation.x=-.24;a.model.hands[1].rotation.x=-1.1;return true;}
  const from=a.pos.clone().add(new V3(0,.6,0)),distance=raySolids(from,r.dir,dt*r.speed+.4),speed=Math.max(0,Math.min(r.speed,(distance-.35)/dt));
  walkNPC(a,a.pos.clone().addScaledVector(r.dir,2),speed,dt);a.model.body.rotation.x=.32;
  if(r.t<=0||speed<.3){a.rush=null;a.dashCD=2.6+Math.random()*1.4;a.evadeCD=1.0;}return true;
 }
 if(a.evade){a.evade.t-=dt;walkNPC(a,a.evade.goal,5.8,dt);a.model.body.rotation.z=a.evade.side*.24;if(a.evade.t<=0)a.evade=null;return true;}
 if(a.wind>0||P.heldBy||P.stun>0||P.daze>0)return false;
 if(a.evadeCD<=0)for(const shot of shots){const d=a.pos.clone().add(new V3(0,.7,0)).sub(shot.p),dir=shot.v.clone().normalize(),along=d.dot(dir);if(along<.5||along>6||d.addScaledVector(dir,-along).length()>.8)continue;
  for(const side of [a.id%2?1:-1,a.id%2?-1:1]){const goal=a.pos.clone().add(new V3(dir.z*side*1.4,0,-dir.x*side*1.4));if(isFree(goal.x-.3,goal.z-.3,goal.x+.3,goal.z+.3,goal.y+.1,goal.y+1.4)&&visible(a.pos.clone().add(new V3(0,.6,0)),goal.clone().add(new V3(0,.6,0)))){a.evade={goal,t:.28,side};a.evadeCD=1.8+Math.random();return true;}}
 }
 const d=flat(a.pos,P.pos);
 if(a.dashCD<=0&&d>2.5&&d<7&&visible(a.pos.clone().add(new V3(0,.7,0)),P.pos.clone().add(new V3(0,.7,0)))){const dir=P.pos.clone().addScaledVector(P.vel,.15).sub(a.pos);dir.y=0;dir.normalize();a.rush={dir,wind:.24,t:.62,speed:8.5};sfx('beep',{at:a.pos,range:10,v:.35});return true;}
 return false;
}
