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

test('manual voice thresholds retain quiet syllables, never adapt and PTT bypasses amplitude',async()=>{
 const{micGate}=await import('../../src/core/mic-gate.js');const s={},cfg={on:true,mode:'always',open:.3,close:.15};
 assert.equal(micGate(s,.29,.02,cfg),false);assert.equal(micGate(s,.31,.02,cfg),true);
 for(let i=0;i<10000;i++)assert.equal(micGate(s,.2,.02,cfg),true);
 assert.equal(cfg.open,.3);assert.equal(micGate(s,0,.2,cfg),true);assert.equal(micGate(s,0,.2,cfg),false);
 assert.equal(micGate(s,0,.02,{...cfg,mode:'ptt',pressed:true}),true);
 assert.equal(micGate(s,1,.02,{...cfg,mode:'ptt',pressed:false}),false);
});
test('motion interpolates independently of round clock and bounds prediction during packet loss',async()=>{
 const{sampleMotion}=await import('../../src/net/motion-buffer.js');const b=[{t:1,x:0,y:0,z:0},{t:1.1,x:1,y:0,z:0}];
 assert(Math.abs(sampleMotion(b,1.15).x-.5)<1e-8);assert(Math.abs(sampleMotion(b,1.25).x-1.5)<1e-8);
 assert(Math.abs(sampleMotion(b,10).x-2)<1e-8);assert.equal(sampleMotion([],1),null);
});

test('20 Hz pacing preserves cadence at different FPS and skips backlog after a stall',async()=>{
 const{nextSendAt,MOTION_INTERVAL,MOTION_DELAY}=await import('../../src/net/state-codec.js');
 for(const fps of[30,60,144]){let due=0,count=0;for(let f=0;f<fps*5;f++){const t=1+f/fps;if(t+1e-10>=due){count++;due=nextSendAt(due,t,MOTION_INTERVAL);}}assert(count>=99&&count<=101,`${fps} FPS: ${count}`);}
 assert.equal(nextSendAt(1,5,.05),5.05);assert(MOTION_DELAY<.1);
});
test('streamed deltas retain changes, removals and baseline recovery without rebuilding last map',()=>{
 const d=new StateDelta();d.baseline([['a',[1]],['b',[2]]]);const last=d.last;
 function* rows(){yield['a',[3]];yield['new',[4]];}
 assert.deepEqual(d.snapshot(rows()).rows,[['a',[3]],['new',[4]],['b',null]]);assert.equal(d.last,last);
 assert.deepEqual(d.snapshot(rows()).rows,[]);assert.deepEqual(d.snapshot(rows(),true).rows,[['a',[3]],['new',[4]]]);
 assert.deepEqual(d.snapshot([['a',[1]]]).rows,[['a',[1]],['new',null]]);
});
