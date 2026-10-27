import { fireworks, explosion } from './vfx.js';
import {actionEffect} from '../world/action-fx.js';
import {sweepActors,npcList,npcPosition,hitNPC} from './impacts.js';
import {useBong} from './bong.js';
import {arrowModel,poseBow,bowVelocity,ARROW_GRAVITY} from './bow.js';
import {raySolids} from '../world/physics.js';
import { THREE, G, V3, col, lam, mesh, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { CONFIG, HW } from '../config.js';
import { W } from '../world/state.js';
import { groundAt, solidHit, addZone, impulsePushables } from '../world/physics.js';
import { burst, puff, smoke, smokeRing, decal } from '../world/particles.js';
import { splatter } from '../world/splat.js';
import { scareBirds, featherTex } from '../world/birds.js';
import { hitBreakables } from '../world/breakables.js';
import { worldHit, shake, hitFreeze } from './worldfx.js';
import { addItem, launch } from './items.js';
import { actors, shove, knockDown, dropHeld, daze } from './actors.js';
import { sfx } from '../core/sfx.js';
import { placeRake, placeCushion } from './traps.js';
import { callPolice, hasPolice } from './police.js';

/* Инструменты из ящиков — обычные физические предметы (items.js), но у них есть действие на ЛКМ.
   Ящик: 30% — выпадает инструмент, золотой ящик — всегда и «редкий».
   Логика не зависит от рендера и ввода (актёр + точка прицела) — потом её можно перенести на сервер. */
const worlds = new WeakMap();
export function toolState(){let state=worlds.get(W.group||W);if(!state){state={shots:[],traps:[],clouds:[],gold:[],bubbles:new Map(),nets:new Map()};worlds.set(W.group||W,state);}return state;}
const PAINT = [0x4ab0f0, 0xff5a9e, 0x9be36b, 0xf5c542, 0xb18cff];
// железные предметы: магнит тянет их сильнее и вырывает из рук
const METAL = new Set(['can', 'extinguisher', 'whistle', 'badge', 'bulb', 'firework', 'water', 'rake', 'glove', 'vacuum', 'paint']);
// перья из подушки: белые хлопья медленно планируют
function feathers(x, y, z, n) { for (let i = 0; i < n; i++) puff(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.6, { color: Math.random() < 0.8 ? 0xffffff : 0xe8e0f0, size: 0.07 + Math.random() * 0.05, grow: 0, vx: (Math.random() - 0.5) * 3, vy: 0.6 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 3, g: 0.6, life: 1.6 + Math.random() }); sfx('feather', { at: { x, y, z } }); }

export function resetTools() {
  for (const q of toolState().gold) W.group.remove(q.g);
  for (const s of toolState().shots) W.group.remove(s.m); for (const q of toolState().stuck || []) q.m.removeFromParent(); toolState().stuck = [];
  for (const t of toolState().traps) if (t.m) W.group.remove(t.m);
  for (const b of toolState().bubbles.values()) W.group.remove(b); for (const m of toolState().nets.values()) W.group.remove(m); toolState().nets = new Map();
  toolState().shots = []; toolState().traps = []; toolState().clouds = []; toolState().gold = []; toolState().bubbles = new Map();
  if (toolState().flyer) W.group.remove(toolState().flyer.g); toolState().flyer = null; toolState().flyT = 35 + Math.random() * 10;
  W.crateHook = (pos, piece) => { if (Math.random() < (piece.golden ? 1 : 0.3)) spawnTool(pos.x, pos.y, pos.z, piece.golden); };
  W.fires = W.fires || [];
  // золотые ящики: на крышах и в нычках
  const spots = W.missionZones.filter(z => z.type === 'roof' || z.type === 'nook').sort(() => Math.random() - 0.5);
  let n = 0; for (const z of spots) { if (n >= 3) break; goldenCrate((z.x0 + z.x1) / 2, z.y, (z.z0 + z.z1) / 2); n++; }
  scatterTools();for(const p of W.foodSpots)if(Math.random()<.7){const types=Object.keys(SNACKS);addItem(types[Math.random()*types.length|0],p.x,p.y,p.z);}
}
/* При создании карты инструменты разложены случайно, но «по-жизненному»: на лавочке, у подъезда, на крыше, в нычке.
   10–14 штук на карту, не ближе 6 м друг к другу. Больше они сами не появляются (только посылки, птицы, ящики, шкафы). */
function scatterTools() {
  const spots = [];
  for (const b of W.benches || []) spots.push({ x: b.x, y: b.y + 0.48, z: b.z });
  for (const z of W.missionZones) if (z.type !== 'tunnel') for (let k = 0; k < (z.type === 'floor' ? 2 : 1); k++) spots.push({ x: z.x0 + 0.5 + Math.random() * Math.max(0, z.x1 - z.x0 - 1), y: z.y, z: z.z0 + 0.5 + Math.random() * Math.max(0, z.z1 - z.z0 - 1) });
  spots.sort(() => Math.random() - 0.5); toolState().spots = spots;
  const want = 10 + ((Math.random() * 5) | 0), got = [];
  for (const s of spots) { if (got.length >= want) break; if (got.some(q => Math.hypot(q.x - s.x, q.z - s.z) < 6)) continue;
    const gy = groundAt(s.x, s.z, 0.2, s.y + 0.6); if (Math.abs(gy - s.y) > 0.6) continue;
    const pool = (Math.random() < 0.2 ? CONFIG.toolRare : CONFIG.toolPool).filter(t=>!SNACKS[t]), type = pool[(Math.random() * pool.length) | 0];
    addItem(type, s.x, gy, s.z, Math.random() * 6); got.push(s); }
}
/* Раз в ~40 с над городом пролетает ворона (на Хэллоуин — летучая мышь) и роняет предмет в случайном открытом месте */
function flyerModel() {
  const bat = HW, g = new THREE.Group(), body = bat ? col(0x2b2533) : new THREE.MeshLambertMaterial({ map: featherTex('crow') }), eye = col(bat ? 0xff7a1a : 0xf5c542);
  mesh(G.sph10, body, 0, 0, 0, 0.32, 0.26, 0.5, g); mesh(G.sph10, body, 0, 0.1, 0.45, 0.2, 0.2, 0.2, g);
  if (!bat) mesh(G.cone8, col(0x3a3440), 0, 0.08, 0.68, 0.06, 0.16, 0.06, g).rotation.x = Math.PI / 2; else for (const s of [-1, 1]) mesh(G.cone8, body, s * 0.1, 0.32, 0.45, 0.05, 0.14, 0.05, g);
  for (const s of [-1, 1]) mesh(G.box, eye, s * 0.08, 0.15, 0.6, 0.04, 0.04, 0.02, g);
  const wings = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.2, 0.05, 0); g.add(p); mesh(G.box, body, s * 0.45, 0, 0, 0.9, 0.04, bat ? 0.5 : 0.4, p); return p; });
  g.userData.wings = wings; return g;
}
function updateFlyer(dt, t) {
  if (!toolState().spots || !toolState().spots.length) return;
  if (!toolState().flyer) { toolState().flyT -= dt; if (toolState().flyT > 0) return; toolState().flyT = 35 + Math.random() * 12;
    let s = null; for (let k = 0; k < 8 && !s; k++) { const q = toolState().spots[(Math.random() * toolState().spots.length) | 0], gy = groundAt(q.x, q.z, 0.2, q.y + 0.6); if (Math.abs(gy - q.y) < 0.6) s = { x: q.x, y: gy, z: q.z }; }
    if (!s) return;
    const a = Math.random() * 6.28, dx = Math.cos(a), dz = Math.sin(a), g = flyerModel(); W.group.add(g);
    toolState().flyer = { g, s, dx, dz, k: -40, dropped: false, h: s.y + 14 }; return; }
  const f = toolState().flyer; f.k += dt * 11;
  f.g.position.set(f.s.x + f.dx * f.k, f.h + Math.sin(t * 2) * 0.4, f.s.z + f.dz * f.k); f.g.rotation.y = Math.atan2(f.dx, f.dz);
  for (const [i, w] of f.g.userData.wings.entries()) w.rotation.z = (i ? -1 : 1) * Math.sin(t * 16) * 0.7;
  if (!f.dropped && f.k >= 0) { f.dropped = true; const pool = (Math.random() < 0.2 ? CONFIG.toolRare : CONFIG.toolPool).filter(t=>!SNACKS[t]), it = addItem(pool[(Math.random() * pool.length) | 0], f.s.x, f.s.y, f.s.z, Math.random() * 6);
    launch(it, new V3(f.s.x, f.h - 0.4, f.s.z), new V3(0, -2, 0)); sfx('crow', { at: f.g.position }); }
  if (f.k > 40) { W.group.remove(f.g); toolState().flyer = null; }
}
function goldenCrate(x, y, z) {
  const g = compose('goldCrate', a => { const gm = lam({ color: 0xf5c542, emissive: 0x6a4a00, emissiveIntensity: 0.6 }, 'goldCrate'), dk = col(0x6a4a1a);
    a(G.box, gm, 0, 0.35, 0, 0.7, 0.7, 0.7); for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(G.box, dk, sx * 0.33, 0.35, sz * 0.33, 0.06, 0.72, 0.06); a(G.box, dk, 0, 0.69, 0, 0.72, 0.04, 0.12); });
  g.position.set(x, y, z); W.group.add(g); W.keep.push(g);
  toolState().gold.push({ g, x, y, z, used: false });
}
// инструмент выпрыгивает из ящика и падает рядом
export function spawnTool(x, y, z, rare = false, type = null) {
  const pool = (rare ? CONFIG.toolRare : CONFIG.toolPool).filter(t=>!SNACKS[t]);
  type = type || pool[(Math.random() * pool.length) | 0];
  const gy = groundAt(x, z, 0.2, y + 0.5), it = addItem(type, x, gy, z, Math.random() * 6);
  launch(it, new V3(x, gy + 0.6, z), new V3((Math.random() - 0.5) * 3, 5, (Math.random() - 0.5) * 3));
  it.owner = null; burst(x, gy + 0.6, z, 10, { color: rare ? 0xf5c542 : 0xf1e8ff, size: 0.16, speed: 2.5, up: 2.5 });
  return it;
}

