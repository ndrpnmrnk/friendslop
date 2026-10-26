// Профиль CPU кадра: время JS в кадре (rAF-колбэк), из него — время в renderer.render, плюс отрисовки.
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:4173/', Q = process.argv[3] || 'medium';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  window.__prof = { frames: [], on: false };
  window.requestAnimationFrame = cb => raf(t => { const a = performance.now(); cb(t); if (window.__prof.on) window.__prof.frames.push(performance.now() - a); });
});
await pg.goto(URL);
await pg.waitForFunction(() => window.__fs && window.__fs.startRound, null, { timeout: 120000 });
await pg.evaluate(q => { localStorage.setItem('friendslop.graphics', q); }, Q);
await pg.reload();
await pg.waitForFunction(() => window.__fs && window.__fs.startRound, null, { timeout: 120000 });
await pg.evaluate(() => {
  const r = window.__fs.renderer, orig = r.render.bind(r);
  window.__prof.rt = 0; window.__prof.calls = 0; window.__prof.tris = 0; window.__prof.n = 0;
  r.info.autoReset = false;
  r.render = (s, c) => { const a = performance.now(); orig(s, c); window.__prof.rt += performance.now() - a; };
  window.__fs.startRound();
});
await pg.waitForTimeout(8000);
const res = [];
const ds = await pg.evaluate(() => window.__fs.W.districts.map(d => ({ id: d.id, cx: (d.ox + d.x1) / 2, cz: (d.oz + d.z1) / 2 })));
for (const d of ds) {
  await pg.evaluate(d => { const f = window.__fs; f.P.pos.set(d.cx, f.phys.groundAt(d.cx, d.cz, 30) ?? 0, d.cz); }, d);
  await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const p = window.__prof, ri = window.__fs.renderer.info; p.frames = []; p.rt = 0; ri.reset(); p.on = true;
    await new Promise(r => setTimeout(r, 2500)); p.on = false;
    const f = p.frames.slice().sort((a, b) => a - b), n = f.length;
    return { n, js: +(f.reduce((a, b) => a + b, 0) / n).toFixed(2), p90: +f[Math.floor(n * .9)].toFixed(2), render: +(p.rt / n).toFixed(2), calls: Math.round(ri.render.calls / n), tris: Math.round(ri.render.triangles / n), progs: ri.programs.length, geo: ri.memory.geometries, tex: ri.memory.textures };
  });
  res.push({ id: d.id, ...r });
}
console.table(res);
console.log('errors', errs.slice(0, 5));
await b.close();
