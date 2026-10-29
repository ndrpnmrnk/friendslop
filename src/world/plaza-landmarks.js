import { random } from '../core/random.js';
import {THREE,G,tmat,col,lam,smat} from '../core/gfx.js';
import {T,pix} from '../core/textures.js';
import {W} from './state.js';
import {puff,ripple} from './particles.js';

export function buildClockTower(b,x,z){
 const stone=smat(T.stone()),brick=smat(T.brickWall()),metal=tmat(T.paintMetal(0x4c6260)),dark=col(0x302b36);
 b.box(x,z,3.7,3.7,.18,stone);b.box(x,z,3.1,3.1,.18,stone,{y:.18});b.box(x,z,2.45,2.45,4.95,brick,{y:.36});
 for(const dx of[-1.18,1.18])for(const dz of[-1.18,1.18])b.box(x+dx,z+dz,.2,.2,4.95,stone,{y:.36});
 for(const y of[.45,3.2,5.05])b.box(x,z,2.65,2.65,.15,stone,{y});
 // Настоящий балкон: южный проём у лестницы оставлен свободным.
 b.box(x,z,3.5,3.5,.22,stone,{y:5.15});
 for(const[dx,dz,w,d]of[[0,-1.7,3.5,.09],[-1.7,0,.09,3.5],[1.7,0,.09,3.5],[-1.12,1.7,1.18,.09],[1.12,1.7,1.18,.09]]){b.box(x+dx,z+dz,w,d,.08,metal,{y:6.05});for(let i=0;i<5;i++){const px=x+dx+(w>d?(i/4-.5)*w:0),pz=z+dz+(d>w?(i/4-.5)*d:0);b.m(G.box,metal,px,5.72,pz,.045,.66,.045);}}
 b.box(x,z,1.95,1.95,1.6,dark,{y:5.37});
 const clock=pix('plaza-clock46',64,64,c=>{c.fillStyle='#26343a';c.fillRect(0,0,64,64);c.fillStyle='#c9c2a0';c.beginPath();c.arc(32,32,28,0,Math.PI*2);c.fill();for(let i=0;i<12;i++){const a=i/12*Math.PI*2;c.fillStyle='#4b4645';c.fillRect(Math.round(31+Math.sin(a)*23),Math.round(31-Math.cos(a)*23),2,3);}c.strokeStyle='#3d3d42';c.lineWidth=3;c.beginPath();c.moveTo(19,23);c.lineTo(32,32);c.lineTo(43,17);c.stroke();c.fillStyle='#846a44';c.fillRect(29,29,6,6);});
 for(const[dx,dz,yaw]of[[0,1,0],[1,0,Math.PI/2],[0,-1,Math.PI],[-1,0,-Math.PI/2]]){const face=b.m(G.plane,tmat(clock),x+dx*.988,6.18,z+dz*.988,1.43,1.43,1);face.rotation.y=yaw;}
 b.box(x,z,2.4,2.4,.18,stone,{y:6.97});
 for(const dx of[-.91,.91])for(const dz of[-.91,.91])b.box(x+dx,z+dz,.16,.16,1.37,stone,{y:7.15});
 b.box(x,z,2.2,2.2,.16,metal,{y:8.48});
 const roof=b.m(G.cone4,smat(T.roof()),x,8.98,z,1.78,.88,1.78);roof.rotation.y=Math.PI/4;
 b.m(G.cyl6,metal,x,9.5,z,.035,.32,.035);b.m(G.cone4,metal,x,9.72,z,.11,.18,.11);
 b.ladder(x,z+1.76,'s',5.37);b.zone('roof',x-1.65,z-1.65,x+1.65,z+1.65,5.37);
 const bell=b.m(new THREE.CylinderGeometry(.2,.38,.52,10,1,true),lam({color:0xbda266,side:THREE.DoubleSide},'bell46'),x,7.86,z);W.mapResources.add(bell.geometry);W.keep.push(bell);b.m(G.box,metal,x,8.38,z,1.8,.08,.08);
 W.bells.push({x:b.X(x),y:b.Y+7.86,z:b.Z(z),mesh:bell,ring:0});
}

export function buildPlazaFountain(b,cx,cz,R=3.8){
 const stone=smat(T.stone()),bronze=tmat(T.paintMetal(0x66786c));b.water(cx,cz,R-.2,0,false);
 const lathe=(points,segments=12)=>{const g=new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),segments);W.mapResources.add(g);return g;};
 b.m(lathe([[R-.22,0],[R+.27,0],[R+.27,.34],[R+.16,.49],[R-.22,.49],[R-.22,0]]),stone,cx,0,cz);
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;b.solid(cx+Math.cos(a)*R,cz+Math.sin(a)*R,.55,.55,0,.49);}
 // Единый профиль чаш, без совпадающих конусов/крышек.
 b.m(lathe([[0,0],[.7,0],[.7,.2],[.43,.34],[.26,1.05],[.5,1.18],[1.2,1.39],[1.25,1.55],[1.07,1.63],[.25,1.35],[.16,2.08],[.64,2.22],[.69,2.36],[.57,2.43],[.12,2.22],[.08,2.68],[0,2.73]]),bronze,cx,.15,cz);
 b.m(G.cyl12,tmat(T.water()),cx,1.72,cz,1.03,.018,1.03);b.m(G.cyl12,tmat(T.water()),cx,2.52,cz,.54,.018,.54);
 b.solid(cx,cz,1.1,1.1,0,1.39);b.solid(cx,cz,2.2,2.2,1.39,.34);b.solid(cx,cz,.30,.30,1.73,.65);
 // Невысокие опоры дают короткий путь по чаше, остальной бассейн открыт.
 for(const a of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const x=cx+Math.cos(a)*2.5,z=cz+Math.sin(a)*2.5;b.m(G.cyl8,stone,x,.15,z,.48,.3,.48);b.solid(x,z,.72,.72,0,.3);}
 let elapsed=0;W.animated.push(dt=>{elapsed+=dt;if(elapsed<.10)return;elapsed=0;if(W.player&&Math.hypot(W.player.pos.x-b.X(cx),W.player.pos.z-b.Z(cz))>52)return;
  puff(b.X(cx),b.Y+2.86,b.Z(cz),{color:0x9ccbec,size:.12,vy:2.15,g:7,life:.65,grow:.10});
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;puff(b.X(cx+Math.cos(a)*1.04),b.Y+1.72,b.Z(cz+Math.sin(a)*1.04),{color:0x8ac0e8,size:.10,vx:Math.cos(a)*1.3,vy:1.1,vz:Math.sin(a)*1.3,g:7,life:.48,grow:.15,opacity:.7});}
  if(random()<.2)ripple(b.X(cx+(random()-.5)*3),b.Y+.1,b.Z(cz+(random()-.5)*3),.5,.8);
 });
}
