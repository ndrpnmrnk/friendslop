// A continuous music clock is phase-aligned using playbackRate, not repeated currentTime seeks.
// The only unavoidable seek is at start/station change or after severe long-lived drift.
export function wrappedDrift(expected,actual,duration){
  if(!Number.isFinite(duration)||duration<=0)return 0;
  return ((expected-actual+duration*1.5)%duration+duration)%duration-duration/2;
}
export function radioCorrection(expected,actual,duration,{starting=false,secondsSinceSeek=Infinity}={}){
  if(!Number.isFinite(expected)||!Number.isFinite(actual)||!Number.isFinite(duration)||duration<=0)return {rate:1,seek:null};
  if(starting)return {rate:1,seek:expected};
  const drift=wrappedDrift(expected,actual,duration),difference=Math.abs(drift);
  if(difference>4&&secondsSinceSeek>=15)return {rate:1,seek:expected};
  if(difference<.1)return {rate:1,seek:null};
  // Soft correction within +/-3% instead of audible mid-track seeks.
  return {rate:Math.max(.97,Math.min(1.03,1+drift*.035)),seek:null};
}
