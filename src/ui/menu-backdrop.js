import {THREE,G,mesh,col,tmat,compose,lam} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {bicycleModel} from '../world/vehicles.js';

export function menuBackdrop(scene){
 const brick=tmat(T.oldBrick()),metal=tmat(T.metal()),wood=tmat(T.wood()),dark=col(0x292331),cloth=[];
 scene.add(compose('menuDetails32',a=>{
  // Нижний этаж связывает фон с игровой улицей: витрины, подоконники, трубы, объявления.
  for(const x of [-3.3,3.3]){a(G.box,brick,x,1.4,-5.18,2.7,2.8,.12);a(G.box,metal,x,2.85,-4.98,3,.10,.4);a(G.box,dark,x,1.35,-5.07,1.8,1.8,.08);a(G.box,tmat(T.sign(x<0?'МАСТЕРСКАЯ':'НОЧНОЙ МАГАЗИН','#33263d','#e6cda4')),x,2.55,-4.93,2.5,.3,.05);for(const sx of [-.85,0,.85])a(G.box,wood,x+sx,1.35,-4.99,.05,1.85,.09);a(G.box,wood,x,1.1,-4.98,1.8,.055,.09);a(G.box,wood,x,.43,-4.88,2,.12,.35);for(let i=0;i<4;i++)a(G.box,col([0xb17a4d,0x859568,0xa36a77,0x665b82][i]),x-.6+i*.38,.68,-4.97,.23,.35,.08);}
  for(const x of [-4.9,4.9]){a(G.cyl6,metal,x,2.7,-4.9,.055,5.4,.055);a(G.box,dark,x,1.3,-4.8,.14,.20,.14);}
  for(let i=0;i<5;i++){a(G.box,col(0x69516f),-1.9+i*.95,.03,-1.9,.018,.012,.35);a(G.box,metal,-1.8+i*.9,.04,-3.8,.3,.018,.025);}
  // Почтовый ящик и тёплая входная ниша, без плоских декораций в проходе.
  a(G.box,metal,-3.8,.65,-2.9,.55,1.3,.42);a(G.box,col(0x516a83),-3.8,1.32,-2.9,.65,.20,.48);a(G.box,dark,-3.8,1.16,-2.66,.36,.05,.025);a(G.box,tmat(T.sign('ПОЧТА','#d6c9ad','#292331')),-3.8,.85,-2.675,.34,.18,.012);
  for(const x of [-1,1]){a(G.box,wood,x*1.3,.14,-4.8,.7,.28,.55);a(G.sphL,tmat(T.leaves(2)),x*1.3,.5,-4.8,.42,.36,.38);}
  for(let i=0;i<7;i++)a(G.box,tmat(T.sign(['КОНЦЕРТ','СКОРО','ПРОПАЛ КОТ'][i%3],'#c5b899','#433747')),-6.3+i*.14,1.4+(i%2)*.26,-1.41,.19,.24,.008);
 }));
 const cycle=bicycleModel();cycle.position.set(3.3,.07,-3.8);cycle.rotation.set(0,-.6,-.11);scene.add(cycle);
 for(const x of [-3.3,3.3]){const aw=new THREE.Group();aw.position.set(x,2.35,-4.9);scene.add(aw);mesh(G.box,tmat(T.awning('#786181','#cab89a')),0,0,.34,2.7,.04,.8,aw).rotation.x=.18;mesh(G.box,tmat(T.cloth(0x786181)),0,-.1,.71,2.7,.18,.035,aw);cloth.push(aw);}
 const flags=[];for(let i=0;i<11;i++){const x=-4+i*.8,y=3.5-Math.sin(i/10*Math.PI)*.45;mesh(G.cyl5,metal,x,y,-3.9,.01,.82,.01,scene).rotation.z=Math.PI/2;const p=new THREE.Group();p.position.set(x,y,-3.9);scene.add(p);mesh(G.cone4,col(i%2?0xc58c48:0x80618e),0,-.14,0,.12,.30,.012,p).rotation.z=Math.PI;flags.push(p);}
 const windows=[];for(const x of [-3.72,-2.9,2.9,3.72]){const m=mesh(G.plane,lam({color:0xc8a67a,emissive:0x73522d,emissiveIntensity:.32}),x,1.55,-5.01,.69,.75,1,scene);windows.push(m);}
 const steam=Array.from({length:7},(_,i)=>{const mat=lam({color:0x9d93ae,transparent:true,opacity:.1,depthWrite:false}),m=mesh(G.ico,mat,-1.9,.2,1.8,.1,.1,.1,scene);return{m,t:i/7};});
 let t=0,px=0,py=0;return{update(dt,mouse){t+=dt;px+=(mouse.x-px)*(1-Math.exp(-dt*3));py+=(mouse.y-py)*(1-Math.exp(-dt*3));for(const a of cloth)a.rotation.x=Math.sin(t*.75+a.position.x)*.012+py*.018;flags.forEach((p,i)=>{p.rotation.x=Math.sin(t*1.5+i*.4)*.10+px*.08;p.rotation.z=Math.sin(t+i)*.035;});windows.forEach((m,i)=>m.material.emissiveIntensity=.28+Math.sin(t*.4+i)*.055);for(const s of steam){s.t=(s.t+dt*.14)%1;const k=s.t;s.m.position.set(-1.9+Math.sin(k*5+t*.3)*.16+px*k*.22,.08+k*.85,1.8+Math.cos(k*6)*.06);s.m.scale.setScalar(.07+k*.15);s.m.material.opacity=Math.sin(k*Math.PI)*.11;}}};
}
