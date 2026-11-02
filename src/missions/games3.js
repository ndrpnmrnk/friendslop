import { random } from '../core/random.js';
import { buildLampRepair,screwBulb } from './bulb.js';
import { cargoPosition } from '../game/handheld.js';
import { nearbyItemPoint } from './location.js';
import { THREE, G, V3, mesh, col, tmat, lam, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid, groundAt, pushOut, isFree,raySolids } from '../world/physics.js';
import { burst, puff, smokeRing, splash } from '../world/particles.js';
import { addItem, launch, drop } from '../game/items.js';
import { buildCat, COATS } from '../game/cats.js';
import { iconCanvas, icon } from '../ui/icons.js';
import { SKINS } from '../characters/skins.js';
import { spawnTool } from '../game/tools.js';
import { startEmote } from '../game/grab.js';
import { sfx } from '../core/sfx.js';

/* Миссии v0.14:
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
  let t = 0; const tick = dt => { t += dt; ph.position.x = Math.sin(t * 60) * 0.012 * (Math.sin(t * 2) > 0 ? 1 : 0); ph.rotation.y = ph.position.x * 2; if (Math.sin(t * 2) > 0 && random() < dt * 2) { const P = W.player; if (P && Math.hypot(P.pos.x - sp.x, P.pos.z - sp.z) < 14) sfx('ring', { at: { x: sp.bx, y: sp.by, z: sp.bz }, v: 0.6 }); } };
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
    if (t <= 0) { const k=Math.max(0.08,Math.min(1,f.hp));t=0.05+(1-k)*0.12; puff(p.x + (random() - 0.5) * 0.4, p.y + 0.95, p.z + (random() - 0.5) * 0.4, { color: random() < 0.5 ? 0xff8a1f : 0xf5c542, size: 0.16+0.12*k, vy: 0.35+1.85*k, vx: 0, vz: 0, life: 0.5, grow: -0.3, g: 0, opacity: 0.95 });
      if (random() < 0.3*k) puff(p.x, p.y + 1.2+0.4*k, p.z, { color: 0x3a3440, size: 0.4, vy: 1.4, life: 1.4, grow: 1.2, opacity: 0.5 }); }
    const P = W.player; if (P && Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < 0.9 && Math.abs(P.pos.y - p.y) < 1.5) { const dx = P.pos.x - p.x, dz = P.pos.z - p.z, d = Math.hypot(dx, dz) || 1; P.push.set(dx / d * 2.5, 0, dz / d * 2.5); }
    if (random() < dt * 1.5) sfx('fire', { at: p, v: 0.6 }); };
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
      botStep(dt, brain) { if(!brain.ready(0.65)||endT>0)return;const f=friends.find(q=>!q.sent);if(f){f.sent=STICK[(random()*STICK.length)|0];render();api.progress(friends.filter(q=>q.sent).length/friends.length);sfx('msg',{at:ctx.player.pos});}if(friends.every(q=>q.sent))endT=1.2; },
      update(dt) { if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); } },
      stop() { ui.remove(); },
    };
  },

  // Вкрутить лампочку: зажми ЛКМ и крути мышью по кругу вокруг патрона
  bulbScrew:screwBulb,

};

/* ---------- уличные ---------- */
export const WORLD3 = {


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
    o.kittens = [0, 1].map(i => { const k = buildCat(COATS[(random() * COATS.length) | 0]); k.root.scale.setScalar(0.85); const a = random() * 6.28, r = 5 + random() * 2.5;
      let x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; if (!isFree(x - 0.3, z - 0.3, x + 0.3, z + 0.3, c.y + 0.05, c.y + 0.8)) { x = c.x + Math.cos(a) * 3; z = c.z + Math.sin(a) * 3; }
      k.root.position.set(x, c.y, z); W.group.add(k.root); return { root: k.root, cat: k, vx: 0, vz: 0, vy: 0, wt: 0, wx: 0, wz: 0, st: 'run', dash: 0, rest: 0, holdT: 0, ph: random() * 6 }; });
    let time = 90, got = 0, held = null;
    api.msg('Лови котят — в коробку!');
    const toBox = k => { k.st = 'box'; got++; sfx('candy'); burst(c.x, c.y + 0.8, c.z, 10, { color: 0xc8a070, size: 0.14, speed: 1.5, up: 2 }); api.msg(got < 2 ? 'Один в коробке!' : 'Оба котёнка дома!', 'good'); };
    const release = (k, vx, vy, vz) => { k.st = 'fly'; k.vx = vx; k.vy = vy; k.vz = vz; if (held === k) held = null; };
    const near = () => o.kittens.filter(k => k.st === 'run').sort((a, b) => a.root.position.distanceTo(P.pos) - b.root.position.distanceTo(P.pos))[0];
    const catchable=k=>{if(!k||P.held||Math.abs(k.root.position.y-P.pos.y)>.8||k.root.position.distanceTo(P.pos)>=1.3)return false;const eye=P.pos.clone().add(new V3(0,.8,0)),to=k.root.position.clone().add(new V3(0,.35,0)).sub(eye),len=to.length();return raySolids(eye,to.normalize(),len)>=len-.1;};
    return {
      target() { if (held) return c; const k = near(); return k ? k.root.position : c; },
      prompt() { if (held) return Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.6 ? '<b>E</b>Посадить в коробку' : '<b>ПКМ</b>Кинуть в коробку'; const k = near(); return catchable(k) ? '<b>ЛКМ</b>Схватить котёнка' : ''; },
      interact() {if(!held)return false;
        if (held) { if (Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.6) { const k = held; held = null; toBox(k); } else { const f = P.root.rotation.y; release(held, Math.sin(f) * 2, 2, Math.cos(f) * 2); } return true; }
        return false;
      },
      down(){if(held||P.stun>0||P.getT>0||P.heldBy)return false;const k = near(); if (catchable(k)) { k.st = 'held'; k.holdT = 2.2 + random() * 1.2; held = k; sfx('meow', { at: k.root.position }); k.cat.face('angry'); return true; }
        return false;
      },
      botStep(dt,brain){if(!held&&brain.ready(.20))this.down();},
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
            if (k.holdT <= 0 || P.stun > 0 || P.heldBy) { const a = random() * 6.28; release(k, Math.cos(a) * 4, 4, Math.sin(a) * 4); sfx('meow', { at: p }); api.msg('Вырвался!', 'bad'); }
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
          if (d < 6 && d > 0.01) { ax += dx / d * (6 - d) * 2.2; az += dz / d * (6 - d) * 2.2; if (k.dash <= 0 && k.rest <= 0) { k.dash = 1.1 + random() * 0.6; k.rest = 0.7 + random() * 0.5; }
            sp = k.dash > 0 ? 9 : 4.5; k.cat.face('angry'); } else k.cat.face('open');
          if (W.lure && W.lure.t > 0) { const lx = W.lure.x - p.x, lz = W.lure.z - p.z, ld = Math.hypot(lx, lz); if (ld < 12 && ld > 0.3) { ax += lx / ld * 4; az += lz / ld * 4; sp = Math.min(sp, 3); } }
          k.wt -= dt; if (k.wt <= 0) { const a = random() * 6.28; k.wx = Math.cos(a); k.wz = Math.sin(a); k.wt = 1 + random() * 2; }
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
      prompt: () => !armed() && ext && ext.state === 'rest' && Math.hypot(ext.pos.x - P.pos.x, ext.pos.z - P.pos.z) < 1.5 ? '<b>ЛКМ</b>Взять огнетушитель' : '',
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
