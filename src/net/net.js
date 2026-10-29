import { random } from '../core/random.js';
import { smoothClockOffset } from './cadence.js';
/* Сеть Friendslop: подключение к серверу комнат (worker/), список игроков, отправка/приём сообщений.
   Сервер только пересылает — кто что делает, решают клиенты (в хабе каждый отвечает за себя).
   Адрес сервера: NET_URL ниже; для проверок можно подменить ?server=ws://127.0.0.1:8787 (запоминается в браузере). */
const NET_URL = 'wss://friendslop-rooms.andrey-ponomarenko-06-24.workers.dev';
const VER = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };
const SS = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch { return null; } };
{ const q = new URLSearchParams(location.search).get('server'); if (q) LS('friendslop.server', q); }
export const serverUrl = () => LS('friendslop.server') || NET_URL;
export const myName = (v) => v === undefined ? (LS('friendslop.nick') || '') : LS('friendslop.nick', v);
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 4 }, () => CODE_CH[random() * CODE_CH.length | 0]).join('');

const listeners = {};
export const onNet = (ev, fn) => { (listeners[ev] ??= []).push(fn); };
const emit = (ev, ...a) => { for (const f of listeners[ev] || []) try { f(...a); } catch (e) { console.error(e); } };

export const NET = { ws: null, state: 'off', code: '', id: 0, host: false, players: new Map(), rtt: 0, offset:0, skin: 'cat', error: '',botsEnabled:true,sendRateHz:20 };
let pingT = null, retryTimer = null, retry = 0, wantClose = false, lastCreate = false, clockSynced = false;
export const hubHostId=()=>[...NET.players.values()].filter(p=>p.scene!=='match').sort((a,b)=>Number(b.host)-Number(a.host)||a.id-b.id)[0]?.id;
export const serverNow=()=>Date.now()+NET.offset;
export const inRoom = () => NET.state === 'on';
export const me = () => NET.players.get(NET.id);
export const others = () => [...NET.players.values()].filter(p => p.id !== NET.id);

const traffic={at:performance.now(),tx:0,rx:0,txBytes:0,rxBytes:0,sendHz:0,receiveHz:0,outKB:0,inKB:0,receiveMs:0,dropped:0};
function countTraffic(direction,bytes){traffic[direction]++;traffic[direction+'Bytes']+=bytes;const now=performance.now(),dt=(now-traffic.at)/1000;if(dt>=1){traffic.sendHz=traffic.tx/dt;traffic.receiveHz=traffic.rx/dt;traffic.outKB=traffic.txBytes/dt/1024;traffic.inKB=traffic.rxBytes/dt/1024;traffic.tx=traffic.rx=traffic.txBytes=traffic.rxBytes=0;traffic.at=now;}}
export const netStats=()=>({rtt:NET.rtt,queue:NET.ws?.bufferedAmount||0,players:NET.players.size,targetHz:NET.sendRateHz,...traffic});
export function send(m) {
  if(!NET.ws||NET.ws.readyState!==1)return false;
  // Не ставим новые устаревающие состояния в длинную TCP-очередь. Команды/звук повторяет вызывающий код.
  if(m.t==='st'&&NET.ws.bufferedAmount>32768){traffic.dropped++;return false;}
  const raw=JSON.stringify(m);NET.ws.send(raw);countTraffic('tx',raw.length);return true;
}

function open(code, create) {
  clearTimeout(retryTimer);
  if (NET.ws) { wantClose = true; try { NET.ws.close(); } catch { } }
  wantClose = false; lastCreate = create; NET.code = code; NET.state = 'connecting'; NET.error = ''; emit('state');
  let ws; try { ws = new WebSocket(serverUrl() + '/ws?room=' + code); } catch { fail('Сервер недоступен'); return; }
  NET.ws = ws;
  ws.onopen = () => { let token = SS('friendslop.tok.' + code); if (!token) { token = random().toString(36).slice(2) + Date.now().toString(36); SS('friendslop.tok.' + code, token); }
    send({ t: 'hello', name: myName() || 'Игрок', skin: NET.skin, ver: VER, migrate: true,bots:LS('friendslop.bots')!=='0', create: create ? 1 : 0, token }); };
  ws.onmessage = e => { const start=performance.now();let m; try { m = JSON.parse(e.data); } catch { return; }countTraffic('rx',e.data.length);try{handle(m);}finally{traffic.receiveMs=Math.max(traffic.receiveMs*.9,performance.now()-start);} };
  ws.onclose = () => { if (NET.ws !== ws) return; clearInterval(pingT); NET.ws = null;
    if (NET.state !== 'off' && !wantClose && retry < 4) { retry++; NET.state = 'connecting'; emit('state'); emit('toast', 'Связь пропала — переподключаюсь…'); retryTimer = setTimeout(() => {if(!wantClose)open(NET.code, false);}, 800 * retry); return; }
    if (NET.state !== 'off') leaveLocal(); };
}
function fail(msg) { NET.error = msg; emit('toast', msg); leaveLocal(); }
function leaveLocal() { clearTimeout(retryTimer); clearInterval(pingT); NET.state = 'off'; NET.id = 0; NET.host = false; const was = [...NET.players.keys()]; NET.players.clear(); clockSynced=false; for (const id of was) emit('leave', id); emit('state'); setInviteUrl(''); }
function setInviteUrl(code) { try { const u = new URL(location.href); if (code) u.searchParams.set('room', code); else u.searchParams.delete('room'); history.replaceState(null, '', u); } catch { } }

