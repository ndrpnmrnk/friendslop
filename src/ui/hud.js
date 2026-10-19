import { M } from '../missions/missions.js';
import { cam } from '../game/camera.js';
import { icon, img } from './icons.js';
import { TEXT } from './text.js';
import { GADGETS } from '../game/gadgets.js';

/* Игровой интерфейс: всё минимально и в одном пиксельном стиле.
   DOM обновляется только при изменениях, анимации — CSS steps(). */
const $ = id => document.getElementById(id);
export { $ };
const ARROW = '<svg viewBox="0 0 10 10" width="18" height="18" shape-rendering="crispEdges"><path d="M5 0L10 9L5 7L0 9Z" fill="currentColor"/></svg>';
const H = { cards: new Map(), won: new Set(), shown: 0, lastSec: -1, prompt: '', held: '', gslot: '', stamPrev: 1, stamFullT: 0, chipT: 0 };

export function resetHud() {
  for (const el of H.cards.values()) el.remove(); H.cards.clear(); H.won.clear(); H.shown = 0; H.lastSec = -1; H.prompt = H.held = H.gslot = '';
  $('score').textContent = '0'; $('evchip').classList.add('hidden'); $('evbanner').classList.add('hidden'); $('blind').classList.add('hidden');
  $('lockhint').style.backgroundImage = `url(${icon('mouse', 4)})`;
}
export const markWon = id => H.won.add(id);

