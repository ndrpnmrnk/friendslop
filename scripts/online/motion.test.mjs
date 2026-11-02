import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleMotion,stampMotion,motionDelay,pushMotion} from '../../src/net/motion-buffer.js';
// v0.65: кадры по времени отправки. Неровный пинг не даёт рывков, задержка показа ограничена.
test('jittery arrival keeps sender spacing, no visible jerks, bounded display delay',()=>{
  let seed=3;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const buf=[],track={},sends=[];
  for(let t=0;t<20;t+=1/12)sends.push({ts:t,arr:t+.12+(rnd()-.5)*.1+(rnd()<.03?.12:0),x:t*6});
  let last=0;for(const s of sends){s.arr=Math.max(last,s.arr);last=s.arr;}
  let i=0,prev=null,jerks=0,maxDelay=0;
  for(let now=3;now<20;now+=1/60){
    while(i<sends.length&&sends[i].arr<=now){const s=sends[i++];pushMotion(buf,{t:stampMotion(track,s.ts,s.arr),x:s.x,y:0,z:0});}
    const d=motionDelay(track);maxDelay=Math.max(maxDelay,d);const m=sampleMotion(buf,now,d);
    if(prev!=null&&Math.abs((m.x-prev)-6/60)>6/60*1.5)jerks++;prev=m.x;
  }
  assert.equal(jerks,0);assert.ok(maxDelay<=.32);
});
test('duplicate and late frames are dropped, buffer stays bounded',()=>{
  const buf=[];assert.ok(pushMotion(buf,{t:1}));assert.equal(pushMotion(buf,{t:1}),false);assert.equal(pushMotion(buf,{t:.5}),false);
  for(let k=2;k<60;k++)pushMotion(buf,{t:k});assert.equal(buf.length,24);
});
