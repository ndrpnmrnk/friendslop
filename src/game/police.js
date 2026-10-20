import { THREE, G, V3, col, lam, glow, compose } from '../core/gfx.js';
import { W } from '../world/state.js';
import { groundAt, pushOut, addSolid } from '../world/physics.js';
import { burst, smokeRing } from '../world/particles.js';
import { sfx } from '../core/sfx.js';
import { actors } from './actors.js';

/* Полицейский жетон: ЛКМ — вызвать наряд (двое полицейских прибегают и ходят за тобой 25 с).
   Брось жетон (ПКМ) и попади в соперника — наряд бежит к нему и сажает в клетку на 20 с.
   Из клетки можно выбраться раньше: E — головоломка «замок клетки» (повтори стрелки по порядку). */
export const POL = { cops: [], cages: [], ui: null };
export function resetPolice() { for (const c of POL.cops) W.group.remove(c.g); for (const k of POL.cages) release(k, true); POL.cops = []; POL.cages = []; closeCageUI(); }

function copModel() {
  return compose('cop', a => { const blue = lam({ color: 0x2a3a7a }, 'copBlue'), skin = lam({ color: 0xe8b890 }, 'copSkin'), dk = col(0x17111f);
    a(G.cyl8, blue, 0, 0.75, 0, 0.32, 0.8, 0.26); a(G.box, dk, 0, 0.36, 0, 0.5, 0.12, 0.3); a(G.box, dk, -0.12, 0.17, 0, 0.14, 0.34, 0.16); a(G.box, dk, 0.12, 0.17, 0, 0.14, 0.34, 0.16);
    a(G.sph10, skin, 0, 1.35, 0, 0.26, 0.26, 0.26); a(G.cyl8, blue, 0, 1.58, 0, 0.28, 0.12, 0.28); a(G.box, dk, 0, 1.53, 0.18, 0.4, 0.03, 0.16); a(G.box, glow(0xf5c542), 0, 1.6, 0.27, 0.07, 0.07, 0.02);
    a(G.box, glow(0xf5c542), 0.12, 0.95, 0.27, 0.07, 0.08, 0.02); for (const sx of [-0.08, 0.08]) a(G.box, dk, sx, 1.38, 0.25, 0.04, 0.05, 0.02); a(G.box, col(0xff5a6e), -0.36, 0.85, 0, 0.1, 0.5, 0.1); a(G.box, col(0x4ab0f0), 0.36, 0.85, 0, 0.1, 0.5, 0.1); });
}
export function callPolice(owner) {
  for (let i = 0; i < 2; i++) { const g = copModel(); const a = Math.random() * 6.28, x = owner.pos.x + Math.cos(a) * 6, z = owner.pos.z + Math.sin(a) * 6; g.position.set(x, groundAt(x, z, 0.2, owner.pos.y + 1), z); W.group.add(g); W.keep.push(g);
    POL.cops.push({ g, pos: g.position, owner, mode: 'follow', t: 25, ph: Math.random() * 6, side: i ? 1 : -1, target: null });
    smokeRing(x, g.position.y + 0.1, z, 8, { speed: 2 }); }
  sfx('whistle'); setTimeout(() => sfx('alarm', { v: 0.4 }), 300);
}
export const hasPolice = owner => POL.cops.some(c => c.owner === owner && c.mode !== 'leave');
// жетон попал: наряд хозяина бежит арестовывать
export function arrest(target, owner) {
  if (target.caged || target === owner) return false;
  const cops = POL.cops.filter(c => c.owner === owner && c.mode !== 'leave'); if (!cops.length) return false;
  for (const c of cops) { c.mode = 'chase'; c.target = target; c.t = 12; }
  sfx('whistle', { at: target.pos }); return true;
}
function cage(target, by) {
  const g = compose('cage', a => { const m = col(0x8a8d98); for (let i = 0; i < 12; i++) { const an = i / 12 * 6.28; a(G.box, m, Math.cos(an) * 0.6, 1.1, Math.sin(an) * 0.6, 0.05, 2.2, 0.05); } a(G.cyl12, m, 0, 2.2, 0, 0.66, 0.08, 0.66); a(G.cyl12, m, 0, 0.04, 0, 0.66, 0.08, 0.66); a(G.box, glow(0xff5a6e), 0, 2.3, 0, 0.12, 0.08, 0.12); });
  g.position.set(target.pos.x, target.pos.y, target.pos.z); W.group.add(g); W.keep.push(g);
  const k = { g, a: target, t: 20, x: target.pos.x, y: target.pos.y, z: target.pos.z, by };
  target.caged = k; target.vel.set(0, 0, 0); if (target.held) { target.held.state = 'rest'; target.held = null; } POL.cages.push(k);
  burst(k.x, k.y + 1.2, k.z, 14, { color: 0x8a8d98, size: 0.16, speed: 2.5, up: 2 }); sfx('door', { at: target.pos }); sfx('bell', { at: target.pos, v: 0.6 });
  W.onArrest && W.onArrest(target, by);
}
function release(k, silent) {
  W.group.remove(k.g); if (k.a.caged === k) k.a.caged = null; POL.cages = POL.cages.filter(q => q !== k);
  if (!silent) { burst(k.x, k.y + 1.2, k.z, 12, { color: 0xf5c542, size: 0.14, speed: 3, up: 2 }); sfx('pop', { at: k.a.pos }); }
  if (k.a === W.player) closeCageUI();
}
export function updatePolice(dt, t) {
  for (const c of POL.cops.slice()) {
    c.t -= dt; let goal = null, sp = 6.5;
    if (c.mode === 'follow') { const f = c.owner.root ? c.owner.root.rotation.y : 0; goal = new V3(c.owner.pos.x - Math.sin(f) * 2 + Math.cos(f) * c.side * 1.3, c.owner.pos.y, c.owner.pos.z - Math.cos(f) * 2 - Math.sin(f) * c.side * 1.3); if (c.t <= 0) c.mode = 'leave'; }
    else if (c.mode === 'chase') { const tg = c.target; if (!tg || tg.caged || c.t <= 0) { c.mode = 'leave'; c.t = 3; } else { goal = tg.pos; sp = 9;
        if (Math.hypot(tg.pos.x - c.pos.x, tg.pos.z - c.pos.z) < 1.1 && Math.abs(tg.pos.y - c.pos.y) < 1.5 && !tg.hidden) { cage(tg, c.owner); for (const o of POL.cops) if (o.target === tg) { o.mode = 'leave'; o.t = 2.5; } } } }
    if (c.mode === 'leave') { c.t -= dt; c.g.position.y += dt * 0.5; c.g.scale.multiplyScalar(1 - dt * 0.8); if (c.t <= 0 || c.g.scale.x < 0.2) { smokeRing(c.pos.x, c.pos.y + 0.1, c.pos.z, 6, { speed: 1.5 }); W.group.remove(c.g); POL.cops.splice(POL.cops.indexOf(c), 1); } continue; }
    if (goal) { const dx = goal.x - c.pos.x, dz = goal.z - c.pos.z, d = Math.hypot(dx, dz); if (d > 0.4) { const k = Math.min(d, sp * dt); c.pos.x += dx / d * k; c.pos.z += dz / d * k; c.g.rotation.y = Math.atan2(dx, dz); c.ph += dt * 12; }
      pushOut(c.pos, 0.35, c.pos.y + 0.3, c.pos.y + 1.6); c.pos.y = groundAt(c.pos.x, c.pos.z, 0.2, c.pos.y + 0.6); c.g.position.y = c.pos.y + Math.abs(Math.sin(c.ph)) * 0.08; }
  }
  for (const k of POL.cages.slice()) {
    k.t -= dt; k.a.pos.set(k.x, k.y, k.z); k.a.vel.set(0, 0, 0);
    // бот иногда сам вскрывает замок
    if (k.a.bot && k.t < 12 && Math.random() < dt * 0.08) k.t = 0;
    if (k.t <= 0) release(k);
  }
  if (POL.ui) drawCageUI();
}

