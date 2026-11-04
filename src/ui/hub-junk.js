import { random } from '../core/random.js';
import { THREE, G, V3, mesh, col, lam, tmat, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid, groundAt } from '../world/physics.js';
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
export function junkWalk(x, z) { const B = JUNK.bridge; if (x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1) return true; const dx = x - JUNK.c.x, dz = z - JUNK.c.z; return Math.hypot(dx, dz) < jr(Math.atan2(dz, dx)) - .12; }
const DEF = () => ({ parts: 0, up: { piles: 0, regrow: 0, magnet: 0 }, bot: { built: false, until: 0, dur: 0 }, owned: {}, seen: {} });
export function junkData() { try { const d = JSON.parse(localStorage.getItem(JUNK_KEY) || 'null'); if (!d) return DEF(); const o = DEF(); return { ...o, ...d, up: { ...o.up, ...(d.up || {}) }, bot: { ...o.bot, ...(d.bot || {}) }, owned: d.owned || {}, seen: d.seen || {} }; } catch { return DEF(); } }
function save(d) { try { localStorage.setItem(JUNK_KEY, JSON.stringify(d)); } catch { } dispatchEvent(new Event('junkchange')); }
const UNLOCK_GATE = 1;
// цены построек: детали + фисты, плюс уровень игрока
/* v0.74: порог ниже, каждый уровень открывает сразу несколько точек; печь - только детали, остальное - детали + фисты */
const BUILD = { oven: { lvl: 1, parts: 30, fists: 0, icon: 'oven' }, wreck: { lvl: 2, parts: 60, fists: 0, icon: 'wreck' }, bench: { lvl: 2, parts: 120, fists: 10, icon: 'bench' },
  garage: { lvl: 3, parts: 300, fists: 30, icon: 'robot' }, crane: { lvl: 4, parts: 400, fists: 40, icon: 'crane', py: 7.4 } };
const UPG = { piles: { max: 2, cost: [80, 200], icon: 'pile' }, regrow: { max: 2, cost: [100, 250], icon: 'ship' }, magnet: { max: 1, cost: [150], icon: 'magnet' } };
const OVEN_RATE = 15, BOT_COST = 0, WRECK_RESPAWN = 300, CRANE_CD = 180, MAX_PARTS = 70;
const PILES = [[-1, -2.5], [3.8, 1.2], [-4.2, 2.6], [1, 5.2], [-3.4, -6.2], [6.2, -2.2], [-7.6, -.8]];
const pl = () => levelOf(progress().xp);

/* ---------- модели (переиспользуемые, через compose-кэш) ---------- */
const M = {};
function mats() { if (M.ok) return M; M.ok = 1;
  M.rust = tmat(T.rust()); M.metal = tmat(T.metal()); M.wood = tmat(T.wood()); M.dark = col(0x2b2533); M.tire = tmat(T.tread()); M.hub = tmat(T.hubcap()); M.crate = tmat(T.crate());
  M.white = lam({ color: 0xd8d4cc }, 'junk73-white'); M.cream = lam({ color: 0xcfc2a2 }, 'junk73-cream'); M.mint = lam({ color: 0x8ab8a8 }, 'junk73-mint'); M.red = lam({ color: 0xa83a2a }, 'junk73-red');
  M.snow = lam({ color: 0xeef3fb }, 'rail71-snow'); M.dirt = lam({ map: T.dirt(), color: 0xb09a88 }, 'junk73-dirt'); M.gold = lam({ color: 0xf5c542, emissive: 0x8a5a10, emissiveIntensity: .5 }, 'junk-gold');
  M.copper = lam({ color: 0xc8743a, emissive: 0x3a1a08, emissiveIntensity: .4 }, 'junk74-copper'); M.pcb = lam({ color: 0x2e7a4a }, 'junk74-pcb'); M.concrete = tmat(T.concrete ? T.concrete() : T.stone()); M.yellow = lam({ color: 0xf5c542 }, 'junk73-stripe');
  M.screen = tmat(T.tvScreen('happy')); M.glass = lam({ color: 0x6a8aa8, emissive: 0x1a2a3a, emissiveIntensity: .5 }, 'junk73-glass'); return M; }
