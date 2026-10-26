import {THREE,G,mesh,col,lam,compose,V3} from '../core/gfx.js';
import {pix} from '../core/textures.js';
import {gryzliHead,gryzliTongue,flexTongue} from './gryzli-geometry.js';
const skin=()=>pix('gryzli37-skin',64,64,g=>{g.fillStyle='#d8ac93';g.fillRect(0,0,64,64);for(let i=0;i<340;i++){g.fillStyle=i%3?'#c99b87':'#e3bba1';g.fillRect(i*23%64,i*47%64,1,1);}for(const x of[11,47]){g.fillStyle='#c88d7d';g.fillRect(x,35,7,5);g.fillStyle='#d19a87';g.fillRect(x-2,32,8,3);}g.fillStyle='#ae826f';for(let i=0;i<5;i++){g.fillRect(16+i,22+Math.floor(i/3),1,1);g.fillRect(12+i*2,15-i%2,2,1);}g.fillStyle='#f0cab0';g.fillRect(22,7,17,2);g.fillRect(9,20,1,3);g.fillRect(52,29,1,3);for(let i=0;i<28;i++){g.fillStyle='#ba907a';g.fillRect(19+i*13%27,53+i%6,1,1);}});
// v0.51: майка-«алкоголичка» в рубчик: вертикальные рёбра, жёлтые пятна под мышками и на пузе, затёртый подол
const vest=()=>pix('gryzli51-vest',64,64,g=>{g.fillStyle='#e2dcc4';g.fillRect(0,0,64,64);for(let x=0;x<64;x+=3){g.fillStyle='#cfc8ae';g.fillRect(x,0,1,64);g.fillStyle='#ece7d2';g.fillRect(x+1,0,1,64);}
 for(let i=0;i<220;i++){g.fillStyle=i%2?'rgba(170,160,130,.5)':'rgba(255,250,235,.4)';g.fillRect(i*17%64,i*29%64,1,1);}
 const stain=(x,y,r,a)=>{for(let k=0;k<3;k++){g.fillStyle=`rgba(${190-k*12},${160-k*14},${70-k*10},${a-k*.12})`;g.beginPath();g.ellipse(x,y,r*(1-k*.25),r*.8*(1-k*.25),0,0,7);g.fill();}};
 stain(6,14,8,.55);stain(58,14,8,.55);stain(36,40,9,.45);stain(22,50,5,.35);g.fillStyle='rgba(90,70,40,.5)';g.fillRect(40,30,2,2);g.fillRect(28,44,1,2);
 g.fillStyle='#b8b098';g.fillRect(0,58,64,6);g.fillStyle='#d0c8ae';for(let x=0;x<64;x+=4)g.fillRect(x,58,2,1);});
