import {materialAtlas} from './material-atlas.js';
import { installOcclusion } from '../game/occlusion.js';
import { THREE, ps1, G } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { W } from './state.js';
import { bakeBreakables } from './breakables.js';

/* Оптимизация: после генерации карты все неподвижные меши склеиваются в крупные куски
   по материалу и участку 72×72 м. Тысячи отдельных отрисовок превращаются в сотни,
   а отсечение по камере продолжает работать по участкам.
   Подвижное (предметы, тележки, двери, разрушаемое, кран, птицы, анимации) не трогаем. */
const CELL = 72; // 4 больших участка на карту: меньше отрисовок
export function bakeStatic(group, section=false) {
  CANON.clear(); BASE.clear();
  if(!section)bakeBreakables(group);
  const keep = new Set(W.keep);
  for (const it of W.items) keep.add(it.g);
  for (const p of W.pushables) keep.add(p.mesh);
  for (const d of W.doors) keep.add(d.pivot);
  for (const b of W.breakables) keep.add(b.mesh);
  for (const b of W.birds) keep.add(b.g);
  for (const c of W.cats) keep.add(c.root);
  for (const o of W.occluders) if (!o.inside) for (const m of o.mats) keep.add(m);
  group.updateMatrixWorld(true);
  const buckets = new Map(), removed = [], boxes = [];
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
        if (o.geometry === G.box && axisAligned(o.matrixWorld)) { boxes.push({ g, bb: g.boundingBox.clone() }); worldUV(g, mats, Array.isArray(o.material)); }
        const cell = Math.floor(c.x / CELL) + ':' + Math.floor(c.z / CELL);
        // «паспорт» объекта для камеры мини-игр (game/occlusion.js): центр, радиус+100, полувысота
        { const sz = new THREE.Vector3(); g.boundingBox.getSize(sz); const n = g.attributes.position.count, a = new Float32Array(n * 4), h = new Float32Array(n), r = Math.hypot(sz.x, sz.z) / 2;
          for (let i = 0; i < n; i++) { a[i * 4] = c.x; a[i * 4 + 1] = c.y; a[i * 4 + 2] = c.z; a[i * 4 + 3] = r + 100; h[i] = sz.y / 2; }
          g.setAttribute('aObj', new THREE.BufferAttribute(a, 4)); g.setAttribute('aObjH', new THREE.BufferAttribute(h, 1)); }
        pending.push({ o, g, mats, cell }); removed.push(o); return;
      }
    }
    for (const c of o.children.slice()) visit(c);
  };
  const pending = [];
  for (const c of group.children.slice()) visit(c);
  fixCoplanar(boxes);
  const atlas=materialAtlas(new Set(pending.flatMap(p=>p.mats)),W.mapResources,new Set([T.water(),T.waterHi(),T.foam()].map(t=>t.source.uuid)));
  for (const { o, g, mats, cell } of pending) {
    {
      {
        const parts = Array.isArray(o.material) ? (g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }]) : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
        for (const gr of parts) {
          const mat = mats[gr.materialIndex]; if (!mat) continue;
          const sub = parts.length === 1 && gr.start === 0 && gr.count === g.attributes.position.count ? g : slice(g, gr.start, gr.count);
          const cm = atlas.apply(canon(mat, sub), sub);
          const st = strip(sub);
          // v0.51: куски с разным набором атрибутов (цвет вершин, атлас) склеиваются отдельно — иначе склейка падала и объекты пропадали
          const key = cm.uuid + '|' + cell + '|' + (o.renderOrder || 0) + '|' + Object.keys(st.attributes).sort().join(',');
          let bk = buckets.get(key); if (!bk) buckets.set(key, bk = { mat: cm, list: [], ro: o.renderOrder || 0, shadow: o.castShadow !== false });
          bk.list.push(st);
        }
      }
    }
  }
  for (const o of removed) o.parent && o.parent.remove(o);
  let n = 0;
  for (const bk of buckets.values()) {
    const geo = mergeGeometries(bk.list, false); for (const g of bk.list) g.dispose();
    if (!geo) continue;
    const m = new THREE.Mesh(geo, bk.mat); m.renderOrder = bk.ro; m.matrixAutoUpdate = false; m.userData.baked = true;
    W.mapResources.add(geo);
    m.castShadow = !bk.mat.transparent && !bk.mat.userData.noShadow && !(bk.mat.emissive && bk.mat.emissiveIntensity > 0.5); m.receiveShadow = true;
    group.add(m); n++;
  }
  // подвижное тоже отбрасывает и принимает тени
  group.traverse(o => { if (o.isMesh && !o.userData.baked && !o.isInstancedMesh) { const m = Array.isArray(o.material) ? o.material[0] : o.material; o.castShadow = !m.transparent && !(m.emissive && m.emissiveIntensity > 0.5); o.receiveShadow = !m.transparent; } });
  installOcclusion(group);
  return { meshes: removed.length, draws: n,atlasPages:atlas.pages };
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
    if (!b) { b = map.clone(); b.repeat.set(1, 1); b.offset.set(0, 0); b.wrapS = b.wrapT = THREE.RepeatWrapping; b.needsUpdate = true; BASE.set(map.source.uuid, b);W.mapResources.add(b); }
    map = b;
  }
  const key = [mat.type, mat.color && mat.color.getHex(), mat.emissive && mat.emissive.getHex(), mat.emissiveIntensity, map ? map.source.uuid : '-', mat.polygonOffset ? mat.polygonOffsetFactor : 0,
    mat.side, mat.alphaTest, mat.transparent, mat.opacity, mat.blending, mat.depthWrite, mat.userData.ps1Stable].join('|');
  let c = CANON.get(key);
  if (!c) {
    if (map === mat.map) c = mat;
    else { c = mat.clone(); c.map = map; ps1(c, !!mat.userData.ps1Stable);W.mapResources.add(c); }
    CANON.set(key, c);
  }
  return c;
}
function strip(g) {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'aObj' && k !== 'aObjH' && k !== 'aAtlas' && k !== 'color') g.deleteAttribute(k);
  g.clearGroups(); g.morphAttributes = {};
  return g;
}
function slice(g, start, count) {
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv', 'aObj', 'aObjH','aAtlas','color']) { const a = g.attributes[k]; if (!a) continue; out.setAttribute(k, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize)); }
  return out;
}
function flip(g) {
  for (const k of ['position', 'normal', 'uv']) {
    const a = g.attributes[k]; if (!a) continue; const s = a.itemSize, arr = a.array;
    for (let i = 0; i < a.count; i += 3) for (let j = 0; j < s; j++) { const t = arr[(i + 1) * s + j]; arr[(i + 1) * s + j] = arr[(i + 2) * s + j]; arr[(i + 2) * s + j] = t; }
  }
}

