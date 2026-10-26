import {THREE,V3} from '../core/gfx.js';
// Один и тот же луч используется при показе прицела и при нажатии кнопки.
// Скрытые оригинальные меши совпадают с инстансами: проверяем их треугольники.
const ray=new THREE.Raycaster(),point=new V3(),min=new V3(),max=new V3(),down=new V3(),origin=new V3(),inverse=new THREE.Matrix4();
export function clawTarget(root,dolls,x,z){
 root.updateWorldMatrix(true,true);origin.set(x,3.05,z).applyMatrix4(root.matrixWorld);down.set(0,-1,0).transformDirection(root.matrixWorld);ray.set(origin,down);ray.near=0;ray.far=4*root.getWorldScale(point).y;let best=null;
 for(const d of dolls){if(d.held||d.g.scale.x<.01)continue;min.set(Infinity,Infinity,Infinity);max.set(-Infinity,-Infinity,-Infinity);for(const v of d.support){point.copy(v).applyQuaternion(d.g.quaternion).add(d.g.position);min.min(point);max.max(point);}min.addScalar(-.05);max.addScalar(.05);if(x<min.x||x>max.x||z<min.z||z>max.z)continue;
  const hit=ray.intersectObject(d.g,true)[0];if(hit&&(!best||hit.distance<best.distance))best={toy:d,point:hit.point.clone(),distance:hit.distance};
 }
 if(best){inverse.copy(root.matrixWorld).invert();best.point.applyMatrix4(inverse);}return best;
}
export function toyHighlight(root){
 const material=new THREE.MeshBasicMaterial({color:0xffdf8e,side:THREE.BackSide,depthWrite:false,fog:false});material.onBeforeCompile=s=>s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normal*.035;');material.customProgramCacheKey=()=> 'claw-target50';let source=null,outline=null;
 return{update(toy){if(toy!==source){outline?.removeFromParent();outline=null;source=toy;if(toy){outline=toy.g.clone(true);outline.traverse(o=>{if(o.isMesh){o.visible=true;o.material=material;o.raycast=()=>{};}});root.add(outline);}}if(outline){outline.position.copy(toy.g.position);outline.quaternion.copy(toy.g.quaternion);outline.scale.copy(toy.g.scale);}},clear(){this.update(null);}};
}
