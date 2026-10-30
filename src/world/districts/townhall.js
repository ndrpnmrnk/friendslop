import {G,col,tmat} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {mayorModel} from '../../characters/mayor.js';
import {npcBody} from '../../missions/encounter-motion.js';
import {archives,noticeBoard,displayCase,civicDetails} from '../district-props.js';
import {mayorLife} from '../../game/mayor-life.js';
import {bonus} from '../../game/score.js';
import {districtFrame,districtClock} from '../district-motion.js';
export default{id:'townhall',name:'Мэрия',ground:'pave',size:44,build(b){
 b.tower({x:3,z:2,w:38,d:23,floors:2,fh:4,wall:0xc4b397,winStep:3.5,windowPools:false,doorW:3,door:{side:'s',at:.5,sign:['МЭРИЯ','#384f55','#e0d5ad']},fireEscape:{side:'e',at:.45},floor:T.floorTile(),interior(f,k,r){
  if(k===0){const desk=f.counter(30,8,12,1.2,1.05,tmat(T.wood()));desk.surface.put('books',-3,0);for(const x of[18,26,34])f.bench(x,19,Math.PI);f.waterCooler(39,13);archives(f,16,4);archives(f,20,4);displayCase(f,38,4,'trophies');noticeBoard(f,39,22,-Math.PI/2);}
  else{f.desk(29,18,Math.PI,true);f.safe(38,22,-Math.PI/2);f.sofa(17,20,Math.PI/2,0x586868);for(const x of[17,21,25])archives(f,x,4);f.ptable(34,7,2);f.chair(31.5,7,Math.PI/2);f.chair(36.5,7,-Math.PI/2);f.item('books',34,7,.9);}
 }});
 // Низкий открытый балкон с двумя маршами: мэр действительно выходит на него пешком.
 b.box(22,30.2,12,5,.9,tmat(T.concrete()));b.climbTrim(22,30.2,12,5,.9);
 for(const x of[16.1,27.9]){b.box(x,30,.12,4.3,.85,col(0x57665c),{y:.9});}
 b.stairs(22,34.05,'n',0,.9,4,0,.45);b.hazardFloor(22,32.6,3,.35,.91);
 b.m(G.cyl6,col(0x44414a),22,1.65,31.4,.025,1.5,.025);b.m(G.sph10,col(0x302b36),22,2.42,31.4,.08,.12,.08);
 const model=mayorModel();model.root.position.set(b.X(22),b.Y,b.Z(21));W.group.add(model.root);W.keep.push(model.root);
 const m={...npcBody(model),kind:'mayor',r:.72,h:2.2,home:model.root.position.clone(),busy:false,t:0,lard:false,arms:model.arms,face:model.face};W.mayor=m;W.npcs.push(m);
 const route=[[22,21],[22,26.2],[14.5,26.2],[14.5,36.8],[22,36.8],[22,30.7],[22,36.8],[14.5,36.8],[14.5,26.2],[22,26.2],[22,21]].map(([x,z])=>m.pos.clone().set(b.X(x),b.Y,b.Z(z)));
 const life=mayorLife(m,route);let paid=-1;W.animated.push(dt=>{life(dt);m.speaking=!m.busy&&!m.missionControlled&&Math.abs(m.pos.x-b.X(22))<1.2&&Math.abs(m.pos.z-b.Z(30.7))<1.3&&m.pos.y>b.Y+.65;if(m.speaking){model.root.rotation.y=0;model.animate(m.t,0,'look');m.arms[0].rotation.x=-.65+Math.sin(m.t*3)*.22;}});
 W.hitHooks.push((it,p)=>{const cycle=Math.floor(districtClock()/10);if(it.type==='slipper'&&m.speaking&&paid!==cycle&&p.distanceTo(m.pos.clone().add({x:0,y:1.2,z:0}))<1.6){paid=cycle;bonus(it.thrownBy||it.owner,'hits',25,m.pos);}});
 civicDetails(b,8,30);for(const x of[6,38])b.bench(x,35,x<22?Math.PI/2:-Math.PI/2);
 W.salonSite={x:b.X(35),y:b.Y,z:b.Z(31)};districtFrame(b,'townhall');
}};
