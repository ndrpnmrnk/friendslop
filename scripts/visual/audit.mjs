// Аудит карты: предметы, висящие в воздухе / утопленные в объектах, точки миссий и спавна внутри стен.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 480, height: 270 } });
await pg.goto(process.argv[2]); await pg.waitForFunction(() => window.__fs && window.__fs.startRound, null, { timeout: 120000 });
const sets=[['yard','park','plaza','shops','construction','cemetery','gas','market','school'],['foodcourt','sewer','office','port','skatepark','hospital','factory','townhall','university'],['cinema','yard','park','plaza','shops','construction','cemetery','gas','market']];
const all={};
for(const set of sets){
 await pg.evaluate(s=>{globalThis.__forceDistricts=s;window.__fs.startRound();},set); await pg.waitForTimeout(4500);
 const r=await pg.evaluate(()=>{const f=window.__fs,W=f.W,{groundAt,isFree}=f.phys,out={};
  const dist=(x,z)=>{for(const d of W.districts)if(x>=d.ox&&x<d.x1&&z>=d.oz&&z<d.z1)return d.id;return 'road';};
  const add=(k,x,z,msg)=>{const d=dist(x,z);(out[d]??=[]).push(k+': '+msg+' @'+x.toFixed(1)+','+z.toFixed(1));};
  for(const it of W.items){if(it.state==='held'||it.state==='gone'||it.boxed)continue;const p=it.pos||it.g.position,r=it.def?.r||.15;const g=groundAt(p.x,p.z,Math.min(r,.12),p.y+.3);const gap=p.y-r-g;
   if(gap>.12&&!it.surf&&!it.hang&&it.state!=='fly')add('item '+it.type,p.x,p.z,'висит '+gap.toFixed(2)+' м');
   if(!isFree(p.x-r*.5,p.z-r*.5,p.x+r*.5,p.z+r*.5,p.y,p.y+r*.8))add('item '+it.type,p.x,p.z,'внутри объекта');}
  for(const z of W.missionZones){const cx=(z.x0+z.x1)/2,cz=(z.z0+z.z1)/2;if(!isFree(cx-.3,cz-.3,cx+.3,cz+.3,z.y+.1,z.y+1.6))add('zone '+z.type,cx,cz,'центр зоны занят');}
  for(const sp of W.spawns)if(!isFree(sp.x-.4,sp.z-.4,sp.x+.4,sp.z+.4,sp.y+.1,sp.y+1.8))add('spawn',sp.x,sp.z,'спавн в объекте');
  for(const p of W.pushables){const g=groundAt(p.x,p.z,.1,p.y+.3);if(p.y-g>.1)add('push '+(p.kind||''),p.x,p.z,'висит '+(p.y-g).toFixed(2));}
  return out;});
 for(const[k,v]of Object.entries(r))(all[k]??=new Set(),v.forEach(x=>all[k].add(x)));
}
for(const[k,v]of Object.entries(all)){console.log('== '+k+' ('+v.size+')');[...v].slice(0,14).forEach(x=>console.log('  '+x));}
await b.close();
