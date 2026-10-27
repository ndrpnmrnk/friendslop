import {updateVfx,resetVfx} from '../game/vfx.js';
import {createLocalLighting} from '../world/scene-lighting.js';
import {updateActionEffects} from '../world/action-fx.js';
import {characterFade} from '../core/model-fade.js';
import {THREE,V3,G,sprite,makeCamera} from '../core/gfx.js';
import {makeCharacter} from '../characters/rig.js';
import {SKINS,SKIN_IDS} from '../characters/skins.js';
import {takeLook,locked,requestLock,unlock,on,mouse,tapped,aim} from '../core/input.js';
import {initCollection,collection,collectionOrder,owns,selectCharacter} from '../game/collection.js';
import {sfx,setListener} from '../core/sfx.js';
import {renderPrompt,renderHeld} from './hud.js';
import {icon} from './icons.js';
import {updateCoins,grabFist,nearFist} from '../game/coins.js';
import {buildHub,HUB} from './hub-world.js';
import {randomMap} from './hub-launch.js';
import {createClaw} from './claw-machine.js';
import {T} from '../core/textures.js';
import {CONFIG,SEASON} from '../config.js';
import {createPlayer,updatePlayer} from '../game/player.js';
import {createCameraRig} from '../game/camera.js';
import {withWorld} from '../world/state.js';
import {addSolid,updatePushables} from '../world/physics.js';
import {updateParticles} from '../world/particles.js';
import {updateItems,drop,throwVelocity,launch,predict} from '../game/items.js';
import {worldTarget,worldAimPoint,interactObject,leaveObject,pickTarget} from '../game/object-actions.js';
import {cargoPosition,poseMeleeItem} from '../game/handheld.js';
import {updateTools,useTool,toolImpact,sodaBlast,releaseBow,vacuumFire} from '../game/tools.js';
import {nearestRideable,grab,release,dismount} from '../game/ride.js';
import {updateGrabs,grabTarget,grabActor,letGo} from '../game/grab.js';
import {knockDown} from '../game/actors.js';
import {voice} from '../game/voice.js';
import {updateRadios,nearRadio,toggleRadio,tuneRadio} from '../game/radio.js';
import {predictBow} from '../game/bow.js';
import {updateSnacks} from '../game/snacks.js';
import {updateSwingers} from '../world/swingers.js';
import {updateSplat} from '../world/splat.js';
import {updateTraps} from '../game/traps.js';
import {pulseOutline} from '../game/outline.js';
import {updateBreakables} from '../world/breakables.js';
import {FX,updateWorldFx,leaveBench,leaveHide,leaveSwing} from '../game/worldfx.js';
import {createSky} from '../world/sky.js';
const $=id=>document.getElementById(id),clamp=THREE.MathUtils.clamp;
const ease=x=>{x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};
const turn=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;

