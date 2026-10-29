import { W } from '../world/state.js';
import { V3, THREE } from '../core/gfx.js';
import { addItem, pickUp, launch, drop } from '../game/items.js';
import { addPushable } from '../world/pushables.js';
import { addSolid, addObb, moveSolid, syncPushable, pushOut, raySolids } from '../world/physics.js';
import { breakPiece } from '../world/breakables.js';
import { grabActor, letGo, struggleTap } from '../game/grab.js';
import { mount, grab, dismount, release } from '../game/ride.js';
import { cargoPosition } from '../game/handheld.js';
import { StateDelta, round as q, vector, sweepPosition } from './state-codec.js';

const LISTS = { i: 'items', p: 'pushables', d: 'doors', s: 'solids', o: 'obbs', b: 'breakables', c: 'cats', n: 'npcs', a: 'interacts' };
const pos = v => [q(v.x), q(v.y), q(v.z)];
const fields = ['x0', 'z0', 'x1', 'z1', 'y0', 'y1'];
const obbFields = ['cx', 'cz', 'yaw', 'lx0', 'lz0', 'lx1', 'lz1', 'y0', 'y1'];
const transform = o => [...pos(o.position), ...o.quaternion.toArray().map(q), ...pos(o.scale), o.visible && o.parent ? 1 : 0];

