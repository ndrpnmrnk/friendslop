import {CONFIG} from '../config.js';
const smooth=k=>{k=Math.max(0,Math.min(1,k));return k*k*(3-2*k);};
export function meleePhase(left){const p=1-Math.max(0,left)/CONFIG.melee.duration;return{wind:smooth(p/.40),strike:smooth((p-.40)/.22),recover:smooth((p-.62)/.38)};}
export function meleeHand(c,left){const d=c.d,{wind:w,strike:s,recover:r}=meleePhase(left),h=c.handR;
 const x=d.handX+.16*w-.42*s,y=d.holdY+(d.top-.10-d.holdY)*w-.65*s,z=d.holdZ-(d.holdZ+.44)*w+(d.holdZ+1.06)*s;
 h.position.set(x+(d.holdX-x)*r,y+(d.holdY-y)*r,z+(d.holdZ+.12-z)*r);h.rotation.set((-1.8*w+2.6*s)*(1-r),(-.28*w+.12*s)*(1-r),(.18*w-.30*s)*(1-r));
 c.handL.position.set(-d.handX-.06,d.handY+.08,d.handZ+.08);c.body.rotation.y=(-.30*w+.48*s)*(1-r);c.body.rotation.x=(-.12*w+.22*s)*(1-r);
}
