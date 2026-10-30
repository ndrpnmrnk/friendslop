import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {SKATE_LAYOUT as L,rentalRideClear} from '../../src/world/skate-layout.js';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
test('deep bowl is ONE continuous rendered height field, same as physical ground',()=>{
 const scene=read('src/world/districts/skatepark.js'),physics=read('src/world/physics.js');
 assert(scene.includes('bowlHeight(rad,L.bowl)'));
 assert(scene.includes('new THREE.BufferGeometry()'));
 assert(scene.includes('geo.computeVertexNormals()'));
 assert(scene.includes('holes:[[L.bowl.x-L.bowl.patchHalf'));
 assert(scene.includes('j===rings+1?patchHalf/Math.max'));
 assert(!scene.includes('b.ground(1.6,1.6,42.4,42.4,T.concrete(),4)'));
 assert(read('src/world/world.js').includes('for (const h of holes) W.holes.push'));
 assert(scene.includes('W.skateBowl={...L.bowl'));
 assert(!scene.includes('b.quarterPipe(x,z-inner'),'no four disconnected segments');
 assert(physics.includes('bowlGround(W.skateBowl,x,z,maxY)'));
 assert(physics.includes('moveBowlBoard(b,dt,W.skateBowl)'));
 assert(physics.includes('(b.bowlBank || 0)'));
 assert(read('src/game/ride.js').includes('(b.bowlBank || 0)'));
});
test('halfpipe and small wedges remain rideable, but wedge back and sides are closed',()=>{
 const scene=read('src/world/districts/skatepark.js');
 const ramps=read('src/world/more.js');
 assert(scene.includes('b.quarterPipe(h.x,h.front'));
 assert(scene.includes('b.quarterPipe(h.x,h.back'));
 assert(scene.includes('closedWedge(b,36'));
 assert(scene.includes('closedWedge(b,8.2'));
 assert(scene.includes('new THREE.ShapeGeometry(shape)'));
 assert(scene.includes('cap.scale.set(w,h,.11)'));
 assert(ramps.includes('this.solid(x + fx * uc'),'halfpipe slopes have real collision');
});
test('rental is a walk-in building with glass fronts and doors that slide aside',()=>{
 const s=read('src/world/districts/skatepark.js');
 assert(s.includes('const paneW=(w-doorWidth)/2'));
 assert(s.includes('transparent:true,opacity:.38'));
 assert(s.includes('W.animated.push(dt=>'));
 assert(s.includes('breakBox(startX,doorY,doorZ,doorW,2.45'));
 assert(s.includes('piece.dynamic=true'));
 assert(s.includes('moveSolid(piece.solid'));
 assert(s.includes('piece.solid.on=open<.38'));
 assert(s.includes('breakBox(b.X(px),b.Y,b.Z(front)'));
 assert(!s.includes('const dash=b.m(G.box,col(0xc78a58)'));
 assert(!s.includes('b.box(x,front+.50,w+.2,.92,.13,mt'));
 assert(read('src/world/breakables.js').includes('p.dynamic'));
 assert(!s.includes('b.box(x,z,w,d,2.65,brick)'),'must not recreate full solid kiosk');
 assert(!s.includes("'СКЕЙТЫ · САМОКАТЫ'"));
 assert(!s.includes("b.marking(ride.x"),'no parking stripes');
 assert(s.includes('b.ride(ride.kind,ride.x,ride.z,ride.ry)'));
 const net=read('src/net/world-sync.js');
 assert(net.includes("type==='p'"),'rental pushables remain synced');
});
test('tricks use existing capped score hook with no periodic currency exploit',()=>{
 const scene=read('src/world/districts/skatepark.js');
 assert(scene.includes('W.onTrick(a,'));
 assert(scene.includes('now-r.last>9'));
 assert(scene.includes("['skate','scooter']"));
 assert(!/\b(?:SC\.award|bonus\(|addCoins\()/.test(scene));
});
test('bots keep mission priority and reset across districts',()=>{
 const ai=read('src/world/skate-bots.js'),bots=read('src/game/bots.js');
 assert(ai.includes('actor.work')&&ai.includes('board.rider!==actor'));
 assert(bots.includes('W.skateAI?.tick(b,dt,t)')&&bots.includes('W.skateAI?.goal(b)'));
 assert(read('src/world/state.js').includes('W.skateBowl=null'));
 assert(L.missionFloor[0]<L.spawn[0]&&L.missionFloor[2]>L.spawn[0]);
});

test('studio actually constructs the entire bowl mesh without undefined geometry parameters',async()=>{
 const scene=read('src/world/districts/skatepark.js');
 const from=scene.indexOf('function deepBowl(b){');
 const to=scene.indexOf('\nfunction halfpipe(b){',from);
 assert(from>=0&&to>from,'bowl builder function missing');
 // Execute the real extracted builder with stand-in rendering objects.
 // A source string check alone missed the outerRadius ReferenceError in v0.61.5.
 const build=scene.slice(from,to);
 const meshes=[];
 class FakeMesh{
  constructor(geometry,material){this.geometry=geometry;this.material=material;this.rotation={};this.position={};}
 }
 const THREE={
  DoubleSide:2,
  BufferGeometry:class{
   setAttribute(k,v){this[k]=v;}
   setIndex(v){this.indices=v;}
   computeVertexNormals(){this.normalsComputed=true;}
  },
  Float32BufferAttribute:class{constructor(data,components){this.data=data;this.components=components;}},
  Mesh:FakeMesh,TorusGeometry:class{constructor(){}}
 };
 const W={skateBowl:null};
 const b={prop(){return {add(m){meshes.push(m);}}},X:v=>v,Z:v=>v,Y:0};
 const {bowlHeight}=await import('../../src/world/skate-bowl.js');
 const env={THREE,G:{},b,W,L,bowlHeight,metal:()=>({}),lam:()=>({}),T:{concrete:()=>({})}};
 assert.doesNotThrow(()=>runInNewContext(build+'\ndeepBowl(b);',env,{timeout:3000}));
 assert.equal(meshes.length,2,'one bowl and one coping ring expected');
 assert(meshes[0].geometry.normalsComputed);
 assert.equal(meshes[0].geometry.position.data.length,(64+2)*(80+1)*3);
 assert.equal(W.skateBowl.outerRadius,L.bowl.outerRadius);
});

test('airtime is integrated under gravity and not snapped to the next ground surface',()=>{
 const physics=read('src/world/physics.js');
 const start=physics.indexOf('if (b.air || b.y > gy + 0.02)');
 const end=physics.indexOf("if(b.kind==='crate')",start);
 assert(start>0&&end>start);
 const air=physics.slice(start,end);
 assert(air.includes('const nextY=previousY+b.vy*dt'));
 assert(air.includes('b.vy<=0&&nextY<=gy'),'landing only while falling');
 assert(air.includes('b.y=nextY;b.air=true'),'while rising we must stay airborne');
 assert(air.includes('constrainBowlWheel(')||physics.includes('constrainBowlWheel(W.skateBowl,b,dt)'));
 assert(!air.includes('rise / dt * 0.85'),'surface cannot inject upward velocity on ground');
 const walk=physics.slice(physics.indexOf('export function moveBody'),physics.indexOf('/* Зоны:'));
 assert(walk.includes('constrainBowlWalker(W.skateBowl'));
});

test('no floating labels, and halfpipe has closed metal-reinforced structure',()=>{
 const scene=read('src/world/districts/skatepark.js');
 const ramp=read('src/world/more.js');
 assert(!scene.includes("'ХАФПАЙП'"));
 assert(!scene.includes("'SKATE PARK'"));
 assert(scene.includes('const first=b.quarterPipe('));
 assert(scene.includes('b.box(h.x,back,h.width,.15,first'));
 assert(scene.includes('b.grindRail(15.9,4.6'));
 assert(ramp.includes('N = 20, U = R * 0.78'));
});
test('skate rental has mounted fascia, recognizable gear displays and central lightweight light',()=>{
 const scene=read('src/world/districts/skatepark.js');
 assert(scene.includes("b.sign(x,3.06,front+.20"));
 assert(scene.includes('b.light(x,z,2.3,.035,true)'));
 assert(scene.includes('skateShopBulb'));
 assert(scene.includes('const counterZ=back+1.05'));
 assert(scene.includes('Helmet hooks'));
 assert(!scene.includes('const shelfX=x+sx*'));
 assert(scene.includes('breakBox(startX,doorY'));
});
test('grounded riders and walkers do not alternate ground-air each downhill frame',()=>{
 const code=read('src/world/physics.js');
 assert(code.includes('const walkFollow='));
 assert(code.includes('const bowlContactNow='));
 assert(code.includes('Math.abs(b.y-gy)<.45){b.y=gy;b.vy=0;}'));
 assert(code.includes('if (b.air || b.y > gy + 0.02)'));
});

test('studio can build detailed halfpipe and entire rental interior without missing runtime symbols',()=>{
 const scene=read('src/world/districts/skatepark.js');
 const h0=scene.indexOf('function halfpipe(b){'),h1=scene.indexOf('function closedWedge(',h0);
 const r0=scene.indexOf('function rental(b){'),r1=scene.indexOf('function skateRideBonus(',r0);
 assert(h0>=0&&h1>h0&&r0>h1&&r1>r0);
 const counts={ride:0,rail:0,light:0,box:0,sign:0,glass:0};
 const obj=()=>({rotation:{},position:{},userData:{},scale:{}});
 const W={keep:[],animated:[]};
 const b={
  Y:0,X:x=>x,Z:z=>z,
  ground:()=>obj(),m:()=>obj(),box:()=>{counts.box++;return obj();},
  sign:()=>{counts.sign++;},light:()=>{counts.light++;},
  quarterPipe:()=>.88,grindRail:()=>{counts.rail++;},
  ride:()=>{counts.ride++;return{};}
 };
 const T=new Proxy({},{get(){return()=>({});}});
 const env={b,W,L,G:{box:'box',cyl8:'cyl8',sph10:'sph10'},
  THREE:{DoubleSide:2},T,
  col:()=>({}),tmat:()=>({}),lam:()=>({}),metal:()=>({}),
  localActors:()=>[],rentalRideClear,
  breakBox:()=>{counts.glass++;return{alive:true,mesh:obj(),solid:{on:true}};},
  moveSolid:()=>{}
 };
 // Execute the real scene functions, not a string grep. Previous map-loading
 // crash was a missing variable in a function never called by unit tests.
 assert.doesNotThrow(()=>runInNewContext(
   scene.slice(h0,h1)+'\n'+scene.slice(r0,r1)+'\nhalfpipe(b);rental(b);W.animated[0](.016);',
   env,{timeout:3000}));
 assert.equal(counts.ride,5);assert(counts.rail>=2);
 assert.equal(counts.light,1);assert.equal(counts.sign,1);
 assert(counts.glass>=4);assert(counts.box>=15);
});
