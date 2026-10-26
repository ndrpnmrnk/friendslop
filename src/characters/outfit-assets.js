import {THREE,tmat} from '../core/gfx.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export const OUTFIT_SLOTS=['hat','top','bottom','shoes'];
export const OUTFIT_NAMES={hat:['Кепка курьера','Шляпа детектива','Цилиндр вампира','Вязаная шапка'],top:['Куртка курьера','Плащ детектива','Жилет с накидкой','Куртка скейтера'],bottom:['Карго','Брюки в полоску','Бриджи вампира','Джинсы с заплатами'],shoes:['Рабочие ботинки','Туфли детектива','Сапоги с пряжками','Высокие кеды']};
export const OUTFIT_THEMES=['Тыквенный курьер','Полуночный детектив','Клубный вампир','Городской скейтер'];
export {fabricTexture as outfitFabric} from './outfit-textiles.js';
import {fabricTexture as outfitFabric} from './outfit-textiles.js';
const assets=new Map();
function loft(rings,N=12){const p=[],uv=[],idx=[];
 for(let r=0;r<rings.length;r++){const[y,rx,rz,cx=0,cz=0]=rings[r];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;p.push(cx+Math.sin(a)*rx,y,cz+Math.cos(a)*rz);uv.push(i/N,r/(rings.length-1));if(r&&i<N){const k=(r-1)*(N+1)+i;idx.push(k,k+1,k+N+1,k+1,k+N+2,k+N+1);}}}
 for(const [r,flip]of[[0,true],[rings.length-1,false]]){const offset=r*(N+1),center=p.length/3,[y,,,x=0,z=0]=rings[r];p.push(x,y,z);uv.push(.5,.5);for(let i=0;i<N;i++)idx.push(center,offset+(flip?i+1:i),offset+(flip?i:i+1));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function atlas(geo,slot){const g=geo.index?geo.toNonIndexed():geo.clone(),p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),front=n.getZ(i)>=0;let px=(x/(slot==='shoes'?.28:1.22)+.5);if(slot==='shoes'&&Math.abs(n.getX(i))>.5)px=(z+.18)/.46;const py=slot==='hat'?y/.65:slot==='shoes'?y/.39:y;u.setXY(i,(front?0:.5)+THREE.MathUtils.clamp(px,.015,.985)*.5,THREE.MathUtils.clamp(py*.86+.06,.015,.985));}return g;}
