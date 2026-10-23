import {THREE,G,V3,mesh,col,tmat,lam,glow,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {doll,batchDolls} from './claw-toys.js';
import {SKINS,SKIN_IDS} from '../characters/skins.js';
import {collection,owns,beginClaw,reserveClaw,finishClaw,refundClaw} from '../game/collection.js';
import {sfx} from '../core/sfx.js';
const clamp=THREE.MathUtils.clamp,up=new V3(0,1,0),delta=new V3(),qtmp=new THREE.Quaternion();
const ease=k=>{k=clamp(k,0,1);return k*k*(3-2*k);};

/* Игрушечная физика: твёрдый корпус, вращение при ударе, мягкие конечности.
   Одна фиксированная симуляция на 36 миниатюр; вне крупного плана она спит. */
const relative=new V3(),force=new V3(),lo=new V3(),hi=new V3(),inverseQ=new THREE.Quaternion();
function stepDolls(list,dt,crane=null){
 for(const d of list){
  if(!d.held){
   d.v.y-=9*dt;d.g.position.addScaledVector(d.v,dt);d.v.multiplyScalar(Math.exp(-dt*.7));
   const spin=d.av.length();if(spin>.001){qtmp.setFromAxisAngle(delta.copy(d.av).normalize(),spin*dt);d.g.quaternion.premultiply(qtmp).normalize();d.av.multiplyScalar(Math.exp(-dt*1.4));}
   // Клешня физически раздвигает соседей при спуске, выбранная фигурка остаётся под ней.
   if(crane&&d!==crane.toy){delta.subVectors(d.g.position,crane.p);delta.y+=.32;const l=delta.length();if(l<.40){delta.normalize();d.v.addScaledVector(delta,(.40-l)*10);d.av.x+=delta.z*.15;d.av.z-=delta.x*.15;}}
  }
  inverseQ.copy(d.g.quaternion).invert();force.copy(d.v).sub(d.previousV).multiplyScalar(-1/dt).addScaledVector(up,-9).clampLength(0,22).applyQuaternion(inverseQ);d.previousV.copy(d.v);
  for(const j of d.joints){j.v.addScaledVector(j.off,-dt*65).addScaledVector(j.v,-dt*8).addScaledVector(force,dt*.11);j.off.addScaledVector(j.v,dt).clampLength(0,.19);j.part.position.copy(j.rest).add(j.off);j.part.rotation.set(j.off.z*1.6,0,j.off.x*2);}
 }
 for(let pass=0;pass<3;pass++)for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
  const a=list[i],b=list[j];if(a.held&&b.held)continue;delta.subVectors(b.g.position,a.g.position);const len=delta.length(),r=a.r+b.r;if(len>=r)continue;
  if(len<.001)delta.set(.1,1,.05).normalize();else delta.multiplyScalar(1/len);
  const wa=a.held?0:1,wb=b.held?0:1,penetration=(r-len)/(wa+wb);a.g.position.addScaledVector(delta,-penetration*wa);b.g.position.addScaledVector(delta,penetration*wb);
  const closing=relative.subVectors(b.v,a.v).dot(delta);if(closing<0){const impulse=closing*1.1/(wa+wb);a.v.addScaledVector(delta,impulse*wa);b.v.addScaledVector(delta,-impulse*wb);}
  if(wa){a.av.x+=delta.z*.035;a.av.z-=delta.x*.035;}if(wb){b.av.x-=delta.z*.035;b.av.z+=delta.x*.035;}
 }
 // Опоры учитывают размер и ориентацию настоящей модели, включая выступающие уши и лапы.
 for(const d of list)if(!d.held){
  lo.set(Infinity,Infinity,Infinity);hi.set(-Infinity,-Infinity,-Infinity);for(const p of d.support){delta.copy(p).applyQuaternion(d.g.quaternion);lo.min(delta);hi.max(delta);}
  for(const axis of['x','z']){const edge=axis==='x'?1.48:1.04,min=-edge-lo[axis]+.025,max=edge-hi[axis]-.025,before=d.g.position[axis];d.g.position[axis]=clamp(before,min,max);if(before!==d.g.position[axis]){d.v[axis]*=-.13;d.av.multiplyScalar(.88);}}
  const floor=1.04-lo.y;if(d.g.position.y<floor){d.g.position.y=floor;d.v.y=d.v.y<-.3?-d.v.y*.12:0;d.v.x*=.87;d.v.z*=.87;d.av.multiplyScalar(.88);}
  const ceiling=2.73-hi.y-.025;if(d.g.position.y>ceiling){d.g.position.y=ceiling;d.v.y=Math.min(0,d.v.y);}
 }
}

