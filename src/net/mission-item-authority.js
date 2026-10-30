// Decisions shared by the receiver, host item authorization and regression tests.
// The host is always authoritative for WHO holds a physical item; the local
// mission worker may own its visual/mission scope, but never another person's pickup.
export const canHostAcceptMissionItem=(item, proposed, actorKey, ownerKey)=>{
 if(!Array.isArray(proposed)||proposed.length<12)return false;
 const next=proposed[1],proposedOwner=proposed[11];
 if(!['rest','placed','fly','held','gone'].includes(next))return false;
 if(next==='held'&&proposedOwner!==actorKey)return false;
 // A held item is exclusively controlled by its confirmed holder.
 if(item?.state==='held'&&ownerKey&&ownerKey!==actorKey)return false;
 // A guest's optimistic pickup must be approved by the host "take" command.
 if(item&&next==='held'&&item.state!=='held')return false;
 return true;
};
export const applyHostMissionItem=(current,next,localKey,now=0)=>{
 if(!current)return true;
 const existingOwner=current.ownerKey||'',nextOwner=next?.ownerKey||'';
 if(current.state===next.state&&existingOwner===nextOwner)return false;
 // Permit a short one-way travel time for a legitimate pending request.
 // Never hide an item taken by somebody else behind the local prediction.
 if(current.pendingAt>0&&now-current.pendingAt<140&&current.state==='held'&&
    existingOwner===localKey&&next.state!=='held'&&!nextOwner)return false;
 return true;
};
export const remotePickup=(oldState,newState,oldOwner,newOwner)=>
 newState==='held' && newOwner && (oldState!=='held'||oldOwner!==newOwner) && newOwner!==oldOwner;
