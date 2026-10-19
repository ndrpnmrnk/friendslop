import { THREE, V3, G, mesh } from '../core/gfx.js';
import { W } from '../world/state.js';
import { addItem, launch } from './items.js';
import { LIGHTMAT, LIGHTDIM, WATERMAT } from '../world/builder.js';
import { UG } from '../world/underground.js';
import { splash } from '../world/particles.js';

/* События раунда: примерно раз в минуту на 20 секунд город меняется.
   🎃 Тыквенный дождь — с неба падают тыквы (их можно ловить и кидать),
   🔦 Отключили свет — фонари гаснут, у персонажа фонарик,
   🌊 Потоп в тоннелях — под дорогами вода по колено, там идёшь медленно. */
export const EV = { t: 0, next: 50, cur: null, left: 0 };
const DUR = 20;
let ctx = null;
export function initEvents(c) { ctx = c; }
export function resetEvents() { if (EV.cur) stopEvent(); EV.t = 0; EV.next = 45 + Math.random() * 15; EV.cur = null; }

const EVENTS = {
  pumpkins: { title: 'ТЫКВЕННЫЙ ДОЖДЬ', sub: 'С неба падают тыквы!', icon: '🎃',
    start(s) { s.spawnT = 0; s.items = []; },
    update(s, dt) {
      s.spawnT -= dt; if (s.spawnT > 0 || s.items.length > 14) return; s.spawnT = 0.9 + Math.random() * 0.6;
      const P = ctx.player(), a = Math.random() * 6.28, r = 3 + Math.random() * 11, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
      const it = addItem('pumpkin', x, P.pos.y + 16, z, 0); it.def = { ...it.def, respawn: 0 }; launch(it, new V3(x, P.pos.y + 16, z), new V3((Math.random() - 0.5) * 2, -4, (Math.random() - 0.5) * 2));
      s.items.push(it);
    },
    stop(s) { for (const it of s.items) if (it.state === 'rest') { it.state = 'gone'; it.g.visible = false; } },
  },
  dark: { title: 'ОТКЛЮЧИЛИ СВЕТ', sub: 'Фонари погасли. У тебя фонарик', icon: '🔦',
    start(s) { const L = ctx.lights(); s.h = L.hemi.intensity; s.sun = L.sun.intensity; s.fog = L.scene.fog.color.getHex(); L.flash.intensity = 0; LIGHTMAT().visible = false; LIGHTDIM().visible = false; s.k = 0; },
    update(s, dt) { const L = ctx.lights(); s.k = Math.min(1, s.k + dt * 1.5); L.hemi.intensity = s.h * (1 - 0.6 * s.k); L.sun.intensity = s.sun * (1 - 0.75 * s.k); L.flash.intensity = 60 * s.k; L.sky.setDim(s.k);
      L.scene.fog.color.setHex(0x120c1c); L.scene.background.setHex(0x120c1c); },
    stop(s) { const L = ctx.lights(); L.hemi.intensity = s.h; L.sun.intensity = s.sun; L.flash.intensity = 0; L.scene.fog.color.setHex(s.fog); L.scene.background.setHex(s.fog); LIGHTMAT().visible = true; LIGHTDIM().visible = true; L.sky.setDim(0); },
  },
  flood: { title: 'ПОТОП В ТОННЕЛЯХ', sub: 'Под дорогами вода по колено', icon: '🌊',
    start(s) {
      s.meshes = []; s.zones = []; s.h = 0;
      for (const [x0, z0, x1, z1] of W.floodRects) { const m = mesh(G.box, WATERMAT(), (x0 + x1) / 2, UG.floor, (z0 + z1) / 2, x1 - x0, 0.04, z1 - z0, W.group); s.meshes.push(m);
        const zn = { type: 'water', r: [x0, z0, x1, z1], y: UG.floor }; W.zones.push(zn); s.zones.push(zn); }
      const P = ctx.player(); if (P.pos.y < UG.floor + 1) splash(P.pos.x, P.pos.y, P.pos.z, 1);
    },
    update(s, dt) { s.h = Math.min(0.45, s.h + dt * 0.15); for (const m of s.meshes) m.position.y = UG.floor + s.h; },
    stop(s) { for (const m of s.meshes) W.group.remove(m); W.zones = W.zones.filter(z => !s.zones.includes(z)); },
  },
};

export function updateEvents(dt, ui) {
  EV.t += dt;
  if (!EV.cur && EV.t >= EV.next) {
    const keys = Object.keys(EVENTS).filter(k => k !== EV.last), key = keys[(Math.random() * keys.length) | 0];
    EV.cur = { key, def: EVENTS[key], s: {} }; EV.left = DUR; EV.last = key; EV.cur.def.start(EV.cur.s);
    ui.start(key);
  }
  if (EV.cur) {
    EV.cur.def.update(EV.cur.s, dt); EV.left -= dt;
    ui.tick(EV.cur.key, Math.ceil(EV.left));
    if (EV.left <= 0) { stopEvent(); EV.next = EV.t + 40 + Math.random() * 20; ui.end(); }
  }
}
export function stopEvent() { if (!EV.cur) return; EV.cur.def.stop(EV.cur.s); EV.cur = null; }
void THREE;
