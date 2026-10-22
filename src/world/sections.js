import {THREE} from '../core/gfx.js';
import {W} from './state.js';
import {bakeStatic} from './bake.js';
const ZERO=new THREE.Matrix4().makeScale(0,0,0);
// У разрушаемого здания свой запечённый раздел: десятки деталей не становятся отдельными draw calls.
export function beginSection(){return{children:new Set(W.group.children),solids:W.solids.length,doors:W.doors.length,ladders:W.ladders.length,breakables:W.breakables.length,buildings:W.buildings.length};}
export function endSection(s){const g=new THREE.Group();g.name='building-section';W.group.add(g);const movable=new Set([...W.items.map(i=>i.g),...W.pushables.map(i=>i.mesh)]);for(const o of W.group.children.slice())if(o!==g&&!s.children.has(o)&&!movable.has(o))g.attach(o);bakeStatic(g,true);W.keep.push(g);return{g,solids:W.solids.slice(s.solids),doors:W.doors.slice(s.doors),ladders:W.ladders.slice(s.ladders),breakables:W.breakables.slice(s.breakables),guides:W.buildings.slice(s.buildings)};}
export function destroySection(s){s.g.removeFromParent();for(const q of s.solids)q.on=false;for(const p of s.breakables){p.alive=false;p.solid.on=false;p.mesh.removeFromParent();for(const q of p.inst||[]){q.im.setMatrixAt(q.i,ZERO);q.im.instanceMatrix.needsUpdate=true;}}W.doors=W.doors.filter(q=>!s.doors.includes(q));W.ladders=W.ladders.filter(q=>!s.ladders.includes(q));for(const g of s.guides)g.destroyed=true;W.buildings=W.buildings.filter(q=>!s.guides.includes(q));}
