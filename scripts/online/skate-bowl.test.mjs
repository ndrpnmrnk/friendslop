import test from 'node:test';
import assert from 'node:assert/strict';
import {BOWL_DEFAULT as B,bowlHeight,bowlSlope,bowlGround,moveBowlBoard,bowlLipLaunch,bowlContact,constrainBowlWalker,bowlWalkLimit,constrainBowlWheel} from '../../src/world/skate-bowl.js';
const close=(a,b,t=.025)=>assert(Math.abs(a-b)<=t,`expected ${a} ~ ${b}`);
const board=(x,z,vx,vz)=>({kind:'skate',rider:{},x,z,y:0,vx,vz,vy:0,heading:Math.PI/4,air:false});

test('C2 skate bowl joins both floor and coping without a slope discontinuity',()=>{
 assert(B.depth>=3&&B.patchHalf>B.rimRadius);
 close(bowlHeight(0),-B.depth);close(bowlHeight(B.flatRadius),-B.depth);
 close(bowlHeight(B.rimRadius),0);
 close(bowlSlope(B.flatRadius),0);close(bowlSlope(B.rimRadius),0);
 const dr=(B.rimRadius-B.flatRadius)/150;
 let largestSlope=0,previous=bowlHeight(0);
 for(let r=dr;r<=B.rimRadius+.8;r+=dr){
  const y=bowlHeight(r,B),s=bowlSlope(r,B);
  assert(y>=previous-1e-5,'ramp never steps downward or pops up');
  assert(s>=0&&s<=1.65,'ramp must be smooth and not near-vertical');
  assert(y-previous<.055,'no discrete mesh-height jump');
  largestSlope=Math.max(largestSlope,s);previous=y;
 }
 assert(largestSlope>1.05,'deep bowl must still offer a useful transition');
 close(bowlHeight(B.rimRadius-.01,B),0,.001);
 close(bowlSlope(B.rimRadius-.01,B),0,.002);
});
test('bowl sampler is continuous even as a rolling actor crosses the cutout',()=>{
 const bowl={...B,x:100,z:200,baseY:1.2};
 for(const r of [0,B.flatRadius,B.flatRadius+.15,6.3,7.3,B.rimRadius-.01,B.rimRadius,B.patchHalf-.01]){
  close(bowlGround(bowl,100+r,200,-50),1.2+bowlHeight(r,B));
 }
 assert.equal(bowlGround(bowl,100+B.patchHalf+.3,200,40),null);
});
test('gravity accelerates downhill only, without fake uphill boost from wall grip',()=>{
 const bowl={...B,x:0,z:0,baseY:0};
 const a=board(6.2,0,1.5,10);a.y=bowlHeight(6.2,B);
 const vx=a.vx;moveBowlBoard(a,.016,bowl);
 assert(a.vx<vx&&Number.isFinite(a.vx));
 assert(Number.isFinite(a.bowlPitch)&&Number.isFinite(a.bowlBank));
 assert(Math.abs(a.bowlPitch)<=1&&Math.abs(a.bowlBank)<=1);
 const outside=board(100,100,8,0);
 moveBowlBoard(outside,.016,bowl);assert.equal(outside.vx,8);
});
test('continuous lip crossing launches only on real outward speed',()=>{
 const bowl={...B,x:0,z:0,baseY:0};
 const r=B.rimRadius-.035,fast=board(r,0,12,0);fast.y=bowlHeight(r,B);
 fast.x=B.rimRadius+.04;
 assert(bowlLipLaunch(fast,r,0,bowl));assert(fast.air&&fast.vy>3);
 assert(!bowlLipLaunch(fast,r,0,bowl),'one launch per flight');
 const slow=board(r,0,4,0);slow.y=bowlHeight(r,B);slow.x=B.rimRadius+.04;
 assert(!bowlLipLaunch(slow,r,0,bowl));
 const deep=board(6.4,0,13,0);deep.y=bowlHeight(6.4,B);deep.x=B.rimRadius+.04;
 assert(!bowlLipLaunch(deep,6.4,0,bowl));
 const wrong=board(r,0,-13,0);wrong.y=bowlHeight(r,B);wrong.x=B.rimRadius+.04;
 assert(!bowlLipLaunch(wrong,r,0,bowl));
});
test('board/rider contact shares a bounded analytic surface normal',()=>{
 const bowl={...B,x:0,z:0,baseY:0},c=bowlContact(bowl,6,1,Math.PI/4);
 assert(c&&Number.isFinite(c.pitch)&&Number.isFinite(c.roll));
 const b=board(6,1,0,9);b.y=bowlHeight(Math.hypot(6,1),B);
 moveBowlBoard(b,.1,bowl);
 assert(Math.abs(b.bowlPitch)>0.01&&Math.abs(b.bowlBank)>0.01);
});
test('walkers are not pinned or teleported on steep walls',()=>{
 const bowl={...B,x:0,z:0,baseY:0},limit=bowlWalkLimit(bowl);
 assert(limit>B.flatRadius&&limit<B.rimRadius);
 const p={x:limit+.2,y:bowlHeight(limit+.2,B),z:0},v={x:3,z:0},from=p.x;
 p.x+=.2;
 assert(constrainBowlWalker(bowl,p,v,from,0,.016,true));
 close(p.x,from,.001);assert(v.x<=0,'uphill walk is blocked');
 const q={x:limit+.4,y:bowlHeight(limit+.4,B),z:0},u={x:0,z:0};
 assert(constrainBowlWalker(bowl,q,u,q.x,0,.016,true));
 close(q.x,limit+.4,.001);assert(u.x<0,'downhill is accelerated, not teleported');
 assert(!constrainBowlWalker(bowl,{x:limit+.8,y:1,z:0},{x:9,z:0},limit+.5,0,.016,false));
});
test('old wheel radius clamping is disabled - the C2 surface handles contact instead',()=>{
 const b=board(7.8,0,12,0),x=b.x;
 assert.equal(constrainBowlWheel(B,b,.016),false);
 assert.equal(b.x,x,'no radial correction can jerk the board backwards');
});
