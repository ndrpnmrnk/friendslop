export const radioState=it=>it.radio||(it.radio={on:false,station:0,since:0,offset:0});
export function changeRadio(it,action,now,step=1){
  const r=radioState(it);
  if(action==='toggle'){
    if(r.on){r.offset=Math.max(0,r.offset+(now-r.since)/1000);r.on=false;}
    else {r.on=true;r.since=now+500;}
  }else if(action==='tune'){r.station=(r.station+(step>0?1:2))%3;r.offset=0;r.since=now+650;}
  return r;
}
export const radioPhase=(r,now,duration)=>Number.isFinite(duration)&&duration>0?((r.offset+Math.max(0,now-r.since)/1000)%duration+duration)%duration:0;
