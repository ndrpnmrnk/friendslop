import {THREE,G,col,tmat,lam,glow,compose} from '../core/gfx.js';
import {T,pix} from '../core/textures.js';
import {drawIngredient} from './perfume-icons.js';

export const PERFUME_INGREDIENTS=[['РОЗА',0xd16b8d],['МЯТА',0x77ba8b],['ВАНИЛЬ',0xe2c681],['КЕДР',0x92724a],['ЛИМОН',0xe9d354],['ЛАВАНДА',0xa489cb],['МОХ',0x6b8460],['ЯНТАРЬ',0xc58649]];
export const ingredientPosition=i=>[-.89+(i%3)*.37,1.47+Math.floor(i/3)*.48,-.17];
function label(name){return pix('perfume-label47-'+name,96,48,c=>{
  c.fillStyle='#d9c8a5';c.fillRect(0,0,96,48);c.strokeStyle='#8a714d';c.strokeRect(1.5,1.5,93,45);
  drawIngredient(c,name,4,4,30);c.fillStyle='#44362d';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText(name,61,27,57);
});}
export function ingredientBottle(name,color,i){
  const b=new THREE.Group();b.name='perfume-ingredient-'+i;b.userData.ingredient=i;b.position.set(...ingredientPosition(i));
  b.add(compose('perfume-bottle47-'+name,a=>{
    const glass=lam({color,transparent:true,opacity:.68,depthWrite:false},'perfume-glass47-'+name),brass=col(0xb69a62),dark=col(0x493a36);
    a(G.cyl8,glass,0,0,0,.115,.32,.10);a(G.cyl8,glass,0,.18,0,.054,.06,.052);
    a(G.cyl8,brass,0,.225,0,.065,.035,.062);a(G.cyl8,dark,0,.26,0,.055,.04,.052);
    a(G.cyl8,col(color),0,-.055,0,.089,.16,.078);
    a(G.box,tmat(label(name)),0,-.01,.102,.29,.145,.012);
  }));return b;
}
export function perfumeCabinet(){
  const cabinet=compose('perfume-cabinet47',a=>{
    const wood=tmat(T.wood(),{color:0x6b4534}),panel=tmat(T.wood(),{color:0x846047}),dark=col(0x392d30),brass=col(0xb69a62);
    const top=tmat(pix('perfume-stone47',64,32,c=>{
      c.fillStyle='#c6bda4';c.fillRect(0,0,64,32);for(let i=0;i<80;i++){c.fillStyle=i%3?'#b9af97':'#e1d6bb';c.fillRect((i*17)%64,(i*11)%32,2+i%4,1);}
    }));
    // Низкий комод и светлая вкладка столешницы. Декор объединён по материалам.
    a(G.box,wood,0,.44,-.03,2.24,.71,.72);a(G.box,dark,0,.10,-.03,2.30,.10,.74);
    for(const x of[-1.02,1.02])for(const z of[-.29,.28])a(G.box,wood,x,.055,z,.13,.11,.13);
    a(G.box,wood,0,.82,0,2.4,.10,.85);a(G.box,top,0,.876,0,2.18,.012,.70);
    for(const x of[-.56,.56]){
      a(G.box,dark,x,.40,.338,1.04,.45,.018);a(G.box,panel,x,.40,.354,.97,.38,.022);
      a(G.box,brass,x,.55,.377,.23,.025,.025);
      a(G.box,panel,x,.695,.347,1.04,.13,.035);a(G.cyl8,brass,x,.695,.38,.032,.025,.032,Math.PI/2);
    }
    // Настоящая задняя стенка, боковины, карниз и две полки для шести эссенций.
    a(G.box,wood,0,1.60,-.40,2.26,1.45,.08);a(G.box,panel,0,1.60,-.352,2.06,1.25,.012);
    for(const x of[-1.13,1.13]){a(G.box,wood,x,1.61,-.09,.12,1.50,.67);a(G.box,brass,x,1.62,.255,.026,1.29,.018);}
    a(G.box,wood,0,2.37,-.04,2.40,.12,.81);a(G.box,brass,0,2.293,.30,2.16,.026,.026);
    for(const y of[1.285,1.765]){a(G.box,wood,-.52,y,-.18,1.12,.06,.40);a(G.box,brass,-.52,y+.018,.026,1.12,.02,.016);}
    a(G.box,wood,.12,1.75,-.23,.055,.97,.25);
    a(G.box,glow(0xffd393),0,2.286,-.09,1.72,.018,.055);
    // Поднос под рабочим флаконом и латунная подставка для записки справа.
    a(G.box,brass,.21,.891,.24,.95,.018,.32);a(G.box,dark,.21,.902,.24,.89,.006,.27);
    a(G.box,brass,.66,1.62,-.303,.89,.89,.025);
  });
  cabinet.name='perfume-cabinet';return cabinet;
}
