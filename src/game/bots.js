import {bounceAt} from './worldfx.js';
import {tryBotTool,cancelBotAim} from './bot-tools.js';
import {poseBow} from './bow.js';
import { beginBotWork, tickBotWork, interruptBotWork, poseBotWork } from '../missions/bot-work.js';
import { cargoPosition,poseMeleeItem } from './handheld.js';
import { detour } from './navigation.js';
import { V3, THREE } from '../core/gfx.js';
import { CONFIG } from '../config.js';
import { W } from '../world/state.js';
import { moveBody, groundAt, solidsNear, raySolids, zoneAt } from '../world/physics.js';
import { makeCharacter } from '../characters/rig.js';
import { SKIN_IDS, SKINS } from '../characters/skins.js';
import { nearestItem, pickUp, throwVelocity, launch } from './items.js';
import { smoke, smokeRing, burst } from '../world/particles.js';
import { M, removeMission, missionDone, visibleTo, canReach } from '../missions/missions.js';
import { statsOf } from './score.js';
import { arrest, hasPolice } from './police.js';
import { vacuumFire } from './tools.js';
import { sfx } from '../core/sfx.js';
import { slamDoor } from './player.js';
import { hitBreakables } from '../world/breakables.js';
import { voice } from './voice.js';
import { buildingAt, floorAt, routeTo } from '../missions/location.js';
import { actors, shove, knockDown, tickStun, ragK, daze } from './actors.js';
import { useTool } from './tools.js';
import { applyGripMotion, grabTarget, grabActor, letGo, startEmote, updateEmote } from './grab.js';

/* Боты-соперники (пока нет сети). Тот же риг, хитбокс и физика, что у игрока.
   Характеры: задира (кидается, толкает, хватает, отбирает), трудяга (почти только миссии), трус (уворачивается, прячется).
   Ходят «щупальцами»: если впереди стена — ищут обход, низкое — перепрыгивают, высоко — ищут лестницу. */
const PC = CONFIG.player;
const NAMES = ['Тыквоед', 'Бублик', 'Шпрот', 'Кексик'];
const MOODS = ['bully', 'worker', 'coward'];
export function createBots(scene, playerSkin, n = 3) {
  for (const b of W.bots || []) scene.remove(b.root);
  W.bots = [];
  const others = SKIN_IDS.filter(s => s !== playerSkin), moods = MOODS.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < n; i++) {
    const skin = others[i % others.length] || playerSkin, ch = makeCharacter(skin); ch.onCroak = () => sfx('croak', { at: ch.root.position, v: 0.6 });
    const sp = W.spawns[(i + 1) % W.spawns.length] || { x: 0, y: 0.15, z: 0 };
    ch.root.position.set(sp.x + (Math.random() - 0.5) * 2, sp.y, sp.z + (Math.random() - 0.5) * 2); scene.add(ch.root);
    W.bots.push({ bot: true, name: NAMES[i], skin, mood: moods[i % 3], ch, root: ch.root, pos: ch.root.position, vel: new V3(), push: new V3(), r: PC.radius, h: PC.height, step: PC.step,
      onGround: true, stun: 0, score: 0, goal: null, doT: 0, think: 0, stuck: 0, last: new V3(), facing: 0, throwCD: 3 + Math.random() * 5, held: null, wander: null, airPeak: 0,
      side: 1, sideT: 0, dodge: null, hideT: 0, actCD: 2, carry: null });
    statsOf(W.bots[W.bots.length - 1]);
  }
  return W.bots;
}

/* ---------- цели ---------- */
const takenBy = m => (W.bots || []).find(b => b.goal && b.goal.m === m);
function pickMission(b) {
  let best = null, bd = 1e9;
  for (const m of M.list) {
    if (b.avoid?.m===m || (m.claimedBy && m.claimedBy!==b) || m.busy || m.doer || !m.obj || !m.obj.pos || !visibleTo(m, b)) continue; const o = takenBy(m); if (o && o !== b) continue;
    // своя (личная) миссия — в приоритете
    const p = m.obj.pos(); if (p.y < CONFIG.base - 1.2 && b.pos.y > CONFIG.base - 1.2) continue; // в подземку боты не лезут (v0.20)
    const d = Math.hypot(p.x - b.pos.x, p.z - b.pos.z) + Math.abs(p.y - b.pos.y) * 4 + Math.random() * 8 - (m.owner === b ? 25 : 0);
    if (d < bd) { bd = d; best = m; }
  }
  if (!best) return null;
  const p = best.obj.front ? best.obj.front() : best.obj.pos(); return { x: p.x, y: p.y, z: p.z, m: best, kind: 'mission' };
}
function wanderGoal() {
  const zs = W.missionZones.filter(z => z.y >= CONFIG.base - 0.3 && z.type === 'floor');
  const z = zs[(Math.random() * zs.length) | 0]; if (!z) return null;
  return { x: z.x0 + Math.random() * (z.x1 - z.x0), y: z.y, z: z.z0 + Math.random() * (z.z1 - z.z0), m: null, kind: 'wander' };
}
// цель-противник для задиры: игрок чаще, иногда другой бот
function pickVictim(b) {
  const list = actors().filter(a => a !== b && !a.hidden && !(a.ghost > 0) && Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < 16 && Math.abs(a.pos.y - b.pos.y) < 3);
  if (!list.length) return null;
  list.sort((p, q) => (q === W.player ? 6 : 0) + (q.held ? 3 : 0) - ((p === W.player ? 6 : 0) + (p.held ? 3 : 0)) + (Math.random() - 0.5) * 4);
  return list[0];
}

