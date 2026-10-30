import {G,col,tmat,glow} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {cinemaSeat,cinemaPoster,filmArchive,filmWorkbench,popcorn,cinemaProjection} from '../cinema-props.js';
import {districtFrame} from '../district-motion.js';
export default{id:'cinema',name:'Последний сеанс',ground:'pave',size:44,build(b){
 const dark=col(0x322938),brass=col(0xb19468),cloth=tmat(T.cloth(0x713e51));
 // Auditorium and narrower projecting foyer form a T-shaped footprint.
 b.tower({x:4,z:3,w:36,d:24,floors:1,fh:6.5,stairs:false,windows:false,facadeProps:false,canopy:false,wall:0x745b69,doorW:4,door:{side:'s',at:.5},ladder:{side:'e',at:.3},floor:T.carpet(0x493744),interior(f){
  f.box(22,3.5,27,.2,5,dark,{y:.6});for(const x of[7,37])f.box(x,4,2,.4,5,cloth,{y:.5});
  // Flat aisles: seats never form a continuous collision wall.
  let n=0;for(const z of[10,14,18])for(const x of[9,11,13,15,18,26,29,31,33,35]){cinemaSeat(f,x,z,0,++n);if(x===18)f.grabTarget({x,z,y:0,r:.8,kind:'stash',visible:true,t:2,at:{x,y:.55,z},ring:false,label:'кресло'});}
  for(const x of[5,39])for(const z of[9,15,21]){f.m(G.box,brass,x,1,z,.08,.5,.3);f.m(G.box,glow(0xe3b37d),x,1.3,z,.12,.08,.3);}
  // Projection room at ground level, reached from both side aisles.
  f.box(22,22,10,.18,2.1,dark);for(const x of[17,27])f.box(x,24,.18,4,2.1,dark);
  f.table(22,24,.9);cinemaProjection(f,22,24,.82,{x:22,y:3.4,z:3.66,w:25,h:4.1});filmArchive(f,29,25);filmWorkbench(f,34,24);
  f.zone('inside',20,7,24,20);
 }});
 b.tower({x:12,z:27,w:20,d:9,floors:1,fh:3.6,stairs:false,windows:false,facadeProps:false,canopy:false,wall:0x947273,doorW:4,doors:[{side:'s',at:.5},{side:'n',at:.5}],floor:T.floorTile(),interior(f){
  f.counter(15,30,3,1,1,tmat(T.wood()));f.sign(15,2.4,28,0,'БИЛЕТЫ','#372937','#e6c394',3,.5);f.counter(29,30,3,1,1,tmat(T.paintMetal(0x754457)));popcorn(f,29,30,1);f.bench(14,34,Math.PI/2);f.bin(30,34);f.zone('inside',19,29,25,34);
 }});
 // Stepped art-deco facade, projecting marquee and fan-shaped crown.
 b.box(22,36.5,23,1.6,.22,brass,{y:3.3});b.sign(22,4.2,36.7,0,'ПОСЛЕДНИЙ СЕАНС','#3d2c3c','#f1cd8c',18,.8);
 for(const x of[13,16,19,22,25,28,31]){const h=1.1+(1-Math.abs(x-22)/12)*1.3;b.box(x,35.9,.65,.3,h,dark,{y:3.6});b.m(G.sph,glow(0xe9bc88),x,3.2,37,.07,.07,.07);}
 for(const x of[5,39])for(const z of[4,10,16,22,26])b.box(x,z,.35,.5,6.4,brass,{solid:false});
 cinemaPoster(b,13,35.9,0,0);cinemaPoster(b,31,35.9,0,1);b.bench(7,35);b.bench(37,35);districtFrame(b,'cinema',{floor:[17,37,27,42]});
}};
