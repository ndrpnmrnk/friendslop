import { THREE } from '../core/gfx.js';

/* Подсветка контура интерактивных объектов (метод «вывернутой оболочки»):
   копия мешей чуть больше, рисуются только задние грани светлым цветом.
   Без надписей — игрок сразу видит, с чем можно взаимодействовать. */
const MAT = new THREE.MeshBasicMaterial({ color: 0xfff1b0, side: THREE.BackSide, transparent: true, opacity: 0.9, depthWrite: false, fog: false });

export function addOutline(target, thick = 0.05) {
  const list = [];
  if (target.isMesh) list.push(target); else target.traverse(m => { if (m.isMesh && !m.userData.noOutline) list.push(m); });
  const shells = [];
  for (const m of list) {
    const c = new THREE.Mesh(m.geometry, MAT);
    c.position.copy(m.position); c.rotation.copy(m.rotation); c.scale.copy(m.scale);
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    const r = m.geometry.boundingSphere.radius * Math.max(m.scale.x, m.scale.y, m.scale.z) || 1;
    c.scale.multiplyScalar(1 + thick / r);
    c.visible = false; c.raycast = () => {};
    m.parent.add(c); shells.push(c);
  }
  let on = false;
  return { set(v) { if (v === on) return; on = v; for (const c of shells) c.visible = v; } };
}
let pulse = 0;
export function pulseOutline(dt) { pulse += dt; MAT.opacity = 0.6 + Math.sin(pulse * 6) * 0.3; }
