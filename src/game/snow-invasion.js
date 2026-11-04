import { random } from '../core/random.js';
import { THREE, V3, G, mesh, col, lam, glow, compose } from '../core/gfx.js';
import { W } from '../world/state.js';
import { addItem, launch } from './items.js';
import { burst, puff, smokeRing } from '../world/particles.js';
import { groundAt, isFree, moveBody } from '../world/physics.js';
import { actors, shove, daze } from './actors.js';
import { spawnCoin } from './coins.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';
import { shake, hitFreeze } from './worldfx.js';

/* v0.72 «Нашествие снеговиков» - общее событие-битва волнами (как Vampire Survivors / волны в Roblox).
   Злые снеговики падают с неба комьями и атакуют всех: ближние (2 HP), метатели (2 HP, замах перед броском),
   толстяки (4 HP, удар по земле с красным кругом-предупреждением), стайки мелких (1 HP). 5 волн, затем Снежный король (12 HP).
   Каждое попадание отрывает часть (ведро, морковка, рука-ветка, ком) - урон видно без полосок; последний удар - снеговик
   разлетается, иногда с фистом. Сложность растёт к концу и от числа живых игроков и ботов.
   Логика - у хоста; состояние врагов (числа) уходит гостям в снимке события, модели строятся у каждого (VIS). */
