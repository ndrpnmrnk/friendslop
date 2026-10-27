import {THREE,G,V3,mesh,col,lam,compose} from '../core/gfx.js';
import {photo} from '../core/textures.js';
import {ConvexGeometry} from 'three/examples/jsm/geometries/ConvexGeometry.js';

const N=12;
let cupGeo,lidGeo,baseGeo,lipRing,baseRing,liquidGeo,lipsGeo,iceGeo;
const plastic=()=>photo('latte351-plastic',32,32,(g,w,h)=>{g.fillStyle='#d9e0d4';g.fillRect(0,0,w,h);for(let i=0;i<16;i++){g.fillStyle=i%3?'#ccd8cf':'#e9ecdf';g.fillRect(i*w/16,0,w/60,h);}g.fillStyle='#f0eddf';g.fillRect(w*.15,0,w*.035,h);});
const coffee=()=>photo('latte35-coffee',32,32,(g,w,h)=>{g.fillStyle='#c79d70';g.fillRect(0,0,w,h);for(let i=0;i<110;i++){g.fillStyle=['#b98a5e','#dec09a','#cba87a','#a6774d'][i%4];g.fillRect(i*19%32,i*13%32,2+i%3,1+i%2);}});
const iceTex=()=>photo('latte351-ice',16,16,(g,w,h)=>{g.fillStyle='#bcd9d7';g.fillRect(0,0,w,h);g.fillStyle='#eaf4ec';g.fillRect(1,1,2,10);g.fillRect(2,1,10,2);g.fillStyle='#d3e7e1';g.fillRect(7,4,3,2);g.fillRect(5,9,6,2);g.fillStyle='#86afb7';g.fillRect(13,3,2,11);g.fillRect(10,7,2,4);});
const radiusAt=y=>.345+THREE.MathUtils.clamp(y-.34,0,1)*.135;
const surface=(u,x,z)=>THREE.MathUtils.clamp(1.17+u.sx*x/.43+u.sz*z/.43+u.jolt+Math.sin(u.t*5+x*8+z*6)*(.003+Math.abs(u.jolt)*.15),1.035,1.285);
function containIce(q){
 // Сфера вокруг скошенного кубика удерживает все его углы внутри стакана при повороте.
 const bound=q.size*.73;q.y=THREE.MathUtils.clamp(q.y,.37+bound,1.326-bound);
 const limit=radiusAt(q.y-bound)-bound-.016,r=Math.hypot(q.x,q.z);
 if(r>limit){const nx=q.x/r,nz=q.z/r,out=q.vx*nx+q.vz*nz;q.x=nx*limit;q.z=nz*limit;if(out>0){q.vx-=nx*out*1.25;q.vz-=nz*out*1.25;}}
}
function assets(){
 if(cupGeo)return;
 cupGeo=new THREE.CylinderGeometry(.48,.345,1,12,1,true);
 const profile=points=>new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),N);
 // Тонкий формованный пластик вместо двух плотных дисков сверху и снизу.
 lidGeo=profile([[.462,-.023],[.491,-.023],[.491,.006],[.475,.018],[.449,.018],[.433,.034],[0,.034],[0,.023],[.428,.023],[.443,.006],[.462,.006],[.462,-.023]]);
 baseGeo=profile([[.339,.356],[.346,.339],[.346,.323],[.314,.315],[0,.323],[0,.334],[.311,.334],[.329,.347],[.339,.356]]);
 lipRing=new THREE.TorusGeometry(.483,.006,3,12);baseRing=new THREE.TorusGeometry(.341,.004,3,12);
 const points=[];for(let axis=0;axis<3;axis++)for(const side of [-1,1])for(const a of [-1,1])for(const b of [-1,1]){const p=new V3();p.setComponent(axis,side*.5);p.setComponent((axis+1)%3,a*.36);p.setComponent((axis+2)%3,b*.36);points.push(p);}
 iceGeo=new ConvexGeometry(points);const ip=iceGeo.attributes.position,normal=iceGeo.attributes.normal,iu=[],ic=[];
 for(let i=0;i<ip.count;i++){const ny=normal.getY(i),nx=Math.abs(normal.getX(i)),nz=Math.abs(normal.getZ(i)),c=new THREE.Color(ny>.8?0xf1faf1:ny<-.8?0x83adb7:nx>.8||nz>.8?0xb3d2d5:0xd9ece4);ic.push(c.r,c.g,c.b);iu.push((nx>nz?ip.getZ(i):ip.getX(i))+.5,ip.getY(i)+.5);}
 iceGeo.setAttribute('uv',new THREE.Float32BufferAttribute(iu,2));iceGeo.setAttribute('color',new THREE.Float32BufferAttribute(ic,3));
 const p=[],uv=[],idx=[];for(let row=0;row<3;row++)for(let i=0;i<N;i++){const a=i/N*Math.PI*2,r=[.316,.365,.438][row];p.push(Math.sin(a)*r,[.365,.73,1.17][row],Math.cos(a)*r);uv.push(i/N,row/2);if(row<2){const n=row*N+i,next=row*N+(i+1)%N;idx.push(n,next,n+N,next,next+N,n+N);}}
 const center=p.length/3;p.push(0,1.17,0);uv.push(.5,.5);for(let i=0;i<N;i++)idx.push(center,N*2+i,N*2+(i+1)%N);
 // Дно - закрытая 3D-жидкость, а не плоская наклейка.
 const bottom=p.length/3;p.push(0,.365,0);uv.push(.5,0);for(let i=0;i<N;i++)idx.push(bottom,(i+1)%N,i);
 liquidGeo=new THREE.BufferGeometry();liquidGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));liquidGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));liquidGeo.setIndex(idx);liquidGeo.computeVertexNormals();
 const sh=new THREE.Shape();sh.moveTo(-.115,0);sh.quadraticCurveTo(-.055,.072,0,.026);sh.quadraticCurveTo(.055,.072,.115,0);sh.quadraticCurveTo(.06,-.062,0,-.052);sh.quadraticCurveTo(-.06,-.062,-.115,0);
 lipsGeo=new THREE.ExtrudeGeometry(sh,{depth:.025,bevelEnabled:true,bevelSize:.008,bevelThickness:.005,bevelSegments:1,curveSegments:3});
}
export const LATTE_SKIN={
 name:'Айс Латте',rigidBody:true,
 build({root,head,handL,handR,footL,footR}){
  assets();const shell=lam({map:plastic(),color:0xe1e5d8,emissive:0x7c8771,emissiveIntensity:.22,transparent:true,opacity:.44,depthWrite:false,side:THREE.FrontSide,flatShading:true},'latte351-shell'),back=lam({map:plastic(),color:0xd1ddd1,transparent:true,opacity:.16,depthWrite:false,side:THREE.BackSide,flatShading:true},'latte351-back'),frost=lam({map:plastic(),color:0xdae8da,transparent:true,opacity:.60,depthWrite:false,flatShading:true},'latte351-frost');shell.userData.mc='glass';
  const glassBack=mesh(cupGeo,back,0,.84,0,1,1,1,head);glassBack.renderOrder=0;glassBack.castShadow=false;
  const geo=liquidGeo.clone(),liquid=mesh(geo,lam({map:coffee(),vertexColors:true,flatShading:true,transparent:true,opacity:.68,depthWrite:false,emissive:0x876b49,emissiveIntensity:.30},'latte351-layered-liquid'),0,0,0,1,1,1,head);liquid.name='latte-liquid';liquid.renderOrder=1;liquid.frustumCulled=false;
  // Кофе к нижней части темнее, молочный верх светлее.
  const colors=[];for(let i=0;i<geo.attributes.position.count;i++){const y=geo.attributes.position.getY(i),c=new THREE.Color(y<.5?0xc69768:y<.9?0xe8c9a4:0xf5ddba);colors.push(c.r,c.g,c.b);}geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const ice=new THREE.InstancedMesh(iceGeo,lam({map:iceTex(),vertexColors:true,emissive:0x526f73,emissiveIntensity:.22,transparent:true,opacity:.9,depthWrite:true,flatShading:true},'latte351-ice'),6);ice.name='latte-ice';ice.renderOrder=2;ice.frustumCulled=false;ice.instanceMatrix.setUsage(THREE.DynamicDrawUsage);head.add(ice);{const z=new THREE.Matrix4().makeScale(0,0,0);for(let i=0;i<6;i++)ice.setMatrixAt(i,z);}
  const shellMesh=mesh(cupGeo,shell,0,.84,0,1,1,1,head);shellMesh.name='latte-cup';shellMesh.renderOrder=3;shellMesh.castShadow=false;
  const rim=mesh(lidGeo,shell,0,1.36,0,1,1,1,head);rim.name='latte-lid';rim.renderOrder=4;
  const base=mesh(baseGeo,shell,0,0,0,1,1,1,head);base.name='latte-base';base.renderOrder=4;
  const details=compose('latte351-rims',a=>{a(lipRing,shell,0,1.375,0,1,1,1,Math.PI/2);a(baseRing,shell,0,.335,0,1,1,1,Math.PI/2);a(G.cyl8,frost,-.15,1.40,-.04,.049,.012,.049);});details.renderOrder=4;head.add(details);
  const straw=new THREE.Group();straw.position.set(-.15,1.40,-.04);head.add(straw);straw.userData.outfitSlot='hat';straw.add(compose('latte35-straw',a=>{const m=col(0xc8adbd),dk=col(0x886a86);a(G.cyl8,m,0,.13,0,.036,.26,.036);a(G.cyl8,m,.045,.29,0,.036,.17,.036,0,0,-.55);a(G.cyl8,dk,.088,.366,0,.023,.005,.023,0,0,-.55);for(let i=0;i<3;i++)a(G.cyl8,dk,0,.208+i*.011,0,.038,.003,.038);}));straw.renderOrder=5;
  const eyes=[];for(const s of [-1,1]){const eye=new THREE.Group();eye.position.set(s*.17,1.09,.425);head.add(eye);mesh(G.sphL,col(0xe8e7d8),0,0,0,.103,.118,.036,eye);const pupil=mesh(G.sphL,col(0x332736),0,-.007,.032,.043,.066,.018,eye);mesh(G.box,col(0xf5f0df),-.012,.022,.052,.018,.025,.005,eye);for(const x of [-1,1])mesh(G.box,col(0x443443),x*.064,.105,0,.012,.05,.014,eye).rotation.z=-x*.5;eyes.push({eye,pupil});}
  const lips=mesh(lipsGeo,col(0xbf4f78),0,.82,.424,1,1,1,head);mesh(G.box,col(0x6d304d),0,.819,.463,.16,.009,.006,head);mesh(G.box,col(0xf1a2b7),-.03,.848,.455,.048,.008,.005,head);
  for(const [h,s]of [[handL,-1],[handR,1]]){h.add(compose('latte35-hand-'+s,a=>{a(G.sphL,frost,0,0,0,.09,.10,.075);a(G.sphL,frost,-s*.075,-.01,.04,.035,.055,.035,0,0,-s*.3);a(G.torus,frost,0,.08,0,.055,.055,.012,Math.PI/2);for(const x of [-.038,0,.038])a(G.box,col(0x9cb7ac),x,-.035,.075,.006,.03,.004);}));}
  for(const f of [footL,footR])f.add(compose('latte35-foot',a=>{a(G.sphL,frost,0,.075,.05,.14,.09,.20);a(G.box,frost,0,.025,.05,.23,.035,.32);for(const x of [-.06,0,.06])a(G.box,col(0xadc4b7),x,.09,.22,.008,.035,.006);}));
  const cubes=Array.from({length:6},(_,i)=>({x:Math.sin(i*2.4)*.21,y:1.10-i%3*.07,z:Math.cos(i*2.4)*.21,vx:0,vy:0,vz:0,a:i*1.7,spin:0,size:.18+i%3*.015,depth:i%3*.065}));
  head.userData.latte={liquid,ice,eyes,lips,straw,cubes,sx:0,sz:0,vx:0,vz:0,jolt:0,jv:0,t:0,lastYaw:root.rotation.y,last:new V3(),vel:new V3(),started:false,matrix:new THREE.Matrix4(),q:new THREE.Quaternion(),e:new THREE.Euler(),p:new V3(),scale:new V3(),acc:new V3(),current:new V3(),gravity:new V3()};
  root.addEventListener('removed',()=>{geo.dispose();ice.dispose();});return{top:1.79,handX:.61,handY:.69,handZ:.03,footX:.20,footY:0,holdX:.29,holdY:.91,holdZ:.57,shadow:.49};
 },
 face(c,e){const u=c.head.userData.latte;for(const q of u.eyes){q.eye.scale.y=e==='blink'?.11:e==='dizzy'?.55:1;q.pupil.rotation.z=e==='dizzy'?.4:0;}u.lips.scale.y=e==='wow'?1.35:1;},
 animate(c,dt,s){
  const u=c.head.userData.latte;dt=Math.min(.05,Math.max(0,dt));if(!dt)return;u.t+=dt;c.head.localToWorld(u.current.set(0,.84,0));
  if(!u.started||u.current.distanceToSquared(u.last)>16){u.last.copy(u.current);u.vel.set(0,0,0);u.started=true;u.vx=u.vz=u.sx=u.sz=u.jolt=u.jv=0;u.lastYaw=c.root.rotation.y;for(const q of u.cubes)q.vx=q.vy=q.vz=0;}
  u.acc.copy(u.current).sub(u.last).multiplyScalar(1/dt);const vx=u.acc.x,vy=u.acc.y,vz=u.acc.z;u.acc.sub(u.vel).multiplyScalar(1/dt);u.vel.set(vx,vy,vz);u.last.copy(u.current);
  c.head.getWorldQuaternion(u.q);u.q.invert();u.acc.applyQuaternion(u.q).clampLength(0,18);u.gravity.set(0,-1,0).applyQuaternion(u.q);
  const tx=THREE.MathUtils.clamp(-u.acc.x*.007+u.gravity.x*.22,-.11,.11),tz=THREE.MathUtils.clamp(-u.acc.z*.007+u.gravity.z*.22,-.11,.11),yaw=c.root.rotation.y,turn=THREE.MathUtils.clamp(Math.atan2(Math.sin(yaw-u.lastYaw),Math.cos(yaw-u.lastYaw))/dt,-8,8);u.lastYaw=yaw;
  const steps=Math.ceil(dt/(1/60)),h=dt/steps;if(s.landed)u.jv+=.45;
  for(let step=0;step<steps;step++){
   u.vx+=((tx-u.sx)*42-u.vx*5.8)*h;u.vz+=((tz-u.sz)*42-u.vz*5.8)*h;u.sx=THREE.MathUtils.clamp(u.sx+u.vx*h,-.13,.13);u.sz=THREE.MathUtils.clamp(u.sz+u.vz*h,-.13,.13);
   u.jv+=(-u.jolt*48-u.jv*6-u.acc.y*.025)*h;u.jolt=THREE.MathUtils.clamp(u.jolt+u.jv*h,-.035,.035);
   for(const q of u.cubes){
    q.vx+=(-u.acc.x*.07+u.gravity.x*.8+u.sx*1.5-q.vx*3.1-q.x*.9-turn*q.z*.9)*h;
    q.vz+=(-u.acc.z*.07+u.gravity.z*.8+u.sz*1.5-q.vz*3.1-q.z*.9+turn*q.x*.9)*h;
    const level=surface(u,q.x,q.z)-.065-q.depth;
    q.vy+=((level-q.y)*36-q.vy*5.2-u.acc.y*.07)*h;q.x+=q.vx*h;q.y+=q.vy*h;q.z+=q.vz*h;
    q.a+=(-turn*.22+(q.vx-q.vz)*1.6)*h;q.spin=THREE.MathUtils.clamp(q.spin+(u.vx-u.vz+q.vy*.7-q.spin*2.4)*h,-.45,.45);
   }
   // Трёхмерные контакты: лёд может всплывать и расходиться по высоте, а не ездить по плоскости.
   for(let pass=0;pass<2;pass++)for(let i=0;i<u.cubes.length;i++){const q=u.cubes[i];for(let j=0;j<i;j++){const b=u.cubes[j],dx=q.x-b.x,dy=q.y-b.y,dz=q.z-b.z,d=Math.hypot(dx,dy,dz),gap=(q.size+b.size)*.45;if(d<gap&&d>.0001){const k=(gap-d)*.5/d;q.x+=dx*k;q.y+=dy*k;q.z+=dz*k;b.x-=dx*k;b.y-=dy*k;b.z-=dz*k;}}containIce(q);}
   for(const q of u.cubes)containIce(q);
  }
  const p=u.liquid.geometry.attributes.position;for(let i=0;i<N;i++){const a=i/N*Math.PI*2,x=Math.sin(a),z=Math.cos(a),y=surface(u,x*.43,z*.43),r=radiusAt(y)-.018;p.setXYZ(N*2+i,x*r,y,z*r);}p.setY(N*3,surface(u,0,0));p.needsUpdate=true;u.liquid.geometry.computeVertexNormals();
  for(let i=0;i<u.cubes.length;i++){const q=u.cubes[i];u.p.set(q.x,q.y,q.z);u.e.set(u.sz*1.3+q.spin,q.a,u.sx*1.3-q.spin*.7);u.q.setFromEuler(u.e);u.scale.setScalar(q.size);u.matrix.compose(u.p,u.q,u.scale);u.ice.setMatrixAt(i,u.matrix);}u.ice.instanceMatrix.needsUpdate=true;
  for(const q of u.eyes)q.pupil.position.x=THREE.MathUtils.clamp((s.look||0)*.026,-.026,.026);u.straw.rotation.z=Math.sin(u.t*2)*.012+u.sx*.12;
 }
};
