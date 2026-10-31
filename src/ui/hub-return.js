import {W} from '../world/state.js';
import {syncPushable} from '../world/physics.js';
// Только первоначальный реквизит хаба. Копий при возвращении не создаём.
export function installHubReturn(){
 const homes=new WeakMap();
 for(const o of [...W.items,...W.pushables]){const g=o.g||o.mesh;homes.set(o,{p:g.position.clone(),q:g.quaternion.clone(),y:o.y,h:o.h});}
 W.hubReturn=o=>{const home=homes.get(o);if(!home||o.state==='held'||o.rider||o.grabbed)return false;
  const g=o.g||o.mesh;g.position.copy(home.p);g.quaternion.copy(home.q);g.visible=true;
  if(o.pos){o.owner=null;o.taken=false;o.floatY=undefined;o.state='rest';o.vel.set(0,0,0);o.spin.set(0,0,0);o.floorY=null;o.floorProbe=0;}
  else{o.x=home.p.x;o.z=home.p.z;o.y=home.y;o.vx=o.vy=o.vz=0;o.air=false;o.hubFalling=false;o.tipped=false;o.tipT=0;o.pitch=o.flip=o.shuv=o.lean=0;o.h=home.h;o.heading=g.rotation.y;syncPushable(o);}
  return true;
 };
}
