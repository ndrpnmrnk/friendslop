import {THREE,G,V3,col,tmat,compose} from '../core/gfx.js';
import {T} from '../core/textures.js';
import {W} from './state.js';
import {addItem,launch} from '../game/items.js';
import {districtClock,localAnimation} from './district-motion.js';
import {addOutline} from '../game/outline.js';
import {sfx} from '../core/sfx.js';
export function factoryControls(b){
 const state={values:[0,0,0]};W.districtStates.push(state);const paint=tmat(T.paintMetal(0x638078)),metal=tmat(T.metal());
 const box=b.box(12,21,1,.7,1.3,paint),button=b.m(G.cyl8,col(0xa4473c),12,1.2,21.4,.12,.1,.12);button.rotation.x=Math.PI/2;
 b.sign(12,1.8,21.43,0,'СТОП · 6 С','#303b35','#ead4a1',1.8,.3);
 W.interacts.push({x:b.X(12),y:b.Y,z:b.Z(22),r:1.5,outline:addOutline(box,.04),get label(){return districtClock()<state.values[0]?'Конвейер остановлен':'Остановить конвейер на 6 секунд';},enabled:()=>districtClock()>state.values[1],act(){const now=districtClock();state.values[0]=now+6;state.values[1]=now+12;sfx('switch',{at:box.position});}});
 // Hopper gate and its rod are anchored above the loading end of the line.
 b.box(12,17,3,3,1.5,paint,{y:3.5});for(const z of[15.2,18.8])for(const x of[10.4,13.6])b.box(x,z,.12,.12,4.8,metal);
 const gate=b.m(G.box,metal,12,3.47,17,2.8,.12,2.8),lever=b.prop(15,21);lever.add(compose('hopper-lever0623',a=>{a(G.box,paint,0,.5,0,.55,1,.55);a(G.cyl8,metal,0,1.15,0,.05,.65,.05,0,0,-.4);a(G.sph,col(0xb79050),.13,1.46,0,.12,.12,.12);}));b.solid(15,21,.6,.6,0,1.5);
 const pool=Array.from({length:6},(_,i)=>{const it=addItem(i%2?'can':'fatcan',b.X(12),b.Y+3.3,b.Z(17));it.state='gone';it.g.visible=false;return it;});
 W.interacts.push({x:b.X(15),y:b.Y,z:b.Z(22),r:1.5,outline:addOutline(lever,.04),label:'Открыть загрузочный бункер',enabled:()=>districtClock()-state.values[2]>10,act(){state.values[2]=districtClock();let n=0;for(const it of pool){if(it.state!=='gone')continue;it.g.visible=true;it.owner=null;launch(it,new V3(b.X(11.4+n*.55),b.Y+3.25,b.Z(17)),new V3(0,-.5,0));if(++n===3)break;}sfx('open',{at:lever.position});}});
 localAnimation(()=>{gate.position.x=b.X(12)+Math.max(0,1-(districtClock()-state.values[2])/2)*2.6;button.position.z=b.Z(districtClock()<state.values[0]?21.37:21.4);},gate,button);
 return {state,pool,running:()=>districtClock()>=state.values[0]};
}
