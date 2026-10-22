import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {CONFIG} from '../config.js';
import {W} from '../world/state.js';
import {addPushable} from '../world/pushables.js';
import {actors,dropHeld,daze} from './actors.js';
import {mount,dismount,updateRide} from './ride.js';
import {sfx} from '../core/sfx.js';
import {smokeRing} from '../world/particles.js';
// Маршрут - замкнутый ортогональный цикл по существующей дорожной сетке.
export function roadRoute(player){const {grid,chunk,road}=CONFIG,half=(grid*chunk+(grid+1)*road)/2,c=i=>-half+road/2+i*(chunk+road),a=Math.random()*(grid-1)|0,b=Math.min(grid,a+1+(Math.random()*2|0)),d=Math.random()*(grid-1)|0,e=Math.min(grid,d+1+(Math.random()*2|0));let nodes=[[a,d],[b,d],[b,e],[a,e]];if(b-a>1&&e-d>1&&Math.random()<.5)nodes=[[a,d],[a+1,d],[a+1,d+1],[b,d+1],[b,e],[a,e]];if(Math.random()<.5)nodes.reverse();let pts=[];for(let i=0;i<nodes.length;i++){const p=nodes[i],q=nodes[(i+1)%nodes.length],dx=c(q[0])-c(p[0]),dz=c(q[1])-c(p[1]),n=Math.ceil(Math.hypot(dx,dz)/12);for(let j=0;j<n;j++)pts.push(new V3(c(p[0])+dx*j/n,0,c(p[1])+dz*j/n));}let k=0;for(let i=0;i<pts.length;i++)if(pts[i].distanceToSquared(player.pos)<pts[k].distanceToSquared(player.pos))k=i;return pts.slice(k).concat(pts.slice(0,k));}
export function raceEvent(ctx,award){return{
 dur:60,
 start(s){ctx.prepareRace?.();s.route=roadRoute(ctx.player());s.entries=new Map();s.finish=[];s.time=0;s.g=new THREE.Group();W.group.add(s.g);const start=s.route[0],next=s.route[1],dir=next.clone().sub(start).normalize(),right=new V3(dir.z,0,-dir.x);s.start=start;
 const arch=new THREE.Group();s.g.add(arch);arch.position.copy(start);arch.rotation.y=Math.atan2(dir.x,dir.z);arch.add(compose('raceGate30',a=>{for(const x of [-2.5,2.5])a(G.box,col(0xe5d7be),x,2,0,.14,4,.14);a(G.box,tmat(T.sign('СТАРТ / ФИНИШ','#292331','#e5d7be')),0,3.8,0,5,.48,.09);for(let i=0;i<10;i++)a(G.box,col(i%2?0xe5d7be:0x292331),-2.25+i*.5,.035,0,.5,.02,1.0);}));
 const ring=mesh(new THREE.TorusGeometry(2.25,.10,4,20),new THREE.MeshBasicMaterial({color:0x9be36b,transparent:true,opacity:.8}),0,0,0,1,1,1,s.g);s.ring=ring;
 actors().filter(a=>!a.drone&&!a.returning).forEach((a,i)=>{if(a.ride)dismount(a,false);dropHeld(a);const p=start.clone().addScaledVector(dir,-3-Math.floor(i/2)*2.2).addScaledVector(right,i%2?1.05:-1.05),car=addPushable({X:v=>v,Z:v=>v,Y:0},'kart',p.x,p.z);car.heading=car.mesh.rotation.y=Math.atan2(dir.x,dir.z);car.raceOwner=a;const q={a,car,next:1,lap:0,finished:false,last:start.clone(),cool:0};s.entries.set(a,q);});
 W.race={s,drive:(a,dt,t)=>{const q=s.entries.get(a);if(!q||a.ride!==q.car)return;const tgt=s.route[q.next],dx=tgt.x-a.pos.x,dz=tgt.z-a.pos.z,d=Math.hypot(dx,dz)||1;const want=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(want-q.car.heading),Math.cos(want-q.car.heading));if(Math.abs(delta)>.35){q.car.vx*=Math.exp(-dt*1.8);q.car.vz*=Math.exp(-dt*1.8);}updateRide(a,dt,t,dx/d,dz/d,s.time>3&&!q.finished&&!(a.daze>0)&&!(a.stun>0));a.root.position.copy(a.pos);a.ch.animate(dt,{t,speed:0,ride:'kart',rideSpeed:a.speed});}};
 },
 target(s){const q=s.entries.get(ctx.player());return !q?s.start:q&&ctx.player().ride===q.car?s.route[q.next]:new V3(q.car.x,q.car.y,q.car.z);},
 update(s,dt,t){s.time+=dt;for(const q of s.entries.values()){const a=q.a;q.cool-=dt;if(q.finished)continue;if(a.bot&&a.ride!==q.car&&Math.hypot(a.pos.x-q.car.x,a.pos.z-q.car.z)<1.8)mount(a,q.car);
 if(a.ride!==q.car){q.last.copy(a.pos);continue;}
 if(s.time<3){q.car.vx=q.car.vz=0;continue;}
 const target=s.route[q.next],segment=a.pos.clone().sub(q.last),u=Math.max(0,Math.min(1,target.clone().sub(q.last).dot(segment)/Math.max(.001,segment.lengthSq()))),close=q.last.clone().addScaledVector(segment,u).distanceTo(target)<3.1;
 if(close&&segment.length()<8&&q.cool<=0){q.cool=.25;q.next=(q.next+1)%s.route.length;sfx('beep',{at:a.pos});if(q.next===1){q.lap++;if(q.lap>=2){q.finished=true;q.car.vx*=.35;q.car.vz*=.35;s.finish.push(a);award(a,Math.max(60,240-(s.finish.length-1)*50),a.pos);sfx('goal',{at:a.pos});}}}
 q.last.copy(a.pos);
 if(q.car.y<-1){ // Никаких очков за спасение: возврат к последней пройденной точке.
 const prev=s.route[(q.next+s.route.length-1)%s.route.length];q.car.x=prev.x;q.car.z=prev.z;q.car.y=.15;q.car.vx=q.car.vz=q.car.vy=0;q.last.copy(prev);q.cool=1.5;daze(a,1);}
 }
 const q=s.entries.get(ctx.player());if(!q){s.ring.visible=false;return null;}const goal=s.route[q.next],prev=s.route[(q.next+s.route.length-1)%s.route.length];s.ring.position.copy(goal).y=1.8;s.ring.lookAt(goal.clone().add(goal.clone().sub(prev)));s.ring.material.opacity=.65+Math.sin(t*5)*.15;
 return s.finish.length===s.entries.size?'end':null;
 },
 bot(s,b){const q=s.entries.get(b);return q?{x:q.car.x,y:q.car.y,z:q.car.z,kind:'event',near:1}:null;},
 info(s){const q=s.entries.get(ctx.player());if(!q)return 'ГОНКА · НАБЛЮДАЕШЬ';if(s.time<3)return `СТАРТ ${Math.ceil(3-s.time)}`;if(q.finished)return `ФИНИШ · ${s.finish.indexOf(q.a)+1} место`;if(q.a.ride!==q.car)return 'E - сесть в свой карт';return `КРУГ ${q.lap+1}/2 · ${q.next===0?s.route.length:q.next}/${s.route.length} · ПРОБЕЛ - ДРИФТ`;},
 stop(s){for(const q of s.entries.values()){if(q.a.ride===q.car)dismount(q.a,false);q.car.mesh.removeFromParent();W.pushables=W.pushables.filter(b=>b!==q.car);}s.ring.geometry.dispose();s.ring.material.dispose();s.g.removeFromParent();W.race=null;}
};}
