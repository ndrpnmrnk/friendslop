import { random } from '../core/random.js';
import { V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { isFree, groundAt } from '../world/physics.js';

export function buildingAt(p) {
  return (W.buildings || []).find(g => p.x > g.box[0] && p.x < g.box[2] && p.z > g.box[1] && p.z < g.box[3] && p.y >= g.y0 - 0.3 && p.y < g.y0 + g.fh * g.floors - 0.3);
}
export const floorAt = (g, y) => Math.max(0, Math.min(g.floors - 1, Math.floor((y - g.y0 + 0.3) / g.fh)));
export function locationLabel(p) { const g = buildingAt(p); return g ? `${g.name} · ${floorAt(g, p.y) + 1} этаж` : ''; }
export function routeTo(p, target) {
  const g = buildingAt(target); if (!g) return { ...target };
  const floor = floorAt(g, target.y), here = floorAt(g, p.y), label = `${g.name} · ${floor + 1} этаж`;
  let q = target;
  const inside = p.x > g.box[0] && p.x < g.box[2] && p.z > g.box[1] && p.z < g.box[3] && p.y >= g.y0 - 0.3;
  if (!inside && g.door) { const d = g.door, near = Math.hypot(p.x - d[0], p.z - d[1]) < 1.4; q = { x: d[near ? 2 : 0], y: g.y0, z: d[near ? 3 : 1] }; }
  else if (floor !== here && g.stair) { const s = g.stair, up = floor > here; q = { x: s[up ? 2 : 0], y: g.y0 + here * g.fh, z: s[up ? 3 : 1] }; }
  return { ...target, ...q, label, floorDelta: floor - here };
}

// Поиск по связной области пола. Не переходим через стены, этажи и закрытые двери.
// Вызывается только при создании предмета, не в игровом цикле.
export function nearbyItemPoint(p) {
  const g = buildingAt(p), y = g ? g.y0 + floorAt(g, p.y) * g.fh : groundAt(p.x, p.z, 0.15, p.y + 0.2);
  const step = 0.65, max = g ? 14 : 10, seen = new Set(), queue = [], choices = [];
  const valid = (x, z) => Math.hypot(x - p.x, z - p.z) <= max && (!g || (x > g.box[0] + 0.4 && x < g.box[2] - 0.4 && z > g.box[1] + 0.4 && z < g.box[3] - 0.4)) && Math.abs(groundAt(x, z, 0.2, y + 0.25) - y) < 0.25 && isFree(x - 0.3, z - 0.3, x + 0.3, z + 0.3, y + 0.08, y + 1.8);
  // Миссия может стоять на столе/в урне: начинаем с ближайшего свободного места у неё.
  for (let r = 0; r <= 2.6 && !queue.length; r += step) for (let a = 0; a < 16; a++) { const x = p.x + Math.cos(a * Math.PI / 8) * r, z = p.z + Math.sin(a * Math.PI / 8) * r; if (valid(x, z)) { queue.push([x, z, 0, 0]); break; } }
  for (let i = 0; i < queue.length && i < 2400; i++) {
    const [x, z, ix, iz] = queue[i], d = Math.hypot(x - p.x, z - p.z);
    if (d >= (g ? 2 : 6)) choices.push(new V3(x, y, z));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const key = `${ix + dx},${iz + dz}`; if (seen.has(key)) continue; seen.add(key); const nx = x + dx * step, nz = z + dz * step; if (valid(nx, nz) && valid((x + nx) / 2, (z + nz) / 2)) queue.push([nx, nz, ix + dx, iz + dz]); }
  }
  if (choices.length) return choices[(random() * choices.length) | 0];
  if (queue.length) { const q = queue[queue.length - 1]; return new V3(q[0], y, q[1]); }
  // Точка взаимодействия уже проверена генератором миссии; не бросаем предмет за стену.
  return new V3(p.x, y, p.z);
}
