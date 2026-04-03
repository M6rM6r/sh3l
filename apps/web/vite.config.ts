import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_API ?? 'http://localhost:8000',
        changeOrigin: true,
      },
      '/metrics': {
        target: process.env.VITE_PROXY_API ?? 'http://localhost:8000',
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
})
