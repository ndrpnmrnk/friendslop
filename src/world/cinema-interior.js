import {G,col,tmat,glow,compose} from '../core/gfx.js';
import {T,pix} from '../core/textures.js';
import {W} from './state.js';
import {cinemaSnacks} from './cinema-shop.js';
import {sfx} from '../core/sfx.js';

// Фойе: все стойки вдоль стен, прямой свободный путь от входа к залу.
export function cinemaFoyer(b){
 const wood=tmat(T.wood()),trim=col(0xb9a17d),dark=col(0x342e3b);
 // Касса примыкает к перегородке лестницы, а не стоит поперёк фойе.
 b.counter(10.55,30.4,1.1,4.4,1.05,tmat(T.cabinet(0x735b60)));
 b.box(10.55,30.4,1.18,4.5,.06,wood,{y:1.04});
 const register=b.prop(10.55,29.3,Math.PI/2);register.add(compose('cinema-register0624',a=>{a(G.box,dark,0,1.17,0,.45,.18,.4);a(G.box,col(0x6f7974),0,1.38,-.08,.36,.26,.12);a(G.box,col(0xb5be9c),0,1.4,-.012,.27,.13,.015);a(G.box,trim,0,1.27,.1,.32,.025,.17);}));
 b.surface(10.55,31.4,1,1,1.1).put('books');
 const snacks=[];
 for(const [z,type,color]of[[28.2,'popcorn',0x8b4e59],[32,'can',0x4d7278]]){
  // Низкий сервант, столешница и пристенная витрина; открытая передняя сторона.
  b.counter(40.05,z,1.2,3.2,1.05,tmat(T.cabinet(color)));
  b.box(40.05,z,1.26,3.25,.06,wood,{y:1.02});
  b.box(40.62,z,.12,3.3,2.4,tmat(T.paintMetal(color)));
  b.m(G.box,trim,40.05,2.45,z,1.3,.13,3.4);
  b.m(G.box,glow(0xe8d2a4),40.05,2.36,z,.85,.035,2.8);
  for(const dz of[-1.64,1.64])b.m(G.box,trim,40.59,1.8,z+dz,.08,1.2,.07);
  snacks.push(cinemaSnacks(b,40.05,z,type));
 }
 // Мягкие трёхместные банкетки у фасадной стены, спиной к стене.
 for(const x of[15,29,34]){
  const g=b.prop(x,36.2,Math.PI);g.add(compose('cinema-lobby-bench0624',a=>{const fabric=tmat(T.cloth(0x794956));for(const sx of[-1.05,1.05])a(G.box,dark,sx,.23,0,.09,.46,.58);for(const sx of[-.8,0,.8]){a(G.box,fabric,sx,.48,0,.77,.2,.65);a(G.box,fabric,sx,.91,-.3,.77,.78,.16);}for(const sx of[-1.25,1.25])a(G.box,wood,sx,.67,0,.12,.12,.72);}));
  b.solid(x,36.2,2.65,.65,0,.58);b.solid(x,36.5,2.5,.16,.58,.72);for(const side of[-1,1])b.solid(x+side*1.25,36.2,.12,.72,.58,.15);W.benches.push({x:b.X(x),y:b.Y,z:b.Z(36.2),ry:Math.PI,skel:false,seats:[-.8,0,.8],exitOffset:.95,riders:[]});
 }
 b.bin(38,35.9);
 b.ground(20.4,34,23.6,36.7,T.carpet(0x754b56),1.5);
 // Чистый парный стеклянный вход: обычный размер створок, без наклеек и лишней перекладины.
 for(const x of[20.45,23.55])b.box(x,36.85,.16,.3,2.5,dark);
 b.box(22,36.85,3.26,.3,.16,dark,{y:2.4});
 for(const x of[14,30]){b.m(G.box,glow(0xe8c592),x,3.96,30,1.4,.08,.35);b.light(x,30,2,0,true);Object.assign(W.lightSources.at(-1),{y:b.Y+3.8,range:8});}
 return snacks;
}

