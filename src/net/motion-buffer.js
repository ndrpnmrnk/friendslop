// Время прихода пакетов независимо от FPS/таймера раунда. Короткое предсказание ограничено 100 мс.
export const motionNow=()=>performance.now()/1000;
export function sampleMotion(buf,now,delay=.1){
 let i=buf.findIndex(q=>q.t>now-delay);if(i<0)i=buf.length;
 const a=buf[Math.max(0,i-1)],b=buf[Math.min(buf.length-1,i)];if(!a)return null;
 const span=b.t-a.t,k=span>0?Math.max(0,Math.min(1,(now-delay-a.t)/span)):1;
 let x=a.x+(b.x-a.x)*k,y=a.y+(b.y-a.y)*k,z=a.z+(b.z-a.z)*k;
 if(i===buf.length&&buf.length>1){const p=buf[buf.length-2],dt=b.t-p.t,age=Math.max(0,Math.min(.1,now-delay-b.t));if(dt>.015&&Math.hypot(b.x-p.x,b.z-p.z)/dt<32){x+=(b.x-p.x)/dt*age;z+=(b.z-p.z)/dt*age;}}
 return {a,b,k,x,y,z};
}
