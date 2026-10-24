import {THREE,G,V3,ps1} from '../core/gfx.js';
import {W} from '../world/state.js';
// Высокий мультяшный гриб дыма: 48 клубов одной отрисовкой, независимо от числа обломков.
export function demolitionBurst(center){
 const world=W,group=new THREE.Group();group.name='demolition-burst';group.position.copy(center);world.group.add(group);
 const smokeMat=ps1(new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:.92,depthWrite:false,flatShading:true})),cloud=new THREE.InstancedMesh(G.ico,smokeMat,48),fireMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1,depthWrite:false}),fire=new THREE.InstancedMesh(G.ico,fireMat,12);cloud.frustumCulled=fire.frustumCulled=false;group.add(cloud,fire);cloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fire.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const ringGeo=new THREE.RingGeometry(.90,1,48),ringMat=new THREE.MeshBasicMaterial({color:0xffd09b,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}),ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=.15;group.add(ring);
 for(let i=0;i<48;i++)cloud.setColorAt(i,new THREE.Color([0x71646c,0x938575,0x5b5866,0xa69a86][i%4]));for(let i=0;i<12;i++)fire.setColorAt(i,new THREE.Color(i%3?0xff9e46:0xffd57c));
 const resources=[smokeMat,fireMat,ringMat,ringGeo,cloud,fire];resources.forEach(r=>world.mapResources.add(r));const pose=new THREE.Object3D();let age=0,clock=0,disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;group.removeFromParent();world.animated=world.animated.filter(f=>f!==tick);for(const r of resources){r.dispose();world.mapResources.delete(r);}};
 const tick=dt=>{if(disposed)return;dt=Math.min(.05,dt);age+=dt;clock+=dt;if(age>5.8){dispose();return;}if(clock<1/30)return;clock=0;const rise=THREE.MathUtils.smoothstep(age,0,1.15),fade=THREE.MathUtils.clamp((5.8-age)/2.5,0,1);smokeMat.opacity=.87*fade;
  for(let i=0;i<48;i++){const stem=i<16,a=i*2.39996;if(stem){const y=i*.64,r=.34+(i%3)*.20;pose.position.set(Math.cos(a)*r*(1+age*.12),.6+y*rise+age*.38,Math.sin(a)*r);pose.scale.setScalar((.65+i*.045+age*.35)*Math.min(1,age*6));}
   else{const layer=Math.floor((i-16)/16),r=(3.0+(i%4)*.55)*(1+age*.16)*rise;pose.position.set(Math.cos(a)*r,9.3*rise+layer*1.75+Math.sin(a*3)*.65+age*.48,Math.sin(a)*r*.78);pose.scale.set(1.8+age*.48,1.25+age*.35,1.6+age*.42);}
   pose.rotation.set(i*.17+age*.07,i*.6,age*.05);pose.updateMatrix();cloud.setMatrixAt(i,pose.matrix);
  }cloud.instanceMatrix.needsUpdate=true;
  fire.visible=age<1.25;fireMat.opacity=THREE.MathUtils.clamp(1-age/1.25,0,1);if(fire.visible)for(let i=0;i<12;i++){const a=i*2.4;pose.position.set(Math.cos(a)*(1+age*6),1+age*(2+i%3),Math.sin(a)*(1+age*4));pose.rotation.set(i,age*3,0);pose.scale.setScalar((1.4+age*2.1)*(1-age/1.3));pose.updateMatrix();fire.setMatrixAt(i,pose.matrix);}fire.instanceMatrix.needsUpdate=true;
  ring.visible=age<1.5;ring.scale.setScalar(1+age*24);ringMat.opacity=Math.max(0,.65-age*.44);
 };world.animated.push(tick);tick(.04);return{group,cloud,fire,dispose};
}
