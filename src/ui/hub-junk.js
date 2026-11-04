import { random } from '../core/random.js';
import { THREE, G, V3, mesh, col, lam, tmat, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { rockCone, cap } from './hub-island.js';
import { burst, puff, smokeRing, chunk } from '../world/particles.js';
import { sfx } from '../core/sfx.js';
import { spawnCoin } from '../game/coins.js';
import { progress, levelOf } from '../game/progress.js';
import { collection, spendCoins } from '../game/collection.js';
import { iconCanvas } from './icons.js';

/* v0.73 «Свалка-мастерская», полная переделка по стандарту качества (AGENTS.md 2.1).
   Остров у восточного края главного острова. Всё объясняется образами и иконками, без надписей в мире.
   - Ворота: закрытая решётка, по центру - замок и плашка «1 УР». С 1-го уровня при первом входе: плашка гаснет,
     решётка поднимается, взрывается на куски и исчезает навсегда.
   - Кучи хлама (холодильники, телевизоры, шины, бочки, трубы, ящики, пружины на снежно-земляном холме):
     бьёшь ЛКМ / кидаешь предметы - вылетают детали (3-8 с кучи), магнитом летят к тебе.
     Пустые кучи засыпает дирижабль: ящики на парашютах качаются, садятся, раскрываются.
   - Будущие постройки стоят «призраком» с 3D-плашкой (иконка, цена в деталях/фистах, уровень), как в тайкунах:
     печь (ур.2, 60 деталей), верстак (ур.3, 200 деталей + 20 фистов), гараж (ур.4, 500 деталей + 50 фистов).
   Валюта - только «детали» (без отдельного уровня свалки), счётчик рядом с фистами. Прогресс у каждого свой. */
export const JUNK_KEY = 'friendslop.junk.v1';
export const JUNK = { c: new V3(47, 0, -2), r: 12.5, bridge: { x0: 29.2, x1: 35.4, z0: -3.6, z1: -.4 } };
const jr = th => JUNK.r + Math.sin(th * 4 + 2) * .8 + Math.sin(th * 9) * .35;
export function junkWalk(x, z) { const B = JUNK.bridge; if (x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1) return true; const dx = x - JUNK.c.x, dz = z - JUNK.c.z; return Math.hypot(dx, dz) < jr(Math.atan2(dz, dx)) - .5; }
const DEF = () => ({ parts: 0, up: { piles: 0, regrow: 0, magnet: 0 }, bot: { built: false, until: 0, dur: 0 }, owned: {}, seen: {} });
export function junkData() { try { const d = JSON.parse(localStorage.getItem(JUNK_KEY) || 'null'); if (!d) return DEF(); const o = DEF(); return { ...o, ...d, up: { ...o.up, ...(d.up || {}) }, bot: { ...o.bot, ...(d.bot || {}) }, owned: d.owned || {}, seen: d.seen || {} }; } catch { return DEF(); } }
function save(d) { try { localStorage.setItem(JUNK_KEY, JSON.stringify(d)); } catch { } dispatchEvent(new Event('junkchange')); }
const UNLOCK_GATE = 1;
// цены построек: детали + фисты, плюс уровень игрока
const BUILD = { oven: { lvl: 2, parts: 60, fists: 0, icon: 'oven' }, bench: { lvl: 3, parts: 200, fists: 20, icon: 'bench' }, garage: { lvl: 4, parts: 500, fists: 50, icon: 'robot' } };
const UPG = { piles: { max: 2, cost: [150, 400], icon: 'pile' }, regrow: { max: 2, cost: [200, 500], icon: 'ship' }, magnet: { max: 1, cost: [300], icon: 'magnet' } };
const OVEN_RATE = 15, BOT_COST = 100;
const PILES = [[-1, -2.5], [3.8, 1.2], [-4.2, 2.6], [1, 5.2], [-3.4, -6.2], [6.2, -2.2], [-7.6, -.8]];
const pl = () => levelOf(progress().xp);

/* ---------- модели (переиспользуемые, через compose-кэш) ---------- */
const M = {};
function mats() { if (M.ok) return M; M.ok = 1;
  M.rust = tmat(T.rust()); M.metal = tmat(T.metal()); M.wood = tmat(T.wood()); M.dark = col(0x2b2533); M.tire = tmat(T.tread()); M.hub = tmat(T.hubcap()); M.crate = tmat(T.crate());
  M.white = lam({ color: 0xd8d4cc }, 'junk73-white'); M.cream = lam({ color: 0xcfc2a2 }, 'junk73-cream'); M.mint = lam({ color: 0x8ab8a8 }, 'junk73-mint'); M.red = lam({ color: 0xa83a2a }, 'junk73-red');
  M.snow = lam({ color: 0xeef3fb }, 'rail71-snow'); M.dirt = lam({ map: T.dirt(), color: 0xb09a88 }, 'junk73-dirt'); M.gold = lam({ color: 0xf5c542, emissive: 0x8a5a10, emissiveIntensity: .5 }, 'junk-gold');
  M.screen = tmat(T.tvScreen('happy')); M.glass = lam({ color: 0x6a8aa8, emissive: 0x1a2a3a, emissiveIntensity: .5 }, 'junk73-glass'); return M; }
// предметы хлама - каждый из 4-8 частей, читаются силуэтом
const JUNKBITS = {
  fridge: (a, x, y, z, r) => { const m = mats(); a(G.box, m.white, x, y + .55, z, .62, 1.1, .58, 0, r, 0); a(G.box, m.cream, x + Math.sin(r) * .3, y + .55, z + Math.cos(r) * .3, .6, 1.06, .03, 0, r, 0); a(G.box, m.dark, x + Math.sin(r) * .32 + Math.cos(r) * .2, y + .7, z + Math.cos(r) * .32 - Math.sin(r) * .2, .04, .3, .04, 0, r, 0); a(G.box, m.dark, x, y + .78, z, .63, .02, .59, 0, r, 0); },
  tv: (a, x, y, z, r) => { const m = mats(); a(G.box, m.cream, x, y + .25, z, .55, .45, .45, 0, r, 0); a(G.box, m.screen, x + Math.sin(r) * .23, y + .27, z + Math.cos(r) * .23, .42, .32, .02, 0, r, 0); a(G.cyl6, m.dark, x, y + .55, z, .01, .2, .01, 0, r, .5); a(G.cyl6, m.dark, x, y + .55, z, .01, .2, .01, 0, r, -.5); },
  tire: (a, x, y, z, r, t = 0) => { const m = mats(); a(G.torus, m.tire, x, y + .14, z, .32, .32, .55, Math.PI / 2 + t, r, 0); a(G.cyl12, m.hub, x, y + .14, z, .19, .08, .19, t, r, 0); },
  barrel: (a, x, y, z, r, tip = 0) => { const m = mats(); a(G.cyl12, m.red, x, y + .4, z, .28, .8, .28, tip, r, 0); for (const yy of [.15, .65]) a(G.cyl12, m.rust, x, y + yy, z, .29, .04, .29, tip, r, 0); a(G.cyl8, m.dark, x, y + .81, z, .06, .02, .06, tip, r, 0); },
  pipe: (a, x, y, z, r) => { const m = mats(); a(G.cyl8, m.rust, x, y + .12, z, .1, 1.4, .1, Math.PI / 2, r, 0); a(G.cyl8, m.metal, x + Math.sin(r) * .7, y + .12, z + Math.cos(r) * .7, .13, .08, .13, Math.PI / 2, r, 0); },
  crate: (a, x, y, z, r) => { const m = mats(); a(G.box, m.crate, x, y + .25, z, .5, .5, .5, 0, r, 0); },
  spring: (a, x, y, z) => { const m = mats(); for (let i = 0; i < 5; i++) a(G.torus, m.metal, x, y + .05 + i * .06, z, .12, .12, .2, Math.PI / 2, 0, 0); },
  planks: (a, x, y, z, r) => { const m = mats(); for (let i = 0; i < 3; i++) a(G.box, m.wood, x + (i - 1) * .12, y + .05 + i * .04, z, .11, .04, 1.1, 0, r + i * .2, 0); },
  washer: (a, x, y, z, r) => { const m = mats(); a(G.box, m.white, x, y + .42, z, .6, .84, .6, 0, r, 0); a(G.cyl12, m.dark, x + Math.sin(r) * .3, y + .45, z + Math.cos(r) * .3, .2, .03, .2, Math.PI / 2, r, 0); a(G.cyl12, m.glass, x + Math.sin(r) * .31, y + .45, z + Math.cos(r) * .31, .15, .02, .15, Math.PI / 2, r, 0); },
};
function pileModel(v, shiny) { return compose('junk73-pile' + v + (shiny ? 's' : ''), a => { const m = mats();
  a(G.ico, m.dirt, 0, .05, 0, 1.25, .5, 1.1); a(G.ico, m.snow, .1, .32, -.1, .8, .22, .7); // холм: земля и снежная шапка
  const R = (i, k) => Math.sin(v * 13.1 + i * 7.3 + k) * .5 + .5, list = [['fridge', 'tire', 'pipe', 'crate', 'spring', 'tire'], ['tv', 'barrel', 'planks', 'tire', 'washer', 'spring'], ['washer', 'crate', 'tv', 'pipe', 'tire', 'barrel']][v % 3];
  list.forEach((k, i) => { const an = i / list.length * 6.283 + v, r = .25 + R(i, 1) * .6, y = .15 + (1 - r) * .35; JUNKBITS[k](a, Math.cos(an) * r, y, Math.sin(an) * r, an + R(i, 2), R(i, 3) * .6); });
  if (shiny) for (let i = 0; i < 6; i++) { const an = i * 1.1; a(G.ico, m.gold, Math.cos(an) * .5, .55 + (i % 2) * .15, Math.sin(an) * .5, .1, .1, .1); } }); }
function ovenModel() { return compose('junk73-oven', a => { const m = mats(), brick = tmat(T.oldBrick ? T.oldBrick() : T.brickWall());
  a(G.cyl12, brick, 0, .9, 0, 1.15, 1.8, 1.15); a(G.cyl12, m.metal, 0, 1.85, 0, 1.2, .14, 1.2); a(G.cone8, m.metal, 0, 2.25, 0, 1.1, .7, 1.1); a(G.cyl8, m.rust, .45, 3.3, -.25, .22, 2.4, .22); a(G.cyl8, m.dark, .45, 4.55, -.25, .3, .14, .3);
  a(G.box, m.dark, 0, .85, 1.08, 1.0, .9, .2); a(G.box, m.metal, 0, 1.33, 1.17, 1.1, .06, .08); for (const s of [-1, 1]) a(G.box, m.metal, s * .52, .85, 1.17, .06, .96, .08);
  for (let k = 0; k < 10; k++) { const an = k / 10 * 6.283; a(G.sph, m.metal, Math.cos(an) * 1.16, 1.85, Math.sin(an) * 1.16, .05, .05, .05); }
  a(G.box, m.metal, -.95, .3, .6, .5, .6, .4); a(G.box, m.wood, 1.1, .2, .5, .6, .4, .5); }); }
function benchModel() { return compose('junk73-bench', a => { const m = mats();
  a(G.box, m.wood, 0, .92, 0, 2.6, .12, 1.2); a(G.box, m.metal, 0, .84, 0, 2.62, .05, 1.22); for (const [x, z] of [[-1.15, -.5], [1.15, -.5], [-1.15, .5], [1.15, .5]]) a(G.box, m.metal, x, .42, z, .1, .84, .1); a(G.box, m.wood, 0, .3, 0, 2.3, .06, 1.0);
  a(G.box, m.metal, -.85, 1.12, .15, .5, .28, .32); a(G.cyl8, m.dark, -.85, 1.32, .15, .12, .14, .12); // тиски
  a(G.cyl8, m.red, .45, 1.05, .25, .05, .3, .05, 0, 0, 1.45); a(G.box, m.metal, .62, 1.05, .25, .1, .06, .06); // отвёртка
  a(G.box, m.wood, 0, 1.95, -.6, 2.6, 1.7, .08); for (let i = 0; i < 7; i++) { const x = -1.05 + i * .35; a(G.box, m.metal, x, 2.0 + (i % 3) * .2, -.54, .05, .35 + (i % 2) * .15, .05); a(G.sph, m.dark, x, 2.25 + (i % 3) * .2, -.55, .05, .05, .02); }
  a(G.box, lam({ color: 0xffe8b0, emissive: 0xffd080, emissiveIntensity: 1 }, 'junk73-lamp'), 0, 2.9, -.3, .5, .08, .25); a(G.box, m.dark, 0, 2.85, -.5, .06, .1, .4); }); }
function garageModel() { return compose('junk73-garage', a => { const m = mats(), corr = tmat(T.corrugated ? T.corrugated(0x6a7a8a) : T.metal());
  a(G.box, corr, 0, 1.6, -1.65, 4.6, 3.2, .16); for (const s of [-1, 1]) a(G.box, corr, s * 2.3, 1.6, 0, .16, 3.2, 3.4); a(G.box, m.metal, 0, 3.35, 0, 5, .16, 3.9, .12, 0, 0);
  for (let k = 0; k < 6; k++) a(G.box, m.rust, 0, 3.0 - k * .07, 1.62, 4.3, .06, .08); // свёрнутые ворота-гармошка
  for (const s of [-1, 1]) { a(G.box, m.dark, s * 2.3, 1.6, 1.7, .22, 3.2, .22); a(G.box, lam({ color: 0xf5c542 }, 'junk73-stripe'), s * 2.3, .5, 1.82, .23, .2, .02); }
  a(G.box, m.dark, 0, .04, 0, 4.4, .08, 3.2); a(G.box, m.metal, -1.6, .55, -1.3, .9, 1.1, .5); a(G.cyl8, m.red, 1.6, .5, -1.2, .3, 1, .3); }); }
function shipModel() { // дирижабль: сегментированная оболочка (Lathe), рёбра, рули, гондола с окнами, винты, тросы
  const g = new THREE.Group(), m = mats(), prof = []; for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(Math.sin(t * Math.PI) * 1.6 * (1 - t * .25), (t - .5) * 7.4)); }
  const env = new THREE.Mesh(new THREE.LatheGeometry(prof, 12), lam({ color: 0x8a6a4a, flatShading: true }, 'junk73-env')); env.rotation.x = Math.PI / 2; g.add(env);
  g.add(compose('junk73-ship', a => { for (let i = -3; i <= 3; i++) { const t = (i + 5) / 10, r = Math.sin(t * Math.PI) * 1.6 * (1 - t * .25) + .02; a(G.torus, m.rust, 0, 0, -i * .74, r, r, .3); }
    for (const [rx, rz] of [[0, 0], [0, Math.PI / 2], [0, Math.PI], [0, -Math.PI / 2]]) a(G.box, m.red, Math.sin(rz) * .7, Math.cos(rz) * .7, 3.4, .06, 1.1, .9, rx, 0, rz);
    a(G.box, m.wood, 0, -2.0, 0, 1.0, .6, 2.2); a(G.box, m.rust, 0, -1.68, 0, 1.1, .06, 2.3); for (let k = 0; k < 3; k++) for (const s of [-1, 1]) a(G.box, m.glass, s * .51, -1.95, -.7 + k * .7, .02, .22, .4);
    for (const [x, z] of [[-.4, -.9], [.4, -.9], [-.4, .9], [.4, .9]]) a(G.cyl6, m.dark, x, -1.3, z, .015, .9, .015);
    for (const s of [-1, 1]) a(G.box, m.metal, s * .7, -2.0, .9, .6, .06, .06); }));
  const props = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 1.0, -2.0, 1.2); g.add(p); p.add(compose('junk73-prop', a => { a(G.box, mats().wood, 0, 0, 0, .05, 1.0, .1); a(G.box, mats().wood, 0, 0, 0, 1.0, .05, .1); a(G.sph, mats().metal, 0, 0, -.06, .08, .08, .08); })); return p; });
  g.userData.props = props; return g; }
