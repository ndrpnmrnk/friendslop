import {meleeHand} from './melee-pose.js';
import { THREE, G, sprite } from '../core/gfx.js';
import {makeSpeechMouth,animateSpeech} from './speech.js';
import { T } from '../core/textures.js';
import { clamp, damp } from '../core/rng.js';
import { SKINS } from './skins.js';
import {prepareOutfits,updateOutfit} from './outfits.js';

/* Общая структура персонажа для всех скинов:
   root
    ├─ body (голова + тело, качается и сжимается при прыжке)
    ├─ handL / handR — парят рядом с телом, не прикреплены
    └─ footL / footR — парят под телом
   Скин только наполняет эти группы моделями и задаёт размеры. Хитбокс один на всех. */
export function makeCharacter(skinId) {
  const skin = SKINS[skinId] || SKINS.cat;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const head = new THREE.Group(), torso = new THREE.Group(); body.add(torso, head);
  const handL = new THREE.Group(), handR = new THREE.Group(), footL = new THREE.Group(), footR = new THREE.Group();
  root.add(handL, handR, footL, footR);
  const parts = { root, body, head, torso, handL, handR, footL, footR };
  const d = skin.build(parts);
  const rigidBase=skin.rigidBody?[head,torso].map(p=>({p,position:p.position.clone(),rotation:p.quaternion.clone(),scale:p.scale.clone()})):null;
  const bindBody=()=>{if(rigidBase)for(const q of rigidBase){q.p.position.copy(q.position);q.p.quaternion.copy(q.rotation);q.p.scale.copy(q.scale);}};
  const sh = new THREE.Mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.scale.setScalar(d.shadow ?? 0.55); root.add(sh);
  sh.name='character-shadow';sh.userData.noOutline=true;
  root.traverse(o => { if (o.isMesh && o !== sh && !o.material.transparent) o.castShadow = true; });
  const stars = new THREE.Group(); stars.position.y = d.top + 0.15; root.add(stars); stars.visible = false;
  for (let i = 0; i < 4; i++) { const s = sprite(T.star(), 0.22); s.position.set(Math.cos(i * 1.57) * 0.4, 0, Math.sin(i * 1.57) * 0.4); stars.add(s); }
  const ch = { ...parts, skinId, skin, d, stars, blob: sh, blobS: d.shadow ?? 0.55, ph: 0, squash: 0, blinkT: 2, expr: 'idle', holdPoint: new THREE.Vector3() };
  prepareOutfits(ch);
  ch.speechMouth=makeSpeechMouth(head,skinId);
  ch.animate = (dt, st) => {if(ch.hazeTilt){body.rotation.z-=ch.hazeTilt;ch.hazeTilt=0;}bindBody();animate(ch, dt, st);bindBody();if(rigidBase&&(ch.shout||0)>.02){body.rotation.z+=Math.sin(st.t*25)*.025*ch.shout;}skin.animate?.(ch, dt, st);animateSpeech(ch,dt);updateOutfit(ch,dt,st); if (st.daze && !(st.rag > 0.001)) { ch.stars.visible = true; ch.stars.rotation.y += dt * 5; } };
  // голос: мешок надувается сразу (звук включает тот, кто вызвал)
  ch.croakNow = () => { if (ch.head.userData.sac) ch.sacT = -0.0001; };
  return ch;
}

