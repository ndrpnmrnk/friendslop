import { M } from '../missions/missions.js';
import { V3 } from '../core/gfx.js';
import { cam } from '../game/camera.js';
import { icon, img } from './icons.js';
import { TOOL_INFO, FX_LABEL, TEXT } from './text.js';
import { toolVerb } from '../game/tools.js';
import { W } from '../world/state.js';

/* Игровой интерфейс: всё минимально и в одном пиксельном стиле.
   DOM обновляется только при изменениях, анимации — CSS steps(). */
const $ = id => document.getElementById(id);
export { $ };
const ARROW = '<svg viewBox="0 0 10 10" width="18" height="18" shape-rendering="crispEdges"><path d="M5 0L10 9L5 7L0 9Z" fill="currentColor"/></svg>';
const H = { cards: new Map(), won: new Set(), shown: 0, lastSec: -1, prompt: '', held: '', gslot: '', stamPrev: 1, stamFullT: 0, chipT: 0 };

export function resetHud() {
  resetCompass();
  for (const el of H.cards.values()) el.remove(); H.cards.clear(); H.won.clear(); H.shown = 0; H.lastSec = -1; H.prompt = H.held = H.gslot = '';
  $('score').textContent = '0'; $('evchip').classList.add('hidden'); $('evbanner').classList.add('hidden'); $('blind').classList.add('hidden');
  $('lockhint').style.backgroundImage = `url(${icon('mouse', 4)})`;
}
export const markWon = id => H.won.add(id);
// всплывающая строка по центру (новая волна, кража, срыв…)
export function toast(text, cls = '') { const el = $('toast'); if (!el) return; el.textContent = text; el.className = cls; void el.offsetWidth; el.classList.add('go'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 1900); }

/* Навигатор: ОДНА крупная метка главной цели. Цель видна на экране — метка висит над ней (значок + метры);
   цель за краем или за спиной — метка прижата к краю экрана и показывает стрелкой, куда повернуть. */
