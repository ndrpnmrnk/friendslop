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
export const batchStats = { batched: 0, draws: 0, ms: 0, candidates: 0 };
let frameNo = 0, enabled = true, lastGroup = -99;
const visibleChain = (o, scene) => { for (let q = o.parent; q; q = q.parent) { if (!q.visible) return false; if (q === scene) return true; } return false; };
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
  if (!enabled) return false;
  const t0 = performance.now();
  frameNo++;
  scene.updateMatrixWorld(); camera.updateMatrixWorld();const t1=performance.now();
  _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _f.setFromProjectionMatrix(_pm);
  // v0.67.2: полная перегруппировка (обход сцены, рамки, отсечение) - раз в 3 кадра; между ними те же группы,
  // только позиции. Новый объект в кадре до перегруппировки рисуется сам по себе - картинка не теряется.
  const regroup = all || frameNo - lastGroup >= 3 || groups.size === 0;
  if (regroup) {
    lastGroup = frameNo;
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
  }
  const t2=performance.now();let batched = 0, draws = 0;
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
    const im = p.im, arr = im.instanceMatrix.array;
    if (im.parent !== scene) scene.add(im);
    im.material = o0.material; im.castShadow = o0.castShadow; im.receiveShadow = o0.receiveShadow; im.renderOrder = o0.renderOrder;
    // Между перегруппировками объект мог исчезнуть (подобран, спрятан, ушёл в дальний слой) - его пропускаем.
    let n = 0, changed = im.count !== 0 && regroup;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (!regroup && (!o.visible || !o.parent || o.layers.mask !== 1 || !visibleChain(o, scene))) continue;
      const e = o.matrixWorld.elements, at = n * 16;
      // на видеокарту уходит только то, что сдвинулось
      for (let k = 0; k < 16; k++) if (arr[at + k] !== Math.fround(e[k])) { changed = true; for (let q = 0; q < 16; q++) arr[at + q] = e[q]; break; }
      o.visible = false; hidden.push(o); n++;
    }
    if (n !== im.count) changed = true;
    im.count = n; if (changed) im.instanceMatrix.needsUpdate = true; im.visible = n > 0; p.used = frameNo;
    batched += n; if (n) draws++;
  }
  // неиспользуемые пулы прячем, долго неиспользуемые — освобождаем (геометрия могла уйти вместе с картой)
  for (const [key, p] of pools) if (p.used !== frameNo) {
    p.im.visible = false;
    if (frameNo - p.used > 240) { p.im.removeFromParent(); p.im.dispose(); pools.delete(key); groups.delete(key); }
  }
  batchStats.batched = batched; batchStats.draws = draws; batchStats.ms = batchStats.ms * .9 + (performance.now() - t0) * .1;batchStats.upd=(batchStats.upd||0)*.9+(t1-t0)*.1;batchStats.trav=(batchStats.trav||0)*.9+(t2-t1)*.1; return true;
}
export function batchEnd() {
  for (const o of hidden) o.visible = true;
  hidden.length = 0;
  for (const p of pools.values()) p.im.visible = false;
}
