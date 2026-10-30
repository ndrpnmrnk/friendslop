import {G,col,tmat,compose} from '../core/gfx.js';
import {pix} from '../core/textures.js';
import {burst} from './particles.js';
export function popcornModel(){return compose('throwable-popcorn0623',a=>{const stripe=pix('popcorn-cup0623',64,64,c=>{c.fillStyle='#e4d5ae';c.fillRect(0,0,64,64);c.fillStyle='#9e4753';for(let x=0;x<64;x+=16)c.fillRect(x,0,8,64);c.fillStyle='#ede1bc';c.fillRect(0,4,64,4);c.fillRect(0,55,64,4);});a(G.box,tmat(stripe),0,0,0,.28,.35,.25);for(let i=0;i<12;i++)a(G.sph10,col(i%3?0xf1dba5:0xd9b871),(i%3-1)*.085,.19+(i%2)*.025,(Math.floor(i/3)-1.5)*.06,.06,.052,.055);});}
export function scatterPopcorn(p){burst(p.x,p.y+.1,p.z,24,{color:0xedd59d,size:.07,speed:3.2,up:2.5,g:12,life:1.4});}
