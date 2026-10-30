import {THREE,G,V3,mesh,col,tmat,compose,lam,glow,frontBack} from '../core/gfx.js';
import {T,pix,photo} from '../core/textures.js';
// v0.52: котята-пассажиры по референсам автора — огромная круглая голова с «фото»-мордочкой (полоски табби,
// большие влажные глаза с бликами, розовый нос, белая мордочка), маленькое пушистое тельце,
// большие белые наушники и у каждого своё украшение (бантик, ромашка). Окрасы разные.
const KCOATS=[
 {id:'tabby',base:'#b08a62',dark:'#5e4630',light:'#e8d6b8',eye:'#5b6f7c',acc:'bow'},
 {id:'grey',base:'#9a958e',dark:'#4f4a46',light:'#ebe6dc',eye:'#7a6a3c',acc:'daisy'},
 {id:'ginger',base:'#d18a4a',dark:'#8e4e22',light:'#f3dcc0',eye:'#8a7a32',acc:'bow'},
 {id:'calico',base:'#efe6d6',dark:'#3a2e28',light:'#fbf6ee',eye:'#4f6a78',acc:'daisy',patch:'#d0874a'},
 {id:'smoke',base:'#6b6670',dark:'#2f2b33',light:'#c8c2c8',eye:'#a08a3a',acc:'bow'},
 {id:'cream',base:'#e2c9a2',dark:'#a8865c',light:'#fbf1e2',eye:'#5d7c8c',acc:'daisy'},
];
function kFur(c){return photo('kitten52-fur-'+c.id,48,48,(g,w,h)=>{g.fillStyle=c.base;g.fillRect(0,0,w,h);
 for(let i=0;i<900;i++){const x=(i*37%997)/997*w,y=(i*71%991)/991*h;g.strokeStyle=i%3?c.dark+'55':c.light+'66';g.lineWidth=w/150;g.beginPath();g.moveTo(x,y);g.lineTo(x+w*.01,y+h*.035);g.stroke();}
 if(c.id!=='calico')for(let k=0;k<6;k++){g.fillStyle=c.dark+'88';g.beginPath();g.ellipse(w*(k/6+.08),h*.5,w*.035,h*.48,0,0,7);g.fill();}
 if(c.patch){g.fillStyle=c.patch;g.beginPath();g.ellipse(w*.3,h*.35,w*.22,h*.18,.4,0,7);g.fill();g.fillStyle=c.dark;g.beginPath();g.ellipse(w*.75,h*.7,w*.18,h*.14,-.3,0,7);g.fill();}});}