export function createClaw(scene,onReward){
 const root=new THREE.Group();root.position.set(5.1,.15,.1);scene.add(root);root.visible=true;
 const insideLight=new THREE.PointLight(0xffe3b0,2,6);insideLight.position.set(0,3.6,0);root.add(insideLight);const frontLight=new THREE.PointLight(0xb6cbd2,4,6);frontLight.position.set(0,1.8,3);root.add(frontLight);
 const paint=tmat(T.paintMetal(0x577d82)),trim=tmat(T.metal()),dark=col(0x252c3b),cream=col(0xcfc4aa),pink=col(0xb87587);
 root.add(compose('claw39-cabinet',a=>{a(G.box,paint,0,.09,0,3.3,.18,2.4);a(G.box,paint,0,.51,-1.13,3.3,.90,.14);for(const x of[-1.57,1.57])a(G.box,paint,x,.51,0,.16,.9,2.2);a(G.box,paint,.54,.51,1.14,2.08,.86,.12);a(G.box,paint,-.97,.84,1.14,.94,.20,.12);a(G.box,dark,.55,1,0,1.95,.10,2.2);a(G.box,dark,-.99,1,-.35,1.04,.10,1.4);a(G.box,trim,-.99,.65,.88,.88,.05,.78,.7);a(G.box,paint,0,3.1,0,3.34,.43,2.42);a(G.box,tmat(T.sign('ДРУЗЬЯ','#323d51','#f2d587')),0,3.13,1.225,2.95,.30,.025);
  for(const x of[-1.57,1.57])for(const z of[-1.12,1.12]){a(G.box,trim,x,2.04,z,.10,2.10,.10);a(G.box,dark,x,.10,z,.14,.20,.14);}a(G.box,paint,0,2.03,-1.13,3.08,2.05,.05);for(let i=0;i<7;i++)a(G.box,col(i%2?0x586d72:0x62787b),-1.2+i*.4,1.95,-1.09,.025,1.55,.02);
  for(const z of[-.95,.95])a(G.box,trim,0,2.86,z,2.95,.06,.06);for(const x of[-1.35,1.35])a(G.box,trim,x,2.86,0,.05,.05,2.0);
  a(G.box,paint,0,.93,1.35,3.3,.22,.52,.18);a(G.box,dark,.9,.93,1.64,.07,.16,.03);a(G.box,trim,.9,.93,1.665,.015,.11,.015);
  a(G.box,cream,0,.70,1.21,3.12,.05,.035);
  a(G.box,dark,-.94,.43,.82,.80,.49,.025);for(const x of[-1.37,-.51])a(G.box,trim,x,.43,1.25,.05,.56,.06);a(G.box,trim,-.94,.14,1.26,.91,.05,.06);
  a(G.box,tmat(T.sign('50 МОНЕТ','#394a51','#e3ce8c')),.53,.43,1.22,1.35,.27,.02);for(let i=0;i<5;i++)a(G.box,dark,1.24,.18+i*.04,1.22,.19,.013,.016);
  for(const x of[-1.48,1.48]){a(G.box,glow(0xb6a581),x,2.05,-1.07,.025,1.6,.025);a(G.box,trim,x,1.04,0,.08,.05,2.1);}
 }));

 const joystick=new THREE.Group();joystick.position.set(-.48,1.10,1.43);root.add(joystick);mesh(G.cyl8,dark,0,0,0,.055,.16,.055,joystick);mesh(G.sphL,col(0x9a5b67),0,.11,0,.105,.105,.105,joystick);
 const redButton=new THREE.Group();redButton.position.set(.45,1.07,1.43);root.add(redButton);mesh(G.cyl12,dark,0,0,0,.18,.05,.18,redButton);const cap=mesh(G.cyl12,col(0xcd4e49),0,.045,0,.142,.065,.142,redButton);
 const touchMat=new THREE.MeshBasicMaterial({visible:false}),stickHit=mesh(G.sph,touchMat,0,.08,0,.24,.25,.24,joystick),buttonHit=mesh(G.sph,touchMat,0,.04,0,.23,.16,.23,redButton);stickHit.userData.control='stick';buttonHit.userData.control='drop';
 const glass=lam({color:0xa6c6ce,transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide},'claw38-glass');mesh(G.plane,glass,0,2.08,1.105,3.02,1.96,1,root);for(const s of[-1,1])mesh(G.plane,glass,s*1.515,2.08,0,2.14,1.96,1,root).rotation.y=s*Math.PI/2;
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
 let active=false,phase='idle',time=0,acc=0,toy=null,start=null,paid=false,opening=0,dolls=[],batch=null,keys=new Set(),target=new V3(0,2.64,0),reward=null;
 const message=s=>{msg.textContent=s;};
 function fill(){batch?.dispose();for(const d of dolls)d.dispose();dolls=[];const pool=SKIN_IDS.filter(id=>!owns(id)).sort(()=>Math.random()-.5),count=pool.length?36:0;for(let i=0;i<count;i++){const id=pool[i<pool.length?i:Math.random()*pool.length|0],d=doll(id,(i%6-2.5)*.43+(Math.random()-.5)*.13,1.35+Math.floor(i/18)*.58,(Math.floor(i/6)%3-1)*.55+(Math.random()-.5)*.12);root.add(d.g);dolls.push(d);}for(let i=0;i<65;i++)stepDolls(dolls,1/60);batch=batchDolls(root,dolls);batch.update();}
 function open(){if(active)return;active=true;phase='ready';time=acc=opening=0;toy=null;drag=null;stickX=stickZ=0;paid=false;reward=null;root.visible=true;target.set(0,2.64,0);crane.position.copy(target);fill();ui.classList.remove('hidden');document.getElementById('menu').classList.add('clawing');message(dolls.length?'Наведи клешню над нужной фигуркой':'Все персонажи уже открыты');refresh();}
 function refresh(){const c=collection();button.disabled=!dolls.length||(!paid&&c.coins<50)||!['ready','aim'].includes(phase);button.textContent=paid?'ОПУСТИТЬ КЛЕШНЮ':'ИГРАТЬ · 50 МОНЕТ';back.disabled=!['ready','aim','done'].includes(phase);document.getElementById('clawBalance').textContent=c.coins;}
 function close(){if(!active||!['ready','aim','done'].includes(phase))return;if(paid&&!reward&&!refundClaw()){message('Не удалось сохранить возврат. Повтори');return;}active=false;keys.clear();drag=null;stickX=stickZ=0;aim.visible=false;root.visible=true;ui.classList.add('hidden');document.getElementById('menu').classList.remove('clawing');fill();controller.onClose?.();}
 function drop(){if(!active)return;if(phase==='ready'){if(!beginClaw()){message('Недостаточно монет или не удалось сохранить попытку');return;}paid=true;phase='aim';aim.visible=true;message('Потяни 3D-джойстик · красная кнопка - захват · WASD - клешня');refresh();return;}
  if(phase!=='aim')return;const distance=d=>Math.hypot(d.g.position.x-target.x,d.g.position.z-target.z),near=dolls.filter(d=>distance(d)<.38);toy=near.length?near.reduce((a,b)=>a.g.position.y>b.g.position.y?a:b):dolls.reduce((a,b)=>distance(a)<distance(b)?a:b);if(!reserveClaw(toy.id)){message('Не удалось сохранить. Попробуй ещё раз');return;}reward=toy.id;phase='align';time=0;start=crane.position.clone();aim.visible=false;keys.clear();refresh();sfx('crane');}
 button.onclick=drop;back.onclick=()=>{close();};
 for(const el of document.querySelectorAll('[data-claw]')){el.onpointerdown=e=>{e.preventDefault();keys.add(el.dataset.claw);el.setPointerCapture(e.pointerId);};el.onpointerup=el.onpointercancel=()=>keys.delete(el.dataset.claw);}
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
 const caster=new THREE.Raycaster(),pointer=new THREE.Vector2();let lastCamera=null,drag=null,press=0,stickX=0,stickZ=0;
 function pick(e){if(!lastCamera)return null;root.updateWorldMatrix(true,true);pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);caster.setFromCamera(pointer,lastCamera);return caster.intersectObjects([stickHit,buttonHit],false)[0]?.object.userData.control;}
 function key(code){if(!active)return false;if(keys.has(code))return true;keys.add(code);if(code==='Escape')close();else if(['Space','Enter'].includes(code))drop();return true;}
 function pointerMove(e,camera){lastCamera=camera;if(!active||!drag)return;stickX=clamp((e.clientX-drag.x)/55,-1,1);stickZ=clamp((e.clientY-drag.y)/55,-1,1);}
 addEventListener('pointerdown',e=>{if(!active||e.button!==0||e.target.closest?.('button'))return;const hit=pick(e);if(hit==='drop'){press=.18;drop();}else if(hit==='stick'&&phase==='aim'){drag={x:e.clientX,y:e.clientY};e.preventDefault();}});
 addEventListener('pointerup',()=>{drag=null;stickX=stickZ=0;});addEventListener('blur',()=>{drag=null;stickX=stickZ=0;});
 function update(dt){if(!active)return;dt=Math.min(.05,dt);acc+=dt;let steps=0;while(acc>=1/30&&steps++<2){stepDolls(dolls,1/30,phase==='lower'?{p:crane.position,toy}:null);acc-=1/30;}time+=dt;
  if(phase==='aim'||phase==='ready'){if(phase==='aim'){target.x=clamp(target.x+((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stickX)*dt*.9,-1.1,1.1);target.z=clamp(target.z+((keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+stickZ)*dt*.9,-.68,.68);}crane.position.lerp(target,1-Math.exp(-dt*10));aim.position.set(target.x,1.027,target.z);}
  else if(phase==='align'){crane.position.lerpVectors(start,new V3(toy.g.position.x,2.64,toy.g.position.z),ease(time/.45));if(time>.45){phase='lower';time=0;start=crane.position.clone();}}
  else if(phase==='lower'){const goal=toy.g.position.clone().add(new V3(0,.41,0));crane.position.lerpVectors(start,goal,ease(time/1.1));if(time>1.1){phase='grip';time=0;toy.held=true;toy.v.set(0,0,0);toy.previousV.set(0,0,0);opening=0;sfx('click');}}
  else if(phase==='grip'){opening=ease(time/.45);if(time>.5){phase='lift';time=0;start=crane.position.clone();message('Есть! Держим крепко…');}}
  else if(phase==='lift'){crane.position.y=THREE.MathUtils.lerp(start.y,2.64,ease(time/1.2));if(time>1.2){phase='carry';time=0;start=crane.position.clone();}}
  else if(phase==='carry'){crane.position.lerpVectors(start,new V3(-.95,2.64,.72),ease(time/1.25));if(time>1.25){phase='deliver';time=0;start=toy.g.position.clone();}}
  else if(phase==='deliver'){opening=1-ease(time/.45);toy.g.position.lerpVectors(start,new V3(-.95,.43,1.38),ease(time/1.15));toy.g.quaternion.slerp(new THREE.Quaternion(),dt*3);if(time>1.2){const id=finishClaw();if(id){phase='reveal';time=0;start=toy.g.position.clone();paid=false;message('Твой новый друг - '+SKINS[id].name+'!');onReward(id);sfx('win');refresh();}else{message('Награда сохранена. Заверши выдачу');time=1.15;}}}
  else if(phase==='reveal'){const k=ease(time/1.1);toy.g.position.lerpVectors(start,new V3(0,.72,2.05),k);toy.g.position.y+=Math.sin(k*Math.PI)*.35;toy.g.scale.setScalar(1+k*1.4);toy.g.quaternion.slerp(new THREE.Quaternion(),dt*7);toy.c.animate(dt,{t:time,speed:0,wave:true});toy.c.blob.visible=false;if(time>1.1){phase='done';time=0;refresh();}}
  else if(phase==='done'&&toy){toy.c.animate(dt,{t:time,speed:0,wave:time<1.2});toy.c.blob.visible=false;}
  if(toy?.held&&['grip','lift','carry'].includes(phase)){relative.copy(toy.g.position);toy.g.position.copy(crane.position).add(new V3(0,-.44,0));toy.v.subVectors(toy.g.position,relative).multiplyScalar(1/Math.max(dt,.001));const tilt=Math.sin(time*5)*.06;toy.g.quaternion.slerp(qtmp.setFromEuler(new THREE.Euler(.12,0,tilt)),1-Math.exp(-dt*4));}
  const age=phase==='reveal'?time:phase==='done'?time+1.1:9;sparks.visible=age<2.2;if(sparks.visible){const fade=Math.max(0,1-age/2.2);for(let i=0;i<18;i++){const angle=i*2.4,r=.2+age*.65;sparkPose.position.set(Math.cos(angle)*r,.75+Math.sin(i*19)*age*.45+age*.9-age*age*.3,2.05+Math.sin(angle)*r*.32);sparkPose.scale.setScalar(.035*fade);sparkPose.rotation.set(age*2,i,age*3);sparkPose.updateMatrix();sparks.setMatrixAt(i,sparkPose.matrix);}sparks.instanceMatrix.needsUpdate=true;}frontLight.intensity=4+(age<1.5?Math.sin(age/1.5*Math.PI)*3:0);
  press=Math.max(0,press-dt);cap.position.y=.045-(press>0?.035:0);joystick.rotation.z=-(stickX+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0))*.30;joystick.rotation.x=(stickZ+(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0))*.30;batch?.update();bridge.position.z=crane.position.z;cable.position.set(crane.position.x,(2.80+crane.position.y)/2,crane.position.z);cable.scale.y=Math.max(.03,2.80-crane.position.y);for(const f of fingers)f.rotation.z=-opening*.45;
 }
 fill();crane.position.copy(target);const controller={root,open,close,update,key,pointerMove,joystick,redButton,get batches(){return batch?.drawCalls||0;},get active(){return active;},get phase(){return phase;},get dolls(){return dolls;},get target(){return target;},drop};return controller;
}
