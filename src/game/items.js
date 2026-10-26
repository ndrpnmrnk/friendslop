import {actionEffect} from '../world/action-fx.js';
import {placeArcDots} from './trajectory.js';
import {basketCrossing} from '../world/basketball.js';
import {sweepActors,npcList,npcPosition,hitNPC,heavyHit} from './impacts.js';
import {bowModel} from './bow.js';
import {bongModel} from './bong.js';
import { pantsModel } from '../characters/mammoth.js';
import {fatCanModel} from '../missions/fat-models.js';
import { THREE, G, V3, mesh, col, tmat, lam, compose, glow } from '../core/gfx.js';
import { addOutline, OUTLINE } from './outline.js';
import { chairModel, coneModel, trashModel, litterModel } from '../world/props.js';
import { PFACE } from '../world/builder.js';
import { T } from '../core/textures.js';
import { CONFIG } from '../config.js';
import { W } from '../world/state.js';
import { groundAt, solidHit, raySolids, addZone, impulsePushables, zoneAt, materialAt } from '../world/physics.js';
import { puff, burst, chunk, splash, ripple, decal } from '../world/particles.js';
import { splatter } from '../world/splat.js';
import { scareBirds } from '../world/birds.js';
import { hitBreakables } from '../world/breakables.js';
import { worldHit, shake, hitFreeze } from './worldfx.js';
import { sfx } from '../core/sfx.js';
const MAG_ARC = new THREE.TorusGeometry(0.115, 0.047, 6, 12, Math.PI);

/* Предметы для броска. Лежат в своих районах, их можно подобрать (E) и кинуть (зажать ПКМ). */
const GRAV = 22;
// Один интегратор для полёта и пунктира: точное сопротивление, без зависимости от FPS.
function integrateProjectile(p,v,dt,drag=0){const k=Math.max(0,drag);if(k<1e-5){p.addScaledVector(v,dt);p.y-=GRAV*dt*dt/2;v.y-=GRAV*dt;}else{const e=Math.exp(-k*dt),f=(1-e)/k;p.x+=v.x*f;p.z+=v.z*f;p.y+=(v.y+GRAV/k)*f-GRAV*dt/k;v.multiplyScalar(e);v.y-=GRAV/k*(1-e);}}
function boundaryHit(old,p,r){const B=W.bounds-r;let t=1,n=null;for(const a of['x','z'])if(Math.abs(p[a])>B){const edge=Math.sign(p[a])*B,u=(edge-old[a])/(p[a]-old[a]);if(u<t){t=Math.max(0,u);n=a==='x'?[-Math.sign(p.x),0,0]:[0,0,-Math.sign(p.z)];}}if(n)p.lerpVectors(old,p,t);return n;}

