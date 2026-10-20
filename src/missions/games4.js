import { THREE, G, V3, mesh, col, tmat, lam, glow, compose, sprite } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid, isFree, groundAt } from '../world/physics.js';
import { burst, puff } from '../world/particles.js';
import { sfx } from '../core/sfx.js';

/* v0.16 — пять новых миссий «руками»:
   leaves   — Золотой билет: разгребаешь кучу листьев мышью, ищешь билет среди мусора (панель, 3D).
   graffiti — Граффити по трафарету: закрась силуэт на стене баллончиком, не вылезая за край (панель, 3D).
   intercom — Код домофона: цифры кода спрятаны по району на табличках — собери и введи (уличная + панель).
   lockpick — Отмычка: найди «сладкую точку» и проверни замок, пока не сломал все отмычки (панель).
   pipes    — Трубы: поворачивай секции, чтобы вода дошла от входа до выхода (панель). */

// объект миссии стоит в точке x,y,z лицом по f; общий каркас
function place(x, y, z, f, build, foot, h, reach = 1.9) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(f[0], f[1]); W.group.add(g); build(g);
  const along = f[0] === 0, fw = along ? foot[0] : foot[1], fd = along ? foot[1] : foot[0];
  const s = addSolid(x - fw / 2, z - fd / 2, x + fw / 2, z + fd / 2, y, y + h);
  return { g, f, solid: s, reach, pos: () => g.position, front: () => new V3(x + f[0] * (foot[1] / 2 + 0.7), y, z + f[1] * (foot[1] / 2 + 0.7)), dispose() { W.group.remove(g); s.on = false; } };
}
const LEAF = [0xc9662a, 0xa8452a, 0xe89a3a, 0xb8782a, 0x8a5a2a];

/* ---------- объекты ---------- */
export function buildLeafPile(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('leafMound', a => { for (let i = 0; i < 9; i++) { const an = i / 9 * 6.28, r = i ? 0.55 : 0; a(G.sph, lam({ color: LEAF[i % 5] }, 'leafM' + (i % 5)), Math.cos(an) * r, 0.18, Math.sin(an) * r, 0.5, 0.25, 0.5); }
    a(G.box, tmat(T.sign('ИЩИ!', '#c9662a', '#17111f')), 0, 0.55, 0.9, 0.5, 0.18, 0.02); a(G.box, col(0x6a4a2a), 0, 0.25, 0.9, 0.05, 0.5, 0.05); })), [1.8, 1.8], 0.3, 2.1);
  o.type = 'leaves'; return o;
}
export function buildGraffitiWall(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('grafWall', a => { const c = tmat(T.concrete()); a(G.box, c, 0, 1.0, 0, 2.6, 2.0, 0.22); a(G.box, col(0x3a3440), 0, 2.03, 0, 2.7, 0.08, 0.3);
    for (const [cx, cc] of [[-0.6, 0xff5a6e], [-0.4, 0x4ab0f0], [0.5, 0xf5c542]]) { a(G.cyl8, col(cc), cx, 0.12, 0.45, 0.06, 0.24, 0.06); a(G.cyl8, col(0xd8d8e0), cx, 0.26, 0.45, 0.03, 0.05, 0.03); } })), [2.7, 0.4], 2.05, 2.2);
  o.type = 'graffiti'; return o;
}
export function buildIntercom(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('intercom', a => { a(G.box, col(0x3a3440), 0, 0.7, 0, 0.3, 1.4, 0.25); a(G.box, col(0x8a8d98), 0, 1.15, 0.13, 0.26, 0.4, 0.02);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) a(G.box, glow(0x9be36b), -0.07 + c * 0.07, 1.25 - r * 0.07, 0.145, 0.04, 0.04, 0.01);
    a(G.box, tmat(T.sign('ДОМОФОН', '#2a5a8a', '#f1e8ff')), 0, 1.5, 0.13, 0.3, 0.08, 0.01); })), [0.4, 0.4], 1.4, 1.6);
  o.type = 'intercom'; return o;
}
export function buildChest(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('lockChest', a => { const w = tmat(T.wood()), m = col(0x4a4458); a(G.box, w, 0, 0.3, 0, 1.0, 0.6, 0.6); a(G.box, w, 0, 0.66, 0, 1.02, 0.14, 0.62);
    for (const sx of [-0.35, 0.35]) a(G.box, m, sx, 0.4, 0, 0.08, 0.82, 0.64); a(G.box, col(0xd8a030), 0, 0.42, 0.33, 0.16, 0.18, 0.06); a(G.box, col(0x17111f), 0, 0.4, 0.365, 0.03, 0.07, 0.01); })), [1.1, 0.7], 0.75, 1.6);
  o.type = 'chest'; return o;
}
export function buildValve(x, y, z, f) {
  const o = place(x, y, z, f, g => g.add(compose('valveBox', a => { const r = tmat(T.rust()), m = col(0x4a6a8a);
    a(G.cyl8, r, -0.6, 0.5, 0, 0.12, 1.0, 0.12); a(G.cyl8, r, 0.6, 0.5, 0, 0.12, 1.0, 0.12); a(G.cyl8, r, 0, 0.9, 0, 0.1, 1.2, 0.1, 0, 0, Math.PI / 2);
    a(G.box, m, 0, 0.55, 0, 0.6, 0.6, 0.35); a(G.cyl12, col(0xd8243a), 0, 0.6, 0.22, 0.2, 0.04, 0.2, Math.PI / 2); a(G.box, tmat(T.sign('ВОДА', '#4a6a8a', '#f1e8ff')), 0, 0.95, 0.18, 0.3, 0.08, 0.01); })), [1.5, 0.5], 1.0, 1.7);
  o.type = 'valve'; return o;
}

