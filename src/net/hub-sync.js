import {motionNow,sampleMotion} from './motion-buffer.js';
import { THREE, V3 } from '../core/gfx.js';
import { createPlayer } from '../game/player.js';
import { createHubSession } from './hub-session.js';
import { makeCharacter } from '../characters/rig.js';
import { sfx } from '../core/sfx.js';
import { NET, onNet, send, inRoom, others, hubHostId, serverNow } from './net.js';
import { MATCH } from './match-sync.js';

/* Друзья в хабе: каждый клиент 12 раз/с шлёт своё положение и позу (то, что его персонаж получил в animate),
   стоит на месте — раз в 0.5 с. Остальные показывают его копию с задержкой 120 мс и плавным сглаживанием.
   Над чужими персонажами — пиксельный ник: ближе — крупнее и ярче, дальше 24 м — не видно; стены его закрывают
   (обычная проверка глубины, как у самого персонажа). */
const SEND = 1 / 10, IDLE = .5, DELAY = .12, POSE = ['speed', 'air', 'vy', 'climb', 'dive', 'roll', 'slide', 'crouch', 'hold', 'stun', 'getup', 'rag', 'daze', 'ride', 'rideSpeed', 'emote', 'emoteT', 'dangle', 'sit', 'board', 'cyclePhase', 'look','held2','restrained','payload','act','actK','throwT','charge','missionTool'];
const remotes = new Map(); let session=null;
export function configureHubSync(world,options){session=createHubSession(world,remotes,options);return session;} let ballNet = null, lastEm = null, wasGround = true, scene = null, sendT = 0, idleT = 0, last = '', clock = 0, lastHub = 0;

function nameTex(name) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), F = '16px "Press Start 2P", monospace';
  g.font = F; const w = Math.ceil(g.measureText(name).width) + 20; c.width = Math.max(64, w); c.height = 34;
  g.font = F; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(23,17,31,.78)'; g.fillRect(2, 3, c.width - 4, 28); g.fillStyle = '#ff8a1f'; g.fillRect(2, 29, c.width - 4, 2);
  g.fillStyle = '#17111f'; g.fillText(name, c.width / 2 + 2, 19); g.fillStyle = '#f1e8ff'; g.fillText(name, c.width / 2, 17);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return { t, aspect: c.width / c.height };
}
export function makeTag(name) {
  const { t, aspect } = nameTex(name), m = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: true, depthWrite: false, fog: false });
  const s = new THREE.Sprite(m); s.scale.set(.42 * aspect, .42, 1); s.renderOrder = 6; s.userData.aspect = aspect; return s;
}
function spawn(p) {
  if (!scene) return; despawn(p.id);
  const ch = makeCharacter(p.skin), tag = makeTag(p.name); ch.root.visible = false; scene.add(ch.root); scene.add(tag);
  const body=createPlayer(p.skin,ch);
  remotes.set(p.id, { ...body, netKey:"p"+p.id, puppet:true, human:true, bot:true, id: p.id, net: true, root: ch.root, ch, tag, skin: p.skin, name: p.name, buf: [], pos: ch.root.position.clone(), yaw: 0, s: {}, mode: 'hub', seen: 0, lastEm: null });
  if (document.fonts?.load) document.fonts.load('16px "Press Start 2P"').then(() => { const r = remotes.get(p.id); if (r) retag(r, r.name); });
}
function retag(r, name) { r.name = name; const { t, aspect } = nameTex(name); r.tag.material.map?.dispose(); r.tag.material.map = t; r.tag.material.needsUpdate = true; r.tag.userData.aspect = aspect; }
function despawn(id) { const r = remotes.get(id); if (!r) return; r.ch.root.removeFromParent(); r.tag?.removeFromParent(); r.tag?.material.map?.dispose(); r.tag?.material.dispose(); remotes.delete(id); }

