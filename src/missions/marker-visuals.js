import {THREE} from '../core/gfx.js';
import {solidsNear} from '../world/physics.js';
const BEACON=new THREE.CylinderGeometry(.10,.24,1,8,8,true),colors=[];
for(let i=0;i<BEACON.attributes.position.count;i++){const h=BEACON.attributes.position.getY(i)+.5,k=Math.pow(1-h,1.7);colors.push(k,k,k);}BEACON.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
export function missionBeacon(color){return new THREE.Mesh(BEACON,new THREE.MeshBasicMaterial({color,vertexColors:true,transparent:true,opacity:.30,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));}
// Небольшой локальный запрос, а не перебор всех стен карты в каждом кадре.
export function missionCeiling(p,exclude){let clearance=Infinity;for(const s of solidsNear(p.x-.1,p.z-.1,p.x+.1,p.z+.1))if(s!==exclude&&s.on!==false&&p.x>s.x0-.05&&p.x<s.x1+.05&&p.z>s.z0-.05&&p.z<s.z1+.05&&s.y0>p.y+.35)clearance=Math.min(clearance,s.y0-p.y);return clearance;}
export function focusMissionMarker(m,player,on,t){
 const mk=m.marker,p=m.obj.pos(),distance=Math.hypot(p.x-player.pos.x,p.z-player.pos.z),near=Math.max(0,1-distance/90),height=Math.min(1.85,Math.max(.15,(mk.clearance??Infinity)-.30));
 mk.beam.scale.set(1,height*(1+Math.sin(t*2.4+m.id)*.025),1);mk.beam.position.y=.09+height/2;mk.beam.rotation.y=t*.25;
 const pulse=1+Math.sin(t*2.4+m.id)*.08;mk.bm.opacity=(on?.34:.14+.11*near)*pulse*(m.life<m.maxLife*.25?.7:1);
 const h=Math.min(on?1.40:1.02+.18*near,Math.max(.20,(mk.clearance??Infinity)*.35)),pop=1+((mk.pop||1)-1)*.25;
 mk.sp.scale.set(h*.8*pop,h*pop,1);mk.sp.material.opacity=on?1:.84+.12*near;
 mk.sp.position.y=Math.min(2.15,Math.max(.18,(mk.clearance??Infinity)-h*.6-.16))+Math.sin(t*2.2+m.id)*.045;
 mk.ring.visible=false;mk.wave.visible=false;
}
