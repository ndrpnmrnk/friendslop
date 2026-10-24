import {THREE,G,mesh,col,tmat,compose} from '../core/gfx.js';
import {pix} from '../core/textures.js';
const skin=()=>tmat(pix('shakir44-shell',16,16,c=>{c.fillStyle='#69503b';c.fillRect(0,0,16,16);for(let i=0;i<48;i++){c.fillStyle=i%2?'#7c6145':'#4d3d31';c.fillRect(i*7%16,i*11%16,1,1);}c.fillStyle='#a0865e';c.fillRect(3,2,5,1);}));
const glove=()=>tmat(pix('shakir44-gloves',16,16,c=>{c.fillStyle='#b24b47';c.fillRect(0,0,16,16);c.fillStyle='#d77c66';c.fillRect(2,2,9,2);c.fillStyle='#84393e';c.fillRect(0,13,16,3);c.fillRect(12,3,2,9);c.fillStyle='#e0cba0';c.fillRect(1,11,14,2);}));
export const ANT_POSES=['Стойка','Апперкот','Присел','Шаг'];
export function shakirAnt(pose=0){
 const root=new THREE.Group();root.name='shakir-ant';const lean=pose===2?-.18:pose===3?.12:0;
 root.add(compose('shakir44-ant-'+pose,a=>{const brown=skin(),dark=col(0x30272b),beard=col(0x3c302a),red=glove(),ivory=col(0xdccba4);
  a(G.sph10,brown,0,.115,-.035,.039,.048,.037,lean);a(G.sph10,brown,0,.058,-.097,.032,.030,.036);a(G.sph10,brown,0,.048,-.158,.049,.036,.061,.15);
  a(G.sph10,brown,0,.123,.024,.049,.046,.041);a(G.sphL,col(0x9a7753),0,.104,.054,.037,.019,.022);
  for(const s of[-1,1]){a(G.sphL,ivory,s*.022,.139,.054,.017,.019,.012);a(G.sphL,dark,s*.021,.14,.065,.008,.011,.004);a(G.box,col(0xe8d8b2),s*.023,.145,.068,.004,.005,.003);a(G.box,dark,s*.023,.159,.055,.033,.005,.006,0,0,-s*.18);
   a(G.cyl6,brown,s*.027,.180,.017,.0035,.042,.0035,0,0,-s*.35);a(G.cyl6,brown,s*.037,.202,.026,.003,.023,.003,-.7,0,-s*.5);
   for(let i=0;i<2;i++){const yy=pose===3&&i===(s>0?0:1)?.015:0;a(G.cyl6,dark,s*.049,.036+yy,-.075-i*.065,.005,.060,.005,0,0,-s*1.05);a(G.cyl6,brown,s*.072,.019+yy,-.06-i*.065,.004,.046,.004,-.35,0,s*.35);a(G.box,dark,s*.079,.005+yy,-.048-i*.065,.023,.008,.025);}
   const raised=pose===1&&s===1,gy=raised?.196:pose===2?.092:.123+(pose===0?s*.01:0),gx=s*(raised?.062:.080),gz=pose===2?.087:.060;
   a(G.cyl6,brown,s*.045,.108,.004,.007,.056,.007,-.5,0,-s*.8);a(G.cyl6,brown,gx,gy-.028,gz-.01,.006,.050,.006,raised?-.2:-.65,0,s*.18);a(G.sph10,red,gx,gy,gz,.035,.037,.033,-.2);a(G.sphL,red,gx-s*.024,gy-.014,gz+.015,.015,.021,.017);a(G.cyl8,ivory,gx,gy-.033,gz-.005,.024,.013,.021);
  }
  a(G.sphL,beard,0,.085,.047,.040,.029,.030);for(let i=0;i<7;i++){const x=(i-3)*.010;a(G.cone4,beard,x,.067-Math.abs(i-3)*.002,.047+Math.cos(i)*.004,.010,.031,.012,0,0,Math.PI+(i-3)*.09);}for(const s of[-1,1])a(G.box,beard,s*.015,.105,.074,.032,.007,.009,0,0,s*.18);
  for(let i=0;i<3;i++)a(G.box,col(0x9b7750),0,.069-i*.007,-.162-i*.012,.066-i*.006,.004,.006,.3);
 }));
 // У всех поз низ опирается на поверхность, ни один поворот не утапливает лапки.
 root.children[0].scale.y=pose===2?.82:1;root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root);root.children[0].position.y=-box.min.y;return root;
}
