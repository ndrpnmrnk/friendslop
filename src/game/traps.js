import { THREE, G, V3, col, tmat, lam, compose, mesh } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { burst, puff, smokeRing } from '../world/particles.js';
import { addItem } from './items.js';
import { actors, knockDown } from './actors.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';
import { shake } from './worldfx.js';

/* Ловушки по городу:
   - грабли: наступил на зубья — ручка бьёт по лбу (сбивает с ног);
   - подушка-пердушка: сел/прыгнул — «пррр», подкидывает;
   - скользкий люк: масляное пятно;
   - качели-катапульта: прыгнул на поднятый конец — того, кто стоит на другом, запускает в небо.
   Грабли и подушку можно подобрать (E) и поставить другому (ЛКМ). */
const TR = () => W.traps2 || (W.traps2 = []);
const RAKE = () => compose('rake', a => { const w = tmat(T.wood()), m = col(0x8a8d98); a(G.box, w, 0, 0.03, 0.75, 0.05, 0.05, 1.5); a(G.box, m, 0, 0.03, 0, 0.5, 0.04, 0.06); for (let i = 0; i < 7; i++) a(G.box, m, -0.21 + i * 0.07, 0.07, -0.04, 0.02, 0.1, 0.02); });
const CUSHION = () => compose('cushion', a => { const p = lam({ color: 0xff5a9e }, 'cushion'); a(G.sph10, p, 0, 0.05, 0, 0.2, 0.06, 0.2); a(G.cyl6, p, 0, 0.05, 0.22, 0.04, 0.08, 0.04, Math.PI / 2); a(G.box, col(0xf1e8ff), 0, 0.105, 0, 0.12, 0.004, 0.03); });

// поставить грабли / подушку (мир или с рук)
export function placeRake(x, y, z, ry, owner = null) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; W.group.add(g); W.keep.push(g);
  const handle = new THREE.Group(); handle.add(RAKE()); g.add(handle);
  const fx = Math.sin(ry), fz = Math.cos(ry);
  const t = { kind: 'rake', g, handle, x, y, z, hx: x - fx * 0.0, hz: z - fz * 0.0, ry, k: 0, cd: 0, owner };
  TR().push(t); addPick(t); return t;
}
export function placeCushion(x, y, z, owner = null) {
  const g = CUSHION(); g.position.set(x, y, z); W.group.add(g); W.keep.push(g);
  const t = { kind: 'cushion', g, x, y, z, cd: 0, owner, sq: 0 }; TR().push(t); addPick(t); return t;
}
function addPick(t) {
  const q = { get x() { return t.x; }, get z() { return t.z; }, get y() { return t.y; }, r: 1.0, dy: 1.2, label: 'Подобрать', enabled: P => !P.held && !t.gone,
    act: P => { t.gone = true; W.group.remove(t.g); W.interacts.splice(W.interacts.indexOf(q), 1); const it = addItem(t.kind, P.pos.x, P.pos.y, P.pos.z); it.state = 'held'; P.held = it; } };
  W.interacts.push(q);
}
// качели-катапульта: доска на опоре, концы A и B вдоль оси ry
export function addSeesaw(b, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(b.X(x), b.Y, b.Z(z)); g.rotation.y = ry; W.group.add(g);
  g.add(compose('seesawBase', a => { const r = col(0xd8243a); a(G.cone4, r, 0, 0.3, 0, 0.35, 0.6, 0.35, 0, Math.PI / 4); a(G.box, col(0x2b2533), 0, 0.62, 0, 0.12, 0.12, 0.5); }));
  const plank = new THREE.Group(); plank.position.y = 0.62; g.add(plank); W.keep.push(plank);
  plank.add(compose('seesawPlank', a => { const w = tmat(T.wood()); a(G.box, w, 0, 0.05, 0, 0.5, 0.08, 3.6); for (const s of [-1, 1]) { a(G.box, col(0xf5c542), 0, 0.12, s * 1.65, 0.48, 0.06, 0.3); a(G.box, col(0x2b2533), 0, 0.4, s * 1.35, 0.4, 0.05, 0.05); a(G.box, col(0x2b2533), 0, 0.25, s * 1.35, 0.05, 0.3, 0.05); } }));
  const fx = Math.sin(ry), fz = Math.cos(ry);
  const t = { kind: 'seesaw', plank, x: b.X(x), y: b.Y, z: b.Z(z), fx, fz, side: 1, k: 1, cd: 0 };
  plank.rotation.x = 0.32; TR().push(t); return t;
}

