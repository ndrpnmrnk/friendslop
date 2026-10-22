import { THREE, G, mesh, tmat, col, lam, glow, makeCamera, compose } from '../core/gfx.js';
import { T, rep } from '../core/textures.js';
import { makeCharacter } from '../characters/rig.js';
import { SKINS } from '../characters/skins.js';
import { sfx } from '../core/sfx.js';

/* Итоги раунда — сцена с пьедесталами.
   Участники выходят по очереди с последнего места к первому: падают сверху на свой пьедестал,
   над ними — карточка с наградой (заголовок), подписью и короткой статистикой.
   Последним выходит победитель: прожектор, конфетти, фанфары. Каждый персонаж в финале играет
   свою анимацию — по награде (роль) и по скину. */

// награды: ключ статистики → заголовок, подпись, анимация
export const AWARDS = {
  champ:   { title: 'ЧЕМПИОН', sub: s => `${s.missions} миссий · ${s.score} очков`, anim: 'dance' },
  bully:   { title: 'ГЛАВНЫЙ ХУЛИГАН', sub: s => s.sabot ? `сорвал миссий: ${s.sabot} · ударов: ${s.hits}` : `ударов: ${s.hits}`, anim: 'bully' },
  thief:   { title: 'ВОР РАУНДА', sub: s => `украл миссий: ${s.steals}`, anim: 'thief' },
  trick:   { title: 'ТРИКСТЕР', sub: s => `попались в ловушки: ${s.traps}`, anim: 'laugh' },
  skater:  { title: 'ТРЮКАЧ', sub: s => `трюков: ${s.tricks}`, anim: 'skater' },
  worker:  { title: 'РАБОТЯГА', sub: s => `выполнил миссий: ${s.missions}`, anim: 'wave' },
  star:    { title: 'ЗВЕЗДА СОБЫТИЯ', sub: s => `очков в событии: ${s.event}`, anim: 'call' },
  clumsy:  { title: 'МАСТЕР ПАДЕНИЙ', sub: s => `падений: ${s.falls}`, anim: 'dizzy' },
  tourist: { title: 'ТУРИСТ', sub: () => 'просто гулял по городу', anim: 'look' },
};
const CAT = { bully: s => s.sabot * 3 + s.hits, thief: s => s.steals * 4, trick: s => s.traps * 2, skater: s => s.tricks, worker: s => s.missions * 2, star: s => s.event / 40, clumsy: s => s.falls * 1.5 };

/* rows: [{ name, skin, score, st, me }] → по местам, с наградой у каждого (награды не повторяются) */
export function assignAwards(rows) {
  rows = rows.slice().sort((a, b) => b.score - a.score);
  const pairs = [];
  for (const r of rows) for (const [k, f] of Object.entries(CAT)) { const v = f(r.st); if (v > 0) pairs.push({ r, k, v }); }
  pairs.sort((a, b) => b.v - a.v);
  const usedK = new Set(), usedR = new Set();
  for (const p of pairs) { if (usedK.has(p.k) || usedR.has(p.r)) continue; p.r.award = p.k; usedK.add(p.k); usedR.add(p.r); }
  for (const r of rows) if (!r.award) r.award = 'tourist';
  rows[0].champ = true;
  return rows;
}

