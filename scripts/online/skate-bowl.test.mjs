import test from 'node:test';
import assert from 'node:assert/strict';
import {BOWL_DEFAULT as B,bowlHeight,bowlSlope,bowlGround,moveBowlBoard,bowlLipLaunch,bowlContact} from '../../src/world/skate-bowl.js';
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
test('fast bowl exit preserves airborne vertical momentum without floor snap',()=>{
 const surface={...B,x:0,z:0,baseY:0},r=B.rimRadius-.3;
 const fast=board(r,0,13,0);fast.y=bowlHeight(r,B);
 moveBowlBoard(fast,.016,surface);
 const oldX=fast.x;fast.x=B.rimRadius+.08;
 assert(bowlLipLaunch(fast,oldX,0,surface));assert(fast.air&&fast.vy>3&&fast.y>0);
 assert.equal(fast.trick.kind,'barspin');assert(!bowlLipLaunch(fast,oldX,0,surface));
 const slow=board(r,0,3,0);slow.y=bowlHeight(r,B);slow.x=B.rimRadius+.08;
 assert(!bowlLipLaunch(slow,r,0,surface));
 const inward=board(r,0,-13,0);inward.y=bowlHeight(r,B);inward.x=B.rimRadius+.08;
 assert(!bowlLipLaunch(inward,r,0,surface));
});
test('surface contact normal gives both aligned pitch and roll',()=>{
 const surface={...B,x:0,z:0,baseY:0};
 const c=bowlContact(surface,6,1,Math.PI/4);
 assert(Number.isFinite(c.pitch)&&Number.isFinite(c.roll));
 const boardA=board(6,1,0,8);boardA.heading=Math.PI/4;boardA.y=bowlHeight(Math.hypot(6,1),B);
 moveBowlBoard(boardA,.1,surface);
 assert(Math.abs(boardA.bowlBank)>0.01&&Math.abs(boardA.bowlPitch)>0.01);
 assert(Math.abs(boardA.bowlBank)<1.1&&Math.abs(boardA.bowlPitch)<1.1);
});
test('boards outside the skate district and unoccupied boards retain ordinary physics',()=>{
 const b=board(100,100,12,0),surface={...B,x:0,z:0,baseY:0};
 assert(!moveBowlBoard(b,.016,surface));assert.equal(b.vx,12);
 b.rider=null;b.bowlBank=.4;moveBowlBoard(b,.2,surface);assert(b.bowlBank<.1);
});
