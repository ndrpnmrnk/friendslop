import {THREE,G,V3,mesh,col,tmat,lam} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {addSolid} from '../world/physics.js';
import {addItem} from '../game/items.js';
import {toolHand} from '../game/handheld.js';
import {sfx} from '../core/sfx.js';
export function buildPerfume(x,y,z,f){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=Math.atan2(f[0],f[1]);W.group.add(g);mesh(G.box,tmat(T.wood()),0,.82,0,2.4,.10,.85,g);for(const a of [-1,1])for(const b of [-1,1])mesh(G.box,tmat(T.wood()),a*1.06,.4,b*.3,.08,.8,.08,g);const rx=f[0]?.42:1.2,rz=f[0]?1.2:.42,solid=addSolid(x-rx,z-rz,x+rx,z+rz,y,y+.86);return{g,f,solid,pos:()=>g.position,front:()=>g.localToWorld(new V3(0,0,1.2)),dispose(){g.removeFromParent();solid.on=false;}};}
export function perfumeGame(o,api,ctx){
 api.feedback?.();ctx.cursor(true);api.pose(o.g.localToWorld(new V3(0,3.0,2.9)),o.g.localToWorld(new V3(0,1.3,0)));
 const pool=[['РОЗА',0xd16b8d],['МЯТА',0x77ba8b],['ВАНИЛЬ',0xe2c681],['КЕДР',0x92724a],['ЛИМОН',0xe9d354],['ЛАВАНДА',0xa489cb],['МОХ',0x6b8460],['ЯНТАРЬ',0xc58649]],ingredients=pool.sort(()=>Math.random()-.5).slice(0,6),need=Array(6).fill(0),got=Array(6).fill(0),use=[0,1,2,3,4,5].sort(()=>Math.random()-.5).slice(0,2+(Math.random()*5|0));for(const i of use)need[i]=1+(Math.random()*3|0);
 const g=new THREE.Group();o.g.add(g);const bottles=ingredients.map(([name,color],i)=>{const b=new THREE.Group();b.position.set(-1+i*.4,1.10,-.18);g.add(b);mesh(G.cyl8,lam({color,transparent:true,opacity:.7}),0,0,0,.11,.35,.11,b);mesh(G.cyl6,col(0x3b3445),0,.21,0,.06,.08,.06,b);mesh(G.box,tmat(T.sign(name,'#eee1c6','#292331')),0,-.02,.115,.32,.13,.015,b);b.userData.ingredient=i;return b;});
 const target=mesh(G.cyl8,lam({color:0xdab0e0,transparent:true,opacity:.35}),0,1.0,.26,.17,.32,.17,g),liquid=mesh(G.cyl8,col(0xb18cff),0,.89,.26,.14,.01,.14,g);
 const note=document.createElement('canvas');note.width=512;note.height=256;const tx=new THREE.CanvasTexture(note);tx.magFilter=THREE.NearestFilter;const noteMat=new THREE.MeshBasicMaterial({map:tx}),paper=mesh(G.plane,noteMat,0,1.9,-.39,1.9,.92,1,g);
 for(const x of [-.97,.97])mesh(G.box,tmat(T.wood()),x,1.63,-.45,.045,1.55,.06,g);mesh(G.box,tmat(T.wood()),0,1.90,-.43,2.03,1.04,.045,g);
 const mix=mesh(G.box,tmat(T.sign('СМЕШАТЬ','#9be36b','#292331')),.68,.91,.26,.66,.10,.23,g),clear=mesh(G.box,tmat(T.sign('СЛИТЬ','#b18cff','#292331')),-.68,.91,.26,.56,.10,.23,g);
 const pip=new THREE.Group();g.add(pip);mesh(G.cyl6,col(0xdbe1e0),0,0,0,.015,.24,.015,pip);mesh(G.sph,col(0x5b4a70),0,.16,0,.05,.06,.05,pip);toolHand(ctx,pip,.08,.14,0);pip.visible=false;const drop=mesh(G.sph,col(0xb18cff),0,1.2,.26,.025,.04,.025,g);drop.visible=false;
 const total=need.reduce((a,b)=>a+b,0);let anim=0,chosen=-1,done=-1;const effect=need.reduce((hash,n,i)=>(hash*31+ingredients[i][0].charCodeAt(0)*n)>>>0,17)%2?'haste':'gas';
 function draw(){const c=note.getContext('2d');c.fillStyle='#e8d8b7';c.fillRect(0,0,512,256);c.fillStyle='#342b39';c.font='bold 26px sans-serif';c.fillText('РЕЦЕПТ · КАПЛИ',18,34);c.font='22px sans-serif';for(let i=0;i<6;i++){c.fillStyle=got[i]>need[i]?'#a12b43':got[i]===need[i]?'#397650':'#342b39';c.fillText(`${ingredients[i][0]}   ${got[i]} / ${need[i]}`,18,67+i*29);}tx.needsUpdate=true;}
 function add(i){if(anim>0||done>=0)return;chosen=i;anim=.7;sfx('click');}
 draw();api.msg('Кликни флакон - одна капля. Сверь рецепт и нажми «Смешать»');
 return{get recipe(){return need;},get doses(){return got;},down(ray){if(anim>0||done>=0)return;o.g.updateMatrixWorld(true);const h=ray.intersectObjects([...bottles,mix,clear],true);if(!h.length)return;let n=h[0].object;while(n.parent&&n.parent!==g)n=n.parent;if(n===mix){if(need.every((v,i)=>v===got[i])){done=1;sfx('done');api.msg(effect==='haste'?'Готово: облако ускорения':'Готово: сонный туман','good');}else api.msg('Дозировки не совпали. Лишнее можно слить','bad');}else if(n===clear){got.fill(0);draw();}else if(n.userData.ingredient!=null)add(n.userData.ingredient);},
 botStep(dt,brain){if(anim>0||done>=0)return;const i=need.findIndex((v,i)=>got[i]<v);if(i>=0)this.down(brain.rayTo(bottles[i].getWorldPosition(new V3())));else this.down(brain.rayTo(mix.getWorldPosition(new V3())));},
 update(dt){if(anim>0){anim-=dt;const k=1-anim/.7;pip.visible=true;pip.position.lerpVectors(bottles[chosen].position,new V3(0,1.44,.26),Math.min(1,k*2));pip.position.y+=.30;drop.visible=k>.5;drop.position.y=1.42-Math.max(0,k-.5)*.7;if(anim<=0){got[chosen]++;liquid.scale.y=Math.max(.1,got.reduce((a,b)=>a+b,0)/total*25);draw();pip.visible=drop.visible=false;}}api.progress(got.reduce((a,b,i)=>a+Math.min(b,need[i]),0)/total);if(done>=0){done-=dt;if(done<=0){const p=ctx.player.pos,it=addItem('perfume',p.x,p.y+.3,p.z);it.perfumeEffect=effect;it.mission=null;api.finish({success:true,mult:1});}}},
 stop(){g.removeFromParent();tx.dispose();noteMat.dispose();ctx.cursor(true);}};
}
