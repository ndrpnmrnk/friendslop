// Display remote riders at the same visual pose as their streamed vehicle.
// Pure lookup: never changes authoritative vehicle physics or network packet contents.
export function mountedVisualPose(actor){
  const vehicle=actor?.ride;
  if(!vehicle||vehicle.dead||vehicle.rider!==actor||!vehicle.ride||!vehicle.mesh?.position)return null;
  const p=vehicle.mesh.position,seat=vehicle.ride.seat,offset=vehicle.meshOffsetY||0;
  if(![p.x,p.y,p.z,seat,offset].every(Number.isFinite))return null;
  return {x:p.x,y:p.y-offset+seat,z:p.z,
    yaw:Number.isFinite(vehicle.mesh.rotation?.y)?vehicle.mesh.rotation.y:actor.root?.rotation.y||0};
}
export function alignBikePedals(actor,state){
  const b=actor?.ride;
  if(b?.kind!=='bike'||b.rider!==actor||!Number.isFinite(state?.cyclePhase))return;
  const vehicle=b.mesh?.children?.find(q=>q.userData?.vehicle?.pedals)?.userData.vehicle;
  if(vehicle?.pedals)vehicle.pedals.rotation.x=state.cyclePhase;
}
export function alignMountedVisual(actor){
  const pose=mountedVisualPose(actor);
  if(!pose||!actor?.root?.position)return false;
  actor.root.position.set(pose.x,pose.y,pose.z);
  actor.root.rotation.y=pose.yaw;
  if(actor.ride?.kind==='skate'||actor.ride?.kind==='scooter'){
    // On a high-speed bowl carve the authoritative board already includes
    // surface banking. Align the remote rider with that same mesh each frame.
    const r=actor.ride.mesh?.rotation;
    if(Number.isFinite(r?.x))actor.root.rotation.x=r.x*.85;
    if(Number.isFinite(r?.z))actor.root.rotation.z=r.z*.9;
  }
  return true;
}
