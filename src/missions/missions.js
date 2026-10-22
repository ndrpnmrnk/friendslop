import {buildPerfume,perfumeGame} from './perfume.js';
import {vanPlaces,buildVan,vanGame} from './van.js';
import {buildCosmo,cosmoGame} from './cosmo.js';
import { buildMammoth,mammothWorld,mammothDress } from './mammoth.js';
import { locationLabel } from './location.js';
import { THREE, G, V3, sprite } from '../core/gfx.js';
import { iconCanvas } from '../ui/icons.js';
import { raySolids } from '../world/physics.js';
import { CONFIG, DIFF } from '../config.js';
import { W } from '../world/state.js';
import { isFree, groundAt } from '../world/physics.js';
import { buildBoard, buildTable } from './objects.js';
import { GAMES } from './games.js';
import { PANEL_GAMES, WORLD_GAMES } from './games2.js';
import { buildShells, buildFishing, buildSpot, buildTargets, buildCleanup } from './objects2.js';
import { PANEL3, WORLD3, buildPhone, buildFire, buildDeadLamp, buildCatBox } from './games3.js';
import { PANEL4, WORLD4, buildLeafPile, buildGraffitiWall, graffitiPlaces, buildIntercom, buildChest, buildValve } from './games4.js';
import { PANEL5, WORLD5, buildDoor, buildSkelBench, buildGenerator, buildBells, buildTree, buildDetectorSign, buildCartStart, buildGraveCam, buildAntenna, buildDovecote, buildMailBag } from './games5.js';

/* Миссии приходят ВОЛНАМИ.
   В волне «игроки − 1» общих миссий (боты считаются игроками, не меньше 2): кому-то не хватит — надо успеть
   или отбить. Во время общего события — по одной миссии. У каждой миссии свой таймер 25–50 с (чем дальше от
   игроков — тем дольше), «вечных» миссий нет. Волна кончилась (всё выполнено или сгорело) — через 3 с новая;
   сгорела целиком — следующая приходит быстрее.
   Между волнами кому-то может выпасть ЛИЧНАЯ миссия (видит и может сделать только он), а с середины раунда
   отстающему — миссия АУТСАЙДЕРА с очками ×1.5.
   Миссии частично «местные»: у некоторых есть родной район (home) — там они появляются чаще, но не всегда. */
export const M = { list: [], cooldown: {}, id: 0, waveT: 0, wave: 0, burnt: 0, done: 0, onWave: null, manual:false,mammothShown:false,introShown:{} };
const ZONE_RU = { floor: '', inside: 'внутри', roof: 'на крыше', nook: 'в нычке', tunnel: '' };
const WV = () => CONFIG.wave;

export function resetMissions() {
  for (const m of M.list.slice()) removeMission(m, true);
  W.paintSites=[];M.list = []; M.cooldown = {}; M.waveT = 0; M.wave = 0; M.burnt = 0; M.done = 0;M.mammothShown=false;M.introShown={};
  // фонари для миссии «Лампочка»: стоять под плафоном, со стороны кронштейна
  W.spots.bulb = (W.lamps || []).map(L => { const dx = Math.sin(L.ry), dz = Math.cos(L.ry); return { x: L.lx + dx * 1.35, z: L.lz + dz * 1.35, y: L.y, f: [-dx, -dz], lamp: L, district: L.district, label: 'фонарь' }; });
}
const actorsAll = () => [W.player, ...(W.bots || [])].filter(Boolean);
const districtAt = (x, z) => (W.districts || []).find(d => x >= d.ox && x < d.ox + 32 && z >= d.oz && z < d.oz + 32);

/* Значок миссии над миром: пиксельная плашка — иконка, кольцо оставшегося времени и очки.
   Канва своя у каждой миссии и перерисовывается 4 раза в секунду. */
