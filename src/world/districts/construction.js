import { random } from '../../core/random.js';
import { storageBay, pipeCradle } from '../storage.js';
import { THREE, G, V3, tmat, smat, col, glow, lam } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { buildCrane } from '../crane.js';
import { hitBreakables } from '../breakables.js';
import { impulsePushables } from '../physics.js';
import { actors, knockDown } from '../../game/actors.js';
import { sfx } from '../../core/sfx.js';
import { burst } from '../particles.js';

/* Стройка (v0.60, 44×44 по схеме): каркас дома с лесами в три яруса (запад), башенный кран (северо-восток),
   вагончик прорабов (юго-восток), штабели плит. Фишка — ШАР ДЛЯ СНОСА на высокой П-образной раме: висит, оттянутый
   в сторону; по таймеру воет сирена, на земле в центре растёт тень — и шар проносится через центр стройки
   туда-обратно два раза. Сносит людей, ящики и кирпичные стенки. Бетономешалка — цель для захвата:
   засунул соперника — выкатывается в цементе (5 с медленный). */
const PX = 24, PY = 12.6, PZ = 24, L = 11, BR = .85, AMP = 1.0;
export default {
  id: 'construction', name: 'Стройка', ground: 'dirt', size: 44,
  build(b) {
    const cc = smat(T.concrete()), mt = col(0x6a6d78), wd = tmat(T.wood()), yel = col(0xe0b02a), dk = col(0x2b2533);
    // забор-сетка по периметру, проходы по схеме (север, юг, восток)
    b.fence(1, .8, 19, .8, 1.8, 'mesh'); b.fence(25, .8, 43, .8, 1.8, 'mesh');
    b.fence(1, 43.2, 19, 43.2, 1.8, 'mesh'); b.fence(25, 43.2, 43, 43.2, 1.8, 'mesh');
    b.fence(.8, 1.2, .8, 42.8, 1.8, 'mesh'); b.fence(43.2, 1.2, 43.2, 19.5, 1.8, 'mesh'); b.fence(43.2, 24.5, 43.2, 42.8, 1.8, 'mesh');
    b.m(G.box, tmat(T.sign('ЖК «ТЫКВА» · 2027', '#d8243a', '#f1e8ff')), 10, 1.1, 43.1, 4.4, 1.1, .03); b.m(G.box, tmat(T.sign('ОСТОРОЖНО · ШАР', '#f5c542', '#17111f')), 33, 1.1, 43.1, 4, 1.0, .03);

    /* ---------- каркас дома: колонны, два перекрытия, лестница, кирпичные стенки (ломаются) ---------- */
    for (const x of [3.3, 10, 16.7]) for (const z of [3.3, 13, 22.7]) b.box(x, z, .5, .5, 6.4, cc);
    // перекрытия с проёмами над лестницами
    const slab = (y, [hx0, hz0, hx1, hz1]) => { const X0 = 3, X1 = 17, Z0 = 3, Z1 = 23, P = (x0, z0, x1, z1) => x1 - x0 > .05 && z1 - z0 > .05 && b.box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, .25, cc, { y });
      P(X0, Z0, X1, hz0); P(X0, hz1, X1, Z1); P(X0, hz0, hx0, hz1); P(hx1, hz0, X1, hz1); };
    slab(3.2, [4.3, 7.15, 9.5, 8.85]); slab(6.4, [6.7, 17.15, 11.7, 18.85]);
    b.zone('roof', 3.6, 3.6, 16.4, 22.4, 6.65); b.zone('floor', 3.6, 3.6, 16.4, 22.4, 3.45);
    b.stairs(4.6, 8, 'e', 0, 3.2, 1.4); b.stairs(11.4, 18, 'w', 3.45, 6.4, 1.4, 3.45);
    b.brickWall(6.6, 3.3, 6.2, 3.2, 'x'); b.brickWall(13.4, 22.7, 6.2, 3.2, 'x'); b.brickWall(3.3, 17.8, 9, 1.8, 'z', 3.45);
    for (const y of [3.2, 6.4]) b.m(G.box, tmat(T.hazard()), 10, y + .45, 22.95, 13.6, .2, .04);
    b.climbTrim(10, 13, 14, 20, 6.65);
    // леса вдоль восточной стены: три яруса, лестницы на каждом
    { const X0 = 17.3, X1 = 19.1;
      for (const z of [3.5, 9, 14.5, 20]) for (const x of [X0, X1]) b.box(x, z, .1, .1, 6.6, mt);
      for (const y of [2.1, 4.3, 6.5]) { b.box((X0 + X1) / 2, 11.75, X1 - X0, 16.5, .1, wd, { y }); b.m(G.box, yel, X1 + .02, y + 1.0, 11.75, .05, .06, 16.5); b.climbTrim((X0 + X1) / 2, 11.75, X1 - X0, 16.5, y + .1, 'e'); }
      b.ladder(X1, 7.9, 'e', 2.2); b.ladder(X1, 18.3, 'e', 4.4, 2.2); b.ladder(X1, 12, 'e', 6.6, 4.4);
      for (const z of [3.5, 20]) b.m(G.box, mt, (X0 + X1) / 2, 3.3, z, .06, 6.4, .06).rotation.x = .3; }

    /* ---------- фишка: шар для сноса ---------- */
    { const tr = T.truss(); tr.wrapS = tr.wrapT = THREE.RepeatWrapping; const tt = tr.clone(); tt.needsUpdate = true; tt.repeat.set(1, PY);
      const truss = lam({ map: tt, alphaTest: .5, side: THREE.DoubleSide }, 'demo60-truss');
      for (const x of [PX - 11.8, PX + 11.8]) { b.m(G.box, truss, x, PY / 2, PZ, .9, PY, .9); b.solid(x, PZ, .9, .9, 0, PY); b.box(x, PZ, 1.6, 1.6, .4, cc); }
      b.m(G.box, yel, PX, PY + .3, PZ, 24.4, .7, .9); b.m(G.box, dk, PX, PY - .1, PZ, .6, .3, .6);
      for (const s of [-1, 1]) b.m(G.box, yel, PX + s * 11.1, PY - .6, PZ, 1.8, .2, .2).rotation.z = s * .6; }
    // тень-предупреждение на земле и полосы опасной зоны
    b.hazardFloor(PX, PZ - 2.2, 9, .5); b.hazardFloor(PX, PZ + 2.2, 9, .5);
    const shadow = b.m(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x0a0610, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), PX, .04, PZ, 1, 1, 1);
    shadow.rotation.x = -Math.PI / 2; shadow.userData.noBatch = true; W.keep.push(shadow);
    const siren = b.warnLamp(PX + 11.8, PY + .9, PZ, 0xff3a2a, .4);
    const ball = b.m(G.sph10, tmat(T.metal()), PX, 0, PZ, BR, BR, BR); ball.userData.noBatch = true; W.keep.push(ball);
    const chain = b.m(G.box, dk, PX, 0, PZ, .07, 1, .07); chain.userData.noBatch = true; W.keep.push(chain);
    const hz = b.hazard({ x0: PX - 4.6, z0: PZ - 1.9, x1: PX + 4.6, z1: PZ + 1.9, active: () => S.state !== 'idle' });
    const S = { state: 'idle', t: 0, next: 18, th: -AMP, prev: new V3() }; void hz;
    const P = new V3(b.X(PX), b.Y + PY, b.Z(PZ)), w = Math.sqrt(22 / L), pos = new V3(), vel = new V3();
    const place = th => { pos.set(P.x + Math.sin(th) * L, P.y - Math.cos(th) * L, P.z); ball.position.copy(pos); ball.updateMatrix();
      chain.position.set((P.x + pos.x) / 2, (P.y + pos.y) / 2, P.z); chain.scale.y = L; chain.rotation.z = th; chain.updateMatrix(); };
    place(S.th); S.prev.copy(pos);
    W.animated.push(dt => { S.t += dt;
      if (S.state === 'idle' && S.t > S.next) { S.state = 'warn'; S.t = 0; sfx('alarm', { at: P, range: 60 }); }
      else if (S.state === 'warn') { const k = Math.min(1, S.t / 2); shadow.material.opacity = .55 * k; shadow.scale.set(.5 + k * 4.2, .5 + k * 1.6, 1); siren.set(Math.sin(S.t * 16) > 0 ? 1 : .2);
        if (S.t > 2) { S.state = 'swing'; S.t = 0; sfx('wind', { at: P, range: 40 }); } }
      else if (S.state === 'swing') { S.th = -AMP * Math.cos(w * S.t); siren.set(Math.sin(S.t * 16) > 0 ? 1 : .2); shadow.material.opacity = .45 * Math.max(0, 1 - Math.abs(S.th) / AMP * 1.6);
        if (S.t > 4 * Math.PI / w) { S.state = 'idle'; S.t = 0; S.th = -AMP; S.next = 20 + random() * 10; shadow.material.opacity = 0; siren.set(0); sfx('bonk', { at: pos }); } }
      place(S.th); vel.subVectors(pos, S.prev).divideScalar(Math.max(dt, 1e-3)); S.prev.copy(pos);
      const sp = vel.length(); if (sp < 3) return;
      // удар: люди, ящики, кирпичные стенки, тележки
      for (const a of actors()) { if (a.hidden || a.drone || (a.stun > 0 && a.vel.y > 1)) continue; const cy = Math.max(a.pos.y, Math.min(pos.y, a.pos.y + 1.6));
        if (Math.hypot(a.pos.x - pos.x, cy - pos.y, a.pos.z - pos.z) < BR + .5) { const d = Math.sign(vel.x) || 1; knockDown(a, d * 11, (a.pos.z - pos.z) * 3, 1.6); a.vel.y = 7; sfx('hit', { at: a.pos }); burst(a.pos.x, a.pos.y + 1, a.pos.z, 12, { color: 0xd8d0c0, size: .14, speed: 4 }); } }
      if (hitBreakables(pos, BR, [vel.x, vel.y, vel.z], 30)) sfx('wood', { at: pos });
      impulsePushables(pos.x, pos.z, BR + .4, 9);
      for (const it of W.items) if (it.state === 'rest' && it.pos.distanceTo(pos) < BR + .4) { it.state = 'fly'; it.vel.set(vel.x * .8, 5, (random() - .5) * 3); } });
    // в зоне удара — ящики и кирпичная стенка (их сносит)
    b.brickWall(PX + 2.5, PZ, 2.8, 1.4, 'z'); b.crate(PX - 2.2, PZ + .9, 1); b.crate(PX - 2.2, PZ - .4, .9);

    /* ---------- башенный кран (СВ), штабели плит, бытовка-вагончик ---------- */
    buildCrane(b, 38.5, 5.5, [29, 12]);
    for (let i = 0; i < 4; i++) b.box(32, 18, 3.6, 3.6, .3, cc, { y: i * .32 });
    for (let i = 0; i < 3; i++) b.box(36.5, 17.5, 3.2, 2.2, .3, cc, { y: i * .32 });
    b.house({ x: 32.5, z: 33, w: 9, d: 5.5, h: 2.8, wall: 0x3a6a9a, brick: false, door: { side: 'n', at: .3, sign: ['ПРОРАБ', '#3a6a9a', '#f1e8ff'] }, parapet: false, web: false, floor: T.floorWood(),
      interior(f, r) { f.ptable(r.x0 + 1.5, (r.z0 + r.z1) / 2 + .3, .8); f.chair(r.x0 + 1.5, r.z1 - .5, Math.PI); f.cabinet(r.x1 - .4, (r.z0 + r.z1) / 2, .5, 1.6, 1.6, 0x58616b, 0, -Math.PI / 2); f.desk(r.x0 + 4.5, r.z1 - .7, Math.PI, true); f.item('badge', r.x0 + 1.5, (r.z0 + r.z1) / 2 + .3, .82); } });
    b.potty(41.6, 30.5, -Math.PI / 2); b.potty(41.6, 29, -Math.PI / 2);

    /* ---------- бетономешалка — цель для захвата ---------- */
    { const mixer = b.prop(12, 36), frame = col(0x2b2533);
      for (const xx of [-.48, .48]) { const leg = new THREE.Mesh(G.box, frame); leg.position.set(xx, .42, 0); leg.scale.set(.09, .8, .1); leg.rotation.z = -xx * .55; mixer.add(leg); }
      for (const xx of [-.6, .6]) { const wh = new THREE.Mesh(G.cyl8, frame); wh.position.set(xx, .2, -.2); wh.scale.set(.2, .12, .2); wh.rotation.z = Math.PI / 2; mixer.add(wh); }
      const tilt = new THREE.Group(); tilt.position.y = 1.15; tilt.rotation.x = .8; mixer.add(tilt); const drum = new THREE.Group(); tilt.add(drum);
      const geo = new THREE.CylinderGeometry(.34, .58, .9, 8); W.mapResources.add(geo); drum.add(new THREE.Mesh(geo, tmat(T.corrugated(0xd04a2a))));
      const mouth = new THREE.Mesh(G.disc, frame); mouth.position.y = .458; mouth.rotation.x = -Math.PI / 2; mouth.scale.setScalar(.3); drum.add(mouth);
      W.keep.push(drum); let clock = 0; W.animated.push(dt => { clock += dt; if (clock < .05) return; if (!W.player || W.player.pos.distanceToSquared(mixer.position) < 2500) drum.rotation.y += clock * 1.5; clock = 0; });
      b.solid(12, 36, 1.4, 1.3, 0, 1.8); }
    b.grabTarget({ x: 12, z: 37.6, r: 1.1, kind: 'slow', t: 5, color: 0x9a9488, label: 'мешалка' });
    b.cementPallet(15, 38.5); b.cementPallet(9, 39);

    /* ---------- склад материалов, мелочи ---------- */
    b.pallet(28, 30); { const bricks = b.surface(28, 30, 1.6, 1.2, .18, 0, 'pallet'); for (const [u, v] of [[-.4, -.2], [.4, -.2], [0, .3], [0, -.4]]) bricks.put('brick', u, v); }
    b.ride('barrow', 25, 36, .4); b.crate(5, 30, 1.1); b.crate(6.2, 30, 1.1); b.crate(5.6, 30, 1, 1.1);
    b.m(G.cone8, tmat(T.dirt()), 6, .7, 37, 2.4, 1.4, 2.4); b.solid(6, 37, 3, 3, 0, 1.2);
    { const sand = b.m(G.cone8, col(0xc8a868), 37.5, .55, 39.5, 1.8, 1.1, 1.5); sand.rotation.y = .4; b.solid(37.5, 39.5, 2.2, 1.8, 0, .8); }
    pipeCradle(b, 29, 40); storageBay(b, 3.5, 26.5, 3.6, 1.8, 'construction'); storageBay(b, 38.6, 11.5, 3.3, 1.7, 'construction');
    b.brickStack(21, 33); b.brickStack(36, 26); b.shed(2.5, 39.5, 3.5, 3);
    for (let i = 0; i < 7; i++) b.m(G.cyl5, tmat(T.rust()), 33, .08 + (i % 3) * .07, 28.5 + (i - 3) * .09, .025, 4, .025).rotation.z = Math.PI / 2; b.solid(33, 28.5, 4, .7, 0, .25);
    for (const [x, z, ry] of [[1.8, 30, Math.PI / 2], [42.2, 14, -Math.PI / 2]]) { b.m(G.cyl6, dk, x, 3, z, .08, 6, .08); b.solid(x, z, .3, .3, 0, 6);
      const hd = b.m(G.box, dk, x + Math.sin(ry) * .3, 5.9, z, .5, .4, .7); hd.rotation.y = ry; b.m(G.box, glow(0xfff4d8), x + Math.sin(ry) * .56, 5.9, z, .04, .3, .55).rotation.y = ry; b.light(x + Math.sin(ry) * 5, z, 4.5); }
    b.puddle(18, 30, 1.3); b.puddle(30, 25, 1); b.cone(21, 41); b.cone(23, 41); b.cone(40, 21); b.cone(40, 23);
    b.rake(16, 28, 1.0); b.tires(26, 41.5, 3);
    W.spots.demo.push({ x: b.X(10), z: b.Z(1.8), y: b.Y, pieces: [] });
    b.zone('floor', 20, 28, 42, 42); b.zone('floor', 1.5, 25, 20, 42);
    b.spawn(14, 30); b.spawn(30, 9); b.spawn(36, 22);
    b.hw(() => { b.pumpkin(19.5, 28.8, .35, .18); b.pumpkin(8, 33); });
  },
};