/* ---------- навигация ---------- */
const _o = new V3(), _d = new V3();
function blockedAt(b, dx, dz, dist = 1.1) {
  const x = b.pos.x + dx * dist, z = b.pos.z + dz * dist;
  let low = null;
  for (const s of solidsNear(x - 0.3, z - 0.3, x + 0.3, z + 0.3)) {
    if (!s.on || x + 0.3 < s.x0 || x - 0.3 > s.x1 || z + 0.3 < s.z0 || z - 0.3 > s.z1) continue;
    if (s.y1 <= b.pos.y + b.step || s.y0 >= b.pos.y + b.h) continue;
    if (s.y1 - b.pos.y < 1.35 && s.y0 <= b.pos.y + 0.2) { low = s; continue; }
    return 'wall';
  }
  // обрыв в воду/яму на большой высоте — не шагаем
  const gy = groundAt(x, z, 0.2, b.pos.y + 0.5); if (b.pos.y - gy > (b.pos.y < CONFIG.base - 1 ? 1.15 : 0.85)) return 'cliff';
  return low ? 'low' : null;
}
/* Маршрут (v0.19): из здания — к лестнице вниз и к двери, в здание — через дверь и лестницу на нужный этаж */
function waypoint(b, g) {
  if (b.stairRoute) {
    const r = b.stairRoute, p = r.points[r.i];
    if (Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < .52 && (Math.abs(p.y-b.pos.y)<.65||r.down&&b.pos.y>=p.y&&b.pos.y-p.y<1.0)) r.i++;
    if (r.i < r.points.length) return r.points[r.i];
    b.stairRoute = null; b.nav = null;
  }
  const gb = buildingAt(b.pos), gt = buildingAt(g);
  if (gb && (gb.stairPath||gb.splitStair)) { const here = floorAt(gb, b.pos.y), want = gb === gt ? floorAt(gt, g.y) : 0; if (here !== want) return stairStep(b, gb, here, want > here,g); }
  if (gb && gb !== gt) { const here = floorAt(gb, b.pos.y);
    if (here > 0 && gb.stair) return { x: gb.stair[0], y: gb.y0 + here * gb.fh, z: gb.stair[1] };
    if (gb.door) { const d = gb.door, near = Math.hypot(b.pos.x - d[2], b.pos.z - d[3]) < 1.2; return near ? { x: d[0], y: gb.y0, z: d[1] } : { x: d[2], y: gb.y0, z: d[3] }; } }
  if (gt) return routeTo(b.pos, g);
  return g;
}
function stairStep(b,g,floor,up,target){
  if(g.splitStair){
    const s=g.splitStair,level=s.levels[up?floor:floor-1];if(!level)return target;
    const side=(up?target.x:b.pos.x)<s.cx?'left':'right',path=level[side].map(p=>({...p}));if(!up)path.reverse();
    // Между маршами идём по коридору вокруг проёма, а не срезаем по ступеням другого этажа.
    const y=path[0].y,z=s.frontZ,sideX=up?(b.pos.x<s.cx?s.cx-6.2:s.cx+6.2):path[0].x;
    if(up&&floor>0)path.unshift({x:sideX,y,z},{x:s.cx,y,z});
    else if(!up&&Math.abs(b.pos.x-s.cx)<4.9&&b.pos.z>path[0].z+2)path.unshift({x:b.pos.x,y,z},{x:sideX,y,z});
    for(let i=1;i<path.length;i++)path[i].ramp=Math.abs(path[i].y-path[i-1].y)>.04;
    b.stairRoute={points:path,i:0,down:!up};b.nav=null;return path[0];
  }
  const s = g.stairPath, y = g.y0 + floor * g.fh, half = g.fh / 2, ex = s.entryX, mx = s.midX;
  const points = up ? [{x:ex,y,z:s.zb},{x:ex,y,z:s.za},{x:mx,y:y+half,z:s.za},{x:mx,y:y+half,z:s.zb},{x:ex,y:y+g.fh,z:s.zb}]
    : [{x:ex,y,z:s.zb},{x:mx,y:y-half,z:s.zb},{x:mx,y:y-half,z:s.za},{x:ex,y:y-g.fh,z:s.za},{x:ex,y:y-g.fh,z:s.zb}];
  for(let i=1;i<points.length;i++)points[i].ramp=Math.abs(points[i].y-points[i-1].y)>.04;
  b.stairRoute = { points, i:0,down:!up }; b.nav = null; return points[0];
}
// лестница вниз: ближайшая, у которой верх на нашей высоте
function ladderDown(b, goal) {
  let best = null, bd = 30;
  for (const l of W.ladders) { if (Math.abs(l.y1 - b.pos.y) > 1.0 || l.y0 < CONFIG.base - 1.2 || Math.abs(l.y0 - goal.y) > 1.5) continue; const d = Math.hypot((l.x0 + l.x1) / 2 - b.pos.x, (l.z0 + l.z1) / 2 - b.pos.z); if (d < bd) { bd = d; best = l; } }
  return best;
}
function ladderTo(b, goal) {
  let best = null, bd = 40;
  for (const l of W.ladders) {
    if (Math.abs(l.y0 - b.pos.y) > 0.8 || l.y1 < goal.y - 1.2 || l.y1 > goal.y + 2.5) continue;
    const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, d = Math.hypot(cx - b.pos.x, cz - b.pos.z) + Math.hypot(cx - goal.x, cz - goal.z) * 0.5;
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}
// Найти свободный сход с низкой ограды. Большие перепады и вода остаются опасными.
function stepDown(b,target){
 if((!b.onGround&&!b.stepDown)||b.climbing||b.stairRoute||b.ladderExit||b.heldBy||b.ride||b.work&&!b.work.world)return null;
 if(b.stepDown){const q=b.stepDown;if(b.pos.y<q.from-.3||Math.hypot(b.pos.x-q.x,b.pos.z-q.z)<.25||q.left<=0){b.stepDown=null;b.nav=null;}else return q;}
 if(target&&Math.abs(target.y-b.pos.y)<.45&&b.stuck<.5)return null;
 let best=null,score=1e9;for(const radius of [1,1.65,2.3])for(let i=0;i<16;i++){
  const a=i*Math.PI/8,x=b.pos.x+Math.sin(a)*radius,z=b.pos.z+Math.cos(a)*radius,y=groundAt(x,z,b.r,b.pos.y+.1),drop=b.pos.y-y;
  if(drop<.45||drop>CONFIG.botStepDown.maxDrop||zoneAt(x,z,y,'water')||zoneAt(x,z,y,'lava'))continue;
  if(solidsNear(x-b.r,z-b.r,x+b.r,z+b.r).some(s=>s.on&&s.y1>y+b.step&&s.y0<y+b.h&&s.x1>x-b.r&&s.x0<x+b.r&&s.z1>z-b.r&&s.z0<z+b.r))continue;
  const from=b.pos.clone().add(new V3(0,.6,0)),dir=new V3(x-b.pos.x,0,z-b.pos.z).normalize();if(raySolids(from,dir,radius)<radius-.1)continue;
  const cost=radius+(target?Math.hypot(x-target.x,z-target.z)*.2:0);if(cost<score){score=cost;best={x,z,y,from:b.pos.y,left:CONFIG.botStepDown.timeout};}
 }
 return b.stepDown=best;
}
// направление к цели с обходом препятствий
function steer(b, tx, tz, dt) {
  let dx = tx - b.pos.x, dz = tz - b.pos.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  botDive(b, dx, dz); // сначала открыть/разбить препятствие по исходному направлению
  const st = blockedAt(b, dx, dz);
  b.navCD = Math.max(0, (b.navCD || 0) - dt);
  if (b.nav && (Math.hypot(b.nav.tx-tx,b.nav.tz-tz)>2 || Math.abs(b.nav.y-b.pos.y)>1)) b.nav=null;
  if ((st === 'wall' || st === 'cliff' || b.stuck > 0.5) && !b.nav && b.navCD <= 0) {
    b.navCD = 1.5; const path = detour(b,tx,tz); if(path.length)b.nav={path,tx,tz,y:b.pos.y};
  }
  if (b.nav) {
    const path=b.nav.path; while(path.length&&Math.hypot(path[0].x-b.pos.x,path[0].z-b.pos.z)<0.35)path.shift();
    if(path.length){const p=path[0],len=Math.hypot(p.x-b.pos.x,p.z-b.pos.z)||1;return[(p.x-b.pos.x)/len,(p.z-b.pos.z)/len];}b.nav=null;
  }
  if (st === 'low' && b.onGround) { b.vel.y = PC.jump; b.onGround = false; }
  if (st !== 'wall' && st !== 'cliff') { b.sideT -= dt; return [dx, dz]; }
  // ищем свободное направление, держась одной стороны, пока обходим
  if (b.sideT <= 0) { b.side = Math.random() < 0.5 ? -1 : 1; }
  b.sideT = 1.2;
  for (const a of [0.6, 1.1, 1.6, 2.2]) for (const sg of [b.side, -b.side]) {
    const ang = Math.atan2(dx, dz) + a * sg, ex = Math.sin(ang), ez = Math.cos(ang), s2 = blockedAt(b, ex, ez);
    if (s2 !== 'wall' && s2 !== 'cliff') { b.side = sg; if (s2 === 'low' && b.onGround) { b.vel.y = PC.jump; b.onGround = false; } return [ex, ez]; }
  }
  return [-dx, -dz];
}

/* ---------- обновление ---------- */
export function updateBots(dt, t, P) {
  for (const b of W.bots || []) {
    if (b.drone || b.returning) { if(b.work&&!b.work.world)interruptBotWork(b);continue; }
    tickStun(b, dt);
    b.toolAiming=false;if(b.heldBy||b.stun>0||b.daze>0||b.getT>0||b.netT>0||b.climbing||b.work)cancelBotAim(b);
    const exiting=b.escapeLadder||b.ladder;if(b.climbing&&exiting&&b.pos.y>=exiting.y1-.06){const l=exiting,cx=(l.x0+l.x1)/2,cz=(l.z0+l.z1)/2;b.pos.y=Math.max(b.pos.y,l.y1+.06);b.ladderExit={x:cx-l.nx*.95,z:cz-l.nz*.95,left:1};b.climbing=false;b.escapeLadder=b.ladder=null;b.vel.y=0;b.nav=null;b.think=1;}
    if (b.pos.y < CONFIG.base - 1.5 || b.escapeLadder) {
      b.ugT=(b.ugT||0)+dt;
      const exits=W.ladders.filter(l=>l.y0<=b.pos.y+0.7&&l.y1>=CONFIG.base-0.4);
      const l=exits.sort((a,c)=>Math.hypot((a.x0+a.x1)/2-b.pos.x,(a.z0+a.z1)/2-b.pos.z)-Math.hypot((c.x0+c.x1)/2-b.pos.x,(c.z0+c.z1)/2-b.pos.z))[0];
      if(l){b.escapeLadder=l;b.goal={x:(l.x0+l.x1)/2,y:l.y1,z:(l.z0+l.z1)/2,kind:'escape',near:0.3};b.think=2;}
    } else {b.ugT=0;b.escapeLadder=null;}
    if (b.webT > 0) b.webT -= dt;
    if (b.knockT > 0) b.knockT -= dt;
    if (b.diveHitT > 0) b.diveHitT -= dt;
    if (b.diveCD > 0) b.diveCD -= dt;
    if (b.diveT > 0) { b.diveT -= dt; hitBreakables({ x: b.pos.x + b.vel.x * 0.05, y: b.pos.y + 0.6, z: b.pos.z + b.vel.z * 0.05 }, 0.6, [b.vel.x, b.vel.y, b.vel.z], 1, ['glass', 'crate']); }
    if(b.avoid){b.avoid.left-=dt;if(b.avoid.left<=0)b.avoid=null;}
    if (b.revenge > 0) b.revenge -= dt;
    b.think -= dt; b.throwCD -= dt; b.actCD -= dt;
    // Схвачен: сопротивляется на земле, без атак; физика и тяжесть продолжают работать.
    if (b.heldBy) { b.doT=0; b.goal=null; b.climbing=false; }
    if (b.caged) { b.ch.animate(dt, { t, speed: 0, grabbed: true }); blob(b); progBar(b); continue; }
    // прячется
    if (b.hidden) { b.hideT -= dt; if (b.hideT <= 0) { const h = b.hidden; b.hidden = null; b.root.visible = true; b.vel.set((Math.random() - 0.5) * 6, 6, (Math.random() - 0.5) * 6); b.onGround = false; burst(h.x, h.y + 0.6, h.z, 12, { color: h.kind === 'leaves' ? 0xe0902e : 0xd8d0e4, size: 0.22, speed: 3, up: 3 }); } else { b.root.visible = false; continue; } }
    if(W.race&&b.ride?.kind==='kart'){W.race.drive(b,dt,t);progBar(b);continue;}
    tickBotWork(b,dt);
    if(b.bus){b.ch.animate(dt,{t,speed:0,ride:'sit'});continue;}
    const ctrl = !b.heldBy && b.stun <= 0 && !(b.getT > 0) && !(b.knockT > 0) && !(b.floatT > 0) && !(b.netT > 0);
    let ix = 0, iz = 0, run = 1;
    const ev = W.eventBot ? W.eventBot(b) : null;
    const descent=ctrl?stepDown(b,b.goal?.who?.pos||b.goal):null;
    if(descent){descent.left-=dt;const d=Math.hypot(descent.x-b.pos.x,descent.z-b.pos.z)||1;ix=(descent.x-b.pos.x)/d;iz=(descent.z-b.pos.z)/d;run=.7;b.dodge=null;b.nav=null;b.stuck=0;}else if(b.ladderExit&&ctrl){const q=b.ladderExit,dx=q.x-b.pos.x,dz=q.z-b.pos.z,d=Math.hypot(dx,dz);q.left-=dt;ix=dx/(d||1)*.55;iz=dz/(d||1)*.55;b.vel.y=0;if(d<.12||q.left<=0)b.ladderExit=null;}else if (b.work && !b.work.world) {
      b.vel.x*=Math.exp(-dt*15);b.vel.z*=Math.exp(-dt*15);
    } else if (ctrl) {
      // приоритеты: событие раунда → увернуться → приманка-уточка → характер
      if (!b.work && ev && !b.escapeLadder && !(!W.race&&!W.football&&b.mood === 'worker' && M.list.some(m => !m.owner && !m.doer))) b.goal = ev;
      if (!b.work && b.think <= 0 && (!ev || b.goal !== ev)) { b.think = 0.6 + Math.random() * 0.6; decide(b, P); }
      // увернуться от летящего предмета
      if (!b.dodge && (b.mood === 'coward' || Math.random() < 0.5)) for (const it of W.items) {
        if (it.state !== 'fly' || it.owner === b) continue; const dx = b.pos.x - it.pos.x, dz = b.pos.z - it.pos.z, d = Math.hypot(dx, dz);
        if (d < 5 && d > 0.5 && (it.vel.x * dx + it.vel.z * dz) / d > 6) { const sg = Math.random() < 0.5 ? -1 : 1; b.dodge = { x: -dz / d * sg, z: dx / d * sg, t: 0.45 }; if (b.onGround && Math.random() < 0.4) { b.vel.y = PC.jump * 0.8; b.onGround = false; } break; }
      }
      if (b.dodge) { ix = b.dodge.x; iz = b.dodge.z; run = 1.15; b.dodge.t -= dt; if (b.dodge.t <= 0) b.dodge = null; }
      else if (W.lure && W.lure.by !== b && Math.hypot(W.lure.x - b.pos.x, W.lure.z - b.pos.z) < 16) [ix, iz] = steer(b, W.lure.x, W.lure.z, dt);
      else if (b.goal) {
        const g0 = b.goal.who ? b.goal.who.pos : b.goal, d0 = Math.hypot(g0.x - b.pos.x, g0.z - b.pos.z), g = b.goal.who || (d0 < 1.6 && Math.abs(g0.y - b.pos.y) < 1.5) || !['mission', 'fetch', 'event', 'work'].includes(b.goal.kind) ? g0 : waypoint(b, g0);
        const dx = g.x - b.pos.x, dz = g.z - b.pos.z, d = Math.hypot(dx, dz), dy = g.y - b.pos.y;
        // ниже (с крыши) — к лестнице вниз и слезть
        if(b.stairRoute){if(g.ramp){ix=dx/(d||1);iz=dz/(d||1);}else [ix,iz]=steer(b,g.x,g.z,dt);run=.55;b.climbing=false;}else if (dy < -1.8 && !b.goal.who && (b.ladderDn || (b.ladderDn = ladderDown(b, g)))) { const l = b.ladderDn, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
          if (b.pos.x > l.x0 - 0.1 && b.pos.x < l.x1 + 0.1 && b.pos.z > l.z0 - 0.1 && b.pos.z < l.z1 + 0.1 && b.pos.y > l.y0 + 0.05) { ix = (cx - b.pos.x) * 3; iz = (cz - b.pos.z) * 3; b.vel.y = -PC.climb * 1.4; b.climbing = true; b.airPeak = b.pos.y; }
          else { b.climbing = false; [ix, iz] = steer(b, cx - l.nx * 0.3, cz - l.nz * 0.3, dt); if (b.pos.y < l.y0 + 0.3) b.ladderDn = null; } }
        // высоко — к лестнице
        else if ((dy > 1.6 || b.escapeLadder || (b.climbing && b.ladder && b.pos.y < b.ladder.y1 - 0.05)) && !b.goal.who) { b.ladderDn = null; const l = b.escapeLadder || b.ladder || (b.ladder = ladderTo(b, g)); if (l) { b.ladder=l; const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
          if (b.pos.x > l.x0 - 0.1 && b.pos.x < l.x1 + 0.1 && b.pos.z > l.z0 - 0.1 && b.pos.z < l.z1 + 0.1 && b.pos.y < l.y1 - 0.05) { ix=(cx-b.pos.x)*2;iz=(cz-b.pos.z)*2; b.vel.y = PC.climb; b.climbing = true; b.airPeak = b.pos.y; }
          else { b.climbing = false; [ix, iz] = steer(b, cx - l.nx * 0.1, cz - l.nz * 0.1, dt); } } else [ix, iz] = steer(b, g.x, g.z, dt); }
        else { b.ladder = null; b.ladderDn = null; b.climbing = false;
          const near = b.goal.kind === 'mission' ? 1.4 : b.goal.kind === 'fight' ? 1.0 : b.goal.near || 1.2;
          if (d < near && Math.abs(dy) < 1.5 && !b.stairRoute && Math.hypot(g0.x-b.pos.x,g0.z-b.pos.z)<near) arrive(b, P);
          else { [ix, iz] = steer(b, g.x, g.z, dt); if (b.goal?.kind === 'flee') run = 1.1; } }
      } else { b.climbing = false; }
      if (b.blind > 0) { ix = Math.sin(t * 3 + b.pos.x); iz = Math.cos(t * 2.4); }
      botDive(b, ix, iz);
      if(!b.work)act(b, P, dt);
    }
    // Измеряем продвижение за несколько секунд, чтобы прыжки на месте не сбрасывали диагностику.
    if (ctrl && (ix || iz) && !b.climbing) {
      if (!b.progress) b.progress={p:b.pos.clone(),t:0}; b.progress.t+=dt;
      if(b.progress.t>2.5){const moved=Math.hypot(b.pos.x-b.progress.p.x,b.pos.z-b.progress.p.z);if(moved<0.8){b.nav=null;b.navCD=0;b.failures=(b.failures||0)+1;if(b.failures>=3&&!b.escapeLadder){if(b.goal?.m)b.avoid={m:b.goal.m,left:12};b.goal=null;b.stairRoute=null;b.think=0;b.failures=0;}}else b.failures=0;b.progress={p:b.pos.clone(),t:0};}
    } else b.progress=null;
    // застрял — шаг в сторону
    b.stuck = Math.hypot(b.pos.x - b.last.x, b.pos.z - b.last.z) < dt * 0.8 && Math.abs(b.pos.y - b.last.y) < dt * 0.6 && (ix || iz) ? b.stuck + dt : 0; b.last.copy(b.pos);
    if (b.stuck > 0.7 && !b.stairRoute && b.onGround && !b.heldBy && !b.stepDown) { b.vel.y = PC.jump; b.onGround = false; if (b.stuck > 1.4) { const a = Math.random() * 6.28; b.dodge = { x: Math.cos(a), z: Math.sin(a), t: 0.9 }; b.stuck = 0; b.nav=null;b.navCD=0;b.failures=(b.failures||0)+1;if(b.failures>=3){if(b.goal?.m)b.avoid={m:b.goal.m,left:12};b.goal=null;b.think=0;b.stairRoute=null;b.failures=0;} b.ladder = null; b.ladderDn = null; } }
    // движение
    if(b.work?.game.botSpeed)run*=b.work.game.botSpeed;
    const wading=zoneAt(b.pos.x,b.pos.z,b.pos.y,'wading');
    if(wading&&b.onGround&&Math.hypot(b.vel.x,b.vel.z)>1.5&&Math.random()<dt*8)burst(b.pos.x,b.pos.y+.05,b.pos.z,2,{color:0x9ccbec,size:.08,speed:1.2,up:1.6});
    const sp = (wading?.85:1) * (b.webT > 0 ? 0.4 : 1) * (b.daze > 0 ? 0.18 : 1) * (b.holding ? 0.4 : 1) * (b.heldBy ? 0.24 : 1) * (b.energy > 0 ? 1.2 : 1) * PC.sprint * 0.8 * run, k = b.onGround ? 8 : 2;
    if (ctrl && !(b.diveT > 0)) { b.vel.x += (ix * sp - b.vel.x) * Math.min(1, dt * k); b.vel.z += (iz * sp - b.vel.z) * Math.min(1, dt * k); }
    b.vel.x += b.push.x; b.vel.z += b.push.z; b.push.set(0, 0, 0);
    if (b.stun > 0 || b.getT > 0) { b.vel.x *= 0.9; b.vel.z *= 0.9; }
    // толкотня с игроком
    if (P && !P.heldBy && !b.heldBy) { const dx = b.pos.x - P.pos.x, dz = b.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d < b.r + P.r && d > 1e-3 && Math.abs(b.pos.y - P.pos.y) < 1.2) { const o = (b.r + P.r - d) / 2; b.pos.x += dx / d * o; b.pos.z += dz / d * o; P.pos.x -= dx / d * o; P.pos.z -= dz / d * o; } }
    const was = b.onGround; b.noGrav=ctrl&&(b.climbing||!!b.ladderExit);if(!ctrl){b.climbing=false;b.ladderExit=null;}
    applyGripMotion(b,dt);
    moveBody(b, dt, PC.gravity);
    if(b.landed){const bo=bounceAt(b.pos.x,b.pos.z,b.pos.y);if(bo){b.vel.y=bo.power;b.onGround=false;b.airPeak=b.pos.y;}}
    if (b.onGround && !was) { const drop = b.airPeak - b.pos.y; if (drop > 0.6) smokeRing(b.pos.x, b.pos.y + 0.1, b.pos.z, 5, { speed: 1.6, size: 0.14 });
      if (b.thrown) { b.thrown = false; if (drop > 0.3) b.stun = Math.max(b.stun, 0.6); }
      if (drop > PC.fallStun) { b.stun = PC.stunTime; voice(b.ch, 'hurt', b.pos); statsOf(b).falls++; } }
    if (!b.onGround) b.airPeak = Math.max(b.airPeak, b.pos.y); else b.airPeak = b.pos.y;
    if (b.pos.y < -30) { const s = W.spawns[0]; b.pos.set(s.x, s.y + 1, s.z); b.vel.set(0, 0, 0); }
    const spd = Math.hypot(b.vel.x, b.vel.z);
    if(b.toolAiming&&b.aimAt)b.facing=Math.atan2(b.aimAt.x-b.pos.x,b.aimAt.z-b.pos.z);else if (b.holding) b.facing = b.facing; else if (spd > 0.6 && !b.climbing) b.facing = Math.atan2(b.vel.x, b.vel.z);
    else if (b.aimAt) b.facing = Math.atan2(b.aimAt.x - b.pos.x, b.aimAt.z - b.pos.z);
    let dy = b.facing - b.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.root.rotation.y += dy * Math.min(1, dt * 12);
    if (b.onGround && spd > 7 && Math.random() < dt * 10) smoke(b.pos.x - b.vel.x / spd * 0.4, b.pos.y + 0.12, b.pos.z - b.vel.z / spd * 0.4, { size: 0.12, grow: 0.5, life: 0.5, vy: 0.4 });
    if (b.throwT > 0) b.throwT -= dt;
    updateEmote(b, dt, spd > 1);
    b.ch.animate(dt, { t, speed: spd / PC.sprint * 1.4, air: !b.onGround && !b.climbing, vy: b.vel.y, stun: b.stun > 0, rag: ragK(b), daze: b.daze > 0, dive: b.diveT > 0 ? 'air' : null, grabbed: b.netT > 0 && !(b.stun > 0), climb: !!b.climbing, payload:b.carryCrate?0.5:b.carryKitten?0.42:b.held?.def.r||0,missionTool:!!b.missionTool,hold: (!!b.hotPotato || !!b.work && !b.work.world || !!b.held || b.carryKitten || b.carryCrate || b.carryNet) && !b.holding, charge: 0, landed: false, throwT: b.throwT || 0, accel: 0, sprint: 1, crouch: false,
      emote: b.emote, emoteT: b.emoteT, held2: !!b.holding, restrained: !!b.heldBy, swat: b.swatT > 0 ? b.swatT : 0, zombie: !!b.zombie });
    poseBotWork(b);
    if (b.held) { cargoPosition(b,b.held.pos,b.held.def.r); b.held.g.rotation.y = b.root.rotation.y;poseMeleeItem(b,b.held);if(b.held.type==='bow')poseBow(b,b.held,0); }
    b.root.visible = true; blob(b); progBar(b);
  }
}
/* полоска прогресса над ботом, пока он делает миссию: видно, кого стоит сбить (перехват) */
function progBar(b) {
  const on = !!b.work && !b.work.worldFeedback;
  if (!b.bar) { if (!on) return; const c = document.createElement('canvas'); c.width = 34; c.height = 8; const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); sp.scale.set(1.1, 0.26, 1); sp.renderOrder = 9; b.root.add(sp); b.bar = { sp, c, g: c.getContext('2d'), tex, k: -1 }; }
  const B = b.bar; B.sp.visible = !!on; if (!on) return;
  B.sp.position.y = (b.ch.d.top || 1.8) + 0.45; const k = Math.round(Math.max(0,Math.min(1,b.work?.m.progress||0))*30); if (k === B.k) return; B.k = k;
  const g = B.g; g.fillStyle = '#17111f'; g.fillRect(0, 0, 34, 8); g.fillStyle = '#3a3046'; g.fillRect(2, 2, 30, 4); g.fillStyle = '#f5c542'; g.fillRect(2, 2, k, 4); B.tex.needsUpdate = true;
}
function blob(b) { const gb = b.ch.blob; if (!gb) return; const g = groundAt(b.pos.x, b.pos.z, 0.1, b.pos.y + 0.05), h = Math.max(0, b.pos.y - g), kk = Math.max(0, 1 - h / 6); gb.position.y = g - b.pos.y + 0.03; gb.scale.setScalar(b.ch.blobS * (0.55 + 0.45 * kk)); gb.material.opacity = 0.32 * kk; }

