import test from 'node:test';
import assert from 'node:assert/strict';
import {SKATE_LAYOUT as L,rentalRideClear,skateSection} from '../../src/world/skate-layout.js';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('44m skating: central deep bowl, northwest halfpipe, two rails zones, southeast rental',()=>{
 assert.equal(L.size,44);
 assert.equal(L.bowl.x,22);assert.equal(L.bowl.z,23);
 assert(L.bowl.depth>=2.5&&L.bowl.rimRadius>L.bowl.flatRadius+3);
 assert(L.halfpipe.x<22&&L.halfpipe.z<23);
 assert(L.railsNE.every(r=>r[0]>22&&r[1]<23));
 assert(L.railsSW.every(r=>r[0]<22&&r[1]>23));
 assert(L.rental.x>22&&L.rental.z>23&&L.rental.d>=6.5);
 assert(L.rental.doorWidth>=2);
});
test('natural fleet uses real spaced outdoor skates and scooters without entrance blocking',()=>{
 assert.equal(L.rentalRides.length,5);
 assert.equal(L.rentalRides.filter(p=>p.kind==='skate').length,3);
 assert.equal(L.rentalRides.filter(p=>p.kind==='scooter').length,2);
 for(const p of L.rentalRides)assert(rentalRideClear(p),`blocked ride ${JSON.stringify(p)}`);
 for(let i=0;i<L.rentalRides.length;i++)for(let j=i+1;j<L.rentalRides.length;j++){
  const a=L.rentalRides[i],b=L.rentalRides[j];
  assert(Math.hypot(a.x-b.x,a.z-b.z)>=2.1);
 }
 assert(!rentalRideClear({x:L.rental.x,z:L.rental.z}));
 assert(!rentalRideClear({x:22,z:23}));
});
test('skate line only activates on real curved surfaces',()=>{
 assert.equal(skateSection(22,15.9,2.2),'bowl');
 assert.equal(skateSection(9.5,6.2,.5),'halfpipe');
 assert.equal(skateSection(22,23,0),null);
 assert.equal(skateSection(9.5,9.4,0),null);
});
test('old football area not recreated in skatepark',()=>{
 const s=read('src/world/districts/skatepark.js');
 assert(!/W\.pitch\s*=|\.goal\(|\.scoreboard\(|item\('ball'/.test(s));
 for(const word of ['districtFrame','grabTarget','grindRail','graffiti',"b.zone('floor'"])assert(s.includes(word));
});
