import {THREE,G,mesh,col,lam} from '../core/gfx.js';
/* v0.59: при разговоре открывается СВОЙ рот персонажа, а не общий тёмный прямоугольник поверх лица.
   Для каждого скина: где нарисован его рот, какой формы он открывается (овал, пиксельный прямоугольник у телевизора,
   широкая щель у лягушки), цвет «внутри», есть ли язычок. У акулы и Грызли рот и так открыт — у них «жуёт» голова. */
const MOUTH={
  cat:    {p:[0,1.142,.476],w:.055,h:.05,c:0x5a2430,tongue:true,shape:'oval'},
  tv:     {p:[0,.70,.424],w:.09,h:.055,c:0x0b2a10,tongue:false,shape:'rect'},
  shark:  {p:[0,.54,.55],hide:true,chomp:.07},
  frog:   {p:[0,1.16,.505],w:.15,h:.045,c:0x2a1418,tongue:true,shape:'oval'},
  caveman:{p:[0,1.20,.362],w:.07,h:.05,c:0x4a1a20,tongue:true,shape:'oval'},
  smoky:  {p:[0,1.083,.16],w:.035,h:.03,c:0x2a1a1a,tongue:false,shape:'oval'},
  latte:  {p:[0,.82,.505],w:.06,h:.045,c:0x5a1424,tongue:true,shape:'oval'},
  gryzli: {p:[0,.97,.52],hide:true,chomp:.05},
};
export function makeSpeechMouth(head,id){
  const o=MOUTH[id]||MOUTH.cat,g=new THREE.Group();g.position.set(...(o.p||[0,1,.4]));head.add(g);g.userData.cfg=o;
  if(!o.hide){const inner=o.shape==='rect'?mesh(G.box,col(o.c),0,0,0,1,1,.01,g):mesh(G.sph10,col(o.c),0,0,0,.5,.5,.12,g);
    if(o.tongue)mesh(G.sph10,lam({color:0xd8707e},'mouthTongue'),0,-.22,.03,.32,.2,.06,g);g.userData.inner=inner;}
  g.visible=false;return g;
}
export function animateSpeech(c,dt){
  const target=Math.max(0,Math.min(1,c.talk||0));c.speech=(c.speech||0)+(target-(c.speech||0))*(1-Math.exp(-dt*18));
  const m=c.speechMouth,o=m.userData.cfg||{};
  if(o.chomp){const k=c.speech>.04?Math.abs(Math.sin(performance.now()*.018))*c.speech:0;c.head.scale.y=1-o.chomp*k;m.visible=false;return;}
  m.visible=!o.hide&&c.speech>.04;
  if(m.visible){const k=o.shape==='rect'?Math.round(c.speech*4)/4:c.speech;m.scale.set(o.w*(.6+.4*k),Math.max(.004,o.h*k),1);}
}
