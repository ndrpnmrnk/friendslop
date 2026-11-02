// Только раскладка 2D-значков. Не меняет точки заданий, маршруты или сетевое состояние.
export const missionLevel = (y, playerY) => y - playerY > 2.2 ? 1 : y - playerY < -2.2 ? -1 : 0;

export function layoutMissionMarkers(entries, player, yaw, size, focusId) {
  const r = size / 2, lim = Math.max(1, r - 19), scale = 2.2;
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  const markers = entries.map(e => {
    const dx = e.x - player.x, dz = e.z - player.z;
    const x = (dx * cs - dz * sn) * scale, y = (dx * sn + dz * cs) * scale;
    const max = Math.max(Math.abs(x), Math.abs(y)), edge = max > lim, k = edge ? lim / max : 1;
    return { ...e, x: r + x * k, y: r + y * k, edge, angle: Math.atan2(y, x),
      distance: Math.hypot(dx, dz), level: missionLevel(e.y, player.y) };
  });
  markers.sort((a, b) => a.distance - b.distance || String(a.id).localeCompare(String(b.id)));
  const focus = markers.find(m => m.id === focusId) || markers[0];
  if (focus) { markers.splice(markers.indexOf(focus), 1); markers.unshift(focus); }
  const placed = [], fits = (x, y) => x >= r - lim && x <= r + lim && y >= r - lim && y <= r + lim &&
    Math.max(Math.abs(x - r), Math.abs(y - r)) >= 22 &&
    !placed.some(p => Math.abs(x - p.x) < 29 && Math.abs(y - p.y) < 29);
  for (const m of markers) {
    m.focus = m === focus;
    m.opacity = m.focus ? 1 : .58 + .34 * Math.max(0, 1 - m.distance / 85);
    m.anchorX = m.x; m.anchorY = m.y;
    let candidates = [[m.x, m.y]];
    if (m.edge) {
      // Плотная группа занимает соседнюю полосу у той же стороны карты,
      // а не переезжает на противоположный край с ложным направлением.
      const sideX = Math.abs(m.x - r) >= Math.abs(m.y - r), sign = Math.sign(sideX ? m.x - r : m.y - r);
      for (const inset of [0, 30, 60]) for (const shift of [0, 30, -30, 60, -60, 90, -90, 120, -120])
        candidates.push(sideX ? [m.x - sign * inset, m.y + shift] : [m.x + shift, m.y - sign * inset]);
    } else {
      for (let ring = 1; ring <= 2; ring++) for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) candidates.push([m.x + dx * 30, m.y + dy * 30]);
    }
    const point = candidates.find(([x, y]) => fits(x, y));
    if (point) [m.x, m.y] = point;
    m.x = Math.round(m.x); m.y = Math.round(m.y); placed.push(m);
  }
  // Главная цель рисуется последней, поверх остальных значков.
  return placed.reverse();
}