const NAV = { el: null, key: '' };
export function renderNav(camera, P, t) {
  const el = NAV.el || (NAV.el = $('nav')); if (!el) return;
  if (!t) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const key = t.icon + t.color; if (key !== NAV.key) { NAV.key = key; el.querySelector('.ni').innerHTML = img(t.icon, 28); el.style.setProperty('--c', t.color); el.classList.remove('new'); void el.offsetWidth; el.classList.add('new'); }
  const v = new V3(t.x, t.y + 2.4, t.z).project(camera);
  const W2 = innerWidth, H2 = innerHeight, m = 64; let sx = (v.x + 1) / 2 * W2, sy = (1 - v.y) / 2 * H2; const behind = v.z > 1;
  if (behind) { sx = W2 - sx; sy = H2 - sy; }
  const on = !behind && sx > m && sx < W2 - m && sy > m + 60 && sy < H2 - m;
  let ang = 0;
  if (!on) { const cx = W2 / 2, cy = H2 / 2; let dx = sx - cx, dy = sy - cy; if (behind && Math.abs(dy) < 1) dy = 1; ang = Math.atan2(dy, dx);
    const kx = (W2 / 2 - m) / Math.abs(dx || 1e-3), ky = (H2 / 2 - m - 30) / Math.abs(dy || 1e-3), k = Math.min(kx, ky); sx = cx + dx * k; sy = cy + dy * k; }
  el.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy)}px)`;
  el.classList.toggle('edge', !on); el.querySelector('.na').style.transform = `rotate(${ang}rad)`;
  const d = `${Math.round(Math.hypot(t.x - P.pos.x, t.z - P.pos.z))} м${t.floorDelta ? ' · ' + (t.floorDelta > 0 ? '▲' : '▼') + Math.abs(t.floorDelta) : ''}`, dd = el.querySelector('.nd'); if (dd.textContent !== d) dd.textContent = d;
  const lb = el.querySelector('.nl'), lt = t.label || ''; if (lb.textContent !== lt) lb.textContent = lt;
}
export function resetCompass() { NAV.key = ''; }

// пиксельные искры (на экране)
export function sparks(x, y, colors = ['#ff8a1f', '#f5c542', '#9be36b'], n = 8, host = $('flyers')) {
  for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.className = 'spark'; const a = Math.random() * 6.28, d = 30 + Math.random() * 50;
    s.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`; host.appendChild(s); setTimeout(() => s.remove(), 750); }
}
// «+150» вылетает из точки мира и летит в счёт
export function flyScore(sx, sy, pts) {
  const f = document.createElement('div'); f.className = 'fly' + (pts < 0 ? ' neg' : ''); f.textContent = pts < 0 ? `${pts}` : `+${pts}`; f.style.left = sx + 'px'; f.style.top = sy + 'px'; $('flyers').appendChild(f);
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
  if (tm !== H.lastSec && tm <= 30 && S.state === 'play') { tEl.classList.remove('pulse', 'shake', 'beat'); void tEl.offsetWidth; tEl.classList.add(tm <= 10 ? 'beat' : 'pulse'); }
  H.lastSec = tm;
  if (H.shown !== S.score) { H.shown += Math.sign(S.score - H.shown) * Math.max(1, Math.ceil(Math.abs(S.score - H.shown) * 0.25)); $('score').textContent = H.shown; }
  // карточки миссий: элемент живёт столько же, сколько миссия
  const live = new Set();
  // главная цель — одна: ближайшая миссия (её выбирает main.js), остальные карточки приглушены
  const nearest = M.list.find(m => m.busy) || S.main || null;
  for (const m of M.list) {
    if (m.owner && m.owner !== P) continue;
    live.add(m.id);
    let el = H.cards.get(m.id);
    if (!el) { const tag = m.owner ? `<span class="tag">${m.outsider ? TEXT.tagOutsider : TEXT.tagPersonal}</span>` : '';
      el = document.createElement('div'); el.className = `mcard new d-${m.def.diff}${m.owner ? ' mine' : ''}`; el.innerHTML = `${img(m.key, 30)}<div class="mt"><div class="mn">${tag}${(TEXT.missions[m.key] || [m.def.name])[0]}</div><div class="ms"><span class="pts">${m.pts}</span><span class="dist"></span></div><div class="where"></div><div class="bar"><i></i></div></div>`; $('missions').appendChild(el); H.cards.set(m.id, el); setTimeout(() => el.classList.remove('new'), 600); }
    const p = (m.busy && m.track && m.track()) || m.obj.pos(), dx = p.x - P.pos.x, dz = p.z - P.pos.z;
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), ang = Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz);
    el.querySelector('.dist').textContent = `${Math.round(Math.hypot(dx, dz))}м`;
    const w = el.querySelector('.where'), wt = m.where || ''; if (w.textContent !== wt) w.textContent = wt;
    const bar = el.querySelector('.bar'); bar.firstChild.style.width = Math.max(0, m.life / m.maxLife * 100) + '%'; bar.classList.toggle('warn', m.life < m.maxLife * 0.25);
    el.classList.toggle('taken', !!m.doer);
    el.classList.toggle('active', !!m.busy); el.classList.toggle('main', m === nearest && !m.busy); el.classList.toggle('dim', m !== nearest);
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
  // предмет в руках: инструмент — «ЛКМ действие · ПКМ бросок», заряды
  let held = '';
  if (P.grab) held = `${img('cart', 22)}${TEXT.grab[P.grab.kind] || ''} <span class="key">E</span>${TEXT.keys.hop}`;
  else if (P.holding) held = `${img('mouse', 22)}${P.holding.bot ? P.holding.name : TEXT.you} <span class="key">ПКМ</span>${TEXT.keys.throw} <span class="key">E</span>${TEXT.keys.drop}`;
  else if (P.heldBy) held = `<span class="key">ПРОБЕЛ</span>${TEXT.keys.struggle}`;
  else if (P.held) {
    // карточка «в руках»: крупная иконка, название, заряды и что с этим делать
    // запас: шкала 0–100 (огнетушитель, пылесос), патроны (водяной пистолет и др.), перезарядка — серая иконка заполняется снизу (сетемёт)
    const it = P.held, d = it.def, v = d.tool || it.type === 'can' ? toolVerb(it) : '';
    const am = d.charge ? `<span class="bar"><i style="width:${Math.round(Math.max(0, it.ammo) / d.ammo * 20) * 5}%"></i></span>` : d.ammo && d.ammo < 50 ? `<span class="n">×${Math.max(0, it.ammo)}</span>` : '';
    const cd = d.cdMax && it.cd > 0 ? Math.round((1 - it.cd / d.cdMax) * 20) * 5 : -1;
    const acts = [v && !(d.ammo && it.ammo <= 0) ? `<span><span class="key">ЛКМ</span>${v}</span>` : '', `<span><span class="key">ПКМ</span>${TEXT.heldThrow}</span>`, `<span><span class="key">E</span>${TEXT.heldDrop}</span>`].filter(Boolean).join('');
    const info = TOOL_INFO[it.type], fx = info && FX_LABEL[info[1]];
    held = `<div class="hci${cd >= 0 ? ' cd' : ''}">${img(it.type, 40)}${cd >= 0 ? `<i class="cdf" style="height:${cd}%"></i>` : ''}</div><div class="hct"><b>${d.name}${am}${fx ? `<em class="fx" style="--fx:${fx[1]}">${fx[0]}</em>` : ''}</b>${info ? `<div class="hcd">${info[0]}</div>` : ''}<div class="hck">${acts}</div></div>`; }
  if (held !== H.held) { const was = H.heldType, now = P.held ? P.held.type : P.grab ? 'grab' : P.holding ? 'hold' : P.heldBy ? 'held' : '';
    H.held = held; H.heldType = now; const e2 = $('held'); e2.innerHTML = held; e2.classList.toggle('hidden', !held);
    if (held && now !== was) { e2.classList.remove('new'); void e2.offsetWidth; e2.classList.add('new'); } }
  // эффекты на персонаже: ботинки, маска, энергетик — маленькие значки с отсчётом
  const fx = [P.boots > 0 ? `${img('boots', 16)}${P.boots}` : '', P.ghost > 0 ? `${img('mask', 16)}${Math.ceil(P.ghost)}` : '', P.energy > 0 ? `${img('energy', 16)}${Math.ceil(P.energy)}` : '', P.paintT > 0 ? `${img('paint', 16)}${Math.ceil(P.paintT)}` : '', P.stBoost > 0 ? `${img('energy', 16)}${Math.ceil(P.stBoost)}` : ''].filter(Boolean).join('');
  if (fx !== H.gslot) { H.gslot = fx; const e3 = $('gslot'); e3.innerHTML = fx; e3.classList.toggle('hidden', !fx); }
  // конфетти перед глазами
  const bl = $('blind'), blind = P.blind > 0;
  if (blind !== !bl.classList.contains('hidden')) { bl.classList.toggle('hidden', !blind); if (blind) { bl.innerHTML = ''; for (let i = 0; i < 70; i++) { const q = document.createElement('i'); q.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;background:${['#ff5a6e', '#f5c542', '#9be36b', '#4ab0f0', '#b18cff'][i % 5]};transform:rotate(${Math.random() * 90}deg)`; bl.appendChild(q); } } }
}

// события раунда: баннер на 1,5 с, потом значок с отсчётом у таймера
export function eventBanner(key, big) { const b = $('evbanner'); b.innerHTML = `${img(TEXT.eventIcon[key], 48)}<span>${TEXT.events[key]}${big && TEXT.eventSub[key] ? `<small>${TEXT.eventSub[key]}</small>` : ''}</span>`; b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(H.evT); b.classList.toggle('big', !!big); H.evT = setTimeout(() => b.classList.add('hidden'), big ? 2600 : 1650); }
export function eventChip(key, sec, info = '') { const c = $('evchip'); if (!key) { c.classList.add('hidden'); return; } const h = `${img(TEXT.eventIcon[key], 18)}${sec}${info ? `<b>${info}</b>` : ''}`; if (c.innerHTML !== h) c.innerHTML = h; c.classList.remove('hidden'); }
