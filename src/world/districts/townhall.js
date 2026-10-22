import {G,col,tmat,glow} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {mayorModel} from '../../characters/mayor.js';
import {npcBody,walkNPC,flat} from '../../missions/encounter-motion.js';
import {tickNPCHit} from '../../game/impacts.js';
export default{id:'townhall',name:'Мэрия',ground:'pave',build(b){
 b.tower({x:3,z:2,w:26,d:17,floors:2,fh:4,wall:0xc4b397,winStep:3,windowPools:false,doorW:2.6,door:{side:'s',at:.50,sign:['МЭРИЯ','#384f55','#e0d5ad']},ladder:{side:'e',at:.45},floor:T.floorTile(),interior(f,k,r){
  if(k===0){f.box(19,9,8,1.1,1.0,tmat(T.cabinet(0x78674f)));f.m(G.box,tmat(T.sign('ПРИЁМ ГРАЖДАН','#ddd4b8','#354343')),19,1.55,8.9,2.5,.40,.03);for(const x of [13,16,19,22])f.chair(x,14,Math.PI);f.sofa(26,15,Math.PI/2,0x586868);f.plantPot(11,16);f.waterCooler(27,8);f.cabinet(28,11,.7,1.7,2,0x766349,0,-Math.PI/2);}
  else{f.partition(11,11,28,11,3.5,.55,2.2);f.desk(21,15,Math.PI,true);f.shelf(14,17.8,3.6,Math.PI);f.safe(27.5,14,-Math.PI/2);f.sofa(14,14,Math.PI/2,0x675e70);f.rug(21,14,6,4,'#45686a','#b4ab86');f.plantPot(27,17);f.whiteboard(21,1.8,11.16,0,3);}
 }});
 for(const x of [13,19]){b.m(G.cyl8,tmat(T.concrete()),x,1.7,20,.34,3.4,.34);b.m(G.box,tmat(T.concrete()),x,3.45,20,.85,.20,.85);b.solid(x,20,.68,.68,0,3.5);}b.box(16,20,7,.8,.22,tmat(T.concrete()),{y:3.55});
 b.ground(3,20.5,29,31,T.pave(),3);b.bench(6,25,Math.PI/2);b.bench(23,21.6);b.plantPot(9,21);b.plantPot(22,21);b.lamp(3,30);b.lamp(29,30);b.spawn(16,28);b.zone('floor',10,23,22,30);b.zone('nook',2,20,8,24);
 const m=mayorModel();m.root.position.set(b.X(19.5),b.Y,b.Z(22.3));W.group.add(m.root);W.keep.push(m.root);const mayor={...npcBody(m),kind:'mayor',r:.48,h:1.9,home:m.root.position.clone(),busy:false,t:0,lard:false};W.mayor=mayor;W.animated.push(dt=>{mayor.t+=dt;if(tickNPCHit(mayor,dt,mayor.t))return;if(!mayor.busy){if(mayor.returnHome){walkNPC(mayor,mayor.home,1.5,dt);if(flat(mayor.pos,mayor.home)<.3)mayor.returnHome=false;}m.animate(mayor.t,mayor.returnHome?.5:0);}});
 W.salonSite={x:b.X(27),y:b.Y,z:b.Z(27.8)};
}};
