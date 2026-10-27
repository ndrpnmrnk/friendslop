import { THREE, G, V3, mesh, col, tmat, lam, compose, jellify } from '../core/gfx.js';
import { T, pix } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { addPushable } from '../world/pushables.js';
import { DISTRICTS } from '../world/districts/index.js';
import { sfx } from '../core/sfx.js';
import { explosion, sparks, impactBurst } from '../game/vfx.js';

/* v0.52 — главная фишка хаба.
   «Спиритическая доска»: гигантская доска Уиджа на земле. По краям — варианты (подборки районов города).
   Посередине физическая планшетка: её толкают телом, выпадом и брошенными предметами. Вариант под линзой
   подсвечивается — это и есть голос группы.
   «Тыквенная катапульта»: готов = запрыгнул в ковш (E). Когда в ковше все (или 15 с, если внутри хотя бы
   половина) — свечи 3-2-1, рычаг бьёт, игроки летят над хабом, и дальше начинается матч.
   Всё рассчитано на группу: party.members — список участников (сейчас один игрок, позже — сеть). */

// подборки районов: название + 3 «главных» района (остальные добираются случайно)
const MIXES = [
  { name: 'Набережная', ids: ['port', 'park', 'market'], c: '#4fc3ff' },
  { name: 'Тёмная сторона', ids: ['cemetery', 'hospital', 'sewer'], c: '#9be36b' },
  { name: 'Центр', ids: ['office', 'plaza', 'foodcourt'], c: '#ff6aa8' },
  { name: 'Учёба и труд', ids: ['school', 'university', 'factory'], c: '#ffd04a' },
  { name: 'Окраина', ids: ['construction', 'gas', 'skatepark'], c: '#ff8a3d' },
  { name: 'Вечерний город', ids: ['cinema', 'shops', 'townhall'], c: '#c08bff' },
  { name: 'Старые дворы', ids: ['yard', 'cemetery', 'market'], c: '#ffb06a' },
].filter(m => m.ids.every(id => DISTRICTS.some(d => d.id === id)));
const nameOf = id => DISTRICTS.find(d => d.id === id)?.name || id;

