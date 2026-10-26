import {THREE} from '../core/gfx.js';

const cache=new Map();
const palettes={cat:['#201c35','#aa674d','#f6c38a'],tv:['#181b38','#664d9e','#a9e6cf'],shark:['#112939','#276b81','#9cdde6'],frog:['#182f2c','#527653','#d1e7a0'],caveman:['#302333','#916449','#e9bd82'],smoky:['#211e32','#79516f','#edc896'],gryzli:['#342039','#ae5275','#ffd193'],latte:['#252a3c','#728c94','#e8ccae']};
function texture(canvas){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearFilter;return t;}
const poly=(c,points)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
const ellipse=(c,x,y,rx,ry)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
function symbol(c,id,k){
 c.lineWidth=5;c.lineCap='square';
 if(id==='cat'){if(k%2){ellipse(c,64,80,25,21);for(const[x,y]of[[34,48],[54,34],[77,34],[95,48]])ellipse(c,x,y,9,13);}else poly(c,[[64,12],[80,43],[106,33],[95,67],[112,84],[76,91],[64,119],[51,91],[18,83],[34,65],[22,34],[50,42]]);}
 else if(id==='tv'){if(k%2){c.strokeRect(22,27,85,66);c.fillRect(32,38,64,42);c.clearRect(37,44,54,30);c.fillRect(44,98,42,7);c.beginPath();c.moveTo(64,26);c.lineTo(46,9);c.moveTo(64,26);c.lineTo(81,9);c.stroke();}else{for(let x=19;x<110;x+=20)for(let y=20;y<110;y+=20)if((x+y)%3)c.fillRect(x,y,13,13);}}
 else if(id==='shark'){if(k%2){c.beginPath();c.arc(64,64,36,0,6.28);c.stroke();c.beginPath();c.arc(56,54,20,3.6,5);c.stroke();}else{poly(c,[[18,96],[63,17],[86,89],[112,96]]);c.fillRect(16,103,97,5);}}
 else if(id==='frog'){if(k%2){for(let i=0;i<6;i++){c.save();c.translate(64,64);c.rotate(i*Math.PI/3);ellipse(c,0,28,10,25);c.restore();}ellipse(c,64,64,13,13);}else{ellipse(c,64,67,45,31);c.globalCompositeOperation='destination-out';poly(c,[[64,67],[105,38],[112,63]]);c.globalCompositeOperation='source-over';c.beginPath();c.moveTo(34,74);c.lineTo(59,69);c.stroke();}}
 else if(id==='caveman'){if(k%2){c.strokeRect(24,41,80,46);c.fillRect(11,27,17,18);c.fillRect(11,82,17,18);c.fillRect(100,27,17,18);c.fillRect(100,82,17,18);}else{c.beginPath();for(let i=0;i<75;i++){const a=i*.25,r=2+i*.58;i?c.lineTo(64+Math.cos(a)*r,64+Math.sin(a)*r):c.moveTo(64,64);}c.stroke();}}
 else if(id==='smoky'){if(k%2){c.save();c.translate(66,64);c.rotate(-.25);c.fillRect(-5,-39,8,69);ellipse(c,-18,31,17,12);c.fillRect(1,-39,30,13);c.restore();}else{for(let i=0;i<4;i++){c.strokeRect(17+i*11,17+i*11,94-i*22,94-i*22);}c.clearRect(48,44,32,40);}}
 else if(id==='gryzli'){if(k%2){poly(c,[[17,36],[43,50],[86,50],[111,36],[105,91],[84,76],[44,76],[22,91]]);ellipse(c,64,64,29,23);c.clearRect(49,51,29,6);}else{poly(c,[[65,7],[76,40],[111,25],[95,55],[122,72],[88,78],[96,114],[65,96],[35,120],[39,84],[8,74],[38,58],[18,30],[52,40]]);}}
 else {if(k%2){c.strokeRect(30,24,69,80);c.beginPath();c.moveTo(33,62);c.lineTo(94,50);c.moveTo(42,26);c.lineTo(88,103);c.stroke();}else{poly(c,[[29,38],[99,38],[90,112],[39,112]]);c.fillRect(22,27,85,9);c.fillRect(78,5,7,24);c.clearRect(42,54,42,7);c.clearRect(46,73,34,6);}}
}
export function rewardTheme(id){
 if(cache.has(id))return cache.get(id);
 const palette=palettes[id]||palettes.cat,[dark,mid,light]=palette,canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;const c=canvas.getContext('2d');
 const gradient=c.createRadialGradient(384,240,8,384,250,430);gradient.addColorStop(0,mid);gradient.addColorStop(1,dark);c.fillStyle=gradient;c.fillRect(0,0,768,512);c.fillStyle=dark;c.strokeStyle=light;c.lineWidth=2;
 if(id==='cat'){
  for(const x of[0,110,568,680]){c.fillStyle=dark;c.fillRect(x,92,91,380);for(let y=119;y<450;y+=77){c.fillStyle=light;c.globalAlpha=.48;c.fillRect(x+18,y,49,51);c.globalAlpha=1;c.fillStyle=dark;c.fillRect(x+40,y,5,52);c.fillRect(x+18,y+24,50,4);}}
  c.fillStyle=dark;for(const x of[43,708]){c.fillRect(x,275,10,230);poly(c,[[x,324],[x-48,272],[x-42,264],[x+10,312],[x+52,250],[x+59,258],[x+9,338]]);}c.fillRect(0,469,768,43);
 }else if(id==='tv'){
  for(let i=0;i<7;i++){c.globalAlpha=.24+i*.035;c.strokeRect(30+i*26,16+i*19,708-i*52,480-i*38);}c.globalAlpha=.22;for(let y=0;y<512;y+=5)c.fillRect(0,y,768,2);for(let i=0;i<24;i++){c.fillStyle=[light,mid][i%2];c.fillRect(i*79%768,i*47%512,12+i%5*8,8);}c.globalAlpha=1;
 }else if(id==='shark'){
  c.globalAlpha=.26;for(let i=0;i<9;i++){c.fillStyle=light;poly(c,[[i*104,0],[i*104+23,0],[i*104-140,512],[i*104-235,512]]);}c.globalAlpha=1;c.fillStyle=dark;for(let x=0;x<768;x+=35){const h=25+x%69;c.fillRect(x,512-h,10,h);ellipse(c,x+4,512-h,14,8);}for(let i=0;i<8;i++){c.globalAlpha=.14;c.beginPath();c.ellipse(i*123%768,90+i*51,135,20,.2,0,6.28);c.stroke();}c.globalAlpha=1;
 }else if(id==='frog'){
  for(let i=0;i<12;i++){c.fillStyle=i%2?dark:mid;ellipse(c,i*109%768,380+i%4*34,65,18);c.globalAlpha=.3;c.strokeRect(i*109%768-45,390+i%4*34,88,1);c.globalAlpha=1;}c.fillStyle=dark;for(const x of[24,46,72,691,719,744]){c.fillRect(x,270+x%83,4,240);ellipse(c,x+2,290+x%83,7,23);}
 }else if(id==='caveman'){
  c.fillStyle=dark;for(let i=0;i<9;i++){poly(c,[[i*97-60,0],[i*97+100,0],[i*97+35,105+i%3*35]]);poly(c,[[i*101-50,512],[i*101+90,512],[i*101+15,421-i%3*31]]);}c.strokeStyle=mid;for(let i=0;i<14;i++){c.beginPath();c.moveTo(i*83%768,35);c.lineTo(i*83%768-22,180);c.lineTo(i*83%768+18,249);c.stroke();}
 }else if(id==='smoky'){
  c.lineWidth=3;for(let i=0;i<5;i++){c.strokeStyle=i%2?mid:light;c.strokeRect(12+i*12,12+i*12,744-i*24,488-i*24);}c.fillStyle=dark;for(let i=0;i<23;i++){const x=i*36,h=35+i*37%100;c.fillRect(x,512-h,30,h);for(let y=512-h+10;y<500;y+=18){c.fillStyle=light;c.globalAlpha=.25;c.fillRect(x+6,y,5,7);c.globalAlpha=1;c.fillStyle=dark;}}
 }else if(id==='gryzli'){
  c.lineWidth=6;for(let i=0;i<19;i++){const a=i*6.283/19;c.fillStyle=i%2?dark:mid;poly(c,[[384+Math.cos(a)*210,240+Math.sin(a)*190],[384+Math.cos(a+.07)*600,240+Math.sin(a+.07)*600],[384+Math.cos(a+.18)*600,240+Math.sin(a+.18)*600]]);}c.globalAlpha=.3;c.fillStyle=light;for(let x=8;x<768;x+=22)for(let y=9;y<512;y+=22)if(x<130||x>638)ellipse(c,x,y,2,2);c.globalAlpha=1;
 }else{
  c.strokeStyle=light;c.globalAlpha=.35;for(const x of[24,589]){c.strokeRect(x,50,155,332);c.fillStyle=dark;c.fillRect(x+74,50,6,332);c.fillRect(x,198,155,6);}c.globalAlpha=1;c.fillStyle=dark;c.fillRect(0,432,768,80);c.fillStyle=mid;for(let x=0;x<768;x+=48)c.fillRect(x,442,28,7);c.strokeStyle=light;c.globalAlpha=.3;for(let i=0;i<6;i++){c.beginPath();c.ellipse(i*153,445,80,16,0,0,6.28);c.stroke();}c.globalAlpha=1;
 }
 // Рисунок остаётся пиксельным; зерно детерминировано и не меняется каждый кадр.
 c.fillStyle=light;for(let i=0;i<1200;i++){c.globalAlpha=.035+(i%3)*.015;c.fillRect(i*179%768,i*89%512,2,2);}c.globalAlpha=1;
 const atlas=document.createElement('canvas');atlas.width=256;atlas.height=256;const a=atlas.getContext('2d');a.fillStyle=light;a.strokeStyle=light;for(let k=0;k<4;k++){a.save();a.translate((k%2)*128,Math.floor(k/2)*128);symbol(a,id,k);a.restore();}
 const result={art:texture(canvas),glyphs:texture(atlas),accent:new THREE.Color(mid),warm:new THREE.Color(light)};cache.set(id,result);return result;
}
