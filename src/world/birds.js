import { THREE, G, mesh, col, lam } from '../core/gfx.js';
import { photo } from '../core/textures.js';
import { W } from './state.js';

/* Голуби (площадь) и вороны (кладбище): клюют, а от бегущих и брошенных предметов взлетают */
/* PS1-стиль (v0.19, референс docs/refs/v0.19/pigeon.png): угловатое «коробочное» тело, сплющенное и чуть кривое,
   фото-подобная текстура перьев (полосы на крыльях, переливы на шее), красный глаз, розовые лапки */
export function featherTex(kind) {
  return photo('feath' + kind, 32, 32, (g, W, H) => {
    const base = kind === 'crow' ? '#1e1a26' : kind === 'gull' ? '#e8e8f0' : '#7a7a8c', dark = kind === 'crow' ? '#0a080e' : kind === 'gull' ? '#8a8a98' : '#4a4a5a';
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < 0.5 ? dark : kind === 'gull' ? '#ffffff' : '#9a9aa8'; g.globalAlpha = 0.25; g.fillRect(Math.random() * W, Math.random() * H, W / 16, H / 32); }
    g.globalAlpha = 1;
    if (kind !== 'gull') { const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, kind === 'crow' ? '#2a3a5a' : '#3a7a5a'); gr.addColorStop(0.5, kind === 'crow' ? '#3a2a5a' : '#6a4a8a'); gr.addColorStop(1, kind === 'crow' ? '#1a2a3a' : '#3a6a7a');
      g.globalAlpha = 0.75; g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.3); g.globalAlpha = 1; }
    g.fillStyle = dark; for (const y of [0.55, 0.72]) g.fillRect(W * 0.1, H * y, W * 0.8, H * 0.06);
  }, 4);
}
export function addBirds(kind, rect, n) {
  const fm = new THREE.MeshLambertMaterial({ map: featherTex(kind) }), leg = col(kind === 'crow' ? 0x2a2a30 : 0xd88a9a), beakC = col(kind === 'crow' ? 0x2a2a30 : kind === 'gull' ? 0xf5c542 : 0xe8d8b0);
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(); W.group.add(g);
    const b = new THREE.Group(); g.add(b);
    // тело — повёрнутый «кубик», слегка сплющенный и перекошенный
    const body = mesh(G.sph10, fm, 0, 0.17, -0.02, 0.11, 0.105, 0.155, b); body.rotation.set(0.45, 0, 0.08 * (Math.random() - 0.5)); mesh(G.sph10, fm, 0, 0.21, 0.07, 0.085, 0.09, 0.08, b); // v0.51: круглое тельце и грудка
    const head = new THREE.Group(); head.position.set(0, 0.32, 0.13); b.add(head);
    mesh(G.sph10, fm, 0, 0, 0, 0.065, 0.065, 0.072, head);
    const beak = mesh(G.cone4, beakC, 0, -0.01, 0.1, 0.025, 0.08, 0.03, head); beak.rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) { mesh(G.box, col(0xd8243a), sx * 0.062, 0.02, 0.03, 0.015, 0.03, 0.03, head); mesh(G.box, col(0x111111), sx * 0.064, 0.02, 0.035, 0.01, 0.014, 0.014, head); }
    { const t = mesh(G.cone4, fm, 0, 0.13, -0.24, 0.07, 0.2, 0.02, b); t.rotation.x = -Math.PI / 2 - 0.25; }
    for (const sx of [-1, 1]) { mesh(G.box, leg, sx * 0.05, 0.05, 0.0, 0.02, 0.1, 0.02, b); for (const a of [-0.5, 0, 0.5]) { const t = mesh(G.box, leg, sx * 0.05 + Math.sin(a) * 0.03, 0.005, 0.03 * Math.cos(a), 0.012, 0.01, 0.06, b); t.rotation.y = a; } }
    const wings = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.1, 0.2, -0.02); b.add(p); { const w = mesh(G.cone4, fm, s * 0.14, 0, -0.03, 0.09, 0.3, 0.012, p); w.rotation.set(Math.PI / 2, 0, s * Math.PI / 2); } return p; });
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
      bd.head.position.y = 0.32 - peck * 0.08; bd.head.position.z = 0.13 + peck * 0.05;
      if (bd.t < 0) { bd.t = 1 + Math.random() * 3; bd.g.rotation.y += (Math.random() - 0.5) * 2; const a = bd.g.rotation.y; bd.g.position.x += Math.sin(a) * 0.25; bd.g.position.z += Math.cos(a) * 0.25; }
    } else if (bd.state === 'fly') {
      bd.t += dt; bd.vy += 1.5 * dt;
      bd.g.position.x += bd.vx * dt; bd.g.position.y += bd.vy * dt; bd.g.position.z += bd.vz * dt;
      const f = Math.sin(t * 30) * 0.9; bd.wings[0].rotation.z = f; bd.wings[1].rotation.z = -f;
      if (bd.t > 3) { bd.state = 'gone'; bd.g.visible = false; bd.hide = 7 + Math.random() * 5; }
    } else { bd.hide -= dt; if (bd.hide <= 0) place(bd); }
  }
}
