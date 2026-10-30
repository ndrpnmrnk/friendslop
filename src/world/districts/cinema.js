import {THREE,G,col,tmat,glow,compose,lam} from '../../core/gfx.js';
import {T,pix} from '../../core/textures.js';
import {W} from '../state.js';
import {cinemaSeat,cinemaPoster,filmArchive,filmWorkbench,popcorn,cinemaProjection} from '../cinema-props.js';
import {districtFrame,localAnimation,districtClock} from '../district-motion.js';
import {cinemaShop} from '../cinema-shop.js';
import {sfx} from '../../core/sfx.js';
export default{id:'cinema',name:'Последний сеанс',ground:'pave',size:44,build(b){
 const dark=col(0x352c3d),brass=col(0xa88e68),plaster=tmat(T.plaster()),cloth=tmat(T.cloth(0x713e51)),UP=4.2,H=8.4;
 b.tower({x:3,z:3,w:38,d:34,floors:1,fh:H,stairs:false,windows:false,facadeProps:false,canopy:false,wall:0x765d69,doorW:2.8,door:{side:'s',at:.5,style:'glass'},ladder:{side:'e',at:.2},floor:T.carpet(0x493744),interior(f){
  // Tall auditorium: no second floor cuts through the screen or the rows.
  f.box(22,3.5,28,.25,5.2,dark,{y:.7});for(const x of[7,37])f.box(x,4,2,.5,5.5,cloth,{y:.6});
  let n=0;for(const z of[9,13,17,21])for(const x of[8,10,12,14,16,18,26,28,30,32,34,36]){cinemaSeat(f,x,z,0,++n);if(x===18)f.grabTarget({x,z,y:0,r:.8,kind:'stash',visible:true,t:2,at:{x,y:.55,z},ring:false,label:'кресло'});}
  for(const x of[4,40])for(const z of[8,14,20]){f.box(x,z,.12,1.5,3,tmat(T.cloth(0x554559)),{y:.5});f.m(G.box,glow(0xe7bf86),x,1.1,z,.15,.08,.35);}
  // Entrance from foyer, paired doors, wide central route between ticketed seats.
  for(const [x,w]of[[12,17.4],[32,17.4]])f.box(x,25,w,.22,UP-.16,plaster);
  f.box(22,25,2.6,.22,1.2,plaster,{y:2.65});f.door(20.7,25,'x',1,0,2.6,2.65,'wood');f.sign(22,3.2,25.15,0,'ЗАЛ 1','#372c3b','#e3c994',2,.35);
  // Upper floor over the foyer; the western stairwell remains open from ground to landing.
  f.box(25.3,31.1,30.8,11.4,.16,tmat(T.concrete()),{y:UP-.16});f.box(7,26.3,6,2.2,.16,tmat(T.concrete()),{y:UP-.16});
  f.stairs(7,35,'n',0,UP,2.7,0,.55);
  for(let i=0;i<14;i++){const z=35-(i+.5)*.55,y=(i+1)*UP/14;for(const x of[5.5,8.5]){f.m(G.box,brass,x,y+.5,z,.045,1,.045);if(i<13){const rail=f.m(G.box,brass,x,y+1.05,z-.25,.06,.06,.65);rail.rotation.x=.5;}}}
  f.counter(14,33,4,1,1.05,tmat(T.wood()));f.sign(14,2.3,33.1,0,'БИЛЕТЫ','#3a303e','#ead4a3',3,.4);f.surface(14,33,4,1,1.06).put('books',-.8,0);
  f.counter(31,33,7,1.1,1.05,tmat(T.paintMetal(0x834b57)));popcorn(f,30,33,1.05);f.sign(31,2.3,33.1,0,'ПОПКОРН · ГАЗИРОВКА','#4d3442','#ead4a3',6,.45);
  for(const x of[31,31.5,32])f.m(G.cyl8,col(x%2?0x9f4b4b:0xb4a071),x,1.27,33,.1,.42,.1);
  cinemaShop(f,29,33,'popcorn');cinemaShop(f,33,33,'can');f.bench(17,35.5);f.bin(38,35);
  for(const x of[14,30]){f.m(G.box,glow(0xe8c592),x,3.96,30,1.4,.08,.35);f.light(x,30,2,0,true);Object.assign(W.lightSources.at(-1),{y:f.Y+3.8,range:8});}
  f.sign(3.18,2.6,33,Math.PI/2,'2 ЭТАЖ','#3c3445','#e0c99d',2,.35);
  const up=f.at(UP);up.ground(10,31.1,40.7,36.7,T.carpet(0x625063),2);up.ground(13.1,25.1,24.9,30.9,T.carpet(0x4d4055),2);for(const x of[15,28,37]){up.m(G.box,glow(0xe9d3a6),x,4.1,33,1.2,.08,.35);up.light(x,33,2,0,true);Object.assign(W.lightSources.at(-1),{y:up.Y+3.9,range:6});}up.box(9.95,32,.1,9,.95,dark);up.box(11.5,25,2.9,.1,.95,dark);
  // Corridor behind three rooms; no crossing toilets to reach the projection booth.
  up.box(13,28,.18,6,H-UP,plaster);up.box(25,28,.18,6,H-UP,plaster);
  for(const [x,w]of[[15.25,4.5],[22.45,5.1]])up.box(x,31,w,.18,H-UP,plaster);
  up.box(18.7,31,2.4,.18,H-UP-2.35,plaster,{y:2.35});up.door(17.5,31,'x',1,0,2.4,2.35,'wood');up.sign(19,2.7,31.13,0,'АППАРАТНАЯ','#3b3341','#e0c494',3,.32);
  // Projection window has physical jambs and a fixed, clear opening toward the auditorium.
  for(const[x,w]of[[14.75,3.5],[23.75,2.5]])up.box(x,25,w,.18,H-UP,plaster);
  up.box(19.75,25,6.5,.18,.8,plaster);up.box(19.75,25,6.5,.18,1.25,plaster,{y:2.95});
  up.m(G.box,lam({color:0xb4c7bf,transparent:true,opacity:.12,depthWrite:false}),19.5,1.85,25,6,2.1,.025);up.solid(19.5,25,6,.04,.8,2.15);
  up.table(20,26.6,1);cinemaProjection(f,20,26.6,UP+.82,{x:22,y:3.5,z:3.66,w:25,h:4.2});filmArchive(up,14.2,28,Math.PI/2);filmWorkbench(up,21.5,29.8);
  const bath=(x0,w,label)=>{const cx=x0+w/2;up.ground(x0+.1,25.1,x0+w-.1,30.9,T.floorTile(),1);for(const x of[x0,x0+w])up.box(x,28,.18,6,H-UP,tmat(T.wallIn(0xaab6a8)));up.box(cx,25,w,.18,H-UP,plaster);
   for(const [x,bw]of[[x0+(w-1.25)/4,(w-1.25)/2],[x0+w-(w-1.25)/4,(w-1.25)/2]])up.box(x,31,bw,.18,H-UP,plaster);
   up.box(cx,31,1.25,.18,H-UP-2.35,plaster,{y:2.35});up.door(cx-.625,31,'x',1,0,1.25,2.35,'wood');up.sign(cx,2.7,31.13,0,label,'#384b45','#e6dfbf',2.8,.3);
   const fixture=up.prop(cx,26.5);fixture.add(compose('cinema-wc0623',a=>{const porcelain=col(0xd6dbcb);a(G.cyl12,porcelain,0,.25,0,.28,.5,.28);a(G.sph10,porcelain,0,.48,.12,.38,.15,.48);a(G.torus,col(0x9baaa2),0,.53,.15,.28,.28,.10,Math.PI/2);a(G.box,porcelain,0,.75,-.3,.65,.75,.25);a(G.box,col(0x777f79),.2,1.12,-.3,.12,.035,.08);}));up.solid(cx,26.5,.85,1.2,0,1.15);
   up.box(cx,29.5,1.5,.55,.8,tmat(T.cabinet(0x89998d)));up.m(G.sph10,col(0xd8ddd1),cx,.83,29.5,.5,.08,.22);up.m(G.box,tmat(T.metal()),cx,1.6,29.75,1,.8,.03);
   W.interacts.push({x:up.X(cx),y:up.Y,z:up.Z(27.3),r:1.1,label:'Смыть воду',act(){sfx('splash',{at:{x:up.X(cx),y:up.Y+.5,z:up.Z(26.5)},range:10});}});
  };bath(26,7,'ТУАЛЕТ · М');bath(33.5,7,'ТУАЛЕТ · Ж');
  f.zone('inside',20,7,24,23);f.zone('inside',19,28,25,35);up.zone('inside',14,32,38,35.5);W.cinemaLevels={upper:UP,stairs:{x:7,z0:27.3,z1:35},corridor:{x0:10,z0:32,x1:40,z1:36}};
 }});
 // Mounted art-deco marquee, high-resolution pixel lettering instead of a stretched 16px strip.
 b.box(22,37.6,29,1.8,.22,dark,{y:3.25});b.box(22,37.1,24,.3,2,brass,{y:5.9});
 const title=pix('cinema-marquee0623',1024,128,c=>{c.fillStyle='#352c3b';c.fillRect(0,0,1024,128);c.strokeStyle='#bda278';c.lineWidth=5;c.strokeRect(7,7,1010,114);c.fillStyle='#ead2a1';c.font='48px "Press Start 2P",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText('ПОСЛЕДНИЙ СЕАНС',512,68,970);});title.minFilter=THREE.NearestFilter;title.magFilter=THREE.NearestFilter;title.generateMipmaps=false;
 b.m(G.plane,tmat(title),22,6.9,37.28,23.5,2,1);
 for(const x of[4,9,35,40]){b.box(x,36.9,.6,.6,8.6,dark,{solid:false});b.m(G.box,brass,x,8.8,37,.8,.25,.8);}
 for(let x=8;x<=36;x+=2)b.m(G.sph,glow(0xe4b77e),x,3.18,38.2,.065,.065,.065);
 cinemaPoster(b,9,37.15,0,0);cinemaPoster(b,35,37.15,0,1);districtFrame(b,'cinema',{floor:[17,38,27,42]});
}};
