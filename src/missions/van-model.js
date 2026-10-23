import {THREE,G,mesh,col,tmat,lam,compose} from '../core/gfx.js';
import {T,pix} from '../core/textures.js';
const paint=()=>pix('tck36-body',64,64,g=>{g.fillStyle='#4b6046';g.fillRect(0,0,64,64);for(let i=0;i<200;i++){g.fillStyle=i%3?'#45583f':'#566a4d';g.fillRect(i*31%64,i*17%64,2,1);}g.fillStyle='#637557';g.fillRect(0,1,64,1);g.fillStyle='#354633';g.fillRect(0,62,64,2);});
let roofGeo;
function roof(){if(roofGeo)return roofGeo;const s=new THREE.Shape();s.moveTo(-1.16,0);s.lineTo(-1.13,.10);s.lineTo(-.96,.17);s.lineTo(.96,.17);s.lineTo(1.13,.10);s.lineTo(1.16,0);s.closePath();roofGeo=new THREE.ExtrudeGeometry(s,{depth:4.65,bevelEnabled:false});roofGeo.translate(0,0,-2.38);return roofGeo;}
export function vanModel(){
 const g=new THREE.Group();g.name='tck-van';const body=tmat(paint()),trim=col(0x27302e),metal=tmat(T.metal()),glass=lam({color:0x879d97,transparent:true,opacity:.55,depthWrite:false},'tck36-glass'),seat=tmat(T.cloth(0x5a6250));
 g.add(compose('tck36-hull',a=>{
  a(G.box,trim,0,.43,0,2.18,.18,4.7);a(G.box,body,0,.61,-.12,2.3,.20,4.55);a(G.box,tmat(T.wood()),0,.728,-.88,2.04,.035,2.98);a(roof(),body,0,2.27,0);
  for(const s of [-1,1]){
   a(G.box,body,s*1.10,1.46,-.92,.12,1.54,2.94);a(G.box,body,s*1.10,.98,1.13,.12,.58,1.16);
   a(G.box,body,s*1.10,1.77,.59,.12,1.02,.12);a(G.box,body,s*1.10,1.78,1.76,.12,.98,.10, -.18);a(G.box,trim,s*1.105,2.22,1.16,.14,.065,1.18);
   a(G.box,glass,s*1.10,1.83,1.13,.025,.64,.93);a(G.box,trim,s*1.17,1.46,1.1,.025,.04,1.23);a(G.box,metal,s*1.178,1.28,.78,.03,.045,.20);
   a(G.box,trim,s*1.17,.85,-.13,.035,.055,4.45);a(G.box,trim,s*1.175,1.43,-2.18,.022,1.5,.022);a(G.box,trim,s*1.175,1.43,.42,.022,1.5,.022);
   a(G.box,tmat(T.sign('ТЦК','#4b6046','#e1dbb9')),s*1.171,1.6,-.87,1.32,.46,.012,0,s*Math.PI/2);
   a(G.box,trim,s*1.23,1.73,1.68,.23,.035,.07);a(G.box,body,s*1.36,1.76,1.68,.15,.27,.15);a(G.box,col(0x9da7a3),s*1.36,1.76,1.592,.12,.22,.012);
   a(G.box,body,s*.84,1.15,2.40,.45,.35,.09);a(G.box,col(0xd9ca9d),s*.84,1.19,2.455,.34,.19,.018);a(G.box,col(0xad7946),s*1.04,1.12,2.46,.07,.12,.02);
   a(G.box,col(0xa04738),s*1.01,1.02,-2.43,.16,.35,.055);a(G.box,col(0xdba170),s*1.01,1.10,-2.465,.13,.09,.015);
   for(const z of [-1.55,1.55]){a(G.box,trim,s*1.165,.66,z,.08,.12,.98);a(G.box,body,s*1.17,.94,z,.08,.09,.92);}
   a(G.box,seat,s*.77,.88,-.91,.43,.23,2.6);a(G.box,seat,s*.98,1.17,-.91,.08,.45,2.6);for(const z of [-1.8,-.85,.15])a(G.box,metal,s*.77,.76,z,.035,.16,.035);
   a(G.box,seat,s*.55,1.03,1.08,.55,.16,.57);a(G.box,seat,s*.55,1.36,.81,.55,.58,.12,.12);a(G.box,metal,s*.55,.84,1.08,.06,.25,.06);
   a(G.box,trim,s*.48,1.87,2.005,.024,.03,.68,.2,0,s*.20);
  }
  a(G.box,body,0,.99,2.08,2.26,.58,.64);a(G.box,body,0,1.31,2.12,2.26,.12,.62,-.08);a(G.box,glass,0,1.89,1.985,1.98,.65,.026,-.23);a(G.box,trim,0,1.55,2.065,2.13,.05,.06);a(G.box,body,0,2.24,1.91,2.23,.065,.12);
  a(G.box,trim,0,.66,2.47,2.38,.18,.14);a(G.box,trim,0,.59,-2.48,2.38,.15,.18);a(G.box,metal,0,.76,-2.6,1.64,.055,.26);a(G.box,trim,0,.99,2.415,.72,.25,.02);for(let i=0;i<4;i++)a(G.box,metal,0,.91+i*.05,2.434,.63,.012,.009);a(G.box,tmat(T.sign('ТЦК 05','#c5c0a7','#242c27')),0,.66,2.552,.48,.11,.014);
  a(G.box,trim,0,1.47,1.58,1.98,.15,.34);a(G.box,col(0x72866b),0,1.56,1.58,.32,.04,.17);a(G.torus,trim,-.55,1.60,1.30,.16,.16,.025,.50);a(G.box,body,0,1.24,.52,2.08,1.02,.07);a(G.box,glass,0,1.98,.52,.76,.30,.028);
 }));
 const doors=[];for(const s of [-1,1]){const p=new THREE.Group();p.position.set(s*1.08,1.48,-2.39);g.add(p);p.add(compose('tck36-door-'+s,a=>{a(G.box,body,-s*.53,-.27,0,1.04,1.02,.10);a(G.box,body,-s*.53,.72,0,1.04,.12,.10);for(const x of [-.97,-.09])a(G.box,body,s*x,.29,0,.12,.75,.10);a(G.box,glass,-s*.53,.36,0,.78,.58,.024);a(G.box,trim,-s*.53,-.70,-.06,.92,.055,.02);a(G.box,metal,-s*.91,-.17,-.065,.06,.22,.06);for(const y of [-.55,.50])a(G.cyl8,metal,0,y,0,.05,.14,.05);}));doors.push({p,s});}
 const wheels=[];for(const s of [-1,1])for(const z of [-1.55,1.55]){const p=new THREE.Group();p.position.set(s*1.13,.48,z);g.add(p);mesh(G.cyl12,tmat(T.tread()),0,0,0,.41,.23,.41,p).rotation.z=Math.PI/2;mesh(G.cyl12,metal,s*.13,0,0,.23,.03,.23,p).rotation.z=Math.PI/2;mesh(G.cyl8,trim,s*.15,0,0,.08,.03,.08,p).rotation.z=Math.PI/2;wheels.push(p);}
 return{g,doors,wheels};
}
