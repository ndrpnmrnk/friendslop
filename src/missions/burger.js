import {THREE,G,V3,mesh,col,tmat,compose,glow} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {sfx} from '../core/sfx.js';
import {puff} from '../world/particles.js';
import {addOutline} from '../game/outline.js';
import {photoCard} from './photo-card.js';
import {BURGER_LAYERS,BURGER_HEIGHTS,burgerLayer,burgerSample,disposeBurger} from './burger-model.js';
// Одна котлета, две стороны, один бургер. Все продукты стоят на отдельной рабочей поверхности.
export function burgerGame(o,api,ctx){
 api.feedback?.();const s=o.spot,F=new V3(s.f[0],0,s.f[1]),root=new THREE.Group();root.name='burger-worktop';root.userData.noOcc=true;root.position.set(s.bx,s.by,s.bz);root.rotation.y=Math.atan2(F.x,F.z);W.group.add(root);
 api.pose(root.localToWorld(new V3(.05,1.7,1.55)),root.localToWorld(new V3(.05,.03,0)));
 const steel=tmat(T.metal()),dark=tmat(T.paintMetal(0x484951));
 root.add(compose('burger0633-griddle',a=>{a(G.box,dark,-.85,.045,0,.9,.09,.85);a(G.box,steel,-.85,.10,0,.86,.025,.80);for(let i=0;i<9;i++)a(G.box,col(0x302d30),-1.21+i*.09,.12,0,.018,.018,.73);for(const x of[-1.08,-.63]){a(G.cyl8,col(0x292a2f),x,.045,.44,.045,.055,.045,Math.PI/2);a(G.box,glow(0xe7a15a),x,.045,.472,.025,.012,.007);}a(G.box,tmat(T.wood()),.62,.027,0,1.35,.054,.91);for(const z of[-.38,.38])a(G.box,col(0xa57443),.62,.055,z,1.23,.006,.016);}));
 const homes=[new V3(.23,.058,.23),new V3(.62,.058,-.23),new V3(1.02,.058,.23),new V3(1.02,.058,-.23),new V3(.23,.058,-.23)];
 const parts=BURGER_LAYERS.map((kind,i)=>{const p=burgerLayer(kind,kind==='patty');p.position.copy(homes[i]);root.add(p);return p;}),patty=parts[1],sides=patty.sides,outlines=parts.map(p=>addOutline(p,.008));
 const sample=ctx?.bot?null:burgerSample(),photo=sample?photoCard(sample,{title:'СОБЕРИ БУРГЕР',width:160,height:160,supersample:4,steps:5,background:0x77654e,view:[.45,.65,1]}):null;
 // v0.71 J7: вместо надписей - иконка-таймер над грилем в стиле игры: кольцо прожарки, огонь, «перевернуть», галочка, «горит»
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const tex=new THREE.CanvasTexture(canvas);tex.magFilter=tex.minFilter=THREE.NearestFilter;const mat=new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}),cue=new THREE.Sprite(mat);cue.renderOrder=5;cue.position.set(-.85,.42,0);cue.scale.set(.24,.24,1);root.add(cue);let old='';
 function label(kind,k=0){const key=kind+(k*20|0);if(key===old)return;old=key;cue.visible=!!kind;if(!kind)return;const c=canvas.getContext('2d');c.clearRect(0,0,64,64);
  c.fillStyle='#28232de6';c.beginPath();c.arc(32,32,28,0,7);c.fill();c.lineWidth=6;c.strokeStyle='#4a4250';c.beginPath();c.arc(32,32,24,0,7);c.stroke();
  const ring={cook:'#f5c542',flip:'#9be36b',take:'#9be36b',burn:'#ff5a3a',grill:'#f0d4a3',done:'#9be36b'}[kind];c.strokeStyle=ring;c.beginPath();c.arc(32,32,24,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,k));c.stroke();
  c.fillStyle=ring;c.strokeStyle=ring;c.lineWidth=4;
  if(kind==='cook'||kind==='burn'){for(const[x,h]of[[22,14],[32,20],[42,14]]){c.beginPath();c.moveTo(x-5,44);c.quadraticCurveTo(x-6,44-h*.6,x,44-h);c.quadraticCurveTo(x+6,44-h*.6,x+5,44);c.fill();}}
  else if(kind==='flip'){c.beginPath();c.arc(32,32,11,Math.PI*1.1,Math.PI*1.9);c.stroke();c.beginPath();c.moveTo(43,25);c.lineTo(44,33);c.lineTo(36,30);c.fill();c.beginPath();c.arc(32,32,11,Math.PI*.1,Math.PI*.9);c.stroke();c.beginPath();c.moveTo(21,39);c.lineTo(20,31);c.lineTo(28,34);c.fill();}
  else if(kind==='take'||kind==='done'){c.beginPath();c.moveTo(20,33);c.lineTo(29,42);c.lineTo(45,22);c.stroke();}
  else if(kind==='grill'){c.beginPath();c.moveTo(32,16);c.lineTo(32,40);c.stroke();c.beginPath();c.moveTo(22,32);c.lineTo(32,44);c.lineTo(42,32);c.fill();}
  tex.needsUpdate=true;}
 let phase='raw',side=0,times=[0,0],layer=0,end=0,flip=0,motion=null,age=0,stopped=false,bump=0,shake=0,smokeT=0;
 const raw=new THREE.Color(0xe5a1a0),cooked=new THREE.Color(0x79513a);
 function move(p,to,done,straighten=false){motion={p,from:p.position.clone(),to:to.clone(),t:0,done,angle:p.rotation.x,straighten};}
 function reset(){parts.forEach((p,i)=>{p.position.copy(homes[i]);p.rotation.set(0,0,0);});phase='raw';side=0;times=[0,0];layer=0;flip=0;motion=null;sides.forEach(p=>p.material.color.copy(raw));api.progress(0);api.msg('Собери бургер как на фото');}
 function click(index){if(end>0||motion||flip>0)return;
  if(phase==='raw'){if(index!==1)return;move(patty,new V3(-.85,.135,0),()=>{phase='cook';sfx('hiss');});return;}
  if(phase==='cook'){if(index!==1)return;if(times[side]<3){sfx('hiss');bump=.25;return;}if(side===0){side=1;flip=.45;sfx('hiss');}else{phase='stack';label(null);sfx('points');}return;}
  if(index!==layer){sfx('click');shake=.3;return;}
  const y=.058+BURGER_HEIGHTS.slice(0,layer).reduce((a,b)=>a+b,0);move(parts[index],new V3(.62,y,.06),()=>{layer++;api.progress(layer/5);sfx('pickup');if(layer===5){end=.9;label('done',1);sfx('done');}},index===1);
 }
 reset();const checked=()=>BURGER_LAYERS.map((_,i)=>i<layer);
 return{root,parts,homes,photo,get phase(){return phase;},get layer(){return layer;},
  down(ray){if(motion)return;const hits=ray.intersectObjects(parts,true);if(!hits.length)return;let hit=hits[0].object;while(hit&&hit.parent!==root)hit=hit.parent;click(parts.indexOf(hit));},
  botStep(dt,brain){if(brain.ready(.4))click(phase==='stack'?layer:1);},
  afterCamera(){photo?.update(ctx.camera,0,{intro:1.5,checked:checked()});},
  update(dt){if(stopped)return;age+=dt;photo?.update(ctx.camera,dt,{intro:1.5,checked:checked()});const expected=phase==='stack'?layer:1;outlines.forEach((o,i)=>o.set(i===expected&&!motion&&end<=0));
   if(end>0){end-=dt;if(end<=0)api.finish({success:true,mult:1});return;}
   if(motion){const m=motion;m.t+=dt;const k=Math.min(1,m.t/.3);m.p.position.lerpVectors(m.from,m.to,k*k*(3-2*k));m.p.position.y+=Math.sin(k*Math.PI)*.10;if(m.straighten)m.p.rotation.x=m.angle*(1-k);if(k===1){motion=null;m.done();}return;}
   if(phase==='cook'){if(flip>0){flip=Math.max(0,flip-dt);const k=1-flip/.45;patty.rotation.x=k*Math.PI;patty.position.y=.135+.04*k+Math.sin(k*Math.PI)*.12;}else times[side]+=dt;
    sides[0].material.color.copy(raw).lerp(cooked,Math.min(1,times[0]/3));sides[1].material.color.copy(raw).lerp(cooked,Math.min(1,times[1]/3));const ts=times[side];label(ts>=5?'burn':ts>=3?(side?'take':'flip'):'cook',ts>=3?1-(ts-3)/4:ts/3);
    cue.position.y=.42+(ts>=3?Math.abs(Math.sin(age*6))*.04:0)+(bump>0?Math.sin(bump*40)*.015:0);bump=Math.max(0,bump-dt);
    // дым: светлый, пока жарится; густой и тёмный, когда подгорает
    smokeT-=dt;if(smokeT<=0&&flip<=0){smokeT=ts>=5?.08:.3;const p=patty.getWorldPosition(new V3());puff(p.x+(Math.random()-.5)*.1,p.y+.05,p.z+(Math.random()-.5)*.1,{color:ts>=5?0x3a3438:0xdad4dc,size:ts>=5?.16:.09,vy:.6,life:.8,opacity:ts>=5?.7:.35});}
    if(ts>7){sfx('hiss');label('burn',0);reset();}
   }else if(phase==='raw'){label('grill',1);cue.position.y=.42+Math.abs(Math.sin(age*4))*.04;}
   if(phase==='stack'&&parts[layer]){shake=Math.max(0,shake-dt);parts[layer].rotation.z=Math.sin(shake*50)*.5*shake;} // неверный слой - нужный продукт покачивается
  },
  stop(){if(stopped)return;stopped=true;outlines.forEach(o=>o.set(false));photo?.dispose();if(sample)disposeBurger(sample);parts.forEach(disposeBurger);root.removeFromParent();tex.dispose();mat.dispose();}
 };
}
