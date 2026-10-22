import {THREE,G,mesh,col,tmat,lam,compose,frontBack} from '../core/gfx.js';
import {photo} from '../core/textures.js';
const skin=()=>photo('gryzli36-skin',64,64,(g,w,h)=>{g.fillStyle='#d6a58b';g.fillRect(0,0,w,h);for(let i=0;i<450;i++){g.fillStyle=i%3?'#c7937f':'#e3b7a0';g.fillRect(i*23%64,i*47%64,1+i%2,1);}for(const x of [9,49]){g.fillStyle='#c8897a';g.fillRect(x,30,7,9);}g.fillStyle='#e8bea5';g.fillRect(21,5,22,5);});
const vest=()=>photo('gryzli36-vest',32,32,g=>{g.fillStyle='#d2c9a7';g.fillRect(0,0,32,32);for(let i=0;i<100;i++){g.fillStyle=i%2?'#bfb597':'#e2d9b6';g.fillRect(i*17%32,i*13%32,2,1);}g.fillStyle='#99916c';g.fillRect(0,5,6,17);g.fillRect(26,5,6,17);g.fillStyle='#aaa27e';g.fillRect(12,20,9,9);g.fillStyle='#eee4bd';g.fillRect(6,1,2,24);g.fillRect(24,1,2,24);});
let skullGeo,tongueGeo;
export const GRYZLI_SKIN={
 name:'Грызли',rigidBody:true,
 build({root,head,torso,handL,handR,footL,footR}){
  skullGeo??=new THREE.SphereGeometry(1,12,9);tongueGeo??=new THREE.SphereGeometry(1,8,6);
  const flesh=lam({map:skin(),color:0xf1c9b1},'gryzli36-flesh'),cloth=lam({map:vest(),emissive:0x3d382c,emissiveIntensity:.25},'gryzli36-cloth'),pink=col(0xbd6e76),dark=col(0x34232e);
  mesh(skullGeo,flesh,0,1.13,0,.59,.59,.48,head);
  head.add(compose('gryzli36-face',a=>{for(const s of [-1,1]){a(G.sphL,flesh,s*.58,1.12,-.015,.075,.12,.07);a(G.sphL,col(0xb67c70),s*.605,1.12,.035,.025,.064,.025);}a(G.sphL,flesh,0,1.14,.44,.10,.105,.10);a(G.sphL,col(0xc48678),0,1.105,.508,.057,.03,.03);
   a(G.sph10,dark,0,.91,.415,.32,.22,.085);a(G.sph10,pink,0,.91,.446,.30,.205,.058);a(G.sph10,col(0x231d25),0,.93,.469,.268,.17,.04);for(const x of [-.12,-.04,.04,.12])a(G.box,col(0xe8d6b9),x,1.064,.49,.07,.05,.025);
   a(G.box,col(0x5b3c32),-.265,1.43,.344,.23,.045,.035,0,0,-.15);a(G.box,col(0x5b3c32),.25,1.46,.33,.25,.05,.04,0,0,.22);
   for(let i=0;i<4;i++)a(G.box,col(0x815947),-.37+i*.06,1.23+Math.sin(i/3*Math.PI)*.035,.405,.075,.017,.018,0,0,(i-1.5)*.16);
   for(const x of [-.37,.37])a(G.sphL,col(0xe3b7a0),x,1.00,.385,.12,.10,.045);
  }));
  const eye=new THREE.Group();eye.position.set(.245,1.31,.385);head.add(eye);mesh(G.sph10,col(0xf1ebd5),0,0,0,.20,.21,.12,eye);const pupil=mesh(G.sphL,col(0x8b6536),.015,-.012,.115,.09,.105,.035,eye);mesh(G.sphL,col(0x251f27),.018,-.012,.144,.047,.065,.013,eye);mesh(G.box,col(0xfff4da),-.017,.034,.155,.037,.038,.009,eye);
  const tongue=new THREE.Group();tongue.position.set(0,.91,.47);head.add(tongue);mesh(tongueGeo,pink,0,-.11,.075,.13,.19,.065,tongue);mesh(G.box,col(0x99555f),0,-.13,.141,.009,.16,.005,tongue);
  torso.add(compose('gryzli36-body',a=>{a(G.cyl8,cloth,0,.41,0,.29,.47,.24);a(G.sphL,flesh,0,.61,.02,.22,.14,.16);for(const s of [-1,1]){a(G.box,cloth,s*.19,.62,0,.085,.24,.34,0,0,-s*.12);a(G.box,col(0xa79b7a),s*.13,.20,.14,.09,.018,.015);}a(G.cyl8,col(0x777062),0,.18,0,.24,.12,.20);}));
  for(const[h,s]of [[handL,-1],[handR,1]])h.add(compose('gryzli36-hand-'+s,a=>{a(G.sphL,flesh,0,0,0,.105,.10,.085);a(G.sphL,flesh,-s*.08,-.015,.04,.04,.06,.04);for(const x of [-.045,0,.045])a(G.box,col(0xa97466),x,-.04,.078,.008,.025,.009);}));
  for(const f of [footL,footR])f.add(compose('gryzli36-foot',a=>{a(G.sphL,flesh,0,.065,.05,.15,.095,.23);for(const x of [-.08,-.025,.03,.08])a(G.sphL,flesh,x,.06,.23,.035,.04,.05);a(G.box,col(0xa97766),0,.035,.25,.20,.015,.014);}));
  head.userData.gryzli={tongue,eye,pupil,v:0,sway:0};return{top:1.74,handX:.62,handY:.63,handZ:.04,footX:.21,footY:0,holdX:.30,holdY:.86,holdZ:.58,shadow:.52};
 },
 face(c,e){const u=c.head.userData.gryzli;u.eye.scale.y=e==='blink'?.15:e==='dizzy'?.65:1;u.pupil.rotation.z=e==='dizzy'?.3:0;},
 animate(c,dt,s){const u=c.head.userData.gryzli,k=Math.min(1,s.speed||0),want=Math.sin((s.t||0)*9)*k*.12+(s.air?-.15:0);u.v+=((want-u.sway)*40-u.v*7)*Math.min(dt,.05);u.sway=THREE.MathUtils.clamp(u.sway+u.v*Math.min(dt,.05),-.3,.3);u.tongue.rotation.x=u.sway;u.tongue.rotation.z=Math.sin((s.t||0)*6)*k*.05;u.pupil.position.x=.015+THREE.MathUtils.clamp(s.look||0,-1,1)*.025;}
};
