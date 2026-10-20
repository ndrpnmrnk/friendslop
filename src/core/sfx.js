/* Ретро-звуки, синтезированные в коде (без файлов): квадрат/треугольник/шум + огибающая.
   Звук включается после первого клика (требование браузера). M — без звука. */
let ac = null, master = null, noiseBuf = null, amb = null, muted = false;
try { muted = localStorage.getItem('friendslop.mute') === '1'; } catch (_) {}
export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function toggleMute() { muted = !muted; try { localStorage.setItem('friendslop.mute', muted ? '1' : '0'); } catch (_) {} if (master) master.gain.value = muted ? 0 : 0.5; return muted; }

function tone(f0, f1, dur, type = 'square', vol = 0.2, at = 0, pan = 0) {
  if (!ac) return; const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = g; if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  o.connect(g); node.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, f = 1200, q = 1, at = 0, type = 'bandpass', f1) {
  if (!ac) return; const t = ac.currentTime + at, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const SND = {
  step: s => noise(0.05, 0.05 * (s.v ?? 1), s.surf === 'grass' ? 700 : s.surf === 'metal' ? 3000 : s.surf === 'water' ? 900 : 1600, 2),
  jump: () => tone(220, 520, 0.12, 'square', 0.08),
  land: s => noise(0.09, 0.12 * Math.min(1, s.v ?? 1), 400, 1),
  dive: () => { noise(0.18, 0.1, 2000, 0.8, 0, 'bandpass', 600); tone(300, 160, 0.15, 'triangle', 0.08); },
  throw: () => noise(0.16, 0.1, 2500, 1, 0, 'bandpass', 900),
  hit: s => { noise(0.1, 0.18 * (s.v ?? 1), 500, 1); tone(140, 70, 0.1, 'square', 0.08); },
  glass: () => { for (let i = 0; i < 6; i++) tone(2400 + Math.random() * 2400, 1800, 0.12, 'triangle', 0.05, i * 0.02); noise(0.2, 0.12, 5000, 1); },
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
  boom: () => { noise(0.6, 0.3, 300, 0.7, 0, 'lowpass', 60); for (let i = 0; i < 6; i++) tone(1200 + Math.random() * 1600, 400, 0.15, 'triangle', 0.04, 0.1 + i * 0.05); },
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
  frog_idle: s => frog(Math.random() < 0.5 ? [[165, 0.24], [150, 0.28, 0.32]] : [[180, 0.3]], s.v),
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
  spray: () => noise(0.28, 0.08, 3000, 0.6, 0, 'highpass'),
  magnet: () => tone(90, 110, 0.28, 'sawtooth', 0.04),
  slip: s => { tone(900, 200, 0.3, 'triangle', 0.1 * (s.v ?? 1)); noise(0.1, 0.12 * (s.v ?? 1), 800, 1, 0.25); },
  grab: s => { noise(0.07, 0.12 * (s.v ?? 1), 1200, 1); tone(220, 330, 0.08, 'square', 0.05 * (s.v ?? 1)); },
  door: s => { noise(0.2, 0.3 * (s.v ?? 1), 300, 0.8, 0, 'lowpass', 90); tone(120, 60, 0.15, 'square', 0.08 * (s.v ?? 1)); },
  // эмоции
  emote_wave: s => { tone(520, 700, 0.1, 'triangle', 0.07 * (s.v ?? 1)); tone(700, 880, 0.12, 'triangle', 0.06 * (s.v ?? 1), 0.1); },
  emote_dance: s => { [523, 659, 784, 659, 880, 784].forEach((f, i) => tone(f, f, 0.12, 'square', 0.04 * (s.v ?? 1), i * 0.14)); },
  emote_laugh: s => { for (let i = 0; i < 5; i++) tone(420 - i * 20, 300 - i * 20, 0.09, 'square', 0.06 * (s.v ?? 1), i * 0.12); },
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
  fart: s => { const v = s.v ?? 1; for (let i = 0; i < 9; i++) tone(95 + Math.random() * 30, 70, 0.06, 'sawtooth', 0.09 * v, i * 0.045); noise(0.4, 0.05 * v, 200, 1); },
  open: s => { tone(260, 180, 0.12, 'square', 0.05 * (s.v ?? 1)); noise(0.1, 0.06 * (s.v ?? 1), 1200, 1); },
};
// кваканье: низкая пила с «дрожанием» (быстрое повторение импульсов) + немного шума
/* «КВА» как слог: щелчок «к» (короткий шум) + голосовое «ва» — пила с высотой голоса проходит через
   формантные фильтры, которые плывут от «у» к «а» (как рот открывается). Лёгкое горловое дребезжание.
   parts: [высота Гц, длительность, задержка, падение высоты] */
function frog(parts, v = 1) {
  if (!ac) return;
  const jit = 0.94 + Math.random() * 0.12;
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
    env.connect(master); o.start(t); lfo.start(t); o.stop(t + d + 0.03); lfo.stop(t + d + 0.03);
  }
}
// мировой звук: громкость по расстоянию до слушателя
let listener = { x: 0, y: 0, z: 0 };
export function setListener(x, y, z) { listener.x = x; listener.y = y; listener.z = z; }
export function sfx(name, o = {}) {
  if (!ac || muted || !SND[name]) return;
  if (o.at) { const d = Math.hypot(o.at.x - listener.x, o.at.y - listener.y, o.at.z - listener.z); if (d > 30) return; o.v = (o.v ?? 1) * Math.max(0.15, 1 - d / 30); }
  SND[name](o);
}
// фон: ветер и далёкий гул города (шум через низкочастотный фильтр, медленно плавает)
export function ambience(on) {
  if (!ac) return;
  if (on && !amb) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const g = ac.createGain(); g.gain.value = 0.05;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    s.connect(f); f.connect(g); g.connect(master); s.start(); amb = { s, lfo }; }
  if (!on && amb) { amb.s.stop(); amb.lfo.stop(); amb = null; }
}
// шум дождя: тихий шелест (шум через полосовой фильтр), включается погодой
let rainN = null;
export function rainLoop(on) {
  if (!ac) return;
  if (on && !rainN) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.4; const g = ac.createGain(); g.gain.value = 0.035; s.connect(f); f.connect(g); g.connect(master); s.start(); rainN = s; }
  if (!on && rainN) { rainN.stop(); rainN = null; }
}
