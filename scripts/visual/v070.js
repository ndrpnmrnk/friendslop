// Один целевой CPU-сценарий: настоящие геометрия, raycast, физика и завершение мини-игр.
const log=document.querySelector('#log'),say=s=>log.textContent+='\n'+s,assert=(ok,msg)=>{if(!ok)throw Error(msg);say('PASS '+msg);};
const frame=document.createElement('iframe');frame.src='/__logic-index.html?testFrames=1';document.body.append(frame);const w=frame.contentWindow,sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const deadline=Date.now()+30000;while(!w.__onlineTestModules?.camera){if(Date.now()>deadline)throw Error('boot: '+w.document.body.innerText.slice(0,200));await sleep(80);}
 const fs=w.__fs,get=await w.eval('(async()=>p=>import(p+"?net-logic-test"))()');
 const [gfx,world,builder,bake,physics,burger,outfit,player,missions,markers,random,foodcourt,grill,photo,config,sync]=await Promise.all(['core/gfx.js','world/state.js','world/builder.js','world/bake.js','world/physics.js','missions/burger.js','missions/outfit.js','game/player.js','missions/missions.js','missions/marker-visuals.js','core/random.js','world/districts/foodcourt.js','world/grill-volcano.js','missions/photo-card.js','config.js','net/world-sync.js'].map(p=>get('/src/'+p)));
 const make=()=>world.createWorld(new gfx.THREE.Group());
 assert(!config.CONFIG.missions.salad&&!missions.ALL_GAMES.saladCut&&!missions.WORLD_GAMES.salad,'salad and its chain absent from active catalog');
 const carWorld=make();world.withWorld(carWorld,()=>{
  const b=new builder.Builder(0,0,0,'test');b.car(0,0,0,0x667b82);b.box(8,0,2,2,3,gfx.col(0x17111f));b.kitchen(12,0,3);
  assert(carWorld.surfaces.some(s=>s.kind==='kitchen')&&!carWorld.spots.kitchen,'neutral kitchen remains without mission spawn point');
  bake.bakeStatic(carWorld.group);let protectedVertices=0,ordinaryVertices=0;
  carWorld.group.traverse(o=>{const a=o.userData.baked&&o.geometry.getAttribute('aObj');if(!a)return;for(let i=0;i<a.count;i++)a.getW(i)===0?protectedVertices++:ordinaryVertices++;});
  assert(protectedVertices>300&&ordinaryVertices>0,'car protection survives baking while ordinary surroundings remain eligible');
 });
 const fw=make();let volcano;world.withWorld(fw,()=>{const b=new builder.Builder(0,0,0,'foodcourt');foodcourt.default.build(b);volcano=grill.grillVolcano(b,60,0);assert(volcano.lid.children.some(o=>o.material?.map&&o.material.side===gfx.THREE.BackSide),'open lid has a textured inner shell');
  for(const it of volcano.pool.filter(i=>i.type==='coal')){let mapped=0;it.g.traverse(o=>{if(o.material?.map&&o.geometry?.attributes.uv)mapped++;});assert(mapped>0,'coal uses UV texture');}
  volcano.emitAt(3);assert(volcano.pool.filter(i=>i.state==='fly').length===6&&volcano.pool.length===12,'eruption launches six real objects from bounded inventory');
  volcano.emitAt(3.5);assert(volcano.pool.filter(i=>i.state==='fly').length===6,'no duplicate emission in one cycle');
  const site=fw.spots.grill[0];assert(site.bz>24.7&&site.by>.9,'burger station moved in front of truck');
  const api={feedback(){},pose(){},msg(){},progress(){},finish(){}};const ctx={bot:true,camera:new gfx.THREE.PerspectiveCamera()};const game=burger.burgerGame({spot:site},api,ctx);
  game.root.updateMatrixWorld(true);for(const part of game.parts){const box=new gfx.THREE.Box3();part.traverse(o=>{if(o.isMesh&&o.visible){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});const local=box.clone().translate(game.root.position.clone().negate());assert(local.min.y>=.055-1e-4&&local.max.z<=.456&&local.min.z>=-.456,'ingredient sits fully on the board '+part.name+' '+JSON.stringify([local.min.toArray(),local.max.toArray()]));}
  game.stop();
  let result=null,completions=0;const g=burger.burgerGame({spot:site},{...api,finish:r=>{result=r;completions++;}},ctx),camera=new gfx.THREE.PerspectiveCamera();camera.position.copy(g.root.position).add(new gfx.V3(0,1.7,1.55));camera.lookAt(g.root.position);camera.updateMatrixWorld(true);
  function click(i){g.root.updateMatrixWorld(true);const p=g.parts[i].getWorldPosition(new gfx.V3()).add(new gfx.V3(0,.025,0)),ray=new gfx.THREE.Raycaster(camera.position,new gfx.V3().subVectors(p,camera.position).normalize());g.down(ray);}
  const advance=t=>{for(let i=0;i<Math.ceil(t/.025);i++)g.update(.025);};
  click(1);advance(.35);assert(g.phase==='cook','real ray selects patty and places it on griddle');advance(3.1);click(1);advance(.5);advance(3.1);click(1);assert(g.phase==='stack','two cooked sides unlock assembly');
  click(2);advance(.35);assert(g.layer===0,'wrong first ingredient does not advance assembly');
  for(let i=0;i<5;i++){click(i);advance(.35);assert(g.layer===i+1,'layer '+i+' physically placed in order');}
  advance(1);assert(result?.success&&completions===1,'one burger completes mission exactly once');g.stop();
  let botDone=false;const bg=burger.burgerGame({spot:site},{...api,finish:r=>botDone=r.success},ctx),brain={time:0,next:0,ready(period){if(this.time<this.next)return false;this.next=this.time+period;return true;}};for(let i=0;i<1200&&!botDone;i++){brain.time+=.025;bg.botStep(.025,brain);bg.update(.025);}assert(botDone,'bot cooks and assembles the same single burger');bg.stop();
  const pg=burger.burgerGame({spot:site},api,{bot:false,camera});assert(pg.photo.target.width===640&&pg.photo.checks.length===5,'burger has a high resolution model photo and five progress steps');pg.stop();
 });
 let recipeKinds=new Set();random.withRandom(3366,()=>{for(let i=0;i<80;i++){const q=outfit.outfitRecipe({});recipeKinds.add(Object.values(q.values).join(''));assert(Object.values(q.values).every(n=>Number.isInteger(n)&&n>=0&&n<4),'valid randomized clothing slots');}});
 assert(recipeKinds.size>35&&[...recipeKinds].some(q=>new Set(q).size===4),'independent mixed outfits include four different sets');
 const ps=make();world.withWorld(ps,()=>{const p=player.createPlayer('cat');ps.player=p;const object=outfit.buildOutfit(0,0,0,[0,1]);const game=outfit.outfitGame(object,{feedback(){},msg(){},timer(){},progress(){},finish(){}},{player:p,mission:{},camera:new gfx.THREE.PerspectiveCamera()});assert(game.photo.target.width===576&&game.photo.target.height===736,'outfit reference renders once at higher resolution');game.stop();object.dispose();});
 const hw=make(),gw=make();let hv,gv,hs,gs;
 for(const [state,host] of [[hw,true],[gw,false]])world.withWorld(state,()=>{const volcano=grill.grillVolcano(new builder.Builder(0,0,0,'test'),0,0);const wire=sync.createWorldSync({host,id:host?1:2,myKey:host?'p1':'p2',actor:()=>null,command(){},visuals:false});if(host){hv=volcano;hs=wire;}else{gv=volcano;gs=wire;}});
 world.withWorld(hw,()=>{hv.emitAt(3);for(const it of hv.pool.slice(0,6)){it.state='rest';it.pos.set(20,.16,20);}});const packet=world.withWorld(hw,()=>hs.capture(true));world.withWorld(gw,()=>{gs.receive(packet);assert(gv.state.values[2]===3&&gv.pool[0].state==='rest','eruption inventory and recycle times replicate to guest');gs.setHost(true);gv.emitAt(63);assert(gv.pool.slice(0,6).every(it=>it.state==='fly')&&gv.state.values[2]===63,'new host can reuse the same inventory without stale local timers');});
 w.__forceDistricts=['foodcourt','shops','office','park','sewer','factory','cinema','townhall','yard'];fs.S.botCount=7;fs.startRound();
 for(let i=0;i<35;i++){w.__stepTestFrame();await sleep(17);}
 assert(fs.W.bots.length===7&&[fs.P,...fs.W.bots].every(a=>[a.pos.x,a.pos.y,a.pos.z].every(Number.isFinite)),'mixed round with seven bots has finite positions');
 assert(fs.W.manholes.length===10&&fs.W.servicePipes.length>0,'ten hatches and pipe routes generated');
 for(const hole of fs.W.manholes){const l=hole.ladder,cx=(l.x0+l.x1)/2,cz=(l.z0+l.z1)/2,axis=hole.axis,entry=axis==='x'?{x:hole.x,z:hole.z-1.85}:{x:hole.x-1.85,z:hole.z};
  assert(axis==='x'?l.nz===-1:l.nx===-1,'ladder faces inward from outer wall');
  for(let n=0;n<=12;n++){const k=n/12,x=entry.x+(cx-entry.x)*k,z=entry.z+(cz-entry.z)*k,y=physics.groundAt(x,z,.24,-3.65);assert(physics.isFree(x-.30,z-.30,x+.30,z+.30,y+.27,y+1.72,false,false,true),'clear approach under bent pipes');}
  for(let y=-3.7;y<.1;y+=.2)assert(physics.isFree(cx-.30,cz-.30,cx+.30,cz+.30,y+.12,y+1.7,false,false,true),'clear full ladder body corridor');
 }
 for(const m of missions.M.list){markers.focusMissionMarker(m,fs.P,true,2);const mk=m.marker,p=m.obj.pos(),ceil=markers.missionCeiling(p);assert(mk.beam.scale.y<2.1&&mk.sp.position.y+mk.sp.scale.y/2<ceil,'mission marker stays short and below ceiling');assert(!mk.ring.visible&&!mk.wave.visible,'no floor marker rings');}
 assert(!fs.lastFaults().some(q=>Date.parse(q.at)>Date.now()-15000),'no runtime faults');
 say('DONE - CPU geometry/physics/raycast and local world. 3D GPU appearance, photos, FPS and human WAN play not measured.');
}catch(e){say('FAIL '+e.stack);console.error(e);}
