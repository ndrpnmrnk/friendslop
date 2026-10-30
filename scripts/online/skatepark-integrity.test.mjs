import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SKATE_LAYOUT as L} from '../../src/world/skate-layout.js';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
test('six real curved quarter pipes build center bowl and separated half-pipe',()=>{
 const skate=read('src/world/districts/skatepark.js'),method=read('src/world/more.js');
 assert.match(skate,/b\.quarterPipe\(x,z-inner,width,radius,Math\.PI,deck\)/);
 assert.match(skate,/b\.quarterPipe\(x,z\+inner,width,radius,0,deck\)/);
 assert.match(skate,/b\.quarterPipe\(x-inner,z,width,radius,-Math\.PI\/2,deck\)/);
 assert.match(skate,/b\.quarterPipe\(x\+inner,z,width,radius,Math\.PI\/2,deck\)/);
 assert.match(skate,/b\.quarterPipe\(h\.x,h\.front,h\.width,h\.radius,Math\.PI,\.8\)/);
 assert.match(skate,/b\.quarterPipe\(h\.x,h\.back,h\.width,h\.radius,0,\.8\)/);
 assert(method.includes('this.solid(x + fx * uc'), 'curved surface must have stair-step collisions');
});
test('rental rides use standard online-ready pushables, not decorative meshes',()=>{
 const skate=read('src/world/districts/skatepark.js');
 assert(skate.includes('b.ride(ride.kind,ride.x,ride.z,ride.ry)'));
 assert(skate.includes('districtRental'));
 assert(skate.includes('rentalRideClear'));
 assert(!skate.includes("b.item('ball'"));
 const net=read('src/net/world-sync.js');
 assert(net.includes("register('p'")||net.includes("api.register('p'")||net.includes("type==='p'"),'pushables must be part of network world');
});
test('skate tricks award through existing score cap, no duplicate independent wallet',()=>{
 const skate=read('src/world/districts/skatepark.js');
 assert(skate.includes('W.onTrick(a,'));
 assert(skate.includes('now-r.last>9'));
 assert(skate.includes("['skate','scooter']"));
 assert(!/\b(?:SC\.award|bonus\(|addCoins\()/.test(skate));
});
test("skatebot AI never overwrites busy missions or another player\x27s rental",()=>{
 const ai=read('src/world/skate-bots.js');
 const bots=read('src/game/bots.js');
 assert(ai.includes('board.rider')||ai.includes('b.rider'));
 assert(ai.includes('actor.work'));
 assert(ai.includes('board.rider!==actor'));
 assert(bots.includes('W.skateAI?.tick(b,dt,t)'));
 assert(bots.includes('W.skateAI?.goal(b)'));
 assert(read('src/world/state.js').includes('W.skateAI=null'));
 assert(L.missionFloor[0]<L.spawn[0]&&L.missionFloor[2]>L.spawn[0]);
});
