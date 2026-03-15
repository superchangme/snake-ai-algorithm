import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    logLevel: 'silent'
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    proxy: {
      '/api/games': 'http://localhost:8000',
      '/api': 'http://localhost:8080',
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    }
  }
})
