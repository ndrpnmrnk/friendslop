import {THREE,G,mesh,col,tmat,lam,own} from '../core/gfx.js';
import {pix,T} from '../core/textures.js';
const DOME=new THREE.SphereGeometry(1,14,7,0,Math.PI*2,0,Math.PI/2);
const bread=()=>pix('burger0633-bread',64,64,g=>{g.fillStyle='#c9924a';g.fillRect(0,0,64,64);for(let i=0;i<180;i++){g.fillStyle=['#dfb56d','#b87b3d','#eac98c'][i%3];g.fillRect(i*23%64,i*37%64,2,1);}for(let i=0;i<28;i++){g.fillStyle='#f5dfaa';g.fillRect(i*19%60+2,i*31%60+2,3,1);}});
const meat=()=>pix('burger0633-meat',32,32,g=>{g.fillStyle='#b8a89d';g.fillRect(0,0,32,32);for(let i=0;i<150;i++){g.fillStyle=i%3?'#dbccc0':'#6f5a50';g.fillRect(i*11%32,i*23%32,1+(i%2),1);}g.fillStyle='#4b3b32';for(let x=2;x<32;x+=8)g.fillRect(x,0,2,32);});
const leaf=()=>pix('burger0633-leaf',32,32,g=>{g.fillStyle='#7caa4d';g.fillRect(0,0,32,32);g.strokeStyle='#b3ca76';g.lineWidth=1;for(let y=2;y<32;y+=6){g.beginPath();g.moveTo(0,y);g.lineTo(16,16);g.lineTo(32,y);g.stroke();}});
export const BURGER_LAYERS=['bottom','patty','cheese','lettuce','top'];
export const BURGER_HEIGHTS=[.065,.04,.024,.03,.12];
export function burgerLayer(kind,raw=false){
 const g=new THREE.Group();g.name='burger-'+kind;
 if(kind==='bottom')mesh(G.cyl12,tmat(bread()),0,.0325,0,.18,.065,.18,g);
 if(kind==='top')mesh(DOME,tmat(bread()),0,0,0,.18,.12,.18,g);
 if(kind==='patty'){
  const make=()=>own({map:meat(),color:raw?0xe5a1a0:0x79513a});
  const bottom=mesh(G.cyl12,make(),0,.01,0,.175,.02,.175,g),top=mesh(G.cyl12,make(),0,.03,0,.175,.02,.175,g);g.sides=[bottom,top];
 }
 if(kind==='cheese'){mesh(G.box,col(0xf0c553),0,.009,0,.33,.018,.33,g).rotation.y=.20;for(const x of[-.15,.15])mesh(G.box,col(0xdba536),x,.011,.04,.035,.014,.22,g).rotation.z=x>0?-.2:.2;}
 if(kind==='lettuce'){for(let i=0;i<7;i++){const a=i*Math.PI*2/7;mesh(G.sphL,tmat(leaf()),Math.sin(a)*.09,.015,Math.cos(a)*.09,.105,.015,.09,g).rotation.y=a;}}
 g.userData.noOcc=true;return g;
}
export function burgerSample(){const g=new THREE.Group();let y=0;for(let i=0;i<5;i++){const p=burgerLayer(BURGER_LAYERS[i]);p.position.y=y;g.add(p);y+=BURGER_HEIGHTS[i];}return g;}
export function disposeBurger(model){model.traverse(o=>{for(const side of o.sides||[])side.material.dispose();});}
