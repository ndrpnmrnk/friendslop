import { random } from '../core/random.js';
import { THREE, G, V3, mesh, col, lam, tmat, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { rockCone, cap } from './hub-island.js';
import { burst, puff, smokeRing } from '../world/particles.js';
import { sfx } from '../core/sfx.js';
import { spawnCoin } from '../game/coins.js';
import { progress, levelOf } from '../game/progress.js';
import { iconCanvas } from './icons.js';

/* v0.72 «Свалка-мастерская» - остров-свалка, пристроенный к восточному краю главного острова хаба.
   Без надписей в мире: всё объясняют образы, иконки, свет и анимация.
   Открывается по основному уровню игрока (свалка - дополнение к матчам, а не отдельная игра):
     ур.1 - ворота открываются, кучи хлама: бьёшь (ЛКМ) или кидаешь предметы - вылетают детали, летят к тебе;
           пустую кучу заново засыпает дирижабль (ящики на парашютах) - наглядный таймер без цифр;
     ур.2 - печь: детали → фисты (фисты выкатываются настоящими монетами);
     ур.3 - верстак: улучшения свалки за детали (больше куч, быстрее завоз, магнит);
     ур.4 - гараж: бот-помощник из деталей, экспедиции 10 / 30 мин в реальном времени.
   Валюта «детали» и опыт свалки - свои, хранятся в аккаунте (friendslop.junk.v1), прогресс у каждого свой. */
export const JUNK_KEY = 'friendslop.junk.v1';
export const JUNK = { c: new V3(47, 0, -2), r: 12.5, bridge: { x0: 29.2, x1: 35.4, z0: -3.6, z1: -.4 } };
const jr = th => JUNK.r + Math.sin(th * 4 + 2) * .8 + Math.sin(th * 9) * .35;
export function junkWalk(x, z) { const B = JUNK.bridge; if (x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1) return true; const dx = x - JUNK.c.x, dz = z - JUNK.c.z; return Math.hypot(dx, dz) < jr(Math.atan2(dz, dx)) - .5; }
const DEF = () => ({ parts: 0, xp: 0, up: { piles: 0, regrow: 0, magnet: 0 }, bot: { built: false, until: 0, dur: 0, haul: 0 }, seen: {} });
export function junkData() { try { const d = JSON.parse(localStorage.getItem(JUNK_KEY) || 'null'); return d ? { ...DEF(), ...d, up: { ...DEF().up, ...(d.up || {}) }, bot: { ...DEF().bot, ...(d.bot || {}) }, seen: d.seen || {} } : DEF(); } catch { return DEF(); } }
function save(d) { try { localStorage.setItem(JUNK_KEY, JSON.stringify(d)); } catch { } dispatchEvent(new Event('junkchange')); }
export const junkLevel = xp => Math.floor(Math.sqrt(Math.max(0, xp) / 25));
const UNLOCK = { piles: 1, oven: 2, bench: 3, garage: 4 };
const UPG = { piles: { max: 2, cost: [30, 90], icon: 'pile' }, regrow: { max: 2, cost: [40, 110], icon: 'ship' }, magnet: { max: 1, cost: [70], icon: 'magnet' } };
const PILES = [[-1, -2.5], [3.8, 1.2], [-4.2, 2.6], [1, 5.2], [-3.4, -6.2], [6.2, -2.2], [-7.6, -.8]];
const pl = () => levelOf(progress().xp);
export function buildJunk(group) {
  const C = JUNK.c, g = new THREE.Group(); g.name = 'junk'; group.add(g); W.keep.push(g);
  const rust = tmat(T.rust ? T.rust() : T.metal()), metal = tmat(T.metal()), wood = tmat(T.wood()), dark = col(0x2b2533);
  // остров: камень, снежный верх с рыжими проплешинами, сосульки по кромке
  const rock = rockCone(jr, 24, 'junk-rock'); rock.position.copy(C); g.add(rock);
  for (const m of cap(jr)) { m.position.x += C.x; m.position.z += C.z; g.add(m); }
  g.add(compose('junk-floor', a => { for (let i = 0; i < 9; i++) { const an = i * 2.1, r = 3 + (i % 4) * 2; a(G.disc, lam({ color: 0x6a4a3a }, 'junk-dirt'), C.x + Math.cos(an) * r, .02, C.z + Math.sin(an) * r, 1.2 + (i % 3) * .5, 1, .8 + (i % 2) * .6, -Math.PI / 2, 0, an); } }));
  // мост: ржавые трубы-перила, настил из листов железа
  const B = JUNK.bridge; g.add(compose('junk-bridge', a => { for (let x = B.x0; x < B.x1; x += .75) a(G.box, rust, x + .37, .04, (B.z0 + B.z1) / 2, .72, .08, B.z1 - B.z0, 0, 0, Math.sin(x * 3) * .02);
    for (const s of [B.z0, B.z1]) { a(G.cyl8, metal, (B.x0 + B.x1) / 2, .95, s, .06, B.x1 - B.x0, .06, 0, 0, Math.PI / 2); for (let x = B.x0 + .3; x < B.x1; x += 1.5) a(G.cyl8, metal, x, .48, s, .05, .95, .05); } }));
  for (const s of [B.z0, B.z1]) addSolid(B.x0, s - .06, B.x1, s + .06, 0, 1);
  // декор: ржавые машины, стиральные машины, покрышки, неоновая шестерёнка-«вывеска» без букв
  g.add(compose('junk-decor', a => { const car = (x, z, ry, c) => { a(G.box, lam({ color: c }, 'junk-car' + c), x, .55, z, 1.8, .7, 3.6, 0, ry, .08); a(G.box, lam({ color: c }, 'junk-car' + c), x, 1.15, z + Math.cos(ry) * .2, 1.6, .55, 1.8, 0, ry, .08); for (const [dx, dz] of [[-.8, 1.1], [.8, 1.1], [-.8, -1.1], [.8, -1.1]]) a(G.cyl8, dark, x + dx * Math.cos(ry) + dz * Math.sin(ry), .3, z - dx * Math.sin(ry) + dz * Math.cos(ry), .32, .22, .32, 0, ry, Math.PI / 2); };
    car(C.x + 9.5, C.z + 3, .4, 0x6a8a9a); car(C.x - 6, C.z + 8.5, -1.2, 0x9a5a3a);
    for (const [x, z] of [[8.5, 7.5], [9.6, 6.8], [-9.8, -4.2]]) { a(G.box, col(0xd8d8d8), C.x + x, .45, C.z + z, .8, .9, .8); a(G.cyl12, dark, C.x + x, .5, C.z + z + .41, .26, .02, .26, Math.PI / 2, 0, 0); }
    for (let i = 0; i < 7; i++) { const an = i * .9 + 3.4, r = 10.5; a(G.torus, dark, C.x + Math.cos(an) * r, .12 + (i % 3) * .22, C.z + Math.sin(an) * r, .35, .35, .9, Math.PI / 2, 0, 0); } }));
  addSolid(C.x + 8.3, C.z + 1, C.x + 10.7, C.z + 5, 0, 1.5); addSolid(C.x - 7.8, C.z + 7.2, C.x - 4.2, C.z + 9.8, 0, 1.5);
  const gear = new THREE.Group(); gear.position.set(C.x - 1, 6.5, C.z - 10.5); g.add(gear);
  gear.add(compose('junk-gear', a => { const n = lam({ color: 0xff8a1f, emissive: 0xff8a1f, emissiveIntensity: 1.1 }, 'junk-neon'); a(G.torus, n, 0, 0, 0, 1.4, 1.4, 1.2); for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; a(G.box, n, Math.cos(an) * 1.75, Math.sin(an) * 1.75, 0, .4, .4, .15, 0, 0, an); } }));
  for (const s of [-1, 1]) g.add(compose('junk-gearpost' + s, a => a(G.box, metal, C.x - 1 + s * 1.6, 3, C.z - 10.5, .14, 6, .14)));
  (W.lightSources ??= []).push({ x: C.x - 1, y: 5, z: C.z - 9.5, color: 0xff8a1f, strength: 2.5, range: 8 }, { x: C.x, y: 4, z: C.z, color: 0xffd8a0, strength: 2, range: 11 });

  /* ---------- ворота с лампой-замком у моста ---------- */
  const gate = new THREE.Group(); gate.position.set(B.x0 + .4, 0, (B.z0 + B.z1) / 2); g.add(gate);
  gate.add(compose('junk-gateposts', a => { for (const s of [-1, 1]) { a(G.box, rust, 0, 1.4, s * 1.75, .3, 2.8, .3); a(G.cone4, lam({ color: 0xeef3fb }, 'rail71-snow'), 0, 2.95, s * 1.75, .3, .25, .3); } a(G.box, rust, 0, 2.75, 0, .25, .2, 3.6); }));
  const bar = new THREE.Group(); gate.add(bar); bar.add(compose('junk-gatebar', a => { for (let k = 0; k < 5; k++) a(G.box, metal, 0, .25 + k * .5, 0, .08, .08, 3.2); for (let k = 0; k < 4; k++) a(G.box, rust, 0, 1.2, -1.3 + k * .87, .1, 2.3, .1); a(G.box, col(0xf5c542), .06, 1.2, 0, .02, .3, 3.2); }));
  const lampM = lam({ color: 0xff3a3a, emissive: 0xff3a3a, emissiveIntensity: 1.2 }, 'junk-lamp'); const lamp = mesh(G.sph, lampM, 0, 3.1, 0, .22, .22, .22, gate);
  const lockC = document.createElement('canvas'); lockC.width = lockC.height = 64; const lockT = new THREE.CanvasTexture(lockC); lockT.magFilter = THREE.NearestFilter;
  const lockS = new THREE.Sprite(new THREE.SpriteMaterial({ map: lockT, transparent: true })); lockS.position.set(-.2, 3.8, 0); lockS.scale.set(.9, .9, 1); gate.add(lockS);
  { const q = lockC.getContext('2d'); q.imageSmoothingEnabled = false; q.fillStyle = '#17111f'; q.fillRect(14, 26, 36, 30); q.fillStyle = '#f5c542'; q.fillRect(17, 29, 30, 24); q.strokeStyle = '#f5c542'; q.lineWidth = 5; q.beginPath(); q.arc(32, 26, 11, Math.PI, 0); q.stroke(); q.fillStyle = '#17111f'; q.font = 'bold 20px monospace'; q.textAlign = 'center'; q.fillText(String(UNLOCK.piles), 32, 49); lockT.needsUpdate = true; }
  const gateSolid = addSolid(B.x0 + .2, B.z0, B.x0 + .6, B.z1, 0, 2.6); let gateOpen = 0;

  /* ---------- кучи хлама ---------- */
  const pileMats = [col(0x7a6a5a), col(0x4a5a6a), rust, metal, col(0x8a3a2a), col(0x3a4a3a), wood];
  function pileModel(shiny) { return compose('junk-pile' + (shiny ? 's' : ''), a => { for (let i = 0; i < 16; i++) { const an = i * 2.4, r = (i % 5) * .22, y = .2 + (4 - i % 5) * .16, m = shiny && i % 3 === 0 ? lam({ color: 0xf5c542, emissive: 0x8a5a10, emissiveIntensity: .5 }, 'junk-gold') : pileMats[i % pileMats.length];
    if (i % 4 === 0) a(G.torus, dark, Math.cos(an) * r, y, Math.sin(an) * r, .3, .3, .7, Math.PI / 2 + an, 0, 0); else if (i % 4 === 1) a(G.cyl8, m, Math.cos(an) * r, y, Math.sin(an) * r, .18, .5, .18, an, 0, .7); else a(G.box, m, Math.cos(an) * r, y, Math.sin(an) * r, .45, .35, .4, an * .3, an, .2); } }); }
  const piles = PILES.map(([dx, dz], i) => { const p = new THREE.Group(); p.position.set(C.x + dx, 0, C.z + dz); g.add(p); const shiny = i === 4 || i === 6; p.add(pileModel(shiny));
    return { g: p, x: C.x + dx, z: C.z + dz, i, shiny, max: shiny ? 6 : i % 2 ? 8 : 4, hp: 0, full: 1, regrowT: 0, sq: 0, solid: addSolid(C.x + dx - 1.1, C.z + dz - 1.1, C.x + dx + 1.1, C.z + dz + 1.1, 0, 1.2) }; });
  for (const p of piles) p.hp = p.max;

  /* ---------- детали: вылетают с физикой, магнитом летят к игроку ---------- */
  const partGeo = [G.box, G.cyl8, G.torus], parts = [];
  function spawnPart(x, y, z, gold) { const m = mesh(partGeo[(random() * 3) | 0], gold ? lam({ color: 0xf5c542, emissive: 0xc08a20, emissiveIntensity: .8 }, 'junk-gold2') : pileMats[(random() * pileMats.length) | 0], x, y, z, .13, .13, .13, g);
    parts.push({ m, v: new V3((random() - .5) * 5, 4 + random() * 3, (random() - .5) * 5), w: new V3(random() * 12, random() * 12, random() * 12), t: 0, val: gold ? 3 : 1 }); }

  /* ---------- печь (ур.2), верстак (ур.3), гараж (ур.4): падают с неба при открытии ---------- */
  const OV = new V3(C.x - 7.4, 0, C.z - 5.6), BE = new V3(C.x + 7.6, 0, C.z - 6.2), GA = new V3(C.x + 3.6, 0, C.z + 8.6);
  const oven = new THREE.Group(); oven.position.copy(OV); g.add(oven); const fireM = lam({ color: 0xff8a1f, emissive: 0xff6a10, emissiveIntensity: .6 }, 'junk-fire');
  oven.add(compose('junk-oven', a => { a(G.cyl12, col(0x5a4a4a), 0, 1, 0, 1.2, 2, 1.2); a(G.cyl12, col(0x3a2a2a), 0, 2.1, 0, 1.25, .2, 1.25); a(G.cyl8, col(0x3a2a2a), .5, 3.2, -.3, .25, 2.2, .25); a(G.box, dark, 0, .8, 1.1, .9, .8, .3); }));
  const fire = mesh(G.box, fireM, 0, .8, 1.26, .7, .6, .02, oven);
  const bench = new THREE.Group(); bench.position.copy(BE); bench.rotation.y = -.6; g.add(bench);
  bench.add(compose('junk-bench', a => { a(G.box, wood, 0, .9, 0, 2.6, .12, 1.2); for (const [x, z] of [[-1.1, -.45], [1.1, -.45], [-1.1, .45], [1.1, .45]]) a(G.box, metal, x, .45, z, .12, .9, .12); a(G.box, col(0x6a8a3a), -.6, 1.05, 0, .5, .18, .4); a(G.cyl8, col(0xd8243a), .5, 1.1, .1, .08, .3, .08, 0, 0, 1.4); a(G.box, metal, .9, 1.02, -.2, .4, .1, .3);
    a(G.box, wood, 0, 1.9, -.55, 2.6, 1.6, .08); for (let i = 0; i < 6; i++) a(G.box, metal, -1 + i * .4, 2.1, -.5, .06, .4 + (i % 3) * .15, .06); }));
  const garage = new THREE.Group(); garage.position.copy(GA); garage.rotation.y = Math.PI; g.add(garage);
  garage.add(compose('junk-garage', a => { a(G.box, rust, 0, 1.6, -1.6, 4.4, 3.2, .2); for (const s of [-1, 1]) a(G.box, rust, s * 2.2, 1.6, 0, .2, 3.2, 3.4); a(G.box, metal, 0, 3.3, 0, 4.8, .2, 3.8, .15, 0, 0); a(G.box, col(0xf5c542), 0, 2.9, 1.65, 4.2, .2, .1); a(G.box, dark, 0, .05, 0, 4, .1, 3.2); }));
  const pad = mesh(G.cyl12, lam({ color: 0x4ab0f0, emissive: 0x4ab0f0, emissiveIntensity: .3 }, 'junk-pad'), 0, .08, .2, .9, .05, .9, garage);
  const bot = new THREE.Group(); garage.add(bot); bot.position.set(0, .1, .2);
  bot.add(compose('junk-bot', a => { a(G.box, col(0x8a9aa8), 0, .7, 0, .7, .7, .6); a(G.box, col(0x6a7a88), 0, 1.25, 0, .55, .4, .5); for (const s of [-1, 1]) { a(G.sph, glow(0x7af0ff), s * .14, 1.28, .26, .07, .07, .03); a(G.box, metal, s * .45, .7, 0, .12, .5, .12); }
    a(G.cyl6, metal, 0, 1.6, 0, .02, .3, .02); a(G.sph, glow(0xff3a3a), 0, 1.78, 0, .06, .06, .06); a(G.box, rust, 0, .25, 0, .9, .2, .9); a(G.cyl8, metal, 0, 2.0, 0, .04, .4, .04); }));
  const prop = new THREE.Group(); prop.position.y = 2.2; bot.add(prop); prop.add(compose('junk-prop', a => { a(G.box, wood, 0, 0, 0, 1.6, .04, .14); a(G.box, wood, 0, 0, 0, .14, .04, 1.6); }));
  const sack = mesh(G.sph10, lam({ map: T.cloth(0x8a5a36), color: 0xffffff }, 'junk-sack'), .5, .55, -.3, .35, .35, .3, bot); sack.visible = false;
  const timerC = document.createElement('canvas'); timerC.width = 128; timerC.height = 32; const timerT = new THREE.CanvasTexture(timerC); const timerS = new THREE.Sprite(new THREE.SpriteMaterial({ map: timerT, transparent: true })); timerS.scale.set(1.8, .45, 1); timerS.position.set(GA.x, 3.9, GA.z); g.add(timerS);
  const solids = { oven: addSolid(OV.x - 1.2, OV.z - 1.2, OV.x + 1.2, OV.z + 1.2, 0, 2.2), bench: addSolid(BE.x - 1.2, BE.z - 1, BE.x + 1.2, BE.z + 1, 0, 1), garage: [addSolid(GA.x - 2.3, GA.z + 1.4, GA.x + 2.3, GA.z + 1.8, 0, 3.2), addSolid(GA.x - 2.3, GA.z - 1.7, GA.x - 2.1, GA.z + 1.7, 0, 3.2), addSolid(GA.x + 2.1, GA.z - 1.7, GA.x + 2.3, GA.z + 1.7, 0, 3.2)] };
  const builds = { oven, bench, garage };
  const drops = []; // постройка падает с неба: подпрыгивает, пыль
  function showBuild(k, animate) { const o = builds[k]; o.visible = true; const s = solids[k]; for (const q of [].concat(s)) q.on = true; if (animate) { o.position.y = 18; drops.push({ o, v: 0 }); } }
  function hideBuild(k) { builds[k].visible = false; for (const q of [].concat(solids[k])) q.on = false; }

  /* ---------- дирижабль: завозит хлам на парашютах ---------- */
  const ship = new THREE.Group(); g.add(ship); ship.visible = false;
  ship.add(compose('junk-ship', a => { a(G.sph10, lam({ color: 0x8a6a4a }, 'junk-envelope'), 0, 0, 0, 1.6, 1.2, 3.6); for (let i = -2; i <= 2; i++) a(G.torus, rust, 0, 0, i * 1.2, 1.25, 1.25, .5); a(G.box, wood, 0, -1.6, 0, .9, .5, 1.8); for (const s of [-1, 1]) a(G.cyl6, metal, s * .4, -1, 0, .02, 1, .02); a(G.box, rust, 0, 0, 3.7, .1, 1.4, .8); a(G.box, rust, 0, 0, 3.7, 1.4, .1, .8); }));
  const crates = []; let shipT = 0, shipRun = null;

  /* ---------- состояние, интерфейс ---------- */
  let D = junkData(), lastL = -1;
  const lvl = () => pl();
  const pileCount = () => [3, 5, 7][D.up.piles] ?? 3, regrowTime = () => [55, 35, 20][D.up.regrow] ?? 55, magnetR = () => D.up.magnet ? 5.5 : 2.6;
  function gain(n) { D.parts += n; D.xp += n; save(D); }
  function refreshUnlocks(animate) { const L = lvl();
    gateOpen = L >= UNLOCK.piles ? Math.max(gateOpen, animate ? gateOpen : 1) : 0; lampM.color.setHex(L >= UNLOCK.piles ? 0x5aff7a : 0xff3a3a); lampM.emissive.setHex(L >= UNLOCK.piles ? 0x5aff7a : 0xff3a3a); lockS.visible = L < UNLOCK.piles;
    for (const k of ['oven', 'bench', 'garage']) { const need = UNLOCK[k]; if (L < need) { hideBuild(k); continue; } const fresh = !D.seen[k]; showBuild(k, animate && fresh); if (fresh) { D.seen[k] = 1; save(D); } }
    piles.forEach((p, i) => { const on = i < pileCount(); p.g.visible = on && p.hp > 0; p.solid.on = on && p.hp > 0; }); timerS.visible = L >= UNLOCK.garage; }
  refreshUnlocks(false);
  function hitPile(p, n, from) { if (p.hp <= 0 || p.i >= pileCount() || lvl() < UNLOCK.piles) return false; p.hp -= n; p.sq = 1; sfx('wood', { at: p.g.position, v: .7 });
    for (let k = 0; k < (p.shiny ? 3 : 2) + (random() < .4 ? 1 : 0); k++) spawnPart(p.x, .9, p.z, p.shiny && random() < .5);
    burst(p.x, .6, p.z, 6, { color: 0xa89a8a, size: .15, speed: 2.5, up: 2 });
    if (p.hp <= 0) { p.g.visible = false; p.solid.on = false; p.regrowT = regrowTime(); smokeRing(p.x, .1, p.z, 3, { speed: 2, color: 0xa89a8a }); sfx('snowPack', { at: p.g.position }); } return true; }
  // панель верстака/гаража - иконки и цены, без длинных текстов
  const panel = document.createElement('div'); panel.id = 'junkPanel'; panel.className = 'hidden'; document.body.appendChild(panel);
  function closePanel() { panel.classList.add('hidden'); globalThis.__junkPanel = false; }
  panel.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'close') return closePanel();
    if (a.startsWith('up:')) { const k = a.slice(3), u = UPG[k], lv = D.up[k], cost = u.cost[lv]; if (lv >= u.max || D.parts < cost) { sfx('no'); return; } D.parts -= cost; D.up[k]++; save(D); sfx('fanfare'); burst(BE.x, 1.6, BE.z, 20, { color: 0xf5c542, size: .2, speed: 3, up: 3 }); refreshUnlocks(false);
      if (k === 'piles') for (let i = 0; i < pileCount(); i++) { const p = piles[i]; if (!p.g.visible && p.hp > 0) { p.g.visible = true; p.solid.on = true; p.g.position.y = 14; drops.push({ o: p.g, v: 0 }); } } openBench(); }
    if (a === 'build') { if (D.parts < 20) { sfx('no'); return; } D.parts -= 20; D.bot.built = true; save(D); assemble = 1.4; sfx('fanfare'); openGarage(); }
    if (a.startsWith('go:')) { const min = +a.slice(3); if (!D.bot.built || D.bot.until) return; D.bot.dur = min; D.bot.until = Date.now() + min * 60000; D.bot.haul = 0; save(D); launchT = 0; sfx('dash'); closePanel(); }
  });
  const pip = (n, m) => Array.from({ length: m }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  const ico = n => `<img class="pxi" src="${iconCanvas(n, 3).toDataURL()}" width="28" height="28" alt="">`;
  function openBench() { globalThis.__junkPanel = true; document.exitPointerLock?.(); panel.classList.remove('hidden');
    panel.innerHTML = `<div class="jp"><button class="jx" data-a="close">✕</button><div class="jh">${ico('gear')}<b>${D.parts}</b></div><div class="jc">` + Object.entries(UPG).map(([k, u]) => { const lv = D.up[k], done = lv >= u.max, cost = u.cost[lv];
      return `<button class="jcard ${done ? 'done' : D.parts >= cost ? '' : 'poor'}" data-a="up:${k}">${ico(u.icon)}<span class="pips">${pip(lv, u.max)}</span><span class="cost">${done ? '✔' : ico('gear') + cost}</span></button>`; }).join('') + `</div></div>`; }
  function openGarage() { globalThis.__junkPanel = true; document.exitPointerLock?.(); panel.classList.remove('hidden');
    panel.innerHTML = `<div class="jp"><button class="jx" data-a="close">✕</button><div class="jh">${ico('gear')}<b>${D.parts}</b></div><div class="jc">` + (!D.bot.built ? `<button class="jcard ${D.parts >= 20 ? '' : 'poor'}" data-a="build">${ico('robot')}<span class="cost">${ico('gear')}20</span></button>`
      : [10, 30].map(m => `<button class="jcard" data-a="go:${m}">${ico('robot')}<span class="cost">${ico('clock')}${m}:00</span></button>`).join('')) + `</div></div>`; }
  addEventListener('keydown', e => { if (e.code === 'Escape' && globalThis.__junkPanel) closePanel(); });
  let assemble = 0, launchT = -1;
  // взаимодействия E
  W.interacts.push({ x: OV.x, z: OV.z + 1.4, y: 0, r: 1.8, label: 'Печь: детали → фисты', enabled: () => lvl() >= UNLOCK.oven && D.parts >= 10, act() { const n = Math.min(5, Math.floor(D.parts / 10)); D.parts -= n * 10; save(D); ovenT = 1.2; ovenOut = n; sfx('boom', { v: .4 }); for (let i = 0; i < 8; i++) puff(OV.x, 3.3, OV.z - .3, { color: 0x6a6a6a, size: .4, vy: 1.4, life: 1.2 }); } });
  W.interacts.push({ x: BE.x, z: BE.z + 1.2, y: 0, r: 1.8, label: 'Верстак', enabled: () => lvl() >= UNLOCK.bench, act: openBench });
  W.interacts.push({ x: GA.x, z: GA.z - 2, y: 0, r: 2, get label() { return D.bot.until && Date.now() >= D.bot.until ? 'Забрать добычу' : 'Гараж'; }, enabled: () => lvl() >= UNLOCK.garage && !(D.bot.until && Date.now() < D.bot.until),
    act() { if (D.bot.until && Date.now() >= D.bot.until) { const n = D.bot.dur >= 30 ? 50 + ((random() * 30) | 0) : 15 + ((random() * 10) | 0); D.bot.until = 0; save(D); sack.visible = false; for (let i = 0; i < Math.min(30, n); i++) setTimeout(() => spawnPart(GA.x, 1.2, GA.z - .6, i % 10 === 0), i * 40); D.bot.haul = n - Math.min(30, n); if (D.bot.haul > 0) gain(D.bot.haul); sfx('fanfare'); } else openGarage(); } });
  let ovenT = 0, ovenOut = 0;
  const fmt = ms => { const t = Math.max(0, Math.ceil(ms / 1000)), p = n => String(n).padStart(2, '0'); return `${p(Math.floor(t / 3600))}:${p(Math.floor(t % 3600 / 60))}:${p(t % 60)}`; };
  let tSig = '';
  return {
    walk: junkWalk,
    // удар кулаком (ЛКМ) по куче рядом
    punch(P) { if ((P.junkCD || 0) > 0) return false; const f = P.root.rotation.y, px = P.pos.x + Math.sin(f) * .9, pz = P.pos.z + Math.cos(f) * .9; let best = null, bd = 2.2;
      for (const p of piles) { if (!p.g.visible || p.hp <= 0) continue; const d = Math.hypot(p.x - px, p.z - pz); if (d < bd) { bd = d; best = p; } } if (!best) return false; P.junkCD = .3; P.swatT = .25; return hitPile(best, 1, P); },
    hit(pt, power) { if (power < 1) return; for (const p of piles) if (p.g.visible && Math.hypot(p.x - pt.x, p.z - pt.z) < 1.3 && pt.y < 2) hitPile(p, power > 4 ? 2 : 1); },
    update(dt, t, P) {
      if (P) P.junkCD = (P.junkCD || 0) - dt;
      const L = lvl(); if (L !== lastL) { refreshUnlocks(lastL >= 0); if (lastL >= 0 && lastL < UNLOCK.piles && L >= UNLOCK.piles) { sfx('fanfare'); burst(B.x0, 3, (B.z0 + B.z1) / 2, 30, { color: 0x5aff7a, size: .2, speed: 4, up: 3 }); } lastL = L; }
      // ворота: решётка уезжает вверх, когда уровень открыт
      const want = L >= UNLOCK.piles ? 1 : 0; gateOpen += (want - gateOpen) * Math.min(1, dt * 1.5); bar.position.y = gateOpen * 2.6; gateSolid.on = gateOpen < .7;
      gear.rotation.z += dt * .4; fire.material.emissiveIntensity = .5 + Math.sin(t * 7) * .15 + (ovenT > 0 ? 1.2 : 0);
      for (const d of drops) { d.v -= 30 * dt; d.o.position.y += d.v * dt; if (d.o.position.y <= 0) { d.o.position.y = 0; if (d.v < -4) { d.v *= -.25; burst(d.o.position.x, .3, d.o.position.z, 18, { color: 0xc8b8a8, size: .3, speed: 3, up: 2 }); smokeRing(d.o.position.x, .1, d.o.position.z, 5, { speed: 3 }); sfx('land', { v: .8 }); } else d.done = true; } }
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].done) drops.splice(i, 1);
      // кучи: пружинят от ударов, пустые ждут дирижабль
      for (const p of piles) { p.sq = Math.max(0, p.sq - dt * 4); const k = p.hp / p.max; const S = p.shiny ? 1.5 : p.max > 4 ? 1.9 : 1.5; p.g.scale.set(S * (1 + p.sq * .15), S * (.45 + k * .55) * (1 - p.sq * .2), S * (1 + p.sq * .15)); if (p.hp <= 0 && p.i < pileCount()) p.regrowT -= dt; }
      const due = piles.filter(p => p.hp <= 0 && p.i < pileCount() && p.regrowT <= 0 && !p.crate);
      if (due.length && !shipRun && L >= UNLOCK.piles) { shipRun = { t: 0, list: due, dropped: new Set() }; ship.visible = true; sfx('wind', { v: .5 }); }
      if (shipRun) { const r = shipRun; r.t += dt; const k = r.t / 7; ship.position.set(C.x - 22 + k * 44, 15 + Math.sin(t) * .4, C.z + Math.sin(k * 3) * 2); ship.rotation.y = Math.PI / 2; ship.rotation.z = Math.sin(t * 1.3) * .04;
        for (const p of r.list) if (!r.dropped.has(p) && ship.position.x > p.x - .5) { r.dropped.add(p); p.crate = true; const c = new THREE.Group(); c.add(compose('junk-crate', a => { a(G.box, wood, 0, 0, 0, .7, .6, .7); a(G.cone8, lam({ color: 0xd8243a, side: THREE.DoubleSide }, 'junk-chute'), 0, 1.6, 0, 1, .7, 1); for (const s of [-1, 1]) a(G.cyl6, col(0xeeeeee), s * .35, .9, 0, .01, 1.3, .01, 0, 0, s * .3); }));
          c.position.copy(ship.position).setY(13.5); g.add(c); crates.push({ c, p }); }
        if (k >= 1) { shipRun = null; ship.visible = false; } }
      for (let i = crates.length - 1; i >= 0; i--) { const q = crates[i]; q.c.position.y -= dt * 3.2; q.c.position.x += (q.p.x - q.c.position.x) * Math.min(1, dt * 2); q.c.position.z += (q.p.z - q.c.position.z) * Math.min(1, dt * 2); q.c.rotation.z = Math.sin(t * 2 + i) * .1;
        if (q.c.position.y <= .3) { q.c.removeFromParent(); crates.splice(i, 1); const p = q.p; p.crate = false; p.hp = p.max; p.g.visible = true; p.solid.on = true; p.sq = 1; burst(p.x, .5, p.z, 16, { color: 0xc8b8a8, size: .3, speed: 3, up: 2 }); sfx('wood', { at: p.g.position }); } }
      // детали: летят, падают, магнитом тянутся к игроку и засчитываются
      const R = magnetR();
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; const m = q.m;
        if (P && (q.t > .35 && m.position.distanceTo(P.pos) < R || q.t > 2.2)) { const to = P.pos.clone().add(new V3(0, 1, 0)), d = to.sub(m.position), L2 = d.length(); m.position.addScaledVector(d.normalize(), Math.min(L2, dt * (8 + q.t * 6))); m.scale.setScalar(.13 * Math.min(1, L2 + .3));
          if (L2 < .35) { m.removeFromParent(); parts.splice(i, 1); gain(q.val); sfx('click', { v: .35 }); bumpChip(); continue; } }
        else { q.v.y -= 14 * dt; m.position.addScaledVector(q.v, dt); if (m.position.y < .08) { m.position.y = .08; q.v.multiplyScalar(.4); q.v.y = Math.abs(q.v.y) * .35; } }
        m.rotation.x += q.w.x * dt; m.rotation.y += q.w.y * dt; }
      // печь: пламя вспыхивает, фисты выкатываются настоящими монетами
      if (ovenT > 0) { ovenT -= dt; if (ovenT <= 0 && ovenOut) { for (let i = 0; i < ovenOut; i++) { const c = spawnCoin(OV.x, 1, OV.z + 1.4, true); if (c) c.vel.set((random() - .5) * 2, 3, 2.5 + random()); } ovenOut = 0; sfx('points'); burst(OV.x, 1, OV.z + 1.3, 14, { color: 0xffa040, size: .2, speed: 3, up: 2 }); } }
      // гараж: сборка бота, вылет, возвращение с мешком
      if (assemble > 0) { assemble -= dt; bot.visible = true; bot.scale.setScalar(1 - Math.max(0, assemble) / 1.4 * .9); if (random() < dt * 20) spawnPart(GA.x + (random() - .5) * 3, 1.5, GA.z + (random() - .5) * 3, false); }
      const away = D.bot.until && Date.now() < D.bot.until, back = D.bot.until && Date.now() >= D.bot.until;
      bot.visible = D.bot.built && (!away || launchT >= 0 && launchT < 2.5); prop.rotation.y += dt * (away || back ? 30 : 0);
      if (away && launchT >= 0) { launchT += dt; bot.position.set(launchT * 3, .1 + launchT * launchT * 2.5, .2 + launchT * 4); } else if (!away) { bot.position.set(0, .1 + (back ? Math.abs(Math.sin(t * 3)) * .1 : 0), .2); launchT = -1; }
      sack.visible = !!back; pad.material.emissiveIntensity = back ? .6 + Math.sin(t * 6) * .4 : .3;
      if (timerS.visible) { const txt = !D.bot.built ? '' : away ? fmt(D.bot.until - Date.now()) : back ? '!' : ''; if (txt !== tSig) { tSig = txt; const q = timerC.getContext('2d'); q.clearRect(0, 0, 128, 32); if (txt) { q.fillStyle = '#17111fd8'; q.fillRect(0, 0, 128, 32); q.fillStyle = back ? '#9be36b' : '#f2f6ff'; q.font = 'bold 22px monospace'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(txt, 64, 17); } timerT.needsUpdate = true; } }
    },
  };
}
// фишка свалки рядом с профилем: шестерёнка, детали, полоса уровня свалки
let chip = null;
function bumpChip() { if (!chip) return; chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); renderChip(); }
export function renderChip() { chip ??= document.getElementById('junkChip'); if (!chip) return; const d = junkData(), L = junkLevel(d.xp), a = 25 * L * L, b = 25 * (L + 1) * (L + 1);
  chip.classList.toggle('hidden', levelOf(progress().xp) < UNLOCK.piles); chip.querySelector('b').textContent = d.parts; chip.querySelector('.jl').textContent = L; chip.querySelector('.jb i').style.width = Math.round(100 * (d.xp - a) / (b - a)) + '%'; }
addEventListener('junkchange', renderChip);
