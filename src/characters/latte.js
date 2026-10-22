import {THREE,G,V3,mesh,col,lam,compose} from '../core/gfx.js';
import {photo} from '../core/textures.js';

const N=12;
let cupGeo,lidGeo,liquidGeo,lipsGeo;
const plastic=()=>photo('latte35-plastic',32,32,(g,w,h)=>{g.fillStyle='#c0d3d0';g.fillRect(0,0,w,h);for(let i=0;i<16;i++){g.fillStyle=i%3?'#b5cac7':'#e2e8db';g.fillRect(i*w/16,0,w/60,h);}g.fillStyle='#e7e9dc';g.fillRect(w*.15,0,w*.035,h);});
const coffee=()=>photo('latte35-coffee',32,32,(g,w,h)=>{g.fillStyle='#c79d70';g.fillRect(0,0,w,h);for(let i=0;i<110;i++){g.fillStyle=['#b98a5e','#dec09a','#cba87a','#a6774d'][i%4];g.fillRect(i*19%32,i*13%32,2+i%3,1+i%2);}});
const iceTex=()=>photo('latte35-ice',16,16,(g,w,h)=>{g.fillStyle='#a6c5c1';g.fillRect(0,0,w,h);g.fillStyle='#e8f2e8';g.fillRect(1,1,2,10);g.fillRect(2,1,10,2);g.fillStyle='#c6dfd4';g.fillRect(7,4,3,2);g.fillRect(5,9,6,2);g.fillStyle='#718f92';g.fillRect(13,3,2,11);});
function assets(){
 if(cupGeo)return;
 cupGeo=new THREE.CylinderGeometry(.48,.345,1,12,1,true);lidGeo=new THREE.CylinderGeometry(.49,.50,.055,12);
 const p=[],uv=[],idx=[];for(let row=0;row<3;row++)for(let i=0;i<N;i++){const a=i/N*Math.PI*2,r=[.316,.365,.421][row];p.push(Math.sin(a)*r,[.365,.73,1.11][row],Math.cos(a)*r);uv.push(i/N,row/2);if(row<2){const n=row*N+i,next=row*N+(i+1)%N;idx.push(n,next,n+N,next,next+N,n+N);}}
 const center=p.length/3;p.push(0,1.11,0);uv.push(.5,.5);for(let i=0;i<N;i++)idx.push(center,N*2+i,N*2+(i+1)%N);
 // Дно - закрытая 3D-жидкость, а не плоская наклейка.
 const bottom=p.length/3;p.push(0,.365,0);uv.push(.5,0);for(let i=0;i<N;i++)idx.push(bottom,(i+1)%N,i);
 liquidGeo=new THREE.BufferGeometry();liquidGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));liquidGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));liquidGeo.setIndex(idx);liquidGeo.computeVertexNormals();
 const sh=new THREE.Shape();sh.moveTo(-.115,0);sh.quadraticCurveTo(-.055,.072,0,.026);sh.quadraticCurveTo(.055,.072,.115,0);sh.quadraticCurveTo(.06,-.062,0,-.052);sh.quadraticCurveTo(-.06,-.062,-.115,0);
 lipsGeo=new THREE.ExtrudeGeometry(sh,{depth:.025,bevelEnabled:true,bevelSize:.008,bevelThickness:.005,bevelSegments:1,curveSegments:3});
}
export const LATTE_SKIN={
 name:'Айс Латте',rigidBody:true,
 build({root,head,handL,handR,footL,footR}){
  assets();const shell=lam({map:plastic(),color:0xd4e4d7,transparent:true,opacity:.23,depthWrite:false,side:THREE.FrontSide,flatShading:true},'latte35-shell'),back=lam({map:plastic(),color:0xb5d0c9,transparent:true,opacity:.11,depthWrite:false,side:THREE.BackSide,flatShading:true},'latte35-back'),frost=lam({map:plastic(),color:0xdae8da,transparent:true,opacity:.73,depthWrite:false,flatShading:true},'latte35-frost');
  const glassBack=mesh(cupGeo,back,0,.84,0,1,1,1,head);glassBack.renderOrder=0;glassBack.castShadow=false;
  const geo=liquidGeo.clone(),liquid=mesh(geo,lam({map:coffee(),color:0xf1c99f,flatShading:true},'latte35-liquid'),0,0,0,1,1,1,head);liquid.name='latte-liquid';liquid.renderOrder=1;liquid.frustumCulled=false;
  // Кофе к нижней части темнее, молочный верх светлее.
  const colors=[];for(let i=0;i<geo.attributes.position.count;i++){const y=geo.attributes.position.getY(i),c=new THREE.Color(y<.5?0xc69768:y<.9?0xe8c9a4:0xf5ddba);colors.push(c.r,c.g,c.b);}geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  liquid.material=lam({map:coffee(),vertexColors:true,flatShading:true,transparent:true,opacity:.9,depthWrite:false,emissive:0x876b49,emissiveIntensity:.38},'latte35-layered-liquid');
  const ice=new THREE.InstancedMesh(G.box,lam({map:iceTex(),transparent:true,opacity:.78,depthWrite:false,flatShading:true},'latte35-ice'),6);ice.name='latte-ice';ice.renderOrder=2;ice.frustumCulled=false;head.add(ice);
  const shellMesh=mesh(cupGeo,shell,0,.84,0,1,1,1,head);shellMesh.name='latte-cup';shellMesh.renderOrder=3;shellMesh.castShadow=false;
  const rim=mesh(lidGeo,frost,0,1.365,0,1,1,1,head);rim.renderOrder=4;
  const details=compose('latte35-rims',a=>{a(G.cyl12,frost,0,.35,0,.35,.035,.35);a(G.torus,frost,0,1.398,0,.46,.46,.015,Math.PI/2);a(G.torus,frost,0,.36,0,.32,.32,.012,Math.PI/2);a(G.cyl8,col(0x719b8f),-.15,1.401,-.04,.055,.018,.055);});details.renderOrder=4;head.add(details);
  const straw=new THREE.Group();straw.position.set(-.15,1.40,-.04);head.add(straw);straw.add(compose('latte35-straw',a=>{const m=col(0xc8adbd),dk=col(0x886a86);a(G.cyl8,m,0,.13,0,.036,.26,.036);a(G.cyl8,m,.045,.29,0,.036,.17,.036,0,0,-.55);a(G.cyl8,dk,.088,.366,0,.023,.005,.023,0,0,-.55);for(let i=0;i<3;i++)a(G.cyl8,dk,0,.208+i*.011,0,.038,.003,.038);}));straw.renderOrder=5;
  const eyes=[];for(const s of [-1,1]){const eye=new THREE.Group();eye.position.set(s*.17,1.09,.425);head.add(eye);mesh(G.sphL,col(0xe8e7d8),0,0,0,.103,.118,.036,eye);const pupil=mesh(G.sphL,col(0x332736),0,-.007,.032,.043,.066,.018,eye);mesh(G.box,col(0xf5f0df),-.012,.022,.052,.018,.025,.005,eye);for(const x of [-1,1])mesh(G.box,col(0x443443),x*.064,.105,0,.012,.05,.014,eye).rotation.z=-x*.5;eyes.push({eye,pupil});}
  const lips=mesh(lipsGeo,col(0xbf4f78),0,.82,.424,1,1,1,head);mesh(G.box,col(0x6d304d),0,.819,.463,.16,.009,.006,head);mesh(G.box,col(0xf1a2b7),-.03,.848,.455,.048,.008,.005,head);
  for(const [h,s]of [[handL,-1],[handR,1]]){h.add(compose('latte35-hand-'+s,a=>{a(G.sphL,frost,0,0,0,.09,.10,.075);a(G.sphL,frost,-s*.075,-.01,.04,.035,.055,.035,0,0,-s*.3);a(G.torus,frost,0,.08,0,.055,.055,.012,Math.PI/2);for(const x of [-.038,0,.038])a(G.box,col(0x9cb7ac),x,-.035,.075,.006,.03,.004);}));}
  for(const f of [footL,footR])f.add(compose('latte35-foot',a=>{a(G.sphL,frost,0,.075,.05,.14,.09,.20);a(G.box,frost,0,.025,.05,.23,.035,.32);for(const x of [-.06,0,.06])a(G.box,col(0xadc4b7),x,.09,.22,.008,.035,.006);}));
  const cubes=Array.from({length:6},(_,i)=>({x:Math.sin(i*2.4)*(.19+i%2*.08),z:Math.cos(i*2.4)*(.19+i%2*.08),vx:0,vz:0,a:i*1.7,spin:0}));
  head.userData.latte={liquid,ice,eyes,lips,straw,cubes,sx:0,sz:0,vx:0,vz:0,jolt:0,jv:0,t:0,last:new V3(),vel:new V3(),started:false,matrix:new THREE.Matrix4(),q:new THREE.Quaternion(),e:new THREE.Euler(),p:new V3(),scale:new V3(.14,.13,.14),acc:new V3(),current:new V3(),gravity:new V3()};
  root.addEventListener('removed',()=>{geo.dispose();ice.dispose();});return{top:1.79,handX:.61,handY:.69,handZ:.03,footX:.20,footY:0,holdX:.29,holdY:.91,holdZ:.57,shadow:.49};
 },
 face(c,e){const u=c.head.userData.latte;for(const q of u.eyes){q.eye.scale.y=e==='blink'?.11:e==='dizzy'?.55:1;q.pupil.rotation.z=e==='dizzy'?.4:0;}u.lips.scale.y=e==='wow'?1.35:1;},
 animate(c,dt,s){
  const u=c.head.userData.latte;dt=Math.min(.05,Math.max(0,dt));if(!dt)return;u.t+=dt;c.root.getWorldPosition(u.current);
  if(!u.started||u.current.distanceToSquared(u.last)>16){u.last.copy(u.current);u.vel.set(0,0,0);u.started=true;u.vx=u.vz=0;}
  u.acc.copy(u.current).sub(u.last).multiplyScalar(1/dt);const vx=u.acc.x,vy=u.acc.y,vz=u.acc.z;u.acc.sub(u.vel).multiplyScalar(1/dt);u.vel.set(vx,vy,vz);u.last.copy(u.current);
  c.head.getWorldQuaternion(u.q);u.q.invert();u.acc.applyQuaternion(u.q).clampLength(0,18);u.gravity.set(0,-1,0).applyQuaternion(u.q);
  const tx=THREE.MathUtils.clamp(-u.acc.x*.007+u.gravity.x*.22,-.16,.16),tz=THREE.MathUtils.clamp(-u.acc.z*.007+u.gravity.z*.22,-.16,.16);
  u.vx+=((tx-u.sx)*42-u.vx*5.3)*dt;u.vz+=((tz-u.sz)*42-u.vz*5.3)*dt;u.sx=THREE.MathUtils.clamp(u.sx+u.vx*dt,-.19,.19);u.sz=THREE.MathUtils.clamp(u.sz+u.vz*dt,-.19,.19);
  if(s.landed)u.jv+=.7;u.jv+=(-u.jolt*45-u.jv*5)*dt;u.jolt=THREE.MathUtils.clamp(u.jolt+u.jv*dt,-.04,.04);
  const surface=(x,z)=>THREE.MathUtils.clamp(1.11+u.sx*x/.421+u.sz*z/.421+Math.sin(u.t*5+x*8+z*6)*(.008+Math.abs(u.jolt))*.5,.92,1.285);
  const p=u.liquid.geometry.attributes.position;for(let i=0;i<N;i++)p.setY(N*2+i,surface(p.getX(N*2+i),p.getZ(N*2+i)));p.setY(N*3,surface(0,0));p.needsUpdate=true;u.liquid.geometry.computeVertexNormals();
  for(let i=0;i<u.cubes.length;i++){const q=u.cubes[i];q.vx+=(-u.acc.x*.035+u.sx*1.4-q.vx*2.8-q.x*.8)*dt;q.vz+=(-u.acc.z*.035+u.sz*1.4-q.vz*2.8-q.z*.8)*dt;q.x+=q.vx*dt;q.z+=q.vz*dt;for(let j=0;j<i;j++){const other=u.cubes[j],dx=q.x-other.x,dz=q.z-other.z,d=Math.hypot(dx,dz);if(d<.145&&d>.001){const k=(.145-d)*.5/d;q.x+=dx*k;q.z+=dz*k;other.x-=dx*k;other.z-=dz*k;q.vx+=dx*.15;q.vz+=dz*.15;}}const r=Math.hypot(q.x,q.z);if(r>.29){q.x*=.29/r;q.z*=.29/r;q.vx*=-.35;q.vz*=-.35;}q.a+=dt*(.1+q.vx*2);q.spin+=(u.vx-u.vz)*dt*.6;
   u.p.set(q.x,THREE.MathUtils.clamp(surface(q.x,q.z)+.025+Math.sin(u.t*3+i)*.014,.85,1.28),q.z);u.e.set(u.sz+Math.sin(u.t*2+i)*.08,q.a,u.sx+q.spin);u.q.setFromEuler(u.e);u.matrix.compose(u.p,u.q,u.scale);u.ice.setMatrixAt(i,u.matrix);
  }for(let i=0;i<u.cubes.length;i++){const q=u.cubes[i],r=Math.hypot(q.x,q.z);if(r>.29){q.x*=.29/r;q.z*=.29/r;}u.ice.getMatrixAt(i,u.matrix);u.matrix.setPosition(q.x,THREE.MathUtils.clamp(surface(q.x,q.z)+.025+Math.sin(u.t*3+i)*.014,.85,1.28),q.z);u.ice.setMatrixAt(i,u.matrix);}u.ice.instanceMatrix.needsUpdate=true;for(const q of u.eyes)q.pupil.position.x=THREE.MathUtils.clamp((s.look||0)*.026,-.026,.026);u.straw.rotation.z=Math.sin(u.t*2)*.012+u.sx*.12;
 }
};
