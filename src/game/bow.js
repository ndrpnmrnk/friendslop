import {W} from '../world/state.js';
import {placeArcDots} from './trajectory.js';
import {THREE,G,V3,mesh,col,tmat} from '../core/gfx.js';
import {raySolids,groundAt} from '../world/physics.js';
import {sweepActors} from './impacts.js';
import {T} from '../core/textures.js';
// Дуга с геометрическим изгибом, настоящая тетива и стрела. Колчан принадлежит предмету.
// v0.56: игрушечный лук и стрелы-присоски. Стрела: пластиковое древко, красная резиновая присоска, яркое оперение.
const AR_SHAFT=0xf5c542,AR_CUP=0xe2304a,AR_FLETCH=[0x4ab0f0,0x9be36b,0xff6aa8];
export function arrowModel(c=0){const g=new THREE.Group(),shaft=col(AR_SHAFT),cup=col(AR_CUP),fl=col(AR_FLETCH[c%3]);
 mesh(G.cyl6,shaft,0,0,0,.016,.7,.016,g).rotation.x=Math.PI/2;
 mesh(G.cyl8,cup,0,0,.36,.03,.05,.03,g).rotation.x=Math.PI/2;mesh(G.cone8,cup,0,0,.4,.075,.06,.075,g).rotation.x=-Math.PI/2;mesh(G.cyl8,col(0xb81e36),0,0,.432,.078,.012,.078,g).rotation.x=Math.PI/2;
 for(let k=0;k<3;k++){const f=mesh(G.box,fl,0,0,-.29,.01,.09,.13,g);f.rotation.z=k*Math.PI*2/3;f.position.set(Math.sin(k*2.09)*.04,Math.cos(k*2.09)*.04,-.29);}
 mesh(G.cyl6,col(0x2a2430),0,0,-.355,.02,.02,.02,g).rotation.x=Math.PI/2;return g;}
export function bowModel(){
 // плечи — гнутый пластик двух цветов с загнутыми концами, рукоять в обмотке, прицел-мушка
 const g=new THREE.Group(),arms=[],limb=col(0x2fa0c8),tip=col(0xff8a1f);
 for(const sign of [-1,1]){const arm=new THREE.Group();g.add(arm);for(let i=0;i<6;i++){const f0=i/6,f1=(i+1)/6,a=new V3(0,sign*(.09+f0*.54),-(f0**2)*.2+(f0>.8?(f0-.8)*.25:0)),b=new V3(0,sign*(.09+f1*.54),-(f1**2)*.2+(f1>.8?(f1-.8)*.25:0)),v=b.clone().sub(a),m=mesh(G.box,i>=5?tip:limb,0,0,0,.05,v.length()+.012,.034-f0*.012,arm);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new V3(0,1,0),v.normalize());}
  mesh(G.sph10,tip,0,sign*.645,-.13,.035,.035,.035,arm);arms.push(arm);}
 mesh(G.box,col(0x1e1a24),0,0,.01,.06,.22,.06,g);for(let k=0;k<4;k++)mesh(G.cyl8,col(0xf1e8ff),0,-.08+k*.055,.01,.066,.018,.066,g);
 mesh(G.box,col(0xff8a1f),0,.13,.05,.02,.06,.04,g);
 const geo=new THREE.BufferGeometry().setFromPoints([new V3(0,-.63,-.19),new V3(0,0,-.19),new V3(0,.63,-.19)]),string=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xf8f4ff}));g.add(string);const arrow=arrowModel();g.add(arrow);g.userData.bow={arms,string,arrow};return g;
}
export function poseBow(a,it,dt){
 const ch=a.ch;if(!ch)return;const model=it.g.userData.bow;if(!model)return;
 if(!it.quiver){const q=new THREE.Group();mesh(G.cyl8,tmat(T.cloth(0x69493c)),0,0,0,.14,.58,.14,q);const arrows=Array.from({length:8},(_,i)=>{const ar=arrowModel();ar.position.set((i%3-1)*.065,.30+(i%2)*.06,(Math.floor(i/3)-1)*.06);ar.rotation.x=-Math.PI/2;q.add(ar);return ar;});it.quiver=q;it.quiverArrows=arrows;a.root.add(q);q.position.set(.26,.98,-.26);q.rotation.z=-.28;}
 if(it.quiver.parent!==a.root)a.root.add(it.quiver);it.quiver.visible=!a.drone&&!a.returning;it.quiver.scale.setScalar(Math.min(1,(it.equipT=(it.equipT||0)+dt)*5));const nocked=it.ammo>0&&(it.cd||0)<.25&&it.equipT>.65;it.quiverArrows.forEach((q,i)=>q.visible=i<it.ammo-(nocked?1:0));
 const draw=it.draw||0,reload=Math.max(0,it.cd||0),f=a.root.rotation.y;
 ch.handL.position.set(-.26,1.0,.62);ch.handR.position.set(-.20,1.0,.43-draw*.43);
 if(reload>.25){const k=Math.sin(Math.min(1,reload/1.0)*Math.PI);ch.handR.position.set(.22,.99+k*.62,.5-k*.84);}
 const point=a.root.localToWorld(new V3(-.26,1,.62));it.pos.copy(point);it.g.position.copy(point);it.g.rotation.set(0,f,0);if(it.drawAim)it.g.lookAt(it.drawAim);
 for(let i=0;i<2;i++)model.arms[i].rotation.x=(i?-1:1)*draw*.18;
 const attr=model.string.geometry.attributes.position;for(let i=0;i<2;i++){const tip=new V3(0,i?.63:-.63,-.19).applyEuler(model.arms[i].rotation);attr.setXYZ(i?2:0,tip.x,tip.y,tip.z);}attr.setXYZ(1,0,0,-.19-draw*.43);attr.needsUpdate=true;model.arrow.visible=nocked;model.arrow.position.z=.16-draw*.43;
}

