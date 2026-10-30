import test from 'node:test';
import assert from 'node:assert/strict';
import {replicationTier,movementIntervalMs,criticalStateChange,shouldSendMovement} from '../../src/net/replication-priority.js';
const actor=(x,z)=>({pos:{x,z}});
test('distance is to ANY player, not just the host',()=>{
 const viewers=[actor(0,0),actor(100,0),actor(200,0),actor(300,0),actor(400,0),actor(500,0),actor(600,0),actor(700,0)];
 assert.equal(replicationTier({x:699,z:0,kind:'barrel'},viewers),'high');
 assert.equal(replicationTier({x:740,z:0,kind:'barrel'},viewers),'medium');
 assert.equal(replicationTier({x:850,z:0,kind:'barrel'},viewers),'far');
});
test('carrying, riding, mission work and football override distance',()=>{
 const p=[actor(0,0)];
 for(const o of [{x:999,z:0,rider:{}},{x:999,z:0,grabbed:{}},{x:999,z:0,state:'held'},
 {x:999,z:0,kind:'voteBall'},{x:999,z:0,netScope:'m33/w1/s0'},{x:999,z:0,mission:{}}])
 assert.equal(replicationTier(o,p),'high');
});
test('low-priority changes are deferred under pressure, never dropped permanently',()=>{
 assert.equal(movementIntervalMs('high',50000),0);
 assert(movementIntervalMs('far',25000)>movementIntervalMs('far',0));
 const base=[ 'barrel',0,0,0,0,0,0,0,0,0,0,0,'','',0],moved=base.slice();moved[1]=4;
 const args={key:'p:far',kind:'p',object:{x:999,z:0,kind:'barrel'},previous:base,next:moved,lastAt:1000,viewers:[actor(0,0)],now:1080,queued:0};
 assert.equal(shouldSendMovement(args),false);
 assert.equal(shouldSendMovement({...args,now:1800}),true);
 assert.equal(shouldSendMovement({...args,object:{...args.object,rider:{}}}),true);
});
test('ownership, pickup, collection, dismount, deletion-relevant changes bypass throttling',()=>{
 const item=['litter','rest',1,0,1,0,0,0,0,0,0,'',0,0,0,1,0,0,0,'',2,null];
 for(const [index,value] of [[1,'held'],[11,'p4'],[14,1],[15,0],[20,3]]){
  const changed=item.slice();changed[index]=value;
  assert(criticalStateChange('i',item,changed));
  assert(shouldSendMovement({kind:'i',object:{x:1000,z:0,state:'rest'},previous:item,next:changed,lastAt:1,now:2,viewers:[actor(0,0)]}));
 }
 const cart=['cart',1,0,3,0,0,0,0,0,0,0,0,'','',0];
 const mounted=cart.slice();mounted[12]='p7';
 assert(criticalStateChange('p',cart,mounted));
 assert(!criticalStateChange('p',cart,[...cart.slice(0,1),2,...cart.slice(2)]));
});
test('no viewer coordinates retains immediate updates for safety',()=>{
 assert.equal(replicationTier({x:1000,z:0},[]),'high');
 assert.equal(replicationTier({x:1000,z:0},[{pos:{x:NaN,z:0}}]),'high');
});
