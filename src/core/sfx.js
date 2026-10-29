import { random } from './random.js';
import { ears, spatialSource, distanceGain } from './spatial-audio.js';
/* Ретро-звуки, синтезированные в коде (без файлов): квадрат/треугольник/шум + огибающая.
   Звук включается после первого клика (требование браузера). M — без звука. */
let ac = null, master = null, noiseBuf = null, amb = null, muted = false;
const mix={effects:1,ambient:.65,music:.8,radio:1,voice:1},buses={};let route='effects',radioFocus=0,output=null,soundRouter=null;
export const setSoundRouter=fn=>{soundRouter=fn;};
export const hasSound=name=>Object.hasOwn(SND,name);
try{const saved=JSON.parse(localStorage.getItem('friendslop.audio')||'{}');for(const k in mix)if(Number.isFinite(saved[k]))mix[k]=Math.max(0,Math.min(1,saved[k]));}catch{}
export const audioLevels=()=>({...mix});
function mixGain(k){return mix[k]*(k==='music'?1-radioFocus*.78:1);}
export function setAudioLevel(k,value){if(!(k in mix))return;mix[k]=Math.max(0,Math.min(1,Number(value)||0));try{localStorage.setItem('friendslop.audio',JSON.stringify(mix));}catch{}if(buses[k])buses[k].gain.setTargetAtTime(mixGain(k),ac.currentTime,.06);}
export function setRadioFocus(value){const next=Math.max(0,Math.min(1,value*mix.radio));if(Math.abs(next-radioFocus)<.015)return;radioFocus=next;if(buses.music)buses.music.gain.setTargetAtTime(mixGain('music'),ac.currentTime,next>.1?.16:.65);}

try { muted = localStorage.getItem('friendslop.mute') === '1'; } catch (_) {}
export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume().catch(()=>{}); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
  for(const k in mix){const gain=ac.createGain();gain.gain.value=mixGain(k);if(k==='effects'){const compressor=ac.createDynamicsCompressor();compressor.threshold.value=-15;compressor.knee.value=12;compressor.ratio.value=2.5;compressor.attack.value=.004;compressor.release.value=.16;gain.connect(compressor);compressor.connect(master);}else gain.connect(master);buses[k]=gain;}
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = random() * 2 - 1;
}
export function toggleMute() { muted = !muted; try { localStorage.setItem('friendslop.mute', muted ? '1' : '0'); } catch (_) {} if (master) master.gain.value = muted ? 0 : 0.5; return muted; }
export function audioBus(channel){return ac&&master?{ac,master:buses[channel]||master}:null;}

