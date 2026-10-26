import {G,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from './state.js';

// Неподвижные связанные грузы запекаются вместе с районом; подбирать можно верхние предметы.
export function storageBay(b,x,z,w=3.6,d=1.5,kind='port'){
 b.ground(x-w/2-.35,z-d/2-.35,x+w/2+.35,z+d/2+.35,T.concrete(),1.5,.022);
 const g=b.prop(x,z),metal=col(0x535760),strap=col(kind==='port'?0x9d925f:0xba8b45),wood=tmat(T.crate());
 g.add(compose('storage50-'+w+'-'+d+'-'+kind,a=>{
  for(const sx of[-1,1])for(const sz of[-1,1]){a(G.box,metal,sx*(w/2-.045),1.2,sz*(d/2-.045),.09,2.4,.09);a(G.box,metal,sx*(w/2-.045),.035,sz*(d/2-.045),.22,.07,.22);}
  for(const y of[.17,1.33]){a(G.box,tmat(T.wood()),0,y,0,w,.08,d);for(const sz of[-1,1])a(G.box,strap,0,y-.07,sz*(d/2-.05),w,.14,.075);
   const n=Math.max(2,Math.floor(w/1.0)),bw=(w-.3)/n-.08;
   for(let i=0;i<n;i++){const xx=(i-(n-1)/2)*(bw+.08),base=y+.04;
    if(kind==='construction'&&i%2===0){for(let k=0;k<3;k++){a(G.box,tmat(T.cardboard()),xx,base+.10+k*.19,0,bw,.19,d*.72);a(G.box,col(0xbcb5a2),xx,base+.10+k*.19,d*.365,.36,.06,.012);}}
    else{a(G.box,wood,xx,base+.32,0,bw,.64,d*.8);for(const sz of[-1,1])a(G.box,strap,xx,base+.32,sz*(d*.4+.007),.06,.67,.018);a(G.box,strap,xx,base+.65,0,.06,.02,d*.82);a(G.box,col(0xc4bfa2),xx+bw*.23,base+.32,d*.405,.17,.1,.012);}
   }
  }
  a(G.box,metal,0,2.36,0,w,.08,d);
  // Диагональные связи доходят до задних стоек, анкерные пятки стоят на бетоне.
  const span=w-.09,len=Math.hypot(span,2.23);for(const sign of[-1,1])a(G.box,metal,0,1.2,-d/2+.025,len,.045,.045,0,0,sign*Math.atan2(2.23,span));
 }));b.solid(x,z,w,d,0,2.4);
 (W.dressings??=[]).push({kind:'storage-bay',x:b.X(x),z:b.Z(z),y:b.Y,w,d,theme:kind});
 // Край разгрузки обозначен краской, а не дополнительной стеной поперёк маршрута.
 b.marking(x,z+d/2+.32,w,.08,0xb6a466);return g;
}
export function pipeCradle(b,x,z,len=3.6){
 const wood=tmat(T.wood()),metal=tmat(T.rust());for(const xx of[-len*.33,len*.33]){b.box(x+xx,z,.18,1.9,.14,wood);for(const zz of[-.83,.83])b.box(x+xx,z+zz,.12,.12,.50,wood);}
 for(const dz of[-.58,0,.58]){const p=b.m(G.cyl8,metal,x,.42,z+dz,.28,len,.28);p.rotation.z=Math.PI/2;}
 for(const xx of[-len*.32,len*.32])b.m(G.box,col(0x979587),x+xx,.71,z,.06,.035,1.78);
 b.solid(x,z,len,1.9,0,.73);(W.dressings??=[]).push({kind:'pipe-cradle',x:b.X(x),z:b.Z(z),y:b.Y});
}
