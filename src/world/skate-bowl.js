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
// A single sampled contact frame controls deck pitch, lateral roll and rider
// posture. No separate "sticky" rotation that can flip a board on a steep lip.
export function bowlContact(b,x,z,heading=0){
 const c=bowlAt(b,x,z);
 if(!c?.onWall)return null;
 const slope=Math.min(2.05,c.slope);
 const fx=Math.sin(heading),fz=Math.cos(heading);
 const rightX=Math.cos(heading),rightZ=-Math.sin(heading);
 return { ...c, pitch:Math.atan(slope*(c.nx*fx+c.nz*fz)),
   roll:Math.atan(slope*(c.nx*rightX+c.nz*rightZ)),
   steep:c.slope>2.05 };
}
export function bowlLipLaunch(board,oldX,oldZ,b){
 if(!b||!board?.rider||board.air||(board.bowlFlightCooldown||0)>0||
 !['skate','scooter'].includes(board.kind))return false;
 const before=bowlAt(b,oldX,oldZ),afterRadius=Math.hypot(board.x-b.x,board.z-b.z);
 if(!before?.onWall||before.r<b.rimRadius-.72||afterRadius<b.rimRadius-.18)return false;
 const nx=(board.x-b.x)/(afterRadius||1),nz=(board.z-b.z)/(afterRadius||1);
 const radial=board.vx*nx+board.vz*nz,sp=Math.hypot(board.vx,board.vz);
 // The board must actually reach the lip. Crossing its XZ radius while
 // still deep below the coping is a collision, never a teleporting launch.
 const expected=bowlHeight(before.r,b)+b.baseY;
 if(radial<5.5||sp<10.5||board.y<b.baseY-.48||
    board.y<expected-.32)return false;
 board.vy=Math.max(board.vy||0,Math.min(7.5,3.7+(radial-5.5)*.38));
 board.y=Math.max(board.y,b.baseY-.08);
 board.air=true;board.bowlFlightCooldown=1.5;board.bowlTakeoff=true;
 board.trick??={kind:board.kind==='scooter'?'barspin':'kickflip',t:0,dur:.48};
 return true;
}
export function moveBowlBoard(board,dt,b){
 if(!board)return false;
 board.bowlFlightCooldown=Math.max(0,(board.bowlFlightCooldown||0)-dt);
 const boardRide=['skate','scooter'].includes(board.kind)&&!!board.rider;
 const contact=boardRide&&!board.air?bowlContact(b,board.x,board.z,board.heading||0):null;
 const ease=1-Math.exp(-dt*12);
 const speed=Math.hypot(board.vx||0,board.vz||0);
 if(!contact||board.y<b.baseY-b.depth-.18){
  board.bowlBank=(board.bowlBank||0)*Math.exp(-dt*9);
  board.bowlPitch=(board.bowlPitch||0)*Math.exp(-dt*9);
  board.bowlSteep=false;
  return false;
 }
 // Gravity points down the curved surface. Centripetal support grows with
 // tangential speed; slow skaters cannot park on near-vertical walls.
 const radial=board.vx*contact.nx+board.vz*contact.nz;
 const tangent=-board.vx*contact.nz+board.vz*contact.nx;
 const downhill=18*contact.slope/Math.sqrt(1+contact.slope*contact.slope);
 // A curved wall must NEVER supply free uphill propulsion. Turning
 // speed may reduce the downhill loss, but cannot reverse gravity.
 const support=Math.min(downhill*.38,tangent*tangent/Math.max(3.2,contact.r)*.14);
 const force=-Math.min(18,Math.max(0,downhill-support));
 board.vx+=contact.nx*force*dt;board.vz+=contact.nz*force*dt;
 if(contact.steep&&speed<9){
  board.vx-=contact.nx*(5.5+(9-speed)*.75)*dt;
  board.vz-=contact.nz*(5.5+(9-speed)*.75)*dt;
 }
 // The board and the avatar use exactly this pitch/roll, not mismatched
 // estimates from different sampled points. The clamp keeps a believable
 // upright rider pose near the nearly-vertical coping.
 board.bowlPitch=Number.isFinite(board.bowlPitch)?board.bowlPitch:0;
 board.bowlBank=Number.isFinite(board.bowlBank)?board.bowlBank:0;
 board.bowlPitch+=(Math.max(-1.05,Math.min(1.05,contact.pitch))-board.bowlPitch)*ease;
 board.bowlBank+=(Math.max(-1.05,Math.min(1.05,contact.roll))-board.bowlBank)*ease;
 board.bowlSteep=contact.steep;
 return false;
}

