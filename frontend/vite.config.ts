import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: process.env.USE_POLLING === 'true',
    },
    proxy: {
      '/api': process.env.API_PROXY_TARGET || 'http://127.0.0.1:8080',
    },
  },
})
