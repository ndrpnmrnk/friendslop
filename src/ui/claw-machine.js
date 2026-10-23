import {THREE,G,V3,mesh,col,tmat,lam,glow,compose} from '../core/gfx.js';
import {T,pix} from '../core/textures.js';
import {makeCharacter} from '../characters/rig.js';
import {SKINS,SKIN_IDS} from '../characters/skins.js';
import {collection,owns,beginClaw,reserveClaw,finishClaw,refundClaw} from '../game/collection.js';
import {sfx} from '../core/sfx.js';
const clamp=THREE.MathUtils.clamp,up=new V3(0,1,0),delta=new V3(),qtmp=new THREE.Quaternion();
const ease=k=>{k=clamp(k,0,1);return k*k*(3-2*k);};

/* Небольшая замкнутая физическая песочница. Корпуса - сферы, ладони/ступни -
   пружинные шарниры. Фиксированный шаг и ограниченные объёмы не дают игрушкам вылетать. */
function doll(id,x,y,z){const c=makeCharacter(id),g=new THREE.Group();c.animate(.1,{t:0,speed:0});c.blob.visible=c.stars.visible=false;
 const scale=.36,pivot=new THREE.Group();g.add(pivot);pivot.add(c.root);c.root.scale.setScalar(scale);c.root.position.y=-.80*scale;
 const points=[];pivot.updateWorldMatrix(true,true);c.root.traverse(o=>{if(!o.isMesh||o===c.blob)return;for(let p=o;p;p=p.parent)if(!p.visible)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)points.push(new V3(a.getX(i),a.getY(i),a.getZ(i)).applyMatrix4(o.matrixWorld));});
 const support=[];for(const x of[-1,0,1])for(const y of[-1,0,1])for(const z of[-1,0,1]){if(!x&&!y&&!z)continue;const dir=new V3(x,y,z);let best=points[0],score=-Infinity;for(const p of points){const d=p.dot(dir);if(d>score){score=d;best=p;}}if(best)support.push(best.clone());}
 g.position.set(x,y,z);g.quaternion.setFromEuler(new THREE.Euler(-1.3+Math.random()*.35,Math.random()*6.28,(Math.random()-.5)*.6));
 const joints=[c.handL,c.handR,c.footL,c.footR].map(part=>({part,rest:part.position.clone(),v:new V3(),off:new V3()}));
 return{id,c,g,pivot,joints,support,v:new V3(),av:new V3((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2),r:.31,held:false,dispose(){c.root.removeFromParent();c.blob.material.dispose();for(const s of c.stars.children)s.material.dispose();g.removeFromParent();}};}
function stepDolls(list,dt){for(const d of list){if(d.held)continue;d.v.y-=9*dt;d.g.position.addScaledVector(d.v,dt);d.v.multiplyScalar(Math.exp(-dt*.7));
 for(const axis of['x','z']){const limit=(axis==='x'?1.48:1.04)-d.r;if(Math.abs(d.g.position[axis])>limit){d.g.position[axis]=clamp(d.g.position[axis],-limit,limit);d.v[axis]*=-.12;d.av.multiplyScalar(.7);}}
 let floor=1.03;for(const p of d.support)floor=Math.max(floor,1.045-delta.copy(p).applyQuaternion(d.g.quaternion).y);if(d.g.position.y<floor){d.g.position.y=floor;d.v.y=Math.abs(d.v.y)>.2?-d.v.y*.12:0;d.v.x*=.9;d.v.z*=.9;d.av.multiplyScalar(.94);}if(d.g.position.y>2.5-d.r){d.g.position.y=2.5-d.r;d.v.y=Math.min(0,d.v.y);}
 const spin=d.av.length();if(spin>.001){qtmp.setFromAxisAngle(delta.copy(d.av).normalize(),spin*dt);d.g.quaternion.premultiply(qtmp);d.av.multiplyScalar(Math.exp(-dt*1.2));}
 const grav=up.clone().multiplyScalar(-1).applyQuaternion(d.g.quaternion.clone().invert());for(const j of d.joints){j.v.addScaledVector(j.off,-dt*70).addScaledVector(j.v,-dt*10).addScaledVector(grav,dt*.65);j.off.addScaledVector(j.v,dt);j.off.clampLength(0,.13);j.part.position.copy(j.rest).add(j.off);j.part.rotation.z=j.off.x*2;}}
 for(let pass=0;pass<3;pass++)for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j];if(a.held||b.held)continue;delta.subVectors(b.g.position,a.g.position);const len=delta.length(),r=a.r+b.r;if(len>=r)continue;if(len<.001)delta.set(.1,1,.05).normalize();else delta.multiplyScalar(1/len);const pen=(r-len)*.51;a.g.position.addScaledVector(delta,-pen);b.g.position.addScaledVector(delta,pen);const closing=b.v.clone().sub(a.v).dot(delta);if(closing<0){a.v.addScaledVector(delta,closing*.52);b.v.addScaledVector(delta,-closing*.52);}a.av.x+=delta.z*.025;b.av.z-=delta.x*.025;}
 // Геометрические опоры уточняют контакт с полом/стеклом после сферических контактов.
 for(const d of list)if(!d.held){const lo=new V3(Infinity,Infinity,Infinity),hi=new V3(-Infinity,-Infinity,-Infinity);for(const p of d.support){delta.copy(p).applyQuaternion(d.g.quaternion);lo.min(delta);hi.max(delta);}const floor=1.03-lo.y+.015;d.g.position.x=clamp(d.g.position.x,-1.48-lo.x+.03,1.48-hi.x-.03);d.g.position.z=clamp(d.g.position.z,-1.04-lo.z+.03,1.04-hi.z-.03);if(d.g.position.y<floor){d.g.position.y=floor;d.v.y=0;}d.g.position.y=Math.min(d.g.position.y,2.73-hi.y-.03);}}

