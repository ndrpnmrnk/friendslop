import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {pix,T} from '../core/textures.js';
import {W} from './state.js';
import {addObb} from './physics.js';
import {smoke} from './particles.js';
import {sfx} from '../core/sfx.js';
import {bonus} from '../game/score.js';
const RIM=new THREE.TorusGeometry(.43,.028,5,20),CORD=new THREE.BufferGeometry();
const netVertices=[];
for(let i=0;i<12;i++)for(const side of[-1,1]){const a=i/12*Math.PI*2,b=a+side*Math.PI/6;netVertices.push(Math.cos(a)*.41,0,Math.sin(a)*.41,Math.cos(b)*.25,-.48,Math.sin(b)*.25);}
CORD.setAttribute('position',new THREE.Float32BufferAttribute(netVertices,3));
const NET=new THREE.LineBasicMaterial({color:0xc7c1a5});
export function buildHoop(b,x,z,ry=0){
 const root=new THREE.Group();root.position.set(b.X(x),b.Y,b.Z(z));root.rotation.y=ry;W.group.add(root);
 const board=pix('backboard43',64,40,g=>{g.fillStyle='#b6b5a7';g.fillRect(0,0,64,40);g.fillStyle='#d6d4bf';g.fillRect(3,3,58,34);g.strokeStyle='#72554c';g.lineWidth=2;g.strokeRect(23,20,18,14);g.fillStyle='#938d7c';for(let i=0;i<25;i++)g.fillRect(i*19%60+2,i*13%36+2,2,1);});
 root.add(compose('basket43-frame',a=>{const m=tmat(T.paintMetal(0x525b5b));a(G.box,m,0,.08,.85,1.0,.16,.85);a(G.cyl8,m,0,1.78,.85,.065,3.5,.065);a(G.box,m,0,2.9,.63,.12,.12,.5);a(G.box,m,0,3.28,.55,2.1,1.28,.10);a(G.box,tmat(board),0,3.28,.488,1.98,1.16,.02);a(G.box,col(0x9b5037),0,2.96,.45,.18,.06,.25);}));
 const rim=mesh(RIM,col(0xb95b32),0,2.96,0,1,1,1,root);rim.rotation.x=Math.PI/2;
 const net=new THREE.LineSegments(CORD,NET);net.position.y=2.94;root.add(net);
 const center=root.localToWorld(new V3(0,2.96,0)),pole=root.localToWorld(new V3(0,0,.85));
 addObb({cx:pole.x,cz:pole.z,yaw:ry,lx0:-.09,lx1:.09,lz0:-.09,lz1:.09,y0:b.Y,y1:b.Y+3.5});
 const boardCenter=root.localToWorld(new V3(0,0,.55));addObb({cx:boardCenter.x,cz:boardCenter.z,yaw:ry,lx0:-1.05,lx1:1.05,lz0:-.06,lz1:.06,y0:b.Y+2.64,y1:b.Y+3.92});
 const cv=document.createElement('canvas');cv.width=64;cv.height=32;const tx=new THREE.CanvasTexture(cv);tx.magFilter=tx.minFilter=THREE.NearestFilter;tx.generateMipmaps=false;const sm=new THREE.SpriteMaterial({map:tx,transparent:true,depthWrite:false}),label=new THREE.Sprite(sm);label.scale.set(1,.5,1);label.visible=false;label.position.set(0,3.35,0);root.add(label);W.mapResources.add(tx);W.mapResources.add(sm);
 const q={root,center,net,pulse:0,label,scoreT:0,showScore(points){const ctx=cv.getContext('2d');ctx.clearRect(0,0,64,32);ctx.fillStyle='#e9d09a';ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillText('+'+points,32,24);tx.needsUpdate=true;q.scoreT=1.1;}};W.hoops.push(q);W.keep.push(root);W.animated.push(dt=>{q.scoreT=Math.max(0,q.scoreT-dt);label.visible=q.scoreT>0;label.position.y=3.35+(1.1-q.scoreT)*.7;sm.opacity=Math.min(1,q.scoreT*3);q.pulse=Math.max(0,q.pulse-dt);net.scale.set(1+Math.sin(q.pulse*25)*q.pulse*.12,1+q.pulse*.15,1);net.rotation.y=Math.sin(q.pulse*23)*q.pulse*.08;});return q;
}
export function basketCrossing(it,from,to){
 if(!['ball','trash','litter','can'].includes(it.type)||it.hoopScored||!it.owner||!it.throwFrom||to.y>=from.y)return false;
 for(const q of W.hoops){const y=q.center.y;if(from.y<y||to.y>y)continue;const k=(from.y-y)/(from.y-to.y),x=from.x+(to.x-from.x)*k,z=from.z+(to.z-from.z)*k;if(Math.hypot(x-q.center.x,z-q.center.z)>.43-Math.min(.17,it.def.r*.6))continue;
  it.hoopScored=true;q.pulse=.8;const distance=Math.hypot(it.throwFrom.x-x,it.throwFrom.z-z),points=distance>=7?20:5;it.owner.score??=0;bonus(it.owner,'tricks',points,q.center);q.showScore(points);sfx('goal',{at:q.center,range:14,v:.45});
  for(let i=0;i<10;i++)smoke(x,y-.12,z,{dust:true,color:[0xd2ba67,0x9bba7b,0xb586a1][i%3],size:.035,grow:.01,vx:Math.cos(i*2.4)*1.2,vz:Math.sin(i*2.4)*1.2,vy:1.3,g:6,life:.65});return points;
 }return false;
}
