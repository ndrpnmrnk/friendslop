import {motionNow,sampleMotion} from './motion-buffer.js';
import {disposeActorDrone} from '../game/drone.js';
import {takeSounds,retrySounds,receiveSounds} from './audio-sync.js';
import {CoinAwards} from './coin-protocol.js';
import {coinSnapshot,applyCoinSnapshot,hostTakeCoin,showCoinGrant} from '../game/coins.js';
import {claimFistReward} from '../game/collection.js';
import {alignMountedVisual,alignBikePedals} from './rider-visual.js';
import { W, withWorld } from '../world/state.js';
import { withRandom } from '../core/random.js';
import { V3 } from '../core/gfx.js';
import { knockDown, shove, daze, dropHeld, separateActors, releaseDisconnected } from '../game/actors.js';
import { makePuppet, createBots } from '../game/bots.js';
import { cancelBotOnEliminate } from '../missions/bot-work.js';
import { cargoPosition } from '../game/handheld.js';
import { pushOut, pushActorsOut, bumpPushables } from '../world/physics.js';
import { NET, onNet, send, inRoom, others, serverNow } from './net.js';
import { makeTag } from './hub-sync.js';
import { createWorldSync } from './world-sync.js';
import { attachMissionSync } from './mission-sync.js';
import { networkEventSnapshot, receiveNetworkEvents } from '../game/events.js';
import { vector, finite, sweepPosition, SNAPSHOT_INTERVAL, KEYFRAME_INTERVAL, MOTION_INTERVAL, MOTION_DELAY, nextSendAt } from './state-codec.js';
import { motionIntervalFor, worldIntervalFor } from './cadence.js';

export const MATCH = { on: false, host: false, seed: 0, roster: null, scene: null, world: null, missions: null,
  sendT: 0, worldT: 0, fullT: 0, ready: new Set(), members:new Set(), paused: false, final: null, seq: 0, lastHost: 0 };
const POSE = ['speed', 'air', 'vy', 'hang', 'climb', 'dive', 'roll', 'slide', 'crouch', 'hold', 'stun', 'rag', 'daze', 'ride', 'rideSpeed', 'emote', 'emoteT', 'dangle', 'board', 'cyclePhase', 'fly', 'flySpin', 'zombie','zip','getup','kick','trick','rideAir','accel','charge','throwT','act','actK','missionTool','held2','restrained','payload','side','sprint','look','swat','grabbed','vy2'];
let clock = 0, callbacks = {}, lastGuestFrame = 0;
const pendingPositions = new Map();
const commands = [], corrections = new Map(), coinAwards = new CoinAwards();
const fistSession=()=>NET.code+':'+MATCH.seed;
function tryCoinPickup(actor,id){
 if(!MATCH.host||MATCH.final||callbacks.state?.()!=='play')return false;
 const ok=hostTakeCoin(id,actor,(coin,a)=>{
   if(a===W.player){if(claimFistReward(fistSession(),coin.id)!=='new')return false;showCoinGrant();return true;}
   return coinAwards.grant(coin.id,Number(a.netKey?.slice(1)));
 });
 if(ok)MATCH.worldT=0;
 return ok;
}
const pose = src => { const s = {}; if (!src) return s; for (const k of POSE) { const v = src[k]; if (typeof v === 'number' && finite(v)) s[k] = Math.round(v * 100) / 100; else if (typeof v === 'boolean' || typeof v === 'string' && v.length <= 24) s[k] = v; } return s; };
const hook = ch => { if (ch && !ch._netHook) { const f = ch.animate; ch.animate = (d, s) => { ch._netS = s; return f.call(ch, d, s); }; ch._netHook = true; } };
const myKey = () => 'p' + NET.id;
const find = key => key === myKey() ? W.player : W.bots?.find(b => b.netKey === key);
const trusted = m => !!NET.players.get(m.id)?.host;
const event = data => send({ t: 'ev', ep: MATCH.seed, ...data });
const command = data => {
  if (data.kind === 'use' && data.dt > 0) {
    const old = commands.find(q => q.kind === 'use' && q.key === data.key);
    if (old) { old.dt = Math.min(.2, old.dt + data.dt); old.target = data.target; return; }
  }
  if (commands.length < 32) commands.push(data);
};
export const seededMap = (seed, fn) => withRandom(seed, fn);
export const netMatchActive = () => MATCH.on && inRoom();
export const humansInRoom = () => MATCH.on ? Math.max(1,MATCH.members.size) : inRoom() ? NET.players.size : 1;
export const myRank = () => [...(MATCH.on?MATCH.members:NET.players.keys())].sort((a, b) => a - b).indexOf(NET.id);
export const netWaiting = () => MATCH.on && [...MATCH.members].some(id => NET.players.has(id)&&!MATCH.ready.has(id));
export const netPaused = () => MATCH.on && !!MATCH.world && ((!MATCH.startAt || serverNow()<MATCH.startAt) || MATCH.paused || !MATCH.host && MATCH.lastHost && performance.now() - MATCH.lastHost > 2500 || netWaiting());

