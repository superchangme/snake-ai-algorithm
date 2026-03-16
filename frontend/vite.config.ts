import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    logLevel: 'silent',
    drop: []
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    proxy: {
      // 所有 API 和 WebSocket 都代理到 8000
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
