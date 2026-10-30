// Physically rideable, continuous skate bowl built into the district floor.
// The surrounding berm forms a 2.7 m tall lip while the playable floor remains
// at the existing district elevation (no visual ground-plane clipping).
export const BOWL_DEFAULT={x:22,z:23,flatRadius:4.25,rimRadius:8.05,outerRadius:11.0,depth:2.7};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>t*t*(3-2*t);
export function bowlHeight(radius,b=BOWL_DEFAULT){
 if(!Number.isFinite(radius)||radius<0)return 0;
 if(radius<=b.flatRadius||radius>=b.outerRadius)return 0;
 if(radius<=b.rimRadius){
  const t=(radius-b.flatRadius)/(b.rimRadius-b.flatRadius);
  // Steeper mid-wall but continuous tangents at both ends: no sharp edges
  // for wheels or wheel-dependent tilt on the transition.
  return b.depth*smooth(t);
 }
 return b.depth*(1-smooth((radius-b.rimRadius)/(b.outerRadius-b.rimRadius)));
}
export function bowlSlope(radius,b=BOWL_DEFAULT){
 const e=.045;
 return (bowlHeight(radius+e,b)-bowlHeight(Math.max(0,radius-e),b))/(2*e);
}
export function bowlAt(b,x,z){
 if(!b)return null;
 const dx=x-b.x,dz=z-b.z,r=Math.hypot(dx,dz);
 if(r>=b.outerRadius||r<.01)return null;
 return {r,nx:dx/r,nz:dz/r,height:bowlHeight(r,b),slope:bowlSlope(r,b),
   onWall:r>b.flatRadius+.12&&r<b.rimRadius+.06};
}
// The same deterministic height function is sampled by the renderer and by
// groundAt on host and guest. No special moving collision or network traffic.
export function bowlGround(b,x,z,maxY){
 if(!b)return null;
 const r=Math.hypot(x-b.x,z-b.z);
 if(r>b.outerRadius)return null;
 const y=b.baseY+bowlHeight(r,b);
 return y<=maxY+.18?y:null;
}
export function moveBowlBoard(board,dt,b){
 if(!board||!['skate','scooter'].includes(board.kind)||!board.rider||!b){
  if(board)board.bowlBank=(board.bowlBank||0)*Math.exp(-dt*9);
  return false;
 }
 const c=bowlAt(b,board.x,board.z),speed=Math.hypot(board.vx||0,board.vz||0);
 board.bowlFlightCooldown=Math.max(0,(board.bowlFlightCooldown||0)-dt);
 if(!c||!c.onWall||board.air||board.y<b.baseY-.12){
  board.bowlBank=(board.bowlBank||0)*Math.exp(-dt*8);
  return false;
 }
 const radial=board.vx*c.nx+board.vz*c.nz;
 const tangential=-board.vx*c.nz+board.vz*c.nx;
 // Gravity pulls a slow rider down the incline. At speed, centrifugal
 // support balances it and lets the rider carve around the wall.
 const down=16*Math.max(0,c.slope)/Math.sqrt(1+c.slope*c.slope);
 const support=Math.min(14,tangential*tangential/Math.max(3,c.r));
 const force=clamp(support-down,-13,8);
 board.vx+=c.nx*force*dt;board.vz+=c.nz*force*dt;
 const h=board.heading||0,rightX=Math.cos(h),rightZ=-Math.sin(h);
 const side=c.nx*rightX+c.nz*rightZ;
 const target=clamp(-Math.atan(c.slope)*side*.72*Math.min(1,speed/6),-.57,.57);
 board.bowlBank=(board.bowlBank||0)+(target-(board.bowlBank||0))*Math.min(1,dt*10);
 // Launch only when actually leaving the INSIDE rim at significant speed.
 // High-speed outbound travel becomes an airborne trick, then normal gravity
 // and landing physics take over. Avoid repeat launches from rim jitter.
 if(c.r>=b.rimRadius-.28&&radial>6.0&&speed>9.0&&
    board.y>=b.baseY+b.depth-.48&&board.bowlFlightCooldown<=0){
  board.vy=Math.max(board.vy||0,Math.min(8,3.3+(radial-6)*.53));
  board.y+=.08;board.air=true;board.bowlFlightCooldown=1.6;
  board.trick={kind:board.kind==='scooter'?'barspin':'kickflip',t:0,dur:.48};
  return true;
 }
 return false;
}
