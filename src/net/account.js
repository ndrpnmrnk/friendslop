import { serverUrl, myName } from './net.js';

/* Аккаунт игрока (v0.64).
   Гость: всё хранится только в этом браузере, как раньше.
   Discord: ник, аватар и прогресс на сервере комнат, одинаковые на любой ссылке и в любом браузере.
   Синхронизируется прогресс; настройки графики, звука и микрофона остаются у каждого устройства свои. */
const AUTH = 'friendslop.account', LINKED = 'friendslop.account.linked', REV = 'friendslop.account.rev';
export const SYNC_KEYS = ['friendslop.collection.v1', 'friendslop.skin', 'friendslop.parkourBest', 'friendslop.parkourFist', 'friendslop.tut', 'friendslop.throwTip', 'friendslop.progress.v1'];
const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { } };
const json = t => { try { return JSON.parse(t); } catch { return null; } };
const api = () => serverUrl().replace(/^ws/, 'http').replace(/\/+$/, '');
const state = { user: null, token: '', error: '', saving: null, last: '' };
const listeners = new Set();
const changed = () => { for (const f of listeners) try { f(state.user); } catch (e) { console.error(e); } };
export const account = () => state.user;
export const accountError = () => state.error;
export const onAccount = f => { listeners.add(f); return () => listeners.delete(f); };

function request(path, { method = 'GET', body, keepalive = false, timeout = 6000 } = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  return fetch(api() + path, { method, keepalive, signal: keepalive ? undefined : ctl.signal, headers: { authorization: 'Bearer ' + state.token, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ status: r.status, data: await r.json().catch(() => null) })).finally(() => clearTimeout(t));
}
const snapshot = () => Object.fromEntries(SYNC_KEYS.map(k => [k, get(k)]).filter(([, v]) => v != null));
function write(data) { for (const k of SYNC_KEYS) set(k, typeof data?.[k] === 'string' ? data[k] : null); }

// Первый вход в этом браузере: ничего не теряем - объединяем гостевой прогресс с аккаунтом.
export function mergeProgress(local = {}, remote = {}) {
  const out = { ...remote, ...Object.fromEntries(Object.entries(local).filter(([k]) => !(k in remote))) };
  const a = json(local['friendslop.collection.v1']), b = json(remote['friendslop.collection.v1']);
  if (a && b) {
    const claims = { ...(a.fistClaims || {}) };
    for (const [k, v] of Object.entries(b.fistClaims || {})) claims[k] = [...new Set([...(claims[k] || []), ...v])];
    const unlocked = [...new Set([...(b.unlocked || []), ...(a.unlocked || [])])];
    out['friendslop.collection.v1'] = JSON.stringify({ ...a, ...b, coins: Math.max(a.coins || 0, b.coins || 0), unlocked,
      selected: unlocked.includes(b.selected) ? b.selected : a.selected, pending: b.pending || a.pending || null, starter43: !!(a.starter43 || b.starter43), fistClaims: claims });
  }
  const num = k => [local[k], remote[k]].map(Number).filter(v => Number.isFinite(v) && v > 0);
  const best = num('friendslop.parkourBest'); if (best.length) out['friendslop.parkourBest'] = String(Math.min(...best));
  { const pa = json(local['friendslop.progress.v1']) || {}, pb = json(remote['friendslop.progress.v1']) || {}; // v0.70: прогресс - больший из двух
    if (local['friendslop.progress.v1'] || remote['friendslop.progress.v1']) out['friendslop.progress.v1'] = JSON.stringify(Object.fromEntries(['xp', 'wins', 'missions', 'matches'].map(k => [k, Math.max(pa[k] | 0, pb[k] | 0)]))); }
  for (const k of ['friendslop.parkourFist', 'friendslop.throwTip']) { const v = num(k); if (v.length) out[k] = String(Math.max(...v)); }
  if (local['friendslop.tut'] || remote['friendslop.tut']) out['friendslop.tut'] = '1';
  const sel = json(out['friendslop.collection.v1'])?.selected; if (sel) out['friendslop.skin'] = sel;
  return out;
}

