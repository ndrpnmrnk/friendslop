import { THREE, G, mesh, col, tmat } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';

// Тележки и бочки: их можно толкать телом
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
    mesh(G.cyl8, col(0x3e5a4a), 0, 0.5, 0, 0.35, 1, 0.35, g); mesh(G.cyl8, col(0x2e4a3a), 0, 1.03, 0, 0.38, 0.06, 0.38, g);
    mesh(G.box, col(0x2e4a3a), 0, 1.08, 0, 0.2, 0.05, 0.05, g);
    r = 0.4;
  } else {
    roller = new THREE.Group(); roller.position.y = 0.42; g.add(roller);
    const br = mesh(G.cyl8, tmat(T.rust()), 0, 0, 0, 0.42, 1.0, 0.42, roller); br.rotation.z = Math.PI / 2;
    mesh(G.cyl8, col(0x2b2533), 0.3, 0, 0, 0.44, 0.06, 0.44, roller).rotation.z = Math.PI / 2;
    mesh(G.cyl8, col(0x2b2533), -0.3, 0, 0, 0.44, 0.06, 0.44, roller).rotation.z = Math.PI / 2;
    r = 0.5;
  }
  // mass: тележка катится легко, урна потяжелее, бочка тяжёлая
  const mass = { cart: 1.2, bin: 2, barrel: 4 }[kind];
  const p = { kind, mesh: g, roller, x: b.X(x), z: b.Z(z), y: b.Y, vx: 0, vz: 0, r, mass, h: kind === 'cart' ? 1.2 : kind === 'bin' ? 1.1 : 0.85 };
  g.position.set(p.x, p.y, p.z); W.pushables.push(p); return p;
}
