import {animalGoal,animalMove} from './animal-roam.js';
import { hitNPC,tickNPCHit } from './impacts.js';
import { THREE, G, V3, mesh, tmat, lam, frontBack, sprite } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { pushOut, groundAt, solidsNear } from '../world/physics.js';
import { damp } from '../core/rng.js';
import { puff } from '../world/particles.js';
import { sfx } from '../core/sfx.js';

export const COATS = [
  { name: 'ginger', base: '#d48a4a', light: '#efc08a', dark: '#9a5420', eye: '#a8b86a', muzzle: 'rgba(250,240,225,.85)', stripes: true },
  { name: 'gray', base: '#8a8a94', light: '#c4c4cc', dark: '#4b4b56', eye: '#d8c04a', muzzle: 'rgba(245,245,245,.8)', stripes: true },
  { name: 'black', base: '#2a2530', light: '#4a4452', dark: '#141118', eye: '#e8c040', muzzle: 'rgba(80,72,90,.5)', stripes: false },
  // v0.19: сиамский (тёмные «носочки», уши, хвост, маска) и трёхцветный
  { name: 'siamese', base: '#e8dcc4', light: '#f6efe0', dark: '#a89070', eye: '#5aa8e8', muzzle: 'rgba(60,40,30,.0)', stripes: false, points: '#4a3428' },
  { name: 'calico', base: '#f1e8dc', light: '#fff8f0', dark: '#c8b8a8', eye: '#c8b040', muzzle: 'rgba(255,250,240,.9)', stripes: false, patches: ['#d8742a', '#2a2530'] },
];
let HEAD;
const headGeo = () => HEAD || (HEAD = frontBack(new THREE.SphereGeometry(1, 7, 5), 0.15));

/* Кот на карте: настоящие пропорции, «фото» мех и морда, гуляет между доступными дворами и улицами */
export function buildCat(coat) {
  const root = new THREE.Group(), fur = tmat(T.fur(coat));
  const body = mesh(G.sph10, fur, 0, 0.36, 0, 0.19, 0.165, 0.34, root);
  // v0.51: силуэт кошки — грудь, бёдра и шея отдельными объёмами, мягкие переходы
  mesh(G.sph10, fur, 0, 0.06, 0.59, 0.84, 0.97, 0.47, body); mesh(G.sph10, fur, 0, 0.12, -0.59, 0.95, 1.03, 0.5, body); mesh(G.sph10, fur, 0, 0.67, 0.85, 0.53, 0.67, 0.29, body); // дочерние: повторяют позы сна и потягивания
  const head = new THREE.Group(); head.position.set(0, 0.52, 0.34); root.add(head);
  const faces = {}; for (const s of ['open', 'closed', 'angry']) faces[s] = tmat(T.catFace(coat, s));
  const hm = new THREE.Mesh(headGeo(), [faces.open, fur]); hm.scale.set(0.17, 0.14, 0.13); head.add(hm);
  const ears = [-1, 1].map(sx => { const e = mesh(G.cone4, fur, sx * 0.1, 0.13, -0.02, 0.06, 0.12, 0.04, head); e.rotation.z = -sx * 0.35; mesh(G.cone4, lam({ color: 0xe89aa8 }, 'catEarIn'), 0, -0.1, 0.12, 0.6, 0.7, 0.5, e); return e; });
  // мордочка: светлая пасть, розовый нос, усы
  const light = lam({ color: new THREE.Color(coat.light) }, 'catLight' + coat.name);
  mesh(G.sph10, light, 0, -0.045, 0.1, 0.075, 0.05, 0.05, head); mesh(G.box, lam({ color: 0xe87a8a }, 'catNose'), 0, -0.02, 0.145, 0.025, 0.018, 0.01, head);
  for (const sx of [-1, 1]) for (const dy of [-0.01, 0.012]) { const w = mesh(G.box, lam({ color: 0xf1f1f1 }, 'catWhisk'), sx * 0.11, -0.045 + dy, 0.12, 0.13, 0.004, 0.004, head); w.rotation.z = sx * dy * 8; w.rotation.y = -sx * 0.25; }
  const legs = [[0.1, 0.22], [-0.1, 0.22], [0.1, -0.22], [-0.1, -0.22]].map(([x, z]) => { const p = new THREE.Group(); p.position.set(x, 0.3, z); root.add(p); const back = z < 0; mesh(G.sph10, fur, 0, back ? -0.02 : -0.01, 0, back ? 0.075 : 0.06, back ? 0.1 : 0.08, back ? 0.08 : 0.065, p); mesh(G.cyl6, fur, 0, -0.15, back ? -0.015 : 0, 0.034, 0.26, 0.034, p); mesh(G.sph10, light, 0, -0.285, 0.02, 0.045, 0.028, 0.06, p); return p; });
  const tail = new THREE.Group(); tail.position.set(0, 0.42, -0.32); root.add(tail);
  mesh(G.cyl6, fur, 0, 0, -0.15, 0.034, 0.32, 0.034, tail).rotation.x = Math.PI / 2;
  const tail2 = new THREE.Group(); tail2.position.set(0, 0, -0.3); tail.add(tail2); mesh(G.cyl6, fur, 0, 0, -0.12, 0.03, 0.26, 0.03, tail2).rotation.x = Math.PI / 2; mesh(G.sph10, coat.stripes ? fur : light, 0, 0, -0.26, 0.036, 0.036, 0.05, tail2);
  const sh = new THREE.Mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.scale.set(0.25, 0.42, 1); root.add(sh);
  const stars = new THREE.Group(); stars.position.set(0, 0.85, 0.3); root.add(stars); stars.visible = false;
  for (let i = 0; i < 3; i++) { const s = sprite(T.star(), 0.18); s.position.set(Math.cos(i * 2.1) * 0.25, 0, Math.sin(i * 2.1) * 0.25); stars.add(s); }
  if (coat.points) { const pm = lam({ map: T.fur({ name: 'pts' + coat.name, base: coat.points, light: '#6a4a38', dark: '#2a1a14', stripes: false }) }, 'catPts' + coat.name);
    ears.forEach(e => (e.material = pm)); legs.forEach(l => { const paw = l.children[0]; if (paw) { const sock = new THREE.Mesh(G.cyl6, pm); sock.position.set(0, -0.22, 0); sock.scale.set(0.04, 0.14, 0.04); l.add(sock); } }); tail2.children.forEach(c => (c.material = pm)); }
  root.scale.setScalar(1.25);
  let cur = 'open';
  const cat = {
    type: 'cat', root, body, head, ears, legs, tail, tail2, stars, mode: 'walk', state: 'idle', timer: Math.random() * 2, ph: 0, ph0: Math.random() * 6,
    flee: 0, dizzy: 0, fx: 0, fz: 0, busy: false,
    face(s) { if (s !== cur) { hm.material[0] = faces[s]; cur = s; } },
    pos() { return root.position; },
    // попадание предметом: тяжёлый — кот оглушён, лёгкий — убегает
    hit(heavy, vx, vz) {
      hitNPC(this,heavy,vx,vz);
    },
  };
  return cat;
}

