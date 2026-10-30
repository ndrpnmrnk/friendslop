import test from 'node:test';
import assert from 'node:assert/strict';
import {findRailLanding,startRailGrind,maintainRailGrind,finishRailGrind} from '../../src/world/skate-grind.js';
const rail={x0:0,z0:0,x1:8,z1:0,y:.6};
const board=(o={})=>({kind:'skate',rider:{},x:3,z:.12,y:.72,vx:6,vz:.08,vy:-2,air:true,heading:0,...o});
test('rail can only be caught from above while descending with forward speed',()=>{
 const b=board(),c=findRailLanding(b,[rail],.54);
 assert(c&&c.rail===rail&&c.speed>5.8);
 assert.equal(findRailLanding(board({vy:3}),[rail],.5),null);
 assert.equal(findRailLanding(board({y:.2}),[rail],.05),null);
 assert.equal(findRailLanding(board({vx:0,vz:7}),[rail],.5),null);
 assert.equal(findRailLanding(board({x:8.6}),[rail],.5),null);
 assert.equal(findRailLanding(board({air:false}),[rail],.5),null);
});
test('grind attaches once, follows rail direction, and exits without teleport',()=>{
 const b=board(),c=findRailLanding(b,[rail],.54);
 startRailGrind(b,c);
 assert.equal(b.y,.6);assert.equal(b.air,false);assert.equal(b.grind,rail);
 b.x+=.8;b.z+=.03;
 assert(maintainRailGrind(b,.16));assert(Math.abs(b.z)<1e-8);
 assert(b.grindDistance>.8); assert.equal(b.y,.6);
 b.x+=.9;assert(maintainRailGrind(b,.18));
 const previousX=b.x;
 assert(finishRailGrind(b));assert.equal(b.x,previousX);
 assert.equal(b.grind,null);assert(b.air&&b.grindCooldown>0);
 assert.equal(findRailLanding(b,[rail],.4),null);
});
test('tiny tap is not a grind combo reward',()=>{
 const b=board();startRailGrind(b,findRailLanding(b,[rail],.54));
 b.grindElapsed=.05;b.grindDistance=.1;
 assert.equal(finishRailGrind(b),false);
});
test('grind passes the endpoint instead of pinning the player',()=>{
 const b=board({x:7.55}),c=findRailLanding(b,[rail],.53);
 startRailGrind(b,c);
 b.x=8.1;assert.equal(maintainRailGrind(b,.016),false);
 assert(finishRailGrind(b)===false);
});
