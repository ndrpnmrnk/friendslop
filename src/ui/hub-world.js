import {buildHoop} from '../world/basketball.js';
import {THREE,G,V3,mesh,col,tmat,glow,lam,compose} from '../core/gfx.js';
import {T,facade} from '../core/textures.js';
import {Builder} from '../world/builder.js';
import {createWorld,withWorld,W} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {bakeStatic} from '../world/bake.js';
import {registerInteracts} from '../game/worldfx.js';
import {resetTools} from '../game/tools.js';
import {resetSplat} from '../world/splat.js';
import {MODES} from '../game/modes.js';
import {HW} from '../config.js';
import {buildVoteArena,buildScreen,buildSlingshot,signTex} from './hub-launch.js';
import {buildIsland} from './hub-island.js';
import {pix} from '../core/textures.js';

// v0.58: вывески и постеры гардероба — рисунки без текста (плечики, худи, кроссовок)
function picTex(kind,bg,fg,w,h,stripe){return pix('hub58-pic-'+kind+bg+fg+w+h,w,h,(g,W,H)=>{g.fillStyle=bg;g.fillRect(0,0,W,H);if(stripe){g.fillStyle=stripe;g.fillRect(0,0,8,H);g.fillRect(W-8,0,8,H);}
 g.strokeStyle=fg;g.fillStyle=fg;g.lineWidth=Math.max(3,H*.06);g.lineCap=g.lineJoin='round';const cx=W/2,cy=H/2,s=Math.min(W,H)*.42;
 if(kind==='hanger'){g.beginPath();g.arc(cx,cy-s*.55,s*.16,Math.PI*1.05,Math.PI*2.2);g.lineTo(cx,cy-s*.2);g.lineTo(cx+s*1.05,cy+s*.45);g.lineTo(cx-s*1.05,cy+s*.45);g.closePath();g.stroke();}
 else if(kind==='hoodie'){g.beginPath();g.moveTo(cx-s*.35,cy-s*.75);g.quadraticCurveTo(cx,cy-s*1.15,cx+s*.35,cy-s*.75);g.lineTo(cx+s*.7,cy-s*.5);g.lineTo(cx+s*.95,cy+s*.35);g.lineTo(cx+s*.62,cy+s*.42);g.lineTo(cx+s*.55,cy-s*.05);g.lineTo(cx+s*.55,cy+s*.85);g.lineTo(cx-s*.55,cy+s*.85);g.lineTo(cx-s*.55,cy-s*.05);g.lineTo(cx-s*.62,cy+s*.42);g.lineTo(cx-s*.95,cy+s*.35);g.lineTo(cx-s*.7,cy-s*.5);g.closePath();g.fill();
  g.fillStyle=bg;g.fillRect(cx-s*.3,cy+s*.3,s*.6,s*.22);g.beginPath();g.arc(cx,cy-s*.72,s*.16,0,Math.PI);g.fill();}
 else if(kind==='pad'){// геймпад: корпус с ручками, крестовина, две кнопки (розовая и жёлтая)
  const w=s*2.2,h=s*1.05;g.beginPath();g.moveTo(cx-w*.32,cy-h*.5);g.lineTo(cx+w*.32,cy-h*.5);g.quadraticCurveTo(cx+w*.5,cy-h*.5,cx+w*.5,cy);g.quadraticCurveTo(cx+w*.5,cy+h*.75,cx+w*.3,cy+h*.6);g.lineTo(cx+w*.18,cy+h*.25);g.lineTo(cx-w*.18,cy+h*.25);g.lineTo(cx-w*.3,cy+h*.6);g.quadraticCurveTo(cx-w*.5,cy+h*.75,cx-w*.5,cy);g.quadraticCurveTo(cx-w*.5,cy-h*.5,cx-w*.32,cy-h*.5);g.fill();
  g.fillStyle=bg;const dx=cx-w*.27,dy=cy-h*.05,q=h*.13;g.fillRect(dx-q*2,dy-q*.6,q*4,q*1.2);g.fillRect(dx-q*.6,dy-q*2,q*1.2,q*4);
  for(const[ox,oy,c]of[[.2,-.15,'#ff6ab0'],[.3,.08,'#ffd27a']]){g.fillStyle=c;g.beginPath();g.arc(cx+w*ox,cy+h*oy,h*.13,0,7);g.fill();}}
 else{g.beginPath();g.moveTo(cx-s*.95,cy+s*.35);g.lineTo(cx-s*.85,cy-s*.35);g.quadraticCurveTo(cx-s*.4,cy-s*.4,cx-s*.15,cy-s*.05);g.quadraticCurveTo(cx+s*.5,cy+s*.05,cx+s*.95,cy+s*.2);g.lineTo(cx+s*.95,cy+s*.35);g.closePath();g.fill();
  g.fillStyle=bg;g.fillRect(cx-s*.95,cy+s*.18,s*1.9,s*.07);for(let i=0;i<3;i++)g.fillRect(cx-s*.55+i*s*.18,cy-s*.25+i*s*.06,s*.12,s*.05);}
});}
// вещь на плечиках: 0 — худи с капюшоном и карманом, 1 — футболка с принтом, 2 — куртка на молнии
function garment(kind,c,x,z,metal){const m=tmat(T.cloth(c)),dk=col(0x2a2430),y0=1.05;return compose('hub58-garment'+kind+'_'+c,a=>{
 a(G.halfTorus,metal,0,1.98-y0,0,.05,.06,.3,0,Math.PI/2,0);a(G.box,metal,0,1.9-y0,0,.04,.02,.34);
 const len=kind===1?.62:.78;a(G.box,m,0,1.82-y0-len/2,0,.08,len,.36);
 for(const s of[-1,1]){const sl=kind===1?.18:.5;const p=a(G.box,m,0,1.8-y0-sl/2,s*.22,.07,sl,.1,s*.12,0,0);void p;}
 if(kind===0){a(G.sph10,m,-.02,1.82-y0,0,.06,.1,.12);a(G.box,col(0x000000+((c>>1)&0x7f7f7f)),.045,1.3-y0,0,.005,.12,.22);}
 if(kind===1)a(G.cyl8,col(0xf1e8ff),.045,1.55-y0,0,.08,.005,.08,0,0,Math.PI/2);
 if(kind===2){a(G.box,dk,.045,1.82-y0-len/2,0,.004,len,.02);a(G.box,col(0xd8c8a0),.045,1.77-y0,0,.004,.03,.03);}
}).translateX(x).translateY(y0).translateZ(z);}
// кроссовок на полке: подошва, верх, носок, шнурки
function sneaker(c,x,y,z){return compose('hub58-sneaker'+c,a=>{a(G.box,col(0xf1e8ff),0,.02,0,.13,.04,.32);a(G.box,col(c),0,.08,-.03,.12,.09,.24);a(G.sph10,col(c),0,.06,.1,.06,.05,.08);a(G.box,col(0x2a2430),0,.13,-.12,.11,.05,.06);for(let i=0;i<3;i++)a(G.box,col(0xf1e8ff),0,.126,-.04+i*.045,.09,.008,.012);}).translateX(x).translateY(y).translateZ(z);}

