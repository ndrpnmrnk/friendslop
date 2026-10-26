import {W} from './state.js';
import {graphics} from '../core/quality.js';
import {WL} from '../core/wl-uniforms.js';
import {buildWorldLight} from './world-light.js';
/* Свет матча (v0.51): все постоянные источники считает «свет мира» (world-light.js) прямо в шейдере,
   отдельные PointLight больше не нужны. Здесь — перестройка после генерации карты, яркость источников,
   объёмные конусы у ближайших фонарей и короткие вспышки эффектов (взрыв, фейерверк, огонь). */
export function createLocalLighting(scene){
 let world=null,wl=null,tick=0;
 const dyn=WL.dynP.value.map((p,i)=>({p,c:WL.dynC.value[i],color:[0,0,0],k:0,decay:0}));
 return{
  get wl(){return wl;},
  rebuild(){wl=buildWorldLight(W.group);world=W.group;scene.userData.wl=wl;return wl;},
  // вспышка: позиция, цвет, сила, радиус, скорость угасания (в секунду)
  flash(p,color,k=1,range=12,decay=3.5){let s=dyn.reduce((a,b)=>b.k<a.k?b:a,dyn[0]);s.p.set(p.x,p.y,p.z,range);s.color=[(color>>16&255)/255,(color>>8&255)/255,(color&255)/255];s.k=k*9;s.decay=decay;},
  update(camera,dt,dim=0){
   if(world!==W.group){wl=null;scene.userData.wl=null;}
   for(const s of dyn){if(s.k>0)s.k=Math.max(0,s.k-s.k*s.decay*dt-dt*.4);s.c.set(s.color[0]*s.k,s.color[1]*s.k,s.color[2]*s.k);}
   if(!wl)return;
   wl.update(dim);
   tick-=dt;if(tick>0)return;tick=.15;
   const C=camera.position,n=graphics.current.cones??5,near=[];
   for(const l of W.lamps||[]){if(!l.cone)continue;const d=(l.lx-C.x)**2+(l.lz-C.z)**2;near.push([d,l]);}
   near.sort((a,b)=>a[0]-b[0]);
   near.forEach(([d,l],i)=>{l.cone.visible=i<n&&d<30*30&&l.pool.visible&&!l.pool.userData.broken;});
  }};
}
