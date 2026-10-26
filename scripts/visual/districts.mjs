// Быстрые кадры: 1 карта (фиксированное зерно), вид сверху и с уровня глаз для каждого района.
import { chromium } from 'playwright';
const OUT = process.argv[2], URL = process.argv[3], only = process.argv[4] ? process.argv[4].split(',') : null, Q = process.argv[5] || 'medium';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = []; pg.on('console', m => { if (m.type() === 'error' || m.text().includes('[friendslop]')) logs.push(m.type() + ': ' + m.text().slice(0, 300)); }); pg.on('pageerror', e => logs.push('PAGEERR ' + e));
await pg.addInitScript(q => { localStorage.setItem('friendslop.graphics', q); Math.random = (() => { let s = 12345; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })(); }, Q);
await pg.goto(URL); await pg.waitForFunction(() => window.__fs && window.__fs.startRound, null, { timeout: 120000 });
if (process.env.FORCE) await pg.evaluate(f => { globalThis.__forceDistricts = f.split(','); }, process.env.FORCE);
await pg.evaluate(() => window.__fs.startRound()); await pg.waitForTimeout(7000);
const ds = await pg.evaluate(() => window.__fs.W.districts.map(d => ({ id: d.id, cx: (d.ox + d.x1) / 2, cz: (d.oz + d.z1) / 2 })));
for (const d of ds) {
  if (only && !only.includes(d.id)) continue;
  for (const [tag, p, l] of [['a', [22, 24, 22], [0, 0, 0]], ['b', [-13, 2.2, 13], [4, 1.4, -4]], ['c', [13, 2.2, -13], [-4, 1.4, 4]]]) {
    await pg.evaluate(([d, p, l]) => { const f = window.__fs, V = f.camera.position.constructor; f.cam.pose = { p: new V(d.cx + p[0], p[1], d.cz + p[2]), l: new V(d.cx + l[0], l[1], d.cz + l[2]) }; }, [d, p, l]);
    await pg.waitForTimeout(1200); await pg.screenshot({ path: `${OUT}/${d.id}-${tag}.png` });
  }
}
console.log(ds.map(d => d.id).join(',')); console.log(logs.slice(0, 12).join('\n'));
await b.close();