// выбор цели по характеру
function decide(b, P) {
  if (b.goal && b.goal.kind === 'mission' && M.list.includes(b.goal.m) && !b.goal.m.busy && Math.random() < 0.85) return;
  const r = Math.random(), mood = b.mood;
  // трус: опасность рядом — бежать или прятаться
  if (mood === 'coward' && P && !P.hidden) { const d = Math.hypot(P.pos.x - b.pos.x, P.pos.z - b.pos.z);
    if (d < 6 && (P.charging || P.dive || P.holding || (P.held && P.held.def.heavy))) {
      const h = W.hides.find(q => Math.hypot(q.x - b.pos.x, q.z - b.pos.z) < 7 && Math.abs(q.y - b.pos.y) < 1 && !(q.pb && (!q.pb.looted || q.pb.tipped)) && !actors().some(a => a.hidden === q));
      if (h && r < 0.5) { b.goal = { x: h.x, y: h.y, z: h.z, kind: 'hide', h, near: h.r }; return; }
      const dx = b.pos.x - P.pos.x, dz = b.pos.z - P.pos.z; b.goal = { x: b.pos.x + dx / (d || 1) * 8, y: b.pos.y, z: b.pos.z + dz / (d || 1) * 8, kind: 'flee' }; return; } }
  // Выброшенные вещи можно подобрать; очки задания не переходят с предметом.
  if (!b.held) { const sit = W.items.find(q => q.steal && q.wasHeld && q.state === 'rest' && Math.hypot(q.pos.x - b.pos.x, q.pos.z - b.pos.z) < 14 && Math.abs(q.pos.y - b.pos.y) < 2);
    if (sit && r < (mood === 'bully' ? 0.9 : 0.6)) { b.goal = { x: sit.pos.x, y: sit.pos.y - sit.def.r, z: sit.pos.z, kind: 'fetch', it: sit, near: 1.1 }; return; } }
  // задира (или обиженный): найти жертву; без предмета — сначала подобрать что-нибудь
  const angry = mood === 'bully' ? 0.45 : b.revenge > 0 ? 0.7 : mood === 'worker' ? 0.06 : 0.12;
  if (r < angry) { const v = b.revenge > 0 && P ? P : pickVictim(b); if (v) {
    if (!b.held && Math.random() < 0.6) { const it = nearestItem(b.pos, 9); if (it && it.state === 'rest' && !it.def.sinks) { b.goal = { x: it.pos.x, y: it.pos.y - it.def.r, z: it.pos.z, kind: 'fetch', it, near: 1.1 }; return; } }
    b.goal = { who: v, kind: 'fight', t: 6 }; return; } }
  const m = pickMission(b); if (m && Math.random() < (mood === 'worker' ? 0.95 : 0.8)) { b.goal = m; return; }
  b.goal = wanderGoal();
}
// пришёл к цели
function arrive(b, P) {
  const g = b.goal;
  if (g.kind === 'mission') { const m = g.m;
    if (!m || m.doer || m.busy || !M.list.includes(m) || !canReach(b, m.obj.front ? m.obj.front() : m.obj.pos(), m.obj.solid, m.obj.reach || 1.8)) { b.goal = null; return; }
    beginBotWork(b,m); return; }
  if(g.kind==='work')return;
  if (g.kind === 'fetch') { const it = g.it; if (it.state === 'rest' && !b.held) { pickUp(it); it.state = 'held'; b.held = it; const prev = it.owner; it.owner = b;
      if (it.steal) W.onSteal?.(b,prev,it); }
    b.goal = null; b.think = 0; return; }
  if (g.kind === 'hide') { if (!actors().some(a => a.hidden === g.h)) { b.hidden = g.h; b.hideT = 2.5 + Math.random() * 3; b.pos.set(g.h.x, g.h.y, g.h.z); b.vel.set(0, 0, 0); sfx('hide', { at: b.pos }); } b.goal = null; return; }
  if (g.kind === 'fight' || g.kind === 'eventThrow' || g.kind === 'event') return; // действие — в act()
  b.goal = null;
}
// Стационарная попытка сбрасывается, уличное задание остаётся за исполнителем.
export function interruptBot(b) { return interruptBotWork(b); }
// атака: бросок, удар инструментом, выпад, захват
function act(b, P, dt) {
  // Удерживает на земле, затем отпускает. Броска персонажей нет.
  if (b.holding) { b.holdT=(b.holdT||0)+dt;if(b.holdT>1.8){b.holdT=0;letGo(b);b.actCD=2;}return; }
  const g = b.goal; b.aimAt = null;
  const it = b.held;
  if(tryBotTool(b,g?.who||null,dt))return;
  // инструменты, которые лучше применить сразу
  if (it && it.def.tool && ['energy', 'mask'].includes(it.type)) { useTool(b, it, b.pos.clone()); return; }
  if (it && it.type === 'duck' && Math.random() < dt * 0.3) useTool(b, it, b.pos.clone());
  // ловушки — у миссий и на пути соперников
  if (it && ['banana', 'rake', 'cushion', 'paint'].includes(it.type) && b.actCD <= 0) { const nearM = M.list.some(m => { const p = m.obj.pos(); return Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < 4; });
    if (nearM || Math.random() < dt * 0.15) { useTool(b, it, b.pos.clone()); b.actCD = 1; return; } }
  if (g && g.kind === 'eventThrow') { if (it && b.throwCD <= 0) { throwAt(b, g.who); b.throwCD = 1.2 + Math.random(); } return; }
  if (!g || g.kind !== 'fight') {
    // держит предмет без цели: изредка бросает в игрока, если тот рядом
    if (it && P && b.throwCD <= 0 && Math.hypot(P.pos.x - b.pos.x, P.pos.z - b.pos.z) < 10 && !P.hidden && !(P.ghost > 0)) throwAt(b, P);
    return;
  }
  const v = g.who; g.t -= dt;
  if (!v || v.hidden || v.heldBy || g.t <= 0) { b.goal = null; return; }
  const d = Math.hypot(v.pos.x - b.pos.x, v.pos.z - b.pos.z); b.aimAt = v.pos;
  if (it) {
    const melee = ['slipper', 'pillow', 'glove'].includes(it.type), shooter = ['bow','perfume','water', 'sling', 'bubbles', 'extinguisher', 'net'].includes(it.type);
    // жетон: сначала вызвать наряд, потом бросить в жертву
    if (it.type === 'badge' && d < 14 && b.throwCD <= 0) { throwAt(b, v); return; }
    // пылесос: подержать на жертву и выстрелить
    if (it.type === 'vacuum' && d < 8) { b.facing = Math.atan2(v.pos.x - b.pos.x, v.pos.z - b.pos.z); b.vacT = (b.vacT || 0) + dt; useTool(b, it, v.pos.clone().setY(v.pos.y + 1), dt); if (b.vacT > 1.5) { b.vacT = 0; vacuumFire(b, it, v.pos.clone().setY(v.pos.y + 1)); } return; }
    if (melee && d < (it.type === 'glove' ? 3 : 1.6) && b.actCD <= 0) { b.actCD = 0.9; useTool(b, it, v.pos.clone().setY(v.pos.y + 1)); sfx(it.type === 'pillow' ? 'pillow' : 'swat', { at: b.pos }); return; }
    if (shooter && d < (it.type === 'extinguisher' ? 5 : 10) && b.actCD <= 0 && los(b, v)) { b.facing = Math.atan2(v.pos.x - b.pos.x, v.pos.z - b.pos.z); useTool(b, it, v.pos.clone().setY(v.pos.y + 1), 0.25); if (!it.def.hold) b.actCD = 0.5; return; }
    if (it.type === 'firework' && it.lit === undefined) useTool(b, it, v.pos.clone());
    if (!melee && !shooter && d < 11 && d > 3 && b.throwCD <= 0 && los(b, v)) { throwAt(b, v); return; }
    if (it.def.ammo && it.ammo <= 0 && d < 11) throwAt(b, v);
    return;
  }
  // без предмета: вплотную — выпад-толчок или захват
  if (d < 1.4 && b.actCD <= 0 && Math.abs(v.pos.y - b.pos.y) < 1) {
    b.actCD = 2.5;
    if (Math.random() < 0.35 && !v.holding) { b.root.rotation.y = b.facing = Math.atan2(v.pos.x - b.pos.x, v.pos.z - b.pos.z); if (grabActor(b, v)) { b.holdT = 0; return; } }
    const dx = v.pos.x - b.pos.x, dz = v.pos.z - b.pos.z; shove(v, dx, dz, 7, 4.5, true); v.diveHitT = 0.6; b.vel.x = dx / d * 8; b.vel.z = dz / d * 8; b.vel.y = 3; b.onGround = false;
    voice(v.ch, 'hurt', v.pos); sfx('hit', { at: v.pos, v: 0.8 }); hitStat(b, v); if (Math.random() < 0.5) setTimeout(() => startEmote(b, 'laugh'), 600);
    b.goal = null;
  }
}
function los(b, v) { _o.set(b.pos.x, b.pos.y + 1.3, b.pos.z); _d.set(v.pos.x - b.pos.x, v.pos.y + 1 - _o.y, v.pos.z - b.pos.z); const L = _d.length(); _d.normalize(); return raySolids(_o, _d, L) >= L - 0.2; }
function throwAt(b, v) {
  const it = b.held; if (!it) return; b.throwCD = 3 + Math.random() * 4;
  const from = it.pos.clone(), tgt = v.pos.clone().setY(v.pos.y + 1); tgt.x += v.vel.x * 0.35; tgt.z += v.vel.z * 0.35;
  const vel = throwVelocity(from, tgt, 0.55 + Math.random() * 0.35, it.def); b.held = null; it.owner = b; launch(it, from, vel);
  b.facing = Math.atan2(v.pos.x - b.pos.x, v.pos.z - b.pos.z); voice(b.ch, 'throw', b.pos); sfx('throw', { at: b.pos }); b.throwT = 0.3;
}
const hitStat = (b, v) => { W.onHit && W.onHit(b, v, 'melee'); };

