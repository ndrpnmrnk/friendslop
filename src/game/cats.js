import { THREE, G, V3, mesh, tmat, lam, frontBack, sprite } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { pushOut, groundAt, solidsNear } from '../world/physics.js';
import { damp } from '../core/rng.js';

export const COATS = [
  { name: 'ginger', base: '#d48a4a', light: '#efc08a', dark: '#9a5420', eye: '#a8b86a', muzzle: 'rgba(250,240,225,.85)', stripes: true },
  { name: 'gray', base: '#8a8a94', light: '#c4c4cc', dark: '#4b4b56', eye: '#d8c04a', muzzle: 'rgba(245,245,245,.8)', stripes: true },
  { name: 'black', base: '#2a2530', light: '#4a4452', dark: '#141118', eye: '#e8c040', muzzle: 'rgba(80,72,90,.5)', stripes: false },
];
let HEAD;
const headGeo = () => HEAD || (HEAD = frontBack(new THREE.SphereGeometry(1, 7, 5), 0.15));

/* Кот на карте: настоящие пропорции, «фото» мех и морда, бродит по своему двору */
export function buildCat(coat) {
  const root = new THREE.Group(), fur = tmat(T.fur(coat));
  const body = mesh(G.sphL, fur, 0, 0.36, 0, 0.2, 0.17, 0.36, root);
  const head = new THREE.Group(); head.position.set(0, 0.52, 0.34); root.add(head);
  const faces = {}; for (const s of ['open', 'closed', 'angry']) faces[s] = tmat(T.catFace(coat, s));
  const hm = new THREE.Mesh(headGeo(), [faces.open, fur]); hm.scale.set(0.17, 0.14, 0.13); head.add(hm);
  const ears = [-1, 1].map(sx => { const e = mesh(G.cone4, fur, sx * 0.1, 0.13, -0.02, 0.06, 0.12, 0.04, head); e.rotation.z = -sx * 0.35; return e; });
  const legs = [[0.1, 0.22], [-0.1, 0.22], [0.1, -0.22], [-0.1, -0.22]].map(([x, z]) => { const p = new THREE.Group(); p.position.set(x, 0.3, z); root.add(p); mesh(G.box, fur, 0, -0.15, 0, 0.07, 0.3, 0.07, p); return p; });
  const tail = new THREE.Group(); tail.position.set(0, 0.42, -0.32); root.add(tail);
  mesh(G.box, fur, 0, 0, -0.15, 0.05, 0.05, 0.3, tail);
  const tail2 = new THREE.Group(); tail2.position.set(0, 0, -0.3); tail.add(tail2); mesh(G.box, fur, 0, 0, -0.12, 0.045, 0.045, 0.25, tail2);
  const sh = new THREE.Mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.scale.set(0.25, 0.42, 1); root.add(sh);
  const stars = new THREE.Group(); stars.position.set(0, 0.85, 0.3); root.add(stars); stars.visible = false;
  for (let i = 0; i < 3; i++) { const s = sprite(T.star(), 0.18); s.position.set(Math.cos(i * 2.1) * 0.25, 0, Math.sin(i * 2.1) * 0.25); stars.add(s); }
  root.scale.setScalar(1.25);
  let cur = 'open';
  const cat = {
    type: 'cat', root, body, head, ears, legs, tail, tail2, stars, mode: 'walk', state: 'idle', timer: Math.random() * 2, ph: 0, ph0: Math.random() * 6,
    flee: 0, dizzy: 0, fx: 0, fz: 0, busy: false,
    face(s) { if (s !== cur) { hm.material[0] = faces[s]; cur = s; } },
    pos() { return root.position; },
    // попадание предметом: тяжёлый — кот оглушён, лёгкий — убегает
    hit(heavy, vx, vz) {
      if (this.mode === 'pet') return;
      const d = Math.hypot(vx, vz) || 1;
      if (heavy) { this.dizzy = 2.2; this.flee = 0; } else { this.flee = 2.5; this.fx = vx / d; this.fz = vz / d; }
    },
  };
  return cat;
}

