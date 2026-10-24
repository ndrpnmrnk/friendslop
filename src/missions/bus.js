import {THREE,G,V3,mesh,col,tmat} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {CONFIG} from '../config.js';
import {W} from '../world/state.js';
import {isFree,addObb,groundAt,solidsNear} from '../world/physics.js';
import {keys} from '../core/input.js';
import {actors,shove} from '../game/actors.js';
import {sfx} from '../core/sfx.js';
import {busModel,busKitten} from './bus-model.js';
// Остановки на связной решётке существующих дорог, а не внутри случайных районов.
export function busPlaces(){const{grid,chunk,road}=CONFIG,half=(grid*chunk+(grid+1)*road)/2,roads=Array.from({length:grid+1},(_,i)=>-half+road/2+i*(chunk+road)),out=[];
 for(const lane of roads.slice(1,-1))for(const axis of['x','z'])for(const sign of[-1,1]){const along=sign*(-half+road+6),x=axis==='z'?lane:along,z=axis==='z'?along:lane,rx=axis==='z'?1.3:4.1,rz=axis==='z'?4.1:1.3;
  const minX=axis==='z'?lane-1.35:-half+5,maxX=axis==='z'?lane+1.35:half-5,minZ=axis==='z'?-half+5:lane-1.35,maxZ=axis==='z'?half-5:lane+1.35;const blocked=solidsNear(minX,minZ,maxX,maxZ).some(q=>q.on&&q.y1>.4&&q.y0<3.1&&q.x1>minX&&q.x0<maxX&&q.z1>minZ&&q.z0<maxZ);
  if(!blocked&&isFree(x-rx,z-rz,x+rx,z+rz,.4,3.1)&&Math.abs(groundAt(x,z,.5,.3))<.1)out.push({x,y:0,z,roads,axis,sign});}return out;}
