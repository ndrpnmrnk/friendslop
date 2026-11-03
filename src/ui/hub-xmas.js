import { random } from '../core/random.js';
import { THREE, G, mesh, col, lam, tmat, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { sfx } from '../core/sfx.js';
import { addCoins, unlockCharacter, lockedCharacters } from '../game/collection.js';
import { SKINS } from '../characters/skins.js';
import { NET, inRoom } from '../net/net.js';
import { progress, levelOf } from '../game/progress.js';
import { myName } from '../net/net.js';
import { account } from '../net/account.js';

/* v0.70 зимний хаб: ёлка с табло побед у точки появления, колесо удачи и табло уровней у лавок.
   Табло показывают игроков лобби (уровень и победы приходят от сервера комнат) или только тебя вне комнаты. */
const canvasTex = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return { c, t }; };
export function buildTree(group, x, z, s = 1) {
  const fir = lam({ map: T.leaves(0), color: 0x7aa08a }, 'xtree70'), snow = lam({ color: 0xeef3fb, emissive: 0x3a4660, emissiveIntensity: .2 }, 'xtree70snow');
  const balls = [0xd8243a, 0xf5c542, 0x4ab0f0, 0x9be36b, 0xf1e8ff].map(c => lam({ color: c, emissive: c, emissiveIntensity: .8 }, 'xball70' + c));
  group.add(compose('xtree70', a => {
    a(G.cyl6, tmat(T.bark()), x, .5 * s, z, .22 * s, 1 * s, .22 * s);
    for (const [h, r, y] of [[1.6, 1.5, .7], [1.4, 1.15, 1.6], [1.2, .85, 2.4], [1.0, .55, 3.15]]) { a(G.cone8, fir, x, (y + h / 2) * s, z, r * s, h * s, r * s); a(G.cone8, snow, x, (y + h * .78) * s, z, r * .45 * s, h * .35 * s, r * .45 * s); }
    for (let i = 0; i < 26; i++) { const t = i / 26, y = .9 + t * 2.9, rr = (1.45 - t * 1.05) * .92, an = i * 2.4; a(G.sph, balls[i % 5], x + Math.cos(an) * rr * s, y * s, z + Math.sin(an) * rr * s, .09 * s, .09 * s, .09 * s); }
    a(G.ico, lam({ color: 0xffe08a, emissive: 0xffc040, emissiveIntensity: 1.2 }, 'xstar70'), x, 4.35 * s, z, .28 * s, .28 * s, .1 * s);
    for (const [dx, dz, c, h] of [[.9, .5, 0xd8243a, .45], [-.8, .7, 0x4ab0f0, .35], [.3, -1, 0x9be36b, .5], [-.6, -.7, 0xf5c542, .3]]) { a(G.box, lam({ color: c }, 'xgift70' + c), x + dx * s, h / 2, z + dz * s, .55, h, .55); a(G.box, lam({ color: 0xf1e8ff }, 'xgiftrib70'), x + dx * s, h / 2, z + dz * s, .56, h + .01, .1); }
  }));
  addSolid(x - 1.1 * s, z - 1.1 * s, x + 1.1 * s, z + 1.1 * s, 0, 4.2 * s);
  (W.lightSources ??= []).push({ x, y: 2.4 * s, z, color: 0xffd090, strength: 1.6, range: 6 });
}
function players() {
  const me = progress(), meName = account()?.name || myName() || 'Ты';
  const list = inRoom() ? [...NET.players.values()].map(p => ({ name: p.id === NET.id ? meName : p.name, lvl: p.id === NET.id ? levelOf(me.xp) : p.lvl | 0, wins: p.id === NET.id ? me.wins : p.wins | 0, me: p.id === NET.id })) : [{ name: meName, lvl: levelOf(me.xp), wins: me.wins, me: true }];
  return list;
}
export function buildBoard(group, x, y, z, ry, kind) {
  const tx = canvasTex(256, 192), m = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: tx.t })); m.position.set(x, y, z); m.rotation.y = ry; m.scale.set(2.2, 1.65, 1); m.userData.noBatch = true; group.add(m);
  group.add(compose('xboard70-' + kind, a => { a(G.box, col(0x2b2533), x - Math.sin(ry) * .04, y, z - Math.cos(ry) * .04, 2.4, 1.85, .08, 0, ry, 0); for (const s of [-1, 1]) a(G.box, col(0x2b2533), x + Math.cos(ry) * s * 1.05, (y - .9) / 2, z - Math.sin(ry) * s * 1.05, .1, y - .9, .1); a(G.box, lam({ color: 0xeef3fb }, 'xboard70snow'), x, y + .97, z, 2.45, .1, .2, 0, ry, 0); }));
  let sig = '';
  function draw() { const list = players().sort((a, b) => kind === 'wins' ? b.wins - a.wins || b.lvl - a.lvl : b.lvl - a.lvl || b.wins - a.wins).slice(0, 8), next = JSON.stringify(list); if (next === sig) return; sig = next;
    const g = tx.c.getContext('2d'); g.fillStyle = '#17111f'; g.fillRect(0, 0, 256, 192); g.fillStyle = kind === 'wins' ? '#f5c542' : '#9be36b'; g.font = 'bold 20px monospace'; g.textAlign = 'center'; g.fillText(kind === 'wins' ? 'ПОБЕДЫ' : 'УРОВНИ', 128, 24);
    g.textAlign = 'left'; g.font = 'bold 15px monospace'; list.forEach((p, i) => { const yy = 50 + i * 18; g.fillStyle = p.me ? '#ffd27a' : '#e8e0f8'; g.fillText(`${i + 1}. ${String(p.name).slice(0, 12)}`, 10, yy); g.textAlign = 'right'; g.fillStyle = kind === 'wins' ? '#f5c542' : '#9be36b'; g.fillText(kind === 'wins' ? String(p.wins) : 'ур ' + p.lvl, 246, yy); g.textAlign = 'left'; });
    tx.t.needsUpdate = true; }
  draw(); let t = 0; return { update(dt) { t -= dt; if (t <= 0) { t = 1.5; draw(); } } };
}
// колесо удачи: раз в 12 часов, сектора с фистами и редкий скин; шансы на табличке
const WHEEL_KEY = 'friendslop.wheelAt', CD = 12 * 3600 * 1000;
const SECT = [{ n: 1, w: 22 }, { n: 10, w: 12 }, { n: 2, w: 20 }, { n: 25, w: 8 }, { n: 3, w: 16 }, { n: 50, w: 4 }, { n: 5, w: 16 }, { skin: true, w: 2 }];
const SC = ['#d8243a', '#f1e8ff', '#2f7a40', '#f1e8ff', '#4ab0f0', '#f5c542', '#2f7a40', '#b18cff'];
const readyIn = () => { let t = 0; try { t = +localStorage.getItem(WHEEL_KEY) || 0; } catch { } return Math.max(0, t + CD - Date.now()); };
export function buildWheel(group, x, z, ry, toast) {
  const tx = canvasTex(256, 256); { const g = tx.c.getContext('2d'), N = SECT.length; g.translate(128, 128);
    for (let i = 0; i < N; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 124, i / N * 6.283 - Math.PI / 2 - Math.PI / N, (i + 1) / N * 6.283 - Math.PI / 2 - Math.PI / N); g.fillStyle = SC[i]; g.fill(); }
    g.fillStyle = '#17111f'; g.font = 'bold 26px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < N; i++) { g.save(); g.rotate(i / N * 6.283); g.fillStyle = ['#f1e8ff', '#17111f', '#f1e8ff', '#17111f', '#17111f', '#17111f', '#f1e8ff', '#17111f'][i]; g.fillText(SECT[i].skin ? 'СКИН' : String(SECT[i].n), 0, -84); g.restore(); }
    g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fillStyle = '#2b2533'; g.fill(); }
  const pivot = new THREE.Group(); pivot.position.set(x, 1.9, z); pivot.rotation.y = ry; group.add(pivot); W.keep.push(pivot);
  const disc = new THREE.Group(); pivot.add(disc);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), new THREE.MeshBasicMaterial({ map: tx.t })); face.position.z = .08; face.userData.noBatch = true; disc.add(face);
  disc.add(compose('wheel70-rim', a => { a(G.cyl12, col(0x2b2533), 0, 0, 0, 1.3, .14, 1.3, Math.PI / 2, 0, 0); for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283; a(G.sph, lam({ color: 0xffe08a, emissive: 0xffc040, emissiveIntensity: 1 }, 'wheel70bulb'), Math.cos(an) * 1.3, Math.sin(an) * 1.3, .1, .06, .06, .06); } }));
  // стойка, указатель сверху, рычаг справа, табличка с шансами снизу
  group.add(compose('wheel70-stand', a => { const r = (dx, dy, dz) => [x + Math.cos(ry) * dx + Math.sin(ry) * dz, dy, z - Math.sin(ry) * dx + Math.cos(ry) * dz];
    for (const s of [-1, 1]) { const [px, py, pz] = r(s * .7, .95, -.2); a(G.box, col(0x6a4a3a), px, py, pz, .14, 1.9, .14, 0, ry, 0); }
    { const [px, py, pz] = r(0, 3.28, .1); a(G.cone4, lam({ color: 0xd8243a }, 'wheel70ptr'), px, py, pz, .14, .3, .08, Math.PI, ry, 0); }
    { const [px, py, pz] = r(1.75, .55, 0); a(G.box, col(0x2b2533), px, py, pz, .3, 1.1, .3, 0, ry, 0); } }));
  const lever = new THREE.Group(); { const c = Math.cos(ry), s = Math.sin(ry); lever.position.set(x + c * 1.75, 1.1, z - s * 1.75); lever.rotation.y = ry; } group.add(lever); W.keep.push(lever);
  lever.add(compose('wheel70-lever', a => { a(G.box, col(0x9a9da8), 0, .35, 0, .06, .7, .06); a(G.sph, lam({ color: 0xd8243a }, 'wheel70knob'), 0, .72, 0, .12, .12, .12); }));
  { const ct = canvasTex(256, 128), g = ct.c.getContext('2d'); g.fillStyle = '#17111f'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#ffd27a'; g.font = 'bold 15px monospace'; g.fillText('КОЛЕСО УДАЧИ · раз в 12 ч', 8, 18); g.font = '13px monospace'; g.fillStyle = '#e8e0f8';
    const tot = SECT.reduce((s2, q) => s2 + q.w, 0); SECT.slice().sort((a2, b2) => b2.w - a2.w).forEach((q, i) => { g.fillText(`${q.skin ? 'скин' : q.n + ' ✊'} — ${Math.round(q.w / tot * 100)}%`, 8 + (i % 2) * 124, 42 + (i >> 1) * 21); });
    const m = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: ct.t })); m.userData.noBatch = true; const c = Math.cos(ry), s2 = Math.sin(ry); m.position.set(x + s2 * .25, .55, z + c * .25); m.rotation.y = ry; m.scale.set(1.7, .85, 1); group.add(m); }
  { const c = Math.cos(ry), s2 = Math.sin(ry); addSolid(x - .9, z - .9, x + .9, z + .9, 0, 3.3); void c; void s2; }
  let spin = null;
  function label() { const left = readyIn(); return spin ? 'Крутится…' : left > 0 ? `Колесо удачи · через ${Math.floor(left / 3600000)} ч ${Math.ceil(left % 3600000 / 60000)} мин` : 'Крутить колесо удачи'; }
  const q = { x: x + Math.cos(ry) * 1.75 + Math.sin(ry) * .9, z: z - Math.sin(ry) * 1.75 + Math.cos(ry) * .9, y: 0, r: 1.6, get label() { return label(); },
    act() { if (spin) return; if (readyIn() > 0) { sfx('no'); return; }
      const tot = SECT.reduce((s2, k) => s2 + k.w, 0); let r = random() * tot, idx = 0; for (; idx < SECT.length; idx++) { r -= SECT[idx].w; if (r <= 0) break; } idx = Math.min(idx, SECT.length - 1);
      try { localStorage.setItem(WHEEL_KEY, String(Date.now())); } catch { } dispatchEvent(new Event('collectionchange'));
      const from = disc.rotation.z % 6.283, to = Math.ceil((from + 6.283 * 5) / 6.283) * 6.283 + idx / SECT.length * 6.283; spin = { t: 0, from, to, idx, tick: 0 }; lever.rotation.x = .9; sfx('click'); } };
  W.interacts.push(q);
  function reward(i) { const k = SECT[i];
    if (k.skin) { const locked = lockedCharacters(); const id = locked[(random() * locked.length) | 0]; if (id && unlockCharacter(id)) { toast?.(`Новый персонаж: ${SKINS[id]?.name || id}!`); sfx('fanfare'); return; } addCoins(50); toast?.('Все персонажи уже есть · +50 ✊'); sfx('points'); return; }
    addCoins(k.n); toast?.(`+${k.n} ✊`); sfx(k.n >= 25 ? 'fanfare' : 'points'); }
  return { update(dt) { lever.rotation.x *= Math.exp(-dt * 4);
    if (!spin) { disc.rotation.z += dt * .05; return; } spin.t += dt; const k = Math.min(1, spin.t / 3.6), e = 1 - Math.pow(1 - k, 3); const rz = spin.from + (spin.to - spin.from) * e;
    if (Math.floor(rz / (6.283 / SECT.length)) !== spin.tick) { spin.tick = Math.floor(rz / (6.283 / SECT.length)); sfx('tick', { v: .6 }); } disc.rotation.z = rz;
    if (k >= 1) { const i = spin.idx; spin = null; reward(i); } } };
}

// v0.71: снеговик - общий модуль world/snowman.js (распадается на части)
import { buildSnowman as bs, hitSnowmen, updateSnowmen } from '../world/snowman.js';
export { hitSnowmen, updateSnowmen };
export const buildSnowman = (group, x, z, ry = 0) => bs(group, x, 0, z, ry);
