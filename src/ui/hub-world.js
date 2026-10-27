import {buildHoop} from '../world/basketball.js';
import {THREE,G,V3,mesh,col,tmat,glow,lam,compose,chrome,glassMC,lacq} from '../core/gfx.js';
import {T,pix,facade} from '../core/textures.js';
import {Builder} from '../world/builder.js';
import {createWorld,withWorld} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {bakeStatic} from '../world/bake.js';
import {registerInteracts} from '../game/worldfx.js';
import {resetTools} from '../game/tools.js';
import {resetSplat} from '../world/splat.js';
import {MODES} from '../game/modes.js';
import {buildOuija,buildCatapult,buildRoulette,buildModeCards,beamMat} from './hub-ouija.js';

/* v0.53 «Хром-квартал» — новый хаб на 8 игроков (~70×75 м), всё в стиле «Хром и стекло».
   Улицы, как в Roblox-плейсах: широкий бульвар от точки появления ведёт на круглую площадь с огромной
   спиритической доской (выбор режима). Слева площади — стеклянный бутик-гардероб, справа — аркада
   с автоматом-клешнёй, за доской — карточки режимов и голографическое табло карты, ещё дальше —
   северный двор с люком катапульты. По бокам бульвара — площадка для дурачества и кафе-терраса.
   Акцентные места подсвечены: неоновое кольцо на земле, столб света и парящая иконка. */