function drawPlate(m, k) {
  const g = m.marker.cx, c = g.canvas, col = '#' + DIFF[m.def.diff].toString(16).padStart(6, '0'), mine = m.owner ? '#f5c542' : col;
  g.clearRect(0, 0, c.width, c.height);
  // кольцо времени: 24 пиксельных сегмента вокруг плашки
  const N = 24, on = Math.ceil(Math.max(0, k) * N), warn = k < 0.25;
  for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + (i + 0.5) / N * Math.PI * 2, x = 32 + Math.cos(a) * 27, y = 30 + Math.sin(a) * 27;
    g.fillStyle = '#17111f'; g.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6); g.fillStyle = i < on ? (warn ? '#ff5a6e' : mine) : '#3a3046'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); }
  g.fillStyle = '#17111f'; g.fillRect(14, 12, 36, 36); g.fillStyle = mine; g.fillRect(16, 14, 32, 32); g.fillStyle = '#2a1f3d'; g.fillRect(18, 16, 28, 28);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(18, 16, 28, 3);
  g.drawImage(iconCanvas(m.key, 2), 20, 18);
  // очки под плашкой
  const pts = `+${m.pts}`; g.font = '9px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
  const w = g.measureText(pts).width + 8; g.fillStyle = '#17111f'; g.fillRect(32 - w / 2, 62, w, 14); g.fillStyle = m.outsider ? '#f5c542' : '#9be36b'; g.fillText(pts, 32, 65);
  m.marker.tex.needsUpdate = true;
}
function marker(def, key) {
  const g = new THREE.Group(), color = DIFF[def.diff];
  const bm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(G.beam, bm); beam.scale.set(1, 7, 1); beam.position.y = 3.5; g.add(beam);
  const rm = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true });
  const ring = new THREE.Mesh(G.ring, rm); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.scale.setScalar(1.4); g.add(ring);
  // «волна» при появлении: кольцо расходится по земле
  const wm = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  const wave = new THREE.Mesh(G.ring, wm); wave.rotation.x = -Math.PI / 2; wave.position.y = 0.08; g.add(wave);
  const c = document.createElement('canvas'); c.width = 64; c.height = 80; const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false;
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const sp = sprite(tex, 1.5); sp.scale.set(1.6, 2, 1); sp.position.y = 4.4; g.add(sp);
  W.group.add(g); return { g, bm, rm, wm, wave, sp, ring, cx, tex, born: 0, drawT: 0 };
}

const FACINGS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
function findPlace(def, from, others) {
  let zones = W.missionZones.filter(z => def.zones.includes(z.type));
  // родной район — чаще, но не всегда
  if (def.home && Math.random() < 0.6) { const hz = zones.filter(z => { const d = districtAt((z.x0 + z.x1) / 2, (z.z0 + z.z1) / 2); return d && d.id === def.home; }); if (hz.length) zones = hz; }
  if (!zones.length) return null;
  const [fw, fd] = def.foot, spread = WV().spread;
  for (let tr = 0; tr < 140; tr++) {
    const zn = zones[(Math.random() * zones.length) | 0];
    const fs = FACINGS.slice().sort(() => Math.random() - 0.5);
    for (const f of fs) {
      const along = f[0] === 0, w = along ? fw : fd, d = along ? fd : fw;
      if (zn.x1 - zn.x0 < w || zn.z1 - zn.z0 < d) continue;
      const x = zn.x0 + w / 2 + Math.random() * (zn.x1 - zn.x0 - w), z = zn.z0 + d / 2 + Math.random() * (zn.z1 - zn.z0 - d), y = zn.y;
      if(def.game==='perfume'&&W.pushables.some(p=>Math.hypot(p.x-x,p.z-z)<2.6&&Math.abs(p.y-y)<1.4))continue;
      if (tr < 80 && Math.hypot(x - from.x, z - from.z) < 9) continue;
      if (others.some(o => Math.hypot(o.x - x, o.z - z) < (tr < 100 ? spread : 4))) continue;
      if (!isFree(x - w / 2 - 0.15, z - d / 2 - 0.15, x + w / 2 + 0.15, z + d / 2 + 0.15, y + 0.05, y + 2.6)) continue;
      // свободная площадка перед объектом, на той же высоте
      const c = def.clear, fx = x + f[0] * (d / 2 + c / 2), fz = z + f[1] * (d / 2 + c / 2);
      const hw = along ? w / 2 : c / 2, hd = along ? c / 2 : w / 2;
      if (!isFree(fx - hw, fz - hd, fx + hw, fz + hd, y + 0.05, y + 2)) continue;
      if (Math.abs(groundAt(fx, fz, 0.3, y + 0.3) - y) > 0.12 || Math.abs(groundAt(x, z, 0.3, y + 0.3) - y) > 0.12) continue;
      return { x, y, z, f, zone: zn };
    }
  }
  return null;
}