export function initHubSync(sc) {
  scene = sc;
  onNet('join', p => spawn(p));
  onNet('leave', id => despawn(id));
  onNet('state', () => { for (const p of others()) { const r = remotes.get(p.id); if (!r) spawn(p); else { if (r.skin !== p.skin) { spawn(p); } else if (r.name !== p.name) retag(r, p.name); } const current=remotes.get(p.id);if(current&&p.scene)current.mode=p.scene; } for (const id of [...remotes.keys()]) if (!NET.players.has(id)) despawn(id); });
  onNet('st', m => { for(const q of (m.id===hubHostId()?m.hs:[])||[]){const a=remotes.get(q.id);if(a){a.mode='hub';a.buf.push({t:motionNow(),x:q.x,y:q.y,z:q.z,yaw:q.r,s:q.s||{}});if(a.buf.length>30)a.buf.shift();}} if (m.bl && m.id===hubHostId() && !session?.host) ballNet = m.bl; const r = remotes.get(m.id); if (!r) return; r.mode = m.m || 'hub'; if (m.x === undefined || r.mode === 'match') return;
    r.buf.push({ t: motionNow(), x: m.x, y: m.y, z: m.z, yaw: m.r, s: m.s || {} }); if (r.buf.length > 30) r.buf.shift(); });
  onNet('ev', m => { const r = remotes.get(m.id), p = NET.players.get(m.id); if (!r || p?.muted) return; if (m.e === 'snd' && r.mode === 'hub') sfx(m.n, { at: r.pos, v: .8 }); });
}
/* звук своего персонажа, который должны услышать остальные (эмоция, прыжок) */
export const netSound = n => { if (inRoom()) send({ t: 'ev', e: 'snd', n }); };

