import {audioBus,initAudio} from './sfx.js';
import {CONFIG} from '../config.js';

// Один поток без декодирования целого трека в память. Все уровни проходят через M/mute.
export function createRoundMusic(config,{bus=audioBus,makeAudio=()=>new Audio(),init=initAudio,base=import.meta.env?.BASE_URL??'/'}={}){
  let audio=null,source=null,gain=null,phase='off',volume=0,fade=null,suspended=!!globalThis.document?.hidden,blocked=false,pending=false,request=0;
  const level=v=>Math.max(0,Math.min(1,Number(v)||0));
  function ensure(){
    if(!config.file)return false;
    if(audio)return true;
    init();const b=bus();if(!b)return false;
    const element=makeAudio();element.preload='auto';element.loop=config.loop!==false;element.volume=1;element.playbackRate=1;element.src=base+config.file;
    let media,node;
    try{media=b.ac.createMediaElementSource(element);node=b.ac.createGain();node.gain.value=0;media.connect(node);node.connect(b.master);}
    catch{media?.disconnect();node?.disconnect();element.removeAttribute('src');return false;}
    audio=element;source=media;gain=node;return true;
  }
  function setVolume(v,smooth=false){volume=level(v);if(gain){const p=gain.gain,now=gain.context.currentTime;p.cancelScheduledValues(now);if(smooth)p.setTargetAtTime(volume,now,.025);else p.setValueAtTime(volume,now);}}
  function fadeTo(to,duration){fade={from:volume,to:level(to),elapsed:0,duration:Math.max(.001,duration||0)};}
  function play(){
    if(!audio||suspended)return;
    const ticket=++request;pending=true;
    try{Promise.resolve(audio.play()).then(()=>{if(ticket!==request)return;pending=false;blocked=false;if(phase==='off'||suspended)audio.pause();}).catch(()=>{if(ticket===request){pending=false;blocked=phase!=='off'&&!suspended;}});}
    catch{pending=false;blocked=phase!=='off'&&!suspended;}
  }
  function stop(){request++;pending=blocked=false;phase='off';fade=null;setVolume(0);if(audio){audio.pause();try{audio.currentTime=0;}catch{}}}
  return{
    // Вызывается по клику выбора режима: загрузка и разрешение autoplay до пролёта.
    prepare(){if(!ensure())return false;if(phase==='off'&&!suspended){setVolume(0);play();}return true;},
    start(){if(!ensure())return false;stop();phase='intro';try{audio.currentTime=0;}catch{}fadeTo(config.introVolume,config.fadeIn);play();return true;},
    background(){if(phase!=='intro')return false;phase='play';fadeTo(config.playVolume,config.duckDuration);return true;},
    stop,
    suspend(on){on=!!on;if(suspended===on)return;suspended=on;if(!audio||phase==='off')return;if(on){request++;pending=false;audio.pause();}else play();},
    unlock(){if(phase!=='off'&&!suspended&&blocked&&!pending){init();play();}},
    update(dt){if(phase==='off'||suspended||!fade)return;fade.elapsed=Math.min(fade.duration,fade.elapsed+Math.max(0,dt));const k=fade.elapsed/fade.duration,e=k*k*(3-2*k);setVolume(fade.from+(fade.to-fade.from)*e,true);if(k===1)fade=null;},
    dispose(){stop();if(audio){audio.removeAttribute('src');audio.load();source.disconnect();gain.disconnect();audio=source=gain=null;}},
    get status(){return{configured:!!config.file,phase,volume,suspended,blocked,pending};}
  };
}
export const roundMusic=createRoundMusic(CONFIG.roundMusic);
