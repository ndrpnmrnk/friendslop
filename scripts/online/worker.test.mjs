import test from 'node:test';
import assert from 'node:assert/strict';
const URL=process.env.ROOMS_TEST_URL||'ws://127.0.0.1:8787/ws';
function connect(code,token,create=false,ver='test-v2'){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(URL+'?room='+code),messages=[],waiters=[];
  const client={ws,messages,send:m=>ws.send(JSON.stringify(m)),
   next:pred=>new Promise((res,rej)=>{const hit=messages.find(pred);if(hit)return res(hit);const q={pred,res};waiters.push(q);const t=setTimeout(()=>rej(Error('message timeout')),4000);q.res=m=>{clearTimeout(t);res(m);};})};
  ws.addEventListener('open',()=>client.send({t:'hello',name:token,token,create,ver,skin:'cat'}));
  ws.addEventListener('error',reject,{once:true});
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);messages.push(m);for(const q of waiters.slice())if(q.pred(m)){waiters.splice(waiters.indexOf(q),1);q.res(m);}if(m.t==='welcome'||m.t==='err'){client.welcome=m;resolve(client);}});
 });
}
test('actual local Durable Object: authority, routing, version, reconnect identity, legacy compatibility',async()=>{
 const chars='ABCDEFGHJKLMNPQRSTUVWXYZ',code=Array.from({length:4},()=>chars[Math.random()*chars.length|0]).join('');
 const h=await connect(code,'host-test-token',true),g=await connect(code,'guest-test-token'),o=await connect(code,'observer-test-token');
 try{
  assert(h.welcome.host);assert(!g.welcome.host);const id=g.welcome.id;
  const bad=await connect(code,'different-version',false,'wrong');assert.equal(bad.welcome.e,'ver');bad.ws.close();
  g.send({t:'st',protocol:2,m:'match',ep:1,n:1,x:1,y:0,z:0});
  const input=await h.next(m=>m.t==='st'&&m.n===1);assert.equal(input.id,id);
  g.send({t:'ev',e:'final',ep:1,rows:[]});
  g.send({t:'ev',e:'cmd',ep:1,kind:'claim',mid:5});await h.next(m=>m.e==='cmd'&&m.mid===5);
  h.send({t:'ev',e:'final',ep:1,rows:[{score:10}]});await o.next(m=>m.e==='final'&&m.rows?.[0]?.score===10);
  assert(!o.messages.some(m=>m.t==='st'&&m.protocol===2));assert(!h.messages.some(m=>m.e==='final'));
  // v0.60.2 still relays its legacy player states and hit events.
  g.send({t:'st',m:'match',n:909,x:2});await o.next(m=>m.n===909);
  g.send({t:'ev',e:'hit',to:'p'+h.welcome.id,k:'daze',a:[1]});await h.next(m=>m.e==='hit');
  g.ws.close();await new Promise(r=>setTimeout(r,150));
  const back=await connect(code,'guest-test-token');assert.equal(back.welcome.id,id);back.ws.close(1000,'leave');
 }finally{o.ws.close(1000,'leave');h.ws.close(1000,'leave');g.ws.close();}
});
