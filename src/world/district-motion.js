import {THREE,G,V3,col,tmat,compose,mesh} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from './state.js';
import {moveSolid,pushOut} from './physics.js';
import {actors,knockDown} from '../game/actors.js';
import {serverNow} from '../net/net.js';
import {sfx} from '../core/sfx.js';
// Предсказуемая механика района: одинаковые часы, локальный игрок и боты хоста.
// Не пересылаем одинаковые трансформации каждый кадр и не двигаем удалённые марионетки повторно.
export const districtClock=()=>serverNow()/1000;
export const localActors=(includeHidden=false)=>actors().filter(a=>!a.puppet&&!a.drone&&!a.returning&&(includeHidden||!a.hidden));
export function localAnimation(fn,...roots){fn.netLocal=true;for(const root of roots){root.traverse(o=>{o.userData.noNet=true;});W.keep.push(root);}W.animated.push(fn);return fn;}
export function shuttle(t,period=24){const p=((t%period)+period)%period/period;if(p<.12)return 0;if(p<.5){const k=(p-.12)/.38;return k*k*(3-2*k);}if(p<.62)return 1;const k=(p-.62)/.38;return 1-k*k*(3-2*k);}
export function movingDeck(b,{name,x,z,w=3,d=2,h=.22,route,color=0x66807c,rails=true}){
 const g=b.prop(x,z);g.name=name;
 g.add(compose('deck61-'+w+'-'+d+'-'+h+'-'+color+'-'+rails,a=>{a(G.box,h>1?tmat(T.corrugated(color)):tmat(T.grate()),0,-h/2,0,w,h,d);if(h>1){for(const x of[-w/2,w/2])a(G.box,tmat(T.containerEnd(color)),x,-h/2,0,.025,h,d);a(G.box,col(0x34313e),0,-.03,0,w+.04,.06,d+.04);}a(G.box,col(color),0,-h-.12,0,w+.12,.24,d+.12);if(rails)for(const s of[-1,1]){a(G.box,col(0xb7aa82),0,.93,s*(d/2-.05),w,.07,.06);for(const q of[-1,1])a(G.box,col(0x474555),q*(w/2-.1),.47,s*(d/2-.05),.065,.94,.065);}}));
 const solid=b.solid(x,z,w,d,-h,h);solid.netLocal=true;solid.tag='district-platform';
 const prev=new V3(),pos=new V3(),state={name,g,solid,route,w,d};let ready=false;
 const update=dt=>{const p=route(districtClock());pos.set(b.X(p.x),b.Y+p.y,b.Z(p.z));if(!ready){g.position.copy(pos);prev.copy(pos);ready=true;}
  const dx=pos.x-prev.x,dy=pos.y-prev.y,dz=pos.z-prev.z;
  for(const a of localActors())if(Math.abs(a.pos.y-prev.y)<.18&&Math.abs(a.pos.x-prev.x)<w/2+a.r*.25&&Math.abs(a.pos.z-prev.z)<d/2+a.r*.25&&a.vel.y<=.3){a.pos.x+=dx;a.pos.y+=dy;a.pos.z+=dz;a.onGround=true;}
  for(const it of W.items)if((!W.net||W.net.canSimulate(it))&&it.state==='rest'&&Math.abs(it.pos.y-it.def.r-prev.y)<.22&&Math.abs(it.pos.x-prev.x)<w/2&&Math.abs(it.pos.z-prev.z)<d/2){it.pos.x+=dx;it.pos.y+=dy;it.pos.z+=dz;}
  g.position.copy(pos);moveSolid(solid,pos.x-w/2,pos.z-d/2,pos.x+w/2,pos.z+d/2,pos.y-h,pos.y);prev.copy(pos);
 };
 update(0);localAnimation(update,g);(W.districtMechanics??=[]).push(state);return state;
}
export function conveyor(b,x,z,w,d,{speed=2,axis='z',y=.65}={}){
 const mat=tmat(T.grate()).clone();mat.map=mat.map.clone();mat.map.needsUpdate=true;mat.map.userData.netStatic=true;W.mapResources.add(mat);W.mapResources.add(mat.map);
 b.box(x,z,w,d,y,col(0x465a50));const belt=b.m(G.box,mat,x,y+.025,z,w-.12,.05,d-.1);b.climbTrim(x,z,w,d,y+.05);
 localAnimation(dt=>{mat.map.offset.y=(districtClock()*speed*.16)%1;for(const a of localActors())if(Math.abs(a.pos.y-(b.Y+y+.05))<.2&&Math.abs(a.pos.x-b.X(x))<w/2&&Math.abs(a.pos.z-b.Z(z))<d/2){a.pos[axis]+=speed*dt;pushOut(a.pos,a.r,a.pos.y+a.step,a.pos.y+a.h);}for(const it of W.items)if((!W.net||W.net.canSimulate(it))&&it.state==='rest'&&Math.abs(it.pos.y-it.def.r-(b.Y+y+.05))<.25&&Math.abs(it.pos.x-b.X(x))<w/2&&Math.abs(it.pos.z-b.Z(z))<d/2)it.pos[axis]+=speed*dt;},belt);
 return {x:b.X(x),z:b.Z(z),y:b.Y+y+.05,w,d};
}
export function warningHazard(b,{name,x,z,w,d,y=0,period=40,warning=2,active=3,hit,visual,enabled=()=>true}){
 const lamp=b.warnLamp(x,y+2.3,z,0xff6b35,.25),cool=new WeakMap();
 const phase=()=>districtClock()%period,hot=()=>phase()<warning+active&&enabled();
 b.hazardFloor(x,z,w,d,y);b.hazard({x0:x-w/2,z0:z-d/2,x1:x+w/2,z1:z+d/2,y0:y,y1:y+2.3,active:hot});
 let was=false;const fn=dt=>{const t=phase(),warn=t<warning,on=t>=warning&&t<warning+active&&enabled();lamp.set(warn?Number(Math.sin(t*14)>0):on?1:0);visual?.(on,t-warning,dt);
  if(warn&&!was)sfx('alarm',{at:lamp.m.position,range:28,v:.6});was=warn;
  if(on)for(const a of localActors())if(Math.abs(a.pos.x-b.X(x))<w/2+a.r&&Math.abs(a.pos.z-b.Z(z))<d/2+a.r&&a.pos.y>b.Y+y-.25&&a.pos.y<b.Y+y+2.3&&(cool.get(a)||0)<districtClock()){cool.set(a,districtClock()+active+1);if(hit)hit(a);else knockDown(a,0,5,1.1);}
 };localAnimation(fn,lamp.m,...(visual?.roots||[]));(W.districtMechanics??=[]).push({name,phase,hot,lamp});return fn;
}
export function districtFrame(b,id,{spawn=[22,40],floor=[17,30,27,42],waterfront=false,catArea=null}={}){
 if(!waterfront){b.path([[22,43],[22,34]],3,T.pave());for(const x of[3,41]){b.lamp(x,40);b.planter(x,34,2,2,.45,'shrub');}}else for(const x of[3,41])b.lamp(x,25);
 b.spawn(...spawn);b.zone('floor',...floor);if(catArea)b.cats(...catArea);else if(!waterfront)b.cats(2,34,13,41);else b.cats(2,10,13,13);
 (W.districtLayouts??=[]).push({id,size:44,spawn:{x:b.X(spawn[0]),y:b.Y,z:b.Z(spawn[1])}});
}
