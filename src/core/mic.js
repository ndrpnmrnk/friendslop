import {micGate} from './mic-gate.js';
/* Микрофон: анализ громкости для анимации и реакций мира, отдельный поток с затвором для WebRTC.
   Сырой микрофон не подключается к динамикам.
   Настройки хранятся в localStorage: включён ли, устройство, режим (всегда / зажать V), чувствительность. */
const KEY = 'friendslop.mic';
export const MIC = { on: false, device: '', mode: 'always', openThreshold:.16,closeThreshold:.10,sens: 0.5, loudSens: 0.5, floor: 0.25, level: 0, talk: 0, shout: 0, ok: false, err: '', stream: null };
let ac = null, an = null, src = null, buf = null,gate=null,transport=null,requestId=0,hold=0;const gateState={open:false,left:0};let gateValue=-1;
export const micTransport=()=>transport?.stream||null;
export function closeMicGate(){if(gate)gate.gain.setValueAtTime(0,ac.currentTime);hold=0;gateState.open=false;gateState.left=0;gateValue=0;}
addEventListener('blur',closeMicGate);document.addEventListener('visibilitychange',()=>{if(document.hidden)closeMicGate();});
try { Object.assign(MIC, JSON.parse(localStorage.getItem(KEY) || '{}'), { level: 0, talk: 0, shout: 0, ok: false, err: '', stream: null }); } catch (_) {}
export function saveMic() { try { localStorage.setItem(KEY, JSON.stringify({ on: MIC.on, device: MIC.device, mode: MIC.mode, openThreshold:MIC.openThreshold,closeThreshold:MIC.closeThreshold,sens: MIC.sens, loudSens: MIC.loudSens, floor: MIC.floor })); } catch (_) {} }

export async function startMic() {
  stopMic(); MIC.err = '';
  const request=++requestId;MIC.starting=true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { MIC.err = 'нет доступа';MIC.starting=false; return false; }
  try {
    const stream=await navigator.mediaDevices.getUserMedia({ audio: { deviceId: MIC.device ? { exact: MIC.device } : undefined, echoCancellation: true, noiseSuppression: true } });
    if(request!==requestId){stream.getTracks().forEach(t=>t.stop());return false;}MIC.stream=stream;
    await connectMicStream(stream);return true;
  } catch (e) {if(request===requestId){stopMic();MIC.err=e?.name==='NotAllowedError'?'доступ запрещён':'не удалось включить';}return false;}finally{if(request===requestId)MIC.starting=false;}
}
// Общая обработка входного MediaStream: анализ + отдельный затвор перед сетевой передачей.
export async function connectMicStream(stream){
  MIC.stream=stream;ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')await ac.resume();
  src=ac.createMediaStreamSource(stream);an=ac.createAnalyser();an.fftSize=512;buf=new Float32Array(an.fftSize);src.connect(an);
  gate=ac.createGain();gate.gain.value=0;gateValue=0;transport=ac.createMediaStreamDestination();src.connect(gate);gate.connect(transport);MIC.ok=true;MIC.err='';
}
export function stopMic() {requestId++;MIC.starting=false;closeMicGate();transport?.stream.getTracks().forEach(t=>t.stop());gate?.disconnect();gate=transport=null;if (MIC.stream) MIC.stream.getTracks().forEach(t => t.stop()); MIC.stream = null; if (src) src.disconnect(); src = an = null; MIC.ok = false; MIC.level = MIC.talk = MIC.shout = 0; }
export async function listMics() { try { return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput'); } catch (_) { return []; } }

// Пороги не меняются от шума комнаты и продолжительности речи.
export function updateMic(dt, pttHeld) {
  if (!MIC.ok || !an) { MIC.level = MIC.talk = MIC.shout = 0; return MIC; }
  an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  // громкость в децибелах (−60…0 дБ → 0…1): одинаково ведёт себя и на тихих, и на громких микрофонах
  const rms = Math.sqrt(s / buf.length), lvl = Math.max(0, Math.min(1, (20 * Math.log10(rms + 1e-6) + 60) / 60));
  MIC.level += (lvl - MIC.level) * Math.min(1, dt * (lvl > MIC.level ? 25 : 8));
  const thr=MIC.openThreshold,loud=Math.min(.97,thr+.15+(1-MIC.loudSens)*.35),active=MIC.mode==='always'||pttHeld;
  const talk = active && MIC.level > thr ? Math.min(1, (MIC.level - thr) / Math.max(0.05, loud - thr)) : 0, shout = active && MIC.level > loud ? Math.min(1, (MIC.level - loud) / Math.max(0.05, 1 - loud) * 2) : 0;
  MIC.talk += (talk - MIC.talk) * Math.min(1, dt * 14); MIC.shout += (shout - MIC.shout) * Math.min(1, dt * 10);
  MIC.thr = thr; MIC.loud = loud;
  const value=micGate(gateState,MIC.level,dt,{on:MIC.on&&!document.hidden,mode:MIC.mode,pressed:pttHeld,open:MIC.openThreshold,close:MIC.closeThreshold})?1:0;
  if(gate&&value!==gateValue){gate.gain.cancelScheduledValues(ac.currentTime);gate.gain.setTargetAtTime(value,ac.currentTime,.012);gateValue=value;}
  return MIC;
}