// каждый кадр хаба: P — свой игрок, ch — его модель, mode — что делает (roam/wardrobe/claw/…), camera — для ников
// hold — идёт общая сцена запуска (положения друзей ведёт она); ball — мяч голосования (считает хост)
export function updateHubSync(dt, { P, ch, mode, camera, ball, hold, launchState }) {
  clock += dt; lastHub = performance.now();
  if (!inRoom()) { if (remotes.size) for (const id of [...remotes.keys()]) despawn(id); return; }
  // своё состояние
  if (ch && !ch._netHook) { const f = ch.animate; ch.animate = (d, s) => { ch._netS = s; return f.call(ch, d, s); }; ch._netHook = true; }
  // звуки своего персонажа для остальных: начало эмоции, прыжок
  sendT -= dt; idleT -= dt;
  if (sendT <= 0 && P) { sendT = SEND; const s = {}, src = ch?._netS || {};
    for (const k of POSE) { const v = src[k]; if (v !== undefined && v !== null && v !== false && v !== 0) s[k] = typeof v === 'number' ? Math.round(v * 100) / 100 : v; }
    const m = { t: 'st', m: 'hub', x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), r: +(ch?.root.rotation.y || 0).toFixed(2), s, rtt: NET.rtt };
    if (session?.host && ball && others().length) m.bl = [+ball.x.toFixed(2), +ball.z.toFixed(2), +ball.vx.toFixed(2), +ball.vz.toFixed(2)];
    session?.tick(SEND,P,m);m.x=+P.pos.x.toFixed(3);m.y=+P.pos.y.toFixed(3);m.z=+P.pos.z.toFixed(3);if(session?.host&&hold){m.launchState=launchState;m.launchAt=serverNow();}
    const key = JSON.stringify([m.x,m.y,m.z,m.r,s,m.m,m.bl,m.hs,m.slots,m.door]); if(key!==last||idleT<=0||m.hw?.full||m.hw?.rows.length||m.cmds?.length||m.c?.length||m.fix?.length||m.fx?.length||hold){if(send(m)===false)session?.unsent(m);else{session?.sent(m);last=key;idleT=IDLE;}} }
  // мяч: у гостей подтягиваем к тому, что прислал хост; у хоста друзья толкают мяч своими телами
  if (ball && ballNet && !session?.host) { const k = 1 - Math.exp(-dt * 8); ball.x += (ballNet[0] - ball.x) * k; ball.z += (ballNet[1] - ball.z) * k; ball.vx = ballNet[2]; ball.vz = ballNet[3]; }
  if (ball && NET.host) for (const r of remotes.values()) { if (r.mode !== 'hub' || !r.buf.length) continue; const dx = ball.x - r.pos.x, dz = ball.z - r.pos.z, d = Math.hypot(dx, dz), lim = (ball.r || .95) + .45;
    if (d < lim && d > .01 && r.pos.y < 1.5) { const q = r.buf.at(-1), p0 = r.buf.at(-2) || q, sp = Math.min(9, Math.hypot(q.x - p0.x, q.z - p0.z) / Math.max(.05, q.t - p0.t)); ball.x += dx / d * (lim - d); ball.z += dz / d * (lim - d); const v = Math.max(2.5, sp * 1.1); if (ball.vx * dx / d + ball.vz * dz / d < v) { ball.vx = dx / d * v; ball.vz = dz / d * v; } } }
  // чужие: интерполяция с задержкой, поза, ник
  const at = clock - (session?.host?0:DELAY), cam = camera.position;
  for (const r of remotes.values()) {
    const b = r.buf; if (!b.length) continue;
    if (hold) { tagFor(r, cam); continue; }
    const m=sampleMotion(b,motionNow(),.1),A=m.a,B=m.b,k=m.k;
    r.s=k<.5?A.s:B.s;r.onGround=!r.s.air;r.stun=r.s.stun?1:0;r.getT=r.s.getup||0;r.daze=r.s.daze?1:0;
    r.vel.set((B.x-A.x)/Math.max(.05,B.t-A.t), (B.y-A.y)/Math.max(.05,B.t-A.t),(B.z-A.z)/Math.max(.05,B.t-A.t));
    if(!session?.host)r.pos.set(m.x,m.y,m.z);
    const dy = Math.atan2(Math.sin(B.yaw - A.yaw), Math.cos(B.yaw - A.yaw)); r.yaw = A.yaw + dy * k;
    const show = r.mode === 'hub'; r.ch.root.visible = show; r.ch.root.position.set(m.x,m.y,m.z); r.ch.root.rotation.y = r.yaw;
    if (show) r.ch.animate(dt, { ...(k < .5 ? A.s : B.s), t: clock });
    tagFor(r, cam, show);
  }
}
// ник: высота над головой, размер и яркость от расстояния, дальше 24 м — нет
function tagFor(r, cam, show = true) {if(!r.tag)return;
    const d = cam.distanceTo(r.pos), vis = show ? 1 - THREE.MathUtils.smoothstep(d, 14, 24) : 0;
    r.tag.visible = vis > .02; r.tag.position.set(r.pos.x, r.pos.y + (r.ch.d?.top || 1.8) + .45, r.pos.z);
    const sc = .36 + Math.min(.12, Math.max(0, (10 - d) * .012)); r.tag.scale.set(sc * r.tag.userData.aspect, sc, 1);
    r.tag.material.opacity = vis; const br = .55 + .45 * (1 - THREE.MathUtils.smoothstep(d, 4, 18)); r.tag.material.color.setRGB(br, br, br);
}
// друзья в хабе (для сбора у рогатки и сцены запуска), по номеру игрока
export const remoteActors = (all=false) => [...remotes.values()].filter(r => r.mode==='hub' && (all || r.buf.length)).sort((a, b) => a.id - b.id);
// для «в матче»: хаб не обновляется дольше секунды — сообщаем остальным, что мы не в хабе
setInterval(() => { if (inRoom() && !MATCH.on && performance.now() - lastHub > 1000) send({ t: 'st', m: 'match', rtt: NET.rtt }); }, 2000);
export const remoteMode = id => remotes.get(id)?.mode || 'hub';
