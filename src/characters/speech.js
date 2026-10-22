import {THREE,G,mesh,col} from '../core/gfx.js';
const POS={cat:[0,1.13,.472],tv:[0,.70,.422],shark:[0,.54,.55],frog:[0,1.16,.50],caveman:[0,1.20,.36],smoky:[0,1.083,.158],latte:[0,.82,.466],gryzli:[0,.97,.52]};
export function makeSpeechMouth(head,id){const g=new THREE.Group();g.position.set(...(POS[id]||POS.cat));head.add(g);mesh(G.box,col(0x261927),0,0,0,1,1,.012,g);mesh(G.box,col(0xb77380),0,-.3,.008,.54,.24,.008,g);g.visible=false;return g;}
export function animateSpeech(c,dt){const target=Math.max(0,Math.min(1,c.talk||0));c.speech=(c.speech||0)+(target-(c.speech||0))*(1-Math.exp(-dt*18));const m=c.speechMouth;m.visible=c.speech>.04;if(m.visible){const k=Math.round(c.speech*7)/7;m.scale.set(.085+k*.04,.012+k*.07,1);}}
