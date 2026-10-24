import { THREE, G, mesh, tmat, lam, frontBack, compose } from '../core/gfx.js';
import { photo, pix } from '../core/textures.js';

// Взрослый доисторический парень: крупная голова, маленький корпус и парящие
// кисти/ступни общего рига. Геометрия и маленькие текстуры общие у всех копий.
let headGeo, hairGeo, bodyGeo, hipGeo, limbGeo, capeGeo, leafGeo, partGeo, ragGeo, vineGeo;
const skinTexture = () => photo('caveSkin28', 32, 32, (g, w, h) => {
  const shade = g.createLinearGradient(0, 0, w, h);
  shade.addColorStop(0, '#e0b28d'); shade.addColorStop(0.5, '#d0a080'); shade.addColorStop(1, '#ba8567');
  g.fillStyle = shade; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 210; i++) { g.fillStyle = i % 2 ? 'rgba(106,65,44,.09)' : 'rgba(255,220,184,.12)'; g.fillRect((i * 37 % 101) / 101 * w, (i * 61 % 103) / 103 * h, w / 40, h / 40); }
});
const faceTexture = expression => photo('caveFace28-' + expression, 48, 48, (g, w, h) => {
  g.drawImage(skinTexture().image, 0, 0, w, h);
  const line = (points, color, width) => { g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.beginPath(); points.forEach(([x,y], i) => i ? g.lineTo(x*w,y*h) : g.moveTo(x*w,y*h)); g.stroke(); };
  // Пробор и пряди обрамляют лицо; объём волос продолжается по бокам и сзади.
  for (const side of [-1,1]) {
    g.fillStyle = '#3b2b25'; g.beginPath(); g.moveTo(w*(0.5+side*0.025),0); g.lineTo(w*(0.5+side*0.46),h*0.02); g.lineTo(w*(0.5+side*0.47),h*0.58); g.lineTo(w*(0.5+side*0.34),h*0.37); g.lineTo(w*(0.5+side*0.27),h*0.17); g.closePath(); g.fill();
  }
  for (const x of [0.33,0.67]) {
    line([[x-.09,.38],[x-.02,.35],[x+.075,.38]], '#4a3027', w*.025);
    if (expression === 'blink') line([[x-.07,.48],[x+.07,.48]], '#583d32', w*.02);
    else if (expression === 'dizzy') { line([[x-.045,.44],[x+.045,.51]], '#382a25', w*.018); line([[x-.045,.51],[x+.045,.44]], '#382a25', w*.018); }
    else {
      g.fillStyle = '#f0dcc3'; g.beginPath(); g.ellipse(x*w,h*.475,w*.075,h*(expression==='wow'?.065:.045),0,0,7); g.fill();
      g.fillStyle = '#49392b'; g.fillRect(w*(x-.025),h*.44,w*.05,h*.075);
      g.fillStyle = '#211c1d'; g.fillRect(w*(x-.012),h*.45,w*.025,h*.05);
      g.fillStyle = '#f7ecda'; g.fillRect(w*(x-.014),h*.447,w*.012,h*.018);
    }
  }
  line([[.49,.49],[.47,.62],[.53,.635]], '#b37c60', w*.018);
  if (expression === 'wow') { g.fillStyle = '#633c33'; g.beginPath(); g.ellipse(w*.5,h*.77,w*.055,h*.07,0,0,7); g.fill(); }
  else { line([[.38,.755],[.49,.78],[.60,.74]], '#845447', w*.02); line([[.44,.82],[.55,.82]], '#e4b497', w*.018); }
});
const hairTexture = () => photo('caveHair28', 32, 32, (g,w,h) => {
  g.fillStyle = '#302522'; g.fillRect(0,0,w,h);
  for(let i=0;i<80;i++){g.strokeStyle=['#513b2e','#251d1c','#664b36','#3d2c25'][i%4];g.lineWidth=w/48;g.beginPath();const x=i/80*w;g.moveTo(x,0);g.quadraticCurveTo(x+w*.1,h*.5,x-w*.04,h);g.stroke();}
});
// Проекция макушки спереди: тонкая линия пробора и пряди расходятся к вискам.
const partTexture = () => photo('cavePart281',48,32,(g,w,h)=>{
  g.drawImage(hairTexture().image,0,0,w,h);
  for(let i=0;i<16;i++)for(const side of [-1,1]){
    const y=(.06+i*.052)*h;g.strokeStyle=['#5d4533','#251d1c','#493428'][i%3];g.lineWidth=w*.012;
    g.beginPath();g.moveTo(w*(.5+side*.012),y);g.quadraticCurveTo(w*(.5+side*.2),y+h*.05,w*(.5+side*.47),y+h*.32);g.stroke();
  }
  g.strokeStyle='#806047';g.lineWidth=w*.016;g.beginPath();g.moveTo(w*.5,0);g.lineTo(w*.5,h*.92);g.stroke();
});
const peltTexture = () => photo('cavePelt28', 64, 32, (g,w,h) => {
  g.fillStyle='#302820';g.fillRect(0,0,w,h);
  for(let i=0;i<650;i++){const x=(i*37%653)/653*w,y=(i*71%659)/659*h;g.strokeStyle=['#463a2b','#5c4933','#211d1b','#746044'][i%4];g.lineWidth=w/90;g.beginPath();g.moveTo(x,y);g.lineTo(x+(i%5-2)*w*.008,y+h*(.05+i%4*.012));g.stroke();}
  g.fillStyle='rgba(174,137,85,.32)';g.fillRect(0,h*.9,w,h*.1);
});
const bellyTexture = () => photo('caveBelly28',32,32,(g,w,h)=>{
  g.drawImage(skinTexture().image,0,0,w,h);
  g.strokeStyle='rgba(140,87,63,.28)';g.lineWidth=w*.025;g.beginPath();g.moveTo(w*.28,h*.31);g.quadraticCurveTo(w*.5,h*.41,w*.72,h*.31);g.stroke();
  g.fillStyle='#a87258';g.fillRect(w*.48,h*.70,w*.045,h*.035);
});
const leafTexture = () => pix('caveLeaf28',32,32,(g,w,h)=>{
  g.fillStyle='#477436';g.fillRect(0,0,w,h);
  for(let y=0;y<h;y++){g.fillStyle=y%4?'#5a8c3d':'#659b48';g.fillRect(1,y,w/2-1,1);}
  g.strokeStyle='#b5bd62';g.lineWidth=1;g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.stroke();
  for(let i=0;i<5;i++)for(const side of [-1,1]){g.strokeStyle='#8da654';g.beginPath();g.moveTo(w/2,5+i*5);g.lineTo(w/2+side*(12-i*1.5),i*5);g.stroke();}
});
function polygon(points, depth=0) {
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1});
  geo.computeBoundingBox();const b=geo.boundingBox,p=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-b.min.x)/(b.max.x-b.min.x),(p.getY(i)-b.min.y)/(b.max.y-b.min.y));
  return geo;
}
function geometry() {
  if(headGeo)return;
  headGeo=frontBack(new THREE.SphereGeometry(1,8,6),0.08);
  bodyGeo=frontBack(new THREE.CylinderGeometry(.30,.235,.51,8),0.02);
  hipGeo=new THREE.CylinderGeometry(.24,.25,.23,8);
  limbGeo=new THREE.SphereGeometry(1,6,4);
  hairGeo=new THREE.SphereGeometry(1,8,3,0,Math.PI*2,0,Math.PI*.49);
  // Линия волос выше у лба: видны пробор и брови, затылок остаётся закрытым.
  const hp=hairGeo.attributes.position;
  for(let i=0;i<hp.count;i++){const y=hp.getY(i),z=hp.getZ(i);hp.setY(i,y+.55*Math.max(0,z)*Math.max(0,(.45-y)/.45));}
  hairGeo.computeVertexNormals();hairGeo=frontBack(hairGeo,0);
  vineGeo=new THREE.TorusGeometry(1,.045,4,10);
  // Одна широкая половина чёлки от пробора до виска; вторая зеркальная.
  // Кривизна повторяет голову, концы уходят в стороны вместо двух отдельных шипов.
  partGeo=polygon([[-.018,.02],[-.14,.02],[-.29,-.07],[-.38,-.19],[-.38,-.43],[-.31,-.50],[-.26,-.40],[-.255,-.24],[-.18,-.15],[-.04,-.08]],.035);
  const pp=partGeo.attributes.position;
  for(let i=0;i<pp.count;i++){
    const x=pp.getX(i),y=1.72+pp.getY(i),z=.35*Math.sqrt(Math.max(.04,1-(x/.47)**2-((y-1.36)/.45)**2))+.025;
    pp.setZ(i,z+pp.getZ(i));
  }
  partGeo.computeVertexNormals();
  capeGeo=new THREE.CylinderGeometry(.19,.43,.17,10,1,true);
  ragGeo=polygon([[-.105,0],[.105,0],[.09,-.17],[.045,-.24],[.01,-.19],[-.035,-.27],[-.065,-.20],[-.10,-.23]],.012);
  // Непрозрачный лист с выпуклой центральной жилкой, прикрывает спереди и с боков.
  const rim=[[-.07,0,0],[-.155,-.09,-.012],[-.15,-.19,-.008],[-.09,-.27,0],[0,-.34,.015],[.10,-.26,0],[.16,-.16,-.008],[.14,-.07,-.012],[.065,0,0]],p=[],uv=[];
  for(let i=0;i<rim.length;i++)for(const q of [[0,-.135,.052],rim[i],rim[(i+1)%rim.length]]){p.push(...q);uv.push(q[0]/.34+.5,1+q[1]/.34);}
  leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));leafGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));leafGeo.computeVertexNormals();
}
export const CAVEMAN_SKIN = {
  name:'Питекантроп',
  build({head,torso,handL,handR,footL,footR}) {
    geometry();
    const skin=tmat(skinTexture()),hair=tmat(hairTexture()),pelt=lam({map:peltTexture(),side:THREE.DoubleSide},'cavePelt28');
    const faces=Object.fromEntries(['idle','blink','wow','dizzy'].map(e=>[e,tmat(faceTexture(e))]));
    const h=mesh(headGeo,[faces.idle,skin],0,1.36,.015,.43,.40,.35,head);
    mesh(hairGeo,[tmat(partTexture()),hair],0,1.395,-.012,.46,.43,.38,head);
    head.add(compose('caveHairAndEars281',a=>{
      a(limbGeo,skin,-.42,1.29,0,.065,.09,.055);a(limbGeo,skin,.42,1.29,0,.065,.09,.055);
      for(const side of [-1,1])a(partGeo,hair,0,1.72,0,side,1,1);
      // Затылок закрыт волосами, короткие пряди доходят до шеи.
      a(limbGeo,hair,0,1.27,-.24,.38,.31,.14);
      a(G.cone4,skin,0,1.30,.337,.052,.11,.085,Math.PI/2);
    }));
    head.userData={h,faces};
    mesh(bodyGeo,[tmat(bellyTexture()),skin],0,.675,0,1,1,.78,torso);
    torso.add(compose('caveBody281',a=>{
      a(hipGeo,skin,0,.345,0,1,1,.82);
      for(const s of [-1,1])a(limbGeo,skin,s*.088,.335,-.142,.112,.095,.072);
      a(G.cyl6,skin,0,.97,0,.115,.14,.10);
    }));
    const nativePelt=compose('cave44-pelt',a=>{
      a(capeGeo,pelt,0,.91,0,1,1,.85);
      for(const side of [-1,1])a(limbGeo,pelt,side*.29,.885,0,.19,.09,.25);
      a(limbGeo,pelt,0,.875,-.16,.31,.08,.18);
    });nativePelt.userData.outfitSlot='top';torso.add(nativePelt);
    const flaps=[];
    for(let i=0;i<9;i++){
      const angle=i*Math.PI*2/9,pv=new THREE.Group();pv.position.set(Math.sin(angle)*.425,.832,Math.cos(angle)*.425*.85);pv.rotation.order='YXZ';pv.rotation.y=angle;torso.add(pv);
      mesh(ragGeo,pelt,0,0,0,1,i%3===0?1.10:.85,1,pv);
      pv.userData={outfitSlot:'top',rest:-.10,back:-Math.cos(angle),phase:i*1.37,velocity:0};pv.rotation.x=-.10;flaps.push(pv);
    }
    const leaf=new THREE.Group();leaf.position.set(0,.49,.238);leaf.name='caveman-leaf';leaf.userData.outfitSlot='bottom';torso.add(leaf);
    mesh(leafGeo,lam({map:leafTexture(),side:THREE.DoubleSide},'caveLeaf28'),0,0,0,1,1,1,leaf);
    const vine=compose('caveVine28',a=>{a(vineGeo,tmat(leafTexture()),0,.475,0,.25,.20,.25,Math.PI/2);a(G.box,tmat(leafTexture()),0,.487,.24,.035,.06,.025);});vine.userData.outfitSlot='bottom';torso.add(vine);
    torso.userData.cave={flaps,leaf};
    for(const [hand,side] of [[handL,-1],[handR,1]])hand.add(compose('caveHand28-'+side,a=>{
      a(G.box,skin,0,0,0,.15,.15,.17);a(G.box,skin,-side*.075,-.01,.04,.055,.07,.09);
    }));
    for(const foot of [footL,footR])foot.add(compose('caveFoot28',a=>{
      a(limbGeo,skin,0,.075,.045,.105,.075,.17);
      // Пальцы обозначены фактурой и общим силуэтом, ступни не превращаются в обувь.
      a(G.box,skin,0,.07,.15,.18,.07,.07);
    }));
    return {top:1.84,handX:.48,handY:.63,handZ:.07,footX:.17,footY:0,holdX:.27,holdY:.98,holdZ:.46,shadow:.48};
  },
  face(c,e){const u=c.head.userData;u.h.material[0]=u.faces[e]||u.faces.idle;},
  animate(c,dt,s){
    const {flaps,leaf}=c.torso.userData.cave,t=s.t||0,speed=Math.min(1.4,Math.max(0,s.speed||0)),step=Math.min(dt,.05);
    for(const pv of flaps){
      const u=pv.userData,flutter=Math.sin(t*(8+u.phase*.35)+u.phase)*(.025+speed*.07);
      const fall=s.air?Math.min(.26,Math.max(-.10,-(s.vy||0)*.022)):0;
      const target=Math.max(-.72,Math.min(-.04,u.rest-speed*(.10+Math.max(0,u.back)*.20)-fall-flutter));
      // Упругая инерция каждого лоскута; угол ограничен наружной стороной корпуса.
      u.velocity+=(target-pv.rotation.x)*85*step;u.velocity*=Math.exp(-step*12);
      pv.rotation.x=Math.max(-.78,Math.min(-.025,pv.rotation.x+u.velocity*step));
    }
    leaf.rotation.z=Math.sin(t*(3+speed*5))*(.008+speed*.018);
  },
};
