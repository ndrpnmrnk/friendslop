import {THREE} from '../core/gfx.js';
const surface=(x,y)=>.48*Math.sqrt(Math.max(0,1-(x/.59)**2-((y-1.13)/.59)**2));
function geometry(pos,uv){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
// Настоящий проём в передней полусфере. Полость лежит внутри, а не поверх лица.
let headCache;
export function gryzliHead(){if(headCache)return headCache;const ys=[.54,.58,.65,.72,.78,.80,.84,.89,.94,.99,1.04,1.08,1.10,1.18,1.28,1.40,1.52,1.63,1.70,1.72],skin=[],uv=[],cavity=[],lip=[],hole=[];
 const tri=(dst,a,b,c,tex=false)=>{for(const p of[a,b,c]){dst.push(...p);if(tex)uv.push((p[0]/.59+1)/2,(p[1]-.54)/1.18);}},quad=(dst,a,b,c,d,tex=false)=>{tri(dst,a,b,c,tex);tri(dst,a,c,d,tex);};
 for(let row=0;row<ys.length-1;row++)for(const side of [-1,1]){const make=y=>{const r=.59*Math.sqrt(Math.max(0,1-((y-1.13)/.59)**2)),h=y>=.78&&y<=1.10?.315*Math.sqrt(Math.max(0,1-((y-.94)/.16)**2)):0;return{r,h};},a=make(ys[row]),b=make(ys[row+1]);for(let i=0;i<8;i++){const point=(y,v,k)=>{const x=side*(v.h+(v.r-v.h)*k);return[x,y,surface(x,y)];},p=point(ys[row],a,i/8),q=point(ys[row],a,(i+1)/8),r=point(ys[row+1],b,(i+1)/8),s=point(ys[row+1],b,i/8);if(side===1)quad(skin,p,q,r,s,true);else quad(skin,q,p,s,r,true);}}
 for(let row=0;row<ys.length-1;row++)for(let i=0;i<16;i++){const point=(y,n)=>{const r=Math.sqrt(Math.max(0,1-((y-1.13)/.59)**2)),a=Math.PI+n/16*Math.PI;return[Math.cos(a)*.59*r,y,Math.sin(a)*.48*r];};quad(skin,point(ys[row],i+1),point(ys[row],i),point(ys[row+1],i),point(ys[row+1],i+1),true);}
 const mouthY=ys.filter(y=>y>=.78&&y<=1.10);for(const y of mouthY){const x=.315*Math.sqrt(Math.max(0,1-((y-.94)/.16)**2));hole.push([x,y,surface(x,y)]);}for(const y of mouthY.slice(1,-1).reverse()){const x=-.315*Math.sqrt(Math.max(0,1-((y-.94)/.16)**2));hole.push([x,y,surface(x,y)]);}
 for(let i=0;i<hole.length;i++){const a=hole[i],b=hole[(i+1)%hole.length],inside=p=>[p[0]*.90,p[1],.28],rim=p=>[p[0]*1.025,.94+(p[1]-.94)*1.045,surface(p[0],p[1])+.001];quad(cavity,a,b,inside(b),inside(a));tri(cavity,[0,.94,.275],inside(a),inside(b));quad(lip,a,rim(a),rim(b),b);}
 const skinGeo=geometry(skin,uv),p=skinGeo.attributes.position,n=skinGeo.attributes.normal;
 // Общая нормаль эллипсоида с обеих сторон стыка. У дублированных вершин
 // computeVertexNormals давал разный свет и заметную горизонтальную/боковую линию.
 for(let i=0;i<p.count;i++){const nx=p.getX(i)/(.59*.59),ny=(p.getY(i)-1.13)/(.59*.59),nz=p.getZ(i)/(.48*.48),len=Math.hypot(nx,ny,nz)||1;n.setXYZ(i,nx/len,ny/len,nz/len);}n.needsUpdate=true;
 headCache={skin:skinGeo,cavity:geometry(cavity),lip:geometry(lip)};return headCache;
}
export function gryzliTongue(){const pos=[],uv=[],indices=[],rings=8,sides=8;for(let i=0;i<rings;i++){const t=i/(rings-1),w=(.10+.037*Math.sin(t*Math.PI))*(i===rings-1?.65:1);for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;pos.push(Math.cos(a)*w,-.18*t*t+Math.sin(a)*.025,.29*t);uv.push(j/sides,t);}}for(let i=0;i<rings-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=b+sides,d=a+sides;indices.push(a,b,c,a,c,d);}for(const end of[0,rings-1])for(let j=1;j<sides-1;j++)indices.push(end*sides,end*sides+j,end*sides+j+1);const g=geometry(pos,uv);g.setIndex(indices);g.computeVertexNormals();g.userData.base=new Float32Array(pos);return g;}
export function flexTongue(g,bend,side,t,speed){const p=g.attributes.position,b=g.userData.base;for(let i=0;i<p.count;i++){const k=Math.floor(i/8)/7,w=k*k;p.setXYZ(i,b[i*3]+side*w,b[i*3+1]+bend*w+Math.sin(t*10-k*3)*speed*.008*w,b[i*3+2]+bend*.18*w);}p.needsUpdate=true;g.computeVertexNormals();}
