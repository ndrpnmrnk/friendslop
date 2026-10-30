import test from 'node:test';
import assert from 'node:assert/strict';
import {BOWL_DEFAULT as B,bowlHeight,bowlSlope,bowlGround,moveBowlBoard} from '../../src/world/skate-bowl.js';
const eps=(a,b,d=.02)=>assert(Math.abs(a-b)<=d,`expected ${a} near ${b}`);
test('bowl floor is 3.05m genuinely BELOW deck and lip is flush, with no outer berm',()=>{
 assert(B.depth>=3&&B.patchHalf>B.rimRadius);
 eps(bowlHeight(0,B),-B.depth);eps(bowlHeight(B.flatRadius,B),-B.depth);
 eps(bowlHeight(B.rimRadius,B),0);eps(bowlHeight(B.outerRadius+1,B),0);
 for(let r=B.flatRadius;r<B.rimRadius-.12;r+=.07){
  const y=bowlHeight(r,B),next=bowlHeight(r+.03,B);
  assert(y>=-B.depth&&y<=0);assert(next>=y,'wall must rise toward lip');
  assert(next-y<.45,'no vertical collision spikes');
 }
 assert(bowlSlope(6,B)>.4);
});
test('world-relative sampler supplies negative ground through actual opening',()=>{
 const surface={...B,x:100,z:200,baseY:1.2};
 eps(bowlGround(surface,100,200,2),1.2-B.depth);
 eps(bowlGround(surface,100+B.rimRadius,200,2),1.2);
 eps(bowlGround(surface,100+B.patchHalf-0.01,200,2),1.2);
 assert.equal(bowlGround(surface,100+B.patchHalf+.1,200,40),null);
});
const board=(x,z,vx,vz)=>({kind:'scooter',rider:{},x,z,y:0,vx,vz,heading:Math.PI/2,air:false});
test('slow rider slides downhill, fast carve generates limited body bank',()=>{
 const surface={...B,x:0,z:0,baseY:0};
 const r=6.1,slow=board(r,0,0,1.2);slow.y=bowlHeight(r,B);
 moveBowlBoard(slow,.05,surface);assert(slow.vx<0);
 const fast=board(r,0,0,10);fast.y=bowlHeight(r,B);
 moveBowlBoard(fast,.05,surface);
 assert(Number.isFinite(fast.vx)&&Number.isFinite(fast.bowlBank));
 assert(Math.abs(fast.bowlBank)<=.65);
});
test('fast outward motion at inner rim launches one finite-airtime trick',()=>{
 const surface={...B,x:0,z:0,baseY:0};
 const r=B.rimRadius-.065,b=board(r,0,13,0);b.y=bowlHeight(r,B);
 assert(moveBowlBoard(b,.016,surface));assert(b.air&&b.vy>3&&b.y>0);
 assert.equal(b.trick.kind,'barspin');assert.equal(b.trick.dur,.36);
 assert(!moveBowlBoard(b,.016,surface));
 const low=board(r,0,3,0);low.y=bowlHeight(r,B);
 assert(!moveBowlBoard(low,.016,surface));
});
test('boards outside the skate district and unoccupied boards retain ordinary physics',()=>{
 const b=board(100,100,12,0),surface={...B,x:0,z:0,baseY:0};
 assert(!moveBowlBoard(b,.016,surface));assert.equal(b.vx,12);
 b.rider=null;b.bowlBank=.4;moveBowlBoard(b,.2,surface);assert(b.bowlBank<.1);
});