// Steep walls are not walkable floors. Characters may jump or mantle over
// the coping, but normal WASD cannot climb a near-vertical bowl wall.
// A character already on a steep part is carried toward the low center.
export function bowlWalkLimit(b,maxSlope=.95){
 if(!b)return Infinity;
 let a=b.flatRadius,z=b.rimRadius;
 for(let i=0;i<20;i++){
  const mid=(a+z)*.5;
  if(bowlSlope(mid,b)>maxSlope)z=mid;
  else a=mid;
 }
 return a;
}
export function constrainBowlWalker(b,p,v,oldX,oldZ,dt,wasGrounded){
 if(!b||!wasGrounded||p.y>b.baseY+.28||
    p.y<b.baseY-b.depth-.45)return false;
 const ox=oldX-b.x,oz=oldZ-b.z,from=Math.hypot(ox,oz);
 const dx=p.x-b.x,dz=p.z-b.z,to=Math.hypot(dx,dz);
 if(to<.01||Math.min(from,to)>b.rimRadius+.12)return false;
 const limit=bowlWalkLimit(b);
 if(to<=limit+.01&&from<=limit+.01)return false;
 // Walking from the top deck inward is allowed. Descending a steep
 // wall naturally becomes a slide; climbing it from below is blocked.
 if(from>b.rimRadius+.12&&to<from)return false;
 const outward=to>from+.001;
 if(!outward&&from<=limit+.01)return false;
 const target=from<=limit+.01?limit:
    Math.max(limit,Math.min(to,from)-Math.min(.28,dt*4.6));
 if(outward||from>limit+.01){
  const r=Math.min(to,target),nx=dx/to,nz=dz/to;
  p.x=b.x+nx*r;p.z=b.z+nz*r;
  const radial=v.x*nx+v.z*nz;
  if(radial>0){v.x-=radial*nx;v.z-=radial*nz;}
  return true;
 }
 return false;
}
// Surface following is only permitted within the wheel's continuous
// vertical travel budget. Prevent abrupt gy - y snapping at the coping.
export function constrainBowlWheel(b,board,dt){
 if(!b||!board?.rider||board.air||
    !['skate','scooter'].includes(board.kind))return false;
 const c=bowlAt(b,board.x,board.z);
 if(!c?.onWall)return false;
 const ground=b.baseY+c.height,rise=ground-board.y;
 if(rise<=.12)return false;
 const outward=Math.max(0,board.vx*c.nx+board.vz*c.nz);
 const maxRise=.09+outward*Math.min(1,c.slope/Math.sqrt(1+c.slope*c.slope))*dt;
 if(rise<=maxRise)return false;
 // Invert the analytic bowl profile: find the furthest radius the wheels
 // can physically reach this frame without being lifted through the wall.
 const targetHeight=Math.max(-b.depth,Math.min(0,board.y-b.baseY+maxRise));
 const u=Math.sqrt(Math.max(0,1-(targetHeight/b.depth)**2));
 const radius=b.flatRadius+(b.rimRadius-b.flatRadius)*u;
 if(c.r<=radius)return false;
 board.x=b.x+c.nx*radius;board.z=b.z+c.nz*radius;
 const radial=board.vx*c.nx+board.vz*c.nz;
 if(radial>0){board.vx-=radial*c.nx*.78;board.vz-=radial*c.nz*.78;}
 return true;
}
