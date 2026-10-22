import {THREE,G,V3,mesh,tmat,col,lam,compose} from '../core/gfx.js';
import {photo,pix} from '../core/textures.js';
import {CONFIG} from '../config.js';

// Тонкая сигарета, открытая гранёная накидка и отдельные ботинки. Штанов и футболки нет.
const texture=(key,base,draw)=>photo('smoky34-'+key,32,32,(g,w,h)=>{
  g.fillStyle=base;g.fillRect(0,0,w,h);draw?.(g,w,h);
  for(let i=0;i<420;i++){g.fillStyle=i%2?'rgba(249,234,200,.08)':'rgba(44,34,25,.07)';g.fillRect((i*37%431)/431*w,(i*71%433)/433*h,w/70,h/90);}
});
const plaid=()=>texture('plaid','#b5ac96',(g,w,h)=>{
  for(let i=0;i<4;i++){const x=i*w/4,y=i*h/4;
    g.fillStyle='#89816f';g.fillRect(x,0,w*.055,h);g.fillRect(0,y,w,h*.055);
    g.fillStyle='#514e46';g.fillRect(x+w*.017,0,w*.012,h);g.fillRect(0,y+h*.017,w,h*.012);
    g.fillStyle='#d3cbbb';g.fillRect(x+w*.085,0,w*.025,h);g.fillRect(0,y+h*.085,w,h*.025);
    g.fillStyle='#726d60';g.fillRect(x+w*.14,0,w*.007,h);g.fillRect(0,y+h*.14,w,h*.007);
  }
  g.strokeStyle='rgba(225,212,183,.7)';g.lineWidth=w*.01;g.setLineDash([w*.026,w*.02]);g.strokeRect(w*.025,h*.02,w*.95,h*.96);
});
const paper=()=>texture('paper','#ded6c0',(g,w,h)=>{
  // Без контрастного продольного шва; микрорёбра бумажной обёртки поперёк.
  for(let y=0;y<36;y++){g.fillStyle=y%3?'#e5ddc9':'#d3cbb7';g.fillRect(0,y*h/36,w,h*.004);}
});
const cork=()=>texture('filter','#bd914c',(g,w,h)=>{
  for(let i=0;i<220;i++){g.fillStyle=['#d6b26e','#a3763d','#c9a25d'][i%3];g.fillRect((i*31%227)/227*w,(i*59%229)/229*h,w*.018,h*.012);}
  g.fillStyle='#b78746';g.fillRect(0,0,w,h*.04);
});
const ash=()=>texture('ash','#756b5e',(g,w,h)=>{
  for(let i=0;i<130;i++){g.fillStyle=['#b1a695','#3e3630','#897c69'][i%3];g.fillRect((i*17%137)/137*w,(i*43%139)/139*h,w*.04,h*.035);}
});
const coal=()=>pix('smoky331-coal',32,32,(g,w,h)=>{
  g.fillStyle='#4c3c32';g.fillRect(0,0,w,h);
  for(let i=0;i<120;i++){g.fillStyle=['#796c5b','#a8987e','#c14f25','#ec8836','#45382f'][i%5];g.fillRect(i*17%32,i*7%32,2,i%3+1);}
});
const leather=()=>texture('loafer','#302e2b',(g,w,h)=>{
  const shade=g.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#484540');shade.addColorStop(.5,'#282724');shade.addColorStop(1,'#1d1c1c');g.fillStyle=shade;g.fillRect(0,0,w,h);
  g.strokeStyle='#777064';g.lineWidth=w*.014;g.setLineDash([w*.022,w*.025]);g.beginPath();g.moveTo(w*.16,h*.12);g.lineTo(w*.12,h*.65);g.quadraticCurveTo(w*.5,h*.86,w*.88,h*.65);g.lineTo(w*.84,h*.12);g.stroke();
  g.fillStyle='#535049';g.fillRect(w*.18,h*.34,w*.64,h*.055);
});
const lensMap=()=>texture('lenses','#3a352c',(g,w,h)=>{
  const shade=g.createLinearGradient(0,0,w,h);shade.addColorStop(0,'#5e594a');shade.addColorStop(.45,'#302f2a');shade.addColorStop(1,'#222827');g.fillStyle=shade;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(178,187,173,.3)';g.beginPath();g.moveTo(w*.16,0);g.lineTo(w*.25,0);g.lineTo(w*.60,h);g.lineTo(w*.49,h);g.fill();
});
let paperGeo,capeGeo,foldGeo,shoeGeo,rimGeo,lensGeo;
const octagon=(w,h,c)=>[[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]];
const polygon=points=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;};
function assets(){
  if(paperGeo)return;
  paperGeo=new THREE.CylinderGeometry(.145,.155,1.18,10,1,true,Math.PI);
  const positions=[],uv=[],indices=[],N=12;
  for(let row=0;row<4;row++)for(let i=0;i<=N;i++){
    const a=.66+i/N*(Math.PI*2-1.32),r=[.205,.207,.225,.26][row]+Math.sin(i*Math.PI*.8)*.009;
    positions.push(Math.sin(a)*r,-row*.205+(row===3?Math.cos(a)*.04:0),Math.cos(a)*r*.87);uv.push(i/N,row/3);
    if(row<3&&i<N){const n=row*(N+1)+i;indices.push(n,n+N+1,n+1,n+1,n+N+1,n+N+2);}
  }
  capeGeo=new THREE.BufferGeometry();capeGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));capeGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));capeGeo.setIndex(indices);capeGeo.computeVertexNormals();
  const fp=[],fu=[],fi=[];
  for(let row=0;row<4;row++)for(let c=0;c<3;c++){
    fp.push((c-1)*(.047+row*.009)+row*.012,-row*.2+(row===3?(c===1?-.018:.025):0),(c===1?.023:0)+row*.015);fu.push(c/2,1-row/3);
    if(row<3&&c<2){const n=row*3+c;fi.push(n,n+3,n+1,n+1,n+3,n+4);}
  }
  foldGeo=new THREE.BufferGeometry();foldGeo.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));foldGeo.setAttribute('uv',new THREE.Float32BufferAttribute(fu,2));foldGeo.setIndex(fi);foldGeo.computeVertexNormals();
  const outside=polygon(octagon(.166,.111,.019));outside.holes.push(new THREE.Path(octagon(.143,.088,.014).map(([x,y])=>new THREE.Vector2(x,y))));
  rimGeo=new THREE.ExtrudeGeometry(outside,{depth:.012,bevelEnabled:false,curveSegments:1});
  lensGeo=new THREE.ShapeGeometry(polygon(octagon(.145,.090,.015)));
  // Закрытая колодка лофера: сужающийся нос, подъём и низкий каблук.
  const sp=[],su=[],si=[],rings=[[-.16,.092,.125],[-.06,.129,.17],[.12,.124,.11],[.235,.074,.067]];
  rings.forEach(([z,w,h],row)=>{for(const [i,[x,y]]of [[-w,.04],[-w,h*.7],[-w*.58,h],[w*.58,h],[w,h*.7],[w,.04]].entries()){
    sp.push(x,y,z);su.push(i/5,row/3);if(row<3){const n=row*6+i,k=row*6+(i+1)%6;si.push(n,k,n+6,k,k+6,n+6);}
  }});
  for(let i=1;i<5;i++){si.push(0,i+1,i);si.push(18,18+i,18+i+1);}
  for(let i=0;i<si.length;i+=3)[si[i+1],si[i+2]]=[si[i+2],si[i+1]];
  shoeGeo=new THREE.BufferGeometry();shoeGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));shoeGeo.setAttribute('uv',new THREE.Float32BufferAttribute(su,2));shoeGeo.setIndex(si);shoeGeo.computeVertexNormals();
}

