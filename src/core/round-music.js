import {CONFIG} from '../config.js';
import {audioBus,initAudio} from './sfx.js';

// Один декодированный буфер и нативный loop: стык не зависит от FPS/таймеров JS.
// Сам MP3 остаётся исходным. Только в памяти конец плавно смешивается с началом.
export function prepareMusicLoop(buffer, seconds=CONFIG.music.crossfade){
  const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
  let end=buffer.length;
  const floor=Math.max(0,end-Math.floor(buffer.sampleRate*2));
  while(end>floor&&channels.every(c=>Math.abs(c[end-1])<.0001))end--;
  const frames=Math.min(Math.round(seconds*buffer.sampleRate),Math.floor(end/4));
  if(frames<2)throw new Error('Music buffer is too short');
  for(const samples of channels)for(let i=0;i<frames;i++){
    const k=.5-.5*Math.cos(Math.PI*i/(frames-1)),j=end-frames+i;
    samples[j]=samples[j]*(1-k)+samples[i]*k;
  }
  return{buffer,start:frames/buffer.sampleRate,end:end/buffer.sampleRate};
}

let clip=null,pending=null,voice=null,offset=0,phase=null,paused=false,generation=0;
function level(){return CONFIG.music[phase]??0;}
function fade(param,to,duration){
  const now=audioBus('music').ac.currentTime;
  param.cancelAndHoldAtTime(now);
  param.linearRampToValueAtTime(to,now+duration);
}
async function preload(){
  if(clip)return clip;if(pending)return pending;
  initAudio();const bus=audioBus('music');if(!bus)return null;
  pending=(async()=>{
    const response=await fetch(import.meta.env.BASE_URL+'audio/dinner-femtanyl.mp3',{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Music HTTP '+response.status);
    clip=prepareMusicLoop(await bus.ac.decodeAudioData(await response.arrayBuffer()));return clip;
  })().catch(error=>{console.warn('[friendslop] music unavailable',error);return null;}).finally(()=>{pending=null;});
  return pending;
}
function play(){
  const bus=audioBus('music');if(!clip||!bus||!phase||paused||voice)return;
  const source=bus.ac.createBufferSource(),gain=bus.ac.createGain();
  source.buffer=clip.buffer;source.loop=true;source.loopStart=clip.start;source.loopEnd=clip.end;
  gain.gain.setValueAtTime(0,bus.ac.currentTime);gain.gain.linearRampToValueAtTime(level(),bus.ac.currentTime+.35);
  source.connect(gain);gain.connect(bus.master);
  voice={source,gain,at:bus.ac.currentTime,offset};
  source.onended=()=>{source.disconnect();gain.disconnect();};
  source.start(0,offset);
}
function halt(duration=.1){
  if(!voice)return;
  const old=voice;voice=null;
  const elapsed=old.offset+audioBus('music').ac.currentTime-old.at;
  offset=elapsed<clip.end?elapsed:clip.start+(elapsed-clip.end)%(clip.end-clip.start);
  fade(old.gain.gain,0,duration);old.source.stop(audioBus('music').ac.currentTime+duration);
}
export const roundMusic={
  preload,
  async intro(){const ticket=++generation;halt();offset=0;phase='intro';await preload();if(ticket===generation)play();},
  gameplay(){if(!phase){void this.intro();}phase='play';if(voice)fade(voice.gain.gain,level(),1.4);},
  stop(){generation++;phase=null;halt(.45);offset=0;},
  pause(){if(paused)return;paused=true;halt();},
  resume(){if(!paused)return;paused=false;if(phase){initAudio();play();}},
  // Диагностика без аудиоузлов и копий большого буфера.
  status(){return{phase,paused,playing:!!voice,loaded:!!clip,loopStart:clip?.start,loopEnd:clip?.end,volume:level()};},
};
