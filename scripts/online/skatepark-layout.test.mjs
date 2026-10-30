import test from 'node:test';
import assert from 'node:assert/strict';
import {SKATE_LAYOUT as L,rentalRideClear,skateSection} from '../../src/world/skate-layout.js';
import {outerRadius,bowlSample} from '../../src/world/skate-bowl.js';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('skatepark still follows the 44m bowl/halfpipe/NE SW rails/SE rental blueprint',()=>{
 assert.equal(L.size,44);
 assert.equal(L.bowl.x,22);assert.equal(L.bowl.z,23);
 assert(outerRadius(L.bowl)>7.5&&L.bowl.depth>=3);
 assert(L.halfpipe.x<22&&L.halfpipe.z<23);
 assert(L.railsNE.every(r=>r[0]>22&&r[1]<23));
 assert(L.railsSW.every(r=>r[0]<22&&r[1]>23));
 assert(L.rental.x>22&&L.rental.z>23);
});
test('five scattered real rideable boards and scooters do not intersect kiosk or each other',()=>{
 assert.equal(L.rentalRides.length,5);
 assert(L.rentalRides.some(p=>p.z>39&&p.x>29),'some rentals near the building');
 assert(L.rentalRides.some(p=>p.x<20),'a board elsewhere in the park');
 assert(L.rentalRides.some(p=>p.z<12),'a scooter elsewhere in the park');
 assert(L.rentalRides.some(p=>p.kind==='skate'));
 assert(L.rentalRides.some(p=>p.kind==='scooter'));
 for(const p of L.rentalRides){
  assert(rentalRideClear(p),JSON.stringify(p));
  assert(Math.hypot(p.x-L.spawn[0],p.z-L.spawn[1])>2);
 }
 for(let i=0;i<L.rentalRides.length;i++)for(let j=i+1;j<L.rentalRides.length;j++){
  const a=L.rentalRides[i],b=L.rentalRides[j];
  assert(Math.hypot(a.x-b.x,a.z-b.z)>=2.1);
 }
 assert(!rentalRideClear({x:36,z:35}));
});
test('deep bowl only scores when on curved wall, no reward from flat bottom',()=>{
 const p=bowlSample(22+6.2,23);
 assert.equal(skateSection(22+6.2,23,p.height),'bowl');
 assert.equal(skateSection(9.5,6.2,.5),'halfpipe');
 assert.equal(skateSection(22,23,-L.bowl.depth),null);
 assert.equal(skateSection(9.5,9.4,0),null);
});
test('no football returns and the skatepark missions remain registered',()=>{
 const s=read('src/world/districts/skatepark.js');
 assert(!/W\.pitch\s*=|\.goal\(|\.scoreboard\(|item\('ball'/.test(s));
 assert(s.includes('districtFrame')&&s.includes('grabTarget')&&s.includes('grindRail'));
 assert(s.includes('graffiti')&&s.includes("b.zone('floor'"));
});