// цифра места: пиксельная (3×5), крупная, с тенью
const DIG = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'] };
function numTex(n, c) {
  const cv = document.createElement('canvas'); cv.width = 7; cv.height = 9; const g = cv.getContext('2d'), d = DIG[n];
  for (const [ox, oy, cl] of [[2, 3, '#17111f'], [1, 2, '#' + c.toString(16).padStart(6, '0')]]) { g.fillStyle = cl; d.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.fillRect(ox + x, oy + y, 1, 1); })); }
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}
export function createPodium() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x120d1c); scene.fog = new THREE.Fog(0x120d1c, 10, 26);
  scene.add(new THREE.HemisphereLight(0x8a7aba, 0x2a2434, 1.0 * Math.PI));
  const key = new THREE.SpotLight(0xffe0b0, 0, 18, 0.35, 0.5, 1.2); key.position.set(0, 9, 3); key.target.position.set(0, 1.4, 0); scene.add(key, key.target);
  const fill = new THREE.PointLight(0xb18cff, 6, 12); fill.position.set(-4, 3, 4); scene.add(fill);
  const warm = new THREE.PointLight(0xff8a1f, 5, 10); warm.position.set(4, 2.5, 3); scene.add(warm);
  // сцена: пол, задник с огоньками, три пьедестала (центр выше)
  const fl = mesh(G.plane, tmat(rep(T.pave(), 10, 10)), 0, 0, 0, 30, 30, 1, scene); fl.rotation.x = -Math.PI / 2;
  mesh(G.box, col(0x2a1f3d), 0, 4, -4.5, 22, 8, 0.4, scene);
  const bulbs = []; for (let i = 0; i < 22; i++) { const b = mesh(G.sph, glow([0xff8a1f, 0xf5c542, 0xb18cff, 0x9be36b][i % 4]), -10 + i * 0.95, 6.2 + Math.sin(i * 0.9) * 0.25, -4.25, 0.12, 0.12, 0.12, scene); bulbs.push(b); }
  const SLOTS = [{ x: 0, h: 1.5, c: 0xf5c542, n: '1' }, { x: -2.3, h: 1.0, c: 0xc8c8d8, n: '2' }, { x: 2.3, h: 0.7, c: 0xc87a3a, n: '3' }, { x: 4.4, h: 0.25, c: 0x4b3a68, n: '4' }];
  for (const s of SLOTS) {
    const p = compose('podium' + s.n, a => { a(G.box, lam({ color: 0x2a2238 }, 'podBody'), 0, s.h / 2, 0, 1.9, s.h, 1.7); a(G.box, lam({ color: s.c, emissive: s.c, emissiveIntensity: 0.15 }, 'podTop' + s.n), 0, s.h + 0.04, 0, 1.95, 0.08, 1.75);
      if (s.h > 0.4) a(G.box, lam({ map: numTex(s.n, s.c), transparent: true }, 'podNum' + s.n), 0, s.h / 2, 0.86, 0.7, 0.7, 0.01); });
    p.position.set(s.x, 0, 0); scene.add(p);
  }
  // конфетти: пиксельные квадраты (одна InstancedMesh)
  const N = 220, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.09), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), N); conf.count = 0; scene.add(conf);
  conf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const cps = []; const CC = [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff, 0xff8a1f].map(c => new THREE.Color(c));
  const camera = makeCamera(40);
  const st = { scene, camera, t: 0, rows: [], chars: [], cards: [], done: false, onCard: null, conf: 0 };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

  st.start = (rows, onCard, onDone) => {
    for (const c of st.chars) scene.remove(c.ch.root);
    st.t = 0; st.done = false; st.rows = rows; st.chars = []; st.onCard = onCard; st.onDone = onDone; cps.length = 0; conf.count = 0; key.intensity = 0;
    // выход: с последнего места к первому
    const order = rows.map((r, i) => i).reverse();
    order.forEach((place, k) => {
      const r = rows[place], s = SLOTS[place] || {x:-4.7,z:-1.2,h:0,c:0x80738d,n:place+1}, ch = makeCharacter(r.skin); ch.root.position.set(s.x, 12, s.z??.1); ch.root.rotation.y = 0; ch.root.visible = false; scene.add(ch.root);
      st.chars.push({ r, ch, place, s, at: 0.6 + k * 1.15, y: 12, vy: 0, landed: false, shown: false, ph: Math.random() * 6 });
    });
  };
  st.update = dt => {
    st.t += dt; const t = st.t;
    // камера: медленный наезд и лёгкое покачивание
    const k = Math.min(1, t / 5), e = 1 - Math.pow(1 - k, 3);
    const five=st.rows.length>4;camera.position.set((five?.35:.9)+Math.sin(t*.25)*(five?.35:.6),3.3-e*.5,(five?13.4:12.5)-e*(five?1.6:2.4));camera.lookAt(five?.35:.9,1.8,0);
    bulbs.forEach((b, i) => (b.visible = Math.sin(t * 4 + i * 1.3) > -0.6));
    let all = true;
    for (const c of st.chars) {
      const top = c.s.h + 0.08, root = c.ch.root;
      if (t < c.at) { all = false; continue; }
      root.visible = true;
      if (!c.landed) { c.vy -= 30 * dt; c.y += c.vy * dt; if (c.y <= top) { c.y = top; c.landed = true; c.landT = t; sfx('podium', { k: 3 - Math.min(3, c.place) }); for (let i = 0; i < 8; i++) puffAt(c.s.x, top); } root.position.y = c.y; }
      if (c.landed && !c.shown) { c.shown = true; st.onCard && st.onCard(c, st.cardPos(c)); if (c.place === 0) { st.conf = 4.5; sfx('fanfare'); } }
      const since = c.landed ? t - c.landT : 0;
      c.ch.animate(dt, poseFor(c, t, since, !c.landed));
      // лягушка квакает в финале, телевизор показывает «вау»
      if (c.landed && c.ch.skinId === 'frog' && Math.sin(t * 1.3 + c.ph) > 0.995) c.ch.croakNow && c.ch.croakNow();
    }
    if (st.chars.some(c => !c.landed)) all = false;
    // победитель: прожектор разгорается
    const win = st.chars.find(c => c.place === 0); if (win && win.landed) { key.intensity += (90 - key.intensity) * Math.min(1, dt * 3); key.target.position.set(win.s.x, 1.8, 0); }
    // конфетти
    if (st.conf > 0) { st.conf -= dt; for (let i = 0; i < 6 && cps.length < N; i++) cps.push({ p: new THREE.Vector3((Math.random() - 0.5) * 9, 7 + Math.random() * 2, (Math.random() - 0.5) * 3), v: new THREE.Vector3((Math.random() - 0.5) * 1.5, -1.5 - Math.random() * 1.5, 0), r: Math.random() * 6, c: CC[(Math.random() * CC.length) | 0] }); }
    let n = 0; for (const p of cps) { p.p.addScaledVector(p.v, dt); p.p.x += Math.sin(t * 3 + p.r) * dt * 0.6; p.r += dt * 5; if (p.p.y < 0.02) p.p.y = 0.02;
      _q.setFromEuler(_e.set(p.r, p.r * 0.7, 0)); _m.compose(p.p, _q, _s); conf.setMatrixAt(n, _m); conf.instanceColor.setXYZ(n, p.c.r, p.c.g, p.c.b); n++; }
    conf.count = n; conf.instanceMatrix.needsUpdate = true; if (n) conf.instanceColor.needsUpdate = true;
    // карточки едут за персонажами
    for (const c of st.chars) if (c.shown && c.card) { const p = st.cardPos(c); c.card.style.transform = `translate(${Math.round(p.x)}px,${Math.round(Math.max(p.y, 185))}px) translate(-50%,-100%)`; }
    if (all && !st.done && t > (st.chars.at(-1)?.at || 0) + 1.6) { st.done = true; st.onDone && st.onDone(); }
  };
  st.cardPos = c => { _v.set(c.s.x, c.s.h + (c.ch.d.top || 1.7) + 0.55, c.s.z||0); _v.project(camera); return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight }; };
  // пылинки при приземлении
  const puffs = []; function puffAt(x, y) { const m = mesh(G.box, lam({ color: 0xd8d0e4, transparent: true, opacity: 0.8 }, 'podPuff'), x + (Math.random() - 0.5) * 1.4, y + 0.1, (Math.random() - 0.5) * 1.2, 0.12, 0.12, 0.12, scene); puffs.push({ m, t: 0 }); }
  const upd = st.update; st.update = dt => { upd(dt); for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.t += dt; p.m.position.y += dt * 0.6; p.m.scale.setScalar(0.12 * (1 + p.t * 2)); if (p.t > 0.6) { scene.remove(p.m); puffs.splice(i, 1); } } };
  return st;
}

