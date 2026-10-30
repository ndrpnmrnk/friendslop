import {V3} from '../core/gfx.js';
import {CONFIG} from '../config.js';
import {W} from './state.js';
import {groundAt,solidsNear,obbLocal,zoneAt} from './physics.js';
// Геометрические правила общие для любой плоской коллизии, без списка «лазательных» объектов.
export function bodyClear(p,r,h){
 for(const s of solidsNear(p.x-r,p.z-r,p.x+r,p.z+r)){
  if(!s.on||s.y1<=p.y+.035||s.y0>=p.y+h-.035)continue;const x=Math.max(s.x0,Math.min(p.x,s.x1)),z=Math.max(s.z0,Math.min(p.z,s.z1));if((x-p.x)**2+(z-p.z)**2<(r-.012)**2)return false;
 }
 for(const o of W.obbs||[]){if(!o.on||o.y1<=p.y+.035||o.y0>=p.y+h-.035)continue;const q=obbLocal(o,p.x,p.z),x=Math.max(o.lx0,Math.min(q.x,o.lx1)),z=Math.max(o.lz0,Math.min(q.z,o.lz1));if((x-q.x)**2+(z-q.z)**2<(r-.012)**2)return false;}
 return true;
}
function interval(px,pz,dx,dz,x0,z0,x1,z1){let enter=-Infinity,exit=Infinity;for(const[p,d,a,b]of[[px,dx,x0,x1],[pz,dz,z0,z1]]){if(Math.abs(d)<1e-8){if(p<a||p>b)return null;}else{const u=(a-p)/d,v=(b-p)/d;enter=Math.max(enter,Math.min(u,v));exit=Math.min(exit,Math.max(u,v));}}return exit>=enter?{enter,exit}:null;}
const sample=new V3();
function clearSegment(a,b,r,h){const n=Math.max(1,Math.ceil(a.distanceTo(b)/.10));for(let i=1;i<=n;i++)if(!bodyClear(sample.lerpVectors(a,b,i/n),r,h))return false;return true;}
export function findMantle(actor,dx,dz){
 const p=actor.pos,len=Math.hypot(dx,dz);if(len<.1)return null;dx/=len;dz/=len;const r=actor.r,h=actor.h,reach=h+(CONFIG.player.mantleExtraReach??.65),maxForward=r+.95;
 const list=solidsNear(Math.min(p.x,p.x+dx*maxForward)-r,Math.min(p.z,p.z+dz*maxForward)-r,Math.max(p.x,p.x+dx*maxForward)+r,Math.max(p.z,p.z+dz*maxForward)+r,[]).map(s=>({s}));for(const o of W.obbs||[])list.push({s:o,obb:true});
 const choices=[];
 for(const{s,obb}of list){
  if(!s.on||s.tag==='hub-boundary'||s.noMantle)continue;const ty=s.y1,rel=ty-p.y;if(rel<.28||rel>reach)continue;
  let q;if(obb){const c=Math.cos(s.yaw),sn=Math.sin(s.yaw),point=obbLocal(s,p.x,p.z);q=interval(point.x,point.z,dx*c-dz*sn,dx*sn+dz*c,s.lx0,s.lz0,s.lx1,s.lz1);}else q=interval(p.x,p.z,dx,dz,s.x0,s.z0,s.x1,s.z1);
  if(!q||q.exit<.13||q.enter>maxForward||q.exit-q.enter<.18)continue;
  const depth=Math.min(.32,Math.max(.13,(q.exit-q.enter)*.5)),t=q.enter+depth,landing=new V3(p.x+dx*t,ty,p.z+dz*t);
  if(zoneAt(landing.x,landing.z,ty,'water')||!bodyClear(landing,r,h))continue;
  let supported=true;for(const[a,b]of[[0,0],[dz*.09,-dx*.09],[-dz*.09,dx*.09],[dx*.07,dz*.07]])if(Math.abs(groundAt(landing.x+a,landing.z+b,.015,ty+.035)-ty)>.06){supported=false;break;}if(!supported)continue;
  const from=p.clone(),edge=new V3(p.x+dx*(q.enter-r-.035),p.y,p.z+dz*(q.enter-r-.035));if(from.distanceTo(edge)>.62)continue;
  const lift=new V3(edge.x,ty+.06,edge.z),over=new V3(landing.x,ty+.06,landing.z),route=[from,edge,lift,over,landing];let clear=true;for(let i=1;i<route.length;i++)if(!clearSegment(route[i-1],route[i],r,h)){clear=false;break;}if(!clear)continue;
  choices.push({route,landing,support:s,dir:{x:dx,z:dz},score:q.enter+rel*.13});
 }
 choices.sort((a,b)=>a.score-b.score);return choices[0]||null;
}
export function beginMantle(actor,target){actor.hang=null;actor.mantle={...target,t:0,duration:CONFIG.player.mantleTime??.68};actor.vel.set(0,0,0);actor.onGround=false;actor.mantleN=(actor.mantleN||0)+1;actor.facing=Math.atan2(target.dir.x,target.dir.z);actor.root.rotation.y=actor.facing;}
export function advanceMantle(actor,dt){
 const m=actor.mantle;if(!m)return false;
 if(!m.route||!m.support?.on){actor.mantle=null;actor.onGround=false;return false;}
 m.t=Math.min(1,m.t+dt/m.duration);const knots=[0,.16,.66,.93,1];let part=0;while(part<3&&m.t>knots[part+1])part++;let k=(m.t-knots[part])/(knots[part+1]-knots[part]);k=k*k*(3-2*k);const next=sample.clone().lerpVectors(m.route[part],m.route[part+1],k);
 if(!clearSegment(actor.pos,next,actor.r,actor.h)){actor.mantle=null;actor.vel.set(0,-1,0);actor.onGround=false;return false;}
 actor.pos.copy(next);actor.vel.set(0,0,0);actor.onGround=false;
 if(m.t>=1){actor.pos.copy(m.landing);actor.mantle=null;actor.onGround=true;actor.airPeak=actor.pos.y;}
 return true;
}

