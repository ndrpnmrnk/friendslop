import test from 'node:test';
import assert from 'node:assert/strict';
import { StateDelta, MissionLeases, sweepPosition } from '../../src/net/state-codec.js';
import { random, withRandom, randomSource } from '../../src/core/random.js';

test('model/texture cache scopes do not consume map randomness, even on failure', () => {
  const r=randomSource(123),expected=[r(),r()];
  const run=()=>withRandom(123,()=>{const a=random();try{withRandom(7,()=>{random();throw Error('test');});}catch{}return[a,random()];});
  assert.deepEqual(run(),expected);assert.deepEqual(run(),expected);
});
test('deltas omit static world; keyframe recovers a missed change',()=>{
  const d=new StateDelta();d.baseline([['door',[0]],['wall',[1]]]);
  assert.deepEqual(d.snapshot([['door',[0]],['wall',[1]]]).rows,[]);
  assert.deepEqual(d.snapshot([['door',[1]],['wall',[1]]]).rows,[['door',[1]]]);
  assert.deepEqual(d.snapshot([['door',[1]],['wall',[1]]],true).rows,[['door',[1]]]);
});
test('simultaneous claims, stale attempts and duplicate results have one winner',()=>{
  const l=new MissionLeases(),a=l.claim(4,'A',0);assert.equal(l.claim(4,'B',0),null);
  assert(l.release(4,'A',a.token));const b=l.claim(4,'B',1);
  assert(!l.finish(4,'A',a.token));assert(l.finish(4,'B',b.token));assert(!l.finish(4,'B',b.token));
});
test('swept remote movement cannot step across a thin wall or invalid coordinates',()=>{
  const fixed=sweepPosition([0,0,0],[10,0,0],.3,p=>{if(p.x>.9&&p.x<1.3)p.x=.9;});
  assert(fixed[0]<1.1);assert.deepEqual(sweepPosition([0,0,0],[NaN,0,0],.3,()=>{}),[0,0,0]);
});

test('radio clock retains playhead on pause, synchronizes late listeners and resets on tuning',async()=>{
 const{changeRadio,radioPhase}=await import('../../src/game/radio-state.js');const it={};
 changeRadio(it,'toggle',1000);assert.equal(it.radio.since,1500);assert.equal(radioPhase(it.radio,3500,10),2);
 changeRadio(it,'toggle',4500);assert.equal(it.radio.offset,3);assert.equal(it.radio.on,false);
 changeRadio(it,'toggle',10000);assert.equal(radioPhase(it.radio,12500,10),5);
 changeRadio(it,'tune',13000,-1);assert.equal(it.radio.station,2);assert.equal(radioPhase(it.radio,13650,10),0);
});
