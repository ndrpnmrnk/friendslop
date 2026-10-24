import {THREE,G,col,tmat,mesh,compose,lam} from '../core/gfx.js';
import {pix} from '../core/textures.js';
export const OUTFIT_SLOTS=['hat','top','bottom','shoes'];
export const OUTFIT_NAMES={hat:['Кепка курьера','Шляпа детектива','Цилиндр вампира','Вязаная шапка'],top:['Куртка курьера','Плащ детектива','Жилет с накидкой','Куртка скейтера'],bottom:['Карго','Брюки в полоску','Бриджи вампира','Джинсы с заплатами'],shoes:['Рабочие ботинки','Туфли детектива','Сапоги с пряжками','Высокие кеды']};
export const OUTFIT_THEMES=['Тыквенный курьер','Полуночный детектив','Клубный вампир','Городской скейтер'];
const palette=[['#a65c35','#d69954','#67492f'],['#566568','#929e91','#34494d'],['#723e56','#b27b83','#3c293e'],['#77678d','#b7a1be','#4c435f']];
export function outfitFabric(slot,v){return pix('outfit44-'+slot+'-'+v,32,32,c=>{const [base,light,dark]=slot==='bottom'?[['#77764f','#ada47a','#4f553e'],['#444d59','#8c9b9f','#303540'],['#4c3746','#927083','#332632'],['#4a647b','#9aa6ad','#30485e']][v]:palette[v];c.fillStyle=base;c.fillRect(0,0,32,32);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)if((x*7+y*11)%17===0){c.fillStyle=light;c.globalAlpha=.22;c.fillRect(x,y,1,1);}c.globalAlpha=1;
 c.fillStyle=dark;c.fillRect(0,0,1,32);c.fillRect(31,0,1,32);c.fillRect(0,29,32,2);c.fillStyle=light;for(let i=2;i<30;i+=3){c.fillRect(i,28,1,1);c.fillRect(2,i,1,1);}
 if(v===1){c.fillStyle=light;c.globalAlpha=.38;for(let x=5;x<32;x+=6)c.fillRect(x,0,1,28);c.globalAlpha=1;}
 if(v===3){c.fillStyle=dark;c.globalAlpha=.45;for(let y=3;y<28;y+=7)c.fillRect(0,y,32,1);for(let x=3;x<32;x+=7)c.fillRect(x,0,1,28);c.globalAlpha=1;}
 if(slot==='hat'&&v===3){c.fillStyle=light;for(let y=1;y<27;y+=3)for(let x=y%2;x<32;x+=3)c.fillRect(x,y,1,1);}
 });}