export const SNOW_TYPES = {
  grunt: { hp: 2, sp: 3.3, r: .45, sc: .8, atk: 'melee', pts: 30 },
  thrower: { hp: 2, sp: 2.7, r: .45, sc: .75, atk: 'throw', pts: 35 },
  fat: { hp: 4, sp: 1.7, r: .8, sc: 1.35, atk: 'slam', pts: 60 },
  mini: { hp: 1, sp: 4.8, r: .3, sc: .48, atk: 'melee', pts: 15 },
  king: { hp: 12, sp: 1.9, r: 1.3, sc: 2.3, atk: 'king', pts: 300 },
};
const WAVES = 5, VIS = new WeakMap(), BODY = new Map();
const snowM = () => lam({ color: 0xe8eef8, emissive: 0x2a3450, emissiveIntensity: .18 }, 'evilSnow72');
function model(type) {
  const T = SNOW_TYPES[type], g = new THREE.Group(), sc = T.sc, parts = [], w = snowM(), dk = col(0x17111f), stick = col(0x5a3a26);
  const part = (y, build) => { const p = new THREE.Group(); p.position.y = y * sc; g.add(p); build(p); parts.push(p); return p; };
  const base = part(.45, p => mesh(G.sph10, w, 0, 0, 0, .55 * sc, .5 * sc, .55 * sc, p));
  const mid = part(1.12, p => { mesh(G.sph10, w, 0, 0, 0, .4 * sc, .37 * sc, .4 * sc, p); for (let i = 0; i < 3; i++) mesh(G.sph, dk, 0, (-.1 + i * .12) * sc, .39 * sc, .04 * sc, .04 * sc, .03 * sc, p); });
  const head = part(1.65, p => { mesh(G.sph10, w, 0, 0, 0, .3 * sc, .28 * sc, .3 * sc, p);
    // злое лицо: красные светящиеся глаза, сведённые брови, оскал из угольков
    for (const s of [-1, 1]) { mesh(G.sph, glow(0xff3a3a), s * .1 * sc, .06 * sc, .26 * sc, .045 * sc, .05 * sc, .03 * sc, p); const b = mesh(G.box, dk, s * .1 * sc, .14 * sc, .27 * sc, .13 * sc, .03 * sc, .02 * sc, p); b.rotation.z = s * .5; }
    for (let i = 0; i < 5; i++) mesh(G.box, dk, (-.1 + i * .05) * sc, (-.1 + Math.abs(i - 2) * .02) * sc, .27 * sc, .03 * sc, .03 * sc, .02 * sc, p); });
  const hat = new THREE.Group(); hat.position.set(0, .3 * sc, 0); head.add(hat);
  if (type === 'king') { mesh(G.cyl8, lam({ color: 0xf5c542, emissive: 0x8a5a10, emissiveIntensity: .5 }, 'evilCrown72'), 0, .1 * sc, 0, .26 * sc, .16 * sc, .26 * sc, hat); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; mesh(G.cone4, lam({ color: 0xf5c542, emissive: 0x8a5a10, emissiveIntensity: .5 }, 'evilCrown72'), Math.cos(a) * .22 * sc, .26 * sc, Math.sin(a) * .22 * sc, .05 * sc, .14 * sc, .05 * sc, hat); } }
  else mesh(G.cyl8, col(type === 'fat' ? 0x6a2a2a : 0x4a5a6a), 0, .1 * sc, 0, .22 * sc, .26 * sc, .22 * sc, hat).rotation.z = .2;
  const nose = new THREE.Group(); nose.position.set(0, -.02 * sc, .28 * sc); head.add(nose); mesh(G.cone4, col(0xff8a1f), 0, 0, .12 * sc, .05 * sc, .26 * sc, .05 * sc, nose).rotation.x = Math.PI / 2;
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * .38 * sc, 0, 0); mid.add(a); const m = mesh(G.box, stick, s * .28 * sc, .12 * sc, 0, .6 * sc, .06, .06, a); m.rotation.z = s * .5;
    for (const f of [-1, 1]) { const q = mesh(G.box, stick, s * .55 * sc, (.28 + f * .05) * sc, 0, .16 * sc, .04, .04, a); q.rotation.z = s * (.5 + f * .6); } return a; });
  if (type === 'thrower') mesh(G.ico, w, 0, .2 * sc, 0, .14 * sc, .14 * sc, .14 * sc, arms[1]).position.x = .7 * sc;
  if (type === 'fat') { mesh(G.torus, col(0xd8243a), 0, .25 * sc, 0, .42 * sc, .42 * sc, .5, mid).rotation.x = Math.PI / 2; }
  // части, которые отрываются при уроне, в порядке приоритета
  const loose = [hat, nose, arms[0], arms[1], head];
  return { g, base, mid, head, arms, loose, flying: [] };
}
function detach(v, part, dir) {
  const wp = part.getWorldPosition(new V3()), wq = part.getWorldQuaternion(new THREE.Quaternion()); W.group.add(part); part.position.copy(wp); part.quaternion.copy(wq);
  v.flying.push({ m: part, v: new V3(dir.x * 3 + (random() - .5) * 3, 3 + random() * 2, dir.z * 3 + (random() - .5) * 3), w: new V3(random() * 10 - 5, random() * 10 - 5, random() * 10 - 5), t: 0 });
}
function shatter(v, e) { // последний удар: все части разлетаются, снежная пыль
  for (const p of [...v.g.children]) detach(v, p, new V3(random() - .5, 0, random() - .5));
  burst(e.x, e.y + .8, e.z, 18, { color: 0xf2f6ff, size: .3, speed: 4, up: 3 }); smokeRing(e.x, e.y + .1, e.z, 6, { speed: 2.5, color: 0xf2f6ff });
  v.dead = true;
}
// Видимая часть: одинаково у хоста и гостей, по числам из s.en
function syncVisual(s, dt, t) {
  let V = VIS.get(s); if (!V) { V = new Map(); VIS.set(s, V); }
  const seen = new Set();
  for (const e of s.en) { seen.add(e.id); let v = V.get(e.id);
    if (!v) { v = model(e.type); v.lost = 0; W.group.add(v.g); V.set(e.id, v); v.g.position.set(e.x, e.y, e.z); }
    if (v.dead) continue;
    while (v.lost < (e.lost || 0) && v.lost < v.loose.length - 1) { detach(v, v.loose[v.lost], new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw)).multiplyScalar(-1)); v.lost++; sfx('snowHit', { at: v.g.position }); }
    if (e.hp <= 0) { shatter(v, e); continue; }
    v.g.position.lerp(new V3(e.x, e.y, e.z), Math.min(1, dt * 14)); v.g.rotation.y = e.yaw;
    const k = SNOW_TYPES[e.type], walk = e.st === 'walk' ? 1 : 0, ph = t * (k.sp * 2.4) + e.id;
    v.g.rotation.z = Math.sin(ph) * .12 * walk; v.mid.rotation.x = e.st === 'wind' ? -.45 : e.st === 'strike' ? .5 : 0; v.base.position.y = .45 * k.sc + Math.abs(Math.sin(ph)) * .08 * walk * k.sc;
    for (const [i, a] of v.arms.entries()) if (a.parent === v.mid) a.rotation.x = e.st === 'wind' ? -1.4 : Math.sin(ph + i * Math.PI) * .6 * walk;
    v.g.scale.setScalar(e.flash > 0 ? 1.08 : 1);
  }
  for (const [id, v] of V) {
    for (const f of v.flying) { f.t += dt; f.v.y -= 12 * dt; f.m.position.addScaledVector(f.v, dt); f.m.rotation.x += f.w.x * dt; f.m.rotation.y += f.w.y * dt; f.m.rotation.z += f.w.z * dt;
      const gy = groundAt(f.m.position.x, f.m.position.z, .1, f.m.position.y + .5); if (f.m.position.y < gy + .1) { f.m.position.y = gy + .1; f.v.multiplyScalar(.4); f.v.y = Math.abs(f.v.y) * .3; }
      if (f.t > 2.2) { const k = Math.max(0, 1 - (f.t - 2.2) / .8); f.m.scale.set(k, Math.max(.01, k * k), k); if (k <= 0) f.m.removeFromParent(); } }
    v.flying = v.flying.filter(f => f.t < 3.05);
    if (!seen.has(id) || v.dead) { if (!v.flying.length) { v.g.removeFromParent(); V.delete(id); } else if (!seen.has(id)) v.g.visible = false; }
  }
}
export function snowInvasion(ctx, award) {
  const alive = () => actors().filter(a => !a.hidden && !a.drone && !a.eliminated);
  function spawn(s, type) {
    const all = alive(), hum = all.filter(a => !a.bot), pool = hum.length && random() < .75 ? hum : all; if (!pool.length) return; const P = pool[(random() * pool.length) | 0]; // чаще рядом с людьми
    for (let i = 0; i < 12; i++) { const a = random() * 6.28, r = type === 'king' ? 10 : 7 + random() * 8, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r, gy = groundAt(x, z, .5, P.pos.y + 3);
      if (Math.abs(gy - P.pos.y) > 2.5 || Math.abs(x) > (W.bounds || 60) - 3 || Math.abs(z) > (W.bounds || 60) - 3 || !isFree(x - .6, z - .6, x + .6, z + .6, gy + .1, gy + 3)) continue;
      const k = SNOW_TYPES[type], e = { id: ++s.nid, type, x, y: gy + 14, z, gy, yaw: random() * 6.28, hp: k.hp, lost: 0, st: 'fall', t: 0, cd: 1 + random(), flash: 0 };
      s.en.push(e); BODY.set(s.nid, { pos: new V3(x, gy + 14, z), vel: new V3(0, -6, 0), r: k.r, h: 1.9 * k.sc, step: .4, onGround: false }); return; }
  }
  function waveList(s) { // состав волны: растёт с номером волны и числом живых участников
    const n = alive().length, w = s.wave, base = Math.round(3 + n * 1.6 + w * 2.2), out = [];
    for (let i = 0; i < base; i++) { const r = random(); out.push(w >= 2 && r < .1 + w * .03 ? 'fat' : w >= 1 && r < .35 + w * .03 ? 'thrower' : w >= 3 && r < .55 ? 'mini' : 'grunt'); }
    if (w >= 2) for (let i = 0; i < w + n; i++) out.push('mini');
    return out;
  }
  function hurt(s, e, dmg, owner, dir) {
    if (e.hp <= 0 || e.st === 'fall') return; e.hp -= dmg; e.flash = .15; e.lost = Math.min(4, (e.lost || 0) + dmg); hitFreeze(.03); sfx('bonk', { at: { x: e.x, y: e.y + 1, z: e.z } });
    const b = BODY.get(e.id); if (b && dir) { b.vel.x += dir.x * 5 / SNOW_TYPES[e.type].sc; b.vel.z += dir.z * 5 / SNOW_TYPES[e.type].sc; b.vel.y = 3; b.onGround = false; }
    // комбо: удары подряд (до 2.5 с между ними) дают множитель очков
    if (owner) { const c = s.combo.get(owner) || { n: 0, t: 0 }; c.n = c.t > 0 ? c.n + 1 : 1; c.t = 2.5; s.combo.set(owner, c); if (owner === ctx.player()) s.myCombo = c.n; award(owner, 5 * Math.min(5, 1 + Math.floor(c.n / 3)), { x: e.x, y: e.y + 1.5, z: e.z }); }
    if (e.hp <= 0) { s.kills++; s.left = Math.max(0, s.left - 1); const k = SNOW_TYPES[e.type]; if (owner) { award(owner, k.pts, { x: e.x, y: e.y + 1.5, z: e.z }); owner.st && (owner.st.snowfight = (owner.st.snowfight || 0) + 1); }
      sfx('snowPack', { at: { x: e.x, y: e.y, z: e.z } }); if (random() < (e.type === 'king' ? 1 : e.type === 'fat' ? .6 : .2)) for (let i = 0; i < (e.type === 'king' ? 8 : 1); i++) { const c = spawnCoin(e.x, e.y + 1, e.z, true); if (c) c.vel.set((random() - .5) * 6, 4 + random() * 2, (random() - .5) * 6); }
      else if (random() < .3) addItem('snowball', e.x, e.y + .3, e.z);
      if (e.type === 'king') { shake(.6); sfx('fanfare'); s.won = true; } BODY.delete(e.id); e.dieT = 1.5; }
  }
  const nearestEnemy = (p, max) => { let best = null, bd = max; for (const e of [] .concat(W.snowInv?.en || [])) { if (e.hp <= 0 || e.st === 'fall') continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = e; } } return best; };
  return {
    dur: 120,
    start(s) {
      Object.assign(s, { en: [], nid: 0, wave: 0, waves: WAVES, phase: 'rest', rest: 4, queue: [], spawnT: 0, total: 1, left: 0, kills: 0, rings: [], balls: [], won: false, myCombo: 0 });
      s.combo = new Map(); W.snowInv = s;
      // красный круг-предупреждение удара по земле (общий пул)
      const ringM = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 6; i++) { const m = mesh(new THREE.RingGeometry(.85, 1, 32), ringM, 0, -99, 0, 1, 1, 1, W.group); m.rotation.x = -Math.PI / 2; m.renderOrder = 4; m.visible = false; s.rings.push(m); }
      // удар кулаком: ЛКМ с пустыми руками рядом со снеговиком (main.js)
      W.enemyPunch = (P) => { if (W.net?.replica) return false; const f = P.root.rotation.y, p = { x: P.pos.x + Math.sin(f) * .8, z: P.pos.z + Math.cos(f) * .8 }, e = nearestEnemy(p, 1.6); if (!e || (P.punchCD || 0) > 0) return false;
        P.punchCD = .32; P.swatT = .25; hurt(s, e, 1, P, new V3(Math.sin(f), 0, Math.cos(f))); return true; };
      // перекат, выпад, взрывы - через общий worldHit
      (W.fortHooks ??= []).push(s.hook = (p, power) => { if (power < 3 || W.net?.replica) return; for (const e of s.en) if (e.hp > 0 && e.st !== 'fall' && Math.hypot(e.x - p.x, e.z - p.z) < SNOW_TYPES[e.type].r + 1 && Math.abs(e.y + 1 - p.y) < 2) {
        let o = null, od = 2.6; for (const a of actors()) { const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z); if (d < od) { od = d; o = a; } } const dir = new V3(e.x - p.x, 0, e.z - p.z).normalize(); hurt(s, e, power >= 5 ? 2 : 1, o, dir); } });
    },
    update(s, dt, t) {
      for (const c of s.combo.values()) c.t -= dt; if ((s.combo.get(ctx.player())?.t || 0) <= 0) s.myCombo = 0;
      const pool = alive();
      // волны: передышка → очередь появления → бой → следующая; после 5-й - король
      if (s.phase === 'rest') { s.rest -= dt; if (s.rest <= 0) { s.wave++; if (s.wave > WAVES) { s.phase = 'boss'; s.queue = ['king', ...Array(3 + pool.length).fill('mini')]; } else { s.phase = 'fight'; s.queue = waveList(s); } s.total = s.left = s.queue.length; sfx('event'); shake(.2); } }
      if ((s.phase === 'fight' || s.phase === 'boss') && s.queue.length) { s.spawnT -= dt; if (s.spawnT <= 0) { s.spawnT = s.phase === 'boss' && s.queue[0] === 'king' ? 0 : Math.max(.25, 1.1 - s.wave * .15); spawn(s, s.queue.shift()); } }
      if (s.phase === 'fight' && !s.queue.length && !s.en.some(e => e.hp > 0)) { s.phase = 'rest'; s.rest = 5; sfx('done'); burst(ctx.player().pos.x, ctx.player().pos.y + 2, ctx.player().pos.z, 20, { color: 0xf5c542, size: .2, speed: 4, up: 3 }); }
      if (s.phase === 'boss' && s.won) { s.phase = 'done'; s.doneT = 2.5; }
      if (s.phase === 'done') { s.doneT -= dt; if (s.doneT <= 0) return 'end'; }
      // враги
      for (const e of s.en) { const k = SNOW_TYPES[e.type], b = BODY.get(e.id); e.flash -= dt; if (e.hp <= 0) { e.dieT -= dt; continue; } if (!b) continue; e.t += dt; e.cd -= dt;
        if (e.st === 'fall') { b.vel.y -= 20 * dt; b.pos.y += b.vel.y * dt; if (b.pos.y <= e.gy) { b.pos.y = e.gy; b.vel.set(0, 0, 0); b.onGround = true; e.st = 'walk'; burst(b.pos.x, e.gy + .3, b.pos.z, 14, { color: 0xf2f6ff, size: .3 * k.sc, speed: 3, up: 2 }); smokeRing(b.pos.x, e.gy + .1, b.pos.z, 6 * k.sc, { speed: 2.5, color: 0xf2f6ff }); sfx('land', { at: b.pos, v: .6 + k.sc * .3 }); if (e.type === 'king') shake(.5); } }
        else {
          let tgt = null, td = 1e9; for (const a of pool) { const d = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) + Math.abs(a.pos.y - b.pos.y) * 2; if (d < td) { td = d; tgt = a; } }
          let mx = 0, mz = 0;
          if (tgt && (e.st === 'walk')) { const dx = tgt.pos.x - b.pos.x, dz = tgt.pos.z - b.pos.z, d = Math.hypot(dx, dz) || 1; e.yaw = Math.atan2(dx, dz);
            const want = k.atk === 'throw' ? (d > 9 ? 1 : d < 5 ? -1 : 0) : 1; mx = dx / d * want; mz = dz / d * want;
            const reach = k.atk === 'slam' ? 2.6 : k.atk === 'king' ? 3 : k.atk === 'throw' ? 11 : 1.3 + k.r;
            if (d < reach && e.cd <= 0) { e.st = 'wind'; e.t = 0; e.tgt = tgt; if (k.atk === 'slam' || k.atk === 'king') { const r = s.rings.find(q => !q.visible); if (r) { r.visible = true; r.position.set(b.pos.x, b.pos.y + .06, b.pos.z); r.scale.setScalar(k.atk === 'king' ? 4 : 3); e.ring = s.rings.indexOf(r); } } } }
          // разойтись с соседями
          for (const o of s.en) if (o !== e && o.hp > 0) { const dx = b.pos.x - o.x, dz = b.pos.z - o.z, d = Math.hypot(dx, dz), m = k.r + SNOW_TYPES[o.type].r; if (d > .01 && d < m) { mx += dx / d * .8; mz += dz / d * .8; } }
          const late = 1 + Math.min(.5, s.wave * .08); b.vel.x += (mx * k.sp * late - b.vel.x) * Math.min(1, dt * 6); b.vel.z += (mz * k.sp * late - b.vel.z) * Math.min(1, dt * 6);
          if (e.st !== 'walk') { b.vel.x *= Math.exp(-dt * 10); b.vel.z *= Math.exp(-dt * 10); }
          moveBody(b, dt);
          if (e.st === 'wind') { const wt = k.atk === 'throw' ? .6 : k.atk === 'melee' ? .35 : 1.0; if (e.ring != null) s.rings[e.ring].material.opacity = .3 + .4 * Math.abs(Math.sin(e.t * 12));
            if (e.t >= wt) { e.st = 'strike'; e.t = 0; const a = e.tgt;
              if (k.atk === 'melee' && a && Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < 1.7 + k.r) { const dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z; shove(a, dx, dz, e.type === 'mini' ? 4 : 7, 3, true); if (e.type !== 'mini') daze(a, .5); voice(a.ch, 'hurt', a.pos); sfx('hit', { at: a.pos }); }
              if (k.atk === 'throw' && a) { const from = new V3(b.pos.x, b.pos.y + 1.6 * k.sc, b.pos.z), to = a.pos.clone().add(a.vel.clone().multiplyScalar(.5)), d = to.clone().sub(from), h = Math.hypot(d.x, d.z), T2 = Math.max(.5, h / 13);
                const it = addItem('snowball', from.x, from.y, from.z); it.evil = true; launch(it, from, new V3(d.x / T2, d.y / T2 + 4.9 * T2, d.z / T2)); s.balls.push(it); sfx('throw', { at: from }); }
              if (k.atk === 'slam' || k.atk === 'king') { const R = k.atk === 'king' ? 4 : 3; for (const q of pool) { const dx = q.pos.x - b.pos.x, dz = q.pos.z - b.pos.z, d = Math.hypot(dx, dz); if (d < R && Math.abs(q.pos.y - b.pos.y) < 1.5) { shove(q, dx || .1, dz, 9, 6, true); daze(q, .9); voice(q.ch, 'hurt', q.pos); } }
                burst(b.pos.x, b.pos.y + .2, b.pos.z, 26, { color: 0xf2f6ff, size: .35, speed: 6, up: 3 }); smokeRing(b.pos.x, b.pos.y + .1, b.pos.z, R * 2, { speed: 4, color: 0xf2f6ff }); shake(.3); sfx('boom', { at: b.pos, v: .6 });
                if (e.ring != null) { s.rings[e.ring].visible = false; e.ring = null; }
                if (k.atk === 'king' && random() < .7) for (let i = 0; i < 2; i++) s.queue.push('mini'); } } }
          else if (e.st === 'strike' && e.t > .35) { e.st = 'walk'; e.cd = k.atk === 'throw' ? 1.8 + random() : k.atk === 'melee' ? 1.1 + random() * .6 : 2.6; }
          e.x = b.pos.x; e.y = b.pos.y; e.z = b.pos.z; } }
      // попадания брошенным (свои снежки снеговиков не ранят)
      for (const it of W.items) { if (it.state !== 'fly' || it.evil) continue; for (const e of s.en) { if (e.hp <= 0 || e.st === 'fall' || it._snowHit === e.id) continue; const k = SNOW_TYPES[e.type];
        if (Math.hypot(it.pos.x - e.x, it.pos.z - e.z) < k.r + it.def.r + .25 && it.pos.y > e.y - .2 && it.pos.y < e.y + 2 * k.sc) { it._snowHit = e.id; hurt(s, e, it.def.heavy ? 2 : 1, it.owner || it.thrownBy, it.vel.clone().setY(0).normalize()); it.vel.multiplyScalar(-.3); break; } } }
      // боты дерутся кулаками, если снеговик рядом
      for (const bt of W.bots || []) { if (bt.puppet || bt.stun > 0 || bt.hidden) continue; bt.punchCD = (bt.punchCD || 0) - dt; const e = nearestEnemy(bt.pos, 1.7); if (e && bt.punchCD <= 0) { bt.punchCD = .7 + random() * .6; bt.swatT = .25; bt.root.rotation.y = Math.atan2(e.x - bt.pos.x, e.z - bt.pos.z); hurt(s, e, 1, bt, new V3(e.x - bt.pos.x, 0, e.z - bt.pos.z).normalize()); } }
      // чистка: павшие и старые снежки врагов
      s.en = s.en.filter(e => e.hp > 0 || e.dieT > 0);
      s.balls = s.balls.filter(it => { if (it.state === 'rest' && !it.evilT) it.evilT = 6; if (it.evilT) { it.evilT -= dt; if (it.evilT <= 0 && it.state === 'rest') { it.g.visible = false; it.state = 'gone'; return false; } } return it.state !== 'gone' && it.state !== 'held'; });
      if (ctx.player().punchCD) ctx.player().punchCD -= dt;
      syncVisual(s, dt, t); return null;
    },
    replica(s, dt) { s._t = (s._t || 0) + dt; syncVisual(s, dt, s._t); },
    info(s) { return s.phase === 'boss' ? 'СНЕЖНЫЙ КОРОЛЬ! Бей кулаком (ЛКМ), перекатом и чем угодно' : s.phase === 'rest' ? `Передышка · волна ${Math.min(WAVES, s.wave + 1)} на подходе` : 'Бей снеговиков: ЛКМ - кулак, перекат, броски'; },
    target(s) { const e = s.en.find(q => q.hp > 0); return e ? new V3(e.x, e.y, e.z) : ctx.player().pos; },
    bot(s, b) { const e = nearestEnemy(b.pos, 30); if (!e) return null; if (b.held) return { who: { pos: new V3(e.x, e.y + .6, e.z), vel: new V3() }, kind: 'eventThrow', near: 40 }; return { x: e.x, y: e.y, z: e.z, kind: 'event', near: 1.2 }; },
    stop(s) { for (const r of s.rings) r.removeFromParent(); const V = VIS.get(s); if (V) for (const v of V.values()) { v.g.removeFromParent(); for (const f of v.flying) f.m.removeFromParent(); } for (const e of s.en) BODY.delete(e.id);
      W.fortHooks = (W.fortHooks || []).filter(h => h !== s.hook); W.enemyPunch = null; W.snowInv = null; },
    ui(s) { return { wave: Math.min(s.wave, WAVES), waves: WAVES, boss: s.phase === 'boss' || s.phase === 'done', left: s.left, total: s.total, rest: s.phase === 'rest' ? Math.ceil(s.rest) : 0, combo: s.myCombo || 0 }; },
  };
}