function freeSpot(h) {
  for (let i = 0; i < 40; i++) {
    const x = h.x0 + Math.random() * (h.x1 - h.x0), z = h.z0 + Math.random() * (h.z1 - h.z0);
    if (!solidsNear(x - 0.5, z - 0.5, x + 0.5, z + 0.5).some(s => s.on && s.y1 > h.y + 0.05 && s.y0 < h.y + 0.6 && x > s.x0 - 0.5 && x < s.x1 + 0.5 && z > s.z0 - 0.5 && z < s.z1 + 0.5)) return { x, z };
  }
  return { x: (h.x0 + h.x1) / 2, z: (h.z0 + h.z1) / 2 };
}
export function spawnCat(home) {
  const c = buildCat(COATS[(Math.random() * COATS.length) | 0]); c.home = home;
  const p = freeSpot(home); c.root.position.set(p.x, home.y, p.z); c.root.rotation.y = Math.random() * 6.28;
  W.group.add(c.root); W.cats.push(c); return c;
}

export function updateCat(c, dt, t, player) {
  let walking = false, speed = 1.4;
  const p = c.root.position;
  if (c.mode === 'walk') {
    if (c.dizzy > 0) { c.dizzy -= dt; c.stars.visible = true; c.stars.rotation.y += dt * 6; c.root.rotation.z = Math.sin(t * 8) * 0.15; c.face('closed'); }
    else {
      c.stars.visible = false; c.root.rotation.z = 0;
      // боится бегущего рядом игрока
      if (player && player.speed > 6 && c.flee <= 0) { const dx = p.x - player.pos.x, dz = p.z - player.pos.z, d = Math.hypot(dx, dz); if (d < 2.2 && d > 0.01) { c.flee = 1.2; c.fx = dx / d; c.fz = dz / d; } }
      if (c.flee > 0) { c.flee -= dt; c.target = { x: p.x + c.fx * 3, z: p.z + c.fz * 3 }; c.state = 'walk'; speed = 4.5; c.face('angry'); }
      else c.face('open');
      c.timer -= dt;
      if (c.state === 'idle') { if (c.timer <= 0) { c.target = freeSpot(c.home); c.state = 'walk'; c.timer = 8; } }
      else {
        const dx = c.target.x - p.x, dz = c.target.z - p.z, d = Math.hypot(dx, dz);
        if (d < 0.3 || c.timer <= 0) { c.state = 'idle'; c.timer = 1.5 + Math.random() * 3; }
        else {
          const v = speed * dt, ox = p.x, oz = p.z; p.x += dx / d * v; p.z += dz / d * v;
          pushOut(p, 0.35, p.y + 0.25, p.y + 0.6);
          // не уходить из своего двора
          p.x = Math.max(c.home.x0, Math.min(c.home.x1, p.x)); p.z = Math.max(c.home.z0, Math.min(c.home.z1, p.z));
          if (Math.hypot(p.x - ox, p.z - oz) < v * 0.3) c.timer = 0;
          let a = Math.atan2(dx, dz) - c.root.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); c.root.rotation.y += a * damp(8, dt);
          walking = true;
        }
      }
      p.y = groundAt(p.x, p.z, 0.2, p.y + 0.3);
    }
  }
  c.ph += dt * (walking ? speed * 6 : 0);
  const sw = walking ? Math.sin(c.ph) * 0.6 : 0;
  c.legs[0].rotation.x = sw; c.legs[3].rotation.x = sw; c.legs[1].rotation.x = -sw; c.legs[2].rotation.x = -sw;
  if (c.mode !== 'pet') { c.tail.rotation.x = 0.7; c.tail.rotation.y = Math.sin(t * 2 + c.ph0) * 0.4; c.tail2.rotation.x = 0.4; }
}
