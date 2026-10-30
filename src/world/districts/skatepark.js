import {THREE,G,col,tmat,paint,lam} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {localActors,districtFrame} from '../district-motion.js';
import {SKATE_LAYOUT as L,skateSection,rentalRideClear} from '../skate-layout.js';
import {bowlVisualHeight} from '../skate-bowl.js';
import {skateBotController} from '../skate-bots.js';
import {breakBox} from '../breakables.js';
import {moveSolid} from '../physics.js';

// v0.61.3 - ONLY this district was rebuilt. No football or generic physics
// adjustments beyond the isolated W.skateBowl height-field hook.
const metal=()=>tmat(T.paintMetal(0x6c7785));
function deepBowl(b){
 const {x,z,outerRadius,patchHalf}=L.bowl;
 // Sharp visual corner at the coping, but a separate smooth analytic
 // contact surface handles wheels/avatars. No solid rim can snag a rider.
 const sides=112,rings=96,positions=[],uv=[],indices=[];
 for(let j=0;j<=rings+2;j++){
  for(let i=0;i<=sides;i++){
   const angle=i/sides*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
   // Duplicate the rim ring so deck and ramp have independent normals.
   // Without the split, averaged normals make the edge look rounded.
   const rad=j===rings+2?patchHalf/Math.max(Math.abs(c),Math.abs(s)):
      j===rings+1?outerRadius:outerRadius*j/rings;
   const px=c*rad,pz=s*rad,ht=j>=rings+1?0:bowlVisualHeight(rad,L.bowl);
   positions.push(px,ht+.002,pz);uv.push((px+outerRadius)/3,(pz+outerRadius)/3);
  }
 }
 for(let j=0;j<=rings+1;j++){
  if(j===rings)continue; // split the coincident rings, never shade across the sharp edge
  for(let i=0;i<sides;i++){
   const a=j*(sides+1)+i,c=a+sides+1;
   indices.push(a,a+1,c,a+1,c+1,c);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setIndex(indices);geo.computeVertexNormals();
 const root=b.prop(x,z),surface=new THREE.Mesh(geo,lam({map:T.concrete(),side:THREE.DoubleSide},'deepSkateBowl'));
 root.add(surface);
 const coping=new THREE.Mesh(new THREE.TorusGeometry(L.bowl.rimRadius,.016,5,112),metal());
 coping.rotation.x=Math.PI/2;coping.position.y=.006;root.add(coping);
 W.skateBowl={...L.bowl,x:b.X(x),z:b.Z(z),baseY:b.Y};
}

function halfpipe(b){
 const h=L.halfpipe,metalMat=metal(),dark=col(0x333943);
 b.ground(4.1,3.7,15,15.4,T.concrete(),2.5,.024);
 const first=b.quarterPipe(h.x,h.front,h.width,h.radius,Math.PI,.8);
 const second=b.quarterPipe(h.x,h.back,h.width,h.radius,0,.8);
 // Close visible undersides and give the halfpipe proper metal kick plates,
 // coping and deck edge guards. No floating label above the transition.
 const U=h.radius*.78,deck=.8;
 for(const [z,dir]of[[h.front,-1],[h.back,1]]){
  const back=z+dir*(U+deck*.92);
  b.box(h.x,back,h.width,.15,first,tmat(T.concrete()),{solid:false});
  b.box(h.x,z+dir*(U+.08),h.width+.08,.1,.20,metalMat,{y:first-.12,solid:false});
  for(const side of[-1,1]){
   b.box(h.x+side*(h.width/2-.07),z+dir*(U+.28),.09,.92,first,dark,{solid:false});
   b.box(h.x+side*(h.width/2-.11),z+dir*(U+.22),.11,.32,.12,metalMat,{y:first,solid:false});
  }
 }
 // Flat central section, side landing platforms and industrial-looking
 // dark metal detailing - no raised invisible wall in the travel lane.
 for(const x of [h.x-h.width/2+.24,h.x+h.width/2-.24]){
  for(const z of [h.front-1.3,h.back+1.3])
   b.m(G.box,metalMat,x,.06,z,.18,.10,.6);
 }
 // Braced metal sides and anti-slip deck strips, never hidden collision lips.
 for(const sx of[-1,1]){
  const px=h.x+sx*(h.width/2+.10);
  for(const zz of[h.front-1.10,h.back+1.10]){
   b.m(G.box,dark,px,first*.51,zz,.11,first+.15,.14);
   b.m(G.box,metalMat,px,first+.04,zz,.18,.045,.38);
  }
 }
 for(const zz of[h.front-1.62,h.back+1.62])
  for(let i=0;i<5;i++)b.m(G.box,metalMat,
   h.x-h.width/2+.65+i*(h.width-1.3)/4,first+.008,zz,.42,.012,.08);
 // Separate playable grind bars next to the halfpipe, not across its mouth.
 b.grindRail(3.7,17.3,11.0,17.3,.53);
 b.grindRail(15.9,4.6,15.9,11.3,.58);
}
function closedWedge(b,x,z,w,len,h,ry){
 // b.wedge already extrudes a CLOSED triangular prism with side faces
 // and a full back face. Extra side skins and back cap were coplanar
 // with those faces (z-fighting: the reported black barcode streaks).
 b.wedge(x,z,w,len,h,ry);
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
 // Clean flush metal fascia, no hovering sign or floating lettering.
 b.box(x,front+.204,3.9,.045,.30,mt,{y:2.87,solid:false});
 for(const side of[-1,1])b.m(G.box,accent,x+side*1.68,3.07,front+.236,.11,.21,.024);
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
 // Functional rental interior. All racks are wall-mounted and the central
 // ~2.35m doorway/walkway remains entirely unobstructed.
 const counterZ=back+1.05;
 b.box(x,counterZ,3.0,.74,.91,wood);
 b.box(x,counterZ,3.06,.82,.075,mt,{y:.91,solid:false});
 // Checkout terminal, keyboard, small money drawer and paper labels.
 b.m(G.box,frame,x+.75,1.26,counterZ-.07,.48,.55,.10).rotation.x=-.12;
 b.m(G.box,col(0x87b3c7),x+.75,1.26,counterZ-.007,.39,.42,.012);
 b.m(G.box,inside,x+.75,.99,counterZ+.16,.64,.04,.21);
 b.m(G.box,frame,x-.55,1.0,counterZ,.52,.13,.44);
 b.m(G.box,accent,x-.55,1.09,counterZ-.20,.22,.022,.13);
 // Real mounted skateboard decks, trucks and wheels (not generic shelves).
 for(const side of[-1,1]){
  const bx=x+side*(w/2-.24);
  const deckColors=[0x9a664c,0x587b98,0x956a85];
  for(let i=0;i<3;i++){
   const zz=back+1.55+i*.88,yy=1.52+(i%2)*.34;
   const painted=col(deckColors[i]);
   b.m(G.box,painted,bx,yy,zz,.09,.13,.73);
   for(const end of[-1,1]){
    b.m(G.box,mt,bx-side*.074,yy-.025,zz+end*.24,.09,.065,.13);
    b.m(G.cyl8,frame,bx-side*.17,yy-.025,zz+end*.24,.09,.055,.09).rotation.z=Math.PI/2;
   }
   b.m(G.box,accent,bx-side*.052,yy+.028,zz,.012,.026,.42);
  }
  // Dedicated wall hooks hold helmets with recognizable shell/visor.
  for(let i=0;i<2;i++){
   const zz=front-1.05-i*.72,helmetX=bx-side*.20;
   b.m(G.box,mt,bx-side*.10,1.89,zz,.18,.08,.12);
   b.m(G.sph10,col(i?0xe09a59:0x6e9db0),helmetX,1.70,zz,.26,.21,.24);
   b.m(G.box,frame,helmetX-side*.15,1.61,zz,.13,.065,.23);
   b.m(G.box,inside,helmetX,1.54,zz,.20,.035,.08);
  }
 }
 // Low bench and repair tools in rear corners; no strange large shelves.
 for(const side of[-1,1]){
  const bx=x+side*(w/2-.80);
  b.box(bx,back+.92,1.20,.44,.43,wood);
  b.box(bx,back+.92,1.16,.41,.06,mt,{y:.43,solid:false});
  for(let j=0;j<2;j++)b.m(G.box,frame,bx+side*.37,1.36,back+.55+j*.34,.06,.52,.06);
 }
 // Wide ceiling lightbar with visible warm luminous tubes in the center.
 b.m(G.box,frame,x,3.24,z,2.1,.14,.43);
 for(const zz of[z-.11,z+.11])
  b.m(G.box,lam({color:0xffe3b3,emissive:0xffcb79,emissiveIntensity:1.35},'skateShopBulb'),x,3.13,zz,1.75,.055,.075);
 for(const sx of[-.93,.93])b.m(G.box,mt,x+sx,3.11,z,.045,.09,.45);
 // Real tracked light source, not a bright fake cone floating in the room.
 b.light(x,z,2.3,.035,true);
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
  for(const [x0,z0,x1,z1,y]of [...L.railsNE,...L.railsSW,...L.railsExtra])b.grindRail(x0,z0,x1,z1,y);
  // Low metal grind benches and reinforced curb islands in open corners.
  for(const [x,z,len,rot]of[[6.8,30.7,3.8,0],[36.4,20.4,3.6,Math.PI/2],[33.5,14.8,3.2,0]]){
   const q=Math.abs(Math.sin(rot))>.5;
   b.box(x,z,q?.66:len,q?len:.66,.31,tmat(T.concrete()));
   b.box(x,z,q?.75:len+.08,q?len+.08:.75,.065,metal(),{y:.32,solid:false});
   for(const side of[-1,1])b.m(G.box,col(0x3a4551),
     x+(q?side*.30:0),.17,z+(q?0:side*.30),
     q?.07:len,.34,q?len:.07);
  }
  // Additional low metal-edged grind blocks with unobstructed run-ups.
  for(const [px,pz,len]of[[6.3,35.6,2.8],[36.8,23.8,2.6]]){
   b.box(px,pz,len,.48,.26,tmat(T.concrete()));
   b.box(px,pz,len+.04,.53,.045,metal(),{y:.265,solid:false});
   for(const sign of[-1,1])b.m(G.box,metal(),px,.15,pz+sign*.22,len,.25,.035);
  }
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
  b.grabTarget({x:5.4,z:28.4,r:1.2,kind:'bounce',label:'рампа'});
  districtFrame(b,'skatepark',{spawn:L.spawn,floor:L.missionFloor,catArea:[2,39.2,10,42.2]});
  b.zone('floor',35.8,18.2,40.5,26.0);
  b.hw(()=>{b.pumpkin(41.4,33.5);b.pumpkin(3,29);});
  skateRideBonus(b);
  W.skateOriginX=b.ox;W.skateOriginZ=b.oz;W.skateBaseY=b.Y;
  W.skateAI=skateBotController();
 }
};
