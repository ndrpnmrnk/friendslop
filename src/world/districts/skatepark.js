import {THREE,G,col,tmat,lam,paint} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {localActors,districtFrame} from '../district-motion.js';
import {SKATE_LAYOUT as L,skateSection,rentalRideClear} from '../skate-layout.js';
import {outerRadius,bowlSample} from '../skate-bowl.js';
import {skateBotController} from '../skate-bots.js';

// v0.61.3: one actual recessed bowl surface, glass-front walk-in rental,
// non-overlapping shared scooter/skate spawns and closed underside ramp faces.
const trim=()=>tmat(T.paintMetal(0x69747f));
function buildBowl(b){
 const q=L.bowl,R=outerRadius(q),n=q.segments,k=q.rings;
 const vertices=[],uv=[],indexes=[];
 for(let i=0;i<=k+1;i++){
  for(let j=0;j<n;j++){
   const a=j*2*Math.PI/n,c=Math.cos(a),s=Math.sin(a);
   // The last ring is the outer square edge of the 18.7 m ground cutout.
   // The last layer is exactly y=0 so it joins the original district slab.
   const r=i===k+1?q.patchHalf/Math.max(Math.abs(c),Math.abs(s)):R*i/k;
   const px=c*r,pz=s*r,y=i===k+1?0:bowlSample(q.x+px,q.z+pz,q).height;
   vertices.push(px,y+.002,pz);uv.push(px/3,pz/3);
  }
 }
 for(let i=0;i<k+1;i++)for(let j=0;j<n;j++){
  const a=i*n+j,bb=i*n+(j+1)%n,c=(i+1)*n+j,d=(i+1)*n+(j+1)%n;
  indexes.push(a,bb,c,bb,d,c);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setIndex(indexes);geo.computeVertexNormals();
 const material=lam({map:T.concrete(),side:THREE.DoubleSide},'skateDeepBowlConcrete');
 const mesh=b.m(geo,material,q.x,0,q.z);
 mesh.userData.ps1Stable=true; // fixed ramp surfaces must not shimmer against collision geometry
 const coping=b.m(new THREE.TorusGeometry(R+.04,.065,6,n),trim(),q.x,.09,q.z);
 coping.rotation.x=Math.PI/2;
 // Coping is visual only. Physical height is the same continuous surface.
 for(let j=0;j<12;j++){
  const a=2*Math.PI*j/12,r=R+.75;
  const stroke=b.m(G.box,paint(0xd3b78a),q.x+Math.cos(a)*r,.028,q.z+Math.sin(a)*r,.38,.055,.09);
  stroke.rotation.y=-a;
 }
}
function halfpipe(b){
 const h=L.halfpipe;
 b.ground(4.1,3.7,15,15.4,T.concrete(),2.5,.024);
 for(const [z,ry]of [[h.front,Math.PI],[h.back,0]]){
  const top=b.quarterPipe(h.x,z,h.width,h.radius,ry,.8);
  // Solid-looking back support: the original ramp had a see-through
  // underside, despite having collision steps. Decorative closure only.
  const U=h.radius*.78,f=Math.cos(ry);
  b.m(G.box,tmat(T.concrete()),h.x,top/2,z+f*(U+.75),h.width-.08,top,.13);
  for(const side of[-1,1])b.m(G.box,tmat(T.paintMetal(0x62606a)),h.x+side*(h.width/2-.06),top/2,z+f*(U+.3),.12,top,.67);
 }
 b.sign(h.x,2.6,3.25,0,'ХАФПАЙП','#312539','#f8c36e',3.4,.62);
}
function closedWedge(b,x,z,w,len,height,ry=0){
 b.wedge(x,z,w,len,height,ry);
 const ux=Math.sin(ry),uz=Math.cos(ry),endX=x+ux*len,endZ=z+uz*len;
 const cap=b.m(G.box,tmat(T.concrete()),endX,height/2,endZ,
  Math.abs(ux)>.5?.16:w,height,Math.abs(ux)>.5?w:.16);
 // cap is visual; the existing wedge step solids provide all collisions.
 cap.userData.ps1Stable=true;
}
function rails(b,rows){
 for(const [x0,z0,x1,z1,y]of rows)b.grindRail(x0,z0,x1,z1,y);
}
function rental(b){
 const {x,z,w,d,entryWidth}=L.rental,h=3.12;
 const brick=tmat(T.brickWall()),frame=trim(),roof=tmat(T.roof());
 const glass=lam({color:0x85c2c2,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide},'skateRentalGlass');
 // Real accessible interior: never use one solid b.box for the whole volume.
 b.ground(x-w/2+.17,z-d/2+.17,x+w/2-.17,z+d/2-.12,T.wood(),2.5,.035);
 b.box(x,z-d/2+.10,w,.20,h,brick);
 for(const side of[-1,1]){
  const sx=x+side*(w/2-.10);
  // Real side glass: brick below/above the windows, structural end posts,
  // clear panes and an actual window collision volume, not fake glass on brick.
  b.box(sx,z,.20,d,.60,brick);
  b.box(sx,z,.20,d,.30,brick,{y:h-.30});
  for(const end of [-1,1])b.box(sx,z+end*(d/2-.39),.20,.80,h,brick);
  b.m(G.box,glass,sx-side*.115,1.78,z,.035,1.95,d-1.65);
  b.solid(sx,z,.07,d-1.65,.60,1.95);
  b.m(G.box,frame,sx-side*.14,1.78,z,.055,2.0,.06);
 }
 // Front is two fixed glazed wall portions and a 2.15 metre clear doorway.
 const front=z+d/2-.1,sideWidth=(w-entryWidth)/2;
 for(const sign of[-1,1]){
  const fx=x+sign*(entryWidth/2+sideWidth/2);
  b.box(fx,front,sideWidth,.20,.56,brick);
  b.box(fx,front,sideWidth,.20,.28,brick,{y:h-.28});
  b.m(G.box,glass,fx,1.75,front+.012,sideWidth-.16,2.08,.035);
  b.solid(fx,front,sideWidth-.10,.07,.56,2.20);
  for(const ss of[-1,1])b.m(G.box,frame,fx+ss*(sideWidth/2-.07),1.75,front+.06,.055,2.2,.045);
 }
 for(const dx of[-entryWidth/2,entryWidth/2])b.box(x+dx,front,.12,.18,h,frame);
 // Hinged glass door leaves stand open along the front jambs, leaving a real
 // door opening at the center. No fake collision/door that traps player.
 for(const sign of[-1,1]){
  const leaf=b.m(G.box,glass,x+sign*(entryWidth/2+.29),1.2,front+.36,.05,2.27,.75);
  leaf.rotation.y=sign*.36;
  b.m(G.box,frame,x+sign*(entryWidth/2+.29),1.2,front+.38,.047,2.32,.05);
 }
 b.box(x,z,w+.25,d+.25,.16,roof,{y:h,solid:false});
 b.solid(x,z,w+.1,d+.1,h,.16);
 b.sign(x,h+.58,front+.19,0,'ПРОКАТ СКЕЙТОВ','#29283b','#f5c46e',4.7,.7);
 // Counter, display shelves and decorated racks leave an open 2m aisle from
 // the door right into the building. All use cached existing game textures.
 b.counter(x-2.5,z-1.05,2.3,.65,.97,tmat(T.wood()));
 b.shelf(x+2.8,z-1.30,2.4,Math.PI,'office');
 for(const [px,pz]of [[x-2.9,z+1.3],[x+2.9,z+1.3]]){
  b.m(G.box,frame,px,1.35,pz,.12,2.36,.16);
  b.m(G.box,col(0xe0aa61),px,2.20,pz,.55,.08,.16);
 }
 b.bench(x-2.9,z+.65,Math.PI/2);
 b.sign(x,2.27,z-d/2+.22,Math.PI,'ПРОКАТ','#333248','#e9c7a0',2.7,.5);
 // No painted parking lines and no line of identical scooter spawns.
 for(const r of L.rentalRides){
  if(!rentalRideClear(r))throw new Error('Skate rental spawned inside obstacle');
  const p=b.ride(r.kind,r.x,r.z,r.ry);
  p.districtRental='skatepark';
 }
}
function lineScore(b){
 const progress=new WeakMap();
 W.animated.push(()=>{
  if(!W.onTrick)return;
  const now=performance.now()/1000;
  for(const actor of localActors()){
   const ride=actor.ride;
   if(!ride||ride.rider!==actor||!['skate','scooter'].includes(ride.kind)){progress.delete(actor);continue;}
   const section=skateSection(ride.x-b.ox,ride.z-b.oz,ride.y-b.Y);
   const speed=Math.hypot(ride.vx||0,ride.vz||0);
   const s=progress.get(actor)||{section:null,t:0,x:0,z:0,last:-100};
   if(section&&section!==s.section&&speed>4.2){s.section=section;s.t=now;s.x=ride.x;s.z=ride.z;}
   else if(!section&&s.section){
    if(now-s.t>.4&&now-s.t<9&&speed>4.2&&Math.hypot(ride.x-s.x,ride.z-s.z)>2&&now-s.last>9){
      W.onTrick(actor,'skate-line-'+s.section);s.last=now;
    }
    s.section=null;
   }
   progress.set(actor,s);
  }
 });
}
export default {
 id:'skatepark',name:'Скейт-парк',ground:'asphalt',size:44,
 holes:[[L.bowl.x-L.bowl.patchHalf,L.bowl.z-L.bowl.patchHalf,
         L.bowl.x+L.bowl.patchHalf,L.bowl.z+L.bowl.patchHalf]],
 build(b){
  const q=L.bowl,h=q.patchHalf;
  // Leave the actual rectangular opening in district slab unobstructed.
  // The generated recessed bowl mesh replaces the *entire* cut-out area.
  b.ground(1.6,1.6,q.x-h,42.4,T.concrete(),4);
  b.ground(q.x+h,1.6,42.4,42.4,T.concrete(),4);
  b.ground(q.x-h,1.6,q.x+h,q.z-h,T.concrete(),4);
  b.ground(q.x-h,q.z+h,q.x+h,42.4,T.concrete(),4);
  W.skateBowl={...q,x:b.X(q.x),z:b.Z(q.z),y:b.Y};
  buildBowl(b);
  b.box(22,1,38,.3,2.95,tmat(T.brickWall()));
  for(const [x,i]of[[10,1],[22,3],[34,5]])b.graffiti(x,1.42,1.20,0,3.2,i);
  halfpipe(b);rails(b,L.railsNE);rails(b,L.railsSW);
  closedWedge(b,36,14.1,3.2,2.5,.57,Math.PI);
  closedWedge(b,8.2,27,3.2,2.5,.53,0);
  rental(b);
  b.fence(2.2,5,2.2,26,1.25,'mesh');
  b.fence(41.8,5,41.8,23.5,1.25,'mesh');
  b.bench(5.4,24.5,Math.PI/2);b.bench(12,40,-Math.PI/2);
  b.bin(40.5,29);b.lamp(3.1,14,Math.PI/2);b.lamp(40.8,17,-Math.PI/2);
  b.grabTarget({x:5.4,z:28.4,r:1.2,kind:'bounce',label:'рампа'});
  districtFrame(b,'skatepark',{spawn:L.spawn,floor:L.missionFloor,catArea:[2,39.2,10,42.2]});
  b.zone('floor',33,19,40,27);
  b.hw(()=>{b.pumpkin(41,27);b.pumpkin(3,29);});
  lineScore(b);
  W.skateOriginX=b.ox;W.skateOriginZ=b.oz;W.skateBaseY=b.Y;
  W.skateAI=skateBotController();
 }
};
