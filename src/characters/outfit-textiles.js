import {pix} from '../core/textures.js';
import {THREE} from '../core/gfx.js';
const palettes={
 hat:[['#b96b3b','#efbf79','#5d3829'],['#636b65','#b0b39b','#303e3f'],['#342b3d','#b58b86','#171923'],['#7e658b','#cab2cd','#44384f']],
 top:[['#bb703e','#edb779','#58392d'],['#7c8576','#c2c5ab','#36464a'],['#792f47','#d8ae86','#241f30'],['#417b80','#b4d0c4','#263e52']],
 bottom:[['#737f58','#bcc397','#3b4835'],['#4d5961','#a5b0ae','#2c343e'],['#493343','#b28a98','#292333'],['#45677a','#a9bfc5','#263f53']],
 shoes:[['#865b3c','#d0a776','#352b27'],['#404951','#a4aaa7','#202830'],['#483142','#bd9c87','#252230'],['#e0d4b7','#f7edcf','#3a6771']]
};
export function fabricTexture(slot,v){const t=pix('outfit48-'+slot+'-'+v,256,256,c=>{
 const[base,light,dark]=palettes[slot][v];c.fillStyle=base;c.fillRect(0,0,256,256);
 // Мелкое плетение остаётся тихим фоном, крупные конструктивные детали читаются издалека.
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const h=(x*17+y*31+x*y*7)%113;if(h<8){c.globalAlpha=.07;c.fillStyle=h%2?light:dark;c.fillRect(x,y,1,1);}}c.globalAlpha=1;c.scale(2,2);
 const rect=(x,y,w,h,color=light)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 const path=(points,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
 const seam=(x,y,w,h)=>{rect(x,y,w,h,dark);c.globalAlpha=.8;if(w>h){for(let i=1;i<w;i+=2)rect(x+i,y+.65,.7,.35);}else for(let i=1;i<h;i+=2)rect(x+.65,y+i,.35,.7);c.globalAlpha=1;};
 function pocket(x,y,w,h){rect(x+.5,y+.5,w,h,dark);rect(x+1.5,y+1,w-2,h-2,base);path([[x+1,y],[x+1,y+h-1],[x+w-1,y+h-1],[x+w-1,y]],light,.5);rect(x,y,w,3,dark);rect(x+1,y+.5,w-2,1,light);rect(x+w/2-1,y+1.2,2,1.2,'#d3b990');}
 for(const b of[0,64]){
  seam(b+4,12,.55,103);seam(b+59,12,.55,103);seam(b+4,113,56,.8);
  for(let i=0;i<5;i++){const x=b+9+i*10;path([[x,105],[x+1,84+i*3],[x-1,75+i*2]],dark,.6);path([[x+1,105],[x+2,85+i*3]],light,.35);}
 }
 if(slot==='top'){
  seam(31,18,1.2,96);for(let y=38;y<107;y+=13){rect(34,y,2.2,2.4,dark);rect(34.3,y+.3,1.2,.7,'#e6c99c');}
  c.fillStyle=dark;c.beginPath();c.moveTo(15,13);c.lineTo(32,39);c.lineTo(49,13);c.lineTo(42,10);c.lineTo(22,10);c.fill();
  for(const side of[-1,1]){c.fillStyle=light;c.beginPath();c.moveTo(32+side*15,13);c.lineTo(32+side*3,34);c.lineTo(32+side*3,21);c.lineTo(32+side*10,12);c.fill();}
  pocket(10,70,16,24);pocket(40,70,15,24);seam(71,33,49,.8);seam(95,37,.8,73);
  if(v===0){pocket(9,44,15,14);pocket(41,44,14,14);rect(10,33,11,5,'#e1d1a4');rect(12,35,6,1,dark);for(const b of[0,64]){rect(b+6,100,52,3,light);rect(b+6,104,52,1,dark);}}
  if(v===1){rect(6,92,52,5,dark);rect(29,90,8,8,'#cbb78c');rect(31,92,4,4,dark);for(const x of[13,49]){seam(x,45,.7,18);rect(x-1,43,3,3,'#bdb79e');}path([[83,18],[96,26],[111,18]],dark,1.5);}
  if(v===2){rect(26,30,12,33,'#d4c7ad');c.fillStyle='#362536';c.beginPath();c.moveTo(26,32);c.lineTo(38,40);c.lineTo(26,43);c.fill();rect(30,41,4,22,dark);for(const x of[10,53])seam(x,38,.9,68);rect(21,21,3,5,'#d9b77a');rect(39,21,3,5,'#d9b77a');}
  if(v===3){for(const x of[23,40]){path([[x,28],[x-1,49]],'#e8dbb8',.9);rect(x-1.5,48,3,4,dark);}pocket(19,72,28,18);path([[77,23],[81,12],[96,8],[112,14],[116,26]],dark,2);rect(45,40,7,5,'#c09678');}
 }else if(slot==='bottom'){
  for(const b of[0,64]){rect(b+3,10,58,8,dark);seam(b+4,13,56,.7);for(const x of[12,28,49]){rect(b+x,9,2,11,base);seam(b+x,9,.4,10);}seam(b+31,45,.7,68);path([[b+8,24],[b+16,28],[b+18,40]],light,.6);}
  rect(28,11,9,6,'#ceb58a');rect(30,12.5,5,3,dark);seam(35,25,.7,20);
  if(v===0){pocket(5,48,15,23);pocket(45,48,14,23);for(const x of[12,46]){seam(x,82,9,.7);rect(x,85,9,5,dark);}}
  if(v===1){c.globalAlpha=.45;for(let x=6;x<125;x+=6)rect(x,21,.5,91,light);c.globalAlpha=1;}
  if(v===2){for(const x of[5,39]){rect(x,102,20,9,dark);seam(x,102,20,1);rect(x+8,104,4,4,'#c1a080');}}
  if(v===3){for(const[x,y]of[[13,70],[43,86]]){rect(x,y,11,15,'#91aeb4');path([[x-1,y-1],[x+12,y-1],[x+12,y+16],[x-1,y+16],[x-1,y-1]],'#d0bda1',.6);for(let i=0;i<7;i++)rect(x+1,y+1+i*2,8,.35,dark);}pocket(74,29,16,18);pocket(104,29,16,18);}
 }else if(slot==='hat'){
  for(const b of[0,64]){rect(b+2,94,60,12,dark);seam(b+3,95,58,.8);path([[b+32,32],[b+31,59],[b+32,91]],light,.6);}
  if(v===0){for(const x of[12,52])path([[32,39],[x,68],[x-1,92]],dark,.8);rect(25,69,14,15,'#e7c99b');rect(28,73,8,4,dark);rect(29,72,5,2,'#b3743c');}
  if(v===1){rect(0,79,128,12,dark);rect(41,81,5,7,'#cdb38c');path([[8,57],[30,63],[54,54]],dark,2);}
  if(v===2){rect(0,77,128,18,'#93445d');seam(0,79,128,.7);rect(26,81,11,10,'#dabd82');rect(29,83,5,6,dark);}
  if(v===3){for(let x=1;x<128;x+=3)for(let y=12;y<115;y+=5){path([[x,y],[x+1,y+2],[x,y+4]],light,.5);path([[x+1,y],[x+2,y+2]],dark,.6);}rect(45,97,12,9,'#dac6a2');rect(48,100,6,2,dark);}
 }else{
  for(const b of[0,64]){rect(b,108,64,15,v===3?'#efe3c7':dark);seam(b+2,106,60,1);rect(b+3,121,58,2,dark);for(let x=3;x<64;x+=7)rect(b+x,122,3,4,base);}
  for(let y=42;y<94;y+=9){rect(23,y,19,1.4,'#dccfb1');rect(21,y-1,3,4,dark);rect(42,y-1,3,4,dark);rect(22,y,1.3,1,'#ccbca0');rect(43,y,1.3,1,'#ccbca0');}path([[18,35],[17,82],[12,101]],light,.7);path([[47,35],[48,82],[53,101]],light,.7);
  if(v===2){rect(3,48,57,7,dark);rect(45,45,10,13,'#c3a781');rect(48,48,5,7,dark);}
  if(v===3){rect(70,64,45,8,'#387580');rect(83,70,8,17,'#387580');rect(25,113,23,4,'#b76852');path([[8,99],[17,96],[47,96],[56,99]],dark,.8);}
 }
 });t.minFilter=THREE.NearestMipmapNearestFilter;return t;}