/* ---------- общие помощники ---------- */
const HIT = new V3(), PL = new THREE.Plane();
const onPlaneY = (ray, y) => { PL.set(new V3(0, 1, 0), -y); return ray.ray.intersectPlane(PL, HIT) ? HIT.clone() : null; };
function overlay(id, title, hint, w = 300, h = 300) {
  const ui = document.createElement('div'); ui.id = id; ui.className = 'mgui';
  ui.innerHTML = `<div class="wt">${title}</div><canvas width="${w}" height="${h}"></canvas><div class="ws">${hint}</div>`; document.body.appendChild(ui);
  const cv = ui.querySelector('canvas'); return { ui, cv, g: cv.getContext('2d') };
}
// случайная точка в зонах «пол» в стороне от p (для табличек кода)
function farFloor(p, a, b) {
  const zs = W.missionZones.filter(z => z.type === 'floor' && Math.abs(z.y - p.y) < 0.4);
  for (let t = 0; t < 80 && zs.length; t++) { const z = zs[(Math.random() * zs.length) | 0], x = z.x0 + Math.random() * (z.x1 - z.x0), zz = z.z0 + Math.random() * (z.z1 - z.z0), d = Math.hypot(x - p.x, zz - p.z);
    if (d < a || d > b || !isFree(x - 0.4, zz - 0.4, x + 0.4, zz + 0.4, z.y + 0.05, z.y + 1.6)) continue; return new V3(x, groundAt(x, zz, 0.2, z.y + 0.4), zz); }
  return new V3(p.x + a, p.y, p.z);
}

