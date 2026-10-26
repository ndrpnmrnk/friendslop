import {THREE,G,mesh,col,tmat,compose} from '../core/gfx.js';
import {T,pix} from '../core/textures.js';
const spines=()=>tmat(pix('shelf-spines50',64,64,c=>{c.fillStyle='#d8c8a1';c.fillRect(0,0,64,64);for(let i=0;i<8;i++){c.fillStyle=['#635879','#556a61','#99754f','#78525b'][i%4];c.fillRect(i*8,0,7,64);c.fillStyle='#d9cdb1';c.fillRect(i*8+2,9,4,16);c.fillRect(i*8+2,48,4,3);}}));
export function dressShelf(group,w,levels,theme){
 const colors=theme==='school'?[0x99624d,0x476f76,0x80618d]:theme==='hospital'?[0xc1cdbd,0x879d9c,0xb8ac8a]:[0x5d6579,0x776957,0x616e5f];
 const n=Math.max(3,Math.min(13,Math.floor((w-.25)/.18)));
 for(let row=0;row<3;row++){
  const y=levels[row]+.033,g=compose('shelf50-'+theme+'-'+n+'-'+row,a=>{for(let i=0;i<n;i++){
   if(theme==='office'&&i>=n-2)continue;const x=(i-(n-1)/2)*.175,h=.24+(i%3)*.045,book=i%5!==4;
   if(book){a(G.box,col(colors[(i+row)%3]),x,h/2,0,.125,h,.27);a(G.box,spines(),x,h*.51,.139,.112,h*.90,.008);}
   else{a(G.box,tmat(T.cardboard()),x,.105,0,.16,.21,.28);a(G.box,col(0xd9cbb0),x,.12,.145,.10,.05,.008);}
  }if(theme==='office')for(let i=0;i<2;i++)a(G.box,col(0xc4bda7),(n/2-1)*.175,.01+i*.02,.045,.30,.02,.23);
  });g.position.y=y;group.add(g);
 }
 if(theme==='school'&&w>2){const g=compose('school-globe50',a=>{a(G.cyl8,col(0x796b55),0,.025,0,.11,.05,.11);a(G.cyl6,col(0xb5a177),0,.12,0,.017,.18,.017);a(G.sph10,col(0x608d91),0,.27,0,.13,.13,.13);for(const x of[-.05,.045])a(G.ico,col(0x849159),x,.30,.095,.055,.065,.04);});g.position.set(w/2-.28,levels[3]+.033,0);group.add(g);}
}
