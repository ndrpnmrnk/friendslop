import { tipBin, animateTip } from './pushables.js';
import { W } from './state.js';
import { clamp } from '../core/rng.js';
import {bowlGround,moveBowlBoard,bowlLipLaunch,bowlContact,constrainBowlWheel,constrainBowlWalker} from './skate-bowl.js';

/* Твёрдые объекты — AABB с высотой: {x0,x1,z0,z1,y0,y1,on}.
   Всё, у чего верх ниже «шага», можно перешагнуть; на всё остальное — запрыгнуть или залезть. */
export function addSolid(x0, z0, x1, z1, y0, y1, tag) {
  const s = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1, on: true, tag, _st: 0 };
  W.solids.push(s); gridInsert(s);if(W.net&&!W.net.applying)W.net.register('s',s); return s;
}
/* Сетка 4×4 м: каждая проверка смотрит только на твёрдые объекты рядом, а не на все тысячи сразу */
const CELL = 4, ck = (i, j) => (i + 512) * 1024 + (j + 512);
function gridInsert(s) {
  const g = W.grid || (W.grid = new Map());
  for (let i = Math.floor(s.x0 / CELL); i <= Math.floor(s.x1 / CELL); i++) for (let j = Math.floor(s.z0 / CELL); j <= Math.floor(s.z1 / CELL); j++) {
    const k = ck(i, j); let a = g.get(k); if (!a) g.set(k, a = []); a.push(s);
  }
}
// Движущиеся твёрдые ящики обновляют только занятые ячейки сетки.
export function moveSolid(s,x0,z0,x1,z1,y0,y1){const old=[Math.floor(s.x0/CELL),Math.floor(s.x1/CELL),Math.floor(s.z0/CELL),Math.floor(s.z1/CELL)],next=[Math.floor(x0/CELL),Math.floor(x1/CELL),Math.floor(z0/CELL),Math.floor(z1/CELL)],changed=old.some((v,i)=>v!==next[i]);if(changed)for(let x=old[0];x<=old[1];x++)for(let z=old[2];z<=old[3];z++){const k=ck(x,z),a=W.grid?.get(k);if(a){const i=a.indexOf(s);if(i>=0)a.splice(i,1);if(!a.length)W.grid.delete(k);}}Object.assign(s,{x0,z0,x1,z1,y0,y1});if(changed)gridInsert(s);}
export function syncPushable(b){b.mesh.position.set(b.x,b.y+(b.meshOffsetY||0),b.z);if(b.solid){const r=b.h/2;moveSolid(b.solid,b.x-r,b.z-r,b.x+r,b.z+r,b.y,b.y+b.h);b.mesh.updateMatrixWorld(true);for(const q of b.piece?.inst||[]){q.mx.multiplyMatrices(b.mesh.matrixWorld,q.local);q.im.setMatrixAt(q.i,q.mx);q.im.instanceMatrix.needsUpdate=true;}}}
let stamp = 0; const _q = [];
// твёрдые объекты, пересекающие прямоугольник (без повторов). Результат переиспользуется — не хранить.
export function solidsNear(x0, z0, x1, z1, out = _q) {
  out.length = 0; stamp++;if(![x0,z0,x1,z1].every(Number.isFinite))return out;
  const g = W.grid; if (!g) return out;
  const i0 = Math.floor(x0 / CELL), i1 = Math.floor(x1 / CELL), j0 = Math.floor(z0 / CELL), j1 = Math.floor(z1 / CELL);
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400) { for (const s of W.solids) out.push(s); return out; }
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const a = g.get(ck(i, j)); if (!a) continue;
    for (const s of a) if (s._st !== stamp) { s._st = stamp; out.push(s); }
  }
  return out;
}
export const overlapXZ = (s, x, z, r) => x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1;

// Проёмы в земле (люки, канал коллектора): там нет «нулевой» земли, можно провалиться вниз
// v0.59: W.walk(x,z) — где вообще есть земля (хаб: два острова и мост); вне её — пропасть
// v0.60: люки (soft) — для транспорта закрыты: колёса прокатываются по крышке, а не проваливаются в шахту
let _cover = false;
const inHole = (x, z) => { if (W.walk && !W.walk(x, z)) return true; for (const h of W.holes) if (x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1 && !(h.soft && _cover)) return true; return false; };
const softHoleAt = (x, z) => { for (const h of W.holes) if (h.soft && x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1) return h; return null; };
/* Повёрнутые коробки (стрела крана, палуба катера): {cx, cz, yaw, lx0, lx1, lz0, lz1, y0, y1, on}.
   Точку переводим в локальные оси коробки и проверяем как обычный AABB. */
