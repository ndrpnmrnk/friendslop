// Общее состояние мира текущего раунда. Очищается при генерации новой карты.
export const W = {
  group: null,
  solids: [], zones: [], doors: [], ladders: [], pushables: [], items: [],
  occluders: [], birds: [], cats: [], catHomes: [], missionZones: [], spawns: [],
  debris: [], decals: [], animated: [], crane: null, bounds: 50, districts: [], breakables: [], holes: [], tunnelOpenings: [], keep: [],
};
export function resetWorld(group) {
  W.group = group;
  for (const k of ['solids', 'zones', 'doors', 'ladders', 'pushables', 'items', 'occluders', 'birds', 'cats', 'catHomes', 'missionZones', 'spawns', 'debris', 'decals', 'animated', 'districts', 'breakables', 'holes', 'tunnelOpenings', 'keep']) W[k] = [];
  W.crane = null; W.grid = new Map();
}
