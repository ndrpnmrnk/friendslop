import { THREE,G,V3,mesh,col,tmat,sprite } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from '../world/state.js';
import { addSolid } from '../world/physics.js';
import { addItem } from '../game/items.js';
import { sfx } from '../core/sfx.js';
import { toolHand } from '../game/handheld.js';
import { mammothModel,pantsTexture } from '../characters/mammoth.js';
export function buildMammoth(x,y,z,f){
 const{g,body}=mammothModel();g.position.set(x,y,z);g.rotation.y=Math.atan2(f[0],f[1])+Math.PI;W.group.add(g);const rx=f[0]?1.1:.86,rz=f[0]?.86:1.1,solid=addSolid(x-rx,z-rz,x+rx,z+rz,y,y+2.35);let t=0;const tick=dt=>{t+=dt;body.scale.y=1+Math.sin(t*1.4)*.008;};W.animated.push(tick);
 return{g,body,solid,f,reach:2.5,pos:()=>g.position,front:()=>g.localToWorld(new V3(0,0,-2)),dispose(){g.removeFromParent();solid.on=false;const i=W.animated.indexOf(tick);if(i>=0)W.animated.splice(i,1);}};
}
export function mammothWorld(o,api,ctx){api.feedback?.();const P=ctx.player,spot=o.g.localToWorld(new V3(1.3,.1,-1.65)),pants=addItem('mammothpants',spot.x,spot.y,spot.z);pants.mission=ctx.mission;let time=100;api.msg('Возьми трусики рядом с мамонтом и подойди сзади');return{botItems:()=>[pants],botTarget:()=>P.held===pants?o.front():pants.pos,target:()=>P.held===pants?o.front():pants.pos,prompt:()=>P.held===pants&&P.pos.distanceTo(o.front())<2?'<b>E</b>Надеть трусики мамонту':'',interact(){if(P.held===pants&&P.pos.distanceTo(o.front())<2){api.finish({chain:'mammothDress'});return true;}return false;},update(dt){time-=dt;api.timer(time);api.progress(P.held===pants?.25:0);if(time<=0||pants.state==='gone')api.finish({success:false});},stop(){if(pants.owner?.held===pants)pants.owner.held=null;pants.state='gone';pants.g.visible=false;}};}
export function mammothDress(o,api,ctx){
 api.feedback?.();ctx.cursor(true);
 const N=32,rows=5,p=new Float32Array((N+1)*rows*3),uv=new Float32Array((N+1)*rows*2),idx=[];
 for(let j=0;j<rows;j++)for(let i=0;i<=N;i++){const k=j*(N+1)+i;uv[k*2]=i/N*3;uv[k*2+1]=1-j/(rows-1);if(j<rows-1&&i<N){const b=k+N+1;idx.push(k,b,k+1,k+1,b,b+1);}}
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(p,3));geom.setAttribute('uv',new THREE.BufferAttribute(uv,2));geom.setIndex(idx);
 const mat=tmat(pantsTexture(),{side:THREE.DoubleSide}),cloth=new THREE.Mesh(geom,mat);cloth.name='mammoth-briefs';o.g.add(cloth);cloth.frustumCulled=false;geom.boundingSphere=new THREE.Sphere(new V3(0,1,0),3);
 const grip=new THREE.Group();o.g.add(grip);toolHand(ctx,grip);grip.visible=false;
 const heights=[.25,.25,.25,.25],vel=[0,0,0,0],plane=new THREE.Plane(),hit=new V3();let page=0,side=0,selected=-1,hy=0,base=0,goal=.25,turn=0,end=-1,bott=0;
 const look=new V3(),eye=new V3();
 function pose(){const z=page?1:-1;look.copy(o.g.localToWorld(new V3(0,.95,z*.7)));eye.copy(o.g.localToWorld(new V3(1.7,1.85,z*3.6)));api.pose(eye,look);plane.setFromNormalAndCoplanarPoint(eye.clone().sub(look).normalize(),look);}
 function msg(){api.msg((page?'Спереди: ':'Сзади: ')+(side?'подтяни справа':'подтяни слева')+' - ЛКМ по ткани, тяни вверх');}
 function release(){if(selected<0)return;const i=selected;heights[i]=Math.min(1.33,Math.max(base,heights[i]));vel[i]=0;selected=-1;side=1-side;sfx('cloth');msg();}
 pose();msg();
 return{get heights(){return heights;},get page(){return page;},
 down(ray){if(end>=0||turn>0)return;o.g.updateMatrixWorld(true);const h=ray.intersectObject(cloth);if(!h.length||!ray.ray.intersectPlane(plane,hit))return;selected=page*2+side;base=heights[selected];hy=hit.y;goal=base;},
 move(ray){if(selected<0||!ray.ray.intersectPlane(plane,hit))return;goal=Math.min(1.38,base+Math.max(0,hit.y-hy)*.8);},up:release,
 botStep(dt,brain){bott+=dt;if(turn>0)return;if(selected<0){const ix=page?(side?4:28):(side?12:20),q=geom.attributes.position,local=new V3();for(const v of [ix,ix+1,ix+N+1])local.add(new V3(q.getX(v),q.getY(v),q.getZ(v)));local.multiplyScalar(1/3);this.down(brain.rayTo(o.g.localToWorld(local)));}else{goal=Math.min(1.38,goal+dt*.45);if(heights[selected]-base>.25||heights[selected]>1.31)release();}},
 update(dt){turn=Math.max(0,turn-dt);for(let i=0;i<4;i++){const target=i===selected?goal:heights[i];vel[i]+=(target-heights[i])*65*dt;vel[i]*=Math.exp(-12*dt);heights[i]=Math.min(1.35,Math.max(.22,heights[i]+vel[i]*dt));}
 for(let j=0;j<rows;j++)for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,x=Math.sin(a),z=Math.cos(a),front=z>0,left=x<0,k=(front?2:0)+(left?0:1),op=(front?0:2)+(left?0:1),top=heights[k]*.8+heights[op]*.2,y=Math.max(.12,top-j/(rows-1)*.50),body=Math.sqrt(Math.max(0,1-((y-1.5)/.94)**2)),n=(j*(N+1)+i)*3;p[n]=x*Math.max(.80,.96*body+.05);p[n+1]=y+Math.sin(a*4+bott*2)*.009;p[n+2]=z*Math.max(.90,1.25*body+.055);}
 geom.attributes.position.needsUpdate=true;geom.computeVertexNormals();grip.visible=selected>=0;if(selected>=0)grip.position.set(side?.75:-.75,heights[selected],page?1.02:-1.02);
 if(selected<0&&heights[page*2]>=1.29&&heights[page*2+1]>=1.29){if(!page){page=1;side=0;turn=.7;pose();msg();}else if(end<0){end=.8;sfx('done');api.msg('Натянули!','good');}}
 api.progress(heights.reduce((s,y)=>s+(y-.25)/1.08,0)/4);if(end>=0){end-=dt;if(end<=0)api.finish({success:true,mult:1});}
 },stop(){grip.removeFromParent();cloth.removeFromParent();geom.dispose();mat.dispose();ctx.cursor(true);}};
}
