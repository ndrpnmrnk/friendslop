import test from 'node:test';
import assert from 'node:assert/strict';
import {ActiveMotion} from '../../src/net/active-motion.js';
import {StateDelta} from '../../src/net/state-codec.js';
import {replicationTier} from '../../src/net/replication-priority.js';

const obj=(x,z=0)=>({kind:'barrel',x,y:0,z,vx:2,vy:0,vz:0,mesh:{rotation:{x:0,y:0,z:0}}});
test('nearby riders and balls outrank distant scenery in the same shared 8-client packet',()=>{
 const movers=new Map();
 for(let i=0;i<44;i++)movers.set('p:'+i,obj(400+i));
 movers.set('p:near',obj(1001));
 movers.set('p:rider',{...obj(5000),rider:{netKey:'p8'}});
 movers.set('p:ball',{...obj(3000),kind:'voteBall'});
 const m=new ActiveMotion(),viewers=[...Array(8)].map((_,i)=>({pos:{x:i*1000,z:0}}));
 const result=m.capture(movers,3,8192,{now:1000,queued:0,viewers});
 assert.equal(result.length,3);
 assert(result.some(row=>row[0]==='p:near'));
 assert(result.some(row=>row[0]==='p:rider'));
 assert(result.some(row=>row[0]==='p:ball'));
});
test('motion throttling is adaptive and far objects eventually transmit',()=>{
 const near=obj(0),far=obj(200),movers=new Map([['p:near',near],['p:far',far]]);
 const m=new ActiveMotion(),viewers=[{pos:{x:0,z:0}}];
 const first=m.capture(movers,32,8192,{now:1000,viewers});
 assert.equal(first.length,2);
 near.x+=1;far.x+=1;
 const soon=m.capture(movers,32,8192,{now:1100,viewers});
 assert.deepEqual(soon.map(r=>r[0]),['p:near']);
 const later=m.capture(movers,32,8192,{now:1700,viewers});
 assert.deepEqual(later.map(r=>r[0]),['p:far']);
});
test('under overload, no changed far mover is starved by more than a bounded recovery window',()=>{
 const movers=new Map();
 for(let i=0;i<40;i++)movers.set('p:high'+i,obj(i*.01));
 for(let i=0;i<12;i++)movers.set('p:far'+i,obj(500+i));
 const m=new ActiveMotion(),viewers=[{pos:{x:0,z:0}}],seen=new Set();
 for(let tick=0;tick<30;tick++){
   for(const b of movers.values())b.z+=.05;
   const rows=m.capture(movers,32,8192,{now:1000+tick*90,viewers});
   assert(rows.length<=32);assert(Buffer.byteLength(JSON.stringify(rows))<=8192);
   rows.forEach(row=>seen.add(row[0]));
 }
 assert.equal(seen.size,52,'far objects must ultimately be included, despite 40 hot near objects');
});
test('backpressure tightens packet budget but does not suppress vehicle rider',()=>{
 const movers=new Map();
 for(let i=0;i<100;i++)movers.set('p:'+i,{...obj(i),rider:i===0?{}:null});
 const m=new ActiveMotion();
 const rows=m.capture(movers,32,8192,{now:1000,queued:28000,viewers:[{pos:{x:0,z:0}}]});
 assert(rows.some(r=>r[0]==='p:0'));assert(Buffer.byteLength(JSON.stringify(rows))<=2048);
});
test('deferred state deltas are retried and mandatory deletes are never throttled',()=>{
 const d=new StateDelta();d.baseline([['p:far',[1]],['p:hot',[4]]]);
 const changed=[['p:far',[2]],['p:hot',[5]]];
 assert.deepEqual(d.snapshot(changed,false,key=>key!=='p:far').rows,[['p:hot',[5]]]);
 assert.deepEqual(d.snapshot(changed,false,()=>true).rows,[['p:far',[2]]]);
 assert.deepEqual(d.snapshot([['p:hot',[5]]],false,()=>false).rows,[['p:far',null]]);
});
test('full keyframe restores distant deferred states even when throttled',()=>{
 const d=new StateDelta();d.baseline([['p:remote',[0]]]);
 assert.deepEqual(d.snapshot([['p:remote',[2]]],false,()=>false).rows,[]);
 assert.deepEqual(d.snapshot([['p:remote',[2]]],true,()=>false).rows,[['p:remote',[2]]]);
 assert.deepEqual(d.snapshot([['p:remote',[2]]]).rows,[]);
});
