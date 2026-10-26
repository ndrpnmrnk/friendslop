import {G,col,glow,mesh,compose} from '../core/gfx.js';
import {W} from './state.js';
export function routeLight(b,x,z,y=0,ry=0,floor=false,color=0xe5b87d){
 const g=b.prop(x,z,ry);g.position.y+=y;g.add(compose('route-light50-'+floor+'-'+color,a=>{if(floor){a(G.box,col(0x42434a),0,.035,0,.23,.07,.23);a(G.box,glow(color),0,.074,0,.16,.018,.16);}else{a(G.box,col(0x45424d),0,0,0,.34,.14,.045);a(G.box,glow(color),0,0,.028,.24,.07,.018);for(const sx of[-.14,.14])a(G.box,col(0x9e978b),sx,0,.025,.02,.07,.018);}}));
 const n={x:Math.sin(ry),z:Math.cos(ry)};b.light(x+n.x*.2,z+n.z*.2,1.25,floor?y:Math.min(0,Math.floor(y)),true);const source=W.lightSources[W.lightSources.length-1];Object.assign(source,{y:b.Y+y+(floor?.25:0),strength:3.2,range:4.2,color});
 return g;
}
