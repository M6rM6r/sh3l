import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyApiTarget = env.VITE_PROXY_API || env.VITE_API_BASE_URL || env.VITE_API_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/components/games/__tests__/setup.ts'],
      css: false,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyApiTarget,
          changeOrigin: true,
        },
        '/metrics': {
          target: proxyApiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom', 'react-router-dom'],
            'state': ['@reduxjs/toolkit', 'react-redux', '@tanstack/react-query'],
            'visualization': ['three', 'recharts', 'd3'],
          },
        },
      },
      chunkSizeWarningLimit: 500,
    },
    esbuild: {
      treeShaking: true,
      drop: ['console', 'debugger'],
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  }
})
