import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {addSolid,raySolids} from '../world/physics.js';
import {actors} from '../game/actors.js';
import {sfx} from '../core/sfx.js';
import {addOutline,OUTLINE} from '../game/outline.js';
import {makeCharacter} from '../characters/rig.js';
import {OUTFIT_SLOTS,OUTFIT_NAMES,OUTFIT_THEMES,outfitPiece,wearOutfit,applyOutfit} from '../characters/outfits.js';
import {photoCard} from './photo-card.js';
const shuffled=a=>{const q=a.slice();for(let i=q.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[q[i],q[j]]=[q[j],q[i]];}return q;};
function hanging(slot,v){const root=new THREE.Group();let piece;
 if(slot==='shoes'){for(const x of[-.12,.12]){const q=outfitPiece(slot,v);q.position.set(x,-.42,0);q.scale.setScalar(.80);root.add(q);}}
 else{piece=outfitPiece(slot,v);root.add(piece);if(slot==='hat'){piece.position.y=-.28;piece.scale.set(.44,.65,.44);}else if(slot==='top'){piece.position.y=-.62;piece.scale.set(.40,.58,.28);}else{piece.position.y=-.67;piece.scale.set(.37,.56,.28);}}
 return root;
}
export function buildOutfit(x,y,z,f){
 const g=new THREE.Group();g.name='outfit-racks';g.position.set(x,y,z);g.rotation.y=Math.atan2(f[0],f[1]);W.group.add(g);const garments=[],solids=[],categories=shuffled(OUTFIT_SLOTS),wood=tmat(T.wood()),metal=tmat(T.paintMetal(0x62656a));
 for(let row=0;row<4;row++){
  const rx=row%2?-1.72:1.72,rz=row<2?-1.05:1.05,face=rz<0?1:-1,slot=categories[row],rack=new THREE.Group();rack.position.set(rx,0,rz);g.add(rack);
  rack.add(compose('outfit44-rack',a=>{for(const sx of[-.98,.98]){a(G.cyl8,metal,sx,.88,0,.026,1.76,.026);a(G.box,metal,sx,.10,0,.12,.07,.50);for(const sz of[-.20,.20])a(G.cyl8,col(0x37313b),sx,.055,sz,.055,.04,.055,Math.PI/2);}a(G.cyl8,metal,0,1.76,0,.028,2.0,.028,0,0,Math.PI/2);a(G.box,wood,0,.27,0,1.91,.045,.39);}));
  for(const[v,i]of shuffled([0,1,2,3]).entries()){
   const variant=i,sx=-.72+v*.48,pivot=new THREE.Group();pivot.position.set(sx,1.70,0);pivot.rotation.y=face<0?Math.PI:0;rack.add(pivot);
   pivot.add(compose('outfit44-hanger',a=>{a(G.torus,metal,0,.025,0,.032,.032,.006,0,0,.3);a(G.cyl6,wood,-.065,-.06,0,.010,.15,.010,0,0,-1.0);a(G.cyl6,wood,.065,-.06,0,.010,.15,.010,0,0,1.0);a(G.cyl6,wood,0,-.10,0,.010,.26,.010,0,0,Math.PI/2);}));
   const model=hanging(slot,variant);pivot.add(model);const outline=addOutline(model,.014,OUTLINE.use);garments.push({slot,variant,pivot,model,outline,taken:false,angle:0,velocity:0,side:0,sv:0,phase:Math.random()*6.28,point:()=>g.localToWorld(new V3(rx+sx,0,rz-face*.00)),front:()=>g.localToWorld(new V3(rx+sx,0,rz+face*.72))});
  }
  g.updateMatrixWorld(true);const p=g.localToWorld(new V3(rx,0,rz)),wide=Math.abs(f[0])>.5,w=wide?.46:2.04,d=wide?2.04:.46;solids.push(addSolid(p.x-w/2,p.z-d/2,p.x+w/2,p.z+d/2,y,y+1.82));
 }
 // Небольшая стойка у входа: центр прохода между рядами остаётся свободным.
 mesh(G.plane,tmat(T.sign('СОБЕРИ ОБРАЗ','#cbbf9f','#4e485d')),-1.72,2.0,1.08,1.05,.24,1,g);mesh(G.box,wood,-1.72,2.0,1.06,1.12,.29,.045,g);for(const sx of[-.34,.34])mesh(G.cyl8,metal,-1.72+sx,1.87,1.05,.018,.25,.018,g);
 let age=0,disposed=false;const animate=dt=>{if(disposed)return;dt=Math.min(.05,dt);age+=dt;const list=actors();for(const q of garments){if(q.taken)continue;const p=q.point();let brush=0;for(const a of list){if(Math.abs(a.pos.y-y)>.7)continue;const d=a.pos.distanceTo(p);if(d<1)brush+=Math.min(.12,Math.hypot(a.vel.x,a.vel.z)*.008)*(1-d);}const goal=Math.sin(age*1.4+q.phase)*.012+brush;q.velocity+=((goal-q.angle)*36-q.velocity*7)*dt;q.angle=THREE.MathUtils.clamp(q.angle+q.velocity*dt,-.16,.16);q.pivot.rotation.x=q.angle;q.pivot.rotation.z=Math.sin(age+q.phase)*.009;}};W.animated.push(animate);
 return{g,garments,solids,reach:2.2,pos:()=>g.position,front:()=>g.localToWorld(new V3(0,0,2.7)),dispose(){if(disposed)return;disposed=true;solids.forEach(s=>s.on=false);W.animated=W.animated.filter(a=>a!==animate);garments.forEach(q=>q.outline.set(false));g.removeFromParent();}};
}
export function outfitRecipe(previous={},random=Math.random){
 const themed=random()<.4,theme=random()*4|0,values={};for(const slot of OUTFIT_SLOTS)values[slot]=themed?theme:random()*4|0;
 let changed=OUTFIT_SLOTS.filter(s=>values[s]!==previous[s]).length;
 for(const slot of OUTFIT_SLOTS)if(changed<2&&values[slot]===previous[slot]){values[slot]=(values[slot]+1+(random()*3|0))%4;changed++;}
 const same=OUTFIT_SLOTS.every(s=>values[s]===values.hat);return{values,label:same?OUTFIT_THEMES[values.hat]:'СМЕШАННЫЙ ОБРАЗ'};
}
export function outfitGame(o,api,ctx){
 api.feedback();const P=ctx.player,m=ctx.mission||{};m.outfitRecipe??=outfitRecipe(P.ch.outfit.values);const recipe=m.outfitRecipe.values;let age=0,active=null,finished=false,stopped=false,success=0;const taken={},fly=new THREE.Group();W.group.add(fly);let photo=null;
 if(!ctx.bot){const preview=makeCharacter(P.ch.skinId);applyOutfit(preview,recipe);for(let i=0;i<24;i++)preview.animate(1/60,{t:0,speed:0});photo=photoCard(preview.root,{title:m.outfitRecipe.label,width:112,height:144,view:[.3,.12,1]});}
 api.msg('Собери образ с фото. E у вешалки - примерить вещь');
 const matches=()=>OUTFIT_SLOTS.map(slot=>P.ch.outfit.values[slot]===recipe[slot]);
 function choice(){if(age<2.2||active||finished||matches().every(Boolean)||P.drone||P.returning||P.stun>0||P.getT>0||P.heldBy||P.held||Math.abs(P.pos.y-o.g.position.y)>.6)return null;let best=null,score=1e9;const eye=P.pos.clone().add(new V3(0,1.15,0)),forward=new V3(Math.sin(P.root.rotation.y),0,Math.cos(P.root.rotation.y));
  for(const q of o.garments){if(q.taken||ctx.bot&&(q.variant!==recipe[q.slot]||P.ch.outfit.values[q.slot]===recipe[q.slot]))continue;const point=q.point(),d=Math.hypot(point.x-P.pos.x,point.z-P.pos.z);if(d>1.35)continue;const dir=point.clone().setY(o.g.position.y+1.10).sub(eye),length=dir.length();if(raySolids(eye,dir.clone().normalize(),length,o.solids.find(s=>point.x>s.x0-.1&&point.x<s.x1+.1&&point.z>s.z0-.1&&point.z<s.z1+.1))<length-.15)continue;const n=point.clone().sub(P.pos).normalize().dot(forward),rank=d*(1.35-.35*n);if(rank<score){score=rank;best=q;}}
  return best;
 }
 const finishEquip=()=>{const q=active.q;if(taken[q.slot]){taken[q.slot].taken=false;taken[q.slot].model.visible=true;}q.taken=true;taken[q.slot]=q;wearOutfit(P.ch,q.slot,q.variant);q.model.visible=false;for(const a of fly.children.slice())a.removeFromParent();active=null;P.missionTool=false;sfx('pickup',{at:P.pos,range:8,v:.55});};
 return{equipped:false,botNear:.22,get recipe(){return recipe;},get active(){return active;},get photo(){return photo;},
  target(){const slot=OUTFIT_SLOTS.find(s=>P.ch.outfit.values[s]!==recipe[s]);return slot?o.garments.find(q=>q.slot===slot&&q.variant===recipe[slot]).front():P.pos;},
  prompt(){const q=choice();return q?'<b>E</b>Надеть '+OUTFIT_NAMES[q.slot][q.variant]:'';},
  interact(){const q=choice();if(!q)return false;const clone=hanging(q.slot,q.variant);fly.add(clone);q.model.updateWorldMatrix(true,true);const start=q.model.getWorldPosition(new V3());clone.position.copy(start);clone.quaternion.copy(q.model.getWorldQuaternion(new THREE.Quaternion()));q.model.visible=false;q.outline.set(false);active={q,clone,start,t:0};P.missionTool=true;return true;},
  botStep(){},
  pose(){if(!active)return;const to=active.clone.getWorldPosition(new V3()),local=P.root.worldToLocal(to);if(local.length()<2.1)P.ch.handR.position.lerp(local,.45);},
  afterCamera(){photo?.update(ctx.camera,0,{intro:2.2,checked:matches(),hidden:P.drone||P.returning});},
  update(dt){if(stopped)return;dt=Math.min(.05,dt);age+=dt;api.timer?.(m.activeLeft??105);if(P.drone||P.returning)return;const q=choice();for(const garment of o.garments)garment.outline.set(garment===q);
   if(active&&(P.stun>0||P.getT>0||P.heldBy)){active.q.model.visible=true;active=null;fly.clear();P.missionTool=false;}
   if(active){active.t+=dt;const k=Math.min(1,active.t/.52),hand=P.ch.handR.getWorldPosition(new V3());active.clone.position.lerpVectors(active.start,hand,k*k*(3-2*k));active.clone.position.y+=Math.sin(k*Math.PI)*.18;active.clone.scale.setScalar(1-k*.35);if(k>=1)finishEquip();}
   const checked=matches();api.progress(checked.filter(Boolean).length/4);photo?.update(ctx.camera,dt,{intro:2.2,checked,hidden:P.drone||P.returning});
   if(checked.every(Boolean)&&!active){success+=dt;if(success>.75&&!finished){finished=true;api.msg('Образ собран!','good');api.finish({success:true,mult:1});}}else success=0;
  },
  stop(){if(stopped)return;stopped=true;if(active){active.q.model.visible=true;active=null;}P.missionTool=false;o.garments.forEach(q=>q.outline.set(false));fly.removeFromParent();photo?.dispose();}
 };
}
