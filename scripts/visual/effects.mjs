import { chromium } from 'playwright';
const OUT=process.argv[2];
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
await pg.addInitScript(() => { Math.random = (() => { let s = 777; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })(); });
await pg.goto(process.argv[3]); await pg.waitForFunction(() => window.__fs && window.__fs.startRound, null, { timeout: 120000 });
await pg.evaluate(() => window.__fs.startRound()); await pg.waitForTimeout(6000);
// камера смотрит на точку перед игроком
const setup = async () => pg.evaluate(() => { const f=window.__fs,P=f.P.pos,V=P.constructor; f.cam.pose={p:new V(P.x-9,P.y+4,P.z+9),l:new V(P.x,P.y+2.5,P.z)}; window.__fx0={x:P.x+1,y:P.y,z:P.z-1}; });
await setup(); await pg.waitForTimeout(800);
// замедляем время, чтобы поймать фазы в программном рендере
await pg.evaluate(()=>{window.__fs.vfx.explosion(window.__fx0,1.25);});
for (const [i,t] of [[1,80],[2,250],[3,600]]) { await pg.waitForTimeout(t); await pg.screenshot({path:`${OUT}/boom${i}.png`}); }
await pg.waitForTimeout(3000);
await pg.evaluate(()=>{window.__fs.vfx.fireworks(window.__fx0,5);});
for (const [i,t] of [[1,900],[2,700],[3,700]]) { await pg.waitForTimeout(t); await pg.screenshot({path:`${OUT}/fw${i}.png`}); }
console.log(errs.join('\n'));
await b.close();
