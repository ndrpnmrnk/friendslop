/* v0.66: плавное раскрытие разделов меню настроек. Высота анимируется самим браузером (Web Animations),
   <details> остаётся обычным элементом: клавиатура и экранные дикторы работают как раньше. */
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function initSettingsPanel(root = document.getElementById('settings')) {
  if (!root) return;
  for (const d of root.querySelectorAll('details.settingsGroup')) {
    const summary = d.querySelector('summary'), body = d.querySelector('.sbody');
    if (!summary || !body) continue;
    let anim = null;
    summary.addEventListener('click', e => {
      if (reduce()) return;
      e.preventDefault(); anim?.cancel();
      const opening = !d.open, start = opening ? 0 : body.offsetHeight;
      if (opening) d.open = true;
      const end = opening ? body.scrollHeight : 0;
      anim = body.animate([{ height: start + 'px', opacity: opening ? 0 : 1 }, { height: end + 'px', opacity: opening ? 1 : 0 }],
        { duration: Math.min(320, 140 + end * .35 || 180), easing: 'cubic-bezier(.2,.8,.2,1)' });
      anim.onfinish = () => { anim = null; if (!opening) d.open = false;
        // Открытый снизу раздел плавно подтягивается в видимую область.
        if (opening) { const box = d.closest('.setScroll'), r = d.getBoundingClientRect(), b = box?.getBoundingClientRect();
          if (box && b && r.bottom > b.bottom) box.scrollTo({ top: box.scrollTop + Math.min(r.bottom - b.bottom + 12, r.top - b.top - 8), behavior: 'smooth' }); } };
    });
  }
}
// При каждом открытии меню - к началу списка.
export const resetSettingsScroll = (root = document.getElementById('settings')) => { const box = root?.querySelector('.setScroll'); if (box) box.scrollTop = 0; };
