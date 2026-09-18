import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  clearScreen: false,
  // Относительный base обязателен для desktop-сборки: Electron в production
  // грузит index.html через file://, и абсолютные пути /assets/* не находятся.
  base: './',
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
