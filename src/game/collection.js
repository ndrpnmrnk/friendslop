/* Постоянный профиль. Одна запись содержит и списание, и выдачу награды.
   Незавершённую оплаченную попытку можно восстановить после закрытия вкладки. */
const KEY='friendslop.collection.v1',BACKUP=KEY+'.backup';
let ids=[],data=null;
const clean=v=>v&&v.version===1&&Number.isSafeInteger(v.coins)&&v.coins>=0&&Array.isArray(v.unlocked);
const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
function commit(next){try{localStorage.setItem(KEY,JSON.stringify(next));try{if(data)localStorage.setItem(BACKUP,JSON.stringify(data));}catch{}data=next;dispatchEvent(new CustomEvent('collectionchange'));return true;}catch{return false;}}
export function initCollection(all){if(data)return;ids=all.slice();let saved=read(KEY);if(!clean(saved))saved=read(BACKUP);
 const old=(()=>{try{return localStorage.getItem('friendslop.skin');}catch{return null;}})();
 data=clean(saved)?saved:{version:1,coins:0,unlocked:['cat','frog',...(ids.includes(old)?[old]:[])],selected:old||'cat',pending:null};
 data.unlocked=[...new Set(data.unlocked.filter(id=>ids.includes(id)))];if(!data.unlocked.length)data.unlocked=[ids[0]];
 if(!data.unlocked.includes(data.selected))data.selected=data.unlocked[0];
 if(data.pending){const next=structuredClone(data);if(ids.includes(next.pending.reward)){if(!next.unlocked.includes(next.pending.reward))next.unlocked.push(next.pending.reward);}else next.coins+=50;next.pending=null;commit(next);}
}
export const collection=()=>({coins:data?.coins||0,unlocked:[...(data?.unlocked||[])],selected:data?.selected||'cat',pending:data?.pending?{...data.pending}:null});
export const owns=id=>!!data?.unlocked.includes(id);
export const collectionOrder=()=>[...ids.filter(owns),...ids.filter(id=>!owns(id))];
export function selectCharacter(id){if(!owns(id))return false;const next={...data,selected:id};if(!commit(next))return false;try{localStorage.setItem('friendslop.skin',id);}catch{}return true;}
export function addCoins(n){if(!data||!Number.isSafeInteger(n)||n<1||data.coins>Number.MAX_SAFE_INTEGER-n)return false;return commit({...data,coins:data.coins+n});}
export function beginClaw(){if(!data||data.pending||data.coins<50||ids.every(owns))return false;return commit({...data,coins:data.coins-50,pending:{reward:null}});}
export function reserveClaw(id){if(!data?.pending||!ids.includes(id)||owns(id))return false;return commit({...data,pending:{reward:id}});}
export function finishClaw(){if(!data?.pending?.reward)return null;const id=data.pending.reward;if(!commit({...data,unlocked:[...new Set([...data.unlocked,id])],selected:id,pending:null}))return null;try{localStorage.setItem('friendslop.skin',id);}catch{}return id;}
export function refundClaw(){if(!data?.pending||data.pending.reward)return false;return commit({...data,coins:data.coins+50,pending:null});}
