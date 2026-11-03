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
// v0.65: кадры движения помечаются временем ОТПРАВКИ (ts часов отправителя), а не временем прихода.
// Смещение часов отслеживается по минимальной задержке (быстро вниз, медленно вверх), поэтому
// неровный пинг больше не искажает интервалы между кадрами. Задержка показа подстраивается
// под реальный интервал отправки и разброс пинга конкретного игрока.
export function stampMotion(track,ts,arrive=motionNow()){
 if(!track||!Number.isFinite(ts))return arrive;
 const off=arrive-ts;
 if(track.off==null||Math.abs(off-track.off)>1.5){track.off=off;track.jit=.02;track.gap=track.gap||.06;track.ts=ts;return ts+off;}
 track.off+=(off-track.off)*(off<track.off?.35:.008);
 track.jit+=(Math.abs(off-track.off)-track.jit)*.08;
 if(ts>track.ts){track.gap+=(Math.min(.3,ts-track.ts)-track.gap)*.12;track.ts=ts;}
 return ts+track.off;
}
// v0.69: запас - полтора интервала и два разброса: опоздавший пакет больше не даёт рывок «догнал-отскочил» (+~40 мс к показу).
export function motionDelay(track){
 if(track?.off==null)return .12;
 const want=Math.max(.07,Math.min(.3,(track.gap||.06)*1.5+(track.jit||.02)*2+.015));
 // задержка меняется плавно: резкая смена сама по себе сдвигает картинку рывком
 track.show=track.show==null?want:track.show+Math.max(-.0015,Math.min(.0015,want-track.show));return track.show;
}
// Добавить кадр по порядку; повтор и опоздавший кадр отбрасываются. Возвращает true, если кадр принят.
export function pushMotion(buf,frame,max=24){
 const last=buf.at(-1);if(last&&frame.t<=last.t)return false;
 buf.push(frame);if(buf.length>max)buf.shift();return true;
}
export const motionStamp=()=>+(performance.now()/1000).toFixed(3);
