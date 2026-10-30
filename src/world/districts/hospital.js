import {G,col,tmat,glow} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {medicalChart,medicalTray} from '../medical-props.js';
import {districtFrame,localAnimation,districtClock} from '../district-motion.js';
import {sfx} from '../../core/sfx.js';
export default{id:'hospital',name:'Больница',ground:'dirt',size:44,build(b){
 const FH=3.8,gurneys=[];
 b.tower({x:3,z:2,w:38,d:25,floors:2,fh:FH,wall:0x82988b,lit:.18,windowPools:false,facadeProps:false,lights:false,doorW:3,door:{side:'s',at:.5,sign:['БОЛЬНИЦА №13','#34594e','#dfdec3']},gaps:[{side:'e',at:.5}],fireEscape:{side:'w',at:.6},floor:T.floorTile(),interior(f,k,r){
  // Коридор шириной четыре метра, с карманами для транспорта и сквозным выходом.
  const north=14,south=18,mid=16;
  for(const[xa,xb]of[[r.x0,15],[15,28],[28,r.x1]]){const cx=(xa+xb)/2;f.partition(xa,north,xb,north,3.6,.5,2.2);if(xa>r.x0)f.box(xa,10,.15,8,3.6,tmat(T.plaster()));
   if(xa===15){f.xray(cx,r.z0+.7,0);f.cupboard(xb-.6,r.z0+.4);}else{for(const x of[xa+2,xb-2])f.bed(x,10,Math.PI,0x93afa3);medicalChart(f,cx,north-.08,1.8,Math.PI);}
   if(cx>13)f.flickerLamp(cx,mid,3.5);
  }
  for(const[xa,xb]of[[4,17],[27,40]]){const cx=(xa+xb)/2;f.partition(xa,south,xb,south,3.6,.5,2.4);for(const x of[xa+2,xb-2])f.bed(x,23,Math.PI,0xb7b8a1);f.cupboard(cx,25.8,Math.PI);medicalTray(f,cx,25.8,.942);}
  if(!k){f.desk(31,25,Math.PI,true);f.phoneSpot(31,25,[0,1]);f.bench(12,25,Math.PI);f.waterCooler(38,25);}else{f.locker(31,25.8,Math.PI,0x6b7c72);f.kitchen(36,25.8,3,Math.PI);}
  for(const x of[7,37]){const before=W.pushables.length;f.ride('gurney',x,mid,x<22?Math.PI/2:-Math.PI/2);gurneys.push(W.pushables[before]);}f.sign(22,2.5,26.7,Math.PI,'ПАЛАТЫ · РЕНТГЕН','#34594e','#dfdec3',4,.4);
 }});
 // Полосы маршрута и сирена заранее предупреждают о разгоне каталок.
 for(const y of[0,FH]){b.at(y).hazardFloor(22,14.3,31,.25);b.at(y).hazardFloor(22,17.7,31,.25);b.at(y).hazard({x0:6,z0:14,x1:38,z1:18,y0:0,y1:2,active:()=>districtClock()%32<5});}
 const lamps=[b.warnLamp(6,2.5,16),b.warnLamp(38,2.5,16)];let last=-1,sounded=-1;
 localAnimation(()=>{const p=districtClock()%32,warn=p<2;for(const l of lamps)l.set(p<5?Number(Math.sin(p*16)>0):0);const cycle=Math.floor(districtClock()/32);if(warn&&sounded!==cycle){sounded=cycle;sfx('alarm',{at:lamps[0].m.position,range:28});}if(cycle!==last&&p>=2&&p<5){last=cycle;if(!W.net?.replica)for(const cart of gurneys)if(cart&&!cart.rider&&!cart.grabbed){cart.vx=cart.x<b.X(22)?8:-8;cart.vz=0;}}},...lamps.map(l=>l.m));
 b.ground(18,27,26,43,T.concrete(),3);b.car(34,34,Math.PI/2,0xe2dfd3,'van');b.m(G.box,glow(0x729ebe),34,1.6,34,.5,.12,.2);
 for(const[x,z]of[[7,33],[11,39],[38,39]])b.deadTree(x,z);b.fence(2,42,17,42,1.2,'iron');b.fence(27,42,42,42,1.2,'iron');b.dumpster(40,31);b.bin(29,29);b.ride('gurney',15,32,0);
 b.grabTarget({x:10,z:30,r:1.2,kind:'fling',dir:[1,0],label:'каталка'});b.softMist(2,29,42,43,.2);districtFrame(b,'hospital');b.zone('floor',5,29,15,40);b.hw(()=>b.pumpkin(28,28));
}};