export function createClaw(scene,onReward){
 const root=new THREE.Group();root.position.set(5.1,.15,.1);scene.add(root);root.visible=false;
 const insideLight=new THREE.PointLight(0xffe3b0,2,6);insideLight.position.set(0,3.6,0);root.add(insideLight);const frontLight=new THREE.PointLight(0xb6cbd2,4,6);frontLight.position.set(0,1.8,3);root.add(frontLight);
 const paint=tmat(T.paintMetal(0x577d82)),trim=tmat(T.metal()),dark=col(0x252c3b),cream=col(0xcfc4aa),pink=col(0xb87587);
 root.add(compose('claw38-cabinet',a=>{a(G.box,paint,0,.48,0,3.3,.92,2.4);a(G.box,dark,0,1.0,0,3.05,.10,2.2);a(G.box,paint,0,3.1,0,3.34,.43,2.42);a(G.box,tmat(T.sign('ВЫЛОВИ ДРУГА','#323d51','#f2d587')),0,3.13,1.225,2.95,.30,.025);
  for(const x of[-1.57,1.57])for(const z of[-1.12,1.12]){a(G.box,trim,x,2.04,z,.10,2.10,.10);a(G.box,dark,x,.10,z,.14,.20,.14);}a(G.box,paint,0,2.03,-1.13,3.08,2.05,.05);a(G.box,tmat(T.sign('FRIENDSLOP','#526b78','#93aaa3')),0,2.35,-1.09,2.4,.36,.02);
  for(const z of[-.95,.95])a(G.box,trim,0,2.86,z,2.95,.06,.06);for(const x of[-1.35,1.35])a(G.box,trim,x,2.86,0,.05,.05,2.0);
  a(G.box,paint,0,.93,1.35,3.3,.22,.52,.18);a(G.box,dark,.9,.93,1.64,.07,.16,.03);a(G.box,trim,.9,.93,1.665,.015,.11,.015);a(G.box,pink,.45,1.07,1.43,.27,.055,.27);
  a(G.cyl8,dark,-.48,1.10,1.43,.055,.16,.055);a(G.sphL,pink,-.48,1.21,1.43,.105,.105,.105);a(G.box,cream,0,.70,1.21,3.12,.05,.035);
  a(G.box,dark,-.94,.43,1.215,.80,.49,.025);for(const x of[-1.37,-.51])a(G.box,trim,x,.43,1.25,.05,.56,.06);a(G.box,trim,-.94,.14,1.26,.91,.05,.06);
  a(G.box,tmat(T.sign('50 МОНЕТ','#394a51','#e3ce8c')),.53,.43,1.22,1.35,.27,.02);for(let i=0;i<5;i++)a(G.box,dark,1.24,.18+i*.04,1.22,.19,.013,.016);
  for(const x of[-1.48,1.48]){a(G.box,glow(0xb6a581),x,2.05,-1.07,.025,1.6,.025);a(G.box,trim,x,1.04,0,.08,.05,2.1);}
 }));
 const glass=lam({color:0xa6c6ce,transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide},'claw38-glass');mesh(G.plane,glass,0,2.08,1.105,3.02,1.96,1,root);for(const s of[-1,1])mesh(G.plane,glass,s*1.515,2.08,0,2.14,1.96,1,root).rotation.y=s*Math.PI/2;
 // Пара отражённых штрихов на стекле, без дополнительных прозрачных слоёв.
 for(const s of[-1,1]){const m=mesh(G.box,col(0x78929c),s*1.3,2.3,1.111,.018,.44,.008,root);m.rotation.z=-.35;}
 const bridge=new THREE.Group();root.add(bridge);mesh(G.box,trim,0,2.83,0,2.75,.08,.12,bridge);
 const crane=new THREE.Group();root.add(crane);const cable=mesh(G.cyl6,dark,0,0,0,.018,1,.018,root),fingers=[];
 mesh(G.cyl8,paint,0,0,0,.13,.23,.13,crane);mesh(G.cyl8,trim,0,-.14,0,.08,.12,.08,crane);
 for(let i=0;i<3;i++){const pivot=new THREE.Group();pivot.rotation.y=i*Math.PI*2/3;crane.add(pivot);const arm=new THREE.Group();pivot.add(arm);arm.position.y=-.14;
  const curve=new THREE.CatmullRomCurve3([new V3(0,0,0),new V3(.18,-.14,0),new V3(.21,-.33,0),new V3(.07,-.43,0)]),geo=new THREE.TubeGeometry(curve,5,.025,4,false);mesh(geo,trim,0,0,0,1,1,1,arm);fingers.push(arm);}
 const aim=mesh(G.ring,col(0xdbbf6c),0,1.025,0,.21,.21,1,root);aim.rotation.x=-Math.PI/2;aim.visible=false;
 const ui=document.getElementById('clawUI'),msg=document.getElementById('clawMessage'),button=document.getElementById('clawDrop'),back=document.getElementById('clawBack');
 let active=false,phase='idle',time=0,acc=0,toy=null,start=null,paid=false,opening=0,dolls=[],keys=new Set(),target=new V3(0,2.64,0),reward=null;
 const message=s=>{msg.textContent=s;};
 function fill(){for(const d of dolls)d.dispose();dolls=[];const pool=SKIN_IDS.filter(id=>!owns(id));for(let i=pool.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[pool[i],pool[j]]=[pool[j],pool[i]];}for(let i=0;i<Math.min(10,Math.max(pool.length,8));i++){if(!pool.length)break;const id=pool[i%pool.length],d=doll(id,(i%3-1)*.72+(Math.random()-.5)*.22,1.42+Math.floor(i/6)*.55,(Math.floor(i/3)%2-.5)*.94+(Math.random()-.5)*.16);root.add(d.g);dolls.push(d);}for(let i=0;i<90;i++)stepDolls(dolls,1/60);}
 function open(){if(active)return;active=true;phase='ready';time=0;paid=false;reward=null;root.visible=true;target.set(0,2.64,0);crane.position.copy(target);fill();ui.classList.remove('hidden');document.getElementById('menu').classList.add('clawing');message(dolls.length?'Наведи клешню над нужной фигуркой':'Все персонажи уже открыты');refresh();}
 function refresh(){const c=collection();button.disabled=!dolls.length||(!paid&&c.coins<50)||!['ready','aim'].includes(phase);button.textContent=paid?'ОПУСТИТЬ КЛЕШНЮ':'ИГРАТЬ · 50 МОНЕТ';back.disabled=!['ready','aim','done'].includes(phase);document.getElementById('clawBalance').textContent=c.coins;}
 function close(){if(!active||!['ready','aim','done'].includes(phase))return;if(paid&&!reward&&!refundClaw()){message('Не удалось сохранить возврат. Повтори');return;}active=false;keys.clear();root.visible=false;ui.classList.add('hidden');document.getElementById('menu').classList.remove('clawing');for(const d of dolls)d.dispose();dolls=[];}
 function drop(){if(!active)return;if(phase==='ready'){if(!beginClaw()){message('Недостаточно монет или не удалось сохранить попытку');return;}paid=true;phase='aim';aim.visible=true;message('WASD / стрелки - клешня · ЛКМ по стеклу / кнопка - опустить');refresh();return;}
  if(phase!=='aim')return;const distance=d=>Math.hypot(d.g.position.x-target.x,d.g.position.z-target.z),near=dolls.filter(d=>distance(d)<.38);toy=near.length?near.reduce((a,b)=>a.g.position.y>b.g.position.y?a:b):dolls.reduce((a,b)=>distance(a)<distance(b)?a:b);if(!reserveClaw(toy.id)){message('Не удалось сохранить. Попробуй ещё раз');return;}reward=toy.id;phase='align';time=0;start=crane.position.clone();aim.visible=false;keys.clear();refresh();sfx('crane');}
 button.onclick=drop;back.onclick=()=>{close();};
 for(const el of document.querySelectorAll('[data-claw]')){el.onpointerdown=e=>{e.preventDefault();keys.add(el.dataset.claw);el.setPointerCapture(e.pointerId);};el.onpointerup=el.onpointercancel=()=>keys.delete(el.dataset.claw);}
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
 const caster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new V3(0,1,0),-(root.position.y+2.64)),hit=new V3();
 function key(code){if(!active)return false;if(keys.has(code))return true;keys.add(code);if(code==='Escape')close();else if(['Space','Enter'].includes(code))drop();return true;}
 addEventListener('keydown',e=>{if(active&&['Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
 function pointerMove(e,camera){if(!active||phase!=='aim'||!e.buttons||e.target.closest?.('button'))return;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);caster.setFromCamera(pointer,camera);if(caster.ray.intersectPlane(plane,hit)){root.worldToLocal(hit);target.x=clamp(hit.x,-1.1,1.1);target.z=clamp(hit.z,-.68,.68);}}
 let dragged=false;addEventListener('pointerdown',()=>{dragged=false;});addEventListener('pointermove',e=>{if(active&&e.buttons)dragged=true;});
 addEventListener('pointerup',e=>{if(active&&phase==='aim'&&!dragged&&!e.target.closest?.('button'))drop();});
 function update(dt){if(!active)return;dt=Math.min(.05,dt);acc+=dt;while(acc>=1/60){stepDolls(dolls,1/60);acc-=1/60;}time+=dt;
  if(phase==='aim'||phase==='ready'){if(phase==='aim'){target.x=clamp(target.x+((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0))*dt*.9,-1.1,1.1);target.z=clamp(target.z+((keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0))*dt*.9,-.68,.68);}crane.position.lerp(target,1-Math.exp(-dt*10));aim.position.set(target.x,1.027,target.z);}
  else if(phase==='align'){crane.position.lerpVectors(start,new V3(toy.g.position.x,2.64,toy.g.position.z),ease(time/.45));if(time>.45){phase='lower';time=0;start=crane.position.clone();}}
  else if(phase==='lower'){const goal=toy.g.position.clone().add(new V3(0,.41,0));crane.position.lerpVectors(start,goal,ease(time/1.1));if(time>1.1){phase='grip';time=0;toy.held=true;toy.v.set(0,0,0);opening=0;sfx('click');}}
  else if(phase==='grip'){opening=ease(time/.45);if(time>.5){phase='lift';time=0;start=crane.position.clone();message('Есть! Держим крепко…');}}
  else if(phase==='lift'){crane.position.y=THREE.MathUtils.lerp(start.y,2.64,ease(time/1.2));if(time>1.2){phase='carry';time=0;start=crane.position.clone();}}
  else if(phase==='carry'){crane.position.lerpVectors(start,new V3(-.95,2.64,.72),ease(time/1.25));if(time>1.25){phase='deliver';time=0;start=toy.g.position.clone();}}
  else if(phase==='deliver'){opening=1-ease(time/.45);toy.g.position.lerpVectors(start,new V3(-.95,.48,1.38),ease(time/1.15));toy.g.quaternion.slerp(new THREE.Quaternion(),dt*3);if(time>1.2){const id=finishClaw();if(id){phase='reveal';time=0;start=toy.g.position.clone();paid=false;message('Твой новый друг - '+SKINS[id].name+'!');onReward(id);sfx('win');refresh();}else{message('Награда сохранена. Заверши выдачу');time=1.15;}}}
  else if(phase==='reveal'){const k=ease(time/1.1);toy.g.position.lerpVectors(start,new V3(0,.72,2.05),k);toy.g.position.y+=Math.sin(k*Math.PI)*.35;toy.g.scale.setScalar(1+k*1.4);toy.g.quaternion.slerp(new THREE.Quaternion(),dt*7);toy.c.animate(dt,{t:time,speed:0,wave:true});toy.c.blob.visible=false;if(time>1.1){phase='done';time=0;refresh();}}
  else if(phase==='done'&&toy){toy.c.animate(dt,{t:time,speed:0,wave:time<1.2});toy.c.blob.visible=false;}
  if(toy?.held&&['grip','lift','carry'].includes(phase)){toy.g.position.copy(crane.position).add(new V3(0,-.44,0));const tilt=Math.sin(time*5)*.06;toy.g.rotation.set(.12,0,tilt);}
  bridge.position.z=crane.position.z;cable.position.set(crane.position.x,(2.80+crane.position.y)/2,crane.position.z);cable.scale.y=Math.max(.03,2.80-crane.position.y);for(const f of fingers)f.rotation.z=-opening*.45;
 }
 return{root,open,close,update,key,pointerMove,get active(){return active;},get phase(){return phase;},get dolls(){return dolls;},get target(){return target;},drop};
}