// доска: 9 × 6 м, центр в (cx, cz), длинная сторона вдоль x
const BW = 9, BD = 6;
function boardTexture() {
  return pix('ouija52-board2', 512, 342, (g, w, h) => {
    g.translate(0, h); g.scale(1, -1);
    // фон: тёплый градиент дерева (бордо → янтарь) с зерном — в духе постеров
    const gr = g.createRadialGradient(w * .5, h * .55, w * .05, w * .5, h * .5, w * .62);
    gr.addColorStop(0, '#c4743a'); gr.addColorStop(.45, '#8c3a2c'); gr.addColorStop(1, '#3a1626'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(30,10,10,${.05 + .05 * Math.sin(y * .37)})`; g.fillRect(0, y, w, 1); }
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,220,180,.06)' : 'rgba(0,0,0,.08)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
    g.strokeStyle = '#f2c46a'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16); g.lineWidth = 1; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#f6d98a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    // буквы дугами
    const arc = (txt, r, y0) => { const n = txt.length; for (let i = 0; i < n; i++) { const a = Math.PI * (.18 + .64 * i / (n - 1)); g.save(); g.translate(w / 2 - Math.cos(a) * r, y0 - Math.sin(a) * r * .55); g.rotate(-(Math.PI / 2 - a) * .7); g.fillText(txt[i], 0, 0); g.restore(); } };
    g.font = 'bold 22px serif'; arc('АБВГДЕЖЗИКЛМНОП', 190, 250); arc('РСТУФХЦЧШЩЭЮЯ', 140, 262);
    g.font = 'bold 20px serif'; g.fillText('1 2 3 4 5 6 7 8 9 0', w / 2, 278);
    // солнце, луна, ДА/НЕТ
    g.font = 'bold 30px serif'; g.fillText('ДА', 60, 48); g.fillText('НЕТ', w - 64, 48);
    g.beginPath(); g.arc(60, 92, 16, 0, 7); g.fill(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; g.fillRect(60 + Math.cos(a) * 22 - 2, 92 + Math.sin(a) * 22 - 2, 4, 4); }
    g.beginPath(); g.arc(w - 64, 92, 16, 0, 7); g.fill(); g.fillStyle = '#5a2030'; g.beginPath(); g.arc(w - 56, 86, 14, 0, 7); g.fill(); g.fillStyle = '#f6d98a';
    g.font = 'bold 26px serif'; g.fillText('П Р О Щ А Й', w / 2, h - 30);
  });
}
function plateTexture(mix) {
  return pix('ouija52-plate2-' + (mix ? mix.name : 'random'), 192, 96, (g, w, h) => {
    g.translate(0, h); g.scale(1, -1);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1a0f22'); gr.addColorStop(1, '#3a1830'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = mix ? mix.c : '#f2c46a'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = mix ? mix.c : '#f6d98a'; g.textAlign = 'center'; g.font = 'bold 22px sans-serif'; g.fillText(mix ? mix.name : 'СЛУЧАЙНО', w / 2, 38);
    g.fillStyle = 'rgba(255,240,220,.85)'; g.font = '13px sans-serif';
    if (mix) g.fillText(mix.ids.map(nameOf).join(' · ').slice(0, 34), w / 2, 66); else g.fillText('любые районы', w / 2, 66);
  });
}

export function buildOuija(b, cx, cz) {
  const group = new THREE.Group(); group.name = 'ouija'; W.group.add(group); W.keep.push(group);
  // доска лежит на низком подиуме (на неё можно забежать — край 12 см)
  group.add(compose('ouija52-board', a => {
    a(G.box, col(0x2a1220), cx, .05, cz, BW + .5, .1, BD + .5);
    a(G.box, lam({ map: boardTexture() }, 'ouija52-face'), cx, .11, cz, BW, .02, BD);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) a(G.cyl8, col(0xf2c46a), cx + x * (BW / 2 + .1), .13, cz + z * (BD / 2 + .1), .14, .04, .14);
  }));
  addSolid(cx - BW / 2 - .25, cz - BD / 2 - .25, cx + BW / 2 + .25, cz + BD / 2 + .25, 0, .12, 'ouija');
  // варианты: три подборки по верхнему краю + «случайно» внизу
  const plates = [];
  const place = [[-3, -2.05], [0, -2.35], [3, -2.05], [0, 2.05]];
  function rollMixes() {
    const pool = MIXES.slice().sort(() => Math.random() - .5).slice(0, 3);
    return [...pool, null];
  }
  let mixes = rollMixes();
  place.forEach(([dx, dz], i) => {
    const m = new THREE.Mesh(G.box, lam({ map: plateTexture(mixes[i]), emissive: 0xffffff, emissiveMap: plateTexture(mixes[i]), emissiveIntensity: .55 }));
    m.position.set(cx + dx, .135, cz + dz); m.scale.set(2.3, .03, 1.15); m.userData.noBatch = true; group.add(m);
    plates.push({ mesh: m, x: cx + dx, z: cz + dz, w: 2.3, d: 1.15, i });
  });
  // планшетка: «сердце» с линзой-кольцом, на трёх ножках-шариках; глянцевое желе
  const pl = addPushable(b, 'planchette', cx, cz + .3, .12);
  pl.mesh.add(jellify(compose('ouija52-planchette', a => {
    const body = lam({ color: 0xffb36a }, 'ouija52-pl'), rim = col(0xffe2a0), lens = lam({ color: 0x8fe0ff, emissive: 0x2a6080, emissiveIntensity: .6, transparent: true, opacity: .7 }, 'ouija52-lens');
    const heart = new THREE.Shape(); heart.moveTo(0, -.75); heart.bezierCurveTo(.9, -.1, .75, .65, .28, .62); heart.bezierCurveTo(.08, .6, 0, .45, 0, .38); heart.bezierCurveTo(0, .45, -.08, .6, -.28, .62); heart.bezierCurveTo(-.75, .65, -.9, -.1, 0, -.75);
    const hg = new THREE.ExtrudeGeometry(heart, { depth: .16, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2, curveSegments: 10 });
    hg.rotateX(-Math.PI / 2); hg.translate(0, .3, 0); hg.computeVertexNormals();
    a(hg, body, 0, 0, 0, 1, 1, 1);
    a(G.torus, rim, 0, .53, -.05, .26, .26, .5, Math.PI / 2); a(G.cyl12, lens, 0, .52, -.05, .23, .02, .23);
    for (const [x, z] of [[-.5, .3], [.5, .3], [0, -.55]]) a(G.sph10, rim, x, .14, z, .1, .1, .1);
  }), .9));
  pl.mesh.userData.noBatch = true;
  // планшетка не уезжает с доски
  const lim = { x0: cx - BW / 2 + .7, x1: cx + BW / 2 - .7, z0: cz - BD / 2 + .7, z1: cz + BD / 2 - .7 };
  // призрачная надпись над доской: что сейчас выбрано
  const banner = pix('ouija52-banner', 256, 48, () => {}), bannerCanvas = banner.image, bctx = bannerCanvas.getContext('2d');
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .8), new THREE.MeshBasicMaterial({ map: banner, transparent: true, depthWrite: false, fog: false }));
  bannerMesh.position.set(cx, 2.6, cz); bannerMesh.userData.noOcc = true; bannerMesh.userData.noLight = true; group.add(bannerMesh);
  let shown = '';
  function drawBanner(text, color) {
    if (text === shown) return; shown = text; bctx.clearRect(0, 0, 256, 48);
    bctx.font = 'bold 26px sans-serif'; bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
    bctx.shadowColor = color; bctx.shadowBlur = 10; bctx.fillStyle = '#fff4e0'; bctx.fillText(text, 128, 24); banner.needsUpdate = true;
  }
  let sel = -1, selT = 0, last = -1;
  return {
    group, planchette: pl, plates, get mixes() { return mixes; }, get selected() { return sel; },
    // выбранная подборка → районы, которые будут на карте обязательно
    choice() { const i = sel >= 0 ? sel : 3; const m = mixes[i] || null; return m ? { name: m.name, ids: m.ids } : { name: 'Случайно', ids: null }; },
    reroll() { mixes = rollMixes(); plates.forEach(p => { const t = plateTexture(mixes[p.i]); p.mesh.material.map = t; p.mesh.material.emissiveMap = t; p.mesh.material.needsUpdate = true; }); },
    update(dt, t, camera) {
      // держим планшетку на доске
      if (pl.x < lim.x0) { pl.x = lim.x0; pl.vx = Math.abs(pl.vx) * .4; } if (pl.x > lim.x1) { pl.x = lim.x1; pl.vx = -Math.abs(pl.vx) * .4; }
      if (pl.z < lim.z0) { pl.z = lim.z0; pl.vz = Math.abs(pl.vz) * .4; } if (pl.z > lim.z1) { pl.z = lim.z1; pl.vz = -Math.abs(pl.vz) * .4; }
      pl.y = .12; pl.mesh.position.set(pl.x, pl.y, pl.z);
      // «дух» чуть тянет планшетку по кругу, когда её никто не трогает — доска живая
      const sp = Math.hypot(pl.vx, pl.vz); if (sp < .05) { pl.vx += Math.cos(t * .7) * dt * .25; pl.vz += Math.sin(t * .9) * dt * .25; }
      pl.mesh.rotation.y += (Math.atan2(pl.x - cx, -(pl.z - cz)) * .25 - pl.mesh.rotation.y) * Math.min(1, dt * 2);
      // что под линзой
      let now = -1; for (const p of plates) if (Math.abs(pl.x - p.x) < p.w / 2 + .25 && Math.abs(pl.z - p.z) < p.d / 2 + .35) now = p.i;
      if (now !== last) { last = now; selT = 0; } else selT += dt;
      if (now >= 0 && selT > .35 && sel !== now) { sel = now; sfx('pickup'); const p = plates[now]; impactBurst({ x: p.x, y: .5, z: p.z }, 0xffd8a0, 1.2); sparks({ x: p.x, y: .4, z: p.z }, 16, 0xffd27a); W.flash?.({ x: p.x, y: 0, z: p.z }, 0xffb060, .6, 6, 3); }
      for (const p of plates) { const on = p.i === sel; p.mesh.material.emissiveIntensity = on ? .9 + Math.sin(t * 6) * .25 : .35; p.mesh.position.y = .135 + (on ? .03 + Math.sin(t * 6) * .01 : 0); }
      const m = sel >= 0 ? mixes[sel] : null;
      drawBanner(sel < 0 ? 'Толкай планшетку' : m ? m.name : 'Случайный город', m ? m.c : '#f2c46a');
      bannerMesh.position.y = 2.6 + Math.sin(t * 1.6) * .08; if (camera) bannerMesh.quaternion.copy(camera.quaternion);
    },
  };
}

/* Тыквенная катапульта: рама, рычаг с противовесом, ковш-тыква. В ковше до 8 человек. */
export function buildCatapult(b, cx, cz) {
  const group = new THREE.Group(); group.name = 'catapult'; group.position.set(cx, 0, cz); W.group.add(group); W.keep.push(group);
  const wood = tmat(T.wood()), dark = col(0x2a1c18), iron = col(0x3a3440);
  group.add(compose('catapult52-frame', a => {
    for (const s of [-1, 1]) { a(G.box, wood, s * 1.1, .15, 0, .3, .3, 4.2); a(G.box, wood, s * 1.1, 1.05, .3, .22, 2.1, .22, .28, 0, 0); a(G.box, wood, s * 1.1, 1.05, -.3, .22, 2.1, .22, -.28, 0, 0);
      for (const z of [-1.7, 1.7]) a(G.cyl12, dark, s * 1.3, .38, z, .38, .14, .38, 0, 0, Math.PI / 2); }
    a(G.box, wood, 0, .15, -1.6, 2.4, .26, .3); a(G.box, wood, 0, .15, 1.6, 2.4, .26, .3); a(G.cyl8, iron, 0, 2.05, 0, .09, 2.5, .09, 0, 0, Math.PI / 2);
  }));
  // рычаг вращается вокруг оси на высоте 2.05; в покое ковш внизу у земли (к игрокам, +z)
  const arm = new THREE.Group(); arm.position.set(0, 2.05, 0); group.add(arm);
  arm.add(compose('catapult52-arm', a => { a(G.box, wood, 0, 0, 1.6, .26, .22, 4.2); a(G.box, iron, 0, 0, -.8, .9, .9, .9); for (const z of [.3, 2.8]) a(G.box, iron, 0, 0, z, .3, .26, .08); }));
  const bucket = new THREE.Group(); bucket.position.set(0, .1, 3.5); arm.add(bucket);
  bucket.add(jellify(compose('catapult52-bucket', a => {
    const pk = lam({ map: T.pumpkin() }, 'catapult52-pk'), inner = col(0xf2a24a);
    const shell = new THREE.SphereGeometry(1, 14, 9, 0, Math.PI * 2, Math.PI * .38, Math.PI * .62); a(shell, pk, 0, .55, 0, 1.15, .75, 1.15);
    a(G.cyl12, inner, 0, .62, 0, .95, .02, .95); a(G.cyl6, col(0x4a7a2a), 0, 1.15, -.95, .08, .35, .08, -.5, 0, 0);
  }), .8));
  const rest = .62, cocked = .74, fired = -1.9; // рычаг: ковш у земли → взмах назад и вверх arm.rotation.x = rest;
  // три свечи — обратный отсчёт
  const candles = [-1, 0, 1].map(i => { const c = new THREE.Group(); c.position.set(i * .7, .3, 2.3); group.add(c);
    mesh(G.cyl8, col(0xf1e8d0), 0, .25, 0, .09, .5, .09, c); const flame = mesh(G.cone6, lam({ color: 0x553322, emissive: 0x000000 }, 'catapult52-wick' + i), 0, .57, 0, .05, .14, .05, c); return { c, flame, lit: false }; });
  addSolid(cx - 1.4, cz - 2.1, cx - .8, cz + 2.1, 0, .4); addSolid(cx + .8, cz - 2.1, cx + 1.4, cz + 2.1, 0, .4);
  const seats = [[0, 0], [-.45, .3], [.45, .3], [-.45, -.3], [.45, -.3], [0, .55], [0, -.55], [.6, 0]];
  const st = { phase: 'idle', t: 0, riders: [], arm, bucket, group, candles, wait: 0 };
  const bucketWorld = (v = new V3()) => { bucket.updateMatrixWorld(true); return bucket.getWorldPosition(v); };
  function setCandle(i, on) { const c = candles[i]; if (c.lit === on) return; c.lit = on; c.flame.material.emissive.setHex(on ? 0xffa040 : 0); c.flame.material.color.setHex(on ? 0xffd27a : 0x553322); if (on) { sfx('click'); const p = c.c.getWorldPosition(new V3()); sparks({ x: p.x, y: p.y + .6, z: p.z }, 8, 0xffd27a); W.flash?.({ x: p.x, y: p.y, z: p.z }, 0xffa040, .4, 4, 2); } }
  return {
    st, bucketWorld, seats,
    near(p) { const q = bucketWorld(); return Math.hypot(p.x - q.x, p.z - q.z) < 2 && st.phase !== 'fire'; },
    join(a) { if (st.riders.includes(a)) return; st.riders.push(a); sfx('jump'); const q = bucketWorld(); impactBurst({ x: q.x, y: q.y + .6, z: q.z }, 0xffb060, 1); },
    leave(a) { st.riders = st.riders.filter(r => r !== a); },
    // members — вся группа в хабе; когда готовы все (или 15 с при половине) — отсчёт и залп
    update(dt, t, members, onFire) {
      st.t += dt;
      const ready = st.riders.length, total = Math.max(1, members.length);
      if (st.phase === 'idle') { arm.rotation.x += (rest + Math.sin(t * 2) * .01 - arm.rotation.x) * Math.min(1, dt * 6);
        if (ready > 0 && (ready >= total || (ready * 2 >= total && (st.wait += dt) > 15))) { st.phase = 'count'; st.t = 0; } else if (!ready) st.wait = 0; }
      else if (st.phase === 'count') { arm.rotation.x += (cocked - arm.rotation.x) * Math.min(1, dt * 4);
        for (let i = 0; i < 3; i++) setCandle(i, st.t > i * .7 + .2);
        if (ready === 0) { st.phase = 'idle'; candles.forEach((_, i) => setCandle(i, false)); }
        else if (st.t > 2.5) { st.phase = 'fire'; st.t = 0; sfx('boom', { v: .6 }); }
      } else if (st.phase === 'fire') {
        const k = Math.min(1, st.t / .28); arm.rotation.x = cocked + (fired - cocked) * (1 - (1 - k) * (1 - k));
        if (k >= 1 && !st.launched) { st.launched = true; const q = bucketWorld(); explosion({ x: q.x, y: q.y, z: q.z }, .5, { light: 0xffb060, debris: [0xff8a1f, 0xffd27a, 0x8a5a34] }); onFire(st.riders.slice()); }
        if (st.t > 1.6) { st.phase = 'idle'; st.launched = false; st.riders = []; st.wait = 0; candles.forEach((_, i) => setCandle(i, false)); }
      }
      bucket.rotation.x = -arm.rotation.x * .85;
      // сидящие в ковше едут вместе с ним
      const q = bucketWorld();
      st.riders.forEach((a, i) => { if (st.launched) return; const s = seats[i % seats.length]; a.pos.set(q.x + s[0], q.y + .55, q.z + s[1]); a.vel.set(0, 0, 0); });
      return { ready, total, phase: st.phase, wait: st.wait };
    },
  };
}
