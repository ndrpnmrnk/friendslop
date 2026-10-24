import {splitStairs} from '../split-stairs.js';
import {G,col,tmat,glow,V3} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {beginSection,endSection} from '../sections.js';
import {labBench,displayCase,noticeBoard,archives,detailAction} from '../district-props.js';
import {pitchedRoof,portico} from '../architecture.js';
export default{id:'university',name:'Университет Хнуре',ground:'pave',build(b){
 const section=beginSection();
 b.tower({x:3,z:2,w:26,d:20,floors:3,fh:4.2,stairs:false,stairHole:[10.7,8.9,21.3,17.6],wall:0x9b8b78,winStep:3.1,windowPools:false,doorW:2.8,facadeProps:false,door:{side:'s',at:.5,sign:['ХНУРЕ','#34394c','#dbd2b4']},ladder:{side:'e',at:.65},floor:T.floorTile(),interior(f,k,r){
  if(k===0){
   f.box(6.6,18.7,4.5,1.1,1.05,tmat(T.wood()));f.sign(6.6,1.55,19.3,0,'ПРИЁМНАЯ','#455b5b','#d9d0ae',2.5,.4);f.item('monitor',6.4,18.6,1.1);f.item('books',5.2,18.7,1.1);f.chair(6.6,17.6,0);
   for(const z of[15.5,18.2])f.bench(26.8,z,-Math.PI/2);f.plantPot(27.6,20.6);noticeBoard(f,27.5,13.5,-Math.PI/2);displayCase(f,5.2,13.0,'science');
   for(const x of[6,9])for(const z of[5.5,8.3])f.desk(x,z,Math.PI,false);for(const x of[24,27])f.locker(x,4,0,0x626c7d);
   f.sign(16,2.5,2.31,0,'ХНУРЕ · ПРИЁМНАЯ','#49545b','#ddd1b3',6,.55);
  }else{
   for(const x of[9.1,22.9])f.partition(x,3,x,20.4,3.7,.43,2.4);
   if(k===1){for(const x of[5.5,8.3])for(const z of[5,8,13.5,17])f.desk(x,z,Math.PI,false);f.whiteboard(6.5,1.8,2.35,0,4.5);for(const z of[5.4,14.5])labBench(f,25.6,z);detailAction(f,25.6,14.5,1.02,'coil');displayCase(f,24,19,'science');}
   else{for(const x of[4.2,27.8])for(const z of[5,8,14,18])archives(f,x,z,x<16?Math.PI/2:-Math.PI/2);for(const x of[6.5,25.5])for(const z of[6.7,15]){f.ptable(x,z,1.3);f.chair(x,z+1.0,Math.PI);f.item('books',x,z,.9);}}
   f.sign(9.2,2.6,10.4,-Math.PI/2,k===1?'АУДИТОРИЯ 201':'БИБЛИОТЕКА','#4f6158','#ded3b4',2.4,.4);f.sign(22.8,2.6,10.4,Math.PI/2,k===1?'ЛАБОРАТОРИЯ':'ЧИТАЛЬНЫЙ ЗАЛ','#505d70','#ded3b4',2.4,.4);
  }

 }});
 splitStairs(b,W.buildings.at(-1),4.2,3);
 // Крылья образуют настоящий входной двор; каждый павильон доступен через дверь.
 for(const[x,w,kind]of[[3,7,'МУЗЕЙ НАУКИ'],[22,7,'СТУДЕНЧЕСКИЙ КЛУБ']]){b.tower({x,z:22.25,w,d:4.75,floors:1,fh:5.5,stairs:false,parapet:false,wall:0x8c8171,facadeProps:false,windowPools:false,canopy:false,doorW:2,door:{side:'s',at:.5,sign:[kind,'#535e6a','#ded3ad']},floor:T.floorTile(),interior(f){if(x<16){displayCase(f,6.5,23.2,'science');f.plantPot(8.8,25.8);}else{f.sofa(27.5,24.3,Math.PI/2,0x74677b);f.ptable(24.5,24.2,.8);f.item('books',24.5,24.2,.9);}}});pitchedRoof(b,x+w/2,24.65,w+.3,5.1,5.5,1.0);}
 portico(b,16,24.4,9.3,2.55,6.2);b.sign(16,7.6,22.22,0,'ХНУРЕ · НАУКА НОЧЬЮ','#4d5868','#d9cfaa',9,.75);
 // Пилястры, верхний карниз и кровля продолжают конструкцию фасада.
 for(const x of[3.2,10.5,21.5,28.8])b.box(x,22.10,.42,.30,12.5,tmat(T.concrete()));
 b.box(16,21.9,26.5,.55,.25,tmat(T.concrete()),{y:12.5});pitchedRoof(b,22.5,12.8,12.6,17.0,12.6,1.55);pitchedRoof(b,8.8,14.8,11.2,12.6,12.6,1.55);b.m(G.box,tmat(T.vent()),25,13.05,3.2,2,.8,1.5);b.solid(25,3.2,2,1.5,12.6,.8);
 pitchedRoof(b,16,22.0,9.6,.65,12.6,1.35);b.sign(16,13.18,22.34,0,'ХНУРЕ','#7e7865','#d4c7a0',2.5,.30);
 b.sign(25.5,1.8,27.14,0,'ДЕНЬ ОТКРЫТЫХ ДВЕРЕЙ','#6a5969','#e1d5bc',3.3,.5);
 const owned=endSection(section),center=new V3(b.X(16),b.Y,b.Z(14.5));W.university={...owned,b,center,box:[b.X(2.5),b.Z(2),b.X(29.5),b.Z(27.2)],start:new V3(b.X(16),b.Y,b.Z(28.7)),charges:[[5.5,27.9],[26,27.9],[2,15],[30,8]].map(([x,z])=>new V3(b.X(x),b.Y,b.Z(z))),destroyed:false};
 b.ground(3,27.3,29,31,T.pave(),3);b.bench(7,29);b.bench(25,29);b.bin(3,29);b.lamp(3,30);b.lamp(29,30);b.spawn(16,30);b.zone('floor',10,27.5,22,31);b.cats(3,28,9,30);b.bikeRack?.(28,30);b.item('boombox',7,29,.65);
}};
