import test from 'node:test';
import assert from 'node:assert/strict';
const URL=process.env.ROOMS_TEST_URL||'ws://127.0.0.1:8787/ws';
function connect(code,token,create=false,ver='test-v2',migrate=false){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(URL+'?room='+code),messages=[],waiters=[];
  const client={ws,messages,send:m=>ws.send(JSON.stringify(m)),
   next:pred=>new Promise((res,rej)=>{const hit=messages.find(pred);if(hit)return res(hit);const q={pred,res};waiters.push(q);const t=setTimeout(()=>rej(Error('message timeout')),4000);q.res=m=>{clearTimeout(t);res(m);};})};
  ws.addEventListener('open',()=>client.send({t:'hello',name:token,token,create,ver,migrate,skin:'cat'}));
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

test('modern room: hub routing and immediate host migration without closing survivors',async()=>{
 const code='M'+Math.random().toString(36).slice(2,7).toUpperCase();
 const h=await connect(code,'migration-host',true,'modern',true),g=await connect(code,'migration-guest',false,'modern'),o=await connect(code,'migration-observer',false,'modern');
 try{
  g.send({t:'st',m:'hub',protocol:2,n:515});await h.next(m=>m.n===515);
  h.send({t:'st',m:'hub',protocol:2,n:516});await o.next(m=>m.n===516);assert(!o.messages.some(m=>m.n===515));
  h.ws.close(1000,'leave');const promoted=await g.next(m=>m.t==='upd'&&m.p.host);assert.equal(promoted.p.id,g.welcome.id);
  assert(!g.messages.some(m=>m.t==='closed'));o.send({t:'st',m:'match',protocol:2,n:517});await g.next(m=>m.n===517);
  g.ws.close();const next=await o.next(m=>m.t==='upd'&&m.p.host&&m.p.id===o.welcome.id);assert(next);
 }finally{h.ws.close();g.ws.close();o.ws.close(1000,'leave');}
});

test('hub retains its own authority while the room host is playing a match',async()=>{
 const code='S'+Math.random().toString(36).slice(2,7).toUpperCase();
 const h=await connect(code,'split-host',true,'split',true),g=await connect(code,'split-hub',false,'split'),o=await connect(code,'split-newcomer',false,'split');
 try{
  h.send({t:'st',m:'match',protocol:2,n:611});await g.next(m=>m.n===611);
  o.send({t:'st',m:'hub',protocol:2,n:612});await g.next(m=>m.n===612);assert(!h.messages.some(m=>m.n===612));
  g.send({t:'st',m:'hub',protocol:2,n:613,hs:[]});await o.next(m=>m.n===613);assert(!h.messages.some(m=>m.n===613));
  g.send({t:'ev',e:'hub',kind:'station-result',to:o.welcome.id,granted:true});await o.next(m=>m.e==='hub'&&m.granted);
 }finally{h.ws.close(1000,'leave');g.ws.close(1000,'leave');o.ws.close(1000,'leave');}
});

test('voice signalling is addressed and bot settings belong to host and survive migration',async()=>{
 const code='V'+Math.random().toString(36).slice(2,7).toUpperCase();
 const h=await connect(code,'voice-host',true,'voice-bots',true),g=await connect(code,'voice-guest',false,'voice-bots'),o=await connect(code,'voice-observer',false,'voice-bots');
 try{
  h.send({t:'ev',e:'rtc',to:g.welcome.id,description:{type:'offer',sdp:'test-offer'},extra:'stripped'});
  const offer=await g.next(m=>m.e==='rtc'&&m.description?.sdp==='test-offer');assert.equal(offer.id,h.welcome.id);assert.equal(offer.extra,undefined);
  g.send({t:'ev',e:'rtc',to:h.welcome.id,candidate:{candidate:'test-ice',sdpMid:'0',sdpMLineIndex:0}});await h.next(m=>m.e==='rtc'&&m.candidate?.candidate==='test-ice');
  g.send({t:'rules',bots:true});h.send({t:'rules',bots:false});await g.next(m=>m.t==='rules'&&m.bots===false);await o.next(m=>m.t==='rules'&&m.bots===false);
  assert(!o.messages.some(m=>m.e==='rtc'));assert(!h.messages.some(m=>m.t==='rules'&&m.bots===true));
  h.ws.close(1000,'leave');await g.next(m=>m.t==='upd'&&m.p.host);const newcomer=await connect(code,'voice-late-guest',false,'voice-bots');assert.equal(newcomer.welcome.bots,false);newcomer.ws.close(1000,'leave');
 }finally{h.ws.close();g.ws.close(1000,'leave');o.ws.close(1000,'leave');}
});


test('eight-player lobby relays host packets to all seven guests and guest input to host',async()=>{
 const chars='ABCDEFGHJKLMNPQRSTUVWXYZ',code='E'+Array.from({length:5},()=>chars[Math.random()*chars.length|0]).join('');
 const clients=[];
 try{
  for(let i=0;i<8;i++)clients.push(await connect(code,'eight-'+i+'-'+code,i===0,'eight-player-test',true));
  assert.equal(clients.length,8);
  for(const c of clients)assert.equal(c.welcome.t,'welcome');
  const host=clients[0];
  host.send({t:'st',m:'hub',protocol:2,n:800,x:1,y:0,z:1});
  await Promise.all(clients.slice(1).map(c=>c.next(m=>m.t==='st'&&m.n===800)));
  clients[7].send({t:'st',m:'hub',protocol:2,n:801,x:2,y:0,z:2});
  const received=await host.next(m=>m.t==='st'&&m.n===801);
  assert.equal(received.id,clients[7].welcome.id);
  // One packed host state is relayed; there are no per-object additional WebSockets.
  assert(!clients[7].messages.some(m=>m.n===801&&m.id===clients[7].welcome.id));
 }finally{for(const c of clients)c.ws.close(1000,'leave');}
});