/* ---------- панельные игры ---------- */
export const PANEL4 = {
  // Золотой билет: ЛКМ и веди — листья разлетаются; клик по находке — что это?
  leaves(o, api, ctx) {
    const c = o.pos(), F = new V3(o.f[0], 0, o.f[1]);
    api.pose(c.clone().addScaledVector(F, 1.35).add(new V3(0, 1.75, 0)), c.clone().add(new V3(0, 0.1, 0)));
    o.g.visible = false; ctx.cursor(false);
    const grp = new THREE.Group(); grp.position.copy(c); W.group.add(grp);
    const JUNK = [['носок', 0xf1e8ff], ['жёлудь', 0x8a5a2a], ['банка', 0xc83a3a], ['пуговица', 0x4ab0f0], ['фантик', 0x9be36b]];
    const finds = [];
    const spot = () => { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.7; return [Math.cos(a) * r, Math.sin(a) * r]; };
    for (const [name, cl] of JUNK) { const [x, z] = spot(); const m = mesh(G.box, col(cl), x, 0.03, z, 0.14, 0.05, 0.1, grp); m.rotation.y = Math.random() * 3; finds.push({ m, name, x, z }); }
    { const [x, z] = spot(); const m = mesh(G.box, lam({ color: 0xf5c542, emissive: 0x6a4a00, emissiveIntensity: 0.6 }, 'ticket'), x, 0.03, z, 0.2, 0.02, 0.11, grp); m.rotation.y = Math.random() * 3; finds.push({ m, name: 'БИЛЕТ', x, z, gold: true }); }
    // листья — слоями, по ним видно, что куча толстая
    const leaves = [];
    for (let i = 0; i < 110; i++) { const [x, z] = spot(); const m = mesh(G.box, lam({ color: LEAF[i % 5] }, 'leafM' + (i % 5)), x * 1.15, 0.06 + Math.random() * 0.28, z * 1.15, 0.16, 0.012, 0.11, grp);
      m.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 6, (Math.random() - 0.5) * 0.6); leaves.push({ m, v: null }); }
    let down = false, time = 35, endT = -1, rust = 0;
    api.progress(0); api.msg('Зажми ЛКМ и разгребай. Кликни по находке');
    const covered = f => leaves.some(l => !l.v && Math.hypot(l.m.position.x - f.x, l.m.position.z - f.z) < 0.12);
    return {
      down(ray) { down = true; const h = ray.intersectObjects(finds.map(f => f.m)); if (h.length) { const f = finds.find(q => q.m === h[0].object); if (f && !covered(f)) {
        if (f.gold) { api.msg('ЗОЛОТОЙ БИЛЕТ!', 'good'); sfx('done'); burst(c.x + f.x, c.y + 0.2, c.z + f.z, 14, { color: 0xf5c542, size: 0.08, speed: 2, up: 2 }); endT = 1.0; }
        else { api.msg(`Это ${f.name}…`, 'bad'); sfx('drop'); f.m.position.y = 0.5; f.m.visible = false; } } } },
      up() { down = false; },
      move(ray) { if (!down) return; const p = onPlaneY(ray, c.y + 0.2); if (!p) return; const lx = p.x - c.x, lz = p.z - c.z;
        for (const l of leaves) { if (l.v) continue; const dx = l.m.position.x - lx, dz = l.m.position.z - lz, d = Math.hypot(dx, dz); if (d < 0.22) { l.v = new V3(dx / (d || 1) * (2 + Math.random() * 2), 2 + Math.random() * 2, dz / (d || 1) * (2 + Math.random() * 2)); rust -= 1; } }
        if (rust < 0) { rust = 6; sfx('step', { surf: 'grass', v: 0.8 }); } },
      update(dt) {
        time -= dt; if (endT < 0 && time <= 0) return api.finish({ success: false });
        for (const l of leaves) if (l.v) { l.v.y -= 9 * dt; l.m.position.addScaledVector(l.v, dt); l.m.rotation.x += dt * 8; if (l.m.position.y < -0.3) l.m.visible = false; }
        api.progress(leaves.filter(l => l.v).length / leaves.length);
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 0.8 + Math.max(0, time) / 35 * 0.4 }); }
      },
      stop() { W.group.remove(grp); o.g.visible = true; ctx.cursor(true); },
    };
  },

  // Граффити: зажми ЛКМ и закрась силуэт; за край — клякса (меньше очков)
  graffiti(o, api, ctx) {
    const c = o.pos(), F = new V3(o.f[0], 0, o.f[1]), CW = 88, CH = 60;
    const mid = c.clone().add(new V3(0, 1.0, 0)).addScaledVector(F, 0.12);
    api.pose(mid.clone().addScaledVector(F, 2.2).add(new V3(0, 0.15, 0)), mid.clone()); ctx.cursor(false);
    // трафарет: случайный силуэт
    const mk = document.createElement('canvas'); mk.width = CW; mk.height = CH; const mg = mk.getContext('2d'); mg.fillStyle = '#fff';
    const SH = {
      pumpkin: () => { mg.beginPath(); mg.ellipse(44, 34, 24, 19, 0, 0, 7); mg.fill(); mg.fillRect(41, 8, 6, 10); },
      ghost: () => { mg.beginPath(); mg.arc(44, 26, 17, Math.PI, 0); mg.lineTo(61, 52); for (let i = 0; i < 4; i++) mg.lineTo(61 - (i + 0.5) * 8.5, i % 2 ? 52 : 46); mg.lineTo(27, 52); mg.closePath(); mg.fill(); },
      cat: () => { mg.beginPath(); mg.arc(44, 34, 18, 0, 7); mg.fill(); mg.beginPath(); mg.moveTo(28, 26); mg.lineTo(30, 6); mg.lineTo(42, 18); mg.fill(); mg.beginPath(); mg.moveTo(60, 26); mg.lineTo(58, 6); mg.lineTo(46, 18); mg.fill(); },
      star: () => { mg.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 10 : 25; mg.lineTo(44 + Math.cos(a) * r, 31 + Math.sin(a) * r); } mg.fill(); },
      bat: () => { mg.beginPath(); mg.ellipse(44, 32, 8, 11, 0, 0, 7); mg.fill(); mg.beginPath(); mg.moveTo(40, 28); mg.lineTo(14, 18); mg.lineTo(20, 32); mg.lineTo(26, 30); mg.lineTo(30, 40); mg.lineTo(40, 36); mg.fill(); mg.beginPath(); mg.moveTo(48, 28); mg.lineTo(74, 18); mg.lineTo(68, 32); mg.lineTo(62, 30); mg.lineTo(58, 40); mg.lineTo(48, 36); mg.fill(); },
    };
    const keys = Object.keys(SH), shape = keys[(Math.random() * keys.length) | 0]; SH[shape]();
    const mask = mg.getImageData(0, 0, CW, CH).data, inside = new Uint8Array(CW * CH); let total = 0;
    for (let i = 0; i < CW * CH; i++) if (mask[i * 4 + 3] > 128) { inside[i] = 1; total++; }
    const paint = new Uint8Array(CW * CH); let pin = 0, pout = 0;
    const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const g = cv.getContext('2d');
    const COL = ['#ff5a6e', '#4ab0f0', '#f5c542', '#9be36b', '#b18cff'][(Math.random() * 5) | 0];
    // стена: бетон + пунктирный контур трафарета
    g.fillStyle = '#6a6478'; g.fillRect(0, 0, CW, CH); for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < 0.5 ? '#5e586c' : '#77708a'; g.fillRect((Math.random() * CW) | 0, (Math.random() * CH) | 0, 1, 1); }
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const i = y * CW + x; if (!inside[i]) continue; const edge = !inside[i - 1] || !inside[i + 1] || !inside[i - CW] || !inside[i + CW]; if (edge && (x + y) % 3 !== 0) { g.fillStyle = '#f1e8ff'; g.fillRect(x, y, 1, 1); } else if (!edge && (x + y) % 6 === 0) { g.fillStyle = 'rgba(241,232,255,.25)'; g.fillRect(x, y, 1, 1); } }
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshBasicMaterial({ map: tex })); board.position.copy(mid); board.lookAt(mid.clone().add(F)); W.group.add(board);
    let down = false, time = 30, endT = -1, sprayT = 0;
    api.progress(0); api.msg(`Закрась: ${({ pumpkin: 'тыква', ghost: 'призрак', cat: 'кот', star: 'звезда', bat: 'летучая мышь' })[shape]}. Не вылезай за край`);
    const spray = ray => { const h = ray.intersectObject(board); if (!h.length || !h[0].uv) return; const u = h[0].uv.x * CW, v = (1 - h[0].uv.y) * CH;
      for (let k = 0; k < 26; k++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 3.6, x = Math.floor(u + Math.cos(a) * r), y = Math.floor(v + Math.sin(a) * r); if (x < 0 || y < 0 || x >= CW || y >= CH) continue;
        const i = y * CW + x; if (!paint[i]) { paint[i] = 1; if (inside[i]) pin++; else pout++; } g.fillStyle = COL; g.fillRect(x, y, 1, 1); }
      tex.needsUpdate = true; sprayT -= 1; if (sprayT <= 0) { sprayT = 8; sfx('spray', { v: 0.5 }); }
      if (Math.random() < 0.3) puff(h[0].point.x, h[0].point.y, h[0].point.z, { color: parseInt(COL.slice(1), 16), size: 0.12, vx: F.x, vz: F.z, vy: 0.2, life: 0.4, grow: 1.5, opacity: 0.5 }); };
    return {
      down(ray) { down = true; spray(ray); }, up() { down = false; }, move(ray) { if (down && endT < 0) spray(ray); },
      update(dt) { time -= dt; const k = pin / total; api.progress(Math.min(1, k / 0.8));
        if (endT < 0 && k >= 0.8) { const out = pout / total; endT = 1.0; api.msg(out < 0.15 ? 'Чисто! Как по трафарету' : 'Готово, но с кляксами', out < 0.15 ? 'good' : ''); sfx('done'); }
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: Math.max(0.5, 1.1 - (pout / total) * 1.5) }); return; }
        if (time <= 0) api.finish({ success: false }); },
      stop() { W.group.remove(board); tex.dispose(); ctx.cursor(true); },
    };
  },

  // Код домофона — ввод: кнопки 0–9, сброс; найденные цифры подсказаны сверху
  keypad(o, api, ctx) {
    const c = o.pos(), F = new V3(o.f[0], 0, o.f[1]); api.pose(c.clone().addScaledVector(F, 1.0).add(new V3(0, 1.35, 0)), c.clone().add(new V3(0, 1.15, 0)));
    const ui = document.createElement('div'); ui.id = 'keyui'; ui.className = 'mgui'; document.body.appendChild(ui);
    let entry = '', endT = -1;
    const render = () => { ui.innerHTML = `<div class="wt">ДОМОФОН</div><div class="kd">${(entry + '___').slice(0, 3).split('').join(' ')}</div><div class="kh">Найдено: ${o.code.join(' ')}</div><div class="kg">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>`; };
    render(); api.msg('Набери код из найденных цифр');
    ui.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (!b || endT > 0) return; const k = b.dataset.k; sfx('click');
      if (k === 'C') entry = ''; else if (k === '✓') { if (entry === o.code.join('')) { api.msg('Дверь открыта!', 'good'); sfx('bell'); endT = 0.9; } else { api.msg('Неверный код', 'bad'); sfx('alarm', { v: 0.4 }); entry = ''; } }
      else if (entry.length < 3) entry += k; render(); });
    return { update(dt) { if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } }, stop() { ui.remove(); } };
  },

  // Отмычка: двигай мышью — угол отмычки; зажми ЛКМ — проворачивай замок. Не там — замок упирается, отмычка трещит
  lockpick(o, api, ctx) {
    const c = o.pos(), F = new V3(o.f[0], 0, o.f[1]); api.pose(c.clone().addScaledVector(F, 1.1).add(new V3(0, 1.0, 0)), c.clone().add(new V3(0, 0.4, 0)));
    const { ui, cv, g } = overlay('lockui', 'ОТМЫЧКА', 'Води мышью — ищи точку. Зажми ЛКМ — проворачивай. Замок упёрся — отпусти, иначе сломаешь', 300, 220);
    const sweet = (Math.random() * 140 - 70) * Math.PI / 180, WIN = 7 * Math.PI / 180, ZONE = 40 * Math.PI / 180;
    let pick = 0, turn = 0, holding = false, strain = 0, picks = 3, endT = -1, shake = 0;
    const draw = () => {
      g.fillStyle = '#17111f'; g.fillRect(0, 0, 300, 220); const cx = 150, cy = 130;
      g.fillStyle = '#6a4a1a'; g.beginPath(); g.arc(cx, cy, 78, 0, 7); g.fill(); g.fillStyle = '#d8a030'; g.beginPath(); g.arc(cx, cy, 70, 0, 7); g.fill();
      g.fillStyle = '#b8862a'; g.beginPath(); g.arc(cx, cy, 44, 0, 7); g.fill();
      g.save(); g.translate(cx, cy); g.rotate(turn); g.fillStyle = '#17111f'; g.fillRect(-5, -26, 10, 34); g.beginPath(); g.arc(0, -26, 9, 0, 7); g.fill(); g.restore();
      const sh = holding && strain > 0 ? (Math.random() - 0.5) * 0.06 : 0;
      g.save(); g.translate(cx, cy); g.rotate(pick + sh - Math.PI / 2); g.fillStyle = '#c8c8d8'; g.fillRect(0, -2, 110, 4); g.fillStyle = '#8a8d98'; g.fillRect(100, -5, 12, 10); g.restore();
      g.font = '10px "Press Start 2P", monospace'; g.fillStyle = '#f1e8ff'; g.fillText('ОТМЫЧКИ', 10, 20); for (let i = 0; i < 3; i++) { g.fillStyle = i < picks ? '#c8c8d8' : '#3a3046'; g.fillRect(10 + i * 18, 30, 12, 4); }
    };
    const onMove = e => { if (endT > 0) return; const r = cv.getBoundingClientRect(), k = (e.clientX - r.left) / r.width; pick = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, (k - 0.5) * Math.PI)); };
    const onDown = () => { holding = true; }, onUp = () => { holding = false; };
    cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onDown); addEventListener('pointerup', onUp);
    api.progress(0); api.msg('Найди точку и проверни замок');
    return {
      update(dt) {
        if (endT > 0) { endT -= dt; draw(); if (endT <= 0) api.finish({ success: true, mult: 0.6 + picks * 0.15 }); return; }
        const off = Math.abs(pick - sweet), maxT = off < WIN ? Math.PI / 2 : Math.max(0, 1 - (off - WIN) / ZONE) * Math.PI / 2 * 0.85;
        if (holding) { turn = Math.min(maxT, turn + dt * 2.2); if (turn >= maxT - 0.01 && maxT < Math.PI / 2) { strain += dt; if (Math.random() < dt * 8) sfx('screw', { v: 0.3 }); } else strain = Math.max(0, strain - dt); }
        else { turn = Math.max(0, turn - dt * 3); strain = Math.max(0, strain - dt * 2); }
        if (strain > 1.1) { picks--; strain = 0; turn = 0; holding = false; sfx('glass', { v: 0.5 }); api.msg(picks ? 'Хрусть! Отмычка сломалась' : 'Все отмычки сломаны', 'bad'); if (!picks) return api.finish({ success: false }); }
        api.progress(turn / (Math.PI / 2));
        if (turn >= Math.PI / 2 - 0.01) { endT = 0.8; api.msg('Щёлк! Открыто', 'good'); sfx('done'); }
        draw();
      },
      stop() { ui.remove(); removeEventListener('pointerup', onUp); },
    };
  },

  // Трубы: клик — повернуть секцию на 90°. Вода течёт от входа (слева) до выхода (справа)
  pipes(o, api, ctx) {
    const c = o.pos(), F = new V3(o.f[0], 0, o.f[1]); api.pose(c.clone().addScaledVector(F, 1.3).add(new V3(0, 1.1, 0)), c.clone().add(new V3(0, 0.6, 0)));
    const N = 5, { ui, cv, g } = overlay('pipeui', 'ТРУБЫ', 'Кликай по секциям — поворачивай. Вода должна дойти до выхода'), CS = 300 / N;
    // биты выходов: 1 — верх, 2 — право, 4 — низ, 8 — лево
    const rot = m => ((m << 1) | (m >> 3)) & 15, grid = [], sy = (Math.random() * N) | 0;
    // путь решения: случайное блуждание слева направо
    let path; for (let t = 0; t < 200; t++) { path = [[0, sy]]; const seen = new Set(['0,' + sy]); let ok = false;
      for (let s = 0; s < 60; s++) { const [x, y] = path[path.length - 1]; if (x === N - 1 && s > 4) { ok = true; break; } const opts = [[x + 1, y], [x, y - 1], [x, y + 1], [x - 1, y]].filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(a + ',' + b));
        if (!opts.length) break; const nx = opts.sort(() => Math.random() - 0.5)[0]; path.push(nx); seen.add(nx.join(',')); }
      if (ok) break; }
    const dirBit = (a, b) => b[0] > a[0] ? 2 : b[0] < a[0] ? 8 : b[1] > a[1] ? 4 : 1, opp = b => ({ 1: 4, 4: 1, 2: 8, 8: 2 })[b];
    for (let y = 0; y < N; y++) { grid.push([]); for (let x = 0; x < N; x++) grid[y].push([3, 5, 7, 6, 11][(Math.random() * 5) | 0]); }
    path.forEach((p, i) => { let m = 0; m |= i === 0 ? 8 : opp(dirBit(path[i - 1], p)); m |= i === path.length - 1 ? 2 : dirBit(p, path[i + 1]); grid[p[1]][p[0]] = m; });
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = (Math.random() * 4) | 0; for (let k = 0; k < r; k++) grid[y][x] = rot(grid[y][x]); }
    const ey = path[path.length - 1][1]; let wet = new Set(), endT = -1;
    const flow = () => { wet = new Set(); if (!(grid[sy][0] & 8)) return false; const st = [[0, sy]]; wet.add('0,' + sy);
      while (st.length) { const [x, y] = st.pop(), m = grid[y][x]; for (const [b, dx, dy] of [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0]]) { if (!(m & b)) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; if (!(grid[ny][nx] & opp(b))) continue; const k = nx + ',' + ny; if (!wet.has(k)) { wet.add(k); st.push([nx, ny]); } } }
      return wet.has((N - 1) + ',' + ey) && (grid[ey][N - 1] & 2); };
    const draw = () => { g.fillStyle = '#17111f'; g.fillRect(0, 0, 300, 300);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const m = grid[y][x], cx = x * CS + CS / 2, cy = y * CS + CS / 2, w = wet.has(x + ',' + y), t = CS * 0.26;
        g.fillStyle = '#241b33'; g.fillRect(x * CS + 2, y * CS + 2, CS - 4, CS - 4);
        g.fillStyle = w ? '#4ab0f0' : '#8a8d98'; g.fillRect(cx - t / 2, cy - t / 2, t, t);
        if (m & 1) g.fillRect(cx - t / 2, y * CS, t, CS / 2); if (m & 4) g.fillRect(cx - t / 2, cy, t, CS / 2); if (m & 8) g.fillRect(x * CS, cy - t / 2, CS / 2, t); if (m & 2) g.fillRect(cx, cy - t / 2, CS / 2, t); }
      g.fillStyle = '#4ab0f0'; g.fillRect(0, sy * CS + CS / 2 - 8, 6, 16); g.fillStyle = '#9be36b'; g.fillRect(294, ey * CS + CS / 2 - 8, 6, 16); };
    cv.addEventListener('pointerdown', e => { if (endT > 0) return; const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * N);
      if (x < 0 || y < 0 || x >= N || y >= N) return; grid[y][x] = rot(grid[y][x]); sfx('screw', { v: 0.4 });
      if (flow()) { endT = 1.0; api.msg('Вода пошла!', 'good'); sfx('water'); } api.progress(Math.min(1, wet.size / path.length)); draw(); });
    if (flow()) { grid[sy][0] = rot(grid[sy][0]); flow(); }
    draw(); api.progress(0); api.msg('Соедини вход и выход');
    return { update(dt) { if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } }, stop() { ui.remove(); } };
  },
};

