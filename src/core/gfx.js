import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

THREE.ColorManagement.enabled = false;
export { THREE };
export const V3 = THREE.Vector3;

/* ---------- Рендер + PS1 ---------- */
export const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(1);
// Тени: жёсткие пиксельные (как в играх конца 90-х), карта теней ездит за игроком
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
export const canvas = renderer.domElement;
document.getElementById('game').appendChild(canvas);

const rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const silhouetteRT=new THREE.WebGLRenderTarget(4,4,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
export const SNAP = { value: new THREE.Vector2(256, 144) };

// Дрожание вершин в стиле PS1: проекция вершины округляется до сетки экрана
export function ps1(m, stable = false) {
  m.userData.ps1Stable = stable;
  m.customProgramCacheKey = () => stable ? 'ps1-stable-v09' : 'ps1-distance-v09';
  m.onBeforeCompile = sh => {
    sh.uniforms.uSnap = SNAP;
    sh.vertexShader = 'uniform vec2 uSnap;\n' + sh.vertexShader.replace('#include <project_vertex>',
      `#include <project_vertex>
      vec4 sp = gl_Position;
      // Полы и разметка стабильны; вдали дрожание плавно исчезает и на пропсах.
      float jitter = ${stable ? '0.0' : '(1.0 - smoothstep(8.0, 32.0, -mvPosition.z))'};
      if (sp.w > 0.0) sp.xy = mix(sp.xy, floor(sp.xy / sp.w * uSnap + 0.5) / uSnap * sp.w, jitter);
      gl_Position = sp;`);
  };
  return m;
}

// Постобработка: дизеринг Bayer 4x4 и урезанная палитра
const post = new THREE.ShaderMaterial({
  uniforms: { t: { value: rt.texture },silhouette:{value:silhouetteRT.texture},outlineOn:{value:0}, px: { value: new THREE.Vector2(1 / 256, 1 / 144) }, glowK: { value: 1 } },
  vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D t;uniform sampler2D silhouette;uniform float outlineOn; uniform vec2 px; uniform float glowK; varying vec2 v;
    float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
    float b4(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
    vec3 bright(vec2 o){ vec3 s = texture2D(t, v + o).rgb; return max(s - 0.74, 0.0); }
    void main(){
      vec3 c = texture2D(t, v).rgb;
      // свечение ярких мест (фонари, окна, огоньки)
      vec3 g = vec3(0.0);
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.785; vec2 d = vec2(cos(a), sin(a));
        g += bright(d * px * 3.0) * 0.6 + bright(d * px * 7.0) * 0.4; }
      c += g * 0.26 * glowK * vec3(1.0, 0.85, 0.7);
      // сумеречная цветокоррекция: тени в сливовый, свет в тёплый
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c * vec3(0.92, 0.9, 1.06), c * vec3(1.06, 1.0, 0.92), smoothstep(0.2, 0.8, l)) + vec3(0.012, 0.006, 0.02);
      // виньетка
      vec2 q = v - 0.5; c *= 1.0 - dot(q, q) * 0.55;
      // палитра как у PS1: 5 бит на канал (32 уровня) с дизерингом Bayer 4×4
      c += (b4(floor(v / px)) - 0.46875) / 32.0; c = floor(c * 31.0 + 0.5) / 31.0;
      if(outlineOn>0.5){float center=texture2D(silhouette,v).r;float edge=0.0;for(int i=0;i<8;i++){float a=float(i)*0.785398;edge=max(edge,texture2D(silhouette,v+vec2(cos(a),sin(a))*px*1.4).r);}c=mix(c,vec3(.96,.77,.26),step(.5,edge)*(1.0-step(.5,center)));}
      gl_FragColor = vec4(c, 1.0); }`,
  depthTest: false, depthWrite: false,
});
const postScene = new THREE.Scene(), postCam = new THREE.Camera();
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post); quad.frustumCulled = false; postScene.add(quad);

const silhouetteMat=ps1(new THREE.MeshBasicMaterial({color:0xffffff,fog:false,side:THREE.DoubleSide}));
export function present(scene, camera, outlineTarget=null) {
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  post.uniforms.outlineOn.value=outlineTarget?1:0;
  if(outlineTarget){const marked=[],layers=camera.layers.mask,bg=scene.background,override=scene.overrideMaterial,shadow=renderer.shadowMap.autoUpdate;
    outlineTarget.traverse(o=>{if(o.isMesh&&o.visible&&!o.userData.noOutline&&o.name!=='character-shadow'){marked.push([o,o.layers.mask]);o.layers.enable(2);}});
    try{camera.layers.set(2);scene.background=new THREE.Color(0);scene.overrideMaterial=silhouetteMat;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(silhouetteRT);renderer.render(scene,camera);}
    finally{camera.layers.mask=layers;scene.background=bg;scene.overrideMaterial=override;renderer.shadowMap.autoUpdate=shadow;for(const[o,mask]of marked)o.layers.mask=mask;}
  }
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}

export const cameras = [];
export function makeCamera(fov) { const c = new THREE.PerspectiveCamera(fov, 1, 0.12, 220); cameras.push(c); resize(); return c; }
export function resize() {
  const s = CONFIG.pixelScale, w = Math.ceil(innerWidth / s), h = Math.ceil(innerHeight / s);
  renderer.setSize(w, h, false); rt.setSize(w, h);silhouetteRT.setSize(w,h); SNAP.value.set(w, h); post.uniforms.px.value.set(1 / w, 1 / h);
  for (const c of cameras) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
}
addEventListener('resize', resize);

/* ---------- Материалы ---------- */
const MC = new Map();
export function lam(opts, key, stable = false) {
  if (key && MC.has(key)) return MC.get(key);
  const m = ps1(new THREE.MeshLambertMaterial(opts), stable);
  if (key) MC.set(key, m);
  return m;
}
export const col = c => lam({ color: c }, 'c' + c);
export const tmat = (t, extra) => lam({ map: t, ...(extra || {}) }, extra ? null : 't' + t.uuid);
// «стабильный» материал для больших стен и полов: без дрожания вершин (иначе длинные стены «плывут» рябью)
export const smat = t => lam({ map: t }, 's' + t.uuid, true);
export const basic = c => MC.get('b' + c) || (MC.set('b' + c, ps1(new THREE.MeshBasicMaterial({ color: c }))), MC.get('b' + c));
export const glow = c => lam({ color: c, emissive: c, emissiveIntensity: 0.9 }, 'g' + c);
export const alphaMat = (t, opts = {}) => ps1(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...opts }));
// Плоскости, лежащие на других поверхностях (пол, дорожки), чтобы не мерцали
export const flat = t => lam({ map: t, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }, 'f' + t.uuid, true);
export const paint = c => lam({ color: c, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }, 'paint' + c, true);
// Уникальный материал (для объектов, которые затухают, когда закрывают игрока)
export const own = (opts) => ps1(new THREE.MeshLambertMaterial(opts));

/* ---------- Геометрия ---------- */
export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl5: new THREE.CylinderGeometry(1, 1, 1, 5), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8), cyl12: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone4: new THREE.ConeGeometry(1, 1, 4), cone6: new THREE.ConeGeometry(1, 1, 6), cone8: new THREE.ConeGeometry(1, 1, 8),
  sph: new THREE.SphereGeometry(1, 8, 6), sphL: new THREE.SphereGeometry(1, 7, 5), sph10: new THREE.SphereGeometry(1, 10, 7),
  ico: new THREE.IcosahedronGeometry(1, 0), plane: new THREE.PlaneGeometry(1, 1),
  ring: new THREE.RingGeometry(0.8, 1, 16), beam: new THREE.CylinderGeometry(1, 1, 1, 12, 1, true),
  disc: new THREE.CircleGeometry(1, 12), torus: new THREE.TorusGeometry(1, 0.3, 4, 10),
  pipe: new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), pipeRim: new THREE.RingGeometry(0.8, 1, 8),
  halfTorus: new THREE.TorusGeometry(1, 0.12, 4, 10, Math.PI),
};

let parent = null;
export const setParent = p => { parent = p; };
export function mesh(geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, p = parent) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  if (p) p.add(o);
  return o;
}

// Проекция «фото» спереди: передняя половина берёт материал 0, задняя — материал 1
export function frontBack(geo, split = 0) {
  geo = geo.clone();
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  geo.computeBoundingBox();
  const bb = geo.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / w, (pos.getY(i) - bb.min.y) / h);
  const idx = geo.index.array, front = [], back = [];
  for (let t = 0; t < idx.length; t += 3) {
    const cz = (pos.getZ(idx[t]) + pos.getZ(idx[t + 1]) + pos.getZ(idx[t + 2])) / 3;
    (cz > split ? front : back).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  geo.setIndex([...front, ...back]); geo.clearGroups();
  geo.addGroup(0, front.length, 0); geo.addGroup(front.length, back.length, 1);
  return geo;
}

/* Сборка детальной модели из примитивов в одну геометрию на материал.
   Модель собирается один раз (по ключу), дальше копии делят геометрию: десятки деталей —
   всего несколько отрисовок. add(geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) */
const COMP = new Map(), _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _e4 = new THREE.Euler(), _p4 = new THREE.Vector3(), _s4 = new THREE.Vector3();
export function compose(key, fn) {
  let parts = COMP.get(key);
  if (!parts) {
    const by = new Map();
    fn((geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
      let g = geo.index ? geo.toNonIndexed() : geo.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
      g.clearGroups();
      _m4.compose(_p4.set(x, y, z), _q4.setFromEuler(_e4.set(rx, ry, rz)), _s4.set(sx, sy, sz)); g.applyMatrix4(_m4);
      if (sx * sy * sz < 0) { const a = g.attributes; for (const k of ['position', 'normal', 'uv']) { const at = a[k], it = at.itemSize, arr = at.array; for (let i = 0; i < at.count; i += 3) for (let j = 0; j < it; j++) { const t = arr[(i + 1) * it + j]; arr[(i + 1) * it + j] = arr[(i + 2) * it + j]; arr[(i + 2) * it + j] = t; } } }
      let l = by.get(mat); if (!l) by.set(mat, l = []); l.push(g);
    });
    parts = [...by].map(([mat, list]) => ({ mat, geo: mergeGeometries(list, false) }));
    COMP.set(key, parts);
  }
  const g = new THREE.Group();
  for (const p of parts) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = !p.mat.transparent; m.receiveShadow = true; g.add(m); }
  return g;
}

export function sprite(tex, size, opts = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, ...opts }));
  s.scale.set(size, size, 1); return s;
}

// сила свечения ярких мест: в мини-играх ослабляем (v0.21 — стол с напёрстками не «светится»)
export function setGlow(k) { post.uniforms.glowK.value = k; }
