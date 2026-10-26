// Общие пресеты меняют только стоимость картинки, не физику и не состав карты.
export const GRAPHICS={
 // wl — сколько источников света мира учитывает пиксель; cones — объёмные конусы у ближайших фонарей
 low:{label:'Низкая',scale:3.5,width:640,shadow:512,shadowHz:15,lights:0,wl:4,cones:0,particles:.5,anisotropy:2,bloom:.55,mist:3},
 medium:{label:'Средняя',scale:2.5,width:800,shadow:1024,shadowHz:30,lights:0,wl:8,cones:5,particles:.8,anisotropy:4,bloom:.85,mist:6},
 high:{label:'Высокая',scale:2,width:1100,shadow:2048,shadowHz:60,lights:0,wl:8,cones:8,particles:1,anisotropy:8,bloom:1,mist:10}
};
let selected='medium';try{const saved=localStorage.getItem('friendslop.graphics');if(GRAPHICS[saved])selected=saved;}catch{}
export const graphics={get key(){return selected;},get current(){return GRAPHICS[selected];}};
const listeners=new Set(),textures=new Set();
export function onGraphics(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export function trackTexture(t){textures.add(t);t.anisotropy=graphics.current.anisotropy;t.addEventListener('dispose',()=>textures.delete(t));return t;}
export function setGraphics(key){if(!GRAPHICS[key])return;selected=key;try{localStorage.setItem('friendslop.graphics',key);}catch{}for(const t of textures){t.anisotropy=graphics.current.anisotropy;t.needsUpdate=true;}for(const fn of listeners)fn(graphics.current);}
