// Deterministic grind contact, no Three.js or sound effects in this module.
const hypot=Math.hypot;
export function findRailLanding(b,rails,nextY){
 if(!b?.rider||!b.air||b.vy>0||(b.grindCooldown||0)>0)return null;
 const speed=hypot(b.vx,b.vz);
 if(speed<2.4)return null;
 for(const rail of rails||[]){
  const dx=rail.x1-rail.x0,dz=rail.z1-rail.z0,length=hypot(dx,dz);
  if(length<.25)continue;
  const tx=dx/length,tz=dz/length;
  const u=((b.x-rail.x0)*tx+(b.z-rail.z0)*tz)/length;
  if(u<.045||u>.955)continue;
  const qx=rail.x0+dx*u,qz=rail.z0+dz*u;
  if(hypot(b.x-qx,b.z-qz)>.33)continue;
  // A rail is caught ONLY from above, during a descending swept step.
  // Being below the rail or driving underneath it must not snap upwards.
  if(b.y<rail.y-.07||nextY>rail.y+.065)continue;
  const along=b.vx*tx+b.vz*tz;
  if(Math.abs(along)<2.2||Math.abs(along)/speed<.52)continue;
  const direction=Math.sign(along);
  return {rail,x:qx,z:qz,tx:tx*direction,tz:tz*direction,speed:Math.abs(along)};
 }
 return null;
}
export function startRailGrind(b,c){
 b.grind=c.rail;b.grindElapsed=0;b.grindDistance=0;
 b.x=c.x;b.z=c.z;b.y=c.rail.y;b.vy=0;b.air=false;
 b.vx=c.tx*c.speed;b.vz=c.tz*c.speed;
 b.heading=Math.atan2(c.tx,c.tz);
 b.pitch=0;b.bowlPitch=0;b.bowlBank=0;b.bowlSteep=false;
 b.flip=0;b.shuv=0;b.trick=null;
 b.grindSnd=0;
}
export function maintainRailGrind(b,dt){
 const rail=b.grind;if(!rail)return false;
 const dx=rail.x1-rail.x0,dz=rail.z1-rail.z0,length=hypot(dx,dz);
 if(length<.25)return false;
 const tx=dx/length,tz=dz/length;
 const u=((b.x-rail.x0)*tx+(b.z-rail.z0)*tz)/length;
 const px=rail.x0+dx*u,pz=rail.z0+dz*u;
 const along=b.vx*tx+b.vz*tz;
 if(u<.015||u>.985||hypot(b.x-px,b.z-pz)>.40||Math.abs(along)<1.15)return false;
 b.x=px;b.z=pz;b.y=rail.y;b.vy=0;b.air=false;
 b.vx=tx*along;b.vz=tz*along;
 b.pitch=0;b.bowlPitch=0;b.bowlBank=0;b.bowlSteep=false;
 b.grindElapsed=(b.grindElapsed||0)+dt;
 b.grindDistance=(b.grindDistance||0)+Math.abs(along)*dt;
 return true;
}
export function finishRailGrind(b){
 if(!b.grind)return false;
 const clean=(b.grindElapsed||0)>=.28&&(b.grindDistance||0)>=1.6;
 b.grind=null;b.grindElapsed=0;b.grindDistance=0;
 b.grindCooldown=.6;b.grindSnd=0;
 b.air=true;b.vy=Math.max(b.vy||0,.15);
 return clean;
}
