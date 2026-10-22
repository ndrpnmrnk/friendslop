import { buildLampRepair,screwBulb } from './bulb.js';
import { cargoPosition } from '../game/handheld.js';
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
    if (t <= 0) { const k=Math.max(0.08,Math.min(1,f.hp));t=0.05+(1-k)*0.12; puff(p.x + (Math.random() - 0.5) * 0.4, p.y + 0.95, p.z + (Math.random() - 0.5) * 0.4, { color: Math.random() < 0.5 ? 0xff8a1f : 0xf5c542, size: 0.16+0.12*k, vy: 0.35+1.85*k, vx: 0, vz: 0, life: 0.5, grow: -0.3, g: 0, opacity: 0.95 });
      if (Math.random() < 0.3*k) puff(p.x, p.y + 1.2+0.4*k, p.z, { color: 0x3a3440, size: 0.4, vy: 1.4, life: 1.4, grow: 1.2, opacity: 0.5 }); }
    const P = W.player; if (P && Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < 0.9 && Math.abs(P.pos.y - p.y) < 1.5) { const dx = P.pos.x - p.x, dz = P.pos.z - p.z, d = Math.hypot(dx, dz) || 1; P.push.set(dx / d * 2.5, 0, dz / d * 2.5); }
    if (Math.random() < dt * 1.5) sfx('fire', { at: p, v: 0.6 }); };
  W.animated.push(tick);
  return { type: 'fire', fire: f, spot: sp, f: [0, 1], pos: at, reach: 2.4,
    dispose() { const i = W.animated.indexOf(tick); if (i >= 0) W.animated.splice(i, 1); W.fires.splice(W.fires.indexOf(f), 1); if (can) { W.group.remove(can); sol.on = false; } } };
}
// погасший фонарь (лампочка перегорела)
export const buildDeadLamp=buildLampRepair;
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
  // Нарезка (v0.22): огурец лежит ЦЕЛЫЙ — режем поперёк пунктира (зажав ЛКМ), он распадается на кружки; потом так же помидор.
  // Потом клик — ставим миску, нарезка ссыпается в неё, и миску раскручиваем: зажать ЛКМ и водить мышью по кругу.
  saladCut(o, api, ctx) {
    api.feedback?.();
    const s = o.spot, F = new V3(s.f[0], 0, s.f[1]), top = s.y + 0.96;
    const c0 = new V3(s.bx, top, s.bz).addScaledVector(F, 0.05);
    api.pose(c0.clone().addScaledVector(F, 0.85).add(new V3(0, 0.95, 0)), c0.clone().addScaledVector(F, -0.05));
    const grp = new THREE.Group(); grp.position.copy(c0); grp.rotation.y = Math.atan2(F.x, F.z); W.group.add(grp);
    mesh(G.box, tmat(T.wood()), -0.12, 0.012, 0, 0.62, 0.025, 0.3, grp);
    const bowl = compose('bowl2', a => { a(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam({ color: 0xb8b0c8, side: THREE.DoubleSide }, 'bowl'), 0, 0.1, 0, 0.16, 0.1, 0.16);
      a(G.torus, col(0x8a84a0), 0, 0.1, 0, 0.16, 0.16, 0.06, Math.PI / 2); });
    const BX = 0.36; bowl.position.set(BX, 0, 0.6); bowl.visible = false; grp.add(bowl);
    const VEG = [{ k: 'cucumber', n: 5, len: 0.42, r: 0.045, inner: 0xc8e8a0 }, { k: 'tomato', n: 3, len: 0.2, r: 0.085, inner: 0xff8a6a }];
    const skin = [lam({ map: T.cucumberL() }, 'saladCuc2'), lam({ map: T.tomato() }, 'saladTom')];
    let vi = 0, chunks = [], meshes = [], lines = [], cuts = new Set(), phase = 'cut', drag = false, last = null, spinA = 0, lastA = null, endT = -1, moveT = 0;
    const done = [];
    const lineM = new THREE.MeshBasicMaterial({ color: 0xf1e8ff, transparent: true, opacity: 0.85 });
    const x0 = () => -0.12 - VEG[vi].len / 2;
    // перерисовать овощ: каждый кусок между разрезами — один меш (целый овощ = один кусок), на срезах — светлая мякоть
    const draw = () => {
      for (const m of meshes) grp.remove(m); meshes = []; const v = VEG[vi], w = v.len / v.n; let gap = 0;
      for (const [a, b] of chunks) { const len = (b - a) * w, cx = x0() + (a + b) / 2 * w + (a > 0 ? (gap += 0.012) : 0), g = new THREE.Group(); g.position.set(cx, 0.025 + v.r, 0); grp.add(g); meshes.push(g);
        if (vi === 0) { const m = mesh(G.cyl8, skin[0], 0, 0, 0, v.r, len, v.r, g); m.rotation.z = Math.PI / 2; }
        else mesh(G.sph10, skin[1], 0, 0, 0, Math.min(v.len / 2, len * 0.5 + 0.004), v.r, v.r, g);
        const half = vi ? Math.min(v.len / 2, len * 0.5 + 0.004) * 0.9 : len / 2 + 0.001;
        for (const [e, sg] of [[a, -1], [b, 1]]) if (e > 0 && e < v.n) { const d = mesh(G.disc, lam({ color: v.inner }, 'pulp' + v.inner), sg * half, 0, 0, v.r * (vi ? 0.8 : 0.9), v.r * (vi ? 0.8 : 0.9), 1, g); d.rotation.y = sg * Math.PI / 2; } }
    };
    const setup = () => {
      for (const l of lines) grp.remove(l); lines = []; cuts = new Set(); const v = VEG[vi], w = v.len / v.n; chunks = [[0, v.n]]; draw();
      for (let i = 1; i < v.n; i++) for (let k = 0; k < 4; k++) { const l = mesh(G.box, lineM, x0() + w * i, 0.03 + v.r * 2 + 0.005, -0.12 + k * 0.08, 0.008, 0.002, 0.04, grp); l.userData.i = i; lines.push(l); }
      api.msg(vi ? 'ТЕПЕРЬ ПОМИДОР! Режь поперёк' : 'РЕЖЬ ОГУРЕЦ! Зажми ЛКМ и веди поперёк', 'good'); api.progress(vi * 0.35);
    };
    setup();
    const local = ray => { const p = onPlane(ray, new V3(0, 1, 0), new V3(0, top + 0.05, 0)); return p ? grp.worldToLocal(p) : null; };
    // нарезанное — в сторону (назад по доске), потом всё ссыпается в миску
    const park = () => { for (const g of meshes) { const st = g.position.clone(), tg = new V3(st.x, st.y, -0.15); g.userData.anim = { st, tg, t: 0 }; done.push(g); } meshes = []; };
    const toBowl = () => { let k = 0; for (const g of done) { g.userData.anim = { st: g.position.clone(), tg: new V3(BX + (Math.random() - 0.5) * 0.14, 0.11 + k * 0.004, (Math.random() - 0.5) * 0.14), t: -0.12 * k, arc: 0.14 }; k++; } };
    const angleOf = ray => { const p = local(ray); return p ? Math.atan2(p.z, p.x - BX) : null; };
    return {
      botStep(dt, brain) { const a=brain.time*3;let q;if(phase==='cut'){q=new V3(-0.12+Math.sin(a)*0.32,0.05,0);grp.localToWorld(q);}else if(phase==='spin'){q=new V3(BX+Math.cos(a)*0.12,0.05,Math.sin(a)*0.12);grp.localToWorld(q);}else q=grp.localToWorld(new V3(0,0.05,0));const ray=brain.rayTo(q);if(!drag)this.down(ray);this.move(ray);if(phase==='bowl')this.down(ray); },
      down(ray) { drag = true; last = local(ray); lastA = angleOf(ray);
        if (phase === 'bowl') { phase = 'drop'; moveT = 0; bowl.visible = true; sfx('click'); api.msg('Миска на месте', 'good'); } },
      move(ray) {
        if (!drag) return;
        if (phase === 'spin') { const a = angleOf(ray); if (a === null || lastA === null) { lastA = a; return; } let da = a - lastA; da = Math.atan2(Math.sin(da), Math.cos(da)); lastA = a;
          if (Math.abs(da) < 1.2) spinA += Math.abs(da); const k = Math.min(1, spinA / (Math.PI * 6)); api.progress(0.7 + k * 0.3);
          if (k >= 1 && endT < 0) { endT = 1.0; api.msg('Салат готов!', 'good'); sfx('done'); } return; }
        if (phase !== 'cut') return; const p = local(ray); if (!p || !last) { last = p; return; }
        const v = VEG[vi], w = v.len / v.n;
        for (let i = 1; i < v.n; i++) { const lx = x0() + w * i; if (cuts.has(i)) continue;
          if ((last.x - lx) * (p.x - lx) < 0 && Math.abs(p.z) < 0.18) { cuts.add(i); sfx('chop');
            const ci = chunks.findIndex(([a, b]) => a < i && i < b), [a, b] = chunks[ci]; chunks.splice(ci, 1, [a, i], [i, b]); chunks.sort((q, r) => q[0] - r[0]); draw();
            for (const l of lines) if (l.userData.i === i) l.visible = false; const wp = grp.localToWorld(new V3(lx, 0.06, 0)); burst(wp.x, wp.y, wp.z, 5, { color: v.inner, size: 0.04, speed: 0.6, up: 0.6, g: 6, life: 0.4, grow: 0 }); } }
        last = p;
        if (cuts.size >= v.n - 1) { park(); api.progress((vi + 1) * 0.35);
          if (vi === 0) { vi = 1; phase = 'wait'; setTimeout(() => { phase = 'cut'; setup(); }, 450); } else { phase = 'bowl'; for (const l of lines) l.visible = false; api.msg('Поставь миску: клик по доске', 'good'); } }
      },
      up() { drag = false; last = null; lastA = null; },
      update(dt) {
        for (const g of done) { const A = g.userData.anim; if (!A || A.t >= 1) continue; A.t += dt / 0.35; const k = Math.min(1, Math.max(0, A.t)); g.position.lerpVectors(A.st, A.tg, k); if (A.arc) g.position.y += Math.sin(k * Math.PI) * A.arc; }
        if (phase === 'drop') { moveT += dt; bowl.position.z = Math.max(0, 0.6 - moveT * 2.4); if (bowl.position.z <= 0) { phase = 'fill'; moveT = 0; toBowl(); } }
        else if (phase === 'fill') { moveT += dt; if (moveT > 0.35 + done.length * 0.12) { phase = 'spin'; api.msg('МЕШАЙ! Зажми ЛКМ и крути по кругу', 'good'); api.progress(0.7); } }
        // миска крутится вслед за мышью, нарезка в ней ездит по кругу
        if (phase === 'spin' || endT > 0) { const r = spinA + (endT > 0 ? (1 - endT) * 10 : 0); bowl.rotation.y = -r; done.forEach((g, i) => { const a = -r + i * 1.3, rr = 0.05 + (i % 3) * 0.02; g.position.set(BX + Math.cos(a) * rr, 0.11 + (i % 4) * 0.01, Math.sin(a) * rr); g.rotation.y = -r; }); }
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); }
      },
      stop() { W.group.remove(grp); },
    };
  },

  // Мессенджер: кликни по каждому другу, выбери стикер — отправь
  phone(o, api, ctx) {
    api.feedback?.();
    const s = o.spot, F = new V3(s.f[0], 0, s.f[1]), c0 = new V3(s.bx, s.by + 0.05, s.bz);
    api.pose(c0.clone().addScaledVector(F, 0.55).add(new V3(0, 0.7, 0)), c0.clone());
    const friends = (W.bots || []).map(b => ({ b, name: b.name, skin: b.skin, sent: false }));
    const STICK = ['pumpkin', 'mask', 'cat', 'firework', 'duck', 'crown'];
    const ui = document.createElement('div'); ui.id = 'phoneui'; document.body.appendChild(ui); if(ctx?.bot){ui.id+='-bot-'+ctx.mission.id;ui.style.setProperty('display','none','important');}
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
      botStep(dt, brain) { if(!brain.ready(0.65)||endT>0)return;const f=friends.find(q=>!q.sent);if(f){f.sent=STICK[(Math.random()*STICK.length)|0];render();api.progress(friends.filter(q=>q.sent).length/friends.length);sfx('msg',{at:ctx.player.pos});}if(friends.every(q=>q.sent))endT=1.2; },
      update(dt) { if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } },
      stop() { ui.remove(); },
    };
  },

  // Вкрутить лампочку: зажми ЛКМ и крути мышью по кругу вокруг патрона
  bulbScrew:screwBulb,

};

