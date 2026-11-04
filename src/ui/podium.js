import { random } from '../core/random.js';
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
  // v0.70 смешные звания
  sniper:  { title: 'САМЫЙ МЕТКИЙ', sub: s => `попаданий броском: ${s.throws}`, anim: 'wave' },
  snowking:{ title: 'СНЕЖНЫЙ КОРОЛЬ', sub: s => `попал снежками: ${s.snow}`, anim: 'laugh' },
  santa:   { title: 'ПОМОЩНИК САНТЫ', sub: s => `поймал подарков: ${s.gifts}`, anim: 'dance' },
  snowfight: { title: 'СНЕГОБОРЕЦ', sub: s => `разбил снеговиков: ${s.snowfight}`, anim: 'dance' },
  tourist: { title: 'ТУРИСТ', sub: () => 'просто гулял по городу', anim: 'look' },
};
const CAT = { snowfight: s => (s.snowfight || 0) * 2.5, sniper: s => (s.throws || 0) * 1.2, snowking: s => (s.snow || 0) * 1.6, santa: s => (s.gifts || 0) * 5, bully: s => s.sabot * 3 + s.hits, thief: s => s.steals * 4, trick: s => s.traps * 2, skater: s => s.tricks, worker: s => s.missions * 2, star: s => s.event / 40, clumsy: s => s.falls * 1.5 };

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
  /* v0.71 J7: новая сцена итогов - зимняя ночная сцена. Один ряд пьедесталов дугой (1 в центре, дальше по очереди
     слева/справа), без передних щитов и задней ступени: ничего не перекрывает персонажей и карточки. */
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e1426); scene.fog = new THREE.Fog(0x0e1426, 14, 30);
  scene.add(new THREE.HemisphereLight(0x9fb2e8, 0x1c1a2c, 0.75 * Math.PI));
  const key = new THREE.SpotLight(0xffe0b0, 0, 18, 0.35, 0.5, 1.2); key.position.set(0, 9, 3); key.target.position.set(0, 1.4, 0); scene.add(key, key.target);
  const fill = new THREE.PointLight(0x8fb0ff, 7, 14); fill.position.set(-5, 3.5, 4); scene.add(fill);
  const warm = new THREE.PointLight(0xffa860, 6, 12); warm.position.set(5, 3, 3.5); scene.add(warm);
  const snowM = lam({ map: rep(T.grass(), 6, 6) }, 'podSnow71');
  const fl = mesh(G.plane, snowM, 0, 0, 0, 34, 34, 1, scene); fl.rotation.x = -Math.PI / 2;
  // задник: тёмно-синий занавес складками, сверху гирлянда, по бокам ёлки, табличка FRIENDSLOP
  scene.add(compose('podStage71', a => {
    const cur = lam({ color: 0x1d2a52 }, 'podCurtain71'), cur2 = lam({ color: 0x16203f }, 'podCurtain71b'), metal = tmat(T.metal()), wood = tmat(T.wood());
    for (let i = 0; i < 24; i++) a(G.box, i % 2 ? cur : cur2, -11.5 + i * 1, 4, -4.6, 1.02, 8, 0.25 + (i % 2) * .15);
    a(G.box, metal, 0, 7.9, -4.2, 24, .25, .3); a(G.box, wood, 0, .12, -1.2, 18, .24, 4.4); a(G.box, lam({ color: 0xdfe8f6 }, 'podSnowRim71'), 0, .26, -1.2, 18.1, .05, 4.5);
    a(G.box, tmat(T.sign('FRIENDSLOP', '#14182c', '#f5c542')), 0, 6.3, -4.3, 6.2, .9, .05);
    const pine = lam({ color: 0x1f4a3a }, 'podPine71'), snow = lam({ color: 0xe8eef8 }, 'podPineSnow71'), trunk = tmat(T.bark());
    for (const x of [-9.2, 9.2]) { a(G.cyl8, trunk, x, .5, -2.6, .25, 1, .25); for (let k = 0; k < 4; k++) { const y = 1.3 + k * 1.05, r = 1.7 - k * .36; a(G.cone4, pine, x, y, -2.6, r, 1.5, r); a(G.cone4, snow, x, y + .55, -2.6, r * .5, .45, r * .5); } a(G.sph, glow(0xf5c542), x, 5.6, -2.6, .22, .22, .22); }
  }));
  const bulbs = []; for (let i = 0; i < 26; i++) { const b = mesh(G.sph, glow([0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0][i % 4]), -12 + i * 0.96, 7.45 - Math.abs(Math.sin(i * .52)) * .55, -4.0, 0.12, 0.12, 0.12, scene); bulbs.push(b); }
  // места: 1 в центре, 2/3 по бокам, дальше 4-8 наружу; лёгкая дуга назад, чтобы крайние не заслоняли
  const PX = [0, -2.6, 2.6, -4.5, 4.5, -6.35, 6.35, -8.2], PH = [1.5, 1.05, .8, .5, .5, .32, .32, .22], PC = [0xf5c542, 0xc8d4e8, 0xd0844a];
  const SLOTS = PX.map((x, i) => ({ x, z: -Math.abs(x) * .09, h: PH[i], c: PC[i] ?? 0x5a6ea8, n: String(i + 1) }));
  const ice = lam({ map: T.ice70(), color: 0x7f9cc0 }, 'podIce71'), dk = lam({ color: 0x24304e }, 'podBody71');
  for (const s of SLOTS) {
    const W2 = 1.55, D2 = 1.4, p = compose('podium71-' + s.n, a => { a(G.box, s.n === '1' ? ice : dk, 0, s.h / 2, 0, W2, s.h, D2); a(G.box, lam({ color: s.c, emissive: s.c, emissiveIntensity: 0.18 }, 'podTop71' + s.n), 0, s.h + 0.04, 0, W2 + .06, 0.08, D2 + .06);
      a(G.box, lam({ color: 0xe8eef8 }, 'podCap71'), 0, s.h + .1, -.1, W2 * .9, .05, D2 * .7);
      if (s.h > 0.6 && DIG[s.n]) a(G.box, lam({ map: numTex(s.n, s.c), transparent: true }, 'podNum71' + s.n), 0, s.h / 2, D2 / 2 + .01, 0.6, 0.6, 0.01); });
    p.position.set(s.x, 0, s.z); scene.add(p); s.mesh = p;
  }
  // снег падает всегда (точки), отдельно от конфетти
  const snowGeo = new THREE.BufferGeometry(), sp = new Float32Array(360 * 3); for (let i = 0; i < 360; i++) { sp[i * 3] = (random() - .5) * 26; sp[i * 3 + 1] = random() * 10; sp[i * 3 + 2] = (random() - .5) * 10 + 1; }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xeef3fb, size: .07, transparent: true, opacity: .8, depthWrite: false })); scene.add(snowPts);
  const reveals=SLOTS.map(s=>{const mat=new THREE.MeshBasicMaterial({color:s.c,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),m=mesh(G.ring,mat,s.x,s.h+.095,s.z||0,.4,.4,1,scene);m.rotation.x=-Math.PI/2;m.visible=false;return{m,life:0};});
  const crown=new THREE.Group();scene.add(crown);crown.add(compose('winnerCrown32',a=>{const gold=lam({color:0xf5c542,emissive:0x986719,emissiveIntensity:.45});a(G.torus,gold,0,0,0,.23,.23,.23,Math.PI/2);for(let i=0;i<6;i++){const an=i*Math.PI/3;a(G.cone4,gold,Math.sin(an)*.23,.12,Math.cos(an)*.23,.065,.23,.065);}}));crown.visible=false;
  // конфетти: пиксельные квадраты (одна InstancedMesh)
  const N = 220, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.09), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), N); conf.count = 0; scene.add(conf);
  conf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const cps = []; const CC = [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff, 0xff8a1f].map(c => new THREE.Color(c));
  const camera = makeCamera(40);
  const st = { scene, camera, t: 0, rows: [], chars: [], cards: [], done: false, onCard: null, conf: 0 };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

  st.start = (rows, onCard, onDone) => {
    for (const c of st.chars) scene.remove(c.ch.root);
    for (const [i, sl] of SLOTS.entries()) sl.mesh.visible = i < Math.max(3, rows.length);
    st.t = 0; st.done = false; st.rows = rows; st.chars = []; st.onCard = onCard; st.onDone = onDone; cps.length = 0; conf.count = 0; st.conf=st.confBudget=0; key.intensity = 0;crown.visible=false;for(const r of reveals){r.m.visible=false;r.life=0;}for(const p of puffs)scene.remove(p.m);puffs.length=0;
    // выход: с последнего места к первому
    const order = rows.map((r, i) => i).reverse();
    order.forEach((place, k) => {
      const r = rows[place], s = SLOTS[place] || SLOTS[SLOTS.length - 1], ch = makeCharacter(r.skin); ch.root.position.set(s.x, 12, s.z); ch.root.rotation.y = 0; ch.root.visible = false; scene.add(ch.root);
      st.chars.push({ r, ch, place, s, at: 0.6 + k * 1.15, y: 12, vy: 0, landed: false, shown: false, ph: random() * 6 });
    });
  };
  st.update = dt => {
    st.t += dt; const t = st.t;
    // камера: медленный наезд и лёгкое покачивание
    const k = Math.min(1, t / 5), e = 1 - Math.pow(1 - k, 3);
    const rn=st.rows.length,wide=rn>5?1.3:rn>3?1.12:1;camera.position.set(Math.sin(t*.25)*.35,3.5-e*.4,(12.4-e*1.6)*wide);camera.lookAt(0,1.75,0);
    { const a = snowPts.geometry.attributes.position.array; for (let i = 0; i < a.length; i += 3) { a[i + 1] -= dt * (.6 + (i % 7) * .08); a[i] += Math.sin(t + i) * dt * .15; if (a[i + 1] < 0) a[i + 1] += 10; } snowPts.geometry.attributes.position.needsUpdate = true; }
    bulbs.forEach((b,i)=>{b.visible=true;b.scale.setScalar(.11+Math.sin(t*1.7+i*.4)*.012);});
    for(const r of reveals)if(r.life>0){r.life-=dt;r.m.visible=r.life>0;const k=1-r.life/.9;r.m.scale.setScalar(.35+k*1.1);r.m.material.opacity=(1-k)*.65;}
    let all = true;
    for (const c of st.chars) {
      const top = c.s.h + 0.08, root = c.ch.root;
      if (t < c.at) { all = false; continue; }
      root.visible = true;
      if (!c.landed) { c.vy -= 30 * dt; c.y += c.vy * dt; if (c.y <= top) { c.y = top; c.landed = true; c.landT = t;const ring=reveals[c.place];if(ring)ring.life=.9; sfx('podium', { k: 3 - Math.min(3, c.place) }); for (let i = 0; i < 8; i++) puffAt(c.s.x, top, c.s.z || 0); } root.position.y = c.y; }
      if (c.landed && !c.shown) { c.shown = true; st.onCard && st.onCard(c, st.cardPos(c)); if (c.place === 0) { st.conf = 4.5; sfx('fanfare'); } }
      const since = c.landed ? t - c.landT : 0;
      c.ch.animate(dt, poseFor(c, t, since, !c.landed));
      // лягушка квакает в финале, телевизор показывает «вау»
      if (c.landed && c.ch.skinId === 'frog' && Math.sin(t * 1.3 + c.ph) > 0.995) c.ch.croakNow && c.ch.croakNow();
    }
    if (st.chars.some(c => !c.landed)) all = false;
    // победитель: прожектор разгорается
    const win = st.chars.find(c => c.place === 0); if (win && win.landed) { key.intensity += (38 - key.intensity) * Math.min(1, dt * 3); key.target.position.set(win.s.x, 1.8, win.s.z || 0); crown.visible=true;crown.position.set(win.s.x,win.s.h+(win.ch.d.top||1.7)+.45+Math.sin(t*2)*.035,win.s.z||0);crown.rotation.y=t*.45; }
    // конфетти
    if (st.conf > 0) { st.conf -= dt;st.confBudget+=dt*70;const count=Math.floor(st.confBudget);st.confBudget-=count; for (let i = 0; i < count && cps.length < N; i++) cps.push({ p: new THREE.Vector3((random() - 0.5) * 9, 7 + random() * 2, (random() - 0.5) * 3), v: new THREE.Vector3((random() - 0.5) * 1.5, -1.5 - random() * 1.5, 0), r: random() * 6, c: CC[(random() * CC.length) | 0] }); }
    let n = 0; for (const p of cps) { p.p.addScaledVector(p.v, dt); p.p.x += Math.sin(t * 3 + p.r) * dt * 0.6; p.r += dt * 5; if (p.p.y < 0.02) p.p.y = 0.02;
      _q.setFromEuler(_e.set(p.r, p.r * 0.7, 0)); _m.compose(p.p, _q, _s); conf.setMatrixAt(n, _m); conf.instanceColor.setXYZ(n, p.c.r, p.c.g, p.c.b); n++; }
    conf.count = n; conf.instanceMatrix.needsUpdate = true; if (n) conf.instanceColor.needsUpdate = true;
    // карточки едут за персонажами
    for (const c of st.chars) if (c.shown && c.card) { const p = st.cardPos(c); c.card.style.transform = `translate(${Math.round(p.x)}px,${Math.round(Math.max(p.y, c.place < 3 ? 150 : 200))}px) translate(-50%,-100%)`; }
    if (all && !st.done && t > (st.chars.at(-1)?.at || 0) + 1.6) { st.done = true; st.onDone && st.onDone(); }
  };
  st.cardPos = c => { _v.set(c.s.x, c.s.h + (c.ch.d.top || 1.7) + 0.45, c.s.z); _v.project(camera); return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight }; };
  // пылинки при приземлении
  const puffs = []; function puffAt(x, y, z = 0) { const m = mesh(G.box, lam({ color: 0xd8d0e4, transparent: true, opacity: 0.8 }, 'podPuff'), x + (random() - 0.5) * 1.4, y + 0.1, z + (random() - 0.5) * 1.2, 0.12, 0.12, 0.12, scene); puffs.push({ m, t: 0 }); }
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
