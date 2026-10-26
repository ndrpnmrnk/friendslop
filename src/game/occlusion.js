import { V3 } from '../core/gfx.js';
/* Камера мини-игры (v0.19): объект, который загораживает цель, целиком и плавно растворяется пиксельной сеткой
   (дизеринг Bayer 4×4) — только на экране, в мире он остаётся. Никаких сферических вырезов.
   У склеенных (bake) мешей у каждой вершины записан «паспорт» своего объекта: центр, радиус и полувысота
   (атрибуты aObj/aObjH, см. bake.js), поэтому решение «прятать или нет» принимается для объекта целиком.
   Пол, земля и всё, что ниже цели, огромные куски и сама цель не прячутся. */
const installed = new WeakSet();
const U = { cut: { value: 0 }, fade: { value: 0 }, cam: { value: new V3() }, tgt: { value: new V3() } };
let t0 = 0;
export function installOcclusion(group) {
  group.traverse(o => {
    if(!o.isMesh||o.userData.noOcc)return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || installed.has(m)) continue;
      installed.add(m);
      const before = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m), oldKey = key();
      m.onBeforeCompile = shader => {
        before.call(m, shader);
        shader.uniforms.uOccCut = U.cut; shader.uniforms.uOccFade = U.fade; shader.uniforms.uOccCam = U.cam; shader.uniforms.uOccTgt = U.tgt;
        shader.vertexShader = `attribute vec4 aObj; attribute float aObjH; uniform float uOccCut; uniform vec3 uOccCam; uniform vec3 uOccTgt; varying float vOccHide;\n` +
          shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          vOccHide = 0.0;
          if (uOccCut > 0.5) {
            bool baked = aObj.w > 50.0;
            vec4 O0 = vec4(0.0, 0.0, 0.0, 1.0);
            #ifdef USE_INSTANCING
            O0 = instanceMatrix * O0;
            #endif
            vec3 O = baked ? aObj.xyz : (modelMatrix * O0).xyz;
            float r = baked ? aObj.w - 100.0 : 0.7, h = baked ? aObjH : 0.8;
            vec3 d = uOccTgt - uOccCam; float len = max(0.01, length(d)); vec3 dir = d / len;
            float along = dot(O - uOccCam, dir); float perp = length((O - uOccCam) - dir * along);
            float rad = mix(0.35, 1.3, clamp(along / len, 0.0, 1.0)) + r * 0.6;
            if (r < 14.0 && along > -r && along + r * 0.5 < len - 0.6 && perp < rad && O.y + h > uOccTgt.y - 0.3) vOccHide = 1.0;
          }`);
        shader.fragmentShader = 'varying float vOccHide; uniform float uOccFade;\n' + shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (vOccHide > 0.5) { vec2 qa = floor(gl_FragCoord.xy), qb = floor(qa * 0.5);
            float bay = fract(dot(qb, vec2(0.5, qb.y * 0.75))) * 0.25 + fract(dot(qa, vec2(0.5, qa.y * 0.75)));
            if (bay < uOccFade) discard; }`);
      };
      m.customProgramCacheKey = () => oldKey + '-occ-v19'; m.needsUpdate = true;
    }
  });
}
// point — цель мини-игры (мир); null — выключить
export function updateOcclusion(camera, point) {
  if (!point) { U.cut.value = 0; U.fade.value = 0; t0 = 0; return; }
  if (!t0) t0 = performance.now();
  U.cut.value = 1; U.fade.value = Math.min(1.01, (performance.now() - t0) / 450);
  camera.updateMatrixWorld(); U.cam.value.setFromMatrixPosition(camera.matrixWorld); U.tgt.value.copy(point);
}
