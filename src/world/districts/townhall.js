import {G,col,tmat,glow} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {mayorModel} from '../../characters/mayor.js';
import {npcBody,walkNPC,flat} from '../../missions/encounter-motion.js';
import {tickNPCHit} from '../../game/impacts.js';
import {archives,noticeBoard,displayCase,civicDetails,detailAction} from '../district-props.js';
import {pitchedRoof,portico} from '../architecture.js';
import {mayorLife} from '../../game/mayor-life.js';
export default{id:'townhall',name:'Мэрия',ground:'pave',build(b){
 b.tower({x:3,z:2,w:26,d:17,floors:2,fh:4,wall:0xc4b397,winStep:3,windowPools:false,doorW:2.6,door:{side:'s',at:.50,sign:['МЭРИЯ','#384f55','#e0d5ad']},ladder:{side:'e',at:.45},floor:T.floorTile(),interior(f,k,r){
  if(k===0){f.box(19,9,8,1.1,1.0,tmat(T.cabinet(0x78674f)));f.m(G.box,tmat(T.sign('ПРИЁМ ГРАЖДАН','#ddd4b8','#354343')),19,1.55,8.9,2.5,.40,.03);for(const x of [13,16,19,22])f.chair(x,14,Math.PI);f.sofa(26,15,Math.PI/2,0x586868);f.plantPot(11,16);f.waterCooler(27,8);f.cabinet(28,11,.7,1.7,2,0x766349,0,-Math.PI/2);
   archives(f,13.3,4.2);archives(f,16,4.2);displayCase(f,25.7,4.2,'trophies');detailAction(f,18.6,9,1.04,'stamp');noticeBoard(f,26.8,17.9);
   for(const x of[17.9,20.1])f.m(G.box,col(0x56655c),x,1.25,8.9,.035,.50,.035);
   f.m(G.box,tmat(T.sign('ТАЛОНЫ · ОКНО 1','#c7bca0','#405752')),22.6,1.00,9.57,1.5,.18,.025);for(let i=0;i<4;i++){f.m(G.box,col(0xc2b79d),15.9+i*.38,1.09,8.9,.3,.06,.42);f.m(G.box,col(0x8f775f),15.9+i*.38,1.13,8.9,.26,.02,.36);}f.sign(21,2.9,2.27,0,'ГОРОДСКОЙ АРХИВ','#52645f','#d6ceb0',4.4,.45);
  }
  else{f.partition(11,11,28,11,3.5,.55,2.2);f.desk(21,15,Math.PI,true);f.shelf(14,17.8,3.6,Math.PI,'office');f.safe(27.5,14,-Math.PI/2);f.sofa(14,14,Math.PI/2,0x675e70);f.rug(21,14,6,4,'#45686a','#b4ab86');f.plantPot(27,17);f.whiteboard(21,1.8,11.16,0,3);
   archives(f,13.3,4);archives(f,16,4);archives(f,18.7,4);displayCase(f,26.7,15.8,'trophies');f.ptable(23,6.9,1.8);for(const x of [21.5,24.5]){f.chair(x,6.9,x<23?Math.PI/2:-Math.PI/2);f.item('books',x,6.6,.9);}noticeBoard(f,25.8,10.72,Math.PI);f.sign(16.1,2.9,11.14,0,'КАБИНЕТ МЭРА','#4e6066','#d7cba5',3.5,.42);
  }
 }});
 portico(b,16,22,10.0,2.7,4.6);pitchedRoof(b,8,13,10,9.8,8,1.7);pitchedRoof(b,24,10.5,10,16.4,8,1.7);
 const top=b.at(8);top.tower({x:13,z:7,w:6,d:6,floors:1,fh:3.8,stairs:false,parapet:false,wall:0xb6a88a,facadeProps:false,windowPools:false,canopy:false,doorW:2,door:{side:'s',at:.5},floor:T.floorTile(),interior(f){f.ptable(16,9.8,1.0);f.item('books',16,9.8,.9);}});pitchedRoof(b,16,10,6.4,6.4,11.8,1.25);
 b.m(G.cyl12,col(0xd7ceb0),16,10.93,13.15,.48,.04,.48).rotation.x=Math.PI/2;b.m(G.box,col(0x4d5d54),16,11.07,13.18,.035,.30,.02);b.m(G.box,col(0x4d5d54),16.12,10.93,13.18,.25,.03,.02);
 for(const x of[3.2,9.7,22.3,28.8])b.box(x,19.12,.38,.30,7.9,tmat(T.concrete()));
 b.ground(3,20.5,29,31,T.pave(),3);b.bench(6,25,Math.PI/2);b.bench(23,21.6);b.plantPot(9,21);b.plantPot(22,21);b.lamp(3,30);b.lamp(29,30);b.spawn(16,28);b.zone('floor',10,23,22,30);b.zone('nook',2,20,8,24);
 civicDetails(b,6.1,21.7);b.sign(16,4.25,19.20,0,'МЭРИЯ · ПРИЁМ ГРАЖДАН','#394f55','#ddd1aa',8,.62);
 for(const x of [11.7,20.3]){b.m(G.cyl6,col(0x777a6b),x,2.55,20.4,.035,5.1,.035);b.m(G.box,tmat(T.cloth(x<16?0x79705e:0x536f70)),x+.35,4.0,20.4,.70,1.18,.035);b.solid(x,20.4,.1,.1,0,5.1);}
 const m=mayorModel();m.root.position.set(b.X(19.5),b.Y,b.Z(24.3));W.group.add(m.root);W.keep.push(m.root);const mayor={...npcBody(m),kind:'mayor',r:.72,h:2.2,home:m.root.position.clone(),busy:false,t:0,lard:false,arms:m.arms,face:m.face};W.mayor=mayor;const route=[[19.5,24.3],[16,24.3],[16,17],[20,17],[16,17],[16,24.3],[22,25.5]].map(([x,z])=>m.root.position.clone().set(b.X(x),b.Y,b.Z(z)));W.animated.push(mayorLife(mayor,route));
 W.salonSite={x:b.X(27),y:b.Y,z:b.Z(27.8)};
}};