function handle(m) {
  switch (m.t) {
    case 'welcome': retry = 0; NET.state = 'on'; NET.id = m.id; NET.host = m.host; NET.code = m.code;NET.botsEnabled=m.bots!==false; NET.players.clear(); for (const p of m.players) NET.players.set(p.id, p);
      clearInterval(pingT); pingT = setInterval(() => send({ t: 'p', c: performance.now() }), 3000); send({ t: 'p', c: performance.now() });
      setInviteUrl(m.code); emit('state'); for (const p of m.players) if (p.id !== m.id) emit('join', p); break;
    case 'rules': NET.botsEnabled=m.bots!==false;emit('rules');emit('state');break;
    case 'err': { const e = { nf: 'Нет такого лобби', busy: 'Код занят — пробую другой', full: 'Лобби заполнено (8 из 8)', ver: 'У вас разные версии игры — обновите страницу (Ctrl+F5)', bad: 'Неверный код' }[m.e] || 'Ошибка';
      if (m.e === 'busy' && lastCreate) { wantClose = true; open(newCode(), true); return; } wantClose = true; fail(e); break; }
    case 'join': NET.players.set(m.p.id, m.p); emit('join', m.p); emit('toast', m.p.name + ' в лобби'); emit('state'); break;
    case 'leave': { const p = NET.players.get(m.id); NET.players.delete(m.id); emit('leave', m.id); if (p) emit('toast', p.name + ' вышел'); emit('state'); break; }
    case 'upd': { const p = NET.players.get(m.p.id); NET.players.set(m.p.id, { ...p, ...m.p }); if (m.p.id === NET.id) NET.host = m.p.host; emit('state'); break; }
    case 'st': emit('st', m); break;
    case 'ev': emit('ev', m); break;
    case 'P': NET.rtt = Math.round(performance.now() - m.c);if(Number.isFinite(m.s)){NET.offset=smoothClockOffset(NET.offset,m.s+NET.rtt/2-Date.now(),!clockSynced);clockSynced=true;} { const p = me(); if (p) p.rtt = NET.rtt; } emit('ping'); break;
    case 'kicked': wantClose = true; emit('toast', 'Хост выгнал тебя из лобби'); leaveLocal(); break;
    case 'hostwait': emit('toast', 'Хост отключился — ждём его…'); break;
    case 'hostback': emit('toast', 'Хост вернулся'); break;
    case 'closed': wantClose = true; emit('toast', 'Хост вышел — лобби закрыто'); leaveLocal(); break;
  }
}

export function createRoom(skin) { NET.skin = skin || NET.skin; open(newCode(), true); }
export function joinRoom(code, skin) { code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length < 4) { emit('toast', 'Код — 4 символа'); return; } NET.skin = skin || NET.skin; open(code, false); }
export function leaveRoom() { wantClose = true; if (NET.ws) try { NET.ws.close(1000, 'leave'); } catch { } leaveLocal(); }
export function setReady(v) { const p = me(); if (p) p.ready = v; send({ t: 'ready', v: v ? 1 : 0 }); emit('state'); }
export function setSkin(s) { NET.skin = s; if (inRoom()) { const p = me(); if (p) p.skin = s; send({ t: 'skin', s }); } }
export function setName(n) { myName(n); if (inRoom()) { const p = me(); if (p) p.name = n; send({ t: 'name', n }); } }
export function kick(id) { if (NET.host) send({ t: 'kick', id }); }
export function mute(id, v) { if (NET.host) send({ t: 'mute', id, v: v ? 1 : 0 }); }
export const inviteLink = () => { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('room', NET.code); return u.toString(); };
export const roomFromUrl = () => { const c = new URLSearchParams(location.search).get('room'); return c ? c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : ''; };
export const version = VER;

export const botsEnabled=()=>inRoom()?NET.botsEnabled:LS('friendslop.bots')!=='0';
export function setBotsEnabled(value){if(inRoom()&&!NET.host)return;const v=!!value;LS('friendslop.bots',v?'1':'0');NET.botsEnabled=v;if(inRoom())send({t:'rules',bots:v});emit('rules');emit('state');}
