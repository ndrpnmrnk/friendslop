import {pantsTexture} from '../characters/mammoth.js';
import {raceEvent} from './race.js';
import {footballEvent} from './football.js';
import { eliminate } from './drone.js';
import { raySolids } from '../world/physics.js';
import { THREE, V3, G, mesh, col, lam, tmat, compose, alphaMat } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addItem, launch } from './items.js';
import { LIGHTMAT, LIGHTDIM, WATERMAT } from '../world/builder.js';
import { UG } from '../world/underground.js';
import { splash, burst, puff, smokeRing } from '../world/particles.js';
import { groundAt, isFree } from '../world/physics.js';
import { actors, shove, knockDown, dropHeld } from './actors.js';
import { spawnTool, explode } from './tools.js';
import { iconCanvas } from '../ui/icons.js';
import { CONFIG } from '../config.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';
import { shake, hitFreeze } from './worldfx.js';

/* События раунда.
   Малые (раз в ~минуту, 20 с): тыквопад, темнота с фонариком, потоп в тоннелях.
   Общее (одно за раунд, около середины): царь горы, мотылёк в трусах, тыквенный футбол — участвуют все,
   объявляется баннером, видно стрелкой и на мини-карте. Пока идёт общее событие, таймеры миссий стоят. */
/* Ритм раунда: 0:00–1:00 — спокойно, только миссии; 1:00–1:45 — общее событие; 1:45–3:00 — финальный рывок, очки ×2.
   Малые события (тыквопад, темнота, потоп) сейчас не запускаются. */
export const PHASE = { event: 120, resume: 180, final: 225, warn: 5 };
export const phaseOf = t => t < PHASE.event ? 'calm' : t < PHASE.resume ? 'event' : t < PHASE.final ? 'calm' : 'final';
export const EV = { t: 0, next: 1e9, cur: null, left: 0, big: null, bigAt: 120, bigDone: false };
const DUR = 20;
let ctx = null;
export function initEvents(c) { ctx = c; }
export function resetEvents() { if (EV.cur) stopEvent(); if (EV.big) stopBig(); EV.t = 0; EV.next = 1e9; EV.cur = null; EV.bigAt = PHASE.event; EV.bigDone = false; W.eventBot = null; }

const EVENTS = {
  pumpkins: { title: 'ТЫКВЕННЫЙ ДОЖДЬ', sub: 'С неба падают тыквы!',
    start(s) { s.spawnT = 0; s.items = []; },
    update(s, dt) {
      s.spawnT -= dt; if (s.spawnT > 0 || s.items.length > 14) return; s.spawnT = 0.9 + Math.random() * 0.6;
      const P = ctx.player(), a = Math.random() * 6.28, r = 3 + Math.random() * 11, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
      const it = addItem('pumpkin', x, P.pos.y + 16, z, 0); it.def = { ...it.def, respawn: 0 }; launch(it, new V3(x, P.pos.y + 16, z), new V3((Math.random() - 0.5) * 2, -4, (Math.random() - 0.5) * 2));
      s.items.push(it);
    },
    stop(s) { for (const it of s.items) if (it.state === 'rest') { it.state = 'gone'; it.g.visible = false; } },
  },
  dark: { title: 'ОТКЛЮЧИЛИ СВЕТ', sub: 'Фонари погасли. У тебя фонарик',
    start(s) { const L = ctx.lights(); s.h = L.hemi.intensity; s.sun = L.sun.intensity; s.fog = L.scene.fog.color.getHex(); L.flash.intensity = 0; LIGHTMAT().visible = false; LIGHTDIM().visible = false; s.k = 0; },
    update(s, dt) { const L = ctx.lights(); s.k = Math.min(1, s.k + dt * 1.5); L.hemi.intensity = s.h * (1 - 0.6 * s.k); L.sun.intensity = s.sun * (1 - 0.75 * s.k); L.flash.intensity = 60 * s.k; L.sky.setDim(s.k);
      L.scene.fog.color.setHex(0x120c1c); L.scene.background.setHex(0x120c1c); },
    stop(s) { const L = ctx.lights(); L.hemi.intensity = s.h; L.sun.intensity = s.sun; L.flash.intensity = 0; L.scene.fog.color.setHex(s.fog); L.scene.background.setHex(s.fog); LIGHTMAT().visible = true; LIGHTDIM().visible = true; L.sky.setDim(0); },
  },
  flood: { title: 'ПОТОП В ТОННЕЛЯХ', sub: 'Под дорогами вода по колено',
    start(s) {
      s.meshes = []; s.zones = []; s.h = 0;
      for (const [x0, z0, x1, z1] of W.floodRects) { const m = mesh(G.box, WATERMAT(), (x0 + x1) / 2, UG.floor, (z0 + z1) / 2, x1 - x0, 0.04, z1 - z0, W.group); s.meshes.push(m);
        const zn = { type: 'water', r: [x0, z0, x1, z1], y: UG.floor }; W.zones.push(zn); s.zones.push(zn); }
      const P = ctx.player(); if (P.pos.y < UG.floor + 1) splash(P.pos.x, P.pos.y, P.pos.z, 1);
    },
    update(s, dt) { s.h = Math.min(0.45, s.h + dt * 0.15); for (const m of s.meshes) m.position.y = UG.floor + s.h; },
    stop(s) { for (const m of s.meshes) W.group.remove(m); W.zones = W.zones.filter(z => !s.zones.includes(z)); },
  },
};

