import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default { base: './', define: { __APP_VERSION__: JSON.stringify(pkg.version) }, build: { target: 'es2022', chunkSizeWarningLimit: 1500, rollupOptions: { output: { manualChunks(id) { if(id.includes('/node_modules/three/'))return 'three'; } } } } };
