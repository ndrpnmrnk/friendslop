import test from 'node:test';
import assert from 'node:assert/strict';
import {BOWL,bowlSample,bowlAcceleration,bowlTakeoff,bowlBank,outerRadius} from '../../src/world/skate-bowl.js';
test('continuous 3 metre recessed bowl, flat floor, true circular curved side and flush lip',()=>{
 const b=BOWL,R=outerRadius(b);
 assert(b.depth>=2.8);assert.equal(bowlSample(b.x,b.z).height,-b.depth);
 assert(bowlSample(b.x+b.bottomRadius*.8,b.z).height===-b.depth);
 for(let i=1;i<=80;i++){let u=i/80,r=b.bottomRadius+b.wallRadius*u;const p=bowlSample(b.x+r,b.z);assert(p.height>=-b.depth&&p.height<=0);
  assert(Number.isFinite(p.slope)&&p.slope>=0&&p.slope<=6);}
 assert(Math.abs(bowlSample(b.x+R,b.z).height)<1e-9);
 assert.equal(bowlSample(b.x+R+1,b.z).height,0);
 assert.equal(bowlSample(b.x+b.patchHalf+.1,b.z),null);
});
test('low speed falls inward while high wall-line speed creates physical banking',()=>{
 const sample=bowlSample(BOWL.x+6,BOWL.z),slow=bowlAcceleration(sample,0,0);
 assert(slow.x<0&&Math.abs(slow.z)<1e-6);
 const fast=bowlAcceleration(sample,0,12);
 assert(fast.x>slow.x);
 assert(Math.abs(bowlBank(sample,0))>0);
 assert(bowlBank(bowlSample(BOWL.x-6,BOWL.z),0)<0);
});
test('only sufficiently fast outward momentum at lip launches board',()=>{
 const old=bowlSample(BOWL.x+outerRadius(BOWL)-.5,BOWL.z);
 const lip=bowlSample(BOWL.x+outerRadius(BOWL)-.15,BOWL.z);
 assert(bowlTakeoff(old,lip,14,0,14)>3);
 assert.equal(bowlTakeoff(old,lip,4,0,4),0);
 assert.equal(bowlTakeoff(old,lip,-14,0,14),0);
 assert.equal(bowlTakeoff(old,lip,14,0,14,true),0);
});
