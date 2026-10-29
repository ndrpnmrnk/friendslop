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
export function alignMountedVisual(actor){
  const pose=mountedVisualPose(actor);
  if(!pose||!actor?.root?.position)return false;
  actor.root.position.set(pose.x,pose.y,pose.z);
  actor.root.rotation.y=pose.yaw;
  return true;
}
