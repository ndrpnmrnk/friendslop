import { random } from '../core/random.js';
import {THREE,G,V3,makeCamera} from '../core/gfx.js';
import {rewardTheme} from './reward-themes.js';
import {doll} from './claw-toys.js';
import {SKINS} from '../characters/skins.js';
// Самостоятельная сцена на весь экран: двор, его дым и пол не попадают в награду.
export function clawReveal(root,ui){
 const scene=new THREE.Scene(),camera=makeCamera(42),previews=new Map();scene.background=new THREE.Color(0x181326);
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{style:{value:0},age:{value:0},aspect:{value:1},accent:{value:new THREE.Color(0xe6b876)},warm:{value:new THREE.Color(0xffe8b1)},art:{value:rewardTheme('cat').art},glyphs:{value:rewardTheme('cat').glyphs}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,.999,1.);}',fragmentShader:`varying vec2 v;uniform float age;uniform float style;uniform float aspect;uniform vec3 accent;uniform vec3 warm;uniform sampler2D art;uniform sampler2D glyphs;
 void main(){vec2 p=(v-vec2(.5,.56))*vec2(aspect,1.);float r=length(p),a=atan(p.y,p.x);float turn=a-age*.14;
 float ray=pow(.5+.5*sin(turn*12.+sin(r*5.-age*.55)*.38),12.);float halo=exp(-r*3.8);
 vec2 artUV=vec2(p.x/max(.65,min(aspect,1.75))+.5,v.y);artUV.x=clamp(artUV.x,0.002,.998);artUV.y+=sin(age*.22+p.x)*.004;
 vec3 c=texture2D(art,artUV).rgb*.66;c+=warm*halo*.31+accent*ray*(.025+.08*halo);
 for(int i=0;i<16;i++){float f=float(i),angle=f*2.399+age*(.025+mod(f,3.)*.009),rad=.43+mod(f,4.)*.16;vec2 pos=vec2(cos(angle)*rad,sin(angle)*rad*.68);pos.x*=min(1.,aspect*.65+.2);pos.y+=sin(age*.65+f)*.024;
 vec2 q=(p-pos)/(.067+mod(f,3.)*.013);float turn=sin(age*.3+f)*.25;mat2 rot=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));q=rot*q+vec2(.5);
 if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.){vec2 cell=vec2(mod(f,2.),floor(mod(f,4.)/2.));vec4 icon=texture2D(glyphs,(q+cell)*.5);c=mix(c,icon.rgb,icon.a*.25*smoothstep(.19,.42,r));}}
 float ring=pow(max(0.,1.-abs(r-(.22+mod(age*.035,.7)))*90.),2.);c+=accent*ring*.06;
 // v0.56: у каждого персонажа своё движение фона
 float h1=fract(sin(dot(floor(v*vec2(40.,24.)),vec2(12.9898,78.233)))*43758.5453);
 if(style<.5){vec2 g=fract(v*vec2(14.,9.)+vec2(0.,age*.35));float drop=step(.82,h1)*smoothstep(.2,0.,length(g-.5));c+=warm*drop*.35;}
 else if(style<1.5){float band=step(.97,fract(v.y*3.-age*.6));c+=accent*band*.25;c+=vec3(fract(sin(dot(v*age,vec2(91.7,17.3)))*4375.)*.05);c*=.92+.08*sin(v.y*700.);}
 else if(style<2.5){float w=sin(v.x*18.+age*1.6+sin(v.y*11.+age))*sin(v.y*14.-age*1.2);c+=accent*smoothstep(.6,1.,w)*.12;vec2 b=fract(v*vec2(10.,6.)-vec2(0.,age*.25));c+=warm*smoothstep(.07,.04,length(b-vec2(.5+.2*sin(age+v.x*9.),.5)))*.25*step(.6,h1);}
 else if(style<3.5){float rr=fract(r*3.-age*.45);c+=accent*smoothstep(.05,0.,abs(rr-.5))*.22*(1.-smoothstep(.2,1.2,r));}
 else if(style<4.5){vec2 e=fract(v*vec2(22.,12.)+vec2(sin(age+v.y*5.)*.2,-age*.5));c+=vec3(1.,.55,.2)*step(.9,h1)*smoothstep(.15,0.,length(e-.5))*.6;c*=1.+.06*sin(age*13.+v.x*3.);}
 else if(style<5.5){float sm=sin(p.x*4.+age*.5+sin(p.y*5.-age*.4)*1.5)*sin(p.y*3.-age*.3);c=mix(c,warm*.5,smoothstep(.3,1.,sm)*.18);}
 else if(style<6.5){float burst=pow(.5+.5*sin(turn*20.+age*2.),8.);c+=accent*burst*.12*(.6+.4*sin(age*4.));}
 else {vec2 cf=fract(v*vec2(12.,8.)+vec2(age*.15,age*.3));c+=mix(accent,warm,h1)*step(.86,h1)*smoothstep(.12,.0,abs(cf.x-cf.y))*.4;}
 float intro=smoothstep(0.,.65,age);gl_FragColor=vec4(c*intro,1.);}`});
 const STYLE={cat:0,tv:1,shark:2,frog:3,caveman:4,smoky:5,gryzli:6,latte:7};let style=0;
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);backdrop.frustumCulled=false;backdrop.renderOrder=-100;scene.add(backdrop);
 scene.add(new THREE.HemisphereLight(0xd9dbef,0x514060,2.1));const key=new THREE.DirectionalLight(0xffe5b9,2.4);key.position.set(-2,4,4);scene.add(key);const rim=new THREE.DirectionalLight(0xcba9fb,1.8);rim.position.set(2,2,-3);scene.add(rim);
 const confettiMaterial=new THREE.MeshBasicMaterial({color:0xffffff,fog:false}),confetti=new THREE.InstancedMesh(G.box,confettiMaterial,64),pose=new THREE.Object3D();confetti.frustumCulled=false;confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(confetti);
 for(let i=0;i<64;i++)confetti.setColorAt(i,new THREE.Color([0xffd576,0x92cfe4,0xe9b1d5,0xe6e8b3][i%4]));
 let title=null,started=false,preview=null,height=1.8,width=1.2,depth=.8,center=.9;
 return{scene,camera,get active(){return started;},start(id,practice=false){this.clear();started=true;ui.classList.add('rewarding');preview=previews.get(id);if(!preview){preview=doll(id,0,.82,0);preview.g.quaternion.identity();preview.g.scale.setScalar(3.5);previews.set(id,preview);}scene.add(preview.g);preview.g.rotation.set(0,-.24,0);preview.g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(preview.g),size=bounds.getSize(new V3());height=size.y;width=size.x;depth=size.z;center=bounds.getCenter(new V3()).y;
  style=STYLE[id]??(id.length%8);material.uniforms.style.value=style;const theme=rewardTheme(id);material.uniforms.accent.value.copy(theme.accent);material.uniforms.warm.value.copy(theme.warm);material.uniforms.art.value=theme.art;material.uniforms.glyphs.value=theme.glyphs;
  title=document.createElement('div');title.id='clawReveal';title.className='prizePlate';const tag=document.createElement('small');tag.textContent=practice?'ТРЕНИРОВКА АВТОМАТА':'НОВЫЙ ДРУГ';const name=document.createElement('strong');for(const[i,ch]of[...SKINS[id].name].entries()){const span=document.createElement('span');span.textContent=ch===' '?'\u00a0':ch;span.style.setProperty('--i',i);name.appendChild(span);}title.append(tag,name);ui.appendChild(title);
 },update(dt,age){if(!started)return;material.uniforms.age.value=age;material.uniforms.aspect.value=camera.aspect;const k=THREE.MathUtils.smoothstep(age,0,.85),tan=Math.tan(camera.fov*Math.PI/360),distance=Math.max(height/(2*tan*.59),width/(2*tan*camera.aspect*.74),3.1)+depth*.6;
  camera.position.set(0,center-height*.16,distance);camera.lookAt(0,center-height*.16,0);
  preview.g.scale.setScalar(3.5*(.68+.32*k));preview.g.rotation.set(0,-.24+(1-k)*1.8+Math.sin(age*.65)*.13,0);preview.g.position.set(0,.82+Math.sin(age*2)*.018,0);
  // свой танец у каждого: прыжки, глитч, «плавание», лягушачьи скачки, топот, левитация, кружение, покачивание
  const a2=Math.max(0,age-.8),hop=Math.abs(Math.sin(a2*5));
  if(style===0)preview.g.position.y+=hop*.12;else if(style===1){if(Math.sin(a2*23)>.92)preview.g.position.x=(random()-.5)*.08;}else if(style===2){preview.g.rotation.z=Math.sin(a2*2.4)*.18;preview.g.position.x=Math.sin(a2*1.2)*.12;}
  else if(style===3)preview.g.position.y+=Math.max(0,Math.sin(a2*3.2))*.32;else if(style===4){preview.g.scale.y*=1-.08*hop;preview.g.position.y+=(1-hop)*.04;}else if(style===5)preview.g.position.y+=.12+Math.sin(a2*1.6)*.08;
  else if(style===6)preview.g.rotation.y+=a2*2.2;else preview.g.rotation.z=Math.sin(a2*3)*.12;
  preview.c.animate(dt,{t:age,speed:0,wave:age>.6&&age<2.8||style===7&&Math.sin(age*2)>0});
  confetti.visible=age<3.5;for(let i=0;i<64&&confetti.visible;i++){const t=Math.max(0,age-(i%7)*.035),a=i*2.4,r=t*(.5+i%5*.13),fade=THREE.MathUtils.clamp((3.5-t)*1.5,0,1);pose.position.set(Math.cos(a)*r,center+(.9+i%7*.14)*t-t*t*.46,-.3+Math.sin(a)*r*.55);pose.rotation.set(t*3+i,t*2,i+t*4);pose.scale.set(.026*fade,.009*fade,.04*fade);pose.updateMatrix();confetti.setMatrixAt(i,pose.matrix);}if(confetti.visible)confetti.instanceMatrix.needsUpdate=true;
  title.style.opacity=THREE.MathUtils.smoothstep(age,.45,1.1);
 },clear(){started=false;preview?.g.removeFromParent();preview=null;ui.classList.remove('rewarding');title?.remove();title=null;}};
}
