import {THREE,G,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
// Общие низкополигональные модели, подвижны только колёса и педали.
const BIKE_TIRE=new THREE.TorusGeometry(.32,.038,5,16),BIKE_RIM=new THREE.TorusGeometry(.285,.014,4,16);
/* v0.58: велосипед детальнее — спицы, крылья, звезда с цепью, корзинка с фарой, подседельный штырь, рулевая
   колонка. Переднее колесо и руль поворачиваются (steerParts), рама — в цвет, обода блестят. */
export function bicycleModel(){
 const g=new THREE.Group(),wheels=[],metal=tmat(T.metal()),frame=col(0x497db0),rubber=col(0x211d29),cream=col(0xf1e8dc);
 const bar=(a,b,r=.025,m=frame,parent=g)=>{const v=new THREE.Vector3().subVectors(b,a),q=mesh(G.cyl6,m,0,0,0,r,v.length(),r,parent);q.position.copy(a).add(b).multiplyScalar(.5);q.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return q;};
 const spokes=w=>{mesh(BIKE_TIRE,rubber,0,0,0,1,1,1,w).rotation.y=Math.PI/2;mesh(BIKE_RIM,metal,0,0,0,1,1,1,w).rotation.y=Math.PI/2;for(let i=0;i<8;i++)mesh(G.box,metal,0,0,0,.006,.58,.006,w).rotation.x=i*Math.PI/8;mesh(G.cyl8,metal,0,0,0,.035,.09,.035,w).rotation.z=Math.PI/2;};
 const rear=new THREE.Group();rear.position.set(0,.35,-.62);g.add(rear);spokes(rear);wheels.push(rear);
 // рулевая часть: вилка, переднее колесо, руль с ручками, корзинка и фара — одна группа, поворачивается вокруг колонки
 const steer=new THREE.Group();steer.position.set(0,.88,.40);g.add(steer);
 const front=new THREE.Group();front.position.set(0,.35-.88,.62-.40);steer.add(front);spokes(front);wheels.push(front);
 for(const s of[-1,1])bar(new THREE.Vector3(s*.045,0,0),new THREE.Vector3(s*.045,.35-.88,.62-.40),.016,frame,steer);
 mesh(G.cyl6,frame,0,.08,0,.03,.18,.03,steer);const hb=mesh(G.box,metal,0,.15,.02,.58,.035,.035,steer);void hb;for(const s of[-1,1])mesh(G.cyl6,rubber,s*.25,.15,.02,.032,.1,.032,steer).rotation.z=Math.PI/2;
 mesh(G.box,col(0x8a6a3a),0,.0,.18,.3,.18,.2,steer);for(const x of[-.15,.15])mesh(G.box,col(0x6a4a2a),x,.0,.18,.02,.2,.21,steer);
 mesh(G.cyl8,cream,0,-.05,.3,.05,.05,.05,steer).rotation.x=Math.PI/2;mesh(G.box,col(0xfff1c0),0,-.05,.33,.06,.06,.01,steer);
 const v=(y,z)=>new THREE.Vector3(0,y,z),C=v(.40,-.08),S=v(.86,-.24),F=v(.88,.40),B=v(.35,-.62);
 for(const [a,b]of [[C,S],[S,F],[F,C]])bar(a,b,.03);for(const s of[-1,1]){bar(C.clone().setX(s*.05),B.clone().setX(s*.05),.018);bar(B.clone().setX(s*.05),S.clone().setX(s*.03),.016);}
 bar(S,v(.96,-.27),.018,metal);mesh(G.box,rubber,0,.99,-.28,.2,.06,.3,g);
 // крылья над колёсами
 { const FG=new THREE.TorusGeometry(.37,.022,3,10,Math.PI*.6);const f=mesh(FG,cream,0,.35,-.62,1,1,1,g);f.rotation.set(0,Math.PI/2,Math.PI*.2);const f2=mesh(FG,cream,0,.35-.88,.62-.40,1,1,1,steer);f2.rotation.set(0,Math.PI/2,Math.PI*.2); }
 // звезда и цепь
 mesh(G.cyl12,metal,.07,.40,-.08,.11,.012,.11,g).rotation.z=Math.PI/2;
 for(const y of[.51,.29])bar(new THREE.Vector3(.07,y,-.08),new THREE.Vector3(.07,.35+(y>.4?.05:-.05),-.62),.008,col(0x3a3440));
 const pedals=new THREE.Group();pedals.position.copy(C);g.add(pedals);for(const s of [-1,1]){mesh(G.box,metal,s*.10,s*.12,0,.025,.24,.025,pedals);mesh(G.box,rubber,s*.16,s*.24,0,.16,.04,.12,pedals);}
 g.userData.vehicle={wheels,pedals,crank:C.clone(),grips:[new THREE.Vector3(-.26,1.03,.42),new THREE.Vector3(.26,1.03,.42)],steerParts:[steer]};return g;
}
// v0.58: самокат — дека с грипом, шея, рулевая колонка с хомутом, руль с ручками, заднее крыло-тормоз; руль поворачивается
export function scooterModel(){
 const g=new THREE.Group(),dk=col(0x2b2533),bl=col(0x4ab0f0),wh=col(0x17111f),mt=col(0x9a9da8);
 g.add(compose('scooter58',add=>{add(G.box,bl,0,.1,0,.17,.045,.62);add(G.box,col(0x23202a),0,.125,-.04,.15,.008,.5);add(G.box,bl,0,.12,.33,.1,.06,.12,-.35);
  add(G.cyl8,wh,0,.07,-.34,.07,.04,.07,0,0,Math.PI/2);add(G.cyl8,mt,0,.07,-.34,.03,.05,.03,0,0,Math.PI/2);add(G.box,col(0xd8243a),0,.15,-.35,.1,.02,.14,.25);
  for(const sx of[-1,1])add(G.box,mt,sx*.05,.07,-.3,.01,.05,.12);}));
 const steer=new THREE.Group();steer.position.set(0,.14,.4);g.add(steer);
 steer.add(compose('scooter58-steer',add=>{add(G.cyl8,bl,0,.4,0,.03,.8,.03);add(G.cyl8,mt,0,.12,0,.045,.08,.045);add(G.box,mt,0,.8,0,.46,.035,.035);for(const sx of[-.21,.21])add(G.cyl6,dk,sx,.8,0,.032,.12,.032,0,0,Math.PI/2);
  add(G.cyl8,wh,0,-.07,0,.07,.04,.07,0,0,Math.PI/2);add(G.cyl8,mt,0,-.07,0,.03,.05,.03,0,0,Math.PI/2);for(const sx of[-1,1])add(G.box,mt,sx*.035,-.03,0,.01,.1,.03);}));
 g.userData.scoot={steerParts:[steer]};return g;
}
const KART_WHEEL=new THREE.TorusGeometry(.18,.045,5,12),STEER=new THREE.TorusGeometry(.18,.018,4,14);
export function kartModel(color=0xff8a1f){const g=new THREE.Group(),rubber=tmat(T.paintMetal(0x29282c));g.add(compose('kart43-'+color,a=>{const frame=tmat(T.metal()),dark=col(0x292632),paint=tmat(T.paintMetal(color));
 a(G.box,dark,0,.17,0,1.05,.10,1.6);a(G.box,paint,0,.28,.66,.86,.22,.44);a(G.box,col(0xd8cdb2),0,.397,.68,.34,.013,.30);a(G.box,tmat(T.sign('01','#d8cdb2','#444550')),0,.407,.69,.24,.01,.23);
 for(const side of[-1,1]){a(G.box,paint,side*.53,.27,-.08,.20,.20,1.05);a(G.box,col(0xd7ccad),side*.53,.378,-.07,.13,.012,.73);a(G.cyl6,frame,side*.42,.16,.36,.028,1.10,.028,Math.PI/2);}
 a(G.box,dark,0,.32,-.27,.48,.12,.5);a(G.box,dark,0,.57,-.50,.48,.50,.09,-.18);a(G.box,frame,.32,.32,-.70,.25,.28,.28);for(const y of[.25,.31,.37])a(G.box,col(0x777b7b),.32,y,-.71,.29,.025,.31);a(G.cyl8,dark,.43,.29,-.89,.055,.23,.055,Math.PI/2);
 a(G.cyl6,frame,0,.42,.20,.025,.38,.025,-.45);a(STEER,dark,0,.61,.27,1,1,1,-.6);for(const side of[-1,1])a(G.box,frame,side*.06,.61,.27,.14,.018,.025,0,0,side*.4);
 const bumper=new THREE.CatmullRomCurve3([new THREE.Vector3(-.58,.20,.55),new THREE.Vector3(-.58,.20,.99),new THREE.Vector3(0,.20,1.06),new THREE.Vector3(.58,.20,.99),new THREE.Vector3(.58,.20,.55)]);a(new THREE.TubeGeometry(bumper,10,.033,5,false),dark,0,0,0,1,1,1);a(G.box,dark,0,.22,-.99,1.15,.08,.10);
 }));const wheels=[];for(const x of[-.63,.63])for(const z of[-.63,.6]){const q=new THREE.Group();q.position.set(x,.22,z);g.add(q);mesh(G.cyl12,rubber,0,0,0,.22,.19,.22,q).rotation.z=Math.PI/2;mesh(G.cyl8,col(0x9b9c95),Math.sign(x)*.105,0,0,.10,.025,.10,q).rotation.z=Math.PI/2;wheels.push(q);}g.userData.vehicle={wheels};return g;}
