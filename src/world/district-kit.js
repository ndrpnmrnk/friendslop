import { THREE, G, col, lam, flat } from '../core/gfx.js';
import { pix, rep, T } from '../core/textures.js';
import { W } from './state.js';
import { addGrabTarget, addHazard } from '../game/grab-targets.js';

/* v0.60 — общий «язык» районов нового формата (44×44):
   - опасное — красно-чёрные полосы на земле (hazardFloor) и мигающая лампа-предупреждение (warnLamp);
   - куда залезть — единая светлая окантовка края (climbTrim);
   - цель для захвата — сиреневое кольцо на земле (grabTarget);
   - опасная зона для ботов (hazard). Все координаты — локальные, как у остальных методов конструктора. */
const stripes = () => pix('kit60-hazard', 32, 32, g => { g.fillStyle = '#1a1018'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#e2454f'; for (let i = -32; i < 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 40, 32); g.lineTo(i + 32, 32); g.fill(); } });
const ringTex = () => pix('kit60-ring', 64, 64, g => { g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(200,170,255,.9)'; g.lineWidth = 3; g.setLineDash([7, 5]); g.beginPath(); g.arc(32, 32, 28, 0, 7); g.stroke(); });
let _hz, _ring, _trim;
export const KitMethods = {
  hazardFloor(x, z, w, d, y = 0) {
    _hz ??= (() => { const t = stripes(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    const t = _hz.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, w / 1.2), Math.max(1, d / 1.2));
    const m = this.m(G.plane, lam({ map: t, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, 'kit60-hz' + w + 'x' + d), x, y + .02, z, w, d, 1); m.rotation.x = -Math.PI / 2; return m;
  },
  // лампа-предупреждение: set(k) — 0 погашена, 1 горит (мигание задаёт район)
  warnLamp(x, y, z, color = 0xff3a3a, s = .22) {
    const mat = lam({ color: 0x3a1418, emissive: color, emissiveIntensity: 0 }, null), m = this.m(G.box, mat, x, y, z, s, s * .7, s); m.userData.noBatch = true;
    this.m(G.box, col(0x2b2533), x, y - s * .45, z, s * 1.2, s * .2, s * 1.2);
    return { m, set(k) { mat.emissiveIntensity = k * 2.2; mat.color.setHex(k > .5 ? color : 0x3a1418); } };
  },
  // окантовка по периметру верхнего края (только рамка, верх остаётся своим)
  climbTrim(x, z, w, d, y, sides = 'nsew') { _trim ??= col(0xe8d8b0); const t = .09, h = .06;
    if (sides.includes('n')) this.m(G.box, _trim, x, y + h / 2, z - d / 2 - .01, w + .04, h, t); if (sides.includes('s')) this.m(G.box, _trim, x, y + h / 2, z + d / 2 + .01, w + .04, h, t);
    if (sides.includes('w')) this.m(G.box, _trim, x - w / 2 - .01, y + h / 2, z, t, h, d + .04); if (sides.includes('e')) this.m(G.box, _trim, x + w / 2 + .01, y + h / 2, z, t, h, d + .04); },
  grabTarget(o) {
    const t = { ...o, x: this.X(o.x), z: this.Z(o.z), y: this.Y + (o.y || 0) };
    if (o.at) t.at = { x: this.X(o.at.x), y: this.Y + o.at.y, z: this.Z(o.at.z) };
    if (o.ring !== false) { _ring ??= ringTex(); const m = this.m(G.plane, lam({ map: _ring, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }, 'kit60-ring'), o.x, (o.y || 0) + .03, o.z, (o.r || 1.2) * 2, (o.r || 1.2) * 2, 1); m.rotation.x = -Math.PI / 2; }
    return addGrabTarget(t);
  },
  // дорожка-полоса по точкам (ломаная): каждый отрезок чуть выше предыдущего — стыки не мерцают
  path(pts, w, tex, y = .012) { let k = 0;
    for (let i = 0; i < pts.length - 1; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) + w * .5;
      const m = this.m(G.plane, flat(rep(tex, w / 2, L / 2)), (x0 + x1) / 2, y + (k++) * .004, (z0 + z1) / 2, w, L, 1); m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, Math.atan2(dx, dz), 0); }
  },
  // ровная дымка на весь участок: край плавно тает (без «обрезанного» прямоугольника), слои медленно плывут
  softMist(x0, z0, x1, z1, op = .5, y = 0) {
    const fade = pix('kit60-mistfade', 64, 64, g => { const gr = g.createRadialGradient(32, 32, 6, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.62, '#ddd'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const w = x1 - x0, d = z1 - z0;
    for (const [hy, o, k, sp] of [[.3, op, 1, .012], [.85, op * .6, 1.7, -.008]]) { const t = rep(T.mist(), w / (8 * k), d / (8 * k));
      const m = this.m(G.plane, new THREE.MeshBasicMaterial({ map: t, alphaMap: fade, color: 0xb8a8e0, transparent: true, opacity: o, depthWrite: false, fog: true }), (x0 + x1) / 2, y + hy, (z0 + z1) / 2, w * 1.15, d * 1.15, 1);
      m.rotation.x = -Math.PI / 2; m.renderOrder = 3; W.keep.push(m); W.animated.push(dt => { t.offset.x += dt * sp; t.offset.y += dt * sp * .6; }); }
  },
  hazard(o) { const h = { ...o }; if (o.r !== undefined) { h.x = this.X(o.x); h.z = this.Z(o.z); } else { h.x0 = this.X(o.x0); h.x1 = this.X(o.x1); h.z0 = this.Z(o.z0); h.z1 = this.Z(o.z1); } if (o.exit) h.exit = [this.X(o.exit[0]), this.Z(o.exit[1])]; if (o.y0 !== undefined) h.y0 = this.Y + o.y0; if (o.y1 !== undefined) h.y1 = this.Y + o.y1; return addHazard(h); },
};
