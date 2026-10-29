// Явные пороги с гистерезисом. PTT не зависит от громкости речи.
export function micGate(state,level,dt,{on,mode,pressed,open=.16,close=.10}){
 if(!on||(mode==='ptt'&&!pressed)){state.open=false;state.left=0;return false;}
 if(mode==='ptt'){state.open=true;return true;}
 if(level>=open){state.open=true;state.left=.35;}
 else if(state.open){if(level>=close)state.left=.35;else{state.left=Math.max(0,(state.left||0)-dt);if(!state.left)state.open=false;}}
 return !!state.open;
}
