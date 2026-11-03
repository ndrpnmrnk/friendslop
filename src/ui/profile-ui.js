import { progress, levelSpan, levelOf, MAX_LEVEL, xpForLevel, announce } from '../game/progress.js';
import { account } from '../net/account.js';
import { myName, onNet } from '../net/net.js';
import { sfx } from '../core/sfx.js';

/* v0.70 профиль в хабе: плашка (аватар, ник, уровень, полоска опыта) слева сверху рядом с настройками;
   клик - карточка: уровень, опыт и сколько до следующего, победы, выполненные миссии, сыгранные матчи. В матче не показывается. */
const $ = id => document.getElementById(id);
export function initProfileUI(skinIcon) {
  const chip = $('profileChip'), card = $('profileCard'); if (!chip) return;
  const render = () => {
    const p = progress(), [a, b, n] = levelSpan(p.xp), u = account(), ava = u?.avatar || (skinIcon ? skinIcon() : '');
    for (const id of ['profAva', 'pcAva']) { const im = $(id); if (ava) im.src = ava; im.style.visibility = ava ? '' : 'hidden'; }
    $('profName').textContent = $('pcName').textContent = u?.name || myName() || 'Гость';
    $('profLvl').textContent = $('pcLvl').textContent = n; const w = (n >= MAX_LEVEL ? 100 : a / b * 100).toFixed(1) + '%'; $('profBar').style.width = $('pcBar').style.width = w;
    $('pcXp').textContent = n >= MAX_LEVEL ? `${p.xp} опыта · максимальный уровень` : `${p.xp} опыта · до ${n + 1} уровня: ${xpForLevel(n + 1) - p.xp}`;
    $('pcWins').textContent = p.wins; $('pcMis').textContent = p.missions; $('pcMat').textContent = p.matches;
  };
  chip.onclick = e => { e.stopPropagation(); sfx('click'); render(); card.classList.toggle('hidden'); };
  addEventListener('pointerdown', e => { if (!card.classList.contains('hidden') && !card.contains(e.target) && !chip.contains(e.target)) card.classList.add('hidden'); });
  addEventListener('keydown', e => { if (e.code === 'Escape') card.classList.add('hidden'); });
  addEventListener('progresschange', render); addEventListener('collectionchange', render);
  onNet?.('state', announce);
  render(); void levelOf;
}
