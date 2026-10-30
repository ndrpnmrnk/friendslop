// Одна целевая CPU-проверка без WebGL/WAN. Основная игра не загружает этот файл.
const log=document.querySelector('#log'),say=s=>log.textContent+='\n'+s;
const assert=(ok,msg)=>{if(!ok)throw Error(msg);say('PASS '+msg);};
const frame=document.createElement('iframe');frame.src='/__logic-index.html?testFrames=1';document.body.append(frame);const w=frame.contentWindow;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const end=Date.now()+30000;while(!w.__onlineTestModules?.camera){if(Date.now()>end)throw Error('boot: '+w.document.body.innerText.slice(0,200));await sleep(80);}
 const fs=w.__fs,{W}=fs;
 // Imports live inside the iframe realm, so each assertion uses the SAME world singleton.
 const get=await w.eval('(async()=>p=>import(p+"?net-logic-test"))()');
 const [gfx,world,builder,physics,tug,traversal,player,sync,mammoth,lock,bus,games,random,motion]=await Promise.all(['core/gfx.js','world/state.js','world/builder.js','world/physics.js','game/item-tug.js','world/traversal.js','game/player.js','net/world-sync.js','missions/mammoth.js','missions/lockpick.js','missions/bus.js','missions/games5.js','core/random.js','world/district-motion.js'].map(p=>get('/src/'+p)));

 const state=world.createWorld(new gfx.THREE.Group());world.withWorld(state,()=>{
 const b=new builder.Builder(0,0,0,'test');physics.addZone('water',{r:[-8,-8,8,8]},0);
 for(const kind of ['duck','ring']){const q=b.ride(kind,kind==='duck'?-3:3,0,0,.02);q.rider={pos:new gfx.V3(),r:.45};q.vx=2;const x=q.x;physics.updatePushables(.1,null);assert(q.x>x+.05,kind+' moves on water');assert(Math.abs(q.y-.02)<.001,kind+' stays buoyant');}
 const first=state.pushables[0];first.x=20;physics.constrainWaterRide(first,{x:-3,z:0});assert(first.x<8,'boat stays inside pond');
 b.door(20,0,'x',1,0,2.8,2.35,'wood');const pair=state.doors.slice(-2);pair[0].open=true;assert(pair.length===2&&pair[1].open&&pair[1].pivot.scale.x===-1,'paired doors mirror and open together');assert(Math.abs(pair[1].pivot.position.x-22.8)<.001,'right hinge at right jamb');
 b.house({x:30,z:0,w:10,d:10,door:{side:'s',at:.5},interior(f){f.kitchen(30.4,2.4,2.4);}});const surface=state.surfaces.find(s=>s.kind==='kitchen');assert(state.spots.kitchen.length===1,'kitchen mission location kept');
 });
 const games3=await get('/src/missions/games3.js');const small=world.createWorld(new gfx.THREE.Group());world.withWorld(small,()=>{const b=new builder.Builder(0,0,0,'test');b.kitchen(0,0,3);const p=player.createPlayer('cat');small.player=p;p.pos.set(0,0,.95);let result;const api={feedback(){},msg(){},timer(){},progress(){},finish:r=>result=r},game=games3.WORLD3.salad({spot:{x:0,y:0,z:.95,bx:0,bz:0}},api,{player:p,mission:{id:123}});const items=game.botItems();for(const it of items){it.state='held';it.owner=p;p.held=it;assert(game.interact(),'ingredient placed with E');}game.update(.01);assert(result?.chain==='saladCut','cutting starts after both ingredients are on table');game.stop();});
 const toys=await get('/src/ui/claw-toys.js'),cp=await get('/src/ui/claw-physics.js');const d=toys.doll('cat',0,1.4,0),sim=cp.toyPhysics([d]);const before=d.g.position.clone();sim.claw(new gfx.V3(0,before.y+.7,0),.3,.43,1/60);sim.update(1/60);const anchor=new gfx.V3(0,before.y+.46,0).sub(d.g.position).applyQuaternion(d.g.quaternion.clone().invert());const old=d.g.position.clone();sim.grab(d,anchor);assert(d.g.position.distanceTo(old)<1e-8&&d.physics.world,'physical grab preserves pose and world body');for(let i=0;i<90;i++){sim.claw(new gfx.V3(0,before.y+.7+i*.008,0),.14,.43,1/60);sim.update(1/60);}assert(d.g.position.y>old.y+.2,'joint lifts actual physics body');sim.drop();sim.dispose();d.dispose();
 const claw=await get('/src/ui/claw-machine.js');const c=claw.createClaw(new gfx.THREE.Group(),()=>{});c.open();assert(!w.document.querySelector('#clawPractice')&&!c.practice,'unlimited practice removed');c.close();
 const ids=['park','shops','office','townhall','yard','plaza','cemetery','foodcourt','hospital'];w.__forceDistricts=ids;fs.S.botCount=7;fs.startRound();assert(W.bots.length===7,'short round with seven bots');for(let i=0;i<45;i++){w.__stepTestFrame();await sleep(17);}assert([fs.P,...W.bots].every(a=>[a.pos.x,a.pos.y,a.pos.z].every(Number.isFinite)),'district round positions finite');assert(!fs.lastFaults().some(q=>Date.parse(q.at)>Date.now()-5000),'district round has no runtime errors');
 say('DONE - CPU logic only; GPU/FPS/WAN not measured.');
}catch(e){say('FAIL '+e.stack);console.error(e);}
