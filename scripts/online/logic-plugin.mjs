import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
// Изолированный CPU-тест для сред без WebGL. Никакого fallback-рендера в игре/релизе.
export function onlineLogicTestPlugin() {
  let rooms;
  return { name: 'online-logic-test', apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__logic-index.html', async (_req, res) => {
        try {
          if(!rooms){
            const require=createRequire(new URL('../../worker/package.json',import.meta.url));
            const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
            rooms=new Miniflare(convertV4MiniflareOptions({workers:[{modules:true,scriptPath:fileURLToPath(new URL('../../worker/src/index.js',import.meta.url)),
              compatibilityDate:'2025-06-01',durableObjects:{ROOMS:{className:'Room',useSQLite:true}}}],host:'127.0.0.1',port:8787,cf:false}));
          }
          await rooms.ready;
        }catch(e){res.statusCode=500;res.end('Local rooms test failed: '+e.message);return;}
        const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
        res.setHeader('Content-Type','text/html');
        res.end(html.replace('./src/main.js','/scripts/online/logic-entry.js'));
      });
      server.httpServer?.once('close',()=>rooms?.dispose());
    },
    transform(code, id) {
      if (!id.includes('net-logic-test') || !id.split('?')[0].endsWith('.js')) return;
      let result = code.replace(/(['"])(\.\.?\/[^'"?]+\.js)\1/g, '$1$2?net-logic-test$1');
      if (id.split('?')[0].endsWith('/src/core/gfx.js')) result = result.replace('new THREE.WebGLRenderer(', 'new globalThis.__fsMockRenderer(');
      return { code: result, map: null };
    }
  };
}
