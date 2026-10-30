import {G,col,tmat} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {pallet} from '../district-props.js';
import {conveyor,warningHazard,districtFrame} from '../district-motion.js';
export default{id:'factory',name:'Жировой завод',ground:'pave',size:44,build(b){
 const metal=tmat(T.paintMetal(0x65776c)),steel=tmat(T.metal()),brick=tmat(T.brickWall());
 // Open-front sawtooth workshop: two broad exits, unobstructed loading aisle.
 b.box(22,3,38,.4,7,brick);for(const x of[3,41])b.box(x,15,.4,24,7,brick);
 for(const x of[3.5,15.8,28.2,40.5]){b.box(x,26,.25,.25,6.5,metal);b.m(G.box,metal,x,6.7,15,.18,.22,24);}
 for(const x of[9.5,22,34.5]){const roof=b.m(G.box,tmat(T.roof()),x,7.1,15,12.6,.18,25);roof.rotation.z=-.12;b.m(G.box,tmat(T.carGlass(0x778d85)),x+6,7.3,15,.14,.7,25);}
 b.sign(22,5.3,26.2,0,'ЖИРОВОЙ ЗАВОД','#33463c','#e5d2a4',13,.8);
 // Single horizontal belt feeds the press, as in the district plan.
 conveyor(b,22,15,25,3,{axis:'x',speed:1.8,y:.32});
 for(const z of[12.8,17.2])b.box(36,z,.3,.3,5.7,metal);
 b.box(36,15,3.5,5,.4,metal,{y:5.5});const press=b.m(G.box,steel,36,4.4,15,3.2,.5,3.5);
 const visual=(on,t)=>{const k=on?Math.min(1,t/.35):0;press.position.y=b.Y+4.4-k*3.7;};visual.roots=[press];warningHazard(b,{name:'factory-press',x:36,z:15,w:3.5,d:3.5,y:.35,period:24,warning:2,active:3,hit:a=>{a.stun=Math.max(a.stun||0,3);},visual});
 b.m(G.cyl12,metal,10,1.9,7,2.2,3.8,2.2);b.m(G.sph10,metal,10,3.8,7,2.2,.55,2.2);b.solid(10,7,4.4,4.4,0,4.2);b.m(G.cyl8,steel,10,6,7,.3,4,.3);
 b.box(22,5,28,2,.16,tmat(T.grate()),{y:4});b.ladder(8,5,'s',4.16);for(const x of[8,36])b.box(x,5,.15,.15,4,metal);
 for(const x of[29,32,35]){b.barrel(x,32);b.barrel(x,35);}pallet(b,32,38);b.crate(5,31);b.bench(7,38);
 b.hazard({x0:9.5,z0:13.5,x1:34.5,z1:16.5,y0:0,y1:2,active:()=>true});
 b.grabTarget({kind:'slow',x:12,z:15,r:1.3,y:.37,label:'конвейер'});
 W.factorySite={start:{x:b.X(22),y:b.Y,z:b.Z(30)},cart:{x:b.X(25),y:b.Y,z:b.Z(31)},cans:[14,22,29].flatMap(x=>[8,22].map(z=>({x:b.X(x),y:b.Y,z:b.Z(z)}))),parkour:[[8,5,4.16]].map(([x,z,y])=>({x:b.X(x),y:b.Y+y,z:b.Z(z)}))};
 b.zone('inside',15,20,27,24);districtFrame(b,'factory');
}};
