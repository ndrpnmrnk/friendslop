import {fishingGame} from './fishing.js';
import {wiringGame} from './wiring.js';
import { nearbyItemPoint, routeTo } from './location.js';
import { sfx } from '../core/sfx.js';
import { THREE, G, V3, mesh, col, tmat, lam, glow } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { clamp } from '../core/rng.js';
import { burst, splash, ripple, smokeRing, puff } from '../world/particles.js';
import { addItem } from '../game/items.js';
import { brickWall, breakPiece } from '../world/breakables.js';
import {groundAt} from '../world/physics.js';
import { spawnLitter } from './objects2.js';

/* Новые мини-игры.
   Панельные (камера встаёт к объекту, мышь): наперстки, рыбалка, щиток, сейф.
   Уличные (бегаешь как обычно, сверху панель с таймером): тир, уборка, доставка, снос краном. */
const PL = new THREE.Plane(), HIT = new V3();
const onPlane = (ray, n, p) => { PL.setFromNormalAndCoplanarPoint(n, p); return ray.ray.intersectPlane(PL, HIT) ? HIT.clone() : null; };

export const PANEL_GAMES = {
  // Наперстки: следи за тыковкой, стаканы меняются местами всё быстрее
  shells(o, api) {
    api.feedback?.();
    api.pose(o.world(0, 2.7, 1.9), o.world(0, 0.9, -0.05));
    const slot = [-0.45, 0, 0.45]; let pos = [0, 1, 2], ball = (Math.random() * 3) | 0, phase = 'show', t = 0, swaps = 0, total = 7, sw = null, endT = -1, res = null;
    const cupAt = (c, x, lift) => { o.cups[c].position.set(x, 0.99 + lift, o.cups[c].position.z); };
    api.progress(null); api.msg('Запомни, где тыковка');
    return {
      botStep(dt, brain) { if(phase==='pick'&&brain.ready(0.6))this.down(brain.hit(o.cups[ball])); },
      down(ray) {
        if (phase !== 'pick') return;
        const hits = ray.intersectObjects(o.cups); if (!hits.length) return;
        const c = o.cups.indexOf(hits[0].object); phase = 'reveal'; t = 0;
        const ok = c === ball; res = ok ? { success: true, mult: 1 } : { success: false };
        api.msg(ok ? 'Угадал!' : 'Мимо!', ok ? 'good' : 'bad'); o.picked = c; endT = 1.6;
      },
      update(dt) {
        t += dt;
        o.ball.position.x = slot[pos[ball]]; o.ball.visible = phase === 'show' || phase === 'reveal';
        if (phase === 'show') { for (let c = 0; c < 3; c++) cupAt(c, slot[pos[c]], c === ball ? Math.min(0.3, Math.sin(Math.min(t, 1.2) / 1.2 * Math.PI) * 0.35) : 0); if (t > 1.6) { phase = 'shuffle'; t = 0; api.msg('Следи...'); } }
        else if (phase === 'shuffle') {
          const dur = Math.max(0.22, 0.55 - swaps * 0.05);
          if (!sw) { const a = (Math.random() * 3) | 0; let b = (Math.random() * 2) | 0; if (b >= a) b++; sw = { a, b, t: 0 }; }
          sw.t += dt / dur; const k = Math.min(1, sw.t), ca = pos.indexOf(sw.a), cb = pos.indexOf(sw.b);
          const xa = slot[sw.a] + (slot[sw.b] - slot[sw.a]) * k, xb = slot[sw.b] + (slot[sw.a] - slot[sw.b]) * k;
          cupAt(ca, xa, 0); cupAt(cb, xb, 0); o.cups[ca].position.z = Math.sin(k * Math.PI) * 0.25; o.cups[cb].position.z = -Math.sin(k * Math.PI) * 0.25;
          if (k >= 1) { pos[ca] = sw.b; pos[cb] = sw.a; o.cups[ca].position.z = o.cups[cb].position.z = 0; sw = null; swaps++; if (swaps >= total) { phase = 'pick'; api.msg('ГДЕ ТЫКВА?', 'good'); } }
        } else if (phase === 'reveal') { for (let c = 0; c < 3; c++) cupAt(c, slot[pos[c]], (c === o.picked || c === ball) ? Math.min(0.3, t * 0.8) : 0); endT -= dt; if (endT <= 0) api.finish(res); }
      },
      stop() { o.cups.forEach((c, i) => { c.position.set(slot[i], 0.99, 0); }); o.ball.position.x = 0; o.ball.visible = true; },
    };
  },

  fish:fishingGame,

  // Щиток: открытая дверца, слева 4 провода, справа 4 клеммы. Тяни провод к клемме своего цвета
  /* Щиток — «Проводка»: на сетке пары цветных клемм. Веди провод мышью по клеткам от клеммы к клемме того же
     цвета; провода не пересекаются и не проходят через чужие клеммы. Уровень строится от готового решения
     (случайная «змейка» через всю сетку режется на куски), поэтому решить можно всегда. */
  fuse(o,api,ctx){return wiringGame(o,api,ctx,flowLevel(5,4+(Math.random()<.5?1:0)));},

  // Сейф: крути диск (зажми ЛКМ и веди мышь), на нужной цифре щёлкает — нажми на ручку. Три цифры.
  safe(o, api) {
    api.feedback?.();
    const s = o.spot, F = new V3(s.f[0], 0, s.f[1]);
    const c0 = new V3(s.bx, s.y + 0.55, s.bz).addScaledVector(F, 0.36);
    api.pose(c0.clone().addScaledVector(F, 1.1).add(new V3(0, 0.15, 0)), c0.clone());
    const grp = new THREE.Group(); grp.position.copy(c0); grp.lookAt(c0.clone().add(F)); W.group.add(grp);
    const dial = new THREE.Group(); grp.add(dial);
    const face = mesh(G.cyl12, col(0x3a3440), 0, 0, 0.02, 0.16, 0.04, 0.16, dial); face.rotation.x = Math.PI / 2;
    mesh(G.box, col(0xf5c542), 0, 0.13, 0.05, 0.02, 0.05, 0.01, dial);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mesh(G.box, col(0xd8d0c0), Math.sin(a) * 0.12, Math.cos(a) * 0.12, 0.045, 0.012, 0.03, 0.01, dial).rotation.z = -a; }
    mesh(G.box, col(0xff5a6e), 0, 0.2, 0.03, 0.02, 0.04, 0.01, grp);
    const handle = mesh(G.box, col(0x9a9da8), 0.3, 0, 0.05, 0.06, 0.22, 0.06, grp);
    const leds = [0, 1, 2].map(i => mesh(G.box, col(0x2a2232), -0.25 + i * 0.07, -0.22, 0.02, 0.04, 0.04, 0.02, grp));
    const code = [0, 1, 2].map(() => (Math.random() * 40) | 0), N = 40;
    let ang = 0, step = 0, drag = false, lastA = null, clickT = 0, endT = -1, lastN = -1;
    const num = () => ((Math.round(-ang / (Math.PI * 2) * N) % N) + N) % N;
    api.progress(0); api.msg('Крути диск — лови «щёлк»');
    const angleOf = ray => { const p = onPlane(ray, F, c0); if (!p) return null; const l = grp.worldToLocal(p.clone()); return Math.atan2(l.x, l.y); };
    return {
      botStep(dt, brain) { if(endT>0||step>=3)return;const n=num();if(n!==code[step])ang-=Math.PI*2/N;else if(brain.ready(0.55))this.down(brain.hit(handle)); },
      down(ray) {
        if (endT > 0) return;
        if (ray.intersectObject(handle).length) {
          if (num() === code[step]) { leds[step].material = glow(0x9be36b); step++; api.progress(step / 3); api.msg(step === 3 ? 'Открыто!' : 'Есть! Следующая цифра', 'good'); if (step === 3) endT = 1.2; }
          else { step = 0; leds.forEach(l => (l.material = col(0x2a2232))); api.progress(0); api.msg('Неверно, сначала', 'bad'); }
          return;
        }
        drag = true; lastA = angleOf(ray);
      },
      move(ray) { if (!drag) return; const a = angleOf(ray); if (a === null || lastA === null) { lastA = a; return; } let d = a - lastA; d = Math.atan2(Math.sin(d), Math.cos(d)); ang -= d; lastA = a; },
      up() { drag = false; lastA = null; },
      update(dt) {
        dial.rotation.z = ang; clickT -= dt;
        const n = num(); if (n !== lastN) { lastN = n; if (step < 3 && n === code[step]) { clickT = 0.25; api.msg('щёлк!', 'good'); } }
        dial.position.x = clickT > 0 ? Math.sin(clickT * 80) * 0.006 : 0;
        if (endT > 0) { handle.rotation.z = Math.min(1.2, handle.rotation.z + dt * 3); endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); }
      },
      stop() { W.group.remove(grp); },
      needsRay: true,
    };
  },
};