function build(type) {
  if(type==='fatcan')return fatCanModel();
  if(SNACKS[type])return snackModel(type);
  if(type==='boombox')return radioModel();
  if(type==='bong')return bongModel();
  if(type==='bow')return bowModel();
  if(type==='perfume'){const g=new THREE.Group();mesh(G.box,lam({color:0xb18cff,transparent:true,opacity:.65}),0,0,0,.22,.3,.14,g);mesh(G.cyl6,tmat(T.metal()),0,.19,0,.045,.08,.045,g);mesh(G.box,col(0xf5c542),.03,.23,.02,.12,.05,.07,g);mesh(G.box,tmat(T.sign('PARFUM','#e6d0a4','#31243c')),0,0,.075,.19,.13,.01,g);return g;}
  if(type==='mammothpants')return pantsModel();
  const g = new THREE.Group();
  if (type === 'balloon') {
    mesh(G.sph, lam({ map: T.balloon(), transparent: true, opacity: 0.92 }, 'balloon'), 0, 0, 0, 0.22, 0.26, 0.22, g);
    mesh(G.cone4, col(0x1a5ab0), 0, -0.27, 0, 0.05, 0.07, 0.05, g);
  } else if (type === 'tomato') {
    mesh(G.sph, tmat(T.tomato()), 0, 0, 0, 0.16, 0.13, 0.16, g);
    for (let i = 0; i < 5; i++) { const l = mesh(G.box, col(0x3f6b2a), Math.cos(i * 1.26) * 0.04, 0.13, Math.sin(i * 1.26) * 0.04, 0.07, 0.01, 0.025, g); l.rotation.y = -i * 1.26; }
    mesh(G.cyl6, col(0x3f6b2a), 0, 0.15, 0, 0.012, 0.04, 0.012, g);
  } else if (type === 'pumpkin') {
    mesh(G.sph, tmat(T.pumpkin()), 0, 0, 0, 0.32, 0.25, 0.32, g); // low-poly, «PS1»
    mesh(G.cyl6, col(0x3f6b2a), 0, 0.28, 0, 0.05, 0.14, 0.05, g);
    const f = mesh(G.plane, PFACE(), 0, 0.01, 0.315, 0.36, 0.3, 1, g); f.userData.noOutline = true;
  } else if (type === 'bigpumpkin') {
    mesh(G.sph10, lam({ map: T.pumpkin(), emissive: 0x3a1a00 }, 'bigPump'), 0, 0, 0, 0.55, 0.47, 0.55, g);
    mesh(G.cyl6, col(0x3f6b2a), 0, 0.5, 0, 0.07, 0.18, 0.07, g);
    const f = mesh(G.plane, PFACE(), 0, 0.02, 0.545, 0.6, 0.5, 1, g); f.userData.noOutline = true;
  } else if (type === 'ball') {
    mesh(G.sph10, tmat(T.ball()), 0, 0, 0, 0.24, 0.24, 0.24, g);
  } else if (type === 'brick') {
    mesh(G.box, tmat(T.brickItem()), 0, 0, 0, 0.42, 0.18, 0.22, g);
    mesh(G.box, col(0x6a2a1c), 0, 0.091, 0, 0.24, 0.005, 0.1, g);
  } else if (type === 'trash') g.add(trashModel());
  else if (type === 'litter') g.add(litterModel((Math.random() * 5) | 0));
  else if(type==='missioncrate')g.add(compose('missionCrate25',a=>{const m=tmat(T.crate());a(G.box,m,0,0,0,0.9,0.7,0.9);for(const x of [-0.38,0.38])a(G.box,tmat(T.wood()),x,0,0.46,0.08,0.7,0.025);a(G.box,col(0x6a5638),0,0,0.475,0.9,0.06,0.025,0,0,0.55);}));
  else if (type === 'canister') { const r = lam({ map: T.paintMetal(0xc8243a) }, 'canisterB'); mesh(G.box, r, 0, 0, 0, 0.3, 0.38, 0.16, g); mesh(G.box, col(0x2b2533), 0, 0.22, -0.04, 0.06, 0.06, 0.06, g); mesh(G.box, r, 0.06, 0.21, 0.0, 0.16, 0.04, 0.05, g); mesh(G.cyl6, col(0xf5c542), -0.08, 0.22, 0.04, 0.025, 0.08, 0.025, g); }
  else if (type === 'letter') { const c = it_letterC(); mesh(G.box, col(0xf1e8ff), 0, 0, 0, 0.3, 0.02, 0.2, g); mesh(G.box, col(c), 0, 0.012, 0, 0.3, 0.005, 0.06, g); mesh(G.box, col(c), 0.1, 0.012, 0.05, 0.05, 0.006, 0.05, g); }
  else if (type === 'parcel') { mesh(G.box, col(0xc8a070), 0, -0.05, 0, 0.5, 0.14, 0.5, g); mesh(G.box, col(0xc8a070), 0, 0.1, 0, 0.46, 0.14, 0.46, g); mesh(G.box, col(0xd8243a), 0, 0.03, 0.252, 0.3, 0.06, 0.01, g); mesh(G.box, col(0xf1e8ff), 0, 0.172, 0, 0.47, 0.005, 0.08, g); }
  else if (type === 'can') { mesh(G.cyl8, lam({ color: 0xd8243a, emissive: 0x3a0808 }, 'canBody'), 0, 0, 0, 0.065, 0.2, 0.065, g); mesh(G.cyl8, col(0xd8d8e0), 0, 0.105, 0, 0.06, 0.012, 0.06, g); mesh(G.box, col(0xf1e8ff), 0, 0.02, 0.066, 0.06, 0.06, 0.004, g); }
  else if (type === 'monitor') { const dk = col(0x2b2533); mesh(G.box, dk, 0, 0.06, 0, 0.56, 0.36, 0.05, g); mesh(G.box, tmat(T.screen()), 0, 0.06, 0.027, 0.5, 0.3, 0.005, g); mesh(G.box, dk, 0, -0.16, -0.02, 0.06, 0.12, 0.05, g); mesh(G.box, dk, 0, -0.22, 0, 0.26, 0.02, 0.16, g); }
  else if (type === 'pc') { mesh(G.box, col(0xd8d0c0), 0, 0, 0, 0.2, 0.44, 0.42, g); mesh(G.box, col(0x3a3440), 0.101, 0.1, 0.08, 0.005, 0.12, 0.2, g); mesh(G.box, glow(0x9be36b), 0.102, -0.12, 0.15, 0.005, 0.02, 0.02, g); mesh(G.box, col(0x6a6d78), 0.102, 0.02, 0, 0.005, 0.02, 0.3, g); }
  else if (type === 'keyboard') { mesh(G.box, col(0xd8d0c0), 0, 0, 0, 0.44, 0.03, 0.15, g); for (let i = 0; i < 3; i++) mesh(G.box, col(0x9a9da8), 0, 0.017, -0.045 + i * 0.045, 0.4, 0.008, 0.03, g); }
  else if (type === 'mug') { const c = [0xd8243a, 0xf1e8ff, 0x4ab0f0, 0xf5c542][(Math.random() * 4) | 0]; mesh(G.cyl8, col(c), 0, 0, 0, 0.07, 0.16, 0.07, g); mesh(G.cyl8, col(0x3a2418), 0, 0.075, 0, 0.06, 0.01, 0.06, g); mesh(G.torus, col(c), 0.08, 0, 0, 0.04, 0.04, 0.04, g).rotation.x = Math.PI / 2; }
  else if (type === 'books') { const cs = [0x7b4bc4, 0xd8243a, 0x4a8ac8, 0x6aa84f]; for (let i = 0; i < 3; i++) { const b = mesh(G.box, col(cs[(i + (Math.random() * 4 | 0)) % 4]), (Math.random() - 0.5) * 0.03, -0.08 + i * 0.07, 0, 0.3, 0.06, 0.22, g); b.rotation.y = (Math.random() - 0.5) * 0.4; mesh(G.box, col(0xf1e8ff), 0.151, -0.08 + i * 0.07, 0, 0.004, 0.05, 0.2, g).rotation.y = b.rotation.y; } }
  else if (type === 'dlamp') { const c = col(0x3a6a4a); mesh(G.cyl8, c, 0, -0.15, 0, 0.1, 0.03, 0.1, g); mesh(G.cyl6, c, 0, -0.02, 0, 0.015, 0.26, 0.015, g); mesh(G.cone8, lam({ color: 0x4a8a5a, emissive: 0x1a2a1a }, 'lampShade'), 0, 0.14, 0, 0.13, 0.14, 0.13, g); mesh(G.sph, glow(0xfff0c0), 0, 0.08, 0, 0.04, 0.04, 0.04, g); }
  else if (type === 'pot') { mesh(G.cyl8, col(0xc8643a), 0, -0.08, 0, 0.13, 0.2, 0.1, g); mesh(G.cyl8, col(0x3a2418), 0, 0.02, 0, 0.12, 0.01, 0.12, g); for (let i = 0; i < 5; i++) { const l = mesh(G.ico, tmat(T.leaves(2)), Math.cos(i * 1.3) * 0.06, 0.12 + i * 0.03, Math.sin(i * 1.3) * 0.06, 0.09, 0.07, 0.09, g); l.rotation.y = i; } }
  else if (type === 'chair') g.add(chairModel());
  else if (type === 'cone') g.add(coneModel());
  else g.add(toolModel(type, g));
  // маленькие инструменты чуть крупнее — в пропорции к руке персонажа
  const sc = TOOL_SCALE[type]; if (sc) g.children.forEach(c => c.scale.multiplyScalar(sc));
  return g;
}
const TOOL_SCALE = { whistle: 1.6, badge: 1.4, energy: 1.3, duck: 1.3, banana: 1.3, popper: 1.35, firework: 1.3, sling: 1.35, web: 1.25, cushion: 1.25, bubbles: 1.35, bulb: 1.2, net: 1.2, slipper: 1.1 };
export const rarityOf = type => { const d = CONFIG.items[type]; return !d || !d.tool ? 'item' : CONFIG.toolRare.includes(type) ? 'rare' : 'tool'; };
/* Модели инструментов и предметов миссий: по 5–20 деталей, собираются один раз (compose) */
const C = c => col(c);
function toolModel(type, g) {
  if (type === 'umbrella') {
    // зонтик: ручка-крюк и древко; купол — отдельная часть, раскрывается (ЛКМ)
    const m = compose('umbrellaStick', a => { a(G.cyl6, C(0x2b2533), 0, 0.05, 0, 0.02, 0.7, 0.02); a(G.halfTorus, C(0x6a4428), 0.06, -0.3, 0, 0.06, 0.06, 0.3, 0, 0, Math.PI); });
    const canopy = compose('umbrellaTop', a => { a(G.cone8, lam({ map: T.awning('#b18cff', '#2a1f3d'), side: THREE.DoubleSide }, 'umbr'), 0, 0, 0, 1, 0.45, 1); a(G.sph, C(0x2b2533), 0, 0.24, 0, 0.04, 0.04, 0.04); });
    canopy.position.y = 0.32; canopy.scale.set(0.09, 1, 0.09); g.userData.canopy = canopy; m.add(canopy); return m;
  }
  return compose('tool_' + type, a => {
    switch (type) {
      case 'slipper': { const pk = C(0xff7aa8); a(G.box, C(0xf1e8ff), 0, -0.04, 0, 0.13, 0.04, 0.3); a(G.box, pk, 0, -0.065, 0, 0.14, 0.02, 0.31); a(G.box, pk, 0, 0.0, 0.05, 0.14, 0.06, 0.12); a(G.sph, C(0xffffff), 0, 0.04, 0.06, 0.05, 0.04, 0.05); break; }
      case 'extinguisher': { const r = C(0xd8243a), k = C(0x17111f); a(G.cyl8, r, 0, 0, 0, 0.11, 0.42, 0.11); a(G.sph, r, 0, 0.21, 0, 0.11, 0.06, 0.11); a(G.box, k, 0, 0.29, 0, 0.05, 0.08, 0.05); a(G.box, k, 0.06, 0.32, 0, 0.14, 0.03, 0.04); a(G.cyl6, k, -0.06, 0.24, 0.06, 0.02, 0.2, 0.02, 0.8); a(G.box, C(0xf1e8ff), 0, 0.02, 0.112, 0.12, 0.12, 0.004); break; }
      case 'banana': { const y = C(0xf5d442), d = C(0x6a4a1a); a(G.box, y, 0, 0, 0, 0.06, 0.06, 0.12, 0, 0, 0); a(G.box, y, 0, 0.02, 0.1, 0.055, 0.055, 0.1, -0.45); a(G.box, y, 0, 0.02, -0.1, 0.055, 0.055, 0.1, 0.45); a(G.box, d, 0, 0.05, 0.16, 0.02, 0.02, 0.04, -0.8); break; }
      case 'pillow': { const w = C(0xeee8ff); a(G.sph10, w, 0, 0, 0, 0.26, 0.09, 0.19); for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(G.cone4, w, sx * 0.22, 0, sz * 0.15, 0.04, 0.08, 0.04, 0, 0, sx * Math.PI / 2); a(G.box, C(0xb18cff), 0, 0.085, 0, 0.18, 0.01, 0.02); break; }
      case 'duck': { const y = C(0xf5c542); a(G.sph10, y, 0, -0.02, 0, 0.12, 0.09, 0.14); a(G.sph10, y, 0, 0.09, 0.07, 0.07, 0.07, 0.07); a(G.cone4, C(0xff8a1f), 0, 0.08, 0.15, 0.03, 0.06, 0.02, Math.PI / 2); for (const sx of [-1, 1]) a(G.box, C(0x17111f), sx * 0.035, 0.11, 0.125, 0.015, 0.02, 0.01); a(G.cone4, y, 0, 0.0, -0.14, 0.04, 0.06, 0.03, -1.2); break; }
      case 'bubbles': { a(G.cyl8, lam({ color: 0x8ad0f0, transparent: true, opacity: 0.85 }, 'bubBottle'), 0, -0.02, 0, 0.06, 0.18, 0.06); a(G.cyl8, C(0xff5a9e), 0, 0.09, 0, 0.04, 0.04, 0.04); a(G.cyl5, C(0xff5a9e), 0.06, 0.1, 0, 0.008, 0.2, 0.008, 0, 0, -0.4); a(G.torus, C(0xff5a9e), 0.11, 0.21, 0, 0.04, 0.04, 0.04, Math.PI / 2); break; }
      case 'whistle': { const s = C(0xc8c8d8); a(G.cyl8, s, 0, 0, 0, 0.05, 0.06, 0.05, Math.PI / 2); a(G.box, s, 0, 0.01, 0.06, 0.05, 0.03, 0.08); a(G.torus, C(0xff8a1f), 0, 0.0, -0.06, 0.04, 0.04, 0.04, 0, Math.PI / 2); break; }
      case 'magnet': {
        // подкова: толстая красная дуга, две ноги, серебряные полюса, белая полоска
        a(MAG_ARC, C(0xd8243a), 0, 0.04, 0, 1, 1, 1);
        for (const sx of [-1, 1]) { a(G.box, C(0xd8243a), sx * 0.115, -0.04, 0, 0.09, 0.16, 0.09); a(G.box, C(0xd8d8e0), sx * 0.115, -0.15, 0, 0.095, 0.07, 0.095); a(G.box, C(0xf1e8ff), sx * 0.115, 0.02, 0.047, 0.07, 0.02, 0.005); }
        break; }
      case 'paint': { a(G.cyl8, tmat(T.metal()), 0, 0, 0, 0.14, 0.22, 0.14); a(G.cyl8, C(0x4ab0f0), 0, 0.105, 0, 0.13, 0.02, 0.13); a(G.halfTorus, C(0x2b2533), 0, 0.11, 0, 0.14, 0.16, 0.6); a(G.box, C(0x4ab0f0), 0.12, 0.05, 0.07, 0.03, 0.1, 0.01); a(G.box, C(0xf1e8ff), 0, 0.0, 0.142, 0.1, 0.08, 0.004); break; }
      case 'energy': { a(G.cyl8, lam({ color: 0x5ac83a, emissive: 0x1a3a08 }, 'energyCan'), 0, 0, 0, 0.06, 0.2, 0.06); a(G.cyl8, C(0xd8d8e0), 0, 0.105, 0, 0.055, 0.012, 0.055); a(G.box, C(0xf5c542), 0, 0.01, 0.061, 0.03, 0.1, 0.004, 0, 0, 0.4); break; }
      case 'water': { const b = C(0x4ab0f0), o = C(0xff8a1f); a(G.box, b, 0, 0.03, 0.04, 0.07, 0.08, 0.22); a(G.box, o, 0, -0.05, -0.04, 0.06, 0.14, 0.06, 0.25); a(G.cyl8, lam({ color: 0x9ccbec, transparent: true, opacity: 0.8 }, 'wgTank'), 0, 0.11, 0.0, 0.05, 0.08, 0.05); a(G.cyl6, o, 0, 0.04, 0.17, 0.018, 0.08, 0.018, Math.PI / 2); a(G.box, C(0x17111f), 0, -0.01, 0.02, 0.02, 0.05, 0.02, 0.4); break; }
      case 'firework': { a(G.cyl8, C(0xd8243a), 0, 0.02, 0, 0.05, 0.2, 0.05); a(G.cone8, C(0xf5c542), 0, 0.15, 0, 0.055, 0.08, 0.055); a(G.box, C(0xf1e8ff), 0, 0.02, 0.051, 0.06, 0.04, 0.002); a(G.cyl5, C(0x8a6a4a), 0.06, -0.15, 0, 0.008, 0.34, 0.008); a(G.box, C(0x17111f), 0, -0.09, 0, 0.01, 0.04, 0.01); break; }
      case 'popper': { a(G.cone8, C(0xf5c542), 0, 0, 0, 0.06, 0.18, 0.06, Math.PI); a(G.cyl8, C(0xff5a6e), 0, 0.09, 0, 0.065, 0.02, 0.065); a(G.box, C(0xf1e8ff), 0, -0.1, 0, 0.01, 0.06, 0.01); for (let i = 0; i < 3; i++) a(G.box, C([0x9be36b, 0x4ab0f0, 0xb18cff][i]), (i - 1) * 0.03, 0.105, 0, 0.02, 0.02, 0.02); break; }
      case 'sling': { const w = tmat(T.wood()); a(G.box, w, 0, -0.08, 0, 0.035, 0.18, 0.035); for (const sx of [-1, 1]) a(G.box, w, sx * 0.05, 0.05, 0, 0.03, 0.12, 0.03, 0, 0, -sx * 0.4); a(G.box, C(0xd8243a), 0, 0.09, 0, 0.16, 0.012, 0.012); break; }
      // паутина: банка с паучком внутри (крышка, паутинка на стекле)
      case 'web': { a(G.cyl12, lam({ color: 0xd8f0f0, transparent: true, opacity: 0.45, depthWrite: false }, 'jarGlass'), 0, 0, 0, 0.11, 0.22, 0.11); a(G.cyl12, C(0xb02a2a), 0, 0.12, 0, 0.115, 0.04, 0.115);
        a(G.sph, C(0x17111f), 0, -0.04, 0, 0.05, 0.04, 0.06); for (let i = 0; i < 3; i++) a(G.box, C(0xeee8f8), 0, 0.02, 0, 0.2, 0.006, 0.006, 0, i * 1.05, 0.2); break; }
      case 'cucumber': { const gr = lam({ map: T.cucumber() }, 'cuc2'); a(G.cyl8, gr, 0, 0, 0, 0.06, 0.26, 0.06, Math.PI / 2); for (const sz of [-0.13, 0.13]) a(G.sph, gr, 0, 0, sz, 0.06, 0.06, 0.06); a(G.box, C(0x6aa84f), 0, 0.05, 0, 0.02, 0.01, 0.2); break; }
      case 'bulb': { a(G.sph10, lam({ color: 0xfff6d0, emissive: 0x6a5a30 }, 'bulbItem'), 0, 0.04, 0, 0.08, 0.09, 0.08); a(G.cyl8, C(0xc8c8d8), 0, -0.06, 0, 0.04, 0.06, 0.04); a(G.cyl8, C(0x2b2533), 0, -0.1, 0, 0.025, 0.02, 0.025); break; }
      case 'pizza': { const bx = C(0xd8b888); a(G.box, bx, 0, 0, 0, 0.46, 0.07, 0.46); a(G.cyl12, tmat(T.pizzaTop()), 0, 0.04, 0, 0.21, 0.012, 0.21); a(G.box, tmat(T.sign('ПИЦЦА', '#d8243a', '#f1e8ff')), 0, 0.0, 0.232, 0.3, 0.05, 0.004); a(G.box, C(0x8a6a4a), 0, -0.036, 0, 0.47, 0.004, 0.47); break; }
      case 'rake': { const w = tmat(T.wood()), m = C(0x8a8d98); a(G.box, w, 0, 0.0, 0, 0.05, 0.05, 1.1); a(G.box, m, 0, 0, 0.55, 0.4, 0.04, 0.05); for (let i = 0; i < 6; i++) a(G.box, m, -0.17 + i * 0.07, -0.04, 0.58, 0.02, 0.08, 0.02); break; }
      case 'cushion': { const p = lam({ color: 0xff5a9e }, 'cushion'); a(G.sph10, p, 0, 0, 0, 0.2, 0.06, 0.2); a(G.cyl6, p, 0, 0, 0.22, 0.04, 0.08, 0.04, Math.PI / 2); break; }
      // сетемёт: короткий ствол-раструб, рукоять, свёрнутая сетка сверху
      case 'net': { a(G.cyl8, C(0x3a6a4a), 0, 0, 0.05, 0.07, 0.36, 0.07, Math.PI / 2); a(G.cone8, C(0x2b2533), 0, 0, 0.27, 0.11, 0.12, 0.11, -Math.PI / 2); a(G.box, C(0x2b2533), 0, -0.1, -0.06, 0.05, 0.16, 0.06, 0.3); a(G.sph, lam({ color: 0xe8e0c8 }, 'netRoll'), 0, 0.09, 0.02, 0.07, 0.05, 0.12); break; }
      // жетон: золотая звезда на синей «корочке»
      case 'badge': { a(G.box, C(0x2a3a7a), 0, 0, 0, 0.18, 0.02, 0.24); const gd = lam({ color: 0xf5c542, emissive: 0x6a4a00, emissiveIntensity: 0.5 }, 'badgeGold'); a(G.cyl8, gd, 0, 0.02, 0.03, 0.07, 0.015, 0.07); for (let i = 0; i < 5; i++) { const an = i / 5 * 6.28; a(G.cone4, gd, Math.cos(an) * 0.06, 0.02, 0.03 + Math.sin(an) * 0.06, 0.03, 0.01, 0.03, Math.PI / 2, 0, an); } break; }
      // перчатка-пружина: красная боксёрская перчатка на гармошке
      case 'glove': { const r = C(0xd8243a); a(G.sph10, r, 0, 0, 0.18, 0.13, 0.12, 0.14); a(G.sph, r, 0.1, 0.03, 0.13, 0.05, 0.06, 0.06); a(G.box, C(0xf1e8ff), 0, -0.02, 0.06, 0.12, 0.1, 0.04); for (let i = 0; i < 4; i++) a(G.box, C(0x8a8d98), 0, 0, -0.04 - i * 0.05, 0.1 - (i % 2) * 0.03, 0.02, 0.03); a(G.box, C(0x2b2533), 0, -0.04, -0.24, 0.05, 0.14, 0.06); break; }
      // пылесос: корпус-бочонок, шланг, раструб
      case 'vacuum': { a(G.cyl12, C(0xb18cff), 0, 0, -0.06, 0.13, 0.26, 0.13, Math.PI / 2); a(G.box, C(0x2b2533), 0, 0.14, -0.08, 0.04, 0.06, 0.2); a(G.cyl6, C(0x3a3440), 0, -0.02, 0.17, 0.04, 0.22, 0.04, Math.PI / 2); a(G.cone8, C(0x3a3440), 0, -0.02, 0.32, 0.09, 0.1, 0.06, -Math.PI / 2); a(G.cyl8, C(0xf1e8ff), 0, 0, -0.2, 0.1, 0.02, 0.1, Math.PI / 2); break; }
      default: a(G.box, C(0xc8a070), 0, 0, 0, 0.3, 0.3, 0.3);
    }
  });
}
export function addItem(type, x, y, z, ry = 0) {
  const def = CONFIG.items[type], g = build(type); W.group.add(g);
  const it = { type, def, g, pos: g.position, vel: new V3(), state: 'rest', home: { x, y, z, ry }, respawnT: 0, spin: new V3(), noHit: 0, outline: addOutline(g, 0.045, OUTLINE[rarityOf(type)]), rarity: rarityOf(type), ammo: def.ammo || 0, cd: 0 };
  g.rotation.y = ry;
  it.pos.set(x, y + (def.halfHeight??def.r), z);
  W.items.push(it); return it;
}
// Модель опирается на физическое дно предмета; используется только для выкладки.
export function restOnSurface(it){
  it.g.updateMatrixWorld(true);const bounds=new THREE.Box3(),inverse=it.g.matrixWorld.clone().invert(),matrix=new THREE.Matrix4();
  it.g.traverse(o=>{if(!o.isMesh||o.material.side===THREE.BackSide)return;o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(matrix.multiplyMatrices(inverse,o.matrixWorld)));});
  const offset=-(it.def.halfHeight??it.def.r)-bounds.min.y;if(Number.isFinite(offset))for(const child of it.g.children)child.position.y+=offset;return it;
}
// разбилось/утонуло — пропало до конца раунда (никакого возрождения на месте)
function vanish(it) {
  it.g.visible = false; it.state = 'gone'; it.respawnT = 0;
}
// eslint-disable-next-line no-unused-vars
function respawn(it) {
  const h = it.home; it.pos.set(h.x, h.y + it.def.r, h.z); it.vel.set(0, 0, 0); it.g.rotation.set(0, h.ry || 0, 0);
  it.g.visible = true; it.state = 'rest';
  puff(h.x, h.y + 0.3, h.z, { size: 0.5, life: 0.5, vy: 0.4 });
}

