import test from 'node:test';
import assert from 'node:assert/strict';
import {BOWL_DEFAULT as B,bowlHeight,bowlSlope,bowlGround,moveBowlBoard} from '../../src/world/skate-bowl.js';
const eps=(a,b,d=.02)=>assert(Math.abs(a-b)<=d,`expected ${a} close to ${b}`);
test('continuous deep bowl has low floor, 2.7m rim and graded exterior',()=>{
 eps(bowlHeight(0,B),0);eps(bowlHeight(B.flatRadius,B),0);
 eps(bowlHeight(B.rimRadius,B),2.7);
 eps(bowlHeight(B.outerRadius,B),0);
 for(let r=.1;r<B.outerRadius-.02;r+=.05)assert(Math.abs(bowlHeight(r+.005,B)-bowlHeight(r,B))<.02);
 assert(bowlSlope(6,B)>.4);assert(bowlSlope(9.5,B)<-.3);
});
test('surface sample respects world offsets, approach height and safety margin',()=>{
 const surface={...B,x:100,z:200,baseY:1.2};
 eps(bowlGround(surface,100,200,2),1.2);
 eps(bowlGround(surface,100+B.rimRadius,200,4),3.9);
 assert.equal(bowlGround(surface,100+B.rimRadius,200,1.4),null);
 assert.equal(bowlGround(surface,150,200,50),null);
});
const board=(x,z,vx,vz)=>({kind:'scooter',rider:{},x,z,y:1.5,vx,vz,heading:Math.PI/2,air:false});
test('slow skater slides down slope; fast tangential rider carves rather than snaps',()=>{
 const surface={...B,x:0,z:0,baseY:0};
 const r=6.2,slow=board(r,0,0,1.2);slow.y=bowlHeight(r,B);
 moveBowlBoard(slow,.05,surface);assert(slow.vx<0);
 const fast=board(r,0,0,10);fast.y=bowlHeight(r,B);
 moveBowlBoard(fast,.05,surface);assert(Number.isFinite(fast.vx)&&Number.isFinite(fast.bowlBank));
 assert(Math.abs(fast.bowlBank)<=.57);
});
test('outward high-speed rim crossing launches one finite trick and uses cooldown',()=>{
 const surface={...B,x:0,z:0,baseY:0};
 const b=board(B.rimRadius-.18,0,12,0);b.y=bowlHeight(B.rimRadius-.18,B);
 assert.equal(moveBowlBoard(b,.016,surface),true);assert(b.air&&b.vy>=3);
 assert.equal(b.trick.kind,'barspin');assert(b.bowlFlightCooldown>1);
 assert.equal(moveBowlBoard(b,.016,surface),false);
 const low=board(B.rimRadius-.18,0,3,0);low.y=b.y;
 assert.equal(moveBowlBoard(low,.016,surface),false);
});
test('outside skate region and unattended boards are unaffected',()=>{
 const b=board(100,100,12,0),surface={...B,x:0,z:0,baseY:0};
 assert.equal(moveBowlBoard(b,.016,surface),false);assert.equal(b.vx,12);
 b.rider=null;b.bowlBank=.4;moveBowlBoard(b,.2,surface);assert(b.bowlBank<.1);
});
