import {THREE,G,V3,mesh,tmat,col,lam,compose} from '../core/gfx.js';
import {photo,pix} from '../core/textures.js';
import {CONFIG} from '../config.js';

// Сигарета в уличной одежде. Кисти и штанины со ступнями - части обычного рига.
// Текстуры/геометрия общие; уголь и маленький пул дыма принадлежат каждой копии.
const fabric=(key,base,draw)=>photo('smoky33-'+key,64,64,(g,w,h)=>{
  g.fillStyle=base;g.fillRect(0,0,w,h);draw?.(g,w,h);
  for(let i=0;i<900;i++){g.fillStyle=i%2?'rgba(255,249,227,.09)':'rgba(44,36,30,.08)';g.fillRect((i*37%907)/907*w,(i*71%911)/911*h,w/150,h/95);}
});
const plaid=()=>fabric('plaid','#b9b2a2',(g,w,h)=>{
  for(let i=0;i<4;i++){
    const x=i*w/4,y=i*h/4;
    g.fillStyle='rgba(69,65,60,.30)';g.fillRect(x,0,w*.055,h);g.fillRect(0,y,w,h*.055);
    g.fillStyle='#5d5b55';g.fillRect(x+w*.022,0,w*.009,h);g.fillRect(0,y+h*.022,w,h*.009);
    g.fillStyle='#e1dace';g.fillRect(x+w*.092,0,w*.018,h);g.fillRect(0,y+h*.092,w,h*.018);
    g.fillStyle='#77736b';g.fillRect(x+w*.14,0,w*.006,h);g.fillRect(0,y+h*.14,w,h*.006);
  }
});
const shirt=()=>fabric('shirt','#a19587',(g,w,h)=>{for(let i=0;i<14;i++){g.fillStyle='#d2c6b5';g.fillRect(0,i*h/14,w,h*.012);g.fillStyle='#766e65';g.fillRect(0,i*h/14+h*.025,w,h*.006);}});
const cargo=()=>fabric('cargo','#b7a17e',(g,w,h)=>{
  const shade=g.createLinearGradient(0,0,w,h);shade.addColorStop(0,'#c9b795');shade.addColorStop(.5,'#b8a27f');shade.addColorStop(1,'#8f7d64');g.fillStyle=shade;g.fillRect(0,0,w,h);
  g.strokeStyle='#8d795f';g.lineWidth=w*.014;for(let i=0;i<5;i++){g.beginPath();g.moveTo(w*(.1+i*.22),0);g.lineTo(w*(.18+i*.15),h*.4);g.lineTo(w*(.09+i*.22),h);g.stroke();}
  g.strokeStyle='#dac7a4';g.lineWidth=w*.008;g.strokeRect(w*.18,h*.3,w*.66,h*.32);g.fillStyle='#9b8567';g.fillRect(w*.18,h*.3,w*.66,h*.045);
});
const suede=()=>fabric('suede','#8f8675',(g,w,h)=>{g.fillStyle='#c3b8a1';g.fillRect(0,h*.74,w,h*.12);g.strokeStyle='#6d6659';g.lineWidth=w*.014;g.strokeRect(w*.08,h*.12,w*.84,h*.48);for(let i=0;i<4;i++){g.fillStyle='#c0b49c';g.fillRect(w*.36,h*(.2+i*.1),w*.28,h*.025);}});
const paper=()=>fabric('paper','#e5decb',(g,w,h)=>{
  g.fillStyle='#c9c2b2';g.fillRect(w*.96,0,w*.025,h);
  for(let y=0;y<30;y++){g.fillStyle=y%2?'#e0d9c6':'#eee6d4';g.fillRect(0,y*h/30,w,h*.005);}
});
const cork=()=>fabric('filter','#ba8e4d',(g,w,h)=>{for(let i=0;i<240;i++){g.fillStyle=i%3?'#d6b878':'#946c39';g.fillRect((i*31%241)/241*w,(i*59%251)/251*h,w*.018,h*.014);}});
const ash=()=>fabric('ash','#6b625a',(g,w,h)=>{for(let i=0;i<120;i++){g.fillStyle=['#aaa193','#352e2b','#897f70'][i%3];g.fillRect((i*17%127)/127*w,(i*43%131)/131*h,w*.05,h*.03);}});
const coal=()=>pix('smoky33-coal',32,16,(g,w,h)=>{g.fillStyle='#382a28';g.fillRect(0,0,w,h);for(let i=0;i<90;i++){g.fillStyle=['#df5829','#ffab4a','#892d24','#6b342a'][i%4];g.fillRect(i*17%32,i*7%16,2,i%3+1);}});
let jacketGeo,legGeo;
function assets(){
  jacketGeo??=new THREE.CylinderGeometry(.32,.295,.47,8,1,true,.48,Math.PI*2-.96);
  if(!legGeo){
    legGeo=new THREE.CylinderGeometry(1,1,.36,8,3);const p=legGeo.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i),k=(y+.18)/.36,r=.14+Math.sin(k*Math.PI)*.045;p.setX(i,p.getX(i)*r);p.setZ(i,p.getZ(i)*r);}
    legGeo.computeVertexNormals();
  }
}

