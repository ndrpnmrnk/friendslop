// v0.61.8: A C2-continuous bowl profile shared by rendered vertices,
// character ground sampling, rider contact and exit momentum.
// The old circular quarter arc had an infinite slope at the coping, causing
// mesh stepping, sticky vehicle constraints and player wall jitter.
export const BOWL_DEFAULT={
 x:22,z:23,flatRadius:4.25,rimRadius:8.05,outerRadius:8.05,
 depth:3.05,patchHalf:9.35
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const norm=(r,b)=>clamp((r-b.flatRadius)/(b.rimRadius-b.flatRadius),0,1);
const smooth5=u=>u*u*u*(u*(u*6-15)+10);
export function bowlHeight(r,b=BOWL_DEFAULT){
 if(!Number.isFinite(r)||r<0)return 0;
 return -b.depth*(1-smooth5(norm(r,b)));
}
export function bowlSlope(r,b=BOWL_DEFAULT){
 if(!Number.isFinite(r)||r<=b.flatRadius||r>=b.rimRadius)return 0;
 const u=norm(r,b);
 return b.depth*30*u*u*(1-u)*(1-u)/(b.rimRadius-b.flatRadius);
}
export function bowlAt(b,x,z){
 if(!b)return null;
 const dx=x-b.x,dz=z-b.z,r=Math.hypot(dx,dz);
 if(r>=b.rimRadius||r<.01)return null;
 return {r,nx:dx/r,nz:dz/r,height:bowlHeight(r,b),slope:bowlSlope(r,b),
  onWall:r>b.flatRadius+.12&&r<b.rimRadius-.02};
}
export function bowlGround(b,x,z,maxY){
 if(!b||Math.abs(x-b.x)>b.patchHalf||Math.abs(z-b.z)>b.patchHalf)return null;
 // This solid floor is authoritative even when the last step is below it:
 // never drop contact for one frame as steep ramps approach the surface.
 return b.baseY+bowlHeight(Math.hypot(x-b.x,z-b.z),b);
}
export function bowlContact(b,x,z,heading=0){
 const c=bowlAt(b,x,z);if(!c?.onWall)return null;
 const forwardX=Math.sin(heading),forwardZ=Math.cos(heading);
 const rightX=Math.cos(heading),rightZ=-Math.sin(heading);
 return {...c,
  pitch:Math.atan(c.slope*(c.nx*forwardX+c.nz*forwardZ)),
  roll:Math.atan(c.slope*(c.nx*rightX+c.nz*rightZ)),
  steep:c.slope>.95};
}
// The only implicit jump is a single outward crossing over the *smooth*
// lip at a sufficient speed. It does not teleport the board upward.
export function bowlLipLaunch(board,oldX,oldZ,b){
 if(!b||!board?.rider||board.air||(board.bowlFlightCooldown||0)>0||
   !['skate','scooter'].includes(board.kind))return false;
 const r0=Math.hypot(oldX-b.x,oldZ-b.z);
 const r1=Math.hypot(board.x-b.x,board.z-b.z);
 if(r0<b.rimRadius-.48||r0>=b.rimRadius||r1<b.rimRadius-.01)return false;
 const nx=(board.x-b.x)/(r1||1),nz=(board.z-b.z)/(r1||1);
 const radial=board.vx*nx+board.vz*nz,sp=Math.hypot(board.vx,board.vz);
 const previousGround=b.baseY+bowlHeight(r0,b);
 // At three metres of climb a 13 m/s board naturally arrives near 5-7 m/s.
 // The previous 9.3 m/s exit requirement was practically unreachable.
 if(radial<4.6||sp<5.2||Math.abs(board.y-previousGround)>.28)return false;
 // Carry outward momentum into a modest vertical arc; do not lift the board.
 const exitSlope=bowlSlope(b.rimRadius-.57,b);
 const kick=clamp(radial*Math.min(.62,exitSlope*.72),2.2,4.8);
 board.vy=Math.max(board.vy||0,kick);
 board.air=true;board.bowlFlightCooldown=1.4;board.bowlTakeoff=true;
 board.trick??={kind:board.kind==='scooter'?'barspin':'kickflip',t:0,dur:.48};
 return true;
}
export function moveBowlBoard(board,dt,b){
 if(!board)return false;
 board.bowlFlightCooldown=Math.max(0,(board.bowlFlightCooldown||0)-dt);
 const contact=['skate','scooter'].includes(board.kind)&&board.rider&&!board.air?
   bowlContact(b,board.x,board.z,board.heading||0):null;
 if(!contact||board.y<b.baseY-b.depth-.2){
  board.bowlBank=(board.bowlBank||0)*Math.exp(-dt*9);
  board.bowlPitch=(board.bowlPitch||0)*Math.exp(-dt*9);
  board.bowlSteep=false;return false;
 }
 // The only force here is gravity projected down the actual ramp.
 // No speed-based magnetic grip, wall normal propulsion or fake lift.
 // Horizontal acceleration of a constrained wheeled body on y=h(r).
 // sqrt(1+slope²) over-braked the steepest parts of the old bowl.
 const down=20*contact.slope/(1+contact.slope*contact.slope);
 board.vx-=contact.nx*down*dt;board.vz-=contact.nz*down*dt;
 const ease=1-Math.exp(-dt*9);
 board.bowlPitch=(Number.isFinite(board.bowlPitch)?board.bowlPitch:0)
   +(clamp(contact.pitch,-.98,.98)-(board.bowlPitch||0))*ease;
 board.bowlBank=(Number.isFinite(board.bowlBank)?board.bowlBank:0)
   +(clamp(contact.roll,-.98,.98)-(board.bowlBank||0))*ease;
 board.bowlSteep=contact.steep;
 return false;
}
export function bowlWalkLimit(b,maxSlope=.95){
 if(!b)return Infinity;
 let lo=b.flatRadius,hi=(b.flatRadius+b.rimRadius)*.5;
 if(bowlSlope(hi,b)<=maxSlope)return b.rimRadius;
 for(let i=0;i<22;i++){const mid=(lo+hi)*.5;
  if(bowlSlope(mid,b)>maxSlope)hi=mid;else lo=mid;}
 return lo;
}
export function constrainBowlWalker(b,p,v,oldX,oldZ,dt,wasGrounded){
 if(!b||!wasGrounded||p.y>b.baseY+.25||p.y<b.baseY-b.depth-.42)return false;
 const dx=p.x-b.x,dz=p.z-b.z,r=Math.hypot(dx,dz);
 if(r<=b.flatRadius||r>=b.rimRadius||r<.01)return false;
 const slope=bowlSlope(r,b),nx=dx/r,nz=dz/r;
 if(slope<.55)return false;
 // Never clamp the avatar's position against a fictitious vertical wall:
 // that created the visible back-and-forth snapping on every uphill frame.
 // A steep ramp gradually slows an ascent and gently slides a standing
 // walker down; running/jumping can still carry real momentum uphill.
 const radial=v.x*nx+v.z*nz,steep=clamp((slope-.55)/.95,0,1);
 if(radial>0){
  const keep=Math.exp(-dt*steep*3.5);
  v.x-=nx*radial*(1-keep);v.z-=nz*radial*(1-keep);
 }
 const slide=5.0*steep*dt;
 v.x-=nx*slide;v.z-=nz*slide;
 return true;
}
// Compatibility hook for old callers: the new C2 surface has bounded
// slope and no per-tick radial snapping. Ground contact is resolved once.
export function constrainBowlWheel(){return false;}
