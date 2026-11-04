import { THREE, compose } from '../core/gfx.js';
import { pix } from '../core/textures.js';
/* v0.73 единый стиль облаков (хаб и матч): пиксельная текстура с объёмной светотенью (светлый верх, плотная тень снизу),
   кластер из 3 перекрещенных плоскостей под 60° - облако выглядит объёмным с любой стороны.
   Одна текстура и один материал на все облака, кластер собирается compose -> одна отрисовка на облако. */
let tex = null;
function cloudTex() { return tex ??= pix('pxcloud73', 64, 40, (g, w, h) => {
  let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; g.clearRect(0, 0, w, h);
  const blobs = []; for (let i = 0; i < 16; i++) blobs.push([10 + R() * (w - 20), h * .62 - Math.sin(i / 15 * Math.PI) * h * .25 + (R() - .5) * 4, 5 + R() * 8]);
  for (const [cx, cy, r] of blobs) { g.fillStyle = '#9aa2bc'; g.beginPath(); g.arc(cx, cy + 2, r, 0, 7); g.fill(); }        // тень снизу
  for (const [cx, cy, r] of blobs) { g.fillStyle = '#d8deec'; g.beginPath(); g.arc(cx, cy - 1, r * .86, 0, 7); g.fill(); }   // тело
  for (const [cx, cy, r] of blobs) { g.fillStyle = '#f6f8fc'; g.beginPath(); g.arc(cx - r * .2, cy - r * .35, r * .5, 0, 7); g.fill(); } // блик сверху
  g.fillStyle = '#7a82a0'; for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { const a = g.getImageData(x, y, 1, 1).data[3]; if (a && y > h * .7 && (x + y) % 3 === 0) g.fillRect(x, y, 1, 1); } }); }
let mat = null;
export const cloudMaterial = () => mat ??= new THREE.MeshBasicMaterial({ map: cloudTex(), transparent: true, alphaTest: .5, side: THREE.DoubleSide, fog: false, depthWrite: true });
export function pixelCloud(w = 60, key = 'a') {
  return compose('pxcloud73-' + key + w, a => { const plane = new THREE.PlaneGeometry(1, 1); for (let k = 0; k < 3; k++) a(plane, cloudMaterial(), (k - 1) * w * .08, (k % 2) * w * .04, 0, w * (1 - Math.abs(k - 1) * .15), w * .62 * (1 - Math.abs(k - 1) * .15), 1, 0, k * Math.PI / 3, 0); });
}
