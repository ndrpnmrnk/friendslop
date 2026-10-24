const KEY='friendslop.lastFaults';
export function lastFaults(){try{const q=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(q)?q.slice(-5):[];}catch{return[];}}
let last='',at=0;
export function recordFault(error,context={}){const message=String(error?.message||error||'unknown').slice(0,300),now=Date.now();if(message===last&&now-at<3000)return;last=message;at=now;try{const list=lastFaults();list.push({version:'0.43.0',at:new Date(now).toISOString(),message,stack:String(error?.stack||'').slice(0,1600),...context});localStorage.setItem(KEY,JSON.stringify(list.slice(-5)));}catch{}}
addEventListener('error',e=>{if(e.error)recordFault(e.error,{source:'window'});});
addEventListener('unhandledrejection',e=>recordFault(e.reason,{source:'promise'}));

// Последний редкий снимок позволяет отличить аварию процесса от обработанной ошибки JS.
let heartbeat=0;
export function runtimeCheckpoint(dt,context){heartbeat-=dt;if(heartbeat>0)return;heartbeat=5;try{localStorage.setItem('friendslop.runtime',JSON.stringify({version:'0.43.0',at:Date.now(),...context}));}catch{}}
export function lastRuntime(){try{return JSON.parse(localStorage.getItem('friendslop.runtime'));}catch{return null;}}