// предметы хлама - каждый из 4-8 частей, читаются силуэтом
const JUNKBITS = {
  fridge: (a, x, y, z, r) => { const m = mats(); a(G.box, m.white, x, y + .55, z, .62, 1.1, .58, 0, r, 0); a(G.box, m.cream, x + Math.sin(r) * .3, y + .55, z + Math.cos(r) * .3, .6, 1.06, .03, 0, r, 0); a(G.box, m.dark, x + Math.sin(r) * .32 + Math.cos(r) * .2, y + .7, z + Math.cos(r) * .32 - Math.sin(r) * .2, .04, .3, .04, 0, r, 0); a(G.box, m.dark, x, y + .78, z, .63, .02, .59, 0, r, 0); },
  tv: (a, x, y, z, r) => { const m = mats(); a(G.box, m.cream, x, y + .25, z, .55, .45, .45, 0, r, 0); a(G.box, m.screen, x + Math.sin(r) * .23, y + .27, z + Math.cos(r) * .23, .42, .32, .02, 0, r, 0); a(G.cyl6, m.dark, x, y + .55, z, .01, .2, .01, 0, r, .5); a(G.cyl6, m.dark, x, y + .55, z, .01, .2, .01, 0, r, -.5); },
  barrel: (a, x, y, z, r, tip = 0) => { const m = mats(); a(G.cyl12, m.red, x, y + .4, z, .28, .8, .28, tip, r, 0); for (const yy of [.15, .65]) a(G.cyl12, m.rust, x, y + yy, z, .29, .04, .29, tip, r, 0); a(G.cyl8, m.dark, x, y + .81, z, .06, .02, .06, tip, r, 0); },
  pipe: (a, x, y, z, r) => { const m = mats(); a(G.cyl8, m.rust, x, y + .12, z, .1, 1.4, .1, Math.PI / 2, r, 0); a(G.cyl8, m.metal, x + Math.sin(r) * .7, y + .12, z + Math.cos(r) * .7, .13, .08, .13, Math.PI / 2, r, 0); },
  crate: (a, x, y, z, r) => { const m = mats(); a(G.box, m.crate, x, y + .25, z, .5, .5, .5, 0, r, 0); },
  spring: (a, x, y, z) => { const m = mats(); for (let i = 0; i < 5; i++) a(G.torus, m.metal, x, y + .05 + i * .06, z, .12, .12, .2, Math.PI / 2, 0, 0); },
  planks: (a, x, y, z, r) => { const m = mats(); for (let i = 0; i < 3; i++) a(G.box, m.wood, x + (i - 1) * .12, y + .05 + i * .04, z, .11, .04, 1.1, 0, r + i * .2, 0); },
  bike: (a, x, y, z, r) => { const m = mats(), o = (dx, dz) => [x + Math.cos(r) * dx + Math.sin(r) * dz, z - Math.sin(r) * dx + Math.cos(r) * dz]; for (const s of [-1, 1]) { const [wx, wz] = o(0, s * .42); a(G.torus, m.dark, wx, y + .06, wz, .28, .28, .12, Math.PI / 2, 0, 0); a(G.cyl6, m.metal, wx, y + .06, wz, .03, .04, .03); }
    a(G.cyl6, m.red, x, y + .1, z, .03, .84, .03, Math.PI / 2, r, 0); { const [px, pz] = o(0, .1); a(G.cyl6, m.red, px, y + .12, pz, .03, .5, .03, Math.PI / 2, r + .9, 0); } { const [hx, hz] = o(.05, .4); a(G.cyl6, m.metal, hx, y + .14, hz, .02, .5, .02, 0, r, Math.PI / 2); } },
  chair: (a, x, y, z, r) => { const m = mats(); a(G.box, m.mint, x, y + .3, z, .45, .06, .45, 0, r, .9); a(G.box, m.mint, x + Math.cos(r) * .2, y + .45, z - Math.sin(r) * .2, .45, .5, .05, 0, r + Math.PI / 2, .9); for (const s of [-1, 1]) a(G.cyl6, m.metal, x + Math.sin(r) * s * .18, y + .2, z + Math.cos(r) * s * .18, .02, .45, .02, 0, r, .9 - 1.2); },
  radiator: (a, x, y, z, r) => { const m = mats(); for (let i = 0; i < 7; i++) a(G.box, m.cream, x + Math.sin(r) * (i - 3) * .09, y + .3, z + Math.cos(r) * (i - 3) * .09, .14, .56, .06, 0, r + Math.PI / 2, 0); a(G.box, m.rust, x, y + .03, z, .2, .05, .7, 0, r, 0); },
  sheet: (a, x, y, z, r) => { const m = mats(); a(G.box, m.rust, x, y + .08, z, .9, .03, .6, .25, r, .1); a(G.box, m.metal, x + Math.cos(r) * .5, y + .25, z - Math.sin(r) * .5, .5, .03, .6, .25, r, -.9); },
  bucket: (a, x, y, z, r) => { const m = mats(); a(G.cyl12, m.metal, x, y + .16, z, .17, .32, .17, 1.4, r, 0); a(G.torus, m.dark, x, y + .2, z, .17, .17, .2, 0, r, 0); },
  battery: (a, x, y, z, r) => { const m = mats(); a(G.box, m.dark, x, y + .14, z, .45, .28, .25, 0, r, 0); a(G.cyl8, m.red, x + Math.cos(r) * .14, y + .31, z - Math.sin(r) * .14, .04, .06, .04); a(G.cyl8, m.metal, x - Math.cos(r) * .14, y + .31, z + Math.sin(r) * .14, .04, .06, .04); a(G.box, m.cream, x, y + .29, z, .3, .01, .12, 0, r, 0); },
  door: (a, x, y, z, r) => { const m = mats(); a(G.box, m.red, x, y + .06, z, 1.0, .07, .62, .12, r, 0); a(G.box, m.glass, x + Math.cos(r) * .2, y + .11, z - Math.sin(r) * .2, .5, .02, .4, .12, r, 0); a(G.box, m.metal, x - Math.cos(r) * .3, y + .11, z + Math.sin(r) * .3, .12, .03, .04, .12, r, 0); },
  sign: (a, x, y, z, r) => { const m = mats(); a(G.cyl6, m.metal, x, y + .06, z, .04, 1.3, .04, Math.PI / 2, r, 0); a(G.cyl12, m.red, x + Math.sin(r) * .65, y + .12, z + Math.cos(r) * .65, .3, .03, .3, .1, r, 0); a(G.cyl12, m.white, x + Math.sin(r) * .65, y + .14, z + Math.cos(r) * .65, .22, .02, .22, .1, r, 0); },
  gearbox: (a, x, y, z, r) => { const m = mats(); a(G.box, m.metal, x, y + .22, z, .55, .42, .4, 0, r, 0); a(G.cyl12, m.rust, x + Math.cos(r) * .32, y + .22, z - Math.sin(r) * .32, .22, .1, .22, 0, r, Math.PI / 2); a(G.cyl8, m.dark, x - Math.cos(r) * .34, y + .22, z + Math.sin(r) * .34, .06, .2, .06, 0, r, Math.PI / 2); },
  washer: (a, x, y, z, r) => { const m = mats(); a(G.box, m.white, x, y + .42, z, .6, .84, .6, 0, r, 0); a(G.cyl12, m.dark, x + Math.sin(r) * .3, y + .45, z + Math.cos(r) * .3, .2, .03, .2, Math.PI / 2, r, 0); a(G.cyl12, m.glass, x + Math.sin(r) * .31, y + .45, z + Math.cos(r) * .31, .15, .02, .15, Math.PI / 2, r, 0); },
};
/* v0.74: куча - 3 стадии разрушения (полная → половина → остатки), 15-25 предметов слоями на холме */
const PILE_SETS = [['fridge', 'bike', 'pipe', 'crate', 'radiator', 'barrel', 'door'], ['tv', 'barrel', 'washer', 'chair', 'sign', 'planks', 'gearbox'], ['washer', 'crate', 'tv', 'radiator', 'bike', 'door', 'battery']];
const SMALL = ['spring', 'bucket', 'battery', 'sheet', 'planks'];
function pileModel(v, shiny, st = 0) { return compose('junk74-pile' + v + st + (shiny ? 's' : ''), a => { const m = mats();
  const R = (i, k) => Math.sin(v * 13.1 + i * 7.3 + k) * .5 + .5, big = PILE_SETS[v % 3];
  const hill = [1, .78, .5][st]; a(G.ico, m.dirt, 0, .05, 0, 1.35, .55 * hill, 1.2); a(G.ico, m.snow, .1, .1 + .26 * hill, -.1, .85, .2 * hill, .75);
  // нижний слой: крупные вещи по кругу
  big.forEach((k, i) => { if (st === 2 && i % 2) return; const an = i / big.length * 6.283 + v, r = .7 + R(i, 1) * .45; JUNKBITS[k](a, Math.cos(an) * r, .05 + (st === 2 ? -.05 : 0), Math.sin(an) * r, an + R(i, 2) * 2, R(i, 3) * .5); });
  // средний слой
  if (st < 2) for (let i = 0; i < (st ? 3 : 6); i++) { const k = big[(i + 2) % big.length], an = i / 6 * 6.283 + v + .5, r = .3 + R(i, 4) * .3; JUNKBITS[k](a, Math.cos(an) * r, .42, Math.sin(an) * r, an + R(i, 5) * 3, R(i, 6) * .6); }
  // верх
  if (st === 0) for (let i = 0; i < 3; i++) { const k = SMALL[(i + v) % SMALL.length], an = i * 2.1 + v; JUNKBITS[k](a, Math.cos(an) * .22, .85, Math.sin(an) * .22, an, R(i, 7)); }
  // мелочь вокруг подножия: болты, листы, пружины
  for (let i = 0; i < (st === 2 ? 5 : 7); i++) { const k = SMALL[(i * 3 + v) % SMALL.length], an = i * .9 + R(i, 8) * 2, r = 1.15 + R(i, 9) * .35; JUNKBITS[k](a, Math.cos(an) * r, 0, Math.sin(an) * r, an * 1.7, 0); }
  if (shiny) for (let i = 0; i < (st === 2 ? 3 : 7); i++) { const an = i * 1.1; a(G.ico, m.gold, Math.cos(an) * .55, [.75, .5, .2][st] + (i % 2) * .12, Math.sin(an) * .55, .1, .1, .1); } }); }
