import { random as gameRandom } from '../core/random.js';
import {THREE,V3} from '../core/gfx.js';
import {SHAKIR_SPOTS} from './shakir-diorama.js';
const surfaces=new WeakMap(),CELL=.12;
const isAnt=o=>{for(let n=o;n;n=n.parent)if(n.name==='shakir-ant')return true;return false;};
function indexSurface(market){
 market.updateWorldMatrix(true,true);const inverse=market.matrixWorld.clone().invert(),matrix=new THREE.Matrix4(),a=new V3(),b=new V3(),c=new V3(),grid=new Map();
 market.traverseVisible(mesh=>{if(!mesh.isMesh||isAnt(mesh))return;matrix.multiplyMatrices(inverse,mesh.matrixWorld);const geometry=mesh.geometry,p=geometry.attributes.position,index=geometry.index,count=index?.count||p.count;
  for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(matrix);b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(matrix);c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(matrix);const bx=b.x-a.x,bz=b.z-a.z,cx=c.x-a.x,cz=c.z-a.z,den=bx*cz-cx*bz;if(den>=-1e-10)continue;
   const t={x:a.x,y:a.y,z:a.z,bx,bz,cx,cz,by:b.y-a.y,cy:c.y-a.y,den};for(let x=Math.floor(Math.min(a.x,b.x,c.x)/CELL);x<=Math.floor(Math.max(a.x,b.x,c.x)/CELL);x++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/CELL);z<=Math.floor(Math.max(a.z,b.z,c.z)/CELL);z++){const key=x+'/'+z,list=grid.get(key)||[];list.push(t);grid.set(key,list);}
  }
 });surfaces.set(market,grid);return grid;
}
// Точная высота по верхним треугольникам, индексированным один раз. Без полного raycast каждый кадр.
export function marketSurface(market,x,z){
 const grid=surfaces.get(market)||indexSurface(market),list=grid.get(Math.floor(x/CELL)+'/'+Math.floor(z/CELL));let height=-Infinity;
 for(const t of list||[]){const dx=x-t.x,dz=z-t.z,u=(dx*t.cz-dz*t.cx)/t.den,v=(t.bx*dz-t.bz*dx)/t.den;if(u>=-1e-7&&v>=-1e-7&&u+v<=1.0000001)height=Math.max(height,t.y+u*t.by+v*t.cy);}return Number.isFinite(height)?height:null;
}
// Максимальная поверхность во всём прямоугольнике тела, включая тонкие детали между пробами.
function footprintHeight(market,x,z,r){const grid=surfaces.get(market)||indexSurface(market),seen=new Set();let height=-Infinity;
 for(let ix=Math.floor((x-r)/CELL);ix<=Math.floor((x+r)/CELL);ix++)for(let iz=Math.floor((z-r)/CELL);iz<=Math.floor((z+r)/CELL);iz++)for(const t of grid.get(ix+'/'+iz)||[]){if(seen.has(t))continue;seen.add(t);let poly=[[t.x,t.y,t.z],[t.x+t.bx,t.y+t.by,t.z+t.bz],[t.x+t.cx,t.y+t.cy,t.z+t.cz]];
  for(const[axis,bound,sign]of[[0,x-r,1],[0,x+r,-1],[2,z-r,1],[2,z+r,-1]]){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],insideA=(a[axis]-bound)*sign>=-1e-9,insideB=(b[axis]-bound)*sign>=-1e-9;if(insideA)out.push(a);if(insideA!==insideB){const k=(bound-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+(b[j]-v)*k));}}poly=out;if(!poly.length)break;}
  for(const p of poly)height=Math.max(height,p[1]);
 }return height;
}
export function chooseAntPlace(market,ant,random=gameRandom){
 ant.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(ant),radius=Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.z),Math.abs(box.max.z))+.004;const ray=new THREE.Raycaster(),points=[];
 // Чуть сдвинутые точки на крышах и дорожках дают разные места даже у той же диорамы.
 for(const p of SHAKIR_SPOTS)points.push({x:p[0]+(random()-.5)*.045,z:p[1]+(random()-.5)*.035});
 for(let i=0;i<100;i++)points.push({x:-1.06+random()*2.12,z:-.61+random()*1.22});
 points.push({x:0,z:.035});const valid=[];
 for(const p of points){const heights=[-radius,0,radius].flatMap(x=>[-radius,0,radius].map(z=>[x,z])).map(([x,z])=>marketSurface(market,p.x+x,p.z+z));if(heights.some(y=>y==null)||Math.max(...heights)-Math.min(...heights)>.018)continue;
  if(footprintHeight(market,p.x,p.z,radius)>Math.max(...heights)+.004)continue;
  p.y=Math.max(...heights)+.002;const target=market.localToWorld(new V3(p.x,p.y+.025,p.z)),eye=market.localToWorld(new V3(p.x,p.y+1.405,p.z+.30)),d=target.clone().sub(eye),distance=d.length();ray.set(eye,d.normalize());const hit=ray.intersectObject(market,true)[0];if(hit&&hit.distance<distance-.006)continue;valid.push(p);
 }
 if(!valid.length)throw new Error('У диорамы нет свободного места для Шакира');
 const p=valid[Math.floor(random()*valid.length)];ant.position.set(p.x,p.y,p.z);return{place:p,valid};
}