const _up = new THREE.Vector3(0, 0.18, 0);
// поза при катании: сидя (кресло, тележка, тачка) или стоя боком (скейт)
// выпад (тело вытянуто вперёд), перекат (кувырок через голову), подкат (откинулся назад)
function animateMove(c, dt, s) {
  const d = c.d, f = damp(18, dt), ctr = 0.8;
  let th, drop = 0;
  if (s.dive === 'roll') { th = Math.PI * 2 * (s.roll || 0); drop = 0.35 * Math.sin(Math.PI * (s.roll || 0)); }
  else if (s.dive === 'air') th = 1.25;
  else th = -0.85;
  const cc = s.slide ? 0.55 : ctr;
  c.body.rotation.set(th, 0, 0); c.body.scale.set(1, 1, 1);
  c.body.position.set(0, cc - cc * Math.cos(th) - drop - (s.slide ? 0.25 : 0), -cc * Math.sin(th));
  c.stars.visible = false;
  if (s.slide) {
    setHand(c.footL, -d.footX, d.footY + 0.15, 0.55, f); setHand(c.footR, d.footX, d.footY + 0.15, 0.45, f);
    setHand(c.handL, -d.handX - 0.1, 0.35, -0.2, f); setHand(c.handR, d.handX + 0.1, 0.35, -0.2, f);
  } else if (s.dive === 'air') {
    setHand(c.handL, -d.handX * 0.6, 0.9, 1.3, f); setHand(c.handR, d.handX * 0.6, 0.9, 1.3, f);
    setHand(c.footL, -d.footX, 0.75, -0.7, f); setHand(c.footR, d.footX, 0.85, -0.6, f);
  } else {
    const k = s.roll || 0, a = th;
    const ring = (r, o) => [Math.sin(a + o) * r, ctr - Math.cos(a + o) * r - drop];
    const [hz, hy] = ring(0.55, 0.6), [fz, fy] = ring(0.55, Math.PI + 0.4);
    setHand(c.handL, -d.handX * 0.7, hy, hz, 1); setHand(c.handR, d.handX * 0.7, hy, hz, 1);
    setHand(c.footL, -d.footX, fy, fz, 1); setHand(c.footR, d.footX, fy, fz, 1);
  }
}
function animateRide(c, dt, s) {
  const d = c.d, f = damp(14, dt), sp = Math.min(1, (s.rideSpeed || 0) / 10), t = s.t;
  c.stars.visible = false; c.body.scale.set(1, 1, 1); c.body.rotation.y += (0 - c.body.rotation.y) * f;
  if(s.ride==='cycle'){const ph=s.cyclePhase||0;c.body.position.set(0,-.35+Math.sin(ph*2)*.012*sp,-.20);c.body.rotation.x=.14;c.body.rotation.z=Math.sin(ph)*.022*sp;
    setHand(c.handL,-.26,.15,.42,f);setHand(c.handR,.26,.15,.42,f);
    setHand(c.footL,-.16,-.48+Math.cos(ph)*.24,-.08+Math.sin(ph)*.24,f);
    setHand(c.footR,.16,-.48-Math.cos(ph)*.24,-.08-Math.sin(ph)*.24,f);
  }else if(s.ride==='kart'){c.body.position.y=-.40;c.body.rotation.x=-.1;c.body.rotation.z=0;setHand(c.handL,-.18,.26,.28,1);setHand(c.handR,.18,.26,.28,1);setHand(c.footL,-.18,-.13,.65,1);setHand(c.footR,.18,-.13,.65,1);
  }else if (s.ride === 'stand') {
    /* стоит на доске боком: передняя нога на носу, задняя на хвосте; руки у тела для равновесия.
       Толчок (kick 0..1): задняя нога опускается сбоку на землю и уходит назад. Трюк: присел, ноги поджаты. */
    const tr = s.trick || 0, kick = s.kick, scoot = s.board === 'scooter';
    c.body.position.y = -0.12 - tr * 0.22 + Math.sin(t * 6) * 0.015 * sp; c.body.rotation.x += (0.1 + sp * 0.1 + tr * 0.25 - c.body.rotation.x) * f;
    c.body.rotation.z = scoot ? 0 : Math.sin(t * 2.5) * 0.05;
    setHand(c.footL, scoot ? -0.08 : -0.05, d.footY + tr * 0.22, scoot ? 0.12 : 0.22, f);
    if (kick != null && !tr) { const ph = Math.max(0, Math.min(1, (kick - 0.15) / 0.5)), dn = Math.sin(ph * Math.PI);
      setHand(c.footR, 0.24, d.footY - 0.14 * dn + (1 - dn) * 0.05, 0.15 - ph * 0.55, damp(22, dt)); c.body.position.y -= dn * 0.08; }
    else setHand(c.footR, scoot ? 0.08 : 0.05, d.footY + tr * 0.22, scoot ? -0.12 : -0.22, f);
    if (scoot) { setHand(c.handL, -0.22, d.handY + 0.35, 0.5, f); setHand(c.handR, 0.22, d.handY + 0.35, 0.5, f); }
    else { const sw = Math.sin(t * 3) * 0.04; setHand(c.handL, -d.handX * 0.95, d.handY + 0.08 + sw + tr * 0.2, 0.12, f); setHand(c.handR, d.handX * 0.95, d.handY + 0.08 - sw + tr * 0.2, -0.08, f); }
  } else {
    c.body.position.y = -0.38; c.body.rotation.x += (-0.08 - sp * 0.1 - c.body.rotation.x) * f; c.body.rotation.z = 0;
    // сидит на скамейке/качелях: ноги болтаются по очереди, голова осматривается
    const dg = s.dangle ? Math.sin(t * 3.2) * 0.12 : 0;
    const fy0 = d.footY + (s.dangle ? -0.22 : 0.05), fz0 = s.dangle ? 0.34 : 0.42;
    setHand(c.footL, -d.footX, fy0 + dg * 0.4, fz0 + dg, f); setHand(c.footR, d.footX, fy0 - dg * 0.4, fz0 - dg, f);
    if (s.look !== undefined) c.head.rotation.y += (s.look - c.head.rotation.y) * damp(4, dt); else c.head.rotation.y *= 0.9;
    setHand(c.handL, -d.handX, d.handY - 0.2, 0.25, f); setHand(c.handR, d.handX, d.handY - 0.2, 0.25, f);
  }
  c.footL.rotation.x = 0; c.footR.rotation.x = 0; c.handL.rotation.x = 0; c.handR.rotation.x = 0;
}
/* Рэгдолл (v0.18): сбили с ног — тело «тряпичной куклой» кувыркается в воздухе и лежит на спине, руки-ноги раскинуты и болтаются.
   s.rag 1 → 0 — плавный подъём (поза смешивается с обычной стойкой). */
