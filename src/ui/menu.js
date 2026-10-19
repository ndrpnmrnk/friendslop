import { THREE, G, mesh, tmat, col, glow, alphaMat, makeCamera, compose, lam } from '../core/gfx.js';
import { T, facade, rep } from '../core/textures.js';
import { SEASON, HW } from '../config.js';
import { makeCharacter } from '../characters/rig.js';
import { SKINS, SKIN_IDS } from '../characters/skins.js';
import { PFACE } from '../world/builder.js';
import { sfx } from '../core/sfx.js';

/* Главное меню — живая сцена в том же PS1-рендере, что игра: персонаж на углу улицы под прожектором,
   за ним — дерево, фонарь, тыквы, дымка и город. Раз в 6–12 с — случайная сценка (мыши, призрак, кот,
   порыв листьев, мигнувший фонарь). Персонажа можно крутить мышью: отпустил — он сам, переступая,
   разворачивается к камере. Без дела — дышит, моргает, иногда тянется, машет, чешется. */
export function createMenu() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120d1c);
  scene.fog = new THREE.Fog(0x120d1c, 8, 24);
  scene.add(new THREE.HemisphereLight(0x6a5a9a, 0x1a1424, 0.75 * Math.PI));
  // прожектор сверху — «фонарик» на персонаже
  const spot = new THREE.SpotLight(0xffd8a8, 30, 14, 0.42, 0.55, 1.3); spot.position.set(0.4, 6.5, 1.6); spot.target.position.set(0, 0.6, 0); scene.add(spot, spot.target);
  const fill = new THREE.PointLight(0xb18cff, 5, 9); fill.position.set(-3, 2.2, 2.5); scene.add(fill);
  const warm = new THREE.PointLight(0xff8a1f, 3, 5); warm.position.set(2.4, 0.8, -0.6); scene.add(warm);
  // земля: брусчатка-островок, бордюр, асфальт
  const gr = mesh(G.plane, tmat(rep(T.asphalt(), 8, 8)), 0, 0, 0, 30, 30, 1, scene); gr.rotation.x = -Math.PI / 2;
  const isl = mesh(G.cyl12, tmat(rep(T.cobble(), 3, 1)), 0, 0.07, -0.4, 3.6, 0.14, 3.0, scene);
  mesh(G.box, tmat(rep(T.pave(), 8, 1)), 0, 0.08, -3.4, 30, 0.16, 2.4, scene);
  // фасады позади: в окнах свет
  mesh(G.box, tmat(facade(0x6a5a7c, 10, 8, { lit: 0.55 })), -3.5, 4, -5.5, 10, 8, 0.4, scene);
  mesh(G.box, tmat(facade(0x5a4a6a, 8, 11, { lit: 0.4 })), 6, 5.5, -6.5, 8, 11, 0.4, scene);
  for (let i = 0; i < 9; i++) { const h = 8 + Math.random() * 14; mesh(G.box, tmat(facade(0x2a2238, 5, h, { lit: 0.3, brick: false })), -16 + i * 4.2, h / 2, -14 - Math.random() * 4, 4, h, 2, scene); }
  // фонарь (может мигнуть)
  const pole = col(0x2b2533);
  mesh(G.cyl6, pole, 2.1, 2.5, -1.4, 0.07, 5, 0.07, scene);
  const arm = mesh(G.box, pole, 1.75, 4.95, -1.05, 0.06, 0.06, 1.0, scene); arm.rotation.y = 0.75;
  const bulbM = lam({ color: 0xfff0c8, emissive: 0xfff0c8, emissiveIntensity: 1 }); mesh(G.box, bulbM, 1.45, 4.8, -0.75, 0.3, 0.2, 0.3, scene);
  const lampL = new THREE.PointLight(0xffc890, 6, 7); lampL.position.set(1.45, 4.4, -0.75); scene.add(lampL);
  // дерево: качается, роняет листья
  const tree = new THREE.Group(); tree.position.set(-2.6, 0, -1.6); scene.add(tree);
  mesh(G.cyl6, tmat(T.bark()), 0, 1.0, 0, 0.17, 2.0, 0.17, tree);
  const crown = new THREE.Group(); crown.position.y = 2.0; tree.add(crown);
  const lm = tmat(T.leaves(0)), LG = new THREE.IcosahedronGeometry(1, 1);
  for (const [x, y, z, r] of [[0, 0.8, 0, 0.9], [0.6, 1.1, 0.2, 0.6], [-0.55, 1.15, -0.2, 0.62], [0.1, 1.55, -0.1, 0.55], [-0.2, 0.55, 0.4, 0.5]]) { const c = mesh(LG, lm, x, y, z, r, r * 0.8, r, crown); c.rotation.set(Math.random(), Math.random() * 3, 0); }
  // тыквы-фонари и куча листьев
  const pumps = [];
  if (HW) for (const [x, z, s] of [[1.7, 0.5, 0.36], [2.3, 0.1, 0.27], [-1.8, 0.9, 0.3]]) {
    mesh(G.sph10, tmat(T.pumpkin()), x, s * 0.75 + 0.14, z, s, s * 0.78, s, scene);
    const f = mesh(G.plane, PFACE(), x, s * 0.78 + 0.14, z + s * 0.98, s * 1.1, s * 0.95, 1, scene); pumps.push(f);
  }
  { const pile = mesh(G.sph10, tmat(T.leaves(0)), -1.3, 0.1, 1.3, 0.7, 0.22, 0.55, scene); pile.rotation.y = 0.5; }
  const fog = mesh(G.plane, alphaMat(T.mist(), { color: 0xb8a8e0, opacity: 0.35, depthWrite: false }), 0, 0.35, 0, 22, 12, 1, scene); fog.rotation.x = -Math.PI / 2;
  // падающие листья (немного, всегда)
  const leaves = []; const leafCol = [0xc9662a, 0xa8452a, 0xe89a3a];
  for (let i = 0; i < 14; i++) { const m = mesh(G.plane, lam({ color: leafCol[i % 3], side: THREE.DoubleSide }, 'mleaf' + i % 3), 0, -5, 0, 0.12, 0.08, 1, scene); leaves.push({ m, t: Math.random() * 6, s: Math.random() * 4 }); }
  // эпизоды: летучие мыши, призрак, кот
  const bats = new THREE.Group(); scene.add(bats); bats.visible = false;
  const batM = col(0x17111f), wings = [];
  for (let i = 0; i < 6; i++) { const b = new THREE.Group(); b.position.set(i * 0.7 - 2, Math.sin(i) * 0.5, Math.cos(i * 2) * 0.6); mesh(G.sphL, batM, 0, 0, 0, 0.12, 0.1, 0.16, b);
    const wl = mesh(new THREE.BoxGeometry(1, 1, 1).translate(-0.5, 0, 0), batM, -0.08, 0, 0, 0.4, 0.02, 0.2, b), wr = mesh(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0, 0), batM, 0.08, 0, 0, 0.4, 0.02, 0.2, b); wings.push([wl, wr, Math.random() * 6]); bats.add(b); }
  const ghost = compose('menuGhost', q => { const wm = lam({ color: 0xeee8ff, emissive: 0x8a80a8, emissiveIntensity: 0.6, transparent: true, opacity: 0.75 }, 'mghost'); q(G.sph10, wm, 0, 0.6, 0, 0.32, 0.32, 0.32); q(G.cone8, wm, 0, 0.1, 0, 0.42, 0.8, 0.42); q(G.box, col(0x17111f), -0.1, 0.63, 0.29, 0.07, 0.1, 0.02); q(G.box, col(0x17111f), 0.1, 0.63, 0.29, 0.07, 0.1, 0.02); });
  scene.add(ghost); ghost.visible = false;
  const cat = compose('menuCat', q => { const k = col(0x1a1622); q(G.sphL, k, 0, 0.3, 0, 0.2, 0.17, 0.32); q(G.sphL, k, 0, 0.42, 0.3, 0.14, 0.13, 0.13); q(G.cone4, k, 0.07, 0.56, 0.3, 0.04, 0.08, 0.04); q(G.cone4, k, -0.07, 0.56, 0.3, 0.04, 0.08, 0.04); q(G.cyl5, k, 0, 0.45, -0.38, 0.03, 0.35, 0.03, -0.6); for (const [x, z] of [[0.1, 0.18], [-0.1, 0.18], [0.1, -0.18], [-0.1, -0.18]]) q(G.box, k, x, 0.1, z, 0.06, 0.2, 0.06); q(G.box, glow(0x9be36b), 0.05, 0.44, 0.42, 0.03, 0.03, 0.02); q(G.box, glow(0x9be36b), -0.05, 0.44, 0.42, 0.03, 0.03, 0.02); });
  scene.add(cat); cat.visible = false;
  const camera = makeCamera(38);
  camera.position.set(0, 1.7, 8.2); camera.lookAt(0, 1.0, 0);

  const st = { scene, camera, idx: 0, ch: null, t: 0, rot: 0, drag: false, lastX: 0, actT: 4, act: null, actK: 0, epT: 3, ep: null, active: true, puffT: 0 };
  try { const s = localStorage.getItem('friendslop.skin'); if (SKIN_IDS.includes(s)) st.idx = SKIN_IDS.indexOf(s); } catch (_) {}
  function show() {
    if (st.ch) scene.remove(st.ch.root);
    st.ch = makeCharacter(SKIN_IDS[st.idx]); st.ch.onCroak = () => sfx('croak'); st.ch.root.position.set(0, 0.14, 0); scene.add(st.ch.root); st.ch.root.rotation.y = st.rot;
    document.getElementById('skinName').textContent = SKINS[SKIN_IDS[st.idx]].name;
    try { localStorage.setItem('friendslop.skin', SKIN_IDS[st.idx]); } catch (_) {}
  }
  st.next = d => { st.idx = (st.idx + d + SKIN_IDS.length) % SKIN_IDS.length; show(); st.ch.vy = 5; st.air = 0.01; spot.intensity = 60; st.puffT = 0.25; };
  st.skin = () => SKIN_IDS[st.idx];
  // вращение мышью
  addEventListener('pointerdown', e => { if (!st.active || (e.target.closest && e.target.closest('button'))) return; st.drag = true; st.lastX = e.clientX; });
  addEventListener('pointermove', e => { if (!st.drag) return; st.rot += (e.clientX - st.lastX) * 0.012; st.lastX = e.clientX; });
  addEventListener('pointerup', () => { st.drag = false; });

  st.update = dt => {
    st.t += dt; const t = st.t, c = st.ch;
    // разворот к камере: не «платформа», а шаги и доворот корпуса с головой
    let speed = 0, look;
    st.rot = Math.atan2(Math.sin(st.rot), Math.cos(st.rot));
    if (!st.drag && Math.abs(st.rot) > 0.04) { const sp = Math.min(Math.abs(st.rot), 3.2 * dt); st.rot -= Math.sign(st.rot) * sp; speed = 0.22; look = -Math.sign(st.rot) * 0.5; if (Math.abs(st.rot) <= 0.04) { st.nod = 0.4; } }
    c.root.rotation.y = st.rot;
    // прыжок при смене скина
    let air = false, vy = 0, landed = false;
    if (st.air) { st.air += dt; c.vy -= 22 * dt; c.root.position.y += c.vy * dt; air = true; vy = c.vy; if (c.root.position.y <= 0.14) { c.root.position.y = 0.14; st.air = 0; landed = true; } }
    // idle-действия
    st.actT -= dt;
    if (!st.act && st.actT <= 0 && !st.drag && !speed && !air) { st.act = ['stretch', 'wave', 'jump', 'scratch', 'special', 'look'][(Math.random() * 6) | 0]; st.actK = 0; if (st.act === 'jump') { c.vy = 4.5; st.air = 0.01; st.act = null; st.actT = 5 + Math.random() * 3; } }
    if (st.act) { st.actK += dt / 1.6; if (st.actK >= 1) { st.act = null; st.actT = 5 + Math.random() * 3; } }
    if (st.act === 'look') look = Math.sin(st.actK * Math.PI * 2) * 0.7;
    if (st.nod > 0) { st.nod -= dt; c.head.rotation.x = Math.sin((0.4 - st.nod) / 0.4 * Math.PI) * 0.25; } else c.head.rotation.x *= 0.85;
    c.animate(dt, { t, speed, air, vy, landed, wave: st.act === 'wave', act: st.act, actK: st.actK, look });
    // сцена живёт
    crown.rotation.z = Math.sin(t * 0.9) * 0.05; crown.rotation.x = Math.sin(t * 0.7 + 1) * 0.03;
    T.mist().offset.x += dt * 0.01;
    spot.intensity += (30 - spot.intensity) * Math.min(1, dt * 5);
    for (const l of leaves) { l.t += dt * 0.25; const k = l.t % 1; l.m.position.set(-2.6 + Math.sin(l.s + k * 6) * 1.6 + k * 2.5, 3.2 - k * 3.2, -1.4 + Math.cos(l.s * 2 + k * 4) * 0.8); l.m.rotation.set(t * l.s, t, t * 0.5); }
    // эпизоды
    st.epT -= dt;
    if (!st.ep && st.epT <= 0) { st.ep = { k: ['bats', 'ghost', 'cat', 'flicker', 'gust'][(Math.random() * 5) | 0], t: 0, dir: Math.random() < 0.5 ? 1 : -1 }; }
    if (st.ep) {
      const e = st.ep; e.t += dt; let done = false;
      if (e.k === 'bats') { bats.visible = true; bats.position.set(-9 * e.dir + e.t * 6 * e.dir, 4.5 + Math.sin(e.t * 2) * 0.6, -3 + Math.sin(e.t) * 0.5); bats.rotation.y = e.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        for (const [wl, wr, ph] of wings) { const f = Math.sin(t * 20 + ph) * 0.9; wl.rotation.z = -f; wr.rotation.z = f; } done = e.t > 3.2; if (done) bats.visible = false; }
      else if (e.k === 'ghost') { ghost.visible = true; const k = e.t / 4; ghost.position.set(-6 * e.dir + k * 12 * e.dir, 1.1 + Math.sin(e.t * 2.5) * 0.25, -2.8); ghost.rotation.y = e.dir * Math.PI / 2; ghost.traverse(o => { if (o.material && o.material.transparent) o.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.75; }); done = e.t > 4; if (done) ghost.visible = false; }
      else if (e.k === 'cat') { cat.visible = true; const k = e.t / 5; cat.position.set(-7 * e.dir + k * 14 * e.dir, 0.16 + Math.abs(Math.sin(e.t * 8)) * 0.03, -2.6); cat.rotation.y = e.dir * Math.PI / 2; done = e.t > 5; if (done) cat.visible = false; }
      else if (e.k === 'flicker') { const on = !(e.t < 1.2 && Math.sin(e.t * 40) > 0.2); lampL.intensity = on ? 6 : 0.4; bulbM.emissiveIntensity = on ? 1 : 0.1; done = e.t > 1.3; if (done) { lampL.intensity = 6; bulbM.emissiveIntensity = 1; } }
      else if (e.k === 'gust') { crown.rotation.z = Math.sin(e.t * 6) * 0.15 * (1 - e.t / 2); for (const l of leaves) l.t += dt * 1.5; done = e.t > 2; }
      if (done) { st.ep = null; st.epT = 6 + Math.random() * 6; }
    }
  };
  show();
  return st;
}
