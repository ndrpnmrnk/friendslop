import { THREE, G, V3, mesh, col, tmat, lam, glow } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { clamp } from '../core/rng.js';
import { burst, splash, ripple, smokeRing } from '../world/particles.js';
import { addItem } from '../game/items.js';
import { brickWall, breakPiece } from '../world/breakables.js';
import { spawnLitter } from './objects2.js';

/* Новые мини-игры.
   Панельные (камера встаёт к объекту, мышь): наперстки, рыбалка, щиток, сейф.
   Уличные (бегаешь как обычно, сверху панель с таймером): тир, уборка, доставка, снос краном. */
const PL = new THREE.Plane(), HIT = new V3();
const onPlane = (ray, n, p) => { PL.setFromNormalAndCoplanarPoint(n, p); return ray.ray.intersectPlane(PL, HIT) ? HIT.clone() : null; };

export const PANEL_GAMES = {
  // Наперстки: следи за тыковкой, стаканы меняются местами всё быстрее
  shells(o, api) {
    api.pose(o.world(0, 2.7, 1.9), o.world(0, 0.9, -0.05));
    const slot = [-0.45, 0, 0.45]; let pos = [0, 1, 2], ball = (Math.random() * 3) | 0, phase = 'show', t = 0, swaps = 0, total = 7, sw = null, endT = -1, res = null;
    const cupAt = (c, x, lift) => { o.cups[c].position.set(x, 0.99 + lift, o.cups[c].position.z); };
    api.progress(null); api.msg('Запомни, где тыковка');
    return {
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
          if (k >= 1) { pos[ca] = sw.b; pos[cb] = sw.a; o.cups[ca].position.z = o.cups[cb].position.z = 0; sw = null; swaps++; if (swaps >= total) { phase = 'pick'; api.msg('Где тыковка? Кликни по стакану'); } }
        } else if (phase === 'reveal') { for (let c = 0; c < 3; c++) cupAt(c, slot[pos[c]], (c === o.picked || c === ball) ? Math.min(0.3, t * 0.8) : 0); endT -= dt; if (endT <= 0) api.finish(res); }
      },
      stop() { o.cups.forEach((c, i) => { c.position.set(slot[i], 0.99, 0); }); o.ball.position.x = 0; o.ball.visible = true; },
    };
  },

  // Рыбалка: ждёшь поклёвку и подсекаешь кликом, потом подматываешь (держи ЛКМ), когда рыба тянет — отпусти
  fish(o, api) {
    const s = o.spot, w = new V3(s.wx, s.wy, s.wz), me = o.world(0, 1.2, 0);
    api.pose(me.clone().add(new V3(0, 1.6, 0)).addScaledVector(new V3(s.wx - s.x, 0, s.wz - s.z).normalize(), -1.8), w);
    let phase = 'wait', t = 0, waitT = 2 + Math.random() * 3, biteT = 0, prog = 0.15, down = false, pull = false, pullT = 1, strain = 0, endT = -1, res = null;
    api.progress(null); api.msg('Ждём поклёвку...');
    const end = (ok, txt) => { phase = 'end'; res = ok ? { success: true, mult: 1 } : { success: false }; api.msg(txt, ok ? 'good' : 'bad'); endT = 1.4; };
    return {
      down() {
        down = true;
        if (phase === 'wait') { api.msg('Рано! Рыба испугалась', 'bad'); waitT = 2 + Math.random() * 3; t = 0; }
        else if (phase === 'bite') { phase = 'reel'; api.progress(prog); api.msg('Подсёк! Держи ЛКМ, чтобы мотать'); splash(o.bob.position.x, s.wy, o.bob.position.z, 0.6); }
      },
      up() { down = false; },
      update(dt) {
        t += dt; const bp = o.bob.position;
        if (phase === 'wait') { bp.y = s.wy + 0.12 + Math.sin(t * 2) * 0.02; if (t > waitT) { phase = 'bite'; biteT = 0.75; api.msg('КЛЮЁТ! Кликни!', 'good'); ripple(bp.x, s.wy, bp.z, 0.6, 0.6); } }
        else if (phase === 'bite') { bp.y = s.wy + 0.02 + Math.sin(t * 30) * 0.05; biteT -= dt; if (biteT <= 0) { phase = 'wait'; waitT = 1.5 + Math.random() * 2.5; t = 0; api.msg('Сорвалась... ждём ещё'); } }
        else if (phase === 'reel') {
          pullT -= dt; if (pullT <= 0) { pull = !pull; pullT = pull ? 0.7 + Math.random() * 0.8 : 1.0 + Math.random() * 1.4; api.msg(pull ? 'Тянет! Отпусти!' : 'Мотай!', pull ? 'bad' : 'good'); }
          if (down && !pull) prog += dt * 0.22; else if (down && pull) { strain += dt * 1.2; prog -= dt * 0.1; } else prog -= dt * (pull ? 0.08 : 0.03);
          strain = Math.max(0, strain - dt * 0.4);
          bp.x += (s.x - bp.x) * dt * (down && !pull ? 0.25 : 0) + (pull ? Math.sin(t * 9) * dt * 0.6 : 0); bp.z += (s.z - bp.z) * dt * (down && !pull ? 0.25 : 0);
          bp.y = s.wy + 0.04 + (pull ? Math.sin(t * 25) * 0.05 : 0);
          if (Math.random() < dt * (pull ? 8 : 2)) ripple(bp.x, s.wy, bp.z, 0.4, 0.5);
          o.rod.rotation.x = 0.9 + (down ? -0.3 : 0) + (pull ? Math.sin(t * 20) * 0.08 : 0);
          api.progress(clamp(prog, 0, 1));
          if (strain > 1) end(false, 'Леска порвалась!');
          else if (prog <= 0) end(false, 'Рыба ушла');
          else if (prog >= 1) { end(true, 'Поймал рыбу!'); splash(bp.x, s.wy, bp.z, 1); }
        } else { endT -= dt; if (endT <= 0) api.finish(res); }
        o.upd();
      },
      stop() { o.bob.position.set(s.wx, s.wy + 0.12, s.wz); o.rod.rotation.x = 0.9; o.upd(); },
    };
  },

  // Щиток: открытая дверца, слева 4 провода, справа 4 клеммы. Тяни провод к клемме своего цвета
  fuse(o, api) {
    const s = o.spot, F = new V3(s.f[0], 0, s.f[1]), R = new V3(F.z, 0, -F.x);
    const c0 = new V3(s.bx, s.y + 0.85, s.bz).addScaledVector(F, 0.23);
    api.pose(c0.clone().addScaledVector(F, 1.25), c0.clone());
    const grp = new THREE.Group(); W.group.add(grp);
    const at = (r, u) => c0.clone().addScaledVector(R, r).add(new V3(0, u, 0));
    const back = mesh(G.box, col(0x2b2533), 0, 0, 0, 0.78, 0.6, 0.02, grp); back.position.copy(at(0, 0)); back.lookAt(back.position.clone().add(F));
    const door = mesh(G.box, col(0x6a6d78), 0, 0, 0, 0.78, 0.62, 0.03, grp); door.position.copy(at(0.55, 0).addScaledVector(F, 0.35)); door.lookAt(door.position.clone().add(R));
    const COLS = [0xd8243a, 0x4ab0f0, 0xf5c542, 0x6aa84f], order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const left = COLS.map((c, i) => { const m = mesh(G.box, col(c), 0, 0, 0, 0.08, 0.08, 0.06, grp); m.position.copy(at(-0.3, 0.2 - i * 0.13)).addScaledVector(F, 0.03); m.userData.c = i; return m; });
    const right = order.map((ci, i) => { const m = mesh(G.box, glow(COLS[ci]), 0, 0, 0, 0.07, 0.07, 0.05, grp); m.position.copy(at(0.3, 0.2 - i * 0.13)).addScaledVector(F, 0.03); m.userData.c = ci; return m; });
    const lines = left.map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]), new THREE.LineBasicMaterial({ color: 0xffffff })); l.visible = false; grp.add(l); return l; });
    lines.forEach((l, i) => l.material.color.setHex(COLS[i]));
    let drag = -1, done = new Set(), endT = -1; const cur = new V3();
    api.progress(0); api.msg('Соедини провода по цветам');
    return {
      down(ray) { const h = ray.intersectObjects(left); if (h.length) { const i = h[0].object.userData.c; if (!done.has(i)) { drag = i; lines[i].visible = true; } } },
      move(ray) { if (drag < 0) return; const p = onPlane(ray, F, c0); if (p) cur.copy(p).addScaledVector(F, 0.04); },
      up(ray) {
        if (drag < 0) return; const h = ray ? ray.intersectObjects(right) : [];
        if (h.length && h[0].object.userData.c === drag) { done.add(drag); cur.copy(h[0].object.position); lines[drag].geometry.setFromPoints([left[drag].position, cur.clone()]); api.progress(done.size / 4); api.msg('Есть контакт!', 'good');
          if (done.size === 4) { api.msg('Свет есть!', 'good'); endT = 1.1; } }
        else { lines[drag].visible = false; if (h.length) { burst(h[0].object.position.x, h[0].object.position.y, h[0].object.position.z, 8, { color: 0xffe080, size: 0.08, speed: 2, up: 1, g: 6, life: 0.4 }); api.msg('Искры! Не тот провод', 'bad'); } }
        drag = -1;
      },
      update(dt) {
        if (drag >= 0) lines[drag].geometry.setFromPoints([left[drag].position, cur.clone()]);
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish({ success: true, mult: 1 }); }
      },
      stop() { W.group.remove(grp); },
      needsRay: true,
    };
  },

  // Сейф: крути диск (зажми ЛКМ и веди мышь), на нужной цифре щёлкает — нажми на ручку. Три цифры.
  safe(o, api) {
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
    api.progress(0); api.msg('Крути диск, жди щелчка, жми на ручку');
    const angleOf = ray => { const p = onPlane(ray, F, c0); if (!p) return null; const l = grp.worldToLocal(p.clone()); return Math.atan2(l.x, l.y); };
    return {
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
    const box = o.world(1.6, 0.6, 0.6);
    o.items = ['tomato', 'ball', 'tomato', 'ball', 'tomato'].map((k, i) => { const it = addItem(k, box.x + (i - 2) * 0.12, box.y - 0.1, box.z, 0); it.def = { ...it.def, respawn: 0 }; return it; });
    let time = 40, left = 3;
    const hook = (it, p) => { for (const t of o.targets) { if (t.hit) continue; const c = t.t.getWorldPosition(new V3()); if (c.distanceTo(p) < 0.85) { t.hit = true; o.sols[t.i].on = false; left--; burst(c.x, c.y, c.z, 10, { color: 0xff8a1f, size: 0.2, speed: 2.5 }); api.msg(left ? `Попал! Осталось ${left}` : 'Все мишени сбиты!', 'good'); } } };
    W.hitHooks.push(hook); api.msg('Сбей 3 мишени — бросай с линии (ПКМ)');
    return {
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
    const c = o.pos(), N = 5; let time = 45, got = 0;
    for (let i = 0; i < N; i++) { let x, z, tries = 0; do { const a = Math.random() * 6.28, r = 3 + Math.random() * 4; x = c.x + Math.cos(a) * r; z = c.z + Math.sin(a) * r; tries++; } while (tries < 20 && !ctx.free(x, z, c.y));
      o.litter.push(spawnLitter(x, c.y, z)); }
    api.msg('Собери мусор в урну (бросай или клади рядом)');
    const take = it => { it.state = 'gone'; it.g.visible = false; got++; smokeRing(c.x, c.y + 0.9, c.z, 5, { speed: 1, size: 0.1 }); api.msg(got < N ? `В урне ${got} из ${N}` : 'Чисто!', 'good'); };
    const hook = (it, p) => { if (o.litter.includes(it) && Math.hypot(p.x - c.x, p.z - c.z) < 0.9) take(it); };
    W.hitHooks.push(hook);
    return {
      target: () => { const l = o.litter.find(it => it.state !== 'gone'); return l ? l.pos : c; },
      update(dt) {
        time -= dt; api.timer(time);
        for (const it of o.litter) if (it.state === 'rest' && Math.hypot(it.pos.x - c.x, it.pos.z - c.z) < 1.0) take(it);
        o.ring.material.opacity = 0.35 + Math.sin(performance.now() * 0.006) * 0.25;
        api.progress(got / N);
        if (got >= N) return api.finish({ success: true, mult: 1 });
        if (time <= 0) return api.finish({ success: false });
      },
      stop() { W.hitHooks.splice(W.hitHooks.indexOf(hook), 1); },
    };
  },

  // Доставка: бери заказ у раздачи и отнеси на этаж здания, пока не остыл. Посылку можно бросить и снова поднять
  delivery(o, api, ctx) {
    const P = ctx.player, from = o.pos(), dests = W.spots.deliver.filter(d => Math.hypot(d.x - from.x, d.z - from.z) > 14);
    const dest = (dests.length ? dests : W.spots.deliver)[(Math.random() * (dests.length || W.spots.deliver.length)) | 0];
    const parcel = addItem('parcel', from.x, from.y + 0.2, from.z, 0); parcel.def = { ...parcel.def, respawn: 0 };
    ctx.give(parcel);
    const beam = mesh(G.beam, new THREE.MeshBasicMaterial({ color: 0x9be36b, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }), dest.x, dest.y + 1.5, dest.z, 0.8, 3, 0.8, W.group);
    let time = 55;
    api.msg(`Отнеси заказ: ${dest.name}`);
    return {
      target: () => (P.held === parcel ? new V3(dest.x, dest.y, dest.z) : parcel.pos),
      update(dt) {
        time -= dt; api.timer(time); beam.rotation.y += dt;
        api.progress(1 - Math.min(1, Math.hypot(P.pos.x - dest.x, P.pos.z - dest.z) / 40));
        const near = Math.hypot(parcel.pos.x - dest.x, parcel.pos.z - dest.z) < 2.0 && Math.abs(parcel.pos.y - dest.y) < 1.6;
        if (near && (P.held === parcel || parcel.state === 'rest')) { burst(dest.x, dest.y + 1, dest.z, 12, { color: 0x9be36b, size: 0.2, speed: 2 }); return api.finish({ success: true, mult: 1 }); }
        if (parcel.state === 'gone') return api.finish({ success: false });
        if (time <= 0) return api.finish({ success: false });
      },
      stop() { W.group.remove(beam); if (P.held === parcel) P.held = null; parcel.state = 'gone'; parcel.g.visible = false; },
    };
  },

  // Снос: садишься в кран и сносишь отмеченную красную стену, пока не кончилось время
  demolition(o, api, ctx) {
    const sp = W.spots.demo[0];
    for (const p of sp.pieces || []) if (p.alive) { p.alive = false; if (p.solid) p.solid.on = false; p.mesh.parent && p.mesh.parent.remove(p.mesh); }
    const mat = lam({ color: 0xd85a4a, emissive: 0x401010, emissiveIntensity: 1 }, 'demoBrick');
    sp.pieces = brickWall(sp.x, sp.z, sp.y, 4, 2.4, 'x', { mat, bw: 0.8, bh: 0.6 });
    for (const p of sp.pieces) { p.mesh.castShadow = true; p.mesh.receiveShadow = true; }
    smokeRing(sp.x, sp.y + 0.2, sp.z, 10, { speed: 3, size: 0.3 });
    let time = 50; const N = sp.pieces.length;
    ctx.enterCrane();
    api.msg('Снеси красную стену шар-бабой! WASD — шар');
    return {
      target: () => new V3(sp.x, sp.y + 1, sp.z),
      update(dt) {
        time -= dt; api.timer(time);
        const broken = sp.pieces.filter(p => !p.alive).length; api.progress(broken / N / 0.75);
        if (broken >= N * 0.75) return api.finish({ success: true, mult: 1 });
        if (time <= 0) return api.finish({ success: false });
      },
      stop() { ctx.exitCrane(); },
    };
  },
};
void breakPiece; void tmat; void T;
