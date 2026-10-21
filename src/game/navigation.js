import { W } from '../world/state.js';
import { groundAt, solidsNear } from '../world/physics.js';

// Ограниченный поиск обхода. Только при препятствии/застревании, с кэшем у бота.
// Закрываемые двери и целое стекло считаются проходимыми: бот взаимодействует с ними отдельно.
export function detour(b, tx, tz) {
  const step = 0.8, pass = new Set(W.doors.map(d => d.solid));
  for (const p of W.breakables || []) if (p.alive && p.kind === 'glass') pass.add(p.solid);
  const ox = b.pos.x, oz = b.pos.z, ty = b.pos.y, memo = new Map(), key = (x,z) => x + ',' + z;
  const ground = (ix, iz, fromY) => {
    const k = key(ix,iz); if (memo.has(k)) return memo.get(k);
    const x = ox + ix * step, z = oz + iz * step, r = b.r + 0.06;
    if (Math.abs(x) > W.bounds - 1 || Math.abs(z) > W.bounds - 1 || Math.hypot(ix,iz)*step > 26) { memo.set(k,null); return null; }
    const y = groundAt(x,z,r*0.6,fromY+0.65);
    if (Math.abs(y-ty)>1.25) { memo.set(k,null); return null; }
    for (const s of solidsNear(x-r,z-r,x+r,z+r)) if (s.on && !pass.has(s) && x+r>s.x0 && x-r<s.x1 && z+r>s.z0 && z-r<s.z1 && s.y1>y+0.1 && s.y0<y+b.h) { memo.set(k,null); return null; }
    memo.set(k,y); return y;
  };
  const heuristic = (x,z) => Math.hypot(ox+x*step-tx,oz+z*step-tz);
  const first = { x:0,z:0,y:ty,g:0,h:heuristic(0,0),parent:null },open=[first],cost=new Map([[key(0,0),0]]);let best=first;
  for(let n=0;n<900 && open.length;n++) {
    let bi=0;for(let i=1;i<open.length;i++)if(open[i].g+open[i].h<open[bi].g+open[bi].h)bi=i;
    const q=open.splice(bi,1)[0];if(q.h<best.h)best=q;if(q.h<0.9){best=q;break;}
    for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const x=q.x+dx,z=q.z+dz,k=key(x,z),y=ground(x,z,q.y);if(y===null||Math.abs(y-q.y)>0.65)continue;
      if(dx&&dz&&(ground(q.x+dx,q.z,q.y)===null||ground(q.x,q.z+dz,q.y)===null))continue;
      const ng=q.g+Math.hypot(dx,dz)+Math.abs(y-q.y)*2;if(ng>=(cost.get(k)??Infinity))continue;
      cost.set(k,ng);open.push({x,z,y,g:ng,h:heuristic(x,z),parent:q});
    }
  }
  if(best.h>=first.h-0.4)return [];
  const path=[];for(let q=best;q.parent;q=q.parent)path.push({x:ox+q.x*step,y:q.y,z:oz+q.z*step});return path.reverse();
}
