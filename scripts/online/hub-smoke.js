const out=document.querySelector('#log'),clients=[],start=Date.now();
const log=(s,v='')=>out.textContent+='\n'+s+' '+JSON.stringify(v);
const wait=async(fn,label,ms=30000)=>{const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,80));}throw Error('timeout '+label);};
const assert=(v,s)=>{if(!v)throw Error(s);log('PASS',s);};
try{
 for(let i=0;i<3;i++){
  const f=document.createElement('iframe');f.width=400;f.height=350;f.src='/__logic-index.html';document.querySelector('#clients').append(f);
  const w=f.contentWindow;await wait(()=>w.__onlineTestModules&&w.__fs?.menu,'boot');
  const m=w.__onlineTestModules,fs=w.__fs;w.__errors=[];w.addEventListener('error',e=>w.__errors.push(e.message));w.localStorage.removeItem('friendslop.lastFaults');m.net.myName('Hub '+i);w.localStorage.setItem('friendslop.server','ws://'+location.host+'/__rooms');fs.showHub();
  const c={w,m,fs,menu:fs.menu,scope:fn=>m.world.withWorld(fs.menu.world.state,fn)};clients.push(c);log('Booted client',i);
 }
 const[h,g,o]=clients;h.m.net.createRoom('cat');await wait(()=>h.m.net.inRoom(),'host');const code=h.m.net.NET.code;log('Room created',code);
 for(const[c,i]of [[g,1],[o,2]]){c.w.sessionStorage.setItem('friendslop.tok.'+code,'hub-guest-'+i+'-'+Date.now());c.m.net.joinRoom(code,'cat');await wait(()=>c.m.net.inRoom(),'join');}
 await wait(()=>clients.every(c=>c.menu.mode==='roam'&&c.menu.world.state.bots?.length===2),'physical roster');
 assert(clients.every(c=>c.menu.world.state.bots.every(a=>a.r>0&&a.vel&&a.netKey)),'3 clients have physical actors');
 const hp=h.menu.player,gp=g.menu.player,op=o.menu.player;
 const place=(c,x,z)=>{c.menu.player.pos.set(x,0,z);c.menu.player.vel.set(0,0,0);for(const peer of clients){const a=peer.menu.world.state.bots?.find(a=>a.id===c.m.net.NET.id);if(a){a.pos.set(x,0,z);for(const q of a.buf){q.x=x;q.y=0;q.z=z;}}}};
 clients.forEach((c,i)=>place(c,i*3,14));await new Promise(r=>setTimeout(r,400));
 place(g,0,14);await wait(()=>hp.pos.distanceTo(gp.pos)>.72,'host guest contact');assert(hp.pos.distanceTo(gp.pos)>.72,'host and guest cannot overlap');
 place(g,5,14);place(o,5,14);await wait(()=>gp.pos.distanceTo(op.pos)>.72,'guest guest contact');assert(gp.pos.distanceTo(op.pos)>.72,'two guests cannot overlap');
 const getBall=c=>c.menu.world.state.items.find(it=>it.type==='ball');
 const ball=getBall(h);assert(ball,'hub ball exists');
 place(g,ball.pos.x,ball.pos.z+.7);place(h,0,14);place(o,5,14);await new Promise(r=>setTimeout(r,400));
 g.scope(()=>{const it=getBall(g);g.m.items.pickUp(it);it.owner=gp;gp.held=it;});
 await wait(()=>clients.every(c=>getBall(c).state==='held'&&getBall(c).owner?.netKey==='p'+g.m.net.NET.id),'shared held ball');
 assert(getBall(h).pos.distanceTo(h.menu.world.state.bots.find(a=>a.id===g.m.net.NET.id).pos)<2,'guest holds the actual shared object');
 g.scope(()=>{g.m.items.drop(getBall(g),gp.pos.x,gp.pos.y,gp.pos.z);gp.held=null;});await wait(()=>clients.every(c=>getBall(c).state!=='held'),'drop');log('PASS','shared drop');

 place(h,-8,14);place(g,1,14);place(o,2.1,14);await new Promise(r=>setTimeout(r,700));
 const target=()=>g.menu.world.state.bots.find(a=>a.id===o.m.net.NET.id);
 await wait(()=>target()&&gp.pos.distanceTo(target().pos)<1.5&&gp.onGround&&target().onGround&&!gp.held,'grip reach');
 log('Grip request',g.scope(()=>g.fs.grabActor(gp,target())));
 log('Grip operands',{g:{p:gp.pos.toArray(),onGround:gp.onGround,stun:gp.stun,ride:!!gp.ride},o:{p:target().pos.toArray(),onGround:target().onGround,stun:target().stun}});
 await wait(()=>gp.holding&&op.heldBy,'guest grabs guest');assert(gp.holding.netKey==='p'+o.m.net.NET.id,'guest/guest grip is shared');
 for(let i=0;i<8;i++)o.scope(()=>o.m.grabs.struggleTap(op));await wait(()=>!op.heldBy&&!gp.holding,'struggle release');log('PASS','victim can struggle free');
 const b=getBall(h);place(g,b.pos.x,b.pos.z+.4);place(o,b.pos.x+2,b.pos.z+.4);await new Promise(r=>setTimeout(r,500));
 g.scope(()=>{const it=getBall(g);g.m.items.pickUp(it);it.owner=gp;gp.held=it;});await wait(()=>getBall(h).owner?.netKey==='p'+g.m.net.NET.id&&getBall(h).state==='held','ball for throw');
 g.scope(()=>{const it=getBall(g),v=it.vel.clone().set(9,1.5,0),from=gp.pos.clone();from.y+=1;g.m.items.launch(it,from,v);it.owner=gp;gp.held=null;});
 await wait(()=>op.daze>0||op.stun>0,'actual thrown ball hits other guest');log('PASS','canonical throw hits a different guest');
 await wait(()=>!(op.daze>0)&&!(op.stun>0),'recover from hit');
 // Station conflict, protection, door state and release with actual session commands.
 clients.forEach(c=>place(c,-9.5,-5));await new Promise(r=>setTimeout(r,500));let entered=[];
 g.menu.netHub.enter('wardrobe',()=>entered.push('guest'));o.menu.netHub.enter('wardrobe',()=>entered.push('observer'));
 await wait(()=>entered.length,'station grant');await new Promise(r=>setTimeout(r,400));assert(entered.length===1,'one station owner for simultaneous claims');
 const winner=entered[0]==='guest'?g:o;assert(winner.menu.player.netProtected,'station user protected');
 winner.scope(()=>winner.m.actors.knockDown(winner.menu.player,5,0,2));assert(!winner.menu.player.stun,'station immunity rejects damage');
 winner.menu.world.curtain(1);await wait(()=>h.menu.world.curtainOpen>.95,'shared wardrobe doors');log('PASS','wardrobe doors shared');
 winner.menu.netHub.leave();await wait(()=>!h.menu.netHub.slots.wardrobe,'release station');
 assert(!h.menu.world.state.solids.some(s=>Math.abs((s.x0+s.x1)/2-15.35)<.01&&Math.abs((s.z0+s.z1)/2+5)<.01&&s.y1>5),'central pole and collision removed');
 assert(clients.every(c=>!c.w.__errors.length),'no page errors');

 h.menu.debugGoal(0);h.menu.flow.stage='gather';h.menu.flow.wait=0;h.menu.flow.ids=h.fs.randomMap();
 await wait(()=>clients.every(c=>c.menu.launch?.recipe),'common launch recipe');
 const recipe=JSON.stringify(h.menu.launch.recipe);assert(clients.every(c=>JSON.stringify(c.menu.launch.recipe)===recipe),'same participants, starting positions, time and seed');
 assert(clients.every(c=>c.menu.launch.riders.filter(r=>r.a===c.menu.player).length===1),'each client occupies its own unique animation slot');
 await wait(()=>clients.every(c=>c.fs.S.state==='play'),'all clients start the match',120000);
 assert(clients.every(c=>c.m.match.MATCH.startAt===h.m.match.MATCH.startAt),'common map start clock');
 log('PASS','hub launch, map load and gameplay completed on all clients');
 await wait(()=>g.fs.M.list.length&&o.fs.M.list.length,'missions before migration');const missions=g.fs.M.list.filter(m=>!m.owner).map(m=>m.id);
 h.m.net.leaveRoom();await wait(()=>g.m.net.NET.host,'host migration');assert(g.m.net.inRoom()&&o.m.net.inRoom(),'host departure preserves room');
 await wait(()=>g.m.match.MATCH.host&&o.m.match.MATCH.world?.host===false&&!o.m.match.netPaused(),'match authority migrated');
 await wait(()=>o.fs.M.list.some(m=>missions.includes(m.id)),'mission state after migration');
 assert(g.fs.S.state==='play'&&o.fs.S.state==='play','match continues after host departure');
 await new Promise(r=>setTimeout(r,3500));assert(!clients.flatMap(c=>c.fs.lastFaults()).some(q=>Date.parse(q.at)>=start),'no frame faults through launch and host migration');
 log('HUB SMOKE COMPLETE');
}catch(e){log('FAIL',e.stack);for(const c of clients){log('Faults',c.fs.lastFaults().filter(q=>Date.parse(q.at)>=start));log('Runtime',{mode:c.menu.mode,pause:c.menu.pause,pausedForSettings:c.menu.pausedForSettings,t:c.menu.t,daze:c.menu.player.daze,stun:c.menu.player.stun,p:c.menu.player.pos.toArray(),ball:c.menu.world.state.items.filter(it=>it.type==='ball').map(it=>({state:it.state,p:it.pos.toArray(),v:it.vel.toArray()}))});}}
