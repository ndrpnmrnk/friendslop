import {THREE,G,V3,mesh,col,tmat,compose,lam} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from '../world/state.js';
export function busStop(p,yaw){const root=new THREE.Group();root.position.copy(p);root.rotation.y=yaw;W.group.add(root);W.keep.push(root);
 const marking=compose('bus43-parking',a=>{for(const x of[-1.65,1.65])for(let z=-4.9;z<5;z+=1.2)a(G.box,col(0xbdd6a0),x,.026,z,.07,.025,.72);for(const z of[-5.25,5.25])for(const x of[-1.2,0,1.2])a(G.box,col(0xbdd6a0),x,.026,z,.8,.025,.07);});
 const mat=new THREE.MeshBasicMaterial({color:0x9fb68b,transparent:true,opacity:.65,depthWrite:false});const geo=marking.children[0].geometry;const mark=mesh(geo,mat,0,0,0,1,1,1,root);mark.renderOrder=2;
 root.add(compose('bus43-stop',a=>{const m=tmat(T.paintMetal(0x535e62)),wood=tmat(T.wood());a(G.box,tmat(T.concrete()),4.6,.03,0,2.8,.06,6);for(const z of[-2.5,2.5]){a(G.box,m,5.5,1.3,z,.08,2.6,.08);a(G.box,m,3.7,1.3,z,.08,2.6,.08);}a(G.box,m,4.6,2.65,0,2.6,.16,5.7);a(G.box,tmat(T.sign('63','#293b43','#d8d3b3')),3.46,2.38,-1.75,.035,.56,.66);a(G.box,wood,4.9,.53,0,.6,.12,3.2);a(G.box,wood,5.18,.92,0,.08,.7,3.2);for(const z of[-1.2,1.2])a(G.box,m,4.9,.28,z,.12,.50,.08);a(G.box,m,5.5,1.45,1.6,.08,1.8,1.15);a(G.box,tmat(T.sign('63  ·  НОЧНОЙ','#cec8af','#48565b')),5.44,1.65,1.6,.025,.42,.95);a(G.box,col(0x7c8d87),5.44,1.05,1.6,.025,.5,.8);}));
 const glass=mesh(G.box,lam({color:0x829f9e,transparent:true,opacity:.20,depthWrite:false},'bus43-shelter'),5.5,1.45,-.8,.025,2.15,3.2,root);glass.castShadow=false;
 root.userData.parking={mark,mat};return root;
}
