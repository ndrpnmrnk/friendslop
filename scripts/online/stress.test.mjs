// Local Miniflare room relay stress. Real WebSockets and the real Durable Object,
// not simulated clients. Local timing is not a WAN ping / GPU benchmark.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {motionIntervalFor,worldIntervalFor} from '../../src/net/cadence.js';

const target=process.env.ROOMS_TEST_URL||'ws://127.0.0.1:8788/ws';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const wait=async(check,timeout=4000)=>{
 const end=performance.now()+timeout;
 while(performance.now()<end){if(check())return;await sleep(15);}
 throw new Error('timed out waiting for relay packets');
};
const p95=items=>items.sort((a,b)=>a-b)[Math.floor((items.length-1)*.95)]||0;
let runNo=0;
function makeClient(code,identity,host){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(target+'?room='+code),seen=[],timings=[];
  let resolved=false;
  const timer=setTimeout(()=>{if(!resolved){try{ws.close();}catch{}reject(Error('join timeout'));}},5000);
  const c={ws,seen,timings,bufferMax:0,bytes:0,send:m=>{
   const raw=JSON.stringify(m);c.bufferMax=Math.max(c.bufferMax,ws.bufferedAmount);ws.send(raw);c.bytes+=Buffer.byteLength(raw);
  }};
  ws.addEventListener('open',()=>c.send({t:'hello',token:identity,name:identity,skin:'cat',ver:'stress-v0613',create:host,migrate:true}));
  ws.addEventListener('error',e=>{if(!resolved){clearTimeout(timer);reject(e.error||Error('socket error'));}});
  ws.addEventListener('message',e=>{
   let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.t==='welcome'){c.id=m.id;c.host=m.host;if(!resolved){resolved=true;clearTimeout(timer);resolve(c);}}
   if(m.t==='err'&&!resolved){resolved=true;clearTimeout(timer);reject(Error('room error '+m.e));}
   if(m.t==='st'&&m.protocol===2&&m.ep===6677){
    c.seen.push(m);
    if(Number.isFinite(m.tm))c.timings.push(Math.max(0,performance.now()-m.tm));
   }
  });
 });
}
for(const size of [2,4,6,8]){
 test('local worker throughput - '+size+' concurrent players (host fan-out and guest uplinks)',{timeout:30000},async()=>{
  const code='T'+(++runNo)+'R'+size+'26',clients=[];
  try{
   for(let i=0;i<size;i++)clients.push(await makeClient(code,'stress-'+size+'-'+i,i===0));
   const host=clients[0],frames=18,delay=Math.ceil(1000*motionIntervalFor(size));
   const worldEvery=Math.max(1,Math.round(1000/delay*(worldIntervalFor(size))));
   const start=performance.now();
   for(let n=1;n<=frames;n++){
    const stamp=performance.now();
    const pm=Array.from({length:8},(_,j)=>['p:'+j,j+n*.15,0,j,.2,0,0,0,0,0]);
    const state={t:'st',m:'match',protocol:2,ep:6677,n,tm:stamp,x:n*.15,y:0,z:0,r:0,s:{speed:1},pm,
     ...(n%worldEvery===1?{w:{d:{rev:n,full:n===1,rows:[['p:0',[0,n,0,0]]]},missions:[],coins:[],events:[],time:100-n}}:{})};
    host.send(state);
    for(let j=1;j<size;j++)clients[j].send({t:'st',m:'match',protocol:2,ep:6677,n:1000*j+n,tm:stamp,x:j+n*.15,y:0,z:0,r:0,s:{speed:1}});
    await sleep(delay);
   }
   const expectedHost=frames*(size-1),expectedGuest=frames;
   await wait(()=>host.seen.length>=expectedHost&&clients.slice(1).every(c=>c.seen.length>=expectedGuest));
   assert.equal(host.seen.length,expectedHost,'all guest inputs reach the host exactly once');
   for(const guest of clients.slice(1)){
    assert.equal(guest.seen.length,expectedGuest,'all host snapshots reach every guest exactly once');
    assert(guest.seen.every(m=>m.id===host.id),'guests cannot receive each other direct state');
   }
   assert(host.seen.every(m=>m.id!==host.id));
   const elapsed=(performance.now()-start)/1000;
   const samples=clients.flatMap(c=>c.timings),q=p95(samples);
   const maxBuffered=Math.max(...clients.map(c=>c.bufferMax));
   const sent=clients.reduce((sum,c)=>sum+c.bytes,0);
   assert(Number.isFinite(q)&&samples.length>=frames*(size-1));
   assert(maxBuffered<32768,'local generated input does not build an unbounded WebSocket send queue');
   console.log(JSON.stringify({players:size,seconds:+elapsed.toFixed(2),sentPackets:frames*size,receivedPackets:clients.reduce((s,c)=>s+c.seen.length,0),
    p95LocalRelayMs:+q.toFixed(1),bytesUp:sent,maxBufferedBytes:maxBuffered,hostRx:host.seen.length,clientHz:+(frames/elapsed).toFixed(1)}));
  }finally{for(const c of clients)try{c.ws.close(1000,'stress complete');}catch{}}
 });
}