export function netBeginMatch(seed) {
  netEndMatch();
  Object.assign(MATCH, { on: inRoom(), host: NET.host, seed, roster: null, scene: null, sendT: 0, worldT: 0, fullT: 0,
    paused: false, authority:[...NET.players.values()].find(p=>p.host)?.id, startAt:null, final: null, seq: 0, lastHost: performance.now() });
  MATCH.ready.clear(); pendingPositions.clear(); commands.length = 0;corrections.clear();coinAwards.clear(); clock = 0; lastGuestFrame = 0;
  MATCH.members=new Set(NET.players.keys());
}
export function netEndMatch() {
  const state=MATCH.worldState;
  if(state)withWorld(state,()=>{
    MATCH.missions?.dispose();state.net=null;state.netHit=state.netThrow=state.netTake=state.netPuppet=null;state.coinClaim=null;
    for(const b of state.bots||[])if(b.tag){b.tag.removeFromParent();b.tag.material.map?.dispose();b.tag.material.dispose();b.tag=null;}
  });
  MATCH.on=false;MATCH.worldState=null;MATCH.world=MATCH.missions=null;coinAwards.clear();
}
export function netPrepareMatch(scene) {
  if (!MATCH.on) return;
  MATCH.worldState=W;MATCH.scene = scene; W.player.netKey = myKey(); clock = 0;
  for (const p of others()) if(MATCH.members.has(p.id))addHuman(p);
  if (MATCH.host) {
    const bots = W.bots.filter(b => !b.puppet);
    bots.forEach((b, i) => { b.netKey = 'b' + i; hook(b.ch); });
    MATCH.roster = bots.map(b => ({ name: b.name, skin: b.skin }));
    event({ e: 'roster', bots: MATCH.roster });
  } else if (MATCH.roster) addBotPuppets(MATCH.roster);
  const world = MATCH.world = createWorldSync({ host: MATCH.host, id: NET.id, actor: find, command, myKey: myKey() });
  world.actor = find;
  world.effect=(a,k,v)=>{if(MATCH.host)event({e:'effect',to:a.netKey,k,v});};
  MATCH.missions = attachMissionSync(world, { host: MATCH.host, myKey: myKey(), actor: find, sendEvent: event, command,
    open: m => callbacks.open?.(m), abort: m => callbacks.abort?.(m), award: (a, pts, m) => callbacks.award?.(a, pts, m), now: () => clock });
  W.netPuppet = puppetStep; W.netHit = sendHit; W.netThrow = sendThrow; W.netTake = sendTake;
   W.coinClaim=(id,player)=>MATCH.host?tryCoinPickup(player,id):(command({kind:'coin-take',coin:id}),true);
  hook(W.player.ch);
}
export function netMarkReady(){if(MATCH.on&&MATCH.world&&!MATCH.ready.has(NET.id)){MATCH.ready.add(NET.id);MATCH.fullT=0;event({e:'match-ready'});}}
function addHuman(p) {
  if (!MATCH.scene || find('p' + p.id)) return;
  const b = makePuppet(MATCH.scene, p.skin, p.name, 'p' + p.id);
  b.human = true;b.pos=b.pos.clone(); b.tag = makeTag(p.name); MATCH.scene.add(b.tag);
  b.pos.copy(W.player.pos); b.root.visible = false;
}
function addBotPuppets(list) {
  if (!MATCH.scene) return;
  for(const b of W.bots.slice())if(!b.human&&Number(b.netKey?.slice(1))>=list.length)removeBot(b);
  list.forEach((q, i) => {if(!find('b'+i))makePuppet(MATCH.scene, q.skin, q.name, 'b' + i);});
}
function removeBot(b){
  cancelBotOnEliminate(b);MATCH.world?.locally(()=>releaseDisconnected(b));MATCH.missions?.disconnect(b.netKey);
  disposeActorDrone(b);b.root.removeFromParent();b.tag?.removeFromParent();
  W.interacts=W.interacts.filter(q=>q.actor!==b);W.bots=W.bots.filter(a=>a!==b);
}
function syncBots(){
  if(!MATCH.host||!MATCH.world||!['intro','play'].includes(callbacks.state?.()))return;
  const count=NET.botsEnabled?Math.max(0,(callbacks.botCount?.()??4)-(MATCH.members.size-1)):0;
  const bots=W.bots.filter(b=>!b.human);if(bots.length===count)return;
  for(const b of bots)removeBot(b);
  if(count){const humans=W.bots;W.bots=[];const created=createBots(MATCH.scene,W.player.ch.skinId,count);W.bots=[...humans,...created];created.forEach((b,i)=>{b.netKey='b'+i;hook(b.ch);});}
  MATCH.roster=W.bots.filter(b=>!b.human).map(b=>({name:b.name,skin:b.skin}));MATCH.fullT=0;event({e:'roster',bots:MATCH.roster});
}
function actorPacket(a) {
  return [a.netKey, +a.pos.x.toFixed(3), +a.pos.y.toFixed(3), +a.pos.z.toFixed(3), +a.root.rotation.y.toFixed(3),
    pose(a.ch._netS), Math.round(a === W.player ? callbacks.score?.() || 0 : a.score || 0), a.puppet ? (a.buf.at(-1)?.v??0) : a.hidden || a.drone || a.returning&&a.returning.t<1.25 ? 0 : 1,
    a.st || {}, MATCH.world.keyOf(a.holding), MATCH.world.keyOf(a.heldBy),callbacks.droneState?.(a)];
}
function receiveActors(rows) {
  for (const q of rows || []) {
    const a = find(q[0]); if (!a) continue;
    if (a !== W.player) push(a, q[1], q[2], q[3], q[4], q[5], q[6], q[7]);
    else callbacks.setScore?.(q[6]);
    a.st = q[8] || {}; a.holding = find(q[9]) || null; a.heldBy = find(q[10]) || null;
    if(a!==W.player)callbacks.droneApply?.(a,q[11]);
  }
}
export function netMatchTick(dt, P) {
  if (!MATCH.on || !MATCH.world || !P) return;
  syncAuthority();
  syncBots();
  clock += dt; MATCH.worldT -= dt; MATCH.fullT -= dt;
  if (MATCH.host){P.score = callbacks.score?.() || 0;coinAwards.flush(performance.now(),(coin,to)=>event({e:'effect',to:'p'+to,k:'coin-award',v:{coin}}));}
  if(callbacks.state?.()==='play')separateActors();if(MATCH.host&&!netPaused())for(const b of W.bots)if(b.human&&!b.drone&&!b.returning&&!b.ride&&!b.grab)bumpPushables(b,dt);
  const now=motionNow();if (now < MATCH.sendT) return;
  const interval=netPaused()?.5:motionIntervalFor(NET.players.size,NET.ws?.bufferedAmount||0);
   MATCH.sendT = nextSendAt(MATCH.sendT,now,interval);NET.sendRateHz=Math.round(1/interval);hook(P.ch);
  if(MATCH.host&&!netWaiting()&&!MATCH.startAt)MATCH.startAt=serverNow()+300;
  const n = ++MATCH.seq;
  const m = { t: 'st', m: 'match', protocol: 2, ep: MATCH.seed, n, x: +P.pos.x.toFixed(3), y: +P.pos.y.toFixed(3), z: +P.pos.z.toFixed(3),
    fx:takeSounds(), r: +P.root.rotation.y.toFixed(3), s: pose(P.ch._netS), rtt: NET.rtt, dr:callbacks.droneState?.(P), v: P.hidden || P.drone || P.returning&&P.returning.t<1.25 ? 0 : 1 };
  if (MATCH.host) {
    // One broadcast state is received by every guest. Use ALL active human
    // player positions for the shared priority set; not only the host.
    const interest={viewers:[P,...W.bots.filter(b=>b.human&&!b.returning)],
      queued:NET.ws?.bufferedAmount||0,now:performance.now()};
    m.h = [P, ...W.bots].map(actorPacket);m.fix=[...corrections.values()];const pm=MATCH.world.motionEntries(interest);if(pm.length)m.pm=pm;
    if (MATCH.worldT <= 0 && callbacks.state?.() !== 'results' && callbacks.state?.() !== 'finale') {
      MATCH.worldT = worldIntervalFor(NET.players.size); const full = MATCH.fullT <= 0; if (full) MATCH.fullT = KEYFRAME_INTERVAL;
      m.w = { d: MATCH.world.capture(full,interest), missions: MATCH.missions.snapshot(), events: networkEventSnapshot(),
        clock, startAt:MATCH.startAt, time: callbacks.time?.(), state: callbacks.state?.(), ruined:MATCH.world.destructionState?.(),candies:callbacks.candyState?.(),coins:coinSnapshot(), paused: MATCH.paused || netWaiting(), ready:[...MATCH.ready], roster: MATCH.roster };
    }
  } else if (MATCH.worldT <= 0 && callbacks.state?.() === 'play') { MATCH.worldT = worldIntervalFor(NET.players.size); m.c = MATCH.world.proposals(); }
  if (!MATCH.host && commands.length) m.cmds = commands.slice();
  if (send(m) !== false) { if(m.cmds)commands.splice(0,m.cmds.length);if(MATCH.host)corrections.clear(); pendingPositions.set(n, [m.x, m.y, m.z]); if (pendingPositions.size > 40) pendingPositions.delete(pendingPositions.keys().next().value); }
  else {retrySounds(m.fx);if(MATCH.host){MATCH.fullT=0;MATCH.world.retryMotion();}else MATCH.world.retryProposals();}
}
function push(b, x, y, z, r, s = {}, sc, v = 1) {
  if (!vector([x, y, z]) || !finite(r)) return;
  b.buf.push({ t: motionNow(), x, y, z, r, s: pose(s), v }); if (b.buf.length > 24) b.buf.shift();
  if (sc !== undefined) b.score = sc;
}
function puppetStep(b, dt, t) {
  const buf = b.buf;
  if (!buf.length) { b.ch.animate(dt, { t, speed: 0 }); return; }
  const m=sampleMotion(buf,motionNow(),MOTION_DELAY),A=m.a,B=m.b,k=m.k;
  b.vel.set((B.x - A.x) / Math.max(.05, B.t - A.t), (B.y - A.y) / Math.max(.05, B.t - A.t), (B.z - A.z) / Math.max(.05, B.t - A.t));
  if(MATCH.host&&b.netVelocity)b.vel.copy(b.netVelocity);
  if(!MATCH.host||!b.human)b.pos.set(m.x,m.y,m.z);b.root.position.set(m.x,m.y,m.z); b.onGround = !(k < .5 ? A.s : B.s).air;
  b.root.rotation.y = A.r + Math.atan2(Math.sin(B.r - A.r), Math.cos(B.r - A.r)) * k; b.root.visible = !!B.v;
  const s = k < .5 ? A.s : B.s; b.stun = s.stun ? 1 : 0;alignBikePedals(b,s); hook(b.ch); b.ch.animate(dt, { ...s, t });
  // Vehicle visual receives a newer authoritative sample than the actor buffer.
  // Keep the seated model on the actual rendered bicycle/cart every graphics frame.
  alignMountedVisual(b);
  if(b.held){cargoPosition(b,b.held.pos,b.held.def.r);b.held.g.rotation.y=b.root.rotation.y;}
  if (b.tag) { b.tag.visible = b.root.visible; b.tag.position.set(b.root.position.x, b.root.position.y + (b.ch.d?.top || 1.8) + .45, b.root.position.z); }
}
function sendTake(it){
  if(!MATCH.on||MATCH.host||!it?.netId)return;
  // Even the owner of a mission scope must ask the host before taking an item.
  // Otherwise the client's local scope could bypass authoritative pickup.
  it.netPendingTakeAt=performance.now();
  MATCH.world.request('take',it);
}
function sendThrow(it, from, vel) { if (MATCH.on && !MATCH.world.ownsScope?.(it.netScope)) MATCH.world.request('throw', it, { v: vel.toArray() }); }
function sendHit(a, k, args) {
  if (!MATCH.on) return;
  if (MATCH.host) { if (k !== 'daze') dropHeld(a, args[0], args[1]); event({ e: 'hit', to: a.netKey, k, a: args }); }
  else command({ kind: 'hit', to: a.netKey, k, a: args });
}
function guestState(m) {
  const b = find('p' + m.id); if (!b || !vector([m.x, m.y, m.z]) || !finite(m.r) || (m.n | 0) <= (b.netSeq || 0)) return;
  b.netSeq = m.n;
  let p = [m.x, m.y, m.z];
  if (callbacks.state?.() === 'play' && b.buf.length && !m.s?.fly && !m.dr && !b.ride && !b.grab) {
    const from = b.buf.at(-1), start = [from.x, from.y, from.z];
    const elapsed = Math.min(.6, Math.max(.05, clock - (b.netAt || clock)));
    if (Math.hypot(p[0] - start[0], p[2] - start[2]) > 32 * elapsed + 2) p = start;
    p = sweepPosition(start, p, b.r, q => {pushOut(q,b.r,q.y+b.step,q.y+b.h);pushActorsOut(q,b);});
    if (Math.hypot(p[0] - m.x, p[2] - m.z) > .12) corrections.set(b.netKey,{to:b.netKey,n:m.n,p});
  }
  const previous=b.buf.at(-1),elapsed=Math.max(.05,clock-(b.netAt||clock));b.netVelocity=new V3(previous?(p[0]-previous.x)/elapsed:0,previous?(p[1]-previous.y)/elapsed:0,previous?(p[2]-previous.z)/elapsed:0);
  b.netAt = clock;
  if(b.heldBy){const dx=p[0]-b.heldBy.pos.x,dz=p[2]-b.heldBy.pos.z,d=Math.hypot(dx,dz);if(d>1.2){p[0]=b.heldBy.pos.x+dx/d*1.2;p[2]=b.heldBy.pos.z+dz/d*1.2;corrections.set(b.netKey,{to:b.netKey,n:m.n,p});}}
  callbacks.droneApply?.(b,m.dr);
  push(b, ...p, m.r, m.s || {}, b.score || 0, m.v); b.pos.fromArray(p);
  if(!MATCH.final)for(const cmd of (m.cmds||[]).slice(0,32))handleCommand(b,cmd);
  if (m.c && !MATCH.final) MATCH.world.accept(m.c, b);receiveSounds(m.fx,b);
}
function handleCommand(a,m){
  if(!m||typeof m!=='object')return;
  if(m.rows)MATCH.world.accept(m.rows,a);
  if(m.kind==='coin-ack'){if(MATCH.host)coinAwards.acknowledge(m.coin,Number(a.netKey?.slice(1)));return;}
  if(m.kind==='coin-take'){if(MATCH.host)tryCoinPickup(a,m.coin);return;}
  if(['claim','finish','chain'].includes(m.kind))MATCH.missions.handle(a,m);
  else if(m.kind==='hit'){const target=find(m.to);if(target&&a.pos.distanceTo(target.pos)<3&&['knock','shove','daze'].includes(m.k)&&Array.isArray(m.a)&&m.a.every(v=>finite(v,30))){if(target.puppet)sendHit(target,m.k,m.a);else applyHit(target,m.k,m.a);}}
  else MATCH.world.act(a,m);
  if(['take','mount','cart','claim','drop'].includes(m.kind))MATCH.fullT=0;
}
export function netPublishFinal(rows, replay = null) {
  if (!MATCH.on || !MATCH.host) return;
  MATCH.final = { rows, replay }; event({ e: 'final', ...MATCH.final });
}
export function initMatchSync(options = {}) {
  callbacks = options;
  onNet("state",()=>{if(MATCH.on)syncAuthority();});
  onNet('st', m => {
    if (!MATCH.on || !MATCH.world || m.m !== 'match' || m.ep !== MATCH.seed || m.protocol !== 2) return;
    if (MATCH.host) { if (!trusted(m)) guestState(m); return; }
    if (!trusted(m) || (m.n | 0) <= lastGuestFrame) return;
    lastGuestFrame = m.n; MATCH.lastHost = performance.now();
    if (m.w) {
      if(Number.isFinite(m.w.startAt))MATCH.startAt=m.w.startAt;
      if(Number.isFinite(m.w.clock))clock=m.w.clock;
      if(m.w.ready)MATCH.ready=new Set(m.w.ready);
      if (m.w.roster) { MATCH.roster = m.w.roster; addBotPuppets(MATCH.roster); }
      MATCH.world.receiveDestruction?.(m.w.ruined);
      MATCH.missions.receive(m.w.missions || []);
      receiveNetworkEvents(m.w.events, callbacks.eventUi);callbacks.candyApply?.(m.w.candies);
      MATCH.world.receive(m.w.d);if(m.w.coins)applyCoinSnapshot(m.w.coins); MATCH.paused = !!m.w.paused; callbacks.setTime?.(m.w.time);
    }
    if(m.pm)MATCH.world.receiveMotion(m.pm);
    receiveSounds(m.fx);for(const q of m.fix||[])applyCorrection(q);receiveActors(m.h);
  });
  onNet('ev', m => {
    if (m.e === 'roster' && trusted(m) && m.ep === MATCH.seed) { MATCH.roster = m.bots; if (MATCH.scene) addBotPuppets(m.bots); return; }
    if (!MATCH.on || m.ep !== MATCH.seed) return;
    if (m.e === 'match-ready' && MATCH.host) { MATCH.ready.add(m.id); MATCH.fullT = 0; event({ e: 'roster', bots: MATCH.roster || [] }); return; }
    if (m.e === 'cmd' && MATCH.host && !MATCH.final && MATCH.world) {
      const a = find('p' + m.id); if (!a) return;
      handleCommand(a,m); return;
    }
    if (!trusted(m)) return;
    if (m.e === 'mission-grant') MATCH.missions?.grant(m);
    else if (m.e === 'hit' && m.to === myKey()) applyHit(W.player, m.k, m.a || []);
    else if(m.e==='effect'&&m.to===myKey()){
      if(m.k==='coin-award'&&Number.isSafeInteger(m.v?.coin)){
        const result=claimFistReward(fistSession(),m.v.coin);
        if(result!=='failed'){
          if(result==='new')showCoinGrant();
          event({e:'cmd',kind:'coin-ack',coin:m.v.coin});
        }
      }else callbacks.effect?.(W.player,m.k,m.v||{});
    }
    else if (m.e === 'host-pause') { MATCH.paused = !!m.paused; callbacks.pause?.(MATCH.paused); }
    else if (m.e === 'correction') applyCorrection(m); else if (m.e === 'final') { MATCH.final = { rows: m.rows, replay: m.replay }; callbacks.final?.(); }
  });
  onNet('leave', id => {
    if (!MATCH.on) return; MATCH.members.delete(id);MATCH.ready.delete(id);const b = find('p' + id); if (!b || !b.puppet) return;
    MATCH.world?.locally(()=>releaseDisconnected(b));if (MATCH.host) {MATCH.missions?.disconnect(b.netKey);MATCH.fullT=0;}
    b.root.removeFromParent(); b.tag?.removeFromParent(); b.tag?.material.map?.dispose(); b.tag?.material.dispose(); W.bots.splice(W.bots.indexOf(b), 1);
  });
  document.addEventListener('visibilitychange', () => {
    if (!MATCH.on || !MATCH.host) return;
    MATCH.paused = document.hidden; MATCH.fullT = 0; event({ e: 'host-pause', paused: MATCH.paused });
  });
}
function applyCorrection(m){if(m.to!==myKey()||!vector(m.p))return;
      const sent = pendingPositions.get(m.n); if (!sent || Math.hypot(W.player.pos.x-sent[0],W.player.pos.z-sent[2])>8 || Math.abs(W.player.pos.y-sent[1])>8) return;pendingPositions.delete(m.n);
      W.player.pos.x += m.p[0] - sent[0]; W.player.pos.z += m.p[2] - sent[2];
      pushOut(W.player.pos, W.player.r, W.player.pos.y + W.player.step, W.player.pos.y + W.player.h);
    }
function applyHit(a, k, v) { if (!a) return; if (k === 'knock') knockDown(a, v[0], v[1], v[2]); else if (k === 'shove') shove(a, v[0], v[1], v[2], v[3], !!v[4]); else if (k === 'daze') daze(a, v[0]); }

function syncAuthority(){
 const elected=[...NET.players.values()].find(p=>p.host)?.id;
 if(!elected||MATCH.authority===elected)return;MATCH.authority=elected;
 MATCH.host=NET.host;commands.length=0;corrections.clear();MATCH.paused=false;MATCH.lastHost=performance.now();MATCH.fullT=0;lastGuestFrame=0;
 MATCH.world?.setHost(NET.host);MATCH.missions?.setHost(NET.host);
 if(NET.host&&MATCH.world){
   for(const b of W.bots)if(!b.human){b.puppet=false;b.facing=b.root.rotation.y;b.throwCD=2;b.goal=null;}
   event({e:'roster',bots:MATCH.roster||[]});
 }
}
