import { account, accountError, onAccount, loginDiscord, logout } from '../net/account.js';
import { sfx } from '../core/sfx.js';

/* Первый экран (v0.64): «Войти через Discord» - основная кнопка, «Играть как гость» - второстепенная.
   После входа остаётся одна кнопка «ИГРАТЬ» и плашка аккаунта (аватар, ник, выйти) в левом верхнем углу. */
const $ = id => document.getElementById(id);
const DISCORD = '<svg viewBox="0 0 24 18" aria-hidden="true"><path fill="currentColor" d="M20.3 1.5A19.6 19.6 0 0 0 15.4 0l-.6 1.3a18 18 0 0 0-5.6 0L8.6 0a19.5 19.5 0 0 0-4.9 1.5C.6 6.2-.3 10.7.1 15.2a19.8 19.8 0 0 0 6 3l1.3-2a12.7 12.7 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4-2 1 1.3 2a19.7 19.7 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7ZM8 12.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 7.6 8 7.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></svg>';

export function initAccountUI(play) {
  const menu = $('menu'), btn = $('playBtn'), guest = $('guestBtn'), note = $('authNote');
  function render() {
    const u = account();
    menu.classList.toggle('signed-out', !u);
    btn.classList.toggle('discord', !u);
    btn.innerHTML = u ? 'ИГРАТЬ' : DISCORD + '<span>ВОЙТИ ЧЕРЕЗ DISCORD</span>';
    $('accountChip').classList.toggle('hidden', !u);
    if (u) { $('accountAva').src = u.avatar || ''; $('accountName').textContent = u.name || ''; }
  }
  btn.onclick = () => { if (account()) { play(); return; } btn.disabled = true; note.textContent = 'Открываю Discord…'; loginDiscord(); };
  guest.onclick = () => play();
  $('accountOut').onclick = () => { sfx('click'); $('accountOut').disabled = true; logout(); };
  const err = accountError(); if (err) { note.textContent = err; setTimeout(() => { if (note.textContent === err) note.textContent = ''; }, 6000); }
  // Возврат со страницы Discord кнопкой «назад» в браузере: кнопку снова можно нажать.
  addEventListener('pageshow', () => { btn.disabled = false; if (note.textContent === 'Открываю Discord…') note.textContent = ''; });
  onAccount(render); render();
}
