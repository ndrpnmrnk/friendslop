import { THREE } from '../core/gfx.js';
import { W } from './state.js';
/* v0.57 — дальность прорисовки мелочи. В PS1-картинке с дымкой предмет за 35+ м занимает пару пикселей,
   а стоит отдельного вызова отрисовки (и ещё одного в тенях). Дальние предметы, толкаемые вещи, котов и двери
   переводим на слой 5 — камера и тень его не рисуют. Логика и физика работают как обычно: меняется только картинка.
   Проверка 5 раз в секунду, с запасом (гистерезис), чтобы на границе ничего не мигало. */
const NEAR = 1, FAR = 1 << 5;
const R = { item: 36, push: 48, cat: 42, door: 52 }, GAP = 5;
const cache = new WeakMap();
let t = 0;
function meshes(root) {
  let l = cache.get(root);
  if (!l) { l = []; root.traverse(o => { if ((o.isMesh || o.isSprite || o.isLine) && (o.layers.mask === NEAR || o.layers.mask === FAR)) l.push(o); }); cache.set(root, l); }
  return l;
}
function set(root, far) {
  if (!root || root.userData.far === far) return; root.userData.far = far;
  cache.delete(root); for (const m of meshes(root)) m.layers.mask = far ? FAR : NEAR;
}
function test(root, x, y, z, cx, cy, cz, r) {
  if (!root) return; const d2 = (x - cx) ** 2 + (y - cy) ** 2 * .5 + (z - cz) ** 2, was = !!root.userData.far;
  set(root, was ? d2 > (r - GAP) ** 2 : d2 > r * r);
}
export function updateCull(dt, camera, player) {
  t -= dt; if (t > 0) return; t = .2;
  const off = !!globalThis.__noCull, c = camera.position, cx = off ? 1e9 : c.x, cy = c.y, cz = c.z;
  if (off) { for (const it of W.items || []) set(it.g, false); for (const b of W.pushables || []) set(b.mesh, false); for (const k of W.cats || []) set(k.root, false); for (const d of W.doors || []) set(d.pivot, false); return; }
  for (const it of W.items || []) { const g = it.g; if (!g) continue; if (it.holder || it.state === 'held' || it.state === 'fly') { set(g, false); continue; } test(g, g.position.x, g.position.y, g.position.z, cx, cy, cz, R.item); }
  for (const b of W.pushables || []) { if (b.rider || b.grabbed) { set(b.mesh, false); continue; } test(b.mesh, b.x, b.y, b.z, cx, cy, cz, R.push); }
  for (const k of W.cats || []) { const p = k.root.position; test(k.root, p.x, p.y, p.z, cx, cy, cz, R.cat); }
  for (const d of W.doors || []) test(d.pivot, d.x, d.y, d.z, cx, cy, cz, R.door);
}
// при смене мира всё снова «ближнее»
export function resetCull() { t = 0; }

/* v0.57: матрицы пересчитываем только тому, что двигается. Раньше three.js каждый кадр пересобирал матрицы ~6000 объектов
   (на слабом процессоре — несколько мс за кадр). Теперь:
   - статичный мир (всё в W.group, кроме подвижного) — «заморожен»;
   - у подвижных корней (предметы, толкаемые, двери, W.keep) матрица обновляется, только если они сдвинулись в этом кадре;
   - детали внутри подвижных корней тоже заморожены (двигается корень — деталь едет вместе с ним).
   Страховка: каждый кадр проверяется кусочек замороженных; если чей-то код сдвинул объект — он оттаивает навсегда.
   Персонажи и коты (анимация каждый кадр) не трогаются. */
let frozen = [], slice = 0, roots = [], thawed = new Set();
const snap = o => ({ o, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() });
const moved = f => !f.o.position.equals(f.p) || !f.o.quaternion.equals(f.q) || !f.o.scale.equals(f.s);
export function freezeStatic() {
  frozen = []; slice = 0; roots = []; const live = new Set(), root = new Set();
  for (const k of W.cats || []) if (k.root) live.add(k.root);
  for (const b of W.bots || []) if (b.root) live.add(b.root);
  if (W.player?.root) live.add(W.player.root);
  for (const it of W.items || []) if (it.g) root.add(it.g);
  for (const b of W.pushables || []) if (b.mesh) root.add(b.mesh);
  for (const d of W.doors || []) if (d.pivot) root.add(d.pivot);
  for (const k of W.keep || []) if (k?.isObject3D) root.add(k);
  W.group.updateMatrixWorld(true);
  const walk = o => { if (live.has(o)) return;
    if (o.matrixAutoUpdate && !o.isLight && !o.isCamera) { o.matrixAutoUpdate = false; if (root.has(o)) roots.push(snap(o)); else frozen.push(snap(o)); }
    for (const c of o.children) walk(c); };
  for (const c of W.group.children) walk(c);
  // целые «застывшие» ветки three.js даже не обходит (matrixWorldAutoUpdate=false); что в них сдвинется — обновим сами
  thawed = new Set(); for (const c of W.group.children) if (!live.has(c) && c.matrixAutoUpdate === false) { c.matrixWorldAutoUpdate = false; c.userData.skipTree = true; }
  return frozen.length + roots.length;
}
const inSkipped = o => { for (let p = o.parent; p && p !== W.group; p = p.parent) if (p.userData.skipTree) return true; return !!o.userData.skipTree; };
// новый объект внутри застывшей ветки (добавили позже) — сразу в список «живых», чтобы его матрица считалась
const _add = THREE.Object3D.prototype.add;
THREE.Object3D.prototype.add = function (...objs) { const r = _add.apply(this, objs); if (thawed && (this.userData?.skipTree || (this.parent && W.group && inSkipped(this)))) for (const o of objs) if (o?.isObject3D) thawed.add(o); return r; };
export function checkFrozen() {
  for (const f of roots) if (moved(f)) { if (!f.o.matrixAutoUpdate) f.o.updateMatrix(); f.p.copy(f.o.position); f.q.copy(f.o.quaternion); f.s.copy(f.o.scale); if (inSkipped(f.o)) f.o.updateMatrixWorld(true); }
  else if (f.o.matrixAutoUpdate && inSkipped(f.o)) f.o.updateMatrixWorld(true);
  for (const o of thawed) { if (!o.parent) { thawed.delete(o); continue; } o.updateMatrixWorld(true); }
  if (!frozen.length) return; const n = Math.min(frozen.length, 400);
  for (let k = 0; k < n; k++) { if (slice >= frozen.length) slice = 0; const f = frozen[slice], o = f.o;
    if (o.matrixAutoUpdate || moved(f)) { if (!o.matrixAutoUpdate) { o.matrixAutoUpdate = true; o.updateMatrix(); } if (inSkipped(o)) thawed.add(o); frozen[slice] = frozen[frozen.length - 1]; frozen.pop(); continue; }
    slice++; }
}
