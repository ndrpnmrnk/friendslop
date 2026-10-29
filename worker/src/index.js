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
  pub(a) { return { id: a.id, name: a.name, skin: a.skin, ready: !!a.ready, host: !!a.host, muted: !!a.muted, rtt: a.rtt | 0, scene:a.match?'match':'hub' }; }
  send(ws, m) { try { ws.send(typeof m === 'string' ? m : JSON.stringify(m)); } catch { } }
  cast(m, except) { const s = JSON.stringify(m); for (const { ws } of this.players()) if (ws !== except) this.send(ws, s); }
  async webSocketMessage(ws, raw) {
    if(typeof raw!=='string'||raw.length>262144){try{ws.close(1009,'message too large');}catch{}return;}
    let m; try { m = JSON.parse(raw); } catch { return; }
    if(!m||typeof m!=='object'||Array.isArray(m))return;
    const a = ws.deserializeAttachment() || {};
    if (!a.id) { if (m.t === 'hello') await this.hello(ws, a, m); return; }
    // Адресный WebRTC-сигналинг: медиа через Worker не проходят. Отдельный бюджет для ICE при входе.
    if(m.t==='ev'&&m.e==='rtc'){
      const now=Date.now();if(!a.rtcAt||now-a.rtcAt>10000){a.rtcAt=now;a.rtcN=0;}if(++a.rtcN>160)return;ws.serializeAttachment(a);
      const target=this.players().find(p=>p.a.id===m.to&&p.a.id!==a.id);if(!target)return;
      const out={t:'ev',e:'rtc',id:a.id,to:m.to};
      if(m.description&&['offer','answer'].includes(m.description.type)&&typeof m.description.sdp==='string'&&m.description.sdp.length<=32768)out.description={type:m.description.type,sdp:m.description.sdp};
      else if(m.candidate&&typeof m.candidate.candidate==='string'&&m.candidate.candidate.length<=2048)out.candidate={candidate:m.candidate.candidate,sdpMid:typeof m.candidate.sdpMid==='string'?m.candidate.sdpMid.slice(0,32):null,sdpMLineIndex:Number.isInteger(m.candidate.sdpMLineIndex)?m.candidate.sdpMLineIndex:null,usernameFragment:typeof m.candidate.usernameFragment==='string'?m.candidate.usernameFragment.slice(0,256):undefined};
      else return;this.send(target.ws,out);return;
    }
    const now=Date.now();if(!a.rateAt||now-a.rateAt>=1000){a.rateAt=now;a.rateN=0;}if(++a.rateN>45)return;ws.serializeAttachment(a);
    switch (m.t) {
      case 'st': case 'ev': {
        m.id=a.id;if(m.t==='st'){const was=!!a.match;a.match=m.m==='match';ws.serializeAttachment(a);if(was!==a.match)this.cast({t:'upd',p:this.pub(a)});}
        if(m.t==='st'&&m.rtt!==undefined){a.rtt=Math.max(0,Math.min(30000,m.rtt|0));ws.serializeAttachment(a);}
        // У ожидающих в хабе свой ведущий, даже пока основной хост играет матч.
        if(m.protocol===2&&m.t==='st'&&m.m==='hub'||m.t==='ev'&&m.e==='hub'){
          const hub=this.players().filter(q=>!q.a.match).sort((x,y)=>Number(y.a.host)-Number(x.a.host)||x.a.id-y.a.id),leader=hub[0];
          if(!leader)break;
          if(a.id!==leader.a.id){if(m.t==='st')this.send(leader.ws,m);}
          else for(const q of hub)if(q.ws!==ws)this.send(q.ws,m);
          break;
        }
        // v2: ввод/предложения гостя идут только хосту. Снимок мира и решения - только от хоста.
        // Старый релиз 0.60.2 продолжает использовать прежнюю пересылку.
        if(m.t==='st'&&m.protocol===2&&['match','hub'].includes(m.m)&&!a.host){const h=this.players().find(q=>q.a.host);if(h)this.send(h.ws,m);break;}
        if(m.t==='ev'&&['cmd','match-ready'].includes(m.e)){if(!a.host){const h=this.players().find(q=>q.a.host);if(h)this.send(h.ws,m);}break;}
        if(!a.host&&(m.w||m.h||m.b||m.t==='ev'&&(['hub','flow','roster','final','mission-grant','host-pause','correction','effect'].includes(m.e)||m.e==='hit'&&m.ep!==undefined)))break;
        this.cast(m,ws);break;
      }
      case 'rules': {if(!a.host||typeof m.bots!=='boolean')break;await this.ctx.storage.put('bots',m.bots);this.cast({t:'rules',bots:m.bots});break;}
      case 'p': this.send(ws, { t: 'P', c: m.c, s:Date.now() }); break;
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
    let list = this.players(); const st = this.ctx.storage;
    const fail = e => { this.send(ws, { t: 'err', e }); try { ws.close(4000, e); } catch { } };
    if (!/^[A-Z0-9]{4,6}$/.test(a.code || '')) return fail('bad');
    const ver = String(m.ver || '').slice(0, 20), name = clean(m.name) || 'Игрок', token = String(m.token || '').slice(0, 40);
    let host = false, restored = null;
    if (m.create) { if (list.length) return fail('busy'); await st.deleteAll(); await st.put({ ver, migrate:!!m.migrate, bots:m.bots!==false, hostToken: token, next: 1 }); host = true; }
    else {
      if (!list.length) return fail('nf');
      const rv = await st.get('ver'); if (rv && rv !== ver) return fail('ver');
      const duplicate=token&&list.find(q=>q.a.token===token);
      const pending=token?await st.get('rejoin:'+token):null;
      if(duplicate){restored=duplicate.a;restored={...restored};duplicate.a.id=0;duplicate.ws.serializeAttachment(duplicate.a);try{duplicate.ws.close(4003,'replaced');}catch{}list=this.players();}
      else if(pending&&pending.until>Date.now())restored=pending;
      const held=await st.list({prefix:'depart:'});
      if(!restored&&list.length+held.size>=MAX)return fail('full');
      if(restored){host=!!restored.host;await st.delete(['rejoin:'+token,'depart:'+restored.id]);}

      if (token && token === await st.get('hostToken') && !list.some(q => q.a.host)) { host = true; await st.delete('hostGone'); await st.deleteAlarm(); this.cast({ t: 'hostback' }); }
    }
    const id=restored?.id||(await st.get('next'))||1;if(!restored)await st.put('next',id+1);
    Object.assign(a, { id, name, skin: clean(m.skin) || 'cat', ready: false, host, muted: false, rtt: 0, token });
    ws.serializeAttachment(a);
    this.send(ws, { t: 'welcome', id, host, code: a.code, players: this.players().map(q => this.pub(q.a)),bots:(await st.get('bots'))!==false });
    this.cast({ t: 'join', p: this.pub(a) }, ws);
  }
  async webSocketClose(ws,code,reason) { await this.gone(ws,code,reason); }
  async webSocketError(ws) { await this.gone(ws); }
  async gone(ws,code=1006,reason='') {
    const a = ws.deserializeAttachment(); if (!a?.id) return;
    const id = a.id, wasHost = a.host; a.id = 0; ws.serializeAttachment(a);
    const rest = this.players().filter(q => q.ws !== ws);
    if (!rest.length) { await this.ctx.storage.deleteAll(); return; }
    const intentional=code===1000&&reason==='leave',until=Date.now()+GRACE;
    if(await this.ctx.storage.get('migrate')){
      this.cast({t:'leave',id},ws);
      if(wasHost){const next=rest.sort((x,y)=>Number(!!y.a.match)-Number(!!x.a.match)||x.a.id-y.a.id)[0];
        next.a.host=true;next.ws.serializeAttachment(next.a);await this.ctx.storage.put('hostToken',next.a.token);
        await this.ctx.storage.delete('hostGone');this.cast({t:'upd',p:this.pub(next.a)});
      }
      return;
    }

    if(intentional){this.cast({t:'leave',id},ws);if(wasHost){for(const q of rest){this.send(q.ws,{t:'closed',why:'host'});try{q.ws.close(4002,'host left');}catch{}}await this.ctx.storage.deleteAll();}return;}
    await this.ctx.storage.put({['rejoin:'+a.token]:{...a,id,until},['depart:'+id]:{id,token:a.token,until,host:wasHost}});
    if(wasHost){await this.ctx.storage.put('hostGone',Date.now());this.cast({t:'hostwait'},ws);}
    const alarm=await this.ctx.storage.getAlarm();if(!alarm||alarm>until)await this.ctx.storage.setAlarm(until);
  }
  async alarm() {
    const st=this.ctx.storage,now=Date.now(),gone=await st.get('hostGone');
    if(gone&&now-gone>=GRACE&&!this.players().some(q=>q.a.host)){
      for(const{ws}of this.players()){this.send(ws,{t:'closed',why:'host'});try{ws.close(4002,'host left');}catch{}}
      await st.deleteAll();return;
    }
    const departed=await st.list({prefix:'depart:'});let next=Infinity;
    for(const[k,q]of departed){if(q.until>now){next=Math.min(next,q.until);continue;}await st.delete([k,'rejoin:'+q.token]);this.cast({t:'leave',id:q.id});}
    if(next<Infinity)await st.setAlarm(next);
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
