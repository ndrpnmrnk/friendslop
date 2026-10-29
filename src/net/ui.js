import { random } from '../core/random.js';
import { NET, onNet, inRoom, me, myName, createRoom, joinRoom, leaveRoom, setReady, setName, kick, mute, inviteLink, roomFromUrl,botsEnabled,setBotsEnabled } from './net.js';
import { remoteMode } from './hub-sync.js';
import { SKINS } from '../characters/skins.js';
import { sfx } from '../core/sfx.js';

/* Интерфейс онлайна:
   - панель ника (при первом входе и по кнопке «сменить ник»): пиксельный ник-табличка прыгает по буквам, пока печатаешь;
   - лобби в меню на Esc (справа от меню хаба): создать / войти по коду; в лобби — код, ссылка-приглашение,
     список игроков (скин, ник, хост, готов, пинг, «в матче»), у хоста — заглушить / выгнать; «Готов», «Покинуть»;
   - короткие уведомления внизу (кто зашёл/вышел, ошибки). */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NAMES1 = ['Тыквенный', 'Ночной', 'Липкий', 'Громкий', 'Шустрый', 'Сонный', 'Хитрый', 'Пушистый', 'Жареный', 'Лунный'];
const NAMES2 = ['Кот', 'Пельмень', 'Фантом', 'Бублик', 'Енот', 'Тапок', 'Сырок', 'Гоблин', 'Зефир', 'Шпрот'];
let skinNow = () => 'cat', toastT = null, afterNick = null;

function toast(msg) { const e = $('netToast'); e.textContent = msg; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2600); }

/* ---------- панель ника ---------- */
function renderPreview() { const v = $('nickInput').value.trim() || 'ТВОЙ НИК';
  $('nickPreview').innerHTML = [...v].map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
  $('nickCount').textContent = $('nickInput').value.length + '/16'; $('nickGo').disabled = !$('nickInput').value.trim(); }
export function askNick(then) {
  afterNick = then || null; $('nickInput').value = myName(); renderPreview(); $('nickPanel').classList.add('open'); $('nickCancel').classList.toggle('hidden', !myName());
  setTimeout(() => $('nickInput').focus(), 60);
}
function closeNick(ok) { if (ok) { const v = $('nickInput').value.trim().slice(0, 16); if (!v) return; setName(v); sfx('click'); } $('nickPanel').classList.remove('open'); const f = afterNick; afterNick = null; if (ok && f) f(); renderLobby(); }

/* ---------- лобби в меню Esc ---------- */
function renderLobby() {
  const box = $('lobbyPanel'); if (!box) return;
  if (!inRoom()) {
    box.innerHTML = `<small>ИГРА С ДРУЗЬЯМИ</small>
      <div class="lbNick"><span>Ты:</span><b>${esc(myName() || 'без ника')}</b><button class="lbLink" data-a="nick">сменить</button></div>
      <button class="pbtn" data-a="create" ${NET.state === 'connecting' ? 'disabled' : ''}>${NET.state === 'connecting' ? 'ПОДКЛЮЧАЮСЬ…' : 'СОЗДАТЬ ЛОББИ'}</button>
      <div class="lbJoin"><input id="lbCode" maxlength="6" placeholder="КОД" autocomplete="off" spellcheck="false"><button class="pbtn alt" data-a="join">ВОЙТИ</button></div>
      <p class="lbHint">Создай лобби и дай друзьям код или ссылку — они появятся рядом с тобой в хабе.</p>`;
    return;
  }
  const mine = me(), host = NET.host, list = [...NET.players.values()].sort((a, b) => (b.host - a.host) || a.id - b.id);
  box.innerHTML = `<small>ЛОББИ · ${list.length}/8</small>
    <div class="lbCode"><span>КОД</span><b>${esc(NET.code)}</b><button class="lbLink" data-a="copy">скопировать ссылку</button></div>
    <div class="lbNick"><span>Боты-соперники</span><button class="stog ${botsEnabled()?'on':''}" role="switch" aria-label="Боты-соперники" aria-checked="${botsEnabled()}" data-a="bots" ${host?'':'disabled'}>${botsEnabled()?'ВКЛ':'ВЫКЛ'}</button></div>
    <ul class="lbList">${list.map(p => { const away = p.id !== NET.id && remoteMode(p.id) === 'match';
      return `<li class="${p.id === NET.id ? 'me' : ''}"><i class="lbSkin">${esc((SKINS[p.skin]?.name || p.skin || '').slice(0, 1))}</i>
        <b>${p.host ? '<em>ХОСТ</em>' : ''}${esc(p.name)}</b>
        <span class="lbReady ${p.ready ? 'on' : ''}">${p.ready ? 'ГОТОВ' : '—'}</span>
        <span class="lbPing ${p.rtt > 150 ? 'bad' : p.rtt > 80 ? 'mid' : ''}">${away ? 'в матче' : (p.rtt ? p.rtt + ' мс' : '…')}</span>
        ${host && p.id !== NET.id ? `<button class="lbAct" data-a="mute" data-id="${p.id}">${p.muted ? 'ВКЛ. ЗВУК' : 'ЗАГЛУШИТЬ'}</button><button class="lbAct red" data-a="kick" data-id="${p.id}">ВЫГНАТЬ</button>` : (p.muted ? '<span class="lbMuted">заглушён</span>' : '')}
      </li>`; }).join('')}</ul>
    <div class="lbRow"><button class="pbtn ${mine?.ready ? '' : 'alt'}" data-a="ready">${mine?.ready ? 'ГОТОВ ✓' : 'ГОТОВ?'}</button><button class="pbtn alt" data-a="leave">ПОКИНУТЬ</button></div>
    <div class="lbNick"><span>Ты:</span><b>${esc(myName() || '')}</b><button class="lbLink" data-a="nick">сменить ник</button></div>`;
}
function act(a, id) {
  if (a === 'nick') askNick();
  else if (a === 'create') { if (!myName()) askNick(() => createRoom(skinNow())); else createRoom(skinNow()); }
  else if (a === 'join') { const c = $('lbCode')?.value; if (!myName()) askNick(() => joinRoom(c, skinNow())); else joinRoom(c, skinNow()); }
  else if (a === 'copy') { const link = inviteLink(); (navigator.clipboard?.writeText(link) || Promise.reject()).then(() => toast('Ссылка скопирована — кинь её друзьям'), () => { prompt('Ссылка-приглашение:', link); }); }
  else if(a==='bots')setBotsEnabled(!botsEnabled());
  else if (a === 'ready') setReady(!me()?.ready);
  else if (a === 'leave') { leaveRoom(); toast('Ты вышел из лобби'); }
  else if (a === 'kick') kick(+id);
  else if (a === 'mute') { const p = NET.players.get(+id); mute(+id, !p?.muted); }
  sfx('click');
}

