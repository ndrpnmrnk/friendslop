import {G,compose,tmat,col,lam} from '../core/gfx.js';
import {photo,T} from '../core/textures.js';
import {sfx} from '../core/sfx.js';
export const SNACKS={bao:.45,taco:.35,noodles:.50,burger:.60};
const bun=()=>photo('snack36-bun',32,32,g=>{g.fillStyle='#cd9a56';g.fillRect(0,0,32,32);for(let i=0;i<50;i++){g.fillStyle=i%3?'#e7c68b':'#ad793f';g.fillRect(i*19%32,i*11%32,2,1);}});
const label=()=>photo('snack36-noodles',32,32,g=>{g.fillStyle='#e5dcc1';g.fillRect(0,0,32,32);g.fillStyle='#b64b45';for(let x=1;x<32;x+=3)g.fillRect(x,1,1,9);g.font='bold 8px monospace';g.fillText('CUP',7,19);g.fillText('NOODLE',2,27);});
export function snackModel(type){return compose('snack36-'+type,a=>{
 const bread=tmat(bun()),white=col(0xe4d5ac),leaf=col(0x789a4b),meat=col(0x704b34),cheese=col(0xe9c359),tomato=col(0xc45e45);
 if(type==='burger'){a(G.sph10,bread,0,.06,0,.20,.12,.18);a(G.cyl12,bread,0,-.12,0,.20,.07,.18);a(G.cyl12,meat,0,-.065,0,.195,.055,.175);a(G.box,cheese,0,-.02,0,.34,.025,.34,0,.18,0);for(let i=0;i<7;i++){const an=i*.9;a(G.box,leaf,Math.sin(an)*.13,.015,Math.cos(an)*.13,.16,.025,.13,0,an,.1);a(G.box,white,Math.sin(an)*.12,.155,Math.cos(an)*.09,.022,.008,.011);}a(G.cyl8,tomato,0,.024,0,.17,.02,.16);}
 else if(type==='taco'){for(const s of [-1,1])a(G.sph10,bread,s*.062,0,0,.025,.18,.23,0,0,s*.22);a(G.box,meat,0,-.015,0,.10,.16,.36);for(let i=0;i<10;i++){const z=(i%5-2)*.075;a(G.box,i%2?leaf:tomato,(i%2?1:-1)*.045,.12+(i%3)*.014,z,.065,.045,.065,0,i*.7,.2);a(G.box,cheese,0,.14,z,.055,.012,.025,0,.4);}}
 else if(type==='noodles'){a(G.cyl8,tmat(label()),0,-.025,0,.145,.30,.145);a(G.cyl8,white,0,.13,0,.154,.025,.154);a(G.cyl8,col(0xb49354),0,.145,0,.13,.012,.13);for(let i=0;i<6;i++)a(G.torus,col(0xe5c88c),(i%3-1)*.045,.154,Math.floor(i/3)*.04-.02,.045,.035,.012,Math.PI/2);for(const s of [-1,1])a(G.box,col(0x9c6639),s*.045,.27,-.035,.014,.36,.014,0,0,-.3-s*.1);}
 else{a(G.cyl8,tmat(T.wood()),0,-.07,0,.23,.15,.23);for(const y of [-.12,-.06,0])a(G.cyl8,col(0xb1814d),0,y,0,.235,.012,.235);for(const[x,z]of [[-.09,-.035],[.085,.045]]){a(G.sphL,white,x,.055,z,.115,.09,.11);for(let i=0;i<4;i++)a(G.box,col(0xc9b58b),x+(i-1.5)*.018,.13,z,.012,.012,.09,0,i*.3);}}
});}
export function eatSnack(a,it){if(a.eating||a.stun>0||a.heldBy)return;it.cd=1.2;a.eating={it,t:0};sfx('drink',{at:a.pos,range:7});}
export function updateSnacks(a,dt){const e=a.eating;if(!e)return;if(a.held!==e.it||a.stun>0||a.heldBy){a.eating=null;return;}e.t+=dt;a.ch.handR.position.lerp(a.root.worldToLocal(a.ch.speechMouth.getWorldPosition(a.ch.holdPoint)).add({x:.13,y:-.09,z:.21}),Math.min(1,dt*12));a.ch.handR.getWorldPosition(e.it.pos);e.it.g.position.copy(e.it.pos);e.it.g.rotation.set(-.2,a.root.rotation.y,0);if(e.t>.85){a.stamina=Math.min(1,a.stamina+SNACKS[e.it.type]);e.it.state='gone';e.it.g.visible=false;a.held=null;a.eating=null;sfx('done',{at:a.pos,range:7,v:.3});}}
