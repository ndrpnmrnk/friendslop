import { THREE, G, mesh, tmat, col, glow, alphaMat, makeCamera, compose, lam } from '../core/gfx.js';
import { T, facade, rep } from '../core/textures.js';
import { SEASON, HW } from '../config.js';
import { makeCharacter } from '../characters/rig.js';
import { SKINS, SKIN_IDS } from '../characters/skins.js';
import { PFACE } from '../world/builder.js';
import { buildCat, COATS } from '../game/cats.js';
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
  // Замкнутые маршруты проходят за домами. Актёры не включаются и не исчезают в кадре.
  const ghost = new THREE.Group();scene.add(ghost);
  const sheet=lam({map:T.cloth(0xe8dfef,'cloth_g'),emissive:0x272035},'menuSheet25');
  const verts=[],indices=[];const count=10;
  for(let row=0;row<3;row++)for(let i=0;i<count;i++){const a=i/count*Math.PI*2,r=[0.3,0.34,0.42][row];verts.push(Math.sin(a)*r,[0.62,0.27,-0.32+(i%2)*0.12][row],Math.cos(a)*r);}
  for(let row=0;row<2;row++)for(let i=0;i<count;i++){const a=row*count+i,b=row*count+(i+1)%count;indices.push(a,a+count,b,b,a+count,b+count);}
  for(let i=1;i<count-1;i++)indices.push(0,i, i+1);
  for(let i=1;i<count-1;i++)indices.push(20,20+i+1,20+i);
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));sg.setIndex(indices);sg.computeVertexNormals();
  const uv=[];for(let row=0;row<3;row++)for(let i=0;i<count;i++)uv.push(i/count,1-row/2);sg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  mesh(sg,sheet,0,0,0,1,1,1,ghost);mesh(G.sph10,sheet,0,0.63,0,0.3,0.29,0.3,ghost);
  for(const x of [-0.1,0.1])mesh(G.box,col(0x17111f),x,0.66,0.285,0.07,0.1,0.025,ghost);
  const menuCat=buildCat(COATS[4]),cat=menuCat.root;scene.add(cat);
  scene.add(compose('menuStreet25',a=>{
    const brick=tmat(T.oldBrick()),wood=tmat(T.wood()),metal=tmat(T.metal()),dark=col(0x292331);
    // Ближние боковые фасады перекрывают уходящий за угол маршрут.
    for(const x of [-6.5,6.5]){
      a(G.box,brick,x,2,-3.5,4.3,4,4);a(G.box,tmat(T.roof()),x,4.1,-3.5,4.5,0.2,4.2);
      a(G.box,dark,x,1.25,-1.47,1.1,2.5,0.06);a(G.box,wood,x,1.2,-1.43,0.9,2.35,0.03);
      a(G.box,tmat(T.sign(x<0?'ПОЧТА':'ЛАВКА','#34283d','#f5c542')),x,3.1,-1.42,2,0.45,0.04);
      a(G.box,metal,x+0.62,1.1,-1.37,0.1,0.04,0.04);
      a(G.box,glow(0xffcf8a),x-1.4,2.1,-1.43,0.7,1.1,0.02);
      for(const yy of [1.8,2.4])a(G.box,dark,x-1.4,yy,-1.38,0.8,0.035,0.04);
      a(G.box,metal,x+1.85,2,-1.34,0.07,4,0.07);
    }
    // Лавочка, посылки, решётка стока, объявления и ограждение вдоль дорожки.
    for(const x of [1.8,3.2])a(G.box,metal,x,0.25,-3,0.06,0.5,0.6);
    for(let i=0;i<3;i++)a(G.box,wood,2.5,0.52,-2.8-i*0.15,1.65,0.05,0.12);
    a(G.box,wood,2.5,0.8,-3.16,1.65,0.4,0.06);
    for(const [x,z,h] of [[-4,-2.7,0.4],[-3.5,-3.1,0.6]])a(G.box,tmat(T.crate()),x,h/2,z,0.5,h,0.5);
    a(G.box,tmat(T.grate()),1.2,0.012,1.8,0.6,0.02,0.4);
    a(G.box,tmat(T.sign('ПРОПАЛ КОТ','#d8ccb0','#34283d')),-3.9,1.7,-1.44,0.4,0.5,0.01);
    for(let i=0;i<7;i++)a(G.box,metal,-2.2+i*0.7,0.55,-4.2,0.035,1.1,0.035);
    a(G.box,metal,-0.1,0.9,-4.2,4.3,0.035,0.035);
  }));
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
  st.next = d => { st.idx = (st.idx + d + SKIN_IDS.length) % SKIN_IDS.length; show(); if (st.ch.skinId === 'frog') { st.ch.croakNow(); sfx('frog_happy'); } st.ch.vy = 5; st.air = 0.01; spot.intensity = 60; st.puffT = 0.25; };
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
    // Полный круг непрерывен: передняя половина видна, обратная проходит за фасадами.
    const ca=t*0.18,ga=t*0.12+2.3;
    cat.position.set(Math.sin(ca)*11,0.16,-5.2+Math.cos(ca)*2.1);cat.rotation.y=Math.atan2(Math.cos(ca),-Math.sin(ca)*2.1/11);
    menuCat.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*10+(i===0||i===3?0:Math.PI))*0.55);
    menuCat.tail.rotation.x=0.6;menuCat.tail2.rotation.y=Math.sin(t*2)*0.3;
    ghost.position.set(Math.sin(ga)*11,1.3+Math.sin(t*2)*0.12,-5.4+Math.cos(ga)*2);ghost.rotation.y=Math.atan2(Math.cos(ga),-Math.sin(ga)*2/11);
    bats.visible=true;const ba=t*0.16;bats.position.set(Math.sin(ba)*19,5.4+Math.sin(t)*0.25,-9+Math.cos(ba)*2);
    bats.rotation.y=Math.atan2(Math.cos(ba),-Math.sin(ba)*2/19);for(const [wl,wr,ph]of wings){wl.rotation.z=Math.sin(t*20+ph)*0.9;wr.rotation.z=-wl.rotation.z;}
    // Только свет и ветер запускаются эпизодами.
    st.epT -= dt;
    if (!st.ep && st.epT <= 0) { st.ep = { k: ['flicker', 'gust'][(Math.random() * 2) | 0], t: 0, dir: Math.random() < 0.5 ? 1 : -1 }; }
    if (st.ep) {
      const e = st.ep; e.t += dt; let done = false;
      if (e.k === 'flicker') { const on = !(e.t < 1.2 && Math.sin(e.t * 40) > 0.2); lampL.intensity = on ? 6 : 0.4; bulbM.emissiveIntensity = on ? 1 : 0.1; done = e.t > 1.3; if (done) { lampL.intensity = 6; bulbM.emissiveIntensity = 1; } }
      else if (e.k === 'gust') { crown.rotation.z = Math.sin(e.t * 6) * 0.15 * (1 - e.t / 2); for (const l of leaves) l.t += dt * 1.5; done = e.t > 2; }
      if (done) { st.ep = null; st.epT = 6 + Math.random() * 6; }
    }
  };
  show();
  return st;
}
