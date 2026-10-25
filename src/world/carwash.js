import {THREE,G,mesh,col,tmat,glow,compose,smat} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from './state.js';
import {addZone} from './physics.js';
import {smoke,splash} from './particles.js';
import {actors,daze} from '../game/actors.js';
import {addOutline} from '../game/outline.js';
import {sfx} from '../core/sfx.js';
export function buildCarwash(b){
 const wall=smat(T.corrugated(0x526d7b)),tile=smat(T.floorTile()),metal=tmat(T.paintMetal(0x415567)),light=col(0xbebfb8),dark=col(0x27242e);let left=0,tick=0;
 // Сквозной бокс с отдельными цоколем, панелями и несущими порталами.
 b.ground(21,19.4,30,26.6,T.concrete(),2,.025);
 for(const z of[19.2,26.8]){b.box(25.5,z,9,.25,.65,tile);b.box(25.5,z,9,.18,2.55,wall,{y:.65});b.box(25.5,z,9.1,.32,.16,metal,{y:3.2});}
 b.box(25.5,23,9.5,8.05,.18,smat(T.metal()),{y:3.36});
 for(const x of[21.1,29.9]){for(const z of[19.55,26.45]){b.box(x,z,.27,.4,3.2,light);b.box(x,z,.31,.44,.24,metal,{y:0});}b.box(x,23,.3,7.25,.3,light,{y:2.95});b.m(G.box,metal,x,3.12,23,.34,.10,6.5);}
 for(const z of[20,26]){b.m(G.box,dark,25.5,.045,z,8.3,.04,.24);b.m(G.box,smat(T.vent()),25.5,.07,z,8.1,.018,.20);}
 for(const x of[23.1,27.9])b.m(G.box,glow(0xb9d5dd),x,3.22,23,.18,.035,5.8);
 const brushes=[];
 for(const z of[20.4,25.6]){const q=b.prop(25.5,z);q.name='wash-side-brush';q.add(compose('wash46-brush',a=>{const blue=tmat(T.cloth(0x456b9b)),cyan=tmat(T.cloth(0x6a9faf));for(let i=0;i<12;i++){const angle=i*Math.PI/6;a(G.box,i%2?blue:cyan,Math.cos(angle)*.46,1.42,Math.sin(angle)*.46,.18,2.55,.13,0,-angle);}a(G.cyl8,dark,0,1.5,0,.11,3,.11);}));brushes.push(q);b.m(G.box,metal,25.5,3.04,z,1.5,.18,.35);}
 const top=b.prop(25.5,23);top.position.y+=2.7;top.name='wash-top-brush';top.add(compose('wash46-top',a=>{const cloth=tmat(T.cloth(0x8a516b));a(G.cyl12,cloth,0,0,0,.39,4.8,.39,Math.PI/2);for(let i=0;i<8;i++){const angle=i*Math.PI/4;a(G.box,cloth,Math.cos(angle)*.36,Math.sin(angle)*.36,0,.10,.10,4.75,0,0,angle);}}));brushes.push(top);
 // Оборудование стоит снаружи прохода; без текстовых вывесок.
 b.box(29.25,18.45,1.05,.68,1.25,metal);b.m(G.box,dark,29.25,1.25,18.45,.9,.04,.56);for(const x of[28.94,29.22,29.5])b.m(G.cyl6,light,x,1.08,18.82,.045,.07,.045).rotation.x=Math.PI/2;
 b.cone(21,18.3);b.cone(30.5,27.4);b.puddle(22.7,27.5,.6);b.bin(30.5,18.2);
 const lever=b.prop(29.7,27.2);mesh(G.box,tmat(T.metal()),0,1.1,0,.38,.55,.22,lever);const arm=mesh(G.box,col(0xff8a1f),0,1.3,.15,.07,.48,.07,lever),lamp=mesh(G.box,glow(0x553d42),0,1.52,.12,.18,.08,.035,lever);lamp.material=lamp.material.clone();W.mapResources.add(lamp.material);const outline=addOutline(lever);
 const zone=addZone('wash',{r:[b.X(23.7),b.Z(20),b.X(27.3),b.Z(26)]},b.Y,{active:false,cx:b.X(25.5),cz:b.Z(23)});
 W.keep.push(...brushes,lever);W.interacts.push({x:b.X(29.7),y:b.Y,z:b.Z(27.2),r:1.7,outline,label:'Запустить мойку',enabled:()=>left<=0,act(){left=9;zone.active=true;sfx('switch');}});
 W.animated.push(dt=>{const was=left>0;left=Math.max(0,left-dt);zone.active=left>0;if(!left){if(was){arm.rotation.x=.45;lamp.material.color.setHex(0x553d42);}return;}arm.rotation.x=-.65;lamp.material.color.setHex(0x9be36b);brushes[0].rotation.y+=dt*6;brushes[1].rotation.y-=dt*6;top.rotation.z+=dt*6;tick-=dt;
  if(tick<=0){tick=.16;for(let i=0;i<4;i++)smoke(b.X(24.2+i*.8),b.Y+2.6,b.Z(23),{color:0xc8e6f2,size:.10,grow:.18,vy:-3,g:6,life:.65,opacity:.6});}
  for(const a of actors()){if(a.pos.x<b.X(23.7)||a.pos.x>b.X(27.3)||a.pos.z<b.Z(20)||a.pos.z>b.Z(26)||Math.abs(a.pos.y-b.Y)>.6)continue;a.wetT=3;if(!(a.washSafe>0)){daze(a,1.2);a.washSafe=2;splash(a.pos.x,a.pos.y,a.pos.z,.5);}a.washSafe=Math.max(0,(a.washSafe||0)-dt);}
 });
}
