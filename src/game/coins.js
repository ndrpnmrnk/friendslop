import { random } from '../core/random.js';
import {THREE,G,V3} from '../core/gfx.js';
import {W} from '../world/state.js';
import {groundAt,isFree,moveBody,raySolids,pushOut} from '../world/physics.js';
import {addCoins,collection} from './collection.js';
import {actors} from './actors.js';
import {sfx} from '../core/sfx.js';
import {fistModel,FIST_SHINE} from './fist-model.js';
import {COIN_CAP,coinRow,validateCoinSnapshot} from '../net/coin-protocol.js';
const CAP=COIN_CAP,zero=new THREE.Matrix4().makeScale(0,0,0),tmp=new THREE.Object3D(),ray=new V3(),states=new WeakMap();
const current=()=>{let s=states.get(W.group);if(!s){s={coins:[],batches:[],outlines:[],nextId:1,age:0,uiT:0,probe:0,spark:null};states.set(W.group,s);}return s;};
export function resetCoins(enabled=true,scatter=true){const s={coins:[],batches:[],outlines:[],nextId:1,age:0,uiT:0,probe:0,spark:null};states.set(W.group,s);W.coinLoot=null;if(!enabled)return;
 const gold=new THREE.MeshBasicMaterial({color:0xffd84f,side:THREE.BackSide,depthWrite:false,fog:false});W.mapResources?.add(gold);
 for(const m of fistModel().children){for(const outline of[false,true]){const im=new THREE.InstancedMesh(m.geometry,outline?gold:m.material,CAP);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.frustumCulled=false;im.count=CAP;for(let i=0;i<CAP;i++)im.setMatrixAt(i,zero);W.group.add(im);W.keep.push(im);W.mapResources.add(im);(outline?s.outlines:s.batches).push(im);}}
 s.spark=new THREE.InstancedMesh(G.box,new THREE.MeshBasicMaterial({color:0xffedb4,fog:false}),CAP*2);s.spark.frustumCulled=false;for(let i=0;i<CAP*2;i++)s.spark.setMatrixAt(i,zero);W.mapResources?.add(s.spark.material);W.group.add(s.spark);W.keep.push(s.spark);W.mapResources.add(s.spark);
 // Only the authoritative host scatters loot in online matches.
 if(!scatter||W.net?.replica)return;
 const surfaces=W.solids.filter(q=>q.on!==false&&q.y1>=-5&&q.y1<40&&q.x1-q.x0>.8&&q.z1-q.z0>.8),wanted=9+(random()*14|0);
 for(let tries=0;tries<300&&s.coins.length<wanted;tries++){const q=surfaces[random()*surfaces.length|0];if(!q)break;const x=q.x0+.3+random()*(q.x1-q.x0-.6),z=q.z0+.3+random()*(q.z1-q.z0-.6),y=groundAt(x,z,.16,q.y1+.12);if(y<-5||Math.abs(x)>W.bounds-1||Math.abs(z)>W.bounds-1||Math.abs(y-q.y1)>.2||!isFree(x-.3,z-.3,x+.3,z+.3,y+.06,y+.9)||s.coins.some(c=>Math.hypot(c.pos.x-x,c.pos.z-z)<2))continue;spawnCoin(x,y,z,false);}
 for(const p of W.breakables)if(p.kind==='crate')p.coinCount=random()<.24?1+(random()<.18?1:0):0;
 W.coinLoot=(p,source)=>{if(source?.coinLooted)return;if(source)source.coinLooted=true;if(random()<.30)spawnCoin(p.x,p.y+.2,p.z,true);};
}
export function spawnCoin(x,y,z,fly=true,id=null,fromNetwork=false){
 if(W.net?.replica&&!fromNetwork)return null;
 if(![x,y,z].every(Number.isFinite))return null;
 const s=current();if(!s.batches.length)return null;
 let i=s.coins.findIndex(c=>c.gone);
 if(i<0){if(s.coins.length>=CAP)return null;i=s.coins.length;}
 const coinId=id??s.nextId++;
 if(!Number.isSafeInteger(coinId)||coinId<1||coinId>=1000000)return null;
 s.nextId=Math.max(s.nextId,coinId+1);
 s.coins[i]={id:coinId,pos:new V3(x,y,z),vel:new V3(fly?(random()-.5)*1.6:0,fly?2.4:0,fly?(random()-.5)*1.6:0),r:.25,h:.64,step:.015,mass:.35,onGround:!fly,fly,phase:random()*6.28,yaw:random()*6.28,gone:false,take:null,target:null,requested:false};
 return s.coins[i];
}
export function crateCoins(p){if(W.net?.replica)return;for(let n=0;n<(p.coinCount||0);n++)spawnCoin(p.mesh.position.x,p.solid.y0+.25,p.mesh.position.z,true);p.coinCount=0;}
export function coinSnapshot(){return current().coins.filter(c=>!c.gone&&!c.take).map(coinRow);}
function hideCoin(s,i){
 for(const b of [...s.batches,...s.outlines])b.setMatrixAt(i,zero);
 if(s.spark){s.spark.setMatrixAt(i*2,zero);s.spark.setMatrixAt(i*2+1,zero);}
 for(const b of [...s.batches,...s.outlines,s.spark].filter(Boolean))b.instanceMatrix.needsUpdate=true;
}
export function applyCoinSnapshot(rows){
 if(!W.net?.replica||!validateCoinSnapshot(rows))return false;
 const s=current(),active=new Set();
 for(const row of rows){
  const [id,x,y,z,fly]=row;active.add(id);
  let c=s.coins.find(c=>c.id===id&&!c.gone);
  if(!c)c=spawnCoin(x,y,z,false,id,true);
  if(!c)continue;
  c.fly=!!fly;
  if(!c.target)c.target=new V3(x,y,z);else c.target.set(x,y,z);
  if(c.pos.distanceToSquared(c.target)>16)c.pos.copy(c.target);
 }
 for(let i=0;i<s.coins.length;i++){
  const c=s.coins[i];
  if(!c.gone&&!active.has(c.id)){c.gone=true;c.requested=false;hideCoin(s,i);}
 }
 return true;
}
function canTakeCoin(c,a){
 if(!a?.pos||c.gone||c.take||a.drone||a.returning||a.hidden||a.stun>0||a.getT>0)return false;
 if(Math.hypot(a.pos.x-c.pos.x,a.pos.z-c.pos.z)>2.15||c.pos.y<a.pos.y-.4||c.pos.y>a.pos.y+1.9)return false;
 const eye=a.pos.clone().add(new V3(0,.7,0));ray.copy(c.pos).y+=.2;ray.sub(eye);
 const len=ray.length();return len<=.05||raySolids(eye,ray.multiplyScalar(1/len),len)>=len-.12;
}
export function hostTakeCoin(id,actor,onAward){
 if(W.net?.replica||!Number.isSafeInteger(id))return false;
 const s=current(),c=s.coins.find(c=>c.id===id&&!c.gone);
 if(!c||!canTakeCoin(c,actor)||onAward?.(c,actor)===false)return false;
 if(actor===W.player)c.take={actor,t:0,from:c.pos.clone()};
 else{const i=s.coins.indexOf(c);c.gone=true;hideCoin(s,i);}
 actor.throwT=.22;sfx('pickup',{at:c.pos,range:7,v:.5});
 return true;
}
function showGain(){
 const e=document.getElementById('coinGain');
 if(e){e.replaceChildren();for(const [i,ch]of [...'ФИСТ +1'].entries()){const span=document.createElement('span');span.textContent=ch===' '?' ':ch;span.style.setProperty('--i',i);e.appendChild(span);}e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop');}
}
export const showCoinGrant=()=>showGain();
export function nearFist(P){
 if(!P||P.drone||P.returning||P.hidden||P.stun>0||P.getT>0)return null;
 let best=null,bd=1.8;
 for(const c of current().coins){
  if(c.gone||c.take)continue;
  // A denied or delayed pickup request can be attempted again after a short cooldown.
  if(c.requested&&performance.now()-(c.requestedAt||0)<1100)continue;
  c.requested=false;
  const d=Math.hypot(P.pos.x-c.pos.x,P.pos.z-c.pos.z);
  if(d>=bd||c.pos.y<P.pos.y-.3||c.pos.y>P.pos.y+1.7)continue;
  const eye=P.pos.clone().add(new V3(0,.7,0));ray.copy(c.pos).y+=.2;ray.sub(eye);const len=ray.length();
  if(len>.05&&raySolids(eye,ray.multiplyScalar(1/len),len)<len-.12)continue;
  best=c;bd=d;
 }
 return best;
}
export function grabFist(P){
 const c=nearFist(P);if(!c)return false;
 if(W.net){
  if(!W.coinClaim?.(c.id,P))return false;
  if(W.net.replica){c.requested=true;c.requestedAt=performance.now();}
  return true;
 }
 if(!addCoins(1))return false;
 c.take={actor:P,t:0,from:c.pos.clone()};P.throwT=.22;
 sfx('pickup',{at:c.pos,range:7,v:.5});showGain();
 return true;
}
export function updateCoins(dt,P){const s=current();s.age+=dt;FIST_SHINE.value=s.age;s.probe-=dt;const check=s.probe<=0;if(check)s.probe=.4;
 for(let i=0;i<s.coins.length;i++){const c=s.coins[i];if(c.gone)continue;let scale=1;
  if(c.take){c.take.t+=dt;const k=Math.min(1,c.take.t/.32),a=c.take.actor;a.root.updateMatrixWorld(true);if(c.take.t<.13){const reach=a.root.worldToLocal(c.take.from.clone().add(new V3(0,.3,0)));a.ch.handR.position.lerp(reach,1-Math.exp(-dt*24));a.root.updateMatrixWorld(true);}const hand=a.ch.handR.getWorldPosition(new V3());c.pos.lerpVectors(c.take.from,hand,k*k*(3-2*k));scale=1-k*.9;if(k>=1){c.gone=true;for(const b of[...s.batches,...s.outlines])b.setMatrixAt(i,zero);s.spark.setMatrixAt(i*2,zero);s.spark.setMatrixAt(i*2+1,zero);continue;}}
  else if(W.net?.replica){if(c.target)c.pos.lerp(c.target,1-Math.exp(-Math.min(.05,dt)*16));}
  else{const old=c.pos.clone();if(pushOut(c.pos,c.r,c.pos.y+.01,c.pos.y+c.h)){c.fly=true;c.vel.x+=THREE.MathUtils.clamp((c.pos.x-old.x)/Math.max(dt,.001),-6,6);c.vel.z+=THREE.MathUtils.clamp((c.pos.z-old.z)/Math.max(dt,.001),-6,6);}
   for(const a of actors()){if(a.drone||a.returning||a.hidden||a.pos.y>c.pos.y+.6||a.pos.y+a.h<c.pos.y)continue;const dx=c.pos.x-a.pos.x,dz=c.pos.z-a.pos.z,d=Math.hypot(dx,dz),over=c.r+a.r-d;if(over>0&&d>.001){const nx=dx/d,nz=dz/d;c.pos.x+=nx*over;c.pos.z+=nz*over;const speed=Math.max(.5,a.vel.x*nx+a.vel.z*nz);c.vel.x+=nx*speed*.7;c.vel.z+=nz*speed*.7;c.fly=true;}}
   for(const it of W.items){if(!['rest','fly'].includes(it.state)||Math.abs(it.pos.y-c.pos.y-.25)>.5)continue;const dx=c.pos.x-it.pos.x,dz=c.pos.z-it.pos.z,d=Math.hypot(dx,dz),over=c.r+it.def.r-d;if(over>0&&d>.001){c.pos.x+=dx/d*over;c.pos.z+=dz/d*over;c.vel.x+=it.vel.x*.5;c.vel.z+=it.vel.z*.5;c.fly=true;}}
   for(let j=0;j<i;j++){const b=s.coins[j];if(b.gone||b.take||Math.abs(b.pos.y-c.pos.y)>.5)continue;const dx=c.pos.x-b.pos.x,dz=c.pos.z-b.pos.z,d=Math.hypot(dx,dz);if(d>.001&&d<.5){const k=(.5-d)/2/d;c.pos.x+=dx*k;c.pos.z+=dz*k;b.pos.x-=dx*k;b.pos.z-=dz*k;c.fly=b.fly=true;}}
   if(check&&!c.fly&&groundAt(c.pos.x,c.pos.z,.15,c.pos.y+.05)<c.pos.y-.1){c.fly=true;c.onGround=false;}if(c.fly){moveBody(c,dt);c.vel.x*=Math.exp(-dt*5);c.vel.z*=Math.exp(-dt*5);c.yaw+=dt*c.vel.length()*.4;if(c.onGround)c.fly=false;}}
  tmp.position.copy(c.pos);tmp.position.y+=.055*scale;tmp.rotation.set(0,c.yaw,0);tmp.scale.setScalar(scale);tmp.updateMatrix();for(const b of s.batches)b.setMatrixAt(i,tmp.matrix);
  const near=P&&!P.drone&&!P.returning&&!c.take&&c.pos.distanceTo(P.pos)<2.6;tmp.scale.setScalar(scale*1.10);tmp.updateMatrix();for(const b of s.outlines)b.setMatrixAt(i,near?tmp.matrix:zero);
  const shine=Math.max(0,Math.sin(s.age*2.1+c.phase))**12;tmp.position.copy(c.pos).add(new V3(.18,.45,.18));tmp.rotation.set(0,0,s.age*.5);tmp.scale.set(.024*shine,.14*shine,.024*shine);tmp.updateMatrix();s.spark.setMatrixAt(i*2,c.take?zero:tmp.matrix);tmp.scale.set(.10*shine,.024*shine,.024*shine);tmp.updateMatrix();s.spark.setMatrixAt(i*2+1,c.take?zero:tmp.matrix);

 }
 for(const b of[...s.batches,...s.outlines,s.spark].filter(Boolean))b.instanceMatrix.needsUpdate=true;s.uiT-=dt;if(s.uiT<=0){s.uiT=.2;for(const id of['coinTotal','menuCoins']){const e=document.getElementById(id);if(e)e.textContent=collection().coins;}}
}
export const coinState=()=>current().coins;