export const SMOKY_SKIN={
  name:'Смоуки',
  build({root,head,torso,handL,handR,footL,footR}){
    assets();const white=tmat(paper()),cloth=lam({map:plaid(),side:THREE.DoubleSide},'smoky33-plaid'),tee=tmat(shirt()),pants=tmat(cargo()),shoe=tmat(suede()),dark=col(0x292730),gold=col(0xc3a167);
    head.add(compose('smoky33-head',a=>{
      a(G.cyl8,white,0,1.40,0,.30,.75,.30);
      a(G.cyl8,tmat(ash()),0,1.805,0,.293,.06,.293);
      // Неровная холодная кромка над тонкой полоской тлеющего табака.
      for(let i=0;i<8;i++){const an=i*Math.PI/4;a(G.box,tmat(ash()),Math.sin(an)*.258,1.828+(i%3)*.006,Math.cos(an)*.258,.07,.025,.05,0,an,0);}
    }));
    const emberMat=lam({map:coal(),emissive:0xff6b24,emissiveMap:coal(),emissiveIntensity:1});
    const ember=mesh(G.cyl8,emberMat,0,1.769,0,.302,.038,.302,head);ember.name='smoky-ember';
    mesh(G.cyl8,emberMat,0,1.838,0,.20,.008,.20,head);
    const glasses=new THREE.Group();glasses.name='smoky-glasses';head.add(glasses);
    glasses.add(compose('smoky33-glasses',a=>{
      for(const s of [-1,1]){
        a(G.box,dark,s*.153,1.48,.273,.25,.145,.055,0,s*.12,-s*.035);
        a(G.box,col(0x172331),s*.153,1.485,.304,.208,.108,.013,0,s*.12,-s*.035);
        a(G.box,col(0x8a8f89),s*.17,1.52,.315,.085,.009,.006,0,s*.12,-.16);
        a(G.box,gold,s*.291,1.49,.155,.022,.025,.29,0,-s*.09,0);
      }
      a(G.box,gold,0,1.49,.31,.065,.025,.025);
    }));
    const mouth=mesh(G.box,dark,0,1.27,.303,.095,.014,.012,head);
    // Узкий бумажный корпус продолжается под одеждой до фильтра.
    torso.add(compose('smoky33-body',a=>{
      a(G.cyl8,tmat(cork()),0,.78,0,.18,.56,.18);
      a(G.cyl8,tee,0,.80,0,.265,.43,.215);
      a(jacketGeo,cloth,0,.80,0,1,1,.82);
      a(G.cyl8,cloth,0,1.04,-.035,.27,.09,.23);
      a(G.box,tee,0,.965,.186,.28,.10,.035);
      a(G.box,col(0x365451),0,.535,.01,.46,.07,.36);
      a(G.box,dark,0,.49,0,.49,.09,.37);
      a(G.cyl8,pants,0,.425,0,.285,.17,.22);
      a(G.box,gold,.04,.49,.194,.075,.045,.018);
      // Украшение лежит на футболке, не парит перед персонажем.
      for(const s of [-1,1])a(G.box,gold,s*.053,.875,.225,.012,.21,.012,0,0,s*.38);
      a(G.box,col(0xddd0a7),0,.776,.24,.045,.065,.015,0,0,.15);
      for(const s of [-1,1])a(G.cyl6,cloth,s*.31,.93,0,.10,.17,.11,0,0,s*.65);
    }));
    const lapels=[];
    for(const s of [-1,1]){
      const p=new THREE.Group();p.position.set(s*.204,1.01,.23);p.rotation.y=s*.08;torso.add(p);
      p.add(compose('smoky33-front-'+s,a=>{a(G.box,cloth,0,-.23,0,.17,.46,.045);a(G.box,col(0xd7cfbc),-s*.073,-.23,.027,.012,.45,.008);a(G.box,cloth,0,-.32,.032,.115,.10,.025);}));
      lapels.push({g:p,s,v:0});
    }
    for(const [hand,s]of [[handL,-1],[handR,1]])hand.add(compose('smoky33-hand-'+s,a=>{
      a(G.cyl6,cloth,0,.075,-.025,.105,.16,.09);a(G.box,tmat(cork()),0,-.035,.025,.145,.13,.15);a(G.box,tmat(cork()),-s*.073,-.025,.06,.045,.065,.07);
    }));
    for(const [foot,s]of [[footL,-1],[footR,1]])foot.add(compose('smoky33-foot-'+s,a=>{
      a(legGeo,pants,0,.31,-.015,1,1,.92);a(G.box,pants,s*.15,.34,.005,.07,.15,.17);
      a(G.box,shoe,0,.09,.045,.245,.17,.32);a(G.box,col(0x514a40),0,.025,.045,.25,.045,.33);a(G.box,shoe,0,.13,.17,.22,.07,.07);
    }));
    const tune=CONFIG.smoky,smoke=new THREE.InstancedMesh(G.ico,lam({color:0xc3bacb,transparent:true,opacity:.28,depthWrite:false},'smoky33-smoke'),tune.smokeCount);
    smoke.name='smoky-smoke';smoke.userData.noOutline=true;smoke.frustumCulled=false;smoke.raycast=()=>{};root.add(smoke);
    root.addEventListener('removed',()=>{smoke.dispose();emberMat.dispose();});
    const puffs=Array.from({length:tune.smokeCount},()=>({p:new V3(),v:new V3(),age:tune.smokeLife})),matrix=new THREE.Matrix4(),inv=new THREE.Matrix4(),local=new V3(),scale=new V3(),rotation=new THREE.Quaternion();
    for(let i=0;i<puffs.length;i++){matrix.makeScale(0,0,0);smoke.setMatrixAt(i,matrix);}
    head.userData.smoky={mouth,glasses,ember,emberMat};torso.userData.smoky={lapels,puffs,smoke,matrix,inv,local,scale,rotation,next:0,clock:0,emit:0,last:new V3(),started:false,tip:new V3()};
    return{top:1.86,handX:.47,handY:.68,handZ:.07,footX:.185,footY:0,holdX:.27,holdY:1.01,holdZ:.46,shadow:.47};
  },
  face(c,e){const u=c.head.userData.smoky;u.mouth.scale.y=e==='wow'?4:e==='dizzy'?2:1;u.mouth.rotation.z=e==='dizzy'?.24:0;u.glasses.rotation.z=e==='dizzy'?.07:0;},
  animate(c,dt,s){
    const u=c.torso.userData.smoky,h=c.head.userData.smoky,tune=CONFIG.smoky;
    dt=Math.min(.05,Math.max(0,dt));u.clock+=dt;const t=u.clock,speed=Math.min(1.4,s.speed||0);
    h.emberMat.emissiveIntensity=.98+Math.sin(t*4.4)*.12+Math.sin(t*11.1)*.045;
    for(const p of u.lapels){const target=p.s*(.025+speed*.055+Math.sin(t*7+p.s)*speed*.015);p.v+=((target-p.g.rotation.z)*70-p.v*12)*dt;p.g.rotation.z=Math.max(-.13,Math.min(.13,p.g.rotation.z+p.v*dt));}
    // Фирменный жест в меню/на подиуме: поправить очки, не меняя рабочих поз.
    if(s.act==='special'&&!s.ride&&!s.rag&&!s.dive&&!s.hold){const k=Math.sin(Math.min(1,s.actK||0)*Math.PI);c.handR.position.lerp(new V3(.30,1.46,.32),k*.5);}
    c.root.updateWorldMatrix(true,true);c.head.localToWorld(u.tip.set(0,1.84,0));u.inv.copy(c.root.matrixWorld).invert();
    // Телепорт/смена сцены не оставляет длинный дымовой след через всю карту.
    if(u.started&&u.last.distanceToSquared(u.tip)>16)for(const p of u.puffs)p.age=tune.smokeLife;
    u.last.copy(u.tip);u.started=true;u.emit-=dt;
    if(u.emit<=0){u.emit=tune.smokeInterval;const p=u.puffs[u.next++%u.puffs.length];p.p.copy(u.tip);p.age=0;p.v.set(Math.sin(t*2)*.035,tune.smokeRise,Math.cos(t*1.3)*.025);}
    for(let i=0;i<u.puffs.length;i++){
      const p=u.puffs[i];p.age+=dt;const k=p.age/tune.smokeLife;
      if(k>=1){u.matrix.makeScale(0,0,0);}else{
        p.p.addScaledVector(p.v,dt);p.p.x+=Math.sin(t*2.8+i)*dt*.026;
        u.local.copy(p.p).applyMatrix4(u.inv);const size=(.035+k*.13)*Math.sin(Math.PI*Math.min(1,k*1.15));u.scale.set(size*.75,size*1.35,size*.75);u.matrix.compose(u.local,u.rotation,u.scale);
      }
      u.smoke.setMatrixAt(i,u.matrix);
    }
    u.smoke.instanceMatrix.needsUpdate=true;
  },
};
