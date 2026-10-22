import {THREE,G,V3,mesh,col,tmat} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {addSolid,raySolids} from '../world/physics.js';
import {addItem,drop} from '../game/items.js';
import {addPushable} from '../world/pushables.js';
import {grab,release,updateGrab} from '../game/ride.js';
import {flat,walkNPC} from './encounter-motion.js';
import {fatCartModel,salonModel} from './fat-models.js';
import {sfx} from '../core/sfx.js';
import {smokeRing,burst} from '../world/particles.js';
export function buildFat(){const p=W.factorySite.start,g=new THREE.Group();g.position.set(p.x,p.y,p.z);W.group.add(g);mesh(G.box,tmat(T.sign('ЗАКАЗ: 300 Л','#c9c6a8','#3d574b')),0,.7,0,.9,.45,.04,g);return{g,pos:()=>g.position,front:()=>g.position,reach:2.0,dispose(){g.removeFromParent();}};}
export function fatGame(o,api,ctx){
 api.feedback();const P=ctx.player,site=W.factorySite,mayor=W.mayor,where=new V3(W.salonSite.x,W.salonSite.y,W.salonSite.z),s=salonModel(),cans=site.cans.map(p=>addItem('fatcan',p.x,p.y,p.z)),cargo=[];
 const cart=addPushable({X:x=>x,Z:z=>z,Y:site.cart.y},'cart',site.cart.x,site.cart.z);cart.mesh.clear();cart.mesh.add(fatCartModel());cart.r=.84;cart.mass=2.2;cart.h=1.4;cart.noRide=true;
 const counter=document.createElement('canvas');counter.width=128;counter.height=32;const cx=counter.getContext('2d'),tx=new THREE.CanvasTexture(counter);tx.magFilter=tx.minFilter=THREE.NearestFilter;tx.generateMipmaps=false;const labelMat=new THREE.MeshBasicMaterial({map:tx}),label=mesh(G.plane,labelMat,0,1.2,-1.06,1.1,.275,1,cart.mesh);label.rotation.y=Math.PI;
 let phase='load',time=180,t=0,setup=0,pressure=.4,work=0,finishT=0,botPump=0,arrived=false,dead=false,completed=false,solid=null;mayor.busy=true;s.g.position.copy(where);s.g.visible=false;W.group.add(s.g);
 function count(){cx.fillStyle='#293e35';cx.fillRect(0,0,128,32);cx.fillStyle='#dfdab7';cx.font='bold 20px monospace';cx.textAlign='center';cx.fillText(cargo.length*50+'/300 Л',64,23);tx.needsUpdate=true;}count();
 function load(it){if(cargo.includes(it)||cargo.length>=6)return;if(it.owner?.held===it)it.owner.held=null;it.owner=null;it.state='placed';it.noPickup=true;it.outline.set(false);cargo.push(it);count();sfx('imp',{at:it.pos,m:'metal',range:12,v:.5});api.progress(cargo.length/6*.35);if(cargo.length===6){phase='haul';api.msg('300 литров! Отвези тележку к будущему салону','good');}}
 function near(p,r=2){return flat(P.pos,p)<r&&Math.abs(P.pos.y-p.y)<1.0;}
 const cartPos=()=>new V3(cart.x,cart.y,cart.z),salonFront=()=>where.clone().add(new V3(0,0,2.05));
 function service(){phase='service';P.stationaryWork=true;P.vel.x=P.vel.z=0;api.msg('ЛКМ - качай. Держи стрелку в зелёной зоне');if(!ctx.bot)api.pose(where.clone().add(new V3(1.1,2.0,3.8)),where.clone().add(new V3(.55,1.15,0)));}
 api.msg('Забери шесть бидонов по 50 л. E у тележки - погрузить');
 const game={get equipped(){return phase==='service';},get phase(){return phase;},get cans(){return cans;},get cart(){return cart;},
  target(){if(phase==='load')return P.held?.type==='fatcan'?cartPos():cans.find(i=>!cargo.includes(i))?.pos||cartPos();if(phase==='haul')return where;if(phase==='invite')return mayor.pos;return salonFront();},
  botTarget(){if(phase==='haul')return P.grab===cart?where:cartPos();return this.target();},botNear:.8,botItems:()=>phase==='load'?cans.filter(i=>!cargo.includes(i)):[],botDrop:false,
  prompt(){if(phase==='load'&&P.held?.type==='fatcan'&&near(cartPos(),2.4))return'<b>E</b>Погрузить 50 литров';if(phase==='haul')return'<b>ЛКМ / ПКМ</b>Толкай тележку к салону';if(phase==='setup')return'<b>E</b>Открыть подпольный салон';if(phase==='invite')return'<b>E</b>Пригласить мэра';if(phase==='escort'&&arrived)return'<b>E</b>Начать процедуру';if(phase==='service')return'<b>ЛКМ</b>Качай · стрелка в зелёном';return'';},
  interact(){if(phase==='load'&&P.held?.type==='fatcan'&&near(cartPos(),2.4)){load(P.held);return true;}if(phase==='setup'&&setup===0&&near(salonFront(),2.5)){setup=.01;s.g.scale.y=.05;return true;}if(phase==='invite'&&near(mayor.pos,2)){phase='escort';api.msg('Мэр идёт в салон. Подготовь аппарат');return true;}if(phase==='escort'&&arrived&&near(salonFront(),2.5)){service();return true;}return false;},
  down(){if(phase==='service'&&P.stun<=0&&!P.heldBy){pressure=Math.min(1,pressure+.14);s.valve.rotation.z+=.4;sfx('bongBubble',{at:where,range:9,v:.6});}},
  botStep(dt,brain){if(phase==='haul'){if(!P.grab&&near(cartPos(),2.0))grab(P,cart);if(P.grab===cart)updateGrab(P,dt);}else if(phase==='service'){botPump-=dt;if(pressure<.52&&botPump<=0){botPump=.3;this.down();}}else if(brain.ready(.4))this.interact();},
  impossible:()=>cart.y<site.cart.y-3||cans.some(i=>!cargo.includes(i)&&(i.state==='gone'||i.pos.y<site.start.y-4)),
  update(dt){if(dead)return;time-=dt;t+=dt;api.timer(time);if(time<=0||P.drone||P.returning){api.finish({success:false});return;}
   for(const it of cans)if(!cargo.includes(it)&&['rest','fly'].includes(it.state)){const local=cart.mesh.worldToLocal(it.pos.clone());if(Math.abs(local.x)<.70&&Math.abs(local.z)<1.05&&local.y>.48&&local.y<1.7)load(it);}
   cargo.forEach((it,i)=>{it.pos.copy(cart.mesh.localToWorld(new V3(i%2?.37:-.37,.96,-.62+Math.floor(i/2)*.62)));it.g.rotation.set(0,cart.heading||0,0);});
   if(phase==='haul'&&flat(cartPos(),where)<3){if(P.grab===cart)release(P,0);phase='setup';s.g.visible=true;s.g.scale.y=.05;solid=addSolid(where.x-1.85,where.z-.72,where.x+1.85,where.z+.72,where.y,where.y+1.15);api.progress(.45);api.msg('Груз доставлен. E - открыть салон','good');}
   if(phase==='setup'&&setup>0){setup+=dt;s.g.scale.y=Math.min(1,setup/2);if(setup>=2){phase='invite';api.msg('Салон открыт! Пригласи мэра у мэрии');}}
   if(phase==='escort'&&!mayor.npcImpact){const goal=where.clone().add(new V3(2.15,0,0));walkNPC(mayor,goal,2.1,dt);mayor.model.animate(t,flat(mayor.pos,goal)>.4?.7:0);arrived=flat(mayor.pos,goal)<.4;if(arrived)mayor.root.rotation.y=0;}
   if(phase==='service'){
    if(P.heldBy||P.stun>0||P.daze>0||!near(salonFront(),3)){P.stationaryWork=false;if(!ctx.bot)api.pose(null);phase='escort';work=0;pressure=.4;api.msg('Помешали! Запусти аппарат заново','bad');return;}
    pressure=Math.max(0,pressure-dt*.16);if(pressure>.42&&pressure<.71)work+=dt;else work=Math.max(0,work-dt*.15);s.needle.rotation.z=(.5-pressure)*Math.PI*1.5;api.progress(.55+Math.min(1,work/8)*.40);
    if(pressure>.91){pressure=.28;smokeRing(where.x-.5,where.y+1.5,where.z,5,{color:0xd6d2aa,size:.08,speed:.5,life:.4});}
    if(work>=8){phase='transform';finishT=0;api.msg('Кажется, мы перестарались…','good');P.stationaryWork=false;}
   }
   if(phase==='transform'){finishT+=dt;mayor.model.transform(Math.min(1,finishT/1.4));if(finishT>1.4){burst(mayor.pos.x,mayor.pos.y+1,mayor.pos.z,12,{color:0xdfccad,size:.12,speed:2,life:.6});completed=true;W.fatDone=true;mayor.lard=true;mayor.busy=false;api.finish({success:true,mult:1});}}
  },
  stop(){dead=true;P.stationaryWork=false;if(!ctx.bot)api.pose(null);if(P.grab===cart)release(P,0);for(const a of[W.player,...W.bots||[]]){if(a?.grab===cart)release(a,0);if(a?.ride===cart)W.dismount?.(a);}W.pushables=W.pushables.filter(c=>c!==cart);cart.mesh.removeFromParent();tx.dispose();labelMat.dispose();mayor.busy=false;if(!completed){mayor.model.transform(0);s.g.removeFromParent();s.dispose();if(solid)solid.on=false;mayor.returnHome=true;}else{W.keep.push(s.g);mayor.home.copy(mayor.pos);}}
 };return game;
}
