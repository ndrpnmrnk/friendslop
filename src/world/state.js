// Общее состояние мира текущего раунда. Очищается при генерации новой карты.
export const W = {
  group: null,
  solids: [], zones: [], doors: [], ladders: [], pushables: [], items: [],
  occluders: [], birds: [], cats: [], catHomes: [], missionZones: [], spawns: [],
  debris: [], decals: [], animated: [], crane: null, bounds: 50, districts: [], breakables: [], holes: [], tunnelOpenings: [], keep: [], swingers: [], cars: [], vendings: [], flick: [], manholes: [], chimneys: [], interacts: [], elevators: [], bouncers: [], hydrants: [], bells: [], dropLadders: [], carousels: [], hides: [], hitHooks: [], floodRects: [],
  spots: { fish: [], fuse: [], safe: [], pickup: [], deliver: [], demo: [], crane: [] },
};
export function resetWorld(group) {
  W.group = group;
  for (const k of ['solids', 'zones', 'doors', 'ladders', 'pushables', 'items', 'occluders', 'birds', 'cats', 'catHomes', 'missionZones', 'spawns', 'debris', 'decals', 'animated', 'districts', 'breakables', 'holes', 'tunnelOpenings', 'keep', 'swingers', 'swingSeats', 'cars', 'vendings', 'flick', 'manholes', 'chimneys', 'interacts', 'elevators', 'bouncers', 'hydrants', 'bells', 'dropLadders', 'carousels', 'hides', 'benches', 'flowers']) W[k] = [];
  W.buildings = []; W.obbs = []; W.slides = []; W.rails = []; W.pitch = null; W.flickRooms = []; W.flowerbeds = []; W.traps2 = []; W.ziplines = []; W.fires = []; W.lure = null; W.moth = null; W.dead = []; W.lamps = []; W.puddles = []; W.kitchens = []; W.phones = []; W.goals = []; W.hills = []; W.crane = null; W.grid = new Map(); W.hitHooks = []; W.floodRects = []; W.spots = { fish: [], fuse: [], safe: [], pickup: [], deliver: [], demo: [], crane: [], kitchen: [], phone: [], fire: [], bulb: [], pizza: [], pen: [], grill: [], car: [] };
}