function animateRag(c, dt, s) {
  const d = c.d, t = s.t, k0 = clamp(s.rag, 0, 1), k = k0 * k0 * (3 - 2 * k0), f = damp(10, dt), air = s.air && k0 > 0.99;
  c.ragSpin = air ? (c.ragSpin || 0) + dt * 7 : (c.ragSpin || 0) * Math.max(0, 1 - dt * 6);
  const th = -1.48 * k - (air ? Math.sin(c.ragSpin) * 0.5 : 0), cc = 0.8, drop = 0.52 * k * (air ? 0.4 : 1);
  c.body.rotation.set(th, 0, (air ? Math.sin(c.ragSpin * 1.3) * 0.5 : Math.sin(t * 1.3) * 0.04) * k); c.body.scale.set(1, 1, 1);
  c.body.position.set(0, cc - cc * Math.cos(th) - drop, -cc * Math.sin(th) * 0.55);
  c.stars.visible = false;
  const lp = (a, b) => a + (b - a) * k, jig = air ? 0.25 : 0.03, w = Math.sin(t * (air ? 13 : 2.5));
  const hx = d.handX, hy = d.handY, hz = d.handZ, fx = d.footX, fy = d.footY;
  setHand(c.handL, lp(-hx, -hx - 0.32), lp(hy, 0.16 + w * jig), lp(hz, -0.35 + w * jig), f);
  setHand(c.handR, lp(hx, hx + 0.32), lp(hy, 0.16 - w * jig), lp(hz, -0.25 - w * jig), f);
  setHand(c.footL, lp(-fx, -fx - 0.14), lp(fy, 0.12 + Math.max(0, w) * jig), lp(0, 0.5), f);
  setHand(c.footR, lp(fx, fx + 0.16), lp(fy, 0.12 + Math.max(0, -w) * jig), lp(0, 0.42), f);
  c.handL.rotation.x = c.handR.rotation.x = c.footL.rotation.x = c.footR.rotation.x = 0;
  c.holdPoint.set(0, d.handY + 0.12, d.handZ); c.root.localToWorld(c.holdPoint);
  const e = 'dizzy'; if (e !== c.expr) { c.expr = e; c.skin.face && c.skin.face(c, e); }
}
function setHand(h, x, y, z, k) { h.position.x += (x - h.position.x) * k; h.position.y += (y - h.position.y) * k; h.position.z += (z - h.position.z) * k; }

