// Room-aware send frequency. The Durable Object relays each client state to up to seven peers.
// No extra messages are created; snapshots and commands remain in the same packets.
export function motionIntervalFor(players=1,queuedBytes=0){
  const n=Math.max(1,Math.min(8,players|0));
  const base=n<=3?.05:n<=5?.0625:n<=7?.0715:.0835; // 20 / 16 / ~14 / ~12 Hz
  if(queuedBytes>24576)return Math.max(base,.125);
  if(queuedBytes>8192)return Math.max(base,.1);
  return base;
}
export function worldIntervalFor(players=1){
  return players>=6?.25:.2; // 4 Hz for busy rooms, 5 Hz otherwise
}
// Gradual NTP-style filter: a single jittery ping must not jump the music playhead.
export function smoothClockOffset(previous,sample,initial=false){
  if(!Number.isFinite(sample))return previous;
  if(initial||!Number.isFinite(previous))return sample;
  const difference=Math.max(-120,Math.min(120,sample-previous));
  return previous+difference*.15;
}
