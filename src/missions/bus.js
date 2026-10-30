import {busPlaces,busClear} from './bus-route.js';
export {busPlaces} from './bus-route.js';
import {busStop} from './bus-stops.js';
import {cam} from '../game/camera.js';
import {THREE,G,V3,mesh,col,tmat} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {CONFIG} from '../config.js';
import {W} from '../world/state.js';
import {isFree,addObb,groundAt,solidsNear} from '../world/physics.js';
import {keys} from '../core/input.js';
import {actors,knockDown} from '../game/actors.js';
import {sfx} from '../core/sfx.js';
import {busModel,busKitten} from './bus-model.js';
export function buildBus(place){const model=busModel(),{g,doors,wheels}=model;g.position.set(place.x,place.y,place.z);g.rotation.y=place.yaw??((place.axis==='x'?Math.PI/2:0)+(place.sign===-1?Math.PI:0));W.group.add(g);const solid=addObb({cx:place.x,cz:place.z,yaw:g.rotation.y,lx0:-1.2,lx1:1.2,lz0:-3.9,lz1:3.9,y0:.35,y1:3.1});const step=addObb({cx:place.x,cz:place.z,yaw:g.rotation.y,lx0:-.65,lx1:.65,lz0:-4.45,lz1:-3.80,y0:.45,y1:1.25,busStep:true});W.keep.push(g);let arrival=0;const destination=g.position.clone(),entry=destination.clone().add(new V3(-Math.sin(g.rotation.y)*4,0,-Math.cos(g.rotation.y)*4));g.position.copy(entry);let o,roofInteract;const arrive=dt=>{if(o.claimed||arrival>=1)return;arrival=Math.min(1,arrival+dt*.65);g.position.lerpVectors(entry,destination,arrival*arrival*(3-2*arrival));solid.cx=g.position.x;solid.cz=g.position.z;step.cx=g.position.x;step.cz=g.position.z;for(const w of wheels)w.rotation.x+=dt*3;};W.animated.push(arrive);o={...model,solid,step,place,reach:3.2,pos:()=>g.position,front:()=>g.localToWorld(new V3(2.1,0,2.7)),approach(p){const q=g.worldToLocal(p.clone());q.x=Math.max(-1.9,Math.min(1.9,q.x));q.z=Math.max(-4.5,Math.min(4.5,q.z));return g.localToWorld(q);},dispose(){W.animated=W.animated.filter(q=>q!==arrive);g.removeFromParent();W.interacts=W.interacts.filter(q=>q!==roofInteract);solid.on=step.on=false;W.obbs=W.obbs.filter(q=>q!==solid&&q!==step);for(const a of actors())if(a.roofSeat?.o===o)a.roofSeat=null;W.keep=W.keep.filter(q=>q!==g);}};roofInteract={get x(){return g.position.x;},get z(){return g.position.z;},y:3.1,r:4.0,dy:.3,label:'Сесть на крышу автобуса',enabled:a=>!a.bus&&!a.held&&Math.abs(a.pos.y-3.1)<.15&&Math.abs(g.worldToLocal(a.pos.clone()).x)<1.1&&Math.abs(g.worldToLocal(a.pos.clone()).z)<3.6,act:a=>{a.roofSeat={o,local:g.worldToLocal(a.pos.clone())};a.vel.set(0,0,0);}};W.interacts.push(roofInteract);return o;}
export function busGame(o,api,ctx){
 api.feedback();o.claimed=true;const P=ctx.player,{g,doors,wheels}=o,roads=o.place.roads,passengers=[];let time=210,phase='boarding',door=1,wantDoor=1,speed=0,stop=0,unload=0,elapsed=0,board=0,done=false;
 // Три остановки вдоль случайно выбранной сквозной городской улицы.
 const start=o.place,sign=start.sign||1,axis=start.axis||'z',right=new V3(Math.cos(g.rotation.y),0,-Math.sin(g.rotation.y)),forward=new V3(Math.sin(g.rotation.y),0,Math.cos(g.rotation.y));
 const stops=start.stops||[0,1,2].map(i=>{const p=new V3(start.x,0,start.z);p[axis]=sign*(roads[0]+(CONFIG.chunk+CONFIG.road)*(i+.5));return p;});
 const signs=stops.map((p,i)=>busStop(p,start.stopYaws?.[i]??g.rotation.y));
 for(let i=0;i<6;i++){const cat=busKitten(i);cat.position.set(i%2?.72:-.72,.93,-2.45+Math.floor(i/2)*1.3);cat.scale.setScalar(.78);g.add(cat);passengers.push(cat);}
 const lastMatrix=new THREE.Matrix4();let routeIndex=1;
 const nearStop=()=>{if(stop>=3)return false;const yaw=start.stopYaws?.[stop]??g.rotation.y,q=stops[stop],dx=g.position.x-q.x,dz=g.position.z-q.z,c=Math.cos(yaw),s=Math.sin(yaw);return Math.abs(dx*c-dz*s)<1.0&&Math.abs(dx*s+dz*c)<2.4&&Math.abs(Math.atan2(Math.sin(g.rotation.y-yaw),Math.cos(g.rotation.y-yaw)))<.42;};
 const free=(x,z,yaw)=>busClear(x,z,yaw,o.solid);
 function routeGoal(){if(!start.path)return stops[stop];const cap=start.stopIndices[Math.min(stop,2)];while(routeIndex<cap&&g.position.distanceTo(start.path[routeIndex])<2.0)routeIndex++;return start.path[Math.min(routeIndex,cap)];}
 function seat(){P.bus=o;P.noRun=false;P.vel.set(0,0,0);if(!ctx.bot){cam.yaw+=Math.atan2(Math.sin(g.rotation.y+Math.PI-cam.yaw),Math.cos(g.rotation.y+Math.PI-cam.yaw));cam.pitch=.35;cam.blend=0;api.pose(null);}phase='drive';wantDoor=0;sfx('door');api.msg('W/S - газ и тормоз, A/D - руль. ЛКМ у остановки - двери');}
 function leave(success){if(done)return;done=true;P.bus=null;P.stationaryWork=false;P.pos.copy(g.localToWorld(new V3(2.0,0,2.7)));P.onGround=true;P.vel.set(0,0,0);if(!ctx.bot){cam.blend=0;api.pose(null);}api.finish({success,mult:1});}

 api.msg('Дверь открыта. Подойди к переднему входу');
 return{get equipped(){return phase==='drive'||phase==='exit';},get phase(){return phase;},get stops(){return stops;},get stopIndex(){return stop;},get speed(){return speed;},get doorsOpen(){return door>.95;},get passengers(){return passengers;},botDrop:false,
  target:()=>phase==='boarding'?o.front():phase==='exit'?o.front():stops[Math.min(2,stop)],botTarget(){return phase==='boarding'?o.front():g.position;},
  prompt(){if(phase==='boarding'&&P.pos.distanceTo(o.front())<3.2)return'<b>E</b>За руль автобуса 63';if(phase==='exit')return'<b>E</b>Выйти из автобуса';if(phase==='drive'&&nearStop()&&Math.abs(speed)<.5)return'<b>ЛКМ</b>'+ (wantDoor?'Закрыть двери':'Открыть двери');return'';},
  interact(){if(phase==='boarding'&&P.pos.distanceTo(o.front())<3.2){seat();return true;}if(phase==='exit'){leave(true);return true;}return !!P.bus;},
  down(){if(P.stun>0||P.heldBy)return;if(phase!=='drive'||!nearStop()||Math.abs(speed)>.5)return;if(wantDoor&&unload<2)return;wantDoor=1-wantDoor;sfx('door');if(!wantDoor&&unload===2){stop++;unload=0;if(stop===3){phase='exit';wantDoor=1;api.msg('Все пассажиры на месте. E - выйти','good');}else api.msg('Следующая остановка - '+(stop+1));}},
  botStep(dt){if(phase==='boarding'){board+=dt;if(board>.6)seat();}else if(phase==='drive'&&nearStop()&&Math.abs(speed)<.5){if(!wantDoor||unload===2)this.down();}else if(phase==='exit')leave(true);},
  update(dt){if(done)return;for(const a of actors())a.busHitCD=Math.max(0,(a.busHitCD||0)-dt);for(let i=0;i<signs.length;i++){const m=signs[i].userData.parking.mat;m.color.setHex(i===stop?(nearStop()?0xe5cd75:0xa7cc88):0x71856d);m.opacity=i===stop?.68+Math.sin(elapsed*3)*.12:.22;}time-=dt;elapsed+=dt;api.timer(time);if(time<=0||P.drone||P.returning){leave(false);return;}door+=(wantDoor-door)*(1-Math.exp(-dt*7));for(const p of doors)p.rotation.y=door*1.2*p.userData.openSign;
   if(phase==='drive'||phase==='exit'){
    let gas=(keys.KeyW?1:0)-(keys.KeyS?1:0),steer=(keys.KeyA?1:0)-(keys.KeyD?1:0);if(ctx.bot){const target=routeGoal();if(target){const desired=Math.atan2(target.x-g.position.x,target.z-g.position.z),delta=Math.atan2(Math.sin(desired-g.rotation.y),Math.cos(desired-g.rotation.y));steer=Math.max(-1,Math.min(1,delta*3));if(Math.abs(delta)>Math.PI/2){steer=-Math.sign(delta)*Math.min(1,(Math.PI-Math.abs(delta))*2);gas=Math.max(-1,Math.min(1,(-3-speed)*.6));}else{const targetSpeed=nearStop()?0:Math.abs(delta)>.12?2.4:8;gas=Math.max(-1,Math.min(1,(targetSpeed-speed)*1.2));}}}
    if(phase==='exit'||door>.02||wantDoor||P.stun>0||P.getT>0)gas=0;
    speed+=gas*dt*5;if(!gas)speed*=Math.exp(-dt*3.4);speed=Math.max(-3,Math.min(11,speed));if(wantDoor||door>.02)speed=0;
    g.updateMatrixWorld(true);lastMatrix.copy(g.matrixWorld).invert();const roofRiders=actors().filter(a=>a!==P&&a.pos.y>=3.04&&a.pos.y<3.6&&Math.abs(g.worldToLocal(a.pos.clone()).x)<1.35&&Math.abs(g.worldToLocal(a.pos.clone()).z)<3.9).map(a=>({a,p:a.pos.clone().applyMatrix4(lastMatrix)}));
    const yaw=g.rotation.y+steer*dt*.85*Math.min(1,Math.abs(speed)/2.4)*Math.sign(speed||1),distance=speed*dt,n=Math.max(1,Math.ceil(Math.abs(distance)/.18));for(let i=0;i<n;i++){const x=g.position.x+Math.sin(yaw)*distance/n,z=g.position.z+Math.cos(yaw)*distance/n;if(!free(x,z,yaw)){speed=0;break;}g.position.set(x,0,z);g.rotation.y=yaw;}
    o.solid.cx=g.position.x;o.solid.cz=g.position.z;o.solid.yaw=g.rotation.y;o.step.cx=g.position.x;o.step.cz=g.position.z;o.step.yaw=g.rotation.y;g.updateMatrixWorld(true);for(const {a,p} of roofRiders)a.pos.copy(g.localToWorld(p));for(const w of wheels)w.rotation.x+=speed*dt/.46;
    P.pos.copy(g.localToWorld(new V3(-.65,.72,2.65)));P.vel.set(0,0,0);P.root.rotation.y=g.rotation.y;P.facing=g.rotation.y;
    for(const a of actors())if(a!==P&&!a.bus&&Math.abs(a.pos.y)<1.5){const local=g.worldToLocal(a.pos.clone());if(Math.abs(local.x)<1.65&&Math.abs(local.z)<4.2&&Math.abs(speed)>3&&!(a.busHitCD>0)){knockDown(a,Math.sin(g.rotation.y)*speed*1.15+Math.cos(g.rotation.y)*Math.sign(local.x)*3,Math.cos(g.rotation.y)*speed*1.15-Math.sin(g.rotation.y)*Math.sign(local.x)*3,1.2);a.vel.y=5;a.busHitCD=1.1;sfx('hit',{at:a.pos});}}
    if(wantDoor&&door>.9&&nearStop()&&stop<3&&unload<2){const i=stop*2+unload,cat=passengers[i];if(cat){g.updateMatrixWorld(true);const t=(cat.userData.walk||0)+dt;cat.userData.walk=t;if(t<.7){cat.position.lerp(new V3(.78,.93,2.65),1-Math.exp(-dt*5));cat.rotation.y=Math.PI/2;}else if(t<1.35){const k=(t-.7)/.65;cat.position.set(.78+k*1.3,.93*(1-k)+Math.sin(k*Math.PI)*.12,2.65);cat.userData.feet.forEach((f,j)=>f.rotation.x=Math.sin(t*11+j*Math.PI)*.55);}else{if(cat.parent===g)W.group.attach(cat);const dest=signs[stop].localToWorld(new V3(4.7,0,(unload?1:-1)*.65));cat.position.lerp(dest,1-Math.exp(-dt*2.8));cat.rotation.y=Math.atan2(dest.x-cat.position.x,dest.z-cat.position.z);cat.position.y=Math.abs(Math.sin(t*11))*.035;cat.userData.feet.forEach((f,j)=>f.rotation.x=Math.sin(t*11+j*Math.PI)*.55);if(t>3.2){cat.userData.feet.forEach(f=>f.rotation.x=0);unload++;api.progress((stop*2+unload)/6);}}}}

   }
  },
  stop(){for(const a of actors())if(a.roofSeat?.o===o)a.roofSeat=null;if(P.bus)P.pos.copy(g.localToWorld(new V3(2,0,2.7)));P.bus=null;P.stationaryWork=false;if(!ctx.bot){cam.blend=0;api.pose(null);}for(const q of[...signs,...passengers])q.removeFromParent();for(const q of signs){q.userData.parking.mat.dispose();W.keep=W.keep.filter(k=>k!==q);}}
 };
}
