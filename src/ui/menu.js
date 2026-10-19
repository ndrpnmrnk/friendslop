import { THREE, G, V3, mesh, tmat, col, glow, alphaMat, makeCamera } from '../core/gfx.js';
import { T, facade, rep } from '../core/textures.js';
import { SEASON, HW } from '../config.js';
import { makeCharacter } from '../characters/rig.js';
import { SKINS, SKIN_IDS } from '../characters/skins.js';
import { PFACE } from '../world/builder.js';

/* Главное меню: тёмная улица, персонаж в пятне света фонаря. Стрелками листаем скины. */
export function createMenu() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x140f1c);
  scene.fog = new THREE.Fog(0x140f1c, 7, 18);
  scene.add(new THREE.HemisphereLight(0x6a5a9a, 0x1a1424, 0.9 * Math.PI));
  const spot = new THREE.SpotLight(0xffc890, 22, 12, 0.6, 0.7, 1.4); spot.position.set(0.6, 5.2, 0.6); spot.target.position.set(0, 0, 0); scene.add(spot, spot.target);
  const fill = new THREE.PointLight(0xb18cff, 6, 8); fill.position.set(-3, 2, 3); scene.add(fill);
  const gr = mesh(G.plane, tmat(rep(T.asphalt(), 6, 6)), 0, 0, 0, 24, 24, 1, scene); gr.rotation.x = -Math.PI / 2;
  const curb = mesh(G.box, tmat(rep(T.pave(), 6, 1)), 0, 0.08, -2.2, 24, 0.16, 2.4, scene);
  const wall = mesh(G.box, tmat(facade(0x6a5a7c, 16, 7, { lit: 0.55 })), 0, 3.5, -4, 16, 7, 0.4, scene);
  const pole = col(0x2b2533);
  mesh(G.cyl6, pole, 1.4, 2.6, -0.9, 0.08, 5.2, 0.08, scene);
  const arm = mesh(G.box, pole, 1.0, 5.15, -0.3, 0.08, 0.08, 1.3, scene); arm.rotation.y = 0.6;
  mesh(G.box, glow(SEASON.lamp), 0.6, 5.0, 0.3, 0.32, 0.22, 0.32, scene);
  const pool = mesh(G.plane, alphaMat(T.light(), { blending: THREE.AdditiveBlending }), 0, 0.02, 0, 5, 5, 1, scene); pool.rotation.x = -Math.PI / 2;
  // конус света с пылью
  const cone = mesh(G.cone8, new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending }), 0.3, 2.6, 0.15, 2.2, 4.9, 2.2, scene);
  if (HW) {
    for (const [x, z, s] of [[-2.2, -1.6, 0.42], [-1.6, -1.3, 0.3], [2.6, -1.5, 0.36]]) {
      mesh(G.sph10, tmat(T.pumpkin()), x, s * 0.75 + 0.16, z, s, s * 0.78, s, scene);
      const f = mesh(G.plane, PFACE(), x, s * 0.78 + 0.16, z + s * 0.98, s * 1.1, s * 0.95, 1, scene);
    }
    mesh(G.plane, alphaMat(T.web(), { side: THREE.DoubleSide, opacity: 0.7 }), -7.2, 6.1, -3.78, 1.6, 1.6, 1, scene);
  }
  const camera = makeCamera(40);
  camera.position.set(0, 1.5, 5.6); camera.lookAt(0, 0.45, 0);

  const st = { scene, camera, idx: 0, ch: null, t: 0, waveT: 1.5 };
  try { const s = localStorage.getItem('friendslop.skin'); if (SKIN_IDS.includes(s)) st.idx = SKIN_IDS.indexOf(s); } catch (_) {}
  function show() {
    if (st.ch) scene.remove(st.ch.root);
    st.ch = makeCharacter(SKIN_IDS[st.idx]); scene.add(st.ch.root);
    document.getElementById('skinName').textContent = SKINS[SKIN_IDS[st.idx]].name;
    try { localStorage.setItem('friendslop.skin', SKIN_IDS[st.idx]); } catch (_) {}
  }
  st.next = d => { st.idx = (st.idx + d + SKIN_IDS.length) % SKIN_IDS.length; show(); st.ch.vy = 6; st.air = 0.01; };
  st.skin = () => SKIN_IDS[st.idx];
  st.update = dt => {
    st.t += dt; st.waveT -= dt;
    const c = st.ch;
    c.root.rotation.y = Math.sin(st.t * 0.6) * 0.6;
    let air = false, vy = 0;
    if (st.air) { st.air += dt; c.vy -= 22 * dt; c.root.position.y += c.vy * dt; air = true; vy = c.vy; if (c.root.position.y <= 0) { c.root.position.y = 0; st.air = 0; st.landed = true; } }
    c.animate(dt, { t: st.t, speed: 0, air, vy, wave: st.waveT < 0 && st.waveT > -1.6, landed: st.landed });
    st.landed = false;
    if (st.waveT < -1.6) st.waveT = 3 + Math.random() * 3;
  };
  show();
  return st;
}
