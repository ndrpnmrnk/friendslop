import {W} from './state.js';
import {addItem,drop} from '../game/items.js';
import {spendCoins,collection} from '../game/collection.js';
import {districtClock} from './district-motion.js';
import {sfx} from '../core/sfx.js';
export function cinemaShop(b,x,z,type){
 const stock=Array.from({length:8},()=>{const it=addItem(type,b.X(x),b.Y+1.1,b.Z(z));it.state='gone';it.g.visible=false;return it;});let next=0;
 const q={x:b.X(x),y:b.Y,z:b.Z(z+1),r:1.5,label:type==='popcorn'?'Купить попкорн · 1 фист':'Купить газировку · 1 фист',enabled:a=>!a.held&&districtClock()>next,
 prepare(){return collection().coins>=1;},act(a){const it=stock.find(it=>it.state==='gone');if(!it)return;if(a===W.player){if(!spendCoins(1))return;}else if(a.puppet)W.net?.effect(a,'cinema-charge',{});next=districtClock()+1;it.g.visible=true;it.owner=null;it.taken=false;drop(it,b.X(x),b.Y+1.05,b.Z(z));sfx('pickup',{at:it.pos});}};
 W.interacts.push(q);return {stock,interact:q};
}
