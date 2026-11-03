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
// v0.71: в новом хабе-ярмарке баскетбольного кольца нет; проверяем, что модуль кольца по-прежнему строит всё от одного корня
test('hoop module derives scoring and collisions from one root transform',()=>{
 assert.match(hoop,/const center=root\.localToWorld/);
 assert.match(hoop,/\bpole=root\.localToWorld/);
 assert.match(hoop,/const boardCenter=root\.localToWorld/);
});
