import {BOWL,outerRadius,bowlSample} from './skate-bowl.js';
// Canonical local metre coordinates. This must be deterministic for every guest.
export const SKATE_LAYOUT={
 size:44,bowl:BOWL,
 halfpipe:{x:9.5,z:9.4,width:9.2,radius:2.35,front:7.2,back:11.6},
 railsNE:[[32,7,40,7,.72],[32,11,40,11,.53]],
 railsSW:[[4.5,33,11.8,33,.58],[4.5,37,11.8,37,.68]],
 rental:{x:36,z:35,w:8,d:6,entryWidth:2.15},
 // Fixed scatter ensures the same scenery and ride positions on all clients;
 // no visually artificial marked line and no randomized network desync.
 rentalRides:[
  {kind:'skate',x:30,z:40.15,ry:-.4},
  {kind:'scooter',x:40.75,z:40.2,ry:.55},
  {kind:'skate',x:14.8,z:33.0,ry:1.0},
  {kind:'scooter',x:29.1,z:8.5,ry:-.8},
  {kind:'skate',x:18,z:37.9,ry:.45}
 ],
 spawn:[22,41],missionFloor:[16,35.6,27.5,41.7]
};
export const inRect=(x,z,r,pad=0)=>Math.abs(x-r.x)<r.w/2+pad&&Math.abs(z-r.z)<r.d/2+pad;
export const rentalRideClear=(p,L=SKATE_LAYOUT)=>{
 return p.x>1.5&&p.x<42.5&&p.z>1.5&&p.z<42.5
  &&!inRect(p.x,p.z,L.rental,1.1)
  &&Math.hypot(p.x-L.bowl.x,p.z-L.bowl.z)>outerRadius(L.bowl)+1
  &&!(Math.abs(p.x-L.halfpipe.x)<L.halfpipe.width/2+1&&p.z>4&&p.z<16);
};
export function skateSection(x,z,y=0,L=SKATE_LAYOUT){
 const q=bowlSample(x,z,L.bowl);
 if(q?.wall&&q.height<-.2&&Math.abs(y-q.height)<.85)return 'bowl';
 const h=L.halfpipe;
 if(Math.abs(x-h.x)<h.width/2+.35&&z>3.8&&z<15.2&&y>.22)return 'halfpipe';
 return null;
}
