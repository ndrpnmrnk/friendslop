import {THREE,ps1} from '../core/gfx.js';
import {trackTexture} from '../core/quality.js';
// Пиксели исходников сохраняются. Повтор UV выполняется внутри своей ячейки,
// а производные берутся ДО fract, чтобы плитка не давала швов и мерцания mip-уровней.
const SIZE=1024,PAD=8;
const eligible=m=>m&&!m.transparent&&!m.alphaTest&&!m.vertexColors&&!m.wireframe&&!m.normalMap&&!m.bumpMap&&!m.lightMap&&!m.alphaMap&&!m.isShaderMaterial&&(!m.emissive||m.emissive.getHex()===0)&&(!m.map||!m.map.isRenderTargetTexture)&&['MeshLambertMaterial','MeshBasicMaterial'].includes(m.type);
export function materialAtlas(materials,resources,animated=new Set()){
 const slots=new Map(),pages=[],shared=new Map();let page;
 function newPage(){const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;page={canvas,context,x:PAD,y:PAD,row:0,texture:null,index:pages.length};pages.push(page);}
 function reserve(map){const key=map?.source.uuid||'white';if(slots.has(key))return;
  const image=map?.image,w=image?.width||image?.naturalWidth||2,h=image?.height||image?.naturalHeight||2;
  if(w+PAD*2>SIZE||h+PAD*2>SIZE)return;if(!page)newPage();
  if(page.x+w+PAD>SIZE){page.x=PAD;page.y+=page.row+PAD*2;page.row=0;}
  if(page.y+h+PAD>SIZE)newPage();const{x,y,context:c}=page;
  if(image){c.drawImage(image,x,y,w,h);c.drawImage(image,0,0,w,1,x,y-PAD,w,PAD);c.drawImage(image,0,h-1,w,1,x,y+h,w,PAD);c.drawImage(image,0,0,1,h,x-PAD,y,PAD,h);c.drawImage(image,w-1,0,1,h,x+w,y,PAD,h);
   for(const sx of[0,1])for(const sy of[0,1])c.drawImage(image,sx?(w-1):0,sy?(h-1):0,1,1,sx?x+w:x-PAD,sy?y+h:y-PAD,PAD,PAD);
  }else{c.fillStyle='#fff';c.fillRect(x-PAD,y-PAD,w+PAD*2,h+PAD*2);}
  slots.set(key,{page,rect:[x/SIZE,1-(y+h)/SIZE,w/SIZE,h/SIZE]});page.x+=w+PAD*2;page.row=Math.max(page.row,h);
 }
 for(const m of materials)if(eligible(m)&&!animated.has(m.map?.source.uuid))reserve(m.map);
 for(const p of pages){const t=trackTexture(new THREE.CanvasTexture(p.canvas));t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;p.texture=t;resources.add(t);}
 function apply(m,g){if(!eligible(m)||animated.has(m.map?.source.uuid))return m;const slot=slots.get(m.map?.source.uuid||'white');if(!slot)return m;
  const key=[slot.page.index,m.type,m.side,m.depthTest,m.depthWrite,m.opacity,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits,m.userData.ps1Stable].join('|');
  let mat=shared.get(key);if(!mat){const opts={map:slot.page.texture,color:0xffffff,vertexColors:true,side:m.side,depthTest:m.depthTest,depthWrite:m.depthWrite,opacity:m.opacity,polygonOffset:m.polygonOffset,polygonOffsetFactor:m.polygonOffsetFactor,polygonOffsetUnits:m.polygonOffsetUnits};
   mat=ps1(m.isMeshBasicMaterial?new THREE.MeshBasicMaterial(opts):new THREE.MeshLambertMaterial(opts),!!m.userData.ps1Stable);const before=mat.onBeforeCompile,program=mat.customProgramCacheKey();
   mat.onBeforeCompile=shader=>{before.call(mat,shader);shader.vertexShader='attribute vec4 aAtlas; varying vec4 vAtlas;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvAtlas=aAtlas;');
    shader.fragmentShader='varying vec4 vAtlas;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec2 atlasUv=vAtlas.xy+fract(vMapUv)*vAtlas.zw;
      vec4 sampledDiffuseColor=textureGrad(map,atlasUv,dFdx(vMapUv)*vAtlas.zw,dFdy(vMapUv)*vAtlas.zw);
      diffuseColor*=sampledDiffuseColor;
      #endif`);
   };mat.customProgramCacheKey=()=>program+'-atlas48';mat.userData.atlas=true;shared.set(key,mat);resources.add(mat);
  }
  const n=g.attributes.position.count,rect=new Float32Array(n*4),color=new Uint8Array(n*3);const rgb=[m.color.r,m.color.g,m.color.b].map(v=>Math.round(Math.min(1,Math.max(0,v))*255));
  for(let i=0;i<n;i++){rect.set(slot.rect,i*4);color.set(rgb,i*3);}g.setAttribute('aAtlas',new THREE.BufferAttribute(rect,4));g.setAttribute('color',new THREE.BufferAttribute(color,3,true));return mat;
 }
 return{apply,pages:pages.length,materials:shared};
}
