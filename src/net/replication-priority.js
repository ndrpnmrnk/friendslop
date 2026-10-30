// v0.60.17 - shared room interest selection. Host broadcasts ONE state to everyone.
// Never tailor a shared snapshot only to host position: guest-visible objects matter.
const distance=(o,viewers)=>{
 if(!Array.isArray(viewers)||!viewers.length)return 0; // legacy and reconnect safety
 let best=Infinity;
 for(const p of viewers){
  const at=p?.pos||p;
  if(!Number.isFinite(at?.x)||!Number.isFinite(at?.z))continue;
  const dx=(o?.x??o?.pos?.x??0)-at.x,dz=(o?.z??o?.pos?.z??0)-at.z;
  best=Math.min(best,Math.hypot(dx,dz));
 }
 return Number.isFinite(best)?best:0;
};
export function replicationTier(o,viewers=[]){
 if(!o)return 'high';
 const kind=o.kind||o.type||'';
 if(o.rider||o.grabbed||o.owner&&o.state==='held'||o.netScope?.startsWith('m')||o.mission||o.state==='held'||
    kind==='voteBall'||kind==='football'||kind==='ball')return 'high';
 const d=distance(o,viewers);
 if(d<=20)return 'high';
 if(d<=48)return 'medium';
 return 'far';
}
// These apply ONLY to noncritical continuous movement. Changes to who owns
// an object / where a mission item lives are always sent immediately.
export function movementIntervalMs(tier,queued=0){
 const slow=queued>24576?2:queued>8192?1.5:1;
 if(tier==='high')return 0;
 return Math.round((tier==='medium'?180:600)*slow);
}
export function criticalStateChange(kind,previous,next){
 if(!Array.isArray(previous)||!Array.isArray(next))return true;
 if(kind==='i'){
  // item state, owner, pickup permission, collected, visibility, mission ID,
  // radio controls: NEVER defer any of these transitions.
  return [0,1,11,12,13,14,15,19,20,21].some(i=>JSON.stringify(previous[i])!==JSON.stringify(next[i]));
 }
 if(kind==='p'){
  // type, destroyed/tipped, rider and grab holder changes.
  return [0,10,11,12,13].some(i=>previous[i]!==next[i]);
 }
 return true;
}
export function shouldSendMovement({key,kind,object,previous,next,lastAt=0,now=0,viewers=[],queued=0}){
 if(!previous||criticalStateChange(kind,previous,next))return true;
 const interval=movementIntervalMs(replicationTier(object,viewers),queued);
 return interval===0||lastAt<=0||now-lastAt>=interval;
}