function animate(c, dt, s) {
  if (c.handOff) { c.handL.position.y += c.handOff; c.handR.position.y += c.handOff; c.handOff = 0; }
  const d = c.d, t = s.t, k = clamp(s.speed || 0, 0, 1), run = !s.air && !s.climb && k > 0.05;
  if (s.rag > 0.001) return animateRag(c, dt, s);
  if (s.ride) return animateRide(c, dt, s);
  if (s.dive || s.slide) return animateMove(c, dt, s);
  c.body.position.z = 0; c.body.position.x = 0; c.body.rotation.x = Math.atan2(Math.sin(c.body.rotation.x), Math.cos(c.body.rotation.x));
  c.ph += dt * (s.climb ? 7 : 4 + k * 10) * (run || s.climb ? 1 : 0);
  const sn = Math.sin(c.ph), cs = Math.cos(c.ph), f = damp(16, dt);
  // тело
  if (s.landed) c.squash = 1;
  c.squash = Math.max(0, c.squash - dt * 5);
  const stretch = s.air ? clamp(s.vy * 0.025, -0.12, 0.15) : 0;
  const sy = 1 + stretch - c.squash * 0.18, sxz = 1 - stretch * 0.5 + c.squash * 0.12;
  c.body.scale.set(sxz, sy, sxz);
  c.body.position.y = run ? Math.abs(sn) * 0.08 : Math.sin(t * 2.2) * 0.025;
  // наклон: сильнее на разгоне и в спринте, назад при резком торможении
  const lean = run ? 0.1 * k + 0.12 * (s.sprint || 0) + clamp((s.accel || 0) * 0.012, -0.15, 0.12) : 0;
  c.body.rotation.x += (lean - c.body.rotation.x) * damp(8, dt);
  // замах: корпус чуть разворачивается
  const twist = s.charge ? -0.35 * s.charge : (s.throwT > 0 ? 0.3 * (s.throwT / 0.3) : 0);
  c.body.rotation.y += (twist - c.body.rotation.y) * damp(14, dt);
  c.body.rotation.z = s.daze ? Math.sin(t * 5) * 0.14 : c.body.rotation.z * 0.85 + (run ? sn * 0.04 : 0) * 0.15;
  c.stars.visible = false;
  // ножки
  const fy = d.footY, fx = d.footX;
  if (s.air) { setHand(c.footL, -fx, fy + 0.12, 0.08, f); setHand(c.footR, fx, fy + 0.06, -0.1, f); }
  else if (s.climb) { setHand(c.footL, -fx, fy + Math.max(0, cs) * 0.2, 0.2, f); setHand(c.footR, fx, fy + Math.max(0, -cs) * 0.2, 0.2, f); }
  else {
    setHand(c.footL, -fx, fy + (run ? Math.max(0, cs) * 0.18 * k : 0), run ? sn * 0.3 * k : 0, f);
    setHand(c.footR, fx, fy + (run ? Math.max(0, -cs) * 0.18 * k : 0), run ? -sn * 0.3 * k : 0, f);
  }
  c.footL.rotation.x = run ? -sn * 0.4 * k : 0; c.footR.rotation.x = run ? sn * 0.4 * k : 0;
  // ручки
  const hx = d.handX, hy = d.handY + c.body.position.y, hz = d.handZ, fl = Math.sin(t * 2.2) * 0.04;
  if (s.throwT > 0) {
    // бросок: правая рука резко уходит вперёд
    const k2 = s.throwT / 0.3;
    setHand(c.handR, d.holdX * 0.6, d.top - 0.35 * (1 - k2), d.holdZ + 0.45, damp(30, dt));
    setHand(c.handL, -hx, hy, hz - 0.15, f);
  } else if (s.hold && s.charge) {
    // замах: предмет в правой руке, рука уходит назад и вверх, левая указывает цель
    const ch = s.charge;
    setHand(c.handR, hx * 0.9, d.top - 0.1 + ch * 0.25, -0.15 - ch * 0.4, damp(12, dt));
    setHand(c.handL, -hx * 0.7, hy + 0.3, hz + 0.45, f);
  } else if(s.swat){
    // Общая поза замаха ниже применяется после обычных поворотов кистей.
  } else if (s.hold && !s.missionTool) {
    const load=s.payload||0,zz=Math.max(d.holdZ+0.12,d.holdZ*0.5+load+0.16),xx=load>0.3?Math.max(d.holdX,load*0.85):d.holdX;
    setHand(c.handL, -xx, d.holdY, zz, f);
    setHand(c.handR, xx, d.holdY, zz, f);
  } else if (s.climb) {
    setHand(c.handL, -hx * 0.8, d.top - 0.2 + sn * 0.22, 0.4, f); setHand(c.handR, hx * 0.8, d.top - 0.2 - sn * 0.22, 0.4, f);
  } else if (s.air) {
    setHand(c.handL, -hx - 0.1, hy + 0.35, hz, f); setHand(c.handR, hx + 0.1, hy + 0.35, hz, f);
  } else if (s.act === 'smoke') {
    // перекур/пивко (v0.20): берёт из протянутой пачки → подносит ко рту ПЕРЕД лицом → щелчком выкидывает
    setHand(c.handL, -hx, hy + fl, hz, f);
    if (s.smokePh === 'take') setHand(c.handR, hx * 0.6, hy + 0.25, hz + 0.5, damp(8, dt));
    else if (s.smokePh === 'flick') setHand(c.handR, hx + 0.15, hy + 0.2, hz + 0.55, damp(18, dt));
    else { const up = Math.max(0, Math.sin(t * 1.1)), my = d.top - 0.42, mz = Math.max(hz + 0.3, 0.46);
      setHand(c.handR, hx * (1 - up * 0.7), hy + (my - hy) * up, hz + (mz - hz) * up, damp(7, dt)); c.head.rotation.x = -0.12 * up; }
  } else if (s.act === 'stretch') {
    const a = Math.sin(Math.min(1, s.actK) * Math.PI);
    setHand(c.handL, -hx - 0.15 * a, hy + (d.top - hy + 0.35) * a, hz, f); setHand(c.handR, hx + 0.15 * a, hy + (d.top - hy + 0.35) * a, hz, f); c.body.scale.y *= 1 + 0.08 * a;
  } else if (s.act === 'scratch') {
    setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx * 0.8, d.top - 0.2 + Math.sin(t * 16) * 0.04, 0.05, f); c.body.rotation.z = 0.08;
  } else if (s.act === 'special') {
    if (c.skinId === 'shark') { setHand(c.handL, -hx * 0.9, d.top - 0.25, 0, f); setHand(c.handR, hx * 0.9, d.top - 0.25, 0, f); c.body.rotation.z = Math.sin(t * 8) * 0.12; }
    else if (c.skinId === 'frog') { const tg = c.head.userData.tongue, k = Math.sin(Math.min(1, s.actK) * Math.PI * 3); if (tg) { tg.visible = k > 0.2; tg.scale.z = 0.3 + Math.max(0, k) * 0.5; tg.position.z = 0.44 + Math.max(0, k) * 0.25; } setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx, hy - fl, hz, f); }
    else if (c.skinId === 'tv') { setHand(c.handL, -hx, hy, hz, f); setHand(c.handR, hx, hy, hz, f); c.body.position.x = (Math.random() - 0.5) * 0.03; c.body.rotation.z = (Math.random() - 0.5) * 0.06; }
    else { setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx * 0.3, d.top - 0.45 + Math.sin(t * 12) * 0.05, 0.35, f); c.body.rotation.x = 0.12; }
  } else if (s.zip) {
    // висит на ролике зиплайна: руки вверх, ноги болтаются
    setHand(c.handL, -0.18, d.top + 0.35, 0.05, damp(20, dt)); setHand(c.handR, 0.18, d.top + 0.35, 0.05, damp(20, dt));
    setHand(c.footL, -fx, fy + 0.1 + Math.sin(t * 9) * 0.08, 0.15, f); setHand(c.footR, fx, fy + 0.1 - Math.sin(t * 9) * 0.08, 0.1, f); c.body.rotation.x = -0.15;
  } else if (s.emote) {
    // эмоции (1–4): помахать, танец, смех, позвать
    const e = s.emote, et = s.emoteT || 0;
    if (e === 'wave') { setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx + 0.15, d.top + 0.05 + Math.sin(et * 10) * 0.05, 0.1 + Math.sin(et * 10) * 0.16, damp(20, dt)); c.head.rotation.z = Math.sin(et * 5) * 0.12; }
    else if (e === 'dance') { const b2 = Math.sin(et * 9), b3 = Math.sin(et * 4.5);
      c.body.position.y = Math.abs(b2) * 0.12; c.body.rotation.y = b3 * 0.5; c.body.rotation.z = b2 * 0.12;
      setHand(c.handL, -hx - 0.1, hy + (b3 > 0 ? 0.5 : 0.05), hz + 0.1, damp(14, dt)); setHand(c.handR, hx + 0.1, hy + (b3 > 0 ? 0.05 : 0.5), hz + 0.1, damp(14, dt));
      setHand(c.footL, -fx - 0.05, fy + Math.max(0, b2) * 0.18, 0, f); setHand(c.footR, fx + 0.05, fy + Math.max(0, -b2) * 0.18, 0, f); }
    else if (e === 'laugh') { c.body.rotation.x = -0.25 + Math.sin(et * 22) * 0.05; c.body.position.y = Math.abs(Math.sin(et * 22)) * 0.04;
      setHand(c.handL, -hx * 0.6, hy - 0.05, hz + 0.18, f); setHand(c.handR, hx * 0.6, hy - 0.05 + Math.sin(et * 22) * 0.03, hz + 0.18, f); }
    else if (e === 'call') { c.body.rotation.x = 0.15; const k2 = Math.min(1, et * 4);
      setHand(c.handL, -0.2, d.top - 0.35 * k2, 0.42, damp(14, dt)); setHand(c.handR, 0.2, d.top - 0.35 * k2, 0.42, damp(14, dt)); c.head.rotation.x = -0.1; }
  } else if (s.held2) {
    // держит соперника за одежду, руки на уровне корпуса
    setHand(c.handL, -d.holdX, d.handY, d.holdZ + 0.1, f); setHand(c.handR, d.holdX, d.handY, d.holdZ + 0.1, f); c.body.rotation.x = -0.12;
  } else if (s.restrained) {
    // Упирается ногами, медленно идёт: ступни остаются в обычной ходьбе.
    setHand(c.handL, -hx, hy + 0.08, hz + 0.15, f); setHand(c.handR, hx, hy + 0.1, hz + 0.2, f); c.body.rotation.z = Math.sin(t * 10) * 0.06;
  } else if (s.grabbed) {
    // его держат: болтает руками и ногами
    setHand(c.handL, -hx - 0.2, hy + 0.3 + Math.sin(t * 14) * 0.15, hz, f); setHand(c.handR, hx + 0.2, hy + 0.3 - Math.sin(t * 14) * 0.15, hz, f);
    setHand(c.footL, -fx, fy + 0.1 + Math.max(0, Math.sin(t * 16)) * 0.2, 0.15, f); setHand(c.footR, fx, fy + 0.1 + Math.max(0, -Math.sin(t * 16)) * 0.2, 0.15, f); c.body.rotation.z = Math.sin(t * 12) * 0.15;
  } else if (s.missionTool) {
    setHand(c.handL, -hx, hy, hz, f);
    setHand(c.handR, Math.max(hx, d.holdX) + 0.12, d.holdY, d.holdZ + 0.22, f);
  } else if (s.wave) {
    setHand(c.handL, -hx, hy + fl, hz, f); setHand(c.handR, hx + 0.1, d.top - 0.1 + Math.sin(t * 9) * 0.06, 0.1 + Math.sin(t * 9) * 0.12, f);
  } else if (s.zombie) {
    // зомби: руки вытянуты вперёд, покачиваются
    setHand(c.handL, -hx * 0.7, d.top - 0.45 + Math.sin(t * 4) * 0.05, 0.55, f); setHand(c.handR, hx * 0.7, d.top - 0.45 - Math.sin(t * 4) * 0.05, 0.55, f); c.body.rotation.z += Math.sin(t * 3) * 0.04;
  } else {
    setHand(c.handL, -hx, hy + fl + (run ? Math.abs(cs) * 0.05 : 0), hz + (run ? -sn * 0.35 * k : 0), f);
    setHand(c.handR, hx, hy - fl + (run ? Math.abs(cs) * 0.05 : 0), hz + (run ? sn * 0.35 * k : 0), f);
  }
  // ткань (платок): отстаёт при беге, подлетает в прыжке, трепещет на ветру
  const fl2 = c.torso.userData.flaps;
  if (fl2) { const sp = clamp(s.speed || 0, 0, 1.4), air = s.air ? clamp(-(s.vy || 0) * 0.05, -0.5, 0.7) : 0;
    fl2.forEach((pv, i) => { const u = pv.userData, fl = Math.abs(Math.sin(t * (8 + i * 1.7) + i * 1.3)) * (0.04 + sp * 0.2);
      // только наружу (отрицательный угол): бег — сильнее отлетают задние полоски, прыжок — все подлетают
      const want = Math.min(-0.08, u.base - sp * 0.55 * (0.35 + 0.65 * Math.max(0, u.back + 0.2)) - Math.max(0, air) - fl);
      pv.rotation.x += (want - pv.rotation.x) * damp(9, dt); }); }
  if (s.act !== 'special' && c.head.userData.tongue) c.head.userData.tongue.visible = false;
  if (s.look !== undefined) c.head.rotation.y += (s.look - c.head.rotation.y) * damp(6, dt); else c.head.rotation.y *= 0.9;
  if (s.emote !== 'wave' && s.emote !== 'call') { c.head.rotation.z *= 0.85; c.head.rotation.x *= 0.85; }
  c.handL.rotation.x = s.hold ? -0.6 : run ? sn * 0.5 * k : 0; c.handR.rotation.x = s.hold ? (s.charge ? 0.8 : -0.6) : run ? -sn * 0.5 * k : 0;
  if(s.swat)meleeHand(c,s.swat);
  // присед: тело ниже и сжато, ручки ближе
  // руки опускаем плавно к цели (а не вычитаем каждый кадр — иначе они «проваливаются» сквозь пол)
  c.crouchK = (c.crouchK || 0) + ((s.crouch ? 1 : 0) - (c.crouchK || 0)) * damp(14, dt);
  if (c.crouchK > 0.01) { const k = c.crouchK; c.body.position.y -= 0.34 * k; c.body.scale.y *= 1 - 0.15 * k; if (s.crouch) c.body.rotation.x = 0.25;
    // смещение рук запоминаем и снимаем в начале следующего кадра (см. начало animate)
    const off = Math.min(0.3 * k, Math.max(0, Math.min(c.handL.position.y, c.handR.position.y) - (d.footY + 0.2)));
    c.handOff = off; c.handL.position.y -= off; c.handR.position.y -= off;
    if (s.crouch) { c.footL.position.x = -d.footX - 0.08; c.footR.position.x = d.footX + 0.08; } }
  // точка, где держим предмет: между ладонями или в правой руке при замахе
  if (s.hold && s.charge) c.holdPoint.copy(c.handR.position).add(_up);
  else c.holdPoint.set(0, (c.handL.position.y + c.handR.position.y) / 2 + 0.12, (c.handL.position.z + c.handR.position.z) / 2 + 0.05);
  c.root.localToWorld(c.holdPoint);
  // голос с микрофона: говорит — голова кивает в такт; кричит — дрожит и раздувается
  const tk = c.talk || 0, sh = c.shout || 0;
  if (tk > 0.02 || sh > 0.02 || c.head.scale.x !== 1) {
    c.head.rotation.x += Math.sin(t * 24) * 0.07 * tk; c.head.position.y = Math.abs(Math.sin(t * 18)) * 0.03 * tk;
    c.head.position.x = sh > 0.02 ? (Math.random() - 0.5) * 0.06 * sh : 0; c.head.rotation.z += sh > 0.02 ? (Math.random() - 0.5) * 0.12 * sh : 0;
    const hs = 1 + 0.18 * sh; c.head.scale.setScalar(Math.abs(hs - 1) < 0.005 ? 1 : hs);
  }
  // горловой мешок лягушки: надувается на «ква»
  if (c.sacT !== undefined && c.head.userData.sac) { c.sacT += dt; const sac = c.head.userData.sac, k = c.sacT < 0.4 ? Math.sin(c.sacT / 0.4 * Math.PI) : 0;
    sac.userData.s0 = sac.userData.s0 || sac.scale.clone(); sac.scale.copy(sac.userData.s0).multiplyScalar(1 + k * 0.9); if (c.sacT >= 0.4) c.sacT = undefined; }
  // выражение лица
  c.blinkT -= dt;
  let e = s.stun || s.daze ? 'dizzy' : s.air || s.grabbed || s.emote === 'laugh' || s.emote === 'call' ? 'wow' : 'idle';
  if (e === 'idle' && c.blinkT < 0.12) e = 'blink';
  if (c.blinkT < 0) c.blinkT = 2 + Math.random() * 3;
  if (e !== c.expr) { c.expr = e; c.skin.face && c.skin.face(c, e); }
}
