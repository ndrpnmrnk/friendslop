import {pix} from '../core/textures.js';
const colors={'РОЗА':['#dc7191','#91435d'],'МЯТА':['#83b58a','#376b59'],'ВАНИЛЬ':['#dfca91','#8f704e'],'КЕДР':['#689477','#644c40'],'ЛИМОН':['#e8cd64','#a38a3c'],'ЛАВАНДА':['#b19bd7','#736095'],'МОХ':['#96a474','#4b664d'],'ЯНТАРЬ':['#d9a451','#9b643e']};
export function drawIngredient(c,name,x,y,size=24){
 c.save();c.translate(x,y);c.scale(size/16,size/16);c.imageSmoothingEnabled=false;const[a,b]=colors[name]||colors['МЯТА'];c.fillStyle=b;
 const rect=(x,y,w,h,color=a)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 if(name==='РОЗА'){rect(7,8,2,7,'#4e7855');rect(3,3,9,7,b);rect(5,1,6,10);rect(2,5,12,4);rect(6,4,4,3,'#f2a1b2');rect(4,11,3,2,'#70936b');}
 else if(name==='ЛИМОН'){rect(3,4,10,8,b);rect(2,6,12,4);rect(4,3,8,10);rect(5,4,3,2,'#fff0ad');rect(9,1,4,2,'#6e9467');}
 else if(name==='ЛАВАНДА'){rect(7,3,1,12,'#628668');for(let i=0;i<4;i++){rect(4,2+i*2,4,2,i%2?a:b);rect(8,3+i*2,3,2,a);}}
 else if(name==='КЕДР'){rect(7,2,2,13,b);for(let i=0;i<3;i++){rect(3-i,5+i*3,10+i*2,2,a);rect(5-i,3+i*3,6+i*2,2,'#82a38a');}}
 else if(name==='ЯНТАРЬ'){rect(5,2,6,2,b);rect(3,4,10,7,b);rect(5,11,6,3,b);rect(6,3,5,8);rect(4,5,2,5);rect(7,4,2,3,'#f8da89');}
 else if(name==='ВАНИЛЬ'){rect(3,2,2,11,b);rect(5,11,2,3,b);rect(8,5,2,8,b);rect(11,2,2,7,b);rect(8,1,5,3);rect(9,0,3,5);rect(10,2,1,1,'#a08146');}
 else if(name==='МОХ'){rect(2,8,12,5,b);rect(3,5,5,6);rect(8,3,4,8);rect(11,7,3,4);rect(4,4,2,2,'#c1c792');}
 else{rect(7,5,1,10,b);rect(2,3,5,7);rect(4,2,3,5);rect(8,6,5,6);rect(10,4,3,5);rect(3,5,2,1,'#c2d7a2');}
 c.restore();
}
export const ingredientIcon=name=>pix('perfume46-'+name,24,24,c=>{c.fillStyle='#d5cab2';c.fillRect(0,0,24,24);c.strokeStyle='#736675';c.strokeRect(.5,.5,23,23);drawIngredient(c,name,2,2,20);});
