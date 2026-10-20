import { nearbyItemPoint } from './location.js';
import { THREE, G, V3, mesh, col, tmat, lam, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid, groundAt, pushOut, isFree } from '../world/physics.js';
import { burst, puff, smokeRing, splash } from '../world/particles.js';
import { addItem, launch } from '../game/items.js';
import { buildCat, COATS } from '../game/cats.js';
import { iconCanvas, icon } from '../ui/icons.js';
import { SKINS } from '../characters/skins.js';
import { spawnTool } from '../game/tools.js';
import { startEmote } from '../game/grab.js';
import { sfx } from '../core/sfx.js';

/* Миссии v0.14:
   салат (принеси огурец и помидор на кухню → нарежь по линиям → в миску),
   «позови всех гулять» (звонит телефон → мессенджер → каждому стикер),
   лампочка (принеси лампочку → залезь по стремянке → вкрути, вращая мышью),
   котята в коробку (загони двух котят — толкай, пугай, мани уточкой),
   горячая пицца (донеси, пока не остыла; бросишь — остывает быстрее),
   горящая урна (потуши огнетушителем, водой или шариками). */
const PL = new THREE.Plane(), HIT = new V3();
const onPlane = (ray, n, p) => { PL.setFromNormalAndCoplanarPoint(n, p); return ray.ray.intersectPlane(PL, HIT) ? HIT.clone() : null; };
const ringMark = (color = 0x9be36b) => { const r = mesh(G.ring, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, 0.4, 0.4, 1, W.group); r.rotation.x = -Math.PI / 2; return r; };
// случайная свободная точка в зонах «пол» на расстоянии [a..b] от p
const farPoint = p => nearbyItemPoint(p);

