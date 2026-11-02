import { DurableObject } from 'cloudflare:workers';

/* Аккаунты Friendslop (v0.64): вход через Discord, профиль игрока на сервере.
   Один Durable Object «Accounts» (SQLite) хранит пользователей и сессии.
   Discord-приложение: переменная DISCORD_CLIENT_ID и секрет DISCORD_CLIENT_SECRET у Worker.
   Redirect в Discord Developer Portal: https://<адрес Worker>/auth/discord/callback
   Токен сессии отдаётся игре во фрагменте адреса (#fs_auth=...), в базе хранится только его SHA-256. */

const NAME_MAX = 16, DATA_MAX = 65536, SESSION_DAYS = 180;
const ALLOWED_HOSTS = [/^friendslop-6h1\.pages\.dev$/, /^[a-z0-9-]+\.friendslop-6h1\.pages\.dev$/, /^ndrpnmrnk\.github\.io$/, /^localhost$/, /^127\.0\.0\.1$/, /^terminal\.local$/];
const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const cleanName = s => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX);
const sha = async s => b64url(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));

export function allowedReturn(raw) {
  try {
    const u = new URL(raw);
    if (!['https:', 'http:'].includes(u.protocol) || !ALLOWED_HOSTS.some(r => r.test(u.hostname))) return null;
    if (u.protocol === 'http:' && !['localhost', '127.0.0.1', 'terminal.local'].includes(u.hostname)) return null;
    u.hash = ''; return u.toString();
  } catch { return null; }
}
export function corsHeaders(req) {
  const origin = req.headers.get('origin') || '', h = { 'vary': 'origin', 'cache-control': 'no-store' };
  if (origin && allowedReturn(origin)) Object.assign(h, { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, PUT, POST, OPTIONS', 'access-control-max-age': '86400' });
  return h;
}
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
const page = (text, status = 400) => new Response(`<!doctype html><meta charset="utf-8"><title>Friendslop</title><body style="background:#1d1626;color:#eadcb8;font:16px monospace;padding:40px">${text}</body>`, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
const avatarUrl = u => u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;

// Вход: игра → /auth/discord?return=<адрес игры> → Discord → /auth/discord/callback → игра#fs_auth=...
export async function discordStart(req, env) {
  const url = new URL(req.url), back = allowedReturn(url.searchParams.get('return') || '');
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) return page('Вход через Discord ещё не настроен на сервере.', 503);
  if (!back) return page('Неизвестный адрес игры.');
  const payload = b64url(enc.encode(JSON.stringify({ r: back, e: Date.now() + 10 * 60e3, n: randomToken().slice(0, 12) })));
  const state = payload + '.' + await hmac(env.DISCORD_CLIENT_SECRET, payload);
  const auth = new URL('https://discord.com/oauth2/authorize');
  auth.search = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, response_type: 'code', scope: 'identify', redirect_uri: url.origin + '/auth/discord/callback', state, prompt: 'none' });
  return Response.redirect(auth.toString(), 302);
}

export async function discordCallback(req, env) {
  const url = new URL(req.url), code = url.searchParams.get('code'), state = url.searchParams.get('state') || '';
  const [payload, sig] = state.split('.');
  if (!payload || !sig || sig !== await hmac(env.DISCORD_CLIENT_SECRET || '', payload)) return page('Вход не удался: устаревшая ссылка. Вернись в игру и попробуй ещё раз.');
  let st; try { st = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))); } catch { return page('Вход не удался.'); }
  const back = allowedReturn(st.r);
  if (!back || !(st.e > Date.now())) return page('Вход не удался: ссылка устарела. Вернись в игру и попробуй ещё раз.');
  if (!code) return Response.redirect(back + '#fs_auth_error=cancel', 302);
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: url.origin + '/auth/discord/callback' }) });
  const tok = await tokenRes.json().catch(() => null);
  if (!tok?.access_token) return Response.redirect(back + '#fs_auth_error=discord', 302);
  const me = await fetch('https://discord.com/api/users/@me', { headers: { authorization: 'Bearer ' + tok.access_token } }).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!me?.id || !/^\d{5,25}$/.test(me.id)) return Response.redirect(back + '#fs_auth_error=discord', 302);
  const session = randomToken();
  await env.ACCOUNTS.get(env.ACCOUNTS.idFromName('main')).login({ id: me.id, name: cleanName(me.global_name || me.username) || 'Игрок', avatar: avatarUrl(me), hash: await sha(session) });
  return Response.redirect(back + '#fs_auth=' + session, 302);
}

