import {clawTarget,toyHighlight} from './claw-target.js';
import {THREE,G,V3,mesh,col,tmat,lam,glow,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {doll,batchDolls} from './claw-toys.js';
import {LAMP_CONE_M} from '../world/props.js';
import {clawReveal} from './claw-reveal.js';
import {toyPhysics} from './claw-physics.js';
import {SKINS,SKIN_IDS} from '../characters/skins.js';
import {collection,owns,beginClaw,reserveClaw,finishClaw,refundClaw} from '../game/collection.js';
import {sfx} from '../core/sfx.js';
const clamp=THREE.MathUtils.clamp,relative=new V3(),oldToyPosition=new V3(),qtmp=new THREE.Quaternion();
const ease=k=>{k=clamp(k,0,1);return k*k*(3-2*k);};

export function createClaw(scene,onReward){
 const root=new THREE.Group();root.position.set(5.1,.15,.1);scene.add(root);root.visible=true;
 const insideLight=new THREE.PointLight(0xffdfad,5.2,4.2,1.5);insideLight.position.set(0,2.65,.7);root.add(insideLight);const frontLight=new THREE.PointLight(0xaebbc7,.35,3.8);frontLight.position.set(0,1.8,3);root.add(frontLight);
 const paint=tmat(T.paintMetal(0x394d51)),trim=tmat(T.paintMetal(0x667071)),dark=col(0x252c3b),cream=col(0xcfc4aa),pink=col(0xb87587);
 root.add(compose('claw41-cabinet',a=>{a(G.box,paint,0,.09,0,3.3,.18,2.4);a(G.box,paint,0,.51,-1.13,3.3,.90,.14);for(const x of[-1.57,1.57])a(G.box,paint,x,.51,0,.16,.9,2.2);a(G.box,paint,.54,.51,1.14,2.08,.86,.12);a(G.box,paint,-.97,.84,1.14,.94,.20,.12);a(G.box,dark,.55,1,0,1.95,.10,2.2);a(G.box,dark,-.99,1,-.35,1.04,.10,1.4);a(G.box,trim,-.99,.65,.88,.88,.05,.78,.7);a(G.box,paint,0,3.1,0,3.34,.43,2.42);
  for(const x of[-1.57,1.57])for(const z of[-1.12,1.12]){a(G.box,trim,x,2.04,z,.10,2.10,.10);a(G.box,dark,x,.10,z,.14,.20,.14);}a(G.box,paint,0,2.03,-1.13,3.08,2.05,.05);for(let i=0;i<7;i++)a(G.box,col(i%2?0x344547:0x3a4c4d),-1.2+i*.4,1.95,-1.09,.025,1.55,.02);
  for(const z of[-.95,.95])a(G.box,trim,0,2.86,z,2.95,.06,.06);for(const x of[-1.35,1.35])a(G.box,trim,x,2.86,0,.05,.05,2.0);
  a(G.box,paint,0,.93,1.35,3.3,.22,.52,.18);a(G.box,dark,.9,.93,1.64,.07,.16,.03);a(G.box,trim,.9,.93,1.665,.015,.11,.015);
  a(G.box,cream,0,.70,1.21,3.12,.05,.035);
  a(G.box,dark,-.94,.43,.82,.80,.49,.025);for(const x of[-1.37,-.51])a(G.box,trim,x,.43,1.25,.05,.56,.06);a(G.box,trim,-.94,.14,1.26,.91,.05,.06);
  a(G.box,tmat(T.clawPanel?T.clawPanel():T.metal()),.53,.43,1.22,1.35,.5,.02);for(let i=0;i<5;i++)a(G.box,dark,1.24,.18+i*.04,1.22,.19,.013,.016);
  for(const x of[-1.48,1.48]){a(G.box,glow(0xb6a581),x,2.05,-1.07,.025,1.6,.025);a(G.box,trim,x,1.04,0,.08,.05,2.1);}
  // Сборные панели, окантовки, крепёж, направляющие и приёмный лоток.
  for(const x of[-1.46,1.46]){a(G.box,dark,x,2.05,1.13,.065,1.93,.035);for(const y of[1.16,2.88])a(G.cyl8,trim,x,y,1.16,.027,.012,.027,Math.PI/2);}
  for(const z of[-1.02,1.02])a(G.box,cream,0,2.89,z,2.82,.025,.035);
  for(const x of[-1.38,1.38])for(const y of[.23,.76])a(G.cyl8,trim,x,y,1.235,.025,.015,.025,Math.PI/2);
  a(G.box,dark,-.96,.13,1.43,.88,.04,.37);a(G.box,trim,-.96,.15,1.58,.91,.04,.045);
  a(G.box,tmat(T.sign('ВЫДАЧА','#283739','#a9ad9b')),-.96,.81,1.235,.7,.105,.012);
  for(const x of[-.48,.45])a(G.cyl12,trim,x,1.055,1.43,.18,.022,.18);
 }));

 // v0.56: вывеска-«корона» сверху с бегущими лампочками и цветные боковые панели
 { const top=mesh(G.box,[col(0x5a1840),col(0x5a1840),col(0x5a1840),col(0x5a1840),lam({map:T.clawTopper(),emissive:0xffffff,emissiveMap:T.clawTopper(),emissiveIntensity:.55},'claw56-topper'),col(0x5a1840)],0,3.62,.25,2.9,.62,.28,root);top.userData.noBatch=true;
  mesh(G.box,trim,0,3.32,.25,3.0,.06,.34,root);for(const x of[-1.25,1.25])mesh(G.box,trim,x,3.42,.25,.06,.2,.06,root);
  for(const s2 of[-1,1]){const sp=mesh(G.plane,lam({map:T.clawSide()},'claw56-side'),s2*1.66,.5,0,2.0,.7,1,root);sp.rotation.y=s2*Math.PI/2;} }
 const bulbs=new THREE.InstancedMesh(G.sph,new THREE.MeshBasicMaterial({color:0xffffff,fog:false}),30),bp=new THREE.Object3D(),bulbOn=new THREE.Color(0xfff0b0),bulbOff=new THREE.Color(0x6a4a3a),bulbPink=new THREE.Color(0xff8ac8);bulbs.frustumCulled=false;root.add(bulbs);
 for(let i=0;i<30;i++){const k=i/29;let x,y;if(i<14){x=-1.42+k*30/13*1.42;y=3.94;}else if(i<22){x=i<18?-1.47:1.47;y=3.36+((i-14)%4)*.16;}else{x=-1.3+(i-22)*.37;y=3.3;}bp.position.set(x,y,.41);bp.scale.setScalar(.045);bp.updateMatrix();bulbs.setMatrixAt(i,bp.matrix);bulbs.setColorAt(i,bulbOn);}
 let chase=0;
 // Тёплая лампа под крышей и два коротких луча между задними стойками.
 for(const x of[-.78,.78]){mesh(G.box,glow(0xffdfad),x,2.88,0,.62,.035,.16,root);const cone=mesh(new THREE.CylinderGeometry(.08,.48,1.65,8,1,true),LAMP_CONE_M().clone(),x,2.05,-.4,1,1,1,root);cone.material.uniforms.k.value=.2;cone.userData.noOcc=true;}
 const joystick=new THREE.Group();joystick.position.set(-.48,1.10,1.43);root.add(joystick);mesh(G.cyl8,dark,0,0,0,.055,.16,.055,joystick);mesh(G.sphL,col(0x9a5b67),0,.11,0,.105,.105,.105,joystick);
 const redButton=new THREE.Group();redButton.position.set(.45,1.07,1.43);root.add(redButton);mesh(G.cyl12,dark,0,0,0,.18,.05,.18,redButton);const cap=mesh(G.cyl12,col(0xcd4e49),0,.045,0,.142,.065,.142,redButton);
 const touchMat=new THREE.MeshBasicMaterial({visible:false}),prizeHit=mesh(G.box,new THREE.MeshBasicMaterial({visible:false}),-.95,.47,1.45,.8,.72,.6,root),stickHit=mesh(G.sph,touchMat,0,.08,0,.24,.25,.24,joystick),buttonHit=mesh(G.sph,touchMat,0,.04,0,.23,.16,.23,redButton);prizeHit.userData.control='prize';stickHit.userData.control='stick';buttonHit.userData.control='drop';
 const glass=lam({color:0xa6c6ce,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide},'claw40-glass');mesh(G.plane,glass,0,2.08,1.105,3.02,1.96,1,root);for(const s of[-1,1])mesh(G.plane,glass,s*1.515,2.08,0,2.14,1.96,1,root).rotation.y=s*Math.PI/2;
 // Пара отражённых штрихов на стекле, без дополнительных прозрачных слоёв.
 for(const s of[-1,1]){const m=mesh(G.box,col(0x78929c),s*1.3,2.3,1.111,.018,.44,.008,root);m.rotation.z=-.35;}
 const bridge=new THREE.Group();root.add(bridge);mesh(G.box,trim,0,2.83,0,2.75,.08,.12,bridge);
 const crane=new THREE.Group();crane.name='claw-carriage';root.add(crane);const cable=mesh(G.cyl6,dark,0,0,0,.018,1,.018,root),fingers=[];
 mesh(G.cyl8,paint,0,0,0,.13,.23,.13,crane);mesh(G.cyl8,trim,0,-.14,0,.08,.12,.08,crane);
 const sliders=[];for(let i=0;i<3;i++){const pivot=new THREE.Group();pivot.rotation.y=i*Math.PI*2/3;crane.add(pivot);const arm=new THREE.Group();pivot.add(arm);arm.position.y=-.14;
  const rail=mesh(G.box,trim,.20,-.14,0,.3,.045,.045,pivot),cover=mesh(G.box,paint,.105,-.14,0,.16,.075,.08,pivot),joint=mesh(G.sphL,trim,0,-.14,0,.038,.038,.038,pivot);sliders.push({rail,joint,arm});
  const curve=new THREE.CatmullRomCurve3([new V3(0,0,0),new V3(.025,-.12,0),new V3(.025,-.32,0),new V3(-.10,-.43,0)]),geo=new THREE.TubeGeometry(curve,8,.018,4,false);mesh(geo,trim,0,0,0,1,1,1,arm);fingers.push(arm);}
 const sparks=new THREE.InstancedMesh(G.box,glow(0xf2cf83),18),sparkPose=new THREE.Object3D();sparks.visible=false;sparks.frustumCulled=false;sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(sparks);
 const aimMaterial=new THREE.MeshBasicMaterial({color:0xffdb81,transparent:true,opacity:.82,depthTest:false,depthWrite:false,fog:false,side:THREE.DoubleSide}),aim=mesh(new THREE.RingGeometry(.29,.325,32),aimMaterial,0,1.07,0,1,1,1,root);aim.name='claw-capture-area';aim.rotation.x=-Math.PI/2;aim.renderOrder=80;aim.visible=false;for(const[w,h]of[[.12,.015],[.015,.12]])mesh(G.box,aimMaterial,0,0,.002,w,h,.003,aim);
 const ui=document.getElementById('clawUI'),msg=document.getElementById('clawMessage'),button=document.getElementById('clawDrop'),back=document.getElementById('clawBack');
 const highlight=toyHighlight(root);let aimPick=null,lastPickX=Infinity,lastPickZ=Infinity;const reveal=clawReveal(root,ui);const practiceButton=document.createElement('button');practiceButton.id='clawPractice';practiceButton.type='button';ui.querySelector('.clawControls').insertBefore(practiceButton,back);const startBadge=document.createElement('div');startBadge.id='clawStart';startBadge.textContent='ПОЕХАЛИ!';startBadge.hidden=true;ui.appendChild(startBadge);
 let practice=false;try{practice=localStorage.getItem('friendslop.clawPractice')==='1';}catch{}
 let gripRadius=.25,gripDepth=.48;
 const OPEN_R=.36,CLOSED_R=.1,DEPTH=.43;let radius=OPEN_R,closeR=CLOSED_R,cand=null,slipAt=Infinity,flash=0,landed=false;
 // самая высокая игрушка под раскрытыми пальцами (в координатах автомата)
 const topUnder=(x,z,r)=>{let top=-1;for(const d of dolls){if(d.held||d.g.scale.x<.01||!d.physics?.world)continue;let mx=-1,inside=false;for(const v of d.support){relative.copy(v).applyQuaternion(d.g.quaternion).add(d.g.position);mx=Math.max(mx,relative.y);if(Math.hypot(relative.x-x,relative.z-z)<r)inside=true;}if(inside||Math.hypot(d.g.position.x-x,d.g.position.z-z)<r)top=Math.max(top,mx);}return top;};
 // игрушка, которая реально оказалась между пальцами: центр внутри круга и по высоте между кончиками и ладонью
 function candidate(){const tip=crane.position.y-.14-DEPTH,palmY=crane.position.y-.1;let best=null;for(const d of dolls){if(d.held||d.g.scale.x<.01||!d.physics?.world)continue;const p=profile(d),cy=d.g.position.y+(p.top+p.bottom)/2,dist=Math.hypot(d.g.position.x-crane.position.x,d.g.position.z-crane.position.z);
  if(dist>OPEN_R*.8||cy<tip-.12||cy>palmY)continue;if(!best||dist<best.dist)best={toy:d,dist,half:Math.max(.08,Math.min(.3,p.radius-dist)),top:d.g.position.y+p.top};}return best;}
 let bob=0,lock=null,hang=null,swing={x:0,z:0,vx:0,vz:0},prevCrane=new V3(),craneV=new V3(),active=false,phase='idle',time=0,toy=null,start=null,paid=false,opening=0,dolls=[],batch=null,physics=null,poolKey='',grabOffset=new V3(),keys=new Set(),target=new V3(0,2.64,0),reward=null;
 const message=s=>{if(msg.textContent!==s)msg.textContent=s;if(msg.hasAttribute('style'))msg.removeAttribute('style');};
 function fill(){gripRadius=.25;gripDepth=.48;highlight.clear();aimPick=null;lastPickX=Infinity;physics?.dispose();batch?.dispose();for(const d of dolls)d.dispose();dolls=[];const pool=SKIN_IDS.filter(id=>practice||!owns(id)).sort(()=>Math.random()-.5),count=pool.length?36:0;poolKey=(practice?'test:':'real:')+pool.slice().sort().join(',');for(let i=0;i<count;i++){const id=pool[i<pool.length?i:Math.random()*pool.length|0],d=doll(id,(i%6-2.5)*.42+(Math.random()-.5)*.05,1.45+Math.floor(i/18)*.75,(Math.floor(i/6)%3-1)*.58+(Math.random()-.5)*.04);root.add(d.g);dolls.push(d);}physics=toyPhysics(dolls);batch=batchDolls(root,dolls);batch.update();}

 function open(){if(active)return;active=true;phase='ready';time=opening=0;toy=null;radius=OPEN_R;slipAt=Infinity;physics?.drop();drag=null;stickX=stickZ=0;paid=false;reward=null;reveal.clear();startBadge.hidden=true;root.visible=true;document.getElementById('clawReveal')?.remove();target.set(0,2.64,0);crane.position.copy(target);if(poolKey!==(practice?'test:':'real:')+SKIN_IDS.filter(id=>practice||!owns(id)).sort().join(','))fill();ui.classList.remove('hidden');document.getElementById('menu').classList.add('clawing');message(dolls.length?'':'Все персонажи уже открыты');refresh();}
 function refresh(){const c=collection();button.disabled=!dolls.length||(!practice&&!paid&&(c.coins<50||SKIN_IDS.every(owns)))||!['ready','aim','done'].includes(phase);button.textContent=phase==='aim'?'ОПУСТИТЬ КЛЕШНЮ':phase==='done'?(practice?'ЕЩЁ РАЗ · БЕСПЛАТНО':'ЕЩЁ РАЗ · 50 ФИСТОВ'):(practice?'ИГРАТЬ · БЕСПЛАТНО':'ИГРАТЬ · 50 ФИСТОВ');back.disabled=!['ready','aim','collect','done'].includes(phase);practiceButton.disabled=!['ready','done'].includes(phase);practiceButton.textContent=practice?'ТРЕНИРОВКА: БЕЗЛИМИТ ВКЛ':'БЕСПЛАТНАЯ ТРЕНИРОВКА';practiceButton.setAttribute('aria-pressed',String(practice));}
 function training(value=!practice){if(!['ready','done'].includes(phase))return;practice=!!value;try{localStorage.setItem('friendslop.clawPractice',practice?'1':'0');}catch{}reveal.clear();toy=null;reward=null;phase='ready';time=0;fill();target.set(0,2.64,0);message(practice?'Безлимитные попытки. Тестовые награды не меняют коллекцию.':'');refresh();}
 practiceButton.onclick=()=>training();
 /* v0.59: пальцы сжимаются по контуру игрушки: для каждого из трёх пальцев ищем, где по его направлению кончается тело
    игрушки на высоте пальцев (по коробкам-коллайдерам частей тела), и сжимаем до этой границы (+1.5 см) */
 const _cq=new THREE.Quaternion(),_cp=new V3();
 function contactRadius(toy){const tipY=crane.position.y-.14-DEPTH,palmY=crane.position.y-.1,cx=crane.position.x,cz=crane.position.z;let sum=0,n=0;
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,dx=Math.cos(a),dz=-Math.sin(a);let ext=0;
   for(const box of toy.colliders){const yLo=box.center.y-box.half.y,yHi=box.center.y+box.half.y;
    for(const sx of[-1,0,1])for(const sy of[-1,0,1])for(const sz of[-1,0,1]){_cp.set(box.center.x+sx*box.half.x,box.center.y+sy*box.half.y,box.center.z+sz*box.half.z).applyQuaternion(toy.g.quaternion).add(toy.g.position);
     if(_cp.y<tipY-.04||_cp.y>palmY+.04)continue;ext=Math.max(ext,(_cp.x-cx)*dx+(_cp.z-cz)*dz);}}
   if(ext>0){sum+=ext;n++;}}
  return n?clamp(sum/n+.015,CLOSED_R,OPEN_R):clamp(Math.hypot(toy.g.position.x-cx,toy.g.position.z-cz)+.12,CLOSED_R,OPEN_R);}
 function profile(d){const min=new V3(Infinity,Infinity,Infinity),max=new V3(-Infinity,-Infinity,-Infinity);let radius=0;for(const point of d.support){relative.copy(point).applyQuaternion(d.g.quaternion);min.min(relative);max.max(relative);radius=Math.max(radius,Math.hypot(relative.x+d.g.position.x-crane.position.x,relative.z+d.g.position.z-crane.position.z));}return{top:max.y,bottom:min.y,height:max.y-min.y,radius};}

 function close(){if(!active||!['ready','aim','collect','done'].includes(phase))return;if(paid&&!reward&&!refundClaw()){message('Не удалось сохранить возврат. Повтори');return;}if(phase==='collect'&&!practice){const id=finishClaw();if(!id){message('Не удалось сохранить награду');return;}paid=false;onReward(id);}reveal.clear();highlight.clear();aimPick=null;startBadge.hidden=true;active=false;keys.clear();drag=null;stickX=stickZ=0;aim.visible=false;sparks.visible=false;frontLight.intensity=.35;if(toy?.held){toy.g.scale.setScalar(0);batch?.update();}root.visible=true;ui.classList.add('hidden');document.getElementById('menu').classList.remove('clawing');controller.onClose?.();}
 function collectPrize(){if(phase!=='collect')return;const id=practice?toy.id:finishClaw();if(!id){message('Не удалось сохранить награду. Нажми на фигурку ещё раз');return;}phase='reveal';time=0;start=toy.g.position.clone();paid=false;message('');reveal.start(id,practice);if(!practice)onReward(id);toy.g.scale.setScalar(0);batch?.update();sfx('win');refresh();}
 function drop(){if(!active)return;press=.22;if(phase==='done'){reveal.clear();toy=null;reward=null;phase='ready';time=0;fill();target.set(0,2.64,0);radius=OPEN_R;}if(phase==='ready'){if(!practice&&!beginClaw()){message('Недостаточно фистов или не удалось сохранить попытку');return;}paid=!practice;phase='start';time=0;startBadge.hidden=false;message('');refresh();sfx('count');return;}
  if(phase!=='aim')return;toy=null;lock=aimPick?.toy||null;highlight.clear();slipAt=Infinity;
  phase='lower';time=0;start=crane.position.clone();target.copy(start);aim.visible=false;keys.clear();drag=null;stickX=stickZ=0;refresh();sfx('crane');}
 button.onclick=drop;back.onclick=()=>{close();};
 for(const el of document.querySelectorAll('[data-claw]')){el.onpointerdown=e=>{e.preventDefault();keys.add(el.dataset.claw);el.setPointerCapture(e.pointerId);};el.onpointerup=el.onpointercancel=()=>keys.delete(el.dataset.claw);}
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
 const caster=new THREE.Raycaster(),pointer=new THREE.Vector2();let lastCamera=null,drag=null,press=0,stickX=0,stickZ=0;
 function pick(e){if(!lastCamera)return null;root.updateWorldMatrix(true,true);pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);caster.setFromCamera(pointer,lastCamera);return caster.intersectObjects([...(phase==='collect'?[prizeHit]:[]),stickHit,buttonHit],false)[0]?.object.userData.control;}
 function key(code){if(!active)return false;if(keys.has(code))return true;keys.add(code);if(code==='Escape')close();else if(['Space','Enter'].includes(code))drop();return true;}
 function pointerMove(e,camera){lastCamera=camera;if(!active||!drag)return;stickX=clamp((e.clientX-drag.x)/55,-1,1);stickZ=clamp((e.clientY-drag.y)/55,-1,1);}
 addEventListener('pointerdown',e=>{if(!active||e.button!==0||e.target.closest?.('button'))return;const hit=pick(e);if(hit==='prize'&&phase==='collect'){collectPrize();}else if(hit==='drop'){press=.18;drop();}else if(hit==='stick'&&phase==='aim'){drag={x:e.clientX,y:e.clientY};e.preventDefault();}});
 addEventListener('pointerup',()=>{drag=null;stickX=stickZ=0;});addEventListener('blur',()=>{drag=null;stickX=stickZ=0;});
 function update(dt){if(!active)return;dt=Math.min(.05,dt);time+=dt;
  if(phase==='start'){if(time>.72){phase='aim';time=0;startBadge.hidden=true;aim.visible=true;refresh();}}
  else if(phase==='aim'||phase==='ready'){if(phase==='aim'){target.x=clamp(target.x+((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stickX)*dt*.9,-1.1,1.1);target.z=clamp(target.z+((keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+stickZ)*dt*.9,-.68,.68);}crane.position.lerp(target,1-Math.exp(-dt*10));}
  /* v0.56: физический захват. Клешня опускается, пока пальцы не упрутся в игрушку (или дно); пальцы сжимаются
     до касания; игрушка, которая реально оказалась между пальцами, повисает на шарнире под клешнёй. Схватил
     не по центру — по дороге выскользнет. В лоток игрушка попадает, только если доехала. */
  else if(phase==='lower'){crane.position.y=Math.max(1.48,crane.position.y-dt*1.35);radius=OPEN_R;const top=lock?Math.max(topUnder(crane.position.x,crane.position.z,OPEN_R*.5),lock.g.position.y+profile(lock).top-.08):topUnder(crane.position.x,crane.position.z,OPEN_R*.8);
   if(crane.position.y<=Math.max(1.48,top+.36)||crane.position.y<=1.48){crane.position.y=Math.max(1.48,Math.min(crane.position.y,top+.36));phase='grip';time=0;start=crane.position.clone();cand=candidate();
    if(lock){const q=profile(lock),d=Math.hypot(lock.g.position.x-crane.position.x,lock.g.position.z-crane.position.z);cand={toy:lock,dist:d,half:Math.max(.08,Math.min(.3,q.radius-d)),top:lock.g.position.y+q.top};}
    closeR=cand?contactRadius(cand.toy):CLOSED_R;physics.ghost(true);bob=1;sfx('squeak',{v:.4});}}
  else if(phase==='grip'){radius=THREE.MathUtils.lerp(OPEN_R,closeR,ease(time/.45));if(time>.55){
    if(cand){toy=cand.toy;slipAt=Infinity;physics.take(toy);const q=profile(toy);hang={from:toy.g.position.clone().sub(crane.position),to:new V3(0,-.3-q.top,0),q0:toy.g.quaternion.clone(),q1:new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),Math.atan2(2*(toy.g.quaternion.w*toy.g.quaternion.y),1-2*toy.g.quaternion.y*toy.g.quaternion.y)),t:0};swing.x=swing.z=swing.vx=swing.vz=0;sfx('click');flash=1;phase='lift';}
    else phase='retry';time=0;start=crane.position.clone();}}
  else if(phase==='retry'||phase==='slip'){physics.ghost(false);crane.position.set(start.x,THREE.MathUtils.lerp(start.y,2.64,ease(time/.95)),start.z);radius=THREE.MathUtils.lerp(radius,OPEN_R,1-Math.exp(-dt*4));if(time>.95){message(phase==='slip'?'Выскользнул! Попробуй ещё раз':'Пусто - попробуй ещё раз');phase='aim';time=0;target.copy(crane.position);aim.visible=true;toy=null;refresh();}}
  else if(phase==='lift'){physics.ghost(false);crane.position.y=THREE.MathUtils.lerp(start.y,2.64,ease(time/1.2));if(time>1.2){phase='carry';time=0;start=crane.position.clone();}}
  else if(phase==='carry'){crane.position.lerpVectors(start,new V3(-.95,2.64,.72),ease(time/1.25));if(time>1.25){phase='deliver';physics.drop();physics.remove(toy);hang=null;time=0;start=toy.g.position.clone();sfx('pop');
    if(practice||reserveClaw(toy.id))reward=toy.id;else{message('Не удалось сохранить. Можно повторить');}}}
  else if(phase==='deliver'){radius=THREE.MathUtils.lerp(closeR,OPEN_R,ease(time/.45));const fallTime=Math.sqrt(Math.max(0,start.y-.60)/4.5),fall=Math.min(fallTime,time);toy.g.position.set(start.x,Math.max(.60,start.y-4.5*fall*fall),start.z);if(time>fallTime){const k=ease((time-fallTime)/.72);toy.g.position.set(-.95,.60-.17*k+Math.sin(k*Math.PI)*.045,THREE.MathUtils.lerp(start.z,1.38,k));if(!landed){landed=true;sfx('land',{v:.8});flash=1.2;}}toy.g.quaternion.slerp(new THREE.Quaternion(),dt*4);if(time>fallTime+.77){landed=false;phase=reward?'collect':'aim';time=0;if(reward){message('ЛКМ - забрать');}else{toy.g.scale.setScalar(0);toy=null;target.copy(crane.position);aim.visible=true;}refresh();}}
  if(['lift','carry'].includes(phase)&&toy&&(phase==='lift'?time:time+1.2)>slipAt){physics.drop();sfx('squeak');sfx('drop');phase='slip';time=0;start=crane.position.clone();slipAt=Infinity;toy=null;}
  else if(phase==='collect'&&lastCamera){const point=root.localToWorld(new V3(-.95,.15,1.45)).project(lastCamera);msg.style.cssText='position:fixed;right:auto;transform:translateX(-50%);font-weight:700';msg.style.left=(point.x*.5+.5)*innerWidth+'px';msg.style.top=Math.min(innerHeight-115,(.5-point.y*.5)*innerHeight)+'px';}
  else if(phase==='reveal'&&time>1.1){phase='done';time=0;refresh();}

  const age=phase==='reveal'?time:phase==='done'?time+1.1:9;if(['reveal','done'].includes(phase))reveal.update(dt,age,lastCamera);sparks.visible=age<2.2;if(sparks.visible){const fade=Math.max(0,1-age/2.2);for(let i=0;i<18;i++){const angle=i*2.4,r=.2+age*.65;sparkPose.position.set(Math.cos(angle)*r,.75+Math.sin(i*19)*age*.45+age*.9-age*age*.3,2.05+Math.sin(angle)*r*.32);sparkPose.scale.setScalar(.035*fade);sparkPose.rotation.set(age*2,i,age*3);sparkPose.updateMatrix();sparks.setMatrixAt(i,sparkPose.matrix);}sparks.instanceMatrix.needsUpdate=true;}frontLight.intensity=.35+(age<1.5?Math.sin(age/1.5*Math.PI)*.65:0);
  press=Math.max(0,press-dt);cap.position.y+=(.045-(press>0?.035:0)-cap.position.y)*(1-Math.exp(-dt*30));joystick.rotation.z=-(stickX+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0))*.30;joystick.rotation.x=(stickZ+(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0))*.30;/* v0.58: каретка покачивается от разгона, игрушка висит маятником (плавно подтягивается под клешню, без рывка),
     на дне клешня чуть «проседает» на тросе */
  craneV.copy(crane.position).sub(prevCrane).divideScalar(Math.max(dt,1e-3));prevCrane.copy(crane.position);
  swing.vx+=(-craneV.x*1.1-swing.x*26)*dt;swing.vz+=(-craneV.z*1.1-swing.z*26)*dt;swing.vx*=Math.exp(-dt*3.2);swing.vz*=Math.exp(-dt*3.2);swing.x=clamp(swing.x+swing.vx*dt,-.32,.32);swing.z=clamp(swing.z+swing.vz*dt,-.32,.32);
  crane.rotation.set(swing.z*.35,0,-swing.x*.35);bob=Math.max(0,bob-dt*2.5);
  if(hang&&toy){hang.t=Math.min(1,hang.t+dt/.35);const k=ease(hang.t),off=hang.from.clone().lerp(hang.to,k);off.applyEuler(new THREE.Euler(swing.z,0,-swing.x));toy.g.position.copy(crane.position).add(off);qtmp.copy(hang.q0).slerp(hang.q1,k);toy.g.quaternion.copy(qtmp).premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(swing.z,0,-swing.x)));toy.v.copy(craneV);}
