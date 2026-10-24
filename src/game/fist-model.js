import {THREE,G,compose,col,tmat} from '../core/gfx.js';
import {pix} from '../core/textures.js';
// Две половинки яблока, мякоть, дёсны и отдельные объёмные зубы. Один общий ресурс.
let asset;
export function fistModel(){
 if(asset)return asset;
 const skin=pix('fist42-skin',32,32,g=>{g.fillStyle='#783829';g.fillRect(0,0,32,32);for(let i=0;i<170;i++){g.fillStyle=i%3?'#9c4a30':'#4e3525';g.fillRect(i*17%32,i*11%32,2,1);}g.fillStyle='#b57843';g.fillRect(2,2,10,3);});
 const top=new THREE.LatheGeometry([new THREE.Vector2(0,.49),new THREE.Vector2(.09,.51),new THREE.Vector2(.20,.47),new THREE.Vector2(.26,.35),new THREE.Vector2(.24,.27)],12);
 const bottom=new THREE.LatheGeometry([new THREE.Vector2(.24,.10),new THREE.Vector2(.23,.035),new THREE.Vector2(.12,-.04),new THREE.Vector2(0,-.055)],12);
 asset=compose('fist42',a=>{const red=tmat(skin),flesh=col(0xd2bd81),gum=col(0x936e54),ivory=col(0xe5dbb8);a(top,red,0,0,0,1,1,1);a(bottom,red,0,0,0,1,1,1);for(const y of[.105,.269])a(G.cyl12,flesh,0,y,0,.239,.018,.239);a(G.cyl12,gum,0,.19,0,.197,.15,.197);for(let i=0;i<14;i++){const k=i/14*Math.PI*2;for(const[y,h]of[[.245,.107],[.133,.087]])a(G.box,ivory,Math.sin(k)*.193,y,Math.cos(k)*.193,.072,h,.045,0,k,0);}a(G.box,col(0x493423),0,.55,0,.034,.13,.04,0,0,-.22);});
 return asset;
}