// API профиля: GET/PUT /account, POST /account/logout. Заголовок Authorization: Bearer <токен>.
export async function accountApi(req, env) {
  const headers = { ...corsHeaders(req), 'content-type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return new Response('{"error":"auth"}', { status: 401, headers });
  const stub = env.ACCOUNTS.get(env.ACCOUNTS.idFromName('main')), hash = await sha(token), path = new URL(req.url).pathname;
  let out;
  if (path === '/account/logout' && req.method === 'POST') out = await stub.logout(hash);
  else if (path === '/account' && req.method === 'GET') out = await stub.profile(hash);
  else if (path === '/account' && req.method === 'PUT') {
    const text = await req.text(); if (text.length > DATA_MAX + 512) return new Response('{"error":"size"}', { status: 413, headers });
    let body; try { body = JSON.parse(text); } catch { return new Response('{"error":"bad"}', { status: 400, headers }); }
    out = await stub.save(hash, body);
  } else return new Response('{"error":"nf"}', { status: 404, headers });
  return new Response(JSON.stringify(out), { status: out?.error === 'auth' ? 401 : out?.error ? 400 : 200, headers });
}

export class Accounts extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT, avatar TEXT, custom INTEGER DEFAULT 0, data TEXT, rev INTEGER DEFAULT 0, created INTEGER, seen INTEGER);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, user TEXT, created INTEGER, seen INTEGER);
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user);`);
  }
  user(hash) {
    const s = this.sql.exec('SELECT user, seen FROM sessions WHERE hash=?', hash).toArray()[0];
    if (!s) return null;
    const now = Date.now();
    if (now - s.seen > SESSION_DAYS * 864e5) { this.sql.exec('DELETE FROM sessions WHERE hash=?', hash); return null; }
    if (now - s.seen > 36e5) this.sql.exec('UPDATE sessions SET seen=? WHERE hash=?', now, hash);
    return this.sql.exec('SELECT * FROM users WHERE id=?', s.user).toArray()[0] || null;
  }
  view(u) { let data = null; try { data = u.data ? JSON.parse(u.data) : null; } catch { } return { id: u.id, name: u.name, avatar: u.avatar, data, rev: u.rev }; }
  async login({ id, name, avatar, hash }) {
    const now = Date.now(), old = this.sql.exec('SELECT custom FROM users WHERE id=?', id).toArray()[0];
    if (old) this.sql.exec(`UPDATE users SET avatar=?, seen=?${old.custom ? '' : ', name=?'} WHERE id=?`, ...(old.custom ? [avatar, now, id] : [avatar, now, name, id]));
    else this.sql.exec('INSERT INTO users(id,name,avatar,custom,data,rev,created,seen) VALUES(?,?,?,0,NULL,0,?,?)', id, name, avatar, now, now);
    this.sql.exec('INSERT INTO sessions(hash,user,created,seen) VALUES(?,?,?,?)', hash, id, now, now);
    // Не больше 10 сессий (браузеров) на аккаунт.
    this.sql.exec('DELETE FROM sessions WHERE user=? AND hash NOT IN (SELECT hash FROM sessions WHERE user=? ORDER BY seen DESC LIMIT 10)', id, id);
    return true;
  }
  async profile(hash) { const u = this.user(hash); return u ? this.view(u) : { error: 'auth' }; }
  async save(hash, body) {
    const u = this.user(hash); if (!u) return { error: 'auth' };
    if (body && typeof body.name === 'string') { const n = cleanName(body.name); if (n) this.sql.exec('UPDATE users SET name=?, custom=1 WHERE id=?', n, u.id); }
    if (body && body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      const text = JSON.stringify(body.data); if (text.length > DATA_MAX) return { error: 'size' };
      this.sql.exec('UPDATE users SET data=?, rev=rev+1 WHERE id=?', text, u.id);
    }
    return this.view(this.sql.exec('SELECT * FROM users WHERE id=?', u.id).toArray()[0]);
  }
  async logout(hash) { this.sql.exec('DELETE FROM sessions WHERE hash=?', hash); return { ok: true }; }
}