/* ---------- уличная часть «Кода домофона»: найти три таблички с цифрами ---------- */
export const WORLD4 = {
  intercom(o, api, ctx) {
    const P = ctx.player, c = o.pos(); o.code = [0, 0, 0].map(() => (Math.random() * 10) | 0);
    const plates = o.code.map((d, i) => { const p = farFloor(c, 6 + i * 3, 20 + i * 4), cv = document.createElement('canvas'); cv.width = 24; cv.height = 16; const g = cv.getContext('2d');
      g.fillStyle = '#17111f'; g.fillRect(0, 0, 24, 16); g.fillStyle = '#2a5a8a'; g.fillRect(1, 1, 22, 14); g.fillStyle = '#f1e8ff'; g.font = '10px monospace'; g.textAlign = 'center'; g.fillText(`${i + 1}:${d}`, 12, 12);
      const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
      const grp = new THREE.Group(); grp.position.copy(p); W.group.add(grp); mesh(G.box, col(0x3a3440), 0, 0.55, 0, 0.06, 1.1, 0.06, grp);
      const sp = sprite(t, 0.6); sp.scale.set(0.9, 0.6, 1); sp.position.y = 1.35; grp.add(sp); return { grp, p, got: false, i }; });
    let hint = ''; const say = h => { if (h !== hint) { hint = h; api.msg(h); } };
    const codeStr = () => o.code.map((d, i) => plates[i].got ? d : '_').join(' ');
    const all = () => plates.every(q => q.got); let time = 80;
    return {
      target() { const left = plates.filter(q => !q.got).sort((a, b) => a.p.distanceTo(P.pos) - b.p.distanceTo(P.pos)); if (left.length) { say(`Найди таблички с цифрами · код: ${codeStr()}`); return left[0].p; } say(`Код ${codeStr()} — беги к домофону, E`); return c; },
      prompt: () => all() && Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.8 ? '<b>E</b>Набрать код' : '',
      interact() { if (all() && Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.8) { api.finish({ chain: 'keypad' }); return true; } return false; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false });
        for (const q of plates) { q.grp.children[1].position.y = 1.35 + Math.sin(performance.now() * 0.004 + q.i) * 0.06;
          if (!q.got && Math.hypot(P.pos.x - q.p.x, P.pos.z - q.p.z) < 1.6 && Math.abs(P.pos.y - q.p.y) < 1.5) { q.got = true; sfx('pickup'); burst(q.p.x, q.p.y + 1.3, q.p.z, 8, { color: 0x4ab0f0, size: 0.1, speed: 1.5 }); q.grp.children[1].material.opacity = 0.35; } }
        api.progress(plates.filter(q => q.got).length / 4);
      },
      stop() { for (const q of plates) W.group.remove(q.grp); },
    };
  },
};
void tmat;
