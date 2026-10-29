// Network-safe compact state for the shared in-match FIST pickups.
// Host is the only authority for creation, physics and winning a pickup.
export const COIN_CAP=96;
export const coinRow=c=>[c.id,
 Math.round(c.pos.x*100)/100,Math.round(c.pos.y*100)/100,Math.round(c.pos.z*100)/100,
 c.fly?1:0];
export const validCoinRow=r=>Array.isArray(r)&&r.length===5&&Number.isSafeInteger(r[0])&&r[0]>=1&&r[0]<1000000
 &&r.slice(1,4).every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=10000)
 &&(r[4]===0||r[4]===1);
export function validateCoinSnapshot(rows){
 if(!Array.isArray(rows)||rows.length>COIN_CAP)return null;
 const seen=new Set();
 for(const row of rows){if(!validCoinRow(row)||seen.has(row[0]))return null;seen.add(row[0]);}
 return rows;
}
export class CoinAwards {
 constructor(){this.pending=new Map();}
 clear(){this.pending.clear();}
 grant(coin,to){
  if(!Number.isSafeInteger(coin)||coin<1||!Number.isSafeInteger(to)||to<1||this.pending.has(coin))return false;
  this.pending.set(coin,{to,at:0});return true;
 }
 acknowledge(coin,actor){const p=this.pending.get(coin);if(!p||p.to!==actor)return false;this.pending.delete(coin);return true;}
 flush(now,send){
  for(const [coin,p]of this.pending){
   if(p.at&&now-p.at<1500)continue;
   if(send(coin,p.to)!==false)p.at=now;
  }
 }
}
