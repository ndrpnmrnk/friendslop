import {THREE,tmat} from '../core/gfx.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {pix} from '../core/textures.js';
export const OUTFIT_SLOTS=['hat','top','bottom','shoes'];
export const OUTFIT_NAMES={hat:['Кепка курьера','Шляпа детектива','Цилиндр вампира','Вязаная шапка'],top:['Куртка курьера','Плащ детектива','Жилет с накидкой','Куртка скейтера'],bottom:['Карго','Брюки в полоску','Бриджи вампира','Джинсы с заплатами'],shoes:['Рабочие ботинки','Туфли детектива','Сапоги с пряжками','Высокие кеды']};
export const OUTFIT_THEMES=['Тыквенный курьер','Полуночный детектив','Клубный вампир','Городской скейтер'];
const colors={hat:[['#a75f37','#d5a06a','#603b2e'],['#596568','#929b8d','#303f43'],['#39303d','#807080','#231e29'],['#79658b','#b2a3bb','#4d435f']],top:[['#aa613b','#d6a36d','#62402e'],['#57686a','#9ca798','#34464c'],['#6e3c52','#ba8b96','#392939'],['#706486','#b2a3bb','#484056']],bottom:[['#6e7657','#a9b080','#414b37'],['#4b5260','#929baa','#303643'],['#4c374b','#9e7c94','#302735'],['#4d6980','#9caeb8','#304959']],shoes:[['#70513c','#c39b6c','#332c29'],['#3f424a','#939893','#242833'],['#503b4a','#a98a9a','#2c2631'],['#77657f','#e1d8be','#3c3447']]};
// Два цельных атласных разворота: лицевая и задняя стороны. Карманы/швы не добавляют мешей.
export function outfitFabric(slot,v){return pix('outfit45-'+slot+'-'+v,64,64,c=>{
 const [base,light,dark]=colors[slot][v];c.fillStyle=base;c.fillRect(0,0,64,64);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const n=(x*13+y*19+x*y*3)%29;if(n<3){c.globalAlpha=.14;c.fillStyle=n===0?dark:light;c.fillRect(x,y,1,1);}}c.globalAlpha=1;
 const line=(x,y,w,h,color=light)=>{c.fillStyle=color;c.fillRect(x,y,w,h);},seam=(x,y,w,h)=>{line(x,y,w,h,dark);if(w>h)for(let i=1;i<w;i+=3)line(x+i,y+1,1,1);else for(let i=1;i<h;i+=3)line(x+1,y+i,1,1);};
 for(const b of[0,32]){seam(b+2,9,1,50);seam(b+29,9,1,50);seam(b+2,57,28,2);for(let i=0;i<4;i++){line(b+5+i*6,35+i%2*3,1,17,dark);line(b+6+i*6,35+i%2*3,1,13,light);}}
 if(slot==='top'){
  seam(15,8,2,49);for(let y=22;y<53;y+=8){line(17,y,2,2,'#c6b89a');line(17,y,1,1,'#eee0b7');}
  c.fillStyle=dark;c.beginPath();c.moveTo(8,8);c.lineTo(16,22);c.lineTo(24,8);c.lineTo(22,5);c.lineTo(10,5);c.fill();
  c.fillStyle=light;c.beginPath();c.moveTo(9,9);c.lineTo(14,12);c.lineTo(15,21);c.lineTo(7,15);c.fill();c.beginPath();c.moveTo(23,9);c.lineTo(18,12);c.lineTo(17,21);c.lineTo(25,15);c.fill();
  for(const x of[5,21]){line(x,37,7,12,dark);line(x+1,38,5,9,base);seam(x,36,7,1);line(x+2,37,2,1,'#d6c9a6');}
  seam(35,18,26,1);seam(47,21,1,34);
  if(v===0){line(5,25,7,2,'#d9c696');line(21,25,7,2,'#d9c696');line(5,19,5,3,'#ded0a7');}
  if(v===1){seam(2,45,28,2);line(14,44,4,4,'#c0b294');line(15,45,2,2,dark);for(const x of[8,24])seam(x,24,1,10);}
  if(v===2){line(13,13,6,19,'#c3b3a1');line(14,19,4,3,dark);line(15,22,2,9,dark);for(const x of[6,23])seam(x,22,2,30);}
  if(v===3){for(const x of[11,20]){line(x,19,1,14,'#d8cbae');line(x,32,2,2,dark);}line(8,39,16,9,dark);line(9,40,14,6,base);seam(9,39,14,1);}
 }else if(slot==='bottom'){
  for(const b of[0,32]){line(b+1,4,30,5,dark);line(b+3,6,26,1,light);for(const x of[7,23])seam(b+x,5,2,5);seam(b+15,12,1,43);}
  line(14,5,5,4,'#c3b18b');line(15,6,3,2,dark);seam(17,12,1,11);
  for(const x of[4,23]){seam(x,12,5,1);seam(x,13,1,7);}
  if(v===0)for(const x of[3,23]){line(x,25,7,12,dark);line(x+1,27,5,8,base);seam(x,24,7,2);}
  if(v===1)for(let x=3;x<64;x+=5)line(x,12,1,45,light);
  if(v===2)for(const x of[3,20]){line(x,51,9,5,dark);line(x,51,9,1,'#946277');}
  if(v===3)for(const [x,y]of[[6,34],[23,40]]){line(x,y,6,9,'#9c8c91');seam(x-1,y-1,8,1);seam(x-1,y+9,8,1);}
 }else if(slot==='hat'){
  for(const b of[0,32]){line(b+1,49,30,7,dark);line(b+1,49,30,1,light);seam(b+15,9,1,37);}
  if(v===0){line(12,27,8,8,'#d8bd8a');line(14,29,4,3,dark);seam(2,57,28,1);}
  if(v===1){line(0,45,64,6,dark);line(20,46,4,4,'#c0ac83');}
  if(v===2){line(0,43,64,10,'#9a5b74');line(13,46,6,4,'#cdb18a');}
  if(v===3){for(let x=0;x<64;x+=3)for(let y=0;y<61;y+=4){line(x+(y%8?1:0),y,1,2,light);line(x+1,y+1,1,2,dark);}line(22,49,6,5,'#d7c3a9');}
 }else{
  for(const b of[0,32]){line(b,54,32,9,v===3?'#d5cebc':dark);seam(b+2,48,28,1);line(b+1,59,30,2,dark);for(const x of[3,10,18,26])line(b+x,60,2,3,base);}
  for(let y=21;y<46;y+=6){line(11,y,10,2,'#d9ceaf');line(10,y,2,3,dark);line(21,y,2,3,dark);}seam(8,16,1,31);seam(24,16,1,31);
  if(v===2){line(1,24,30,4,dark);line(24,22,5,7,'#c2ae91');line(25,24,3,3,dark);}
  if(v===3){line(36,28,19,3,'#c1b1c6');line(39,31,3,7,'#c1b1c6');line(10,56,13,3,'#a55763');}
 }
 });}
