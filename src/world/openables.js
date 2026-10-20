import { THREE, G, col, tmat, lam, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addItem, launch } from '../game/items.js';
import { burst } from './particles.js';
import { sfx } from '../core/sfx.js';

/* То, что открывается на E: холодильник, шкафчик, кухонный шкаф. Дверца на петле плавно распахивается,
   внутри при первом открытии иногда лежит предмет (еда, банка или инструмент). */
const LOOT = {
  fridge: ['tomato', 'cucumber', 'can', 'energy', 'can', 'tomato', 'pizza'],
  locker: ['slipper', 'umbrella', 'whistle', 'duck', 'water', 'ball', 'banana', 'magnet'],
  cupboard: ['can', 'paint', 'bubbles', 'pillow', 'duck', 'popper'],
};
export const OpenMethods = {
  // общая заготовка: корпус уже построен, w/h/d — размеры, дверца на передней грани (+z), петля слева
  openable(g, kind, w, h, d, y, doorMat, chance = 0.55) {
    const pivot = new THREE.Group(); pivot.position.set(-w / 2, y, d / 2); g.add(pivot); W.keep.push(pivot);
    const door = new THREE.Mesh(G.box, doorMat); door.position.set(w / 2, h / 2, 0.025); door.scale.set(w - 0.02, h - 0.02, 0.05); pivot.add(door);
    const hd = new THREE.Mesh(G.box, col(0xc8c8d8)); hd.position.set(w - 0.1, h * 0.55, 0.07); hd.scale.set(0.04, Math.min(0.4, h * 0.3), 0.04); pivot.add(hd);
    const o = { pivot, open: false, k: 0, looted: false, kind };
    g.updateMatrixWorld(true);
    const front = new THREE.Vector3(0, y, d / 2 + 0.75); g.localToWorld(front);
    const inside = new THREE.Vector3(0, y + h * 0.5, d / 2 + 0.35); g.localToWorld(inside); const out = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
    W.interacts.push({ x: front.x, z: front.z, y: g.position.y, r: 1.1, dy: 1.2, get label() { return o.open ? 'Закрыть' : 'Открыть'; }, enabled: P => !P.held,
      act: () => { o.open = !o.open; sfx('open', { at: inside });
        if (o.open && !o.looted) { o.looted = true; if (!(W.containerLoot && W.containerLoot(inside)) && Math.random() < chance * 0.5) { const l = LOOT[kind], type = l[(Math.random() * l.length) | 0], it = addItem(type, inside.x, inside.y - it_r(type), inside.z, g.rotation.y);
          if (it.def.tool) it.life = 60; it.noHitT = 0.6; launch(it, inside.clone(), new THREE.Vector3(out.x * 2, 2.5, out.z * 2)); burst(inside.x, inside.y + 0.2, inside.z, 6, { color: 0xf1e8ff, size: 0.12, speed: 1.2, up: 1 }); } } } });
    W.animated.push(dt => { const want = o.open ? 1 : 0; if (Math.abs(o.k - want) < 0.001) return; o.k += (want - o.k) * Math.min(1, dt * 9); pivot.rotation.y = -o.k * 1.85; });
    return o;
  },
  // холодильник: белый корпус, внутри свет и полки
  fridge(x, z, ry = 0, y = 0) {
    const g = this.prop(x, z, ry), w = 0.72, h = 1.9, d = 0.66, body = col(0xe8e4ec);
    g.add(compose('fridgeBody', a => { a(G.box, body, 0, h / 2, -0.03, w, h, d - 0.06); a(G.box, col(0x2b2533), 0, h / 2, d / 2 - 0.07, w - 0.08, h - 0.08, 0.02);
      a(G.box, glow(0xf1f8ff), 0, h - 0.18, d / 2 - 0.2, 0.3, 0.04, 0.05); for (const yy of [0.5, 0.95, 1.4]) a(G.box, lam({ color: 0xd8e8f0, transparent: true, opacity: 0.6 }, 'fridgeShelf'), 0, yy, 0, w - 0.1, 0.02, d - 0.2);
      a(G.box, col(0x6aa84f), -0.15, 0.6, 0, 0.12, 0.12, 0.12); a(G.cyl8, col(0xd8243a), 0.18, 1.05, 0, 0.05, 0.18, 0.05); }));
    this.openable(g, 'fridge', w, h, d, 0, tmat(T.cabinet(0xd8d4dc)));
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? d : w, q ? w : d, y, h);
  },
  // металлический шкафчик (раздевалка, больница, школа)
  locker(x, z, ry = 0, c = 0x4a6a8a) {
    const g = this.prop(x, z, ry), w = 0.55, h = 1.85, d = 0.5;
    g.add(compose('locker' + c, a => { a(G.box, col(c), 0, h / 2, -0.02, w, h, d - 0.04); a(G.box, col(0x17111f), 0, h / 2, d / 2 - 0.05, w - 0.06, h - 0.06, 0.02); a(G.box, col(0x6a6d78), 0, h * 0.7, 0, w - 0.1, 0.02, d - 0.12); }));
    this.openable(g, 'locker', w, h, d, 0, lam({ map: T.vent(c) }, 'lockerDoor' + c), 0.6);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? d : w, q ? w : d, 0, h);
  },
  // невысокий шкаф-тумба
  cupboard(x, z, ry = 0) {
    const g = this.prop(x, z, ry), w = 0.9, h = 0.9, d = 0.5, wd = tmat(T.wood());
    g.add(compose('cupboard', a => { a(G.box, wd, 0, h / 2, -0.02, w, h, d - 0.04); a(G.box, col(0x2a1f18), 0, h / 2, d / 2 - 0.05, w - 0.06, h - 0.06, 0.02); a(G.box, wd, 0, h + 0.02, 0, w + 0.06, 0.04, d + 0.04); }));
    this.openable(g, 'cupboard', w, h, d, 0, tmat(T.cabinet(0x6a4a30)), 0.5);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? d : w, q ? w : d, 0, h + 0.04);
  },
};
const it_r = type => ({ pizza: 0.26, tomato: 0.16, cucumber: 0.14, can: 0.1 }[type] || 0.15);
