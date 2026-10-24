import {THREE,G,compose,col,lam} from '../core/gfx.js';
import {pix} from '../core/textures.js';
// Две половинки яблока, мякоть, дёсны и отдельные объёмные зубы. Один общий ресурс.
let asset;
export const FIST_SHINE={value:0};
export function fistModel(){
 if(asset)return asset;
 const skin=pix('fist45-skin',64,64,g=>{g.fillStyle='#973a35';g.fillRect(0,0,64,64);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const n=(x*17+y*11+x*y)%43;g.fillStyle=n<6?'#bd5350':n>38?'#742e33':'#a5433b';if(n<6||n>38)g.fillRect(x,y,1,1);}const glow=g.createLinearGradient(0,0,64,64);glow.addColorStop(0,'#fac989');glow.addColorStop(.2,'#cf6b52');glow.addColorStop(.48,'#c95d4a');glow.addColorStop(1,'#692c37');g.globalAlpha=.6;g.fillStyle=glow;g.fillRect(0,0,64,64);g.globalAlpha=1;g.fillStyle='#ffd5a5';g.fillRect(8,9,3,8);g.fillRect(11,7,9,3);g.fillStyle='#e5a16e';g.fillRect(7,18,2,4);});
 const red=lam({map:skin,emissive:0x311018,emissiveIntensity:.08},'fist45-polished'),hook=red.onBeforeCompile;red.onBeforeCompile=sh=>{hook.call(red,sh);sh.uniforms.fistTime=FIST_SHINE;sh.vertexShader='varying vec3 vFistPoint;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFistPoint=position;');sh.fragmentShader='uniform float fistTime;varying vec3 vFistPoint;\n'+sh.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\nfloat band=abs(fract(vFistPoint.x*.8+vFistPoint.y*.65-fistTime*.10)-.5);float shine=(1.0-smoothstep(.012,.055,band))*.24;gl_FragColor.rgb+=vec3(1.0,.83,.56)*shine;');};red.customProgramCacheKey=()=> 'fist45-polished';
 const top=new THREE.LatheGeometry([new THREE.Vector2(.24,.27),new THREE.Vector2(.26,.35),new THREE.Vector2(.20,.47),new THREE.Vector2(.09,.51),new THREE.Vector2(0,.49)],12);
 const bottom=new THREE.LatheGeometry([new THREE.Vector2(0,-.055),new THREE.Vector2(.12,-.04),new THREE.Vector2(.23,.035),new THREE.Vector2(.24,.10)],12);
 asset=compose('fist45',a=>{const flesh=col(0xd2bd81),gum=col(0x936e54),ivory=col(0xe5dbb8);a(top,red,0,0,0,1,1,1);a(bottom,red,0,0,0,1,1,1);for(const y of[.105,.269])a(G.cyl12,flesh,0,y,0,.239,.018,.239);a(G.cyl12,gum,0,.19,0,.197,.15,.197);for(let i=0;i<14;i++){const k=i/14*Math.PI*2;for(const[y,h]of[[.245,.107],[.133,.087]])a(G.box,ivory,Math.sin(k)*.193,y,Math.cos(k)*.193,.072,h,.045,0,k,0);}a(G.box,col(0x493423),0,.55,0,.034,.13,.04,0,0,-.22);});
 return asset;
}
