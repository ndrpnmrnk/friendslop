import { random } from '../core/random.js';
import {ParticleBatch} from './particle-batch.js';
import {graphics} from '../core/quality.js';
import { THREE, G, V3, mesh, alphaMat } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { SEASON } from '../config.js';
import { W } from './state.js';
import { puff, ripple, burst } from './particles.js';
import { scareBirds } from './birds.js';
import { sfx, rainLoop } from '../core/sfx.js';

/* Погода раунда (случайно, одна на раунд) и сгущающаяся ночь.
   Морось: косые капли вокруг камеры, круги на лужах, мокрый асфальт отражает фонари.
   Ветер: порывы гонят листья и лёгкие предметы, качают вывески, бельё и привидений на ветках.
   Туман: густая дымка, вокруг фонарей ореолы.
   Ночь: за раунд сумерки уходят в глубокую ночь — темнее небо и туман, ярче окна и пятна фонарей, луна выше. */
export const WX = { kind: 'clear', wet: 0, wind: { x: 1, z: 0, k: 0 }, gust: 0, night: 0 };
const N = 700;
let rain = null, halos = [],haloBatch=null, gustT = 6, base = null;

export function startWeather(scene, kind) {
  stopWeather(scene);
  const kinds = ['rain', 'wind', 'fog', 'clear'];
  WX.kind = kind || globalThis.__forceWeather || kinds[(random() * kinds.length) | 0];
  WX.wet = WX.kind === 'rain' ? 1 : 0; const a = random() * 6.28; WX.wind = { x: Math.cos(a), z: Math.sin(a), k: WX.kind === 'wind' ? 1 : WX.kind === 'rain' ? 0.35 : 0.1 }; WX.gust = 0; gustT = 5;
  base = { near: SEASON.fog[1], far: SEASON.fog[2] };
  if (WX.kind === 'rain') {
    // капли: отрезки линий, которые падают в коробке вокруг камеры
    const pos = new Float32Array(N * 6), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xb8c8f0, transparent: true, opacity: 0.45, depthWrite: false })); rain.frustumCulled = false; scene.add(rain);
    rain.userData.p = Array.from({ length: N }, () => new V3((random() - 0.5) * 44, random() * 22, (random() - 0.5) * 44));
    rainLoop(true);
  }
  if(WX.kind==='fog'){
    haloBatch=new ParticleBatch(W.group,'puff',256,T.light());haloBatch.mesh.material.blending=THREE.AdditiveBlending;
    for(const L of W.lamps){const p=haloBatch.spawn({x:L.lx,y:L.y+2.95,z:L.lz,color:0xffd8a0,life:Infinity,scale:3.2,alpha:.22});if(p)halos.push({p,L});}
  }
}
export function stopWeather(scene) {
  if (rain) { scene.remove(rain); rain.geometry.dispose();rain.material.dispose();rain = null; }
  haloBatch?.dispose();haloBatch=null;halos=[];
  rainLoop(false); WX.kind = 'clear'; WX.wet = 0; WX.wind.k = 0;
}

