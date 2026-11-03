import {installHubReturn} from './hub-return.js';
import {buildHoop} from '../world/basketball.js';
import {THREE,G,V3,mesh,col,tmat,glow,lam,compose} from '../core/gfx.js';
import {T,facade,rep} from '../core/textures.js';
import {Builder} from '../world/builder.js';
import {createWorld,withWorld,W} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {bakeStatic} from '../world/bake.js';
import {registerInteracts} from '../game/worldfx.js';
import {resetTools} from '../game/tools.js';
import {addItem} from '../game/items.js';
import {resetSplat} from '../world/splat.js';
import {MODES} from '../game/modes.js';
import {HW,WINTER} from '../config.js';
import {buildSled} from './hub-sled.js';
import {buildTree,buildBoard,buildWheel,buildSnowman,updateSnowmen} from './hub-xmas.js';
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
 else if(kind==='cup'){g.fillRect(cx-s*.5,cy-s*.3,s*.9,s*.9);g.lineWidth=Math.max(3,H*.07);g.beginPath();g.arc(cx+s*.45,cy+s*.1,s*.25,-1.4,1.4);g.stroke();for(const dx of[-.25,0,.25]){g.beginPath();g.moveTo(cx+s*dx,cy-s*.45);g.quadraticCurveTo(cx+s*(dx+.12),cy-s*.65,cx+s*dx,cy-s*.85);g.stroke();}}
 else if(kind==='ginger'){g.beginPath();g.arc(cx,cy-s*.5,s*.3,0,7);g.fill();g.fillRect(cx-s*.32,cy-s*.25,s*.64,s*.7);g.fillRect(cx-s*.75,cy-s*.2,s*1.5,s*.22);g.fillRect(cx-s*.38,cy+s*.4,s*.25,s*.5);g.fillRect(cx+s*.13,cy+s*.4,s*.25,s*.5);g.fillStyle=bg;g.fillRect(cx-s*.12,cy-s*.6,s*.07,s*.07);g.fillRect(cx+s*.06,cy-s*.6,s*.07,s*.07);g.fillRect(cx-s*.05,cy-s*.05,s*.1,s*.1);g.fillRect(cx-s*.05,cy+s*.15,s*.1,s*.1);}
 else if(kind==='gift'){g.fillRect(cx-s*.7,cy-s*.3,s*1.4,s*1.1);g.fillStyle=bg;g.fillRect(cx-s*.08,cy-s*.3,s*.16,s*1.1);g.fillRect(cx-s*.7,cy+s*.1,s*1.4,s*.14);g.fillStyle=fg;g.beginPath();g.ellipse(cx-s*.25,cy-s*.45,s*.25,s*.15,.4,0,7);g.ellipse(cx+s*.25,cy-s*.45,s*.25,s*.15,-.4,0,7);g.stroke();}
 else if(kind==='fir'){for(let k=0;k<3;k++){const w=s*(1-k*.25),y=cy+s*(.5-k*.45);g.beginPath();g.moveTo(cx-w*.8,y);g.lineTo(cx,y-s*.6);g.lineTo(cx+w*.8,y);g.fill();}g.fillRect(cx-s*.1,cy+s*.5,s*.2,s*.3);}
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

/* v0.71 J1 — новый хаб: летающий остров с открытой новогодней ярмаркой (вместо двора между домами).
   В центре большая ёлка с табло побед; вокруг по геймдизайну, всё в 15-20 с бега, на виду:
   юг - точка появления и мост на «Остров затей»; запад - большой ледовый каток выбора режима с табло;
   север - высокая горка с санями (запуск в матч) на выступе острова; восток - две лавки: шале-гардероб
   и игровой зал (автомат с друзьями и колесо удачи внутри). Между ними - ярмарочные домики, гирлянды от ёлки,
   фонари вдоль дорожек, снеговики, скамейки. Края - низкое ограждение из столбиков с канатом. */
