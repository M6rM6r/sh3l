import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = mode === 'production'
  const proxyApiTarget =
    env.VITE_PROXY_API || env.VITE_API_BASE_URL || env.VITE_API_URL || 'http://localhost:8000'

  return {
    plugins: [
      react(),
    ],

    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/components/games/__tests__/setup.ts'],
      css: false,
    },

    server: {
      port: 3000,
      strictPort: false,
      proxy: {
        '/api': { target: proxyApiTarget, changeOrigin: true },
        '/ws':  { target: proxyApiTarget.replace(/^http/, 'ws'), ws: true, changeOrigin: true },
        '/metrics': { target: proxyApiTarget, changeOrigin: true },
      },
    },

    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      // Raise the warning threshold — we're splitting manually
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Fine-grained manual chunks → eliminates 859 KB monolith
          manualChunks(id) {
            // Each heavy visualisation lib gets its own async chunk
            if (id.includes('node_modules/three'))     return 'three'
            if (id.includes('node_modules/d3'))        return 'd3'
            if (id.includes('node_modules/recharts'))  return 'recharts'
            if (id.includes('node_modules/chart.js'))  return 'chartjs'

            // State management isolated
            if (id.includes('@reduxjs/toolkit') || id.includes('redux-persist') ||
                id.includes('@tanstack/react-query'))  return 'state'

            // Motion library
            if (id.includes('framer-motion'))          return 'motion'

            // Styled-components
            if (id.includes('styled-components'))      return 'styled'

            // Core React vendor
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('react-router-dom'))       return 'vendor'

            // i18n
            if (id.includes('i18next') || id.includes('react-i18next'))
              return 'i18n'

            // Supabase
            if (id.includes('@supabase'))              return 'supabase'
          },
        },
      },
    },

    esbuild: {
      treeShaking: true,
      drop: isProd ? ['console', 'debugger'] : [],
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@pages':      resolve(__dirname, 'src/pages'),
        '@utils':      resolve(__dirname, 'src/utils'),
        '@hooks':      resolve(__dirname, 'src/hooks'),
        '@store':      resolve(__dirname, 'src/store'),
        '@services':   resolve(__dirname, 'src/services'),
      },
    },

    // Pre-bundle heavy libs to speed up cold starts
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', '@reduxjs/toolkit', 'react-redux'],
    },
  }
})


