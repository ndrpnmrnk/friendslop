import {grillVolcano} from '../grill-volcano.js';
import {G,col,tmat,glow} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {addCanopy} from '../canopies.js';
import {districtFrame,warningHazard,districtClock} from '../district-motion.js';
import {knockDown} from '../../game/actors.js';
export default{id:'foodcourt',name:'Фудкорт',ground:'pave',size:44,build(b){
 // Север: двухэтажный ТЦ. Входная ось и путь к лестнице свободны.
 b.tower({x:3,z:2,w:38,d:15,floors:2,fh:3.8,wall:0x665171,windowPools:false,facadeProps:false,doorW:3,doors:[{side:'s',at:.5,style:'glass',sign:['ПОЛНОЧЬ · ФУДКОРТ','#302538','#ead3a5']},{side:'e',at:.65}],floor:T.floorTile(),interior(f,k,r){
  if(k===0){for(const[x,label,c]of[[17,'ПИЦЦА',0xb35c49],[27,'ШАУРМА',0x6a8052],[36,'НАПИТКИ',0x526c85]]){const counter=f.counter(x,5,4.5,1,1.05,tmat(T.cabinet(c)));counter.surface.put('mug',-.9,0);f.sign(x,2.4,2.3,0,label,'#302538','#ead3a5',3,.45);W.spots.pickup.push({x:f.X(x),y:f.Y,z:f.Z(6.7),f:[0,-1],district:'Фудкорт',label:label.toLowerCase()});}
   for(const x of[9,16,29,36]){f.ptable(x,12,.9);f.chair(x-1,12,Math.PI/2);f.chair(x+1,12,-Math.PI/2);}f.vending(39.8,10,-Math.PI/2);
  }else{for(let i=0;i<6;i++)f.arcade(16+i*3.8,3,0,[0x765590,0x657b63,0xc37940][i%3]);f.sofa(14,15,Math.PI);f.sofa(30,15,Math.PI);f.ptable(36,12,1);f.chair(36,13.2,Math.PI);f.item('boombox',36,12,.85);}
 }});
 b.climbTrim(22,9.5,38,15,7.6);b.zipline(38,10.3,15,37,2.2,36);
 // Запад: два фудтрака. Юг: столики под тремя зонтами; центр 19..26 - проход.
 b.foodTruck(9,23,0xbfa451,'ТАКО','#8d4f40');b.foodTruck(9,34,0x5d7793,'БУРГЕРЫ','#37434e');
 for(const[x,z]of[[32,23],[37,32],[29,37]]){b.table(x,z,1);b.chair(x-1.2,z,Math.PI/2);b.chair(x+1.2,z,-Math.PI/2);b.m(G.cyl6,col(0x393342),x,1.9,z,.04,3.8,.04);b.solid(x,z,.12,.12,0,3.8);addCanopy(b,x,z,{w:3.5,edge:3.35,rise:.5,colors:['#875568','#eadbc1']});}
 b.surface(9.6,24.3,3,.4,1.23).put('taco',.4,0);b.surface(9.6,35.3,3,.4,1.23).put('burger',.4,0);
 grillVolcano(b,22,28);
 b.item('extinguisher',18.3,28);b.m(G.box,tmat(T.sign('ОГНЕТУШИТЕЛЬ','#6b3239','#f2d7bc')),18.3,1.5,27.4,.7,.5,.06);
 b.grabTarget({x:5,z:29,r:1.1,kind:'slow',t:4,label:'мешки муки'});b.trashBags(4,28,2);b.bin(40,20);b.bin(14,39);
 districtFrame(b,'foodcourt');b.zone('floor',20,20,26,35);b.hw(()=>{b.stringLights(5,19,39,19,3.3);b.pumpkin(39,38);});
}};
