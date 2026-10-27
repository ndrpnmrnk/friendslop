import { THREE, G, V3, lam, glow, tmat, compose, jellify, chrome, glassMC, lacq } from '../core/gfx.js';
import { T, pix } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { addPushable } from '../world/pushables.js';
import { DISTRICTS } from '../world/districts/index.js';
import { iconCanvas } from './icons.js';
import { sfx } from '../core/sfx.js';
import { explosion, sparks, impactBurst } from '../game/vfx.js';
import { shake } from '../game/worldfx.js';
import { CONFIG } from '../config.js';

/* v0.53 — запуск матча в три этапа, всё на группу до 8 игроков:
   1) Огромная спиритическая доска 18×11 м: только выбор РЕЖИМА. Три знака режимов на доске и три стеклянные
      карточки с правилами за ней. Планшетку толкают телами и предметами; задержалась на знаке 2 с — режим выбран.
   2) Над доской появляется голографическое табло 3×3 — рулетка сама собирает карту города из районов.
   3) Из люка в северном дворе поднимается тыквенная катапульта на 8 мест. Запрыгнул в ковш (E) — готов.
      Все в ковше (или 15 с, если внутри хотя бы половина) — три лампы отсчёта, залп, игроки летят над хабом.
   Списки участников (members) уже групповые — сеть подключится без переделки. */

const hex = c => '#' + c.toString(16).padStart(6, '0');
const additive = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
const unlit = (map, extra = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, ...extra });
const tag = o => { o.userData.noOcc = true; o.userData.noLight = true; o.userData.noBatch = true; return o; };

/* ---------- доска ---------- */
const BW = 18, BD = 11, TOP = .27;
export const SPOTS = [[-5.6, -2.5], [0, -3.3], [5.6, -2.5]];
function boardTexture() {
  const t = pix('ouija53-board', 1024, 626, (g, w, h) => {
    const gr = g.createRadialGradient(w * .5, h * .58, w * .04, w * .5, h * .5, w * .62);
    gr.addColorStop(0, '#46226a'); gr.addColorStop(.5, '#1e0f3e'); gr.addColorStop(1, '#0a0618'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,220,255,.05)' : 'rgba(0,0,10,.12)'; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    const gold = '#ffd27a'; g.strokeStyle = gold; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28); g.lineWidth = 2; g.strokeRect(26, 26, w - 52, h - 52);
    for (const [x, y] of [[26, 26], [w - 26, 26], [26, h - 26], [w - 26, h - 26]]) { g.fillStyle = gold; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); g.fillStyle = '#1e0f3e'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
    // печати под знаками режимов
    const px = x => w / 2 + x / BW * w, pz = z => h / 2 + z / BD * h;
    for (const [x, z] of SPOTS) { g.strokeStyle = 'rgba(255,210,122,.75)'; g.lineWidth = 3; g.beginPath(); g.arc(px(x), pz(z), 118, 0, 7); g.stroke();
      g.lineWidth = 1.5; g.beginPath(); g.arc(px(x), pz(z), 128, 0, 7); g.stroke();
      g.font = 'bold 14px serif'; g.fillStyle = 'rgba(255,210,122,.8)'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; g.save(); g.translate(px(x) + Math.cos(a) * 123, pz(z) + Math.sin(a) * 123); g.rotate(a + Math.PI / 2); g.fillText('✶✦✧★'[i % 4], 0, 0); g.restore(); } }
    g.fillStyle = gold; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ffb040'; g.shadowBlur = 8;
    const arc = (txt, r, y0) => { const n = txt.length; for (let i = 0; i < n; i++) { const a = Math.PI * (.16 + .68 * i / (n - 1)); g.save(); g.translate(w / 2 - Math.cos(a) * r, y0 - Math.sin(a) * r * .42); g.rotate(-(Math.PI / 2 - a) * .55); g.fillText(txt[i], 0, 0); g.restore(); } };
    g.font = 'bold 40px serif'; arc('АБВГДЕЖЗИКЛМНОП', 400, 520); g.font = 'bold 36px serif'; arc('РСТУФХЦЧШЩЭЮЯ', 300, 548);
    g.font = 'bold 32px serif'; g.fillText('1 2 3 4 5 6 7 8 9 0', w / 2, 560);
    g.font = 'bold 46px serif'; g.fillText('ДА', 92, h * .5); g.fillText('НЕТ', w - 98, h * .5);
    g.beginPath(); g.arc(92, h * .5 - 70, 22, 0, 7); g.fill(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.fillRect(92 + Math.cos(a) * 32 - 3, h * .5 - 70 + Math.sin(a) * 32 - 3, 6, 6); }
    g.beginPath(); g.arc(w - 98, h * .5 - 70, 22, 0, 7); g.fill(); g.fillStyle = '#1e0f3e'; g.beginPath(); g.arc(w - 88, h * .5 - 78, 19, 0, 7); g.fill(); g.fillStyle = gold;
    g.font = 'bold 34px serif'; g.fillText('П Р О Щ А Й', w / 2, h - 48); g.shadowBlur = 0;
  });
  t.userData.mc = 'lacquer'; return t;
}
// знак режима на доске: стеклянный круг с иконкой и названием
function spotTexture(m) {
  return pix('ouija53-spot-' + m.id, 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h * .42, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, hex(m.color) + 'ee'); gr.addColorStop(.62, hex(m.color) + '55'); gr.addColorStop(1, hex(m.color) + '00'); g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, 7); g.fill();
    g.imageSmoothingEnabled = false; g.drawImage(iconCanvas(m.icon, 1), 0, 0, 12, 12, w / 2 - 54, h * .2, 108, 108);
    g.font = '900 30px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff8f0'; g.shadowColor = '#000'; g.shadowBlur = 6; g.fillText(m.name.toUpperCase(), w / 2, h * .78);
  });
}
// большая стеклянная карточка с правилами режима
function cardTexture(m) {
  return pix('mode53-card-' + m.id, 512, 704, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, hex(m.color) + 'cc'); gr.addColorStop(.35, '#1a1236ee'); gr.addColorStop(1, '#080616f2');
    g.clearRect(0, 0, w, h); g.fillStyle = gr; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 36); g.fill();
    g.strokeStyle = hex(m.color); g.lineWidth = 8; g.shadowColor = hex(m.color); g.shadowBlur = 24; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 36); g.stroke(); g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(30, 30); g.lineTo(w * .55, 30); g.lineTo(w * .25, h * .45); g.lineTo(30, h * .45); g.fill(); // блик стекла
    g.fillStyle = 'rgba(8,6,22,.65)'; g.beginPath(); g.arc(w / 2, 160, 104, 0, 7); g.fill(); g.strokeStyle = hex(m.color); g.lineWidth = 5; g.stroke();
    g.imageSmoothingEnabled = false; g.drawImage(iconCanvas(m.icon, 1), 0, 0, 12, 12, w / 2 - 72, 88, 144, 144);
    g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = '900 54px sans-serif'; g.shadowColor = hex(m.color); g.shadowBlur = 18; g.fillText(m.name.toUpperCase(), w / 2, 338); g.shadowBlur = 0;
    g.font = 'bold 24px sans-serif'; g.fillStyle = hex(m.color); g.fillText(m.tag, w / 2, 382);
    g.font = '30px sans-serif'; g.fillStyle = '#efe8ff'; m.lines.forEach((l, i) => g.fillText(l, w / 2, 452 + i * 46));
    g.font = 'bold 22px sans-serif'; g.fillStyle = 'rgba(255,240,220,.75)'; g.fillText('▲ толкни планшетку на знак ▲', w / 2, h - 46);
  });
}