/* v0.74: детали - разные модели (болт, гайка, шестерня, пружина, плата, катушка), читаются вблизи */
const PART_KINDS = ['bolt', 'nut', 'gear', 'spring', 'board', 'coil'];
function partModel(kind, gold) { return compose('junk74-part-' + kind + (gold ? 'g' : ''), a => { const m = mats(), met = gold ? m.gold : m.metal;
  if (kind === 'bolt') { a(G.cyl6, met, 0, .07, 0, .1, .05, .1); a(G.cyl8, met, 0, -.04, 0, .04, .18, .04); for (let i = 0; i < 3; i++) a(G.cyl8, m.dark, 0, -.02 - i * .045, 0, .045, .01, .045); }
  else if (kind === 'nut') { a(G.cyl6, met, 0, 0, 0, .1, .06, .1); a(G.cyl8, m.dark, 0, 0, 0, .045, .065, .045); }
  else if (kind === 'gear') { a(G.cyl12, met, 0, 0, 0, .12, .05, .12); for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; a(G.box, met, Math.cos(an) * .13, 0, Math.sin(an) * .13, .05, .05, .045, 0, -an, 0); } a(G.cyl8, m.dark, 0, 0, 0, .04, .055, .04); }
  else if (kind === 'spring') { for (let i = 0; i < 4; i++) a(G.torus, met, 0, -.06 + i * .04, 0, .07, .07, .12, Math.PI / 2, 0, 0); }
  else if (kind === 'board') { a(G.box, gold ? m.gold : m.pcb, 0, 0, 0, .26, .02, .18); a(G.box, m.dark, -.05, .02, .02, .07, .02, .07); a(G.box, m.dark, .07, .02, -.03, .05, .02, .04); for (let i = 0; i < 4; i++) a(G.box, m.gold, -.11 + i * .07, .012, -.085, .03, .005, .02); }
  else { a(G.cyl12, gold ? m.gold : m.copper, 0, 0, 0, .08, .16, .08, 0, 0, Math.PI / 2); for (const x of [-.09, .09]) a(G.cyl12, m.dark, x, 0, 0, .1, .02, .1, 0, 0, Math.PI / 2); } }); }
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

/* ---------- v0.74: машина под разбор - кузов на блоках + 10 съёмных частей ---------- */
const WRECK_PARTS = [ // имя, прочность, деталей, построитель (a, m)
  ['hood', 2, 3, (a, m) => { a(G.box, m.red, 0, .99, 1.42, 1.66, .06, 1.0, -.06, 0, 0); a(G.box, m.rust, .3, 1.03, 1.5, .5, .01, .4, -.06, 0, 0); }],
  ['trunk', 2, 3, (a, m) => { a(G.box, m.red, 0, .99, -1.62, 1.66, .06, .72, .05, 0, 0); }],
  ['doorL', 2, 3, (a, m) => { a(G.box, m.red, -.9, .78, -.05, .07, .56, 1.05); a(G.box, m.glass, -.9, 1.22, -.05, .04, .34, .9); a(G.box, m.metal, -.95, .86, .3, .03, .04, .14); }],
  ['doorR', 2, 3, (a, m) => { a(G.box, m.red, .9, .78, -.05, .07, .56, 1.05); a(G.box, m.glass, .9, 1.22, -.05, .04, .34, .9); a(G.box, m.metal, .95, .86, .3, .03, .04, .14); }],
  ['bumperF', 1, 2, (a, m) => { a(G.box, m.metal, 0, .5, 2.02, 1.86, .18, .14); for (const s of [-1, 1]) a(G.box, m.glass, s * .62, .78, 1.95, .3, .14, .04); }],
  ['bumperB', 1, 2, (a, m) => { a(G.box, m.metal, 0, .5, -2.02, 1.86, .18, .14); for (const s of [-1, 1]) a(G.box, m.red, s * .62, .78, -1.97, .26, .12, .04); }],
  ...[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => ['wheel' + i, 1, 2, (a, m) => { a(G.cyl12, m.dark, sx * .86, .36, sz * 1.25, .34, .24, .34, 0, 0, Math.PI / 2); a(G.cyl12, m.hub, sx * .99, .36, sz * 1.25, .2, .02, .2, 0, 0, Math.PI / 2); }]),
];
function wreckBody() { return compose('junk74-wreck-body', a => { const m = mats();
  a(G.box, m.red, 0, .66, 0, 1.76, .5, 3.9); a(G.box, m.dark, 0, .4, 0, 1.6, .12, 3.6); a(G.box, m.red, 0, 1.22, -.2, 1.6, .56, 1.9); a(G.box, m.dark, 0, 1.52, -.2, 1.62, .04, 1.92);
  a(G.box, m.glass, 0, 1.22, .76, 1.5, .44, .04, -.5, 0, 0); a(G.box, m.glass, 0, 1.22, -1.16, 1.5, .4, .04, .45, 0, 0);
  a(G.box, m.metal, 0, .82, 1.3, 1.1, .3, .7); a(G.cyl8, m.rust, -.3, 1.0, 1.3, .1, .1, .1); a(G.box, m.dark, 0, .75, -1.6, 1.5, .25, .6); // мотор и багажник внутри
  for (const s of [-1, 1]) { a(G.box, m.cream, s * .4, .95, -.2, .5, .1, .5); a(G.box, m.cream, s * .4, 1.2, -.45, .5, .45, .1); } // сиденья
  for (const [x, z] of [[-.6, 1.2], [.6, 1.2], [-.6, -1.2], [.6, -1.2]]) a(G.box, m.concrete, x, .17, z, .4, .34, .3); /* на блоках */ }); }
function wreckPart(i) { return compose('junk74-wreck-' + WRECK_PARTS[i][0], a => WRECK_PARTS[i][3](a, mats())); }
function wreckModel() { const g = new THREE.Group(); g.add(wreckBody()); WRECK_PARTS.forEach((_, i) => g.add(wreckPart(i))); return g; }
/* ---------- v0.74: кран-магнит, пресс и стопка машин. Стрела вращается отдельно (не в compose) ---------- */
const CRANE_REL = { stack: [-.2, -4.0], press: [-2.6, 3.6] }, CRANE_H = 6.2;
function craneBase() { return compose('junk74-crane-base', a => { const m = mats();
  a(G.box, m.concrete, 0, .3, 0, 1.7, .6, 1.7); for (const [x, z] of [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]]) a(G.box, m.yellow, x, .6 + CRANE_H / 2, z, .1, CRANE_H, .1);
  for (let k = 0; k < 8; k++) { const y = .9 + k * .7; for (const [x, z, ry] of [[0, -.4, 0], [0, .4, 0], [-.4, 0, Math.PI / 2], [.4, 0, Math.PI / 2]]) a(G.box, m.yellow, x, y + .35, z, .05, .95, .05, 0, ry, k % 2 ? .75 : -.75); }
  // пресс: станина, приёмная яма, ленточный жёлоб
  const [px, pz] = CRANE_REL.press; a(G.box, m.metal, px, .7, pz, 1.9, 1.4, 1.9); a(G.box, m.dark, px, 1.41, pz, 1.5, .02, 1.5); for (const s of [-1, 1]) a(G.box, m.yellow, px + s * .98, .7, pz, .04, 1.42, .3);
  for (const [x, z] of [[-.85, -.85], [.85, -.85], [-.85, .85], [.85, .85]]) a(G.box, m.rust, px + x, 2.4, pz + z, .14, 2.0, .14); a(G.box, m.rust, px, 3.45, pz, 1.95, .2, 1.95);
  a(G.box, m.metal, px + 1.3, .35, pz - .1, .8, .08, .9, 0, 0, -.35); // жёлоб выдачи
  // стопка расплющенных машин
  const [sx, sz] = CRANE_REL.stack; [0x8a5a3a, 0x5a7a8a, 0x6a8a4a, 0xa83a2a].forEach((c, i) => { const mm = lam({ color: c }, 'junk74-flat' + i); a(G.box, mm, sx + (i % 2) * .1, .22 + i * .42, sz, 1.8, .38, 3.6, 0, i * .08, 0); a(G.box, m.glass, sx, .3 + i * .42, sz - .3, 1.5, .1, .8, 0, i * .08, 0); }); }); }
