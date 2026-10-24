import {THREE,G,V3,mesh,col,tmat,glow,compose} from '../core/gfx.js';
import {T,facade,pix} from '../core/textures.js';
import {Builder} from '../world/builder.js';
import {createWorld,withWorld} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {bakeStatic} from '../world/bake.js';
import {registerInteracts} from '../game/worldfx.js';
import {LAMP_CONE_M} from '../world/props.js';
import {resetTools} from '../game/tools.js';
import {resetSplat} from '../world/splat.js';

// Настоящий небольшой игровой мир: тот же Builder, коллизии и реквизит, что у карт.
export function buildHub(scene){
 const group=new THREE.Group();scene.add(group);const state=createWorld(group);state.bounds=18;
 return withWorld(state,()=>{
  const b=new Builder(0,0,0,{id:'hub',name:'Двор'}),wood=tmat(T.wood()),metal=tmat(T.metal()),dark=col(0x272332),cream=col(0xb5ad98);
  // Общая земля и соседние кварталы продолжаются до тумана - край платформы не виден.
  b.ground(-100,-100,100,100,T.asphalt(),4,-.04);
  b.ground(-40,17,40,20,T.pave(),1.5);b.ground(-42,27,42,31,T.pave(),1.5);
  for(const z of[20,27])b.box(0,z,84,.16,.14,tmat(T.concrete()),{y:-.08});
  for(let x=-39;x<=39;x+=6)b.marking(x,23.5,2.8,.12,0xaaa58d);
  for(const[x,z,w,d,h,c]of[[-29,-6,13,25,10,0x595260],[29,-7,13,27,12,0x4b5361],[-25,38,15,13,10,0x5f515d],[-7,38,16,13,13,0x565969],[12,38,16,13,9,0x655951],[30,38,14,13,12,0x4e5960],[-25,-34,15,14,12,0x4f4a5c],[0,-34,20,14,11,0x535c68],[26,-34,17,14,14,0x635755]]){
   b.box(x,z,w,d,h,tmat(facade(c,w,h,{lit:.3})));b.box(x,z,w+.25,d+.25,.2,tmat(T.roof()),{y:h});
  }
  for(const[x,z,sc]of[[-20,12,.9],[22,14,.85],[-34,26,.9],[37,27,.8],[-19,-24,1],[20,-25,1]])b.tree(x,z,sc,0,'maple');
  b.car(-11,24,0,0x4b5962);b.car(13,29,Math.PI,0x67584a);
  b.fence(-40,31,40,31,1.1,'iron');b.bench(-18,29);b.bench(24,29,Math.PI);
  b.ground(-14,-15,14,16,T.cobble(),3);
  for(const [x,z,w,d,h,c]of[[-16,-2,5,29,8,0x514858],[16,-2,5,29,7,0x454b59],[0,-17,27,5,6,0x514959]]){
   b.box(x,z,w,d,h,tmat(facade(c,w,h,{lit:.3})));b.box(x,z,w+.25,d+.25,.20,tmat(T.roof()),{y:h});
  }
  for(const x of[-12,12]){b.m(G.cyl8,metal,x,3,-14.3,.055,5.9,.055);b.box(x,-14.36,.8,.12,.5,tmat(T.metal()),{y:.22});}for(const x of[-8,0,8]){b.box(x,-14.4,1.3,.12,2.5,tmat(T.wood()));b.box(x,-14.2,1.6,.5,.1,metal,{y:2.7});}b.aircon(7.2,-14.1,3.3);
  for(const x of[-13.4,13.4])b.fence(x,12,x,18,3.6,'iron');b.fence(-13.4,18,13.4,18,3.6,'iron');
  for(const[x0,z0,x1,z1]of[[-13.7,12,-13.2,18.2],[13.2,12,13.7,18.2],[-13.7,17.8,13.7,18.2]])addSolid(x0,z0,x1,z1,0,14,'hub-boundary');
  b.box(0,18,.16,.16,3.6,metal);b.box(0,18,4.8,.12,.14,metal,{y:3.5});
  // Направления к станциям читаются по мощению; середина двора остаётся свободной.
  for(const[x,z,w,d]of[[0,4,3.4,18],[-4,-3,8,2.5],[4,-3,8,2.5]])b.ground(x-w/2,z-d/2,x+w/2,z+d/2,T.pave(),1.4,.018);
  for(const[x,z,ry]of[[-5,3,Math.PI/2],[5,0,-Math.PI/2],[-11,-10,Math.PI/2],[11,11,-Math.PI/2]])b.lamp(x,z,ry);
  // Те же пятна и конусы, что в матче; локальный свет действительно освещает модели.
  const lampLights=[];
  for(const lamp of state.lamps){group.add(lamp.cone);lamp.cone.visible=true;const light=new THREE.PointLight(0xffc481,9,8,1.5);light.position.set(lamp.lx,2.92,lamp.lz);group.add(light);lampLights.push({lamp,light});}

  b.tree(-11,9.5,.85,0,'maple');b.deadTree(11.8,-10.5);b.tree(11.5,13.1,.8,0,'oak');
  b.bench(-10,6.7,Math.PI/2);b.bench(10.8,-11,-Math.PI/2);
  b.planter(-11,12,2.2,1.3,.42,'shrub');b.planter(11.7,-.8,1.3,2.6,.42,'shrub');
  b.bouncyPumpkin(-8.6,12.5,1.1);b.leafPile(-11,10.8,.55);
  b.barrel(11.5,-7.5);b.pallet(-11,-12,1.8,1.2);b.newsBox(11.6,8,-Math.PI/2);b.postBox(-12.2,-7.5,Math.PI/2);
  b.bin(12,-3.2);b.crate(-11,-12,.8);b.ride('cart',9,9,Math.PI/2);b.ride('skate',3,12);
  b.hydrant(11.8,6.5);b.vending(11.8,-12,-Math.PI/2);b.locker(-11.7,-8.5,Math.PI/2,0x525e65);
  b.swingSet(-4,13,3.5,0);
  for(const[type,x,z]of[['duck',-10,6],['slipper',10,-10],['water',9,7],['banana',-11,11],['ball',6.1,5.7]])b.item(type,x,z);
  for(const[x,z]of[[-6.8,-.7],[-7.1,-5.5],[7,-6.1],[10.6,1.4],[-8,10.7],[2.7,-8.6],[10.8,10.7]])b.item('pumpkin',x,z);
  b.stringLights(-12.5,-13,12.5,-13,4.6,[0xc18c56,0x827392,0x9d956a]);
  b.bollard(-2.7,16.3);b.bollard(2.7,16.3);b.bikeRack(11.4,12,2,Math.PI/2);b.utilityBox(-12.3,-11.5,Math.PI/2);b.aircon(-13.2,1,3);b.puddle(11,-9,.55);
  b.sofa(0,-3.5,Math.PI,0x514752);
  group.add(compose('hub40-tv-hoop',a=>{
    a(G.box,wood,0,.29,-8.45,3.7,.58,1.55);a(G.box,dark,0,.57,-8.45,3.9,.08,1.65);
    a(G.box,tmat(T.paintMetal(0x77766b)),0,1.67,-8.45,3.7,2.10,1.55);
    a(G.box,dark,-.20,1.73,-7.645,3.02,1.86,.055);
    for(let i=0;i<9;i++)a(G.box,dark,1.58,1.12+i*.10,-7.65,.20,.026,.025);
    for(const y of[2.22,1.86])a(G.cyl8,cream,1.57,y,-7.58,.105,.08,.105,Math.PI/2);
    a(G.box,glow(0x9be36b),1.55,.84,-7.60,.06,.04,.02);
    for(const s of[-1,1])a(G.cyl6,metal,s*.48,3.11,-8.5,.015,1.05,.015,0,0,s*.67);
    // Баскетбол сбоку, вне пути к трём основным станциям.
    a(G.cyl8,metal,7.7,1.9,4.05,.07,3.8,.07);a(G.box,wood,7.7,3.24,3.91,2.2,1.42,.12);
    a(G.box,cream,7.7,3.25,3.83,2.08,1.30,.04);
    a(G.box,col(0xb06a48),7.7,3.13,3.79,.65,.45,.02);
    a(G.box,cream,7.7,3.13,3.77,.55,.35,.02);
    a(G.torus,col(0xc66f3f),7.7,2.91,3.35,.45,.45,.45,Math.PI/2);
    for(let i=0;i<10;i++){const an=i/10*Math.PI*2;a(G.cyl5,cream,7.7+Math.cos(an)*.34,2.65,3.35+Math.sin(an)*.34,.009,.52,.009,Math.sin(an)*.17,0,-Math.cos(an)*.17);}
    for(let i=0;i<8;i++){const an=i/8*Math.PI; a(G.box,cream,7.7+Math.cos(an)*2.7,.018,3.35+Math.sin(an)*2.7,.32,.018,.06,0,-an,0);}

  }));b.solid(0,-8.45,3.9,1.65,0,2.8);b.solid(7.7,4.05,.22,.22,0,3.8);
  // Гардеробная стоит отдельно от фасада, лицом к центру двора.
  const room=new THREE.Group();room.position.set(-9.7,0,-3);room.rotation.y=Math.PI/2;group.add(room);state.keep.push(room);
  const cloth=tmat(T.cloth(0x584051));
  room.add(compose('hub41-wardrobe',a=>{
   a(G.box,wood,0,.04,0,3.7,.08,5.8);a(G.box,tmat(T.wallIn(0x655b66)),0,1.65,-2.77,3.7,3.3,.12);
   for(const x of[-1.79,1.79])a(G.box,wood,x,1.65,0,.12,3.3,5.8);
   a(G.box,tmat(T.roof()),0,3.38,0,3.94,.16,6.1);a(G.box,wood,0,2.98,3.0,3.72,.65,.16);
   a(G.box,tmat(T.sign('ГАРДЕРОБ','#352c37','#c4b69c')),0,3.0,3.095,3.24,.34,.025);
   a(G.box,metal,0,2.61,2.96,3.48,.055,.055);a(G.box,tmat(T.cloth(0x6b4c61)),0,.09,-.6,2.25,.03,2.5);
   a(G.box,metal,0,1.52,-2.68,1.28,2.05,.035);a(G.box,col(0x6b6b7c),0,1.52,-2.652,1.14,1.91,.018);
   for(const x of[-1.25,1.25]){a(G.cyl6,metal,x,1.02,-1.2,.022,2,.022);a(G.box,wood,x,2.06,-1.2,.62,.04,.08);a(G.box,tmat(T.cloth(x<0?0x6e6251:0x425c58)),x,1.55,-1.2,.44,.70,.16);}
   a(G.cyl8,dark,0,3.12,-1,.22,.12,.22);a(G.disc,glow(0xc0ac88),0,3.04,-1,.19,.19,.19,Math.PI/2);
  }));
  const at=(x,y,z)=>room.localToWorld(new V3(x,y,z));room.updateMatrixWorld(true);
  const roomSolid=(x,z,w,d,h,y=0)=>{const center=at(x,y,z);return addSolid(center.x-d/2,center.z-w/2,center.x+d/2,center.z+w/2,center.y,center.y+h);};
  roomSolid(0,0,3.7,5.8,.08);roomSolid(-1.79,0,.12,5.8,3.3);roomSolid(1.79,0,.12,5.8,3.3);roomSolid(0,-2.77,3.7,.12,3.3);roomSolid(0,0,3.9,6,.16,3.3);
  const curtains=[];for(const sign of[-1,1]){const p=new THREE.Group();room.add(p);mesh(G.box,cloth,0,0,0,1.76,2.57,.055,p);for(let i=0;i<7;i++)mesh(G.box,tmat(T.cloth(0x624559)),(i-3)*.24,0,.038,.05,2.52,.025,p);curtains.push(p);}
  const lamp=new THREE.SpotLight(0xffe0b0,18,5,.85,.7,1.3);lamp.position.copy(at(0,3,-1));lamp.target.position.copy(at(0,.7,-1));group.add(lamp,lamp.target);
  const fill=new THREE.PointLight(0xc9d5e4,2.8,4,1.5);fill.position.copy(at(0,1.8,1.5));group.add(fill);
  const beam=mesh(new THREE.CylinderGeometry(.14,1.15,2.8,8,1,true),LAMP_CONE_M().clone(),0,1.65,-1,1,1,1,room);beam.material.uniforms.k.value=.22;beam.userData.noOcc=true;
  const screenTexture=pix('hub40-tv',128,96,g=>{g.fillStyle='#101c24';g.fillRect(0,0,128,96);g.fillStyle='#19303a';for(let y=0;y<96;y+=3)g.fillRect(0,y,128,1);g.fillStyle='#91a18f';g.font='8px monospace';g.textAlign='center';g.fillText('PLAY / 01',64,49);});
  const tvScreen=mesh(G.plane,new THREE.MeshBasicMaterial({map:screenTexture}),-.2,1.73,-7.604,2.72,1.65,1,group);
  const controller=new THREE.Group();controller.position.set(.45,.56,-3.58);controller.rotation.y=.25;group.add(controller);
  controller.add(compose('hub39-gamepad',a=>{a(G.box,col(0xaaa5a1),0,0,0,.48,.13,.25);for(const x of[-.18,.18])a(G.sphL,col(0xaaa5a1),x,-.055,.085,.13,.09,.13);a(G.box,dark,-.14,.075,0,.13,.02,.045);a(G.box,dark,-.14,.076,0,.045,.02,.13);for(let i=0;i<4;i++){const an=i*Math.PI/2;a(G.cyl8,col([0x8da38c,0xab7c84,0x91a4b1,0xb5a16b][i]),.14+Math.cos(an)*.058,.075,Math.sin(an)*.058,.025,.02,.025);}}));

  state.keep.push(tvScreen,controller);resetTools();resetSplat();registerInteracts();bakeStatic(group);
  let curtainOpen=0;
  const result={state,group,tvScreen,controller,curtains,lampLights,
   wardrobe:{root:room,at,preview:at(0,.08,-1.1),gate:at(0,0,4),exit:at(0,0,4.7),camera:at(0,1.35,2.65),look:at(0,1.35,-1.1),inYaw:-Math.PI/2,outYaw:Math.PI/2},
   stations:[{id:'wardrobe',name:'Гардеробная',hint:'Сменить персонажа',p:at(0,0,4.2),r:1.8},{id:'tv',name:'Диван и телевизор',hint:'Сесть и выбрать режим',p:new V3(0,0,-5.1),r:4.2,contains:p=>Math.abs(p.x)<3.5&&p.z>-7.4&&p.z<-.9},{id:'claw',name:'Автомат с друзьями',hint:'Выловить нового друга',p:new V3(8,0,-2.5),r:1.8}],
   curtain(open){curtainOpen=THREE.MathUtils.clamp(open,0,1);curtains.forEach((p,i)=>{p.position.set((i?1:-1)*(.88+curtainOpen*.71),1.33,2.97);p.scale.x=1-.86*curtainOpen;});},
   get curtainOpen(){return curtainOpen;}
  };result.curtain(0);return result;
 });
}
