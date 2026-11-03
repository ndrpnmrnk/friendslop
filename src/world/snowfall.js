import { THREE } from '../core/gfx.js';
import { graphics } from '../core/quality.js';

/* v0.70 снегопад: одно облако точек вокруг камеры (один вызов отрисовки).
   Снежинки падают медленно, покачиваются и сносятся ветром; коробка «едет» за камерой без перескоков.
   Плотность зависит от пресета графики и силы (лёгкий снег в хабе, обычный в матче, метель - событие). */
const BOX = 40, H = 22;
let tex = null;
function flake() {
  if (tex) return tex;
  const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(2, 2, 4, 4); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(1, 3, 6, 2); g.fillRect(3, 1, 2, 6);
  tex = new THREE.CanvasTexture(c); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; return tex;
}
export function createSnowfall(scene, { density = 1, size = 0.13 } = {}) {
  const max = 2600, pos = new Float32Array(max * 3), seed = new Float32Array(max);
  for (let i = 0; i < max; i++) { pos[i * 3] = (Math.random() - .5) * BOX; pos[i * 3 + 1] = Math.random() * H; pos[i * 3 + 2] = (Math.random() - .5) * BOX; seed[i] = Math.random() * 6.28; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: flake(), size, transparent: true, opacity: .85, depthWrite: false, alphaTest: .2, color: 0xf2f6ff });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 2; scene.add(pts);
  const state = { density, wind: { x: 0, z: 0 }, fall: 1.25 };
  let t = 0;
  return {
    state, points: pts,
    update(dt, camera) {
      if (!camera) return; t += dt;
      const q = graphics.key === 'high' ? 1 : graphics.key === 'low' ? .35 : .65;
      const n = Math.min(max, Math.round(900 * state.density * q)); geo.setDrawRange(0, n); pts.visible = n > 0;
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, wx = state.wind.x, wz = state.wind.z, f = state.fall;
      for (let i = 0; i < n; i++) {
        const k = i * 3, s = seed[i];
        let x = pos[k] + (wx + Math.sin(t * .9 + s) * .35) * dt, y = pos[k + 1] - f * (.75 + (s % 1) * .5) * dt, z = pos[k + 2] + (wz + Math.cos(t * .7 + s) * .35) * dt;
        // коробка вокруг камеры: снежинка, ушедшая за край, возвращается с другой стороны
        const rx = x - cx, rz = z - cz, ry = y - cy;
        if (rx > BOX / 2) x -= BOX; else if (rx < -BOX / 2) x += BOX;
        if (rz > BOX / 2) z -= BOX; else if (rz < -BOX / 2) z += BOX;
        if (ry < -8) y += H; else if (ry > H - 8) y -= H;
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
    },
    dispose() { scene.remove(pts); geo.dispose(); mat.dispose(); },
  };
}