// Общие стены без метровых щелей между аппаратной и двумя санузлами.
export function cinemaBathrooms(b,height){
 const tiles=pix('cinema-wc-tiles0624',64,64,c=>{c.fillStyle='#45615d';c.fillRect(0,0,64,64);for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16){c.fillStyle=((x+y)/16)%2?'#91aaa1':'#849f98';c.fillRect(x+1,y+1,14,14);c.fillStyle='#a9beb1';c.fillRect(x+2,y+2,12,1);c.fillStyle='#6c8882';c.fillRect(x+2,y+14,12,1);}});
 const wall=tmat(T.wallIn(0xb5bcb0)),tile=tmat(tiles),trim=col(0xd1c3a6),porcelain=col(0xd6dbcb),metal=tmat(T.metal());
 for(const x of[33,40.72])b.box(x,28,.18,6,height,wall);
 b.box(33.075,25,15.35,.18,height,wall);
 const rooms=[];
 for(const [x0,x1]of[[25.4,33],[33,40.72]]){
  const cx=(x0+x1)/2,w=x1-x0,door=1.25;
  b.ground(x0+.1,25.1,x1-.1,30.9,T.floorTile(),1);
  // Панели и плинтус на стенах, а не отдельные перегородки посреди комнаты.
  for(const x of[x0+.105,x1-.105]){b.box(x,28,.03,5.8,1.3,tile);b.box(x,28,.045,5.8,.1,trim);}
  b.box(cx,25.11,w-.2,.03,1.3,tile);b.box(cx,25.13,w-.2,.04,.1,trim);
  const part=(w-door)/2;
  for(const x of[x0+part/2,x1-part/2]){b.box(x,31,part,.18,height,wall);b.box(x,30.89,part,.035,1.3,tile);}
  b.box(cx,31,door,.18,height-2.35,wall,{y:2.35});b.door(cx-door/2,31,'x',1,0,door,2.35,'wood');
  // Бачок вплотную к северной стене, чаша направлена в комнату.
  const tx=x1-1.4,tz=25.55,toilet=b.prop(tx,tz);toilet.add(compose('cinema-wc0624',a=>{a(G.cyl12,porcelain,0,.25,0,.28,.5,.28);a(G.sph10,porcelain,0,.48,.12,.38,.15,.48);a(G.torus,col(0x9baaa2),0,.53,.15,.28,.28,.10,Math.PI/2);a(G.box,porcelain,0,.75,-.3,.65,.75,.25);a(G.box,col(0x777f79),.2,1.12,-.3,.12,.035,.08);}));b.solid(tx,tz+.15,.85,1.2,0,1.15);
  // Тумба, раковина и зеркало у западной стены; дверь и центральный проход свободны.
  const sx=x0+.54,sz=28.4;
  b.box(sx,sz,.8,1.65,.8,tmat(T.cabinet(0x82948b)));
  b.m(G.box,porcelain,sx,.82,sz,.86,.08,1.7);b.m(G.sph10,col(0x9faea6),sx,.86,sz,.29,.035,.46);b.m(G.torus,porcelain,sx,.88,sz,.28,.44,.055).rotation.x=Math.PI/2;b.m(G.cyl8,col(0x718079),sx,.895,sz,.045,.008,.045);
  b.m(G.box,col(0x535f5c),x0+.13,1.65,sz,.06,1.1,1.5);b.m(G.box,metal,x0+.17,1.65,sz,.025,.95,1.35);
  b.m(G.cyl8,col(0xa1aaa0),x0+.25,1.05,sz,.035,.3,.035);b.m(G.box,col(0xa1aaa0),x0+.35,1.18,sz,.24,.06,.06);
  // Мыло, сушилка, бумага, небольшая урна и потолочный свет.
  b.m(G.box,col(0xc3b493),sx,.96,sz+.61,.15,.17,.12);
  b.box(x0+.22,30,.25,.4,.55,col(0xb3baad),{y:1});
  b.m(G.cyl8,porcelain,x1-.2,.72,26.2,.12,.24,.12).rotation.z=Math.PI/2;
  b.box(x1-.5,29.9,.4,.4,.55,tmat(T.paintMetal(0x626e69)));b.m(G.box,metal,x1-.5,.58,29.9,.43,.06,.43);
  b.m(G.box,glow(0xe3dbbb),cx,height-.12,28,1.2,.07,.5);b.light(cx,28,1.8,0,true);Object.assign(W.lightSources.at(-1),{y:b.Y+height-.25,range:5});
  W.interacts.push({x:b.X(tx),y:b.Y,z:b.Z(tz+.8),r:1.1,label:'Смыть воду',act(){sfx('splash',{at:{x:b.X(tx),y:b.Y+.5,z:b.Z(tz)},range:10});}});
  rooms.push({x0,x1,z0:25,z1:31,door:{x:cx,z:31},toilet:{x:tx,z:tz},sink:{x:sx,z:sz}});
 }
 return rooms;
}
