import {THREE,V3} from '../core/gfx.js';
import {OUTFIT_SLOTS,outfitPiece,outfitCuff} from './outfit-assets.js';
export {OUTFIT_SLOTS,OUTFIT_NAMES,OUTFIT_THEMES,outfitPiece} from './outfit-assets.js';
// Позиции в локальной системе head/torso. У широких негуманоидных скинов одежда ниже лица.
const FIT={
 cat:{hat:[0,1.67,0,.83,.88,.83],top:['torso',0,.38,0,.76,.62,.61],bottom:['torso',0,.075,0,.63,.36,.53]},
 tv:{hat:[0,1.27,.04,1.08,.9,.90],top:['head',0,.22,.02,1.20,.32,.84],bottom:['head',0,.025,.02,1.00,.22,.72]},
 shark:{hat:[0,1.42,-.05,.91,.8,.83],top:['head',0,.17,-.03,1.10,.33,.95],bottom:['head',0,.035,-.04,.82,.23,.75]},
 frog:{hat:[0,1.49,-.02,.99,.9,.88],top:['torso',0,.39,0,.86,.64,.67],bottom:['torso',0,.065,0,.68,.39,.57]},
 caveman:{hat:[0,1.74,0,.90,.88,.82],top:['torso',0,.43,0,1.00,.55,.88],bottom:['torso',0,.12,0,.86,.34,.70]},
 smoky:{hat:[0,1.72,0,.48,.7,.48],top:['torso',0,.31,-.01,.68,.73,.49],bottom:['torso',0,.10,0,.43,.29,.38]},
 gryzli:{hat:[0,1.61,-.02,1.00,.85,.88],top:['torso',0,.19,-.03,.74,.46,.62],bottom:['torso',0,.04,-.02,.62,.20,.52]},
 latte:{hat:[0,1.40,0,1.02,.85,1.02],top:['head',0,.36,0,.92,.36,.92],bottom:['head',0,.17,0,.78,.23,.78]}
};
function autoFit(ch){const b=new THREE.Box3().setFromObject(ch.torso),size=b.getSize(new V3()),has=!b.isEmpty()&&size.y>.15,w=has?THREE.MathUtils.clamp(size.x+.08,.45,1.3):Math.max(.55,ch.d.handX*1.5),h=has?Math.min(.7,size.y):.35,part=has?'torso':'head',y=has?b.min.y:.25;
 return{hat:[0,ch.d.top-.04,0,w,.85,w],top:[part,0,y,0,w,h,w*.8],bottom:[part,0,.08,0,w*.84,.28,w*.72]};}
export function prepareOutfits(ch){
 const nativeFeet=[ch.footL.children.slice(),ch.footR.children.slice()],nativeSlots=Object.fromEntries(OUTFIT_SLOTS.map(s=>[s,[]]));ch.root.traverse(o=>{if(nativeSlots[o.userData.outfitSlot])nativeSlots[o.userData.outfitSlot].push(o);});const headwear=nativeSlots.hat;
 // Снимок локальных размеров обуви до анимации и любых костюмов.
 const feet=[ch.footL,ch.footR].map(part=>{const b=new THREE.Box3();for(const o of part.children){o.updateMatrixWorld(true);const q=new THREE.Box3().setFromObject(o);b.union(q);}const inv=part.matrixWorld.clone().invert();b.applyMatrix4(inv);const size=b.getSize(new V3());return{w:THREE.MathUtils.clamp(size.x,.18,.32),d:THREE.MathUtils.clamp(size.z,.28,.44)};});
 ch.outfit={fit:ch.skin.outfitFit||FIT[ch.skinId]||autoFit(ch),active:false,values:{hat:null,top:null,bottom:null,shoes:null},layers:{},nativeSlots,nativeFeet,headwear,feet,last:ch.root.position.clone(),lastYaw:ch.root.rotation.y,velocity:new V3(),sway:0,sv:0,tilt:0,tv:0,ready:false};
}
export function wearOutfit(ch,slot,v){
 if(!OUTFIT_SLOTS.includes(slot)||v!=null&&(!Number.isInteger(v)||v<0||v>3))return false;const state=ch.outfit;if(!state)return false;
 for(const q of state.layers[slot]||[])q.removeFromParent();state.layers[slot]=[];state.values[slot]=v;state.active=OUTFIT_SLOTS.some(s=>state.values[s]!=null);
 for(const q of state.nativeSlots[slot])q.visible=v==null;
 if(slot==='shoes')for(const group of state.nativeFeet)for(const q of group)q.visible=v==null;
 if(v==null)return true;const add=(parent,g,x,y,z,sx,sy,sz)=>{g.position.set(x,y,z);g.scale.set(sx,sy,sz);g.userData.fitScale=g.scale.clone();g.userData.equipT=0;g.scale.multiplyScalar(1.04);parent.add(g);state.layers[slot].push(g);};
 if(slot==='hat'){const[x,y,z,sx,sy,sz]=state.fit.hat;add(ch.head,outfitPiece(slot,v),x,y,z,sx,sy,sz);}
 else if(slot==='shoes'){for(const[i,part]of[ch.footL,ch.footR].entries()){const fit=state.feet[i];add(part,outfitPiece(slot,v),0,0,0,fit.w/.24,.85,fit.d/.38);}}
 else{const[part,x,y,z,sx,sy,sz]=state.fit[slot];add(ch[part],outfitPiece(slot,v),x,y,z,sx,sy,sz/.85);if(slot==='top')for(const hand of[ch.handL,ch.handR])add(hand,outfitCuff(v),0,0,0,1,1,1);}
 return true;
}
export function applyOutfit(ch,values){for(const slot of OUTFIT_SLOTS)wearOutfit(ch,slot,values[slot]??null);}
export function updateOutfit(ch,dt,s){const q=ch.outfit;if(!q?.active)return;dt=Math.min(.05,Math.max(0,dt));if(!dt)return;const p=ch.root.position,dx=p.x-q.last.x,dz=p.z-q.last.z,yaw=ch.root.rotation.y,turn=Math.atan2(Math.sin(yaw-q.lastYaw),Math.cos(yaw-q.lastYaw));if(!q.ready||Math.hypot(dx,dz)>3){q.ready=true;q.velocity.set(0,0,0);q.sway=q.sv=q.tilt=q.tv=0;}q.last.copy(p);q.lastYaw=yaw;
 const speed=Math.min(13,Math.hypot(dx,dz)/dt),target=THREE.MathUtils.clamp(-turn/dt*.012,-.14,.14),tilt=Math.min(.24,speed*.012+(s.air?.06:0));for(let i=0;i<2;i++){const h=dt/2;q.sv+=((target-q.sway)*65-q.sv*12)*h;q.sway=THREE.MathUtils.clamp(q.sway+q.sv*h,-.16,.16);q.tv+=((tilt-q.tilt)*55-q.tv*11)*h;q.tilt=THREE.MathUtils.clamp(q.tilt+q.tv*h,0,.28);}
 for(const slot of OUTFIT_SLOTS)for(const layer of q.layers[slot]||[]){layer.userData.equipT=Math.min(1,layer.userData.equipT+dt/.22);const k=THREE.MathUtils.smoothstep(layer.userData.equipT,0,1);layer.scale.copy(layer.userData.fitScale).multiplyScalar(1.04-k*.04);}
 for(const layer of q.layers.top||[])for(const[i,panel]of (layer.userData.flaps||[]).entries()){panel.rotation.x=.025+q.tilt+Math.abs(Math.sin((s.t||0)*5+i)*q.sway)*.3;panel.rotation.z=q.sway*.4;}
}
