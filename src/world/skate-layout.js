// Canonical 44×44 skatepark, with a physically continuous deep bowl and
// a real walk-in rental rather than a sealed decorative box.
export const SKATE_LAYOUT=Object.freeze({
 size:44,
 bowl:{x:22,z:23,flatRadius:4.25,rimRadius:8.05,outerRadius:8.05,depth:3.05,patchHalf:9.35},
 halfpipe:{x:9.5,z:9.4,width:9.2,radius:2.35,front:7.2,back:11.6},
 railsNE:[[32,7,40,7,.72],[32,11,40,11,.53]],
 railsSW:[[4.5,33,11.8,33,.58],[4.5,37,11.8,37,.68]],
 railsExtra:[[32.2,16,38.7,16,.66],[30.8,30.9,34.2,30.9,.52],[13.1,30.9,17,30.9,.47]],
 rental:{x:35.3,z:35.3,w:8.6,d:7.0,doorWidth:2.35},
 // Intentionally asymmetric natural placement, no white parking stripes.
 rentalRides:[
  {kind:'skate',x:28.5,z:39.9,ry:1.3},
  {kind:'scooter',x:38.7,z:40.5,ry:-.75},
  {kind:'skate',x:27.2,z:34.7,ry:-1.1},
  {kind:'scooter',x:40.7,z:27.2,ry:2.2},
  {kind:'skate',x:15.1,z:36.0,ry:.4}
 ],
 spawn:[22,41],
 missionFloor:[16,35.6,27.5,41.7]
});
export const inRect=(x,z,r,pad=0)=>Math.abs(x-r.x)<r.w/2+pad&&Math.abs(z-r.z)<r.d/2+pad;
export const rentalRideClear=(p,L=SKATE_LAYOUT)=>{
 const w=L.rental;
 return p.x>1.5&&p.x<42.5&&p.z>1.5&&p.z<42.5
  &&!inRect(p.x,p.z,w,1.15)
  &&Math.hypot(p.x-L.bowl.x,p.z-L.bowl.z)>L.bowl.outerRadius+1.0
  &&Math.hypot(p.x-L.spawn[0],p.z-L.spawn[1])>2.2;
};
export function skateSection(x,z,y=0,L=SKATE_LAYOUT){
 const r=Math.hypot(x-L.bowl.x,z-L.bowl.z);
 if(r>L.bowl.flatRadius+.25&&r<L.bowl.rimRadius+.1&&y<-.12)return 'bowl';
 const h=L.halfpipe;
 if(Math.abs(x-h.x)<h.width/2+.35&&z>3.8&&z<15.2&&y>.22)return 'halfpipe';
 return null;
}