physics.claw(crane.position,radius,DEPTH,dt,!['deliver','collect','reveal','done'].includes(phase));const dynamic=physics.moving||!!physics.holding||['lift','carry','deliver'].includes(phase);physics.update(dt);if(dynamic)batch?.update();flash=Math.max(0,flash-dt*2);
  chase+=dt*(['idle','ready'].includes(phase)?4:phase==='reveal'||phase==='done'||flash>0?18:9);for(let i=0;i<30;i++){const on=flash>0?(Math.floor(chase*2)%2===0):((i+Math.floor(chase))%3===0);bulbs.setColorAt(i,on?(i%2&&flash>0?bulbPink:bulbOn):bulbOff);}bulbs.instanceColor.needsUpdate=true;
  if(phase==='aim'||phase==='ready'){
   if(Math.hypot(crane.position.x-lastPickX,crane.position.z-lastPickZ)>.001||dynamic||!Number.isFinite(lastPickX)){aimPick=clawTarget(root,dolls,crane.position.x,crane.position.z);lastPickX=crane.position.x;lastPickZ=crane.position.z;}
   aim.position.set(crane.position.x,(aimPick?.point.y??1.05)+.018,crane.position.z);aimMaterial.color.setHex(aimPick?0xffdf8e:0x9397a2);aimMaterial.opacity=.68+Math.sin(time*3)*.10;highlight.update(phase==='aim'?aimPick?.toy||null:null);if(phase==='aim')message(aimPick?'В прицеле: '+SKINS[aimPick.toy.id].name:'Под клешнёй пусто');
  }
  bridge.position.z=crane.position.z;cable.position.set(crane.position.x,(2.80+crane.position.y)/2,crane.position.z);cable.scale.y=Math.max(.03,2.80-crane.position.y);for(const{arm,rail,joint}of sliders){arm.position.x=radius;arm.scale.y=1;arm.rotation.z=(radius-CLOSED_R)/(OPEN_R-CLOSED_R)*.18-.05;rail.position.x=(radius+.085)/2;rail.scale.x=Math.max(.02,radius-.085);joint.position.x=radius;}
 }
 fill();crane.position.copy(target);const controller={root,open,close,update,collectPrize,cameraPose(camera,ready=false){if(camera)lastCamera=camera;let p=new V3(0,2.50,4.35),l=new V3(0,1.60,.2);if(!ready&&['start','aim','lower','grip','retry'].includes(phase)){p.set(0,3.25,3.65);l.set(0,1.48,.05);}if(!ready&&['grip','lift','carry'].includes(phase)&&toy){const q=profile(toy);l.copy(toy.g.position);l.y+=(q.top+q.bottom)*.5;p.set(crane.position.x*.5+.30,Math.min(2.85,l.y+.62),3.15);}else if(!ready&&['deliver','collect'].includes(phase)){p.set(-.55,1.25,3.05);l.set(-.95,.5,1.45);}else if(!ready&&['reveal','done'].includes(phase)){p.set(0,1.65,5.65);l.set(0,1.07,2.08);}return{p:root.localToWorld(p),l:root.localToWorld(l)};},key,pointerMove,joystick,redButton,get sleeping(){return dolls.filter(d=>d.physics?.sleepState===2).length;},get batches(){return batch?.drawCalls||0;},get active(){return active;},get presentation(){return reveal.active?reveal:null;},get practice(){return practice;},get aimPick(){return aimPick;},get mechanism(){return sliders;},training,get grip(){return{radius:gripRadius,depth:gripDepth,crane:crane.position.clone(),toy,profile:toy?profile(toy):null};},get phase(){return phase;},get dolls(){return dolls;},get target(){return target;},drop};return controller;
}
