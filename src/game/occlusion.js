import { V3 } from '../core/gfx.js';
// Локальное отверстие в заслоняющей геометрии, включая склеенные меши.
// Материалы и целые кварталы не скрываются; общий uniform возвращает вид сразу после игры.
const installed = new WeakSet();
const enabled = { value: 0 }, target = { value: new V3() };
export function installOcclusion(group) {
  group.traverse(o => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || installed.has(m)) continue;
      installed.add(m);
      const before = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m), oldKey = key();
      m.onBeforeCompile = shader => {
        before.call(m, shader); shader.uniforms.uMissionCut = enabled; shader.uniforms.uMissionTarget = target;
        shader.vertexShader = 'varying vec3 vMissionView;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvMissionView = mvPosition.xyz;');
        shader.fragmentShader = 'varying vec3 vMissionView; uniform float uMissionCut; uniform vec3 uMissionTarget;\n' + shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (uMissionCut > 0.5) {
            float len = length(uMissionTarget); vec3 dir = uMissionTarget / max(0.01, len);
            float along = dot(vMissionView, dir);
            float radius = mix(0.45, 1.65, clamp(along / max(0.01, len), 0.0, 1.0));
            if (along > 0.0 && along < len - 0.45 && length(vMissionView - dir * along) < radius) discard;
          }`);
      };
      m.customProgramCacheKey = () => oldKey + '-mission-cut-v17'; m.needsUpdate = true;
    }
  });
}
export function updateOcclusion(camera, point) { enabled.value = point ? 1 : 0; if (point) { camera.updateMatrixWorld(); target.value.copy(point).applyMatrix4(camera.matrixWorldInverse); } }
