// An actual recessed circular bowl, not four raised quarter-pipes.
// The same analytic height is used for visible geometry and collision.
export const BOWL={
 x:22,z:23,bottomRadius:3.8,wallRadius:4.15,depth:3.05,
 patchHalf:9.35,segments:64,rings:38
};
export const outerRadius=b=>b.bottomRadius+b.wallRadius;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function bowlSample(x,z,b=BOWL){
 const dx=x-b.x,dz=z-b.z,r=Math.hypot(dx,dz),outer=outerRadius(b);
 if(Math.abs(dx)>b.patchHalf||Math.abs(dz)>b.patchHalf)return null;
 const u=clamp((r-b.bottomRadius)/b.wallRadius,0,1);
 // Circular quarter-profile: steep upper wall, flat bottom, flush with rim.
 // Clamp slope at the lip to keep vehicle acceleration finite.
 const h=-b.depth+b.depth*(1-Math.sqrt(Math.max(0,1-u*u)));
 const slope=r>b.bottomRadius&&r<outer?b.depth/b.wallRadius*u/Math.sqrt(Math.max(.012,1-u*u)):0;
 return {height:r>=outer?0:h, slope:Math.min(6,slope),radius:r,outer,
   nx:r>1e-5?dx/r:0,nz:r>1e-5?dz/r:0,wall:u>0&&u<1,atLip:r>outer-.6&&r<outer+.12};
}
export function bowlAcceleration(sample,vx,vz){
 if(!sample?.wall)return {x:0,z:0};
 const {nx,nz,slope,radius}=sample;
 const tangential=-vx*nz+vz*nx;
 // Gravity projects downhill. Lateral velocity generates outward wall
 // pressure (banking) rather than a magic speed-independent sticky force.
 const downhill=-20*slope/(1+slope*slope);
 const banking=Math.min(15,tangential*tangential/Math.max(3,radius)*.43)*slope/(1+slope);
 const normal=downhill+banking;
 return {x:normal*nx,z:normal*nz};
}
export function bowlTakeoff(previous,next,vx,vz,speed,air=false){
 if(!previous||!next||air||!previous.wall||!next.atLip)return 0;
 const outward=vx*next.nx+vz*next.nz;
 if(previous.radius<previous.outer-.9||next.radius<next.outer-.22||outward<4||speed<10.5)return 0;
 return Math.min(7,Math.max(3.5,speed*.34));
}
export function bowlBank(sample,heading){
 if(!sample?.wall)return 0;
 // Rotation around local forward axis depends on the surface slope across
 // the board; sign reverses on opposite sides of the bowl.
 const sx=Math.cos(heading),sz=-Math.sin(heading);
 return clamp(Math.atan(sample.slope)* (sample.nx*sx+sample.nz*sz),-.74,.74);
}
export const bowlMeshHeight=(r,b=BOWL)=>bowlSample(b.x+r,b.z,b)?.height??0;