const _l = { x: 0, z: 0 };
export function obbLocal(o, x, z) { const c = Math.cos(o.yaw), s = Math.sin(o.yaw), dx = x - o.cx, dz = z - o.cz; _l.x = dx * c - dz * s; _l.z = dx * s + dz * c; return _l; }
export function addObb(o) { const b = { on: true, yaw: 0, ...o }; (W.obbs || (W.obbs = [])).push(b);if(W.net&&!W.net.applying)W.net.register('o',b); return b; }
export let groundObb = null;
let _selfP = null;
export function groundAt(x, z, r, maxY) {
  let g = maxY >= 0 && !inHole(x, z) ? 0 : -60; groundObb = null;
  // Smooth procedural skate bowl is a height field, not a ring of blocking walls.
  // Both rider wheels and on-foot actors sample the identical static surface.
  const bowlY=bowlGround(W.skateBowl,x,z,maxY);
  if(bowlY!==null)g=Math.max(g,bowlY);
  for (const s of solidsNear(x - r, z - r, x + r, z + r)) if (s.on && s.y1 <= maxY && s.y1 > g && overlapXZ(s, x, z, r)) g = s.y1;
  if (W.obbs) for (const o of W.obbs) { if (!o.on || o.y1 > maxY || o.y1 <= g) continue; const l = obbLocal(o, x, z); if (l.x + r > o.lx0 && l.x - r < o.lx1 && l.z + r > o.lz0 && l.z - r < o.lz1) { g = o.y1; groundObb = o; } }
  // на толкаемых предметах (бак, бочка, тележка) можно стоять, как на земле
  for (const b of W.pushables) { if (b.rider || b.grabbed || b === _selfP) continue; const top = b.y + b.h; if (top <= maxY && top > g && Math.hypot(x - b.x, z - b.z) < b.r * 0.92 + r * 0.5) g = top; }
  return g;
}

export function pushOut(p, r, yLow, yHigh) {
  let hit = false;
  for (const s of solidsNear(p.x - r, p.z - r, p.x + r, p.z + r)) {
    if (!s.on || s.oneWay || s.roof || s.y1 <= yLow || s.y0 >= yHigh) continue;
    const cx = clamp(p.x, s.x0, s.x1), cz = clamp(p.z, s.z0, s.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
    else {
      const l = p.x - s.x0, rr = s.x1 - p.x, bt = p.z - s.z0, tp = s.z1 - p.z, mn = Math.min(l, rr, tp, bt);
      if (mn === l) p.x = s.x0 - r; else if (mn === rr) p.x = s.x1 + r; else if (mn === bt) p.z = s.z0 - r; else p.z = s.z1 + r;
    }
  }
  if (W.obbs) for (const o of W.obbs) {
    if (!o.on || o.y1 <= yLow || o.y0 >= yHigh) continue;
    const l = obbLocal(o, p.x, p.z), lx = l.x, lz = l.z, cx = clamp(lx, o.lx0, o.lx1), cz = clamp(lz, o.lz0, o.lz1), dx = lx - cx, dz = lz - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true; let nx = lx, nz = lz;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = cx + dx / d * r; nz = cz + dz / d * r; }
    else { const a = lx - o.lx0, b2 = o.lx1 - lx, c2 = lz - o.lz0, e = o.lz1 - lz, mn = Math.min(a, b2, c2, e); if (mn === a) nx = o.lx0 - r; else if (mn === b2) nx = o.lx1 + r; else if (mn === c2) nz = o.lz0 - r; else nz = o.lz1 + r; }
    const c = Math.cos(o.yaw), s = Math.sin(o.yaw); p.x = o.cx + nx * c + nz * s; p.z = o.cz - nx * s + nz * c;
  }
  const B = W.bounds; p.x = clamp(p.x, -B, B); p.z = clamp(p.z, -B, B);
  return hit;
}

