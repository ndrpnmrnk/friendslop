import {ParticleBatch} from './particle-batch.js';
import { THREE, G, mesh, alphaMat, ps1 } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { W } from './state.js';
import { groundAt } from './physics.js';

/* Ограниченные общие буферы: более плотные эффекты без сотен отдельных мешей. */
const pools=new WeakMap();
function particles(){let state=pools.get(W.group);if(!state){state={};pools.set(W.group,state);}return state;}
function batch(kind){const state=particles();if(!state[kind])state[kind]=new ParticleBatch(W.group,kind,{puff:320,smoke:128,dust:96,ripple:48}[kind],kind==='puff'?T.puff():kind==='ripple'?T.ripple():null);return state[kind];}
export const resetParticles=()=>{if(!W.group)return;const state=pools.get(W.group);if(state)for(const b of Object.values(state))b.dispose();pools.delete(W.group);};
export function particleStats(){const s=particles();return Object.fromEntries(Object.entries(s).map(([k,b])=>[k,{alive:b.records.filter(p=>p.alive).length,capacity:b.capacity,draws:b.mesh.visible?1:0}]));}
export function ripple(x,y,z,size=1,life=.9,color=0xb3dce8){batch('ripple').spawn({x,y:y+.11,z,size,life,color,scale:.1,alpha:.8,rx:-Math.PI/2});}
export function smoke(x,y,z,o={}){const dust=!!o.dust;batch(dust?'dust':'smoke').spawn({x,y,z,life:o.life??(dust?.35:.7),size:o.size??(dust?.05:.22),grow:o.grow??(dust?.05:.6),vx:o.vx??(Math.random()-.5)*.5,vy:o.vy??(dust?1.6+Math.random():.5),vz:o.vz??(Math.random()-.5)*.5,g:o.g??(dust?9:-.4),spinX:(Math.random()-.5)*3,spinY:(Math.random()-.5)*3,spinZ:(Math.random()-.5)*3,a0:o.opacity??(dust?.9:.8),color:o.color??(dust?0x8a7a8e:0xd6cfe2),rx:Math.random()*3,ry:Math.random()*3,rz:Math.random()*3,scale:o.size??.2,alpha:o.opacity??.8});}
export function smokeRing(x,y,z,n,o={}){for(let i=0;i<n;i++){const a=i/n*6.28+Math.random()*.5,sp=(o.speed??2)*(.6+Math.random()*.5);smoke(x+Math.cos(a)*.2,y,z+Math.sin(a)*.2,{vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vy:o.up??.4,size:o.size??.18,grow:o.grow??.5,life:o.life??.6,g:-.2,color:o.color});}}
export function puff(x,y,z,o={}){batch('puff').spawn({x,y,z,life:o.life??.7,size:o.size??.6,grow:o.grow??1.6,vx:o.vx??(Math.random()-.5)*.4,vy:o.vy??.7,vz:o.vz??(Math.random()-.5)*.4,g:o.g??0,color:o.color??0xd8d0e4,a0:o.opacity??.85,scale:o.size??.6,alpha:o.opacity??.85});}
export function burst(x,y,z,n,o={}){for(let i=0;i<n;i++){const a=Math.random()*6.28,sp=(o.speed??3)*(.4+Math.random()*.6);puff(x,y,z,{...o,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vy:(o.up??2)*(.5+Math.random()),g:o.g??9,grow:o.grow??.3,life:o.life??.6});}}
export function splash(x,y,z,power=1){burst(x,y+.1,z,Math.round(6+8*power),{color:0x9ccbec,size:.16+.08*power,speed:1.2+1.6*power,up:2+2*power,g:12,life:.6});for(let i=0;i<Math.min(10,4+Math.round(power*4));i++){const a=i*2.4;smoke(x,y+.12,z,{dust:true,color:0x9ccbec,size:.045+power*.025,grow:.02,vx:Math.cos(a)*(1+power),vz:Math.sin(a)*(1+power),vy:2+power,g:12,life:.45,opacity:.85});}ripple(x,y,z,1+power*1.2,.8+power*.4);if(power>.6)ripple(x,y,z,.6+power,.6);}

/* Обломки: тыквы, кирпичи, стены */
export function chunk(x, y, z, vel, o = {}) {
  if(W.debris.length>=160){const q=W.debris.shift();q.m.removeFromParent();}
  const s = o.size ?? 0.18;
  const m = mesh(o.geo || G.box, o.mat, x, y, z, s * (o.sx ?? 1), s * (o.sy ?? 1), s * (o.sz ?? 1), W.group);
  m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  W.debris.push({ m, v: vel.slice(), spin: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10], life: Math.min(10, (o.life ?? 3) * 2.5), r: o.r ?? s * 0.5, s0: m.scale.clone() });
  return m;
}

