import {NET,onNet,inRoom,send} from './net.js';
import {audioBus} from '../core/sfx.js';
import {spatialSource} from '../core/spatial-audio.js';

// Голос напрямую между участниками: Worker передаёт только адресные SDP/ICE-сообщения.
// Один sendrecv-трансивер на пару, replaceTrack при смене/выключении микрофона.
export function initVoiceChat({input,actor,scene,iceServers=[{urls:'stun:stun.cloudflare.com:3478'}]}){
 const peers=new Map();let identity='',tick=0;
 const signal=(id,payload)=>send({t:'ev',e:'rtc',to:id,...payload});
 function close(id){const p=peers.get(id);if(!p)return;peers.delete(id);p.pc.close();if(p.audio){p.audio.pause();p.audio.srcObject=null;}p.source?.disconnect();p.spatial?.dispose();p.analyser?.disconnect();}
 function sync(){
  const key=inRoom()?NET.code+':'+NET.id:'';
  if(identity!==key){for(const id of [...peers.keys()])close(id);identity=key;}
  if(!key||typeof RTCPeerConnection==='undefined')return;
  for(const id of [...peers.keys()])if(!NET.players.has(id))close(id);
  for(const id of NET.players.keys())if(id!==NET.id&&!peers.has(id))create(id);
 }
 function create(id){
  const pc=new RTCPeerConnection({iceServers}),p={pc,id,making:false,ignore:false,setting:false,candidates:[],track:null,stream:null,restartAt:0,started:performance.now(),localCandidates:0};peers.set(id,p);
  if(NET.id<id)p.sender=pc.addTransceiver(input()?.getAudioTracks().find(t=>t.readyState==='live')||'audio',{direction:'sendrecv'}).sender;
  pc.onicecandidate=({candidate})=>{if(candidate){p.localCandidates++;signal(id,{candidate:candidate.toJSON()});}};
  pc.onnegotiationneeded=async()=>{if(!p.sender||p.making)return;try{p.making=true;await pc.setLocalDescription();signal(id,{description:pc.localDescription});}catch{p.error='Не удалось соединить голос';}finally{p.making=false;}};
  pc.ontrack=({track})=>{p.stream=new MediaStream([track]);p.source?.disconnect();p.spatial?.dispose();p.analyser?.disconnect();p.source=p.spatial=null;if(!p.audio){p.audio=new Audio();p.audio.autoplay=true;p.audio.muted=true;}p.audio.srcObject=p.stream;p.audio.play().catch(()=>{});};
  pc.onicegatheringstatechange=()=>{if(pc.iceGatheringState==='complete'&&!p.localCandidates)p.error='Голос недоступен для этой сети';};
  pc.onconnectionstatechange=()=>{p.error=pc.connectionState==='failed'?'Нет прямого соединения для голоса':'';};
  return p;
 }
 onNet('state',sync);
 onNet('ev',async m=>{
  if(m.e!=='rtc'||m.to!==NET.id||!inRoom()||!NET.players.has(m.id)||m.id===NET.id)return;
  sync();const p=peers.get(m.id);if(!p)return;const pc=p.pc;
  try{
   if(m.description){
    const d=m.description,ready=!p.making&&(pc.signalingState==='stable'||p.setting),collision=d.type==='offer'&&!ready;
    p.ignore=NET.id<m.id&&collision;if(p.ignore)return;
    p.setting=d.type==='answer';await pc.setRemoteDescription(d);p.setting=false;
    for(const c of p.candidates.splice(0))await pc.addIceCandidate(c);
    if(d.type==='offer'){const tr=pc.getTransceivers().find(t=>t.receiver.track.kind==='audio'&&!t.stopped);if(tr){tr.direction='sendrecv';p.sender=tr.sender;const track=NET.players.get(NET.id)?.muted?null:input()?.getAudioTracks().find(t=>t.readyState==='live')||null;await p.sender.replaceTrack(track);p.track=track;}await pc.setLocalDescription();signal(m.id,{description:pc.localDescription});}
   }else if(m.candidate&&!p.ignore){if(pc.remoteDescription)await pc.addIceCandidate(m.candidate);else if(p.candidates.length<32)p.candidates.push(m.candidate);}
  }catch{if(pc.signalingState!=='closed'&&!p.ignore)p.error='Ошибка соединения голоса';p.setting=false;}
 });
 return {peers,update(dt){
   if(identity!==(inRoom()?NET.code+':'+NET.id:''))sync();tick-=dt;if(tick>0)return;tick=.05;
   const stream=input(),track=stream?.getAudioTracks().find(t=>t.readyState==='live')||null;
   const muted=!!NET.players.get(NET.id)?.muted;
   for(const p of peers.values()){
    const next=muted?null:track;
    if(p.sender&&!p.replacing&&p.track!==next){p.replacing=true;p.sender.replaceTrack(next).then(()=>{p.track=next;const params=p.sender.getParameters();if(next&&params.encodings?.length){for(const e of params.encodings)e.maxBitrate=32000;return p.sender.setParameters(params);}}).catch(()=>{p.error='Не удалось подключить микрофон';}).finally(()=>p.replacing=false);}
    const a=actor(p.id),meta=NET.players.get(p.id),audible=!!a&&!meta?.muted&&(meta?.scene||'hub')===scene();
    const bus=audioBus('voice');
    if(p.stream&&bus&&!p.source){p.source=bus.ac.createMediaStreamSource(p.stream);p.spatial=spatialSource(bus.ac,bus.master,24);p.analyser=bus.ac.createAnalyser();p.analyser.fftSize=256;p.samples=new Float32Array(256);p.source.connect(p.analyser);p.analyser.connect(p.spatial.input);}
    if(p.spatial){const at=a?{x:a.pos.x,y:a.pos.y+1.4,z:a.pos.z}:{x:0,y:0,z:0};p.spatial.set(at,audible?1.7:0);if(a?.ch){p.analyser.getFloatTimeDomainData(p.samples);let rms=0;for(const n of p.samples)rms+=n*n;a.ch.talk=audible?Math.min(1,Math.sqrt(rms/p.samples.length)*12):0;}}
    if(p.pc.connectionState!=='connected'&&performance.now()-p.started>20000)p.error='Не удалось подключить голос в этой сети';
    if(p.pc.iceConnectionState==='failed'&&performance.now()-p.restartAt>10000){p.restartAt=performance.now();p.pc.restartIce();}
   }
  },status(){if(!inRoom())return 'Голос доступен в онлайн-комнате';if(typeof RTCPeerConnection==='undefined')return 'Браузер не поддерживает голосовой чат';const error=[...peers.values()].find(p=>p.error);return error?.error||([ ...peers.values()].some(p=>p.pc.connectionState==='connected')?'Голос подключён · слышно рядом':'Ожидаем голосовое соединение');},dispose(){for(const id of [...peers.keys()])close(id);}};
}
