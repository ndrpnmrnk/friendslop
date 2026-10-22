import {THREE,G,mesh,col,tmat,glow} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from './state.js';
import {addZone} from './physics.js';
import {smoke,splash} from './particles.js';
import {actors,daze} from '../game/actors.js';
import {addOutline} from '../game/outline.js';
import {sfx} from '../core/sfx.js';
export function buildCarwash(b){
 const mt=tmat(T.corrugated(0x51788d)),dk=col(0x292532);let left=0,tick=0;
 for(const z of [19.2,26.8]){b.box(25.5,z,9,.25,3.2,mt);b.box(25.5,z,9.1,.35,.22,dk,{y:0});}
 b.box(25.5,23,9.2,7.9,.25,tmat(T.metal()),{y:3.2,fade:true});b.sign(25.5,3.55,26.97,0,'МОЙКА · РЫЧАГ','#4ab0f0','#f1e8ff',3.5,.48);
 for(const x of [22,29]){b.box(x,23,.16,7.2,.10,dk);b.m(G.box,tmat(T.vent()),x,.13,23,.38,.04,6.8);}
 const brushes=[];
 for(const z of [20.4,25.6]){const q=b.prop(25.5,z);for(let i=0;i<10;i++){const a=i/10*6.28;mesh(G.box,tmat(T.cloth(i%2?0x456b9b:0x6aa8c8)),Math.cos(a)*.52,1.4,Math.sin(a)*.52,.20,2.5,.12,q).rotation.y=-a;}mesh(G.cyl8,dk,0,1.5,0,.15,3,.15,q);brushes.push(q);}
 const top=b.m(G.cyl8,tmat(T.cloth(0xb34c64)),25.5,2.6,23,.45,4.8,.45);top.rotation.x=Math.PI/2;brushes.push(top);
 const lever=b.prop(29.7,27.2);mesh(G.box,tmat(T.metal()),0,1.1,0,.38,.55,.22,lever);const arm=mesh(G.box,col(0xff8a1f),0,1.3,.15,.07,.48,.07,lever),lamp=mesh(G.box,glow(0x553d42),0,1.52,.12,.18,.08,.035,lever);const outline=addOutline(lever);
 const zone=addZone('wash',{r:[b.X(23.7),b.Z(20),b.X(27.3),b.Z(26)]},b.Y,{active:false,cx:b.X(25.5),cz:b.Z(23)});
 W.keep.push(...brushes,lever);W.interacts.push({x:b.X(29.7),y:b.Y,z:b.Z(27.2),r:1.7,outline,label:'Запустить мойку',enabled:()=>left<=0,act(){left=9;zone.active=true;sfx('switch');}});
 W.animated.push(dt=>{left=Math.max(0,left-dt);zone.active=left>0;arm.rotation.x=left>0?-.65:.45;lamp.material.color.setHex(left>0?0x9be36b:0x553d42);if(!left)return;brushes[0].rotation.y+=dt*6;brushes[1].rotation.y-=dt*6;top.rotation.y+=dt*6;tick-=dt;if(tick<=0){tick=.16;for(let i=0;i<4;i++)smoke(b.X(24.2+i*.8),b.Y+2.6,b.Z(23),{color:0xc8e6f2,size:.10,grow:.18,vy:-3,g:6,life:.65,opacity:.6});}
 for(const a of actors()){if(a.pos.x<b.X(23.7)||a.pos.x>b.X(27.3)||a.pos.z<b.Z(20)||a.pos.z>b.Z(26)||Math.abs(a.pos.y-b.Y)>.6)continue;a.wetT=3;if(!(a.washSafe>0)){daze(a,1.2);a.washSafe=2;splash(a.pos.x,a.pos.y,a.pos.z,.5);}a.washSafe=Math.max(0,(a.washSafe||0)-dt);}
 });
}
