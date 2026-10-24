import {THREE,G,V3,mesh} from '../core/gfx.js';
// Один маленький фон и один пул частиц, без постэффекта/нового RT.
export function clawReveal(root,ui){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),gradient=c.createRadialGradient(64,61,3,64,64,88);gradient.addColorStop(0,'#fff0b0');gradient.addColorStop(.16,'#b5cad0');gradient.addColorStop(.45,'#315e83');gradient.addColorStop(1,'#18273f');c.fillStyle=gradient;c.fillRect(0,0,128,128);
 const texture=new THREE.CanvasTexture(canvas);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:0,depthWrite:true,fog:false}),back=mesh(G.plane,material,0,1.1,1.88,14,10,1,root);back.renderOrder=-2;back.visible=false;
 const rc=document.createElement('canvas');rc.width=rc.height=128;const p=rc.getContext('2d');p.fillStyle='#fff0bf';for(let i=0;i<14;i++){const a=i*Math.PI*2/14;p.beginPath();p.moveTo(64,64);p.lineTo(64+Math.cos(a-.032)*110,64+Math.sin(a-.032)*110);p.lineTo(64+Math.cos(a+.032)*110,64+Math.sin(a+.032)*110);p.fill();}
 const raysTexture=new THREE.CanvasTexture(rc);raysTexture.magFilter=raysTexture.minFilter=THREE.NearestFilter;raysTexture.generateMipmaps=false;
 const raysMaterial=new THREE.MeshBasicMaterial({map:raysTexture,transparent:true,opacity:0,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}),rays=mesh(G.plane,raysMaterial,0,1.1,1.90,10,10,1,root);rays.renderOrder=-1;rays.visible=false;
 const confettiMat=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:false,fog:false}),confetti=new THREE.InstancedMesh(G.box,confettiMat,48),pose=new THREE.Object3D();confetti.frustumCulled=false;confetti.visible=false;root.add(confetti);for(let i=0;i<48;i++)confetti.setColorAt(i,new THREE.Color([0xffd576,0x71c5e8,0xebadbd,0xc9dc9e][i%4]));
 let title=null,started=false;
 return{start(name){this.clear();started=true;title=document.createElement('div');title.id='clawReveal';title.className='gold-prize-name';for(const [i,ch]of [...name].entries()){const span=document.createElement('span');span.textContent=ch===' '?'\u00a0':ch;span.style.setProperty('--i',i);title.appendChild(span);}ui.appendChild(title);},
  update(dt,age,camera){if(!started)return;const k=THREE.MathUtils.smoothstep(age,.62,1.25);back.visible=rays.visible=true;material.opacity=k;raysMaterial.opacity=k*(.13+Math.sin(age*1.6)*.025);rays.rotation.z=age*.07;
   confetti.visible=age<3.2;if(confetti.visible){for(let i=0;i<48;i++){const t=Math.max(0,age-i%6*.04),a=i*2.4,r=t*(.45+i%5*.16),fade=THREE.MathUtils.clamp((3.2-t)*2,0,1);pose.position.set(Math.cos(a)*r,1.04+(.8+i%7*.17)*t-t*t*.48,2.15+Math.sin(a)*r*.42);pose.rotation.set(t*3+i,t*2,i+t*4);pose.scale.set(.028*fade,.010*fade,.045*fade);pose.updateMatrix();confetti.setMatrixAt(i,pose.matrix);}confetti.instanceMatrix.needsUpdate=true;}
   if(title)title.style.opacity=k;if(camera&&title){const point=root.localToWorld(new V3(0,.08,2.08)).project(camera);title.style.left=(point.x*.5+.5)*innerWidth+'px';title.style.top=Math.min(innerHeight-125,(.5-point.y*.5)*innerHeight)+'px';}
  },clear(){started=false;back.visible=rays.visible=confetti.visible=false;title?.remove();title=null;}};
}
