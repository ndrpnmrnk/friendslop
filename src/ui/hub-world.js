import {THREE,G,V3,mesh,col,tmat,glow,compose} from '../core/gfx.js';
import {T,facade,pix} from '../core/textures.js';
import {Builder} from '../world/builder.js';
import {createWorld,withWorld} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {bakeStatic} from '../world/bake.js';
import {registerInteracts} from '../game/worldfx.js';
import {binModel,crateModel} from '../world/props.js';

// Настоящий небольшой игровой мир: тот же Builder, коллизии и реквизит, что у карт.
export function buildHub(scene){
 const group=new THREE.Group();scene.add(group);const state=createWorld(group);state.bounds=18;
 return withWorld(state,()=>{
  const b=new Builder(0,0,0,{id:'hub',name:'Двор'}),wood=tmat(T.wood()),metal=tmat(T.metal()),dark=col(0x272332),cream=col(0xb5ad98);
  b.ground(-19,-19,19,19,T.asphalt(),4,-.02);b.ground(-14,-15,14,16,T.cobble(),3);
  for(const [x,z,w,d,h,c]of[[-16,-2,5,29,8,0x514858],[16,-2,5,29,7,0x454b59],[0,-17,27,5,9,0x514959]]){
   b.box(x,z,w,d,h,tmat(facade(c,w,h,{lit:.16})));b.box(x,z,w+.25,d+.25,.20,tmat(T.roof()),{y:h});
  }
  for(const x of[-13.4,13.4])b.fence(x,12,x,16,1.3,'iron');b.fence(-13.4,16,13.4,16,1.3,'iron');
  // Направления к станциям читаются по мощению; середина двора остаётся свободной.
  for(const[x,z,w,d]of[[0,4,3.4,18],[-4,-3,8,2.5],[4,-3,8,2.5]])b.ground(x-w/2,z-d/2,x+w/2,z+d/2,T.pave(),1.4,.018);
  for(const[x,z,ry]of[[-5,3,Math.PI/2],[5,0,-Math.PI/2],[-11,-10,Math.PI/2],[11,11,-Math.PI/2]])b.lamp(x,z,ry);
  for(const lamp of state.lamps){lamp.pool.material=lamp.pool.material.clone();lamp.pool.material.opacity=.32;lamp.pool.material.color.setHex(0xc49b65);}
  b.tree(-11,9.5,.85,0,'maple');b.deadTree(11.8,-10.5);b.tree(11.5,13.1,.8,0,'oak');
  b.bench(-10,6.7,Math.PI/2);b.bench(10.8,-11,-Math.PI/2);b.drinkFountain(-11,3.3,Math.PI/2);
  b.planter(-11,12,2.2,1.3,.42,'shrub');b.planter(11.7,-.8,1.3,2.6,.42,'shrub');
  b.bouncyPumpkin(-8.6,12.5,1.1);b.leafPile(-11,10.8,.55);
  b.barrel(11.5,-7.5);b.pallet(-11,-12,1.8,1.2);b.newsBox(11.6,8,-Math.PI/2);b.postBox(-12.2,-7.5,Math.PI/2);
  const bin=binModel();bin.position.set(12,0,-3.2);group.add(bin);b.solid(12,-3.2,.65,.65,0,1.1);
  const crate=crateModel();crate.position.set(-11,.4,-12);crate.scale.setScalar(.8);group.add(crate);b.solid(-11,-12,.8,.8,0,.8);
  for(const[x,z]of[[-6.8,-.7],[-7.1,-5.5],[7,-6.1],[10.6,1.4],[-8,10.7],[2.7,-8.6],[10.8,10.7]])b.item('pumpkin',x,z);
  b.web(-12.8,3.2,-9.5,Math.PI/2,1.6);b.web(10.6,3,-14.4,0,1.6);b.stringLights(-12.5,-13,12.5,-13,4.6,[0xc18c56,0x827392,0x9d956a]);
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
  room.add(compose('hub40-wardrobe',a=>{
   a(G.box,wood,0,.04,0,3.7,.08,4.4);a(G.box,tmat(T.wallIn(0x655b66)),0,1.65,-2.17,3.7,3.3,.12);
   for(const x of[-1.79,1.79])a(G.box,wood,x,1.65,0,.12,3.3,4.4);
   a(G.box,tmat(T.roof()),0,3.38,0,3.94,.16,4.7);a(G.box,wood,0,2.98,2.2,3.72,.65,.16);
   a(G.box,tmat(T.sign('ГАРДЕРОБ','#352c37','#c4b69c')),0,3.0,2.295,3.24,.34,.025);
   a(G.box,metal,0,2.61,2.16,3.48,.055,.055);a(G.box,tmat(T.cloth(0x6b4c61)),0,.09,-.6,2.25,.03,2.5);
   a(G.box,metal,0,1.52,-2.08,1.28,2.05,.035);a(G.box,col(0x6b6b7c),0,1.52,-2.052,1.14,1.91,.018);
   for(const x of[-1.25,1.25]){a(G.cyl6,metal,x,1.02,-1.2,.022,2,.022);a(G.box,wood,x,2.06,-1.2,.62,.04,.08);a(G.box,tmat(T.cloth(x<0?0x6e6251:0x425c58)),x,1.55,-1.2,.44,.70,.16);}
   a(G.cyl8,dark,0,3.12,-1,.22,.12,.22);a(G.disc,glow(0xc0ac88),0,3.04,-1,.19,.19,.19,Math.PI/2);
  }));
  const at=(x,y,z)=>room.localToWorld(new V3(x,y,z));room.updateMatrixWorld(true);
  const roomSolid=(x,z,w,d,h,y=0)=>{const center=at(x,y,z);return addSolid(center.x-d/2,center.z-w/2,center.x+d/2,center.z+w/2,center.y,center.y+h);};
  roomSolid(0,0,3.7,4.4,.08);roomSolid(-1.79,0,.12,4.4,3.3);roomSolid(1.79,0,.12,4.4,3.3);roomSolid(0,-2.17,3.7,.12,3.3);roomSolid(0,0,3.9,4.6,.16,3.3);
  const curtains=[];for(const sign of[-1,1]){const p=new THREE.Group();room.add(p);mesh(G.box,cloth,0,0,0,1.76,2.57,.055,p);for(let i=0;i<7;i++)mesh(G.box,tmat(T.cloth(0x624559)),(i-3)*.24,0,.038,.05,2.52,.025,p);curtains.push(p);}
  const lamp=new THREE.SpotLight(0xe2cfaa,3.3,4,.62,.75,1.5);lamp.position.copy(at(0,3,-1));lamp.target.position.copy(at(0,.7,-1));group.add(lamp,lamp.target);
  const screenTexture=pix('hub40-tv',128,96,g=>{g.fillStyle='#101c24';g.fillRect(0,0,128,96);g.fillStyle='#19303a';for(let y=0;y<96;y+=3)g.fillRect(0,y,128,1);g.fillStyle='#91a18f';g.font='bold 10px monospace';g.textAlign='center';g.fillText('FRIENDSLOP',64,39);g.font='8px monospace';g.fillText('PLAY / 01',64,57);});
  const tvScreen=mesh(G.plane,new THREE.MeshBasicMaterial({map:screenTexture}),-.2,1.73,-7.604,2.72,1.65,1,group);
  const controller=new THREE.Group();controller.position.set(.45,.56,-3.58);controller.rotation.y=.25;group.add(controller);
  controller.add(compose('hub39-gamepad',a=>{a(G.box,col(0xaaa5a1),0,0,0,.48,.13,.25);for(const x of[-.18,.18])a(G.sphL,col(0xaaa5a1),x,-.055,.085,.13,.09,.13);a(G.box,dark,-.14,.075,0,.13,.02,.045);a(G.box,dark,-.14,.076,0,.045,.02,.13);for(let i=0;i<4;i++){const an=i*Math.PI/2;a(G.cyl8,col([0x8da38c,0xab7c84,0x91a4b1,0xb5a16b][i]),.14+Math.cos(an)*.058,.075,Math.sin(an)*.058,.025,.02,.025);}}));

  const ball=mesh(G.sph10,tmat(T.ball()),6.1,.24,5.7,.24,.24,.24,group);
  state.keep.push(tvScreen,controller,ball);registerInteracts();bakeStatic(group);
  const fx=[];for(let i=0;i<24;i++){const m=mesh(G.box,glow(i%2?0xd9ae60:0x8ba86c),0,-5,0,.055,.055,.055,group);m.visible=false;fx.push(m);}
  let curtainOpen=0;
  const result={state,group,tvScreen,controller,ball,fx,hoop:new V3(7.7,2.91,3.35),curtains,
   wardrobe:{root:room,at,preview:at(0,.08,-1.1),gate:at(0,0,3.2),exit:at(0,0,3.8),camera:at(0,1.65,1.75),look:at(0,1.03,-1.1),inYaw:-Math.PI/2,outYaw:Math.PI/2},
   stations:[{id:'wardrobe',name:'Гардеробная',hint:'Сменить персонажа',p:at(0,0,3.6),r:2.0},{id:'tv',name:'Диван и телевизор',hint:'Сесть и выбрать режим',p:new V3(0,0,-1.8),r:1.8},{id:'claw',name:'Автомат с друзьями',hint:'Выловить нового друга',p:new V3(8,0,-2.5),r:1.8}],
   curtain(open){curtainOpen=THREE.MathUtils.clamp(open,0,1);curtains.forEach((p,i)=>{p.position.set((i?1:-1)*(.88+curtainOpen*.71),1.33,2.17);p.scale.x=1-.86*curtainOpen;});},
   get curtainOpen(){return curtainOpen;}
  };result.curtain(0);return result;
 });
}
