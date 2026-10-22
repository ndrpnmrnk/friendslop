import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {CONFIG} from '../config.js';
import {groundAt,isFree} from '../world/physics.js';
import {spawnTool} from './tools.js';
import {puff,smokeRing} from '../world/particles.js';
import {sfx} from '../core/sfx.js';
import {buildingAt} from '../missions/location.js';
export const SUP={next:50,crates:[],loot:0,lootCD:0};
export function resetSupplies(){for(const c of SUP.crates){c.g.removeFromParent();c.witch?.removeFromParent();c.beam.removeFromParent();c.beam.material.dispose();}SUP.next=40+Math.random()*20;SUP.crates=[];SUP.loot=0;SUP.lootCD=0;W.containerLoot=containerLoot;W.supplies=[];}
export function containerLoot(p){if(SUP.loot>=8||SUP.lootCD>0||Math.random()>.22)return false;spawnTool(p.x,p.y+.4,p.z,true);SUP.loot++;SUP.lootCD=12;return true;}
function witchModel(variant){const g=new THREE.Group(),coat=tmat(T.cloth([0x594a86,0x426c58,0x904a67][variant]));g.add(compose('witch30'+variant,a=>{const wood=tmat(T.wood()),dk=col(0x24202c);a(G.cyl6,wood,0,-.25,0,.035,2.5,.035,Math.PI/2);a(G.cone6,tmat(T.hay()),0,-.25,-1.25,.28,.7,.28,Math.PI/2);a(G.cone6,coat,0,.08,0,.35,.65,.27);a(G.sph10,col(0xd7b396),0,.65,.18,.19,.22,.18);a(G.cone6,coat,0,1.08,.15,.32,.65,.32,0,0,.12);a(G.cyl8,dk,0,.80,.15,.38,.04,.38);for(const x of [-.12,.12]){a(G.box,col(0x3a303e),x,-.28,.34,.12,.3,.14);a(G.box,dk,x,-.43,.43,.15,.09,.3);a(G.box,col(0xd7b396),x,.27,.51,.08,.09,.1);}a(G.box,wood,0,.25,.5,.36,.04,.04);a(G.box,col(0xf5c542),0,.91,.4,.15,.1,.015);}));return g;}
export function spawnSupply(){
 const zones=W.missionZones.filter(z=>z.type==='floor'&&Math.abs(z.y-CONFIG.base)<.4);let p=null;
 for(let i=0;i<100&&zones.length;i++){const z=zones[Math.random()*zones.length|0],x=z.x0+1+Math.random()*Math.max(0,z.x1-z.x0-2),zz=z.z0+1+Math.random()*Math.max(0,z.z1-z.z0-2),y=groundAt(x,zz,.5,z.y+.4),q=new V3(x,y,zz);if(Math.abs(y-z.y)>.3||buildingAt(q)||!isFree(x-1,zz-1,x+1,zz+1,y+.08,y+25))continue;p=q;break;}if(!p)return null;
 const variant=Math.random()*3|0,g=new THREE.Group();W.group.add(g);g.visible=false;
 g.add(compose('witchParcel30'+variant,a=>{const m=tmat(T.cloth([0x875d46,0x685286,0x567a62][variant]));a(G.sph10,m,0,.32,0,.42,.35,.35);a(G.cyl6,col(0xe2c68b),0,.66,0,.09,.10,.09);a(G.box,tmat(T.sign(['ПОСЫЛКА','ПОДАРОК','СЮРПРИЗ'][variant],'#d5bc84','#322539')),0,.33,.34,.42,.22,.02);}));
 const angle=Math.random()*6.28,dir=new V3(Math.sin(angle),0,Math.cos(angle)),witch=witchModel(variant);W.group.add(witch);const bm=new THREE.MeshBasicMaterial({color:0xb18cff,transparent:true,opacity:.14,depthWrite:false}),beam=mesh(G.beam,bm,p.x,p.y+4,p.z,.35,8,.35,W.group);beam.visible=false;
 const c={p,g,beam,witch,dir,k:-30,height:9+variant*1.5,vy:0,dropped:false,landed:false,opened:false,life:75,smoke:0,variant};
 c.interact={x:p.x,y:p.y,z:p.z,r:1.8,dy:1.5,label:'Развязать подарок ведьмы',enabled:a=>c.landed&&!c.opened&&!a.held,act(){if(!c.landed||c.opened)return;c.opened=true;spawnTool(p.x,p.y+.5,p.z,true);sfx('open',{at:p});smokeRing(p.x,p.y+.1,p.z,6,{speed:1.4,color:0xb18cff});}};
 W.keep.push(g,witch,beam);W.interacts.push(c.interact);SUP.crates.push(c);return c;
}
export function updateSupplies(dt){SUP.next-=dt;SUP.lootCD-=dt;if(SUP.next<=0){SUP.next=40+Math.random()*20;if(SUP.crates.length<2)spawnSupply();}
 for(const c of SUP.crates){c.life-=dt;c.k+=dt*(8+c.variant);const t=c.k/9;
 if(c.witch){c.witch.position.copy(c.p).addScaledVector(c.dir,c.k);c.witch.position.y+=c.height+Math.sin(t*2)*.3;c.witch.rotation.set(Math.sin(t)*.04,Math.atan2(c.dir.x,c.dir.z),Math.sin(t*1.4)*.10);}
 if(!c.dropped&&c.k>=0){c.dropped=true;c.g.visible=true;c.g.position.copy(c.p).y+=c.height-.5;c.vy=0;sfx('laugh',{at:c.p});}
 if(c.dropped&&!c.landed){c.vy-=15*dt;c.g.position.y=Math.max(c.p.y,c.g.position.y+c.vy*dt);c.g.rotation.y+=dt*2;c.g.rotation.z=Math.sin(c.g.position.y)*.14;if(c.g.position.y<=c.p.y){c.landed=true;c.g.rotation.z=0;c.beam.visible=true;sfx('land',{at:c.p});smokeRing(c.p.x,c.p.y+.08,c.p.z,6,{speed:2});}}
 if(c.witch&&c.k>35){c.witch.removeFromParent();W.keep=W.keep.filter(q=>q!==c.witch);c.witch=null;}
 c.smoke-=dt;if(c.landed&&c.smoke<=0){c.smoke=.8;puff(c.p.x,c.p.y+.5,c.p.z,{color:0xb18cff,size:.18,vy:.6,life:.8,grow:1});}
 if(c.opened||c.life<=0){c.g.removeFromParent();c.witch?.removeFromParent();c.beam.removeFromParent();c.beam.material.dispose();W.interacts=W.interacts.filter(q=>q!==c.interact);W.keep=W.keep.filter(q=>q!==c.g&&q!==c.witch&&q!==c.beam);}}
 SUP.crates=SUP.crates.filter(c=>!c.opened&&c.life>0);W.supplies=SUP.crates;
}
