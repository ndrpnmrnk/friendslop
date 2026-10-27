/* v0.57 — инструменты для тестов автора.
   F3 — счётчик производительности: FPS, 1% low (худший 1% кадров), время кадра по системам, вызовы отрисовки.
   F8 — отчёт о баге: скриншот + место на карте, район, версия, состояние, FPS — одной картинкой (PNG скачивается,
        текст копируется в буфер). Автор присылает картинку — сразу видно, где и что. */
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const now = () => performance.now();
// ---------- профилировщик кадра ----------
const P = { on: false, t0: 0, last: 0, cur: {}, sum: {}, frames: [], n: 0, acc: 0, el: null, info: null };
export const prof = {
  frameStart() { P.t0 = P.last = now(); P.cur = {}; },
  // время с прошлой отметки записывается на систему name
  mark(name) { if (!P.t0) return; const t = now(); P.cur[name] = (P.cur[name] || 0) + t - P.last; P.last = t; },
  frameEnd(dt, renderer) {
    if (!P.t0) return; if (renderer) { renderer.info.autoReset = false; const ri0 = renderer.info.render; P.calls = (P.calls || 0) + ri0.calls; P.tris = (P.tris || 0) + ri0.triangles; renderer.info.reset(); } const total = now() - P.t0; P.t0 = 0;
    P.frames.push(dt * 1000); if (P.frames.length > 600) P.frames.shift();
    for (const k in P.cur) P.sum[k] = (P.sum[k] || 0) + P.cur[k]; P.sum.__cpu = (P.sum.__cpu || 0) + total; P.n++;
    P.acc += dt; if (!P.on || P.acc < .5) return;
    const f = P.frames.slice().sort((a, b) => b - a), avg = P.frames.reduce((a, b) => a + b, 0) / P.frames.length, low = f[Math.max(0, Math.floor(f.length * .01) - 1)] || avg;
    const ri = renderer?.info, rows = Object.entries(P.sum).filter(([k]) => k !== '__cpu').sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.padEnd(10)} ${(v / P.n).toFixed(2)} мс`);
    P.el.textContent = `FPS ${Math.round(1000 / avg)}  ·  1% low ${Math.round(1000 / low)}\nкадр ${avg.toFixed(1)} мс  ·  JS ${(P.sum.__cpu / P.n).toFixed(2)} мс\n` +
      (ri ? `отрисовок ${Math.round(P.calls / P.n)}  ·  треуг. ${(P.tris / P.n / 1000).toFixed(0)}k\nшейдеров ${ri.programs?.length || 0}  ·  текстур ${ri.memory.textures}\n` : '') + '— по системам —\n' + rows.join('\n');
    P.acc = 0; P.sum = {}; P.n = 0; P.calls = 0; P.tris = 0;
  },
  get fps() { const avg = P.frames.reduce((a, b) => a + b, 0) / Math.max(1, P.frames.length); return Math.round(1000 / Math.max(1, avg)); },
  get low() { const f = P.frames.slice().sort((a, b) => b - a); return Math.round(1000 / Math.max(1, f[Math.max(0, Math.floor(f.length * .01) - 1)] || 16)); },
};
function toggleProf() { P.on = !P.on; if (!P.el) { P.el = document.createElement('pre'); P.el.id = 'perfHud'; document.body.appendChild(P.el); } P.el.classList.toggle('hidden', !P.on); P.acc = 1; }
// ---------- отчёт о баге ----------
let getInfo = () => ({}), pending = null, unlockFn = () => {};
export function initDevtools(opts) { getInfo = opts.info; unlockFn = opts.unlock || unlockFn;
  addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); toggleProf(); } else if (e.code === 'F8') { e.preventDefault(); if (!document.getElementById('bugModal')) pending = true; } }, true); }
// вызывается сразу после отрисовки кадра: буфер ещё не очищен — можно снять скриншот
export function afterRender(canvas) { if (!pending) return; pending = null; let shot = null; try { shot = canvas.toDataURL('image/png'); } catch (_) {} openReport(shot); }
function infoText(extra = '') {
  const i = getInfo(), d = new Date(), pad = n => String(n).padStart(2, '0');
  const lines = [`Friendslop v${VERSION} · ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
    `Состояние: ${i.state || '?'}${i.mode ? ' · режим ' + i.mode : ''}${i.mission ? ' · миссия ' + i.mission : ''}`,
    `Район: ${i.district || '—'} · позиция ${i.pos || '—'} · камера ${i.cam || '—'}`,
    `В руках: ${i.held || '—'}${i.ride ? ' · едет: ' + i.ride : ''} · FPS ${prof.fps} (1% low ${prof.low}) · графика ${i.quality || '?'}`,
    `GPU: ${i.gpu || '?'}`, i.error ? `Последняя ошибка: ${i.error}` : ''].filter(Boolean);
  if (extra) lines.push('Комментарий: ' + extra);
  return lines;
}
function openReport(shot) {
  unlockFn();
  const m = document.createElement('div'); m.id = 'bugModal';
  m.innerHTML = `<div class="bm-card"><b>ОТЧЁТ О БАГЕ</b><img alt=""><textarea maxlength="300" placeholder="Что пошло не так? (можно пусто)"></textarea><div class="bm-row"><button class="bm-save">Сохранить картинку</button><button class="bm-cancel">Отмена</button></div><small>Картинка скачается в папку загрузок — пришли её Claude. Текст отчёта ещё и скопирован.</small></div>`;
  document.body.appendChild(m); const img = m.querySelector('img'); if (shot) img.src = shot; else img.remove();
  const ta = m.querySelector('textarea'); setTimeout(() => ta.focus(), 30);
  const close = () => m.remove();
  m.querySelector('.bm-cancel').onclick = close;
  m.addEventListener('keydown', e => { e.stopPropagation(); if (e.code === 'Escape') close(); });
  m.querySelector('.bm-save').onclick = async () => {
    const lines = infoText(ta.value.trim()), text = lines.join('\n');
    try { await navigator.clipboard?.writeText(text); } catch (_) {}
    const out = document.createElement('canvas'), W = 1280; let H = 720, im = null;
    if (shot) { im = new Image(); im.src = shot; await new Promise(r => { im.onload = r; im.onerror = r; }); H = Math.round(W * (im.height || 9) / (im.width || 16)); }
    const pad = 16, lh = 22; out.width = W; out.height = H + pad * 2 + lines.length * lh; const g = out.getContext('2d');
    g.fillStyle = '#120e1e'; g.fillRect(0, 0, out.width, out.height); if (im?.width) g.drawImage(im, 0, 0, W, H);
    g.fillStyle = '#f4ecdc'; g.font = '16px Rubik, Arial, sans-serif'; lines.forEach((l, k) => g.fillText(l, pad, H + pad + 16 + k * lh));
    const a = document.createElement('a'), d = new Date(); a.download = `friendslop-bug-v${VERSION}-${d.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`; a.href = out.toDataURL('image/png'); a.click(); close();
  };
}
