import {THREE,G,col,tmat} from '../core/gfx.js';
import {T} from '../core/textures.js';
// Настоящий треугольный объём кровли; коллизия набрана по скату с небольшим шагом.
const ROOFS=new Map();
export function pitchedRoof(b,x,z,w,d,y,h,shed=false){const key=[w,d,h,shed].join('/');let geo=ROOFS.get(key);if(!geo){const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);if(shed)shape.lineTo(w/2,h);else{shape.lineTo(w*.0,h);shape.lineTo(-w/2,0);}shape.closePath();geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:1});geo.translate(0,0,-d/2);ROOFS.set(key,geo);}b.m(geo,tmat(T.roof()),x,y,z);
 const count=Math.ceil(w/.65),step=w/count;for(let i=0;i<count;i++){const px=-w/2+(i+.5)*step,height=h*(shed?(px+w/2)/w:1-Math.abs(px)/(w/2));b.solid(x+px,z,step,d,y,Math.max(.08,height));}
 for(const s of[-1,1])b.box(x,z+s*(d/2+.05),w+.18,.12,.12,tmat(T.metal()),{y:y-.05});
}
export function portico(b,x,z,w,depth,height=4.7){const stone=tmat(T.concrete()),metal=tmat(T.metal());
 for(const px of[-w/2+.55,-w/6,w/6,w/2-.55]){b.box(x+px,z,.75,.75,.22,stone);b.m(G.cyl12,stone,x+px,height/2+.22,z,.23,height,.23);b.box(x+px,z,.78,.78,.18,stone,{y:height+.18});b.solid(x+px,z,.52,.52,.22,height);}
 b.box(x,z-depth/2,w+.5,depth+.7,.28,stone,{y:height+.38});pitchedRoof(b,x,z-depth/2,w+.65,depth+.8,height+.66,1.1);
 // Портик опирается и на колонны, и на стену за ним; поперечный карниз.
 for(const s of[-1,1])b.box(x+s*w/2,z-depth/2,.15,depth,.20,metal,{y:height+.27});
}
export function wallPlaque(b,x,y,z,text,ry=0,w=2){b.sign(x,y,z,ry,text,'#526258','#ded4b1',w,.30);}
