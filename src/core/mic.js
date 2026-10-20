/* Микрофон (голосовой ввод): пока только громкость — персонаж «говорит» и «кричит», мир реагирует на крик.
   Голосовой чат между игроками появится вместе с мультиплеером; этот модуль — его основа (поток уже есть).
   Настройки хранятся в localStorage: включён ли, устройство, режим (всегда / зажать V), чувствительность. */
const KEY = 'friendslop.mic';
export const MIC = { on: false, device: '', mode: 'always', sens: 0.5, loudSens: 0.5, floor: 0.25, level: 0, talk: 0, shout: 0, ok: false, err: '', stream: null };
let ac = null, an = null, src = null, buf = null;
try { Object.assign(MIC, JSON.parse(localStorage.getItem(KEY) || '{}'), { level: 0, talk: 0, shout: 0, ok: false, err: '', stream: null }); } catch (_) {}
export function saveMic() { try { localStorage.setItem(KEY, JSON.stringify({ on: MIC.on, device: MIC.device, mode: MIC.mode, sens: MIC.sens, loudSens: MIC.loudSens, floor: MIC.floor })); } catch (_) {} }

export async function startMic() {
  stopMic(); MIC.err = '';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { MIC.err = 'нет доступа'; return false; }
  try {
    MIC.stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: MIC.device ? { exact: MIC.device } : undefined, echoCancellation: true, noiseSuppression: true } });
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') await ac.resume();
    src = ac.createMediaStreamSource(MIC.stream); an = ac.createAnalyser(); an.fftSize = 512; buf = new Float32Array(an.fftSize); src.connect(an);
    MIC.ok = true; return true;
  } catch (e) { MIC.err = e && e.name === 'NotAllowedError' ? 'доступ запрещён' : 'не удалось включить'; MIC.ok = false; return false; }
}
export function stopMic() { if (MIC.stream) MIC.stream.getTracks().forEach(t => t.stop()); MIC.stream = null; if (src) src.disconnect(); src = an = null; MIC.ok = false; MIC.level = MIC.talk = MIC.shout = 0; }
export async function listMics() { try { return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput'); } catch (_) { return []; } }

/* Громкость → «говорит» (0..1) и «кричит» (0..1).
   Фон (шум комнаты) отслеживается сам: тихие моменты опускают «пол» быстро, громкие поднимают медленно —
   поэтому шумный микрофон не «говорит» сам по себе. Порог речи = фон + запас (ползунок «Чувствительность»),
   порог крика — выше на отдельный запас (ползунок «Крик»). Кнопка «Калибровка» меряет тишину 2 с. */
export function updateMic(dt, pttHeld) {
  if (!MIC.ok || !an) { MIC.level = MIC.talk = MIC.shout = 0; return MIC; }
  an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  // громкость в децибелах (−60…0 дБ → 0…1): одинаково ведёт себя и на тихих, и на громких микрофонах
  const rms = Math.sqrt(s / buf.length), lvl = Math.max(0, Math.min(1, (20 * Math.log10(rms + 1e-6) + 60) / 60));
  MIC.level += (lvl - MIC.level) * Math.min(1, dt * (lvl > MIC.level ? 25 : 8));
  if (MIC.cal > 0) { MIC.cal -= dt; MIC.calMax = Math.max(MIC.calMax || 0, MIC.level); if (MIC.cal <= 0) { MIC.floor = Math.min(0.5, MIC.calMax * 1.1); saveMic(); } }
  else if (MIC.level < MIC.floor) MIC.floor += (MIC.level - MIC.floor) * Math.min(1, dt * 2); else MIC.floor += (MIC.level - MIC.floor) * Math.min(1, dt * 0.02);
  const thr = MIC.floor + 0.02 + (1 - MIC.sens) * 0.14, loud = Math.min(0.97, thr + 0.15 + (1 - MIC.loudSens) * 0.35), active = MIC.mode === 'always' || pttHeld;
  const talk = active && MIC.level > thr ? Math.min(1, (MIC.level - thr) / Math.max(0.05, loud - thr)) : 0, shout = active && MIC.level > loud ? Math.min(1, (MIC.level - loud) / Math.max(0.05, 1 - loud) * 2) : 0;
  MIC.talk += (talk - MIC.talk) * Math.min(1, dt * 14); MIC.shout += (shout - MIC.shout) * Math.min(1, dt * 10);
  MIC.thr = thr; MIC.loud = loud;
  return MIC;
}
export function calibrateMic() { MIC.cal = 2; MIC.calMax = 0; }