export function buildBus(place){const model=busModel(),{g,doors,wheels}=model;g.position.set(place.x,place.y,place.z);g.rotation.y=(place.axis==='x'?Math.PI/2:0)+(place.sign===-1?Math.PI:0);W.group.add(g);const solid=addObb({cx:place.x,cz:place.z,yaw:g.rotation.y,lx0:-1.2,lx1:1.2,lz0:-3.9,lz1:3.9,y0:.35,y1:3.1});W.keep.push(g);let arrival=0;const destination=g.position.clone(),entry=destination.clone().add(new V3(-Math.sin(g.rotation.y)*4,0,-Math.cos(g.rotation.y)*4));g.position.copy(entry);let o;const arrive=dt=>{if(o.claimed||arrival>=1)return;arrival=Math.min(1,arrival+dt*.65);g.position.lerpVectors(entry,destination,arrival*arrival*(3-2*arrival));solid.cx=g.position.x;solid.cz=g.position.z;for(const w of wheels)w.rotation.x+=dt*3;};W.animated.push(arrive);o={...model,solid,place,reach:3.2,pos:()=>g.position,front:()=>g.localToWorld(new V3(2.1,0,2.7)),approach(p){const q=g.worldToLocal(p.clone());q.x=Math.max(-1.9,Math.min(1.9,q.x));q.z=Math.max(-4.5,Math.min(4.5,q.z));return g.localToWorld(q);},dispose(){W.animated=W.animated.filter(q=>q!==arrive);g.removeFromParent();solid.on=false;W.obbs=W.obbs.filter(q=>q!==solid);W.keep=W.keep.filter(q=>q!==g);}};return o;}
export function busGame(o,api,ctx){
 api.feedback();o.claimed=true;const P=ctx.player,{g,doors,wheels}=o,roads=o.place.roads,passengers=[];let time=210,phase='boarding',door=1,wantDoor=1,speed=0,stop=0,unload=0,elapsed=0,board=0,done=false;
 // Три остановки вдоль случайно выбранной сквозной городской улицы.
 const start=o.place,sign=start.sign||1,axis=start.axis||'z',right=new V3(Math.cos(g.rotation.y),0,-Math.sin(g.rotation.y)),forward=new V3(Math.sin(g.rotation.y),0,Math.cos(g.rotation.y));
 const stops=[0,1,2].map(i=>{const p=new V3(start.x,0,start.z);p[axis]=sign*(roads[0]+(CONFIG.chunk+CONFIG.road)*(i+.5));return p;});
 const signs=stops.map((p,i)=>{const q=new THREE.Group();q.position.copy(p).addScaledVector(right,2.1);q.rotation.y=g.rotation.y;W.group.add(q);mesh(G.cyl6,col(0x636778),0,1.3,0,.035,2.6,.035,q);mesh(G.box,tmat(T.sign('63','#28394b','#e2c678')),0,2.45,0,.55,.55,.06,q);mesh(G.box,col(0xb8ac91),0,.02,0,.8,.03,7,q);W.keep.push(q);return q;});
 for(let i=0;i<6;i++){const cat=busKitten();cat.position.set(i%2?.72:-.72,.93,-2.45+Math.floor(i/2)*1.3);cat.scale.setScalar(.78);g.add(cat);passengers.push(cat);}
 const position=new V3(),look=new V3(),cp=g.localToWorld(new V3(5,4,-8.5)),cl=g.localToWorld(new V3(0,1.5,0));
 const nearStop=()=>stop<3&&Math.hypot(g.position.x-stops[stop].x,g.position.z-stops[stop].z)<5.6;
 const free=(x,z,yaw)=>{for(const zz of[-3.65,-1.8,0,1.8,3.65])for(const xx of[-1.04,1.04]){const px=x+Math.cos(yaw)*xx+Math.sin(yaw)*zz,pz=z-Math.sin(yaw)*xx+Math.cos(yaw)*zz;for(const q of solidsNear(px-.15,pz-.15,px+.15,pz+.15))if(q.on&&q.y1>.4&&q.y0<3.1&&px+.15>q.x0&&px-.15<q.x1&&pz+.15>q.z0&&pz-.15<q.z1)return false;for(const q of W.obbs)if(q!==o.solid&&q.on!==false&&q.y1>.4&&q.y0<3.1){const c=Math.cos(q.yaw),s=Math.sin(q.yaw),dx=px-q.cx,dz=pz-q.cz,lx=c*dx-s*dz,lz=s*dx+c*dz;if(lx+.15>q.lx0&&lx-.15<q.lx1&&lz+.15>q.lz0&&lz-.15<q.lz1)return false;}}return true;};
 function routeGoal(){const target=stops[stop];if(!target)return null;const x=g.position.x,z=g.position.z,nearest=roads.reduce((a,b)=>Math.abs(a-x)<Math.abs(b-x)?a:b);if(Math.abs(x-target.x)>.8){const cross=roads.reduce((a,b)=>Math.abs(a-z)+Math.abs(a-target.z)<Math.abs(b-z)+Math.abs(b-target.z)?a:b);if(Math.abs(z-cross)>1)return new V3(nearest,0,cross);return new V3(target.x,0,cross);}return target;}
 function seat(){P.bus=o;P.noRun=false;P.vel.set(0,0,0);phase='drive';wantDoor=0;sfx('door');api.msg('W/S - газ и тормоз, A/D - руль. ЛКМ у остановки - двери');}
 function leave(success){if(done)return;done=true;P.bus=null;P.stationaryWork=false;P.pos.copy(g.localToWorld(new V3(2.0,0,2.7)));P.onGround=true;P.vel.set(0,0,0);if(!ctx.bot)api.pose(null);api.finish({success,mult:1});}
 api.msg('Дверь открыта. Подойди к переднему входу');
 return{get equipped(){return phase==='drive'||phase==='exit';},get phase(){return phase;},get stops(){return stops;},get stopIndex(){return stop;},get speed(){return speed;},get doorsOpen(){return door>.95;},get passengers(){return passengers;},botDrop:false,
  target:()=>phase==='boarding'?o.front():phase==='exit'?o.front():stops[Math.min(2,stop)],botTarget(){return phase==='boarding'?o.front():g.position;},
  prompt(){if(phase==='boarding'&&P.pos.distanceTo(o.front())<3.2)return'<b>E</b>За руль автобуса 63';if(phase==='exit')return'<b>E</b>Выйти из автобуса';if(phase==='drive'&&nearStop()&&Math.abs(speed)<.5)return'<b>ЛКМ</b>'+ (wantDoor?'Закрыть двери':'Открыть двери');return'';},
  interact(){if(phase==='boarding'&&P.pos.distanceTo(o.front())<3.2){seat();return true;}if(phase==='exit'){leave(true);return true;}return !!P.bus;},
  down(){if(P.stun>0||P.heldBy)return;if(phase!=='drive'||!nearStop()||Math.abs(speed)>.5)return;if(wantDoor&&unload<2)return;wantDoor=1-wantDoor;sfx('door');if(!wantDoor&&unload===2){stop++;unload=0;if(stop===3){phase='exit';wantDoor=1;api.msg('Все пассажиры на месте. E - выйти','good');}else api.msg('Следующая остановка - '+(stop+1));}},
  botStep(dt){if(phase==='boarding'){board+=dt;if(board>.6)seat();}else if(phase==='drive'&&nearStop()&&Math.abs(speed)<.5){if(!wantDoor||unload===2)this.down();}else if(phase==='exit')leave(true);},
  update(dt){if(done)return;time-=dt;elapsed+=dt;api.timer(time);if(time<=0||P.drone||P.returning){leave(false);return;}door+=(wantDoor-door)*(1-Math.exp(-dt*7));for(const p of doors)p.rotation.y=door*1.2*p.userData.openSign;
   if(phase==='drive'||phase==='exit'){
    let gas=(keys.KeyW?1:0)-(keys.KeyS?1:0),steer=(keys.KeyA?1:0)-(keys.KeyD?1:0);if(ctx.bot){const target=routeGoal();if(target){const desired=Math.atan2(target.x-g.position.x,target.z-g.position.z),delta=Math.atan2(Math.sin(desired-g.rotation.y),Math.cos(desired-g.rotation.y));steer=Math.max(-1,Math.min(1,delta*2));if(Math.abs(delta)>Math.PI/2){steer=-Math.sign(delta)*Math.min(1,(Math.PI-Math.abs(delta))*2);gas=Math.max(-1,Math.min(1,(-3-speed)*.6));}else{const targetSpeed=nearStop()?0:Math.abs(delta)>.35?3:7;gas=Math.max(-1,Math.min(1,(targetSpeed-speed)*.6));}}}
    if(phase==='exit'||door>.02||wantDoor||P.stun>0||P.getT>0)gas=0;
    speed+=gas*dt*5;if(!gas)speed*=Math.exp(-dt*3.4);speed=Math.max(-3,Math.min(11,speed));if(wantDoor||door>.02)speed=0;
    const yaw=g.rotation.y+steer*dt*.85*Math.min(1,Math.abs(speed)/2.4)*Math.sign(speed||1),distance=speed*dt,n=Math.max(1,Math.ceil(Math.abs(distance)/.18));for(let i=0;i<n;i++){const x=g.position.x+Math.sin(yaw)*distance/n,z=g.position.z+Math.cos(yaw)*distance/n;if(Math.abs(x)>W.bounds-5||Math.abs(z)>W.bounds-5||!free(x,z,yaw)){speed=0;break;}g.position.set(x,0,z);g.rotation.y=yaw;}
    o.solid.cx=g.position.x;o.solid.cz=g.position.z;o.solid.yaw=g.rotation.y;for(const w of wheels)w.rotation.x+=speed*dt/.46;
    P.pos.copy(g.localToWorld(new V3(-.65,.72,2.65)));P.vel.set(0,0,0);P.root.rotation.y=g.rotation.y;P.facing=g.rotation.y;
    for(const a of actors())if(a!==P&&!a.bus&&Math.abs(a.pos.y)<1.5){const local=g.worldToLocal(a.pos.clone());if(Math.abs(local.x)<1.65&&Math.abs(local.z)<4&&Math.abs(speed)>2)shove(a,a.pos.x-g.position.x,a.pos.z-g.position.z,3,2,false);}
    if(wantDoor&&door>.9&&nearStop()&&stop<3&&unload<2){const i=stop*2+unload,cat=passengers[i];if(cat){g.updateMatrixWorld(true);const t=(cat.userData.walk||0)+dt;cat.userData.walk=t;if(t<.7){cat.position.lerp(new V3(.67,.58,2.55),1-Math.exp(-dt*5));}else{if(cat.parent===g)W.group.attach(cat);const dest=signs[stop].position.clone().add(right.clone().multiplyScalar(.9).addScaledVector(forward,(unload?1:-1)*.65));cat.position.lerp(dest,1-Math.exp(-dt*2.8));cat.rotation.y=Math.PI/2;cat.position.y=Math.abs(Math.sin(t*11))*.035;cat.userData.feet.forEach((f,j)=>f.rotation.x=Math.sin(t*11+j*Math.PI)*.55);if(t>2.0){cat.userData.feet.forEach(f=>f.rotation.x=0);unload++;api.progress((stop*2+unload)/6);}}}}
    if(!ctx.bot){position.copy(g.localToWorld(new V3(5,4,-8.5)));look.copy(g.localToWorld(new V3(0,1.5,.8)));cp.lerp(position,1-Math.exp(-dt*4));cl.lerp(look,1-Math.exp(-dt*5));api.pose(cp,cl);}
   }
  },
  stop(){if(P.bus)P.pos.copy(g.localToWorld(new V3(2,0,2.7)));P.bus=null;P.stationaryWork=false;if(!ctx.bot)api.pose(null);for(const q of[...signs,...passengers])q.removeFromParent();for(const q of signs)W.keep=W.keep.filter(k=>k!==q);}
 };
}