/* ================= общие события ================= */
const award = (a, pts, at) => ctx.award && ctx.award(a, pts, at);
const BIG = {
  // Царь горы: светящийся круг на крыше/башне/контейнере; очки за каждую секунду внутри, соперников можно сталкивать
  hill: { dur: 30,
    start(s) {
      // крыша, на которую ведёт лестница снаружи (чтобы добраться могли все, и боты тоже)
      const reach = z => W.ladders.some(l => Math.abs(l.y1 - 0.12 - z.y) < 0.7 && Math.hypot((l.x0 + l.x1) / 2 - (z.x0 + z.x1) / 2, (l.z0 + l.z1) / 2 - (z.z0 + z.z1) / 2) < 14 && l.y0 < 1);
      const P = ctx.player(), all = W.missionZones.filter(z => z.type === 'roof' && z.x1 - z.x0 > 2.5 && z.z1 - z.z0 > 1.5), ok = all.filter(reach), zs = (ok.length ? ok : all).sort((a, b) => dist(a, P) - dist(b, P));
      const z = zs[Math.min(zs.length - 1, 1 + ((Math.random() * 3) | 0))] || W.missionZones[0];
      s.x = (z.x0 + z.x1) / 2; s.z = (z.z0 + z.z1) / 2; s.y = z.y; s.r = Math.min(2.4, (z.x1 - z.x0) / 2, (z.z1 - z.z0) / 2 + 0.3);
      s.g = new THREE.Group(); s.g.position.set(s.x, s.y, s.z); W.group.add(s.g);
      s.ring = mesh(new THREE.RingGeometry(0.92, 1, 32), new THREE.MeshBasicMaterial({ color: 0xf5c542, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }), 0, 0.05, 0, s.r, s.r, 1, s.g); s.ring.rotation.x = -Math.PI / 2;
      s.disc = mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0xf5c542, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), 0, 0.04, 0, s.r, s.r, 1, s.g); s.disc.rotation.x = -Math.PI / 2;
      s.beam = mesh(G.beam, new THREE.MeshBasicMaterial({ color: 0xf5c542, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }), 0, 10, 0, s.r * 0.98, 20, s.r * 0.98, s.g);
      s.flag = compose('hillFlag', a => { a(G.cyl6, col(0x2b2533), 0, 1.2, 0, 0.04, 2.4, 0.04); a(G.box, lam({ map: T.awning('#ff8a1f', '#f5c542'), side: THREE.DoubleSide }, 'hillFlag'), 0.35, 2.1, 0, 0.7, 0.45, 0.02); }); s.g.add(s.flag);
      s.acc = new Map(); s.tick = 0;
    },
    target: s => new V3(s.x, s.y, s.z),
    update(s, dt, t) {
      s.ring.scale.setScalar(s.r * (1 + Math.sin(t * 5) * 0.03)); s.flag.rotation.y = Math.sin(t * 1.5) * 0.4; s.tick -= dt;
      let king = null;
      for (const a of actors()) { if (a.hidden) continue; if (Math.hypot(a.pos.x - s.x, a.pos.z - s.z) < s.r && Math.abs(a.pos.y - s.y) < 1.2) {
        const v = (s.acc.get(a) || 0) + dt; s.acc.set(a, v); king = king || a;
        if (Math.floor(v) > Math.floor(v - dt)) { award(a, 10, a.pos); if (a === ctx.player()) sfx('hill'); } } }
      s.disc.material.color.setHex(king ? (king === ctx.player() ? 0x9be36b : 0xff5a6e) : 0xf5c542);
      if (s.tick <= 0) { s.tick = 0.15; puff(s.x + (Math.random() - 0.5) * s.r * 2, s.y + 0.2, s.z + (Math.random() - 0.5) * s.r * 2, { color: 0xf5c542, size: 0.15, vy: 1.6, life: 0.8, grow: 0 }); }
      return null;
    },
    bot(s, b) { return { x: s.x + (Math.random() - 0.5) * s.r, y: s.y, z: s.z + (Math.random() - 0.5) * s.r, kind: 'event', near: s.r * 0.6 }; },
    stop(s) { W.group.remove(s.g); },
    info: s => { const v = s.acc.get(ctx.player()) || 0; return `${Math.floor(v) * 10}`; },
  },

  // Мотылёк в трусах: кружит и пикирует, с неба падают тапки — кидай в него; очки за попадание и бонус за последнее
  moth: { dur: 45,
    start(s) {
      const P = ctx.player(); s.c = new V3(P.pos.x, P.pos.y, P.pos.z); s.hp = 12; s.max = 12; s.ang = 0; s.y = P.pos.y + 6; s.dive = null; s.diveT = 3; s.slipT = 0; s.hitCD = 0;
      s.g = new THREE.Group(); W.group.add(s.g); W.keep.push(s.g);
      const fur = lam({ map: T.mothFur() }, 'mothFur');
      s.body = compose('mothBody', a => { a(G.sph10, fur, 0, 0, 0, 0.55, 0.6, 0.9);for(let i=0;i<4;i++){a(G.sph10,fur,0,-.04-i*.03,-.30-i*.22,.49-i*.08,.43-i*.06,.25);}a(G.sph10,fur,0,.18,.55,.58,.47,.40); a(G.sph10, fur, 0, 0.25, 0.8, 0.45, 0.42, 0.42);
        for (const sx of [-1, 1]) { a(G.sph10, col(0x17111f), sx * 0.2, 0.36, 1.12, 0.14, 0.16, 0.1); a(G.box, col(0xf1e8ff), sx * 0.24, 0.42, 1.2, 0.04, 0.05, 0.02); a(G.cyl5, col(0x6a5a4a), sx * 0.18, 0.75, 1.0, 0.025, 0.6, 0.025, 0.5, 0, sx * -0.4);a(G.sphL,fur,sx*.31,1.04,1.13,.15,.06,.10,0,0,-sx*.4); a(G.box, fur, sx * 0.3, 1.0, 1.2, 0.18, 0.06, 0.06, 0, 0, sx * 0.4); }
        for (const sx of [-1, 1]) for (const k of [0.3, -0.1]) a(G.cyl5, col(0x4a3a2e), sx * 0.45, -0.45, k + 0.2, 0.03, 0.5, 0.03, 0.4, 0, sx * 0.6); }); s.g.add(s.body);
      s.pants=new THREE.Group();s.pants.position.set(0,-.22,-.42);s.g.add(s.pants);s.pants.add(compose('mothUndies30',a=>{const m=lam({map:pantsTexture(),flatShading:true},'mothPants30');a(G.sph10,m,0,-.05,0,.54,.36,.60);a(G.cyl12,col(0xe8d8be),0,.16,0,.53,.06,.56);for(const x of [-.25,.25])a(G.cyl8,col(0xebc4d3),x,-.25,0,.22,.07,.40);}));s.prev=new V3();s.g.position.set(s.c.x+7,s.y,s.c.z);
      const wingM = lam({ map: T.mothWing(), side: THREE.DoubleSide, alphaTest: 0.4 }, 'mothWing');
      s.wings = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.35, 0.3, 0.1); s.g.add(p); const w = mesh(G.plane, wingM, sx * 1.3, 0, 0, 2.6, 2.0, 1, p); w.rotation.x = -Math.PI / 2; w.scale.x *= sx; return p; });
      // полоска здоровья
      s.bar = document.createElement('canvas'); s.bar.width = 64; s.bar.height = 10; s.barT = new THREE.CanvasTexture(s.bar); s.barT.magFilter = THREE.NearestFilter;
      s.hpS = new THREE.Sprite(new THREE.SpriteMaterial({ map: s.barT, depthTest: false })); s.hpS.scale.set(2.4, 0.38, 1); s.hpS.renderOrder = 11; W.group.add(s.hpS);
      drawBar(s); W.moth = { g: s.g, hitAt:(p,dmg,owner)=>{if(s.g.position.distanceTo(p)<1.7)hitMoth(s,p,dmg,owner);} }; sfx('moth', { v: 1 });
    },
    target: s => s.g.position,
    update(s, dt, t) {
      s.hitCD -= dt;s.prev.copy(s.g.position);
      // полёт: круги над районом, иногда пике на кого-нибудь
      if (s.dead) { s.g.position.y -= dt * 6; s.g.rotation.z += dt * 6; s.hpS.visible = false; if (s.g.position.y < s.c.y) { burst(s.g.position.x, s.c.y + 0.5, s.g.position.z, 24, { color: 0xb8a890, size: 0.3, speed: 4, up: 3 }); smokeRing(s.g.position.x, s.c.y + 0.1, s.g.position.z, 12, { speed: 3 }); shake(0.3); return 'end'; } return null; }
      if (!s.dive) { s.ang += dt * 0.5; const R = 7; const tx = s.c.x + Math.cos(s.ang) * R, tz = s.c.z + Math.sin(s.ang) * R, ty = s.y + Math.sin(t * 1.3) * 0.8;
        s.g.position.x += (tx - s.g.position.x) * Math.min(1, dt * 2); s.g.position.z += (tz - s.g.position.z) * Math.min(1, dt * 2); s.g.position.y += (ty - s.g.position.y) * Math.min(1, dt * 2);
        s.diveT -= dt; if (s.diveT <= 0) { const list = actors().filter(a => !a.hidden && Math.hypot(a.pos.x - s.c.x, a.pos.z - s.c.z) < 16); const v = list[(Math.random() * list.length) | 0]; if (v) { s.dive = { v, t: 0, from: s.g.position.clone() }; sfx('moth', { at: s.g.position }); } s.diveT = 4 + Math.random() * 3; } }
      else { const d = s.dive; d.t += dt; const tgt = d.v.pos.clone().setY(d.v.pos.y + 1.0), k = Math.min(1, d.t / 1.1);
        if (k < 1) s.g.position.lerpVectors(d.from, tgt, k * k);
        else { s.g.position.y += dt * 8; if (d.t > 2.0) s.dive = null; }
        if (!d.hit && s.g.position.distanceTo(tgt) < 1.3) { d.hit = true; shove(d.v, d.v.pos.x - d.from.x, d.v.pos.z - d.from.z, 7, 5, true); voice(d.v.ch, 'hurt', d.v.pos); sfx('hit', { at: d.v.pos }); } }
      // курс и взмахи крыльев
      const motion=s.g.position.clone().sub(s.prev);if(motion.lengthSq()>.00001)s.g.lookAt(s.g.position.clone().add(motion));s.g.rotation.z=Math.sin(t*.7)*.10;s.pants.rotation.x=Math.sin(t*6)*.07;s.pants.scale.set(1+Math.sin(t*8)*.035,1-Math.sin(t*8)*.05,1);
      const flap = Math.sin(t * (s.dive ? 22 : 12)) * 0.7; s.wings[0].rotation.z = flap; s.wings[1].rotation.z = -flap;s.wings[0].rotation.y=.15+Math.cos(t*12)*.06;s.wings[1].rotation.y=-.15-Math.cos(t*12)*.06;
      s.hpS.position.copy(s.g.position).add(new V3(0, 2.0, 0));
      // тапки падают с неба вокруг
      s.slipT -= dt; if (s.slipT <= 0) { s.slipT = 1.0 + Math.random() * 0.6; const P = ctx.player(), a = Math.random() * 6.28, r = 2 + Math.random() * 8;
        const x = (Math.random() < 0.6 ? P.pos.x : s.c.x) + Math.cos(a) * r, z = (Math.random() < 0.6 ? P.pos.z : s.c.z) + Math.sin(a) * r, gy = groundAt(x, z, 0.2, P.pos.y + 3);
        if (Math.abs(gy - P.pos.y) < 4) { const it = spawnTool(x, gy + 12, z, false, 'slipper'); it.vel.set(0, -8, 0); } }
      // попадания брошенным
      for (const it of W.items) { if (it.state !== 'fly' || it.mothHit) continue; if (it.pos.distanceTo(s.g.position) < 1.5) { it.mothHit = true; hitMoth(s, it.pos, it.type === 'slipper' ? 1 : 0.5, it.owner); it.vel.multiplyScalar(-0.3); } }
      for (const it of W.items) if (it.state !== 'fly') it.mothHit = false;
      return null;
    },
    bot(s, b) {
      if (b.held) return { who: { pos: s.g.position.clone().setY(s.g.position.y - 1), vel: new V3() }, kind: 'eventThrow', near: 40 };
      let best = null, bd = 14; for (const it of W.items) if (it.state === 'rest' && it.type === 'slipper') { const d = Math.hypot(it.pos.x - b.pos.x, it.pos.z - b.pos.z); if (d < bd) { bd = d; best = it; } }
      return best ? { x: best.pos.x, y: best.pos.y - 0.14, z: best.pos.z, kind: 'fetch', it: best, near: 1.1 } : null;
    },
    stop(s) { W.group.remove(s.g); W.group.remove(s.hpS);s.barT.dispose();s.hpS.material.dispose(); W.moth = null; },
    info: s => `${Math.max(0, Math.ceil(s.hp))}/${s.max}`,
  },

  football:footballEvent(()=>ctx,award,makePitch),
  race:raceEvent({player:()=>ctx.player(),prepareRace:()=>ctx.prepareRace?.()},award),

  /* Зомби-заражение (как в Move or Die): один — зомби, касанием заражает. Люди отбиваются: попал предметом
     или ударом — зомби на 2 с падает. Зомби — +30 за заражение; кто дожил человеком до конца — +120. */
  zombie: { dur: 40,
    start(s) { const all = actors(); s.z = new Set([all[(Math.random() * all.length) | 0]]); s.first = [...s.z][0]; s.cd = new Map(); s.marks = new Map(); s.puffT = 0; for (const a of s.z) infect(s, a, null); },
    target(s) { const P = ctx.player(), me = s.z.has(P), list = actors().filter(a => a !== P && s.z.has(a) !== me); list.sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos)); return (list[0] || P).pos; },
    update(s, dt, t) {
      for (const [a, v] of s.cd) s.cd.set(a, v - dt);
      for (const z of s.z) { if (z.stun > 0 || (s.cd.get(z) || 0) > 0) continue;
        for (const h of actors()) { if (s.z.has(h) || h.hidden) continue; if (Math.hypot(h.pos.x - z.pos.x, h.pos.z - z.pos.z) < 0.95 && Math.abs(h.pos.y - z.pos.y) < 1.2) { infect(s, h, z); s.cd.set(z, 1); break; } } }
      s.puffT -= dt; if (s.puffT <= 0) { s.puffT = 0.25; for (const z of s.z) puff(z.pos.x, z.pos.y + 1.4, z.pos.z, { color: 0x7ad85a, size: 0.14, vy: 0.6, life: 0.6, grow: 0.5, opacity: 0.6 }); }
      for (const [a, m] of s.marks) { m.position.set(a.pos.x, a.pos.y + (a.ch.d.top || 1.7) + 0.5 + Math.sin(t * 4) * 0.05, a.pos.z); m.visible = !a.hidden; }
      if (actors().every(a => s.z.has(a))) return 'end';
      return null;
    },
    onHit(s, att, vic) { if (s.z.has(vic) && !s.z.has(att)) { knockDown(vic, 0, 0, 2); burst(vic.pos.x, vic.pos.y + 1.2, vic.pos.z, 8, { color: 0x7ad85a, size: 0.16, speed: 2 }); } },
    bot(s, b) { const zb = s.z.has(b), list = actors().filter(a => a !== b && s.z.has(a) !== zb && !a.hidden).sort((p, q) => p.pos.distanceTo(b.pos) - q.pos.distanceTo(b.pos)), o = list[0]; if (!o) return null;
      if (zb) return { who: o, kind: 'event', near: 0.5 };
      const dx = b.pos.x - o.pos.x, dz = b.pos.z - o.pos.z, d = Math.hypot(dx, dz) || 1; return d > 9 ? null : { x: b.pos.x + dx / d * 7, y: b.pos.y, z: b.pos.z + dz / d * 7, kind: 'event', near: 1 }; },
    stop(s) { if (actors().every(a => s.z.has(a))) award(s.first, 250, s.first.pos); else for (const a of actors()) if (!s.z.has(a)) award(a, 120, a.pos); for (const a of actors()) a.zombie = false; for (const m of s.marks.values()) W.group.remove(m); },
    info: s => { const P = ctx.player(); return s.z.has(P) ? 'ТЫ ЗОМБИ' : `людей ${actors().filter(a => !s.z.has(a)).length}`; },
  },

  /* Горячая картошка: тыква-бомба с фитилём; передай касанием (или выпадом). Взорвалась в руках — −60. */
  potato: { dur: 40,
    start(s) { s.bomb = compose('potatoBomb', a => { a(G.sph10, tmat(T.pumpkin()), 0, 0, 0, 0.32, 0.28, 0.32); a(G.cyl6, col(0x2b2533), 0, 0.3, 0, 0.03, 0.18, 0.03); a(G.sph, lam({ color: 0xffd25c, emissive: 0xff8a1f, emissiveIntensity: 1 }, 'fuseSpark'), 0, 0.42, 0, 0.06, 0.06, 0.06); });
      W.group.add(s.bomb); W.keep.push(s.bomb); s.cd = 0; s.boom = 0; give(s, actors()[(Math.random() * actors().length) | 0], true); },
    target(s) { if (s.flight) return s.bomb.position; const P = ctx.player(); if (s.h !== P) return s.h?.pos || P.pos; return (actors().filter(a => a !== P).sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos))[0] || P).pos; },
    update(s, dt, t) {
      s.cd -= dt; s.left -= dt;
      if (s.flight) {
        const f = s.flight; f.v.y -= dt * 15; const len = f.v.length() * dt, dir = f.v.clone().normalize(), travel = raySolids(s.bomb.position, dir, len);
        s.bomb.position.addScaledVector(dir, travel); if (travel < len) f.v.multiplyScalar(-0.15);
        const gy = groundAt(s.bomb.position.x, s.bomb.position.z, 0.25, s.bomb.position.y + 0.2); if (s.bomb.position.y < gy + 0.3) { s.bomb.position.y = gy + 0.3; f.v.set(0, 0, 0); }
        if (s.cd <= 0) for (const a of actors()) if (!a.hidden && a.pos.clone().add(new V3(0, 0.8, 0)).distanceTo(s.bomb.position) < 1.25) { give(s, a); break; }
      } else if (s.h) {
        const h=s.h;if(h.drone||h.returning){const next=actors()[0];if(next)give(s,next);return null;}h.held&&dropHeld(h);const d=h.ch.d;h.ch.handL.position.set(-.22,d.holdY,d.holdZ+.08);h.ch.handR.position.set(.22,d.holdY,d.holdZ+.08);h.root.updateMatrixWorld(true);s.bomb.position.copy(h.root.localToWorld(new V3(0,d.holdY,d.holdZ+.17)));
        if (s.cd <= 0) for (const o of actors()) if (o !== h && !o.hidden && o.pos.distanceTo(h.pos) < 1.15 && raySolids(h.pos.clone().add(new V3(0,.8,0)),o.pos.clone().sub(h.pos).normalize(),o.pos.distanceTo(h.pos))>=o.pos.distanceTo(h.pos)-.1) { give(s, o); sfx('pop', { at: o.pos }); break; }
      }
      s.bomb.rotation.y += dt * 4;
      const k = Math.max(0, s.left / s.T); s.tick -= dt; if (s.tick <= 0) { s.tick = 0.15 + k * 0.6; sfx('tick', { at: s.bomb.position, v: 0.7 }); puff(s.bomb.position.x, s.bomb.position.y + 0.45, s.bomb.position.z, { color: 0xffd25c, size: 0.08, vy: 1, life: 0.3 }); }
      if (s.left <= 0) {
        const victim = s.flight ? s.flight.by : s.h, p = s.bomb.position.clone(); p.y = groundAt(p.x, p.z, 0.2, p.y) + 0.3;
        explode(p, null); if (victim) { award(victim, -60, victim.pos); eliminate(victim, 25); } s.boom++;
        const others = actors(); if (!others.length) return 'end'; give(s, others[(Math.random() * others.length) | 0], true);
      }
      return null;
    },
    onHit(){},
    bot(s, b) { if (s.flight) return { x: s.bomb.position.x, y: s.bomb.position.y, z: s.bomb.position.z, kind: 'event', near: 0.5 };
      if (!s.h) return null;
      if (s.h === b) { const o = actors().filter(a => a !== b && !a.hidden).sort((p, q) => p.pos.distanceTo(b.pos) - q.pos.distanceTo(b.pos))[0]; return o ? { who: o, kind: 'event', near: 0.4 } : null; }
      const dx = b.pos.x - s.h.pos.x, dz = b.pos.z - s.h.pos.z, d = Math.hypot(dx, dz) || 1; return d > 8 ? null : { x: b.pos.x + dx / d * 6, y: b.pos.y, z: b.pos.z + dz / d * 6, kind: 'event', near: 1 }; },
    stop(s) { W.group.remove(s.bomb); if (s.h) s.h.hotPotato = false; },
    info: s => `${s.h === ctx.player() ? 'У ТЕБЯ! Касание / ЛКМ - передать' : s.h?.name || 'В полёте'} · ${Math.max(0, Math.ceil(s.left))}`,
  },

  /* Пол — лава (v0.19): единый слой лавы по всему городу поднимается в 3 ступени (0.25 → 0.6 → 1.0 м над землёй),
     каждая — плавно, с предупреждением. Спасают машины, скамейки, ящики, лестницы, крыши. Коснулся — подбрасывает,
     −20 и дроном на 15 с. В конце лава опускается, +150 минус ожоги. Слой всегда выше земли — без ряби. */
  lava: { dur: 24,
    start(s) { s.fallen=new Set(); s.lavaT = 0; s.base = CONFIG.base; s.level = UG.floor-s.base-.3; s.stage = 0; s.T = 0;
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#c8320a'; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 70; i++) { g.fillStyle = ['#ff6a1a', '#ff8a1f', '#ffd25c', '#8a1a08'][i % 4]; const x = Math.random() * 64, y = Math.random() * 64, r = 2 + Math.random() * 6; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); }
      for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(40,10,6,.55)'; g.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 3 + ((Math.random() * 6) | 0), 2); }
      s.tex = new THREE.CanvasTexture(c); s.tex.magFilter = s.tex.minFilter = THREE.NearestFilter; s.tex.wrapS = s.tex.wrapT = THREE.RepeatWrapping; s.tex.repeat.set(70, 70);
      s.mat = new THREE.MeshBasicMaterial({ map: s.tex, fog: true });
      s.sheet = mesh(G.plane, s.mat, 0, s.base - 0.4, 0, 420, 420, 1); s.sheet.rotation.x = -Math.PI / 2; s.sheet.renderOrder = 1;
      s.g = new THREE.Group(); s.g.add(s.sheet); W.group.add(s.g); W.keep.push(s.g); },
    target: s => { const P = ctx.player(); let best = null, bd = 1e9; for (const z of W.missionZones) if (z.type === 'roof' && z.y < P.pos.y + 4) { const d = Math.hypot((z.x0 + z.x1) / 2 - P.pos.x, (z.z0 + z.z1) / 2 - P.pos.z); if (d < bd) { bd = d; best = z; } } return best ? new V3((best.x0 + best.x1) / 2, best.y, (best.z0 + best.z1) / 2) : P.pos; },
    update(s, dt, t) {
      s.T += dt;
      const smooth=k=>{k=Math.max(0,Math.min(1,k));return k*k*(3-2*k);};let want=UG.floor-s.base-.3;
      if(s.T<5)want+=(.3-want)*smooth(s.T/5);else if(s.T<11)want=.3+.4*smooth((s.T-5)/6);else if(s.T<16)want=.7+.4*smooth((s.T-11)/5);else if(s.T<19)want=1.1;else want=1.1+(UG.floor-s.base-.6-1.1)*smooth((s.T-19)/5);
      s.level=want;s.stage=s.T>11?2:s.T>5?1:0;s.sheet.position.y=s.base+s.level;
      s.tex.offset.x = t * 0.04; s.tex.offset.y = Math.sin(t * 0.7) * 0.05; s.mat.color.setHSL(0.03, 1, 0.55 + Math.sin(t * 4) * 0.05);
      const P = ctx.player(), top = s.base + s.level;
      s.lavaT -= dt; if (s.lavaT <= 0 && s.level > 0 && P) { s.lavaT = 0.08; const a = Math.random() * 6.28, d = 2 + Math.random() * 12; burst(P.pos.x + Math.cos(a) * d, top + 0.02, P.pos.z + Math.sin(a) * d, 2, { color: 0xffd25c, size: 0.12, speed: 1, up: 3, g: 6, life: 0.6 }); }
      for(const a of actors())if(a.pos.y<=top+.02&&a.pos.y>UG.floor-2){s.fallen.add(a);const at=a.pos.clone();eliminate(a,15);burst(at.x,Math.max(at.y,top)+.2,at.z,10,{color:0xff8a1f,size:.2,speed:2,up:3});sfx('hit',{at});}
      return null;
    },
    // бот: если стоит ниже будущего уровня — бежит на ближайшую крышу/возвышение
    bot(s, b) { const next = s.base + (s.stage >= 2 ? 1.1 : s.stage >= 1 ? 0.7 : 0.35); if (b.pos.y > next) return null;
      let best = null, bd = 1e9; for (const z of W.missionZones) if ((z.type === 'roof' || z.type === 'nook') && z.y > next && z.y < b.pos.y + 9) { const d = Math.hypot((z.x0 + z.x1) / 2 - b.pos.x, (z.z0 + z.z1) / 2 - b.pos.z); if (d < bd) { bd = d; best = z; } }
      return best ? { x: (best.x0 + best.x1) / 2, y: best.y, z: (best.z0 + best.z1) / 2, kind: 'event', near: 1.5 } : null; },
    stop(s) { W.group.remove(s.g); s.tex.dispose(); s.mat.dispose(); for(const a of actors())if(!s.fallen.has(a))award(a,150,a.pos); },
    info:s=>s.T>=19?'Лава уходит':'Выше лавы!',
  },

  /* Покрась город (как Splatoon): за каждым остаются следы его цвета, брошенные предметы красят пятном.
     Чужие клетки перекрашиваются. В конце — 2 очка за каждую свою клетку (до 200). */
  paint: { dur: 35,
    start(s) { s.COL = new Map(); const pal = [0xff8a1f, 0xb18cff, 0x4ab0f0, 0x9be36b, 0xff5a9e]; actors().forEach((a, i) => s.COL.set(a, pal[i % pal.length]));
      s.N = 2200; s.inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.95, 0.95).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false }), s.N); s.inst.count = 0; s.inst.frustumCulled = false;
      s.inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(s.N * 3), 3); W.group.add(s.inst); W.keep.push(s.inst); s.cells = new Map(); s.own = new Map();
      s.hook = (it, p) => { if (!it.owner || !s.COL.has(it.owner)) return; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) paintCell(s, it.owner, Math.floor(p.x) + i, Math.floor(p.z) + j, groundAt(p.x + i, p.z + j, 0.2, p.y + 0.5)); sfx('splash', { at: p, v: 0.5 }); };
      W.hitHooks.push(s.hook); },
    // красить можно где угодно — отдельной метки нет (раньше метка прыгала по ближайшим чужим клеткам и мелькала по всей карте)
    target() { return null; },
    update(s, dt) { for (const a of actors()) if (a.onGround && !a.hidden) paintCell(s, a, Math.floor(a.pos.x), Math.floor(a.pos.z), a.pos.y); return null; },
    bot(s, b) { if (!b.paintGoal || Math.hypot(b.paintGoal.x - b.pos.x, b.paintGoal.z - b.pos.z) < 1.5 || Math.random() < 0.005) { const a = Math.random() * 6.28, r = 6 + Math.random() * 10; b.paintGoal = { x: b.pos.x + Math.cos(a) * r, y: b.pos.y, z: b.pos.z + Math.sin(a) * r, kind: 'event', near: 1 }; } return b.paintGoal; },
    stop(s) { W.hitHooks.splice(W.hitHooks.indexOf(s.hook), 1); W.group.remove(s.inst); for (const a of actors()) { const n = s.own.get(a) || 0; if (n) award(a, Math.min(200, n * 2), a.pos); a.paintGoal = null; } },
    info: s => `клеток ${s.own.get(ctx.player()) || 0}`,
  },
};
// зомби: метка над головой и руки вперёд
function infect(s, a, by) {
  s.z.add(a); a.zombie = true; if (by) { sfx('ghost', { at: a.pos }); }
  burst(a.pos.x, a.pos.y + 1.2, a.pos.z, 12, { color: 0x7ad85a, size: 0.18, speed: 2.5, up: 2 });
  const t = new THREE.CanvasTexture(iconCanvas('zombie', 2)); t.magFilter = THREE.NearestFilter; const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); m.scale.set(0.6, 0.6, 1); m.renderOrder = 10; W.group.add(m); s.marks.set(a, m);
}
// горячая картошка: новый держатель, свежий фитиль
function give(s, a, fresh = false) {
  if (s.h) s.h.hotPotato = false; s.h = a; s.flight = null; a.hotPotato=true;dropHeld(a);s.cd=1.35;
  a.daze = Math.max(a.daze || 0, 1); a.vel.x = a.vel.z = 0;
  if (fresh) { s.T = s.left = 10 + Math.random() * 5; s.tick = 0; }
}
export function throwPotato(a,direction,contact=false){
  const b = EV.big; if (!b || b.key !== 'potato' || b.s.h !== a || b.s.cd > 0 || a.stun > 0) return false;
  if(!contact)return false;const v=actors().find(o=>o!==a&&!o.hidden&&o.pos.distanceTo(a.pos)<1.65&&new V3(o.pos.x-a.pos.x,0,o.pos.z-a.pos.z).normalize().dot(new V3(direction.x,0,direction.z).normalize())>.25&&raySolids(a.pos.clone().add(new V3(0,.9,0)),o.pos.clone().sub(a.pos).normalize(),o.pos.distanceTo(a.pos))>=o.pos.distanceTo(a.pos)-.1);if(!v)return false;give(b.s,v);sfx('grab',{at:v.pos});return true;
}

