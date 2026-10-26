import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {audioBus,sfx,setRadioFocus} from '../core/sfx.js';
import {W} from '../world/state.js';
import {raySolids} from '../world/physics.js';
export const STATIONS=[{title:'Третий шоколадный',freq:'88.3',file:'chocolate'},{title:'Семейный круг',freq:'96.7',file:'family'},{title:'Мелкий',freq:'104.2',file:'little'}];
const radios=new Map();
export function radioModel(){const g=new THREE.Group();g.name='boombox';g.add(compose('radio36',a=>{const dark=tmat(T.paintMetal(0x464653)),metal=tmat(T.metal());a(G.box,dark,0,0,0,.72,.38,.24);a(G.box,col(0x24212c),0,.012,.13,.68,.31,.025);for(const s of [-1,1]){a(G.cyl12,metal,s*.23,.01,.15,.135,.018,.135,Math.PI/2);a(G.cyl12,col(0x282630),s*.23,.01,.165,.115,.015,.115,Math.PI/2);a(G.cyl8,col(0x6e6b75),s*.23,.01,.18,.055,.025,.055,Math.PI/2);for(let i=0;i<5;i++)a(G.box,col(0x77717a),s*.23,.01+(i-2)*.039,.183,.19,.006,.009);a(G.box,dark,s*.28,.25,0,.055,.15,.055);}a(G.box,dark,0,.32,0,.61,.05,.055);a(G.box,col(0xa7a896),0,.09,.15,.14,.045,.013);a(G.box,col(0x171c24),0,-.065,.15,.14,.11,.015);for(const x of [-.035,.035])a(G.cyl8,col(0xb1a895),x,-.06,.166,.023,.01,.023,Math.PI/2);for(let i=0;i<4;i++)a(G.box,metal,(i-1.5)*.04,.197,.05,.025,.013,.06);a(G.cyl6,metal,.31,.44,-.08,.008,.29,.008,0,0,-.22);}));const dial=mesh(G.box,col(0xa94b4d),-.055,.09,.162,.008,.035,.008,g),led=mesh(G.box,col(0x4c5b41),.07,.09,.163,.018,.018,.008,g);g.userData.radio={dial,led};return g;}
const state=it=>it.radio||(it.radio={on:false,station:0,tune:0,tick:0,dial:0});
export function toggleRadio(it){const r=state(it);r.on=!r.on;if(r.on){r.tune=.5;r.tick=0;}else radios.get(it)?.audio.pause();sfx('click',{at:it.pos,range:8});}
export function tuneRadio(it,d){const r=state(it);r.station=(r.station+(d>0?1:2))%3;r.tune=.65;r.tick=0;radios.get(it)?.audio.pause();sfx('tick',{at:it.pos,range:7});}
export function nearRadio(a,ray){let best=null,dist=2;for(const it of W.items){if(it.type!=='boombox'||!['rest','placed'].includes(it.state))continue;const d=it.pos.distanceTo(a.pos.clone().add(new V3(0,.5,0)));if(d>=dist)continue;if(ray&&ray.ray.distanceToPoint(it.pos)>.45)continue;const from=a.pos.clone().add(new V3(0,1,0)),v=it.pos.clone().sub(from),len=v.length();if(raySolids(from,v.normalize(),len)<len-.2)continue;dist=d;best=it;}return best;}
function stream(it){let r=radios.get(it);if(r)return r;const bus=audioBus('radio');if(!bus)return null;const audio=new Audio();audio.preload='none';audio.loop=true;const source=bus.ac.createMediaElementSource(audio),gain=bus.ac.createGain();gain.gain.value=0;source.connect(gain);gain.connect(bus.master);r={audio,gain,source,loaded:-1,world:W.group};radios.set(it,r);return r;}
export function resetRadios(){setRadioFocus(0);for(const r of radios.values()){r.audio.pause();r.audio.removeAttribute('src');r.audio.load();r.source.disconnect();r.gain.disconnect();}radios.clear();}
export function updateRadios(dt,listener,active){
 let audible=0;
 for(const[it,q]of radios)if(it.state==='gone'||!it.g.parent){q.audio.pause();q.audio.removeAttribute('src');q.audio.load();q.source.disconnect();q.gain.disconnect();radios.delete(it);}
 for(const q of radios.values())if(q.world!==W.group){q.audio.pause();q.gain.gain.setTargetAtTime(0,q.gain.context.currentTime,.08);}
 for(const it of W.items){if(it.type!=='boombox'||it.state==='gone')continue;const r=state(it),u=it.g.userData.radio;r.dial+=(r.station-r.dial)*(1-Math.exp(-dt*9));u.dial.position.x=-.055+r.dial*.05;u.led.material=col(r.on?0x9bbe72:0x4c5b41);
  const distance=listener?listener.distanceTo(it.pos):100,volume=active&&r.on?Math.pow(Math.max(0,1-distance/18),1.7)*.55:0;
  if(r.tune>0){r.tune=Math.max(0,r.tune-dt);r.tick-=dt;if(r.on&&active&&r.tick<=0&&distance<18){r.tick=.12;sfx('radioStatic',{at:it.pos,range:18,v:.35});}}
  let q=radios.get(it);if(volume>.001&&r.tune<=0){q??=stream(it);if(q){if(q.loaded!==r.station){q.audio.src=import.meta.env.BASE_URL+'audio/'+STATIONS[r.station].file+'.ogg';q.loaded=r.station;}if(q.audio.paused)q.audio.play().catch(()=>{});}}
  if(q){if(!q.audio.paused&&r.tune<=0)audible=Math.max(audible,volume/.25);q.gain.gain.setTargetAtTime(r.tune>0?0:volume,q.gain.context.currentTime,.08);if(!active||!r.on||distance>21)q.audio.pause();}
 }
 setRadioFocus(active?audible:0);
}
