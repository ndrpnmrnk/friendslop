import {THREE,G,mesh,col,tmat,lam,compose,frontBack} from '../core/gfx.js';
import {T,photo} from '../core/textures.js';

const SKIN=['#d8ad87','#b88868','#e5bf9c','#c99d79','#e3b693'];
const CLOTH=['#6683a1','#b5798b','#b79c63','#719783','#a8859e'];
const face=(id,alien=false,blink=false)=>photo(`npc35-face-${alien?'alien':'child'}-${id}-${blink}`,32,32,(c,w,h)=>{
 c.fillStyle=alien?'#9da778':SKIN[id%5];c.fillRect(0,0,w,h);c.fillStyle=alien?'#b9c498':'#e4b996';c.fillRect(5,5,21,10);
 c.fillStyle=alien?'#6b785c':'#ae7b61';c.fillRect(2,21,4,9);c.fillRect(27,21,3,9);c.fillStyle='#292531';
 if(alien){for(const x of [8,23]){c.beginPath();c.ellipse(x,14,4.5,blink?1:6,x<16?-.2:.2,0,Math.PI*2);c.fill();if(!blink){c.fillStyle='#dbe7b3';c.fillRect(x-1,10,2,2);c.fillStyle='#292531';}}c.fillRect(14,21,1,2);c.fillRect(18,21,1,2);c.fillRect(13,26,7,1);}
 else{for(const x of [6,22]){c.fillStyle='#5b3e32';c.fillRect(x-1,9,7,2);c.fillStyle='#ece7d6';c.fillRect(x,13,6,blink?2:6);c.fillStyle='#302c33';c.fillRect(x+2,13,3,blink?2:5);if(!blink){c.fillStyle='#f2eadd';c.fillRect(x+2,13,1,2);}}c.fillStyle='#a9765b';c.fillRect(15,19,3,3);c.fillStyle='#845047';c.fillRect(12,26,9,1);c.fillStyle='#d9988a';c.fillRect(10,22,3,2);c.fillRect(22,22,3,2);}
});
const cloth=(id,alien)=>photo('npc35-cloth-'+alien+'-'+id,32,32,g=>{g.fillStyle=alien?'#77788d':CLOTH[id%5];g.fillRect(0,0,32,32);for(let i=0;i<24;i++){g.fillStyle=alien?'#8e91a1':i%2?'#b4aea0':'#667283';g.fillRect(i*19%32,i*11%32,2,1);}g.fillStyle=alien?'#465557':'#424654';g.fillRect(15,0,2,32);g.fillRect(0,27,32,3);g.fillStyle=alien?'#b9b195':'#d1bda1';g.fillRect(5,14,7,2);g.fillRect(21,14,7,2);});
let headGeo;
export function littleNPC(id,alien=false){
 headGeo??=frontBack(new THREE.SphereGeometry(1,8,6),.20);
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.name=alien?'alien':'mission-child';
 const girl=!alien&&id%2===1,skin=col(alien?0x9da778:new THREE.Color(SKIN[id%5]).getHex()),fabric=tmat(cloth(id,alien)),hair=col(id%3?0x594131:0x302932),head=new THREE.Group();head.position.y=alien?1.0:.96;body.add(head);
 const faces={open:tmat(face(id,alien)),closed:tmat(face(id,alien,true))};
 const skull=new THREE.Mesh(headGeo,[faces.open,skin]);skull.scale.set(alien?.295:.24,alien?.29:.255,alien?.24:.225);skull.name='npc-face-head';head.add(skull);
 head.add(compose('npc35-headDetails-'+id+'-'+alien,a=>{for(const s of [-1,1]){a(G.sphL,skin,s*(alien?.275:.23),-.015,0,.055,.085,.045);if(alien)a(G.cone4,skin,s*.27,.045,0,.10,.13,.05,0,0,-s*.7);}if(!alien){a(G.sph10,hair,0,.17,-.045,.247,.12,.226);a(G.box,hair,-.1,.14,.15,.16,.11,.055,0,0,-.12);if(girl)for(const s of [-1,1]){a(G.ico,hair,s*.255,-.04,-.04,.10,.15,.11);a(G.box,col(0xd3a1ba),s*.25,.015,-.03,.07,.035,.06);}}else a(G.cone4,skin,0,-.065,.23,.038,.07,.045,Math.PI/2);}));
 const mouth=mesh(G.sphL,col(0x49303b),0,-.13,alien?.222:.212,.06,.065,.015,head);mouth.name='npc-cry-mouth';mouth.visible=false;
 body.add(compose('npc35-body-'+id+'-'+alien,a=>{a(G.cyl8,skin,0,.745,0,.067,.12,.065);a(G.cyl8,fabric,0,.51,0,.19,.42,.15);a(G.cyl8,col(alien?0x48545b:0x464654),0,.285,0,.17,.10,.13);for(const s of [-1,1]){a(G.cyl6,fabric,s*.105,.18,0,.076,.22,.075);a(G.cyl6,fabric,s*.22,.61,0,.08,.16,.085,0,0,-s*.3);}if(alien){a(G.box,col(0xb1ac85),0,.55,.155,.17,.12,.03);for(const x of [-.045,.025])a(G.box,col(0xb4d28a),x,.56,.176,.028,.035,.012);a(G.box,col(0x474c62),0,.71,-.14,.25,.07,.08);}}));
 const hands=[],feet=[];for(const s of [-1,1]){const h=new THREE.Group();root.add(h);h.position.set(s*.285,.46,.02);h.add(compose('npc35-hand-'+id+'-'+alien,a=>{a(G.sphL,skin,0,0,0,.071,.081,.07);a(G.sphL,skin,-s*.06,-.02,.03,.025,.04,.027);a(G.cyl6,fabric,0,.075,-.01,.069,.10,.07);}));hands.push(h);const f=new THREE.Group();root.add(f);f.position.set(s*.105,.055,.045);f.add(compose('npc35-shoe-'+alien,a=>{a(G.sphL,col(alien?0x515366:0x514b51),0,.02,0,.083,.07,.135);a(G.box,col(0x272631),0,-.03,.01,.16,.025,.25);a(G.box,col(alien?0x959c9c:0xc1b7a5),0,.065,.045,.09,.013,.045);}));feet.push(f);}
 let baton=null;if(alien){baton=new THREE.Group();hands[1].add(baton);baton.add(compose('alien35-baton',a=>{a(G.cyl8,tmat(T.metal()),0,.06,.10,.036,.22,.036);a(G.cyl8,col(0x414150),0,.18,.1,.06,.035,.06);a(G.cyl8,lam({color:0xb3f28b,emissive:0x529d43},'alien35-laser'),0,.36,.1,.026,.33,.026);a(G.cyl8,col(0xd7e3b8),0,.53,.1,.029,.015,.029);}));}
 return{root,body,head,hands,feet,baton,animate(t,speed=0,held=false){const ph=t*(held?21:12)+id,sn=Math.sin(ph);body.position.y=Math.abs(sn)*speed*.028;body.rotation.z=held?Math.sin(t*19)*.08:sn*speed*.025;head.rotation.y=Math.sin(t*2+id)*.10;skull.material[0]=(t+id*.8)%4>.12?faces.open:faces.closed;mouth.visible=held;
  hands.forEach((h,i)=>{h.position.z=Math.sin(ph+i*Math.PI)*(.03+speed*.16);h.position.y=.46+(held?Math.sin(ph+i)*.08:0);h.rotation.x=held?sn*(i?-1:1)*1.2:sn*(i?-1:1)*speed*.55;});feet.forEach((f,i)=>{f.position.y=.055+Math.max(0,sn*(i?-1:1))*(held?.16:speed*.12);f.position.z=.045+sn*(i?-1:1)*speed*.13;f.rotation.x=sn*(i?-1:1)*speed*.4;});}};
}
export function vanModel(){
 const g=new THREE.Group();g.name='tck-van';const paint=lam({map:T.paintMetal(0x354733),color:0x6b8d5e},'tck35-paint'),metal=tmat(T.metal()),dark=col(0x20262b),glass=col(0x52686b),seat=tmat(T.cloth(0x5d604a));
 g.add(compose('tckVan35',a=>{
  a(G.box,dark,0,.43,0,2.25,.17,4.8);a(G.box,paint,0,.6,0,2.3,.22,4.9);a(G.box,paint,0,2.35,-.1,2.35,.16,4.6);a(G.box,paint,0,1.2,1.78,2.3,1.15,1.45);a(G.box,glass,0,1.94,1.96,2.03,.46,.025,-.18);
  for(const s of [-1,1]){a(G.box,paint,s*1.1,1.46,-.64,.12,1.7,2.65);a(G.box,glass,s*1.17,1.9,.90,.025,.45,.8);a(G.box,tmat(T.sign('ТЦК','#354733','#ded8b8')),s*1.171,1.5,-.55,1.6,.55,.012,0,s*Math.PI/2);a(G.box,metal,s*1.3,1.73,1.3,.20,.24,.14);a(G.box,dark,s*1.19,1.63,1.24,.23,.025,.05);a(G.box,paint,s*1.15,1.43,.93,.05,.028,1.02);a(G.box,metal,s*1.185,1.3,.68,.025,.055,.18);
   a(G.box,dark,s*1.178,.86,-.20,.025,.055,4.3);a(G.box,paint,s*1.18,1.42,-1.96,.022,1.55,.025);a(G.box,paint,s*1.18,1.42,.45,.022,1.55,.025);a(G.box,col(0xd4c6a1),s*.78,1.04,2.52,.43,.25,.045);a(G.box,col(0xf4d9ac),s*.78,1.04,2.55,.33,.16,.018);a(G.box,col(0xa13e35),s*.95,.91,-2.47,.18,.35,.04);
   for(const z of [-1.55,1.55]){a(G.box,paint,s*1.18,.92,z,.10,.12,.85);for(const d of [-1,1])a(G.box,paint,s*1.18,.76,z+d*.39,.10,.38,.12);}
   a(G.box,dark,s*.58,1.8,2.025,.025,.03,.66,0,s*.22,.1);a(G.box,dark,s*1.11,2.29,-.15,.035,.03,4.0);
   a(G.box,metal,s*.82,.78,-2.55,.035,.12,.20);a(G.box,seat,s*.77,.9,-.65,.43,.25,2.9);a(G.box,seat,s*.96,1.15,-.65,.08,.40,2.9);for(const z of [-1.7,-.5,.55])a(G.box,metal,s*.79,.77,z,.035,.17,.035);
  }
  a(G.box,dark,0,.68,2.5,2.4,.17,.12);a(G.box,dark,0,.58,-2.5,2.4,.14,.16);a(G.box,metal,0,.89,2.545,.74,.21,.018);for(let i=0;i<5;i++)a(G.box,dark,0,1.2+i*.065,2.519,1.03,.025,.02);a(G.cyl8,metal,0,1.4,2.54,.075,.012,.075,Math.PI/2);a(G.box,tmat(T.wood()),0,.71,-.62,1.95,.04,2.8);a(G.box,dark,0,1.65,.56,2.0,1.2,.07);a(G.box,glass,0,1.94,.515,.8,.32,.025);
 }));
 const doors=[];for(const s of [-1,1]){const p=new THREE.Group();p.position.set(s*1.08,1.48,-2.39);g.add(p);p.add(compose('tckDoor35-'+s,a=>{a(G.box,paint,-s*.53,0,0,1.04,1.55,.08);a(G.box,dark,-s*.53,.36,-.047,.88,.52,.025);a(G.box,glass,-s*.53,.36,-.065,.80,.44,.025);a(G.box,metal,-s*.93,-.1,-.06,.07,.22,.05);for(const y of [-.55,.5])a(G.box,metal,0,y,0,.07,.11,.11);a(G.box,dark,-s*.53,-.7,-.045,.92,.055,.012);}));doors.push({p,s});}
 const wheels=[];for(const s of [-1,1])for(const z of [-1.55,1.55]){const p=new THREE.Group();p.position.set(s*1.12,.48,z);g.add(p);mesh(G.cyl12,tmat(T.tread()),0,0,0,.41,.22,.41,p).rotation.z=Math.PI/2;mesh(G.cyl8,metal,s*.12,0,0,.21,.025,.21,p).rotation.z=Math.PI/2;mesh(G.cyl8,dark,s*.135,0,0,.065,.025,.065,p).rotation.z=Math.PI/2;wheels.push(p);}
 return{g,doors,wheels};
}
export function ufoModel(){
 const g=new THREE.Group();g.name='cosmo-ufo';g.add(compose('ufo35',a=>{const m=tmat(T.metal());a(G.sph10,m,0,0,0,3.1,.45,3.1);a(G.cyl12,col(0x4b4558),0,-.18,0,2.5,.15,2.5);a(G.sph10,lam({color:0x8bb6a4,transparent:true,opacity:.7,depthWrite:false},'ufo35-dome'),0,.3,0,1.35,.9,1.35);a(G.cyl8,col(0x302b42),0,-.43,0,.95,.09,.95);for(let i=0;i<10;i++){const an=i*Math.PI/5;a(G.box,lam({color:i%2?0xcba15c:0x9be36b,emissive:i%2?0x69471b:0x507a31},'ufo35-light'+i%2),Math.sin(an)*2.6,-.16,Math.cos(an)*2.6,.23,.13,.23);a(G.box,col(0x555361),Math.sin(an)*2,-.25,Math.cos(an)*2,.25,.04,.42,0,an,0);}for(let i=0;i<3;i++){const an=i*Math.PI*2/3;a(G.cyl8,col(0x373446),Math.sin(an)*1.8,-.42,Math.cos(an)*1.8,.18,.22,.18);}}));
 const hatch=new THREE.Group();hatch.position.set(0,-.46,-.82);g.add(hatch);mesh(G.cyl8,col(0x646374),0,0,.82,.82,.06,.82,hatch);g.userData.hatch=hatch;return g;
}
