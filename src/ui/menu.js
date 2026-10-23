import {THREE,V3,makeCamera} from '../core/gfx.js';
import {makeCharacter} from '../characters/rig.js';
import {SKINS,SKIN_IDS} from '../characters/skins.js';
import {keys,tapped,takeLook,locked,requestLock,unlock} from '../core/input.js';
import {initCollection,collection,collectionOrder,owns,selectCharacter} from '../game/collection.js';
import {sfx,setListener} from '../core/sfx.js';
import {buildHub} from './hub-world.js';
import {createClaw} from './claw-machine.js';
const $=id=>document.getElementById(id),clamp=THREE.MathUtils.clamp;
const ease=x=>{x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};
const turn=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;

export function createMenu(){
  initCollection(SKIN_IDS);
  const scene=new THREE.Scene(),camera=makeCamera(42);
  scene.background=new THREE.Color(0x211b30);scene.fog=new THREE.Fog(0x211b30,19,44);
  scene.add(new THREE.HemisphereLight(0xb5a4d0,0x665141,1.65*Math.PI));
  const moon=new THREE.DirectionalLight(0xd0c9ea,1.1*Math.PI);moon.position.set(-6,12,8);scene.add(moon);
  const warm=new THREE.PointLight(0xffc38b,9,18);warm.position.set(0,4,-3);scene.add(warm);
  const world=buildHub(scene),look=new V3(0,1.05,2.6);
  camera.position.set(0,4.4,12);camera.lookAt(look);
  const st={scene,camera,world,ch:null,active:true,mode:'splash',idx:0,t:0,yaw:0,pitch:.23,choosing:false,hover:false,drag:false,pause:false,transition:null,velocity:new V3(),sit:0,ballHeld:false,ballFlight:null,scoreT:0};
  let jumpV=0,screenTimer=0,lastPrompt='';const characters=new Map();
  function character(id,muted=false){
    const pos=st.ch?.root.position.clone()||new V3(0,.14,4.7),rot=st.ch?.root.rotation.y??Math.PI;
    st.ch?.root.removeFromParent();let entry=characters.get(id);
    if(!entry){const ch=makeCharacter(id);entry={ch,skin:ch.skin,muted:false,base:new Map(),materials:[]};characters.set(id,entry);}
    st.ch=entry.ch;st.ch.root.visible=true;st.ch.root.position.copy(pos);st.ch.root.rotation.y=rot;scene.add(st.ch.root);
    if(entry.muted!==muted){
      if(muted){const cache=new Map();st.ch.skin={...entry.skin,face:null};st.ch.root.traverse(o=>{if(!o.isMesh||o===st.ch.blob)return;entry.base.set(o,o.material);const mute=m=>{if(cache.has(m))return cache.get(m);const n=m.clone(),hook=m.onBeforeCompile,key=m.customProgramCacheKey();n.onBeforeCompile=sh=>{hook.call(n,sh);sh.fragmentShader=sh.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\n gl_FragColor.rgb = vec3(dot(gl_FragColor.rgb, vec3(.299,.587,.114))) * vec3(.86,.89,1.0);');};n.customProgramCacheKey=()=>key+'-wardrobe-muted39';cache.set(m,n);entry.materials.push(n);return n;};o.material=Array.isArray(o.material)?o.material.map(mute):mute(o.material);});
      }else{for(const[o,m]of entry.base)o.material=m;for(const m of entry.materials)m.dispose();entry.materials=[];entry.base.clear();st.ch.skin=entry.skin;}entry.muted=muted;
    }
  }
  function mode(name){st.mode=name;st.choosing=name==='wardrobe';$('menu').classList.toggle('in-hub',name!=='splash');$('menu').classList.toggle('choosing',st.choosing);$('hubUI').classList.toggle('hidden',!['roam','transition'].includes(name));$('skinLock').classList.add('hidden');if(name!=='roam'){st.velocity.set(0,0,0);takeLook();}if(name!=='roam'&&name!=='transition')unlock();}
  function refreshSkin(){const id=collectionOrder()[st.idx]||collection().selected;character(id,!owns(id));st.ch.root.position.set(-7,.14,-1.12);st.ch.root.rotation.y=0;$('skinName').textContent=SKINS[id].name;$('skinDone').disabled=!owns(id);$('skinLock').classList.toggle('hidden',owns(id));}
  function travel(name,pos,camPos,target,duration,done,opts={}){
    mode('transition');unlock();st.pause=false;$('setBtn').classList.remove('hub-settings');$('hubPause').classList.remove('open');
    st.transition={name,t:0,duration,from:st.ch.root.position.clone(),to:pos.clone(),cp:camera.position.clone(),ct:camPos.clone(),lp:look.clone(),lt:target.clone(),fromYaw:st.ch.root.rotation.y,toYaw:opts.yaw??st.ch.root.rotation.y,done,arc:opts.arc||0,sit:opts.sit??0,sitFrom:st.sit};
  }
  function roam(){mode('roam');st.sit=0;st.ch.root.visible=true;st.ch.blob.visible=true;requestLock();}
  st.enterHub=()=>{jumpV=0;st.pausedForSettings=false;character(collection().selected);st.ch.root.position.set(0,.14,4.7);st.ch.root.rotation.y=Math.PI;st.yaw=0;st.pitch=.23;travel('arrive',st.ch.root.position,new V3(0,2.7,9.1),new V3(0,1.05,4.1),1.35,roam);};
  st.splash=()=>{jumpV=0;st.pausedForSettings=false;$('setBtn').classList.remove('hub-settings');st.claw?.close();st.pause=false;st.transition=null;st.sit=0;st.ballHeld=false;st.ballFlight=null;world.ball.position.set(6.1,.24,5.7);mode('splash');character(collection().selected);st.ch.root.position.set(0,.14,4.7);st.ch.root.rotation.y=0;$('hubPause').classList.remove('open');$('mode').classList.remove('tv-mode');world.curtain(1);};
  st.skin=()=>collection().selected;
  st.next=d=>{if(!st.choosing)return;st.idx=(st.idx+d+SKIN_IDS.length)%SKIN_IDS.length;refreshSkin();sfx('click');};
  st.finishWardrobe=confirm=>{
    if(!st.choosing)return;const id=collectionOrder()[st.idx];if(confirm&&(!owns(id)||!selectCharacter(id)))return;
    character(collection().selected);st.ch.root.position.set(-7,.14,-1.12);st.ch.root.rotation.y=0;
    travel('wardrobe-out',new V3(-7,.14,1.5),new V3(-7,2.7,5.8),new V3(-7,1.0,1.1),1.15,()=>{st.yaw=0;roam();},{yaw:0});sfx('door');
  };
  st.closeTV=()=>{if(st.mode!=='tv')return;$('mode').classList.remove('tv-mode');st.onHub?.();travel('sofa-out',new V3(0,.14,-1.8),new V3(0,2.7,2.6),new V3(0,1,-2.2),1.25,roam,{yaw:0,sit:0,arc:1.6});};
  st.togglePause=()=>{if(st.mode!=='roam')return;st.pause=!st.pause;$('hubPause').classList.toggle('open',st.pause);$('setBtn').classList.toggle('hub-settings',st.pause);st.velocity.set(0,0,0);if(st.pause){unlock();$('hubResume').focus();}else requestLock();};
  st.resume=()=>{if(st.pause)st.togglePause();};st.suspend=()=>{st.pausedForSettings=true;unlock();};st.resumeSettings=()=>{st.pausedForSettings=false;};
  Object.defineProperty(st,'wantsLock',{get:()=>st.active&&st.mode==='roam'&&!st.pause&&!st.pausedForSettings});
  st.claw=createClaw(scene,id=>{character(id);st.ch.root.position.set(6,.14,1.6);st.ch.root.rotation.y=Math.PI;st.ch.root.visible=false;});
  st.claw.root.position.set(6,.14,-1);st.claw.root.scale.setScalar(.68);world.solids.push({x0:4.84,x1:7.16,z0:-1.86,z1:.13,h:2.5});
  st.claw.onClose=()=>{if(st.mode!=='claw')return;travel('arcade-out',new V3(6,.14,1.6),new V3(6,2.7,6),new V3(6,1,1),1.0,roam);};
  st.interact=()=>{
    if(st.mode!=='roam'||st.pause||st.transition)return;const p=st.ch.root.position;
    if(st.ballHeld){st.throwBall();return;}if(p.distanceTo(world.ball.position)<1.65&&!st.ballFlight){st.ballHeld=true;sfx('pickup');return;}
    const station=world.stations.find(q=>Math.hypot(p.x-q.p.x,p.z-q.p.z)<q.r);if(!station)return;
    if(station.id==='wardrobe'){
      st.idx=collectionOrder().indexOf(collection().selected);travel('wardrobe-in',new V3(-7,.14,-1.12),new V3(-7,1.65,2.90),new V3(-7,1.15,-1.25),1.5,()=>{mode('wardrobe');refreshSkin();$('skinNext').focus();},{yaw:Math.PI});sfx('door');
    }else if(station.id==='tv'){
      travel('sofa-in',new V3(0,.98,-3.45),new V3(-.20,1.73,-4.65),new V3(-.20,1.73,-7.61),2.05,()=>{mode('tv');$('mode').classList.add('tv-mode');st.onMode?.();},{yaw:Math.PI,sit:1,arc:2.1});sfx('click');
    }else{
      const cp=st.claw.root.localToWorld(new V3(.15,2.65,5.7)),lt=st.claw.root.localToWorld(new V3(0,1.85,.1));travel('arcade-in',new V3(6,.14,1.6),cp,lt,1.25,()=>{mode('claw');st.ch.root.visible=false;st.claw.open();},{yaw:Math.PI});
    }
  };
  st.throwBall=()=>{if(!st.ballHeld||st.mode!=='roam'||st.pause)return;st.ballHeld=false;const p=world.ball.position.clone(),target=world.hoop,flight=1.05;st.ballFlight={v:new V3((target.x-p.x)/flight,(target.y+.45-p.y+7*flight*flight)/flight,(target.z-p.z)/flight),t:0,scored:false};sfx('throw');};
  st.key=code=>{if(st.mode==='claw'){st.claw.key(code);return;}if(code==='Escape'){if(st.choosing)st.finishWardrobe(false);else if(st.mode==='tv')st.closeTV();else st.togglePause();return;}if(st.choosing){if(['KeyA','ArrowLeft'].includes(code))st.next(-1);if(['KeyD','ArrowRight'].includes(code))st.next(1);if(code==='Enter')st.finishWardrobe(true);}else if(code==='KeyE')st.interact();};
  $('skinDone').onclick=()=>st.finishWardrobe(true);$('hubAction').onclick=st.interact;$('hubResume').onclick=st.resume;
  const wallet=()=>{$('menuCoins').textContent=collection().coins;};addEventListener('collectionchange',wallet);wallet();
  addEventListener('pointermove',e=>{if(st.claw.active)st.claw.pointerMove(e,camera);});
  addEventListener('pointerdown',e=>{if(e.button===0&&st.wantsLock&&st.ballHeld&&!e.target.closest?.('button'))st.throwBall();});addEventListener('blur',()=>{if(st.mode==='roam'&&!st.pause)st.togglePause();});
  const camWant=new V3(),lookWant=new V3(),step=new V3(),ballPrev=new V3();
  function free(x,z){if(x< -10.8||x>10.8||z< -9.3||z>10.65)return false;return !world.solids.some(s=>x>s.x0-.3&&x<s.x1+.3&&z>s.z0-.3&&z<s.z1+.3);}
  function walk(dt){
    const p=st.ch.root.position,d=takeLook();if(locked()){st.yaw-=d.dx*.0023;st.pitch=clamp(st.pitch+d.dy*.0015,-.08,.68);}
    let x=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),z=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);const n=Math.hypot(x,z)||1;x/=n;z/=n;
    const speed=keys.ShiftLeft||keys.ShiftRight?5.3:3.6,c=Math.cos(st.yaw),s=Math.sin(st.yaw),k=1-Math.exp(-dt*12);st.velocity.x+=((x*c+z*s)*speed-st.velocity.x)*k;st.velocity.z+=((-x*s+z*c)*speed-st.velocity.z)*k;
    if(free(p.x+st.velocity.x*dt,p.z))p.x+=st.velocity.x*dt;else st.velocity.x=0;if(free(p.x,p.z+st.velocity.z*dt))p.z+=st.velocity.z*dt;else st.velocity.z=0;
    if(tapped('Space')&&p.y<=.141)jumpV=6.1;jumpV-=19*dt;p.y=Math.max(.14,p.y+jumpV*dt);if(p.y===.14)jumpV=0;
    const v=Math.hypot(st.velocity.x,st.velocity.z);if(v>.1)st.ch.root.rotation.y=turn(st.ch.root.rotation.y,Math.atan2(st.velocity.x,st.velocity.z),1-Math.exp(-dt*13));st.ch.animate(dt,{t:st.t,speed:v,air:p.y>.15,vy:jumpV});
    lookWant.copy(p).add(new V3(0,1.05,0));camWant.set(p.x+Math.sin(st.yaw)*4.5,p.y+2.1+st.pitch*2.8,p.z+Math.cos(st.yaw)*4.5);
    for(let i=1;i<=18;i++){step.lerpVectors(lookWant,camWant,i/18);if(world.solids.some(s=>step.y<s.h+.2&&step.x>s.x0-.15&&step.x<s.x1+.15&&step.z>s.z0-.15&&step.z<s.z1+.15)){camWant.lerpVectors(lookWant,camWant,Math.max(.22,(i-1)/18));break;}}
    camera.position.lerp(camWant,1-Math.exp(-dt*7));look.lerp(lookWant,1-Math.exp(-dt*10));
  }
  st.update=dt=>{
    dt=Math.min(.05,dt);st.t+=dt;if(!st.active&&st.mode!=='tv'){st.claw.update(dt);return;}
    if(st.mode==='splash'){camera.position.lerp(new V3(Math.sin(st.t*.12)*.22,4.4,12),1-Math.exp(-dt*3));look.lerp(new V3(0,1.05,2.6),1-Math.exp(-dt*3));st.ch.animate(dt,{t:st.t,speed:0});}
    else if(st.transition){const q=st.transition;q.t+=dt;const k=ease(q.t/q.duration);st.ch.root.position.lerpVectors(q.from,q.to,k);st.ch.root.rotation.y=turn(q.fromYaw,q.toYaw,k);if(q.name==='wardrobe-in')st.ch.root.rotation.y=k<.55?turn(q.fromYaw,Math.PI,ease(clamp(k/.45,0,1))):turn(Math.PI,0,ease((k-.55)/.45));const seatK=q.name==='sofa-in'?ease(clamp((k-.55)/.45,0,1)):k;st.sit=q.sitFrom+(q.sit-q.sitFrom)*seatK;camera.position.lerpVectors(q.cp,q.ct,k);camera.position.x+=Math.sin(k*Math.PI)*q.arc;look.lerpVectors(q.lp,q.lt,k);st.ch.animate(dt,{t:st.t,speed:q.name==='arrive'?0:Math.sin(Math.PI*k)*2.2,ride:st.sit>.05?'sit':null,dangle:true});if(q.t>=q.duration){st.transition=null;q.done();}}
    else if(st.mode==='roam'&&!st.pause&&!st.pausedForSettings)walk(dt);else st.ch.animate(dt,{t:st.t,speed:0,ride:st.sit>.05?'sit':null,dangle:true});
    if(st.sit>0){st.ch.body.position.y=-.38*st.sit;for(const[h,x]of[[st.ch.handL,-.19],[st.ch.handR,.19]])h.position.lerp(new V3(x,.46,.42),st.sit);world.controller.position.set(.65,.95,-3.55).lerp(st.ch.root.localToWorld(new V3(0,.46,.44)),clamp(st.sit*2,0,1));world.controller.rotation.set(0,st.ch.root.rotation.y,0);}else{world.controller.position.set(.65,.95,-3.55);world.controller.rotation.set(0,.25,0);}
    const q=st.transition,curtain=q?.name.startsWith('wardrobe-')?1-.94*Math.sin(Math.PI*clamp((q.t/q.duration-.15)/.7,0,1)):1;world.curtain(curtain);camera.lookAt(look);camera.updateMatrixWorld();st.claw.update(dt);setListener(camera.position.x,camera.position.y,camera.position.z);
    if(st.mode==='tv'){const corners=[new V3(-1.56,.905,-7.59),new V3(1.16,2.555,-7.59)].map(p=>p.project(camera));Object.assign($('mode').style,{left:(corners[0].x+1)*innerWidth/2+'px',top:(1-corners[1].y)*innerHeight/2+'px',width:(corners[1].x-corners[0].x)*innerWidth/2+'px',height:(corners[1].y-corners[0].y)*innerHeight/2+'px'});}
    if(st.ballHeld)world.ball.position.copy(st.ch.root.localToWorld(new V3(0,.85,.55)));
    if(st.ballFlight&&!st.pause){const f=st.ballFlight;ballPrev.copy(world.ball.position);f.t+=dt;f.v.y-=14*dt;world.ball.position.addScaledVector(f.v,dt);world.ball.rotation.x+=dt*5;
      if(!f.scored&&f.v.y<0&&ballPrev.y>world.hoop.y&&world.ball.position.y<=world.hoop.y&&Math.hypot(world.ball.position.x-world.hoop.x,world.ball.position.z-world.hoop.z)<.43){f.scored=true;st.scoreT=1.8;sfx('win');world.fx.forEach(m=>{m.visible=true;m.position.copy(world.hoop);});}
      if(world.ball.position.y<.24){world.ball.position.y=.24;f.v.y=Math.abs(f.v.y)*.58;f.v.x*=.64;f.v.z*=.64;}if(f.t>5){st.ballFlight=null;world.ball.position.set(6.1,.24,5.7);}}
    if(st.scoreT>0){st.scoreT-=dt;const t=1.8-st.scoreT;world.fx.forEach((m,i)=>{const a=i*2.4;m.position.set(world.hoop.x+Math.cos(a)*t*1.5,world.hoop.y+Math.sin(i*17)*t*1.7-t*t*2,world.hoop.z+Math.sin(a)*t*1.5);m.visible=st.scoreT>0;});}
    screenTimer-=dt;if(screenTimer<=0){screenTimer=.1;const p=st.ch.root.position,q=world.stations.find(q=>Math.hypot(p.x-q.p.x,p.z-q.p.z)<q.r),text=st.scoreT>0?'ПОПАДАНИЕ!':st.ballHeld?'ЛКМ - бросить в кольцо':!st.ballFlight&&p.distanceTo(world.ball.position)<1.65?'Взять баскетбольный мяч':q?q.name+' · '+q.hint:'';$('hubAction').classList.toggle('hidden',!text||st.mode!=='roam'||st.pause);if(text!==lastPrompt){lastPrompt=text;$('hubActionText').textContent=text;}$('hubHint').classList.toggle('hidden',st.pause);}
  };
  character(collection().selected);world.curtain(1);return st;
}
