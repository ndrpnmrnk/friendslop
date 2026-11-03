import { THREE } from '../core/gfx.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* v0.68: склейка деталей персонажа. Скин - 20-40 отдельных мешей (глаза, пуговицы, уши, пряжки, пряди...), и каждый -
   отдельная отрисовка в кадре и в тенях. Все детали одного материала склеиваются в один SkinnedMesh: каждая вершина
   жёстко привязана к узлу, который её двигал (рука, голова, прядь), поэтому анимации остаются прежними, а узлы
   по-прежнему двигает код скина. Что двигается и что прячется, определяется прогоном всех анимаций (ходьба, бег,
   прыжок, падение, эмоции, разговор, моргание) на самом персонаже, после чего его состояние полностью восстанавливается.
   Детали, которые прячутся/меняют материал или геометрию, не склеиваются. Исходные меши остаются скрытыми
   (и для лучей): при смене одежды склейка снимается и строится заново. Материалы те же объекты. */
const PROBE = [
  { speed: 0 }, { speed: .6 }, { speed: 1.4, sprint: true }, { air: true, vy: 4 }, { air: true, vy: -6 }, { crouch: true, speed: .4 },
  { stun: true, rag: 1 }, { daze: true }, { emote: 'dance', emoteT: .5 }, { emote: 'wave', emoteT: .4 }, { emote: 'laugh', emoteT: .4 },
  { emote: 'clap', emoteT: .4 }, { emote: 'call', emoteT: .4 }, { hold: true, charge: .6 }, { dive: 'air' }, { slide: true, speed: 1 },
  { ride: 'sit' }, { climb: true }, { swat: 1 }, { kick: 1 }, { throwT: .2 }, { speed: 0, look: .7 },
];
const isPrimitive = v => v == null || ['number', 'string', 'boolean'].includes(typeof v);
// Детали одного материала бывают с разным набором атрибутов (без uv, без индексов): приводим к общему виду.
function norm(src, m) {
  const g = new THREE.BufferGeometry(), n = src.attributes.position.count, f = (k, size, fill) => {
    const a = src.attributes[k]; if (a && a.itemSize === size && !a.isInterleavedBufferAttribute) return a.clone();
    const out = new Float32Array(n * size); if (a) for (let i = 0; i < n; i++) for (let c = 0; c < size; c++) out[i * size + c] = c < a.itemSize ? a.getComponent(i, c) : fill;
    else out.fill(fill); return new THREE.BufferAttribute(out, size); };
  g.setAttribute('position', f('position', 3, 0));
  if (src.attributes.normal) g.setAttribute('normal', f('normal', 3, 0));
  g.setAttribute('uv', f('uv', 2, 0));
  if (m.vertexColors) g.setAttribute('color', f('color', src.attributes.color?.itemSize === 4 ? 4 : 3, 1));
  if (src.index) g.setIndex(src.index.clone());
  if (!src.attributes.normal) { g.computeVertexNormals(); }
  return g;
}

function probe(ch) {
  const nodes = []; ch.root.traverse(o => nodes.push(o));
  const snap = nodes.map(o => ({ o, p: o.position.clone(), q: o.quaternion.clone(), r: o.rotation.clone(), s: o.scale.clone(), v: o.visible, m: o.material, g: o.geometry, gv: o.geometry?.attributes?.position?.version }));
  const own = Object.fromEntries(Object.entries(ch).filter(([, v]) => isPrimitive(v)));
  const moved = new Set(), vis = new Set(), swap = new Set();
  const check = () => { for (const s of snap) { const o = s.o;
    if (!moved.has(o) && (!o.position.equals(s.p) || !o.quaternion.equals(s.q) || !o.scale.equals(s.s))) moved.add(o);
    if (o.visible !== s.v) vis.add(o);
    if (o.material !== s.m || o.geometry !== s.g || (o.geometry?.attributes?.position?.version ?? s.gv) !== s.gv) swap.add(o); } };
  // звуки и обратные вызовы на время прогона выключены (кваканье, шаги)
  const quiet = Object.keys(ch).filter(k => /^on[A-Z]/.test(k) && typeof ch[k] === 'function').map(k => [k, ch[k]]);
  for (const [k] of quiet) ch[k] = () => {};
  let t = 0;
  try {
    for (const st of PROBE) for (let i = 0; i < 12; i++) { t += .05; ch.talk = i % 2; ch.shout = i % 3 === 0 ? 1 : 0; ch.animate(.05, { t, ...st }); check(); }
    for (let i = 0; i < 160; i++) { t += .05; ch.animate(.05, { t, speed: 0 }); check(); } // моргание, idle-анимации скинов
    ch.croakNow?.(); for (let i = 0; i < 20; i++) { t += .05; ch.animate(.05, { t, speed: 0 }); check(); }
  } finally {
    // Поворот восстанавливается углами Эйлера, а не кватернионом: из кватерниона разворот на 180° читается как
    // (π, 0, π), и дальше код, ставящий rotation.y, крутил персонажа задом наперёд (v0.68.2).
    for (const s of snap) { s.o.position.copy(s.p); s.o.rotation.copy(s.r); s.o.scale.copy(s.s); s.o.visible = s.v; if (s.m) s.o.material = s.m; }
    for (const k of Object.keys(ch)) if (isPrimitive(ch[k]) && !(k in own)) delete ch[k];
    Object.assign(ch, own); for (const [k, f] of quiet) ch[k] = f;
  }
  return { moved, vis, swap };
}

