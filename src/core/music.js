/* Музыка и звуки районов (v0.21) — всё синтезируется кодом, без файлов.
   Музыка: ретро-синт в ля-миноре, 100 BPM, слои включаются по «накалу» (0..1):
   пэд → бочка → бас → хэт → арпеджио → малый → мелодия. Вступление подыгрывает отсчёту 3-2-1,
   по ходу раунда накал растёт, на событиях — резко выше, последние 10 с — финальный разгон и аккорд в конце.
   Районы: у каждого свой фон (гул толпы, гул техники, волны, вой ветра, шелест) + редкие «случайные» звуки. */
import { audio } from './sfx.js';

const BPM = 100, STEP = 60 / BPM / 4, CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]]; // Am F C E
const LEAD = [[76, -1, 74, 72, -1, 72, 71, 69], [72, -1, 69, -1, 72, 74, 72, -1], [67, -1, 72, 76, -1, 74, 72, 67], [68, -1, 71, 74, -1, 76, -1, -1]];
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
let M = null;

function ctx() { const a = audio(); if (!a) return null; if (!M) { const g = a.ac.createGain(); g.gain.value = 0; g.connect(a.master); M = { a, out: g, mode: 'off', k: 0, want: 0, step: 0, next: 0, timer: 0, bed: {}, oneT: 3, dist: null }; } return M; }
function note(f, t, dur, type, vol, cut = 2400, out) {
  const { ac } = M.a, o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter(); o.type = type; o.frequency.setValueAtTime(f, t);
  fl.type = 'lowpass'; fl.frequency.value = cut; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl); fl.connect(g); g.connect(out || M.out); o.start(t); o.stop(t + dur + 0.05);
}
function hit(t, dur, vol, f, type = 'bandpass', q = 1, out) {
  const { ac, noiseBuf } = M.a, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(out || M.out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function kick(t, v) { const { ac } = M.a, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g); g.connect(M.out); o.start(t); o.stop(t + 0.25); }

// один шаг (1/16) секвенсора
function play(i, t) {
  const k = M.k, bar = Math.floor(i / 16) % 4, s = i % 16, ch = CH[bar], fin = M.mode === 'final';
  if (s === 0) for (const n of ch) note(hz(n), t, STEP * 16 * 1.05, 'triangle', 0.035 + k * 0.02, 900 + k * 1400); // пэд
  if (k > 0.12 && s % 4 === 0) kick(t, 0.22 + k * 0.15);
  if (k > 0.22 && s % 2 === 0) note(hz(ch[0] - 24 + (s % 8 === 6 ? 7 : 0)), t, STEP * 1.8, 'square', 0.05 + k * 0.03, 300 + k * 500);
  if (k > 0.32 && (s % 2 === 1 || (k > 0.7 && true))) hit(t, 0.03, 0.03 + k * 0.03, 8000, 'highpass', 0.7);
  if (k > 0.42) { const n = ch[[0, 1, 2, 1][s % 4]] + 12 + (s >= 8 && k > 0.6 ? 12 : 0); note(hz(n), t, STEP * 0.9, 'square', 0.025 + k * 0.015, 1800 + k * 2000); }
  if (k > 0.55 && (s === 4 || s === 12)) { hit(t, 0.12, 0.12, 1800, 'bandpass', 0.8); note(180, t, 0.08, 'triangle', 0.05); }
  if (k > 0.78 && s % 2 === 0) { const n = LEAD[bar][s / 2]; if (n > 0) note(hz(n), t, STEP * 2.6, 'sawtooth', 0.03, 2600); }
  if (fin && s % 4 === 2) note(hz(81 + bar), t, STEP, 'square', 0.025, 4000);
}
function tick() {
  if (!M || M.mode === 'off') return; const now = M.a.ac.currentTime; if (M.next < now) M.next = now + 0.05;
  while (M.next < now + 0.2) { if (M.mode !== 'intro') play(M.step, M.next); M.step++; M.next += STEP; }
}
function start(mode) { if (!ctx()) return; M.mode = mode; if (!M.timer) M.timer = setInterval(tick, 40); const t = M.a.ac.currentTime; M.out.gain.cancelScheduledValues(t); M.out.gain.setTargetAtTime(0.9, t, 0.3); }

export const music = {
  // вступление: на «3» загорается пэд-аккорд, каждое число — нота выше, на «СТАРТ» — удар и пошёл ритм
  count(n) { if (!ctx()) return; if (M.mode === 'off' || M.mode === 'end') { start('intro'); M.k = 0; } const t = M.a.ac.currentTime + 0.01, base = [0, 69, 64, 60][n] || 60;
    note(hz(base), t, 0.5, 'square', 0.06, 2200); note(hz(base - 12), t, 0.9, 'triangle', 0.08, 900); for (const m of CH[0]) note(hz(m), t, 1.0, 'triangle', 0.02 + (4 - n) * 0.01, 700 + (4 - n) * 300); hit(t, 0.4 + (4 - n) * 0.2, 0.02, 400 + (4 - n) * 800, 'bandpass', 2); },
  go() { if (!ctx()) return; start('play'); const t = M.a.ac.currentTime + 0.01; kick(t, 0.5); hit(t, 0.6, 0.12, 3000, 'highpass', 0.5); for (const m of CH[0]) note(hz(m + 12), t, 0.7, 'square', 0.035, 3000); M.step = 0; M.next = t + STEP * 2; M.k = 0.15; },
  // финал: аккорд, затихание
  end() { if (!M || M.mode === 'off') return; const t = M.a.ac.currentTime + 0.02; M.mode = 'end'; kick(t, 0.5); for (const m of [57, 64, 69, 72, 76]) note(hz(m), t, 2.4, 'triangle', 0.05, 2000); hit(t, 1.2, 0.1, 5000, 'highpass', 0.5);
    M.out.gain.setTargetAtTime(0.0001, t + 1.2, 0.6); },
  stop() { if (!M) return; M.mode = 'off'; M.out.gain.setTargetAtTime(0.0001, M.a.ac.currentTime, 0.2); },
  // накал (0..1) задаёт игра каждый кадр; финал — последние секунды
  update(dt, want, final) { if (!M || M.mode === 'off' || M.mode === 'end' || M.mode === 'intro') return; M.mode = final ? 'final' : 'play'; M.k += (want - M.k) * Math.min(1, dt * (want > M.k ? 0.6 : 0.25)); },
};

/* ---------- звуки районов ---------- */
const AMB = { foodcourt: ['crowd', 'sizzle'], market: ['crowd', 'cart'], shops: ['crowd', 'bell'], plaza: ['crowd', 'pigeon'], construction: ['hum', 'clank'], gas: ['hum', 'buzz'],
  office: ['hum', 'beep'], hospital: ['hum', 'beep'], sewer: ['rumble', 'drip'], port: ['waves', 'gull'], cemetery: ['howl', 'owl'], park: ['leaves', 'cricket'], yard: ['leaves', 'cricket'],
  school: ['leaves', 'cricket'], skatepark: ['leaves', 'roll'] };
function bed(kind) {
  const { ac, noiseBuf } = M.a; if (M.bed[kind]) return M.bed[kind]; const g = ac.createGain(); g.gain.value = 0; g.connect(M.a.master); let src;
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.connect(lg);
  if (kind === 'hum' || kind === 'rumble') { src = ac.createOscillator(); src.type = 'sawtooth'; src.frequency.value = kind === 'hum' ? 55 : 38; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'hum' ? 220 : 120; src.connect(f); f.connect(g); lfo.frequency.value = 0.2; lg.gain.value = 3; lg.connect(src.frequency); }
  else { src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = ac.createBiquadFilter();
    const P = { crowd: ['bandpass', 520, 0.9, 0.35, 160], waves: ['lowpass', 420, 0.7, 0.11, 240], howl: ['bandpass', 650, 7, 0.07, 380], leaves: ['highpass', 3200, 0.5, 0.25, 600] }[kind];
    f.type = P[0]; f.frequency.value = P[1]; f.Q.value = P[2]; lfo.frequency.value = P[3]; lg.gain.value = P[4]; lg.connect(f.frequency); src.connect(f); f.connect(g); }
  src.start(); lfo.start(); return (M.bed[kind] = { g, vol: { hum: 0.05, rumble: 0.07, crowd: 0.06, waves: 0.09, howl: 0.05, leaves: 0.025 }[kind] });
}
function shot(kind) {
  const t = M.a.ac.currentTime + 0.02, o = M.a.master, v = 0.5;
  if (kind === 'cricket') for (let i = 0; i < 3; i++) note(4200, t + i * 0.07, 0.04, 'square', 0.012 * v, 6000, o);
  else if (kind === 'owl') { note(390, t, 0.35, 'sine', 0.05 * v, 900, o); note(350, t + 0.45, 0.5, 'sine', 0.05 * v, 900, o); }
  else if (kind === 'gull') for (let i = 0; i < 2; i++) { const a = M.a.ac.createOscillator(), g = M.a.ac.createGain(); a.type = 'sawtooth'; a.frequency.setValueAtTime(1500, t + i * 0.25); a.frequency.exponentialRampToValueAtTime(900, t + i * 0.25 + 0.2); g.gain.setValueAtTime(0.0001, t + i * 0.25); g.gain.exponentialRampToValueAtTime(0.02 * v, t + i * 0.25 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.25 + 0.22); a.connect(g); g.connect(o); a.start(t + i * 0.25); a.stop(t + i * 0.25 + 0.25); }
  else if (kind === 'clank') { note(620, t, 0.3, 'triangle', 0.04 * v, 4000, o); note(1240, t, 0.2, 'square', 0.012 * v, 4000, o); hit(t, 0.08, 0.05 * v, 3500, 'bandpass', 2, o); }
  else if (kind === 'drip') { const a = M.a.ac.createOscillator(), g = M.a.ac.createGain(); a.type = 'sine'; a.frequency.setValueAtTime(1500, t); a.frequency.exponentialRampToValueAtTime(500, t + 0.08); g.gain.setValueAtTime(0.04 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); a.connect(g); g.connect(o); a.start(t); a.stop(t + 0.15); }
  else if (kind === 'sizzle') hit(t, 0.9, 0.025 * v, 5000, 'highpass', 0.5, o);
  else if (kind === 'beep') { note(880, t, 0.1, 'sine', 0.025 * v, 3000, o); note(880, t + 0.3, 0.1, 'sine', 0.025 * v, 3000, o); }
  else if (kind === 'buzz') note(120, t, 0.6, 'sawtooth', 0.02 * v, 900, o);
  else if (kind === 'bell') for (let i = 0; i < 2; i++) note(1800 - i * 300, t + i * 0.15, 0.4, 'triangle', 0.02 * v, 5000, o);
  else if (kind === 'pigeon') for (let i = 0; i < 3; i++) note(320 - i * 20, t + i * 0.2, 0.15, 'sine', 0.03 * v, 800, o);
  else if (kind === 'cart' || kind === 'roll') hit(t, 0.9, 0.03 * v, kind === 'roll' ? 300 : 900, 'bandpass', 1.5, o);
}
export function districtAmb(dt, id) {
  if (!ctx()) return; const want = AMB[id] || null, t = M.a.ac.currentTime;
  if (want) bed(want[0]); for (const [k, b] of Object.entries(M.bed)) b.g.gain.setTargetAtTime(want && want[0] === k ? b.vol : 0, t, 0.8);
  if (want && (M.oneT -= dt) <= 0) { M.oneT = 4 + Math.random() * 7; shot(want[1]); }
}
