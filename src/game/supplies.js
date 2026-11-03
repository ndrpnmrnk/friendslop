import { random } from '../core/random.js';
import {THREE,G,V3,mesh,col,tmat,compose,lam,glow} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {CONFIG,WINTER} from '../config.js';
import {groundAt,isFree} from '../world/physics.js';
import {spawnTool} from './tools.js';
import {puff,smokeRing} from '../world/particles.js';
import {sfx} from '../core/sfx.js';
import {buildingAt} from '../missions/location.js';
export const SUP={next:50,crates:[],loot:0,lootCD:0};
export function resetSupplies(){for(const c of SUP.crates){c.g.removeFromParent();c.witch?.removeFromParent();c.beam.removeFromParent();c.beam.material.dispose();}SUP.next=(WINTER?70:40)+random()*20;SUP.crates=[];SUP.loot=0;SUP.lootCD=0;W.containerLoot=containerLoot;W.supplies=[];}
export function containerLoot(p){if(SUP.loot>=8||SUP.lootCD>0||random()>.22)return false;spawnTool(p.x,p.y+.4,p.z,true);SUP.loot++;SUP.lootCD=12;return true;}
function witchModel(variant){const g=new THREE.Group(),coat=tmat(T.cloth([0x594a86,0x426c58,0x904a67][variant]));g.add(compose('witch30'+variant,a=>{const wood=tmat(T.wood()),dk=col(0x24202c);a(G.cyl6,wood,0,-.25,0,.035,2.5,.035,Math.PI/2);a(G.cone6,tmat(T.hay()),0,-.25,-1.25,.28,.7,.28,Math.PI/2);a(G.cone6,coat,0,.08,0,.35,.65,.27);a(G.sph10,col(0xd7b396),0,.65,.18,.19,.22,.18);a(G.cone6,coat,0,1.08,.15,.32,.65,.32,0,0,.12);a(G.cyl8,dk,0,.80,.15,.38,.04,.38);for(const x of [-.12,.12]){a(G.box,col(0x3a303e),x,-.28,.34,.12,.3,.14);a(G.box,dk,x,-.43,.43,.15,.09,.3);a(G.box,col(0xd7b396),x,.27,.51,.08,.09,.1);}a(G.box,wood,0,.25,.5,.36,.04,.04);a(G.box,col(0xf5c542),0,.91,.4,.15,.1,.015);}));return g;}
/* v0.71 J8: зимой вместо ведьмы - небольшой детальный олень с упряжью, колокольчиком и мешком на спине.
   Скачет по воздуху (ноги в галопе), над местом сбрасывает новогодний мешочек. */
function reindeerModel(){const g=new THREE.Group(),fur=lam({color:0x8a5a36},'deerFur71'),light=lam({color:0xd9b98c},'deerLight71'),dk=col(0x2a1c16),ant=lam({color:0xd8c39a},'deerAntler71'),red=col(0xc8202e),gold=lam({color:0xf5c542,emissive:0x8a5a10,emissiveIntensity:.35},'deerGold71');
 g.add(compose('reindeer71',a=>{a(G.sph10,fur,0,0,0,.36,.3,.62);a(G.sph10,light,0,-.1,.05,.28,.2,.5);a(G.sph10,light,0,.06,-.6,.14,.14,.12);
  a(G.cyl8,fur,0,.32,.5,.13,.42,.13,-.6,0,0);a(G.sph10,fur,0,.58,.74,.17,.17,.2);a(G.sph10,light,0,.52,.92,.11,.1,.14);a(G.sph,glow(0xff3a3a),0,.54,1.05,.06,.06,.06);
  for(const x of[-1,1]){a(G.sph,dk,x*.09,.64,.88,.03,.035,.02);a(G.cone4,fur,x*.14,.72,.68,.05,.12,.03,0,0,x*-.9);
   a(G.cyl6,ant,x*.07,.86,.68,.025,.32,.025,0,0,x*-.35);a(G.cyl6,ant,x*.17,1.04,.66,.02,.2,.02,0,0,x*-1.0);a(G.cyl6,ant,x*.12,1.0,.76,.02,.16,.02,.7,0,x*-.3);a(G.cyl6,ant,x*.2,1.12,.6,.018,.14,.018,-.5,0,x*-.5);}
  a(G.torus,red,0,.22,.42,.2,.2,.24,Math.PI/2.4,0,0);a(G.sph,gold,0,.06,.58,.06,.06,.06);a(G.box,red,0,.27,0,.74,.05,.16);
  a(G.sph10,lam({color:0xb3262e},'deerSack71'),0,.42,-.15,.26,.24,.24);a(G.cyl6,gold,0,.62,-.15,.06,.05,.06);}));
 const legs=[];for(const[x,z]of[[-.18,.38],[.18,.38],[-.18,-.38],[.18,-.38]]){const l=new THREE.Group();l.position.set(x,-.12,z);g.add(l);mesh(G.cyl6,fur,0,-.25,0,.05,.5,.05,l);mesh(G.box,dk,0,-.52,.02,.07,.06,.09,l);legs.push(l);}
 g.userData.legs=legs;g.scale.setScalar(1.25);return g;}
function sackModel(variant){return compose('xmasSack71'+variant,a=>{const c=[0xc8202e,0x2f7a46,0x6b4f8f][variant],m=lam({map:T.cloth?T.cloth(c):undefined,color:0xffffff},'sackCloth71'+variant),gold=lam({color:0xf5c542,emissive:0x8a5a10,emissiveIntensity:.3},'deerGold71');
 a(G.sph10,m,0,.34,0,.42,.38,.4);a(G.cone6,m,0,.78,0,.17,.24,.17,Math.PI);a(G.cyl8,gold,0,.68,0,.12,.06,.12);for(const s of[-1,1])a(G.box,gold,s*.13,.66,.06,.18,.06,.03,0,0,s*.6);
 a(G.sph,lam({color:0xf2f6ff},'sackStar71'),0,.42,.4,.1,.1,.03);for(let i=0;i<5;i++){const an=i/5*6.28;a(G.box,gold,Math.sin(an)*.1,.42+Math.cos(an)*.1,.41,.03,.09,.02,0,0,-an);}});}
