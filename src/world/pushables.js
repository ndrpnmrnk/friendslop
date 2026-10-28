import {bicycleModel,kartModel,scooterModel} from './vehicles.js';
import { splatter } from './splat.js';
import { THREE, G, mesh, col, tmat, compose, lam, glow } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addOutline } from '../game/outline.js';
import { cartModel, barrowModel, binModel, tireModel } from './props.js';
import { chunk, decal, burst } from './particles.js';

// Тележки и бочки: их можно толкать телом
/* На чём можно кататься: seat — высота посадки, pose — сидя или стоя,
   max — максимальная скорость, acc — разгон, turn — поворот, fric — трение */
export const RIDE = {
  bike:{seat:.88,pose:'cycle',max:14,acc:10,turn:2.8,fric:.35},
  kart:{seat:.34,pose:'kart',max:21,acc:16,turn:2.7,fric:.25},
  skate:  { seat: 0.16, pose: 'stand', max: 13, acc: 9, turn: 3.2, fric: 0.25 },
  chair:  { seat: 0.55, pose: 'sit', max: 6.5, acc: 6, turn: 4.5, fric: 1.0 },
  // тележку и тачку нельзя «завести» на месте: сначала разгоняешь её руками, потом запрыгиваешь (coast)
  cart:   { seat: 0.62, pose: 'sit', max: 14, acc: 0, turn: 1.5, fric: 0.32, coast: true },
  barrow: { seat: 0.62, pose: 'sit', max: 11, acc: 0, turn: 1.2, fric: 0.55, coast: true },
  // самокат: стоя, быстрый разгон; детская машинка: сидя, медленная; надувной круг — по воде (на суше еле ползёт)
  scooter: { seat: 0.2, pose: 'stand', max: 12, acc: 11, turn: 3.6, fric: 0.45 },
  kidcar: { seat: 0.32, pose: 'sit', max: 7.5, acc: 8, turn: 3.0, fric: 1.4 },
  ring:   { seat: 0.05, pose: 'sit', max: 8, acc: 8, turn: 3.2, fric: 0.8, water: true },
  // больничная каталка: как тележка — разогнать руками и запрыгнуть
  gurney: { seat: 0.82, pose: 'sit', max: 13, acc: 0, turn: 1.4, fric: 0.38, coast: true },
};
let sackGeometry;
export function addPushable(b, kind, x, z, y = 0) {
  const g = new THREE.Group(); W.group.add(g);
  let roller = null, r;
  if(kind==='voteBall'){r=.95;} // v0.55: мяч голосования в хабе — модель добавляет хаб
  else if(kind==='bike'){g.add(bicycleModel());r=.52;}
  else if(kind==='kart'){g.add(kartModel([0xff8a1f,0x4ab0f0,0x9be36b,0xb18cff][W.pushables.filter(p=>p.kind==='kart').length%4]));r=.78;}
  else if (kind === 'cart') { g.add(cartModel()); r = 0.6; }
  else if (kind === 'barrow') { g.add(barrowModel()); r = 0.55; }
  else if (kind === 'sack') {
    const shape=sackGeometry||(sackGeometry=new THREE.LatheGeometry([[0,0],[.22,.025],[.34,.12],[.35,.28],[.29,.46],[.12,.57],[.10,.65],[.16,.72],[0,.70]].map(([r,y])=>new THREE.Vector2(r,y)),12));
    const pos=shape.attributes.position;if(!shape.userData.folded){shape.userData.folded=true;for(let i=0;i<pos.count;i++){const y=pos.getY(i),a=Math.atan2(pos.getZ(i),pos.getX(i)),k=1+Math.sin(a*6+y*9)*.035;pos.setX(i,pos.getX(i)*k);pos.setZ(i,pos.getZ(i)*k);}shape.computeVertexNormals();}
    g.add(compose('sack43',a=>{const cloth=tmat(T.burlap());a(shape,cloth,0,0,0,1,1,1);a(new THREE.TorusGeometry(.105,.014,4,12),col(0x5f4f38),0,.63,0,1,1,1,Math.PI/2);a(G.box,tmat(T.sign('ЗЕРНО','#b59b70','#514735')),0,.29,.359,.22,.12,.012);for(let i=0;i<5;i++)a(G.box,col(0xc6af80),-.22,.16+i*.055,.255,.025,.012,.015);}));
    g.rotation.y = Math.random() * 6; r = 0.32;
  }
  // стол из квартиры/кафе/офиса (v0.19): можно толкать, на него можно запрыгнуть
  else if (kind === 'table') { g.add(compose('ptable', a => { const w = tmat(T.wood()), dk = col(0x2b2533); a(G.box, w, 0, 0.76, 0, 1.12, 0.08, 0.72); a(G.box, dk, 0, 0.71, 0, 1.0, 0.04, 0.6);
      for (const [x, z] of [[-0.48, -0.28], [0.48, -0.28], [-0.48, 0.28], [0.48, 0.28]]) a(G.box, dk, x, 0.36, z, 0.06, 0.72, 0.06); })); r = 0.5; }
  else if (kind === 'bin') { g.add(binModel()); r = 0.4;
  } else if (kind === 'skate') {
    g.add(compose('skate', add => {
      const deck = tmat(T.wood()), grip = col(0x23202a), tr = col(0x9a9da8), wh = col(0xf5c542);
      add(G.box, deck, 0, 0.12, 0, 0.24, 0.035, 0.66); for (const s2 of [-1, 1]) add(G.box, deck, 0, 0.135, s2 * 0.38, 0.24, 0.035, 0.12, s2 * -0.35);
      add(G.box, grip, 0, 0.14, 0, 0.23, 0.006, 0.64); add(G.box, col(0xff5a6e), 0, 0.103, 0, 0.18, 0.004, 0.4);
      // v0.58: болты, подкладки, полоса-рисунок снизу, «колпачки» колёс
      for (const z of [-0.26, 0.26]) { add(G.box, col(0x3a3440), 0, 0.105, z, 0.12, 0.012, 0.09); for (const x of [-0.035, 0.035]) for (const dz of [-0.025, 0.025]) add(G.box, tr, x, 0.146, z + dz, 0.012, 0.006, 0.012); }
      add(G.box, col(0x4ab0f0), 0, 0.102, 0, 0.06, 0.004, 0.5);
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
  } else if (kind === 'scooter') {
    g.add(scooterModel());
    r = 0.35;
  } else if (kind === 'kidcar') {
    g.add(compose('kidcar', add => { const rd = col(0xd8243a), yl = col(0xf5c542), dk = col(0x17111f);
      add(G.box, rd, 0, 0.25, 0, 0.62, 0.26, 1.0); add(G.box, rd, 0, 0.42, 0.28, 0.58, 0.12, 0.38); add(G.box, lam({ color: 0x9ccbec, transparent: true, opacity: 0.7 }, 'kcGlass'), 0, 0.55, 0.12, 0.5, 0.18, 0.03, -0.4);
      add(G.box, col(0x3a3440), 0, 0.4, -0.18, 0.46, 0.06, 0.4); add(G.cyl8, dk, 0, 0.55, 0.0, 0.1, 0.02, 0.1, 1.0); for (const sz of [-1, 1]) add(G.box, glow(0xfff1c0), sz * 0.2, 0.3, 0.505, 0.1, 0.08, 0.01);
      for (const [x, z] of [[-0.32, 0.32], [0.32, 0.32], [-0.32, -0.32], [0.32, -0.32]]) { add(G.cyl8, dk, x, 0.12, z, 0.12, 0.08, 0.12, 0, 0, Math.PI / 2); add(G.cyl8, yl, x + Math.sign(x) * 0.045, 0.12, z, 0.05, 0.01, 0.05, 0, 0, Math.PI / 2); } }));
    r = 0.55;
  } else if (kind === 'gurney') {
    g.add(compose('gurney', add => { const mt = col(0xb8bcc8), dk = col(0x23202a);
      add(G.box, mt, 0, 0.7, 0, 0.62, 0.05, 1.9); add(G.box, lam({ color: 0xd8e0e8 }, 'gurneyPad'), 0, 0.77, 0, 0.56, 0.1, 1.8); add(G.box, col(0xeee8ff), 0, 0.84, -0.7, 0.46, 0.08, 0.3);
      for (const sx of [-0.28, 0.28]) { add(G.box, mt, sx, 0.9, 0.1, 0.03, 0.03, 1.2); for (const sz of [-0.8, 0.8]) { add(G.box, mt, sx, 0.38, sz, 0.04, 0.66, 0.04); add(G.cyl8, dk, sx, 0.06, sz, 0.06, 0.04, 0.06, 0, 0, Math.PI / 2); } }
      add(G.box, mt, 0, 0.25, 0, 0.5, 0.03, 1.5); }));
    r = 0.6;
  } else if (kind === 'ring') {
    roller = new THREE.Group(); g.add(roller);
    roller.add(compose('swimRing', add => { add(new THREE.TorusGeometry(0.42, 0.17, 6, 12), lam({ map: T.awning('#ff5a6e', '#f1e8ff') }, 'ringMat'), 0, 0.12, 0, 1, 1, 1, Math.PI / 2); }));
    r = 0.55; roller = null;
  } else if (kind === 'tire') {
    roller = new THREE.Group(); roller.position.y = 0.33; g.add(roller); roller.add(tireModel()); r = 0.35;
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
  const mass = { voteBall:1.1, bike:.8,kart:2.2, table: 2.4, sack: 2.6, cart: 1.2, bin: 2, barrel: 4, skate: 0.4, chair: 1, barrow: 1.6, tire: 0.7, scooter: 0.5, kidcar: 1.4, ring: 0.3, gurney: 1.4 }[kind];
  const h = { voteBall:1.9, bike:1.0,kart:.65, table: 0.8, sack: 0.62, cart: 1.2, bin: 1.1, barrel: 0.85, skate: 0.16, chair: 1.1, barrow: 0.8, tire: 0.7, scooter: 0.2, kidcar: 0.6, ring: 0.3, gurney: 0.9 }[kind];
  const p = { kind, mesh: g, roller, x: b.X(x), z: b.Z(z), y: b.Y + y, vx: 0, vz: 0, r, mass, h, ride: RIDE[kind] || null, heading: 0 };
  if (p.ride) p.outline = addOutline(g, 0.04);
  g.position.set(p.x, p.y, p.z); W.pushables.push(p); return p;
}

/* Урна опрокидывается от сильного удара или тарана на бегу: ложится набок, мусор высыпается */
export function tipBin(b, dx = 0, dz = 1) {
  if (b.kind !== 'bin' || b.tipped) return;
  if (!b.looted) { b.looted = true; W.containerLoot && W.containerLoot(new THREE.Vector3(b.x, b.y + 0.4, b.z)); }
  b.tipped = true; b.tipT = 0; b.tipDir = Math.atan2(dx, dz);
  // кто прятался в урне — выкатывается рэгдоллом
  const l = Math.hypot(dx, dz) || 1;
  for (const a of [W.player, ...(W.bots || [])]) if (a && a.hidden && a.hidden.pb === b) { a.hidden = null; a.root.visible = true; a.pos.set(b.x + dx / l * 0.6, b.y + 0.3, b.z + dz / l * 0.6); W.knockDown && W.knockDown(a, dx / l * 6, dz / l * 6, 1.4); }
  const cols = [0xd8d0c0, 0x8a8d98, 0xc83a3a, 0x6aa84f];
  for (let i = 0; i < 8; i++) chunk(b.x, b.y + 0.6, b.z, [dx * 3 + (Math.random() - 0.5) * 3, 1 + Math.random() * 2, dz * 3 + (Math.random() - 0.5) * 3], { mat: col(cols[i % 4]), size: 0.1, sy: 0.4, life: 6 });
  splatter({ x: b.x + dx * 0.8, y: b.y + 0.4, z: b.z + dz * 0.8 }, null, 0x3a3020, 16, 0.6, { flat: true });
  burst(b.x, b.y + 0.4, b.z, 4, { color: 0x6a6a5a, size: 0.3, speed: 1.2, up: 0.8, g: 2, life: 0.6 });
}
export function animateTip(b, dt) {
  if (!b.tipped || b.tipT >= 1) return;
  b.tipT = Math.min(1, b.tipT + dt * 3);
  const m = b.mesh.children[0], k = b.tipT * b.tipT;
  b.mesh.rotation.y = b.tipDir; m.rotation.x = k * Math.PI / 2; m.position.y = k * 0.36;
  b.h = 0.75;
}
