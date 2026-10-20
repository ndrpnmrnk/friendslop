import { THREE, G, mesh, col, lam } from '../core/gfx.js';
import { W } from './state.js';

/* Голуби (площадь) и вороны (кладбище): клюют, а от бегущих и брошенных предметов взлетают */
export function addBirds(kind, rect, n) {
  const body = kind === 'crow' ? 0x1e1a26 : kind === 'gull' ? 0xeeeef4 : 0x7a7a8c, wingC = kind === 'crow' ? 0x14111a : kind === 'gull' ? 0x9a9aa8 : 0x5a5a6c;
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(); W.group.add(g);
    const b = new THREE.Group(); g.add(b);
    mesh(G.sphL, lam({ color: body }, 'bird' + body), 0, 0.16, 0, 0.13, 0.11, 0.2, b);
    const head = mesh(G.sphL, lam({ color: kind === 'crow' || kind === 'gull' ? body : 0x5a6a7a }, 'bh' + kind), 0, 0.3, 0.15, 0.08, 0.08, 0.08, b);
    const beak = mesh(G.cone4, col(kind === 'crow' ? 0x2a2a30 : kind === 'gull' ? 0xf5c542 : 0xd8a040), 0, 0.29, 0.25, 0.025, 0.08, 0.025, b); beak.rotation.x = Math.PI / 2;
    mesh(G.box, col(0x111111), 0.05, 0.32, 0.19, 0.02, 0.02, 0.02, b); mesh(G.box, col(0x111111), -0.05, 0.32, 0.19, 0.02, 0.02, 0.02, b);
    mesh(G.box, col(wingC), 0, 0.14, -0.2, 0.1, 0.03, 0.14, b);
    const wings = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.1, 0.2, 0); b.add(p); mesh(G.box, col(wingC), s * 0.15, 0, 0, 0.3, 0.03, 0.16, p); return p; });
    const bird = { g, b, head, wings, rect, kind, state: 'peck', t: Math.random() * 3, vx: 0, vy: 0, vz: 0, hide: 0 };
    place(bird); W.birds.push(bird);
  }
}
function place(bd) {
  const r = bd.rect; bd.g.position.set(r.x0 + Math.random() * (r.x1 - r.x0), r.y, r.z0 + Math.random() * (r.z1 - r.z0));
  bd.g.rotation.y = Math.random() * 6.28; bd.g.visible = true; bd.state = 'peck'; bd.wings.forEach(w => (w.rotation.z = 0));
}
export function scareBirds(x, z, r, chain = true) {
  const fled = [];
  for (const bd of W.birds) {
    if (bd.state !== 'peck') continue;
    const dx = bd.g.position.x - x, dz = bd.g.position.z - z, d = Math.hypot(dx, dz);
    if (d < r) { const k = 1 / Math.max(d, 0.1); bd.state = 'fly'; bd.t = 0; bd.vx = dx * k * 4 + (Math.random() - 0.5) * 2; bd.vz = dz * k * 4 + (Math.random() - 0.5) * 2; bd.vy = 3 + Math.random() * 2; bd.g.rotation.y = Math.atan2(bd.vx, bd.vz); fled.push(bd); }
  }
  // взлетает одна — за ней вся стая рядом (туча голубей)
  if (chain) for (const bd of fled) scareBirds(bd.g.position.x, bd.g.position.z, 4.5, false);
}
export function updateBirds(dt, t, player) {
  if (player && player.speed > 4.5 && !(player.ghost > 0)) scareBirds(player.pos.x, player.pos.z, 3.2);
  for (const bd of W.birds) {
    if (bd.state === 'peck') {
      bd.t -= dt;
      const peck = Math.max(0, Math.sin(t * 9 + bd.g.id));
      bd.head.position.y = 0.3 - peck * 0.08; bd.head.position.z = 0.15 + peck * 0.05;
      if (bd.t < 0) { bd.t = 1 + Math.random() * 3; bd.g.rotation.y += (Math.random() - 0.5) * 2; const a = bd.g.rotation.y; bd.g.position.x += Math.sin(a) * 0.25; bd.g.position.z += Math.cos(a) * 0.25; }
    } else if (bd.state === 'fly') {
      bd.t += dt; bd.vy += 1.5 * dt;
      bd.g.position.x += bd.vx * dt; bd.g.position.y += bd.vy * dt; bd.g.position.z += bd.vz * dt;
      const f = Math.sin(t * 30) * 0.9; bd.wings[0].rotation.z = f; bd.wings[1].rotation.z = -f;
      if (bd.t > 3) { bd.state = 'gone'; bd.g.visible = false; bd.hide = 7 + Math.random() * 5; }
    } else { bd.hide -= dt; if (bd.hide <= 0) place(bd); }
  }
}
