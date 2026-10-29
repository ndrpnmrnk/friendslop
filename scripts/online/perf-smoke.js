// Целевой CPU-сценарий: реальные игровые сцены/сеть, без WebGL и доступа к микрофону.
const out=document.querySelector('#log'),clients=[],started=Date.now();
const log=(name,value='')=>out.textContent+='\n'+name+' '+JSON.stringify(value);
const testWindows=[];const pump=setInterval(()=>{for(const w of testWindows)w.__stepTestFrame?.();},1000/60);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,label,ms=30000)=>{const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await sleep(60);}throw Error('timeout '+label);};
const assert=(ok,label)=>{if(!ok)throw Error(label);log('PASS',label);};
try{
 for(let i=0;i<2;i++){
  const f=document.createElement('iframe');f.src='/__logic-index.html?testFrames=1';document.querySelector('#clients').append(f);const w=f.contentWindow;testWindows.push(w);
  await wait(()=>w.__onlineTestModules?.camera&&w.__fs?.menu,'boot');const m=w.__onlineTestModules,fs=w.__fs;
  m.mic.MIC.on=false;m.mic.stopMic();w.localStorage.setItem('friendslop.server','ws://'+location.host+'/__rooms');m.net.myName('Perf '+i);fs.showHub();
  clients.push({w,m,fs,scope:fn=>m.world.withWorld(fs.menu.world.state,fn)});log('Booted',i);
 }
 const[h,g]=clients;h.m.net.createRoom('cat');await wait(()=>h.m.net.inRoom(),'host');const code=h.m.net.NET.code;
 g.w.sessionStorage.setItem('friendslop.tok.'+code,'perf-'+Date.now());g.m.net.joinRoom(code,'cat');await wait(()=>clients.every(c=>c.fs.menu.mode==='roam'&&c.fs.menu.world.state.bots.length===1),'guest and hub arrival');
 const d=h.w.document,input=h.m.input,canvas=h.fs.renderer.domElement,own=Object.getOwnPropertyDescriptor(d,'pointerLockElement');
 Object.defineProperty(d,'pointerLockElement',{configurable:true,value:canvas});input.takeLook();
 d.dispatchEvent(new h.w.MouseEvent('mousemove',{bubbles:true,movementX:24,movementY:-6}));
 d.dispatchEvent(new h.w.PointerEvent('pointermove',{bubbles:true,movementX:24,movementY:-6}));
 const delta=input.takeLook();assert(delta.dx===24&&delta.dy===-6,'relative mouse movement counted exactly once');
 d.dispatchEvent(new h.w.MouseEvent('mousemove',{bubbles:true,movementX:20}));d.dispatchEvent(new h.w.Event('pointerlockchange'));
 assert(input.takeLook().dx===0,'pointer lock transition clears stale mouse delta');
 if(own)Object.defineProperty(d,'pointerLockElement',own);else delete d.pointerLockElement;
 const rig=h.m.camera.createCameraRig();rig.state.orbit={c:h.fs.menu.player.pos.clone(),dist:10};
 h.scope(()=>rig.update(h.fs.menu.camera,h.fs.menu.player,1/60,false,{dx:100,dy:0},false));
 assert(Math.abs(rig.state.yaw+.24)<1e-9,'crane mouse yaw is applied once');
 rig.state.free={};rig.state.pose={};rig.state.ret={};rig.reset(0);
 assert(!rig.state.free&&!rig.state.pose&&!rig.state.ret&&!rig.state.orbit,'new camera session clears temporary camera modes');
 // Moving the host guarantees active hub packets, without changing physics/input of remote players.
 let hubTimes=[];g.m.net.onNet('st',q=>{if(q.id===h.m.net.NET.id&&q.m==='hub')hubTimes.push(performance.now());});
 h.m.input.keys.KeyW=true;await sleep(1800);h.m.input.keys.KeyW=false;
 log('Hub packet cadence',{count:hubTimes.length,gap:hubTimes.length>1?(hubTimes.at(-1)-hubTimes[0])/(hubTimes.length-1):0});
 assert(hubTimes.length>=18,'active hub sends more than the old 10 Hz');
 const remote=g.fs.menu.world.state.bots[0];
 assert(remote.buf.every((q,i,b)=>!i||q.t>b[i-1].t),'host has one monotonic motion sample per packet');
 h.m.net.setBotsEnabled(true);h.fs.S.botCount=7;g.fs.S.botCount=7;const seed=606707;
 for(const c of clients){c.m.match.netBeginMatch(seed);c.w.__forceDistricts=['yard','park','plaza','shops','construction','cemetery','gas','market','school'];c.fs.startRound();c.w.__forceDistricts=null;}
 await wait(()=>clients.every(c=>c.fs.S.state==='play'&&!c.m.match.netPaused()),'map',120000);
 assert(h.fs.W.bots.length===7&&g.fs.W.bots.length===7,'match runs with one human and six AI opponents');
 let times=[],worlds=0;g.m.net.onNet('st',q=>{if(q.m==='match'&&q.id===h.m.net.NET.id){times.push(performance.now());if(q.w)worlds++;}});
 await sleep(2100);const gap=(times.at(-1)-times[0])/(times.length-1);
 log('Match packet cadence',{count:times.length,meanGapMs:gap,worlds});
 assert(times.length>=22&&worlds<=13,'movement cadence increases while world snapshots remain near 5 Hz');
 const sync=h.m.match.MATCH.world,wall=[...sync.objects.values()].find(e=>e.type==='s'&&e.o.on),key=wall.o.netId;
 wall.o.on=false;const first=sync.capture(true).rows.find(r=>r[0]===key)?.[1],second=sync.capture(true).rows.find(r=>r[0]===key)?.[1];
 assert(first&&first===second,'unchanged collider reuses its packed array');wall.o.on=true;h.m.match.MATCH.fullT=0;
 await sleep(500);assert(g.m.match.MATCH.world.objects.get(key).o.on,'baseline collider remains correct after snapshot recovery');
 log('CPU-only world capture',sync.stats);log('Network counters',h.m.net.netStats());
 h.w.document.dispatchEvent(new h.w.KeyboardEvent('keydown',{code:'F3',bubbles:true}));await sleep(650);
 const hud=h.w.document.getElementById('perfHud')?.textContent||'';
 assert(hud.includes('RTT до комнаты')&&hud.includes('сеть/снимки'),'F3 displays network RTT, queue and CPU snapshot costs');
 const faults=clients.flatMap(c=>c.fs.lastFaults()).filter(f=>Date.parse(f.at)>=started);log('Faults',faults);assert(!faults.length,'no game frame faults');
 for(const c of clients)c.m.net.leaveRoom();log('PERF SMOKE COMPLETE');
}catch(error){log('FAIL',error.stack);for(const c of clients)log('Runtime',{state:c.fs.S.state,mode:c.fs.menu.mode,pause:c.fs.menu.pause,p:c.fs.menu.player.pos.toArray(),faults:c.fs.lastFaults(),bots:c.fs.W.bots?.length,stats:c.m.net.netStats()});}

finally{clearInterval(pump);}