/* Наклейки на земле: брызги помидора, лужи */
export function decal(tex, x, y, z, size, life, color) {
  const m = mesh(G.plane, alphaMat(tex, { color: color ?? 0xffffff, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }), x, y + 0.02, z, size, size, 1, W.group);
  m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6.28;
  W.mapResources.add(m.material);
  W.decals.push({ m, life, t: 0 }); return m;
}

export function updateParticles(dt) {
  const state=particles();
  // v0.57: пар и дым расступаются вокруг персонажей (их скорость отталкивает облачка)
  const movers=[];for(const a of [W.player,...(W.bots||[])])if(a&&a.pos){const sp=Math.hypot(a.vel?.x||0,a.vel?.z||0);if(sp>.6)movers.push(a.pos.x,a.pos.y,a.pos.z,sp);}
  for(const kind of ['puff','smoke','dust','ripple']){
    const batch=state[kind];if(!batch)continue;let changed=false;
    for(const p of batch.records){if(!p.alive)continue;changed=true;p.t+=dt;const k=p.t/p.life;if(k>=1){p.alive=false;continue;}
      if(kind==='puff'||kind==='smoke')for(let m=0;m<movers.length;m+=4){const dx=p.x-movers[m],dz=p.z-movers[m+2],dy=p.y-movers[m+1]-.9;if(dy*dy>1.8)continue;const d2=dx*dx+dz*dz;if(d2>1.6||d2<1e-4)continue;const f=movers[m+3]*(1.6-d2)*1.4*dt/Math.sqrt(d2);p.vx+=dx*f;p.vz+=dz*f;p.vy+=.4*f;}
      if(kind==='ripple'){p.scale=.2+p.size*2*(1-(1-k)**2);p.alpha=.75*(1-k);continue;}
      p.vy-=p.g*dt;const drag=kind==='puff'?1:Math.exp(-dt*(kind==='dust'?.5:2.5));p.vx*=drag;p.vz*=drag;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      if(kind==='dust'&&p.vy<0){const floor=groundAt(p.x,p.z,0,p.y+.3);if(p.y<floor+.02){p.y=floor+.02;p.vy=0;p.vx*=.5;p.vz*=.5;}}
      if(kind==='puff'){p.scale=p.size*(1+p.grow*k);p.alpha=p.a0*(1-k*k);}
      else{p.rx+=p.spinX*dt;p.ry+=p.spinY*dt;p.rz+=p.spinZ*dt;p.scale=p.size+(p.grow-p.size)*(1-(1-k)**2);p.alpha=p.a0*(k<.4?1:1-(k-.4)/.6);}
    }
    if(changed)batch.sync();
  }
  for (let i = W.debris.length - 1; i >= 0; i--) {
    const d = W.debris[i], m = d.m;
    d.life -= dt; d.v[1] -= 22 * dt;
    m.position.x += d.v[0] * dt; m.position.y += d.v[1] * dt; m.position.z += d.v[2] * dt;
    m.rotation.x += d.spin[0] * dt; m.rotation.y += d.spin[1] * dt; m.rotation.z += d.spin[2] * dt;
    const gy = groundAt(m.position.x, m.position.z, 0.05, m.position.y + 0.3);
    if (m.position.y - d.r < gy) {
      m.position.y = gy + d.r; d.v[1] = Math.abs(d.v[1]) > 2 ? -d.v[1] * 0.3 : 0;
      d.v[0] *= 0.6; d.v[2] *= 0.6; d.spin = d.spin.map(s => s * 0.5);
    }
    if (d.life < 0.6) m.scale.copy(d.s0).multiplyScalar(Math.max(0.01, d.life / 0.6));
    if (d.life <= 0) { W.group.remove(m); W.debris.splice(i, 1); }
  }
  for (let i = W.decals.length - 1; i >= 0; i--) {
    const d = W.decals[i]; d.t += dt;
    if (d.t > d.life - 1) d.m.material.opacity = Math.max(0, d.life - d.t) * 0.9;
    if (d.t >= d.life) { W.group.remove(d.m); W.mapResources.delete(d.m.material); d.m.material.dispose(); W.decals.splice(i, 1); }
  }
}
