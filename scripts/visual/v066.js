// Один целевой сценарий: реальные размеры тела, проходы и общие предметы. Без GPU/WAN.
const log=document.querySelector('#log'),say=s=>log.textContent+='\n'+s;
const assert=(ok,msg)=>{if(!ok)throw Error(msg);say('PASS '+msg);};
const frame=document.createElement('iframe');frame.src='/__logic-index.html?testFrames=1';document.body.append(frame);const w=frame.contentWindow;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const end=Date.now()+30000;while(!w.__onlineTestModules?.camera){if(Date.now()>end)throw Error('boot: '+w.document.body.innerText.slice(0,200));await sleep(80);}
 const fs=w.__fs,get=await w.eval('(async()=>p=>import(p+"?net-logic-test"))()');
 const [gfx,world,builder,physics,items,player,sync,cinema,wallet,random,worldfx]=await Promise.all(['core/gfx.js','world/state.js','world/builder.js','world/physics.js','game/items.js','game/player.js','net/world-sync.js','world/districts/cinema.js','game/collection.js','core/random.js','game/worldfx.js'].map(p=>get('/src/'+p)));
 const make=()=>{const s=world.createWorld(new gfx.THREE.Group());world.withWorld(s,()=>random.withRandom(624,()=>cinema.default.build(new builder.Builder(0,0,0,'cinema'))));return s;};
 const state=make(),balance=wallet.collection().coins;
 const guest=make();let hostWire,guestWire;
 world.withWorld(state,()=>{hostWire=sync.createWorldSync({host:true,id:1,myKey:'p1',actor:()=>null,command:()=>{},visuals:false});});
 world.withWorld(guest,()=>{guestWire=sync.createWorldSync({host:false,id:2,myKey:'p2',actor:()=>null,command:()=>{},visuals:false});});
 world.withWorld(state,()=>{
  const layout=state.cinemaLevels,upper=layout.upper,stock=layout.snacks.flatMap(s=>s.stock);
  assert(stock.length===16&&stock.filter(i=>i.type==='popcorn').length===8&&stock.every(i=>i.state==='rest'&&i.g.visible&&!i.noPickup),'16 real, visible and freely pickable snacks');
  assert(!state.interacts.some(i=>/Купить|фист/.test(i.label))&&wallet.collection().coins===balance,'no purchase interaction or debit');
  for(const it of stock){const support=physics.groundAt(it.pos.x,it.pos.z,.05,it.pos.y);assert(Math.abs(support-it.surfaceHome.y)<.02,'snack supported by counter');}
  const doors=state.doors;for(const d of doors){d.open=true;d.solid.on=false;}
  const a=player.createPlayer('cat');state.player=a;
  const clear=(x,z,y=0)=>physics.isFree(x-a.r,z-a.r,x+a.r,z+a.r,y+.1,y+a.h);
  const route=(points,y=0)=>{for(let i=1;i<points.length;i++){const p=points[i-1],q=points[i],n=Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/.15);for(let j=0;j<=n;j++){const t=j/n,x=p[0]+(q[0]-p[0])*t,z=p[1]+(q[1]-p[1])*t;if(!clear(x,z,y))throw Error('blocked route '+[x,z,y]);}}};
  route([[22,39],[22,34],[22,23]]);assert(true,'clear entrance-to-auditorium route');
  route([[22,34],[12,34],[12,35.6],[7,35.6]]);assert(true,'counter and partition leave stair entrance free');
  route([[22,34],[38.6,34],[38.6,27.2]]);assert(true,'both snack stands accessible along east wall');
  route([[7,26.3],[11.5,26.3],[11.5,33.4],[39,33.4]],upper);assert(true,'landing and corridor connect all upper rooms');
  let y=0;for(let i=0;i<14;i++){const z=35-(i+.5)*.55,g=physics.groundAt(7,z,.1,y+.36);if(!(g>=y-.01&&g<=y+.36))throw Error('stair discontinuity '+i);y=g;}assert(Math.abs(y-upper)<.01,'all stair steps continuous to upper floor');
  for(const r of layout.bathrooms){route([[r.door.x,33.4],[r.door.x,29],[r.toilet.x,27.1]],upper);route([[r.door.x,29],[r.sink.x+1,28.4]],upper);assert(true,'toilet and wall vanity reachable without blocking door');assert(r.sink.x-r.x0<.6&&r.toilet.z-r.z0<.6,'bathroom fixtures close to walls');}
  // Проверка сплошных общих перегородок на нижней и верхней высоте тела.
  for(const x of[25.4,33])for(const z of[25.4,28,30.6])for(const y of[upper+.2,7.8])assert(!physics.isFree(x-.05,z-.05,x+.05,z+.05,y,y+.1),'shared room wall has no gap');
  assert(!clear(9.85,31,upper)&&!clear(9.85,30,0),'stairwell partition present on both levels');
  assert(state.benches.length===3&&state.benches.every(b=>b.z>36&&b.ry===Math.PI),'three upholstered benches backed against facade');
  const bench=state.benches[0],sitters=[a,player.createPlayer('cat'),player.createPlayer('cat')];for(const actor of sitters)worldfx.sitBench(actor,bench);assert(bench.riders.length===3&&new Set(bench.riders.map(r=>r.side)).size===3,'three separate usable seat positions');for(const actor of sitters){worldfx.leaveBench(actor);assert(clear(actor.pos.x,actor.pos.z),'standing up leaves couch collision');}
  const entry=doors.filter(d=>d.automatic);assert(entry.length===2&&entry.every(d=>Math.abs(d.x-22)<1.5),'paired automatic entry leaves retained');
  const cup=stock.find(i=>i.type==='popcorn');items.pickUp(cup);cup.owner=a;a.held=cup;assert(cup.state==='held','displayed popcorn is actual held item');a.held=null;items.launch(cup,new gfx.V3(22,1.3,32),new gfx.V3(0,-12,0));for(let i=0;i<30&&cup.state!=='gone';i++)items.updateItems(.05,null);assert(cup.state==='gone','real popcorn scatters on throw impact');
  const soda=stock.find(i=>i.type==='can');items.pickUp(soda);assert(soda.state==='held','displayed soda is actual held item');assert(wallet.collection().coins===balance,'pickup and throw leave wallet untouched');
  for(const s of state.solids)if(![s.x0,s.x1,s.z0,s.z1,s.y0,s.y1].every(Number.isFinite))throw Error('invalid solid');
 });
 // Та же ограниченная выкладка существует у обоих участников; изменения штатно передаются.
 const packet=world.withWorld(state,()=>hostWire.capture(true));world.withWorld(guest,()=>guestWire.receive(packet));
 assert(guest.cinemaLevels.snacks[0].stock[0].state===state.cinemaLevels.snacks[0].stock[0].state,'popcorn state replicated to guest');
 w.__forceDistricts=['cinema','factory','foodcourt','office','park','shops','townhall','university','skatepark'];fs.S.botCount=7;fs.startRound();assert(fs.W.bots.length===7,'mixed round with 7 bots');
 for(let i=0;i<30;i++){w.__stepTestFrame();await sleep(17);}
 assert([fs.P,...fs.W.bots].every(a=>[a.pos.x,a.pos.y,a.pos.z].every(Number.isFinite)),'round positions finite');assert(!fs.lastFaults().some(q=>Date.parse(q.at)>Date.now()-5000),'no runtime faults');
 say('DONE - CPU geometry/physics/network logic; GPU/FPS/WAN not measured.');
}catch(e){say('FAIL '+e.stack);console.error(e);}