/* ---------- объекты ---------- */
// звонящий телефон на столе
export function buildPhone(sp) {
  const g = new THREE.Group(); g.position.set(sp.bx, sp.by, sp.bz); g.rotation.y = Math.atan2(sp.f[0], sp.f[1]); W.group.add(g);
  const ph = compose('deskPhone', a => { a(G.box, col(0x2b2533), 0, 0.03, 0, 0.16, 0.02, 0.3); a(G.box, lam({ color: 0x9be0ff, emissive: 0x4a90c0, emissiveIntensity: 0.8 }, 'phoneScreen'), 0, 0.045, 0, 0.13, 0.005, 0.25); }); g.add(ph);
  let t = 0; const tick = dt => { t += dt; ph.position.x = Math.sin(t * 60) * 0.012 * (Math.sin(t * 2) > 0 ? 1 : 0); ph.rotation.y = ph.position.x * 2; if (Math.sin(t * 2) > 0 && Math.random() < dt * 2) { const P = W.player; if (P && Math.hypot(P.pos.x - sp.x, P.pos.z - sp.z) < 14) sfx('ring', { at: { x: sp.bx, y: sp.by, z: sp.bz }, v: 0.6 }); } };
  W.animated.push(tick);
  return { type: 'phone', g, ph, spot: sp, f: sp.f, pos: () => new V3(sp.x, sp.y, sp.z), dispose() { W.group.remove(g); const i = W.animated.indexOf(tick); if (i >= 0) W.animated.splice(i, 1); } };
}
// горящая урна: огонь на ближайшем баке (двигается вместе с ним) или на отдельной железной бочке
export function buildFire(sp) {
  const bin = W.pushables.find(b => b.kind === 'bin' && !b.tipped && Math.hypot(b.x - sp.x, b.z - sp.z) < 1.5);
  let can = null, sol = null;
  if (!bin) { can = compose('fireCan', a => { a(G.cyl8, tmat(T.rust()), 0, 0.45, 0, 0.32, 0.9, 0.32); a(G.cyl8, col(0x2b2533), 0, 0.88, 0, 0.33, 0.04, 0.33); }); can.position.set(sp.x, sp.y, sp.z); W.group.add(can); sol = addSolid(sp.x - 0.33, sp.z - 0.33, sp.x + 0.33, sp.z + 0.33, sp.y, sp.y + 0.9); }
  const at = () => bin ? new V3(bin.x, bin.y, bin.z) : new V3(sp.x, sp.y, sp.z);
  const f = { x: sp.x, y: sp.y, z: sp.z, hp: 1 }; W.fires.push(f);
  let t = 0; const tick = dt => { const p = at(); f.x = p.x; f.z = p.z; if (f.hp <= 0) return; t -= dt;
    if (t <= 0) { t = 0.05; const k = 0.4 + f.hp * 0.6; puff(p.x + (Math.random() - 0.5) * 0.4, p.y + 1.05, p.z + (Math.random() - 0.5) * 0.4, { color: Math.random() < 0.5 ? 0xff8a1f : 0xf5c542, size: 0.25 * k, vy: 2.2, vx: 0, vz: 0, life: 0.5, grow: -0.3, g: 0, opacity: 0.95 });
      if (Math.random() < 0.3) puff(p.x, p.y + 1.6, p.z, { color: 0x3a3440, size: 0.4, vy: 1.4, life: 1.4, grow: 1.2, opacity: 0.5 }); }
    const P = W.player; if (P && Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < 0.9 && Math.abs(P.pos.y - p.y) < 1.5) { const dx = P.pos.x - p.x, dz = P.pos.z - p.z, d = Math.hypot(dx, dz) || 1; P.push.set(dx / d * 2.5, 0, dz / d * 2.5); }
    if (Math.random() < dt * 1.5) sfx('fire', { at: p, v: 0.6 }); };
  W.animated.push(tick);
  return { type: 'fire', fire: f, spot: sp, f: [0, 1], pos: at, reach: 2.4,
    dispose() { const i = W.animated.indexOf(tick); if (i >= 0) W.animated.splice(i, 1); W.fires.splice(W.fires.indexOf(f), 1); if (can) { W.group.remove(can); sol.on = false; } } };
}
// погасший фонарь (лампочка перегорела)
export function buildDeadLamp(sp) {
  const L = sp.lamp; L.dead = true; if (L.pool) L.pool.visible = false;
  const cap = mesh(G.box, col(0x2b2533), L.lx, L.y + 3.1, L.lz, 0.26, 0.25, 0.26, W.group);
  return { type: 'lamp', lamp: L, cap, spot: sp, f: sp.f, pos: () => new V3(sp.x, sp.y, sp.z), reach: 2.2,
    dispose() { W.group.remove(cap); L.dead = false; if (L.pool && !L.pool.userData.broken) L.pool.visible = true; } };
}
// коробка для котят
export function buildCatBox(x, y, z, f) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(f[0], f[1]); W.group.add(g);
  g.add(compose('catBox', a => { const cb = lam({ map: T.cardboard() }, 'cardboard'); for (const [px, pz, w, d] of [[0, 0.5, 1.1, 0.05], [0, -0.5, 1.1, 0.05], [0.53, 0, 0.05, 1.0], [-0.53, 0, 0.05, 1.0]]) a(G.box, cb, px, 0.35, pz, w, 0.7, d);
    a(G.box, cb, 0, 0.03, 0, 1.05, 0.05, 1.0); for (const [px, pz, rx, rz] of [[0, 0.72, -0.7, 0], [0, -0.72, 0.7, 0], [0.75, 0, 0, 0.7], [-0.75, 0, 0, -0.7]]) a(G.box, cb, px, 0.78, pz, pz ? 1.05 : 0.45, 0.03, pz ? 0.45 : 1.0, rx, 0, rz);
    a(G.box, tmat(T.sign('КОТЯТА', '#c8a070', '#2a1f18')), 0, 0.4, 0.53, 0.7, 0.18, 0.01); }));
  const sols = [[0, 0.52, 1.1, 0.06], [0, -0.52, 1.1, 0.06], [0.55, 0, 0.06, 1.0], [-0.55, 0, 0.06, 1.0]].map(([px, pz, w, d]) => { const wx = x + px * Math.cos(g.rotation.y) + pz * Math.sin(g.rotation.y), wz = z - px * Math.sin(g.rotation.y) + pz * Math.cos(g.rotation.y), q = Math.abs(Math.sin(g.rotation.y)) > 0.5; return addSolid(wx - (q ? d : w) / 2, wz - (q ? w : d) / 2, wx + (q ? d : w) / 2, wz + (q ? w : d) / 2, y, y + 0.7); });
  return { type: 'catbox', g, sols, kittens: [], pos: () => g.position, reach: 2.2, dispose() { W.group.remove(g); sols.forEach(s => (s.on = false)); for (const k of this.kittens) W.group.remove(k.root); } };
}

