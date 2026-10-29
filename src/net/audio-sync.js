import { W } from '../world/state.js';
import { sfx, hasSound, setSoundRouter, SFX_FROM } from '../core/sfx.js';
import { NET, inRoom } from './net.js';
const queues=new WeakMap();let serial=0;
const local=name=>/^(step|jump|land|dive|roll|bounce|mantle|throw|pickup|drop|grind|emote_.*|frog_.*)$/.test(name);
const state=()=>{let q=queues.get(W);if(!q){q={out:[],seen:new Set()};queues.set(W,q);}return q;};
const key=e=>e.id+':'+e.n;
function remember(e){const q=state(),k=key(e);if(q.seen.has(k))return false;q.seen.add(k);if(q.seen.size>512)q.seen.delete(q.seen.values().next().value);return true;}
function enqueue(e){const q=state();if(q.out.length<48)q.out.push(e);}
export function initSoundSync(){setSoundRouter((name,o)=>{
  if(o.remote)return o;
  if(!inRoom()||!W.net)return o;
  if(W.net.applying)return false;
  const own=SFX_FROM.owner===W.player?.netKey;
  const inferred=!o.at&&local(name),at=o.at||(inferred?W.player?.pos:null);
  if(!at)return o;
  const mine=inferred||own||local(name)&&at===W.player?.pos;
  if(W.net.host||mine){
    const e={id:NET.id,n:++serial,name,p:[at.x,at.y,at.z],v:o.v??1,range:o.range,surf:o.surf,k:o.k,skip:mine?NET.id:null};
    if(remember(e))enqueue(e);
  }
  if(W.net.replica&&!mine)return false;
  return {...o,at};
});}
export const takeSounds=()=>state().out.splice(0,16);
export function retrySounds(rows){if(rows?.length)state().out.unshift(...rows);}
// Ввод гостя подтверждает ведущий. Через комнату передаются названия/координаты, а не аудиозапись.
export function receiveSounds(rows,actor=null){
  for(const e of (rows||[]).slice(0,16)){
    if(!e||!Number.isInteger(e.id)||!Number.isInteger(e.n)||!hasSound(String(e.name||''))||!Array.isArray(e.p)||e.p.length!==3||!e.p.every(n=>Number.isFinite(n)&&Math.abs(n)<3000)||!Number.isFinite(e.v)||e.v<0||e.v>2)continue;
    if(actor&&(e.id!==actor.id&&'p'+e.id!==actor.netKey||Math.hypot(e.p[0]-actor.pos.x,e.p[1]-actor.pos.y,e.p[2]-actor.pos.z)>5))continue;
    if(!remember(e))continue;
    if(actor)enqueue(e);
    if(e.skip===NET.id)continue;
    sfx(e.name,{remote:true,at:{x:e.p[0],y:e.p[1],z:e.p[2]},v:e.v,range:Number.isFinite(e.range)?Math.max(1,Math.min(400,e.range)):undefined,surf:e.surf,k:Number.isInteger(e.k)?e.k:undefined});
  }
}
