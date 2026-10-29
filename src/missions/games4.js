import { random } from '../core/random.js';
import {leafHeap} from './leaf-heap.js';
import { graffitiGame } from './graffiti.js';
import { nearbyItemPoint } from './location.js';
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
export function buildLeafPile(x,y,z,f){const o=place(x,y,z,f,g=>{g.add(leafHeap(560,1.1,.55).g);g.add(compose('leafPileSign32',a=>{a(G.box,tmat(T.sign('ИЩИ!','#c9662a','#17111f')),0,.68,1.05,.5,.18,.025);a(G.box,tmat(T.wood()),0,.34,1.05,.045,.68,.045);}));},[2.2,2.2],.22,2.2);o.type='leaves';return o;}
export function graffitiPlaces(){
 const out=[];
 for(const s of W.solids){if(!s.on||s.obb||s.y1-s.y0<2.55)continue;const wx=s.x1-s.x0,wz=s.z1-s.z0;
 for(const [axis,length]of [['x',wx],['z',wz]]){if(length<3.6)continue;for(const sign of [-1,1])for(const k of [.25,.5,.75]){
  const x=axis==='x'?s.x0+wx*k:sign>0?s.x1:s.x0,z=axis==='z'?s.z0+wz*k:sign>0?s.z1:s.z0,f=axis==='x'?[0,sign]:[sign,0];
  const px=x+f[0]*1.5,pz=z+f[1]*1.5,y=groundAt(px,pz,.25,s.y0+.35);
  if(Math.abs(y-s.y0)>.3||s.y1<y+2.55||!isFree(px-.45,pz-.45,px+.45,pz+.45,y+.05,y+2.0))continue;
  if((W.paintSites||[]).some(p=>Math.hypot(p.x-x,p.z-z)<2.7))continue;
  // Весь прямоугольник должен попадать в одну физическую грань.
  const at=axis==='x'?x:z,min=axis==='x'?s.x0:s.z0,max=axis==='x'?s.x1:s.z1;if(at-1.72<min||at+1.72>max)continue;
  out.push({x:x+f[0]*.025,y,z:z+f[1]*.025,f,solid:s});
 }}}
 return out;
}
export function buildGraffitiWall(x,y,z,f,surface){
 const g=new THREE.Group();g.position.set(x,y,z);W.group.add(g);(W.paintSites??=[]).push({x,z});
 return{g,f,solid:surface?.solid,type:'graffiti',pos:()=>g.position,front:()=>new V3(x+f[0]*1.4,y,z+f[1]*1.4),dispose(){g.removeFromParent();}};
}
export function buildIntercom(x, y, z, f) {
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=Math.atan2(f[0],f[1]);W.group.add(g);
  g.add(compose('intercom25',a=>{
    a(G.box,tmat(T.metal()),0,1.27,0,0.32,0.56,0.12);
    a(G.box,tmat(T.vent()),0,1.43,0.066,0.23,0.12,0.012);
    a(G.box,col(0x17111f),0,1.31,0.066,0.22,0.07,0.012);
    a(G.box,glow(0x9be36b),0,1.31,0.074,0.16,0.025,0.01);
    for(let row=0;row<4;row++)for(let c=0;c<3;c++)a(G.box,col(0xc8c0b0),-0.075+c*0.075,1.23-row*0.055,0.075,0.045,0.035,0.022);
    a(G.box,tmat(T.sign('КОД', '#2a2533','#d8d0b8')),0,1.67,0,0.32,0.13,0.025);
  }));
  return {g,f,type:'intercom',reach:1.6,pos:()=>g.position,front:()=>new V3(x+f[0]*0.85,y,z+f[1]*0.85),dispose(){g.removeFromParent();}};
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
const farFloor = p => nearbyItemPoint(p);

/* ---------- панельные игры ---------- */
export const PANEL4 = {
  // Золотой билет: ЛКМ и веди — листья разлетаются; клик по находке — что это?
  leaves(o, api, ctx) {
    api.feedback?.();
    const c = o.pos(), F = new V3(o.f[0], 0, o.f[1]);
    api.pose(c.clone().addScaledVector(F, 2.1).add(new V3(0, 2.8, 0)), c.clone().add(new V3(0, 0.1, 0)));
    o.g.visible = false; ctx.cursor(true);
    const grp = new THREE.Group(); grp.position.copy(c); W.group.add(grp);
    const JUNK = [['носок', 0xf1e8ff], ['жёлудь', 0x8a5a2a], ['банка', 0xc83a3a], ['пуговица', 0x4ab0f0], ['фантик', 0x9be36b]];
    const finds = [];
    const spot = () => { const a = random() * 6.28, r = Math.sqrt(random()) * 1.05; return [Math.cos(a) * r, Math.sin(a) * r]; };
    for (const [name, cl] of JUNK) { const [x, z] = spot(); const m = mesh(G.box, col(cl), x, 0.03, z, 0.14, 0.05, 0.1, grp); m.rotation.y = random() * 3; finds.push({ m, name, x, z }); }
    { const [x, z] = spot(); const m = mesh(G.box, lam({ color: 0xf5c542, emissive: 0x6a4a00, emissiveIntensity: 0.6 }, 'ticket'), x, 0.03, z, 0.2, 0.02, 0.11, grp); m.rotation.y = random() * 3; finds.push({ m, name: 'БИЛЕТ', x, z, gold: true }); }
    const heap=leafHeap(860,1.3,.75),leaves=heap.leaves;grp.add(heap.g);
    let down = false, time = 55, endT = -1, rust = 0;
    api.progress(0); api.msg('Разгребай! Клик по находке');
    const covered = f => leaves.some(l => !l.v && Math.hypot(l.m.position.x - f.x, l.m.position.z - f.z) < 0.12);
    return {
      botStep(dt, brain) { if(endT>0)return;const gold=finds.find(q=>q.gold);const q=new V3(c.x+gold.x,c.y+0.2,c.z+gold.z),ray=brain.rayTo(q);this.down(brain.hit(gold.m));this.move(ray); },
      down(ray) { down = true; const h = ray.intersectObjects(finds.map(f => f.m)); if (h.length) { const f = finds.find(q => q.m === h[0].object); if (f && !covered(f)) {
        if (f.gold) { api.msg('ЗОЛОТОЙ БИЛЕТ!', 'good'); sfx('done'); burst(c.x + f.x, c.y + 0.2, c.z + f.z, 14, { color: 0xf5c542, size: 0.08, speed: 2, up: 2 }); endT = 1.0; }
        else { api.msg(`Это ${f.name}…`, 'bad'); sfx('drop'); f.m.position.y = 0.5; f.m.visible = false; } } } },
      up() { down = false; },
      move(ray) { if (!down) return; const p = onPlaneY(ray, c.y + 0.2); if (!p) return; const lx = p.x - c.x, lz = p.z - c.z;
        let cleared = 0; for (const l of heap.order) { if (l.v || cleared >= 7) continue; const dx = l.m.position.x - lx, dz = l.m.position.z - lz, d = Math.hypot(dx, dz); if (d < 0.25) { cleared++; l.v = new V3(dx / (d || 1) * (2 + random() * 2), 2 + random() * 2, dz / (d || 1) * (2 + random() * 2)); rust -= 1; } }
        if (rust < 0) { rust = 6; sfx('step', { surf: 'grass', v: 0.8 }); } },
      update(dt) {
        time -= dt; if (endT < 0 && time <= 0) return api.finish({ success: false });
        for (const l of leaves) if (l.v) { l.v.y -= 9 * dt; l.m.position.addScaledVector(l.v, dt); l.m.rotation.x += dt * 8; if (l.m.position.y < -0.3) l.m.visible = false; heap.write(l); }
        api.progress(leaves.filter(l => l.v).length / leaves.length);
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 0.8 + Math.max(0, time) / 55 * 0.4 }); }
      },
      stop() { W.group.remove(grp);heap.batch.dispose(); o.g.visible = true; ctx.cursor(true); },
    };
  },

  // Граффити: зажми ЛКМ и закрась силуэт; за край — клякса (меньше очков)
  graffiti:graffitiGame,

  // Код домофона — ввод: кнопки 0–9, сброс; найденные цифры подсказаны сверху
  keypad(o, api, ctx) {
    api.feedback?.();
    const c = o.pos(), F = new V3(o.f[0], 0, o.f[1]); api.pose(c.clone().addScaledVector(F, 1.0).add(new V3(0, 1.35, 0)), c.clone().add(new V3(0, 1.15, 0)));
    const ui = document.createElement('div'); ui.id = 'keyui'; ui.className = 'mgui'; document.body.appendChild(ui); if(ctx?.bot){ui.id+='-bot-'+ctx.mission.id;ui.style.setProperty('display','none','important');}
    let entry = '', endT = -1;
    const render = () => { ui.innerHTML = `<div class="wt">ДОМОФОН</div><div class="kd">${(entry + '___').slice(0, 3).split('').join(' ')}</div><div class="kh">Найдено: ${o.code.join(' ')}</div><div class="kg">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>`; };
    render(); api.msg('Набери код из найденных цифр');
    ui.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (!b || endT > 0) return; const k = b.dataset.k; sfx('click');
      if (k === 'C') entry = ''; else if (k === '✓') { if (entry === o.code.join('')) { api.msg('Дверь открыта!', 'good'); sfx('bell'); endT = 0.9; } else { api.msg('Неверный код', 'bad'); sfx('alarm', { v: 0.4 }); entry = ''; } }
      else if (entry.length < 3) entry += k; render(); });
    return {
      botStep(dt, brain) { if(!brain.ready(0.7)||endT>0)return;if(entry.length<3){entry+=o.code[entry.length];render();sfx('click');api.progress(entry.length/4);}else if(entry===o.code.join(''))endT=0.9; }, update(dt) { if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } }, stop() { ui.remove(); } };
  },

  // Отмычка: двигай мышью — угол отмычки; зажми ЛКМ — проворачивай замок. Не там — замок упирается, отмычка трещит
  lockpick(o, api, ctx) {
    api.feedback?.();
    const c = o.pos(), F = new V3(o.f[0], 0, o.f[1]); api.pose(c.clone().addScaledVector(F, 1.1).add(new V3(0, 1.0, 0)), c.clone().add(new V3(0, 0.4, 0)));
    const { ui, cv, g } = overlay('lockui', 'ОТМЫЧКА', 'Води мышью — ищи точку. Зажми ЛКМ — проворачивай. Замок упёрся — отпусти, иначе сломаешь', 300, 220);if(ctx?.bot){ui.id+='-bot-'+ctx.mission.id;ui.style.setProperty('display','none','important');}
    const sweet = (random() * 140 - 70) * Math.PI / 180, WIN = 7 * Math.PI / 180, ZONE = 40 * Math.PI / 180;
    let pick = 0, turn = 0, holding = false, strain = 0, picks = 3, endT = -1, shake = 0;
    const draw = () => {
      g.fillStyle = '#17111f'; g.fillRect(0, 0, 300, 220); const cx = 150, cy = 130;
      g.fillStyle = '#6a4a1a'; g.beginPath(); g.arc(cx, cy, 78, 0, 7); g.fill(); g.fillStyle = '#d8a030'; g.beginPath(); g.arc(cx, cy, 70, 0, 7); g.fill();
      g.fillStyle = '#b8862a'; g.beginPath(); g.arc(cx, cy, 44, 0, 7); g.fill();
      g.save(); g.translate(cx, cy); g.rotate(turn); g.fillStyle = '#17111f'; g.fillRect(-5, -26, 10, 34); g.beginPath(); g.arc(0, -26, 9, 0, 7); g.fill(); g.restore();
      const sh = holding && strain > 0 ? (random() - 0.5) * 0.06 : 0;
      g.save(); g.translate(cx, cy); g.rotate(pick + sh - Math.PI / 2); g.fillStyle = '#c8c8d8'; g.fillRect(0, -2, 110, 4); g.fillStyle = '#8a8d98'; g.fillRect(100, -5, 12, 10); g.restore();
      g.font = '10px "Press Start 2P", monospace'; g.fillStyle = '#f1e8ff'; g.fillText('ОТМЫЧКИ', 10, 20); for (let i = 0; i < 3; i++) { g.fillStyle = i < picks ? '#c8c8d8' : '#3a3046'; g.fillRect(10 + i * 18, 30, 12, 4); }
    };
    const onMove = e => { if (endT > 0) return; const r = cv.getBoundingClientRect(), k = (e.clientX - r.left) / r.width; pick = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, (k - 0.5) * Math.PI)); };
    const onDown = () => { holding = true; }, onUp = () => { holding = false; };
    cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onDown); addEventListener('pointerup', onUp);
    api.progress(0); api.msg('Найди точку и проверни замок');
    return {
      botStep(dt, brain) { pick+=(sweet-pick)*Math.min(1,dt*2);holding=Math.abs(pick-sweet)<WIN; },
      update(dt) {
        if (endT > 0) { endT -= dt; draw(); if (endT <= 0) api.finish({ success: true, mult: 0.6 + picks * 0.15 }); return; }
        const off = Math.abs(pick - sweet), maxT = off < WIN ? Math.PI / 2 : Math.max(0, 1 - (off - WIN) / ZONE) * Math.PI / 2 * 0.85;
        if (holding) { turn = Math.min(maxT, turn + dt * 2.2); if (turn >= maxT - 0.01 && maxT < Math.PI / 2) { strain += dt; if (random() < dt * 8) sfx('screw', { v: 0.3 }); } else strain = Math.max(0, strain - dt); }
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
    api.feedback?.();
    const c = o.pos(), F = new V3(o.f[0], 0, o.f[1]); api.pose(c.clone().addScaledVector(F, 1.3).add(new V3(0, 1.1, 0)), c.clone().add(new V3(0, 0.6, 0)));
    const N = 3, { ui, cv, g } = overlay('pipeui', 'ТРУБЫ', 'Клик: поворот на 90°. Соедини синий вход слева с зелёным выходом справа'), CS = 300 / N;if(ctx?.bot){ui.id+='-bot-'+ctx.mission.id;ui.style.setProperty('display','none','important');}
    // биты выходов: 1 — верх, 2 — право, 4 — низ, 8 — лево
    const rot = m => ((m << 1) | (m >> 3)) & 15, grid = [], sy = (random() * N) | 0;
    // Монотонный путь: 3–5 клеток, всегда выходит справа, без тупика генератора.
    const ey0 = (sy + 1 + ((random() * 2) | 0)) % N;
    const path = [[0, sy], [1, sy]];
    for (let y = sy; y !== ey0;) { y += Math.sign(ey0 - y); path.push([1, y]); }
    path.push([2, ey0]);
    const dirBit = (a, b) => b[0] > a[0] ? 2 : b[0] < a[0] ? 8 : b[1] > a[1] ? 4 : 1, opp = b => ({ 1: 4, 4: 1, 2: 8, 8: 2 })[b];
    for (let y = 0; y < N; y++) { grid.push([]); for (let x = 0; x < N; x++) grid[y].push([3, 5, 7, 6, 11][(random() * 5) | 0]); }
    path.forEach((p, i) => { let m = 0; m |= i === 0 ? 8 : opp(dirBit(path[i - 1], p)); m |= i === path.length - 1 ? 2 : dirBit(p, path[i + 1]); grid[p[1]][p[0]] = m; });
    const solved=grid.map(row=>row.slice());
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = (random() * 4) | 0; for (let k = 0; k < r; k++) grid[y][x] = rot(grid[y][x]); }
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
    return {
      botStep(dt, brain) { if(!brain.ready(0.45)||endT>0)return;const q=path.find(([x,y])=>grid[y][x]!==solved[y][x]);if(q){grid[q[1]][q[0]]=rot(grid[q[1]][q[0]]);flow();draw();api.progress(wet.size/path.length);}if(flow())endT=1; }, update(dt) { if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } }, stop() { ui.remove(); } };
  },
};

