import { random } from '../core/random.js';
import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {mouse} from '../core/input.js';
import {W} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {toolHand} from '../game/handheld.js';
import {sfx} from '../core/sfx.js';
import {marketMiniature} from './shakir-diorama.js';
import {shakirAnt} from './shakir-ant.js';
import {chooseAntPlace,marketSurface} from './shakir-placement.js';
import {photoCard,renderPhoto} from './photo-card.js';
const RIM=new THREE.TorusGeometry(.204,.018,6,40),TRIM=new THREE.TorusGeometry(.187,.0035,4,40),GLASS=new THREE.CircleGeometry(.185,48);
export function buildShakir(x,y,z,f){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=Math.atan2(f[0],f[1]);W.group.add(g);const wood=tmat(T.wood()),pattern=random()*4|0;
 g.add(compose('shakir44-table',a=>{a(G.box,wood,0,.83,0,2.7,.12,1.8);for(const sx of[-1.13,1.13])for(const sz of[-.66,.66])a(G.box,col(0x514434),sx,.40,sz,.095,.80,.095);a(G.box,col(0x635c4f),0,.91,0,2.5,.06,1.6);a(G.box,tmat(T.sign('БЛОШИНЫЙ РЫНОК','#4e574b','#dbd4b1')),0,.69,.911,1.6,.20,.015);}));
 const market=new THREE.Group();market.position.y=.95;g.add(market);market.add(marketMiniature(pattern));
 const pose=random()*4|0,ant=shakirAnt(pose);ant.isShakir=true;ant.scale.setScalar(.27);ant.rotation.y=random()*Math.PI*2;const placement=chooseAntPlace(market,ant);market.add(ant);
 const wide=Math.abs(f[0])>.5,rx=wide?.9:1.35,rz=wide?1.35:.9,solid=addSolid(x-rx,z-rz,x+rx,z+rz,y+.77,y+.91);
 return{g,market,ant,pose,placement,solid,pos:()=>g.position,world:(x,y,z)=>g.localToWorld(new V3(x,y,z)),front:()=>g.localToWorld(new V3(0,0,1.7)),dispose(){solid.on=false;g.removeFromParent();}};
}
export function shakirGame(o,api,ctx){
 api.feedback();ctx.cursor?.(false);api.msg('Запомни Шакира: борода и красные боксёрские перчатки');
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x817761);scene.add(new THREE.HemisphereLight(0xe6dfcb,0x534759,2.2));const light=new THREE.DirectionalLight(0xffedc7,1.6);light.position.set(-1,3,2);scene.add(light);
 const copy=o.market.clone(true);copy.position.y=0;copy.rotation.set(0,0,0);scene.add(copy);const antCopy=copy.getObjectByName('shakir-ant'),rt=new THREE.WebGLRenderTarget(128,128,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter}),zoom=new THREE.OrthographicCamera(-.065,.065,.065,-.065,.01,10);
 const photo=ctx.bot?null:photoCard(shakirAnt(0),{title:'ШАКИР',background:0x656e60,view:[.3,.45,1]});
 const lens=new THREE.Group();lens.name='shakir-magnifier';W.group.add(lens);mesh(RIM,tmat(T.paintMetal(0x9b8f70)),0,0,0,1,1,1,lens);mesh(TRIM,col(0xd1c7a4),0,0,.009,1,1,1,lens);
 const glassMat=new THREE.MeshBasicMaterial({map:rt.texture,fog:false}),glass=mesh(GLASS,glassMat,0,0,.003,1,1,1,lens);
 glass.castShadow=false;
 lens.add(compose('shakir44-handle',a=>{a(G.cyl8,tmat(T.metal()),.153,-.153,0,.030,.15,.030,0,0,.78);a(G.cyl8,tmat(T.wood()),.259,-.259,0,.035,.23,.035,0,0,.78);for(let i=0;i<4;i++)a(G.cyl8,col(0x51402f),.218+i*.025,-.218-i*.025,0,.036,.009,.036,0,0,.78);a(G.cyl8,col(0xb5a480),.348,-.348,0,.037,.025,.037,0,0,.78);}));toolHand(ctx,lens,.28,-.28,-.035);
 const trackGeo=new THREE.RingGeometry(.228,.238,96),trackMat=new THREE.MeshBasicMaterial({color:0x625c56,transparent:true,opacity:.72,depthWrite:false}),track=mesh(trackGeo,trackMat,0,0,.006,1,1,1,lens);
 const fillGeo=new THREE.RingGeometry(.229,.237,96),fillMat=new THREE.MeshBasicMaterial({color:0xd3b878,depthWrite:false}),fill=mesh(fillGeo,fillMat,0,0,.008,1,1,1,lens);fill.visible=false;fill.castShadow=track.castShadow=false;
 const target=new V3(-.85,0,.55),focus=target.clone(),plane=new THREE.Plane(new V3(0,1,0),-o.g.position.y-.95),hit=new V3(),eye=o.world(0,4.65,.72),look=o.world(0,.95,0),wantedEye=eye.clone(),wantedLook=look.clone(),worldFocus=new V3(),direction=new V3(),last={x:mouse.x,y:mouse.y};let progress=0,t=0,renderT=0,done=-1,stopped=false,moved=false,scan=0,scanT=0;
 const pos=fillGeo.attributes.position,vertexCount=pos.count,radial=Array.from({length:vertexCount},(_,i)=>Math.hypot(pos.getX(i),pos.getY(i))),angle=Array.from({length:vertexCount},(_,i)=>Math.atan2(pos.getY(i),pos.getX(i)));
 function arc(k){fill.visible=k>.001;for(let i=0;i<vertexCount;i++){let a=angle[i];if(a<0)a+=Math.PI*2; // Seam vertices at 2π keep their final angle.
   if(i%(97)===96)a=Math.PI*2;a=-Math.PI/2+a*k;pos.setXYZ(i,Math.cos(a)*radial[i],Math.sin(a)*radial[i],0);}pos.needsUpdate=true;}
 function steer(dx,dz){target.x=THREE.MathUtils.clamp(target.x+dx,-1.10,1.10);target.z=THREE.MathUtils.clamp(target.z+dz,-.64,.64);}
 function visibleAnt(){const from=o.market.worldToLocal(eye.clone()),to=o.ant.position.clone().add(new V3(0,.025,0)),d=to.clone().sub(from),distance=d.length();const r=new THREE.Raycaster(from,d.normalize());const h=r.intersectObject(copy,true)[0];return!h||h.distance>distance-.012||h.object.parent?.name==='shakir-ant'||h.object.parent?.parent?.name==='shakir-ant';}
 if(!ctx.bot&&ctx.camera){const distance=Math.max(1,ctx.camera.position.distanceTo(look));eye.copy(ctx.camera.position);look.copy(eye).addScaledVector(ctx.camera.getWorldDirection(new V3()),distance);}
 const entryEye=eye.clone(),entryLook=look.clone();api.pose(eye,look);
 return{hint:'Мышь - лупа. Осмотри диораму и удержи Шакира в центре стекла',get focus(){return focus;},get progress(){return progress;},get lens(){return lens;},get zoom(){return zoom;},get target(){return target;},
  move(ray){if(stopped||done>=0)return;if(ctx.bot){if(!ray.ray.intersectPlane(plane,hit))return;const local=o.market.worldToLocal(hit.clone());target.set(THREE.MathUtils.clamp(local.x,-1.1,1.1),0,THREE.MathUtils.clamp(local.z,-.64,.64));return;}
   if(!moved){last.x=mouse.x;last.y=mouse.y;moved=true;return;}
   const dx=THREE.MathUtils.clamp(mouse.x-last.x,-180,180),dy=THREE.MathUtils.clamp(mouse.y-last.y,-180,180);last.x=mouse.x;last.y=mouse.y;moved=true;steer(dx*.0022,dy*.0022);},
  botStep(dt,brain){if(brain.time<3.2)return;scanT-=dt;if(scanT<=0){scanT=.35;scan++;}const p=o.placement.valid[scan%o.placement.valid.length];if(brain.time>10){target.x=o.ant.position.x;target.z=o.ant.position.z;}else{target.x=p.x;target.z=p.z;}},
  update(dt){if(stopped)return;dt=Math.min(.05,dt);t+=dt;if(!ctx.bot&&moved&&done<0){const x=mouse.x/Math.max(1,innerWidth),y=mouse.y/Math.max(1,innerHeight);steer((x>.96?1:x<.04?-1:0)*dt*.34,(y>.96?1:y<.04?-1:0)*dt*.28);}
   focus.x+=(target.x-focus.x)*(1-Math.exp(-dt*22));focus.z+=(target.z-focus.z)*(1-Math.exp(-dt*22));const sy=marketSurface(copy,focus.x,focus.z)??0;focus.y+=(sy+.025-focus.y)*(1-Math.exp(-dt*18));
   const search=THREE.MathUtils.smoothstep(t,2.6,8),height=3.7-search*2.32,w=.40+search*.60;wantedLook.copy(o.world(focus.x*w,.95+focus.y,focus.z*w));wantedEye.copy(wantedLook).add(o.world(0,height,.62-search*.32).sub(o.g.position));if(t<1.35){const k=THREE.MathUtils.smootherstep(t,0,1.35);eye.lerpVectors(entryEye,wantedEye,k);eye.y+=Math.sin(k*Math.PI)*.22;look.lerpVectors(entryLook,wantedLook,k);}else{eye.lerp(wantedEye,1-Math.exp(-dt*6));look.lerp(wantedLook,1-Math.exp(-dt*6));}api.pose(eye,look);
   const near=t>2.6&&Math.hypot(focus.x-o.ant.position.x,focus.z-o.ant.position.z)<.024&&Math.abs(focus.y-o.ant.position.y)<.065&&visibleAnt();if(done<0){progress=near?Math.min(1,progress+dt/2.8):Math.max(0,progress-dt*.55);api.progress(progress);if(progress>=1){done=.85;api.msg('Шакир найден!','good');sfx('done',{at:o.g.position,range:8});}}arc(progress);
   o.ant.rotation.y+=Math.sin(t*1.8)*dt*.045;antCopy.quaternion.copy(o.ant.quaternion);worldFocus.copy(o.market.localToWorld(focus.clone()));direction.copy(eye).sub(worldFocus).normalize();lens.position.copy(worldFocus).addScaledVector(direction,.29);lens.lookAt(eye);
   const localEye=o.market.worldToLocal(eye.clone());zoom.position.copy(focus).addScaledVector(localEye.sub(focus).normalize(),1.5);zoom.lookAt(focus);zoom.updateMatrixWorld(true);renderT-=dt;if(renderT<=0&&(!ctx.bot||W.player?.pos.distanceTo(o.g.position)<22)){renderT=1/30;renderPhoto(scene,zoom,rt);}
   photo?.update(ctx.camera,dt,{intro:2.6});if(done>=0){done-=dt;if(done<=0)api.finish({success:true,mult:1});}
  },
  afterCamera(){photo?.update(ctx.camera,0,{intro:2.6});},
  stop(){if(stopped)return;stopped=true;lens.removeFromParent();photo?.dispose();rt.dispose();glassMat.dispose();fillGeo.dispose();fillMat.dispose();trackGeo.dispose();trackMat.dispose();ctx.cursor?.(true);}
 };
}
