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
    const FH = 3.6, X0 = 2, Z0 = 2, Wd = 26, D = 13;
    b.tower({ x: X0, z: Z0, w: Wd, d: D, floors: 2, fh: FH, wall: 0x8a9a8c, lit: 0.12, lights: false, floor: T.floorTile(),
      door: { side: 's', at: 0.5, sign: ['БОЛЬНИЦА №13', '#2a5a4a', '#d8f0e0'] }, gaps: [{ side: 'e', at: 0.5 }], fireEscape: { side: 'w', at: 0.5 },
      interior(f, k, r) {
        const h = FH - 0.2, cz0 = r.z0 + 3.0, cz1 = cz0 + 2.0; // коридор
        f.box((r.sx1 + 0.2 + r.x1) / 2, r.z0 - 0.1, r.x1 - r.sx1 - 0.2, 0.12, h, tmat(T.plaster()));
        // стены коридора: с севера — кабинеты, с юга — палаты; в каждой стене дверной проём
        const xs = [r.x0, r.x0 + 6.2, r.x0 + 12.4, r.x0 + 18.4, r.x1];
        for (let i = 0; i < xs.length - 1; i++) { f.partition(xs[i], cz1, xs[i + 1], cz1, h, 0.5); if (i > 0) f.box(xs[i], (cz1 + r.z1) / 2, 0.12, r.z1 - cz1, h, tmat(T.plaster())); }
        f.partition(r.x0, cz0, r.x0 + 12, cz0, h, 0.5); f.partition(r.x0 + 12, cz0, r.x1, cz0, h, 0.3);
        f.box(r.x0 + 12, (r.z0 + cz0) / 2, 0.12, cz0 - r.z0, h, tmat(T.plaster()));
        // мигающие лампы по коридору
        for (let x = r.x0 + 2; x < r.x1 - 1; x += 4.5) f.flickerLamp(x, (cz0 + cz1) / 2, FH - 0.2);
        // палаты: койки, тумбочки, простыни-призраки
        for (let i = 0; i < 4; i++) { const xa = xs[i] + 0.3, xb = xs[i + 1] - 0.3;
          f.bed(xa + 1.2, r.z1 - 1.3, Math.PI, [0x8ab0a8, 0xd8d0c0, 0x7a9aa8][i % 3]); if (xb - xa > 4.5) f.bed(xb - 1.2, r.z1 - 1.3, Math.PI, 0xd8d0c0);
          f.cupboard((xa + xb) / 2, r.z1 - 0.4, Math.PI);
          if ((i + k) % 2 === 0) f.sheetGhost((xa + xb) / 2, cz1 + 1.6, FH - 0.3);
          f.flickerLamp((xa + xb) / 2, (cz1 + r.z1) / 2, FH - 0.2);
          // дверь палаты сама хлопает
          if ((i + k) % 2 === 1) { const d = f.door((xs[i] + xs[i + 1]) / 2 - 0.55, cz1, 'x', 1, 0, 1.1, 2.2); d.haunted = true; }
        }
        if (k === 0) {
          // регистратура с телефоном, рентген, лифт
          f.desk(r.x0 + 3, r.z0 + 1.2, Math.PI, true); f.phoneSpot(r.x0 + 3, r.z0 + 1.2, [0, 1]);
          f.xray(r.x0 + 15.5, r.z0 + 1.0, Math.PI);
          f.elevator(r.x0 + 9.5, r.z0 + 0.06, 0, 0);
          f.ride('gurney', r.x0 + 6, (cz0 + cz1) / 2, Math.PI / 2); f.ride('gurney', r.x1 - 3, (cz0 + cz1) / 2, -Math.PI / 2);
        } else {
          // кухня персонала, шкафчики, лифт
          f.kitchen(r.x0 + 5.5, r.z0 + 0.4, 3, 0);
          for (let i = 0; i < 4; i++) f.locker(r.x0 + 13 + i * 0.6, r.z0 + 0.3, 0, 0x4a7a6a);
          f.elevator(r.x0 + 9.5, r.z0 + 0.06, 0, 0);
          f.ride('gurney', r.x0 + 15, (cz0 + cz1) / 2, Math.PI / 2); f.ride('chair', r.x1 - 4, r.z0 + 1.6);
        }
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
