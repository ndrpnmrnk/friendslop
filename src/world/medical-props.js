import {G,mesh,col,tmat,compose} from '../core/gfx.js';
import {pix} from '../core/textures.js';
export function medicalChart(b,x,z,y,ry=0){
 const paper=pix('medical-chart50',64,96,c=>{c.fillStyle='#d1d4c4';c.fillRect(0,0,64,96);c.fillStyle='#587c75';c.fillRect(4,4,56,9);c.fillStyle='#728c83';c.fillRect(27,22,10,31);c.fillRect(18,29,28,7);c.fillRect(23,52,6,18);c.fillRect(35,52,6,18);c.beginPath();c.arc(32,19,7,0,6.28);c.fill();c.strokeStyle='#486a63';c.lineWidth=2;c.beginPath();[[5,83],[15,83],[19,79],[23,88],[29,74],[32,84],[58,84]].forEach(([x,y])=>c.lineTo(x,y));c.stroke();});
 const g=b.prop(x,z,ry);g.position.y+=y;g.add(compose('medical-chart-frame50',a=>{a(G.box,col(0x666c63),0,0,0,.73,1.02,.035);a(G.box,tmat(paper),0,0,.023,.64,.96,.012);}));return g;
}
export function medicalTray(b,x,z,y){const g=b.prop(x,z);g.position.y+=y;g.add(compose('medical-tray50',a=>{const steel=col(0x929b96);a(G.box,steel,0,.02,0,.40,.04,.26);for(const z of[-.13,.13])a(G.box,steel,0,.05,z,.42,.055,.02);for(const x of[-.13,0,.13]){a(G.cyl8,col(0x718e87),x,.115,0,.035,.16,.035);a(G.cyl8,col(0xc4d1be),x,.205,0,.038,.025,.038);a(G.box,col(0xd8d5c0),x,.12,.035,.045,.06,.008);}}));return g;}
