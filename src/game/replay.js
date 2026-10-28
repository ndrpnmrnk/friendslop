import { THREE } from '../core/gfx.js';
import { W } from '../world/state.js';

/* v0.58 — повтор лучшего момента матча.
   Запись: 20 раз в секунду кольцевой буфер последних 6 с — персонажи (позиция, поворот, поза анимации),
   летящие/несомые предметы и катающиеся вещи. Позу берём ту же, что персонаж получил в animate (обёртка над ch.animate).
   Моменты: попадания, ловушки, трюки дают очки «зрелищности» (с участием игрока — больше, по лидеру — больше);
   события в пределах 2 с складываются. Когда момент «закрылся» (2 с после последнего события), если он лучше
   прежнего — копируем буфер (≈3.5 с до и 2 с после) как клип. В конце матча клип проигрывается в мире:
   тот же город, медленная съёмка в пике, камера облетает главного героя момента. */
const RATE = 1 / 20, KEEP = 6;
let buf = [], acc = 0, clock = 0, actors = [], pending = null, best = null;
const STATE_KEYS = ['speed', 'air', 'vy', 'climb', 'dive', 'roll', 'slide', 'crouch', 'hold', 'charge', 'throwT', 'landed', 'stun', 'getup', 'rag', 'daze', 'ride', 'rideSpeed', 'kick', 'trick', 'board', 'cyclePhase', 'rideAir', 'act', 'actK', 'emote', 'emoteT', 'held2', 'restrained', 'grabbed', 'swat', 'fly', 'vy2', 'flySpin', 'payload', 'sprint', 'accel', 'zombie', 'wave', 'look', 'dangle', 'missionTool'];
function hook(ch) { if (!ch || ch._recHook) return; const f = ch.animate; ch.animate = (dt, s) => { ch._lastS = s; return f.call(ch, dt, s); }; ch._recHook = true; }
const snapState = s => { if (!s) return null; const o = {}; for (const k of STATE_KEYS) if (s[k] !== undefined) o[k] = s[k]; return o; };

export function resetReplay(list) { buf = []; acc = 0; clock = 0; pending = null; best = null; actors = list.filter(Boolean); for (const a of actors) hook(a.ch); }
export function recordReplay(dt) {
  clock += dt; acc += dt;
  if (acc >= RATE) { acc = 0;
    const fr = { t: clock, a: [], i: [], p: [] };
    for (const a of actors) { const r = a.root; fr.a.push([a, r.position.x, r.position.y, r.position.z, r.rotation.x, r.rotation.y, r.rotation.z, r.visible, snapState(a.ch._lastS)]); }
    for (const it of W.items || []) if (it.state === 'fly' || it.state === 'held' || it.holder || it.g?.visible && it.vel?.lengthSq() > .01) { const g = it.g; fr.i.push([it, g.position.x, g.position.y, g.position.z, g.quaternion.x, g.quaternion.y, g.quaternion.z, g.quaternion.w, g.visible]); }
    for (const b of W.pushables || []) if (b.rider || Math.abs(b.vx || 0) + Math.abs(b.vz || 0) > .05) { const m = b.mesh; fr.p.push([b, m.position.x, m.position.y, m.position.z, m.rotation.x, m.rotation.y, m.rotation.z]); }
    buf.push(fr); while (buf.length && clock - buf[0].t > KEEP) buf.shift();
  }
  if (pending && clock > pending.until) { if (!best || pending.score > best.score) best = { score: pending.score, focus: pending.focus, at: pending.at, frames: buf.filter(f => f.t >= pending.at - 3.5).slice() }; pending = null; }
}
// событие матча: score — зрелищность, focus — кого снимать, at — когда (по часам записи)
export function replayMoment(score, focus) {
  if (!actors.length || !focus) return;
  if (pending && clock - pending.last < 2) { pending.score += score; pending.last = clock; pending.until = clock + 2; if (score >= 2) { pending.focus = focus; pending.at = clock; } return; }
  pending = { score, focus, at: clock, last: clock, until: clock + 2 };
}
export const replayClip = () => best && best.score >= 3 && best.frames.length > 20 ? best : null;

