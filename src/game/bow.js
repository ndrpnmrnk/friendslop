import {THREE,G,V3,mesh,col,tmat} from '../core/gfx.js';
import {T} from '../core/textures.js';
// Дуга с геометрическим изгибом, настоящая тетива и стрела. Колчан принадлежит предмету.
export function arrowModel(){const g=new THREE.Group();mesh(G.cyl5,tmat(T.wood()),0,0,0,.012,.72,.012,g).rotation.x=Math.PI/2;mesh(G.cone4,tmat(T.metal()),0,0,.4,.045,.14,.045,g).rotation.x=Math.PI/2;for(const a of [0,Math.PI/2])mesh(G.box,col(0xe9dfb8),0,0,-.28,.09,.012,.14,g).rotation.z=a;return g;}
export function bowModel(){const g=new THREE.Group(),arms=[];for(const sign of [-1,1]){const arm=new THREE.Group();g.add(arm);for(let i=0;i<5;i++){const y=sign*(i+.5)*.12,z=(i/5)**2*.19;const m=mesh(G.cyl6,tmat(T.wood()),0,y,z,.028,.135,.028,arm);m.rotation.x=sign*i*.08;}arms.push(arm);}mesh(G.cyl6,tmat(T.cloth(0x6a4438)),0,0,0,.043,.19,.043,g);
 const geo=new THREE.BufferGeometry().setFromPoints([new V3(0,-.63,.19),new V3(),new V3(0,.63,.19)]),string=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xe9dfc8}));g.add(string);const arrow=arrowModel();g.add(arrow);g.userData.bow={arms,string,arrow};return g;}
export function poseBow(a,it,dt){
 const ch=a.ch;if(!ch)return;const model=it.g.userData.bow;if(!model)return;
 if(!it.quiver){const q=new THREE.Group();mesh(G.cyl8,tmat(T.cloth(0x69493c)),0,0,0,.14,.58,.14,q);const arrows=Array.from({length:8},(_,i)=>{const ar=arrowModel();ar.position.set((i%3-1)*.065,.30+(i%2)*.06,(Math.floor(i/3)-1)*.06);ar.rotation.x=-Math.PI/2;q.add(ar);return ar;});it.quiver=q;it.quiverArrows=arrows;a.root.add(q);q.position.set(.26,.98,-.26);q.rotation.z=-.28;}
 if(it.quiver.parent!==a.root)a.root.add(it.quiver);it.quiver.visible=!a.drone&&!a.returning;it.quiver.scale.setScalar(Math.min(1,(it.equipT=(it.equipT||0)+dt)*5));const nocked=it.ammo>0&&(it.cd||0)<.25&&it.equipT>.65;it.quiverArrows.forEach((q,i)=>q.visible=i<it.ammo-(nocked?1:0));
 const draw=it.draw||0,reload=Math.max(0,it.cd||0),f=a.root.rotation.y;
 ch.handL.position.set(-.26,1.0,.62);ch.handR.position.set(.12,1.0,.58-draw*.48);
 if(reload>.25){const k=Math.sin(Math.min(1,reload/1.0)*Math.PI);ch.handR.position.set(.22,.99+k*.62,.5-k*.84);}
 const point=a.root.localToWorld(new V3(-.26,1,.62));it.pos.copy(point);it.g.position.copy(point);it.g.rotation.set(0,f,0);
 for(let i=0;i<2;i++)model.arms[i].rotation.x=(i?-1:1)*draw*.18;
 const attr=model.string.geometry.attributes.position;attr.setXYZ(1,0,0,-draw*.48);attr.needsUpdate=true;model.arrow.visible=nocked;model.arrow.position.z=-draw*.48;
}