export const ARROW_GRAVITY=16;
export function bowVelocity(from,aim,draw){return aim.clone().sub(from).normalize().multiplyScalar(7+37*Math.max(0,Math.min(1,draw))**.85);}
const bowPoints=[];
export function predictBow(a,aim,out,end){const it=a.held,from=it.pos,p=from.clone(),v=bowVelocity(p,aim,it.draw||0),step=1/30;let n=0;end.visible=false;for(let i=0;i<180;i++){const old=p.clone(),dv=v.clone().multiplyScalar(step);dv.y-=.5*ARROW_GRAVITY*step*step;const len=dv.length(),wall=raySolids(old,dv.clone().normalize(),len);p.add(dv);v.y-=ARROW_GRAVITY*step;const hit=sweepActors(old,p,.08,a);if(hit&&hit.t*len<wall)p.lerpVectors(old,p,hit.t);else if(wall<len)p.copy(old).addScaledVector(dv,wall/len);const gy=groundAt(p.x,p.z,.04,p.y+.15),edge=Math.abs(p.x)>W.bounds-.1||Math.abs(p.z)>W.bounds-.1;if(edge){p.x=THREE.MathUtils.clamp(p.x,-W.bounds+.1,W.bounds-.1);p.z=THREE.MathUtils.clamp(p.z,-W.bounds+.1,W.bounds-.1);}if(p.y<=gy)p.y=gy+.025;(bowPoints[n]||(bowPoints[n]=new V3())).copy(p);n++;if(hit||wall<len||p.y<=gy+.025||edge){end.position.copy(p);end.visible=true;break;}}return placeArcDots(from,bowPoints,n,out);}

// v0.56: прицел сетемёта — та же дуга точками, что у броска и лука (скорость 19 м/с, подъём +2, гравитация 6, 1.6 с)
const netPoints=[];
export function netVelocity(from,aim){const dir=aim.clone().sub(from).normalize();return dir.multiplyScalar(19).add(new V3(0,2,0));}
export function predictNet(a,aim,out,end){const it=a.held,from=it.pos.clone(),dir=aim.clone().sub(from).normalize(),p=from.clone().addScaledVector(dir,.6),v=netVelocity(from,aim),step=1/30,g=6;let n=0;end.visible=false;
 for(let i=0;i<48;i++){const old=p.clone(),dv=v.clone().multiplyScalar(step);dv.y-=.5*g*step*step;const len=dv.length(),wall=raySolids(old,dv.clone().normalize(),len);p.add(dv);v.y-=g*step;const hit=sweepActors(old,p,.12,a);if(hit&&hit.t*len<wall)p.lerpVectors(old,p,hit.t);else if(wall<len)p.copy(old).addScaledVector(dv,wall/len);
  const gy=groundAt(p.x,p.z,.05,p.y+.1);if(p.y<=gy)p.y=gy+.03;(netPoints[n]||(netPoints[n]=new V3())).copy(p);n++;if(hit||wall<len||p.y<=gy+.03||i===47){end.position.copy(p);end.visible=true;break;}}return placeArcDots(from,netPoints,n,out);}
