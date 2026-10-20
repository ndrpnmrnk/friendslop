import { THREE, G, V3, mesh, col, tmat } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { CONFIG } from '../config.js';
import { groundAt, isFree } from '../world/physics.js';
import { spawnTool } from './tools.js';
import { puff, smokeRing } from '../world/particles.js';
import { sfx } from '../core/sfx.js';
import { buildingAt } from '../missions/location.js';

export const SUP = { next: 50, crates: [], loot: 0, lootCD: 0 };
export function resetSupplies() { SUP.next = 40 + Math.random() * 20; SUP.crates = []; SUP.loot = 0; SUP.lootCD = 0; W.containerLoot = containerLoot; W.supplies = []; }
export function containerLoot(p) {
  if (SUP.loot >= 8 || SUP.lootCD > 0 || Math.random() > 0.22) return false;
  const it = spawnTool(p.x, p.y + 0.4, p.z, true); SUP.loot++; SUP.lootCD = 12; return true;
}
export function spawnSupply() {
  const zones = W.missionZones.filter(z => z.type === 'floor' && Math.abs(z.y - CONFIG.base) < 0.4);
  let p = null;
  for (let i = 0; i < 120 && zones.length; i++) {
    const z = zones[(Math.random() * zones.length) | 0], x = z.x0 + 1 + Math.random() * Math.max(0, z.x1 - z.x0 - 2), zz = z.z0 + 1 + Math.random() * Math.max(0, z.z1 - z.z0 - 2), y = groundAt(x, zz, 0.5, z.y + 0.4);
    const q = new V3(x, y, zz);
    if (Math.abs(y - z.y) > 0.3 || buildingAt(q) || !isFree(x - 1.5, zz - 1.5, x + 1.5, zz + 1.5, y + 0.08, y + 35)) continue;
    p = q; break;
  }
  if (!p) return null;
  const g = new THREE.Group(); g.position.copy(p).add(new V3(0, 25, 0)); W.group.add(g); W.keep.push(g);
  mesh(G.box, tmat(T.wood()), 0, 0.5, 0, 1, 1, 1, g);
  for (const x of [-0.32, 0.32]) mesh(G.box, col(0xf5c542), x, 0.5, 0, 0.12, 1.03, 1.03, g);
  const parachute = new THREE.Group(); g.add(parachute);
  mesh(G.sph, col(0xb18cff), 0, 3.3, 0, 2, 0.65, 2, parachute);
  for (const x of [-0.7, 0.7]) for (const z of [-0.7, 0.7]) mesh(G.cyl5, col(0xf1e8ff), x, 2, z, 0.018, 2.5, 0.018, parachute);
  const bm = new THREE.MeshBasicMaterial({ color: 0xb18cff, transparent: true, opacity: 0.18, depthWrite: false });
  const beam = mesh(G.beam, bm, p.x, p.y + 15, p.z, 0.7, 30, 0.7, W.group); W.keep.push(beam);
  const c = { p, g, beam, parachute, landed: false, opened: false, life: 75, smoke: 0 };
  c.interact = { x: p.x, y: p.y, z: p.z, r: 2, dy: 1.5, label: 'Открыть посылку', enabled: a => c.landed && !c.opened && !a.held, act() {
    if (!c.landed || c.opened) return;
    c.opened = true; spawnTool(p.x, p.y + 0.6, p.z, true); sfx('open', { at: p }); smokeRing(p.x, p.y + 0.1, p.z, 10, { speed: 2 });
  } };
  W.interacts.push(c.interact); SUP.crates.push(c); return c;
}
export function updateSupplies(dt) {
  SUP.next -= dt; SUP.lootCD -= dt;
  if (SUP.next <= 0) { SUP.next = 40 + Math.random() * 20; if (SUP.crates.length < 2) spawnSupply(); }
  for (const c of SUP.crates) {
    c.life -= dt;
    if (!c.landed) { c.g.position.y = Math.max(c.p.y, c.g.position.y - dt * 3.2); if (c.g.position.y === c.p.y) { c.landed = true; c.parachute.visible = false; sfx('land', { at: c.p }); } }
    c.smoke -= dt; if (c.smoke <= 0) { c.smoke = 0.35; puff(c.p.x, c.p.y + 0.5, c.p.z, { color: 0xb18cff, size: 0.45, vy: 1.8, life: 2, grow: 1 }); }
    if (c.opened || c.life <= 0) { W.group.remove(c.g, c.beam); c.beam.material.dispose(); W.interacts = W.interacts.filter(q => q !== c.interact); W.keep = W.keep.filter(q => q !== c.g && q !== c.beam); }
  }
  SUP.crates = SUP.crates.filter(c => !c.opened && c.life > 0); W.supplies = SUP.crates;
}
