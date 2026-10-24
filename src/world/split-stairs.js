import {G,V3,col,tmat} from '../core/gfx.js';
import {T} from '../core/textures.js';
// Центральный марш и два боковых: геометрия и маршруты берутся из одних точек.
export function splitStairs(b,guide,fh=4.2,floors=3){
 const levels=[],stone=tmat(T.concrete()),metal=col(0x625b55),edge=col(0xbdb39b),steps=8;
 const world=p=>({x:b.X(p.x),y:b.Y+p.y,z:b.Z(p.z)});
 function step(x,y,z,w,d){b.m(G.box,stone,x,y-.14,z,w,.28,d);b.solid(x,z,w,d,y-.28,.28);b.m(G.box,edge,x,y+.008,z,w,.015,Math.min(.08,d));}
 function rail(a,c){const d=new V3(c.x-a.x,c.y-a.y,c.z-a.z),m=b.m(G.cyl6,metal,(a.x+c.x)/2,(a.y+c.y)/2+1,(a.z+c.z)/2,.026,d.length(),.026);m.quaternion.setFromUnitVectors(new V3(0,1,0),d.normalize());for(let i=0;i<5;i++){const k=i/4;b.m(G.cyl6,metal,a.x+(c.x-a.x)*k,a.y+(c.y-a.y)*k+.5,a.z+(c.z-a.z)*k,.021,1,.021);}}
 for(let floor=0;floor<floors;floor++){const y=floor*fh;step(16,y,17.1,2.3,2.2);const center=[{x:16,y,z:18},{x:16,y,z:16.7}];
  for(let i=0;i<steps;i++){const z=16.2-(i+.5)*5.8/steps,top=y+(i+1)*fh/2/steps;step(16,top,z,2.2,5.8/steps);center.push({x:16,y:top,z});}
  step(16,y+fh/2,10.4,2.2,2.2);center.push({x:16,y:y+fh/2,z:10.4});
  const sides={};for(const side of[-1,1]){const path=center.map(p=>({...p}));for(let i=0;i<steps;i++){const x=16+side*(1.1+(i+.5)*4.9/steps),top=y+fh/2+(i+1)*fh/2/steps;step(x,top,10.4,4.9/steps,2.2);path.push({x,y:top,z:10.4});}
   step(16+side*6.3,y+fh,10.4,1.3,2.2);path.push({x:16+side*6.2,y:y+fh,z:10.4});sides[side<0?'left':'right']=path.map(world);
   rail({x:16+side*1.1,y:y+fh/2,z:9.3},{x:16+side*6,y:y+fh,z:9.3});rail({x:16+side*1.1,y:y+fh/2,z:11.5},{x:16+side*6,y:y+fh,z:11.5});
  }
  for(const x of[14.9,17.1])rail({x,y,z:16.2},{x,y:y+fh/2,z:11.5});
  for(const z of[8.86,17.65])for(const [x,w]of z<10?[[16,10.6]]:[[12.6,3.8],[19.4,3.8]]){b.m(G.box,metal,x,y+fh+1,z,w,.055,.055);b.solid(x,z,w,.07,y+fh,1);for(let xx=x-w/2;xx<=x+w/2;xx+=.8)b.m(G.cyl6,metal,xx,y+fh+.5,z,.022,1,.022);}

  levels.push(sides);
 }
 guide.splitStair={levels,cx:b.X(16),frontZ:b.Z(18.8)};guide.stair=[b.X(9.8),b.Z(10.4),b.X(16),b.Z(18)];return levels;
}
