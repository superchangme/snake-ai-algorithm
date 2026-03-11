import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/init': 'http://localhost:8087',
      '/move': 'http://localhost:8087',
      '/gameover': 'http://localhost:8087'
    }
  }
})