export const SMOKY_SKIN={
  name:'Дэн Блант',rigidBody:true,
  build({root,head,torso,handL,handR,footL,footR}){
    assets();
    const white=lam({map:paper(),color:0xe7dfca,flatShading:true},'smoky34-paper'),filter=tmat(cork()),cloth=lam({map:plaid(),color:0xf2e8d2,side:THREE.DoubleSide,flatShading:true},'smoky34-cloth'),charcoal=col(0x3a322b),frame=col(0x655b46);
    // Как у остальных голов рига, без получения собственной карты теней.
    const tube=mesh(paperGeo,white,0,1.18,0,1,1,1,head);tube.name='smoky-paper';tube.receiveShadow=false;
    const mouth=mesh(G.box,col(0x51463b),0,1.14,.153,.058,.009,.008,head);
    const emberMat=lam({map:coal(),emissive:0xd55a25,emissiveMap:coal(),emissiveIntensity:.58,flatShading:true});
    const ember=mesh(G.cyl8,emberMat,0,1.787,0,.146,.025,.146,head);ember.name='smoky-ember';
    head.add(compose('smoky331-burntEdge',a=>{
      a(G.cyl8,tmat(ash()),0,1.81,0,.14,.028,.14);
      for(let i=0;i<6;i++){const an=i*Math.PI/3;a(G.ico,tmat(ash()),Math.sin(an)*.108,1.826+(i%2)*.006,Math.cos(an)*.108,.035,.016,.028);}
    }));
    mesh(G.cyl8,emberMat,0,1.827,0,.098,.005,.098,head);
    const glasses=new THREE.Group();glasses.name='smoky-glasses';head.add(glasses);
    const glass=lam({map:lensMap(),transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide},'smoky331-lenses');
    for(const s of [-1,1]){
      const eye=new THREE.Group();eye.position.set(s*.093,1.345,.147);eye.rotation.y=s*.10;eye.rotation.z=-s*.04;glasses.add(eye);
      mesh(rimGeo,frame,0,0,0,1,1,1,eye);mesh(lensGeo,glass,0,0,.007,1,1,1,eye);
    }
    glasses.add(compose('smoky331-temples',a=>{
      a(G.box,frame,0,1.354,.17,.032,.011,.012);for(const s of [-1,1]){
        a(G.box,frame,s*.174,1.355,.071,.011,.014,.18,0,-s*.15,0);
        a(G.box,charcoal,s*.159,1.34,-.027,.016,.035,.04,-.25,0,0);
        a(G.sphL,col(0x988a68),s*.174,1.35,.157,.012,.012,.008);
      }
    }));
    const filterBody=mesh(G.cyl8,filter,0,.49,0,.153,.32,.153,torso);filterBody.receiveShadow=false;filterBody.name='smoky-filter';
    const capeGeometry=capeGeo.clone(),capeBase=capeGeometry.attributes.position.array.slice();
    const cape=mesh(capeGeometry,cloth,0,1.005,-.005,1,1,1,torso);cape.name='smoky-cape';cape.castShadow=true;cape.frustumCulled=false;
    const lapels=[];
    for(const s of [-1,1]){
      const p=new THREE.Group();p.position.set(s*.145,1.005,.148);p.rotation.y=s*.17;torso.add(p);
      const fold=mesh(foldGeo,cloth,0,0,0,s,1,1,p);fold.name='smoky-cape-fold';
      p.add(compose('smoky331-edge-'+s,a=>{
        a(G.box,col(0x9a8e78),-s*.043,-.27,.017,.006,.52,.006,.08,0,s*.04);
        a(G.box,cloth,-s*.012,-.045,.015,.105,.10,.025,-.34,s*.13,-s*.35);
      }));lapels.push({g:p,s,v:0});
      torso.add(compose('smoky34-shoulder-'+s,a=>{a(G.cyl6,cloth,s*.205,.96,-.015,.073,.125,.10,0,0,s*.60);}));
    }
    for(const [hand,s]of [[handL,-1],[handR,1]])hand.add(compose('smoky34-hand-'+s,a=>{
      a(G.cyl6,cloth,0,.078,-.025,.075,.08,.075);a(G.sph10,white,0,-.01,.014,.073,.085,.068);a(G.sphL,white,-s*.065,-.01,.052,.029,.051,.032,0,0,-s*.4);
      for(const x of [-.037,0,.037])a(G.box,col(0xc2b49a),x,-.04,.075,.008,.034,.005);
    }));
    for(const foot of [footL,footR])foot.add(compose('smoky331-loafer',a=>{
      a(shoeGeo,lam({map:leather(),flatShading:true},'smoky331-leather'),0,.008,0,1,1,1);a(shoeGeo,col(0x25221e),0,-.002,0,1.035,.20,1.025);
      a(G.box,charcoal,0,.016,-.095,.17,.033,.12);a(G.box,col(0x4c4840),0,.138,.02,.22,.016,.055,-.23);
      a(G.box,col(0x272624),0,.144,.021,.07,.012,.025,-.23);
    }));
    const tune=CONFIG.smoky,smoke=new THREE.InstancedMesh(G.ico,lam({color:0xb6afbb,transparent:true,opacity:.25,depthWrite:false},'smoky331-smoke'),tune.smokeCount);
    smoke.name='smoky-smoke';smoke.userData.noOutline=true;smoke.frustumCulled=false;smoke.raycast=()=>{};root.add(smoke);
    root.addEventListener('removed',()=>{smoke.dispose();emberMat.dispose();capeGeometry.dispose();});
    const puffs=Array.from({length:tune.smokeCount},()=>({p:new V3(),v:new V3(),age:tune.smokeLife})),matrix=new THREE.Matrix4(),inv=new THREE.Matrix4(),local=new V3(),scale=new V3(),rotation=new THREE.Quaternion();
    for(let i=0;i<puffs.length;i++){matrix.makeScale(0,0,0);smoke.setMatrixAt(i,matrix);}
    head.scale.y=torso.scale.y=.95;
    head.userData.smoky={mouth,glasses,ember,emberMat};torso.userData.smoky={lapels,cape,capeBase,yaw:0,sway:0,puffs,smoke,matrix,inv,local,scale,rotation,next:0,clock:0,emit:0,last:new V3(),started:false,tip:new V3()};
    return{top:1.76,handX:.315,handY:.70,handZ:.025,footX:.175,footY:0,holdX:.24,holdY:.92,holdZ:.37,shadow:.37};
  },
  face(c,e){const u=c.head.userData.smoky;u.mouth.scale.y=.009*(e==='wow'?4:e==='dizzy'?2:1);u.mouth.rotation.z=e==='dizzy'?.24:0;u.glasses.rotation.z=e==='dizzy'?.06:0;},
  animate(c,dt,s){
    const u=c.torso.userData.smoky,h=c.head.userData.smoky,tune=CONFIG.smoky;
    dt=Math.min(.05,Math.max(0,dt));u.clock+=dt;const t=u.clock,speed=Math.min(1.4,s.speed||0);
    h.emberMat.emissiveIntensity=.57+Math.sin(t*4.4)*.09+Math.sin(t*11.1)*.035;
    const turn=Math.atan2(Math.sin(c.root.rotation.y-u.yaw),Math.cos(c.root.rotation.y-u.yaw));u.yaw=c.root.rotation.y;u.sway+=(Math.max(-.055,Math.min(.055,turn*3))-u.sway)*(1-Math.exp(-dt*8));
    const attr=u.cape.geometry.attributes.position,base=u.capeBase;for(let i=0;i<attr.count;i++){const j=i*3,w=Math.max(0,-base[j+1]/.65);attr.setXYZ(i,base[j]+w*(u.sway+Math.sin(t*4+base[j]*8)*speed*.018),base[j+1]+Math.sin(t*5+base[j]*12)*w*speed*.009,base[j+2]-w*speed*.035+Math.sin(t*3+base[j]*8)*w*.006);}attr.needsUpdate=true;u.cape.geometry.computeVertexNormals();
    for(const p of u.lapels){const target=p.s*(.02+speed*.07+Math.sin(t*7+p.s)*speed*.018);p.v+=((target-p.g.rotation.z)*70-p.v*12)*dt;p.g.rotation.z=Math.max(-.15,Math.min(.15,p.g.rotation.z+p.v*dt));}
    if(s.act==='special'&&!s.ride&&!s.rag&&!s.dive&&!s.hold){const k=Math.sin(Math.min(1,s.actK||0)*Math.PI);c.handR.position.lerp(new V3(.18,1.34,.16),k*.5);}
    c.root.updateWorldMatrix(true,true);c.head.localToWorld(u.tip.set(0,1.84,0));u.inv.copy(c.root.matrixWorld).invert();
    if(u.started&&u.last.distanceToSquared(u.tip)>16)for(const p of u.puffs)p.age=tune.smokeLife;
    u.last.copy(u.tip);u.started=true;u.emit-=dt;
    if(u.emit<=0){u.emit=tune.smokeInterval;const p=u.puffs[u.next++%u.puffs.length];p.p.copy(u.tip);p.age=0;p.v.set(Math.sin(t*2)*.035,tune.smokeRise,Math.cos(t*1.3)*.025);}
    for(let i=0;i<u.puffs.length;i++){
      const p=u.puffs[i];p.age+=dt;const k=p.age/tune.smokeLife;
      if(k>=1){u.matrix.makeScale(0,0,0);}else{
        p.p.addScaledVector(p.v,dt);p.p.x+=Math.sin(t*2.8+i)*dt*.026;u.local.copy(p.p).applyMatrix4(u.inv);
        const size=(.025+k*.10)*Math.sin(Math.PI*Math.min(1,k*1.15));u.scale.set(size*.70,size*1.35,size*.70);u.matrix.compose(u.local,u.rotation,u.scale);
      }u.smoke.setMatrixAt(i,u.matrix);
    }u.smoke.instanceMatrix.needsUpdate=true;
  },
};
