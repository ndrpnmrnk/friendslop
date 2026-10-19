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
  croak: s => { for (let k = 0; k < 2; k++) { const t0 = k * 0.2; tone(150, 105, 0.13, 'sawtooth', 0.09 * (s.v ?? 1), t0); tone(300, 210, 0.11, 'square', 0.035 * (s.v ?? 1), t0); noise(0.12, 0.04 * (s.v ?? 1), 500, 3, t0); } },
  fish: () => tone(500, 300, 0.1, 'triangle', 0.06),
};
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
