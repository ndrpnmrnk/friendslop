import {CONFIG} from '../config.js';
import {THREE,G,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from './state.js';
import {addSolid} from './physics.js';

// Тонкая упругая крыша. Под ней свободный проход, верх держит персонажа.
export function addCanopy(b,x,z,{w=2.9,d=w,edge=3.25,rise=.55,round=true,yaw=0,colors=['#ff8a1f','#2a1f3d']}={}){
 const tune=CONFIG.canopy;const g=b.prop(x,z,yaw),cloth=new THREE.Group();g.add(cloth);cloth.position.y=edge;
 const verts=[],uv=[],idx=[],segments=round?12:8;
 if(round){verts.push(0,rise,0);uv.push(.5,.5);for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;verts.push(Math.sin(a)*w/2,0,Math.cos(a)*d/2);uv.push(.5+Math.sin(a)*.5,.5+Math.cos(a)*.5);}for(let i=0;i<segments;i++)idx.push(0,i+1,(i+1)%segments+1);}
 else{for(const [px,py,pz]of[[-w/2,0,-d/2],[w/2,0,-d/2],[-w/2,rise,0],[w/2,rise,0],[-w/2,0,d/2],[w/2,0,d/2]]){verts.push(px,py,pz);uv.push(px/w+.5,pz/d+.5);}idx.push(0,2,1,1,2,3,2,4,3,3,4,5);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();W.mapResources.add(geo);mesh(geo,tmat(T.awning(...colors),{side:THREE.DoubleSide}),0,0,0,1,1,1,cloth);
 const dark=col(0x493b44),seams=tmat(T.cloth(0xa89a85));
 cloth.add(compose('canopy45-trim-'+[w,d,rise,round].join('-'),a=>{
  if(round){for(let i=0;i<segments;i++){const angle=i/segments*Math.PI*2,px=Math.sin(angle)*w/2,pz=Math.cos(angle)*d/2,v=new THREE.Vector3(px,-rise,pz),length=v.length(),rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));a(G.cyl5,dark,px/2,rise/2-.035,pz/2,.012,length,.012,rotation.x,rotation.y,rotation.z);a(G.box,seams,px,-.07,pz,w/segments*.95,.14,.035,0,angle);}}
  else{for(const side of[-1,1])a(G.box,seams,0,-.07,side*d/2,w,.14,.04);a(G.box,dark,0,rise-.04,0,w,.035,.035);}
 }));
 const q={g,cloth,x:b.X(x),z:b.Z(z),base:b.Y+edge,cells:[],dy:0,vy:0,rx:0,rz:0,vx:0,vz:0,hit:new WeakMap(),kick(k=1,dx=0,dz=0){this.vy-=Math.min(1,k)*.85;this.vx+=dz*.035;this.vz-=dx*.035;}};
 const nx=round?5:6,nz=round?5:4,cw=w/nx,cd=d/nz,co=Math.cos(yaw),si=Math.sin(yaw);
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const px=(i+.5)*cw-w/2,pz=(j+.5)*cd-d/2,r=Math.hypot(px/(w/2),pz/(d/2));if(round&&r>.94)continue;const wx=x+px*co+pz*si,wz=z-px*si+pz*co,hw=(Math.abs(cw*co)+Math.abs(cd*si))*.5,hd=(Math.abs(cw*si)+Math.abs(cd*co))*.5,y=edge+rise*(round?Math.max(0,1-r):1-Math.abs(pz)/(d/2)),s=addSolid(b.X(wx-hw),b.Z(wz-hd),b.X(wx+hw),b.Z(wz+hd),b.Y+y-.06,b.Y+y,'canopy');s.roof=true;q.cells.push({s,y:b.Y+y,px,pz});const bo={x0:s.x0,x1:s.x1,z0:s.z0,z1:s.z1,y:s.y1,power:tune.bounce,kick:()=>q.kick(1,px,pz)};W.bouncers.push(bo);q.cells.at(-1).bo=bo;}
 W.keep.push(g);(W.canopies??=[]).push(q);
 W.animated.push(dt=>{dt=Math.min(dt,.05);q.vy+=(-q.dy*tune.spring-q.vy*tune.damping)*dt;q.dy=Math.max(-tune.compression,Math.min(.09,q.dy+q.vy*dt));q.vx+=(-q.rx*42-q.vx*7)*dt;q.vz+=(-q.rz*42-q.vz*7)*dt;q.rx=Math.max(-.045,Math.min(.045,q.rx+q.vx*dt));q.rz=Math.max(-.045,Math.min(.045,q.rz+q.vz*dt));cloth.position.y=edge+q.dy;cloth.rotation.set(q.rx,0,q.rz);for(const c of q.cells){const tilt=q.rz*c.px-q.rx*c.pz;c.s.y0=c.y+q.dy+tilt-.06;c.s.y1=c.bo.y=c.y+q.dy+tilt;}
  for(const a of [W.player,...(W.bots||[])]){if(!a||a.drone||a.hidden)continue;const wx=a.pos.x-q.x,wz=a.pos.z-q.z,dx=wx*co-wz*si,dz=wx*si+wz*co,near=round?Math.hypot(dx/(w/2+.2),dz/(d/2+.2))<1:Math.abs(dx)<w/2+.2&&Math.abs(dz)<d/2+.2;if(!near)continue;const speed=Math.hypot(a.vel.x,a.vel.z),top=a.pos.y+a.h;if(speed>.6&&top>q.base-.28&&a.pos.y<q.base+rise+.3){const now=(q.hit.get(a)||0)-dt;q.hit.set(a,now);if(now<=0){q.kick(.25,dx,dz);q.hit.set(a,.35);}}}
 });return q;
}
