// True recessed skate bowl: a single analytic curved heightfield shared
// by mesh generation, wheel collision, players and the authoritative host.
// No extra packet type or local random physics. This replaces the old berm.
export const BOWL_DEFAULT={
 x:22,z:23,flatRadius:4.25,rimRadius:8.05,outerRadius:8.05,
 depth:3.05,patchHalf:9.35
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function bowlHeight(r,b=BOWL_DEFAULT){
 if(!Number.isFinite(r)||r<0)return 0;
 if(r<=b.flatRadius)return -b.depth;
 if(r>=b.rimRadius)return 0;
 const u=clamp((r-b.flatRadius)/(b.rimRadius-b.flatRadius),0,1);
 // Quarter-circle curve: flat bottom, near-vertical upper lip.
 return -b.depth*Math.sqrt(Math.max(0,1-u*u));
}
export function bowlSlope(r,b=BOWL_DEFAULT){
 const e=.055;
 return clamp((bowlHeight(r+e,b)-bowlHeight(Math.max(0,r-e),b))/(2*e),0,6);
}
export function bowlAt(b,x,z){
 if(!b)return null;
 const dx=x-b.x,dz=z-b.z,r=Math.hypot(dx,dz);
 if(r>=b.rimRadius||r<.01)return null;
 return {r,nx:dx/r,nz:dz/r,height:bowlHeight(r,b),slope:bowlSlope(r,b),
  onWall:r>b.flatRadius+.12&&r<b.rimRadius};
}
export function bowlGround(b,x,z,maxY){
 if(!b||Math.abs(x-b.x)>b.patchHalf||Math.abs(z-b.z)>b.patchHalf)return null;
 const r=Math.hypot(x-b.x,z-b.z);
 const y=b.baseY+bowlHeight(r,b);
 // A wheel can climb a steep wall by more than 0.18m in a single step;
 // allow the analytic contact to catch up without treating it as a ceiling.
 return y<=maxY+1.12?y:null;
}
export function moveBowlBoard(board,dt,b){
 if(!board||!['skate','scooter'].includes(board.kind)||!board.rider||!b){
  if(board)board.bowlBank=(board.bowlBank||0)*Math.exp(-dt*9);
  return false;
 }
 const c=bowlAt(b,board.x,board.z),speed=Math.hypot(board.vx||0,board.vz||0);
 board.bowlFlightCooldown=Math.max(0,(board.bowlFlightCooldown||0)-dt);
 if(!c||!c.onWall||board.air||board.y<b.baseY-b.depth-.18){
  board.bowlBank=(board.bowlBank||0)*Math.exp(-dt*8);
  return false;
 }
 const radial=board.vx*c.nx+board.vz*c.nz;
 const tangential=-board.vx*c.nz+board.vz*c.nx;
 // Slow riders roll toward the bowl floor; fast carving supplies a bounded
 // outwards banking force. Contact depends on velocity, not an invisible wall.
 const down=16*Math.max(0,c.slope)/Math.sqrt(1+c.slope*c.slope);
 const support=Math.min(14,tangential*tangential/Math.max(3,c.r));
 const force=clamp(support-down,-13,8);
 board.vx+=c.nx*force*dt;board.vz+=c.nz*force*dt;
 const h=board.heading||0,rightX=Math.cos(h),rightZ=-Math.sin(h);
 const side=c.nx*rightX+c.nz*rightZ;
 const target=clamp(-Math.atan(c.slope)*side*.72*Math.min(1,speed/6),-.65,.65);
 board.bowlBank=(board.bowlBank||0)+(target-(board.bowlBank||0))*Math.min(1,dt*10);
 // Physically leave the upper rim with enough *outward* momentum, not
 // whenever the model is simply near the bowl. Standard airborne trick
 // animation and landing/scoring still handle the rest.
 if(c.r>=b.rimRadius-.09&&radial>6&&speed>10.5&&
    board.y>=b.baseY-.72&&board.bowlFlightCooldown<=0){
  board.vy=Math.max(board.vy||0,Math.min(8,3.9+(radial-6)*.45));
  board.y=Math.max(board.y,b.baseY+.10);
  board.air=true;board.bowlFlightCooldown=1.6;
  board.trick={kind:board.kind==='scooter'?'barspin':'kickflip',t:0,dur:.36};
  return true;
 }
 return false;
}