/* v0.55 — хаб «Двор». Компактный городской двор в стиле PS1 (~40×50 м), всё рядом и детально.
   В центре — арена с мячом голосования (выбор режима), над воротами табло (правила, карта), за ним — гигантская
   рогатка для запуска. Слева магазинчик «Гардероб» с витриной, справа аркада с автоматом-клешнёй у входа.
   На юге — точка появления, площадка для дурачества и столики. Праздничный декор — отдельным слоем (decor()),
   под другой праздник меняется только он. */
export const HUB={spawn:new V3(0,0,15),spawns:Array.from({length:8},(_,i)=>new V3((i%4-1.5)*1.6,0,15+Math.floor(i/4)*1.6)),bounds:25};

export function buildHub(scene){
 const group=new THREE.Group();scene.add(group);const state=createWorld(group);state.bounds=HUB.bounds;
 return withWorld(state,()=>{
  const b=new Builder(0,0,0,'Двор'),wood=tmat(T.wood()),metal=tmat(T.metal()),dark=col(0x272332);
  const LS=(state.lightSources??=[]);
  /* ---------- земля ---------- */
  // v0.58: земля — верх летающего острова (hub-island.js), двор и дорожки поверх
  b.ground(-20,-26,20,24,T.pave(),1.5,.012);
  b.ground(-2.2,2,2.2,24,T.cobble(),2,.016);
  b.ground(-19,6,-8,22,T.grass(),2.5,.016);
  /* ---------- дома по краям: обычные городские фасады, разной высоты ---------- */
  for(const[x,z,w,d,h,c]of[[-17.5,-17.5,13,15,9,0x594a5c],[17.5,-17.5,13,15,11,0x4b5361],[-25,7,10,34,11,0x5f515d],[25,7,10,34,12,0x535c68],[-17,28,26,8,10,0x655951],[17,28,26,8,12,0x4e5960]]){
   b.facadeBlock(x,z,w,d,h,c,{lit:.35});b.box(x,z,w+.25,d+.25,.2,tmat(T.roof()),{y:h});
  }
  // южная арка-вход во двор
  group.add(compose('hub55-gate',a=>{for(const s of[-1,1])a(G.box,col(0x4a4452),s*4.3,2.4,28.5,.6,4.8,.6);a(G.box,col(0x4a4452),0,5.0,28.5,9.2,.6,.7);}));
  for(const s of[-1,1])addSolid(s*4.3-.3,28.2,s*4.3+.3,28.8,0,4.8);addSolid(-4,31.5,4,32,0,4);
  { const t=signTex('ДВОР',undefined,'#f5c542',256,64),m=new THREE.Mesh(G.plane,new THREE.MeshBasicMaterial({map:t}));m.position.set(0,5.0,28.12);m.rotation.y=Math.PI;m.scale.set(3.2,.8,1);group.add(m); }

  /* ---------- арена, табло, рогатка ---------- */
  const vote=buildVoteArena(b,MODES);
  const screen=buildScreen(b,0,6.6,-12.8,MODES);
  const sling=buildSlingshot(b,0,-21);
  // два прожектора над ареной и фонари по периметру двора
  for(const s of[-1,1])b.floodlight(s*8.4,2.6,s>0?-2.6:2.6,8,false);
  for(const[x,z,ry]of[[-9,-12,Math.PI/2],[9,-12,-Math.PI/2],[-4.5,6,Math.PI/2],[4.5,6,-Math.PI/2],[-4.5,18,Math.PI/2],[4.5,18,-Math.PI/2],[-9,-22,Math.PI/2],[9,-22,-Math.PI/2]])b.lamp(x,z,ry);

  /* ---------- магазинчик «Гардероб» (запад) ---------- */
  // v0.56: примерочная меньше (6×7 м) — персонаж стоит близко, камера рядом; позади — склад магазина (глухой фасад)
  b.facadeBlock(-18.2,-5,2.8,10,4.4,0x5e4452,{lit:0});for(const z of[-9.3,-.7])b.box(-13.9,z,5.8,1.4,4.4,tmat(T.brickWall()));
  const shop=room(b,group,{x0:-16.8,x1:-11,z0:-8.6,z1:-1.4,h:4.4,color:0x6a4a5a,wall:0xd8b8d0,plain:true,door:{side:'e',a:-6.2,b:-3.8},window:{side:'s',a:-16.2,b:-12.6}});
  { const t=picTex('hanger','#2a1a2a','#ffd8ec',256,64,'#d8608a'),m=new THREE.Mesh(G.box,[lam({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.5},'hub55-wsign'),dark,dark,dark,dark,dark]);m.position.set(-10.78,3.45,-5);m.scale.set(.12,.8,3.6);m.userData.noBatch=true;group.add(m); }
  awning(b,group,-10.3,-5,'x',3.6,'#d8608a','#f1e8ff');
  { const cl=[0x8a4a5a,0x4a6a7a,0xc8a050,0x5a4a8a,0x6a8a4a,0xd8608a],cloth=c=>tmat(T.cloth(c)),pk=col(0xd8608a),cream=col(0xf1e8ff);
   // v0.59: вместо зеркала — фотофон: светлая бумага от стены до пола плавной дугой, персонаж на нём читается
   { const paper=lam({color:0xc8a8bc,emissive:0x120a10},'hub59-backdrop');b.box(-16.6,-5,.04,3.4,3.3,paper,{y:.4,solid:false});
     const cove=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,3.4,10,1,true,0,Math.PI/2),paper);cove.rotation.set(Math.PI/2,0,Math.PI/2);cove.position.set(-16.1,.5,-5);cove.material.side=THREE.DoubleSide;group.add(cove);
     b.box(-15.4,-5,1.4,3.4,.02,paper,{y:.005,solid:false}); }
   // подиум под примерку: круглый, с подсветкой по краю
   b.m(G.cyl12,tmat(T.wood()),-14.6,.1,-5,1.0,.2,1.0);b.m(G.cyl12,lam({color:0x8a6a5a},'hub55-ped'),-14.6,.21,-5,.92,.02,.92);for(let k=0;k<12;k++){const an=k/12*Math.PI*2;b.m(G.sph,glow(0xffb0d8),-14.6+Math.cos(an)*.96,.21,-5+Math.sin(an)*.96,.05,.03,.05);}
   // вешалка вдоль северной стены: вещи разных цветов, над ней полка с шапками и кроссовками, табличка «НОВИНКИ»
   b.box(-14,-8.1,4.6,.06,.06,metal,{y:2.0,solid:false});for(const x of[-16.25,-11.75])b.box(x,-8.1,.06,.06,2.0,metal,{solid:false});
   // v0.58: на вешалке настоящие вещи — худи с капюшоном и рукавами, футболки, куртки; каждая на плечиках с крючком
   for(let k=0;k<9;k++){const x=-15.9+k*.5,c=cl[k%cl.length],kind=k%3;group.add(garment(kind,c,x,-8.1,metal));}
   addSolid(-16.4,-8.6,-11.6,-7.75,0,2.2);
   b.box(-14,-8.45,4.6,.3,.06,tmat(T.wood()),{y:2.6,solid:false});
   group.add(compose('hub56-hats',a=>{a(G.cyl8,col(0x2a2430),-15.8,2.78,-8.45,.16,.3,.16);a(G.cyl8,col(0x2a2430),-15.8,2.64,-8.45,.26,.02,.26);a(G.cone8,col(0x3a2a4a),-14.9,2.84,-8.45,.18,.42,.18);a(G.cyl8,col(0x3a2a4a),-14.9,2.64,-8.45,.3,.02,.3);
    a(G.sph10,col(0x4ab0f0),-14,2.72,-8.45,.17,.12,.17);a(G.box,col(0x4ab0f0),-14,2.67,-8.3,.2,.02,.14);}));
   for(const[x,c]of[[-13.1,0xf1e8ff],[-12.45,0xd8243a]])group.add(sneaker(c,x,2.63,-8.45));
   // над полкой — неоновая вывеска-рисунок: плечики (без текста)
   { const t=picTex('hanger','#1b1524','#ffd27a',256,96,null),m=new THREE.Mesh(G.plane,new THREE.MeshBasicMaterial({map:t}));m.position.set(-14,3.35,-8.28);m.scale.set(1.1,.42,1);group.add(m); }
   // у витрины: манекен в худи и пуф с коробками обуви
   group.add(compose('hub56-mannequin',a=>{const m=col(0xd8cfc0);a(G.cyl8,m,0,.05,0,.3,.1,.3);a(G.cyl6,dark,0,.6,0,.03,1,.03);a(G.box,col(0xd8608a),0,1.32,0,.5,.6,.26);a(G.box,col(0xd8608a),0,1.62,-.08,.3,.12,.16);a(G.sph10,m,0,1.82,0,.14,.17,.14);a(G.cyl8,col(0xf5c542),0,1.98,0,.16,.06,.16);}).translateX(-15.6).translateZ(-2.1));
   b.m(G.cyl12,tmat(T.cloth(0x6a3a5a)),-12.7,.22,-2.2,.4,.44,.4);for(const[y,c]of[[.5,0xd8a050],[.66,0xf1e8ff],[.8,0x4ab0f0]])b.box(-12.7,-2.2,.42,.28,.15,col(c),{y,solid:false});
   addSolid(-13.1,-2.6,-12.3,-1.8,0,.9);
   // постеры на стене, подвесные лампы-конусы, коврик и растения
   for(const[z,txt,c]of[[-7.1,'hoodie','#d8608a'],[-2.9,'sneaker','#ffd27a']]){const t=picTex(txt,'#1b1524',c,128,160,null);const m=new THREE.Mesh(G.plane,new THREE.MeshBasicMaterial({map:t}));m.position.set(-16.62,2.1,z);m.rotation.y=Math.PI/2;m.scale.set(.9,1.1,1);group.add(m);}
   for(const z of[-6.2,-3.8]){b.box(-14.6,z,.02,.02,.9,metal,{y:3.5,solid:false});b.m(G.cone8,pk,-14.6,3.4,z,.28,.28,.28);b.m(G.sph,glow(0xffe0c0),-14.6,3.25,z,.1,.08,.1);}
   b.box(-14.4,-5,4.2,3.4,.02,tmat(T.carpet(0x5a3a4a)),{y:.01,solid:false});
   // мягкий свет сверху на персонажа: софтбокс под потолком — рамка, светящаяся ткань, мягкий ореол
   b.box(-14.6,-5,1.5,1.5,.12,dark,{y:4.12,solid:false});b.box(-14.6,-5,1.36,1.36,.02,lam({color:0xfff4e8,emissive:0xfff0dc,emissiveIntensity:.9},'hub58-softbox'),{y:4.05,solid:false});
   for(const[dx,dz]of[[-.7,0],[.7,0],[0,-.7],[0,.7]])b.box(-14.6+dx,-5+dz,dx?.03:1.5,dz?.03:1.5,.3,dark,{y:4.0,solid:false});
   b.plantPot?.(-16.3,-8.1+.05);b.plantPot?.(-11.6,-2.0);
  }
  // v0.59: ровный мягкий свет по всей примерочной (не только пятно сверху): софтбокс, заполняющий спереди, два боковых низко
  LS.push({x:-14.6,y:3.9,z:-5,color:0xfff0e0,strength:6,range:5.5},{x:-12.4,y:1.5,z:-5,color:0xffe6f0,strength:4,range:5},{x:-14.2,y:1.2,z:-7.6,color:0xffd8c8,strength:2.5,range:4},{x:-14.2,y:1.2,z:-2.4,color:0xffd8c8,strength:2.5,range:4},{x:-12.5,y:3.2,z:-2.5,color:0xffd0a0,strength:2.5,range:4});
  // раздвижные двери: деревянная рама со стеклом
  const doors=[-1,1].map(s=>{const g=new THREE.Group();group.add(g);state.keep.push(g);g.add(compose('hub55-door',a=>{a(G.box,wood,0,1.3,0,.08,2.6,1.2);a(G.box,lam({color:0x9ab0c8,transparent:true,opacity:.45},'hub55-doorglass'),0,1.5,0,.1,1.6,.9);a(G.box,metal,.07,1.2,s*-.45,.06,.3,.05);}));return{g,s};});
  const entrySolid=addSolid(-11.25,-6.2,-10.85,-3.8,0,2.6);

  /* ---------- аркада и автомат (восток) ---------- */
  room(b,group,{x0:11,x1:19.6,z0:-10,z1:0,h:4.6,color:0x3a4a6a,wall:0x2a2a3a,floor:'tile',door:{side:'w',a:-4.4,b:-1.8,open:true},window:{side:'w',a:-9.4,b:-4.8},window2:{side:'w',a:-1.4,b:-.6}});
  { const t=picTex('pad','#14202a','#9fe8ff',256,64,'#4ab0f0'),m=new THREE.Mesh(G.box,[dark,lam({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.55},'hub55-asign'),dark,dark,dark,dark]);m.position.set(10.78,3.6,-5);m.scale.set(.12,.8,3.6);m.userData.noBatch=true;group.add(m); }
  for(const[x,z,c]of[[18.7,-8.8,0x7b4bc4],[18.7,-7.5,0xd8243a],[18.7,-1.5,0x4ab0f0],[15,-9.2,0x4a9a5a],[13.6,-9.2,0xe0a030]])b.arcade(x,z,x>18?-Math.PI/2:0,c);
  LS.push({x:15.3,y:3.8,z:-5,color:0xb8c8ff,strength:4,range:7},{x:16,y:3,z:-8,color:0xd080ff,strength:2.5,range:5});
  // v0.59: автомат внутри аркады, у восточной стены
  const claw={pos:new V3(17.9,.15,-5.0),ry:-Math.PI/2,scale:.72,stand:new V3(16.2,0,-3.6),solid:[17.05,-6.3,18.75,-3.7]};

  /* ---------- юг: площадка для дурачества и столики ---------- */
  trampoline(b,group,-15,10,1.6);trampoline(b,group,-11,15,1.2);
  buildHoop(b,-17.5,20.5,Math.PI/2);b.swingSet(-11.5,21.5,3.6,0);
  for(const[t,x,z]of[['ball',-14,13],['water',-12,18],['water',-12.4,18.4],['duck',-17,14],['slipper',-9,9],['banana',-16,18.5]])b.item(t,x,z);
  for(const[x,z]of[[11.5,10],[16.5,10],[11.5,16],[16.5,16]])b.picnic(x,z,0);
  b.parasol(14,13,'#d8608a','#2a1f3d');b.parasol(14,19,'#4ab0f0','#2a1f3d');
  b.vending(19,13,-Math.PI/2);b.newsBox(19,19,-Math.PI/2);b.bin(9.5,21);b.bin(-8.5,8);
  for(const[x,z]of[[-6,9.5],[6,9.5]])b.planter(x,z,1.8,1.8,.5,'tree');
  b.bench(-3.6,12,Math.PI/2);b.bench(3.6,12,-Math.PI/2);b.bench(-3.6,20,Math.PI/2);b.bench(3.6,20,-Math.PI/2);
  for(const[x,z]of[[-19,-23],[19,-23]])b.tree(x,z,.9,0,'oak');
  b.ride('cart',8.5,4,Math.PI/2);b.ride('skate',-2,8);
  b.stringLights(-8,4.5,-8,22,4.8,[0xffb45a,0xff7a5a,0xffd27a]);b.stringLights(8,4.5,8,22,4.8,[0xffb45a,0xff7a5a,0xffd27a]);
  decor(b,group);

  // северный край острова: низкое ограждение, за ним обрыв — туда стреляет рогатка
  b.fence(-11,-25.6,11,-25.6,1.0,'iron');
  resetTools();resetSplat();registerInteracts();bakeStatic(group);
  const island=buildIsland(group);
  let curtainOpen=0;
  const wardrobe={preview:new V3(-14.6,.2,-5),gate:new V3(-10,0,-5),inside:new V3(-12.3,0,-5),exit:new V3(-9.4,0,-5),camera:new V3(-11.35,1.6,-4.15),look:new V3(-14.6,1.05,-5),inYaw:-Math.PI/2,outYaw:Math.PI/2};
  const result={state,group,island,curtains:doors,lampLights:[],entrySolid,vote,screen,sling,claw,wardrobe,shop,
   stations:[{id:'wardrobe',name:'Гардероб',hint:'Сменить персонажа',p:new V3(-10,0,-5),r:1.9},{id:'claw',name:'Автомат с друзьями',hint:'Выловить нового друга',p:new V3(16.2,0,-4.4),r:1.5}],
   curtain(open){curtainOpen=THREE.MathUtils.clamp(open,0,1);entrySolid.on=curtainOpen<.92;for(const{g,s}of doors)g.position.set(-11.05,0,-5+s*(.6+curtainOpen*1.15));},
   get curtainOpen(){return curtainOpen;},
   update(){}
  };result.curtain(0);return result;
 });
}

