import { finite, round } from './state-codec.js';

// Only changing movers ride the existing actor messages, with an 8 KiB/32 object ceiling.
export const validMotion = row => Array.isArray(row) && row.length === 10 &&
  typeof row[0] === 'string' && row[0].startsWith('p:') &&
  row.slice(1).every(n => finite(n, 10000));

export class ActiveMotion {
  constructor(){this.last=new Map();this.cursor=0;}
  capture(movers,maxRows=32,maxBytes=8192){
    const entries=[...movers],n=entries.length,rows=[];let bytes=2,visited=0;
    if(!n)return rows;
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
  retry(){this.last.clear();}
  reset(){this.last.clear();this.cursor=0;}
}
