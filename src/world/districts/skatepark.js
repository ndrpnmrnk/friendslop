import {THREE,G,col,tmat,paint} from '../../core/gfx.js';
import {T} from '../../core/textures.js';
import {W} from '../state.js';
import {localActors,districtFrame} from '../district-motion.js';
import {SKATE_LAYOUT as L,skateSection,rentalRideClear} from '../skate-layout.js';

/* v0.61.2 - скейт-парк 44 × 44, восстановлен строго по схеме:
    СЗ: хафпайп    СВ: перила
       центральная большая чаша
    ЮЗ: перила     ЮВ: декоративный прокат и парковка досок
   Никакого футбола. Только игровые, доступные для езды рампы и рейлы.
   Вся статическая геометрия использует существующие материалы и batch world.
*/
const metal=()=>tmat(T.paintMetal(0x6c7785));
function bowl(b){
 const {x,z,inner,width,radius,deck}=L.bowl;
 // Большая четырёхсторонняя «чаша» - непрерывный плоский разгон внутри,
 // четыре реально проезжаемых радиусных борта с физикой quarterPipe.
 // Визуальные круги показывают геометрию чаши; они не добавляют препятствий.
 const bottom=b.m(new THREE.CircleGeometry(inner-.45,40),tmat(T.concrete()),x,.021,z);
 bottom.rotation.x=-Math.PI/2;
 const line=b.m(new THREE.RingGeometry(inner-.53,inner-.44,48),paint(0xdac7ac),x,.037,z);
 line.rotation.x=-Math.PI/2;
 b.quarterPipe(x,z-inner,width,radius,Math.PI,deck);
 b.quarterPipe(x,z+inner,width,radius,0,deck);
 b.quarterPipe(x-inner,z,width,radius,-Math.PI/2,deck);
 b.quarterPipe(x+inner,z,width,radius,Math.PI/2,deck);
 // Восемь коротких меток на внешней линии: без дополнительных коллизий.
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,r=inner+2.75;
  const m=b.m(G.box,col(0xde834f),x+Math.cos(a)*r,.035,z+Math.sin(a)*r,.64,.07,.10);
  m.rotation.y=-a;
 }
}
function halfpipe(b){
 const h=L.halfpipe;
 b.ground(4.1,3.7,15,15.4,T.concrete(),2.5,.024);
 b.quarterPipe(h.x,h.front,h.width,h.radius,Math.PI,.8);
 b.quarterPipe(h.x,h.back,h.width,h.radius,0,.8);
 b.marking(h.x,9.4,8.2,.12,0xf2cf8b);
 b.sign(h.x,2.6,3.25,0,'ХАФПАЙП','#312539','#f8c36e',3.4,.62);
}
function rails(b,rows){
 for(const [x0,z0,x1,z1,y]of rows)b.grindRail(x0,z0,x1,z1,y);
}
function rental(b){
 const {x,z,w,d}=L.rental;
 const brick=tmat(T.brickWall()),roof=tmat(T.roof()),trim=metal();
 b.box(x,z,w,d,2.65,brick);
 b.box(x,z,w+.35,d+.35,.18,roof,{y:2.65,solid:false});
 // Витрина и прилавок с южной стороны. Прокат декоративный,
 // для подбора транспорта используется штатная клавиша E.
 b.m(G.box,col(0x27263b),x-1.25,1.58,z+d/2+.025,1.45,1.05,.035);
 b.m(G.box,col(0x7cc9c4),x-1.25,1.58,z+d/2+.049,1.22,.79,.015);
 b.m(G.box,trim,x+1.75,1.28,z+d/2+.045,1.20,2.32,.06);
 b.box(x,z+d/2+.46,w-.25,.67,.14,trim,{y:1.92,solid:false});
 b.sign(x,2.98,z+d/2+.35,0,'ПРОКАТ СКЕЙТОВ','#252235','#f5c46e',4.9,.68);
 b.sign(x,1.22,z+d/2+.11,0,'СКЕЙТЫ · САМОКАТЫ','#382b48','#f6e2cb',3.0,.42);
 // Четыре отдельных открытых парковочных места в юго-восточной четверти.
 for(const ride of L.rentalRides){
  if(!rentalRideClear(ride))throw new Error('Unsafe skate rental vehicle spawn');
  b.marking(ride.x,ride.z,1.5,.07,0xd7ac76);
  const p=b.ride(ride.kind,ride.x,ride.z,ride.ry);
  p.districtRental='skatepark'; // можно взять и кататься как обычно
 }
}
function skateRideBonus(b){
 const run=new WeakMap();
 // Не начисляем очки каждую секунду. Только завершённый проезд
 // по чаше / хафпайпу на скейте или самокате. Трюки Space и grind
 // уже имеют единую бонусную систему W.onTrick/W.onGrind с лимитом.
 W.animated.push(()=>{
  if(!W.onTrick)return;
  const now=performance.now()/1000;
  for(const a of localActors()){
   const ride=a.ride;
   if(!ride||ride.rider!==a||!['skate','scooter'].includes(ride.kind)){
    run.delete(a);continue;
   }
   const speed=Math.hypot(ride.vx||0,ride.vz||0);
   const section=skateSection(ride.x-b.ox,ride.z-b.oz,ride.y-b.Y);
   const r=run.get(a)||{section:null,entered:0,x:0,z:0,last:-100};
   if(section&&section!==r.section&&speed>4.2){
    r.section=section;r.entered=now;r.x=ride.x;r.z=ride.z;
   }else if(!section&&r.section){
    if(now-r.entered>.38&&now-r.entered<9&&speed>4.6&&
       Math.hypot(ride.x-r.x,ride.z-r.z)>2.0&&now-r.last>9){
      // The existing capped trick bonus is the only source of points.
      W.onTrick(a,'skate-line-'+r.section);r.last=now;
    }
    r.section=null;
   }
   run.set(a,r);
  }
 });
}
export default {
 id:'skatepark',name:'Скейт-парк',ground:'asphalt',size:44,
 build(b){
  b.ground(1.6,1.6,42.4,42.4,T.concrete(),4);
  // Декоративный граффити-бэкборд: реальная высокая коллизия для
  // существующей миссии «граффити по трафарету».
  b.box(22,1,38,.3,2.95,tmat(T.brickWall()));
  for(const [x,i]of[[10,1],[22,3],[34,5]])b.graffiti(x,1.42,1.20,0,3.2,i);

  bowl(b);halfpipe(b);
  rails(b,L.railsNE);rails(b,L.railsSW);
  // Небольшие заходы на перила; не пересекаются с чашей и коридорами.
  b.wedge(36,14.1,3.2,2.5,.57,Math.PI);
  b.wedge(8.2,27,3.2,2.5,.53,0);
  rental(b);

  // Атмосфера: низкие ограждения, свет, места отдыха. Главные
  // линии катания и проход между югом и чашей остаются свободными.
  b.fence(2.2,5,2.2,26,1.25,'mesh');
  b.fence(41.8,5,41.8,23.5,1.25,'mesh');
  b.bench(5.4,24.5,Math.PI/2);
  b.bench(12,40,-Math.PI/2);
  b.bin(40.5,29);
  b.lamp(3.1,14,Math.PI/2);
  b.lamp(40.8,17,-Math.PI/2);
  b.sign(35.8,2.45,2.8,0,'SKATE PARK','#302537','#f5c46e',4.2,.7);
  b.grabTarget({x:5.4,z:28.4,r:1.2,kind:'bounce',label:'рампa'});
  // Открытый южный коридор для начала миссий «сбей мишени»
  // и обычного безопасного появления игроков.
  districtFrame(b,'skatepark',{spawn:L.spawn,floor:L.missionFloor,catArea:[2,39.2,10,42.2]});
  b.zone('floor',33.0,19.0,40.0,27.0);
  b.hw(()=>{b.pumpkin(41,27);b.pumpkin(3,29);});
  skateRideBonus(b);
 }
};
