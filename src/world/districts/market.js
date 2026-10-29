import { random } from '../../core/random.js';
import { restOnSurface, addItem } from '../../game/items.js';
import { addCanopy } from '../canopies.js';
import { addPushable } from '../pushables.js';
import { TIRE_GEO } from '../props.js';
import { THREE, G, tmat, col, glow, compose } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { actors, knockDown } from '../../game/actors.js';
import { impulsePushables } from '../physics.js';
import { sfx } from '../../core/sfx.js';
import { burst } from '../particles.js';

/* Рынок (v0.60, 44×44 по схеме): ряды прилавков под навесами по обе стороны центрального проезда, склад с воротами
   (юго-восток). Фишка — ГРУЗОВИЧОК С ТЫКВАМИ: стоит в кармане на юге; раз в минуту гудит, включает фары — и через 2 с
   несётся по центральному проезду на север, за край района. Кто на дороге — улетает; из кузова падают тыквы.
   Потом медленно возвращается с юга обратно в карман. Кузов — цель для захвата: закинул соперника — увезёт за край. */
const LX = 22, BAY = 39.5;
export default {
  id: 'market', name: 'Рынок', ground: 'pave', size: 44,
  build(b) {
    const stall = (x, z, kind, aw) => {
      b.counter(x, z, 4.4, 1.2, 1, tmat(T.crate())); b.counter(x, z - .15, 4, .7, .12, tmat(T.produce(kind)), 1);
      for (const [a, c] of [[-2.1, -.7], [2.1, -.7], [-2.1, .7], [2.1, .7]]) { b.m(G.box, col(0x2b2533), x + a, 1.65, z + c - .5, .08, 3.3, .08); b.solid(x + a, z + c - .5, .16, .16, 0, 3.3); }
      addCanopy(b, x, z - .4, { w: 4.8, d: 2.4, edge: 3.25, rise: .48, round: false, colors: aw });
      b.crate(x - .9, z - 1.6, .7); b.crate(x + .9, z - 1.6, .7);
      if (kind === 'tomato') for (const dx of [-1.4, -.4, .7]) b.item('tomato', x + dx, z + .35, 1);
      if (kind === 'pumpkin') for (const dx of [-1.1, 1]) b.item('pumpkin', x + dx, z + .25, 1);
      if (kind === 'apple') b.item('cucumber', x - 1, z + .3, 1);
      if (kind === 'carrot') b.item('banana', x + .8, z + .3, 1);
    };
    const kinds = ['tomato', 'pumpkin', 'apple', 'carrot'], aws = [['#d8243a', '#f1e8ff'], ['#ff8a1f', '#2a1f3d'], ['#6aa84f', '#f1e8ff'], ['#4ab0f0', '#f1e8ff']];
    let k = 0; for (const z of [8, 20, 32]) for (const x of [6, 12.5]) { stall(x, z, kinds[k % 4], aws[k % 4]); k++; }
    for (const z of [8, 20]) for (const x of [31.5, 38]) { stall(x, z, kinds[k % 4], aws[k % 4]); k++; }
    restOnSurface(b.item('bao', 6, 19.85, 1.125)); restOnSurface(b.item('taco', 31.5, 19.85, 1.125));
    b.hw(() => { b.stringLights(2, 3, 17, 3, 3.2); b.stringLights(27, 3, 42, 3, 3.2); b.stringLights(2, 26.5, 17, 26.5, 3.2); });

    /* ---------- центральный проезд и фишка: грузовичок ---------- */
    b.ground(LX - 3, 0, LX + 3, 44, T.asphalt(), 3, .014);
    for (let z = 2; z < 44; z += 4) b.marking(LX, z, .25, 1.8, 0xf5c542);
    b.hazardFloor(LX, .9, 6, .7); b.hazardFloor(LX, 43.1, 6, .7);
    // кузов-модель (кабина к северу), фары, тыквы в кузове
    const truck = new THREE.Group(); W.group.add(truck); W.keep.push(truck);
    const body = col(0x8a3a2a), dk = col(0x17111f), glass = tmat(T.carGlass(0x8a3a2a));
    truck.add(compose('market60-truck', add => {
      add(G.box, body, 0, .95, -1.6, 2.1, .9, 1.9); add(G.box, glass, 0, 1.65, -1.45, 1.9, .6, 1.3); add(G.box, body, 0, 2.0, -1.45, 1.95, .06, 1.35);
      add(G.box, body, 0, .7, 1.0, 2.2, .25, 3.2); for (const sx of [-1, 1]) add(G.box, body, sx * 1.06, 1.12, 1.0, .08, .6, 3.2); add(G.box, body, 0, 1.12, 2.58, 2.2, .6, .08);
      add(G.box, col(0x2b2833), 0, .55, -2.6, 2.1, .25, .12); for (const sx of [-.7, .7]) add(G.box, glow(0xfff1c0), sx, .9, -2.56, .32, .16, .04);
      for (const [a, z] of [[1.0, -1.6], [-1.0, -1.6], [1.0, 1.4], [-1.0, 1.4]]) add(TIRE_GEO, tmat(T.tread()), a, .42, z, .42, .3, .42, 0, 0, Math.PI / 2);
      for (const [x, z] of [[-.5, .4], [.45, .6], [0, 1.6], [-.5, 2.0], [.5, 1.9]]) add(G.sph10, col(0xff8a1f), x, 1.05, z, .38, .32, .38); }));
    const beams = new THREE.Mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: .0, depthWrite: false })); beams.scale.set(2.2, .05, 8); beams.position.set(0, .6, -6.6); truck.add(beams);
    const solids = [b.solid(LX, BAY - 1.6, 2.1, 1.9, 0, 1.4), b.solid(LX, BAY + 1.0, 2.2, 3.2, 0, .82)];
    const T0 = { state: 'parked', t: 0, z: BAY, next: 28 + random() * 10, rider: null, dropped: 0 };
    const set = z => { truck.position.set(b.X(LX), b.Y, b.Z(z)); truck.updateMatrix(); for (const s of solids) s.on = T0.state === 'parked'; };
    set(BAY);
    W.animated.push(dt => { T0.t += dt;
      if (T0.state === 'parked' && T0.t > T0.next) { T0.state = 'honk'; T0.t = 0; sfx('horn', { at: truck.position, range: 60 }); set(T0.z); }
      else if (T0.state === 'honk') { beams.material.opacity = Math.sin(T0.t * 12) > 0 ? .25 : .08; if (T0.t > 2) { T0.state = 'go'; T0.t = 0; sfx('honk', { at: truck.position }); T0.dropped = 0; } }
      else if (T0.state === 'go' || T0.state === 'back') { const north = T0.state === 'go', v = north ? 12 : 4.5; T0.z += (north ? -v : -v) * dt;
        if (north && T0.z < -8) { T0.state = 'back'; T0.t = 0; T0.z = 52; if (T0.rider) { const a = T0.rider; a.pos.set(b.X(LX + 3.6), b.Y, b.Z(-1.6)); a.vel.set(2, 6, -3); a.stun = .4; a.root.visible = true; T0.rider = null; } }
        if (!north && T0.z <= BAY) { T0.z = BAY; T0.state = 'parked'; T0.t = 0; T0.next = 50 + random() * 20; beams.material.opacity = 0; }
        set(T0.z); const wz = truck.position.z, fz = north ? -1 : -1;
        // удар: кто на проезде перед кабиной — летит в сторону
        for (const a of actors()) { if (a === T0.rider || a.hidden || a.drone) continue; if (Math.abs(a.pos.x - truck.position.x) < 1.5 && a.pos.z > wz - 2.9 && a.pos.z < wz + 2.8 && a.pos.y < b.Y + 1.6) {
          const s = a.pos.x < truck.position.x ? -1 : 1; knockDown(a, s * 9, fz * v * .6, 1.4); a.vel.y = 6; a.pos.x = truck.position.x + s * 1.6; sfx('hit', { at: a.pos }); burst(a.pos.x, a.pos.y + 1, a.pos.z, 10, { color: 0xff8a1f, size: .14, speed: 3 }); } }
        impulsePushables(truck.position.x, wz - 2, 1.6, 8);
        if (north && T0.dropped < 2 && T0.z < 30 - T0.dropped * 14 && W.items.filter(i => i.type === 'pumpkin' && i.state !== 'gone').length < 14) { T0.dropped++; const it = addItem('pumpkin', truck.position.x + (random() - .5), b.Y + 1.2, wz + 2.8); it.state = 'fly'; it.vel.set((random() - .5) * 3, 2, 2.5); sfx('drop', { at: truck.position }); }
        if (T0.rider) { T0.rider.pos.set(truck.position.x, b.Y + .85, wz + 1.2); T0.rider.vel.set(0, 0, 0); } }
      beams.visible = T0.state !== 'parked'; });
    b.hazard({ x0: LX - 3, z0: 0, x1: LX + 3, z1: 44, active: () => T0.state === 'honk' || T0.state === 'go' || T0.state === 'back' });
    b.grabTarget({ x: LX + 1.9, z: BAY + 1, r: 1.1, kind: 'custom', label: 'кузов', onUse: v => { if (T0.state !== 'parked' || T0.rider) return; T0.rider = v; v.stun = 99; T0.next = Math.min(T0.next, T0.t + 1.5); } });
    W.animated.push(() => { if (T0.rider && T0.state === 'parked' && T0.rider.stun < 50) T0.rider.stun = 99; });

    /* ---------- склад с воротами (ЮВ) ---------- */
    b.house({ x: 30, z: 30, w: 12, d: 12, h: 4.4, wall: 0x6a5a4a, brick: true, lit: .5, roof: true, floor: T.concrete(), door: { side: 'w', at: .5, sign: ['СКЛАД', '#3a2a1a', '#f5c542'] }, doorW: 3.2,
      interior(f, r) { for (const z of [r.z0 + 1, r.z0 + 3.4]) for (const x of [r.x1 - 1, r.x1 - 2.2]) f.crate(x, z, 1); f.shelf(r.x0 + 4, r.z1 - .3, 6, Math.PI, true); f.forklift(r.x0 + 3.5, (r.z0 + r.z1) / 2, Math.PI / 2);
        for (const [x, z] of [[r.x1 - 1.2, r.z1 - 1.6], [r.x1 - 2, r.z1 - 1.4]]) addPushable(f, 'sack', x, z); f.pallet(r.x0 + 1.2, r.z0 + 1.4); } });
    b.hayBales(27, 41, 3, 0); b.pumpkinPile(15, 41); b.hw(() => b.scarecrow(11.5, 40.5, .4));
    b.pickup(7, 39.5, Math.PI / 2 + .15); for (const [x, z] of [[3, 37.5], [3.8, 38.2], [3.2, 39]]) addPushable(b, 'sack', x, z);
    b.ride('cart', 18, 14); b.ride('cart', 26.5, 27, .6);
    b.bin(17.5, 25); b.bin(26.5, 13); b.trashBags(42.6, 27, 2); b.puddle(15, 14, .9); b.puddle(30, 26, .8);
    b.planter(3, 26, 2.4, 1.2, .45, 'flowers'); b.newsBox(17.6, 1.2, 0);
    b.lamp(17.6, 26, Math.PI / 2); b.lamp(26.4, 33, -Math.PI / 2); b.lamp(17.6, 6, Math.PI / 2); b.lamp(26.4, 18, -Math.PI / 2);
    b.zone('floor', 1, 10, 17, 16); b.zone('floor', 27, 10, 43, 16); b.zone('floor', 1, 22, 17, 28);
    b.cats(1, 22, 17, 28);
    b.spawn(9, 13); b.spawn(35, 13); b.spawn(9, 25.5);
    b.hw(() => { b.pumpkin(3, 30.5); });
  },
};