function tone(f0, f1, dur, type = 'square', vol = 0.2, at = 0, pan = 0) {
  if (!ac) return; const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = g; if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  o.connect(g); node.connect(output||buses[route]||master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, f = 1200, q = 1, at = 0, type = 'bandpass', f1) {
  if (!ac) return; const t = ac.currentTime + at, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(output||buses[route]||master); s.start(t, random() * 0.5); s.stop(t + dur + 0.02);
}
// v0.56: мультяшный «птичий» крик при залпе рогатки — пила через форманту + вибрато, голос «уи-и-и» / «я-я-я»
function cry(pts, vol = .12, at = 0, vib = 9, depth = .06, formant = 1400) {
  if (!ac) return; const t = ac.currentTime + at, o = ac.createOscillator(), l = ac.createOscillator(), lg = ac.createGain(), fl = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'sawtooth'; fl.type = 'bandpass'; fl.frequency.value = formant; fl.Q.value = 1.6; l.frequency.value = vib;
  o.frequency.setValueAtTime(pts[0][0], t); for (const [f, k] of pts.slice(1)) o.frequency.exponentialRampToValueAtTime(f, t + k);
  const dur = pts[pts.length - 1][1]; lg.gain.value = pts[0][0] * depth; l.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .04); g.gain.setValueAtTime(vol, t + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(fl); fl.connect(g); g.connect(output||buses[route]||master); o.start(t); l.start(t); o.stop(t + dur + .03); l.stop(t + dur + .03);
}
const CRIES = [
  () => cry([[520, 0], [1150, .35], [900, .9]], .13, 0, 11, .07, 1600),            // «уи-и-и-и!»
  () => { cry([[300, 0], [620, .12], [560, .5]], .12, 0, 7, .05, 900); cry([[640, 0], [980, .25], [700, .55]], .07, .45, 12, .08, 1800); }, // «я-а — ху!»
  () => cry([[700, 0], [1400, .2], [1300, .5], [600, 1.1]], .11, 0, 14, .09, 2000),  // «и-и-и-и-у-у»
  () => { for (let i = 0; i < 3; i++) cry([[420 + i * 90, 0], [760 + i * 120, .14], [500 + i * 60, .26]], .1, i * .2, 8, .04, 1200); }, // «я-я-я!»
  () => cry([[260, 0], [380, .3], [1200, .7], [1000, 1.0]], .12, 0, 6, .05, 1100),   // «ва-а-а-ау!»
];
const SND = {
  birdcry: s => { const k = s.k ?? (random() * CRIES.length | 0); CRIES[k % CRIES.length](); noise(.5, .05, 2200, .7, .05, 'bandpass', 600); },
  // v0.59: ровный металлический скрежет при катании по перилам (короткие перекрывающиеся кусочки)
  grind: s => { noise(.16, .05 * (s.v ?? 1), 3400, 6, 0, 'bandpass'); noise(.16, .025 * (s.v ?? 1), 900, 3, 0, 'bandpass'); },
  clap: s => { noise(.06, .22 * (s.v ?? 1), 2600, .9); noise(.05, .12 * (s.v ?? 1), 1200, 1.5, .01); tone(900, 500, .05, 'square', .03); },
  fabric:s=>{noise(.13,.04*(s.v??1),1150,.65);tone(480,330,.055,'triangle',.026*(s.v??1),.06);},
  dash:s=>noise(.16,.035*(s.v??1),1900,.6,0,'bandpass',700),
  switch:()=>{tone(380,210,.06,'triangle',.045);noise(.04,.025,1800,1);},
  radioStatic:s=>noise(.14,.13*(s.v??1),1600,.65,0,'bandpass'),
  vanDrive:s=>{tone(80,170,.9,'sawtooth',.055*(s.v??1));noise(.5,.04*(s.v??1),250,.8);},
  kidYelp:s=>{const v=s.v??1,p=s.p??1;for(let i=0;i<3;i++){tone((620+i*93)*p,(1050-i*105)*p,.18,'sawtooth',.065*v,i*.13);tone((860+i*70)*p,(1190-i*100)*p,.17,'triangle',.04*v,i*.13);}},
  bongBubble:s=>{const v=s.v??1;noise(.16,.06*v,450,.7);tone(180,90,.16,'sine',.05*v);},
  bongExhale:s=>noise(.15,.055*(s.v??1),800,.7,0,'lowpass'),
  cosmoShot:s=>tone(1100,140,.14,'sawtooth',.06*(s.v??1)),
  cosmoHit:s=>{tone(420,130,.15,'square',.05*(s.v??1));noise(.07,.07*(s.v??1),1200);},
  cosmoBaton:s=>{tone(300,80,.12,'sawtooth',.07*(s.v??1));noise(.08,.08*(s.v??1),900);},
  ufoArrive:s=>{for(let i=0;i<4;i++)tone(180+i*45,400-i*35,.6,'sine',.035*(s.v??1),i*.15);},
  // v0.23: колокол заданной высоты (колокола склепа)
  bellN: s => { const f = [392, 494, 587, 698, 784][s.n || 0]; tone(f, f * 0.98, 0.9, 'triangle', 0.12); tone(f * 2.01, f * 2, 0.5, 'sine', 0.04); },
  shutter: () => { noise(0.05, 0.2, 3000, 2); tone(1800, 900, 0.06, 'square', 0.05, 0.05); },
  beep: s => tone(1400 + (s.p || 0) * 600, 1400 + (s.p || 0) * 600, 0.05, 'square', 0.05*(s.v??1)),
  // удар по материалу (v0.18): металл звенит, дерево стучит, бетон глухой, земля/трава мягкие, вода плещет, стекло звякает
  imp: s => { const v = s.v ?? 1, m = s.m || 'concrete';
    if (m === 'metal') { tone(620, 540, 0.22, 'triangle', 0.1 * v); tone(1240, 1100, 0.16, 'square', 0.03 * v); noise(0.06, 0.1 * v, 3500, 2); }
    else if (m === 'wood') { noise(0.1, 0.18 * v, 800, 2.5); tone(220, 120, 0.08, 'square', 0.06 * v); }
    else if (m === 'dirt') noise(0.14, 0.16 * v, 300, 0.7, 0, 'lowpass');
    else if (m === 'grass') noise(0.12, 0.12 * v, 900, 0.6, 0, 'bandpass', 400);
    else if (m === 'water') { noise(0.3, 0.16 * v, 1600, 0.8, 0, 'lowpass', 300); tone(500, 900, 0.08, 'sine', 0.05 * v, 0.03); }
    else if (m === 'glass') { for (let i = 0; i < 3; i++) tone(2600 + random() * 1800, 2000, 0.09, 'triangle', 0.04 * v, i * 0.02); }
    else if (m === 'cloth') noise(0.12, 0.1 * v, 600, 0.5, 0, 'lowpass');
    else { noise(0.08, 0.2 * v, 450, 1.2); tone(110, 60, 0.08, 'square', 0.07 * v); } },
  crow: () => { for (let i = 0; i < 2; i++) { noise(0.16, 0.08, 1300, 3, i * 0.22); tone(520, 380, 0.15, 'sawtooth', 0.05, i * 0.22); } },
  purr: s => { const k=Math.max(0,Math.min(1,s.p||0)),v=s.v??1;for(let i=0;i<8;i++){const at=i*(0.09-k*0.025);noise(0.065,0.07*v,140+k*35,1.5,at,'lowpass');tone(68,60,0.06,'triangle',0.018*v,at);} },
  curse: () => { [330, 280, 360, 250].forEach((f, i) => tone(f, f * 0.8, 0.07, 'square', 0.06, i * 0.07)); },
  confetti: () => { noise(0.08, 0.2, 3000, 1); for (let i = 0; i < 5; i++) tone(1500 + random() * 1500, 1200, 0.05, 'square', 0.03, 0.05 + i * 0.03); },
  fizz: () => noise(0.7, 0.14, 4000, 0.6, 0, 'highpass', 1500),
  feather: () => noise(0.25, 0.08, 2500, 0.5, 0, 'bandpass', 900),
  deadline: s => tone(700 + (s.urgency || 0) * 600, 660, 0.09, 'square', 0.12),
  step: s => noise(0.05, 0.05 * (s.v ?? 1), s.surf === 'grass' ? 700 : s.surf === 'metal' ? 3000 : s.surf === 'water' ? 900 : 1600, 2),
  jump: () => tone(220, 520, 0.12, 'square', 0.08),
  land: s => noise(0.09, 0.12 * Math.min(1, s.v ?? 1), 400, 1),
  dive: () => { noise(0.18, 0.1, 2000, 0.8, 0, 'bandpass', 600); tone(300, 160, 0.15, 'triangle', 0.08); },
  throw: () => noise(0.16, 0.1, 2500, 1, 0, 'bandpass', 900),
  hit:s=>{const v=s.v??1;noise(.075,.13*v,700,1.2);tone(190,65,.12,'triangle',.10*v);tone(820,460,.035,'square',.025*v);},
  glass: () => { for (let i = 0; i < 6; i++) tone(2400 + random() * 2400, 1800, 0.12, 'triangle', 0.05, i * 0.02); noise(0.2, 0.12, 5000, 1); },
  wood: () => { noise(0.14, 0.2, 700, 2); tone(180, 90, 0.12, 'square', 0.06); },
  splash: () => noise(0.35, 0.16, 1400, 0.8, 0, 'lowpass', 300),
  points: () => { tone(660, 660, 0.07, 'square', 0.08); tone(990, 990, 0.1, 'square', 0.08, 0.07); },
  done: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.12, 'square', 0.08, i * 0.07)); },
  count: () => tone(440, 440, 0.15, 'square', 0.1),
  go: () => { tone(880, 880, 0.35, 'square', 0.1); tone(660, 660, 0.35, 'triangle', 0.08); },
  tick: () => tone(1800, 1600, 0.025, 'square', 0.05),
  win: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, f * 1.01, 0.18, 'square', 0.07, i * 0.09)); },
  click: () => tone(900, 700, 0.05, 'square', 0.07),
  hover: () => tone(1200, 1200, 0.025, 'square', 0.03),
  ladder: () => { for (let i = 0; i < 4; i++) tone(320 - i * 30, 180, 0.08, 'square', 0.07, i * 0.06); noise(0.3, 0.1, 900, 2, 0.2); },
  alarm: () => { for (let i = 0; i < 6; i++) tone(i % 2 ? 900 : 650, i % 2 ? 900 : 650, 0.2, 'square', 0.05, i * 0.22); },
  hydrant: () => noise(1.2, 0.12, 1800, 0.6, 0, 'bandpass', 900),
  bell: () => { tone(523, 520, 1.6, 'triangle', 0.14); tone(1046, 1040, 1.2, 'sine', 0.06); tone(1567, 1560, 0.8, 'sine', 0.04); },
  boom: () => { noise(0.6, 0.3, 300, 0.7, 0, 'lowpass', 60); for (let i = 0; i < 6; i++) tone(1200 + random() * 1600, 400, 0.15, 'triangle', 0.04, 0.1 + i * 0.05); },
  can: () => { tone(1400, 900, 0.05, 'square', 0.06); noise(0.15, 0.08, 3000, 3, 0.05); },
  water: () => noise(0.12, 0.08, 2600, 1.5, 0, 'bandpass', 1400),
  candy: () => tone(700, 1400, 0.06, 'square', 0.06),
  pop: () => { noise(0.08, 0.2, 2000, 0.6); for (let i = 0; i < 5; i++) tone(800 + i * 200, 1600, 0.06, 'square', 0.03, 0.02 * i); },
  spring: () => tone(150, 900, 0.25, 'triangle', 0.12),
  ghost: () => tone(300, 500, 0.6, 'sine', 0.08),
  drink: () => { for (let i = 0; i < 4; i++) noise(0.05, 0.08, 800, 3, i * 0.08); tone(400, 900, 0.2, 'square', 0.05, 0.35); },
  pickup: () => { tone(880, 1320, 0.08, 'square', 0.07); tone(1320, 1760, 0.08, 'square', 0.06, 0.06); },
  event: () => { tone(220, 110, 0.4, 'sawtooth', 0.08); tone(330, 165, 0.4, 'square', 0.05, 0.05); },
  bounce: () => tone(200, 700, 0.18, 'triangle', 0.1),
  mantle: () => noise(0.1, 0.08, 900, 1),
  hide: () => noise(0.25, 0.1, 600, 1, 0, 'lowpass', 200),
  // «ква»: два коротких низких рыка с дрожанием
  croak: s => frog([[170, 0.22], [150, 0.26, 0.3]], s.v),
  // голос рептилоида: разные «ква» под действия
  frog_jump: s => frog([[250, 0.14, 0, 0.95]], s.v),
  frog_land: s => frog([[130, 0.22]], s.v),
  frog_hurt: s => frog([[230, 0.5, 0, 0.5]], s.v),
  frog_throw: s => frog([[200, 0.12], [235, 0.14, 0.15]], s.v),
  frog_dive: s => frog([[270, 0.18, 0, 0.7]], s.v),
  frog_happy: s => frog([[190, 0.12, 0, 1.05], [235, 0.12, 0.15, 1.05], [290, 0.2, 0.3, 1.1]], s.v),
  frog_idle: s => frog(random() < 0.5 ? [[165, 0.24], [150, 0.28, 0.32]] : [[180, 0.3]], s.v),
  fish: () => tone(500, 300, 0.1, 'triangle', 0.06),
  // инструменты
  swat: s => { noise(0.08, 0.2 * (s.v ?? 1), 2500, 1.2); tone(300, 120, 0.06, 'square', 0.06); },
  pillow: s => { noise(0.22, 0.18 * (s.v ?? 1), 500, 0.7, 0, 'lowpass', 200); },
  umbrella: () => { noise(0.18, 0.12, 1500, 0.8, 0, 'bandpass', 600); tone(500, 800, 0.06, 'square', 0.04); },
  drop: () => noise(0.06, 0.08, 900, 1),
  squeak: s => { tone(1300, 1900, 0.09, 'square', 0.07 * (s.v ?? 1)); tone(1900, 1200, 0.12, 'square', 0.06 * (s.v ?? 1), 0.09); },
  bubble: s => tone(400, 1100, 0.14, 'sine', 0.1 * (s.v ?? 1)),
  whistle: () => { tone(2600, 2700, 0.5, 'square', 0.07); tone(2650, 2600, 0.5, 'triangle', 0.05); for (let i = 0; i < 8; i++) tone(2600, 2400, 0.03, 'square', 0.03, i * 0.06); },
  fuse: () => noise(0.5, 0.08, 4000, 2, 0, 'highpass'),
  spray: s => noise(0.28, 0.08 * (s.v ?? 1), 3000, 0.6, 0, 'highpass'),
  magnet: () => tone(90, 110, 0.28, 'sawtooth', 0.04),
  slip: s => { tone(900, 200, 0.3, 'triangle', 0.1 * (s.v ?? 1)); noise(0.1, 0.12 * (s.v ?? 1), 800, 1, 0.25); },
  grab: s => { noise(0.07, 0.12 * (s.v ?? 1), 1200, 1); tone(220, 330, 0.08, 'square', 0.05 * (s.v ?? 1)); },
  door: s => { noise(0.2, 0.3 * (s.v ?? 1), 300, 0.8, 0, 'lowpass', 90); tone(120, 60, 0.15, 'square', 0.08 * (s.v ?? 1)); },
  // эмоции
  emote_wave: s => { tone(520, 700, 0.1, 'triangle', 0.07 * (s.v ?? 1)); tone(700, 880, 0.12, 'triangle', 0.06 * (s.v ?? 1), 0.1); },
  emote_dance: s => { [523, 659, 784, 659, 880, 784].forEach((f, i) => tone(f, f, 0.12, 'square', 0.04 * (s.v ?? 1), i * 0.14)); },
  emote_laugh: s => { for (let i = 0; i < 5; i++) tone(420 - i * 20, 300 - i * 20, 0.09, 'square', 0.06 * (s.v ?? 1), i * 0.12); },
  emote_clap: s => { tone(660, 990, 0.12, 'triangle', 0.05 * (s.v ?? 1)); },
  emote_call: s => { tone(600, 900, 0.18, 'triangle', 0.09 * (s.v ?? 1)); tone(900, 700, 0.25, 'triangle', 0.08 * (s.v ?? 1), 0.22); },
  // миссии, события, город
  chop: () => { noise(0.05, 0.18, 2000, 1.4); tone(700, 400, 0.04, 'square', 0.04); },
  ring: () => { for (let i = 0; i < 6; i++) tone(i % 2 ? 1300 : 1600, i % 2 ? 1300 : 1600, 0.07, 'square', 0.05, i * 0.08); },
  msg: () => { tone(880, 1320, 0.07, 'square', 0.06); tone(1320, 1760, 0.1, 'square', 0.05, 0.07); },
  screw: () => noise(0.07, 0.08, 3000, 3),
  fire: s => noise(0.4, 0.06 * (s.v ?? 1), 700, 0.5, 0, 'lowpass', 300),
  hiss: s => noise(0.5, 0.12 * (s.v ?? 1), 2500, 0.6, 0, 'bandpass', 900),
  goal: () => { for (let i = 0; i < 3; i++) tone(392 + i * 131, 392 + i * 131, 0.25, 'square', 0.08, i * 0.12); noise(0.5, 0.1, 1500, 0.5, 0.3); },
  moth: s => tone(70, 90, 0.3, 'sawtooth', 0.05 * (s.v ?? 1)),
  bonk: s => { tone(800, 300, 0.1, 'square', 0.09 * (s.v ?? 1)); noise(0.06, 0.12 * (s.v ?? 1), 1500, 1); },
  hill: () => tone(1046, 1046, 0.05, 'square', 0.04),
  meow: s => { const v = s.v ?? 1; tone(650, 1150, 0.12, 'triangle', 0.09 * v); tone(1150, 560, 0.22, 'triangle', 0.08 * v, 0.12); },
  wave: () => { [523, 659, 784].forEach((f, i) => tone(f, f * 1.02, 0.09, 'square', 0.07, i * 0.06)); noise(0.25, 0.05, 3000, 0.8, 0.15); },
  podium: s => { const k = s.k || 0; tone(330 + k * 110, 660 + k * 110, 0.16, 'square', 0.08); noise(0.12, 0.06, 1800, 1, 0.05); },
  fanfare: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, f, i === 5 ? 0.45 : 0.12, 'square', 0.08, i * 0.11)); },
  crown: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.1, 'square', 0.06, i * 0.07)); },
  combo: s => { const k = s.k || 2; for (let i = 0; i < k; i++) tone(660 + i * 220, 660 + i * 220, 0.08, 'square', 0.07, i * 0.06); },
  bark: s => { noise(0.07, 0.16 * (s.v ?? 1), 700, 1.5); tone(330, 220, 0.08, 'square', 0.08 * (s.v ?? 1)); },
  granny: s => { tone(700, 500, 0.15, 'triangle', 0.08 * (s.v ?? 1)); tone(760, 520, 0.2, 'triangle', 0.08 * (s.v ?? 1), 0.18); },
  horn: s => { tone(220, 220, 0.5, 'sawtooth', 0.06 * (s.v ?? 1)); tone(277, 277, 0.5, 'sawtooth', 0.05 * (s.v ?? 1)); },
  honk: s => { tone(500, 500, 0.12, 'square', 0.07 * (s.v ?? 1)); tone(500, 500, 0.12, 'square', 0.07 * (s.v ?? 1), 0.16); },
  wind: () => noise(1.6, 0.1, 500, 0.4, 0, 'bandpass', 1400),
  zip: s => noise(0.3, 0.06 * (s.v ?? 1), 3500, 4),
  roll: s => noise(0.3, 0.12 * (s.v ?? 1), 200, 0.6, 0, 'lowpass', 120),
  thunder: () => { noise(1.8, 0.25, 160, 0.4, 0, 'lowpass', 50); noise(0.3, 0.15, 600, 0.5, 0.05); },
  gull: s => { tone(1400, 900, 0.18, 'triangle', 0.05 * (s.v ?? 1)); tone(1300, 900, 0.16, 'triangle', 0.04 * (s.v ?? 1), 0.2); },
  fart: s => { const v = s.v ?? 1; for (let i = 0; i < 9; i++) tone(95 + random() * 30, 70, 0.06, 'sawtooth', 0.09 * v, i * 0.045); noise(0.4, 0.05 * v, 200, 1); },
  open: s => { tone(260, 180, 0.12, 'square', 0.05 * (s.v ?? 1)); noise(0.1, 0.06 * (s.v ?? 1), 1200, 1); },
};
// кваканье: низкая пила с «дрожанием» (быстрое повторение импульсов) + немного шума
/* «КВА» как слог: щелчок «к» (короткий шум) + голосовое «ва» — пила с высотой голоса проходит через
   формантные фильтры, которые плывут от «у» к «а» (как рот открывается). Лёгкое горловое дребезжание.
   parts: [высота Гц, длительность, задержка, падение высоты] */
