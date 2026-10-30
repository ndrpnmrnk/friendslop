import test from 'node:test';
import assert from 'node:assert/strict';
import {mountedVisualPose,alignMountedVisual,alignBikePedals} from '../../src/net/rider-visual.js';
const actor=()=>{
 const a={root:{position:{x:5,y:0,z:4,set(x,y,z){Object.assign(this,{x,y,z});}},rotation:{y:0}}};
 a.ride={x:100,y:0,z:200,ride:{seat:1.4},rider:a,meshOffsetY:.1,mesh:{position:{x:11,y:.6,z:22},rotation:{y:1.2}}};
 return a;
};
test('rider stays visually seated on the interpolated vehicle, not the stale actor packet',()=>{
 const a=actor(),o=mountedVisualPose(a);
 assert.deepEqual(o,{x:11,y:1.9,z:22,yaw:1.2});
 assert(alignMountedVisual(a));assert.equal(a.root.position.x,11);assert.equal(a.root.position.y,1.9);
 a.ride.mesh.position.x=11.75;alignMountedVisual(a);assert.equal(a.root.position.x,11.75);
});
test('missing/removed vehicle references never throw or warp actors',()=>{
 const a=actor();a.ride.dead=true;
 assert.equal(alignMountedVisual(a),false);assert.equal(a.root.position.x,5);
 a.ride.dead=false;a.ride.rider={};assert.equal(alignMountedVisual(a),false);
 a.ride.rider=a;delete a.ride.mesh;assert.equal(alignMountedVisual(a),false);
 a.ride=null;assert.equal(alignMountedVisual(a),false);
});
test('ride mapping does not alter simulated vehicle state',()=>{
 const a=actor();const old={...a.ride.mesh.position};alignMountedVisual(a);
 assert.deepEqual(a.ride.mesh.position,old);assert.equal(a.ride.x,100);
});

test('remote bicycle pedals use the same transmitted crank phase as both rider feet',()=>{
 const a=actor();a.ride.kind='bike';const pedals={rotation:{x:0}};
 a.ride.mesh.children=[{userData:{vehicle:{pedals}}}];
 alignBikePedals(a,{cyclePhase:Math.PI/3});assert(Math.abs(pedals.rotation.x-Math.PI/3)<1e-10);
 alignBikePedals(a,{cyclePhase:Math.PI});assert(Math.abs(pedals.rotation.x-Math.PI)<1e-10);
 alignBikePedals(a,{cyclePhase:NaN});assert.equal(pedals.rotation.x,Math.PI);
 a.ride.rider={};alignBikePedals(a,{cyclePhase:2});assert.equal(pedals.rotation.x,Math.PI);
});
