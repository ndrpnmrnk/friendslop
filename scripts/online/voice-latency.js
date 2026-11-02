// Dev: настоящий WebRTC между двумя клиентами игры, синтетический микрофон. Меряет задержку
// «нажал V (PTT) → голос слышен у друга» и проверяет, что звук идёт без провалов.
const out=document.querySelector('#log'),button=document.querySelector('#start'),clients=[];
const log=(s,v='')=>out.textContent+='\n'+s+' '+JSON.stringify(v),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,label,ms=20000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await sleep(5);}throw Error('timeout '+label);};
for(let i=0;i<2;i++){
 const f=document.createElement('iframe');f.src='/__logic-index.html';document.querySelector('#clients').append(f);const w=f.contentWindow;
 await wait(()=>w.__onlineTestModules?.input&&w.__fs?.menu,'boot');const m=w.__onlineTestModules,fs=w.__fs;
 m.mic.MIC.on=false;m.mic.stopMic();m.net.myName('Voice '+i);w.localStorage.setItem('friendslop.server','ws://'+location.host+'/__rooms');fs.showHub();const c={w,m,fs};clients.push(c);
 const enable=w.document.createElement('button');enable.id='enable';enable.textContent='Сигнал '+(i+1);enable.style='position:fixed;top:6px;left:6px;z-index:99999;padding:12px';w.document.body.append(enable);
 enable.onclick=async()=>{enable.disabled=true;try{m.audio.initAudio();const{ac}=m.audio.audioBus('voice'),tone=ac.createOscillator(),gain=ac.createGain(),dest=ac.createMediaStreamDestination();tone.frequency.value=440+i*160;gain.gain.value=.3;tone.connect(gain);gain.connect(dest);tone.start();
  m.mic.MIC.mode='ptt';m.mic.MIC.floor=0;await m.mic.connectMicStream(dest.stream);m.mic.MIC.on=true;c.ready=true;if(clients.length===2&&clients.every(c=>c.ready)){button.disabled=false;button.textContent='Мерить';}}catch(e){log('enable failed',String(e));}};
}
button.textContent='Нажмите сигналы';
button.onclick=async()=>{button.disabled=true;try{
 const[h,g]=clients;h.m.net.createRoom('cat');await wait(()=>h.m.net.inRoom(),'host');const code=h.m.net.NET.code;g.w.sessionStorage.setItem('friendslop.tok.'+code,'v'+Date.now());g.m.net.joinRoom(code,'cat');await wait(()=>g.m.net.inRoom(),'guest');
 const hp=()=>h.fs.voiceChat.peers.get(g.m.net.NET.id);await wait(()=>hp()?.pc.connectionState==='connected'&&hp().analyser,'WebRTC',20000);
 const rms=()=>{const p=hp(),b=new Float32Array(256);p.analyser.getFloatTimeDomainData(b);return Math.sqrt(b.reduce((s,n)=>s+n*n,0)/b.length);};
 const lat=[],gaps=[];
 for(let k=0;k<8;k++){
  g.m.input.keys.KeyV=false;await wait(()=>rms()<.002,'silence',5000);await sleep(400);
  const t0=Date.now();g.m.input.keys.KeyV=true;await wait(()=>rms()>.02,'voice',5000);lat.push(Date.now()-t0);
  // 1.2 с непрерывного голоса: считаем провалы (рывки)
  let drop=0;const end=Date.now()+1200;while(Date.now()<end){if(rms()<.01)drop++;await sleep(10);}gaps.push(drop);
 }
 g.m.input.keys.KeyV=false;lat.sort((a,b)=>a-b);
 log('VOICE',{median_ms:lat[Math.floor(lat.length/2)],min_ms:lat[0],max_ms:lat.at(-1),dropouts_per_1_2s:gaps});
 log('DONE');
}catch(e){log('FAIL',e.stack);}};