function craneBoom() { return compose('junk74-crane-boom', a => { const m = mats();
  a(G.box, m.dark, 0, .5, 0, 1.1, 1.0, 1.0); a(G.box, m.glass, .56, .55, 0, .02, .5, .8); // кабина
  for (const z of [-.2, .2]) a(G.box, m.yellow, 2.4, 1.1, z, 5.2, .08, .08); for (let k = 0; k < 9; k++) a(G.box, m.yellow, .1 + k * .55, 1.1, 0, .05, .05, .42, 0, 0, 0);
  for (let k = 0; k < 9; k++) a(G.box, m.yellow, .35 + k * .55, 1.1, k % 2 ? .2 : -.2, .62, .05, .05, 0, k % 2 ? .6 : -.6, 0);
  a(G.box, m.concrete, -1.4, .9, 0, 1.0, .9, 1.1); a(G.box, m.yellow, -.7, 1.1, 0, 1.4, .1, .3); a(G.cyl6, m.metal, 0, 2.0, 0, .05, 1.8, .05); a(G.cyl6, m.metal, 2.4, 1.6, 0, .02, 1.6, .02, 0, 0, 1.2); }); }
function magnetModel() { return compose('junk74-magnet', a => { const m = mats(); a(G.cyl12, m.dark, 0, 0, 0, .75, .28, .75); a(G.cyl12, m.yellow, 0, -.15, 0, .78, .04, .78); a(G.cyl8, m.metal, 0, .25, 0, .2, .25, .2); for (const s of [-1, 1]) a(G.cyl6, m.metal, s * .5, .35, 0, .03, .4, .03, 0, 0, s * .8); }); }
function craneModel() { const g = new THREE.Group(); g.add(craneBase()); const b = craneBoom(); b.position.y = .6 + CRANE_H; b.rotation.y = Math.atan2(-CRANE_REL.stack[1], CRANE_REL.stack[0]); g.add(b); return g; }

