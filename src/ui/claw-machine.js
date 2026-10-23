import {THREE,G,V3,mesh,col,tmat,lam,glow,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {doll,batchDolls} from './claw-toys.js';
import {LAMP_CONE_M} from '../world/props.js';
import {toyPhysics} from './claw-physics.js';
import {SKINS,SKIN_IDS} from '../characters/skins.js';
import {collection,owns,beginClaw,reserveClaw,finishClaw,refundClaw} from '../game/collection.js';
import {sfx} from '../core/sfx.js';
const clamp=THREE.MathUtils.clamp,relative=new V3(),qtmp=new THREE.Quaternion();
const ease=k=>{k=clamp(k,0,1);return k*k*(3-2*k);};

export function createClaw(scene,onReward){
 const root=new THREE.Group();root.position.set(5.1,.15,.1);scene.add(root);root.visible=true;
 const insideLight=new THREE.PointLight(0xffdfad,5.2,4.2,1.5);insideLight.position.set(0,2.65,.7);root.add(insideLight);const frontLight=new THREE.PointLight(0xaebbc7,.35,3.8);frontLight.position.set(0,1.8,3);root.add(frontLight);
 const paint=tmat(T.paintMetal(0x394d51)),trim=tmat(T.paintMetal(0x667071)),dark=col(0x252c3b),cream=col(0xcfc4aa),pink=col(0xb87587);
 root.add(compose('claw41-cabinet',a=>{a(G.box,paint,0,.09,0,3.3,.18,2.4);a(G.box,paint,0,.51,-1.13,3.3,.90,.14);for(const x of[-1.57,1.57])a(G.box,paint,x,.51,0,.16,.9,2.2);a(G.box,paint,.54,.51,1.14,2.08,.86,.12);a(G.box,paint,-.97,.84,1.14,.94,.20,.12);a(G.box,dark,.55,1,0,1.95,.10,2.2);a(G.box,dark,-.99,1,-.35,1.04,.10,1.4);a(G.box,trim,-.99,.65,.88,.88,.05,.78,.7);a(G.box,paint,0,3.1,0,3.34,.43,2.42);a(G.box,tmat(T.sign('ДРУЗЬЯ','#323d51','#f2d587')),0,3.13,1.225,2.95,.30,.025);
  for(const x of[-1.57,1.57])for(const z of[-1.12,1.12]){a(G.box,trim,x,2.04,z,.10,2.10,.10);a(G.box,dark,x,.10,z,.14,.20,.14);}a(G.box,paint,0,2.03,-1.13,3.08,2.05,.05);for(let i=0;i<7;i++)a(G.box,col(i%2?0x344547:0x3a4c4d),-1.2+i*.4,1.95,-1.09,.025,1.55,.02);
  for(const z of[-.95,.95])a(G.box,trim,0,2.86,z,2.95,.06,.06);for(const x of[-1.35,1.35])a(G.box,trim,x,2.86,0,.05,.05,2.0);
  a(G.box,paint,0,.93,1.35,3.3,.22,.52,.18);a(G.box,dark,.9,.93,1.64,.07,.16,.03);a(G.box,trim,.9,.93,1.665,.015,.11,.015);
  a(G.box,cream,0,.70,1.21,3.12,.05,.035);
  a(G.box,dark,-.94,.43,.82,.80,.49,.025);for(const x of[-1.37,-.51])a(G.box,trim,x,.43,1.25,.05,.56,.06);a(G.box,trim,-.94,.14,1.26,.91,.05,.06);
  a(G.box,tmat(T.sign('50 МОНЕТ','#394a51','#e3ce8c')),.53,.43,1.22,1.35,.27,.02);for(let i=0;i<5;i++)a(G.box,dark,1.24,.18+i*.04,1.22,.19,.013,.016);
  for(const x of[-1.48,1.48]){a(G.box,glow(0xb6a581),x,2.05,-1.07,.025,1.6,.025);a(G.box,trim,x,1.04,0,.08,.05,2.1);}
  // Сборные панели, окантовки, крепёж, направляющие и приёмный лоток.
  for(const x of[-1.46,1.46]){a(G.box,dark,x,2.05,1.13,.065,1.93,.035);for(const y of[1.16,2.88])a(G.cyl8,trim,x,y,1.16,.027,.012,.027,Math.PI/2);}
  for(const z of[-1.02,1.02])a(G.box,cream,0,2.89,z,2.82,.025,.035);
  for(const x of[-1.38,1.38])for(const y of[.23,.76])a(G.cyl8,trim,x,y,1.235,.025,.015,.025,Math.PI/2);
  a(G.box,dark,-.96,.13,1.43,.88,.04,.37);a(G.box,trim,-.96,.15,1.58,.91,.04,.045);
  a(G.box,tmat(T.sign('ВЫДАЧА','#283739','#a9ad9b')),-.96,.81,1.235,.7,.105,.012);
  for(const x of[-.48,.45])a(G.cyl12,trim,x,1.055,1.43,.18,.022,.18);
 }));

 // Тёплая лампа под крышей и два коротких луча между задними стойками.
 for(const x of[-.78,.78]){mesh(G.box,glow(0xffdfad),x,2.88,0,.62,.035,.16,root);const cone=mesh(new THREE.CylinderGeometry(.08,.48,1.65,8,1,true),LAMP_CONE_M().clone(),x,2.05,-.4,1,1,1,root);cone.material.uniforms.k.value=.2;cone.userData.noOcc=true;}
 const joystick=new THREE.Group();joystick.position.set(-.48,1.10,1.43);root.add(joystick);mesh(G.cyl8,dark,0,0,0,.055,.16,.055,joystick);mesh(G.sphL,col(0x9a5b67),0,.11,0,.105,.105,.105,joystick);
 const redButton=new THREE.Group();redButton.position.set(.45,1.07,1.43);root.add(redButton);mesh(G.cyl12,dark,0,0,0,.18,.05,.18,redButton);const cap=mesh(G.cyl12,col(0xcd4e49),0,.045,0,.142,.065,.142,redButton);
 const touchMat=new THREE.MeshBasicMaterial({visible:false}),stickHit=mesh(G.sph,touchMat,0,.08,0,.24,.25,.24,joystick),buttonHit=mesh(G.sph,touchMat,0,.04,0,.23,.16,.23,redButton);stickHit.userData.control='stick';buttonHit.userData.control='drop';
 const glass=lam({color:0xa6c6ce,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide},'claw40-glass');mesh(G.plane,glass,0,2.08,1.105,3.02,1.96,1,root);for(const s of[-1,1])mesh(G.plane,glass,s*1.515,2.08,0,2.14,1.96,1,root).rotation.y=s*Math.PI/2;
 // Пара отражённых штрихов на стекле, без дополнительных прозрачных слоёв.
 for(const s of[-1,1]){const m=mesh(G.box,col(0x78929c),s*1.3,2.3,1.111,.018,.44,.008,root);m.rotation.z=-.35;}
 const bridge=new THREE.Group();root.add(bridge);mesh(G.box,trim,0,2.83,0,2.75,.08,.12,bridge);
 const crane=new THREE.Group();root.add(crane);const cable=mesh(G.cyl6,dark,0,0,0,.018,1,.018,root),fingers=[];
 mesh(G.cyl8,paint,0,0,0,.13,.23,.13,crane);mesh(G.cyl8,trim,0,-.14,0,.08,.12,.08,crane);
 for(let i=0;i<3;i++){const pivot=new THREE.Group();pivot.rotation.y=i*Math.PI*2/3;crane.add(pivot);const arm=new THREE.Group();pivot.add(arm);arm.position.y=-.14;
  const curve=new THREE.CatmullRomCurve3([new V3(0,0,0),new V3(.18,-.14,0),new V3(.21,-.33,0),new V3(.07,-.43,0)]),geo=new THREE.TubeGeometry(curve,5,.025,4,false);mesh(geo,trim,0,0,0,1,1,1,arm);fingers.push(arm);}
 const sparks=new THREE.InstancedMesh(G.box,glow(0xf2cf83),18),sparkPose=new THREE.Object3D();sparks.visible=false;sparks.frustumCulled=false;sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(sparks);
 const aim=mesh(G.ring,col(0xdbbf6c),0,1.025,0,.21,.21,1,root);aim.rotation.x=-Math.PI/2;aim.visible=false;
 const ui=document.getElementById('clawUI'),msg=document.getElementById('clawMessage'),button=document.getElementById('clawDrop'),back=document.getElementById('clawBack');
 let active=false,phase='idle',time=0,toy=null,start=null,paid=false,opening=0,dolls=[],batch=null,physics=null,poolKey='',grabOffset=new V3(),keys=new Set(),target=new V3(0,2.64,0),reward=null;
 const message=s=>{msg.textContent=s;};
 function fill(){physics?.dispose();batch?.dispose();for(const d of dolls)d.dispose();dolls=[];const pool=SKIN_IDS.filter(id=>!owns(id)).sort(()=>Math.random()-.5),count=pool.length?36:0;poolKey=pool.slice().sort().join(',');for(let i=0;i<count;i++){const id=pool[i<pool.length?i:Math.random()*pool.length|0],d=doll(id,(i%6-2.5)*.43+(Math.random()-.5)*.05,1.43+Math.floor(i/18)*.73,(Math.floor(i/6)%3-1)*.56+(Math.random()-.5)*.04);root.add(d.g);dolls.push(d);}physics=toyPhysics(dolls);batch=batchDolls(root,dolls);batch.update();}

 function open(){if(active)return;active=true;phase='ready';time=opening=0;toy=null;drag=null;stickX=stickZ=0;paid=false;reward=null;root.visible=true;target.set(0,2.64,0);crane.position.copy(target);if(poolKey!==SKIN_IDS.filter(id=>!owns(id)).sort().join(','))fill();ui.classList.remove('hidden');document.getElementById('menu').classList.add('clawing');message(dolls.length?'Наведи клешню над нужной фигуркой':'Все персонажи уже открыты');refresh();}
 function refresh(){const c=collection();button.disabled=!dolls.length||(!paid&&c.coins<50)||!['ready','aim'].includes(phase);button.textContent=paid?'ОПУСТИТЬ КЛЕШНЮ':'ИГРАТЬ · 50 МОНЕТ';back.disabled=!['ready','aim','done'].includes(phase);document.getElementById('clawBalance').textContent=c.coins;}
 function close(){if(!active||!['ready','aim','done'].includes(phase))return;if(paid&&!reward&&!refundClaw()){message('Не удалось сохранить возврат. Повтори');return;}active=false;keys.clear();drag=null;stickX=stickZ=0;aim.visible=false;sparks.visible=false;frontLight.intensity=.35;if(toy?.held){toy.g.scale.setScalar(0);batch?.update();}root.visible=true;ui.classList.add('hidden');document.getElementById('menu').classList.remove('clawing');controller.onClose?.();}
 function drop(){if(!active)return;if(phase==='ready'){if(!beginClaw()){message('Недостаточно монет или не удалось сохранить попытку');return;}paid=true;phase='aim';aim.visible=true;message('Потяни 3D-джойстик · красная кнопка - захват · WASD - клешня');refresh();return;}
  if(phase!=='aim')return;const distance=d=>Math.hypot(d.g.position.x-target.x,d.g.position.z-target.z),near=dolls.filter(d=>distance(d)<.38);toy=near.length?near.reduce((a,b)=>a.g.position.y>b.g.position.y?a:b):dolls.reduce((a,b)=>distance(a)<distance(b)?a:b);if(!reserveClaw(toy.id)){message('Не удалось сохранить. Попробуй ещё раз');return;}reward=toy.id;physics.wake(toy);phase='align';time=0;start=crane.position.clone();aim.visible=false;keys.clear();refresh();sfx('crane');}
 button.onclick=drop;back.onclick=()=>{close();};
 for(const el of document.querySelectorAll('[data-claw]')){el.onpointerdown=e=>{e.preventDefault();keys.add(el.dataset.claw);el.setPointerCapture(e.pointerId);};el.onpointerup=el.onpointercancel=()=>keys.delete(el.dataset.claw);}
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
 const caster=new THREE.Raycaster(),pointer=new THREE.Vector2();let lastCamera=null,drag=null,press=0,stickX=0,stickZ=0;
 function pick(e){if(!lastCamera)return null;root.updateWorldMatrix(true,true);pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);caster.setFromCamera(pointer,lastCamera);return caster.intersectObjects([stickHit,buttonHit],false)[0]?.object.userData.control;}
 function key(code){if(!active)return false;if(keys.has(code))return true;keys.add(code);if(code==='Escape')close();else if(['Space','Enter'].includes(code))drop();return true;}
 function pointerMove(e,camera){lastCamera=camera;if(!active||!drag)return;stickX=clamp((e.clientX-drag.x)/55,-1,1);stickZ=clamp((e.clientY-drag.y)/55,-1,1);}
 addEventListener('pointerdown',e=>{if(!active||e.button!==0||e.target.closest?.('button'))return;const hit=pick(e);if(hit==='drop'){press=.18;drop();}else if(hit==='stick'&&phase==='aim'){drag={x:e.clientX,y:e.clientY};e.preventDefault();}});
 addEventListener('pointerup',()=>{drag=null;stickX=stickZ=0;});addEventListener('blur',()=>{drag=null;stickX=stickZ=0;});
 function update(dt){if(!active)return;dt=Math.min(.05,dt);time+=dt;
  if(phase==='aim'||phase==='ready'){if(phase==='aim'){target.x=clamp(target.x+((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stickX)*dt*.9,-1.1,1.1);target.z=clamp(target.z+((keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+stickZ)*dt*.9,-.68,.68);}crane.position.lerp(target,1-Math.exp(-dt*10));aim.position.set(target.x,1.027,target.z);}
  else if(phase==='align'){crane.position.lerpVectors(start,new V3(toy.g.position.x,2.64,toy.g.position.z),ease(time/.45));if(time>.45){phase='lower';time=0;start=crane.position.clone();}}
  else if(phase==='lower'){const goal=toy.g.position.clone().add(new V3(0,.41,0));crane.position.lerpVectors(start,goal,ease(time/1.1));if(time>1.1){phase='grip';time=0;toy.held=true;grabOffset.subVectors(toy.g.position,crane.position);physics.hold(toy);toy.v.set(0,0,0);toy.previousV.set(0,0,0);opening=0;sfx('click');}}
  else if(phase==='grip'){opening=ease(time/.45);if(time>.5){phase='lift';time=0;start=crane.position.clone();message('Есть! Держим крепко…');}}
  else if(phase==='lift'){crane.position.y=THREE.MathUtils.lerp(start.y,2.64,ease(time/1.2));if(time>1.2){phase='carry';time=0;start=crane.position.clone();}}
  else if(phase==='carry'){crane.position.lerpVectors(start,new V3(-.95,2.64,.72),ease(time/1.25));if(time>1.25){phase='deliver';physics.remove(toy);time=0;start=toy.g.position.clone();}}
  else if(phase==='deliver'){opening=1-ease(time/.45);toy.g.position.lerpVectors(start,new V3(-.95,.43,1.38),ease(time/1.15));toy.g.quaternion.slerp(new THREE.Quaternion(),dt*3);if(time>1.2){const id=finishClaw();if(id){phase='reveal';time=0;start=toy.g.position.clone();paid=false;message('Твой новый друг - '+SKINS[id].name+'!');onReward(id);sfx('win');refresh();}else{message('Награда сохранена. Заверши выдачу');time=1.15;}}}
  else if(phase==='reveal'){const k=ease(time/1.1);toy.g.position.lerpVectors(start,new V3(0,.72,2.05),k);toy.g.position.y+=Math.sin(k*Math.PI)*.35;toy.g.scale.setScalar(1+k*1.4);toy.g.quaternion.slerp(new THREE.Quaternion(),dt*7);toy.c.animate(dt,{t:time,speed:0,wave:true});toy.c.blob.visible=false;if(time>1.1){phase='done';time=0;refresh();}}
  else if(phase==='done'&&toy){toy.c.animate(dt,{t:time,speed:0,wave:time<1.2});toy.c.blob.visible=false;}
  if(toy?.held&&['grip','lift','carry'].includes(phase)){relative.copy(toy.g.position);toy.g.position.copy(crane.position).add(grabOffset);toy.v.subVectors(toy.g.position,relative).multiplyScalar(1/Math.max(dt,.001));const tilt=Math.sin(time*5)*.06;toy.g.quaternion.slerp(qtmp.setFromEuler(new THREE.Euler(.12,0,tilt)),1-Math.exp(-dt*4));}
  const age=phase==='reveal'?time:phase==='done'?time+1.1:9;sparks.visible=age<2.2;if(sparks.visible){const fade=Math.max(0,1-age/2.2);for(let i=0;i<18;i++){const angle=i*2.4,r=.2+age*.65;sparkPose.position.set(Math.cos(angle)*r,.75+Math.sin(i*19)*age*.45+age*.9-age*age*.3,2.05+Math.sin(angle)*r*.32);sparkPose.scale.setScalar(.035*fade);sparkPose.rotation.set(age*2,i,age*3);sparkPose.updateMatrix();sparks.setMatrixAt(i,sparkPose.matrix);}sparks.instanceMatrix.needsUpdate=true;}frontLight.intensity=.35+(age<1.5?Math.sin(age/1.5*Math.PI)*.65:0);
  press=Math.max(0,press-dt);cap.position.y=.045-(press>0?.035:0);joystick.rotation.z=-(stickX+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0))*.30;joystick.rotation.x=(stickZ+(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0))*.30;const dynamic=physics.moving||!!toy?.held;physics.update(dt);if(dynamic)batch?.update();bridge.position.z=crane.position.z;cable.position.set(crane.position.x,(2.80+crane.position.y)/2,crane.position.z);cable.scale.y=Math.max(.03,2.80-crane.position.y);for(const f of fingers)f.rotation.z=-opening*.45;
 }
 fill();crane.position.copy(target);const controller={root,open,close,update,key,pointerMove,joystick,redButton,get sleeping(){return dolls.filter(d=>d.physics?.sleepState===2).length;},get batches(){return batch?.drawCalls||0;},get active(){return active;},get phase(){return phase;},get dolls(){return dolls;},get target(){return target;},drop};return controller;
}
