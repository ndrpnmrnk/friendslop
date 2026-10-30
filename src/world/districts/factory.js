import {G,col,tmat} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {machine,pallet,detailAction} from '../district-props.js';
import {conveyor,warningHazard,districtFrame} from '../district-motion.js';
export default{id:'factory',name:'Жировой завод',ground:'pave',size:44,build(b){
 const paint=tmat(T.paintMetal(0x688078)),steel=tmat(T.metal()),dark=col(0x35363e);
 b.tower({x:2,z:2,w:40,d:25,floors:1,fh:7.4,sill:4.4,winStep:4,wall:0x827162,facadeProps:false,canopy:false,windowPools:false,doorW:5,doors:[{side:'s',at:.5,style:'metal'},{side:'e',at:.8,style:'metal'}],ladder:{side:'w',at:.7},floor:T.concrete(),interior(f){
  for(const x of[6,38])for(const z of[6,14,22]){f.m(G.cyl12,paint,x,1.6,z,1.15,2.8,1.15);f.m(G.sph10,paint,x,3,z,1.15,.38,1.15);f.m(G.cyl8,steel,x,4,z,.14,1.8,.14);f.solid(x,z,2.3,2.3,0,3.4);}
  for(const z of[6,14,22])f.m(G.cyl8,steel,22,6.2,z,.14,33,.14).rotation.z=Math.PI/2;
  // Две ленты и широкий проход между ними; загрузка со стороны открытого двора.
  for(const x of[15,29])conveyor(f,x,16,3,14,{speed:-1.8});
  machine(f,37,9,'lathe');f.desk(38,24,Math.PI/2,true);detailAction(f,39,18,0,'steam',-Math.PI/2);
  f.box(22,5,25,1.8,.16,tmat(T.grate()),{y:3.7});f.ladder(10,6,'w',3.86);f.climbTrim(22,5,25,1.8,3.86);
  for(const[x,y]of[[11,.7],[13,1.45],[15,2.2],[17,2.95]])f.box(x,3.5,1.6,1.4,y,paint);
  for(const x of[15,29]){
   for(const s of[-1,1])f.box(x+s*1.85,7,.24,2,4.8,paint);
   f.box(x,7,4,.9,.4,paint,{y:4.7});const press=f.m(G.box,steel,x,3.8,7,3.15,.5,2.2);
   const visual=(on,t)=>{press.position.y=f.Y+(on?.92:3.8);};visual.roots=[press];
   warningHazard(f,{name:'factory-press',x,z:7,w:3.5,d:2.5,y:.65,period:24,warning:2,active:1.4,visual});
  }
  f.zone('inside',19,10,25,23);for(const x of[10,34])pallet(f,x,24);
 }});
 b.sign(22,5.2,27.22,0,'ЖИРОВОЙ ЗАВОД','#3d5143','#d7cc9a',10,.85);
 for(const x of[6,38]){b.m(G.cyl8,paint,x,10,7,.45,5.2,.45);b.solid(x,7,.9,.9,7.4,5.2);}
 for(const x of[6,38]){b.crate(x,32);b.barrel(x+1.5,33);b.bench(x,38);}
 b.path([[22,43],[22,27]],4,T.concrete());b.grabTarget({kind:'slow',x:15,z:21,r:1.5,y:.7,label:'конвейер'});
 W.factorySite={start:{x:b.X(22),y:b.Y,z:b.Z(31)},cart:{x:b.X(25),y:b.Y,z:b.Z(32)},cans:[12,22,32].flatMap(x=>[12,20].map(z=>({x:b.X(x),y:b.Y,z:b.Z(z)}))),parkour:[[11,3.5,.7],[13,3.5,1.45],[15,3.5,2.2],[17,3.5,2.95],[19,5,3.86]].map(([x,z,y])=>({x:b.X(x),y:b.Y+y,z:b.Z(z)}))};
 districtFrame(b,'factory');
}};
