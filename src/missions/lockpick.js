import {THREE,G,V3,mesh,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {random} from '../core/random.js';
import {W} from '../world/state.js';
import {sfx} from '../core/sfx.js';
// Замок остаётся на сундуке; мышь и бот работают с одной механикой сопротивления.
export function lockpickGame(o,api,ctx){
 api.feedback?.();const root=new THREE.Group();root.name='world-lock';root.position.copy(o.pos());root.rotation.y=Math.atan2(o.f[0],o.f[1]);W.group.add(root);
 root.add(compose('lock61-case',a=>{a(G.box,tmat(T.metal()),0,.43,.365,.32,.32,.07);a(G.cyl12,col(0xb59952),0,.43,.412,.125,.06,.125,Math.PI/2);}));
 const barrel=new THREE.Group();barrel.position.set(0,.43,.45);root.add(barrel);mesh(G.box,col(0x211b27),0,0,0,.026,.13,.012,barrel);
 const pick=new THREE.Group();barrel.add(pick);mesh(G.box,tmat(T.metal()),0,.16,.025,.018,.34,.018,pick);mesh(G.box,col(0x63584a),0,.35,.025,.04,.11,.045,pick);
 const wrench=mesh(G.box,tmat(T.metal()),.11,-.08,.02,.24,.018,.018,barrel);
 const spares=[];for(let i=0;i<3;i++)spares.push(mesh(G.box,col(0xd4cab0),-.12+i*.12,.12,.39,.08,.014,.014,root));
 root.updateMatrixWorld(true);const center=root.localToWorld(new V3(0,.43,.46)),normal=new V3(o.f[0],0,o.f[1]),plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,center),hit=new V3();api.pose(center.clone().addScaledVector(normal,.85).add(new V3(0,.18,0)),center);
 const sweet=(random()*140-70)*Math.PI/180,win=7*Math.PI/180,zone=40*Math.PI/180;let angle=0,turn=0,hold=false,strain=0,left=3,end=-1,time=0;
 const move=ray=>{if(end>=0||!ray?.ray?.intersectPlane(plane,hit))return;const p=root.worldToLocal(hit.clone());angle=Math.max(-Math.PI/2,Math.min(Math.PI/2,Math.atan2(p.x,Math.max(.03,p.y-.43))));};
 api.msg('Води отмычкой. ЛКМ - повернуть; дрожит - отпусти');
 return{get angle(){return angle;},get sweet(){return sweet;},get picks(){return left;},down(ray){move(ray);hold=true;},move,up(){hold=false;},botStep(dt){angle+=(sweet-angle)*Math.min(1,dt*3);hold=Math.abs(angle-sweet)<win;},
 update(dt){time+=dt;if(end>=0){end+=dt;barrel.position.y=.43+Math.min(.13,end*.16);if(end>.8)api.finish({success:true,mult:.6+left*.15});return;}
 const off=Math.abs(angle-sweet),limit=off<win?Math.PI/2:Math.max(0,1-(off-win)/zone)*Math.PI/2*.85;
 if(hold){turn=Math.min(limit,turn+dt*2.2);strain=turn>=limit-.01&&limit<Math.PI/2?strain+dt:Math.max(0,strain-dt);}else{turn=Math.max(0,turn-dt*3);strain=Math.max(0,strain-dt*2);}
 pick.rotation.z=-angle+(hold?Math.sin(time*70)*strain*.06:0);barrel.rotation.z=-turn;wrench.rotation.z=Math.sin(time*45)*strain*.025;
 if(strain>1.1){left--;spares[left].visible=false;strain=turn=0;hold=false;sfx('glass',{at:center,v:.4});api.msg(left?'Отмычка сломалась':'Замок не поддался','bad');if(!left)return api.finish({success:false});}
 api.progress(turn/(Math.PI/2));if(turn>=Math.PI/2-.01){end=0;api.msg('Открыто','good');sfx('done',{at:center});}},stop(){root.removeFromParent();}};
}
