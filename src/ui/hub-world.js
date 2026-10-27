import {buildHoop} from '../world/basketball.js';
import {THREE,G,V3,mesh,col,tmat,glow,lam,compose} from '../core/gfx.js';
import {T,facade} from '../core/textures.js';
import {Builder} from '../world/builder.js';
import {createWorld,withWorld} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {bakeStatic} from '../world/bake.js';
import {registerInteracts} from '../game/worldfx.js';
import {resetTools} from '../game/tools.js';
import {resetSplat} from '../world/splat.js';
import {MODES} from '../game/modes.js';
import {HW} from '../config.js';
import {buildVoteArena,buildScreen,buildSlingshot,signTex} from './hub-launch.js';

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
  b.ground(-120,-120,120,120,T.asphalt(),4,-.04);
  b.ground(-20,-26,20,24,T.pave(),1.5,.012);
  b.ground(-2.2,2,2.2,24,T.cobble(),2,.016);
  b.ground(-19,6,-8,22,T.grass(),2.5,.016);
  /* ---------- дома по краям: обычные городские фасады, разной высоты ---------- */
  for(const[x,z,w,d,h,c]of[[0,-29.5,48,9,13,0x5a5064],[-17.5,-17.5,13,15,9,0x594a5c],[17.5,-17.5,13,15,11,0x4b5361],[-25,7,10,34,11,0x5f515d],[25,7,10,34,12,0x535c68],[-17,28,26,8,10,0x655951],[17,28,26,8,12,0x4e5960]]){
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
  for(const s of[-1,1])b.floodlight(s*8.4,2.6,s>0?-2.6:2.6,8);
  for(const[x,z,ry]of[[-9,-12,Math.PI/2],[9,-12,-Math.PI/2],[-4.5,6,Math.PI/2],[4.5,6,-Math.PI/2],[-4.5,18,Math.PI/2],[4.5,18,-Math.PI/2],[-9,-22,Math.PI/2],[9,-22,-Math.PI/2]])b.lamp(x,z,ry);

  /* ---------- магазинчик «Гардероб» (запад) ---------- */
  const shop=room(b,group,{x0:-19.6,x1:-11,z0:-10,z1:0,h:4.4,color:0x6a4a5a,wall:0xd8b8d0,door:{side:'e',a:-6.4,b:-3.6},window:{side:'s',a:-18.2,b:-13}});
  { const t=signTex('ГАРДЕРОБ','#2a1a2a','#ffd8ec',256,64,'#d8608a'),m=new THREE.Mesh(G.box,[lam({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.5},'hub55-wsign'),dark,dark,dark,dark,dark]);m.position.set(-10.78,3.45,-5);m.scale.set(.12,.8,3.6);m.userData.noBatch=true;group.add(m); }
  awning(b,group,-10.3,-5,'x',3.6,'#d8608a','#f1e8ff');
  // витрина: манекен в футболке
  group.add(compose('hub55-mannequin',a=>{const m=col(0xd8cfc0);a(G.cyl8,m,0,.05,0,.3,.1,.3);a(G.cyl6,dark,0,.6,0,.03,1,.03);a(G.box,col(0xd8608a),0,1.32,0,.5,.6,.26);a(G.sph10,m,0,1.82,0,.14,.17,.14);}).translateX(-15.5).translateZ(-.8));
  // внутри: подиум с подсветкой, зеркало в лампочках, вешалки с одеждой, коврик
  b.box(-16,-5,2.2,2.2,.2,tmat(T.wood()),{solid:false});b.m(G.cyl12,lam({color:0x8a6a5a},'hub55-ped'),-16,.21,-5,1.0,.02,1.0);
  b.box(-19.25,-5,.06,3.2,2.6,lam({color:0x5a6478,emissive:0x0c1018},'hub55-mirror'),{y:.5,solid:false});b.box(-19.2,-5,.08,3.5,.16,tmat(T.wood()),{y:3.1,solid:false});b.box(-19.2,-5,.08,3.5,.16,tmat(T.wood()),{y:.36,solid:false});for(const z of[-6.67,-3.33])b.box(-19.2,z,.08,.16,2.9,tmat(T.wood()),{y:.36,solid:false});for(const[z,y,h]of[[-5.6,1.2,1.4],[-4.3,.8,1.8]])b.box(-19.21,z,.02,.05,h,lam({color:0xc8d4e8,emissive:0x303848},'hub55-glint'),{y,solid:false});
  for(let i=0;i<10;i++){const k=i/9;b.m(G.sph,glow(0xfff0d0),-19.2,.5+(i<5?k*2*2.6:2.6-(k-.5)*2*2.6),-5+(i<5?-1.7:1.7),.07,.07,.07);}
  for(const z of[-9.3,-.7]){b.box(-15.5,z,7,.08,.08,metal,{y:2.1,solid:false});for(const x of[-18.9,-12.1])b.box(x,z,.08,.08,2.1,metal,{solid:false});
   for(let i=0;i<9;i++){const c=[0x8a4a5a,0x4a6a7a,0xc8a050,0x5a4a8a,0x6a8a4a][i%5],x=-18.5+i*.75;b.box(x,z,.5,.28,.95,tmat(T.cloth(c)),{y:1.12,solid:false});b.box(x,z,.03,.03,.16,metal,{y:2.0,solid:false});}
   addSolid(-19.2,z-.35,-11.8,z+.35,0,2.3);}
  b.box(-16,-5,3.2,3.2,.02,tmat(T.carpet(0x5a3a4a)),{y:.01,solid:false});
  LS.push({x:-16,y:3.6,z:-5,color:0xffe0c0,strength:5,range:7},{x:-13,y:3.4,z:-1.2,color:0xffd0a0,strength:3,range:5});
  // раздвижные двери: деревянная рама со стеклом
  const doors=[-1,1].map(s=>{const g=new THREE.Group();group.add(g);state.keep.push(g);g.add(compose('hub55-door',a=>{a(G.box,wood,0,1.3,0,.08,2.6,1.4);a(G.box,lam({color:0x9ab0c8,transparent:true,opacity:.45},'hub55-doorglass'),0,1.5,0,.1,1.6,1.0);a(G.box,metal,.07,1.2,s*-.5,.06,.3,.05);}));return{g,s};});
  const entrySolid=addSolid(-11.25,-6.4,-10.85,-3.6,0,2.6);

  /* ---------- аркада и автомат (восток) ---------- */
  room(b,group,{x0:11,x1:19.6,z0:-10,z1:0,h:4.6,color:0x3a4a6a,wall:0x2a2a3a,floor:'tile',door:{side:'w',a:-4.4,b:-1.8,open:true},window:{side:'w',a:-9.4,b:-4.8},window2:{side:'w',a:-1.4,b:-.6}});
  { const t=signTex('АРКАДА','#14202a','#9fe8ff',256,64,'#4ab0f0'),m=new THREE.Mesh(G.box,[dark,lam({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.55},'hub55-asign'),dark,dark,dark,dark]);m.position.set(10.78,3.6,-5);m.scale.set(.12,.8,3.6);m.userData.noBatch=true;group.add(m); }
  for(const[x,z,c]of[[18.7,-8.8,0x7b4bc4],[18.7,-7.5,0xd8243a],[18.7,-1.5,0x4ab0f0],[15,-9.2,0x4a9a5a],[13.6,-9.2,0xe0a030]])b.arcade(x,z,x>18?-Math.PI/2:0,c);
  LS.push({x:15.3,y:3.8,z:-5,color:0xb8c8ff,strength:4,range:7},{x:16,y:3,z:-8,color:0xd080ff,strength:2.5,range:5});
  awning(b,group,9.9,-7.2,'x',3.4,'#4ab0f0','#f1e8ff');
  const claw={pos:new V3(9.6,.15,-7.2),ry:-Math.PI/2,scale:.72,stand:new V3(7.9,0,-5.8),solid:[8.75,-8.5,10.45,-5.9]};

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

  resetTools();resetSplat();registerInteracts();bakeStatic(group);
  let curtainOpen=0;
  const wardrobe={preview:new V3(-16,.2,-5),gate:new V3(-10,0,-5),inside:new V3(-12.4,0,-5),exit:new V3(-9.4,0,-5),camera:new V3(-12.1,1.7,-5),look:new V3(-16,1.1,-5),inYaw:-Math.PI/2,outYaw:Math.PI/2};
  const result={state,group,curtains:doors,lampLights:[],entrySolid,vote,screen,sling,claw,wardrobe,shop,
   stations:[{id:'wardrobe',name:'Гардероб',hint:'Сменить персонажа',p:new V3(-10,0,-5),r:1.9},{id:'claw',name:'Автомат с друзьями',hint:'Выловить нового друга',p:new V3(7.9,0,-6.6),r:1.5}],
   curtain(open){curtainOpen=THREE.MathUtils.clamp(open,0,1);entrySolid.on=curtainOpen<.92;for(const{g,s}of doors)g.position.set(-11.05,0,-5+s*(.7+curtainOpen*1.35));},
   get curtainOpen(){return curtainOpen;},
   update(){}
  };result.curtain(0);return result;
 });
}