/* проигрывание: интерполяция между кадрами, у пика момента — замедление */
export function createReplayPlayer(clip) {
  const fr = clip.frames, t0 = fr[0].t, t1 = fr.at(-1).t, peak = clip.at; let t = t0, done = false;
  const rest = new Map(); // что было до повтора — вернуть после
  for (const f of fr) { for (const r of f.a) if (!rest.has(r[0])) rest.set(r[0], { kind: 'a', p: r[0].root.position.clone(), r: r[0].root.rotation.clone(), v: r[0].root.visible });
    for (const r of f.i) if (!rest.has(r[0])) rest.set(r[0], { kind: 'i', p: r[0].g.position.clone(), q: r[0].g.quaternion.clone(), v: r[0].g.visible });
    for (const r of f.p) if (!rest.has(r[0])) rest.set(r[0], { kind: 'p', p: r[0].mesh.position.clone(), r: r[0].mesh.rotation.clone() }); }
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), L = (a, b, k) => a + (b - a) * k;
  const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
  return {
    get done() { return done; }, get t() { return t - t0; }, get length() { return t1 - t0; },
    // скорость: у пика 0.35, далеко от пика 1
    speed() { const d = Math.abs(t - peak); return d < .5 ? .35 : d < 1.1 ? L(.35, 1, (d - .5) / .6) : 1; },
    focusPos(out) { const a = clip.focus; let f = fr.findLast(q => q.t <= t) || fr[0]; const r = f.a.find(q => q[0] === a); return r ? out.set(r[1], r[2], r[3]) : out.copy(a.root.position); },
    step(dt) {
      if (done) return; t = Math.min(t1, t + dt * this.speed()); if (t >= t1) done = true;
      let i = fr.findIndex(q => q.t > t); if (i <= 0) i = i < 0 ? fr.length - 1 : 1; const A = fr[i - 1], B = fr[i], k = B.t > A.t ? Math.min(1, (t - A.t) / (B.t - A.t)) : 0;
      for (const ra of A.a) { const a = ra[0], rb = B.a.find(q => q[0] === a) || ra, R = a.root;
        R.position.set(L(ra[1], rb[1], k), L(ra[2], rb[2], k), L(ra[3], rb[3], k)); R.rotation.order = 'YXZ'; R.rotation.set(L(ra[4], rb[4], k), lerpAng(ra[5], rb[5], k), L(ra[6], rb[6], k)); R.visible = ra[7];
        const s = ra[8]; if (s) a.ch.animate(dt * this.speed(), { ...s, t: t }); }
      for (const ri of A.i) { const it = ri[0], rb = B.i.find(q => q[0] === it) || ri, g = it.g; g.position.set(L(ri[1], rb[1], k), L(ri[2], rb[2], k), L(ri[3], rb[3], k));
        q1.set(ri[4], ri[5], ri[6], ri[7]); q2.set(rb[4], rb[5], rb[6], rb[7]); g.quaternion.slerpQuaternions(q1, q2, k); g.visible = ri[8]; g.updateMatrix?.(); g.updateMatrixWorld?.(true); }
      for (const rp of A.p) { const b = rp[0], rb = B.p.find(q => q[0] === b) || rp, m = b.mesh; m.position.set(L(rp[1], rb[1], k), L(rp[2], rb[2], k), L(rp[3], rb[3], k)); m.rotation.order = 'YXZ'; m.rotation.set(L(rp[4], rb[4], k), lerpAng(rp[5], rb[5], k), L(rp[6], rb[6], k)); m.updateMatrix?.(); m.updateMatrixWorld?.(true); }
    },
    // вернуть мир как был (итоги показывают пьедестал, но город не должен «застыть в прошлом»)
    restore() { for (const [o, s] of rest) { if (s.kind === 'a') { o.root.position.copy(s.p); o.root.rotation.copy(s.r); o.root.visible = s.v; } else if (s.kind === 'i') { o.g.position.copy(s.p); o.g.quaternion.copy(s.q); o.g.visible = s.v; } else { o.mesh.position.copy(s.p); o.mesh.rotation.copy(s.r); } } },
  };
}
