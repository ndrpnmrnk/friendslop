import {motionNow,sampleMotion} from './motion-buffer.js';
import {alignMountedVisual,alignBikePedals} from './rider-visual.js';
import { THREE, V3 } from '../core/gfx.js';
import { createPlayer } from '../game/player.js';
import { createHubSession } from './hub-session.js';
import { makeCharacter } from '../characters/rig.js';
import { sfx } from '../core/sfx.js';
import { NET, onNet, send, inRoom, others, hubHostId, serverNow } from './net.js';
import { MATCH } from './match-sync.js';
import {MOTION_INTERVAL as SEND,MOTION_DELAY,nextSendAt} from './state-codec.js';
import {motionIntervalFor} from './cadence.js';

/* Друзья в хабе: движение до 20 раз/с, снимки мира 5 раз/с, покой раз в 0.5 с.
   Короткий буфер 75 мс отделён от физической позиции и часов раунда.
   Над чужими персонажами — пиксельный ник: ближе — крупнее и ярче, дальше 24 м — не видно; стены его закрывают
   (обычная проверка глубины, как у самого персонажа). */
const IDLE = .5, POSE = ['speed', 'air', 'vy', 'climb', 'dive', 'roll', 'slide', 'crouch', 'hold', 'stun', 'getup', 'rag', 'daze', 'ride', 'rideSpeed', 'emote', 'emoteT', 'dangle', 'sit', 'board', 'cyclePhase', 'look','held2','restrained','payload','act','actK','throwT','charge','missionTool'];
const remotes = new Map(); let session=null;
export function configureHubSync(world,options){session=createHubSession(world,remotes,options);return session;} let lastEm = null, wasGround = true, scene = null, sendT = 0, idleT = 0, last = '', clock = 0, lastHub = 0,lastHubSend=0;

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
  onNet('st', m => { for(const q of (m.id===hubHostId()?m.hs:[])||[]){if(q.id===m.id)continue;const a=remotes.get(q.id);if(a){a.mode='hub';a.buf.push({t:motionNow(),x:q.x,y:q.y,z:q.z,yaw:q.r,s:q.s||{}});if(a.buf.length>30)a.buf.shift();}} const r = remotes.get(m.id); if (!r) return; r.mode = m.m || 'hub'; if (m.x === undefined || r.mode === 'match') return;
    r.buf.push({ t: motionNow(), x: m.x, y: m.y, z: m.z, yaw: m.r, s: m.s || {} }); if (r.buf.length > 30) r.buf.shift(); });
  onNet('ev', m => { const r = remotes.get(m.id), p = NET.players.get(m.id); if (!r || p?.muted) return; if (m.e === 'snd' && r.mode === 'hub') sfx(m.n, { at: r.pos, v: .8 }); });
}
/* звук своего персонажа, который должны услышать остальные (эмоция, прыжок) */
export const netSound = n => { if (inRoom()) send({ t: 'ev', e: 'snd', n }); };

