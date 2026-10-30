import test from 'node:test';
import assert from 'node:assert/strict';
import {BOWL_DEFAULT as B,bowlHeight,bowlSlope,bowlGround,moveBowlBoard,bowlLipLaunch,bowlContact,constrainBowlWalker,bowlWalkLimit,constrainBowlWheel} from '../../src/world/skate-bowl.js';
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
test('bowl takeoff requires the wheels to reach the actual lip, then starts an airborne arc',()=>{
 const surface={...B,x:0,z:0,baseY:0},r=B.rimRadius-.035;
 const fast=board(r,0,13,0);fast.y=bowlHeight(r,B);
 moveBowlBoard(fast,.016,surface);
 const oldX=fast.x;fast.x=B.rimRadius+.08;
 assert(bowlLipLaunch(fast,oldX,0,surface));assert(fast.air&&fast.vy>3&&fast.y>=-.08);
 assert.equal(fast.trick.kind,'barspin');assert(!bowlLipLaunch(fast,oldX,0,surface));
 const deep=board(B.rimRadius-.3,0,13,0);deep.y=bowlHeight(B.rimRadius-.3,B);
 deep.x=B.rimRadius+.08;
 assert(!bowlLipLaunch(deep,B.rimRadius-.3,0,surface),'deep board cannot teleport to lip');
 const slow=board(r,0,3,0);slow.y=bowlHeight(r,B);slow.x=B.rimRadius+.08;
 assert(!bowlLipLaunch(slow,r,0,surface));
 const inward=board(r,0,-13,0);inward.y=bowlHeight(r,B);inward.x=B.rimRadius+.08;
 assert(!bowlLipLaunch(inward,r,0,surface));
});
test('the bowl cannot propel a board uphill for free',()=>{
 const surface={...B,x:0,z:0,baseY:0};
 const r=6.4,b=board(r,0,0,16);b.y=bowlHeight(r,B);
 moveBowlBoard(b,.05,surface);
 assert(b.vx<=0,'centripetal support must not reverse gravity uphill');
});
test('a character cannot walk up the near-vertical wall but can slide back inward',()=>{
 const surface={...B,x:0,z:0,baseY:0},limit=bowlWalkLimit(surface);
 assert(limit>B.flatRadius&&limit<B.rimRadius-.25);
 let p={x:limit-.08,y:bowlHeight(limit-.08,B),z:0};
 let v={x:5,z:0};
 const nextX=p.x;p.x+=.7;
 assert(constrainBowlWalker(surface,p,v,nextX,0,.1,true));
 assert(p.x<=limit+.001&&v.x<=.01,'walking must stop before the steep wall');
 p={x:limit+.45,y:bowlHeight(limit+.45,B),z:0};
 v={x:0,z:0};
 assert(constrainBowlWalker(surface,p,v,p.x,0,.1,true));
 assert(p.x<limit+.45,'standing on steep surface must slide downhill');
 const airborne={x:limit+.55,y:.8,z:0};
 assert(!constrainBowlWalker(surface,airborne,{x:7,z:0},limit+.45,0,.1,false),'airborne player may jump over coping');
});
test('skate wheel cannot be raised metres by wall contact in one frame',()=>{
 const surface={...B,x:0,z:0,baseY:0},wheel=board(7.9,0,12,0);
 wheel.y=bowlHeight(7.3,B);const before=wheel.x;
 assert(constrainBowlWheel(surface,wheel,.016));
 assert(wheel.x<before,'wheel position must be limited by vertical travel');
 const y=bowlHeight(wheel.x,B);
 assert(y-wheel.y<.3,'contact rise within one tick must stay small');
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
