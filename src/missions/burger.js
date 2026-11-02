import {THREE,G,V3,mesh,col,tmat,compose,glow} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {sfx} from '../core/sfx.js';
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
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=48;const tex=new THREE.CanvasTexture(canvas);tex.magFilter=tex.minFilter=THREE.NearestFilter;const mat=new THREE.SpriteMaterial({map:tex,depthTest:true}),cue=new THREE.Sprite(mat);cue.position.set(-.85,.40,0);cue.scale.set(.82,.15,1);root.add(cue);let old='';
 function label(text){if(text===old)return;old=text;const c=canvas.getContext('2d');c.clearRect(0,0,256,48);c.fillStyle='#28232de6';c.fillRect(0,0,256,48);c.font='bold 23px monospace';c.textAlign='center';c.fillStyle='#f0d4a3';c.fillText(text,128,32);tex.needsUpdate=true;}
 let phase='raw',side=0,times=[0,0],layer=0,end=0,flip=0,motion=null,age=0,stopped=false;
 const messages=['Нижняя булочка','Готовая котлета','Сыр','Салат','Верхняя булочка'],raw=new THREE.Color(0xe5a1a0),cooked=new THREE.Color(0x79513a);
 function move(p,to,done,straighten=false){motion={p,from:p.position.clone(),to:to.clone(),t:0,done,angle:p.rotation.x,straighten};}
 function reset(){parts.forEach((p,i)=>{p.position.copy(homes[i]);p.rotation.set(0,0,0);});phase='raw';side=0;times=[0,0];layer=0;flip=0;motion=null;sides.forEach(p=>p.material.color.copy(raw));api.progress(0);api.msg('Котлету на гриль - ЛКМ. Собери один бургер по фото');}
 function click(index){if(end>0||motion||flip>0)return;
  if(phase==='raw'){if(index!==1)return;move(patty,new V3(-.85,.135,0),()=>{phase='cook';sfx('hiss');});return;}
  if(phase==='cook'){if(index!==1)return;if(times[side]<3){api.msg('Пока сырая - дождись подсказки');return;}if(side===0){side=1;flip=.45;sfx('hiss');}else{phase='stack';label('ОБЕ СТОРОНЫ ГОТОВЫ');api.msg('Собери снизу вверх: булочка, котлета, сыр, салат, булочка');}return;}
  if(index!==layer){api.msg('Следующий слой: '+messages[layer]);return;}
  const y=.058+BURGER_HEIGHTS.slice(0,layer).reduce((a,b)=>a+b,0);move(parts[index],new V3(.62,y,.06),()=>{layer++;api.progress(layer/5);sfx('pickup');if(layer===5){end=.9;label('БУРГЕР ГОТОВ');api.msg('Бургер собран!','good');sfx('done');}},index===1);
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
    sides[0].material.color.copy(raw).lerp(cooked,Math.min(1,times[0]/3));sides[1].material.color.copy(raw).lerp(cooked,Math.min(1,times[1]/3));label(times[side]>=3?(side?'СНЯТЬ':'ПЕРЕВЕРНУТЬ'):'ЖАРИТСЯ');
    if(times[side]>7){api.msg('Сгорела! Возьми новую котлету','bad');reset();}
   }else if(phase==='raw')label('КОТЛЕТУ НА ГРИЛЬ');
  },
  stop(){if(stopped)return;stopped=true;outlines.forEach(o=>o.set(false));photo?.dispose();if(sample)disposeBurger(sample);parts.forEach(disposeBurger);root.removeFromParent();tex.dispose();mat.dispose();}
 };
}
