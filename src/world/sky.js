import { THREE } from '../core/gfx.js';
import { pix, T } from '../core/textures.js';
import { SEASON, HW } from '../config.js';
import { W } from './state.js';

/* Небо: купол с градиентом (тёплый горизонт → сливовый зенит), луна с ореолом, мерцающие звёзды,
   медленные облака и силуэт далёкого города по кругу. Всё без тумана, ездит вместе с камерой.
   Плюс оттенок района: свет и туман плавно подкрашиваются там, где стоит игрок. */
const R = Math.random;
function canvasTex(key, w, h, draw) { return pix(key, w, h, draw); }

export function createSky(scene) {
  const g = new THREE.Group(); g.renderOrder = -10; scene.add(g);
  const mat = o => new THREE.MeshBasicMaterial({ fog: false, depthWrite: false, ...o });
  // купол
  const dome = new THREE.SphereGeometry(190, 24, 12), col = [], c = new THREE.Color();
  const top = new THREE.Color(HW ? 0x150f26 : 0x5a9ad8), mid = new THREE.Color(SEASON.bg), low = new THREE.Color(HW ? 0x6a3a4a : 0xd8e8f0);
  for (let i = 0; i < dome.attributes.position.count; i++) {
    const y = dome.attributes.position.getY(i) / 190;
    if (y < 0.08) c.copy(mid).lerp(low, Math.max(0, 1 - Math.abs(y - 0.02) / 0.1) * 0.75); else c.copy(mid).lerp(top, Math.min(1, (y - 0.08) / 0.6));
    col.push(c.r, c.g, c.b);
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const domeM = mat({ vertexColors: true, side: THREE.BackSide }), domeMesh = new THREE.Mesh(dome, domeM); domeMesh.renderOrder = -10; g.add(domeMesh);
  // звёзды: два набора мерцают в противофазе
  const stars = [0, 1].map(k => {
    const pos = [];
    for (let i = 0; i < 260; i++) { const a = R() * 6.28, e = 0.12 + Math.pow(R(), 0.7) * 1.3, r = 180; pos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: k ? 0xd8d0ff : 0xfff4e0, size: k ? 1.5 : 2.2, sizeAttenuation: false, fog: false, transparent: true, depthWrite: false })); p.renderOrder = -9; g.add(p); return p;
  });
  // луна + ореол
  const moonT = canvasTex('moon', 32, 32, (x, w, h) => { x.fillStyle = '#f4eedc'; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, 7); x.fill(); x.fillStyle = 'rgba(160,150,170,.55)';
    for (const [a, b, r] of [[11, 12, 4], [20, 18, 3], [14, 22, 2], [22, 10, 2]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); } });
  const haloT = canvasTex('halo', 64, 64, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,230,200,.55)'); gr.addColorStop(0.35, 'rgba(220,180,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const md = new THREE.Vector3(-0.45, 0.42, -0.79).normalize().multiplyScalar(170);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonT, fog: false, depthWrite: false })); moon.scale.setScalar(14); moon.position.copy(md); moon.renderOrder = -8; g.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloT, fog: false, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(60); halo.position.copy(md).multiplyScalar(1.01); halo.renderOrder = -9; g.add(halo);
  // облака
  const cloudT = canvasTex('cloud', 64, 24, (x, w, h) => { for (let i = 0; i < 22; i++) { const cx = 8 + R() * (w - 16), cy = h * 0.55 + (R() - 0.5) * h * 0.3, r = 4 + R() * 7; const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, HW ? 'rgba(90,70,120,.7)' : 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); } });
  const clouds = new THREE.Group(); g.add(clouds);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + R(), r = 150, m = new THREE.Mesh(new THREE.PlaneGeometry(70, 24), mat({ map: cloudT, transparent: true, side: THREE.DoubleSide }));
    m.position.set(Math.cos(a) * r, 34 + R() * 30, Math.sin(a) * r); m.lookAt(0, m.position.y, 0); m.renderOrder = -9; clouds.add(m); }
  // силуэт города вдали
  const skyT = canvasTex('skyline', 256, 48, (x, w, h) => { x.clearRect(0, 0, w, h); let px = 0;
    while (px < w) { const bw = 6 + (R() * 16) | 0, bh = 10 + (R() * 34) | 0; x.fillStyle = R() < 0.5 ? '#1d1630' : '#241b3a'; x.fillRect(px, h - bh, bw, bh);
      if (R() < 0.15) x.fillRect(px + bw / 2 - 1, h - bh - 6, 1, 6);
      for (let yy = h - bh + 3; yy < h - 2; yy += 3) for (let xx = px + 1; xx < px + bw - 1; xx += 2) if (R() < 0.18) { x.fillStyle = R() < 0.8 ? '#ffb35c' : '#9be0ff'; x.fillRect(xx, yy, 1, 1); }
      px += bw; } });
  skyT.wrapS = THREE.RepeatWrapping; skyT.repeat.set(5, 1);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(175, 175, 34, 48, 1, true), mat({ map: skyT, transparent: true, alphaTest: 0.5, side: THREE.BackSide }));
  ring.position.y = 10; ring.renderOrder = -7; g.add(ring);

  // ---- оттенок района ----
  const TINT = { cemetery: 0x9ad8a8, industrial: 0xffc890, sewer: 0x90d8d0, hospital: 0x9ad8c0, port: 0xa8c8ff };
  const baseHemi = new THREE.Color(SEASON.hemi[0]), baseFog = new THREE.Color(SEASON.fog[0]), curT = new THREE.Color(1, 1, 1), tmp = new THREE.Color();
  let dim = 0, night = 0; const nightFog = new THREE.Color(0x120c1e), md0 = md.clone();
  return {
    setDim(k) { dim = k; },
    setNight(k) { night = k; const m2 = md0.clone(); m2.y += k * 55; m2.normalize().multiplyScalar(170); moon.position.copy(m2); halo.position.copy(m2).multiplyScalar(1.01); },
    update(camera, t, dt, player, hemi, fog) {
      g.position.set(camera.position.x, 0, camera.position.z);
      stars[0].material.opacity = (0.7 + Math.sin(t * 1.7) * 0.3) * (1 - dim * 0.3); stars[1].material.opacity = (0.7 - Math.sin(t * 1.7) * 0.3) * (1 - dim * 0.3);
      clouds.rotation.y += dt * 0.004;
      domeM.color.setScalar((1 - dim * 0.55) * (1 - night * 0.45)); ring.material.color.setScalar((1 - dim * 0.7) * (1 - night * 0.3));
      // туман ползёт, мигающие фонари и вывески
      const mt = T.mist(); mt.offset.x += dt * 0.012; mt.offset.y += dt * 0.006;
      for (const f of W.flick) {
        f.t -= dt; if (f.t <= 0) { f.on = !f.on; f.t = f.period ? f.period : f.on ? (Math.random() < 0.3 ? 0.08 : 1 + Math.random() * 5) : 0.04 + Math.random() * 0.18; }
        const k = f.on ? 1 : (f.sign ? 0.3 : f.period ? 0.15 : 0.08);
        for (const m of f.mats) { if (m.emissive) m.emissiveIntensity = 0.9 * k; else m.color.setScalar(k); }
        if (f.pool) f.pool.visible = f.on && !f.pool.userData.broken && dim < 0.3;
      }
      if (!player || !hemi) return;
      let id = null; for (const d of W.districts) if (player.pos.x >= d.ox && player.pos.x < d.ox + 32 && player.pos.z >= d.oz && player.pos.z < d.oz + 32) { id = d.id; break; }
      tmp.setHex(TINT[id] || 0xffffff); curT.lerp(tmp, Math.min(1, dt * 1.2));
      hemi.color.copy(baseHemi).multiply(curT);
      if (!dim && fog) { fog.color.copy(baseFog).lerp(tmp.copy(baseFog).multiply(curT), 0.5).lerp(nightFog, night * 0.55); }
    },
  };
}
