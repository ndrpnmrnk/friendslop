import {G,col,tmat,V3} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {beginSection,endSection} from '../sections.js';
import {labBench,displayCase,noticeBoard,archives} from '../district-props.js';
import {mayorModel} from '../../characters/mayor.js';
import {sfx} from '../../core/sfx.js';
import {districtFrame,districtClock,localAnimation} from '../district-motion.js';
export default{id:'university',name:'Университет Хнуре',ground:'pave',size:44,build(b){
 const section=beginSection();
 b.tower({x:3,z:2,w:38,d:26,floors:3,fh:4.2,wall:0x9b8b78,winStep:3.5,windowPools:false,doorW:3.2,facadeProps:false,door:{side:'s',at:.5,sign:['ХНУРЕ','#34394c','#dbd2b4']},fireEscape:{side:'e',at:.65},floor:T.floorTile(),interior(f,k,r){
  if(k===0){
   const reception=f.counter(34,25,7,1,1.05,tmat(T.wood()));reception.surface.put('books',1,0);noticeBoard(f,39,22,-Math.PI/2);
   // Актовый зал: боковые проходы и свободный центр перед кафедрой.
   f.box(28,9,22,4,.4,tmat(T.wood()));f.stairs(28,11.35,'n',0,.4,3,0,.35);
   f.at(.4).counter(28,9,1.4,.8,1.2,tmat(T.wood()));f.whiteboard(28,2.1,7.1,0,10);for(const x of[23.5,32.5])f.box(x,7.1,.08,.12,2.7,col(0x44434b));
   for(const z of[14,18,22])for(const x of[18,22,32,36])f.chair(x,z,Math.PI);
   const lecturer=mayorModel();lecturer.root.position.set(b.X(28),b.Y+.4,b.Z(7.6));lecturer.root.scale.setScalar(.75);W.group.add(lecturer.root);W.keep.push(lecturer.root);

   f.m(G.cyl8,col(0xb39a5c),28.5,1.65,9.2,.16,.07,.16);const cap=f.m(G.sph10,col(0xcab477),28.5,1.74,9.2,.14,.1,.14);W.keep.push(cap);
   const state={values:[0]};W.districtStates.push(state);let heard=0;W.interacts.push({x:b.X(28.5),y:b.Y+.4,z:b.Z(10.5),r:1.4,dy:1.2,label:'Позвонить в звонок',act(){state.values[0]=districtClock()+1.4;}});
   localAnimation((dt,t)=>{const ring=Math.max(0,state.values[0]-districtClock());if(ring>0&&heard!==state.values[0]){heard=state.values[0];sfx('bell',{at:cap.position,range:32});}cap.rotation.z=Math.sin(ring*30)*ring*.15;lecturer.animate(t,0,ring?'look':'read');},cap,lecturer.root);
  }else if(k===1){for(const x of[18,23,31,36])for(const z of[8,14,20])f.desk(x,z,Math.PI,false);f.whiteboard(27,2.2,2.35,0,10);labBench(f,38,24);displayCase(f,17,24,'science');}
  else{for(const x of[17,23,30,37])archives(f,x,4);for(const x of[19,27,35])for(const z of[12,21]){f.ptable(x,z,1.5);f.chair(x,z+1.4,Math.PI);f.item('books',x,z,.9);}}
 }});
 b.sign(22,10.5,28.23,0,'ХНУРЕ · НАУКА НОЧЬЮ','#4d5868','#d9cfaa',12,.85);
 const owned=endSection(section);W.university={...owned,b,center:new V3(b.X(22),b.Y,b.Z(15)),box:[b.X(2.5),b.Z(2),b.X(41.5),b.Z(28.3)],start:new V3(b.X(22),b.Y,b.Z(34)),charges:[[5,29],[39,29],[2,14],[42,8]].map(([x,z])=>new V3(b.X(x),b.Y,b.Z(z))),destroyed:false};
 b.path([[22,43],[22,28]],4,T.pave());for(const x of[7,37]){b.bench(x,35);b.planter(x,30,3,2,.6,'shrub');}b.item('boombox',7,35,.65);districtFrame(b,'university');
}};