/* ---------- головоломка «замок клетки»: повтори 6 стрелок по порядку ---------- */
const AR = { ArrowUp: '▲', ArrowDown: '▼', ArrowLeft: '◀', ArrowRight: '▶', KeyW: '▲', KeyS: '▼', KeyA: '◀', KeyD: '▶' };
const SEQ = ['▲', '▼', '◀', '▶'];
export function openCageUI() {
  if (POL.ui || !W.player.caged) return;
  const ui = document.createElement('div'); ui.id = 'cageui'; ui.className = 'mgui'; document.body.appendChild(ui);
  POL.ui = { ui, seq: [...Array(6)].map(() => SEQ[(Math.random() * 4) | 0]), i: 0, onKey: null };
  POL.ui.onKey = e => { const v = AR[e.code]; if (!v || !POL.ui) return; const u = POL.ui;
    if (v === u.seq[u.i]) { u.i++; sfx('click'); if (u.i >= u.seq.length) { const k = W.player.caged; sfx('done'); if (k) release(k); } }
    else { u.i = 0; sfx('alarm', { v: 0.3 }); ui.classList.remove('shake'); void ui.offsetWidth; ui.classList.add('shake'); }
    drawCageUI(); };
  addEventListener('keydown', POL.ui.onKey); drawCageUI();
}
function drawCageUI() { const u = POL.ui; if (!u) return; const k = W.player.caged;
  u.ui.innerHTML = `<div class="wt">КЛЕТКА · ${k ? Math.ceil(k.t) : 0} с</div><div class="cq">${u.seq.map((s, i) => `<b class="${i < u.i ? 'ok' : i === u.i ? 'cur' : ''}">${s}</b>`).join('')}</div><div class="ws">Жми стрелки (или WASD) по порядку — вскроешь замок</div>`; }
export function closeCageUI() { if (!POL.ui) return; removeEventListener('keydown', POL.ui.onKey); POL.ui.ui.remove(); POL.ui = null; }
void addSolid; void actors;
