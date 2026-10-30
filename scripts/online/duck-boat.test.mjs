import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {duckRamEvents} from '../../src/world/duck-ram.js';
const src=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

test('park duck boat has real finite mass, height and radius for all player collisions',()=>{
 const s=src('src/world/pushables.js');
 const mass=s.match(/const mass = \{([^}]+)\}\[kind\]/)?.[1];
 const height=s.match(/const h = \{([^}]+)\}\[kind\]/)?.[1];
 assert(mass&&height);
 const m=Number(mass.match(/\bduck\s*:\s*([\d.]+)/)?.[1]);
 const h=Number(height.match(/\bduck\s*:\s*([\d.]+)/)?.[1]);
 assert(Number.isFinite(m)&&m>.2&&m<10);
 assert(Number.isFinite(h)&&h>.2&&h<2);
 const radius=.85,share=1/(1+m),force=6/m;
 assert(Number.isFinite(radius+share+force),'collision / impulse must never be NaN');
 assert(s.includes('if(!Number.isFinite(mass)||mass<=0||!Number.isFinite(h)'));
});
const duck=(x,vx,withRider=true,z=0)=>({kind:'duck',x,z,r:.85,vx,vz:0,rider:withRider?{pos:{x,y:0,z}}:null});
test('approaching boats generate exactly one authoritative collision with correct victim',()=>{
 const boats=[duck(0,8),duck(1.62,0,false)];
 const last=new Map();
 const first=duckRamEvents(boats,1,last);
 assert.equal(first.length,1);assert.equal(first[0].victim,boats[1]);
 assert(first[0].closing>=4.5);
 assert.deepEqual(duckRamEvents(boats,1.016,last),[]);
 assert.deepEqual(duckRamEvents(boats,2.1,last),[]);
 assert.equal(duckRamEvents(boats,2.6,last).length,1);
});
test('no idle-boat damage, no repeat chain in four-boat crowded scenes',()=>{
 const empty=[duck(0,12,false),duck(1.6,0,false)];
 assert.deepEqual(duckRamEvents(empty,0),[]);
 const boats=[duck(0,12),duck(1.55,0),duck(3.0,0),duck(4.45,0)];
 const hits=duckRamEvents(boats,0);
 assert.equal(hits.length,1);
 const touched=new Set();
 for(const h of hits){assert(!touched.has(h.a));assert(!touched.has(h.b));touched.add(h.a);touched.add(h.b);}
 assert.deepEqual(duckRamEvents(boats,0.1),hits,'stateless call is allowed, real loop passes cooldown map');
});
test('pond animation has cooldown and never dismounts a rider twice',()=>{
 const s=src('src/world/districts/park.js');
 assert(s.includes('duckRamEvents(ducks,elapsed,lastHits)'));
 assert(!/W\.dismount\s*\(r\)/.test(s));
 assert(s.includes('knockDown(rider,'));
 assert(s.includes("b.ride('duck'"));
});
