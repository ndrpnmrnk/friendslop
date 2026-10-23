import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T,pix} from '../core/textures.js';
import {W} from './state.js';
import {addOutline} from '../game/outline.js';
import {smoke} from './particles.js';
import {sfx} from '../core/sfx.js';

const quarterTurn=ry=>Math.abs(Math.sin(ry))>.5;
const hazard=()=>pix('district37-hazard',32,32,g=>{g.fillStyle='#b8a15f';g.fillRect(0,0,32,32);g.fillStyle='#43443b';for(let x=-32;x<64;x+=12){g.beginPath();g.moveTo(x,0);g.lineTo(x+6,0);g.lineTo(x+38,32);g.lineTo(x+32,32);g.fill();}});
const notices=()=>pix('district37-notices',64,32,g=>{g.fillStyle='#776652';g.fillRect(0,0,64,32);for(let i=0;i<6;i++){const x=3+i%3*21,y=3+Math.floor(i/3)*15;g.fillStyle=i%2?'#d6cfab':'#b8bbab';g.fillRect(x,y,16,12);g.fillStyle='#68695c';for(let n=0;n<4;n++)g.fillRect(x+2,y+2+n*2,8+n%2*4,1);g.fillStyle='#a25445';g.fillRect(x+7,y,2,2);}});
function prop(b,key,x,z,ry,fn){const g=b.prop(x,z,ry);g.add(compose('district37-'+key,fn));return g;}
// Все неподвижные детали проходят общую склейку карты; интерактивна только маленькая подвижная часть.
export function machine(b,x,z,kind='lathe',ry=0){
 const metal=tmat(T.metal()),paint=tmat(T.paintMetal(0x627b75)),dark=col(0x343c3d);
 prop(b,'machine-'+kind,x,z,ry,a=>{for(const s of [-1,1])a(G.box,dark,s*.92,.12,0,.23,.24,1.22);a(G.box,paint,0,.48,0,2.7,.72,1.45);a(G.box,tmat(hazard()),0,.81,.74,2.45,.12,.02);
  if(kind==='press'){for(const s of [-1,1])a(G.box,metal,s*.92,1.45,-.2,.14,1.3,.14);a(G.box,paint,0,2.1,-.2,2.25,.3,.9);a(G.cyl8,metal,0,1.64,-.2,.14,.7,.14);a(G.box,dark,0,1.28,-.2,.9,.15,.7);a(G.box,metal,0,.91,-.2,1.2,.10,.9);}
  else{a(G.box,paint,-.85,1.12,0,.6,.55,.9);a(G.cyl8,metal,-.24,1.12,0,.20,1.1,.20,0,0,Math.PI/2);a(G.cyl8,dark,.2,1.12,0,.26,.12,.26,0,0,Math.PI/2);for(const z of [-.34,.34])a(G.box,metal,.45,.91,z,1.2,.07,.08);a(G.box,paint,.85,1.10,0,.43,.4,.7);}
  a(G.box,dark,1.13,1.13,.65,.4,.42,.13,0,0,-.08);for(let i=0;i<3;i++)a(G.cyl6,col([0xbb6f54,0x9bab74,0xc7b57d][i]),1.0+i*.11,1.14,.73,.035,.018,.035,Math.PI/2);a(G.box,tmat(T.screen()),1.12,1.25,.725,.26,.08,.015);
 });b.solid(x,z,quarterTurn(ry)?1.55:2.75,quarterTurn(ry)?2.75:1.55,0,kind==='press'?2.25:1.4);
}
export function pallet(b,x,z,y=0,w=1.8,d=1.5){prop(b,'pallet-'+w+'-'+d+'-'+y,x,z,0,a=>{const wood=tmat(T.wood());for(const z of [-d*.35,0,d*.35])a(G.box,wood,0,y+.12,z,w,.24,.12);for(let i=0;i<6;i++)a(G.box,wood,(i-2.5)*w/6,y+.27,0,w/7,.08,d);});b.solid(x,z,w,d,y,.31);}
export function archives(b,x,z,ry=0){prop(b,'archive',x,z,ry,a=>{const wood=tmat(T.cabinet(0x726b58));for(const s of [-1,1])a(G.box,wood,s*.95,1.1,0,.1,2.2,.6);a(G.box,wood,0,1.1,-.27,2,2.2,.06);for(let row=0;row<4;row++){const y=.12+row*.54;a(G.box,wood,0,y,0,2,.07,.6);for(let i=0;i<8;i++){a(G.box,col([0x8e8e73,0x9b735d,0x738c86,0xa89c77][(row+i)%4]),-.78+i*.22,y+.23,0,.16,.39,.40,0,0,i%4===0?-.09:0);a(G.box,col(0xd1cbb0),-.78+i*.22,y+.25,.208,.09,.035,.015);}}});b.solid(x,z,quarterTurn(ry)?.66:2.05,quarterTurn(ry)?2.05:.66,0,2.25);}
export function noticeBoard(b,x,z,ry=0){prop(b,'noticeboard',x,z,ry,a=>{a(G.box,tmat(T.wood()),0,1.8,0,3.6,1.7,.09);a(G.box,tmat(notices()),0,1.8,.052,3.4,1.5,.015);for(const s of [-1,1])a(G.cyl6,col(0x595b50),s*1.45,.82,0,.035,1.65,.035);});b.solid(x,z,quarterTurn(ry)?.18:3.6,quarterTurn(ry)?3.6:.18,0,2.65);}
export function displayCase(b,x,z,kind='trophies',ry=0){prop(b,'display-'+kind,x,z,ry,a=>{const wood=tmat(T.wood()),metal=tmat(T.metal());a(G.box,wood,0,.30,0,2.4,.6,.72);a(G.box,wood,0,1.62,-.32,2.4,2.04,.08);for(const y of [.62,1.35,2.08,2.55])a(G.box,wood,0,y,0,2.4,.075,.72);for(const s of [-1,1])a(G.box,wood,s*1.16,1.61,0,.08,1.96,.72);for(let row=0;row<2;row++)for(let i=0;i<3;i++){const x=(i-1)*.73,y=.67+row*.73;a(G.box,metal,x,y,.02,.35,.06,.28);if(kind==='trophies'){a(G.cyl8,col(0xc2ac6d),x,y+.20,.02,.075,.3,.075);a(G.cone8,col(0xc2ac6d),x,y+.40,.02,.21,.23,.21,Math.PI);a(G.torus,col(0xc2ac6d),x,y+.39,.02,.23,.18,.04,0,Math.PI/2);}else{a(G.sphL,col(i%2?0x82998b:0xb09275),x,y+.28,.02,.18,.20,.16);for(const s of [-1,1])a(G.box,metal,x+s*.19,y+.20,.02,.07,.04,.35);a(G.box,col(0xd1ccac),x,y+.055,.19,.30,.08,.015);}}});b.solid(x,z,quarterTurn(ry)?.78:2.45,quarterTurn(ry)?2.45:.78,0,2.6);}
export function labBench(b,x,z,ry=0){prop(b,'labbench',x,z,ry,a=>{const metal=tmat(T.metal());a(G.box,tmat(T.cabinet(0x686a78)),0,.46,0,3.3,.92,1.1);a(G.box,metal,0,.96,0,3.5,.08,1.18);for(let i=0;i<5;i++){const x=-1.3+i*.63;a(G.cyl8,col(i%2?0x82a5a2:0x9d8ea6),x,1.19,-.05,.10,.36,.10);a(G.cyl6,metal,x,1.44,-.05,.045,.15,.045);a(G.box,col(0xd8d1b7),x,1.21,.055,.12,.10,.015);}a(G.box,col(0x43485a),1.25,1.35,-.2,.55,.65,.45);a(G.box,tmat(T.screen()),1.25,1.38,.035,.42,.32,.015);for(const s of [-1,1])a(G.cyl6,col(0xc2b88d),1.25+s*.15,1.13,.05,.04,.025,.04,Math.PI/2);});b.solid(x,z,quarterTurn(ry)?1.2:3.5,quarterTurn(ry)?3.5:1.2,0,1.02);}
export function civicDetails(b,x,z){noticeBoard(b,x,z);for(const s of [-1,1])b.plantPot(x+s*2.4,z,.85);}