/* Против мерцания: если две коробки имеют совпадающие грани, смотрящие в одну сторону
   (верх стены и верх крыши, земля и бортик клумбы, доска на крыше), большая грань
   утапливается на 1.5 см — сверху остаётся меньший объект, полосы исчезают. */
function axisAligned(m) {
  const e = m.elements;
  // каждая ось локальной коробки должна идти вдоль мировой оси
  for (const c of [0, 4, 8]) { const a = [Math.abs(e[c]), Math.abs(e[c + 1]), Math.abs(e[c + 2])], mx = Math.max(...a); if (a.filter(v => v > mx * 1e-3).length !== 1) return false; }
  return true;
}
/* Плиточные текстуры (бетон, кирпич, плитка, асфальт…) на коробках раскладываются по миру:
   1 повтор на 3 м по каждой грани, а не одна картинка, растянутая на 30-метровую стену. */
let TILE = null;
function worldUV(g, mats, multi) {
  if (!TILE) TILE = new Set(['concrete', 'stone', 'oldBrick', 'tunnelTile', 'brickWall', 'metal', 'rust', 'roof', 'dirt', 'asphalt', 'pave', 'cobble', 'grass', 'planter', 'soil', 'water', 'floorWood', 'floorTile'].map(k => T[k]().source.uuid));
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const ranges = multi && g.groups.length ? g.groups : [{ start: 0, count: pos.count, materialIndex: 0 }];
  for (const r of ranges) {
    const m = mats[r.materialIndex]; if (!m || !m.map || !TILE.has(m.map.source.uuid) || m.map.repeat.x !== 1 || m.map.repeat.y !== 1) continue;
    for (let i = r.start; i < r.start + r.count; i++) {
      const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (ny >= nx && ny >= Math.abs(nor.getZ(i))) uv.setXY(i, x / 3, z / 3); else if (nx >= Math.abs(nor.getZ(i))) uv.setXY(i, z / 3, y / 3); else uv.setXY(i, x / 3, y / 3);
    }
    uv.needsUpdate = true;
  }
}
function fixCoplanar(boxes) {
  const faces = new Map(), E = 0.015;
  const K = (a, s, v) => a + '|' + s + '|' + Math.round(v * 100);
  const AX = ['x', 'y', 'z'];
  for (const b of boxes) for (let a = 0; a < 3; a++) for (const s of [-1, 1]) {
    const v = s > 0 ? b.bb.max[AX[a]] : b.bb.min[AX[a]], o1 = (a + 1) % 3, o2 = (a + 2) % 3;
    const f = { b, a, s, v, r: [b.bb.min[AX[o1]], b.bb.max[AX[o1]], b.bb.min[AX[o2]], b.bb.max[AX[o2]]] };
    f.area = (f.r[1] - f.r[0]) * (f.r[3] - f.r[2]);
    const k = K(a, s, v); let l = faces.get(k); if (!l) faces.set(k, l = []); l.push(f);
  }
  const moved = new Set();
  for (const [k, list] of faces) {
    const [a, s, cm] = k.split('|'), near = [...list, ...(faces.get(a + '|' + s + '|' + (+cm + 1)) || []), ...(faces.get(a + '|' + s + '|' + (+cm + 2)) || [])];
    for (let i = 0; i < list.length; i++) for (let j = 0; j < near.length; j++) {
      const f = list[i], q = near[j]; if (f === q || f.b === q.b || Math.abs(f.v - q.v) > 0.025) continue;
      const ox = Math.min(f.r[1], q.r[1]) - Math.max(f.r[0], q.r[0]), oz = Math.min(f.r[3], q.r[3]) - Math.max(f.r[2], q.r[2]);
      if (ox <= 0.002 || oz <= 0.002) continue;
      const big = f.area >= q.area ? f : q;
      if (moved.has(big)) continue; moved.add(big);
      const pos = big.b.g.attributes.position, arr = pos.array, ai = big.a;
      for (let v = 0; v < pos.count; v++) if (Math.abs(arr[v * 3 + ai] - big.v) < 1e-3) arr[v * 3 + ai] -= big.s * (E + Math.max(0, big.s * (big.v - (big === f ? q.v : f.v)) > 0 ? Math.abs(f.v - q.v) : 0));
      pos.needsUpdate = true;
    }
  }
}