// пиксельные искры (на экране)
export function sparks(x, y, colors = ['#ff8a1f', '#f5c542', '#9be36b'], n = 8, host = $('flyers')) {
  for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.className = 'spark'; const a = Math.random() * 6.28, d = 30 + Math.random() * 50;
    s.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`; host.appendChild(s); setTimeout(() => s.remove(), 750); }
}
// «+150» вылетает из точки мира и летит в счёт
export function flyScore(sx, sy, pts) {
  const f = document.createElement('div'); f.className = 'fly'; f.textContent = `+${pts}`; f.style.left = sx + 'px'; f.style.top = sy + 'px'; $('flyers').appendChild(f);
  sparks(sx, sy, ['#9be36b', '#f5c542', '#f1e8ff'], 6);
  const r = $('score').getBoundingClientRect();
  requestAnimationFrame(() => { f.style.transform = `translate(${r.left + r.width / 2 - sx - 20}px,${r.top - sy}px) scale(.6)`; f.style.opacity = '0.2'; });
  setTimeout(() => { f.remove(); const s = $('score'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); sparks(r.left + r.width / 2, r.top + 6, ['#ff8a1f', '#f5c542'], 5); }, 700);
}

export function renderHud(S, P, prompt, dt) {
  // время + очки
  const tm = Math.max(0, Math.ceil(S.time)), tEl = $('timer');
  const txt = `${Math.floor(tm / 60)}:${String(tm % 60).padStart(2, '0')}`; if (tEl.textContent !== txt) tEl.textContent = txt;
  tEl.classList.toggle('low', tm <= 30);
  if (tm !== H.lastSec && tm <= 30 && S.state === 'play') { tEl.classList.remove('pulse', 'shake'); void tEl.offsetWidth; tEl.classList.add(tm <= 10 ? 'shake' : 'pulse'); }
  H.lastSec = tm;
  if (H.shown !== S.score) { H.shown += Math.sign(S.score - H.shown) * Math.max(1, Math.ceil(Math.abs(S.score - H.shown) * 0.25)); $('score').textContent = H.shown; }
  // карточки миссий: элемент живёт столько же, сколько миссия
  const live = new Set();
  let nearest = null, nd = 1e9;
  for (const m of M.list) { const p = (m.busy && m.track && m.track()) || m.obj.pos(), d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); if (d < nd) { nd = d; nearest = m; } }
  for (const m of M.list) {
    live.add(m.id);
    let el = H.cards.get(m.id);
    if (!el) { el = document.createElement('div'); el.className = `mcard new d-${m.def.diff}`; el.innerHTML = `${img(m.key, 30)}<div class="mt"><div class="mn">${(TEXT.missions[m.key] || [m.def.name])[0]}</div><div class="ms"><span class="pts">${m.def.points}</span><span class="dist"></span></div><div class="where"></div><div class="bar"><i></i></div></div><div class="arr">${ARROW}</div>`; $('missions').appendChild(el); H.cards.set(m.id, el); setTimeout(() => el.classList.remove('new'), 500); }
    const p = (m.busy && m.track && m.track()) || m.obj.pos(), dx = p.x - P.pos.x, dz = p.z - P.pos.z;
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), ang = Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz);
    el.querySelector('.dist').textContent = `${Math.round(Math.hypot(dx, dz))}м`;
    const w = el.querySelector('.where'), wt = m === nearest ? m.where : ''; if (w.textContent !== wt) w.textContent = wt;
    const bar = el.querySelector('.bar'); bar.style.display = m.def.life > 0 ? '' : 'none'; if (m.def.life > 0) { bar.firstChild.style.width = Math.max(0, m.life / m.def.life * 100) + '%'; bar.classList.toggle('warn', m.life < 8); }
    el.querySelector('.arr').style.transform = `rotate(${ang}rad)`;
    el.classList.toggle('active', !!m.busy);
  }
  for (const [id, el] of H.cards) if (!live.has(id)) { H.cards.delete(id); el.classList.add(H.won.has(id) ? 'won' : 'gone'); setTimeout(() => el.remove(), 520); }
  // подсказка «[E] действие»
  const pr = prompt ? prompt.replace(/<b>(.+?)<\/b>/, '<span class="key">$1</span>') : '';
  if (pr !== H.prompt) { H.prompt = pr; const e = $('prompt'); e.innerHTML = pr; e.classList.toggle('hidden', !pr); }
}

// стамина: пиксельное кольцо из сегментов у персонажа, цифра в центре
export function renderStamina(P, dt) {
  const c = $('stam'), g = c.getContext('2d'), wrap = $('stamwrap'), v = Math.max(0, P.stamina), gold = P.energy > 0;
  if (v >= 1 && !gold) H.stamFullT += dt; else H.stamFullT = 0;
  wrap.classList.toggle('off', H.stamFullT > 1);
  wrap.classList.toggle('empty', P.exhausted);
  g.clearRect(0, 0, 40, 40);
  const N = 20, on = Math.ceil(v * N), col = gold ? '#f5c542' : P.exhausted || v < 0.25 ? '#ff5a6e' : '#9be36b';
  for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + (i + 0.5) / N * Math.PI * 2, x = 20 + Math.cos(a) * 15, y = 20 + Math.sin(a) * 15;
    g.fillStyle = '#17111f'; g.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6); g.fillStyle = i < on ? col : '#3a3046'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); }
  const num = String(Math.round(v * 100)); if ($('stamnum').textContent !== num) $('stamnum').textContent = num;
  // крошки при расходе
  H.chipT -= dt;
  if (v < H.stamPrev - 0.001 && H.chipT <= 0) { H.chipT = 0.08; const a = -Math.PI / 2 + v * Math.PI * 2, ch = document.createElement('i'); ch.className = 'chip';
    ch.style.cssText = `left:${40 + Math.cos(a) * 30}px;top:${40 + Math.sin(a) * 30}px;background:${col};--dx:${Math.cos(a) * 18}px;--dy:${Math.sin(a) * 18 + 10}px`; wrap.appendChild(ch); setTimeout(() => ch.remove(), 520); }
  H.stamPrev = v;
  // предмет в руках
  let held = '';
  if (P.grab) held = `${img('cart', 22)}${TEXT.grab[P.grab.kind] || ''} <span class="key">E</span>${TEXT.keys.hop}`;
  else if (P.held) held = `${img(P.held.type, 22)}${P.held.def.name} <span class="key">ПКМ</span>${TEXT.keys.throw}`;
  if (held !== H.held) { H.held = held; $('held').innerHTML = held; $('held').classList.toggle('hidden', !held); }
  // гаджет
  const gk = P.gadget ? P.gadget.kind + P.gadget.n : '';
  if (gk !== H.gslot) { const e = $('gslot'), was = H.gslot; H.gslot = gk;
    if (P.gadget) { e.innerHTML = `<span class="key">F</span>${img(P.gadget.kind, 36)}${P.gadget.n > 1 ? `<span class="n">${P.gadget.n}</span>` : ''}`; e.style.setProperty('--gc', '#' + GADGETS[P.gadget.kind].color.toString(16).padStart(6, '0'));
      if (!was || was.replace(/\d+$/, '') !== P.gadget.kind) { e.classList.remove('new'); void e.offsetWidth; e.classList.add('new'); } }
    e.classList.toggle('hidden', !P.gadget); }
  // конфетти перед глазами
  const bl = $('blind'), blind = P.blind > 0;
  if (blind !== !bl.classList.contains('hidden')) { bl.classList.toggle('hidden', !blind); if (blind) { bl.innerHTML = ''; for (let i = 0; i < 70; i++) { const q = document.createElement('i'); q.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;background:${['#ff5a6e', '#f5c542', '#9be36b', '#4ab0f0', '#b18cff'][i % 5]};transform:rotate(${Math.random() * 90}deg)`; bl.appendChild(q); } } }
}

// события раунда: баннер на 1,5 с, потом значок с отсчётом у таймера
export function eventBanner(key) { const b = $('evbanner'); b.innerHTML = `${img(TEXT.eventIcon[key], 48)}${TEXT.events[key]}`; b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(H.evT); H.evT = setTimeout(() => b.classList.add('hidden'), 1650); }
export function eventChip(key, sec) { const c = $('evchip'); if (!key) { c.classList.add('hidden'); return; } const h = `${img(TEXT.eventIcon[key], 18)}${sec}`; if (c.innerHTML !== h) c.innerHTML = h; c.classList.remove('hidden'); }
