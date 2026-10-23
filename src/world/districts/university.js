import {G,col,tmat,glow,V3} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {beginSection,endSection} from '../sections.js';
import {labBench,displayCase,noticeBoard,archives,detailAction} from '../district-props.js';
import {pitchedRoof,portico} from '../architecture.js';
export default{id:'university',name:'Университет Хнуре',ground:'pave',build(b){
 const section=beginSection();
 b.tower({x:3,z:2,w:26,d:20,floors:3,fh:4.2,wall:0x9b8b78,winStep:3.1,windowPools:false,doorW:2.8,facadeProps:false,door:{side:'s',at:.5,sign:['ХНУРЕ','#34394c','#dbd2b4']},ladder:{side:'e',at:.65},floor:T.floorTile(),interior(f,k,r){
  f.partition(11,12,28.5,12,3.7,.50,2.4);
  if(k===0){for(const x of [13,16.5,20,23.5,27])for(const z of [15,18.4])f.desk(x,z,Math.PI,false);f.whiteboard(20,1.9,21.66,Math.PI,5.5);f.sign(14,2.8,12.15,0,'АУДИТОРИЯ 101','#5a654e','#e0ddbe',2.5,.35);f.cabinet(27.5,8,.7,2.1,1.8,0x64716c,0,-Math.PI/2);for(const x of [12,16,20,24])f.locker(x,3,0,0x626c7d);}
  else if(k===1){for(const x of [13,17,21,25]){f.desk(x,17,Math.PI,true);f.m(G.box,col(0x686776),x,1.2,16.4,.5,.22,.30);f.m(G.box,glow(0x95bb8c),x,1.22,16.56,.24,.08,.02);}f.shelf(15,8.8,4.0);f.shelf(23,8.8,4.0);f.whiteboard(21,1.9,21.65,Math.PI,4);f.sign(15,2.8,12.15,0,'ЛАБОРАТОРИЯ','#535d73','#ded2b4',2.7,.35);f.plantPot(27,20.5);}
  else{for(const x of[13,17,21,25])archives(f,x,20.9,Math.PI);for(const x of[14,21]){f.ptable(x,15.5,1.45);for(const z of[14.1,16.9]){f.chair(x,z,z<15.5?0:Math.PI);f.item('books',x,z<15.5?15.2:15.8,.9);}}f.sofa(26,15,Math.PI/2,0x756b66);f.sign(15,2.8,12.15,0,'БИБЛИОТЕКА','#535d73','#ded2b4',2.7,.35);noticeBoard(f,26.8,9.5,-Math.PI/2);}
  if(k===0){displayCase(f,13.2,8,'science');noticeBoard(f,21.7,8);labBench(f,26,5.4);f.box(26,20.6,1.1,.75,1.15,tmat(T.wood()));f.m(G.box,tmat(T.sign('ЛЕКЦИЯ','#d3c6a5','#4d5145')),26,1.05,21,.75,.3,.025);}
  else if(k===1){labBench(f,26,5.4);detailAction(f,26,5.4,1.02,'coil');archives(f,12.5,4.1);displayCase(f,18.6,3.5,'science');f.sign(22,2.9,2.27,0,'РАДИОФИЗИКА','#4d5f6a','#d9d1ae',4.2,.48);}
  else{archives(f,16,3.2);archives(f,19,3.2);displayCase(f,25.3,4.4,'science');f.sign(23,2.9,2.27,0,'ЧИТАЛЬНЫЙ ЗАЛ','#53655f','#ddd5b7',4,.45);}
 }});
 // Крылья образуют настоящий входной двор; каждый павильон доступен через дверь.
 for(const[x,w,kind]of[[3,7,'МУЗЕЙ НАУКИ'],[22,7,'СТУДЕНЧЕСКИЙ КЛУБ']]){b.tower({x,z:22.25,w,d:4.75,floors:1,fh:5.5,stairs:false,parapet:false,wall:0x8c8171,facadeProps:false,windowPools:false,canopy:false,doorW:2,door:{side:'s',at:.5,sign:[kind,'#535e6a','#ded3ad']},floor:T.floorTile(),interior(f){if(x<16){displayCase(f,6.5,23.2,'science');f.plantPot(8.8,25.8);}else{f.sofa(27.5,24.3,Math.PI/2,0x74677b);f.ptable(24.5,24.2,.8);f.item('books',24.5,24.2,.9);}}});pitchedRoof(b,x+w/2,24.65,w+.3,5.1,5.5,1.0);}
 portico(b,16,24.4,9.3,2.55,6.2);b.sign(16,7.6,22.22,0,'ХНУРЕ · НАУКА НОЧЬЮ','#4d5868','#d9cfaa',9,.75);
 // Пилястры, верхний карниз и кровля продолжают конструкцию фасада.
 for(const x of[3.2,10.5,21.5,28.8])b.box(x,22.10,.42,.30,12.5,tmat(T.concrete()));
 b.box(16,21.9,26.5,.55,.25,tmat(T.concrete()),{y:12.5});pitchedRoof(b,22.5,12.8,12.6,17.0,12.6,1.55);pitchedRoof(b,8.8,14.8,11.2,12.6,12.6,1.55);b.m(G.box,tmat(T.vent()),25,13.05,3.2,2,.8,1.5);b.solid(25,3.2,2,1.5,12.6,.8);
 pitchedRoof(b,16,22.0,9.6,.65,12.6,1.35);b.sign(16,13.18,22.34,0,'ХНУРЕ','#7e7865','#d4c7a0',2.5,.30);
 b.sign(25.5,1.8,27.14,0,'ДЕНЬ ОТКРЫТЫХ ДВЕРЕЙ','#6a5969','#e1d5bc',3.3,.5);
 const owned=endSection(section),center=new V3(b.X(16),b.Y,b.Z(14.5));W.university={...owned,b,center,box:[b.X(2.5),b.Z(2),b.X(29.5),b.Z(27.2)],start:new V3(b.X(16),b.Y,b.Z(28.7)),charges:[[5.5,27.9],[26,27.9],[2,15],[30,8]].map(([x,z])=>new V3(b.X(x),b.Y,b.Z(z))),destroyed:false};
 b.ground(3,27.3,29,31,T.pave(),3);b.bench(7,29);b.bench(25,29);b.bin(3,29);b.lamp(3,30);b.lamp(29,30);b.spawn(16,30);b.zone('floor',10,27.5,22,31);b.cats(3,28,9,30);b.bikeRack?.(28,30);b.item('boombox',7,29,.65);for(const[type,x]of [['bao',11],['taco',13],['noodles',15],['burger',17]])b.item(type,x,30,.12);
}};
