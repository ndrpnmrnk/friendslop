import { THREE, ps1 } from '../core/gfx.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { W } from './state.js';
import { bakeBreakables } from './breakables.js';

/* Оптимизация: после генерации карты все неподвижные меши склеиваются в крупные куски
   по материалу и участку 40×40 м. Тысячи отдельных отрисовок превращаются в сотни,
   а отсечение по камере продолжает работать по участкам.
   Подвижное (предметы, тележки, двери, разрушаемое, кран, птицы, анимации) не трогаем. */
const CELL = 40;
export function bakeStatic(group) {
  CANON.clear(); BASE.clear();
  bakeBreakables(group);
  const keep = new Set(W.keep);
  for (const it of W.items) keep.add(it.g);
  for (const p of W.pushables) keep.add(p.mesh);
  for (const d of W.doors) keep.add(d.pivot);
  for (const b of W.breakables) keep.add(b.mesh);
  for (const b of W.birds) keep.add(b.g);
  for (const c of W.cats) keep.add(c.root);
  for (const o of W.occluders) if (!o.inside) for (const m of o.mats) keep.add(m);
  group.updateMatrixWorld(true);
  const buckets = new Map(), removed = [];
  const ok = m => m && (!m.transparent || m.blending === THREE.AdditiveBlending) && !keep.has(m) && m.visible !== false;
  const visit = o => {
    if (keep.has(o)) return;
    if (o.isMesh && !o.isInstancedMesh && o.visible && !o.userData.dyn && o.geometry.attributes.uv && o.geometry.attributes.normal) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.every(ok)) {
        let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        g.applyMatrix4(o.matrixWorld);
        if (o.matrixWorld.determinant() < 0) flip(g);
        const c = new THREE.Vector3(); g.computeBoundingBox(); g.boundingBox.getCenter(c);
        const cell = Math.floor(c.x / CELL) + ':' + Math.floor(c.z / CELL);
        const parts = Array.isArray(o.material) ? (g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }]) : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
        for (const gr of parts) {
          const mat = mats[gr.materialIndex]; if (!mat) continue;
          const sub = parts.length === 1 && gr.start === 0 && gr.count === g.attributes.position.count ? g : slice(g, gr.start, gr.count);
          const cm = canon(mat, sub);
          const key = cm.uuid + '|' + cell + '|' + (o.renderOrder || 0);
          let bk = buckets.get(key); if (!bk) buckets.set(key, bk = { mat: cm, list: [], ro: o.renderOrder || 0, shadow: o.castShadow !== false });
          bk.list.push(strip(sub));
        }
        removed.push(o);
        return;
      }
    }
    for (const c of o.children.slice()) visit(c);
  };
  for (const c of group.children.slice()) visit(c);
  for (const o of removed) o.parent && o.parent.remove(o);
  let n = 0;
  for (const bk of buckets.values()) {
    const geo = mergeGeometries(bk.list, false); for (const g of bk.list) g.dispose();
    if (!geo) continue;
    const m = new THREE.Mesh(geo, bk.mat); m.renderOrder = bk.ro; m.matrixAutoUpdate = false; m.userData.baked = true;
    m.castShadow = !bk.mat.transparent && !bk.mat.userData.noShadow && !(bk.mat.emissive && bk.mat.emissiveIntensity > 0.5); m.receiveShadow = true;
    group.add(m); n++;
  }
  // подвижное тоже отбрасывает и принимает тени
  group.traverse(o => { if (o.isMesh && !o.userData.baked && !o.isInstancedMesh) { const m = Array.isArray(o.material) ? o.material[0] : o.material; o.castShadow = !m.transparent && !(m.emissive && m.emissiveIntensity > 0.5); o.receiveShadow = !m.transparent; } });
  return { meshes: removed.length, draws: n };
}
/* Одинаковые по виду материалы сводим к одному: повтор/сдвиг текстуры переносим в UV,
   тогда все дорожки из плитки, все серые стены и т.п. рисуются одним куском. */
const CANON = new Map(), BASE = new Map();
function canon(mat, g) {
  let map = mat.map;
  if (map && (map.repeat.x !== 1 || map.repeat.y !== 1 || map.offset.x !== 0 || map.offset.y !== 0)) {
    const uv = g.attributes.uv, a = uv.array;
    for (let i = 0; i < a.length; i += 2) { a[i] = a[i] * map.repeat.x + map.offset.x; a[i + 1] = a[i + 1] * map.repeat.y + map.offset.y; }
    uv.needsUpdate = true;
    let b = BASE.get(map.source.uuid);
    if (!b) { b = map.clone(); b.repeat.set(1, 1); b.offset.set(0, 0); b.wrapS = b.wrapT = THREE.RepeatWrapping; b.needsUpdate = true; BASE.set(map.source.uuid, b); }
    map = b;
  }
  const key = [mat.type, mat.color && mat.color.getHex(), mat.emissive && mat.emissive.getHex(), mat.emissiveIntensity, map ? map.source.uuid : '-', mat.polygonOffset ? mat.polygonOffsetFactor : 0,
    mat.side, mat.alphaTest, mat.transparent, mat.opacity, mat.blending, mat.depthWrite, mat.userData.ps1Stable].join('|');
  let c = CANON.get(key);
  if (!c) {
    if (map === mat.map) c = mat;
    else { c = mat.clone(); c.map = map; ps1(c, !!mat.userData.ps1Stable); }
    CANON.set(key, c);
  }
  return c;
}
function strip(g) {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  g.clearGroups(); g.morphAttributes = {};
  return g;
}
function slice(g, start, count) {
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) { const a = g.attributes[k]; out.setAttribute(k, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize)); }
  return out;
}
function flip(g) {
  for (const k of ['position', 'normal', 'uv']) {
    const a = g.attributes[k]; if (!a) continue; const s = a.itemSize, arr = a.array;
    for (let i = 0; i < a.count; i += 3) for (let j = 0; j < s; j++) { const t = arr[(i + 1) * s + j]; arr[(i + 1) * s + j] = arr[(i + 2) * s + j]; arr[(i + 2) * s + j] = t; }
  }
}