/* ---------- панельные игры ---------- */
export const PANEL3 = {
  // Нарезка: веди мышью поперёк пунктирных линий (зажав ЛКМ), потом кликни по миске
  saladCut(o, api, ctx) {
    const s = o.spot, F = new V3(s.f[0], 0, s.f[1]), R = new V3(F.z, 0, -F.x), top = s.y + 0.96;
    const c0 = new V3(s.bx, top, s.bz).addScaledVector(F, 0.05);
    api.pose(c0.clone().addScaledVector(F, 0.85).add(new V3(0, 0.95, 0)), c0.clone().addScaledVector(F, -0.05));
    const grp = new THREE.Group(); grp.position.copy(c0); grp.rotation.y = Math.atan2(F.x, F.z); W.group.add(grp);
    mesh(G.box, tmat(T.wood()), -0.12, 0.012, 0, 0.62, 0.025, 0.3, grp);
    const bowl = compose('bowl', a => { a(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam({ color: 0xb8b0c8, side: THREE.DoubleSide }, 'bowl'), 0, 0.1, 0, 0.16, 0.1, 0.16); }); bowl.position.set(0.36, 0.0, 0); grp.add(bowl);
    // овощ = ряд кусочков, линии разреза между ними
    const veg = [{ c: 0x3f8a2a, n: 5, len: 0.42, r: 0.045 }, { c: 0xd8301a, n: 3, len: 0.18, r: 0.08 }];
    let vi = 0, pieces = [], lines = [], cuts = new Set(), done = false, endT = -1, drag = false, last = null, inBowl = 0;
    const lineM = new THREE.MeshBasicMaterial({ color: 0xf1e8ff, transparent: true, opacity: 0.85 });
    const setup = () => {
      for (const p of pieces) grp.remove(p); for (const l of lines) grp.remove(l); pieces = []; lines = []; cuts = new Set();
      const v = veg[vi], w = v.len / v.n;
      for (let i = 0; i < v.n; i++) { const p = mesh(vi ? G.sph10 : G.cyl8, lam({ color: v.c }, 'veg' + v.c), -0.12 - v.len / 2 + w * (i + 0.5), 0.025 + v.r, 0, vi ? w * 0.55 : v.r, vi ? v.r : w * 0.5, v.r, grp); if (!vi) p.rotation.z = Math.PI / 2; pieces.push(p); }
      for (let i = 1; i < v.n; i++) for (let k = 0; k < 4; k++) { const l = mesh(G.box, lineM, -0.12 - v.len / 2 + w * i, 0.03 + v.r * 2 + 0.005, -0.12 + k * 0.08, 0.008, 0.002, 0.04, grp); l.userData.i = i; lines.push(l); }
      api.msg(vi ? 'Теперь помидор' : 'Режь огурец: веди мышью поперёк линий'); api.progress(vi * 0.5);
    };
    setup();
    const local = ray => { const p = onPlane(ray, new V3(0, 1, 0), new V3(0, top + 0.05, 0)); return p ? grp.worldToLocal(p) : null; };
    return {
      down(ray) { drag = true; last = local(ray);
        if (done && ray.intersectObject(bowl, true).length) { /* в миску */ }
        if (done && endT < 0) { const l = local(ray); if (l && Math.hypot(l.x - 0.36, l.z) < 0.2) { endT = 1.0; api.msg('Салат готов!', 'good'); sfx('done'); } } },
      move(ray) {
        if (!drag || done) return; const p = local(ray); if (!p || !last) { last = p; return; }
        const v = veg[vi], w = v.len / v.n;
        for (let i = 1; i < v.n; i++) { const lx = -0.12 - v.len / 2 + w * i; if (cuts.has(i)) continue;
          if ((last.x - lx) * (p.x - lx) < 0 && Math.abs(p.z) < 0.18) { cuts.add(i); sfx('chop'); for (let j = 0; j < pieces.length; j++) pieces[j].position.x += (j < i ? -0.012 : 0.012);
            for (const l of lines) if (l.userData.i === i) l.visible = false; const wp = grp.localToWorld(new V3(lx, 0.06, 0)); burst(wp.x, wp.y, wp.z, 5, { color: v.c, size: 0.04, speed: 0.6, up: 0.6, g: 6, life: 0.4, grow: 0 }); } }
        last = p;
        if (cuts.size >= v.n - 1) { api.progress((vi + 1) * 0.5);
          // кусочки — в миску
          const keep = pieces; pieces = []; let k = 0; for (const q of keep) { const tgt = new V3(0.36 + (Math.random() - 0.5) * 0.14, 0.12 + inBowl * 0.006, (Math.random() - 0.5) * 0.14); const st = q.position.clone(), d0 = 0.15 + k * 0.05; k++; inBowl++;
            let tt = -d0; const anim = dt => { tt += dt; const kk = Math.min(1, Math.max(0, tt / 0.35)); q.position.lerpVectors(st, tgt, kk); q.position.y += Math.sin(kk * Math.PI) * 0.12; if (kk >= 1) { const i2 = W.animated.indexOf(anim); if (i2 >= 0) W.animated.splice(i2, 1); } }; W.animated.push(anim); }
          if (vi === 0) { vi = 1; setTimeout(() => { if (!done) setup(); }, 500); } else { done = true; api.msg('Кликни по миске — перемешать!'); } }
      },
      up() { drag = false; last = null; },
      update(dt) { if (endT > 0) { bowl.rotation.y += dt * 8; endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } },
      stop() { W.group.remove(grp); },
    };
  },

  // Мессенджер: кликни по каждому другу, выбери стикер — отправь
  phone(o, api, ctx) {
    const s = o.spot, F = new V3(s.f[0], 0, s.f[1]), c0 = new V3(s.bx, s.by + 0.05, s.bz);
    api.pose(c0.clone().addScaledVector(F, 0.55).add(new V3(0, 0.7, 0)), c0.clone());
    const friends = (W.bots || []).map(b => ({ b, name: b.name, skin: b.skin, sent: false }));
    const STICK = ['pumpkin', 'mask', 'cat', 'firework', 'duck', 'crown'];
    const ui = document.createElement('div'); ui.id = 'phoneui'; document.body.appendChild(ui);
    let pick = null, endT = -1;
    const render = () => {
      ui.innerHTML = `<div class="ph-top"><span>${'▮▮▮'}</span><b>ГУЛЯТЬ?</b><span>23:59</span></div>
        <div class="ph-list">${friends.map((f, i) => `<button class="ph-c${f.sent ? ' sent' : ''}${pick === i ? ' on' : ''}" data-i="${i}"><span class="ph-av" style="--c:${({ cat: '#ff8a1f', tv: '#4ab0f0', shark: '#9a9dc8', frog: '#9be36b' })[f.skin] || '#b18cff'}">${f.name[0]}</span><span class="ph-n">${f.name}</span><span class="ph-s">${f.sent ? `<img class="pxi" src="${icon(f.sent, 2)}" width="20" height="20">✓✓` : 'не в сети'}</span></button>`).join('')}</div>
        <div class="ph-st${pick === null ? ' hidden' : ''}">${STICK.map(k => `<button class="ph-k" data-k="${k}"><img class="pxi" src="${icon(k, 3)}" width="30" height="30"></button>`).join('')}</div>`;
    };
    render(); api.progress(0); api.msg('Кликни по другу и отправь стикер');
    ui.addEventListener('pointerdown', e => {
      const c = e.target.closest('.ph-c'), k = e.target.closest('.ph-k');
      if (c) { const i = +c.dataset.i; if (!friends[i].sent) { pick = i; sfx('click'); render(); } return; }
      if (k && pick !== null) { const f = friends[pick]; f.sent = k.dataset.k; pick = null; sfx('msg'); render();
        setTimeout(() => { if (f.b && f.b.ch) startEmote(f.b, 'wave'); }, 400);
        const n = friends.filter(q => q.sent).length; api.progress(n / friends.length);
        if (n === friends.length) { api.msg('Все в деле — идём гулять!', 'good'); endT = 1.2; } else api.msg('Отправлено! Следующий', 'good'); }
    });
    if (!friends.length) endT = 0.5;
    return {
      update(dt) { if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } },
      stop() { ui.remove(); },
    };
  },

  // Вкрутить лампочку: зажми ЛКМ и крути мышью по кругу вокруг патрона
  bulbScrew(o, api) {
    const L = o.lamp, c0 = new V3(L.lx, L.y + 2.92, L.lz), d = new V3(Math.sin(L.ry), 0, Math.cos(L.ry));
    const camP = c0.clone().addScaledVector(d, 1.25).add(new V3(0, -0.55, 0)); api.pose(camP, c0.clone());
    const bulb = compose('bulbItem2', a => { a(G.sph10, lam({ color: 0xfff6d0, emissive: 0x6a5a30 }, 'bulbItem'), 0, -0.06, 0, 0.08, 0.09, 0.08); a(G.cyl8, col(0xc8c8d8), 0, 0.04, 0, 0.04, 0.06, 0.04); });
    bulb.position.copy(c0).add(new V3(0, -0.14, 0)); W.group.add(bulb);
    const N = new V3().subVectors(c0, camP).normalize();
    let ang = 0, last = null, drag = false, endT = -1, clickA = 0;
    api.progress(0); api.msg('Зажми ЛКМ и крути по кругу');
    const angleOf = ray => { const p = onPlane(ray, N, c0); if (!p) return null; const u = new V3().crossVectors(N, new V3(0, 1, 0)).normalize(), v = new V3().crossVectors(u, N); p.sub(c0); return Math.atan2(p.dot(v), p.dot(u)); };
    return {
      down(ray) { drag = true; last = angleOf(ray); }, up() { drag = false; last = null; },
      move(ray) { if (!drag || endT > 0) return; const a = angleOf(ray); if (a === null || last === null) { last = a; return; } let da = a - last; da = Math.atan2(Math.sin(da), Math.cos(da)); last = a;
        ang += Math.abs(da) < 1.2 ? Math.abs(da) : 0; if (ang - clickA > 1.2) { clickA = ang; sfx('screw'); }
        const k = Math.min(1, ang / (Math.PI * 6)); api.progress(k); bulb.rotation.y = -ang; bulb.position.y = c0.y - 0.14 + k * 0.1;
        if (k >= 1) { endT = 1.0; api.msg('Да будет свет!', 'good'); o.cap.visible = false; if (L.pool) L.pool.visible = true; sfx('done'); burst(c0.x, c0.y - 0.1, c0.z, 10, { color: 0xfff0c8, size: 0.1, speed: 1.5 }); } },
      update(dt) { if (endT > 0) { bulb.children.forEach(m => m.material && m.material.emissive && m.material.emissive.setHex(0xfff0c8)); endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } },
      stop() { W.group.remove(bulb); },
    };
  },
};