function build(slot,v){const pieces=[];const add=(g,trim=false)=>{g.setAttribute('aTrim',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(trim?1:0),1));pieces.push(g);};
 const box=(x,y,z,w,h,d,rz=0)=>{const g=new THREE.BoxGeometry(w,h,d);g.rotateZ(rz);g.translate(x,y,z);add(g,true);};
 const ring=(x,y,z,rx,rz,h)=>add(loft([[y,rx,rz,x,z],[y+h,rx,rz,x,z]],12),true);
 if(slot==='top'){
  add(loft([[v===1?-.18:0,v===1?.46:.43,v===1?.36:.34],[.18,.41,.33],[.40,.405,.33],[.68,.47,.36],[.83,v===2?.46:.49,.35],[.97,.24,.24],[v===2?1.06:1,.235,.235]],16));if(v===2){const p=pieces[0].attributes.position;for(let i=0;i<p.count;i++)if(p.getZ(i)<0&&p.getY(i)<.25)p.setY(i,p.getY(i)-(.25-p.getY(i))*.55);pieces[0].computeVertexNormals();}
  if(v!==2)for(const s of[-1,1]){const g=loft([[v===1?-.08:0,.125,.15],[.25,.14,.16],[.42,.15,.17]],8);g.rotateZ(s*.52);g.translate(s*.47,.47,0);add(g);}
 }else if(slot==='bottom'){
  add(loft([[.57,.44,.32],[.79,.46,.34],[.96,.445,.33],[1,.445,.33]],12));
  for(const s of[-1,1])add(loft([[0,.19,.26,s*.232],[.08,.19,.265,s*.232],[.40,.215,.30,s*.232],[.65,.225,.32,s*.225]],8));
  add(loft([[.30,.075,.27],[.57,.17,.31],[.67,.20,.32]],8));
 }else if(slot==='hat'){
  if(v===0){const dome=new THREE.SphereGeometry(1,12,5,0,Math.PI*2,0,Math.PI/2);dome.scale(.40,.30,.37);dome.translate(0,.025,0);add(dome);add(loft([[0,.405,.375],[.045,.405,.375]],12));
   const sh=new THREE.Shape();sh.moveTo(-.29,.20);sh.quadraticCurveTo(-.37,.34,-.27,.51);sh.quadraticCurveTo(0,.62,.27,.51);sh.quadraticCurveTo(.37,.34,.29,.20);sh.closePath();const visor=new THREE.ExtrudeGeometry(sh,{depth:.025,bevelEnabled:false,curveSegments:6});visor.rotateX(Math.PI/2);visor.translate(0,.03,0);add(visor);
  }else if(v===1||v===2){add(loft([[0,.51,.44],[.025,.51,.44],[.045,.36,.31]],12));add(loft([[.03,.36,.31],[.12,.36,.31],[v===2?.55:.31,v===2?.32:.29,v===2?.28:.255],[v===2?.57:.33,v===2?.31:.28,v===2?.27:.25]],12));}
  else{const dome=new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2);dome.scale(.40,.35,.37);dome.translate(0,.05,0);add(dome);add(loft([[0,.415,.38],[.09,.415,.38],[.12,.39,.36]],12));}
 }else{
  // Колодка с суженным носом и непрерывным подъёмом; подошва и шнуровка живут в атласе.
  const p=[],uv=[],idx=[],rings=[[-.16,.09,.26],[-.08,v===1?.10:.115,[.28,.19,.39,.34][v]],[.02,.12,.21],[.14,.11,.14],[.245,.075,.10]];
  for(const [r,[z,w,h]]of rings.entries()){for(const [j,[x,y]]of [[-w,.025],[-w,h*.60],[-w*.60,h],[w*.60,h],[w,h*.60],[w,.025]].entries()){p.push(x,y,z);uv.push(j/5,r/4);if(r){const a=(r-1)*6+j,b=(r-1)*6+(j+1)%6;idx.push(a,b,a+6,b,b+6,a+6);}}}
  for(let i=1;i<5;i++){idx.push(0,i+1,i);idx.push(24,24+i,24+i+1);}for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g);
 }
 // Объёмные конструктивные детали остаются частью той же общей геометрии.
 if(slot==='top'){
  for(const x of[-.23,.23])box(x,.35,.335,.20,.17,.055);
  for(const side of[-1,1])box(side*.115,.865,.27,.12,.25,.045,side*.42);
  if(v===0){for(const side of[-1,1]){box(side*.225,.61,.342,.19,.12,.05);box(side*.225,.67,.365,.205,.025,.025);box(side*.60,.48,0,.17,.075,.28,side*.52);}box(0,.48,.353,.025,.63,.025);}
  if(v===1){ring(0,.24,0,.465,.365,.045);for(const y of[.43,.56,.69])for(const x of[-.10,.10])box(x,y,.363,.025,.025,.019);box(0,.71,-.35,.53,.07,.035);}
  if(v===2){ring(0,.94,-.035,.25,.26,.14);box(0,.79,.332,.07,.10,.035);box(0,.62,.35,.035,.24,.025);}
  if(v===3){ring(0,.88,-.055,.265,.27,.08);for(const x of[-.10,.10])box(x,.70,.365,.015,.20,.022);box(0,.32,.37,.30,.13,.045);}
 }else if(slot==='bottom'){
  if(v===0)for(const x of[-.385,.385])box(x,.43,.04,.095,.22,.28);
  if(v===1)for(const x of[-.232,.232])box(x,.33,.294,.012,.52,.022);
  if(v===2)for(const x of[-.232,.232])ring(x,.04,0,.198,.275,.07);
  if(v===3)for(const[x,y]of[[-.232,.31],[.232,.24]])box(x,y,.296,.12,.17,.026);
 }else if(slot==='hat'){
  if(v===0){box(0,.17,.348,.11,.10,.025);for(const x of[-.365,.365])box(x,.06,0,.018,.025,.03);}
  if(v===1)ring(0,.09,0,.367,.317,.048);
  if(v===2){ring(0,.11,0,.365,.315,.065);box(0,.143,.32,.085,.06,.022);}
  if(v===3)box(.23,.074,.314,.085,.058,.018);
 }else{
  box(0,.024,.045,.218,.045,.375);box(0,.050,-.105,.185,.065,.09);
  for(const z of[-.015,.03,.075])box(0,.203-Math.max(0,z)*.36,z,.13,.009,.012);
  if(v===2)box(.113,.26,-.05,.016,.07,.08);
 }
 const mapped=pieces.map(g=>atlas(g,slot)),geo=mergeGeometries(mapped,false);pieces.forEach(g=>g.dispose());mapped.forEach(g=>g.dispose());geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
}
// Вещь всегда одна отрисовка. Нет своего материала/буфера у каждой копии на стойке.
export function outfitPiece(slot,v){const key=slot+'-'+v;let asset=assets.get(key);if(!asset){asset={geo:build(slot,v),material:tmat(outfitFabric(slot,v))};assets.set(key,asset);}const g=new THREE.Group();g.name='outfit-'+key;g.userData.outfitSlot=slot;g.userData.variant=v;g.userData.flaps=[];const m=new THREE.Mesh(asset.geo,asset.material);m.castShadow=true;m.receiveShadow=true;g.add(m);return g;}
