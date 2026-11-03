import {THREE,G,col,tmat,glow} from '../../core/gfx.js';
import {WINTER} from '../../config.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {mayorModel} from '../../characters/mayor.js';
import {npcBody} from '../../missions/encounter-motion.js';
import {archives,noticeBoard,displayCase} from '../district-props.js';
import {walkNPC} from '../../missions/encounter-motion.js';
import {tickNPCHit} from '../../game/impacts.js';
import {bonus} from '../../game/score.js';
import {sfx} from '../../core/sfx.js';
import {districtFrame,districtClock,localAnimation} from '../district-motion.js';
// v0.71.1: мэрия заново - классическое здание с портиком из колонн, фронтоном, часовой башней и крыльями;
// внутри приёмная на первом этаже (кабинет мэра, стойка, лавки, флаги), архив наверху. Мэр живёт на первом этаже,
// по расписанию выходит к трибуне перед ступенями (на земле), с ним можно поговорить (E). Зимой - гирлянды, венок, ёлки.
const LINES=['Город в надёжных руках!','Снег уберём к весне.','Голосуйте за меня - я хороший!','Не бросайтесь тапками в мэрию!','Пряники - бесплатно. Почти.','У нас самая длинная гирлянда в стране!','Мне нужна ваша поддержка... и кофе.'];
function bubble(){const c=document.createElement('canvas');c.width=256;c.height=64;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(3.2,.8,1);s.renderOrder=9;s.visible=false;
 return{s,show(text){const g=c.getContext('2d');g.clearRect(0,0,256,64);g.fillStyle='#fff8ec';g.beginPath();g.roundRect(4,4,248,48,10);g.fill();g.beginPath();g.moveTo(118,52);g.lineTo(128,62);g.lineTo(138,52);g.fill();g.strokeStyle='#17111f';g.lineWidth=3;g.beginPath();g.roundRect(4,4,248,48,10);g.stroke();
  g.fillStyle='#17111f';g.font='bold 18px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,29,236);t.needsUpdate=true;s.visible=true;}};}
export default{id:'townhall',name:'Мэрия',ground:'pave',size:44,build(b){
 const stone=tmat(T.concrete()),trim=col(0xe8dcc0),green=col(0x3f5a52),gold=col(0xd8b050),cream=0xd8ccb0;
 const winter=WINTER;
 // крылья - по одному этажу
 for(const x of[3.5,30.5])b.tower({x,z:5,w:10,d:13,floors:1,fh:4.2,stairs:false,wall:0xc8bca0,facadeProps:false,canopy:false,door:{side:'s',at:.5},floor:T.floorTile(),interior(f){archives(f,x+2,7);archives(f,x+7,7);f.desk(x+5,13,0,true);f.bench(x+5,16);}});
 // центральный зал: 2 этажа; внизу приёмная мэра, наверху архив и совещательная
 b.tower({x:14,z:4,w:16,d:16,floors:2,fh:4.2,wall:cream,facadeProps:false,canopy:false,doorW:2.8,doors:[{side:'s',at:.5}],floor:T.floorTile(),interior(f,k){if(!k){
   f.counter(17,9,3.2,1,1,tmat(T.wood()));noticeBoard(f,29.6,13,-Math.PI/2);displayCase(f,15,17,'trophies');f.bench(17.5,16);f.bench(26.5,16);
   f.desk(22,8,0,true);f.chair(22,6.6,0);}else{f.ptable(23,12,2);f.chair(23,10);f.chair(23,14,Math.PI);f.safe(28,6);archives(f,17,6);}}});
 // ковровая дорожка от двери к столу мэра и флаги у стола
 b.ground(21,8.6,23,19.8,T.carpet?T.carpet():T.floorTile(),1,.05);
 for(const x of[20,24]){b.m(G.cyl6,gold,x,1.4,7.2,.03,2.8,.03);b.m(G.box,green,x+.3,2.4,7.2,.6,.8,.03);}
 // портик: широкие ступени, 6 колонн (середина свободна - мэр проходит к трибуне), антаблемент и фронтон
 b.box(22,21.6,16,3.2,.3,stone);b.box(22,22.4,16,1.6,.15,stone,{y:.3});
 for(const x of[15.5,17.8,20.1,23.9,26.2,28.5]){b.m(G.cyl12,trim,x,3.2,22.8,.32,5.8,.32);b.m(G.box,trim,x,.55,22.8,.8,.2,.8);b.m(G.box,trim,x,6.05,22.8,.8,.2,.8);b.solid(x,22.8,.6,.6,0,6);}
 b.box(22,22.4,16.6,3.4,.6,col(0xcfc2a2),{y:6.15,solid:false});
 { const tri=new THREE.Shape([new THREE.Vector2(-8.3,0),new THREE.Vector2(8.3,0),new THREE.Vector2(0,2.4)]),geo=new THREE.ExtrudeGeometry(tri,{depth:3.4,bevelEnabled:false});const m=b.m(geo,col(0xe2d6b8),22,6.75,20.7,1,1,1);void m;
   const roofM=tmat(T.roof());for(const sd of[-1,1]){const r=b.m(G.box,roofM,22+sd*4.1,7.95,22.4,8.8,.18,3.7);r.rotation.z=-sd*.29;} }
 // крыша центрального зала - скаты, часовая башня с куполом и шпилем
 { const roofM=tmat(T.roof());for(const sd of[-1,1]){const r=b.m(G.box,roofM,22+sd*4.2,9.5,12,8.9,.2,16.6);r.rotation.z=-sd*.35;}
   b.box(22,12,4,4,3.4,col(0xd8ccb0),{y:8.4,solid:false});b.box(22,12,4.4,4.4,.3,trim,{y:11.8,solid:false});
   const cc=document.createElement('canvas');cc.width=cc.height=64;const g=cc.getContext('2d');g.fillStyle='#f6efe0';g.beginPath();g.arc(32,32,30,0,7);g.fill();g.strokeStyle='#3a2a1a';g.lineWidth=3;g.stroke();for(let k=0;k<12;k++){const a=k/12*6.283;g.fillRect(32+Math.cos(a)*24-1.5,32+Math.sin(a)*24-1.5,3,3);}g.lineWidth=3;g.beginPath();g.moveTo(32,32);g.lineTo(32,14);g.moveTo(32,32);g.lineTo(44,36);g.stroke();
   const ct=new THREE.CanvasTexture(cc);for(const[dx,dz,ry]of[[0,2.02,0],[0,-2.02,Math.PI],[2.02,0,Math.PI/2],[-2.02,0,-Math.PI/2]]){const f=b.m(G.plane,new THREE.MeshBasicMaterial({map:ct}),22+dx,10.3,12+dz,2.2,2.2,1);f.rotation.y=ry;}
   b.m(new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),green,22,12.1,12,2.1,1.8,2.1);b.m(G.cyl6,gold,22,14.6,12,.06,1.6,.06);b.m(G.sph,gold,22,15.5,12,.18,.18,.18); }
 b.sign(22,6.6,24.12,0,'МЭРИЯ','#3a5048','#ebd8ad',7,.8);
 // трибуна мэра перед ступенями (на земле) с микрофоном и гербом
 b.box(22,27,2.4,1.4,.35,tmat(T.wood()));b.box(22,27.2,1.2,.6,1.15,green,{y:.35});b.m(G.box,gold,22,1.05,27.52,.5,.5,.03);b.m(G.cyl6,col(0x2b2533),22.3,1.8,27.1,.02,.6,.02);b.m(G.sph,col(0x17111f),22.3,2.12,27.05,.06,.07,.06);
 for(const x of[8,36])for(const z of[31,38])b.planter(x,z,2.5,2.5,.5,'shrub');
 if(winter){ // зимнее убранство: гирлянды на колоннах и по карнизу, венок над дверью, ёлки у ступеней
   for(let k=0;k<26;k++){const c=[0xd8243a,0xf5c542,0x9be36b,0x4ab0f0][k%4];b.m(G.sph,glow(c),14.5+k*.6,6.5-Math.abs(Math.sin(k*.6))*.25,24.2,.07,.07,.07);}
   b.m(G.torus,col(0x2f6a3a),22,4.9,20.2,.55,.55,.7);b.m(G.sph,glow(0xd8243a),22,4.4,20.25,.12,.12,.08);
   for(const x of[12.5,31.5]){b.m(G.cone8,col(0x1f4a3a),x,1.6,23,1.1,3.2,1.1);b.m(G.cone8,col(0xe8eef8),x,2.7,23,.55,.9,.55);b.solid(x,23,1.4,1.4,0,3);for(let k=0;k<8;k++){const a=k*2.4,y=.8+k*.32,rr=1-k*.1;b.m(G.sph,glow([0xd8243a,0xf5c542,0x4ab0f0][k%3]),x+Math.cos(a)*rr,y,23+Math.sin(a)*rr,.08,.08,.08);}}
 }
 const model=mayorModel(),home=new THREE.Vector3(b.X(22),b.Y,b.Z(9.6)),speech=new THREE.Vector3(b.X(22),b.Y,b.Z(26.1));model.root.position.copy(home);W.group.add(model.root);W.keep.push(model.root);
 const m={...npcBody(model),kind:'mayor',r:.72,h:2.2,home:home.clone(),busy:false,t:0,lard:false,arms:model.arms,face:model.face};W.mayor=m;W.npcs.push(m);
 const bb=bubble();W.group.add(bb.s);W.keep.push(bb.s);let talkT=0,lineI=0;
 W.interacts.push({get x(){return m.pos.x;},get z(){return m.pos.z;},get y(){return m.pos.y;},r:1.8,label:'Поговорить с мэром',enabled:()=>!m.busy,act(){lineI=(lineI+1+Math.floor(Math.random()*3))%LINES.length;bb.show(LINES[lineI]);talkT=3.2;sfx('msg',{at:m.pos});}});
 let paid=-1,last=-1;
 W.animated.push(dt=>{const now=districtClock(),phase=now%80,c=Math.floor(now/80);m.t+=dt;if(phase<3&&last!==c){last=c;sfx('alarm',{at:m.pos,range:35,v:.45});}m.speaking=false;
  // мэра сбросили/унесли: вернётся домой по земле, а не застрянет наверху
  if(m.pos.y>b.Y+1.2&&!m.busy&&!m.missionControlled&&Math.abs(m.vel?.y||0)<.01){m.pos.y=b.Y;}
  bb.s.position.set(m.pos.x,m.pos.y+3.1,m.pos.z);if(talkT>0){talkT-=dt;if(talkT<=0)bb.s.visible=false;}
  if(tickNPCHit(m,dt,m.t)||m.busy||m.missionControlled)return;
  if(talkT>0){model.animate(m.t,0,'look');m.arms[0].rotation.x=-.5+Math.sin(m.t*4)*.25;return;}
  const out=phase<23,goal=out?speech:m.home;walkNPC(m,goal,1.8,dt);m.speaking=out&&phase>=3&&m.pos.distanceTo(speech)<.6;model.animate(m.t,m.speaking?0:Math.min(1,m.vel.length()),m.speaking?'look':'idle');if(m.speaking){model.root.rotation.y=0;m.arms[0].rotation.x=-.6+Math.sin(m.t*3)*.22;}});
 W.hitHooks.push((it,p)=>{const c=Math.floor(districtClock()/80);if(it.type==='slipper'&&m.speaking&&paid!==c&&p.distanceTo(m.pos.clone().add({x:0,y:1.2,z:0}))<1.6){paid=c;bonus(it.thrownBy||it.owner,'hits',25,m.pos);}});
 W.salonSite={x:b.X(38),y:b.Y,z:b.Z(29)};b.zone('inside',15,5,29,19);districtFrame(b,'townhall');
}};