const assets=new Map();
function loft(rings,N=12){const p=[],uv=[],idx=[];
 for(let r=0;r<rings.length;r++){const[y,rx,rz,cx=0,cz=0]=rings[r];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;p.push(cx+Math.sin(a)*rx,y,cz+Math.cos(a)*rz);uv.push(i/N,r/(rings.length-1));if(r&&i<N){const k=(r-1)*(N+1)+i;idx.push(k,k+1,k+N+1,k+1,k+N+2,k+N+1);}}}
 for(const [r,flip]of[[0,true],[rings.length-1,false]]){const offset=r*(N+1),center=p.length/3,[y,,,x=0,z=0]=rings[r];p.push(x,y,z);uv.push(.5,.5);for(let i=0;i<N;i++)idx.push(center,offset+(flip?i+1:i),offset+(flip?i:i+1));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function atlas(geo,slot){const g=geo.index?geo.toNonIndexed():geo.clone(),p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),front=n.getZ(i)>=0;let px=(x/(slot==='shoes'?.28:1.22)+.5);if(slot==='shoes'&&Math.abs(n.getX(i))>.5)px=(z+.18)/.46;const py=slot==='hat'?y/.65:slot==='shoes'?y/.39:y;u.setXY(i,(front?0:.5)+THREE.MathUtils.clamp(px,.015,.985)*.5,THREE.MathUtils.clamp(py*.86+.06,.015,.985));}return g;}
