import {THREE,G,V3,mesh,col,tmat,compose,renderer} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {toolHand} from '../game/handheld.js';
import {sfx} from '../core/sfx.js';
const spots=[[-.90,-.62,0],[-.32,-.61,0],[.36,-.61,0],[-.96,.02,0],[-.32,.0,0],[.35,.0,0],[-.87,.58,0],[-.32,.60,0],[.35,.60,0],[-.95,-.30,.34],[.29,.33,.34],[.91,-.30,.34]];
function antModel(pose){const g=new THREE.Group();g.add(compose('shakir36-'+pose,a=>{const fur=col(0x65503e),black=col(0x302a2b);a(G.sphL,fur,0,.054,0,.028,.036,.033);a(G.sphL,fur,0,.035,-.04,.023,.025,.031);a(G.sphL,fur,0,.034,-.082,.036,.026,.045);a(G.sphL,black,0,.036,.024,.029,.029,.025);for(const s of [-1,1]){a(G.box,col(0xdcc89d),s*.013,.071,.030,.010,.011,.006);a(G.box,black,s*.014,.072,.034,.004,.006,.003);a(G.box,fur,s*.023,.099,.016,.004,.045,.004,0,0,-s*.3);for(let i=0;i<3;i++)a(G.box,black,s*.037,.018,-.015-i*.03,.044,.006,.005,0,s*.3,-s*.3);a(G.sphL,col(0xb84942),s*.052,.049+(pose===1?s*.018:0),.018,.026,.028,.024);a(G.box,col(0xd9c8a1),s*.052,.037,.015,.028,.009,.022);}for(let i=0;i<18;i++){const angle=i*2.4;a(G.box,fur,Math.sin(angle)*.029,.048+(i%4)*.01,-.01-Math.floor(i/4)*.018,.004,.024,.004,0,0,Math.sin(angle)*.7);}for(let i=0;i<5;i++)a(G.cone4,fur,(i-2)*.009,.017,.027,.008,.032,.008,0,0,Math.PI);}));return g;}
export function buildShakir(x,y,z,f){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=Math.atan2(f[0],f[1]);W.group.add(g);const wood=tmat(T.wood()),pattern=Math.random()*4|0;
 g.add(compose('shakir36-table',a=>{a(G.box,wood,0,.83,0,2.7,.12,1.8);for(const sx of [-1.13,1.13])for(const sz of [-.66,.66])a(G.box,col(0x514434),sx,.40,sz,.095,.80,.095);a(G.box,col(0x635c4f),0,.91,0,2.5,.06,1.6);a(G.box,tmat(T.sign('БЛОШИНЫЙ РЫНОК','#4e574b','#dbd4b1')),0,.69,.911,1.6,.20,.015);}));
 const market=new THREE.Group();market.position.y=.95;g.add(market);market.add(compose('shakir36-market-'+pattern,a=>{const colors=[0x996d62,0x7a8e77,0x8b87a5,0xb09569];a(G.box,tmat(T.pave()),0,-.015,0,2.4,.03,1.5);for(let row=0;row<2;row++)for(let c=0;c<4;c++){const x=-.95+c*.62,z=row? .33:-.30,clr=col(colors[(c+row+pattern)%4]);a(G.box,wood,x,.10,z,.36,.20,.22);for(const s of [-1,1])a(G.box,col(0x544939),x+s*.18,.23,z-.10,.012,.28,.012);a(G.box,clr,x,.32,z,.44,.025,.32,.10);for(let i=0;i<5;i++){a(i%2?G.cyl6:G.box,col(colors[(i+c)%4]),x+(i%3-1)*.09,.218,z+(i%2?-.04:.04),.045,.04,.04,0,i*.5);}}for(let i=0;i<10;i++)a(G.box,col(0xc9c0a1),-1.1+i*.24,.004,.02,.12,.008,.025);for(const x of [-1.16,1.16])for(const z of [-.65,.65]){a(G.cyl6,col(0x5f6958),x,.22,z,.008,.44,.008);a(G.sphL,col(0xc4bd8b),x,.45,z,.035,.045,.035);}}));
 const selected=spots[Math.random()*spots.length|0],pose=Math.random()*3|0,ant=antModel(pose);ant.position.set(selected[0],selected[2],selected[1]);ant.rotation.y=Math.random()*Math.PI*2;if(pose===2)ant.rotation.z=-.20;market.add(ant);
 const wide=Math.abs(f[0])>.5,rx=wide?.9:1.35,rz=wide?1.35:.9,solid=addSolid(x-rx,z-rz,x+rx,z+rz,y+.77,y+.91);
 return{g,market,ant,pose,solid,pos:()=>g.position,world:(x,y,z)=>g.localToWorld(new V3(x,y,z)),front:()=>g.localToWorld(new V3(0,0,1.7)),dispose(){solid.on=false;g.removeFromParent();}};
}
export function shakirGame(o,api,ctx){
 api.feedback();api.pose(o.world(0,3.85,.40),o.world(0,.96,0));api.msg('Води лупой. Найди бородатого муравья с перчатками');
 const rt=new THREE.WebGLRenderTarget(128,128,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter}),scene=new THREE.Scene();scene.background=new THREE.Color(0x817761);scene.add(new THREE.AmbientLight(0xe6dfcb,1.4));const light=new THREE.DirectionalLight(0xffedc7,1.2);light.position.set(-1,3,2);scene.add(light);const copy=o.market.clone(true);copy.position.y=0;scene.add(copy);const previewAnt=copy.children.at(-1),zoom=new THREE.OrthographicCamera(-.18,.18,.18,-.18,.01,10);
 const lens=new THREE.Group();W.group.add(lens);const frame=mesh(new THREE.TorusGeometry(.205,.014,4,20),tmat(T.metal()),0,0,0,1,1,1,lens),glassMat=new THREE.MeshBasicMaterial({map:rt.texture,fog:false}),glass=mesh(new THREE.CircleGeometry(.19,24),glassMat,0,0,.004,1,1,1,lens);mesh(G.cyl8,tmat(T.wood()),.17,-.25,0,.025,.30,.025,lens).rotation.z=-.6;toolHand(ctx,lens,.23,-.33,0);
 const pips=[];for(let i=0;i<12;i++){const a=i*Math.PI/6;pips.push(mesh(G.box,col(0x897f65),Math.sin(a)*.23,Math.cos(a)*.23,0,.018,.018,.012,lens));}
 const focus=new V3(0,0,0),plane=new THREE.Plane(new V3(0,1,0),-o.g.position.y-.95),hit=new V3();let progress=0,t=0,renderT=0,done=-1;
 const game={hint:'Мышь - двигать лупу. Задержи её на Шакире',
  move(ray){o.market.updateWorldMatrix(true,true);const hits=ray.intersectObject(o.market,true);if(hits.length)hit.copy(hits[0].point);else if(!ray.ray.intersectPlane(plane,hit))return;const local=o.market.worldToLocal(hit.clone());focus.set(THREE.MathUtils.clamp(local.x,-1.1,1.1),Math.max(0,Math.min(.5,local.y)),THREE.MathUtils.clamp(local.z,-.68,.68));},
  botStep(dt,brain){if(brain.time>2.8)this.move(brain.rayTo(o.ant.getWorldPosition(new V3())));},
  update(dt){t+=dt;const near=focus.distanceTo(o.ant.position.clone().add(new V3(0,.045,0)))<.09;if(done<0){progress=near?Math.min(1,progress+dt/1.5):Math.max(0,progress-dt*.9);api.progress(progress);if(progress>=1){done=.9;api.msg('Шакир найден!','good');sfx('done',{at:o.g.position,range:8});}}
   for(let i=0;i<pips.length;i++)pips[i].material=col(i<Math.floor(progress*12)?0xa2c875:0x897f65);
   o.ant.rotation.y+=Math.sin(t*1.8)*dt*.08;previewAnt.quaternion.copy(o.ant.quaternion);lens.position.copy(o.world(focus.x,1.25+focus.y,focus.z+.15));lens.quaternion.copy(ctx.camera.quaternion);
   renderT-=dt;if(renderT<=0){renderT=1/15;zoom.position.set(focus.x,focus.y+1.5,focus.z+.20);zoom.lookAt(focus.x,focus.y,focus.z);zoom.updateMatrixWorld(true);const target=renderer.getRenderTarget();renderer.setRenderTarget(rt);renderer.render(scene,zoom);renderer.setRenderTarget(target);}
   if(done>=0){done-=dt;if(done<=0)api.finish({success:true,mult:1});}
  },
  stop(){lens.removeFromParent();rt.dispose();glassMat.dispose();frame.geometry.dispose();glass.geometry.dispose();ctx.cursor?.(true);}
 };return game;
}
