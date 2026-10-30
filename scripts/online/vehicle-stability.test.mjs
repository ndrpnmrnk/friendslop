import test from 'node:test';
import assert from 'node:assert/strict';
import {isMotorCar,isCrashImpact,pedalFoot,safeMountCandidate} from '../../src/game/vehicle-stability.js';
test('crash grace prevents stale repeated ejection after remount',()=>{
 assert(isCrashImpact(8,0,6));assert(!isCrashImpact(8,.3,6));
 assert(!isCrashImpact(0,0,6));assert(isMotorCar('kart')&&isMotorCar('kidcar'));
 assert(!isMotorCar('bike'));
});
test('both feet follow the actual opposite crank arms in every phase',()=>{
 for(let i=0;i<64;i++){
   const phase=i*Math.PI/16;
   for(const side of [-1,1]){
     const p=pedalFoot(phase,side,.88);
     assert(Math.abs(p.y+.88-(.40+side*.24*Math.cos(phase)))<1e-12);
     assert(Math.abs(p.z-(-.08+side*.24*Math.sin(phase)))<1e-12);
     assert.equal(p.x,side*.16);
   }
 }
});
test('mount recovery resolves small wall overlap, rejects impossible displacement',()=>{
 const pushed=safeMountCandidate({x:0,z:0},p=>{p.x=Math.max(.4,p.x);});
 assert.deepEqual(pushed,{x:.4,z:0});
 assert.equal(safeMountCandidate({x:0,z:0},p=>{p.x=10;}),null);
 assert.equal(safeMountCandidate({x:NaN,z:0},()=>{}),null);
});
