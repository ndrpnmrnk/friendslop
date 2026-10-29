import test from 'node:test';
import assert from 'node:assert/strict';
import {motionIntervalFor,worldIntervalFor,smoothClockOffset} from '../../src/net/cadence.js';
import {radioCorrection,wrappedDrift} from '../../src/game/radio-playback.js';

test('room pacing reduces relay fanout while preserving movement priority',()=>{
 assert.equal(motionIntervalFor(2),.05);
 assert(motionIntervalFor(8)>motionIntervalFor(2));
 assert(motionIntervalFor(8)<=.085);
 assert(motionIntervalFor(8,26000)>=.125);
 assert.equal(worldIntervalFor(8),.25);
 assert.equal(worldIntervalFor(2),.2);
 // Eight peers emit about 96/second, seven outgoing peers per packet (not 160*7).
 assert((8/motionIntervalFor(8))*7<800);
});

test('clock drift filter ignores latency spikes, invalid samples and converges',()=>{
 assert.equal(smoothClockOffset(0,2000,true),2000);
 assert.equal(smoothClockOffset(0,NaN),0);
 assert(smoothClockOffset(100,2100)>100);
 assert(smoothClockOffset(100,2100)<130);
 let offset=0;for(let i=0;i<80;i++)offset=smoothClockOffset(offset,50);
 assert(Math.abs(offset-50)<1);
});

test('radio keeps continuous playback, softly corrects drift and handles loop wrap',()=>{
 assert(Math.abs(wrappedDrift(.05,9.95,10)-.1)<1e-5);
 assert.equal(radioCorrection(2,.5,10,{starting:true}).seek,2);
 assert.equal(radioCorrection(2,.5,10).seek,null);
 assert(radioCorrection(2,.5,10).rate>1);
 assert(radioCorrection(2,3.5,10).rate<1);
 assert.equal(radioCorrection(2,2,10).rate,1);
 assert.equal(radioCorrection(9,1,20,{secondsSinceSeek:3}).seek,null);
 assert.equal(radioCorrection(9,1,20,{secondsSinceSeek:20}).seek,9);
});
