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
// пиксельный кулак-фист для табличек колеса
function drawFist(g, x, y, s, c = '#f5c542') { const P = ['.####.', '######', '######', '#####.', '.####.', '..##..'];
  g.fillStyle = '#17111f'; P.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') g.fillRect(x + i * s - s * .5, y + j * s - s * .5, s * 2, s * 2); }));
  g.fillStyle = c; P.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') g.fillRect(x + i * s, y + j * s, s, s); }));
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 1; i < 4; i++) g.fillRect(x + i * s + s * .8, y + s, s * .2, s * 2); }
function drawSkin(g, cx, cy, s) { // силуэт персонажа со знаком вопроса
  g.fillStyle = '#17111f'; g.beginPath(); g.arc(cx, cy - s * .55, s * .42, 0, 7); g.fill(); g.fillRect(cx - s * .45, cy - s * .1, s * .9, s * .9);
  g.fillStyle = '#b18cff'; g.beginPath(); g.arc(cx, cy - s * .55, s * .34, 0, 7); g.fill(); g.fillRect(cx - s * .37, cy - s * .04, s * .74, s * .78);
  g.fillStyle = '#17111f'; g.font = `bold ${s * .62 | 0}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', cx, cy - s * .52); }
/* v0.71 J3: колесо удачи в игровом зале. Сектора - картинки (фист + число, отдельная иконка скина), подписи всегда
   стоят прямо (не крутятся вместе с колесом). Таблички шансов нет; под колесом - личный таймер «через Ч:ММ». */
export function buildWheel(group, x, z, ry, toast) {
  const N = SECT.length, tx = canvasTex(256, 256); { const g = tx.c.getContext('2d'); g.translate(128, 128);
    for (let i = 0; i < N; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 124, i / N * 6.283 - Math.PI / 2 - Math.PI / N, (i + 1) / N * 6.283 - Math.PI / 2 - Math.PI / N); g.fillStyle = SC[i]; g.fill(); g.strokeStyle = '#17111f'; g.lineWidth = 3; g.stroke(); }
    g.beginPath(); g.arc(0, 0, 22, 0, 7); g.fillStyle = '#2b2533'; g.fill(); g.strokeStyle = '#f5c542'; g.lineWidth = 4; g.stroke(); }
  const pivot = new THREE.Group(); pivot.position.set(x, 1.9, z); pivot.rotation.y = ry; group.add(pivot); W.keep.push(pivot);
  const disc = new THREE.Group(); pivot.add(disc);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), new THREE.MeshBasicMaterial({ map: tx.t })); face.position.z = .08; face.userData.noBatch = true; disc.add(face);
  const bulbs = [];
  disc.add(compose('wheel71-rim', a => { a(G.cyl12, col(0x2b2533), 0, 0, 0, 1.3, .14, 1.3, Math.PI / 2, 0, 0); a(G.cyl12, lam({ color: 0xf5c542, emissive: 0x6a4a10, emissiveIntensity: .4 }, 'wheel71hub'), 0, 0, .12, .14, .08, .14, Math.PI / 2, 0, 0); }));
  for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283, m = new THREE.Mesh(G.sph, lam({ color: 0xffe08a, emissive: 0xffc040, emissiveIntensity: 1 }, 'wheel71bulb' + (i % 2))); m.position.set(Math.cos(an) * 1.3, Math.sin(an) * 1.3, .1); m.scale.setScalar(.065); pivot.add(m); bulbs.push(m); }
  // подписи секторов: отдельные таблички, каждый кадр поворачиваются обратно - всегда читаются
  const labels = SECT.map((q, i) => { const c = canvasTex(64, 64), g = c.c.getContext('2d');
    if (q.skin) drawSkin(g, 32, 34, 40); else { drawFist(g, 6, 8, 4); g.font = 'bold 24px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = '#17111f'; g.strokeText(String(q.n), 44, 44); g.fillStyle = '#ffffff'; g.fillText(String(q.n), 44, 44); }
    const m = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: c.t, transparent: true, alphaTest: .3 })); const th = Math.PI / 2 - i / N * 6.283; m.position.set(Math.cos(th) * .8, Math.sin(th) * .8, .12); m.scale.setScalar(.52); m.userData.noBatch = true; disc.add(m); return m; });
  group.add(compose('wheel71-stand', a => { const r = (dx, dy, dz) => [x + Math.cos(ry) * dx + Math.sin(ry) * dz, dy, z - Math.sin(ry) * dx + Math.cos(ry) * dz];
    for (const s of [-1, 1]) { const [px, py, pz] = r(s * .7, .95, -.2); a(G.box, col(0x6a4a3a), px, py, pz, .14, 1.9, .14, 0, ry, 0); }
    { const [px, py, pz] = r(0, 3.28, .1); a(G.cone4, lam({ color: 0xd8243a }, 'wheel70ptr'), px, py, pz, .14, .3, .08, Math.PI, ry, 0); }
    { const [px, py, pz] = r(1.75, .55, 0); a(G.box, col(0x2b2533), px, py, pz, .3, 1.1, .3, 0, ry, 0); } }));
  const lever = new THREE.Group(); { const c = Math.cos(ry), s = Math.sin(ry); lever.position.set(x + c * 1.75, 1.1, z - s * 1.75); lever.rotation.y = ry; } group.add(lever); W.keep.push(lever);
  lever.add(compose('wheel70-lever', a => { a(G.box, col(0x9a9da8), 0, .35, 0, .06, .7, .06); a(G.sph, lam({ color: 0xd8243a }, 'wheel70knob'), 0, .72, 0, .12, .12, .12); }));
  // личный таймер под колесом
  const tt = canvasTex(160, 48), tm = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: tt.t })); tm.userData.noBatch = true;
  { const c = Math.cos(ry), s2 = Math.sin(ry); tm.position.set(x + s2 * .2, .42, z + c * .2); tm.rotation.y = ry; tm.scale.set(1.2, .36, 1); group.add(tm); }
  let tSig = ''; function drawTimer() { const left = readyIn(), txt = spin ? '...' : left > 0 ? `${Math.floor(left / 3600000)}:${String(Math.floor(left % 3600000 / 60000)).padStart(2, '0')}` : 'КРУТИ!'; if (txt === tSig) return; tSig = txt;
    const g = tt.c.getContext('2d'); g.fillStyle = '#17111f'; g.fillRect(0, 0, 160, 48); g.fillStyle = left > 0 ? '#3a3448' : '#2f7a40'; g.fillRect(3, 3, 154, 42);
    if (left > 0 && !spin) { g.strokeStyle = '#e8e0f8'; g.lineWidth = 3; g.beginPath(); g.arc(24, 24, 12, 0, 7); g.stroke(); g.beginPath(); g.moveTo(24, 24); g.lineTo(24, 15); g.moveTo(24, 24); g.lineTo(31, 24); g.stroke(); }
    g.fillStyle = left > 0 ? '#e8e0f8' : '#f5c542'; g.font = 'bold 24px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, left > 0 ? 94 : 80, 25); tt.t.needsUpdate = true; }
  { const c = Math.cos(ry), s2 = Math.sin(ry); addSolid(x - .9, z - .9, x + .9, z + .9, 0, 3.3); void c; void s2; }
  let spin = null, prize = null;
  function label() { const left = readyIn(); return spin ? 'Крутится…' : left > 0 ? `Колесо удачи · через ${Math.floor(left / 3600000)}:${String(Math.floor(left % 3600000 / 60000)).padStart(2, '0')}` : 'Крутить колесо удачи'; }
  const q = { x: x + Math.cos(ry) * 1.75 + Math.sin(ry) * .9, z: z - Math.sin(ry) * 1.75 + Math.cos(ry) * .9, y: 0, r: 1.6, get label() { return label(); },
    act() { if (spin) return; if (readyIn() > 0) { sfx('no'); return; }
      const tot = SECT.reduce((s2, k) => s2 + k.w, 0); let r = random() * tot, idx = 0; for (; idx < SECT.length; idx++) { r -= SECT[idx].w; if (r <= 0) break; } idx = Math.min(idx, SECT.length - 1);
      try { localStorage.setItem(WHEEL_KEY, String(Date.now())); } catch { } dispatchEvent(new Event('collectionchange'));
      const from = disc.rotation.z % 6.283, to = Math.ceil((from + 6.283 * 5) / 6.283) * 6.283 + idx / SECT.length * 6.283; spin = { t: 0, from, to, idx, tick: 0 }; lever.rotation.x = .9; sfx('click'); } };
  W.interacts.push(q);
  function reward(i) { const k = SECT[i];
    // награда вылетает из колеса: табличка сектора поднимается и растёт
    const src = labels[i]; prize = { m: src.clone(), t: 0 }; prize.m.material = src.material.clone(); src.getWorldPosition(prize.m.position); prize.m.quaternion.copy(pivot.quaternion); group.add(prize.m);
    if (k.skin) { const locked = lockedCharacters(); const id = locked[(random() * locked.length) | 0]; if (id && unlockCharacter(id)) { toast?.(`Новый персонаж: ${SKINS[id]?.name || id}!`); sfx('fanfare'); return; } addCoins(50); toast?.('Все персонажи уже есть · +50 ✊'); sfx('points'); return; }
    addCoins(k.n); toast?.(`+${k.n} ✊`); sfx(k.n >= 25 ? 'fanfare' : 'points'); }
  let tT = 0;
  return { update(dt) { lever.rotation.x *= Math.exp(-dt * 4); for (const l of labels) l.rotation.z = -disc.rotation.z;
    const t0 = performance.now() / 1000; bulbs.forEach((b, i) => { b.material.emissiveIntensity = spin ? ((i + Math.floor(t0 * 14)) % 4 === 0 ? 1.4 : .25) : .6 + Math.sin(t0 * 2 + i) * .3; });
    tT -= dt; if (tT <= 0) { tT = 1; drawTimer(); }
    if (prize) { prize.t += dt; const k = Math.min(1, prize.t / 1.4); prize.m.position.y += dt * 1.2; prize.m.scale.setScalar(.52 + k * .6); prize.m.material.opacity = 1 - Math.max(0, k - .6) / .4; prize.m.material.transparent = true; if (k >= 1) { prize.m.removeFromParent(); prize.m.material.dispose(); prize = null; } }
    if (!spin) { disc.rotation.z += dt * .05; return; } spin.t += dt; const k = Math.min(1, spin.t / 3.6), e = 1 - Math.pow(1 - k, 3); const rz = spin.from + (spin.to - spin.from) * e;
    if (Math.floor(rz / (6.283 / SECT.length)) !== spin.tick) { spin.tick = Math.floor(rz / (6.283 / SECT.length)); sfx('tick', { v: .6 }); } disc.rotation.z = rz;
    if (k >= 1) { const i = spin.idx; spin = null; tSig = ''; reward(i); } } };
}

// v0.71: снеговик - общий модуль world/snowman.js (распадается на части)
import { buildSnowman as bs, hitSnowmen, updateSnowmen } from '../world/snowman.js';
export { hitSnowmen, updateSnowmen };
export const buildSnowman = (group, x, z, ry = 0) => bs(group, x, 0, z, ry);