/* Попадание брошенным предметом по любому персонажу: тяжёлое и тапок сбивают с ног, лёгкое толкает и мочит.
   Раскрытый зонтик спереди закрывает от бросков. */
export function botHitHook(it, p, heavy, r) {
  for (const a of actors()) {
    if(it.owner===a||a.hidden||(it.hitTarget&&it.hitTarget!==a))continue;
    if (!(Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < r && p.y > a.pos.y - 0.3 && p.y < a.pos.y + a.h + 0.4)) continue;
    if(!it.hitTarget){const q=a.pos.clone().add(new V3(0,a.h*.5,0)).sub(p),len=q.length();if(raySolids(p,q.normalize(),len)<len-.05)continue;}
    // зонтик-щит
    if (a.held && a.held.type === 'umbrella' && a.held.open) { const f = a.root.rotation.y; if (-(it.vel.x * Math.sin(f) + it.vel.z * Math.cos(f)) > 2) { it.vel.multiplyScalar(-0.35); sfx('umbrella', { at: a.pos }); continue; } }
    // в пузыре: попадание лопает пузырь
    if (a.floatT > 0) { a.popBubble = true; continue; }
    if (heavy) { knockDown(a, it.vel.x * 0.4, it.vel.z * 0.4, a === W.player ? 1.2 : 1.4); voice(a.ch, 'hurt', a === W.player ? undefined : a.pos); }
    else { a.push.set(it.vel.x * (a.bot ? 0.2 : 0.15), 0, it.vel.z * (a.bot ? 0.2 : 0.15)); if (it.type === 'balloon') { a.wetT = 4; a.slipT = 2; }
      // мяч и шарик — стан стоя (звёздочки), без падения
      daze(a,Math.min(1.8,.55+it.def.mass*it.vel.length()*.035)); }
    if (it.owner && it.owner.bot && a !== it.owner) { if (a === W.player && Math.random() < 0.5) setTimeout(() => startEmote(it.owner, 'laugh'), 500); }
    W.onHit && W.onHit(it.owner, a, heavy ? 'heavy' : 'light');
    // жетон попал — если у хозяина есть наряд, тот бежит арестовывать
    if (it.type === 'badge' && it.owner && it.owner !== a && !it.badgeDone) { it.badgeDone = true; it.state = 'gone'; it.g.visible = false; W.badgeLand && W.badgeLand(it.pos.clone(), it.owner); }
  }
}
export const botLabel = b => `${b.name} (${SKINS[b.skin].name})`;
void grabTarget;

