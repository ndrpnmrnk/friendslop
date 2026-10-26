import {THREE} from '../core/gfx.js';
import {W} from './state.js';
import {graphics,onGraphics} from '../core/quality.js';
// Фиксированный бюджет настоящего света. Сотни окон не становятся сотнями PointLight.
export function createLocalLighting(scene){
 const pool=Array.from({length:8},()=>{const light=new THREE.PointLight(0xffcf97,0,9,1.65);scene.add(light);return{light,source:null,target:0};});let world=null,sources=[],lampSources=new Map(),tick=0;
 const configure=()=>{pool.forEach((p,i)=>{p.light.visible=i<graphics.current.lights;if(!p.light.visible){p.source=null;p.light.intensity=0;}});tick=0;};configure();onGraphics(configure);
 return{pool,update(camera,dt){
  if(world!==W.group){world=W.group;const lamps=new Set((W.lamps||[]).map(l=>l.pool));sources=[...(W.lamps||[]).map(l=>({x:l.lx,y:l.y+2.95,z:l.lz,color:0xffc580,strength:8.5,range:10,pool:l.pool,lamp:l})),...(W.lightSources||[]).filter(s=>!lamps.has(s.pool))];lampSources=new Map(sources.filter(s=>s.lamp).map(s=>[s.lamp,s]));tick=0;for(const p of pool){p.source=null;p.light.intensity=0;}}
  tick-=dt;if(tick<=0){tick=.12;const nearest=[],C=camera.position;
   for(const source of sources){if(source.pool&&(source.pool.userData.broken||!source.pool.visible))continue;const dx=source.x-C.x,dy=source.y-C.y,dz=source.z-C.z,d=dx*dx+dz*dz+dy*dy*2.4;if(d>28*28)continue;let i=0;while(i<nearest.length&&nearest[i].distance<=d)i++;nearest.splice(i,0,{source,distance:d});if(nearest.length>graphics.current.lights)nearest.pop();}
   // Сохраняем назначение существующих слотов, чтобы при обходе лампы не мигали.
   const keep=new Set(nearest.map(n=>n.source));for(const p of pool)if(!keep.has(p.source))p.source=null;
   const used=new Set(pool.map(p=>p.source));for(const n of nearest)if(!used.has(n.source)){const p=pool.slice(0,graphics.current.lights).find(p=>!p.source);if(p){p.source=n.source;p.light.intensity=0;p.light.position.set(n.source.x,n.source.y,n.source.z);p.light.color.setHex(n.source.color);p.light.distance=n.source.range;used.add(n.source);}}
   for(const l of W.lamps||[])if(l.cone)l.cone.visible=graphics.key!=='low'&&keep.has(lampSources.get(l))&&l.pool.visible&&!l.pool.userData.broken;
  }
  for(const p of pool){const s=p.source,on=s&&(!s.pool||s.pool.visible&&!s.pool.userData.broken);p.target=on?s.strength:0;p.light.intensity+=(p.target-p.light.intensity)*(1-Math.exp(-dt*9));}
 }};
}