function kFace(c){return photo('kitten52-face-'+c.id,96,96,(g,w,h)=>{
 // основа: мех с мягким градиентом, тёмные полоски «М» на лбу, светлые щёки и мордочка
 const bg=g.createRadialGradient(w*.5,h*.62,w*.05,w*.5,h*.5,w*.6);bg.addColorStop(0,c.light);bg.addColorStop(.45,c.base);bg.addColorStop(1,c.dark);g.fillStyle=bg;g.fillRect(0,0,w,h);
 for(let i=0;i<1600;i++){const x=(i*37%997)/997*w,y=(i*71%991)/991*h;g.strokeStyle=i%3?'rgba(40,28,20,.18)':'rgba(255,250,240,.22)';g.lineWidth=w/220;g.beginPath();g.moveTo(x,y);g.lineTo(x+(x-w/2)*.03,y+h*.025);g.stroke();}
 if(c.patch){g.fillStyle=c.patch+'cc';g.beginPath();g.ellipse(w*.24,h*.3,w*.2,h*.2,.3,0,7);g.fill();g.fillStyle=c.dark+'cc';g.beginPath();g.ellipse(w*.78,h*.26,w*.16,h*.17,-.3,0,7);g.fill();}
 g.strokeStyle=c.dark+'bb';g.lineWidth=w*.022;g.lineCap='round';
 for(const [x0,y0,x1,y1] of [[.5,.12,.5,.3],[.42,.14,.45,.3],[.58,.14,.55,.3],[.34,.18,.4,.32],[.66,.18,.6,.32]]){g.beginPath();g.moveTo(w*x0,h*y0);g.lineTo(w*x1,h*y1);g.stroke();}
 for(const s of[-1,1]){for(let k=0;k<3;k++){g.beginPath();g.moveTo(w*(.5+s*.47),h*(.42+k*.07));g.quadraticCurveTo(w*(.5+s*.4),h*(.44+k*.07),w*(.5+s*.33),h*(.47+k*.06));g.stroke();}}
 const mz=g.createRadialGradient(w*.5,h*.72,w*.02,w*.5,h*.72,w*.2);mz.addColorStop(0,'#fffaf2');mz.addColorStop(1,c.light+'00');g.fillStyle=mz;g.beginPath();g.ellipse(w*.5,h*.72,w*.22,h*.16,0,0,7);g.fill();
 // глаза: большие, тёмная обводка, радужка с градиентом, крупный зрачок, два блика
 for(const s of[-1,1]){const ex=w*(.5+s*.2),ey=h*.5,rx=w*.13,ry=h*.12;
  g.fillStyle='#1c1410';g.beginPath();g.ellipse(ex,ey,rx*1.12,ry*1.12,s*.12,0,7);g.fill();
  const ir=g.createRadialGradient(ex,ey+ry*.2,rx*.1,ex,ey,rx);ir.addColorStop(0,'#e8e0b0');ir.addColorStop(.35,c.eye);ir.addColorStop(1,'#20262a');g.fillStyle=ir;g.beginPath();g.ellipse(ex,ey,rx,ry,s*.12,0,7);g.fill();
  g.fillStyle='#0b0908';g.beginPath();g.ellipse(ex,ey+ry*.05,rx*.62,ry*.78,0,0,7);g.fill();
  g.fillStyle='#ffffff';g.beginPath();g.ellipse(ex-rx*.32,ey-ry*.38,rx*.26,ry*.24,0,0,7);g.fill();g.beginPath();g.arc(ex+rx*.3,ey+ry*.3,rx*.11,0,7);g.fill();}
 // нос, рот, усы
 g.fillStyle='#e7909a';g.beginPath();g.moveTo(w*.45,h*.665);g.lineTo(w*.55,h*.665);g.lineTo(w*.5,h*.725);g.closePath();g.fill();
 g.strokeStyle='#5a3a34';g.lineWidth=w*.012;g.beginPath();g.moveTo(w*.5,h*.725);g.lineTo(w*.5,h*.77);g.quadraticCurveTo(w*.45,h*.8,w*.42,h*.77);g.moveTo(w*.5,h*.77);g.quadraticCurveTo(w*.55,h*.8,w*.58,h*.77);g.stroke();
 g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=w*.006;for(const s of[-1,1])for(let k=0;k<3;k++){g.beginPath();g.moveTo(w*(.5+s*.12),h*(.74+k*.02));g.lineTo(w*(.5+s*.42),h*(.7+k*.05));g.stroke();}
 g.fillStyle='rgba(240,140,150,.25)';for(const s of[-1,1]){g.beginPath();g.ellipse(w*(.5+s*.27),h*.66,w*.07,h*.04,0,0,7);g.fill();}
},5);}
let KHEAD=null;
export function busKitten(i=0){
 const c=KCOATS[i%KCOATS.length],g=new THREE.Group();
 if(!KHEAD)KHEAD=frontBack(new THREE.SphereGeometry(1,14,10),.05);
 g.add(compose('kitten52-'+c.id,a=>{const fur=lam({map:kFur(c)},'kitten52-furm-'+c.id),light=col(parseInt(c.light.slice(1),16)),white=lam({color:0xf3f1ec,emissive:0x2a2826,emissiveIntensity:.25},'kitten52-phones'),cushion=col(0xdedad2),ear=col(0xe3a2a6);
  // тельце: сидящий пушистый комочек с белой грудкой, передние лапки, хвост обвивает лапы
  a(G.sph10,fur,0,.3,-.02,.2,.24,.19);a(G.sph10,light,0,.33,.12,.12,.16,.06);for(const s of[-1,1]){a(G.sph10,fur,s*.13,.16,-.04,.12,.13,.15);a(G.sph10,light,s*.07,.07,.15,.06,.06,.08);}
  const tail=new THREE.CatmullRomCurve3([new V3(-.12,.08,-.18),new V3(.12,.06,-.2),new V3(.22,.06,0),new V3(.14,.06,.16)]);a(new THREE.TubeGeometry(tail,8,.04,5,false),fur,0,0,0,1,1,1);
  // уши
  for(const s of[-1,1]){a(G.cone4,fur,s*.2,.98,0,.11,.2,.1,0,Math.PI/4,-s*.25);a(G.cone4,ear,s*.2,.97,.045,.06,.13,.03,0,Math.PI/4,-s*.25);}
  // наушники: толстая дуга, большие чашки с мягкими амбушюрами
  const band=new THREE.CatmullRomCurve3([new V3(-.34,.72,0),new V3(-.3,.96,-.02),new V3(0,1.1,-.04),new V3(.3,.96,-.02),new V3(.34,.72,0)]);a(new THREE.TubeGeometry(band,12,.04,6,false),white,0,0,0,1,1,1);
  for(const s of[-1,1]){a(G.cyl12,white,s*.33,.7,0,.15,.08,.16,0,0,Math.PI/2);a(G.cyl12,cushion,s*.285,.7,0,.14,.04,.15,0,0,Math.PI/2);a(G.cyl12,col(0xcfcac2),s*.375,.7,0,.09,.012,.1,0,0,Math.PI/2);}
  if(c.acc==='bow'){const p=col(0xf06aa6);for(const s of[-1,1])a(G.sph10,p,.12+s*.08,.98,.12,.085,.06,.04,0,0,s*-.3);a(G.sph10,col(0xe0508e),.12,.98,.14,.03,.035,.03);}
  else{const pet=col(0xfbfaf4),ctr=col(0xf5c43a);for(let k=0;k<10;k++){const an=k/10*6.283;a(G.sph10,pet,.14+Math.cos(an)*.07,.96+Math.sin(an)*.07,.17,.05,.022,.012,0,0,an);}a(G.sph10,ctr,.14,.96,.185,.035,.035,.02);}
 }));
 const head=new THREE.Mesh(KHEAD,[lam({map:kFace(c)},'kitten52-facem-'+c.id),lam({map:kFur(c)},'kitten52-furm-'+c.id)]);head.position.set(0,.7,.02);head.scale.set(.29,.26,.25);g.add(head);
 const feet=[];for(const s of[-1,1]){const foot=new THREE.Group();foot.position.set(s*.11,.11,.05);g.add(foot);mesh(G.sph10,lam({map:kFur(c)},'kitten52-furm-'+c.id),0,-.015,.05,.07,.06,.1,foot);feet.push(foot);}
 g.userData.feet=feet;g.userData.head=head;return g;
}
export function busModel(){
 const g=new THREE.Group(),red=tmat(T.paintMetal(0x9f3039)),black=col(0x25262d),trim=tmat(T.metal()),glass=lam({color:0x526876,transparent:true,opacity:.20,depthWrite:false},'bus43-glass'),wheels=[],doors=[];
 g.add(compose('bus43-body',a=>{a(G.box,black,0,.42,0,2.35,.28,7.6);a(G.box,red,-1.13,.85,0,.09,.78,7.6);a(G.box,red,1.13,.85,-1.07,.09,.78,5.46);a(G.box,red,0,.85,-3.75,2.35,.78,.10);a(G.box,trim,1.28,.40,2.65,.34,.10,1.88);a(G.box,black,0,2.85,0,2.35,.22,7.6);a(G.box,black,0,3.02,0,2.42,.14,7.7);a(G.box,black,0,2.03,-3.77,2.35,1.65,.10);a(G.box,red,0,.92,3.8,2.35,.84,.16);a(G.box,black,0,1.4,3.87,2.27,.19,.05);a(G.box,black,0,2.74,3.8,2.35,.17,.1);a(G.box,tmat(T.sign('63','#161d22','#e6bf78')),0,2.76,3.87,1.22,.29,.025);a(G.box,tmat(T.sign('63','#161d22','#e6bf78')),0,2.61,-3.84,.85,.3,.025);a(G.box,trim,0,.45,3.89,2.38,.12,.12);
  for(const s of[-1,1]){for(const z of[-3.68,-2.55,-1.1,.3,1.6,3.65])a(G.box,black,s*1.15,2.03,z,.10,1.5,.09);for(const z of[-2.9,-1.6,-.2,1.2,2.7])if(s<0||z<1.5)a(G.box,glass,s*1.17,2.05,z,.025,1.28,1.16);a(G.box,red,s*1.18,1.35,s<0?-.15:-1.08,.05,.16,s<0?7.1:5.25);for(let i=0;i<(s<0?32:22);i++)for(let row=0;row<2;row++)a(G.box,col((i+row)%2?0xd9d2bf:0xb84043),s*1.211,1.15+row*.13,-3.5+i*.22,.014,.12,.21);a(G.box,black,s*1.20,.35,-.1,.07,.13,7.4);a(G.box,black,s*1.31,2.35,3.15,.11,.28,.20);a(G.box,black,s*1.22,2.48,3.10,.16,.035,.04);a(G.box,glow(0xe7d6ad),s*.86,.93,3.9,.38,.19,.035);a(G.box,col(0x8f3035),s*.95,.92,-3.84,.15,.3,.035);}
  a(G.box,trim,0,1.12,3.895,2.15,.29,.04);for(const side of[-1,1]){a(G.box,black,side*.82,1.12,3.925,.48,.21,.025);for(const x of[-.10,.10])a(G.cyl8,glow(0xc5c7bc),side*.82+x,1.12,3.95,.065,.02,.065,Math.PI/2);}a(G.box,trim,0,1.10,3.94,.38,.05,.025);a(G.box,black,0,.53,-3.85,2.28,.16,.16);a(G.box,glass,0,2.04,-3.835,2.07,.93,.025);a(G.box,red,0,1.27,-3.84,2.25,.18,.04);a(G.box,tmat(T.sign('63','#161d22','#e6bf78')),0,.88,-3.85,.42,.15,.02);for(let i=0;i<5;i++)a(G.box,black,.42+i*.12,.85,-3.85,.045,.26,.025);
  a(G.box,glass,0,2.07,3.815,2.12,1.15,.035);a(G.box,trim,0,.53,0,2.15,.10,7.3);a(G.box,black,-.65,.88,2.65,.6,.5,.6);a(G.torus,black,-.65,1.45,2.95,.24,.24,.04,-.55);for(const z of[-2.5,-1.2,.1,1.3])for(const x of[-.72,.72]){a(G.box,col(0x575b69),x,.82,z,.62,.15,.62);a(G.box,col(0x575b69),x,1.2,z-.26,.62,.68,.10);a(G.cyl6,trim,x,.61,z,.035,.48,.035);}a(G.cyl6,col(0xc9b36f),.82,1.7,2.25,.025,2.4,.025);
 }));
 for(const z of[-2.45,2.45])for(const s of[-1,1]){const w=new THREE.Group();w.position.set(s*1.14,.49,z);g.add(w);mesh(G.cyl12,col(0x1b1b22),0,0,0,.46,.23,.46,w).rotation.z=Math.PI/2;mesh(G.cyl8,trim,s*.13,0,0,.24,.035,.24,w).rotation.z=Math.PI/2;wheels.push(w);}
 for(const [z,sign] of[[1.63,1],[3.65,-1]]){const p=new THREE.Group(),leaf=new THREE.Group();p.position.set(1.18,1.76,z);p.userData.openSign=-sign;leaf.position.z=sign*.49;p.add(leaf);g.add(p);leaf.add(compose('bus43-door-open',a=>{for(const dz of[-.46,.46])a(G.box,black,0,0,dz,.07,2.15,.06);for(const y of[-1.04,.08,1.04])a(G.box,black,0,y,0,.07,.06,.98);a(G.box,red,0,-.56,0,.07,.92,.86);a(G.box,glass,0,.54,0,.025,.93,.86);a(G.box,col(0xd3b25b),.06,0,-.34,.035,.55,.035);}));doors.push(p);}
 return{g,wheels,doors};
}