function canSpawn(key, def) {
  if(key==='van'&&!vanPlaces().length)return false;
  if ((M.cooldown[key] || 0) > 0) return false;
  const n = M.list.filter(m => m.key === key).length;
  if (n >= def.max) return false;
  if(key==='intercom'||key==='doorbell')return entrances(key).length>0;
  if(key==='graffiti')return graffitiPlaces().length>0;
  if (key === 'cat') return W.cats.some(c => !M.list.some(m => m.obj === c));
  if (def.needs && !(W.spots[def.needs] || []).length) return false;
  if (def.spot) return freeSpots(def.spot).length > 0;
  return true;
}
const entrances = kind => (W.buildings || []).filter(g => (kind!=='doorbell'||g.entryDoor)&&g.intercom && !M.list.some(m => m.obj.entrance === g)).filter(g => { const p=g.intercom, x=p.x+p.f[0]*0.9,z=p.z+p.f[1]*0.9; return isFree(x-0.3,z-0.3,x+0.3,z+0.3,p.y+0.05,p.y+1.8) && Math.abs(groundAt(x,z,0.25,p.y+0.3)-p.y)<0.2; });
const freeSpots = kind => (W.spots[kind] || []).filter(sp => !M.list.some(m => m.obj.spot === sp) && !(sp.lamp && (sp.lamp.dead || (sp.lamp.pool && sp.lamp.pool.userData.broken))) && isFree(sp.x - 0.3, sp.z - 0.3, sp.x + 0.3, sp.z + 0.3, sp.y + 0.05, sp.y + 1.5) && Math.abs(groundAt(sp.x, sp.z, 0.2, sp.y + 0.4) - sp.y) < 0.25);

