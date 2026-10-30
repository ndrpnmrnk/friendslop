import {G,col,tmat,smat} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {storageBay} from '../storage.js';
import {districtFrame,movingDeck,shuttle} from '../district-motion.js';
export default{id:'port',name:'Порт',ground:'concrete',size:44,holes:[[.4,28,43.6,43.6]],build(b){
 const WY=-1.2,FL=-1.65,stone=smat(T.stone()),dark=col(0x34313e);
 b.box(22,35.8,43.2,15.6,.22,smat(T.concrete()),{y:FL-.22});b.waterRect(.4,28,43.6,43.6,WY);
 b.box(22,27.9,44,.3,1.9,stone,{y:FL});for(const x of[.2,43.8])b.box(x,35.8,.4,16,1.9,stone,{y:FL});b.box(22,43.8,44,.4,1.9,stone,{y:FL});
 for(const x of[6,22,38])b.ladder(x,28.1,'s',.15,FL);
 b.pier(8,27.7,8,40,.3);b.pier(32,27.7,32,38,.3);b.pier(29,38,37,38,.3);
 b.box(39.5,39.5,6,6,2,stone,{y:FL-.2});const H=b.lighthouse(39.5,39.5);b.zipline(39.5,H+2.3,37.4,26,2.5,24);
 b.boat(11,35,Math.PI/2,WY+.2);b.floatBoat(18,36,.3,WY+.05);b.ride('ring',26,34,0,WY+.06);
 for(const x of[5,16,27])W.spots.fish.push({x:b.X(x),z:b.Z(27),y:b.Y,f:[0,1],wx:b.X(x),wz:b.Z(32),wy:b.Y+WY+.08,cx:b.X(x),cz:b.Z(34),R:3.4,district:'Порт',label:'набережная'});
 // Грузовой двор занимает север, широкая ось вывоза ведёт прямо к крану.
 for(const[x,z,w,d,c,y]of[[9,5,12,3,0x6b805e,0],[9,8.2,12,3,0x80614e,0],[10,8.2,9,3,0x526f8c,2.6],[36,8,3,12,0x786087,0]])b.container(x,z,w,d,c,y);
 b.ladder(15.1,8.2,'e',5.2);b.climbTrim(10,8.2,9,3,5.2);b.plank(15,8.2,21,8.2,5.2,1.2);
 b.tower({x:2,z:14,w:11,d:9,floors:1,fh:4,wall:0x8b7966,stairs:false,doorW:2.8,door:{side:'e',at:.5,style:'metal',sign:['ПОРТОВЫЙ СКЛАД','#374a55','#dfcfac']},floor:T.concrete(),interior(f){f.shelf(4,16,3,0,'office');f.crate(5,21);f.ride('cart',9,20,0);}});
 storageBay(b,35,19,9,2,'port');b.nets(2,25,11,25);b.lifebuoy(14,27);b.lifebuoy(30,27);
 // Реальный подвешенный контейнер с твёрдой палубой, а не декоративная качающаяся коробка.
 for(const x of[19,29]){for(const z of[16,38])b.box(x,z,.5,.5,11.65,col(0xc7a34b),{y:FL});b.box(x,27,.45,23,.4,col(0xc7a34b),{y:10});b.ladder(x-.3,16,'n',10);}
 b.box(24,16,11,1.4,.3,tmat(T.grate()),{y:10});b.box(24,27,11,.5,.5,col(0xc7a34b),{y:10});
 const deck=movingDeck(b,{name:'cargo-container',x:24,z:23,w:5,d:3,h:2.6,rails:false,color:0x4d7190,route:t=>{const k=shuttle(t,28);return{x:24,z:20+14*k,y:2.6+1.3*Math.sin(k*Math.PI)};}});
 for(const x of[-2,2]){const cable=b.m(G.box,dark,24+x,6,23,.04,6,.04);cable.userData.noNet=true;deck.g.add(cable);cable.position.set(x,3.5,0);}
 b.container(24,17,5,3,0x6c715d);b.ladder(21.4,17,'w',2.6);b.hazardFloor(24,26,6,.5);
 b.grabTarget({x:18,z:27,r:1.4,kind:'dunk',dir:[0,1],label:'набережная'});b.bench(20,26,Math.PI);b.bench(35,26,Math.PI);b.bin(15,23);
 b.ride('barrel',15,10);b.ride('barrel',17,10);b.crate(38,23);b.birds('gull',2,22,42,28,6);
 districtFrame(b,'port',{spawn:[22,12],floor:[15,10,29,16],waterfront:true});b.zone('floor',14,23,41,27);b.hw(()=>b.pumpkin(14,26));
}};
