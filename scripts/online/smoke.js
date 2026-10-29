// Только dev-страница, не включается в dist. Проверяет реальные клиенты через локальный Worker.
const out = document.getElementById('log'), clients = document.getElementById('clients'),started=Date.now();
const report = (name, data) => { out.textContent += '\n' + name + ': ' + JSON.stringify(data); };
const wait = async (fn, label, ms = 45000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = fn(); if (v) return v; await new Promise(r => setTimeout(r, 100)); }
  throw Error('Timeout: ' + label);
};
const assert = (v, label) => { if (!v) throw Error(label); report('PASS', label); };
try {
  const frame = async name => {
    const f = document.createElement('iframe'); f.src = '/__logic-index.html'; clients.appendChild(f);
    const win = f.contentWindow;
    await wait(() => win.__onlineTestModules&&win.__fs?.startRound, name + ' boot');
    win.__noRender = true;
    win.localStorage.removeItem('friendslop.lastFaults');
    win.__testErrors = [];
    win.addEventListener('error', e => win.__testErrors.push(e.message));
    const {net,match,items}=win.__onlineTestModules;
    assert(win.__fs.MATCH===match.MATCH,name+' uses the same game modules');
    net.myName(name); win.localStorage.setItem('friendslop.server', 'ws://' + location.host + '/__rooms');
    return { win, f, net, match, items, get fs() { return win.__fs; } };
  };
  const h = await frame('Test host'), g = await frame('Test guest');
  h.net.createRoom('cat'); await wait(() => h.net.NET.state === 'on', 'create room');
  const code = h.net.NET.code;
  g.win.sessionStorage.setItem('friendslop.tok.' + code, 'test-guest-' + Date.now());
  g.net.joinRoom(code, 'cat');
  await wait(() => h.net.NET.players.size === 2 && g.net.NET.players.size === 2, 'join');
  assert(h.net.NET.host && !g.net.NET.host, '2 clients, one host');
  h.match.netBeginMatch(7384823); g.match.netBeginMatch(7384823);
  const districts = ['yard','park','plaza','shops','construction','cemetery','gas','market','school'];
  for (const c of [h,g]) { c.win.__forceDistricts = districts; c.fs.S.botCount = 7; c.fs.startRound(); c.base={solids:c.fs.W.solids.filter(s=>/^s:\d+$/.test(s.netId||'')).map(s=>[s.x0,s.y0,s.z0,s.x1,s.y1,s.z1].map(v=>Math.round(v*1000))),items:c.fs.W.items.filter(s=>/^i:\d+$/.test(s.netId||'')).map(s=>[s.type,s.home.x,s.home.y,s.home.z]),districts:c.fs.W.districts.map(d=>d.id)}; c.win.__forceDistricts = null; }
  try{await wait(() => g.fs.M.list.length && h.match.MATCH.ready.size === 2, 'shared world');}catch(e){report('Runtime',{h:{state:h.fs.S.state,net:h.net.NET.state,match:h.match.MATCH.on,ready:[...h.match.MATCH.ready],missions:h.fs.M.list.length,seq:h.match.MATCH.seq,err:h.fs.lastFaults()},g:{state:g.fs.S.state,net:g.net.NET.state,match:g.match.MATCH.on,ready:[...g.match.MATCH.ready],missions:g.fs.M.list.length,seq:g.match.MATCH.seq,err:g.fs.lastFaults()}});throw e;}
  const signature = c => JSON.stringify({
    solids:c.fs.W.solids.filter(s=>s.netId?.match(/^s:\d+$/)).map(s=>[s.x0,s.y0,s.z0,s.x1,s.y1,s.z1].map(v=>Math.round(v*1000))),
    items:c.fs.W.items.filter(s=>s.netId?.match(/^i:\d+$/)).map(s=>[s.type,s.home.x,s.home.y,s.home.z]),
    districts:c.fs.W.districts.map(d=>d.id)
  });
  if(JSON.stringify(h.base)!==JSON.stringify(g.base)){
    for(const type of ['solids','items']){const a=h.base[type],b=g.base[type],i=a.findIndex((v,i)=>JSON.stringify(v)!==JSON.stringify(b[i]));report('Map difference',{type,hostCount:a.length,guestCount:b.length,index:i,host:a.slice(Math.max(0,i-1),i+3),guest:b.slice(Math.max(0,i-1),i+3)});}
  }
  assert(JSON.stringify(h.base)===JSON.stringify(g.base), 'identical base geometry, colliders, items');
  assert(JSON.stringify(h.fs.M.list.map(m=>m.netRecipe)) === JSON.stringify(g.fs.M.list.map(m=>m.netRecipe)), 'same mission ids, types, places, seeds');
  assert(h.fs.W.bots.length === 7 && g.fs.W.bots.length === 7, '7 opponents: one friend and six bots');
  report('World', { solids:h.fs.W.solids.length, items:h.fs.W.items.length, missions:h.fs.M.list.length, entities:h.match.MATCH.world.objects.size });
  const stable = h.fs.W.items.find(it=>!it.boxed&&!it.noPickup&&it.home.y<.5&&it.pos.y<1&&it.state==='rest');
  assert(!!stable, 'loose test item exists');
  const hi = stable, gi = g.match.MATCH.world.objects.get(hi.netId)?.o;
  const place=(c,p)=>{c.fs.P.pos.copy(p);c.fs.P.vel.set(0,0,0);for(const peer of [h,g]){const a=peer.fs.W.bots.find(b=>b.netKey==='p'+c.net.NET.id);if(a){a.pos.copy(p);for(const q of a.buf){q.x=p.x;q.y=p.y;q.z=p.z;}}}};
  const setNear = (c, it) => place(c,it.pos.clone().set(it.pos.x+.6,it.pos.y-it.def.r,it.pos.z));
  setNear(h,hi); setNear(g,gi);
  // Тестовая перестановка перед проверкой взаимодействий, без имитации телепорта по сети.
  h.fs.W.bots.find(b=>b.human).buf.length=0;
  await new Promise(r=>setTimeout(r,300));
  h.items.pickUp(hi); hi.owner=h.fs.P; h.fs.P.held=hi;
  g.items.pickUp(gi); gi.owner=g.fs.P; g.fs.P.held=gi;
  await wait(()=>gi.owner?.netKey===hi.owner?.netKey,'pickup conflict');
  assert(hi.owner===h.fs.P && !g.fs.P.held, 'one item has exactly one owner');
  const door = h.fs.W.doors.find(d=>!d.open);
  if(door){door.open=true;await wait(()=>g.match.MATCH.world.objects.get(door.netId)?.o.open,'door');assert(true,'door and collision change on both clients');}
  h.fs.S.score=777;await wait(()=>g.fs.W.bots.find(b=>b.netKey==='p'+h.net.NET.id)?.score===777,'host score');
  assert(g.fs.S.score!==777,'scores remain attached to correct players');
  const bytes=JSON.stringify(h.match.MATCH.world.capture(false)).length;
  report('Delta bytes',bytes);
  h.match.MATCH.paused=true;h.net.send({t:'ev',e:'host-pause',ep:h.match.MATCH.seed,paused:true});
  await wait(()=>g.match.MATCH.paused,'pause');
  assert(g.match.netPaused(),'shared host pause');
  h.match.MATCH.paused=false;h.net.send({t:'ev',e:'host-pause',ep:h.match.MATCH.seed,paused:false});
  await wait(()=>!g.match.MATCH.paused,'resume');
  // Отдельный сценарий миссии после короткого обычного раунда с семью соперниками.
  for(const b of h.fs.W.bots.filter(b=>!b.human)){b.stun=1000;b.vel.set(0,0,0);}
  for(const c of[h,g]){c.fs.P.frozen=true;if(c.fs.P.held){c.items.drop(c.fs.P.held,c.fs.P.pos.x,c.fs.P.pos.y,c.fs.P.pos.z);c.fs.P.held=null;}}
  const api=h.win.__onlineTestModules.missions;
  for(const q of h.fs.M.list.slice())if(q.key==='puzzle')api.removeMission(q);h.fs.M.cooldown.puzzle=0;
  const m=api.spawnMission(h.fs.P,'puzzle');
  assert(!!m,'puzzle available for remote interaction');
  h.match.MATCH.fullT=0;
  await wait(()=>g.fs.M.list.find(x=>x.id===m.id),'replicated puzzle');
  const gm=g.fs.M.list.find(x=>x.id===m.id),front=m.obj.front(),normal=front.clone().sub(m.obj.pos()).setY(0).normalize(),side=new h.fs.P.pos.constructor(normal.z,0,-normal.x).multiplyScalar(1.05);
  const missionPlaces=()=>{place(h,front);place(g,front.clone().add(side));};
  missionPlaces();
  await new Promise(r=>setTimeout(r,250));
  missionPlaces();
  h.fs.openMission(m);g.fs.openMission(gm);
  await new Promise(r=>setTimeout(r,400));
  report('Mission conflict',{lease:m.netLease,hostOpen:!!h.fs.S.mg,guestOpen:!!g.fs.S.mg,hostPos:h.fs.P.pos.toArray(),guestPos:g.fs.P.pos.toArray(),front:front.toArray(),hostFaults:h.fs.lastFaults()});
  assert(m.netLease?.actor==='p'+h.net.NET.id&&!g.fs.S.mg,'simultaneous mission start has one owner');
  h.win.document.getElementById('mgexit').click();
  await wait(()=>!gm.netLease,'release mission');
  place(h,front.clone().add(new h.fs.P.pos.constructor(0,0,3)));place(g,front);
  g.fs.openMission(gm);try{await wait(()=>g.fs.S.mg?.m===gm,'guest mission grant',8000);}catch(e){report('Grant debug',{hostLease:m.netLease,guestLease:gm.netLease,hostBusy:m.busy,claimed:m.claimedBy?.netKey,gScore:g.fs.S.score,gPos:g.fs.P.pos.toArray(),hostSeenGuest:h.fs.W.bots.find(b=>b.human)?.pos.toArray(),front:m.obj.front().toArray(),hostState:h.fs.S.state,guestState:g.fs.S.state});throw e;}
  assert(m.netLease?.actor==='p'+g.net.NET.id,'guest receives an exclusive attempt');
  const game=g.fs.S.mg.game,board=gm.obj,scoreBefore=g.fs.S.score;
  game.update(2.4);
  while(board.order.some((v,i)=>v!==i)){
    const i=board.order.findIndex((v,i)=>v!==i),j=board.order.indexOf(i);
    game.down({intersectObjects:()=>[{object:board.tiles[board.order[i]].mesh}]});
    game.down({intersectObjects:()=>[{object:board.tiles[board.order[j]].mesh}]});
  }
  game.update(1.3);
  await wait(()=>!h.fs.M.list.includes(m)&&!g.fs.M.list.includes(gm),'shared mission completion');
  assert(g.fs.S.score===scoreBefore+m.pts,'host awards the guest exactly once');
  const bike=h.fs.W.pushables.find(p=>p.kind==='bike'&&!p.rider&&!p.grabbed);
  if(bike){
    const gb=g.match.MATCH.world.objects.get(bike.netId).o;
    for(const c of[h,g])place(c,new c.fs.P.pos.constructor(bike.x+.6,bike.y,bike.z));
    h.fs.W.bots.find(b=>b.human).buf.length=0;
    await new Promise(r=>setTimeout(r,250));
    g.win.__onlineTestModules.ride.mount(g.fs.P,gb);h.win.__onlineTestModules.ride.mount(h.fs.P,bike);
    await wait(()=>!g.fs.P.ride,'vehicle conflict',5000);
    assert(bike.rider===h.fs.P,'one vehicle has one rider');
    h.win.__onlineTestModules.ride.dismount(h.fs.P,false);
  }
  h.fs.eliminate(h.fs.W.bots.find(b=>b.human),2);
  await wait(()=>g.fs.P.drone&&h.fs.W.bots.find(b=>b.human).drone?.replica,'shared drone',5000);
  assert(true,'remote elimination and drone are shared');
  const cd=g.win.__onlineTestModules.drone;
  await wait(()=>g.fs.P.drone&&g.fs.P.drone.intro<=0,'drone controls',4000);
  cd.droneAction(g.fs.P,0,new g.fs.P.pos.constructor(0,0,1));
  await wait(()=>[...h.match.MATCH.world.objects.values()].some(e=>e.type==='t'&&e.o.kind==='net'&&e.o.owner?.netKey==='p'+g.net.NET.id),'drone shot',4000);
  assert(true,'drone projectile is simulated by host');
  h.win.__forceBig='hill';h.fs.EV.bigAt=0;
  await wait(()=>h.fs.EV.big?.key==='hill'&&g.fs.EV.big?.key==='hill','shared city event');
  assert(h.fs.EV.big.s.x===g.fs.EV.big.s.x&&h.fs.EV.big.s.z===g.fs.EV.big.s.z,'one city event at one location');
  h.fs.S.time=.01;
  await wait(()=>h.match.MATCH.final&&g.match.MATCH.final,'common finale');
  assert(JSON.stringify(h.match.MATCH.final.rows)===JSON.stringify(g.match.MATCH.final.rows),'same scores, ranking and awards');
  assert([...h.win.__testErrors,...g.win.__testErrors].length===0,'no unhandled page errors');
  const faults=[...h.fs.lastFaults(),...g.fs.lastFaults()].filter(x=>Date.parse(x.at)>=started);
  report('Faults',faults);assert(!faults.length,'no game frame faults');
  out.textContent+='\nSMOKE COMPLETE (CPU logic only, no WebGL/FPS assertion)';
} catch(e) { report('FAIL',e.stack||String(e)); }