/* ---------- уличные миссии ---------- */
export const WORLD_GAMES = {
  // Тир: сбей три мишени чем угодно, под рукой ящик с помидорами и мячами
  targets(o, api, ctx) {
    api.feedback?.();
    const box = o.world(1.6, 0.6, 0.6);
    o.items = ['tomato', 'ball', 'tomato', 'ball', 'tomato'].map((k, i) => { const it = addItem(k, box.x + (i - 2) * 0.12, box.y - 0.1, box.z, 0); it.def = { ...it.def, respawn: 0 }; return it; });
    let time = 60, left = 3;
    const hook = (it, p) => { for (const t of o.targets) { if (t.hit) continue; const c = t.t.getWorldPosition(new V3()); if (c.distanceTo(p) < 0.85) { t.hit = true; o.sols[t.i].on = false; left--; burst(c.x, c.y, c.z, 10, { color: 0xff8a1f, size: 0.2, speed: 2.5 }); api.msg(left ? `Попал! Осталось ${left}` : 'Все мишени сбиты!', 'good'); } } };
    W.hitHooks.push(hook); api.msg('Сбей 3 мишени с линии');
    return {
      botItems:()=>o.items, botTarget:()=>o.world(0,0,0.6),
      botStep(dt,brain){if(!brain.actor.held||!brain.ready(1.3))return;const t=o.targets.find(q=>!q.hit);if(t)brain.throwTo(t.t.getWorldPosition(new V3()));},
      target: () => o.world(0, 1.3, -6),
      update(dt) {
        time -= dt; api.timer(time);
        for (const t of o.targets) if (t.hit) t.t.rotation.x = Math.min(Math.PI / 2, t.t.rotation.x + dt * 6);
        api.progress((3 - left) / 3);
        if (left === 0) return api.finish({ success: true, mult: 1 });
        if (time <= 0) return api.finish({ success: false });
      },
      stop() { W.hitHooks.splice(W.hitHooks.indexOf(hook), 1); },
    };
  },

  // Уборка: вокруг урны раскиданы 5 бумажек и банок — закинь или донеси все в урну
  cleanup(o, api, ctx) {
    api.feedback?.();
    const c=o.pos(),N=5,pile=new THREE.Group();let time=68,got=0;
    pile.name='cleanup-collected';o.g.add(pile);
    for(let i=0;i<N;i++){
      const {x,y,z}=nearbyItemPoint(c),it=spawnLitter(x,y,z);o.litter.push(it);it.outline.set(true);
      const rg=mesh(G.ring,new THREE.MeshBasicMaterial({color:0x9be36b,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}),0,0,0,.35,.35,1,W.group);
      rg.name='cleanup-location';rg.rotation.x=-Math.PI/2;it.ring=rg;
    }
    const removeRing=it=>{if(!it.ring)return;it.ring.removeFromParent();it.ring.material.dispose();it.ring=null;};
    const remaining=()=>o.litter.filter(it=>!it.taken&&it.state!=='gone');
    const target=()=>{
      if(ctx.player.held&&o.litter.includes(ctx.player.held))return o.front?.()||c;
      const free=remaining().filter(it=>it.state!=='held'),near=(free.length?free:remaining()).sort((a,b)=>a.pos.distanceToSquared(ctx.player.pos)-b.pos.distanceToSquared(ctx.player.pos))[0];
      return near?.pos||c;
    };
    const syncMarkers=()=>{for(const it of o.litter){if(!it.ring)continue;const show=!it.taken&&it.state!=='gone'&&it.state!=='held';it.ring.visible=show;if(show){it.ring.position.copy(it.pos);it.ring.position.y-=it.def.r-.035;it.ring.scale.setScalar(1+Math.sin(time*5)*.12);}it.outline.set(show);}};
    const take=it=>{
      if(it.taken)return;it.taken=true;it.noPickup=true;it.vel.set(0,0,0);it.floatY=undefined;
      const packed=it.g.clone(true);packed.position.set(Math.sin(got*2.4)*.14,.94+got*.025,Math.cos(got*2.4)*.13);packed.scale.setScalar(.65);packed.rotation.set(.2,got*2.4,.3);packed.visible=true;pile.add(packed);
      it.state='gone';it.g.visible=false;it.outline.set(false);removeRing(it);got++;
      sfx('imp',{at:c,m:'metal',v:.3});smokeRing(c.x,c.y+.9,c.z,5,{speed:1,size:.1});api.msg(got<N?`В урне ${got} из ${N}`:'Чисто!','good');
    };
    const hook=(it,p)=>{if(!it.taken&&it.state!=='held'&&o.litter.includes(it)&&Math.hypot(p.x-c.x,p.z-c.z)<.9&&Math.abs(p.y-c.y)<1.5)take(it);};
    W.hitHooks.push(hook);syncMarkers();api.msg('Мусор - в урну');
    return {
      target,afterPhysics:syncMarkers,
      botItems:remaining,botDeposit:()=>c,botDrop:true,
      update(dt){
        time-=dt;api.timer(time);
        for(const it of o.litter){
          if(it.taken)continue;
          if(it.state==='rest'&&Math.hypot(it.pos.x-c.x,it.pos.z-c.z)<1&&Math.abs(it.pos.y-c.y)<1.5)take(it);
          // Потерянный в провале несобранный мусор возвращаем в доступную область.
          else if(it.state==='gone'||it.pos.y<c.y-6){const p=nearbyItemPoint(c);it.pos.set(p.x,groundAt(p.x,p.z,.12,p.y+.25)+it.def.r,p.z);it.vel.set(0,0,0);it.state='rest';it.g.visible=true;it.floatY=undefined;}
        }
        syncMarkers();o.ring.material.opacity=.45+Math.sin(time*5)*.15;api.progress(got/N);
        if(got>=N)return api.finish({success:true,mult:1});if(time<=0)return api.finish({success:false});
      },
      stop(){pile.removeFromParent();const i=W.hitHooks.indexOf(hook);if(i>=0)W.hitHooks.splice(i,1);for(const it of o.litter){removeRing(it);it.outline.set(false);}}
    };
  },

  // Доставка: взял заказ — сразу видно куда: слева в списке адрес и расстояние, у ног стрелка,
  // над домом зелёный луч. Стрелка ведёт к двери, потом к лестнице, потом к нужной комнате.
  delivery(o, api, ctx) {
    api.feedback?.(); return deliveryCore(o, api, ctx, 'parcel'); },
  // Горячая пицца: та же доставка, но коробка остывает; брошенная/лежащая остывает втрое быстрее
  pizza(o, api, ctx) { return deliveryCore(o, api, ctx, 'pizza'); },
};

