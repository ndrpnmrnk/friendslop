import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const hub=read('src/ui/hub-world.js');
const lamps=read('src/world/props.js');
const lighting=read('src/world/scene-lighting.js');
const hoop=read('src/world/basketball.js');

test('all hub lamp instances explicitly disable volumetric light shafts',()=>{
 const calls=[...hub.matchAll(/\bb\.lamp\(([^;]*)\);/g)].map(m=>m[1]);
 assert.equal(calls.length,1,'hub should use the guarded loop for all lamps');
 assert.equal(calls[0],'x,z,ry,false','new lamps must not recreate the hovering columns');
 assert.match(lamps,/const cone=null/);
 assert(!lamps.includes('cone = new THREE.Mesh(LAMP_CONE'),'light shafts must be absent in every district');
 assert.match(lighting,/if\(!l\.cone\)continue/,'light updater must skip absent cones');
});
test('hoop faces the paved central pathway away from the western building',()=>{
 const match=hub.match(/buildHoop\(b,(-?[\d.]+),(-?[\d.]+),(-?Math\.PI\/2)\)/);
 assert(match,'hub hoop angle should be explicit');
 assert.equal(+match[1],-17.5);
 assert.equal(+match[2],20.5);
 const angle=match[3]==='-Math.PI/2'?-Math.PI/2:Math.PI/2;
 // The hoop ring sits on local -Z, so this angle points toward hub +X.
 const forward={x:-Math.sin(angle),z:-Math.cos(angle)};
 assert(forward.x>.99);
 assert(Math.abs(forward.z)<1e-10);
 // Scoring and collisions derive from the same root transform.
 assert.match(hoop,/const center=root\.localToWorld/);
 assert.match(hoop,/\bpole=root\.localToWorld/);
 assert.match(hoop,/const boardCenter=root\.localToWorld/);
});
