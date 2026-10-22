import {THREE,G,V3,mesh,col,lam,tmat,compose} from '../core/gfx.js';
import {T,photo} from '../core/textures.js';
import {actors} from './actors.js';
import {puff} from '../world/particles.js';
import {sfx} from '../core/sfx.js';
import {CONFIG} from '../config.js';

const glass=()=>lam({map:photo('bong34-glass',32,32,(g,w,h)=>{g.fillStyle='#819f9b';g.fillRect(0,0,w,h);g.fillStyle='#bad1bd';g.fillRect(w*.12,0,w*.13,h);g.fillStyle='#526b71';g.fillRect(w*.8,0,w*.12,h);}),transparent:true,opacity:.72,depthWrite:false,flatShading:true},'bong34-glass');
// Одна модель для стола, миссии и награды. Ствол складывается, кольца втягиваются.
export function bongModel(){
 const g=new THREE.Group();g.name='bong';
 g.add(compose('bong34-base',a=>{const metal=tmat(T.metal());a(G.cyl8,metal,0,-.22,0,.16,.045,.16);a(G.cyl8,glass(),0,-.08,0,.14,.25,.14);a(G.cyl8,col(0x718d66),0,-.15,0,.12,.08,.12);a(G.cyl8,glass(),0,.17,0,.058,.30,.058);a(G.torus,metal,0,.33,0,.06,.06,.018,Math.PI/2);a(G.box,tmat(T.sign('COSMO','#d2b06d','#383e42')),0,-.04,.14,.19,.10,.012);}));
 const stem=new THREE.Group();stem.position.set(0,-.05,.06);g.add(stem);stem.add(compose('bong34-stem',a=>{a(G.cyl8,tmat(T.metal()),0,.04,.11,.03,.22,.03,Math.PI/3);a(G.cyl8,col(0x51452d),0,.1,.19,.065,.05,.065);a(G.cyl8,col(0xb17732),0,.128,.19,.045,.008,.045);}));
 const gun=new THREE.Group();g.add(gun);gun.add(compose('bong34-blaster',a=>{for(let i=0;i<3;i++)a(G.cyl8,tmat(T.metal()),0,.08,.18+i*.11,.085,.045,.085,Math.PI/2);a(G.cyl8,col(0x536b5f),0,.08,.30,.055,.42,.055,Math.PI/2);a(G.cyl8,lam({color:0x9be36b,emissive:0x5d9a33},'bong34-muzzle'),0,.08,.52,.045,.018,.045,Math.PI/2);}));
 const smoke=mesh(G.cyl8,lam({color:0xe6dfce,transparent:true,opacity:.5,depthWrite:false},'bong34-smoke'),0,.07,0,.039,.32,.039,g);smoke.visible=false;
 g.userData.bong={stem,gun,smoke,k:0};setBongForm(g,0);return g;
}
export function setBongForm(g,k,fill=0){const u=g.userData.bong;if(!u)return;u.k=k;u.stem.rotation.x=-k*.9;u.gun.scale.setScalar(Math.max(.001,k));u.gun.visible=k>.01;u.smoke.visible=fill>.01;u.smoke.scale.y=Math.max(.001,fill);u.smoke.position.y=-.09+fill*.16;}
export function bongPose(a,g,near=false){
 a.root.updateMatrixWorld(true);const d=a.ch.d;
 const y=near?(a.ch.speechMouth?.position.y??d.top*.66)-.09:d.handY+.12,z=near?Math.max(.27,(a.ch.speechMouth?.position.z??d.holdZ)+.05):d.holdZ+.10;
 a.ch.handR.position.set(.13,y-.20,z);a.ch.handL.position.set(-.10,y-.23,z+.06);
 g.position.copy(a.root.localToWorld(new V3(.04,y-.24,z)));g.rotation.set(near?-.08:-.20,a.root.rotation.y,0,'YXZ');
}
export function useBong(a,it){if(a.bongUse||a.hazeT>1||it.cd>0||a.daze>0||a.stun>0)return;it.cd=CONFIG.encounters.bongEffect+3;a.bongUse={it,t:0,puff:0};sfx('bongBubble',{at:a.pos,range:12});}
export function updateBongEffects(dt,t){
 for(const a of actors()){
  if(a.hazeT>0){a.hazeT=Math.max(0,a.hazeT-dt);const k=Math.min(1,a.hazeT/2);a.ch.body.rotation.z+=Math.sin(t*2.1)*.055*k;a.ch.head.rotation.z+=Math.sin(t*1.7+.7)*.045*k;}
  const q=a.bongUse;if(!q)continue;
  if(a.held!==q.it||a.stun>0||a.heldBy){a.bongUse=null;continue;}
  q.t+=dt;bongPose(a,q.it.g,true);setBongForm(q.it.g,0,Math.min(1,q.t/1.5));
  if(q.t>1.5&&(q.puff-=dt)<=0){q.puff=.12;const p=a.root.localToWorld(new V3(0,a.ch.d.top*.68,.28));puff(p.x,p.y,p.z,{color:0xe6dfce,size:.12,vx:Math.sin(a.root.rotation.y)*1.6,vz:Math.cos(a.root.rotation.y)*1.6,vy:.3,life:.8,g:0,grow:1.4});}
  if(q.t>2.7){a.hazeT=CONFIG.encounters.bongEffect;a.bongUse=null;setBongForm(q.it.g,0);}
 }
}
