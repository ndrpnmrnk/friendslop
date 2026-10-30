import { THREE,V3 } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import {actors,daze} from '../game/actors.js';
import {smoke,puff,burst} from '../world/particles.js';
import { addSolid } from '../world/physics.js';
import { addItem } from '../game/items.js';
import { sfx } from '../core/sfx.js';
import { toolHand } from '../game/handheld.js';
import { mammothModel,pantsTexture } from '../characters/mammoth.js';
export function buildMammoth(x,y,z,f){
 const{g,body}=mammothModel();g.position.set(x,y,z);g.rotation.y=Math.atan2(f[0],f[1])+Math.PI;W.group.add(g);const rx=f[0]?1.1:.86,rz=f[0]?.86:1.1,solid=addSolid(x-rx,z-rz,x+rx,z+rz,y,y+2.35);let t=0;const tick=dt=>{t+=dt;body.scale.y=1+Math.sin(t*1.4)*.008;};W.animated.push(tick);
 return{g,body,solid,f,reach:3.3,approach(p){const q=p.clone().sub(g.position);q.y=0;q.clampLength(0,1.6);return g.position.clone().add(q);},pos:()=>g.position,front:()=>g.localToWorld(new V3(0,0,-2)),dispose(){g.removeFromParent();solid.on=false;const i=W.animated.indexOf(tick);if(i>=0)W.animated.splice(i,1);}};
}
export function mammothWorld(o,api,ctx){api.feedback?.();const P=ctx.player,spot=o.g.localToWorld(new V3(1.3,.1,-1.65)),pants=addItem('mammothpants',spot.x,spot.y,spot.z);pants.mission=ctx.mission;let time=100;api.msg('Возьми трусики и подойди к мамонту');return{botItems:()=>[pants],botTarget:()=>P.held===pants?o.front():pants.pos,target:()=>P.held===pants?o.front():pants.pos,prompt:()=>P.held===pants&&Math.hypot(P.pos.x-o.g.position.x,P.pos.z-o.g.position.z)<3.3?'<b>E</b>Надеть трусики мамонту':'',interact(){if(P.held===pants&&Math.hypot(P.pos.x-o.g.position.x,P.pos.z-o.g.position.z)<3.3){api.finish({chain:'mammothDress'});return true;}return false;},update(dt){time-=dt;api.timer(time);api.progress(P.held===pants?.25:0);if(time<=0||pants.state==='gone')api.finish({success:false});},stop(){if(pants.owner?.held===pants)pants.owner.held=null;pants.state='gone';pants.g.visible=false;}};}
export function mammothDress(o,api,ctx){
 api.feedback?.();ctx.cursor(true);
 // Общие индексы пояса, промежности и штанин: три открытые кромки, без разрезов ткани.
 const N=48,meta=[],indices=[],verts=[],uv=[],colors=[];
 const add=(v,u,w)=>{const i=meta.length;meta.push(v);verts.push(0,0,0);uv.push(u,w);colors.push(1,1,1);return i;};
 const join=(a,b)=>{for(let i=0;i<a.length;i++){const j=(i+1)%a.length;indices.push(a[i],b[i],a[j],a[j],b[i],b[j]);}};
 const waist=[];for(let r=0;r<3;r++){const ring=[];for(let i=0;i<N;i++)ring.push(add({kind:'band',a:i/N*Math.PI*2,row:r},i/N*3,1-r*.12));waist.push(ring);if(r)join(waist[r-1],ring);}
 const bridge=[];for(let j=1;j<6;j++)bridge.push(add({kind:'bridge',t:j/6},.5,j/6));
 for(let side=0;side<2;side++){
  const edge=side?[...waist[2].slice(N/2),waist[2][0],...bridge]:[...waist[2].slice(0,N/2+1),...[...bridge].reverse()];let prev=edge;
  for(let row=1;row<=6;row++){const ring=edge.map((source,i)=>add({kind:'leg',source,side,k:row/6,a:(side?Math.PI:0)+i/edge.length*Math.PI*2},i/edge.length*2,1-row/6));join(prev,ring);prev=ring;}
 }
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geom.setIndex(indices);
 const mat=new THREE.MeshLambertMaterial({map:pantsTexture(),side:THREE.DoubleSide,vertexColors:true}),cloth=new THREE.Mesh(geom,mat);cloth.name='mammoth-briefs';cloth.frustumCulled=false;o.body.add(cloth);
 const innerMat=new THREE.MeshLambertMaterial({color:0x2e5a3c,side:THREE.BackSide}),inner=new THREE.Mesh(geom,innerMat);inner.frustumCulled=false;inner.visible=false;inner.raycast=()=>{};o.body.add(inner);
 const grip=new THREE.Group();o.g.add(grip);toolHand(ctx,grip);grip.visible=false;
 const heights=[.28,.28,.28,.28],velocity=[0,0,0,0],fixed=[false,false,false,false],flash=[0,0,0,0],plane=new THREE.Plane(),hit=new V3(),eye=new V3(),look=new V3(),targetEye=new V3(),targetLook=new V3(),local=new V3();let page=0,side=0,active=0,selected=-1,hy=0,base=0,goal=.28,turn=0,end=-1,time=0,gasT=0,fireworks=false;const origin=o.g.position.clone(),bodyRotation=o.body.rotation.clone();
 const part=(x,z)=>(z>0?2:0)+(x<0?0:1);
 function pose(snap=false){const z=page?1:-1,x=side?1:-1;targetLook.copy(o.g.localToWorld(new V3(x*.55,1.05,z*.83)));targetEye.copy(o.g.localToWorld(new V3(x*2.5,1.9,z*3.0)));if(snap){eye.copy(targetEye);look.copy(targetLook);}api.pose(eye,look);}
 function message(){api.msg((page?'Спереди: ':'Сзади: ')+(side?'правый':'левый')+' светлый край - зажми ЛКМ и подтяни вверх');}
 function release(){if(selected<0)return;const i=selected;velocity[i]=0;if(heights[i]>1.28){heights[i]=1.34;fixed[i]=true;flash[i]=.8;sfx('click');selected=-1;active++;if(active<4){page=Math.floor(active/2);side=active%2;turn=.9;pose();message();}else{end=0;turn=0;api.msg('Трусики на месте!','good');sfx('done');}return;}sfx('cloth');selected=-1;message();}
 function project(q){
  // Мягкая оболочка корпуса и четыре ноги удерживают ткань снаружи шерсти.
  const y=(q.y-1.5)/.97,r=Math.hypot(q.x/.99,y,q.z/1.28)/1.014;if(r<1&&r>.01){q.x/=r;q.y=1.5+(q.y-1.5)/r;q.z/=r;}
  if(q.y<1.38)for(const x of [-.59,.59])for(const z of [-.73,.73]){const dx=q.x-x,dz=q.z-z,d=Math.hypot(dx,dz),radius=q.y>.9?.39:.33;if(d<radius){q.x=x+(d>.001?dx/d:Math.sign(x))*radius;q.z=z+(d>.001?dz/d:0)*radius;}}
  q.y=Math.max(.055,q.y);return q;
 }
 function deform(){const pos=geom.attributes.position,c=geom.attributes.color;
  for(let i=0;i<meta.length;i++){const v=meta[i];let x=0,y=0,z=0,k=0;if(v.kind==='band'){x=Math.sin(v.a);z=Math.cos(v.a);k=part(x,z);const other=k<2?k+2:k-2,blend=Math.min(1,Math.abs(z)*2);y=heights[k]*blend+(heights[k]+heights[other])*.5*(1-blend)-v.row*.13;x*=.99;z*=1.28;}
   else if(v.kind==='bridge'){y=heights.reduce((a,b)=>a+b,0)/4-.38;z=1.28-v.t*2.56;k=part(0,z);}
   else{const sx=pos.getX(v.source),sy=pos.getY(v.source),sz=pos.getZ(v.source),sign=v.side?-1:1,low=Math.max(.08,Math.min(heights[0],heights[1])-.58);x=sx*(1-v.k)+(sign*.59+Math.sin(v.a)*.37)*v.k;y=sy*(1-v.k)+low*v.k;z=sz*(1-v.k)+(-.73+Math.cos(v.a)*.4)*v.k;k=part(x,z);}
   local.set(x,y,z);project(local);
   if(v.kind!=='band'||v.row>0){const slack=1-Math.min(1,(heights[k]-.26)/1.08),ang=v.kind==='leg'?v.a*3+v.k*4:v.kind==='band'?v.a*9:v.t*7,fold=(.012+.03*slack)*Math.sin(ang+time*.8*slack);const nx=local.x,ny=(local.y-1.5)*.6,nz=local.z*.8,l=Math.hypot(nx,ny,nz)||1;local.x+=nx/l*fold;local.y+=ny/l*fold;local.z+=nz/l*fold;}
   if(v.kind==='band'&&v.row===0){const nx=local.x,nz=local.z,l=Math.hypot(nx,nz)||1;local.x+=nx/l*.018;local.z+=nz/l*.018;} // резинка толще
   pos.setXYZ(i,local.x,local.y,local.z);const lit=v.kind==='band'&&v.row===0&&k===active&&!fixed[k],pulse=.5+.5*Math.sin(time*5);c.setXYZ(i,flash[k]>0?.60:1,flash[k]>0?1:lit?.84+pulse*.16:.91,flash[k]>0?.58:lit?.35+pulse*.45:.95);
  }pos.needsUpdate=c.needsUpdate=true;geom.computeVertexNormals();
 }
 pose(true);deform();message();
 return{get heights(){return heights;},get page(){return page;},get cloth(){return cloth;},
 down(ray){if(end>=0||turn>0)return;o.g.updateMatrixWorld(true);const hits=ray.intersectObject(cloth);if(!hits.length||!ray.ray.intersectPlane(plane,hit))return;const q=o.g.worldToLocal(hits[0].point.clone()),i=page*2+(q.x<0?0:1);if(fixed[i]||i!==active)return;side=i%2;selected=i;base=heights[i];hy=hit.y;goal=base;},
 move(ray){if(selected<0||!ray.ray.intersectPlane(plane,hit))return;goal=Math.min(1.38,base+Math.max(0,hit.y-hy)*.85);},up:release,
 botStep(dt,brain){if(turn>0||end>=0)return;if(selected<0){const pos=geom.attributes.position,ind=geom.index;for(let j=0;j<ind.count;j+=3){const q=new V3();for(let k=0;k<3;k++)q.add(new V3().fromBufferAttribute(pos,ind.getX(j+k)));q.multiplyScalar(1/3);if((q.x<0?0:1)!==side)continue;const ray=brain.rayTo(o.g.localToWorld(q));const hits=ray.intersectObject(cloth);if(!hits.length)continue;const front=o.g.worldToLocal(hits[0].point.clone());if((front.x<0?0:1)!==side)continue;this.down(ray);if(selected>=0)break;}}else{goal=Math.min(1.38,goal+dt*.48);if(heights[selected]-base>.24||heights[selected]>1.30)release();}},
 update(dt){time+=dt;turn=Math.max(0,turn-dt);for(let i=0;i<4;i++){flash[i]=Math.max(0,flash[i]-dt);if(fixed[i])continue;const target=i===selected?goal:heights[i];velocity[i]+=(target-heights[i])*65*dt;velocity[i]*=Math.exp(-12*dt);heights[i]=Math.min(1.36,Math.max(.26,heights[i]+velocity[i]*dt));}
  for(const [a,b]of [[0,1],[2,3],[0,2],[1,3]]){const low=heights[a]<heights[b]?a:b,high=low===a?b:a;if(!fixed[low]&&heights[high]-heights[low]>.42)heights[low]+=dt*.28;}
  deform();eye.lerp(targetEye,1-Math.exp(-dt*4));look.lerp(targetLook,1-Math.exp(-dt*4));api.pose(eye,look);plane.setFromNormalAndCoplanarPoint(eye.clone().sub(look).normalize(),look);grip.visible=selected>=0;if(selected>=0)grip.position.set(side?.83:-.83,heights[selected],page?1.08:-1.08);
  api.progress(heights.reduce((s,y)=>s+Math.max(0,(y-.28)/1.06),0)/4);
  if(end>=0){end+=dt;selected=-1;const crouch=Math.min(1,end/.9),rise=Math.max(0,Math.min(1,(end-.9)/2.1)),lift=rise*rise*(3-2*rise);o.body.rotation.x=bodyRotation.x-Math.sin(crouch*Math.PI)*.25;o.body.scale.set(1+Math.sin(crouch*Math.PI)*.12,1-Math.sin(crouch*Math.PI)*.18,1+Math.sin(crouch*Math.PI)*.12);o.g.position.y=origin.y+-Math.sin(crouch*Math.PI)*.18+lift*18;o.solid.on=end<.9;
    gasT-=dt;if(gasT<=0&&end>.5){gasT=.10;const p=o.g.localToWorld(new V3(0,.55,-.6));smoke(p.x,p.y,p.z,{color:0x80b64f,size:.35,grow:1.6,life:1.7,vy:-2.5,g:-.4});for(const a of actors())if(a!==ctx.player&&!a.hidden&&a.pos.distanceTo(origin)<3.6)daze(a,1.35);}
    targetLook.copy(o.g.position).y+=1.1;targetEye.copy(origin).add(new V3(4.8,3.8,5.5));eye.lerp(targetEye,1-Math.exp(-dt*3));look.lerp(targetLook,1-Math.exp(-dt*4));api.pose(eye,look);if(end>3&&!fireworks){fireworks=true;o.g.visible=false;for(const color of[0xff6aa8,0xffd04a,0x7ad8ff,0x9be36b])burst(o.g.position.x,o.g.position.y+1,o.g.position.z,18,{color,size:.16,speed:5,up:3,life:1.6});W.flash?.(o.g.position,0xffd99b,1.8,24);sfx('pop',{at:o.g.position,range:150});}if(end>4.2)api.finish({success:true,mult:1});
  }

 },stop(){o.g.visible=true;o.body.scale.set(1,1,1);o.g.position.copy(origin);o.body.rotation.copy(bodyRotation);o.solid.on=true;grip.removeFromParent();cloth.removeFromParent();inner.removeFromParent();geom.dispose();mat.dispose();innerMat.dispose();ctx.cursor(true);}};
}