// таймер миссии: от расстояния до ближайшего игрока (25–50 с), в финальном рывке короче
function lifeFor(p, final) {
  let d = 1e9; for (const a of actorsAll()) d = Math.min(d, Math.hypot(a.pos.x - p.x, a.pos.z - p.z) + Math.abs(a.pos.y - p.y) * 3);
  const [a, b] = WV().life; let l = Math.max(a, Math.min(b, 18 + d * 0.55));
  return final ? Math.max(20, l * 0.8) : l;
}
// сколько миссий в волне
export function waveSize(phase) {
  if (phase === 'event') return 1;
  return Math.max(WV().min, Math.min(WV().max, actorsAll().length - 1));
}
// новая волна: N общих миссий, разнесённых по карте
export function spawnWave(player, phase = 'calm') {
  const n = waveSize(phase); let k = 0;
  for(let i=0;i<n;i++){const opts={final:phase==='final'};let m=null;if(phase==='calm'){const fresh=['van','cosmo'].find(q=>!M.introShown[q]);if(fresh)m=spawnMission(player,fresh,opts);if(!m&&!M.mammothShown)m=spawnMission(player,'mammoth',opts);}if(!m)m=spawnMission(player,null,opts);if(m)k++;}
  M.waveT = 0; M.wave++; M.burnt = 0;
  if (k && M.onWave) M.onWave(k, M.wave);
  return k;
}
/* создать миссию; opts: owner — личная (видит только он), mult — множитель очков (аутсайдер), final — короче таймер */
export function spawnMission(player, only = null, opts = {}) {
  const keys = Object.keys(CONFIG.missions).filter(k => (!only || k === only) && canSpawn(k, CONFIG.missions[k]));
  keys.sort(() => Math.random() - 0.5);
  const others = M.list.map(m => m.obj.pos());
  for (const key of keys) {
    const def = CONFIG.missions[key];
    let obj, where = '';
    if (key === 'cat') {
      const free = W.cats.filter(c => !M.list.some(m => m.obj === c));
      free.sort((a, b) => minDist(b.root.position, others) - minDist(a.root.position, others));
      obj = free[0]; if (!obj) continue; where = obj.home.district;
    } else if(key==='graffiti'){const list=graffitiPlaces(),q=list[Math.random()*list.length|0];if(!q)continue;obj=buildGraffitiWall(q.x,q.y,q.z,q.f,q);where='Стена города';
    } else if(key==='doorbell'){const list=entrances('doorbell'),g=list[(Math.random()*list.length)|0];if(!g)continue;obj=buildDoor(g);where=g.name+' · входная дверь';
    } else if (key === 'intercom') {
      const list=entrances(); const g=list[(Math.random()*list.length)|0]; if(!g)continue; const p=g.intercom;
      obj=buildIntercom(p.x,p.y,p.z,p.f); obj.entrance=g; where=g.name+' · у входа';
    } else if(key==='van'){const places=vanPlaces();if(!places.length)continue;const q=places[Math.random()*places.length|0];obj=buildVan(q);where='Город · дорога';
    } else if (def.spot) {
      // место подальше от других миссий волны
      const list = freeSpots(def.spot).sort((a, b) => minDist(b, others) - minDist(a, others) + (Math.random() - 0.5) * 8);
      const sp = list[(Math.random() * Math.min(3, list.length)) | 0]; if (!sp) continue;
      obj = key === 'fish' ? buildFishing(sp) : key === 'phone' ? buildPhone(sp) : key === 'firebin' ? buildFire(sp) : key === 'bulb' ? buildDeadLamp(sp) : buildSpot(sp); obj.spot = sp;
      where = sp.district + (sp.label ? ' · ' + sp.label : '');
    } else {
      const pl = findPlace(def, player.pos, others);
      if (!pl) continue;
      const B = { puzzle: buildBoard, ttt: buildTable, shells: buildShells, cleanup: buildCleanup, catbox: buildCatBox, leaves: buildLeafPile, graffiti: buildGraffitiWall, intercom: buildIntercom, lockpick: buildChest, pipes: buildValve,
        perfume:buildPerfume,mammoth:buildMammoth,doorbell: buildDoor, steal: buildSkelBench, generator: buildGenerator, bells: buildBells, balloon: buildTree, detector: buildDetectorSign, cart: buildCartStart, ghost: buildGraveCam, antenna: buildAntenna, pigeon: buildDovecote, mail: buildMailBag }[key];
      obj = key==='cosmo'?buildCosmo(pl.x,pl.y,pl.z,pl.f):key === 'targets' ? buildTargets(pl.x + pl.f[0] * 3, pl.y, pl.z + pl.f[1] * 3, pl.f) : B(pl.x, pl.y, pl.z, pl.f);
      where = pl.zone.district + (ZONE_RU[pl.zone.type] ? ' · ' + ZONE_RU[pl.zone.type] : '');
    }
    const p = obj.pos(); where = locationLabel(p) || where; const life = lifeFor(p, opts.final), mult = opts.mult || 1;
    const m = { id: ++M.id, key, def, obj, where, life, maxLife: life, busy: false, owner: opts.owner || null, outsider: mult > 1, mult, pts: Math.round(def.points * mult), marker: marker(def, key) };
    drawPlate(m, 1); M.list.push(m);if(key==='mammoth')M.mammothShown=true;if(key==='van'||key==='cosmo')M.introShown[key]=true;
    return m;
  }
  return null;
}
const minDist = (p, list) => list.reduce((d, q) => Math.min(d, Math.hypot(q.x - p.x, q.z - p.z)), 60);
export function startMissionClock(m) { if(m.activeLeft==null){m.activeMax=m.def.workLimit||({cart:150,delivery:105,pizza:90,mail:110,balloon:100,mammoth:110,graffiti:90,detector:80,perfume:90}[m.key]||Math.max(45,m.def.life||45));m.activeLeft=m.activeMax;} }
export function removeMission(m, silent = false) {
  m.onRemove?.(); m.onRemove=null;
  for(const it of W.items)if(it.mission===m){if(it.owner?.held===it)it.owner.held=null;it.state='gone';it.g.visible=false;it.outline?.set(false);it.ring?.removeFromParent();}
  W.group.remove(m.marker.g); m.marker.bm.dispose(); m.marker.rm.dispose(); m.marker.wm.dispose(); m.marker.sp.material.dispose(); m.marker.tex.dispose();
  if (m.obj.dispose) m.obj.dispose();
  M.list = M.list.filter(x => x !== m);
  if (!silent) M.cooldown[m.key] = CONFIG.missionCooldown;
}
// видит ли персонаж миссию (личные — только хозяин)
export const visibleTo = (m, a) => !m.owner || m.owner === a;
const shared = () => M.list.filter(m => !m.owner);

