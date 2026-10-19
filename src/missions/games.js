import { THREE, G, V3, mesh, col, tmat } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { clamp } from '../core/rng.js';

/* Мини-игры прямо в 3D-мире. Каждая получает объект и api:
   api.pose(p, l) — куда поставить камеру, api.progress(0..1|null), api.msg(text, cls), api.finish(result).
   Возвращает обработчики down/move/up(ray) и update(dt), stop(). */

function buildHand() {
  const g = new THREE.Group(), skin = tmat(T.fur({ name: 'hand', base: '#e8b896', light: '#f4cfb0', dark: '#c8946e', stripes: false }));
  mesh(G.box, skin, 0, 0, 0, 0.22, 0.06, 0.24, g);
  for (let i = 0; i < 4; i++) mesh(G.box, skin, -0.075 + i * 0.05, -0.005, -0.17 + Math.abs(i - 1.5) * 0.015, 0.04, 0.045, 0.12, g);
  mesh(G.box, skin, -0.13, 0, 0.02, 0.05, 0.045, 0.11, g);
  g.scale.setScalar(0.85); return g;
}

export const GAMES = {
  cat(cat, api, ctx) {
    cat.mode = 'pet'; cat.state = 'idle'; cat.flee = 0; cat.dizzy = 0; cat.stars.visible = false; cat.root.rotation.z = 0;
    const base = cat.root.position, cx = base.x, cz = base.z, by = base.y, backY = by + 0.68;
    const blocked = d => [0.35, 0.7, 1].some(k => { const x = cx + d[0] * 2 * k, z = cz + d[1] * 2 * k; return W.solids.some(s => s.on && s.y1 > by + 0.2 && s.y0 < by + 2 && x > s.x0 - 0.3 && x < s.x1 + 0.3 && z > s.z0 - 0.3 && z < s.z1 + 0.3); });
    const cd = [[0, 1], [1, 0], [-1, 0], [0, -1]].find(d => !blocked(d)) || [0, 1];
    const C = { x: cd[0], z: cd[1] }, F = { x: C.z, z: -C.x };
    cat.root.rotation.y = Math.atan2(F.x, F.z);
    const Wp = (a, b) => [cx + F.x * a + C.x * b, cz + F.z * a + C.z * b];
    api.pose(new V3(cx + C.x * 2.0, by + 1.65, cz + C.z * 2.0), new V3(cx, by + 0.3, cz));
    const hand = buildHand(); W.group.add(hand); hand.rotation.y = Math.atan2(C.x, C.z);
    { const [hx, hz] = Wp(0, 0.4); hand.position.set(hx, backY + 0.25, hz); }
    const target = hand.position.clone(), plane = new THREE.Plane(new V3(0, 1, 0), -backY), hit = new V3();
    let down = false, prog = 0, last = null, done = false, doneT = 0, happy = 0, hiss = 0, purr = 0, t = 0;
    api.progress(0); ctx.cursor(false);
    return {
      move(ray) { if (ray.ray.intersectPlane(plane, hit)) { const a = clamp((hit.x - cx) * F.x + (hit.z - cz) * F.z, -0.95, 0.95), b = clamp((hit.x - cx) * C.x + (hit.z - cz) * C.z, -0.55, 0.8); [target.x, target.z] = Wp(a, b); } },
      down(ray) { down = true; this.move(ray); }, up() { down = false; last = null; },
      update(dt) {
        t += dt; hiss -= dt; happy -= dt; purr -= dt;
        target.y = backY + (down ? 0.03 : 0.24);
        hand.position.lerp(target, 1 - Math.exp(-dt * 25));
        const la = (hand.position.x - cx) * F.x + (hand.position.z - cz) * F.z, lb = (hand.position.x - cx) * C.x + (hand.position.z - cz) * C.z;
        const onCat = Math.abs(la) < 0.65 && Math.abs(lb) < 0.45;
        if (down && onCat && !done) {
          if (last) {
            const ddx = hand.position.x - last.x, ddz = hand.position.z - last.z, d = Math.hypot(ddx, ddz), sp = d / Math.max(dt, 1e-3), dx = ddx * F.x + ddz * F.z;
            if (sp > 3.4) { if (hiss <= 0) { hiss = 0.9; prog = Math.max(0, prog - 0.08); api.msg('Ш-ш-ш! Слишком резко', 'bad'); } }
            else if (hiss <= 0 && d > 0.002) { prog += d * (dx < 0 ? 1 : 0.6) / 3.6; happy = 0.4; if (purr <= 0) { api.msg('Мррр...', 'good'); purr = 1.4; } }
          }
          last = hand.position.clone();
        } else last = null;
        if (prog >= 1 && !done) { prog = 1; done = true; doneT = 1; api.msg('Кот доволен!', 'good'); }
        if (done) { doneT -= dt; if (doneT <= 0) return api.finish({ success: true, mult: 1 }); }
        api.progress(prog);
        cat.face(hiss > 0 ? 'angry' : (happy > 0 || done) ? 'closed' : 'open');
        const hap = happy > 0 || done;
        cat.body.scale.y = 0.17 * (1 + Math.sin(t * (hap ? 10 : 3)) * (hap ? 0.05 : 0.02));
        cat.tail.rotation.x = hiss > 0 ? 1.2 : 0.7; cat.tail.rotation.y = Math.sin(t * (hap ? 2 : 4)) * (hap ? 0.25 : 0.5);
        cat.head.rotation.y += ((hiss > 0 ? -0.9 : 0) - cat.head.rotation.y) * Math.min(1, dt * 10);
        cat.ears.forEach((e, i) => e.rotation.x += ((hiss > 0 ? -0.8 : 0) - e.rotation.x) * Math.min(1, dt * 12));
        cat.root.position.y = by + (hiss > 0.6 ? 0.08 : 0);
      },
      stop() { W.group.remove(hand); ctx.cursor(true); cat.mode = 'walk'; cat.state = 'idle'; cat.timer = 1.5; cat.face('open'); cat.head.rotation.y = 0; cat.ears.forEach(e => (e.rotation.x = 0)); cat.body.scale.y = 0.17; cat.root.position.y = by; },
    };
  },

  puzzle(board, api, ctx) {
    const F = new V3(board.f[0], 0, board.f[1]), Rt = new V3(board.f[1], 0, -board.f[0]);
    api.pose(board.center.clone().addScaledVector(F, 4.2).addScaledVector(Rt, 0.9).add(new V3(0, 0.2, 0)), board.center.clone().addScaledVector(Rt, 0.9));
    const o = board.order;
    do { for (let i = 8; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } } while (o.every((v, i) => v === i));
    let sel = -1, moves = 0, done = false, doneT = 0, t = 0; const tv = new V3();
    api.progress(null); api.msg('Ходов: 0');
    return {
      down(ray) {
        if (done) return;
        const hits = ray.intersectObjects(board.tiles.map(x => x.mesh)); if (!hits.length) return;
        const tile = board.tiles.find(x => x.mesh === hits[0].object), slot = o.indexOf(tile.idx);
        if (sel < 0) sel = slot; else if (sel === slot) sel = -1;
        else { [o[sel], o[slot]] = [o[slot], o[sel]]; sel = -1; moves++; api.msg('Ходов: ' + moves);
          if (o.every((v, i) => v === i)) { done = true; doneT = 1.1; api.msg('Собрано!', 'good'); } }
      },
      update(dt) {
        t += dt;
        board.tiles.forEach(tile => {
          const slot = o.indexOf(tile.idx), s = board.slots[slot];
          tv.set(s.x, s.y, s.z + (slot === sel ? 0.18 : 0) + (done ? Math.abs(Math.sin(t * 9 + slot)) * 0.06 : 0));
          tile.mesh.position.lerp(tv, 1 - Math.exp(-dt * 14));
          tile.mesh.material[4].emissive.setHex(slot === sel ? 0x664400 : done ? 0x223311 : 0);
        });
        if (done) { doneT -= dt; if (doneT <= 0) api.finish({ success: true, mult: 1 }); }
      },
      stop() { for (let i = 0; i < 9; i++) { o[i] = i; board.tiles[i].mesh.position.copy(board.slots[i]); board.tiles[i].mesh.material[4].emissive.setHex(0); } },
    };
  },

  ttt(table, api, ctx) {
    api.pose(table.world(0.6, 2.9, 2.2), table.world(0.6, 0.85, -0.35));
    const b = Array(9).fill(''), LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    let lock = false, over = false, botT = -1, endT = -1, res = null, t = 0;
    const win = p => LINES.some(l => l.every(i => b[i] === p)), full = () => b.every(Boolean);
    api.progress(null); api.msg('Твой ход');
    function place(p, i) {
      b[i] = p; const g = new THREE.Group(), c = table.cells[i].position;
      if (p === 'X') [0.78, -0.78].forEach(r => { const m = mesh(G.box, col(0xff8a1f), 0, 0, 0, 0.36, 0.07, 0.08, g); m.rotation.y = r; });
      else { const m = mesh(G.torus, col(0xb18cff), 0, 0, 0, 0.14, 0.14, 0.14, g); m.rotation.x = Math.PI / 2; }
      g.position.set(c.x, 1.5, c.z); g.userData.y = 0.97; table.g.add(g); table.pieces.push(g);
    }
    function botMove() {
      const empty = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
      if (Math.random() < 0.15) return empty[Math.floor(Math.random() * empty.length)];
      for (const p of ['O', 'X']) for (const l of LINES) { const vals = l.map(i => b[i]); if (vals.filter(v => v === p).length === 2 && vals.includes('')) return l[vals.indexOf('')]; }
      if (!b[4]) return 4;
      return empty[Math.floor(Math.random() * empty.length)];
    }
    function end(mult, text, cls) { over = true; api.msg(text, cls); res = mult > 0 ? { success: true, mult } : { success: false }; endT = 1.1; }
    return {
      down(ray) {
        if (lock || over) return;
        const hits = ray.intersectObjects(table.cells); if (!hits.length) return;
        const i = table.cells.indexOf(hits[0].object); if (b[i]) return;
        place('X', i);
        if (win('X')) return end(1, 'Победа!', 'good');
        if (full()) return end(0.5, 'Ничья', '');
        lock = true; botT = 0.6; api.msg('Призрак думает...');
      },
      update(dt) {
        t += dt;
        table.pieces.forEach(g => { g.position.y += (g.userData.y - g.position.y) * Math.min(1, dt * 12); });
        table.ghost.position.x = Math.sin(t * (lock ? 6 : 1.5)) * (lock ? 0.15 : 0.08);
        if (botT > 0) { botT -= dt; if (botT <= 0) { place('O', botMove()); lock = false;
          if (win('O')) end(0, 'Призрак победил', 'bad'); else if (full()) end(0.5, 'Ничья', ''); else api.msg('Твой ход'); } }
        if (endT > 0) { endT -= dt; if (endT <= 0) api.finish(res); }
      },
      stop() { table.pieces.forEach(g => table.g.remove(g)); table.pieces = []; table.ghost.position.x = 0; },
    };
  },
};