export function buildOuija(b, cx, cz, modes) {
  const group = new THREE.Group(); group.name = 'ouija'; W.group.add(group); W.keep.push(group);
  const gold = chrome(0xffd27a), edge = chrome(0xdfe4ff);
  group.add(compose('ouija53-board', a => {
    a(G.box, lacq(0x160c2a), cx, TOP / 2 - .02, cz, BW + 1.2, TOP - .02, BD + 1.2);
    a(G.box, lam({ map: boardTexture() }, 'ouija53-face'), cx, TOP - .01, cz, BW, .02, BD);
    for (const s of [-1, 1]) { a(G.box, gold, cx, TOP, cz + s * (BD / 2 + .3), BW + 1.2, .06, .12); a(G.box, gold, cx + s * (BW / 2 + .3), TOP, cz, .12, .06, BD + 1.2); }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) a(G.sph10, edge, cx + x * (BW / 2 + .4), TOP + .1, cz + z * (BD / 2 + .4), .3, .3, .3);
  }));
  // неоновая подсветка снизу подиума
  for (const s of [-1, 1]) { const u = tag(new THREE.Mesh(G.box, additive(0xb47aff, .55))); u.position.set(cx, .03, cz + s * (BD / 2 + .65)); u.scale.set(BW + 1.4, .04, .12); W.group.add(u); W.keep.push(u);
    const v = tag(new THREE.Mesh(G.box, additive(0xb47aff, .55))); v.position.set(cx + s * (BW / 2 + .65), .03, cz); v.scale.set(.12, .04, BD + 1.4); W.group.add(v); W.keep.push(v); }
  addSolid(cx - BW / 2 - .6, cz - BD / 2 - .6, cx + BW / 2 + .6, cz + BD / 2 + .6, 0, TOP, 'ouija');
  (W.lightSources ??= []).push({ x: cx, y: 3, z: cz, color: 0x9a6aff, strength: 3, range: 9 });

  // знаки режимов
  const spots = modes.map((m, i) => {
    const [dx, dz] = SPOTS[i], x = cx + dx, z = cz + dz;
    const disc = tag(new THREE.Mesh(G.plane, unlit(spotTexture(m)))); disc.rotation.x = -Math.PI / 2; disc.position.set(x, TOP + .02, z); disc.scale.setScalar(3.4); group.add(disc);
    const ring = tag(new THREE.Mesh(new THREE.RingGeometry(1.72, 1.92, 48), additive(m.color, .8))); ring.rotation.x = -Math.PI / 2; ring.position.set(x, TOP + .03, z); group.add(ring);
    // кольцо удержания: 24 сегмента загораются по очереди
    const segs = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, sg = tag(new THREE.Mesh(G.box, additive(0xffffff, 0))); sg.position.set(x + Math.sin(a) * 2.12, TOP + .04, z - Math.cos(a) * 2.12); sg.rotation.y = -a; sg.scale.set(.42, .03, .14); group.add(sg); segs.push(sg); }
    const beam = tag(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 9, 24, 1, true), beamMat(m.color))); beam.position.set(x, TOP + 4.5, z); group.add(beam);
    (W.lightSources ??= []).push({ x, y: 1.6, z, color: m.color, strength: 2.6, range: 5 });
    return { m, i, x, z, disc, ring, segs, beam };
  });
  // планшетка: «сердце» с линзой-кольцом, в 2.2 раза больше прежней — её толкают всей толпой
  const start = [cx, cz + 2.6];
  const pl = addPushable(b, 'planchette', start[0], start[1], TOP);
  const plm = jellify(compose('ouija53-planchette', a => {
    const body = lam({ color: 0xffb36a }, 'ouija53-pl'), rim = chrome(0xffe2a0), lens = glassMC(0x8fe0ff, .55);
    const heart = new THREE.Shape(); heart.moveTo(0, -.75); heart.bezierCurveTo(.9, -.1, .75, .65, .28, .62); heart.bezierCurveTo(.08, .6, 0, .45, 0, .38); heart.bezierCurveTo(0, .45, -.08, .6, -.28, .62); heart.bezierCurveTo(-.75, .65, -.9, -.1, 0, -.75);
    const hg = new THREE.ExtrudeGeometry(heart, { depth: .16, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2, curveSegments: 10 });
    hg.rotateX(-Math.PI / 2); hg.translate(0, .3, 0); hg.computeVertexNormals();
    a(hg, body, 0, 0, 0, 1, 1, 1);
    a(G.torus, rim, 0, .53, -.05, .26, .26, .5, Math.PI / 2); a(G.cyl12, lens, 0, .52, -.05, .23, .02, .23);
    for (const [x, z] of [[-.5, .3], [.5, .3], [0, -.55]]) a(G.sph10, rim, x, .14, z, .1, .1, .1);
  }), .9);
  plm.scale.setScalar(2.2); pl.mesh.add(plm); pl.mesh.userData.noBatch = true;
  const lim = { x0: cx - BW / 2 + 1.6, x1: cx + BW / 2 - 1.6, z0: cz - BD / 2 + 1.6, z1: cz + BD / 2 - 1.6 };
  // парящая надпись над доской
  const banner = pix('ouija53-banner', 512, 96, () => {}), bctx = banner.image.getContext('2d');
  const bannerMesh = tag(new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.05), unlit(banner))); bannerMesh.position.set(cx, 3.4, cz + 1.5); group.add(bannerMesh);
  let shown = '';
  function drawBanner(text, color) {
    if (text === shown) return; shown = text; bctx.clearRect(0, 0, 512, 96);
    bctx.font = '900 48px sans-serif'; bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
    bctx.shadowColor = color; bctx.shadowBlur = 18; bctx.lineWidth = 6; bctx.strokeStyle = color; bctx.strokeText(text, 256, 50); bctx.shadowBlur = 0; bctx.fillStyle = '#fff8f0'; bctx.fillText(text, 256, 50); banner.needsUpdate = true;
  }
  // 8 свечей по краю — места для восьми игроков
  const flames = [];
  for (let i = 0; i < 8; i++) { const sx = i < 4 ? -1 : 1, k = i % 4, x = cx + sx * (BW / 2 + 1.3), z = cz - BD / 2 + 1.2 + k * (BD - 2.4) / 3;
    group.add(compose('ouija53-candle', a => { a(G.cyl12, chrome(0xdfe4ff), 0, .4, 0, .2, .8, .2); a(G.cyl12, chrome(0xffd27a), 0, .84, 0, .28, .06, .28); a(G.cyl12, lam({ color: 0xfff0e0 }, 'candle53'), 0, 1.15, 0, .11, .6, .11); }).translateX(x).translateZ(z));
    const f = tag(new THREE.Mesh(G.cone6, new THREE.MeshBasicMaterial({ color: 0xffc46a, fog: false }))); f.position.set(x, 1.6, z); f.scale.set(.08, .2, .08); group.add(f); flames.push(f);
    (W.lightSources ??= []).push({ x, y: 1.8, z, color: 0xff9a40, strength: 3, range: 5 }); addSolid(x - .25, z - .25, x + .25, z + .25, 0, 1.4); }
  // огоньки-духи
  const wisps = [];
  for (let i = 0; i < 8; i++) { const m = tag(new THREE.Mesh(G.sph10, additive([0xff7ab8, 0x7ad8ff, 0xffd27a][i % 3], .55))); m.scale.setScalar(.16 + (i % 3) * .05); group.add(m); wisps.push({ m, ph: i * .8, r: 3 + (i % 3) * 1.4, h: 1.6 + (i % 2) * .9 }); }

  let sel = -1, hold = 0, locked = null, pulse = 0;
  const api = {
    group, planchette: pl, spots, modes, get selected() { return sel >= 0 ? modes[sel] : null; }, get locked() { return locked; }, get hold() { return hold; },
    onLock: null, onUnlock: null,
    reset() { pl.x = start[0]; pl.z = start[1]; pl.vx = pl.vz = 0; sel = -1; hold = 0; locked = null; shown = ''; },
    update(dt, t, camera) {
      if (pl.x < lim.x0) { pl.x = lim.x0; pl.vx = Math.abs(pl.vx) * .4; } if (pl.x > lim.x1) { pl.x = lim.x1; pl.vx = -Math.abs(pl.vx) * .4; }
      if (pl.z < lim.z0) { pl.z = lim.z0; pl.vz = Math.abs(pl.vz) * .4; } if (pl.z > lim.z1) { pl.z = lim.z1; pl.vz = -Math.abs(pl.vz) * .4; }
      pl.y = TOP; pl.mesh.position.set(pl.x, pl.y, pl.z);
      const sp = Math.hypot(pl.vx, pl.vz); if (sp < .05 && !locked) { pl.vx += Math.cos(t * .7) * dt * .2; pl.vz += Math.sin(t * .9) * dt * .2; }
      pl.mesh.rotation.y += (Math.atan2(pl.x - cx, -(pl.z - cz)) * .25 - pl.mesh.rotation.y) * Math.min(1, dt * 2);
      // какой знак под планшеткой
      let now = -1; for (const s of spots) if (Math.hypot(pl.x - s.x, pl.z - s.z) < 1.55) now = s.i;
      if (now !== sel) { sel = now; hold = 0; if (locked && locked !== modes[now]) { locked = null; api.onUnlock?.(); } if (now >= 0) sfx('pickup'); }
      if (sel >= 0 && !locked) { hold += dt / 2; if (hold >= 1) { hold = 1; locked = modes[sel]; const s = spots[sel];
        sfx('win'); impactBurst({ x: s.x, y: 1, z: s.z }, s.m.color, 1.8); sparks({ x: s.x, y: .8, z: s.z }, 30, s.m.color); W.flash?.({ x: s.x, y: 1, z: s.z }, s.m.color, 1, 10, 3); pulse = 1; api.onLock?.(locked); } }
      pulse = Math.max(0, pulse - dt * 1.5);
      for (const s of spots) { const on = s.i === sel, lk = locked === s.m, k = lk ? 1 : on ? .6 : .25;
        s.ring.material.opacity = (.35 + k * .6) * (.85 + Math.sin(t * 5 + s.i) * .15); s.disc.material.color.setScalar(.55 + k * .45 + (lk ? pulse * .5 : 0));
        s.disc.position.y = TOP + .02 + (on ? .02 : 0); s.beam.material.uniforms.k.value = lk ? .55 + Math.sin(t * 6) * .1 : on ? .35 : .12;
        const lit = on ? Math.floor((lk ? 1 : hold) * 24) : 0; s.segs.forEach((g, k2) => { g.material.opacity = k2 < lit ? .95 : .12; g.material.color.setHex(k2 < lit ? s.m.color : 0xffffff); }); }
      const m = locked || (sel >= 0 ? modes[sel] : null);
      drawBanner(locked ? 'РЕЖИМ: ' + locked.name.toUpperCase() : m ? m.name + '…' : 'ТОЛКАЙ ПЛАНШЕТКУ', m ? hex(m.color) : '#b47aff');
      for (const f of flames) { const k = .85 + Math.sin(t * 17 + f.position.x * 3) * .1 + Math.sin(t * 7.3 + f.position.z) * .08; f.scale.set(.08 * k, .2 * k, .08 * k); }
      for (const w of wisps) { const a = t * .45 + w.ph, px = cx + Math.cos(a) * w.r * 1.5, pz = cz + Math.sin(a) * w.r * .9, tg = sel >= 0 ? spots[sel] : null;
        w.m.position.set(tg ? px + (tg.x - px) * .45 : px, w.h + Math.sin(t * 2 + w.ph) * .3, tg ? pz + (tg.z - pz) * .45 : pz); w.m.material.opacity = .35 + Math.sin(t * 3 + w.ph) * .15; }
      bannerMesh.position.y = 3.4 + Math.sin(t * 1.6) * .1; if (camera) bannerMesh.quaternion.copy(camera.quaternion);
    },
  };
  return api;
}

