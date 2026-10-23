const KEY='friendslop.lastFaults';
export function lastFaults(){try{const q=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(q)?q.slice(-5):[];}catch{return[];}}
let last='',at=0;
export function recordFault(error,context={}){const message=String(error?.message||error||'unknown').slice(0,300),now=Date.now();if(message===last&&now-at<3000)return;last=message;at=now;try{const list=lastFaults();list.push({version:'0.37.0',at:new Date(now).toISOString(),message,stack:String(error?.stack||'').slice(0,1600),...context});localStorage.setItem(KEY,JSON.stringify(list.slice(-5)));}catch{}}
addEventListener('error',e=>{if(e.error)recordFault(e.error,{source:'window'});});
addEventListener('unhandledrejection',e=>recordFault(e.reason,{source:'promise'}));
