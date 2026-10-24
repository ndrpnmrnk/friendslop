import {THREE,G,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
// Общие низкополигональные модели, подвижны только колёса и педали.
const BIKE_TIRE=new THREE.TorusGeometry(.32,.038,5,16),BIKE_RIM=new THREE.TorusGeometry(.285,.014,4,16);
export function bicycleModel(){
 const g=new THREE.Group(),wheels=[],metal=tmat(T.metal()),frame=col(0x497db0),rubber=col(0x211d29);
 const bar=(a,b,r=.025,m=frame)=>{const v=new THREE.Vector3().subVectors(b,a),q=mesh(G.cyl6,m,0,0,0,r,v.length(),r,g);q.position.copy(a).add(b).multiplyScalar(.5);q.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());};
 for(const z of [-.62,.62]){const w=new THREE.Group();w.position.set(0,.35,z);g.add(w);wheels.push(w);mesh(BIKE_TIRE,rubber,0,0,0,1,1,1,w).rotation.y=Math.PI/2;mesh(BIKE_RIM,metal,0,0,0,1,1,1,w).rotation.y=Math.PI/2;for(let i=0;i<5;i++)mesh(G.box,metal,0,0,0,.008,.60,.008,w).rotation.x=i*Math.PI/5;}
 const v=(y,z)=>new THREE.Vector3(0,y,z),C=v(.40,-.08),S=v(.86,-.24),F=v(.88,.40),B=v(.35,-.62),A=v(.35,.62);
 for(const [a,b]of [[C,S],[S,F],[F,C],[C,B],[B,S],[F,A]])bar(a,b);
 mesh(G.box,rubber,0,.90,-.24,.22,.05,.28,g);mesh(G.box,metal,0,1.03,.42,.58,.035,.035,g);
 const pedals=new THREE.Group();pedals.position.copy(C);g.add(pedals);for(const s of [-1,1]){mesh(G.box,metal,s*.10,s*.12,0,.025,.24,.025,pedals);mesh(G.box,rubber,s*.16,s*.24,0,.16,.04,.12,pedals);}g.userData.vehicle={wheels,pedals,crank:C.clone(),grips:[new THREE.Vector3(-.26,1.03,.42),new THREE.Vector3(.26,1.03,.42)]};return g;
}
const KART_WHEEL=new THREE.TorusGeometry(.18,.045,5,12),STEER=new THREE.TorusGeometry(.18,.018,4,14);
export function kartModel(color=0xff8a1f){const g=new THREE.Group(),rubber=tmat(T.paintMetal(0x29282c));g.add(compose('kart43-'+color,a=>{const frame=tmat(T.metal()),dark=col(0x292632),paint=tmat(T.paintMetal(color));
 a(G.box,dark,0,.17,0,1.05,.10,1.6);a(G.box,paint,0,.28,.66,.86,.22,.44);a(G.box,col(0xd8cdb2),0,.397,.68,.34,.013,.30);a(G.box,tmat(T.sign('01','#d8cdb2','#444550')),0,.407,.69,.24,.01,.23);
 for(const side of[-1,1]){a(G.box,paint,side*.53,.27,-.08,.20,.20,1.05);a(G.box,col(0xd7ccad),side*.53,.378,-.07,.13,.012,.73);a(G.cyl6,frame,side*.42,.16,.36,.028,1.10,.028,Math.PI/2);}
 a(G.box,dark,0,.32,-.27,.48,.12,.5);a(G.box,dark,0,.57,-.50,.48,.50,.09,-.18);a(G.box,frame,.32,.32,-.70,.25,.28,.28);for(const y of[.25,.31,.37])a(G.box,col(0x777b7b),.32,y,-.71,.29,.025,.31);a(G.cyl8,dark,.43,.29,-.89,.055,.23,.055,Math.PI/2);
 a(G.cyl6,frame,0,.42,.20,.025,.38,.025,-.45);a(STEER,dark,0,.61,.27,1,1,1,-.6);for(const side of[-1,1])a(G.box,frame,side*.06,.61,.27,.14,.018,.025,0,0,side*.4);
 const bumper=new THREE.CatmullRomCurve3([new THREE.Vector3(-.58,.20,.55),new THREE.Vector3(-.58,.20,.99),new THREE.Vector3(0,.20,1.06),new THREE.Vector3(.58,.20,.99),new THREE.Vector3(.58,.20,.55)]);a(new THREE.TubeGeometry(bumper,10,.033,5,false),dark,0,0,0,1,1,1);a(G.box,dark,0,.22,-.99,1.15,.08,.10);
 }));const wheels=[];for(const x of[-.63,.63])for(const z of[-.63,.6]){const q=new THREE.Group();q.position.set(x,.22,z);g.add(q);mesh(G.cyl12,rubber,0,0,0,.22,.19,.22,q).rotation.z=Math.PI/2;mesh(G.cyl8,col(0x9b9c95),Math.sign(x)*.105,0,0,.10,.025,.10,q).rotation.z=Math.PI/2;wheels.push(q);}g.userData.vehicle={wheels};return g;}
