import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || '/'

  return {
    base,
    plugins: [react()],
    server: {
    proxy: {
      // Proxy BGG API requests to avoid CORS issues in development.
      // Note: BGG's XML API is reliably served from api.geekdo.com.
      '/bgg-api/xmlapi2': {
        target: 'https://api.geekdo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bgg-api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err)
          })
          proxy.on('proxyReq', (proxyReq, req) => {
            const authHeader = proxyReq.getHeader('authorization')
            if (!authHeader || authHeader === 'Bearer ' || authHeader === 'Bearer undefined') {
              proxyReq.removeHeader('authorization')
              console.log('Proxying (public):', req.url, '->', proxyReq.path)
            } else {
              console.log('Proxying (auth):', req.url, '->', proxyReq.path)
            }
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Response:', req.url, proxyRes.statusCode)
          })
        },
      },

      // HTML scraping fallback (game page)
      '/bgg-api/boardgame': {
        target: 'https://boardgamegeek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bgg-api/, ''),
      },
    },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      globals: true,
    },
  }
})