function deliveryCore(o, api, ctx, kind) {
    const P = ctx.player, from = o.pos(), dests = W.spots.deliver.filter(d => Math.hypot(d.x - from.x, d.z - from.z) > 14);
    const pool = dests.length ? dests : W.spots.deliver, dest = pool[(Math.random() * pool.length) | 0], g = dest.guide;
    const parcel = addItem(kind, from.x, from.y + 0.2, from.z, 0); parcel.def = { ...parcel.def, respawn: 0 };
    // Выронил - соперник может унести заказ, но очки остаются только исполнителю.
    parcel.mission = ctx.mission; parcel.mine = P;
    const stolen = () => parcel.state === 'held' && P.held !== parcel;
    let heat = 1, steamT = 0;
    ctx.give(parcel);
    const beamM = new THREE.MeshBasicMaterial({ color: 0x9be36b, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const beam = mesh(G.beam, beamM, dest.x, dest.y + 1.5, dest.z, 0.8, 3, 0.8, W.group);
    const sky = mesh(G.beam, new THREE.MeshBasicMaterial({ color: 0x9be36b, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), dest.x, dest.y + 20, dest.z, 0.35, 40, 0.35, W.group);
    let time = kind === 'pizza' ? 90 : 105, hint = '';
    api.where(`→ ${dest.name}`);
    const inside = () => g && P.pos.x > g.box[0] && P.pos.x < g.box[2] && P.pos.z > g.box[1] && P.pos.z < g.box[3] && P.pos.y > g.y0 - 0.6;
    const say = h => { if (h !== hint) { hint = h; api.msg(h); } };
    return {
      botItems:()=>[parcel],
      target() {
        if (P.held !== parcel) { say(kind === 'pizza' ? 'Подбери пиццу (E)' : 'Подбери заказ (E)'); return parcel.pos; }
        return routeTo(P.pos, { x: dest.x, y: dest.y, z: dest.z });
      },
      update(dt) {
        time -= dt; api.timer(time); beam.rotation.y += dt; sky.visible = !inside();
        if (kind === 'pizza') { heat -= dt / (P.held === parcel ? 75 : 24); api.progress(Math.max(0, heat)); steamT -= dt; if (steamT <= 0 && heat > 0.2) { steamT = 0.12; puff(parcel.pos.x, parcel.pos.y + 0.15, parcel.pos.z, { color: 0xf1e8ff, size: 0.15, vy: 1, life: 0.8, grow: 1.2, opacity: 0.5 * heat }); }
          if (heat <= 0) { api.msg('Пицца остыла...', 'bad'); return api.finish({ success: false }); } }
        else api.progress(1 - Math.min(1, Math.hypot(P.pos.x - dest.x, P.pos.z - dest.z) / 40));
        const near = Math.hypot(parcel.pos.x - dest.x, parcel.pos.z - dest.z) < 2.2 && Math.abs(parcel.pos.y - dest.y) < 1.8;
        if (near && (P.held === parcel || (parcel.state === 'rest' && parcel.owner === P))) { burst(dest.x, dest.y + 1, dest.z, 12, { color: 0x9be36b, size: 0.2, speed: 2 }); return api.finish({ success: true, mult: kind === 'pizza' ? 0.6 + heat * 0.6 : 1 }); }
        if (stolen()) say('Заказ у соперника! Верни его');
        if (parcel.state === 'gone') return api.finish({ success: false });
        if (time <= 0) return api.finish({ success: false });
      },
      stop() { W.group.remove(beam); W.group.remove(sky); if (P.held === parcel) P.held = null; if(parcel.owner && parcel.owner.held===parcel)parcel.owner.held=null; parcel.state = 'gone'; parcel.g.visible = false; parcel.steal = null; },
    };
}
void breakPiece; void brickWall; void tmat; void T;

/* Уровень «Проводки»: случайный гамильтонов путь по сетке N×N (змейка + перестройки «backbite»),
   разрезанный на K кусков длиной от 3 клеток; концы кусков — клеммы. */
function flowLevel(N, K, tries = 0) {
  let path = []; for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) path.push([y % 2 ? N - 1 - i : i, y]);
  const nb = ([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N);
  for (let it = 0; it < N * N * 40; it++) {
    if (Math.random() < 0.5) path.reverse();
    const end = path[path.length - 1], ns = nb(end), q = ns[(Math.random() * ns.length) | 0];
    const i = path.findIndex(p => p[0] === q[0] && p[1] === q[1]); if (i < 0 || i === path.length - 2) continue;
    path = path.slice(0, i + 1).concat(path.slice(i + 1).reverse());
  }
  const L = path.length, cuts = new Set();
  while (cuts.size < K - 1) { const c = 3 + ((Math.random() * (L - 6)) | 0); if ([...cuts].every(o => Math.abs(o - c) >= 3)) cuts.add(c); }
  const routes = []; const cs = [0, ...[...cuts].sort((a, b) => a - b), L], pairs = [];
  for (let k = 0; k < K; k++) { const seg = path.slice(cs[k], cs[k + 1]); pairs.push([seg[0], seg[seg.length - 1]]); routes.push(seg); }
  // клеммы вплотную друг к другу — слишком просто, строим заново
  if (tries < 60 && pairs.some(([a, b]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 2)) return flowLevel(N, K, tries + 1);
  return { pairs, routes };
}