/* ---------- применение (ЛКМ). Возвращает звук или null ---------- */
const _d = new V3();
const front = (a,r,dot=.4,fn)=>{const f=a.root.rotation.y,fx=Math.sin(f),fz=Math.cos(f),origin=a.pos.clone().add(new V3(0,.9,0));
 const visible=p=>{const v=p.clone().sub(origin),d=v.length();return raySolids(origin,v.normalize(),d)>=d-.12;};
 for(const b of actors()){if(b===a||b.hidden||b.drone)continue;const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,d=Math.hypot(dx,dz);if(d<r&&Math.abs(b.pos.y-a.pos.y)<1.4&&(dx*fx+dz*fz)/(d||1)>dot&&visible(b.pos.clone().add(new V3(0,.9,0))))fn(b,dx,dz);}
 for(const n of npcList()){const p=npcPosition(n),dx=p.x-a.pos.x,dz=p.z-a.pos.z,d=Math.hypot(dx,dz);if(d<r&&Math.abs(p.y-a.pos.y)<1.4&&(dx*fx+dz*fz)/(d||1)>dot&&visible(p.clone().add(new V3(0,.5,0))))hitNPC(n,false,dx*4,dz*4);}
 return[fx,fz];};
const swing=(a,it,hit)=>{if(a.melee)return null;it.cd=CONFIG.melee.cooldown;a.swatT=CONFIG.melee.duration;a.melee={it,left:CONFIG.melee.duration,hit:false,apply:hit};return null;};
export function useTool(a, it, aim, dt = 0) {
  if (!it || a.stun > 0) return null;
  if(SNACKS[it.type]){eatSnack(a,it);return null;}
  if(it.type==='boombox'){toggleRadio(it);return null;}
  const k = it.type, d = it.def, hp = a.ch ? a.ch.holdPoint : new V3(a.pos.x, a.pos.y + 1.2, a.pos.z);
  const from = hp.clone(), dir = _d.copy(aim).sub(from); const dist = dir.length(); dir.normalize();
  if (d.ammo && it.ammo <= 0) return null;
  const spend = (n = 1) => { if (d.ammo) { it.ammo -= n; if (it.ammo <= 0 && !d.hold) consume(a, it); } else consume(a, it); };
  if (it.cd > 0 && !d.hold) return null;
  switch (k) {
    case 'bong':useBong(a,it);return null;
    // тапок: быстрый шлепок — короткий «ой» (стан стоя), предмет из рук не выбивает
    // банка газировки: открыть — выпить (выносливость); если трясли на бегу — взрывается фонтаном
    case 'bow':{if(it.cd>0)return null;it.draw=Math.min(1,(it.draw||0)+(dt|| (a.bot?0.2:0))/1.0);it.drawAim=aim.clone();return null;}
    case 'perfume':{it.cd=.8;const shot=shoot('perfume',it.pos.clone(),dir,10,0,a);shot.p.copy(it.pos);shot.g=0;shot.v.copy(dir).multiplyScalar(10);shot.life=.32;shot.effect=it.perfumeEffect||'gas';shot.m.scale.set(.045,.045,.11);spend();return 'spray';}
    case 'can': { consume(a, it); if ((it.shake || 0) > 0.5) { sodaBlast(it.pos.clone(), a); return null; } a.stamina = 1; return 'drink'; }
    case 'slipper':return swing(a,it,()=>{const[fx,fz]=front(a,1.7,.38,(b,dx,dz)=>{b.push?.set(dx*1.5,0,dz*1.5);daze(b,.6);hitFreeze(.04);W.onHit?.(a,b,'melee');});puff(a.pos.x+fx,a.pos.y+1,a.pos.z+fz,{size:.3,life:.2,color:0xffd0e0});sfx('swat',{at:a.pos});});
    case 'pillow':return swing(a,it,()=>{let hit=false;const[fx,fz]=front(a,1.9,.35,(b,dx,dz)=>{shove(b,dx,dz,6,3,false);daze(b,1.1);if(Math.random()<.35)b.blind=Math.max(b.blind||0,1);hit=true;hitFreeze(.06);W.onHit?.(a,b,'melee');});feathers(a.pos.x+fx*1.1,a.pos.y+1.1,a.pos.z+fz*1.1,hit?26:8);sfx('pillow',{at:a.pos});});
    case 'umbrella': { it.cd = 0.25; it.open = !it.open; const c = it.g.userData.canopy; if (c) c.scale.set(it.open ? 0.78 : 0.09, it.open ? 0.8 : 1, it.open ? 0.78 : 0.09); return 'umbrella'; }
    case 'banana': { const f = a.root.rotation.y; dropHeld(a); it.state = 'gone'; placeBanana(it, a.pos.x + Math.sin(f) * 0.9, a.pos.y, a.pos.z + Math.cos(f) * 0.9, a); return 'drop'; }
    case 'duck': { it.cd = 0.8; W.lure = { x: a.pos.x, z: a.pos.z, t: 4, by: a }; for (const c of W.cats) c.lure = { x: a.pos.x, z: a.pos.z, t: 4 }; puff(hp.x, hp.y + 0.2, hp.z, { size: 0.4, life: 0.25, color: 0xf5c542 }); return 'squeak'; }
    case 'bubbles': { it.cd = 0.5; shoot('bubble', from, dir, 7, 0, a); spend(); return 'bubble'; }
    case 'whistle': { it.cd = 0.8; for (const b of actors()) { if (b === a || b.hidden) continue; if (Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 8) { b.vel.y = Math.max(b.vel.y, 6); b.onGround = false; dropHeld(b); b.startle = 0.8; } }
      for (const c of W.cats) { const q = c.root.position; if (Math.hypot(q.x - a.pos.x, q.z - a.pos.z) < 10) c.hit && c.hit(false, q.x - a.pos.x, q.z - a.pos.z); } scareBirds(a.pos.x, a.pos.z, 14); W.whistle = { x: a.pos.x, y: a.pos.y, z: a.pos.z, t: 6, by: a }; spend(); return 'whistle'; }
    case 'paint': { const f = a.root.rotation.y; dropHeld(a); it.state = 'gone'; it.g.visible = false; paintPuddle(a.pos.x + Math.sin(f) * 1.2, a.pos.y, a.pos.z + Math.cos(f) * 1.2, 1.2, a); return 'splash'; }
    case 'energy': { a.energy = 7; a.tired = 0; burst(a.pos.x, a.pos.y + 1, a.pos.z, 10, { color: 0x9be36b, size: 0.2, speed: 2 }); spend(); return 'drink'; }
    case 'water': { it.cd = 0.22; for (let i = 0; i < 4; i++) shoot('water', from, dir, 22 + i, i * 0.03, a); spend(); return 'water'; }
    case 'sling': { it.cd = 0.4; shoot('candy', from, dir, 42, 0, a); spend(); return 'candy'; }
    // хлопушка: облако конфетти + оглушение стоя всех в облаке
    case 'popper': { const f = a.root.rotation.y, px = a.pos.x + Math.sin(f) * 2.2, pz = a.pos.z + Math.cos(f) * 2.2; toolState().clouds.push({ x: px, y: a.pos.y, z: pz, t: 2.4, owner: a, hit: new Set() }); const cs = [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff];
      for (const c of cs) burst(px, a.pos.y + 1, pz, 14, { color: c, size: 0.12, speed: 4, up: 3.5, g: 2, life: 2.2, grow: 0 }); smokeRing(px, a.pos.y + 0.8, pz, 10, { speed: 3, size: 0.25, grow: 1, life: 0.6 }); scareBirds(px, pz, 6); spend(); sfx('confetti', { at: a.pos }); return 'pop'; }
    case 'web': { lob('web', from, aim, a); spend(); return 'throw'; }
    case 'firework': { if (it.lit === undefined) { it.lit = 2.4; return 'fuse'; } return null; }
    case 'rake':return swing(a,it,()=>{front(a,2,.2,b=>{daze(b,1.2);W.onHit?.(a,b,'light');});sfx('swat',{at:a.pos});});
    case 'cushion': { const f = a.root.rotation.y, x = a.pos.x + Math.sin(f) * 1.1, z = a.pos.z + Math.cos(f) * 1.1, gy = groundAt(x, z, 0.2, a.pos.y + 0.6);
      if (k === 'rake') placeRake(x, gy, z, f + Math.PI, a); else placeCushion(x, gy, z, a); consume(a, it); return 'drop'; }
    case 'extinguisher': {
      it.ammo -= dt; it.sprayT = 0.1;
      if (Math.random() < 0.9) puff(from.x + dir.x * 0.4, from.y + dir.y * 0.4, from.z + dir.z * 0.4, { color: 0xf1f1ff, size: 0.25, vx: dir.x * 9 + (Math.random() - 0.5), vy: dir.y * 9 + 0.5, vz: dir.z * 9 + (Math.random() - 0.5), g: 0, life: 0.5, grow: 1.6, opacity: 0.7 });
      // струя толкает в конусе
      for (const b of actors()) { if (b === a) continue; const dx = b.pos.x - from.x, dy = b.pos.y + 0.8 - from.y, dz = b.pos.z - from.z, l = Math.hypot(dx, dy, dz); if (l < 5.5 && (dx * dir.x + dy * dir.y + dz * dir.z) / l > 0.85) { b.vel.x += dir.x * 28 * dt; b.vel.z += dir.z * 28 * dt; b.knockT = Math.max(b.knockT || 0, 0.15); b.wetT = 3; } }
      for (const q of W.items) if (q.state === 'rest' && q !== it) { const dx = q.pos.x - from.x, dz = q.pos.z - from.z, l = Math.hypot(dx, dz); if (l < 5 && l > 0.1 && (dx * dir.x + dz * dir.z) / l > 0.85) { q.vel.x += dir.x * 18 * dt / q.def.mass; q.vel.z += dir.z * 18 * dt / q.def.mass; q.vel.y += 4 * dt; } }
      impulsePushables(from.x + dir.x * 2.5, from.z + dir.z * 2.5, 1.5, 8 * dt * 6);
      for (const f of W.fires || []) if (f.hp > 0 && Math.hypot(f.x - (from.x + dir.x * 2.5), f.z - (from.z + dir.z * 2.5)) < 2.6) f.hp -= dt * 1.4;
      // струя вниз — реактивный подскок
      if (dir.y < -0.55) { a.vel.y = Math.min(9, a.vel.y + 34 * dt); a.onGround = false; a.airPeak = a.pos.y; a.jetT = 0.2; }
      // отдача: струя толкает назад (в воздухе — заметнее, можно «лететь»)
      else { const kb = a.onGround ? 5 : 14; a.vel.x -= dir.x * kb * dt; a.vel.z -= dir.z * kb * dt; }
      if (it.ammo <= 0) { it.ammo = 0; it.empty = true; }
      return null;
    }
    // сетемёт: сетка летит вперёд, накрывает — запутался
    // сетемёт: бесконечный, но перезарядка 10 с (видна на иконке в карточке «в руках»)
    // v0.56: игрок держит ЛКМ — видна дуга прицела, отпускает — выстрел (releaseNet). Боты стреляют сразу.
    case 'net': { if (it.cd > 0) return null; if (a.bot) { it.cd = d.cdMax; shoot('net', from, dir, 19, 0, a); return 'throw'; } it.aimT = (it.aimT || 0) + (dt || 0); it.drawAim = aim.clone(); return null; }
    // жетон: вызвать наряд (ПКМ — бросить жетон в соперника)
    case 'badge': return null; // жетон работает броском (ПКМ): наряд выбегает из точки падения
    // перчатка-пружина: удар на 3 м вперёд, отбрасывает далеко
    case 'glove': return swing(a,it,()=>{const [fx,fz]=front(a,3.2,.7,(b,dx,dz)=>{const l=Math.hypot(dx,dz)||1;knockDown(b,dx/l*11,dz/l*11,1.2);b.vel.y=5;hitFreeze(.08);W.onHit?.(a,b,'melee');});
      it.punchT=.25;impulsePushables(a.pos.x+fx*2,a.pos.z+fz*2,1.2,8);worldHit(new V3(a.pos.x+fx*2.6,a.pos.y+1,a.pos.z+fz*2.6),3,new V3(fx*12,2,fz*12));puff(a.pos.x+fx*2.4,a.pos.y+1.1,a.pos.z+fz*2.4,{size:.5,life:.25,color:0xff5a6e});spend();sfx('pillow',{at:a.pos});});
    // пылесос: держи ЛКМ — втягивает предметы (и выдёргивает из рук), отпустил — выстреливает очередью
    case 'vacuum': {
      it.ammo -= dt; it.bag = it.bag || [];
      if (it.bag.length < 5) for (const q of W.items) { if (q === it || it.bag.includes(q) || (q.state !== 'rest' && q.state !== 'fly')) continue; const dx = from.x - q.pos.x, dz = from.z - q.pos.z, l = Math.hypot(dx, dz);
        if (l > 8 || -(dx * dir.x + dz * dir.z) / (l || 1) < 0.6) continue; q.vel.x += dx / l * 30 * dt; q.vel.z += dz / l * 30 * dt; q.vel.y = Math.max(q.vel.y, 1); if (q.state === 'rest') { q.state = 'fly'; q.noHitT = 0.5; q.owner = a; }
        if (l < 1.0) { q.state = 'gone'; q.g.visible = false; it.bag.push(q); sfx('pop', { at: from, v: 0.5 }); if (q.steal && q.mine !== a) W.onVacuumSteal && W.onVacuumSteal(a, q); } }
      for (const b of actors()) { if (b === a || !b.held || b.held === it) continue; const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, l = Math.hypot(dx, dz); if (l < 4 && (dx * dir.x + dz * dir.z) / (l || 1) > 0.7) dropHeld(b, -dx * 2, -dz * 2); }
      if (Math.random() < dt * 14) puff(from.x + dir.x * (1 + Math.random() * 3), from.y, from.z + dir.z * (1 + Math.random() * 3), { color: 0xd8d0e4, size: 0.1, vx: -dir.x * 6, vz: -dir.z * 6, vy: 0, life: 0.3 });
      // кучи листьев: пылесос всасывает листву, спрятавшийся в куче вылетает
      for (const h of W.hides) { if (h.kind !== 'leaves') continue; const dx = h.x - from.x, dz = h.z - from.z, l = Math.hypot(dx, dz); if (l > 6 || (dx * dir.x + dz * dir.z) / (l || 1) < 0.6) continue;
        if (Math.random() < dt * 22) puff(h.x + (Math.random() - 0.5) * 1.2, h.y + 0.3, h.z + (Math.random() - 0.5) * 1.2, { color: [0xe0902e, 0xc96a25, 0xf5c542][(Math.random() * 3) | 0], size: 0.12, grow: 0, vx: -dx / l * 9, vy: 1, vz: -dz / l * 9, life: l / 9, g: 0 });
        for (const b of actors()) if (b.hidden === h && W.leaveHide) W.leaveHide(b); }
      if (it.ammo <= 0) { it.ammo = 0; it.empty = true; }
      return null;
    }
    // магнит: бесконечный, пока держишь ЛКМ; тянет сразу несколько предметов (железные — сильнее и издалека), тележки/урны/бочки
    case 'magnet': {
      it.sprayT = 0.1;
      for (const q of W.items) if ((q.state === 'rest' || q.state === 'fly') && q !== it) { const dx = from.x - q.pos.x, dz = from.z - q.pos.z, l = Math.hypot(dx, dz), m = METAL.has(q.type) ? 1.8 : 1;
        if (l < 11 * m && l > 0.9 && -(dx * dir.x + dz * dir.z) / l > 0.5) { q.state = 'fly'; q.noHitT = 0.3; q.owner = a; q.vel.x += dx / l * 24 * m * dt; q.vel.z += dz / l * 24 * m * dt; q.vel.y = Math.max(q.vel.y, 1.2); if (l < 1.6) { q.vel.x *= 0.8; q.vel.z *= 0.8; } } }
      for (const p of W.pushables) { if (p.rider || p.grabbed) continue; const m = p.kind === 'cart' || p.kind === 'bin' || p.kind === 'barrel' || p.kind === 'scooter' ? 1.6 : 0.6, dx = from.x - p.x, dz = from.z - p.z, l = Math.hypot(dx, dz); if (l < 11 && l > 1.4 && -(dx * dir.x + dz * dir.z) / l > 0.55) { p.vx += dx / l * 14 * m * dt / p.mass; p.vz += dz / l * 14 * m * dt / p.mass; } }
      for (const b of actors()) { if (b === a || !b.held || !METAL.has(b.held.type)) continue; const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, l = Math.hypot(dx, dz); if (l < 6 && (dx * dir.x + dz * dir.z) / (l || 1) > 0.7 && Math.random() < dt * 1.5) dropHeld(b, -dx * 2, -dz * 2); }
      if (Math.random() < dt * 10) puff(from.x + dir.x * 1.5, from.y, from.z + dir.z * 1.5, { color: 0xff5a6e, size: 0.12, vx: -dir.x * 3, vz: -dir.z * 3, vy: 0, life: 0.4 });
      return null;
    }
  }
  return null;
}
// пылесос: выстрелить содержимым очередью в сторону прицела
// газировку растрясли: фонтан пены, брызги, всех рядом отталкивает и мочит
export function sodaBlast(p, owner) {
  for (let i = 0; i < 26; i++) puff(p.x, p.y + 0.2, p.z, { color: Math.random() < 0.6 ? 0xf1e8ff : 0xd8a060, size: 0.14, grow: 0.6, vx: (Math.random() - 0.5) * 3, vy: 5 + Math.random() * 5, vz: (Math.random() - 0.5) * 3, g: 9, life: 1.2 });
  sfx('fizz', { at: p }); addZone('puddle', { c: [p.x, p.z, 1.1] }, groundAt(p.x, p.z, 0.2, p.y + 0.5), { expires: 10 });
  for (const b of actors()) { const dx = b.pos.x - p.x, dz = b.pos.z - p.z, d = Math.hypot(dx, dz); if (d < 1.8 && Math.abs(b.pos.y - p.y) < 2) { if (b !== owner) shove(b, dx || 0.1, dz, 5, 5, true); else { b.vel.y = Math.max(b.vel.y, 7); b.onGround = false; } b.wetT = 4; b.slipT = 2; } }
}
export function vacuumFire(a, it, aim) {
  if (!it.bag || !it.bag.length) return 0; const hp = a.ch ? a.ch.holdPoint : new V3(a.pos.x, a.pos.y + 1.2, a.pos.z), dir = new V3().subVectors(aim, hp).normalize(); let i = 0;
  for (const q of it.bag) { const k = i++; setTimeout(() => { if (q.state !== 'gone') return; q.state = 'fly'; q.g.visible = true; q.owner = a; q.noHitT = 0.15; q.pos.copy(hp).addScaledVector(dir, 0.7); q.vel.set(dir.x * 22 + (Math.random() - 0.5) * 2, dir.y * 22 + 2, dir.z * 22 + (Math.random() - 0.5) * 2); sfx('throw', { at: a.pos }); }, k * 110); }
  const n = it.bag.length; it.bag = []; return n;
}
const _wob = new THREE.Quaternion(), _we = new THREE.Euler();
// присоска прилипает: к стене/земле — в точке удара, к персонажу — к его телу (ездит вместе с ним)
function stickArrow(s, pt, actor, gy) {
  const st = toolState(), list = st.stuck || (st.stuck = []), m = s.m, dir = s.v.clone().normalize();
  if (list.length >= 24) { const old = list.shift(); old.m.removeFromParent(); }
  if (actor && actor.ch && actor.ch.body) {
    const body = actor.ch.body; body.updateMatrixWorld(true); const c = new V3(actor.pos.x, Math.min(actor.pos.y + 1.6, Math.max(actor.pos.y + .45, pt.y)), actor.pos.z);
    const flat = new V3(pt.x - actor.pos.x, 0, pt.z - actor.pos.z); if (flat.lengthSq() < .001) flat.set(-dir.x, 0, -dir.z); flat.normalize();
    const at = c.clone().addScaledVector(flat, .36), tail = at.clone().addScaledVector(flat, 1), lp = body.worldToLocal(at.clone());
    body.add(m); m.position.copy(lp); m.lookAt(at.clone().addScaledVector(flat, -1)); m.position.addScaledVector(new V3(0, 0, -.42).applyQuaternion(m.quaternion), 1); void tail;
  } else { const p = pt.clone(); if (s.p.y <= gy) p.y = gy + .02; m.position.copy(p).addScaledVector(dir, -.4); m.lookAt(p.clone().add(dir)); }
  m.visible = true; list.push({ m, t: 0, q0: m.quaternion.clone(), a: actor || null });
}
export function releaseNet(a,it,aim){if(it?.type!=='net')return;const ok=(it.aimT||0)>0;it.aimT=0;if(!ok||it.cd>0||a.stun>0)return;const from=it.pos.clone(),dir=aim.clone().sub(from).normalize();shoot('net',from,dir,19,0,a);it.cd=it.def.cdMax;a.throwT=.2;sfx('throw',{at:a.pos});}
export function releaseBow(a,it,aim){if(it?.type!=='bow')return;const draw=it.draw||0;it.draw=0;if(draw<.12||it.cd>0||it.ammo<=0||a.stun>0)return;const from=it.pos.clone(),velocity=bowVelocity(from,aim,draw),shot=shoot('arrow',from,velocity.clone().normalize(),velocity.length(),0,a);shot.p.copy(from);shot.v.copy(velocity);shot.g=ARROW_GRAVITY;shot.life=3;it.ammo--;it.cd=1.05;a.throwT=.2;sfx('throw',{at:a.pos});}
function consume(a, it) { if (a.held === it) a.held = null; it.state = 'gone'; it.g.visible = false; it.def = { ...it.def, respawn: 0 }; }