const brim=new THREE.CylinderGeometry(.52,.52,.035,12),crown=new THREE.CylinderGeometry(.31,.38,.32,12),body=new THREE.CylinderGeometry(.46,.50,1,10),pants=new THREE.CylinderGeometry(.46,.50,.60,10),flap=new THREE.PlaneGeometry(1,1,1,2);
export function outfitPiece(slot,v){
 const g=new THREE.Group();g.name='outfit-'+slot+'-'+v;g.userData.outfitSlot=slot;g.userData.variant=v;const fabric=tmat(outfitFabric(slot,v)),dark=col(0x302c34),thread=col(0xc8bb96),metal=col(0xa8a18d);
 g.add(compose('outfit44-piece-'+slot+'-'+v,a=>{
  if(slot==='hat'){
   if(v===0){a(G.cyl12,fabric,0,.12,0,.40,.24,.37);a(G.sph10,fabric,0,.21,-.02,.40,.15,.37);a(G.box,fabric,0,.008,.31,.64,.045,.42,-.08);a(G.box,thread,0,.15,.367,.18,.09,.01);a(G.box,col(0x66452f),0,.15,.376,.08,.04,.01);}
   if(v===1){a(brim,fabric,0,.018,0,1,1,.85);a(crown,fabric,0,.18,0,1,1,.86);a(G.box,col(0x3b4146),0,.325,0,.25,.018,.47);a(G.cyl12,dark,0,.09,0,.385,.065,.334);a(G.box,metal,.21,.09,.27,.09,.05,.015);}
   if(v===2){a(brim,dark,0,.018,0,1,1,.85);a(G.cyl12,dark,0,.27,0,.32,.50,.29);a(G.cyl12,col(0x994a61),0,.09,0,.327,.09,.298);a(G.box,thread,0,.10,.306,.10,.065,.012);a(G.box,col(0x703348),.30,.17,.01,.045,.27,.10,0,0,-.25);}
   if(v===3){a(G.sph10,fabric,0,.16,0,.42,.30,.38);a(G.cyl12,fabric,0,.045,0,.43,.10,.39);a(G.box,thread,.20,.062,.353,.12,.07,.015);a(G.sphL,fabric,0,.425,0,.085,.075,.085);}
  }else if(slot==='top'){
   a(body,fabric,0,.5,0,1,1,.85);for(const s of[-1,1]){a(G.cyl8,fabric,s*.43,.70,0,.135,.34,.21,0,0,s*.65);a(G.box,thread,s*.14,.91,.375,.20,.06,.035,0,0,-s*.36);}
   a(G.box,dark,0,.50,.436,.035,.93,.018);for(let i=0;i<4;i++)a(G.box,metal,.035,.72-i*.17,.45,.026,.027,.012);
   if(v===0){for(const s of[-1,1]){a(G.box,col(0xc8bb7a),s*.26,.69,.39,.28,.04,.035);a(G.box,fabric,s*.28,.29,.407,.26,.22,.03);a(G.box,thread,s*.28,.39,.43,.28,.025,.018);}a(G.box,thread,.23,.85,.37,.13,.07,.02);}
   if(v===1){for(const s of[-1,1]){a(G.box,fabric,s*.32,.36,.40,.28,.20,.04);a(G.box,dark,s*.29,.80,.42,.13,.34,.03,0,0,-s*.27);}a(G.cyl12,dark,0,.21,0,.51,.065,.44);a(G.box,metal,.02,.21,.45,.14,.075,.025);}
   if(v===2){a(G.box,col(0xb6a28c),0,.77,.436,.23,.39,.025);for(const s of[-1,1])a(G.cone4,fabric,s*.16,.91,.45,.15,.14,.035,0,0,s*1.1);a(G.box,dark,0,.66,.467,.07,.24,.025);a(G.box,metal,.24,.34,.43,.07,.035,.02);}
   if(v===3){a(G.sph10,fabric,0,.95,-.25,.38,.21,.26);a(G.box,dark,0,.94,-.42,.26,.12,.025);for(const s of[-1,1])a(G.box,thread,s*.12,.77,.44,.015,.31,.012);a(G.box,fabric,0,.29,.43,.48,.23,.04);a(G.box,thread,0,.395,.458,.40,.015,.015);}
  }else if(slot==='bottom'){
   a(pants,fabric,0,.70,0,1,1,.85);for(const s of[-1,1])a(G.cyl8,fabric,s*.245,.23,0,.245,.46,.39);a(G.cyl12,dark,0,.98,0,.475,.065,.42);a(G.box,metal,0,.98,.43,.12,.075,.02);a(G.box,thread,.03,.70,.44,.012,.43,.014);
   for(const s of[-1,1]){a(G.box,fabric,s*.30,.67,.38,.23,.20,.035);if(v===0){a(G.box,fabric,s*.465,.41,0,.10,.33,.36);a(G.box,thread,s*.51,.55,.02,.015,.035,.33);}if(v===3){a(G.box,col(s<0?0x8f7a8e:0x9a9b88),s*.26,.20,.376,.28,.24,.022,0,0,s*.08);for(let i=0;i<3;i++)a(G.box,thread,s*.27-.08+i*.08,.31,.40,.025,.012,.015);}if(v===2)a(G.cyl8,col(0x96576d),s*.245,.04,0,.25,.07,.395);}
  }else{
   a(G.box,v===3?thread:dark,0,.035,.055,.25,.065,.39);a(G.box,fabric,0,.13,.055,.23,.15,.36);a(G.box,fabric,0,.22,-.045,.21,v===1?.11:.25,.19);a(G.box,v===3?thread:dark,0,.11,.225,.23,.12,.06);a(G.box,dark,0,.037,-.10,.24,.075,.12);
   if(v===2){a(G.box,metal,.121,.24,-.035,.017,.07,.10);a(G.box,col(0x90526c),0,.21,.06,.23,.045,.02);}else for(let i=0;i<(v===1?2:4);i++)a(G.box,thread,0,.20+i*.024,.13-i*.017,.12,.012,.018);
   if(v===3){a(G.box,col(0x6f4d78),.12,.17,-.04,.012,.095,.12);a(G.box,col(0xb34f63),0,.07,.25,.15,.035,.012);}if(v===0)for(const s of[-1,1])a(G.box,metal,s*.09,.17,.12,.025,.018,.025);
  }
 }));
 // Шарнирные края ткани уходят только наружу от корпуса; геометрия общая для всех экземпляров.
 const flaps=[];if(slot==='top')for(const s of[-1,1]){const p=new THREE.Group();p.position.set(s*.25,v===1||v===2?.56:.25,-.44);g.add(p);const mat=lam({map:outfitFabric(slot,v),side:THREE.DoubleSide},'outfit44-flap-'+v);mesh(flap,mat,0,-(v===2?.37:.19),-.012,.47,v===2?.74:.38,1,p);p.userData.cloth=true;flaps.push(p);}
 g.userData.flaps=flaps;return g;
}

export function outfitCuff(v){return compose('outfit44-cuff-'+v,a=>{a(G.cyl8,tmat(outfitFabric('top',v)),0,.065,-.045,.11,.12,.11);a(G.cyl8,col(0xb9ac8c),0,.008,-.045,.113,.025,.113);});}