// Высокий край сначала ловим руками. Пробел/E - подтянуться, C/S - отпустить.
export function catchLedge(actor,target){
 if(target.landing.y-actor.pos.y<actor.h*.72){beginMantle(actor,target);return;}
 const p=target.route[1].clone();p.y=target.landing.y-actor.h*.85;
 if(!bodyClear(p,actor.r,actor.h))return;
 actor.pos.copy(p);actor.vel.set(0,0,0);actor.onGround=false;actor.facing=Math.atan2(target.dir.x,target.dir.z);actor.root.rotation.y=actor.facing;actor.hang={target,t:0,handHeight:target.landing.y-p.y};
}
export function releaseLedge(actor){actor.hang=null;actor.hangCooldown=.8;actor.onGround=false;actor.vel.y=-1;}
export function advanceHang(actor,dt,list,{pull=false,drop=false}={}){
 const h=actor.hang;if(!h)return false;h.t+=dt;
 if(drop||!h.target.support?.on||actor.stun>0||actor.heldBy||h.t>12){releaseLedge(actor);return false;}
 // Владелец висящего тела проверяет и сетевых игроков. Повторный пакет удара не нужен.
 const top=h.target.landing,dir=h.target.dir;
 for(const other of list)if(other!==actor&&!other.drone&&!other.hidden&&other.onGround&&Math.abs(other.pos.y-top.y)<.22&&Math.hypot(other.vel.x,other.vel.z)>.35&&Math.hypot(other.pos.x-(actor.pos.x+dir.x*actor.r),other.pos.z-(actor.pos.z+dir.z*actor.r))<other.r+.2){releaseLedge(actor);actor.vel.x=-dir.x*1.5;actor.vel.z=-dir.z*1.5;return false;}
 if(pull&&h.t>.18){const target=h.target;target.route[0]=actor.pos.clone();target.route[1].y=actor.pos.y;beginMantle(actor,target);return false;}
 actor.vel.set(0,0,0);return true;
}