/* ловушки: банановая кожура, лужа краски, паутина */
export function placeBanana(it, x, y, z, owner = it.owner) {
  const gy = groundAt(x, z, 0.1, y + 0.6);
  const m = compose('peel', a => { const yl = col(0xf5d442); for (let i = 0; i < 4; i++) a(G.box, yl, Math.cos(i * 1.57) * 0.09, 0.02, Math.sin(i * 1.57) * 0.09, 0.07, 0.025, 0.16, 0, i * 1.57); a(G.sph, col(0xe8d0a0), 0, 0.04, 0, 0.05, 0.04, 0.05); });
  m.position.set(x, gy, z); m.rotation.y = Math.random() * 6; W.group.add(m);
  toolState().traps.push({ kind: 'banana', x, y: gy, z, r: 0.55, t: 40, m, arm: 0.4, owner });
}
// лужа краски: краска брызгами-пикселями красит всё вокруг; кто наступил — оставляет цветные следы
export function paintPuddle(x, y, z, r, owner = null) {
  const gy = groundAt(x, z, 0.1, y + 0.6), c = PAINT[(Math.random() * PAINT.length) | 0];
  splatter(new V3(x, gy + 0.3, z), null, c, 46, 0.55 * r, { flat: true, owner });
  burst(x, gy + 0.3, z, 8, { color: c, size: 0.18, speed: 2.5, up: 2 });
  toolState().traps.push({ kind: 'paint', x, y: gy, z, r, t: 22, c, owner, hit: new Set() });
}
/* паутина-ловушка (v0.18): банка разбивается, паучок выбегает и за ~1 с плетёт сеть, потом сидит в центре */
function spiderModel() { const g = new THREE.Group(), b = col(0x17111f); mesh(G.sph10, b, 0, 0.08, -0.05, 0.09, 0.07, 0.11, g); mesh(G.sph10, b, 0, 0.07, 0.07, 0.06, 0.05, 0.06, g);
  for (const e of [-1, 1]) mesh(G.box, col(0xff3a3a), e * 0.025, 0.09, 0.12, 0.015, 0.015, 0.01, g);
  const legs = []; for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const l = mesh(G.box, b, sd * 0.1, 0.06, 0.06 - i * 0.05, 0.16, 0.012, 0.012, g); l.rotation.y = sd * (0.5 - i * 0.33); l.rotation.z = sd * -0.4; legs.push(l); }
  g.userData.legs = legs; return g; }
