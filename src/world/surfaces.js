import {THREE,V3} from '../core/gfx.js';
import {W} from './state.js';
import {addItem,restOnSurface} from '../game/items.js';
// Опора задаётся один раз вместе с мебелью. Предметы после выкладки остаются физическими.
export function surface(x,y,z,w,d,yaw=0,kind='table',owner=null){
 const s={x,y,z,w,d,yaw,kind,owner,baseY:owner?.y||0};
 s.pose=()=>owner?{x:owner.x,y:s.y+owner.y-s.baseY,z:owner.z,yaw:owner.mesh.rotation.y}:{x:s.x,y:s.y,z:s.z,yaw:s.yaw};
 s.put=(type,u=0,v=0,ry=0)=>{const p=s.pose(),it=restOnSurface(addItem(type,p.x,p.y,p.z,p.yaw+ry)),foot=it.placementFootprint,c=Math.cos(ry),sn=Math.sin(ry),rx=Math.abs(c)*foot.x+Math.abs(sn)*foot.z,rz=Math.abs(sn)*foot.x+Math.abs(c)*foot.z;
  u=THREE.MathUtils.clamp(u,-Math.max(0,w/2-rx-.015),Math.max(0,w/2-rx-.015));v=THREE.MathUtils.clamp(v,-Math.max(0,d/2-rz-.015),Math.max(0,d/2-rz-.015));const co=Math.cos(p.yaw),si=Math.sin(p.yaw);
  it.pos.x=p.x+u*co+v*si;it.pos.z=p.z-u*si+v*co;Object.assign(it.home,{x:it.pos.x,y:p.y,z:it.pos.z});it.surfaceHome={x:it.pos.x,y:p.y,z:it.pos.z,kind};(W.dressings??=[]).push({kind:'surface-item',item:it,surface:s});return it;};
 (W.surfaces??=[]).push(s);return s;
}
export function supportAt(x,y,z,tolerance=.32){let best=null,score=Infinity;for(const s of W.surfaces||[]){const p=s.pose(),dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw),sn=Math.sin(p.yaw),u=dx*c-dz*sn,v=dx*sn+dz*c,dy=Math.abs(y-p.y);if(dy>tolerance||Math.abs(u)>s.w/2||Math.abs(v)>s.d/2)continue;const k=dy+Math.hypot(u,v)*.015;if(k<score){score=k;best={surface:s,u,v,yaw:p.yaw};}}return best;}
