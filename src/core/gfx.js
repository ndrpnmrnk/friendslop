import * as THREE from 'three';
import { CONFIG } from '../config.js';

THREE.ColorManagement.enabled = false;
export { THREE };
export const V3 = THREE.Vector3;

/* ---------- Рендер + PS1 ---------- */
export const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(1);
export const canvas = renderer.domElement;
document.getElementById('game').appendChild(canvas);

const rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
export const SNAP = { value: new THREE.Vector2(256, 144) };

// Дрожание вершин в стиле PS1: проекция вершины округляется до сетки экрана
export function ps1(m, stable = false) {
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
  uniforms: { t: { value: rt.texture }, px: { value: new THREE.Vector2(1 / 256, 1 / 144) } },
  vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D t; uniform vec2 px; varying vec2 v;
    float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
    float b4(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
    vec3 bright(vec2 o){ vec3 s = texture2D(t, v + o).rgb; return max(s - 0.74, 0.0); }
    void main(){
      vec3 c = texture2D(t, v).rgb;
      // свечение ярких мест (фонари, окна, огоньки)
      vec3 g = vec3(0.0);
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.785; vec2 d = vec2(cos(a), sin(a));
        g += bright(d * px * 3.0) * 0.6 + bright(d * px * 7.0) * 0.4; }
      c += g * 0.26 * vec3(1.0, 0.85, 0.7);
      // сумеречная цветокоррекция: тени в сливовый, свет в тёплый
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c * vec3(0.92, 0.9, 1.06), c * vec3(1.06, 1.0, 0.92), smoothstep(0.2, 0.8, l)) + vec3(0.012, 0.006, 0.02);
      // виньетка
      vec2 q = v - 0.5; c *= 1.0 - dot(q, q) * 0.55;
      c += (b4(floor(v / px)) - 0.46875) / 64.0; c = floor(c * 40.0 + 0.5) / 40.0;
      gl_FragColor = vec4(c, 1.0); }`,
  depthTest: false, depthWrite: false,
});
const postScene = new THREE.Scene(), postCam = new THREE.Camera();
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post); quad.frustumCulled = false; postScene.add(quad);

export function present(scene, camera) {
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}

export const cameras = [];
export function makeCamera(fov) { const c = new THREE.PerspectiveCamera(fov, 1, 0.12, 220); cameras.push(c); resize(); return c; }
export function resize() {
  const s = CONFIG.pixelScale, w = Math.ceil(innerWidth / s), h = Math.ceil(innerHeight / s);
  renderer.setSize(w, h, false); rt.setSize(w, h); SNAP.value.set(w, h); post.uniforms.px.value.set(1 / w, 1 / h);
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

export function sprite(tex, size, opts = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, ...opts }));
  s.scale.set(size, size, 1); return s;
}
