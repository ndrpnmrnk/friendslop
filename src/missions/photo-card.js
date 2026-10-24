import {THREE,G,V3,mesh,renderer,SNAP} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';

// Один маленький снимок настоящей модели, без readPixels и повторного рендера каждый кадр.
export function renderPhoto(scene,camera,target){
 if(renderer.getContext?.().isContextLost())return false;
 const snap=SNAP.value.clone(),previous=renderer.getRenderTarget(),viewport=renderer.getViewport?.(new THREE.Vector4()),scissor=renderer.getScissor?.(new THREE.Vector4()),test=renderer.getScissorTest?.(),auto=renderer.autoClear,shadow=renderer.shadowMap.autoUpdate;
 try{SNAP.value.set(target.width,target.height);renderer.shadowMap.autoUpdate=false;renderer.autoClear=true;renderer.setRenderTarget(target);renderer.setScissorTest?.(false);renderer.render(scene,camera);return true;}
 finally{SNAP.value.copy(snap);renderer.setRenderTarget(previous);if(viewport)renderer.setViewport(viewport);if(scissor)renderer.setScissor(scissor);if(test!=null)renderer.setScissorTest(test);renderer.autoClear=auto;renderer.shadowMap.autoUpdate=shadow;}
}
export function photoCard(model,{title='ОБРАЗЕЦ',width=96,height=120,background=0x63556d,view=[.3,.25,1]}={}){
 const scene=new THREE.Scene();scene.background=new THREE.Color(background);scene.add(new THREE.HemisphereLight(0xf1e5c9,0x3d3046,2.4));const key=new THREE.DirectionalLight(0xffe4bd,2.0);key.position.set(-2,4,4);scene.add(key);scene.add(model);
 model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new V3()),size=box.getSize(new V3()),aspect=width/height,extent=Math.max(size.y,size.x/aspect)*.61;
 const camera=new THREE.OrthographicCamera(-extent*aspect,extent*aspect,extent,-extent,.01,20);camera.position.copy(center).add(new V3(...view).normalize().multiplyScalar(Math.max(2,size.length()*2)));camera.lookAt(center);camera.updateMatrixWorld(true);
 const target=new THREE.WebGLRenderTarget(width,height,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});target.texture.generateMipmaps=false;
 const root=new THREE.Group();root.name='mission-photo';W.group.add(root);const mats=[];
 const overlay=color=>{const m=new THREE.MeshBasicMaterial({color,fog:false,depthTest:false,depthWrite:false});mats.push(m);return m;};
 mesh(G.box,overlay(0x39303c),0,0,-.013,.70,.96,.018,root);mesh(G.box,overlay(0xd8c9a7),0,0,0,.68,.94,.012,root);
 const material=new THREE.MeshBasicMaterial({map:target.texture,fog:false,depthTest:false,depthWrite:false});mats.push(material);mesh(G.plane,material,0,.055,.009,.60,.75,1,root);
 const labelMat=new THREE.MeshBasicMaterial({map:T.sign(title,'#d8c9a7','#493f4c'),fog:false,depthTest:false,depthWrite:false});mats.push(labelMat);mesh(G.plane,labelMat,0,-.385,.01,.60,.095,1,root);
 const off=overlay(0x85786b),on=overlay(0xa6c780);
 const checks=Array.from({length:4},(_,i)=>mesh(G.box,off,-.21+i*.14,-.283,.015,.10,.025,.008,root));let ready=false,age=0,disposed=false;root.children.forEach((m,i)=>{m.renderOrder=1000+i;m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;});
 return{root,target,scene,camera,model,checks,
  update(viewCamera,dt,{intro=2.4,checked=null,hidden=false}={}){if(disposed)return;age+=dt;if(!ready)ready=renderPhoto(scene,camera,target);root.visible=!hidden;if(!root.visible||!viewCamera)return;viewCamera.updateMatrixWorld(true);const k=THREE.MathUtils.smoothstep(age,intro,intro+.7),depth=2.0,half=Math.tan(viewCamera.fov*Math.PI/360)*depth,aspect=viewCamera.aspect||1;
   // Фото сначала перед глазами, затем уходит в угол и не закрывает центр взаимодействия.
   const scale=half*THREE.MathUtils.lerp(.95,.43,k);root.scale.setScalar(scale);root.position.copy(viewCamera.localToWorld(new V3(THREE.MathUtils.lerp(0,-half*aspect+scale*.40+.08,k),THREE.MathUtils.lerp(0,half-scale*.50-.08,k),-depth)));root.quaternion.copy(viewCamera.quaternion);root.rotateZ(THREE.MathUtils.lerp(-.03,.025,k));if(checked)checks.forEach((m,i)=>m.material=checked[i]?on:off);else checks.forEach(m=>m.visible=false);},
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();model.removeFromParent();target.dispose();mats.forEach(m=>m.dispose());}
 };
}