/* ---------- статичный декор (до запекания хаба - одна отрисовка) ---------- */
export function buildJunkDecor(b) {
  const C = JUNK.c, m = mats();
    b.dumpster(C.x - 10.2, C.z - 2.6); b.forklift(C.x + 1.6, C.z - 10.4, .5);
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

  let D = junkData(); if (D.owned.garage) D.bot.built = true;
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
  const piles = PILES.map(([dx, dz], i) => { const p = new THREE.Group(); p.position.set(C.x + dx, 0, C.z + dz); p.rotation.y = i * 1.7; g.add(p); const shiny = i === 4 || i === 6; const stages = [0, 1, 2].map(st => { const o = pileModel(i % 3, shiny, st); o.visible = !st; p.add(o); return o; });
    const pile = { g: p, stages, stage: 0, x: C.x + dx, z: C.z + dz, i, shiny, max: shiny ? 6 : i % 2 ? 7 : 4, hp: 0, regrowT: 0, sq: 0, give: [], solid: addSolid(C.x + dx - 1.1, C.z + dz - 1.1, C.x + dx + 1.1, C.z + dz + 1.1, 0, 1.1) }; return pile; });
  // сколько деталей даст куча (3-8), распределено по ударам
  function stock(p) { p.hp = p.max; setStage(p, 0); const total = p.shiny ? 6 + ((random() * 3) | 0) : p.max > 4 ? 5 + ((random() * 4) | 0) : 3 + ((random() * 3) | 0); p.give = Array(p.max).fill(0); for (let k = 0; k < total; k++) p.give[(random() * p.max) | 0]++; }
  function setStage(p, st) { if (p.stage === st) return; p.stage = st; p.stages.forEach((o, i) => o.visible = i === st); }
  piles.forEach(stock);
  /* ---------- детали ---------- */
  const parts = [];
  function collect(q) { q.m.removeFromParent(); D.parts += q.val; }
  function spawnPart(x, y, z, gold, dir) { if (parts.length >= MAX_PARTS) { const old = parts.shift(); collect(old); save(D); bumpChip(); }
    const q = partModel(PART_KINDS[(random() * PART_KINDS.length) | 0], gold); q.position.set(x, y, z); q.rotation.set(random() * 6, random() * 6, random() * 6); q.scale.setScalar(1.6); g.add(q);
    const an = random() * 6.283, sp = 1.8 + random() * 2.6, dx = dir ? dir[0] : Math.cos(an), dz = dir ? dir[1] : Math.sin(an);
    parts.push({ m: q, v: new V3(dx * sp + (random() - .5), 4.2 + random() * 2.6, dz * sp + (random() - .5)), w: new V3((random() - .5) * 18, (random() - .5) * 18, (random() - .5) * 18), t: 0, val: gold ? 2 : 1, rest: false, b: 0 }); }

  /* ---------- постройки: призрак с 3D-плашкой → покупка → падает с неба ---------- */
  const SPOT = { oven: [C.x - 7.4, C.z - 5.6, .6], wreck: [C.x - 7.0, C.z + 6.4, 0], bench: [C.x + 7.6, C.z - 6.2, -.6], garage: [C.x + 3.6, C.z + 8.6, Math.PI], crane: [C.x + 10.0, C.z + 1.6, 0] };
  const ghostM = new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: .22, depthWrite: false }), ghostEdge = new THREE.LineBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: .7 });
  const models = { oven: ovenModel, bench: benchModel, garage: garageModel, wreck: wreckModel, crane: craneModel }, REAL = { wreck: () => wreckBody(), crane: craneBase }, B2 = {};
  for (const [k, [x, z, ry]] of Object.entries(SPOT)) { const real = new THREE.Group(); real.add((REAL[k] || models[k])()); real.position.set(x, 0, z); real.rotation.y = ry; g.add(real);
    const ghost = new THREE.Group(); ghost.position.set(x, 0, z); ghost.rotation.y = ry; g.add(ghost); { const src = models[k](); src.updateMatrixWorld(true); const edges = []; src.traverse(o => { if (o.isMesh) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 35), ghostEdge); e.applyMatrix4(o.matrixWorld); edges.push(e); o.material = ghostM; } }); ghost.add(src); for (const e of edges) ghost.add(e); /* контур - только рёбра, без диагоналей */ }
    // 3D-плашка: иконка постройки, цена (детали, фисты), замок с уровнем, если рано
    const pc = document.createElement('canvas'); pc.width = 256; pc.height = 128; const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace;
    const plaque = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, transparent: true, depthTest: true })); plaque.position.set(x, BUILD[k].py || 3.6, z); plaque.scale.set(3, 1.5, 1); g.add(plaque);
    const [srx, srz] = CRANE_REL.stack, [prx, prz] = CRANE_REL.press;
    const solid = k === 'crane' ? [addSolid(x - .85, z - .85, x + .85, z + .85, 0, 7), addSolid(x + srx - 1, z + srz - 1.9, x + srx + 1, z + srz + 1.9, 0, 1.9), addSolid(x + prx - 1, z + prz - 1, x + prx + 1, z + prz + 1, 0, 1.45)]
      : k === 'wreck' ? [addSolid(x - .95, z - 2.1, x + .95, z + 2.1, 0, 1.5)] : k === 'garage' ? [addSolid(x - 2.3, z - 1.8, x + 2.3, z - 1.4, 0, 3.2), addSolid(x - 2.4, z - 1.7, x - 2.2, z + 1.7, 0, 3.2), addSolid(x + 2.2, z - 1.7, x + 2.4, z + 1.7, 0, 3.2)] : [addSolid(x - 1.25, z - 1.25, x + 1.25, z + 1.25, 0, k === 'oven' ? 2.2 : 1)];
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
    act() { if (pl() < c.lvl || D.parts < c.parts || collection().coins < c.fists) { sfx('no'); return; } if (c.fists && !spendCoins(c.fists)) { sfx('no'); return; } D.parts -= c.parts; D.owned[k] = 1; if (k === 'garage') D.bot.built = true; if (k === 'wreck') D.wreckUntil = 0; save(D); setBuilt(k, true, true); sfx('fanfare'); } }); }

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

  /* ---------- v0.74: машина под разбор: бьёшь по частям - отваливаются по одной, из каждой сыплются детали ---------- */
  const WR = B2.wreck, wreck = { pieces: [], left: 0, timer: null };
  function sprite() { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const tx = new THREE.CanvasTexture(c); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true })); sp.scale.set(1.8, .45, 1); g.add(sp); return { c, tx, sp, sig: '' }; }
  function drawTimer(T0, txt, good) { if (txt === T0.sig) return; T0.sig = txt; const q = T0.c.getContext('2d'); q.clearRect(0, 0, 128, 32); if (txt) { q.fillStyle = '#17111fd8'; q.fillRect(0, 0, 128, 32); q.fillStyle = good ? '#9be36b' : '#f2f6ff'; q.font = 'bold 22px monospace'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(txt, 64, 17); } T0.tx.needsUpdate = true; }
  wreck.timer = sprite(); wreck.timer.sp.position.set(WR.x, 2.6, WR.z);
  function newCar(drop) { for (const pc of wreck.pieces) pc.o.removeFromParent(); wreck.pieces = WRECK_PARTS.map(([name, hp, give], i) => { const o = wreckPart(i); WR.real.add(o); return { o, name, hp, give, i, off: false }; }); wreck.left = wreck.pieces.length; WR.real.children[0].visible = true;
    if (drop) { WR.real.position.y = 16; WR.drop = { v: 0 }; } }
  newCar(false);
  const _wp = new V3(), _box = new THREE.Box3(), flying = [];
  function pieceCenter(pc) { _box.setFromObject(pc.o); return _box.getCenter(_wp); }
  function hitWreck(pc, from) { if (pc.off) return false; pc.hp--; const c = pieceCenter(pc).clone(); sfx('can', { at: c, v: .7 }); burst(c.x, c.y, c.z, 8, { color: 0xffd080, size: .1, speed: 4, up: 2 });
    pc.o.position.set((random() - .5) * .06, (random() - .5) * .04, (random() - .5) * .06);
    if (pc.hp > 0) { spawnPart(c.x, c.y, c.z, false); return true; }
    pc.off = true; wreck.left--; const dx = c.x - from.x, dz = c.z - from.z, dl = Math.hypot(dx, dz) || 1; for (let k = 0; k < pc.give; k++) spawnPart(c.x, c.y + .2, c.z, random() < .12, [dx / dl, dz / dl]);
    // часть отлетает целиком, кувыркается и падает (сначала переводим в мировые координаты)
    WR.real.updateMatrixWorld(true); const wq = new THREE.Quaternion(), ws = new V3(); pc.o.matrixWorld.decompose(_wp, wq, ws); g.add(pc.o); pc.o.position.copy(_wp); pc.o.quaternion.copy(wq);
    flying.push({ o: pc.o, v: new V3(dx / dl * 3.5, 3.5 + random() * 2, dz / dl * 3.5), w: new V3((random() - .5) * 8, (random() - .5) * 8, (random() - .5) * 8), t: 0 });
    if (!wreck.left) { D.wreckUntil = Date.now() + WRECK_RESPAWN * 1000; save(D); WR.real.children[0].visible = true; smokeRing(WR.x, .2, WR.z, 4, { speed: 2.5 }); sfx('fanfare'); }
    return true; }
  function nearestPiece(px, pz, maxD) { if (!D.owned.wreck || !wreck.left || WR.drop) return null; let best = null, bd = maxD; for (const pc of wreck.pieces) { if (pc.off) continue; const c = pieceCenter(pc), d = Math.hypot(c.x - px, c.z - pz); if (d < bd) { bd = d; best = pc; } } return best; }
  if (D.owned.wreck && D.wreckUntil && Date.now() < D.wreckUntil) { for (const pc of wreck.pieces) { pc.off = true; pc.o.visible = false; } wreck.left = 0; }

  /* ---------- v0.74: кран-магнит: стрела качается над стопкой, E - «цепляй!» в момент над меткой.
     Попал - машина едет в пресс и превращается в гору деталей; промах - пара деталей и короткая перезарядка ---------- */
  const CR = B2.crane, boom = craneBoom(), magnet = magnetModel(), cable = mesh(G.cyl6, mats().dark, 0, 0, 0, .025, 1, .025, g), car = new THREE.Group(), mark = mesh(G.cyl12, glow(0x9be36b), 0, 0, 0, .9, .02, .9, g);
  boom.position.set(CR.x, .6 + CRANE_H, CR.z); g.add(boom); g.add(magnet); car.add(compose('junk74-flatcar', a => { a(G.box, lam({ color: 0x5a7a8a }, 'junk74-flat1'), 0, 0, 0, 1.8, .38, 3.6); a(G.box, mats().glass, 0, .1, -.3, 1.5, .1, .8); })); g.add(car); car.visible = false;
  const piston = mesh(G.box, mats().metal, 0, 0, 0, 1.5, .35, 1.5, g), cube = mesh(G.box, lam({ color: 0x5a7a8a }, 'junk74-flat1'), 0, 0, 0, .8, .8, .8, g); cube.visible = false;
  const SP = [CR.x + CRANE_REL.stack[0], CR.z + CRANE_REL.stack[1]], PR = [CR.x + CRANE_REL.press[0], CR.z + CRANE_REL.press[1]];
  const angTo = (x, z) => Math.atan2(-(z - CR.z), x - CR.x), aS = angTo(...SP), aP = angTo(...PR), rS = Math.hypot(SP[0] - CR.x, SP[1] - CR.z), rP = Math.hypot(PR[0] - CR.x, PR[1] - CR.z);
  const crane = { st: 'idle', t: 0, a: aS, r: rS, drop: 5.2, good: 0 }; boom.rotation.y = aS; crane.timer = sprite(); crane.timer.sp.position.set(CR.x, 8.6, CR.z);
  const craneReady = () => D.owned.crane && !CR.drop && crane.st === 'idle' && !(D.craneUntil && Date.now() < D.craneUntil);
  function craneGrab() { const err = Math.abs(Math.atan2(Math.sin(crane.a - aS), Math.cos(crane.a - aS))); crane.good = err < .07 ? 2 : err < .16 ? 1 : 0; crane.st = 'lower'; crane.t = 0; sfx('magnet'); }
  const craneIt = { x: CR.x - 1.2, z: CR.z, y: 0, r: 3.2, get label() { return crane.st === 'aim' ? 'Цепляй!' : 'Кран-магнит'; }, enabled: () => craneReady() || crane.st === 'aim',
    act() { if (crane.st === 'aim') craneGrab(); else if (craneReady()) { crane.st = 'aim'; crane.t = 0; sfx('switch'); } } }; W.interacts.push(craneIt);
  function updateCrane(dt, t) { const c = crane; c.t += dt; const ease = k => k * k * (3 - 2 * k);
    if (c.st === 'aim') { c.a = aS + Math.sin(c.t * 1.7) * .55; c.r = rS; c.drop = 5.2; if (c.t > 9) craneGrab(); }
    else if (c.st === 'lower') { c.drop = 5.2 - ease(Math.min(1, c.t / .7)) * 3.4; if (c.t >= .9) { c.st = 'lift'; c.t = 0; if (c.good) { car.visible = true; sfx('magnet'); } else { sfx('no'); for (let k = 0; k < 3; k++) spawnPart(SP[0], 2.2, SP[1], false); } } }
    else if (c.st === 'lift') { c.drop = 1.8 + ease(Math.min(1, c.t / .9)) * 3.4; if (c.t >= 1) { if (c.good) { c.st = 'carry'; c.t = 0; c.a0 = c.a; } else { c.st = 'home'; c.t = 0; c.a0 = c.a; D.craneUntil = Date.now() + 20000; save(D); } } }
    else if (c.st === 'carry') { const k = ease(Math.min(1, c.t / 2.2)); c.a = c.a0 + (aP - c.a0) * k; c.r = rS + (rP - rS) * k; if (c.t >= 2.4) { c.st = 'drop'; c.t = 0; c.cv = 0; c.cy = car.position.y; } }
    else if (c.st === 'drop') { c.cv -= 20 * dt; c.cy += c.cv * dt; if (c.cy <= 1.65) { c.cy = 1.65; c.st = 'crush'; c.t = 0; sfx('land', { v: 1 }); } }
    else if (c.st === 'crush') { const k = Math.min(1, c.t / .45); piston.position.y = 3.2 - k * 1.3; car.scale.set(1 - k * .5, 1 - k * .7, 1 - k * .75); if (c.t > .45 && !c.boom) { c.boom = 1; sfx('boom'); W.camShake?.(.4); burst(PR[0], 1.8, PR[1], 26, { color: 0xc8b8a8, size: .3, speed: 4, up: 3 }); }
      if (c.t >= 1.1) { c.boom = 0; car.visible = false; car.scale.set(1, 1, 1); cube.visible = true; cube.position.set(PR[0] + 1.2, 1.2, PR[1] - .1); c.st = 'spit'; c.t = 0; c.n = c.good === 2 ? 45 + ((random() * 11) | 0) : 30 + ((random() * 16) | 0); c.out = 0; } }
    else if (c.st === 'spit') { piston.position.y = Math.min(3.2, piston.position.y + dt * 2); cube.position.x += dt * .8; cube.position.y = Math.max(.4, cube.position.y - dt * 1.6); cube.rotation.z = -.35;
      const want = Math.min(c.n, Math.floor(c.t * 30)); const vis = Math.min(c.n, 28); while (c.out < want) { c.out++; if (c.out <= vis) spawnPart(PR[0] + 1.6, .9, PR[1], c.out % 9 === 0, [1, (random() - .5) * .6]); else D.parts++; }
      if (c.out >= c.n) { save(D); bumpChip(); cube.visible = false; c.st = 'home'; c.t = 0; c.a0 = c.a; D.craneUntil = Date.now() + CRANE_CD * 1000; save(D); sfx('fanfare'); } }
    else if (c.st === 'home') { const k = ease(Math.min(1, c.t / 2)); c.a = c.a0 + (aS - c.a0) * k; c.r = c.r + (rS - c.r) * Math.min(1, dt * 3); c.drop = 5.2; if (k >= 1) c.st = 'idle'; }
    else { c.a = aS + Math.sin(t * .3) * .05; }
    boom.rotation.y = c.a; const top = .6 + CRANE_H + 1.05, mx = CR.x + Math.cos(c.a) * c.r, mz = CR.z - Math.sin(c.a) * c.r, sway = c.st === 'carry' ? Math.sin(c.t * 4) * .15 : 0, my = top - c.drop;
    magnet.position.set(mx + sway, my, mz); cable.position.set(mx + sway / 2, (top + my) / 2, mz); cable.scale.y = Math.max(.1, top - my); cable.rotation.z = -sway / Math.max(1, top - my);
    if (car.visible && c.st !== 'drop' && c.st !== 'crush') { car.position.set(mx + sway, my - .4, mz); car.rotation.y = c.a + Math.PI / 2; } else if (c.st === 'drop') { car.position.set(PR[0], c.cy, PR[1]); }
    mark.visible = c.st === 'aim'; mark.position.set(SP[0], 2.0, SP[1]); mark.material.emissiveIntensity = .4 + Math.sin(t * 8) * .3;
    if (c.st !== 'crush' && c.st !== 'spit') piston.position.y += (3.2 - piston.position.y) * Math.min(1, dt * 4); piston.position.x = PR[0]; piston.position.z = PR[1];
    const cd = D.craneUntil && Date.now() < D.craneUntil && c.st === 'idle'; drawTimer(c.timer, cd ? fmt(D.craneUntil - Date.now()).slice(3) : '', false); c.timer.sp.visible = !!D.owned.crane && cd; }
  const craneParts = [boom, magnet, cable, piston, mark]; piston.position.set(PR[0], 3.2, PR[1]);

  /* ---------- дирижабль ---------- */
  const ship = shipModel(); g.add(ship); ship.visible = false; const crates = []; let shipRun = null;
  const drops = [], pileCount = () => [3, 5, 7][D.up.piles] ?? 3, regrowTime = () => [90, 60, 40][D.up.regrow] ?? 90, magnetR = () => D.up.magnet ? 5.5 : 2.6;
  const _to = new V3(); let assemble = 0, launchT = -1, lastL = -1, tSig = '';
  function refreshPiles() { piles.forEach((p, i) => { const on = i < pileCount() && gateAnim > 2; p.g.visible = on && p.hp > 0; p.solid.on = on && p.hp > 0; }); }
  function hitPile(p, n, from) { if (p.hp <= 0 || !p.g.visible) return false; const ddx = from ? p.x - from.x : 0, ddz = from ? p.z - from.z : 0, dl = Math.hypot(ddx, ddz) || 1;
    for (let k = 0; k < n && p.hp > 0; k++) { p.hp--; const c = p.give[p.hp] || 0; for (let j = 0; j < c; j++) { const an = (random() - .5) * 2.2, cx = -ddx / dl, cz = -ddz / dl; spawnPart(p.x - ddx / dl * .5, 1.1 + [.4, .2, 0][p.stage], p.z - ddz / dl * .5, p.shiny && random() < .5, from ? [cx * Math.cos(an) - cz * Math.sin(an), cx * Math.sin(an) + cz * Math.cos(an)] : null); } }
    { const kk = p.hp / p.max, st = kk > .6 ? 0 : kk > .25 ? 1 : 2; if (p.hp > 0 && st !== p.stage) { setStage(p, st); smokeRing(p.x, .2, p.z, 2.6, { speed: 1.6, color: 0xa89a8a }); for (let k = 0; k < 5; k++) chunk(p.x, .9, p.z, [(random() - .5) * 4, 2.5 + random() * 2, (random() - .5) * 4], { mat: [m.rust, m.white, m.wood, m.metal][k % 4], size: .16, sy: .5, life: 1.4 }); sfx('can', { at: p.g.position, v: .6 }); } }
    p.sq = 1; sfx('wood', { at: p.g.position, v: .7 }); burst(p.x, .7, p.z, 8, { color: 0xa89a8a, size: .16, speed: 2.5, up: 2 });
    if (p.hp <= 0) { p.g.visible = false; p.solid.on = false; p.regrowT = regrowTime(); smokeRing(p.x, .1, p.z, 3.5, { speed: 2, color: 0xa89a8a }); for (let k = 0; k < 6; k++) chunk(p.x, .6, p.z, [(random() - .5) * 5, 3 + random() * 2, (random() - .5) * 5], { mat: [m.rust, m.white, m.wood][k % 3], size: .18, sy: .6, life: 1.6 }); } return true; }
  const fmt = ms => { const t = Math.max(0, Math.ceil(ms / 1000)), p2 = n => String(n).padStart(2, '0'); return `${p2(Math.floor(t / 3600))}:${p2(Math.floor(t % 3600 / 60))}:${p2(t % 60)}`; };
  refreshPiles(); renderChip();
  return {
    walk: junkWalk, craneAct: () => craneIt.act(), crane, parts,
    punch(P) { if ((P.junkCD || 0) > 0) return false; const f = P.root.rotation.y, px = P.pos.x + Math.sin(f) * .9, pz = P.pos.z + Math.cos(f) * .9; let best = null, bd = 2.3;
      for (const p of piles) { if (!p.g.visible || p.hp <= 0) continue; const d = Math.hypot(p.x - px, p.z - pz); if (d < bd) { bd = d; best = p; } }
      if (!best) { const pc = nearestPiece(px, pz, 1.6); if (pc) { P.junkCD = .34; P.swatT = .25; return hitWreck(pc, P.pos); } return false; } P.junkCD = .32; P.swatT = .25; return hitPile(best, 1, P.pos); },
    hit(pt, power) { if (power < 1) return; for (const p of piles) if (p.g.visible && Math.hypot(p.x - pt.x, p.z - pt.z) < 1.4 && pt.y < 2.2) hitPile(p, power > 4 ? 2 : 1, null); const pc = nearestPiece(pt.x, pt.z, 1.3); if (pc && pt.y < 2) hitWreck(pc, pt); },
    update(dt, t, P) {
      if (P) P.junkCD = (P.junkCD || 0) - dt;
      const L = pl(); if (L !== lastL) { lastL = L; for (const k of Object.keys(B2)) B2[k].sig = ''; renderChip(); }
      // ворота: при первом входе с открытым уровнем - решётка поднимается, плашка гаснет, решётка взрывается
      if (gateAnim < 0 && L >= UNLOCK_GATE && P && Math.hypot(P.pos.x - B.x0, P.pos.z - (B.z0 + B.z1) / 2) < 14) { gateAnim = 0; sfx('crane'); }
      if (gateAnim >= 0 && gateAnim < 99) { gateAnim += dt; const k = Math.min(1, gateAnim / 1.6); plate.scale.setScalar(Math.max(.01, 1 - k * 2)); grate.position.y = k * k * 2.2; grate.rotation.x = Math.sin(gateAnim * 25) * .02 * (1 - k);
        if (gateAnim >= 1.6 && grate.parent) { const p0 = grate.getWorldPosition(new V3()); for (let i = 0; i < 16; i++) chunk(p0.x, p0.y + 1.4 + random(), p0.z + (random() - .5) * 3, [(random() - .5) * 8, 4 + random() * 4, (random() - .5) * 8], { mat: i % 2 ? m.rust : m.metal, size: .16, sy: 2, life: 2.2 });
          burst(p0.x, p0.y + 1.5, p0.z, 30, { color: 0xffa040, size: .3, speed: 6, up: 3 }); smokeRing(p0.x, .1, p0.z, 6, { speed: 4 }); sfx('boom'); gate.remove(grate); gateSolid.on = false; D.seen.gate = 1; save(D); gateAnim = 99; refreshPiles(); } }
      gear.rotation.z += dt * .4; fire.material.emissiveIntensity = .5 + Math.sin(t * 7) * .15 + (ovenT > 0 ? 1.4 : 0);
      for (const k of Object.keys(B2)) { const b2 = B2[k]; if (b2.plaque.visible) { drawPlaque(k); const near = P ? Math.hypot(P.pos.x - b2.x, P.pos.z - b2.z) : 99, s = near < 5 ? 1.25 : 1; b2.plaque.scale.set(3 * s, 1.5 * s, 1); b2.plaque.position.y = (BUILD[k].py || 3.6) + Math.sin(t * 2) * .08; b2.ghost.children.forEach(o => o.visible = true); }
        if (b2.drop) { const d = b2.drop; d.v -= 30 * dt; b2.real.position.y += d.v * dt; if (b2.real.position.y <= 0) { b2.real.position.y = 0; if (d.v < -4) { d.v *= -.25; burst(b2.x, .3, b2.z, 22, { color: 0xc8b8a8, size: .32, speed: 3.5, up: 2 }); smokeRing(b2.x, .1, b2.z, 6, { speed: 3 }); sfx('land', { v: 1 }); } else b2.drop = null; } } }
      ghostM.opacity = .18 + Math.sin(t * 2.5) * .06;
      for (const o of craneParts) o.visible = !!D.owned.crane && !CR.drop && (o !== mark || crane.st === 'aim'); if (D.owned.crane && !CR.drop) updateCrane(dt, t); else { car.visible = false; }
      if (D.owned.wreck) { const wait = D.wreckUntil && Date.now() < D.wreckUntil; drawTimer(wreck.timer, wait ? fmt(D.wreckUntil - Date.now()).slice(3) : '', false); wreck.timer.sp.visible = !!wait;
        if (!wreck.left && !wait && !WR.drop) { D.wreckUntil = 0; save(D); newCar(true); sfx('wind', { v: .4 }); }
        for (const pc of wreck.pieces) if (!pc.off) pc.o.position.multiplyScalar(Math.exp(-dt * 20)); } else wreck.timer.sp.visible = false;
      for (let i = flying.length - 1; i >= 0; i--) { const f = flying[i]; f.t += dt; f.v.y -= 18 * dt; f.o.position.addScaledVector(f.v, dt); f.o.rotation.x += f.w.x * dt; f.o.rotation.z += f.w.z * dt; const gy = Math.max(0, groundAt(f.o.position.x, f.o.position.z, .2, f.o.position.y + .5) || 0);
        if (f.o.position.y < gy + .1) { f.o.position.y = gy + .1; f.v.y = Math.abs(f.v.y) * .3; f.v.x *= .6; f.v.z *= .6; f.w.multiplyScalar(.5); }
        if (f.t > 2.2) { const k = Math.min(1, (f.t - 2.2) / .5); f.o.scale.setScalar(1 - k); if (k >= 1) { f.o.removeFromParent(); flying.splice(i, 1); burst(f.o.position.x, f.o.position.y, f.o.position.z, 6, { color: 0xa89a8a, size: .2, speed: 1.5, up: 1 }); } } }
      for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.v -= 30 * dt; d.o.position.y += d.v * dt; if (d.o.position.y <= 0) { d.o.position.y = 0; if (d.v < -4) { d.v *= -.25; burst(d.o.position.x, .3, d.o.position.z, 14, { color: 0xc8b8a8, size: .3, speed: 3, up: 2 }); } else drops.splice(i, 1); } }
      for (const p of piles) { p.sq = Math.max(0, p.sq - dt * 4); const S = p.shiny ? 1.3 : p.max > 4 ? 1.45 : 1.2, wob = Math.sin(p.sq * 18) * p.sq; p.g.scale.set(S * (1 + p.sq * .08), S * (1 - p.sq * .12), S * (1 + p.sq * .08)); p.g.rotation.z = wob * .05; if (p.hp <= 0 && p.i < pileCount()) p.regrowT -= dt; }
      const due = piles.filter(p => p.hp <= 0 && p.i < pileCount() && p.regrowT <= 0 && !p.crate);
      if (due.length && !shipRun && gateAnim > 2) { shipRun = { t: 0, list: due, dropped: new Set() }; ship.visible = true; sfx('wind', { v: .5 }); }
      for (const pr of ship.userData.props) pr.rotation.z += dt * 18;
      if (shipRun) { const r = shipRun; r.t += dt; const k = r.t / 9; ship.position.set(C.x - 26 + k * 52, 15 + Math.sin(t * .8) * .5, C.z + Math.sin(k * 3) * 2); ship.rotation.set(Math.sin(t * .9) * .03, -Math.PI / 2, Math.sin(t * 1.1) * .05);
        for (const p of r.list) if (!r.dropped.has(p) && ship.position.x > p.x - .5) { r.dropped.add(p); p.crate = true; const c = new THREE.Group(); c.add(crateChute()); c.position.copy(ship.position).setY(12.6); g.add(c); crates.push({ c, p, t: 0 }); sfx('pop'); }
        if (k >= 1) { shipRun = null; ship.visible = false; } }
      for (let i = crates.length - 1; i >= 0; i--) { const q = crates[i]; q.t += dt; q.c.position.y -= dt * 2.8; q.c.position.x += (q.p.x - q.c.position.x) * Math.min(1, dt * 1.5); q.c.position.z += (q.p.z - q.c.position.z) * Math.min(1, dt * 1.5); q.c.rotation.z = Math.sin(q.t * 2.2 + i) * .18; q.c.rotation.x = Math.cos(q.t * 1.7 + i) * .12;
        if (q.c.position.y <= .3) { q.c.removeFromParent(); crates.splice(i, 1); const p = q.p; p.crate = false; stock(p); p.g.visible = true; p.solid.on = true; p.sq = 1; burst(p.x, .5, p.z, 18, { color: 0xc8b8a8, size: .3, speed: 3, up: 2 }); for (let k = 0; k < 4; k++) chunk(p.x, .6, p.z, [(random() - .5) * 4, 3, (random() - .5) * 4], { mat: m.crate, size: .2, sy: .2, life: 1.5 }); sfx('wood', { at: p.g.position }); } }
      const R = magnetR();
      /* v0.74: детали - физика: дуга, отскоки с потерей энергии по рельефу, скольжение, ложатся плашмя; магнит забирает лежащие */
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; const mm = q.m, pp = mm.position;
        const dist = P ? Math.hypot(pp.x - P.pos.x, pp.y - P.pos.y - .8, pp.z - P.pos.z) : 99;
        if (P && (q.t > .55 && dist < R || q.t > 14 && dist < 12)) { q.fly = true; }
        if (q.fly && P) { const to = _to.set(P.pos.x, P.pos.y + 1, P.pos.z), d = to.sub(pp), L2 = d.length(); q.fv = (q.fv || 3) + dt * 22; pp.addScaledVector(d.normalize(), Math.min(L2, dt * q.fv)); pp.y += Math.sin(Math.min(1, L2 / 3) * Math.PI) * dt * 2; mm.scale.setScalar(1.6 * Math.min(1, L2 * .8 + .25)); mm.rotation.y += dt * 12;
          if (L2 < .35) { parts.splice(i, 1); collect(q); save(D); sfx('click', { v: .45, p: 1.3 + random() * .4 }); bumpChip(); if (q.val > 1) burst(pp.x, pp.y, pp.z, 6, { color: 0xf5c542, size: .12, speed: 2, up: 1 }); } continue; }
        if (q.rest) { mm.position.y = q.gy + .05 + Math.sin(t * 3 + i) * (q.val > 1 ? .03 : 0); continue; }
        q.v.y -= 18 * dt; pp.addScaledVector(q.v, dt); mm.rotation.x += q.w.x * dt; mm.rotation.y += q.w.y * dt; mm.rotation.z += q.w.z * dt;
        let gy = groundAt(pp.x, pp.z, .05, pp.y + .4); if (!Number.isFinite(gy) || gy < -5) gy = 0;
        if (pp.y < gy + .05) { pp.y = gy + .05;
          if (q.v.y < -1.4 && q.b < 3) { q.b++; q.v.y = -q.v.y * .42; q.v.x *= .68; q.v.z *= .68; q.w.multiplyScalar(.55); if (q.b === 1 && random() < .5) sfx('click', { at: pp, v: .15, p: .8 + random() * .5 }); }
          else { q.v.y = 0; const f = Math.exp(-dt * 9); q.v.x *= f; q.v.z *= f; q.w.multiplyScalar(Math.exp(-dt * 10)); mm.rotation.x *= Math.exp(-dt * 12); mm.rotation.z *= Math.exp(-dt * 12);
            if (Math.hypot(q.v.x, q.v.z) < .12) { q.rest = true; q.gy = gy; mm.rotation.x = 0; mm.rotation.z = 0; } } } }
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
