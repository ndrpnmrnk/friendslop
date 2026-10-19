import { M } from '../missions/missions.js';
import { cam } from '../game/camera.js';

const $ = id => document.getElementById(id);
export { $ };
export function pop(text, cls = 'good') {
  const d = document.createElement('div'); d.className = 'pop ' + cls; d.textContent = text; $('pops').appendChild(d); setTimeout(() => d.remove(), 1500);
}
const ARROW = '<svg viewBox="0 0 10 10" width="24" height="24"><path d="M5 0L9.5 9L5 6.8L0.5 9Z" fill="currentColor"/></svg>';
const CIRC = 150.8;
export function renderHud(S, P, prompt) {
  const tm = Math.max(0, Math.ceil(S.time));
  $('timer').textContent = `${Math.floor(tm / 60)}:${String(tm % 60).padStart(2, '0')}`;
  $('timer').classList.toggle('low', tm <= 15);
  $('score').textContent = S.score;
  $('missions').innerHTML = M.list.map(m => {
    const p = m.obj.pos(), dx = p.x - P.pos.x, dz = p.z - P.pos.z;
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = -fz, rz = fx;
    const dist = Math.round(Math.hypot(dx, dz)), ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz), timed = m.def.life > 0;
    const bar = timed ? `<div class="bar${m.life < 8 ? ' warn' : ''}"><i style="width:${Math.max(0, m.life / m.def.life * 100)}%"></i></div>` : '';
    return `<div class="mcard px d-${m.def.diff}${m.busy ? ' active' : ''}"><div class="mi">${m.def.icon}</div><div class="mt"><div class="mn">${m.def.name}</div>` +
      `<div class="ms"><span class="pts">${m.def.points}</span> · ${dist} м · ${m.where}${timed ? '' : ' · без таймера'}</div>${bar}</div>` +
      `<div class="arr" style="transform:rotate(${ang}rad)">${ARROW}</div></div>`;
  }).join('');
  const pr = $('prompt');
  if (prompt) { pr.innerHTML = prompt; pr.classList.remove('hidden'); } else pr.classList.add('hidden');
}
export function renderStamina(P) {
  const st = $('stamina');
  $('staminaArc').style.strokeDashoffset = String(CIRC * (1 - P.stamina));
  st.classList.toggle('low', P.exhausted || P.stamina < 0.25);
  st.classList.toggle('full', P.stamina >= 1);
  const h = $('held');
  if (P.held) { h.innerHTML = `${P.held.def.icon} ${P.held.def.name}<small>ПКМ — бросок · E — положить</small>`; h.classList.remove('hidden'); }
  else h.classList.add('hidden');
}
