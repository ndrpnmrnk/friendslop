// Общее состояние мира текущего раунда. Очищается при генерации новой карты.
export let W = {
  group: null,
  solids: [], zones: [], doors: [], ladders: [], pushables: [], items: [],
  occluders: [], birds: [], cats: [], catHomes: [], missionZones: [], spawns: [],
  debris: [], decals: [], animated: [], crane: null, bounds: 50, districts: [], breakables: [], holes: [], tunnelOpenings: [], keep: [], swingers: [], cars: [], vendings: [], flick: [], manholes: [], chimneys: [], interacts: [], elevators: [], bouncers: [], hydrants: [], bells: [], dropLadders: [], carousels: [], hides: [], hitHooks: [], floodRects: [],
  spots: { fish: [], fuse: [], safe: [], pickup: [], deliver: [], demo: [], crane: [] },
};
export function resetWorld(group) {
  for(const r of W.mapResources||[])r.dispose();W.mapResources=new Set();
  W.group = group;
  W.factorySite=W.salonSite=W.mayor=W.university=W.cinemaSite=null;
  W.fatDone=false;
  for (const k of ['surfaces','dressings','lightSources','hoops','foodSpots','solids', 'canopies', 'crowns', 'zones', 'doors', 'ladders', 'pushables', 'items', 'occluders', 'birds', 'cats', 'npcs', 'catHomes', 'missionZones', 'spawns', 'debris', 'decals', 'animated', 'districts', 'breakables', 'holes', 'tunnelOpenings', 'keep', 'swingers', 'swingSeats', 'cars', 'vendings', 'flick', 'manholes', 'chimneys', 'interacts', 'elevators', 'bouncers', 'hydrants', 'bells', 'dropLadders', 'carousels', 'hides', 'benches', 'flowers']) W[k] = [];
  W.buildings = []; W.obbs = []; W.slides = []; W.rails = []; W.pitch = null; W.flickRooms = []; W.flowerbeds = []; W.traps2 = []; W.ziplines = []; W.fires = []; W.lure = null; W.moth = null; W.dead = []; W.lamps = []; W.puddles = []; W.kitchens = []; W.phones = []; W.goals = []; W.hills = []; W.crane = null; W.grid = new Map(); W.hitHooks = []; W.floodRects = []; W.spots = { fish: [], fuse: [], safe: [], pickup: [], deliver: [], demo: [], crane: [], kitchen: [], phone: [], fire: [], bulb: [], pizza: [], pen: [], grill: [], car: [] };
}

// Хаб использует те же игровые системы, но хранит свой мир отдельно от матча.
// Все импортирующие модули получают актуальное W через живую ES-привязку.
export function withWorld(world, fn) { const previous=W;W=world;try{return fn();}finally{W=previous;} }
export function createWorld(group) { const world={bounds:50};withWorld(world,()=>resetWorld(group));return world; }