// Три локальных взаимодействия, общий ограниченный контроллер без таймеров/setInterval.
export function detailAction(b,x,z,y,kind='stamp',ry=0){
 const g=b.prop(x,z,ry);g.position.y+=y;W.keep.push(g);const moving=new THREE.Group();g.add(moving);const metal=tmat(T.metal());let mark=null;
 if(kind==='steam'){g.add(compose('detail37-valve',a=>{a(G.cyl8,metal,0,.40,0,.13,.8,.13);a(G.cyl8,metal,0,.6,.26,.10,.52,.10,Math.PI/2);a(G.box,tmat(hazard()),0,.8,-.12,.5,.15,.025);}));moving.position.set(0,.62,.42);mesh(G.torus,col(0xaa6851),0,0,0,.20,.20,.05,moving);for(const s of [-1,1])mesh(G.box,col(0xaa6851),0,0,0,s===1?.40:.04,s===1?.04:.40,.04,moving);}
 else if(kind==='stamp'){g.add(compose('detail37-stamp',a=>{a(G.box,tmat(T.wood()),0,.03,0,.78,.06,.56);a(G.box,col(0xd5cbb1),0,.07,.05,.52,.012,.39);a(G.box,col(0x835648),.28,.09,-.10,.16,.07,.19);}));mesh(G.box,col(0x696a5d),0,.12,.05,.18,.09,.14,moving);mesh(G.cyl6,col(0x8e674b),0,.24,.05,.045,.20,.045,moving);mark=mesh(G.ring,col(0xa0594e),0,.079,.05,.055,.055,1,g);mark.rotation.x=-Math.PI/2;mark.visible=false;}
 else{g.add(compose('detail37-coil',a=>{a(G.box,metal,0,.08,0,.8,.16,.65);for(const s of [-1,1])a(G.cyl8,col(0x7f718d),s*.28,.35,0,.09,.52,.09);a(G.box,tmat(T.screen()),0,.17,.33,.35,.10,.015);}));mesh(G.torus,col(0xba9d6a),0,.49,0,.25,.25,.05,moving);mesh(G.sphL,col(0x8ba690),.24,.49,0,.09,.09,.09,moving);}
 const outline=addOutline(g),point=new V3(b.X(x),b.Y+y,b.Z(z));let active=0,cd=0,fx=0,phase=0;
 W.interacts.push({x:point.x,z:point.z,y:b.Y,r:1.25,dy:2.0,outline,label:{steam:'Повернуть паровой клапан',stamp:'Поставить печать',coil:'Запустить лабораторный макет'}[kind],enabled:()=>cd<=0,act(){active=kind==='steam'?1.6:kind==='stamp'?.9:3;cd=active+1;phase=0;if(mark)mark.visible=false;sfx(kind==='steam'?'hiss':'click',{at:point,range:10});}});
 W.animated.push(dt=>{cd=Math.max(0,cd-dt);if(active<=0)return;active-=dt;phase+=dt;if(kind==='stamp'){moving.position.y=-Math.sin(Math.min(1,phase/.45)*Math.PI)*.035;if(phase>.2)mark.visible=true;}else if(kind==='steam'){moving.rotation.z+=dt*3;fx-=dt;if(fx<=0){fx=.10;const p=g.localToWorld(new V3(0,.85,0));smoke(p.x,p.y,p.z,{color:0xb4bdad,size:.10,grow:.28,vy:.65,life:.9,opacity:.42});}}else moving.rotation.y+=dt*5;});
 return g;
}
