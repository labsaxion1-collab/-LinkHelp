import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'brand/linkhelp-logo.png',
          'brand/linkhelp-app-source.png',
          'icons/linkhelp-app-180.png',
          'icons/linkhelp-app-192.png',
          'icons/linkhelp-app-512.png',
          // Staging-only assets (served statically; selected at runtime on teste.linkhelp.app).
          'icons/linkhelp-staging-180.png',
          'icons/linkhelp-staging-192.png',
          'icons/linkhelp-staging-512.png',
          'manifest-staging.webmanifest',
        ],
        // Production / default manifest — unchanged for app.linkhelp.app.
        // Staging host swaps to /manifest-staging.webmanifest via index.html script.
        manifest: {
          id: '/',
          name: 'LinkHelp',
          short_name: 'LinkHelp',
          description: 'Local services marketplace for helpers and clients.',
          theme_color: '#1565ff',
          background_color: '#f6fbff',
          display: 'standalone',
          orientation: 'portrait-primary',
          // Relative paths — install identity follows the origin (www.linkhelp.app).
          scope: '/',
          start_url: '/',
          lang: 'en',
          categories: ['business', 'lifestyle'],
          icons: [
            {
              src: 'icons/linkhelp-app-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/linkhelp-app-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          importScripts: ['push-sw.js'],
          globPatterns: ['**/*.{js,css,html,ico,svg,woff2,webp}'],
          globIgnores: [
            '**/brand/intro*.mp4',
            '**/brand/*.png',
            '**/brand/*.jpg',
            '**/brand/*.jpeg',
          ],
          // Main JS chunk is ~1.05 MB; keep precache cap bounded (not unbounded).
          // Consider code-splitting if the bundle grows much beyond this limit.
          maximumFileSizeToCacheInBytes: 1.25 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^\/brand\/.*\.(?:webp|png|jpe?g)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'brand-images',
                expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^\/brand\/.*\.mp4$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'brand-video',
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
                rangeRequests: true,
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(
        env.VITE_GOOGLE_MAPS_PLATFORM_KEY || '',
      ),
      /** Vercel sets VERCEL_ENV at build time (preview | production | development). */
      'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(
        env.VITE_VERCEL_ENV || process.env.VERCEL_ENV || '',
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@remotion/player') || id.includes('node_modules/remotion/')) {
              return 'remotion-player';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    },
  };
});
