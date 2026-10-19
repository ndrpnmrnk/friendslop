import { THREE, G, mesh, col, tmat } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addOutline } from '../game/outline.js';

// Тележки и бочки: их можно толкать телом
/* На чём можно кататься: seat — высота посадки, pose — сидя или стоя,
   max — максимальная скорость, acc — разгон, turn — поворот, fric — трение */
export const RIDE = {
  skate:  { seat: 0.16, pose: 'stand', max: 13, acc: 9, turn: 3.2, fric: 0.25 },
  chair:  { seat: 0.55, pose: 'sit', max: 6.5, acc: 6, turn: 4.5, fric: 1.0 },
  cart:   { seat: 0.62, pose: 'sit', max: 10, acc: 6, turn: 2.6, fric: 0.6 },
  barrow: { seat: 0.62, pose: 'sit', max: 7, acc: 5, turn: 2.2, fric: 1.1 },
};
export function addPushable(b, kind, x, z) {
  const g = new THREE.Group(); W.group.add(g);
  let roller = null, r;
  if (kind === 'cart') {
    const m = col(0x8a8d98);
    mesh(G.box, m, 0, 0.75, 0, 0.75, 0.04, 1.1, g);
    for (const [sx, sz, w, d] of [[0.37, 0, 0.03, 1.1], [-0.37, 0, 0.03, 1.1], [0, 0.55, 0.75, 0.03], [0, -0.55, 0.75, 0.03]]) mesh(G.box, m, sx, 0.98, sz, w, 0.45, d, g);
    mesh(G.box, col(0xd8243a), 0, 1.15, -0.72, 0.6, 0.05, 0.05, g);
    for (const [sx, sz] of [[0.3, 0.45], [-0.3, 0.45], [0.3, -0.45], [-0.3, -0.45]]) mesh(G.cyl8, col(0x17111f), sx, 0.1, sz, 0.08, 0.06, 0.08, g).rotation.z = Math.PI / 2;
    r = 0.6;
  } else if (kind === 'bin') {
    mesh(G.cyl8, tmat(T.corrugated(0x3e5a4a)), 0, 0.5, 0, 0.35, 1, 0.35, g); mesh(G.cyl8, col(0x2e4a3a), 0, 1.03, 0, 0.38, 0.06, 0.38, g);
    mesh(G.box, col(0x2e4a3a), 0, 1.08, 0, 0.2, 0.05, 0.05, g);
    r = 0.4;
  } else if (kind === 'skate') {
    const deck = tmat(T.wood());
    mesh(G.box, [deck, deck, col(0x2a2230), deck, deck, deck], 0, 0.12, 0, 0.26, 0.04, 0.9, g);
    mesh(G.box, col(0xff5a6e), 0, 0.142, 0, 0.2, 0.005, 0.5, g);
    for (const z of [-0.3, 0.3]) { mesh(G.box, col(0x8a8d98), 0, 0.08, z, 0.22, 0.03, 0.05, g); for (const x of [-0.12, 0.12]) mesh(G.cyl8, col(0xf5c542), x, 0.05, z, 0.05, 0.05, 0.05, g).rotation.z = Math.PI / 2; }
    r = 0.35;
  } else if (kind === 'chair') {
    const dk = col(0x2b2533), seat = col(0x3a4a8a);
    mesh(G.box, seat, 0, 0.5, 0, 0.5, 0.08, 0.5, g); mesh(G.box, seat, 0, 0.85, -0.24, 0.48, 0.6, 0.07, g);
    mesh(G.cyl6, dk, 0, 0.3, 0, 0.04, 0.4, 0.04, g);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, l = mesh(G.box, dk, Math.sin(a) * 0.15, 0.08, Math.cos(a) * 0.15, 0.05, 0.04, 0.3, g); l.rotation.y = a; mesh(G.sph, col(0x17111f), Math.sin(a) * 0.28, 0.04, Math.cos(a) * 0.28, 0.045, 0.045, 0.045, g); }
    for (const x of [-0.27, 0.27]) mesh(G.box, dk, x, 0.68, 0, 0.04, 0.04, 0.35, g);
    r = 0.38;
  } else if (kind === 'barrow') {
    const m = col(0x3a7a4a), dk = col(0x2b2533);
    mesh(G.box, m, 0, 0.55, 0.1, 0.65, 0.3, 0.8, g); mesh(G.box, tmat(T.dirt()), 0, 0.68, 0.1, 0.55, 0.05, 0.7, g);
    const wh = mesh(G.cyl12, col(0x17111f), 0, 0.22, 0.6, 0.22, 0.1, 0.22, g); wh.rotation.z = Math.PI / 2;
    for (const x of [-0.25, 0.25]) { mesh(G.box, dk, x, 0.55, -0.45, 0.05, 0.05, 0.9, g); mesh(G.box, dk, x, 0.25, -0.1, 0.05, 0.4, 0.05, g); }
    r = 0.5;
  } else {
    roller = new THREE.Group(); roller.position.y = 0.42; g.add(roller);
    const br = mesh(G.cyl8, tmat(T.rust()), 0, 0, 0, 0.42, 1.0, 0.42, roller); br.rotation.z = Math.PI / 2;
    mesh(G.cyl8, col(0x2b2533), 0.3, 0, 0, 0.44, 0.06, 0.44, roller).rotation.z = Math.PI / 2;
    mesh(G.cyl8, col(0x2b2533), -0.3, 0, 0, 0.44, 0.06, 0.44, roller).rotation.z = Math.PI / 2;
    r = 0.5;
  }
  // mass: тележка катится легко, урна потяжелее, бочка тяжёлая
  const mass = { cart: 1.2, bin: 2, barrel: 4, skate: 0.4, chair: 1, barrow: 1.6 }[kind];
  const h = { cart: 1.2, bin: 1.1, barrel: 0.85, skate: 0.16, chair: 1.1, barrow: 0.8 }[kind];
  const p = { kind, mesh: g, roller, x: b.X(x), z: b.Z(z), y: b.Y, vx: 0, vz: 0, r, mass, h, ride: RIDE[kind] || null, heading: 0 };
  if (p.ride) p.outline = addOutline(g, 0.04);
  g.position.set(p.x, p.y, p.z); W.pushables.push(p); return p;
}
