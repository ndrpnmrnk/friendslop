import {G,col,tmat,lam,glow} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {machine,pallet,detailAction} from '../district-props.js';
import {pitchedRoof} from '../architecture.js';
export default{id:'factory',name:'Жировой завод',ground:'pave',build(b){
 const steel=tmat(T.metal()),paint=tmat(T.paintMetal(0x688078)),dark=col(0x35363e);
 b.tower({x:1.8,z:1.8,w:28.4,d:18.4,floors:1,fh:7.4,sill:4.4,winStep:3.6,wall:0x827162,facadeProps:false,canopy:false,windowPools:false,doorW:3,door:{side:'s',at:.5,style:'metal',sign:['ГЛАВНЫЙ ЦЕХ','#394d42','#d9d3a6']},ladder:{side:'w',at:.4},floor:T.concrete(),interior(f){
  for(const x of [5.2,26.4])for(const z of [6,13,20]){f.m(G.cyl12,paint,x,1.6,z,1.1,2.8,1.1);f.m(G.sph10,paint,x,3.0,z,1.1,.38,1.1);f.m(G.cyl8,steel,x,3.8,z,.14,1.3,.14);f.solid(x,z,2.15,2.15,.15,3.15);for(const s of [-1,1])f.m(G.box,dark,x+s*.75,.22,z,.12,.44,1.25);f.m(G.cyl8,col(0xe0d4aa),x,1.7,z+1.105,.18,.035,.18,).rotation.x=Math.PI/2;f.m(G.box,col(0xa9543a),x,1.7,z+1.13,.022,.20,.01);}
  for(const z of [6,13,20]){f.m(G.cyl8,steel,15.8,6.0,z,.16,21,.16).rotation.z=Math.PI/2;for(const x of [4,12,20,28])f.m(G.box,dark,x,6.7,z,.09,1.4,.09);}
  f.box(6.8,13,6.3,14,.14,tmat(T.grate()),{y:3.7});for(const x of [3.7,9.9]){f.box(x,13,.06,14,.06,dark,{y:4.65,solid:false});for(const z of [6.3,10,14,19.7]){f.box(x,z,.07,.07,.95,dark,{y:3.7,solid:false});f.solid(x,z,.12,.12,3.7,1.0);}}f.ladder(10.1,19,'e',3.7);for(const z of [7,18])f.box(6.8,z,.12,.12,3.7,steel);
  f.box(18.5,8,6,1.8,.9,paint);for(let i=0;i<9;i++)f.m(G.cyl8,steel,16+i*.6,1.01,8,.12,1.7,.12).rotation.x=Math.PI/2;f.box(22.6,8,1.2,2,1.55,paint);f.m(G.box,tmat(T.sign('300 Л','#b6bb9b','#293a32')),22.6,1.24,9.012,.8,.38,.02);
  f.box(18.6,18,4.6,1.3,.85,tmat(T.cabinet(0x7a887a)));for(const x of [17.2,18.6,20]){f.m(G.cyl8,steel,x,1.27,18,.06,.8,.06);f.m(G.cyl8,col(0xa66349),x,1.62,18,.18,.035,.18);}
  f.cabinet(28,23,.7,1.5,1.9,0x526d63,0,-Math.PI/2);f.sign(29.93,2.3,23,-Math.PI/2,'РАЗЛИВ','#b8b58e','#313f36',1.5,.4);
  machine(f,12.4,7,'press');machine(f,21.8,12,'lathe');machine(f,13.2,18.4,'lathe');
  // Второй ярус: северный мост связывает западную галерею с восточной.
  f.box(16.25,5.0,13.0,1.45,.14,tmat(T.grate()),{y:3.7});f.box(22.6,12.0,2.7,14.4,.14,tmat(T.grate()),{y:3.7});
  for(const z of [4.30,5.70])for(let i=0;i<10;i++){const x=10.0+i*1.35;f.m(G.box,dark,x,4.28,z,.06,.9,.06);if(i<9)f.m(G.box,dark,x+.67,4.72,z,1.4,.055,.055);}
  for(const x of [21.25,23.95])for(const z of [7,11,15,19]){f.m(G.box,dark,x,4.25,z,.07,.95,.07);f.m(G.box,dark,x,4.70,z+1.0,.06,.06,2.0);f.solid(x,z,.10,2.0,3.84,.95);}
  f.ladder(24.0,18.5,'e',3.84);f.zone('nook',21.4,12.5,23.7,17.5,3.84);
  for(const[x,z,h]of [[11.3,3.4,.65],[13.7,3.4,1.40],[16.1,3.4,2.15],[18.5,3.4,2.90],[20.9,3.4,3.70]]){f.box(x,z,1.75,1.5,h,paint);f.m(G.box,tmat(T.vent()),x,h+.015,z,1.45,.025,1.2);f.m(G.box,tmat(T.vent()),x,h*.48,z+.763,1.30,Math.min(1,h*.50),.023);f.m(G.box,col(0xc2aa62),x,Math.max(.18,h-.15),z+.762,.9,.08,.02);}
  pallet(f,8.8,22.8);f.crate(8.7,22.8,.7,.31);pallet(f,25.8,22.8);detailAction(f,28.5,17,0,'steam',-Math.PI/2);
  for(const z of [10,16]){f.m(G.box,steel,15.8,6.7,z,22.5,.25,.22);for(const x of [5,27]){f.m(G.box,dark,x,3.35,z,.10,6.7,.10);f.solid(x,z,.14,.14,0,6.7);}}
  f.sign(13.2,2.55,19.93,Math.PI,'МЕХАНИЧЕСКИЙ ЦЕХ','#465853','#d1c9a5',3.2,.42);f.sign(29.93,2.4,17,-Math.PI/2,'ПАР','#5e6050','#d5bc78',.85,.35);
  f.desk(27.7,9.4,Math.PI/2,true);{const shelf=f.shelf(18,2.6,3.3);for(const x of[-.7,.1,.9])shelf.put('books',x,1);}
 }});
 // Низкие пристройки образуют погрузочный двор, высокий цех имеет отдельный силуэт.
 for(const[x,w,sign]of[[1.8,9.5,'СКЛАД ТАРЫ'],[21.0,9.2,'УЧАСТОК РОЗЛИВА']]){b.tower({x,z:20.4,w,d:4.8,floors:1,fh:4.2,stairs:false,parapet:false,wall:0x697c72,facadeProps:false,windowPools:false,canopy:false,doorW:2,door:{side:'s',at:.5,style:'metal',sign:[sign,'#3d5143','#d7cc9a']},floor:T.concrete()});pitchedRoof(b,x+w/2,22.8,w+.25,5.1,4.2,.8);}
 for(const x of[12,17,22]){pitchedRoof(b,x,11.8,4.8,14.4,7.4,1.10,true);b.m(G.box,tmat(T.metal(),{color:0x88a3a8}),x+2.415,8.03,11.8,.025,.65,13.4);for(const z of[5.4,8.6,11.8,15,18.2])b.m(G.box,dark,x+2.45,8.04,z,.04,.70,.05);}
 // Трубы и вытяжки читают промышленный силуэт с улицы; крыша остаётся проходимой.
 for(const[x,z,h]of [[5,6,4.5],[8,6,3.6],[26,7,3.0]]){b.m(G.cyl8,paint,x,7.4+h/2,z,.42,h,.42);b.m(G.cyl8,steel,x,7.4+h,z,.51,.12,.51);b.m(G.cyl8,dark,x,7.47+h,z,.37,.025,.37);b.solid(x,z,.85,.85,7.4,h+.14);for(const y of [7.7,8.3])b.m(G.cyl8,col(0xb89e65),x,y,z,.435,.12,.435);}
 for(const z of [12,19]){b.box(25,z,2.6,1.8,.65,paint,{y:7.4});b.m(G.box,tmat(T.vent()),25,8.07,z,2.25,.04,1.5);}
 b.sign(16,5.5,20.22,0,'ЖИРОВОЙ ЗАВОД','#3d5143','#d7cc9a',8,.85);b.sign(22.8,1.8,25.22,0,'ЦЕХ 01','#bfae79','#3b4438',1.8,.4);
 b.ground(2,26,30,31,T.concrete(),3);for(const x of [5,27]){b.crate(x,28);b.barrel(x+1.3,28.5);}b.bench(9,29);b.bin(3,29);b.lamp(29,29,Math.PI);b.spawn(16,29);b.zone('floor',12,27,22,31);b.cats(2,26,10,30);
 W.factorySite={start:{x:b.X(16),y:b.Y,z:b.Z(27.8)},cans:Array.from({length:6},(_,i)=>({x:b.X(12.5+(i%3)*2.0),y:b.Y,z:b.Z(12+Math.floor(i/3)*3)})),cart:{x:b.X(18),y:b.Y,z:b.Z(27.5)}};
 W.factorySite.parkour=[[11.3,3.4,.65],[13.7,3.4,1.4],[16.1,3.4,2.15],[18.5,3.4,2.9],[20.9,3.4,3.7],[22.6,5,3.84]].map(([x,z,y])=>({x:b.X(x),y:b.Y+y,z:b.Z(z)}));
}};
