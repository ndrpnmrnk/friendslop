// v0.69 Dev: настоящий WebRTC, слушатель БЕЗ микрофона должен слышать говорящего (в обе стороны: хост/гость).
const out=document.querySelector('#log'),clients=[];
const log=(s,v='')=>out.textContent+='\n'+s+' '+JSON.stringify(v),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,label,ms=20000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await sleep(20);}throw Error('timeout '+label);};
try{
 for(let i=0;i<3;i++){const f=document.createElement('iframe');f.src='/__logic-index.html';document.querySelector('#clients').append(f);const w=f.contentWindow;
  await wait(()=>w.__onlineTestModules?.input&&w.__fs?.menu,'boot',60000);const m=w.__onlineTestModules,fs=w.__fs;
  m.mic.MIC.on=false;m.mic.stopMic();m.net.myName('L'+i);w.localStorage.setItem('friendslop.server','ws://'+location.host+'/__rooms');fs.showHub();m.audio.initAudio();clients.push({w,m,fs});}
 const[h,g1,g2]=clients;h.m.net.createRoom('cat');await wait(()=>h.m.net.inRoom(),'host');const code=h.m.net.NET.code;
 for(const g of [g1,g2]){g.w.sessionStorage.setItem('friendslop.tok.'+code,'v'+Date.now()+Math.random());g.m.net.joinRoom(code,'cat');await wait(()=>g.m.net.inRoom(),'guest');}
 // говорит только g1 (синтетический микрофон, открытый режим); хост и g2 микрофон не включали
 {const{ac}=g1.m.audio.audioBus('voice'),tone=ac.createOscillator(),gain=ac.createGain(),dest=ac.createMediaStreamDestination();tone.frequency.value=520;gain.gain.value=.3;tone.connect(gain);gain.connect(dest);tone.start();
  g1.m.mic.MIC.mode='open';g1.m.mic.MIC.floor=0;await g1.m.mic.connectMicStream(dest.stream);g1.m.mic.MIC.on=true;}
 const id1=g1.m.net.NET.id;
 const rms=c=>{const p=c.fs.voiceChat.peers.get(id1);if(!p?.analyser)return 0;const b=new Float32Array(256);p.analyser.getFloatTimeDomainData(b);return Math.sqrt(b.reduce((s,n)=>s+n*n,0)/b.length);};
 const res={};for(const[name,c]of[['host_no_mic',h],['guest_no_mic',g2]]){try{await wait(()=>rms(c)>.02,name,25000);res[name]='hears';}catch{const p=c.fs.voiceChat.peers.get(id1);res[name]={rms:rms(c),state:p?.pc.connectionState,dir:p?.pc.getTransceivers().map(t=>t.currentDirection+'/'+t.direction),err:p?.error,stream:!!p?.stream,src:!!p?.source};}}
 log('LISTEN',res);log('DONE');
}catch(e){log('FAIL',e.stack);}
