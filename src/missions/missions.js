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

/* Миссии: не больше CONFIG.activeMissions одновременно, у каждого типа свой лимит и пауза
   перед повтором. Объекты появляются в случайной точке подходящей зоны (пол, внутри, крыша, нычка),
   место проверяется: не в стене, не в воде, перед объектом есть свободное место. */
export const M = { list: [], cooldown: {}, id: 0, waveT: 0 };
const ZONE_RU = { floor: '', inside: 'внутри', roof: 'на крыше', nook: 'в нычке', tunnel: '' };

export function resetMissions() {
  M.list = []; M.cooldown = {}; M.waveT = 0;
  // фонари для миссии «Лампочка»: стоять под плафоном, со стороны кронштейна
  W.spots.bulb = (W.lamps || []).map(L => { const dx = Math.sin(L.ry), dz = Math.cos(L.ry); return { x: L.lx + dx * 1.35, z: L.lz + dz * 1.35, y: L.y, f: [-dx, -dz], lamp: L, district: L.district, label: 'фонарь' }; });
}

/* Значок миссии над миром: пиксельная плашка в стиле интерфейса — тёмная карточка с рамкой цвета сложности,
   иконка 12×12 и «хвостик» вниз (вместо эмодзи) */
const plateTex = {};
function plate(key, diff) {
  const k = key + diff; if (plateTex[k]) return plateTex[k];
  const c = document.createElement('canvas'); c.width = 40; c.height = 48; const g = c.getContext('2d'), col = '#' + DIFF[diff].toString(16).padStart(6, '0');
  g.fillStyle = '#17111f'; g.fillRect(2, 2, 36, 36); g.fillRect(14, 36, 12, 6); g.fillRect(17, 42, 6, 4);
  g.fillStyle = col; g.fillRect(4, 4, 32, 32); g.fillRect(16, 36, 8, 4); g.fillRect(18, 40, 4, 3);
  g.fillStyle = '#2a1f3d'; g.fillRect(6, 6, 28, 28);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(6, 6, 28, 3);
  g.drawImage(iconCanvas(key, 2), 8, 8);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return (plateTex[k] = t);
}
function marker(def, key) {
  const g = new THREE.Group(), color = DIFF[def.diff];
  const bm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(G.beam, bm); beam.scale.set(1, 7, 1); beam.position.y = 3.5; g.add(beam);
  const rm = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(G.ring, rm); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.scale.setScalar(1.4); g.add(ring);
  const sp = sprite(plate(key, def.diff), 1.5); sp.scale.set(1.25, 1.5, 1); sp.position.y = 4.4; g.add(sp);
  W.group.add(g); return { g, bm, rm, sp, ring };
}

