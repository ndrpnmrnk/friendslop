import {THREE,G,col,tmat,paint} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {districtFrame} from '../district-motion.js';
// Рампа занимает западную половину, фанбокс и длинные линии трюков - восточную.
export default{id:'skatepark',name:'Скейт-парк',ground:'asphalt',size:44,build(b){
 b.ground(1,1,43,24,T.concrete(),4);
 b.quarterPipe(6,11,12,3,-Math.PI/2,1.2);b.quarterPipe(17,11,12,3,Math.PI/2,1.2);
 for(const z of[4,18])b.marking(11.5,z,7,.12,0xd7c6a5);
 b.wedge(25,9,3,4,.75,Math.PI/2);b.box(29,9,5,4,.75,tmat(T.concrete()));b.wedge(33,9,3,4,.75,-Math.PI/2);
 b.grindRail(27,8.2,31,8.2,1.15);b.grindRail(24,18,39,18,.5);b.wedge(39,7,3,3,1.1,Math.PI);
 b.wedge(23,22,3,3,.55,0);b.climbTrim(29,9,5,4,.75);
 for(const[x,z,ry]of[[11,11,0],[23,5,1],[36,15,-1]])b.ride('skate',x,z,ry);b.ride('scooter',36,21,0);
 b.box(22,1,40,.25,2,tmat(T.brickWall()));for(const x of[8,22,36])b.graffiti(x,1.1,1.15,0,3,2);
 // Компактное поле сохранено для общего футбольного события, без препятствий на газоне.
 const x0=4,x1=40,z0=29,z1=40,cx=22,cz=34.5;b.ground(3,28,41,41,T.grass(),3);
 for(const[x,z,w,d]of[[22,29,36,.1],[22,40,36,.1],[4,34.5,.1,11],[40,34.5,.1,11],[22,34.5,.1,11]])b.marking(x,z,w,d,0xe4d9c4);
 const ring=b.m(new THREE.RingGeometry(2,2.1,24),paint(0xe4d9c4),cx,.035,cz);ring.rotation.x=-Math.PI/2;
 b.goal(4.3,cz,Math.PI/2);b.goal(39.7,cz,-Math.PI/2);W.pitch={x0:b.X(x0),x1:b.X(x1),z0:b.Z(z0),z1:b.Z(z1),y:b.Y,cx:b.X(cx),cz:b.Z(cz)};
 b.bleachers(22,26,18,2,0);b.scoreboard(22,42,Math.PI);for(const x of[2,42])b.floodlight(x,27,x<22?.7:-.7,7);
 b.item('ball',22,34);b.bench(41.5,11,-Math.PI/2);b.bin(41,20);b.grabTarget({x:6,z:24,r:1.2,kind:'bounce',label:'рампа'});
 districtFrame(b,'skatepark',{spawn:[20,23],floor:[21,12,39,23]});b.zone('floor',6,30,38,39);b.hw(()=>b.pumpkin(41,24));
}};
