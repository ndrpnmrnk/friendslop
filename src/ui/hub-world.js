import {THREE,G,V3,mesh,col,tmat,glow,compose,lam} from '../core/gfx.js';
import {T,rep,facade,pix} from '../core/textures.js';
import {HW} from '../config.js';
import {PFACE} from '../world/builder.js';

// Отдельный маленький двор: не регистрирует объекты в W и не запускает мир матча.
export function buildHub(scene){
  const solids=[],curtains=[];
  const brick=tmat(T.oldBrick()),wood=tmat(T.wood()),metal=tmat(T.paintMetal(0x4c5660)),dark=col(0x272332),cream=col(0xc7b99c),plum=tmat(T.cloth(0x694a65));
  const solid=(x,z,w,d,h=3)=>solids.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,h});
  scene.add(compose('hub39-courtyard',a=>{
    a(G.box,tmat(rep(T.cobble(),12,12)),0,-.10,0,23,.20,23);
    // Три фасада обрамляют свободный двор. В центре нет столбов и фонарей.
    for(const [x,z,w,d,h,c] of [[-10,-3,4,15,7,0x68536a],[10,-3,4,15,6.2,0x4e596b],[0,-11,17,3,8.5,0x655770]]){
      a(G.box,tmat(facade(c,w,h,{lit:.38})),x,h/2,z,w,h,d);
      a(G.box,tmat(T.roof()),x,h+.1,z,w+.3,.25,d+.3);
      a(G.box,brick,x,.7,z+(d/2)+.02,w,1.4,.04);
    }
    for(const x of[-11.2,11.2]){a(G.box,metal,x,.48,5,.10,.96,12);a(G.box,wood,x,.95,5,.16,.08,12);}
    for(let i=0;i<13;i++){const x=-11+i*1.8;a(G.box,metal,x,.45,11.1,.06,.9,.06);}
    a(G.box,metal,0,.85,11.1,22.4,.05,.05);
    for(const x of[-4.6,4.6]){a(G.box,metal,x,2.2,-5.2,.075,4.4,.075);a(G.box,metal,x+.25,4.36,-5.2,.60,.09,.14);a(G.box,glow(0xffca86),x+.45,4.25,-5.2,.24,.12,.22);}
    // Дорожка визуально связывает гардероб, телевизор и автомат.
    for(let i=0;i<10;i++){a(G.box,tmat(T.pave()),-5.4+i*1.2,.015,-.3,1.04,.025,2.2);}
    for(let i=0;i<5;i++)a(G.box,tmat(T.pave()),0,.017,-1.4-i*1.2,2.2,.025,1.04);
    for(const [x,z] of[[-9,6],[-4.8,7.9],[8.7,-5.7]]){
      a(G.cyl6,tmat(T.bark()),x,1.5,z,.16,3,.16);
      for(let i=0;i<4;i++)a(G.ico,tmat(T.leaves(i%3)),x+Math.sin(i*3)*.6,3.1+i*.25,z+Math.cos(i*3)*.45,.85,.65,.8);
      a(G.sphL,tmat(T.leaves(0)),x,.07,z,.9,.12,.75);
    }
    // Гардеробная: настоящий объём с открытым фронтом и боковым реквизитом.
    a(G.box,wood,-7,.08,-1.2,3.6,.16,3.1);a(G.box,brick,-7,1.65,-2.69,3.6,3.3,.15);
    for(const x of[-8.73,-5.27])a(G.box,wood,x,1.65,-1.2,.14,3.3,3.1);
    a(G.box,tmat(T.roof()),-7,3.40,-1.2,3.9,.18,3.4);
    a(G.box,wood,-7,2.96,.39,3.62,.60,.15);
    a(G.box,tmat(T.sign('ГАРДЕРОБ','#4e354d','#f3d69d')),-7,3.0,.48,3.22,.34,.025);
    a(G.box,metal,-7,2.65,.31,3.36,.07,.07);
    a(G.box,metal,-7,1.55,-2.58,1.48,2.1,.04);a(G.box,col(0x8e8799),-7,1.55,-2.55,1.32,1.94,.02);
    a(G.box,tmat(T.cloth(0x925775)),-7,.18,-1.1,2.1,.035,2.2);
    for(const x of[-8.15,-5.85]){a(G.cyl6,metal,x,1.10,-1.8,.025,2.1,.025);a(G.box,wood,x,2.15,-1.8,.65,.04,.08);a(G.box,tmat(T.cloth(x<-7?0x9d715a:0x66807b)),x,1.58,-1.79,.43,.68,.20);}
    a(G.cyl8,dark,-7,3.19,-1.05,.25,.14,.25);a(G.disc,glow(0xffdfaa),-7,3.10,-1.05,.23,.23,.23,Math.PI/2);
    // Диван смотрит на большой старый телевизор. Между ними свободен коридор камеры.
    for(const x of[-1.48,1.48])for(const z of[-3.98,-3.06])a(G.box,wood,x,.22,z,.12,.44,.12);
    a(G.box,tmat(T.cloth(0x6d685b)),0,.60,-3.5,3.5,.50,1.25);
    a(G.box,tmat(T.cloth(0x797160)),0,.78,-3.56,2.8,.22,.94);
    a(G.box,tmat(T.cloth(0x625a55)),0,1.16,-2.94,3.45,.85,.23);
    for(const x of[-1.58,1.58])a(G.box,tmat(T.cloth(0x625a55)),x,.94,-3.48,.28,.49,1.27);
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
    if(HW)for(const[x,z,s]of[[-5,1.6,.37],[-8.9,1.1,.27],[2.4,-6.9,.45],[4.4,-.5,.30],[8.3,-.2,.29]]){
      a(G.sph10,tmat(T.pumpkin()),x,s*.8,z,s,s*.8,s);a(G.plane,PFACE(),x,s*.85,z+s*.94,s*1.2,s,1);a(G.cyl6,wood,x,s*1.68,z,.055,.16,.055);
    }
    // Гирлянда держится за фасады, не пересекает крупные планы.
    for(let i=0;i<21;i++){const x=-9+i*.9,y=4.6-Math.sin(i/20*Math.PI)*.8;a(G.cyl5,metal,x,y,1.9,.009,.92,.009,0,0,Math.PI/2);a(G.sphL,glow([0xffb767,0x8a9b83,0xb68cc5][i%3]),x,y-.07,1.9,.045,.07,.045);}
  }));
  solid(-10,-3,4,15,7);solid(10,-3,4,15,6.2);solid(0,-11,17,3,8.5);
  solid(-8.73,-1.2,.14,3.1);solid(-5.27,-1.2,.14,3.1);solid(-7,-2.69,3.6,.15);
  solid(0,-3.5,3.5,1.35,1.5);solid(0,-8.45,3.9,1.65,2.8);solid(7.7,4.05,.22,.22,3.8);
  for(const x of[-1,1]){const p=new THREE.Group();p.position.set(-7+x*.82,1.48,.33);scene.add(p);mesh(G.box,plum,0,0,0,1.62,2.60,.07,p);for(let j=0;j<5;j++)mesh(G.box,tmat(T.cloth(0x79516f)),(j-2)*.29,0,.048,.08,2.54,.025,p);curtains.push(p);}
  const screenTexture=pix('hub39-tv',128,96,g=>{g.fillStyle='#132731';g.fillRect(0,0,128,96);g.fillStyle='#1c3840';for(let y=0;y<96;y+=3)g.fillRect(0,y,128,1);g.fillStyle='#b8c8a2';g.font='bold 10px monospace';g.textAlign='center';g.fillText('FRIENDSLOP',64,39);g.font='8px monospace';g.fillText('PLAY / 01',64,57);g.fillStyle='#6c9580';g.fillRect(12,78,104,2);});
  const tvScreen=mesh(G.plane,new THREE.MeshBasicMaterial({map:screenTexture}),-.20,1.73,-7.604,2.72,1.65,1,scene);
  const controller=new THREE.Group();controller.position.set(.65,.95,-3.55);controller.rotation.y=.25;scene.add(controller);
  controller.add(compose('hub39-gamepad',a=>{a(G.box,col(0xaaa5a1),0,0,0,.48,.13,.25);for(const x of[-.18,.18])a(G.sphL,col(0xaaa5a1),x,-.055,.085,.13,.09,.13);a(G.box,dark,-.14,.075,0,.13,.02,.045);a(G.box,dark,-.14,.076,0,.045,.02,.13);for(let i=0;i<4;i++){const an=i*Math.PI/2;a(G.cyl8,col([0x8da38c,0xab7c84,0x91a4b1,0xb5a16b][i]),.14+Math.cos(an)*.058,.075,Math.sin(an)*.058,.025,.02,.025);}}));
  const lamp=new THREE.SpotLight(0xffddb2,30,7,.55,.7,1.2);lamp.position.set(-7,3.1,-1);lamp.target.position.set(-7,.5,-1);scene.add(lamp,lamp.target);
  const ball=mesh(G.sph10,tmat(T.ball()),6.1,.24,5.7,.24,.24,.24,scene);
  const fx=[];for(let i=0;i<24;i++){const m=mesh(G.box,glow(i%2?0xffc56c:0x9be36b),0,-5,0,.055,.055,.055,scene);m.visible=false;fx.push(m);}
  return{solids,curtains,tvScreen,controller,ball,fx,hoop:new V3(7.7,2.91,3.35),
    stations:[{id:'wardrobe',name:'Гардеробная',hint:'Сменить персонажа',p:new V3(-7,.14,1.25),r:2.1},{id:'tv',name:'Диван и телевизор',hint:'Сесть и выбрать режим',p:new V3(0,.14,-1.9),r:2},{id:'claw',name:'Автомат с друзьями',hint:'Выловить нового друга',p:new V3(6,.14,1.4),r:1.8}],
    curtain(open){curtains.forEach((p,i)=>{p.scale.x=1-.83*open;p.position.x=-7+(i?1:-1)*(.82+open*.70);});},
  };
}