function frog(parts, v = 1) {
  if (!ac) return;
  const jit = 0.94 + random() * 0.12;
  for (const [f, d, at = 0, fall = 0.8] of parts) {
    const t = ac.currentTime + at, f0 = f * jit;
    noise(0.03, 0.18 * v, 2200, 1.2, at);
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 0.92, t); o.frequency.linearRampToValueAtTime(f0 * 1.08, t + d * 0.3); o.frequency.exponentialRampToValueAtTime(f0 * fall, t + d);
    const creak = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(); creak.gain.value = 0.8; lfo.frequency.value = 26; lg.gain.value = 0.22; lfo.connect(lg); lg.connect(creak.gain);
    const env = ac.createGain(); env.gain.setValueAtTime(0.0001, t + 0.012); env.gain.exponentialRampToValueAtTime(0.6 * v, t + 0.04); env.gain.setValueAtTime(0.6 * v, t + d * 0.65); env.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(creak);
    for (const [fa, fb, q, g] of [[320, 780, 7, 1.0], [760, 1220, 9, 0.7], [2500, 2600, 12, 0.18]]) {
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(fa, t); bp.frequency.exponentialRampToValueAtTime(fb, t + Math.min(0.09, d * 0.5));
      const fg = ac.createGain(); fg.gain.value = g * 2.2; creak.connect(bp); bp.connect(fg); fg.connect(env);
    }
    env.connect(output||buses.effects||master); o.start(t); lfo.start(t); o.stop(t + d + 0.03); lfo.stop(t + d + 0.03);
  }
}
// мировой звук: громкость по расстоянию до слушателя
export function setListener(x,y,z,forward,up={x:0,y:1,z:0}) {
  Object.assign(ears,{x,y,z});if(!ac)return;const l=ac.listener,t=ac.currentTime;
  if(l.positionX){for(const[k,v]of Object.entries({positionX:x,positionY:y,positionZ:z}))l[k].setTargetAtTime(v,t,.02);
    if(forward)for(const[k,v]of Object.entries({forwardX:forward.x,forwardY:forward.y,forwardZ:forward.z,upX:up.x,upY:up.y,upZ:up.z}))l[k].setTargetAtTime(v,t,.02);
  }else{l.setPosition(x,y,z);if(forward)l.setOrientation(forward.x,forward.y,forward.z,up.x,up.y,up.z);}
}
/* v0.59: у каждого звука свой радиус слышимости. Мелочь — 12–20 м, обычные действия — 25–30 м, громкое — 45–70 м,
   взрывы и гром — на всю карту. Затухание плавное (без «пола» громкости). Звуки, которые миссии ботов играют
   без точки (мини-игры написаны «для игрока»), идут из точки бота — SFX_FROM (см. bot-work.js). */