// покраска: клетка 1×1 м на высоте пола/объекта
function paintCell(s, a, x, z, y) {
  const k = x + ',' + z, c = s.cells.get(k), col3 = new THREE.Color(s.COL.get(a));
  if (c && c.a === a) return;
  let i; if (c) { i = c.i; s.own.set(c.a, (s.own.get(c.a) || 1) - 1); } else { if (s.inst.count >= s.N) return; i = s.inst.count++; }
  s.cells.set(k, { a, i, x: x + 0.5, y, z: z + 0.5 }); s.own.set(a, (s.own.get(a) || 0) + 1);
  const M = new THREE.Matrix4().makeTranslation(x + 0.5, y + 0.035, z + 0.5); s.inst.setMatrixAt(i, M); s.inst.instanceColor.setXYZ(i, col3.r, col3.g, col3.b);
  s.inst.instanceMatrix.needsUpdate = true; s.inst.instanceColor.needsUpdate = true;
}
function dist(z, P) { return Math.hypot((z.x0 + z.x1) / 2 - P.pos.x, (z.z0 + z.z1) / 2 - P.pos.z) + Math.abs(z.y - P.pos.y) * 2; }
function drawBar(s) { const g = s.bar.getContext('2d'); g.fillStyle = '#17111f'; g.fillRect(0, 0, 64, 10); g.fillStyle = '#3a3046'; g.fillRect(2, 2, 60, 6); g.fillStyle = '#ff5a6e'; g.fillRect(2, 2, Math.round(60 * Math.max(0, s.hp) / s.max), 6); s.barT.needsUpdate = true; }
function hitMoth(s, p, dmg, owner) {
  if (s.dead || s.hitCD > 0) return; s.hitCD = 0.12; s.hp -= dmg; drawBar(s); hitFreeze(0.05); sfx('bonk', { at: p });
  burst(p.x, p.y, p.z, 8, { color: 0xb8a890, size: 0.2, speed: 2.5, up: 1.5 });
  if (owner) award(owner, dmg >= 1 ? 25 : 12, p);
  if (s.hp <= 0) { s.dead = true; if (owner) award(owner, 150, p); sfx('goal'); }
}
// временное поле, если стадиона на карте нет: площадка-пол побольше и двое ворот-рамок
function makePitch(s) {
  const P = ctx.player(), zs = W.missionZones.filter(z => z.type === 'floor' && z.x1 - z.x0 > 14 && z.z1 - z.z0 > 7).sort((a, b) => dist(a, P) - dist(b, P));
  const z = zs[0] || W.missionZones[0], cx = (z.x0 + z.x1) / 2, cz = (z.z0 + z.z1) / 2, half = Math.min(9, (z.x1 - z.x0) / 2 - 0.5);
  W.pitch = { x0: cx - half, x1: cx + half, z0: z.z0, z1: z.z1, y: z.y, cx, cz }; s.tmp = []; s.tmpGoals = true; W.goals = [];
  for (const sg of [-1, 1]) { const gx = cx + sg * half, g = new THREE.Group(); g.position.set(gx, z.y, cz); W.group.add(g); s.tmp.push(g);
    g.add(compose('tmpGoal', a => { const w = col(0xf1e8ff); for (const sz of [-1.5, 1.5]) a(G.box, w, 0, 1, sz, 0.12, 2, 0.12); a(G.box, w, 0, 2, 0, 0.12, 0.12, 3.1); }));
    W.goals.push({ x: gx, z: cz, y: z.y, fx: -sg, fz: 0, rx: 0, rz: 1, w: 3, h: 2, score: 0 }); }
}

