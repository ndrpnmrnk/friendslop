import {THREE,G,col,tmat,paint,lam} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {localActors,districtFrame} from '../district-motion.js';
import {SKATE_LAYOUT as L,skateSection,rentalRideClear} from '../skate-layout.js';
import {bowlHeight} from '../skate-bowl.js';
import {skateBotController} from '../skate-bots.js';
import {breakBox} from '../breakables.js';
import {moveSolid} from '../physics.js';

// v0.61.3 - ONLY this district was rebuilt. No football or generic physics
// adjustments beyond the isolated W.skateBowl height-field hook.
const metal=()=>tmat(T.paintMetal(0x6c7785));
function deepBowl(b){
 const {x,z,patchHalf}=L.bowl;
 // True 3.05m-deep recess; one continuous floor/curved-wall mesh plus a
 // square outer patch covering the exact hole in the world ground slab.
 const sides=64,rings=32,positions=[],uv=[],indices=[];
 for(let j=0;j<=rings+1;j++){
  for(let i=0;i<=sides;i++){
   const angle=i/sides*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
   // Last ring hits the square cutout edges, covering every corner without
   // another flat overlay that could flicker against the recessed surface.
   const rad=j===rings+1?patchHalf/Math.max(Math.abs(c),Math.abs(s)):outerRadius*j/rings;
   const px=c*rad,pz=s*rad,ht=j===rings+1?0:bowlHeight(rad,L.bowl);
   positions.push(px,ht+.002,pz);uv.push((px+outerRadius)/3,(pz+outerRadius)/3);
  }
 }
 for(let j=0;j<rings+1;j++)for(let i=0;i<sides;i++){
  const a=j*(sides+1)+i,c=a+sides+1;
  indices.push(a,a+1,c,a+1,c+1,c);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setIndex(indices);geo.computeVertexNormals();
 const root=b.prop(x,z),surface=new THREE.Mesh(geo,lam({map:T.concrete(),side:THREE.DoubleSide},'deepSkateBowl'));
 root.add(surface);
 // One solid coping loop, without the old coplanar white floor ring.
 const coping=new THREE.Mesh(new THREE.TorusGeometry(L.bowl.rimRadius,.065,6,64),metal());
 coping.rotation.x=Math.PI/2;coping.position.y=.095;root.add(coping);
 // Keep only clean metal coping: no stray orange dashes around the bowl.
 W.skateBowl={...L.bowl,x:b.X(x),z:b.Z(z),baseY:b.Y};
}
function halfpipe(b){
 const h=L.halfpipe;
 b.ground(4.1,3.7,15,15.4,T.concrete(),2.5,.024);
 b.quarterPipe(h.x,h.front,h.width,h.radius,Math.PI,.8);
 b.quarterPipe(h.x,h.back,h.width,h.radius,0,.8);
 b.sign(h.x,2.6,3.25,0,'ХАФПАЙП','#312539','#f8c36e',3.4,.62);
}
function closedWedge(b,x,z,w,len,h,ry){
 b.wedge(x,z,w,len,h,ry);
 // Closed back and triangular side skirts: the underside is not hollow.
 const back=b.prop(x,z,ry),sideMat=tmat(T.concrete());
 const shape=new THREE.Shape();
 shape.moveTo(0,0);shape.lineTo(len,0);shape.lineTo(len,h);shape.closePath();
 const sideGeo=new THREE.ShapeGeometry(shape);
 for(const sx of[-1,1]){
  const side=new THREE.Mesh(sideGeo,lam({map:T.concrete(),side:THREE.DoubleSide},'skateWedgeSide'));
  side.rotation.y=-Math.PI/2;side.position.x=sx*w/2;back.add(side);
 }
 const cap=new THREE.Mesh(G.box,sideMat);
 cap.position.set(0,h/2,len+.045);cap.scale.set(w,h,.11);back.add(cap);
}
function rental(b){
 const {x,z,w,d,doorWidth}=L.rental;
 const brick=tmat(T.brickWall()),roof=tmat(T.roof()),wood=tmat(T.wood()),mt=metal();
 const glass=lam({color:0x8dc6d6,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide},'skateRentalGlass');
 const frame=col(0x303946),inside=col(0x454758),accent=col(0xe2a36a);
 const front=z+d/2,back=z-d/2,H=3.45,wall=.22;
 // Hollow building: four separate walls, genuinely open entrance, not a
 // single solid box hiding an inaccessible interior.
 b.ground(x-w/2+.1,z-d/2+.1,x+w/2-.1,z+d/2-.1,T.wood(),1.6,.055);
 b.box(x,back,w,wall,H,brick);
 for(const sx of[-1,1])b.box(x+sx*w/2,z,wall,d,H,brick);
 const paneW=(w-doorWidth)/2;
 for(const sx of[-1,1]){
  const px=x+sx*(doorWidth/2+paneW/2);
  // Every storefront window is a genuine shared breakable glass panel.
  breakBox(b.X(px),b.Y,b.Z(front),paneW-.09,2.52,.09,'glass',glass);
  // No horizontal bars across the glass or entrance.
  b.box(px,front+.09,paneW,.075,.18,frame,{y:2.43,solid:false});
  b.box(px+sx*(paneW/2-.07),front+.09,.12,.12,2.5,mt,{solid:false});
 }
 b.box(x,front,w,.18,.86,brick,{y:2.6});
 b.box(x,z,w+.45,d+.45,.22,roof,{y:H,solid:true});
 // Removed the three-strip canopy in front of the entrance.
 b.sign(x,H+.37,front+.12,0,'ПРОКАТ','#29283b','#f5c46e',4.2,.65);
 // Sliding transparent double doors are cosmetic and open automatically;
 // the 2.35 m passage itself has no collision, so E/ride never gets stuck.
 // Two independent breakable sliding leaves, not a fake solid front.
 // Dynamic breakables bypass static instancing so door translation remains real.
 const doorZ=b.Z(front+.12),doorY=b.Y+.10,doorW=(doorWidth-.07)/2;
 const leaves=[-1,1].map(side=>{
  const startX=b.X(x+side*doorWidth/4);
  const piece=breakBox(startX,doorY,doorZ,doorW,2.45,.055,'glass',glass);
  piece.dynamic=true;
  W.keep.push(piece.mesh); // dynamic pane must survive the static world bake
  piece.mesh.userData.noNet=true; // replicate alive via breakable state only
  return {side,startX,piece};
 });
 const cx=b.X(x),cz=b.Z(front);let open=0;
 W.animated.push(dt=>{
  let near=false;
  for(const a of localActors())if(a.pos&&Math.hypot(a.pos.x-cx,a.pos.z-cz)<3.4&&Math.abs(a.pos.y-b.Y)<3.2){near=true;break;}
  open+=(Number(near)-open)*Math.min(1,dt*7);
  for(const {side,startX,piece}of leaves){
   if(!piece.alive)continue;
   const nx=startX+side*open*doorW;
   piece.mesh.position.x=nx;
   // Collision moves with each door and disappears when the entrance opens.
   moveSolid(piece.solid,nx-doorW/2,doorZ-.028,nx+doorW/2,doorZ+.028,doorY,doorY+2.45);
   piece.solid.on=open<.38;
  }
 });
 // Large readable interior, open central walkway, service counter, displays.
 b.box(x,back+1.2,3.75,.85,1.05,wood);
 b.box(x,back+1.2,3.75,.085,.18,mt,{y:1.04,solid:false});
 for(const sx of[-1,1]){
  const shelfX=x+sx*(w/2-.76);
  b.box(shelfX,z-.52,.9,2.35,.94,inside,{y:.12});
  b.box(shelfX,z-.52,1.02,2.47,.10,wood,{y:1.04,solid:false});
  for(let i=0;i<3;i++){
   b.m(G.box,accent,shelfX,1.18+i*.45,z-.9,.38,.045,.78).rotation.y=i*.16;
  }
 }
 b.box(x,back+.13,2.8,.05,.18,accent,{y:2.08,solid:false});
 b.m(G.box,accent,x,3.04,z,2.1,.09,.34);
 // Natural placements, including several scattered outside the rental.
 for(const ride of L.rentalRides){
  if(!rentalRideClear(ride))throw new Error('Unsafe skate rental vehicle spawn');
  const p=b.ride(ride.kind,ride.x,ride.z,ride.ry);
  p.districtRental='skatepark';
 }
}
function skateRideBonus(b){
 const run=new WeakMap();
 W.animated.push(()=>{
  if(!W.onTrick)return;
  const now=performance.now()/1000;
  for(const a of localActors()){
   const ride=a.ride;
   if(!ride||ride.rider!==a||!['skate','scooter'].includes(ride.kind)){run.delete(a);continue;}
   const speed=Math.hypot(ride.vx||0,ride.vz||0);
   const section=skateSection(ride.x-b.ox,ride.z-b.oz,ride.y-b.Y);
   const r=run.get(a)||{section:null,entered:0,x:0,z:0,last:-100};
   if(section&&section!==r.section&&speed>4.2){
    r.section=section;r.entered=now;r.x=ride.x;r.z=ride.z;
   }else if(!section&&r.section){
    if(now-r.entered>.38&&now-r.entered<9&&speed>4.6&&
       Math.hypot(ride.x-r.x,ride.z-r.z)>2&&now-r.last>9){
      W.onTrick(a,'skate-line-'+r.section);r.last=now;
    }
    r.section=null;
   }
   run.set(a,r);
  }
 });
}
export default {
 id:'skatepark',name:'Скейт-парк',ground:'asphalt',size:44,
 holes:[[L.bowl.x-L.bowl.patchHalf,L.bowl.z-L.bowl.patchHalf,
         L.bowl.x+L.bowl.patchHalf,L.bowl.z+L.bowl.patchHalf]],
 build(b){
  const q=L.bowl,h=q.patchHalf;
  // No ground mesh over the hole! The bowl itself covers the square cutout
  // down to its actual playable floor below the district deck.
  b.ground(1.6,1.6,q.x-h,42.4,T.concrete(),4);
  b.ground(q.x+h,1.6,42.4,42.4,T.concrete(),4);
  b.ground(q.x-h,1.6,q.x+h,q.z-h,T.concrete(),4);
  b.ground(q.x-h,q.z+h,q.x+h,42.4,T.concrete(),4);
  b.box(22,1,38,.3,2.95,tmat(T.brickWall()));
  for(const[x,i]of[[10,1],[22,3],[34,5]])b.graffiti(x,1.42,1.20,0,3.2,i);

  deepBowl(b);halfpipe(b);
  for(const [x0,z0,x1,z1,y]of [...L.railsNE,...L.railsSW])b.grindRail(x0,z0,x1,z1,y);
  closedWedge(b,36,14.1,3.2,2.5,.57,Math.PI);
  closedWedge(b,8.2,27,3.2,2.5,.53,0);
  rental(b);

  b.fence(2.2,5,2.2,26,1.25,'mesh');
  b.fence(41.8,5,41.8,23.5,1.25,'mesh');
  b.bench(5.4,24.5,Math.PI/2);
  b.bench(12,40,-Math.PI/2);
  b.bin(3.2,30.2);
  b.lamp(3.1,14,Math.PI/2);
  b.lamp(40.8,17,-Math.PI/2);
  b.sign(35.8,2.45,2.8,0,'SKATE PARK','#302537','#f5c46e',4.2,.7);
  b.grabTarget({x:5.4,z:28.4,r:1.2,kind:'bounce',label:'рампа'});
  districtFrame(b,'skatepark',{spawn:L.spawn,floor:L.missionFloor,catArea:[2,39.2,10,42.2]});
  b.zone('floor',35.8,18.2,40.5,26.0);
  b.hw(()=>{b.pumpkin(41.4,33.5);b.pumpkin(3,29);});
  skateRideBonus(b);
  W.skateOriginX=b.ox;W.skateOriginZ=b.oz;W.skateBaseY=b.Y;
  W.skateAI=skateBotController();
 }
};