const tongueTex=()=>pix('gryzli37-tongue',32,32,g=>{g.fillStyle='#ba737c';g.fillRect(0,0,32,32);for(let i=0;i<80;i++){g.fillStyle=i%3?'#cb8690':'#a55f70';g.fillRect(i*19%32,i*13%32,1,1);}g.fillStyle='#a46171';g.fillRect(14,4,2,23);g.fillStyle='#da9296';g.fillRect(4,6,3,20);});
export const GRYZLI_SKIN={name:'Грызли',rigidBody:true,
 build({root,head,torso,handL,handR,footL,footR}){
  const flesh=lam({map:skin(),emissive:0x35261f,emissiveIntensity:.10},'gryzli37-flesh'),cloth=lam({map:vest(),emissive:0x736941,emissiveIntensity:.16},'gryzli37-cloth'),geos=gryzliHead();
  mesh(geos.skin,flesh,0,0,0,1,1,1,head);mesh(geos.cavity,lam({color:0x39252f,side:THREE.DoubleSide},'gryzli37-mouth'),0,0,0,1,1,1,head);mesh(geos.lip,col(0xc48982),0,0,0,1,1,1,head);
  head.add(compose('gryzli37-face',a=>{for(const s of[-1,1]){a(G.sphL,flesh,s*.575,1.12,-.02,.073,.112,.065);a(G.sphL,col(0xba8578),s*.614,1.12,.018,.014,.055,.025);a(G.sphL,col(0xddad95),s*.35,1.02,.362,.105,.075,.026);}a(G.sphL,flesh,0,1.14,.451,.08,.08,.055);a(G.sphL,col(0xc18c7b),0,1.113,.497,.044,.027,.012);
   for(const x of[-.15,-.075,0,.075,.15])a(G.box,col(0xe4d3af),x,1.066,.425,.064,.034,.035,0,0,x*.25);
   for(let i=0;i<6;i++){const x=-.38+i*.044,y=1.27-Math.sin(i/5*Math.PI)*.027,z=.48*Math.sqrt(Math.max(0,1-(x/.59)**2-((y-1.13)/.59)**2));a(G.box,col(0x805d4f),x,y,z+.005,.056,.014,.012,0,0,(i-2.5)*.10);}
   for(const s of[-1,1])a(G.box,col(0x765142),s*.255,1.465,.337,.22,.028,.018,0,0,s*.15);
  }));
  const eye=new THREE.Group();eye.position.set(.25,1.315,.395);head.add(eye);mesh(G.sph10,col(0xeee5ce),0,0,0,.175,.198,.085,eye);const pupil=mesh(G.sphL,col(0x89683d),.008,-.006,.082,.078,.092,.020,eye);mesh(G.sphL,col(0x2b2528),.01,-.007,.101,.039,.057,.008,eye);mesh(G.box,col(0xf8ebce),-.012,.03,.111,.025,.027,.006,eye);
  const tongue=mesh(gryzliTongue(),lam({map:tongueTex(),side:THREE.DoubleSide},'gryzli37-tongue'),0,.91,.29,1,1,1,head);tongue.name='gryzli-tongue';tongue.geometry.computeBoundingSphere();tongue.geometry.boundingSphere.radius+=.15;let disposed=false;root.addEventListener('removed',()=>{if(!disposed){disposed=true;tongue.geometry.dispose();}});
  // v0.51: настоящая майка — пузо, вырез на груди, узкие лямки через голые плечи; ниже семейные шорты
  torso.add(compose('gryzli51-body',a=>{const shorts=col(0x4a5f86),stripe=col(0x8fa6cc);
   a(G.cyl12,cloth,0,.36,0,.305,.40,.25);a(G.sphL,cloth,0,.34,.075,.285,.22,.235);a(G.cyl12,col(0xc4bca2),0,.165,0,.31,.035,.255);
   a(G.box,cloth,0,.6,.135,.36,.12,.05,-.12,0,0);a(G.box,cloth,0,.615,-.135,.38,.16,.05,.1,0,0);
   a(G.sphL,flesh,0,.625,0,.26,.115,.195);a(G.cyl8,flesh,0,.7,0,.11,.08,.1);
   for(const s of[-1,1]){a(G.box,cloth,s*.105,.69,0,.065,.04,.29,0,0,s*.08);a(G.sphL,flesh,s*.27,.6,0,.09,.085,.1);}
   a(G.cyl12,shorts,0,.08,0,.29,.16,.24);for(const s of[-1,1])a(G.box,stripe,s*.14,.08,.235,.03,.16,.012);a(G.box,stripe,0,.08,.24,.03,.16,.012);}));
  for(const[h,s]of[[handL,-1],[handR,1]])h.add(compose('gryzli37-hand-'+s,a=>{a(G.sphL,flesh,0,0,0,.105,.1,.085);a(G.sphL,flesh,-s*.08,-.015,.04,.04,.06,.04);for(const x of[-.045,0,.045])a(G.box,col(0xad7c69),x,-.04,.078,.008,.025,.009);}));
  for(const f of[footL,footR])f.add(compose('gryzli37-foot',a=>{a(G.sphL,flesh,0,.065,.05,.15,.095,.23);for(const x of[-.08,-.025,.03,.08])a(G.sphL,flesh,x,.06,.23,.035,.04,.05);}));
  head.userData.gryzli={tongue,eye,pupil,last:new V3(),vel:new V3(),bend:0,side:0,v:0,sv:0,ready:false};return{top:1.74,handX:.62,handY:.63,handZ:.04,footX:.21,footY:0,holdX:.30,holdY:.86,holdZ:.58,shadow:.52};
 },
 face(c,e){const u=c.head.userData.gryzli;u.eye.scale.y=e==='blink'?.12:e==='dizzy'?.65:1;},
 animate(c,dt,s){const u=c.head.userData.gryzli,h=Math.min(.05,Math.max(0,dt)),k=Math.min(1,s.speed||0),p=c.root.getWorldPosition(new V3()),d=p.clone().sub(u.last);if(!u.ready||d.length()>3){u.ready=true;u.vel.set(0,0,0);d.set(0,0,0);}const v=d.multiplyScalar(1/Math.max(.001,h)),acc=v.clone().sub(u.vel).multiplyScalar(1/Math.max(.001,h)),right=new V3(Math.cos(c.root.rotation.y),0,-Math.sin(c.root.rotation.y));u.last.copy(p);u.vel.lerp(v,.5);const want=THREE.MathUtils.clamp(-acc.y*.0015+(s.air?-.025:Math.sin(s.t*8)*k*.025),-.09,.09),side=THREE.MathUtils.clamp(-acc.dot(right)*.0012,-.07,.07);for(let i=0;i<3;i++){const d=h/3;u.v+=((want-u.bend)*75-u.v*11)*d;u.bend=THREE.MathUtils.clamp(u.bend+u.v*d,-.1,.1);u.sv+=((side-u.side)*75-u.sv*11)*d;u.side=THREE.MathUtils.clamp(u.side+u.sv*d,-.08,.08);}flexTongue(u.tongue.geometry,u.bend,u.side,s.t,k);u.pupil.position.x=.008+THREE.MathUtils.clamp(s.look||0,-1,1)*.02;}
};
