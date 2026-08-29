import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: { port: 5173, host: true },
  build: { target: 'esnext', chunkSizeWarningLimit: 4000 },
  assetsInclude: ['**/*.hdr', '**/*.glb', '**/*.gltf']
})
