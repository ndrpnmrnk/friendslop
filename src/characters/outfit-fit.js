import {THREE,V3} from '../core/gfx.js';
const fitted=new WeakMap();
// Измерение центральной оболочки до анимации, один раз для нового рига.
// Хвосты/шляпы/накинутые аксессуары не расширяют талию.
export function coreSurface(part){
 part.updateWorldMatrix(true,true);const inverse=part.matrixWorld.clone().invert(),candidates=[];
 part.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;for(let p=o;p&&p!==part.parent;p=p.parent)if(p.userData.outfitSlot||!p.visible)return;const g=o.geometry;g.computeBoundingBox();const box=g.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)),s=box.getSize(new V3()),c=box.getCenter(new V3());if(s.y<.18||s.x<.1||Math.abs(c.x)>s.x*.55||Math.abs(c.z)>Math.max(.15,s.z*.7))return;candidates.push({o,box,score:s.x*s.y*s.z});});
 candidates.sort((a,b)=>b.score-a.score);if(!candidates.length)return null;const {o,box}=candidates[0],matrix=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),g=o.geometry,p=g.attributes.position,idx=g.index,vertices=[];
 for(let i=0;i<(idx?.count||p.count);i++)vertices.push(new V3().fromBufferAttribute(p,idx?idx.getX(i):i).applyMatrix4(matrix));return{box,vertices,key:g.uuid+matrix.elements.join(',')};
}
function edgesAt(surface,y){if(!surface||y<surface.box.min.y||y>surface.box.max.y)return[];const edges=[],v=surface.vertices;
 for(let i=0;i<v.length;i+=3){const hits=[];for(let j=0;j<3;j++){const a=v[i+j],b=v[i+(j+1)%3];if((a.y<=y&&b.y>y)||(b.y<=y&&a.y>y)){const t=(y-a.y)/(b.y-a.y);hits.push([a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t]);}}if(hits.length===2)edges.push(hits);}
 return edges;
}
function radial(edges,dx,dz){let outer=0;for(const [[ax,az],[bx,bz]]of edges){const sx=bx-ax,sz=bz-az,det=dx*sz-dz*sx;if(Math.abs(det)<1e-8)continue;const t=(ax*sz-az*sx)/det,u=(ax*dz-az*dx)/det;if(t>0&&u>=-.001&&u<=1.001)outer=Math.max(outer,t);}return outer;}
export function fitGarment(piece,fit,surface){if(!surface)return;const [,x,y,z,sx,sy,rawZ]=fit,sz=rawZ/.85,key=fit.join(',')+'|'+surface.key;
 for(const mesh of piece.children){if(!mesh.isMesh)continue;let by=fitted.get(mesh.geometry);if(!by)fitted.set(mesh.geometry,by=new Map());let geometry=by.get(key);if(!geometry){geometry=mesh.geometry.clone();const pos=geometry.attributes.position,rows=new Map();
  for(let i=0;i<pos.count;i++){const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);if(Math.abs(px)>.505||py<.02||py>.96)continue;const wy=y+py*sy,rowKey=Math.round(wy*10000);let edges=rows.get(rowKey);if(!edges)rows.set(rowKey,edges=edgesAt(surface,wy));const vx=x+px*sx,vz=z+pz*sz,r=Math.hypot(vx,vz);if(!edges.length||r<.02)continue;const target=radial(edges,vx/r,vz/r);if(!target)continue;
   // Припуск в сантиметрах, а не общий широкий цилиндр. Рукава и воротник сохраняют свой крой.
   const ratio=THREE.MathUtils.clamp((target+.018)/r,.78,1.42);pos.setX(i,((vx*ratio)-x)/sx);pos.setZ(i,((vz*ratio)-z)/sz);
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();by.set(key,geometry);
 }mesh.geometry=geometry;}
}
export function automaticFit(ch,surface,headSurface){const b=surface?.box,size=b?.getSize(new V3()),torso=surface&&surface!==headSurface,part=torso?'torso':'head',min=b?.min.y??.2,max=b?.max.y??ch.d.top,top=torso?Math.min(max,ch.d.handY+.42):min+(max-min)*.38,hem=Math.max(.17,min+.04),h=Math.max(.22,top-hem),width=THREE.MathUtils.clamp((size?.x??ch.d.handX*1.5)+.035,.3,1.45),depth=THREE.MathUtils.clamp((size?.z??width*.8)+.035,.28,1.2),hatY=headSurface?headSurface.box.max.y-.08:ch.d.top-.04,edges=edgesAt(headSurface,hatY),rx=radial(edges,1,0),rz=radial(edges,0,1);
 return{hat:[0,hatY,0,THREE.MathUtils.clamp(rx?rx/.38:width/.8,.35,1.6),.85,THREE.MathUtils.clamp(rz?rz/.35:depth/.74,.35,1.6)],top:[part,0,hem,0,width,h,depth],bottom:[part,0,Math.max(.03,hem-.24),0,width*.94,.30,depth*.92]};}