// Тела игроков не относятся к статическим стенам, но ограничивают каждый подшаг движения.
export function pushActorsOut(p,body){
  if(body.netProtected||body.holding||body.heldBy||body.ride)return;
  for(const a of [W.player,...(W.bots||[])]){
    if(!a||a===body||a.pos===body.pos||a.hidden||a.drone||a.returning||a.netProtected||a.ride||a.holding||a.heldBy||a.puppet&&!a.buf?.length)continue;
    if(Math.abs(a.pos.y-p.y)>=Math.min(a.h,body.h)*.75)continue;
    let dx=p.x-a.pos.x,dz=p.z-a.pos.z,d=Math.hypot(dx,dz),r=body.r+a.r;
    if(d>=r)continue;if(d<.00001){dx=body.pos.x<a.pos.x?-1:1;dz=0;d=1;}
    p.x=a.pos.x+dx/d*r;p.z=a.pos.z+dz/d*r;
  }
}
// Персонаж/животное: горизонталь, затем вертикаль с землёй и потолком
export function moveBody(b, dt, g = 22) {
  const p = b.pos, v = b.vel; _cover = !!(b.ride || b.riding);
  const oldX=p.x,oldZ=p.z,wasGrounded=b.onGround;
  const steps=Math.min(64,Math.max(1,Math.ceil(Math.hypot(v.x,v.z)*dt/Math.max(.08,b.r*.45))));
  for(let i=0;i<steps;i++){p.x+=v.x*dt/steps;p.z+=v.z*dt/steps;pushOut(p,b.r,p.y+b.step,p.y+b.h);if(b===W.player||(W.bots||[]).includes(b))pushActorsOut(p,b);}
  // Do not turn the near-vertical skate bowl into climbable floor/steps.
  if(!_cover&&(b===W.player||(W.bots||[]).includes(b)))
    constrainBowlWalker(W.skateBowl,p,v,oldX,oldZ,dt,wasGrounded);
  const oldY = p.y;
  if (!b.noGrav) v.y -= g * dt;
  // v0.60: в шахте люка спускаешься плавно, как по горке-трубе: скорость падения ограничена, без оглушения внизу
  if (!_cover && p.y < .3 && p.y > -6 && softHoleAt(p.x, p.z)) { if (v.y < -7) v.y = -7; if (b.airPeak !== undefined) b.airPeak = Math.min(b.airPeak, p.y + 1.5); }
  p.y += v.y * dt;
  // Потолок навеса останавливает прыжок, но не выталкивает в соседние ступени купола.
  for(const s of solidsNear(p.x-b.r*.5,p.z-b.r*.5,p.x+b.r*.5,p.z+b.r*.5))if(s.on&&s.roof&&overlapXZ(s,p.x,p.z,b.r*.5)&&oldY<s.y0-.1&&p.y+b.h>s.y0&&p.y<s.y0){p.y=s.y0-b.h-.015;v.y=Math.min(0,v.y);s.roofTouch=true;}
  const gy = groundAt(p.x, p.z, b.r * 0.6, Math.max(oldY, p.y) + b.step); b.groundObb = groundObb;
  b.landed = false;
  // Continuous shallow bowl contact while walking; prevent alternating
  // grounded/airborne states every time the ramp slopes down a few cm.
  const bowl=W.skateBowl,rad=bowl?Math.hypot(p.x-bowl.x,p.z-bowl.z):Infinity;
  const walkFollow=!!(bowl&&wasGrounded&&!_cover&&rad<bowl.rimRadius&&
    v.y<=0&&Math.abs(gy-oldY)<.34);
  if(walkFollow){p.y=gy;v.y=0;b.onGround=true;}
  else if (p.y <= gy) { if (v.y < -0.5 && !b.onGround) b.landed = true; p.y = gy; v.y = Math.max(0, v.y); b.onGround = true; }
  else b.onGround = false;
  if (v.y > 0) for (const s of solidsNear(p.x - b.r, p.z - b.r, p.x + b.r, p.z + b.r)) {
    if (s.on && !s.oneWay && overlapXZ(s, p.x, p.z, b.r * 0.6) && s.y0 >= oldY + b.h - 0.02 && s.y0 < p.y + b.h) { p.y = s.y0 - b.h; v.y = 0; }
  }
  b.ground = gy; _cover = false;
}

/* Зоны: вода, масло, лужи, щётки мойки. shape: {c:[x,z,r]} или {r:[x0,z0,x1,z1]} */
export function addZone(type, shape, y, extra = {}) { const z = { type, ...shape, y, ...extra }; W.zones.push(z); return z; }
export function zoneAt(x, z, y, type) {
  for (const q of W.zones) {
    if (type && q.type !== type) continue;
    if (Math.abs(y - q.y) > 0.6) continue;
    if (q.c ? Math.hypot(x - q.c[0], z - q.c[1]) < q.c[2] : (x > q.r[0] && x < q.r[2] && z > q.r[1] && z < q.r[3])) return q;
  }
  return null;
}

