export default { base: './', build: { target: 'es2022', chunkSizeWarningLimit: 1500, rollupOptions: { output: { manualChunks(id) { if(id.includes('/node_modules/three/'))return 'three'; } } } } };