function freeSpot(h) {
  for (let i = 0; i < 40; i++) {
    const pad=h.y<.5?5:0,x=h.x0-pad+Math.random()*(h.x1-h.x0+pad*2),z=h.z0-pad+Math.random()*(h.z1-h.z0+pad*2);
    if(Math.abs(groundAt(x,z,.2,h.y+.25)-h.y)>.3||W.cats.some(c=>Math.hypot(c.root.position.x-x,c.root.position.z-z)<1.2)||(W.dogs||[]).some(d=>Math.hypot(d.pos.x-x,d.pos.z-z)<1.5))continue;
    if (!solidsNear(x - 0.5, z - 0.5, x + 0.5, z + 0.5).some(s => s.on && s.y1 > h.y + 0.05 && s.y0 < h.y + 0.6 && x > s.x0 - 0.5 && x < s.x1 + 0.5 && z > s.z0 - 0.5 && z < s.z1 + 0.5)) return { x, z };
  }
  return { x: (h.x0 + h.x1) / 2, z: (h.z0 + h.z1) / 2 };
}
export function spawnCat(home) {
  const c = buildCat(COATS[(Math.random() * COATS.length) | 0]); c.home = home;
  const p = freeSpot(home); c.root.position.set(p.x, home.y, p.z); c.root.rotation.y = Math.random() * 6.28;
  W.group.add(c.root); W.cats.push(c);
  // кто-то спит на тёплом капоте или крыше машины рядом с двором
  if (Math.random() < 0.4) { const cx = (home.x0 + home.x1) / 2, cz = (home.z0 + home.z1) / 2, car = W.cars.filter(q => Math.hypot(q.x - cx, q.z - cz) < 22 && Math.abs(q.y - home.y) < 0.5).sort(() => Math.random() - 0.5)[0];
    if (car) { const roof = Math.random() < 0.5, lx = roof ? -0.2 : 1.35, y = car.y + (roof ? 1.47 : 0.96); c.sleep = { x: car.x + lx * Math.cos(car.ry), y, z: car.z - lx * Math.sin(car.ry), car }; c.root.position.set(c.sleep.x, y, c.sleep.z); c.root.rotation.y = car.ry + Math.PI / 2 + (Math.random() - 0.5); } }
  return c;
}