export function updateWeather(dt, t, camera, P, scene, roundK) {
  // ночь сгущается: 0 в начале раунда → 1 в конце
  WX.night = Math.max(0, Math.min(1, roundK));
  const fog = scene.fog;
  if (base) {
    const fk = WX.kind === 'fog' ? 1 : 0, nk = WX.night;
    fog.near = base.near * (1 - fk * 0.72) * (1 - nk * 0.15); fog.far = base.far * (1 - fk * 0.55) * (1 - nk * 0.12);
  }
  // дождь
  if (rain && camera) {
    const p = rain.geometry.attributes.position.array, ps = rain.userData.p, wx = WX.wind.x * 3 * WX.wind.k, wz = WX.wind.z * 3 * WX.wind.k, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    const count=Math.round(N*(graphics.key==='high'?1:graphics.key==='low'?.4:.7));rain.geometry.setDrawRange(0,count*2);
    for (let i = 0; i < count; i++) { const q = ps[i]; q.y -= dt * 16; q.x += wx * dt; q.z += wz * dt;
      if (q.y < -6) { q.y = 14 + random() * 4; q.x = (random() - 0.5) * 44; q.z = (random() - 0.5) * 44; }
      if (q.x > 22) q.x -= 44; if (q.x < -22) q.x += 44; if (q.z > 22) q.z -= 44; if (q.z < -22) q.z += 44;
      const x = cx + q.x, y = cy + q.y - 6, z = cz + q.z, k = i * 6; p[k] = x; p[k + 1] = y; p[k + 2] = z; p[k + 3] = x - wx * 0.04; p[k + 4] = y - 0.55; p[k + 5] = z - wz * 0.04; }
    rain.geometry.attributes.position.needsUpdate = true;
    // круги на лужах и на воде рядом
    if (P) for (const pd of W.puddles) if (Math.abs(pd.x - P.pos.x) < 20 && Math.abs(pd.z - P.pos.z) < 20 && random() < dt * 4) ripple(pd.x + (random() - 0.5) * pd.r * 1.4, pd.y, pd.z + (random() - 0.5) * pd.r * 1.4, 0.35, 0.6);
    if (P && random() < dt * 0.04) sfx('thunder');
  }
  // ветер: порывы
  if (WX.kind === 'wind' && P) {
    gustT -= dt; if (gustT <= 0) { gustT = 6 + random() * 6; WX.gust = 2.2; sfx('wind'); const a = Math.atan2(WX.wind.z, WX.wind.x) + (random() - 0.5) * 0.6; WX.wind.x = Math.cos(a); WX.wind.z = Math.sin(a); }
    if (WX.gust > 0) { WX.gust -= dt; gust(dt, P, 1); }
  }
  WX.windNow = WX.wind.k * (0.35 + (WX.gust > 0 ? 1 : 0));
  // раскачка всего подвешенного
  if (W.swingers && WX.windNow > 0.05) for (const s of W.swingers) { if (s.rider) continue; const ry = s.pivot.rotation.y, f = WX.wind.x * Math.sin(ry) + WX.wind.z * Math.cos(ry); s.vel += f * WX.windNow * dt * (2 + Math.sin(t * 3 + s.ph) * 1.5); }
  if(haloBatch){for(const h of halos){const d=Math.hypot(h.p.x-camera.position.x,h.p.z-camera.position.z),on=!h.L.dead&&h.L.pool.visible&&!h.L.pool.userData.broken&&d<28;h.p.scale=on?3.2:0;h.p.alpha=.20*Math.max(0,1-d/32);}haloBatch.sync();}
}
// порыв: лёгкие предметы катятся и взлетают, персонажей подталкивает, птицы взлетают
export function gust(dt, P, k = 1) {
  const wx = WX.wind.x, wz = WX.wind.z;
  for (const it of W.items) if (it.state === 'rest' && it.def.mass < 0.7 && Math.abs(it.pos.x - P.pos.x) < 30 && Math.abs(it.pos.z - P.pos.z) < 30) { it.vel.x += wx * 9 * dt * k / it.def.mass; it.vel.z += wz * 9 * dt * k / it.def.mass; if (random() < dt * 2) it.vel.y += 2; }
  for (const a of [P, ...(W.bots || [])]) if (a && !a.hidden && !a.stationaryWork) { a.vel.x += wx * 4 * dt * k; a.vel.z += wz * 4 * dt * k; }
  if (random() < dt * 6) { const ax = P.pos.x - wx * 8 + (random() - 0.5) * 10, az = P.pos.z - wz * 8 + (random() - 0.5) * 10; puff(ax, P.pos.y + 0.3 + random() * 2, az, { color: [0xc96a25, 0xa8452a, 0xe0902e][(random() * 3) | 0], size: 0.12, vx: wx * 9, vy: 0.5, vz: wz * 9, g: 0, life: 1.5, grow: 0 }); }
  if (random() < dt) scareBirds(P.pos.x + wx * 5, P.pos.z + wz * 5, 8);
}
void G; void mesh; void burst;
