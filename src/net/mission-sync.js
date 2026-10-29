import {withSoundSource} from '../core/sfx.js';
import { W } from '../world/state.js';
import { THREE, V3 } from '../core/gfx.js';
import { withRandom, hashSeed } from '../core/random.js';
import { M, restoreMission, removeMission, startMissionClock, canReach, ALL_GAMES, WORLD_GAMES } from '../missions/missions.js';
import { destroySection } from '../world/sections.js';
import { buildDemolitionRuins } from '../missions/demolition.js';
import { MissionLeases } from './state-codec.js';

// Хост выбирает/резервирует миссии, считает сроки и начисляет очки.
// Исполнитель ведёт интерактивную мини-игру без задержки мыши; её объекты видят все.
// Это кооперативная host-authority схема, а не серверная защита от читов.
export function attachMissionSync(world, { myKey, host, actor, sendEvent, command, open, abort, award, now }) {
  const leases = new MissionLeases(), spectators = new Map(), pending = new Set(), finished = new Set();
  let receiving = false;
  const root = m => m.obj.g || m.obj.root;
  const scope = m => 'm' + m.id + '/w' + m.netLease.token + '/s' + (m.netStage || 0);
  const find = id => M.list.find(m => m.id === id);
  const leaseOwner = m => actor(m.netLease?.actor);
  const stopSpectator = id => { const job = spectators.get(id); if (job) { spectators.delete(id); job.game.stop?.(); } };

  function work(m, kind, build) {
    m.netKind = kind;
    const seed = hashSeed(m.netRecipe.seed + '/' + m.netLease.token + '/' + (m.netStage || 0));
    return world.scope(scope(m), () => withSoundSource(leaseOwner(m),()=>withRandom(seed, build)), [root(m)].filter(Boolean));
  }
  function observe(m) {
    if (!m.netLease || m.netLease.actor === myKey) return;
    const token = scope(m), old = spectators.get(m.id);
    if (old?.token === token) return;
    stopSpectator(m.id);
    const a = leaseOwner(m); if (!a) return;
    const camera = new THREE.PerspectiveCamera(), api = { feedback() {}, msg() {}, countdown() {}, timer() {}, progress() {}, where() {}, finish() {},
      pose(p, l) { if (p && l) { camera.position.copy(p); camera.lookAt(l); camera.updateMatrixWorld(); } } };
    const ctx = { bot: true, player: a, character: a.ch, cursor() {}, camera, mission: m,
      free: () => true, enterCrane() {}, exitCrane() {},
      give(it) { it.owner = a; it.state = 'held'; it.mission = m; a.held = it; } };
    const fn = (m.netKind === 'world' ? WORLD_GAMES : ALL_GAMES)[m.def.game];
    if (!fn) return;
    const game = work(m, m.netKind, () => fn(m.obj, api, ctx));
    spectators.set(m.id, { token, game });
  }
  function claim(m, a) {
    if (!m || m.owner && m.owner !== a || m.netLease && m.netLease.actor !== world.keyOf(a)) return null;
    if (!m.netLease) {
      if (m.busy || m.doer || m.claimedBy && m.claimedBy !== a) return null;
      const at = m.obj.approach ? m.obj.approach(a.pos) : m.obj.front ? m.obj.front() : m.obj.pos();
      if (!canReach(a, at, m.obj.solid, (m.key === 'cat' ? 1.6 : m.obj.reach || 1.8) + .35)) return null;
      m.netLease = leases.claim(m.id, world.keyOf(a), now());
      m.netStage = 0; m.netKind = m.def.world ? 'world' : 'panel';
      startMissionClock(m); m.claimedBy = a; m.busy = true;
      m.onRemove = () => { stopSpectator(m.id); };
      m.onExpire = () => { abort(m); removeMission(m); };
    }
    return m.netLease;
  }
  function ensure(m) {
    if (receiving) return true;
    if (m.netLease?.actor === myKey && !finished.has(m.netLease.token)) return true;
    if (host) return !!claim(m, W.player);
    if (!pending.has(m.id)) { pending.add(m.id); command({ kind: 'claim', mid: m.id }); }
    return false;
  }
  function finish(m, res, isWorld) {
    if (receiving || world.applying) return true;
    if (!m.netLease) return true;
    const rows = host ? null : world.proposals(true);
    finished.add(m.netLease.token);
    const msg = { kind: 'finish', mid: m.id, token: m.netLease.token, res: res ? { success: !!res.success, mult: res.mult } : null, world: !!isWorld };
    if (host) handle(W.player, msg); else command({ ...msg, rows });
    return true;
  }
  function chain(m, game) {
    if (receiving || !m.netLease) return;
    const msg = { kind: 'chain', mid: m.id, token: m.netLease.token, game };
    if (host) handle(W.player, msg); else command({ ...msg, rows: world.proposals(true) });
    // Исполнитель сразу открывает следующую часть, хост подтвердит её тем же номером.
    if (!host) m.netStage = (m.netStage || 0) + 1;
  }
  function handle(a, msg) {
    const m = find(msg.mid), key = world.keyOf(a); if (!m) return;
    if (msg.kind === 'claim') {
      const lease = claim(m, a);
      sendEvent({ e: 'mission-grant', to: key, mid: m.id, lease });
      if (lease) observe(m);
      return;
    }
    if (!leases.owns(m.id, key, msg.token)) return;
    if (msg.kind === 'chain') {
      const allowed = { salad: 'saladCut', bulb: 'bulbScrew', intercom: 'keypad', mammoth: 'mammothDress' };
      if (allowed[m.key] !== msg.game) return;
      stopSpectator(m.id); m.netStage = (m.netStage || 0) + 1;
      m.def = { ...m.def, world: false, game: msg.game }; m.netKind = 'panel'; observe(m); return;
    }
    if (msg.kind !== 'finish') return;
    if (!msg.res && !msg.world) {
      leases.release(m.id, key, msg.token); stopSpectator(m.id); m.netLease = null; m.busy = false; m.doer = m.claimedBy = null; m.progress = 0; return;
    }
    if (!leases.finish(m.id, key, msg.token)) return;
    if (msg.res?.success && now() - m.netLease.since >= .1) {
      const mult = Number.isFinite(msg.res.mult) ? Math.max(0, Math.min(2, msg.res.mult)) : 1;
      award(a, Math.round(m.pts * mult * (W.scoreMul || 1)), m);
    }
    stopSpectator(m.id); removeMission(m);
  }
  function receive(list) {
    receiving = true;
    try {
      const ids = new Set(list.map(q => q.r.id));
      for (const m of M.list.slice()) if (!ids.has(m.id)) { abort(m); stopSpectator(m.id); if (M.list.includes(m)) removeMission(m, true); }
      for (const q of list) {
        let m = find(q.r.id);
        if (!m) m = restoreMission(q.r, actor(q.owner));
        if (!m) continue;
        const oldToken = m.netLease?.token;
        if (oldToken && oldToken !== q.lease?.token) { abort(m); stopSpectator(m.id); }
        m.netLease = q.lease; m.netStage = q.stage; m.netKind = q.kind;
        m.def = { ...m.def, game: q.game, world: q.kind === 'world' };
        m.life = q.life; m.activeLeft = q.left; m.activeMax = q.max; m.busy = q.busy; m.progress = q.progress;
        m.claimedBy = q.lease ? actor(q.lease.actor) : null; m.doer = q.busy && q.kind === 'panel' ? m.claimedBy : null;
        if (m.netLease && m.netLease.actor !== myKey) observe(m);
      }
    } finally { receiving = false; }
  }
  function grant(msg) {
    if (msg.to !== myKey) return;
    pending.delete(msg.mid);
    const m = find(msg.mid); if (!m || !msg.lease) return;
    m.netLease = msg.lease; m.netStage = 0; m.claimedBy = W.player; m.busy = false; open(m);
  }
  function snapshot() {
    return M.list.map(m => ({ r: m.netRecipe, owner: world.keyOf(m.owner), lease: m.netLease || null, stage: m.netStage || 0,
      kind: m.netKind || (m.def.world ? 'world' : 'panel'), game: m.def.game, life: m.life, left: m.activeLeft ?? null,
      max: m.activeMax ?? null, busy: !!(m.busy || m.doer), progress: m.progress || 0 }));
  }
  world.ownsScope = name => { const m = find(Number(/^m(\d+)\//.exec(name)?.[1])); if(!m)return host;return !!m?.netLease && (m.netLease.actor === myKey || host && m.netLease.actor.startsWith('b')) && !finished.has(m.netLease.token); };
  world.getMission=find;
  world.remoteOwns = (key, a) => { const match = /^[a-z]:m(\d+)\/(?:build|w\d+\/s\d+)\//.exec(key); const m = match && find(Number(match[1])); return !!m?.netLease && m.netLease.actor === world.keyOf(a); };
  world.demolish=a=>{
    if(!host||!M.list.some(m=>m.key==='demolition'&&m.netLease?.actor===world.keyOf(a)&&now()-m.netLease.since>=9))return;
    const u=W.university;if(!u||u.netDestroyed)return;
    destroySection(u);u.destroyed=u.netDestroyed=true;u.netRuinsDue=(W.time||0)+1.5;W.onBuildingDestroyed?.(u);
    for(const p of [W.player,...W.bots]){const d=Math.hypot(Math.max(u.box[0]-p.pos.x,0,p.pos.x-u.box[2]),Math.max(u.box[1]-p.pos.z,0,p.pos.z-u.box[3]));if(d<9)W.knockDown?.(p,(p.pos.x-u.center.x)*.8,(p.pos.z-u.center.z)*.8,1.8);}
  };
  world.destructionState=()=>{const u=W.university;if(u?.netRuinsDue&&(W.time||0)>=u.netRuinsDue&&!u.netRuins)buildDemolitionRuins(u);return{destroyed:!!u?.destroyed,ruins:!!u?.netRuins};};
  world.receiveDestruction=data=>{const u=W.university;if(!data?.destroyed||!u)return;if(!u.netDestroyed){destroySection(u,true);u.destroyed=u.netDestroyed=true;}if(data.ruins&&!u.netRuins)buildDemolitionRuins(u);};
  Object.assign(world, { claimMission: ensure, work, finishMission: finish, chainMission: chain,
    runWork(m,fn){return m.netLease?world.runScope(scope(m),()=>withSoundSource(leaseOwner(m),fn),root(m)):fn();},
    claimBot(m,b){const q=claim(m,b);if(q)m.busy=false;return !!q;},
    releaseBot(m,b){const q=m.netLease;if(q?.actor===world.keyOf(b)){leases.release(m.id,q.actor,q.token);m.netLease=null;m.busy=false;m.claimedBy=null;}}
  });
  return { snapshot, receive, grant, handle, observe, leases,
    setHost(value){host=!!value;if(host){for(const m of M.list.slice()){if(m.owner&&!actor(world.keyOf(m.owner))||m.netLease&&!actor(m.netLease.actor)){removeMission(m);continue;}if(m.netLease){leases.jobs.set(m.id,{...m.netLease});leases.next=Math.max(leases.next,m.netLease.token);}}}},
    disconnect(key) { for (const m of M.list.slice()) if (m.netLease?.actor === key || m.owner&&world.keyOf(m.owner)===key) { stopSpectator(m.id); removeMission(m); } },
    dispose() { for (const id of [...spectators.keys()]) stopSpectator(id); pending.clear(); finished.clear(); leases.jobs.clear(); } };
}