// Свободно ли место (для спавна объектов миссий)
export function isFree(x0, z0, x1, z1, y0, y1) {
  for (const s of solidsNear(x0, z0, x1, z1)) if (s.on && s.y1 > y0 && s.y0 < y1 && x1 > s.x0 && x0 < s.x1 && z1 > s.z0 && z0 < s.z1) return false;
  for (const q of W.zones) if (q.type === 'water' && Math.abs(q.y - y0) < 0.6 && (q.c ? (Math.max(x0, Math.min(q.c[0], x1)) - q.c[0]) ** 2 + (Math.max(z0, Math.min(q.c[1], z1)) - q.c[1]) ** 2 < q.c[2] ** 2 : x1 > q.r[0] && x0 < q.r[2] && z1 > q.r[1] && z0 < q.r[3])) return false;
  for (const l of W.ladders) if (x1 > l.x0 - 0.5 && x0 < l.x1 + 0.5 && z1 > l.z0 - 0.5 && z0 < l.z1 + 0.5) return false;
  return true;
}

// Точка внутри твёрдого объекта? (для летящих предметов) — возвращает нормаль удара
export function solidHit(p, r) {
  for (const s of solidsNear(p.x - r, p.z - r, p.x + r, p.z + r)) {
    if (!s.on || p.y + r < s.y0 || p.y - r > s.y1) continue;
    if (p.x + r < s.x0 || p.x - r > s.x1 || p.z + r < s.z0 || p.z - r > s.z1) continue;
    const pen = [[p.x + r - s.x0, -1, 0, 0], [s.x1 - (p.x - r), 1, 0, 0], [p.z + r - s.z0, 0, 0, -1], [s.z1 - (p.z - r), 0, 0, 1], [s.y1 - (p.y - r), 0, 1, 0], [p.y + r - s.y0, 0, -1, 0]];
    pen.sort((a, b) => a[0] - b[0]);
    return { s, depth: pen[0][0], n: [pen[0][1], pen[0][2], pen[0][3]] };
  }
  if (W.obbs) for (const o of W.obbs) {
    if (!o.on || p.y + r < o.y0 || p.y - r > o.y1) continue;
    const l = obbLocal(o, p.x, p.z); if (l.x + r < o.lx0 || l.x - r > o.lx1 || l.z + r < o.lz0 || l.z - r > o.lz1) continue;
    const pen = [[l.x + r - o.lx0, -1, 0, 0], [o.lx1 - (l.x - r), 1, 0, 0], [l.z + r - o.lz0, 0, 0, -1], [o.lz1 - (l.z - r), 0, 0, 1], [o.y1 - (p.y - r), 0, 1, 0], [p.y + r - o.y0, 0, -1, 0]];
    pen.sort((a, b) => a[0] - b[0]); const [d, nx, ny, nz] = pen[0], c = Math.cos(o.yaw), s = Math.sin(o.yaw);
    return { s: o, depth: d, n: [nx * c + nz * s, ny, -nx * s + nz * c] };
  }
  return null;
}

