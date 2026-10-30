// Small pure vehicle helpers so collision recovery and pedal geometry can be tested
// without Three.js, browser APIs or a running lobby.
export const isMotorCar = kind => kind === 'kart' || kind === 'kidcar';
export const isCrashImpact = (speed, grace = 0, threshold = 6) =>
  Number.isFinite(speed) && speed > threshold && !(grace > 0);
export function pedalFoot(phase, side, seat = .88) {
  const s = side < 0 ? -1 : 1, p = Number.isFinite(phase) ? phase : 0;
  // Model crank center (.40, -.08), ±.24 m crank arms, ±.16 m pedals.
  return {x:s*.16,y:.40+s*.24*Math.cos(p)-seat,z:-.08+s*.24*Math.sin(p)};
}
export function safeMountCandidate(original, resolve, maxDistance = 1.75) {
  if(!original || !Number.isFinite(original.x) || !Number.isFinite(original.z))return null;
  let p={x:original.x,z:original.z};
  // Repeatedly push away from overlapping static collisions.
  for(let i=0;i<3;i++)resolve(p);
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||
    Math.hypot(p.x-original.x,p.z-original.z)>maxDistance)return null;
  return p;
}