export const HUB={spawn:new V3(0,0,22),board:new V3(0,0,-6),bounds:36};
const NEON=[0xff4fa8,0x4fe6ff,0xffb43a,0xb47aff];
const hex=c=>'#'+c.toString(16).padStart(6,'0');
const tag=o=>{o.userData.noOcc=true;o.userData.noLight=true;o.userData.noBatch=true;return o;};
const additive=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,side:THREE.DoubleSide});
// неоновая вывеска: светящиеся буквы с ореолом на прозрачном фоне
export function neonText(text,color,w=512,h=128){return pix('neon53-'+text+color,w,h,(g,W,H)=>{g.clearRect(0,0,W,H);g.font=`900 ${H*.6}px "Arial Black",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';
 g.shadowColor=hex(color);g.shadowBlur=H*.25;g.lineWidth=H*.08;g.strokeStyle=hex(color);g.strokeText(text,W/2,H*.54);g.shadowBlur=H*.08;g.fillStyle='#fff8f2';g.fillText(text,W/2,H*.54);});}
function neonSign(group,text,color,x,y,z,ry,w){const t=neonText(text,color),m=tag(new THREE.Mesh(G.plane,new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,fog:false})));m.position.set(x,y,z);m.rotation.y=ry;m.scale.set(w,w/4,1);group.add(m);(W_light(group)).push({x:x+Math.sin(ry)*1.2,y,z:z+Math.cos(ry)*1.2,color,strength:3.4,range:7});return m;}
let LS=null;const W_light=()=>LS;

export function buildHub(scene){
 const group=new THREE.Group();scene.add(group);const state=createWorld(group);state.bounds=HUB.bounds;
 return withWorld(state,()=>{
  LS=(state.lightSources??=[]);
  const b=new Builder(0,0,0,{id:'hub',name:'Хром-квартал'}),steel=chrome(0xdfe4ff),gold=chrome(0xffd27a);
  /* ---------- земля: асфальт вокруг, плитка площади и бульвара, бетонный двор с люком ---------- */
  for(const[x0,z0,x1,z1]of[[-120,-120,120,-38],[-120,-20,120,120],[-120,-38,-14,-20],[14,-38,120,-20]])b.ground(x0,z0,x1,z1,T.asphalt(),4,-.04);
  for(const[x0,z0,x1,z1]of[[-14,-38,14,-34],[-14,-24,14,-20],[-14,-34,-4,-24],[4,-34,14,-24]])b.ground(x0,z0,x1,z1,T.concrete(),2.5,-.035);
  b.ground(-16,-20,16,10,T.flag(),4,.012);b.ground(-5,10,5,37,T.pave(),2,.012);
  b.ground(-34,10,-7,34,T.grass(),3,.01);b.ground(7,10,34,34,T.pave(),2,.012);
  // неоновые бордюры бульвара — дорожка «светится» к площади
  for(const s of[-1,1]){const m=tag(new THREE.Mesh(G.box,additive(0xffb43a,.7)));m.position.set(s*5.05,.03,23.5);m.scale.set(.1,.04,27);group.add(m);}
  for(let z=13;z<36;z+=3){const m=tag(new THREE.Mesh(G.box,additive(0xffb43a,.35)));m.position.set(0,.025,z);m.scale.set(.18,.03,1.2);group.add(m);}
  /* ---------- кварталы по краям (новые фасады: панели, стекло, неон) ---------- */
  const blocks=[[-24,-27,20,22,13,0x4a3a6a],[24,-27,20,22,15,0x2e4a6a],[0,-45,34,10,18,0x3a3060],[-40,10,10,50,12,0x5a3a5a],[40,10,10,50,12,0x3a4a6a],[-21,41,32,10,11,0x4a3a5a],[21,41,32,10,13,0x3a3a6a],[-40,-27,10,26,16,0x30365a],[40,-27,10,26,16,0x463060]];
  for(const[x,z,w,d,h,c]of blocks){b.facadeBlock(x,z,w,d,h,c,{lit:.3,brick:Math.random()<.4});b.box(x,z,w+.3,d+.3,.3,tmat(T.roof()),{y:h});
   const nc=NEON[(x*7+z*3&3)>>>0];for(const[ox,oz,sw,sd]of[[0,d/2,w,0],[0,-d/2,w,0],[w/2,0,0,d],[-w/2,0,0,d]]){const m=tag(new THREE.Mesh(G.box,additive(nc,.9)));m.position.set(x+ox,h+.36,z+oz);m.scale.set(sw+.12,.1,sd+.12);group.add(m);}}
  // южная арка «ХРОМ-КВАРТАЛ» над бульваром
  group.add(compose('hub53-arch',a=>{for(const s of[-1,1])a(G.cyl12,steel,s*5.6,3.6,36,.25,7.2,.25);a(G.box,lacq(0x1a1236),0,7.4,36,12,.9,.5);}));
  neonSign(group,'ХРОМ-КВАРТАЛ',0xffb43a,0,7.4,35.7,Math.PI,10);
  addSolid(-36,36,36,37,0,8,'hub-boundary');

  /* ---------- площадь: доска, карточки, табло, свечи ---------- */
  const ouija=buildOuija(b,HUB.board.x,HUB.board.z,MODES);
  const cards=buildModeCards(b,0,-15.4,MODES,[-9,0,9]);
  const roulette=buildRoulette(b,0,10.2,-16.5);
  const catapult=buildCatapult(b,0,-29);
  // двор катапульты: опасная полоса вокруг люка, прожекторы
  for(const[x,z,w,d]of[[0,-34.3,9,.5],[0,-23.7,9,.5],[-4.3,-29,.5,11],[4.3,-29,.5,11]])b.box(x,z,w,d,.03,tmat(T.hazard()),{solid:false});
  for(const s of[-1,1]){b.lamp(s*11,-22,s>0?-Math.PI/2:Math.PI/2);b.lamp(s*11,-35,s>0?-Math.PI/2:Math.PI/2);}
  /* ---------- бутик-гардероб (запад) ---------- */
  const WC=0x6a2a6a,wall=(x,z,w,d,h,inFace,outFace,y=0)=>{const fin=tmat(T.wallIn(0xd8b8e8)),fo=tmat(facade(WC,Math.max(w,d),h,{windows:false,lit:0})),mats=Array(6).fill(lacq(0x2a1a3a));mats[inFace]=fin;mats[outFace]=fo;b.box(x,z,w,d,h,mats,{y});};
  b.box(-24,-4,16,16,.06,tmat(T.floorTile()),{solid:false});
  wall(-31.8,-4,.4,16,7,0,1);wall(-24,-11.8,16,.4,7,4,5);wall(-24,3.8,16,.4,7,5,4);
  b.box(-24,-4,16.4,16.4,.4,tmat(T.roof()),{y:7});
  // стеклянная витрина с хромовыми стойками, проём 3 м под раздвижные двери
  for(const[z0,z1]of[[-12,-5.5],[-2.5,4]]){const zc=(z0+z1)/2,len=z1-z0;b.box(-16.1,zc,.1,len,5.2,glassMC(0x9ab8ff,.32),{y:.06});for(let z=z0;z<=z1+.01;z+=len/3)b.box(-16.1,z,.18,.18,5.3,steel,{y:0,solid:false});}
  b.box(-16.1,-4,.5,16,1.8,lacq(0x1a1030),{y:5.2,solid:false});addSolid(-16.4,-12,-15.8,4,5.2,7);
  b.box(-16.1,-4,.2,3.4,.2,steel,{y:5.1,solid:false});
  neonSign(group,'ГАРДЕРОБ',0xff4fa8,-15.8,6.1,-4,Math.PI/2,6);
  // козырёк над входом
  b.box(-14.5,-4,3,4.4,.08,glassMC(0xb8c8ff,.4),{y:4.3,solid:false});for(const z of[-6,-2])b.box(-13.1,z,.1,.1,4.3,steel,{solid:false});
  const doors=[-1,1].map(s=>{const d=new THREE.Mesh(G.box,glassMC(0xc8d8ff,.38));d.scale.set(.06,4.9,1.55);d.userData.noBatch=true;group.add(d);state.keep.push(d);const fr=new THREE.Mesh(G.box,steel);fr.scale.set(.08,.12,1.55);fr.userData.noBatch=true;group.add(fr);state.keep.push(fr);return{d,fr,s};});
  const entrySolid=addSolid(-16.3,-5.5,-15.9,-2.5,0,5.2);
  // интерьер: подиум-поворотник с прожектором, зеркало в лампочках, стойки с одеждой
  b.box(-24.5,-4,2.6,2.6,.25,steel,{solid:false});
  const ped=tag(new THREE.Mesh(new THREE.RingGeometry(1.3,1.45,40),additive(0xff4fa8,.9)));ped.rotation.x=-Math.PI/2;ped.position.set(-24.5,.27,-4);group.add(ped);
  const spotBeam=tag(new THREE.Mesh(new THREE.CylinderGeometry(1.25,.35,6.6,24,1,true),beamMat(0xffd8f0)));spotBeam.rotation.x=Math.PI;spotBeam.position.set(-24.5,3.6,-4);spotBeam.material.uniforms.k.value=.25;group.add(spotBeam);
  b.box(-31.55,-4,.05,4.4,3.4,chrome(0xf0f4ff),{y:.9,solid:false});
  for(let i=0;i<10;i++){const a=i/10;b.m(G.sph10,glow(0xfff0d8),-31.5,.9+(i<5?a*2*3.4:3.4-(a-.5)*2*3.4),-4+(i<5?-2.3:2.3),.09,.09,.09);}
  for(const s of[-1,1]){const z=-4+s*6.2;b.m(G.cyl12,steel,-24,2.3,z,.05,.05,9);const r=b.m(G.cyl12,steel,-24,2.3,z,.05,9,.05);r.rotation.z=Math.PI/2;for(const x of[-28.4,-19.6])b.m(G.cyl12,steel,x,1.15,z,.05,2.3,.05);
   for(let i=0;i<9;i++){const c=[0xff6a9a,0x6ad8ff,0xffc46a,0xb48aff,0x7aff9a][i%5],x=-27.8+i*.98;b.box(x,z,.62,.34,1.05,lacq(c),{y:1.05,solid:false});b.box(x,z,.04,.04,.18,steel,{y:2.1,solid:false});}
   addSolid(-28.6,z-.4,-19.4,z+.4,0,2.4);}
  for(const[x,z]of[[-24.5,-4],[-20,-9],[-20,1],[-29,-9],[-29,1]])LS.push({x,y:6,z,color:x===-24.5?0xffe0f4:0xffb8e0,strength:x===-24.5?6:3,range:x===-24.5?8:6});
  /* ---------- аркада и автомат-клешня (восток) ---------- */
  b.facadeBlock(27,-4,14,16,8,0x24305a,{lit:.9,brick:false});b.box(27,-4,14.3,16.3,.3,tmat(T.roof()),{y:8});
  b.box(19.9,-4,.12,12,4.6,glassMC(0x8af0ff,.35),{y:.4,solid:false});for(const z of[-10,-6,-2,2])b.box(19.9,z,.2,.2,5,steel,{solid:false});
  neonSign(group,'АРКАДА',0x4fe6ff,19.75,6.4,-4,-Math.PI/2,6);
  b.box(17.4,-4,4.2,5.2,.08,glassMC(0xa8f0ff,.4),{y:3.9,solid:false});for(const z of[-6.4,-1.6])b.box(15.5,z,.1,.1,3.9,steel,{solid:false});
  b.box(17.6,-4,2.4,3.2,.12,lacq(0x1a2a4a),{solid:false});
  for(const z of[-9,-7.5,1.5,3])b.arcade(18.6,z,-Math.PI/2,[0x7b4bc4,0xff4fa8,0x4fe6ff,0xffb43a][(z*2&3)>>>0]);
  const claw={pos:new V3(17.6,.15,-4),ry:-Math.PI/2,scale:.72,stand:new V3(15.3,0,-2.6),solid:[16.75,-5.25,18.45,-2.75]};
  /* ---------- площадка для дурачества (юго-запад) ---------- */
  b.bouncyPumpkin(-24,18,1.6);b.bouncyPumpkin(-17,24,1.2);b.bouncyPumpkin(-28,27,1.0);
  buildHoop(b,-12,30,Math.PI);b.swingSet(-30,12.5,4,0);b.seesaw(-14,15,Math.PI/2);
  for(const[t,x,z]of[['ball',-20,20],['ball',-12.5,26.5],['water',-22,26],['water',-23,26.6],['duck',-26,14],['slipper',-15,13],['banana',-19,30],['pumpkin',-31,21],['pumpkin',-10,20]])b.item(t,x,z);
  for(const[x,z,s]of[[-32,32,1],[-9,33,.9],[-33,14,.9]])b.tree(x,z,s,0,'maple');b.leafPile(-30,30,.8);b.leafPile(-11,12,.6);
  b.bench(-8,22,-Math.PI/2);b.bench(-8,28,-Math.PI/2);
  /* ---------- кафе-терраса (юго-восток) ---------- */
  b.facadeBlock(30,22,8,22,7,0x6a3a2a,{lit:.9,brick:true});b.box(30,22,8.3,22.3,.3,tmat(T.roof()),{y:7});neonSign(group,'КАФЕ «ТЫКВА»',0xffb43a,25.85,5.8,22,-Math.PI/2,8);
  for(const[x,z]of[[12,15],[18,15],[12,22],[18,22],[12,29],[18,29]]){b.picnic(x,z,0);}
  for(const[x,z]of[[15,18.5],[15,25.5]])b.parasol(x,z,'#ff4fa8','#1a1236');
  b.foodTruck(21.5,31.5,0x4fe6ff,'ТАКО','#ff4fa8');
  b.stringLights(8,12,24,12,4.2,[0xff4fa8,0xffb43a,0x4fe6ff]);b.stringLights(8,32,24,32,4.2,[0xb47aff,0xffb43a,0x4fe6ff]);
  /* ---------- бульвар и площадь: фонари, деревья, скамейки ---------- */
  for(const z of[14,22,30])for(const s of[-1,1])b.lamp(s*6.3,z,s>0?-Math.PI/2:Math.PI/2);
  for(const[x,z]of[[-14.5,-18],[14.5,-18],[-14.5,6],[14.5,6]])b.lamp(x,z,x>0?-Math.PI/2:Math.PI/2);
  for(const z of[18,26])for(const s of[-1,1])b.planter(s*7.6,z,1.6,1.6,.5,'tree');
  for(const[x,z]of[[-12,8],[12,8]])b.planter(x,z,3,1.4,.45,'shrub');
  b.bench(-6.4,26,Math.PI/2);b.bench(6.4,26,-Math.PI/2);b.bench(-12.5,-16,Math.PI/2);b.bench(12.5,-16,-Math.PI/2);
  for(const[x,z]of[[-3,10],[3,10],[-13,-9],[13,1]])b.bollard(x,z);
  b.bin(-6.5,18);b.bin(6.5,34);b.ride('cart',9,9,Math.PI/2);b.ride('skate',-3,15);b.hydrant(-6.4,32);b.newsBox(6.6,16,-Math.PI/2);b.vending(-14,-14,Math.PI/2);
  for(const[t,x,z]of[['pumpkin',-11,-14],['pumpkin',11,8],['duck',3,14],['ball',-3,12]])b.item(t,x,z);

  /* ---------- акценты: неоновое кольцо, столб света, парящая иконка ---------- */
  const accents=[];
  function accent(x,z,color,icon,r=2.3){
   const ring=tag(new THREE.Mesh(new THREE.RingGeometry(r-.16,r,48),additive(color,.85)));ring.rotation.x=-Math.PI/2;ring.position.set(x,.05,z);group.add(ring);
   const beam=tag(new THREE.Mesh(new THREE.CylinderGeometry(r*.9,r,16,24,1,true),beamMat(color)));beam.position.set(x,8,z);beam.material.uniforms.k.value=.22;group.add(beam);
   const ic=icon();ic.position.set(x,3.4,z);group.add(ic);LS.push({x,y:1.5,z,color,strength:2.6,range:5});
   const a={ring,beam,icon:ic,x,z,color,on:true};accents.push(a);return a;}
  const iconMat=c=>{const m=lam({color:c,emissive:c,emissiveIntensity:.45},'hubicon53'+c);m.userData.mc='lacquer';return m;};
  const hanger=()=>compose('hub53-hanger',a=>{const m=iconMat(0xff4fa8);a(G.halfTorus,m,0,.32,0,.16,.16,.5);a(G.box,m,0,0,0,1.2,.08,.08);for(const s of[-1,1])a(G.box,m,s*.32,.16,0,.72,.08,.08,0,0,s*.5);});
  const clawI=()=>compose('hub53-clawicon',a=>{const m=iconMat(0x4fe6ff);a(G.cyl12,m,0,.45,0,.06,.6,.06);a(G.sph10,m,0,.12,0,.2,.16,.2);for(let i=0;i<3;i++){const an=i/3*Math.PI*2;a(G.box,m,Math.sin(an)*.2,-.15,Math.cos(an)*.2,.07,.45,.07,Math.cos(an)*.5,0,-Math.sin(an)*.5);}});
  const pumpkinI=()=>compose('hub53-pumpkinicon',a=>{a(G.sph10,iconMat(0xffb43a),0,0,0,.45,.36,.45);a(G.cyl6,iconMat(0x7aff9a),0,.42,0,.06,.18,.06);});
  const aWard=accent(-14.2,-4,0xff4fa8,hanger),aClaw=accent(15,-4,0x4fe6ff,clawI),aCat=accent(0,-22.6,0xffb43a,pumpkinI,2.6);aCat.on=false;

  resetTools();resetSplat();registerInteracts();bakeStatic(group);
  let curtainOpen=0;
  const wardrobe={preview:new V3(-24.5,.25,-4),gate:new V3(-14.6,0,-4),inside:new V3(-17.6,0,-4),exit:new V3(-13.2,0,-4),camera:new V3(-17.4,1.65,-4),look:new V3(-24.5,1.15,-4),inYaw:-Math.PI/2,outYaw:Math.PI/2};
  const result={state,group,curtains:doors,lampLights:[],entrySolid,ouija,cards,roulette,catapult,claw,wardrobe,accents,
   stations:[{id:'wardrobe',name:'Гардероб',hint:'Сменить персонажа',p:new V3(-14.2,0,-4),r:2.4},{id:'catapult',name:'Тыквенная катапульта',hint:'Запрыгнуть в ковш',p:new V3(0,0,-24),r:2.8,contains:p=>catapult.near(p)},{id:'claw',name:'Автомат с друзьями',hint:'Выловить нового друга',p:new V3(15,0,-4),r:2.2}],
   // раздвижные стеклянные двери бутика
   curtain(open){curtainOpen=THREE.MathUtils.clamp(open,0,1);entrySolid.on=curtainOpen<.92;for(const{d,fr,s}of doors){const z=-4+s*(.76+curtainOpen*1.55);d.position.set(-16.1,2.51,z);fr.position.set(-16.1,4.98,z);}},
   get curtainOpen(){return curtainOpen;},
   update(dt,t){for(const a of accents){const k=a.on?1:0;a.ring.material.opacity+=(k*(.7+Math.sin(t*4+a.x)*.2)-a.ring.material.opacity)*Math.min(1,dt*5);a.beam.material.uniforms.k.value+=(k*.22-a.beam.material.uniforms.k.value)*Math.min(1,dt*5);
     a.icon.visible=a.ring.material.opacity>.05;a.icon.rotation.y=t*1.4;a.icon.position.y=3.4+Math.sin(t*2+a.x)*.18;a.icon.scale.setScalar(Math.max(.01,a.ring.material.opacity/.7));}
    aCat.on=catapult.raised;aCat.ring.position.z=aCat.icon.position.z=aCat.beam.position.z=-22.6;
    ped.material.opacity=.6+Math.sin(t*3)*.3;}
  };result.curtain(0);return result;
 });
}