// каждый кадр хаба: P — свой игрок, ch — его модель, mode — что делает (roam/wardrobe/claw/…), camera — для ников
// hold — идёт общая сцена запуска (положения друзей ведёт она); ball — мяч голосования (считает хост)
export function updateHubSync(dt, { P, ch, mode, camera, ball, hold, launchState }) {
  clock += dt; lastHub = performance.now();session?.presence();
  if (!inRoom()) { if (remotes.size) for (const id of [...remotes.keys()]) despawn(id); return; }
  // своё состояние
  if (ch && !ch._netHook) { const f = ch.animate; ch.animate = (d, s) => { ch._netS = s; return f.call(ch, d, s); }; ch._netHook = true; }
  // звуки своего персонажа для остальных: начало эмоции, прыжок
  const now=motionNow();idleT -= dt;
   const sendInterval=motionIntervalFor(NET.players.size,NET.ws?.bufferedAmount||0);NET.sendRateHz=Math.round(1/sendInterval);
  if (now >= sendT && P && !session?.away) { const elapsed=lastHubSend?Math.min(.5,now-lastHubSend):SEND;lastHubSend=now;sendT=nextSendAt(sendT,now,sendInterval); const s = {}, src = ch?._netS || {};
    for (const k of POSE) { const v = src[k]; if (v !== undefined && v !== null && v !== false && v !== 0) s[k] = typeof v === 'number' ? Math.round(v * 100) / 100 : v; }
    const m = { t: 'st', m: 'hub', x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), r: +(ch?.root.rotation.y || 0).toFixed(2), s, rtt: NET.rtt };
    session?.tick(elapsed,P,m);m.x=+P.pos.x.toFixed(3);m.y=+P.pos.y.toFixed(3);m.z=+P.pos.z.toFixed(3);if(session?.host&&hold){m.launchState=launchState;m.launchAt=serverNow();}
    const key = JSON.stringify([m.x,m.y,m.z,m.r,s,m.m,m.pm,m.hs,m.slots,m.door]); if(key!==last||idleT<=0||m.hw?.full||m.hw?.rows.length||m.cmds?.length||m.c?.length||m.fix?.length||m.fx?.length||hold){if(send(m)===false)session?.unsent(m);else{session?.sent(m);last=key;idleT=IDLE;}} }
  // Мяч получает единый host-authority поток pm/hw, без второго клиентского толчка.
  // чужие: интерполяция с задержкой, поза, ник
  const cam = camera.position;
  for (const r of remotes.values()) {
    const b = r.buf; if (!b.length) continue;
    if (hold) { tagFor(r, cam); continue; }
    const m=sampleMotion(b,now,MOTION_DELAY),A=m.a,B=m.b,k=m.k;
    r.s=k<.5?A.s:B.s;r.onGround=!r.s.air;r.stun=r.s.stun?1:0;r.getT=r.s.getup||0;r.daze=r.s.daze?1:0;
    r.vel.set((B.x-A.x)/Math.max(.05,B.t-A.t), (B.y-A.y)/Math.max(.05,B.t-A.t),(B.z-A.z)/Math.max(.05,B.t-A.t));
    if(!session?.host)r.pos.set(m.x,m.y,m.z);
    const dy = Math.atan2(Math.sin(B.yaw - A.yaw), Math.cos(B.yaw - A.yaw)); r.yaw = A.yaw + dy * k;
    const show = r.mode === 'hub'; r.ch.root.visible = show; r.ch.root.position.set(m.x,m.y,m.z); r.ch.root.rotation.y = r.yaw;
    if (show) {
      const pose=k<.5?A.s:B.s;
      alignBikePedals(r,pose);
      r.ch.animate(dt, { ...pose, t: clock });
      // Rider and vehicle must share the exact displayed position in this frame.
      alignMountedVisual(r);
    }
    tagFor(r, cam, show);
  }
}
// ник: высота над головой, размер и яркость от расстояния, дальше 24 м — нет
function tagFor(r, cam, show = true) {if(!r.tag)return;
    const d = cam.distanceTo(r.pos), vis = show ? 1 - THREE.MathUtils.smoothstep(d, 14, 24) : 0;
    r.tag.visible = vis > .02; r.tag.position.set(r.root.position.x, r.root.position.y + (r.ch.d?.top || 1.8) + .45, r.root.position.z);
    const sc = .36 + Math.min(.12, Math.max(0, (10 - d) * .012)); r.tag.scale.set(sc * r.tag.userData.aspect, sc, 1);
    r.tag.material.opacity = vis; const br = .55 + .45 * (1 - THREE.MathUtils.smoothstep(d, 4, 18)); r.tag.material.color.setRGB(br, br, br);
}
// друзья в хабе (для сбора у рогатки и сцены запуска), по номеру игрока
export const remoteActors = (all=false) => [...remotes.values()].filter(r => r.mode==='hub' && (all || r.buf.length)).sort((a, b) => a.id - b.id);
// Presence follows real hub lifecycle, not throttled rAF in a background tab.
setInterval(()=>session?.presence(),1000);
export const remoteMode = id => remotes.get(id)?.mode || 'hub';
