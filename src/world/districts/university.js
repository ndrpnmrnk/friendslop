import {G,col,tmat,glow,V3} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {beginSection,endSection} from '../sections.js';
export default{id:'university',name:'Университет Хнуре',ground:'pave',build(b){
 const section=beginSection();
 b.tower({x:3,z:2,w:26,d:20,floors:2,fh:4.2,wall:0x9b8b78,winStep:3.1,windowPools:false,doorW:2.8,facadeProps:false,door:{side:'s',at:.5,sign:['ХНУРЕ','#34394c','#dbd2b4']},ladder:{side:'e',at:.65},floor:T.floorTile(),interior(f,k,r){
  f.partition(11,12,28.5,12,3.7,.50,2.4);
  if(k===0){for(const x of [13,16.5,20,23.5,27])for(const z of [15,18.4])f.desk(x,z,Math.PI,false);f.whiteboard(20,1.9,21.66,Math.PI,5.5);f.sign(14,2.8,12.15,0,'АУДИТОРИЯ 101','#5a654e','#e0ddbe',2.5,.35);f.cabinet(27.5,8,.7,2.1,1.8,0x64716c,0,-Math.PI/2);for(const x of [12,16,20,24])f.locker(x,3,0,0x626c7d);}
  else{for(const x of [13,17,21,25]){f.desk(x,17,Math.PI,true);f.m(G.box,col(0x686776),x,1.2,16.4,.5,.22,.30);f.m(G.box,glow(0x95bb8c),x,1.22,16.56,.24,.08,.02);}f.shelf(15,8.8,4.0);f.shelf(23,8.8,4.0);f.whiteboard(21,1.9,21.65,Math.PI,4);f.sign(15,2.8,12.15,0,'ЛАБОРАТОРИЯ','#535d73','#ded2b4',2.7,.35);f.plantPot(27,20.5);}
 }});
 const owned=endSection(section),center=new V3(b.X(16),b.Y,b.Z(12));W.university={...owned,b,center,box:[b.X(3),b.Z(2),b.X(29),b.Z(22)],start:new V3(b.X(16),b.Y,b.Z(24.7)),charges:[[5,23],[27,23],[2,15],[30,8]].map(([x,z])=>new V3(b.X(x),b.Y,b.Z(z))),destroyed:false};
 b.ground(3,23,29,31,T.pave(),3);b.bench(7,27);b.bench(25,27);b.bin(3,29);b.lamp(3,30);b.lamp(29,30);b.spawn(16,29);b.zone('floor',10,25,22,31);b.cats(3,24,9,30);b.bikeRack?.(28,29);b.item('boombox',7,27,.65);for(const[type,x]of [['bao',11],['taco',13],['noodles',15],['burger',17]])b.item(type,x,29,.12);
 b.sign(24,1.5,25.5,0,'ДЕНЬ ОТКРЫТЫХ ДВЕРЕЙ','#6a5969','#e1d5bc',3.3,.5);
}};
