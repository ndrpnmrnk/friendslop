import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {audioBus,sfx,setRadioFocus} from '../core/sfx.js';
import {spatialSource,distanceGain} from '../core/spatial-audio.js';
import {serverNow} from '../net/net.js';
import {radioState as state,changeRadio,radioPhase} from './radio-state.js';
import {radioCorrection,wrappedDrift} from './radio-playback.js';
import {W} from '../world/state.js';
import {raySolids} from '../world/physics.js';
export const STATIONS=[{title:'Третий шоколадный',freq:'88.3',file:'chocolate'},{title:'Семейный круг',freq:'96.7',file:'family'},{title:'Мелкий',freq:'104.2',file:'little'}];
const radios=new Map();
export function radioModel(){const g=new THREE.Group();g.name='boombox';g.add(compose('radio36',a=>{const dark=tmat(T.paintMetal(0x464653)),metal=tmat(T.metal());a(G.box,dark,0,0,0,.72,.38,.24);a(G.box,col(0x24212c),0,.012,.13,.68,.31,.025);for(const s of [-1,1]){a(G.cyl12,metal,s*.23,.01,.15,.135,.018,.135,Math.PI/2);a(G.cyl12,col(0x282630),s*.23,.01,.165,.115,.015,.115,Math.PI/2);a(G.cyl8,col(0x6e6b75),s*.23,.01,.18,.055,.025,.055,Math.PI/2);for(let i=0;i<5;i++)a(G.box,col(0x77717a),s*.23,.01+(i-2)*.039,.183,.19,.006,.009);a(G.box,dark,s*.28,.25,0,.055,.15,.055);}a(G.box,dark,0,.32,0,.61,.05,.055);a(G.box,col(0xa7a896),0,.09,.15,.14,.045,.013);a(G.box,col(0x171c24),0,-.065,.15,.14,.11,.015);for(const x of [-.035,.035])a(G.cyl8,col(0xb1a895),x,-.06,.166,.023,.01,.023,Math.PI/2);for(let i=0;i<4;i++)a(G.box,metal,(i-1.5)*.04,.197,.05,.025,.013,.06);a(G.cyl6,metal,.31,.44,-.08,.008,.29,.008,0,0,-.22);}));const dial=mesh(G.box,col(0xa94b4d),-.055,.09,.162,.008,.035,.008,g),led=mesh(G.box,col(0x4c5b41),.07,.09,.163,.018,.018,.008,g);g.userData.radio={dial,led};return g;}
export function toggleRadio(it){if(W.net?.request('radio',it,{action:'toggle'}))return;changeRadio(it,'toggle',serverNow());sfx('click',{at:it.pos,range:8});}
export function tuneRadio(it,d){if(W.net?.request('radio',it,{action:'tune',step:d>0?1:-1}))return;changeRadio(it,'tune',serverNow(),d);sfx('tick',{at:it.pos,range:7});}
export function nearRadio(a,ray){let best=null,dist=2;for(const it of W.items){if(it.type!=='boombox'||!['rest','placed'].includes(it.state))continue;const d=it.pos.distanceTo(a.pos.clone().add(new V3(0,.5,0)));if(d>=dist)continue;if(ray&&ray.ray.distanceToPoint(it.pos)>.45)continue;const from=a.pos.clone().add(new V3(0,1,0)),v=it.pos.clone().sub(from),len=v.length();if(raySolids(from,v.normalize(),len)<len-.2)continue;dist=d;best=it;}return best;}
function stream(it){let r=radios.get(it);if(r)return r;const bus=audioBus('radio');if(!bus)return null;const audio=new Audio();audio.preload='auto';audio.loop=true;const source=bus.ac.createMediaElementSource(audio),spatial=spatialSource(bus.ac,bus.master,18);source.connect(spatial.input);r={audio,spatial,source,loaded:-1,world:W.group,check:0,tryAt:0,aligned:'',lastSeek:0,playing:false};radios.set(it,r);return r;}
function dispose(r){r.audio.pause();r.audio.removeAttribute('src');r.audio.load();r.source.disconnect();r.spatial.dispose();}
export function resetRadios(){setRadioFocus(0);for(const r of radios.values())dispose(r);radios.clear();}
export function updateRadios(dt,listener,active){
 let audible=0;
 // Stream lifecycle is tied to a world; never keep remote maps playing through a transition.
 for(const [it,q] of radios){
   if(it.state==='gone'||!it.g?.parent||q.world!==W.group){dispose(q);radios.delete(it);continue;}
 }
 const now=serverNow();
 for(const it of W.items){
   if(it.type!=='boombox'||it.state==='gone')continue;
   const r=state(it),u=it.g.userData.radio;
   if(u){
     r.dial=(r.dial??r.station)+(r.station-(r.dial??r.station))*(1-Math.exp(-dt*9));
     u.dial.position.x=-.055+r.dial*.05;
     // Material swaps on every frame created unnecessary GC and GPU work.
     if(u.ledOn!==r.on){u.led.material=col(r.on?0x9bbe72:0x4c5b41);u.ledOn=r.on;}
   }
   const volume=active&&r.on&&now>=r.since?distanceGain(it.pos,18)*.55:0;
   let q=radios.get(it);
   if(volume>.001){
     q??=stream(it);
     if(q&&q.world===W.group){
       const station=STATIONS[r.station]||STATIONS[0];
       if(q.loaded!==r.station){
         q.audio.pause();q.audio.playbackRate=1;
         q.audio.src=import.meta.env.BASE_URL+'audio/'+station.file+'.ogg';
         q.loaded=r.station;q.check=0;q.tryAt=0;q.aligned='';q.lastSeek=0;
       }
       // The host sends the station and origin timestamp once. Each peer plays the
       // audio locally; there is no audio waveform to relay via WebSocket.
       if(q.audio.readyState>=2){
         if(q.audio.paused&&!q.playing&&now>=q.tryAt){
           q.playing=true;
           const alignedKey=r.station+':'+r.since+':'+r.offset;
           const phase=radioPhase(r,now,q.audio.duration);
           // Buffer interruptions are corrected while silent, before playback resumes.
           const stalled=q.aligned===alignedKey&&Math.abs(wrappedDrift(phase,q.audio.currentTime,q.audio.duration))>.35;
           if(q.aligned!==alignedKey||stalled){
             if(Number.isFinite(phase)&&Number.isFinite(q.audio.duration)&&q.audio.duration>0)try{q.audio.currentTime=phase;q.lastSeek=now;}catch{}
             q.aligned=alignedKey;
           }
           q.audio.play().catch(()=>{q.tryAt=serverNow()+1500;}).finally(()=>{q.playing=false;});
         }else if(!q.audio.paused&&now>=q.check){
           q.check=now+1500;
           const phase=radioPhase(r,now,q.audio.duration);
           const change=radioCorrection(phase,q.audio.currentTime,q.audio.duration,{secondsSinceSeek:(now-q.lastSeek)/1000});
           if(change.seek!==null){try{q.audio.currentTime=change.seek;q.lastSeek=now;}catch{}}
           q.audio.playbackRate=change.rate;
         }
       }
     }
   }
   if(q){
     if(!q.audio.paused)audible=Math.max(audible,volume/.25);
     q.spatial.set(it.pos,volume>.001?.55:0);
     if(!active||!r.on||volume<=.001){
       if(!q.audio.paused)q.audio.pause();
       q.audio.playbackRate=1;
       q.aligned=''; // when audible again, resume at the current shared phase
     }
   }
 }
 setRadioFocus(active?audible:0);
}

export const radioPlayback=it=>radios.get(it)?.audio;