export function spawnSupply(){
 const zones=W.missionZones.filter(z=>z.type==='floor'&&Math.abs(z.y-CONFIG.base)<.4);let p=null;
 for(let i=0;i<100&&zones.length;i++){const z=zones[random()*zones.length|0],x=z.x0+1+random()*Math.max(0,z.x1-z.x0-2),zz=z.z0+1+random()*Math.max(0,z.z1-z.z0-2),y=groundAt(x,zz,.5,z.y+.4),q=new V3(x,y,zz);if(Math.abs(y-z.y)>.3||buildingAt(q)||!isFree(x-1,zz-1,x+1,zz+1,y+.08,y+25))continue;p=q;break;}if(!p)return null;
 const variant=random()*3|0,g=new THREE.Group();W.group.add(g);g.visible=false;
 if(WINTER)g.add(sackModel(variant));else g.add(compose('witchParcel30'+variant,a=>{const m=tmat(T.cloth([0x875d46,0x685286,0x567a62][variant]));a(G.sph10,m,0,.32,0,.42,.35,.35);a(G.cyl6,col(0xe2c68b),0,.66,0,.09,.10,.09);a(G.box,tmat(T.sign(['ПОСЫЛКА','ПОДАРОК','СЮРПРИЗ'][variant],'#d5bc84','#322539')),0,.33,.34,.42,.22,.02);}));
 const angle=random()*6.28,dir=new V3(Math.sin(angle),0,Math.cos(angle)),witch=WINTER?reindeerModel():witchModel(variant);W.group.add(witch);const bm=new THREE.MeshBasicMaterial({color:WINTER?0xf5c542:0xb18cff,transparent:true,opacity:.14,depthWrite:false}),beam=mesh(G.beam,bm,p.x,p.y+4,p.z,.35,8,.35,W.group);beam.visible=false;
 const c={p,g,beam,witch,dir,k:-30,height:9+variant*1.5,vy:0,dropped:false,landed:false,opened:false,life:75,smoke:0,variant};
 c.interact={x:p.x,y:p.y,z:p.z,r:1.8,dy:1.5,label:WINTER?'Развязать мешок с подарком':'Развязать подарок ведьмы',enabled:a=>c.landed&&!c.opened&&!a.held,act(){if(!c.landed||c.opened)return;c.opened=true;W.coinLoot?.(p,c);spawnTool(p.x,p.y+.5,p.z,true);sfx('open',{at:p});smokeRing(p.x,p.y+.1,p.z,6,{speed:1.4,color:WINTER?0xf2f6ff:0xb18cff});}};
 W.keep.push(g,witch,beam);W.interacts.push(c.interact);SUP.crates.push(c);return c;
}
export function updateSupplies(dt){SUP.next-=dt;SUP.lootCD-=dt;if(SUP.next<=0){SUP.next=WINTER?80+random()*40:40+random()*20;if(SUP.crates.length<(WINTER?1:2))spawnSupply();}
 for(const c of SUP.crates){c.life-=dt;c.k+=dt*(8+c.variant);const t=c.k/9;
 if(c.witch){c.witch.position.copy(c.p).addScaledVector(c.dir,c.k);c.witch.position.y+=c.height+Math.sin(t*2)*.3;c.witch.rotation.set(Math.sin(t)*.04,Math.atan2(c.dir.x,c.dir.z),Math.sin(t*1.4)*.10);const L=c.witch.userData.legs;if(L){const ph=c.k*1.6;L.forEach((l,i)=>l.rotation.x=Math.sin(ph+(i<2?0:Math.PI)+(i%2)*.6)*.8);c.witch.position.y+=Math.abs(Math.sin(ph))*.25;}}
 if(!c.dropped&&c.k>=0){c.dropped=true;c.g.visible=true;c.g.position.copy(c.p).y+=c.height-.5;c.vy=0;sfx(WINTER?'bell':'laugh',{at:c.p});}
 if(c.dropped&&!c.landed){c.vy-=15*dt;c.g.position.y=Math.max(c.p.y,c.g.position.y+c.vy*dt);c.g.rotation.y+=dt*2;c.g.rotation.z=Math.sin(c.g.position.y)*.14;if(c.g.position.y<=c.p.y){c.landed=true;c.g.rotation.z=0;c.beam.visible=true;sfx('land',{at:c.p});smokeRing(c.p.x,c.p.y+.08,c.p.z,6,{speed:2});}}
 if(c.witch&&c.k>35){c.witch.removeFromParent();W.keep=W.keep.filter(q=>q!==c.witch);c.witch=null;}
 c.smoke-=dt;if(c.landed&&c.smoke<=0){c.smoke=.8;puff(c.p.x,c.p.y+.5,c.p.z,{color:WINTER?0xf5e6b0:0xb18cff,size:.18,vy:.6,life:.8,grow:1});}
 if(c.opened||c.life<=0){c.g.removeFromParent();c.witch?.removeFromParent();c.beam.removeFromParent();c.beam.material.dispose();W.interacts=W.interacts.filter(q=>q!==c.interact);W.keep=W.keep.filter(q=>q!==c.g&&q!==c.witch&&q!==c.beam);}}
 SUP.crates=SUP.crates.filter(c=>!c.opened&&c.life>0);W.supplies=SUP.crates;
}
