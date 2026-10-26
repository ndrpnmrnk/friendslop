import {G,col,tmat,glow,compose} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {cinemaSeat,cinemaPoster,filmArchive,filmWorkbench,popcorn,cinemaProjection} from '../cinema-props.js';
import {routeLight} from '../wayfinding.js';

// Небольшой старый кинотеатр: все уровни соединены проходами, маршом и пожарной лестницей.
export default{id:'cinema',name:'Последний сеанс',ground:'pave',build(b){
 const dark=col(0x302737),wood=tmat(T.wood()),brass=col(0x967a58),plaster=tmat(T.plaster()),FH=6;
 b.ground(1,1,31,29.5,T.pave(),2);
 b.tower({x:2,z:2,w:28,d:23,floors:1,fh:FH,stairs:false,windows:false,wall:0x70545f,inner:T.wallIn(0x9a7c75),floor:T.floorTile(),facadeProps:false,canopy:false,doorW:3,door:{side:'s',at:.5,style:'glass'},ladder:{side:'e',at:.25},interior(f){
  // Акустические панели, тяжёлые занавеси и экран закреплены на северной стене.
  f.box(16,2.48,18,.2,4.8,dark,{y:.55});f.box(16,2.62,13.9,.16,3.9,brass,{y:1.25});f.box(16,2.72,13.6,.09,3.62,dark,{y:1.39});
  for(const x of[7.5,24.5])f.box(x,2.82,2.4,.37,4.8,tmat(T.cloth(0x683645)),{y:.35});
  for(const x of[2.38,29.62]){for(let z=5;z<17;z+=2.8){f.box(x,z,.18,1.8,2.7,tmat(T.cloth(0x504554)),{y:.45});routeLight(f,x<16?2.5:29.5,z,.32,x<16?Math.PI/2:-Math.PI/2);}}
  // Три невысоких сплошных террасы: кресла прикручены к полу, проход посередине свободен.
  const rows=[[9,.16],[12,.44],[15,.72]];let n=1;for(const[z,y]of rows){f.box(16,z,24,3,y,tmat(T.carpet(0x604452)));for(const x of[5.2,6.9,8.6,10.3,12,13.7,18.3,20,21.7,23.4,25.1,26.8])cinemaSeat(f,x,z,y,n++);for(const x of[14.7,17.3])routeLight(f,x,z+1,y,0,true,0xb2c3a0);}
  // Стена между залом и фойе с широким входом, над ней окно аппаратной.
  for(const[x,w]of[[8.4,12.3],[23.6,12.3]])f.box(x,17.7,w,.18,3.15,plaster);
  f.box(16,17.7,28,.18,.25,plaster,{y:5.75});for(const[x,w]of[[6,7.5],[25.1,9.3]])f.box(x,17.7,w,.18,2.6,plaster,{y:3.15});
  f.stairs(16,17.65,'n',0,.72,2.7,0,.38);
  for(const x of[14.4,17.6])f.box(x,17.71,.12,.26,3.15,brass);f.box(16,17.71,3.3,.26,.12,brass,{y:3.08});
  f.sign(16,2.85,17.82,0,'ЗАЛ 1 · ПОСЛЕДНИЙ СЕАНС','#302737','#e2bf8b',2.7,.32);
  // Касса и витрина: предметы выкладываются относительно столешниц.
  for(const[x,w]of[[8.25,12],[23.75,12]]){f.box(x,24.70,w,.08,.84,wood);f.m(G.box,brass,x,.88,24.64,w,.045,.09);}for(const x of[2.30,29.70]){f.box(x,21,.08,6,.84,wood);f.m(G.box,brass,x,.88,21,.10,.045,6);}
  const ticket=f.counter(6.4,22.15,4.5,1.15,1.02,tmat(T.wood()));ticket.surface.put('mug',-1.25,.12);ticket.surface.put('books',.9,0);
  f.box(6.4,22.15,4.6,1.22,.07,dark,{y:.95});f.box(6.4,23.4,4.8,.16,.65,dark,{y:2.2});f.sign(6.4,2.52,23.50,0,'БИЛЕТЫ · 1 ЗАЛ','#302737','#e4be86',3.8,.4);
  for(const x of[4.15,8.65])f.box(x,22.15,.07,.07,1.1,brass,{y:1.09});f.box(6.4,22.15,4.6,.07,.07,brass,{y:2.12});
  const register=f.prop(6.1,22.15);register.position.y+=1.02;register.add(compose('cinema-tickets50',a=>{a(G.box,col(0x61706a),0,.10,0,.45,.20,.31);a(G.box,dark,0,.21,-.08,.3,.045,.14);for(let i=0;i<6;i++)a(G.box,brass,-.14+i*.055,.21,.07,.028,.018,.05);a(G.cyl8,col(0xc9bd9e),.34,.08,0,.08,.16,.08,0,0,Math.PI/2);a(G.box,col(0xd5c4a2),.52,.012,.1,.29,.024,.12);}));
  const snack=f.counter(23.35,22.2,5.4,1.05,.98,tmat(T.paintMetal(0x6e4851)));snack.surface.put('mug',.35,.05);snack.surface.put('can',1.95,.1);popcorn(f,21.5,22.2,.98);
  f.box(23.35,22.2,5.5,1.14,.06,brass,{y:.92});f.sign(23.35,2.12,24.71,Math.PI,'ПОПКОРН · КАКАО','#4d303b','#e6c998',4.8,.4);
  // Диваны и афиши у глухих стен, входная ось остаётся свободной.
  f.bench(4.2,19.7,Math.PI/2);f.bin(10,23.7);cinemaPoster(f,2.31,20.1,Math.PI/2,0);cinemaPoster(f,29.69,20.1,-Math.PI/2,1);cinemaPoster(f,11.1,24.69,Math.PI,2);
  for(const x of[4.5,10,21.5,27]){f.box(x,24.65,.42,.18,.65,brass,{y:1.5});f.m(G.box,glow(0xe6b87c),x,1.86,24.53,.31,.37,.08);f.light(x,23.5,1.5,0,true);Object.assign(W.lightSources.at(-1),{y:f.Y+1.9,strength:5,range:5});}
  // Аппаратная над фойе. Колонны опираются на плитку; лестница и мостик сбоку.
  f.box(15.8,21,11.4,6,.16,tmat(T.concrete()),{y:3.2});for(const x of[10.3,21.3])for(const z of[18.2,23.8])f.box(x,z,.18,.18,3.2,brass);
  f.box(24.15,18.75,5.5,1.5,.16,tmat(T.concrete()),{y:3.2});f.box(27.55,18.5,1.3,.42,.16,tmat(T.concrete()),{y:3.2});f.stairs(27.55,24,'n',0,3.36,1.3,0,.48);
  // Поручни не закрывают верх лестницы и дверь аппаратной.
  for(const[x,z,w,d]of[[15.8,23.92,11.4,.06],[10.08,21,.06,6],[21.52,21.7,.06,4.4],[24.5,18.0,6.0,.06]]){f.box(x,z,w,d,.9,dark,{y:3.36});f.m(G.box,brass,x,4.3,z,w+.02,.055,d+.02);}
  for(let i=0;i<11;i++){const z=24-(i+.5)*.48,y=(i+1)*3.36/11;routeLight(f,28.05,z,y,0,true);f.m(G.box,brass,28.22,y+.48,z,.04,.96,.04);if(i<10){const rail=f.m(G.box,brass,28.22,y+1.11,z-.24,.05,.05,.56);rail.rotation.x=.566;}}
  const up=f.at(3.36);up.table(16,20.35,1.2);cinemaProjection(f,16,20.35,3.36+.82,{x:16,y:3.2,z:2.78,w:13.2,h:3.35});filmArchive(up,11.1,21.1,Math.PI/2);filmWorkbench(up,15.9,23.05);up.locker(20.6,23.25,Math.PI,0x5b6463);up.sign(16,2.05,24.69,Math.PI,'АППАРАТНАЯ · 35 ММ','#302737','#c4b59b',3,.32);routeLight(up,20.9,18.8,0,0,true);
  f.zone('inside',12.8,5,19.2,7);f.zone('inside',12.8,19,19.2,23.6);
 }});
 // Козырёк и фасад: полосы ламп закреплены под рамой, афиши утоплены в ниши.
 b.box(16,26,20,2.2,.28,dark,{y:3.1});b.box(16,27.05,20,.18,.9,brass,{y:3.22});b.sign(16,3.68,27.15,0,'ПОСЛЕДНИЙ СЕАНС','#41313e','#f3cf8b',18.8,.62);
 for(let x=6.5;x<26;x+=.7)b.m(G.sph,glow(0xe6b77e),x,3.19,27.03,.06,.06,.06);
 for(const x of[5.3,26.7]){b.box(x,25.03,2.8,.17,2.3,dark,{y:.35});cinemaPoster(b,x,25.14,0,x<16?0:1);}
 b.box(16,26.2,5.2,1.1,.12,tmat(T.carpet(0x753f50)));b.marking(16,28.6,2.2,.12,0xc2a97c);b.lamp(11.5,29.6);b.lamp(21,29.6);
 // Доступная крыша и сервисная зона: агрегаты на рамах, кабели идут к аппаратной.
 b.aircon(25.8,5.8,FH);b.box(25.8,8,.07,3.8,.07,dark,{y:FH});b.box(21,9.9,9.6,.07,.07,dark,{y:FH});b.box(16.2,9.9,.5,.5,.75,tmat(T.metal()),{y:FH});
 b.box(16,20.8,5.4,3.3,1.5,tmat(T.corrugated(0x5f6269)),{y:FH});b.box(16,20.8,5.6,3.5,.10,tmat(T.roof()),{y:FH+1.5});for(const x of[14.5,17.5])b.m(G.box,tmat(T.vent()),x,FH+.85,19.13,1.1,.65,.035).rotation.y=Math.PI;
 b.box(16.2,14.53,.07,9.26,.07,dark,{y:FH});b.box(16.2,19.10,.07,.07,1.0,dark,{y:FH});b.at(FH).zone('roof',13.8,19.6,18.2,22,1.6);
 b.at(FH).light(28.9,7.75,1.2,.015,true);b.at(FH).light(20,20.5,1.25,.015,true);for(const x of[13.3,18.7]){b.m(G.box,dark,x,FH+1.17,19.12,.19,.24,.17);b.m(G.box,glow(0xd8b98e),x,FH+1.17,19.02,.13,.15,.04);}
 b.at(FH).bench(7.2,21.2,0);b.at(FH).bin(9.2,21.3);b.at(FH).zone('roof',4.5,10,13,19);
 b.fence(1,2,1,24,1.1,'iron');b.bin(30.6,27.5);b.spawn(16,29);b.spawn(18.5,21);b.zone('floor',11,28,22,30.5);b.cats(2,26,29,30.5);
 b.hw(()=>{b.pumpkin(13.6,26.4,.35);b.pumpkin(18.4,26.4,.3);b.stringLights(6.4,25.3,25.6,25.3,4.65);b.web(2.35,4.9,2.4,Math.PI/2,1.2);b.web(29.65,4.8,17.55,-Math.PI/2,.8);});
}};