export function initNetUI({ currentSkin }) {
  skinNow = currentSkin;
  const menu = $('menu'), hp = $('hubPause');
  hp.insertAdjacentHTML('afterend', '<aside id="lobbyPanel" aria-label="Лобби"></aside>');
  document.body.insertAdjacentHTML('beforeend', `<div id="netToast" role="status" aria-live="polite"></div>
    <div id="nickPanel" role="dialog" aria-modal="true" aria-labelledby="nickTitle"><div class="nickBox">
      <small id="nickTitle">КАК ТЕБЯ ЗОВУТ?</small>
      <div id="nickPreview" aria-hidden="true"></div>
      <div class="nickField"><input id="nickInput" maxlength="16" autocomplete="off" spellcheck="false" placeholder="ник до 16 символов"><span id="nickCount">0/16</span></div>
      <div class="nickBtns"><button class="pbtn alt" id="nickDice">СЛУЧАЙНЫЙ</button><button class="pbtn" id="nickGo">ПОЕХАЛИ</button></div>
      <button class="pback" id="nickCancel">отмена</button>
      <p>Ник видят друзья над твоим персонажем</p></div></div>`);
  void menu;
  $('lobbyPanel').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) act(b.dataset.a, b.dataset.id); });
  $('lobbyPanel').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'lbCode') act('join'); });
  $('nickInput').addEventListener('input', () => { renderPreview(); sfx('tick', { v: .4 }); });
  $('nickInput').addEventListener('keydown', e => { if (e.key === 'Enter') closeNick(true); if (e.key === 'Escape' && myName()) closeNick(false); e.stopPropagation(); });
  $('nickDice').onclick = () => { $('nickInput').value = NAMES1[random() * NAMES1.length | 0] + ' ' + NAMES2[random() * NAMES2.length | 0]; renderPreview(); sfx('pop'); };
  $('nickGo').onclick = () => closeNick(true);
  $('nickCancel').onclick = () => closeNick(false);
  onNet('state', renderLobby); onNet('ping', () => { if ($('hubPause').classList.contains('open')) renderLobby(); }); onNet('toast', toast);
  renderLobby();
}
// перед входом в хаб: нет ника — сначала панель ника; есть ссылка ?room= — сразу в лобби
export function beforeHub(go) { if (!myName()) { askNick(go); return; } go(); }
export function afterHubShown() { const code = roomFromUrl(); if (code && !inRoom() && NET.state === 'off') joinRoom(code, skinNow()); }
export const nickOpen = () => document.getElementById('nickPanel')?.classList.contains('open');
