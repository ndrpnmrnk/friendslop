// Настоящие WebRTC/Web Audio и игровые клиенты. Вместо устройства - синтетический вход, без записи микрофона.
const out=document.querySelector('#log'),button=document.querySelector('#start'),clients=[],started=Date.now();
const log=(s,v='')=>out.textContent+='\n'+s+' '+JSON.stringify(v),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,label,ms=20000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await sleep(80);}throw Error('timeout '+label);};
const assert=(v,s)=>{if(!v)throw Error(s);log('PASS',s);};
for(let i=0;i<2;i++){
 const f=document.createElement('iframe');f.src='/__logic-index.html';document.querySelector('#clients').append(f);const w=f.contentWindow;
 await wait(()=>w.__onlineTestModules?.input&&w.__fs?.menu,'boot');const m=w.__onlineTestModules,fs=w.__fs;
 m.mic.MIC.on=false;m.mic.stopMic();w.localStorage.removeItem('friendslop.lastFaults');m.net.myName('Audio '+i);w.localStorage.setItem('friendslop.server','ws://'+location.host+'/__rooms');fs.showHub();const c={w,m,fs,scope:fn=>m.world.withWorld(fs.menu.world.state,fn)};clients.push(c);log('Booted',i);m.net.onNet('ev',q=>{if(q.e==='rtc')log('RTC signal',{client:i,from:q.id,type:q.description?.type||'ICE'});});
 const enable=w.document.createElement('button');enable.textContent='Включить тестовый сигнал '+(i+1);enable.style='position:fixed;top:6px;left:6px;z-index:99999;padding:12px';w.document.body.append(enable);
 enable.onclick=async()=>{enable.disabled=true;try{m.audio.initAudio();const{ac}=m.audio.audioBus('voice'),tone=ac.createOscillator(),gain=ac.createGain(),dest=ac.createMediaStreamDestination();tone.frequency.value=440+i*160;gain.gain.value=.04;tone.connect(gain);gain.connect(dest);tone.start();c.tone=tone;m.mic.MIC.mode='always';m.mic.MIC.floor=0;await m.mic.connectMicStream(dest.stream);m.mic.MIC.on=true;c.audioReady=true;enable.textContent='Сигнал готов';log('Audio ready',i);if(clients.length===2&&clients.every(c=>c.audioReady)){button.disabled=false;button.textContent='Проверить звук и ботов';}}catch(e){log('Audio enable failed',String(e));}};
}
button.textContent='Включите два тестовых сигнала';
button.onclick=async()=>{
 button.disabled=true;

 try{
 const[h,g]=clients;h.m.net.createRoom('cat');await wait(()=>h.m.net.inRoom(),'host');const code=h.m.net.NET.code;g.w.sessionStorage.setItem('friendslop.tok.'+code,'audio-'+Date.now());g.m.net.joinRoom(code,'cat');await wait(()=>g.m.net.inRoom(),'guest');
 const hp=()=>h.fs.voiceChat.peers.get(g.m.net.NET.id),gp=()=>g.fs.voiceChat.peers.get(h.m.net.NET.id);
 let connected=true;
 try{await wait(()=>hp()?.pc.connectionState==='connected'&&gp()?.pc.connectionState==='connected','WebRTC',12000);}catch(error){
  if([hp(),gp()].every(p=>p?.pc.iceGatheringState==='complete'&&p.localCandidates===0)){connected=false;log('SKIP','This browser gathers no ICE candidates; real WebRTC media cannot be verified here');}else throw error;
 }
 assert([hp(),gp()].every(p=>p.pc.localDescription&&p.pc.remoteDescription&&p.pc.signalingState==='stable'),'actual SDP offer/answer negotiation completed');
 assert([hp(),gp()].every(p=>p.pc.getTransceivers().length===1&&p.sender.track),'one bidirectional audio line with attached microphone on both peers');
 const rms=p=>{if(!p?.analyser)return 0;const b=new Float32Array(256);p.analyser.getFloatTimeDomainData(b);return Math.sqrt(b.reduce((s,n)=>s+n*n,0)/b.length);};
 for(const c of clients){const{ac}=c.m.audio.audioBus('voice'),source=ac.createMediaStreamSource(c.m.mic.micTransport()),analyser=ac.createAnalyser(),mute=ac.createGain();analyser.fftSize=256;mute.gain.value=0;source.connect(analyser);analyser.connect(mute);mute.connect(ac.destination);c.probe={analyser};}
 const incoming=()=>connected?rms(hp()):rms(g.probe);
 if(connected){await wait(()=>rms(hp())>.003&&rms(gp())>.003,'bidirectional audio');assert(true,'actual synthetic audio received in both directions');}
 else{await wait(()=>rms(h.probe)>.003&&rms(g.probe)>.003,'processed microphone streams');assert(true,'real Web Audio microphone processing passes both synthetic inputs');}
 assert(hp().spatial.pan.panningModel==='HRTF','voices use a 3D HRTF source');
 h.m.net.mute(g.m.net.NET.id,true);await wait(()=>hp().spatial.gain.gain.value<.001&&gp().sender.track===null,'host mute');assert(true,'host mute cuts reception and detaches the sending track');h.m.net.mute(g.m.net.NET.id,false);await wait(()=>!!gp().sender.track,'unmute');
 g.m.mic.MIC.mode='ptt';g.m.input.keys.KeyV=false;await wait(()=>incoming()<.0001,'PTT off');assert(true,'PTT sends silence without V');
 g.m.input.keys.KeyV=true;await wait(()=>incoming()>.003,'PTT on');assert(true,'holding V passes audio');g.m.input.keys.KeyV=false;await wait(()=>incoming()<.0001,'PTT release');assert(true,'releasing V closes the audio gate');g.m.mic.MIC.mode='always';
 // Реальный офлайн-рендер звукового поля: сторона источника и дальняя тишина.
 const render=async x=>{const ac=new OfflineAudioContext(2,22050,44100),s=h.m.spatial.spatialSource(ac,ac.destination,18),o=ac.createOscillator();ac.listener.setPosition(0,1.5,0);ac.listener.setOrientation(0,0,-1,0,1,0);const e=h.m.spatial.ears,p={x:e.x+x,y:e.y,z:e.z-1};s.set(p);o.connect(s.input);o.start();const b=await ac.startRendering();return[0,1].map(c=>Math.sqrt(b.getChannelData(c).reduce((sum,n)=>sum+n*n,0)/b.length));};
 // ears управляют затуханием, слушатель офлайн-контекста получает те же координаты.
 const e=h.m.spatial.ears,old={...e};Object.assign(e,{x:0,y:1.5,z:0});const right=await render(3),left=await render(-3),far=await render(30);Object.assign(e,old);
 assert(right[1]>right[0]*1.1&&left[0]>left[1]*1.1,'rendered audio changes left/right with source position');assert(far.every(n=>n<.000001),'distant source is silent');
 // Мировой эффект ведущего и собственное действие гостя проходят через обычные сетевые пакеты.
 for(const c of clients){const{ac,master}=c.m.audio.audioBus('effects'),analyser=ac.createAnalyser(),silent=ac.createGain();analyser.fftSize=256;silent.gain.value=0;master.connect(analyser);analyser.connect(silent);silent.connect(ac.destination);c.effects={analyser};}
 await wait(()=>rms(g.effects)<.0001,'quiet effects');h.scope(()=>h.m.audio.sfx('bell',{at:h.fs.menu.player.pos}));await wait(()=>rms(g.effects)>.001,'host world sound at guest');assert(true,'guest renders the host world sound through real Web Audio');
 await wait(()=>rms(h.effects)<.0001,'quiet host effects');g.scope(()=>g.m.audio.sfx('jump'));await wait(()=>rms(h.effects)>.001,'guest action at host');assert(true,'host hears the guest action forwarded in the normal state packet');
 // Общий бумбокс создаётся тем же addItem и реестром, что и предметы карты.
 let box;h.scope(()=>box=h.fs.addItem('boombox',0,.3,14));await wait(()=>g.fs.menu.world.state.items.some(q=>q.netId===box.netId),'shared radio');const gb=g.fs.menu.world.state.items.find(q=>q.netId===box.netId);
 for(const[c,x]of[[h,-1],[g,1]]){c.fs.menu.player.pos.set(x,0,14);for(const peer of clients){const a=peer.fs.menu.world.state.bots.find(a=>a.id===c.m.net.NET.id);if(a){a.pos.set(x,0,14);for(const q of a.buf){q.x=x;q.y=0;q.z=14;}}}}
 await sleep(400);g.scope(()=>g.m.radio.toggleRadio(gb));await wait(()=>box.radio?.on&&gb.radio?.on,'radio on');assert(box.radio.since===gb.radio.since,'boombox starts from one shared clock');
 await wait(()=>h.m.radio.radioPlayback(box)?.currentTime>.2&&g.m.radio.radioPlayback(gb)?.currentTime>.2,'actual radio playback',30000);await wait(()=>Math.abs(h.m.radio.radioPlayback(box).currentTime-g.m.radio.radioPlayback(gb).currentTime)<.25,'aligned playhead',8000);const delta=Math.abs(h.m.radio.radioPlayback(box).currentTime-g.m.radio.radioPlayback(gb).currentTime);log('Radio drift ms',Math.round(delta*1000));assert(delta<.25,'actual radio playback stays aligned within 250 ms');
 g.scope(()=>g.m.radio.tuneRadio(gb,1));await wait(()=>box.radio.station===1&&gb.radio.station===1,'tune');assert(true,'guest changes the station for everyone');g.scope(()=>g.m.radio.toggleRadio(gb));await wait(()=>!box.radio.on&&h.m.radio.radioPlayback(box).paused&&g.m.radio.radioPlayback(gb).paused,'radio off');assert(true,'guest stops both radios');
 // Проверка кнопки и общего правила перед матчем, затем прямо во время игры.
 if(h.m.net.botsEnabled())h.w.document.getElementById('botsToggle').click();await wait(()=>!h.m.net.botsEnabled()&&!g.m.net.botsEnabled(),'bots rule');assert(g.w.document.getElementById('botsToggle').disabled,'only host can change the shared bot switch');
 h.m.match.netBeginMatch(605123);g.m.match.netBeginMatch(605123);for(const c of clients){c.w.__forceDistricts=['yard','park','plaza','shops','construction','cemetery','gas','market','school'];c.fs.startRound();}
 await wait(()=>clients.every(c=>c.fs.S.state==='play'&&!c.m.match.netPaused()),'map',90000);assert(clients.every(c=>c.fs.W.bots.length===1&&c.fs.W.bots[0].human),'friends-only match has no AI opponents');
 h.w.document.getElementById('botsToggle').click();await wait(()=>clients.every(c=>c.fs.W.bots.filter(b=>!b.human).length===3),'enable bots');assert(true,'bots can be enabled during the match');
 h.w.document.getElementById('botsToggle').click();await wait(()=>clients.every(c=>c.fs.W.bots.length===1&&c.fs.W.bots[0].human),'disable bots');assert(true,'disabling bots removes AI and preserves the human player');
 h.m.net.leaveRoom();await wait(()=>g.m.net.NET.host&&!g.m.net.botsEnabled()&&g.fs.W.bots.length===0,'migration with bot rule');assert(true,'new host preserves friends-only rule');
 await wait(()=>g.fs.voiceChat.peers.size===0,'voice cleanup');assert(true,'voice connections are released on player departure');
 const faults=clients.flatMap(c=>c.fs.lastFaults()).filter(f=>Date.parse(f.at)>=started);log('Faults',faults);assert(!faults.length,'no game frame faults');log('AUDIO SMOKE COMPLETE');
 }catch(e){log('FAIL',e.stack);for(const c of clients)log('Diagnostic',{radios:c.fs.menu.world.state.items.filter(i=>i.type==='boombox').map(i=>({state:i.radio,time:c.m.radio.radioPlayback(i)?.currentTime,duration:c.m.radio.radioPlayback(i)?.duration,paused:c.m.radio.radioPlayback(i)?.paused,now:c.m.net.serverNow()})),faults:c.fs.lastFaults(),mic:{ok:c.m.mic.MIC.ok,err:c.m.mic.MIC.err,talk:c.m.mic.MIC.talk},peers:[...c.fs.voiceChat.peers.values()].map(p=>({state:p.pc.connectionState,error:p.error,making:p.making,signalling:p.pc.signalingState,local:p.pc.localDescription?.type,remote:p.pc.remoteDescription?.type,ice:p.pc.iceGatheringState,candidates:p.candidates.length}))});}
 finally{for(const c of clients){c.m.mic.MIC.on=false;c.m.mic.stopMic();c.tone.stop();}}
};
