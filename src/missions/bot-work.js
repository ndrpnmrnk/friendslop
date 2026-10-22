import { THREE, G, mesh, col, V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { CONFIG } from '../config.js';
import { M, ALL_GAMES, WORLD_GAMES, canReach, missionDone, removeMission, startMissionClock } from './missions.js';
import { pickUp, drop, launch, throwVelocity } from '../game/items.js';
import { grabActor, letGo } from '../game/grab.js';
import { sfx } from '../core/sfx.js';
import { dropHeld } from '../game/actors.js';
import { useTool } from '../game/tools.js';
import { statsOf } from '../game/score.js';
import { cargoPosition } from '../game/handheld.js';

// Бот пользуется той же миссией и её настоящими предметами. Панельные игры
// получают самостоятельный ввод и камеру, не меняя интерфейс/камеру игрока.
export function beginBotWork(b, m) {
  if (!M.list.includes(m) || (m.claimedBy && m.claimedBy !== b) || (m.doer && m.doer !== b) || m.busy) return false;
  startMissionClock(m);
  if (b.held) dropHeld(b);
  if (m.def.world) m.claimedBy = b;
  m.doer = b; m.progress = 0;
  const job = { m, world: !!m.def.world, start: b.pos.clone(), result: null, dead: false, game: null, elapsed: 0 };
  const eye = new V3(), ray = new THREE.Raycaster();
  const brain = job.brain = { actor: b, time: 0, next: 0, workPoint: null,
    ready(period) { if (this.time < this.next) return false; this.next = this.time + period; return true; },
    rayTo(p) { this.workPoint = p.clone(); ray.set(eye, new V3().subVectors(p, eye).normalize()); return ray; },
    hit(object) { this.workPoint = object.getWorldPosition(new V3()); return { intersectObjects: () => [{object}], intersectObject: () => [{object}] }; },
    throwTo(p) { const it=b.held;if(!it)return;const from=it.pos.clone();b.held=null;it.owner=b;launch(it,from,throwVelocity(from,p,0.65,it.def));b.throwT=0.3; },
    use(p,dt) { if(b.held)useTool(b,b.held,p,dt); }
  };
  b.work=job;b.stationaryWork=!job.world;if(b.stationaryWork){b.vel.x=b.vel.z=0;b.push.x=b.push.z=0;}
  const api = { feedback(){job.worldFeedback=true;}, pose(p,l) { eye.copy(p);job.look=l.clone(); }, progress(v) { m.progress=v; }, msg() {}, where(t) {m.where=t;}, timer(t){m.workTime=t;},
    finish(result) { if(!job.dead&&!job.result)job.result=result; } };
  const ctx={bot:true,player:b,character:b.ch,cursor(){},mission:m,camera:new THREE.PerspectiveCamera(),jump:CONFIG.player.jump,
    give(it){if(b.held)dropHeld(b);pickUp(it);it.owner=b;it.wasHeld=true;it.mission=m;b.held=it;},
    free:()=>true};
  eye.copy(b.pos).y+=1.4;
  const before=new Set(W.items);
  job.game=(job.world?WORLD_GAMES:ALL_GAMES)[m.def.game](m.obj,api,ctx);
  for(const it of W.items)if(!before.has(it))it.mission=m;
  const ui=document.getElementById(['fuse','phone','keypad','lockpick','pipes'].includes(m.def.game)?({fuse:'wireui',phone:'phoneui',keypad:'keyui',lockpick:'lockui',pipes:'pipeui'}[m.def.game])+'-bot-'+m.id:'');
  if(ui&&job.look){
    const cv=document.createElement('canvas');cv.width=cv.height=64;const tx=new THREE.CanvasTexture(cv);tx.magFilter=tx.minFilter=THREE.NearestFilter;tx.generateMipmaps=false;
    const mat=new THREE.MeshBasicMaterial({map:tx}),display=new THREE.Group();display.position.copy(job.look);display.lookAt(eye);
    mesh(G.box,col(0x292331),0,0,-0.025,0.66,0.66,0.04,display);mesh(G.plane,mat,0,0,0,0.6,0.6,1,display);W.group.add(display);
    job.display={g:display,cv,tx,mat,ui,t:0};
  }
  m.onRemove=()=>stopBotWork(b);
  return true;
}
export function stopBotWork(b) {
  const job=b.work;if(!job||job.dead)return;
  job.dead=true;job.game?.stop();if(job.display){job.display.g.removeFromParent();job.display.tx.dispose();job.display.mat.dispose();}job.m.onRemove=null;
  if(job.m.doer===b)job.m.doer=null;
  if(job.grip && b.holding===job.grip)letGo(b);
  b.stationaryWork=false;b.work=null;b.goal=null;b.aimAt=null;b.think=0.6;b.missionTool=false;
}
export function interruptBotWork(b) {
  const job=b.work;if(!job||job.world)return null;
  const m=job.m;stopBotWork(b);m.progress=0;return m;
}
// Возвращаем только настоящие предметы своей миссии. Без передачи очков,
// телепорта вещи или захвата сквозь стену; маршрут использует обычный обход.
function recoverBotItem(b,job,items,dt) {
  if(job.grip){
    job.gripT-=dt;
    if(b.holding!==job.grip||job.gripT<=0){if(b.holding===job.grip)letGo(b);job.grip=null;}
    else{b.goal=null;return true;}
  }
  if(b.held){job.recover=null;return false;}
  const valid=it=>it.state==='held'&&it.owner&&it.owner!==b&&it.owner.held===it&&!it.owner.hidden&&!it.owner.drone&&!it.owner.returning;
  let q=job.recover;
  if(!q||!valid(q.it)){
    const it=items.filter(valid).sort((a,c)=>a.pos.distanceToSquared(b.pos)-c.pos.distanceToSquared(b.pos))[0];
    const loose=items.some(it=>(!job.game.botPickable||job.game.botPickable(it))&&(it.state==='rest'||it.state==='fly'));
    if(!it||loose&&it!==job.lastHeld){job.recover=null;return false;}
    q=job.recover={it,who:it.owner,nearT:0,next:0};
    sfx('curse',{at:b.pos});
    b.nav=null;b.navCD=0;b.stairRoute=null;
  }
  const who=q.it.owner;q.who=who;
  b.goal={x:who.pos.x,y:who.pos.y,z:who.pos.z,kind:'work',m:job.m,near:1.05};
  b.aimAt=who.pos;
  const close=b.pos.distanceTo(who.pos)<1.5&&canReach(b,who.pos,null,1.6);
  q.nearT=close?q.nearT+dt:0;q.next-=dt;
  if(q.nearT>0.25&&q.next<=0){
    q.next=1.2;
    if(grabActor(b,who)){job.grip=who;job.gripT=0.55;job.recover=null;b.goal=null;}
  }
  return true;
}
export function tickBotWork(b,dt) {
  const job=b.work;if(!job)return;
  const {m,game,brain}=job;
  if(!M.list.includes(m)){stopBotWork(b);return;}
  const interrupted=b.heldBy||b.stun>0||b.daze>0||b.getT>0||b.caged||b.drone||b.returning;
  if(!job.world&&(interrupted||b.pos.distanceTo(job.start)>0.65)){interruptBotWork(b);return;}
  brain.time+=dt;job.elapsed+=dt;
  if(job.world){
    const goal=game.botTarget?.()||game.target?.();const progress=m.progress||0;
    if(!job.probe)job.probe={p:b.pos.clone(),progress,time:0};
    const q=job.probe,moved=q.p.distanceTo(b.pos)>1.5,advanced=progress>q.progress+.025;
    if(moved||advanced){q.p.copy(b.pos);q.progress=progress;q.time=0;}else q.time+=dt;
    const lost=game.impossible?.()||goal&&goal.y<b.pos.y-3&&job.elapsed>12&&m.key==='cart';
    if(lost||q.time>18){b.avoidM??={};b.avoidM[m.id]=30;removeMission(m);return;}
  }
  if(!interrupted){
    if(job.world){
      let target=game.botTarget?.()||game.target?.();
      const items=game.botItems?.()||[];
      const recovering=recoverBotItem(b,job,items,dt);
      if(!recovering&&!b.held){const item=items.filter(it=>(!game.botPickable||game.botPickable(it))&&(it.state==='rest'||it.state==='fly'&&it.vel.length()<1)).sort((a,c)=>a.pos.distanceToSquared(b.pos)-c.pos.distanceToSquared(b.pos))[0];
        if(item&&item.pos.distanceTo(b.pos)<1.65&&canReach(b,item.pos.clone().setY(item.pos.y-item.def.r),null,1.65)){pickUp(item);item.owner=b;item.wasHeld=true;b.held=item;}
        else if(item)target=item.pos;
      }
      if(!recovering&&game.botDrop&&b.held&&items.includes(b.held)){
        const p=game.botDeposit();target=p;
        if(Math.hypot(p.x-b.pos.x,p.z-b.pos.z)<1.65&&Math.abs(p.y-b.pos.y)<1.2){const it=b.held;b.held=null;drop(it,p.x,p.y+0.4,p.z);}
      }
      if(!recovering){if(target){b.goal={x:target.x,y:target.y-(items.some(it=>it.pos===target)?0.2:0),z:target.z,kind:'work',m,near:game.botNear||0.8};}
      else b.goal=null;
      if(game.prompt?.()&&(!target||Math.hypot(target.x-b.pos.x,target.z-b.pos.z)<1.7)&&brain.ready(0.4))game.interact?.();}
      if(b.held&&items.includes(b.held))job.lastHeld=b.held;
    } else { b.goal=null; const p=m.obj.pos();b.aimAt=p; }
    if(!job.recover&&!job.grip)game.botStep?.(dt,brain);
  }
  // Уличный таймер не замирает в захвате; накопленные этапы и предметы не пересоздаются.
  game.update?.(dt);
  const display=job.display;if(display){display.t-=dt;if(display.t<=0){display.t=0.1;const g=display.cv.getContext('2d'),source=display.ui.querySelector('canvas');g.imageSmoothingEnabled=false;
    if(source)g.drawImage(source,0,0,64,64);else{g.fillStyle='#221b30';g.fillRect(0,0,64,64);g.fillStyle='#9be36b';g.font='bold 10px monospace';g.fillText(m.def.game==='phone'?'ГУЛЯТЬ?':(m.obj.code||[]).join(' '),5,15);for(let i=0;i<3;i++){g.fillStyle=i/3<(m.progress||0)?'#9be36b':'#4b405e';g.fillRect(6,23+i*12,52,8);}}display.tx.needsUpdate=true;}
    if(!brain.workPoint)brain.workPoint=job.look;
  }
  if(job.dead||b.work!==job)return;
  const res=job.result;
  if(!res)return;
  stopBotWork(b);
  if(res.chain){m.def={...m.def,world:false,game:res.chain};beginBotWork(b,m);return;}
  if(res.success&&m.claimedBy!==W.player){const pts=Math.round(m.pts*(res.mult??1)*(W.scoreMul||1));b.score+=pts;const st=statsOf(b);st.missions++;st.mpts+=pts;missionDone(m);W.onBotMission?.(b,m,pts);}
  removeMission(m);
}
export function poseBotWork(b) {
  const job=b.work;if(!job)return;
  if(job.recover){
    const who=job.recover.who,local=b.root.worldToLocal(who.pos.clone().add(new V3(0,0.9,0)));
    if(local.length()<2.2){local.z=Math.min(1.1,local.z);local.x=Math.max(0.12,local.x);b.ch.handR.position.lerp(local,0.55);}
    b.ch.head.rotation.z=Math.sin(job.elapsed*9)*0.05;
    return;
  }
  if(job.world)return;
  const p=job.brain.workPoint;if(!p)return;
  // Видна работа настоящей кисти, а не поднятый над головой невидимый груз.
  const local=b.root.worldToLocal(p.clone());
  if(local.length()<2.3)b.ch.handR.position.lerp(local,0.45);
}