/* ---------- уличная часть «Кода домофона»: найти три таблички с цифрами ---------- */
export const WORLD4 = {
  intercom(o, api, ctx) {
    api.feedback?.();
    const P = ctx.player, c = o.pos(); o.code = [0, 0, 0].map(() => (random() * 10) | 0);
    const used=[];
    const plates = o.code.map((d,i)=>{
      let p;for(let n=0;n<20;n++){p=nearbyItemPoint(o.front());if(used.every(q=>q.distanceTo(p)>1.8))break;}used.push(p.clone());
      const cv=document.createElement('canvas');cv.width=96;cv.height=64;const g=cv.getContext('2d');
      g.fillStyle='#d8ccb0';g.fillRect(0,0,96,64);g.fillStyle='#b8aa90';for(let n=0;n<100;n++)g.fillRect(random()*96,random()*64,1,1);
      g.fillStyle='#342c30';g.font='bold 10px monospace';g.fillText('КОД ПОДЪЕЗДА',6,13);g.font='10px monospace';g.fillText('ЦИФРА '+(i+1)+' / 3',6,26);g.font='bold 30px monospace';g.fillText(String(d),39,54);
      g.strokeStyle='#8a785c';g.strokeRect(2,2,91,59);g.fillStyle='#a86a40';g.fillRect(7,3,20,5);g.fillRect(70,55,19,5);
      const tex=new THREE.CanvasTexture(cv);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;
      const grp=new THREE.Group();grp.position.copy(p);grp.rotation.y=Math.atan2(c.x-p.x,c.z-p.z);W.group.add(grp);
      // Записка на крышке небольшого ящика, с лентой и загнутым уголком.
      mesh(G.box,tmat(T.crate()),0,0.23,0,0.65,0.46,0.5,grp);
      const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});const paper=mesh(G.plane,mat,0,0.468,0,0.56,0.38,1,grp);paper.rotation.x=-Math.PI/2;
      mesh(G.box,col(0xbda478),0.2,0.48,-0.14,0.12,0.012,0.05,grp);
      const solid=addSolid(p.x-0.32,p.z-0.32,p.x+0.32,p.z+0.32,p.y,p.y+0.46);
      return {grp,p,got:false,i,tex,mat,solid};
    });o.notes=plates;
    let hint = ''; const say = h => { if (h !== hint) { hint = h; api.msg(h); } };
    const codeStr = () => o.code.map((d, i) => plates[i].got ? d : '_').join(' ');
    const all = () => plates.every(q => q.got); let time = 120;
    return {
      target() { const left = plates.filter(q => !q.got).sort((a, b) => a.p.distanceTo(P.pos) - b.p.distanceTo(P.pos)); if (left.length) { say(`Найди таблички с цифрами · код: ${codeStr()}`); return left[0].p; } say(`Код ${codeStr()} — беги к домофону, E`); return o.front(); },
      prompt: () => plates.some(q=>!q.got&&q.p.distanceTo(P.pos)<1.8)?'<b>E</b>Прочитать записку':all()&&P.pos.distanceTo(o.front())<1.8?'<b>E</b>Набрать код':'',
      interact() { const q=plates.find(q=>!q.got&&q.p.distanceTo(P.pos)<1.8);if(q){q.got=true;sfx('pickup');api.msg('Цифра '+(q.i+1)+': '+o.code[q.i]+' · код '+codeStr(),'good');return true;} if (all() && Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.8) { api.finish({ chain: 'keypad' }); return true; } return false; },
      update(dt) {
        time -= dt; api.timer(time); if (time <= 0) return api.finish({ success: false });

        api.progress(plates.filter(q => q.got).length / 3);
      },
      stop() { for (const q of plates) {q.grp.removeFromParent();q.solid.on=false;q.tex.dispose();q.mat.dispose();} o.notes=null; },
    };
  },
};
void tmat;
