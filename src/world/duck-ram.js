// Pure, fixed-budget park-duck collision events. The host alone applies
// impulses; this helper cannot affect network guests or score state.
export function duckRamEvents(ducks,time,lastHits=new Map(),cooldown=1.4){
 const out=[],engaged=new Set();
 for(let i=0;i<ducks.length;i++)for(let j=i+1;j<ducks.length;j++){
  const a=ducks[i],b=ducks[j];
  if(!a||!b||!a.rider&&!b.rider||engaged.has(i)||engaged.has(j))continue;
  const dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz);
  if(!Number.isFinite(dist)||dist<=1e-3||dist>a.r+b.r+.12)continue;
  const nx=dx/dist,nz=dz/dist;
  const closing=((a.vx||0)-(b.vx||0))*nx+((a.vz||0)-(b.vz||0))*nz;
  if(!Number.isFinite(closing)||closing<4.5)continue;
  const id=i+':'+j;
  if(time-(lastHits.get(id)??-Infinity)<cooldown)continue;
  lastHits.set(id,time);engaged.add(i);engaged.add(j);
  const av=Math.hypot(a.vx||0,a.vz||0),bv=Math.hypot(b.vx||0,b.vz||0);
  out.push({a,b,nx,nz,closing,victim:av>=bv?b:a});
 }
 return out;
}