/* Попадания */
function hitActors(it, p, heavy) {
  const r = heavy ? 1.1 : 0.9;
  for(const a of npcList()){const cp=npcPosition(a);if(a===it.owner)continue;const d=cp.clone().add(new V3(0,a.kind==='dog'||a.type==='cat'?.4:.9,0)).sub(p),len=d.length();if((it.hitTarget===a||(!it.hitTarget&&raySolids(p,d.normalize(),len)>=len-.05))&&Math.hypot(cp.x-p.x,cp.z-p.z)<r&&p.y>cp.y-.3&&p.y<cp.y+(a.kind==='dog'||a.type==='cat'?.9:1.9))hitNPC(a,heavy,it.vel.x,it.vel.z);}
  for (const h of W.hitActors || []) h(it, p, heavy, r);
  scareBirds(p.x, p.z, heavy ? 5 : 3.5);
  impulsePushables(p.x, p.z, 0.6, heavy ? 4 : 1.5);
}
function impact(it, n, speed) {
  // жетон (v0.23): упал — из точки выбегает наряд и ловит ближайшего к ней соперника
  if (it.type === 'badge' && it.owner && !it.badgeDone) { it.badgeDone = true; it.state = 'gone'; it.g.visible = false; W.badgeLand && W.badgeLand(it.pos.clone(), it.owner); return; }
  const p = it.pos, t = it.type, gy = groundAt(p.x, p.z, 0.1, p.y + 0.3);
  // хрупкая мелочь: сильный удар — разбилось (осколки, звон), до конца раунда
  if (it.def.breaks && speed > it.def.breaks) { const glass = t === 'monitor' || t === 'dlamp' || t === 'mug';
    for (let i = 0; i < 9; i++) chunk(p.x, p.y + 0.1, p.z, [(Math.random() - 0.5) * 4, 2 + Math.random() * 2, (Math.random() - 0.5) * 4], { mat: col([0x2b2533, 0x9a9da8, t === 'pot' ? 0xc8643a : 0xd8d0c0, 0x3a3440][i % 4]), size: 0.07, sy: 0.6, life: 5 });
    if (glass) burst(p.x, p.y + 0.2, p.z, 8, { color: 0xc8e8ff, size: 0.08, speed: 3, up: 2 }); if (t === 'pot') burst(p.x, p.y, p.z, 8, { color: 0x6a4a2a, size: 0.12, speed: 2, up: 1.5 });
    sfx(glass ? 'glass' : 'wood', { at: p }); for (const h of W.hitHooks.slice()) h(it, p); hitActors(it,p,heavyHit(it,speed)); vanish(it); return; }
  for (const h of W.hitHooks.slice()) h(it, p);
  // Миссия могла принять реальный предмет. Дальше нельзя возвращать его в rest.
  if(it.state==='gone')return;
  hitBreakables(p, it.def.r + 0.12, [it.vel.x, it.vel.y, it.vel.z], it.def.mass);
  if (!it.football&&!(it.noHitT > 0)) hitActors(it, p, heavyHit(it,speed));
  if (it.def.tool && W.toolImpact && W.toolImpact(it, p, gy)) { sfx('imp', { at: p, v: 0.5, m: materialAt(p.x, p.y, p.z) }); return; }
  worldHit(p, speed * it.def.mass * 0.35, it.vel);
  if (t === 'can' && (it.shake || 0) > 0.5 && W.sodaBlast) { it.state = 'gone'; it.g.visible = false; W.sodaBlast(p.clone(), it.owner); return; }
  const v = Math.min(1.4, speed * it.def.mass * 0.08 + 0.3); if (t === 'can') sfx('can', { at: p, v }); sfx('imp', { at: p, v, m: materialAt(p.x, p.y, p.z) });
  const wall = Math.abs(n[1]) < 0.5;
  if(speed>6)actionEffect(materialAt(p.x,p.y,p.z)==='metal'?'metal':it.type==='bottle'?'glass':'hit',p,Math.min(1.3,speed*.06));
  // следы ударов: брызги на стене, искры и пыль от тяжёлого
  if (wall && speed > 8 && it.def.heavy) { burst(p.x, p.y, p.z, 5, { color: 0xffd25c, size: 0.08, speed: 4, up: 1.5, g: 14, life: 0.35, grow: 0 }); burst(p.x, p.y, p.z, 3, { color: 0x8a7e90, size: 0.35, speed: 0.8, up: 0.4, g: 1, life: 0.7, grow: 1.4 }); }
  if (it.def.heavy && speed > 10) shake(0.12);
  // попал в воду: всплеск; тяжёлое тонет, лёгкое остаётся плавать
  if (n[1] > 0.5 && zoneAt(p.x, p.z, gy, 'water')) {
    splash(p.x, gy, p.z, Math.min(1.5, 0.4 + speed * it.def.mass * 0.06)); sfx('splash', { at: p });
    if (t === 'balloon') { vanish(it); return; }
    if (it.def.sinks) { it.state = 'sink'; it.sinkT = 1.2; it.vel.set(0, -0.6, 0); return; }
    it.vel.set(it.vel.x * 0.3, 0, it.vel.z * 0.3); it.state = 'rest'; it.floatY = gy; return;
  }
  if (t === 'balloon') {
    sfx('splash', { at: p });
    burst(p.x, p.y, p.z, 8, { color: 0x6ab8f0, size: 0.28, speed: 3, up: 2.5 });
    splatter(p, it.vel, 0x4a90d0, 34, 1.1, { owner: it.owner });
    addZone('puddle', { c: [p.x, p.z, 1.15] }, gy, { expires: 9 });
    { const d = decal(T.puddle(), p.x, gy, p.z, 2.4, 9, 0xbfe0ff); d.material.opacity = 0.75; }
    vanish(it);
  } else if (t === 'tomato') {
    burst(p.x, p.y, p.z, 5, { color: 0xd8301a, size: 0.22, speed: 2.5 });
    splatter(p, it.vel, 0xb8200e, 24, 0.9, { owner: it.owner });
    vanish(it);
  } else if (t === 'pumpkin') {
    const m = tmat(T.pumpkin());
    for (let i = 0; i < 9; i++) chunk(p.x, p.y, p.z, [(Math.random() - 0.5) * 5 + it.vel.x * 0.15, 2 + Math.random() * 3, (Math.random() - 0.5) * 5 + it.vel.z * 0.15], { mat: m, size: 0.18 + Math.random() * 0.1, life: 2.5 });
    burst(p.x, p.y, p.z, 6, { color: 0xffd25c, size: 0.2, speed: 2 });
    splatter(p, it.vel, 0xe8731a, 20, 0.9, { owner: it.owner });
    vanish(it);
  } else if (t === 'trash' && speed > 6) {
    // пакет рвётся: бумажки, банки, пятно
    const cols = [0xd8d0c0, 0x8a8d98, 0xc83a3a, 0x6aa84f, 0xf5c542];
    for (let i = 0; i < 10; i++) chunk(p.x, p.y, p.z, [(Math.random() - 0.5) * 5 + it.vel.x * 0.2, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 5 + it.vel.z * 0.2], { mat: col(cols[i % cols.length]), size: 0.1 + Math.random() * 0.06, sy: 0.4, life: 5 });
    for (let i = 0; i < 3; i++) chunk(p.x, p.y, p.z, [(Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3], { mat: tmat(T.trashBag()), size: 0.22, sy: 0.15, life: 5 });
    splatter(p, it.vel, 0x3a3020, 18, 0.8, { owner: it.owner });
    burst(p.x, p.y, p.z, 5, { color: 0x6a6a5a, size: 0.35, speed: 1.6, up: 1, g: 2, grow: 1.2, life: 0.8 });
    vanish(it);
  } else if (t === 'chair' && speed > 9) {
    const m = tmat(T.wood());
    for (let i = 0; i < 6; i++) chunk(p.x, p.y, p.z, [(Math.random() - 0.5) * 5, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 5], { mat: m, size: 0.14, sx: 3, sy: 0.4, sz: 0.8, life: 2.5 });
    burst(p.pos ? p.x : p.x, p.y, p.z, 5, { color: 0x8a6a4a, size: 0.35, speed: 1.5 });
    vanish(it);
  } else if (t === 'brick' && speed > 12) {
    const m = tmat(T.brickItem());
    for (let i = 0; i < 6; i++) chunk(p.x, p.y, p.z, [(Math.random() - 0.5) * 4, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 4], { mat: m, size: 0.1 + Math.random() * 0.06, life: 2 });
    burst(p.x, p.y, p.z, 6, { color: 0xa06a5a, size: 0.25, speed: 1.5 });
    vanish(it);
  } else {
    // мяч и не разбившийся кирпич отскакивают
    const e = it.def.bounce, vn = it.vel.x * n[0] + it.vel.y * n[1] + it.vel.z * n[2];
    it.vel.x -= (1 + e) * vn * n[0]; it.vel.y -= (1 + e) * vn * n[1]; it.vel.z -= (1 + e) * vn * n[2];
    const fr = 1 - Math.min(0.7, it.def.mass * 0.25); it.vel.x *= fr; it.vel.z *= fr;
    puff(p.x, p.y - it.def.r * 0.5, p.z, { size: 0.35, life: 0.4, vy: 0.3 });
    it.state = 'rest'; it.landT = 3;
  }
}

// шлейф: короткие пиксельные клубки за летящим предметом
const TRAIL = { balloon: 0x8ac8f0, tomato: 0xff6a4a, pumpkin: 0xffb04a, brick: 0xc89080, ball: 0xf5c542, can: 0xff5a6e, slipper: 0xff7aa8, banana: 0xf5d442, paint: 0x4ab0f0, firework: 0xffd25c };
function trail(it, dt) {
  it.trT = (it.trT || 0) - dt; if (it.trT > 0) return; it.trT = 0.025;
  puff(it.pos.x, it.pos.y, it.pos.z, { size: it.def.r * 0.9, grow: -0.6, life: 0.22, vy: 0, vx: 0, vz: 0, color: TRAIL[it.type] ?? 0xd8d0e4, opacity: 0.6 });
}
function simulate(it, dt, flying) {
  if (flying) trail(it, dt);
  const r = it.def.r, ry=it.def.halfHeight??r, p = it.pos, v = it.vel;
  const steps = Math.min(6, Math.ceil(v.length() * dt / (r * 0.8)) || 1), h = dt / steps;

  for (let s = 0; s < steps; s++) {
    const old=p.clone(),next=old.clone();integrateProjectile(next,v,h,it.def.drag);const edge=boundaryHit(old,next,r),dv=next.clone().sub(old),len=dv.length(),wall=len?raySolids(old,dv.clone().normalize(),len):Infinity;
    if(flying&&!it.football&&!(it.noHitT>0)){const hit=sweepActors(old,next,r,it.owner);if(hit&&hit.t*len<wall){p.lerpVectors(old,next,hit.t);it.hitTarget=hit.actor;impact(it,[0,1,0],v.length());it.hitTarget=null;return;}}
    p.copy(next);if(wall<len){p.copy(old).addScaledVector(dv,Math.max(0,wall-.015)/Math.max(.001,len));if(flying){impact(it,[0,1,0],v.length());return;}}
    basketCrossing(it,old,p);
    if(edge){if(flying){impact(it,edge,v.length());return;}const vn=v.x*edge[0]+v.z*edge[2];if(vn<0){v.x-=(1+it.def.bounce)*vn*edge[0];v.z-=(1+it.def.bounce)*vn*edge[2];}}
    const gy = groundAt(p.x, p.z, r * 0.5, p.y + r * 0.5);
    if (p.y - ry < gy) {
      p.y = gy + ry;
      if (flying) { const sp = v.length(); impact(it, [0, 1, 0], sp); return; }
      if (v.y < -1.5) v.y = -v.y * it.def.bounce; else v.y = 0;
    }
    const hit = solidHit(p, r);
    if (hit) {
      p.x += hit.n[0] * hit.depth; p.y += hit.n[1] * hit.depth; p.z += hit.n[2] * hit.depth;
      if (flying) { impact(it, hit.n, v.length()); return; }
      const vn = v.x * hit.n[0] + v.z * hit.n[2]; if (vn < 0) { v.x -= 1.6 * vn * hit.n[0]; v.z -= 1.6 * vn * hit.n[2]; }
    }
  }
  if (!flying) {
    const onG = p.y - ry <= groundAt(p.x, p.z, r * 0.5, p.y) + 0.02;
    // трение: круглые катятся, кирпич быстро останавливается
    if (onG) { const f = Math.exp(-dt * ({ ball: 0.9, bigpumpkin: 0.8, pumpkin: 1.6, balloon: 2, tomato: 2.5, brick: 7, chair: 6, cone: 3, trash: 5, litter: 3, parcel: 6, duck: 2, cucumber: 2.5 }[it.type] ?? 5)); v.x *= f; v.z *= f; }
    if (['ball', 'bigpumpkin', 'pumpkin', 'balloon', 'tomato', 'litter', 'can', 'duck', 'cucumber', 'bulb'].includes(it.type)) { it.g.rotation.x += v.z * dt / r; it.g.rotation.z -= v.x * dt / r; }
  } else { const k = Math.min(3, 0.6 + v.length() / 8); it.g.rotation.x += dt * 8 * k; it.g.rotation.y += dt * 5 * k; }
}

export function updateItems(dt, pl) {
  for (const it of W.items) {
    if (it.state === 'gone' || it.state === 'placed') continue;
    if (it.state === 'held') continue;
    if (it.state === 'fly') { if (it.noHitT > 0) it.noHitT -= dt; simulate(it, dt, true); continue; }
    if (it.state === 'sink') { it.sinkT -= dt; it.pos.y -= dt * 0.5; it.g.rotation.x += dt; if (Math.random() < dt * 4) ripple(it.pos.x, it.pos.y + 0.4, it.pos.z, 0.4, 0.6); if (it.sinkT <= 0) vanish(it); continue; }
    // плавает: покачивается и медленно дрейфует
    if (it.floatY !== undefined && it.state === 'rest') {
      if (zoneAt(it.pos.x, it.pos.z, it.floatY, 'water')) { it.pos.y = it.floatY + it.def.r * 0.6 + Math.sin(performance.now() * 0.003 + it.home.x) * 0.04; it.g.rotation.z = Math.sin(performance.now() * 0.002 + it.home.z) * 0.15;
        it.pos.x += (it.vel.x + Math.sin(performance.now() * 0.0005 + it.home.x) * 0.15) * dt; it.pos.z += (it.vel.z + Math.cos(performance.now() * 0.0004) * 0.15) * dt; it.vel.multiplyScalar(Math.exp(-dt));
        if (Math.random() < dt * 0.6) ripple(it.pos.x, it.floatY, it.pos.z, 0.5, 1); continue; }
      it.floatY = undefined;
    }
    // лежит: мяч и упавшие предметы живут по физике
    const foot=it.pos.y-(it.def.halfHeight??it.def.r),stable=Math.abs(foot-CONFIG.base)<.12&&it.vel.lengthSq()<.01;
    it.floorProbe=(it.floorProbe||0)-dt;
    if(!stable||it.floorProbe<=0||it.floorY==null){it.floorY=groundAt(it.pos.x,it.pos.z,it.def.r*.5,it.pos.y);it.floorProbe=.18;}
    const moving = it.vel.lengthSq() > 0.01 || foot > it.floorY + 0.05;
    if (moving) simulate(it, dt, false);
    if (pl && pl.held !== it) {
      const dx = it.pos.x - pl.pos.x, dz = it.pos.z - pl.pos.z, d = Math.hypot(dx, dz), m = it.def.r + pl.r;
      if (d < m && d > 1e-3 && it.pos.y - it.def.r < pl.pos.y + 0.6 && it.pos.y > pl.pos.y - 0.2) {
        const nx = dx / d, nz = dz / d, k = 1 / Math.sqrt(it.def.mass);
        it.pos.x += nx * (m - d); it.pos.z += nz * (m - d);
        const vn = pl.vel.x * nx + pl.vel.z * nz;
        if (vn > 0.5) { it.vel.x = nx * vn * 0.8 * k; it.vel.z = nz * vn * 0.8 * k; it.vel.y = Math.min(3.5, vn * 0.35 * k); }
      }
    }
  }
  for (let i = W.zones.length - 1; i >= 0; i--) { const z = W.zones[i]; if (z.expires !== undefined) { z.expires -= dt; if (z.expires <= 0) W.zones.splice(i, 1); } }
}

export function nearestItem(p, r) {
  let best = null, bd = r;
  for (const it of W.items) {
    if (it.noPickup||(it.state !== 'rest' && it.state !== 'placed') || (it.boxed && !it.boxed.open)) continue;
    const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
    if (d < bd && it.pos.y > p.y - 0.6 && it.pos.y < p.y + 1.8) { bd = d; best = it; }
  }
  return best;
}
export function pickUp(it) { if(it.noPickup||it.taken||it.state==='gone')return false; it.onPickup?.(); it.floatY = undefined; it.trail = 0; it.state = 'held'; it.vel.set(0, 0, 0); it.g.rotation.set(0, 0, 0); }
export function drop(it, x, y, z) { if(it.taken)return;it.state = 'rest'; it.pos.set(x, y + (it.def.halfHeight??it.def.r) + 0.05, z); it.vel.set(0, 0, 0); }

/* Расчёт броска по дуге к точке прицела */
export function throwVelocity(from, target, charge, def) {
  const dx = target.x - from.x, dz = target.z - from.z, dist = Math.hypot(dx, dz) || 0.001;
  // вес решает всё: лёгкое (тапок, помидор) летит далеко, быстро и почти прямо — точный бросок;
  // тяжёлое (тыква, кирпич) — недалеко, медленно и высоким навесом
  const heavy = Math.max(0, Math.min(1, (def.mass - 0.4) / 2.4)), mk = 1.35 - heavy * 0.9;
  const { minRange, maxRange } = CONFIG.throw, range = (minRange + (maxRange - minRange) * charge) * mk;
  // цель дальше силы броска — летим к точке на луче прицела (а не «в землю»): вверх так вверх (моль, окна, крыши)
  if (dist > range + 0.01) { const k = range / dist; target = { x: from.x + dx * k, y: from.y + (target.y - from.y) * k, z: from.z + dz * k }; return throwVelocity(from, target, charge, def); }
  const d = dist;
  const T = 0.14 + d * (0.018 + heavy * 0.04) + heavy * 0.35, vh = d / T, dy = target.y - from.y;
  // поправка на сопротивление воздуха, чтобы лёгкое прилетало в прицел
  // v0.22→23: точное решение с сопротивлением воздуха (v' = −k·v − g), чтобы предмет прилетал ровно в точку прицела
  const k = def.drag || 0;
  if (k < 1e-4) return new V3(dx / dist * vh, (dy + 0.5 * GRAV * T * T) / T, dz / dist * vh);
  const f = k / (1 - Math.exp(-k * T)), vx = dist * f, vy = (dy + GRAV * T / k) * f - GRAV / k;
  return new V3(dx / dist * vx, vy, dz / dist * vx);
}
export function launch(it, from, vel) { if(it.taken)return;it.throwFrom=from.clone();it.hoopScored=false;it.throwId=(it.throwId||0)+1; it.state = 'fly'; it.pos.copy(from); it.vel.copy(vel); it.g.visible = true; }
const predicted=[];
export function predict(from,vel,out,n,def,end){
 const p=from.clone(),v=vel.clone(),h=1/60,r=def.r,ry=def.halfHeight??r;let count=0,landed=false;if(end)end.visible=false;
 for(let i=0;i<600;i++){const old=p.clone();integrateProjectile(p,v,h,def.drag);const edge=boundaryHit(old,p,r),dv=p.clone().sub(old),len=dv.length(),wall=len?raySolids(old,dv.clone().normalize(),len):Infinity;
  if(wall<len)p.copy(old).addScaledVector(dv,Math.max(0,wall-.015)/len);const gy=groundAt(p.x,p.z,r*.5,p.y+r*.5),hit=solidHit(p,r);
  if(p.y-ry<gy){p.y=gy+ry;landed=true;}if(edge||wall<len||hit)landed=true;
  (predicted[count]||(predicted[count]=new V3())).copy(p);count++;
  if(landed){if(end){end.position.copy(p);end.visible=true;}break;}
 }
 return placeArcDots(from,predicted,count,out,n);
}

// цвет письма задаёт миссия «Почтальон» перед addItem
let _lc = 0xd8243a; export const setLetterColor = c => { _lc = c; }; const it_letterC = () => _lc;
import {SNACKS,snackModel} from './snacks.js';
import {radioModel} from './radio.js';