// Карта строится локально. В сети - идентификаторы, изменения состояния и позы подвижных узлов.
// Стены/коллизии применяются сразу, картинки подвижных объектов сглаживаются отдельно.
export function createWorldSync({ host, id, actor, command, myKey }) {
  const objects = new Map(), seen = new WeakMap(), baseline = new Map(), visual = new Map(), scopes = new Map();
  const textures=new WeakMap(),lastProposal=new Map();let proposalAt=0;
  const delta = new StateDelta(); let current = '', applying = false, serial = 0;
  const keyOf = a => a === W.player ? myKey : a?.netKey || '';
  const localOwns = o => o?.netScope && api.ownsScope?.(o.netScope);
  function register(type, o, forced) {
    if (!o || seen.has(o)) return seen.get(o);
    const prefix = current || 'h', n = scopes.get(prefix) || 0;
    const key = forced || type + ':' + prefix + '/' + n;
    if (!forced) scopes.set(prefix, n + 1);
    seen.set(o, key); o.netId = key; o.netScope = current; objects.set(key, { type, o });
    return key;
  }
  function tree(root) {
    if (!root) return;
    // Статические запечённые кварталы сюда не попадают.
    root.traverse(o => { if (!o.isSprite && !o.userData?.noNet) register('v', o); });
  }
  function scope(name, fn, roots = []) {
    const old = current, before = new Set(W.group.children), animations = new Set(W.animated); current = name;
    try { return fn(); }
    finally {
      for (const [type, list] of Object.entries(LISTS)) for (const o of W[list] || []) if (!seen.has(o)) register(type, o);
      for (const o of W.group.children) if (!before.has(o)) tree(o);
      for (const root of roots) tree(root);
      for (const f of W.animated) if (!animations.has(f)) f.netScope = name;
      current = old;
    }
  }
  function runScope(name,fn,root){
    const old=current,n=W.group.children.length,a=W.animated.length;current=name;
    try{return fn();}finally{for(const g of W.group.children.slice(n))tree(g);if(root)tree(root);for(const f of W.animated.slice(a))f.netScope=name;current=old;}
  }
  function pack(type, o) {
    switch (type) {
      case 'i': return [o.type, o.state, ...pos(o.pos), ...pos(o.vel), ...[o.g.rotation.x, o.g.rotation.y, o.g.rotation.z].map(q), keyOf(o.owner), o.noPickup ? 1 : 0, o.ammo || 0, o.taken ? 1 : 0, o.g.visible ? 1 : 0,q(o.cd),q(o.draw),q(o.aimT),o.perfumeEffect||'',o.mission?.id||null];
      case 'p': return [o.kind, q(o.x), q(o.y), q(o.z), q(o.vx), q(o.vy), q(o.vz), ...[o.mesh.rotation.x, o.mesh.rotation.y, o.mesh.rotation.z].map(q), o.dead ? 1 : 0, o.tipped ? 1 : 0, keyOf(o.rider), keyOf(o.grabbed), q(o.heading)];
      case 's': return [...fields.map(k => q(o[k])), o.on ? 1 : 0];
      case 'a': return Object.getOwnPropertyDescriptor(o,'x')?.get?null:[q(o.x),q(o.y),q(o.z),q(o.r)];
      case 'o': return [...obbFields.map(k => q(o[k])), o.on ? 1 : 0];
      case 'd': return [o.open ? 1 : 0, q(o.ang), q(o.av), o.dirS ?? null, o.solid?.on ? 1 : 0];
      case 'b': return [o.alive ? 1 : 0];
      case 'v': {
        const result=transform(o),maps=[];
        const materials=Array.isArray(o.material)?o.material:[o.material];
        materials.forEach((m,index)=>{const t=m?.map,im=t?.image;if(!t?.isCanvasTexture||t.userData.netStatic||!im?.toDataURL||im.width>256||im.height>256)return;
          let state=textures.get(t);if(!state||state.version!==t.version){state={version:t.version,data:im.toDataURL('image/png')};textures.set(t,state);}maps.push([index,state.data]);
        });
        if(maps.length)result.push(maps);return result;
      }
      case 'c': return [...pos(o.root.position), q(o.root.rotation.y), o.mode || 'walk', o.state || 'idle'];
      case 'n': return [...pos(o.g.position), q(o.g.rotation.y), q(o.stun), q(o.daze),keyOf(o.heldBy)];
      case 't': return [o.kind,...pos(o.m.getWorldPosition(new V3())),...pos(o.v),q(o.g),q(o.life),q(o.delay),keyOf(o.owner),...o.m.quaternion.toArray().map(q),...pos(o.m.scale),o.m.visible&&o.m.parent?1:0];
      default: return null;
    }
  }
  function records() {
    const rows = [];
    for (const [key, { type, o }] of objects) { const v = pack(type, o); if (v) rows.push([key, v]); }
    return rows;
  }
  function target(o, p, quaternion, scale) {
    if (o.position.distanceToSquared(new V3(...p)) > 64) o.position.fromArray(p);
    visual.set(o, { p: new V3(...p), r: quaternion && new THREE.Quaternion(...quaternion), s: scale && new V3(...scale) });
  }
  function applyOne(key, v, proposal = false) {
    let entry = objects.get(key), type = key[0], o = entry?.o;
    if (!v) { if (o?.g) o.g.visible = false; if (o?.isObject3D) o.visible = false; if (o?.on !== undefined) o.on = false; objects.delete(key); return; }
    if (!Array.isArray(v) || !['i', 'p', 's', 'o', 'd', 'b', 'v', 'c', 'n','a','t'].includes(type)) return;
    // Созданные не миссиями предметы (дождь, подарок, выпадение из шкафа).
    if (!o && type === 'i') { if (!vector(v.slice(2, 5))) return; o = addItem(v[0], v[2], v[3], v[4]); }
    if (!o && type === 'p') o = addPushable({X:x=>x,Z:z=>z,Y:0}, v[0], v[1], v[3], v[2]);
    if (!o && type === 's' && vector(v.slice(0, 6), 6)) o = addSolid(...v.slice(0, 6));
    if (!o && type === 'o' && vector(v.slice(0, 9), 9)) o = addObb(Object.fromEntries(obbFields.map((f, i) => [f, v[i]])));
    if(!o&&type==='t'&&['arrow','net','water','candy','web','bubble','perfume','firework'].includes(v[0]))o=W.netCreateShot?.(v[0],new V3(...v.slice(1,4)),new V3(0,0,1),0,0,actor(v[10]));
    if (!o) return;
    if (!entry) { register(type, o, key); entry = objects.get(key); }
    if(!proposal&&localOwns(o)&&!(type==='i'&&v[1]==='held'&&v[11]!==myKey))return;
    switch (type) {
      case 'i': {
        const owner = actor(v[11]);
        if (o.owner?.held === o && (v[1] !== 'held' || owner !== o.owner)) o.owner.held = null;
        o.state = v[1]; o.owner = owner; o.vel.fromArray(v.slice(5, 8)); o.noPickup = !!v[12]; o.ammo = v[13]; o.taken = !!v[14]; o.g.visible = !!v[15];o.cd=v[16]||0;if(owner!==W.player){o.draw=v[17]||0;o.aimT=v[18]||0;}o.perfumeEffect=v[19]||undefined;o.mission=v[20]?api.getMission?.(v[20]):null;
        if (o.state === 'held' && owner) { visual.delete(o.g);owner.held = o; if (owner !== W.player) cargoPosition(owner, o.pos, o.def.r); }
        else target(o.g, v.slice(2, 5));
        o.g.rotation.set(...v.slice(8, 11)); break;
      }
      case 'p': {
        if (!proposal && (o.rider === W.player || o.grabbed === W.player) && (v[12]===myKey||v[13]===myKey)) break;
        const oldRider = o.rider, oldGrab = o.grabbed;
        o.x = v[1]; o.y = v[2]; o.z = v[3]; o.vx = v[4]; o.vy = v[5]; o.vz = v[6]; o.dead = !!v[10]; o.tipped = !!v[11]; o.heading = v[14];
        o.rider = actor(v[12]); o.grabbed = actor(v[13]);
        if (oldRider && oldRider !== o.rider && oldRider.ride === o) oldRider.ride = null;
        if (oldGrab && oldGrab !== o.grabbed && oldGrab.grab === o) oldGrab.grab = null;
        if (o.rider) o.rider.ride = o; if (o.grabbed) o.grabbed.grab = o;
        syncPushable(o); o.mesh.rotation.set(...v.slice(7, 10)); o.mesh.visible = !o.dead; break;
      }
      case 's': {
        const p=W.player,dy=v[5]-o.y1;
        if(o.tag==='lift-floor'&&p?.onGround&&Math.abs(p.pos.y-o.y1)<.25&&p.pos.x>o.x0&&p.pos.x<o.x1&&p.pos.z>o.z0&&p.pos.z<o.z1)p.pos.y+=dy;
        moveSolid(o, ...v.slice(0, 6)); o.on = !!v[6]; break;
      }
      case 'a': ['x','y','z','r'].forEach((k,i)=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d?.get||d.set)o[k]=v[i];});break;
      case 't':o.p.fromArray(v.slice(1,4));o.v.fromArray(v.slice(4,7));o.g=v[7];o.life=v[8];o.delay=v[9];o.owner=actor(v[10]);target(o.m,v.slice(1,4),v.slice(11,15),v.slice(15,18));o.m.visible=!!v[18];break;
      case 'o': obbFields.forEach((k, i) => { o[k] = v[i]; }); o.on = !!v[9]; break;
      case 'd': o.open = !!v[0]; o.ang = v[1]; o.av = v[2]; o.dirS = v[3]; o.pivot.rotation.y = o.ang; if (o.solid) o.solid.on = !!v[4]; break;
      case 'b': if (!v[0] && o.alive) breakPiece(o); break;
      case 'v': {
        target(o,v.slice(0,3),v.slice(3,7),v.slice(7,10));o.visible=!!v[10];
        const mats=Array.isArray(o.material)?o.material:[o.material];
        for(const[index,data]of v[11]||[]){const t=mats[index]?.map,canvas=t?.image;if(!canvas?.getContext||t.userData.netImage===data||typeof data!=='string'||!data.startsWith('data:image/png;base64,'))continue;
          t.userData.netImage=data;const image=new Image();image.onload=()=>{if(t.userData.netImage===data){canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);t.needsUpdate=true;}};image.src=data;
        }break;
      }
      case 'c': target(o.root, v.slice(0, 3)); o.root.rotation.y = v[3]; o.mode = v[4]; o.state = v[5]; break;
      case 'n': {
        target(o.g,v.slice(0,3));o.g.rotation.y=v[3];o.stun=v[4];o.daze=v[5];
        if(o.heldBy?.dogHeld===o)o.heldBy.dogHeld=null;o.heldBy=actor(v[6]);if(o.kind==='dog'&&o.heldBy)o.heldBy.dogHeld=o;break;
      }
    }
  }
  function apply(rows, proposal = false) {
    applying = true;
    try { for (const [key, v] of rows || []) applyOne(key, v, proposal); }
    finally { applying = false; }
  }
  function reachable(a, p, reach = 2.4) {
    if (!a || !p || a.stun > 0 || a.heldBy || Math.abs(a.pos.y - p.y) > 2 || a.pos.distanceTo(new V3(p.x, p.y, p.z)) > reach) return false;
    const from = a.pos.clone().add(new V3(0, 1, 0)), to = new V3(p.x, p.y + .7, p.z).sub(from), len = to.length();
    return len < .4 || raySolids(from, to.normalize(), len) >= len - .4;
  }
  function act(a, msg) {
    if(msg.kind==='drone-action'){if(vector(msg.direction,3,1.1)&&[0,2].includes(msg.button))W.netDroneInput?.(a,msg.button,new V3(...msg.direction));return;}
    if(msg.kind==='demolish'){api.demolish?.(a);return;}
    const o = objects.get(msg.key)?.o;
    if (msg.kind === 'struggle') { struggleTap(a); return; }
    if (msg.kind === 'letgo') { letGo(a); return; }
    if (msg.kind === 'dismount') { dismount(a, !!msg.jump); return; }
    if (msg.kind === 'release') { release(a); return; }
    if (msg.kind === 'grip') { const b = actor(msg.key); if (b) grabActor(a, b); return; }
    if (!o) return;
    const p = o.pos || o.mesh?.position || o;
    if(msg.kind==='use'){
      if(o.owner===a&&o.state==='held'&&vector(msg.target)&&Number.isFinite(msg.dt))W.netUseTool?.(a,o,new V3(...msg.target),Math.max(0,Math.min(.2,msg.dt)));
      return;
    }
    if(msg.kind==='release-tool'){if(o.owner===a&&o.state==='held'&&vector(msg.target))W.netReleaseTool?.(a,o,new V3(...msg.target));return;}
    if(msg.kind==='dog'){if(reachable(a,p,1.6))W.netGrabDog?.(a);return;}
    if (msg.kind === 'throw') {
      if (o.state !== 'held' || o.owner !== a || !vector(msg.v, 3, 65)) return;
      const from = a.pos.clone().add(new V3(0, 1, 0)); a.held = null; launch(o, from, new V3(...msg.v)); return;
    }
    if (msg.kind === 'drop') { if (o.owner !== a || o.state !== 'held') return; drop(o, a.pos.x, a.pos.y, a.pos.z); a.held = null; return; }
    if (msg.kind === 'break') { if (reachable(a, o.mesh?.position, 3)) breakPiece(o, msg.v || [0, 0, 0]); return; }
    if (!reachable(a, p, msg.kind === 'interact' ? Math.min(4, o.r || 2.4) + .3 : 2.5)) return;
    if (msg.kind === 'take') { if (!a.held && ['rest', 'placed', 'fly'].includes(o.state) && (!o.boxed || o.boxed.open) && pickUp(o) !== false) { o.owner = a; a.held = o; o.wasHeld = true; } }
    else if(msg.kind==='slam'){o.open=true;o.av=msg.ux?Math.sign(msg.ux)*10:10;}
    else if (msg.kind === 'door') { o.open = !o.open; o.dirS = null; o.av = 0; }
    else if (msg.kind === 'mount') { if (!o.rider && !o.grabbed) mount(a, o); }
    else if (msg.kind === 'cart') { if (!o.rider && !o.grabbed) grab(a, o); }
    else if (msg.kind === 'interact' && (!o.enabled || o.enabled(a))) o.act(a);
  }
  function request(kind, o, data = {}) {
    if (applying || host) return false;
    command({ kind, key: typeof o === 'string' ? o : o?.netId, ...data }); return true;
  }
  function proposals(force=false) {
    const out = [];
    const now=performance.now(),full=force||now-proposalAt>3000;if(full)proposalAt=now;
    for (const [key, { type, o }] of objects) if (localOwns(o) || type === 'p' && (o.rider === W.player || o.grabbed === W.player)) {
      const value=pack(type,o);if(value){const text=JSON.stringify(value);if(full||lastProposal.get(key)!==text)out.push([key,value]);lastProposal.set(key,text);}
    }
    return out;
  }
  function accept(rows, a) {
    if (!a) return;
    const accepted = [];
    for (const [key, value] of (rows || []).slice(0, 3000)) {
      if (typeof key !== 'string' || !Array.isArray(value)) continue;
      const entry = objects.get(key);
      if(api.remoteOwns?.(key,a)){if(entry?.type==='i'&&entry.o.state==='held'&&entry.o.owner&&entry.o.owner!==a)continue;accepted.push([key,value]);continue;}
      if (entry?.type === 'p' && (entry.o.rider === a || entry.o.grabbed === a) && vector(value.slice(1, 7), 6)) {
        const b = entry.o, was = b.solid?.on; if (b.solid) b.solid.on = false;
        try {
          const fixed = sweepPosition([b.x, b.y, b.z], value.slice(1, 4), b.r, p => pushOut(p, b.r, p.y + .2, p.y + b.h));
          if (Math.hypot(fixed[0] - b.x, fixed[2] - b.z) > 9) continue;
          const v = value.slice(); v.splice(1, 3, ...fixed); v[12] = keyOf(b.rider); v[13] = keyOf(b.grabbed); accepted.push([key, v]);
        } finally { if (b.solid) b.solid.on = was; }
      }
    }
    apply(accepted, true);
  }
  const api = { host, replica: !host, register, scope, runScope, tree, objects, keyOf, request, reachable, act, proposals, accept, apply,
    retryProposals(){lastProposal.clear();},
    get applying() { return applying; },
    capture(full = false) { return delta.snapshot(records(), full); },
    baseline() { const rows = records(); delta.baseline(rows); for (const [k, v] of rows) baseline.set(k, v); },
    receive(frame) { if (!frame || frame.rev <= serial) return; serial = frame.rev; if (frame.full) apply([...baseline]); apply(frame.rows); },
    interpolate(dt) { const k = 1 - Math.exp(-dt * 22); for (const [o, v] of visual) { if (o.netScope && api.ownsScope?.(o.netScope)) { visual.delete(o); continue; } o.position.lerp(v.p, k); if (v.r) o.quaternion.slerp(v.r, k); if (v.s) o.scale.lerp(v.s, k); } },
    canSimulate(o) { if(o?.netScope?.startsWith('m'))return !!api.ownsScope?.(o.netScope); return host || !o?.netId || localOwns(o) || o.rider === W.player || o.grabbed === W.player; },
    canAnimate(f) { return f.netScope?.startsWith('m') ? !!api.ownsScope?.(f.netScope) : host; },
  };
  api.buildings=(W.buildings||[]).slice();api.spots=Object.fromEntries(Object.entries(W.spots).map(([k,v])=>[k,v.slice()]));
  W.net = api;
  for (const [type, list] of Object.entries(LISTS)) (W[list] || []).forEach((o, i) => register(type, o, type + ':' + i));
  current = 'base';
  for (const o of W.keep || []) tree(o);
  for (const o of W.cats || []) tree(o.root);
  for (const o of W.npcs || []) tree(o.g);
  current = ''; api.baseline();
  return api;
}