/* поза персонажа на пьедестале: по награде (роль) и по скину */
function poseFor(c, t, since, air) {
  const s = { t, speed: 0, air, vy: air ? -5 : 0, landed: since > 0 && since < 0.05 };
  if (air || since < 0.5) return s;
  const role = c.r.champ ? 'dance' : AWARDS[c.r.award].anim, et = since;
  const sk = c.ch.skinId;
  // фирменный жест скина — каждые несколько секунд
  if (Math.sin(t * 0.8 + c.ph) > 0.93) return { ...s, act: 'special', actK: (t * 0.8) % 1 };
  if (role === 'dance') return { ...s, emote: 'dance', emoteT: et };
  if (role === 'laugh') return { ...s, emote: 'laugh', emoteT: et };
  if (role === 'wave') return { ...s, emote: 'wave', emoteT: et };
  if (role === 'call') return { ...s, emote: 'call', emoteT: et };
  if (role === 'bully') return { ...s, swat: 0.3 * (1 - ((t * 2) % 1)), look: Math.sin(t * 2) * 0.3 };
  if (role === 'thief') return { ...s, crouch: Math.sin(t * 1.5) > 0, look: Math.sin(t * 3) * 0.8 };
  if (role === 'skater') return { ...s, air: Math.sin(t * 4) > 0.6, vy: 3, act: sk === 'shark' ? 'special' : undefined, actK: (t % 1) };
  if (role === 'dizzy') return { ...s, stun: true };
  if (role === 'look') return { ...s, act: 'look', actK: (t * 0.4) % 1, look: Math.sin(t * 1.2) * 0.7 };
  return s;
}
export const skinName = id => (SKINS[id] || {}).name || '';