export function unmergeCharacter(ch) {
  const st = ch.merged; if (!st) return;
  for (const m of st.meshes) { m.removeFromParent(); m.geometry.dispose(); }
  for (const o of st.hidden) o.visible = true;
  ch.merged = null;
}

const LIVE = o => o.isMesh || o.isSprite || o.isPoints || o.isLine || o.isLight;
export function mergeCharacter(ch) {
  unmergeCharacter(ch);
  const { moved, vis, swap } = probe(ch), root = ch.root, excluded = new Set();
  const markTree = o => o?.traverse?.(q => excluded.add(q));
  markTree(ch.blob); markTree(ch.stars); markTree(ch.speechMouth?.root || ch.speechMouth);
  // Одежда и спрятанные под ней родные детали меняются только в wearOutfit, а он снимает склейку.
  // Слой одежды покачивается и «надевается» с масштабом, поэтому он всегда отдельная кость.
  for (const l of Object.values(ch.outfit?.layers || {})) for (const g of l) moved.add(g);
  const cand = new Set();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh || excluded.has(o) || swap.has(o) || o.userData.merged) return;
    const m = o.material; if (!m || Array.isArray(m) || m.transparent || o.userData.noMerge || o.geometry.morphAttributes?.position || o.geometry.drawRange.count !== Infinity || o.geometry.drawRange.start) return;
    for (let q = o; q && q !== root; q = q.parent) if (!q.visible || vis.has(q) || excluded.has(q) && q !== o) return;
    cand.add(o);
  });
  // Спрятать можно только меш, у которого все живые потомки тоже склеиваются; одиночки по материалу не склеиваются.
  const keyOf = o => o.material.uuid + '|' + (o.userData.castBase ?? o.castShadow) + o.receiveShadow + '|' + o.renderOrder + '|' + o.layers.mask;
  let groups;
  for (let again = true; again;) { again = false; groups = new Map();
    for (const o of cand) { const k = keyOf(o); let g = groups.get(k); if (!g) groups.set(k, g = { m: o.material, list: [] }); g.list.push(o); }
    for (const g of groups.values()) if (g.list.length < 2) { for (const o of g.list) cand.delete(o); again = true; }
    for (const o of cand) { let ok = true; o.traverse(q => { if (q !== o && LIVE(q) && !cand.has(q)) ok = false; }); if (!ok) { cand.delete(o); again = true; } } }
  root.updateMatrixWorld(true);
  const bones = [], boneIx = new Map(), boneOf = o => { let b = root; for (let q = o; q && q !== root; q = q.parent) if (moved.has(q)) { b = q; break; }
    if (!boneIx.has(b)) { boneIx.set(b, bones.length); bones.push(b); } return boneIx.get(b); };
  const meshes = [], hidden = [], inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), rel = new THREE.Matrix4();
  const built = [];
  for (const g of groups.values()) {
    const mixed = g.list.some(o => !o.geometry.index);
    const geos = g.list.map(o => { rel.multiplyMatrices(inv, o.matrixWorld); let c = norm(o.geometry, g.m); if (mixed && c.index) c = c.toNonIndexed(); c.applyMatrix4(rel);
      const n = c.attributes.position.count, b = boneOf(o), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = b; sw[i * 4] = 1; }
      c.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); c.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); return c; });
    let merged = null; try { merged = mergeGeometries(geos, false); } catch { merged = null; }
    for (const c of geos) c.dispose();
    if (merged) built.push({ g, merged });
  }
  if (built.length) {
    const skeleton = new THREE.Skeleton(bones, bones.map(b => new THREE.Matrix4().copy(b.matrixWorld).invert()));
    for (const { g, merged } of built) {
      merged.computeBoundingBox(); merged.computeBoundingSphere();
      const mesh = new THREE.SkinnedMesh(merged, g.m), o0 = g.list[0];
      mesh.name = 'character-merged'; mesh.castShadow = o0.castShadow; if (o0.userData.castBase !== undefined) mesh.userData.castBase = o0.userData.castBase; // тень вблизи/вдали - cull.js mesh.receiveShadow = o0.receiveShadow; mesh.renderOrder = o0.renderOrder; mesh.layers.mask = o0.layers.mask;
      mesh.userData.noBatch = true; mesh.userData.merged = true; mesh.raycast = () => {};
      // Границы с запасом на размах рук, прыжок и падение: считать позу каждый кадр не нужно.
      const sp = merged.boundingSphere.clone(); sp.radius = sp.radius * 1.6 + .4; mesh.boundingSphere = sp;
      mesh.boundingBox = merged.boundingBox.clone().expandByScalar(sp.radius - merged.boundingSphere.radius);
      root.add(mesh); mesh.updateMatrixWorld(true); mesh.bind(skeleton, mesh.matrixWorld); meshes.push(mesh);
      for (const o of g.list) { o.visible = false; hidden.push(o); }
    }
  }
  ch.merged = { meshes, hidden };
  return meshes.length;
}