// проснулся: спрыгивает с машины и уходит к себе во двор
function wake(c) { const sl = c.sleep; c.sleep = null; c.legs.forEach(l => (l.visible = true)); c.body.scale.y = 0.17; c.head.position.y = 0.52; c.head.rotation.x = 0; c.face('angry');
  const h = c.home, tx = (h.x0 + h.x1) / 2, tz = (h.z0 + h.z1) / 2, d = Math.hypot(tx - sl.x, tz - sl.z) || 1; c.root.position.set(sl.x + (tx - sl.x) / d * 1.4, groundAt(sl.x + (tx - sl.x) / d * 1.4, sl.z + (tz - sl.z) / d * 1.4, 0.2, sl.y), sl.z + (tz - sl.z) / d * 1.4);
  c.flee = 1.5; c.fx = (tx - sl.x) / d; c.fz = (tz - sl.z) / d; c.away = 30; sfx('meow', { at: c.root.position }); }
export function purr(c) { c.purrT = 2.5; sfx('purr', { at: c.root.position }); }
export function updateCat(c, dt, t, player) {
  if(tickNPCHit(c,dt,t))return;
  let walking = false, speed = 1.4;
  const p = c.root.position;
  if (c.mode === 'walk' && c.sleep) {
    // спит: свернулся клубком, глаза закрыты, «Zz»; будят бегущие рядом, сигнализация, удары
    const sl = c.sleep; p.set(sl.x, sl.y, sl.z); c.face('closed'); c.body.scale.y = 0.13; c.head.position.y = 0.4; c.head.rotation.x = 0.35; c.legs.forEach(l => (l.visible = false)); c.root.position.y = sl.y - 0.12;
    c.tail.rotation.x = 1.4; c.tail.rotation.y = 1.2; c.tail2.rotation.x = 0.2; if (Math.random() < dt * 0.8) puff(p.x, p.y + 0.6, p.z, { color: 0xf1e8ff, size: 0.08, grow: 0.2, vy: 0.4, life: 1.2 });
    if (c.purrT > 0) { c.purrT -= dt; if (Math.random() < dt * 4) puff(p.x, p.y + 0.7, p.z, { color: 0xff7aa8, size: 0.09, grow: 0, vy: 0.6, life: 0.8 }); }
    const near = [player, ...(W.bots || [])].some(a => a && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < 3 && Math.hypot(a.vel.x, a.vel.z) > 6);
    if (near || (sl.car && sl.car.alarm > 0) || c.flee > 0 || c.dizzy > 0) { wake(c); }
    return;
  }
  if (c.mode === 'walk') {
    if (c.dizzy > 0) { c.dizzy -= dt; c.stars.visible = true; c.stars.rotation.y += dt * 6; c.root.rotation.z = Math.sin(t * 8) * 0.15; c.face('closed'); }
    else {
      c.stars.visible = false; c.root.rotation.z = 0;
      // боится бегущего рядом игрока
      if (player && player.speed > 6 && c.flee <= 0) { const dx = p.x - player.pos.x, dz = p.z - player.pos.z, d = Math.hypot(dx, dz); if (d < 2.2 && d > 0.01) { c.flee = 1.2; c.fx = dx / d; c.fz = dz / d; } }
      // собака рядом — шипит, выгибает спину и удирает
      if (c.hissT > 0) c.hissT -= dt;
      for (const d of W.dogs || []) { const dx = p.x - d.pos.x, dz = p.z - d.pos.z, dd = Math.hypot(dx, dz); if (dd < 3 && c.flee <= 0) { c.flee = 2.2; c.fx = dd>.01?dx/dd:Math.cos(c.ph0); c.fz = dd>.01?dz/dd:Math.sin(c.ph0); if (!(c.hissT > 0)) { c.hissT = 3; sfx('hiss', { at: p }); c.body.scale.y = 0.22; } } }
      // уточка пищит или шуршит пакет в руках у бегущего — кот идёт посмотреть
      let lure = c.lure && c.lure.t > 0 ? c.lure : null; if (c.lure) c.lure.t -= dt;
      if (!lure) for (const a of [player, ...(W.bots || [])]) if (a && a.held && (a.held.type === 'trash' || a.held.type === 'litter') && Math.hypot(a.vel.x, a.vel.z) > 1 && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < 9) { lure = { x: a.pos.x, z: a.pos.z }; break; }
      if (c.purrT > 0) { c.purrT -= dt; c.face('closed'); c.state = 'idle'; c.timer = Math.max(c.timer, 0.5); c.tail.rotation.x = 0; if (Math.random() < dt * 4) puff(p.x, p.y + 0.8, p.z, { color: 0xff7aa8, size: 0.09, grow: 0, vy: 0.6, life: 0.8 }); }
      else if (c.flee > 0) { c.flee -= dt; c.timer=Math.max(c.timer,1); c.target = { x: p.x + c.fx * 3, z: p.z + c.fz * 3 }; c.state = 'walk'; speed = 4.5; c.face('angry'); }
      else if (lure && Math.hypot(lure.x - p.x, lure.z - p.z) > 0.9) { c.target = { x: lure.x, z: lure.z }; c.state = 'walk'; c.timer = 2; c.lured = true; speed = 3; c.face('open'); }
      else { c.lured = false; c.face('open'); }
      if (!(c.hissT > 2.4)) c.body.scale.y += (0.17 - c.body.scale.y) * Math.min(1, dt * 6);
      c.timer -= dt;
      if (c.state === 'idle') { if (c.timer <= 0) { c.target = animalGoal(c); c.state = 'walk'; c.timer = 26; c.idleAct=null; } }
      else {
        const dx = c.target.x - p.x, dz = c.target.z - p.z, d = Math.hypot(dx, dz);
        if (d < 0.3 || c.timer <= 0) { c.state = 'idle'; c.timer = 1.5 + Math.random() * 3; c.idleAct=['sniff','groom','sit','stretch'][Math.random()*4|0]; c.idleAge=0; }
        else {
          const result=animalMove(c,c.target,speed,dt);
          if(result.blocked){c.timer=0;c.target=animalGoal(c,12);}walking=result.moved>.002;

          let a = Math.atan2(dx, dz) - c.root.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); c.root.rotation.y += a * damp(8, dt);

        }
      }
      for(const dog of W.dogs||[]){if(dog.heldBy||Math.abs(dog.pos.y-p.y)>.8)continue;let dx=p.x-dog.pos.x,dz=p.z-dog.pos.z,dd=Math.hypot(dx,dz);if(dd<.85){if(dd<.01){dx=Math.cos(c.ph0);dz=Math.sin(c.ph0);dd=1;}const k=(.85-Math.min(dd,.85));p.x+=dx/dd*k;p.z+=dz/dd*k;}}
      pushOut(p,.3,p.y+.15,p.y+.65);p.y = groundAt(p.x, p.z, 0.2, p.y + 0.3);
    }
  }
  if(c.mode==='walk'&&!c.sleep&&c.dizzy<=0){
    c.idleAge=(c.idleAge||0)+dt;const idle=!walking&&!c.flee&&!c.purrT,act=idle?c.idleAct:null;
    const k=damp(9,dt),sit=act==='sit'||act==='groom',stretch=act==='stretch';
    c.body.position.y+=((sit?.31:stretch?.29:.36)-c.body.position.y)*k;
    c.body.scale.y+=((stretch?.13:.17)-c.body.scale.y)*k;
    c.head.position.y+=((sit?.48:stretch?.38:.52)-c.head.position.y)*k;
    c.head.rotation.x+=((act==='sniff'?.5:act==='groom'?.55:0)-c.head.rotation.x)*k;
    c.head.rotation.y+=(Math.sin(t*.9+c.ph0)*(idle?.32:.08)-c.head.rotation.y)*k;
    c.ears.forEach((e,i)=>e.rotation.x=Math.sin(t*2.2+c.ph0+i)*.08);
    if(act==='groom')c.legs[0].rotation.z=-.6+Math.sin(t*7)*.2;else c.legs[0].rotation.z*=1-k;
    c.legs.slice(2).forEach(l=>l.rotation.z+=( (sit?.35:0)-l.rotation.z)*k);
  }
  c.ph += dt * (walking ? speed * 6 : 0);
  const sw = walking ? Math.sin(c.ph) * 0.6 : 0;
  c.legs[0].rotation.x = sw; c.legs[3].rotation.x = sw; c.legs[1].rotation.x = -sw; c.legs[2].rotation.x = -sw;
  if (c.mode !== 'pet') { c.tail.rotation.x = 0.7; c.tail.rotation.y = Math.sin(t * 2 + c.ph0) * 0.4; c.tail2.rotation.x = 0.4; }
}
