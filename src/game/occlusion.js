import { V3 } from '../core/gfx.js';
/* Только статическое окружение с паспортом bake. Рабочий реквизит, руки,
   инструменты и персонажи не участвуют даже при общем материале с окружением.
   Проверка по фрагментам: центр длинной трубы не обязан попадать в луч камеры. */
const installed = new WeakSet();
const U = { cut: { value: 0 }, fade: { value: 0 }, cam: { value: new V3() }, tgt: { value: new V3() } };
let t0=0;
export function installOcclusion(group){
 group.traverse(o=>{
  if(!o.isMesh||o.userData.noOcc)return;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(!m||installed.has(m))continue;installed.add(m);
   const before=m.onBeforeCompile,oldKey=m.customProgramCacheKey();
   m.onBeforeCompile=shader=>{
    before.call(m,shader);
    Object.assign(shader.uniforms,{uOccCut:U.cut,uOccFade:U.fade,uOccCam:U.cam,uOccTgt:U.tgt});
    shader.vertexShader='attribute vec4 aObj; varying vec3 vOccWorld; varying float vOccStatic;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
     vec4 occPosition=vec4(transformed,1.0);
     #ifdef USE_INSTANCING
     occPosition=instanceMatrix*occPosition;
     #endif
     vOccWorld=(modelMatrix*occPosition).xyz;vOccStatic=step(50.0,aObj.w);
    `);
    shader.fragmentShader='varying vec3 vOccWorld; varying float vOccStatic; uniform float uOccCut; uniform float uOccFade; uniform vec3 uOccCam; uniform vec3 uOccTgt;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
     if(uOccCut>0.5&&vOccStatic>0.5){
      vec3 delta=uOccTgt-uOccCam;float len=max(.01,length(delta));vec3 dir=delta/len;
      float along=dot(vOccWorld-uOccCam,dir);float perpendicular=length(vOccWorld-uOccCam-dir*along);
      float radius=mix(.15,1.7,clamp(along/len,0.0,1.0));
      if(along>.02&&along<len-.15&&perpendicular<radius&&vOccWorld.y>uOccTgt.y-.7){
       vec2 qa=floor(gl_FragCoord.xy),qb=floor(qa*.5);
       float bayer=fract(dot(qb,vec2(.5,qb.y*.75)))*.25+fract(dot(qa,vec2(.5,qa.y*.75)));
       if(bayer<uOccFade)discard;
      }
     }
    `);
   };
   m.customProgramCacheKey=()=>oldKey+'-occ-static-fragment0631';m.needsUpdate=true;
  }
 });
}
export function updateOcclusion(camera,point){
 if(!point){U.cut.value=U.fade.value=0;t0=0;return;}
 if(!t0)t0=performance.now();U.cut.value=1;U.fade.value=Math.min(1.01,(performance.now()-t0)/450);
 camera.updateMatrixWorld();U.cam.value.setFromMatrixPosition(camera.matrixWorld);U.tgt.value.copy(point);
}
