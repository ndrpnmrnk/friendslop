import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SKATE_LAYOUT as L} from '../../src/world/skate-layout.js';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('a real hole is cut in the terrain, with a single matching bowl mesh + ground sampler',()=>{
 const scene=read('src/world/districts/skatepark.js');
 const world=read('src/world/world.js');
 const physics=read('src/world/physics.js');
 assert(scene.includes('holes:[[L.bowl.x-L.bowl.patchHalf'));
 assert(scene.includes('new THREE.BufferGeometry()'));
 assert(scene.includes("buildBowl(b)"));
 assert(scene.includes('geo.computeVertexNormals()'));
 assert(world.includes('for (const h of holes) W.holes.push'));
 assert(physics.includes('bowlSample(x,z,W.skateBowl)'));
 assert(scene.includes('W.skateBowl={...q,x:b.X(q.x),z:b.Z(q.z),y:b.Y}'));
});
test('halfpipe and small wedge obstacles have closed back panels, not hollow shells',()=>{
 const scene=read('src/world/districts/skatepark.js'),more=read('src/world/more.js');
 assert(scene.includes('closedWedge(b,36,14.1'));
 assert(scene.includes('closedWedge(b,8.2,27'));
 assert(scene.includes('top/2,z+f*(U+.75)'));
 assert(scene.includes('b.quarterPipe(h.x,z,h.width,h.radius,ry,.8)'));
 assert(more.includes('this.solid(x + fx * uc'));
});
test('walk-in rental has actual glass front, usable doorway, shelves and interior path',()=>{
 const scene=read('src/world/districts/skatepark.js');
 assert(!scene.includes('СКЕЙТЫ · САМОКАТЫ'));
 assert(scene.includes('entryWidth'));
 assert(scene.includes('opacity:.26'));
 assert(scene.includes('b.counter(')&&scene.includes('b.shelf('));
 assert(scene.includes('b.ground(x-w/2+.17'));
 assert(scene.includes('b.box(x,z-d/2+.10,w,.20,h,brick)'));
 assert(!scene.includes('b.box(x,z,w,d,2.65,brick)'));
 assert(!scene.includes('b.marking(ride.x'));
});
test('skating, trick scoring, networking and AI reuse original systems',()=>{
 const scene=read('src/world/districts/skatepark.js'),physics=read('src/world/physics.js'),ride=read('src/game/ride.js');
 assert(scene.includes('b.ride(r.kind,r.x,r.z,r.ry)'));
 assert(scene.includes("W.onTrick(actor,'skate-line-'+s.section)"));
 assert(scene.includes('now-s.last>9'));
 assert(physics.includes('bowlAcceleration(')&&physics.includes('bowlTakeoff('));
 assert(ride.includes('(b.bank || 0)'));
 assert(scene.includes('W.skateAI=skateBotController()'));
 assert(read('src/world/state.js').includes('W.skateBowl=null'));
 assert(L.missionFloor[0]<L.spawn[0]&&L.missionFloor[2]>L.spawn[0]);
});
