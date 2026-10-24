import {THREE,V3} from '../core/gfx.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {makeCharacter} from '../characters/rig.js';
const templates=new Map(),mat=new THREE.Matrix4();
// Снимок каждого скина один раз. У игрушек пять подвижных частей, а не полный
// игровой риг с симуляцией дыма/льда у каждой из десятков копий.
function template(id){
  if(templates.has(id))return templates.get(id);
  const source=makeCharacter(id);source.animate(.1,{t:0,speed:0});source.root.updateMatrixWorld(true);
  const root=new THREE.Group(),names=['body','handL','handR','footL','footR'];
  for(const name of names){const from=source[name],part=new THREE.Group(),by=new Map(),inverse=from.matrixWorld.clone().invert();part.name=name;part.position.copy(from.position);part.quaternion.copy(from.quaternion);root.add(part);
    from.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;for(let p=o;p&&p!==from.parent;p=p.parent)if(!p.visible)return;
      const base=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(),groups=Array.isArray(o.material)?base.groups:[{start:0,count:base.attributes.position.count,materialIndex:0}];
      for(const group of groups){const g=new THREE.BufferGeometry();for(const key of['position','normal','uv']){const attr=base.attributes[key];if(!attr)continue;g.setAttribute(key,new THREE.BufferAttribute(attr.array.slice(group.start*attr.itemSize,(group.start+group.count)*attr.itemSize),attr.itemSize));}if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));g.applyMatrix4(mat.multiplyMatrices(inverse,o.matrixWorld));const material=Array.isArray(o.material)?o.material[group.materialIndex]:o.material;if(!by.has(material))by.set(material,[]);by.get(material).push(g);}
      base.dispose();
    });
    for(const[material,geos]of by){const merged=mergeGeometries(geos);for(const g of geos)g.dispose();part.add(new THREE.Mesh(merged,material));}
  }
  const value={root,source};templates.set(id,value);return value;
}
export function doll(id,x,y,z){
  const base=template(id),body=base.root.clone(true),g=new THREE.Group();g.add(body);body.scale.setScalar(.27);body.position.y=-.80*.27;
  const parts=Object.fromEntries(body.children.map(p=>[p.name,p])),joints=['handL','handR','footL','footR'].map(name=>({part:parts[name],rest:parts[name].position.clone(),v:new V3(),off:new V3()}));
  const box=new THREE.Box3().setFromObject(body),support=[];for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z])support.push(new V3(x,y,z));
  const colliders=[];for(const part of body.children){const bounds=new THREE.Box3().setFromObject(part),half=bounds.getSize(new V3()).multiplyScalar(.5),center=bounds.getCenter(new V3());half.max(new V3(.025,.025,.025));colliders.push({half,center});}
  g.position.set(x,y,z);g.rotation.set((Math.random()<.5?-1:1)*(1.15+Math.random()*.3),Math.random()*6.28,(Math.random()-.5)*.7);
  const c={...parts,root:body,blob:{visible:false},animate(dt,s){parts.body.rotation.z=Math.sin(s.t*4)*.045;const rest=joints[1].rest;parts.handR.position.copy(rest);parts.handR.rotation.z=s.wave?-1.5+Math.sin(s.t*8)*.2:0;if(s.wave)parts.handR.position.y+=.20+Math.sin(s.t*7)*.025;}};
  return{id,c,g,joints,support,colliders,v:new V3(),previousV:new V3(),av:new V3((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2),r:.235,held:false,dispose(){g.removeFromParent();}};
}
export function batchDolls(root,dolls){
  const by=new Map();for(const d of dolls)d.g.traverse(o=>{if(o.isMesh){const key=o.geometry.uuid+o.material.uuid;if(!by.has(key))by.set(key,[]);by.get(key).push(o);o.visible=false;}});
  const batches=[...by.values()].map(list=>{const m=new THREE.InstancedMesh(list[0].geometry,list[0].material,list.length);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;root.add(m);return{m,list};}),inverse=new THREE.Matrix4(),matrix=new THREE.Matrix4();
  return{update(){root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();for(const{m,list}of batches){for(let i=0;i<list.length;i++)m.setMatrixAt(i,matrix.multiplyMatrices(inverse,list[i].matrixWorld));m.instanceMatrix.needsUpdate=true;}},dispose(){for(const{m}of batches){m.removeFromParent();m.dispose();}},get drawCalls(){return batches.length;}};
}
