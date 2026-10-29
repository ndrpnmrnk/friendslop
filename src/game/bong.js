import { random } from '../core/random.js';
import {THREE,G,V3,mesh,col,lam,tmat,compose} from '../core/gfx.js';
import {T,photo} from '../core/textures.js';
import {actors} from './actors.js';
import {puff,smoke} from '../world/particles.js';
import {sfx} from '../core/sfx.js';
import {CONFIG} from '../config.js';

const glass=()=>lam({map:photo('bong34-glass',32,32,(g,w,h)=>{g.fillStyle='#819f9b';g.fillRect(0,0,w,h);g.fillStyle='#bad1bd';g.fillRect(w*.12,0,w*.13,h);g.fillStyle='#526b71';g.fillRect(w*.8,0,w*.12,h);}),transparent:true,opacity:.72,depthWrite:false,flatShading:true},'bong34-glass');
// Одна модель для стола, миссии и награды. Ствол складывается, кольца втягиваются.
export function bongModel(){
 const g=new THREE.Group();g.name='bong';
 g.add(compose('bong35-base',a=>{const metal=tmat(T.metal());a(G.cyl8,metal,0,-.22,0,.16,.045,.16);a(G.cyl8,glass(),0,-.08,0,.14,.25,.14);a(G.cyl8,col(0x718d66),0,-.15,0,.12,.08,.12);a(G.cyl8,glass(),0,.17,0,.058,.30,.058);a(G.torus,metal,0,.33,0,.06,.06,.018,Math.PI/2);a(G.ico,col(0xc6ab72),0,-.05,.14,.035,.05,.008);for(const y of [-.12,-.04,.04])a(G.box,col(0x9fbaad),.105,y,.10,.025,.008,.008);}));
 const stem=new THREE.Group();stem.position.set(0,-.05,.06);g.add(stem);stem.add(compose('bong34-stem',a=>{a(G.cyl8,tmat(T.metal()),0,.04,.11,.03,.22,.03,Math.PI/3);a(G.cyl8,col(0x51452d),0,.1,.19,.065,.05,.065);a(G.cyl8,col(0xb17732),0,.128,.19,.045,.008,.045);}));
 const gun=new THREE.Group();g.add(gun);gun.add(compose('bong34-blaster',a=>{for(let i=0;i<3;i++)a(G.cyl8,tmat(T.metal()),0,.08,.18+i*.11,.085,.045,.085,Math.PI/2);a(G.cyl8,col(0x536b5f),0,.08,.30,.055,.42,.055,Math.PI/2);a(G.cyl8,lam({color:0x9be36b,emissive:0x5d9a33},'bong34-muzzle'),0,.08,.52,.045,.018,.045,Math.PI/2);}));
 const cloud=new THREE.InstancedMesh(G.box,lam({color:0xe6dfce,transparent:true,opacity:.42,depthWrite:false},'bong35-smoke'),16),m=new THREE.Matrix4();cloud.name='bong-chamber-smoke';cloud.userData.noOutline=true;cloud.frustumCulled=false;cloud.renderOrder=1;for(let i=0;i<16;i++){m.makeScale(.025+(i%3)*.006,.025,.025);m.setPosition(Math.sin(i*2.4)*.029,-.11+i*.023,Math.cos(i*2.4)*.029);cloud.setMatrixAt(i,m);}g.add(cloud);
 g.userData.bong={stem,gun,smoke:cloud,k:0,breathClock:0};setBongForm(g,0);return g;
}
export function setBongForm(g,k,fill=0){const u=g.userData.bong;if(!u)return;u.k=k;u.stem.rotation.x=-k*.9;u.gun.scale.setScalar(Math.max(.001,k));u.gun.visible=k>.01;u.smoke.visible=fill>.01;u.smoke.count=Math.max(0,Math.min(16,Math.ceil(fill*16)));}
export function disposeBong(g){const u=g.userData.bong;if(u&&!u.disposed){u.disposed=true;u.smoke.dispose();}}
const mouth=new V3(),forward=new V3(),rotation=new THREE.Quaternion(),tilt=new THREE.Quaternion(),local=new V3();
export function mouthPosition(a,out=new V3()){a.root.updateMatrixWorld(true);return a.ch.speechMouth.getWorldPosition(out);}
export function bongPose(a,g,near=false){
 a.root.updateMatrixWorld(true);const d=a.ch.d;
 if(near){mouthPosition(a,mouth);a.ch.head.getWorldQuaternion(rotation);tilt.setFromAxisAngle(new V3(1,0,0),-.10);g.quaternion.copy(rotation).multiply(tilt);forward.set(0,0,.035).applyQuaternion(rotation);local.set(0,.33,0).applyQuaternion(g.quaternion);g.position.copy(mouth).add(forward).sub(local);}
 else{g.position.copy(a.root.localToWorld(new V3(.06,d.handY-.13,d.holdZ+.10)));g.rotation.set(-.20,a.root.rotation.y,0,'YXZ');}
 g.updateMatrixWorld(true);for(const[h,x,y,z]of [[a.ch.handR,.08,-.04,0],[a.ch.handL,-.09,-.16,.02]]){local.set(x,y,z);g.localToWorld(local);a.root.worldToLocal(local);h.position.copy(local);h.rotation.x=-.25;}
}
export function setBreath(a,k){const c=a.ch;let u=c.breathCheeks;if(!u){const tones={cat:0xdca86e,tv:0xa79baf,shark:0x8aabc7,frog:0x92b56f,caveman:0xc99873,smoky:0xe4dbc6,latte:0xc7a787},w=c.skinId==='smoky'?.10:.19,p=c.speechMouth.position;u=c.breathCheeks=[-1,1].map(s=>{const m=mesh(G.sphL,col(tones[c.skinId]||0xcba78b),s*w,p.y+.02,p.z-.005,.025,.045,.018,c.head);m.name='breath-cheek';return m;});}c.breath=k;for(const m of u){m.visible=k>.015;m.scale.set(.025+k*.033,.045+k*.025,.018+k*.025);}}
export function inhaleSmoke(a,g,dt){const u=g.userData.bong;u.breathClock-=dt;if(u.breathClock>0)return;u.breathClock=.075;const to=mouthPosition(a),from=g.localToWorld(new V3(0,.335,.025)),v=to.clone().sub(from).multiplyScalar(5);for(let i=0;i<2;i++)smoke(from.x+(i-.5)*.016,from.y,from.z,{dust:true,color:0xe7e0ce,size:.018+i*.005,grow:.012,vx:v.x,vy:v.y,vz:v.z,g:0,life:.20,opacity:.6});}
export function exhaleSmoke(a){const p=mouthPosition(a),q=a.ch.head.getWorldQuaternion(new THREE.Quaternion()),f=new V3(0,0,1).applyQuaternion(q);for(let i=0;i<5;i++)smoke(p.x+f.x*.035,p.y+(i%2)*.015,p.z+f.z*.035,{dust:i%2===0,color:i%2?0xd2cadd:0xe7e0d1,size:.025+i*.008,grow:.11+i*.025,vx:f.x*(1.8+i*.22)+(random()-.5)*.14,vy:f.y*2+.15,vz:f.z*(1.8+i*.22)+(random()-.5)*.14,g:0,life:.7+i*.04,opacity:.65});}
export function useBong(a,it){if(a.bongUse||a.hazeT>1||it.cd>0||a.daze>0||a.stun>0)return;it.cd=CONFIG.encounters.bongEffect+3;a.bongUse={it,t:0,puff:0};sfx('bongBubble',{at:a.pos,range:12});}
export function updateBongEffects(dt,t){
 for(const a of actors()){
  if(a.hazeT>0){a.hazeT=Math.max(0,a.hazeT-dt);const k=Math.min(1,a.hazeT/2),angle=Math.sin(t*2.1)*.055*k;a.ch.body.rotation.z+=angle;a.ch.hazeTilt=angle;}
  const q=a.bongUse;if(!q)continue;
  if(a.held!==q.it||a.stun>0||a.heldBy){setBreath(a,0);a.bongUse=null;continue;}
  q.t+=dt;bongPose(a,q.it.g,true);setBongForm(q.it.g,0,Math.min(1,q.t/1.5));
  setBreath(a,q.t<1.5?Math.min(1,q.t/1.5):Math.max(0,1-(q.t-1.5)/1.2));if(q.t<1.5)inhaleSmoke(a,q.it.g,dt);
  if(q.t>1.5&&(q.puff-=dt)<=0){q.puff=.16;exhaleSmoke(a);}
  if(q.t>2.7){a.hazeT=CONFIG.encounters.bongEffect;a.bongUse=null;setBongForm(q.it.g,0);setBreath(a,0);}
 }
}
