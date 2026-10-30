import {THREE,G,V3,col,tmat,glow} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from './state.js';
import {localAnimation,districtClock} from './district-motion.js';
import {addItem,launch} from '../game/items.js';
import {actors} from '../game/actors.js';
import {sfx} from '../core/sfx.js';
// Fixed, pre-registered inventory: the host launches real shared items, never visual copies.
export function grillVolcano(b,x,z){
 const steel=tmat(T.metal()),dark=col(0x302a32),paint=tmat(T.paintMetal(0x5d584e));
 b.m(G.sph10,dark,x,.8,z,1.25,.65,1);b.solid(x,z,2.5,2,.3,.85);
 for(const sx of[-.85,.85])for(const sz of[-.65,.65]){b.box(x+sx,z+sz,.09,.09,.7,steel);b.m(G.cyl8,dark,x+sx,.15,z+sz,.15,.1,.15).rotation.z=Math.PI/2;}
 for(let i=0;i<11;i++)b.m(G.box,steel,x-.95+i*.19,1.05,z,.035,.035,1.6);
 b.m(G.box,glow(0xe87627),x,.94,z,1.8,.03,1.25);b.m(G.box,paint,x,1.05,z-1,.5,.2,.18);b.m(G.cyl8,steel,x,1.65,z-1,.13,1.1,.13);
 const lid=new THREE.Group();lid.name='grill-hinged-lid';lid.position.set(b.X(x),b.Y+1.08,b.Z(z-.85));b.g.add(lid);
 const shell=new THREE.Mesh(new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),paint);shell.scale.set(1.25,.7,1);shell.position.z=.85;lid.add(shell);
 const handle=new THREE.Mesh(G.box,steel);handle.position.set(0,.2,1.8);handle.scale.set(.65,.08,.09);lid.add(handle);
 const pool=Array.from({length:12},(_,i)=>{const it=addItem(['coal','burger','tomato','cucumber'][i%4],b.X(x),b.Y+1.2,b.Z(z));it.state='gone';it.g.visible=false;return it;});
 const state={values:[-1]};W.districtStates.push(state);const age=new Map();
 localAnimation(()=>{const t=districtClock()%30,open=t<2?t/2:t<5?1:t<7?1-(t-5)/2:0;lid.rotation.x=-open*1.55;},lid);
 const emitAt=now=>{if(W.net?.replica)return;const cycle=Math.floor(now/30),phase=now%30;if(phase<2||phase>5||state.values[0]===cycle)return;state.values[0]=cycle;
  let n=0;for(const it of pool){if(n>=6)break;const available=it.state==='gone'||it.state==='rest'&&now-(age.get(it)||now)>40&&actors().every(a=>a.pos.distanceTo(it.pos)>8);if(!available)continue;
   const angle=(Math.sin(cycle*17+n*37)*.5+.5)*Math.PI*2,range=3+(Math.sin(cycle*31+n*11)*.5+.5)*8,flight=1.4,from=new V3(b.X(x),b.Y+1.3,b.Z(z));it.g.visible=true;it.floatY=undefined;it.taken=false;it.owner=null;it.thrownBy=null;it.noHit=0;it.vel.set(0,0,0);launch(it,from,new V3(Math.cos(angle)*range/flight,14.6,Math.sin(angle)*range/flight));age.set(it,now);n++;}
  if(n)sfx('hiss',{at:lid.position,range:25,v:.65});
 };const emit=()=>emitAt(districtClock());W.animated.push(emit);return {state,pool,lid,emit,emitAt};
}
