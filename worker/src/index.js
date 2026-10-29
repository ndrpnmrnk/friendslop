import { DurableObject } from 'cloudflare:workers';

/* Сервер комнат Friendslop.
   Один Durable Object «Room» на код комнаты (4 символа). Сервер ничего не считает: принимает игроков,
   хранит список (ник, скин, готов, пинг, хост, заглушён) и пересылает сообщения остальным в комнате.
   WebSocket Hibernation: пока никто не пишет, комната спит и не тратит лимиты.
   Протокол (JSON):
     клиент → сервер: hello{name,skin,ver,create,token} · st{...} (состояние игрока, пересылается) · p{c} (пинг)
                      ready{v} · skin{s} · name{n} · kick{id} · mute{id,v} (кик и мут — только хост) · ev{...} (событие, пересылается)
     сервер → клиент: welcome{id,host,code,players} · join{p} · leave{id} · upd{p} · st{id,...} · P{c}
                      err{e: nf|busy|full|ver|bad} · kicked · closed{why} · hostwait · hostback
   Хост вышел: ждём 8 с (вдруг переподключится), иначе комната закрывается — все возвращаются к одиночной игре. */
const MAX = 8, GRACE = 8000, NAME_MAX = 16;
const clean = s => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX);

export class Room extends DurableObject {
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const url = new URL(req.url), pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: 0, code: (url.searchParams.get('room') || '').toUpperCase().slice(0, 6) });
    return new Response(null, { status: 101, webSocket: client });
  }
  players() { const out = []; for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment(); if (a?.id) out.push({ ws, a }); } return out; }
  pub(a) { return { id: a.id, name: a.name, skin: a.skin, ready: !!a.ready, host: !!a.host, muted: !!a.muted, rtt: a.rtt | 0 }; }
  send(ws, m) { try { ws.send(typeof m === 'string' ? m : JSON.stringify(m)); } catch { } }
  cast(m, except) { const s = JSON.stringify(m); for (const { ws } of this.players()) if (ws !== except) this.send(ws, s); }
  async webSocketMessage(ws, raw) {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const a = ws.deserializeAttachment() || {};
    if (!a.id) { if (m.t === 'hello') await this.hello(ws, a, m); return; }
    switch (m.t) {
      case 'st': case 'ev': m.id = a.id; if (m.t === 'st' && m.rtt !== undefined) { a.rtt = m.rtt | 0; ws.serializeAttachment(a); } this.cast(m, ws); break;
      case 'p': this.send(ws, { t: 'P', c: m.c }); break;
      case 'ready': a.ready = !!m.v; ws.serializeAttachment(a); this.cast({ t: 'upd', p: this.pub(a) }); break;
      case 'skin': a.skin = clean(m.s); ws.serializeAttachment(a); this.cast({ t: 'upd', p: this.pub(a) }); break;
      case 'name': a.name = clean(m.n) || a.name; ws.serializeAttachment(a); this.cast({ t: 'upd', p: this.pub(a) }); break;
      case 'kick': case 'mute': {
        if (!a.host) return; const t = this.players().find(q => q.a.id === m.id); if (!t || t.a.host) return;
        if (m.t === 'kick') { this.send(t.ws, { t: 'kicked' }); t.a.id = 0; t.ws.serializeAttachment(t.a); try { t.ws.close(4001, 'kicked'); } catch { } this.cast({ t: 'leave', id: m.id }); }
        else { t.a.muted = !!m.v; t.ws.serializeAttachment(t.a); this.cast({ t: 'upd', p: this.pub(t.a) }); }
        break; }
    }
  }
  async hello(ws, a, m) {
    const list = this.players(), st = this.ctx.storage;
    const fail = e => { this.send(ws, { t: 'err', e }); try { ws.close(4000, e); } catch { } };
    if (!/^[A-Z0-9]{4,6}$/.test(a.code || '')) return fail('bad');
    const ver = String(m.ver || '').slice(0, 20), name = clean(m.name) || 'Игрок', token = String(m.token || '').slice(0, 40);
    let host = false;
    if (m.create) { if (list.length) return fail('busy'); await st.deleteAll(); await st.put({ ver, hostToken: token, next: 1 }); host = true; }
    else {
      if (!list.length) return fail('nf');
      const rv = await st.get('ver'); if (rv && rv !== ver) return fail('ver');
      if (list.length >= MAX) return fail('full');
      if (token && token === await st.get('hostToken') && !list.some(q => q.a.host)) { host = true; await st.delete('hostGone'); await st.deleteAlarm(); this.cast({ t: 'hostback' }); }
    }
    const id = (await st.get('next')) || 1; await st.put('next', id + 1);
    Object.assign(a, { id, name, skin: clean(m.skin) || 'cat', ready: false, host, muted: false, rtt: 0, token });
    ws.serializeAttachment(a);
    this.send(ws, { t: 'welcome', id, host, code: a.code, players: this.players().map(q => this.pub(q.a)) });
    this.cast({ t: 'join', p: this.pub(a) }, ws);
  }
  async webSocketClose(ws) { await this.gone(ws); }
  async webSocketError(ws) { await this.gone(ws); }
  async gone(ws) {
    const a = ws.deserializeAttachment(); if (!a?.id) return;
    const id = a.id, wasHost = a.host; a.id = 0; ws.serializeAttachment(a);
    const rest = this.players().filter(q => q.ws !== ws);
    if (!rest.length) { await this.ctx.storage.deleteAll(); return; }
    this.cast({ t: 'leave', id }, ws);
    if (wasHost) { await this.ctx.storage.put('hostGone', Date.now()); await this.ctx.storage.setAlarm(Date.now() + GRACE); this.cast({ t: 'hostwait' }, ws); }
  }
  async alarm() {
    if (!(await this.ctx.storage.get('hostGone'))) return;
    if (this.players().some(q => q.a.host)) return;
    for (const { ws } of this.players()) { this.send(ws, { t: 'closed', why: 'host' }); try { ws.close(4002, 'host left'); } catch { } }
    await this.ctx.storage.deleteAll();
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const code = (url.searchParams.get('room') || '').toUpperCase();
      if (!/^[A-Z0-9]{4,6}$/.test(code)) return new Response('bad room', { status: 400 });
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(req);
    }
    if (url.pathname === '/') return new Response('friendslop rooms ok', { headers: { 'access-control-allow-origin': '*' } });
    return new Response('not found', { status: 404 });
  },
};