function adopt(profile) {
  state.user = { id: profile.id, name: profile.name, avatar: profile.avatar };
  set(AUTH, JSON.stringify({ token: state.token, ...state.user }));
  myName(profile.name); set(REV, String(profile.rev || 0));
}
function clearSession() { state.user = null; state.token = ''; set(AUTH, null); set(LINKED, null); set(REV, null); }

// Вызывается до запуска игры: профиль успевает попасть в хранилище до чтения коллекции.
export async function bootAccount() {
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.has('fs_auth') || hash.has('fs_auth_error')) {
    const t = hash.get('fs_auth'); if (t && /^[A-Za-z0-9_-]{40,60}$/.test(t)) { set(AUTH, JSON.stringify({ token: t })); set(LINKED, null); }
    if (hash.has('fs_auth_error')) state.error = hash.get('fs_auth_error') === 'cancel' ? 'Вход отменён' : 'Discord не ответил, попробуй ещё раз';
    history.replaceState(null, '', location.pathname + location.search);
  }
  const saved = json(get(AUTH));
  if (!saved?.token) return;
  state.token = saved.token;
  if (saved.id) state.user = { id: saved.id, name: saved.name, avatar: saved.avatar };
  try {
    const r = await request('/account', { timeout: 3500 });
    if (r.status === 401) { clearSession(); state.error = 'Сессия истекла, войди снова'; return; }
    if (r.status !== 200 || !r.data?.id) return; // сервер недоступен: играем с последним сохранённым локально
    const p = r.data, remote = p.data || {}, local = snapshot();
    if (get(LINKED) !== p.id) {
      // Новый браузер для этого аккаунта: объединяем и сразу сохраняем на сервер.
      const merged = mergeProgress(local, remote); write(merged); set(LINKED, p.id); adopt(p);
      const up = await request('/account', { method: 'PUT', body: { data: merged }, timeout: 3500 }).catch(() => null);
      if (up?.data?.rev) set(REV, String(up.data.rev));
    } else if ((p.rev || 0) > (Number(get(REV)) || 0)) { write(remote); adopt(p); }
    else adopt(p);
  } catch { /* сеть недоступна - играем локально, отправим позже */ }
  state.last = JSON.stringify(snapshot());
}

// Сохранение прогресса: сразу после изменения коллекции и раз в несколько секунд для остального.
async function push(keepalive = false) {
  if (!state.user || !state.token) return;
  const data = snapshot(), text = JSON.stringify(data);
  if (text === state.last) return;
  if (state.saving && !keepalive) { state.dirty = true; return; }
  state.last = text;
  const job = request('/account', { method: 'PUT', body: { data }, keepalive, timeout: 8000 })
    .then(r => { if (r.status === 401) { clearSession(); changed(); } else if (r.data?.rev) set(REV, String(r.data.rev)); else state.last = ''; })
    .catch(() => { state.last = ''; })
    .finally(() => { state.saving = null; if (state.dirty) { state.dirty = false; push(); } });
  if (!keepalive) state.saving = job;
}
let timer = 0;
export function startAccountSync() {
  addEventListener('collectionchange', () => { clearTimeout(timer); timer = setTimeout(push, 400); });
  setInterval(() => push(), 5000);
  addEventListener('pagehide', () => push(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) push(true); });
}

export function loginDiscord() {
  const back = location.origin + location.pathname + location.search;
  location.href = api() + '/auth/discord?return=' + encodeURIComponent(back);
}
export async function renameAccount(name) {
  if (!state.user) return;
  state.user = { ...state.user, name }; set(AUTH, JSON.stringify({ token: state.token, ...state.user })); changed();
  await request('/account', { method: 'PUT', body: { name } }).catch(() => null);
}
export async function logout() {
  await push(); if (state.token) await request('/account/logout', { method: 'POST' }).catch(() => null);
  // Выход: прогресс остаётся в аккаунте, а этот браузер снова становится «чистым» гостем.
  clearSession(); myName(null); write({}); location.reload();
}
