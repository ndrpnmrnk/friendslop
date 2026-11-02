import {THREE,G,V3,col,tmat,glow} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {grillLid,grillBowl} from './grill-model.js';
import {burst,smoke} from './particles.js';
import {W} from './state.js';
import {localAnimation,districtClock} from './district-motion.js';
import {addItem,launch} from '../game/items.js';
import {actors} from '../game/actors.js';
import {sfx} from '../core/sfx.js';
// Fixed, pre-registered inventory: the host launches real shared items, never visual copies.
export function grillVolcano(b,x,z){
 const steel=tmat(T.metal()),dark=col(0x302a32),paint=tmat(T.paintMetal(0x5d584e));
 const bowl=grillBowl();bowl.position.set(b.X(x),b.Y+1.08,b.Z(z));b.g.add(bowl);b.solid(x,z,2.5,2,.3,.8);
 for(const sx of[-.85,.85])for(const sz of[-.65,.65]){b.box(x+sx,z+sz,.09,.09,.7,steel);b.m(G.cyl8,dark,x+sx,.15,z+sz,.15,.1,.15).rotation.z=Math.PI/2;}
 for(let i=0;i<11;i++)b.m(G.box,steel,x-.95+i*.19,1.05,z,.035,.035,1.6);
 b.m(G.box,glow(0xe87627),x,.94,z,1.8,.03,1.25);b.m(G.box,paint,x,1.05,z-1,.5,.2,.18);b.m(G.cyl8,steel,x,1.65,z-1,.13,1.1,.13);
 const lid=grillLid();lid.position.set(b.X(x),b.Y+1.08,b.Z(z-.85));b.g.add(lid);
 const pool=Array.from({length:12},(_,i)=>{const it=addItem(['coal','burger','tomato','cucumber'][i%4],b.X(x),b.Y+1.2,b.Z(z));it.state='gone';it.g.visible=false;return it;});
 const state={values:[-1,0,...Array(12).fill(-1)]};W.districtStates.push(state);
 localAnimation(()=>{const t=districtClock()%30,open=t<2?t/2:t<5?1:t<7?1-(t-5)/2:0;lid.rotation.x=-open*1.55;},lid);
 const emitAt=now=>{if(W.net?.replica)return;const cycle=Math.floor(now/30),phase=now%30;if(phase<2||phase>5||state.values[0]===cycle)return;state.values[0]=cycle;
  let n=0;for(const [index,it] of pool.entries()){if(n>=6)break;const available=it.state==='gone'||it.state==='rest'&&now-state.values[index+2]>40&&actors().every(a=>a.pos.distanceTo(it.pos)>8);if(!available)continue;
   const angle=(Math.sin(cycle*17+n*37)*.5+.5)*Math.PI*2,range=3+(Math.sin(cycle*31+n*11)*.5+.5)*8,flight=1.4,from=new V3(b.X(x),b.Y+1.3,b.Z(z));it.g.visible=true;it.floatY=undefined;it.taken=false;it.owner=null;it.thrownBy=null;it.noHit=0;it.vel.set(0,0,0);launch(it,from,new V3(Math.cos(angle)*range/flight,14.6,Math.sin(angle)*range/flight));state.values[index+2]=now;n++;}
  state.values[1]=n;
 };const emit=()=>emitAt(districtClock());W.animated.push(emit);
 let seen=-1;const effects=()=>{const cycle=state.values[0];if(cycle===seen)return;seen=cycle;const now=districtClock(),distance=W.player?.pos.distanceTo(lid.position)??0;
  if(cycle<0||!state.values[1]||Math.abs(now-cycle*30-3.5)>3||distance>45)return;
  const px=b.X(x),py=b.Y+1.2,pz=b.Z(z);burst(px,py,pz,14,{color:0xf6ac48,size:.055,speed:2.1,up:3.3,g:7,life:.65,grow:-.4});
  for(let i=0;i<5;i++)smoke(px+(i-2)*.11,py,pz,{color:0x8e8273,size:.12,grow:.5,vy:1.2+i*.14,life:1.1,opacity:.35});W.flash?.(new V3(px,py,pz),0xffb46b,.4,4,5);sfx('hiss',{at:lid.position,range:25,v:.65});
 };localAnimation(effects);return {state,pool,lid,bowl,emit,emitAt};
}
