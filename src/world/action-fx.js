import {sfx} from '../core/sfx.js';
import {THREE} from '../core/gfx.js';
import {pix} from '../core/textures.js';
import {W} from './state.js';
import {ParticleBatch} from './particle-batch.js';
import {graphics} from '../core/quality.js';
import {ripple,smoke} from './particles.js';
const states=new WeakMap();
function spriteAtlas(){return pix('action-fx48',256,32,c=>{c.fillStyle='#fff';
 for(let i=0;i<8;i++){c.save();c.translate(i*32,0);
  if(i===0){for(let a=0;a<8;a++){const q=a*Math.PI/4;c.beginPath();c.moveTo(16+Math.cos(q)*4,16+Math.sin(q)*4);c.lineTo(16+Math.cos(q-.12)*15,16+Math.sin(q-.12)*15);c.lineTo(16+Math.cos(q+.12)*15,16+Math.sin(q+.12)*15);c.fill();}}
  else if(i===1){c.lineWidth=2;c.beginPath();c.arc(16,16,13,0,Math.PI*2);c.strokeStyle='#fff';c.stroke();}
  else if(i===2){c.beginPath();c.moveTo(1,26);c.quadraticCurveTo(11,1,30,4);c.quadraticCurveTo(17,8,1,26);c.fill();}
  else if(i===3){c.fillRect(12,3,8,26);c.fillRect(3,12,26,8);c.fillRect(8,8,16,16);}
  else if(i===4){c.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,r=k%2?6:15;c.lineTo(16+Math.cos(a)*r,16+Math.sin(a)*r);}c.closePath();c.fill();}
  else if(i===5){c.fillRect(9,3,14,26);c.clearRect(9,3,4,5);c.clearRect(19,24,4,5);}
  else if(i===6){c.beginPath();c.moveTo(13,2);c.lineTo(21,14);c.lineTo(18,29);c.lineTo(10,25);c.lineTo(7,16);c.closePath();c.fill();}
  else{c.globalAlpha=.5;c.fillRect(4,14,24,4);c.globalAlpha=1;c.fillRect(10,14,18,4);}
 c.restore();}
 });}
function state(){let s=states.get(W.group);if(!s){s={batch:new ParticleBatch(W.group,'action',224,spriteAtlas()),time:0,trail:0,last:new THREE.Vector3(),ready:false};states.set(W.group,s);}return s;}
function add(s,p,color,tile,life,size,vx=0,vy=0,vz=0,stretch=1){s.batch.spawn({x:p.x,y:p.y,z:p.z,color,tile,life,size,scale:size,alpha:1,vx,vy,vz,g:tile===5?4:1.5,rz:Math.random()*Math.PI*2,spin:(Math.random()-.5)*7,stretch});}
export function actionEffect(kind,p,power=1,color=null){if(!W.group||!p)return;const listener=W.player?.pos;if(listener&&Math.hypot(p.x-listener.x,p.z-listener.z)>34)return;const s=state(),success=kind==='success'||kind==='pickup',c=color??(success?0xc7ef94:kind==='glass'?0xb5e6ff:0xffdb9a),k=Math.min(1.7,Math.max(.25,power));
 add(s,p,c,success?4:0,.24,.52*k);add(s,p,c,1,.38,.4*k);if(kind==='hit'||kind==='metal')add(s,p,0xfff0c6,2,.22,.75*k);
 const count=Math.round((success?12:8)*k*graphics.current.particles);for(let i=0;i<count;i++){const a=i/count*Math.PI*2,sp=(1.4+Math.random()*2.8)*k;add(s,p,i%3?c:0xffffff,success?5:kind==='glass'?6:7,.28+Math.random()*.35,(success?.07:.035)+Math.random()*.065,Math.cos(a)*sp,(success?2:1.2)+Math.random()*2,Math.sin(a)*sp,success?1:2.2);}
 if(success||kind==='land')ripple(p.x,p.y-.15,p.z,.45*k,.4,c);
}
export function updateActionEffects(dt,player=null,camera=null){if(!W.group)return;let s=states.get(W.group);const speed=player?Math.hypot(player.vel.x,player.vel.z):0;
 if(player&&speed>8&&player.onGround&&!player.stationaryWork){s??=state();s.trail-=dt;if(s.trail<=0){s.trail=.07/graphics.current.particles;const p=player.pos;smoke(p.x,p.y+.08,p.z,{dust:true,size:.045,grow:.08,vx:-player.vel.x*.1,vz:-player.vel.z*.1,vy:.5,g:3,life:.24,color:0xa798ad});add(s,{x:p.x,y:p.y+.30,z:p.z},0xcec5db,7,.16,.035,-player.vel.x*.25,.1,-player.vel.z*.25,3);}}
 if(!s)return;if(player&&speed>9&&!s.wasFast)sfx('dash',{at:player.pos,v:.55});s.wasFast=speed>8;let dirty=false;for(const p of s.batch.records){if(!p.alive)continue;dirty=true;p.t+=dt;const k=p.t/p.life;if(k>=1){p.alive=false;continue;}p.vy-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rz+=p.spin*dt;p.scale=p.size*(p.tile===1?1+k*3:1-k*.45);p.sx=p.scale;p.sy=p.scale*(p.stretch||1);p.sz=p.scale;p.alpha=(1-k)**1.35;}
 if(dirty)s.batch.sync();
}
export function actionStats(){const s=states.get(W.group);return s?{alive:s.batch.records.filter(p=>p.alive).length,capacity:s.batch.capacity,draws:s.batch.mesh.visible?1:0}:{alive:0,capacity:224,draws:0};}
