import * as C from 'cannon-es';
import {THREE,V3} from '../core/gfx.js';
// Один закрытый физический мир автомата. Контакты и трение решает Cannon;
// уснувшая куча не пересчитывается, пока клешня не потревожит игрушки.
export function toyPhysics(dolls){
 const world=new C.World({gravity:new C.Vec3(0,-9,0),allowSleep:true});world.broadphase=new C.SAPBroadphase(world);world.solver.iterations=14;world.solver.tolerance=.0001;
 const plush=new C.Material('plush'),cabinet=new C.Material('cabinet');world.addContactMaterial(new C.ContactMaterial(plush,plush,{friction:.72,restitution:0,contactEquationStiffness:2e6,contactEquationRelaxation:4}));world.addContactMaterial(new C.ContactMaterial(plush,cabinet,{friction:.8,restitution:0}));
 function wall(x,y,z,hx,hy,hz){const body=new C.Body({mass:0,material:cabinet,shape:new C.Box(new C.Vec3(hx,hy,hz)),position:new C.Vec3(x,y,z)});world.addBody(body);}
 wall(0,.94,0,1.5,.1,1.06);wall(-1.55,1.94,0,.05,.9,1.11);wall(1.55,1.94,0,.05,.9,1.11);wall(0,1.94,-1.11,1.5,.9,.05);wall(0,1.94,1.11,1.5,.9,.05);wall(0,2.84,0,1.5,.05,1.06);
 // v0.56: клешня — настоящие кинематические тела (ладонь и три пальца). Опускаясь, пальцы раздвигают игрушки,
 // а захваченная игрушка висит на шарнире под ладонью и качается; слабый захват (не по центру) соскальзывает.
 const G_TOY=1,G_CLAW=2,G_WALL=4;for(const b of world.bodies){b.collisionFilterGroup=G_WALL;b.collisionFilterMask=G_TOY;}
 const kin=shape=>{const b=new C.Body({mass:0,type:C.Body.KINEMATIC,material:cabinet,shape,position:new C.Vec3(0,3.4,0)});b.collisionFilterGroup=G_CLAW;b.collisionFilterMask=G_TOY;world.addBody(b);return b;};
 const palm=kin(new C.Sphere(.1)),fingers=[0,1,2].map(()=>kin(new C.Box(new C.Vec3(.03,.2,.035))));let joint=null;
 for(const d of dolls){const body=new C.Body({mass:.22,material:plush,linearDamping:.75,angularDamping:.88,allowSleep:true,sleepSpeedLimit:.16,sleepTimeLimit:.35});body.collisionFilterGroup=G_TOY;body.collisionFilterMask=G_TOY|G_CLAW|G_WALL;
  for(const box of d.colliders)body.addShape(new C.Box(new C.Vec3(box.half.x,box.half.y,box.half.z)),new C.Vec3(box.center.x,box.center.y,box.center.z));
  body.position.copy(d.g.position);body.quaternion.copy(d.g.quaternion);world.addBody(body);d.physics=body;
 }
 // Укладываем до первого показа. Повторный вход не пересоздаёт и не встряхивает кучу.
 for(let i=0;i<300;i++)world.step(1/60);
 function sync(){for(const d of dolls)if(!d.held&&d.physics.world){d.g.position.copy(d.physics.position);d.g.quaternion.copy(d.physics.quaternion);d.v.copy(d.physics.velocity);}}
 sync();for(const d of dolls)d.physics.sleep();let moving=false,quiet=0;
 const inverse=new THREE.Quaternion(),gravity=new V3(),accel=new V3();
 const drive=(b,x,y,z,dt,q=null)=>{const k=1/Math.max(dt,1/120);b.velocity.set((x-b.position.x)*k,(y-b.position.y)*k,(z-b.position.z)*k);if(q)b.quaternion.copy(q);if(Math.abs(x-b.position.x)+Math.abs(y-b.position.y)+Math.abs(z-b.position.z)>.6){b.position.set(x,y,z);b.velocity.set(0,0,0);}};
 const fq=new THREE.Quaternion(),cq=new C.Quaternion();
 return{
  // положение клешни (в координатах автомата): центр каретки, радиус раскрытия пальцев, длина пальцев
  claw(pos,radius,depth,dt,on=true){if(!on){for(const b of[palm,...fingers])drive(b,0,3.4,0,dt);return;}
   drive(palm,pos.x,pos.y-.16,pos.z,dt);
   fingers.forEach((b,i)=>{const a=i*Math.PI*2/3;fq.setFromAxisAngle(new V3(0,1,0),a);cq.set(fq.x,fq.y,fq.z,fq.w);drive(b,pos.x+Math.cos(a)*radius,pos.y-.16-depth*.5,pos.z-Math.sin(a)*radius,dt,cq);});
   /* v0.59: будим игрушки, только когда клешня опустилась к куче и правда может их задеть (раньше будила, проезжая сверху, — куча начинала дрожать) */
   if(pos.y<2.25&&Math.hypot(palm.velocity.x,palm.velocity.y,palm.velocity.z)>.02){moving=true;quiet=0;for(const d of dolls)if(Math.hypot(d.g.position.x-pos.x,d.g.position.z-pos.z)<radius+.35&&d.g.position.y>pos.y-1.1)d.physics.wakeUp();}},
  // захват: шарнир между ладонью и точкой на игрушке; держит, пока не отпустим или не соскользнёт
  grab(toy,localPivot){this.drop();toy.physics.collisionFilterMask=G_TOY|G_WALL;toy.physics.wakeUp();joint=new C.PointToPointConstraint(palm,new C.Vec3(0,-.08,0),toy.physics,new C.Vec3(localPivot.x,localPivot.y,localPivot.z),12);world.addConstraint(joint);joint.toy=toy;moving=true;quiet=0;},
  drop(){if(!joint)return;world.removeConstraint(joint);joint.toy.physics.collisionFilterMask=G_TOY|G_CLAW|G_WALL;joint.toy.physics.wakeUp();joint=null;moving=true;quiet=0;},
  get holding(){return joint?.toy||null;},
  // v0.58: игрушку в клешне ведём сами (без шарнира): тело убираем из мира, соседи мягко оседают в образовавшуюся ямку
  take(toy){moving=true;quiet=0;for(const d of dolls)if(d!==toy&&d.g.position.y>toy.g.position.y-.05&&Math.hypot(d.g.position.x-toy.g.position.x,d.g.position.z-toy.g.position.z)<.45)d.physics.wakeUp();/* будим только тех, кто лежал на пойманной */if(toy.physics.world)world.removeBody(toy.physics);toy.held=true;moving=true;quiet=0;},
  // пальцы перестают толкать игрушки, пока сжимаются (раньше разбрасывали соседей)
  ghost(on){for(const b of fingers)b.collisionFilterMask=on?0:G_TOY;palm.collisionFilterMask=on?0:G_TOY;},
  wake(toy){moving=true;quiet=0;for(const d of dolls)if(d.g.position.distanceTo(toy.g.position)<.9)d.physics.wakeUp();},
  hold(toy){this.wake(toy);toy.physics.type=C.Body.KINEMATIC;toy.physics.mass=0;toy.physics.updateMassProperties();},
  remove(toy){if(toy.physics.world)world.removeBody(toy.physics);},
  update(dt){
   for(const d of dolls)if(d.held&&d.physics.world){d.physics.position.copy(d.g.position);d.physics.quaternion.copy(d.g.quaternion);d.physics.velocity.copy(d.v);d.physics.aabbNeedsUpdate=true;}
   if(moving||joint){world.step(1/60,Math.min(.05,dt),3);sync();quiet+=dt;if(!joint&&(quiet>2.5||dolls.every(d=>d.held||d.physics.sleepState===C.Body.SLEEPING))){for(const d of dolls)if(!d.held)d.physics.sleep();moving=false;}}
   for(const d of dolls){if(!d.physics.world||!d.held&&d.physics.sleepState===C.Body.SLEEPING)continue;
    inverse.copy(d.g.quaternion).invert();accel.copy(d.v).sub(d.previousV).multiplyScalar(-1/Math.max(dt,.001)).clampLength(0,12);gravity.set(0,-4,0).add(accel).applyQuaternion(inverse);d.previousV.copy(d.v);
    for(const j of d.joints){j.v.addScaledVector(j.off,-dt*95).addScaledVector(j.v,-dt*15).addScaledVector(gravity,dt*.11);j.off.addScaledVector(j.v,dt).clampLength(0,.11);j.part.position.copy(j.rest).add(j.off);j.part.rotation.set(j.off.z,0,j.off.x*1.5);}
   }
  },
  get moving(){return moving;},
  dispose(){for(const b of [...world.bodies])world.removeBody(b);}
 };
}
