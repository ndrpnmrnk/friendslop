import test from 'node:test';
import assert from 'node:assert/strict';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
globalThis.dispatchEvent=()=>true;
globalThis.CustomEvent=class {constructor(name){this.type=name;}};
const {initCollection,collection,claimFistReward}=await import('../../src/game/collection.js');
initCollection(['cat','frog']);
test('same host-approved FIST can never credit twice',()=>{
 assert.equal(claimFistReward('ROOMA:1234',7),'new');
 assert.equal(claimFistReward('ROOMA:1234',7),'duplicate');
 assert.equal(collection().coins,1);
 assert.equal(JSON.parse(storage.get('friendslop.collection.v1')).fistClaims['ROOMA:1234'][0],7);
});
test('different coin ids and different matches each award exactly once',()=>{
 assert.equal(claimFistReward('ROOMA:1234',8),'new');
 assert.equal(claimFistReward('ROOMA:2222',7),'new');
 assert.equal(claimFistReward('ROOMA:1234',8),'duplicate');
 assert.equal(collection().coins,3);
});
test('invalid awards cannot modify wallet',()=>{
 assert.equal(claimFistReward('ROOMA:1234',-1),'failed');
 assert.equal(claimFistReward('',4),'failed');
 assert.equal(claimFistReward('ROOMA:1234',NaN),'failed');
 assert.equal(collection().coins,3);
});