function crateChute() { return compose('junk73-crate', a => { const m = mats(); a(G.box, m.crate, 0, 0, 0, .7, .6, .7); for (const s of [-1, 1]) a(G.box, m.metal, 0, s * .2, 0, .72, .05, .72);
  a(new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2.2), lam({ color: 0xd8243a, side: THREE.DoubleSide }, 'junk-chute'), 0, 1.45, 0, 1.1, .6, 1.1); for (let k = 0; k < 6; k++) { const an = k / 6 * 6.283; a(G.cyl6, col(0xeeeeee), Math.cos(an) * .55, .9, Math.sin(an) * .55, .01, 1.1, .01, Math.sin(an) * .45, 0, -Math.cos(an) * .45); } }); }

/* ---------- статичный декор (до запекания хаба - одна отрисовка) ---------- */
export function buildJunkDecor(b) {
  const C = JUNK.c, m = mats();
  b.car(C.x - 6.8, C.z + 8.4, 1.2, 0x8a5a3a); b.car(C.x + 9.6, C.z + 3.6, .3, 0x5a7a8a, 'hatch');
  b.dumpster(C.x - 10.2, C.z - 2.6); b.tires(C.x + 6.4, C.z + 9.6, 5); b.tires(C.x - 9.4, C.z + 4.4, 4); b.forklift(C.x + 1.6, C.z - 10.4, .5);
  b.container(C.x + 8.6, C.z - 7.8, 5.6, 2.4, 0x7a3a2a); b.barrel(C.x - 8.2, C.z - 6.4); b.barrel(C.x - 7.6, C.z - 7.2); b.pallet(C.x + 4, C.z - 9.6); b.cementPallet(C.x - 5.4, C.z - 9.4);
  b.g.add(compose('junk73-ground', a => { for (let i = 0; i < 9; i++) { const an = i * 2.1, r = 3 + (i % 4) * 2; a(G.disc, m.dirt, C.x + Math.cos(an) * r, .02, C.z + Math.sin(an) * r, 1.3 + (i % 3) * .5, .9 + (i % 2) * .6, 1, -Math.PI / 2, 0, an); }
    // ограждение из сетки-рабицы на ржавых столбах по северному краю
    for (let k = 0; k < 9; k++) { const an = -2.5 + k * .28, R = jr(an) - 1, x = C.x + Math.cos(an) * R, z = C.z + Math.sin(an) * R; a(G.cyl6, m.rust, x, .9, z, .06, 1.8, .06); a(G.cone4, m.snow, x, 1.85, z, .1, .1, .1); } }));
}
export function buildJunk(group) {
  const C = JUNK.c, B = JUNK.bridge, m = mats(), g = new THREE.Group(); g.name = 'junk'; group.add(g); W.keep.push(g);
  const rock = rockCone(jr, 24, 'junk-rock'); rock.position.copy(C); g.add(rock);
  for (const q of cap(jr)) { q.position.x += C.x; q.position.z += C.z; g.add(q); }
  // мост: листы железа с заклёпками, перила из труб
  g.add(compose('junk73-bridge', a => { for (let x = B.x0; x < B.x1; x += .75) { a(G.box, m.rust, x + .37, .04, (B.z0 + B.z1) / 2, .72, .08, B.z1 - B.z0); for (const z of [B.z0 + .2, B.z1 - .2]) a(G.sph, m.metal, x + .37, .09, z, .04, .03, .04); }
    for (const s of [B.z0, B.z1]) { a(G.cyl8, m.metal, (B.x0 + B.x1) / 2, .95, s, .06, B.x1 - B.x0, .06, 0, 0, Math.PI / 2); for (let x = B.x0 + .3; x < B.x1; x += 1.5) a(G.cyl8, m.metal, x, .48, s, .05, .95, .05); } }));
  for (const s of [B.z0, B.z1]) addSolid(B.x0, s - .06, B.x1, s + .06, 0, 1);
  // вывеска-шестерёнка без букв: неоновый символ свалки
  const gear = new THREE.Group(); gear.position.set(C.x - 1, 6.5, C.z - 10.5); g.add(gear);
  gear.add(compose('junk-gear', a => { const n = lam({ color: 0xff8a1f, emissive: 0xff8a1f, emissiveIntensity: 1.1 }, 'junk-neon'); a(G.torus, n, 0, 0, 0, 1.4, 1.4, 1.2); for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; a(G.box, n, Math.cos(an) * 1.75, Math.sin(an) * 1.75, 0, .4, .4, .15, 0, 0, an); } }));
  g.add(compose('junk-gearposts', a => { for (const s of [-1, 1]) a(G.box, m.rust, C.x - 1 + s * 1.6, 3, C.z - 10.5, .14, 6, .14); }));
  (W.lightSources ??= []).push({ x: C.x - 1, y: 5, z: C.z - 9.5, color: 0xff8a1f, strength: 2.5, range: 8 }, { x: C.x, y: 4, z: C.z, color: 0xffd8a0, strength: 2, range: 11 });

  let D = junkData();
  /* ---------- ворота: решётка, по центру замок и «1 УР»; при открытии взрывается и исчезает ---------- */
  const gate = new THREE.Group(); gate.position.set(B.x0 + .4, 0, (B.z0 + B.z1) / 2); g.add(gate);
  gate.add(compose('junk73-gateposts', a => { for (const s of [-1, 1]) { a(G.box, m.rust, 0, 1.5, s * 1.8, .32, 3, .32); a(G.cone4, m.snow, 0, 3.12, s * 1.8, .3, .25, .3); } a(G.box, m.rust, 0, 2.95, 0, .26, .22, 3.8); }));
  const grate = new THREE.Group(); gate.add(grate);
  grate.add(compose('junk73-grate', a => { for (let k = 0; k < 6; k++) a(G.box, m.metal, 0, .2 + k * .5, 0, .07, .07, 3.3); for (let k = 0; k < 9; k++) a(G.box, m.rust, 0, 1.4, -1.6 + k * .4, .08, 2.7, .08); }));
  const plate = new THREE.Group(); grate.add(plate); plate.position.set(-.08, 1.45, 0); plate.rotation.y = -Math.PI / 2;
  { const pc = document.createElement('canvas'); pc.width = 128; pc.height = 128; const q = pc.getContext('2d'); q.imageSmoothingEnabled = false;
    q.fillStyle = '#17111f'; q.beginPath(); q.roundRect(4, 4, 120, 120, 14); q.fill(); q.strokeStyle = '#f5c542'; q.lineWidth = 5; q.beginPath(); q.roundRect(7, 7, 114, 114, 12); q.stroke();
    q.fillStyle = '#f5c542'; q.fillRect(42, 44, 44, 34); q.strokeStyle = '#f5c542'; q.lineWidth = 8; q.beginPath(); q.arc(64, 44, 14, Math.PI, 0); q.stroke(); q.fillStyle = '#17111f'; q.fillRect(61, 54, 6, 14);
    q.fillStyle = '#f2f6ff'; q.font = 'bold 26px monospace'; q.textAlign = 'center'; q.fillText(`${UNLOCK_GATE} УР`, 64, 106);
    const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace; mesh(G.plane, new THREE.MeshBasicMaterial({ map: pt, transparent: true, polygonOffset: true, polygonOffsetFactor: -3 }), 0, 0, 0, 1.1, 1.1, 1, plate);
    mesh(G.plane, new THREE.MeshBasicMaterial({ map: pt, transparent: true, polygonOffset: true, polygonOffsetFactor: -3 }), 0, 0, -.18, 1.1, 1.1, 1, plate).rotation.y = Math.PI; }
  const gateSolid = addSolid(B.x0 + .2, B.z0, B.x0 + .6, B.z1, 0, 2.8); let gateAnim = D.seen.gate ? 99 : -1;
  if (D.seen.gate) { gate.remove(grate); gateSolid.on = false; }

  /* ---------- кучи ---------- */
  const piles = PILES.map(([dx, dz], i) => { const p = new THREE.Group(); p.position.set(C.x + dx, 0, C.z + dz); p.rotation.y = i * 1.7; g.add(p); const shiny = i === 4 || i === 6; p.add(pileModel(i % 3, shiny));
    const pile = { g: p, x: C.x + dx, z: C.z + dz, i, shiny, max: shiny ? 6 : i % 2 ? 7 : 4, hp: 0, regrowT: 0, sq: 0, give: [], solid: addSolid(C.x + dx - 1.1, C.z + dz - 1.1, C.x + dx + 1.1, C.z + dz + 1.1, 0, 1.1) }; return pile; });
  // сколько деталей даст куча (3-8), распределено по ударам
  function stock(p) { p.hp = p.max; const total = p.shiny ? 6 + ((random() * 3) | 0) : p.max > 4 ? 5 + ((random() * 4) | 0) : 3 + ((random() * 3) | 0); p.give = Array(p.max).fill(0); for (let k = 0; k < total; k++) p.give[(random() * p.max) | 0]++; }
  piles.forEach(stock);
  /* ---------- детали ---------- */
  const partGeo = [G.box, G.cyl8, G.torus], parts = [];
  const partMats = [m.metal, m.rust, m.red, m.mint, m.cream];
  function spawnPart(x, y, z, gold) { const q = mesh(partGeo[(random() * 3) | 0], gold ? m.gold : partMats[(random() * partMats.length) | 0], x, y, z, .13, .13, .13, g);
    parts.push({ m: q, v: new V3((random() - .5) * 5, 4 + random() * 3, (random() - .5) * 5), w: new V3(random() * 12, random() * 12, random() * 12), t: 0, val: gold ? 2 : 1 }); }

  /* ---------- постройки: призрак с 3D-плашкой → покупка → падает с неба ---------- */
  const SPOT = { oven: [C.x - 7.4, C.z - 5.6, .6], bench: [C.x + 7.6, C.z - 6.2, -.6], garage: [C.x + 3.6, C.z + 8.6, Math.PI] };
  const ghostM = new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: .22, depthWrite: false }), ghostEdge = new THREE.LineBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: .7 });
  const models = { oven: ovenModel, bench: benchModel, garage: garageModel }, B2 = {};
  for (const [k, [x, z, ry]] of Object.entries(SPOT)) { const real = new THREE.Group(); real.add(models[k]()); real.position.set(x, 0, z); real.rotation.y = ry; g.add(real);
    const ghost = new THREE.Group(); ghost.position.set(x, 0, z); ghost.rotation.y = ry; g.add(ghost); { const src = models[k](); src.updateMatrixWorld(true); const edges = []; src.traverse(o => { if (o.isMesh) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 35), ghostEdge); e.applyMatrix4(o.matrixWorld); edges.push(e); o.material = ghostM; } }); ghost.add(src); for (const e of edges) ghost.add(e); /* контур - только рёбра, без диагоналей */ }
    // 3D-плашка: иконка постройки, цена (детали, фисты), замок с уровнем, если рано
    const pc = document.createElement('canvas'); pc.width = 256; pc.height = 128; const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace;
    const plaque = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, transparent: true, depthTest: true })); plaque.position.set(x, 3.6, z); plaque.scale.set(3, 1.5, 1); g.add(plaque);
    const solid = k === 'garage' ? [addSolid(x - 2.3, z - 1.8, x + 2.3, z - 1.4, 0, 3.2), addSolid(x - 2.4, z - 1.7, x - 2.2, z + 1.7, 0, 3.2), addSolid(x + 2.2, z - 1.7, x + 2.4, z + 1.7, 0, 3.2)] : [addSolid(x - 1.25, z - 1.25, x + 1.25, z + 1.25, 0, k === 'oven' ? 2.2 : 1)];
    B2[k] = { real, ghost, plaque, pc, pt, solid, x, z, sig: '', drop: null }; }
  function drawPlaque(k) { const b2 = B2[k], c = BUILD[k], L = pl(), ok = L >= c.lvl, q = b2.pc.getContext('2d'), afford = D.parts >= c.parts && collection().coins >= c.fists, sig = [ok, afford, D.parts, collection().coins].join(); if (sig === b2.sig) return; b2.sig = sig;
    q.clearRect(0, 0, 256, 128); q.fillStyle = '#17111fe6'; q.beginPath(); q.roundRect(4, 4, 248, 120, 14); q.fill(); q.strokeStyle = ok ? (afford ? '#9be36b' : '#f5c542') : '#6a6478'; q.lineWidth = 4; q.beginPath(); q.roundRect(6, 6, 244, 116, 12); q.stroke();
    q.imageSmoothingEnabled = false; q.drawImage(iconCanvas(c.icon, 4), 14, 16, 64, 64);
    q.font = 'bold 26px monospace'; q.textBaseline = 'middle'; q.textAlign = 'left';
    if (!ok) { q.fillStyle = '#f5c542'; q.fillRect(100, 40, 30, 24); q.strokeStyle = '#f5c542'; q.lineWidth = 5; q.beginPath(); q.arc(115, 40, 10, Math.PI, 0); q.stroke(); q.fillStyle = '#f2f6ff'; q.fillText(`${c.lvl} УР`, 142, 52); }
    else { q.drawImage(iconCanvas('part', 2), 96, 22, 30, 30); q.fillStyle = D.parts >= c.parts ? '#f2f6ff' : '#ff8a8a'; q.fillText(String(c.parts), 132, 38); if (c.fists) { q.drawImage(iconCanvas('fist', 2), 96, 66, 30, 30); q.fillStyle = collection().coins >= c.fists ? '#f2f6ff' : '#ff8a8a'; q.fillText(String(c.fists), 132, 82); } }
    q.fillStyle = '#9be36b'; q.font = 'bold 18px monospace'; q.textAlign = 'center'; if (ok && afford) q.fillText('E', 46, 104); b2.pt.needsUpdate = true; }
  function setBuilt(k, on, animate) { const b2 = B2[k]; b2.real.visible = on; b2.ghost.visible = !on; b2.plaque.visible = !on; for (const s of b2.solid) s.on = on; if (on && animate) { b2.real.position.y = 18; b2.drop = { v: 0 }; } }
  for (const k of Object.keys(B2)) setBuilt(k, !!D.owned[k], false);
  // покупка постройки (E у призрака)
  for (const k of Object.keys(B2)) { const b2 = B2[k], c = BUILD[k]; W.interacts.push({ x: b2.x, z: b2.z, y: 0, r: 2.4, get label() { return pl() < c.lvl ? `Нужен ${c.lvl} уровень` : 'Построить'; }, enabled: () => !D.owned[k] && gateAnim > 2,
    act() { if (pl() < c.lvl || D.parts < c.parts || collection().coins < c.fists) { sfx('no'); return; } if (c.fists && !spendCoins(c.fists)) { sfx('no'); return; } D.parts -= c.parts; D.owned[k] = 1; save(D); setBuilt(k, true, true); sfx('fanfare'); } }); }

  /* ---------- печь, верстак, гараж: действия ---------- */
  const OV = B2.oven, GA = B2.garage, BE = B2.bench;
  const fire = mesh(G.box, lam({ color: 0xff8a1f, emissive: 0xff6a10, emissiveIntensity: .6 }, 'junk-fire'), 0, .85, 1.19, .82, .74, .02, OV.real);
  let ovenT = 0, ovenOut = 0;
  W.interacts.push({ x: OV.x + Math.sin(.6) * 1.6, z: OV.z + Math.cos(.6) * 1.6, y: 0, r: 1.8, label: 'Переплавить детали', enabled: () => D.owned.oven && D.parts >= OVEN_RATE && ovenT <= 0,
    act() { const n = Math.min(5, Math.floor(D.parts / OVEN_RATE)); D.parts -= n * OVEN_RATE; save(D); ovenT = 1.4; ovenOut = n; sfx('boom', { v: .4 }); } });
  const panel = document.getElementById('junkPanel') || Object.assign(document.createElement('div'), { id: 'junkPanel', className: 'hidden' }); if (!panel.parentNode) document.body.appendChild(panel);
  function closePanel() { panel.classList.add('hidden'); globalThis.__junkPanel = false; }
  const ico = (n, s = 28) => `<img class="pxi" src="${iconCanvas(n, 3).toDataURL()}" width="${s}" height="${s}" alt="">`;
  const pip = (n, mx) => Array.from({ length: mx }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  function openBench() { globalThis.__junkPanel = true; document.exitPointerLock?.(); panel.classList.remove('hidden');
    panel.innerHTML = `<div class="jp"><button class="jx" data-a="close">✕</button><div class="jh">${ico('part')}<b>${D.parts}</b></div><div class="jc">` + Object.entries(UPG).map(([k, u]) => { const lv = D.up[k], done = lv >= u.max, cost = u.cost[lv];
      return `<button class="jcard ${done ? 'done' : D.parts >= cost ? '' : 'poor'}" data-a="up:${k}">${ico(u.icon, 40)}<span class="pips">${pip(lv, u.max)}</span><span class="cost">${done ? '✔' : ico('part', 16) + cost}</span></button>`; }).join('') + `</div></div>`; }
  function openGarage() { globalThis.__junkPanel = true; document.exitPointerLock?.(); panel.classList.remove('hidden');
    panel.innerHTML = `<div class="jp"><button class="jx" data-a="close">✕</button><div class="jh">${ico('part')}<b>${D.parts}</b></div><div class="jc">` + (!D.bot.built ? `<button class="jcard ${D.parts >= BOT_COST ? '' : 'poor'}" data-a="build">${ico('robot', 40)}<span class="cost">${ico('part', 16)}${BOT_COST}</span></button>`
      : [10, 30].map(mn => `<button class="jcard" data-a="go:${mn}">${ico('robot', 40)}<span class="cost">${ico('clock', 16)}${mn}:00</span></button>`).join('')) + `</div></div>`; }
  panel.onclick = e => { const b3 = e.target.closest('[data-a]'); if (!b3) return; const a = b3.dataset.a; if (a === 'close') return closePanel();
    if (a.startsWith('up:')) { const k = a.slice(3), u = UPG[k], lv = D.up[k], cost = u.cost[lv]; if (lv >= u.max || D.parts < cost) { sfx('no'); return; } D.parts -= cost; D.up[k]++; save(D); sfx('fanfare'); burst(BE.x, 1.6, BE.z, 20, { color: 0xf5c542, size: .2, speed: 3, up: 3 });
      if (k === 'piles') for (let i = 0; i < pileCount(); i++) { const p = piles[i]; if (!p.g.visible && p.hp > 0) { p.g.visible = true; p.solid.on = true; p.g.position.y = 14; drops.push({ o: p.g, v: 0 }); } } openBench(); }
    if (a === 'build') { if (D.parts < BOT_COST) { sfx('no'); return; } D.parts -= BOT_COST; D.bot.built = true; save(D); assemble = 1.6; sfx('fanfare'); openGarage(); }
    if (a.startsWith('go:')) { const mn = +a.slice(3); if (!D.bot.built || D.bot.until) return; D.bot.dur = mn; D.bot.until = Date.now() + mn * 60000; save(D); launchT = 0; sfx('dash'); closePanel(); } };
  addEventListener('keydown', e => { if (e.code === 'Escape' && globalThis.__junkPanel) closePanel(); });
  W.interacts.push({ x: BE.x + Math.sin(-.6) * 1.4, z: BE.z + Math.cos(-.6) * 1.4, y: 0, r: 1.8, label: 'Верстак', enabled: () => !!D.owned.bench, act: openBench });
  const pad = mesh(G.cyl12, lam({ color: 0x4ab0f0, emissive: 0x4ab0f0, emissiveIntensity: .3 }, 'junk-pad'), 0, .09, .2, .9, .04, .9, GA.real);
  const bot = new THREE.Group(); GA.real.add(bot); bot.position.set(0, .12, .2);
  bot.add(compose('junk73-bot', a => { a(G.box, col(0x8a9aa8), 0, .72, 0, .7, .7, .6); a(G.box, m.metal, 0, .72, .31, .5, .5, .02); for (let k = 0; k < 3; k++) a(G.sph, glow([0xff5a6e, 0x9be36b, 0xf5c542][k]), -.15 + k * .15, .82, .33, .04, .04, .02);
    a(G.box, col(0x6a7a88), 0, 1.27, 0, .56, .42, .5); for (const s of [-1, 1]) { a(G.sph, glow(0x7af0ff), s * .14, 1.3, .26, .08, .08, .03); a(G.cyl8, m.metal, s * .45, .72, 0, .07, .5, .07); a(G.box, m.metal, s * .45, .42, .05, .14, .1, .18); }
    a(G.cyl6, m.metal, 0, 1.6, 0, .02, .3, .02); a(G.sph, glow(0xff3a3a), 0, 1.78, 0, .06, .06, .06); a(G.box, m.rust, 0, .26, 0, .95, .2, .95); for (const [x, z] of [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]]) a(G.cyl8, m.dark, x, .14, z, .1, .08, .1, 0, 0, Math.PI / 2); a(G.cyl8, m.metal, 0, 2.0, 0, .04, .4, .04); }));
  const prop = new THREE.Group(); prop.position.y = 2.2; bot.add(prop); prop.add(compose('junk73-botprop', a => { a(G.box, m.wood, 0, 0, 0, 1.6, .04, .14); a(G.box, m.wood, 0, 0, 0, .14, .04, 1.6); }));
  const sack = mesh(G.sph10, lam({ map: T.cloth(0x8a5a36), color: 0xffffff }, 'junk-sack'), .55, .55, -.3, .35, .35, .3, bot); sack.visible = false;
  const timerC = document.createElement('canvas'); timerC.width = 128; timerC.height = 32; const timerT = new THREE.CanvasTexture(timerC); const timerS = new THREE.Sprite(new THREE.SpriteMaterial({ map: timerT, transparent: true })); timerS.scale.set(1.8, .45, 1); timerS.position.set(GA.x, 3.9, GA.z); g.add(timerS);
  W.interacts.push({ x: GA.x, z: GA.z - 2, y: 0, r: 2, get label() { return D.bot.until && Date.now() >= D.bot.until ? 'Забрать добычу' : 'Гараж'; }, enabled: () => !!D.owned.garage && !(D.bot.until && Date.now() < D.bot.until),
    act() { if (D.bot.until && Date.now() >= D.bot.until) { const n = D.bot.dur >= 30 ? 60 + ((random() * 31) | 0) : 20 + ((random() * 16) | 0); D.bot.until = 0; save(D); sack.visible = false; const vis = Math.min(25, n); for (let i = 0; i < vis; i++) setTimeout(() => spawnPart(GA.x, 1.2, GA.z - .6, i % 8 === 0), i * 45); if (n > vis) { D.parts += n - vis; save(D); } sfx('fanfare'); } else openGarage(); } });

  /* ---------- дирижабль ---------- */
  const ship = shipModel(); g.add(ship); ship.visible = false; const crates = []; let shipRun = null;
  const drops = [], pileCount = () => [3, 5, 7][D.up.piles] ?? 3, regrowTime = () => [90, 60, 40][D.up.regrow] ?? 90, magnetR = () => D.up.magnet ? 5.5 : 2.6;
  let assemble = 0, launchT = -1, lastL = -1, tSig = '';
  function refreshPiles() { piles.forEach((p, i) => { const on = i < pileCount() && gateAnim > 2; p.g.visible = on && p.hp > 0; p.solid.on = on && p.hp > 0; }); }
  function hitPile(p, n) { if (p.hp <= 0 || !p.g.visible) return false; for (let k = 0; k < n && p.hp > 0; k++) { p.hp--; const c = p.give[p.hp] || 0; for (let j = 0; j < c; j++) spawnPart(p.x, 1, p.z, p.shiny && random() < .5); }
    p.sq = 1; sfx('wood', { at: p.g.position, v: .7 }); burst(p.x, .7, p.z, 8, { color: 0xa89a8a, size: .16, speed: 2.5, up: 2 });
    if (p.hp <= 0) { p.g.visible = false; p.solid.on = false; p.regrowT = regrowTime(); smokeRing(p.x, .1, p.z, 3.5, { speed: 2, color: 0xa89a8a }); for (let k = 0; k < 6; k++) chunk(p.x, .6, p.z, [(random() - .5) * 5, 3 + random() * 2, (random() - .5) * 5], { mat: [m.rust, m.white, m.wood][k % 3], size: .18, sy: .6, life: 1.6 }); } return true; }
  const fmt = ms => { const t = Math.max(0, Math.ceil(ms / 1000)), p2 = n => String(n).padStart(2, '0'); return `${p2(Math.floor(t / 3600))}:${p2(Math.floor(t % 3600 / 60))}:${p2(t % 60)}`; };
  refreshPiles(); renderChip();
  return {
    walk: junkWalk,
    punch(P) { if ((P.junkCD || 0) > 0) return false; const f = P.root.rotation.y, px = P.pos.x + Math.sin(f) * .9, pz = P.pos.z + Math.cos(f) * .9; let best = null, bd = 2.3;
      for (const p of piles) { if (!p.g.visible || p.hp <= 0) continue; const d = Math.hypot(p.x - px, p.z - pz); if (d < bd) { bd = d; best = p; } } if (!best) return false; P.junkCD = .32; P.swatT = .25; return hitPile(best, 1); },
    hit(pt, power) { if (power < 1) return; for (const p of piles) if (p.g.visible && Math.hypot(p.x - pt.x, p.z - pt.z) < 1.4 && pt.y < 2.2) hitPile(p, power > 4 ? 2 : 1); },
    update(dt, t, P) {
      if (P) P.junkCD = (P.junkCD || 0) - dt;
      const L = pl(); if (L !== lastL) { lastL = L; for (const k of Object.keys(B2)) B2[k].sig = ''; renderChip(); }
      // ворота: при первом входе с открытым уровнем - решётка поднимается, плашка гаснет, решётка взрывается
      if (gateAnim < 0 && L >= UNLOCK_GATE && P && Math.hypot(P.pos.x - B.x0, P.pos.z - (B.z0 + B.z1) / 2) < 14) { gateAnim = 0; sfx('crane'); }
      if (gateAnim >= 0 && gateAnim < 99) { gateAnim += dt; const k = Math.min(1, gateAnim / 1.6); plate.scale.setScalar(Math.max(.01, 1 - k * 2)); grate.position.y = k * k * 2.2; grate.rotation.x = Math.sin(gateAnim * 25) * .02 * (1 - k);
        if (gateAnim >= 1.6 && grate.parent) { const p0 = grate.getWorldPosition(new V3()); for (let i = 0; i < 16; i++) chunk(p0.x, p0.y + 1.4 + random(), p0.z + (random() - .5) * 3, [(random() - .5) * 8, 4 + random() * 4, (random() - .5) * 8], { mat: i % 2 ? m.rust : m.metal, size: .16, sy: 2, life: 2.2 });
          burst(p0.x, p0.y + 1.5, p0.z, 30, { color: 0xffa040, size: .3, speed: 6, up: 3 }); smokeRing(p0.x, .1, p0.z, 6, { speed: 4 }); sfx('boom'); gate.remove(grate); gateSolid.on = false; D.seen.gate = 1; save(D); gateAnim = 99; refreshPiles(); } }
      gear.rotation.z += dt * .4; fire.material.emissiveIntensity = .5 + Math.sin(t * 7) * .15 + (ovenT > 0 ? 1.4 : 0);
      for (const k of Object.keys(B2)) { const b2 = B2[k]; if (b2.plaque.visible) { drawPlaque(k); const near = P ? Math.hypot(P.pos.x - b2.x, P.pos.z - b2.z) : 99, s = near < 5 ? 1.25 : 1; b2.plaque.scale.set(3 * s, 1.5 * s, 1); b2.plaque.position.y = 3.6 + Math.sin(t * 2) * .08; b2.ghost.children.forEach(o => o.visible = true); }
        if (b2.drop) { const d = b2.drop; d.v -= 30 * dt; b2.real.position.y += d.v * dt; if (b2.real.position.y <= 0) { b2.real.position.y = 0; if (d.v < -4) { d.v *= -.25; burst(b2.x, .3, b2.z, 22, { color: 0xc8b8a8, size: .32, speed: 3.5, up: 2 }); smokeRing(b2.x, .1, b2.z, 6, { speed: 3 }); sfx('land', { v: 1 }); } else b2.drop = null; } } }
      ghostM.opacity = .18 + Math.sin(t * 2.5) * .06;
      for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.v -= 30 * dt; d.o.position.y += d.v * dt; if (d.o.position.y <= 0) { d.o.position.y = 0; if (d.v < -4) { d.v *= -.25; burst(d.o.position.x, .3, d.o.position.z, 14, { color: 0xc8b8a8, size: .3, speed: 3, up: 2 }); } else drops.splice(i, 1); } }
      for (const p of piles) { p.sq = Math.max(0, p.sq - dt * 4); const k = p.hp / p.max, S = p.shiny ? 1.3 : p.max > 4 ? 1.55 : 1.2; p.g.scale.set(S * (1 + p.sq * .12), S * (.5 + k * .5) * (1 - p.sq * .18), S * (1 + p.sq * .12)); if (p.hp <= 0 && p.i < pileCount()) p.regrowT -= dt; }
      const due = piles.filter(p => p.hp <= 0 && p.i < pileCount() && p.regrowT <= 0 && !p.crate);
      if (due.length && !shipRun && gateAnim > 2) { shipRun = { t: 0, list: due, dropped: new Set() }; ship.visible = true; sfx('wind', { v: .5 }); }
      for (const pr of ship.userData.props) pr.rotation.z += dt * 18;
      if (shipRun) { const r = shipRun; r.t += dt; const k = r.t / 9; ship.position.set(C.x - 26 + k * 52, 15 + Math.sin(t * .8) * .5, C.z + Math.sin(k * 3) * 2); ship.rotation.set(Math.sin(t * .9) * .03, -Math.PI / 2, Math.sin(t * 1.1) * .05);
        for (const p of r.list) if (!r.dropped.has(p) && ship.position.x > p.x - .5) { r.dropped.add(p); p.crate = true; const c = new THREE.Group(); c.add(crateChute()); c.position.copy(ship.position).setY(12.6); g.add(c); crates.push({ c, p, t: 0 }); sfx('pop'); }
        if (k >= 1) { shipRun = null; ship.visible = false; } }
      for (let i = crates.length - 1; i >= 0; i--) { const q = crates[i]; q.t += dt; q.c.position.y -= dt * 2.8; q.c.position.x += (q.p.x - q.c.position.x) * Math.min(1, dt * 1.5); q.c.position.z += (q.p.z - q.c.position.z) * Math.min(1, dt * 1.5); q.c.rotation.z = Math.sin(q.t * 2.2 + i) * .18; q.c.rotation.x = Math.cos(q.t * 1.7 + i) * .12;
        if (q.c.position.y <= .3) { q.c.removeFromParent(); crates.splice(i, 1); const p = q.p; p.crate = false; stock(p); p.g.visible = true; p.solid.on = true; p.sq = 1; burst(p.x, .5, p.z, 18, { color: 0xc8b8a8, size: .3, speed: 3, up: 2 }); for (let k = 0; k < 4; k++) chunk(p.x, .6, p.z, [(random() - .5) * 4, 3, (random() - .5) * 4], { mat: m.crate, size: .2, sy: .2, life: 1.5 }); sfx('wood', { at: p.g.position }); } }
      const R = magnetR();
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; const mm = q.m;
        if (P && (q.t > .35 && mm.position.distanceTo(P.pos) < R || q.t > 2.2)) { const to = P.pos.clone().add(new V3(0, 1, 0)), d = to.sub(mm.position), L2 = d.length(); mm.position.addScaledVector(d.normalize(), Math.min(L2, dt * (8 + q.t * 6))); mm.scale.setScalar(.13 * Math.min(1, L2 + .3));
          if (L2 < .35) { mm.removeFromParent(); parts.splice(i, 1); D.parts += q.val; save(D); sfx('click', { v: .35 }); bumpChip(); continue; } }
        else { q.v.y -= 14 * dt; mm.position.addScaledVector(q.v, dt); if (mm.position.y < .08) { mm.position.y = .08; q.v.multiplyScalar(.4); q.v.y = Math.abs(q.v.y) * .35; } }
        mm.rotation.x += q.w.x * dt; mm.rotation.y += q.w.y * dt; }
      if (ovenT > 0) { ovenT -= dt; if (random() < dt * 8) puff(OV.x + .45, 4.7, OV.z - .25, { color: 0x6a6a6a, size: .45, vy: 1.4, life: 1.4 }); if (ovenT <= 0 && ovenOut) { for (let i = 0; i < ovenOut; i++) { const c = spawnCoin(OV.x + Math.sin(.6) * 1.4, 1, OV.z + Math.cos(.6) * 1.4, true); if (c) c.vel.set(Math.sin(.6) * 3 + (random() - .5), 3, Math.cos(.6) * 3 + (random() - .5)); } ovenOut = 0; sfx('points'); } }
      if (assemble > 0) { assemble -= dt; bot.scale.setScalar(1 - Math.max(0, assemble) / 1.6 * .9); if (random() < dt * 20) spawnPart(GA.x + (random() - .5) * 3, 1.5, GA.z + (random() - .5) * 3, false); }
      const away = D.bot.until && Date.now() < D.bot.until, back = D.bot.until && Date.now() >= D.bot.until;
      bot.visible = !!D.owned.garage && D.bot.built && (!away || launchT >= 0 && launchT < 2.5); prop.rotation.y += dt * (away || back ? 30 : 0);
      if (away && launchT >= 0) { launchT += dt; bot.position.set(launchT * 3, .12 + launchT * launchT * 2.5, .2 + launchT * 4); } else if (!away) { bot.position.set(0, .12 + (back ? Math.abs(Math.sin(t * 3)) * .1 : 0), .2); launchT = -1; }
      sack.visible = !!back; pad.material.emissiveIntensity = back ? .6 + Math.sin(t * 6) * .4 : .3;
      timerS.visible = !!D.owned.garage; if (timerS.visible) { const txt = !D.bot.built ? '' : away ? fmt(D.bot.until - Date.now()) : back ? '!' : ''; if (txt !== tSig) { tSig = txt; const q = timerC.getContext('2d'); q.clearRect(0, 0, 128, 32); if (txt) { q.fillStyle = '#17111fd8'; q.fillRect(0, 0, 128, 32); q.fillStyle = back ? '#9be36b' : '#f2f6ff'; q.font = 'bold 22px monospace'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(txt, 64, 17); } timerT.needsUpdate = true; } }
    },
  };
}
// счётчик деталей - рядом с фистами (справа сверху)
let box = null;
function bumpChip() { renderChip(); if (!box) return; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); }
export function renderChip() { box ??= document.getElementById('partsBox'); if (!box) return; box.classList.toggle('hidden', levelOf(progress().xp) < UNLOCK_GATE); document.getElementById('menuParts').textContent = junkData().parts; }
addEventListener('junkchange', renderChip);