function webTrap(x, y, z, owner = null) {
  const m = decal(T.web(), x, y, z, 3, 16, 0xffffff); m.scale.setScalar(0.01);
  const sp = spiderModel(), a0 = Math.random() * 6.28; sp.position.set(x + Math.cos(a0) * 0.9, y + 0.02, z + Math.sin(a0) * 0.9); W.group.add(sp);
  burst(x + Math.cos(a0) * 0.9, y + 0.15, z + Math.sin(a0) * 0.9, 8, { color: 0xd8f0f0, size: 0.08, speed: 2, up: 1.5 }); sfx('glass', { at: { x, y, z }, v: 0.5 });
  toolState().traps.push({ kind: 'web', x, y, z, r: 1.4, t: 16, m, sp, a0, weave: 0, owner, hit: new Set() }); }

/* сетка накрыла: 2.5 с еле ползёшь, первые 1.2 с — оглушение; сверху видна сетка */
const NETM = () => lam({ color: 0xe8e0c8, wireframe: true }, 'netWire');
export function netActor(a, owner) {
  if (a.hidden || a.caged) return; if (a.ride && W.dismount) W.dismount(a); if(a.holding)W.letGo?.(a);a.vel.x*=0.12;a.vel.z*=0.12; a.netT = 2.2; a.webT = Math.max(a.webT || 0, 3); dropHeld(a);
  if (!toolState().nets.has(a)) { const m = mesh(G.sph10, NETM(), 0, 0, 0, 0.75, 1.0, 0.75, W.group); toolState().nets.set(a, m); }
  sfx('grab', { at: a.pos }); burst(a.pos.x, a.pos.y + 1.2, a.pos.z, 8, { color: 0xe8e0c8, size: 0.12, speed: 1.8 }); W.onHit && W.onHit(owner, a, 'heavy');
}
/* выстрелы: вода, конфета из рогатки, пузырь, паутина/фейерверк навесом */
const SHOT_GEO = new THREE.SphereGeometry(1, 5, 4);
function shotMesh(kind) { const c = { water: 0x7ac8f0, candy: 0xff5a9e, web: 0xe8e0f0, bubble: 0xc8f0ff, net:0xe8e0c8,perfume:0xc9b4ec}[kind];
  return mesh(SHOT_GEO, lam({ color: c, emissive: c, emissiveIntensity: 0.4, transparent: kind === 'bubble', opacity: kind === 'bubble' ? 0.55 : 1 }, 'shot' + kind), 0, 0, 0, 1, 1, 1, W.group); }