export function updateTraps(dt, t) {
  for (const q of TR()) {
    if (q.gone) continue;
    if (q.cd > 0) q.cd -= dt;
    if (q.kind === 'rake') {
      // ручка: взлетает и падает обратно
      if (q.k > 0) { q.k = Math.max(0, q.k - dt * 2.2); q.handle.rotation.x = -Math.sin(Math.min(1, q.k * 1.4) * Math.PI / 2) * 1.35; }
      if (q.cd > 0) continue;
      for (const a of actors()) { if (a.hidden || !a.onGround) continue; const dx = a.pos.x - q.x, dz = a.pos.z - q.z; if (Math.hypot(dx, dz) < 0.42 && Math.abs(a.pos.y - q.y) < 0.4 && Math.hypot(a.vel.x, a.vel.z) > 1) {
        q.k = 1; q.cd = 2; sfx('bonk', { at: a.pos }); knockDown(a, -a.vel.x * 0.3, -a.vel.z * 0.3, 1.1); voice(a.ch, 'hurt', a === W.player ? undefined : a.pos); shake(a === W.player ? 0.25 : 0.05);
        burst(a.pos.x, a.pos.y + 1.5, a.pos.z, 6, { color: 0xf5c542, size: 0.14, speed: 2, up: 1.5 }); W.onFunny && W.onFunny(a, 'rake', q.owner); break; } }
    } else if (q.kind === 'cushion') {
      if (q.sq > 0) { q.sq -= dt; q.g.scale.set(1 + q.sq, 1 - q.sq * 1.5, 1 + q.sq); } else q.g.scale.set(1, 1, 1);
      if (q.cd > 0) continue;
      for (const a of actors()) { if (a.hidden) continue; if (Math.hypot(a.pos.x - q.x, a.pos.z - q.z) < 0.45 && a.pos.y - q.y < 0.25 && a.pos.y - q.y > -0.3 && (a.landed || a.landedNow || a.onGround)) {
        q.cd = 1.5; q.sq = 0.5; sfx('fart', { at: q }); a.vel.y = 7.5; a.onGround = false; a.knockT = 0.3; for (let i = 0; i < 6; i++) puff(q.x, q.y + 0.2, q.z, { color: 0x9be36b, size: 0.35, vx: (Math.random() - 0.5) * 1.5, vy: 0.6, vz: (Math.random() - 0.5) * 1.5, life: 1.2, grow: 1.5, opacity: 0.5 });
        voice(a.ch, 'happy', a === W.player ? undefined : a.pos); W.onFunny && W.onFunny(a, 'cushion', q.owner); break; } }
    } else if (q.kind === 'seesaw') {
      const want = q.side * 0.32; q.plank.rotation.x += (want - q.plank.rotation.x) * Math.min(1, dt * 14);
      if (q.cd > 0) continue;
      // поднятый конец (side): кто приземлился на него с высоты — тот перекидывает доску
      const upEnd = [q.x - q.fx * 1.6 * q.side, q.z - q.fz * 1.6 * q.side], lowEnd = [q.x + q.fx * 1.6 * q.side, q.z + q.fz * 1.6 * q.side];
      let trig = null;
      for (const a of actors()) if (Math.hypot(a.pos.x - upEnd[0], a.pos.z - upEnd[1]) < 0.8 && (a.landed || a.landedNow) && Math.abs(a.pos.y - q.y) < 0.6) trig = a;
      for (const it of W.items) if (it.state === 'fly' && it.def.heavy && Math.hypot(it.pos.x - upEnd[0], it.pos.z - upEnd[1]) < 0.8 && it.pos.y < q.y + 1.2) trig = trig || it;
      if (!trig) continue;
      q.side = -q.side; q.cd = 0.8; sfx('spring', { at: { x: q.x, y: q.y, z: q.z } }); smokeRing(q.x, q.y + 0.1, q.z, 6, { speed: 2 });
      for (const a of actors()) if (a !== trig && Math.hypot(a.pos.x - lowEnd[0], a.pos.z - lowEnd[1]) < 0.9 && Math.abs(a.pos.y - q.y) < 0.8) {
        a.vel.set(q.fx * q.side * -3, 14, q.fz * q.side * -3); a.onGround = false; a.airPeak = a.pos.y; a.knockT = 0.5; voice(a.ch, 'happy', a === W.player ? undefined : a.pos); W.onFunny && W.onFunny(a, 'catapult');
      }
      for (const it of W.items) if (it.state === 'rest' && Math.hypot(it.pos.x - lowEnd[0], it.pos.z - lowEnd[1]) < 0.9) { it.state = 'fly'; it.vel.set(q.fx * q.side * -2, 12, q.fz * q.side * -2); }
    }
  }
}
void V3; void mesh;
