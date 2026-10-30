import {THREE,G,V3,mesh,col,tmat,lam} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {sfx} from '../core/sfx.js';
// One patty at a time: no hidden timers while assembling the sandwich.
export function burgerGame(o,api,ctx){
 api.feedback?.();const s=o.spot,F=new V3(...[s.f[0],0,s.f[1]]),root=new THREE.Group();root.position.set(s.bx,s.by,s.bz);root.rotation.y=Math.atan2(F.x,F.z);W.group.add(root);
 api.pose(root.position.clone().addScaledVector(F,1.35).add(new V3(0,1.55,0)),root.position.clone());
 const wood=tmat(T.wood()),steel=tmat(T.metal());mesh(G.box,col(0x393440),-.33,0,0,.66,.12,.5,root);mesh(G.box,wood,.37,.01,0,.62,.05,.55,root);
 for(let i=0;i<9;i++)mesh(G.box,steel,-.60+i*.067,.07,0,.016,.025,.46,root);
 for(const x of[-.55,-.3,-.05])mesh(G.box,col(0xe68d45),x,.035,0,.04,.02,.36,root);
 const raw=new THREE.Color(0xce7977),cooked=new THREE.Color(0x72442e);
 const patty=new THREE.Group();root.add(patty);patty.position.set(.38,.08,-.16);
 const top=mesh(G.cyl12,lam({color:0xce7977}),0,.012,0,.105,.022,.105,patty),bottom=mesh(G.cyl12,lam({color:0xce7977}),0,-.01,0,.105,.022,.105,patty);
 const parts=[mesh(G.cyl12,col(0xdba05d),.18,.09,.16,.115,.05,.115,root),patty,mesh(G.box,col(0xf3c75c),.48,.075,.16,.22,.018,.21,root),mesh(G.cyl12,col(0x7ba956),.62,.08,-.10,.12,.02,.12,root),mesh(G.sph10,col(0xe5ad68),.22,.1,-.15,.12,.075,.12,root)];
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=48;const tex=new THREE.CanvasTexture(canvas);tex.magFilter=THREE.NearestFilter;const mat=new THREE.SpriteMaterial({map:tex,depthTest:false}),cue=new THREE.Sprite(mat);cue.position.set(-.33,.32,0);cue.scale.set(.65,.12,1);root.add(cue);let old='';
 function label(text){if(text===old)return;old=text;const c=canvas.getContext('2d');c.clearRect(0,0,256,48);c.fillStyle='#28232de6';c.fillRect(0,0,256,48);c.font='bold 23px monospace';c.textAlign='center';c.fillStyle='#f0d4a3';c.fillText(text,128,32);tex.needsUpdate=true;}
 let phase='raw',side=0,times=[0,0],layer=0,good=0,end=0,flip=0;
 const messages=['Нижняя булочка','Готовая котлета','Сыр','Салат','Верхняя булочка'];
 const homes=parts.map(p=>p.position.clone());
 function reset(){parts.forEach((p,i)=>p.position.copy(homes[i]));phase='raw';side=0;times=[0,0];layer=0;patty.position.set(.38,.08,-.16);patty.rotation.x=0;for(const p of parts)p.visible=true;api.msg('Положи сырую котлету на гриль - ЛКМ');}
 function click(index){if(end>0)return;if(phase==='raw'){if(index!==1)return;patty.position.set(-.33,.11,0);phase='cook';sfx('hiss');return;}if(phase==='cook'){if(index!==1||flip>0)return;if(times[side]<3){api.msg('Пока сырая - дождись подсказки');return;}if(side===0){side=1;flip=.4;sfx('hiss');}else{phase='stack';api.msg('Собери: '+messages.join(' → '));label('ГОТОВО');}return;}if(index!==layer){api.msg('Следующий слой: '+messages[layer]);return;}parts[index].position.set(.39,.08+layer*.045,.02);layer++;api.progress((good+layer/5)/3);sfx('pickup');if(layer===5){good++;api.msg('Бургер '+good+'/3','good');if(good===3){end=.8;sfx('done');}else reset();}}
 reset();return{down(ray){const hits=ray.intersectObjects(parts,true);if(!hits.length)return;const i=parts.findIndex(p=>p===hits[0].object||p.children.includes(hits[0].object));click(i);},botStep(dt,brain){if(!brain.ready(.4))return;click(phase==='stack'?layer:1);},update(dt){if(end>0){end-=dt;if(end<=0)api.finish({success:true,mult:1});return;}if(phase==='cook'){if(flip>0){flip=Math.max(0,flip-dt);patty.rotation.x=(1-flip/.4)*Math.PI;}else times[side]+=dt;top.material.color.copy(raw).lerp(cooked,Math.min(1,times[1]/3));bottom.material.color.copy(raw).lerp(cooked,Math.min(1,times[0]/3));label(times[side]>=3?(side?'СНЯТЬ':'ПЕРЕВЕРНУТЬ'):'ЖАРИТСЯ');if(times[side]>7){api.msg('Сгорела! Возьми новую котлету','bad');reset();}}else if(phase==='raw')label('КОТЛЕТУ НА ГРИЛЬ');},stop(){root.removeFromParent();tex.dispose();mat.dispose();top.material.dispose();bottom.material.dispose();}};
}
