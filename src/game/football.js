import {THREE,G,V3,mesh,col,tmat} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
import {actors} from './actors.js';
import {addItem} from './items.js';
import {groundAt} from '../world/physics.js';
import {burst,smokeRing} from '../world/particles.js';
import {sfx} from '../core/sfx.js';
export function footballEvent(getCtx,award,makePitch){return{dur:60,
 start(s){getCtx().prepareRace?.();W.football=s;if(!W.pitch||W.goals.length<2)makePitch(s);const p=W.pitch;s.ball=addItem('bigpumpkin',p.cx,p.y+.5,p.cz);s.ball.def={...s.ball.def,respawn:0,heavy:false};s.ball.noPickup=true;s.ball.football=true;s.goals=W.goals.slice().sort((a,b)=>Math.hypot(a.x-p.cx,a.z-p.cz)-Math.hypot(b.x-p.cx,b.z-p.cz)).slice(0,2);s.score=[0,0];s.team=new Map();s.goalsBy=new Map();s.assists=new Map();s.kickCD=new Map();s.touches=[];s.reset=0;s.marks=[];s.g=new THREE.Group();W.group.add(s.g);
 const all=actors().sort(()=>Math.random()-.5);all.forEach((a,i)=>{s.team.set(a,i%2);const ring=mesh(G.ring,new THREE.MeshBasicMaterial({color:i%2?0xb18cff:0x4ab0f0,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}),0,0,0,.55,.55,1,s.g);ring.rotation.x=-Math.PI/2;s.marks.push({a,ring});});
 s.goals.forEach((g,i)=>{const q=mesh(G.plane,tmat(T.sign(i===s.team.get(getCtx().player())?'СВОИ · ЗАЩИЩАЙ':'ЗАБИВАЙ СЮДА',i===s.team.get(getCtx().player())?'#76539f':'#387bad','#eee8ff')),g.x,g.y+2.7,g.z,3,.45,1,s.g);q.rotation.y=Math.atan2(g.fx,g.fz);});W.scoreboard?.(0,0);
 },
 target:s=>s.ball.pos,
 update(s,dt,t){const b=s.ball,p=W.pitch;s.reset-=dt;for(const [a,k]of s.kickCD)s.kickCD.set(a,k-dt);if(s.reset>0)return;
 if(b.state==='gone'||b.pos.y<p.y-2||Math.abs(b.pos.x-p.cx)>30||Math.abs(b.pos.z-p.cz)>25){b.state='rest';b.g.visible=true;b.pos.set(p.cx,p.y+.6,p.cz);b.vel.set(0,0,0);s.touches=[];}
 for(const a of actors()){const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,d=Math.hypot(dx,dz),speed=Math.hypot(a.vel.x,a.vel.z);if(d<1.1&&Math.abs(b.pos.y-a.pos.y-.4)<1&&(s.kickCD.get(a)||0)<=0&&(speed>.3||a.dive||a.slideT>0)){const fx=d>.04?dx/d:Math.sin(a.root.rotation.y),fz=d>.04?dz/d:Math.cos(a.root.rotation.y),hard=!!a.dive||a.slideT>0;const sp=hard?15:Math.min(12,4+speed*1.1);b.state='fly';b.owner=a;b.noHitT=.4;b.vel.set(fx*sp,hard?2.0:1.25,fz*sp);s.kickCD.set(a,.35);if(s.touches.at(-1)!==a){s.touches.push(a);if(s.touches.length>3)s.touches.shift();}sfx('bounce',{at:b.pos});}}
 for(let i=0;i<s.goals.length;i++){const g=s.goals[i],dx=b.pos.x-g.x,dz=b.pos.z-g.z,along=dx*g.fx+dz*g.fz,side=dx*g.rx+dz*g.rz;if(along<-.08&&along>-1.7&&Math.abs(side)<g.w/2&&b.pos.y<g.y+g.h){const win=1-i;s.score[win]++;const scorer=s.touches.at(-1);if(s.team.get(scorer)===win){s.goalsBy.set(scorer,(s.goalsBy.get(scorer)||0)+1);const helper=[...s.touches].reverse().find(a=>a!==scorer&&s.team.get(a)===win);if(helper)s.assists.set(helper,(s.assists.get(helper)||0)+1);}W.scoreboard?.(...s.score);sfx('goal');burst(g.x,g.y+1.2,g.z,18,{color:win?0xb18cff:0x4ab0f0,size:.15,speed:3,up:3});s.reset=1;b.state='rest';b.pos.set(p.cx,p.y+.5,p.cz);b.vel.set(0,0,0);s.touches=[];break;}}
 for(const {a,ring}of s.marks){ring.position.set(a.pos.x,groundAt(a.pos.x,a.pos.z,.1,a.pos.y+.1)+.06,a.pos.z);ring.visible=!a.hidden;}
 return null;},
 bot(s,b){const ball=s.ball.pos,g=s.goals[1-s.team.get(b)],dx=ball.x-g.x,dz=ball.z-g.z,d=Math.hypot(dx,dz)||1,behind=new V3(ball.x+dx/d*1.2,ball.y-.4,ball.z+dz/d*1.2);if(Math.hypot(b.pos.x-behind.x,b.pos.z-behind.z)<.9||b.kick>0){b.kick=Math.max(0,(b.kick||.6)-.016);return{x:ball.x-dx/d*2,y:ball.y-.4,z:ball.z-dz/d*2,kind:'event',near:.2};}return{x:behind.x,y:behind.y,z:behind.z,kind:'event',near:.4};},
 info(s){const team=s.team.get(getCtx().player());return `${s.score[0]}:${s.score[1]} · ТВОЯ КОМАНДА ${team?'ФИОЛЕТОВАЯ':'СИНЯЯ'} · В ЧУЖИЕ ВОРОТА`;},
 stop(s){W.football=null;const win=s.score[0]===s.score[1]?-1:s.score[0]>s.score[1]?0:1;if(win>=0){const winners=[...s.team].filter(([a,team])=>team===win).map(([a])=>a),weight=a=>1+(s.goalsBy.get(a)||0)*3+(s.assists.get(a)||0),total=winners.reduce((v,a)=>v+weight(a),0),pool=240+s.score[win]*40;for(const a of winners)award(a,Math.round(pool*weight(a)/total),a.pos);}s.ball.state='gone';s.ball.g.visible=false;s.g.traverse(q=>{if(q.isMesh&&q.geometry===G.ring)q.material.dispose();});s.g.removeFromParent();if(s.tmp)for(const q of s.tmp)q.removeFromParent();if(s.tmpGoals){W.goals=[];W.pitch=null;}},
};}
