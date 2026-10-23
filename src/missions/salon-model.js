import {THREE,G,mesh,col,tmat,compose,lam,V3} from '../core/gfx.js';
import {T,pix} from '../core/textures.js';
const fatTex=()=>pix('salon38-liquid',32,32,g=>{g.fillStyle='#d6c58c';g.fillRect(0,0,32,32);for(let i=0;i<150;i++){g.fillStyle=i%3?'#dfd2a3':'#bcad79';g.fillRect(i*17%32,i*23%32,2,1);}g.fillStyle='#eddfb1';for(let i=0;i<8;i++)g.fillRect(i*5%32,i*11%32,3,1);});
const GLASS=()=>lam({color:0xc7d8cb,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide},'salon38-glass');
const LIQUID=()=>lam({map:fatTex(),color:0xfff0bd,transparent:true,opacity:.76,depthWrite:true},'salon38-fat');
let jarShell,tubeOuter,tubeInner;
export function salonModel(){const g=new THREE.Group();g.name='fat-salon';const paint=tmat(T.paintMetal(0x66857e)),metal=tmat(T.metal()),dark=col(0x344748),wood=tmat(T.wood());
 g.add(compose('salon38',a=>{a(G.box,paint,0,.52,0,3.7,1.04,1.45);a(G.box,wood,0,1.10,0,3.94,.12,1.62);for(const s of[-1,1])for(const z of[-.65,.65]){a(G.box,metal,s*1.79,1.80,z,.075,1.43,.075);a(G.box,dark,s*1.79,.09,z,.25,.18,.25);}a(G.box,tmat(T.awning('#5d827d','#b8b394')),0,2.59,0,4.12,.12,2.0);a(G.box,paint,0,2.40,.82,3.8,.28,.08);a(G.box,tmat(T.sign('ЛИПОСАЛОН','#36534e','#e3d6ab')),0,2.41,.872,2.8,.22,.022);
  a(G.box,tmat(T.sign('300 Л · СЕКРЕТНЫЙ РЕЦЕПТ','#c9c3a0','#344b42')),0,.65,.738,2.6,.27,.017);a(G.box,dark,-1.19,1.20,0,.90,.10,.80);for(const y of[1.25,1.95])a(G.cyl12,metal,-1.19,y,0,.36,.045,.36);a(G.box,paint,-1.19,1.23,-.42,.82,.12,.06);
  a(G.box,dark,-.43,1.37,.13,.66,.42,.34);a(G.cyl12,col(0xcac8aa),-.43,1.49,.32,.23,.035,.23,Math.PI/2);for(let i=0;i<11;i++){const an=(i/10-.5)*Math.PI*1.5;a(G.box,col(i>=4&&i<=6?0x83a368:0xad6d55),-.43+Math.sin(an)*.18,1.49+Math.cos(an)*.18,.345,.035,.025,.012,0,0,-an);}a(G.box,tmat(T.sign('ДАВЛЕНИЕ','#343e3e','#d2c9a7')),0,1.12,.48,.78,.13,.02);
  a(G.cyl8,metal,.35,1.28,.25,.10,.23,.10);a(G.box,paint,.35,1.35,.06,.35,.38,.30);a(G.cyl8,metal,.35,1.46,.25,.08,.035,.08,Math.PI/2);
  for(const x of[-1.65,1.65])a(G.box,tmat(T.vent()),x,.48,.744,.18,.45,.02);a(G.box,col(0xd2c6a7),.72,1.17,-.28,.42,.012,.40);a(G.box,col(0x8b664d),.72,1.205,-.28,.31,.05,.24);
  for(const x of[1.85,2.45])for(const z of[-.4,.5])a(G.box,metal,x,.26,z,.06,.52,.06);a(G.box,tmat(T.cloth(0xb2b197)),2.15,.55,.05,.85,.12,1.20);a(G.box,tmat(T.cloth(0xb2b197)),2.15,.98,-.45,.85,.85,.12);
 }));
 mesh(G.pipe,GLASS(),-1.19,1.60,0,.335,.65,.335,g);const reservoir=mesh(G.cyl12,LIQUID(),-1.19,1.58,0,.302,.56,.302,g);
 const jar=new THREE.Group();jar.position.set(1.18,1.18,.11);g.add(jar);if(!jarShell)jarShell=new THREE.CylinderGeometry(.185,.17,.55,10,1,true);mesh(jarShell,GLASS(),0,.29,0,1,1,1,jar);mesh(G.cyl12,GLASS(),0,.023,0,.17,.025,.17,jar);for(const y of[.03,.56])mesh(G.pipe,col(0x99a89d),0,y,0,.188,.025,.188,jar);
 const jarLiquid=mesh(G.cyl12,LIQUID(),0,.06,0,.151,.02,.151,jar);jarLiquid.name='fat-filled-jar';const marker=mesh(G.box,col(0x8d9b87),.186,.30,0,.008,.40,.018,jar);
 const resting=new THREE.Group();g.add(resting);resting.visible=false;resting.add(compose('salon38-mayor-props',a=>{a(G.cyl8,tmat(T.wood()),1.94,.49,-.25,.028,.92,.028,0,0,-.10);a(G.sphL,col(0x567b82),1.98,.97,-.25,.07,.045,.05);a(G.box,tmat(T.wood()),.72,1.28,-.28,.31,.07,.38);a(G.box,col(0xb8b18b),.72,1.32,-.28,.25,.015,.31);}));
 for(const y of[.12,.25,.38,.51])mesh(G.box,col(0xc6d1b3),.189,y,.025,.01,.012,.07,jar);
 const path=new THREE.CatmullRomCurve3([new V3(-1.17,1.62,.24),new V3(-.85,1.33,.20),new V3(.25,1.34,.15),new V3(.85,1.83,.10),new V3(1.18,1.82,.11),new V3(1.18,1.71,.11)]);
 tubeOuter=tubeOuter||new THREE.TubeGeometry(path,14,.043,5,false);tubeInner=tubeInner||new THREE.TubeGeometry(path,14,.025,5,false);mesh(tubeOuter,GLASS(),0,0,0,1,1,1,g);const stream=mesh(tubeInner,LIQUID(),0,0,0,1,1,1,g);stream.visible=false;
 const drops=new THREE.InstancedMesh(G.box,LIQUID(),5),dummy=new THREE.Object3D();jar.add(drops);drops.frustumCulled=false;
 const needlePivot=new THREE.Group();needlePivot.position.set(-.43,1.49,.374);g.add(needlePivot);mesh(G.box,col(0xa75846),0,.075,0,.017,.16,.014,needlePivot);mesh(G.cyl8,col(0x6f6452),0,0,.01,.032,.02,.032,needlePivot).rotation.x=Math.PI/2;
 const valve=mesh(new THREE.TorusGeometry(.115,.018,4,10),col(0xa88567),.35,1.46,.29,1,1,1,g);for(const angle of[0,Math.PI/2])mesh(G.box,col(0xa88567),0,0,0,.21,.022,.018,valve).rotation.z=angle;
 return{g,jar,jarLiquid,resting,needle:needlePivot,valve,
  update(level,pressure,t,pouring,remaining=1){const fill=THREE.MathUtils.clamp(level,0,1),h=Math.max(.012,.44*fill);jarLiquid.scale.y=h;jarLiquid.position.y=.05+h/2;jarLiquid.rotation.z=Math.sin(t*6)*.025*(pouring?1:.2);reservoir.scale.y=Math.max(.02,.56*remaining);reservoir.position.y=1.28+reservoir.scale.y/2;stream.visible=pouring;
   needlePivot.rotation.z=(.5-pressure)*Math.PI*1.5;for(let i=0;i<5;i++){const k=(t*2.6+i/5)%1;dummy.position.set(Math.sin(i*13)*.035,.52-k*.43,.01);dummy.scale.setScalar(pouring?.026:0);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);}drops.instanceMatrix.needsUpdate=true;},
  dispose(){drops.dispose();valve.geometry.dispose();}
 };
}
