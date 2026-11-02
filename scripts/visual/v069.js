// Один целевой сценарий. 2D-мини-карта настоящая; 3D-рендер подменён только в dev-странице.
const log=document.querySelector('#log'),say=s=>log.textContent+='\n'+s;
const assert=(ok,msg)=>{if(!ok)throw Error(msg);say('PASS '+msg);};
const frame=document.createElement('iframe');frame.src='/__logic-index.html?testFrames=1';document.body.append(frame);const w=frame.contentWindow;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const end=Date.now()+30000;while(!w.__onlineTestModules?.camera){if(Date.now()>end)throw Error('boot timeout: '+w.document.body.innerText.slice(0,180));await sleep(80);}
 const fs=w.__fs,get=await w.eval('(async()=>p=>import(p+"?net-logic-test"))()');
 const [events,modes,map,layout,world,types,text]=await Promise.all(['game/events.js','game/modes.js','ui/minimap.js','ui/mission-map.js','world/state.js','world/districts/index.js','ui/text.js'].map(p=>get('/src/'+p)));
 w.__forceDistricts=['cinema','factory','foodcourt','office','park','shops','townhall','sewer','skatepark'];fs.S.botCount=7;fs.startRound();
 for(let i=0;i<35;i++){w.__stepTestFrame();await sleep(17);}
 assert(fs.W.bots.length===7&&[fs.P,...fs.W.bots].every(a=>[a.pos.x,a.pos.y,a.pos.z].every(Number.isFinite)),'mixed round with seven bots and finite positions');
 assert(fs.W.zones.some(z=>z.type==='water')&&fs.W.tunnelFloors.length>0,'ordinary water and tunnel floor routes preserved');
 assert(!fs.scene.children.some(o=>o.isSpotLight),'removed blackout spotlight');
 assert(!text.TEXT.events.dark&&!text.TEXT.events.flood&&!text.TEXT.eventIcon.dark&&!text.TEXT.eventIcon.flood,'removed event UI entries');
 const ui={start:key=>starts.push(key),tick(){},end(){}},starts=[];
 modes.setMode('chaos');events.stopEvent();events.resetEvents();events.EV.bigAt=1e9;
 for(let i=0;i<400&&starts.length<3;i++){if(!events.EV.cur)events.EV.next=events.EV.t;events.updateEvents(.5,ui);}
 assert(starts.length===3&&starts.every(k=>k==='pumpkins'),'three consecutive chaos events select a valid remaining event');
 events.stopEvent();
 // Старые снимки удалённых событий не должны создавать свет, воду или невидимые зоны.
 const isolated=world.createWorld(new fs.W.group.constructor());
 world.withWorld(isolated,()=>{isolated.net={replica:true};for(const key of ['dark','flood'])events.receiveNetworkEvents({t:0,left:20,done:false,big:null,cur:{key,net:{serial:77,seed:1,origin:''},left:20,s:{}}},ui);assert(!events.EV.cur&&isolated.zones.length===0&&isolated.group.children.length===0,'legacy removed-event snapshots create no effects or water zones');});
 modes.setMode('classic');events.resetEvents();
 const p={x:0,y:0,z:0},mk=(id,x,y,z)=>({id,x,y,z,icon:['graffiti','fish','safe','salad','pizza','puzzle','cat','generator'][id%8]});
 const cluster=Array.from({length:8},(_,i)=>mk(i,100+i,0,0));
 for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const markers=layout.layoutMissionMarkers(cluster,p,yaw,168,0);
  assert(markers.length===8&&markers.every(m=>m.edge&&m.x>=19&&m.x<=149&&m.y>=19&&m.y<=149),'eight distant missions stay within map at yaw '+yaw.toFixed(2));
  assert(markers.every((a,i)=>markers.every((b,j)=>i===j||Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))>=28)),'cluster icons do not cover each other');
  const focus=markers.find(m=>m.focus);assert(focus.id===0&&markers.at(-1)===focus,'nearest mission remains prominent and drawn last');
 }
 const levels=layout.layoutMissionMarkers([mk(1,10,.8,0),mk(2,-10,5,0),mk(3,0,-6,-10)],p,0,168,1);
 assert(levels.find(m=>m.id===1).level===0&&levels.find(m=>m.id===2).level===1&&levels.find(m=>m.id===3).level===-1,'table height is neutral, upper floor and basement have opposite badges');
 const switched=layout.layoutMissionMarkers([mk(1,10,0,0),mk(2,20,0,0)],p,0,168,2);assert(switched.at(-1).id===2&&switched.at(-1).opacity===1,'explicit main mission keeps focus even when farther away');
 assert(levels.find(m=>m.focus).opacity>levels.find(m=>m.id===2).opacity,'secondary markers have quieter brightness');
 map.buildMinimap(types.DISTRICTS||types.default||[]);
 const c=w.document.querySelector('#mapc'),camera=w.__onlineTestModules.camera.cam;
 const previews=[['Рядом · выше · ниже',[mk(1,12,0,4),mk(2,-13,6,-8),mk(3,10,-6,-18)],0,168],['Далеко в одном направлении',cluster,0,168],['Поворот камеры',cluster,Math.PI/2,168],['Мобильный масштаб',cluster,0,128]];
 const oldYaw=camera.yaw;
 for(const [label,entries,yaw,css] of previews){
  camera.yaw=yaw;const missions=entries.map(e=>({id:e.id,key:e.icon,def:{diff:'mid'},obj:{pos:()=>({x:e.x,y:e.y,z:e.z})}}));
  map.buildMinimap(types.DISTRICTS||types.default||[]);map.drawMinimap({pos:p,root:{rotation:{y:0}}},missions,null,null,{x:entries[0].x,z:entries[0].z,color:'#f5c542',missionId:entries[0].id});
  const fig=document.createElement('figure'),caption=document.createElement('figcaption'),out=document.createElement('canvas');caption.textContent=label;out.width=out.height=168;out.style.width=out.style.height=css+'px';out.getContext('2d').drawImage(c,0,0);fig.append(caption,out);document.querySelector('#maps').append(fig);
  assert(out.getContext('2d').getImageData(0,0,168,168).data.some((v,i)=>i%4!==3&&v>100),'actual canvas paints '+label);
 }
 camera.yaw=oldYaw;
 assert(!fs.lastFaults().some(q=>Date.parse(q.at)>Date.now()-10000),'no runtime faults');
 say('DONE - actual 2D canvas and CPU gameplay logic. 3D GPU/FPS/WAN not measured.');
}catch(e){say('FAIL '+e.stack);console.error(e);}
