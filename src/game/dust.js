import { random } from '../core/random.js';
import {graphics} from '../core/quality.js';
import { THREE } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { CONFIG } from '../config.js';
import { buildingAt } from '../missions/location.js';

// Светящиеся пылинки у фонарей убраны.
const mist=[];
export function initDust(scene) {
  const mm = new THREE.MeshBasicMaterial({ map: T.fog(), transparent: true, opacity: 0.16, depthWrite: false, color: 0xc8b8e8 });
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), mm); m.rotation.x = -Math.PI / 2; m.renderOrder = 3; scene.add(m); mist.push({ m, ox: (random() - 0.5) * 30, oz: (random() - 0.5) * 30, ph: random() * 6 }); }
}
export function updateDust(t,P){
  if(!P)return;
  // дымка над землёй: пятна дрейфуют вокруг игрока (на улице, не в подземке)
  const base = CONFIG.base, inside = !!buildingAt(P.pos);
  for (const [i,q] of mist.entries()) { const show = i<graphics.current.mist&& P.pos.y > base - 1 && P.pos.y < base + 6 && !inside; q.m.visible = show; if (!show) continue;
    q.m.position.set(Math.round(P.pos.x / 30) * 30 + q.ox + Math.sin(t * 0.07 + q.ph) * 3, base + 0.25 + Math.sin(t * 0.3 + q.ph) * 0.05, Math.round(P.pos.z / 30) * 30 + q.oz + Math.cos(t * 0.05 + q.ph) * 3); }
}