// столб света: аддитивный цилиндр, к верху тает
export function beamMat(color) {
  return new THREE.ShaderMaterial({ uniforms: { c: { value: new THREE.Color(color) }, k: { value: .2 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 c; uniform float k; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 1.6) * k * (0.75 + 0.25 * sin(vUv.x * 62.83)); gl_FragColor = vec4(c * a, a); }' });
}

/* ---------- карточки режимов ---------- */
export function buildModeCards(b, cx, cz, modes, xs) {
  const group = new THREE.Group(); W.group.add(group); W.keep.push(group);
  const frame = chrome(0xdfe4ff), cards = modes.map((m, i) => {
    const x = cx + xs[i];
    group.add(compose('modecard53-frame', a => { for (const s of [-1, 1]) a(G.cyl12, frame, s * 2.25, 3.1, 0, .09, 6.2, .09); a(G.box, frame, 0, 6.15, 0, 4.7, .14, .14); a(G.box, frame, 0, .45, 0, 4.7, .1, .1); a(G.box, lacq(0x161032), 0, .12, 0, 5, .24, 1.2); }).translateX(x).translateZ(cz));
    const back = new THREE.Mesh(G.box, glassMC(0x6a7aff, .3)); back.position.set(x, 3.3, cz - .06); back.scale.set(4.4, 5.6, .05); group.add(back);
    const face = tag(new THREE.Mesh(G.plane, unlit(cardTexture(m)))); face.position.set(x, 3.3, cz + .03); face.scale.set(4.3, 5.9, 1); group.add(face);
    addSolid(x - 2.5, cz - .6, x + 2.5, cz + .6, 0, 6.3);
    (W.lightSources ??= []).push({ x, y: 3, z: cz + 1.5, color: m.color, strength: 2.4, range: 6 });
    return { m, face, x };
  });
  return {
    cards, update(dt, t, sel, locked) {
      for (const c of cards) { const on = sel === c.m, lk = locked === c.m, any = !!(sel || locked);
        const k = lk ? 1.15 + Math.sin(t * 5) * .08 : on ? 1.05 : any ? .5 : .9; c.face.material.color.setScalar(c.face.material.color.r + (k - c.face.material.color.r) * Math.min(1, dt * 6));
        const s = lk ? 1.04 : 1; c.face.scale.x += (4.3 * s - c.face.scale.x) * Math.min(1, dt * 6); c.face.scale.y += (5.9 * s - c.face.scale.y) * Math.min(1, dt * 6); }
    },
  };
}

/* ---------- рулетка карты: голографическое табло 3×3 над доской ---------- */
const DICON = { yard: 'cat', park: 'leaves', plaza: 'pumpkin', shops: 'cart', construction: 'brick', cemetery: 'ghost', gas: 'energy', market: 'tomato', school: 'puzzle', foodcourt: 'burger',
  sewer: 'pipes', office: 'mail', port: 'fish', skatepark: 'race', hospital: 'badge', factory: 'gear', townhall: 'bells', university: 'puzzle', cinema: 'mask' };
const CARD = 128;
function reelTexture() {
  return pix('reel53', CARD, CARD * DISTRICTS.length, (g, w) => {
    DISTRICTS.forEach((d, i) => { const y = i * CARD, hue = (i * 47) % 360;
      const gr = g.createLinearGradient(0, y, 0, y + CARD); gr.addColorStop(0, `hsl(${hue},85%,62%)`); gr.addColorStop(1, `hsl(${(hue + 40) % 360},70%,26%)`); g.fillStyle = gr; g.fillRect(2, y + 2, w - 4, CARD - 4);
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(2, y + 2, w - 4, 3);
      g.imageSmoothingEnabled = false; g.drawImage(iconCanvas(DICON[d.id] || 'pumpkin', 1), 0, 0, 12, 12, w / 2 - 30, y + 14, 60, 60);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = 'bold 17px sans-serif'; g.shadowColor = '#000'; g.shadowBlur = 4;
      const words = d.name.split(' '); if (words.length > 1 && d.name.length > 11) { g.fillText(words.slice(0, Math.ceil(words.length / 2)).join(' '), w / 2, y + 94); g.fillText(words.slice(Math.ceil(words.length / 2)).join(' '), w / 2, y + 114); }
      else g.fillText(d.name, w / 2, y + 102); g.shadowBlur = 0; });
  });
}
// случайная карта: 9 разных районов; порт — только в южном ряду (как в генераторе)
export function randomMap(n = CONFIG.grid) {
  const ids = DISTRICTS.map(d => d.id).sort(() => Math.random() - .5).slice(0, n * n), pi = ids.indexOf('port');
  if (pi >= 0) { const row = [...Array(n)].map((_, gx) => gx * n + n - 1); if (!row.includes(pi)) { const to = row[(Math.random() * n) | 0]; [ids[pi], ids[to]] = [ids[to], ids[pi]]; } }
  return ids;
}
export function buildRoulette(b, cx, cy, cz) {
  const n = CONFIG.grid, cell = 2.6, gap = .28, size = n * cell + (n + 1) * gap, root = new THREE.Group(); root.position.set(cx, cy, cz); root.rotation.x = .18; root.scale.setScalar(.001); root.visible = false; W.group.add(root); W.keep.push(root);
  const frame = chrome(0xdfe4ff);
  root.add(compose('roulette53-frame', a => { for (const s of [-1, 1]) { a(G.box, frame, s * size / 2, 0, 0, .18, size + .4, .18); a(G.box, frame, 0, s * size / 2, 0, size + .4, .18, .18); }
    for (let i = 1; i < n; i++) { const o = -size / 2 + i * (cell + gap) + gap / 2; a(G.box, frame, o, 0, -.02, .06, size, .06); a(G.box, frame, 0, o, -.02, size, .06, .06); } }));
  const back = new THREE.Mesh(G.box, glassMC(0x3a4aff, .35)); back.scale.set(size, size, .06); back.position.z = -.08; root.add(back);
  const title = pix('roulette53-title', 512, 80, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = '900 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#4fe6ff'; g.shadowBlur = 16; g.fillStyle = '#eafcff'; g.fillText('КАРТА ГОРОДА', w / 2, h / 2); });
  const tm = tag(new THREE.Mesh(G.plane, unlit(title))); tm.position.set(0, size / 2 + .75, .05); tm.scale.set(size * .9, size * .9 * 80 / 512, 1); root.add(tm);
  const base = reelTexture(), N = DISTRICTS.length, reels = [];
  for (let gz = 0; gz < n; gz++) for (let gx = 0; gx < n; gx++) {
    const t = base.clone(); t.needsUpdate = true; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1 / N);
    const m = tag(new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: t, fog: false }))); m.position.set(-size / 2 + gap + cell / 2 + gx * (cell + gap), size / 2 - gap - cell / 2 - gz * (cell + gap), .04); m.scale.set(cell, cell, 1); root.add(m);
    const glowF = tag(new THREE.Mesh(G.plane, additive(0xffffff, 0))); glowF.position.copy(m.position); glowF.position.z = .06; glowF.scale.set(cell * 1.08, cell * 1.08, 1); root.add(glowF);
    reels.push({ gx, gz, m, t, pos: Math.random() * N, from: 0, to: 0, dur: 1, el: 0, stopped: true, glow: glowF });
  }
  const st = { phase: 'hidden', t: 0, ids: null, onDone: null, lastTick: 0 };
  const setPos = r => { r.t.offset.y = 1 - (((r.pos % N) + N) % N + 1) / N; };
  reels.forEach(setPos);
  return {
    root, st, get done() { return st.phase === 'done'; }, get ids() { return st.ids; },
    hide() { st.phase = 'hidden'; root.visible = false; root.scale.setScalar(.001); st.ids = null; },
    spin(ids, onDone) {
      st.ids = ids; st.onDone = onDone; if (st.phase === 'hidden') { st.phase = 'appear'; sfx('spring'); } else st.phase = 'spin'; root.visible = true; st.t = 0;
      reels.forEach((r, k) => { const idx = DISTRICTS.findIndex(d => d.id === ids[r.gx * n + r.gz]); const turns = 3 + Math.floor(k * .6), base0 = Math.ceil(r.pos / N) * N;
        r.from = r.pos; r.to = base0 + turns * N + idx; r.dur = 2.2 + k * .32; r.el = 0; r.stopped = false; });
    },
    update(dt, t) {
      st.t += dt;
      if (st.phase === 'appear') { const k = Math.min(1, st.t / .7), e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); root.scale.setScalar(Math.max(.001, e));
        for (const r of reels) { r.pos += dt * 12; setPos(r); }
        if (k >= 1) { st.phase = 'spin'; st.t = 0; reels.forEach(r => { r.from = r.pos; r.to = Math.max(r.to, Math.ceil(r.pos / N) * N + 3 * N + (((r.to % N) + N) % N)); }); } }
      else if (st.phase === 'spin') {
        let all = true;
        for (const r of reels) { if (r.stopped) continue; all = false;
          r.el += dt; const k = Math.min(1, r.el / r.dur), e = 1 - Math.pow(1 - k, 3); const prev = Math.floor(r.pos); r.pos = r.from + (r.to - r.from) * e; setPos(r);
          if (Math.floor(r.pos) !== prev && t - st.lastTick > .045) { st.lastTick = t; sfx('tick'); }
          if (k >= 1) { r.stopped = true; r.pos = r.to; setPos(r); r.glow.material.opacity = 1; sfx('pickup'); const p = r.m.getWorldPosition(new V3()); impactBurst({ x: p.x, y: p.y, z: p.z }, 0x9af0ff, .9); } }
        if (all) { st.phase = 'done'; sfx('win'); const p = root.getWorldPosition(new V3()); sparks({ x: p.x, y: p.y, z: p.z }, 40, 0x9af0ff); st.onDone?.(st.ids); }
      }
      for (const r of reels) r.glow.material.opacity = Math.max(0, r.glow.material.opacity - dt * 2.2);
      root.position.y = cy + Math.sin(t * 1.3) * .12;
    },
  };
}

