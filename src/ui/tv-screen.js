import {V3} from '../core/gfx.js';

// DOM живёт в проекции стекла CRT. Общая рамка обрезает и карточки, и VHS-слой.
export function createTVScreen(screen){
  const previous=document.getElementById('crtUI');const root=document.createElement('div');root.id='crtUI';root.className='hidden';
  const stage=document.createElement('div');stage.className='crtStage';root.appendChild(stage);
  for(const id of['mode','roulette'])stage.appendChild(document.getElementById(id));previous?.remove();
  const vhs=document.createElement('div');vhs.className='crtVhs';stage.appendChild(vhs);document.body.appendChild(root);
  const corners=[new V3(-.5,.5,0),new V3(.5,.5,0),new V3(-.5,-.5,0),new V3(.5,-.5,0)],projected=corners.map(()=>new V3());let last='';
  return{root,update(camera,on){
    root.classList.toggle('hidden',!on);if(!on)return;
    screen.updateWorldMatrix(true,false);camera.updateMatrixWorld(true);
    projected.forEach((p,i)=>{p.copy(corners[i]).applyMatrix4(screen.matrixWorld).project(camera);p.x=(p.x*.5+.5)*innerWidth;p.y=(.5-p.y*.5)*innerHeight;});
    const [tl,tr,bl,br]=projected,pad=5,left=Math.max(0,tl.x,bl.x)+pad,right=Math.min(innerWidth,tr.x,br.x)-pad,top=Math.max(0,tl.y,tr.y)+pad,bottom=Math.min(innerHeight,bl.y,br.y)-pad;
    const w=Math.max(0,right-left),h=Math.max(0,bottom-top),key=[left,top,w,h].map(n=>n.toFixed(2)).join(':');
    if(key!==last){last=key;Object.assign(root.style,{left:left+'px',top:top+'px',width:w+'px',height:h+'px'});root.style.setProperty('--crt-scale',Math.min(w/640,h/388));}
  }};
}
