import {THREE,G,col,tmat,glow,mesh,compose} from '../core/gfx.js';
import {T,pix} from '../core/textures.js';
import {W} from './state.js';
import {addOutline} from '../game/outline.js';
import {districtClock,localAnimation,localActors} from './district-motion.js';
import {sfx} from '../core/sfx.js';

export function cinemaSeat(b,x,z,y,number){
 const g=b.prop(x,z,Math.PI);g.position.y+=y;
 g.add(compose('cinema-seat50',a=>{const cloth=tmat(T.cloth(0x7f3d4a)),metal=col(0x35313d);for(const sx of[-.35,.35]){a(G.box,metal,sx,.28,0,.08,.56,.45);a(G.box,col(0x94765a),sx,.67,0,.11,.09,.66);}a(G.box,cloth,0,.48,.03,.58,.13,.58);a(G.box,cloth,0,.82,-.24,.65,.72,.13,-.12);a(G.box,metal,0,.12,-.1,.66,.08,.39);for(const sx of[-.27,.27])a(G.box,col(0x9b8d78),sx,.025,-.1,.12,.05,.2);}));
 b.solid(x,z,.84,.72,y,1.18);
 b.sign(x,y+.86,z+.325,0,String(number),'#733d4a','#d5b98e',.18,.12);
 return g;
}
export function cinemaPoster(b,x,z,ry,kind=0){
 const poster=pix('cinema-poster50-'+kind,96,144,c=>{const colors=[['#302940','#dfae72'],['#243b42','#b9c9a5'],['#4a293d','#eab77b']][kind%3];c.fillStyle=colors[0];c.fillRect(0,0,96,144);c.strokeStyle=colors[1];c.lineWidth=3;c.strokeRect(4,4,88,136);c.fillStyle=colors[1];c.beginPath();c.arc(64,37,19,0,6.28);c.fill();c.fillStyle='#191724';c.fillRect(16,61,66,49);for(const xx of[17,43,68]){c.fillRect(xx,43,12,52);c.beginPath();c.moveTo(xx-3,43);c.lineTo(xx+6,31);c.lineTo(xx+15,43);c.fill();}c.fillStyle=colors[1];for(const xx of[21,47,72])c.fillRect(xx,57,4,9);c.font='bold 8px sans-serif';c.textAlign='center';c.fillText(['ПОСЛЕДНИЙ','ТЕНИ ГОРОДА','ЛУННАЯ'][kind%3],48,122);c.fillText(['СЕАНС','31 ОКТЯБРЯ','ПРОГУЛКА'][kind%3],48,132);});
 const g=b.prop(x,z,ry);g.add(compose('cinema-poster-frame50-'+kind,a=>{a(G.box,col(0x8a7054),0,1.65,0,1.06,1.54,.075);a(G.box,tmat(poster),0,1.65,.045,.96,1.44,.015);}));return g;
}
export function filmArchive(b,x,z,ry=0){
 const g=b.prop(x,z,ry);g.add(compose('film-archive50',a=>{const metal=col(0x646b6a),tin=tmat(T.metal());for(const xx of[-.82,.82])a(G.box,metal,xx,1.02,0,.07,2.04,.6);a(G.box,metal,0,1.02,-.28,1.7,2.04,.055);for(const y of[.13,.74,1.35,1.96]){a(G.box,metal,0,y,0,1.72,.06,.65);if(y<1.9)for(let i=0;i<4;i++){const xx=-.59+i*.39;for(let k=0;k<2+(i%2);k++){a(G.cyl12,tin,xx,y+.075+k*.09,0,.18,.09,.18);a(G.box,col(0xcdbb92),xx,y+.075+k*.09,.18,.16,.045,.012);}}} }));
 const q=Math.abs(Math.sin(ry))>.5;b.solid(x,z,q?.65:1.72,q?1.72:.65,0,2.02);return g;
}
export function popcorn(b,x,z,y){
 const g=b.prop(x,z);g.position.y+=y;g.add(compose('cinema-popcorn50',a=>{const stripe=pix('popcorn50',32,32,c=>{c.fillStyle='#d6bc91';c.fillRect(0,0,32,32);c.fillStyle='#933d47';for(let x=0;x<32;x+=8)c.fillRect(x,0,4,32);});a(G.box,tmat(stripe),0,.16,0,.23,.32,.23);for(let i=0;i<9;i++)a(G.sph,col(0xe8d09a),(i%3-1)*.073,.34+(i%2)*.025,(Math.floor(i/3)-1)*.073,.056,.045,.052);}));return g;
}
export function filmWorkbench(b,x,z){
 const g=b.prop(x,z);g.add(compose('film-workbench50',a=>{const wood=tmat(T.wood()),steel=col(0x7a8580),dark=col(0x26232f);a(G.box,wood,0,.78,0,2.4,.08,.72);for(const xx of[-1,1])for(const zz of[-.27,.27])a(G.box,dark,xx,.38,zz,.065,.76,.065);
  for(const xx of[-.65,.65]){a(G.cyl12,steel,xx,.85,0,.23,.06,.23);for(let i=0;i<5;i++){const q=i*6.283/5;a(G.cyl8,dark,xx+Math.cos(q)*.13,.884,Math.sin(q)*.13,.047,.012,.047);}}a(G.box,dark,0,.832,0,1.25,.012,.08);for(let i=0;i<11;i++)for(const zz of[-.03,.03])a(G.box,col(0xc8bea3),-.5+i*.10,.84,zz,.04,.004,.014);
  a(G.box,steel,.95,.85,-.23,.26,.06,.23);a(G.cyl6,steel,.95,1.07,-.23,.025,.42,.025);a(G.box,steel,.85,1.31,-.16,.34,.065,.25);a(G.box,glow(0xffd09b),.85,1.273,-.16,.27,.012,.18);
 }));b.solid(x,z,2.4,.72,0,.82);b.light(x,z,1.0,0,true);Object.assign(W.lightSources.at(-1),{y:b.Y+1.27,strength:3.5,range:4.1});return g;
}
export function cinemaProjection(b,x,z,y,screen){
 const g=b.prop(x,z,Math.PI);g.position.y+=y;const metal=col(0x4d555b),dark=col(0x262330),brass=col(0xb19468);
 g.add(compose('cinema-projector50',a=>{a(G.box,metal,0,.25,0,.64,.45,.85);for(const xx of[-.25,.25])a(G.box,dark,xx,.055,0,.1,.11,.64);a(G.cyl12,brass,0,.28,.58,.15,.42,.15,Math.PI/2);a(G.disc,glow(0xeac18c),0,.28,.797,.12,.12,1);a(G.box,col(0x88968b),.329,.26,0,.018,.18,.34);for(let i=0;i<5;i++)a(G.box,dark,-.326,.21+i*.045,-.15,.012,.018,.32);a(G.box,brass,.2,.49,.18,.08,.06,.1);}));
 const reels=[];for(const xx of[-.4,.4]){const pivot=new THREE.Group();pivot.position.set(xx,.77,-.15);g.add(pivot);pivot.add(compose('projector-reel50',a=>{a(G.cyl12,metal,0,0,0,.29,.055,.29,Math.PI/2);a(G.cyl8,brass,0,0,.035,.065,.08,.065,Math.PI/2);for(let i=0;i<5;i++){const k=i*6.283/5;a(G.disc,dark,Math.cos(k)*.17,Math.sin(k)*.17,.03,.07,.07,1);a(G.disc,dark,Math.cos(k)*.17,Math.sin(k)*.17,-.03,.07,.07,1,0,Math.PI);}}));reels.push(pivot);W.keep.push(pivot);}
 const film=mesh(G.box,dark,0,.68,-.14,.8,.04,.025,g);const outline=addOutline(g,.035);W.keep.push(g);
 const material=new THREE.ShaderMaterial({uniforms:{age:{value:0},power:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 v;uniform float age;uniform float power;float box(vec2 p,vec2 s){return step(max(abs(p.x)-s.x,abs(p.y)-s.y),0.);}void main(){vec2 p=floor(v*vec2(144.,72.))/vec2(144.,72.);float grain=fract(sin(dot(p,vec2(123.4,87.2))+floor(age*12.))*12345.6);vec3 c=mix(vec3(.12,.13,.19),vec3(.46,.38,.32),power);float moon=1.-step(.10,length((p-vec2(.76,.73))*vec2(3.94,1.)));c+=vec3(.45,.35,.19)*moon;float castle=box(p-vec2(.48,.30),vec2(.2,.18));for(int i=0;i<3;i++){float x=.32+float(i)*.16;castle=max(castle,box(p-vec2(x,.49),vec2(.04,.18)));float roof=step(abs(p.x-x),max(0.,.07-(p.y-.67)))*step(.67,p.y)*step(p.y,.74);castle=max(castle,roof);}c=mix(c,vec3(.075,.065,.11),castle);for(int i=0;i<4;i++){float f=float(i),x=fract(age*.035+f*.29),y=.78+sin(age*1.3+f*3.)*.05;vec2 q=(p-vec2(x,y))*vec2(1.,.5);float wing=step(abs(q.x),.026)*step(abs(q.y-sin(abs(q.x)*110.+age*6.)*.012),.007);c=mix(c,vec3(.03),wing*power);}float scratches=step(.993,fract(p.x*18.+floor(age*8.)*.031));c+=grain*.035+scratches*.045;float stripes=mod(floor(p.y*72.),2.);c*=.94+stripes*.06;gl_FragColor=vec4(c*(.4+.6*power)*(1.+sin(age*37.)*.018),1.);}`});W.mapResources.add(material);
 const screenMesh=b.m(G.plane,material,screen.x,screen.y,screen.z,screen.w,screen.h,1);W.keep.push(screenMesh);
 g.updateWorldMatrix(true,true);const lens=g.localToWorld(new THREE.Vector3(0,.28,.8)),verts=[];const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy])=>new THREE.Vector3(b.X(screen.x+sx*screen.w*.48),b.Y+screen.y+sy*screen.h*.47,b.Z(screen.z)+.025));for(let i=0;i<4;i++)for(const p of[lens,corners[i],corners[(i+1)%4]])verts.push(p.x,p.y,p.z);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));const beamMat=new THREE.MeshBasicMaterial({color:0xf0c78e,transparent:true,opacity:.025,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),beam=new THREE.Mesh(geometry,beamMat);b.g.add(beam);W.keep.push(beam);W.mapResources.add(geometry);W.mapResources.add(beamMat);beam.visible=false;
 const site={x:b.X(x),z:b.Z(z),y:b.Y+y-.82,g,reels,screen:screenMesh,beam,remaining:0,playing:false};
 const state={values:[0]};W.districtStates.push(state);site.state=state;W.cinemaSite=site;
 for(const hx of[screen.x-1,screen.x+1])W.hides.push({x:b.X(hx),y:b.Y+.16,z:b.Z(9),r:1.1,kind:'cinema',out:[0,1],cinema:site,enabled:()=>!site.playing});
 const interact={x:b.X(x),z:b.Z(z+.9),y:site.y,r:1.25,dy:.7,outline,get label(){return site.playing?'Остановить проектор':'Запустить последний сеанс';},act(){state.values[0]=state.values[0]>districtClock()?0:districtClock()+45;sfx('click',{at:g.position,v:.3});}};W.interacts.push(interact);
 localAnimation(dt=>{site.remaining=Math.max(0,state.values[0]-districtClock());site.playing=site.remaining>0;material.uniforms.age.value=districtClock()%3600;if(site.playing){for(const r of reels)r.rotation.z-=dt*1.8;}const k=material.uniforms.power.value;k&&(film.visible=true);material.uniforms.power.value=THREE.MathUtils.damp(k,site.playing?1:0,3,dt);beam.visible=material.uniforms.power.value>.02;beamMat.opacity=.026*material.uniforms.power.value;
  for(const a of localActors(true)){a.projectorBlind=Math.max(0,(a.projectorBlind||0)-dt);if(site.playing&&a.hidden?.cinema===site){a.hidden=null;a.root.visible=true;}if(!site.playing)continue;const eye=a.pos.clone().add(new THREE.Vector3(0,1.45,0)),depth=(lens.z-eye.z)/(lens.z-b.Z(screen.z));if(depth<=0||depth>=1)continue;const cx=lens.x+(b.X(screen.x)-lens.x)*depth,cy=lens.y+(b.Y+screen.y-lens.y)*depth;const dx=lens.x-eye.x,dz=lens.z-eye.z,dist=Math.hypot(dx,dz);if(Math.abs(eye.x-cx)<screen.w*.5*depth&&Math.abs(eye.y-cy)<screen.h*.5*depth&&(Math.sin(a.facing||0)*dx+Math.cos(a.facing||0)*dz)/(dist||1)>.45)a.projectorBlind=.6;}
 },g,screenMesh,beam);
 return site;
}
