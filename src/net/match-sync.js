import { W } from '../world/state.js';
import { addItem, launch } from '../game/items.js';
import { knockDown, shove, daze } from '../game/actors.js';
import { makePuppet } from '../game/bots.js';
import { NET, onNet, send, inRoom, others } from './net.js';
import { makeTag } from './hub-sync.js';
import { V3 } from '../core/gfx.js';

/* Общий матч (v0.61). Кто что считает:
   - карта: одинаковая у всех — хост рассылает «зерно», карта строится с подменённым Math.random (seededMap);
   - свой персонаж: каждый ведёт сам и 10 раз/с рассылает положение, позу и очки;
   - боты: живут только у хоста; хост рассылает их положение, позу и очки, у остальных это «марионетки»;
   - удары по чужому персонажу/боту (knockDown/shove/daze) уходят владельцу и применяются у него;
   - броски видны всем: у остальных летит «призрак» предмета (не бьёт — попадание решает бросивший);
   - поднял предмет — у остальных такой же предмет на том же месте пропадает.
   Миссии, события города и жители — у каждого свои. Хост вышел — матч у всех заканчивается, возврат в хаб. */
export const MATCH = { on: false, host: false, seed: 0, baseItems: 0, roster: null, sendT: 0, ghosts: [], scene: null };
const SEND = .1, DELAY = .12, POSE = ['speed', 'air', 'vy', 'climb', 'dive', 'roll', 'slide', 'crouch', 'hold', 'stun', 'rag', 'daze', 'ride', 'rideSpeed', 'emote', 'emoteT', 'dangle', 'board', 'cyclePhase', 'fly', 'flySpin', 'zombie'];
const pose = src => { const s = {}; if (!src) return s; for (const k of POSE) { const v = src[k]; if (v !== undefined && v !== null && v !== false && v !== 0) s[k] = typeof v === 'number' ? Math.round(v * 100) / 100 : v; } return s; };
const hook = ch => { if (ch && !ch._netHook) { const f = ch.animate; ch.animate = (d, s) => { ch._netS = s; return f.call(ch, d, s); }; ch._netHook = true; } };
let clock = 0;

/* одинаковая карта у всех: на время генерации Math.random — детерминированный от зерна */
export function seededMap(seed, fn) {
  let a = seed >>> 0; const orig = Math.random;
  Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  globalThis.__netSeeded = true; try { return fn(); } finally { Math.random = orig; globalThis.__netSeeded = false; }
}
export const netMatchActive = () => MATCH.on && inRoom();
export const humansInRoom = () => (inRoom() ? NET.players.size : 1);
export function netBeginMatch(seed) { MATCH.on = inRoom(); MATCH.host = NET.host; MATCH.seed = seed; MATCH.roster = null; }
export function netEndMatch() { MATCH.on = false; for (const g of MATCH.ghosts) g.it.g.visible = false; MATCH.ghosts.length = 0; }
// индекс игрока среди людей комнаты — чтобы появляться в разных точках
export const myRank = () => [...NET.players.keys()].sort((a, b) => a - b).indexOf(NET.id);

/* после постройки карты и ботов (prepareRound): марионетки людей, у хоста — подготовка ботов к рассылке */
export function netPrepareMatch(scene) {
  if (!MATCH.on) return; MATCH.scene = scene; MATCH.baseItems = W.items.length; clock = 0;
  for (const p of others()) { const b = makePuppet(scene, p.skin, p.name, 'p' + p.id); b.human = true; b.tag = makeTag(p.name); scene.add(b.tag); }
  if (MATCH.host) { const bots = W.bots.filter(b => !b.puppet); bots.forEach((b, i) => { b.netKey = 'b' + i; hook(b.ch); }); send({ t: 'ev', e: 'roster', bots: bots.map(b => ({ name: b.name, skin: b.skin })) }); }
  else if (MATCH.roster) addBotPuppets(MATCH.roster);
  W.netPuppet = puppetStep; W.netHit = sendHit; W.netThrow = sendThrow; W.netTake = sendTake;
}
function addBotPuppets(list) { if (!MATCH.scene || W.bots.some(b => b.netKey?.[0] === 'b')) return; list.forEach((q, i) => makePuppet(MATCH.scene, q.skin, q.name, 'b' + i)); }