/* Комната-здание: стены с проёмами (дверь, витрина), снаружи фасад, внутри обои, пол, крыша с парапетом */
function room(b,group,o){
 const {x0,x1,z0,z1,h}=o,t=.3,fin=tmat(T.wallIn(o.wall)),floor=o.floor==='tile'?T.floorTile():T.floorWood(),dark=col(0x272332);
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
function trampoline(b,group,x,z,r){
 const g=compose('hub55-tramp',a=>{const m=tmat(T.metal());a(G.cyl12,m,0,.5,0,1,.08,1);a(G.cyl12,col(0x2a4a8a),0,.52,0,.86,.03,.86);for(let i=0;i<6;i++){const an=i/6*Math.PI*2;a(G.cyl6,m,Math.cos(an)*.9,.25,Math.sin(an)*.9,.05,.5,.05);}});g.position.set(x,0,z);g.scale.set(r,1,r);group.add(g);
 b.solid(x,z,r*1.6,r*1.6,0,.55);b.bouncer(x-r*.7,z-r*.7,x+r*.7,z+r*.7,.55,12);
}
// праздничный слой: всё, что меняется к празднику. Сейчас — Хэллоуин.
function decor(b,group){
 if(!HW)return;
 for(const[x,z,s]of[[-10.3,-1.4,.42],[-10.3,-8.6,.36],[10.3,-8.9,.4],[10.3,-1,.34],[-21.5,-18.5,.5],[21.5,-18.5,.5],[-3.4,22.5,.4],[3.4,22.5,.45],[-6.6,-21,.5],[6.6,-21,.5]])b.pumpkin(x,z,s);
 for(const x of[-4.6,0,4.6])b.web(x+1.3,1.7,-10.02,0,.9);
 b.web(-2.9,5.6,-21,0,1.4);
 b.stringLights(-8,22,8,22,4.2,[0xff8a1f,0xb18cff,0x9be36b]);
}
