import { THREE, G, tmat, col, glow, lam } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { sfx } from '../../core/sfx.js';

/* Заброшенная больница: два этажа, тёмный коридор с мигающими лампами, палаты с койками,
   каталки (схватить ЛКМ, разогнать и запрыгнуть E), хлопающие сами по себе двери, призраки-простыни,
   рентген-кабинет со светящимся снимком, лифт «НЕ РАБОТАЕТ», шкафчики персонала (открываются),
   регистратура с телефоном, кухня персонала. Снаружи: скорая, сломанный забор, заросли. */
export default {
  id: 'hospital', name: 'Больница', ground: 'dirt',
  build(b) {
    b.ground(13.5, 16, 18.5, 31.5, T.concrete(), 3);
    const FH = 3.8;
    b.tower({ x: 2, z: 0.5, w: 26, d: 15.5, floors: 2, fh: FH, wall: 0x8a9a8c, lit: 0.12, lights: false, floor: T.floorTile(),
      door: { side: 's', at: 0.5, sign: ['БОЛЬНИЦА №13', '#2a5a4a', '#d8f0e0'] }, gaps: [{ side: 'e', at: 0.5 }], fireEscape: { side: 'w', at: 0.5 },
      interior(f, k, r) {
        const h = FH - 0.2, north = 8.5, south = 11.7, mid = (north + south) / 2;
        // Сквозной коридор 3.2 м. Вход и лестница соединены свободным проходом.
        for (const [xa, xb] of [[r.x0, 10.5], [10.5, 19], [19, r.x1]]) {
          f.partition(xa, north, xb, north, h, 0.5, 2);
          if (xa > r.x0) f.box(xa, (r.z0 + north) / 2, 0.12, north - r.z0, h, tmat(T.plaster()));
          const cx = (xa + xb) / 2;
          f.flickerLamp(cx, (r.z0 + north) / 2, FH - 0.2);
          if (k === 0) {
            if (xa === r.x0) { f.desk(cx, r.z0 + 0.7, 0, true); f.phoneSpot(cx, r.z0 + 0.7, [0, 1]); }
            else if (xa === 10.5) { f.xray(cx, r.z0 + 0.5, 0); f.cupboard(xb - 0.65, r.z0 + 0.4); }
            else { f.bed(cx, r.z0 + 1.3, Math.PI, 0x8ab0a8); f.sheetGhost(xb - 1.1, north - 0.9, FH - 0.3); }
          } else {
            if (xa === r.x0) f.kitchen(cx + 0.5, r.z0 + 0.45, 3, 0);
            else if (xa === 10.5) for (let x = xa + 1; x < xb - 1; x += 0.8) f.locker(x, r.z0 + 0.4, 0, 0x4a7a6a);
            else { f.bed(cx, r.z0 + 1.3, Math.PI, 0xd8d0c0); f.xray(xb - 0.6, north - 1, -Math.PI / 2); }
          }
        }
        // Две большие палаты по сторонам центрального входного холла.
        for (const [xa, xb] of [[r.x0, 12], [18, r.x1]]) {
          const cx = (xa + xb) / 2;
          f.partition(xa, south, xb, south, h, 0.5, 2);
          const inner = xa === r.x0 ? xb : xa;
          f.box(inner, (south + r.z1) / 2, 0.12, r.z1 - south, h, tmat(T.plaster()));
          const door = f.door(cx - 1, south, 'x', 1, 0, 2, 2.2); door.haunted = true;
          for (const x of [xa + 1.5, xb - 1.5]) f.bed(x, r.z1 - 1.4, Math.PI, k ? 0xd8d0c0 : 0x8ab0a8);
          f.cupboard(cx, r.z1 - 0.4, Math.PI); f.flickerLamp(cx, (south + r.z1) / 2, FH - 0.2);
          if (k === 1) f.sheetGhost(xa + 1.5, south + 0.9, FH - 0.3);
        }
        for (let x = r.x0 + 2; x < r.x1 - 1; x += 5) f.flickerLamp(x, mid, FH - 0.2);
        f.elevator(r.x1 - 2, r.z0 - 0.1, 0, 0);
        // Каталки в боковых карманах, середина коридора остаётся свободной.
        f.ride('gurney', r.x1 - 1.3, mid, Math.PI / 2);
        f.ride('gurney', r.x0 + 1.3, mid, -Math.PI / 2);
        f.sign(15, 2.5, south + 0.08, 0, k ? 'ПАЛАТЫ · ПЕРСОНАЛ' : 'РЕНТГЕН · РЕГИСТРАТУРА', '#2a5a4a', '#d8f0e0', 2.8, 0.35);
      } });
    // хлопающие двери: сами открываются и закрываются, когда кто-то рядом
    for (const d of W.doors) if (d.haunted) { let t = 2 + Math.random() * 4; W.animated.push(dt => { t -= dt; if (t > 0) return; t = 1.5 + Math.random() * 5; const P = W.player; if (!P || Math.hypot(P.pos.x - d.x, P.pos.z - d.z) > 14) return; d.open = !d.open; d.slam = 0.6; sfx('door', { at: d, v: 0.6 }); }); }
    // двор: скорая, сломанный забор, заросли, мёртвые деревья
    b.car(22.5, 23.5, Math.PI / 2, 0xe8e4ec);
    b.m(G.box, tmat(T.sign('СКОРАЯ', '#f1e8ff', '#d8243a')), 22.5, 0.9, 25.53, 1.4, 0.3, 0.02);
    b.m(G.box, glow(0x4ab0f0), 22.5, 1.62, 23.5, 0.5, 0.12, 0.2);
    b.fence(1, 31.2, 12, 31.2, 1.4, 'wood'); b.fence(20, 31.2, 31, 31.2, 1.4, 'wood'); b.fence(31.2, 17, 31.2, 31, 1.6, 'iron');
    for (const [x, z] of [[3, 20], [9, 27], [27.5, 18.5]]) b.deadTree(x, z);
    for (const [x, z] of [[6, 18], [11, 21], [26, 29], [29, 21]]) b.bush(x, z, 1.4, 1.2, 0.9);
    b.leafPile(6.5, 24, 0.8); b.ride('gurney', 16, 20, 0.3); b.ride('chair', 10, 17.5, 1.2);
    b.dumpster(28.5, 26.5); b.bin(12.8, 17); b.trashBags(25.5, 17, 2);
    b.rake(4.5, 29, 0.6);
    b.lamp(13, 17.5, Math.PI); b.lamp(19, 30, 0);
    b.puddle(17, 24, 1.2); b.puddle(7, 19, 0.8);
    b.mist(0.5, 16, 31.5, 31.5, 0);
    b.birds('crow', 2, 18, 12, 30, 4);
    b.zone('floor', 1, 17, 12, 30); b.zone('floor', 19, 26, 31, 30.5);
    b.cats(1, 17, 31, 31);
    b.spawn(16, 22); b.spawn(5, 28);
    b.hw(() => { b.pumpkin(14.2, 16.6); b.pumpkin(24.5, 29); });
    void THREE; void col; void lam;
  },
};
