import {V3} from '../core/gfx.js';
import {isFree} from '../world/physics.js';
import {W} from '../world/state.js';
// Короткий маршрут к передней стороне дивана по тем же коллизиям мира.
export function seatPath(from,to,r=.36,h=2){
 const free=(x,z)=>isFree(x-r,z-r,x+r,z+r,.12,h)&&W.pushables.every(b=>Math.hypot(x-b.x,z-b.z)>r+b.r+.05);
 const clear=(a,b)=>{const n=Math.ceil(a.distanceTo(b)/.12);for(let i=1;i<=n;i++){const k=i/n;if(!free(a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k))return false;}return true;};
 if(clear(from,to))return[from.clone(),to.clone()];
 const step=.4,x0=Math.min(from.x,to.x)-4,z0=Math.min(from.z,to.z)-4,nx=Math.ceil((Math.abs(from.x-to.x)+8)/step),nz=Math.ceil((Math.abs(from.z-to.z)+8)/step);
 const cell=p=>[Math.round((p.x-x0)/step),Math.round((p.z-z0)/step)],key=(x,z)=>x+z*nx,point=(x,z)=>new V3(x0+x*step,0,z0+z*step),[sx,sz]=cell(from),[tx,tz]=cell(to);
 const open=[{x:sx,z:sz,g:0,f:0}],seen=new Map([[key(sx,sz),{g:0,parent:null}]]);let end=null;
 while(open.length){open.sort((a,b)=>a.f-b.f);const a=open.shift(),id=key(a.x,a.z);if(a.x===tx&&a.z===tz){end=id;break;}
  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=a.x+dx,z=a.z+dz,k=key(x,z),p=point(x,z),g=a.g+1;if(x<0||z<0||x>=nx||z>=nz||seen.get(k)?.g<=g||!free(p.x,p.z))continue;seen.set(k,{g,parent:id,x,z});open.push({x,z,g,f:g+Math.abs(tx-x)+Math.abs(tz-z)});}}
 if(end===null)return null;
 const path=[to.clone()];for(let k=end;seen.get(k)?.parent!=null;){const a=seen.get(k);path.unshift(point(a.x,a.z));k=a.parent;}path.unshift(from.clone());
 const result=[path[0]];for(let i=0;i<path.length-1;){let j=path.length-1;while(j>i+1&&!clear(path[i],path[j]))j--;result.push(path[j]);i=j;}return result;
}
export function pathLength(path){let n=0;for(let i=1;i<path.length;i++)n+=path[i].distanceTo(path[i-1]);return n;}
export function samplePath(path,d,out){for(let i=1;i<path.length;i++){const n=path[i].distanceTo(path[i-1]);if(d<=n)return out.lerpVectors(path[i-1],path[i],n?d/n:1);d-=n;}return out.copy(path.at(-1));}
