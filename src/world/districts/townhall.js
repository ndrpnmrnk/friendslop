import {THREE,G,col,tmat} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {mayorModel} from '../../characters/mayor.js';
import {npcBody} from '../../missions/encounter-motion.js';
import {archives,noticeBoard,displayCase} from '../district-props.js';
import {walkNPC} from '../../missions/encounter-motion.js';
import {tickNPCHit} from '../../game/impacts.js';
import {bonus} from '../../game/score.js';
import {sfx} from '../../core/sfx.js';
import {districtFrame,districtClock,localAnimation} from '../district-motion.js';
export default{id:'townhall',name:'Мэрия',ground:'pave',size:44,build(b){
 const stone=tmat(T.concrete()),trim=col(0xd1bea0),green=col(0x47635a);
 // Two lower wings and a taller central hall, instead of a single box.
 for(const x of[6,28])b.tower({x,z:3,w:10,d:18,floors:1,fh:4.1,stairs:false,wall:0x9e9987,facadeProps:false,canopy:false,door:{side:'s',at:.5},floor:T.floorTile(),interior(f){archives(f,x+2,6);archives(f,x+6,6);f.desk(x+5,13,0,true);f.bench(x+5,18);}});
 b.tower({x:16,z:3,w:12,d:21,floors:2,fh:4,passages:[{side:'s',at:.5,y:4,w:3},{side:'e',at:.12,y:4,w:2.5}],wall:0xb8ad95,facadeProps:false,canopy:false,doorW:3,doors:[{side:'s',at:.5}],floor:T.floorTile(),interior(f,k){if(!k){f.counter(25,8,3,1,1,tmat(T.wood()));noticeBoard(f,27,17,-Math.PI/2);displayCase(f,18,18,'trophies');}else{f.ptable(23,12,2);f.chair(23,10);f.chair(23,14,Math.PI);f.safe(26,6);archives(f,18,6);}}});
 // Balcony connects to the first floor through a central open doorway.
 // tower's wall is omitted at this doorway by a separate manual passage below.
 b.box(22,25.5,12,3,.18,stone,{y:4});for(const x of[16.1,27.9])b.box(x,25.5,.12,3,.9,green,{y:4.18});
 b.box(22,27,12,.12,.9,green,{y:4.18});for(const x of[17,27])b.box(x,25,.4,.4,4,trim);
 b.stairs(30,28,'n',0,4.18,2,0,.45);b.box(29,21.5,4,2,.18,stone,{y:4});b.ladder(27.8,23.3,'e',4.18);
 b.sign(22,6.2,24.12,0,'МЭРИЯ','#3a5048','#ebd8ad',9,.8);for(const x of[16.3,27.7])b.box(x,23.8,.45,.6,8,trim,{solid:false});
 const roof=b.m(new THREE.ConeGeometry(1,1,4),green,22,8.9,13,9.2,1.8,15.3);roof.rotation.y=Math.PI/4;
 b.box(22,33,4,2,.45,tmat(T.wood()));b.m(G.box,green,22,1.05,33,1.3,.75,.7);for(const x of[8,36])for(const z of[31,38])b.planter(x,z,2.5,2.5,.5,'shrub');
 const model=mayorModel();model.root.position.set(b.X(22),b.Y+4,b.Z(21));W.group.add(model.root);W.keep.push(model.root);
 const m={...npcBody(model),kind:'mayor',r:.72,h:2.2,home:model.root.position.clone(),busy:false,t:0,lard:false,arms:model.arms,face:model.face};W.mayor=m;W.npcs.push(m);
 let paid=-1,last=-1;const speech=m.home.clone().set(b.X(22),b.Y+4.18,b.Z(26));
 W.animated.push(dt=>{const now=districtClock(),phase=now%80,c=Math.floor(now/80);m.t+=dt;if(phase<3&&last!==c){last=c;sfx('alarm',{at:m.pos,range:35,v:.45});}m.speaking=false;if(tickNPCHit(m,dt,m.t)||m.busy||m.missionControlled)return;const out=phase<23,goal=out?speech:m.home;walkNPC(m,goal,1.8,dt);m.speaking=out&&phase>=3&&m.pos.distanceTo(speech)<.6;model.animate(m.t,m.speaking?0:Math.min(1,m.vel.length()),m.speaking?'look':'idle');if(m.speaking){model.root.rotation.y=0;m.arms[0].rotation.x=-.6+Math.sin(m.t*3)*.22;}});
 for(const x of[17,27]){b.m(G.cyl6,trim,x,5.8,25,.035,3.2,.035);const flag=b.m(G.box,green,x+.4,6.6,25,.8,.7,.035);localAnimation(()=>{flag.position.y=b.Y+5.5+Math.min(1,(districtClock()%80)/3)*1.1;},flag);}
 W.hitHooks.push((it,p)=>{const c=Math.floor(districtClock()/80);if(it.type==='slipper'&&m.speaking&&paid!==c&&p.distanceTo(m.pos.clone().add({x:0,y:1.2,z:0}))<1.6){paid=c;bonus(it.thrownBy||it.owner,'hits',25,m.pos);}});
 W.salonSite={x:b.X(35),y:b.Y,z:b.Z(29)};b.zone('inside',19,17,25,21);districtFrame(b,'townhall');
}};
