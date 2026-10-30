import {G,col,tmat,glow} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from './state.js';
import {localAnimation,localActors,districtClock} from './district-motion.js';
import {knockDown} from '../game/actors.js';
import {sfx} from '../core/sfx.js';
// Fixed pool and shared clock: bounded cost, identical projectile paths on peers.
export function grillVolcano(b,x,z){
 const steel=tmat(T.metal()),dark=col(0x302a32);b.m(G.sph10,dark,x,.95,z,1.25,.7,1.1);b.solid(x,z,2.5,2.2,.45,1.1);
 for(const sx of[-.85,.85])for(const sz of[-.65,.65])b.box(x+sx,z+sz,.1,.1,.8,steel);
 for(let i=0;i<11;i++)b.m(G.box,steel,x-.95+i*.19,1.15,z,.04,.035,1.7);
 b.m(G.box,glow(0xf28d42),x,1,z,1.8,.03,1.4);b.box(x,z-1,.16,.16,2.4,steel);
 const shots=Array.from({length:8},(_,i)=>{const g=b.m(G.sph10,col(i%2?0xb66a36:0x8e4634),x,1.3,z,.22,.14,.2);g.visible=false;return g;});
 const state={values:[-1,1]};W.districtStates.push(state);W.fires.push({x:b.X(x),y:b.Y+1,z:b.Z(z),get hp(){return state.values[1];},set hp(v){state.values[1]=Math.max(0,v);}});
 let cycle=-1;const hit=new WeakMap();localAnimation(()=>{const now=districtClock(),c=Math.floor(now/31),phase=now%31;if(c!==cycle){cycle=c;}if(state.values[0]!==c)state.values=[c,1];
 for(let i=0;i<shots.length;i++){const g=shots[i],t=phase-(4+(Math.sin(c*31)*.5+.5)*10)-i*.17,hash=Math.sin(c*17+i*37)*.5+.5,tx=4+hash*36,tz=4+(Math.sin(c*11+i*19)*.5+.5)*36;g.visible=state.values[1]>0&&t>=0&&t<2.6;if(!g.visible)continue;const k=t/2.6;g.position.set(b.X(x+(tx-x)*k),b.Y+1.3+12*4*k*(1-k)-1.15*k,b.Z(z+(tz-z)*k));g.rotation.x=t*5;g.rotation.z=t*3;
 if(k>.9)for(const a of localActors())if(hit.get(a)!==c&&Math.hypot(a.pos.x-g.position.x,a.pos.z-g.position.z)<a.r+.3&&Math.abs(a.pos.y-g.position.y)<1.8){hit.set(a,c);knockDown(a,1,3,1.2);sfx('hiss',{at:g.position,range:12});}}
 },...shots);return state;
}
