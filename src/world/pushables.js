import { THREE, G, mesh, col, tmat, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addOutline } from '../game/outline.js';
import { cartModel, barrowModel, binModel } from './props.js';

// Тележки и бочки: их можно толкать телом
/* На чём можно кататься: seat — высота посадки, pose — сидя или стоя,
   max — максимальная скорость, acc — разгон, turn — поворот, fric — трение */
export const RIDE = {
  skate:  { seat: 0.16, pose: 'stand', max: 13, acc: 9, turn: 3.2, fric: 0.25 },
  chair:  { seat: 0.55, pose: 'sit', max: 6.5, acc: 6, turn: 4.5, fric: 1.0 },
  // тележку и тачку нельзя «завести» на месте: сначала разгоняешь её руками, потом запрыгиваешь (coast)
  cart:   { seat: 0.62, pose: 'sit', max: 14, acc: 0, turn: 1.5, fric: 0.32, coast: true },
  barrow: { seat: 0.62, pose: 'sit', max: 11, acc: 0, turn: 1.2, fric: 0.55, coast: true },
};
export function addPushable(b, kind, x, z) {
  const g = new THREE.Group(); W.group.add(g);
  let roller = null, r;
  if (kind === 'cart') { g.add(cartModel()); r = 0.6; }
  else if (kind === 'barrow') { g.add(barrowModel()); r = 0.55; }
  else if (kind === 'bin') { g.add(binModel()); r = 0.4;
  } else if (kind === 'skate') {
    g.add(compose('skate', add => {
      const deck = tmat(T.wood()), grip = col(0x23202a), tr = col(0x9a9da8), wh = col(0xf5c542);
      add(G.box, deck, 0, 0.12, 0, 0.24, 0.035, 0.66); for (const s2 of [-1, 1]) add(G.box, deck, 0, 0.135, s2 * 0.38, 0.24, 0.035, 0.12, s2 * -0.35);
      add(G.box, grip, 0, 0.14, 0, 0.23, 0.006, 0.64); add(G.box, col(0xff5a6e), 0, 0.103, 0, 0.18, 0.004, 0.4);
      for (const z of [-0.26, 0.26]) { add(G.box, tr, 0, 0.085, z, 0.2, 0.03, 0.05); add(G.box, tr, 0, 0.065, z, 0.04, 0.03, 0.06); for (const x of [-0.12, 0.12]) add(G.cyl8, wh, x, 0.045, z, 0.045, 0.045, 0.045, 0, 0, Math.PI / 2); }
    }));
    r = 0.35;
  } else if (kind === 'chair') {
    g.add(compose('officeChair', add => {
      const dk = col(0x2b2533), seat = col(0x3a4a8a), seat2 = col(0x2e3c72), mt = col(0x9a9da8);
      add(G.box, seat, 0, 0.5, 0.02, 0.5, 0.08, 0.48); add(G.box, seat2, 0, 0.46, 0.02, 0.46, 0.04, 0.44);
      add(G.box, seat, 0, 0.88, -0.25, 0.46, 0.55, 0.07, -0.08); add(G.box, dk, 0, 0.62, -0.26, 0.06, 0.2, 0.04);
      add(G.cyl8, mt, 0, 0.28, 0, 0.035, 0.36, 0.035); add(G.cyl8, dk, 0, 0.42, 0, 0.06, 0.06, 0.06);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(G.box, dk, Math.sin(a) * 0.15, 0.09, Math.cos(a) * 0.15, 0.05, 0.04, 0.3, 0, a); add(G.sph, col(0x17111f), Math.sin(a) * 0.28, 0.045, Math.cos(a) * 0.28, 0.045, 0.045, 0.045); }
      for (const x of [-0.27, 0.27]) { add(G.box, dk, x, 0.68, 0, 0.05, 0.04, 0.32); add(G.box, dk, x, 0.6, -0.08, 0.03, 0.16, 0.03); }
    }));
    r = 0.38;
  } else {
    roller = new THREE.Group(); roller.position.y = 0.42; g.add(roller);
    const rl = compose('barrelRoll', add => {
      add(G.cyl12, tmat(T.rust()), 0, 0, 0, 0.42, 1.0, 0.42, 0, 0, Math.PI / 2);
      for (const x of [-0.33, 0, 0.33]) add(G.cyl12, col(0x2b2533), x, 0, 0, 0.435, 0.05, 0.435, 0, 0, Math.PI / 2);
      for (const x of [-0.505, 0.505]) add(G.cyl12, col(0x3a3440), x, 0, 0, 0.4, 0.01, 0.4, 0, 0, Math.PI / 2);
      add(G.cyl6, col(0x17141c), 0.505, 0.2, 0, 0.05, 0.02, 0.05, 0, 0, Math.PI / 2);
    }); roller.add(rl);
    r = 0.5;
  }
  // mass: тележка катится легко, урна потяжелее, бочка тяжёлая
  const mass = { cart: 1.2, bin: 2, barrel: 4, skate: 0.4, chair: 1, barrow: 1.6 }[kind];
  const h = { cart: 1.2, bin: 1.1, barrel: 0.85, skate: 0.16, chair: 1.1, barrow: 0.8 }[kind];
  const p = { kind, mesh: g, roller, x: b.X(x), z: b.Z(z), y: b.Y, vx: 0, vz: 0, r, mass, h, ride: RIDE[kind] || null, heading: 0 };
  if (p.ride) p.outline = addOutline(g, 0.04);
  g.position.set(p.x, p.y, p.z); W.pushables.push(p); return p;
}