function build(slot,v){const pieces=[];const add=g=>pieces.push(g);
 if(slot==='top'){
  add(loft([[v===1?-.18:0,v===1?.46:.43,v===1?.36:.34],[.18,.41,.33],[.40,.405,.33],[.68,.47,.36],[.83,v===2?.46:.49,.35],[.97,.24,.24],[v===2?1.06:1,.235,.235]],12));if(v===2){const p=pieces[0].attributes.position;for(let i=0;i<p.count;i++)if(p.getZ(i)<0&&p.getY(i)<.25)p.setY(i,p.getY(i)-(.25-p.getY(i))*.55);pieces[0].computeVertexNormals();}
  if(v!==2)for(const s of[-1,1]){const g=loft([[v===1?-.08:0,.125,.15],[.25,.14,.16],[.42,.15,.17]],8);g.rotateZ(s*.52);g.translate(s*.47,.47,0);add(g);}
 }else if(slot==='bottom'){
  add(loft([[.57,.44,.32],[.79,.46,.34],[.96,.445,.33],[1,.445,.33]],12));
  for(const s of[-1,1])add(loft([[0,.19,.26,s*.232],[.08,.19,.265,s*.232],[.40,.215,.30,s*.232],[.65,.225,.32,s*.225]],8));
 }else if(slot==='hat'){
  if(v===0){const dome=new THREE.SphereGeometry(1,12,5,0,Math.PI*2,0,Math.PI/2);dome.scale(.40,.30,.37);dome.translate(0,.025,0);add(dome);add(loft([[0,.405,.375],[.045,.405,.375]],12));
   const sh=new THREE.Shape();sh.moveTo(-.29,.20);sh.quadraticCurveTo(-.37,.34,-.27,.51);sh.quadraticCurveTo(0,.62,.27,.51);sh.quadraticCurveTo(.37,.34,.29,.20);sh.closePath();const visor=new THREE.ExtrudeGeometry(sh,{depth:.025,bevelEnabled:false,curveSegments:4});visor.rotateX(Math.PI/2);visor.translate(0,.03,0);add(visor);
  }else if(v===1||v===2){add(loft([[0,.51,.44],[.025,.51,.44],[.045,.36,.31]],12));add(loft([[.03,.36,.31],[.12,.36,.31],[v===2?.55:.31,v===2?.32:.29,v===2?.28:.255],[v===2?.57:.33,v===2?.31:.28,v===2?.27:.25]],12));}
  else{const dome=new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2);dome.scale(.40,.35,.37);dome.translate(0,.05,0);add(dome);add(loft([[0,.415,.38],[.09,.415,.38],[.12,.39,.36]],12));}
 }else{
  // Колодка с суженным носом и непрерывным подъёмом; подошва и шнуровка живут в атласе.
  const p=[],uv=[],idx=[],rings=[[-.16,.09,.26],[-.08,v===1?.10:.115,[.28,.19,.39,.34][v]],[.02,.12,.21],[.14,.11,.14],[.245,.075,.10]];
  for(const [r,[z,w,h]]of rings.entries()){for(const [j,[x,y]]of [[-w,.025],[-w,h*.60],[-w*.60,h],[w*.60,h],[w,h*.60],[w,.025]].entries()){p.push(x,y,z);uv.push(j/5,r/4);if(r){const a=(r-1)*6+j,b=(r-1)*6+(j+1)%6;idx.push(a,b,a+6,b,b+6,a+6);}}}
  for(let i=1;i<5;i++){idx.push(0,i+1,i);idx.push(24,24+i,24+i+1);}for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g);
 }
 const mapped=pieces.map(g=>atlas(g,slot)),geo=mergeGeometries(mapped,false);pieces.forEach(g=>g.dispose());mapped.forEach(g=>g.dispose());geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
}
// Вещь всегда одна отрисовка. Нет своего материала/буфера у каждой копии на стойке.
export function outfitPiece(slot,v){const key=slot+'-'+v;let asset=assets.get(key);if(!asset){asset={geo:build(slot,v),material:tmat(outfitFabric(slot,v))};assets.set(key,asset);}const g=new THREE.Group();g.name='outfit-'+key;g.userData.outfitSlot=slot;g.userData.variant=v;g.userData.flaps=[];const m=new THREE.Mesh(asset.geo,asset.material);m.castShadow=true;m.receiveShadow=true;g.add(m);return g;}
