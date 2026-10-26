import * as THREE from 'three';
/* Автоматическая инстансинг-склейка подвижных объектов (v0.51).
   Предметы, толкаемые объекты, птицы, коты, двери и прочее «живое» не запекается в статику, поэтому раньше
   каждая их деталь была отдельной отрисовкой (в школе и на рынке до 1800 вызовов на кадр).
   Перед каждым кадром одинаковые детали (общая геометрия + общий материал) в поле зрения собираются
   в один InstancedMesh: матрицы копируются из настоящих объектов, сами объекты на время кадра скрываются.
   Логика игры ничего об этом не знает — физика, анимации и подбор работают с обычными мешами. */
const pools = new Map(), hidden = [], groups = new Map();
const _f = new THREE.Frustum(), _pm = new THREE.Matrix4(), _s = new THREE.Sphere();
const baseBeforeRender = THREE.Object3D.prototype.onBeforeRender;
export const batchStats = { batched: 0, draws: 0 };
let frameNo = 0, enabled = true;
export function setBatching(on) { enabled = !!on; }

function eligible(o) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.baked || o.userData.noBatch) return false;
  const m = o.material, g = o.geometry;
  if (!m || Array.isArray(m) || m.visible === false) return false;
  if (o.layers.mask !== 1 || o.customDepthMaterial || o.onBeforeRender !== baseBeforeRender) return false;
  if (g.morphAttributes.position || g.drawRange.count !== Infinity) return false;
  return true;
}

export function batchBegin(scene, camera, all = false) {
  if (!enabled) return;
  frameNo++;
  scene.updateMatrixWorld(); camera.updateMatrixWorld();
  _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _f.setFromProjectionMatrix(_pm);
  for (const l of groups.values()) l.length = 0;
  scene.traverseVisible(o => {
    if (!eligible(o)) return;
    const g = o.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    _s.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); _s.radius += 0.5;
    // в кадре или рядом (отбрасывает тень в кадр) — в склейку; дальнее вне кадра отсекает сам рендер
    if (!all && o.frustumCulled && !_f.intersectsSphere(_s) && _s.center.distanceToSquared(camera.position) > 2500) return;
    const key = g.id + ':' + o.material.id + ':' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + ':' + o.renderOrder;
    let l = groups.get(key); if (!l) groups.set(key, l = []);
    l.push(o);
  });
  let batched = 0, draws = 0;
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const o0 = list[0];
    let p = pools.get(key);
    if (p && (p.im.geometry !== o0.geometry || p.cap < list.length)) { p.im.removeFromParent(); p.im.dispose(); pools.delete(key); p = null; }
    if (!p) {
      let cap = 4; while (cap < list.length) cap *= 2;
      const im = new THREE.InstancedMesh(o0.geometry, o0.material, cap);
      im.frustumCulled = false; im.userData.batchPool = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      p = { im, cap, used: 0 }; pools.set(key, p);
    }
    const im = p.im;
    if (im.parent !== scene) scene.add(im);
    im.material = o0.material; im.castShadow = o0.castShadow; im.receiveShadow = o0.receiveShadow; im.renderOrder = o0.renderOrder;
    for (let i = 0; i < list.length; i++) { im.setMatrixAt(i, list[i].matrixWorld); list[i].visible = false; hidden.push(list[i]); }
    im.count = list.length; im.instanceMatrix.needsUpdate = true; im.visible = true; p.used = frameNo;
    batched += list.length; draws++;
  }
  // неиспользуемые пулы прячем, долго неиспользуемые — освобождаем (геометрия могла уйти вместе с картой)
  for (const [key, p] of pools) if (p.used !== frameNo) {
    p.im.visible = false;
    if (frameNo - p.used > 240) { p.im.removeFromParent(); p.im.dispose(); pools.delete(key); groups.delete(key); }
  }
  batchStats.batched = batched; batchStats.draws = draws;
}
export function batchEnd() {
  for (const o of hidden) o.visible = true;
  hidden.length = 0;
  for (const p of pools.values()) p.im.visible = false;
}
