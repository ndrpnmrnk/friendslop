import {factoryControls} from '../factory-controls.js';
import {THREE,G,col,tmat,glow,compose} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {machine,pallet,noticeBoard} from '../district-props.js';
import {conveyor,districtFrame,localAnimation,districtClock} from '../district-motion.js';
import {actors} from '../../game/actors.js';
import {eliminate} from '../../game/drone.js';
import {sfx} from '../../core/sfx.js';
export default{id:'factory',name:'Жировой завод',ground:'pave',size:44,build(b){
 const paint=tmat(T.paintMetal(0x65786d)),steel=tmat(T.metal()),dark=col(0x30393a),brick=tmat(T.brickWall());
 b.tower({x:3,z:3,w:38,d:27,floors:1,fh:7,stairs:false,wall:0x807562,facadeProps:false,canopy:false,sill:3.8,winStep:4,doorW:2.6,doors:[{side:'s',at:.3,style:'metal'},{side:'w',at:.72,style:'metal'}],passages:[{side:'s',at:.75,y:0,w:4.5,h:4.4}],floor:T.concrete(),ladder:{side:'w',at:.2},interior(f){
  // One fast central line, with clear walking lanes on both sides.
  const controls=factoryControls(f);conveyor(f,21,17,23,3.2,{axis:'x',speed:4.4,y:.32,enabled:controls.running});
  for(let x=10;x<32;x+=1.3)for(const z of[15.2,18.8]){f.m(G.cyl8,steel,x,.27,z,.12,.25,.12).rotation.z=Math.PI/2;}
  // Raised intake and two counter-rotating cutter shafts on the right.
  for(const z of[14.5,19.5]){f.box(35,z,5.5,.3,2.5,paint);f.m(G.box,steel,35,2.55,z,5.8,.12,.45);}
  f.box(38,17,.35,5.3,3.6,paint);f.box(35,17,5.5,5,.35,dark);
  const shafts=[];for(const x of[34.1,35.9]){const root=new THREE.Group();root.position.set(f.X(x),f.Y+.95,f.Z(17));f.g.add(root);root.add(compose('factory-shaft0622',a=>{a(G.cyl12,steel,0,0,0,.45,4.6,.45,Math.PI/2);for(let i=0;i<9;i++)for(let k=0;k<4;k++){const angle=k*Math.PI/2+(i%2)*.45;a(G.box,k%2?steel:dark,Math.cos(angle)*.6,Math.sin(angle)*.6,-2+i*.5,.5,.22,.24,0,0,angle);}}));shafts.push(root);}
  localAnimation(dt=>shafts.forEach((root,i)=>{root.rotation.z+=dt*(i?-6:6);}),...shafts);
  f.box(39,17,1,3.3,2,paint);for(const z of[16,17,18])f.m(G.box,tmat(T.vent()),39.52,1.1,z,.02,.6,.65).rotation.y=Math.PI/2;
  f.sign(38.18,3,17,Math.PI/2,'ШРЕДЕР','#393b36','#dbb47c',2,.45);const lamp=f.warnLamp(33,3.6,14.3,0xe69447,.25);
  localAnimation(()=>lamp.set(.65+.35*Math.sin(districtClock()*5)),lamp.m);
  const last=new WeakMap(),inside=p=>p.x>f.X(32.5)&&p.x<f.X(38)&&p.z>f.Z(14.7)&&p.z<f.Z(19.3)&&p.y>=f.Y-.1&&p.y<f.Y+3.2;
  const grind=()=>{if(W.net?.replica)return;const now=districtClock();for(const a of actors())if(!a.hidden&&inside(a.pos)&&now-(last.get(a)??-99)>3){last.set(a,now);eliminate(a,15);sfx('bonk',{at:{x:f.X(35),y:f.Y+1,z:f.Z(17)},range:22,v:.6});}
   for(const it of W.items)if((it.state==='fly'||it.state==='rest')&&inside(it.pos)){it.state='gone';it.g.visible=false;it.vel.set(0,0,0);}
  };W.animated.push(grind);W.factoryShredder={inside,grind};
  f.hazard({x0:9.5,z0:14.5,x1:38,z1:19.5,y0:0,y1:3,active:()=>true});
  // Boiler, pipework and workshop stations stay against the walls.
  f.m(G.cyl12,paint,9,2.1,8,2,4.2,2);f.m(G.sph10,paint,9,4.2,8,2,.5,2);f.solid(9,8,4,4,0,4.6);f.m(G.cyl8,steel,9,5.5,8,.25,2.5,.25);
  for(const z of[6,27]){const pipe=f.m(G.cyl8,steel,23,5.8,z,.16,30,.16);pipe.rotation.z=Math.PI/2;}
  machine(f,18,7,'lathe');machine(f,27,7,'press');machine(f,36,7,'lathe',Math.PI/2);
  f.box(22,4.4,25,1.8,.18,tmat(T.grate()),{y:4.3});f.ladder(10,5.4,'s',4.48);
  for(const x of[10,34])f.box(x,4.4,.16,.16,4.3,steel);
  for(const x of[13,17,21]){f.barrel(x,26);f.item('can',x,23);}
  f.crate(7,24);f.crate(9,25);pallet(f,27,26);f.ride('barrel',29,24);f.item('fatcan',23,22);f.item('brick',15,12);f.item('can',28,12);noticeBoard(f,40.5,25,-Math.PI/2);
  f.zone('inside',12,20,26,23);
 }});
 // Stepped clerestory, anchored flues and facade piers give the hall a full silhouette.
 b.box(23,16,26,20,1.2,tmat(T.corrugated(0x58675d)),{y:7});b.box(23,16,26.6,20.6,.18,tmat(T.roof()),{y:8.2});
 for(const x of[4,12,22,32,40]){b.box(x,29.9,.4,.4,7.1,brick,{solid:false});b.m(G.box,paint,x,6.6,30.16,1,.12,.15);}
 for(const x of[8,38]){b.m(G.cyl8,steel,x,8.6,8,.45,3.2,.45);b.m(G.cone8,dark,x,10.3,8,.65,.3,.65);}
 b.sign(14.4,4.8,30.2,0,'ЖИРОВОЙ ЗАВОД','#344b40','#e4cfa3',12,.8);
 b.box(31.5,30.2,5,.25,.4,paint,{y:4.4});b.path([[14.4,43],[14.4,30]],3,T.concrete());b.bench(6,36);b.barrel(38,35);b.crate(35,37);
 W.factorySite={start:{x:b.X(22),y:b.Y,z:b.Z(33)},cart:{x:b.X(25),y:b.Y,z:b.Z(34)},cans:[14,22,28].flatMap(x=>[10,23].map(z=>({x:b.X(x),y:b.Y,z:b.Z(z)}))),parkour:[[10,5.4,4.48]].map(([x,z,y])=>({x:b.X(x),y:b.Y+y,z:b.Z(z)}))};
 districtFrame(b,'factory',{floor:[14,33,28,42]});
}};
