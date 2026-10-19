import { THREE, G, sprite } from '../core/gfx.js';
import { CONFIG, DIFF } from '../config.js';
import { W } from '../world/state.js';
import { isFree, groundAt } from '../world/physics.js';
import { buildBoard, buildTable } from './objects.js';
import { GAMES } from './games.js';
import { PANEL_GAMES, WORLD_GAMES } from './games2.js';
import { buildShells, buildFishing, buildSpot, buildTargets, buildCleanup } from './objects2.js';

/* Миссии: не больше CONFIG.activeMissions одновременно, у каждого типа свой лимит и пауза
   перед повтором. Объекты появляются в случайной точке подходящей зоны (пол, внутри, крыша, нычка),
   место проверяется: не в стене, не в воде, перед объектом есть свободное место. */
export const M = { list: [], cooldown: {}, id: 0, waveT: 0 };
const ZONE_RU = { floor: '', inside: 'внутри', roof: 'на крыше', nook: 'в нычке', tunnel: '' };

export function resetMissions() { M.list = []; M.cooldown = {}; M.waveT = 0; }

const emojiTex = {};
function emoji(e) {
  if (!emojiTex[e]) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = '46px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 32, 36); emojiTex[e] = new THREE.CanvasTexture(c); emojiTex[e].magFilter = THREE.NearestFilter; }
  return emojiTex[e];
}
function marker(def) {
  const g = new THREE.Group(), color = DIFF[def.diff];
  const bm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(G.beam, bm); beam.scale.set(1, 7, 1); beam.position.y = 3.5; g.add(beam);
  const rm = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(G.ring, rm); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.scale.setScalar(1.4); g.add(ring);
  const sp = sprite(emoji(def.icon), 2); sp.position.y = 4.2; g.add(sp);
  W.group.add(g); return { g, bm, rm, sp };
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
const freeSpots = kind => (W.spots[kind] || []).filter(sp => !M.list.some(m => m.obj.spot === sp) && isFree(sp.x - 0.3, sp.z - 0.3, sp.x + 0.3, sp.z + 0.3, sp.y + 0.05, sp.y + 1.5) && Math.abs(groundAt(sp.x, sp.z, 0.2, sp.y + 0.4) - sp.y) < 0.25);
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
      obj = key === 'fish' ? buildFishing(sp) : buildSpot(sp); obj.spot = sp;
      where = sp.district + (sp.label ? ' · ' + sp.label : '');
    } else {
      const pl = findPlace(def, player.pos, M.list.map(m => m.obj.pos()));
      if (!pl) continue;
      const B = { puzzle: buildBoard, ttt: buildTable, shells: buildShells, cleanup: buildCleanup }[key];
      obj = key === 'targets' ? buildTargets(pl.x + pl.f[0] * 3, pl.y, pl.z + pl.f[1] * 3, pl.f) : B(pl.x, pl.y, pl.z, pl.f);
      where = pl.zone.district + (ZONE_RU[pl.zone.type] ? ' · ' + ZONE_RU[pl.zone.type] : '');
    }
    M.list.push({ id: ++M.id, key, def, obj, where, life: def.life, busy: false, marker: marker(def) });
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
    if (m.def.life > 0 && !m.busy) {
      m.life -= dt;
      if (m.life <= 0) { removeMission(m); continue; }
      m.marker.bm.opacity = m.life < 8 ? (Math.sin(t * 12) > 0 ? 0.45 : 0.1) : 0.28;
    }
    m.marker.sp.position.y = 4.2 + Math.sin(t * 3 + m.id) * 0.2;
  }
  // волны: когда все миссии закончились — через паузу приходит новая волна из 1–2 миссий
  if (M.list.length === 0) {
    if (M.waveT <= 0) M.waveT = CONFIG.waveDelay[0] + Math.random() * (CONFIG.waveDelay[1] - CONFIG.waveDelay[0]);
    else { M.waveT -= dt; if (M.waveT <= 0) { const n = spawnWave(player); if (n) pop(n > 1 ? 'Новые миссии: выбирай!' : 'Новая миссия!', 'info'); } }
  }
}

export function nearMission(player) {
  let best = null, bd = CONFIG.interact;
  for (const m of M.list) {
    const p = m.obj.pos(); if (Math.abs(p.y - player.pos.y) > 1) continue;
    const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z) - (m.key === 'cat' ? 0 : 1);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
export const ALL_GAMES = { ...GAMES, ...PANEL_GAMES };
export { GAMES, WORLD_GAMES };
