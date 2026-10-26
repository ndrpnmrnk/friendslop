import {CONFIG} from '../config.js';
import { THREE, G, col, tmat, lam, glow, compose } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { addItem, launch,restOnSurface } from '../game/items.js';
import { burst } from './particles.js';
import { addSolid } from './physics.js';
import { sfx } from '../core/sfx.js';
import { addOutline, OUTLINE } from '../game/outline.js';

/* То, что открывается на E: холодильник, шкафчик, кухонный шкаф. Дверца на петле плавно распахивается,
   корпус полый: внутри полки, примерно в половине лежит предмет (еда, банка или инструмент) — открыл и бери. */
const LOOT = {
  fridge: ['bao','taco','noodles','burger','tomato', 'cucumber', 'can', 'energy', 'can', 'tomato', 'pizza'],
  locker: ['slipper', 'umbrella', 'whistle', 'duck', 'water', 'ball', 'banana', 'magnet'],
  cupboard: ['bao','noodles','can', 'paint', 'bubbles', 'pillow', 'duck', 'popper'],
};
// полый корпус (v0.22): стенки, крыша, дно — без совпадающих граней (не рябит), внутри тёмная задняя стенка и полки
function shell(a, outer, inner, shelfM, w, h, d, shelves, t = 0.04) {
  for (const sx of [-1, 1]) a(G.box, outer, sx * (w / 2 - t / 2), h / 2, 0, t, h, d);
  a(G.box, outer, 0, h / 2, -d / 2 + t / 2 + 0.001, w - 2 * t - 0.002, h - 0.004, t);
  a(G.box, outer, 0, h - t / 2 - 0.001, 0.002, w - 2 * t - 0.002, t, d - 0.004); a(G.box, outer, 0, t / 2 + 0.001, 0.002, w - 2 * t - 0.002, t, d - 0.004);
  a(G.box, inner, 0, h / 2, -d / 2 + t + 0.006, w - 2 * t - 0.01, h - 2 * t - 0.01, 0.01);
  for (const yy of shelves) a(G.box, shelfM, 0, yy, 0.01, w - 2 * t - 0.01, 0.02, d - t - 0.05);
}
export const OpenMethods = {
  // общая заготовка: корпус уже построен (полый), w/h/d — размеры, дверца на передней грани (+z), петля слева.
  // Твёрдые стенки/полки — отдельными коробками, дверца — твёрдая, пока закрыта. Примерно в половине внутри лежит предмет.
  openable(g, kind, w, h, d, y, doorMat, chance = 0.5, shelves = []) {
    const pivot = new THREE.Group(); pivot.position.set(-w / 2, y, d / 2); g.add(pivot); W.keep.push(pivot);
    const door = new THREE.Mesh(G.box, doorMat); door.position.set(w / 2, h / 2, 0.026); door.scale.set(w - 0.01, h - 0.01, 0.05); pivot.add(door);
    const hd = new THREE.Mesh(G.box, col(0xc8c8d8)); hd.position.set(w - 0.1, h * 0.55, 0.07); hd.scale.set(0.04, Math.min(0.4, h * 0.3), 0.04); pivot.add(hd);for(const yy of[.17,h-.17]){const hinge=new THREE.Mesh(G.cyl8,col(0xb4ad9c));hinge.position.set(.012,yy,.025);hinge.scale.set(.025,.11,.025);pivot.add(hinge);}
    const o = { pivot, open: false, k: 0, looted: false, kind };
    g.updateMatrixWorld(true);
    // твёрдое: локальная коробка → мировой AABB (повороты кратны 90°)
    const ls = (cx, cy, cz, sx, sy, sz) => { const A = new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2), B = new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2); g.localToWorld(A); g.localToWorld(B);
      return addSolid(Math.min(A.x, B.x), Math.min(A.z, B.z), Math.max(A.x, B.x), Math.max(A.z, B.z), Math.min(A.y, B.y), Math.max(A.y, B.y)); };
    const t = 0.04; ls(-w / 2 + t / 2, y + h / 2, 0, t, h, d); ls(w / 2 - t / 2, y + h / 2, 0, t, h, d); ls(0, y + h / 2, -d / 2 + t / 2, w, h, t); ls(0, y + h - t / 2, 0, w, t, d); ls(0, y + t / 2, 0, w, t, d);
    for (const yy of shelves) ls(0, y + yy, 0.01, w - 2 * t, 0.02, d - t - 0.05);
    const doorS = ls(0, y + h / 2, d / 2 + 0.02, w, h, 0.05);
    const front = new THREE.Vector3(0, y, d / 2 + 0.75); g.localToWorld(front);
    const inside = new THREE.Vector3(0, y + h * 0.5, d / 2 + 0.35); g.localToWorld(inside); const out = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
    // лут лежит внутри с самого начала — на случайной полке или на дне
    if (Math.random() < chance) { const l=LOOT[kind].filter(type=>(CONFIG.items[type].r*2)<Math.min(w-.12,d-.12)),type=l[(Math.random()*l.length)|0]||'can', lv = [t, ...shelves.map(q => q + 0.01)], yy = lv[(Math.random() * lv.length) | 0];
      const at = new THREE.Vector3((Math.random() - 0.5) * 0.1, y + yy + 0.005, -0.02); g.localToWorld(at); const it = addItem(type, at.x, at.y, at.z, g.rotation.y); restOnSurface(it);it.boxed=o;it.shelfHome={x:at.x,y:at.y,z:at.z};(W.dressings??=[]).push({kind:'shelf-item',item:it,surface:at.y,container:kind});o.gave=true; }
    const ol = addOutline(door, 0.025, OUTLINE.use);
    W.interacts.push({ x: front.x, z: front.z, y: g.position.y, r: 1.1, dy: 1.2, outline: ol, glow: () => !o.looted, get label() { const n = { fridge: 'холодильник', locker: 'шкафчик', cupboard: 'шкаф' }[kind] || ''; return o.open ? `Закрыть ${n}${o.looted && !o.gave ? ' · пусто' : ''}` : `Открыть ${n}`; }, enabled: P => !P.held,
      act: () => { o.open = !o.open; doorS.on = !o.open; sfx('open', { at: inside });
        if (o.open && !o.looted) { o.looted = true;W.coinLoot?.(inside,o); if (W.containerLoot && W.containerLoot(inside)) { o.gave = true; burst(inside.x, inside.y + 0.2, inside.z, 6, { color: 0xf1e8ff, size: 0.12, speed: 1.2, up: 1 }); } } } });
    W.animated.push(dt => { const want = o.open ? 1 : 0; if (Math.abs(o.k - want) < 0.001) return; o.k += (want - o.k) * Math.min(1, dt * 9); pivot.rotation.y = -o.k * 1.85; });
    return o;
  },
  // холодильник: белый корпус, внутри светлая подсветка и стеклянные полки
  fridge(x, z, ry = 0, y = 0) {
    const g = this.prop(x, z, ry), w = 0.72, h = 1.9, d = 0.66, sh = [0.55, 1.0, 1.42];
    g.add(compose('fridgeBody2', a => { shell(a, col(0xe8e4ec), col(0xc8d4dc), lam({ color: 0xd8e8f0, transparent: true, opacity: 0.6 }, 'fridgeShelf'), w, h, d, sh);
      a(G.box, glow(0xf1f8ff), 0, h - 0.08, 0.05, 0.3, 0.03, 0.05); }));
    this.openable(g, 'fridge', w, h, d, 0, tmat(T.cabinet(0xd8d4dc)), 0.5, sh);
  },
  // металлический шкафчик (раздевалка, больница, школа)
  locker(x, z, ry = 0, c = 0x4a6a8a) {
    const g = this.prop(x, z, ry), w = 0.55, h = 1.85, d = 0.5, sh = [1.3];
    g.add(compose('locker2' + c, a => shell(a, col(c), col(0x17111f), col(0x6a6d78), w, h, d, sh)));
    this.openable(g, 'locker', w, h, d, 0, lam({ map: T.lockerDoor(c) }, 'lockerDoor43' + c), 0.5, sh);
  },
  // невысокий шкаф-тумба
  cupboard(x, z, ry = 0) {
    const g = this.prop(x, z, ry), w = 0.9, h = 0.9, d = 0.5, wd = tmat(T.wood());
    g.add(compose('cupboard2', a => { shell(a, wd, col(0x2a1f18), wd, w, h, d, [0.45]); a(G.box, wd, 0, h + 0.021, 0, w + 0.06, 0.04, d + 0.04); }));
    this.openable(g, 'cupboard', w, h, d, 0, tmat(T.cabinet(0x6a4a30)), 0.5, [0.45]);
    const q = Math.abs(Math.sin(ry)) > 0.5; this.solid(x, z, q ? d + 0.04 : w + 0.06, q ? w + 0.06 : d + 0.04, h, 0.041);
  },
};
