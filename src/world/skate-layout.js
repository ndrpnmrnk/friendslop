// Shared 44 x 44 m skate district layout. Local district coordinates are in metres.
// Keep the pathways and vehicle rental clear when rearranging obstacles.
export const SKATE_LAYOUT=Object.freeze({
 size:44,
 bowl:{x:22,z:23,inner:7.1,width:14.2,radius:2.5,deck:.85},
 halfpipe:{x:9.5,z:9.4,width:9.2,radius:2.35,front:7.2,back:11.6},
 railsNE:[[32,7,40,7,.72],[32,11,40,11,.53]],
 railsSW:[[4.5,33,11.8,33,.58],[4.5,37,11.8,37,.68]],
 rental:{x:36,z:35,w:7.2,d:4.8},
 rentalRides:[
   {kind:'skate',x:30.7,z:40,ry:0},
   {kind:'scooter',x:33.3,z:40,ry:0},
   {kind:'skate',x:35.9,z:40,ry:0},
   {kind:'scooter',x:38.3,z:40,ry:0}
 ],
 spawn:[22,41],
 missionFloor:[16,35.6,27.5,41.7]
});
export const inRect=(x,z,r,pad=0)=>Math.abs(x-r.x)<r.w/2+pad&&Math.abs(z-r.z)<r.d/2+pad;
// A rideable must not start inside a solid kiosk or in the entrance corridor.
// The physically grounded world setup also checks the generated collision grid.
export const rentalRideClear=(p,L=SKATE_LAYOUT)=>{
 const wall=L.rental;
 return p.x>1.5&&p.x<42.5&&p.z>1.5&&p.z<42.5
  &&!inRect(p.x,p.z,wall,1.3)
  &&Math.hypot(p.x-L.bowl.x,p.z-L.bowl.z)>L.bowl.inner+1;
};
export function skateSection(x,z,y=0,L=SKATE_LAYOUT){
 const dx=x-L.bowl.x,dz=z-L.bowl.z,d=Math.hypot(dx,dz);
 if(d>=L.bowl.inner-.7&&d<=L.bowl.inner+2.6&&y>.22)return 'bowl';
 const h=L.halfpipe;
 if(Math.abs(x-h.x)<h.width/2+.35&&z>3.8&&z<15.2&&y>.22)return 'halfpipe';
 return null;
}