export function createMenu(){
  initCollection(SKIN_IDS);document.documentElement.style.setProperty('--fist-icon',`url("${icon('fist',3)}")`);
  const scene=new THREE.Scene(),camera=makeCamera(CONFIG.camera.fov),rig=createCameraRig();
  scene.background=new THREE.Color(SEASON.bg);scene.fog=new THREE.Fog(SEASON.fog[0],40,120);
  const hemi=new THREE.HemisphereLight(SEASON.hemi[0],SEASON.hemi[1],SEASON.hemi[2]*.62*Math.PI);scene.add(hemi);
  const moon=new THREE.DirectionalLight(SEASON.sun[0],SEASON.sun[1]*.93*Math.PI);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);moon.shadow.bias=-.0008;moon.shadow.normalBias=.05;Object.assign(moon.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:160});scene.add(moon,moon.target);
  const world=buildHub(scene),localLighting=createLocalLighting(scene),sky=createSky(scene,{moonDirection:new V3(-.22,.29,-.91)}),SPLASH_CAM=new V3(1.7,2.2,HUB.spawn.z+5.1),SPLASH_LOOK=new V3(0,1,HUB.spawn.z),look=SPLASH_LOOK.clone();sky.setNight(.12);const direction=sky.moonDir();moon.position.copy(direction).multiplyScalar(70);
  const bounce=new THREE.DirectionalLight(0x8a7ac8,.35*Math.PI);bounce.position.set(-direction.x*45,30,-direction.z*45);scene.add(bounce);
  camera.position.copy(SPLASH_CAM);camera.lookAt(look);
  const st={scene,camera,world,ch:null,player:null,rig,active:true,mode:'splash',idx:0,t:0,choosing:false,hover:false,drag:false,pause:false,transition:null,velocity:new V3(),sit:0};
  let screenTimer=0;const hubHud={prompt:'',held:'',heldType:''};const glowing=new Set();const characters=new Map(),hubFX={shake:0,freeze:0};
  function scope(fn){return withWorld(world.state,()=>{const shake=FX.shake,freeze=FX.freeze;Object.assign(FX,hubFX);try{return fn();}finally{Object.assign(hubFX,FX);FX.shake=shake;FX.freeze=freeze;}});}
  const previewRig=createCameraRig(),previewCamera=makeCamera(CONFIG.camera.fov),clawStand=world.claw.stand.clone();
  const viewPose=(position,yaw)=>scope(()=>{previewRig.reset(yaw);previewRig.state.pitch=rig.state.pitch;previewRig.update(previewCamera,{pos:position,h:st.player.h},0,true);st.followDistance=previewRig.state.curDist;return{p:previewCamera.position.clone(),l:previewCamera.position.clone().addScaledVector(previewCamera.getWorldDirection(new V3()),20)};});
  function character(id,muted=false){
    const pos=st.ch?.root.position.clone()||HUB.spawn.clone(),rot=st.ch?.root.rotation.y??Math.PI;
    if(st.player)scope(()=>{if(st.player.grab)release(st.player,0);leaveObject(st.player);if(st.player.held){drop(st.player.held,st.player.pos.x,st.player.pos.y,st.player.pos.z);st.player.held=null;}});st.ch?.root.removeFromParent();let entry=characters.get(id);
    if(!entry){const ch=makeCharacter(id);entry={ch,skin:ch.skin,muted:false,base:new Map(),materials:[]};characters.set(id,entry);}
    st.ch=entry.ch;st.player=createPlayer(id,st.ch);st.members=[st.player];st.velocity=st.player.vel;world.state.player=st.player;st.ch.root.visible=true;st.ch.root.position.copy(pos);st.ch.root.rotation.y=rot;st.player.facing=rot;scene.add(st.ch.root);
    if(entry.muted!==muted){
      if(muted){const cache=new Map();st.ch.skin={...entry.skin,face:null};st.ch.root.traverse(o=>{if(!o.isMesh||o===st.ch.blob)return;entry.base.set(o,o.material);const mute=m=>{if(cache.has(m))return cache.get(m);const n=m.clone(),hook=m.onBeforeCompile,key=m.customProgramCacheKey();n.onBeforeCompile=sh=>{hook.call(n,sh);sh.fragmentShader=sh.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\n gl_FragColor.rgb = vec3(dot(gl_FragColor.rgb, vec3(.299,.587,.114))) * vec3(.86,.89,1.0);');};n.customProgramCacheKey=()=>key+'-wardrobe-muted39';cache.set(m,n);entry.materials.push(n);return n;};o.material=Array.isArray(o.material)?o.material.map(mute):mute(o.material);});
      }else{for(const[o,m]of entry.base)o.material=m;for(const m of entry.materials)m.dispose();entry.materials=[];entry.base.clear();st.ch.skin=entry.skin;}entry.muted=muted;
    }
  }
  function mode(name){st.mode=name;clearThrow();st.choosing=name==='wardrobe';$('menu').classList.toggle('in-hub',name!=='splash');$('menu').classList.toggle('choosing',st.choosing);$('hubUI').classList.toggle('hidden',!['roam','transition'].includes(name));$('skinLock').classList.add('hidden');if(name!=='roam'){st.velocity.set(0,0,0);takeLook();}if(name!=='roam'&&name!=='transition')unlock();}
  function refreshSkin(){const id=collectionOrder()[st.idx]||collection().selected;character(id,!owns(id));st.ch.root.position.copy(world.wardrobe.preview);st.ch.root.rotation.y=world.wardrobe.outYaw;st.player.facing=world.wardrobe.outYaw;$('skinName').textContent=SKINS[id].name;$('skinDone').disabled=!owns(id);$('skinLock').classList.toggle('hidden',owns(id));}
  function travel(name,pos,camPos,target,duration,done,opts={}){
    mode('transition');unlock();st.pause=false;$('setBtn').classList.remove('hub-settings');$('hubPause').classList.remove('open');
    const toRotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camPos,target,new V3(0,1,0)));
    st.transition={fromRotation:camera.quaternion.clone(),toRotation,fromFov:camera.fov,lookDistance:camera.position.distanceTo(look),endDistance:camPos.distanceTo(target),name,t:0,duration,from:st.ch.root.position.clone(),to:pos.clone(),cp:camera.position.clone(),ct:camPos.clone(),lp:look.clone(),lt:target.clone(),fromYaw:st.ch.root.rotation.y,toYaw:opts.yaw??st.ch.root.rotation.y,done,arc:opts.arc||0,sit:opts.sit??0,sitFrom:st.sit};
  }
  function roam(){characterFade(st.ch.root,1);mode('roam');st.sit=0;st.ch.root.visible=true;st.ch.blob.visible=true;st.player.facing=st.ch.root.rotation.y;rig.resume(camera,{settled:true,distance:st.followDistance});takeLook();requestLock();}
  st.enterHub=()=>{st.launch=null;st.flow=null;scope(()=>{world.vote.reset();world.screen.idle();world.sling.reset();});st.pausedForSettings=false;character(collection().selected);st.ch.root.position.copy(HUB.spawn);st.ch.root.rotation.y=st.player.facing=Math.PI;rig.reset(0);rig.state.pose=rig.state.free=rig.state.orbit=null;
    const cp=camera.position.clone(),cl=look.clone(),rotation=camera.quaternion.clone();scope(()=>rig.update(camera,st.player,0,true));st.followDistance=rig.state.curDist;const p=camera.position.clone(),l=camera.position.clone().addScaledVector(camera.getWorldDirection(new V3()),20);camera.position.copy(cp);camera.quaternion.copy(rotation);look.copy(cl);travel('arrive',st.player.pos,p,l,1.35,roam);
  };
  st.splash=()=>{st.pausedForSettings=false;$('setBtn').classList.remove('hub-settings');st.claw?.close();st.pause=false;st.transition=null;st.sit=0;mode('splash');character(collection().selected);st.ch.root.position.copy(HUB.spawn);st.ch.root.rotation.y=0;$('hubPause').classList.remove('open');$('mode').classList.remove('tv-mode');$('mode').removeAttribute('style');world.curtain(0);};
  st.skin=()=>collection().selected;st.tvTransition=()=>{};
  st.prepareTV=()=>{};
  st.next=d=>{if(!st.choosing)return;st.idx=(st.idx+d+SKIN_IDS.length)%SKIN_IDS.length;refreshSkin();sfx('click');};
  function wardrobeTransition(out){
    const w=world.wardrobe,from=st.player.pos.clone(),gate=out?w.inside:w.gate,to=out?w.exit:w.preview;
    const approach=out ? .7 : Math.max(.35,from.distanceTo(gate)/3.1),cross=out?1.1:1.35,wait=out?0:.3,close=.6,duration=approach+wait+cross+close;
    const pose=out?viewPose(to,w.outYaw):{p:w.camera,l:w.look};
    travel(out?'wardrobe-out':'wardrobe-in',to,pose.p,pose.l,duration,()=>{world.curtain(0);if(out){rig.state.yaw=w.outYaw;roam();}else{mode('wardrobe');refreshSkin();$('skinNext').focus();}},{yaw:out?w.outYaw:w.inYaw});
    Object.assign(st.transition,{wardrobe:{out,gate,approach,cross,wait,close}});sfx('door');
  }
  st.finishWardrobe=confirm=>{if(!st.choosing)return;const id=collectionOrder()[st.idx];if(confirm&&(!owns(id)||!selectCharacter(id)))return;character(collection().selected);st.player.pos.copy(world.wardrobe.preview);st.ch.root.rotation.y=world.wardrobe.outYaw;wardrobeTransition(true);};
  st.closeTV=()=>{};
  st.togglePause=()=>{if(st.mode!=='roam')return;clearThrow();st.pause=!st.pause;$('hubPause').classList.toggle('open',st.pause);$('setBtn').classList.toggle('hub-settings',st.pause);st.velocity.set(0,0,0);if(st.pause){unlock();$('hubResume').focus();}else requestLock();};
  st.resume=()=>{if(st.pause)st.togglePause();};st.suspend=()=>{st.pausedForSettings=true;unlock();};st.resumeSettings=()=>{st.pausedForSettings=false;};
  Object.defineProperty(st,'wantsLock',{get:()=>st.active&&st.mode==='roam'&&!st.pause&&!st.pausedForSettings});
  st.claw=createClaw(scene,id=>{character(id);st.ch.root.position.copy(st.clawRoam?.pos||clawStand);st.ch.root.rotation.y=st.clawRoam?.actorYaw??Math.PI/2;st.ch.root.visible=false;});
  st.claw.root.position.copy(world.claw.pos);st.claw.root.rotation.y=world.claw.ry;st.claw.root.scale.setScalar(world.claw.scale);scope(()=>addSolid(...world.claw.solid,0,2.5));
  st.claw.onClose=()=>{if(st.mode!=='claw')return;rig.state.yaw=st.clawRoam?.yaw??0;rig.state.pitch=st.clawRoam?.pitch??.45;st.ch.root.visible=true;const pos=(st.clawRoam?.pos||clawStand).clone(),pose=viewPose(pos,rig.state.yaw);travel('arcade-out',pos,pose.p,pose.l,1.45,roam);};
  // этапы запуска: режим выбран → рулетка собирает карту → поднимается катапульта; сменили режим — всё заново
  /* запуск матча: гол в ворота режима → табло: правила (2 с) → рулетка карты → отсчёт 10 с (все на площадке — 3 с)
     → сценка с рогаткой. Новый гол до сценки меняет режим и запускает всё заново. */
  st.members=[];st.flow=null;
  world.vote.onGoal=m=>{if(st.flow?.stage==='cutscene')return;st.flow={stage:'mode',mode:m,t:0};world.screen.showMode(m);};
  scope(()=>{Object.assign(world.state,{toolImpact,sodaBlast,knockDown,letGo,dismount:a=>dismount(a,false),leaveBench,leaveHide,leaveSwing,releaseCart:a=>release(a,.3),onDrink:()=>sfx('drink')});});
  const arc=Array.from({length:11},()=>{const m=sprite(T.dot(),.13,{color:0xffb45a,depthTest:false,opacity:.95});m.renderOrder=10;m.visible=false;scene.add(m);return m;});
  const land=new THREE.Mesh(G.ring,new THREE.MeshBasicMaterial({color:0xff8a1f,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));land.rotation.x=-Math.PI/2;land.scale.setScalar(.5);land.visible=false;scene.add(land);
  const aimPoint=()=>worldAimPoint(st.player,camera);
  function clearThrow(){if(st.player)st.player.charging=false;for(const m of arc)m.visible=false;land.visible=false;}
  const stationAt=p=>world.stations.find(q=>Math.abs(p.y)<.6&&(q.contains?q.contains(p):Math.hypot(p.x-q.p.x,p.z-q.p.z)<q.r));
  function hubTarget(){const P=st.player,ordinary=worldTarget(P,camera,{items:false}),q=stationAt(P.pos);if(!q||P.held||ordinary&&ordinary.s<.9)return ordinary;
    return {station:q,label:{wardrobe:'Гардероб',claw:'Автомат'}[q.id],act:()=>{}};}
  st.interact=()=>scope(()=>{
    const P=st.player;if(st.mode!=='roam'||st.pause||st.transition||P.stun>0||P.getT>0||P.heldBy)return;
    if(st.flow?.stage==='cutscene')return;
    const near=hubTarget()?.station;
    if(P.ride||P.grab||P.bench||P.swing||P.hidden||P.holding){leaveObject(P);return;}
    const station=near;if(!station||P.held){interactObject(P,camera);return;}if(P.dive||P.slideT>0||!P.onGround)return;
    if(station.id==='wardrobe'){st.idx=collectionOrder().indexOf(collection().selected);wardrobeTransition(false);}
    else{
      st.clawRoam={yaw:rig.state.yaw,pitch:rig.state.pitch,pos:P.pos.clone(),actorYaw:P.root.rotation.y};const shot=st.claw.cameraPose(camera,true);travel('arcade-in',P.pos,shot.p,shot.l,1.6,()=>{mode('claw');st.ch.root.visible=false;st.claw.open();},{yaw:Math.PI/2});
    }
  });
  on('down',btn=>{if(!st.wantsLock||!locked())return;scope(()=>{const P=st.player;if(P.stun>0||P.heldBy)return;if(btn===0&&grabFist(P))return;
    if(P.grab&&(btn===0||btn===2)){release(P,1.1);return;}
    if(btn===0&&P.charging){clearThrow();P.chargeManual=false;sfx('click');return;}
    if(btn===0&&P.held){if(!P.held.def.hold){const snd=useTool(P,P.held,aimPoint());if(snd)sfx(snd);else if(!P.held.def.tool){drop(P.held,P.pos.x+Math.sin(P.root.rotation.y)*.7,P.pos.y,P.pos.z+Math.cos(P.root.rotation.y)*.7);P.held=null;}}return;}
    if(btn===0&&!P.held){const radio=nearRadio(P,aim(camera));if(radio){toggleRadio(radio);return;}}
    if(btn===0&&!P.held&&!P.ride){const q=pickTarget(P);if(q){q.act();return;}}
    if(P.holding){if(btn===0||btn===2)letGo(P);return;}
    if(!P.held&&!P.ride&&(btn===0||btn===2)){const c=nearestRideable(P,1.7,true);if(c){grab(P,c);return;}}
    if(btn===0&&!P.held&&!P.ride){const v=grabTarget(P);if(v){grabActor(P,v);return;}}
    if(btn===2&&P.held){P.charging=true;P.charge=0;P.chargeManual=false;P.aimYaw=P.root.rotation.y;}
  });});
  on('wheel',d=>{if(!st.wantsLock)return;if(!st.player.charging){scope(()=>{const radio=st.player.held?.type==='boombox'?st.player.held:!st.player.held?nearRadio(st.player,aim(camera)):null;if(radio)tuneRadio(radio,d);});return;}if(st.player.charging){st.player.chargeManual=true;st.player.charge=clamp(st.player.charge-d*.1,.05,1);sfx('tick');}});
  on('up',btn=>{if(!st.wantsLock)return;scope(()=>{const P=st.player;if(btn===0&&P.held?.type==='bow')releaseBow(P,P.held,aimPoint());if(btn===0&&P.held?.type==='vacuum')vacuumFire(P,P.held,aimPoint());
    if(btn===2&&P.charging){P.charging=false;const it=P.held;if(it){launch(it,it.pos.clone(),throwVelocity(it.pos,aimPoint(),P.charge,it.def));it.owner=P;P.held=null;P.throwT=.3;sfx('throw');voice(P.ch,'throw');}}
  });});
  st.key=code=>{if(st.mode==='claw'){st.claw.key(code);return;}if(code==='Escape'){if(st.choosing)st.finishWardrobe(false);else if(st.mode==='tv')st.closeTV();else st.togglePause();return;}if(st.choosing){if(['KeyA','ArrowLeft'].includes(code))st.next(-1);if(['KeyD','ArrowRight'].includes(code))st.next(1);if(code==='Enter')st.finishWardrobe(true);}else if(code==='KeyE'&&tapped('KeyE'))st.interact();};
  $('skinDone').onclick=()=>st.finishWardrobe(true);$('hubResume').onclick=st.resume;
  const wallet=()=>{$('menuCoins').textContent=collection().coins;};addEventListener('collectionchange',wallet);wallet();
  addEventListener('pointermove',e=>{if(st.claw.active)st.claw.pointerMove(e,camera);});
  addEventListener('blur',()=>{if(st.mode==='roam'&&!st.pause)st.togglePause();});
  const previousActor=new V3();
  function flowStep(dt){const f=st.flow;if(!f)return;f.t+=dt;
    if(f.stage==='mode'&&f.t>2.4){f.stage='map';f.t=0;f.ids=randomMap();world.screen.spinMap(f.ids);}
    else if(f.stage==='map'&&world.screen.mapDone&&f.t>3.4){f.stage='count';f.t=0;f.count=10;f.fast=false;}
    else if(f.stage==='count'){const ready=st.members.filter(a=>world.sling.onPad(a.pos)).length;if(!f.fast&&ready>=st.members.length){f.fast=true;f.count=Math.min(f.count,3);sfx('click');}
      f.count-=dt;world.screen.countdown(f.count);if(f.count<=0)startLaunch();}}
  function startLaunch(){const f=st.flow,P=st.player;f.stage='cutscene';f.t=0;world.screen.go();clearThrow();
    if(P.held){drop(P.held,P.pos.x,P.pos.y,P.pos.z);P.held=null;}if(P.ride||P.grab||P.bench||P.swing||P.hidden||P.holding)leaveObject(P);
    st.launch={t:0,done:false,cam:camera.position.clone(),riders:st.members.map((a,i)=>({a,from:a.pos.clone(),i,delay:.15+i*.2}))};world.sling.start(st.members);sfx('fanfare');}
  // сценка запуска: все сами запрыгивают в кармашек, приседают, пока резинка тянется, и улетают кучей за дома
  function launchStep(dt){const L=st.launch,S=world.sling.st,seat=new V3();L.t+=dt;
    for(const r of L.riders){const a=r.a;world.sling.seatPos(r.i,seat);
      if(S.phase==='board'){const k=clamp((S.t-r.delay)/.6,0,1);if(k<=0){a.ch.animate(dt,{t:st.t,speed:0});continue;}
        a.pos.lerpVectors(r.from,seat,k);a.pos.y+=Math.sin(k*Math.PI)*2.2;a.root.position.copy(a.pos);a.root.rotation.y=turn(a.root.rotation.y,Math.PI,1-Math.exp(-dt*10));
        a.ch.animate(dt,{t:st.t,speed:0,air:k<1,vy:k<.5?5:-5,landed:k>=1&&!r.seated});if(k>=1&&!r.seated){r.seated=true;sfx('land',{v:.6});}}
      else if(S.phase==='pull'||S.phase==='fire'){a.pos.copy(seat);a.root.position.copy(seat);a.root.rotation.y=Math.PI;a.ch.animate(dt,{t:st.t,speed:0,crouch:true});}
      else if(S.phase==='fly'){if(!r.v){r.p0=seat.clone();r.v=new V3((r.i%3-1)*1.4+(Math.random()-.5),23+Math.random()*3,-17-Math.random()*3);}
        const t=S.t;a.pos.set(r.p0.x+r.v.x*t,r.p0.y+r.v.y*t-4*t*t,r.p0.z+r.v.z*t);a.root.position.copy(a.pos);a.root.rotation.y=Math.PI;a.ch.animate(dt,{t:st.t,fly:true,vy:r.v.y-8*t,flySpin:6});}}
    // камера: сбоку на рогатку, на выстреле — летит за игроками
    const c=world.sling.rest,P=st.player.pos;
    if(S.phase!=='fly'){const tgt=new V3(c.x-7.2,7.6,c.z+6.8);if(!L.camSet){L.camSet=true;L.cam.copy(tgt);}L.cam.lerp(tgt,1-Math.exp(-dt*2.5));camera.position.copy(L.cam);camera.lookAt(c.x+.6,c.y-1.4,c.z+1.2+(S.phase==='pull'?S.pull*2:0));}
    else{L.cam.lerp(new V3(P.x+2.2,P.y+2.6,P.z+8.5),1-Math.exp(-dt*5));camera.position.copy(L.cam);camera.lookAt(P.x,P.y+.6,P.z-2);}
    if(S.phase==='fly'&&S.t>1.5&&!L.done){L.done=true;resetVfx();st.onLaunch?.({mode:st.flow.mode,ids:st.flow.ids||randomMap()});}}
  function walk(dt){
    const P=st.player,delta=takeLook();world.state.time=st.t;
    if(P.charging&&!P.chargeManual)P.charge=Math.min(1,P.charge+dt/CONFIG.throw.chargeTime);
    if(mouse.left&&P.held?.def.hold&&P.stun<=0&&locked()){useTool(P,P.held,aimPoint(),dt);P.sprayT=P.held.type==='bow'?0:.1;}
    const cut=st.flow?.stage==='cutscene';
    if(cut)launchStep(dt);else updatePlayer(P,dt,st.t,true,rig.state.yaw);
    if(P.held){cargoPosition(P,P.held.pos,P.held.def.r);P.held.g.rotation.y=P.root.rotation.y;poseMeleeItem(P,P.held);}
    if(P.charging&&(!P.held||P.stun>0))clearThrow();
    let shown=0;if(P.charging&&P.held){const tgt=aimPoint();P.aimYaw=Math.atan2(tgt.x-P.pos.x,tgt.z-P.pos.z);shown=predict(P.held.pos,throwVelocity(P.held.pos,tgt,P.charge,P.held.def),arc,arc.length,P.held.def,land);}if(P.held?.type==='bow'&&(P.held.draw||0)>.05){shown=predictBow(P,aimPoint(),arc,land);for(const m of arc){m.scale.setScalar(.085);m.material.depthTest=true;m.material.color.setHex(0xe8dfb9);}}else for(const m of arc){m.scale.setScalar(.13);m.material.depthTest=true;m.material.color.setHex(0xffb45a);}arc.forEach((m,i)=>m.visible=i<shown);if(!shown)land.visible=false;
    world.vote.update(dt,st.t);world.screen.update(dt);world.sling.update(dt,st.t);flowStep(dt);
    updateCoins(dt,P);updateItems(dt,P);updatePushables(dt,P);for(const fn of world.state.animated)fn(dt,st.t);updateSwingers(dt,st.t,P);updateWorldFx(dt,st.t,P);updateTools(dt,st.t);updateGrabs(dt,st.t);updateTraps(dt,st.t);updateSnacks(P,dt);updateBreakables(dt,P);updateActionEffects(dt,P,camera);updateParticles(dt);updateVfx(dt);updateSplat(dt);
    const want=new Set();if(!P.held)for(const it of world.state.items)if(['rest','placed'].includes(it.state)&&!it.noPickup&&(!it.boxed||it.boxed.open)&&it.pos.distanceTo(P.pos)<2.2)want.add(it.outline);
    for(const q of world.state.interacts)if(q.outline&&(!q.glow||q.glow())&&(!q.enabled||q.enabled(P))&&Math.hypot(q.x-P.pos.x,q.z-P.pos.z)<q.r+.7&&Math.abs(q.y-P.pos.y)<(q.dy??.9)+.3)want.add(q.outline);
    const ride=nearestRideable(P)||nearestRideable(P,1.7,true);if(ride&&!P.held)want.add(ride.outline);for(const o of glowing)if(!want.has(o))o?.set(false);for(const o of want)o?.set(true);glowing.clear();for(const o of want)glowing.add(o);pulseOutline(dt);
    rig.state.shake=FX.shake;rig.state.fovAdd=P.boost*3+Math.min(6,Math.max(0,Math.hypot(P.vel.x,P.vel.z)-6.5)*.8);if(!cut)rig.update(camera,P,dt,false,locked()?delta:null,P.charging);st.ch.root.visible=!P.hidden&&camera.position.distanceTo(P.pos.clone().add(new V3(0,1,0)))>.95;look.copy(camera.position).addScaledVector(camera.getWorldDirection(new V3()),20);
  }
  st.update=dt=>scope(()=>{
    dt=Math.min(.05,dt);if(FX.freeze>0){FX.freeze=Math.max(0,FX.freeze-dt);dt*=.05;}st.t+=dt;updateRadios(dt,st.player.pos,st.active&&st.mode==='roam'&&!st.pause&&!st.pausedForSettings);if(!st.active&&st.mode!=='tv'){st.claw.update(dt);return;}
    if(st.mode==='splash'){camera.position.lerp(SPLASH_CAM.clone().setX(1.7+Math.sin(st.t*.12)*.15),1-Math.exp(-dt*3));look.lerp(SPLASH_LOOK,1-Math.exp(-dt*3));st.ch.animate(dt,{t:st.t,speed:0});}
    else if(st.transition){
      const q=st.transition;q.t+=dt;const k=ease(q.t/q.duration);if(q.name==='arcade-in')characterFade(st.ch.root,1-THREE.MathUtils.smoothstep(k,.06,.5));else if(q.name==='arcade-out')characterFade(st.ch.root,THREE.MathUtils.smoothstep(k,.35,.95));previousActor.copy(st.player.pos);st.ch.root.position.lerpVectors(q.from,q.to,k);st.ch.root.rotation.y=turn(q.fromYaw,q.toYaw,k);
      if(q.wardrobe){const w=q.wardrobe,crossAt=w.approach+w.wait,endCross=crossAt+w.cross,part=clamp(q.t/w.approach,0,1);
        if(q.t<w.approach)st.player.pos.lerpVectors(q.from,w.gate,ease(part));else st.player.pos.lerpVectors(w.gate,q.to,ease(clamp((q.t-crossAt)/w.cross,0,1)));
        const openStart=w.out ? .12 : Math.max(0,w.approach-.25),open=clamp((q.t-openStart)/.5,0,1),close=clamp((q.t-endCross)/w.close,0,1);world.curtain(ease(open)*(1-ease(close)));
        const face=w.out?world.wardrobe.outYaw:world.wardrobe.inYaw;st.ch.root.rotation.y=turn(q.fromYaw,face,ease(clamp(q.t/.35,0,1)));if(!w.out&&q.t>endCross)st.ch.root.rotation.y=turn(face,world.wardrobe.outYaw,ease(close));
      }
      let seatK=k;
      st.sit=q.sitFrom+(q.sit-q.sitFrom)*seatK;camera.position.lerpVectors(q.cp,q.ct,k);camera.quaternion.slerpQuaternions(q.fromRotation,q.toRotation,k);camera.fov=THREE.MathUtils.lerp(q.fromFov,CONFIG.camera.fov,k);camera.updateProjectionMatrix();look.copy(camera.position).addScaledVector(camera.getWorldDirection(new V3()),THREE.MathUtils.lerp(q.lookDistance,q.endDistance,k));
      const speed=st.player.pos.distanceTo(previousActor)/Math.max(dt,.001);st.ch.animate(dt,{t:st.t,speed:speed/CONFIG.player.sprint*1.4,ride:st.sit>.05?'sit':null,dangle:true});
      if(q.t>=q.duration){st.player.pos.copy(q.to);st.player.facing=st.ch.root.rotation.y;st.transition=null;q.done();}
    }
    else if(st.mode==='roam'&&!st.pause&&!st.pausedForSettings)walk(dt);else st.ch.animate(dt,{t:st.t,speed:0,ride:st.sit>.05?'sit':null,dangle:true});
    if(st.mode!=='roam'||st.pause||st.pausedForSettings)camera.lookAt(look);camera.updateMatrixWorld();st.claw.update(dt);if(st.mode==='claw'){const shot=st.claw.cameraPose(camera),k=1-Math.exp(-dt*3.7);const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(shot.p,shot.l,new V3(0,1,0)));camera.position.lerp(shot.p,k);camera.quaternion.slerp(rotation,k);look.copy(camera.position).addScaledVector(camera.getWorldDirection(new V3()),THREE.MathUtils.lerp(camera.position.distanceTo(look),shot.p.distanceTo(shot.l),k));camera.updateMatrixWorld();}sky.update(camera,st.t,dt);setListener(camera.position.x,camera.position.y,camera.position.z);
    for(const{light}of world.lampLights)light.removeFromParent();scope(()=>{if(!localLighting.wl)localLighting.rebuild();localLighting.update(camera,dt);});
    screenTimer-=dt;if(screenTimer<=0){screenTimer=.1;const P=st.player,on=st.mode==='roam'&&!st.pause&&!st.pausedForSettings;let text='';if(on){if(st.flow?.stage==='cutscene')text='';else if(nearFist(P))text='<b>ЛКМ</b>Схватить фист';else if(P.bench||P.swing)text='<b>E</b>Встать';else if(P.hidden)text='<b>E</b>Выскочить';else if(!P.ride){const q=hubTarget();if(q)text='<b>E</b>'+q.label;}}renderPrompt(text,$('hubPrompt'),hubHud);renderHeld(on?P:{},null,$('hubHeld'),hubHud);}


  });
  character(collection().selected);world.curtain(0);return st;
}