/* ---------- тыквенная катапульта на 8 мест, поднимается из люка ---------- */
export function buildCatapult(b, cx, cz) {
  const group = new THREE.Group(); group.name = 'catapult'; W.group.add(group); W.keep.push(group);
  const pitW = 8, pitD = 10, depth = 5.2;
  // шахта люка (видна, когда створки разъехались) и сами створки в чёрно-жёлтую полоску
  group.add(compose('catapult53-pit', a => { const wall = lacq(0x12101e); for (const s of [-1, 1]) { a(G.box, wall, cx + s * pitW / 2, -depth / 2, cz, .2, depth, pitD); a(G.box, wall, cx, -depth / 2, cz + s * pitD / 2, pitW, depth, .2); }
    a(G.box, wall, cx, -depth, cz, pitW, .2, pitD); for (let k = 0; k < 4; k++) a(G.box, glow(0xffb43a), cx - pitW / 2 + .12, -.6 - k * 1.1, cz, .04, .1, pitD - .4); }));
  const dm = lacq(0x2a2a3a), hz = tmat(T.hazard()), doors = [-1, 1].map(s => { const d = new THREE.Mesh(G.box, [dm, dm, hz, dm, dm, dm]); d.position.set(cx + s * pitW / 4, .04, cz); d.scale.set(pitW / 2, .08, pitD); d.userData.noBatch = true; group.add(d); return { d, s }; });
  // сама катапульта (поднимается целиком)
  const rig = new THREE.Group(); rig.position.set(cx, -depth, cz); group.add(rig);
  const steel = chrome(0xdfe4ff), body = lacq(0x3a1a5a), purple = lacq(0x6a2aa8);
  rig.add(compose('catapult53-frame', a => {
    a(G.box, body, 0, .15, 0, pitW - .3, .3, pitD - .3); a(G.box, purple, 0, .32, 0, pitW - 1, .06, pitD - 1);
    for (const s of [-1, 1]) { a(G.box, steel, s * 1.8, 1.9, .5, .3, 3.6, .3, .26, 0, 0); a(G.box, steel, s * 1.8, 1.9, -.5, .3, 3.6, .3, -.26, 0, 0); a(G.cyl12, steel, s * 1.8, 3.6, 0, .32, .4, .32, 0, 0, Math.PI / 2);
      for (const z of [-3.6, 3.6]) a(G.cyl12, lacq(0x1a1a2a), s * (pitW / 2 - .7), .55, z, .55, .3, .55, 0, 0, Math.PI / 2); }
    a(G.cyl12, steel, 0, 3.6, 0, .14, 3.7, .14, 0, 0, Math.PI / 2);
  }));
  const arm = new THREE.Group(); arm.position.set(0, 3.6, 0); rig.add(arm);
  arm.add(compose('catapult53-arm', a => { a(G.box, purple, 0, 0, 2.6, .4, .34, 5.6); a(G.box, steel, 0, 0, -1.1, 1.3, 1.3, 1.3); for (const z of [.6, 4.6]) a(G.box, steel, 0, 0, z, .48, .42, .1); }));
  const bucket = new THREE.Group(); bucket.position.set(0, .2, 5.4); arm.add(bucket);
  bucket.add(jellify(compose('catapult53-bucket', a => {
    const pk = lam({ map: T.pumpkin() }, 'catapult52-pk'), inner = lam({ color: 0xffa04a, emissive: 0x6a2a00 }, 'catapult53-in');
    const shell = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, Math.PI * .4, Math.PI * .6); a(shell, pk, 0, .9, 0, 2.3, 1.2, 2.3);
    a(G.cyl12, inner, 0, 1.0, 0, 2.05, .03, 2.05); a(G.cyl6, lacq(0x2a6a2a), 0, 1.9, -2.0, .14, .6, .14, -.5, 0, 0);
  }), .8));
  // лампы отсчёта на мачте: красная, янтарная, зелёная
  const lamps = [0xff3a5a, 0xffb43a, 0x7aff9a].map((c, i) => { const m = new THREE.Mesh(G.sph10, lam({ color: 0x222233, emissive: 0, emissiveIntensity: 1 }, 'cat53-lamp' + i)); m.position.set(-2.8, 4.3 - i * .7, 3.2); m.scale.setScalar(.28); m.userData.noBatch = true; rig.add(m); return { m, c, lit: false }; });
  rig.add(compose('catapult53-mast', a => { a(G.cyl12, steel, -2.8, 2.2, 3.2, .08, 4.4, .08); a(G.box, steel, -2.8, 3.6, 3.2, .5, 1.9, .1); }));
  const solids = [addSolid(cx - pitW / 2, cz - pitD / 2, cx + pitW / 2, cz + pitD / 2, 0, .35)]; solids.forEach(s => s.on = false);
  const seats = [[0, 0], [-.9, .5], [.9, .5], [-.9, -.6], [.9, -.6], [0, 1.15], [0, -1.2], [1.4, -.05]];
  const st = { phase: 'hidden', t: 0, riders: [], arm, bucket, rig, wait: 0, launched: false };
  const rest = .5, cocked = .62, fired = -1.95; arm.rotation.x = rest;
  const bucketWorld = (v = new V3()) => { bucket.updateMatrixWorld(true); return bucket.getWorldPosition(v); };
  function setLamp(i, on) { const L = lamps[i]; if (L.lit === on) return; L.lit = on; L.m.material.color.setHex(on ? L.c : 0x222233); L.m.material.emissive.setHex(on ? L.c : 0);
    if (on) { sfx('click'); const p = L.m.getWorldPosition(new V3()); sparks({ x: p.x, y: p.y, z: p.z }, 10, L.c); W.flash?.({ x: p.x, y: p.y, z: p.z }, L.c, .5, 5, 2); } }
  const api = {
    st, bucketWorld, seats, get raised() { return st.phase === 'idle' || st.phase === 'count' || st.phase === 'fire'; },
    show() { if (st.phase === 'hidden' || st.phase === 'lowering') { st.phase = 'rising'; st.t = 0; sfx('door'); } },
    reset() { st.phase = 'hidden'; st.riders = []; st.launched = false; st.wait = 0; rig.position.y = -depth; arm.rotation.x = rest; lamps.forEach((_, i) => setLamp(i, false)); solids.forEach(s => s.on = false); for (const { d, s } of doors) d.position.x = cx + s * pitW / 4; },
    hide() { if (st.phase === 'hidden') return; st.riders = []; st.phase = 'lowering'; st.t = 0; lamps.forEach((_, i) => setLamp(i, false)); },
    near(p) { const q = bucketWorld(); return api.raised && Math.hypot(p.x - q.x, p.z - q.z) < 2.8 && st.phase !== 'fire'; },
    join(a) { if (!api.raised || st.riders.includes(a) || st.riders.length >= 8) return false; st.riders.push(a); sfx('jump'); const q = bucketWorld(); impactBurst({ x: q.x, y: q.y + 1, z: q.z }, 0xffb060, 1); return true; },
    leave(a) { st.riders = st.riders.filter(r => r !== a); },
    update(dt, t, members, onFire) {
      st.t += dt; const ready = st.riders.length, total = Math.max(1, members.length);
      const open = st.phase === 'hidden' ? 0 : st.phase === 'lowering' ? Math.max(0, 1 - st.t / 1.2) : st.phase === 'rising' ? Math.min(1, st.t / .6) : 1;
      for (const { d, s } of doors) d.position.x = cx + s * (pitW / 4 + open * (pitW / 2 + .2));
      if (st.phase === 'rising') { const k = Math.min(1, Math.max(0, (st.t - .45) / 1.8)), e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); rig.position.y = -depth * (1 - e);
        if (Math.random() < dt * 30) sparks({ x: cx + (Math.random() - .5) * pitW, y: .1, z: cz + (Math.random() < .5 ? -1 : 1) * pitD / 2 }, 3, 0xffd27a);
        if (k >= 1) { st.phase = 'idle'; st.t = 0; solids.forEach(s => s.on = true); explosion({ x: cx, y: .3, z: cz }, .35, { light: 0x9a6aff, debris: [0xb47aff, 0xffd27a] }); sfx('land', { v: 1.5 }); shake(.4); } }
      else if (st.phase === 'lowering') { rig.position.y = -depth * Math.min(1, st.t / 1.2); solids.forEach(s => s.on = false); if (st.t > 1.3) { st.phase = 'hidden'; rig.position.y = -depth; } }
      else if (st.phase === 'idle') { arm.rotation.x += (rest + Math.sin(t * 2) * .012 - arm.rotation.x) * Math.min(1, dt * 6);
        if (ready > 0 && (ready >= total || (ready * 2 >= total && (st.wait += dt) > 15))) { st.phase = 'count'; st.t = 0; } else if (!ready) st.wait = 0; }
      else if (st.phase === 'count') { arm.rotation.x += (cocked - arm.rotation.x) * Math.min(1, dt * 4);
        for (let i = 0; i < 3; i++) setLamp(i, st.t > i * .75 + .2);
        if (ready === 0) { st.phase = 'idle'; lamps.forEach((_, i) => setLamp(i, false)); }
        else if (st.t > 2.6) { st.phase = 'fire'; st.t = 0; sfx('boom', { v: .7 }); } }
      else if (st.phase === 'fire') { const k = Math.min(1, st.t / .3); arm.rotation.x = cocked + (fired - cocked) * (1 - (1 - k) * (1 - k));
        if (k >= 1 && !st.launched) { st.launched = true; const q = bucketWorld(); explosion({ x: q.x, y: q.y, z: q.z }, .7, { light: 0xffb060, debris: [0xff8a1f, 0xffd27a, 0xb47aff] }); onFire(st.riders.slice()); }
        if (st.t > 1.8) { st.phase = 'idle'; st.launched = false; st.riders = []; st.wait = 0; lamps.forEach((_, i) => setLamp(i, false)); } }
      bucket.rotation.x = -arm.rotation.x * .9;
      const q = bucketWorld();
      st.riders.forEach((a, i) => { if (st.launched) return; const s = seats[i % seats.length]; a.pos.set(q.x + s[0], q.y + 1.0, q.z + s[1]); a.vel.set(0, 0, 0); });
      return { ready, total, phase: st.phase, wait: st.wait };
    },
  };
  return api;
}