/* каждый кадр матча: своё состояние (+ боты у хоста), призраки бросков */
export function netMatchTick(dt, P, score = 0) {
  if (!MATCH.on) return; clock += dt; MATCH.sendT -= dt;
  if (MATCH.sendT <= 0 && P) { MATCH.sendT = SEND; hook(P.ch);
    const m = { t: 'st', m: 'match', x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), r: +P.root.rotation.y.toFixed(2), s: pose(P.ch._netS), sc: Math.round(score), rtt: NET.rtt, v: P.root.visible ? 1 : 0 };
    if (MATCH.host) m.b = W.bots.filter(b => !b.puppet).map(b => [+b.pos.x.toFixed(2), +b.pos.y.toFixed(2), +b.pos.z.toFixed(2), +b.root.rotation.y.toFixed(2), pose(b.ch._netS), Math.round(b.score || 0), b.root.visible ? 1 : 0]);
    send(m); }
  for (let i = MATCH.ghosts.length - 1; i >= 0; i--) { const g = MATCH.ghosts[i]; g.t += dt; if (g.it.state !== 'fly' && (g.rest = (g.rest || 0) + dt) > 1.5 || g.t > 8) { g.it.state = 'gone'; g.it.g.visible = false; MATCH.ghosts.splice(i, 1); } }
}
const findKey = key => W.bots.find(b => b.netKey === key);
function push(b, x, y, z, r, s, sc, v) { b.buf.push({ t: clock, x, y, z, r, s, v }); if (b.buf.length > 24) b.buf.shift(); if (sc !== undefined) b.score = sc; }
/* марионетка: интерполяция с задержкой, поза, ник над головой */
function puppetStep(b, dt, t) {
  const at = clock - DELAY, buf = b.buf; if (!buf.length) { b.ch.animate(dt, { t, speed: 0 }); return; }
  let i = buf.findIndex(q => q.t > at); if (i < 0) i = buf.length; const A = buf[Math.max(0, i - 1)], B = buf[Math.min(buf.length - 1, i)];
  const k = B.t > A.t ? Math.min(1, Math.max(0, (at - A.t) / (B.t - A.t))) : 1;
  b.vel.set((B.x - A.x) / Math.max(.05, B.t - A.t), (B.y - A.y) / Math.max(.05, B.t - A.t), (B.z - A.z) / Math.max(.05, B.t - A.t));
  b.pos.set(A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k, A.z + (B.z - A.z) * k); b.onGround = !(k < .5 ? A.s : B.s).air;
  const dy = Math.atan2(Math.sin(B.r - A.r), Math.cos(B.r - A.r)); b.root.rotation.y = A.r + dy * k; b.root.visible = !!B.v;
  const s = k < .5 ? A.s : B.s; b.stun = s.stun ? 1 : 0; b.ch.animate(dt, { ...s, t });
  if (b.tag) { b.tag.visible = b.root.visible; b.tag.position.set(b.pos.x, b.pos.y + (b.ch.d?.top || 1.8) + .45, b.pos.z); b.tag.scale.set(.42 * b.tag.userData.aspect, .42, 1); }
}
function sendHit(a, k, args) { send({ t: 'ev', e: 'hit', to: a.netKey, k, a: args.map(v => typeof v === 'number' ? +v.toFixed(2) : v) }); }
function sendThrow(it, from, vel) { if (!MATCH.on || it.netGhost || it.owner?.puppet) return; send({ t: 'ev', e: 'throw', ty: it.type, p: [from.x, from.y, from.z].map(v => +v.toFixed(2)), v: [vel.x, vel.y, vel.z].map(v => +v.toFixed(2)) }); }
function sendTake(it) { if (!MATCH.on || it.netGhost) return; send({ t: 'ev', e: 'take', ty: it.type, p: [+it.pos.x.toFixed(2), +it.pos.z.toFixed(2)] }); }

export function initMatchSync() {
  onNet('st', m => { if (!MATCH.on || m.m !== 'match') return; const b = findKey('p' + m.id); if (b && m.x !== undefined) push(b, m.x, m.y, m.z, m.r, m.s || {}, m.sc, m.v);
    if (m.b && !MATCH.host) m.b.forEach((q, i) => { const bb = findKey('b' + i); if (bb) push(bb, q[0], q[1], q[2], q[3], q[4] || {}, q[5], q[6]); }); });
  onNet('ev', m => { if (!MATCH.on) { if (m.e === 'roster') MATCH.roster = m.bots; return; }
    if (m.e === 'roster') { MATCH.roster = m.bots; addBotPuppets(m.bots); }
    else if (m.e === 'hit') { const me = m.to === 'p' + NET.id ? W.player : MATCH.host && m.to?.[0] === 'b' ? findKey(m.to) : null; if (!me || me.puppet) return; const a = m.a || [];
      if (m.k === 'knock') knockDown(me, a[0], a[1], a[2]); else if (m.k === 'shove') shove(me, a[0], a[1], a[2], a[3], !!a[4]); else if (m.k === 'daze') daze(me, a[0]); }
    else if (m.e === 'throw') { const it = addItem(m.ty, m.p[0], m.p[1], m.p[2]); if (!it) return; it.netGhost = true; it.noHitT = 99; it.noPickup = true; launch(it, new V3(...m.p), new V3(...m.v)); MATCH.ghosts.push({ it, t: 0 }); }
    else if (m.e === 'take') { // тот же предмет ищем по типу и месту (карта у всех одинаковая, мелкий декор может чуть отличаться)
      let best = null, bd = .8; for (const it of W.items) { if (it.type !== m.ty || it.netGhost || !(it.state === 'rest' || it.state === 'placed')) continue; const d = Math.hypot(it.pos.x - m.p[0], it.pos.z - m.p[1]); if (d < bd) { bd = d; best = it; } }
      if (best) { best.state = 'gone'; best.g.visible = false; } } });
  onNet('leave', id => { if (!MATCH.on) return; const b = findKey('p' + id); if (!b) return; b.root.removeFromParent(); b.tag?.removeFromParent(); W.bots.splice(W.bots.indexOf(b), 1); });
}
