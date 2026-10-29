import { onlineLogicTestPlugin } from './scripts/online/logic-plugin.mjs';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default { plugins:[onlineLogicTestPlugin()], server: { allowedHosts: ['terminal.local'], proxy: { '/__rooms': { target: 'http://127.0.0.1:8787', ws: true, rewrite: p => p.replace(/^\/__rooms/, '') } } }, base: './', define: { __APP_VERSION__: JSON.stringify(pkg.version) }, build: { target: 'es2022', chunkSizeWarningLimit: 1500, rollupOptions: { output: { manualChunks(id) { if(id.includes('/node_modules/three/'))return 'three'; } } } } };
