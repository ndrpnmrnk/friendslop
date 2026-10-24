import {V3} from '../core/gfx.js';
import {CONFIG} from '../config.js';
import {W} from '../world/state.js';
import {solidsNear,obbLocal} from '../world/physics.js';
const cache=new WeakMap();
export function busClear(x,z,yaw,ignore=null){
 for(const zz of[-3.65,-1.8,0,1.8,3.65])for(const xx of[-1.04,1.04]){const px=x+Math.cos(yaw)*xx+Math.sin(yaw)*zz,pz=z-Math.sin(yaw)*xx+Math.cos(yaw)*zz;
  if(Math.abs(px)>W.bounds-.2||Math.abs(pz)>W.bounds-.2)return false;
  for(const q of solidsNear(px-.16,pz-.16,px+.16,pz+.16))if(q.on&&q.y1>.4&&q.y0<3.1&&px+.16>q.x0&&px-.16<q.x1&&pz+.16>q.z0&&pz-.16<q.z1)return false;
  for(const q of W.obbs)if(q!==ignore&&q.on&&q.y1>.4&&q.y0<3.1&&!q.busStep){const l=obbLocal(q,px,pz);if(l.x+.15>q.lx0&&l.x-.15<q.lx1&&l.z+.15>q.lz0&&l.z-.15<q.lz1)return false;}
 }return true;
}
export function busPlaces(){if(cache.has(W.group))return cache.get(W.group);
 const half=(CONFIG.grid*CONFIG.chunk+(CONFIG.grid+1)*CONFIG.road)/2,L=half-CONFIG.road/2,R=4.8,path=[new V3(-L+12,0,-L)],stopIndices=[];
 function line(x,z){const a=path.at(-1).clone(),n=Math.ceil(Math.hypot(x-a.x,z-a.z)/5);for(let i=1;i<=n;i++)path.push(a.clone().lerp(new V3(x,0,z),i/n));}
 function corner(cx,cz,a0){for(let i=1;i<=14;i++){const a=a0+i/14*Math.PI/2;path.push(new V3(cx+Math.cos(a)*R,0,cz+Math.sin(a)*R));}}
 line(0,-L);stopIndices.push(path.length-1);line(L-R,-L);corner(L-R,-L+R,-Math.PI/2);line(L,0);stopIndices.push(path.length-1);line(L,L-R);corner(L-R,L-R,0);line(0,L);stopIndices.push(path.length-1);
 const out=[];for(const flip of[-1,1])for(let rot=0;rot<4;rot++){const a=rot*Math.PI/2,c=Math.cos(a),s=Math.sin(a),points=path.map(p=>new V3(p.x*flip*c+p.z*s,0,-p.x*flip*s+p.z*c)),yaws=points.map((p,i)=>{const q=points[Math.min(i+1,points.length-1)],prev=i===points.length-1?points[i-1]:p;return Math.atan2(q.x-prev.x,q.z-prev.z);});
  if(!points.every((p,i)=>busClear(p.x,p.z,yaws[i])))continue;
  out.push({x:points[0].x,y:0,z:points[0].z,yaw:yaws[0],path:points,yaws,stopIndices:stopIndices.slice(),stops:stopIndices.map(i=>points[i].clone()),stopYaws:stopIndices.map(i=>yaws[i])});
 }cache.set(W.group,out);return out;
}
