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
export function kartModel(color=0xff8a1f){const g=new THREE.Group();g.add(compose('kart30'+color,a=>{const mt=tmat(T.metal()),dk=col(0x24202c),p=col(color);a(G.box,mt,0,.18,0,1.15,.12,1.8);a(G.box,p,0,.32,.7,.92,.26,.46);a(G.box,p,-.57,.29,-.08,.15,.20,1.35);a(G.box,p,.57,.29,-.08,.15,.20,1.35);a(G.box,dk,0,.32,-.28,.52,.12,.55);a(G.box,dk,0,.57,-.55,.52,.56,.12,-.18);a(G.box,mt,.38,.38,-.55,.28,.32,.42);a(G.cyl6,mt,.46,.47,-.86,.06,.36,.06,Math.PI/2);a(G.torus,dk,0,.62,.25,.20,.20,.20,-.5);a(G.box,p,0,.28,-1.0,1.25,.1,.12);}));
 const wheels=[];for(const x of [-.63,.63])for(const z of [-.63,.6]){const q=new THREE.Group();q.position.set(x,.22,z);g.add(q);mesh(G.cyl8,col(0x17141c),0,0,0,.22,.18,.22,q).rotation.z=Math.PI/2;mesh(G.cyl8,tmat(T.metal()),Math.sign(x)*.10,0,0,.1,.02,.1,q).rotation.z=Math.PI/2;wheels.push(q);}g.userData.vehicle={wheels};return g;}
