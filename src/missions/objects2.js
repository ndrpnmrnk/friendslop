import { THREE, G, V3, mesh, col, tmat, lam, glow } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { addItem } from '../game/items.js';
import { binModel } from '../world/props.js';

/* Объекты новых миссий. f — направление «лица» [x, z]: туда встаёт игрок. */
function frame(x, y, z, f) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(f[0], f[1]); W.group.add(g); return g; }
const wl = (g, a, b, c) => g.localToWorld(new V3(a, b, c));
function solidAround(x, z, f, w, d, y, h) { const along = f[0] === 0, fw = along ? w : d, fd = along ? d : w; return addSolid(x - fw / 2, z - fd / 2, x + fw / 2, z + fd / 2, y, y + h); }

// Наперстки: столик, три стакана и маленькая тыковка
export function buildShells(x, y, z, f) {
  const g = frame(x, y, z, f), wd = tmat(T.wood()), dk = col(0x2b2533);
  mesh(G.box, wd, 0, 0.8, 0, 1.8, 0.08, 0.9, g);
  for (const [a, b] of [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]]) mesh(G.box, dk, a, 0.4, b, 0.06, 0.8, 0.06, g);
  mesh(G.box, tmat(T.awning('#d8243a', '#f1e8ff')), 0, 0.86, 0, 1.7, 0.02, 0.8, g);
  mesh(G.plane, tmat(T.sign('НАПЕРСТКИ', '#2a1f3d', '#f5c542')), 0, 1.6, -0.46, 1.2, 0.3, 1, g);
  for (const s of [-0.85, 0.85]) mesh(G.box, dk, s, 1.2, -0.44, 0.04, 0.8, 0.04, g);
  const cupGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.26, 10), cupM = col(0xd04a4a);
  const cups = [-0.45, 0, 0.45].map(px => { const c = mesh(cupGeo, cupM, px, 0.99, 0, 1, 1, 1, g); return c; });
  const ball = mesh(G.sph10, tmat(T.pumpkin()), 0, 0.92, 0, 0.07, 0.06, 0.07, g);
  const s = solidAround(x, z, f, 1.9, 1.0, y, 0.85);
  g.updateMatrixWorld(true);
  return { type: 'shells', g, cups, ball, solid: s, pos: () => g.position, world: (a, b, c) => wl(g, a, b, c), dispose() { W.group.remove(g); s.on = false; } };
}

// Рыбалка: складной стульчик, ведро, удочка на рогатине у воды. spot: {x,y,z,f,wx,wz,wy} — где вода
export function buildFishing(spot) {
  const { x, y, z, f } = spot, g = frame(x, y, z, f), dk = col(0x2b2533);
  const rod = new THREE.Group(); rod.position.set(0.35, 0.55, 0.2); rod.rotation.x = 0.9; g.add(rod);
  mesh(G.cyl6, col(0x6a4a2a), 0, 1.0, 0, 0.02, 2.0, 0.02, rod); mesh(G.cyl8, dk, 0, 0.25, 0.04, 0.05, 0.08, 0.05, rod);
  mesh(G.box, dk, 0.35, 0.28, 0.2, 0.04, 0.56, 0.04, g);
  mesh(G.cyl8, col(0x6a6d78), -0.45, 0.18, 0.1, 0.16, 0.36, 0.16, g);
  mesh(G.box, col(0x3a6a9a), -0.05, 0.38, -0.25, 0.4, 0.05, 0.36, g); for (const s of [-1, 1]) mesh(G.box, dk, -0.05 + s * 0.17, 0.19, -0.25, 0.03, 0.38, 0.3, g);
  const bob = mesh(G.sph, col(0xd8243a), 0, 0, 0, 0.07, 0.07, 0.07, W.group); bob.position.set(spot.wx, spot.wy + 0.12, spot.wz);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]), new THREE.LineBasicMaterial({ color: 0xd8d0c0 })); W.group.add(line);
  g.updateMatrixWorld(true);
  const tip = () => rod.localToWorld(new V3(0, 2.0, 0));
  const upd = () => { const a = tip(); line.geometry.setFromPoints([a, bob.position]); };
  upd();
  return { type: 'fish', g, rod, bob, line, spot, tip, upd, pos: () => g.position, world: (a, b, c) => wl(g, a, b, c), dispose() { W.group.remove(g); W.group.remove(bob); W.group.remove(line); } };
}

// Точка без своей модели (щиток, сейф, раздача, кран): только позиция и «лицо»
export function buildSpot(spot) { return { type: 'spot', spot, f: spot.f, pos: () => new V3(spot.x, spot.y, spot.z), dispose() {} }; }

// Тир: три мишени-тыквы на стойках и линия броска с корзиной снарядов
export function buildTargets(x, y, z, f) {
  const g = frame(x, y, z, f), wd = tmat(T.wood());
  const targets = [-2.4, 0, 2.4].map((px, i) => {
    const post = mesh(G.box, wd, px, 0.6, -6, 0.1, 1.2, 0.1, g);
    const t = new THREE.Group(); t.position.set(px, 1.35, -6); g.add(t);
    mesh(G.cyl12, col(0xf1e8ff), 0, 0, 0, 0.42, 0.05, 0.42, t).rotation.x = Math.PI / 2;
    mesh(G.cyl12, col(0xd8243a), 0, 0, 0.03, 0.3, 0.05, 0.3, t).rotation.x = Math.PI / 2;
    mesh(G.sph10, tmat(T.pumpkin()), 0, 0, 0.12, 0.17, 0.15, 0.12, t);
    return { post, t, hit: false, i };
  });
  mesh(G.box, tmat(T.hazard()), 0, 0.02, 0, 3.6, 0.04, 0.12, g);
  mesh(G.plane, tmat(T.sign('ТИР', '#d8243a', '#f1e8ff')), 0, 2.2, -6.06, 1.4, 0.4, 1, g);
  mesh(G.box, wd, 1.6, 0.25, 0.6, 0.7, 0.5, 0.5, g);
  g.updateMatrixWorld(true);
  // мишени твёрдые: брошенное в них ударяется
  const sols = targets.map(t => { const c = t.t.getWorldPosition(new V3()); return addSolid(c.x - 0.42, c.z - 0.42, c.x + 0.42, c.z + 0.42, c.y - 0.42, c.y + 0.42); });
  return { type: 'targets', g, targets, items: [], sols, pos: () => g.position, world: (a, b, c) => wl(g, a, b, c),
    dispose() { W.group.remove(g); sols.forEach(q => (q.on = false)); for (const it of this.items) { it.state = 'gone'; it.def = { ...it.def, respawn: 0 }; it.g.visible = false; } } };
}

// Уборка: урна для мусора посреди площадки
export function buildCleanup(x, y, z, f) {
  const g = frame(x, y, z, f); g.add(binModel());
  const ring = mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0x9be36b, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }), 0, 0.05, 0, 0.9, 0.9, 1, g); ring.rotation.x = -Math.PI / 2;
  const s = addSolid(x - 0.35, z - 0.35, x + 0.35, z + 0.35, y, y + 1);
  return { type: 'cleanup', g, ring, solid: s, litter: [], pos: () => g.position,
    dispose() { W.group.remove(g); s.on = false; for (const it of this.litter) { it.state = 'gone'; it.g.visible = false; } } };
}
export function spawnLitter(x, y, z) { return addItem('litter', x, y, z, Math.random() * 6); }
export { glow, lam };
