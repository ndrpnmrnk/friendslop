import { finite, round } from './state-codec.js';
import {replicationTier,movementIntervalMs} from './replication-priority.js';

// Fast motion is piggybacked on existing actor messages: <=32 objects, <=8 KiB.
// Delayed far movers stay pending until next eligible send, never forgotten.
export const validMotion = row => Array.isArray(row) && row.length === 10 &&
  typeof row[0] === 'string' && row[0].startsWith('p:') &&
  row.slice(1).every(n => finite(n, 10000));

export class ActiveMotion {
  constructor(){this.last=new Map();this.sentAt=new Map();this.waitSince=new Map();this.cursor=0;}
  capture(movers,maxRows=32,maxBytes=8192,options=null){
    const entries=[...movers],n=entries.length,rows=[];let bytes=2,visited=0;
    if(!n)return rows;
    // Preserve legacy behavior for offline tests/callers without viewer context.
    if(!options?.viewers?.length){
      const start=this.cursor%n;
      for(;visited<n;visited++){
        const [key,b]=entries[(start+visited)%n];
        if(!b||b.dead||!b.mesh)continue;
        const values=[b.x,b.y,b.z,b.vx||0,b.vy||0,b.vz||0,b.mesh.rotation.x,b.mesh.rotation.y,b.mesh.rotation.z].map(round);
        if(!values.every(v=>finite(v,10000)))continue;
        const signature=JSON.stringify(values);
        if(this.last.get(key)===signature)continue;
        const row=[key,...values],cost=JSON.stringify(row).length+(rows.length?1:0);
        if(bytes+cost>maxBytes){if(rows.length)break;continue;}
        rows.push(row);bytes+=cost;this.last.set(key,signature);
        if(rows.length>=maxRows){visited++;break;}
      }
      this.cursor=(start+Math.max(1,visited))%n;
      return rows;
    }
    const {viewers,queued=0,now=performance.now()}=options;
    // Avoid excess payload when the host browser's websocket queue grows.
    const budget=Math.min(maxBytes,queued>24576?2048:queued>8192?4096:maxBytes);
    const candidates=[];
    for(let i=0;i<n;i++){
      const [key,b]=entries[i];
      if(!b||b.dead||!b.mesh)continue;
      const values=[b.x,b.y,b.z,b.vx||0,b.vy||0,b.vz||0,b.mesh.rotation.x,b.mesh.rotation.y,b.mesh.rotation.z].map(round);
      if(!values.every(v=>finite(v,10000)))continue;
      const signature=JSON.stringify(values);
      if(this.last.get(key)===signature)continue;
      const tier=replicationTier(b,viewers),last=this.sentAt.get(key);
      if(!this.waitSince.has(key))this.waitSince.set(key,now);
      const age=last==null?Math.max(0,now-this.waitSince.get(key)):Math.max(0,now-last);
      if(last!=null&&age<movementIntervalMs(tier,queued))continue;
      const row=[key,...values],cost=JSON.stringify(row).length+1;
      // Promote stale far objects to prevent permanent starvation by riders.
      const rank=age>=1200?0:tier==='high'?0:tier==='medium'?1:2;
      candidates.push({key,signature,row,cost,rank,age:last==null?age+1200:age,i});
    }
    candidates.sort((a,b)=>a.rank-b.rank||b.age-a.age||a.i-b.i);
    for(const c of candidates){
      if(rows.length>=maxRows)break;
      if(bytes+c.cost>budget)continue;
      rows.push(c.row);bytes+=c.cost;this.last.set(c.key,c.signature);this.sentAt.set(c.key,now);this.waitSince.delete(c.key);
    }
    // Removed objects should not retain old send timestamps forever.
    if(this.sentAt.size>movers.size+32){
      for(const key of this.sentAt.keys())if(!movers.has(key)){this.sentAt.delete(key);this.last.delete(key);this.waitSince.delete(key);}
    }
    return rows;
  }
  retry(){this.last.clear();this.sentAt.clear();this.waitSince.clear();}
  reset(){this.last.clear();this.sentAt.clear();this.waitSince.clear();this.cursor=0;}
}
