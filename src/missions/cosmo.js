import {THREE,G,V3,mesh,col,tmat,compose,lam} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {CONFIG} from '../config.js';
import {addSolid,raySolids,isFree} from '../world/physics.js';
import {addItem} from '../game/items.js';
import {daze} from '../game/actors.js';
import {letGo,struggleTap} from '../game/grab.js';
import {eliminate} from '../game/drone.js';
import {bongModel,setBongForm,bongPose} from '../game/bong.js';
import {puff,burst,smokeRing} from '../world/particles.js';
import {sfx} from '../core/sfx.js';
import {littleNPC,ufoModel} from './encounter-models.js';
import {flat,visible,freeSpot,npcBody,walkNPC} from './encounter-motion.js';

export function buildCosmo(x,y,z,f){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=Math.atan2(f[0],f[1]);g.name='cosmo-mission';W.group.add(g);
 g.add(compose('cosmoTable34',a=>{const w=tmat(T.wood());a(G.box,w,0,.72,0,1.05,.1,.68);for(const sx of [-.43,.43])for(const sz of [-.25,.25])a(G.box,w,sx,.35,sz,.08,.7,.08);a(G.box,tmat(T.sign('КОСМОС','#c5d4a4','#3b344b')),0,1,-.15,.7,.23,.025);}));
 const prop=bongModel();prop.position.set(0,1.04,0);g.add(prop);const solid=addSolid(x-.55,z-.55,x+.55,z+.55,y,y+.79);
 return{g,prop,solid,reach:2,pos:()=>g.position,front:()=>g.localToWorld(new V3(0,0,1.25)),dispose(){solid.on=false;g.removeFromParent();}};
}
export function cosmoGame(o,api,ctx){
 api.feedback();const P=ctx.player,model=bongModel(),aliens=[],shots=[],initial=P.pos.clone(),startYaw=P.root.rotation.y,beamSite=freeSpot(P.pos,3.5,6,8);
 W.group.add(model);o.prop.visible=false;P.missionTool=true;P.stationaryWork=true;P.vel.x=P.vel.z=0;P.push.x=P.push.z=0;
 let phase='inhale',hold=false,fill=0,exhale=0,clock=0,time=CONFIG.encounters.cosmoTime,cd=0,fx=0,stageT=0,dead=false,reward=null,ufo=null,beam=null,immune=0,wasStunned=false,captured=false;
 const front=new V3(Math.sin(startYaw),0,Math.cos(startYaw)),right=new V3(front.z,0,-front.x),look=initial.clone().add(new V3(0,P.ch.d.top*.66,0));
 const cameraPoint=look.clone().addScaledVector(front,1.65).addScaledVector(right,.58).add(new V3(0,.15,0));
 for(const angle of [0,.7,-.7,1.4,-1.4,Math.PI]){const direction=front.clone().applyAxisAngle(new V3(0,1,0),angle),p=look.clone().addScaledVector(direction,1.9).add(new V3(0,.2,0));if(isFree(p.x-.2,p.z-.2,p.x+.2,p.z+.2,p.y-.2,p.y+.2)&&visible(look,p)){cameraPoint.copy(p);break;}}
 if(!ctx.bot)api.pose(cameraPoint,look);api.msg('Держи ЛКМ - вдох. Дым в колбе показывает наполнение');
 const releaseGrip=()=>{for(const a of aliens)if(a.holding===P){letGo(a);a.holding=null;}if(P.heldBy&&aliens.includes(P.heldBy))P.heldBy=null;};
 function puffOut(){const p=P.root.localToWorld(new V3(0,P.ch.d.top*.66,.25));puff(p.x,p.y,p.z,{color:0xe3dcc8,size:.12,vx:front.x*2.6,vy:.45,vz:front.z*2.6,life:.85,g:0,grow:1.5});}
 function arrive(){
  if(!beamSite){api.finish({success:false});return;}
  phase='arrive';stageT=0;P.stationaryWork=false;P.hazeT=CONFIG.encounters.bongEffect;if(!ctx.bot)api.pose(null);ufo=ufoModel();ufo.position.copy(beamSite).y+=14;W.group.add(ufo);
  const mat=lam({color:0xc5ed98,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide},'ufo34-beam');beam=mesh(new THREE.CylinderGeometry(.8,1.25,1,12,1,true),mat,beamSite.x,beamSite.y+3.6,beamSite.z,1,6.5,1,W.group);beam.visible=false;
  api.msg('Что это над головой?..');sfx('ufoArrive',{at:P.pos,range:25});
 }
 function spawnAliens(){for(let i=0;i<2;i++){
  const p=freeSpot(beamSite,1.8,3);if(!p){api.finish({success:false});return false;}
  const m=littleNPC(i,true),a=npcBody(m);a.pos.copy(p);a.probe.copy(p);a.hp=2;a.cd=1.2+i*.6;a.wind=0;a.holding=null;a.stun=0;a.id=i;aliens.push(a);W.group.add(a.root);
  a.pips=[];for(const x of [-.10,.10])a.pips.push(mesh(G.box,col(0xa6d975),x,1.42,0,.12,.045,.07,a.root));
 }return true;}
 function shoot(ray){
  if(phase!=='combat'||cd>0||P.heldBy||P.daze>0||P.stun>0||shots.length>=12)return;
  cd=.45;let range=raySolids(ray.ray.origin,ray.ray.direction,35);for(const a of aliens)if(a.hp>0){const hit=ray.ray.intersectSphere(new THREE.Sphere(a.pos.clone().add(new V3(0,.7,0)),.48),new V3());if(hit)range=Math.min(range,hit.distanceTo(ray.ray.origin));}
  const from=model.localToWorld(new V3(0,.08,.56)),aim=ray.ray.at(range,new V3()),v=aim.sub(from).normalize().multiplyScalar(27),g=mesh(G.box,lam({color:0xbdf98d,emissive:0x6cae45},'cosmo34-bolt'),from.x,from.y,from.z,.045,.045,.35,W.group);g.lookAt(from.clone().add(v));shots.push({p:from.clone(),v,g,life:1.5});sfx('cosmoShot',{at:from,range:17});
 }
 function target(){return aliens.filter(a=>a.hp>0).sort((a,b)=>flat(a.pos,P.pos)-flat(b.pos,P.pos))[0];}
 const game={
  equipped:true,get phase(){return phase;},get aliens(){return aliens;},
  get toolName(){return phase==='inhale'||phase==='exhale'?'Космический бонг':'Бластер';},get toolIcon(){return phase==='inhale'||phase==='exhale'?'bong':'cosmo';},get toolAction(){return phase==='inhale'?'держи - вдох':phase==='exhale'?'кликай - выдох':'выстрел · каждому по два попадания';},
  pose(){bongPose(P,model,phase==='inhale'||phase==='exhale');},
  target:()=>phase==='combat'?target()?.pos||beamSite:initial,
  botTarget(){if(phase!=='combat')return P.pos;const a=target();if(!a)return P.pos;const d=flat(P.pos,a.pos);return d<3.2?P.pos.clone().add(new V3((P.pos.x-a.pos.x)*1.4,0,(P.pos.z-a.pos.z)*1.4)):P.pos;},
  down(ray){if(phase==='inhale'){hold=true;return;}if(phase==='exhale'){exhale=Math.min(1,exhale+.105);puffOut();sfx('bongExhale',{at:P.pos,range:12});return;}if(phase==='combat')shoot(ray);},
  up(){hold=false;},struggle(){struggleTap(P);},
  prompt:()=>phase==='combat'?P.heldBy?'<b>WASD / ПРОБЕЛ</b>Вырваться':'<b>ЛКМ</b>Бластер · по два попадания':phase==='inhale'?'<b>ЛКМ</b>Держи - вдох':phase==='exhale'?'<b>ЛКМ</b>Кликай - выдох':'',
  botStep(dt,brain){if(phase==='inhale')hold=true;else if(phase==='exhale'&&brain.ready(.14))this.down();else if(phase==='combat'){const a=target();if(P.heldBy&&brain.ready(.14))struggleTap(P);else if(a&&brain.ready(.65))shoot(brain.rayTo(a.pos.clone().add(new V3(0,.7,0))));}},
  update(dt){
   if(dead)return;clock+=dt;time-=dt;cd-=dt;immune=Math.max(0,immune-dt);api.timer(time);stageT+=dt;
   if(time<=0||P.drone||P.returning){api.finish({success:false});return;}
   const stationary=phase==='inhale'||phase==='exhale';
   if(stationary&&(P.heldBy||P.stun>0||P.daze>0||flat(P.pos,initial)>.7)){api.finish({success:false});return;}
   if(stationary){bongPose(P,model,true);setBongForm(model,0,phase==='inhale'?fill:1-exhale);P.ch.body.scale.x*=1+fill*.035;P.ch.body.scale.z*=1+fill*.035;}
   else{bongPose(P,model,false);setBongForm(model,phase==='arrive'?Math.min(1,stageT/1.4):phase==='fold'?Math.max(0,1-stageT/1.2):1);}
   if(phase==='inhale'){
    fill=Math.max(0,Math.min(1,fill+(hold?dt/3.6:-dt*.1)));api.progress(fill*.15);if(hold&&(fx-=dt)<=0){fx=.22;sfx('bongBubble',{at:P.pos,range:10});}if(fill>=1){phase='exhale';hold=false;api.msg('Теперь кликай ЛКМ - выдыхай дым','good');}return;
   }
   if(phase==='exhale'){api.progress(.15+exhale*.15);if(exhale>=1)arrive();return;}
   if(ufo){ufo.rotation.y=clock*.16;const h=phase==='arrive'?Math.max(6.7,14-stageT*4):phase==='fold'?6.7+stageT*5:6.7;ufo.position.set(beamSite.x,beamSite.y+h+Math.sin(clock*1.5)*.12,beamSite.z);beam.visible=phase==='combat'||phase==='lift';beam.scale.y=h-.6;beam.position.y=beamSite.y+(h-.6)/2;}
   if(phase==='arrive'){api.progress(.3+Math.min(1,stageT/2)*.1);if(stageT>=2){phase='combat';stageT=0;if(!spawnAliens())return;api.msg('Два пришельца! ЛКМ - бластер. Каждому по два попадания','good');}return;}
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
    if(stunned&&flat(a.pos,P.pos)<1.25&&!P.heldBy&&immune<=0){a.holding=P;P.heldBy=a;P.struggle=0;a.gripT=0;api.msg('Тебя тащат к лучу! WASD / Пробел - вырваться','bad');continue;}
    if(a.wind>0){a.wind-=dt;a.model.hands[1].rotation.x=-Math.sin((.65-a.wind)/.65*Math.PI)*1.8;
     if(a.wind<=0&&immune<=0&&flat(a.pos,P.pos)<1.65&&Math.abs(a.pos.y-P.pos.y)<1&&visible(a.pos.clone().add(new V3(0,.85,0)),P.pos.clone().add(new V3(0,.9,0)))){daze(P,2.5);immune=.7;P.push.x+=Math.sin(a.root.rotation.y)*.5;P.push.z+=Math.cos(a.root.rotation.y)*.5;sfx('cosmoBaton',{at:P.pos,range:12});}continue;
    }
    if(flat(a.pos,P.pos)>1.15)walkNPC(a,P.pos,1.75,dt);else{a.root.rotation.y=Math.atan2(P.pos.x-a.pos.x,P.pos.z-a.pos.z);if(a.cd<=0&&immune<=0&&!stunned){a.cd=3.8;a.wind=.65;sfx('beep',{at:a.pos,range:9,v:.35});}}
   }
   for(let i=shots.length-1;i>=0;i--){const s=shots[i],old=s.p.clone(),step=s.v.clone().multiplyScalar(dt),len=step.length(),dir=step.clone().normalize(),wall=raySolids(old,dir,len);let hit=null,hitD=Math.min(len,wall);
    for(const a of aliens)if(a.hp>0){const center=a.pos.clone().add(new V3(0,.7,0)),q=center.clone().sub(old),along=q.dot(dir);if(along<-.5||along>hitD+.5)continue;const near=old.clone().addScaledVector(dir,Math.max(0,Math.min(hitD,along)));if(near.distanceTo(center)<.48){const entry=Math.max(0,along-Math.sqrt(Math.max(0,.48*.48-center.distanceToSquared(old.clone().addScaledVector(dir,along)))));if(entry<=hitD){hit=a;hitD=entry;}}}
    s.p.copy(old).addScaledVector(dir,hitD);s.g.position.copy(s.p);s.life-=dt;
    if(hit){hit.hp--;hit.cd=Math.max(hit.cd,1.2);hit.pips[hit.hp].visible=false;releaseGrip();burst(s.p.x,s.p.y,s.p.z,7,{color:0xb5d97c,size:.08,speed:1.8,life:.35});sfx('cosmoHit',{at:hit.pos,range:16});if(!hit.hp){hit.root.visible=false;smokeRing(hit.pos.x,hit.pos.y+.3,hit.pos.z,7,{color:0xb5b4ca,size:.15,speed:1.6,life:.5});}api.progress(.4+(4-aliens.reduce((n,a)=>n+a.hp,0))*.15);}
    if(hit||wall<len||s.life<=0){s.g.removeFromParent();shots.splice(i,1);}
   }
   if(aliens.length===2&&aliens.every(a=>a.hp<=0)){releaseGrip();phase='fold';stageT=0;api.msg('Чисто! Бластер складывается обратно в бонг','good');}
  },
  stop(){dead=true;releaseGrip();P.stationaryWork=false;P.missionTool=false;P.charging=false;if(!ctx.bot)api.pose(null);model.removeFromParent();for(const a of aliens)a.root.removeFromParent();for(const s of shots)s.g.removeFromParent();ufo?.removeFromParent();if(beam){beam.geometry.dispose();beam.removeFromParent();}o.prop.visible=true;if(captured)P.hazeT=0;}
 };return game;
}
