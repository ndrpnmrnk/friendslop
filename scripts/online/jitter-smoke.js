// v0.65 сквозной замер: 2 настоящих клиента, у гостя входящая задержка 120±50 мс с порядком доставки как у TCP.
const out=document.querySelector('#log'),clients=[],testWindows=[];
const log=(n,v='')=>out.textContent+='\n'+n+' '+JSON.stringify(v);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,l,ms=60000)=>{const e=Date.now()+ms;while(Date.now()<e){if(fn())return;await sleep(50);}throw Error('timeout '+l);};
let sampler=null;setInterval(()=>{for(const w of testWindows)w.__stepTestFrame?.();sampler?.();},1000/60);
try{
 for(let i=0;i<2;i++){const f=document.createElement('iframe');f.src='/__logic-index.html?testFrames=1';document.querySelector('#clients').append(f);const w=f.contentWindow;testWindows.push(w);
  await wait(()=>w.__onlineTestModules?.camera&&w.__fs?.menu,'boot');const m=w.__onlineTestModules,fs=w.__fs;
  m.mic.MIC.on=false;m.mic.stopMic();w.localStorage.setItem('friendslop.server','ws://'+location.host+'/__rooms');m.net.myName('P'+i);fs.showHub();clients.push({w,m,fs});}
 const[h,g]=clients;h.m.net.createRoom('cat');await wait(()=>h.m.net.inRoom(),'host');const code=h.m.net.NET.code;
 g.w.sessionStorage.setItem('friendslop.tok.'+code,'p'+Date.now());g.m.net.joinRoom(code,'cat');await wait(()=>clients.every(c=>c.fs.menu.mode==='roam'&&c.fs.menu.world.state.bots.length===1),'arrival');
 h.m.net.setBotsEnabled(true);h.fs.S.botCount=3;g.fs.S.botCount=3;
 for(const c of clients){c.m.match.netBeginMatch(424242);c.w.__forceDistricts=['plaza','park','yard','shops'];c.fs.startRound();c.w.__forceDistricts=null;}
 await wait(()=>clients.every(c=>c.fs.S.state==='play'&&!c.m.match.netPaused()),'map',120000);await sleep(1200);
 // задержка и разброс пинга у гостя (входящие)
 let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const ws=g.m.net.NET.ws,orig=ws.onmessage;let lastAt=0;
 ws.onmessage=e=>{const lat=120+(rnd()-.5)*100+(rnd()<.03?120:0),at=Math.max(lastAt,performance.now()+lat);lastAt=at;setTimeout(()=>orig.call(ws,e),at-performance.now());};
 await sleep(1500);
 // 1. плавность хоста глазами гостя: хост бежит и поворачивает
 const hostKey='p'+h.m.net.NET.id,HP=h.fs.W.player;const pup=()=>g.fs.W.bots.find(b=>b.netKey===hostKey);
 const steps=[];let prev=null;sampler=()=>{const p=pup();if(!p)return;const q=p.root.position,t=performance.now();if(prev&&t-prev.t>4)steps.push(Math.hypot(q.x-prev.x,q.z-prev.z)/((t-prev.t)/1000));prev={x:q.x,z:q.z,t};};
 h.m.input.keys.KeyW=true;for(let i=0;i<8;i++){h.m.input.keys[i%2?'KeyA':'KeyD']=true;await sleep(450);h.m.input.keys.KeyA=h.m.input.keys.KeyD=false;await sleep(250);}h.m.input.keys.KeyW=false;sampler=null;
 const moving=steps.filter(s=>s>.002),sorted=[...moving].sort((a,b)=>a-b),med=sorted[Math.floor(sorted.length/2)]||1;
 const jerks=moving.filter(s=>s>med*2.5).length,stalls=steps.slice(5,-5).filter(s=>s<med*.15).length;
 const dev=moving.map(v=>Math.abs(v-med)/med).sort((a,b)=>a-b);log('HOST_ON_GUEST',{frames:steps.length,median_speed:+med.toFixed(2),jerks_over_2_5x:jerks,stalls,speed_dev_p90:+dev[Math.floor(dev.length*.9)].toFixed(2)});
 // 2. бросок гостя: предмет подобран и брошен, полёт глазами гостя
 const GP=g.fs.W.player,gi=g.m.items;
 const it=g.fs.W.items.find(q=>q.state==='rest'&&!q.noPickup&&!q.mission&&!q.def.heavy&&q.netId&&!q.netScope);
 if(!it)throw Error('no item');
 GP.pos.set(it.pos.x+.6,it.pos.y-it.def.r+.02,it.pos.z);GP.vel.set(0,0,0);await sleep(600);
 g.m.world.withWorld(g.fs.W,()=>{gi.pickUp(it);GP.held=it;it.owner=GP;it.wasHeld=true;});
 await wait(()=>h.fs.W.items.find(q=>q.netId===it.netId)?.state==='held','host confirms take',4000);await sleep(300);
 const fly=[];let last=null;
 g.m.world.withWorld(g.fs.W,()=>{GP.held=null;gi.launch(it,GP.pos.clone().add(new (GP.pos.constructor)(0,1.2,0)),new (GP.pos.constructor)(5,7,0));});
 const t0=performance.now();sampler=()=>{const q=it.pos;if(last)fly.push({d:Math.hypot(q.x-last.x,q.y-last.y,q.z-last.z),s:it.state,st:!!it.netStopped,t:performance.now()-t0});last={x:q.x,y:q.y,z:q.z};};
 await sleep(1300);sampler=null;
 const inFlight=fly.filter(f=>f.t<700),stall=inFlight.filter(f=>f.d<.005).length,back=inFlight.filter(f=>f.d>.45).length,firstMove=inFlight.find(f=>f.d>.005)?.t??null;
 log('GUEST_THROW',{frames:inFlight.length,stall_frames:stall,jump_frames:back,first_move_ms:firstMove&&Math.round(firstMove),returned_to_hand:inFlight.some(f=>f.s==='held'),first:inFlight.slice(0,6).map(f=>[Math.round(f.t),f.s,f.st,+f.d.toFixed(3)])});
 // 3. хост свернул вкладку
 Object.defineProperty(h.w.document,'hidden',{configurable:true,get:()=>true});h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));
 await sleep(4500);
 log('HANDOFF',{guest_is_host:g.m.match.MATCH.host,guest_paused:g.m.match.netPaused(),old_host_is_host:h.m.match.MATCH.host});
 const errs=[...h.fs.lastFaults(),...g.fs.lastFaults()];log('FAULTS',errs.length);
 log('DONE');
}catch(e){log('FAIL',e.stack);}