// бот (v0.22): закрытая дверь или стекло прямо на пути — выпад (как Q у игрока): дверь распахивается по инерции, стекло бьётся
function botDive(b, ix, iz) {
  if (b.diveT > 0 || b.diveCD > 0 || !b.onGround || b.climbing || (b.held && b.held.def.heavy) || b.holding) return;
  const l = Math.hypot(ix, iz); if (l < 0.5) return; const ux = ix / l, uz = iz / l;
  let why = null;
  for(const d of W.doors){if(d.open||Math.abs(d.y-b.pos.y)>1.2)continue;const s=d.solid,cx=Math.max(s.x0,Math.min(b.pos.x,s.x1)),cz=Math.max(s.z0,Math.min(b.pos.z,s.z1)),dx=cx-b.pos.x,dz=cz-b.pos.z,dd=Math.hypot(dx,dz);if(dd<1.5&&(dd<0.4||(dx*ux+dz*uz)/(dd||1)>0.35)){why=d;break;}}
  if(!why)for(const p of W.breakables||[]){if(!p.alive||p.kind!=='glass'||!p.solid?.on)continue;const s=p.solid;if(s.y0>b.pos.y+1.35||s.y1<b.pos.y+0.45)continue;
    const x=Math.max(s.x0,Math.min(b.pos.x,s.x1)),z=Math.max(s.z0,Math.min(b.pos.z,s.z1)),dx=x-b.pos.x,dz=z-b.pos.z,d=Math.hypot(dx,dz);
    if(d<1.35&&(d<0.35||(dx*ux+dz*uz)/(d||1)>0.45)){why='glass';hitBreakables({x,y:Math.max(s.y0+0.05,Math.min(b.pos.y+1,s.y1-0.05)),z},0.28,[ux*10,0,uz*10],2,['glass']);break;}}
  if (!why) return;
  b.nav=null;b.navCD=0;
  b.diveT = 0.35; b.diveCD = 1.4; b.vel.x = ux * 6; b.vel.z = uz * 6; b.vel.y = 1.5; b.onGround = false; sfx('dive', { at: b.pos });
  if (why !== 'glass') { slamDoor(why, ux, uz, 9); sfx('door', { at: why }); }
}
