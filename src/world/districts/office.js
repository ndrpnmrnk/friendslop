import {THREE,G,col,tmat,lam,glow} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {districtFrame,movingDeck,shuttle} from '../district-motion.js';
export default{id:'office',name:'Бизнес-центр',ground:'pave',size:44,holes:[[26,2.4,29.4,5.8]],build(b){
 const N=6,FH=3.8,H=N*FH;
 b.tower({x:10,z:2,w:24,d:20,floors:N,fh:FH,wall:0x56647e,brick:false,facadeProps:false,windowPools:false,doorW:3,elevator:{x0:26,z0:2.4,x1:29.4,z1:5.8},fireEscape:{side:'w',at:.48},door:{side:'s',at:.5,style:'glass',sign:['ПОЛНОЛУНИЕ','#2c2a3d','#e1cba2']},floor:T.carpet(),interior(f,k,r){
  const back=r.z1-1,front=r.z0+1.5;
  const wall=tmat(T.plaster()),trim=col(0x7c7c88);f.box(30.7,5.9,.2,7,FH,wall);f.box(22.9,5.9,.2,7,FH,wall);
  for(const [x,w]of[[24.65,3.5],[29.85,1.7]])f.box(x,9.35,w,.2,FH,wall);f.box(27.7,9.35,2.6,.2,FH-2.5,wall,{y:2.5});
  f.m(G.box,trim,26.8,FH-.18,9.46,7.8,.12,.06);f.sign(27.7,2.8,9.48,0,'ЛИФТ','#333343','#e3cca1',2,.3);f.rug(27.7,7.7,3,2,'#60566a','#c5b49a');


  if(!k){f.counter(22,12,4,1,1.05,tmat(T.wood())).surface.put('monitor',0,0);f.sofa(13,back,Math.PI);f.sofa(31,back,Math.PI);f.rug(22,17,4,2.5);f.waterCooler(32.8,10);f.plantPot(11.2,back);return;}
  if(k===N-1){f.kitchen(33.3,14,3,-Math.PI/2);for(const x of[15,22,29])for(const z of[13,18]){f.ptable(x,z,.9);f.chair(x,z+1,Math.PI);}return;}
  for(const x of[13,17,22])for(const z of[front+2,back-3])f.desk(x,z,k%2?0:Math.PI,true);
  f.vitrine(29,15,6.4,2.2,'x',.2);f.ptable(29,18,1.3);for(const x of[27.5,30.5])f.chair(x,18,x<29?Math.PI/2:-Math.PI/2);f.whiteboard(33.6,1.7,18,-Math.PI/2,2.4);
  f.shelf(25,back,2.5,Math.PI,'office');f.ride('chair',23,13,0);if(k%2)f.safe(11,back,Math.PI/2);
 }});
 b.marking(22,28,8,.15,0xb8a282);for(const x of[13,31]){b.aircon(x,5,H);b.planter(x,29,3,1.5,.5,'flowers');b.bench(x,33,Math.PI);}
 b.box(30,12,2,2,.6,tmat(T.metal()),{y:H});b.climbTrim(22,12,24,20,H);
 // Люлька с открытыми торцами: посадка с тротуара, высадка на крышу.
 for(const z of[13,17]){b.m(G.box,col(0x454453),36,H/2,z,.06,H,.06);b.box(35.4,z,2,.4,.15,tmat(T.metal()),{y:H+.5});}
 movingDeck(b,{name:'window-cradle',x:36,z:15,w:3,d:3,color:0x6a7b84,route:t=>({x:36,z:15,y:.15+shuttle(t,32)*(H-.15)})});
 b.box(34.5,15,1.2,2,.16,tmat(T.grate()),{y:H-.16});b.hazardFloor(36,18,3,.5);
 b.zipline(32,H+2.8,20,38,2.6,37);b.utilityBox(7,23,Math.PI/2);b.bikeRack(5,11,4,Math.PI/2);b.dumpster(39,7);
 b.ground(11,24,33,42,T.cobble(),3);b.planter(22,34,5,2,.5,'shrub');b.newsBox(15,40);b.postBox(29,40);
 b.grabTarget({x:38,z:24,r:1.2,kind:'fling',dir:[0,1],label:'люлька'});districtFrame(b,'office',{floor:[15,35,29,42]});
 b.hw(()=>{b.pumpkin(18,23);b.pumpkin(26,23);b.stringLights(12,23,32,23,3.2);});
}};