/* ---------- уличные ---------- */
export const WORLD3 = {
  // Салат: огурец и помидор где-то рядом (подсвечены), принеси оба к кухне — дальше нарезка
  salad(o, api, ctx) {
    const s = o.spot, home = new V3(s.x, s.y, s.z), P = ctx.player, from = home;
    const items = ['cucumber', 'tomato'].map(k => { const p = farPoint(from, 4, 22); const it = addItem(k, p.x, p.y, p.z, Math.random() * 6); it.def = { ...it.def, respawn: 0 }; it.ring = ringMark(); return it; });
    let time = 112, hint = '';
    const say = h => { if (h !== hint) { hint = h; api.msg(h); } };
    const atHome = it => Math.hypot(it.pos.x - home.x, it.pos.z - home.z) < 1.8 && Math.abs(it.pos.y - home.y) < 1.6;
    return {
      target() { const l = items.find(it => !atHome(it) && P.held !== it); if (l) { say(l.type === 'cucumber' ? 'Найди огурец' : 'Найди помидор'); return l.pos; } say('Неси на кухню'); return home; },
      update(dt) {
        time -= dt; api.timer(time);
        for (const it of items) { it.ring.visible = it.state === 'rest' && !atHome(it); it.ring.position.set(it.pos.x, it.pos.y - it.def.r + 0.04, it.pos.z); it.outline.set(it.state === 'rest'); }
        const n = items.filter(it => atHome(it) && (it.state === 'rest' || P.held === it)).length; api.progress(n / 2 * 0.5);
        if (items.some(it => it.state === 'gone')) return api.finish({ success: false });
        if (n === 2) return api.finish({ chain: 'saladCut' });
        if (time <= 0) api.finish({ success: false });
      },
      stop() { for (const it of items) { W.group.remove(it.ring); it.outline.set(false); if (P.held === it) P.held = null; it.state = 'gone'; it.g.visible = false; } },
    };
  },

  // Лампочка: возьми лампочку, поставь стремянку у фонаря (уже стоит), залезь и вкрути (E)
  bulb(o, api, ctx) {
    const L = o.lamp, P = ctx.player, d = new V3(Math.sin(L.ry), 0, Math.cos(L.ry)), hx = L.lx + d.x * 0.45, hz = L.lz + d.z * 0.45;
    // стремянка: поручни и ступени, зона лазания
    const lad = new THREE.Group(); lad.position.set(hx, L.y, hz); lad.rotation.y = Math.atan2(d.x, d.z); W.group.add(lad);
    lad.add(compose('stepladder', a => { const al = col(0xc8c8d8); // стремянка «домиком»: внизу ноги широко, наверху сходятся под площадкой
      for (const sx of [-0.3, 0.3]) { a(G.box, al, sx, 1.25, 0.12, 0.05, 2.6, 0.05, 0.12); a(G.box, al, sx, 1.2, 0.6, 0.04, 2.5, 0.04, -0.25); }
      for (let y = 0.3; y < 2.4; y += 0.35) a(G.box, col(0xf5c542), 0, y, 0.12 + (y - 1.25) * 0.12, 0.62, 0.04, 0.12);
      a(G.box, col(0xf5c542), 0, 2.52, 0.33, 0.66, 0.05, 0.3); for (const sx of [-0.3, 0.3]) a(G.box, al, sx, 0.75, 0.42, 0.02, 0.02, 0.5); }));
    const lz = { x0: hx - 0.55, x1: hx + 0.55, z0: hz - 0.55, z1: hz + 0.55, y0: L.y, y1: L.y + 2.25, nx: d.x, nz: d.z }; W.ladders.push(lz);
    const p0 = farPoint(new V3(L.x, L.y, L.z), 6, 18), bulb = addItem('bulb', p0.x, p0.y, p0.z); bulb.def = { ...bulb.def, respawn: 0 }; bulb.steal = { pts: ctx.mission ? ctx.mission.pts : 200, key: 'bulb' }; bulb.mine = P; const rg = ringMark(0xf5c542);
    let time = 105, hint = '';
    const say = h => { if (h !== hint) { hint = h; api.msg(h); } };
    const up = () => P.pos.y > L.y + 1.7 && Math.hypot(P.pos.x - hx, P.pos.z - hz) < 1.4;
    return {
      target() { if (P.held !== bulb) { say('1) Возьми лампочку (E) — жёлтое кольцо'); return bulb.pos; } if (!up()) { say('2) Залезь по стремянке к фонарю (W у лестницы)'); return new V3(hx + d.x * 0.8, L.y, hz + d.z * 0.8); } say('3) Нажми E — и вкрути лампочку мышью'); return new V3(L.lx, L.y + 3, L.lz); },
      prompt: () => P.held === bulb && up() ? '<b>E</b>Вкрутить лампочку' : '',
      interact() { if (P.held === bulb && up()) { api.finish({ chain: 'bulbScrew' }); return true; } return false; },
      update(dt) {
        time -= dt; api.timer(time); rg.visible = bulb.state === 'rest'; rg.position.set(bulb.pos.x, bulb.pos.y - 0.1, bulb.pos.z); bulb.outline.set(bulb.state === 'rest');
        api.progress(P.held === bulb ? (up() ? 0.66 : 0.33) : 0);
        if (bulb.state === 'held' && P.held !== bulb && bulb.owner !== P && bulb.wasHeld) { api.msg('Украли!', 'bad'); bulb.mine = null; return api.finish({ success: false, stolen: bulb.owner }); }
        if (bulb.state === 'gone' || time <= 0) api.finish({ success: false });
      },
      stop() { W.group.remove(lad); W.group.remove(rg); W.ladders.splice(W.ladders.indexOf(lz), 1); if (P.held === bulb) P.held = null; bulb.outline.set(false); if (bulb.state === 'held' && bulb.owner !== P) return; bulb.state = 'gone'; bulb.g.visible = false; bulb.steal = null; },
    };
  },

  // Котята: двое носятся вокруг коробки и удирают от тебя. Догони, возьми на руки (E) и донеси до коробки —
  // или брось котёнка в коробку (ПКМ). На руках котёнок долго не сидит — вырывается и снова удирает.
  catbox(o, api, ctx) {
    const c = o.pos(), P = ctx.player, G2 = 22;
    o.kittens = [0, 1].map(i => { const k = buildCat(COATS[(Math.random() * COATS.length) | 0]); k.root.scale.setScalar(0.85); const a = Math.random() * 6.28, r = 5 + Math.random() * 2.5;
      let x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; if (!isFree(x - 0.3, z - 0.3, x + 0.3, z + 0.3, c.y + 0.05, c.y + 0.8)) { x = c.x + Math.cos(a) * 3; z = c.z + Math.sin(a) * 3; }
      k.root.position.set(x, c.y, z); W.group.add(k.root); return { root: k.root, cat: k, vx: 0, vz: 0, vy: 0, wt: 0, wx: 0, wz: 0, st: 'run', dash: 0, rest: 0, holdT: 0, ph: Math.random() * 6 }; });
    let time = 90, got = 0, held = null;
    api.msg('Догони котёнка и возьми на руки (E) — неси или кидай в коробку (ПКМ)');
    const toBox = k => { k.st = 'box'; got++; sfx('candy'); burst(c.x, c.y + 0.8, c.z, 10, { color: 0xc8a070, size: 0.14, speed: 1.5, up: 2 }); api.msg(got < 2 ? 'Один в коробке!' : 'Оба котёнка дома!', 'good'); };
    const release = (k, vx, vy, vz) => { k.st = 'fly'; k.vx = vx; k.vy = vy; k.vz = vz; if (held === k) held = null; };
    const near = () => o.kittens.filter(k => k.st === 'run').sort((a, b) => a.root.position.distanceTo(P.pos) - b.root.position.distanceTo(P.pos))[0];
    return {
      target() { if (held) return c; const k = near(); return k ? k.root.position : c; },
      prompt() { if (held) return Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.6 ? '<b>E</b>Посадить в коробку' : '<b>ПКМ</b>Кинуть в коробку'; const k = near(); return k && k.root.position.distanceTo(P.pos) < 1.3 && !P.held ? '<b>E</b>Схватить котёнка' : ''; },
      interact() {
        if (held) { if (Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.6) { const k = held; held = null; toBox(k); } else { const f = P.root.rotation.y; release(held, Math.sin(f) * 2, 2, Math.cos(f) * 2); } return true; }
        const k = near(); if (k && !P.held && k.root.position.distanceTo(P.pos) < 1.3) { k.st = 'held'; k.holdT = 2.2 + Math.random() * 1.2; held = k; sfx('meow', { at: k.root.position }); k.cat.face('angry'); return true; }
        return false;
      },
      // для броска ПКМ: что держим и как бросить
      carrying: () => !!held,
      throwCarry(v) { if (!held) return; const k = held; k.root.position.copy(P.ch.holdPoint); release(k, v.x, v.y, v.z); sfx('meow', { at: k.root.position }); },
      update(dt) {
        time -= dt; api.timer(time); P.carryKitten = !!held;
        for (const k of o.kittens) {
          const p = k.root.position;
          if (k.st === 'box') { p.lerp(new V3(c.x + (k === o.kittens[0] ? -0.2 : 0.2), c.y + 0.25, c.z), dt * 6); k.cat.head.rotation.y = Math.sin(performance.now() * 0.004 + k.ph) * 0.5; continue; }
          if (k.st === 'held') {
            // на руках: брыкается и через пару секунд вырывается
            k.holdT -= dt; p.copy(P.ch.holdPoint); p.y -= 0.25; k.root.rotation.y = P.root.rotation.y + Math.sin(performance.now() * 0.03) * (k.holdT < 0.8 ? 0.6 : 0.2);
            const sw = Math.sin(performance.now() * 0.03) * 0.9; k.cat.legs.forEach((l, i) => (l.rotation.x = i % 2 ? sw : -sw));
            if (Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.1) { held = null; toBox(k); continue; }
            if (k.holdT <= 0 || P.stun > 0) { const a = Math.random() * 6.28; release(k, Math.cos(a) * 4, 4, Math.sin(a) * 4); sfx('meow', { at: p }); api.msg('Вырвался!', 'bad'); }
            continue;
          }
          if (k.st === 'fly') {
            k.vy -= G2 * dt; p.x += k.vx * dt; p.y += k.vy * dt; p.z += k.vz * dt; k.root.rotation.x += dt * 8;
            // попал в коробку
            if (Math.hypot(p.x - c.x, p.z - c.z) < 0.7 && p.y < c.y + 1.0 && k.vy < 0) { k.root.rotation.x = 0; toBox(k); continue; }
            pushOut(p, 0.3, p.y + 0.1, p.y + 0.5);
            const gy = groundAt(p.x, p.z, 0.2, p.y + 0.3); if (p.y <= gy) { p.y = gy; k.root.rotation.x = 0; k.st = 'run'; k.dash = 1.2; k.vx *= 0.3; k.vz *= 0.3; puff(p.x, p.y, p.z, { size: 0.3, life: 0.3 }); }
            continue;
          }
          // бегает: от игрока — рывками (быстрее шага, медленнее спринта), между рывками — короткая передышка
          let ax = 0, az = 0, sp = 1.2;
          const dx = p.x - P.pos.x, dz = p.z - P.pos.z, d = Math.hypot(dx, dz);
          if (k.dash > 0) k.dash -= dt; else if (k.rest > 0) k.rest -= dt;
          if (d < 6 && d > 0.01) { ax += dx / d * (6 - d) * 2.2; az += dz / d * (6 - d) * 2.2; if (k.dash <= 0 && k.rest <= 0) { k.dash = 1.1 + Math.random() * 0.6; k.rest = 0.7 + Math.random() * 0.5; }
            sp = k.dash > 0 ? 9 : 4.5; k.cat.face('angry'); } else k.cat.face('open');
          if (W.lure && W.lure.t > 0) { const lx = W.lure.x - p.x, lz = W.lure.z - p.z, ld = Math.hypot(lx, lz); if (ld < 12 && ld > 0.3) { ax += lx / ld * 4; az += lz / ld * 4; sp = Math.min(sp, 3); } }
          k.wt -= dt; if (k.wt <= 0) { const a = Math.random() * 6.28; k.wx = Math.cos(a); k.wz = Math.sin(a); k.wt = 1 + Math.random() * 2; }
          ax += k.wx * 0.8; az += k.wz * 0.8;
          // не убегать далеко от коробки
          const cx = c.x - p.x, cz = c.z - p.z, cd = Math.hypot(cx, cz); if (cd > 9) { ax += cx / cd * (cd - 9) * 1.5; az += cz / cd * (cd - 9) * 1.5; }
          const al = Math.hypot(ax, az) || 1; k.vx += (ax / al * sp - k.vx) * Math.min(1, dt * 6); k.vz += (az / al * sp - k.vz) * Math.min(1, dt * 6);
          p.x += k.vx * dt; p.z += k.vz * dt; pushOut(p, 0.3, p.y + 0.2, p.y + 0.6); p.y = groundAt(p.x, p.z, 0.2, p.y + 0.3);
          const v = Math.hypot(k.vx, k.vz); if (v > 0.2) k.root.rotation.y = Math.atan2(k.vx, k.vz);
          k.ph += dt * v * 6; const sw = Math.sin(k.ph) * 0.6; k.cat.legs[0].rotation.x = sw; k.cat.legs[3].rotation.x = sw; k.cat.legs[1].rotation.x = -sw; k.cat.legs[2].rotation.x = -sw; k.cat.tail.rotation.x = 0.7;
        }
        api.progress(got / 2);
        if (got >= 2) return api.finish({ success: true, mult: 1 });
        if (time <= 0) return api.finish({ success: false });
      },
      stop() { P.carryKitten = false; for (const k of o.kittens) W.group.remove(k.root); o.kittens = []; },
    };
  },

  // Горящая урна: туши огнетушителем, водяным пистолетом или шариками с водой
  firebin(o, api, ctx) {
    const P = ctx.player, f = o.fire;
    const hasTool = P.held && ['extinguisher', 'water', 'balloon'].includes(P.held.type);
    // огнетушитель рядом: подсвечен контуром, кольцом и стрелкой навигатора, пока не возьмёшь
    let ext = null; if (!hasTool) { const p = nearbyItemPoint(o.pos()); ext = spawnTool(p.x, p.y + 0.3, p.z, false, 'extinguisher'); ext.life = 999; }
    const rg = ringMark(0xff8a1f); let hint = '';
    const say = h => { if (h !== hint) { hint = h; api.msg(h); } };
    let time = 68;
    const hook = (it, p) => { if (it.type === 'balloon' && Math.hypot(p.x - f.x, p.z - f.z) < 1.6) { f.hp -= 0.45; splash(f.x, f.y + 1, f.z, 1); } };
    W.hitHooks.push(hook);
    const armed = () => P.held && ['extinguisher', 'water', 'balloon'].includes(P.held.type);
    return {
      target: () => !armed() && ext && ext.state !== 'gone' ? ext.pos : o.pos(),
      prompt: () => !armed() && ext && ext.state === 'rest' && Math.hypot(ext.pos.x - P.pos.x, ext.pos.z - P.pos.z) < 1.5 ? '<b>E</b>Взять огнетушитель' : '',
      update(dt) {
        time -= dt; api.timer(time); api.progress(1 - Math.max(0, f.hp));
        const showExt = !armed() && ext && ext.state === 'rest'; rg.visible = showExt; if (ext) ext.outline.set(showExt);
        if (showExt) { rg.position.set(ext.pos.x, ext.pos.y - ext.def.r + 0.04, ext.pos.z); rg.scale.setScalar(0.45 + Math.abs(Math.sin(performance.now() * 0.006)) * 0.2); say('1) Возьми огнетушитель (E) — он подсвечен'); }
        else if (armed()) say(P.held.type === 'balloon' ? 'Кидай шарик в огонь (ПКМ)!' : 'Зажми ЛКМ и целься в огонь!');
        if (f.hp <= 0) { const p = o.pos(); for (let i = 0; i < 8; i++) puff(p.x, p.y + 1, p.z, { color: 0xd8d8e0, size: 0.4, vy: 2, life: 1.2, grow: 1.5 }); sfx('hiss', { at: p }); return api.finish({ success: true, mult: 1 }); }
        if (time <= 0) api.finish({ success: false });
      },
      stop() { W.hitHooks.splice(W.hitHooks.indexOf(hook), 1); W.group.remove(rg); if (ext) { ext.outline.set(false); ext.life = 30; } },
    };
  },
};
void glow; void launch; void iconCanvas; void smokeRing;
