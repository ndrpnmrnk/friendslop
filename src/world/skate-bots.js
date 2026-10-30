import {W} from './state.js';
import {updateRide} from '../game/ride.js';
import {SKATE_LAYOUT as L} from './skate-layout.js';

// Only the authoritative bot simulation uses this. Human players retain
// their regular E/WASD/Space interactions; spectators receive normal state.
// Bots deliberately ride along the safe east / south perimeter, not through
// the crowded central bowl or across mission spawning zones.
export function skateBotController(b){
 const routes=[
  [30.8,39.2],[30.4,33.8],[33.4,29],[35.2,24],[35.2,18],
  [37.4,14.5],[39.1,11.8],[38,9.3],[35,9.3],[33,13.5],
  [32.8,19],[32.8,27],[30,33]
 ];
 const active=new WeakMap();
 const nearest=actor=>{
  if(!actor?.pos||actor.ride||actor.work||actor.held||actor.heldBy||actor.stun>0)return null;
  let best=null,dist=18;
  for(const board of W.pushables){
   if(board.districtRental!=='skatepark'||board.dead||board.rider||board.grabbed||!board.ride)continue;
   const d=Math.hypot(board.x-actor.pos.x,board.z-actor.pos.z);
   if(d<dist){dist=d;best=board;}
  }
  return best;
 };
 const leave=actor=>{
  const board=active.get(actor)?.board;
  if(board){
   if(board.rider===actor)board.rider=null;
   if(actor.ride===board)actor.ride=null;
   actor.rideKick=null;
   active.delete(actor);
  }
 };
 return {
  goal(actor){
   const board=nearest(actor);return board?{x:board.x,y:board.y,z:board.z,kind:'skate-loan',near:1.2}:null;
  },
  tick(actor,dt,t){
   let job=active.get(actor),board=job?.board;
   if(actor.work||actor.stun>0||actor.heldBy||actor.daze>0||
      board?.dead||board&&board.rider!==actor){
     if(job)leave(actor);return false;
   }
   if(!job&&actor.goal?.kind==='skate-loan'){
     const b=nearest(actor);
     if(b&&Math.hypot(b.x-actor.pos.x,b.z-actor.pos.z)<1.5){
       // Host-controlled bot ownership. A player can still take a free board
       // first; the next frame releases it if ownership changes.
       b.rider=actor;actor.ride=b;b.mountGrace=.4;
       b.hitSpeed=0;b.impactContact=false;b.heading=b.mesh.rotation.y;
       job={board:b,way:0,t:0};active.set(actor,job);
       actor.goal=null;actor.nav=null;
     }
   }
   if(!job)return false;
   board=job.board;
   const target=routes[job.way%routes.length],wx=W.skateOriginX+target[0],wz=W.skateOriginZ+target[1];
   const dx=wx-board.x,dz=wz-board.z,dist=Math.hypot(dx,dz);
   if(dist<2){job.way++;job.t=0;}else job.t+=dt;
   if(job.t>11){leave(actor);actor.goal=null;return false;}
   const desired=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(desired-board.heading),Math.cos(desired-board.heading));
   board.heading+=Math.max(-dt*2,Math.min(dt*2,delta));
   const sp=Math.hypot(board.vx||0,board.vz||0);
   const aimSpeed=Math.min(board.ride.max*.62,6.0)*Math.max(.5,Math.min(1,dist/3));
   const vel=sp+(aimSpeed-sp)*Math.min(1,dt*3);
   board.vx=Math.sin(board.heading)*vel;board.vz=Math.cos(board.heading)*vel;
   // The same real vehicle physics/animation is used for human riders.
   updateRide(actor,dt,t,0,0,false);
   if(!actor.ride){active.delete(actor);return false;}
   actor.ch.animate(dt,{t,speed:Math.min(1,vel/8),ride:board.kind,air:!!board.air,stun:false});
   actor.root.visible=true;
   return true;
  }
 };
}