/* opts: phase ('calm' | 'event' | 'final'), t — сколько прошло с начала раунда */
export function updateMissions(dt, t, player, opts = {}) {
  const phase = opts.phase || 'calm'; if (phase === 'event') dt = 0;
  for (const k in M.cooldown) M.cooldown[k] -= dt;
  for (const m of M.list.slice()) {
    const p = m.obj.pos(), mk = m.marker; mk.g.position.set(p.x, p.y, p.z);
    mk.g.visible = !m.busy && !m.doer && visibleTo(m, player);
    if(m.activeLeft!=null){m.activeLeft-=dt;if(m.activeLeft<=0){m.onExpire?.();if(M.list.includes(m))removeMission(m);continue;}}
    if (!m.busy && !m.doer && m.activeLeft==null) {
      m.life -= dt;
      if (m.life <= 0) { if (!m.owner) M.burnt++; removeMission(m); continue; }
    }
    const k = m.activeLeft==null?m.life/m.maxLife:m.activeLeft/m.activeMax;
    mk.drawT -= dt; if (mk.drawT <= 0) { mk.drawT = 0.25; drawPlate(m, k); }
    // появление: плашка «выпрыгивает», по земле расходится кольцо
    mk.born += dt; const b = mk.born;
    const pop = b < 0.5 ? 1 + Math.sin(b / 0.5 * Math.PI) * 0.6 : 1;
    mk.pop = pop; mk.sp.position.y = 4.4 + Math.sin(t * 3 + m.id) * 0.2 + (b < 0.35 ? (0.35 - b) * 8 : 0);
    mk.wave.visible = b < 1.2; if (mk.wave.visible) { mk.wave.scale.setScalar(1 + b * 9); mk.wm.opacity = Math.max(0, 1 - b / 1.2); }
    mk.bm.opacity = k < 0.25 ? (Math.sin(t * 12) > 0 ? 0.45 : 0.1) : mk.bm.opacity;
  }
  // волны: общие миссии кончились — пауза и новая волна (личные не держат волну)
  if (shared().length === 0 && !M.manual) {
    if (M.waveT <= 0) M.waveT = M.burnt > 0 && M.done === 0 ? WV().gapBurnt : (phase === 'final' ? WV().gapBurnt : WV().gap);
    else { M.waveT -= dt; if (M.waveT <= 0) { M.done = 0; spawnWave(player, phase); extras(player, opts); } }
  }
}
// между волнами: личная миссия кому-то из игроков, аутсайдеру — миссия ×1.5
function extras(player, opts) {
  const acts = actorsAll(), score = a => a === W.player ? (opts.playerScore ? opts.playerScore() : 0) : a.score || 0;
  const lead = Math.max(...acts.map(score));
  if ((opts.t || 0) >= WV().outsiderFrom && lead >= 200) {
    for (const a of acts) { if (M.list.some(m => m.owner === a)) continue;
      if (score(a) < lead * WV().outsiderK || score(a) < 60) { const m = spawnMission(player, null, { owner: a, mult: WV().outsiderMul, final: opts.phase === 'final' }); if (m && a === W.player && M.onPersonal) M.onPersonal(m, true); } }
  }
  if (Math.random() < WV().personal) {
    const a = acts[(Math.random() * acts.length) | 0];
    if (a && !M.list.some(m => m.owner === a)) { const m = spawnMission(player, null, { owner: a, final: opts.phase === 'final' }); if (m && a === W.player && M.onPersonal) M.onPersonal(m, false); }
  }
}
// миссия выполнена (кем угодно): для волны «сделано»
export function missionDone(m) { if (!m.owner) M.done++; }

/* Взять миссию можно только рядом и «вживую»: в зоне действия, почти на одной высоте
   и без стены между персонажем и точкой миссии (не через стену и не с другого этажа). */
const _o = new V3(), _dv = new V3();
export function canReach(player, p, skip, reach = 1.8) {
  if (Math.abs(p.y - player.pos.y) > 1.2) return false;
  const dx = p.x - player.pos.x, dz = p.z - player.pos.z, d = Math.hypot(dx, dz); if (d > reach) return false;
  if (d < 0.35) return true;
  _o.set(player.pos.x, player.pos.y + 1.1, player.pos.z); _dv.set(dx, p.y + 0.9 - _o.y, dz); const L = _dv.length(); _dv.normalize();
  return raySolids(_o, _dv, L, skip) >= L - 0.3;
}
export function nearMission(player) {
  let best = null, bd = 1e9;
  for (const m of M.list) {
    if (m.busy || m.doer || (m.claimedBy && m.claimedBy !== player) || !visibleTo(m, player)) continue;
    const p = m.obj.pos(), c = m.obj.front ? m.obj.front() : p, d = Math.hypot(c.x - player.pos.x, c.z - player.pos.z);
    const reach = m.key === 'cat' ? 1.6 : (m.obj.reach || 1.8);
    if (d < bd && canReach(player, c, m.obj.solid, reach)) { bd = d; best = m; }
  }
  return best;
}
export const ALL_GAMES = { perfume:perfumeGame,mammothDress, ...GAMES, ...PANEL_GAMES, ...PANEL3, ...PANEL4, ...PANEL5 };
const WORLD_ALL = { van:vanGame,cosmo:cosmoGame,mammoth:mammothWorld, ...WORLD_GAMES, ...WORLD3, ...WORLD4, ...WORLD5 };
export { GAMES, WORLD_ALL as WORLD_GAMES };
