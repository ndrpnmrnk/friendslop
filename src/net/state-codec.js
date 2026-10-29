// Независимые от THREE правила протокола. В снимках только JSON, без сцен/геометрии.
export const SNAPSHOT_INTERVAL = .2, KEYFRAME_INTERVAL = 3;
export const MOTION_INTERVAL = .05, MOTION_DELAY = .075;
// Реальные часы: FPS и clamp игрового dt не замедляют сетевую частоту.
// После зависания отправляется одно актуальное состояние, без залпа старых пакетов.
export function nextSendAt(previous, now, interval) {
  return previous > 0 && now-previous < interval ? previous+interval : now+interval;
}
export const finite = (v, limit = 10000) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
export const vector = (a, n = 3, limit = 10000) => Array.isArray(a) && a.length === n && a.every(v => finite(v, limit));
export const round = v => Math.round((Number.isFinite(v) ? v : 0) * 1000) / 1000;
export const actorKey = (a, player, id) => !a ? '' : a === player ? 'p' + id : a.netKey || '';
const equal=(a,b)=>a===b||Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equal(v,b[i]));

export class StateDelta {
  constructor() { this.base = new Map(); this.last = new Map(); this.visited = new Map(); this.rev = 0; }
  baseline(records) { this.base = new Map(records); this.last = new Map(this.base); this.visited.clear(); this.rev = 0; }
  snapshot(records, full = false) {
    const rows = [], rev=++this.rev;
    for (const [k,v] of records) { if (!equal(v,(full ? this.base : this.last).get(k))) rows.push([k,v]);this.last.set(k,v);this.visited.set(k,rev); }
    for (const k of this.last.keys()) if (this.visited.get(k)!==rev) { rows.push([k,null]);this.last.delete(k);this.visited.delete(k); }
    return { rev, full, rows };
  }
}

// Один владелец миссии, токен попытки и одно начисление. Пакет прошлой попытки не подходит новой.
export class MissionLeases {
  constructor() { this.jobs = new Map(); this.next = 0; }
  claim(id, actor, now) {
    const old = this.jobs.get(id);
    if (old) return old.actor === actor ? old : null;
    const job = { actor, token: ++this.next, since: now, done: false };
    this.jobs.set(id, job); return job;
  }
  owns(id, actor, token) { const q = this.jobs.get(id); return !!q && q.actor === actor && q.token === token && !q.done; }
  finish(id, actor, token) { if (!this.owns(id, actor, token)) return false; this.jobs.get(id).done = true; return true; }
  release(id, actor, token) { if (!this.owns(id, actor, token)) return false; this.jobs.delete(id); return true; }
}

// Swept движение по мелким шагам: большой сетевой скачок не перескакивает через тонкую стену.
export function sweepPosition(from, to, radius, constrain) {
  if (!vector(from) || !vector(to)) return from;
  const n = Math.ceil(Math.hypot(to[0] - from[0], to[2] - from[2]) / Math.max(.08, radius * .45));
  if (n > 256) return from;
  const p = { x: from[0], y: from[1], z: from[2] };
  for (let i = 1; i <= Math.max(1, n); i++) {
    const x = p.x, z = p.z;
    p.x += (to[0] - from[0]) / Math.max(1, n); p.z += (to[2] - from[2]) / Math.max(1, n);
    p.y = from[1] + (to[1] - from[1]) * i / Math.max(1, n);
    constrain(p);
    if (Math.hypot(p.x - x, p.z - z) < .0001 && n > 1) break;
  }
  return [p.x, p.y, p.z];
}
