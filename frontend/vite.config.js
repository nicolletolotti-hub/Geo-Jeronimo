import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'GeoJeronimo - Monitoramento de Cheias',
        short_name: 'GeoJeronimo',
        description: 'Sistema de monitoramento e alerta de cheias para São Jerônimo - RS',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,geojson,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/(river|stations|weather|rainfall|alerts|residence|flood)/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            }
          },
          {
            urlPattern: /^\/inundacao\/.*\.geojson/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'flood-data-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            }
          },
          {
            urlPattern: /^\/ruas\/.*\.geojson/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ruas-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            }
          },
          {
            urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(js|css|html|ico|png|svg|jpg|jpeg|gif|webp|woff2?|ttf|eot)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'static-assets-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