export const HUB={spawn:new V3(0,0,15),spawns:Array.from({length:8},(_,i)=>new V3((i%4-1.5)*1.6,0,15+Math.floor(i/4)*1.6)),bounds:90};
import {islandR} from './hub-island.js';
// ярмарочный домик: прилавок, скатная крыша со снегом, гирлянда, товары и вывеска-картинка
function stall(b,group,x,z,ry,kind,c){
 const wood=tmat(T.wood()),roof=lam({color:c},'stall71-'+c),snow=lam({color:0xeef3fb},'stall71-snow'),dk=col(0x2b2533),lamp=lam({color:0xffe0a0,emissive:0xffc070,emissiveIntensity:1},'stall71-lamp');
 const g=compose('stall71-'+kind+c,a=>{
  a(G.box,wood,0,.55,.35,2.6,1.1,.6);a(G.box,lam({color:0xd8b88a},'stall71-top'),0,1.12,.42,2.7,.06,.75);a(G.box,wood,0,1.4,-.55,2.6,2.8,.12);
  for(const s of[-1,1]){a(G.box,wood,s*1.25,1.4,.05,.14,2.8,.14);a(G.box,wood,s*1.25,1.4,-.4,.14,2.8,.14);a(G.box,wood,s*1.3,1.4,-.2,.06,2.6,.8);}
  for(const s of[-1,1]){a(G.box,roof,0,2.95+.0,s*.38-.08,2.95,.08,1.05,s*.62,0,0);a(G.box,snow,0,3.04,s*.36-.08,2.9,.07,.95,s*.62,0,0);}
  for(let i=0;i<9;i++)a(G.sph,lam({color:[0xd8243a,0xf5c542,0x9be36b,0x4ab0f0][i%4],emissive:[0xd8243a,0xf5c542,0x9be36b,0x4ab0f0][i%4],emissiveIntensity:.8},'stall71-b'+(i%4)),-1.2+i*.3,2.55-Math.sin(i/8*Math.PI)*.15,.75,.05,.05,.05);
  a(G.box,lamp,0,2.4,.2,.18,.22,.18);
  if(kind==='cocoa')a(G.cyl12,steelM(),.9,1.5,-.2,.3,.6,.3);
 });g.position.set(x,0,z);g.rotation.y=ry;group.add(g);
 // v0.71.1: прилавок по высоте стойки (на него кладутся товары), задняя стенка - во всю высоту
 const sn=Math.sin(ry),cs=Math.cos(ry),q=Math.abs(cs)>.5,hw=q?1.4:.75,hd=q?.75:1.4;addSolid(x-hw,z-hd,x+hw,z+hd,0,1.15);
 { const bx=x-sn*.55,bz=z-cs*.55;addSolid(bx-(q?1.35:.1),bz-(q?.1:1.35),bx+(q?1.35:.1),bz+(q?.1:1.35),1.15,2.9); }
 // товары - настоящие предметы: взять, бросить, через 25 с на прилавке появляется новый
 const goods={cocoa:'cocoa',ginger:'gingerbread',toys:'ornament',fir:'candycane'}[kind];
 for(let i=0;i<4;i++){const lx=-.9+i*.5,lz=.4;addItem(goods,x+sn*lz+cs*lx,1.17,z+cs*lz-sn*lx,ry);}
 (W.lightSources??=[]).push({x:x+Math.sin(ry)*.6,y:2.2,z:z+Math.cos(ry)*.6,color:0xffc888,strength:1.6,range:4.5});
 // вывеска-картинка над прилавком
 const t=picTex(kind==='cocoa'?'cup':kind==='ginger'?'ginger':kind==='toys'?'gift':'fir','#1b1524','#ffd27a',96,48,null),m=new THREE.Mesh(G.plane,lam({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.5},'stall71-sign'+kind));
 m.position.set(x+Math.sin(ry)*.95,2.72,z+Math.cos(ry)*.95);m.rotation.y=ry;m.scale.set(1.1,.55,1);m.userData.noBatch=true;group.add(m);
}
const steelM=()=>tmat(T.metal());
// крыша-шале: два ската со снегом, свесы, фронтон с часами-вывеской
function chaletRoof(group,x0,x1,z0,z1,h,color,ridgeX=false){
 const w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2,rf=lam({color},'chalet71-'+color),snow=lam({map:T.roof(),color:0xffffff},'chalet71-snow'),wood=tmat(T.wood());
 group.add(compose('chalet71-'+x0+z0,a=>{
  if(ridgeX){const half=d/2+.5,ang=.62,L=half/Math.cos(ang);for(const s of[-1,1]){a(G.box,rf,cx,h+Math.sin(ang)*L/2+.2,cz+s*half/2,w+1,.18,L,s*ang,0,0);a(G.box,snow,cx,h+Math.sin(ang)*L/2+.32,cz+s*half/2,w+.9,.08,L-.1,s*ang,0,0);}
   for(const s of[-1,1]){const tri=new THREE.Shape([new THREE.Vector2(-d/2,0),new THREE.Vector2(d/2,0),new THREE.Vector2(0,Math.tan(ang)*d/2)]);const geo=new THREE.ShapeGeometry(tri);a(geo,wood,x0+(s>0?w:0)+s*.05,h+.2,cz,1,1,1,0,Math.PI/2,0);}}
  else{const half=w/2+.5,ang=.62,L=half/Math.cos(ang);for(const s of[-1,1]){a(G.box,rf,cx+s*half/2,h+Math.sin(ang)*L/2+.2,cz,L,.18,d+1,0,0,-s*ang);a(G.box,snow,cx+s*half/2,h+Math.sin(ang)*L/2+.32,cz,L-.1,.08,d+.9,0,0,-s*ang);}
   for(const s of[-1,1]){const tri=new THREE.Shape([new THREE.Vector2(-w/2,0),new THREE.Vector2(w/2,0),new THREE.Vector2(0,Math.tan(ang)*w/2)]);a(new THREE.ShapeGeometry(tri),wood,cx,h+.2,z0+(s>0?d:0)+s*.05,1,1,1,0,s>0?0:Math.PI,0);}}
  a(G.box,col(0x5a4a5a),x1-1.2,h+2.2,z1-1.4,.6,1.6,.6);a(G.box,lam({color:0xeef3fb},'chalet71-snowcap'),x1-1.2,h+3.05,z1-1.4,.7,.12,.7);
 }));
}
// низкое ограждение по краю острова: деревянные столбики со снежными шапками и канат; проёмы под горку и мост
function edgeRail(group){
 const wood=tmat(T.wood()),snow=lam({color:0xeef3fb},'rail71-snow'),rope=col(0x8a5a36);
 group.add(compose('rail71',a=>{const N=84;let prev=null;for(let i=0;i<=N;i++){const th=i/N*Math.PI*2,R=islandR(th)-1.1,x=Math.cos(th)*R,z=Math.sin(th)*R;
  const gap=(Math.abs(x)<2.2&&z<0)||(Math.abs(x)<2.4&&z>0);if(gap){prev=null;continue;}
  a(G.box,wood,x,.45,z,.16,.9,.16);a(G.box,snow,x,.94,z,.22,.08,.22);
  if(prev){const mx=(x+prev[0])/2,mz=(z+prev[1])/2,L=Math.hypot(x-prev[0],z-prev[1]);a(G.box,rope,mx,.72,mz,.045,.045,L,0,Math.atan2(x-prev[0],z-prev[1]),0);}prev=[x,z];}}));
}
export function buildHub(scene){
 const group=new THREE.Group();scene.add(group);const state=createWorld(group);state.bounds=HUB.bounds;
 return withWorld(state,()=>{
  const b=new Builder(0,0,0,'Ярмарка'),wood=tmat(T.wood()),metal=tmat(T.metal()),dark=col(0x272332);
  const LS=(state.lightSources??=[]);
  /* ---------- дорожки: утоптанный снег по плитке, кольцо вокруг ёлки и лучи к зонам ---------- */
  b.ground(-2,-16,2,30,T.pave(),2,.016);b.ground(-10,-2,10,2,T.pave(),2,.016);b.ground(2,-2,11,2,T.pave(),2,.018);
  // v0.71.1: кольцо вокруг ёлки - UV по мировым координатам (2 м на плитку), без растянутой «размытой» текстуры
  { const rg=new THREE.RingGeometry(4.2,6.2,48,2),uv=rg.attributes.uv,ps=rg.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,ps.getX(i)/2,ps.getY(i)/2);
    const r=new THREE.Mesh(rg,lam({map:rep(T.pave(),1,1),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2},'hub71-ring2'));r.rotation.x=-Math.PI/2;r.position.y=.02;group.add(r); }
  edgeRail(group);
  /* ---------- центр: большая ёлка, табло побед ---------- */
  const xmas=[];
  buildTree(group,0,0,2.1);xmas.push(buildBoard(group,-4.2,1.75,7.2,Math.PI*.15,'wins'));xmas.push(buildBoard(group,4.2,1.75,7.2,-Math.PI*.15,'levels'));
  // гирлянды лучами от верхушки ёлки к домикам ярмарки
  for(const[x,z]of[[5.6,9.5],[-5.6,9.5],[-5.6,-8.5],[5.6,-4]])b.stringLights(x*.15,z*.15,x,z,3.2);
  /* ---------- запад: каток выбора режима, над воротами табло ---------- */
  const vote=buildVoteArena(b,MODES);
  const screen=buildScreen(b,-18,6.6,-16.6,MODES);
  /* ---------- север: высокая горка с санями ---------- */
  const sling=WINTER?buildSled(b,0,-24):buildSlingshot(b,0,-24);
  /* ---------- ярмарочные домики ---------- */
  // v0.71.1: домики вдоль главной дорожки, лицом к ней; от входов в гардероб и игровой зал отодвинуты, от фонарей - не впритык
  stall(b,group,-6.6,10.5,Math.PI/2,'cocoa',0xc8302a);stall(b,group,6.6,10.5,-Math.PI/2,'ginger',0x2f7a46);
  stall(b,group,-6.6,-9.5,Math.PI/2,'toys',0x4a6ab0);stall(b,group,6.6,17.5,-Math.PI/2,'fir',0xb08a30);
  /* ---------- фонари вдоль дорожек, скамейки, снеговики ---------- */
  for(const[x,z,ry]of[[-2.8,12,Math.PI/2],[2.8,20,-Math.PI/2],[-2.8,26,Math.PI/2],[2.8,-11,-Math.PI/2],[-2.8,-15,Math.PI/2],[9.5,-2.8,0],[-9.5,2.8,Math.PI],[14,14,-Math.PI*.75],[-14,13,Math.PI*.75]])b.lamp(x,z,ry,false);
  b.bench(-4.6,13,Math.PI/2);b.bench(4.6,13,-Math.PI/2);b.bench(-4.6,22,Math.PI/2);b.bench(4.6,22,-Math.PI/2);
  for(const[x,z,ry]of[[6.5,17,-.5],[-9,18,.6],[13,-18,-.8],[-6,-20,.4]])buildSnowman(group,x,z,ry);
  for(const[x,z]of[[-12,18],[12,22],[18,-20],[-16,22],[22,16]])b.tree(x,z,.9,0,'spruce');
  for(const[t,x,z]of[[ 'ball',-6,16],['slipper',6,11],['duck',-10,24]])b.item(t,x,z);
  b.ride('skate',-3,18);
  // южная арка к мосту на «Остров затей»
  group.add(compose('hub71-gate',a=>{for(const s of[-1,1]){a(G.box,wood,s*2.8,2.2,41.5,.4,4.4,.4);a(G.cone4,lam({color:0xeef3fb},'gate71-snow'),s*2.8,4.55,41.5,.35,.35,.35);}a(G.box,wood,0,4.3,41.5,6.2,.4,.5);a(G.box,lam({color:0xeef3fb},'gate71-snowtop'),0,4.55,41.5,6.3,.12,.6);
   for(let i=0;i<11;i++)a(G.cone8,lam({color:[0xd8243a,0x9be36b,0xf5c542][i%3]},'gate71-flag'+(i%3)),-2.5+i*.5,3.95,41.5,.14,.3,.04,Math.PI,0,0);}));
  for(const s of[-1,1])addSolid(s*2.8-.2,41.3,s*2.8+.2,41.7,0,4.4);
  { const t=signTex('ОСТРОВ ЗАТЕЙ',undefined,'#f5c542',256,64),m=new THREE.Mesh(G.plane,new THREE.MeshBasicMaterial({map:t}));m.position.set(0,4.3,41.22);m.rotation.y=Math.PI;m.scale.set(3.2,.8,1);group.add(m); }

  /* ---------- восток-север: шале-гардероб ---------- */
  // v0.71: не коробка - шале со скатной крышей и снегом, крыльцо с навесом, витрина с вещами, вывеска-плечики; внутри - мягкий свет сверху
  const WX0=12,WX1=19,WZ0=-14,WZ1=-6,WC=-10;
  const shop=room(b,group,{x0:WX0,x1:WX1,z0:WZ0,z1:WZ1,h:3.8,color:0x8a4a5a,wall:0xe8d0dc,plain:true,floor:'wood',door:{side:'w',a:WC-1.3,b:WC+1.3},window:{side:'s',a:13,b:17.5}});
  chaletRoof(group,WX0-.15,WX1+.15,WZ0-.15,WZ1+.15,3.8,0x7a2a3a,true);
  { const t=picTex('hanger','#2a1a2a','#ffd8ec',256,64,'#d8608a'),m=new THREE.Mesh(G.box,[dark,lam({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.5},'hub71-wsign'),dark,dark,dark,dark]);m.position.set(WX0-.2,3.25,WC);m.scale.set(.12,.7,3);m.rotation.y=Math.PI;m.userData.noBatch=true;group.add(m); }
  group.add(compose('hub71-porch',a=>{for(const s of[-1,1])a(G.box,wood,WX0-1.6,1.4,WC+s*1.7,.16,2.8,.16);a(G.box,lam({color:0x7a2a3a},'chalet71-porch'),WX0-.9,2.95,WC,1.7,.1,3.8,0,0,.32);a(G.box,lam({color:0xeef3fb},'chalet71-porchsnow'),WX0-.9,3.03,WC,1.6,.06,3.7,0,0,.32);
   for(let i=0;i<10;i++)a(G.sph,lam({color:0xffe08a,emissive:0xffc040,emissiveIntensity:1},'hub71-warm'),WX0-1.7,2.7,WC-1.6+i*.36,.05,.05,.05);}));
  // витрина: два манекена в новогодних свитерах
  for(const[x,c]of[[14.2,0xd8243a],[16.4,0x2f7a46]])group.add(compose('hub71-mann'+c,a=>{const m=col(0xd8cfc0);a(G.cyl8,m,0,.05,0,.3,.1,.3);a(G.cyl6,dark,0,.6,0,.03,1,.03);a(G.box,col(c),0,1.32,0,.5,.6,.26);a(G.box,col(0xf1e8ff),0,1.4,.135,.4,.06,.01);a(G.sph10,m,0,1.82,0,.14,.17,.14);a(G.cone8,col(0xd8243a),0,2.05,0,.15,.3,.15);a(G.sph,col(0xf1e8ff),0,2.2,0,.06,.06,.06);}).translateX(x).translateZ(WZ1-.7));
  // интерьер: задняя стена-стеллаж, подиум с подсветкой, вешалка, зеркало, софтбокс над персонажем
  { const lw=lam({color:0x9a6a48},'hub59-shelfwood3'),X=WX1-.2,C=[0xd8608a,0x4ab0f0,0xf5c542,0x9be36b,0xb18cff,0xf1e8ff,0xe0703a,0x5a8a9a];
    group.add(compose('hub71-cubbies',a=>{for(let r=0;r<=3;r++)a(G.box,lw,X-.22,.05+r*.95,WC,.44,.09,4.2);for(let c=0;c<=3;c++)a(G.box,lw,X-.22,1.45,WC-2.05+c*1.37,.44,2.9,.09);
      let k=0;for(let r=0;r<3;r++)for(let c=0;c<3;c++){const zc=WC-1.37+c*1.37,y0=.08+r*.95;k++;for(let q=0;q<3;q++)a(G.box,col(C[(k+q)%C.length]),X-.26,y0+.1+q*.15,zc+(q%2?.04:-.04),.34,.14,.8);}}));
    addSolid(X-.45,WC-2.1,X,WC+2.1,0,3);
    b.m(G.cyl12,wood,16.6,.1,WC,1.0,.2,1.0);b.m(G.cyl12,lam({color:0x8a6a5a},'hub55-ped'),16.6,.21,WC,.92,.02,.92);for(let k=0;k<12;k++){const an=k/12*Math.PI*2;b.m(G.sph,glow(0xffd8b0),16.6+Math.cos(an)*.96,.21,WC+Math.sin(an)*.96,.05,.03,.05);}
    b.m(G.cyl12,lam({color:0xe8d4dc},'hub59-rug'),16.4,.012,WC,1.9,.012,1.9);
    b.box(15.5,WZ0+.5,3.2,.06,.06,metal,{y:2.0,solid:false});for(const x of[13.9,17.1])b.box(x,WZ0+.5,.06,.06,2.0,metal,{solid:false});
    for(let k=0;k<6;k++)group.add(garment(k%3,[0xd8243a,0x2f7a46,0xf5c542,0x4ab0f0,0xf1e8ff,0xb18cff][k],14.2+k*.5,WZ0+.5,metal));addSolid(13.6,WZ0+.1,17.4,WZ0+.9,0,2.2);
    group.add(compose('hub71-mirror',a=>{a(G.box,col(0x6a4a3a),0,1.2,0,.08,2.2,1.0);a(G.box,col(0xbfd6e8),.05,1.2,0,.02,1.9,.8);}).translateX(13.4).translateZ(WZ1-1.1));
    // софтбокс прямо над подиумом + рамка и мягкий ореол
    b.box(16.6,WC,1.5,1.5,.12,dark,{y:3.62,solid:false});b.box(16.6,WC,1.36,1.36,.02,lam({color:0xfff4e8,emissive:0xfff0dc,emissiveIntensity:.95},'hub58-softbox'),{y:3.55,solid:false});
  }
  // v0.71.1: подсветка именно персонажа - тёплый «ключ» спереди-сверху с малым радиусом, контровой сзади, общий фон приглушён
  LS.push({x:15.3,y:2.6,z:WC,color:0xfff2e4,strength:4.2,range:2.6},{x:16.6,y:3.4,z:WC,color:0xfff6ee,strength:2.2,range:3.2},{x:17.8,y:2.4,z:WC-.9,color:0xc8d8ff,strength:1.6,range:2.2},{x:15,y:3.3,z:WC-2.6,color:0xffe8d8,strength:.6,range:3.2},{x:15,y:3.3,z:WC+2.6,color:0xffe8d8,strength:.6,range:3.2});
  // v0.71.1: двери гардероба - глухие деревянные с филёнками, морозное (непрозрачное) окошко, венок и латунная ручка
  const doors=[-1,1].map(s=>{const g=new THREE.Group();group.add(g);state.keep.push(g);g.add(compose('hub71-door',a=>{const dw=lam({color:0x6a2a2a},'door71-wood'),fr=lam({color:0x4a1a1c},'door71-frame');
    a(G.box,dw,0,1.3,0,.1,2.6,1.2);for(const yy of[.55,2.1])a(G.box,fr,-.06,yy,0,.03,.5,.9);a(G.box,lam({color:0xcfe0f0,emissive:0x8aa8c8,emissiveIntensity:.5},'door71-frost'),-.06,1.35,0,.03,.7,.8);
    for(const[yy,zz,w,h]of[[1.35,0,.04,.74],[1.35,0,.04,.04]])a(G.box,fr,-.075,yy,zz,.02,h,w===.04&&h===.04?.84:w);
    a(G.torus,lam({color:0x2f6a3a},'door71-wreath'),-.09,1.95,0,.2,.2,.3,0,Math.PI/2,0);a(G.sph,lam({color:0xd8243a,emissive:0xd8243a,emissiveIntensity:.5},'door71-bow'),-.12,1.78,0,.06,.06,.04);
    a(G.cyl8,lam({color:0xd8b050,emissive:0x6a4a10,emissiveIntensity:.4},'door71-brass'),-.11,1.2,s*-.48,.025,.32,.025);}));return{g,s};});
  const entrySolid=addSolid(WX0-.2,WC-1.2,WX0+.2,WC+1.2,0,2.6);

  /* ---------- восток-юг: игровой зал - автомат с друзьями и колесо удачи ---------- */
  const AX0=12,AX1=21,AZ0=2,AZ1=12;
  room(b,group,{x0:AX0,x1:AX1,z0:AZ0,z1:AZ1,h:4.2,color:0x3a4a7a,wall:0x2a2a40,floor:'tile',door:{side:'w',a:5.8,b:8.6,open:true},window:{side:'w',a:2.8,b:5.2},window2:{side:'w',a:9.2,b:11.2}});
  chaletRoof(group,AX0-.15,AX1+.15,AZ0-.15,AZ1+.15,4.2,0x2a3a6a,false);
  { const t=picTex('pad','#14202a','#9fe8ff',256,64,'#4ab0f0'),m=new THREE.Mesh(G.box,[dark,lam({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.55},'hub55-asign'),dark,dark,dark,dark]);m.position.set(AX0-.2,3.55,7.2);m.scale.set(.12,.75,3.4);m.rotation.y=Math.PI;m.userData.noBatch=true;group.add(m); }
  for(const[x,z,ry,c]of[[14,2.7,0,0x7b4bc4],[15.4,2.7,0,0xd8243a],[16.8,2.7,0,0x4a9a5a],[20.3,6.9,-Math.PI/2,0xe0a030]])b.arcade(x,z,ry,c);
  LS.push({x:16.5,y:3.6,z:7,color:0xb8c8ff,strength:3.6,range:7},{x:19.6,y:3,z:9.8,color:0xffd090,strength:2.4,range:4.5},{x:19,y:3,z:4.4,color:0xd080ff,strength:2,range:4.5});
  const claw={pos:new V3(19.9,.15,4.4),ry:-Math.PI/2,scale:.72,stand:new V3(18.2,0,5.8),solid:[19.05,3.1,20.75,5.7]};
  b.stringLights(AX0+.4,AZ0+.4,AX1-.4,AZ1-.4,3.8,undefined,{endPoles:true});
  if(WINTER)xmas.push(buildWheel(group,20.2,9.4,-Math.PI/2,msg=>{let t=document.getElementById('hubToast');if(!t){t=document.createElement('div');t.id='hubToast';document.body.appendChild(t);}t.textContent=msg;t.classList.remove('on');void t.offsetWidth;t.classList.add('on');}));
  decor(b,group);
  /* ---------- «Остров затей» за южной аркой ---------- */
  const isle2=buildIsle2(b,group);state.walk=hubWalk;
  resetTools();resetSplat();registerInteracts();bakeStatic(group);
  const island=buildIsland(group);installHubReturn();
  let curtainOpen=0;
  const wardrobe={preview:new V3(16.6,.2,WC),gate:new V3(WX0-2,0,WC),inside:new V3(WX0+1.3,0,WC),exit:new V3(WX0-2.6,0,WC),camera:new V3(13.6,1.6,WC+.85),look:new V3(16.6,1.05,WC),inYaw:Math.PI/2,outYaw:-Math.PI/2};
  const inRect=(c,x0,x1,z0,z1)=>c.x>x0&&c.x<x1&&c.z>z0&&c.z<z1&&c.y<4;
  const result={state,group,island,isle2,curtains:doors,lampLights:[],entrySolid,vote,screen,sling,claw,wardrobe,shop,
   inside:c=>inRect(c,WX0,WX1,WZ0,WZ1)||inRect(c,AX0,AX1,AZ0,AZ1),
   stations:[{id:'wardrobe',name:'Гардероб',hint:'Сменить персонажа',p:new V3(WX0-2,0,WC),r:1.9},{id:'claw',name:'Автомат с друзьями',hint:'Выловить нового друга',p:new V3(18.2,0,5.6),r:1.5},...isle2.stations],
   curtain(open){curtainOpen=THREE.MathUtils.clamp(open,0,1);entrySolid.on=curtainOpen<.92;for(const{g,s}of doors)g.position.set(WX0,0,WC+s*(.6+curtainOpen*1.15));},
   get curtainOpen(){return curtainOpen;},
   update(dt=0){for(const x of xmas)x.update(dt);}
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