/* Комната-здание: стены с проёмами (дверь, витрина), снаружи фасад, внутри обои, пол, крыша с парапетом */
function room(b,group,o){
 const {x0,x1,z0,z1,h}=o,t=.3,fin=o.plain?lam({color:o.wall,map:T.plaster()},'hub59-wall'+o.wall):tmat(T.wallIn(o.wall)),floor=o.floor==='tile'?T.floorTile():T.floorWood(),dark=col(0x272332);
 b.box((x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,.06,tmat(floor),{solid:false});
 b.box((x0+x1)/2,(z0+z1)/2,x1-x0+.3,z1-z0+.3,.3,tmat(T.roof()),{y:h});
 for(const[x,z,sx,sz]of[[(x0+x1)/2,z0-.05,x1-x0+.4,.2],[(x0+x1)/2,z1+.05,x1-x0+.4,.2],[x0-.05,(z0+z1)/2,.2,z1-z0+.4],[x1+.05,(z0+z1)/2,.2,z1-z0+.4]])b.box(x,z,sx,sz,.35,col(0x4a4452),{y:h+.3,solid:false});
 const holes={n:[],s:[],e:[],w:[]};
 if(o.door)holes[o.door.side].push({a:o.door.a,b:o.door.b,y0:0,y1:2.7,door:true,open:o.door.open});
 if(o.window)holes[o.window.side].push({a:o.window.a,b:o.window.b,y0:.7,y1:2.8,win:true});
 if(o.window2)holes[o.window2.side].push({a:o.window2.a,b:o.window2.b,y0:.7,y1:2.8,win:true});
 const glass=lam({color:0x9ab4d0,transparent:true,opacity:.35,depthWrite:false},'hub55-glass');
 const sides={n:{fixed:z0,along:'x',a0:x0,a1:x1,out:5,inn:4},s:{fixed:z1,along:'x',a0:x0,a1:x1,out:4,inn:5},w:{fixed:x0,along:'z',a0:z0,a1:z1,out:1,inn:0},e:{fixed:x1,along:'z',a0:z0,a1:z1,out:0,inn:1}};
 for(const[k,sd]of Object.entries(sides)){
  const fo=tmat(facade(o.color,sd.a1-sd.a0,h,{windows:false,lit:0})),mats=Array(6).fill(dark);mats[sd.out]=fo;mats[sd.inn]=fin;
  const hs=holes[k].slice().sort((p,q)=>p.a-q.a),cuts=[sd.a0,...hs.flatMap(q=>[q.a,q.b]),sd.a1];
  const seg=(a,c,y0,y1)=>{if(c-a<.01||y1-y0<.01)return;const m=(a+c)/2,len=c-a;if(sd.along==='x')b.box(m,sd.fixed,len,t,y1-y0,mats,{y:y0});else b.box(sd.fixed,m,t,len,y1-y0,mats,{y:y0});};
  for(let i=0;i<cuts.length;i+=2)seg(cuts[i],cuts[i+1],0,h);
  for(const q of hs){seg(q.a,q.b,q.y1,h);if(q.y0>0)seg(q.a,q.b,0,q.y0);
   if(q.win){const m=(q.a+q.b)/2,len=q.b-q.a;if(sd.along==='x')b.box(m,sd.fixed,len,.06,q.y1-q.y0,glass,{y:q.y0});else b.box(sd.fixed,m,.06,len,q.y1-q.y0,glass,{y:q.y0});
    // рама витрины
    for(const yy of[q.y0-.05,q.y1])sd.along==='x'?b.box(m,sd.fixed,len+.1,t+.1,.08,col(0x3a3440),{y:yy,solid:false}):b.box(sd.fixed,m,t+.1,len+.1,.08,col(0x3a3440),{y:yy,solid:false});}
   if(q.door){const m=(q.a+q.b)/2,len=q.b-q.a;sd.along==='x'?b.box(m,sd.fixed,len+.2,t+.1,.12,col(0x3a3440),{y:q.y1,solid:false}):b.box(sd.fixed,m,t+.1,len+.2,.12,col(0x3a3440),{y:q.y1,solid:false});}}
 }
 return o;
}
// маркиза над входом: полосатая ткань на кронштейнах
function awning(b,group,x,z,axis,len,c1,c2){
 const m=lam({map:T.awning(c1,c2),side:THREE.DoubleSide},'hub55-aw'+c1),o=new THREE.Mesh(G.box,m);
 if(axis==='x'){o.position.set(x,2.95,z);o.scale.set(1.1,.05,len);o.rotation.z=x<0?.28:-.28;}else{o.position.set(x,2.95,z);o.scale.set(len,.05,1.1);o.rotation.x=.28;}group.add(o);
 for(const s of[-1,1])mesh(G.box,col(0x3a3440),axis==='x'?x:x+s*len/2,3.1,axis==='x'?z+s*len/2:z,axis==='x'?1.1:.05,.05,axis==='x'?.05:1.1,group);
}
// батут: металлическая рама, синий брезент, пружины; подбрасывает (как на картах)
/* v0.59: батут — рама-кольцо (без верхнего диска, поэтому полотно больше не мерцает с рамой), полотно отдельной сеткой:
   центр и средний круг прогибаются под персонажем и пружинят, когда спрыгнул */
function trampoline(b,group,x,z,r){
 const g=compose('hub59-tramp',a=>{const m=tmat(T.metal());a(new THREE.TorusGeometry(.93,.07,5,16),m,0,.5,0,1,1,1,Math.PI/2);a(new THREE.TorusGeometry(.98,.05,4,16),col(0x2a4a8a),0,.47,0,1,1,1,Math.PI/2);for(let i=0;i<6;i++){const an=i/6*Math.PI*2;a(G.cyl6,m,Math.cos(an)*.9,.25,Math.sin(an)*.9,.05,.5,.05);}});g.position.set(x,0,z);g.scale.set(r,1,r);group.add(g);
 const N=16,pos=[0,0,0],idx=[];for(const rr of[.45,.88])for(let i=0;i<N;i++){const an=i/N*Math.PI*2;pos.push(Math.cos(an)*rr,0,Math.sin(an)*rr);}
 for(let i=0;i<N;i++){const a=1+i,b2=1+(i+1)%N,c=1+N+i,d=1+N+(i+1)%N;idx.push(0,b2,a,a,b2,d,a,d,c);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 const mat=new THREE.Mesh(geo,lam({color:0x1e2a4a,side:THREE.DoubleSide},'hub59-trampmat'));mat.position.set(x,.5,z);mat.scale.set(r,1,r);group.add(mat);W.keep.push(mat);
 b.solid(x,z,r*1.6,r*1.6,0,.55);b.bouncer(x-r*.7,z-r*.7,x+r*.7,z+r*.7,.55,12);
 const st={sag:0,v:0},P=geo.attributes.position;
 W.animated.push(dt=>{const p=W.player?.pos;let want=0;if(p){const d=Math.hypot(p.x-x,p.z-z)/r,h=p.y-.5;if(d<.9&&h>-.1&&h<1.4)want=(1-d*.6)*.32*Math.max(0,1-h/1.4)*(W.player.vel.y<-1?1.4:1);}
  st.v+=(want-st.sag)*140*dt;st.v*=Math.exp(-dt*7);st.sag+=st.v*dt;st.sag=Math.max(-.12,Math.min(.45,st.sag));
  P.setY(0,-st.sag);for(let i=0;i<N;i++)P.setY(1+i,-st.sag*.62);P.needsUpdate=true;geo.computeVertexNormals();});
}
// праздничный слой: всё, что меняется к празднику. Сейчас — Хэллоуин.
function decor(b,group){
 if(!HW)return;
 for(const[x,z,s]of[[-10.3,-1.4,.42],[-10.3,-8.6,.36],[10.3,-8.9,.4],[10.3,-1,.34],[-21.5,-18.5,.5],[21.5,-18.5,.5],[-3.4,22.5,.4],[3.4,22.5,.45],[-6.6,-21,.5],[6.6,-21,.5]])b.pumpkin(x,z,s);
 for(const x of[-4.6,0,4.6])b.web(x+1.3,1.7,-10.02,0,.9);
}
