import test from 'node:test';
import assert from 'node:assert/strict';
import {SKATE_LAYOUT as L,rentalRideClear,skateSection} from '../../src/world/skate-layout.js';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('skate layout keeps 44m bowl, NW halfpipe, NE/SW rails and SE rental',()=>{
 assert.equal(L.size,44);
 assert.equal(L.bowl.x,22);assert.equal(L.bowl.z,23);
 assert(L.bowl.inner>=6.5);
 assert(L.halfpipe.x<22&&L.halfpipe.z<23);
 assert(L.railsNE.every(r=>r[0]>22&&r[1]<23));
 assert(L.railsSW.every(r=>r[0]<22&&r[1]>23));
 assert(L.rental.x>22&&L.rental.z>23);
});
test('rental fleet has clear separate outdoor positions, no vehicle inside building',()=>{
 assert.equal(L.rentalRides.length,4);
 assert.deepEqual(L.rentalRides.map(r=>r.kind),['skate','scooter','skate','scooter']);
 for(const p of L.rentalRides){
  assert(rentalRideClear(p));
  assert(Math.hypot(p.x-L.spawn[0],p.z-L.spawn[1])>2);
 }
 for(let i=0;i<L.rentalRides.length;i++)for(let j=i+1;j<L.rentalRides.length;j++){
  const a=L.rentalRides[i],b=L.rentalRides[j];
  assert(Math.hypot(a.x-b.x,a.z-b.z)>=2.1);
 }
 assert(!rentalRideClear({x:36,z:35}));
});
test('bowl and halfpipe trigger riding sections only on raised features',()=>{
 assert.equal(skateSection(22,15.9,.55),'bowl');
 assert.equal(skateSection(9.5,6.2,.5),'halfpipe');
 assert.equal(skateSection(22,23,0),null);
 assert.equal(skateSection(9.5,9.4,0),null);
});
test('district never recreates the football event pitch or goals',()=>{
 const s=read('src/world/districts/skatepark.js');
 assert(!/W\.pitch\s*=|\.goal\(|\.scoreboard\(|item\('ball'/.test(s));
 assert(s.includes('districtFrame'));
 assert(s.includes('grabTarget'));
 assert(s.includes('grindRail'));
 assert(s.includes('graffiti'));
 assert(s.includes("b.zone('floor'"));
});
