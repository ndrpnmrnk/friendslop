import { THREE,G,mesh,col,tmat,glow,renderer } from '../core/gfx.js';
import { T,pix } from '../core/textures.js';
import { W } from './state.js';
import { addSolid } from './physics.js';
import { actors,knockDown } from '../game/actors.js';
import { eliminate } from '../game/drone.js';
import { sfx } from '../core/sfx.js';
import { burst } from './particles.js';
import { addOutline } from '../game/outline.js';
// XZ кабины постоянны: движущиеся коллизии меняют Y без перестройки сетки.
export function buildElevator(b,o,floors,fh){
 const x=b.X((o.x0+o.x1)/2),z=b.Z((o.z0+o.z1)/2),base=b.Y,w=o.x1-o.x0,d=o.z1-o.z0,h=floors*fh,pit=base-.85;
 const g=new THREE.Group();g.name='office-elevator';g.position.set(x,base,z);W.group.add(g);
 renderer.localClippingEnabled=true;
 const metal=tmat(T.metal()),wall=tmat(T.concrete()),dark=col(0x292737),trim=col(0xb8a889);
 const a=(geo,mat,px,py,pz,sx,sy,sz,parent=g)=>mesh(geo,mat,px,py,pz,sx,sy,sz,parent);
 const solid=(px,pz,sx,sz,y,hh,tag)=>addSolid(x+px-sx/2,z+pz-sz/2,x+px+sx/2,z+pz+sz/2,y,y+hh,tag);
 for(const sx of [-1,1]){a(G.box,wall,sx*w/2,h/2,0,.18,h+2.3,d);solid(sx*w/2,0,.18,d,pit,h+2.3,'lift-shaft');a(G.box,metal,sx*(w/2-.2),h/2,-d/2+.2,.055,h,.055);}
 a(G.box,wall,0,h/2,-d/2,w,h+2.3,.18);solid(0,-d/2,w,.18,pit,h+2.3,'lift-shaft');
 a(G.box,wall,0,pit-base-.13,0,w,.26,d);solid(0,0,w,d,pit-.26,.26,'lift-pit');
 W.holes.push({x0:x-w/2+.09,x1:x+w/2-.09,z0:z-d/2+.09,z1:z+d/2-.08});
 const cab=new THREE.Group();cab.name='lift-cabin';g.add(cab);const cw=w-.46,cd=d-.38,front=cd/2;
 a(G.box,tmat(T.grate()),0,-.11,0,cw,.22,cd,cab);a(G.box,metal,0,2.78,0,cw,.14,cd,cab);
 const dynamic=[{s:solid(0,0,cw,cd,base-.22,.22,'lift-floor'),lo:-.22,hi:0},{s:solid(0,0,cw,cd,base+2.71,.14,'lift-roof'),lo:2.71,hi:2.85}];
 for(const sx of [-1,1]){a(G.box,metal,sx*cw/2,1.35,0,.10,2.7,cd,cab);dynamic.push({s:solid(sx*cw/2,0,.10,cd,base,2.7,'lift-wall'),lo:0,hi:2.7});a(G.box,trim,sx*(cw/2-.10),.95,-.1,.05,.07,cd-.45,cab);}
 a(G.box,metal,0,1.35,-cd/2,cw,2.7,.10,cab);dynamic.push({s:solid(0,-cd/2,cw,.10,base,2.7,'lift-wall'),lo:0,hi:2.7});
 a(G.box,glow(0xffdeb0),0,2.68,0,1.1,.035,.45,cab);const load=a(G.box,glow(0x9be36b),0,2.3,-cd/2+.065,.55,.13,.02,cab);
 a(G.plane,tmat(T.sign('3 МЕСТА','#292737','#e9d6b5')),0,2.04,-cd/2+.061,.82,.18,1,cab);
 const doorMetal=metal.clone();doorMetal.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),-(x-cw/2)),new THREE.Plane(new THREE.Vector3(-1,0,0),x+cw/2)];const doorDark=dark.clone(),doorTrim=trim.clone();doorDark.clippingPlanes=doorTrim.clippingPlanes=doorMetal.clippingPlanes;
 const cable=a(G.cyl6,dark,0,0,0,.045,1,.045),leaves=[-1,1].map(sx=>a(G.box,metal,sx*cw/4,1.3,front,cw/2,2.6,.07,cab));
 for(const leaf of leaves){leaf.material=doorMetal;for(const y of [-.34,.34])a(G.box,doorDark,0,y,.56,.62,.009,.025,leaf);for(const x of [-.47,.47])a(G.box,doorTrim,x,0,.56,.018,.97,.025,leaf);}
 const cabGate=solid(0,front,cw,.10,base,2.6,'lift-door');dynamic.push({s:cabGate,lo:0,hi:2.6});const cabOther=solid(0,front,cw,.10,base,2.6,'lift-door');dynamic.push({s:cabOther,lo:0,hi:2.6});const landings=[];const slideCollision=(ss,width,open)=>{for(let i=0;i<2;i++){const q=ss[i],gap=Math.min(width,open*(width+.06))/2;q.x0=i?x+gap:x-width/2;q.x1=i?x+width/2:x-gap;q.on=q.x1-q.x0>.01;}};
 const e={g,cab,x,z,y:base,base,pit,floors,fh,floor:0,state:'idle',open:1,dwell:2,queue:[],broken:false,speed:0,target:0,request(k){k=Math.max(0,Math.min(floors-1,k|0));if(this.broken)return false;if(this.floor===k&&this.state==='idle'){this.dwell=2;return true;}if(!this.queue.includes(k))this.queue.push(k);return true;}};
 for(let k=0;k<floors;k++){const y=k*fh;
  for(const sx of [-1,1]){a(G.box,dark,sx*(w/2-.06),y+1.42,d/2,.18,2.84,.25);solid(sx*(w/2-.06),d/2,.18,.25,base+y,2.84,'lift-frame');}
  a(G.box,dark,0,y+2.78,d/2,w,.16,.24);solid(0,d/2,w,.24,base+y+2.7,.16,'lift-frame');
  const door=[-1,1].map(sx=>a(G.box,metal,sx*(w-.24)/4,y+1.32,d/2,(w-.24)/2,2.64,.07)),gate=solid(0,d/2,w-.24,.10,base+y,2.64,'lift-landing');for(const leaf of door){leaf.material=doorMetal;for(const side of [-.47,.47])a(G.box,doorDark,side,0,.56,.018,.97,.035,leaf);a(G.box,doorTrim,0,-.36,.56,.66,.012,.03,leaf);}const other=solid(0,d/2,w-.24,.10,base+y,2.64,'lift-landing');landings.push({door,gate,gates:[gate,other],k});
  a(G.plane,tmat(T.sign(`${k+1} ЭТАЖ`,'#292737','#f5c542')),0,y+3.02,d/2+.13,1.25,.23,1);a(G.box,dark,w/2+.23,y+1.15,d/2,.31,.43,.08);
  const call=a(G.box,col(0xf5c542),w/2+.23,y+1.17,d/2+.06,.17,.17,.06);W.keep.push(call);
  W.interacts.push({x:x+w/2+.23,z:z+d/2+.16,y:base+y,r:1.65,dy:.65,allowHeld:true,outline:addOutline(call,.025),label:`Вызвать лифт - ${k+1} этаж`,enabled:()=>!e.broken,act:()=>{e.request(k);sfx('click');}});
 }
 for(let k=0;k<floors;k++){const yy=1.18+(k>>1)*.28,zz=.32+(k%2)*.38,button=a(G.box,col(0xe6d8be),cw/2-.075,yy,zz,.06,.22,.26,cab);
  const number=pix('liftNumber29'+k,16,16,g=>{g.fillStyle='#e6d8be';g.fillRect(0,0,16,16);g.fillStyle='#292737';g.font='bold 14px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(String(k+1),8,8);});
  const label=a(G.plane,tmat(number),cw/2-.11,yy,zz,.18,.18,1,cab);label.rotation.y=-Math.PI/2;
  const q={x:x+cw/2-.2,z:z+zz,y:base,r:3.3,dy:.65,allowHeld:true,label:`Лифт - ${k+1} этаж`,enabled:p=>!e.broken&&Math.abs(p.pos.x-x)<cw/2&&Math.abs(p.pos.z-z)<cd/2,aim:ray=>{button.updateWorldMatrix(true,false);return ray.intersectObject(button,false).length>0;},act:()=>{e.request(k);sfx('click');}};W.interacts.push(q);button.userData.interact=q;
 }
 const inside=p=>Math.abs(p.pos.x-x)<cw/2-.09&&p.pos.z>z-cd/2+.05&&p.pos.z<z+front-.02,passenger=p=>inside(p)&&p.pos.y>=e.y-.15&&p.pos.y<e.y+2.55;let fallen=[];
 W.animated.push(dt=>{const all=actors(),aboard=all.filter(passenger),old=e.y;
  if(!e.broken&&aboard.length>3){e.broken=true;e.state='fall';e.speed=0;fallen=aboard.slice();e.queue.length=0;sfx('break',{at:{x,y:e.y,z}});}
  if(e.state==='fall'){e.open=Math.max(0,e.open-dt*3);e.speed-=18*dt;e.y=Math.max(pit,e.y+e.speed*dt);for(const p of all)if(!fallen.includes(p)&&inside(p)&&p.pos.y<old-.15&&p.pos.y+p.h>e.y-.22)eliminate(p,15);
   if(e.y<=pit){e.state='broken';e.open=1;e.speed=0;for(const p of fallen)if(!p.drone)knockDown(p,0,0,2.8);fallen=[];burst(x,pit+.3,z,18,{color:0x9c8c78,size:.18,speed:3,up:3});sfx('break',{at:{x,y:pit,z}});}
  }else if(e.state==='idle'){e.open=Math.min(1,e.open+dt*2.5);e.dwell-=dt;if(e.queue.length&&e.dwell<=0){e.target=e.queue.shift();if(e.target!==e.floor)e.state='closing';}}
  else if(e.state==='closing'){const blocked=all.some(p=>Math.abs(p.pos.x-x)<cw/2&&Math.abs(p.pos.z-(z+front))<p.r+.15&&Math.abs(p.pos.y-e.y)<.5);e.open=blocked?Math.min(1,e.open+dt*3):Math.max(0,e.open-dt*2);if(e.open===0)e.state='moving';}
  else if(e.state==='moving'){const to=base+e.target*fh,delta=to-e.y,sp=Math.min(2.4,Math.sqrt(Math.abs(delta)*3.4)+.16);e.y+=Math.sign(delta)*Math.min(Math.abs(delta),sp*dt);if(Math.abs(to-e.y)<.001){e.y=to;e.floor=e.target;e.state='idle';e.dwell=2;sfx('done',{at:{x,y:e.y,z},v:.4});}}
  const dy=e.y-old;if(dy)for(const p of aboard)if(!p.drone){p.pos.y+=dy;p.ground=e.y;}cab.position.y=e.y-base;
  for(const q of dynamic){q.s.y0=e.y+q.lo;q.s.y1=e.y+q.hi;}slideCollision([cabGate,cabOther],cw,e.open);
  for(let i=0;i<2;i++)leaves[i].position.x=(i?1:-1)*(cw/4+e.open*(cw/2+.03));
  for(const l of landings){const open=(e.broken&&e.state==='broken'&&l.k===0)||(!e.broken&&['idle','closing'].includes(e.state)&&l.k===e.floor)?e.open:0;slideCollision(l.gates,w-.24,open);for(let i=0;i<2;i++){l.door[i].position.x=(i?1:-1)*((w-.24)/4+open*((w-.24)/2+.03));}}
  for(const button of cab.children)if(button.userData.interact)button.userData.interact.y=e.y;cable.position.y=(h+e.y-base+2.85)/2;cable.scale.y=Math.max(.05,h-(e.y-base+2.85));load.material=e.broken?glow(0xff5a6e):aboard.length===3?glow(0xf5c542):glow(0x9be36b);
 });
 W.keep.push(cab,cable,load,...landings.flatMap(l=>l.door));W.elevators.push(e);cabGate.on=cabOther.on=false;landings[0].gates.forEach(s=>s.on=false);return e;
}
