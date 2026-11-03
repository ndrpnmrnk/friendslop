import { THREE } from '../core/gfx.js';
import { W } from './state.js';
import { graphics } from '../core/quality.js';
import { WX } from './weather.js';
import { WINTER } from '../config.js';

/* v0.70 следы на снегу: один InstancedMesh-пул отпечатков (одна отрисовка, без теней).
   Отпечаток ставится у каждого из уже синхронизированных положений (по сети ничего не идёт):
   ноги персонажей - пара следов каждые 0.45 м, транспорт - полосы, упавшие предметы - ямки.
   След заметает: цвет плавно уходит в цвет снега; при снегопаде быстрее. Старые места переиспользуются.
   Только на снегу (W.snowRects) и в 45 м от камеры. CPU - перенос нескольких матриц за кадр и цвет раз в 4 кадра. */
const SNOW = new THREE.Color(0xb9c3d6), DARK = new THREE.Color(0x5e6880);
let mesh = null, cap = 0, next = 0, born = null, life = null, frame = 0;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
function tex() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 32; const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(8, 10, 5, 8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(8, 25, 4, 5, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; return t;
}
export function resetSnowTrails(scene) {
  if (mesh) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; }
  if (!WINTER) return;
  cap = graphics.key === 'high' ? 700 : graphics.key === 'low' ? 220 : 420; next = 0; frame = 0;
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: tex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, alphaTest: .3, fog: true });
  mesh = new THREE.InstancedMesh(geo, mat, cap); mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.userData.noBatch = true; mesh.count = cap;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); born = new Float32Array(cap).fill(-1e9); life = new Float32Array(cap).fill(1);
  m4.makeScale(0, 0, 0); for (let i = 0; i < cap; i++) { mesh.setMatrixAt(i, m4); mesh.setColorAt(i, SNOW); }
  scene.add(mesh);
}
export function snowAt(x, z, y) { for (const r of W.snowRects || []) if (x > r[0] && x < r[2] && z > r[1] && z < r[3] && Math.abs(y - r[4]) < .5) return r[4]; return null; }
// один отпечаток: x,z мировые, ang - направление, w×l размер, ttl секунд
export function stamp(x, z, y, ang, w = .16, l = .3, ttl = 14) {
  if (!mesh) return; const i = next; next = (next + 1) % cap;
  q.setFromAxisAngle(up, ang); m4.compose(p3.set(x, y + .015, z), q, s3.set(w, 1, l)); mesh.setMatrixAt(i, m4); mesh.instanceMatrix.needsUpdate = true;
  born[i] = performance.now() / 1000; life[i] = ttl; mesh.setColorAt(i, DARK); mesh.instanceColor.needsUpdate = true;
}
const track = new WeakMap();
export function updateSnowTrails(dt, camera) {
  if (!mesh || !camera) return; const cx = camera.position.x, cz = camera.position.z;
  for (const a of [W.player, ...(W.bots || [])]) {
    if (!a || a.hidden || a.drone || !a.root?.visible) continue;
    const p = a.root.position; if (Math.abs(p.x - cx) > 45 || Math.abs(p.z - cz) > 45) continue;
    let s = track.get(a); if (!s) track.set(a, s = { x: p.x, z: p.z, foot: 1, d: 0 });
    const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz); s.x = p.x; s.z = p.z; if (d > 3) { s.d = 0; continue; }
    const gy = snowAt(p.x, p.z, p.y); if (gy === null || p.y - gy > .25) { s.d = 0; continue; }
    s.d += d; const ride = a.ride;
    if (ride && s.d > .3) { s.d = 0; const ang = Math.atan2(dx, dz); stamp(p.x, p.z, gy, ang, ride.kind === 'duck' ? 1.2 : ride.kind === 'kart' ? 1.1 : .32, .5, 18); continue; }
    if (!ride && s.d > .45) { s.d = 0; s.foot = -s.foot; const ang = Math.atan2(dx, dz), ox = Math.cos(ang) * .12 * s.foot, oz = -Math.sin(ang) * .12 * s.foot; stamp(p.x + ox, p.z + oz, gy, ang + Math.PI); } /* v0.71.1: носок по ходу движения */
  }
  // заметание: раз в 4 кадра цвет каждого следа уходит к цвету снега; снегопад ускоряет
  if (++frame % 4) return; const now = performance.now() / 1000, k = 1 + (WX.snow ? WX.snow.state.density * 1.5 : 0);
  for (let i = 0; i < cap; i++) { const age = (now - born[i]) * k / life[i]; if (age < 0 || age > 1.2) continue; c.copy(DARK).lerp(SNOW, Math.min(1, age * age)); mesh.setColorAt(i, c); }
  mesh.instanceColor.needsUpdate = true;
}
// ямка от упавшего предмета
export function dent(x, z, y, r = .3) { const gy = snowAt(x, z, y); if (gy !== null && y - gy < .6) stamp(x, z, gy, Math.random() * 6.28, r * 1.6, r * 1.6, 20); }