const FACINGS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
function findPlace(def, from, others) {
  const zones = W.missionZones.filter(z => def.zones.includes(z.type));
  if (!zones.length) return null;
  const [fw, fd] = def.foot;
  for (let tr = 0; tr < 120; tr++) {
    const zn = zones[(Math.random() * zones.length) | 0];
    const fs = FACINGS.slice().sort(() => Math.random() - 0.5);
    for (const f of fs) {
      const along = f[0] === 0, w = along ? fw : fd, d = along ? fd : fw;
      if (zn.x1 - zn.x0 < w || zn.z1 - zn.z0 < d) continue;
      const x = zn.x0 + w / 2 + Math.random() * (zn.x1 - zn.x0 - w), z = zn.z0 + d / 2 + Math.random() * (zn.z1 - zn.z0 - d), y = zn.y;
      if (tr < 80 && Math.hypot(x - from.x, z - from.z) < 9) continue;
      if (others.some(o => Math.hypot(o.x - x, o.z - z) < 4)) continue;
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
  if ((M.cooldown[key] || 0) > 0) return false;
  const n = M.list.filter(m => m.key === key).length;
  if (n >= def.max) return false;
  if (key === 'cat') return W.cats.some(c => !M.list.some(m => m.obj === c));
  if (def.needs && !(W.spots[def.needs] || []).length) return false;
  if (def.spot) return freeSpots(def.spot).length > 0;
  return true;
}
const freeSpots = kind => (W.spots[kind] || []).filter(sp => !M.list.some(m => m.obj.spot === sp) && !(sp.lamp && (sp.lamp.dead || (sp.lamp.pool && sp.lamp.pool.userData.broken))) && isFree(sp.x - 0.3, sp.z - 0.3, sp.x + 0.3, sp.z + 0.3, sp.y + 0.05, sp.y + 1.5) && Math.abs(groundAt(sp.x, sp.z, 0.2, sp.y + 0.4) - sp.y) < 0.25);
export function spawnWave(player) {
  const [a, b] = CONFIG.missionWave, n = a + Math.floor(Math.random() * (b - a + 1));
  let k = 0; for (let i = 0; i < n; i++) if (spawnMission(player)) k++;
  M.waveT = 0; return k;
}
export function spawnMission(player, only = null) {
  const keys = Object.keys(CONFIG.missions).filter(k => (!only || k === only) && canSpawn(k, CONFIG.missions[k]));
  keys.sort(() => Math.random() - 0.5);
  for (const key of keys) {
    const def = CONFIG.missions[key];
    let obj, where = '';
    if (key === 'cat') {
      const free = W.cats.filter(c => !M.list.some(m => m.obj === c));
      free.sort((a, b) => b.root.position.distanceTo(player.pos) - a.root.position.distanceTo(player.pos));
      obj = free[0]; if (!obj) continue; where = obj.home.district;
    } else if (def.spot) {
      const list = freeSpots(def.spot).sort((a, b) => Math.hypot(b.x - player.pos.x, b.z - player.pos.z) - Math.hypot(a.x - player.pos.x, a.z - player.pos.z));
      const sp = list[(Math.random() * Math.min(3, list.length)) | 0]; if (!sp) continue;
      obj = key === 'fish' ? buildFishing(sp) : key === 'phone' ? buildPhone(sp) : key === 'firebin' ? buildFire(sp) : key === 'bulb' ? buildDeadLamp(sp) : buildSpot(sp); obj.spot = sp;
      where = sp.district + (sp.label ? ' · ' + sp.label : '');
    } else {
      const pl = findPlace(def, player.pos, M.list.map(m => m.obj.pos()));
      if (!pl) continue;
      const B = { puzzle: buildBoard, ttt: buildTable, shells: buildShells, cleanup: buildCleanup, catbox: buildCatBox }[key];
      obj = key === 'targets' ? buildTargets(pl.x + pl.f[0] * 3, pl.y, pl.z + pl.f[1] * 3, pl.f) : B(pl.x, pl.y, pl.z, pl.f);
      where = pl.zone.district + (ZONE_RU[pl.zone.type] ? ' · ' + ZONE_RU[pl.zone.type] : '');
    }
    M.list.push({ id: ++M.id, key, def, obj, where, life: def.life, busy: false, marker: marker(def, key) });
    return true;
  }
  return false;
}
export function removeMission(m) {
  W.group.remove(m.marker.g); m.marker.bm.dispose(); m.marker.rm.dispose(); m.marker.sp.material.dispose();
  if (m.obj.dispose) m.obj.dispose();
  M.list = M.list.filter(x => x !== m);
  M.cooldown[m.key] = CONFIG.missionCooldown;
}

export function updateMissions(dt, t, player, pop) {
  for (const k in M.cooldown) M.cooldown[k] -= dt;
  for (const m of M.list.slice()) {
    const p = m.obj.pos(); m.marker.g.position.set(p.x, p.y, p.z); m.marker.g.visible = !m.busy;
    if (m.def.life > 0 && !m.busy && !W.missionPause) {
      m.life -= dt;
      if (m.life <= 0) { removeMission(m); continue; }
      m.marker.bm.opacity = m.life < 8 ? (Math.sin(t * 12) > 0 ? 0.45 : 0.1) : 0.28;
    }
    m.marker.sp.position.y = 4.4 + Math.sin(t * 3 + m.id) * 0.2;
  }
  // волны: когда все миссии закончились — через паузу приходит новая волна из 1–2 миссий
  if (M.list.length === 0 && !W.missionPause) {
    if (M.waveT <= 0) M.waveT = CONFIG.waveDelay[0] + Math.random() * (CONFIG.waveDelay[1] - CONFIG.waveDelay[0]);
    else { M.waveT -= dt; if (M.waveT <= 0) { const n = spawnWave(player); if (n) pop(n > 1 ? 'Новые миссии: выбирай!' : 'Новая миссия!', 'info'); } }
  }
}

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
    if (m.busy) continue;
    const p = m.obj.pos(), c = m.obj.front ? m.obj.front() : p, d = Math.hypot(c.x - player.pos.x, c.z - player.pos.z);
    const reach = m.key === 'cat' ? 1.6 : (m.obj.reach || 1.8);
    if (d < bd && canReach(player, c, m.obj.solid, reach)) { bd = d; best = m; }
  }
  return best;
}
export const ALL_GAMES = { ...GAMES, ...PANEL_GAMES, ...PANEL3 };
const WORLD_ALL = { ...WORLD_GAMES, ...WORLD3 };
export { GAMES, WORLD_ALL as WORLD_GAMES };
