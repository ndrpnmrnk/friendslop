import {THREE,G,V3,mesh,col,tmat,compose,lam} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {CONFIG} from '../config.js';
import {addSolid,raySolids,isFree} from '../world/physics.js';
import {addItem} from '../game/items.js';
import {daze} from '../game/actors.js';
import {letGo,struggleTap} from '../game/grab.js';
import {eliminate} from '../game/drone.js';
import {bongModel,setBongForm,bongPose,mouthPosition,setBreath,inhaleSmoke,exhaleSmoke,disposeBong} from '../game/bong.js';
import {puff,burst,smokeRing} from '../world/particles.js';
import {sfx} from '../core/sfx.js';
import {littleNPC,ufoModel} from './encounter-models.js';
import {flat,visible,freeSpot,npcBody,walkNPC} from './encounter-motion.js';
import {alienTactics} from './alien-tactics.js';

export function buildCosmo(x,y,z,f){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=Math.atan2(f[0],f[1]);g.name='cosmo-mission';W.group.add(g);
 const prop=bongModel();prop.position.set(0,.22,0);prop.rotation.set(.08,0,1.08);g.add(prop);
 return{g,prop,reach:1.8,pos:()=>g.position,front:()=>g.localToWorld(new V3(0,0,.85)),dispose(){disposeBong(prop);g.removeFromParent();}};
}
export function cosmoGame(o,api,ctx){
 api.feedback();const P=ctx.player,model=bongModel(),aliens=[],shots=[],initial=P.pos.clone(),startYaw=P.root.rotation.y,beamSite=freeSpot(P.pos,3.5,6,8);
 const pickupP=o.prop.getWorldPosition(new V3()),pickupQ=o.prop.getWorldQuaternion(new THREE.Quaternion());model.position.copy(pickupP);model.quaternion.copy(pickupQ);W.group.add(model);o.prop.visible=false;P.missionTool=true;P.stationaryWork=true;P.vel.x=P.vel.z=0;P.push.x=P.push.z=0;
 let phase='pickup',hold=false,fill=0,exhale=0,clock=0,time=CONFIG.encounters.cosmoTime,cd=0,fx=0,stageT=0,dead=false,reward=null,ufo=null,beam=null,immune=0,wasStunned=false,captured=false;
 const front=new V3(Math.sin(startYaw),0,Math.cos(startYaw)),right=new V3(front.z,0,-front.x),look=initial.clone().add(new V3(0,P.ch.d.top*.66,0));
 const cameraPoint=look.clone().addScaledVector(front,1.65).addScaledVector(right,.58).add(new V3(0,.15,0));
 for(const angle of [0,.7,-.7,1.4,-1.4,Math.PI]){const direction=front.clone().applyAxisAngle(new V3(0,1,0),angle),p=look.clone().addScaledVector(direction,1.9).add(new V3(0,.2,0));if(isFree(p.x-.2,p.z-.2,p.x+.2,p.z+.2,p.y-.2,p.y+.2)&&visible(look,p)){cameraPoint.copy(p);break;}}
 const viewDirection=cameraPoint.clone().sub(look).normalize(),cameraHome=ctx.camera.position.clone(),eye=cameraHome.clone(),viewLook=look.clone();if(eye.distanceTo(look)>12){eye.copy(look).addScaledVector(front,-5).y+=1.3;cameraHome.copy(eye);}let returnEye=null,returnLook=null;
 const netModels=W.net?Array.from({length:5},(_,i)=>{const m=littleNPC(i,true);m.root.visible=false;W.group.add(m.root);return m;}):null;
 api.msg('Поднимаешь бонг. Держи ЛКМ - вдох');
 const ease=k=>{k=Math.max(0,Math.min(1,k));return k*k*(3-2*k);};
 function poseModel(){const near=['pickup','inhale','exhale','return'].includes(phase);bongPose(P,model,near);if(phase==='pickup'){const k=ease(stageT/.7);model.position.lerpVectors(pickupP,model.position,k);model.quaternion.slerpQuaternions(pickupQ,model.quaternion.clone(),k);model.updateMatrixWorld(true);for(const[h,x,y]of [[P.ch.handR,.08,-.04],[P.ch.handL,-.09,-.16]])h.position.copy(P.root.worldToLocal(model.localToWorld(new V3(x,y,0))));}}
 function poseCamera(dt){if(ctx.bot)return;const stationary=['pickup','inhale','exhale'].includes(phase);if(stationary){const target=mouthPosition(P),dist=phase==='pickup'?2.1:phase==='inhale'?1.9-fill*.62:1.28+exhale*.20,want=target.clone().addScaledVector(viewDirection,dist).add(new V3(0,.12,0)),k=1-Math.exp(-dt*5);eye.lerp(want,k);viewLook.lerp(target,k);api.pose(eye,viewLook);}else if(phase==='return'){const k=ease(stageT/.9);eye.lerpVectors(returnEye,cameraHome,k);viewLook.lerpVectors(returnLook,initial.clone().add(new V3(0,1.1,0)),k);api.pose(eye,viewLook);}}
 const releaseGrip=()=>{for(const a of aliens)if(a.holding===P){letGo(a);a.holding=null;}if(P.heldBy&&aliens.includes(P.heldBy))P.heldBy=null;};
 function puffOut(){exhaleSmoke(P);}
 const netUfo=W.net?ufoModel():null;let netBeam=null;if(netUfo){netUfo.visible=false;W.group.add(netUfo);const mat=lam({color:0xc5ed98,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide},'ufo34-beam');netBeam=mesh(new THREE.CylinderGeometry(.8,1.25,1,12,1,true),mat,0,0,0,1,6.5,1,W.group);netBeam.visible=false;}
 function arrive(){
  if(!beamSite){api.finish({success:false});return;}
  phase='arrive';stageT=0;P.stationaryWork=false;P.hazeT=CONFIG.encounters.bongEffect;if(!ctx.bot)api.pose(null);ufo=netUfo||ufoModel();ufo.visible=true;ufo.position.copy(beamSite).add(new V3(12,14,-10));W.group.add(ufo);
  const mat=lam({color:0xc5ed98,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide},'ufo34-beam');beam=netBeam||mesh(new THREE.CylinderGeometry(.8,1.25,1,12,1,true),mat,beamSite.x,beamSite.y+3.6,beamSite.z,1,6.5,1,W.group);beam.position.set(beamSite.x,beamSite.y+3.6,beamSite.z);beam.visible=false;
  api.msg('Что это над головой?..');sfx('ufoArrive',{at:P.pos,range:25});
 }
 function spawnAliens(){for(let i=0;i<5;i++){
  let p=null;for(let n=0;n<20&&!p;n++){const q=freeSpot(beamSite,2,4);if(q&&!aliens.some(a=>flat(a.landing,q)<.75))p=q;}if(!p){api.finish({success:false});return false;}
  const m=netModels?netModels[i]:littleNPC(i,true),a=npcBody(m);m.root.visible=true;a.landing=p;a.pos.copy(beamSite).y+=5.8;a.probe.copy(p);a.hp=2;a.cd=1.4+i*.3;a.wind=0;a.holding=null;a.stun=0;a.id=i;a.deployed=false;aliens.push(a);W.group.add(a.root);
 }return true;}
 function shoot(ray){
  if(phase!=='combat'||cd>0||P.heldBy||P.daze>0||P.stun>0||shots.length>=12)return;
  cd=.45;let range=raySolids(ray.ray.origin,ray.ray.direction,35);for(const a of aliens)if(a.hp>0){const hit=ray.ray.intersectSphere(new THREE.Sphere(a.pos.clone().add(new V3(0,.7,0)),.48),new V3());if(hit)range=Math.min(range,hit.distanceTo(ray.ray.origin));}
  const from=model.localToWorld(new V3(0,.08,.56)),body=P.pos.clone().add(new V3(0,P.h*.65,0)),barrel=from.clone().sub(body),length=barrel.length();
  // Ствол у стены не должен создавать снаряд уже по другую сторону препятствия.
  if(length>.01){barrel.multiplyScalar(1/length);const stop=raySolids(body,barrel,length);if(stop<length-.01){const p=body.addScaledVector(barrel,stop);burst(p.x,p.y,p.z,3,{color:0xb5d97c,size:.04,speed:.6,life:.15});sfx('cosmoShot',{at:p,range:17});return;}}
  const aim=ray.ray.at(range,new V3()),v=aim.sub(from).normalize().multiplyScalar(27),g=mesh(G.box,lam({color:0xbdf98d,emissive:0x6cae45},'cosmo34-bolt'),from.x,from.y,from.z,.045,.045,.35,W.group);g.lookAt(from.clone().add(v));shots.push({p:from.clone(),v,g,life:1.5});sfx('cosmoShot',{at:from,range:17});
 }
 function target(){return aliens.filter(a=>a.hp>0).sort((a,b)=>flat(a.pos,P.pos)-flat(b.pos,P.pos))[0];}
 const game={
  equipped:true,get phase(){return phase;},get aliens(){return aliens;},
  get toolName(){return ['pickup','inhale','exhale','return'].includes(phase)?'Космический бонг':'Бластер';},get toolIcon(){return ['pickup','inhale','exhale','return'].includes(phase)?'bong':'cosmo';},get toolAction(){return phase==='inhale'?'держи - вдох':phase==='exhale'?'кликай - выдох':'выстрел · каждому по два попадания';},
  pose(){poseModel();},
  target:()=>phase==='combat'?target()?.pos||beamSite:initial,
  botTarget(){if(phase!=='combat')return P.pos;const a=target();if(!a)return P.pos;const d=flat(P.pos,a.pos);return d<3.2?P.pos.clone().add(new V3((P.pos.x-a.pos.x)*1.4,0,(P.pos.z-a.pos.z)*1.4)):P.pos;},
  down(ray){if(phase==='pickup'||phase==='inhale'){hold=true;return;}if(phase==='exhale'){exhale=Math.min(1,exhale+.105);puffOut();sfx('bongExhale',{at:P.pos,range:12});return;}if(phase==='combat')shoot(ray);},
  up(){hold=false;},struggle(){struggleTap(P);},
  prompt:()=>phase==='combat'?P.heldBy?'<b>WASD / ПРОБЕЛ</b>Вырваться':'<b>ЛКМ</b>Бластер · по два попадания':phase==='inhale'?'<b>ЛКМ</b>Держи - вдох':phase==='exhale'?'<b>ЛКМ</b>Кликай - выдох':'',
  botStep(dt,brain){if(phase==='pickup'||phase==='inhale')hold=true;else if(phase==='exhale'&&brain.ready(.14))this.down();else if(phase==='combat'){const a=target();if(P.heldBy&&brain.ready(.14))struggleTap(P);else if(a&&brain.ready(.65))shoot(brain.rayTo(a.pos.clone().add(new V3(0,.7,0))));}},
  update(dt){
   if(dead)return;clock+=dt;time-=dt;cd-=dt;immune=Math.max(0,immune-dt);api.timer(time);stageT+=dt;
   if(time<=0||P.drone||P.returning){api.finish({success:false});return;}
   const stationary=['pickup','inhale','exhale','return'].includes(phase);
   if(stationary&&(P.heldBy||P.stun>0||P.daze>0||flat(P.pos,initial)>.7)){api.finish({success:false});return;}
   poseModel();poseCamera(dt);setBreath(P,phase==='inhale'?fill:phase==='exhale'?1-exhale:0);
   if(stationary)setBongForm(model,0,phase==='inhale'?fill:phase==='exhale'?1-exhale:0);
   else setBongForm(model,phase==='arrive'?Math.min(1,stageT/1.4):phase==='fold'?Math.max(0,1-stageT/1.2):1);
   if(phase==='pickup'){if(stageT>=.7){phase='inhale';stageT=0;api.msg('Держи ЛКМ - вдох. Щёки и дым показывают наполнение');}return;}
   if(phase==='inhale'){
    fill=Math.max(0,Math.min(1,fill+(hold?dt/3.6:-dt*.1)));api.progress(fill*.15);if(hold){inhaleSmoke(P,model,dt);if((fx-=dt)<=0){fx=.22;sfx('bongBubble',{at:P.pos,range:10});}}if(fill>=1){phase='exhale';hold=false;api.msg('Теперь кликай ЛКМ - выдыхай дым','good');}return;
   }
   if(phase==='exhale'){api.progress(.15+exhale*.15);if(exhale>=1){phase='return';stageT=0;returnEye=eye.clone();returnLook=viewLook.clone();}return;}
   if(phase==='return'){if(stageT>=.9)arrive();return;}
   if(ufo){ufo.rotation.y=clock*.16;const k=phase==='arrive'?ease(stageT/3):1,h=phase==='fold'?6.7+ease(stageT/1.2)*7:6.7+(1-k)*7.3;ufo.position.set(beamSite.x+(1-k)*12,beamSite.y+h+Math.sin(clock*1.5)*.12,beamSite.z-(1-k)*10);ufo.userData.hatch.rotation.x=phase==='arrive'?ease((stageT-1.8)/1.2)*1.3:phase==='fold'?(1-ease(stageT/1.2))*1.3:1.3;beam.visible=['deploy','combat','lift'].includes(phase);beam.scale.y=h-.6;beam.position.y=beamSite.y+(h-.6)/2;}
   if(phase==='arrive'){api.progress(.3+Math.min(1,stageT/3)*.08);if(stageT>=3){phase='deploy';stageT=0;if(!spawnAliens())return;api.msg('НЛО высаживает пятерых пришельцев!');}return;}
   if(phase==='deploy'){for(const a of aliens){const k=ease((stageT-a.id*.23)/1.15),from=beamSite.clone().add(new V3(Math.sin(a.id*2)*.3,5.8,Math.cos(a.id*2)*.3));a.pos.lerpVectors(from,a.landing,k);a.root.rotation.y=Math.atan2(P.pos.x-a.pos.x,P.pos.z-a.pos.z);a.model.animate(clock,0);for(const h of a.model.hands)h.rotation.x=-.4;if(k>=1&&!a.deployed){a.deployed=true;smokeRing(a.pos.x,a.pos.y+.08,a.pos.z,3,{color:0xb0bc96,size:.09,speed:.8,life:.4});}}if(stageT>=2.2){phase='combat';stageT=0;api.msg('Пять пришельцев! ЛКМ - бластер. Каждому по два попадания','good');}return;}
   if(phase==='fold'){
    if(stageT>=1.2){reward=addItem('bong',P.pos.x,P.pos.y+.7,P.pos.z);ctx.give(reward);reward.mission=null;api.msg('Космический бонг твой! Повторное использование - короткий эффект','good');api.finish({success:true,mult:1});}return;
   }
   if(phase==='lift'){
    releaseGrip();P.stationaryWork=true;P.vel.set(0,0,0);P.push.set(0,0,0);P.pos.lerp(new V3(beamSite.x,beamSite.y+Math.min(6,stageT*3),beamSite.z),Math.min(1,dt*8));
    if(stageT>=2){captured=true;api.finish({success:false});eliminate(P,30);}return;
   }
   if(phase!=='combat')return;
   const stunned=P.daze>0||P.stun>0;if(wasStunned&&!stunned){immune=3;releaseGrip();}wasStunned=stunned;
   for(const a of aliens){if(a.hp<=0)continue;a.cd-=dt;a.model.animate(clock,flat(a.pos,P.pos)>1.3?.7:0);
    if(a.holding===P){
     if(P.heldBy!==a||!stunned||!visible(a.pos.clone().add(new V3(0,.8,0)),P.pos.clone().add(new V3(0,.8,0)))||flat(a.pos,P.pos)>1.95){releaseGrip();continue;}
     walkNPC(a,beamSite,1.6,dt);for(const h of a.model.hands)h.rotation.x=-1;
     if(flat(P.pos,beamSite)<1.15){phase='lift';stageT=0;api.msg('НЛО забирает тебя! Дрон на 30 секунд','bad');}continue;
    }
    if(P.hidden)continue;
    if(alienTactics(a,P,shots,clock,dt))continue;
    if(stunned&&flat(a.pos,P.pos)<1.25&&!P.heldBy&&immune<=0){a.holding=P;P.heldBy=a;P.struggle=0;a.gripT=0;api.msg('Тебя тащат к лучу! WASD / Пробел - вырваться','bad');continue;}
    if(a.wind>0){a.wind-=dt;a.model.hands[1].rotation.x=-Math.sin((.45-a.wind)/.45*Math.PI)*1.8;
     if(a.wind<=0&&immune<=0&&flat(a.pos,P.pos)<1.65&&Math.abs(a.pos.y-P.pos.y)<1&&visible(a.pos.clone().add(new V3(0,.85,0)),P.pos.clone().add(new V3(0,.9,0)))){daze(P,2.5);immune=.7;P.push.x+=Math.sin(a.root.rotation.y)*.5;P.push.z+=Math.cos(a.root.rotation.y)*.5;sfx('cosmoBaton',{at:P.pos,range:12});}continue;
    }
    if(flat(a.pos,P.pos)>1.15){const d=flat(a.pos,P.pos),goal=P.pos.clone(),flank=d>2.2?1.5:0,ang=a.id*Math.PI*2/5+Math.sin(clock*.8+a.id)*.7;goal.x+=Math.sin(ang)*flank;goal.z+=Math.cos(ang)*flank;for(const b of aliens)if(b!==a&&b.hp>0){const dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z,l=Math.hypot(dx,dz);if(l<.8&&l>.01){goal.x+=dx/l*(.8-l);goal.z+=dz/l*(.8-l);}}walkNPC(a,goal,(clock+a.id*.4)%2.7<.65?5.1:3.6,dt);}else{a.root.rotation.y=Math.atan2(P.pos.x-a.pos.x,P.pos.z-a.pos.z);if(a.cd<=0&&immune<=0&&!stunned){a.cd=3.2;a.wind=.45;sfx('beep',{at:a.pos,range:9,v:.35});}}
   }
   for(let i=shots.length-1;i>=0;i--){const s=shots[i],old=s.p.clone(),step=s.v.clone().multiplyScalar(dt),len=step.length(),dir=step.clone().normalize(),wall=raySolids(old,dir,len);let hit=null,hitD=Math.min(len,wall);
    for(const a of aliens)if(a.hp>0){const center=a.pos.clone().add(new V3(0,.7,0)),q=center.clone().sub(old),along=q.dot(dir);if(along<-.5||along>hitD+.5)continue;const near=old.clone().addScaledVector(dir,Math.max(0,Math.min(hitD,along)));if(near.distanceTo(center)<.48){const entry=Math.max(0,along-Math.sqrt(Math.max(0,.48*.48-center.distanceToSquared(old.clone().addScaledVector(dir,along)))));if(entry<=hitD){hit=a;hitD=entry;}}}
    s.p.copy(old).addScaledVector(dir,hitD);s.g.position.copy(s.p);s.life-=dt;
    if(hit){hit.hp--;hit.cd=Math.max(hit.cd,1.2);hit.recoil=.25;hit.rush=hit.evade=null;releaseGrip();burst(s.p.x,s.p.y,s.p.z,7,{color:0xb5d97c,size:.08,speed:1.8,life:.35});sfx('cosmoHit',{at:hit.pos,range:16});if(!hit.hp){hit.root.visible=false;smokeRing(hit.pos.x,hit.pos.y+.3,hit.pos.z,7,{color:0xb5b4ca,size:.15,speed:1.6,life:.5});}api.progress(.4+(10-aliens.reduce((n,a)=>n+a.hp,0))*.06);}
    if(hit||wall<len||s.life<=0){s.g.removeFromParent();shots.splice(i,1);}
   }
   if(aliens.length===5&&aliens.every(a=>a.hp<=0)){releaseGrip();phase='fold';stageT=0;api.msg('Чисто! Бластер складывается обратно в бонг','good');}
  },
  stop(){dead=true;releaseGrip();setBreath(P,0);P.stationaryWork=false;P.missionTool=false;P.charging=false;if(!ctx.bot)api.pose(null);disposeBong(model);model.removeFromParent();for(const a of aliens)a.root.removeFromParent();for(const m of netModels||[])m.root.removeFromParent();netUfo?.removeFromParent();netBeam?.removeFromParent();for(const s of shots)s.g.removeFromParent();ufo?.removeFromParent();if(beam){beam.geometry.dispose();beam.removeFromParent();}o.prop.visible=true;if(captured)P.hazeT=0;}
 };return game;
}
