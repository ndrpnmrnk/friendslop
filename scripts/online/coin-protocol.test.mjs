import test from 'node:test';
import assert from 'node:assert/strict';
import {coinRow,validCoinRow,validateCoinSnapshot,CoinAwards,COIN_CAP} from '../../src/net/coin-protocol.js';
test('shared coin snapshot accepts 96 distinct bounded world coordinates',()=>{
 const rows=Array.from({length:COIN_CAP},(_,i)=>coinRow({id:i+1,pos:{x:i+.1234,y:.2,z:3},fly:i%2}));
 assert.equal(rows[0][1],.12);assert.deepEqual(validateCoinSnapshot(rows),rows);
 assert.equal(validateCoinSnapshot([...rows,rows[0]]),null);
 assert.equal(validateCoinSnapshot([rows[0],rows[0]]),null);
 assert.equal(validateCoinSnapshot([[1,Infinity,0,0,0]]),null);
 assert.equal(validateCoinSnapshot([[1,0,0,0,2]]),null);
 assert(!validCoinRow(['0',0,0,0,0]));
});
test('one winner per coin and only their acknowledgement clears the award',()=>{
 const ledger=new CoinAwards();
 assert.equal(ledger.grant(8,3),true);
 assert.equal(ledger.grant(8,5),false);
 let sent=[];
 ledger.flush(1000,(coin,to)=>{sent.push([coin,to]);return true;});
 assert.deepEqual(sent,[[8,3]]);
 ledger.flush(1200,()=>sent.push(['early']));assert.equal(sent.length,1);
 ledger.flush(2600,(coin,to)=>{sent.push([coin,to]);return true;});assert.equal(sent.length,2);
 assert.equal(ledger.acknowledge(8,5),false);
 assert.equal(ledger.acknowledge(8,3),true);
 ledger.flush(5000,()=>sent.push(['late']));assert.equal(sent.length,2);
});
test('backpressure leaves a grant available for the next retry',()=>{
 const ledger=new CoinAwards();ledger.grant(14,7);
 ledger.flush(100,()=>false);
 let sent=0;ledger.flush(120,()=>{sent++;return true;});assert.equal(sent,1);
});
