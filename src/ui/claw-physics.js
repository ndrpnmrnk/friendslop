import * as C from 'cannon-es';
import {THREE,V3} from '../core/gfx.js';
// Один закрытый физический мир автомата. Контакты и трение решает Cannon;
// уснувшая куча не пересчитывается, пока клешня не потревожит игрушки.
export function toyPhysics(dolls){
 const world=new C.World({gravity:new C.Vec3(0,-9,0),allowSleep:true});world.broadphase=new C.SAPBroadphase(world);world.solver.iterations=14;world.solver.tolerance=.0001;
 const plush=new C.Material('plush'),cabinet=new C.Material('cabinet');world.addContactMaterial(new C.ContactMaterial(plush,plush,{friction:.72,restitution:0,contactEquationStiffness:2e6,contactEquationRelaxation:4}));world.addContactMaterial(new C.ContactMaterial(plush,cabinet,{friction:.8,restitution:0}));
 function wall(x,y,z,hx,hy,hz){const body=new C.Body({mass:0,material:cabinet,shape:new C.Box(new C.Vec3(hx,hy,hz)),position:new C.Vec3(x,y,z)});world.addBody(body);}
 wall(0,.94,0,1.5,.1,1.06);wall(-1.55,1.94,0,.05,.9,1.11);wall(1.55,1.94,0,.05,.9,1.11);wall(0,1.94,-1.11,1.5,.9,.05);wall(0,1.94,1.11,1.5,.9,.05);wall(0,2.84,0,1.5,.05,1.06);
 for(const d of dolls){const body=new C.Body({mass:.22,material:plush,linearDamping:.6,angularDamping:.72,allowSleep:true,sleepSpeedLimit:.09,sleepTimeLimit:.5});
  for(const box of d.colliders)body.addShape(new C.Box(new C.Vec3(box.half.x,box.half.y,box.half.z)),new C.Vec3(box.center.x,box.center.y,box.center.z));
  body.position.copy(d.g.position);body.quaternion.copy(d.g.quaternion);world.addBody(body);d.physics=body;
 }
 // Укладываем до первого показа. Повторный вход не пересоздаёт и не встряхивает кучу.
 for(let i=0;i<300;i++)world.step(1/60);
 function sync(){for(const d of dolls)if(!d.held&&d.physics.world){d.g.position.copy(d.physics.position);d.g.quaternion.copy(d.physics.quaternion);d.v.copy(d.physics.velocity);}}
 sync();for(const d of dolls)d.physics.sleep();let moving=false,quiet=0;
 const inverse=new THREE.Quaternion(),gravity=new V3(),accel=new V3();
 return{
  wake(toy){moving=true;quiet=0;for(const d of dolls)if(d.g.position.distanceTo(toy.g.position)<.9)d.physics.wakeUp();},
  hold(toy){this.wake(toy);toy.physics.type=C.Body.KINEMATIC;toy.physics.mass=0;toy.physics.updateMassProperties();},
  remove(toy){if(toy.physics.world)world.removeBody(toy.physics);},
  update(dt){
   for(const d of dolls)if(d.held&&d.physics.world){d.physics.position.copy(d.g.position);d.physics.quaternion.copy(d.g.quaternion);d.physics.velocity.copy(d.v);d.physics.aabbNeedsUpdate=true;}
   if(moving){world.step(1/60,Math.min(.05,dt),3);sync();quiet+=dt;if(quiet>5||dolls.every(d=>d.held||d.physics.sleepState===C.Body.SLEEPING)){for(const d of dolls)if(!d.held)d.physics.sleep();moving=false;}}
   for(const d of dolls){if(!d.physics.world||!d.held&&d.physics.sleepState===C.Body.SLEEPING)continue;
    inverse.copy(d.g.quaternion).invert();accel.copy(d.v).sub(d.previousV).multiplyScalar(-1/Math.max(dt,.001)).clampLength(0,12);gravity.set(0,-4,0).add(accel).applyQuaternion(inverse);d.previousV.copy(d.v);
    for(const j of d.joints){j.v.addScaledVector(j.off,-dt*95).addScaledVector(j.v,-dt*15).addScaledVector(gravity,dt*.11);j.off.addScaledVector(j.v,dt).clampLength(0,.11);j.part.position.copy(j.rest).add(j.off);j.part.rotation.set(j.off.z,0,j.off.x*1.5);}
   }
  },
  get moving(){return moving;},
  dispose(){for(const b of [...world.bodies])world.removeBody(b);}
 };
}
