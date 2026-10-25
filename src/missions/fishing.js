import {CONFIG} from '../config.js';
import {THREE,G,V3,mesh,col} from '../core/gfx.js';
import {pix} from '../core/textures.js';
import {W} from '../world/state.js';
import {zoneAt} from '../world/physics.js';
import {sfx} from '../core/sfx.js';
import {splash,ripple} from '../world/particles.js';
import {fishModel,pickFish} from '../game/fishes.js';
import {toolHand} from '../game/handheld.js';

// Катушка вращается тем же вводом у игрока и бота. Прогресс не растёт от удержания кнопки.
export function fishingGame(o,api,ctx){
 api.feedback?.();const tune=CONFIG.fishing;
 const s=o.spot,wy=s.wy,water=new V3(s.cx??s.wx,wy,s.cz??s.wz),shore=new V3(s.x,s.y,s.z),F=water.clone().sub(shore).setY(0).normalize(),R=new V3(F.z,0,-F.x);
 const overview=shore.clone().addScaledVector(F,-1.15).addScaledVector(R,1.4).add(new V3(0,2.1,0));
 const overviewLook=o.tip().lerp(water,.48);api.pose(overview,overviewLook);
 // Стул остаётся на мостике, но не закрывает объектив мини-игры.
 const seatWas=o.seat.visible;o.seat.visible=false;
 const handRoot=new THREE.Group();o.rod.add(handRoot);toolHand(ctx,handRoot,0,.12,0);
 const crankHand=new THREE.Group();o.reel.add(crankHand);if(!ctx?.bot&&ctx?.character){const h=ctx.character.handL.clone(true);h.position.set(.03,-.09,.09);h.scale.setScalar(.8);crankHand.add(h);}
 const inWater=p=>!!zoneAt(p.x,p.z,wy-.08,'water');
 const ringMat=new THREE.MeshBasicMaterial({color:0xf5c542,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false});
 const aimRing=mesh(G.ring,ringMat,water.x,wy+.04,water.z,.35,.35,1,W.group);aimRing.rotation.x=-Math.PI/2;
 const tensionMat=ringMat.clone(),tensionRing=mesh(G.ring,tensionMat,water.x,wy+.045,water.z,.42,.42,1,W.group);tensionRing.rotation.x=-Math.PI/2;tensionRing.visible=false;
 const hint=new THREE.Sprite(new THREE.SpriteMaterial({map:pix('fishBite32',8,16,g=>{g.fillStyle='#17111f';g.fillRect(0,0,8,16);g.fillStyle='#f5c542';g.fillRect(2,1,4,9);g.fillRect(2,12,4,3);}),transparent:true,depthTest:false}));hint.scale.set(.2,.4,1);hint.visible=false;W.group.add(hint);
 const turnMap=pix('reelTurn32',32,32,c=>{c.fillStyle='#f5c542';for(let i=0;i<12;i++){const a=i*.42;c.fillRect(14+Math.cos(a)*11,14+Math.sin(a)*11,3,3);}c.fillRect(22,5,8,3);c.fillRect(27,5,3,8);}),turnHint=new THREE.Sprite(new THREE.SpriteMaterial({map:turnMap,transparent:true,depthTest:false,depthWrite:false}));turnHint.scale.set(.42,.42,1);turnHint.renderOrder=8;turnHint.visible=false;W.group.add(turnHint);
 const selected=pickFish(),fish=fishModel(selected.sp);fish.visible=false;W.group.add(fish);
 const shadows=Array.from({length:3},(_,i)=>{const m=mesh(G.disc,col(0x192731),water.x,wy+.025,water.z,.28,.1,1,W.group);m.rotation.x=-Math.PI/2;return {m,a:i*2.1};});
 const plane=new THREE.Plane(),point=new V3(),bob=o.bob.position,from=new V3(),cast=new V3(),reelCenter=new V3();
 let phase='aim',elapsed=0,t=0,aim=water.clone(),wait=0,bite=0,held=false,lastAngle=null,pull=false,pullT=1.6,tension=0,progress=0,reelTime=0,endT=0,result=null,angle=0;
 const castStart=()=>{phase='cast';t=0;from.copy(o.tip());cast.copy(aim);held=false;api.msg('Заброс...');};
 const end=(ok,msg)=>{phase='end';endT=ok?2.6:1.5;result={success:ok,mult:selected.sp.rare?1.6:1};api.msg(msg,ok?'good':'bad');hint.visible=tensionRing.visible=turnHint.visible=false;held=false;fish.visible=ok;if(ok){fish.visible=true;fish.position.copy(bob);sfx('done');splash(bob.x,wy,bob.z,1);}};
 const turn=delta=>{if(phase!=='reel'||!held)return;const d=Math.max(0,Math.min(.45,delta));angle+=d;o.reel.rotation.x=angle;if(pull)tension=Math.min(1,tension+d*.07);else{progress=Math.min(1,reelTime/tune.minReel+.15,progress+d*tune.perRadian);tension=Math.max(0,tension-d*.025);}};
 const cursorAngle=ray=>{o.rod.updateWorldMatrix(true,true);o.reel.getWorldPosition(reelCenter);const normal=new V3().subVectors(ctx?.camera?.position||overview,reelCenter).normalize();plane.setFromNormalAndCoplanarPoint(normal,reelCenter);if(!ray.ray.intersectPlane(plane,point))return null;const right=new V3().crossVectors(new V3(0,1,0),normal).normalize(),up=new V3().crossVectors(normal,right).normalize(),v=point.sub(reelCenter);return Math.atan2(v.dot(up),v.dot(right));};
 api.progress(null);api.msg('ЛКМ по воде - забросить удочку');
 return {
  hint:'ЛКМ - заброс и подсечка. После поклёвки: зажми ЛКМ и крути мышью по часовой стрелке. При рывке рыбы отпусти.',
  get phase(){return phase;},get pulling(){return pull;},get caught(){return progress;},get tension(){return tension;},get reelCenter(){return o.reel.getWorldPosition(new V3());},
  botStep(dt,brain){if(phase==='aim'){aim.copy(water);if(brain.ready(.8))castStart();}else if(phase==='bite'){this.down(brain.rayTo(bob));}else if(phase==='reel'){held=!pull;turn(dt*tune.botTurn);}},
  down(ray){if(phase==='aim'){this.move(ray);if(!aim||!inWater(aim))return api.msg('Наведи на воду','bad');castStart();}else if(phase==='bite'){phase='reel';t=0;held=false;hint.visible=false;tensionRing.visible=true;api.msg('Подсёк! Зажми ЛКМ и крути катушку по часовой стрелке','good');splash(bob.x,wy,bob.z,.6);}else if(phase==='reel'){held=true;lastAngle=cursorAngle(ray);}},
  move(ray){if(phase==='aim'){plane.setFromNormalAndCoplanarPoint(new V3(0,1,0),water);if(ray.ray.intersectPlane(plane,point)&&point.distanceTo(shore)<10&&inWater(point))aim=point.clone();}else if(phase==='reel'&&held){const a=cursorAngle(ray);if(a!==null&&lastAngle!==null){const d=Math.atan2(Math.sin(lastAngle-a),Math.cos(lastAngle-a));turn(d);}lastAngle=a;}},
  up(){held=false;lastAngle=null;},
  update(dt){
   elapsed+=dt;t+=dt;if(elapsed>tune.timeout&&phase!=='end')end(false,'Рыба ушла');
   for(const f of shadows){f.a+=dt*.4;const p=water.clone().add(new V3(Math.cos(f.a)*.7,0,Math.sin(f.a)*.55));if(inWater(p)){f.m.position.copy(p);f.m.position.y=wy+.025;}f.m.rotation.z=-f.a;}
   aimRing.visible=phase==='aim';if(aim)aimRing.position.set(aim.x,wy+.04,aim.z);
   if(phase==='aim')bob.copy(o.tip());
   if(phase==='cast'){const k=Math.min(1,t/.8);o.rod.rotation.x=.9-Math.sin(k*Math.PI)*.6;bob.lerpVectors(from,cast,k);bob.y+=Math.sin(k*Math.PI)*1.2;if(k===1){phase='wait';t=0;wait=3.2+Math.random()*2.8;splash(bob.x,wy,bob.z,.35);api.msg('Поплавок притих... жди поклёвку');}}
   if(phase==='wait'){bob.y=wy+.09+Math.sin(elapsed*3)*.025;if(t>wait){phase='bite';t=0;bite=1.4;hint.visible=true;api.msg('КЛЮЁТ! ЛКМ - подсечь','good');sfx('water',{at:bob});}}
   if(phase==='bite'){bob.y=wy+.025+Math.sin(elapsed*28)*.05;hint.position.copy(bob).y+=.5;bite-=dt;if(bite<=0){phase='wait';t=0;wait=2.2+Math.random()*2;hint.visible=false;api.msg('Не успел. Жди следующую поклёвку');}}
   if(phase==='reel'){
    reelTime+=dt;pullT-=dt;if(pullT<=0){pull=!pull;pullT=pull?1.1+Math.random()*.9:2.0+Math.random()*1.4;api.msg(pull?'РЫВОК! Отпусти катушку':'Рыба поддаётся - крути по часовой стрелке',pull?'bad':'good');}
    tension=Math.max(0,tension+dt*(pull&&held?.20:-.28));if(pull)progress=Math.max(0,progress-dt*.015);
    const near=shore.clone().addScaledVector(F,1.05).setY(wy+.08);bob.lerpVectors(cast,near,progress);bob.y=wy+.06+(shore.y+.7-wy)*Math.pow(progress,3)+Math.sin(elapsed*(pull?26:4))*(pull?.09:.025);fish.visible=true;fish.position.copy(bob);fish.rotation.y=Math.atan2(F.x,F.z)+Math.PI/2;fish.rotation.z=Math.sin(elapsed*(pull?20:6))*.12;fish.userData.animate?.(elapsed);
    o.rod.rotation.x=.65+(pull?Math.sin(elapsed*17)*.07:.03);
    // Ракурс сбоку на катушку и воду: ничего от стула перед объективом.
    o.rod.updateWorldMatrix(true,true);o.reel.getWorldPosition(reelCenter);const closeP=reelCenter.clone().addScaledVector(R,1.6).addScaledVector(F,-1.3).add(new V3(0,.8,0)),closeL=reelCenter.clone().addScaledVector(F,.45).add(new V3(0,.42,0));
    turnHint.visible=!pull;turnHint.position.copy(reelCenter).addScaledVector(R,.16);turnHint.material.opacity=held?.25:.8;turnHint.material.rotation=-angle;
    const blend=Math.min(1,t/1.1);api.pose(overview.clone().lerp(closeP,blend),overviewLook.clone().lerp(closeL,blend));
    tensionRing.position.set(bob.x,wy+.045,bob.z);tensionRing.scale.setScalar(.34+tension*.2);tensionMat.color.setHex(pull?0xff5a6e:0xf5c542);tensionMat.opacity=pull?.5+Math.sin(elapsed*12)*.25:.7;
    if(Math.random()<dt*(pull?7:2))ripple(bob.x,wy,bob.z,.4,.5);
    api.progress(progress);if(tension>=1){progress=Math.max(0,progress-.12);tension=.62;held=false;lastAngle=null;pull=true;pullT=Math.max(1.4,pullT);splash(bob.x,wy,bob.z,.35);api.msg('Рыба тянет обратно! Отпусти катушку и продолжай','bad');}else if(progress>=.995&&reelTime>=tune.minReel)end(true,`${selected.sp.name} · ${selected.kg} кг`);
   }
   if(phase==='end'){if(result?.success&&fish.visible){const show=shore.clone().addScaledVector(F,.5).add(new V3(0,1.2,0));fish.position.lerp(show,Math.min(1,dt*5));fish.rotation.y+=dt*.7;fish.rotation.z=Math.sin(elapsed*8)*.1;fish.userData.animate?.(elapsed);}endT-=dt;if(endT<=0)api.finish(result);}
   o.upd();
  },
  stop(){o.seat.visible=seatWas;o.rod.remove(handRoot);o.reel.remove(crankHand);o.rod.rotation.x=.9;o.reel.rotation.x=0;for(const m of [aimRing,tensionRing,hint,turnHint,fish,...shadows.map(f=>f.m)])m.removeFromParent();ringMat.dispose();tensionMat.dispose();hint.material.dispose();turnHint.material.dispose();bob.set(s.wx,wy+.12,s.wz);o.upd();}
 };
}