/* ---------- уличные ---------- */
export const WORLD3 = {
  // Салат: огурец и помидор где-то рядом (подсвечены), принеси оба к кухне — дальше нарезка
  salad(o, api, ctx) {
    api.feedback?.();
    const s = o.spot, home = new V3(s.x, s.y, s.z), P = ctx.player, from = home;
    const items = ['cucumber', 'tomato'].map(k => { const p = farPoint(from, 4, 22); const it = addItem(k, p.x, p.y, p.z, Math.random() * 6); it.def = { ...it.def, respawn: 0 }; it.ring = ringMark(); return it; });
    let time = 112, hint = '';
    const say = h => { if (h !== hint) { hint = h; api.msg(h); } };
    const atHome = it => Math.hypot(it.pos.x - home.x, it.pos.z - home.z) < 1.8 && Math.abs(it.pos.y - home.y) < 1.6;
    return {
      botItems:()=>items,botPickable:it=>!atHome(it), botTarget:()=>P.held&&items.includes(P.held)?home:null,botDeposit:()=>home,botDrop:true,
      target() { if(items.includes(P.held))return home;const l = items.find(it => !atHome(it) && P.held !== it); if (l) { say(l.type === 'cucumber' ? 'Найди огурец' : 'Найди помидор'); return l.pos; } say('Неси на кухню'); return home; },
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
    api.feedback?.();
    const L=o.lamp,P=ctx.player,hx=o.hx,hz=o.hz,d=new V3(Math.sin(L.ry),0,Math.cos(L.ry));
    const p0 = farPoint(new V3(L.x, L.y, L.z), 6, 18), bulb = addItem('bulb', p0.x, p0.y, p0.z); bulb.def = { ...bulb.def, respawn: 0 }; bulb.mission = ctx.mission; bulb.mine = P; const rg = ringMark(0xf5c542);
    let time = 105, hint = '';
    const say = h => { if (h !== hint) { hint = h; api.msg(h); } };
    const up = () => P.pos.y > L.y + 1.7 && Math.hypot(P.pos.x - hx, P.pos.z - hz) < 1.4;
    return {
      botItems:()=>[bulb],botTarget:()=>P.held===bulb?new V3(hx,L.y+2.25,hz):bulb.pos,
      target() { if (P.held !== bulb) { say('1) Возьми лампочку (E) — жёлтое кольцо'); return bulb.pos; } if (!up()) { say('2) Залезь по стремянке к фонарю (W у лестницы)'); return new V3(hx + d.x * 0.8, L.y, hz + d.z * 0.8); } say('3) Нажми E — и вкрути лампочку мышью'); return new V3(L.lx, L.y + 3, L.lz); },
      prompt: () => P.held === bulb && up() ? '<b>E</b>Вкрутить лампочку' : '',
      interact() { if (P.held === bulb && up()) { api.finish({ chain: 'bulbScrew' }); return true; } return false; },
      update(dt) {
        time -= dt; api.timer(time); rg.visible = bulb.state === 'rest'; rg.position.set(bulb.pos.x, bulb.pos.y - 0.1, bulb.pos.z); bulb.outline.set(bulb.state === 'rest');
        api.progress(P.held === bulb ? (up() ? 0.66 : 0.33) : 0);
        if (bulb.state === 'held' && bulb.owner !== P) say('Лампочка у соперника - верни её');
        if (bulb.state === 'gone' || time <= 0) api.finish({ success: false });
      },
      stop() {  W.group.remove(rg);  if (P.held === bulb) P.held = null; bulb.outline.set(false); if(bulb.owner?.held===bulb)bulb.owner.held=null; bulb.state = 'gone'; bulb.g.visible = false; bulb.steal = null; },
    };
  },

  // Котята: двое носятся вокруг коробки и удирают от тебя. Догони, возьми на руки (E) и донеси до коробки —
  // или брось котёнка в коробку (ПКМ). На руках котёнок долго не сидит — вырывается и снова удирает.
  catbox(o, api, ctx) {
    api.feedback?.();
    const c = o.pos(), P = ctx.player, G2 = 22;
    o.kittens = [0, 1].map(i => { const k = buildCat(COATS[(Math.random() * COATS.length) | 0]); k.root.scale.setScalar(0.85); const a = Math.random() * 6.28, r = 5 + Math.random() * 2.5;
      let x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; if (!isFree(x - 0.3, z - 0.3, x + 0.3, z + 0.3, c.y + 0.05, c.y + 0.8)) { x = c.x + Math.cos(a) * 3; z = c.z + Math.sin(a) * 3; }
      k.root.position.set(x, c.y, z); W.group.add(k.root); return { root: k.root, cat: k, vx: 0, vz: 0, vy: 0, wt: 0, wx: 0, wz: 0, st: 'run', dash: 0, rest: 0, holdT: 0, ph: Math.random() * 6 }; });
    let time = 90, got = 0, held = null;
    api.msg('Лови котят — в коробку!');
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
            k.holdT -= dt; cargoPosition(P,p,0.42); p.y -= 0.3; k.root.rotation.y = P.root.rotation.y + Math.PI/2 + Math.sin(performance.now() * 0.03) * (k.holdT < 0.8 ? 0.6 : 0.2);
            const sw = Math.sin(performance.now() * 0.03) * 0.9; k.cat.legs.forEach((l, i) => (l.rotation.x = i % 2 ? sw : -sw));
            if (Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.1) { held = null; toBox(k); continue; }
            if (k.holdT <= 0 || P.stun > 0 || P.heldBy) { const a = Math.random() * 6.28; release(k, Math.cos(a) * 4, 4, Math.sin(a) * 4); sfx('meow', { at: p }); api.msg('Вырвался!', 'bad'); }
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
    api.feedback?.();
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
      botItems:()=>ext?[ext]:[],botStep(dt,brain){if(armed()&&Math.hypot(P.pos.x-f.x,P.pos.z-f.z)<4.5)brain.use(new V3(f.x,f.y+0.8,f.z),dt);},
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
