import {THREE,G,mesh,col,tmat,lam,compose} from '../core/gfx.js';
import {T,photo} from '../core/textures.js';

const face=(id,alien=false)=>photo('encounter34-face-'+id,32,32,(c,w,h)=>{c.fillStyle=alien?'#9aa66e':['#d8ad87','#b88868','#e5bf9c'][id%3];c.fillRect(0,0,w,h);c.fillStyle='#282333';for(const x of [7,21]){c.fillRect(x,11,alien?7:4,alien?9:5);c.fillStyle='#e4e1be';c.fillRect(x+1,12,2,2);c.fillStyle='#282333';}c.fillRect(13,24,7,2);c.fillStyle=alien?'#b4ba84':'#bc7d6c';c.fillRect(13,21,3,2);});
export function littleNPC(id,alien=false){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.name=alien?'alien':'mission-child';
 const girl=!alien&&id%2===1,skin=col(alien?0x9aa66e:0xd9b28c),cloth=tmat(T.cloth(alien?0x827a98:[0x657d9b,0xb07886,0xa48c53][id%3]));
 const head=new THREE.Group();body.add(head);head.add(compose('enc34-head-'+id+'-'+alien,a=>{a(G.sph10,skin,0,.88,0,alien?.26:.23,alien?.28:.25,.205);a(G.plane,tmat(face(id,alien)),0,.89,.198,.36,.36,1);if(!alien){a(G.sph10,col(id%3?0x594131:0x302932),0,1.03,-.04,.24,.13,.21);if(girl)for(const s of [-1,1])a(G.ico,col(0x594131),s*.23,.87,-.04,.12,.15,.10);}else{for(const s of [-1,1])a(G.cyl6,col(0x69735c),s*.12,1.18,-.05,.012,.18,.012,0,0,-s*.3);}}));
 body.add(compose('enc34-body-'+id+'-'+alien,a=>{a(G.cyl6,cloth,0,.5,0,.18,.38,.14);a(G.box,col(alien?0x52625c:0x3c3c50),0,.29,0,.29,.1,.22);if(alien){a(G.box,col(0xc0ab63),0,.55,.15,.16,.1,.04);a(G.box,col(0x9be36b),0,.55,.175,.04,.04,.012);}}));
 const hands=[],feet=[];for(const s of [-1,1]){const h=new THREE.Group();root.add(h);h.position.set(s*.27,.48,.02);h.add(compose('enc34-hand-'+id+'-'+alien,a=>{a(G.sphL,skin,0,0,0,.07,.08,.065);a(G.cyl6,cloth,0,.08,-.01,.07,.12,.07);}));hands.push(h);const f=new THREE.Group();root.add(f);f.position.set(s*.11,.06,.04);mesh(G.box,col(0x37323c),0,0,0,.14,.12,.23,f);feet.push(f);}
 let baton=null;if(alien){baton=new THREE.Group();hands[1].add(baton);mesh(G.cyl6,col(0x4a4357),0,.06,.1,.03,.22,.03,baton);mesh(G.cyl8,lam({color:0xb3f28b,emissive:0x529d43},'alien34-baton'),0,.32,.1,.032,.32,.032,baton);}
 return{root,body,head,hands,feet,baton,animate(t,speed=0,held=false){const sn=Math.sin(t*(held?19:10)+id);body.position.y=Math.abs(sn)*speed*.025;hands.forEach((h,i)=>{h.position.z=Math.sin(t*(held?19:10)+id+i*Math.PI)*(.04+speed*.12);h.rotation.x=held?sn*.8:sn*speed*.4;});feet.forEach((f,i)=>{f.position.y=.06+Math.max(0,sn*(i?-1:1))*(held?.13:speed*.11);});head.rotation.y=Math.sin(t*2+id)*.12;}};
}
export function vanModel(){
 const g=new THREE.Group();g.name='tck-van';const paint=lam({map:T.paintMetal(0x354733),color:0x6b8d5e},'tck34-paint'),metal=tmat(T.metal()),dark=col(0x20262b),glass=col(0x52686b);
 g.add(compose('tckVan34',a=>{
  a(G.box,paint,0,.5,0,2.3,.3,4.9);a(G.box,paint,0,2.35,-.1,2.35,.16,4.6);a(G.box,paint,0,1.2,1.78,2.3,1.15,1.45);a(G.box,glass,0,1.94,1.96,2.03,.46,.025,-.18);
  for(const s of [-1,1]){a(G.box,paint,s*1.1,1.46,-.64,.12,1.7,2.65);a(G.box,glass,s*1.17,1.9,.90,.025,.45,.8);a(G.box,tmat(T.sign('ТЦК','#ded8b8','#354733')),s*1.17,1.5,-.55,1.6,.55,.018,0,s*Math.PI/2);a(G.box,metal,s*1.3,1.73,1.3,.22,.24,.16);a(G.box,col(0xf2d29d),s*.78,1.04,2.52,.4,.23,.04);a(G.box,col(0xa13e35),s*.95,.91,-2.47,.18,.35,.04);}
  a(G.box,dark,0,.68,2.5,2.4,.17,.12);a(G.box,dark,0,.58,-2.5,2.4,.14,.16);a(G.box,metal,0,.89,2.525,.8,.23,.02);a(G.box,tmat(T.wood()),0,.71,-.62,1.95,.04,2.8);for(const s of [-1,1])a(G.box,col(0x625e4a),s*.78,.96,-.6,.38,.35,2.5);
 }));
 const doors=[];for(const s of [-1,1]){const p=new THREE.Group();p.position.set(s*1.08,1.48,-2.39);g.add(p);p.add(compose('tckDoor34-'+s,a=>{a(G.box,paint,-s*.53,0,0,1.04,1.55,.08);a(G.box,glass,-s*.53,.36,-.05,.83,.47,.025);a(G.box,metal,-s*.93,-.1,-.06,.07,.22,.05);}));doors.push({p,s});}
 const wheels=[];for(const s of [-1,1])for(const z of [-1.55,1.55]){const p=new THREE.Group();p.position.set(s*1.12,.48,z);g.add(p);mesh(G.cyl12,tmat(T.tread()),0,0,0,.41,.22,.41,p).rotation.z=Math.PI/2;mesh(G.cyl8,metal,s*.12,0,0,.21,.025,.21,p).rotation.z=Math.PI/2;wheels.push(p);}
 return{g,doors,wheels};
}
export function ufoModel(){const g=new THREE.Group();g.name='cosmo-ufo';g.add(compose('ufo34',a=>{const m=tmat(T.metal());a(G.sph10,m,0,0,0,3.1,.45,3.1);a(G.cyl12,col(0x4b4558),0,-.18,0,2.5,.15,2.5);a(G.sph10,lam({color:0x8bb6a4,transparent:true,opacity:.7,depthWrite:false},'ufo34-dome'),0,.3,0,1.35,.9,1.35);a(G.cyl8,col(0x302b42),0,-.43,0,.95,.09,.95);for(let i=0;i<10;i++){const an=i*Math.PI/5;a(G.box,lam({color:i%2?0xcba15c:0x9be36b,emissive:i%2?0x69471b:0x507a31},'ufo34-light'+i%2),Math.sin(an)*2.6,-.16,Math.cos(an)*2.6,.23,.13,.23);}}));return g;}