export function updateEvents(dt, ui) {
  EV.t += dt;
  // общее событие — один раз, около середины раунда
  if (!EV.big && !EV.bigDone && EV.t >= EV.bigAt && !EV.cur) startBig(ui);
  if (EV.big) { const B = EV.big; B.left -= dt; const r = B.def.update(B.s, dt, EV.t); ui.tick(B.key, Math.ceil(B.left), B.def.info ? B.def.info(B.s) : '');
    if (B.left <= 0 || r === 'end' || EV.t >= PHASE.resume) { stopBig(); ui.end(); } return; }
  if (!EV.cur && EV.t >= EV.next && EV.t < 170) {
    const keys = Object.keys(EVENTS).filter(k => k !== EV.last), key = keys[(Math.random() * keys.length) | 0];
    EV.cur = { key, def: EVENTS[key], s: {} }; EV.left = DUR; EV.last = key; EV.cur.def.start(EV.cur.s);
    ui.start(key);
  }
  if (EV.cur) {
    EV.cur.def.update(EV.cur.s, dt); EV.left -= dt;
    ui.tick(EV.cur.key, Math.ceil(EV.left));
    if (EV.left <= 0) { stopEvent(); EV.next = EV.t + 40 + Math.random() * 20; ui.end(); if (!EV.bigDone && EV.bigAt < EV.t + 8) EV.bigAt = EV.t + 8; }
  }
}
function startBig(ui) {
  const keys = Object.keys(BIG), key = globalThis.__forceBig || keys[(Math.random() * keys.length) | 0];
  EV.big = { key, def: BIG[key], s: {}, left:key==='lava'?Math.min(24,Math.max(0,PHASE.resume-EV.t)):Math.max(0,PHASE.resume-EV.t) }; EV.bigDone = true; EV.big.def.start(EV.big.s);
  W.eventBot = b => EV.big ? EV.big.def.bot(EV.big.s, b) : null;
  ui.start(key, true);
}
function stopBig() { if (!EV.big) return; EV.big.def.stop(EV.big.s); EV.big = null; W.eventBot = null; }
export const bigTarget = () => EV.big ? EV.big.def.target(EV.big.s) : null;
export function stopEvent() { if (EV.cur) { EV.cur.def.stop(EV.cur.s); EV.cur = null; } stopBig(); }
void alphaMat; void tmat; void isFree; void puff;
