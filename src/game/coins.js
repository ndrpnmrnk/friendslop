import {THREE,G,V3,compose,tmat,col} from '../core/gfx.js';
import {pix} from '../core/textures.js';
import {W} from '../world/state.js';
import {groundAt,isFree,moveBody,raySolids} from '../world/physics.js';
import {addCoins,collection} from './collection.js';
import {sfx} from '../core/sfx.js';
const CAP=96,up=new V3(0,1,0),zero=new THREE.Matrix4().makeScale(0,0,0),tmp=new THREE.Object3D(),ray=new V3();
let coins=[],batches=[],age=0,uiT=0,supportT=0;
function model(){return compose('coin38',a=>{const texture=pix('coin38',16,16,g=>{g.fillStyle='#b58437';g.fillRect(0,0,16,16);g.fillStyle='#f3d576';g.fillRect(2,2,12,12);g.fillStyle='#d7a64a';g.fillRect(4,4,8,8);g.fillStyle='#fff0a2';g.fillRect(7,4,2,8);g.fillRect(5,6,6,2);});a(G.cyl8,tmat(texture),0,0,0,.17,.045,.17,Math.PI/2);a(G.torus,col(0xf0c966),0,0,.026,.139,.139,.015);});}
export function resetCoins(enabled=true){coins=[];batches=[];age=uiT=0;W.coinLoot=null;if(!enabled)return;
 const source=model();for(const m of source.children){const im=new THREE.InstancedMesh(m.geometry,m.material,CAP);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.frustumCulled=false;im.castShadow=false;for(let i=0;i<CAP;i++)im.setMatrixAt(i,zero);W.group.add(im);W.keep.push(im);batches.push(im);}
 const surfaces=W.solids.filter(s=>s.on!==false&&s.y1>=-5&&s.y1<40&&s.x1-s.x0>.8&&s.z1-s.z0>.8),wanted=9+(Math.random()*14|0);
 for(let tries=0;tries<300&&coins.length<wanted;tries++){const s=surfaces[Math.random()*surfaces.length|0];if(!s)break;const x=s.x0+.3+Math.random()*(s.x1-s.x0-.6),z=s.z0+.3+Math.random()*(s.z1-s.z0-.6),y=groundAt(x,z,.14,s.y1+.12);
  if(y< -5||Math.abs(x)>W.bounds-1||Math.abs(z)>W.bounds-1||Math.abs(y-s.y1)>.2||!isFree(x-.25,z-.25,x+.25,z+.25,y+.06,y+.9)||coins.some(c=>Math.hypot(c.pos.x-x,c.pos.z-z)<2))continue;spawnCoin(x,y+.24,z,false);}
 for(const p of W.breakables)if(p.kind==='crate')p.coinCount=Math.random()<.24?1+(Math.random()<.18?1:0):0;
 W.coinLoot=(p,source)=>{if(source?.coinLooted)return;if(source)source.coinLooted=true;if(Math.random()<.30)spawnCoin(p.x,p.y+.25,p.z,true);};
}
export function spawnCoin(x,y,z,fly=true){if(!batches.length)return;let i=coins.findIndex(c=>c.gone);if(i<0){if(coins.length>=CAP)return;i=coins.length;}const c={pos:new V3(x,y,z),vel:new V3(fly?(Math.random()-.5)*1.6:0,fly?2.4:0,fly?(Math.random()-.5)*1.6:0),r:.12,h:.19,step:.16,onGround:!fly,fly,phase:Math.random()*6.28,gone:false};coins[i]=c;}
export function crateCoins(p){for(let n=0;n<(p.coinCount||0);n++)spawnCoin(p.mesh.position.x,p.solid.y0+.25,p.mesh.position.z,true);p.coinCount=0;}
export function updateCoins(dt,P){age+=dt;supportT-=dt;const check=supportT<=0;if(check)supportT=.4;const picked=[];for(let i=0;i<coins.length;i++){const c=coins[i];if(c.gone)continue;if(check&&!c.fly&&groundAt(c.pos.x,c.pos.z,.12,c.pos.y-.1)<c.pos.y-.35){c.fly=true;c.onGround=false;c.vel.set(0,0,0);}if(c.fly){moveBody(c,dt);c.vel.x*=Math.exp(-dt*5);c.vel.z*=Math.exp(-dt*5);if(c.onGround){c.fly=false;c.pos.y+=.22;}}
  if(P&&!P.drone&&!P.returning&&!P.hidden&&Math.hypot(P.pos.x-c.pos.x,P.pos.z-c.pos.z)<.85&&c.pos.y>P.pos.y-.15&&c.pos.y<P.pos.y+1.7){const eye=P.pos.clone().addScaledVector(up,.65);ray.subVectors(c.pos,eye);const len=ray.length();if(len<.05||raySolids(eye,ray.multiplyScalar(1/len),len)>=len-.1)picked.push(i);}
  tmp.position.copy(c.pos);tmp.position.y+=Math.sin(age*2+c.phase)*.045;tmp.rotation.set(0,age*1.5+c.phase,0);tmp.scale.setScalar(1);tmp.updateMatrix();for(const b of batches)b.setMatrixAt(i,tmp.matrix);
 }if(picked.length&&addCoins(picked.length)){for(const i of picked){coins[i].gone=true;for(const b of batches)b.setMatrixAt(i,zero);}sfx('pickup',{at:coins[picked[0]].pos,range:7,v:.5});const pop=document.getElementById('coinGain');if(pop){pop.textContent='+'+picked.length;pop.classList.remove('pop');void pop.offsetWidth;pop.classList.add('pop');}}
 for(const b of batches)b.instanceMatrix.needsUpdate=true;uiT-=dt;if(uiT<=0){uiT=.2;const el=document.getElementById('coinTotal');if(el)el.textContent=collection().coins;}}
export const coinState=()=>coins;
