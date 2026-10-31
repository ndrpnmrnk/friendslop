import {installHubReturn} from './hub-return.js';
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
import {buildIsle2,hubWalk} from './hub-isle2.js';
import {pix} from '../core/textures.js';

// v0.58: вывески и постеры гардероба — рисунки без текста (плечики, худи, кроссовок)
function picTex(kind,bg,fg,w,h,stripe){return pix('hub58-pic-'+kind+bg+fg+w+h,w,h,(g,W,H)=>{g.fillStyle=bg;g.fillRect(0,0,W,H);if(stripe){g.fillStyle=stripe;g.fillRect(0,0,8,H);g.fillRect(W-8,0,8,H);}
 g.strokeStyle=fg;g.fillStyle=fg;g.lineWidth=Math.max(3,H*.06);g.lineCap=g.lineJoin='round';const cx=W/2,cy=H/2,s=Math.min(W,H)*.42;
 if(kind==='hanger'){g.beginPath();g.arc(cx,cy-s*.55,s*.16,Math.PI*1.05,Math.PI*2.2);g.lineTo(cx,cy-s*.2);g.lineTo(cx+s*1.05,cy+s*.45);g.lineTo(cx-s*1.05,cy+s*.45);g.closePath();g.stroke();}
 else if(kind==='hoodie'){g.beginPath();g.moveTo(cx-s*.35,cy-s*.75);g.quadraticCurveTo(cx,cy-s*1.15,cx+s*.35,cy-s*.75);g.lineTo(cx+s*.7,cy-s*.5);g.lineTo(cx+s*.95,cy+s*.35);g.lineTo(cx+s*.62,cy+s*.42);g.lineTo(cx+s*.55,cy-s*.05);g.lineTo(cx+s*.55,cy+s*.85);g.lineTo(cx-s*.55,cy+s*.85);g.lineTo(cx-s*.55,cy-s*.05);g.lineTo(cx-s*.62,cy+s*.42);g.lineTo(cx-s*.95,cy+s*.35);g.lineTo(cx-s*.7,cy-s*.5);g.closePath();g.fill();
  g.fillStyle=bg;g.fillRect(cx-s*.3,cy+s*.3,s*.6,s*.22);g.beginPath();g.arc(cx,cy-s*.72,s*.16,0,Math.PI);g.fill();}
 else if(kind==='shop'){// плечики с футболкой и искорки
  const sx=s*1.1;g.lineWidth=Math.max(3,H*.05);g.beginPath();g.arc(cx,cy-sx*.62,sx*.12,Math.PI*1.1,Math.PI*2.25);g.lineTo(cx,cy-sx*.38);g.stroke();
  g.fillStyle='#ff6ab0';g.beginPath();g.moveTo(cx-sx*.42,cy-sx*.36);g.lineTo(cx-sx*.15,cy-sx*.42);g.quadraticCurveTo(cx,cy-sx*.28,cx+sx*.15,cy-sx*.42);g.lineTo(cx+sx*.42,cy-sx*.36);g.lineTo(cx+sx*.62,cy-sx*.08);g.lineTo(cx+sx*.4,cy+sx*.02);g.lineTo(cx+sx*.32,cy-sx*.1);g.lineTo(cx+sx*.32,cy+sx*.55);g.lineTo(cx-sx*.32,cy+sx*.55);g.lineTo(cx-sx*.32,cy-sx*.1);g.lineTo(cx-sx*.4,cy+sx*.02);g.lineTo(cx-sx*.62,cy-sx*.08);g.closePath();g.fill();
  g.fillStyle='#ffd27a';g.beginPath();g.arc(cx,cy+sx*.12,sx*.11,0,7);g.fill();g.strokeStyle=fg;g.beginPath();g.moveTo(cx-sx*.42,cy-sx*.36);g.lineTo(cx+sx*.42,cy-sx*.36);g.stroke();
  g.fillStyle=fg;for(const[ox,oy,r]of[[-.95,-.3,.06],[.9,-.45,.05],[.85,.35,.04]]){const x=cx+sx*ox,y=cy+sx*oy;g.fillRect(x-sx*r*2,y-1,sx*r*4,2);g.fillRect(x-1,y-sx*r*2,2,sx*r*4);}}
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
export const HUB={spawn:new V3(0,0,15),spawns:Array.from({length:8},(_,i)=>new V3((i%4-1.5)*1.6,0,15+Math.floor(i/4)*1.6)),bounds:90};

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
  // v0.59: дома разные — кирпич и штукатурка, свои цвета (слива, бирюза, охра, индиго, бордо, олива), разный шаг окон
  for(const[x,z,w,d,h,c,brick,rs]of[[-17.5,-17.5,13,15,9,0x6a4a62,true,2.4],[17.5,-17.5,13,15,11,0x3f6464,false,2.6],[-25,7,10,34,11,0x7a5e40,true,2.4],[25,7,10,34,12,0x4a4f78,false,2.4],[-17,28,26,8,10,0x7a4246,true,2.5],[17,28,26,8,12,0x58664a,false,2.4]]){
   b.facadeBlock(x,z,w,d,h,c,{lit:.35,brick,rowStep:rs});b.box(x,z,w+.25,d+.25,.2,tmat(T.roof()),{y:h});
  }
  // граффити на стенах, что смотрят во двор, и плющ, ползущий по фасадам
  for(const[i,x,z,ry,w,h]of[[0,-19.97,14,Math.PI/2,4.6,2.3],[2,12,23.97,Math.PI,4.2,2.1],[1,19.97,-2,-Math.PI/2,3.6,1.8]]){const m=new THREE.Mesh(G.plane,lam({map:T.graffiti(i),transparent:true,alphaTest:.25},'hub59-graf'+i));m.position.set(x,1.1+h/2,z);m.rotation.y=ry;m.scale.set(w,h,1);group.add(m);}
  { const ivy=lam({map:ivyTex(),transparent:true,alphaTest:.4,side:THREE.DoubleSide},'hub59-ivy');
    for(const[x,z,ry,w,h]of[[19.96,17,-Math.PI/2,3.2,8],[-10.96,-13.5,Math.PI/2,2.6,6.5],[-6,23.96,Math.PI,3,7.5],[24,-9.96,0,2.4,8]]){const m=new THREE.Mesh(G.plane,ivy);m.position.set(x,h/2,z);m.rotation.y=ry;m.scale.set(w,h,1);group.add(m);} }
  // южная арка-вход во двор
  group.add(compose('hub55-gate',a=>{for(const s of[-1,1])a(G.box,col(0x4a4452),s*4.3,2.4,28.5,.6,4.8,.6);a(G.box,col(0x4a4452),0,5.0,28.5,9.2,.6,.7);}));
  for(const s of[-1,1])addSolid(s*4.3-.3,28.2,s*4.3+.3,28.8,0,4.8); // v0.59: проход под аркой открыт — дальше мост на «Остров затей»
  { const t=signTex('ДВОР',undefined,'#f5c542',256,64),m=new THREE.Mesh(G.plane,new THREE.MeshBasicMaterial({map:t}));m.position.set(0,5.0,28.12);m.rotation.y=Math.PI;m.scale.set(3.2,.8,1);group.add(m); }

  /* ---------- арена, табло, рогатка ---------- */
  const vote=buildVoteArena(b,MODES);
  const screen=buildScreen(b,0,6.6,-12.8,MODES);
  const sling=buildSlingshot(b,0,-21);
  // два прожектора над ареной и фонари по периметру двора
  for(const s of[-1,1])b.floodlight(s*8.4,2.6,s>0?-2.6:2.6,8,false);
  // v0.60.15: отключить все объёмные ламповые конусы в хабе.
  // Их прозрачные аддитивные цилиндры выглядели как парящие световые столбы
  // и включались возле камеры. Плафоны, свет на земле и коллизия фонарей остаются.
  for(const[x,z,ry]of[[-9,-12,Math.PI/2],[9,-12,-Math.PI/2],[-4.5,6,Math.PI/2],[4.5,6,-Math.PI/2],[-4.5,18,Math.PI/2],[4.5,18,-Math.PI/2],[-9,-22,Math.PI/2],[9,-22,-Math.PI/2]]) {
    b.lamp(x,z,ry,false);
  }

  /* ---------- магазинчик «Гардероб» (запад) ---------- */
  // v0.56: примерочная меньше (6×7 м) — персонаж стоит близко, камера рядом; позади — склад магазина (глухой фасад)
  b.facadeBlock(-18.2,-5,2.8,10,4.4,0x5e4452,{lit:0});for(const z of[-9.3,-.7])b.box(-13.9,z,5.8,1.4,4.4,tmat(T.brickWall()));
  const shop=room(b,group,{x0:-16.8,x1:-11,z0:-8.6,z1:-1.4,h:4.4,color:0x6a4a5a,wall:0xd8b8d0,plain:true,floor:'tile',door:{side:'e',a:-6.2,b:-3.8},window:{side:'s',a:-16.2,b:-12.6}});
  { const t=picTex('shop','#2a1a2a','#ffd8ec',256,64,'#d8608a'),m=new THREE.Mesh(G.box,[lam({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.5},'hub55-wsign'),dark,dark,dark,dark,dark]);m.position.set(-10.78,3.45,-5);m.scale.set(.12,.8,3.6);m.userData.noBatch=true;group.add(m); }
  awning(b,group,-10.3,-5,'x',3.6,'#d8608a','#f1e8ff');
  // у входа: уличная стойка с вещами на распродажу и горшки с цветами
  { b.box(-9.6,-7.6,.05,1.6,.05,metal,{y:1.6,solid:false});for(const z of[-8.35,-6.85])b.box(-9.6,z,.05,.05,1.6,metal,{solid:false});b.box(-9.6,-7.6,.5,1.7,.05,metal,{y:.02,solid:false});
    for(let k=0;k<4;k++)group.add(garment(k%3,[0xd8608a,0x4ab0f0,0xf5c542,0x9be36b][k],-9.6,-8.15+k*.36,metal).translateY(-.45).rotateY(Math.PI/2));addSolid(-9.9,-8.5,-9.3,-6.7,0,1.7);
    for(const z of[-6.6,-3.4])b.planter(-10.4,z,.6,.6,.5,'shrub'); }
  { const cl=[0x8a4a5a,0x4a6a7a,0xc8a050,0x5a4a8a,0x6a8a4a,0xd8608a],cloth=c=>tmat(T.cloth(c)),pk=col(0xd8608a),cream=col(0xf1e8ff);
   // v0.59b: задняя стена — стеллаж-ячейки со сложенными вещами, коробками и обувью: ровный светлый фон за персонажем
   { const lw=lam({color:0x9a6a48},'hub59-shelfwood3'),X=-16.62;
     group.add(compose('hub59-cubbies',a=>{a(G.box,new THREE.MeshBasicMaterial({color:0x2a2034}),X+.02,1.6,-5,.04,3.1,4.6);
       for(let r=0;r<=3;r++)a(G.box,lw,X+.22,.05+r*1.03,-5,.44,.09,4.7);for(let c=0;c<=4;c++)a(G.box,lw,X+.22,1.6,-7.3+c*1.15,.44,3.2,.09);
       const C=[0xd8608a,0x4ab0f0,0xf5c542,0x9be36b,0xb18cff,0xf1e8ff,0xe0703a,0x5a8a9a];let k=0;
       for(let r=0;r<3;r++)for(let c=0;c<4;c++){const zc=-6.72+c*1.15,y0=.08+r*1.03;k++;
         if((r+c)%3===2){a(G.box,col(0xc8a070),X+.24,y0+.17,zc-.2,.3,.3,.42);a(G.box,col(0xc8a070),X+.24,y0+.16,zc+.25,.3,.28,.38);a(G.box,col(0x2a2430),X+.24,y0+.33,zc-.2,.31,.03,.43);}
         else for(let q=0;q<3;q++)a(G.box,col(C[(k+q)%C.length]),X+.26,y0+.1+q*.15,zc+(q%2?.04:-.04),.34,.14,.7);}}));
     addSolid(-16.8,-7.4,-16.0,-2.6,0,3.2); }
   // подиум под примерку: круглый, с подсветкой по краю
   b.m(G.cyl12,tmat(T.wood()),-14.6,.1,-5,1.0,.2,1.0);b.m(G.cyl12,lam({color:0x8a6a5a},'hub55-ped'),-14.6,.21,-5,.92,.02,.92);for(let k=0;k<12;k++){const an=k/12*Math.PI*2;b.m(G.sph,glow(0xffb0d8),-14.6+Math.cos(an)*.96,.21,-5+Math.sin(an)*.96,.05,.03,.05);}
   // вешалка вдоль северной стены: вещи разных цветов, над ней полка с шапками и кроссовками, табличка «НОВИНКИ»
   b.box(-13.35,-8.1,3.3,.06,.06,metal,{y:2.0,solid:false});for(const x of[-14.95,-11.75])b.box(x,-8.1,.06,.06,2.0,metal,{solid:false});
   // v0.58: на вешалке настоящие вещи — худи с капюшоном и рукавами, футболки, куртки; каждая на плечиках с крючком
   for(let k=0;k<7;k++){const x=-14.7+k*.45,c=cl[k%cl.length],kind=k%3;group.add(garment(kind,c,x,-8.1,metal));}
   addSolid(-16.4,-8.6,-11.6,-7.75,0,2.2);
   b.box(-14,-8.45,4.6,.3,.06,tmat(T.wood()),{y:2.6,solid:false});
   group.add(compose('hub56-hats',a=>{a(G.cyl8,col(0x2a2430),-15.8,2.78,-8.45,.16,.3,.16);a(G.cyl8,col(0x2a2430),-15.8,2.64,-8.45,.26,.02,.26);a(G.cone8,col(0x3a2a4a),-14.9,2.84,-8.45,.18,.42,.18);a(G.cyl8,col(0x3a2a4a),-14.9,2.64,-8.45,.3,.02,.3);
    a(G.sph10,col(0x4ab0f0),-14,2.72,-8.45,.17,.12,.17);a(G.box,col(0x4ab0f0),-14,2.67,-8.3,.2,.02,.14);}));
   for(const[x,c]of[[-13.1,0xf1e8ff],[-12.45,0xd8243a]])group.add(sneaker(c,x,2.63,-8.45));
   // у витрины: манекен в худи и пуф с коробками обуви
   group.add(compose('hub56-mannequin',a=>{const m=col(0xd8cfc0);a(G.cyl8,m,0,.05,0,.3,.1,.3);a(G.cyl6,dark,0,.6,0,.03,1,.03);a(G.box,col(0xd8608a),0,1.32,0,.5,.6,.26);a(G.box,col(0xd8608a),0,1.62,-.08,.3,.12,.16);a(G.sph10,m,0,1.82,0,.14,.17,.14);a(G.cyl8,col(0xf5c542),0,1.98,0,.16,.06,.16);}).translateX(-15.6).translateZ(-2.1));
   b.m(G.cyl12,tmat(T.cloth(0x6a3a5a)),-12.7,.22,-2.2,.4,.44,.4);for(const[y,c]of[[.5,0xd8a050],[.66,0xf1e8ff],[.8,0x4ab0f0]])b.box(-12.7,-2.2,.42,.28,.15,col(c),{y,solid:false});
   addSolid(-13.1,-2.6,-12.3,-1.8,0,.9);
   // подвесные лампы-конусы и светлый круглый ковёр под подиумом (тёмный полосатый ковёр давал «тёмный блок» снизу)
   for(const z of[-6.2,-3.8]){b.box(-14.6,z,.02,.02,.9,metal,{y:3.5,solid:false});b.m(G.cone8,pk,-14.6,3.4,z,.28,.28,.28);b.m(G.sph,glow(0xffe0c0),-14.6,3.25,z,.1,.08,.1);}
   b.m(G.cyl12,lam({color:0xe8d4dc},'hub59-rug'),-14.4,.012,-5,1.9,.012,1.9);b.m(G.cyl12,lam({color:0xd8608a},'hub59-rugrim'),-14.4,.008,-5,2.0,.01,2.0);
   // касса у двери: стойка, терминал, пакетики
   group.add(compose('hub59-till',a=>{a(G.box,lam({color:0xb89070},'hub59-shelfwood'),0,.5,0,.5,1,1.1);a(G.box,col(0xf1e8ff),0,1.02,0,.54,.04,1.14);a(G.box,col(0x2a2430),.05,1.14,.25,.2,.18,.06,-.4);a(G.box,col(0x9be36b),.06,1.16,.27,.15,.1,.01,-.4);
     for(const[z,c]of[[-.3,0xd8608a],[-.05,0xf5c542]]){a(G.box,col(c),0,1.2,z,.2,.26,.12);a(G.halfTorus,col(0x2a2430),0,1.35,z,.06,.06,.3,0,Math.PI/2,0);}}).translateX(-11.6).translateZ(-7.4));
   addSolid(-11.85,-7.95,-11.35,-6.85,0,1.1);
   // примерочная кабинка в углу: рама, штанга, полузадёрнутая шторка в складку, зеркальце-панель и табурет
   group.add(compose('hub59-booth',a=>{const fr=col(0x2a2430),cur=col(0xd8608a);for(const[x,z]of[[-.65,-.6],[.65,-.6],[-.65,.6],[.65,.6]])a(G.box,fr,x,1.15,z,.06,2.3,.06);
     a(G.box,fr,0,2.3,-.6,1.36,.06,.06);a(G.box,fr,0,2.3,.6,1.36,.06,.06);a(G.box,fr,-.65,2.3,0,.06,.06,1.26);a(G.box,fr,.65,2.3,0,.06,.06,1.26);
     a(G.box,col(0x6a5a78),-.65,1.15,0,.04,2.1,1.16);for(let i=0;i<5;i++)a(G.box,cur,.65,1.2,-.5+i*.13,.05+(i%2)*.05,2.0,.13);
     a(G.box,col(0xbfd6e8),-.6,1.3,0,.02,1.1,.5);a(G.cyl8,col(0xb89070),0,.22,-.2,.2,.44,.2);}).translateX(-15.9).translateZ(-8.05));
   addSolid(-16.6,-8.7,-15.2,-7.4,0,2.3);
   // ровный верхний свет: две светящиеся панели в потолке
   for(const z of[-7.2,-2.8])b.box(-14,z,2.2,.9,.04,lam({color:0xfff4ea,emissive:0xfff0e0,emissiveIntensity:.55},'hub59-ceilpanel'),{y:4.32,solid:false});
   // мягкий свет сверху на персонажа: софтбокс под потолком — рамка, светящаяся ткань, мягкий ореол
   b.box(-14.6,-5,1.5,1.5,.12,dark,{y:4.12,solid:false});b.box(-14.6,-5,1.36,1.36,.02,lam({color:0xfff4e8,emissive:0xfff0dc,emissiveIntensity:.9},'hub58-softbox'),{y:4.05,solid:false});
   for(const[dx,dz]of[[-.7,0],[.7,0],[0,-.7],[0,.7]])b.box(-14.6+dx,-5+dz,dx?.03:1.5,dz?.03:1.5,.3,dark,{y:4.0,solid:false});
   b.plantPot?.(-16.3,-1.9);b.plantPot?.(-11.6,-2.0);
  }
  // v0.59: ровный мягкий свет по всей примерочной (не только пятно сверху): софтбокс, заполняющий спереди, два боковых низко
  LS.push({x:-14,y:4,z:-7.2,color:0xfff8f2,strength:1.1,range:5},{x:-14,y:4,z:-2.8,color:0xfff8f2,strength:1.1,range:5},{x:-14.6,y:3.9,z:-5,color:0xfff8f4,strength:2.4,range:5},{x:-12.4,y:1.5,z:-5,color:0xfff2f6,strength:1.8,range:4.5},{x:-14.2,y:1.2,z:-7.6,color:0xfff0ea,strength:.9,range:3.5},{x:-14.2,y:1.2,z:-2.4,color:0xfff0ea,strength:.9,range:3.5},{x:-12.5,y:3.2,z:-2.5,color:0xffe0c8,strength:1.2,range:4});
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
  // Лицевая сторона кольца (локальная -Z) смотрит на дорожку и центр двора (+X), не на западную стену (-X).
  buildHoop(b,-17.5,20.5,-Math.PI/2);b.swingSet(-11.5,21.5,3.6,0);
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
  /* ---------- v0.59: паркур вокруг двора ---------- */
  // запад: пожарная лестница на доме у гардероба → крыша склада → крыша гардероба; восток: лестница на крышу аркады, там садик
  { const st=tmat(T.paintMetal(0x3a4048));
    for(const[y,x0,x1]of[[2.6,-23,-17.4],[5.2,-23,-17.4]]){b.box((x0+x1)/2,-9.4,x1-x0,1.2,.12,st,{y:y-.12});b.fence(x0,-10,x0,-8.8,1.0,'iron');}
    b.ladder(-22.4,-8.75,'s',2.6);b.ladder(-18.2,-8.75,'s',5.2,2.6);
    for(const[x,z]of[[-21,-22],[-14,-22]])b.aircon?.(x,z,9);
    b.ladder(18.4,0,'s',4.9);
    group.add(compose('hub59-roofgarden',a=>{for(const[x,z]of[[13,-8],[17.5,-8],[13,-2.5]]){a(G.box,col(0x6a4a3a),x,5.15,z,1.2,.5,.6);a(G.sph10,col(0x4f8a4a),x,5.55,z,.55,.35,.3);}a(G.box,tmat(T.wood()),15.5,5.2,-4.5,2,.08,.5);for(const s of[-.9,.9])a(G.box,col(0x2a2430),15.5+s,5.0,-4.5,.06,.3,.4);}));
    b.stringLights(11.5,-9.6,19.2,-.4,6.2,[0xffb45a,0xff7a5a,0xffd27a],{endPoles:true}); // Без центрального столба перед автоматом (15.35, -5).
  }
  // балконы с цветами и кондиционеры на домах вокруг двора — фасады живее
  group.add(compose('hub59-balconies',a=>{const rail=col(0x2a2430),slab=col(0x6a6070);
    for(const[x,z,y,ax]of[[-20.3,0,4.4,'z'],[-20.3,12,7,'z'],[20.3,4,4.4,'z'],[20.3,16,7,'z'],[-12,23.7,4.4,'x'],[12,23.7,7,'x'],[-15,-9.9,7.5,'x']]){const sx=ax==='z'?(x<0?1:-1):0,sz=ax==='x'?(z<0?1:-1):0;
      a(G.box,slab,x+sx*.5,y,z+sz*.5,ax==='z'?1:2.4,.12,ax==='z'?2.4:1);a(G.box,rail,x+sx*.98,y+.5,z+sz*.98,ax==='z'?.05:2.4,.05,ax==='z'?2.4:.05);for(let k=-1;k<=1;k+=.5)a(G.box,rail,x+sx*.98+(ax==='x'?k*1.1:0),y+.25,z+sz*.98+(ax==='z'?k*1.1:0),.04,.5,.04);
      a(G.box,col(0x8a4a3a),x+sx*.8,y+.2,z+sz*.8,ax==='z'?.3:1.2,.25,ax==='z'?1.2:.3);for(let k=-.4;k<=.4;k+=.4)a(G.sph10,col([0xd8608a,0xf5c542,0x9be36b][(k*5+5|0)%3]),x+sx*.8+(ax==='x'?k:0),y+.42,z+sz*.8+(ax==='z'?k:0),.12,.1,.12);}}));
  /* ---------- v0.59: «Остров затей» за южной аркой ---------- */
  const isle2=buildIsle2(b,group);state.walk=hubWalk;
  resetTools();resetSplat();registerInteracts();bakeStatic(group);
  const island=buildIsland(group);installHubReturn();
  let curtainOpen=0;
  const wardrobe={preview:new V3(-14.6,.2,-5),gate:new V3(-10,0,-5),inside:new V3(-12.3,0,-5),exit:new V3(-9.4,0,-5),camera:new V3(-11.35,1.6,-4.15),look:new V3(-14.6,1.05,-5),inYaw:-Math.PI/2,outYaw:Math.PI/2};
  const result={state,group,island,isle2,curtains:doors,lampLights:[],entrySolid,vote,screen,sling,claw,wardrobe,shop,
   stations:[{id:'wardrobe',name:'Гардероб',hint:'Сменить персонажа',p:new V3(-10,0,-5),r:1.9},{id:'claw',name:'Автомат с друзьями',hint:'Выловить нового друга',p:new V3(16.2,0,-4.4),r:1.5},...isle2.stations],
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
// v0.59: плющ — ветки с листьями снизу вверх, редеет к верху (прозрачный фон)
function ivyTex(){const c=document.createElement('canvas');c.width=48;c.height=128;const g=c.getContext('2d');let r=11;const R=()=>(r=(r*16807)%2147483647)/2147483647;
 for(let k=0;k<5;k++){let x=6+R()*36,y=128;g.strokeStyle='#3a2a1e';g.lineWidth=1;g.beginPath();g.moveTo(x,y);
  while(y>R()*40){const nx=x+(R()-.5)*6,ny=y-4-R()*5;g.lineTo(nx,ny);x=Math.max(2,Math.min(46,nx));y=ny;}g.stroke();}
 for(let i=0;i<520;i++){const y=128-Math.pow(R(),1.4)*128,x=R()*48;if(R()<y/150)continue;g.fillStyle=['#2f6b2c','#3f8a34','#5aa83f','#24521f'][i%4];g.fillRect(x|0,y|0,2+(R()*2|0),2);}
 const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;return t;}
