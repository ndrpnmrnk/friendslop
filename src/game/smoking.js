import {THREE,V3} from '../core/gfx.js';
const mouth=new V3(),origin=new V3(),hand=new V3(),q=new THREE.Quaternion(),inv=new THREE.Quaternion(),v=new V3();
export function updateSmoking(a,t){const cig=a.ch.handR.userData.chill?.cig;if(a.chill?.npc?.act==='smoke'&&cig?.visible)poseSmoking(a,cig,t);}
export function poseSmoking(a,cig,t){
 const c=a.ch,phase=a.chill?.t>8.8?'take':a.chill?.t<.8?'flick':'smoke',k=phase==='smoke'?Math.pow(Math.max(0,Math.sin(t*1.1)),.55):0;
 a.root.updateMatrixWorld(true);c.speechMouth.getWorldPosition(mouth);c.head.getWorldQuaternion(q);
 origin.set(c.d.holdX+.10,c.d.handY+.12,Math.max(c.d.holdZ+.13,.62));a.root.localToWorld(origin);
 v.set(0,0,.035).applyQuaternion(q);mouth.add(v);origin.lerp(mouth,k);v.set(0,0,Math.sin(k*Math.PI)*.12).applyQuaternion(a.root.quaternion);origin.add(v);
 hand.set(.055,-.035,.07).applyQuaternion(q).add(origin);c.handR.position.copy(a.root.worldToLocal(hand));c.handR.rotation.set(0,0,0);a.root.updateMatrixWorld(true);
 cig.position.copy(c.handR.worldToLocal(origin));c.handR.getWorldQuaternion(inv).invert();cig.quaternion.copy(inv.multiply(q));cig.updateMatrixWorld(true);
}
export function poseSkeletonSmoke(f,t){
 const up=Math.pow(Math.max(0,Math.sin(t*1.1+1)),.55),prop=f.prop;f.g.updateMatrixWorld(true);origin.set(.20,.95,.12);mouth.set(0,1.49,.20);origin.lerp(mouth,up);origin.z+=Math.sin(up*Math.PI)*.14;f.body.localToWorld(origin);prop.position.copy(prop.parent.worldToLocal(origin));f.g.getWorldQuaternion(q);prop.parent.getWorldQuaternion(inv).invert();prop.quaternion.copy(inv.multiply(q));prop.updateMatrixWorld(true);
}
