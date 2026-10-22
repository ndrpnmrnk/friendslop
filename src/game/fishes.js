import { THREE, G } from '../core/gfx.js';
import { photo } from '../core/textures.js';

/* Рыбы в стиле PS1 (v0.19, по референсам docs/refs/v0.19/fish-*.png): угловатое low-poly тело, «фото» текстура
   низкого разрешения — полосы, блики, глаз; плавники — плоские треугольники. Разные виды и окрасы. */
export const SPECIES = [
  { id: 'perch', name: 'Окунь', w: [0.3, 1.2], base: '#9aa83a', belly: '#e8d890', dark: '#3a4a18', fin: '#e0a040', stripes: true, shape: 'long', chance: 4 },
  { id: 'crucian', name: 'Карась', w: [0.2, 0.9], base: '#c89a3a', belly: '#f0d890', dark: '#6a4a18', fin: '#b0703a', stripes: false, shape: 'round', chance: 4 },
  { id: 'bream', name: 'Лещ', w: [0.6, 2.4], base: '#a8a8b0', belly: '#e8e8f0', dark: '#4a4a5a', fin: '#6a6a7a', stripes: false, shape: 'tall', chance: 3 },
  { id: 'catfish', name: 'Сом', w: [2, 6], base: '#4a4a3a', belly: '#b8b098', dark: '#1e1e18', fin: '#3a3a2a', stripes: false, shape: 'long', chance: 1, rare: true },
  { id: 'sunfish', name: 'Рыба-луна', w: [3, 9], base: '#f0a020', belly: '#ffe0a0', dark: '#c86a10', fin: '#f5c542', stripes: false, shape: 'sun', chance: 1, rare: true },
];
export function pickFish() {
  const tot = SPECIES.reduce((s, f) => s + f.chance, 0); let r = Math.random() * tot;
  const sp = SPECIES.find(f => (r -= f.chance) < 0) || SPECIES[0];
  return { sp, kg: +(sp.w[0] + Math.random() * (sp.w[1] - sp.w[0])).toFixed(1) };
}
const tex = sp => photo('fish' + sp.id, 48, 24, (g, W, H) => {
  // бок рыбы: тёмная спина → цветной бок → светлое брюхо, полосы, чешуйчатый шум, глаз у головы (u≈0.25)
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sp.dark); gr.addColorStop(0.35, sp.base); gr.addColorStop(0.75, sp.belly); gr.addColorStop(1, sp.belly);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (sp.stripes) { g.globalAlpha = 0.55; g.fillStyle = sp.dark; for (let i = 0; i < 6; i++) g.fillRect(W * (0.32 + i * 0.075), H * 0.05, W * 0.03, H * 0.55); g.globalAlpha = 1; }
  g.globalAlpha = 0.18; for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < 0.5 ? '#ffffff' : sp.dark; g.fillRect(Math.random() * W, Math.random() * H, W / 48, H / 24); } g.globalAlpha = 1;
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(W * 0.1, H * 0.28, W * 0.8, H * 0.04);
  for (const u of [0.22, 0.72]) { g.fillStyle = '#f1e8d0'; g.beginPath(); g.arc(W * u, H * 0.42, H * 0.09, 0, 6.29); g.fill(); g.fillStyle = '#17111f'; g.beginPath(); g.arc(W * u, H * 0.42, H * 0.05, 0, 6.29); g.fill(); }
}, 4);
const finTex = sp => photo('fin' + sp.id, 16, 16, (g, W, H) => { g.fillStyle = sp.fin; g.fillRect(0, 0, W, H); g.globalAlpha = 0.35; g.fillStyle = sp.dark; for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H); }, 4);
const TRI = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0.3, 1, 0], 3)).setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.3, 1], 2)); TRI.computeVertexNormals();
export function fishModel(sp) {
  const g = new THREE.Group(), body = new THREE.MeshLambertMaterial({ map: tex(sp) }), fin = new THREE.MeshLambertMaterial({ map: finTex(sp), side: THREE.DoubleSide });
  const S = { long:[.45,.18,.17],round:[.34,.23,.17],tall:[.4,.27,.15],sun:[.3,.34,.17] }[sp.shape];
  const b = new THREE.Mesh(G.sph, body); b.scale.set(...S); b.rotation.y=0; g.add(b); // текстура: голова спереди (+x)
  const tri = (x, y, sx, sy, rz, ry = 0) => { const m = new THREE.Mesh(TRI, fin); m.position.set(x, y, 0); m.scale.set(sx, sy, 1); m.rotation.set(0, ry, rz); g.add(m); return m; };
  if (sp.shape === 'sun') { tri(-0.05, S[1] * 0.8, 0.18, 0.42, 0); tri(-0.05, -S[1] * 0.8, 0.18, -0.42, 0); for (let i = -2; i <= 2; i++) tri(-S[0] * 0.95, i * 0.06, -0.12, 0.08, 0); }
  else { tri(-S[0] * 0.9, 0, -0.26, 0.2, -0.5); tri(-S[0] * 0.9, 0, -0.26, -0.2, 0.5); tri(-0.1, S[1] * 0.85, 0.24, 0.16, 0); if (sp.id === 'catfish') for (const s of [-1, 1]) { const w = new THREE.Mesh(G.box, new THREE.MeshLambertMaterial({ color: 0x17111f })); w.position.set(S[0] * 0.95, -0.03, s * 0.05); w.scale.set(0.22, 0.012, 0.012); w.rotation.y = s * 0.5; g.add(w); } }
  for (const s of [-1, 1]) tri(S[0] * 0.25, -S[1] * 0.4, 0.12, -0.08, 0, s * 0.4);
  const fins=g.children.filter(m=>m.geometry===TRI);g.userData.animate=t=>{for(let i=0;i<fins.length;i++)fins[i].rotation.y=Math.sin(t*9+i)*.15;};
  return g;
}