export function shoot(kind, from, dir, speed, delay, owner) {
  const m = kind==='arrow'?arrowModel():kind === 'net' ? mesh(G.sph10, NETM(), 0, 0, 0, 1, 1, 1, W.group) : shotMesh(kind); if(kind==='arrow'){W.group.add(m);m.scale.setScalar(1);}else if (kind === 'net') m.scale.set(0.3, 0.1, 0.3); else m.scale.setScalar(kind === 'water' ? 0.09 : kind === 'bubble' ? 0.28 : 0.08); m.visible = false;
  const shot={ kind, m, p: from.clone().addScaledVector(dir, 0.6), v: dir.clone().multiplyScalar(speed).add(new V3(0, kind === 'water' ? 1.5 : kind === 'bubble' ? 0.6 : kind === 'net' ? 2 : 0.6, 0)), g: kind === 'water' ? 14 : kind === 'bubble' ? -0.4 : kind === 'net' ? 6 : 4, life: kind === 'bubble' ? 2.6 : 1.6, delay, owner };toolState().shots.push(shot);return shot;
}
function lob(kind, from, aim, owner) {
  const d = new V3(aim.x - from.x, 0, aim.z - from.z), dist = Math.min(16, d.length()); d.normalize();
  const t = 0.35 + dist / 18, vx = d.x * dist / t, vz = d.z * dist / t, vy = (aim.y - from.y + 0.5 * 22 * t * t) / t;
  const m = shotMesh(kind); m.scale.setScalar(0.14);
  toolState().shots.push({kind,m,p:from.clone(),v:new V3(vx,vy,vz),g:22,life:4,delay:0,owner});
}
function hitActorsAt(p, r, owner) { for (const a of actors()) { if (a === owner || a.hidden) continue; const q = a.pos; if (Math.hypot(q.x - p.x, q.z - p.z) < r && p.y > q.y - 0.3 && p.y < q.y + a.h + 0.3) return a; } return null; }
export function explode(p, owner, kind = 'firework') {
  // v0.51: настоящий фейерверк (ракеты и разноцветные разрывы над улицей) или тяжёлый взрыв (горячая тыква)
  if (kind === 'firework') fireworks(p, 5); else explosion(p, 1.25, { debris: [0xff8a1f, 0xc4561a, 0x3a2a20, 0x5b8a2a] });

  for (const a of actors()) { const dx = a.pos.x - p.x, dz = a.pos.z - p.z, d = Math.hypot(dx, dz); if (d < 3.4 && Math.abs(a.pos.y - p.y) < 2.5) { const l = d || 1, k = 1 - d / 3.4; knockDown(a, (dx || 0.1) / l * (5 + 6 * k), dz / l * (5 + 6 * k), 0.8 + k * 0.6); a.vel.y = 6 + 3 * k; hitFreeze(0.07); } }
  hitBreakables({ x: p.x, y: p.y + 0.8, z: p.z }, 2.5, [0, 8, 0], 3);
  for (const c of W.cats) { const q = c.root.position; if (Math.hypot(q.x - p.x, q.z - p.z) < 6) c.hit && c.hit(false, q.x - p.x, q.z - p.z); }
  sfx('boom', { at: p }); scareBirds(p.x, p.z, 20); impulsePushables(p.x, p.z, 3, 6); worldHit(p, 5, new V3());
}
// удар брошенного инструмента (из items.impact): банан и краска становятся ловушками, фейерверк ждёт фитиль
export function toolImpact(it, p, gy) {
  const k = it.type;
  if (k === 'banana') { it.state = 'gone'; it.g.visible = false; placeBanana(it, p.x, gy + 0.05, p.z); return true; }
  if (k === 'paint') { it.state = 'gone'; it.g.visible = false; paintPuddle(p.x, gy + 0.05, p.z, 1.6, it.owner); sfx('splash', { at: p }); return true; }
  if (k === 'web') { it.state = 'gone'; it.g.visible = false; webTrap(p.x, gy, p.z, it.owner); return true; }
  if(k==='rake'&&p.y<gy+.4){it.state='gone';it.g.visible=false;placeRake(p.x,gy,p.z,it.g.rotation.y,it.owner);return true;}
  if (k === 'duck') sfx('squeak', { at: p });
  if (k === 'pillow') burst(p.x, p.y, p.z, 10, { color: 0xffffff, size: 0.12, speed: 2, up: 1.5, g: 1.2, life: 1.4, grow: 0 });
  return false;
}

