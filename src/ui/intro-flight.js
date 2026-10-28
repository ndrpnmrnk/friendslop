import {THREE,V3} from '../core/gfx.js';
import {W} from '../world/state.js';
import {groundAt} from '../world/physics.js';

// Одна непрерывная дуга: общий план, кварталы, игрок. Названия районов не нужны.
export function introFlight(player){
  const districts=W.districts.slice();for(let i=districts.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[districts[i],districts[j]]=[districts[j],districts[i]];}
  const focus=districts.slice(0,3).map(d=>new V3((d.ox+d.x1)/2,1.5,(d.oz+d.z1)/2));while(focus.length<3)focus.push(player.pos.clone());focus.push(player.pos.clone().add(new V3(0,3,0)));
  const angle=Math.random()*Math.PI*2,positions=focus.map((p,i)=>{const a=angle+i*.8,r=[31,23,18,10][i],v=p.clone().add(new V3(Math.cos(a)*r,[33,25,21,14][i],Math.sin(a)*r));v.y=Math.max(v.y,groundAt(v.x,v.z,.3,Infinity)+5);return v;});
  const path=new THREE.CatmullRomCurve3(positions,false,'centripetal'),targets=new THREE.CatmullRomCurve3(focus,false,'centripetal'),samples=[];
  // Высоты проверяются заранее, а не тяжёлым поиском по всей карте каждый кадр.
  for(let i=0;i<=64;i++){const p=path.getPoint(i/64);p.y=Math.max(p.y,groundAt(p.x,p.z,.3,Infinity)+4);samples.push(p);}
  // Подъём перед высокой крышей начинается заранее, без резкой ступени по Y.
  const distance=(a,b)=>Math.max(.05,Math.hypot(a.x-b.x,a.z-b.z))*.45;
  for(let i=1;i<samples.length;i++)samples[i].y=Math.max(samples[i].y,samples[i-1].y-distance(samples[i],samples[i-1]));
  for(let i=samples.length-2;i>=0;i--)samples[i].y=Math.max(samples[i].y,samples[i+1].y-distance(samples[i],samples[i+1]));
  const safePath=new THREE.CatmullRomCurve3(samples,false,'centripetal');
  return{duration:5.4,sample(k){k=THREE.MathUtils.clamp(k,0,1);k=THREE.MathUtils.clamp(k*k*k*(k*(k*6-15)+10),0,1);return{p:safePath.getPointAt(k),l:targets.getPointAt(k)};}};
}