const RANGE = { step: 14, tick: 12, click: 12, hover: 10, spray: 16, squeak: 16, fabric: 14, pickup: 18, drop: 18, emote_wave: 22, emote_dance: 22, emote_laugh: 24, emote_call: 30, emote_clap: 22,
  throw: 22, jump: 18, land: 22, dive: 20, roll: 16, slip: 22, swat: 20, pillow: 22, grab: 18, door: 24, chop: 22, screw: 16, ring: 26, msg: 20, beep: 18, points: 20, done: 24, grind: 20, purr: 10, meow: 22, hiss: 22, bark: 32,
  bell: 60, alarm: 60, horn: 60, honk: 45, hydrant: 40, fire: 40, goal: 50, siren: 70, crow: 40, gull: 40, bong: 30, boom: 400, thunder: 400, fanfare: 400, podium: 400 };
export const SFX_FROM = { at: null, owner:null };
export function withSoundSource(actor,fn){const old={...SFX_FROM};SFX_FROM.at=actor?.pos;SFX_FROM.owner=actor?.netKey;try{return fn();}finally{Object.assign(SFX_FROM,old);}}
export function sfx(name, o = {}) {
  if (!o.at && SFX_FROM.at) o = { ...o, at: SFX_FROM.at, v: (o.v ?? 1) * .8 };
  if(soundRouter){o=soundRouter(name,o);if(!o)return;}
  if (!ac || muted || !SND[name]) return;
  const range=o.range??RANGE[name]??30;if(o.at&&!distanceGain(o.at,range))return;
  route=['wind','thunder','crow','gull','purr'].includes(name)?'ambient':'effects';
  const previous=output,emitter=o.at?spatialSource(ac,buses[route]||master,range):null;
  if(emitter){emitter.set(o.at);output=emitter.input;setTimeout(()=>emitter.dispose(),8000);}
  try{SND[name](o);}finally{route='effects';output=previous;}
}
// фон: ветер и далёкий гул города (шум через низкочастотный фильтр, медленно плавает)
export function ambience(on) {
  if (!ac) return;
  if (on && !amb) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const g = ac.createGain(); g.gain.value = 0.05;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    s.connect(f); f.connect(g); g.connect(buses.ambient); s.start(); amb = { s, lfo }; }
  if (!on && amb) { amb.s.stop(); amb.lfo.stop(); amb = null; }
}
// шум дождя: тихий шелест (шум через полосовой фильтр), включается погодой
let rainN = null;
export function rainLoop(on) {
  if (!ac) return;
  if (on && !rainN) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.4; const g = ac.createGain(); g.gain.value = 0.035; s.connect(f); f.connect(g); g.connect(buses.ambient); s.start(); rainN = s; }
  if (!on && rainN) { rainN.stop(); rainN = null; }
}
