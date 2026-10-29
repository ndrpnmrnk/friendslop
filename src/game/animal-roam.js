import { random } from '../core/random.js';
import {W} from '../world/state.js';
import {groundAt,isFree,zoneAt} from '../world/physics.js';
// Короткие безопасные маршруты. Двери/стекло остаются препятствиями, вода и
// перепады высоты не подменяются телепортацией. Поиск ограничен и кешируется.
const routes=new WeakMap(),R=.27,H=.64,STEP=.8;
const position=a=>a.pos?.isVector3?a.pos:a.root.position;
function floorPoint(x,z,y){
 if(Math.abs(x)>W.bounds-1||Math.abs(z)>W.bounds-1)return null;
 const g=groundAt(x,z,R*.55,y+.36);
 if(Math.abs(g-y)>.42||zoneAt(x,z,g,'water')||!isFree(x-R,z-R,x+R,z+R,g+.08,g+H))return null;
 return{x,y:g,z};
}
function clear(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.3);let y=a.y;for(let i=1;i<=n;i++){const k=i/n,q=floorPoint(a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k,y);if(!q)return false;y=q.y;}return true;}
function path(from,to){
 if(clear(from,to))return[{x:to.x,y:to.y??from.y,z:to.z}];
 const key=(x,z)=>x+','+z,memo=new Map(),sample=(x,z,y)=>{const k=key(x,z);if(!memo.has(k))memo.set(k,Math.hypot(x,z)>27?null:floorPoint(from.x+x*STEP,from.z+z*STEP,y));return memo.get(k);};
 const heuristic=(x,z)=>Math.hypot(from.x+x*STEP-to.x,from.z+z*STEP-to.z)/STEP;
 const first={x:0,z:0,y:from.y,g:0,h:heuristic(0,0),parent:null},open=[first],cost=new Map([[key(0,0),0]]);let best=first;
 for(let n=0;n<280&&open.length;n++){
  let bi=0;for(let i=1;i<open.length;i++)if(open[i].g+open[i].h<open[bi].g+open[bi].h)bi=i;
  const q=open.splice(bi,1)[0];if(q.h<best.h)best=q;if(q.h<.8){best=q;break;}
  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const x=q.x+dx,z=q.z+dz,k=key(x,z),p=sample(x,z,q.y);if(!p||Math.abs(p.y-q.y)>.42)continue;
   if(dx&&dz&&(!sample(q.x+dx,q.z,q.y)||!sample(q.x,q.z+dz,q.y)))continue;
   const g=q.g+Math.hypot(dx,dz)+Math.abs(p.y-q.y);if(g>=(cost.get(k)??Infinity))continue;
   cost.set(k,g);open.push({x,z,y:p.y,g,h:heuristic(x,z),parent:q});
  }
 }
 if(best.h>=first.h-.35)return[];const out=[];for(let q=best;q.parent;q=q.parent)out.push({x:from.x+q.x*STEP,y:q.y,z:from.z+q.z*STEP});return out.reverse();
}
export function animalGoal(a,radius=26){
 const p=position(a),near=(W.districts||[]).filter(d=>Math.hypot((d.ox+d.x1)/2-p.x,(d.oz+d.z1)/2-p.z)<radius+24);
 for(let i=0;i<36;i++){
  let x,z;if(i<20&&near.length){const d=near[random()*near.length|0],edge=random()*4|0,S=d.x1-d.ox,t=2+random()*(S-4);x=d.ox+(edge===0?-.7:edge===1?S+.7:t);z=d.oz+(edge===2?-.7:edge===3?S+.7:t);}
  else{const angle=random()*Math.PI*2,d=3+random()*radius;x=p.x+Math.cos(angle)*d;z=p.z+Math.sin(angle)*d;}
  const distance=Math.hypot(x-p.x,z-p.z);if(distance<3||distance>radius+12)continue;const q=floorPoint(x,z,p.y);if(q)return q;
 }
 return{x:p.x,y:p.y,z:p.z};
}
export function animalMove(a,goal,speed,dt,stop=.25){
 const p=position(a);let nav=routes.get(a);if(!nav||nav.world!==W.group){nav={world:W.group,path:[],ttl:0,x:Infinity,z:Infinity,speed:0,blocked:0,side:random()<.5?-1:1};routes.set(a,nav);}
 const distance=Math.hypot(goal.x-p.x,goal.z-p.z);nav.ttl-=dt;
 if(distance<=stop){nav.speed*=Math.exp(-dt*12);if(a.vel)a.vel.set(0,0,0);return{moved:0,distance,arrived:true,blocked:false};}
 if(nav.ttl<=0&&(!nav.path.length||nav.blocked>.1)||nav.ttl<=.35&&Math.hypot(nav.x-goal.x,nav.z-goal.z)>2.4){nav.path=path(p,goal);nav.ttl=1.1+random()*.3;nav.x=goal.x;nav.z=goal.z;}
 while(nav.path.length&&Math.hypot(nav.path[0].x-p.x,nav.path[0].z-p.z)<.28)nav.path.shift();
 const target=nav.path[0]||goal,dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz)||1,angle=Math.atan2(dx,dz),ox=p.x,oz=p.z;
 nav.speed+=(speed-nav.speed)*(1-Math.exp(-dt*7));const steps=Math.max(1,Math.ceil(nav.speed*dt/.10)),move=nav.speed*dt/steps;
 for(let n=0;n<steps;n++){
  let q=null;for(const offset of[0,.5*nav.side,-.5*nav.side,1.1*nav.side]){q=floorPoint(p.x+Math.sin(angle+offset)*move,p.z+Math.cos(angle+offset)*move,p.y);if(q)break;}
  if(!q)break;p.set(q.x,q.y,q.z);
 }
 const moved=Math.hypot(p.x-ox,p.z-oz),blocked=moved<move*steps*.2;
 nav.blocked=blocked?nav.blocked+dt:0;if(nav.blocked>.35){nav.ttl=0;nav.speed*=.6;}if(a.vel)a.vel.set((p.x-ox)/Math.max(dt,.001),0,(p.z-oz)/Math.max(dt,.001));
 return{moved,distance,arrived:false,blocked:nav.blocked>1.2};
}
