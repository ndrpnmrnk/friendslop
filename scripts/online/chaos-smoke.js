// v0.69 сквозной замер «как в живой игре»: хост + 3 гостя, у гостей входящая задержка 70-170 мс с пиками,
// все бегают и прыгают, гости берут/носят/бросают предметы и катаются на скейте, боты на карте.
// Считается то, что игрок видит как баги: рывки чужих персонажей, предмет «в руке», который лежит на полу,
// транспорт отдельно от наездника, расхождение состояния предметов с хостом.
const out=document.querySelector('#log'),clients=[],testWindows=[];
const log=(n,v='')=>out.textContent+='\n'+n+' '+JSON.stringify(v);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,l,ms=60000)=>{const e=Date.now()+ms;while(Date.now()<e){if(fn())return;await sleep(50);}throw Error('timeout '+l);};
let sampler=null;setInterval(()=>{for(const w of testWindows)w.__stepTestFrame?.();sampler?.();},1000/60);
const N=+(new URLSearchParams(location.search).get('n')||4);
try{
 for(let i=0;i<N;i++){const f=document.createElement('iframe');f.src='/__logic-index.html?testFrames=1';document.querySelector('#clients').append(f);const w=f.contentWindow;testWindows.push(w);
  await wait(()=>w.__onlineTestModules?.camera&&w.__fs?.menu,'boot');const m=w.__onlineTestModules,fs=w.__fs;
  m.mic.MIC.on=false;m.mic.stopMic();w.localStorage.setItem('friendslop.server','ws://'+location.host+'/__rooms');m.net.myName('P'+i);fs.showHub();clients.push({w,m,fs,i});}
 const h=clients[0],guests=clients.slice(1);h.m.net.createRoom('cat');await wait(()=>h.m.net.inRoom(),'host');const code=h.m.net.NET.code;
 for(const g of guests){g.w.sessionStorage.setItem('friendslop.tok.'+code,'p'+Date.now()+g.i);g.m.net.joinRoom(code,['cat','tv','shark','frog'][g.i]);await sleep(300);}
 await wait(()=>clients.every(c=>c.fs.menu.mode==='roam'&&c.fs.menu.world.state.bots.length===N-1),'arrival');
 h.m.net.setBotsEnabled(true);for(const c of clients)c.fs.S.botCount=3;
 for(const c of clients){c.m.match.netBeginMatch(515151);c.w.__forceDistricts=['plaza','skatepark','yard','shops'];c.fs.startRound();c.w.__forceDistricts=null;}
 await wait(()=>clients.every(c=>c.fs.S.state==='play'&&!c.m.match.netPaused()),'map',180000);await sleep(1500);
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(const g of guests){const ws=g.m.net.NET.ws,orig=ws.onmessage;let lastAt=0;
  ws.onmessage=e=>{const lat=120+(rnd()-.5)*100+(rnd()<.04?150:0),at=Math.max(lastAt,performance.now()+lat);lastAt=at;setTimeout(()=>orig.call(ws,e),at-performance.now());};}
 await sleep(1000);
 // Все собраны в одном месте, чтобы видеть друг друга и предметы.
 const base=h.fs.W.player.pos.clone();
 // сценарий 12 с: все бегают; гость 1 носит предмет, гость 2 на скейте, гость 3 берёт и бросает
 const keys=['KeyW','KeyA','KeyS','KeyD'];
 let go=false;const chaos=setInterval(()=>{if(!go)return;for(const c of clients){const K=c.m.input.keys;for(const k of keys)K[k]=false;K[keys[Math.floor(rnd()*4)]]=true;if(rnd()<.5)K.KeyW=true;K.Space=rnd()<.15;K.ShiftLeft=rnd()<.5;}},400);
 const near=(g,it)=>g.m.world.withWorld(g.fs.W,()=>{const P=g.fs.W.player;P.pos.set(it.pos.x+.5,it.pos.y-it.def.r+.02,it.pos.z);P.vel.set(0,0,0);});
 const take=(g,it)=>g.m.world.withWorld(g.fs.W,()=>{const P=g.fs.W.player;g.m.items.pickUp(it);P.held=it;it.owner=P;it.wasHeld=true;});
 const free=g=>g.fs.W.items.filter(q=>q.state==='rest'&&!q.noPickup&&!q.mission&&!q.def.heavy&&q.netId&&!q.netScope);
 const want=[[guests[0],free(guests[0])[0]],[guests[2],guests[2]&&free(guests[2])[1]]].filter(x=>x[0]&&x[1]);
 for(const[g,it]of want)near(g,it);
 let rideB=null;if(guests[1]){const g=guests[1];rideB=g.fs.W.pushables.find(q=>['skate','scooter'].includes(q.kind)&&!q.rider);if(rideB)g.m.world.withWorld(g.fs.W,()=>{const P=g.fs.W.player;P.pos.set(rideB.x+.4,rideB.y,rideB.z);P.vel.set(0,0,0);});}
 await sleep(1500);for(const[g,it]of want)take(g,it);if(rideB){const g=guests[1];g.m.world.withWorld(g.fs.W,()=>g.m.ride.mount(g.fs.W.player,rideB));}await sleep(1200);log('SETUP',{held:want.length,ride:rideB?rideB.kind+':'+!!rideB.rider:null});
 // метрики
 const M={frames:0,puppetJumps:0,puppetSamples:0,heldFar:0,heldSamples:0,rideFar:0,rideSamples:0,stateLag:0,stateSamples:0,worst:[]};
 const last=new Map(),lagSince=new Map();
 const remoteActors=c=>[...(c.fs.W.bots||[])].filter(b=>b.puppet);
 let tPrev=performance.now();go=true;
 const own=new Map(),ownLast=new Map();
 sampler=()=>{M.frames++;const now=performance.now(),fdt=Math.max(.016,(now-tPrev)/1000);tPrev=now;
  // настоящий шаг каждого персонажа у его владельца (игрок - у себя, боты - у хоста): максимум за последние 12 кадров
  const owners=[...clients.map(c=>[c.fs.W.player.netKey||('p'+c.m.net.NET.id),c.fs.W.player]),...(h.fs.W.bots||[]).filter(b=>!b.puppet).map(b=>[b.netKey,b])];
  for(const[k,a]of owners){if(!k)continue;const p=a.root.position,q=ownLast.get(k),d=q?Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z):0;ownLast.set(k,{x:p.x,y:p.y,z:p.z});const l=own.get(k)||[];l.push(d);if(l.length>12)l.shift();own.set(k,l);}
  for(const c of clients){
   for(const a of remoteActors(c)){const p=a.root.position,k=c.i+':'+(a.netKey||a.id),q=last.get(k);
    if(q){const d=Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);M.puppetSamples++;const ol=own.get(a.netKey),om=ol?Math.max(...ol):0;if(ol&&d>om*1.6+.25&&d<30){M.puppetJumps++;if(M.worst.length<8)M.worst.push(['jump',c.i,a.netKey||a.id,+d.toFixed(2)]);}}
    last.set(k,{x:p.x,y:p.y,z:p.z});}
   for(const it of c.fs.W.items||[]){if(it.state!=='held'||!it.owner)continue;M.heldSamples++;const o=it.owner.root?.position||it.owner.pos,gp=it.g.getWorldPosition(new (o.constructor)());
    if(Math.hypot(gp.x-o.x,gp.z-o.z)>1.8||Math.abs(gp.y-o.y)>3){M.heldFar++;if(M.worst.length<8)M.worst.push(['held',c.i,it.type,+gp.distanceTo(o).toFixed(2)]);}}
   for(const b of c.fs.W.pushables||[]){if(!b.rider)continue;M.rideSamples++;const r=b.rider.root?.position||b.rider.pos,m=b.mesh.position;if(Math.hypot(m.x-r.x,m.z-r.z)>1.5){M.rideFar++;if(M.worst.length<8)M.worst.push(['ride',c.i,b.kind,+Math.hypot(m.x-r.x,m.z-r.z).toFixed(2)]);}}
  }
  // Состояние предметов у гостя против хоста: «в руке у X» больше 0.8 с не совпадает - видимый рассинхрон.
  const hi=new Map((h.fs.W.items||[]).filter(i=>i.netId).map(i=>[i.netId,i]));
  for(const g of guests)for(const it of g.fs.W.items||[]){const hh=hi.get(it.netId);if(!hh)continue;M.stateSamples++;const same=hh.state===it.state||(hh.state==='fly'&&it.state==='rest')||(hh.state==='rest'&&it.state==='fly');const k=g.i+':'+it.netId;
   if(same){lagSince.delete(k);continue;}const t=lagSince.get(k)??performance.now();lagSince.set(k,t);if(performance.now()-t>800){M.stateLag++;}}
 };
 for(let s=0;s<6;s++){await sleep(2000);
  const g=guests[2];if(g){const P=g.fs.W.player;if(P.held&&P.held.state==='held'){const it=P.held;g.m.world.withWorld(g.fs.W,()=>{P.held=null;g.m.items.launch(it,P.pos.clone().add(new (P.pos.constructor)(0,1.2,0)),new (P.pos.constructor)(rnd()*6-3,6,rnd()*6-3));});}else{const it=free(g).sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos))[0];if(it&&it.pos.distanceTo(P.pos)<2.2)g.m.world.withWorld(g.fs.W,()=>{g.m.items.pickUp(it);P.held=it;it.owner=P;it.wasHeld=true;});}}}
 clearInterval(chaos);for(const c of clients)for(const k of [...keys,'Space','ShiftLeft'])c.m.input.keys[k]=false;sampler=null;
 const pct=(a,b)=>b?+(100*a/b).toFixed(2):0;
 log('CHAOS',{clients:N,frames:M.frames,puppet_jump_pct:pct(M.puppetJumps,M.puppetSamples),puppet_jumps:M.puppetJumps,held_far_pct:pct(M.heldFar,M.heldSamples),held_samples:M.heldSamples,ride_far_pct:pct(M.rideFar,M.rideSamples),ride_samples:M.rideSamples,item_state_lag_pct:pct(M.stateLag,M.stateSamples),worst:M.worst});
 const t=clients.map(c=>c.fs.onlineDiagnostics?.());log('NET',t.map(x=>x&&{rtt:x.rtt,kbps:x.kbps??x.inKbps,snap:x.snapshotBytes}));
 const errs=clients.flatMap(c=>c.fs.lastFaults());log('FAULTS',errs.length?errs.slice(0,5):0);
 log('DONE');
}catch(e){log('FAIL',e.stack);}
