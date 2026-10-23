import {THREE,V3,makeCamera} from '../core/gfx.js';
import {makeCharacter} from '../characters/rig.js';
import {SKINS,SKIN_IDS} from '../characters/skins.js';
import {takeLook,locked,requestLock,unlock} from '../core/input.js';
import {initCollection,collection,collectionOrder,owns,selectCharacter} from '../game/collection.js';
import {sfx,setListener} from '../core/sfx.js';
import {buildHub} from './hub-world.js';
import {createClaw} from './claw-machine.js';
import {CONFIG} from '../config.js';
import {createPlayer,updatePlayer} from '../game/player.js';
import {createCameraRig} from '../game/camera.js';
import {withWorld} from '../world/state.js';
import {addSolid,updatePushables} from '../world/physics.js';
import {updateParticles} from '../world/particles.js';
import {updateItems} from '../game/items.js';
import {updateBreakables} from '../world/breakables.js';
import {FX,updateWorldFx,nearInteract,leaveBench,leaveHide} from '../game/worldfx.js';
import {createSky} from '../world/sky.js';
const $=id=>document.getElementById(id),clamp=THREE.MathUtils.clamp;
const ease=x=>{x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};
const turn=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;

export function createMenu(){
  initCollection(SKIN_IDS);
  const scene=new THREE.Scene(),camera=makeCamera(CONFIG.camera.fov),rig=createCameraRig();
  scene.background=new THREE.Color(0x171522);scene.fog=new THREE.Fog(0x171522,25,65);
  const hemi=new THREE.HemisphereLight(0x929ab8,0x1b1923,.28*Math.PI);scene.add(hemi);
  const moon=new THREE.DirectionalLight(0xb8c5de,.62*Math.PI);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);moon.shadow.bias=-.0008;moon.shadow.normalBias=.05;Object.assign(moon.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:90});scene.add(moon,moon.target);
  const world=buildHub(scene),sky=createSky(scene),look=new V3(0,1.1,7.8);sky.setNight(.35);moon.position.copy(sky.moonDir()).multiplyScalar(45);
  camera.position.set(0,4.1,17);camera.lookAt(look);
  const st={scene,camera,world,ch:null,player:null,rig,active:true,mode:'splash',idx:0,t:0,choosing:false,hover:false,drag:false,pause:false,transition:null,velocity:new V3(),sit:0,ballHeld:false,ballFlight:null,scoreT:0};
  let screenTimer=0,lastPrompt='';const characters=new Map(),hubFX={shake:0,freeze:0};
  function scope(fn){return withWorld(world.state,()=>{const shake=FX.shake,freeze=FX.freeze;Object.assign(FX,hubFX);try{return fn();}finally{Object.assign(hubFX,FX);FX.shake=shake;FX.freeze=freeze;}});}
  const viewPose=(position,yaw)=>({p:position.clone().add(new V3(Math.sin(yaw)*5.75+Math.cos(yaw)*1.05,4.5,Math.cos(yaw)*5.75-Math.sin(yaw)*1.05)),l:position.clone().add(new V3(0,1.4,0))});
  function character(id,muted=false){
    const pos=st.ch?.root.position.clone()||new V3(0,0,9.5),rot=st.ch?.root.rotation.y??Math.PI;
    if(st.player?.bench)scope(()=>leaveBench(st.player));st.ch?.root.removeFromParent();let entry=characters.get(id);
    if(!entry){const ch=makeCharacter(id);entry={ch,skin:ch.skin,muted:false,base:new Map(),materials:[]};characters.set(id,entry);}
    st.ch=entry.ch;st.player=createPlayer(id,st.ch);st.velocity=st.player.vel;world.state.player=st.player;st.ch.root.visible=true;st.ch.root.position.copy(pos);st.ch.root.rotation.y=rot;st.player.facing=rot;scene.add(st.ch.root);
    if(entry.muted!==muted){
      if(muted){const cache=new Map();st.ch.skin={...entry.skin,face:null};st.ch.root.traverse(o=>{if(!o.isMesh||o===st.ch.blob)return;entry.base.set(o,o.material);const mute=m=>{if(cache.has(m))return cache.get(m);const n=m.clone(),hook=m.onBeforeCompile,key=m.customProgramCacheKey();n.onBeforeCompile=sh=>{hook.call(n,sh);sh.fragmentShader=sh.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\n gl_FragColor.rgb = vec3(dot(gl_FragColor.rgb, vec3(.299,.587,.114))) * vec3(.86,.89,1.0);');};n.customProgramCacheKey=()=>key+'-wardrobe-muted39';cache.set(m,n);entry.materials.push(n);return n;};o.material=Array.isArray(o.material)?o.material.map(mute):mute(o.material);});
      }else{for(const[o,m]of entry.base)o.material=m;for(const m of entry.materials)m.dispose();entry.materials=[];entry.base.clear();st.ch.skin=entry.skin;}entry.muted=muted;
    }
  }
  function mode(name){st.mode=name;st.choosing=name==='wardrobe';$('menu').classList.toggle('in-hub',name!=='splash');$('menu').classList.toggle('choosing',st.choosing);$('hubUI').classList.toggle('hidden',!['roam','transition'].includes(name));$('skinLock').classList.add('hidden');if(name!=='roam'){st.velocity.set(0,0,0);takeLook();}if(name!=='roam'&&name!=='transition')unlock();}
  function refreshSkin(){const id=collectionOrder()[st.idx]||collection().selected;character(id,!owns(id));st.ch.root.position.copy(world.wardrobe.preview);st.ch.root.rotation.y=world.wardrobe.outYaw;st.player.facing=world.wardrobe.outYaw;$('skinName').textContent=SKINS[id].name;$('skinDone').disabled=!owns(id);$('skinLock').classList.toggle('hidden',owns(id));}
  function travel(name,pos,camPos,target,duration,done,opts={}){
    mode('transition');unlock();st.pause=false;$('setBtn').classList.remove('hub-settings');$('hubPause').classList.remove('open');
    st.transition={name,t:0,duration,from:st.ch.root.position.clone(),to:pos.clone(),cp:camera.position.clone(),ct:camPos.clone(),lp:look.clone(),lt:target.clone(),fromYaw:st.ch.root.rotation.y,toYaw:opts.yaw??st.ch.root.rotation.y,done,arc:opts.arc||0,sit:opts.sit??0,sitFrom:st.sit};
  }
  function roam(){mode('roam');st.sit=0;st.ch.root.visible=true;st.ch.blob.visible=true;st.player.facing=st.ch.root.rotation.y;rig.resume(camera);requestLock();}
  st.enterHub=()=>{st.pausedForSettings=false;character(collection().selected);st.ch.root.position.set(0,0,9.5);st.ch.root.rotation.y=st.player.facing=Math.PI;rig.reset(0);rig.state.pose=rig.state.free=rig.state.orbit=null;
    const cp=camera.position.clone(),cl=look.clone();scope(()=>rig.update(camera,st.player,0,true));const p=camera.position.clone(),l=camera.position.clone().addScaledVector(camera.getWorldDirection(new V3()),20);camera.position.copy(cp);look.copy(cl);travel('arrive',st.player.pos,p,l,1.35,roam);
  };
  st.splash=()=>{st.pausedForSettings=false;$('setBtn').classList.remove('hub-settings');st.claw?.close();st.pause=false;st.transition=null;st.sit=0;st.ballHeld=false;st.ballFlight=null;world.ball.position.set(6.1,.24,5.7);mode('splash');character(collection().selected);st.ch.root.position.set(0,0,9.5);st.ch.root.rotation.y=0;$('hubPause').classList.remove('open');$('mode').classList.remove('tv-mode');$('mode').removeAttribute('style');world.curtain(0);};
  st.skin=()=>collection().selected;
  st.next=d=>{if(!st.choosing)return;st.idx=(st.idx+d+SKIN_IDS.length)%SKIN_IDS.length;refreshSkin();sfx('click');};
  function wardrobeTransition(out){
    const w=world.wardrobe,from=st.player.pos.clone(),gate=out?w.at(0,.08,.9):w.gate,to=out?w.exit:w.preview;
    const approach=out ? .7 : Math.max(.35,from.distanceTo(gate)/3.1),cross=out?1.1:1.35,wait=out?0:.3,close=.6,duration=approach+wait+cross+close;
    const pose=out?viewPose(to,w.outYaw):{p:w.camera,l:w.look};
    travel(out?'wardrobe-out':'wardrobe-in',to,pose.p,pose.l,duration,()=>{world.curtain(0);if(out){rig.state.yaw=w.outYaw;roam();}else{mode('wardrobe');refreshSkin();$('skinNext').focus();}},{yaw:out?w.outYaw:w.inYaw});
    Object.assign(st.transition,{wardrobe:{out,gate,approach,cross,wait,close}});sfx('door');
  }
  st.finishWardrobe=confirm=>{if(!st.choosing)return;const id=collectionOrder()[st.idx];if(confirm&&(!owns(id)||!selectCharacter(id)))return;character(collection().selected);st.player.pos.copy(world.wardrobe.preview);st.ch.root.rotation.y=world.wardrobe.outYaw;wardrobeTransition(true);};
  st.closeTV=()=>{if(st.mode!=='tv')return;$('mode').classList.remove('tv-mode');st.onHub?.();rig.state.yaw=0;const pos=new V3(0,0,-1.8),pose=viewPose(pos,0);travel('sofa-out',pos,pose.p,pose.l,1.35,roam,{yaw:0,sit:0,arc:1.6});};
  st.togglePause=()=>{if(st.mode!=='roam')return;st.pause=!st.pause;$('hubPause').classList.toggle('open',st.pause);$('setBtn').classList.toggle('hub-settings',st.pause);st.velocity.set(0,0,0);if(st.pause){unlock();$('hubResume').focus();}else requestLock();};
  st.resume=()=>{if(st.pause)st.togglePause();};st.suspend=()=>{st.pausedForSettings=true;unlock();};st.resumeSettings=()=>{st.pausedForSettings=false;};
  Object.defineProperty(st,'wantsLock',{get:()=>st.active&&st.mode==='roam'&&!st.pause&&!st.pausedForSettings});
  st.claw=createClaw(scene,id=>{character(id);st.ch.root.position.set(8,0,-2.5);st.ch.root.rotation.y=Math.PI;st.ch.root.visible=false;});
  st.claw.root.position.set(8,0,-5);st.claw.root.scale.setScalar(.72);scope(()=>addSolid(6.8,-5.9,9.2,-3.75,0,2.5));
  st.claw.onClose=()=>{if(st.mode!=='claw')return;rig.state.yaw=0;const pos=new V3(8,0,-2.5),pose=viewPose(pos,0);travel('arcade-out',pos,pose.p,pose.l,1.15,roam);};
  st.interact=()=>scope(()=>{
    if(st.mode!=='roam'||st.pause||st.transition||st.player.dive||st.player.slideT>0||!st.player.onGround)return;const p=st.ch.root.position;if(st.player.bench){leaveBench(st.player);return;}if(st.player.hidden){leaveHide(st.player);return;}
    if(st.ballHeld){st.throwBall();return;}if(p.distanceTo(world.ball.position)<1.65&&!st.ballFlight){st.ballHeld=true;sfx('pickup');return;}
    const station=world.stations.find(q=>Math.hypot(p.x-q.p.x,p.z-q.p.z)<q.r);if(!station){nearInteract(st.player)?.act(st.player);return;}
    if(station.id==='wardrobe'){
      st.idx=collectionOrder().indexOf(collection().selected);wardrobeTransition(false);
    }else if(station.id==='tv'){
      travel('sofa-in',new V3(0,.58,-3.58),new V3(-.20,1.73,-4.65),new V3(-.20,1.73,-7.61),2.05,()=>{mode('tv');$('mode').classList.add('tv-mode');st.onMode?.();},{yaw:Math.PI,sit:1,arc:2.1});sfx('click');
    }else{
      const cp=st.claw.root.localToWorld(new V3(.15,2.65,5.7)),lt=st.claw.root.localToWorld(new V3(0,1.85,.1));travel('arcade-in',new V3(8,0,-2.5),cp,lt,1.25,()=>{mode('claw');st.ch.root.visible=false;st.claw.open();},{yaw:Math.PI});
    }
  });
  st.throwBall=()=>{if(!st.ballHeld||st.mode!=='roam'||st.pause)return;st.ballHeld=false;const p=world.ball.position.clone(),target=world.hoop,flight=1.05;st.ballFlight={v:new V3((target.x-p.x)/flight,(target.y+.45-p.y+7*flight*flight)/flight,(target.z-p.z)/flight),t:0,scored:false};sfx('throw');};
  st.key=code=>{if(st.mode==='claw'){st.claw.key(code);return;}if(code==='Escape'){if(st.choosing)st.finishWardrobe(false);else if(st.mode==='tv')st.closeTV();else st.togglePause();return;}if(st.choosing){if(['KeyA','ArrowLeft'].includes(code))st.next(-1);if(['KeyD','ArrowRight'].includes(code))st.next(1);if(code==='Enter')st.finishWardrobe(true);}else if(code==='KeyE')st.interact();};
  $('skinDone').onclick=()=>st.finishWardrobe(true);$('hubAction').onclick=st.interact;$('hubResume').onclick=st.resume;
  const wallet=()=>{$('menuCoins').textContent=collection().coins;};addEventListener('collectionchange',wallet);wallet();
  addEventListener('pointermove',e=>{if(st.claw.active)st.claw.pointerMove(e,camera);});
  addEventListener('pointerdown',e=>{if(e.button===0&&st.wantsLock&&st.ballHeld&&!e.target.closest?.('button'))st.throwBall();});addEventListener('blur',()=>{if(st.mode==='roam'&&!st.pause)st.togglePause();});
  const ballPrev=new V3(),previousActor=new V3();
  function walk(dt){
    const delta=takeLook();updatePlayer(st.player,dt,st.t,true,rig.state.yaw);updatePushables(dt,st.player);updateItems(dt,st.player);updateBreakables(dt,st.player);updateWorldFx(dt,st.t,st.player);
    for(const fn of world.state.animated)fn(dt,st.t);updateParticles(dt);rig.state.shake=FX.shake;rig.update(camera,st.player,dt,false,locked()?delta:null,false);st.ch.root.visible=!st.player.hidden;look.copy(camera.position).addScaledVector(camera.getWorldDirection(new V3()),20);
  }
  st.update=dt=>scope(()=>{
    dt=Math.min(.05,dt);st.t+=dt;if(!st.active&&st.mode!=='tv'){st.claw.update(dt);return;}
    if(st.mode==='splash'){camera.position.lerp(new V3(Math.sin(st.t*.12)*.22,4.1,17),1-Math.exp(-dt*3));look.lerp(new V3(0,1.1,7.8),1-Math.exp(-dt*3));st.ch.animate(dt,{t:st.t,speed:0});}
    else if(st.transition){
      const q=st.transition;q.t+=dt;const k=ease(q.t/q.duration);previousActor.copy(st.player.pos);st.ch.root.position.lerpVectors(q.from,q.to,k);st.ch.root.rotation.y=turn(q.fromYaw,q.toYaw,k);
      if(q.wardrobe){const w=q.wardrobe,crossAt=w.approach+w.wait,endCross=crossAt+w.cross,part=clamp(q.t/w.approach,0,1);
        if(q.t<w.approach)st.player.pos.lerpVectors(q.from,w.gate,ease(part));else st.player.pos.lerpVectors(w.gate,q.to,ease(clamp((q.t-crossAt)/w.cross,0,1)));
        const openStart=w.out ? .12 : Math.max(0,w.approach-.25),open=clamp((q.t-openStart)/.5,0,1),close=clamp((q.t-endCross)/w.close,0,1);world.curtain(ease(open)*(1-ease(close)));
        const face=w.out?world.wardrobe.outYaw:world.wardrobe.inYaw;st.ch.root.rotation.y=turn(q.fromYaw,face,ease(clamp(q.t/.35,0,1)));if(!w.out&&q.t>endCross)st.ch.root.rotation.y=turn(face,world.wardrobe.outYaw,ease(close));
      }
      const seatK=q.name==='sofa-in'?ease(clamp((k-.55)/.45,0,1)):k;st.sit=q.sitFrom+(q.sit-q.sitFrom)*seatK;camera.position.lerpVectors(q.cp,q.ct,k);camera.position.x+=Math.sin(k*Math.PI)*q.arc;look.lerpVectors(q.lp,q.lt,k);
      const speed=st.player.pos.distanceTo(previousActor)/Math.max(dt,.001);st.ch.animate(dt,{t:st.t,speed:speed/CONFIG.player.sprint*1.4,ride:st.sit>.05?'sit':null,dangle:true});
      if(q.t>=q.duration){st.player.pos.copy(q.to);st.player.facing=st.ch.root.rotation.y;st.transition=null;q.done();}
    }
    else if(st.mode==='roam'&&!st.pause&&!st.pausedForSettings)walk(dt);else st.ch.animate(dt,{t:st.t,speed:0,ride:st.sit>.05?'sit':null,dangle:true});
    if(st.sit>0){st.ch.body.position.y=-.38*st.sit;for(const[h,x]of[[st.ch.handL,-.19],[st.ch.handR,.19]])h.position.lerp(new V3(x,.46,.42),st.sit);world.controller.position.set(.45,.56,-3.58).lerp(st.ch.root.localToWorld(new V3(0,.46,.44)),clamp(st.sit*2,0,1));world.controller.rotation.set(0,st.ch.root.rotation.y,0);}else{world.controller.position.set(.45,.56,-3.58);world.controller.rotation.set(0,.25,0);}
    if(st.mode!=='roam'||st.pause||st.pausedForSettings)camera.lookAt(look);camera.updateMatrixWorld();st.claw.update(dt);sky.update(camera,st.t,dt);setListener(camera.position.x,camera.position.y,camera.position.z);
    if(st.ballHeld)world.ball.position.copy(st.ch.root.localToWorld(new V3(0,.85,.55)));
    if(st.ballFlight&&!st.pause){const f=st.ballFlight;ballPrev.copy(world.ball.position);f.t+=dt;f.v.y-=14*dt;world.ball.position.addScaledVector(f.v,dt);world.ball.rotation.x+=dt*5;
      if(!f.scored&&f.v.y<0&&ballPrev.y>world.hoop.y&&world.ball.position.y<=world.hoop.y&&Math.hypot(world.ball.position.x-world.hoop.x,world.ball.position.z-world.hoop.z)<.43){f.scored=true;st.scoreT=1.8;sfx('win');world.fx.forEach(m=>{m.visible=true;m.position.copy(world.hoop);});}
      if(world.ball.position.y<.24){world.ball.position.y=.24;f.v.y=Math.abs(f.v.y)*.58;f.v.x*=.64;f.v.z*=.64;}if(f.t>5){st.ballFlight=null;world.ball.position.set(6.1,.24,5.7);}}
    if(st.scoreT>0){st.scoreT-=dt;const t=1.8-st.scoreT;world.fx.forEach((m,i)=>{const a=i*2.4;m.position.set(world.hoop.x+Math.cos(a)*t*1.5,world.hoop.y+Math.sin(i*17)*t*1.7-t*t*2,world.hoop.z+Math.sin(a)*t*1.5);m.visible=st.scoreT>0;});}
    screenTimer-=dt;if(screenTimer<=0){screenTimer=.1;const p=st.ch.root.position,q=world.stations.find(q=>Math.hypot(p.x-q.p.x,p.z-q.p.z)<q.r),extra=nearInteract(st.player),text=st.player.bench?'Встать со скамейки':st.player.hidden?'Выйти из листьев':st.scoreT>0?'ПОПАДАНИЕ!':st.ballHeld?'ЛКМ - бросить в кольцо':!st.ballFlight&&p.distanceTo(world.ball.position)<1.65?'Взять баскетбольный мяч':q?q.name+' · '+q.hint:extra?extra.label:'';$('hubAction').classList.toggle('hidden',!text||st.mode!=='roam'||st.pause);if(text!==lastPrompt){lastPrompt=text;$('hubActionText').textContent=text;}$('hubHint').classList.toggle('hidden',st.pause);}
  });
  character(collection().selected);world.curtain(0);return st;
}
