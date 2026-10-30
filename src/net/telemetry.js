// Lightweight client-side online diagnostics; never sent through the room relay.
// Sequence gaps are *missing state numbers*, NOT UDP packet loss (WebSocket is ordered).
const percentile=(values,p)=>{if(!values.length)return 0;const q=values.slice().sort((a,b)=>a-b);return q[Math.min(q.length-1,Math.floor((q.length-1)*p))];};
class Ring {
 constructor(cap=96){this.cap=cap;this.buf=new Array(cap);this.i=0;this.n=0;}
 add(x){if(!Number.isFinite(x))return;this.buf[this.i]=x;this.i=(this.i+1)%this.cap;this.n=Math.min(this.cap,this.n+1);}
 values(){return this.buf.slice(0,this.n);}
 p95(){return percentile(this.values(),.95);}
 p50(){return percentile(this.values(),.5);}
 reset(){this.i=0;this.n=0;}
}
const clamp=(v,max)=>Math.max(0,Math.min(max,v));
export class OnlineTelemetry {
 constructor(){this.reset();}
 reset(){
  this.pings=new Ring(36);this.jitter=new Ring(36);this.queue=new Ring(96);
  this.frames=new Ring(120);this.visual=new Ring(96);this.decode=new Ring(96);
  this.worldRows=new Ring(32);this.streams=new Map();this.history=[];
  this.skippedStates=0;this.gaps=0;this.repeats=0;this.invalid=0;
  this.framesOver50=0;this.framesOver120=0;this.lastPing=null;
  this.lastStateAt=0;this.lastWorldAt=0;this.lastFrameAt=0;
  this.lastQueue=0;this.lastSnapshot=0;this.lastCheck=0;this.strikes=new Map();
  this.peerMax=0;this.enabled=true;
 }
 ping(rtt){if(!Number.isFinite(rtt)||rtt<0)return;this.pings.add(clamp(rtt,30000));if(this.lastPing!==null)this.jitter.add(clamp(Math.abs(rtt-this.lastPing),30000));this.lastPing=rtt;}
 outgoing(queue,skipped=false){if(!Number.isFinite(queue))return;this.queue.add(clamp(queue,1048576));this.lastQueue=queue;if(skipped)this.skippedStates++;}
 incoming(bytes,ms){if(Number.isFinite(ms))this.decode.add(clamp(ms,1000));}
 state(sender,scene,sequence,now=performance.now(),epoch=''){
  if(!Number.isSafeInteger(sequence)||sequence<1||sequence>2147483647||!Number.isSafeInteger(sender)||sender<1)return;
  const key=scene+':'+epoch+':'+sender;
  let p=this.streams.get(key);
  if(!p){p={seq:0,at:0};this.streams.set(key,p);}
  if(sequence===1&&p.seq>10){p.seq=0;p.at=0;} // explicit new local stream
  if(sequence<=p.seq){this.repeats++;return;}
  if(p.seq&&sequence>p.seq+1)this.gaps+=Math.min(1000,sequence-p.seq-1);
  p.seq=sequence;p.at=now;this.lastStateAt=now;
  if(this.streams.size>36){const first=this.streams.keys().next().value;this.streams.delete(first);}
 }
 world(rev,rows,ms,now=performance.now()){
  if(!Number.isFinite(rev)||rev<=0)return;
  this.lastWorldAt=now;this.worldRows.add(clamp(rows||0,100000));
  this.incoming(0,ms);
 }
 frame(ms,visible=true,now=performance.now()){
  if(!visible||!Number.isFinite(ms)||ms<=0||ms>5000)return;
  this.frames.add(ms);this.lastFrameAt=now;
  if(ms>50)this.framesOver50++;
  if(ms>120)this.framesOver120++;
 }
 visualError(distance){if(Number.isFinite(distance)&&distance>=0)this.visual.add(clamp(distance,1000));}
 issue(kind,description,now=performance.now()){
  const last=this.history.at(-1);
  if(last?.kind===kind&&now-last.time<10000){last.count++;last.time=now;return;}
  this.history.push({kind,description,time:now,count:1});
  if(this.history.length>20)this.history.shift();
 }
 assess(now=performance.now(),online=true,visible=true){
  if(now-this.lastCheck<1000)return [];
  this.lastCheck=now;
  if(!online||!visible){this.strikes.clear();return [];}
  const age=this.lastStateAt?now-this.lastStateAt:0;
  const candidates=[
    ['queue',this.queue.n>=8&&this.queue.p95()>24576,'WebSocket очередь >24 КБ'],
    ['rtt',this.pings.n>=5&&this.pings.p95()>250,'RTT p95 >250 мс'],
    ['jitter',this.jitter.n>=5&&this.jitter.p95()>90,'скачки RTT p95 >90 мс'],
    ['frame',this.frames.n>=50&&this.frames.p95()>55,'5% кадров дольше 55 мс'],
    ['snapshot',this.lastWorldAt>0&&now-this.lastWorldAt>1800,'нет снимков мира >1.8 с'],
    ['state',this.lastStateAt>0&&age>1400,'нет новых сетевых состояний >1.4 с']
  ];
  const raised=[];
  for(const [kind,active,description] of candidates){
    const n=active?(this.strikes.get(kind)||0)+1:0;this.strikes.set(kind,n);
    if(n===3){this.issue(kind,description,now);raised.push(kind);}
  }
  return raised;
 }
 snapshot(now=performance.now()){
  return {
   rttP50:Math.round(this.pings.p50()),rttP95:Math.round(this.pings.p95()),jitterP95:Math.round(this.jitter.p95()),
   queueP95:Math.round(this.queue.p95()),queueNow:Math.round(this.lastQueue),
   frameP95:+this.frames.p95().toFixed(1),frameOver50:this.framesOver50,frameOver120:this.framesOver120,
   visualP95:+this.visual.p95().toFixed(2),decodeP95:+this.decode.p95().toFixed(2),worldRowsP95:Math.round(this.worldRows.p95()),
   streamGaps:this.gaps,reordered:this.repeats,skippedStates:this.skippedStates,
   stateAgeMs:this.lastStateAt?Math.round(now-this.lastStateAt):null,
   worldAgeMs:this.lastWorldAt?Math.round(now-this.lastWorldAt):null,
   issues:this.history.slice(-6).map(({kind,description,count})=>({kind,description,count}))
  };
 }
}
export const telemetry=new OnlineTelemetry();
export function diagnosticsText(now=performance.now()){
 const s=telemetry.snapshot(now);
 return 'RTT p50/p95 '+s.rttP50+'/'+s.rttP95+' мс · jitter p95 '+s.jitterP95+' мс\n'+
  'WebSocket очередь p95 '+(s.queueP95/1024).toFixed(1)+' КБ · локально пропущено '+s.skippedStates+'\n'+
  'Пропуски seq '+s.streamGaps+' (не потери TCP) · дубликаты '+s.reordered+'\n'+
  'Кадры p95 '+s.frameP95+' мс · >50/120 мс '+s.frameOver50+'/'+s.frameOver120+'\n'+
  'Отклонение объектов p95 '+s.visualP95+' м · обработка пакета p95 '+s.decodeP95+' мс\n'+
  'Возраст состояния/мира '+(s.stateAgeMs??'-')+'/'+(s.worldAgeMs??'-')+' мс\n'+
  'Диагностика: '+(s.issues.at(-1)?.description||'аномалий не выявлено')+'\n';
}