/* ---------- обновление ---------- */
const _f = new V3();
export function updateTools(dt, t) {
  const P = W.player;
  updateFlyer(dt, t);
  // эффекты на актёрах
  for (const a of actors()) {
    if (a.energy > 0) { a.energy -= dt; a.stamina = 1; if (a.energy <= 0) a.tired = 3; } else if (a.tired > 0) a.tired -= dt;
    if (a.ghost > 0) a.ghost -= dt;
    if (a.blind > 0) a.blind -= dt;
    if (a.startle > 0) a.startle -= dt;
    if(a.melee){const m=a.melee;if(a.held!==m.it||a.stun>0||a.heldBy||a.getT>0){a.melee=null;a.swatT=0;}else{m.left-=dt;a.swatT=Math.max(0,m.left);if(!m.hit&&m.left<=CONFIG.melee.impactLeft){m.hit=true;m.apply();}if(m.left<=0)a.melee=null;}}
    else if (a.swatT > 0) a.swatT -= dt;
    { const nm = toolState().nets.get(a); if (a.netT > 0) { a.netT -= dt;a.vel.x*=Math.exp(-dt*10);a.vel.z*=Math.exp(-dt*10); if (nm) { nm.visible = true; nm.position.set(a.pos.x, a.pos.y + 0.85, a.pos.z); nm.rotation.y += dt; } } else if (nm) { W.group.remove(nm); toolState().nets.delete(a); } }
    // пузырь: висит в воздухе и медленно поднимается
    let bub = toolState().bubbles.get(a);
    /* пузырь (v0.18): объёмный, полупрозрачный, с бликом; персонаж внутри виден и подлетает ~1 с.
       Лопается сам, от касания стены/потолка или от попадания предметом (a.popBubble). */
    if (a.floatT > 0) { a.floatT -= dt; a.vel.set(a.vel.x * 0.95, 1.6, a.vel.z * 0.95); a.onGround = false; a.airPeak = a.pos.y;
      if (!bub) { bub = new THREE.Group(); W.group.add(bub); toolState().bubbles.set(a, bub);
        mesh(G.sph10, lam({ color: 0xc8f0ff, emissive: 0x2a5a70, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }, 'bubbleBig'), 0, 0, 0, 1.1, 1.2, 1.1, bub);
        mesh(G.sph10, lam({ color: 0xffffff, emissive: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }, 'bubbleGlint'), -0.42, 0.5, 0.55, 0.16, 0.1, 0.06, bub).rotation.z = 0.6;
        mesh(G.sph10, lam({ color: 0xffffff, emissive: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }, 'bubbleGlint2'), 0.48, -0.42, 0.5, 0.07, 0.05, 0.03, bub); }
      bub.visible = true; bub.position.set(a.pos.x, a.pos.y + 0.85, a.pos.z); const w = Math.sin(t * 7) * 0.04; bub.scale.set(1 + w, 1 - w, 1 + w); bub.rotation.y = t * 0.6;
      if (solidHit(new V3(a.pos.x, a.pos.y + 2.1, a.pos.z), 0.3) || a.popBubble) a.floatT = 0;
      if (a.floatT <= 0) { a.popBubble = false; a.floatT = 0; burst(a.pos.x, a.pos.y + 0.9, a.pos.z, 14, { color: 0xc8f0ff, size: 0.12, speed: 2.8 }); sfx('pop', { at: a.pos, v: 0.6 }); bub.visible = false; } }
    else if (bub) bub.visible = false;
    // краска на подошвах: цветные следы
    if (a.paintT > 0) { a.paintT -= dt; a.paintStep = (a.paintStep || 0) - dt;
      if (a.onGround && Math.hypot(a.vel.x, a.vel.z) > 1.5 && a.paintStep <= 0) { a.paintStep = 0.28; a.paintS = -(a.paintS || 1); const f = a.root.rotation.y, sx = Math.cos(f) * 0.14 * a.paintS, sz = -Math.sin(f) * 0.14 * a.paintS;
        const d = decal(T.footW(), a.pos.x + sx, a.pos.y, a.pos.z + sz, 0.34, 10, a.paintC); d.rotation.z = f; } }
    // фейерверк в руках догорел — бах прямо в руках
    const h=a.held;if(a.bowHeld&&a.bowHeld!==h){a.bowHeld.draw=0;a.bowHeld.quiver?.removeFromParent();a.bowHeld.equipT=0;a.bowHeld=null;}if(h?.type==='bow'){a.bowHeld=h;poseBow(a,h,dt);}
    if (h && h.lit !== undefined) { h.lit -= dt; if (Math.random() < dt * 30) puff(h.pos.x, h.pos.y + 0.2, h.pos.z, { size: 0.1, life: 0.3, vy: 1, color: 0xffd25c }); if (h.lit <= 0) { a.held = null; h.state = 'gone'; h.g.visible = false; explode(h.pos.clone(), null); } }
    // банку трясут на бегу
    if (h && h.type === 'can') { const sp = Math.hypot(a.vel.x, a.vel.z); if (sp > 5 || !a.onGround) h.shake = Math.min(1, (h.shake || 0) + dt * 0.35); else h.shake = Math.max(0, (h.shake || 0) - dt * 0.05); if (h.shake > 0.5 && Math.random() < dt * 6) puff(h.pos.x, h.pos.y + 0.15, h.pos.z, { color: 0xf1e8ff, size: 0.06, vy: 1, life: 0.3 }); }
    if (h && h.type === 'glove') { h.punchT = Math.max(0, (h.punchT || 0) - dt); const ch = h.g.children[0]; if (ch) ch.position.z = Math.sin(Math.min(1, h.punchT / 0.25) * Math.PI) * 1.4; }
  }
  // брошенный горящий фейерверк: лежит, искрит, взрывается
  for (const it of W.items) if (it.lit !== undefined && it.state !== 'held' && it.state !== 'gone') { it.lit -= dt; if (Math.random() < dt * 30) puff(it.pos.x, it.pos.y + 0.15, it.pos.z, { size: 0.12, life: 0.3, vy: 1.2, color: 0xffd25c }); if (it.lit <= 0) { it.state = 'gone'; it.g.visible = false; explode(it.pos.clone(), it.owner); } }
  for (const q of W.items) if (q.cd > 0) q.cd -= dt;
  // лежащие инструменты больше не исчезают: предметов на раунд ограниченное число
  // золотые ящики
  for (const q of toolState().gold) {
    if (q.used) continue;
    for (const a of actors()) if (Math.hypot(a.pos.x - q.x, a.pos.z - q.z) < 0.9 && Math.abs(a.pos.y - q.y) < 1.2) { q.g.visible = false; q.used = true; burst(q.x, q.y + 0.5, q.z, 14, { color: 0xf5c542, size: 0.2, speed: 3, up: 3 }); spawnTool(q.x, q.y + 0.3, q.z, true); if (a === P) sfx('pickup'); break; }
  }
  // выстрелы
  for (let i = toolState().shots.length - 1; i >= 0; i--) {
    const s = toolState().shots[i];
    if (s.delay > 0) { s.delay -= dt; continue; }
    s.m.visible = true; s.life -= dt;
    const old=s.p.clone(),beforeV=s.v.clone();s.v.y-=s.g*dt;
    const dv=beforeV.multiplyScalar(dt);dv.y-=.5*s.g*dt*dt;const length=dv.length(),direction=dv.clone().normalize(),wallDist=raySolids(old,direction,length);s.p.addScaledVector(direction,Math.min(length,wallDist));s.arrowWall=wallDist<length;if(s.kind==='arrow')s.m.lookAt(s.p.clone().add(s.v));
    s.m.position.copy(s.p);
    if (W.thief && W.thief.st === 'carry' && s.p.distanceTo(W.thief.p) < 0.8) W.thief.hit = true;
    if (s.kind === 'bubble') { s.v.multiplyScalar(Math.exp(-dt * 0.6)); s.m.scale.setScalar(0.28 + Math.sin(t * 8 + i) * 0.02); }
    // сетка раскрывается в полёте и крутится
    if (s.kind === 'net') { const k = Math.min(1, (1.6 - s.life) * 4); s.m.scale.set(0.3 + k * 0.5, 0.1, 0.3 + k * 0.5); s.m.rotation.y += dt * 9; s.m.rotation.x = Math.atan2(s.v.y, Math.hypot(s.v.x, s.v.z)) * 0.5; }
    const gy = groundAt(s.p.x, s.p.z, 0.05, s.p.y + 0.1), wall = s.arrowWall||solidHit(s.p, 0.06); let hitA=null;
    const swept=sweepActors(old,s.p,s.kind==='bubble'?.45:.12,s.owner);let npcHit=null;if(swept){s.p.lerpVectors(old,s.p,swept.t);s.m.position.copy(s.p);if(npcList().includes(swept.actor)){npcHit=swept.actor;if(s.kind!=='perfume')hitNPC(npcHit,false,s.v.x,s.v.z);}else hitA=swept.actor;}
    if(W.moth&&['arrow','candy','water'].includes(s.kind)){const seg=s.p.clone().sub(old),v=W.moth.g.position.clone().sub(old),k=Math.max(0,Math.min(1,v.dot(seg)/Math.max(.001,seg.lengthSq()))),point=old.clone().addScaledVector(seg,k);if(point.distanceTo(W.moth.g.position)<1.4){W.moth.hitAt(point,s.kind==='water'?.25:1,s.owner);s.life=0;}}
    let gone = s.life <= 0;
    if(s.p.y<=gy||wall||hitA||npcHit){
      const pt = s.p.clone(); if (s.p.y <= gy) pt.y = gy; gone = true;
      const fakeIt = (type, mass) => ({ type, vel: s.v, def: { mass, r: 0.1, heavy: false }, pos: pt });
      if(s.kind==='arrow'){if(hitA){daze(hitA,1.2);W.onHit?.(s.owner,hitA,'light');}burst(pt.x,pt.y,pt.z,4,{color:0xff6a7a,size:.05,speed:1.2});sfx('pop',{at:pt,v:.7});sfx('squeak',{at:pt,v:.35});stickArrow(s,pt,hitA,gy);s.stuck=true;}
      else if (s.kind === 'water') { burst(pt.x, pt.y, pt.z, 3, { color: 0x9ccbec, size: 0.12, speed: 1.5 }); sfx('imp', { at: pt, v: 0.25, m: 'water' });
        // раскрытый зонтик спереди — вода не мочит
        if (hitA && hitA.held && hitA.held.type === 'umbrella' && hitA.held.open && -(s.v.x * Math.sin(hitA.root.rotation.y) + s.v.z * Math.cos(hitA.root.rotation.y)) > 2) hitA = null;
        if (hitA) { hitA.push.set(s.v.x * 0.06, 0, s.v.z * 0.06); hitA.wetT = 4; hitA.slipT = 2; } hitBreakables(pt, 0.2, [s.v.x, s.v.y, s.v.z], 0.15, ['bulb']); worldHit(pt, 0.5, s.v); for (const h of W.hitHooks.slice()) h(fakeIt('water', 0.6), pt); for (const f of W.fires || []) if (Math.hypot(f.x - pt.x, f.z - pt.z) < 1.3) f.hp -= 0.12;
        // полил клумбу — цветы вспыхивают лепестками
        for (const fb of W.flowerbeds || []) if (pt.x > fb.x0 && pt.x < fb.x1 && pt.z > fb.z0 && pt.z < fb.z1 && pt.y < fb.top + 0.6 && Math.random() < 0.5) burst(pt.x, fb.top + 0.2, pt.z, 3, { color: [0xff7aa8, 0xf5c542, 0xb18cff][(Math.random() * 3) | 0], size: 0.1, speed: 1.2, up: 2, g: 3, life: 0.8, grow: 0 }); if (!hitA && Math.random() < 0.3) splatter(pt, s.v, 0x4a90d0, 3, 0.4); }
      else if (s.kind === 'candy') { burst(pt.x, pt.y, pt.z, 4, { color: 0xff5a9e, size: 0.1, speed: 2 }); if (hitA) { hitA.push.set(s.v.x * 0.08, 0, s.v.z * 0.08); hitFreeze(0.04); } hitBreakables(pt, 0.2, [s.v.x, s.v.y, s.v.z], 0.3, ['glass', 'bulb', 'bottle']); worldHit(pt, 1.2, s.v); for (const h of W.hitHooks.slice()) h(fakeIt('candy', 0.6), pt); for (const h of W.moth ? [W.moth] : []) h.hitAt && h.hitAt(pt, 1,s.owner); }
      else if (s.kind === 'bubble') { if (hitA) { if (hitA.ride && W.dismount) W.dismount(hitA); hitA.climb = null; hitA.floatT = 1.2; dropHeld(hitA); sfx('bubble', { at: pt }); } else burst(pt.x, pt.y, pt.z, 6, { color: 0xc8f0ff, size: 0.1, speed: 1.5 }); }
      else if (s.kind === 'web') webTrap(pt.x, gy, pt.z, s.owner);
      else if (s.kind === 'net') { if (hitA) { netActor(hitA, s.owner); } else { burst(pt.x, pt.y, pt.z, 6, { color: 0xe8e0c8, size: 0.1, speed: 1.5 });
        // промах: сетка ложится на землю и через несколько секунд исчезает
        const gy2 = groundAt(pt.x, pt.z, 0.2, pt.y + 0.5), nm = mesh(G.sph10, NETM(), pt.x, gy2 + 0.04, pt.z, 0.85, 0.05, 0.85, W.group); nm.rotation.y = Math.random() * 6; toolState().traps.push({ kind: 'netlie', x: pt.x, y: gy2, z: pt.z, r: 0, t: 6, m: nm }); } }
    }
    if(gone&&s.kind==='perfume'){toolState().clouds.push({x:s.p.x,y:s.p.y-.6,z:s.p.z,t:4,effect:s.effect,tick:0,owner:s.owner,grace:.8,hit:new Set()});smokeRing(s.p.x,s.p.y,s.p.z,7,{color:0xb9a0df,speed:1.4,size:.1,life:.6});}
    if (gone) { if (!s.stuck) W.group.remove(s.m); toolState().shots.splice(i, 1); }
  }
  // стрелы-присоски: покачиваются после удара, через 8 с плавно исчезают; с игрока отваливаются при кувырке
  const stuck = toolState().stuck || [];
  for (let i = stuck.length - 1; i >= 0; i--) { const q = stuck[i]; q.t += dt; const amp = .35 * Math.exp(-q.t * 5);
    q.m.quaternion.copy(q.q0).multiply(_wob.setFromEuler(_we.set(Math.sin(q.t * 34) * amp, Math.cos(q.t * 29) * amp * .6, 0)));
    const off = q.a && (q.a.dive || q.a.rag > .5 || q.a.drone); if (q.t > 8 || off) { const k = off ? 0 : Math.min(1, (q.t - 8) * 3); q.m.scale.setScalar(1 - k); if (off || k >= 1) { q.m.removeFromParent(); stuck.splice(i, 1); } } }
  // ловушки
  for (let i = toolState().traps.length - 1; i >= 0; i--) {
    const q = toolState().traps[i]; q.t -= dt; if (q.arm > 0) q.arm -= dt;
    if (q.kind === 'netlie') { if (q.t < 1) q.m.scale.y = 0.05 * q.t; if (q.t <= 0) { W.group.remove(q.m); toolState().traps.splice(i, 1); } continue; }
    if (q.t <= 0) { if (q.m && q.kind === 'banana') W.group.remove(q.m); if (q.sp) W.group.remove(q.sp); toolState().traps.splice(i, 1); continue; }
    if (q.kind === 'web' && q.sp) { const sp = q.sp, L = sp.userData.legs;
      if (q.weave < 1) { q.weave = Math.min(1, q.weave + dt); const k = q.weave, ang = q.a0 + k * 9, r = 0.9 * (1 - k); q.m.scale.setScalar(Math.max(0.01, k));
        sp.position.set(q.x + Math.cos(ang) * r, q.y + 0.03, q.z + Math.sin(ang) * r); sp.rotation.y = -ang; L.forEach((l, j) => (l.rotation.x = Math.sin(t * 40 + j) * 0.5)); }
      else { sp.position.set(q.x, q.y + 0.03, q.z); L.forEach((l, j) => (l.rotation.x = Math.sin(t * 3 + j) * 0.08)); }
    }
    for (const a of actors()) {
      if (a.hidden || Math.hypot(a.pos.x - q.x, a.pos.z - q.z) > q.r || Math.abs(a.pos.y - q.y) > 0.5) continue;
      // паутина и краска: срабатывание «засчитывается» хозяину один раз на каждого
      if ((q.kind === 'web' || q.kind === 'paint') && q.owner && a !== q.owner && !q.hit.has(a)) { q.hit.add(a); W.onFunny && W.onFunny(a, q.kind, q.owner); }
      if (q.kind === 'web') { if (q.weave >= 1) a.webT = 0.2; }
      else if (q.kind === 'paint') { a.paintT = 10; a.paintC = q.c; }
      else if (q.kind === 'banana' && !(q.arm > 0) && a.onGround && Math.hypot(a.vel.x, a.vel.z) > 1.5) {
        // поскользнулся: ноги вперёд, падение
        knockDown(a, a.vel.x * 0.8, a.vel.z * 0.8, 1.3); a.vel.y = 6; a.slipFall = 0.8; sfx('slip', { at: a.pos });
        W.group.remove(q.m); toolState().traps.splice(i, 1); W.onFunny && W.onFunny(a, 'slip', q.owner); break;
      }
    }
  }
  for (let i = toolState().clouds.length - 1; i >= 0; i--) { const c=toolState().clouds[i];c.t-=dt;c.grace=Math.max(0,(c.grace||0)-dt); if (c.t <= 0) { toolState().clouds.splice(i, 1); continue; }
    if(c.effect){c.tick-=dt;if(c.tick<=0){c.tick=.12;smoke(c.x+(Math.random()-.5)*3,c.y+.8,c.z+(Math.random()-.5)*3,{color:c.effect==='haste'?0x9be36b:0xb18cff,size:.3,grow:.8,vy:.25,life:.7,opacity:.45});}for(const a of actors())if(!(a===c.owner&&c.grace>0)&&Math.hypot(a.pos.x-c.x,a.pos.z-c.z)<1.55&&Math.abs(a.pos.y-c.y)<1.8&&raySolids(new V3(c.x,c.y+.8,c.z),new V3(a.pos.x-c.x,a.pos.y-c.y,a.pos.z-c.z).normalize(),Math.hypot(a.pos.x-c.x,a.pos.y-c.y,a.pos.z-c.z))>=Math.hypot(a.pos.x-c.x,a.pos.y-c.y,a.pos.z-c.z)-.2){if(c.effect==='haste'){a.energy=Math.max(a.energy||0,1.4);}else{a.webT=Math.max(a.webT||0,.4);if(!c.hit.has(a)){c.hit.add(a);daze(a,1.1);}}}continue;}
    if (Math.random() < dt * 20) puff(c.x + (Math.random() - 0.5) * 3, c.y + Math.random() * 2, c.z + (Math.random() - 0.5) * 3, { size: 0.15, grow: 0, life: 0.8, vy: -0.4, color: [0xff5a6e, 0xf5c542, 0x9be36b, 0x4ab0f0, 0xb18cff][(Math.random() * 5) | 0] });
    for (const a of actors()) if (Math.hypot(a.pos.x - c.x, a.pos.z - c.z) < 2.6 && Math.abs(a.pos.y - c.y) < 2.5) { a.blind = Math.max(a.blind || 0, 0.4); if (c.hit && a !== c.owner && !c.hit.has(a)) { c.hit.add(a); daze(a, 1.6); dropHeld(a); W.onHit && W.onHit(c.owner, a, 'light'); } } }
  if (W.lure) { W.lure.t -= dt; if (W.lure.t <= 0) W.lure = null; }
  if (W.whistle) { W.whistle.t -= dt; if (W.whistle.t <= 0) W.whistle = null; }
  void _f; void addZone;
}
// иконка-подсказка для HUD: есть ли у инструмента действие на ЛКМ
export const toolVerb = it => SNACKS[it?.type]?'съесть · восстановить выносливость':it?.type==='boombox'?`${it.radio?.on?'выключить':'включить'} · колесо - волна ${STATIONS[it.radio?.station||0].freq}`:({ can: it && it.shake > 0.5 ? 'открыть (трясли!)' : 'открыть', net: it && it.cd > 0 ? 'перезарядка' : 'держи ЛКМ — прицел, отпусти — сетка', badge: 'брось (ПКМ) — вызвать наряд', glove: 'удар', vacuum: it && it.bag && it.bag.length ? `держи — втянуть · отпусти — пли (${it.bag.length})` : 'держи — втянуть', slipper: 'шлёп', pillow: 'бац', umbrella: it && it.open ? 'сложить' : 'раскрыть', banana: 'бросить под ноги', duck: 'пискнуть', bubbles: 'пузырь', whistle: 'свисток', paint: 'вылить', energy: 'выпить',
  bong:'воспользоваться',perfume:'распылить облако',bow:'держи ЛКМ - тяни, отпусти - выстрел',water: 'пли', sling: 'выстрел', popper: 'хлоп', web: 'метнуть', firework: it && it.lit !== undefined ? 'бросай!' : 'поджечь', rake:'ЛКМ - удар, ПКМ - бросить', cushion: 'подложить', extinguisher: 'струя', magnet: 'тянуть' })[it ? it.type : ''] || '';
import {SNACKS,eatSnack} from './snacks.js';
import {toggleRadio,STATIONS} from './radio.js';
