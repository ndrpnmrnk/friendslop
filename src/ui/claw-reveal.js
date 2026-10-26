import {THREE,G,V3,makeCamera} from '../core/gfx.js';
import {rewardTheme} from './reward-themes.js';
import {doll} from './claw-toys.js';
import {SKINS} from '../characters/skins.js';
// Самостоятельная сцена на весь экран: двор, его дым и пол не попадают в награду.
export function clawReveal(root,ui){
 const scene=new THREE.Scene(),camera=makeCamera(42),previews=new Map();scene.background=new THREE.Color(0x181326);
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{age:{value:0},aspect:{value:1},accent:{value:new THREE.Color(0xe6b876)},warm:{value:new THREE.Color(0xffe8b1)},art:{value:rewardTheme('cat').art},glyphs:{value:rewardTheme('cat').glyphs}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,.999,1.);}',fragmentShader:`varying vec2 v;uniform float age;uniform float aspect;uniform vec3 accent;uniform vec3 warm;uniform sampler2D art;uniform sampler2D glyphs;
 void main(){vec2 p=(v-vec2(.5,.56))*vec2(aspect,1.);float r=length(p),a=atan(p.y,p.x);float turn=a-age*.14;
 float ray=pow(.5+.5*sin(turn*12.+sin(r*5.-age*.55)*.38),12.);float halo=exp(-r*3.8);
 vec2 artUV=vec2(p.x/max(.65,min(aspect,1.75))+.5,v.y);artUV.x=clamp(artUV.x,0.002,.998);artUV.y+=sin(age*.22+p.x)*.004;
 vec3 c=texture2D(art,artUV).rgb*.66;c+=warm*halo*.31+accent*ray*(.025+.08*halo);
 for(int i=0;i<16;i++){float f=float(i),angle=f*2.399+age*(.025+mod(f,3.)*.009),rad=.43+mod(f,4.)*.16;vec2 pos=vec2(cos(angle)*rad,sin(angle)*rad*.68);pos.x*=min(1.,aspect*.65+.2);pos.y+=sin(age*.65+f)*.024;
 vec2 q=(p-pos)/(.067+mod(f,3.)*.013);float turn=sin(age*.3+f)*.25;mat2 rot=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));q=rot*q+vec2(.5);
 if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.){vec2 cell=vec2(mod(f,2.),floor(mod(f,4.)/2.));vec4 icon=texture2D(glyphs,(q+cell)*.5);c=mix(c,icon.rgb,icon.a*.25*smoothstep(.19,.42,r));}}
 float ring=pow(max(0.,1.-abs(r-(.22+mod(age*.035,.7)))*90.),2.);c+=accent*ring*.06;
 float intro=smoothstep(0.,.65,age);gl_FragColor=vec4(c*intro,1.);}`});
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);backdrop.frustumCulled=false;backdrop.renderOrder=-100;scene.add(backdrop);
 scene.add(new THREE.HemisphereLight(0xd9dbef,0x514060,2.1));const key=new THREE.DirectionalLight(0xffe5b9,2.4);key.position.set(-2,4,4);scene.add(key);const rim=new THREE.DirectionalLight(0xcba9fb,1.8);rim.position.set(2,2,-3);scene.add(rim);
 const confettiMaterial=new THREE.MeshBasicMaterial({color:0xffffff,fog:false}),confetti=new THREE.InstancedMesh(G.box,confettiMaterial,64),pose=new THREE.Object3D();confetti.frustumCulled=false;confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(confetti);
 for(let i=0;i<64;i++)confetti.setColorAt(i,new THREE.Color([0xffd576,0x92cfe4,0xe9b1d5,0xe6e8b3][i%4]));
 let title=null,started=false,preview=null,height=1.8,width=1.2,depth=.8,center=.9;
 return{scene,camera,get active(){return started;},start(id,practice=false){this.clear();started=true;ui.classList.add('rewarding');preview=previews.get(id);if(!preview){preview=doll(id,0,.82,0);preview.g.quaternion.identity();preview.g.scale.setScalar(3.5);previews.set(id,preview);}scene.add(preview.g);preview.g.rotation.set(0,-.24,0);preview.g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(preview.g),size=bounds.getSize(new V3());height=size.y;width=size.x;depth=size.z;center=bounds.getCenter(new V3()).y;
  const theme=rewardTheme(id);material.uniforms.accent.value.copy(theme.accent);material.uniforms.warm.value.copy(theme.warm);material.uniforms.art.value=theme.art;material.uniforms.glyphs.value=theme.glyphs;
  title=document.createElement('div');title.id='clawReveal';title.className='prizePlate';const tag=document.createElement('small');tag.textContent=practice?'ТРЕНИРОВКА АВТОМАТА':'НОВЫЙ ДРУГ';const name=document.createElement('strong');for(const[i,ch]of[...SKINS[id].name].entries()){const span=document.createElement('span');span.textContent=ch===' '?'\u00a0':ch;span.style.setProperty('--i',i);name.appendChild(span);}title.append(tag,name);ui.appendChild(title);
 },update(dt,age){if(!started)return;material.uniforms.age.value=age;material.uniforms.aspect.value=camera.aspect;const k=THREE.MathUtils.smoothstep(age,0,.85),tan=Math.tan(camera.fov*Math.PI/360),distance=Math.max(height/(2*tan*.59),width/(2*tan*camera.aspect*.74),3.1)+depth*.6;
  camera.position.set(0,center-height*.16,distance);camera.lookAt(0,center-height*.16,0);
  preview.g.scale.setScalar(3.5*(.68+.32*k));preview.g.rotation.y=-.24+(1-k)*1.8+Math.sin(age*.65)*.13;preview.g.position.y=.82+Math.sin(age*2)*.018;preview.c.animate(dt,{t:age,speed:0,wave:age>.6&&age<2.8});
  confetti.visible=age<3.5;for(let i=0;i<64&&confetti.visible;i++){const t=Math.max(0,age-(i%7)*.035),a=i*2.4,r=t*(.5+i%5*.13),fade=THREE.MathUtils.clamp((3.5-t)*1.5,0,1);pose.position.set(Math.cos(a)*r,center+(.9+i%7*.14)*t-t*t*.46,-.3+Math.sin(a)*r*.55);pose.rotation.set(t*3+i,t*2,i+t*4);pose.scale.set(.026*fade,.009*fade,.04*fade);pose.updateMatrix();confetti.setMatrixAt(i,pose.matrix);}if(confetti.visible)confetti.instanceMatrix.needsUpdate=true;
  title.style.opacity=THREE.MathUtils.smoothstep(age,.45,1.1);
 },clear(){started=false;preview?.g.removeFromParent();preview=null;ui.classList.remove('rewarding');title?.remove();title=null;}};
}