/* Толкаемые предметы: тележки и бочки */
export function recordImpact(b,hit,speed){if(hit&&!b.impactContact&&speed>1.8){b.impactSeq=(b.impactSeq||0)+1;b.impactSpeed=speed;}b.impactContact=hit;}
// Круг остаётся на воде и при езде, и при толкании/столкновении с другим предметом.
export function constrainWaterRide(b,previous={x:b.x,z:b.z}){
  if(!b.ride?.water)return true;
  const margin=b.r*.72,wet=(x,z)=>{for(let i=0;i<9;i++){const a=i*Math.PI/4,r=i===8?0:margin;if(!zoneAt(x+Math.cos(a)*r,z+Math.sin(a)*r,b.y,'water'))return false;}return true;};
  if(wet(b.x,b.z)){b.waterHome={x:b.x,z:b.z};return true;}
  const from=wet(previous.x,previous.z)?previous:b.waterHome;
  if(from){let lo=0,hi=1;for(let i=0;i<10;i++){const k=(lo+hi)/2;if(wet(from.x+(b.x-from.x)*k,from.z+(b.z-from.z)*k))lo=k;else hi=k;}b.x=from.x+(b.x-from.x)*lo;b.z=from.z+(b.z-from.z)*lo;}
  else{const q=zoneAt(previous.x,previous.z,b.y,'water');if(q?.c){const dx=b.x-q.c[0],dz=b.z-q.c[1],l=Math.hypot(dx,dz)||1,k=Math.min(l,Math.max(0,q.c[2]-margin-.02))/l;b.x=q.c[0]+dx*k;b.z=q.c[1]+dz*k;}else if(q?.r){b.x=clamp(b.x,q.r[0]+margin+.02,q.r[2]-margin-.02);b.z=clamp(b.z,q.r[1]+margin+.02,q.r[3]-margin-.02);}else{b.x=previous.x;b.z=previous.z;}}
  b.vx=b.vz=0;if(wet(b.x,b.z))b.waterHome={x:b.x,z:b.z};return false;
}
export function updatePushables(dt, player) {
  for (const b of W.pushables) {
    if(b.dead || W.net && !W.net.canSimulate(b))continue;
    if(b.solid)b.solid.on=false;
    if (b.grabbed) { b.hitSpeed = 0;if(b.solid)b.solid.on=true;syncPushable(b);continue; } // её ведёт игрок
    const op = { x: b.x, z: b.z };
    // Applied only to real skate/scooter riders inside the skatepark; all
    // other vehicles and other districts keep their existing physics.
    moveBowlBoard(b,dt,W.skateBowl);
    b.hitSpeed = 0;
    // v0.56: движение по шагам не длиннее половины радиуса — быстрые машинки и карты больше не проскакивают сквозь стены
    const y0 = b.y + (b.ride && b.kind !== 'ring' ? .5 : .2), mv = Math.hypot(b.vx, b.vz) * dt, n = Math.min(12, Math.max(1, Math.ceil(mv / Math.max(.08, b.r * .5))));
    const p = { x: b.x, z: b.z }; let hit = null;
    for (let i = 0; i < n; i++) { p.x += b.vx * dt / n; p.z += b.vz * dt / n; const h = pushOut(p, b.r, y0, b.y + 1); if (h) { hit = h; break; } }
    if (b.ride && b.rider && !isFree(p.x - b.r * .7, p.z - b.r * .7, p.x + b.r * .7, p.z + b.r * .7, y0, b.y + 1)) { p.x = op.x; p.z = op.z; hit = hit || true; }
    b.x = p.x; b.z = p.z;
    recordImpact(b,hit,Math.hypot(b.vx,b.vz));
    if (hit) { b.hitSpeed = Math.hypot(b.vx, b.vz); const k = b.kind === 'voteBall' ? -0.7 : -0.3; b.vx *= k; b.vz *= k; }
    b.x = p.x; b.z = p.z;constrainWaterRide(b,op);
    // Check the whole rim crossing, not just the old location. The existing
    // board now enters a genuine ballistic state instead of snapping to
    // street height at the first frame outside the bowl.
    if(!hit)bowlLipLaunch(b,op.x,op.z,W.skateBowl);
    // A skate/scooter cannot climb multiple vertical metres of bowl wall in
    // one tick due to the ground height being treated as a step.
    // v0.61.8: no position snapping by the old radial wheel clamp.
    // The continuous curved surface is now the single source of contact.
    if(!b.air)constrainBowlWheel(W.skateBowl,b,dt);
    const f = Math.exp(-dt * (b.rider ? b.ride.fric : { voteBall: .45, table: 6, sack: 7, barrel: 2.6, cart: 2.0, bin: b.tipped ? 6 : 4, skate: 0.6, chair: 1.6, barrow: 2.4, tire: 0.9, scooter: 0.8, kidcar: 2, ring: 1.2, gurney: 2.0 }[b.kind] ?? 4)); b.vx *= f; b.vz *= f;
    if (b.tipped) animateTip(b, dt);
    // колёсное едет по рельефу: заезжает на рампы, с разгона взлетает, падает со ступенек; скейт скользит по перилам
    if (b.ride && b.kind !== 'ring') {
      _selfP = b; _cover = !!b.ride; let gy = groundAt(b.x, b.z, b.r * 0.4, b.y + 0.35); _cover = false; _selfP = null; b.vy = b.vy || 0;
      if (W.rails && (b.kind === 'skate' || b.kind === 'scooter')) for (const r of W.rails) {
        const ex = r.x1 - r.x0, ez = r.z1 - r.z0, L2 = ex * ex + ez * ez, u = ((b.x - r.x0) * ex + (b.z - r.z0) * ez) / L2; if (u < 0 || u > 1) continue;
        const qx = r.x0 + ex * u, qz = r.z0 + ez * u; if (Math.hypot(b.x - qx, b.z - qz) > 0.35 || b.y < r.y - 0.25 || b.y > r.y + 0.7 || b.vy > 0.5) continue;
        gy = Math.max(gy, r.y); if (!b.grind) { b.grind = r; const now = performance.now(); if (b.lastRail !== r || now - (b.grindEnd || 0) > 400) W.onGrind && W.onGrind(b); b.lastRail = r; } // v0.59: одно касание перил = одно событие (раньше дребезг давал звук комбо каждый кадр) const L = Math.sqrt(L2), tx = ex / L, tz = ez / L, v = b.vx * tx + b.vz * tz; b.vx = tx * v; b.vz = tz * v; b.x = qx; b.z = qz;
      }
      if (b.grind && Math.abs(b.y - b.grind.y) > 0.05) { b.grind = null; b.grindEnd = performance.now(); }
      const board = b.kind === 'skate' || b.kind === 'scooter';
      const bowlContactNow=board&&!b.air?bowlContact(W.skateBowl,b.x,b.z,b.heading||0):null;
      // Follow continuous *grounded* bowl slope while rolling, not the
      // jumping/landing branch. A real jump or coping launch sets b.air
      // before we enter here and is always integrated ballistically.
      if(board&&!b.air&&W.skateBowl&&
         Math.hypot(b.x-W.skateBowl.x,b.z-W.skateBowl.z)<W.skateBowl.rimRadius&&
         Math.abs(b.y-gy)<.45){b.y=gy;b.vy=0;}
      if (b.air || b.y > gy + 0.02) {
        // True ballistic integration. Rising skaters NEVER snap to the next
        // platform. Landing requires downward motion and crossing the ground.
        const previousY=b.y;
        b.vy-=22*dt;
        const nextY=previousY+b.vy*dt;
        const landing=b.vy<=0&&nextY<=gy&&previousY>=gy-.12;
        if(landing){
          if(b.vy< -7&&b.rider)b.hardLand=-b.vy;
          b.y=gy;b.vy=0;b.air=false;b.bowlTakeoff=false;
        }else{b.y=nextY;b.air=true;}
        if(board)b.pitch=(b.pitch||0)*Math.exp(-dt*3);
      }else{
        const rise=gy-b.y;
        b.vy=0;
        if(board){
          if(bowlContactNow){
            // Curved bowl gravity already applied in moveBowlBoard:
            // do not apply a second downhill/uphill acceleration.
            b.pitch=b.bowlPitch||0;
          }else{
            const h=b.rider?b.heading:b.mesh.rotation.y,fx=Math.sin(h),fz=Math.cos(h);
            _selfP=b;_cover=!!b.ride;
            const gF=groundAt(b.x+fx*.35,b.z+fz*.35,.05,b.y+.7);
            const gB=groundAt(b.x-fx*.35,b.z-fz*.35,.05,b.y+.7);
            _cover=false;_selfP=null;
            const sl=Number.isFinite(gF)&&Number.isFinite(gB)&&Math.abs(gF-gB)<1.5?
              Math.max(-2.5,Math.min(2.5,(gF-gB)/.7)):0;
            const a=-21*sl/Math.sqrt(1+sl*sl);
            b.vx+=fx*a*dt;b.vz+=fz*a*dt;
            b.pitch=(b.pitch||0)+(Math.atan(sl)-(b.pitch||0))*Math.min(1,dt*14);
          }
        }else if(rise>.01){
          const k=Math.max(.7,1-rise*.6);b.vx*=k;b.vz*=k;
        }
        b.y=gy;b.air=false;
      }
    }
    if(b.kind==='crate'){_selfP=b;const gy=groundAt(b.x,b.z,b.r*.7,b.y+.04);_selfP=null;b.vy-=22*dt;b.y=Math.max(gy,b.y+b.vy*dt);if(b.y<=gy)b.vy=0;}
    if(b.solid){b.solid.on=true;syncPushable(b);}
    b.mesh.position.set(b.x, b.y+(b.meshOffsetY||0) + (b.kind === 'ring' ? Math.sin(performance.now() * 0.003 + b.x) * 0.04 : 0), b.z);
    // движение по форме: стоячий бак скользит не поворачиваясь; бочка, шина и колёсное едут вдоль «колёс»,
    // боковое скольжение гасится, направление плавно доворачивается к толчку
    const sp = Math.hypot(b.vx, b.vz);
    if (b.rider) { b.mesh.rotation.order = 'YXZ'; b.mesh.rotation.set(-(b.pitch || 0), b.heading + (b.shuv || 0), (b.flip || 0) + (b.lean || 0) + (b.bowlBank || 0)); }
    else if ((b.kind === 'skate' || b.kind === 'scooter') && (b.pitch || b.flip)) { b.mesh.rotation.order = 'YXZ'; b.mesh.rotation.x = -(b.pitch || 0); b.mesh.rotation.z = 0; b.flip = 0; b.shuv = 0; }
    else if (b.kind === 'chair') b.mesh.rotation.y += Math.hypot(b.x - op.x, b.z - op.z) * 2;
    else if (b.kind !== 'bin' && b.kind!=='crate' && sp > 0.02) {
      let h = b.mesh.rotation.y; const fx = Math.sin(h), fz = Math.cos(h);
      let vf = b.vx * fx + b.vz * fz, vs = b.vx * fz - b.vz * fx;
      vs *= Math.exp(-dt * (b.roller ? 5 : 7));
      let want = Math.atan2(b.vx, b.vz), d = want - h; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > Math.PI / 2) d = Math.atan2(Math.sin(d + Math.PI), Math.cos(d + Math.PI));
      h += Math.max(-1, Math.min(1, d)) * Math.min(1, dt * (b.roller ? 1.6 : 2.6) * Math.min(1, sp));
      const nfx = Math.sin(h), nfz = Math.cos(h);
      b.vx = nfx * vf + nfz * vs; b.vz = nfz * vf - nfx * vs; b.mesh.rotation.y = h;
      if (b.roller) b.roller.rotation.x += vf * dt / b.r;
    }
  }
  for (let i = 0; i < W.pushables.length; i++) for (let j = i + 1; j < W.pushables.length; j++) {
    const a = W.pushables[i], b = W.pushables[j];
    if(W.net&&(!W.net.canSimulate(a)||!W.net.canSimulate(b)))continue;
    const dx = b.x - a.x, dz = b.z - a.z, m = a.r + b.r;
    // Broad-phase: avoid a square root for distant pairs on the large map.
    if(Math.abs(dx)>=m || Math.abs(dz)>=m)continue;
    const d = Math.hypot(dx,dz);
    if (d < m && d > 1e-4 && a.y<b.y+b.h && b.y<a.y+a.h) { const closing=((a.vx-b.vx)*dx+(a.vz-b.vz)*dz)/d;if(closing>1.8){recordImpact(a,true,closing);recordImpact(b,true,closing);if(a.kind==='kart'&&b.kind==='kart'&&closing>8){for(const c of [a,b]){if(c.rider)c.rider.daze=Math.max(c.rider.daze||0,1.0);c.heading+=(c===a?1:-1)*.6;c.skid=1;c.spin=(c===a?1:-1)*2;}}const impulse=closing*.6;a.vx-=dx/d*impulse;a.vz-=dz/d*impulse;b.vx+=dx/d*impulse;b.vz+=dz/d*impulse;} const k = (m - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
  }
  if (player) bumpPushables(player);for(const b of W.pushables){if(b.ride?.water){constrainWaterRide(b);b.mesh.position.x=b.x;b.mesh.position.z=b.z;if(b.rider){b.rider.pos.x=b.x;b.rider.pos.z=b.z;}}if(b.solid)syncPushable(b);}
}
// Игрок толкает предметы, предметы мешают игроку
export function bumpPushables(pl) {
  const p = pl.pos;
  for (const b of W.pushables) {
    if (b.rider || b.grabbed || pl.ride) continue;
    const passive=!!(W.net&&!W.net.canSimulate(b));
    const top = b.y + b.h;
    if (p.y > top - 0.06 || p.y + pl.h < b.y) {
      // стоит сверху — предмет стоит как вкопанный
      if (p.y >= top - 0.06 && p.y < top + 0.08 && Math.hypot(p.x - b.x, p.z - b.z) < b.r + pl.r * 0.5) { if(!passive){b.vx = 0; b.vz = 0;} }
      continue;
    }
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz), m = b.r + pl.r;
    if (d >= m || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, over = m - d;
    // На госте пассивный предмет не меняет свою физику, контакт отталкивает только игрока.
    if(passive){p.x-=nx*over;p.z-=nz*over;const vn=pl.vel.x*nx+pl.vel.z*nz;if(vn>0){pl.vel.x-=nx*vn;pl.vel.z-=nz*vn;}continue;}
    // запрыгивает/цепляется выше середины — предмет не двигается, персонажа мягко сдвигает
    if (!pl.onGround && p.y > b.y + b.h * 0.45) { p.x -= nx * over; p.z -= nz * over; continue; }
    const share = 1 / (1 + b.mass);
    // тяжёлое почти не сдвигается, а игрок упирается в него
    b.x += nx * over * share; b.z += nz * over * share; p.x -= nx * over * (1 - share); p.z -= nz * over * (1 - share);
    const vn = pl.vel.x * nx + pl.vel.z * nz;
    if (b.kind === 'bin' && vn > 8.5) tipBin(b, nx, nz);
    if (vn > 0) {
      pl.pushing = 0.15;
      const target = vn * (b.mass > 3 ? 0.45 : 0.85);
      const cur = b.vx * nx + b.vz * nz;
      if (cur < target) { const add = (target - cur) * Math.min(1, 6 / b.mass * 0.25); b.vx += nx * add; b.vz += nz * add; }
      const slow = vn * (b.mass / (b.mass + 1.5)); pl.vel.x -= nx * slow; pl.vel.z -= nz * slow;
    }
  }
}
export function impulsePushables(x, z, r, power) {
  for (const b of W.pushables) {
    const dx = b.x - x, dz = b.z - z, d = Math.hypot(dx, dz);
    if (d < r + b.r && d > 1e-4) { b.vx += dx / d * power / b.mass; b.vz += dz / d * power / b.mass; if (power >= 3.5) tipBin(b, dx / d, dz / d); }
  }
}

// Луч против твёрдых объектов (прицел броска): расстояние до первого попадания или maxT
export function raySolids(o, d, maxT, skip) {
  let best = maxT;
  const ex = o.x + d.x * maxT, ez = o.z + d.z * maxT;
  for (const s of solidsNear(Math.min(o.x, ex), Math.min(o.z, ez), Math.max(o.x, ex), Math.max(o.z, ez))) {
    if (!s.on || s === skip) continue;
    let t0 = 0, t1 = best, ok = true;
    for (let a = 0; a < 3; a++) {
      const oo = a === 0 ? o.x : a === 1 ? o.y : o.z, dd = a === 0 ? d.x : a === 1 ? d.y : d.z, mn = a === 0 ? s.x0 : a === 1 ? s.y0 : s.z0, mx = a === 0 ? s.x1 : a === 1 ? s.y1 : s.z1;
      if (Math.abs(dd) < 1e-9) { if (oo < mn || oo > mx) { ok = false; break; } continue; }
      let ta = (mn - oo) / dd, tb = (mx - oo) / dd; if (ta > tb) { const q = ta; ta = tb; tb = q; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 > 0 && t0 < best) best = t0;
  }
  for(const q of W.obbs){if(!q.on||q===skip)continue;const c=Math.cos(q.yaw),s=Math.sin(q.yaw),dx=o.x-q.cx,dz=o.z-q.cz,oo=[dx*c-dz*s,o.y,dx*s+dz*c],dd=[d.x*c-d.z*s,d.y,d.x*s+d.z*c],mn=[q.lx0,q.y0,q.lz0],mx=[q.lx1,q.y1,q.lz1];let t0=0,t1=best,ok=true;for(let i=0;i<3;i++){if(Math.abs(dd[i])<1e-9){if(oo[i]<mn[i]||oo[i]>mx[i]){ok=false;break;}}else{let a=(mn[i]-oo[i])/dd[i],b=(mx[i]-oo[i])/dd[i];if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1){ok=false;break;}}}if(ok&&t0>0&&t0<best)best=t0;}

  return best;
}

/* Материал в точке удара — для звука (v0.18): вода, листва/трава, металл машин, дерево полов в зданиях, земля, бетон */
export function materialAt(x, y, z) {
  if (zoneAt(x, z, y, 'water') || zoneAt(x, z, y, 'puddle')) return 'water';
  if (zoneAt(x, z, y, 'leaves')) return 'grass';
  for (const c of W.cars) if (Math.hypot(c.x - x, c.z - z) < 2.2 && y < c.y + 1.8) return 'metal';
  if (y > 0.6 && (zoneAt(x, z, y, 'floor') || zoneAt(x, z, y, 'inside'))) return 'wood';
  const gy = groundAt(x, z, 0.3, y + 0.3);
  if (y - gy > 0.4) return 'concrete';
  for (const d of W.districts) if (x > d.ox && x < d.x1 && z > d.oz && z < d.z1) return d.ground === 'grass' ? 'grass' : d.ground === 'dirt' ? 'dirt' : 'concrete';
  return 'concrete';
}
