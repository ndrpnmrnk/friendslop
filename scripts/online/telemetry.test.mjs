import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineTelemetry} from '../../src/net/telemetry.js';
test('records RTT p95, jitter, queue and bounded slow frames',()=>{
 const t=new OnlineTelemetry();
 for(const x of [20,23,30,250,32,25,28,27])t.ping(x);
 t.outgoing(12000);t.outgoing(27000,true);
 t.frame(17);t.frame(130);
 const s=t.snapshot(200);
 assert.equal(s.skippedStates,1);assert.equal(s.frameOver120,1);
 assert(s.rttP95>=30);assert(s.jitterP95>0);assert(s.queueP95>=12000);
});
test('sequence skips are tracked separately from local state skips and duplicate packets',()=>{
 const t=new OnlineTelemetry();
 t.state(2,'match',1,1,'round1');t.state(2,'match',4,2,'round1');t.state(2,'match',4,3,'round1');
 assert.equal(t.snapshot().streamGaps,2);
 assert.equal(t.snapshot().reordered,1);
 t.outgoing(40000,true);assert.equal(t.snapshot().skippedStates,1);
 t.state(2,'match',1,4,'round2');assert.equal(t.snapshot().streamGaps,2);
});
test('sustained congestion raises one bounded alert, transient spikes do not',()=>{
 const t=new OnlineTelemetry();
 for(let i=0;i<12;i++)t.outgoing(45000);
 t.assess(1000,true,true);t.assess(2001,true,true);
 assert.equal(t.history.length,0);
 t.assess(3002,true,true);
 assert.equal(t.history[0].kind,'queue');
 t.assess(4003,true,true);assert.equal(t.history.length,1);
 t.assess(5004,false,true);assert.equal(t.strikes.size,0);
 t.reset();assert.equal(t.history.length,0);
});
test('a hidden tab does not trigger frame or network outage reports',()=>{
 const t=new OnlineTelemetry();
 t.frame(100,false,100);assert.equal(t.snapshot().frameOver50,0);
 t.state(2,'hub',1,100);
 for(let ms=1000;ms<10000;ms+=1001)t.assess(ms,true,false);
 assert.equal(t.history.length,0);
});
test('ring sizes, stream table, recorded incidents remain bounded',()=>{
 const t=new OnlineTelemetry();
 for(let i=0;i<2500;i++){t.frame(10+i%70);t.ping(30+i%40);t.outgoing(i);}
 for(let i=1;i<150;i++)t.state(i,'match',1,i,'ep');
 for(let i=0;i<45;i++)t.issue('k'+i,'sample',100000+i*11000);
 assert(t.frames.n<=120);assert(t.pings.n<=36);
 assert(t.streams.size<=36);assert.equal(t.history.length,20);
});
