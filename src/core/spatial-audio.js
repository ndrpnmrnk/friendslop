// Одна модель расстояния для эффектов, радио и живого голоса. Координаты мира - метры.
export const ears = { x:0, y:1.5, z:0 };
export function distanceGain(p,range=24){return Math.pow(Math.max(0,1-Math.hypot(p.x-ears.x,p.y-ears.y,p.z-ears.z)/range),1.3);}
export function spatialSource(ac,bus,range=24){
  const gain=ac.createGain(),pan=ac.createPanner();gain.gain.value=0;
  pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=1;pan.maxDistance=range;pan.rolloffFactor=0;
  gain.connect(pan);pan.connect(bus);
  let last=null;
  return {input:gain,gain,pan,set(p,volume=1){
    const t=ac.currentTime;for(const[k,v]of Object.entries({positionX:p.x,positionY:p.y,positionZ:p.z}))pan[k].value=v;
    const value=volume*distanceGain(p,range);if(last===null||Math.abs(value-last)>.001){gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(value,t,.06);last=value;}
  },dispose(){gain.disconnect();pan.disconnect();}};
}
