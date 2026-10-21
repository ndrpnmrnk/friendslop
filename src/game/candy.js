import { G, compose, tmat, V3 } from '../core/gfx.js';
import { pix } from '../core/textures.js';
import { W } from '../world/state.js';
import { daze, shove } from './actors.js';
import { sfx } from '../core/sfx.js';

// Обёртка различается цветом и рисунком - эффект читается не только по цвету.
export const CANDY_TYPES = [
  { id:'energy', color:0x87b85a, label:'Мятная', effect:'Бодрость на 5 с', pattern:'bolt' },
  { id:'stamina', color:0x5aabd0, label:'Лимонадная', effect:'Выносливость восстановлена', pattern:'plus' },
  { id:'stun', color:0xd85e75, label:'Шипучка', effect:'Звёздочки на 1.5 с', pattern:'star' },
  { id:'slow', color:0xa680c0, label:'Тягучка', effect:'Замедление на 4 с', pattern:'waves' },
  { id:'pop', color:0xe89b49, label:'Хлопушка', effect:'Небольшой хлопок при падении', pattern:'burst', onLand:true },
];
function wrapper(def) {
  return pix('candy26-'+def.id,64,32,g=>{
    const hex='#'+def.color.toString(16).padStart(6,'0');g.fillStyle=hex;g.fillRect(0,0,64,32);
    // Складки фольги, шов, потёртости печати и запаянные края - в текстуре.
    for(let y=0;y<32;y++){g.fillStyle=y%8<2?'rgba(255,244,218,.28)':'rgba(34,25,42,.12)';g.fillRect(0,y,64,1);}
    for(let i=0;i<100;i++){g.fillStyle=i%2?'rgba(255,245,220,.18)':'rgba(42,27,48,.16)';g.fillRect((i*17)%64,(i*11)%32,2,1);}
    for(const x of [1,5,58,62]){g.fillStyle='#d8c8a8';g.fillRect(x,0,1,32);}g.fillStyle='#e8dfc8';g.fillRect(24,5,17,22);g.fillStyle='#342638';
    const pixel=(x,y,w=3,h=3)=>g.fillRect(x,y,w,h);
    if(def.pattern==='bolt'){pixel(33,8);pixel(30,11,6,3);pixel(28,14,9,3);pixel(32,17,3,3);pixel(29,20);}
    else if(def.pattern==='plus'){pixel(31,9,4,14);pixel(26,14,14,4);}
    else if(def.pattern==='star'){pixel(31,8,4,5);pixel(26,13,14,4);pixel(28,17,10,3);pixel(27,20);pixel(36,20);}
    else if(def.pattern==='waves'){for(let i=0;i<3;i++){pixel(27,9+i*5,5,2);pixel(32,11+i*5,6,2);}}
    else{pixel(31,12,4,8);pixel(28,14,10,4);for(const [x,y]of[[26,8],[37,8],[26,22],[37,22]])pixel(x,y,2,3);}
  });
}
export function candyModel(def) {
  const mat=tmat(wrapper(def));
  return compose('candy26-'+def.id,a=>{
    a(G.cyl8,mat,0,0,0,0.18,0.42,0.18,Math.PI,0,Math.PI/2);
    // Сужение у узла, затем раскрытый гранёный край, с небольшой закруткой.
    for(const side of [-1,1]){
      a(G.cyl6,mat,side*0.23,0,0,0.055,0.07,0.055,0,0,Math.PI/2);
      a(G.cone4,mat,side*0.34,0,0,0.17,0.2,0.17,0.4*side,0,-side*Math.PI/2);
    }
  });
}
export function applyCandy(def,a,owner,impact=a?.pos) {
  if(!a||a.hidden||a.caged||a.drone||a.returning)return;
  if(def.id==='energy'){a.energy=Math.max(a.energy||0,5);a.tired=0;}
  else if(def.id==='stamina'){a.stamina=1;a.exhausted=false;a.stDelay=0;a.tired=0;}
  else if(def.id==='stun'){daze(a,1.5);W.onHit?.(owner,a,'light');}
  else if(def.id==='slow')a.webT=Math.max(a.webT||0,4);
  else if(def.id==='pop'){const d=new V3().subVectors(a.pos,impact||a.pos);shove(a,d.x||0.1,d.z,4,3,false);W.onHit?.(owner,a,'light');}
  sfx(def.id==='stun'?'bonk':def.id==='slow'?'grab':'drink',{at:a.pos,v:0.6});
  W.onCandy?.(a,def);
}
